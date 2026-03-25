import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params
    const supabase = await createClient()

    // Get all entities in the community with relationships
    const { data: communityEntities, error: entitiesError } = await supabase
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
      .eq("community_id", communityId)

    if (entitiesError) {
      return NextResponse.json({ error: entitiesError.message }, { status: 500 })
    }

    if (!communityEntities || communityEntities.length === 0) {
      return NextResponse.json(getEmptyHealthData())
    }

    // Build network data structures
    const nodes: NetworkNode[] = []
    const links: NetworkLink[] = []
    const entityMap = new Map<string, any>()
    const nameToId = new Map<string, string>()

    for (const ce of communityEntities) {
      const entity = ce.entities as any
      if (!entity) continue
      
      entityMap.set(entity.id, { ...entity, stakeholderRole: ce.stakeholder_role })
      nameToId.set(entity.name?.toLowerCase().trim() || "", entity.id)
      
      nodes.push({
        id: entity.id,
        name: entity.name || "Unknown",
        type: entity.type || "other",
        stakeholderRole: ce.stakeholder_role || "unknown",
        influence: entity.influence?.influence_score || 0,
        riskTolerance: entity.strategic?.risk_tolerance || "moderate",
        collaborationWillingness: entity.strategic?.collaboration_willingness || "moderate"
      })
    }

    // Extract links from relationships
    const linkSet = new Set<string>()
    for (const ce of communityEntities) {
      const entity = ce.entities as any
      if (!entity?.relationships) continue
      
      const relationships = Array.isArray(entity.relationships) ? entity.relationships : []
      
      for (const rel of relationships) {
        if (!rel.entityName) continue
        
        const targetName = rel.entityName.toLowerCase().trim()
        let targetId = nameToId.get(targetName)
        
        // Fuzzy match
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
            links.push({
              source: entity.id,
              target: targetId,
              type: rel.type || "neutral",
              strength: rel.strength || "moderate",
              verified: rel.verified || false
            })
          }
        }
      }
    }

    // Calculate network metrics
    const adjacency = buildAdjacencyList(nodes, links)
    const degrees = calculateDegrees(nodes, links)
    const betweenness = calculateBetweenness(nodes, adjacency)
    const closeness = calculateCloseness(nodes, adjacency)

    // Analyze vulnerabilities
    const vulnerabilities = analyzeVulnerabilities(nodes, links, adjacency, degrees, betweenness)

    // Analyze coalitions
    const coalitionReadiness = analyzeCoalitions(nodes, links, entityMap)

    // Analyze power structure
    const powerAnalysis = analyzePower(nodes, links, degrees, betweenness, entityMap)

    // Find opportunities
    const opportunityMap = findOpportunities(nodes, links, adjacency, degrees, entityMap)

    // Calculate overall health score
    const overallHealthScore = calculateHealthScore(vulnerabilities, coalitionReadiness, powerAnalysis, nodes, links)

    // Generate recommendations
    const recommendations = generateRecommendations(vulnerabilities, coalitionReadiness, powerAnalysis, opportunityMap)

    return NextResponse.json({
      vulnerabilities,
      coalitionReadiness,
      powerAnalysis,
      opportunityMap,
      overallHealthScore,
      recommendations
    })
  } catch (error: any) {
    console.error("Network health analysis error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

interface NetworkNode {
  id: string
  name: string
  type: string
  stakeholderRole: string
  influence: number
  riskTolerance: string
  collaborationWillingness: string
}

interface NetworkLink {
  source: string
  target: string
  type: string
  strength: string
  verified: boolean
}

function buildAdjacencyList(nodes: NetworkNode[], links: NetworkLink[]): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  
  for (const link of links) {
    adj.get(link.source)?.push(link.target)
    adj.get(link.target)?.push(link.source)
  }
  
  return adj
}

function calculateDegrees(nodes: NetworkNode[], links: NetworkLink[]): Map<string, number> {
  const degrees = new Map<string, number>()
  nodes.forEach(n => degrees.set(n.id, 0))
  
  for (const link of links) {
    degrees.set(link.source, (degrees.get(link.source) || 0) + 1)
    degrees.set(link.target, (degrees.get(link.target) || 0) + 1)
  }
  
  return degrees
}

function calculateBetweenness(nodes: NetworkNode[], adj: Map<string, string[]>): Map<string, number> {
  const betweenness = new Map<string, number>()
  nodes.forEach(n => betweenness.set(n.id, 0))

  for (const source of nodes) {
    const distances = new Map<string, number>()
    const paths = new Map<string, number>()
    const predecessors = new Map<string, string[]>()
    const stack: string[] = []
    
    nodes.forEach(n => {
      distances.set(n.id, -1)
      paths.set(n.id, 0)
      predecessors.set(n.id, [])
    })
    
    distances.set(source.id, 0)
    paths.set(source.id, 1)
    
    const queue = [source.id]
    
    while (queue.length > 0) {
      const v = queue.shift()!
      stack.push(v)
      
      for (const w of adj.get(v) || []) {
        if (distances.get(w) === -1) {
          distances.set(w, distances.get(v)! + 1)
          queue.push(w)
        }
        
        if (distances.get(w) === distances.get(v)! + 1) {
          paths.set(w, paths.get(w)! + paths.get(v)!)
          predecessors.get(w)?.push(v)
        }
      }
    }
    
    const delta = new Map<string, number>()
    nodes.forEach(n => delta.set(n.id, 0))
    
    while (stack.length > 0) {
      const w = stack.pop()!
      for (const v of predecessors.get(w) || []) {
        const d = (paths.get(v)! / paths.get(w)!) * (1 + delta.get(w)!)
        delta.set(v, delta.get(v)! + d)
      }
      if (w !== source.id) {
        betweenness.set(w, betweenness.get(w)! + delta.get(w)!)
      }
    }
  }

  // Normalize
  const n = nodes.length
  if (n > 2) {
    const norm = 2 / ((n - 1) * (n - 2))
    for (const [id, value] of betweenness) {
      betweenness.set(id, value * norm)
    }
  }

  return betweenness
}

function calculateCloseness(nodes: NetworkNode[], adj: Map<string, string[]>): Map<string, number> {
  const closeness = new Map<string, number>()

  for (const source of nodes) {
    const distances = new Map<string, number>()
    distances.set(source.id, 0)
    const queue = [source.id]
    
    while (queue.length > 0) {
      const v = queue.shift()!
      for (const w of adj.get(v) || []) {
        if (!distances.has(w)) {
          distances.set(w, distances.get(v)! + 1)
          queue.push(w)
        }
      }
    }
    
    let sumDist = 0
    let reachable = 0
    for (const [, dist] of distances) {
      if (dist > 0) {
        sumDist += dist
        reachable++
      }
    }
    
    closeness.set(source.id, sumDist > 0 ? reachable / sumDist : 0)
  }

  return closeness
}

function analyzeVulnerabilities(
  nodes: NetworkNode[], 
  links: NetworkLink[], 
  adj: Map<string, string[]>,
  degrees: Map<string, number>,
  betweenness: Map<string, number>
) {
  // Find single points of failure (high betweenness, many connections)
  const singlePointsOfFailure = nodes
    .filter(n => (betweenness.get(n.id) || 0) > 0.1 && (degrees.get(n.id) || 0) >= 3)
    .map(n => ({
      entityId: n.id,
      entityName: n.name,
      dependentConnections: degrees.get(n.id) || 0,
      riskLevel: (betweenness.get(n.id) || 0) > 0.3 ? "critical" as const : 
                 (betweenness.get(n.id) || 0) > 0.2 ? "high" as const : 
                 (betweenness.get(n.id) || 0) > 0.1 ? "medium" as const : "low" as const,
      description: `Removing ${n.name} would disconnect ${degrees.get(n.id)} entities`
    }))
    .sort((a, b) => b.dependentConnections - a.dependentConnections)
    .slice(0, 5)

  // Calculate fragmentation risk
  const criticalLinks = links
    .filter(l => {
      // Simple check: if both endpoints have high betweenness
      const sourceB = betweenness.get(l.source) || 0
      const targetB = betweenness.get(l.target) || 0
      return sourceB > 0.1 || targetB > 0.1
    })
    .map(l => ({
      source: nodes.find(n => n.id === l.source)?.name || l.source,
      target: nodes.find(n => n.id === l.target)?.name || l.target,
      removingCausesFragments: 2 // Simplified
    }))
    .slice(0, 5)

  const maxPossibleLinks = (nodes.length * (nodes.length - 1)) / 2
  const density = maxPossibleLinks > 0 ? links.length / maxPossibleLinks : 0
  const fragmentationScore = Math.max(0, 1 - density * 2) // Higher density = lower fragmentation risk

  // Find isolated entities
  const isolatedEntities = nodes
    .filter(n => (degrees.get(n.id) || 0) === 0)
    .map(n => ({
      entityId: n.id,
      entityName: n.name,
      type: n.type
    }))

  return {
    singlePointsOfFailure,
    fragmentationRisk: {
      score: fragmentationScore,
      criticalLinks
    },
    isolatedEntities
  }
}

function analyzeCoalitions(
  nodes: NetworkNode[], 
  links: NetworkLink[], 
  entityMap: Map<string, any>
) {
  // Find existing coalitions (strongly connected groups of allies)
  const allyLinks = links.filter(l => l.type === "ally" || l.type === "partner")
  const existingCoalitions = findConnectedComponents(nodes.map(n => n.id), allyLinks)
    .filter(c => c.length >= 2)
    .map(members => ({
      members: members.map(id => entityMap.get(id)?.name || id),
      strength: members.length / nodes.length,
      basis: "Existing partnership or alliance"
    }))

  // Identify potential coalitions based on shared roles
  const roleGroups = new Map<string, string[]>()
  for (const node of nodes) {
    const role = node.stakeholderRole
    if (!roleGroups.has(role)) roleGroups.set(role, [])
    roleGroups.get(role)?.push(node.id)
  }

  const potentialCoalitions = Array.from(roleGroups.entries())
    .filter(([_, members]) => members.length >= 2)
    .map(([role, members]) => ({
      members: members.map(id => entityMap.get(id)?.name || id),
      likelihood: 0.5 + (role === "ally" ? 0.3 : role === "funder" ? 0.2 : 0),
      basis: `Shared ${role} role`,
      blockers: [] as string[]
    }))
    .slice(0, 3)

  // Find swing actors
  const swingActors = nodes
    .filter(n => n.stakeholderRole === "neutral" || n.stakeholderRole === "unknown")
    .filter(n => n.influence > 0)
    .map(n => ({
      entityId: n.id,
      entityName: n.name,
      influence: n.influence / 100,
      currentStance: n.stakeholderRole,
      persuadability: n.collaborationWillingness === "high" ? 0.8 : 
                      n.collaborationWillingness === "moderate" ? 0.5 : 0.3
    }))
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 5)

  // Calculate minimum winning coalition
  const sortedByInfluence = [...nodes].sort((a, b) => b.influence - a.influence)
  let cumInfluence = 0
  let minWinningSize = 0
  for (const node of sortedByInfluence) {
    cumInfluence += node.influence
    minWinningSize++
    if (cumInfluence > 50) break
  }

  const coalitionReadinessScore = existingCoalitions.length > 0 ? 0.6 : 0.3
  const adjustedScore = coalitionReadinessScore + (swingActors.length > 0 ? 0.2 : 0)

  return {
    score: Math.min(1, adjustedScore),
    existingCoalitions,
    potentialCoalitions,
    minimumWinningCoalition: {
      size: minWinningSize,
      possibleCombinations: Math.floor(Math.pow(2, Math.min(minWinningSize + 2, 10))),
      easiestPath: sortedByInfluence.slice(0, minWinningSize).map(n => n.name)
    },
    swingActors
  }
}

function analyzePower(
  nodes: NetworkNode[], 
  links: NetworkLink[], 
  degrees: Map<string, number>,
  betweenness: Map<string, number>,
  entityMap: Map<string, any>
) {
  // Calculate Gini coefficient for power distribution
  const influences = nodes.map(n => n.influence).sort((a, b) => a - b)
  let gini = 0
  const n = influences.length
  if (n > 0) {
    let sumOfAbsDiff = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfAbsDiff += Math.abs(influences[i] - influences[j])
      }
    }
    const mean = influences.reduce((a, b) => a + b, 0) / n
    gini = mean > 0 ? sumOfAbsDiff / (2 * n * n * mean) : 0
  }

  const powerConcentration = gini > 0.5 ? "highly concentrated" : 
                             gini > 0.3 ? "moderately concentrated" : "distributed"

  // Identify gatekeepers (high betweenness)
  const gatekeepers = nodes
    .filter(n => (betweenness.get(n.id) || 0) > 0.15)
    .map(n => {
      const neighbors = Array.from(new Set(
        links
          .filter(l => l.source === n.id || l.target === n.id)
          .flatMap(l => [l.source, l.target])
          .filter(id => id !== n.id)
      ))
      return {
        entityId: n.id,
        entityName: n.name,
        controlsFlowBetween: neighbors.slice(0, 4).map(id => entityMap.get(id)?.name || id)
      }
    })
    .slice(0, 5)

  // Find hidden influencers (high betweenness, low stated influence)
  const hiddenInfluencers = nodes
    .filter(n => (betweenness.get(n.id) || 0) > 0.1 && n.influence < 50)
    .map(n => ({
      entityId: n.id,
      entityName: n.name,
      betweennessCentrality: betweenness.get(n.id) || 0,
      publicVisibility: n.influence < 30 ? "low" as const : "medium" as const
    }))
    .sort((a, b) => b.betweennessCentrality - a.betweennessCentrality)
    .slice(0, 5)

  // Find structural holes
  const structuralHoles: Array<{ between: string[]; opportunity: string }> = []
  const roleGroups = new Map<string, NetworkNode[]>()
  for (const node of nodes) {
    if (!roleGroups.has(node.stakeholderRole)) roleGroups.set(node.stakeholderRole, [])
    roleGroups.get(node.stakeholderRole)?.push(node)
  }

  // Check for gaps between role groups
  const roles = Array.from(roleGroups.keys())
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const group1 = roleGroups.get(roles[i]) || []
      const group2 = roleGroups.get(roles[j]) || []
      
      const crossLinks = links.filter(l => 
        (group1.some(n => n.id === l.source) && group2.some(n => n.id === l.target)) ||
        (group2.some(n => n.id === l.source) && group1.some(n => n.id === l.target))
      )
      
      if (crossLinks.length === 0 && group1.length > 0 && group2.length > 0) {
        structuralHoles.push({
          between: [roles[i], roles[j]],
          opportunity: `Connect ${roles[i]}s with ${roles[j]}s to improve coordination`
        })
      }
    }
  }

  return {
    giniCoefficient: gini,
    powerConcentration,
    gatekeepers,
    hiddenInfluencers,
    structuralHoles: structuralHoles.slice(0, 5)
  }
}

function findOpportunities(
  nodes: NetworkNode[], 
  links: NetworkLink[], 
  adj: Map<string, string[]>,
  degrees: Map<string, number>,
  entityMap: Map<string, any>
) {
  // Find underconnected allies
  const allies = nodes.filter(n => n.stakeholderRole === "ally")
  const underconnectedAllies = allies
    .filter(n => (degrees.get(n.id) || 0) < 3)
    .map(n => {
      const connected = new Set(adj.get(n.id) || [])
      const potentialConnections = allies
        .filter(a => a.id !== n.id && !connected.has(a.id))
        .map(a => a.name)
        .slice(0, 3)
      
      return {
        entityId: n.id,
        entityName: n.name,
        currentConnections: degrees.get(n.id) || 0,
        potentialConnections
      }
    })
    .filter(a => a.potentialConnections.length > 0)
    .slice(0, 5)

  // Find bridge opportunities
  const bridgeOpportunities: Array<{ from: string; to: string; benefit: string }> = []
  
  // Look for high-influence nodes that aren't connected
  const influentialNodes = nodes.filter(n => n.influence > 60).slice(0, 10)
  for (let i = 0; i < influentialNodes.length; i++) {
    for (let j = i + 1; j < influentialNodes.length; j++) {
      const n1 = influentialNodes[i]
      const n2 = influentialNodes[j]
      const connected = adj.get(n1.id)?.includes(n2.id)
      
      if (!connected) {
        bridgeOpportunities.push({
          from: n1.name,
          to: n2.name,
          benefit: `Would connect two high-influence entities (combined influence: ${n1.influence + n2.influence})`
        })
      }
    }
  }

  return {
    underconnectedAllies,
    bridgeOpportunities: bridgeOpportunities.slice(0, 5),
    dormantRelationships: [] // Would need historical data
  }
}

function calculateHealthScore(
  vulnerabilities: any,
  coalitionReadiness: any,
  powerAnalysis: any,
  nodes: NetworkNode[],
  links: NetworkLink[]
): number {
  let score = 50 // Base score

  // Density bonus (more connections = healthier)
  const maxLinks = (nodes.length * (nodes.length - 1)) / 2
  const density = maxLinks > 0 ? links.length / maxLinks : 0
  score += density * 20

  // Coalition readiness bonus
  score += coalitionReadiness.score * 15

  // Vulnerability penalties
  score -= vulnerabilities.singlePointsOfFailure.length * 5
  score -= vulnerabilities.fragmentationRisk.score * 10
  score -= vulnerabilities.isolatedEntities.length * 2

  // Power distribution (distributed is healthier)
  if (powerAnalysis.powerConcentration === "distributed") score += 10
  if (powerAnalysis.powerConcentration === "highly concentrated") score -= 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

function generateRecommendations(
  vulnerabilities: any,
  coalitionReadiness: any,
  powerAnalysis: any,
  opportunityMap: any
): Array<{ priority: string; category: string; action: string; expectedImpact: string }> {
  const recommendations: Array<{ priority: string; category: string; action: string; expectedImpact: string }> = []

  // High priority: Address single points of failure
  for (const spof of vulnerabilities.singlePointsOfFailure.slice(0, 2)) {
    recommendations.push({
      priority: "high",
      category: "Resilience",
      action: `Reduce dependency on ${spof.entityName} by connecting their partners directly`,
      expectedImpact: `Would reduce fragmentation risk if ${spof.entityName} becomes unavailable`
    })
  }

  // High priority: Connect isolated entities
  if (vulnerabilities.isolatedEntities.length > 0) {
    recommendations.push({
      priority: "high",
      category: "Integration",
      action: `Connect isolated entities: ${vulnerabilities.isolatedEntities.slice(0, 3).map((e: any) => e.entityName).join(", ")}`,
      expectedImpact: "Would improve network coverage and coalition potential"
    })
  }

  // Medium priority: Strengthen coalitions
  if (coalitionReadiness.potentialCoalitions.length > 0) {
    const top = coalitionReadiness.potentialCoalitions[0]
    recommendations.push({
      priority: "medium",
      category: "Coalition Building",
      action: `Formalize potential coalition: ${top.members.slice(0, 3).join(", ")}`,
      expectedImpact: `Would increase coalition readiness by ~${Math.round(top.likelihood * 20)}%`
    })
  }

  // Medium priority: Engage swing actors
  if (coalitionReadiness.swingActors.length > 0) {
    const topSwing = coalitionReadiness.swingActors[0]
    recommendations.push({
      priority: "medium",
      category: "Outreach",
      action: `Prioritize engaging ${topSwing.entityName} (${Math.round(topSwing.persuadability * 100)}% persuadability)`,
      expectedImpact: `Could add ${Math.round(topSwing.influence * 100)}% influence to your coalition`
    })
  }

  // Low priority: Bridge opportunities
  for (const bridge of opportunityMap.bridgeOpportunities.slice(0, 2)) {
    recommendations.push({
      priority: "low",
      category: "Network Growth",
      action: `Facilitate connection between ${bridge.from} and ${bridge.to}`,
      expectedImpact: bridge.benefit
    })
  }

  return recommendations.slice(0, 8)
}

function findConnectedComponents(nodeIds: string[], links: NetworkLink[]): string[][] {
  const adj = new Map<string, string[]>()
  nodeIds.forEach(id => adj.set(id, []))
  
  for (const link of links) {
    adj.get(link.source)?.push(link.target)
    adj.get(link.target)?.push(link.source)
  }

  const visited = new Set<string>()
  const components: string[][] = []

  for (const id of nodeIds) {
    if (visited.has(id)) continue
    
    const component: string[] = []
    const queue = [id]
    
    while (queue.length > 0) {
      const node = queue.shift()!
      if (visited.has(node)) continue
      
      visited.add(node)
      component.push(node)
      
      for (const neighbor of adj.get(node) || []) {
        if (!visited.has(neighbor)) queue.push(neighbor)
      }
    }
    
    if (component.length > 0) components.push(component)
  }

  return components
}

function getEmptyHealthData() {
  return {
    vulnerabilities: {
      singlePointsOfFailure: [],
      fragmentationRisk: { score: 0, criticalLinks: [] },
      isolatedEntities: []
    },
    coalitionReadiness: {
      score: 0,
      existingCoalitions: [],
      potentialCoalitions: [],
      minimumWinningCoalition: { size: 0, possibleCombinations: 0, easiestPath: [] },
      swingActors: []
    },
    powerAnalysis: {
      giniCoefficient: 0,
      powerConcentration: "distributed",
      gatekeepers: [],
      hiddenInfluencers: [],
      structuralHoles: []
    },
    opportunityMap: {
      underconnectedAllies: [],
      bridgeOpportunities: [],
      dormantRelationships: []
    },
    overallHealthScore: 0,
    recommendations: []
  }
}
