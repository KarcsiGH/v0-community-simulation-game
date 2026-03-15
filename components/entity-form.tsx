"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BasicIdentityStep } from "@/components/entity-form/basic-identity-step"
import { FinancialCapacityStep } from "@/components/entity-form/financial-capacity-step"
import { HumanResourcesStep } from "@/components/entity-form/human-resources-step"
import { ProgramsServicesStep } from "@/components/entity-form/programs-services-step"
import { InfluencePowerStep } from "@/components/entity-form/influence-power-step"
import { RelationshipsStep } from "@/components/entity-form/relationships-step"
import { StrategicOrientationStep } from "@/components/entity-form/strategic-orientation-step"
import { AdvancedAttributesStep } from "@/components/entity-form/advanced-attributes-step"
import type { Entity } from "@/lib/entity-types"
import { db } from "@/lib/db"
import { useRouter } from "next/navigation"

const STEPS = [
  { id: "basic", title: "Basic Identity", description: "Name, type, and mission" },
  { id: "financial", title: "Financial Capacity", description: "Budget and resources" },
  { id: "human", title: "Human Resources", description: "Staff and leadership" },
  { id: "programs", title: "Programs & Services", description: "What they do" },
  { id: "influence", title: "Influence & Power", description: "Community impact" },
  { id: "relationships", title: "Relationships", description: "Connections and networks" },
  { id: "strategic", title: "Strategic Orientation", description: "Goals and approach" },
  { id: "advanced", title: "Advanced Attributes", description: "Detailed characteristics" },
]

interface EntityFormProps {
  initialData?: Partial<Entity>
}

export function EntityForm({ initialData = {} }: EntityFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<Entity>>({
    id: crypto.randomUUID(),
    fundingSources: [],
    programs: [],
    targetPopulations: [],
    geographicServiceArea: "",
    keyLeadership: [],
    relationships: [],
    strategicGoals: [],
    coreValues: [],
    communityInfluenceLevel: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...initialData,
  })

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const router = useRouter()

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await db.saveEntity(formData as Entity)
      if (success) {
        router.push("/entities")
      } else {
        alert("Error saving entity. Please try again.")
      }
    } catch (error) {
      console.error("Error saving entity:", error)
      alert("Error saving entity. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const updateFormData = (updates: Partial<Entity>) => {
    setFormData((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }))
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center mt-4">
              <div>
                <h3 className="font-semibold text-lg">{STEPS[currentStep].title}</h3>
                <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Steps */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>
            Fill in as much information as you have available. You can always update later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && <BasicIdentityStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 1 && <FinancialCapacityStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 2 && <HumanResourcesStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 3 && <ProgramsServicesStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 4 && <InfluencePowerStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 5 && <RelationshipsStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 6 && <StrategicOrientationStep data={formData} onUpdate={updateFormData} />}
          {currentStep === 7 && <AdvancedAttributesStep data={formData} onUpdate={updateFormData} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Entity"}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
