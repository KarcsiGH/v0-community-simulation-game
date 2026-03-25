import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { variables, current_year } = body

    // Get simulation data
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select(`
        *,
        communities (
          id,
          name,
          description
        )
      `)
      .eq("id", id)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get current landscape
    const { data: yearData } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", id)
      .lte("year_number", current_year)
      .order("year_number", { ascending: false })
      .limit(1)
      .single()

    // Get responses for sentiment analysis
    const { data: responses } = await supabase
      .from("entity_responses")
      .select("response_type")
      .eq("simulation_id", id)

    const supportive = responses?.filter(r => r.response_type === "supportive").length || 0
    const opposed = responses?.filter(r => r.response_type === "opposed").length || 0
    const total = responses?.length || 1
    const baselineSupport = supportive / total

    // Use AI to analyze sensitivity of each variable
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are a strategic analyst specializing in sensitivity analysis for community planning simulations.
      
For each variable, estimate how changes would affect the outcome probability. Return as a JSON array.

Each item should have:
{
  "variable": "variable name",
  "baselineOutcome": number (0-1, baseline success probability),
  "lowScenario": { "value": number, "outcome": number },
  "highScenario": { "value": number, "outcome": number },
  "sensitivity": "high" | "medium" | "low",
  "recommendation": "strategic recommendation for this variable"
}`,
      prompt: `Perform sensitivity analysis for this community simulation:

Community: ${simulation.communities?.name}
Scenario: ${simulation.scenario}
Current Support Level: ${Math.round(baselineSupport * 100)}%
Current Landscape: ${JSON.stringify(yearData?.landscape_snapshot || {})}

Variables to analyze:
${variables.map((v: string) => `- ${v}`).join("\n")}

For each variable:
1. Estimate baseline success probability
2. Model a "low" scenario (e.g., 20% of normal)
3. Model a "high" scenario (e.g., 150% of normal)
4. Determine sensitivity level based on outcome variance
5. Provide strategic recommendation

Return ONLY the JSON array, no other text.`,
    })

    // Parse AI response
    let results
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      results = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      // Generate basic results if parsing fails
      results = variables.map((v: string) => ({
        variable: v,
        baselineOutcome: baselineSupport,
        lowScenario: { value: 20, outcome: baselineSupport * 0.7 },
        highScenario: { value: 150, outcome: Math.min(baselineSupport * 1.3, 1) },
        sensitivity: "medium",
        recommendation: "Monitor this variable closely"
      }))
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Sensitivity analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
