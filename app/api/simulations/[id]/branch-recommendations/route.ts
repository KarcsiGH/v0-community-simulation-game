import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { focal_entity_id } = body

    // Get simulation and all branches
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

    // Get all related simulations (branches)
    const { data: allBranches } = await supabase
      .from("simulations")
      .select(`
        id,
        name,
        scenario,
        branch_probability,
        current_year,
        total_years,
        branch_description
      `)
      .or(`id.eq.${id},parent_simulation_id.eq.${id}`)
      .order("branch_probability", { ascending: false, nullsFirst: false })

    // For each branch, get year data
    const branchesWithData = await Promise.all(
      (allBranches || [simulation]).slice(0, 3).map(async (branch) => {
        const { data: years } = await supabase
          .from("simulation_years")
          .select("*")
          .eq("simulation_id", branch.id)
          .order("year_number", { ascending: true })

        const { data: responses } = await supabase
          .from("entity_responses")
          .select("response_type")
          .eq("simulation_id", branch.id)

        const supportive = responses?.filter(r => r.response_type === "supportive").length || 0
        const total = responses?.length || 1

        return {
          ...branch,
          years,
          supportRatio: supportive / total
        }
      })
    )

    // Get focal entity info if provided
    let focalEntityName = "Your Organization"
    if (focal_entity_id) {
      const { data: entity } = await supabase
        .from("entities")
        .select("name")
        .eq("id", focal_entity_id)
        .single()
      if (entity) focalEntityName = entity.name
    }

    // Use AI to generate comprehensive recommendations
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are a strategic planning consultant generating year-by-year recommendations for community simulations.
      
Generate recommendations for THREE focus levels:
1. Individual Organization - specific actions for the focal entity
2. Coalition - coordinated actions with allies
3. Network - system-wide changes and positioning

Return as a JSON array of branch predictions with this structure:
[{
  "branchId": "id",
  "branchName": "name",
  "probability": number (0-1),
  "rank": number,
  "yearByYearRecommendations": [{
    "year": 1,
    "calendarYear": 2026,
    "individual": {
      "actions": ["action1", "action2", "action3"],
      "risks": ["risk1", "risk2"],
      "opportunities": ["opp1", "opp2"],
      "keyMetrics": [{ "name": "metric", "target": "value" }]
    },
    "coalition": {
      "actions": ["action1", "action2"],
      "partnersToEngage": ["partner1", "partner2"],
      "coalitionRisks": ["risk1"],
      "collectiveGoals": ["goal1", "goal2"]
    },
    "network": {
      "actions": ["action1", "action2"],
      "bridgesToBuild": ["bridge1", "bridge2"],
      "networkVulnerabilities": ["vuln1"],
      "systemicChanges": ["change1", "change2"]
    }
  }],
  "overallSummary": {
    "individual": "summary for individual org strategy",
    "coalition": "summary for coalition strategy",
    "network": "summary for network-wide strategy"
  },
  "keyDifferentiators": ["what makes this branch unique"]
}]`,
      prompt: `Generate strategic recommendations for these simulation branches:

Community: ${simulation.communities?.name}
Main Scenario: ${simulation.scenario}
Focal Organization: ${focalEntityName}
Starting Year: ${simulation.parameters?.starting_year || 2026}
Total Years: ${simulation.total_years}

Branches to analyze:
${branchesWithData.map((b, i) => `
Branch ${i + 1}: ${b.name}
- Description: ${b.branch_description || "Main timeline"}
- Current Support: ${Math.round(b.supportRatio * 100)}%
- Probability: ${b.branch_probability ? Math.round(b.branch_probability * 100) : 50}%
- Years completed: ${b.current_year}/${b.total_years}
- Latest landscape: ${JSON.stringify(b.years?.[b.years.length - 1]?.landscape_snapshot || {})}
`).join("\n")}

For each branch, provide detailed year-by-year recommendations across all three focus levels (individual, coalition, network).

Return ONLY the JSON array, no other text.`,
    })

    // Parse AI response
    let predictions
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      // Generate basic predictions if parsing fails
      predictions = branchesWithData.map((branch, i) => ({
        branchId: branch.id,
        branchName: branch.name,
        probability: branch.branch_probability || 0.5,
        rank: i + 1,
        yearByYearRecommendations: Array.from({ length: simulation.total_years }, (_, y) => ({
          year: y + 1,
          calendarYear: (simulation.parameters?.starting_year || 2026) + y,
          individual: {
            actions: ["Build stakeholder relationships", "Communicate vision clearly"],
            risks: ["Resource constraints"],
            opportunities: ["New partnerships"],
            keyMetrics: [{ name: "Support Level", target: "60%+" }]
          },
          coalition: {
            actions: ["Coordinate with allies", "Share resources"],
            partnersToEngage: ["Key stakeholders"],
            coalitionRisks: ["Misalignment"],
            collectiveGoals: ["Unified messaging"]
          },
          network: {
            actions: ["Engage neutral parties", "Build bridges"],
            bridgesToBuild: ["Cross-sector connections"],
            networkVulnerabilities: ["Information silos"],
            systemicChanges: ["Improved coordination"]
          }
        })),
        overallSummary: {
          individual: "Focus on building strong stakeholder relationships",
          coalition: "Coordinate closely with aligned partners",
          network: "Work to strengthen overall community connections"
        },
        keyDifferentiators: [branch.branch_description || "Primary timeline"]
      }))
    }

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error("Branch recommendations error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
