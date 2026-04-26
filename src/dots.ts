import type { GraphElement, GraphModel } from './types.js'
import type { Theme } from './themes.js'
import { darkTheme } from './themes.js'

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

function normalizeHex(hex: string): string {
  if (hex.length === 4 && hex[0] === '#') {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

export function hexToGlow(hex: string): string {
  const h = normalizeHex(hex)
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  const lighten = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.4))
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
}

function hexToMuted(hex: string): string {
  const h = normalizeHex(hex)
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  const mute = (v: number) => Math.round(v * 0.3)
  return `#${mute(r).toString(16).padStart(2, '0')}${mute(g).toString(16).padStart(2, '0')}${mute(b).toString(16).padStart(2, '0')}`
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

export function styleNodes(model: GraphModel, theme: Theme = darkTheme): void {
  const colors = theme.edgeColors

  for (const cluster of model.clusters) {
    const rect = cluster.el.querySelector('rect')
    if (rect) {
      rect.setAttribute('rx', '8')
      rect.setAttribute('ry', '8')
      rect.style.stroke = theme.nodeBorderDefault
      rect.style.strokeOpacity = String(theme.clusterBorderOpacity)
      rect.style.strokeWidth = String(theme.clusterStrokeWidth)
      rect.style.fill = hexToMuted(theme.nodeBorderDefault)
      rect.style.fillOpacity = String(theme.clusterFillOpacity)
    }
  }

  for (let i = 0; i < model.nodes.length; i++) {
    const node = model.nodes[i]
    const nodeColor = colors[i % colors.length]

    const shapes = node.el.querySelectorAll('rect, circle, ellipse, polygon')
    for (const shape of shapes) {
      const s = shape as SVGElement
      if (shape.tagName === 'rect') {
        shape.setAttribute('rx', '6')
        shape.setAttribute('ry', '6')
      }
      s.style.stroke = nodeColor
      s.style.strokeWidth = String(theme.nodeStrokeWidth)
      s.style.fill = hexToMuted(nodeColor)
      s.style.fillOpacity = String(theme.nodeFillOpacity)
    }
  }
}

export function collectEdgeGeometries(model: GraphModel, theme: Theme = darkTheme): EdgeGeometry[] {
  const geometries: EdgeGeometry[] = []
  const colors = theme.edgeColors
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
