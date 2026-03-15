"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Play, Sparkles } from "lucide-react"

interface Community {
  id: string
  name: string
  description: string
  geography: string | string[]
  issueAreas: string[]
}

const scenarioTemplates = [
  {
    name: "Funding Opportunity",
    template: "A new $X million grant opportunity has been announced for [issue area] programs in [geography]. Organizations must apply by [deadline] and demonstrate community partnerships.",
  },
  {
    name: "Policy Change",
    template: "The state legislature has passed new regulations requiring [specific change]. Organizations have 12 months to comply, and funding may be affected for non-compliant entities.",
  },
  {
    name: "Crisis Response",
    template: "A [type of crisis] has emerged affecting [geography]. Community organizations must coordinate an immediate response while managing limited resources.",
  },
  {
    name: "Collaboration Initiative",
    template: "A major funder is requesting proposals for a collaborative initiative to address [issue]. Preference will be given to coalitions of 3+ organizations with demonstrated track records.",
  },
]

export default function NewSimulationPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  const [name, setName] = useState("")
  const [communityId, setCommunityId] = useState("")
  const [scenario, setScenario] = useState("")
  const [durationYears, setDurationYears] = useState("5")
  const [startingYear, setStartingYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    async function fetchCommunities() {
      try {
        const response = await fetch("/api/communities")
        if (response.ok) {
          const data = await response.json()
          // API returns array directly, not { communities: [...] }
          setCommunities(Array.isArray(data) ? data : data.communities || [])
        }
      } catch (error) {
        console.error("Error fetching communities:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCommunities()
  }, [])

  const selectedCommunity = communities.find(c => c.id === communityId)

  async function handleCreate() {
    if (!name || !communityId || !scenario) return

    setCreating(true)
    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          communityId,
          scenario,
          durationYears: parseInt(durationYears),
          startingYear: parseInt(startingYear),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/simulations/${data.simulation.id}`)
      }
    } catch (error) {
      console.error("Error creating simulation:", error)
    } finally {
      setCreating(false)
    }
  }

  function applyTemplate(template: string) {
    if (selectedCommunity) {
      const geographyStr = Array.isArray(selectedCommunity.geography) 
        ? selectedCommunity.geography.join(", ") 
        : selectedCommunity.geography || "[geography]"
      let filled = template
        .replace("[geography]", geographyStr)
        .replace("[issue area]", selectedCommunity.issueAreas?.[0] || "[issue area]")
        .replace("[issue]", selectedCommunity.issueAreas?.[0] || "[issue]")
      setScenario(filled)
    } else {
      setScenario(template)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (communities.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="mb-6">
          <Link href="/simulations" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Simulations
          </Link>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold mb-2">No Communities Found</h2>
            <p className="text-muted-foreground mb-4">
              You need to create a community before running a simulation.
            </p>
            <Button asChild>
              <Link href="/communities/new">Create Community</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <Link href="/simulations" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Simulations
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Simulation</h1>
        <p className="text-muted-foreground mt-1">
          Set up a multi-year simulation to explore how community entities respond to a scenario
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Simulation Name</Label>
              <Input
                id="name"
                placeholder="e.g., State Health Grant 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="community">Community</Label>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCommunity && (
                <p className="text-sm text-muted-foreground">
                  {selectedCommunity.description || `Focus: ${selectedCommunity.issueAreas?.join(", ")}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Years)</Label>
                <Select value={durationYears} onValueChange={setDurationYears}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? "year" : "years"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startYear">Starting Year</Label>
                <Input
                  id="startYear"
                  type="number"
                  min="2020"
                  max="2050"
                  value={startingYear}
                  onChange={(e) => setStartingYear(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario</CardTitle>
            <CardDescription>
              Describe the situation or event that entities will respond to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Quick Templates</Label>
              <div className="flex flex-wrap gap-2">
                {scenarioTemplates.map((t) => (
                  <Button
                    key={t.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(t.template)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario Description</Label>
              <Textarea
                id="scenario"
                placeholder="Describe the scenario that community entities will respond to..."
                className="min-h-[150px]"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the opportunity, challenge, or change. Include relevant details like funding amounts, deadlines, requirements, or constraints.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/simulations">Cancel</Link>
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name || !communityId || !scenario || creating}
          >
            {creating ? (
              <>Creating...</>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Create Simulation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
