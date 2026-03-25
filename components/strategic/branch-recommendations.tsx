"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  GitBranch, Building2, Users, Network, Trophy, Medal,
  ArrowRight, Calendar, Loader2, Target, Shield, Handshake,
  TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp
} from "lucide-react"

interface BranchPrediction {
  branchId: string
  branchName: string
  probability: number
  rank: number
  yearByYearRecommendations: {
    year: number
    calendarYear: number
    individual: {
      actions: string[]
      risks: string[]
      opportunities: string[]
      keyMetrics: { name: string; target: string }[]
    }
    coalition: {
      actions: string[]
      partnersToEngage: string[]
      coalitionRisks: string[]
      collectiveGoals: string[]
    }
    network: {
      actions: string[]
      bridgesToBuild: string[]
      networkVulnerabilities: string[]
      systemicChanges: string[]
    }
  }[]
  overallSummary: {
    individual: string
    coalition: string
    network: string
  }
  keyDifferentiators: string[]
}

interface BranchRecommendationsProps {
  simulationId: string
  focalEntityId?: string
  focalEntityName?: string
  startingYear?: number
}

export function BranchRecommendations({ 
  simulationId, 
  focalEntityId,
  focalEntityName = "Your Organization",
  startingYear = 2026
}: BranchRecommendationsProps) {
  const [predictions, setPredictions] = useState<BranchPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFocus, setSelectedFocus] = useState<"individual" | "coalition" | "network">("individual")
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1]))

  useEffect(() => {
    fetchPredictions()
  }, [simulationId])

  const fetchPredictions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/simulations/${simulationId}/branch-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focal_entity_id: focalEntityId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPredictions(data.predictions || [])
        if (data.predictions?.length > 0) {
          setSelectedBranch(data.predictions[0].branchId)
        }
      }
    } catch (error) {
      console.error("Error fetching predictions:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2: return <Medal className="w-5 h-5 text-gray-400" />
      case 3: return <Medal className="w-5 h-5 text-amber-600" />
      default: return <span className="text-sm font-medium">#{rank}</span>
    }
  }

  const getFocusIcon = (focus: string) => {
    switch (focus) {
      case "individual": return <Building2 className="w-4 h-4" />
      case "coalition": return <Users className="w-4 h-4" />
      case "network": return <Network className="w-4 h-4" />
      default: return null
    }
  }

  const selectedPrediction = predictions.find(p => p.branchId === selectedBranch)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing branches and generating recommendations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Strategic Branch Recommendations
        </CardTitle>
        <CardDescription>
          Top probability branches with year-by-year recommendations for {focalEntityName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Branch Probability Overview */}
        <div className="grid gap-3">
          <h4 className="text-sm font-medium text-muted-foreground">Branch Probability Ranking</h4>
          {predictions.slice(0, 3).map((prediction) => (
            <div 
              key={prediction.branchId}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedBranch === prediction.branchId 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setSelectedBranch(prediction.branchId)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getRankIcon(prediction.rank)}
                  <span className="font-medium">{prediction.branchName}</span>
                </div>
                <span className="text-2xl font-bold">
                  {Math.round(prediction.probability * 100)}%
                </span>
              </div>
              <Progress value={prediction.probability * 100} className="h-2" />
              {prediction.keyDifferentiators.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {prediction.keyDifferentiators.slice(0, 3).map((diff, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {diff}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Focus Selector */}
        {selectedPrediction && (
          <>
            <div className="flex items-center gap-4 pt-4 border-t">
              <span className="text-sm font-medium">Recommendation Focus:</span>
              <Tabs value={selectedFocus} onValueChange={(v) => setSelectedFocus(v as any)}>
                <TabsList>
                  <TabsTrigger value="individual" className="gap-1">
                    <Building2 className="w-4 h-4" />
                    Individual Org
                  </TabsTrigger>
                  <TabsTrigger value="coalition" className="gap-1">
                    <Users className="w-4 h-4" />
                    Coalition
                  </TabsTrigger>
                  <TabsTrigger value="network" className="gap-1">
                    <Network className="w-4 h-4" />
                    Full Network
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Overall Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium mb-1">
                      {selectedFocus === "individual" && "Individual Strategy Summary"}
                      {selectedFocus === "coalition" && "Coalition Strategy Summary"}
                      {selectedFocus === "network" && "Network Strategy Summary"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPrediction.overallSummary[selectedFocus]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Year-by-Year Recommendations */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Year-by-Year Action Plan</h4>
              {selectedPrediction.yearByYearRecommendations.map((yearRec) => {
                const isExpanded = expandedYears.has(yearRec.year)
                const focusData = yearRec[selectedFocus]
                
                return (
                  <Card key={yearRec.year}>
                    <div 
                      className="p-4 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleYear(yearRec.year)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Year {yearRec.year}</p>
                          <p className="text-sm text-muted-foreground">{yearRec.calendarYear}</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    {isExpanded && (
                      <CardContent className="pt-0 pb-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Actions */}
                          <div>
                            <p className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                              <ArrowRight className="w-4 h-4" />
                              Priority Actions
                            </p>
                            <ul className="space-y-1">
                              {focusData.actions.map((action, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Risks */}
                          <div>
                            <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              {selectedFocus === "individual" && "Key Risks"}
                              {selectedFocus === "coalition" && "Coalition Risks"}
                              {selectedFocus === "network" && "Network Vulnerabilities"}
                            </p>
                            <ul className="space-y-1">
                              {(selectedFocus === "individual" ? focusData.risks :
                                selectedFocus === "coalition" ? (focusData as any).coalitionRisks :
                                (focusData as any).networkVulnerabilities
                              )?.map((risk: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Opportunities / Partners / Bridges */}
                          <div>
                            <p className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                              <Lightbulb className="w-4 h-4" />
                              {selectedFocus === "individual" && "Opportunities"}
                              {selectedFocus === "coalition" && "Partners to Engage"}
                              {selectedFocus === "network" && "Bridges to Build"}
                            </p>
                            <ul className="space-y-1">
                              {(selectedFocus === "individual" ? focusData.opportunities :
                                selectedFocus === "coalition" ? (focusData as any).partnersToEngage :
                                (focusData as any).bridgesToBuild
                              )?.map((item: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Handshake className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Goals / Metrics / Changes */}
                          <div>
                            <p className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {selectedFocus === "individual" && "Key Metrics"}
                              {selectedFocus === "coalition" && "Collective Goals"}
                              {selectedFocus === "network" && "Systemic Changes"}
                            </p>
                            <ul className="space-y-1">
                              {selectedFocus === "individual" && focusData.keyMetrics?.map((metric: any, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Target className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                  <span><strong>{metric.name}:</strong> {metric.target}</span>
                                </li>
                              ))}
                              {selectedFocus === "coalition" && (focusData as any).collectiveGoals?.map((goal: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Target className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                  {goal}
                                </li>
                              ))}
                              {selectedFocus === "network" && (focusData as any).systemicChanges?.map((change: string, i: number) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Target className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                  {change}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {predictions.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Run the simulation to generate branch recommendations</p>
            <Button variant="outline" className="mt-4" onClick={fetchPredictions}>
              Generate Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
