"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Entity } from "@/lib/entity-types"

interface FinancialCapacityStepProps {
  data: Partial<Entity>
  onUpdate: (updates: Partial<Entity>) => void
}

export function FinancialCapacityStep({ data, onUpdate }: FinancialCapacityStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="annualRevenue">Annual Revenue ($)</Label>
          <Input
            id="annualRevenue"
            type="number"
            placeholder="e.g., 500000"
            value={data.annualRevenue || ""}
            onChange={(e) => onUpdate({ annualRevenue: Number.parseFloat(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualExpenses">Annual Expenses ($)</Label>
          <Input
            id="annualExpenses"
            type="number"
            placeholder="e.g., 480000"
            value={data.annualExpenses || ""}
            onChange={(e) => onUpdate({ annualExpenses: Number.parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="programExpense">Program Expenses (%)</Label>
          <Input
            id="programExpense"
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 75"
            value={data.programExpensePercent || ""}
            onChange={(e) => onUpdate({ programExpensePercent: Number.parseFloat(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminExpense">Admin Expenses (%)</Label>
          <Input
            id="adminExpense"
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 15"
            value={data.adminExpensePercent || ""}
            onChange={(e) => onUpdate({ adminExpensePercent: Number.parseFloat(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fundraisingExpense">Fundraising (%)</Label>
          <Input
            id="fundraisingExpense"
            type="number"
            min="0"
            max="100"
            placeholder="e.g., 10"
            value={data.fundraisingExpensePercent || ""}
            onChange={(e) => onUpdate({ fundraisingExpensePercent: Number.parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="assets">Total Assets ($)</Label>
          <Input
            id="assets"
            type="number"
            placeholder="e.g., 250000"
            value={data.assets || ""}
            onChange={(e) => onUpdate({ assets: Number.parseFloat(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthsCash">Months Cash on Hand</Label>
          <Input
            id="monthsCash"
            type="number"
            step="0.1"
            placeholder="e.g., 3.5"
            value={data.monthsCashOnHand || ""}
            onChange={(e) => onUpdate({ monthsCashOnHand: Number.parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Financial data can often be automatically extracted from IRS 990 forms, annual reports,
          or organizational websites. The automated data collection module will help populate these fields.
        </p>
      </div>
    </div>
  )
}
