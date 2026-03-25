"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Network,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  Link2,
  Unlink,
  Loader2,
  Calendar,
  Zap,
  Eye
} from "lucide-react"

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
  newRelationships: Array<{ source: string; target: string; probability: number; basis: string }>
  brokenRelationships: Array<{ source: string; target: string; probability: number; reason: string }>
  powerShifts: Array<{ entity: string; from: number; to: number; reason: string }>
  emergingCoalitions: Array<{ members: string[]; probability: number; basis: string }>
  fragmentationRisks: Array<{ description: string; probability: number; trigger: string }>
}

interface NetworkSnapshot {
  year: number
  nodes: PredictedNode[]
  links: PredictedLink[]
  metrics: NetworkMetrics
  changes: NetworkChanges
}

interface NetworkPredictionsData {
  currentNetwork: {
    nodes: PredictedNode[]
    links: PredictedLink[]
    metrics: NetworkMetrics
  }
  predictions: NetworkSnapshot[]
  simulationInfo: {
    currentYear: number
    totalYears: number
    scenario: string
  }
}

interface NetworkPredictionsPanelProps {
  simulationId: string
}

const roleColors: Record<string, string> = {
  ally: "#22c55e",
  funder: "#3b82f6",
  opposition: "#ef4444",
  regulator: "#8b5cf6",
  influencer: "#f59e0b",
  "affected-party": "#06b6d4",
  "service-provider": "#ec4899",
  researcher: "#6366f1",
  neutral: "#6b7280",
  unknown: "#9ca3af",
}

const statusColors = {
  rising: "text-green-600 bg-green-50 dark:bg-green-950/30",
  declining: "text-red-600 bg-red-50 dark:bg-red-950/30",
  stable: "text-muted-foreground bg-muted",
  new: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  departed: "text-gray-500 bg-gray-100 dark:bg-gray-800",
  strengthening: "text-green-600",
  weakening: "text-red-600",
  broken: "text-red-700",
}

export function NetworkPredictionsPanel({ simulationId }: NetworkPredictionsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<NetworkPredictionsData | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    async function fetchPredictions() {
      try {
        setLoading(true)
        const response = await fetch(`/api/simulations/${simulationId}/network-predictions`)
        if (!response.ok) throw new Error("Failed to fetch network predictions")
        const result = await response.json()
        setData(result)
        if (result.predictions?.length > 0) {
          setSelectedYear(1)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    fetchPredictions()
  }, [simulationId])

  // Animation loop for timeline playback
  useEffect(() => {
    if (!isPlaying || !data?.predictions.length) return

    const interval = setInterval(() => {
      setSelectedYear(prev => {
        const next = prev + 1
        if (next > data.predictions.length) {
          setIsPlaying(false)
          return data.predictions.length
        }
        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [isPlaying, data?.predictions.length])

  // Canvas network visualization
  const currentSnapshot = useMemo(() => {
    if (!data) return null
    if (selectedYear === 0) {
      return {
        year: data.simulationInfo.currentYear,
        nodes: data.currentNetwork.nodes,
        links: data.currentNetwork.links,
        metrics: data.currentNetwork.metrics,
        changes: { newRelationships: [], brokenRelationships: [], powerShifts: [], emergingCoalitions: [], fragmentationRisks: [] }
      }
    }
    return data.predictions[selectedYear - 1]
  }, [data, selectedYear])

  useEffect(() => {
    if (!canvasRef.current || !currentSnapshot) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    const width = rect.width
    const height = rect.height

    // Clear
    ctx.fillStyle = "hsl(var(--background))"
    ctx.fillRect(0, 0, width, height)

    const nodes = currentSnapshot.nodes
    const links = currentSnapshot.links

    if (nodes.length === 0) return

    // Simple force-directed layout approximation
    const positions = new Map<string, { x: number; y: number }>()
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35

    // Position nodes in a circle initially, grouped by role
    const roleGroups = new Map<string, string[]>()
    for (const node of nodes) {
      if (!roleGroups.has(node.role)) roleGroups.set(node.role, [])
      roleGroups.get(node.role)?.push(node.id)
    }

    let angleOffset = 0
    for (const [role, nodeIds] of roleGroups) {
      const angleStep = (2 * Math.PI * nodeIds.length) / nodes.length
      for (let i = 0; i < nodeIds.length; i++) {
        const angle = angleOffset + i * (angleStep / nodeIds.length)
        positions.set(nodeIds[i], {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        })
      }
      angleOffset += angleStep
    }

    // Draw links
    for (const link of links) {
      const source = positions.get(link.source)
      const target = positions.get(link.target)
      if (!source || !target) continue

      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)

      // Style based on status
      const strength = selectedYear === 0 ? link.strength : link.predictedStrength
      ctx.lineWidth = Math.max(1, strength * 3)
      
      if (link.status === "strengthening") {
        ctx.strokeStyle = "rgba(34, 197, 94, 0.6)"
      } else if (link.status === "weakening" || link.status === "broken") {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)"
        ctx.setLineDash([4, 4])
      } else if (link.status === "new") {
        ctx.strokeStyle = "rgba(59, 130, 246, 0.6)"
        ctx.setLineDash([2, 2])
      } else {
        ctx.strokeStyle = "rgba(156, 163, 175, 0.4)"
      }
      
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw nodes
    for (const node of nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue

      const influence = selectedYear === 0 ? node.influence : node.predictedInfluence
      const nodeRadius = Math.max(8, Math.min(20, influence / 5))
      const color = roleColors[node.role] || roleColors.unknown

      // Glow effect for rising/declining
      if (node.status === "rising") {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, nodeRadius + 4, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(34, 197, 94, 0.3)"
        ctx.fill()
      } else if (node.status === "declining") {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, nodeRadius + 4, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(239, 68, 68, 0.3)"
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.fillStyle = "hsl(var(--foreground))"
      ctx.font = "10px system-ui"
      ctx.textAlign = "center"
      ctx.fillText(
        node.name.length > 15 ? node.name.substring(0, 12) + "..." : node.name,
        pos.x,
        pos.y + nodeRadius + 12
      )
    }
  }, [currentSnapshot, selectedYear])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Generating network predictions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
            <p>{error || "No prediction data available"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { currentNetwork, predictions, simulationInfo } = data
  const hasRemainingYears = predictions.length > 0

  return (
    <div className="space-y-6">
      {/* Timeline Control */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Network Evolution Timeline
          </CardTitle>
          <CardDescription>
            Predicted network state from Year {simulationInfo.currentYear + 1} to Year {simulationInfo.totalYears}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Year selector */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(Math.max(0, selectedYear - 1))}
                disabled={selectedYear === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex-1">
                <Slider
                  value={[selectedYear]}
                  onValueChange={([v]) => setSelectedYear(v)}
                  max={predictions.length}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Current (Y{simulationInfo.currentYear})</span>
                  {predictions.map((p, i) => (
                    <span key={i} className={selectedYear === i + 1 ? "font-bold text-foreground" : ""}>
                      Y{p.year}
                    </span>
                  ))}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(Math.min(predictions.length, selectedYear + 1))}
                disabled={selectedYear === predictions.length}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isPlaying ? "secondary" : "default"}
                size="sm"
                onClick={() => {
                  if (!isPlaying && selectedYear === predictions.length) {
                    setSelectedYear(0)
                  }
                  setIsPlaying(!isPlaying)
                }}
                disabled={predictions.length === 0}
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {isPlaying ? "Pause" : "Play Timeline"}
              </Button>
            </div>

            {/* Current view indicator */}
            <div className="flex items-center gap-2">
              <Badge variant={selectedYear === 0 ? "default" : "secondary"}>
                {selectedYear === 0 ? `Current State (Year ${simulationInfo.currentYear})` : 
                  `Predicted Year ${currentSnapshot?.year || simulationInfo.currentYear + selectedYear}`}
              </Badge>
              {selectedYear > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedYear} year{selectedYear > 1 ? "s" : ""} ahead
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Visualization + Changes */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Network Graph */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              {selectedYear === 0 ? "Current Network" : `Predicted Network (Year ${currentSnapshot?.year})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <canvas 
                ref={canvasRef} 
                className="w-full h-[400px] rounded-lg border bg-background"
              />
              
              {/* Legend */}
              <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg border">
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(roleColors).slice(0, 6).map(([role, color]) => (
                    <div key={role} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="capitalize">{role.replace("-", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics & Changes */}
        <div className="space-y-4">
          {/* Network Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Network Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricRow 
                label="Density" 
                current={currentNetwork.metrics.density}
                predicted={currentSnapshot?.metrics.density}
                format={(v) => `${(v * 100).toFixed(1)}%`}
                showChange={selectedYear > 0}
              />
              <MetricRow 
                label="Avg. Degree" 
                current={currentNetwork.metrics.averageDegree}
                predicted={currentSnapshot?.metrics.averageDegree}
                format={(v) => v.toFixed(1)}
                showChange={selectedYear > 0}
              />
              <MetricRow 
                label="Coalition Strength" 
                current={currentNetwork.metrics.coalitionStrength}
                predicted={currentSnapshot?.metrics.coalitionStrength}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                showChange={selectedYear > 0}
              />
              <MetricRow 
                label="Polarization" 
                current={currentNetwork.metrics.polarization}
                predicted={currentSnapshot?.metrics.polarization}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                showChange={selectedYear > 0}
                inverse
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Entities</CardTitle>
            </CardHeader>
            <CardContent>
              {currentSnapshot && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Rising
                    </span>
                    <span className="font-medium">
                      {currentSnapshot.nodes.filter(n => n.status === "rising").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-muted-foreground" />
                      Stable
                    </span>
                    <span className="font-medium">
                      {currentSnapshot.nodes.filter(n => n.status === "stable").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Declining
                    </span>
                    <span className="font-medium">
                      {currentSnapshot.nodes.filter(n => n.status === "declining").length}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Predicted Changes Detail */}
      {selectedYear > 0 && currentSnapshot && (
        <Tabs defaultValue="power" className="space-y-4">
          <TabsList>
            <TabsTrigger value="power" className="gap-2">
              <Zap className="h-4 w-4" />
              Power Shifts
            </TabsTrigger>
            <TabsTrigger value="relationships" className="gap-2">
              <Link2 className="h-4 w-4" />
              Relationships
            </TabsTrigger>
            <TabsTrigger value="coalitions" className="gap-2">
              <Users className="h-4 w-4" />
              Coalitions
            </TabsTrigger>
            <TabsTrigger value="risks" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="power">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Predicted Power Shifts</CardTitle>
                <CardDescription>
                  Entities expected to gain or lose influence by Year {currentSnapshot.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSnapshot.changes.powerShifts.length === 0 ? (
                  <p className="text-muted-foreground">No significant power shifts predicted</p>
                ) : (
                  <div className="space-y-3">
                    {currentSnapshot.changes.powerShifts.map((shift, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium">{shift.entity}</div>
                          <div className="text-sm text-muted-foreground">{shift.reason}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{shift.from}</span>
                          <span>→</span>
                          <span className={shift.to > shift.from ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {shift.to}
                          </span>
                          {shift.to > shift.from ? 
                            <TrendingUp className="h-4 w-4 text-green-600" /> : 
                            <TrendingDown className="h-4 w-4 text-red-600" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-green-600" />
                    New Relationships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentSnapshot.changes.newRelationships.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No new relationships predicted</p>
                  ) : (
                    <div className="space-y-2">
                      {currentSnapshot.changes.newRelationships.map((rel, i) => (
                        <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div className="font-medium text-sm">
                            {rel.source} ↔ {rel.target}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {rel.basis} ({Math.round(rel.probability * 100)}% likely)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Unlink className="h-5 w-5 text-red-600" />
                    At-Risk Relationships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentSnapshot.changes.brokenRelationships.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No relationships at risk</p>
                  ) : (
                    <div className="space-y-2">
                      {currentSnapshot.changes.brokenRelationships.map((rel, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                          <div className="font-medium text-sm">
                            {rel.source} ↔ {rel.target}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {rel.reason} ({Math.round(rel.probability * 100)}% risk)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="coalitions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emerging Coalitions</CardTitle>
                <CardDescription>
                  Groups predicted to form or strengthen by Year {currentSnapshot.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSnapshot.changes.emergingCoalitions.length === 0 ? (
                  <p className="text-muted-foreground">No new coalitions predicted</p>
                ) : (
                  <div className="space-y-3">
                    {currentSnapshot.changes.emergingCoalitions.map((coalition, i) => (
                      <div key={i} className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-wrap gap-1">
                            {coalition.members.map((member, j) => (
                              <Badge key={j} variant="secondary">{member}</Badge>
                            ))}
                          </div>
                          <Badge variant="outline">
                            {Math.round(coalition.probability * 100)}% likely
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {coalition.basis}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Fragmentation Risks
                </CardTitle>
                <CardDescription>
                  Potential threats to network cohesion
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSnapshot.changes.fragmentationRisks.length === 0 ? (
                  <p className="text-muted-foreground">No significant fragmentation risks detected</p>
                ) : (
                  <div className="space-y-3">
                    {currentSnapshot.changes.fragmentationRisks.map((risk, i) => (
                      <div key={i} className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                        <div className="font-medium">{risk.description}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Trigger: {risk.trigger}
                        </div>
                        <div className="mt-2">
                          <Badge variant={risk.probability > 0.5 ? "destructive" : "secondary"}>
                            {Math.round(risk.probability * 100)}% probability
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function MetricRow({ 
  label, 
  current, 
  predicted, 
  format, 
  showChange,
  inverse = false
}: { 
  label: string
  current: number
  predicted?: number
  format: (v: number) => string
  showChange: boolean
  inverse?: boolean
}) {
  const change = predicted !== undefined ? predicted - current : 0
  const isPositive = inverse ? change < 0 : change > 0
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {showChange && predicted !== undefined ? (
          <>
            <span className="text-sm line-through text-muted-foreground">{format(current)}</span>
            <span className="font-medium">{format(predicted)}</span>
            {Math.abs(change) > 0.01 && (
              isPositive ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </>
        ) : (
          <span className="font-medium">{format(current)}</span>
        )}
      </div>
    </div>
  )
}
