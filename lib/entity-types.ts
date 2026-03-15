// Entity type definitions for the community simulation

export type EntityType = "nonprofit" | "for-profit" | "government" | "individual-influencer" | "civic-group" | "foundation" | "coalition" | "other"

export type DecisionMakingStyle = "consensus-driven" | "hierarchical" | "data-driven" | "intuitive" | "participatory"

export type RiskTolerance = "conservative" | "moderate" | "aggressive"

export type CollaborationWillingness = "low" | "moderate" | "high"

export type PowerLevel = "low" | "moderate" | "high" | "very-high"

export type InfluenceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type LevelScale = "low" | "medium" | "high"

export type AttitudeLevel = "hostile" | "resistant" | "neutral" | "supportive" | "champion"

export interface FundingSource {
  source: string
  percentage: number
  stability: "unstable" | "stable" | "very-stable"
}

export interface Program {
  name: string
  description: string
  targetPopulation: string
  annualBudget?: number
  outcomes?: string
}

export interface Relationship {
  entityName: string
  entityId?: string // If linked to existing entity in database
  type: "ally" | "partner" | "competitor" | "adversary" | "neutral" | "funder" | "beneficiary"
  strength: "weak" | "moderate" | "strong"
  direction?: "outgoing" | "incoming" | "bidirectional"
  notes?: string
  // Verification fields to prevent hallucination
  confidence: number // 0-100
  source: "structured-data" | "ai-research" | "manual" | "news" | "website"
  sourceUrl?: string // Citation URL
  sourceDate?: string // When the source was published/accessed
  verified: boolean // User has confirmed this relationship
}

export interface StrategicGoal {
  goal: string
  timeframe: string
  priority: "low" | "medium" | "high"
}

export interface Entity {
  // Basic Identity
  id: string
  name: string
  type: EntityType
  mission: string
  foundedDate?: string
  legalStructure?: string
  website?: string

  // Financial Capacity
  annualRevenue?: number
  annualExpenses?: number
  programExpensePercent?: number
  adminExpensePercent?: number
  fundraisingExpensePercent?: number
  assets?: number
  monthsCashOnHand?: number
  fundingSources: FundingSource[]

  // Human Resources
  staffCount?: number
  volunteerCount?: number
  boardSize?: number
  keyLeadership: Array<{ name: string; role: string }>
  staffTurnoverRate?: number

  // Programs & Services
  programs: Program[]
  targetPopulations: string[]
  geographicServiceArea: string

  // Influence & Power
  communityInfluenceLevel: InfluenceLevel
  politicalConnections?: string
  mediaPresence: LevelScale
  networkReach: LevelScale
  decisionMakingAuthority: LevelScale

  // Relationships
  relationships: Relationship[]

  // Strategic Orientation
  strategicGoals: StrategicGoal[]
  riskTolerance: RiskTolerance
  collaborationWillingness: CollaborationWillingness
  innovationOrientation: LevelScale
  decisionMakingStyle: DecisionMakingStyle

  // Values & Culture
  coreValues: string[]
  organizationalCulture?: string
  equityJusticeOrientation: LevelScale
  communityAccountability: LevelScale

  // Environmental Context (operating conditions)
  policyEnvironment?: "permissive" | "moderate" | "restrictive" | "highly-regulated"
  marketCompetitiveness?: "few-actors" | "moderate" | "highly-competitive"
  externalShocksLevel?: LevelScale
  communityNeedLevel?: LevelScale

  // Behavioral Rules & Strategies
  decisionRules?: string
  triggerConditions?: string[]
  learningAdaptationRate?: LevelScale
  timeHorizon?: "short-term" | "medium-term" | "long-term"

  // Legitimacy, Salience & Stance
  perceivedLegitimacy?: LevelScale
  issueUrgency?: LevelScale
  interestLevelInFocalIssue?: LevelScale
  attitudeSupport?: AttitudeLevel

  // Information & Cognition
  informationAccess?: LevelScale
  analyticalCapacity?: LevelScale
  biasesMentalModels?: string[]
  transparencyLevel?: LevelScale

  // Operational Constraints
  legalPolicyConstraints?: string[]
  capacityConstraints?: string
  timeConstraints?: string
  infrastructureTechLevel?: LevelScale

  // Individual-Specific (for influencers, leaders)
  demographics?: string
  personalRiskTolerance?: RiskTolerance
  reputationTrustLevel?: LevelScale
  personalMotivations?: string[]
  communicationChannels?: string[]
  communicationStyle?: string

  // Systems-Change & Equity
  systemsChangeFocus?: "service-delivery" | "mixed" | "policy-advocacy" | "structural-change"
  powerSharingPractices?: LevelScale
  resourceFlowPreferences?: string[]

  // Metadata
  createdAt: string
  updatedAt: string
  dataQualityScore?: number // 0-100, how complete/confident we are
  dataSources?: Array<{
    type: "website" | "document" | "990" | "interview" | "news" | "manual"
    url?: string
    date?: string
    confidence?: number
  }>
}

// Community types for ecosystem simulation

export type StakeholderRole = 
  | "ally"           // Mission-aligned, potential collaborator
  | "funder"         // Provides resources
  | "opposition"     // May oppose initiatives (commercial interests, etc.)
  | "regulator"      // Has authority/jurisdiction
  | "influencer"     // Shapes public opinion
  | "affected-party" // Impacted by outcomes
  | "service-provider" // Delivers services in the space
  | "researcher"     // Academic/research institutions
  | "unknown"        // Role not yet determined

export interface Community {
  id: string
  name: string
  description?: string
  geography: string // e.g., "Missouri", "St. Louis Metro", "National"
  issueAreas: string[] // e.g., ["childhood obesity", "nutrition", "physical activity"]
  criteria?: string // Additional user-defined criteria
  focalEntityId?: string // The organization doing strategic planning
  createdAt: string
  updatedAt: string
}

export interface CommunityEntity {
  communityId: string
  entityId: string
  addedAt: string
  addedBy: "discovery" | "manual"
  role?: StakeholderRole
  notes?: string
}

export interface Candidate {
  id: string
  communityId: string
  name: string
  type: EntityType
  reasonForInclusion: string // Why AI selected them - critical for user decision
  stakeholderRole: StakeholderRole
  existingEntityId?: string // If already in database
  selected: boolean // User's decision
  rejected: boolean // User explicitly rejected
  quickPreviewData?: {
    description?: string
    website?: string
    location?: string
  }
  createdAt: string
  updatedAt: string
}
