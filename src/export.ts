import mermaid from 'mermaid'
import type { Theme } from './themes.js'
import { resolveTheme } from './themes.js'
import { discoverElements } from './discovery.js'
import { renderSvgToImageData, loadSvgAsImage } from './capture.js'
import { encodeGif } from './gif-encoder.js'
import type { FrameData } from './gif-encoder.js'
import { collectEdgeGeometries, styleNodes, type EdgeGeometry } from './dots.js'

export type { Theme }

let exportIdCounter = 0

export interface ExportOptions {
  width?: number
  height?: number
  fps?: number
  totalFrames?: number
  dotsPerEdge?: number
  dotRadius?: number
  theme?: string | Theme
  background?: string
  mermaid?: Record<string, unknown>
}

export type GifExportOptions = ExportOptions

export interface VideoExportOptions extends ExportOptions {
  videoBitsPerSecond?: number
}

interface RenderContext {
  svgEl: SVGSVGElement
  dotGroup: SVGGElement
  geometries: EdgeGeometry[]
  outWidth: number
  outHeight: number
  background: string
  dotsPerEdge: number
  dotRadius: number
  glowOpacity: number
  container: HTMLElement
}

async function setupRender(code: string, options: ExportOptions = {}): Promise<RenderContext> {
  const resolvedTheme = resolveTheme(options.theme ?? 'dark')
  const {
    width = 800,
    height = 600,
    dotsPerEdge = 3,
    dotRadius = 3,
    background = resolvedTheme.background,
    mermaid: mermaidOptions = {}
  } = options

  const container = document.createElement('div')
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  const mermaidConfig = { ...mermaidOptions }
  if (!('securityLevel' in mermaidConfig)) {
    mermaidConfig.securityLevel = 'strict'
  }
  mermaid.initialize({ startOnLoad: false, theme: resolvedTheme.mermaidTheme as Parameters<typeof mermaid.initialize>[0]['theme'], ...mermaidConfig })
  const id = `ma-export-${Date.now()}-${exportIdCounter++}`
  const { svg } = await mermaid.render(id, code)

  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, 'text/html')
  const parsedSvg = doc.body.querySelector('svg')
  container.innerHTML = ''
  if (parsedSvg) {
    container.appendChild(document.adoptNode(parsedSvg))
  } else {
    container.innerHTML = svg
  }

  const svgEl = container.querySelector('svg')
  if (!svgEl) throw new Error('Mermaid did not produce an SVG element during export')

  const vb = svgEl.viewBox?.baseVal
  let outWidth = width
  let outHeight = height
  if (vb && vb.width && vb.height) {
    const aspect = vb.width / vb.height
    if (aspect > width / height) {
      outHeight = Math.round(width / aspect)
    } else {
      outWidth = Math.round(height * aspect)
    }
  }

  svgEl.setAttribute('width', String(outWidth))
  svgEl.setAttribute('height', String(outHeight))

  const model = discoverElements(svgEl)
  styleNodes(model, resolvedTheme)
  const geometries = collectEdgeGeometries(model, resolvedTheme)

  const dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  dotGroup.setAttribute('id', 'ma-dots')
  svgEl.appendChild(dotGroup)

  return {
    svgEl, dotGroup, geometries, outWidth, outHeight,
    background, dotsPerEdge, dotRadius,
    glowOpacity: resolvedTheme.dotGlowOpacity,
    container
  }
}

function renderDotsMarkup(ctx: RenderContext, progress: number): string {
  const { geometries, dotsPerEdge, dotRadius, glowOpacity } = ctx
  const spacing = 1 / dotsPerEdge
  let markup = ''

  for (const geo of geometries) {
    for (let d = 0; d < dotsPerEdge; d++) {
      const t = (progress + geo.phase + d * spacing) % 1
      const pt = geo.getPoint(t)
      const x = pt.x + geo.offsetX
      const y = pt.y + geo.offsetY

      markup +=
        `<circle cx="${x}" cy="${y}" r="${dotRadius * 2.5}" fill="${geo.glowColor}" opacity="${glowOpacity}"/>` +
        `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="${geo.color}" opacity="0.95"/>`
    }
  }

  return markup
}

export async function exportGif(
  code: string,
  options: ExportOptions = {}
): Promise<Uint8Array> {
  const { fps = 12, totalFrames = 60 } = options
  const delay = Math.round(1000 / fps)
  const ctx = await setupRender(code, options)

  try {
    const frames: FrameData[] = []

    for (let f = 0; f < totalFrames; f++) {
      ctx.dotGroup.innerHTML = renderDotsMarkup(ctx, f / totalFrames)
      const frame = await renderSvgToImageData(ctx.svgEl, ctx.outWidth, ctx.outHeight, ctx.background)
      frames.push(frame)
    }

    ctx.dotGroup.remove()
    return encodeGif(frames, { delay })
  } finally {
    ctx.container.remove()
  }
}

export async function exportVideo(
  code: string,
  options: VideoExportOptions = {}
): Promise<Blob> {
  const { fps = 12, totalFrames = 60, videoBitsPerSecond = 2_000_000 } = options
  const ctx = await setupRender(code, options)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = ctx.outWidth
    canvas.height = ctx.outHeight
    const canvasCtx = canvas.getContext('2d')
    if (!canvasCtx) throw new Error('Failed to get 2d context from canvas')

    const stream = canvas.captureStream(0)
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm',
      videoBitsPerSecond
    })

    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    })

    recorder.start()
    const frameDelay = 1000 / fps

    for (let f = 0; f < totalFrames; f++) {
      ctx.dotGroup.innerHTML = renderDotsMarkup(ctx, f / totalFrames)

      const img = await loadSvgAsImage(ctx.svgEl, ctx.outWidth, ctx.outHeight)

      canvasCtx.fillStyle = ctx.background
      canvasCtx.fillRect(0, 0, ctx.outWidth, ctx.outHeight)
      canvasCtx.drawImage(img, 0, 0, ctx.outWidth, ctx.outHeight)

      const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
      track.requestFrame()

      await new Promise(r => setTimeout(r, frameDelay))
    }

    recorder.stop()
    ctx.dotGroup.remove()

    return done
  } finally {
    ctx.container.remove()
  }
}
