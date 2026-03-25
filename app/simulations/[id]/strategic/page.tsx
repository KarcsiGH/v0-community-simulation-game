"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, Compass, FlaskConical, GitBranch, Users, 
  ShieldAlert, Loader2, Target, Building2
} from "lucide-react"
import { WhatIfAnalysis } from "@/components/strategic/what-if-analysis"
import { BranchRecommendations } from "@/components/strategic/branch-recommendations"
import { StakeholderMapping } from "@/components/strategic/stakeholder-mapping"
import { RiskAssessment } from "@/components/strategic/risk-assessment"

interface SimulationData {
  simulation: {
    id: string
    name: string
    scenario: string
    status: string
    current_year: number
    total_years: number
    parameters: Record<string, any>
    communities: {
      id: string
      name: string
      description: string
    }
  }
}

export default function StrategicPlanningPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<SimulationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSimulation() {
      try {
        const response = await fetch(`/api/simulations/${id}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error("Error fetching simulation:", error)
      } finally {
        setLoading(false)
      }
    }
    
    if (id && id !== "new") {
      fetchSimulation()
    }
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>Simulation not found</p>
      </div>
    )
  }

  const { simulation } = data
  const startingYear = simulation.parameters?.starting_year || 2026

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/simulations/${id}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Simulation
        </Link>
        <Badge variant="outline">
          Year {simulation.current_year} of {simulation.total_years}
        </Badge>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Compass className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Strategic Planning Tools</h1>
            <p className="text-muted-foreground">
              {simulation.name} | {simulation.communities.name}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Advanced tools for scenario analysis, stakeholder mapping, risk assessment, and strategic recommendations.
          These tools help you anticipate challenges, identify opportunities, and develop comprehensive action plans.
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="scenarios" className="gap-2">
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">Scenarios</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Recommendations</span>
          </TabsTrigger>
          <TabsTrigger value="stakeholders" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Stakeholders</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Risks</span>
          </TabsTrigger>
        </TabsList>

        {/* Scenario Comparison & What-If */}
        <TabsContent value="scenarios" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FlaskConical className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">What-If Analysis</p>
                    <p className="text-sm text-muted-foreground">Test variable changes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Sensitivity Analysis</p>
                    <p className="text-sm text-muted-foreground">Find key drivers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <GitBranch className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Branch Comparison</p>
                    <p className="text-sm text-muted-foreground">Compare timelines</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <WhatIfAnalysis
            simulationId={id}
            communityId={simulation.communities.id}
            currentYear={simulation.current_year}
            totalYears={simulation.total_years}
          />
        </TabsContent>

        {/* Branch Recommendations */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multi-Focus Strategic Recommendations</h3>
                  <p className="text-sm text-muted-foreground">
                    Get year-by-year action plans for three strategic levels: your individual organization,
                    coalition-level coordination, and network-wide positioning. Recommendations are tailored
                    to the highest-probability branches from your simulation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <BranchRecommendations
            simulationId={id}
            focalEntityName={simulation.parameters?.focal_entity_name}
            startingYear={startingYear}
          />
        </TabsContent>

        {/* Stakeholder Mapping */}
        <TabsContent value="stakeholders" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-red-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm font-medium">Power/Interest</p>
                <p className="text-xs text-muted-foreground">Strategic positioning</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <GitBranch className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium">Influence Map</p>
                <p className="text-xs text-muted-foreground">Who influences whom</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">Coalitions</p>
                <p className="text-xs text-muted-foreground">Partnership potential</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-amber-100 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-sm font-medium">Opposition</p>
                <p className="text-xs text-muted-foreground">Counter-strategies</p>
              </CardContent>
            </Card>
          </div>

          <StakeholderMapping
            communityId={simulation.communities.id}
            simulationId={id}
          />
        </TabsContent>

        {/* Risk Assessment */}
        <TabsContent value="risks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-red-600">Risk Matrix</p>
                <p className="text-xs text-muted-foreground">Probability x Impact</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-amber-600">Early Warning</p>
                <p className="text-xs text-muted-foreground">Leading indicators</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-blue-600">Contingencies</p>
                <p className="text-xs text-muted-foreground">Trigger-response plans</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-purple-600">Red Team</p>
                <p className="text-xs text-muted-foreground">Adversarial analysis</p>
              </CardContent>
            </Card>
          </div>

          <RiskAssessment
            simulationId={id}
            communityId={simulation.communities.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
