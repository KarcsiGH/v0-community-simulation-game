"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Network,
  Users,
  GitBranch,
  Star,
  Link2,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { NetworkGraph } from "./network-graph"
import Link from "next/link"

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

interface NetworkAnalysisPanelProps {
  communityId: string
}

const roleLabels: Record<string, string> = {
  ally: "Ally",
  funder: "Funder",
  opposition: "Opposition",
  regulator: "Regulator",
  influencer: "Influencer",
  "affected-party": "Affected Party",
  "service-provider": "Service Provider",
  researcher: "Researcher",
  unknown: "Unknown",
}

export function NetworkAnalysisPanel({ communityId }: NetworkAnalysisPanelProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [links, setLinks] = useState<NetworkLink[]>([])
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [colorBy, setColorBy] = useState<"type" | "role" | "cluster">("role")

  useEffect(() => {
    async function fetchNetworkData() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/communities/${communityId}/network`)
        if (!response.ok) {
          throw new Error("Failed to fetch network data")
        }
        const data = await response.json()
        setNodes(data.nodes || [])
        setLinks(data.links || [])
        setMetrics(data.metrics || null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkData()
  }, [communityId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Analyzing network...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (nodes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Network className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No network data available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Add entities with relationships to this community to see network analysis.
            Relationships are discovered when populating entity data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entities</p>
                <p className="text-2xl font-bold">{metrics?.totalNodes || 0}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connections</p>
                <p className="text-2xl font-bold">{metrics?.totalEdges || 0}</p>
              </div>
              <Link2 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Connections</p>
                <p className="text-2xl font-bold">{metrics?.averageDegree?.toFixed(1) || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clusters</p>
                <p className="text-2xl font-bold">{metrics?.clusters?.length || 0}</p>
              </div>
              <GitBranch className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="graph" className="space-y-4">
        <TabsList>
          <TabsTrigger value="graph" className="gap-2">
            <Network className="w-4 h-4" />
            Network Graph
          </TabsTrigger>
          <TabsTrigger value="actors" className="gap-2">
            <Star className="w-4 h-4" />
            Key Actors
          </TabsTrigger>
          <TabsTrigger value="clusters" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Clusters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relationship Network</CardTitle>
              <CardDescription>
                Interactive visualization of entity relationships within the community. 
                Node size indicates number of connections. Hover to see details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NetworkGraph
                nodes={nodes}
                links={links}
                onNodeClick={(node) => setSelectedNode(node)}
                colorBy={colorBy}
                onColorByChange={setColorBy}
                highlightedNode={selectedNode?.id}
              />
            </CardContent>
          </Card>

          {/* Selected node details */}
          {selectedNode && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedNode.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{selectedNode.type}</Badge>
                      <Badge variant="secondary">{roleLabels[selectedNode.stakeholderRole] || selectedNode.stakeholderRole}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Connections</p>
                    <p className="text-lg font-semibold">{selectedNode.metrics.degree}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Influence Score</p>
                    <p className="text-lg font-semibold">{selectedNode.metrics.influence}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Betweenness</p>
                    <p className="text-lg font-semibold">{selectedNode.metrics.betweenness}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Closeness</p>
                    <p className="text-lg font-semibold">{selectedNode.metrics.closeness}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button asChild size="sm">
                    <Link href={`/entities/${selectedNode.id}`}>
                      View Entity Details
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actors" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Key Actors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Key Actors
                </CardTitle>
                <CardDescription>
                  Most influential and connected entities in the network
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.keyActors && metrics.keyActors.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.keyActors.map((actor, i) => (
                      <div key={actor.id} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={`/entities/${actor.id}`}
                            className="font-medium hover:underline truncate block"
                          >
                            {actor.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {roleLabels[actor.role] || actor.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{actor.score.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No key actors identified</p>
                )}
              </CardContent>
            </Card>

            {/* Bridge Actors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-500" />
                  Bridge Actors
                </CardTitle>
                <CardDescription>
                  Entities that connect different parts of the network
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.bridgeActors && metrics.bridgeActors.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.bridgeActors.map((actor, i) => {
                      const node = nodes.find(n => n.id === actor.id)
                      return (
                        <div key={actor.id} className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/entities/${actor.id}`}
                              className="font-medium hover:underline truncate block"
                            >
                              {actor.name}
                            </Link>
                            {node && (
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                {roleLabels[node.stakeholderRole] || node.stakeholderRole}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{actor.score.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">betweenness</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No bridge actors identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Network Density Indicator */}
          <Card>
            <CardHeader>
              <CardTitle>Network Density</CardTitle>
              <CardDescription>
                How interconnected is this community? Higher density means more relationships exist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sparse</span>
                  <span className="text-sm">Dense</span>
                </div>
                <Progress value={(metrics?.density || 0) * 100} className="h-3" />
                <p className="text-center text-lg font-semibold">
                  {((metrics?.density || 0) * 100).toFixed(1)}% Connected
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  {metrics?.totalEdges || 0} of {(metrics?.totalNodes || 0) * ((metrics?.totalNodes || 0) - 1) / 2} possible connections
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Clusters</CardTitle>
              <CardDescription>
                Groups of entities that are more connected to each other than to the rest of the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.clusters && metrics.clusters.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.clusters.map((cluster) => (
                    <Card key={cluster.id} className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"][cluster.id % 5] }}
                          />
                          <h4 className="font-medium capitalize">{cluster.label}</h4>
                        </div>
                        <div className="space-y-1">
                          {cluster.members.slice(0, 5).map(memberId => {
                            const node = nodes.find(n => n.id === memberId)
                            return node ? (
                              <Link
                                key={memberId}
                                href={`/entities/${memberId}`}
                                className="text-sm text-muted-foreground hover:text-foreground hover:underline block truncate"
                              >
                                {node.name}
                              </Link>
                            ) : null
                          })}
                          {cluster.members.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{cluster.members.length - 5} more
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No distinct clusters detected. The network may be too sparse or too uniformly connected.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
