import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Direct Anthropic API call
async function callAnthropic(system: string, prompt: string): Promise<string> {
  console.log("[v0] backfill - callAnthropic starting")
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  console.log("[v0] backfill - API response status:", response.status)
  
  if (!response.ok) {
    const error = await response.text()
    console.log("[v0] backfill - API error:", error)
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ""
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()
  const body = await request.json()
  const yearNumber = body.yearNumber

  console.log("[v0] backfill-analysis - Starting for simulation:", simulationId, "year:", yearNumber)

  try {
    // Get simulation with community
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select(`
        *,
        communities (id, name, description)
      `)
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get the year record
    const { data: yearRecord, error: yearError } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", simulationId)
      .eq("year_number", yearNumber)
      .single()

    if (yearError || !yearRecord) {
      return NextResponse.json({ error: "Year not found" }, { status: 404 })
    }

    // Get entity responses for this year
    const { data: responses } = await supabase
      .from("entity_responses")
      .select(`
        *,
        entities (id, name, type)
      `)
      .eq("year_id", yearRecord.id)

    const responseData = responses || []

    // Generate opposition summary
    console.log("[v0] backfill - Generating opposition summary...")
    const oppositionSummaryJson = await callAnthropic(
      `You are analyzing opposition and resistance in a community simulation. Return valid JSON only.`,
      `Analyze the opposition and resistance from Year ${yearNumber}:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}

Year Summary: ${yearRecord.year_summary || "No summary available"}

All Entity Responses:
${responseData.map(r => `- ${r.entities?.name || "Unknown"}: ${r.response_type} - ${r.reasoning}`).join("\n")}

Return JSON with:
{
  "opposing_entities": [{"name": "entity name", "stance": "their position", "strength": "strong/moderate/weak", "motivations": ["why they oppose"]}],
  "resistance_themes": ["common themes in opposition"],
  "opposition_strength": "strong/moderate/weak/none",
  "likely_next_moves": ["what opponents might do next"],
  "vulnerabilities": ["potential weaknesses in opposition that could be exploited"],
  "narrative_summary": "2-3 sentence narrative of the opposition landscape"
}`
    )

    let oppositionSummary = {
      opposing_entities: [],
      resistance_themes: [],
      opposition_strength: "none",
      likely_next_moves: [],
      vulnerabilities: [],
      narrative_summary: "No significant opposition observed this year.",
    }

    try {
      const jsonMatch = oppositionSummaryJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        oppositionSummary = JSON.parse(jsonMatch[0])
        console.log("[v0] backfill - Parsed opposition summary successfully")
      }
    } catch (e) {
      console.log("[v0] backfill - Failed to parse opposition summary:", e)
    }

    // Generate landscape snapshot
    console.log("[v0] backfill - Generating landscape snapshot...")
    const landscapeSnapshotJson = await callAnthropic(
      `You are analyzing the current state of a community after a simulation year. Return valid JSON only.`,
      `Analyze the community landscape after Year ${yearNumber}:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}

Year Summary: ${yearRecord.year_summary || "No summary available"}

All Entity Responses:
${responseData.map(r => `- ${r.entities?.name || "Unknown"}: ${r.response_type} - ${r.reasoning}`).join("\n")}

Return JSON with:
{
  "power_dynamics": {
    "dominant_forces": ["entities with most influence"],
    "emerging_powers": ["entities gaining influence"],
    "declining_powers": ["entities losing influence"],
    "analysis": "brief analysis of power shifts"
  },
  "alliances": {
    "formed": [{"entities": ["A", "B"], "purpose": "why they allied"}],
    "strengthened": [{"entities": ["C", "D"], "reason": "why stronger"}],
    "strained": [{"entities": ["E", "F"], "reason": "source of tension"}]
  },
  "resources": {
    "committed": "total resources committed this year",
    "gaps": ["resource needs not being met"],
    "opportunities": ["resource opportunities identified"]
  },
  "momentum": {
    "direction": "favorable/unfavorable/neutral",
    "confidence": 0.7,
    "key_factors": ["what's driving the momentum"]
  },
  "narrative_summary": "2-3 sentence narrative of the current landscape"
}`
    )

    let landscapeSnapshot = {
      power_dynamics: { dominant_forces: [], emerging_powers: [], declining_powers: [], analysis: "" },
      alliances: { formed: [], strengthened: [], strained: [] },
      resources: { committed: "Unknown", gaps: [], opportunities: [] },
      momentum: { direction: "neutral", confidence: 0.5, key_factors: [] },
      narrative_summary: "The community landscape remains stable.",
    }

    try {
      const jsonMatch = landscapeSnapshotJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        landscapeSnapshot = JSON.parse(jsonMatch[0])
        console.log("[v0] backfill - Parsed landscape snapshot successfully")
      }
    } catch (e) {
      console.log("[v0] backfill - Failed to parse landscape snapshot:", e)
    }

    // Generate strategic recommendations
    console.log("[v0] backfill - Generating recommendations...")
    const recommendationsJson = await callAnthropic(
      `You are a strategic advisor providing recommendations based on a community simulation year. Return valid JSON only.`,
      `Provide strategic recommendations after Year ${yearNumber}:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}

Year Summary: ${yearRecord.year_summary || "No summary available"}

Landscape: ${landscapeSnapshot.narrative_summary}
Opposition: ${oppositionSummary.narrative_summary}

Return JSON with:
{
  "for_focal_entity": {
    "immediate_actions": ["actions to take in next year"],
    "relationship_priorities": ["key relationships to cultivate"],
    "risks_to_mitigate": ["risks to address"],
    "opportunities_to_pursue": ["opportunities to capitalize on"]
  },
  "for_coalition": {
    "collective_priorities": ["shared goals to focus on"],
    "coordination_needs": ["areas requiring better coordination"],
    "resource_allocation": ["recommendations for resource deployment"]
  },
  "strategic_pivots": ["major strategic shifts to consider"],
  "watch_items": ["things to monitor closely"],
  "confidence_assessment": {
    "success_likelihood": "high/medium/low",
    "key_uncertainties": ["major unknowns"],
    "best_case": "what success looks like",
    "worst_case": "what failure looks like"
  },
  "narrative_summary": "2-3 sentence executive summary of recommendations"
}`
    )

    let recommendations = {
      for_focal_entity: { immediate_actions: [], relationship_priorities: [], risks_to_mitigate: [], opportunities_to_pursue: [] },
      for_coalition: { collective_priorities: [], coordination_needs: [], resource_allocation: [] },
      strategic_pivots: [],
      watch_items: [],
      confidence_assessment: { success_likelihood: "medium", key_uncertainties: [], best_case: "", worst_case: "" },
      narrative_summary: "Continue current strategy while monitoring developments.",
    }

    try {
      const jsonMatch = recommendationsJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0])
        console.log("[v0] backfill - Parsed recommendations successfully")
      }
    } catch (e) {
      console.log("[v0] backfill - Failed to parse recommendations:", e)
    }

    // Update the year record
    console.log("[v0] backfill - Updating database...")
    const { error: updateError } = await supabase
      .from("simulation_years")
      .update({
        opposition_summary: oppositionSummary,
        landscape_snapshot: landscapeSnapshot,
        recommendations: recommendations,
      })
      .eq("id", yearRecord.id)

    if (updateError) {
      console.log("[v0] backfill - Database update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log("[v0] backfill - Successfully updated year", yearNumber)

    return NextResponse.json({
      success: true,
      yearNumber,
      oppositionSummary,
      landscapeSnapshot,
      recommendations,
    })

  } catch (error) {
    console.error("Backfill analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed" },
      { status: 500 }
    )
  }
}
