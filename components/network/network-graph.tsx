"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  RefreshCw,
} from "lucide-react"

interface NetworkNode {
  id: string
  name: string
  type: string
  stakeholderRole: string
  metrics: {
    degree: number
    betweenness: number
    closeness: number
    influence: number
  }
  group?: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  type: string
  strength: "weak" | "moderate" | "strong"
  confidence: number
  verified: boolean
}

interface NetworkGraphProps {
  nodes: NetworkNode[]
  links: NetworkLink[]
  onNodeClick?: (node: NetworkNode) => void
  onNodeHover?: (node: NetworkNode | null) => void
  highlightedNode?: string | null
  colorBy?: "type" | "role" | "cluster"
}

const typeColors: Record<string, string> = {
  nonprofit: "#22c55e",
  "for-profit": "#3b82f6",
  government: "#8b5cf6",
  foundation: "#f59e0b",
  coalition: "#06b6d4",
  "civic-group": "#ec4899",
  "individual-influencer": "#f97316",
  other: "#6b7280",
}

const roleColors: Record<string, string> = {
  ally: "#22c55e",
  funder: "#8b5cf6",
  opposition: "#ef4444",
  regulator: "#3b82f6",
  influencer: "#f59e0b",
  "affected-party": "#14b8a6",
  "service-provider": "#06b6d4",
  researcher: "#6366f1",
  unknown: "#6b7280",
}

const clusterColors = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
]

const strengthWidth: Record<string, number> = {
  weak: 1,
  moderate: 2,
  strong: 3,
}

const relationshipColors: Record<string, string> = {
  ally: "#22c55e",
  partner: "#3b82f6",
  funder: "#8b5cf6",
  beneficiary: "#14b8a6",
  competitor: "#f59e0b",
  adversary: "#ef4444",
  neutral: "#6b7280",
}

export function NetworkGraph({
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  highlightedNode,
  colorBy = "role",
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null)
  const [simulatedNodes, setSimulatedNodes] = useState<NetworkNode[]>([])
  const [simulatedLinks, setSimulatedLinks] = useState<NetworkLink[]>([])
  const [minDegree, setMinDegree] = useState(0)
  const animationRef = useRef<number>()

  // Initialize force simulation
  useEffect(() => {
    if (nodes.length === 0) return

    // Create copies with positions
    const nodesCopy = nodes.map((n, i) => ({
      ...n,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 200,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
    }))

    const linksCopy = links.map(l => ({
      ...l,
      source: typeof l.source === "string" ? l.source : l.source.id,
      target: typeof l.target === "string" ? l.target : l.target.id,
    }))

    // Simple force simulation
    const simulate = () => {
      const alpha = 0.1
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2

      // Center force
      for (const node of nodesCopy) {
        node.vx! += (centerX - node.x!) * 0.01
        node.vy! += (centerY - node.y!) * 0.01
      }

      // Repulsion between nodes
      for (let i = 0; i < nodesCopy.length; i++) {
        for (let j = i + 1; j < nodesCopy.length; j++) {
          const dx = nodesCopy[j].x! - nodesCopy[i].x!
          const dy = nodesCopy[j].y! - nodesCopy[i].y!
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 1000 / (dist * dist)
          
          nodesCopy[i].vx! -= (dx / dist) * force * alpha
          nodesCopy[i].vy! -= (dy / dist) * force * alpha
          nodesCopy[j].vx! += (dx / dist) * force * alpha
          nodesCopy[j].vy! += (dy / dist) * force * alpha
        }
      }

      // Link forces
      for (const link of linksCopy) {
        const sourceNode = nodesCopy.find(n => n.id === link.source)
        const targetNode = nodesCopy.find(n => n.id === link.target)
        if (!sourceNode || !targetNode) continue

        const dx = targetNode.x! - sourceNode.x!
        const dy = targetNode.y! - sourceNode.y!
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const targetDist = 100

        const force = (dist - targetDist) * 0.01
        sourceNode.vx! += (dx / dist) * force
        sourceNode.vy! += (dy / dist) * force
        targetNode.vx! -= (dx / dist) * force
        targetNode.vy! -= (dy / dist) * force
      }

      // Apply velocity and damping
      for (const node of nodesCopy) {
        node.x! += node.vx! * alpha
        node.y! += node.vy! * alpha
        node.vx! *= 0.9
        node.vy! *= 0.9

        // Boundary constraints
        node.x = Math.max(50, Math.min(dimensions.width - 50, node.x!))
        node.y = Math.max(50, Math.min(dimensions.height - 50, node.y!))
      }

      setSimulatedNodes([...nodesCopy])
      setSimulatedLinks(linksCopy.map(l => ({
        ...l,
        source: nodesCopy.find(n => n.id === l.source) || l.source,
        target: nodesCopy.find(n => n.id === l.target) || l.target,
      })))
    }

    // Run simulation
    let frame = 0
    const runSimulation = () => {
      simulate()
      frame++
      if (frame < 200) {
        animationRef.current = requestAnimationFrame(runSimulation)
      }
    }

    runSimulation()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes, links, dimensions])

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, containerRef.current.clientHeight),
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  const getNodeColor = useCallback((node: NetworkNode) => {
    switch (colorBy) {
      case "type":
        return typeColors[node.type] || typeColors.other
      case "role":
        return roleColors[node.stakeholderRole] || roleColors.unknown
      case "cluster":
        return clusterColors[node.group || 0] || clusterColors[0]
      default:
        return roleColors[node.stakeholderRole] || roleColors.unknown
    }
  }, [colorBy])

  const getNodeRadius = useCallback((node: NetworkNode) => {
    const baseRadius = 8
    const degreeBonus = Math.min(node.metrics.degree * 2, 12)
    return baseRadius + degreeBonus
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.3, Math.min(3, z * delta)))
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Filter nodes by minimum degree
  const filteredNodes = simulatedNodes.filter(n => n.metrics.degree >= minDegree)
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredLinks = simulatedLinks.filter(l => {
    const sourceId = typeof l.source === "string" ? l.source : l.source.id
    const targetId = typeof l.target === "string" ? l.target : l.target.id
    return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId)
  })

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Color by:</span>
            <Select value={colorBy} disabled>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="cluster">Cluster</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Min connections:</span>
            <Slider
              value={[minDegree]}
              onValueChange={(v) => setMinDegree(v[0])}
              max={Math.max(...nodes.map(n => n.metrics.degree), 1)}
              step={1}
              className="w-24"
            />
            <span className="text-sm font-mono w-6">{minDegree}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetView}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Graph */}
      <div
        ref={containerRef}
        className="relative border rounded-lg bg-muted/30 overflow-hidden"
        style={{ height: "500px" }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Links */}
            {filteredLinks.map((link, i) => {
              const source = typeof link.source === "string" 
                ? filteredNodes.find(n => n.id === link.source)
                : link.source
              const target = typeof link.target === "string"
                ? filteredNodes.find(n => n.id === link.target)
                : link.target

              if (!source || !target || !source.x || !target.x) return null

              const isHighlighted = highlightedNode === source.id || highlightedNode === target.id
              const isHovered = hoveredNode?.id === source.id || hoveredNode?.id === target.id

              return (
                <line
                  key={`link-${i}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={relationshipColors[link.type] || "#6b7280"}
                  strokeWidth={(strengthWidth[link.strength] || 1) * (isHighlighted || isHovered ? 2 : 1)}
                  strokeOpacity={
                    highlightedNode || hoveredNode
                      ? isHighlighted || isHovered ? 0.8 : 0.1
                      : 0.4
                  }
                  strokeDasharray={link.verified ? undefined : "4,4"}
                />
              )
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              if (!node.x || !node.y) return null

              const isHighlighted = highlightedNode === node.id
              const isHovered = hoveredNode?.id === node.id
              const isConnected = hoveredNode && simulatedLinks.some(l => {
                const sourceId = typeof l.source === "string" ? l.source : l.source.id
                const targetId = typeof l.target === "string" ? l.target : l.target.id
                return (sourceId === hoveredNode.id && targetId === node.id) ||
                       (targetId === hoveredNode.id && sourceId === node.id)
              })
              const radius = getNodeRadius(node)

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onNodeClick?.(node)}
                  onMouseEnter={() => {
                    setHoveredNode(node)
                    onNodeHover?.(node)
                  }}
                  onMouseLeave={() => {
                    setHoveredNode(null)
                    onNodeHover?.(null)
                  }}
                  className="cursor-pointer"
                  style={{
                    opacity: (highlightedNode || hoveredNode) && !isHighlighted && !isHovered && !isConnected
                      ? 0.2
                      : 1,
                  }}
                >
                  <circle
                    r={radius}
                    fill={getNodeColor(node)}
                    stroke={isHighlighted || isHovered ? "#ffffff" : "transparent"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                  />
                  {(isHovered || isHighlighted || radius > 14) && (
                    <text
                      y={radius + 12}
                      textAnchor="middle"
                      className="text-xs fill-foreground pointer-events-none"
                      style={{ fontSize: "10px" }}
                    >
                      {node.name.length > 20 ? node.name.slice(0, 18) + "..." : node.name}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Hovered node tooltip */}
        {hoveredNode && (
          <div
            className="absolute bg-popover border rounded-lg shadow-lg p-3 pointer-events-none z-10"
            style={{
              left: Math.min((hoveredNode.x || 0) * zoom + pan.x + 20, dimensions.width - 200),
              top: Math.min((hoveredNode.y || 0) * zoom + pan.y - 10, dimensions.height - 100),
            }}
          >
            <p className="font-medium">{hoveredNode.name}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {hoveredNode.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {hoveredNode.stakeholderRole}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>Connections: {hoveredNode.metrics.degree}</span>
              <span>Influence: {hoveredNode.metrics.influence}</span>
              <span>Betweenness: {hoveredNode.metrics.betweenness}</span>
              <span>Closeness: {hoveredNode.metrics.closeness}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Roles:</span>
          {Object.entries(roleColors).slice(0, 6).map(([role, color]) => (
            <div key={role} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs capitalize">{role}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Links:</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-0.5 bg-muted-foreground" />
            <span className="text-xs">Verified</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-0.5 bg-muted-foreground" style={{ background: "repeating-linear-gradient(90deg, currentColor, currentColor 4px, transparent 4px, transparent 8px)" }} />
            <span className="text-xs">Unverified</span>
          </div>
        </div>
      </div>
    </div>
  )
}
