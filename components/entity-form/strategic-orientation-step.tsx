"use client"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
  Entity,
  RiskTolerance,
  CollaborationWillingness,
  LevelScale,
  DecisionMakingStyle,
} from "@/lib/entity-types"

interface StrategicOrientationStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function StrategicOrientationStep({ data, onUpdate }: StrategicOrientationStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="coreValues">Core Values</Label>
        <Textarea
          id="coreValues"
          placeholder="e.g., Equity, Innovation, Community, Transparency"
          value={data.coreValues?.join(", ") || ""}
          onChange={(e) =>
            onUpdate({
              coreValues: [e.target.value],
            })
          }
          rows={2}
        />
        <p className="text-xs text-muted-foreground">Separate multiple values with commas</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="riskTolerance">Risk Tolerance</Label>
          <Select
            value={data.riskTolerance}
            onValueChange={(value) => onUpdate({ riskTolerance: value as RiskTolerance })}
          >
            <SelectTrigger id="riskTolerance">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="collaboration">Collaboration Willingness</Label>
          <Select
            value={data.collaborationWillingness}
            onValueChange={(value) => onUpdate({ collaborationWillingness: value as CollaborationWillingness })}
          >
            <SelectTrigger id="collaboration">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="innovation">Innovation Orientation</Label>
          <Select
            value={data.innovationOrientation}
            onValueChange={(value) => onUpdate({ innovationOrientation: value as LevelScale })}
          >
            <SelectTrigger id="innovation">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - Traditional Approach</SelectItem>
              <SelectItem value="medium">Medium - Balanced</SelectItem>
              <SelectItem value="high">High - Cutting Edge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="decisionStyle">Decision-Making Style</Label>
          <Select
            value={data.decisionMakingStyle}
            onValueChange={(value) => onUpdate({ decisionMakingStyle: value as DecisionMakingStyle })}
          >
            <SelectTrigger id="decisionStyle">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consensus-driven">Consensus-Driven</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="data-driven">Data-Driven</SelectItem>
              <SelectItem value="intuitive">Intuitive</SelectItem>
              <SelectItem value="participatory">Participatory</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="equityOrientation">Equity/Justice Orientation</Label>
          <Select
            value={data.equityJusticeOrientation}
            onValueChange={(value) => onUpdate({ equityJusticeOrientation: value as LevelScale })}
          >
            <SelectTrigger id="equityOrientation">
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
          <Label htmlFor="accountability">Community Accountability</Label>
          <Select
            value={data.communityAccountability}
            onValueChange={(value) => onUpdate({ communityAccountability: value as LevelScale })}
          >
            <SelectTrigger id="accountability">
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
