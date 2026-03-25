import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { simulation_id } = body

    // Get community entities
    const { data: communityEntities, error: ceError } = await supabase
      .from("community_entities")
      .select(`
        entity_id,
        stakeholder_role,
        engagement_level,
        entities (
          id,
          name,
          type,
          mission,
          resources,
          relationships
        )
      `)
      .eq("community_id", id)

    if (ceError) {
      return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 })
    }

    // Get relationships
    const { data: relationships } = await supabase
      .from("entity_relationships")
      .select("*")
      .or(`source_entity_id.in.(${communityEntities?.map(e => e.entity_id).join(",")}),target_entity_id.in.(${communityEntities?.map(e => e.entity_id).join(",")})`)

    // Get simulation responses if simulation_id provided
    let responses: any[] = []
    if (simulation_id) {
      const { data: simResponses } = await supabase
        .from("entity_responses")
        .select("entity_id, response_type, confidence")
        .eq("simulation_id", simulation_id)
      responses = simResponses || []
    }

    // Use AI to analyze stakeholders
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are a stakeholder analysis expert. Analyze community entities and their relationships to generate:
1. Power/Interest mapping for each stakeholder
2. Influence networks
3. Coalition opportunities
4. Opposition group analysis

Return as JSON with this structure:
{
  "stakeholders": [{
    "id": "entity_id",
    "name": "entity name",
    "type": "entity type",
    "power": number (0-100),
    "interest": number (0-100),
    "position": "supporter" | "opponent" | "neutral" | "swing",
    "influence": number (0-100),
    "influencedBy": ["entity names"],
    "influences": ["entity names"],
    "coalitionPotential": number (0-100),
    "resources": number (0-100),
    "decisionMakingPower": number (0-100)
  }],
  "coalitions": [{
    "id": "coalition_id",
    "name": "coalition name",
    "members": ["entity names"],
    "strength": number (0-100),
    "feasibility": number (0-100),
    "barriers": ["barrier1"],
    "enablers": ["enabler1"],
    "type": "existing" | "potential" | "recommended"
  }],
  "oppositionGroups": [{
    "id": "group_id",
    "name": "group name",
    "members": ["entity names"],
    "strength": number (0-100),
    "cohesion": number (0-100),
    "strategies": ["likely strategy"],
    "vulnerabilities": ["vulnerability"],
    "counterStrategies": ["recommended counter"]
  }]
}`,
      prompt: `Analyze these community stakeholders:

Entities:
${communityEntities?.map(ce => `
- ${ce.entities?.name} (${ce.entities?.type})
  Role: ${ce.stakeholder_role}
  Engagement: ${ce.engagement_level}
  Mission: ${ce.entities?.mission}
  Resources: ${JSON.stringify(ce.entities?.resources || {})}
`).join("\n")}

Relationships:
${relationships?.map(r => `- ${r.source_entity_id} -> ${r.target_entity_id}: ${r.relationship_type} (strength: ${r.strength})`).join("\n") || "No relationships defined"}

${responses.length > 0 ? `
Simulation Responses:
${responses.map(r => `- Entity ${r.entity_id}: ${r.response_type} (confidence: ${r.confidence})`).join("\n")}
` : ""}

Analyze:
1. Power and interest levels for each entity
2. Who influences whom
3. Potential coalitions (existing, potential, and recommended)
4. Opposition groups and counter-strategies

Return ONLY the JSON object, no other text.`,
    })

    // Parse AI response
    let analysis
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      // Generate basic analysis if parsing fails
      analysis = {
        stakeholders: communityEntities?.map(ce => ({
          id: ce.entity_id,
          name: ce.entities?.name || "Unknown",
          type: ce.entities?.type || "organization",
          power: 50,
          interest: ce.engagement_level === "high" ? 80 : ce.engagement_level === "medium" ? 50 : 30,
          position: responses.find(r => r.entity_id === ce.entity_id)?.response_type === "supportive" ? "supporter" :
                   responses.find(r => r.entity_id === ce.entity_id)?.response_type === "opposed" ? "opponent" : "neutral",
          influence: 50,
          influencedBy: [],
          influences: [],
          coalitionPotential: 50,
          resources: 50,
          decisionMakingPower: ce.stakeholder_role === "decision_maker" ? 80 : 40
        })) || [],
        coalitions: [],
        oppositionGroups: []
      }
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Stakeholder analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
