"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, CheckCircle } from "lucide-react"

interface ProbabilityDisplayProps {
  probability: number | null
  momentum?: {
    direction: string
    confidence: number
    key_factors: string[]
  }
  confidenceAssessment?: {
    success_likelihood: string
    key_uncertainties: string[]
    best_case: string
    worst_case: string
  }
  compact?: boolean
}

export function ProbabilityDisplay({ 
  probability, 
  momentum, 
  confidenceAssessment,
  compact = false 
}: ProbabilityDisplayProps) {
  const prob = probability ?? 0
  const probabilityPercent = Math.round(prob * 100)

  const getProbabilityColor = (p: number) => {
    if (p >= 0.7) return "text-green-600"
    if (p >= 0.4) return "text-yellow-600"
    return "text-red-600"
  }

  const getProbabilityBg = (p: number) => {
    if (p >= 0.7) return "bg-green-100"
    if (p >= 0.4) return "bg-yellow-100"
    return "bg-red-100"
  }

  const getMomentumIcon = (direction: string) => {
    switch (direction) {
      case "favorable": return <TrendingUp className="w-4 h-4 text-green-600" />
      case "unfavorable": return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getLikelihoodBadge = (likelihood: string) => {
    switch (likelihood) {
      case "high": return <Badge className="bg-green-100 text-green-800">High Likelihood</Badge>
      case "low": return <Badge className="bg-red-100 text-red-800">Low Likelihood</Badge>
      default: return <Badge className="bg-yellow-100 text-yellow-800">Medium Likelihood</Badge>
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${getProbabilityBg(prob)}`}>
        <Target className={`w-5 h-5 ${getProbabilityColor(prob)}`} />
        <div>
          <p className="text-xs text-muted-foreground">Success Probability</p>
          <p className={`text-xl font-bold ${getProbabilityColor(prob)}`}>
            {probabilityPercent}%
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Success Probability
        </CardTitle>
        <CardDescription>
          Calculated from support levels, momentum, and landscape analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Probability Display */}
        <div className="flex items-center gap-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getProbabilityBg(prob)}`}>
            <span className={`text-3xl font-bold ${getProbabilityColor(prob)}`}>
              {probabilityPercent}%
            </span>
          </div>
          <div className="flex-1">
            <Progress 
              value={probabilityPercent} 
              className="h-3 mb-2"
            />
            <p className="text-sm text-muted-foreground">
              {probabilityPercent >= 70 
                ? "Strong chance of success - maintain current strategy"
                : probabilityPercent >= 40
                ? "Moderate chance - consider adjustments"
                : "Challenging outlook - significant changes may be needed"
              }
            </p>
          </div>
        </div>

        {/* Momentum */}
        {momentum && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Momentum</span>
              <div className="flex items-center gap-1">
                {getMomentumIcon(momentum.direction)}
                <span className="text-sm capitalize">{momentum.direction}</span>
              </div>
            </div>
            {momentum.key_factors && momentum.key_factors.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Key factors:</span>{" "}
                {momentum.key_factors.slice(0, 3).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Confidence Assessment */}
        {confidenceAssessment && (
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Assessment</span>
              {getLikelihoodBadge(confidenceAssessment.success_likelihood)}
            </div>

            {confidenceAssessment.key_uncertainties && confidenceAssessment.key_uncertainties.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-sm font-medium mb-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  Key Uncertainties
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {confidenceAssessment.key_uncertainties.slice(0, 3).map((u, i) => (
                    <li key={i}>- {u}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {confidenceAssessment.best_case && (
                <div className="p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-1 text-xs font-medium text-green-700 mb-1">
                    <CheckCircle className="w-3 h-3" />
                    Best Case
                  </div>
                  <p className="text-xs text-green-800">{confidenceAssessment.best_case}</p>
                </div>
              )}
              {confidenceAssessment.worst_case && (
                <div className="p-2 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-1 text-xs font-medium text-red-700 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    Worst Case
                  </div>
                  <p className="text-xs text-red-800">{confidenceAssessment.worst_case}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
