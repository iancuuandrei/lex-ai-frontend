import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'

const WORLD_SIZE = 10000
const MIN_SCALE = 0.55
const MAX_SCALE = 3.2
const INITIAL_SCALE = 1
const EDGE_PADDING = 180

interface SurfaceSize {
  width: number
  height: number
}

interface ViewportState {
  x: number
  y: number
  scale: number
}

interface CanvasPoint {
  x: number
  y: number
}

interface PanGesture {
  mode: 'pan'
  startPointer: CanvasPoint
  startViewport: ViewportState
}

interface PinchGesture {
  mode: 'pinch'
  startDistance: number
  startScale: number
  anchorWorld: CanvasPoint
}

type GestureState = PanGesture | PinchGesture | null
type WheelLikeEvent = Pick<WheelEvent, 'ctrlKey' | 'metaKey' | 'deltaX' | 'deltaY'>
type WebkitGestureEvent = Event & {
  clientX?: number
  clientY?: number
  scale?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function distance(a: CanvasPoint, b: CanvasPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: CanvasPoint, b: CanvasPoint) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function isLikelyTrackpad(event: WheelLikeEvent) {
  if (event.ctrlKey || event.metaKey) return false

  return Math.abs(event.deltaX) > 0 || Math.abs(event.deltaY) < 24
}

function CanvasContainer() {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<ViewportState>({
    x: 0,
    y: 0,
    scale: INITIAL_SCALE,
  })
  const pointersRef = useRef(new Map<number, CanvasPoint>())
  const gestureRef = useRef<GestureState>(null)
  const nativePinchRef = useRef<{ startScale: number; anchorPoint: CanvasPoint } | null>(null)
  const hasInitializedRef = useRef(false)
  const [surfaceSize, setSurfaceSize] = useState<SurfaceSize>({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(INITIAL_SCALE)

  useEffect(() => {
    const element = surfaceRef.current

    if (!element) return

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSurfaceSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })

    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (surfaceSize.width === 0 || surfaceSize.height === 0) return

    if (!hasInitializedRef.current) {
      const nextViewport = {
        scale: INITIAL_SCALE,
        x: surfaceSize.width / 2 - (WORLD_SIZE * INITIAL_SCALE) / 2,
        y: surfaceSize.height / 2 - (WORLD_SIZE * INITIAL_SCALE) / 2,
      }

      applyViewport(nextViewport)
      hasInitializedRef.current = true
      return
    }

    applyViewport(viewportRef.current)
  }, [surfaceSize])

  useEffect(() => {
    const element = surfaceRef.current

    if (!element) return

    const surfaceElement = element

    function handleWheel(event: WheelEvent) {
      event.preventDefault()

      if (surfaceSize.width === 0 || surfaceSize.height === 0) return

      if (isLikelyTrackpad(event)) {
        applyViewport({
          ...viewportRef.current,
          x: viewportRef.current.x - event.deltaX,
          y: viewportRef.current.y - event.deltaY,
        })
        return
      }

      const bounds = surfaceElement.getBoundingClientRect()

      zoomAtPoint(
        viewportRef.current.scale * Math.exp(-event.deltaY * 0.0012),
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      )
    }

    function handleGestureStart(event: Event) {
      const gestureEvent = event as WebkitGestureEvent
      event.preventDefault()

      const bounds = surfaceElement.getBoundingClientRect()

      nativePinchRef.current = {
        startScale: viewportRef.current.scale,
        anchorPoint: {
          x: (gestureEvent.clientX ?? bounds.left + bounds.width / 2) - bounds.left,
          y: (gestureEvent.clientY ?? bounds.top + bounds.height / 2) - bounds.top,
        },
      }
    }

    function handleGestureChange(event: Event) {
      const gestureEvent = event as WebkitGestureEvent
      const pinchState = nativePinchRef.current

      if (!pinchState) return

      event.preventDefault()

      zoomAtPoint(
        pinchState.startScale * (gestureEvent.scale ?? 1),
        pinchState.anchorPoint,
      )
    }

    function handleGestureEnd(event: Event) {
      event.preventDefault()
      nativePinchRef.current = null
    }

    surfaceElement.addEventListener('wheel', handleWheel, { passive: false })
    surfaceElement.addEventListener('gesturestart', handleGestureStart as EventListener, { passive: false })
    surfaceElement.addEventListener('gesturechange', handleGestureChange as EventListener, { passive: false })
    surfaceElement.addEventListener('gestureend', handleGestureEnd as EventListener, { passive: false })

    return () => {
      surfaceElement.removeEventListener('wheel', handleWheel)
      surfaceElement.removeEventListener('gesturestart', handleGestureStart as EventListener)
      surfaceElement.removeEventListener('gesturechange', handleGestureChange as EventListener)
      surfaceElement.removeEventListener('gestureend', handleGestureEnd as EventListener)
    }
  }, [surfaceSize])

  function screenToWorld(point: CanvasPoint, viewport = viewportRef.current) {
    return {
      x: (point.x - viewport.x) / viewport.scale,
      y: (point.y - viewport.y) / viewport.scale,
    }
  }

  function clampViewport(nextViewport: ViewportState): ViewportState {
    const nextScale = clamp(nextViewport.scale, MIN_SCALE, MAX_SCALE)
    const scaledWorldWidth = WORLD_SIZE * nextScale
    const scaledWorldHeight = WORLD_SIZE * nextScale

    const nextX = scaledWorldWidth <= surfaceSize.width
      ? (surfaceSize.width - scaledWorldWidth) / 2
      : clamp(nextViewport.x, surfaceSize.width - scaledWorldWidth - EDGE_PADDING, EDGE_PADDING)

    const nextY = scaledWorldHeight <= surfaceSize.height
      ? (surfaceSize.height - scaledWorldHeight) / 2
      : clamp(nextViewport.y, surfaceSize.height - scaledWorldHeight - EDGE_PADDING, EDGE_PADDING)

    return {
      x: nextX,
      y: nextY,
      scale: nextScale,
    }
  }

  function applyViewport(nextViewport: ViewportState) {
    const clampedViewport = clampViewport(nextViewport)

    viewportRef.current = clampedViewport
    x.set(clampedViewport.x)
    y.set(clampedViewport.y)
    scale.set(clampedViewport.scale)
  }

  function zoomAtPoint(nextScale: number, point: CanvasPoint) {
    const currentViewport = viewportRef.current
    const anchorWorld = screenToWorld(point, currentViewport)

    applyViewport({
      scale: nextScale,
      x: point.x - anchorWorld.x * nextScale,
      y: point.y - anchorWorld.y * nextScale,
    })
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType !== 'touch') return

    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)

    const pointer = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, pointer)

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        mode: 'pan',
        startPointer: pointer,
        startViewport: viewportRef.current,
      }
      setIsDragging(true)
      return
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      const bounds = element.getBoundingClientRect()
      const center = midpoint(
        { x: first.x - bounds.left, y: first.y - bounds.top },
        { x: second.x - bounds.left, y: second.y - bounds.top },
      )

      gestureRef.current = {
        mode: 'pinch',
        startDistance: distance(first, second),
        startScale: viewportRef.current.scale,
        anchorWorld: screenToWorld(center),
      }
      setIsDragging(false)
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const gesture = gestureRef.current
    const bounds = event.currentTarget.getBoundingClientRect()

    if (gesture?.mode === 'pan' && pointersRef.current.size === 1) {
      const pointer = pointersRef.current.get(event.pointerId)

      if (!pointer) return

      applyViewport({
        ...gesture.startViewport,
        x: gesture.startViewport.x + pointer.x - gesture.startPointer.x,
        y: gesture.startViewport.y + pointer.y - gesture.startPointer.y,
      })
      return
    }

    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()]
      const pinchGesture = gesture?.mode === 'pinch'
        ? gesture
        : {
          mode: 'pinch' as const,
          startDistance: distance(first, second),
          startScale: viewportRef.current.scale,
          anchorWorld: screenToWorld(
            midpoint(
              { x: first.x - bounds.left, y: first.y - bounds.top },
              { x: second.x - bounds.left, y: second.y - bounds.top },
            ),
          ),
        }

      gestureRef.current = pinchGesture

      const pointerCenter = midpoint(
        { x: first.x - bounds.left, y: first.y - bounds.top },
        { x: second.x - bounds.left, y: second.y - bounds.top },
      )
      const nextScale = clamp(
        pinchGesture.startScale * (distance(first, second) / pinchGesture.startDistance),
        MIN_SCALE,
        MAX_SCALE,
      )

      applyViewport({
        scale: nextScale,
        x: pointerCenter.x - pinchGesture.anchorWorld.x * nextScale,
        y: pointerCenter.y - pinchGesture.anchorWorld.y * nextScale,
      })
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId)

    if (pointersRef.current.size === 1) {
      const [remainingPointer] = [...pointersRef.current.values()]

      gestureRef.current = {
        mode: 'pan',
        startPointer: remainingPointer,
        startViewport: viewportRef.current,
      }
      setIsDragging(true)
      return
    }

    if (pointersRef.current.size === 0) {
      gestureRef.current = null
      setIsDragging(false)
    }
  }

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-slate-100">
      <div
        ref={surfaceRef}
        className="absolute inset-0 overflow-hidden"
        onDoubleClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()

          zoomAtPoint(
            viewportRef.current.scale * 1.35,
            { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
          )
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
      >
        <motion.div
          className="absolute left-0 top-0 h-[10000px] w-[10000px] origin-top-left"
          style={{
            x,
            y,
            scale,
            willChange: 'transform',
            backgroundColor: '#f8fafc',
            backgroundImage: `
              linear-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.16) 1px, transparent 1px),
              linear-gradient(rgba(226, 232, 240, 0.9) 1px, transparent 1px),
              linear-gradient(90deg, rgba(226, 232, 240, 0.9) 1px, transparent 1px)
            `,
            backgroundSize: '320px 320px, 320px 320px, 32px 32px, 32px 32px',
            backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
          }}
        />
      </div>
    </section>
  )
}

export default CanvasContainer
