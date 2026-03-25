"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Radar,
  Users,
  GitBranch,
  TrendingUp,
  Building2,
  Crown,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

interface DiscoveredEntity {
  name: string
  type: string
  reasonForInclusion: string
  stakeholderRole: string
  description?: string
  website?: string
  location?: string
  influenceScore?: number
  connections?: string[]
}

interface DiscoveredRelationship {
  sourceEntity: string
  targetEntity: string
  relationshipType: string
  strength: string
  direction: string
  evidence?: string
}

interface NetworkStats {
  totalEntities: number
  totalRelationships: number
  averageConnections: string
  mostConnected: [string, number][]
  entityTypeDistribution: Record<string, number>
  stakeholderRoleDistribution: Record<string, number>
  relationshipTypeDistribution: Record<string, number>
  networkDensity: string
}

interface DeepDiscoveryPanelProps {
  communityId: string
  onDiscoveryComplete?: () => void
}

export function DeepDiscoveryPanel({ communityId, onDiscoveryComplete }: DeepDiscoveryPanelProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [waves, setWaves] = useState("2")
  const [discoverRelationships, setDiscoverRelationships] = useState(true)
  const [identifyInfluencers, setIdentifyInfluencers] = useState(true)

  const [results, setResults] = useState<{
    entities: DiscoveredEntity[]
    relationships: DiscoveredRelationship[]
    networkStats: NetworkStats
    topInfluencers: DiscoveredEntity[]
  } | null>(null)

  const runDeepDiscovery = async () => {
    setIsRunning(true)
    setProgress(10)
    setStatusMessage("Initializing deep ecosystem discovery...")
    setResults(null)

    try {
      setProgress(20)
      setStatusMessage(`Running ${waves} wave(s) of ecosystem discovery...`)

      const response = await fetch(`/api/communities/${communityId}/deep-discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waves: parseInt(waves),
          discoverRelationships,
          identifyInfluencers,
        }),
      })

      setProgress(80)
      setStatusMessage("Processing results...")

      if (response.ok) {
        const data = await response.json()
        setResults({
          entities: data.entities || [],
          relationships: data.relationships || [],
          networkStats: data.networkStats || {},
          topInfluencers: data.topInfluencers || [],
        })
        setProgress(100)
        setStatusMessage(`Discovery complete! Found ${data.entitiesDiscovered} entities and ${data.relationshipsDiscovered} relationships.`)
        
        if (onDiscoveryComplete) {
          onDiscoveryComplete()
        }
      } else {
        setStatusMessage("Discovery failed. Please try again.")
      }
    } catch (error) {
      console.error("Deep discovery error:", error)
      setStatusMessage("An error occurred during discovery.")
    } finally {
      setIsRunning(false)
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "nonprofit": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      "foundation": "bg-amber-500/10 text-amber-600 border-amber-500/20",
      "government": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "for-profit": "bg-purple-500/10 text-purple-600 border-purple-500/20",
      "coalition": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      "individual-influencer": "bg-pink-500/10 text-pink-600 border-pink-500/20",
    }
    return colors[type] || "bg-muted text-muted-foreground"
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "funder": return <TrendingUp className="w-3 h-3" />
      case "ally": return <Users className="w-3 h-3" />
      case "opposition": return <AlertTriangle className="w-3 h-3" />
      case "regulator": return <Building2 className="w-3 h-3" />
      case "influencer": return <Crown className="w-3 h-3" />
      default: return <Users className="w-3 h-3" />
    }
  }

  const getRelationshipColor = (type: string) => {
    const colors: Record<string, string> = {
      "partner": "text-emerald-600",
      "ally": "text-blue-600",
      "funder": "text-amber-600",
      "beneficiary": "text-cyan-600",
      "competitor": "text-orange-600",
      "adversary": "text-red-600",
      "neutral": "text-muted-foreground",
    }
    return colors[type] || "text-muted-foreground"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            Deep Ecosystem Discovery
          </CardTitle>
          <CardDescription>
            Run AI-powered multi-wave discovery to find all stakeholders, influencers, 
            and map relationships in your community ecosystem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="waves">Discovery Depth</Label>
              <Select value={waves} onValueChange={setWaves} disabled={isRunning}>
                <SelectTrigger id="waves">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Wave - Quick scan</SelectItem>
                  <SelectItem value="2">2 Waves - Standard (Recommended)</SelectItem>
                  <SelectItem value="3">3 Waves - Deep analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
              <Label htmlFor="relationships" className="text-sm">
                Map Relationships
              </Label>
              <Switch
                id="relationships"
                checked={discoverRelationships}
                onCheckedChange={setDiscoverRelationships}
                disabled={isRunning}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
              <Label htmlFor="influencers" className="text-sm">
                Identify Influencers
              </Label>
              <Switch
                id="influencers"
                checked={identifyInfluencers}
                onCheckedChange={setIdentifyInfluencers}
                disabled={isRunning}
              />
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {statusMessage}
              </p>
            </div>
          )}

          <Button 
            onClick={runDeepDiscovery} 
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Discovery...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Deep Discovery
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="influencers">Key Influencers</TabsTrigger>
            <TabsTrigger value="entities">All Entities</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.networkStats.totalEntities}</div>
                  <p className="text-xs text-muted-foreground">Entities Discovered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.networkStats.totalRelationships}</div>
                  <p className="text-xs text-muted-foreground">Relationships Mapped</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.networkStats.averageConnections}</div>
                  <p className="text-xs text-muted-foreground">Avg. Connections</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.networkStats.networkDensity}%</div>
                  <p className="text-xs text-muted-foreground">Network Density</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(results.networkStats.entityTypeDistribution || {}).map(([type, count]) => (
                      <Badge key={type} variant="outline" className={getTypeColor(type)}>
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Stakeholder Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(results.networkStats.stakeholderRoleDistribution || {}).map(([role, count]) => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        {getRoleIcon(role)}
                        {role}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {results.networkStats.mostConnected && results.networkStats.mostConnected.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Most Connected Entities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.networkStats.mostConnected.map(([name, connections], idx) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">
                          <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                          {name}
                        </span>
                        <Badge variant="outline">{connections} connections</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="influencers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Key Influencers & Power Brokers
                </CardTitle>
                <CardDescription>
                  Entities with the highest influence scores based on decision-making power,
                  network connectivity, and resource control.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {results.topInfluencers.map((entity, idx) => (
                      <div key={entity.name} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                            <div>
                              <h4 className="font-medium">{entity.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getTypeColor(entity.type)}>
                                  {entity.type}
                                </Badge>
                                <Badge variant="secondary" className="gap-1">
                                  {getRoleIcon(entity.stakeholderRole)}
                                  {entity.stakeholderRole}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {entity.influenceScore}
                            </div>
                            <span className="text-xs text-muted-foreground">Influence Score</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{entity.reasonForInclusion}</p>
                        {entity.connections && entity.connections.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Link2 className="w-3 h-3" />
                            Connected to: {entity.connections.slice(0, 3).join(", ")}
                            {entity.connections.length > 3 && ` +${entity.connections.length - 3} more`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities">
            <Card>
              <CardHeader>
                <CardTitle>All Discovered Entities ({results.entities.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {results.entities.map((entity) => (
                      <div key={entity.name} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{entity.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getTypeColor(entity.type)}>
                                {entity.type}
                              </Badge>
                              <Badge variant="secondary">
                                {entity.stakeholderRole}
                              </Badge>
                              {entity.influenceScore && entity.influenceScore >= 70 && (
                                <Badge variant="default" className="bg-amber-500">
                                  <Crown className="w-3 h-3 mr-1" />
                                  High Influence
                                </Badge>
                              )}
                            </div>
                          </div>
                          {entity.influenceScore && (
                            <span className="text-sm font-medium text-muted-foreground">
                              Score: {entity.influenceScore}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {entity.reasonForInclusion}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Discovered Relationships ({results.relationships.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {results.relationships.map((rel, idx) => (
                      <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium truncate max-w-[200px]">{rel.sourceEntity}</span>
                          <span className={`text-sm ${getRelationshipColor(rel.relationshipType)}`}>
                            {rel.direction === "outgoing" ? "→" : rel.direction === "incoming" ? "←" : "↔"}
                          </span>
                          <Badge variant="outline" className={getRelationshipColor(rel.relationshipType)}>
                            {rel.relationshipType}
                          </Badge>
                          <span className={`text-sm ${getRelationshipColor(rel.relationshipType)}`}>
                            {rel.direction === "outgoing" ? "→" : rel.direction === "incoming" ? "←" : "↔"}
                          </span>
                          <span className="font-medium truncate max-w-[200px]">{rel.targetEntity}</span>
                        </div>
                        <Badge variant="secondary">{rel.strength}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
