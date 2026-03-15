"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GitBranch, ChevronRight, CheckCircle, Clock, Play } from "lucide-react"

interface SimulationBranch {
  id: string
  name: string
  current_year: number
  total_years: number
  status: string
  branched_at_year: number | null
  branch_description: string | null
  parent_simulation_id: string | null
  created_at: string
}

interface BranchMapProps {
  simulationId: string
  currentSimulation: SimulationBranch
  branches: SimulationBranch[]
  parentSimulation?: SimulationBranch | null
}

interface TreeNode {
  simulation: SimulationBranch
  children: TreeNode[]
  depth: number
  isCurrentPath: boolean
}

export function BranchMap({ simulationId, currentSimulation, branches, parentSimulation }: BranchMapProps) {
  // Build tree structure
  const buildTree = (): TreeNode | null => {
    // Find root (either parent or current if no parent)
    const root = parentSimulation || currentSimulation
    
    const buildNode = (sim: SimulationBranch, depth: number): TreeNode => {
      const children = branches
        .filter(b => b.parent_simulation_id === sim.id)
        .map(b => buildNode(b, depth + 1))
      
      // Check if this node is in the path to current simulation
      const isCurrentPath = sim.id === simulationId || 
        children.some(c => c.isCurrentPath) ||
        (parentSimulation && sim.id === parentSimulation.id)
      
      return {
        simulation: sim,
        children,
        depth,
        isCurrentPath,
      }
    }
    
    return buildNode(root, 0)
  }

  const tree = buildTree()
  
  if (!tree) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "running":
        return <Play className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "running":
        return "bg-blue-500"
      default:
        return "bg-muted-foreground"
    }
  }

  const renderNode = (node: TreeNode, isLast: boolean = true, prefix: string = ""): React.ReactNode => {
    const isCurrent = node.simulation.id === simulationId
    
    return (
      <div key={node.simulation.id} className="relative">
        {/* Connection line from parent */}
        {node.depth > 0 && (
          <div className="absolute left-0 top-0 flex items-center" style={{ marginLeft: `${(node.depth - 1) * 40}px` }}>
            <div className={`w-8 h-px ${node.isCurrentPath ? "bg-primary" : "bg-border"}`} />
          </div>
        )}
        
        {/* Node */}
        <div 
          className={`ml-${node.depth * 10} flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            isCurrent 
              ? "bg-primary/10 border-primary" 
              : "bg-background hover:bg-muted border-border"
          }`}
          style={{ marginLeft: `${node.depth * 40}px` }}
        >
          {/* Timeline dot */}
          <div className={`w-3 h-3 rounded-full ${isCurrent ? "bg-primary" : getStatusColor(node.simulation.status)}`} />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isCurrent ? (
                <span className="font-semibold truncate">{node.simulation.name}</span>
              ) : (
                <Link 
                  href={`/simulations/${node.simulation.id}`}
                  className="font-medium text-primary hover:underline truncate"
                >
                  {node.simulation.name}
                </Link>
              )}
              {isCurrent && (
                <Badge variant="secondary" className="text-xs">Current</Badge>
              )}
            </div>
            
            {node.simulation.branched_at_year && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Branched at Year {node.simulation.branched_at_year}
                {node.simulation.branch_description && `: ${node.simulation.branch_description}`}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(node.simulation.status)}
              <span className="text-xs text-muted-foreground">
                Year {node.simulation.current_year}/{node.simulation.total_years}
              </span>
            </div>
          </div>
          
          {/* Navigate arrow for non-current */}
          {!isCurrent && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        
        {/* Children */}
        {node.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map((child, idx) => 
              renderNode(child, idx === node.children.length - 1, prefix)
            )}
          </div>
        )}
      </div>
    )
  }

  // Calculate total branches for display
  const countBranches = (node: TreeNode): number => {
    return node.children.reduce((acc, child) => acc + 1 + countBranches(child), 0)
  }
  
  const totalBranches = countBranches(tree)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Simulation Tree
          {totalBranches > 0 && (
            <Badge variant="outline" className="ml-2">
              {totalBranches} branch{totalBranches !== 1 ? "es" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {renderNode(tree)}
        </div>
        
        {totalBranches === 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center py-2">
            No branches yet. Complete a year to create alternative scenarios.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
