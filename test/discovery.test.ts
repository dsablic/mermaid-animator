import { describe, it, expect } from 'vitest'
import { discoverElements } from '../src/discovery.js'

function createSvg(content: string): SVGSVGElement {
  const container = document.createElement('div')
  container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`
  return container.querySelector('svg') as SVGSVGElement
}

describe('discoverElements', () => {
  it('discovers nodes by .node class', () => {
    const svg = createSvg(`
      <g class="node" id="flowchart-A-0" transform="translate(100,50)">
        <rect width="80" height="40"/>
        <g class="label"><foreignObject><div>Start</div></foreignObject></g>
      </g>
    `)
    const model = discoverElements(svg)
    expect(model.nodes).toHaveLength(1)
    expect(model.nodes[0].id).toBe('flowchart-A-0')
    expect(model.nodes[0].category).toBe('node')
  })

  it('discovers edges by .edgePath class', () => {
    const svg = createSvg(`
      <g class="edgePath" id="L-A-B">
        <path d="M100,50 L200,50"/>
      </g>
    `)
    const model = discoverElements(svg)
    expect(model.edges).toHaveLength(1)
    expect(model.edges[0].category).toBe('edge')
  })

  it('discovers clusters by .cluster class', () => {
    const svg = createSvg(`
      <g class="cluster" id="subGraph0" transform="translate(150,100)">
        <rect width="200" height="150"/>
      </g>
    `)
    const model = discoverElements(svg)
    expect(model.clusters).toHaveLength(1)
    expect(model.clusters[0].category).toBe('cluster')
  })

  it('discovers labels by .edgeLabel class', () => {
    const svg = createSvg(`
      <g class="edgeLabel" transform="translate(150,75)">
        <g class="label"><foreignObject><div>yes</div></foreignObject></g>
      </g>
    `)
    const model = discoverElements(svg)
    expect(model.labels).toHaveLength(1)
    expect(model.labels[0].category).toBe('label')
  })

  it('populates elements array with all discovered items', () => {
    const svg = createSvg(`
      <g class="node" id="A" transform="translate(50,50)"><rect width="40" height="30"/></g>
      <g class="node" id="B" transform="translate(150,50)"><rect width="40" height="30"/></g>
      <g class="edgePath" id="L-A-B"><path d="M50,50 L150,50"/></g>
    `)
    const model = discoverElements(svg)
    expect(model.elements).toHaveLength(3)
    expect(model.nodes).toHaveLength(2)
    expect(model.edges).toHaveLength(1)
  })

  it('returns empty arrays when SVG has no Mermaid elements', () => {
    const svg = createSvg('<rect width="100" height="100"/>')
    const model = discoverElements(svg)
    expect(model.elements).toHaveLength(0)
  })
})
