import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface DiscoveredRelationship {
  entityName: string
  entityId?: string // If entity exists in our database
  type: "ally" | "partner" | "competitor" | "adversary" | "neutral" | "funder" | "beneficiary"
  strength: "weak" | "moderate" | "strong"
  direction: "outgoing" | "incoming" | "bidirectional"
  confidence: number // 0-100
  source: "structured-data" | "ai-research" | "manual" | "news" | "website" // Source category
  sourceUrl?: string // Citation URL
  sourceDescription?: string // Description of the source
  sourceDate?: string // Date of the source
  notes?: string
  verified: boolean // Whether human has confirmed
}

export async function POST(request: NextRequest) {
  try {
    const { 
      organizationName, 
      entityType, 
      ein,
      website,
      existingData 
    } = await request.json()

    // Relationship discovery for all entity types

    const relationships: DiscoveredRelationship[] = []

    // Get existing entities from database for cross-referencing
    const supabase = await createClient()
    const { data: existingEntities } = await supabase
      .from("entities")
      .select("id, name, type")
    
    const entityNames = existingEntities?.map(e => e.name.toLowerCase()) || []

    // Strategy varies by entity type
    const isNonprofit = entityType === "nonprofit" || entityType === "foundation"
    const isForProfit = entityType === "for-profit"
    const isGovernment = entityType === "government"

    // 1. AI-powered relationship discovery (works for all entity types)
    const aiRelationships = await discoverRelationshipsWithAI(
      organizationName,
      entityType,
      website,
      existingData
    )
    
    if (aiRelationships) {
      for (const rel of aiRelationships) {
        // Check if related entity exists in our database
        const matchingEntity = existingEntities?.find(
          e => e.name.toLowerCase() === rel.entityName.toLowerCase()
        )
        
        relationships.push({
          ...rel,
          entityId: matchingEntity?.id,
          // source is already set correctly in discoverRelationshipsWithAI
        })
      }
    }

    // 2. For nonprofits/foundations: Check 990 data for funders/grantees
    if (isNonprofit && ein) {
      const financialRelationships = await discover990Relationships(ein, organizationName)
      if (financialRelationships) {
        for (const rel of financialRelationships) {
          const matchingEntity = existingEntities?.find(
            e => e.name.toLowerCase() === rel.entityName.toLowerCase()
          )
          relationships.push({
            ...rel,
            entityId: matchingEntity?.id,
          })
        }
      }
    }

    // 3. For for-profits: Check for business relationships via AI
    if (isForProfit) {
      const businessRelationships = await discoverBusinessRelationships(
        organizationName,
        website
      )
      if (businessRelationships) {
        for (const rel of businessRelationships) {
          const matchingEntity = existingEntities?.find(
            e => e.name.toLowerCase() === rel.entityName.toLowerCase()
          )
          relationships.push({
            ...rel,
            entityId: matchingEntity?.id,
          })
        }
      }
    }

    // 4. For government: Check funding relationships via USAspending
    if (isGovernment) {
      const govRelationships = await discoverGovernmentRelationships(organizationName)
      if (govRelationships) {
        for (const rel of govRelationships) {
          const matchingEntity = existingEntities?.find(
            e => e.name.toLowerCase() === rel.entityName.toLowerCase()
          )
          relationships.push({
            ...rel,
            entityId: matchingEntity?.id,
          })
        }
      }
    }

    // Deduplicate relationships by entity name
    const uniqueRelationships = deduplicateRelationships(relationships)

    // Return deduplicated results

    return NextResponse.json({
      success: true,
      relationships: uniqueRelationships,
      totalFound: uniqueRelationships.length,
      matchedInDatabase: uniqueRelationships.filter(r => r.entityId).length,
    })
  } catch (error) {
    console.error("[v0] Relationship discovery error:", error)
    return NextResponse.json(
      { success: false, error: "Relationship discovery failed" },
      { status: 500 }
    )
  }
}

// AI-powered relationship discovery using Perplexity (all entity types)
async function discoverRelationshipsWithAI(
  name: string,
  type: string,
  website?: string,
  existingData?: Record<string, unknown>
): Promise<DiscoveredRelationship[] | null> {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
  
  if (!PERPLEXITY_API_KEY) {
    return null
  }

  // Customize prompt based on entity type
  let relationshipContext = ""
  if (type === "foundation") {
    relationshipContext = `
- Organizations they fund (grantees) - type: "beneficiary", direction: "outgoing"
- Other foundations they collaborate with - type: "partner"
- Nonprofit partners - type: "partner" or "ally"
- Government agencies they work with - type: "partner"`
  } else if (type === "nonprofit") {
    relationshipContext = `
- Foundations/funders that support them - type: "funder", direction: "incoming"
- Peer organizations they collaborate with - type: "partner" or "ally"
- Competing organizations for same funding/audience - type: "competitor"
- Government agencies they work with - type: "partner"`
  } else if (type === "for-profit") {
    relationshipContext = `
- Key business partners and vendors - type: "partner"
- Competitors in their market - type: "competitor"
- Nonprofit organizations they support (CSR) - type: "beneficiary", direction: "outgoing"
- Government agencies they contract with - type: "partner"`
  } else if (type === "government") {
    relationshipContext = `
- Nonprofits they fund or contract with - type: "beneficiary", direction: "outgoing"
- Other government agencies they collaborate with - type: "partner"
- Private contractors - type: "partner"
- Advisory organizations - type: "ally"`
  } else {
    relationshipContext = `
- Partner organizations - type: "partner"
- Allied organizations with similar goals - type: "ally"
- Competing organizations - type: "competitor"
- Funding sources - type: "funder", direction: "incoming"`
  }

  const prompt = `Research the relationships and connections of this organization:

Organization: ${name}
Type: ${type}
Website: ${website || "Not provided"}
${existingData?.partnerships ? `Known partnerships: ${JSON.stringify(existingData.partnerships)}` : ""}

Find and list their key organizational relationships, specifically:
${relationshipContext}

IMPORTANT: Only report relationships you can VERIFY with specific evidence. For each relationship, you MUST provide:
- The specific source (news article, annual report, website page, etc.)
- A URL to the source if available
- The date of the source

Return as JSON array:
{
  "relationships": [
    {
      "entityName": "Full official name of related organization",
      "type": "ally" | "partner" | "competitor" | "adversary" | "neutral" | "funder" | "beneficiary",
      "strength": "weak" | "moderate" | "strong",
      "direction": "outgoing" | "incoming" | "bidirectional",
      "confidence": 0-100 (use 90+ only if you have direct evidence, 70-89 for inferred, below 70 for uncertain),
      "sourceUrl": "URL to the source document or article (REQUIRED if available)",
      "sourceDescription": "Brief description of the evidence source",
      "sourceDate": "Date of the source (YYYY-MM-DD or YYYY if only year known)",
      "notes": "Brief description of the relationship and the evidence"
    }
  ]
}

DO NOT invent or hallucinate relationships. If you cannot find verifiable evidence of a relationship, do not include it.
Only include relationships where you have specific evidence.
Return ONLY valid JSON, no explanatory text.`

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a research assistant that identifies organizational relationships and partnerships. Return structured JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        return_citations: true,
      }),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.log("[v0] Perplexity API key invalid for relationship discovery - skipping AI research")
      } else {
        console.error("[v0] Perplexity API error:", response.status)
      }
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) return null

    // Parse JSON from response
    const parsed = extractJSON(content)
    if (parsed?.relationships && Array.isArray(parsed.relationships)) {
      return parsed.relationships
        // Filter out relationships without citations (likely hallucinated)
        .filter((r: Record<string, unknown>) => {
          const hasEvidence = r.sourceUrl || r.sourceDescription || (r.confidence as number) >= 80
          return hasEvidence
        })
        .map((r: Record<string, unknown>) => ({
          entityName: r.entityName as string,
          type: r.type as DiscoveredRelationship["type"],
          strength: r.strength as DiscoveredRelationship["strength"] || "moderate",
          direction: r.direction as DiscoveredRelationship["direction"] || "bidirectional",
          // Reduce confidence if no URL citation provided
          confidence: r.sourceUrl 
            ? (r.confidence as number) || 70 
            : Math.min((r.confidence as number) || 50, 60),
          source: "ai-research" as const,
          sourceUrl: r.sourceUrl as string | undefined,
          sourceDescription: r.sourceDescription as string | undefined,
          sourceDate: r.sourceDate as string | undefined,
          notes: r.notes as string,
          // Auto-verify only if confidence >= 85 AND has citation URL
          verified: Boolean(r.sourceUrl) && ((r.confidence as number) || 0) >= 85,
        }))
    }

    return null
  } catch (error) {
    console.error("[v0] AI relationship discovery error:", error)
    return null
  }
}

// Check 990 data for funding relationships (foundations and nonprofits)
async function discover990Relationships(
  ein: string,
  organizationName: string
): Promise<DiscoveredRelationship[] | null> {
  // Note: ProPublica API doesn't directly expose Schedule I (grants given)
  // We would need to parse the XML filing or use a different data source
  // For now, use AI to find this information
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return null

  const prompt = `Based on IRS Form 990 public records for EIN ${ein} (${organizationName}), identify:

1. Major funders/donors that support this organization
2. Organizations this entity has funded or given grants to (if it's a foundation)
3. Related organizations listed on Schedule R

Return as JSON:
{
  "relationships": [
    {
      "entityName": "Organization name",
      "type": "funder" or "beneficiary",
      "direction": "incoming" for funders, "outgoing" for grantees,
      "strength": "weak" | "moderate" | "strong",
      "confidence": 0-100,
      "notes": "Grant amount or relationship details if known"
    }
  ]
}

Only include relationships you can verify from public 990 data. Return ONLY valid JSON.`

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
          { role: "system", content: "You are a nonprofit financial analyst with access to IRS 990 data." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    if (parsed?.relationships && Array.isArray(parsed.relationships)) {
      return parsed.relationships.map((r: Record<string, unknown>) => ({
        entityName: r.entityName as string,
        type: r.type as DiscoveredRelationship["type"],
        strength: r.strength as DiscoveredRelationship["strength"] || "moderate",
        direction: r.direction as DiscoveredRelationship["direction"] || "bidirectional",
        // AI-inferred from 990 data - moderate confidence (not directly from structured data)
        confidence: Math.min((r.confidence as number) || 65, 75),
        source: "ai-research" as const,
        sourceUrl: `https://projects.propublica.org/nonprofits/organizations/${ein}`,
        sourceDescription: "AI analysis of IRS Form 990 data",
        notes: r.notes as string,
        // AI-inferred requires human verification
        verified: false,
      }))
    }

    return null
  } catch (error) {
    console.error("[v0] 990 relationship discovery error:", error)
    return null
  }
}

// Discover business relationships for for-profit entities
async function discoverBusinessRelationships(
  companyName: string,
  website?: string
): Promise<DiscoveredRelationship[] | null> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return null

  const prompt = `Research the business relationships for ${companyName}${website ? ` (${website})` : ""}:

Find:
1. Key business partners, vendors, and suppliers
2. Major customers or clients (if B2B)
3. Competitors in their market
4. Subsidiaries or parent companies
5. Joint ventures or strategic alliances

Return as JSON:
{
  "relationships": [
    {
      "entityName": "Company/organization name",
      "type": "partner" | "competitor" | "ally" | "beneficiary",
      "direction": "outgoing" | "incoming" | "bidirectional",
      "strength": "weak" | "moderate" | "strong",
      "confidence": 0-100,
      "notes": "Nature of the business relationship"
    }
  ]
}

Focus on documented, verifiable relationships. Return ONLY valid JSON.`

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
          { role: "system", content: "You are a business analyst researching company relationships." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    if (parsed?.relationships && Array.isArray(parsed.relationships)) {
      return parsed.relationships
        .filter((r: Record<string, unknown>) => r.entityName) // Filter out empty entries
        .map((r: Record<string, unknown>) => ({
          entityName: r.entityName as string,
          type: r.type as DiscoveredRelationship["type"],
          strength: r.strength as DiscoveredRelationship["strength"] || "moderate",
          direction: r.direction as DiscoveredRelationship["direction"] || "bidirectional",
          // AI research without citation - lower confidence
          confidence: Math.min((r.confidence as number) || 50, 65),
          source: "ai-research" as const,
          sourceDescription: "Business Research (AI)",
          notes: r.notes as string,
          // AI without citation - requires human verification
          verified: false,
        }))
    }

    return null
  } catch (error) {
    console.error("[v0] Business relationship discovery error:", error)
    return null
  }
}

// Discover government funding relationships
async function discoverGovernmentRelationships(
  agencyName: string
): Promise<DiscoveredRelationship[] | null> {
  // USAspending spending_by_award endpoint has complex filter requirements
  // that frequently fail. Skip this discovery method to avoid errors.
  // Government relationships are better discovered via AI research.
  return []
}

// Helper to extract JSON from potentially messy response
function extractJSON(content: string): Record<string, unknown> | null {
  if (!content) return null
  
  try {
    return JSON.parse(content)
  } catch {
    // Try to find JSON in markdown code block
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim())
      } catch {
        // Continue
      }
    }
    
    // Try to find balanced braces
    const start = content.indexOf("{")
    const end = content.lastIndexOf("}")
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1))
      } catch {
        // Failed
      }
    }
  }
  
  return null
}

// Deduplicate relationships by entity name, keeping highest confidence
function deduplicateRelationships(
  relationships: DiscoveredRelationship[]
): DiscoveredRelationship[] {
  const map = new Map<string, DiscoveredRelationship>()
  
  for (const rel of relationships) {
    const key = rel.entityName.toLowerCase()
    const existing = map.get(key)
    
    if (!existing || rel.confidence > existing.confidence) {
      map.set(key, rel)
    }
  }
  
  return Array.from(map.values())
}
