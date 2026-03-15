"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import { db } from "@/lib/db"
import type { Entity } from "@/lib/entity-types"
import { InitialQuestionnaire } from "@/components/initial-questionnaire"
import { AutomatedDataCollector } from "@/components/automated-data-collector"
import { EntityForm } from "@/components/entity-form"

type Stage = "questionnaire" | "collecting" | "form"

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [entity, setEntity] = useState<Entity | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // State for "new" entity creation flow
  const [stage, setStage] = useState<Stage>("questionnaire")
  const [initialAnswers, setInitialAnswers] = useState<any>(null)
  const [collectedData, setCollectedData] = useState<Partial<Entity>>({})

  const id = params.id as string
  const isNewRoute = id === "new"

  useEffect(() => {
    // Skip API call for "new" route - we'll show the creation form
    if (isNewRoute) {
      setIsLoading(false)
      return
    }

    const loadEntity = async () => {
      const found = await db.getEntityById(id)
      setEntity(found || null)
      setIsLoading(false)
    }
    loadEntity()
  }, [id, isNewRoute])

  // Handlers for new entity creation flow
  const handleQuestionnaireComplete = (answers: any) => {
    setInitialAnswers(answers)
    setStage("collecting")
  }

  const handleDataCollectionComplete = (data: Partial<Entity>) => {
    setCollectedData(data)
    setStage("form")
  }

  // Render new entity creation flow
  if (isNewRoute) {
    return (
      <div className="container mx-auto py-8">
        {stage === "questionnaire" && (
          <InitialQuestionnaire onComplete={handleQuestionnaireComplete} />
        )}
        {stage === "collecting" && initialAnswers && (
          <AutomatedDataCollector
            initialAnswers={initialAnswers}
            onComplete={handleDataCollectionComplete}
          />
        )}
        {stage === "form" && (
          <EntityForm initialData={collectedData} />
        )}
      </div>
    )
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this entity?")) {
      await db.deleteEntity(entity!.id)
      router.push("/entities")
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading entity...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Entity not found</p>
            <Link href="/entities">
              <Button className="mt-4">Back to Entities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/entities">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Badge variant="secondary">{entity.type}</Badge>
                <CardTitle className="text-3xl">{entity.name}</CardTitle>
                <CardDescription>{entity.mission}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {entity.annualRevenue && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Revenue:</span>
                  <span className="font-semibold">${entity.annualRevenue.toLocaleString()}</span>
                </div>
                {entity.annualExpenses && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Expenses:</span>
                    <span className="font-semibold">${entity.annualExpenses.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {entity.staffCount && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Human Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="font-semibold">{entity.staffCount}</span>
                </div>
                {entity.volunteerCount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volunteers:</span>
                    <span className="font-semibold">{entity.volunteerCount}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {entity.communityInfluenceLevel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Influence & Power</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Community Influence:</span>
                  <span className="font-semibold">{entity.communityInfluenceLevel}/10</span>
                </div>
              </CardContent>
            </Card>
          )}

          {entity.geographicServiceArea && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Area</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{entity.geographicServiceArea}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {entity.targetPopulations && entity.targetPopulations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Populations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{entity.targetPopulations.join(", ")}</p>
            </CardContent>
          </Card>
        )}

        {entity.coreValues && entity.coreValues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Core Values</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{entity.coreValues.join(", ")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
