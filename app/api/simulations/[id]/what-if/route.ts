import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { scenario_name, scenario_description, variables, current_year } = body

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

    // Get current year data for context
    const { data: yearData } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", id)
      .lte("year_number", current_year)
      .order("year_number", { ascending: false })
      .limit(1)
      .single()

    // Use AI to predict the scenario outcome
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are a strategic foresight analyst. Analyze what-if scenarios for community simulations and predict outcomes.
      
Return your analysis as a JSON object with this structure:
{
  "successProbability": number (0-1),
  "supportChange": number (percentage change, can be negative),
  "oppositionChange": number (percentage change, can be negative),
  "keyRisks": ["risk1", "risk2", "risk3"],
  "keyOpportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "recommendation": "strategic recommendation for this scenario"
}`,
      prompt: `Analyze this what-if scenario for a community simulation:

Community: ${simulation.communities?.name}
Current Scenario: ${simulation.scenario}
Current Year: ${current_year}
Current Landscape: ${JSON.stringify(yearData?.landscape_snapshot || {})}

What-If Scenario: ${scenario_name}
Description: ${scenario_description || "No additional description"}
Variable Changes: ${JSON.stringify(variables)}

Predict the outcomes of this scenario change. Consider:
1. How would this affect stakeholder support levels?
2. What new risks emerge?
3. What opportunities does this create?
4. What is the likely success probability?

Return ONLY the JSON object, no other text.`,
    })

    // Parse AI response
    let prediction
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      prediction = {
        successProbability: 0.5,
        supportChange: 0,
        oppositionChange: 0,
        keyRisks: ["Unable to fully analyze scenario"],
        keyOpportunities: ["Scenario requires more data"],
        recommendation: "Gather more information before proceeding"
      }
    }

    return NextResponse.json({ prediction })
  } catch (error) {
    console.error("What-if analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
