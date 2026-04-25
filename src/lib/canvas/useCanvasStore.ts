import { create } from 'zustand'

export const CANVAS_WORLD_SIZE = 10000
export const CANVAS_WORLD_CENTER = CANVAS_WORLD_SIZE / 2
export const INITIAL_CANVAS_FOCUS = {
  x: 5080,
  y: 4520,
}

const NODE_EDGE_PADDING = 72

export type CanvasNodeKind = 'image' | 'prompt' | 'enhancer' | 'slider'
export type ImageStatus = 'empty' | 'uploading' | 'ready' | 'error'
export type PromptScope = 'global' | 'local'
export type EnhancerTool = 'relight' | 'upscale' | 'cleanup'

export interface CanvasViewport {
  x: number
  y: number
  scale: number
}

interface CanvasNodeBase {
  id: string
  type: CanvasNodeKind
  title: string
  subtitle: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export interface CanvasImageNode extends CanvasNodeBase {
  type: 'image'
  imageUrl: string | null
  fileName: string | null
  prompt: string
  status: ImageStatus
  errorMessage: string | null
  variantLabel: string
}

export interface CanvasPromptNode extends CanvasNodeBase {
  type: 'prompt'
  text: string
  scope: PromptScope
}

export interface CanvasEnhancerNode extends CanvasNodeBase {
  type: 'enhancer'
  tool: EnhancerTool
  strength: number
  queue: string[]
}

export interface CanvasSliderNode extends CanvasNodeBase {
  type: 'slider'
  reveal: number
}

export type CanvasNode =
  | CanvasImageNode
  | CanvasPromptNode
  | CanvasEnhancerNode
  | CanvasSliderNode

interface CanvasStore {
  nodes: CanvasNode[]
  viewport: CanvasViewport
  activeNodeId: string | null
  nodeSeed: number
  setViewport: (viewport: CanvasViewport) => void
  setActiveNode: (nodeId: string | null) => void
  bringNodeToFront: (nodeId: string) => void
  updateNodePosition: (nodeId: string, x: number, y: number) => void
  addNode: (kind: CanvasNodeKind, position: { x: number; y: number }) => void
  updatePromptText: (nodeId: string, text: string) => void
  updatePromptScope: (nodeId: string, scope: PromptScope) => void
  updateImagePrompt: (nodeId: string, prompt: string) => void
  setImageUploadState: (nodeId: string, status: Exclude<ImageStatus, 'ready'>, errorMessage?: string | null) => void
  setImageFromFile: (nodeId: string, file: File) => void
  updateEnhancerTool: (nodeId: string, tool: EnhancerTool) => void
  updateEnhancerStrength: (nodeId: string, strength: number) => void
  updateSliderReveal: (nodeId: string, reveal: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function nextZIndex(nodes: CanvasNode[]) {
  return nodes.reduce((highest, node) => Math.max(highest, node.zIndex), 0) + 1
}

function clampNodePosition(x: number, y: number, width: number, height: number) {
  return {
    x: clamp(x, NODE_EDGE_PADDING, CANVAS_WORLD_SIZE - NODE_EDGE_PADDING - width),
    y: clamp(y, NODE_EDGE_PADDING, CANVAS_WORLD_SIZE - NODE_EDGE_PADDING - height),
  }
}

function revokeBlobUrl(url: string | null) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function makeNodeId(kind: CanvasNodeKind, seed: number) {
  return `${kind}-${seed}`
}

function createNode(kind: CanvasNodeKind, seed: number, position: { x: number; y: number }, zIndex: number): CanvasNode {
  if (kind === 'image') {
    const width = 420
    const height = 320
    const { x, y } = clampNodePosition(position.x, position.y, width, height)

    return {
      id: makeNodeId(kind, seed),
      type: 'image',
      title: seed % 2 === 0 ? 'Source Image' : 'Variant Draft',
      subtitle: 'Drop a file or swap the current frame.',
      x,
      y,
      width,
      height,
      zIndex,
      imageUrl: null,
      fileName: null,
      prompt: 'clarify texture, protect highlights, keep skin tone natural',
      status: 'empty',
      errorMessage: null,
      variantLabel: seed % 2 === 0 ? 'Source' : 'Variant',
    }
  }

  if (kind === 'prompt') {
    const width = 360
    const height = 204
    const { x, y } = clampNodePosition(position.x, position.y, width, height)

    return {
      id: makeNodeId(kind, seed),
      type: 'prompt',
      title: 'Prompt Modifier',
      subtitle: 'Global or local language that steers linked images.',
      x,
      y,
      width,
      height,
      zIndex,
      text: 'Keep shadows soft, recover garment detail, and avoid plastic skin smoothing.',
      scope: 'global',
    }
  }

  if (kind === 'enhancer') {
    const width = 290
    const height = 228
    const { x, y } = clampNodePosition(position.x, position.y, width, height)

    return {
      id: makeNodeId(kind, seed),
      type: 'enhancer',
      title: 'Enhancement Stack',
      subtitle: 'Spatially connect this node to images you want to process.',
      x,
      y,
      width,
      height,
      zIndex,
      tool: 'relight',
      strength: 64,
      queue: ['Detail cleanup', 'Highlight balance', 'Face relight'],
    }
  }

  const width = 372
  const height = 304
  const { x, y } = clampNodePosition(position.x, position.y, width, height)

  return {
    id: makeNodeId(kind, seed),
    type: 'slider',
    title: 'Comparison Slider',
    subtitle: 'Drop over two overlapping image cards to preview the delta.',
    x,
    y,
    width,
    height,
    zIndex,
    reveal: 54,
  }
}

const initialNodes: CanvasNode[] = [
  {
    id: 'prompt-global',
    type: 'prompt',
    title: 'Direction Prompt',
    subtitle: 'A shared modifier drifting above the canvas.',
    x: 4260,
    y: 4220,
    width: 360,
    height: 204,
    zIndex: 1,
    text: 'Studio daylight, softer contrast, preserve textile grain, keep edges clean.',
    scope: 'global',
  },
  {
    id: 'image-source',
    type: 'image',
    title: 'Portrait Source',
    subtitle: 'Upload a raw frame or drag in a replacement.',
    x: 4680,
    y: 4340,
    width: 420,
    height: 320,
    zIndex: 2,
    imageUrl: 'https://picsum.photos/seed/stitch-source-portrait/960/720',
    fileName: 'studio-source.jpg',
    prompt: 'recover face detail, soften forehead highlights, keep hair texture',
    status: 'ready',
    errorMessage: null,
    variantLabel: 'Before',
  },
  {
    id: 'enhancer-core',
    type: 'enhancer',
    title: 'Portrait Enhancer',
    subtitle: 'Hover nearby images to show the spatial processing flow.',
    x: 5290,
    y: 4260,
    width: 290,
    height: 228,
    zIndex: 3,
    tool: 'relight',
    strength: 72,
    queue: ['Relight skin', 'Stabilize highlights', 'Lift fabric detail'],
  },
  {
    id: 'image-variant',
    type: 'image',
    title: 'Enhanced Variant',
    subtitle: 'A softer, brighter candidate for review.',
    x: 4900,
    y: 4450,
    width: 420,
    height: 320,
    zIndex: 4,
    imageUrl: 'https://picsum.photos/seed/stitch-variant-portrait/960/720',
    fileName: 'portrait-enhanced-v2.jpg',
    prompt: 'controlled lift in shadows, cleaner eyes, subtle warmth in skin',
    status: 'ready',
    errorMessage: null,
    variantLabel: 'After',
  },
  {
    id: 'slider-compare',
    type: 'slider',
    title: 'Before / After',
    subtitle: 'The compare card responds when it overlaps two images.',
    x: 4820,
    y: 4380,
    width: 372,
    height: 304,
    zIndex: 5,
    reveal: 58,
  },
]

export const useCanvasStore = create<CanvasStore>((set) => ({
  nodes: initialNodes,
  viewport: {
    x: 0,
    y: 0,
    scale: 1,
  },
  activeNodeId: 'slider-compare',
  nodeSeed: 6,
  setViewport: (viewport) => {
    set({
      viewport,
    })
  },
  setActiveNode: (nodeId) => {
    set({
      activeNodeId: nodeId,
    })
  },
  bringNodeToFront: (nodeId) => {
    set((state) => {
      const zIndex = nextZIndex(state.nodes)

      return {
        activeNodeId: nodeId,
        nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, zIndex } : node)),
      }
    })
  },
  updateNodePosition: (nodeId, x, y) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node

        const nextPosition = clampNodePosition(x, y, node.width, node.height)

        return {
          ...node,
          ...nextPosition,
        }
      }),
    }))
  },
  addNode: (kind, position) => {
    set((state) => {
      const node = createNode(kind, state.nodeSeed, position, nextZIndex(state.nodes))

      return {
        activeNodeId: node.id,
        nodeSeed: state.nodeSeed + 1,
        nodes: [...state.nodes, node],
      }
    })
  },
  updatePromptText: (nodeId, text) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'prompt'
          ? { ...node, text }
          : node
      )),
    }))
  },
  updatePromptScope: (nodeId, scope) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'prompt'
          ? { ...node, scope }
          : node
      )),
    }))
  },
  updateImagePrompt: (nodeId, prompt) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'image'
          ? { ...node, prompt }
          : node
      )),
    }))
  },
  setImageUploadState: (nodeId, status, errorMessage = null) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'image'
          ? { ...node, status, errorMessage }
          : node
      )),
    }))
  },
  setImageFromFile: (nodeId, file) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== 'image') return node

        revokeBlobUrl(node.imageUrl)

        return {
          ...node,
          title: file.name.replace(/\.[^.]+$/, ''),
          imageUrl: URL.createObjectURL(file),
          fileName: file.name,
          status: 'ready',
          errorMessage: null,
        }
      }),
    }))
  },
  updateEnhancerTool: (nodeId, tool) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'enhancer'
          ? { ...node, tool }
          : node
      )),
    }))
  },
  updateEnhancerStrength: (nodeId, strength) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'enhancer'
          ? { ...node, strength }
          : node
      )),
    }))
  },
  updateSliderReveal: (nodeId, reveal) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId && node.type === 'slider'
          ? { ...node, reveal: clamp(reveal, 0, 100) }
          : node
      )),
    }))
  },
}))
