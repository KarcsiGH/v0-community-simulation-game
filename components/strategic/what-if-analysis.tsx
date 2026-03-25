"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { 
  FlaskConical, Play, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Loader2, Sparkles, BarChart3, RefreshCw
} from "lucide-react"

interface WhatIfScenario {
  id: string
  name: string
  description: string
  variables: {
    name: string
    originalValue: number
    modifiedValue: number
    impact: "high" | "medium" | "low"
  }[]
  predictedOutcome: {
    successProbability: number
    supportChange: number
    oppositionChange: number
    keyRisks: string[]
    keyOpportunities: string[]
    recommendation: string
  } | null
  status: "pending" | "running" | "complete"
}

interface SensitivityResult {
  variable: string
  baselineOutcome: number
  lowScenario: { value: number; outcome: number }
  highScenario: { value: number; outcome: number }
  sensitivity: "high" | "medium" | "low"
  recommendation: string
}

interface WhatIfAnalysisProps {
  simulationId: string
  communityId: string
  currentYear: number
  totalYears: number
}

export function WhatIfAnalysis({ simulationId, communityId, currentYear, totalYears }: WhatIfAnalysisProps) {
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([])
  const [sensitivityResults, setSensitivityResults] = useState<SensitivityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const [runningSensitivity, setRunningSensitivity] = useState(false)
  
  // New scenario form
  const [newScenarioName, setNewScenarioName] = useState("")
  const [newScenarioDesc, setNewScenarioDesc] = useState("")
  const [selectedVariable, setSelectedVariable] = useState("")
  const [variableValue, setVariableValue] = useState(50)

  const variableOptions = [
    { id: "funding_increase", name: "Funding Increase/Decrease", unit: "%" },
    { id: "key_leader_exit", name: "Key Leader Exits", unit: "entities" },
    { id: "new_alliance", name: "New Alliance Formation", unit: "strength" },
    { id: "opposition_strength", name: "Opposition Strength", unit: "%" },
    { id: "external_crisis", name: "External Crisis Impact", unit: "severity" },
    { id: "policy_change", name: "Policy Environment Change", unit: "favorability" },
    { id: "public_attention", name: "Public/Media Attention", unit: "intensity" },
    { id: "resource_availability", name: "Resource Availability", unit: "%" },
  ]

  const addScenario = () => {
    if (!newScenarioName || !selectedVariable) return
    
    const newScenario: WhatIfScenario = {
      id: `scenario-${Date.now()}`,
      name: newScenarioName,
      description: newScenarioDesc,
      variables: [{
        name: variableOptions.find(v => v.id === selectedVariable)?.name || selectedVariable,
        originalValue: 50,
        modifiedValue: variableValue,
        impact: variableValue > 70 || variableValue < 30 ? "high" : "medium"
      }],
      predictedOutcome: null,
      status: "pending"
    }
    
    setScenarios(prev => [...prev, newScenario])
    setNewScenarioName("")
    setNewScenarioDesc("")
    setSelectedVariable("")
    setVariableValue(50)
  }

  const runScenario = async (scenarioId: string) => {
    setRunningScenario(scenarioId)
    
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario) return

    try {
      const response = await fetch(`/api/simulations/${simulationId}/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_name: scenario.name,
          scenario_description: scenario.description,
          variables: scenario.variables,
          current_year: currentYear,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setScenarios(prev => prev.map(s => 
          s.id === scenarioId 
            ? { ...s, predictedOutcome: result.prediction, status: "complete" as const }
            : s
        ))
      }
    } catch (error) {
      console.error("Error running scenario:", error)
    } finally {
      setRunningScenario(null)
    }
  }

  const runSensitivityAnalysis = async () => {
    setRunningSensitivity(true)
    
    try {
      const response = await fetch(`/api/simulations/${simulationId}/sensitivity-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variables: variableOptions.map(v => v.id),
          current_year: currentYear,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSensitivityResults(result.results || [])
      }
    } catch (error) {
      console.error("Error running sensitivity analysis:", error)
    } finally {
      setRunningSensitivity(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "text-red-600 bg-red-50"
      case "medium": return "text-amber-600 bg-amber-50"
      case "low": return "text-green-600 bg-green-50"
      default: return "text-muted-foreground bg-muted"
    }
  }

  const getSensitivityColor = (sensitivity: string) => {
    switch (sensitivity) {
      case "high": return "bg-red-500"
      case "medium": return "bg-amber-500"
      case "low": return "bg-green-500"
      default: return "bg-muted"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5" />
          What-If Analysis
        </CardTitle>
        <CardDescription>
          Test different scenarios and understand which variables have the most impact on outcomes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="scenarios" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scenarios">Quick Scenarios</TabsTrigger>
            <TabsTrigger value="sensitivity">Sensitivity Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-4">
            {/* Create New Scenario */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Create What-If Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scenario Name</Label>
                    <Input
                      placeholder="e.g., Major Funder Withdrawal"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Variable to Modify</Label>
                    <Select value={selectedVariable} onValueChange={setSelectedVariable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select variable..." />
                      </SelectTrigger>
                      <SelectContent>
                        {variableOptions.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedVariable && (
                  <div>
                    <Label>Value Adjustment: {variableValue}%</Label>
                    <Slider
                      value={[variableValue]}
                      onValueChange={(v) => setVariableValue(v[0])}
                      min={0}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Decrease</span>
                      <span>Baseline</span>
                      <span>Increase</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Describe the scenario context..."
                    value={newScenarioDesc}
                    onChange={(e) => setNewScenarioDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button onClick={addScenario} disabled={!newScenarioName || !selectedVariable}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Scenario
                </Button>
              </CardContent>
            </Card>

            {/* Scenario List */}
            {scenarios.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Scenarios</h4>
                {scenarios.map(scenario => (
                  <Card key={scenario.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h5 className="font-medium">{scenario.name}</h5>
                          {scenario.description && (
                            <p className="text-sm text-muted-foreground">{scenario.description}</p>
                          )}
                        </div>
                        {scenario.status === "pending" && (
                          <Button 
                            size="sm"
                            onClick={() => runScenario(scenario.id)}
                            disabled={runningScenario === scenario.id}
                          >
                            {runningScenario === scenario.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-1" />
                            )}
                            Run Analysis
                          </Button>
                        )}
                        {scenario.status === "complete" && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Complete
                          </Badge>
                        )}
                      </div>

                      {/* Variables */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {scenario.variables.map((v, i) => (
                          <Badge key={i} variant="secondary" className={getImpactColor(v.impact)}>
                            {v.name}: {v.originalValue}% → {v.modifiedValue}%
                          </Badge>
                        ))}
                      </div>

                      {/* Results */}
                      {scenario.predictedOutcome && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className="text-2xl font-bold">
                                {Math.round(scenario.predictedOutcome.successProbability * 100)}%
                              </p>
                              <p className="text-xs text-muted-foreground">Success Probability</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className={`text-2xl font-bold ${scenario.predictedOutcome.supportChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {scenario.predictedOutcome.supportChange >= 0 ? '+' : ''}{scenario.predictedOutcome.supportChange}%
                              </p>
                              <p className="text-xs text-muted-foreground">Support Change</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className={`text-2xl font-bold ${scenario.predictedOutcome.oppositionChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {scenario.predictedOutcome.oppositionChange >= 0 ? '+' : ''}{scenario.predictedOutcome.oppositionChange}%
                              </p>
                              <p className="text-xs text-muted-foreground">Opposition Change</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-1">Key Risks</p>
                              <ul className="text-sm space-y-1">
                                {scenario.predictedOutcome.keyRisks.map((risk, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <AlertTriangle className="w-3 h-3 mt-1 text-red-500" />
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600 mb-1">Opportunities</p>
                              <ul className="text-sm space-y-1">
                                {scenario.predictedOutcome.keyOpportunities.map((opp, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <TrendingUp className="w-3 h-3 mt-1 text-green-500" />
                                    {opp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800 mb-1">Recommendation</p>
                            <p className="text-sm text-blue-700">{scenario.predictedOutcome.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sensitivity" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Sensitivity Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Identify which variables have the greatest impact on simulation outcomes
                </p>
              </div>
              <Button onClick={runSensitivityAnalysis} disabled={runningSensitivity}>
                {runningSensitivity ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Run Analysis
              </Button>
            </div>

            {sensitivityResults.length > 0 && (
              <div className="space-y-3">
                {sensitivityResults.map((result, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getSensitivityColor(result.sensitivity)}`} />
                          <span className="font-medium">{result.variable}</span>
                        </div>
                        <Badge variant="outline" className={getImpactColor(result.sensitivity)}>
                          {result.sensitivity} sensitivity
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-2 bg-red-50 rounded">
                          <p className="text-xs text-red-600">Low Scenario</p>
                          <p className="font-medium">{result.lowScenario.value}%</p>
                          <p className="text-sm text-red-700">{Math.round(result.lowScenario.outcome * 100)}% success</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-xs text-muted-foreground">Baseline</p>
                          <p className="font-medium">Current</p>
                          <p className="text-sm">{Math.round(result.baselineOutcome * 100)}% success</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-xs text-green-600">High Scenario</p>
                          <p className="font-medium">{result.highScenario.value}%</p>
                          <p className="text-sm text-green-700">{Math.round(result.highScenario.outcome * 100)}% success</p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">{result.recommendation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {sensitivityResults.length === 0 && !runningSensitivity && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Run sensitivity analysis to identify key variables</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
