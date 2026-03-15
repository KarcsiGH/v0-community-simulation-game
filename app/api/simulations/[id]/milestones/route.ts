import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - List all milestones for a simulation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const supabase = await createClient()

    const { data: milestones, error } = await supabase
      .from("simulation_milestones")
      .select("*")
      .eq("simulation_id", simulationId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(milestones || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new milestone
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { name, description, milestone_type, target_value, target_numeric, weight } = body

    if (!name || !milestone_type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      )
    }

    const { data: milestone, error } = await supabase
      .from("simulation_milestones")
      .insert({
        simulation_id: simulationId,
        name,
        description: description || "",
        milestone_type,
        target_value: target_value || "",
        target_numeric: target_numeric || 0,
        current_value: "",
        current_numeric: 0,
        weight: weight || 1.0,
        status: "not_started",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(milestone)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove a milestone
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get("milestoneId")
    const supabase = await createClient()

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("simulation_milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("simulation_id", simulationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update milestone
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const body = await request.json()
    const { milestoneId, ...updates } = body
    const supabase = await createClient()

    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID required" }, { status: 400 })
    }

    const { data: milestone, error } = await supabase
      .from("simulation_milestones")
      .update(updates)
      .eq("id", milestoneId)
      .eq("simulation_id", simulationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(milestone)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
