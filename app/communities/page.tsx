"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Target, Users, ArrowRight, ArrowLeft } from "lucide-react"
import type { Community } from "@/lib/entity-types"

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCommunities() {
      try {
        const response = await fetch("/api/communities")
        if (response.ok) {
          const data = await response.json()
          setCommunities(data)
        }
      } catch (error) {
        console.error("Error fetching communities:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCommunities()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg" />
            ))}
          </div>
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
          <h1 className="text-3xl font-bold">Communities</h1>
          <p className="text-muted-foreground mt-1">
            Define and manage stakeholder ecosystems for simulation
          </p>
        </div>
        <Button asChild>
          <Link href="/communities/new">
            <Plus className="w-4 h-4 mr-2" />
            New Community
          </Link>
        </Button>
      </div>

      {communities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No communities yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Communities define the ecosystem of stakeholders for your strategic simulations.
              Create one to start discovering relevant actors.
            </p>
            <Button asChild>
              <Link href="/communities/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Community
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <Link key={community.id} href={`/communities/${community.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{community.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                  {community.description && (
                    <CardDescription className="line-clamp-2">
                      {community.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{community.geography}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {community.issueAreas.slice(0, 3).map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {community.issueAreas.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{community.issueAreas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
