"use client"

import React from "react"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, Users, DollarSign, Trash2, Download, Upload, FileJson, ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import type { Entity } from "@/lib/entity-types"

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)

  const loadEntities = async () => {
    const loaded = await db.getAllEntities()
    setEntities(loaded)
    setIsLoading(false)
  }

  useEffect(() => {
    loadEntities()
  }, [])

  const handleExport = async () => {
    await db.exportToFile()
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus("Importing...")
    const result = await db.importFromFile(file)
    
    if (result.success) {
      setImportStatus(`Successfully imported ${result.entities} entities`)
      await loadEntities()
    } else {
      setImportStatus(`Import failed: ${result.error}`)
    }

    // Clear status after 3 seconds
    setTimeout(() => setImportStatus(null), 3000)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this entity?")) {
      await db.deleteEntity(id)
      await loadEntities()
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-2">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Community Entities</h1>
          <p className="text-muted-foreground mt-2">Organizations, individuals, and groups in your simulation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportClick} className="bg-transparent">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={entities.length === 0} className="bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/entities/new">
            <Button size="default">
              <Plus className="w-4 h-4 mr-2" />
              Add Entity
            </Button>
          </Link>
        </div>
      </div>

      {/* Import status message */}
      {importStatus && (
        <div className={`p-4 rounded-lg ${importStatus.includes("failed") ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-700"}`}>
          {importStatus}
        </div>
      )}

      {entities.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No entities yet</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first community entity</p>
            <Link href="/entities/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Entity
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => (
            <Card key={entity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{entity.type}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entity.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-xl">{entity.name}</CardTitle>
                <CardDescription className="line-clamp-2">{entity.mission}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {entity.annualRevenue && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      ${entity.annualRevenue.toLocaleString()} annual revenue
                    </span>
                  </div>
                )}
                {entity.staffCount && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{entity.staffCount} staff members</span>
                  </div>
                )}
                {entity.communityInfluenceLevel && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Influence: {entity.communityInfluenceLevel}/10</span>
                  </div>
                )}
                <Link href={`/entities/${entity.id}`}>
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
