"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Shield, Users, TrendingUp, TrendingDown, Minus, 
  AlertTriangle, Lightbulb, Target, Handshake, 
  Eye, ArrowRight, CheckCircle, XCircle, Loader2, Sparkles
} from "lucide-react"

interface OppositionSummary {
  opposing_entities: Array<{
    name: string
    stance: string
    actions_taken: string[]
  }>
  resistance_themes: string[]
  opposition_strength: string
  likely_next_moves: string[]
  vulnerabilities: string[]
  narrative_summary: string
}

interface LandscapeSnapshot {
  power_dynamics: {
    dominant_forces: string[]
    emerging_powers: string[]
    declining_powers: string[]
    analysis: string
  }
  alliances: {
    formed: Array<{ members: string[]; basis: string }>
    strengthened: Array<{ members: string[]; development: string }>
    strained: Array<{ members: string[]; tension: string }>
  }
  resources: {
    committed: string
    gaps: string[]
    opportunities: string[]
  }
  momentum: {
    direction: string
    confidence: number
    key_factors: string[]
  }
  narrative_summary: string
}

interface Recommendations {
  for_focal_entity: {
    immediate_actions: string[]
    relationship_priorities: string[]
    risks_to_mitigate: string[]
    opportunities_to_pursue: string[]
  }
  for_coalition: {
    collective_priorities: string[]
    coordination_needs: string[]
    resource_allocation: string[]
  }
  strategic_pivots: string[]
  watch_items: string[]
  confidence_assessment: {
    success_likelihood: string
    key_uncertainties: string[]
    best_case: string
    worst_case: string
  }
  narrative_summary: string
}

interface YearSummaryProps {
  yearNumber: number
  calendarYear: number
  yearSummary: string
  oppositionSummary?: OppositionSummary
  landscapeSnapshot?: LandscapeSnapshot
  recommendations?: Recommendations
  simulationId?: string
  onAnalysisGenerated?: () => void
}

export function YearSummaryDisplay({
  yearNumber,
  calendarYear,
  yearSummary,
  oppositionSummary,
  landscapeSnapshot,
  recommendations,
  simulationId,
  onAnalysisGenerated,
}: YearSummaryProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasAnyAnalysis = oppositionSummary || landscapeSnapshot || recommendations
  const isMissingAnalysis = !oppositionSummary || !landscapeSnapshot || !recommendations
  
  const generateMissingAnalysis = async () => {
    if (!simulationId) return
    
    setGenerating(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/simulations/${simulationId}/backfill-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearNumber }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate analysis")
      }
      
      // Trigger refresh
      onAnalysisGenerated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate analysis")
    } finally {
      setGenerating(false)
    }
  }
  
  const getMomentumIcon = (direction?: string) => {
    switch (direction) {
      case "favorable":
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case "unfavorable":
        return <TrendingDown className="w-5 h-5 text-red-500" />
      default:
        return <Minus className="w-5 h-5 text-amber-500" />
    }
  }

  const getMomentumColor = (direction?: string) => {
    switch (direction) {
      case "favorable":
        return "text-green-600 bg-green-50 border-green-200"
      case "unfavorable":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-amber-600 bg-amber-50 border-amber-200"
    }
  }

  const getStrengthColor = (strength?: string) => {
    switch (strength) {
      case "strong":
        return "bg-red-100 text-red-700 border-red-200"
      case "moderate":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "weak":
        return "bg-green-100 text-green-700 border-green-200"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getLikelihoodColor = (likelihood?: string) => {
    switch (likelihood) {
      case "high":
        return "bg-green-100 text-green-700"
      case "medium":
        return "bg-amber-100 text-amber-700"
      case "low":
        return "bg-red-100 text-red-700"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Year Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Year {yearNumber} Summary ({calendarYear})</span>
            {landscapeSnapshot?.momentum && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getMomentumColor(landscapeSnapshot.momentum.direction)}`}>
                {getMomentumIcon(landscapeSnapshot.momentum.direction)}
                <span className="text-sm font-medium capitalize">
                  {landscapeSnapshot.momentum.direction} Momentum
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{yearSummary}</p>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="landscape" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="landscape" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Landscape
          </TabsTrigger>
          <TabsTrigger value="opposition" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Opposition
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Landscape Tab */}
        <TabsContent value="landscape" className="mt-4 space-y-4">
          {landscapeSnapshot ? (
            <>
              {/* Narrative */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <p className="text-sm">{landscapeSnapshot.narrative_summary}</p>
                </CardContent>
              </Card>

              {/* Power Dynamics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Power Dynamics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium mb-1">Dominant Forces</p>
                      <ul className="text-sm space-y-1">
                        {landscapeSnapshot.power_dynamics.dominant_forces?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium mb-1">Emerging Powers</p>
                      <ul className="text-sm space-y-1">
                        {landscapeSnapshot.power_dynamics.emerging_powers?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">Declining Powers</p>
                      <ul className="text-sm space-y-1">
                        {landscapeSnapshot.power_dynamics.declining_powers?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{landscapeSnapshot.power_dynamics.analysis}</p>
                </CardContent>
              </Card>

              {/* Alliances */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Handshake className="w-4 h-4" />
                    Alliance Dynamics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {landscapeSnapshot.alliances.formed?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">New Alliances Formed</p>
                      <div className="flex flex-wrap gap-2">
                        {landscapeSnapshot.alliances.formed.map((a, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {a.members?.join(" + ")} - {a.basis}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {landscapeSnapshot.alliances.strained?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">Strained Relationships</p>
                      <div className="flex flex-wrap gap-2">
                        {landscapeSnapshot.alliances.strained.map((a, i) => (
                          <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            {a.members?.join(" vs ")} - {a.tension}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Momentum */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getMomentumIcon(landscapeSnapshot.momentum.direction)}
                    Momentum Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`px-3 py-1 rounded-full border ${getMomentumColor(landscapeSnapshot.momentum.direction)}`}>
                      <span className="text-sm font-medium capitalize">{landscapeSnapshot.momentum.direction}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence: {Math.round((landscapeSnapshot.momentum.confidence || 0.5) * 100)}%
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Key Factors</p>
                    <ul className="text-sm space-y-1">
                      {landscapeSnapshot.momentum.key_factors?.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 mt-1 text-muted-foreground" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No landscape analysis available for this year.</p>
              {simulationId && (
                <Button onClick={generateMissingAnalysis} disabled={generating} variant="outline">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Analysis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              )}
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </CardContent>
          </Card>
          )}
        </TabsContent>
        
        {/* Opposition Tab */}
        <TabsContent value="opposition" className="mt-4 space-y-4">
          {oppositionSummary ? (
            <>
              {/* Narrative */}
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="pt-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Opposition Strength:</span>
                      <Badge className={getStrengthColor(oppositionSummary.opposition_strength)}>
                        {oppositionSummary.opposition_strength}
                      </Badge>
                    </div>
                    <p className="text-sm">{oppositionSummary.narrative_summary}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Opposing Entities */}
              {oppositionSummary.opposing_entities?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Opposing Entities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {oppositionSummary.opposing_entities.map((entity, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">{entity.name}</p>
                        <p className="text-sm text-muted-foreground mb-2">{entity.stance}</p>
                        {entity.actions_taken?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entity.actions_taken.map((action, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Resistance Themes & Likely Next Moves */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resistance Themes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {oppositionSummary.resistance_themes?.map((theme, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 mt-1 text-amber-500" />
                          {theme}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Likely Next Moves</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {oppositionSummary.likely_next_moves?.map((move, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 mt-1 text-muted-foreground" />
                          {move}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Vulnerabilities */}
              {oppositionSummary.vulnerabilities?.length > 0 && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-green-700">
                      <Lightbulb className="w-4 h-4" />
                      Opposition Vulnerabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {oppositionSummary.vulnerabilities.map((v, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-1 text-green-500" />
                          {v}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No opposition analysis available for this year.</p>
              {simulationId && (
                <Button onClick={generateMissingAnalysis} disabled={generating} variant="outline">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Analysis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              )}
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </CardContent>
          </Card>
          )}
        </TabsContent>
        
        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="mt-4 space-y-4">
          {recommendations ? (
            <>
              {/* Executive Summary */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 flex items-start gap-3">
                  <Target className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Success Likelihood:</span>
                      <Badge className={getLikelihoodColor(recommendations.confidence_assessment?.success_likelihood)}>
                        {recommendations.confidence_assessment?.success_likelihood}
                      </Badge>
                    </div>
                    <p className="text-sm">{recommendations.narrative_summary}</p>
                  </div>
                </CardContent>
              </Card>

              {/* For Focal Entity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">For the Focal Organization</CardTitle>
                  <CardDescription>Recommendations for the primary planning organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-2">Immediate Actions</p>
                      <ul className="text-sm space-y-1">
                        {recommendations.for_focal_entity?.immediate_actions?.map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 mt-1 text-green-500" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600 mb-2">Relationship Priorities</p>
                      <ul className="text-sm space-y-1">
                        {recommendations.for_focal_entity?.relationship_priorities?.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Users className="w-3 h-3 mt-1 text-blue-500" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-2">Risks to Mitigate</p>
                      <ul className="text-sm space-y-1">
                        {recommendations.for_focal_entity?.risks_to_mitigate?.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-1 text-red-500" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-amber-600 mb-2">Opportunities</p>
                      <ul className="text-sm space-y-1">
                        {recommendations.for_focal_entity?.opportunities_to_pursue?.map((o, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Lightbulb className="w-3 h-3 mt-1 text-amber-500" />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* For Coalition */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">For the Coalition</CardTitle>
                  <CardDescription>Collective recommendations for supporting partners</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-2">Collective Priorities</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.for_coalition?.collective_priorities?.map((p, i) => (
                        <Badge key={i} variant="secondary">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  {recommendations.for_coalition?.coordination_needs?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2">Coordination Needs</p>
                      <ul className="text-sm space-y-1">
                        {recommendations.for_coalition.coordination_needs.map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 mt-1 text-muted-foreground" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Watch Items & Scenarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Watch Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {recommendations.watch_items?.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Eye className="w-3 h-3 mt-1 text-muted-foreground" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Scenario Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs font-medium text-green-600">Best Case</p>
                      <p className="text-sm">{recommendations.confidence_assessment?.best_case}</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded border border-red-200">
                      <p className="text-xs font-medium text-red-600">Worst Case</p>
                      <p className="text-sm">{recommendations.confidence_assessment?.worst_case}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No recommendations available for this year.</p>
              {simulationId && (
                <Button onClick={generateMissingAnalysis} disabled={generating} variant="outline">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Analysis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              )}
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
