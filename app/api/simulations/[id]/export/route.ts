import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Export simulation data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"
    const includeChildren = searchParams.get("includeChildren") === "true"
    const supabase = await createClient()

    // Get simulation with all related data
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select(`
        *,
        communities (
          id,
          name,
          description,
          geography,
          issue_areas
        )
      `)
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get all years with responses
    const { data: years, error: yearsError } = await supabase
      .from("simulation_years")
      .select(`
        *,
        simulation_responses (
          *,
          entities (id, name, type, mission)
        )
      `)
      .eq("simulation_id", simulationId)
      .order("year_number", { ascending: true })

    if (yearsError) {
      return NextResponse.json({ error: yearsError.message }, { status: 500 })
    }

    // Get milestones
    const { data: milestones } = await supabase
      .from("simulation_milestones")
      .select("*")
      .eq("simulation_id", simulationId)

    // Get events
    const { data: events } = await supabase
      .from("simulation_events")
      .select("*")
      .eq("simulation_id", simulationId)

    // Get coalitions
    const { data: coalitions } = await supabase
      .from("simulation_coalitions")
      .select(`
        *,
        simulation_coalition_members (
          *,
          entities (id, name)
        )
      `)
      .eq("simulation_id", simulationId)

    // Get relationship changes
    const { data: relationshipChanges } = await supabase
      .from("simulation_relationship_changes")
      .select(`
        *,
        entity_1:entities!simulation_relationship_changes_entity_1_id_fkey (id, name),
        entity_2:entities!simulation_relationship_changes_entity_2_id_fkey (id, name)
      `)
      .eq("simulation_id", simulationId)

    // Get resource commitments
    const { data: resourceCommitments } = await supabase
      .from("simulation_resource_commitments")
      .select(`
        *,
        entities (id, name)
      `)
      .eq("simulation_id", simulationId)

    // Get child branches if requested
    let branches: any[] = []
    if (includeChildren) {
      const { data: childBranches } = await supabase
        .from("simulations")
        .select("id, name, branched_at_year, branch_description, branch_probability, status")
        .eq("parent_simulation_id", simulationId)

      branches = childBranches || []
    }

    // Build export object
    const exportData = {
      meta: {
        exported_at: new Date().toISOString(),
        simulation_id: simulationId,
        simulation_name: simulation.name,
        export_format: format,
      },
      simulation: {
        id: simulation.id,
        name: simulation.name,
        scenario: simulation.scenario,
        status: simulation.status,
        current_year: simulation.current_year,
        total_years: simulation.total_years,
        branch_probability: simulation.branch_probability,
        created_at: simulation.created_at,
        parameters: simulation.parameters,
        starting_conditions: simulation.starting_conditions,
      },
      community: simulation.communities,
      years: (years || []).map(year => ({
        year_number: year.year_number,
        status: year.status,
        year_summary: year.year_summary,
        opposition_summary: year.opposition_summary,
        landscape_snapshot: year.landscape_snapshot,
        recommendations: year.recommendations,
        completed_at: year.completed_at,
        entity_responses: (year.simulation_responses || []).map((r: any) => ({
          entity: r.entities?.name || "Unknown",
          response_type: r.response_type,
          reasoning: r.reasoning,
          decision: r.decision,
          content: r.content,
        })),
      })),
      milestones: milestones || [],
      events: events || [],
      coalitions: (coalitions || []).map(c => ({
        ...c,
        members: (c.simulation_coalition_members || []).map((m: any) => ({
          entity_name: m.entities?.name,
          role: m.role,
          joined_year: m.joined_year,
        })),
      })),
      relationship_changes: (relationshipChanges || []).map(rc => ({
        year: rc.year_number,
        entity_1: (rc.entity_1 as any)?.name,
        entity_2: (rc.entity_2 as any)?.name,
        change_type: rc.change_type,
        description: rc.change_description,
      })),
      resource_commitments: (resourceCommitments || []).map(rc => ({
        year: rc.year_number,
        entity: (rc.entities as any)?.name,
        type: rc.resource_type,
        amount: rc.amount,
        description: rc.description,
        purpose: rc.purpose,
      })),
      branches: branches,
    }

    if (format === "markdown") {
      const markdown = generateMarkdownReport(exportData)
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${simulation.name.replace(/[^a-z0-9]/gi, '_')}_report.md"`,
        },
      })
    }

    if (format === "executive") {
      const executive = generateExecutiveSummary(exportData)
      return new NextResponse(executive, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${simulation.name.replace(/[^a-z0-9]/gi, '_')}_executive_summary.md"`,
        },
      })
    }

    return NextResponse.json(exportData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Generate full markdown report
function generateMarkdownReport(data: any): string {
  let md = `# Simulation Report: ${data.simulation.name}\n\n`
  md += `**Exported:** ${new Date(data.meta.exported_at).toLocaleString()}\n\n`
  md += `**Status:** ${data.simulation.status}\n`
  md += `**Progress:** Year ${data.simulation.current_year} of ${data.simulation.total_years}\n`
  if (data.simulation.branch_probability) {
    md += `**Success Probability:** ${Math.round(data.simulation.branch_probability * 100)}%\n`
  }
  md += `\n---\n\n`

  // Scenario
  md += `## Scenario\n\n${data.simulation.scenario}\n\n`

  // Community Context
  if (data.community) {
    md += `## Community: ${data.community.name}\n\n`
    if (data.community.description) md += `${data.community.description}\n\n`
    if (data.community.geography) md += `**Geography:** ${Array.isArray(data.community.geography) ? data.community.geography.join(", ") : data.community.geography}\n\n`
  }

  // Milestones
  if (data.milestones?.length > 0) {
    md += `## Success Milestones\n\n`
    for (const m of data.milestones) {
      const status = m.status === "achieved" ? "[x]" : "[ ]"
      md += `- ${status} **${m.title}**: ${m.success_criteria}\n`
      if (m.target_value > 0) {
        md += `  - Progress: ${m.current_value} / ${m.target_value}\n`
      }
    }
    md += `\n`
  }

  // Year-by-Year Analysis
  md += `## Year-by-Year Analysis\n\n`
  for (const year of data.years) {
    md += `### Year ${year.year_number}\n\n`
    
    if (year.year_summary) {
      md += `#### Summary\n\n${year.year_summary}\n\n`
    }

    // Opposition Analysis
    if (year.opposition_summary?.narrative_summary) {
      md += `#### Opposition Analysis\n\n${year.opposition_summary.narrative_summary}\n\n`
      if (year.opposition_summary.opposition_strength) {
        md += `**Opposition Strength:** ${year.opposition_summary.opposition_strength}\n\n`
      }
    }

    // Landscape
    if (year.landscape_snapshot?.narrative_summary) {
      md += `#### Landscape\n\n${year.landscape_snapshot.narrative_summary}\n\n`
      if (year.landscape_snapshot.momentum) {
        md += `**Momentum:** ${year.landscape_snapshot.momentum.direction} (${Math.round((year.landscape_snapshot.momentum.confidence || 0) * 100)}% confidence)\n\n`
      }
    }

    // Recommendations
    if (year.recommendations?.narrative_summary) {
      md += `#### Strategic Recommendations\n\n${year.recommendations.narrative_summary}\n\n`
      
      if (year.recommendations.for_focal_entity?.immediate_actions?.length > 0) {
        md += `**Immediate Actions:**\n`
        for (const action of year.recommendations.for_focal_entity.immediate_actions) {
          md += `- ${action}\n`
        }
        md += `\n`
      }

      if (year.recommendations.watch_items?.length > 0) {
        md += `**Watch Items:**\n`
        for (const item of year.recommendations.watch_items) {
          md += `- ${item}\n`
        }
        md += `\n`
      }
    }

    // Entity Responses
    if (year.entity_responses?.length > 0) {
      md += `#### Entity Responses\n\n`
      md += `| Entity | Stance | Summary |\n`
      md += `|--------|--------|----------|\n`
      for (const r of year.entity_responses) {
        const reasoning = (r.reasoning || "").substring(0, 100).replace(/\|/g, "-")
        md += `| ${r.entity} | ${r.response_type} | ${reasoning}... |\n`
      }
      md += `\n`
    }

    md += `---\n\n`
  }

  // Coalitions
  if (data.coalitions?.length > 0) {
    md += `## Coalitions Formed\n\n`
    for (const c of data.coalitions) {
      md += `### ${c.name}\n`
      md += `**Purpose:** ${c.purpose}\n`
      md += `**Formed:** Year ${c.formed_year}\n`
      md += `**Members:** ${c.members?.map((m: any) => m.entity_name).join(", ")}\n\n`
    }
  }

  // Resource Commitments
  if (data.resource_commitments?.length > 0) {
    md += `## Resource Commitments\n\n`
    md += `| Year | Entity | Type | Amount | Purpose |\n`
    md += `|------|--------|------|--------|----------|\n`
    for (const rc of data.resource_commitments) {
      md += `| ${rc.year} | ${rc.entity} | ${rc.type} | ${rc.amount} | ${rc.purpose?.substring(0, 50)}... |\n`
    }
    md += `\n`
  }

  // Branches
  if (data.branches?.length > 0) {
    md += `## Branch Simulations\n\n`
    for (const b of data.branches) {
      md += `- **${b.name}** (branched at Year ${b.branched_at_year})\n`
      if (b.branch_description) md += `  - ${b.branch_description}\n`
      if (b.branch_probability) md += `  - Probability: ${Math.round(b.branch_probability * 100)}%\n`
    }
  }

  return md
}

// Generate executive summary
function generateExecutiveSummary(data: any): string {
  let md = `# Executive Summary: ${data.simulation.name}\n\n`
  md += `**Date:** ${new Date(data.meta.exported_at).toLocaleDateString()}\n\n`

  // Key Metrics
  md += `## Key Metrics\n\n`
  md += `- **Simulation Status:** ${data.simulation.status}\n`
  md += `- **Progress:** Year ${data.simulation.current_year} of ${data.simulation.total_years}\n`
  if (data.simulation.branch_probability) {
    md += `- **Estimated Success Probability:** ${Math.round(data.simulation.branch_probability * 100)}%\n`
  }
  md += `\n`

  // Milestone Progress
  if (data.milestones?.length > 0) {
    const achieved = data.milestones.filter((m: any) => m.status === "achieved").length
    md += `- **Milestones Achieved:** ${achieved} of ${data.milestones.length}\n\n`
  }

  // Scenario Overview
  md += `## Scenario\n\n${data.simulation.scenario}\n\n`

  // Latest Year Recommendations
  const latestYear = data.years[data.years.length - 1]
  if (latestYear?.recommendations) {
    md += `## Current Recommendations (Year ${latestYear.year_number})\n\n`
    md += `${latestYear.recommendations.narrative_summary || "No recommendations available."}\n\n`

    if (latestYear.recommendations.for_focal_entity?.immediate_actions?.length > 0) {
      md += `### Priority Actions\n\n`
      for (const action of latestYear.recommendations.for_focal_entity.immediate_actions.slice(0, 5)) {
        md += `1. ${action}\n`
      }
      md += `\n`
    }

    if (latestYear.recommendations.confidence_assessment) {
      md += `### Assessment\n\n`
      md += `- **Success Likelihood:** ${latestYear.recommendations.confidence_assessment.success_likelihood}\n`
      if (latestYear.recommendations.confidence_assessment.best_case) {
        md += `- **Best Case:** ${latestYear.recommendations.confidence_assessment.best_case}\n`
      }
      if (latestYear.recommendations.confidence_assessment.worst_case) {
        md += `- **Worst Case:** ${latestYear.recommendations.confidence_assessment.worst_case}\n`
      }
    }
  }

  // Key Risks
  if (latestYear?.recommendations?.for_focal_entity?.risks_to_mitigate?.length > 0) {
    md += `\n## Key Risks\n\n`
    for (const risk of latestYear.recommendations.for_focal_entity.risks_to_mitigate) {
      md += `- ${risk}\n`
    }
  }

  // Opportunities
  if (latestYear?.recommendations?.for_focal_entity?.opportunities_to_pursue?.length > 0) {
    md += `\n## Opportunities\n\n`
    for (const opp of latestYear.recommendations.for_focal_entity.opportunities_to_pursue) {
      md += `- ${opp}\n`
    }
  }

  return md
}
