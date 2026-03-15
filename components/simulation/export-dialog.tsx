"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileJson, FileText, Briefcase } from "lucide-react"

interface ExportDialogProps {
  simulationId: string
  simulationName: string
}

export function ExportDialog({ simulationId, simulationName }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState("json")
  const [includeChildren, setIncludeChildren] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        format,
        includeChildren: String(includeChildren),
      })

      const response = await fetch(`/api/simulations/${simulationId}/export?${params}`)
      
      if (!response.ok) {
        throw new Error("Export failed")
      }

      const contentType = response.headers.get("content-type")
      const contentDisposition = response.headers.get("content-disposition")
      
      let filename = `${simulationName.replace(/[^a-z0-9]/gi, "_")}_export`
      if (format === "json") filename += ".json"
      else if (format === "markdown") filename += "_report.md"
      else if (format === "executive") filename += "_executive_summary.md"

      // Extract filename from content-disposition if available
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }

      let blob: Blob
      if (contentType?.includes("application/json")) {
        const data = await response.json()
        blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      } else {
        const text = await response.text()
        blob = new Blob([text], { type: "text/markdown" })
      }

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setOpen(false)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Simulation</DialogTitle>
          <DialogDescription>
            Choose an export format for your simulation data and recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="space-y-2">
              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                   onClick={() => setFormat("json")}>
                <RadioGroupItem value="json" id="json" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    <Label htmlFor="json" className="cursor-pointer font-medium">
                      JSON Data
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Complete structured data export for analysis or backup
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                   onClick={() => setFormat("markdown")}>
                <RadioGroupItem value="markdown" id="markdown" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <Label htmlFor="markdown" className="cursor-pointer font-medium">
                      Full Report (Markdown)
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive report with all years, responses, and recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                   onClick={() => setFormat("executive")}>
                <RadioGroupItem value="executive" id="executive" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <Label htmlFor="executive" className="cursor-pointer font-medium">
                      Executive Summary
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Concise summary with key metrics, recommendations, and priorities
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeChildren" 
              checked={includeChildren}
              onCheckedChange={(checked) => setIncludeChildren(checked === true)}
            />
            <Label htmlFor="includeChildren" className="cursor-pointer">
              Include branch simulations
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
