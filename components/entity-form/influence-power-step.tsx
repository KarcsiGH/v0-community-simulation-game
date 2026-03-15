"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Entity, InfluenceLevel, LevelScale } from "@/lib/entity-types"

interface InfluencePowerStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function InfluencePowerStep({ data, onUpdate }: InfluencePowerStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Community Influence Level</Label>
          <span className="text-2xl font-bold text-primary">{data.communityInfluenceLevel || 5}</span>
        </div>
        <Slider
          value={[data.communityInfluenceLevel || 5]}
          onValueChange={(values) => onUpdate({ communityInfluenceLevel: values[0] as InfluenceLevel })}
          min={1}
          max={10}
          step={1}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Low Influence</span>
          <span>Moderate</span>
          <span>Very High Influence</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="politicalConnections">Political Connections</Label>
        <Textarea
          id="politicalConnections"
          placeholder="Describe key political relationships, connections to elected officials, etc."
          rows={3}
          value={data.politicalConnections || ""}
          onChange={(e) => onUpdate({ politicalConnections: e.target.value })}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="mediaPresence">Media Presence</Label>
          <Select
            value={data.mediaPresence}
            onValueChange={(value) => onUpdate({ mediaPresence: value as LevelScale })}
          >
            <SelectTrigger id="mediaPresence">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="networkReach">Network Reach</Label>
          <Select value={data.networkReach} onValueChange={(value) => onUpdate({ networkReach: value as LevelScale })}>
            <SelectTrigger id="networkReach">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="decisionAuthority">Decision-Making Authority</Label>
          <Select
            value={data.decisionMakingAuthority}
            onValueChange={(value) => onUpdate({ decisionMakingAuthority: value as LevelScale })}
          >
            <SelectTrigger id="decisionAuthority">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
