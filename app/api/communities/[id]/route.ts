import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Community } from "@/lib/entity-types"

// GET single community with entities
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get community
    const { data: communityData, error: communityError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (communityError) {
      return NextResponse.json({ error: communityError.message }, { status: 500 })
    }

    if (!communityData) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 })
    }

    // Get entities in this community - use actual DB column names
    const { data: entityLinks, error: linksError } = await supabase
      .from("community_entities")
      .select(`
        entity_id,
        created_at,
        assignment_source,
        stakeholder_role,
        reason_for_inclusion,
        entities (*)
      `)
      .eq("community_id", id)

    if (linksError) {
      console.error("Error fetching community entities:", linksError)
    }

    // Get candidates for this community - use actual DB column names
    const { data: candidates, error: candidatesError } = await supabase
      .from("community_candidates")
      .select("*")
      .eq("community_id", id)
      .order("created_at", { ascending: false })

    if (candidatesError) {
      console.error("Error fetching candidates:", candidatesError)
    }

    const community: Community = {
      id: communityData.id,
      name: communityData.name,
      description: communityData.description,
      geography: Array.isArray(communityData.geography) ? communityData.geography.join(", ") : communityData.geography || "",
      issueAreas: communityData.issue_areas || [],
      criteria: communityData.custom_criteria?.text || undefined,
      focalEntityId: communityData.focal_entity_id,
      createdAt: communityData.created_at,
      updatedAt: communityData.updated_at,
    }

    return NextResponse.json({
      community,
      entities: (entityLinks || []).map((link) => {
        // Transform the raw DB entity to a simplified format for display
        const rawEntity = link.entities as Record<string, unknown> | null
        const dataConfidence = rawEntity?.data_confidence as Record<string, unknown> | null
        return {
          entity_id: link.entity_id,
          role: link.stakeholder_role,
          entities: rawEntity ? {
            id: rawEntity.id,
            name: rawEntity.name,
            type: rawEntity.type,
            mission: rawEntity.mission,
            website: rawEntity.website,
            dataQualityScore: dataConfidence?.quality_score as number | undefined,
          } : null,
        }
      }),
      candidates: (candidates || []).map((c) => ({
        id: c.id,
        communityId: c.community_id,
        name: c.candidate_name,
        type: c.candidate_type,
        reasonForInclusion: c.reason_for_inclusion,
        stakeholderRole: c.stakeholder_role,
        existingEntityId: c.existing_entity_id,
        selected: c.status === "selected",
        rejected: c.status === "rejected",
        quickPreviewData: null, // Not in schema
        createdAt: c.created_at,
        updatedAt: c.reviewed_at,
      })),
    })
  } catch (error) {
    console.error("Error fetching community:", error)
    return NextResponse.json({ error: "Failed to fetch community" }, { status: 500 })
  }
}

// PUT update community
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const dbCommunity = {
      name: body.name,
      description: body.description,
      geography: body.geography ? (Array.isArray(body.geography) ? body.geography : [body.geography]) : [],
      issue_areas: body.issueAreas || [],
      custom_criteria: body.criteria ? { text: body.criteria } : null,
      focal_entity_id: body.focalEntityId || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("communities")
      .update(dbCommunity)
      .eq("id", id)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 })
    }

    const community: Community = {
      id: data.id,
      name: data.name,
      description: data.description,
      geography: Array.isArray(data.geography) ? data.geography.join(", ") : data.geography || "",
      issueAreas: data.issue_areas || [],
      criteria: data.custom_criteria?.text || undefined,
      focalEntityId: data.focal_entity_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json(community)
  } catch (error) {
    console.error("Error updating community:", error)
    return NextResponse.json({ error: "Failed to update community" }, { status: 500 })
  }
}

// DELETE community
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting community:", error)
    return NextResponse.json({ error: "Failed to delete community" }, { status: 500 })
  }
}
