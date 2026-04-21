import type { GraphElement, GraphModel, ElementCategory } from './types.js'

const CATEGORY_SELECTORS: [ElementCategory, string[]][] = [
  ['cluster', ['.cluster', '.section']],
  ['node', ['.node', '.state', '.entity', '.task', '.actor', '[data-et="participant"]']],
  ['edge', ['.edgePath', '[data-edge="true"]', '[data-et="edge"]', '[data-et="message"]', '.messageLine0', '.messageLine1', '.flowchart-link', '.relation', '.transition', '.relationshipLine']],
  ['label', ['.edgeLabel', '.noteText']]
]

function extractLabel(el: SVGElement): string {
  const textEl = el.querySelector('text, foreignObject div, .label')
  return textEl?.textContent?.trim() ?? ''
}

function extractPosition(el: SVGElement): { x: number; y: number; width: number; height: number } {
  const transform = el.getAttribute('transform')
  let x = 0
  let y = 0

  if (transform) {
    const match = transform.match(/translate\(\s*([\d.-]+)[,\s]+([\d.-]+)\s*\)/)
    if (match) {
      x = parseFloat(match[1])
      y = parseFloat(match[2])
    }
  }

  const rect = el.querySelector('rect, circle, ellipse, polygon, path')
  let width = 0
  let height = 0

  if (rect) {
    width = parseFloat(rect.getAttribute('width') ?? '0')
    height = parseFloat(rect.getAttribute('height') ?? '0')
  }

  return { x, y, width, height }
}

function extractDataId(el: SVGElement): string {
  return el.getAttribute('data-id') ?? ''
}

export function discoverElements(svg: SVGSVGElement): GraphModel {
  const nodes: GraphElement[] = []
  const edges: GraphElement[] = []
  const clusters: GraphElement[] = []
  const labels: GraphElement[] = []
  const elements: GraphElement[] = []
  const seen = new Set<SVGElement>()

  for (const [category, selectors] of CATEGORY_SELECTORS) {
    const selector = selectors.join(', ')
    const matched = svg.querySelectorAll<SVGElement>(selector)

    for (const el of matched) {
      if (seen.has(el)) continue
      seen.add(el)

      const pos = extractPosition(el)
      const dataId = extractDataId(el)
      const graphEl: GraphElement = {
        el,
        category,
        id: el.id || dataId || `${category}-${elements.length}`,
        label: extractLabel(el),
        ...pos,
        connections: { incoming: [], outgoing: [] }
      }

      elements.push(graphEl)
      switch (category) {
        case 'cluster': clusters.push(graphEl); break
        case 'node': nodes.push(graphEl); break
        case 'edge': edges.push(graphEl); break
        case 'label': labels.push(graphEl); break
      }
    }
  }

  return { elements, nodes, edges, clusters, labels, svgElement: svg }
}
