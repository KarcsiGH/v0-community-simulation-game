"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Entity } from "@/lib/entity-types"

interface BasicIdentityStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function BasicIdentityStep({ data, onUpdate }: BasicIdentityStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Entity Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Community Health Center"
          value={data.name || ""}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Entity Type *</Label>
        <Select value={data.type} onValueChange={(value) => onUpdate({ type: value as Entity["type"] })}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nonprofit">Nonprofit Organization</SelectItem>
            <SelectItem value="foundation">Foundation</SelectItem>
            <SelectItem value="for-profit">For-Profit Company</SelectItem>
            <SelectItem value="government">Government Agency</SelectItem>
            <SelectItem value="individual-influencer">Individual Influencer/Leader</SelectItem>
            <SelectItem value="civic-group">Civic Group</SelectItem>
            <SelectItem value="coalition">Coalition/Network</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mission">Mission/Purpose *</Label>
        <Textarea
          id="mission"
          placeholder="What is the primary mission or purpose of this entity?"
          rows={4}
          value={data.mission || ""}
          onChange={(e) => onUpdate({ mission: e.target.value })}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="foundedDate">Founded Date</Label>
          <Input
            id="foundedDate"
            type="text"
            placeholder="e.g., 2010 or January 2010"
            value={data.foundedDate || ""}
            onChange={(e) => onUpdate({ foundedDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="legalStructure">Legal Structure</Label>
          <Input
            id="legalStructure"
            placeholder="e.g., 501(c)(3), LLC, Municipal"
            value={data.legalStructure || ""}
            onChange={(e) => onUpdate({ legalStructure: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          placeholder="https://..."
          value={data.website || ""}
          onChange={(e) => onUpdate({ website: e.target.value })}
        />
      </div>
    </div>
  )
}
