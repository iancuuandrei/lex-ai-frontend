import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { forceCollide } from 'd3-force-3d'
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
  root: '#2a2a2e',
  article: '#1e1e22',
  paragraph: '#18181b',
  letter: '#141416',
  point: '#111113',
}

const categoryBadge: Record<LegalCategory, string> = {
  root: '§',
  article: 'Ar',
  paragraph: 'Al',
  letter: 'Lt',
  point: 'Pt',
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
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

export interface ProductForceGraphHandle {
  focusRandomNode: () => void
  discoverNodes: () => void
}

interface ProductForceGraphProps {
  hideParagraphs?: boolean
}

const ProductForceGraph = forwardRef<ProductForceGraphHandle, ProductForceGraphProps>(function ProductForceGraph({ hideParagraphs = false }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined!)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set())
  const [highlightedLinkIds, setHighlightedLinkIds] = useState<Set<string>>(new Set())
  const bannerTimerRef = useRef<number | null>(null)
  const globalScaleRef = useRef(1)
  const highlightStartRef = useRef(0)

  const handleNodeHover = useCallback((node: NodeObject | null) => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current)
      bannerTimerRef.current = null
    }

    if (node && typeof node.x === 'number' && typeof node.y === 'number') {
      const typed = node as GraphNode
      setHoveredNode(typed)
      const graph = graphRef.current
      if (graph) {
        const coords = graph.graph2ScreenCoords(node.x, node.y)
        setHoverPos({ x: coords.x, y: coords.y })
      }
      requestAnimationFrame(() => setBannerVisible(true))
    } else {
      setBannerVisible(false)
      bannerTimerRef.current = window.setTimeout(() => {
        setHoveredNode(null)
        setHoverPos(null)
      }, 280)
    }
  }, [])

  const flyToNode = useCallback((targetNode: GraphNode) => {
    const graph = graphRef.current
    if (!graph || typeof targetNode.x !== 'number' || typeof targetNode.y !== 'number') return

    const duration = 3000
    const targetX = targetNode.x
    const targetY = targetNode.y
    const targetZoom = 3.2
    const startZoom = graph.zoom()

    // centerAt() with no args returns the current center in some versions,
    // but may return the instance itself — fall back to target coords
    let startX = targetX
    let startY = targetY
    try {
      const c = graph.centerAt() as unknown
      if (c && typeof c === 'object' && 'x' in c && 'y' in c) {
        startX = (c as { x: number; y: number }).x
        startY = (c as { x: number; y: number }).y
      }
    } catch { /* use target as fallback */ }

    let startTime: number | null = null

    function ease(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const t = Math.min(elapsed / duration, 1)
      const e = ease(t)
      graph!.centerAt(startX + (targetX - startX) * e, startY + (targetY - startY) * e, 0)
      graph!.zoom(startZoom + (targetZoom - startZoom) * e, 0)
      if (t < 1) requestAnimationFrame(step)
    }

    setHighlightedNodeIds(new Set([targetNode.id]))
    highlightStartRef.current = performance.now()
    requestAnimationFrame(step)
  }, [])

  const data = useMemo(() => {
    if (!hideParagraphs) return { nodes: graphNodes, links: graphLinks }
    const filtered = graphNodes.filter((n) => n.category !== 'paragraph')
    const filteredIds = new Set(filtered.map((n) => n.id))
    return {
      nodes: filtered,
      links: graphLinks.filter((l) => {
        const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source
        const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
        return filteredIds.has(sourceId) && filteredIds.has(targetId)
      }),
    }
  }, [hideParagraphs])

  useImperativeHandle(ref, () => ({
    focusRandomNode() {
      const nodes = data.nodes as GraphNode[]
      const positioned = nodes.filter(
        (n) => typeof n.x === 'number' && typeof n.y === 'number',
      )
      if (positioned.length === 0) return
      // prefer root/article but fall back to any positioned node
      const hubs = positioned.filter((n) => n.category === 'root' || n.category === 'article')
      const pool = hubs.length > 0 ? hubs : positioned
      const target = pool[Math.floor(Math.random() * pool.length)]
      flyToNode(target)
    },
    discoverNodes() {
      const nodes = data.nodes as GraphNode[]
      if (nodes.length === 0) return

      // 1. Pick 8 random seed nodes
      const seeds: GraphNode[] = []
      const pool = [...nodes]
      for (let i = 0; i < 8 && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        seeds.push(pool.splice(idx, 1)[0])
      }

      // 2. Discover relatives (parents/children) and edges
      const discoveredNodeIds = new Set<string>()
      const discoveredLinkIds = new Set<string>()

      seeds.forEach(seed => {
        discoveredNodeIds.add(seed.id)
        
        // Find links where this seed is source or target
        data.links.forEach((link, index) => {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target
          
          if (sourceId === seed.id || targetId === seed.id) {
            discoveredNodeIds.add(sourceId)
            discoveredNodeIds.add(targetId)
            discoveredLinkIds.add(`${sourceId}-${targetId}-${index}`)
          }
        })
      })

      // 3. Update state to highlight
      setHighlightedNodeIds(discoveredNodeIds)
      setHighlightedLinkIds(discoveredLinkIds)
      highlightStartRef.current = performance.now()

      // 4. Optional: fly to the first seed to give some context
      if (seeds.length > 0) {
        flyToNode(seeds[0])
      }
    }
  }), [flyToNode, data])

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
        ? 140
        : target?.category === 'paragraph'
          ? 35
          : target?.category === 'letter'
            ? 25
            : target?.category === 'point'
              ? 18
              : 180
      return base
    })

    const chargeForce = graph.d3Force('charge') as
      | { strength: (value: number) => unknown; distanceMax: (value: number) => unknown }
      | undefined
    chargeForce?.strength(-150)
    chargeForce?.distanceMax(800)

    graph.d3Force('collide', forceCollide<GraphNode>()
      .radius((node) => {
        const cat = (node as GraphNode).category
        return cat === 'root' ? 60
          : cat === 'article' ? 35
          : cat === 'paragraph' ? 18
          : 10
      })
      .strength(1)
      .iterations(4)
    )

    if (size.width > 0 && size.height > 0) {
      graph.d3ReheatSimulation()
    }
  }, [size.width, size.height])

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
          nodeLabel={() => ''}
          onNodeHover={handleNodeHover}
          linkColor={(link, index) => {
            const source = (typeof link.source === 'object' ? link.source : null) as GraphNode | null
            const target = (typeof link.target === 'object' ? link.target : null) as GraphNode | null
            const gs = globalScaleRef.current

            function nodeHidden(n: GraphNode | null) {
              if (!n) return false
              if (n.category === 'paragraph' && gs < 0.7) return true
              if (n.category === 'letter' && gs < 1.1) return true
              if (n.category === 'point' && gs < 1.6) return true
              return false
            }

            if (nodeHidden(source) || nodeHidden(target)) return 'rgba(0,0,0,0)'

            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target
            const isHighlighted = highlightedLinkIds.has(`${sourceId}-${targetId}-${index}`)

            if (isHighlighted) {
              const elapsed = (performance.now() - highlightStartRef.current) / 1000
              const pulse = 0.6 + 0.4 * Math.sin(elapsed * 4)
              return `rgba(140, 180, 255, ${pulse.toFixed(2)})`
            }

            // Strengthen as we zoom in: opacity goes from ~0.08 up to ~0.32
            const opacity = Math.min(0.32, 0.08 + (gs - 0.5) * 0.1)
            return `rgba(220, 220, 235, ${opacity.toFixed(2)})`
          }}
          linkWidth={(link, index) => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target
            return highlightedLinkIds.has(`${sourceId}-${targetId}-${index}`) ? 1.8 : 0.9
          }}
          cooldownTicks={800}
          warmupTicks={400}
          d3AlphaDecay={0.045}
          d3VelocityDecay={0.4}
          enableNodeDrag={false}
          nodeCanvasObjectMode={() => 'replace'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            globalScaleRef.current = globalScale
            const typed = node as GraphNode
            if (typeof node.x !== 'number' || typeof node.y !== 'number') return
            if (typed.category === 'point' && globalScale < 1.6) return
            if (typed.category === 'letter' && globalScale < 1.1) return
            if (typed.category === 'paragraph' && globalScale < 0.7) return

            const x = node.x
            const y = node.y

            // Lighten node color as we zoom in
            const baseHex = categoryColor[typed.category]
            const cr = parseInt(baseHex.slice(1, 3), 16)
            const cg = parseInt(baseHex.slice(3, 5), 16)
            const cb = parseInt(baseHex.slice(5, 7), 16)

            // As gs increases, move towards white (255)
            const factor = Math.min(0.4, Math.max(0, (globalScale - 1) * 0.15))
            const nr = Math.round(cr + (255 - cr) * factor)
            const ng = Math.round(cg + (255 - cg) * factor)
            const nb = Math.round(cb + (255 - cb) * factor)
            const color = `rgb(${nr}, ${ng}, ${nb})`

            const isHub = typed.category === 'root' || typed.category === 'article'

            // t = 0 → circle (zoomed out), t = 1 → full squircle (zoomed in)
            const zoomLow = isHub ? 0.6 : 0.9
            const zoomHigh = isHub ? 1.8 : 2.4
            const t = Math.max(0, Math.min(1, (globalScale - zoomLow) / (zoomHigh - zoomLow)))

            // circle radius (zoomed-out size)
            const circleR = (isHub ? 6 : 3.5) / globalScale

            // squircle dimensions (zoomed-in size)
            const padX = (isHub ? 14 : 8) / globalScale
            const padY = (isHub ? 10 : 6) / globalScale
            const labelSize = Math.max(6, (isHub ? 12 : 9.5) / globalScale)
            ctx.font = `500 ${labelSize}px "Plus Jakarta Sans", system-ui, sans-serif`
            const labelWidth = ctx.measureText(typed.label).width
            const sqW = labelWidth + padX * 2
            const sqH = labelSize + padY * 2

            // interpolate dimensions
            const w = circleR * 2 + (sqW - circleR * 2) * t
            const h = circleR * 2 + (sqH - circleR * 2) * t

            // corner radius: circle = half of size, squircle = 32% of min side
            const sqR = Math.min(w, h) * 0.32
            const r = Math.min(w, h) / 2 + (sqR - Math.min(w, h) / 2) * t

            const left = x - w / 2
            const top = y - h / 2

            // draw rounded rect (becomes circle when r = half of size)
            ctx.beginPath()
            ctx.moveTo(left + r, top)
            ctx.lineTo(left + w - r, top)
            ctx.quadraticCurveTo(left + w, top, left + w, top + r)
            ctx.lineTo(left + w, top + h - r)
            ctx.quadraticCurveTo(left + w, top + h, left + w - r, top + h)
            ctx.lineTo(left + r, top + h)
            ctx.quadraticCurveTo(left, top + h, left, top + h - r)
            ctx.lineTo(left, top + r)
            ctx.quadraticCurveTo(left, top, left + r, top)
            ctx.closePath()

            // highlight glow for focused node
            const isHighlighted = highlightedNodeIds.has(typed.id)
            if (isHighlighted) {
              const elapsed = (performance.now() - highlightStartRef.current) / 1000
              const pulse = 0.5 + 0.5 * Math.sin(elapsed * 4)
              const glowR = (Math.max(w, h) / 2 + 12 / globalScale) * (1 + pulse * 0.15)
              const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR)
              glow.addColorStop(0, `rgba(120, 160, 255, ${0.3 + pulse * 0.2})`)
              glow.addColorStop(0.6, `rgba(120, 160, 255, ${0.1 + pulse * 0.08})`)
              glow.addColorStop(1, 'rgba(120, 160, 255, 0)')
              ctx.save()
              ctx.beginPath()
              ctx.arc(x, y, glowR, 0, Math.PI * 2)
              ctx.fillStyle = glow
              ctx.fill()
              ctx.restore()

              // redraw the shape path for fill
              ctx.beginPath()
              ctx.moveTo(left + r, top)
              ctx.lineTo(left + w - r, top)
              ctx.quadraticCurveTo(left + w, top, left + w, top + r)
              ctx.lineTo(left + w, top + h - r)
              ctx.quadraticCurveTo(left + w, top + h, left + w - r, top + h)
              ctx.lineTo(left + r, top + h)
              ctx.quadraticCurveTo(left, top + h, left, top + h - r)
              ctx.lineTo(left, top + r)
              ctx.quadraticCurveTo(left, top, left + r, top)
              ctx.closePath()
            }

            ctx.fillStyle = color
            ctx.fill()

            ctx.strokeStyle = isHighlighted
              ? 'rgba(120, 160, 255, 0.8)'
              : `rgba(255, 255, 255, ${0.04 + 0.06 * t})`
            ctx.lineWidth = (isHighlighted ? 2.2 : 0.8) / globalScale
            ctx.stroke()

            // label — fades in as squircle forms
            if (t > 0.15) {
              const textAlpha = Math.min(1, (t - 0.15) / 0.4)
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.font = `500 ${labelSize}px "Plus Jakarta Sans", system-ui, sans-serif`
              const baseAlpha = isHub ? 0.92 : 0.72
              ctx.fillStyle = `rgba(255, 255, 255, ${(baseAlpha * textAlpha).toFixed(2)})`
              ctx.fillText(typed.label, x, y)
            }

            // badge — only when nearly full squircle
            if (t > 0.7) {
              const badgeAlpha = (t - 0.7) / 0.3
              const badgeSize = Math.max(4, 6.5 / globalScale)
              ctx.font = `600 ${badgeSize}px "Plus Jakarta Sans", system-ui, sans-serif`
              ctx.textAlign = 'right'
              ctx.textBaseline = 'top'
              ctx.fillStyle = `rgba(255, 255, 255, ${(0.28 * badgeAlpha).toFixed(2)})`
              ctx.fillText(categoryBadge[typed.category], left + w - padX * 0.45, top + padY * 0.4)
            }
          }}
          onNodeClick={(node) => flyToNode(node as GraphNode)}
        />
      ) : null}

      {hoveredNode && hoverPos ? (
        <div
          className={`force-graph-banner${bannerVisible ? ' force-graph-banner--visible' : ''}`}
          style={{
            left: Math.min(hoverPos.x + 16, size.width - 320),
            top: Math.max(hoverPos.y - 20, 8),
          }}
        >
          <div className="force-graph-banner__header">
            <span className="force-graph-banner__badge">{categoryBadge[hoveredNode.category]}</span>
            <strong className="force-graph-banner__title">{hoveredNode.label}</strong>
          </div>
          <div className="force-graph-banner__path">{hoveredNode.fullLabel}</div>
          <div className="force-graph-banner__meta">
            <span>{hoveredNode.category}</span>
            <span className="force-graph-banner__sep" />
            <span>{hoveredNode.id}</span>
          </div>
          {hoveredNode.text ? (
            <p className="force-graph-banner__text">
              {hoveredNode.text}{hoveredNode.text.length >= 320 ? '…' : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

export default ProductForceGraph
