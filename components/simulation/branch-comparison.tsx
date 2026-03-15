"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  GitBranch, ArrowLeftRight, TrendingUp, TrendingDown, Minus,
  Users, AlertTriangle, CheckCircle, Target, Percent
} from "lucide-react"

interface BranchData {
  simulation: {
    id: string
    name: string
    scenario: string
    current_year: number
    total_years: number
    status: string
    branch_probability: number | null
    branched_at_year: number | null
    branch_description: string | null
  }
  year_data: {
    year_number: number
    year_summary: string
    opposition_summary: any
    landscape_snapshot: any
    recommendations: any
  } | null
  metrics: {
    supportive: number
    opposed: number
    neutral: number
    total: number
    support_ratio: number
  }
  entity_responses: Array<{
    entity_id: string
    entity_name: string
    response_type: string
    reasoning: string
    decision: any
  }>
}

interface DivergenceData {
  divergent_entities: Array<{
    entity_id: string
    entity_name: string
    responses: Record<string, string>
  }>
  consistent_entities: Array<{
    entity_id: string
    entity_name: string
    response: string
  }>
  divergence_rate: number
  probability_ranking: Array<{
    simulation_id: string
    simulation_name: string
    probability: number
  }>
}

interface ComparisonResult {
  year_compared: number
  branches: BranchData[]
  divergence: DivergenceData | null
}

interface BranchComparisonProps {
  simulationIds: string[]
  onClose?: () => void
}

export function BranchComparison({ simulationIds, onClose }: BranchComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  useEffect(() => {
    if (simulationIds.length >= 2) {
      fetchComparison()
    }
  }, [simulationIds, selectedYear])

  const fetchComparison = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/simulations/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulation_ids: simulationIds,
          year_number: selectedYear,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setComparison(data)
      }
    } catch (error) {
      console.error("Error fetching comparison:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentIcon = (type: string) => {
    switch (type) {
      case "supportive": return <TrendingUp className="w-4 h-4 text-green-600" />
      case "opposed": return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getSentimentColor = (type: string) => {
    switch (type) {
      case "supportive": return "bg-green-100 text-green-800"
      case "opposed": return "bg-red-100 text-red-800"
      case "cautious": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!comparison) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select at least 2 branches to compare
        </CardContent>
      </Card>
    )
  }

  const maxYear = Math.max(...comparison.branches.map(b => b.simulation.current_year))
  const years = Array.from({ length: maxYear }, (_, i) => i + 1)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Branch Comparison
            </CardTitle>
            <CardDescription>
              Comparing {comparison.branches.length} simulation branches at Year {comparison.year_compared}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear ? String(selectedYear) : String(comparison.year_compared)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    Year {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="probability">Probability</TabsTrigger>
            <TabsTrigger value="divergence">Divergence</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparison.branches.length}, 1fr)` }}>
              {comparison.branches.map(branch => (
                <Card key={branch.simulation.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      {branch.simulation.name}
                    </CardTitle>
                    {branch.simulation.branch_description && (
                      <CardDescription className="text-xs">
                        {branch.simulation.branch_description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Metrics */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Supportive
                        </span>
                        <span className="font-medium">{branch.metrics.supportive}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Opposed
                        </span>
                        <span className="font-medium">{branch.metrics.opposed}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Minus className="w-3 h-3 text-gray-500" />
                          Neutral/Cautious
                        </span>
                        <span className="font-medium">{branch.metrics.neutral}</span>
                      </div>
                    </div>

                    {/* Support ratio bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Support Ratio</span>
                        <span>{Math.round(branch.metrics.support_ratio * 100)}%</span>
                      </div>
                      <Progress value={branch.metrics.support_ratio * 100} className="h-2" />
                    </div>

                    {/* Summary */}
                    {branch.year_data?.year_summary && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground line-clamp-4">
                          {branch.year_data.year_summary}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="probability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Success Probability Ranking
                </CardTitle>
                <CardDescription>
                  Calculated based on support levels, momentum, and landscape analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparison.divergence?.probability_ranking.map((branch, index) => (
                    <div key={branch.simulation_id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{branch.simulation_name}</span>
                          <span className="text-lg font-bold">
                            {Math.round((branch.probability || 0) * 100)}%
                          </span>
                        </div>
                        <Progress value={(branch.probability || 0) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="divergence" className="space-y-4">
            {comparison.divergence && (
              <>
                {/* Divergence Rate */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Divergence Rate</p>
                        <p className="text-2xl font-bold">
                          {Math.round(comparison.divergence.divergence_rate * 100)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {comparison.divergence.divergent_entities.length} divergent / {" "}
                          {comparison.divergence.consistent_entities.length} consistent
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Divergent Entities */}
                {comparison.divergence.divergent_entities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Divergent Entities</CardTitle>
                      <CardDescription>
                        Entities that responded differently across branches
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comparison.divergence.divergent_entities.map(entity => (
                          <div key={entity.entity_id} className="p-3 border rounded-lg">
                            <p className="font-medium mb-2">{entity.entity_name}</p>
                            <div className="flex flex-wrap gap-2">
                              {comparison.branches.map(branch => {
                                const response = entity.responses[branch.simulation.id]
                                return (
                                  <div key={branch.simulation.id} className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">
                                      {branch.simulation.name}:
                                    </span>
                                    <Badge className={getSentimentColor(response)} variant="secondary">
                                      {getSentimentIcon(response)}
                                      <span className="ml-1">{response}</span>
                                    </Badge>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparison.branches.length}, 1fr)` }}>
              {comparison.branches.map(branch => (
                <Card key={branch.simulation.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{branch.simulation.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {branch.year_data?.recommendations ? (
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-xs text-muted-foreground uppercase mb-1">
                            Executive Summary
                          </p>
                          <p>{branch.year_data.recommendations.narrative_summary}</p>
                        </div>

                        {branch.year_data.recommendations.for_focal_entity?.immediate_actions?.length > 0 && (
                          <div>
                            <p className="font-medium text-xs text-muted-foreground uppercase mb-1">
                              Immediate Actions
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {branch.year_data.recommendations.for_focal_entity.immediate_actions.slice(0, 3).map((action: string, i: number) => (
                                <li key={i} className="text-xs">{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {branch.year_data.recommendations.confidence_assessment && (
                          <div className="pt-2 border-t">
                            <Badge variant={
                              branch.year_data.recommendations.confidence_assessment.success_likelihood === "high" ? "default" :
                              branch.year_data.recommendations.confidence_assessment.success_likelihood === "low" ? "destructive" : "secondary"
                            }>
                              {branch.year_data.recommendations.confidence_assessment.success_likelihood} likelihood
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recommendations available</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
