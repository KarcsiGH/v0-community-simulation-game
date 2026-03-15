import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Direct Anthropic API call
async function callAnthropic(system: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
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

  try {
    // Get simulation with community and entities
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select(`
        *,
        communities (
          id,
          name,
          description,
          geography,
          issue_areas
        )
      `)
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get all entities in the community with their profiles
    const { data: communityEntities, error: ceError } = await supabase
      .from("community_entities")
      .select(`
        stakeholder_role,
        reason_for_inclusion,
        entities (
          id,
          name,
          type,
          mission,
          founded_date,
          legal_structure,
          headquarters_location,
          geographic_scope,
          financials,
          human_resources,
          programs,
          influence,
          relationships,
          strategic,
          advanced
        )
      `)
      .eq("community_id", simulation.community_id)

    if (ceError) {
      return NextResponse.json({ error: ceError.message }, { status: 500 })
    }

    // Build entity summaries for the analysis
    const entitySummaries = (communityEntities || []).map(ce => {
      const entity = ce.entities as Record<string, any>
      if (!entity) return null
      
      return {
        name: entity.name,
        type: entity.type,
        role: ce.stakeholder_role,
        mission: entity.mission,
        influence: entity.influence?.communityInfluenceLevel || "unknown",
        riskTolerance: entity.advanced?.riskTolerance || "moderate",
        collaborationWillingness: entity.advanced?.collaborationWillingness || "moderate",
        decisionMakingStyle: entity.advanced?.decisionMakingStyle || "consensus",
        resources: {
          budget: entity.financials?.annualRevenue,
          staff: entity.human_resources?.totalStaff,
        },
        strategicGoals: entity.strategic?.strategicGoals || [],
        knownRelationships: entity.relationships?.partnerships || [],
      }
    }).filter(Boolean)

    // Generate landscape analysis
    const systemPrompt = `You are an expert community dynamics analyst. You analyze the relationships, power structures, and dynamics within communities of organizations and stakeholders.

Your analysis should be thorough, evidence-based, and actionable. Focus on:
1. Power dynamics and influence structures
2. Existing alliances and tensions
3. Resource distribution and gaps
4. Shared and conflicting interests
5. Opportunities for collaboration
6. Potential obstacles and friction points

Provide your analysis in JSON format.`

    const analysisPrompt = `Analyze the following community landscape:

COMMUNITY: ${simulation.communities.name}
DESCRIPTION: ${simulation.communities.description || "N/A"}
GEOGRAPHY: ${Array.isArray(simulation.communities.geography) ? simulation.communities.geography.join(", ") : simulation.communities.geography}
ISSUE AREAS: ${Array.isArray(simulation.communities.issue_areas) ? simulation.communities.issue_areas.join(", ") : simulation.communities.issue_areas}

SCENARIO TO BE SIMULATED: ${simulation.scenario}

COMMUNITY ENTITIES (${entitySummaries.length} total):
${entitySummaries.map(e => `
- ${e.name} (${e.type}, Role: ${e.role})
  Mission: ${e.mission || "Unknown"}
  Influence: ${e.influence}, Risk Tolerance: ${e.riskTolerance}
  Collaboration Style: ${e.collaborationWillingness}, Decision Making: ${e.decisionMakingStyle}
  Resources: Budget ${e.resources.budget || "Unknown"}, Staff ${e.resources.staff || "Unknown"}
  Strategic Goals: ${e.strategicGoals?.slice(0, 3).join("; ") || "Unknown"}
`).join("\n")}

Provide a comprehensive landscape analysis in this JSON format:
{
  "executive_summary": "2-3 sentence overview of the community's current state",
  
  "power_structure": {
    "dominant_players": ["entity names with highest influence"],
    "emerging_voices": ["entities gaining influence"],
    "marginalized_stakeholders": ["entities with less voice than their stake warrants"],
    "analysis": "paragraph explaining the power dynamics"
  },
  
  "relationship_map": {
    "strong_alliances": [{"entities": ["A", "B"], "basis": "why they're allied"}],
    "tensions": [{"entities": ["X", "Y"], "source": "source of tension"}],
    "potential_partnerships": [{"entities": ["P", "Q"], "opportunity": "why they could partner"}],
    "analysis": "paragraph on relationship dynamics"
  },
  
  "resource_landscape": {
    "well_resourced": ["entities with strong resources"],
    "resource_constrained": ["entities needing resources"],
    "resource_gaps": ["types of resources lacking in community"],
    "analysis": "paragraph on resource distribution"
  },
  
  "strategic_alignment": {
    "shared_priorities": ["goals multiple entities share"],
    "conflicting_agendas": ["areas of disagreement"],
    "analysis": "paragraph on goal alignment"
  },
  
  "scenario_readiness": {
    "likely_champions": ["entities that will probably support the scenario"],
    "likely_opponents": ["entities that may resist"],
    "swing_votes": ["entities whose position is uncertain"],
    "key_factors": ["what will determine success or failure"],
    "analysis": "paragraph on how this community will respond to the scenario"
  },
  
  "opportunities": ["3-5 specific opportunities for positive change"],
  "risks": ["3-5 specific risks or obstacles"],
  "recommendations": ["3-5 strategic recommendations for achieving scenario goals"]
}`

    const analysisResponse = await callAnthropic(systemPrompt, analysisPrompt)
    
    // Parse the JSON response
    let analysis
    try {
      const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      // Return raw text if JSON parsing fails
      analysis = {
        executive_summary: "Analysis generated but could not be structured.",
        raw_analysis: analysisResponse,
        parsing_error: true,
      }
    }

    // Store in starting_conditions
    const startingConditions = {
      landscape_analysis: analysis,
      entity_count: entitySummaries.length,
      analyzed_at: new Date().toISOString(),
      entity_profiles: entitySummaries,
    }

    // Update simulation with landscape analysis
    const { error: updateError } = await supabase
      .from("simulations")
      .update({
        starting_conditions: startingConditions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", simulationId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      simulationId,
      analysis,
      entityCount: entitySummaries.length,
    })

  } catch (error) {
    console.error("Landscape analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()

  // Get existing landscape analysis
  const { data: simulation, error } = await supabase
    .from("simulations")
    .select("starting_conditions")
    .eq("id", simulationId)
    .single()

  if (error || !simulation) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
  }

  const analysis = simulation.starting_conditions?.landscape_analysis

  if (!analysis) {
    return NextResponse.json({ error: "No landscape analysis found" }, { status: 404 })
  }

  return NextResponse.json({
    analysis,
    entityCount: simulation.starting_conditions?.entity_count,
    analyzedAt: simulation.starting_conditions?.analyzed_at,
  })
}
