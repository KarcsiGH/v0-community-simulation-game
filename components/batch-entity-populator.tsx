"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react"

interface StubEntity {
  id: string
  name: string
  type: string
  qualityScore?: number
}

interface ProcessingResult {
  entityId: string
  entityName: string
  success: boolean
  qualityScore?: number
  error?: string
}

interface BatchEntityPopulatorProps {
  stubEntities: StubEntity[]
  onComplete: () => void
}

export function BatchEntityPopulator({
  stubEntities,
  onComplete,
}: BatchEntityPopulatorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [currentEntity, setCurrentEntity] = useState<string | null>(null)
  
  const pauseRef = useRef(false)
  const abortRef = useRef(false)

  const processEntity = async (entity: StubEntity): Promise<ProcessingResult> => {
    try {
      const response = await fetch(`/api/entities/${entity.id}/populate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          entityId: entity.id,
          entityName: entity.name,
          success: false,
          error: errorData.error || "Failed to populate",
        }
      }

      const data = await response.json()
      return {
        entityId: entity.id,
        entityName: entity.name,
        success: true,
        qualityScore: data.qualityScore,
      }
    } catch (error) {
      return {
        entityId: entity.id,
        entityName: entity.name,
        success: false,
        error: "Network error",
      }
    }
  }

  const startProcessing = useCallback(async () => {
    setIsProcessing(true)
    setIsPaused(false)
    pauseRef.current = false
    abortRef.current = false

    for (let i = currentIndex; i < stubEntities.length; i++) {
      // Check for pause or abort
      if (pauseRef.current) {
        setCurrentIndex(i)
        setIsProcessing(false)
        return
      }
      if (abortRef.current) {
        setIsProcessing(false)
        return
      }

      const entity = stubEntities[i]
      setCurrentEntity(entity.name)
      setCurrentIndex(i)

      const result = await processEntity(entity)
      setResults((prev) => [...prev, result])

      // Delay between requests to avoid rate limiting
      if (i < stubEntities.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    setCurrentIndex(stubEntities.length)
    setCurrentEntity(null)
    setIsProcessing(false)
    onComplete()
  }, [currentIndex, stubEntities, onComplete])

  const pauseProcessing = () => {
    pauseRef.current = true
    setIsPaused(true)
  }

  const resumeProcessing = () => {
    startProcessing()
  }

  const progress = stubEntities.length > 0 
    ? Math.round((results.length / stubEntities.length) * 100) 
    : 0

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  if (stubEntities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Entity Data Population
          </CardTitle>
          <CardDescription>
            All entities have complete data profiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>No stub entities to process</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Entity Data Population
        </CardTitle>
        <CardDescription>
          Populate detailed data for {stubEntities.length} entities using AI research, financial records, and relationship discovery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {results.length} of {stubEntities.length}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Status */}
        {isProcessing && currentEntity && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing: {currentEntity}
          </div>
        )}

        {isPaused && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Pause className="h-4 w-4" />
            Paused - Click Resume to continue
          </div>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              {successCount} successful
            </div>
            {failureCount > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" />
                {failureCount} failed
              </div>
            )}
          </div>
        )}

        {/* Recent Results */}
        {results.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
            {results.slice(-10).reverse().map((result, i) => (
              <div
                key={result.entityId}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="truncate flex-1">{result.entityName}</span>
                {result.success ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Score: {result.qualityScore}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    Failed
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            This process makes multiple API calls per entity. Processing {stubEntities.length} entities 
            will take approximately {Math.ceil(stubEntities.length * 0.5)} minutes.
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isProcessing && results.length === 0 && (
            <Button onClick={startProcessing} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start Population
            </Button>
          )}

          {isProcessing && !isPaused && (
            <Button onClick={pauseProcessing} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}

          {isPaused && (
            <Button onClick={resumeProcessing} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}

          {results.length === stubEntities.length && (
            <Button onClick={onComplete} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
