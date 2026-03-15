import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST - Submit a manual response for an entity
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { entityId, content, reasoning, sentiment, actions, engagementLevel } = body

    if (!entityId || !content) {
      return NextResponse.json(
        { error: "entityId and content are required" },
        { status: 400 }
      )
    }

    // Get simulation
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("*")
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get or create the year record for the next year
    const yearToProcess = simulation.current_year + 1
    let { data: yearRecord } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", simulationId)
      .eq("year_number", yearToProcess)
      .maybeSingle()

    // Create the year record if it doesn't exist
    if (!yearRecord) {
      const { data: newYear, error: createError } = await supabase
        .from("simulation_years")
        .insert({
          simulation_id: simulationId,
          year_number: yearToProcess,
          status: "pending",
        })
        .select()
        .single()
      
      if (createError || !newYear) {
        return NextResponse.json(
          { error: `Failed to create year ${yearToProcess}` },
          { status: 500 }
        )
      }
      yearRecord = newYear
    }

    // Upsert the manual response
    const { data: response, error: respError } = await supabase
      .from("simulation_responses")
      .upsert({
        simulation_year_id: yearRecord.id,
        entity_id: entityId,
        response_type: sentiment || "neutral",
        content,
        reasoning: reasoning || "User-provided response",
        decision: {
          summary: reasoning || "User-provided response",
          actions: actions || [],
          engagement_level: engagementLevel || "medium",
          is_manual: true, // Flag to indicate this was manually entered
        },
        confidence: 1.0, // User input is 100% confident
        influenced_by: [],
      }, {
        onConflict: "simulation_year_id,entity_id,response_type",
      })
      .select()
      .single()

    if (respError) {
      return NextResponse.json({ error: respError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      response,
      message: `Manual response saved for year ${yearToProcess}`,
    })

  } catch (error) {
    console.error("Manual response error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save response" },
      { status: 500 }
    )
  }
}

// GET - Get all manual responses for a simulation's pending year
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()

  try {
    // Get simulation
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("*")
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get the year record for the next year
    const yearToProcess = simulation.current_year + 1
    const { data: yearRecord } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", simulationId)
      .eq("year_number", yearToProcess)
      .maybeSingle()

    if (!yearRecord) {
      return NextResponse.json({ manualResponses: [], yearNumber: yearToProcess })
    }

    // Get any existing responses for this year (manual ones)
    const { data: responses, error: respError } = await supabase
      .from("simulation_responses")
      .select(`
        *,
        entities (id, name, type)
      `)
      .eq("simulation_year_id", yearRecord.id)

    if (respError) {
      return NextResponse.json({ error: respError.message }, { status: 500 })
    }

    // Filter to only manual responses
    const manualResponses = (responses || []).filter(
      r => r.decision?.is_manual === true
    )

    return NextResponse.json({
      manualResponses,
      yearNumber: yearToProcess,
      yearId: yearRecord.id,
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get responses" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a manual response
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()

  try {
    const { searchParams } = new URL(request.url)
    const responseId = searchParams.get("responseId")

    if (!responseId) {
      return NextResponse.json({ error: "responseId is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("simulation_responses")
      .delete()
      .eq("id", responseId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete response" },
      { status: 500 }
    )
  }
}
