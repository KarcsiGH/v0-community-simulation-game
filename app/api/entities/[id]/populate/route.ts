import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST - Run data collection for a single entity
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get entity basic info
    const { data: entity, error: fetchError } = await supabase
      .from("entities")
      .select("id, name, type, website, headquarters_location, data_confidence")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    }

    // Track collected data
    const collectedData: Record<string, unknown> = {}
    const dataSources: Array<{ type: string; date: string; confidence: number }> = []
    const errors: string[] = []

    // 1. AI Research (Perplexity, Claude, OpenAI)
    try {
      const aiResponse = await fetch(new URL("/api/ai-research", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: entity.name,
          type: entity.type,
          website: entity.website,
          location: entity.headquarters_location,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        if (aiData.success && aiData.data) {
          Object.assign(collectedData, aiData.data)
          dataSources.push({ type: "ai-research", date: new Date().toISOString(), confidence: 70 })
        }
      }
    } catch (e) {
      errors.push("AI research failed")
    }

    // 2. Financial Data (990 for nonprofits, SEC for for-profits, USAspending for government)
    try {
      if (entity.type === "nonprofit" || entity.type === "foundation") {
        const finResponse = await fetch(new URL("/api/search-990", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationName: entity.name }),
        })

        if (finResponse.ok) {
          const finData = await finResponse.json()
          if (finData.organization) {
            collectedData.annualRevenue = finData.organization.totrevenue
            collectedData.annualExpenses = finData.organization.totfuncexpns
            collectedData.assets = finData.organization.totassetsend
            dataSources.push({ type: "990", date: new Date().toISOString(), confidence: 90 })
          }
        }
      } else if (entity.type === "for-profit") {
        const secResponse = await fetch(new URL("/api/search-sec", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: entity.name }),
        })

        if (secResponse.ok) {
          const secData = await secResponse.json()
          if (secData.success && secData.data) {
            Object.assign(collectedData, secData.data)
            dataSources.push({ type: "sec", date: new Date().toISOString(), confidence: 90 })
          }
        }
      } else if (entity.type === "government") {
        const usaResponse = await fetch(new URL("/api/search-usaspending", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agencyName: entity.name }),
        })

        if (usaResponse.ok) {
          const usaData = await usaResponse.json()
          if (usaData.success && usaData.data) {
            Object.assign(collectedData, usaData.data)
            dataSources.push({ type: "usaspending", date: new Date().toISOString(), confidence: 90 })
          }
        }
      }
    } catch (e) {
      errors.push("Financial data lookup failed")
    }

    // 3. Relationship Discovery
    try {
      const relResponse = await fetch(new URL("/api/discover-relationships", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName: entity.name,
          entityType: entity.type,
          location: entity.headquarters_location,
        }),
      })

      if (relResponse.ok) {
        const relData = await relResponse.json()
        if (relData.relationships && relData.relationships.length > 0) {
          collectedData.relationships = relData.relationships
          dataSources.push({ type: "relationship-discovery", date: new Date().toISOString(), confidence: 60 })
        }
      }
    } catch (e) {
      errors.push("Relationship discovery failed")
    }

    // Calculate quality score based on what we found
    let qualityScore = 40 // Base score for completing AI research
    
    // Core identity (+15)
    if (collectedData.mission) qualityScore += 5
    if (collectedData.foundedDate) qualityScore += 5
    if (collectedData.legalStructure) qualityScore += 5
    
    // Operations (+15)
    if (collectedData.programs) qualityScore += 7
    if (collectedData.geographicServiceArea) qualityScore += 4
    if (collectedData.targetPopulations) qualityScore += 4
    
    // Leadership & Strategy (+15)
    if (collectedData.keyLeadership) qualityScore += 5
    if (collectedData.strategicGoals) qualityScore += 5
    if (collectedData.coreValues) qualityScore += 5
    
    // Financial (+10)
    if (collectedData.annualRevenue || collectedData.primaryFundingSources) qualityScore += 10
    
    // Relationships & Influence (+5)
    if (collectedData.relationships || collectedData.partnerships) qualityScore += 3
    if (collectedData.communityInfluenceLevel) qualityScore += 2
    
    qualityScore = Math.min(qualityScore, 95) // Cap at 95

    // Update entity in database
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_data_refresh: new Date().toISOString(),
      data_sources: dataSources,
      data_confidence: { quality_score: qualityScore },
    }

    // Map collected data to DB structure
    if (collectedData.mission) updatePayload.mission = collectedData.mission
    if (collectedData.foundedDate) updatePayload.founded_date = collectedData.foundedDate
    if (collectedData.legalStructure) updatePayload.legal_structure = collectedData.legalStructure
    // AI research returns geographicServiceArea, not serviceArea
    if (collectedData.geographicServiceArea) updatePayload.geographic_scope = collectedData.geographicServiceArea

    // Financials
    const financials: Record<string, unknown> = {}
    if (collectedData.annualRevenue) financials.annual_revenue = collectedData.annualRevenue
    if (collectedData.annualExpenses) financials.annual_expenses = collectedData.annualExpenses
    if (collectedData.assets) financials.assets = collectedData.assets
    // AI research returns primaryFundingSources, not fundingSources
    if (collectedData.primaryFundingSources) financials.funding_sources = collectedData.primaryFundingSources
    if (collectedData.fundingSources) financials.funding_sources = collectedData.fundingSources
    if (Object.keys(financials).length > 0) updatePayload.financials = financials

    // Human resources
    const humanResources: Record<string, unknown> = {}
    if (collectedData.keyLeadership) humanResources.key_leadership = collectedData.keyLeadership
    if (collectedData.staffCount) humanResources.staff_count = collectedData.staffCount
    if (Object.keys(humanResources).length > 0) updatePayload.human_resources = humanResources

    // Programs
    const programs: Record<string, unknown> = {}
    if (collectedData.programs) programs.list = collectedData.programs
    if (collectedData.targetPopulations) programs.target_populations = collectedData.targetPopulations
    if (Object.keys(programs).length > 0) updatePayload.programs = programs

    // Strategic
    const strategic: Record<string, unknown> = {}
    if (collectedData.strategicGoals) strategic.goals = collectedData.strategicGoals
    if (collectedData.coreValues) strategic.core_values = collectedData.coreValues
    if (collectedData.values) strategic.core_values = collectedData.values
    if (collectedData.riskTolerance) strategic.risk_tolerance = collectedData.riskTolerance
    if (collectedData.collaborationWillingness) strategic.collaboration_willingness = collectedData.collaborationWillingness
    if (collectedData.organizationalCulture) strategic.organizational_culture = collectedData.organizationalCulture
    if (collectedData.decisionMakingStyle) strategic.decision_making_style = collectedData.decisionMakingStyle
    if (Object.keys(strategic).length > 0) updatePayload.strategic = strategic

    // Influence
    const influence: Record<string, unknown> = {}
    if (collectedData.communityInfluenceLevel) influence.community_influence_level = collectedData.communityInfluenceLevel
    if (collectedData.communityPerception) influence.community_perception = collectedData.communityPerception
    if (Object.keys(influence).length > 0) updatePayload.influence = influence

    // Advanced (context data)
    const advanced: Record<string, unknown> = {}
    if (collectedData.recentNews) advanced.recent_news = collectedData.recentNews
    if (collectedData.foundingStory) advanced.founding_story = collectedData.foundingStory
    if (Object.keys(advanced).length > 0) updatePayload.advanced = advanced

    // Relationships (includes partnerships)
    if (collectedData.relationships) {
      updatePayload.relationships = collectedData.relationships
    } else if (collectedData.partnerships && collectedData.partnerships.length > 0) {
      // Convert partnerships to relationship format if no relationships exist
      updatePayload.relationships = collectedData.partnerships.map((p: string) => ({
        entityName: p,
        type: "partner",
        strength: "moderate",
        description: "Partnership identified via AI research",
      }))
    }

    console.log("[v0] Update payload keys:", Object.keys(updatePayload))
    console.log("[v0] Quality score:", qualityScore)
    console.log("[v0] Data sources:", dataSources.length)
    console.log("[v0] Collected data keys:", Object.keys(collectedData))

    const { error: updateError } = await supabase
      .from("entities")
      .update(updatePayload)
      .eq("id", id)

    if (updateError) {
      console.error("[v0] Database update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log("[v0] Entity updated successfully:", entity.name)

    return NextResponse.json({
      success: true,
      entityId: id,
      entityName: entity.name,
      qualityScore,
      dataSourcesCount: dataSources.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error populating entity:", error)
    return NextResponse.json({ error: "Failed to populate entity data" }, { status: 500 })
  }
}
