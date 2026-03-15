"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Entity } from "@/lib/entity-types"

interface HumanResourcesStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function HumanResourcesStep({ data, onUpdate }: HumanResourcesStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="staffCount">Staff Count</Label>
          <Input
            id="staffCount"
            type="number"
            placeholder="e.g., 25"
            value={data.staffCount || ""}
            onChange={(e) => onUpdate({ staffCount: Number.parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="volunteerCount">Volunteer Count</Label>
          <Input
            id="volunteerCount"
            type="number"
            placeholder="e.g., 50"
            value={data.volunteerCount || ""}
            onChange={(e) => onUpdate({ volunteerCount: Number.parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="boardSize">Board Size</Label>
          <Input
            id="boardSize"
            type="number"
            placeholder="e.g., 12"
            value={data.boardSize || ""}
            onChange={(e) => onUpdate({ boardSize: Number.parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="staffTurnover">Staff Turnover Rate (%/year)</Label>
        <Input
          id="staffTurnover"
          type="number"
          step="0.1"
          placeholder="e.g., 15.5"
          value={data.staffTurnoverRate || ""}
          onChange={(e) => onUpdate({ staffTurnoverRate: Number.parseFloat(e.target.value) })}
        />
      </div>

      <div className="rounded-lg border p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Key Leadership:</strong> Will be captured in the interactive game module
        </p>
        <p className="text-sm text-muted-foreground">
          The gamified data collection will help identify decision-makers, their roles, and influence patterns within
          the organization.
        </p>
      </div>
    </div>
  )
}
