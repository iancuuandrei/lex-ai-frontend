import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import legalEdgesRaw from '../../assets/legal_edges.json'
import legalUnitsRaw from '../../assets/legal_units.json'

type LegalCategory = 'root' | 'article' | 'paragraph' | 'letter' | 'point'

interface LegalUnit {
  id: string
  law_title?: string | null
  article_number?: string | number | null
  paragraph_number?: string | number | null
  letter_number?: string | number | null
  point_number?: string | number | null
  normalized_text?: string | null
  raw_text?: string | null
}

interface LegalEdge {
  source_id: string
  target_id: string
  type: string
}

interface GraphNode extends NodeObject {
  id: string
  label: string
  category: LegalCategory
  fullLabel: string
  text: string
  val: number
}

interface GraphLink extends LinkObject {
  source: string
  target: string
}

const categoryColor: Record<LegalCategory, string> = {
  root: '#ffd27a',
  article: '#7aa6ff',
  paragraph: '#9cf2c8',
  letter: '#d8a8ff',
  point: '#ff9f9f',
}

const categorySize: Record<LegalCategory, number> = {
  root: 32,
  article: 14,
  paragraph: 6,
  letter: 3,
  point: 2,
}

function categorize(unit: LegalUnit): LegalCategory {
  if (unit.point_number != null) return 'point'
  if (unit.letter_number != null) return 'letter'
  if (unit.paragraph_number != null) return 'paragraph'
  if (unit.article_number != null) return 'article'
  return 'root'
}

function shortLabel(unit: LegalUnit, category: LegalCategory): string {
  switch (category) {
    case 'root':
      return unit.law_title ?? unit.id
    case 'article':
      return `Art. ${unit.article_number}`
    case 'paragraph':
      return `(${unit.paragraph_number})`
    case 'letter':
      return `${unit.letter_number})`
    case 'point':
      return `${unit.point_number}.`
  }
}

function fullLabel(unit: LegalUnit, category: LegalCategory): string {
  const parts: string[] = []
  if (unit.law_title) parts.push(unit.law_title)
  if (unit.article_number != null) parts.push(`Art. ${unit.article_number}`)
  if (unit.paragraph_number != null) parts.push(`alin. (${unit.paragraph_number})`)
  if (unit.letter_number != null) parts.push(`lit. ${unit.letter_number})`)
  if (unit.point_number != null) parts.push(`pct. ${unit.point_number}`)
  return parts.length > 0 ? parts.join(' · ') : `${category}: ${unit.id}`
}

const legalUnits = legalUnitsRaw as LegalUnit[]
const legalEdges = legalEdgesRaw as LegalEdge[]

const unitIds = new Set(legalUnits.map((unit) => unit.id))

const graphNodes: GraphNode[] = legalUnits.map((unit) => {
  const category = categorize(unit)
  const text = (unit.normalized_text ?? unit.raw_text ?? '').slice(0, 320)
  return {
    id: unit.id,
    label: shortLabel(unit, category),
    fullLabel: fullLabel(unit, category),
    text,
    category,
    val: categorySize[category],
  }
})

const graphLinks: GraphLink[] = legalEdges
  .filter((edge) => unitIds.has(edge.source_id) && unitIds.has(edge.target_id))
  .map((edge) => ({ source: edge.source_id, target: edge.target_id }))

export default function ProductForceGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const linkForce = graph.d3Force('link') as
      | { distance: (fn: (link: GraphLink) => number) => unknown }
      | undefined
    linkForce?.distance((link) => {
      const target = (typeof link.target === 'object' ? link.target : null) as GraphNode | null
      const base = target?.category === 'article'
        ? 240
        : target?.category === 'paragraph'
          ? 110
          : target?.category === 'letter'
            ? 70
            : target?.category === 'point'
              ? 50
              : 320
      return base * (0.7 + Math.random() * 0.6)
    })

    const chargeForce = graph.d3Force('charge') as
      | { strength: (value: number) => unknown; distanceMax: (value: number) => unknown }
      | undefined
    chargeForce?.strength(-260)
    chargeForce?.distanceMax(1400)

    graph.d3ReheatSimulation()
  }, [size.width, size.height])

  const data = useMemo(() => ({ nodes: graphNodes, links: graphLinks }), [])

  return (
    <div ref={containerRef} className="product-force-graph">
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={3}
          nodeVal={(node) => (node as GraphNode).val}
          nodeColor={(node) => categoryColor[(node as GraphNode).category]}
          nodeLabel={(node) => {
            const typed = node as GraphNode
            const text = typed.text ? `<br/><span style="opacity:0.7">${typed.text}${typed.text.length >= 320 ? '…' : ''}</span>` : ''
            return `<strong>${typed.fullLabel}</strong>${text}`
          }}
          linkColor={() => 'rgba(220, 220, 235, 0.18)'}
          linkWidth={0.6}
          cooldownTicks={1200}
          warmupTicks={120}
          d3AlphaDecay={0.008}
          d3VelocityDecay={0.32}
          enableNodeDrag={false}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const typed = node as GraphNode
            if (typeof node.x !== 'number' || typeof node.y !== 'number') return
            if (typed.category === 'point' && globalScale < 1.6) return
            if (typed.category === 'letter' && globalScale < 1.1) return
            if (typed.category === 'paragraph' && globalScale < 0.7) return

            const fontSize = Math.max(8, 11 / globalScale)
            ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = 'rgba(244, 232, 220, 0.85)'
            const radius = Math.sqrt(typed.val) + 1.5
            ctx.fillText(typed.label, node.x, node.y + radius)
          }}
          onNodeClick={(node) => {
            if (typeof node.x !== 'number' || typeof node.y !== 'number') return
            graphRef.current?.centerAt(node.x, node.y, 600)
            graphRef.current?.zoom(3.2, 600)
          }}
        />
      ) : null}
    </div>
  )
}
