import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()

  try {
    const { branchAtYear, description, alternativeScenario } = await request.json()

    // Get the original simulation
    const { data: original, error: origError } = await supabase
      .from("simulations")
      .select("*")
      .eq("id", simulationId)
      .single()

    if (origError || !original) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Validate branch point
    if (branchAtYear < 1 || branchAtYear > original.current_year) {
      return NextResponse.json(
        { error: "Can only branch from a completed year" },
        { status: 400 }
      )
    }

    // Create the branched simulation
    const { data: branch, error: branchError } = await supabase
      .from("simulations")
      .insert({
        name: `${original.name} (Branch at Year ${branchAtYear})`,
        community_id: original.community_id,
        config_id: original.config_id,
        scenario: alternativeScenario || original.scenario,
        total_years: original.total_years,
        current_year: branchAtYear,
        status: "running",
        parameters: original.parameters,
        starting_conditions: original.starting_conditions,
        parent_simulation_id: simulationId,
        branched_at_year: branchAtYear,
        branch_description: description || `Alternative path from Year ${branchAtYear}`,
      })
      .select()
      .single()

    if (branchError) {
      console.error("Error creating branch:", branchError)
      return NextResponse.json({ error: branchError.message }, { status: 500 })
    }

    // Get the years from the original up to the branch point
    const { data: originalYears, error: yearsError } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", simulationId)
      .lte("year_number", branchAtYear)
      .order("year_number", { ascending: true })

    if (yearsError) {
      console.error("Error fetching years:", yearsError)
      return NextResponse.json({ error: yearsError.message }, { status: 500 })
    }

    // Create year records for the branch - copy completed years, create pending for future
    const branchYears = []
    
    // First, copy completed years (up to branch point)
    for (const year of originalYears || []) {
      branchYears.push({
        simulation_id: branch.id,
        year_number: year.year_number,
        status: year.status,
        year_scenario: year.year_scenario,
        year_summary: year.year_summary,
        metrics: year.metrics,
        opposition_summary: year.opposition_summary,
        landscape_snapshot: year.landscape_snapshot,
        recommendations: year.recommendations,
        completed_at: year.completed_at,
      })
    }

    // Then add pending years for the rest
    for (let i = branchAtYear + 1; i <= original.total_years; i++) {
      branchYears.push({
        simulation_id: branch.id,
        year_number: i,
        status: "pending",
        year_scenario: null,
        year_summary: null,
        metrics: {},
      })
    }

    const { data: insertedYears, error: insertYearsError } = await supabase
      .from("simulation_years")
      .insert(branchYears)
      .select()

    if (insertYearsError) {
      console.error("Error inserting years:", insertYearsError)
      return NextResponse.json({ error: insertYearsError.message }, { status: 500 })
    }

    // Create a map from original year_number to new year id
    const yearIdMap: Record<number, string> = {}
    for (const year of insertedYears || []) {
      yearIdMap[year.year_number] = year.id
    }

    // Copy responses for completed years
    for (const origYear of originalYears || []) {
      if (origYear.status !== "completed") continue

      const { data: origResponses } = await supabase
        .from("simulation_responses")
        .select("*")
        .eq("simulation_year_id", origYear.id)

      if (origResponses && origResponses.length > 0) {
        const copiedResponses = origResponses.map(r => ({
          simulation_year_id: yearIdMap[origYear.year_number],
          entity_id: r.entity_id,
          response_type: r.response_type,
          content: r.content,
          reasoning: r.reasoning,
          decision: r.decision,
          confidence: r.confidence,
          influenced_by: r.influenced_by,
        }))

        await supabase.from("simulation_responses").insert(copiedResponses)
      }
    }

    return NextResponse.json({
      success: true,
      branch: {
        id: branch.id,
        name: branch.name,
        branchedAtYear: branchAtYear,
        description: branch.branch_description,
      },
    })
  } catch (error) {
    console.error("Error branching simulation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to branch simulation" },
      { status: 500 }
    )
  }
}

// GET - List all branches of a simulation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simulationId } = await params
  const supabase = await createClient()

  try {
    // Get direct children branches
    const { data: branches, error } = await supabase
      .from("simulations")
      .select(`
        id,
        name,
        scenario,
        status,
        current_year,
        total_years,
        branched_at_year,
        branch_description,
        parent_simulation_id,
        created_at
      `)
      .eq("parent_simulation_id", simulationId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get the parent if this is a branch
    const { data: simulation } = await supabase
      .from("simulations")
      .select(`
        parent_simulation_id,
        branched_at_year,
        branch_description
      `)
      .eq("id", simulationId)
      .single()

    let parent = null
    if (simulation?.parent_simulation_id) {
      const { data: parentData } = await supabase
        .from("simulations")
        .select("id, name, current_year, total_years, status, created_at")
        .eq("id", simulation.parent_simulation_id)
        .single()
      
      parent = parentData ? {
        ...parentData,
        branchedAtYear: simulation.branched_at_year,
      } : null
    }

    return NextResponse.json({
      branches: branches || [],
      parent,
      isBranch: !!simulation?.parent_simulation_id,
    })
  } catch (error) {
    console.error("Error fetching branches:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branches" },
      { status: 500 }
    )
  }
}
