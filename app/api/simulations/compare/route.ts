import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST - Compare multiple simulation branches
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { simulation_ids, year_number } = body
    const supabase = await createClient()

    if (!simulation_ids || !Array.isArray(simulation_ids) || simulation_ids.length < 2) {
      return NextResponse.json(
        { error: "At least 2 simulation IDs are required" },
        { status: 400 }
      )
    }

    // Get simulation details
    const { data: simulations, error: simError } = await supabase
      .from("simulations")
      .select(`
        id,
        name,
        scenario,
        current_year,
        total_years,
        status,
        branch_probability,
        branched_at_year,
        branch_description,
        parent_simulation_id
      `)
      .in("id", simulation_ids)

    if (simError) {
      return NextResponse.json({ error: simError.message }, { status: 500 })
    }

    // Get year data for comparison
    const yearToCompare = year_number || Math.min(...simulations.map(s => s.current_year))

    const { data: years, error: yearError } = await supabase
      .from("simulation_years")
      .select(`
        id,
        simulation_id,
        year_number,
        year_summary,
        opposition_summary,
        landscape_snapshot,
        recommendations
      `)
      .in("simulation_id", simulation_ids)
      .eq("year_number", yearToCompare)

    if (yearError) {
      return NextResponse.json({ error: yearError.message }, { status: 500 })
    }

    // Get responses for each simulation's year
    const yearIds = years.map(y => y.id)
    const { data: responses, error: respError } = await supabase
      .from("simulation_responses")
      .select(`
        id,
        simulation_year_id,
        entity_id,
        response_type,
        reasoning,
        decision,
        entities (id, name, type)
      `)
      .in("simulation_year_id", yearIds)

    if (respError) {
      return NextResponse.json({ error: respError.message }, { status: 500 })
    }

    // Organize data by simulation
    const comparisonData = simulations.map(sim => {
      const yearData = years.find(y => y.simulation_id === sim.id)
      const yearResponses = responses.filter(r => r.simulation_year_id === yearData?.id)

      // Calculate metrics
      const supportive = yearResponses.filter(r => r.response_type === "supportive").length
      const opposed = yearResponses.filter(r => r.response_type === "opposed").length
      const neutral = yearResponses.filter(r => r.response_type === "neutral" || r.response_type === "cautious").length

      return {
        simulation: {
          id: sim.id,
          name: sim.name,
          scenario: sim.scenario,
          current_year: sim.current_year,
          total_years: sim.total_years,
          status: sim.status,
          branch_probability: sim.branch_probability,
          branched_at_year: sim.branched_at_year,
          branch_description: sim.branch_description,
        },
        year_data: yearData ? {
          year_number: yearData.year_number,
          year_summary: yearData.year_summary,
          opposition_summary: yearData.opposition_summary,
          landscape_snapshot: yearData.landscape_snapshot,
          recommendations: yearData.recommendations,
        } : null,
        metrics: {
          supportive,
          opposed,
          neutral,
          total: yearResponses.length,
          support_ratio: yearResponses.length > 0 ? (supportive / yearResponses.length) : 0,
        },
        entity_responses: yearResponses.map(r => ({
          entity_id: r.entity_id,
          entity_name: (r.entities as any)?.name || "Unknown",
          response_type: r.response_type,
          reasoning: r.reasoning,
          decision: r.decision,
        })),
      }
    })

    // Calculate divergence analysis
    const divergenceAnalysis = analyzeDisvergence(comparisonData)

    return NextResponse.json({
      year_compared: yearToCompare,
      branches: comparisonData,
      divergence: divergenceAnalysis,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to analyze divergence between branches
function analyzeDisvergence(branches: any[]) {
  if (branches.length < 2) return null

  // Find entities that responded differently across branches
  const entityResponses: Record<string, Record<string, string>> = {}

  for (const branch of branches) {
    for (const response of branch.entity_responses) {
      if (!entityResponses[response.entity_id]) {
        entityResponses[response.entity_id] = {}
      }
      entityResponses[response.entity_id][branch.simulation.id] = response.response_type
    }
  }

  const divergentEntities = []
  const consistentEntities = []

  for (const [entityId, responses] of Object.entries(entityResponses)) {
    const responseTypes = Object.values(responses)
    const uniqueResponses = new Set(responseTypes)

    const entityName = branches[0].entity_responses.find(
      (r: any) => r.entity_id === entityId
    )?.entity_name || "Unknown"

    if (uniqueResponses.size > 1) {
      divergentEntities.push({
        entity_id: entityId,
        entity_name: entityName,
        responses: responses,
      })
    } else {
      consistentEntities.push({
        entity_id: entityId,
        entity_name: entityName,
        response: responseTypes[0],
      })
    }
  }

  // Calculate probability comparison
  const probabilityComparison = branches.map(b => ({
    simulation_id: b.simulation.id,
    simulation_name: b.simulation.name,
    probability: b.simulation.branch_probability || 0,
  })).sort((a, b) => (b.probability || 0) - (a.probability || 0))

  return {
    divergent_entities: divergentEntities,
    consistent_entities: consistentEntities,
    divergence_rate: divergentEntities.length / (divergentEntities.length + consistentEntities.length) || 0,
    probability_ranking: probabilityComparison,
  }
}
