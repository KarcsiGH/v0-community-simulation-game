"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Entity } from "@/lib/entity-types"

interface ProgramsServicesStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function ProgramsServicesStep({ data, onUpdate }: ProgramsServicesStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="targetPopulations">Target Populations</Label>
        <Textarea
          id="targetPopulations"
          placeholder="e.g., Low-income families, Youth ages 13-18, Seniors"
          value={data.targetPopulations?.join(", ") || ""}
          onChange={(e) =>
            onUpdate({
              targetPopulations: e.target.value ? [e.target.value] : [],
            })
          }
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Describe the populations you serve (separate with commas if multiple)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceArea">Geographic Service Area</Label>
        <Input
          id="serviceArea"
          placeholder="e.g., Downtown District, Citywide, Three-county region"
          value={data.geographicServiceArea || ""}
          onChange={(e) => onUpdate({ geographicServiceArea: e.target.value })}
        />
      </div>

      <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
        <p className="text-sm font-semibold">Program Details</p>
        <p className="text-sm text-muted-foreground">
          Detailed program information (names, budgets, outcomes) will be collected through:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Automated scraping from websites and annual reports</li>
          <li>Document upload (strategic plans, program descriptions)</li>
          <li>Interactive game-based data entry</li>
        </ul>
      </div>
    </div>
  )
}
