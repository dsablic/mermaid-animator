import type { GraphModel, MermaidAnimatorOptions } from './types.js'
import type { Theme } from './themes.js'
import { collectEdgeGeometries, styleNodes } from './dots.js'

export interface AnimationSequence {
  play(): Promise<void>
  cancel(): void
}

const SVG_NS = 'http://www.w3.org/2000/svg'

export function buildSequence(model: GraphModel, options: MermaidAnimatorOptions, theme: Theme): AnimationSequence {
  let cancelled = false
  let frame = 0
  let dotGroup: SVGGElement | null = null
  let onVisibilityChange: (() => void) | null = null

  async function play(): Promise<void> {
    cancelled = false
    frame = 0

    const svgEl = model.svgElement
    styleNodes(model, theme)
    const geometries = collectEdgeGeometries(model, theme)

    if (dotGroup) dotGroup.remove()
    dotGroup = document.createElementNS(SVG_NS, 'g')
    dotGroup.setAttribute('id', 'ma-dots')
    svgEl.appendChild(dotGroup)

    const { dotsPerEdge, dotRadius, dotSpeed } = options
    const spacing = 1 / dotsPerEdge
    const glowOpacity = theme.dotGlowOpacity
    const group = dotGroup

    const totalDots = geometries.length * dotsPerEdge
    const circles: { glow: SVGCircleElement; core: SVGCircleElement }[] = []
    for (let i = 0; i < totalDots; i++) {
      const glow = document.createElementNS(SVG_NS, 'circle')
      const core = document.createElementNS(SVG_NS, 'circle')

      const geoIndex = Math.floor(i / dotsPerEdge)
      const geo = geometries[geoIndex]

      glow.setAttribute('r', String(dotRadius * 2.5))
      glow.setAttribute('fill', geo.glowColor)
      glow.setAttribute('opacity', String(glowOpacity))

      core.setAttribute('r', String(dotRadius))
      core.setAttribute('fill', geo.color)
      core.setAttribute('opacity', '0.95')

      group.appendChild(glow)
      group.appendChild(core)
      circles.push({ glow, core })
    }

    return new Promise<void>((resolve) => {
      let hidden = false

      function tick() {
        if (cancelled) {
          group.remove()
          resolve()
          return
        }

        if (hidden) return

        frame++
        if (frame * dotSpeed >= 1) frame = 0
        const progress = (frame * dotSpeed) % 1

        for (let geoIdx = 0; geoIdx < geometries.length; geoIdx++) {
          const geo = geometries[geoIdx]
          for (let d = 0; d < dotsPerEdge; d++) {
            const t = (progress + geo.phase + d * spacing) % 1
            const pt = geo.getPoint(t)
            const x = String(pt.x + geo.offsetX)
            const y = String(pt.y + geo.offsetY)

            const pair = circles[geoIdx * dotsPerEdge + d]
            pair.glow.setAttribute('cx', x)
            pair.glow.setAttribute('cy', y)
            pair.core.setAttribute('cx', x)
            pair.core.setAttribute('cy', y)
          }
        }

        requestAnimationFrame(tick)
      }

      onVisibilityChange = () => {
        hidden = document.hidden
        if (!hidden && !cancelled) requestAnimationFrame(tick)
      }
      document.addEventListener('visibilitychange', onVisibilityChange)

      requestAnimationFrame(tick)
    })
  }

  function cancel(): void {
    cancelled = true
    if (onVisibilityChange) {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      onVisibilityChange = null
    }
  }

  return { play, cancel }
}
