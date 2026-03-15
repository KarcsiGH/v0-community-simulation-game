import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { Entity } from "@/lib/entity-types"

// GET all entities
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("entities")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform from snake_case DB columns to camelCase Entity format
    const entities = (data || []).map(transformDbToEntity)

    return NextResponse.json(entities)
  } catch (error) {
    console.error("Error fetching entities:", error)
    return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 })
  }
}

// POST - create new entity
export async function POST(request: Request) {
  try {
    const entity: Entity = await request.json()
    const supabase = await createClient()

    // Transform from camelCase Entity to snake_case DB columns
    const dbEntity = transformEntityToDb(entity)

    const { data, error } = await supabase
      .from("entities")
      .insert(dbEntity)
      .select()
      .maybeSingle() // Use maybeSingle for consistent error handling

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Failed to create entity" }, { status: 500 })
    }

    return NextResponse.json(transformDbToEntity(data))
  } catch (error) {
    console.error("Error creating entity:", error)
    return NextResponse.json({ error: "Failed to create entity" }, { status: 500 })
  }
}

// Transform database row (with nested JSONB) to Entity type (flat structure)
function transformDbToEntity(row: Record<string, unknown>): Entity {
  // Parse nested JSONB columns
  const financials = (row.financials as Record<string, unknown>) || {}
  const humanResources = (row.human_resources as Record<string, unknown>) || {}
  const programsData = (row.programs as Record<string, unknown>) || {}
  const influence = (row.influence as Record<string, unknown>) || {}
  const strategic = (row.strategic as Record<string, unknown>) || {}
  const advanced = (row.advanced as Record<string, unknown>) || {}
  const dataConfidence = (row.data_confidence as Record<string, unknown>) || {}

  return {
    // Basic Identity (direct columns)
    id: row.id as string,
    name: row.name as string,
    type: row.type as Entity["type"],
    mission: row.mission as string,
    foundedDate: row.founded_date as string | undefined,
    legalStructure: row.legal_structure as string | undefined,
    website: row.website as string | undefined,

    // Financial Capacity (from financials jsonb)
    annualRevenue: financials.annual_revenue as number | undefined,
    annualExpenses: financials.annual_expenses as number | undefined,
    programExpensePercent: financials.program_expense_percent as number | undefined,
    adminExpensePercent: financials.admin_expense_percent as number | undefined,
    fundraisingExpensePercent: financials.fundraising_expense_percent as number | undefined,
    assets: financials.assets as number | undefined,
    monthsCashOnHand: financials.months_cash_on_hand as number | undefined,
    fundingSources: (financials.funding_sources as Entity["fundingSources"]) || [],

    // Human Resources (from human_resources jsonb)
    staffCount: humanResources.staff_count as number | undefined,
    volunteerCount: humanResources.volunteer_count as number | undefined,
    boardSize: humanResources.board_size as number | undefined,
    keyLeadership: (humanResources.key_leadership as Entity["keyLeadership"]) || [],
    staffTurnoverRate: humanResources.staff_turnover_rate as number | undefined,

    // Programs & Services (from programs jsonb)
    programs: (programsData.list as Entity["programs"]) || [],
    targetPopulations: (programsData.target_populations as string[]) || [],
    geographicServiceArea: (row.geographic_scope as string) || (programsData.geographic_service_area as string) || "",

    // Influence & Power (from influence jsonb)
    communityInfluenceLevel: (influence.community_influence_level as Entity["communityInfluenceLevel"]) || 5,
    politicalConnections: influence.political_connections as string | undefined,
    mediaPresence: (influence.media_presence as Entity["mediaPresence"]) || "low",
    networkReach: (influence.network_reach as Entity["networkReach"]) || "low",
    decisionMakingAuthority: (influence.decision_making_authority as Entity["decisionMakingAuthority"]) || "low",

    // Relationships (direct jsonb column)
    relationships: (row.relationships as Entity["relationships"]) || [],

    // Strategic Orientation (from strategic jsonb)
    strategicGoals: (strategic.goals as Entity["strategicGoals"]) || [],
    riskTolerance: (strategic.risk_tolerance as Entity["riskTolerance"]) || "moderate",
    collaborationWillingness: (strategic.collaboration_willingness as Entity["collaborationWillingness"]) || "moderate",
    innovationOrientation: (strategic.innovation_orientation as Entity["innovationOrientation"]) || "medium",
    decisionMakingStyle: (strategic.decision_making_style as Entity["decisionMakingStyle"]) || "data-driven",
    coreValues: (strategic.core_values as string[]) || [],
    organizationalCulture: strategic.organizational_culture as string | undefined,
    equityJusticeOrientation: (strategic.equity_justice_orientation as Entity["equityJusticeOrientation"]) || "medium",
    communityAccountability: (strategic.community_accountability as Entity["communityAccountability"]) || "medium",

    // Advanced fields (from advanced jsonb)
    policyEnvironment: advanced.policy_environment as Entity["policyEnvironment"],
    marketCompetitiveness: advanced.market_competitiveness as Entity["marketCompetitiveness"],
    externalShocksLevel: advanced.external_shocks_level as Entity["externalShocksLevel"],
    communityNeedLevel: advanced.community_need_level as Entity["communityNeedLevel"],
    decisionRules: advanced.decision_rules as string | undefined,
    triggerConditions: (advanced.trigger_conditions as string[]) || [],
    learningAdaptationRate: advanced.learning_adaptation_rate as Entity["learningAdaptationRate"],
    timeHorizon: advanced.time_horizon as Entity["timeHorizon"],
    perceivedLegitimacy: advanced.perceived_legitimacy as Entity["perceivedLegitimacy"],
    issueUrgency: advanced.issue_urgency as Entity["issueUrgency"],
    interestLevelInFocalIssue: advanced.interest_level_in_focal_issue as Entity["interestLevelInFocalIssue"],
    attitudeSupport: advanced.attitude_support as Entity["attitudeSupport"],
    informationAccess: advanced.information_access as Entity["informationAccess"],
    analyticalCapacity: advanced.analytical_capacity as Entity["analyticalCapacity"],
    biasesMentalModels: (advanced.biases_mental_models as string[]) || [],
    transparencyLevel: advanced.transparency_level as Entity["transparencyLevel"],
    legalPolicyConstraints: (advanced.legal_policy_constraints as string[]) || [],
    capacityConstraints: advanced.capacity_constraints as string | undefined,
    timeConstraints: advanced.time_constraints as string | undefined,
    infrastructureTechLevel: advanced.infrastructure_tech_level as Entity["infrastructureTechLevel"],
    demographics: advanced.demographics as string | undefined,
    personalRiskTolerance: advanced.personal_risk_tolerance as Entity["personalRiskTolerance"],
    reputationTrustLevel: advanced.reputation_trust_level as Entity["reputationTrustLevel"],
    personalMotivations: (advanced.personal_motivations as string[]) || [],
    communicationChannels: (advanced.communication_channels as string[]) || [],
    communicationStyle: advanced.communication_style as string | undefined,
    systemsChangeFocus: advanced.systems_change_focus as Entity["systemsChangeFocus"],
    powerSharingPractices: advanced.power_sharing_practices as Entity["powerSharingPractices"],
    resourceFlowPreferences: (advanced.resource_flow_preferences as string[]) || [],

    // Metadata
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    dataQualityScore: dataConfidence.quality_score as number | undefined,
    dataSources: (row.data_sources as Entity["dataSources"]) || [],
  }
}

// Transform Entity type (flat structure) to database row (with nested JSONB)
function transformEntityToDb(entity: Entity): Record<string, unknown> {
  return {
    // Basic Identity (direct columns)
    id: entity.id,
    name: entity.name,
    type: entity.type,
    mission: entity.mission,
    founded_date: entity.foundedDate,
    legal_structure: entity.legalStructure,
    website: entity.website,
    geographic_scope: entity.geographicServiceArea,

    // Nested JSONB: financials
    financials: {
      annual_revenue: entity.annualRevenue,
      annual_expenses: entity.annualExpenses,
      program_expense_percent: entity.programExpensePercent,
      admin_expense_percent: entity.adminExpensePercent,
      fundraising_expense_percent: entity.fundraisingExpensePercent,
      assets: entity.assets,
      months_cash_on_hand: entity.monthsCashOnHand,
      funding_sources: entity.fundingSources,
    },

    // Nested JSONB: human_resources
    human_resources: {
      staff_count: entity.staffCount,
      volunteer_count: entity.volunteerCount,
      board_size: entity.boardSize,
      key_leadership: entity.keyLeadership,
      staff_turnover_rate: entity.staffTurnoverRate,
    },

    // Nested JSONB: programs
    programs: {
      list: entity.programs,
      target_populations: entity.targetPopulations,
      geographic_service_area: entity.geographicServiceArea,
    },

    // Nested JSONB: influence
    influence: {
      community_influence_level: entity.communityInfluenceLevel,
      political_connections: entity.politicalConnections,
      media_presence: entity.mediaPresence,
      network_reach: entity.networkReach,
      decision_making_authority: entity.decisionMakingAuthority,
    },

    // Direct JSONB: relationships
    relationships: entity.relationships,

    // Nested JSONB: strategic
    strategic: {
      goals: entity.strategicGoals,
      risk_tolerance: entity.riskTolerance,
      collaboration_willingness: entity.collaborationWillingness,
      innovation_orientation: entity.innovationOrientation,
      decision_making_style: entity.decisionMakingStyle,
      core_values: entity.coreValues,
      organizational_culture: entity.organizationalCulture,
      equity_justice_orientation: entity.equityJusticeOrientation,
      community_accountability: entity.communityAccountability,
    },

    // Nested JSONB: advanced
    advanced: {
      policy_environment: entity.policyEnvironment,
      market_competitiveness: entity.marketCompetitiveness,
      external_shocks_level: entity.externalShocksLevel,
      community_need_level: entity.communityNeedLevel,
      decision_rules: entity.decisionRules,
      trigger_conditions: entity.triggerConditions,
      learning_adaptation_rate: entity.learningAdaptationRate,
      time_horizon: entity.timeHorizon,
      perceived_legitimacy: entity.perceivedLegitimacy,
      issue_urgency: entity.issueUrgency,
      interest_level_in_focal_issue: entity.interestLevelInFocalIssue,
      attitude_support: entity.attitudeSupport,
      information_access: entity.informationAccess,
      analytical_capacity: entity.analyticalCapacity,
      biases_mental_models: entity.biasesMentalModels,
      transparency_level: entity.transparencyLevel,
      legal_policy_constraints: entity.legalPolicyConstraints,
      capacity_constraints: entity.capacityConstraints,
      time_constraints: entity.timeConstraints,
      infrastructure_tech_level: entity.infrastructureTechLevel,
      demographics: entity.demographics,
      personal_risk_tolerance: entity.personalRiskTolerance,
      reputation_trust_level: entity.reputationTrustLevel,
      personal_motivations: entity.personalMotivations,
      communication_channels: entity.communicationChannels,
      communication_style: entity.communicationStyle,
      systems_change_focus: entity.systemsChangeFocus,
      power_sharing_practices: entity.powerSharingPractices,
      resource_flow_preferences: entity.resourceFlowPreferences,
    },

    // Nested JSONB: data_confidence
    data_confidence: {
      quality_score: entity.dataQualityScore,
    },

    // Direct JSONB: data_sources
    data_sources: entity.dataSources,
  }
}
