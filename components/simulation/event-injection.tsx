"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, Trash2, Zap, AlertTriangle, TrendingUp, TrendingDown, 
  Vote, DollarSign, Users, Building2, Globe
} from "lucide-react"

interface SimulationEvent {
  id: string
  year_number: number
  event_type: string
  title: string
  description: string
  affected_entities: string[]
  impact_level: string
  is_processed: boolean
  created_at: string
}

interface EventInjectionProps {
  simulationId: string
  currentYear: number
  totalYears: number
  onEventAdded?: () => void
}

const EVENT_TYPES = [
  { value: "policy_change", label: "Policy Change", icon: Vote, description: "Government policy or regulation changes" },
  { value: "economic", label: "Economic Shift", icon: DollarSign, description: "Economic events, funding changes" },
  { value: "political", label: "Political Event", icon: Building2, description: "Elections, political shifts" },
  { value: "social", label: "Social Movement", icon: Users, description: "Public opinion, social movements" },
  { value: "crisis", label: "Crisis/Emergency", icon: AlertTriangle, description: "Unexpected crises or emergencies" },
  { value: "opportunity", label: "Opportunity", icon: TrendingUp, description: "New opportunities or openings" },
  { value: "external", label: "External Factor", icon: Globe, description: "External events affecting the community" },
]

const SEVERITY_LEVELS = [
  { value: "minor", label: "Minor", color: "bg-blue-100 text-blue-800" },
  { value: "moderate", label: "Moderate", color: "bg-yellow-100 text-yellow-800" },
  { value: "major", label: "Major", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
]

export function EventInjection({ simulationId, currentYear, totalYears, onEventAdded }: EventInjectionProps) {
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [eventType, setEventType] = useState("")
  const [yearNumber, setYearNumber] = useState(currentYear + 1)
  const [severity, setSeverity] = useState("moderate")

  useEffect(() => {
    fetchEvents()
  }, [simulationId])

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/events`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !eventType || !yearNumber) return

    setSaving(true)
    try {
      const response = await fetch(`/api/simulations/${simulationId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          event_type: eventType,
          year_number: yearNumber,
          impact_level: severity,
          affected_entities: [],
        }),
      })

      if (response.ok) {
        const newEvent = await response.json()
        setEvents([...events, newEvent])
        setTitle("")
        setDescription("")
        setEventType("")
        setYearNumber(currentYear + 1)
        setSeverity("moderate")
        setShowForm(false)
        onEventAdded?.()
      }
    } catch (error) {
      console.error("Error creating event:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProcessed = async (eventId: string, isProcessed: boolean) => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, is_processed: isProcessed }),
      })

      if (response.ok) {
        setEvents(events.map(e => e.id === eventId ? { ...e, is_processed: isProcessed } : e))
      }
    } catch (error) {
      console.error("Error toggling event:", error)
    }
  }

  const handleDelete = async (eventId: string) => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/events?eventId=${eventId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId))
      }
    } catch (error) {
      console.error("Error deleting event:", error)
    }
  }

  const handleToggleActive = async (eventId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, is_active: isActive }),
      })

      if (response.ok) {
        setEvents(events.map(e => e.id === eventId ? { ...e, is_active: isActive } : e))
      }
    } catch (error) {
      console.error("Error toggling event active status:", error)
    }
  }

  const getEventIcon = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type)
    return eventType?.icon || Zap
  }

  const getSeverityBadge = (sev: string) => {
    const severity = SEVERITY_LEVELS.find(s => s.value === sev)
    return severity || SEVERITY_LEVELS[1]
  }

  // Group events by year
  const eventsByYear = events.reduce((acc, event) => {
    if (!acc[event.year_number]) {
      acc[event.year_number] = []
    }
    acc[event.year_number].push(event)
    return acc
  }, {} as Record<number, SimulationEvent[]>)

  const futureYears = Array.from({ length: totalYears - currentYear }, (_, i) => currentYear + i + 1)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Event Injection
            </CardTitle>
            <CardDescription>
              Inject external events to test scenario resilience
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Cancel" : "Add Event"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Event Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., New Mayor Elected"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Target Year</Label>
                <Select value={String(yearNumber)} onValueChange={(v) => setYearNumber(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {futureYears.map(year => (
                      <SelectItem key={year} value={String(year)}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the event and its potential impact on the community..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !title || !eventType}>
                {saving ? "Adding..." : "Add Event"}
              </Button>
            </div>
          </form>
        )}

        {/* Events List */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No events injected yet.</p>
            <p className="text-sm">Add events to test how your scenario responds to external factors.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {futureYears.map(year => {
              const yearEvents = eventsByYear[year] || []
              if (yearEvents.length === 0) return null

              return (
                <div key={year} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Year {year}</h4>
                  <div className="space-y-2">
                    {yearEvents.map(event => {
                      const Icon = getEventIcon(event.event_type)
                      const severityBadge = getSeverityBadge(event.impact_level)

                      return (
                        <div
                          key={event.id}
                          className={`flex items-start justify-between p-3 border rounded-lg ${
                            !event.is_processed ? "bg-background" : "bg-muted/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{event.title}</p>
                                <Badge className={severityBadge.color} variant="secondary">
                                  {severityBadge.label}
                                </Badge>
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!event.is_processed}
                              onCheckedChange={(checked) => handleToggleProcessed(event.id, !checked)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(event.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
