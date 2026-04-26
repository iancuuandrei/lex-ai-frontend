import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { forceCollide } from 'd3-force-3d'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import type {
  GraphEdge as BackendGraphEdge,
  GraphNode as BackendGraphNode,
  GraphNodeType,
  QueryGraphResponse,
} from '../../types/lexai'

type LegalCategory = 'root' | 'query' | 'claim' | 'article' | 'paragraph' | 'letter' | 'point'

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

export interface ProductForceGraphNode extends NodeObject {
  id: string
  label: string
  category: LegalCategory
  fullLabel: string
  text: string
  val: number
}

type GraphNode = ProductForceGraphNode
type RenderNode = NodeObject<ProductForceGraphNode>
type RenderLink = LinkObject<ProductForceGraphNode, GraphLink>

interface GraphLink extends LinkObject {
  id: string
  source: string
  target: string
  edgeType?: string
  label?: string
}

const categoryColor: Record<LegalCategory, string> = {
  root: '#303036',
  query: '#263b68',
  claim: '#3a2f58',
  article: '#1e1e22',
  paragraph: '#18181b',
  letter: '#141416',
  point: '#111113',
}

const categoryBadge: Record<LegalCategory, string> = {
  query: 'Q',
  claim: 'Cl',
  root: '§',
  article: 'Ar',
  paragraph: 'Al',
  letter: 'Lt',
  point: 'Pt',
}

const categorySize: Record<LegalCategory, number> = {
  root: 32,
  query: 30,
  claim: 18,
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
    case 'query':
      return unit.law_title ?? unit.id
    case 'claim':
      return unit.law_title ?? unit.id
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

interface LocalGraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

let localGraphData: LocalGraphData | null = null
let localGraphDataPromise: Promise<LocalGraphData> | null = null

function buildLocalGraphData(legalUnits: LegalUnit[], legalEdges: LegalEdge[]): LocalGraphData {
  const unitIds = new Set(legalUnits.map((unit) => unit.id))
  const nodes: GraphNode[] = legalUnits.map((unit) => {
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

  const links: GraphLink[] = legalEdges
    .filter((edge) => unitIds.has(edge.source_id) && unitIds.has(edge.target_id))
    .map((edge, index) => ({
      id: `${edge.source_id}-${edge.target_id}-${index}`,
      source: edge.source_id,
      target: edge.target_id,
      edgeType: edge.type,
    }))

  return { nodes, links }
}

function loadLocalGraphData() {
  if (localGraphData) return Promise.resolve(localGraphData)

  localGraphDataPromise ??= Promise.all([
    import('../../assets/legal_units.json'),
    import('../../assets/legal_edges.json'),
  ]).then(([legalUnitsModule, legalEdgesModule]) => {
    localGraphData = buildLocalGraphData(
      legalUnitsModule.default as LegalUnit[],
      legalEdgesModule.default as LegalEdge[],
    )
    return localGraphData
  })

  return localGraphDataPromise
}

const EMPTY_GRAPH_DATA: LocalGraphData = { nodes: [], links: [] }

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (typeof value === 'number') return String(value)
  return null
}

function getMetadataList(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  if (!Array.isArray(value)) return null
  const parts = value
    .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
    .filter((item): item is string => item != null && item.trim().length > 0)
  return parts.length > 0 ? parts : null
}

function getBackendNodeType(node: BackendGraphNode): GraphNodeType {
  return node.type ?? node.node_type ?? 'root'
}

function getBackendEdgeType(edge: BackendGraphEdge) {
  return edge.type ?? edge.edge_type ?? 'contains'
}

function categoryFromBackendNode(node: BackendGraphNode): LegalCategory {
  const type = getBackendNodeType(node)

  if (type === 'query') return 'query'
  if (type === 'cited_claim') return 'claim'
  if (type === 'article') return 'article'
  if (type === 'paragraph') return 'paragraph'
  if (type === 'letter') return 'letter'
  if (type === 'point') return 'point'

  return 'root'
}

function fullLabelFromBackendNode(node: BackendGraphNode) {
  const metadata = node.metadata
  const hierarchy = getMetadataList(metadata, 'hierarchy_path')
  if (hierarchy) return hierarchy.join(' > ')

  const parts = [
    getMetadataString(metadata, 'law_title'),
    getMetadataString(metadata, 'act_title'),
    getMetadataString(metadata, 'source'),
    getMetadataString(metadata, 'source_id'),
    getMetadataString(metadata, 'article_number'),
  ].filter((part): part is string => part != null)

  return parts.length > 0 ? parts.join(' > ') : node.label
}

function textFromBackendNode(node: BackendGraphNode) {
  const metadata = node.metadata
  const text =
    getMetadataString(metadata, 'raw_text') ??
    getMetadataString(metadata, 'excerpt') ??
    getMetadataString(metadata, 'snippet') ??
    getMetadataString(metadata, 'normalized_text') ??
    getMetadataString(metadata, 'text') ??
    getMetadataString(metadata, 'source')

  return (text ?? '').slice(0, 420)
}

function mapBackendNode(node: BackendGraphNode): GraphNode {
  const category = categoryFromBackendNode(node)

  return {
    id: node.id,
    label: node.label,
    fullLabel: fullLabelFromBackendNode(node),
    text: textFromBackendNode(node),
    category,
    val: categorySize[category],
  }
}

function mapBackendEdge(edge: BackendGraphEdge, index: number): GraphLink {
  const edgeType = getBackendEdgeType(edge)

  return {
    id: edge.id ?? `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    edgeType,
    label: edge.label ?? edgeType,
  }
}

function getEndpointId(endpoint: unknown) {
  if (typeof endpoint === 'string' || typeof endpoint === 'number') {
    return String(endpoint)
  }

  if (endpoint && typeof endpoint === 'object' && 'id' in endpoint) {
    const id = (endpoint as { id?: string | number }).id
    return id == null ? '' : String(id)
  }

  return ''
}

function getLinkKey(link: GraphLink) {
  return link.id || `${getEndpointId(link.source)}-${getEndpointId(link.target)}`
}

function isEvidenceEdgeType(edgeType: string | undefined) {
  return edgeType === 'cited_in_answer' || edgeType === 'supports_claim'
}

export interface ProductForceGraphHandle {
  focusRandomNode: () => void
  focusNode: (nodeId: string) => void
  focusOverview: () => void
  discoverNodes: () => void
  highlightPointsGradually: (count: number, onProgress?: (current: number) => void) => Promise<GraphNode[]>
  getGraphStats: () => { totalNodes: number; totalLinks: number; articles: number }
}

interface ProductForceGraphProps {
  hideParagraphs?: boolean
  onNodesDiscovered?: (nodes: GraphNode[]) => void
  queryGraph?: QueryGraphResponse | null
  highlightedNodeIds?: string[]
  highlightedEdgeIds?: string[]
  disableLocalFallback?: boolean
}

const ProductForceGraph = forwardRef<ProductForceGraphHandle, ProductForceGraphProps>(function ProductForceGraph({
  hideParagraphs = false,
  onNodesDiscovered,
  queryGraph = null,
  highlightedNodeIds: highlightedNodeIdsProp,
  highlightedEdgeIds: highlightedEdgeIdsProp,
  disableLocalFallback = false,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<ForceGraphMethods<RenderNode, RenderLink>>(undefined!)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [isGraphReady, setIsGraphReady] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set())
  const [highlightedLinkIds, setHighlightedLinkIds] = useState<Set<string>>(new Set())
  const [localGraph, setLocalGraph] = useState<LocalGraphData | null>(null)
  const bannerTimerRef = useRef<number | null>(null)
  const globalScaleRef = useRef(1)
  const highlightStartRef = useRef(0)
  const isHighlightingRef = useRef(false)
  const queryHighlightedNodeIds = queryGraph?.highlighted_node_ids
  const queryHighlightedEdgeIds = queryGraph?.highlighted_edge_ids
  const queryCitedUnitIds = queryGraph?.cited_unit_ids
  const backendHighlightedNodeIds = useMemo(
    () => new Set(highlightedNodeIdsProp ?? queryHighlightedNodeIds ?? []),
    [highlightedNodeIdsProp, queryHighlightedNodeIds],
  )
  const backendHighlightedEdgeIds = useMemo(
    () => new Set(highlightedEdgeIdsProp ?? queryHighlightedEdgeIds ?? []),
    [highlightedEdgeIdsProp, queryHighlightedEdgeIds],
  )
  const citedNodeIds = useMemo(
    () => new Set(queryCitedUnitIds ?? []),
    [queryCitedUnitIds],
  )
  const isLocalFallbackDisabled = disableLocalFallback && !queryGraph

  useEffect(() => {
    if (queryGraph || isLocalFallbackDisabled || localGraph) return

    let cancelled = false
    void loadLocalGraphData().then((nextLocalGraph) => {
      if (!cancelled) setLocalGraph(nextLocalGraph)
    })

    return () => {
      cancelled = true
    }
  }, [isLocalFallbackDisabled, localGraph, queryGraph])

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

  const flyToNode = useCallback((targetNode: GraphNode, customHighlights?: { nodes: Set<string>, links: Set<string> } | null, duration = 3000) => {
    return new Promise<void>((resolve) => {
      const graph = graphRef.current
      if (!graph || typeof targetNode.x !== 'number' || typeof targetNode.y !== 'number') {
        resolve()
        return
      }

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
        if (t < 1) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }

      if (customHighlights !== undefined) {
        if (customHighlights) {
          setHighlightedNodeIds(customHighlights.nodes)
          setHighlightedLinkIds(customHighlights.links)
        }
        // if customHighlights is null, we explicitly skip highlight updates
      } else {
        setHighlightedNodeIds(new Set([targetNode.id]))
        setHighlightedLinkIds(new Set())
      }

      highlightStartRef.current = performance.now()
      requestAnimationFrame(step)
    })
  }, [])

  const data = useMemo(() => {
    if (isLocalFallbackDisabled) return EMPTY_GRAPH_DATA
    if (!queryGraph && !localGraph) return EMPTY_GRAPH_DATA

    const fallbackGraph = localGraph ?? EMPTY_GRAPH_DATA

    const baseNodes = queryGraph
      ? queryGraph.graph.nodes.map(mapBackendNode)
      : fallbackGraph.nodes
    const baseNodeIds = new Set(baseNodes.map((node) => node.id))
    const baseLinks = queryGraph
      ? queryGraph.graph.edges
          .map(mapBackendEdge)
          .filter((edge) => baseNodeIds.has(edge.source) && baseNodeIds.has(edge.target))
      : fallbackGraph.links

    if (!hideParagraphs) return { nodes: baseNodes, links: baseLinks }

    const protectedNodeIds = new Set([
      ...backendHighlightedNodeIds,
      ...citedNodeIds,
    ])
    const filtered = baseNodes.filter((n) => n.category !== 'paragraph' || protectedNodeIds.has(n.id))
    const filteredIds = new Set(filtered.map((n) => n.id))

    return {
      nodes: filtered,
      links: baseLinks.filter((l) => {
        const sourceId = getEndpointId(l.source)
        const targetId = getEndpointId(l.target)
        return filteredIds.has(sourceId) && filteredIds.has(targetId)
      }),
    }
  }, [backendHighlightedNodeIds, citedNodeIds, hideParagraphs, isLocalFallbackDisabled, localGraph, queryGraph])

  useEffect(() => {
    if (!queryGraph) return

    setHighlightedNodeIds(new Set([...backendHighlightedNodeIds, ...citedNodeIds]))
    setHighlightedLinkIds(new Set(backendHighlightedEdgeIds))
    highlightStartRef.current = performance.now()

    const timerId = window.setTimeout(() => {
      const nodes = data.nodes as GraphNode[]
      const preferredTarget =
        nodes.find((node) => backendHighlightedNodeIds.has(node.id) && typeof node.x === 'number' && typeof node.y === 'number') ??
        nodes.find((node) => citedNodeIds.has(node.id) && typeof node.x === 'number' && typeof node.y === 'number') ??
        nodes.find((node) => node.category === 'query' && typeof node.x === 'number' && typeof node.y === 'number')

      if (!preferredTarget) return

      void flyToNode(
        preferredTarget,
        {
          nodes: new Set([...backendHighlightedNodeIds, ...citedNodeIds]),
          links: new Set(backendHighlightedEdgeIds),
        },
        1600,
      )
    }, 900)

    return () => window.clearTimeout(timerId)
  }, [backendHighlightedEdgeIds, backendHighlightedNodeIds, citedNodeIds, data, flyToNode, queryGraph])

  useImperativeHandle(ref, () => ({
    focusRandomNode() {
      const nodes = data.nodes as GraphNode[]
      const positioned = nodes.filter(
        (n) => typeof n.x === 'number' && typeof n.y === 'number',
      )
      if (positioned.length === 0) return

      if (queryGraph) {
        const highlightedTarget =
          positioned.find((node) => backendHighlightedNodeIds.has(node.id)) ??
          positioned.find((node) => citedNodeIds.has(node.id)) ??
          positioned.find((node) => node.category === 'query')
        if (highlightedTarget) {
          void flyToNode(highlightedTarget, {
            nodes: new Set([...backendHighlightedNodeIds, ...citedNodeIds]),
            links: new Set(backendHighlightedEdgeIds),
          })
          return
        }
      }

      // prefer root/article but fall back to any positioned node
      const hubs = positioned.filter((n) => n.category === 'root' || n.category === 'article')
      const pool = hubs.length > 0 ? hubs : positioned
      const target = pool[Math.floor(Math.random() * pool.length)]
      flyToNode(target)
    },
    focusNode(nodeId: string) {
      const node = (data.nodes as GraphNode[]).find((n) => n.id === nodeId)
      if (node) {
        void flyToNode(node, null, 1200)
      }
    },
    focusOverview() {
      const graph = graphRef.current
      if (graph) {
        graph.zoomToFit(1200, 80)
      }
    },
    getGraphStats() {
      const nodes = data.nodes as GraphNode[]
      return {
        totalNodes: nodes.length,
        totalLinks: data.links.length,
        articles: nodes.filter(n => n.category === 'article').length
      }
    },
    async discoverNodes() {
      const nodes = data.nodes as GraphNode[]
      if (nodes.length === 0) return

      if (queryGraph) {
        const highlighted = nodes.filter((node) => backendHighlightedNodeIds.has(node.id) || citedNodeIds.has(node.id))
        const positioned = highlighted.filter((node) => typeof node.x === 'number' && typeof node.y === 'number')
        if (onNodesDiscovered) onNodesDiscovered(highlighted.slice(0, 8))

        const target = positioned[0] ?? nodes.find((node) => node.category === 'query')
        if (target) {
          await flyToNode(target, {
            nodes: new Set([...backendHighlightedNodeIds, ...citedNodeIds]),
            links: new Set(backendHighlightedEdgeIds),
          }, 1600)
        }
        return
      }

      // 1. Pick 8 random seed nodes
      const seeds: GraphNode[] = []
      const positioned = nodes.filter(n => typeof n.x === 'number' && typeof n.y === 'number')
      const pool = [...positioned]
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
        data.links.forEach((link) => {
          const sourceId = getEndpointId(link.source)
          const targetId = getEndpointId(link.target)
          
          if (sourceId === seed.id || targetId === seed.id) {
            discoveredNodeIds.add(sourceId)
            discoveredNodeIds.add(targetId)
            discoveredLinkIds.add(getLinkKey(link))
          }
        })
      })

      if (onNodesDiscovered) onNodesDiscovered(seeds)

      // 3. Tour Sequence
      const highlights = { nodes: discoveredNodeIds, links: discoveredLinkIds }
      for (let i = 0; i < seeds.length; i++) {
        // Fast move (1s) for subsequent nodes, normal for first
        await flyToNode(seeds[i], highlights, i === 0 ? 2500 : 1200)
        // brief pause at each node
        await new Promise((resolve) => window.setTimeout(resolve, 800))
      }
    },
    async highlightPointsGradually(count: number, onProgress?: (current: number) => void) {
      if (isHighlightingRef.current) return []
      const nodes = data.nodes as GraphNode[]
      if (nodes.length === 0) return []

      isHighlightingRef.current = true
      
      try {
        // Pick random points (prefer those with links if possible, or just random)
        const points = nodes.filter(n => n.category === 'point')
        const pool = points.length >= count ? points : nodes
        const selected: GraphNode[] = []
        const available = [...pool]
        
        for (let i = 0; i < count && available.length > 0; i++) {
          const idx = Math.floor(Math.random() * available.length)
          selected.push(available.splice(idx, 1)[0])
        }

        setHighlightedNodeIds(new Set())
        setHighlightedLinkIds(new Set())
        highlightStartRef.current = performance.now()

        // 1. Zoom in slightly on top position (Discovery Phase)
        const graph = graphRef.current
        if (graph) {
          graph.zoom(1.1, 1200)
        }
        await new Promise(resolve => setTimeout(resolve, 800))

        // 2. Add nodes one by one
        for (let i = 0; i < selected.length; i++) {
          const node = selected[i]
          
          setHighlightedNodeIds(prev => {
            const next = new Set(prev)
            next.add(node.id)
            return next
          })

          if (onProgress) onProgress(i + 1)
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // 3. Final zoom out to show everything highlighted
        if (graph) {
          graph.zoomToFit(1500, 80)
        }
        
        // Wait for the final zoom to actually finish before returning to the caller
        // so that the next camera movement (like focusNode) doesn't conflict.
        await new Promise(resolve => setTimeout(resolve, 1600))

        return selected
      } finally {
        isHighlightingRef.current = false
      }
    }
  }), [
    backendHighlightedEdgeIds,
    backendHighlightedNodeIds,
    citedNodeIds,
    data,
    flyToNode,
    onNodesDiscovered,
    queryGraph,
  ])

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
      if (target?.category === 'query') return 320
      if (target?.category === 'claim') return 240
      if (target?.category === 'article') return 180
      if (target?.category === 'paragraph') return 40
      if (target?.category === 'letter') return 25
      if (target?.category === 'point') return 15
      return 180
    })

    const chargeForce = graph.d3Force('charge') as
      | { strength: (value: number | ((node: unknown) => number)) => unknown; distanceMax: (value: number) => unknown }
      | undefined
      
    chargeForce?.strength((node: unknown) => {
      const cat = (node as GraphNode).category
      if (cat === 'root' || cat === 'query') return -1200
      if (cat === 'claim') return -800
      if (cat === 'article') return -600
      if (cat === 'paragraph') return -100
      return -40
    })
    chargeForce?.distanceMax(1500)

    graph.d3Force('collide', forceCollide<GraphNode>()
      .radius((node) => {
        const cat = (node as GraphNode).category
        return cat === 'root' || cat === 'query' ? 75
          : cat === 'claim' ? 52
          : cat === 'article' ? 45
          : cat === 'paragraph' ? 25
          : 15
      })
      .strength(0.8)
      .iterations(2)
    )

    if (size.width > 0 && size.height > 0) {
      graph.d3ReheatSimulation()
    }
  }, [data, queryGraph, size.width, size.height])

  useEffect(() => {
    // Safety fallback: if the engine doesn't stop or tick for some reason, 
    // hide the loader after a few seconds anyway so the user isn't stuck.
    const timer = setTimeout(() => setIsGraphReady(true), 3500)
    return () => clearTimeout(timer)
  }, [])

  if (isLocalFallbackDisabled) {
    return (
      <div ref={containerRef} className="product-force-graph product-force-graph--empty">
        <div className="product-force-graph-empty-state">
          Graful juridic va apărea după ce backend-ul returnează un query graph.
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="product-force-graph">
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph2D<ProductForceGraphNode, GraphLink>
          ref={graphRef}
          graphData={data}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          linkCurvature={0.2}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          nodeRelSize={3}
          nodeVal={(node) => (node as GraphNode).val}
          nodeColor={(node) => categoryColor[(node as GraphNode).category]}
          nodeLabel={() => ''}
          onNodeHover={handleNodeHover}
          linkColor={(link) => {
            const source = (typeof link.source === 'object' ? link.source : null) as GraphNode | null
            const target = (typeof link.target === 'object' ? link.target : null) as GraphNode | null
            const gs = globalScaleRef.current

            function nodeHidden(n: GraphNode | null) {
              if (!n) return false
              if (highlightedNodeIds.has(n.id)) return false
              if (n.category === 'paragraph' && gs < 0.7) return true
              if (n.category === 'letter' && gs < 1.1) return true
              if (n.category === 'point' && gs < 1.6) return true
              return false
            }

            if (nodeHidden(source) || nodeHidden(target)) return 'rgba(0,0,0,0)'

            const sourceId = getEndpointId(link.source)
            const targetId = getEndpointId(link.target)
            const edgeType = (link as GraphLink).edgeType
            
            const isHighlighted = highlightedLinkIds.has(getLinkKey(link as GraphLink))
            // Strong connection if both ends are highlighted
            const isStrong = highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId)
            const isEvidenceEdge = isEvidenceEdgeType(edgeType)

            if (isHighlighted || isStrong || isEvidenceEdge) {
              const elapsed = (performance.now() - highlightStartRef.current) / 1000
              const pulse = 0.7 + 0.3 * Math.sin(elapsed * 4)
              const baseOpacity = isHighlighted || isStrong ? 0.95 : 0.72
              return `rgba(140, 180, 255, ${(baseOpacity * pulse).toFixed(2)})`
            }

            // Strengthen as we zoom in: opacity goes from ~0.16 up to ~0.45
            const opacity = edgeType === 'contains'
              ? Math.min(0.32, 0.12 + (gs - 0.5) * 0.12)
              : Math.min(0.52, 0.22 + (gs - 0.5) * 0.18)
            return `rgba(200, 210, 235, ${opacity.toFixed(2)})`
          }}
          linkWidth={(link) => {
            const sourceId = getEndpointId(link.source)
            const targetId = getEndpointId(link.target)
            const edgeType = (link as GraphLink).edgeType
            const isStrong = highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId)
            if (isStrong || highlightedLinkIds.has(getLinkKey(link as GraphLink))) return 3.5
            if (isEvidenceEdgeType(edgeType)) return 2.6
            return edgeType === 'contains' ? 1.2 : 1.8
          }}
          cooldownTicks={160}
          warmupTicks={80}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.42}
          enableNodeDrag={false}
          nodeCanvasObjectMode={() => 'replace'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            globalScaleRef.current = globalScale
            const typed = node as GraphNode
            if (typeof node.x !== 'number' || typeof node.y !== 'number') return
            const isHighlighted = highlightedNodeIds.has(typed.id)
            if (!isHighlighted && typed.category === 'point' && globalScale < 1.6) return
            if (!isHighlighted && typed.category === 'letter' && globalScale < 1.1) return
            if (!isHighlighted && typed.category === 'paragraph' && globalScale < 0.7) return

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

            const isHub = typed.category === 'root' || typed.category === 'query' || typed.category === 'article'

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
          onEngineStop={() => setIsGraphReady(true)}
        />
      ) : null}

      {!isGraphReady ? (
        <div className="product-graph-loader">
          <div className="product-graph-spinner" />
          <span>Analysing legal connections...</span>
        </div>
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
