// Database module - uses Supabase via API routes
// With export/import functionality for saving to local files

import type { Entity } from "./entity-types"

export interface SimulationConfig {
  id: string
  name: string
  description: string
  timeScale: string
  createdAt: string
  updatedAt: string
}

export const db = {
  // Get all entities from Supabase
  async getAllEntities(): Promise<Entity[]> {
    try {
      const response = await fetch("/api/entities")
      if (!response.ok) {
        throw new Error("Failed to fetch entities")
      }
      return await response.json()
    } catch (error) {
      console.error("Error loading entities:", error)
      return []
    }
  },

  // Get entity by ID from Supabase
  async getEntityById(id: string): Promise<Entity | undefined> {
    try {
      const response = await fetch(`/api/entities/${id}`)
      if (!response.ok) {
        if (response.status === 404) return undefined
        throw new Error("Failed to fetch entity")
      }
      return await response.json()
    } catch (error) {
      console.error("Error loading entity:", error)
      return undefined
    }
  },

  // Save or update an entity in Supabase
  async saveEntity(entity: Entity): Promise<boolean> {
    try {
      // Check if entity exists
      const existingResponse = await fetch(`/api/entities/${entity.id}`)
      
      if (existingResponse.ok) {
        // Update existing
        const response = await fetch(`/api/entities/${entity.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entity),
        })
        return response.ok
      } else {
        // Create new
        const response = await fetch("/api/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entity),
        })
        return response.ok
      }
    } catch (error) {
      console.error("Error saving entity:", error)
      return false
    }
  },

  // Delete an entity from Supabase
  async deleteEntity(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/entities/${id}`, {
        method: "DELETE",
      })
      return response.ok
    } catch (error) {
      console.error("Error deleting entity:", error)
      return false
    }
  },

  // Export all data to JSON file (downloads to user's computer)
  async exportToFile(): Promise<void> {
    const entities = await this.getAllEntities()
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      entities,
      simulationConfig: null, // TODO: Add simulation config export
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `community-simulation-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  // Import data from JSON file
  async importFromFile(file: File): Promise<{ entities: number; success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          
          if (data.entities && Array.isArray(data.entities)) {
            const importedEntities = data.entities as Entity[]
            let successCount = 0
            
            // Save each imported entity to Supabase
            for (const entity of importedEntities) {
              const success = await this.saveEntity(entity)
              if (success) successCount++
            }
            
            resolve({ entities: successCount, success: true })
          } else {
            resolve({ entities: 0, success: false, error: "Invalid file format" })
          }
        } catch (error) {
          resolve({ entities: 0, success: false, error: "Failed to parse file" })
        }
      }
      reader.onerror = () => {
        resolve({ entities: 0, success: false, error: "Failed to read file" })
      }
      reader.readAsText(file)
    })
  },

  // Export single entity
  async exportEntity(id: string): Promise<void> {
    const entity = await this.getEntityById(id)
    if (!entity) return

    const blob = new Blob([JSON.stringify(entity, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `entity-${entity.name?.replace(/\s+/g, "-").toLowerCase() || id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}
