import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { EntityType, StakeholderRole } from "@/lib/entity-types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

interface DiscoveredEntity {
  name: string
  type: EntityType
  reasonForInclusion: string
  stakeholderRole: StakeholderRole
  description?: string
  website?: string
  location?: string
  influenceScore?: number
  connections?: string[]
}

interface DiscoveredRelationship {
  sourceEntity: string
  targetEntity: string
  relationshipType: "ally" | "partner" | "funder" | "competitor" | "adversary" | "neutral" | "beneficiary"
  strength: "weak" | "moderate" | "strong"
  direction: "outgoing" | "incoming" | "bidirectional"
  evidence?: string
}

// POST - Run deep ecosystem discovery with multiple waves
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params
    const body = await request.json()
    const { 
      waves = 2, // Number of discovery waves (depth)
      discoverRelationships = true,
      identifyInfluencers = true 
    } = body

    const supabase = await createClient()

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", communityId)
      .single()

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 })
    }

    const geography = Array.isArray(community.geography) 
      ? community.geography.join(", ") 
      : community.geography
    const issueAreas = community.issue_areas || []

    // Get existing candidates and entities
    const { data: existingCandidates } = await supabase
      .from("community_candidates")
      .select("candidate_name, status")
      .eq("community_id", communityId)

    const { data: communityEntities } = await supabase
      .from("community_entities")
      .select("entity_id, entities(id, name, type)")
      .eq("community_id", communityId)

    const existingNames = new Set([
      ...(existingCandidates || []).map(c => c.candidate_name?.toLowerCase()),
      ...(communityEntities || []).map(ce => (ce.entities as any)?.name?.toLowerCase())
    ])

    const allDiscoveredEntities: DiscoveredEntity[] = []
    const allDiscoveredRelationships: DiscoveredRelationship[] = []

    // Wave 1: Initial deep discovery with influencer identification
    console.log("[v0] Starting Wave 1: Deep ecosystem discovery")
    const wave1Entities = await runDiscoveryWave({
      geography,
      issueAreas,
      criteria: community.custom_criteria?.text,
      existingNames,
      waveNumber: 1,
      identifyInfluencers,
    })

    for (const entity of wave1Entities) {
      if (!existingNames.has(entity.name.toLowerCase())) {
        allDiscoveredEntities.push(entity)
        existingNames.add(entity.name.toLowerCase())
      }
    }

    // Wave 2+: Discover connections of high-influence entities
    if (waves >= 2 && allDiscoveredEntities.length > 0) {
      // Get top influencers from wave 1
      const topInfluencers = allDiscoveredEntities
        .filter(e => (e.influenceScore || 0) >= 70)
        .slice(0, 10)

      if (topInfluencers.length > 0) {
        console.log(`[v0] Starting Wave 2: Discovering networks of ${topInfluencers.length} key influencers`)
        
        for (const influencer of topInfluencers) {
          const connectedEntities = await discoverEntityNetwork({
            entityName: influencer.name,
            entityType: influencer.type,
            geography,
            issueAreas,
            existingNames,
          })

          for (const entity of connectedEntities.entities) {
            if (!existingNames.has(entity.name.toLowerCase())) {
              allDiscoveredEntities.push({
                ...entity,
                reasonForInclusion: `Connected to ${influencer.name}: ${entity.reasonForInclusion}`,
              })
              existingNames.add(entity.name.toLowerCase())
            }
          }

          // Collect relationships from this influencer
          for (const rel of connectedEntities.relationships) {
            allDiscoveredRelationships.push(rel)
          }
        }
      }
    }

    // Wave 3: Discover relationships between all entities
    if (discoverRelationships && allDiscoveredEntities.length >= 2) {
      console.log("[v0] Starting relationship mapping between discovered entities")
      
      const entityNames = allDiscoveredEntities.map(e => e.name)
      const interRelationships = await discoverInterEntityRelationships({
        entityNames,
        issueAreas,
        geography,
      })

      for (const rel of interRelationships) {
        // Avoid duplicates
        const exists = allDiscoveredRelationships.some(
          r => r.sourceEntity === rel.sourceEntity && r.targetEntity === rel.targetEntity
        )
        if (!exists) {
          allDiscoveredRelationships.push(rel)
        }
      }
    }

    // Insert candidates into database
    const candidatesToInsert = allDiscoveredEntities.map(entity => ({
      community_id: communityId,
      candidate_name: entity.name,
      candidate_type: entity.type,
      reason_for_inclusion: entity.reasonForInclusion,
      stakeholder_role: entity.stakeholderRole,
      status: "pending",
      confidence: entity.influenceScore || 70,
    }))

    if (candidatesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("community_candidates")
        .insert(candidatesToInsert)

      if (insertError) {
        console.error("[v0] Error inserting candidates:", insertError)
      }
    }

    // Fetch focal entity if exists
    let focalEntityName = null
    if (community.focal_entity_id) {
      const { data: focalEntity } = await supabase
        .from("entities")
        .select("name")
        .eq("id", community.focal_entity_id)
        .single()
      focalEntityName = focalEntity?.name
    }

    // Calculate network statistics
    const networkStats = calculateNetworkStats(allDiscoveredEntities, allDiscoveredRelationships)

    return NextResponse.json({
      success: true,
      waves: waves,
      entitiesDiscovered: allDiscoveredEntities.length,
      relationshipsDiscovered: allDiscoveredRelationships.length,
      entities: allDiscoveredEntities,
      relationships: allDiscoveredRelationships,
      networkStats,
      topInfluencers: allDiscoveredEntities
        .filter(e => (e.influenceScore || 0) >= 75)
        .sort((a, b) => (b.influenceScore || 0) - (a.influenceScore || 0))
        .slice(0, 10),
    })

  } catch (error) {
    console.error("[v0] Deep discovery error:", error)
    return NextResponse.json({ error: "Deep discovery failed" }, { status: 500 })
  }
}

async function runDiscoveryWave({
  geography,
  issueAreas,
  criteria,
  existingNames,
  waveNumber,
  identifyInfluencers,
}: {
  geography: string
  issueAreas: string[]
  criteria?: string
  existingNames: Set<string>
  waveNumber: number
  identifyInfluencers: boolean
}): Promise<DiscoveredEntity[]> {
  const apiKey = PERPLEXITY_API_KEY || OPENAI_API_KEY
  if (!apiKey) return []

  const issueAreasText = issueAreas.join(", ")

  const influencerPrompt = identifyInfluencers ? `

For EACH organization, also rate their INFLUENCE SCORE (0-100) based on:
- Decision-making power over policy, funding, or resources (high weight)
- Network connectivity (how many other orgs they work with)
- Public visibility and media presence
- Track record of successful initiatives
- Financial resources they control` : ""

  const prompt = `You are conducting a DEEP ecosystem analysis for "${issueAreasText}" in "${geography}".
${criteria ? `Criteria: ${criteria}` : ""}

This is discovery wave ${waveNumber}. Find organizations that are:
1. Direct actors in this space (obvious stakeholders)
2. INDIRECT influencers (less obvious but important)
3. Potential opposition or competing interests
4. Key individuals or thought leaders
5. Emerging or under-recognized players

Categories to explore:
- Foundations and major funders
- Government agencies at all levels (federal, state, local)
- Nonprofit service providers
- Academic researchers and institutions
- Healthcare systems and medical associations
- Industry groups and trade associations
- Media outlets and influential journalists
- Community organizing groups
- Faith-based organizations
- Corporate stakeholders (both supportive and opposing)
- Political figures and offices
- Consulting firms specializing in this area
${influencerPrompt}

For each entity found, provide:
{
  "entities": [
    {
      "name": "Full official name",
      "type": "nonprofit" | "for-profit" | "government" | "foundation" | "coalition" | "civic-group" | "individual-influencer" | "other",
      "reasonForInclusion": "Detailed 2-3 sentence explanation of their role and influence",
      "stakeholderRole": "ally" | "funder" | "opposition" | "regulator" | "influencer" | "affected-party" | "service-provider" | "researcher",
      "description": "Brief description",
      "website": "URL if known",
      "location": "Location",
      "influenceScore": 0-100,
      "connections": ["Names of other orgs they're known to work with"]
    }
  ]
}

Find at least 40-60 entities. Be thorough and include non-obvious actors.
Return ONLY valid JSON.`

  try {
    let response
    if (PERPLEXITY_API_KEY) {
      response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            { role: "system", content: "You are an expert ecosystem analyst. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      })
    } else {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an expert ecosystem analyst. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      })
    }

    if (!response.ok) {
      console.error("[v0] Discovery wave API error:", response.status)
      return []
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""
    const parsed = extractJSON(content)

    if (parsed?.entities && Array.isArray(parsed.entities)) {
      return parsed.entities
        .filter((e: any) => e.name && !existingNames.has(e.name.toLowerCase()))
        .map((e: any) => ({
          name: e.name,
          type: validateEntityType(e.type),
          reasonForInclusion: e.reasonForInclusion || "Discovered in ecosystem analysis",
          stakeholderRole: validateStakeholderRole(e.stakeholderRole),
          description: e.description,
          website: e.website,
          location: e.location,
          influenceScore: e.influenceScore || 50,
          connections: e.connections || [],
        }))
    }

    return []
  } catch (error) {
    console.error("[v0] Discovery wave error:", error)
    return []
  }
}

async function discoverEntityNetwork({
  entityName,
  entityType,
  geography,
  issueAreas,
  existingNames,
}: {
  entityName: string
  entityType: EntityType
  geography: string
  issueAreas: string[]
  existingNames: Set<string>
}): Promise<{ entities: DiscoveredEntity[], relationships: DiscoveredRelationship[] }> {
  const apiKey = PERPLEXITY_API_KEY || OPENAI_API_KEY
  if (!apiKey) return { entities: [], relationships: [] }

  const prompt = `Research the network and connections of "${entityName}" (${entityType}) in the context of ${issueAreas.join(", ")} in ${geography}.

Find:
1. Organizations they fund or are funded by
2. Partner organizations they collaborate with
3. Competitor or opposing organizations
4. Board interlocks (shared board members with other orgs)
5. Coalition memberships
6. Government relationships

Return as JSON:
{
  "connectedEntities": [
    {
      "name": "Organization name",
      "type": "nonprofit" | "for-profit" | "government" | "foundation" | "other",
      "relationshipType": "funder" | "partner" | "competitor" | "ally" | "adversary" | "beneficiary",
      "relationshipStrength": "weak" | "moderate" | "strong",
      "relationshipDirection": "outgoing" | "incoming" | "bidirectional",
      "reasonForInclusion": "Why this connection matters",
      "stakeholderRole": "ally" | "funder" | "opposition" | "regulator" | "influencer",
      "evidence": "Brief description of the evidence for this connection"
    }
  ]
}

Find 10-20 connected organizations. Return ONLY valid JSON.`

  try {
    let response
    if (PERPLEXITY_API_KEY) {
      response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            { role: "system", content: "You are a network analyst researching organizational connections." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
      })
    } else {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a network analyst researching organizational connections." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      })
    }

    if (!response.ok) return { entities: [], relationships: [] }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""
    const parsed = extractJSON(content)

    const entities: DiscoveredEntity[] = []
    const relationships: DiscoveredRelationship[] = []

    if (parsed?.connectedEntities && Array.isArray(parsed.connectedEntities)) {
      for (const conn of parsed.connectedEntities) {
        if (!conn.name) continue

        // Add entity if not exists
        if (!existingNames.has(conn.name.toLowerCase())) {
          entities.push({
            name: conn.name,
            type: validateEntityType(conn.type),
            reasonForInclusion: conn.reasonForInclusion || `Connected to ${entityName}`,
            stakeholderRole: validateStakeholderRole(conn.stakeholderRole),
          })
        }

        // Add relationship
        relationships.push({
          sourceEntity: entityName,
          targetEntity: conn.name,
          relationshipType: conn.relationshipType || "partner",
          strength: conn.relationshipStrength || "moderate",
          direction: conn.relationshipDirection || "bidirectional",
          evidence: conn.evidence,
        })
      }
    }

    return { entities, relationships }
  } catch (error) {
    console.error("[v0] Entity network discovery error:", error)
    return { entities: [], relationships: [] }
  }
}

async function discoverInterEntityRelationships({
  entityNames,
  issueAreas,
  geography,
}: {
  entityNames: string[]
  issueAreas: string[]
  geography: string
}): Promise<DiscoveredRelationship[]> {
  const apiKey = OPENAI_API_KEY
  if (!apiKey || entityNames.length < 2) return []

  // Batch entities to avoid too long prompts
  const batchSize = 20
  const allRelationships: DiscoveredRelationship[] = []

  for (let i = 0; i < entityNames.length; i += batchSize) {
    const batch = entityNames.slice(i, i + batchSize)
    
    const prompt = `Analyze relationships between these organizations working on ${issueAreas.join(", ")} in ${geography}:

Organizations:
${batch.map((name, idx) => `${idx + 1}. ${name}`).join("\n")}

Identify KNOWN relationships between these specific organizations:
- Funding relationships
- Partnerships and collaborations
- Competitive or adversarial relationships
- Coalition memberships together
- Shared initiatives or programs

Return as JSON:
{
  "relationships": [
    {
      "sourceEntity": "Name of first org",
      "targetEntity": "Name of second org",
      "relationshipType": "ally" | "partner" | "funder" | "competitor" | "adversary" | "beneficiary",
      "strength": "weak" | "moderate" | "strong",
      "direction": "outgoing" | "incoming" | "bidirectional",
      "evidence": "Brief description of evidence for this relationship"
    }
  ]
}

Only include relationships you can verify. Return ONLY valid JSON.`

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a network analyst identifying organizational relationships." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ""
      const parsed = JSON.parse(content)

      if (parsed?.relationships && Array.isArray(parsed.relationships)) {
        for (const rel of parsed.relationships) {
          if (rel.sourceEntity && rel.targetEntity) {
            allRelationships.push({
              sourceEntity: rel.sourceEntity,
              targetEntity: rel.targetEntity,
              relationshipType: rel.relationshipType || "partner",
              strength: rel.strength || "moderate",
              direction: rel.direction || "bidirectional",
              evidence: rel.evidence,
            })
          }
        }
      }
    } catch (error) {
      console.error("[v0] Inter-entity relationship discovery error:", error)
    }
  }

  return allRelationships
}

function calculateNetworkStats(
  entities: DiscoveredEntity[],
  relationships: DiscoveredRelationship[]
): Record<string, unknown> {
  // Count connections per entity
  const connectionCounts: Record<string, number> = {}
  for (const entity of entities) {
    connectionCounts[entity.name] = 0
  }
  
  for (const rel of relationships) {
    if (connectionCounts[rel.sourceEntity] !== undefined) {
      connectionCounts[rel.sourceEntity]++
    }
    if (connectionCounts[rel.targetEntity] !== undefined) {
      connectionCounts[rel.targetEntity]++
    }
  }

  // Find most connected
  const sortedByConnections = Object.entries(connectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Count by type
  const byType: Record<string, number> = {}
  for (const entity of entities) {
    byType[entity.type] = (byType[entity.type] || 0) + 1
  }

  // Count by role
  const byRole: Record<string, number> = {}
  for (const entity of entities) {
    byRole[entity.stakeholderRole] = (byRole[entity.stakeholderRole] || 0) + 1
  }

  // Relationship type distribution
  const relByType: Record<string, number> = {}
  for (const rel of relationships) {
    relByType[rel.relationshipType] = (relByType[rel.relationshipType] || 0) + 1
  }

  return {
    totalEntities: entities.length,
    totalRelationships: relationships.length,
    averageConnections: entities.length > 0 
      ? (relationships.length * 2 / entities.length).toFixed(1) 
      : 0,
    mostConnected: sortedByConnections,
    entityTypeDistribution: byType,
    stakeholderRoleDistribution: byRole,
    relationshipTypeDistribution: relByType,
    networkDensity: entities.length > 1 
      ? (relationships.length / (entities.length * (entities.length - 1) / 2) * 100).toFixed(1)
      : 0,
  }
}

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        return null
      }
    }
    return null
  }
}

function validateEntityType(type: string): EntityType {
  const validTypes: EntityType[] = [
    "nonprofit", "for-profit", "government", "foundation", 
    "coalition", "civic-group", "individual-influencer", "other"
  ]
  const normalized = type?.toLowerCase().replace(/[^a-z-]/g, "") as EntityType
  return validTypes.includes(normalized) ? normalized : "other"
}

function validateStakeholderRole(role: string): StakeholderRole {
  const validRoles: StakeholderRole[] = [
    "ally", "funder", "opposition", "regulator", 
    "influencer", "affected-party", "service-provider", "researcher", "unknown"
  ]
  const normalized = role?.toLowerCase().replace(/[^a-z-]/g, "") as StakeholderRole
  return validRoles.includes(normalized) ? normalized : "unknown"
}
