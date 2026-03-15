import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Get simulation details with all years and responses
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get simulation with community info
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select(`
        *,
        communities (id, name, description, geography, issue_areas),
        simulation_configs (id, name, time_scale, settings)
      `)
      .eq("id", id)
      .single()

    if (simError) {
      return NextResponse.json({ error: simError.message }, { status: 404 })
    }

    // Get all years for this simulation
    const { data: years, error: yearsError } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", id)
      .order("year_number", { ascending: true })

    if (yearsError) {
      return NextResponse.json({ error: yearsError.message }, { status: 500 })
    }

    // Get all responses for this simulation via year IDs
    const yearIds = (years || []).map((y: any) => y.id)
    let responses: any[] = []
    let respError: any = null; // Declare respError variable
    
    if (yearIds.length > 0) {
      const { data: respData, error: tempRespError } = await supabase
        .from("simulation_responses")
        .select(`
          *,
          entities (id, name, type, mission)
        `)
        .in("simulation_year_id", yearIds)
      
      respError = tempRespError; // Assign tempRespError to respError
      if (!respError) {
        responses = respData || []
      }
    }

    // Get coalitions formed
    const { data: coalitions, error: coalError } = await supabase
      .from("simulation_coalitions")
      .select(`
        *,
        simulation_coalition_members (
          entity_id,
          role,
          joined_year,
          entities (id, name, type)
        )
      `)
      .eq("simulation_id", id)

    // Get relationship changes via year IDs
    let relationshipChanges: any[] = []
    if (yearIds.length > 0) {
      const { data: relData } = await supabase
        .from("simulation_relationship_changes")
        .select(`
          *,
          entity_a:entities!simulation_relationship_changes_entity_a_id_fkey (id, name),
          entity_b:entities!simulation_relationship_changes_entity_b_id_fkey (id, name)
        `)
        .in("simulation_year_id", yearIds)
      
      relationshipChanges = relData || []
    }

    // Get final outcomes (no FK to entities - affected_entities is JSONB array)
    const { data: outcomes } = await supabase
      .from("simulation_outcomes")
      .select("*")
      .eq("simulation_id", id)

    // Build a map from year_id to year_number
    const yearIdToNumber: Record<string, number> = {}
    for (const year of years || []) {
      yearIdToNumber[year.id] = year.year_number
    }

    // Group responses by year number
    const responsesByYear: Record<number, typeof responses> = {}
    for (const response of responses || []) {
      const yearNum = yearIdToNumber[response.simulation_year_id] || 0
      if (!responsesByYear[yearNum]) {
        responsesByYear[yearNum] = []
      }
      responsesByYear[yearNum].push(response)
    }

    return NextResponse.json({
      simulation,
      years: years || [],
      responsesByYear,
      coalitions: coalitions || [],
      relationshipChanges: relationshipChanges || [],
      outcomes: outcomes || [],
    })
  } catch (error) {
    console.error("Error fetching simulation:", error)
    return NextResponse.json({ error: "Failed to fetch simulation" }, { status: 500 })
  }
}

// DELETE - Delete a simulation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Delete cascade should handle related records
    const { error } = await supabase
      .from("simulations")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting simulation:", error)
    return NextResponse.json({ error: "Failed to delete simulation" }, { status: 500 })
  }
}
