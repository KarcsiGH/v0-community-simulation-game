"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface InitialQuestionnaireProps {
  onComplete: (answers: {
    name: string
    type: string
    website?: string
    ein?: string
    location?: string
  }) => void
}

export function InitialQuestionnaire({ onComplete }: InitialQuestionnaireProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [website, setWebsite] = useState("")
  const [ein, setEin] = useState("")
  const [location, setLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500))

    onComplete({ name, type, website, ein, location })
  }

  const canSubmit = name && type

  return (
    <Card>
      <CardHeader>
        <CardTitle>Let's Get Started</CardTitle>
        <CardDescription>
          Answer a few quick questions. We'll use this information to automatically gather as much data as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Organization/Individual Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Acme Community Foundation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Entity Type *</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="for-profit">For-Profit Business</SelectItem>
                <SelectItem value="government">Government Agency</SelectItem>
                <SelectItem value="individual-influencer">Individual Influencer/Leader</SelectItem>
                <SelectItem value="civic-group">Civic Group</SelectItem>
                <SelectItem value="coalition">Coalition/Network</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.org"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll scrape their website for mission, programs, and leadership info
            </p>
          </div>

          {(type === "nonprofit" || type === "foundation") && (
            <div className="space-y-2">
              <Label htmlFor="ein">EIN / Tax ID (optional)</Label>
              <Input id="ein" placeholder="12-3456789" value={ein} onChange={(e) => setEin(e.target.value)} />
              <p className="text-xs text-muted-foreground">We'll automatically fetch IRS Form 990 financial data</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              placeholder="e.g., San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Helps narrow web searches and find relevant news</p>
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Automated Data Collection...
              </>
            ) : (
              "Start Automated Data Collection"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
