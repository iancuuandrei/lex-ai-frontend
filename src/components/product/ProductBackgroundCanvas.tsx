import { useEffect, useRef } from 'react'

const MAX_DEVICE_PIXEL_RATIO = 2

export default function ProductBackgroundCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current

    if (!host || !canvas) return

    const context = canvas.getContext('2d')

    if (!context) return

    const hostElement = host
    const canvasElement = canvas
    const drawingContext = context

    let frameId = 0

    function draw() {
      const bounds = hostElement.getBoundingClientRect()
      const width = Math.max(Math.round(bounds.width), 1)
      const height = Math.max(Math.round(bounds.height), 1)
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)
      const scaledWidth = Math.round(width * dpr)
      const scaledHeight = Math.round(height * dpr)

      if (canvasElement.width !== scaledWidth || canvasElement.height !== scaledHeight) {
        canvasElement.width = scaledWidth
        canvasElement.height = scaledHeight
        canvasElement.style.width = `${width}px`
        canvasElement.style.height = `${height}px`
      }

      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawingContext.clearRect(0, 0, width, height)

      drawingContext.fillStyle = '#000000'
      drawingContext.fillRect(0, 0, width, height)

      const dotSpacing = width < 760 ? 20 : width < 1240 ? 22 : 24
      const dotRadius = width < 760 ? 1.05 : 1.15
      const offsetX = (width % dotSpacing) / 2
      const offsetY = (height % dotSpacing) / 2

      drawingContext.fillStyle = 'rgba(255, 255, 255, 0.24)'

      for (let y = offsetY; y < height + dotSpacing; y += dotSpacing) {
        for (let x = offsetX; x < width + dotSpacing; x += dotSpacing) {
          drawingContext.beginPath()
          drawingContext.arc(x, y, dotRadius, 0, Math.PI * 2)
          drawingContext.fill()
        }
      }
    }

    function scheduleDraw() {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(draw)
    }

    scheduleDraw()

    const resizeObserver = new ResizeObserver(scheduleDraw)
    resizeObserver.observe(hostElement)
    window.addEventListener('resize', scheduleDraw)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleDraw)
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div ref={hostRef} className="product-background-canvas" aria-hidden="true">
      <canvas ref={canvasRef} className="product-background-canvas__surface" />
    </div>
  )
}
