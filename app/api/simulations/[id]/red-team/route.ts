import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { community_id } = body

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

    // Get opposition entities
    const { data: responses } = await supabase
      .from("entity_responses")
      .select(`
        *,
        entities (id, name, type, mission, resources)
      `)
      .eq("simulation_id", id)
      .eq("response_type", "opposed")

    // Get landscape data
    const { data: latestYear } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", id)
      .order("year_number", { ascending: false })
      .limit(1)
      .single()

    // Use AI to generate red team scenarios
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are a red team analyst simulating adversarial strategies against community initiatives. Think like an opponent trying to derail or defeat the initiative.

Generate realistic adversarial scenarios that opponents might use. Be specific and tactical.

Return as JSON array:
[{
  "id": "scenario_1",
  "name": "scenario name",
  "description": "brief description",
  "attacker": "who would execute this",
  "objective": "what they're trying to achieve",
  "tactics": ["specific tactic 1", "specific tactic 2", "specific tactic 3"],
  "vulnerabilitiesExploited": ["vulnerability 1", "vulnerability 2"],
  "likelihood": number (1-5),
  "impact": number (1-5),
  "defensiveRecommendations": ["defense 1", "defense 2", "defense 3"],
  "status": "planned"
}]`,
      prompt: `Generate red team scenarios for this community simulation:

Community: ${simulation.communities?.name}
Initiative: ${simulation.scenario}

Known Opposition:
${responses?.map(r => `
- ${r.entities?.name} (${r.entities?.type})
  Mission: ${r.entities?.mission}
  Resources: ${JSON.stringify(r.entities?.resources || {})}
  Reasoning for opposition: ${r.reasoning}
`).join("\n") || "No identified opposition yet"}

Current Landscape:
${JSON.stringify(latestYear?.landscape_snapshot || {})}

Opposition Analysis from simulation:
${JSON.stringify(latestYear?.opposition_summary || {})}

Generate 3-5 realistic adversarial scenarios that opponents might execute to derail this initiative. Consider:
1. Information warfare / narrative attacks
2. Coalition disruption
3. Resource competition
4. Political/regulatory interference
5. Stakeholder poaching

For each scenario, provide specific tactics and defensive recommendations.

Return ONLY the JSON array, no other text.`,
    })

    // Parse AI response
    let scenarios
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      scenarios = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      // Generate basic scenarios if parsing fails
      scenarios = [
        {
          id: "scenario_1",
          name: "Narrative Attack Campaign",
          description: "Coordinated effort to undermine initiative credibility",
          attacker: "Opposition coalition",
          objective: "Erode public and stakeholder support",
          tactics: [
            "Spread misinformation about initiative outcomes",
            "Amplify negative stories through media contacts",
            "Recruit credible voices to question approach"
          ],
          vulnerabilitiesExploited: [
            "Limited communication resources",
            "Complexity of initiative makes it hard to explain"
          ],
          likelihood: 3,
          impact: 4,
          defensiveRecommendations: [
            "Develop clear, simple messaging",
            "Build media relationships proactively",
            "Monitor for misinformation and respond quickly"
          ],
          status: "planned"
        }
      ]
    }

    return NextResponse.json({ scenarios })
  } catch (error) {
    console.error("Red team analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
