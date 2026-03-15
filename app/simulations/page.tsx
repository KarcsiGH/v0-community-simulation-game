"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Clock, CheckCircle, FileText, Calendar, ArrowLeft } from "lucide-react"

interface Simulation {
  id: string
  name: string
  scenario: string
  status: string
  current_year: number
  total_years: number
  created_at: string
  communities: { id: string; name: string } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  running: { label: "Running", color: "bg-blue-100 text-blue-700", icon: Play },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
}

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSimulations() {
      try {
        const response = await fetch("/api/simulations")
        if (response.ok) {
          const data = await response.json()
          setSimulations(data.simulations || [])
        }
      } catch (error) {
        console.error("Error fetching simulations:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSimulations()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Simulations</h1>
          <p className="text-muted-foreground mt-1">
            Run multi-year community simulations to explore how entities respond to scenarios
          </p>
        </div>
        <Button asChild>
          <Link href="/simulations/new">
            <Plus className="w-4 h-4 mr-2" />
            New Simulation
          </Link>
        </Button>
      </div>

      {simulations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Play className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No simulations yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first simulation to see how community entities respond to different scenarios over time.
            </p>
            <Button asChild>
              <Link href="/simulations/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Simulation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {simulations.map((sim) => {
            const status = statusConfig[sim.status] || statusConfig.draft
            const StatusIcon = status.icon
            const progress = sim.total_years > 0 
              ? Math.round((sim.current_year / sim.total_years) * 100)
              : 0

            return (
              <Card key={sim.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        <Link href={`/simulations/${sim.id}`} className="hover:underline">
                          {sim.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {sim.communities?.name || "Unknown Community"}
                      </CardDescription>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {sim.scenario}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Year {sim.current_year} of {sim.total_years}
                      </div>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span>{progress}%</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/simulations/${sim.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
