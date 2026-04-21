import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { discoverElements } from '../src/discovery.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const document = dom.window.document

function createSvg(content: string): SVGSVGElement {
  const container = document.createElement('div')
  container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`
  return container.querySelector('svg') as unknown as SVGSVGElement
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
    assert.equal(model.nodes.length, 1)
    assert.equal(model.nodes[0].id, 'flowchart-A-0')
    assert.equal(model.nodes[0].category, 'node')
  })

  it('discovers edges by .edgePath class', () => {
    const svg = createSvg(`
      <g class="edgePath" id="L-A-B">
        <path d="M100,50 L200,50"/>
      </g>
    `)
    const model = discoverElements(svg)
    assert.equal(model.edges.length, 1)
    assert.equal(model.edges[0].category, 'edge')
  })

  it('discovers clusters by .cluster class', () => {
    const svg = createSvg(`
      <g class="cluster" id="subGraph0" transform="translate(150,100)">
        <rect width="200" height="150"/>
      </g>
    `)
    const model = discoverElements(svg)
    assert.equal(model.clusters.length, 1)
    assert.equal(model.clusters[0].category, 'cluster')
  })

  it('discovers labels by .edgeLabel class', () => {
    const svg = createSvg(`
      <g class="edgeLabel" transform="translate(150,75)">
        <g class="label"><foreignObject><div>yes</div></foreignObject></g>
      </g>
    `)
    const model = discoverElements(svg)
    assert.equal(model.labels.length, 1)
    assert.equal(model.labels[0].category, 'label')
  })

  it('populates elements array with all discovered items', () => {
    const svg = createSvg(`
      <g class="node" id="A" transform="translate(50,50)"><rect width="40" height="30"/></g>
      <g class="node" id="B" transform="translate(150,50)"><rect width="40" height="30"/></g>
      <g class="edgePath" id="L-A-B"><path d="M50,50 L150,50"/></g>
    `)
    const model = discoverElements(svg)
    assert.equal(model.elements.length, 3)
    assert.equal(model.nodes.length, 2)
    assert.equal(model.edges.length, 1)
  })

  it('discovers edges by data-edge attribute (Mermaid v11)', () => {
    const svg = createSvg(`
      <path class="flowchart-link" data-edge="true" data-id="L_A_B_0" d="M100,50 L200,50"/>
    `)
    const model = discoverElements(svg)
    assert.equal(model.edges.length, 1)
    assert.equal(model.edges[0].category, 'edge')
  })

  it('discovers sequence diagram messages by data-et attribute', () => {
    const svg = createSvg(`
      <line class="messageLine0" data-et="message" data-id="i0" data-from="Alice" data-to="Bob"/>
    `)
    const model = discoverElements(svg)
    assert.equal(model.edges.length, 1)
  })

  it('returns empty arrays when SVG has no Mermaid elements', () => {
    const svg = createSvg('<rect width="100" height="100"/>')
    const model = discoverElements(svg)
    assert.equal(model.elements.length, 0)
  })
})
