"use client"

import { useState } from "react"
import type { Entity, Relationship } from "@/lib/entity-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Users, Building2, Handshake, AlertTriangle, Minus, DollarSign, Gift, CheckCircle, AlertCircle, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface RelationshipsStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

const relationshipTypeConfig = {
  ally: { label: "Ally", icon: Users, color: "bg-green-100 text-green-800", description: "Shared mission/values" },
  partner: { label: "Partner", icon: Handshake, color: "bg-blue-100 text-blue-800", description: "Active collaboration" },
  funder: { label: "Funder", icon: DollarSign, color: "bg-purple-100 text-purple-800", description: "Provides resources" },
  beneficiary: { label: "Beneficiary", icon: Gift, color: "bg-teal-100 text-teal-800", description: "Receives resources" },
  competitor: { label: "Competitor", icon: Building2, color: "bg-orange-100 text-orange-800", description: "Same resources/audience" },
  adversary: { label: "Adversary", icon: AlertTriangle, color: "bg-red-100 text-red-800", description: "Opposing goals" },
  neutral: { label: "Neutral", icon: Minus, color: "bg-gray-100 text-gray-800", description: "No significant interaction" },
}

const strengthConfig = {
  weak: { label: "Weak", color: "bg-gray-200" },
  moderate: { label: "Moderate", color: "bg-yellow-200" },
  strong: { label: "Strong", color: "bg-green-200" },
}

const sourceConfig = {
  "structured-data": { label: "Official Data", color: "text-green-600", icon: ShieldCheck },
  "ai-research": { label: "AI Research", color: "text-amber-600", icon: AlertCircle },
  manual: { label: "Manual Entry", color: "text-blue-600", icon: Users },
  news: { label: "News Source", color: "text-purple-600", icon: ExternalLink },
  website: { label: "Website", color: "text-gray-600", icon: ExternalLink },
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 85) return "text-green-600 bg-green-50"
  if (confidence >= 70) return "text-amber-600 bg-amber-50"
  return "text-red-600 bg-red-50"
}

export function RelationshipsStep({ data, onUpdate }: RelationshipsStepProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newRelationship, setNewRelationship] = useState<Partial<Relationship>>({
    type: "partner",
    strength: "moderate",
    confidence: 100,
    source: "manual",
    verified: true, // Manual entries are verified by definition
  })

  const relationships = data.relationships || []

  const addRelationship = () => {
    if (!newRelationship.entityName?.trim()) return

    const relationship: Relationship = {
      entityName: newRelationship.entityName.trim(),
      type: newRelationship.type || "partner",
      strength: newRelationship.strength || "moderate",
      notes: newRelationship.notes,
      confidence: 100, // Manual entries have full confidence
      source: "manual",
      verified: true, // Manual entries are verified by definition
    }

    onUpdate({
      relationships: [...relationships, relationship],
    })

    setNewRelationship({ 
      type: "partner", 
      strength: "moderate",
      confidence: 100,
      source: "manual",
      verified: true,
    })
    setIsAdding(false)
  }

  const verifyRelationship = (index: number) => {
    const updated = relationships.map((rel, i) => 
      i === index ? { ...rel, verified: true } : rel
    )
    onUpdate({ relationships: updated })
  }

  const rejectRelationship = (index: number) => {
    const updated = relationships.filter((_, i) => i !== index)
    onUpdate({ relationships: updated })
  }

  const removeRelationship = (index: number) => {
    const updated = relationships.filter((_, i) => i !== index)
    onUpdate({ relationships: updated })
  }

  const updateRelationship = (index: number, updates: Partial<Relationship>) => {
    const updated = relationships.map((rel, i) => 
      i === index ? { ...rel, ...updates } : rel
    )
    onUpdate({ relationships: updated })
  }

  // Group relationships by type
  const groupedRelationships = relationships.reduce((acc, rel) => {
    const type = rel.type || "neutral"
    if (!acc[type]) acc[type] = []
    acc[type].push(rel)
    return acc
  }, {} as Record<string, Relationship[]>)

  // Calculate verification stats
  const verifiedCount = relationships.filter(r => r.verified).length
  const needsReviewCount = relationships.filter(r => !r.verified).length

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Organizational Relationships</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{relationships.length} total</span>
            {verifiedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                {verifiedCount} verified
              </span>
            )}
            {needsReviewCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-3 h-3" />
                {needsReviewCount} needs review
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="w-4 h-4 mr-2" />
          Add Relationship
        </Button>
      </div>

      {/* Needs Review Alert */}
      {needsReviewCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">
                {needsReviewCount} relationship{needsReviewCount !== 1 ? "s" : ""} need{needsReviewCount === 1 ? "s" : ""} review
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                These relationships were discovered by AI and require your confirmation. 
                Verify each one is accurate or remove if incorrect.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add New Relationship Form */}
      {isAdding && (
        <Card className="border-dashed border-2 border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add New Relationship</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityName">Organization Name *</Label>
                <Input
                  id="entityName"
                  placeholder="Enter organization name"
                  value={newRelationship.entityName || ""}
                  onChange={(e) => setNewRelationship({ ...newRelationship, entityName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Relationship Type *</Label>
                <Select
                  value={newRelationship.type}
                  onValueChange={(value) => setNewRelationship({ ...newRelationship, type: value as Relationship["type"] })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(relationshipTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          <span>{config.label}</span>
                          <span className="text-muted-foreground text-xs">- {config.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="strength">Relationship Strength *</Label>
                <Select
                  value={newRelationship.strength}
                  onValueChange={(value) => setNewRelationship({ ...newRelationship, strength: value as Relationship["strength"] })}
                >
                  <SelectTrigger id="strength">
                    <SelectValue placeholder="Select strength" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weak">Weak - Occasional interaction</SelectItem>
                    <SelectItem value="moderate">Moderate - Regular engagement</SelectItem>
                    <SelectItem value="strong">Strong - Deep partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Describe the nature of this relationship..."
                value={newRelationship.notes || ""}
                onChange={(e) => setNewRelationship({ ...newRelationship, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={addRelationship} disabled={!newRelationship.entityName?.trim()}>
                Add Relationship
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Relationships */}
      {relationships.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedRelationships).map(([type, rels]) => {
            const config = relationshipTypeConfig[type as keyof typeof relationshipTypeConfig]
            const Icon = config?.icon || Users
            
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="w-4 h-4" />
                  <span>{config?.label || type}</span>
                  <Badge variant="secondary" className="text-xs">{rels.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {rels.map((rel) => {
                    const globalIndex = relationships.findIndex(r => r === rel)
                    const typeConfig = relationshipTypeConfig[rel.type as keyof typeof relationshipTypeConfig]
                    const strengthCfg = strengthConfig[rel.strength as keyof typeof strengthConfig]
                    const srcConfig = sourceConfig[rel.source as keyof typeof sourceConfig]
                    const isVerified = rel.verified
                    const confidence = rel.confidence || 0
                    const needsReview = !isVerified && confidence < 85
                    
                    return (
                      <TooltipProvider key={globalIndex}>
                        <div
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            needsReview 
                              ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50" 
                              : "bg-card hover:bg-accent/50"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${typeConfig?.color || "bg-gray-100"}`}>
                            {typeConfig?.icon && <typeConfig.icon className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{rel.entityName}</span>
                              <Badge variant="outline" className={`text-xs ${strengthCfg?.color || ""}`}>
                                {strengthCfg?.label || rel.strength}
                              </Badge>
                              {/* Verification Status */}
                              {isVerified ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Verified
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>This relationship has been verified</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Needs Review
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>AI-discovered relationship - please verify</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* Confidence Score */}
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className={`text-xs ${getConfidenceColor(confidence)}`}>
                                    {confidence}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Confidence: {confidence}%</p>
                                  <p className="text-xs text-muted-foreground">
                                    {confidence >= 85 ? "High confidence" : confidence >= 70 ? "Moderate confidence" : "Low confidence - verify"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {/* Source indicator */}
                              {srcConfig && (
                                <span className={`text-xs flex items-center gap-1 ${srcConfig.color}`}>
                                  <srcConfig.icon className="w-3 h-3" />
                                  {srcConfig.label}
                                </span>
                              )}
                              {rel.sourceUrl && (
                                <a 
                                  href={rel.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Source
                                </a>
                              )}
                            </div>
                            {rel.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{rel.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Verify/Reject buttons for unverified relationships */}
                            {!isVerified && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => verifyRelationship(globalIndex)}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Verify this relationship</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => rejectRelationship(globalIndex)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remove - not accurate</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {isVerified && (
                              <>
                                <Select
                                  value={rel.type}
                                  onValueChange={(value) => updateRelationship(globalIndex, { type: value as Relationship["type"] })}
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(relationshipTypeConfig).map(([key, cfg]) => (
                                      <SelectItem key={key} value={key}>
                                        {cfg.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeRelationship(globalIndex)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </TooltipProvider>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h4 className="font-medium mb-1">No relationships documented yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Relationships were either not discovered automatically or haven't been added manually.
          </p>
          <Button variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Relationship
          </Button>
        </div>
      )}

      {/* Relationship Type Legend */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="font-medium text-sm mb-3">Relationship Type Guide</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(relationshipTypeConfig).map(([key, config]) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <Badge className={config.color}>{config.label}</Badge>
              <span className="text-muted-foreground">{config.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
