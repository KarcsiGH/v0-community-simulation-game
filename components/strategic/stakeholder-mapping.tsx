"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Users, Grid3X3, GitMerge, Shield, Loader2, Target,
  ArrowRight, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Minus, Eye, Star
} from "lucide-react"

interface Stakeholder {
  id: string
  name: string
  type: string
  power: number // 0-100
  interest: number // 0-100
  position: "supporter" | "opponent" | "neutral" | "swing"
  influence: number
  influencedBy: string[]
  influences: string[]
  coalitionPotential: number
  resources: number
  decisionMakingPower: number
}

interface Coalition {
  id: string
  name: string
  members: string[]
  strength: number
  feasibility: number
  barriers: string[]
  enablers: string[]
  type: "existing" | "potential" | "recommended"
}

interface OppositionGroup {
  id: string
  name: string
  members: string[]
  strength: number
  cohesion: number
  strategies: string[]
  vulnerabilities: string[]
  counterStrategies: string[]
}

interface StakeholderMappingProps {
  communityId: string
  simulationId?: string
}

export function StakeholderMapping({ communityId, simulationId }: StakeholderMappingProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [coalitions, setCoalitions] = useState<Coalition[]>([])
  const [oppositionGroups, setOppositionGroups] = useState<OppositionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchStakeholderData()
  }, [communityId, simulationId])

  const fetchStakeholderData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/communities/${communityId}/stakeholder-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulation_id: simulationId }),
      })

      if (response.ok) {
        const data = await response.json()
        setStakeholders(data.stakeholders || [])
        setCoalitions(data.coalitions || [])
        setOppositionGroups(data.oppositionGroups || [])
      }
    } catch (error) {
      console.error("Error fetching stakeholder data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case "supporter": return "bg-green-500"
      case "opponent": return "bg-red-500"
      case "swing": return "bg-amber-500"
      default: return "bg-gray-400"
    }
  }

  const getPositionBadge = (position: string) => {
    switch (position) {
      case "supporter": return "bg-green-100 text-green-700"
      case "opponent": return "bg-red-100 text-red-700"
      case "swing": return "bg-amber-100 text-amber-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getQuadrantLabel = (power: number, interest: number) => {
    if (power >= 50 && interest >= 50) return "Manage Closely"
    if (power >= 50 && interest < 50) return "Keep Satisfied"
    if (power < 50 && interest >= 50) return "Keep Informed"
    return "Monitor"
  }

  const getQuadrantColor = (power: number, interest: number) => {
    if (power >= 50 && interest >= 50) return "bg-red-50 border-red-200"
    if (power >= 50 && interest < 50) return "bg-amber-50 border-amber-200"
    if (power < 50 && interest >= 50) return "bg-blue-50 border-blue-200"
    return "bg-gray-50 border-gray-200"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing stakeholders...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Stakeholder Mapping
        </CardTitle>
        <CardDescription>
          Power/interest analysis, influence mapping, and coalition assessment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="power-interest" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="power-interest" className="gap-1">
              <Grid3X3 className="w-4 h-4" />
              Power/Interest
            </TabsTrigger>
            <TabsTrigger value="influence" className="gap-1">
              <GitMerge className="w-4 h-4" />
              Influence Map
            </TabsTrigger>
            <TabsTrigger value="coalitions" className="gap-1">
              <Users className="w-4 h-4" />
              Coalitions
            </TabsTrigger>
            <TabsTrigger value="opposition" className="gap-1">
              <Shield className="w-4 h-4" />
              Opposition
            </TabsTrigger>
          </TabsList>

          {/* Power/Interest Grid */}
          <TabsContent value="power-interest" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* The Grid */}
              <div className="lg:col-span-2">
                <div className="relative border rounded-lg p-4" ref={gridRef}>
                  {/* Axis Labels */}
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-muted-foreground">
                    POWER
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground">
                    INTEREST
                  </div>

                  {/* Grid Background */}
                  <div className="grid grid-cols-2 grid-rows-2 aspect-square">
                    <div className="border-r border-b p-2 bg-amber-50/50">
                      <span className="text-xs text-amber-700 font-medium">Keep Satisfied</span>
                    </div>
                    <div className="border-b p-2 bg-red-50/50">
                      <span className="text-xs text-red-700 font-medium">Manage Closely</span>
                    </div>
                    <div className="border-r p-2 bg-gray-50/50">
                      <span className="text-xs text-gray-600 font-medium">Monitor</span>
                    </div>
                    <div className="p-2 bg-blue-50/50">
                      <span className="text-xs text-blue-700 font-medium">Keep Informed</span>
                    </div>

                    {/* Stakeholder Dots */}
                    {stakeholders.map((s) => (
                      <div
                        key={s.id}
                        className={`absolute w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-150 ${getPositionColor(s.position)} ring-2 ring-white shadow-md`}
                        style={{
                          left: `calc(${s.interest}% - 8px)`,
                          bottom: `calc(${s.power}% - 8px)`,
                        }}
                        title={s.name}
                        onClick={() => setSelectedStakeholder(s)}
                      />
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Supporter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Opponent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Swing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-sm">Neutral</span>
                  </div>
                </div>
              </div>

              {/* Selected Stakeholder Details */}
              <div>
                {selectedStakeholder ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {selectedStakeholder.name}
                        <Badge className={getPositionBadge(selectedStakeholder.position)}>
                          {selectedStakeholder.position}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{selectedStakeholder.type}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Power</p>
                          <div className="flex items-center gap-2">
                            <Progress value={selectedStakeholder.power} className="h-2" />
                            <span className="text-sm font-medium">{selectedStakeholder.power}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest</p>
                          <div className="flex items-center gap-2">
                            <Progress value={selectedStakeholder.interest} className="h-2" />
                            <span className="text-sm font-medium">{selectedStakeholder.interest}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg" style={{
                        backgroundColor: selectedStakeholder.power >= 50 && selectedStakeholder.interest >= 50 ? 'rgb(254 242 242)' :
                          selectedStakeholder.power >= 50 ? 'rgb(255 251 235)' :
                          selectedStakeholder.interest >= 50 ? 'rgb(239 246 255)' : 'rgb(249 250 251)'
                      }}>
                        <p className="text-sm font-medium">
                          Strategy: {getQuadrantLabel(selectedStakeholder.power, selectedStakeholder.interest)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Resources</p>
                        <Progress value={selectedStakeholder.resources} className="h-2" />
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Decision-Making Power</p>
                        <Progress value={selectedStakeholder.decisionMakingPower} className="h-2" />
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Coalition Potential</p>
                        <Progress value={selectedStakeholder.coalitionPotential} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Click a stakeholder dot to see details
                  </div>
                )}
              </div>
            </div>

            {/* Stakeholder List by Quadrant */}
            <div className="grid md:grid-cols-4 gap-4 mt-6">
              {[
                { label: "Manage Closely", filter: (s: Stakeholder) => s.power >= 50 && s.interest >= 50, color: "text-red-700" },
                { label: "Keep Satisfied", filter: (s: Stakeholder) => s.power >= 50 && s.interest < 50, color: "text-amber-700" },
                { label: "Keep Informed", filter: (s: Stakeholder) => s.power < 50 && s.interest >= 50, color: "text-blue-700" },
                { label: "Monitor", filter: (s: Stakeholder) => s.power < 50 && s.interest < 50, color: "text-gray-600" },
              ].map((quadrant) => {
                const filtered = stakeholders.filter(quadrant.filter)
                return (
                  <div key={quadrant.label}>
                    <p className={`text-sm font-medium mb-2 ${quadrant.color}`}>
                      {quadrant.label} ({filtered.length})
                    </p>
                    <div className="space-y-1">
                      {filtered.slice(0, 5).map(s => (
                        <div 
                          key={s.id} 
                          className="text-sm flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                          onClick={() => setSelectedStakeholder(s)}
                        >
                          <div className={`w-2 h-2 rounded-full ${getPositionColor(s.position)}`} />
                          {s.name}
                        </div>
                      ))}
                      {filtered.length > 5 && (
                        <p className="text-xs text-muted-foreground">+{filtered.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Influence Mapping */}
          <TabsContent value="influence" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Influencers */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Top Influencers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stakeholders
                      .sort((a, b) => b.influence - a.influence)
                      .slice(0, 8)
                      .map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{s.name}</span>
                              <Badge className={getPositionBadge(s.position)} variant="secondary">
                                {s.position}
                              </Badge>
                            </div>
                            <Progress value={s.influence} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Influence Network */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitMerge className="w-4 h-4" />
                    Influence Flows
                  </CardTitle>
                  <CardDescription>Who influences whom</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stakeholders
                      .filter(s => s.influences.length > 0)
                      .slice(0, 6)
                      .map(s => (
                        <div key={s.id} className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getPositionColor(s.position)}`} />
                            {s.name}
                          </p>
                          <div className="pl-4 flex flex-wrap gap-1">
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            {s.influences.slice(0, 4).map((influenced, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {influenced}
                              </Badge>
                            ))}
                            {s.influences.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{s.influences.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Influence by Position */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Influence by Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {["supporter", "opponent", "swing", "neutral"].map(position => {
                    const positionStakeholders = stakeholders.filter(s => s.position === position)
                    const totalInfluence = positionStakeholders.reduce((sum, s) => sum + s.influence, 0)
                    const avgInfluence = positionStakeholders.length > 0 
                      ? totalInfluence / positionStakeholders.length 
                      : 0
                    
                    return (
                      <div key={position} className="text-center p-4 rounded-lg bg-muted">
                        <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getPositionColor(position)}`} />
                        <p className="text-2xl font-bold">{positionStakeholders.length}</p>
                        <p className="text-xs text-muted-foreground capitalize">{position}s</p>
                        <p className="text-sm mt-2">
                          Avg Influence: {Math.round(avgInfluence)}%
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coalition Feasibility */}
          <TabsContent value="coalitions" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Existing Coalitions */}
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Existing Coalitions
                </h4>
                <div className="space-y-3">
                  {coalitions.filter(c => c.type === "existing").map(coalition => (
                    <Card key={coalition.id}>
                      <CardContent className="pt-4">
                        <p className="font-medium mb-2">{coalition.name}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {coalition.members.map((member, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {member}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Strength</span>
                            <span>{coalition.strength}%</span>
                          </div>
                          <Progress value={coalition.strength} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {coalitions.filter(c => c.type === "existing").length === 0 && (
                    <p className="text-sm text-muted-foreground">No existing coalitions identified</p>
                  )}
                </div>
              </div>

              {/* Potential Coalitions */}
              <div>
                <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Potential Coalitions
                </h4>
                <div className="space-y-3">
                  {coalitions.filter(c => c.type === "potential").map(coalition => (
                    <Card key={coalition.id}>
                      <CardContent className="pt-4">
                        <p className="font-medium mb-2">{coalition.name}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {coalition.members.map((member, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {member}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs">
                              <span>Feasibility</span>
                              <span>{coalition.feasibility}%</span>
                            </div>
                            <Progress value={coalition.feasibility} className="h-1.5" />
                          </div>
                          {coalition.barriers.length > 0 && (
                            <div>
                              <p className="text-xs text-red-600 mb-1">Barriers:</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {coalition.barriers.slice(0, 2).map((b, i) => (
                                  <li key={i}>• {b}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recommended Coalitions */}
              <div>
                <h4 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Recommended
                </h4>
                <div className="space-y-3">
                  {coalitions.filter(c => c.type === "recommended").map(coalition => (
                    <Card key={coalition.id} className="border-purple-200 bg-purple-50/50">
                      <CardContent className="pt-4">
                        <p className="font-medium mb-2">{coalition.name}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {coalition.members.map((member, i) => (
                            <Badge key={i} className="text-xs bg-purple-100 text-purple-700">
                              {member}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs">
                              <span>Projected Strength</span>
                              <span>{coalition.strength}%</span>
                            </div>
                            <Progress value={coalition.strength} className="h-1.5" />
                          </div>
                          {coalition.enablers.length > 0 && (
                            <div>
                              <p className="text-xs text-green-600 mb-1">Enablers:</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {coalition.enablers.slice(0, 2).map((e, i) => (
                                  <li key={i}>• {e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Opposition Assessment */}
          <TabsContent value="opposition" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {oppositionGroups.map(group => (
                <Card key={group.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-500" />
                        {group.name}
                      </CardTitle>
                      <Badge variant="destructive">
                        Strength: {group.strength}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Members */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Members</p>
                      <div className="flex flex-wrap gap-1">
                        {group.members.map((member, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-red-200">
                            {member}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Cohesion */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Cohesion</span>
                        <span>{group.cohesion}%</span>
                      </div>
                      <Progress value={group.cohesion} className="h-1.5" />
                    </div>

                    {/* Their Strategies */}
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">Their Likely Strategies</p>
                      <ul className="text-sm space-y-1">
                        {group.strategies.map((strategy, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-1 text-red-500" />
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Vulnerabilities */}
                    <div>
                      <p className="text-xs font-medium text-amber-600 mb-1">Their Vulnerabilities</p>
                      <ul className="text-sm space-y-1">
                        {group.vulnerabilities.map((vuln, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Target className="w-3 h-3 mt-1 text-amber-500" />
                            {vuln}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Counter-Strategies */}
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-green-600 mb-1">Recommended Counter-Strategies</p>
                      <ul className="text-sm space-y-1">
                        {group.counterStrategies.map((counter, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 mt-1 text-green-500" />
                            {counter}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {oppositionGroups.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No significant opposition groups identified</p>
                </div>
              )}
            </div>

            {/* Opposition Summary */}
            {oppositionGroups.length > 0 && (
              <Card className="bg-red-50/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-red-700 mb-2">Opposition Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {oppositionGroups.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Opposition Groups</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {oppositionGroups.reduce((sum, g) => sum + g.members.length, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Opponents</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {Math.round(oppositionGroups.reduce((sum, g) => sum + g.strength, 0) / oppositionGroups.length)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Strength</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
