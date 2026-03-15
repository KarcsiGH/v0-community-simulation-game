import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - List all simulations
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get("communityId")

    let query = supabase
      .from("simulations")
      .select(`
        *,
        communities (id, name),
        simulation_configs (id, name, time_scale)
      `)
      .order("created_at", { ascending: false })

    if (communityId) {
      query = query.eq("community_id", communityId)
    }

    const { data: simulations, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ simulations })
  } catch (error) {
    console.error("Error fetching simulations:", error)
    return NextResponse.json({ error: "Failed to fetch simulations" }, { status: 500 })
  }
}

// POST - Create a new simulation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      communityId,
      configId,
      scenario,
      durationYears = 5,
      startingYear = new Date().getFullYear(),
    } = body

    if (!name || !communityId || !scenario) {
      return NextResponse.json(
        { error: "Missing required fields: name, communityId, scenario" },
        { status: 400 }
      )
    }

    // Create the simulation
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .insert({
        name,
        community_id: communityId,
        config_id: configId || null,
        scenario: scenario,
        total_years: durationYears,
        current_year: 0,
        status: "draft",
        parameters: {
          starting_year: startingYear,
          ai_model: "openai/gpt-4o",
          interaction_depth: "detailed",
        },
      })
      .select()
      .single()

    if (simError) {
      return NextResponse.json({ error: simError.message }, { status: 500 })
    }

    // Create year records for each year of the simulation
    const yearRecords = []
    for (let i = 0; i < durationYears; i++) {
      yearRecords.push({
        simulation_id: simulation.id,
        year_number: i + 1,
        status: i === 0 ? "pending" : "future",
        year_scenario: `Year ${i + 1} of simulation (Calendar: ${startingYear + i})`,
        year_summary: null,
        metrics: {},
      })
    }

    const { error: yearsError } = await supabase
      .from("simulation_years")
      .insert(yearRecords)

    if (yearsError) {
      // Rollback simulation creation
      await supabase.from("simulations").delete().eq("id", simulation.id)
      return NextResponse.json({ error: yearsError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      simulation,
    })
  } catch (error) {
    console.error("Error creating simulation:", error)
    return NextResponse.json({ error: "Failed to create simulation" }, { status: 500 })
  }
}
