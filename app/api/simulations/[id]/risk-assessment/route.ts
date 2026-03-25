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

    // Get all year data
    const { data: years } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", id)
      .order("year_number", { ascending: true })

    // Get responses
    const { data: responses } = await supabase
      .from("entity_responses")
      .select(`
        *,
        entities (name, type)
      `)
      .eq("simulation_id", id)

    // Use AI to generate risk assessment
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are a risk management expert for strategic planning. Analyze simulation data and generate a comprehensive risk assessment.

Return as JSON with this structure:
{
  "risks": [{
    "id": "risk_1",
    "name": "risk name",
    "description": "detailed description",
    "category": "strategic" | "operational" | "financial" | "reputational" | "external",
    "probability": number (1-5),
    "impact": number (1-5),
    "riskScore": number (probability * impact),
    "currentStatus": "active" | "mitigated" | "realized" | "dormant",
    "mitigation": ["strategy1", "strategy2"],
    "owner": "suggested owner/role",
    "trend": "increasing" | "stable" | "decreasing"
  }],
  "indicators": [{
    "id": "indicator_1",
    "name": "indicator name",
    "description": "what this measures",
    "linkedRisks": ["risk_1"],
    "currentValue": number,
    "threshold": number,
    "status": "green" | "yellow" | "red",
    "lastUpdated": "date string",
    "trend": "improving" | "stable" | "worsening",
    "dataSource": "source description"
  }],
  "triggers": [{
    "id": "trigger_1",
    "name": "trigger name",
    "condition": "when this happens",
    "threshold": "specific threshold",
    "linkedRisks": ["risk_1"],
    "response": "what to do when triggered",
    "status": "armed" | "triggered" | "resolved",
    "priority": "critical" | "high" | "medium" | "low"
  }],
  "redTeamScenarios": []
}`,
      prompt: `Generate a risk assessment for this community simulation:

Community: ${simulation.communities?.name}
Scenario: ${simulation.scenario}
Current Year: ${simulation.current_year}/${simulation.total_years}

Year summaries:
${years?.map(y => `
Year ${y.year_number}:
- Summary: ${y.year_summary || "Not completed"}
- Opposition: ${JSON.stringify(y.opposition_summary || {})}
- Landscape: ${JSON.stringify(y.landscape_snapshot || {})}
`).join("\n") || "No years completed"}

Response patterns:
- Total responses: ${responses?.length || 0}
- Supportive: ${responses?.filter(r => r.response_type === "supportive").length || 0}
- Opposed: ${responses?.filter(r => r.response_type === "opposed").length || 0}
- Cautious: ${responses?.filter(r => r.response_type === "cautious").length || 0}

Identify:
1. 8-12 key risks across all categories
2. 6-8 early warning indicators
3. 4-6 contingency triggers
4. Leave redTeamScenarios empty (handled separately)

Return ONLY the JSON object, no other text.`,
    })

    // Parse AI response
    let assessment
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      assessment = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      // Generate basic assessment if parsing fails
      assessment = {
        risks: [
          {
            id: "risk_1",
            name: "Stakeholder Opposition",
            description: "Key stakeholders may actively oppose the initiative",
            category: "strategic",
            probability: 3,
            impact: 4,
            riskScore: 12,
            currentStatus: "active",
            mitigation: ["Early engagement", "Address concerns proactively"],
            owner: "Project Lead",
            trend: "stable"
          }
        ],
        indicators: [
          {
            id: "indicator_1",
            name: "Support Level",
            description: "Percentage of supportive stakeholders",
            linkedRisks: ["risk_1"],
            currentValue: 50,
            threshold: 60,
            status: "yellow",
            lastUpdated: new Date().toISOString().split("T")[0],
            trend: "stable",
            dataSource: "Simulation responses"
          }
        ],
        triggers: [
          {
            id: "trigger_1",
            name: "Major Opposition Event",
            condition: "Key stakeholder publicly opposes initiative",
            threshold: "Any Tier 1 stakeholder",
            linkedRisks: ["risk_1"],
            response: "Activate crisis communication plan",
            status: "armed",
            priority: "high"
          }
        ],
        redTeamScenarios: []
      }
    }

    return NextResponse.json(assessment)
  } catch (error) {
    console.error("Risk assessment error:", error)
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 })
  }
}
