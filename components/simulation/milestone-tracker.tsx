"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, Trash2, Target, CheckCircle, Clock, AlertCircle,
  Users, DollarSign, Handshake, FileText, TrendingUp
} from "lucide-react"

interface Milestone {
  id: string
  name: string
  description: string
  milestone_type: string
  target_value: string
  target_numeric: number
  current_value: string
  current_numeric: number
  achieved_year: number | null
  weight: number
  status: string
  created_at: string
}

interface MilestoneTrackerProps {
  simulationId: string
  currentYear: number
  totalYears: number
}

const MILESTONE_TYPES = [
  { value: "support_threshold", label: "Support Threshold", icon: Users, description: "X entities supporting the initiative" },
  { value: "funding_goal", label: "Funding Goal", icon: DollarSign, description: "Reach a funding target" },
  { value: "coalition_size", label: "Coalition Size", icon: Handshake, description: "Build coalition to X members" },
  { value: "policy_adoption", label: "Policy Adoption", icon: FileText, description: "Policy or resolution adopted" },
  { value: "custom", label: "Custom Milestone", icon: Target, description: "Define your own criteria" },
]

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-800", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: TrendingUp },
  achieved: { label: "Achieved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  at_risk: { label: "At Risk", color: "bg-red-100 text-red-800", icon: AlertCircle },
}

export function MilestoneTracker({ simulationId, currentYear, totalYears }: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [milestoneType, setMilestoneType] = useState("custom")
  const [targetValue, setTargetValue] = useState("")
  const [targetNumeric, setTargetNumeric] = useState(0)

  useEffect(() => {
    fetchMilestones()
  }, [simulationId])

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/milestones`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data)
      }
    } catch (error) {
      console.error("Error fetching milestones:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !milestoneType) return

    setSaving(true)
    try {
      const response = await fetch(`/api/simulations/${simulationId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          milestone_type: milestoneType,
          target_value: targetValue,
          target_numeric: targetNumeric,
        }),
      })

      if (response.ok) {
        const newMilestone = await response.json()
        setMilestones([...milestones, newMilestone])
        resetForm()
        setShowForm(false)
      }
    } catch (error) {
      console.error("Error creating milestone:", error)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setMilestoneType("custom")
    setTargetValue("")
    setTargetNumeric(0)
  }

  const handleDelete = async (milestoneId: string) => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/milestones?milestoneId=${milestoneId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMilestones(milestones.filter(m => m.id !== milestoneId))
      }
    } catch (error) {
      console.error("Error deleting milestone:", error)
    }
  }

  const getMilestoneIcon = (type: string) => {
    const milestoneType = MILESTONE_TYPES.find(t => t.value === type)
    return milestoneType?.icon || Target
  }

  const getProgress = (milestone: Milestone) => {
    if (milestone.target_numeric <= 0) return 0
    return Math.min(100, Math.round((milestone.current_numeric / milestone.target_numeric) * 100))
  }

  const achievedCount = milestones.filter(m => m.status === "achieved").length
  const totalCount = milestones.length
  const overallProgress = totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Success Milestones
            </CardTitle>
            <CardDescription>
              Define and track success criteria for your simulation
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Cancel" : "Add Milestone"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        {milestones.length > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {achievedCount} of {totalCount} milestones achieved
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {/* Add Milestone Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Milestone Title</Label>
                <Input
                  id="title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Secure Majority Council Support"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Milestone Type</Label>
                <Select value={milestoneType} onValueChange={setMilestoneType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MILESTONE_TYPES.map(type => (
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteria">Success Criteria</Label>
              <Textarea
                id="criteria"
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
                placeholder="Describe specific, measurable criteria for success..."
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target">Target Value (if applicable)</Label>
                <Input
                  id="target"
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g., 5 for 5 supporters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetYear">Target Year (optional)</Label>
                <Select 
                  value={targetYear ? String(targetYear) : "any"} 
                  onValueChange={(v) => setTargetYear(v === "any" ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any year</SelectItem>
                    {Array.from({ length: totalYears }, (_, i) => i + 1).map(year => (
                      <SelectItem key={year} value={String(year)}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Notes (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any additional context or notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name || !milestoneType}>
                {saving ? "Adding..." : "Add Milestone"}
              </Button>
            </div>
          </form>
        )}

        {/* Milestones List */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        ) : milestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No milestones defined yet.</p>
            <p className="text-sm">Add milestones to track progress toward your goals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map(milestone => {
              const Icon = getMilestoneIcon(milestone.milestone_type)
              const status = STATUS_CONFIG[milestone.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started
              const StatusIcon = status.icon
              const progress = getProgress(milestone)

              return (
                <div
                  key={milestone.id}
                  className="p-4 border rounded-lg bg-background"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{milestone.name}</p>
                          <Badge className={status.color} variant="secondary">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          {milestone.achieved_year && (
                            <Badge variant="outline">
                              Achieved: Year {milestone.achieved_year}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(milestone.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {milestone.target_numeric > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{milestone.current_numeric} / {milestone.target_numeric} ({progress}%)</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
