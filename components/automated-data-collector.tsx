"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Loader2, XCircle, Globe, FileText, Search, Database, BookOpen, Users } from "lucide-react"
import type { Entity, Relationship } from "@/lib/entity-types"

interface CollectionTask {
  id: string
  title: string
  description: string
  icon: any
  status: "pending" | "running" | "complete" | "failed"
  dataFound?: boolean
  details?: string
}

interface AutomatedDataCollectorProps {
  initialAnswers: {
    name: string
    type: string
    website?: string
    ein?: string
    location?: string
  }
  onComplete: (data: Partial<Entity>) => void
}

export function AutomatedDataCollector({ initialAnswers, onComplete }: AutomatedDataCollectorProps) {
  // Determine which financial lookup to use based on entity type
  const getFinancialTask = (): CollectionTask => {
    const entityType = initialAnswers.type
    if (entityType === "nonprofit" || entityType === "foundation") {
      return {
        id: "financial",
        title: "IRS Form 990 Lookup",
        description: "Searching for financial data from tax filings",
        icon: FileText,
        status: "pending",
      }
    } else if (entityType === "for-profit") {
      return {
        id: "financial",
        title: "SEC EDGAR Lookup",
        description: "Searching for 10-K filings and financial data",
        icon: FileText,
        status: "pending",
      }
    } else if (entityType === "government") {
      return {
        id: "financial",
        title: "USAspending.gov Lookup",
        description: "Searching for federal spending and budget data",
        icon: FileText,
        status: "pending",
      }
    }
    return {
      id: "financial",
      title: "Public Financial Records",
      description: "Searching for available financial disclosures",
      icon: FileText,
      status: "pending",
    }
  }

  // Determine if we should use nonprofit or corporate registry sources
  const isNonprofitType = initialAnswers.type === "nonprofit" || initialAnswers.type === "foundation"

  const [tasks, setTasks] = useState<CollectionTask[]>([
    {
      id: "website",
      title: "Website Scraping",
      description: "Extracting mission, programs, and leadership from website",
      icon: Globe,
      status: "pending",
    },
    {
      id: "wikipedia",
      title: "Wikipedia Lookup",
      description: "Searching for founding date, history, and key facts",
      icon: BookOpen,
      status: "pending",
    },
    {
      id: "ai-research",
      title: "AI-Powered Deep Research",
      description: "Using ChatGPT, Claude, and Perplexity for comprehensive analysis",
      icon: Search,
      status: "pending",
    },
    getFinancialTask(),
    {
      id: "usaspending",
      title: "Federal Grants & Contracts",
      description: "Checking USAspending.gov for federal funding received",
      icon: Database,
      status: "pending",
    },
    {
      id: "relationships",
      title: "Relationship Discovery",
      description: "Finding organizational partnerships, funders, and connections",
      icon: Users,
      status: "pending",
    },
    {
      id: "websearch",
      title: "Traditional Web Search",
      description: "Finding additional news articles and public information",
      icon: Search,
      status: "pending",
    },
  ])

  const [collectedData, setCollectedData] = useState<Partial<Entity>>({
    name: initialAnswers.name,
    type: initialAnswers.type,
    website: initialAnswers.website,
  })

  // Use a ref to track the latest data (avoids stale closure issue)
  const dataRef = useRef<Partial<Entity>>({
    name: initialAnswers.name,
    type: initialAnswers.type,
    website: initialAnswers.website,
  })

  const [allComplete, setAllComplete] = useState(false)

  useEffect(() => {
    runDataCollection()
  }, [])

  const runDataCollection = async () => {
    // Task 1: Website Scraping
    if (initialAnswers.website) {
      await runTask("website", async () => {
        const response = await fetch("/api/scrape-website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            url: initialAnswers.website,
            organizationName: initialAnswers.name,
            organizationType: initialAnswers.type,
          }),
        })
        const data = await response.json()

        if (data.error) {
          return { found: false, details: data.error }
        }

        // Preserve initial answers (name, type) - only merge NEW fields from scraped data
        // Remove fields that should not overwrite initial answers
        const { name: _name, type: _type, ...scrapedFields } = data

        const newData = {
          ...dataRef.current,
          ...scrapedFields,
          // Ensure initial answers are preserved
          name: initialAnswers.name,
          type: initialAnswers.type as Entity["type"],
          dataSources: [
            ...(dataRef.current.dataSources || []),
            {
              type: "website" as const,
              url: initialAnswers.website!,
              date: new Date().toISOString(),
              confidence: data.dataQualityScore || 70,
            },
          ],
        }
        dataRef.current = newData
        setCollectedData(newData)

        return {
          found: true,
          details: `Found mission, ${data.programs?.length || 0} programs, ${data.keyLeadership?.length || 0} leaders`,
        }
      })
    } else {
      updateTaskStatus("website", "complete", false, "No website provided - skipped")
    }

    // Task 2: Wikipedia Lookup (for founding date, history, key facts)
    await runTask("wikipedia", async () => {
      const response = await fetch("/api/search-wikipedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: initialAnswers.name,
        }),
      })
      const data = await response.json()

      if (data.found) {
        const { name: _name, type: _type, ...wikiFields } = data

        const newData = {
          ...dataRef.current,
          // Only overwrite if we found actual data and current value is empty
          foundedDate: wikiFields.foundedDate || dataRef.current.foundedDate,
          legalStructure: wikiFields.legalStructure || dataRef.current.legalStructure,
          keyLeadership: wikiFields.keyLeadership?.length > 0 
            ? wikiFields.keyLeadership 
            : dataRef.current.keyLeadership,
          staffCount: wikiFields.staffCount || dataRef.current.staffCount,
          annualRevenue: wikiFields.annualRevenue || dataRef.current.annualRevenue,
          // Preserve initial answers
          name: initialAnswers.name,
          type: initialAnswers.type as Entity["type"],
          dataSources: [
            ...(dataRef.current.dataSources || []),
            {
              type: "news" as const, // Using closest type for Wikipedia
              url: data.url,
              date: new Date().toISOString(),
              confidence: 85,
              notes: `Wikipedia: ${data.title}`,
            },
          ],
        }
        dataRef.current = newData
        setCollectedData(newData)

        const foundItems = []
        if (wikiFields.foundedDate) foundItems.push("founding date")
        if (wikiFields.legalStructure) foundItems.push("legal structure")
        if (wikiFields.keyLeadership?.length > 0) foundItems.push(`${wikiFields.keyLeadership.length} leaders`)

        return {
          found: true,
          details: foundItems.length > 0 
            ? `Found ${foundItems.join(", ")}` 
            : "Wikipedia article found but limited structured data",
        }
      }

      return { found: false, details: data.message || "No Wikipedia article found" }
    })

    await runTask("ai-research", async () => {
      const response = await fetch("/api/ai-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: initialAnswers.name,
          type: initialAnswers.type,
          website: initialAnswers.website,
          location: initialAnswers.location,
        }),
      })
      const result = await response.json()

      if (result.success) {
        // Preserve initial answers - remove fields that should not overwrite
        const { name: _name, type: _type, ...researchFields } = result.data || {}

        const newData = {
          ...dataRef.current,
          ...researchFields,
          // Ensure initial answers are preserved
          name: initialAnswers.name,
          type: initialAnswers.type as Entity["type"],
          dataSources: [...(dataRef.current.dataSources || []), ...(result.data?.dataSources || [])],
        }
        dataRef.current = newData
        setCollectedData(newData)

        const providers = []
        if (result.sources.perplexity) providers.push("Perplexity")
        if (result.sources.claude) providers.push("Claude")
        if (result.sources.openai) providers.push("ChatGPT")

        return {
          found: true,
          details: `Research complete using ${providers.join(", ")}`,
        }
      }

      return { found: false, details: "AI research unavailable (API keys not configured)" }
    })

    // Task 3: Financial data lookup (varies by entity type)
    const entityType = initialAnswers.type
    
    if (entityType === "nonprofit" || entityType === "foundation") {
      // IRS Form 990 lookup for nonprofits/foundations
      await runTask("financial", async () => {
        const response = await fetch("/api/search-990", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationName: initialAnswers.name,
            ein: initialAnswers.ein,
          }),
        })
        const data = await response.json()

        if (data.found) {
          const newData = {
            ...dataRef.current,
            annualRevenue: data.annualRevenue,
            annualExpenses: data.annualExpenses,
            assets: data.assets,
            liabilities: data.liabilities,
            programExpensePercent: data.programExpensePercent,
            name: initialAnswers.name,
            type: initialAnswers.type as Entity["type"],
            dataSources: [
              ...(dataRef.current.dataSources || []),
              {
                type: "990" as const,
                date: new Date().toISOString(),
                confidence: 95,
                notes: `IRS Form ${data.formType}, Tax Year ${data.taxYear}`,
              },
            ],
          }
          dataRef.current = newData
          setCollectedData(newData)

          return {
            found: true,
            details: `Form ${data.formType} (${data.taxYear}) - $${data.annualRevenue?.toLocaleString()} revenue`,
          }
        }

        return { found: false, details: "No 990 forms found in public database" }
      })
    } else if (entityType === "for-profit") {
      // SEC EDGAR lookup for for-profit companies
      await runTask("financial", async () => {
        const response = await fetch("/api/search-sec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: initialAnswers.name,
          }),
        })
        const data = await response.json()

        if (data.found) {
          const financials = data.financialData || {}
          const newData = {
            ...dataRef.current,
            annualRevenue: financials.revenues,
            annualExpenses: financials.netIncome ? financials.revenues - financials.netIncome : undefined,
            assets: financials.totalAssets,
            liabilities: financials.totalLiabilities,
            staffCount: financials.employees,
            legalStructure: data.stateOfIncorporation ? `Incorporated in ${data.stateOfIncorporation}` : undefined,
            name: initialAnswers.name,
            type: initialAnswers.type as Entity["type"],
            dataSources: [
              ...(dataRef.current.dataSources || []),
              {
                type: "interview" as const, // Using closest type for SEC
                date: new Date().toISOString(),
                confidence: 95,
                notes: `SEC EDGAR - ${data.latest10K?.form || "10-K"} (${data.latest10K?.filingDate || "N/A"})`,
              },
            ],
          }
          dataRef.current = newData
          setCollectedData(newData)

          return {
            found: true,
            details: `${data.latest10K?.form || "10-K"} (${data.latest10K?.filingDate}) - $${financials.revenues?.toLocaleString() || "N/A"} revenue`,
          }
        }

        return { found: false, details: data.message || "Company not found in SEC database (may be private)" }
      })
    } else if (entityType === "government") {
      // For government entities, we'll check their budget/spending data in the USAspending task
      updateTaskStatus("financial", "complete", false, "Government budget data checked via USAspending")
    } else {
      updateTaskStatus("financial", "complete", false, "Financial lookup not applicable for this entity type")
    }
    
    // Task 3b: USAspending lookup (for all entity types that might receive federal funding)
    await runTask("usaspending", async () => {
      const response = await fetch("/api/search-usaspending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: initialAnswers.name,
          entityType: initialAnswers.type,
        }),
      })
      const data = await response.json()

      if (data.found && data.summary?.totalAwards > 0) {
        const newData = {
          ...dataRef.current,
          // Add federal funding as a funding source indicator
          primaryFundingSources: [
            ...(dataRef.current.primaryFundingSources || []),
            "Federal Grants/Contracts",
          ],
          name: initialAnswers.name,
          type: initialAnswers.type as Entity["type"],
          dataSources: [
            ...(dataRef.current.dataSources || []),
            {
              type: "news" as const, // Using closest available type
              url: data.profileUrl,
              date: new Date().toISOString(),
              confidence: 90,
              notes: `USAspending.gov - ${data.summary.totalAwards} awards totaling $${data.summary.totalObligations?.toLocaleString()}`,
            },
          ],
        }
        dataRef.current = newData
        setCollectedData(newData)

        return {
          found: true,
          details: `${data.summary.totalAwards} federal awards ($${data.summary.totalObligations?.toLocaleString()}) from ${data.summary.fundingAgencies?.length || 0} agencies`,
        }
      }

      return { found: false, details: data.message || "No federal funding records found" }
    })

    // Task: Relationship Discovery
    await runTask("relationships", async () => {
      const response = await fetch("/api/discover-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: initialAnswers.name,
          entityType: initialAnswers.type,
          ein: initialAnswers.ein,
          website: initialAnswers.website,
          existingData: {
            partnerships: dataRef.current.partnerships,
          },
        }),
      })
      const data = await response.json()

      if (data.success && data.relationships?.length > 0) {
        // Transform discovered relationships to Entity relationship format with verification fields
        const formattedRelationships = data.relationships.map((r: {
          entityName: string
          entityId?: string
          type: string
          strength: string
          direction?: string
          confidence: number
          source: string
          sourceUrl?: string
          sourceDescription?: string
          sourceDate?: string
          notes?: string
          verified: boolean
        }) => ({
          entityName: r.entityName,
          entityId: r.entityId,
          type: r.type,
          strength: r.strength,
          direction: r.direction,
          notes: r.notes,
          // Verification fields
          confidence: r.confidence,
          source: r.source,
          sourceUrl: r.sourceUrl,
          sourceDate: r.sourceDate,
          verified: r.verified,
        })) as Relationship[]

        // Count verified vs needs review
        const verifiedCount = formattedRelationships.filter((r: { verified: boolean }) => r.verified).length
        const needsReviewCount = formattedRelationships.length - verifiedCount

        const newData = {
          ...dataRef.current,
          relationships: [
            ...(dataRef.current.relationships || []),
            ...formattedRelationships,
          ],
          name: initialAnswers.name,
          type: initialAnswers.type as Entity["type"],
        }
        dataRef.current = newData
        setCollectedData(newData)

        return {
          found: true,
          details: `Found ${data.totalFound} relationships (${verifiedCount} verified, ${needsReviewCount} need review)`,
        }
      }

      return { found: false, details: "No relationships discovered" }
    })

    // Task: Web Search
    await runTask("websearch", async () => {
      const response = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `"${initialAnswers.name}" ${initialAnswers.location || ""} news community impact`,
        }),
      })
      const data = await response.json()

      // Preserve initial answers - remove fields that should not overwrite
      const { name: _name, type: _type, ...searchFields } = data || {}

      const newData = {
        ...dataRef.current,
        ...searchFields,
        // Ensure initial answers are preserved
        name: initialAnswers.name,
        type: initialAnswers.type as Entity["type"],
        dataSources: [
          ...(dataRef.current.dataSources || []),
          {
            type: "news" as const,
            date: new Date().toISOString(),
            confidence: 60,
          },
        ],
      }
      dataRef.current = newData
      setCollectedData(newData)

      return {
        found: true,
        details: `Found ${data?.mediaPresence || 0} media mentions, community perception data`,
      }
    })

    setAllComplete(true)

    // Auto-advance after 2 seconds - use dataRef.current to get the latest data
    setTimeout(() => {
      onComplete(dataRef.current)
    }, 2000)
  }

  const runTask = async (taskId: string, taskFn: () => Promise<{ found: boolean; details: string }>) => {
    updateTaskStatus(taskId, "running")

    try {
      const result = await taskFn()
      updateTaskStatus(taskId, "complete", result.found, result.details)
    } catch (error) {
      console.error(`[v0] Error in task ${taskId}:`, error)
      updateTaskStatus(taskId, "failed", false, "Error occurred")
    }
  }

  const updateTaskStatus = (
    taskId: string,
    status: CollectionTask["status"],
    dataFound?: boolean,
    details?: string,
  ) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status, dataFound, details } : task)))
  }

  const completedTasks = tasks.filter((t) => t.status === "complete").length
  const progress = (completedTasks / tasks.length) * 100

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Automated Data Collection in Progress</CardTitle>
          <CardDescription>Sit back while we gather information from multiple sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {completedTasks} of {tasks.length} tasks complete
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-3">
            {tasks.map((task) => {
              const Icon = task.icon
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border transition-all ${
                    task.status === "running"
                      ? "bg-blue-50 border-blue-200"
                      : task.status === "complete"
                        ? task.dataFound
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                        : task.status === "failed"
                          ? "bg-red-50 border-red-200"
                          : "bg-background border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {task.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                        {task.status === "complete" && task.dataFound && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {task.status === "failed" && <XCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.status === "pending" && task.description}
                        {task.status === "running" && "Processing..."}
                        {(task.status === "complete" || task.status === "failed") && task.details}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {allComplete && (
            <div className="mt-6 p-4 bg-primary/10 rounded-lg text-center">
              <p className="font-medium">Data collection complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Moving to interactive game to fill in missing information...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
