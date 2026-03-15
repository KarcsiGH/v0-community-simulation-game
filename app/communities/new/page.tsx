"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Entity } from "@/lib/entity-types"

export default function NewCommunityPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [geography, setGeography] = useState("")
  const [issueAreas, setIssueAreas] = useState<string[]>([])
  const [newIssueArea, setNewIssueArea] = useState("")
  const [criteria, setCriteria] = useState("")
  const [focalEntityId, setFocalEntityId] = useState<string>("")

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch("/api/entities")
        if (response.ok) {
          const data = await response.json()
          setEntities(data)
        }
      } catch (error) {
        console.error("Error fetching entities:", error)
      }
    }
    fetchEntities()
  }, [])

  const addIssueArea = () => {
    if (newIssueArea.trim() && !issueAreas.includes(newIssueArea.trim())) {
      setIssueAreas([...issueAreas, newIssueArea.trim()])
      setNewIssueArea("")
    }
  }

  const removeIssueArea = (area: string) => {
    setIssueAreas(issueAreas.filter((a) => a !== area))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !geography.trim() || issueAreas.length === 0) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          geography: geography.trim(),
          issueAreas,
          criteria: criteria.trim() || undefined,
          focalEntityId: focalEntityId && focalEntityId !== "none" ? focalEntityId : undefined,
        }),
      })

      if (response.ok) {
        const community = await response.json()
        router.push(`/communities/${community.id}`)
      }
    } catch (error) {
      console.error("Error creating community:", error)
    } finally {
      setSaving(false)
    }
  }

  const isValid = name.trim() && geography.trim() && issueAreas.length > 0

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/communities">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Communities
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create Community</h1>
        <p className="text-muted-foreground mt-1">
          Define a stakeholder ecosystem for strategic simulation
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Community Definition</CardTitle>
            <CardDescription>
              Describe the community you want to analyze. This will guide ecosystem discovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Community Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Missouri Childhood Obesity Prevention"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and scope of this community..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="geography">Geography *</Label>
              <Input
                id="geography"
                placeholder="e.g., Missouri, St. Louis Metro Area, National"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The geographic scope for stakeholder discovery
              </p>
            </div>

            <div className="space-y-2">
              <Label>Issue Areas *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an issue area..."
                  value={newIssueArea}
                  onChange={(e) => setNewIssueArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addIssueArea()
                    }
                  }}
                />
                <Button type="button" onClick={addIssueArea} variant="secondary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {issueAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {issueAreas.map((area) => (
                    <Badge key={area} variant="secondary" className="gap-1">
                      {area}
                      <button
                        type="button"
                        onClick={() => removeIssueArea(area)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                e.g., childhood obesity, nutrition, physical activity, food policy
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="criteria">Additional Criteria</Label>
              <Textarea
                id="criteria"
                placeholder="Any other criteria to guide stakeholder discovery..."
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Add specific requirements or exclusions for stakeholder discovery
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focalEntity">Focal Organization</Label>
              <Select value={focalEntityId} onValueChange={setFocalEntityId}>
                <SelectTrigger id="focalEntity">
                  <SelectValue placeholder="Select the organization doing strategic planning..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No focal organization</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional: The organization conducting strategic planning (will be centered in analysis)
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/communities">Cancel</Link>
              </Button>
              <Button type="submit" disabled={!isValid || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Community"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
