import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { EntityType, StakeholderRole } from "@/lib/entity-types"

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

interface DiscoveredCandidate {
  name: string
  type: EntityType
  reasonForInclusion: string
  stakeholderRole: StakeholderRole
  description?: string
  website?: string
  location?: string
}

// POST - Discover ecosystem actors for a community
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { communityId, geography, issueAreas, criteria, focalEntityName } = body

    if (!communityId) {
      return NextResponse.json({ error: "Community ID is required" }, { status: 400 })
    }

    if (!geography || !issueAreas?.length) {
      return NextResponse.json({ 
        error: "Geography and at least one issue area are required" 
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Step 1: Discover candidates using AI
    const candidates = await discoverCandidates(
      geography,
      issueAreas,
      criteria,
      focalEntityName
    )

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No candidates discovered",
        candidates: [],
        newCount: 0,
        existingCount: 0,
      })
    }

    // Step 2: Cross-reference with existing entities in database
    const { data: existingEntities } = await supabase
      .from("entities")
      .select("id, name")

    const existingEntityMap = new Map<string, string>()
    if (existingEntities) {
      for (const entity of existingEntities) {
        existingEntityMap.set(entity.name.toLowerCase().trim(), entity.id)
      }
    }

    // Step 3: Check for existing candidates in this community
    const { data: existingCandidates } = await supabase
      .from("community_candidates")
      .select("candidate_name")
      .eq("community_id", communityId)

    const existingCandidateNames = new Set(
      (existingCandidates || []).map(c => c.candidate_name?.toLowerCase().trim())
    )

    // Step 4: Prepare candidates for insertion (skip duplicates)
    const candidatesToInsert = []
    let newCount = 0
    let existingCount = 0

    for (const candidate of candidates) {
      const normalizedName = candidate.name.toLowerCase().trim()
      
      // Skip if already a candidate in this community
      if (existingCandidateNames.has(normalizedName)) {
        continue
      }

      const existingEntityId = existingEntityMap.get(normalizedName)
      if (existingEntityId) {
        existingCount++
      } else {
        newCount++
      }

      candidatesToInsert.push({
        community_id: communityId,
        candidate_name: candidate.name,
        candidate_type: candidate.type,
        reason_for_inclusion: candidate.reasonForInclusion,
        stakeholder_role: candidate.stakeholderRole,
        existing_entity_id: existingEntityId || null,
        status: "pending", // DB uses status column: pending, selected, rejected
        confidence: 70, // Default confidence from AI discovery
      })
    }

    // Step 5: Insert candidates into database
    if (candidatesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("community_candidates")
        .insert(candidatesToInsert)

      if (insertError) {
        console.error("Error inserting candidates:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Step 6: Fetch all candidates for this community
    const { data: allCandidates, error: fetchError } = await supabase
      .from("community_candidates")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Error fetching candidates:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Discovered ${candidatesToInsert.length} new candidates`,
      candidates: (allCandidates || []).map(c => ({
        id: c.id,
        communityId: c.community_id,
        name: c.candidate_name,
        type: c.candidate_type,
        reasonForInclusion: c.reason_for_inclusion,
        stakeholderRole: c.stakeholder_role,
        existingEntityId: c.existing_entity_id,
        selected: c.status === "selected",
        rejected: c.status === "rejected",
        quickPreviewData: null,
        createdAt: c.created_at,
        updatedAt: c.reviewed_at,
      })),
      newCount,
      existingCount,
    })
  } catch (error) {
    console.error("Error discovering ecosystem:", error)
    return NextResponse.json({ error: "Failed to discover ecosystem" }, { status: 500 })
  }
}

async function discoverCandidates(
  geography: string,
  issueAreas: string[],
  criteria: string | undefined,
  focalEntityName: string | undefined
): Promise<DiscoveredCandidate[]> {
  if (!PERPLEXITY_API_KEY) {
    console.log("[v0] Perplexity API key not found - falling back to OpenAI")
    return discoverCandidatesWithOpenAI(geography, issueAreas, criteria, focalEntityName)
  }

  const issueAreasText = issueAreas.join(", ")
  
  const prompt = `You are researching the ecosystem of organizations and actors involved in "${issueAreasText}" in "${geography}".
${focalEntityName ? `The focal organization conducting this research is: ${focalEntityName}` : ""}
${criteria ? `Additional criteria: ${criteria}` : ""}

Cast a WIDE NET. Find ALL relevant actors, including those who might not be obvious. For each category below, identify specific organizations:

1. **Mission-Aligned Organizations** - Nonprofits, NGOs, community groups working ON this issue
2. **Funders** - Foundations, government agencies, corporate funders who provide resources for this work
3. **Government/Regulators** - Agencies with authority, jurisdiction, or policy-making power over this issue
4. **Service Providers** - Organizations delivering direct services related to this issue
5. **Research/Academic** - Universities, research centers, think tanks studying this issue
6. **Commercial Interests** - Businesses that may BENEFIT from the problem persisting (potential opposition)
7. **Industry Groups** - Trade associations, lobbying groups that may oppose or support initiatives
8. **Healthcare/Medical** - Hospital systems, medical associations, healthcare providers
9. **Media/Influencers** - News outlets, journalists, social media influencers covering this issue
10. **Affected Communities** - Community organizations representing those impacted by this issue

For EACH organization found, provide:
- Full official name
- Type (nonprofit, for-profit, government, foundation, coalition, civic-group, individual-influencer, other)
- A DETAILED reason why they are relevant (2-3 sentences explaining their stake in this issue)
- Their stakeholder role (ally, funder, opposition, regulator, influencer, affected-party, service-provider, researcher)
- Brief description
- Website if known
- Location/headquarters

Return as JSON array:
{
  "candidates": [
    {
      "name": "Full Organization Name",
      "type": "nonprofit",
      "reasonForInclusion": "Detailed explanation of why this organization matters for this issue...",
      "stakeholderRole": "ally",
      "description": "Brief description of the organization",
      "website": "https://...",
      "location": "City, State"
    }
  ]
}

Find at least 30-50 organizations if possible. Include BOTH obvious actors AND less obvious ones (like food companies for obesity, energy companies for climate, etc.).
Return ONLY valid JSON, no explanatory text.`

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are an expert researcher identifying all stakeholders in a policy/social issue ecosystem. Be thorough and include non-obvious actors. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.log("[v0] Perplexity API key invalid for ecosystem discovery - falling back to OpenAI")
        return discoverCandidatesWithOpenAI(geography, issueAreas, criteria, focalEntityName)
      }
      console.error("Perplexity API error:", response.status, response.statusText)
      return []
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""
    
    // Extract JSON from response
    const parsed = extractJSON(content)
    
    if (parsed?.candidates && Array.isArray(parsed.candidates)) {
      return parsed.candidates
        .filter((c: Record<string, unknown>) => c.name && c.reasonForInclusion)
        .map((c: Record<string, unknown>) => ({
          name: c.name as string,
          type: validateEntityType(c.type as string),
          reasonForInclusion: c.reasonForInclusion as string,
          stakeholderRole: validateStakeholderRole(c.stakeholderRole as string),
          description: c.description as string | undefined,
          website: c.website as string | undefined,
          location: c.location as string | undefined,
        }))
    }

    return []
  } catch (error) {
    console.error("Error calling Perplexity API:", error)
    return []
  }
}

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    // Try direct parse first
    return JSON.parse(text)
  } catch {
    // Try to find JSON in the text
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

// OpenAI fallback for ecosystem discovery when Perplexity is unavailable
async function discoverCandidatesWithOpenAI(
  geography: string,
  issueAreas: string[],
  criteria: string | undefined,
  focalEntityName: string | undefined
): Promise<DiscoveredCandidate[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    console.error("[v0] OpenAI API key not found for ecosystem fallback")
    return []
  }

  const issueAreasText = issueAreas.join(", ")
  const prompt = `You are researching the ecosystem of organizations and actors involved in "${issueAreasText}" in "${geography}".
${focalEntityName ? `The focal organization conducting this research is: ${focalEntityName}` : ""}
${criteria ? `Additional criteria: ${criteria}` : ""}

Find ALL relevant actors across these categories:
1. Mission-Aligned Organizations (nonprofits, NGOs, community groups)
2. Funders (foundations, government agencies, corporate funders)
3. Government/Regulators (agencies with authority)
4. Service Providers (direct service delivery)
5. Research/Academic (universities, think tanks)
6. Commercial Interests (businesses that may benefit from the problem)
7. Industry Groups (trade associations, lobbying groups)
8. Affected Communities (community organizations)

Return as JSON:
{
  "candidates": [
    {
      "name": "Full Organization Name",
      "type": "nonprofit",
      "reasonForInclusion": "Why this org matters...",
      "stakeholderRole": "ally",
      "description": "Brief description",
      "website": "https://...",
      "location": "City, State"
    }
  ]
}

Find at least 20-30 organizations. Return ONLY valid JSON.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert researcher identifying stakeholders in policy/social issue ecosystems. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      console.error("[v0] OpenAI fallback error:", response.status)
      return []
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""
    
    try {
      const parsed = JSON.parse(content)
      if (parsed?.candidates && Array.isArray(parsed.candidates)) {
        console.log("[v0] OpenAI fallback found", parsed.candidates.length, "candidates")
        return parsed.candidates
          .filter((c: Record<string, unknown>) => c.name && c.reasonForInclusion)
          .map((c: Record<string, unknown>) => ({
            name: c.name as string,
            type: validateEntityType(c.type as string),
            reasonForInclusion: c.reasonForInclusion as string,
            stakeholderRole: validateStakeholderRole(c.stakeholderRole as string),
            description: c.description as string | undefined,
            website: c.website as string | undefined,
            location: c.location as string | undefined,
          }))
      }
    } catch {
      console.error("[v0] Failed to parse OpenAI fallback response")
    }
    return []
  } catch (error) {
    console.error("[v0] OpenAI fallback error:", error)
    return []
  }
}
