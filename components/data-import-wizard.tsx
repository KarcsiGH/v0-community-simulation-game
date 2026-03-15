"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Globe, FileText, Upload, Search, ArrowRight, Loader2, CheckCircle, XCircle } from "lucide-react"
import type { Entity } from "@/lib/entity-types"

const IMPORT_PHASES = [
  {
    id: "website",
    title: "Phase 1: Website Scraping",
    description: "Enter organization URL to automatically extract basic information",
    icon: Globe,
  },
  {
    id: "990",
    title: "Phase 2: IRS 990 Form",
    description: "Automatically search for 990 form to extract financial data (nonprofits only)",
    icon: FileText,
  },
  {
    id: "documents",
    title: "Phase 3: Documents",
    description: "Upload strategic plans, annual reports, or other documents",
    icon: Upload,
  },
  {
    id: "websearch",
    title: "Phase 4: Web Search",
    description: "Search for news articles and media coverage",
    icon: Search,
  },
]

interface DataImportWizardProps {
  onComplete: (data: Partial<Entity>) => void
  onSkip: () => void
}

export function DataImportWizard({ onComplete, onSkip }: DataImportWizardProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<Partial<Entity>>({})
  const [auto990Search, setAuto990Search] = useState(true)
  const [form990Result, setForm990Result] = useState<any>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const progress = ((currentPhase + 1) / IMPORT_PHASES.length) * 100
  const CurrentIcon = IMPORT_PHASES[currentPhase].icon

  const handleWebsiteScrape = async () => {
    if (!websiteUrl) return

    setLoading(true)
    try {
      const response = await fetch("/api/scrape-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      })

      const data = await response.json()

      setExtractedData((prev) => ({
        ...prev,
        ...data,
        website: websiteUrl,
        dataSources: [
          ...(prev.dataSources || []),
          {
            type: "website" as const,
            url: websiteUrl,
            date: new Date().toISOString(),
            confidence: data.dataQualityScore || 70,
          },
        ],
      }))

      setCurrentPhase(1)
    } catch (error) {
      console.error("Error scraping website:", error)
      alert("Error scraping website. You can skip this step and enter data manually.")
    } finally {
      setLoading(false)
    }
  }

  const handleAuto990Search = async () => {
    if (!extractedData.name) {
      alert("Please complete Phase 1 (website scraping) first to get the organization name.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/search-990", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName: extractedData.name }),
      })

      const data = await response.json()

      setForm990Result(data)

      if (data.found) {
        setExtractedData((prev) => ({
          ...prev,
          annualRevenue: data.annualRevenue,
          annualExpenses: data.annualExpenses,
          assets: data.assets,
          liabilities: data.liabilities,
          programExpensePercent: data.programExpensePercent,
          address: prev.address || data.address,
          city: prev.city || data.city,
          state: prev.state || data.state,
          zipcode: prev.zipcode || data.zipcode,
          dataSources: [
            ...(prev.dataSources || []),
            {
              type: "990" as const,
              date: new Date().toISOString(),
              confidence: 95,
              notes: `IRS Form ${data.formType} for tax year ${data.taxYear}, EIN: ${data.ein}`,
            },
          ],
        }))
      }

      setCurrentPhase(2)
    } catch (error) {
      console.error("Error searching 990:", error)
      alert("Error searching for 990 data. You can skip this step.")
      setCurrentPhase(2)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async () => {
    if (documentFiles.length === 0) {
      setCurrentPhase(3)
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      documentFiles.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/parse-documents", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      setExtractedData((prev) => ({
        ...prev,
        ...data,
        dataSources: [
          ...(prev.dataSources || []),
          {
            type: "document" as const,
            date: new Date().toISOString(),
            confidence: 75,
          },
        ],
      }))

      setCurrentPhase(3)
    } catch (error) {
      console.error("Error parsing documents:", error)
      alert("Error parsing documents. You can skip this step.")
      setCurrentPhase(3)
    } finally {
      setLoading(false)
    }
  }

  const handleWebSearch = async () => {
    if (!searchQuery) {
      onComplete(extractedData)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })

      const data = await response.json()

      const finalData = {
        ...extractedData,
        ...data,
        dataSources: [
          ...(extractedData.dataSources || []),
          {
            type: "news" as const,
            date: new Date().toISOString(),
            confidence: 60,
          },
        ],
      }

      onComplete(finalData)
    } catch (error) {
      console.error("Error searching web:", error)
      alert("Error searching web. Proceeding with collected data.")
      onComplete(extractedData)
    } finally {
      setLoading(false)
    }
  }

  const handlePhaseAction = () => {
    switch (currentPhase) {
      case 0:
        handleWebsiteScrape()
        break
      case 1:
        handleAuto990Search()
        break
      case 2:
        handleDocumentUpload()
        break
      case 3:
        handleWebSearch()
        break
    }
  }

  const handleSkipPhase = () => {
    if (currentPhase === IMPORT_PHASES.length - 1) {
      onComplete(extractedData)
    } else {
      setCurrentPhase(currentPhase + 1)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>
                Phase {currentPhase + 1} of {IMPORT_PHASES.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CurrentIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>{IMPORT_PHASES[currentPhase].title}</CardTitle>
              <CardDescription>{IMPORT_PHASES[currentPhase].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPhase === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-url">Organization Website URL</Label>
                <Input
                  id="website-url"
                  type="url"
                  placeholder="https://example.org"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We'll automatically extract mission, programs, leadership, and contact information
                </p>
              </div>
              {extractedData.name && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview of extracted data:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {extractedData.name && <li>• Name: {extractedData.name}</li>}
                    {extractedData.mission && <li>• Mission: {extractedData.mission.slice(0, 100)}...</li>}
                    {extractedData.programs && <li>• Programs: {extractedData.programs.length} found</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentPhase === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Automatic IRS Form 990 Lookup</Label>
                <p className="text-sm text-muted-foreground">
                  {extractedData.name
                    ? `We'll automatically search for 990 data for "${extractedData.name}"`
                    : "Please complete Phase 1 first to identify the organization"}
                </p>
              </div>

              {form990Result && (
                <div
                  className={`p-4 rounded-lg ${form990Result.found ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}
                >
                  <div className="flex items-start gap-2">
                    {form990Result.found ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {form990Result.found ? "990 Data Found!" : "990 Data Not Found"}
                      </p>
                      {form990Result.found ? (
                        <ul className="text-sm mt-2 space-y-1">
                          <li>• EIN: {form990Result.ein}</li>
                          <li>• Form Type: {form990Result.formType}</li>
                          <li>• Tax Year: {form990Result.taxYear}</li>
                          <li>• Revenue: ${form990Result.annualRevenue?.toLocaleString() || "N/A"}</li>
                          <li>• Expenses: ${form990Result.annualExpenses?.toLocaleString() || "N/A"}</li>
                          <li>• Assets: ${form990Result.assets?.toLocaleString() || "N/A"}</li>
                        </ul>
                      ) : (
                        <p className="text-sm mt-1">{form990Result.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Data Source:</p>
                <p className="text-muted-foreground">ProPublica Nonprofit Explorer - Public IRS 990 filings database</p>
              </div>
            </div>
          )}

          {currentPhase === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documents">Upload Documents (optional)</Label>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setDocumentFiles(Array.from(e.target.files || []))}
                />
                <p className="text-xs text-muted-foreground">
                  Strategic plans, annual reports, program descriptions, etc.
                </p>
              </div>
              {documentFiles.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected files:</p>
                  <ul className="text-sm space-y-1">
                    {documentFiles.map((file, i) => (
                      <li key={i}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentPhase === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Search Query (optional)</Label>
                <Textarea
                  id="search-query"
                  placeholder={`e.g., "${extractedData.name || "Organization name"}" news articles community impact`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  We'll search for recent news, media coverage, and community perception
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-4 pt-4">
            <Button variant="outline" onClick={handleSkipPhase} disabled={loading}>
              Skip This Phase
            </Button>
            <Button onClick={handlePhaseAction} disabled={loading || (currentPhase === 1 && !extractedData.name)}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentPhase === 1 ? "Searching..." : "Processing..."}
                </>
              ) : currentPhase === IMPORT_PHASES.length - 1 ? (
                "Complete Import"
              ) : (
                <>
                  {currentPhase === 1 ? "Search for 990 Data" : "Next Phase"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => onComplete({})}>
          Skip All & Enter Data Manually
        </Button>
      </div>
    </div>
  )
}
