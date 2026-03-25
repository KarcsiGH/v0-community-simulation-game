"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  AlertTriangle, ShieldAlert, Bell, Target, Loader2,
  TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle,
  Play, XCircle, Clock, Zap, Eye, Shield, Swords
} from "lucide-react"

interface Risk {
  id: string
  name: string
  description: string
  category: "strategic" | "operational" | "financial" | "reputational" | "external"
  probability: number // 1-5
  impact: number // 1-5
  riskScore: number // probability * impact
  currentStatus: "active" | "mitigated" | "realized" | "dormant"
  mitigation: string[]
  owner: string
  trend: "increasing" | "stable" | "decreasing"
}

interface EarlyWarningIndicator {
  id: string
  name: string
  description: string
  linkedRisks: string[]
  currentValue: number
  threshold: number
  status: "green" | "yellow" | "red"
  lastUpdated: string
  trend: "improving" | "stable" | "worsening"
  dataSource: string
}

interface ContingencyTrigger {
  id: string
  name: string
  condition: string
  threshold: string
  linkedRisks: string[]
  response: string
  status: "armed" | "triggered" | "resolved"
  priority: "critical" | "high" | "medium" | "low"
}

interface RedTeamScenario {
  id: string
  name: string
  description: string
  attacker: string
  objective: string
  tactics: string[]
  vulnerabilitiesExploited: string[]
  likelihood: number
  impact: number
  defensiveRecommendations: string[]
  status: "planned" | "in-progress" | "completed"
}

interface RiskAssessmentProps {
  simulationId: string
  communityId: string
}

export function RiskAssessment({ simulationId, communityId }: RiskAssessmentProps) {
  const [risks, setRisks] = useState<Risk[]>([])
  const [indicators, setIndicators] = useState<EarlyWarningIndicator[]>([])
  const [triggers, setTriggers] = useState<ContingencyTrigger[]>([])
  const [redTeamScenarios, setRedTeamScenarios] = useState<RedTeamScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [runningRedTeam, setRunningRedTeam] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)

  useEffect(() => {
    fetchRiskData()
  }, [simulationId, communityId])

  const fetchRiskData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/simulations/${simulationId}/risk-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: communityId }),
      })

      if (response.ok) {
        const data = await response.json()
        setRisks(data.risks || [])
        setIndicators(data.indicators || [])
        setTriggers(data.triggers || [])
        setRedTeamScenarios(data.redTeamScenarios || [])
      }
    } catch (error) {
      console.error("Error fetching risk data:", error)
    } finally {
      setLoading(false)
    }
  }

  const runRedTeamAnalysis = async () => {
    setRunningRedTeam(true)
    try {
      const response = await fetch(`/api/simulations/${simulationId}/red-team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: communityId }),
      })

      if (response.ok) {
        const data = await response.json()
        setRedTeamScenarios(data.scenarios || [])
      }
    } catch (error) {
      console.error("Error running red team analysis:", error)
    } finally {
      setRunningRedTeam(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 15) return "bg-red-500"
    if (score >= 10) return "bg-orange-500"
    if (score >= 5) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getRiskBadge = (score: number) => {
    if (score >= 15) return { label: "Critical", class: "bg-red-100 text-red-700" }
    if (score >= 10) return { label: "High", class: "bg-orange-100 text-orange-700" }
    if (score >= 5) return { label: "Medium", class: "bg-yellow-100 text-yellow-700" }
    return { label: "Low", class: "bg-green-100 text-green-700" }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
      case "worsening":
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case "decreasing":
      case "improving":
        return <TrendingDown className="w-4 h-4 text-green-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "green": return <CheckCircle className="w-4 h-4 text-green-500" />
      case "yellow": return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case "red": return <XCircle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-700"
      case "high": return "bg-orange-100 text-orange-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      case "low": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing risks...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate risk matrix positions
  const riskMatrix = Array(5).fill(null).map(() => Array(5).fill(null).map(() => [] as Risk[]))
  risks.forEach(risk => {
    riskMatrix[5 - risk.impact][risk.probability - 1].push(risk)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Risk Assessment Dashboard
        </CardTitle>
        <CardDescription>
          Risk matrix, early warning indicators, contingency triggers, and adversarial analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="matrix" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="matrix" className="gap-1">
              <AlertTriangle className="w-4 h-4" />
              Risk Matrix
            </TabsTrigger>
            <TabsTrigger value="indicators" className="gap-1">
              <Bell className="w-4 h-4" />
              Early Warning
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-1">
              <Zap className="w-4 h-4" />
              Contingencies
            </TabsTrigger>
            <TabsTrigger value="redteam" className="gap-1">
              <Swords className="w-4 h-4" />
              Red Team
            </TabsTrigger>
          </TabsList>

          {/* Risk Matrix */}
          <TabsContent value="matrix" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* The Matrix */}
              <div className="lg:col-span-2">
                <div className="relative">
                  {/* Y-axis label */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    IMPACT
                  </div>
                  
                  {/* Matrix Grid */}
                  <div className="ml-6">
                    <div className="grid grid-cols-5 gap-1">
                      {riskMatrix.map((row, rowIndex) => (
                        row.map((cell, colIndex) => {
                          const score = (5 - rowIndex) * (colIndex + 1)
                          let bgColor = "bg-green-100"
                          if (score >= 15) bgColor = "bg-red-100"
                          else if (score >= 10) bgColor = "bg-orange-100"
                          else if (score >= 5) bgColor = "bg-yellow-100"
                          
                          return (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className={`aspect-square ${bgColor} rounded p-1 flex flex-wrap gap-0.5 items-start content-start min-h-[60px]`}
                            >
                              {cell.map(risk => (
                                <div
                                  key={risk.id}
                                  className={`w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform ${getRiskColor(risk.riskScore)} ring-1 ring-white`}
                                  title={risk.name}
                                  onClick={() => setSelectedRisk(risk)}
                                />
                              ))}
                            </div>
                          )
                        })
                      ))}
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="grid grid-cols-5 gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(p => (
                        <div key={p} className="text-center text-xs text-muted-foreground">
                          {p}
                        </div>
                      ))}
                    </div>
                    <div className="text-center text-sm font-medium text-muted-foreground mt-1">
                      PROBABILITY
                    </div>
                  </div>

                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-around text-xs text-muted-foreground">
                    {[5, 4, 3, 2, 1].map(i => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100" />
                    <span className="text-sm">Low (1-4)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100" />
                    <span className="text-sm">Medium (5-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-100" />
                    <span className="text-sm">High (10-14)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100" />
                    <span className="text-sm">Critical (15+)</span>
                  </div>
                </div>
              </div>

              {/* Selected Risk Details */}
              <div>
                {selectedRisk ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{selectedRisk.name}</CardTitle>
                        <Badge className={getRiskBadge(selectedRisk.riskScore).class}>
                          Score: {selectedRisk.riskScore}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="w-fit capitalize">
                        {selectedRisk.category}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{selectedRisk.description}</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Probability</p>
                          <p className="text-lg font-bold">{selectedRisk.probability}/5</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Impact</p>
                          <p className="text-lg font-bold">{selectedRisk.impact}/5</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm">Trend:</span>
                        {getTrendIcon(selectedRisk.trend)}
                        <span className="text-sm capitalize">{selectedRisk.trend}</span>
                      </div>

                      <div>
                        <p className="text-xs font-medium mb-2">Mitigation Strategies</p>
                        <ul className="space-y-1">
                          {selectedRisk.mitigation.map((m, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <Shield className="w-3 h-3 mt-1 text-blue-500" />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Owner: {selectedRisk.owner}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Click a risk dot to see details
                  </div>
                )}
              </div>
            </div>

            {/* Risk List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Risks by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {risks
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .map(risk => (
                      <div 
                        key={risk.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => setSelectedRisk(risk)}
                      >
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(risk.riskScore)}`} />
                        <span className="flex-1 text-sm">{risk.name}</span>
                        {getTrendIcon(risk.trend)}
                        <Badge className={getRiskBadge(risk.riskScore).class} variant="secondary">
                          {risk.riskScore}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Early Warning Indicators */}
          <TabsContent value="indicators" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicators.map(indicator => (
                <Card key={indicator.id} className={
                  indicator.status === "red" ? "border-red-300" :
                  indicator.status === "yellow" ? "border-yellow-300" : ""
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground">{indicator.description}</p>
                      </div>
                      {getStatusIcon(indicator.status)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Current: {indicator.currentValue}</span>
                        <span className="text-sm text-muted-foreground">
                          Threshold: {indicator.threshold}
                        </span>
                      </div>
                      <Progress 
                        value={(indicator.currentValue / indicator.threshold) * 100} 
                        className={`h-2 ${
                          indicator.status === "red" ? "[&>div]:bg-red-500" :
                          indicator.status === "yellow" ? "[&>div]:bg-yellow-500" : ""
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(indicator.trend)}
                        <span className="capitalize">{indicator.trend}</span>
                      </div>
                      <span>Updated: {indicator.lastUpdated}</span>
                    </div>

                    {indicator.linkedRisks.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Linked Risks:</p>
                        <div className="flex flex-wrap gap-1">
                          {indicator.linkedRisks.map((risk, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {indicators.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No early warning indicators configured</p>
              </div>
            )}
          </TabsContent>

          {/* Contingency Triggers */}
          <TabsContent value="triggers" className="space-y-4">
            <div className="grid gap-4">
              {triggers.map(trigger => (
                <Card key={trigger.id} className={
                  trigger.status === "triggered" ? "border-red-300 bg-red-50/50" : ""
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          trigger.status === "triggered" ? "bg-red-500 animate-pulse" :
                          trigger.status === "armed" ? "bg-green-500" : "bg-gray-300"
                        }`} />
                        <div>
                          <p className="font-medium">{trigger.name}</p>
                          <Badge className={getPriorityColor(trigger.priority)} variant="secondary">
                            {trigger.priority}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={
                        trigger.status === "triggered" ? "destructive" :
                        trigger.status === "armed" ? "default" : "secondary"
                      }>
                        {trigger.status}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Condition</p>
                        <p className="text-sm">{trigger.condition}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Threshold: {trigger.threshold}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Response Plan</p>
                        <p className="text-sm">{trigger.response}</p>
                      </div>
                    </div>

                    {trigger.linkedRisks.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Linked Risks:</p>
                        <div className="flex flex-wrap gap-1">
                          {trigger.linkedRisks.map((risk, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {triggers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No contingency triggers configured</p>
              </div>
            )}
          </TabsContent>

          {/* Red Team Analysis */}
          <TabsContent value="redteam" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Adversarial Scenario Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Simulate opposition strategies to identify vulnerabilities
                </p>
              </div>
              <Button onClick={runRedTeamAnalysis} disabled={runningRedTeam}>
                {runningRedTeam ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Swords className="w-4 h-4 mr-2" />
                )}
                Run Red Team Analysis
              </Button>
            </div>

            <div className="grid gap-4">
              {redTeamScenarios.map(scenario => (
                <Card key={scenario.id} className="border-red-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Swords className="w-4 h-4 text-red-500" />
                          {scenario.name}
                        </CardTitle>
                        <CardDescription>{scenario.description}</CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-red-50">
                          Impact: {scenario.impact}/5
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Likelihood: {scenario.likelihood}/5
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-2">Attacker Profile</p>
                        <p className="text-sm">{scenario.attacker}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Objective: {scenario.objective}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-2">Tactics</p>
                        <ul className="text-sm space-y-1">
                          {scenario.tactics.map((tactic, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Target className="w-3 h-3 mt-1 text-red-500" />
                              {tactic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-amber-600 mb-2">
                        Vulnerabilities Exploited
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {scenario.vulnerabilitiesExploited.map((vuln, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-amber-200">
                            {vuln}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-green-600 mb-2">
                        Defensive Recommendations
                      </p>
                      <ul className="text-sm space-y-1">
                        {scenario.defensiveRecommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Shield className="w-3 h-3 mt-1 text-green-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {redTeamScenarios.length === 0 && !runningRedTeam && (
              <div className="text-center py-8 text-muted-foreground">
                <Swords className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Run red team analysis to simulate adversarial scenarios</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
