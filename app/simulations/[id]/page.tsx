"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  ArrowLeft, Play, Pause, CheckCircle, Clock, Users, 
  MessageSquare, GitBranch, TrendingUp, Calendar,
  Building2, ChevronRight, Loader2, Map, AlertTriangle,
  Lightbulb, Target, Handshake, Shield, UserCog, Pencil, X,
  Network, Compass
} from "lucide-react"
import { BranchMap } from "@/components/simulation/branch-map"
import { YearSummaryDisplay } from "@/components/simulation/year-summary"
import { EventInjection } from "@/components/simulation/event-injection"
import { MilestoneTracker } from "@/components/simulation/milestone-tracker"
import { BranchComparison } from "@/components/simulation/branch-comparison"
import { ExportDialog } from "@/components/simulation/export-dialog"
import { ProbabilityDisplay } from "@/components/simulation/probability-display"
import { NetworkPredictionsPanel } from "@/components/simulation/network-predictions-panel"
import { NetworkAnalysisPanel } from "@/components/network/network-analysis-panel"
import { NetworkHealthDashboard } from "@/components/network/network-health-dashboard"

interface LandscapeAnalysis {
  executive_summary: string
  power_structure: {
    dominant_players: string[]
    emerging_voices: string[]
    marginalized_stakeholders: string[]
    analysis: string
  }
  relationship_map: {
    strong_alliances: Array<{ entities: string[]; basis: string }>
    tensions: Array<{ entities: string[]; source: string }>
    potential_partnerships: Array<{ entities: string[]; opportunity: string }>
    analysis: string
  }
  resource_landscape: {
    well_resourced: string[]
    resource_constrained: string[]
    resource_gaps: string[]
    analysis: string
  }
  strategic_alignment: {
    shared_priorities: string[]
    conflicting_agendas: string[]
    analysis: string
  }
  scenario_readiness: {
    likely_champions: string[]
    likely_opponents: string[]
    swing_votes: string[]
    key_factors: string[]
    analysis: string
  }
  opportunities: string[]
  risks: string[]
  recommendations: string[]
}

interface ManualResponse {
  id?: string
  entity_id: string
  entity_name: string
  content: string
  reasoning: string
  sentiment: string
  actions: string[]
  engagement_level: string
}

interface CommunityEntity {
  entity_id: string
  stakeholder_role: string
  entities: {
    id: string
    name: string
    type: string
    mission: string
  }
}

interface SimulationData {
  simulation: {
    id: string
    name: string
    scenario: string
    status: string
    current_year: number
    total_years: number
    branch_probability: number | null
    parameters: Record<string, any>
    starting_conditions: {
      landscape_analysis?: LandscapeAnalysis
      entity_count?: number
      analyzed_at?: string
    } | null
    created_at: string
    communities: {
      id: string
      name: string
      description: string
      geography: string[]
      issue_areas: string[]
    }
  }
  years: Array<{
    id: string
    year_number: number
    status: string
    year_summary: string | null
    year_scenario: string | null
    metrics: any
    opposition_summary: any
    landscape_snapshot: any
    recommendations: any
  }>
  responsesByYear: Record<number, Array<{
    id: string
    entity_id: string
    content: string
    response_type: string
    reasoning: string
    decision: {
      summary: string
      actions: string[]
      engagement_level: string
    }
    confidence: number
    entities: { id: string; name: string; type: string; mission: string }
  }>>
  coalitions: any[]
  relationshipChanges: any[]
  outcomes: any[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  running: { label: "Running", color: "bg-blue-100 text-blue-700" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  future: { label: "Future", color: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
}

const sentimentColors: Record<string, string> = {
  supportive: "bg-green-100 text-green-700",
  neutral: "bg-muted text-muted-foreground",
  opposed: "bg-red-100 text-red-700",
  cautious: "bg-amber-100 text-amber-700",
}

const engagementColors: Record<string, string> = {
  high: "text-green-600",
  medium: "text-amber-600",
  low: "text-muted-foreground",
}

export default function SimulationDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<SimulationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [analyzingLandscape, setAnalyzingLandscape] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>("landscape")
  
  // Manual control state
  const [manualControlOpen, setManualControlOpen] = useState(false)
  const [communityEntities, setCommunityEntities] = useState<CommunityEntity[]>([])
  const [manualResponses, setManualResponses] = useState<ManualResponse[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const [manualContent, setManualContent] = useState("")
  const [manualReasoning, setManualReasoning] = useState("")
  const [manualSentiment, setManualSentiment] = useState("neutral")
  const [manualActions, setManualActions] = useState("")
  const [manualEngagement, setManualEngagement] = useState("medium")
  const [savingManual, setSavingManual] = useState(false)
  
  // Branching state
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [branchYear, setBranchYear] = useState<number>(1)
  const [branchDescription, setBranchDescription] = useState("")
  const [branchScenario, setBranchScenario] = useState("")
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branches, setBranches] = useState<any[]>([])
  const [parentSimulation, setParentSimulation] = useState<any>(null)

  async function fetchSimulation() {
    try {
      const response = await fetch(`/api/simulations/${id}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
        // Select the current or most recent completed year
        if (result.simulation.current_year > 0) {
          setSelectedYear(result.simulation.current_year)
        }
      }
    } catch (error) {
      console.error("Error fetching simulation:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Skip if id is "new" - that's handled by /simulations/new/page.tsx
    if (id && id !== "new") {
      fetchSimulation()
    }
  }, [id])

  // Fetch community entities when simulation loads
  useEffect(() => {
    async function fetchEntities() {
      if (!data?.simulation.communities?.id) return
      try {
        const response = await fetch(`/api/communities/${data.simulation.communities.id}/entities`)
        if (response.ok) {
          const entities = await response.json()
          setCommunityEntities(entities)
        }
      } catch (error) {
        console.error("Error fetching entities:", error)
      }
    }
    fetchEntities()
  }, [data?.simulation.communities?.id])

  // Fetch existing manual responses
  useEffect(() => {
    async function fetchManualResponses() {
      if (!id || id === "new") return
      try {
        const response = await fetch(`/api/simulations/${id}/manual-response`)
        if (response.ok) {
          const result = await response.json()
          setManualResponses(result.manualResponses?.map((r: any) => ({
            id: r.id,
            entity_id: r.entity_id,
            entity_name: r.entities?.name || "Unknown",
            content: r.content,
            reasoning: r.reasoning,
            sentiment: r.response_type,
            actions: r.decision?.actions || [],
            engagement_level: r.decision?.engagement_level || "medium",
          })) || [])
        }
      } catch (error) {
        console.error("Error fetching manual responses:", error)
      }
    }
    fetchManualResponses()
  }, [id, data?.simulation.current_year])

  // Fetch branches
  useEffect(() => {
    async function fetchBranches() {
      if (!id || id === "new") return
      try {
        const response = await fetch(`/api/simulations/${id}/branch`)
        if (response.ok) {
          const result = await response.json()
          setBranches(result.branches || [])
          setParentSimulation(result.parent)
        }
      } catch (error) {
        console.error("Error fetching branches:", error)
      }
    }
    fetchBranches()
  }, [id])

  async function createBranch() {
    if (!branchYear || creatingBranch) return
    
    setCreatingBranch(true)
    try {
      const response = await fetch(`/api/simulations/${id}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchAtYear: branchYear,
          description: branchDescription,
          alternativeScenario: branchScenario || undefined,
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        // Navigate to the new branch
        window.location.href = `/simulations/${result.branch.id}`
      }
    } catch (error) {
      console.error("Error creating branch:", error)
    } finally {
      setCreatingBranch(false)
    }
  }

  async function saveManualResponse() {
    if (!selectedEntity || !manualContent) return
    
    setSavingManual(true)
    try {
      const response = await fetch(`/api/simulations/${id}/manual-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedEntity,
          content: manualContent,
          reasoning: manualReasoning,
          sentiment: manualSentiment,
          actions: manualActions.split("\n").filter(a => a.trim()),
          engagementLevel: manualEngagement,
        }),
      })
      
      if (response.ok) {
        // Refresh manual responses
        const refreshResponse = await fetch(`/api/simulations/${id}/manual-response`)
        if (refreshResponse.ok) {
          const result = await refreshResponse.json()
          setManualResponses(result.manualResponses?.map((r: any) => ({
            id: r.id,
            entity_id: r.entity_id,
            entity_name: r.entities?.name || "Unknown",
            content: r.content,
            reasoning: r.reasoning,
            sentiment: r.response_type,
            actions: r.decision?.actions || [],
            engagement_level: r.decision?.engagement_level || "medium",
          })) || [])
        }
        
        // Reset form
        setSelectedEntity("")
        setManualContent("")
        setManualReasoning("")
        setManualSentiment("neutral")
        setManualActions("")
        setManualEngagement("medium")
        setManualControlOpen(false)
      }
    } catch (error) {
      console.error("Error saving manual response:", error)
    } finally {
      setSavingManual(false)
    }
  }

  async function removeManualResponse(responseId: string) {
    try {
      const response = await fetch(`/api/simulations/${id}/manual-response?responseId=${responseId}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        setManualResponses(prev => prev.filter(r => r.id !== responseId))
      }
    } catch (error) {
      console.error("Error removing manual response:", error)
    }
  }

  async function runLandscapeAnalysis() {
    if (!data || analyzingLandscape) return
    
    setAnalyzingLandscape(true)
    try {
      const response = await fetch(`/api/simulations/${id}/landscape-analysis`, {
        method: "POST",
      })
      
      if (response.ok) {
        await fetchSimulation()
        setActiveTab("landscape")
      }
    } catch (error) {
      console.error("Error running landscape analysis:", error)
    } finally {
      setAnalyzingLandscape(false)
    }
  }

  async function runNextYear() {
    if (!data || running) return
    
    setRunning(true)
    try {
      const response = await fetch(`/api/simulations/${id}/run-year`, {
        method: "POST",
      })
      
      if (response.ok) {
        const result = await response.json()
        setSelectedYear(result.yearNumber)
        // Refresh data
        await fetchSimulation()
      }
    } catch (error) {
      console.error("Error running year:", error)
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
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

  const { simulation, years, responsesByYear } = data
  const status = statusConfig[simulation.status] || statusConfig.draft
  const canRunYear = simulation.status !== "completed" && simulation.current_year < simulation.total_years
  const progress = simulation.total_years > 0 
    ? Math.round((simulation.current_year / simulation.total_years) * 100)
    : 0

  const selectedYearData = selectedYear ? years.find(y => y.year_number === selectedYear) : null
  const selectedYearResponses = selectedYear ? responsesByYear[selectedYear] || [] : []

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/simulations" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Simulations
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{simulation.name}</h1>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            <Link href={`/communities/${simulation.communities.id}`} className="hover:underline">
              {simulation.communities.name}
            </Link>
            {" "}
            <span className="mx-2">|</span>
            Year {simulation.current_year} of {simulation.total_years}
          </p>
        </div>
        
        {canRunYear && (
          <div className="flex items-center gap-2">
            <Link href={`/simulations/${id}/strategic`}>
              <Button variant="outline" className="bg-transparent">
                <Compass className="w-4 h-4 mr-2" />
                Strategic Tools
              </Button>
            </Link>
            <Dialog open={manualControlOpen} onOpenChange={setManualControlOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-transparent">
                  <UserCog className="w-4 h-4 mr-2" />
                  Manual Control ({manualResponses.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manual Entity Control - Year {simulation.current_year + 1}</DialogTitle>
                  <DialogDescription>
                    Pre-define responses for specific entities before running the simulation year.
                    AI will generate responses for all other entities.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Existing Manual Responses */}
                {manualResponses.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <Label>Queued Manual Responses</Label>
                    {manualResponses.map((mr) => (
                      <div key={mr.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{mr.entity_name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {mr.content.substring(0, 100)}...
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => mr.id && removeManualResponse(mr.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Manual Response */}
                <div className="space-y-4">
                  <div>
                    <Label>Select Entity</Label>
                    <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an entity to control..." />
                      </SelectTrigger>
                      <SelectContent>
                        {communityEntities
                          .filter(ce => !manualResponses.some(mr => mr.entity_id === ce.entities?.id))
                          .map((ce) => (
                            <SelectItem key={ce.entities?.id} value={ce.entities?.id || ""}>
                              {ce.entities?.name} ({ce.stakeholder_role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEntity && (
                    <>
                      <div>
                        <Label>Response Content</Label>
                        <Textarea
                          placeholder="Describe what this entity does in Year 1..."
                          value={manualContent}
                          onChange={(e) => setManualContent(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label>Reasoning / Decision Summary</Label>
                        <Textarea
                          placeholder="Why did they make this decision?"
                          value={manualReasoning}
                          onChange={(e) => setManualReasoning(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Sentiment</Label>
                          <Select value={manualSentiment} onValueChange={setManualSentiment}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supportive">Supportive</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="cautious">Cautious</SelectItem>
                              <SelectItem value="opposed">Opposed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Engagement Level</Label>
                          <Select value={manualEngagement} onValueChange={setManualEngagement}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Actions (one per line)</Label>
                        <Textarea
                          placeholder="Apply for grant&#10;Partner with Organization X&#10;Hire additional staff"
                          value={manualActions}
                          onChange={(e) => setManualActions(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    onClick={saveManualResponse}
                    disabled={!selectedEntity || !manualContent || savingManual}
                  >
                    {savingManual ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Add Manual Response
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={runNextYear} disabled={running} size="lg">
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Year {simulation.current_year + 1}...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Year {simulation.current_year + 1}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Export Button */}
        <ExportDialog simulationId={simulation.id} simulationName={simulation.name} />

        {/* Strategic Tools Button - Always available */}
        <Link href={`/simulations/${id}/strategic`}>
          <Button variant="outline" className="bg-transparent">
            <Compass className="w-4 h-4 mr-2" />
            Strategic Planning
          </Button>
        </Link>

        {/* Branch Button - Only show if at least one year completed */}
        {simulation.current_year > 0 && (
          <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-transparent">
                <GitBranch className="w-4 h-4 mr-2" />
                Create Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Alternative Scenario Branch</DialogTitle>
                <DialogDescription>
                  Fork this simulation at a specific year to explore a different path.
                  All data up to that year will be copied to the new branch.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label>Branch at Year</Label>
                  <Select 
                    value={branchYear.toString()} 
                    onValueChange={(v) => setBranchYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: simulation.current_year }, (_, i) => i + 1).map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          Year {y} ({(simulation.parameters?.starting_year || 2026) + y - 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The branch will include all responses up to and including this year.
                  </p>
                </div>

                <div>
                  <Label>Branch Description</Label>
                  <Textarea
                    placeholder="What makes this alternative scenario different?"
                    value={branchDescription}
                    onChange={(e) => setBranchDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Alternative Scenario (Optional)</Label>
                  <Textarea
                    placeholder="Override the scenario for this branch, or leave blank to keep the original..."
                    value={branchScenario}
                    onChange={(e) => setBranchScenario(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBranchDialogOpen(false)} className="bg-transparent">
                  Cancel
                </Button>
                <Button onClick={createBranch} disabled={creatingBranch}>
                  {creatingBranch ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Branch...
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4 mr-2" />
                      Create Branch
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Branch Map - Shows simulation tree structure */}
      {(branches.length > 0 || parentSimulation) && (
        <div className="mb-6">
          <BranchMap
            simulationId={simulation.id}
            currentSimulation={{
              id: simulation.id,
              name: simulation.name,
              current_year: simulation.current_year,
              total_years: simulation.total_years,
              status: simulation.status,
              branched_at_year: null,
              branch_description: null,
              parent_simulation_id: parentSimulation?.id || null,
              created_at: simulation.created_at,
            }}
            branches={branches}
            parentSimulation={parentSimulation ? {
              id: parentSimulation.id,
              name: parentSimulation.name,
              current_year: parentSimulation.current_year || 0,
              total_years: parentSimulation.total_years || simulation.total_years,
              status: parentSimulation.status || "completed",
              branched_at_year: null,
              branch_description: null,
              parent_simulation_id: null,
              created_at: parentSimulation.created_at || simulation.created_at,
            } : null}
          />
        </div>
      )}

      {/* Strategic Dashboard - Grid with main content and sidebar */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scenario Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{simulation.scenario}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-4">
          {/* Probability Display */}
          {simulation.current_year > 0 && (
            <ProbabilityDisplay
              probability={simulation.branch_probability}
              momentum={years.find(y => y.year_number === simulation.current_year)?.landscape_snapshot?.momentum}
              confidenceAssessment={years.find(y => y.year_number === simulation.current_year)?.recommendations?.confidence_assessment}
            />
          )}

          {/* Milestone Tracker */}
          <MilestoneTracker
            simulationId={simulation.id}
            currentYear={simulation.current_year}
            totalYears={simulation.total_years}
          />

          {/* Event Injection */}
          {simulation.status !== "completed" && (
            <EventInjection
              simulationId={simulation.id}
              currentYear={simulation.current_year}
              totalYears={simulation.total_years}
            />
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {years.map((year) => {
              const yearStatus = statusConfig[year.status] || statusConfig.future
              const isSelected = selectedYear === year.year_number
              const isClickable = year.status === "completed"
              
              return (
                <button
                  key={year.id}
                  onClick={() => isClickable && setSelectedYear(year.year_number)}
                  disabled={!isClickable}
                  className={`
                    flex flex-col items-center p-3 rounded-lg border-2 min-w-[100px] transition-all
                    ${isSelected ? "border-primary bg-primary/5" : "border-transparent"}
                    ${isClickable ? "hover:border-primary/50 cursor-pointer" : "opacity-60 cursor-default"}
                  `}
                >
                  <span className="text-sm font-medium">
                    {(simulation.parameters?.starting_year || 2026) + year.year_number - 1}
                  </span>
                  <span className="text-xs text-muted-foreground">Year {year.year_number}</span>
                  <Badge className={`mt-1 text-xs ${yearStatus.color}`}>
                    {yearStatus.label}
                  </Badge>
                </button>
              )
            })}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year Details */}
      {selectedYearData && (
        <Tabs defaultValue="responses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="responses" className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              Responses ({selectedYearResponses.length})
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Year Summary
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-1">
              <Network className="w-4 h-4" />
              Network State
            </TabsTrigger>
          </TabsList>

          <TabsContent value="responses" className="space-y-4">
            <h3 className="text-lg font-semibold">
              Year {selectedYearData.year_number} ({(simulation.parameters?.starting_year || 2026) + selectedYearData.year_number - 1}) - Entity Responses
            </h3>
            
            {selectedYearResponses.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No responses recorded for this year</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedYearResponses.map((response) => (
                  <Card key={response.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              <Link 
                                href={`/entities/${response.entity_id}`}
                                className="hover:underline"
                              >
                                {response.entities?.name || "Unknown Entity"}
                              </Link>
                            </CardTitle>
                            <CardDescription>
                              {response.entities?.type}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={sentimentColors[response.response_type] || sentimentColors.neutral}>
                            {response.response_type || "neutral"}
                          </Badge>
                          <span className={`text-sm font-medium ${engagementColors[response.decision?.engagement_level] || ""}`}>
                            {response.decision?.engagement_level || "medium"} engagement
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {response.reasoning && (
                        <p className="font-medium mb-3">{response.reasoning}</p>
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {response.content}
                      </p>
                      {response.decision?.actions && response.decision.actions.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Actions Taken:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {response.decision.actions.map((action: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary">
            <YearSummaryDisplay
              yearNumber={selectedYearData.year_number}
              calendarYear={(simulation.parameters?.starting_year || 2026) + selectedYearData.year_number - 1}
              yearSummary={selectedYearData.year_summary || "No summary available yet."}
              oppositionSummary={selectedYearData.opposition_summary}
              landscapeSnapshot={selectedYearData.landscape_snapshot}
              recommendations={selectedYearData.recommendations}
            />
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="grid gap-6">
              {/* Network Metrics from this year */}
              {selectedYearData.metrics?.network && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Network Metrics - Year {selectedYearData.year_number}</CardTitle>
                    <CardDescription>
                      Network structure and health at the end of this simulation year
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">
                          {(selectedYearData.metrics.network.density * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Network Density</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">
                          {selectedYearData.metrics.network.averageDegree?.toFixed(1) || "0"}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Connections</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">
                          {(selectedYearData.metrics.network.clusteringCoefficient * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Clustering</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">
                          {((selectedYearData.metrics.network.networkHealthScore || 0.5) * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Network Health</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-600">
                          {selectedYearData.metrics.network.centralEntitiesCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Central Hubs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-blue-600">
                          {selectedYearData.metrics.network.keyBridgesCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Key Bridges</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-amber-600">
                          {selectedYearData.metrics.network.isolatedEntitiesCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Isolated</p>
                      </div>
                    </div>
                    {selectedYearData.metrics.network.communityStructure && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Network Structure: <span className="font-medium capitalize">{selectedYearData.metrics.network.communityStructure}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Network Evolution from landscape snapshot */}
              {selectedYearData.landscape_snapshot?.network_evolution && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Network Evolution</CardTitle>
                    <CardDescription>
                      How relationships changed during Year {selectedYearData.year_number}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        selectedYearData.landscape_snapshot.network_evolution.structure_change === "strengthening" ? "default" :
                        selectedYearData.landscape_snapshot.network_evolution.structure_change === "fragmenting" ? "destructive" :
                        "secondary"
                      }>
                        {selectedYearData.landscape_snapshot.network_evolution.structure_change || "stable"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Structure Change</span>
                    </div>
                    
                    {selectedYearData.landscape_snapshot.network_evolution.new_connections_forming?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-1">New Connections Forming:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {selectedYearData.landscape_snapshot.network_evolution.new_connections_forming.map((conn: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              {conn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {selectedYearData.landscape_snapshot.network_evolution.connections_at_risk?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-600 mb-1">Connections At Risk:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {selectedYearData.landscape_snapshot.network_evolution.connections_at_risk.map((conn: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {conn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {selectedYearData.landscape_snapshot.network_evolution.analysis && (
                      <p className="text-sm text-muted-foreground border-t pt-3 mt-3">
                        {selectedYearData.landscape_snapshot.network_evolution.analysis}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Live Network Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Network Graph</CardTitle>
                  <CardDescription>
                    Interactive visualization of community relationships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NetworkAnalysisPanel communityId={simulation.communities.id} />
                </CardContent>
              </Card>

              {/* Network Health Dashboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Network Health Analysis</CardTitle>
                  <CardDescription>
                    Vulnerabilities, coalitions, and strategic opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NetworkHealthDashboard communityId={simulation.communities.id} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Network Predictions - Show when simulation has started */}
      {simulation.current_year > 0 && simulation.current_year < simulation.total_years && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Network Evolution Predictions
            </CardTitle>
            <CardDescription>
              Predict how relationships and power dynamics will evolve over the remaining {simulation.total_years - simulation.current_year} years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NetworkPredictionsPanel simulationId={id} />
          </CardContent>
        </Card>
      )}

      {/* Landscape Analysis Section - Show before simulation starts or as a tab */}
      {simulation.current_year === 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Landscape Analysis
            </CardTitle>
            <CardDescription>
              Analyze the current state of the community before running the simulation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulation.starting_conditions?.landscape_analysis ? (
              <LandscapeAnalysisDisplay analysis={simulation.starting_conditions.landscape_analysis} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Map className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Run a landscape analysis to understand the current power dynamics, relationships, and readiness of community entities before starting the simulation.
                </p>
                <Button onClick={runLandscapeAnalysis} disabled={analyzingLandscape}>
                  {analyzingLandscape ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Community...
                    </>
                  ) : (
                    <>
                      <Map className="w-4 h-4 mr-2" />
                      Run Landscape Analysis
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ready to Start - Show after landscape analysis */}
      {!selectedYearData && simulation.current_year === 0 && simulation.starting_conditions?.landscape_analysis && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Play className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Start Simulation</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Landscape analysis complete. Click "Run Year 1" to begin the simulation. Each entity will respond to the scenario based on their profile.
            </p>
            <Button onClick={runNextYear} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Year 1
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prompt to run landscape analysis first */}
      {!selectedYearData && simulation.current_year === 0 && !simulation.starting_conditions?.landscape_analysis && (
        <Card className="border-dashed border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Run Landscape Analysis First</h3>
            <p className="text-muted-foreground text-center max-w-md">
              We recommend running a landscape analysis before starting the simulation to better understand the community dynamics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Landscape Analysis Display Component
function LandscapeAnalysisDisplay({ analysis }: { analysis: LandscapeAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Executive Summary
        </h4>
        <p className="text-sm">{analysis.executive_summary}</p>
      </div>

      {/* Power Structure */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Power Structure
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Dominant Players</p>
            <ul className="text-sm space-y-1">
              {analysis.power_structure?.dominant_players?.map((p, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Emerging Voices</p>
            <ul className="text-sm space-y-1">
              {analysis.power_structure?.emerging_voices?.map((p, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Marginalized Stakeholders</p>
            <ul className="text-sm space-y-1">
              {analysis.power_structure?.marginalized_stakeholders?.map((p, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{analysis.power_structure?.analysis}</p>
      </div>

      {/* Relationships */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Handshake className="w-4 h-4" />
          Relationship Dynamics
        </h4>
        <div className="space-y-3">
          {analysis.relationship_map?.strong_alliances?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Strong Alliances</p>
              <div className="flex flex-wrap gap-2">
                {analysis.relationship_map.strong_alliances.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {a.entities?.join(" + ")} - {a.basis}
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.relationship_map?.tensions?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tensions</p>
              <div className="flex flex-wrap gap-2">
                {analysis.relationship_map.tensions.map((t, i) => (
                  <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                    {t.entities?.join(" vs ")} - {t.source}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-3">{analysis.relationship_map?.analysis}</p>
      </div>

      {/* Scenario Readiness */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Scenario Readiness
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 mb-1">Likely Champions</p>
            <ul className="text-sm space-y-1">
              {analysis.scenario_readiness?.likely_champions?.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-600 mb-1">Likely Opponents</p>
            <ul className="text-sm space-y-1">
              {analysis.scenario_readiness?.likely_opponents?.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-600 mb-1">Swing Votes</p>
            <ul className="text-sm space-y-1">
              {analysis.scenario_readiness?.swing_votes?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{analysis.scenario_readiness?.analysis}</p>
      </div>

      {/* Opportunities & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700">
            <Lightbulb className="w-4 h-4" />
            Opportunities
          </h4>
          <ul className="text-sm space-y-2">
            {analysis.opportunities?.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">+</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            Risks
          </h4>
          <ul className="text-sm space-y-2">
            {analysis.risks?.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-500 mt-1">!</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-700">
          <Target className="w-4 h-4" />
          Strategic Recommendations
        </h4>
        <ol className="text-sm space-y-2 list-decimal list-inside">
          {analysis.recommendations?.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
