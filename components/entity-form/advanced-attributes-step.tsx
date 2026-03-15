"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Entity, LevelScale, AttitudeLevel } from "@/lib/entity-types"

interface AdvancedAttributesStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function AdvancedAttributesStep({ data, onUpdate }: AdvancedAttributesStepProps) {
  return (
    <Tabs defaultValue="environmental" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="environmental">Environmental</TabsTrigger>
        <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
        <TabsTrigger value="cognitive">Cognitive</TabsTrigger>
        <TabsTrigger value="systems">Systems</TabsTrigger>
      </TabsList>

      <TabsContent value="environmental" className="space-y-6 mt-6">
        <h3 className="font-semibold text-lg">Environmental Context</h3>
        <p className="text-sm text-muted-foreground">Operating conditions that shape behavior</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="policyEnv">Policy/Regulatory Environment</Label>
            <Select
              value={data.policyEnvironment}
              onValueChange={(value) => onUpdate({ policyEnvironment: value as Entity["policyEnvironment"] })}
            >
              <SelectTrigger id="policyEnv">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permissive">Permissive</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="restrictive">Restrictive</SelectItem>
                <SelectItem value="highly-regulated">Highly Regulated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketComp">Market Competitiveness</Label>
            <Select
              value={data.marketCompetitiveness}
              onValueChange={(value) => onUpdate({ marketCompetitiveness: value as Entity["marketCompetitiveness"] })}
            >
              <SelectTrigger id="marketComp">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="few-actors">Few Actors</SelectItem>
                <SelectItem value="moderate">Moderate Competition</SelectItem>
                <SelectItem value="highly-competitive">Highly Competitive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="externalShocks">External Shocks Level</Label>
            <Select
              value={data.externalShocksLevel}
              onValueChange={(value) => onUpdate({ externalShocksLevel: value as LevelScale })}
            >
              <SelectTrigger id="externalShocks">
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
            <Label htmlFor="needLevel">Community Need Level</Label>
            <Select
              value={data.communityNeedLevel}
              onValueChange={(value) => onUpdate({ communityNeedLevel: value as LevelScale })}
            >
              <SelectTrigger id="needLevel">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High - Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="behavioral" className="space-y-6 mt-6">
        <h3 className="font-semibold text-lg">Behavioral Rules & Strategies</h3>
        <p className="text-sm text-muted-foreground">How the entity makes decisions and adapts</p>

        <div className="space-y-2">
          <Label htmlFor="decisionRules">Decision Rules</Label>
          <Textarea
            id="decisionRules"
            placeholder="Describe how this entity allocates resources, chooses partners, and responds to requests..."
            rows={3}
            value={data.decisionRules || ""}
            onChange={(e) => onUpdate({ decisionRules: e.target.value })}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="learningRate">Learning/Adaptation Rate</Label>
            <Select
              value={data.learningAdaptationRate}
              onValueChange={(value) => onUpdate({ learningAdaptationRate: value as LevelScale })}
            >
              <SelectTrigger id="learningRate">
                <SelectValue placeholder="Select rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Slow to Change</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High - Rapidly Adapts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeHorizon">Time Horizon</Label>
            <Select
              value={data.timeHorizon}
              onValueChange={(value) => onUpdate({ timeHorizon: value as Entity["timeHorizon"] })}
            >
              <SelectTrigger id="timeHorizon">
                <SelectValue placeholder="Select horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short-term">Short-Term (0-2 years)</SelectItem>
                <SelectItem value="medium-term">Medium-Term (3-5 years)</SelectItem>
                <SelectItem value="long-term">Long-Term (5+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="cognitive" className="space-y-6 mt-6">
        <h3 className="font-semibold text-lg">Information & Cognition</h3>
        <p className="text-sm text-muted-foreground">
          How the entity processes information and makes sense of the world
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="infoAccess">Information Access</Label>
            <Select
              value={data.informationAccess}
              onValueChange={(value) => onUpdate({ informationAccess: value as LevelScale })}
            >
              <SelectTrigger id="infoAccess">
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
            <Label htmlFor="analyticalCap">Analytical Capacity</Label>
            <Select
              value={data.analyticalCapacity}
              onValueChange={(value) => onUpdate({ analyticalCapacity: value as LevelScale })}
            >
              <SelectTrigger id="analyticalCap">
                <SelectValue placeholder="Select capacity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High - Sophisticated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transparency">Transparency Level</Label>
            <Select
              value={data.transparencyLevel}
              onValueChange={(value) => onUpdate({ transparencyLevel: value as LevelScale })}
            >
              <SelectTrigger id="transparency">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Opaque</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High - Very Transparent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attitudeSupport">Attitude/Support Level</Label>
            <Select
              value={data.attitudeSupport}
              onValueChange={(value) => onUpdate({ attitudeSupport: value as AttitudeLevel })}
            >
              <SelectTrigger id="attitudeSupport">
                <SelectValue placeholder="Select attitude" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hostile">Hostile</SelectItem>
                <SelectItem value="resistant">Resistant</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="supportive">Supportive</SelectItem>
                <SelectItem value="champion">Champion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="systems" className="space-y-6 mt-6">
        <h3 className="font-semibold text-lg">Systems-Change & Equity Orientation</h3>
        <p className="text-sm text-muted-foreground">Approach to structural change and power-sharing</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="systemsChange">Systems-Change Focus</Label>
            <Select
              value={data.systemsChangeFocus}
              onValueChange={(value) => onUpdate({ systemsChangeFocus: value as Entity["systemsChangeFocus"] })}
            >
              <SelectTrigger id="systemsChange">
                <SelectValue placeholder="Select focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service-delivery">Service Delivery</SelectItem>
                <SelectItem value="mixed">Mixed Approach</SelectItem>
                <SelectItem value="policy-advocacy">Policy Advocacy</SelectItem>
                <SelectItem value="structural-change">Structural Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="powerSharing">Power-Sharing Practices</Label>
            <Select
              value={data.powerSharingPractices}
              onValueChange={(value) => onUpdate({ powerSharingPractices: value as LevelScale })}
            >
              <SelectTrigger id="powerSharing">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Top-Down</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High - Community-Led</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
