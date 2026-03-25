"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  Target, 
  TrendingUp,
  TrendingDown,
  Link2,
  Unlink,
  Scale,
  Zap,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2
} from "lucide-react"

interface NetworkHealthData {
  vulnerabilities: {
    singlePointsOfFailure: Array<{
      entityId: string
      entityName: string
      dependentConnections: number
      riskLevel: "critical" | "high" | "medium" | "low"
      description: string
    }>
    fragmentationRisk: {
      score: number
      criticalLinks: Array<{
        source: string
        target: string
        removingCausesFragments: number
      }>
    }
    isolatedEntities: Array<{
      entityId: string
      entityName: string
      type: string
    }>
  }
  coalitionReadiness: {
    score: number
    existingCoalitions: Array<{
      members: string[]
      strength: number
      basis: string
    }>
    potentialCoalitions: Array<{
      members: string[]
      likelihood: number
      basis: string
      blockers: string[]
    }>
    minimumWinningCoalition: {
      size: number
      possibleCombinations: number
      easiestPath: string[]
    }
    swingActors: Array<{
      entityId: string
      entityName: string
      influence: number
      currentStance: string
      persuadability: number
    }>
  }
  powerAnalysis: {
    giniCoefficient: number
    powerConcentration: "highly concentrated" | "moderately concentrated" | "distributed"
    gatekeepers: Array<{
      entityId: string
      entityName: string
      controlsFlowBetween: string[]
    }>
    hiddenInfluencers: Array<{
      entityId: string
      entityName: string
      betweennessCentrality: number
      publicVisibility: "low" | "medium" | "high"
    }>
    structuralHoles: Array<{
      between: string[]
      opportunity: string
    }>
  }
  opportunityMap: {
    underconnectedAllies: Array<{
      entityId: string
      entityName: string
      currentConnections: number
      potentialConnections: string[]
    }>
    bridgeOpportunities: Array<{
      from: string
      to: string
      benefit: string
    }>
    dormantRelationships: Array<{
      entities: string[]
      lastActive: string
      reactivationPotential: number
    }>
  }
  overallHealthScore: number
  recommendations: Array<{
    priority: "high" | "medium" | "low"
    category: string
    action: string
    expectedImpact: string
  }>
}

interface NetworkHealthDashboardProps {
  communityId: string
}

export function NetworkHealthDashboard({ communityId }: NetworkHealthDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [healthData, setHealthData] = useState<NetworkHealthData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHealthData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/communities/${communityId}/network-health`)
        if (!response.ok) throw new Error("Failed to fetch network health")
        const data = await response.json()
        setHealthData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    fetchHealthData()
  }, [communityId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing network health...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !healthData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p>{error || "No health data available"}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const healthScore = healthData.overallHealthScore
  const healthColor = healthScore >= 70 ? "text-green-600" : healthScore >= 40 ? "text-amber-600" : "text-red-600"
  const healthBg = healthScore >= 70 ? "bg-green-500" : healthScore >= 40 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Network Health Score
          </CardTitle>
          <CardDescription>
            Overall assessment of network resilience and strategic readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <div className={`text-5xl font-bold ${healthColor}`}>
                {healthScore}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
            <div className="flex-1 space-y-3">
              <Progress value={healthScore} className="h-3" />
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Critical (0-25)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>At Risk (26-50)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Fair (51-70)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Healthy (71-100)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vulnerabilities" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="vulnerabilities" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden md:inline">Vulnerabilities</span>
          </TabsTrigger>
          <TabsTrigger value="coalitions" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Coalitions</span>
          </TabsTrigger>
          <TabsTrigger value="power" className="gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden md:inline">Power</span>
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden md:inline">Opportunities</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden md:inline">Actions</span>
          </TabsTrigger>
        </TabsList>

        {/* Vulnerabilities Tab */}
        <TabsContent value="vulnerabilities" className="space-y-4">
          {/* Single Points of Failure */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Unlink className="h-5 w-5 text-red-500" />
                Single Points of Failure
              </CardTitle>
              <CardDescription>
                Entities whose removal would significantly fragment the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.vulnerabilities.singlePointsOfFailure.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>No critical single points of failure detected</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {healthData.vulnerabilities.singlePointsOfFailure.map((spof, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{spof.entityName}</div>
                        <div className="text-sm text-muted-foreground">{spof.description}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {spof.dependentConnections} dependent connections
                        </div>
                        <Badge variant={spof.riskLevel === "critical" ? "destructive" : spof.riskLevel === "high" ? "default" : "secondary"}>
                          {spof.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fragmentation Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-amber-500" />
                Fragmentation Risk
              </CardTitle>
              <CardDescription>
                How likely the network is to break into isolated groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">
                    {Math.round(healthData.vulnerabilities.fragmentationRisk.score * 100)}%
                  </div>
                  <Progress 
                    value={healthData.vulnerabilities.fragmentationRisk.score * 100} 
                    className="flex-1 h-2"
                  />
                </div>
                {healthData.vulnerabilities.fragmentationRisk.criticalLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Critical Links (if broken, causes fragmentation):</p>
                    {healthData.vulnerabilities.fragmentationRisk.criticalLinks.slice(0, 3).map((link, i) => (
                      <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{link.source}</span>
                        <span>↔</span>
                        <span>{link.target}</span>
                        <span className="text-red-500">({link.removingCausesFragments} fragments)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Isolated Entities */}
          {healthData.vulnerabilities.isolatedEntities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  Isolated Entities
                </CardTitle>
                <CardDescription>
                  Entities with no or very few connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {healthData.vulnerabilities.isolatedEntities.map((entity, i) => (
                    <Badge key={i} variant="outline">
                      {entity.entityName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Coalitions Tab */}
        <TabsContent value="coalitions" className="space-y-4">
          {/* Coalition Readiness Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coalition Readiness</CardTitle>
              <CardDescription>
                How prepared the network is for collective action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl font-bold">
                  {Math.round(healthData.coalitionReadiness.score * 100)}%
                </div>
                <Progress 
                  value={healthData.coalitionReadiness.score * 100} 
                  className="flex-1 h-2"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Existing Coalitions */}
                <div className="space-y-2">
                  <h4 className="font-medium">Existing Coalitions</h4>
                  {healthData.coalitionReadiness.existingCoalitions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No formal coalitions detected</p>
                  ) : (
                    healthData.coalitionReadiness.existingCoalitions.map((coalition, i) => (
                      <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="text-sm font-medium">{coalition.members.join(", ")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Basis: {coalition.basis} | Strength: {Math.round(coalition.strength * 100)}%
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Potential Coalitions */}
                <div className="space-y-2">
                  <h4 className="font-medium">Potential Coalitions</h4>
                  {healthData.coalitionReadiness.potentialCoalitions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No potential coalitions identified</p>
                  ) : (
                    healthData.coalitionReadiness.potentialCoalitions.slice(0, 3).map((coalition, i) => (
                      <div key={i} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <div className="text-sm font-medium">{coalition.members.join(", ")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Likelihood: {Math.round(coalition.likelihood * 100)}% | {coalition.basis}
                        </div>
                        {coalition.blockers.length > 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            Blockers: {coalition.blockers.join(", ")}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swing Actors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Swing Actors
              </CardTitle>
              <CardDescription>
                Influential entities that could tip the balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.coalitionReadiness.swingActors.map((actor, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">{actor.entityName}</div>
                      <div className="text-sm text-muted-foreground">
                        Current stance: <span className="capitalize">{actor.currentStance}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm">Influence</div>
                        <div className="font-medium">{Math.round(actor.influence * 100)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">Persuadability</div>
                        <div className="font-medium text-amber-600">
                          {Math.round(actor.persuadability * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Minimum Winning Coalition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Minimum Winning Coalition</CardTitle>
              <CardDescription>
                The smallest group needed to achieve majority influence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-8">
                  <div>
                    <div className="text-3xl font-bold">
                      {healthData.coalitionReadiness.minimumWinningCoalition.size}
                    </div>
                    <div className="text-sm text-muted-foreground">entities needed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      {healthData.coalitionReadiness.minimumWinningCoalition.possibleCombinations}
                    </div>
                    <div className="text-sm text-muted-foreground">possible combinations</div>
                  </div>
                </div>
                {healthData.coalitionReadiness.minimumWinningCoalition.easiestPath.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Easiest Path:</p>
                    <div className="flex flex-wrap gap-2">
                      {healthData.coalitionReadiness.minimumWinningCoalition.easiestPath.map((entity, i) => (
                        <Badge key={i} variant="secondary">{entity}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Power Analysis Tab */}
        <TabsContent value="power" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Power Distribution</CardTitle>
              <CardDescription>
                How evenly power is distributed across the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8 mb-6">
                <div>
                  <div className="text-3xl font-bold">
                    {healthData.powerAnalysis.giniCoefficient.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Gini Coefficient</div>
                </div>
                <Badge 
                  variant={healthData.powerAnalysis.powerConcentration === "highly concentrated" ? "destructive" : 
                    healthData.powerAnalysis.powerConcentration === "distributed" ? "default" : "secondary"}
                  className="text-sm"
                >
                  {healthData.powerAnalysis.powerConcentration}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {healthData.powerAnalysis.giniCoefficient < 0.3 ? 
                  "Power is relatively evenly distributed across entities." :
                  healthData.powerAnalysis.giniCoefficient < 0.5 ?
                  "Moderate inequality in power distribution exists." :
                  "Power is highly concentrated among a few entities."}
              </p>
            </CardContent>
          </Card>

          {/* Gatekeepers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Gatekeepers
              </CardTitle>
              <CardDescription>
                Entities that control information/resource flow between groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.powerAnalysis.gatekeepers.map((gk, i) => (
                  <div key={i} className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div className="font-medium">{gk.entityName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Controls flow between: {gk.controlsFlowBetween.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hidden Influencers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-500" />
                Hidden Influencers
              </CardTitle>
              <CardDescription>
                High structural importance but low public visibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.powerAnalysis.hiddenInfluencers.map((hi, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="font-medium">{hi.entityName}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Centrality: </span>
                        <span className="font-medium">{(hi.betweennessCentrality * 100).toFixed(0)}%</span>
                      </div>
                      <Badge variant="outline">
                        {hi.publicVisibility} visibility
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Structural Holes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Structural Holes (Opportunities)</CardTitle>
              <CardDescription>
                Gaps in the network where you could become a valuable bridge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.powerAnalysis.structuralHoles.map((hole, i) => (
                  <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="font-medium">
                      Gap between: {hole.between.join(" and ")}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Opportunity: {hole.opportunity}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          {/* Underconnected Allies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Underconnected Allies
              </CardTitle>
              <CardDescription>
                Friendly entities that could be better integrated into the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.opportunityMap.underconnectedAllies.map((ally, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{ally.entityName}</div>
                      <Badge variant="outline">
                        {ally.currentConnections} current connections
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Could connect with: {ally.potentialConnections.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bridge Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-500" />
                Bridge Opportunities
              </CardTitle>
              <CardDescription>
                New connections that would significantly strengthen the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.opportunityMap.bridgeOpportunities.map((bridge, i) => (
                  <div key={i} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{bridge.from}</span>
                      <span>→</span>
                      <span className="font-medium">{bridge.to}</span>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">
                      {bridge.benefit}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dormant Relationships */}
          {healthData.opportunityMap.dormantRelationships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-amber-500" />
                  Dormant Relationships
                </CardTitle>
                <CardDescription>
                  Past connections that could be reactivated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthData.opportunityMap.dormantRelationships.map((rel, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{rel.entities.join(" ↔ ")}</div>
                        <div className="text-sm text-muted-foreground">
                          Last active: {rel.lastActive}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Reactivation potential</div>
                        <div className="font-medium text-green-600">
                          {Math.round(rel.reactivationPotential * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Strategic Recommendations
              </CardTitle>
              <CardDescription>
                Prioritized actions to strengthen the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthData.recommendations.map((rec, i) => (
                  <div 
                    key={i} 
                    className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === "high" ? "border-red-500 bg-red-50 dark:bg-red-950/20" :
                      rec.priority === "medium" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" :
                      "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                        {rec.priority} priority
                      </Badge>
                      <Badge variant="outline">{rec.category}</Badge>
                    </div>
                    <div className="font-medium mb-1">{rec.action}</div>
                    <div className="text-sm text-muted-foreground">
                      Expected impact: {rec.expectedImpact}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
