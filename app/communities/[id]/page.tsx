"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  MapPin,
  Target,
  Users,
  Search,
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Network,
  Radar,
} from "lucide-react"
import type { Community, Candidate, Entity } from "@/lib/entity-types"
import { BatchEntityPopulator } from "@/components/batch-entity-populator"
import { NetworkAnalysisPanel } from "@/components/network/network-analysis-panel"
import { NetworkHealthDashboard } from "@/components/network/network-health-dashboard"
import { DeepDiscoveryPanel } from "@/components/community/deep-discovery-panel"

const stakeholderRoleConfig: Record<string, { label: string; color: string }> = {
  ally: { label: "Ally", color: "bg-green-100 text-green-800" },
  funder: { label: "Funder", color: "bg-purple-100 text-purple-800" },
  opposition: { label: "Opposition", color: "bg-red-100 text-red-800" },
  regulator: { label: "Regulator", color: "bg-blue-100 text-blue-800" },
  influencer: { label: "Influencer", color: "bg-orange-100 text-orange-800" },
  "affected-party": { label: "Affected Party", color: "bg-teal-100 text-teal-800" },
  "service-provider": { label: "Service Provider", color: "bg-cyan-100 text-cyan-800" },
  researcher: { label: "Researcher", color: "bg-indigo-100 text-indigo-800" },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-800" },
}

const entityTypeLabels: Record<string, string> = {
  nonprofit: "Nonprofit",
  "for-profit": "For-Profit",
  government: "Government",
  foundation: "Foundation",
  coalition: "Coalition",
  "civic-group": "Civic Group",
  "individual-influencer": "Influencer",
  other: "Other",
}

export default function CommunityDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showPopulator, setShowPopulator] = useState(false)
  const [community, setCommunity] = useState<Community | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [entities, setEntities] = useState<Array<{ entity_id: string; role: string; entities: Entity | null }>>([])

  // Identify stub entities (low quality score, need data population)
  const stubEntities = entities
    .filter((e) => e.entities !== null)
    .map((e) => ({
      id: e.entity_id,
      name: e.entities?.name || "Unknown",
      type: e.entities?.type || "other",
      qualityScore: e.entities?.dataQualityScore,
    }))
    .filter((e) => !e.qualityScore || e.qualityScore < 50)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/communities/${id}`)
        if (response.ok) {
          const data = await response.json()
          setCommunity(data.community)
          setCandidates(data.candidates || [])
          setEntities(data.entities || [])
        }
      } catch (error) {
        console.error("Error fetching community:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  async function refreshCommunityData() {
    try {
      const response = await fetch(`/api/communities/${id}`)
      if (response.ok) {
        const data = await response.json()
        setCommunity(data.community)
        setCandidates(data.candidates || [])
        setEntities(data.entities || [])
      }
    } catch (error) {
      console.error("Error fetching community:", error)
    }
  }

  async function discoverEcosystem() {
    if (!community) return
    setDiscovering(true)
    try {
      const response = await fetch("/api/discover-ecosystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: community.id,
          geography: community.geography,
          issueAreas: community.issueAreas,
          criteria: community.criteria,
          focalEntityName: undefined, // TODO: fetch focal entity name if set
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCandidates(data.candidates || [])
      }
    } catch (error) {
      console.error("Error discovering ecosystem:", error)
    } finally {
      setDiscovering(false)
    }
  }

  async function updateCandidateSelection(candidateId: string, selected: boolean) {
    try {
      const response = await fetch(`/api/communities/${id}/candidates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, selected }),
      })

      if (response.ok) {
        const updated = await response.json()
        setCandidates(candidates.map((c) => (c.id === candidateId ? updated : c)))
      }
    } catch (error) {
      console.error("Error updating candidate:", error)
    }
  }

  async function rejectCandidate(candidateId: string) {
    try {
      const response = await fetch(`/api/communities/${id}/candidates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, rejected: true }),
      })

      if (response.ok) {
        const updated = await response.json()
        setCandidates(candidates.map((c) => (c.id === candidateId ? updated : c)))
      }
    } catch (error) {
      console.error("Error rejecting candidate:", error)
    }
  }

  async function processSelectedCandidates() {
    setProcessing(true)
    try {
      const response = await fetch(`/api/communities/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        await refreshCommunityData()
      }
    } catch (error) {
      console.error("Error processing candidates:", error)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded-lg mt-8" />
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">Community not found</h2>
            <Button asChild className="mt-4">
              <Link href="/communities">Back to Communities</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingCandidates = candidates.filter((c) => !c.selected && !c.rejected)
  const selectedCandidates = candidates.filter((c) => c.selected)
  const rejectedCandidates = candidates.filter((c) => c.rejected)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/communities">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Communities
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{community.name}</h1>
            {community.description && (
              <p className="text-muted-foreground mt-1">{community.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{community.geography}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Target className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {community.issueAreas.map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button onClick={discoverEcosystem} disabled={discovering}>
            {discovering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Discover Ecosystem
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="candidates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="candidates" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Candidates
            {pendingCandidates.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCandidates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="entities" className="gap-2">
            <Users className="w-4 h-4" />
            Community Members
            {entities.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {entities.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-2">
            <Network className="w-4 h-4" />
            Network Analysis
          </TabsTrigger>
          <TabsTrigger value="deep-discovery" className="gap-2">
            <Radar className="w-4 h-4" />
            Deep Discovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-6">
          {candidates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No candidates yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Click "Discover Ecosystem" to find relevant organizations, funders, 
                  regulators, and other stakeholders in this space.
                </p>
                <Button onClick={discoverEcosystem} disabled={discovering}>
                  {discovering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Discover Ecosystem
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selection Actions */}
              {selectedCandidates.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        <span className="font-medium">
                          {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? "s" : ""} selected
                        </span>
                      </div>
                      <Button onClick={processSelectedCandidates} disabled={processing}>
                        {processing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Add to Community
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending Candidates */}
              {pendingCandidates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-lg">Review Candidates ({pendingCandidates.length})</h3>
                  <div className="grid gap-3">
                    {pendingCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onSelect={(selected) => updateCandidateSelection(candidate.id, selected)}
                        onReject={() => rejectCandidate(candidate.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Candidates */}
              {selectedCandidates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Selected ({selectedCandidates.length})
                  </h3>
                  <div className="grid gap-3">
                    {selectedCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onSelect={(selected) => updateCandidateSelection(candidate.id, selected)}
                        onReject={() => rejectCandidate(candidate.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected Candidates */}
              {rejectedCandidates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-lg flex items-center gap-2 text-muted-foreground">
                    <XCircle className="w-5 h-5" />
                    Rejected ({rejectedCandidates.length})
                  </h3>
                  <div className="grid gap-3 opacity-60">
                    {rejectedCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onSelect={(selected) => updateCandidateSelection(candidate.id, selected)}
                        onReject={() => {}}
                        disabled
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="entities" className="space-y-6">
          {/* Batch Entity Populator */}
          {showPopulator && (
            <BatchEntityPopulator
              stubEntities={stubEntities}
              onComplete={() => {
                setShowPopulator(false)
                refreshCommunityData()
              }}
            />
          )}

          {/* Stub entities warning and action */}
          {!showPopulator && stubEntities.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {stubEntities.length} entities need data population
                      </p>
                      <p className="text-sm text-amber-700">
                        These entities have incomplete profiles. Run data collection to populate mission, financials, leadership, and relationships.
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setShowPopulator(true)} className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Populate Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {entities.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No community members yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Discover and select candidates to add them as community members.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {entities.map((link) => {
                const score = link.entities?.dataQualityScore
                const scoreColor = !score || score < 30 ? "text-red-600 bg-red-50" 
                  : score < 50 ? "text-amber-600 bg-amber-50"
                  : score < 70 ? "text-yellow-600 bg-yellow-50"
                  : "text-green-600 bg-green-50"
                
                return (
                  <Card key={link.entity_id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link 
                                href={`/entities/${link.entity_id}`}
                                className="font-medium hover:underline"
                              >
                                {link.entities?.name || "Unknown Entity"}
                              </Link>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${scoreColor}`}>
                                {score ?? 0}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {(link.entities?.type && entityTypeLabels[link.entities.type]) || "Unknown"}
                              </Badge>
                              {link.role && stakeholderRoleConfig[link.role] && (
                                <Badge className={`text-xs ${stakeholderRoleConfig[link.role].color}`}>
                                  {stakeholderRoleConfig[link.role].label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/entities/${link.entity_id}`}>
                            View
                            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <Tabs defaultValue="analysis" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis">Network Graph</TabsTrigger>
              <TabsTrigger value="health">Health Dashboard</TabsTrigger>
            </TabsList>
            
            <TabsContent value="analysis">
              <NetworkAnalysisPanel communityId={id} />
            </TabsContent>
            
            <TabsContent value="health">
              <NetworkHealthDashboard communityId={id} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="deep-discovery" className="space-y-6">
          <DeepDiscoveryPanel 
            communityId={id} 
            onDiscoveryComplete={() => {
              // Refresh candidates after discovery
              refreshCommunityData()
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CandidateCard({
  candidate,
  onSelect,
  onReject,
  disabled = false,
}: {
  candidate: Candidate
  onSelect: (selected: boolean) => void
  onReject: () => void
  disabled?: boolean
}) {
  const roleConfig = stakeholderRoleConfig[candidate.stakeholderRole] || stakeholderRoleConfig.unknown

  return (
    <Card className={candidate.selected ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={candidate.selected}
            onCheckedChange={(checked) => onSelect(checked === true)}
            disabled={disabled || candidate.rejected}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{candidate.name}</span>
                  {candidate.existingEntityId && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      In Database
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {entityTypeLabels[candidate.type] || candidate.type}
                  </Badge>
                  <Badge className={`text-xs ${roleConfig.color}`}>
                    {roleConfig.label}
                  </Badge>
                </div>
              </div>
              {!disabled && !candidate.rejected && !candidate.selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReject}
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {candidate.reasonForInclusion}
            </p>
            {candidate.quickPreviewData && (
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {candidate.quickPreviewData.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {candidate.quickPreviewData.location}
                  </span>
                )}
                {candidate.quickPreviewData.website && (
                  <a
                    href={candidate.quickPreviewData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
