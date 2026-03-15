import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PUT - Update candidate selection status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { candidateId, selected, rejected } = body

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 })
    }

    // DB uses status column: pending, selected, rejected
    const updates: Record<string, unknown> = {
      reviewed_at: new Date().toISOString(),
    }

    if (typeof selected === "boolean" && selected) {
      updates.status = "selected"
    }

    if (typeof rejected === "boolean" && rejected) {
      updates.status = "rejected"
    }

    const { data, error } = await supabase
      .from("community_candidates")
      .update(updates)
      .eq("id", candidateId)
      .eq("community_id", communityId)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      communityId: data.community_id,
      name: data.candidate_name,
      type: data.candidate_type,
      reasonForInclusion: data.reason_for_inclusion,
      stakeholderRole: data.stakeholder_role,
      existingEntityId: data.existing_entity_id,
      selected: data.status === "selected",
      rejected: data.status === "rejected",
      quickPreviewData: null,
      createdAt: data.created_at,
      updatedAt: data.reviewed_at,
    })
  } catch (error) {
    console.error("Error updating candidate:", error)
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 })
  }
}

// POST - Process selected candidates (create entities, assign to community)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params
    const supabase = await createClient()

    // Get all selected candidates (status = 'selected')
    const { data: selectedCandidates, error: fetchError } = await supabase
      .from("community_candidates")
      .select("*")
      .eq("community_id", communityId)
      .eq("status", "selected")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!selectedCandidates || selectedCandidates.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No candidates selected",
        processed: 0,
        existingLinked: 0,
        newCreated: 0,
      })
    }

    let existingLinked = 0
    let newCreated = 0
    const entitiesToProcess: string[] = [] // Entity IDs to link

    for (const candidate of selectedCandidates) {
      if (candidate.existing_entity_id) {
        // Entity already exists - just link it
        entitiesToProcess.push(candidate.existing_entity_id)
        existingLinked++
      } else {
        // Need to create a stub entity (full data collection happens separately)
        // Use actual DB column names from entities table
        const { data: newEntity, error: createError } = await supabase
          .from("entities")
          .insert({
            name: candidate.candidate_name,
            type: candidate.candidate_type,
            mission: "",
            // data_sources should be an array to match existing format
            data_sources: [{
              type: "discovery",
              date: new Date().toISOString(),
              confidence: 30, // Low confidence - needs full data collection
            }],
            // Initialize JSONB columns as empty objects to prevent nulls
            financials: {},
            human_resources: {},
            programs: {},
            influence: {},
            relationships: [],
            strategic: {},
            advanced: {},
            data_confidence: { quality_score: 10 }, // Low score - stub entity
          })
          .select()
          .maybeSingle()

        if (createError) {
          console.error("Error creating entity:", createError)
          continue
        }

        if (newEntity) {
          entitiesToProcess.push(newEntity.id)
          newCreated++

          // Update candidate with the new entity ID
          await supabase
            .from("community_candidates")
            .update({ existing_entity_id: newEntity.id })
            .eq("id", candidate.id)
        }
      }
    }

    // Link all entities to the community - use actual DB column names
    // First, get existing links to avoid duplicates
    const { data: existingLinks } = await supabase
      .from("community_entities")
      .select("entity_id")
      .eq("community_id", communityId)

    const existingEntityIds = new Set((existingLinks || []).map(l => l.entity_id))

    // Build a map from entity ID to candidate data for lookup
    // Re-fetch selected candidates to get updated existing_entity_id values
    const { data: updatedCandidates } = await supabase
      .from("community_candidates")
      .select("*")
      .eq("community_id", communityId)
      .eq("status", "selected")

    const candidatesList = updatedCandidates || []
    const entityToCandidateMap = new Map<string, (typeof candidatesList)[number]>()
    for (const candidate of candidatesList) {
      if (candidate.existing_entity_id) {
        entityToCandidateMap.set(candidate.existing_entity_id, candidate)
      }
    }

    const linksToInsert = entitiesToProcess
      .filter(entityId => !existingEntityIds.has(entityId)) // Skip already linked
      .map(entityId => {
        const candidate = entityToCandidateMap.get(entityId)
        return {
          community_id: communityId,
          entity_id: entityId,
          assignment_source: "discovery",
          stakeholder_role: candidate?.stakeholder_role || "unknown",
          reason_for_inclusion: candidate?.reason_for_inclusion || "",
        }
      })

    if (linksToInsert.length > 0) {
      const { error: linkError } = await supabase
        .from("community_entities")
        .insert(linksToInsert)

      if (linkError) {
        console.error("Error linking entities:", linkError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${entitiesToProcess.length} candidates`,
      processed: entitiesToProcess.length,
      existingLinked,
      newCreated,
      entityIds: entitiesToProcess,
    })
  } catch (error) {
    console.error("Error processing candidates:", error)
    return NextResponse.json({ error: "Failed to process candidates" }, { status: 500 })
  }
}
