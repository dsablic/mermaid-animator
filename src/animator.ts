import type { GraphElement, GraphModel, MermaidAnimatorOptions } from './types.js'
import type { Theme } from './themes.js'
import { topologicalOrder, groupByLevel } from './ordering.js'
import { collectEdgeGeometries, styleNodes } from './dots.js'

export interface AnimationSequence {
  play(): Promise<void>
  cancel(): void
  groups: GraphElement[][]
}

export function buildSequence(model: GraphModel, options: MermaidAnimatorOptions, theme: Theme): AnimationSequence {
  const ordered = topologicalOrder(model.nodes)
  const groups = groupByLevel(ordered)

  let cancelled = false
  let frame = 0
  let dotGroup: SVGGElement | null = null

  async function play(): Promise<void> {
    cancelled = false
    frame = 0

    const svgEl = model.svgElement
    styleNodes(model, theme)
    const geometries = collectEdgeGeometries(model, theme)

    if (dotGroup) dotGroup.remove()
    dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    dotGroup.setAttribute('id', 'ma-dots')
    svgEl.appendChild(dotGroup)

    const dotsPerEdge = 3
    const dotRadius = 3
    const spacing = 1 / dotsPerEdge
    const glowOpacity = theme.dotGlowOpacity
    const group = dotGroup

    return new Promise<void>((resolve) => {
      function tick() {
        if (cancelled) {
          group.remove()
          resolve()
          return
        }

        frame++
        const progress = (frame * 0.008) % 1
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

        group.innerHTML = markup
        requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    })
  }

  function cancel(): void {
    cancelled = true
  }

  return { play, cancel, groups }
}
