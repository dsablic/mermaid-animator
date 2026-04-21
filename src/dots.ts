import type { GraphElement, GraphModel } from './types.js'

export const EDGE_COLORS = [
  '#06b6d4',
  '#a855f7',
  '#f472b6',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#60a5fa',
  '#f87171',
  '#c084fc',
  '#2dd4bf',
]

export interface EdgeGeometry {
  edge: GraphElement
  getPoint(t: number): { x: number; y: number }
  offsetX: number
  offsetY: number
  phase: number
  color: string
  glowColor: string
}

function resolveTransform(el: Element): { tx: number; ty: number } {
  let tx = 0
  let ty = 0
  let current: Element | null = el
  while (current && current instanceof SVGElement && current.tagName !== 'svg') {
    const transform = current.getAttribute('transform')
    if (transform) {
      const m = transform.match(/translate\(\s*([\d.-]+)[,\s]+([\d.-]+)\s*\)/)
      if (m) {
        tx += parseFloat(m[1])
        ty += parseFloat(m[2])
      }
    }
    current = current.parentElement
  }
  return { tx, ty }
}

export function hexToGlow(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lighten = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.4))
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
}

export function colorizeEdge(edge: GraphElement, color: string): void {
  const paths = edge.el.querySelectorAll?.('path') ?? []
  const lines = edge.el.querySelectorAll?.('line') ?? []

  if (edge.el.tagName === 'path' || edge.el.tagName === 'line') {
    edge.el.style.stroke = color
  }

  for (const p of paths) {
    (p as SVGElement).style.stroke = color
  }
  for (const l of lines) {
    (l as SVGElement).style.stroke = color
  }
}

export function collectEdgeGeometries(model: GraphModel, colors: string[] = EDGE_COLORS): EdgeGeometry[] {
  const geometries: EdgeGeometry[] = []
  let index = 0

  for (const edge of model.edges) {
    const pathEl = edge.el.querySelector?.('path') ??
      (edge.el.tagName === 'path' ? edge.el as unknown as SVGPathElement : null)
    const lineEl = edge.el.tagName === 'line'
      ? edge.el as unknown as SVGLineElement
      : edge.el.querySelector?.('line')

    const target = pathEl ?? lineEl
    if (!target) continue

    const color = colors[index % colors.length]
    colorizeEdge(edge, color)

    const { tx, ty } = resolveTransform(target)
    const markerStart = target.getAttribute('marker-start')
    const markerEnd = target.getAttribute('marker-end')
    const reversed = !!markerStart && !markerEnd

    if (pathEl) {
      geometries.push({
        edge,
        getPoint(t: number) {
          const tt = reversed ? 1 - t : t
          const length = pathEl.getTotalLength()
          const pt = pathEl.getPointAtLength(tt * length)
          return { x: pt.x, y: pt.y }
        },
        offsetX: tx,
        offsetY: ty,
        phase: index * 0.15,
        color,
        glowColor: hexToGlow(color)
      })
    } else if (lineEl) {
      const x1 = parseFloat(lineEl.getAttribute('x1') ?? '0')
      const y1 = parseFloat(lineEl.getAttribute('y1') ?? '0')
      const x2 = parseFloat(lineEl.getAttribute('x2') ?? '0')
      const y2 = parseFloat(lineEl.getAttribute('y2') ?? '0')
      geometries.push({
        edge,
        getPoint(t: number) {
          const tt = reversed ? 1 - t : t
          return { x: x1 + (x2 - x1) * tt, y: y1 + (y2 - y1) * tt }
        },
        offsetX: tx,
        offsetY: ty,
        phase: index * 0.15,
        color,
        glowColor: hexToGlow(color)
      })
    }

    index++
  }

  return geometries
}
