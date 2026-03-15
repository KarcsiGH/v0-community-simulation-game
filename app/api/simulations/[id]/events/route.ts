import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - List all events for a simulation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const supabase = await createClient()

    const { data: events, error } = await supabase
      .from("simulation_events")
      .select("*")
      .eq("simulation_id", simulationId)
      .order("year_number", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(events || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new event
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { title, description, event_type, year_number, affected_entities, impact_level } = body

    if (!title || !event_type || !year_number) {
      return NextResponse.json(
        { error: "Title, event type, and year number are required" },
        { status: 400 }
      )
    }

    // Verify simulation exists and year is valid
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("current_year, total_years")
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    if (year_number <= simulation.current_year) {
      return NextResponse.json(
        { error: "Cannot inject events into past or current years" },
        { status: 400 }
      )
    }

    if (year_number > simulation.total_years) {
      return NextResponse.json(
        { error: "Year number exceeds simulation total years" },
        { status: 400 }
      )
    }

    const { data: event, error } = await supabase
      .from("simulation_events")
      .insert({
        simulation_id: simulationId,
        year_number,
        event_type,
        title,
        description: description || "",
        affected_entities: affected_entities || [],
        impact_level: impact_level || "moderate",
        is_processed: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove an event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const supabase = await createClient()

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("simulation_events")
      .delete()
      .eq("id", eventId)
      .eq("simulation_id", simulationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update event (toggle processed status or update details)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const body = await request.json()
    const { eventId, is_processed, ...updates } = body
    const supabase = await createClient()

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...updates }
    if (typeof is_processed === "boolean") {
      updateData.is_processed = is_processed
      if (is_processed) {
        updateData.processed_at = new Date().toISOString()
      }
    }

    const { data: event, error } = await supabase
      .from("simulation_events")
      .update(updateData)
      .eq("id", eventId)
      .eq("simulation_id", simulationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
