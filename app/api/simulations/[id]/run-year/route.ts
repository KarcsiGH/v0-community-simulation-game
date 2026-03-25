import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Direct Anthropic API call to bypass AI SDK compatibility issues
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
      max_tokens: 2048,
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

// POST - Run a single year of the simulation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const supabase = await createClient()

    // Get simulation details
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

    if (simulation.status === "completed") {
      return NextResponse.json({ error: "Simulation already completed" }, { status: 400 })
    }

    // Get the current year to process
    const yearToProcess = simulation.current_year + 1
    
    if (yearToProcess > simulation.total_years) {
      return NextResponse.json({ error: "All years completed" }, { status: 400 })
    }

    // Get the year record
    const { data: yearRecord, error: yearError } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", simulationId)
      .eq("year_number", yearToProcess)
      .single()

    if (yearError || !yearRecord) {
      return NextResponse.json({ error: "Year record not found" }, { status: 404 })
    }

    // Update year status to running
    await supabase
      .from("simulation_years")
      .update({ status: "running" })
      .eq("id", yearRecord.id)

    // Get all entities in this community
    const { data: communityEntities, error: entError } = await supabase
      .from("community_entities")
      .select(`
        entity_id,
        stakeholder_role,
        entities (
          id,
          name,
          type,
          mission,
          founded_date,
          legal_structure,
          geographic_scope,
          financials,
          human_resources,
          programs,
          strategic,
          influence,
          relationships
        )
      `)
      .eq("community_id", simulation.community_id)

    if (entError || !communityEntities || communityEntities.length === 0) {
      return NextResponse.json({ error: "No entities found in community" }, { status: 400 })
    }

    // Get previous year's responses for context (if not year 1)
    let previousResponses: any[] = []
    if (yearToProcess > 1) {
      const { data: prevYear } = await supabase
        .from("simulation_years")
        .select("id")
        .eq("simulation_id", simulationId)
        .eq("year_number", yearToProcess - 1)
        .single()
      
      if (prevYear) {
        const { data: prevResp } = await supabase
          .from("simulation_responses")
          .select(`*, entities (name)`)
          .eq("simulation_year_id", prevYear.id)
        
        previousResponses = prevResp || []
      }
    }

    // Get entity memory for consistency
    const { data: entityMemories } = await supabase
      .from("simulation_entity_memory")
      .select("*")
      .eq("simulation_id", simulationId)

    const memoryByEntity = new Map(
      (entityMemories || []).map(m => [m.entity_id, m])
    )

    // Get injected events for this year (not yet processed)
    const { data: yearEvents } = await supabase
      .from("simulation_events")
      .select("*")
      .eq("simulation_id", simulationId)
      .eq("year_number", yearToProcess)
      .eq("is_processed", false)

    const eventsContext = (yearEvents && yearEvents.length > 0)
      ? `\n\nEXTERNAL EVENTS THIS YEAR:\n${yearEvents.map(e => `- ${e.event_type.toUpperCase()}: ${e.title} - ${e.description}`).join("\n")}`
      : ""

    // Analyze network structure for enhanced simulation
    const entityIds = communityEntities.map(ce => (ce.entities as any)?.id).filter(Boolean)
    const networkAnalysis = await analyzeNetworkStructure(supabase, simulation.community_id, entityIds)
    
    // Build network context for AI
    const networkContext = `
NETWORK STRUCTURE ANALYSIS:
- Total Connections: ${networkAnalysis.totalConnections}
- Network Density: ${(networkAnalysis.networkDensity * 100).toFixed(1)}% (${networkAnalysis.communityStructure})
- Average Connections per Entity: ${networkAnalysis.averageDegree.toFixed(1)}
- Clustering Coefficient: ${(networkAnalysis.clusteringCoefficient * 100).toFixed(1)}%
- Key Bridge Entities: ${networkAnalysis.keyBridges.length > 0 ? communityEntities.filter(ce => networkAnalysis.keyBridges.includes((ce.entities as any)?.id)).map(ce => (ce.entities as any)?.name).join(", ") : "None identified"}
- Central Hub Entities: ${networkAnalysis.centralEntities.length > 0 ? communityEntities.filter(ce => networkAnalysis.centralEntities.includes((ce.entities as any)?.id)).map(ce => (ce.entities as any)?.name).join(", ") : "None"}
- Isolated Entities: ${networkAnalysis.isolatedEntities.length > 0 ? communityEntities.filter(ce => networkAnalysis.isolatedEntities.includes((ce.entities as any)?.id)).map(ce => (ce.entities as any)?.name).join(", ") : "None"}

This network structure affects how information flows and coalitions form. Entities with more connections have greater influence but also face more cross-pressures.`

    // Get milestones for progress tracking
    const { data: milestones } = await supabase
      .from("simulation_milestones")
      .select("*")
      .eq("simulation_id", simulationId)

    // Get starting year from parameters
    const startingYear = simulation.parameters?.starting_year || new Date().getFullYear()
    const calendarYear = startingYear + yearToProcess - 1

    // Build context for AI
    const communityContext = `
Community: ${simulation.communities.name}
Description: ${simulation.communities.description || "N/A"}
Geography: ${Array.isArray(simulation.communities.geography) ? simulation.communities.geography.join(", ") : simulation.communities.geography}
Issue Areas: ${Array.isArray(simulation.communities.issue_areas) ? simulation.communities.issue_areas.join(", ") : simulation.communities.issue_areas}

Scenario: ${simulation.scenario}

Year: ${yearToProcess} of ${simulation.total_years} (Calendar Year: ${calendarYear})
`

    const previousYearContext = previousResponses.length > 0 
      ? `\n\nPrevious Year Summary:\n${previousResponses.map(r => 
          `- ${r.entities?.name}: ${r.reasoning || r.content?.substring(0, 200)}`
        ).join("\n")}`
      : ""

    // Add events context and network context
    const fullContext = `${communityContext}${previousYearContext}${eventsContext}${networkContext}`

    // Check for existing manual responses for this year
    const { data: existingResponses } = await supabase
      .from("simulation_responses")
      .select("entity_id, decision")
      .eq("simulation_year_id", yearRecord.id)
    
    const manualEntityIds = new Set(
      (existingResponses || [])
        .filter(r => r.decision?.is_manual === true)
        .map(r => r.entity_id)
    )

    // Generate responses for each entity
    const responses = []
    const errors = []

    for (const ce of communityEntities) {
      const entity = ce.entities as Record<string, any>
      if (!entity) continue

      // Skip entities with manual responses
      if (manualEntityIds.has(entity.id)) {
        // Get the manual response to include in results
        const manualResponse = existingResponses?.find(r => r.entity_id === entity.id)
        if (manualResponse) {
          responses.push({ ...manualResponse, entities: entity })
        }
        continue
      }

      try {
        // Build entity profile for AI
        const entityProfile = buildEntityProfile(entity, ce.stakeholder_role)
        
        // Get entity's network position
        const entityNetworkMetrics = networkAnalysis.entityMetrics.get(entity.id)
        const networkPositionContext = entityNetworkMetrics ? `
NETWORK POSITION:
- Connections: ${entityNetworkMetrics.degree} relationships
- Role: ${entityNetworkMetrics.networkRole}
- Clustering: ${(entityNetworkMetrics.clusterCoefficient * 100).toFixed(0)}% of their contacts know each other
${entityNetworkMetrics.isKeyBridge ? "- KEY BRIDGE: This entity connects otherwise separate groups - their position gives them unique influence and access to diverse information" : ""}
${entityNetworkMetrics.degree === 0 ? "- ISOLATED: This entity has no established relationships - they may be new or operate independently" : ""}
${entityNetworkMetrics.degree >= 5 ? "- HIGHLY CONNECTED: This entity is a hub with many relationships - their actions affect many others and they face pressure from multiple directions" : ""}` : ""
        
        // Get entity memory for consistency
        const memory = memoryByEntity.get(entity.id)
        const memoryContext = memory ? `
IMPORTANT - This organization's history in this simulation:
- Previous Position: ${memory.current_position}
- Previous Commitments: ${JSON.stringify(memory.commitments_made || [])}
- Key Relationships Changed: ${JSON.stringify(memory.relationship_changes || [])}
- Stated Priorities: ${JSON.stringify(memory.stated_priorities || [])}

You MUST maintain consistency with their previous positions unless something significant has changed.
If they change position, explicitly explain why.` : ""
        
        // Generate response using direct Anthropic API
        const responseText = await callAnthropic(
          `You are simulating how an organization would respond to a community scenario. 
You must respond AS the organization, based on their profile, values, resources, and strategic priorities.
Be specific about what actions they would take, what resources they would commit, and who they might partner with.
Consider their risk tolerance, collaboration willingness, and decision-making style.
Consider their position in the community network - highly connected entities face more pressure to act and coordinate, while bridge entities can play unique connecting roles.
CRITICAL: If this organization has taken positions before, you must be consistent unless circumstances clearly justify a change.
Output should be 2-4 paragraphs describing their response and decisions for this year.`,
          `${fullContext}
${memoryContext}

You are responding as: ${entity.name}
${networkPositionContext}

Organization Profile:
${entityProfile}

Based on this organization's profile and the scenario, describe:
1. Their response to the scenario this year
2. Specific decisions they make
3. Resources they commit (if any) - be specific with dollar amounts or staff time
4. Organizations they seek to partner with (from the community)
5. Any concerns or opposition they have
6. How their relationships with other entities have changed

Respond in first person plural ("We will..." or "Our organization...")`
        )

        // Extract structured decisions using AI
        const decisionsJson = await callAnthropic(
          `Extract structured data from the response. Return valid JSON only.`,
          `Extract the following from this response:
${responseText}

Return JSON with:
{
  "decision_summary": "One sentence summary of main decision",
  "actions": ["list of specific actions"],
  "resources_committed": {
    "funding": 0,
    "staff_hours": 0,
    "in_kind": "description or null",
    "description": "narrative description"
  },
  "partners_sought": ["names of organizations they want to partner with"],
  "relationship_changes": [
    {"entity_name": "name", "change_type": "strengthened" | "weakened" | "new" | "broken", "reason": "why"}
  ],
  "sentiment": "supportive" | "neutral" | "opposed" | "cautious",
  "engagement_level": "high" | "medium" | "low",
  "position_statement": "One sentence stating their current position on the scenario"
}`
        )

        let decisions = {
          decision_summary: "",
          actions: [] as string[],
          resources_committed: { funding: 0, staff_hours: 0, in_kind: null, description: "" },
          partners_sought: [] as string[],
          relationship_changes: [] as Array<{entity_name: string, change_type: string, reason: string}>,
          sentiment: "neutral",
          engagement_level: "medium",
          position_statement: "",
        }

        try {
          const jsonMatch = decisionsJson.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            decisions = JSON.parse(jsonMatch[0])
          }
        } catch {
          // Use defaults if parsing fails
        }

        // Store response (upsert to handle re-runs)
        const { data: response, error: respError } = await supabase
          .from("simulation_responses")
          .upsert({
            simulation_year_id: yearRecord.id,
            entity_id: entity.id,
            response_type: decisions.sentiment,
            content: responseText,
            reasoning: decisions.decision_summary,
            decision: {
              summary: decisions.decision_summary,
              actions: decisions.actions,
              resources_committed: decisions.resources_committed,
              partners_sought: decisions.partners_sought,
              engagement_level: decisions.engagement_level,
            },
            confidence: decisions.engagement_level === "high" ? 0.9 : decisions.engagement_level === "medium" ? 0.7 : 0.5,
            influenced_by: [],
          }, {
            onConflict: "simulation_year_id,entity_id,response_type",
          })
          .select()
          .single()

        if (respError) {
          errors.push({ entity: entity.name, error: respError.message })
        } else {
          responses.push(response)
          
          // Update entity memory for consistency in future years
          await supabase
            .from("simulation_entity_memory")
            .upsert({
              simulation_id: simulationId,
              entity_id: entity.id,
              year_number: yearToProcess,
              position_summary: decisions.position_statement || decisions.decision_summary,
              stance_trajectory: decisions.sentiment,
              commitments: {
                history: [
                  ...(memory?.commitments?.history || []),
                  ...(decisions.resources_committed?.funding > 0 || decisions.resources_committed?.staff_hours > 0
                    ? [{ year: yearToProcess, ...decisions.resources_committed }]
                    : [])
                ]
              },
              resources_committed: decisions.resources_committed,
              relationships_state: {
                changes: [
                  ...(memory?.relationships_state?.changes || []),
                  ...decisions.relationship_changes.map((rc: any) => ({ year: yearToProcess, ...rc }))
                ]
              },
              key_decisions: decisions.actions.slice(0, 5),
            }, {
              onConflict: "simulation_id,entity_id",
            })

          // Track relationship changes
          for (const rc of decisions.relationship_changes) {
            // Find the target entity
            const targetEntity = communityEntities.find(
              ce => (ce.entities as any)?.name?.toLowerCase() === rc.entity_name.toLowerCase()
            )
            if (targetEntity) {
              await supabase
                .from("simulation_relationship_changes")
                .insert({
                  simulation_year_id: yearRecord.id,
                  entity_a_id: entity.id,
                  entity_b_id: (targetEntity.entities as any).id,
                  change_type: rc.change_type,
                  reason: rc.reason,
                  previous_strength: memory?.relationships_state?.changes?.find(
                    (r: any) => r.entity_name === rc.entity_name
                  )?.change_type || "neutral",
                  new_strength: rc.change_type,
                })
            }
          }

          // Track resource commitments
          if (decisions.resources_committed?.funding > 0 || decisions.resources_committed?.staff_hours > 0) {
            await supabase
              .from("simulation_resource_commitments")
              .insert({
                simulation_year_id: yearRecord.id,
                entity_id: entity.id,
                resource_type: decisions.resources_committed.funding > 0 ? "funding" : "staff_time",
                amount: decisions.resources_committed.description || `$${decisions.resources_committed.funding || 0}`,
                amount_numeric: decisions.resources_committed.funding || decisions.resources_committed.staff_hours,
                commitment_level: decisions.engagement_level || "medium",
                purpose: decisions.decision_summary,
              })
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        errors.push({ entity: entity.name, error: error.message })
      }
    }

    // Generate year summary
    const yearSummary = await callAnthropic(
      `You are summarizing a year in a community simulation. Be concise but capture key events and dynamics.`,
      `Summarize Year ${yearToProcess} of the simulation:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}

Entity Responses:
${responses.map(r => `- ${r.reasoning}`).join("\n")}

Write a 2-3 paragraph narrative summary of what happened this year, including:
- Major decisions and actions
- Emerging coalitions or conflicts
- Progress toward or away from community goals`
    )

    // Generate opposition summary
    const oppositionSummaryJson = await callAnthropic(
      `You are analyzing opposition and resistance in a community simulation. Return valid JSON only.`,
      `Analyze the opposition and resistance from Year ${yearToProcess}:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}

All Entity Responses:
${responses.map(r => `- ${r.entities?.name || "Unknown"}: ${r.response_type} - ${r.reasoning}`).join("\n")}

Return JSON with:
{
  "opposing_entities": [{"name": "entity name", "stance": "brief description of their opposition", "actions_taken": ["list of opposing actions"]}],
  "resistance_themes": ["common themes in opposition"],
  "opposition_strength": "strong" | "moderate" | "weak" | "none",
  "likely_next_moves": ["predicted opposition actions for next year"],
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
      }
    } catch {
      // Use defaults
    }

    // Generate landscape snapshot with network analysis
    const landscapeSnapshotJson = await callAnthropic(
      `You are analyzing the current state of a community after a simulation year. Return valid JSON only.`,
      `Analyze the community landscape after Year ${yearToProcess}:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}
Starting Conditions: ${JSON.stringify(simulation.starting_conditions?.landscape_analysis || {})}

Network Structure:
- Density: ${(networkAnalysis.networkDensity * 100).toFixed(1)}%
- Average Connections: ${networkAnalysis.averageDegree.toFixed(1)}
- Clustering: ${(networkAnalysis.clusteringCoefficient * 100).toFixed(1)}%
- Structure Type: ${networkAnalysis.communityStructure}
- Key Bridges: ${networkAnalysis.keyBridges.length}
- Central Hubs: ${networkAnalysis.centralEntities.length}
- Isolated Entities: ${networkAnalysis.isolatedEntities.length}

All Entity Responses This Year:
${responses.map(r => `- ${r.entities?.name || "Unknown"}: ${r.response_type} - ${r.reasoning}`).join("\n")}

Return JSON with:
{
  "power_dynamics": {
    "dominant_forces": ["entities/coalitions with most influence"],
    "emerging_powers": ["entities gaining influence"],
    "declining_powers": ["entities losing influence"],
    "analysis": "brief analysis of power shifts"
  },
  "alliances": {
    "formed": [{"members": ["entity names"], "basis": "reason for alliance"}],
    "strengthened": [{"members": ["entity names"], "development": "how it strengthened"}],
    "strained": [{"members": ["entity names"], "tension": "source of tension"}]
  },
  "resources": {
    "committed": "total resources committed this year",
    "gaps": ["resource gaps identified"],
    "opportunities": ["funding or resource opportunities"]
  },
  "momentum": {
    "direction": "favorable" | "unfavorable" | "neutral" | "mixed",
    "confidence": 0.0-1.0,
    "key_factors": ["factors driving momentum"]
  },
  "network_evolution": {
    "structure_change": "strengthening" | "fragmenting" | "stable" | "reorganizing",
    "new_connections_forming": ["pairs of entities forming new ties"],
    "connections_at_risk": ["pairs of entities with strained relationships"],
    "bridge_entities": ["entities connecting different groups"],
    "analysis": "brief analysis of how the network is evolving"
  },
  "narrative_summary": "2-3 sentence narrative of the current landscape"
}`
    )

    let landscapeSnapshot: {
      power_dynamics: { dominant_forces: string[]; emerging_powers: string[]; declining_powers: string[]; analysis: string };
      alliances: { formed: any[]; strengthened: any[]; strained: any[] };
      resources: { committed: string; gaps: string[]; opportunities: string[] };
      momentum: { direction: string; confidence: number; key_factors: string[] };
      network_evolution?: { structure_change: string; new_connections_forming: string[]; connections_at_risk: string[]; bridge_entities: string[]; analysis: string };
      narrative_summary: string;
    } = {
      power_dynamics: { dominant_forces: [], emerging_powers: [], declining_powers: [], analysis: "" },
      alliances: { formed: [], strengthened: [], strained: [] },
      resources: { committed: "Unknown", gaps: [], opportunities: [] },
      momentum: { direction: "neutral", confidence: 0.5, key_factors: [] },
      network_evolution: { structure_change: "stable", new_connections_forming: [], connections_at_risk: [], bridge_entities: [], analysis: "" },
      narrative_summary: "The community landscape remains stable.",
    }

    try {
      const jsonMatch = landscapeSnapshotJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        landscapeSnapshot = JSON.parse(jsonMatch[0])
      }
    } catch {
      // Use defaults
    }

    // Generate strategic recommendations
    const recommendationsJson = await callAnthropic(
      `You are a strategic advisor providing recommendations based on a community simulation year. Return valid JSON only.`,
      `Provide strategic recommendations after Year ${yearToProcess}:

Community: ${simulation.communities.name}
Scenario: ${simulation.scenario}
Focal Organization (if any): ${simulation.parameters?.focal_entity || "Coalition as a whole"}

Year Summary: ${yearSummary}

Opposition Analysis: ${oppositionSummary.narrative_summary}

Landscape: ${landscapeSnapshot.narrative_summary}

All Entity Responses:
${responses.map(r => `- ${r.entities?.name || "Unknown"}: ${r.response_type} - ${r.reasoning}`).join("\n")}

Return JSON with:
{
  "for_focal_entity": {
    "immediate_actions": ["actions to take before next year"],
    "relationship_priorities": ["entities to prioritize building relationships with"],
    "risks_to_mitigate": ["risks that need attention"],
    "opportunities_to_pursue": ["opportunities identified"]
  },
  "for_coalition": {
    "collective_priorities": ["priorities for the supporting coalition"],
    "coordination_needs": ["areas requiring better coordination"],
    "resource_allocation": ["recommendations for resource deployment"]
  },
  "strategic_pivots": ["potential strategic changes to consider"],
  "watch_items": ["things to monitor closely"],
  "confidence_assessment": {
    "success_likelihood": "high" | "medium" | "low",
    "key_uncertainties": ["main unknowns affecting outcome"],
    "best_case": "brief best case scenario",
    "worst_case": "brief worst case scenario"
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
      }
    } catch {
      // Use defaults
    }

    // Detect and track coalitions
    const coalitionDetectionJson = await callAnthropic(
      `You are detecting coalitions forming in a community simulation. Return valid JSON only.`,
      `Analyze the entity responses to detect coalitions:

Entity Responses:
${responses.map(r => `- ${r.entities?.name || "Unknown"}: ${r.response_type} - Partners sought: ${r.decision?.partners_sought?.join(", ") || "none"}`).join("\n")}

Return JSON with:
{
  "coalitions": [
    {
      "name": "descriptive coalition name",
      "members": ["entity names"],
      "purpose": "what unites them",
      "strength": "strong" | "moderate" | "emerging",
      "type": "supportive" | "opposition" | "neutral"
    }
  ]
}`
    )

    try {
      const coalitionMatch = coalitionDetectionJson.match(/\{[\s\S]*\}/)
      if (coalitionMatch) {
        const coalitionData = JSON.parse(coalitionMatch[0])
        for (const coalition of coalitionData.coalitions || []) {
          // Check if coalition already exists
          const { data: existingCoalition } = await supabase
            .from("simulation_coalitions")
            .select("id")
            .eq("simulation_id", simulationId)
            .eq("name", coalition.name)
            .maybeSingle()

          let coalitionId = existingCoalition?.id

          if (!coalitionId) {
            const { data: newCoalition } = await supabase
              .from("simulation_coalitions")
              .insert({
                simulation_id: simulationId,
                name: coalition.name,
                formed_year: yearToProcess,
                purpose: coalition.purpose,
                status: "active",
              })
              .select("id")
              .single()
            coalitionId = newCoalition?.id
          }

          if (coalitionId) {
            // Add members
            for (const memberName of coalition.members || []) {
              const memberEntity = communityEntities.find(
                ce => (ce.entities as any)?.name?.toLowerCase() === memberName.toLowerCase()
              )
              if (memberEntity) {
                await supabase
                  .from("simulation_coalition_members")
                  .upsert({
                    coalition_id: coalitionId,
                    entity_id: (memberEntity.entities as any).id,
                    joined_year: yearToProcess,
                    role: coalition.type === "supportive" ? "supporter" : coalition.type === "opposition" ? "opponent" : "observer",
                  }, {
                    onConflict: "coalition_id,entity_id",
                  })
              }
            }
          }
        }
      }
    } catch {
      // Coalition detection failed, continue
    }

    // Update milestone progress
    for (const milestone of milestones || []) {
      if (milestone.status === "achieved") continue

      // Check if milestone conditions are met based on landscape
      const progressCheck = await callAnthropic(
        `Evaluate milestone progress. Return valid JSON only.`,
        `Milestone: ${milestone.name}
Description: ${milestone.description || "N/A"}
Target Value: ${milestone.target_value || milestone.target_numeric}

Current Landscape: ${landscapeSnapshot.narrative_summary}
Support Level: ${responses.filter(r => r.response_type === "supportive").length} supportive, ${responses.filter(r => r.response_type === "opposed").length} opposed

Return JSON: {"current_value": number, "progress_percentage": number, "is_achieved": boolean}`
      )

      try {
        const progressMatch = progressCheck.match(/\{[\s\S]*\}/)
        if (progressMatch) {
          const progress = JSON.parse(progressMatch[0])
          const updateData: Record<string, unknown> = {
            current_numeric: progress.current_value || 0,
            current_value: String(progress.current_value || 0),
            status: progress.is_achieved ? "achieved" : progress.progress_percentage > 50 ? "in_progress" : "not_started",
          }
          if (progress.is_achieved) {
            updateData.achieved_year = yearToProcess
          }
          await supabase
            .from("simulation_milestones")
            .update(updateData)
            .eq("id", milestone.id)
        }
      } catch {
        // Progress check failed, continue
      }
    }

    // Calculate branch probability with network health factor
    const supportiveCount = responses.filter(r => r.response_type === "supportive").length
    const opposedCount = responses.filter(r => r.response_type === "opposed").length
    const totalResponses = responses.length

    const supportRatio = totalResponses > 0 ? supportiveCount / totalResponses : 0.5
    const momentumFactor = landscapeSnapshot.momentum?.confidence || 0.5
    const momentumDirection = landscapeSnapshot.momentum?.direction === "favorable" ? 1.2 :
                              landscapeSnapshot.momentum?.direction === "unfavorable" ? 0.8 : 1.0

    // Network health factors
    // Higher density = better coordination = higher success probability
    const networkDensityFactor = 0.5 + networkAnalysis.networkDensity * 0.5 // 0.5 to 1.0
    // Higher clustering = stronger coalitions = more resilient
    const clusteringFactor = 0.5 + networkAnalysis.clusteringCoefficient * 0.5 // 0.5 to 1.0
    // More isolated entities = weaker network = lower probability
    const isolationPenalty = networkAnalysis.isolatedEntities.length / Math.max(entityIds.length, 1)
    // Key bridges can be points of fragility or strength
    const bridgeFactor = networkAnalysis.keyBridges.length > 0 ? 1.05 : 1.0 // Slight bonus for bridges

    // Network health score (0.5 to 1.2)
    const networkHealthFactor = ((networkDensityFactor + clusteringFactor) / 2) * (1 - isolationPenalty * 0.3) * bridgeFactor

    // Base probability calculation with network health
    let branchProbability = (
      supportRatio * 0.35 + 
      momentumFactor * 0.25 + 
      (1 - opposedCount/Math.max(totalResponses, 1)) * 0.25 +
      (networkHealthFactor - 0.5) * 0.15 // Network contributes up to 15%
    ) * momentumDirection
    branchProbability = Math.max(0.05, Math.min(0.95, branchProbability)) // Clamp between 5% and 95%

    // Update year record as completed with all summaries including network metrics
    await supabase
      .from("simulation_years")
      .update({
        status: "completed",
        year_summary: yearSummary,
        opposition_summary: oppositionSummary,
        landscape_snapshot: landscapeSnapshot,
        recommendations: recommendations,
        metrics: {
          ...(yearRecord.metrics || {}),
          network: {
            density: networkAnalysis.networkDensity,
            averageDegree: networkAnalysis.averageDegree,
            clusteringCoefficient: networkAnalysis.clusteringCoefficient,
            communityStructure: networkAnalysis.communityStructure,
            keyBridgesCount: networkAnalysis.keyBridges.length,
            centralEntitiesCount: networkAnalysis.centralEntities.length,
            isolatedEntitiesCount: networkAnalysis.isolatedEntities.length,
            totalConnections: networkAnalysis.totalConnections,
            networkHealthScore: networkHealthFactor,
          },
          support: {
            supportive: supportiveCount,
            opposed: opposedCount,
            total: totalResponses,
            ratio: supportRatio,
          },
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", yearRecord.id)

    // Update simulation current year and branch probability
    const newStatus = yearToProcess >= simulation.total_years ? "completed" : "running"
    await supabase
      .from("simulations")
      .update({ 
        current_year: yearToProcess,
        status: newStatus,
        branch_probability: branchProbability,
      })
      .eq("id", simulationId)

    // Mark next year as pending if not completed
    if (yearToProcess < simulation.total_years) {
      await supabase
        .from("simulation_years")
        .update({ status: "pending" })
        .eq("simulation_id", simulationId)
        .eq("year_number", yearToProcess + 1)
    }

    return NextResponse.json({
      success: true,
      yearNumber: yearToProcess,
      calendarYear: calendarYear,
      responsesGenerated: responses.length,
      errors: errors.length > 0 ? errors : undefined,
      summary: yearSummary,
      isComplete: newStatus === "completed",
    })

  } catch (error: any) {
    console.error("Error running simulation year:", error)
    return NextResponse.json({ error: error.message || "Failed to run simulation year" }, { status: 500 })
  }
}

// Helper to calculate network metrics for an entity
function calculateEntityNetworkMetrics(
  entityId: string,
  relationships: Array<{ source_id: string; target_id: string; strength: number; type: string }>,
  entityIds: Set<string>
): {
  degree: number
  betweenness: number
  isKeyBridge: boolean
  clusterCoefficient: number
  networkRole: string
} {
  // Calculate degree centrality
  const connections = relationships.filter(
    r => (r.source_id === entityId || r.target_id === entityId) && 
        entityIds.has(r.source_id) && entityIds.has(r.target_id)
  )
  const degree = connections.length

  // Get neighbors
  const neighbors = new Set<string>()
  connections.forEach(r => {
    if (r.source_id === entityId) neighbors.add(r.target_id)
    else neighbors.add(r.source_id)
  })

  // Calculate clustering coefficient (how connected are neighbors to each other)
  let neighborConnections = 0
  const neighborArray = Array.from(neighbors)
  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      const connected = relationships.some(
        r => (r.source_id === neighborArray[i] && r.target_id === neighborArray[j]) ||
             (r.source_id === neighborArray[j] && r.target_id === neighborArray[i])
      )
      if (connected) neighborConnections++
    }
  }
  const maxPossible = (neighbors.size * (neighbors.size - 1)) / 2
  const clusterCoefficient = maxPossible > 0 ? neighborConnections / maxPossible : 0

  // Simplified betweenness - count how many entity pairs this node connects
  let betweennessScore = 0
  const allEntityIds = Array.from(entityIds)
  for (let i = 0; i < allEntityIds.length; i++) {
    for (let j = i + 1; j < allEntityIds.length; j++) {
      if (allEntityIds[i] === entityId || allEntityIds[j] === entityId) continue
      
      // Check if entity is on a path between these two
      const iNeighbors = new Set(
        relationships
          .filter(r => r.source_id === allEntityIds[i] || r.target_id === allEntityIds[i])
          .map(r => r.source_id === allEntityIds[i] ? r.target_id : r.source_id)
      )
      const jNeighbors = new Set(
        relationships
          .filter(r => r.source_id === allEntityIds[j] || r.target_id === allEntityIds[j])
          .map(r => r.source_id === allEntityIds[j] ? r.target_id : r.source_id)
      )
      
      if (iNeighbors.has(entityId) && jNeighbors.has(entityId)) {
        betweennessScore++
      }
    }
  }
  const maxBetweenness = ((entityIds.size - 1) * (entityIds.size - 2)) / 2
  const betweenness = maxBetweenness > 0 ? betweennessScore / maxBetweenness : 0

  // Determine if this is a key bridge (high betweenness, low clustering)
  const isKeyBridge = betweenness > 0.1 && clusterCoefficient < 0.3

  // Determine network role
  let networkRole = "Peripheral"
  if (degree >= 5 && clusterCoefficient > 0.5) {
    networkRole = "Hub Leader"
  } else if (isKeyBridge) {
    networkRole = "Bridge Connector"
  } else if (degree >= 3) {
    networkRole = "Active Participant"
  } else if (degree >= 1) {
    networkRole = "Peripheral Participant"
  } else {
    networkRole = "Isolated"
  }

  return {
    degree,
    betweenness,
    isKeyBridge,
    clusterCoefficient,
    networkRole,
  }
}

// Helper to analyze network structure
async function analyzeNetworkStructure(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  communityId: string,
  entityIds: string[]
): Promise<{
  totalConnections: number
  averageDegree: number
  networkDensity: number
  clusteringCoefficient: number
  keyBridges: string[]
  centralEntities: string[]
  isolatedEntities: string[]
  communityStructure: string
  entityMetrics: Map<string, ReturnType<typeof calculateEntityNetworkMetrics>>
}> {
  // Get all relationships for entities in this community
  const { data: relationships } = await supabase
    .from("entity_relationships")
    .select("source_entity_id, target_entity_id, relationship_type, strength")
    .or(`source_entity_id.in.(${entityIds.join(",")}),target_entity_id.in.(${entityIds.join(",")})`)

  const entityIdSet = new Set(entityIds)
  const normalizedRelationships = (relationships || [])
    .filter(r => entityIdSet.has(r.source_entity_id) && entityIdSet.has(r.target_entity_id))
    .map(r => ({
      source_id: r.source_entity_id,
      target_id: r.target_entity_id,
      strength: r.strength || 5,
      type: r.relationship_type,
    }))

  // Calculate metrics for each entity
  const entityMetrics = new Map<string, ReturnType<typeof calculateEntityNetworkMetrics>>()
  const centralEntities: string[] = []
  const isolatedEntities: string[] = []
  const keyBridges: string[] = []

  for (const entityId of entityIds) {
    const metrics = calculateEntityNetworkMetrics(entityId, normalizedRelationships, entityIdSet)
    entityMetrics.set(entityId, metrics)
    
    if (metrics.degree >= 5) centralEntities.push(entityId)
    if (metrics.degree === 0) isolatedEntities.push(entityId)
    if (metrics.isKeyBridge) keyBridges.push(entityId)
  }

  // Network-level metrics
  const totalConnections = normalizedRelationships.length
  const maxConnections = (entityIds.length * (entityIds.length - 1)) / 2
  const networkDensity = maxConnections > 0 ? totalConnections / maxConnections : 0
  
  const degrees = Array.from(entityMetrics.values()).map(m => m.degree)
  const averageDegree = degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0
  
  const clusterCoeffs = Array.from(entityMetrics.values()).map(m => m.clusterCoefficient)
  const clusteringCoefficient = clusterCoeffs.length > 0 ? clusterCoeffs.reduce((a, b) => a + b, 0) / clusterCoeffs.length : 0

  // Determine community structure
  let communityStructure = "sparse"
  if (networkDensity > 0.3 && clusteringCoefficient > 0.4) {
    communityStructure = "tightly-knit"
  } else if (networkDensity > 0.15) {
    communityStructure = "moderately-connected"
  } else if (keyBridges.length > entityIds.length * 0.1) {
    communityStructure = "bridge-dependent"
  }

  return {
    totalConnections,
    averageDegree,
    networkDensity,
    clusteringCoefficient,
    keyBridges,
    centralEntities,
    isolatedEntities,
    communityStructure,
    entityMetrics,
  }
}

// Helper to build entity profile for AI
function buildEntityProfile(entity: Record<string, any>, stakeholderRole: string | null): string {
  const lines = []
  
  lines.push(`Type: ${entity.type}`)
  if (stakeholderRole) lines.push(`Role in Community: ${stakeholderRole}`)
  if (entity.mission) lines.push(`Mission: ${entity.mission}`)
  if (entity.geographic_scope) lines.push(`Geographic Scope: ${entity.geographic_scope}`)
  
  // Financials
  if (entity.financials) {
    const f = entity.financials
    if (f.annual_revenue) lines.push(`Annual Revenue: ${f.annual_revenue}`)
    if (f.funding_sources) lines.push(`Funding Sources: ${Array.isArray(f.funding_sources) ? f.funding_sources.join(", ") : f.funding_sources}`)
  }
  
  // Programs
  if (entity.programs) {
    const p = entity.programs
    if (p.list && Array.isArray(p.list)) {
      lines.push(`Programs: ${p.list.slice(0, 5).join(", ")}`)
    }
    if (p.target_populations) {
      lines.push(`Target Populations: ${Array.isArray(p.target_populations) ? p.target_populations.join(", ") : p.target_populations}`)
    }
  }
  
  // Strategic
  if (entity.strategic) {
    const s = entity.strategic
    if (s.goals && Array.isArray(s.goals)) lines.push(`Strategic Goals: ${s.goals.slice(0, 3).join("; ")}`)
    if (s.core_values && Array.isArray(s.core_values)) lines.push(`Core Values: ${s.core_values.join(", ")}`)
    if (s.risk_tolerance) lines.push(`Risk Tolerance: ${s.risk_tolerance}`)
    if (s.collaboration_willingness) lines.push(`Collaboration Willingness: ${s.collaboration_willingness}`)
    if (s.decision_making_style) lines.push(`Decision Making: ${s.decision_making_style}`)
  }
  
  // Influence
  if (entity.influence) {
    const i = entity.influence
    if (i.community_influence_level) lines.push(`Community Influence: ${i.community_influence_level}`)
  }
  
  // Existing relationships
  if (entity.relationships && Array.isArray(entity.relationships) && entity.relationships.length > 0) {
    const relSummary = entity.relationships.slice(0, 5).map((r: any) => 
      `${r.entityName || r.entity_name} (${r.type})`
    ).join(", ")
    lines.push(`Key Relationships: ${relSummary}`)
  }
  
  return lines.join("\n")
}
