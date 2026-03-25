import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface NetworkSnapshot {
  year: number
  nodes: PredictedNode[]
  links: PredictedLink[]
  metrics: NetworkMetrics
  changes: NetworkChanges
}

interface PredictedNode {
  id: string
  name: string
  type: string
  role: string
  influence: number
  predictedInfluence: number
  status: "stable" | "rising" | "declining" | "new" | "departed"
}

interface PredictedLink {
  source: string
  target: string
  type: string
  strength: number
  predictedStrength: number
  status: "stable" | "strengthening" | "weakening" | "new" | "broken"
  probability: number
}

interface NetworkMetrics {
  density: number
  averageDegree: number
  clusteringCoefficient: number
  polarization: number
  coalitionStrength: number
}

interface NetworkChanges {
  newRelationships: Array<{
    source: string
    target: string
    probability: number
    basis: string
  }>
  brokenRelationships: Array<{
    source: string
    target: string
    probability: number
    reason: string
  }>
  powerShifts: Array<{
    entity: string
    from: number
    to: number
    reason: string
  }>
  emergingCoalitions: Array<{
    members: string[]
    probability: number
    basis: string
  }>
  fragmentationRisks: Array<{
    description: string
    probability: number
    trigger: string
  }>
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: simulationId } = await params
    const supabase = await createClient()

    // Get simulation with community info
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select(`
        *,
        communities (
          id,
          name,
          geography,
          issue_areas
        )
      `)
      .eq("id", simulationId)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Get community entities with current relationships
    const { data: communityEntities, error: entError } = await supabase
      .from("community_entities")
      .select(`
        entity_id,
        stakeholder_role,
        entities (
          id,
          name,
          type,
          relationships,
          influence,
          strategic
        )
      `)
      .eq("community_id", simulation.community_id)

    if (entError || !communityEntities || communityEntities.length === 0) {
      return NextResponse.json({ predictions: [], currentNetwork: null })
    }

    // Get simulation years with responses
    const { data: years } = await supabase
      .from("simulation_years")
      .select("*")
      .eq("simulation_id", simulationId)
      .order("year_number", { ascending: true })

    // Get all simulation responses for relationship change tracking
    const { data: responses } = await supabase
      .from("simulation_responses")
      .select(`
        *,
        simulation_years!inner(year_number),
        entities(name)
      `)
      .eq("simulation_years.simulation_id", simulationId)

    // Get relationship changes from simulation
    const { data: relationshipChanges } = await supabase
      .from("simulation_relationship_changes")
      .select(`
        *,
        simulation_years!inner(year_number)
      `)
      .eq("simulation_years.simulation_id", simulationId)

    // Build current network state
    const currentNetwork = buildCurrentNetwork(communityEntities)

    // Generate predictions for future years
    const predictions = generateNetworkPredictions(
      simulation,
      communityEntities,
      years || [],
      responses || [],
      relationshipChanges || []
    )

    return NextResponse.json({
      currentNetwork,
      predictions,
      simulationInfo: {
        currentYear: simulation.current_year,
        totalYears: simulation.total_years,
        scenario: simulation.scenario
      }
    })
  } catch (error: any) {
    console.error("Network prediction error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildCurrentNetwork(communityEntities: any[]) {
  const nodes: PredictedNode[] = []
  const links: PredictedLink[] = []
  const nameToId = new Map<string, string>()

  for (const ce of communityEntities) {
    const entity = ce.entities as any
    if (!entity) continue

    nameToId.set(entity.name?.toLowerCase().trim() || "", entity.id)
    
    nodes.push({
      id: entity.id,
      name: entity.name || "Unknown",
      type: entity.type || "other",
      role: ce.stakeholder_role || "unknown",
      influence: entity.influence?.influence_score || 50,
      predictedInfluence: entity.influence?.influence_score || 50,
      status: "stable"
    })
  }

  // Extract links
  const linkSet = new Set<string>()
  for (const ce of communityEntities) {
    const entity = ce.entities as any
    if (!entity?.relationships) continue

    const relationships = Array.isArray(entity.relationships) ? entity.relationships : []
    
    for (const rel of relationships) {
      if (!rel.entityName) continue

      const targetName = rel.entityName.toLowerCase().trim()
      let targetId = nameToId.get(targetName)

      if (!targetId) {
        for (const [name, id] of nameToId) {
          if (name.includes(targetName) || targetName.includes(name)) {
            targetId = id
            break
          }
        }
      }

      if (targetId && targetId !== entity.id) {
        const linkKey = [entity.id, targetId].sort().join("-")
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey)
          const strengthValue = rel.strength === "strong" ? 0.9 : 
                                rel.strength === "moderate" ? 0.6 : 0.3
          links.push({
            source: entity.id,
            target: targetId,
            type: rel.type || "neutral",
            strength: strengthValue,
            predictedStrength: strengthValue,
            status: "stable",
            probability: 1.0
          })
        }
      }
    }
  }

  return {
    nodes,
    links,
    metrics: calculateMetrics(nodes, links)
  }
}

function calculateMetrics(nodes: PredictedNode[], links: PredictedLink[]): NetworkMetrics {
  const n = nodes.length
  const maxLinks = (n * (n - 1)) / 2
  const density = maxLinks > 0 ? links.length / maxLinks : 0
  const avgDegree = n > 0 ? (links.length * 2) / n : 0

  // Simple clustering coefficient approximation
  const clustering = Math.min(1, density * 1.5)

  // Polarization based on relationship types
  const allyLinks = links.filter(l => l.type === "ally" || l.type === "partner").length
  const adversaryLinks = links.filter(l => l.type === "adversary" || l.type === "competitor").length
  const polarization = links.length > 0 ? adversaryLinks / links.length : 0

  // Coalition strength based on ally cluster sizes
  const coalitionStrength = links.length > 0 ? allyLinks / links.length : 0

  return {
    density: Math.round(density * 1000) / 1000,
    averageDegree: Math.round(avgDegree * 100) / 100,
    clusteringCoefficient: Math.round(clustering * 100) / 100,
    polarization: Math.round(polarization * 100) / 100,
    coalitionStrength: Math.round(coalitionStrength * 100) / 100
  }
}

function generateNetworkPredictions(
  simulation: any,
  communityEntities: any[],
  years: any[],
  responses: any[],
  relationshipChanges: any[]
): NetworkSnapshot[] {
  const predictions: NetworkSnapshot[] = []
  const currentYear = simulation.current_year
  const totalYears = simulation.total_years

  // Build base network
  const baseNodes: PredictedNode[] = []
  const baseLinks: PredictedLink[] = []
  const nameToId = new Map<string, string>()
  const idToEntity = new Map<string, any>()

  for (const ce of communityEntities) {
    const entity = ce.entities as any
    if (!entity) continue
    
    nameToId.set(entity.name?.toLowerCase().trim() || "", entity.id)
    idToEntity.set(entity.id, { ...entity, stakeholderRole: ce.stakeholder_role })
    
    baseNodes.push({
      id: entity.id,
      name: entity.name || "Unknown",
      type: entity.type || "other",
      role: ce.stakeholder_role || "unknown",
      influence: entity.influence?.influence_score || 50,
      predictedInfluence: entity.influence?.influence_score || 50,
      status: "stable"
    })
  }

  // Extract base links
  const linkSet = new Set<string>()
  for (const ce of communityEntities) {
    const entity = ce.entities as any
    if (!entity?.relationships) continue

    const relationships = Array.isArray(entity.relationships) ? entity.relationships : []
    
    for (const rel of relationships) {
      if (!rel.entityName) continue

      const targetName = rel.entityName.toLowerCase().trim()
      let targetId = nameToId.get(targetName)

      if (!targetId) {
        for (const [name, id] of nameToId) {
          if (name.includes(targetName) || targetName.includes(name)) {
            targetId = id
            break
          }
        }
      }

      if (targetId && targetId !== entity.id) {
        const linkKey = [entity.id, targetId].sort().join("-")
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey)
          const strengthValue = rel.strength === "strong" ? 0.9 : 
                                rel.strength === "moderate" ? 0.6 : 0.3
          baseLinks.push({
            source: entity.id,
            target: targetId,
            type: rel.type || "neutral",
            strength: strengthValue,
            predictedStrength: strengthValue,
            status: "stable",
            probability: 1.0
          })
        }
      }
    }
  }

  // Analyze past years for trends
  const responsesByYear = new Map<number, any[]>()
  for (const r of responses) {
    const yearNum = r.simulation_years?.year_number
    if (!yearNum) continue
    if (!responsesByYear.has(yearNum)) responsesByYear.set(yearNum, [])
    responsesByYear.get(yearNum)?.push(r)
  }

  const changesByYear = new Map<number, any[]>()
  for (const c of relationshipChanges) {
    const yearNum = c.simulation_years?.year_number
    if (!yearNum) continue
    if (!changesByYear.has(yearNum)) changesByYear.set(yearNum, [])
    changesByYear.get(yearNum)?.push(c)
  }

  // Generate predictions for each future year
  for (let year = currentYear + 1; year <= totalYears; year++) {
    const yearPrediction = predictYearNetwork(
      year,
      currentYear,
      baseNodes,
      baseLinks,
      idToEntity,
      responsesByYear,
      changesByYear,
      simulation
    )
    predictions.push(yearPrediction)
  }

  return predictions
}

function predictYearNetwork(
  year: number,
  currentYear: number,
  baseNodes: PredictedNode[],
  baseLinks: PredictedLink[],
  idToEntity: Map<string, any>,
  responsesByYear: Map<number, any[]>,
  changesByYear: Map<number, any[]>,
  simulation: any
): NetworkSnapshot {
  const yearsAhead = year - currentYear
  const decayFactor = Math.pow(0.85, yearsAhead) // Predictions become less certain over time

  // Clone nodes with predictions
  const predictedNodes: PredictedNode[] = baseNodes.map(node => {
    const entity = idToEntity.get(node.id)
    
    // Predict influence changes based on engagement patterns
    let influenceChange = 0
    
    // Check historical responses for engagement level
    for (const [yearNum, yearResponses] of responsesByYear) {
      const entityResponse = yearResponses.find((r: any) => r.entity_id === node.id)
      if (entityResponse?.decision?.engagement_level === "high") {
        influenceChange += 2
      } else if (entityResponse?.decision?.engagement_level === "low") {
        influenceChange -= 1
      }
    }

    // Role-based influence trajectory
    if (entity?.stakeholderRole === "ally" || entity?.stakeholderRole === "funder") {
      influenceChange += yearsAhead * 1.5
    } else if (entity?.stakeholderRole === "opposition") {
      influenceChange -= yearsAhead * 0.5
    }

    const predictedInfluence = Math.max(0, Math.min(100, 
      node.influence + influenceChange * decayFactor
    ))

    let status: PredictedNode["status"] = "stable"
    if (predictedInfluence > node.influence + 10) status = "rising"
    else if (predictedInfluence < node.influence - 10) status = "declining"

    return {
      ...node,
      predictedInfluence: Math.round(predictedInfluence),
      status
    }
  })

  // Clone links with predictions
  const predictedLinks: PredictedLink[] = baseLinks.map(link => {
    let strengthChange = 0
    
    // Check historical relationship changes
    for (const [yearNum, changes] of changesByYear) {
      for (const change of changes) {
        if ((change.entity_a_id === link.source && change.entity_b_id === link.target) ||
            (change.entity_a_id === link.target && change.entity_b_id === link.source)) {
          if (change.change_type === "strengthened") strengthChange += 0.1
          else if (change.change_type === "weakened") strengthChange -= 0.1
        }
      }
    }

    // Relationships between allies tend to strengthen
    const sourceNode = predictedNodes.find(n => n.id === link.source)
    const targetNode = predictedNodes.find(n => n.id === link.target)
    
    if (sourceNode?.role === "ally" && targetNode?.role === "ally") {
      strengthChange += 0.05 * yearsAhead
    }
    
    // Adversarial relationships may weaken or break
    if (link.type === "adversary" || link.type === "competitor") {
      strengthChange -= 0.03 * yearsAhead
    }

    const predictedStrength = Math.max(0, Math.min(1, 
      link.strength + strengthChange * decayFactor
    ))

    let status: PredictedLink["status"] = "stable"
    if (predictedStrength > link.strength + 0.15) status = "strengthening"
    else if (predictedStrength < link.strength - 0.15) status = "weakening"
    if (predictedStrength < 0.1) status = "broken"

    return {
      ...link,
      predictedStrength: Math.round(predictedStrength * 100) / 100,
      status,
      probability: Math.max(0.5, decayFactor)
    }
  }).filter(l => l.status !== "broken" || Math.random() < 0.3)

  // Predict new relationships
  const newRelationships: NetworkChanges["newRelationships"] = []
  const allies = predictedNodes.filter(n => n.role === "ally")
  
  for (let i = 0; i < allies.length; i++) {
    for (let j = i + 1; j < allies.length; j++) {
      const existingLink = predictedLinks.find(l => 
        (l.source === allies[i].id && l.target === allies[j].id) ||
        (l.source === allies[j].id && l.target === allies[i].id)
      )
      
      if (!existingLink) {
        const probability = 0.3 * decayFactor * (yearsAhead / simulation.total_years)
        if (probability > 0.1) {
          newRelationships.push({
            source: allies[i].name,
            target: allies[j].name,
            probability: Math.round(probability * 100) / 100,
            basis: "Shared ally status and similar goals"
          })
        }
      }
    }
  }

  // Predict broken relationships
  const brokenRelationships: NetworkChanges["brokenRelationships"] = predictedLinks
    .filter(l => l.status === "broken")
    .map(l => ({
      source: predictedNodes.find(n => n.id === l.source)?.name || l.source,
      target: predictedNodes.find(n => n.id === l.target)?.name || l.target,
      probability: 1 - l.probability,
      reason: l.type === "adversary" ? "Ongoing conflict" : "Relationship decay"
    }))

  // Predict power shifts
  const powerShifts: NetworkChanges["powerShifts"] = predictedNodes
    .filter(n => Math.abs(n.predictedInfluence - n.influence) > 10)
    .map(n => ({
      entity: n.name,
      from: n.influence,
      to: n.predictedInfluence,
      reason: n.status === "rising" ? "Increasing engagement and coalition building" :
              "Reduced engagement or opposition gains"
    }))
    .slice(0, 5)

  // Predict emerging coalitions
  const emergingCoalitions: NetworkChanges["emergingCoalitions"] = []
  const risingAllies = predictedNodes.filter(n => n.role === "ally" && n.status === "rising")
  if (risingAllies.length >= 3) {
    emergingCoalitions.push({
      members: risingAllies.slice(0, 4).map(n => n.name),
      probability: Math.round(0.6 * decayFactor * 100) / 100,
      basis: "Rising influence and shared alliance"
    })
  }

  // Predict fragmentation risks
  const fragmentationRisks: NetworkChanges["fragmentationRisks"] = []
  const decliningNodes = predictedNodes.filter(n => n.status === "declining")
  const weakLinks = predictedLinks.filter(l => l.status === "weakening")
  
  if (decliningNodes.length > predictedNodes.length * 0.3) {
    fragmentationRisks.push({
      description: "Multiple entities losing influence",
      probability: Math.round(0.4 * yearsAhead / simulation.total_years * 100) / 100,
      trigger: "Continued disengagement from key stakeholders"
    })
  }
  
  if (weakLinks.length > predictedLinks.length * 0.3) {
    fragmentationRisks.push({
      description: "Network cohesion declining",
      probability: Math.round(0.5 * yearsAhead / simulation.total_years * 100) / 100,
      trigger: "Multiple relationships weakening simultaneously"
    })
  }

  return {
    year,
    nodes: predictedNodes,
    links: predictedLinks,
    metrics: calculateMetrics(predictedNodes, predictedLinks),
    changes: {
      newRelationships: newRelationships.slice(0, 5),
      brokenRelationships: brokenRelationships.slice(0, 5),
      powerShifts,
      emergingCoalitions,
      fragmentationRisks
    }
  }
}
