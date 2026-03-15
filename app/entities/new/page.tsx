"use client"

import { useState } from "react"
import { EntityForm } from "@/components/entity-form"
import { InitialQuestionnaire } from "@/components/initial-questionnaire"
import { AutomatedDataCollector } from "@/components/automated-data-collector"
import type { Entity } from "@/lib/entity-types"

type Stage = "questionnaire" | "collecting" | "game"

export default function NewEntityPage() {
  const [stage, setStage] = useState<Stage>("questionnaire")
  const [initialAnswers, setInitialAnswers] = useState<any>(null)
  const [collectedData, setCollectedData] = useState<Partial<Entity>>({})

  const handleQuestionnaireComplete = (answers: any) => {
    setInitialAnswers(answers)
    setStage("collecting")
  }

  const handleCollectionComplete = (data: Partial<Entity>) => {
    setCollectedData(data)
    setStage("game")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Entity</h1>
            <p className="text-muted-foreground">
              {stage === "questionnaire" && "Answer a few questions to get started"}
              {stage === "collecting" && "Automatically gathering data from multiple sources"}
              {stage === "game" && "Complete your entity profile"}
            </p>
          </div>

          {stage === "questionnaire" && <InitialQuestionnaire onComplete={handleQuestionnaireComplete} />}

          {stage === "collecting" && initialAnswers && (
            <AutomatedDataCollector initialAnswers={initialAnswers} onComplete={handleCollectionComplete} />
          )}

          {stage === "game" && <EntityForm initialData={collectedData} />}
        </div>
      </div>
    </div>
  )
}
