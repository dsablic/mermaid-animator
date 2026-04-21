import mermaid from 'mermaid'
import type { Theme } from './themes.js'
import { resolveTheme, darkTheme } from './themes.js'
import { discoverElements } from './discovery.js'
import { renderSvgToImageData } from './capture.js'
import { encodeGif } from './gif-encoder.js'
import type { FrameData } from './gif-encoder.js'
import { collectEdgeGeometries, styleNodes } from './dots.js'

export type { Theme }

export interface GifExportOptions {
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

export async function exportGif(
  code: string,
  options: GifExportOptions = {}
): Promise<Uint8Array> {
  const resolvedTheme = resolveTheme(options.theme ?? 'dark')
  const {
    width = 800,
    height = 600,
    fps = 12,
    totalFrames = 60,
    dotsPerEdge = 3,
    dotRadius = 3,
    background = resolvedTheme.background,
    mermaid: mermaidOptions = {}
  } = options

  const delay = Math.round(1000 / fps)

  const container = document.createElement('div')
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  try {
    mermaid.initialize({ startOnLoad: false, theme: resolvedTheme.mermaidTheme as 'dark' | 'default', ...mermaidOptions })
    const id = `ma-export-${Date.now()}`
    const { svg } = await mermaid.render(id, code)
    container.innerHTML = svg

    const svgEl = container.querySelector('svg')!

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

    const frames: FrameData[] = []
    const spacing = 1 / dotsPerEdge
    const glowOpacity = resolvedTheme.dotGlowOpacity

    for (let f = 0; f < totalFrames; f++) {
      const progress = f / totalFrames
      let dotsMarkup = ''

      for (const geo of geometries) {
        for (let d = 0; d < dotsPerEdge; d++) {
          const t = (progress + geo.phase + d * spacing) % 1
          const pt = geo.getPoint(t)
          const x = pt.x + geo.offsetX
          const y = pt.y + geo.offsetY

          dotsMarkup +=
            `<circle cx="${x}" cy="${y}" r="${dotRadius * 2.5}" fill="${geo.glowColor}" opacity="${glowOpacity}"/>` +
            `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="${geo.color}" opacity="0.95"/>`
        }
      }

      dotGroup.innerHTML = dotsMarkup
      const frame = await renderSvgToImageData(svgEl, outWidth, outHeight, background)
      frames.push(frame)
    }

    dotGroup.remove()

    return encodeGif(frames, { delay })
  } finally {
    container.remove()
  }
}
