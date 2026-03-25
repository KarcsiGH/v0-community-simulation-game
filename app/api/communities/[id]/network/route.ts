import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface NetworkNode {
  id: string
  name: string
  type: string
  stakeholderRole: string
  metrics: {
    degree: number
    betweenness: number
    closeness: number
    influence: number
  }
  group?: number
}

interface NetworkLink {
  source: string
  target: string
  type: string
  strength: "weak" | "moderate" | "strong"
  confidence: number
  verified: boolean
}

interface NetworkMetrics {
  totalNodes: number
  totalEdges: number
  density: number
  averageDegree: number
  clusters: { id: number; members: string[]; label: string }[]
  keyActors: { id: string; name: string; score: number; role: string }[]
  bridgeActors: { id: string; name: string; score: number }[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params
    const supabase = await createClient()

    // Get all entities in the community with their relationships
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
          influence
        )
      `)
      .eq("community_id", communityId)

    if (entitiesError) {
      console.error("Error fetching community entities:", entitiesError)
      return NextResponse.json({ error: entitiesError.message }, { status: 500 })
    }

    if (!communityEntities || communityEntities.length === 0) {
      return NextResponse.json({
        nodes: [],
        links: [],
        metrics: {
          totalNodes: 0,
          totalEdges: 0,
          density: 0,
          averageDegree: 0,
          clusters: [],
          keyActors: [],
          bridgeActors: [],
        },
      })
    }

    // Build node map for quick lookup
    const nodeMap = new Map<string, NetworkNode>()
    const entityNameToId = new Map<string, string>()

    for (const ce of communityEntities) {
      const entity = ce.entities as any
      if (!entity) continue

      nodeMap.set(entity.id, {
        id: entity.id,
        name: entity.name || "Unknown",
        type: entity.type || "other",
        stakeholderRole: ce.stakeholder_role || "unknown",
        metrics: {
          degree: 0,
          betweenness: 0,
          closeness: 0,
          influence: entity.influence?.influence_score || 0,
        },
      })

      // Map name variations for relationship matching
      const name = (entity.name || "").toLowerCase().trim()
      entityNameToId.set(name, entity.id)
    }

    // Extract links from entity relationships
    const links: NetworkLink[] = []
    const linkSet = new Set<string>() // Track unique links

    for (const ce of communityEntities) {
      const entity = ce.entities as any
      if (!entity || !entity.relationships) continue

      const relationships = Array.isArray(entity.relationships) ? entity.relationships : []

      for (const rel of relationships) {
        if (!rel.entityName) continue

        // Try to find the target entity in the community
        const targetName = rel.entityName.toLowerCase().trim()
        let targetId = entityNameToId.get(targetName)

        // Try partial matching if exact match fails
        if (!targetId) {
          for (const [name, id] of entityNameToId) {
            if (name.includes(targetName) || targetName.includes(name)) {
              targetId = id
              break
            }
          }
        }

        if (targetId && targetId !== entity.id) {
          // Create a unique key for this link (undirected)
          const linkKey = [entity.id, targetId].sort().join("-")
          
          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey)
            links.push({
              source: entity.id,
              target: targetId,
              type: rel.type || "neutral",
              strength: rel.strength || "moderate",
              confidence: rel.confidence || 50,
              verified: rel.verified || false,
            })
          }
        }
      }
    }

    // Calculate network metrics
    const nodes = Array.from(nodeMap.values())

    // Calculate degree for each node
    const degreeMap = new Map<string, number>()
    for (const link of links) {
      degreeMap.set(link.source, (degreeMap.get(link.source) || 0) + 1)
      degreeMap.set(link.target, (degreeMap.get(link.target) || 0) + 1)
    }

    for (const node of nodes) {
      node.metrics.degree = degreeMap.get(node.id) || 0
    }

    // Calculate betweenness centrality (simplified approximation)
    const betweennessMap = calculateBetweenness(nodes, links)
    for (const node of nodes) {
      node.metrics.betweenness = betweennessMap.get(node.id) || 0
    }

    // Calculate closeness centrality
    const closenessMap = calculateCloseness(nodes, links)
    for (const node of nodes) {
      node.metrics.closeness = closenessMap.get(node.id) || 0
    }

    // Detect clusters using simple label propagation
    const clusters = detectClusters(nodes, links)
    for (const node of nodes) {
      const cluster = clusters.find(c => c.members.includes(node.id))
      node.group = cluster ? cluster.id : 0
    }

    // Calculate network-level metrics
    const totalNodes = nodes.length
    const totalEdges = links.length
    const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2
    const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0
    const averageDegree = totalNodes > 0 
      ? nodes.reduce((sum, n) => sum + n.metrics.degree, 0) / totalNodes 
      : 0

    // Identify key actors (highest degree + influence)
    const keyActors = nodes
      .map(n => ({
        id: n.id,
        name: n.name,
        score: n.metrics.degree * 0.4 + n.metrics.influence * 0.4 + n.metrics.closeness * 0.2,
        role: n.stakeholderRole,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Identify bridge actors (highest betweenness)
    const bridgeActors = nodes
      .map(n => ({
        id: n.id,
        name: n.name,
        score: n.metrics.betweenness,
      }))
      .filter(n => n.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const metrics: NetworkMetrics = {
      totalNodes,
      totalEdges,
      density: Math.round(density * 1000) / 1000,
      averageDegree: Math.round(averageDegree * 100) / 100,
      clusters,
      keyActors,
      bridgeActors,
    }

    return NextResponse.json({
      nodes,
      links,
      metrics,
    })
  } catch (error: any) {
    console.error("Network analysis error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Calculate betweenness centrality using BFS approximation
function calculateBetweenness(nodes: NetworkNode[], links: NetworkLink[]): Map<string, number> {
  const betweenness = new Map<string, number>()
  nodes.forEach(n => betweenness.set(n.id, 0))

  // Build adjacency list
  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  
  for (const link of links) {
    adj.get(link.source)?.push(link.target)
    adj.get(link.target)?.push(link.source)
  }

  // For each node, do BFS and count shortest paths
  for (const source of nodes) {
    const distances = new Map<string, number>()
    const paths = new Map<string, number>()
    const predecessors = new Map<string, string[]>()
    const stack: string[] = []
    
    // Initialize
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
    
    // Accumulate betweenness
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
      betweenness.set(id, Math.round(value * norm * 100) / 100)
    }
  }

  return betweenness
}

// Calculate closeness centrality
function calculateCloseness(nodes: NetworkNode[], links: NetworkLink[]): Map<string, number> {
  const closeness = new Map<string, number>()
  
  // Build adjacency list
  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  
  for (const link of links) {
    adj.get(link.source)?.push(link.target)
    adj.get(link.target)?.push(link.source)
  }

  for (const source of nodes) {
    // BFS to find shortest paths
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
    
    // Sum of distances
    let sumDist = 0
    let reachable = 0
    for (const [, dist] of distances) {
      if (dist > 0) {
        sumDist += dist
        reachable++
      }
    }
    
    // Closeness = (reachable nodes - 1) / sum of distances
    const c = sumDist > 0 ? (reachable) / sumDist : 0
    closeness.set(source.id, Math.round(c * 100) / 100)
  }

  return closeness
}

// Simple cluster detection using label propagation
function detectClusters(nodes: NetworkNode[], links: NetworkLink[]): { id: number; members: string[]; label: string }[] {
  if (nodes.length === 0) return []

  // Build adjacency list
  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  
  for (const link of links) {
    adj.get(link.source)?.push(link.target)
    adj.get(link.target)?.push(link.source)
  }

  // Initialize each node with its own label
  const labels = new Map<string, number>()
  nodes.forEach((n, i) => labels.set(n.id, i))

  // Iterate label propagation
  for (let iter = 0; iter < 10; iter++) {
    let changed = false
    
    // Shuffle nodes for random order
    const shuffled = [...nodes].sort(() => Math.random() - 0.5)
    
    for (const node of shuffled) {
      const neighbors = adj.get(node.id) || []
      if (neighbors.length === 0) continue
      
      // Count neighbor labels
      const labelCounts = new Map<number, number>()
      for (const neighbor of neighbors) {
        const label = labels.get(neighbor)!
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1)
      }
      
      // Find most common label
      let maxCount = 0
      let bestLabel = labels.get(node.id)!
      for (const [label, count] of labelCounts) {
        if (count > maxCount) {
          maxCount = count
          bestLabel = label
        }
      }
      
      if (bestLabel !== labels.get(node.id)) {
        labels.set(node.id, bestLabel)
        changed = true
      }
    }
    
    if (!changed) break
  }

  // Group nodes by label
  const clusterMap = new Map<number, string[]>()
  for (const [nodeId, label] of labels) {
    if (!clusterMap.has(label)) {
      clusterMap.set(label, [])
    }
    clusterMap.get(label)?.push(nodeId)
  }

  // Create cluster objects
  const clusters: { id: number; members: string[]; label: string }[] = []
  let clusterId = 0
  
  for (const [, members] of clusterMap) {
    if (members.length > 1) {
      // Find dominant type/role for label
      const nodeTypes = members.map(m => nodes.find(n => n.id === m)?.stakeholderRole || "unknown")
      const typeCounts = nodeTypes.reduce((acc, t) => {
        acc[t] = (acc[t] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "mixed"
      
      clusters.push({
        id: clusterId++,
        members,
        label: `${dominantType} cluster (${members.length})`,
      })
    }
  }

  return clusters
}
