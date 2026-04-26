import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { hexToGlow, colorizeEdge, styleNodes } from '../src/dots.js'
import { darkTheme } from '../src/themes.js'
import type { GraphElement, GraphModel } from '../src/types.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const document = dom.window.document

function makeSvg(): SVGSVGElement {
  const container = document.createElement('div')
  container.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  return container.querySelector('svg') as unknown as SVGSVGElement
}

function makeElement(overrides: Partial<GraphElement>): GraphElement {
  return {
    el: document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGElement,
    category: 'node',
    id: 'test',
    label: '',
    x: 0,
    y: 0,
    width: 50,
    height: 30,
    connections: { incoming: [], outgoing: [] },
    ...overrides
  }
}

function makeModel(overrides: Partial<GraphModel>): GraphModel {
  return {
    elements: [],
    nodes: [],
    edges: [],
    clusters: [],
    labels: [],
    svgElement: makeSvg(),
    ...overrides
  }
}

describe('hexToGlow', () => {
  it('lightens a dark color', () => {
    const result = hexToGlow('#000000')
    assert.equal(result, '#666666')
  })

  it('lightens pure red', () => {
    const result = hexToGlow('#ff0000')
    assert.equal(result, '#ff6666')
  })

  it('keeps white as white', () => {
    const result = hexToGlow('#ffffff')
    assert.equal(result, '#ffffff')
  })

  it('handles a mid-range color', () => {
    const result = hexToGlow('#06b6d4')
    assert.equal(typeof result, 'string')
    assert.ok(result.startsWith('#'))
    assert.equal(result.length, 7)
  })

  it('normalizes short hex (#fff) to full form', () => {
    const result = hexToGlow('#fff')
    assert.equal(result, '#ffffff')
  })

  it('normalizes short hex (#000)', () => {
    const result = hexToGlow('#000')
    assert.equal(result, '#666666')
  })

  it('returns input unchanged for invalid hex', () => {
    assert.equal(hexToGlow('rgb(255,0,0)'), 'rgb(255,0,0)')
    assert.equal(hexToGlow('red'), 'red')
    assert.equal(hexToGlow(''), '')
  })
})

describe('colorizeEdge', () => {
  it('sets stroke on child path elements', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    g.appendChild(path)
    const edge = makeElement({ el: g as unknown as SVGElement, category: 'edge' })
    colorizeEdge(edge, '#ff0000')
    const stroke = (path as unknown as SVGElement).style.stroke
    assert.ok(stroke === '#ff0000' || stroke === 'rgb(255, 0, 0)')
  })

  it('sets stroke on child line elements', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    g.appendChild(line)
    const edge = makeElement({ el: g as unknown as SVGElement, category: 'edge' })
    colorizeEdge(edge, '#00ff00')
    const stroke = (line as unknown as SVGElement).style.stroke
    assert.ok(stroke === '#00ff00' || stroke === 'rgb(0, 255, 0)')
  })

  it('sets stroke directly when el is a path', () => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const edge = makeElement({ el: path as unknown as SVGElement, category: 'edge' })
    colorizeEdge(edge, '#0000ff')
    const stroke = path.style.stroke
    assert.ok(stroke === '#0000ff' || stroke === 'rgb(0, 0, 255)')
  })
})

describe('styleNodes', () => {
  it('styles node shapes with theme colors', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    g.appendChild(rect)

    const node = makeElement({ id: 'A', el: g as unknown as SVGElement })
    const model = makeModel({ nodes: [node], elements: [node] })
    styleNodes(model, darkTheme)

    assert.equal(rect.getAttribute('rx'), '6')
    assert.equal(rect.getAttribute('ry'), '6')
    assert.ok(rect.style.stroke)
    assert.ok(rect.style.strokeWidth)
  })

  it('styles cluster rects with rounded corners', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    g.appendChild(rect)

    const cluster = makeElement({ id: 'C1', el: g as unknown as SVGElement, category: 'cluster' })
    const model = makeModel({ clusters: [cluster], elements: [cluster] })
    styleNodes(model, darkTheme)

    assert.equal(rect.getAttribute('rx'), '8')
    assert.equal(rect.getAttribute('ry'), '8')
  })

  it('cycles colors across multiple nodes', () => {
    const nodes: GraphElement[] = []
    for (let i = 0; i < 12; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      g.appendChild(rect)
      nodes.push(makeElement({ id: `N${i}`, el: g as unknown as SVGElement }))
    }
    const model = makeModel({ nodes, elements: nodes })
    styleNodes(model, darkTheme)

    const strokes = nodes.map(n => {
      const rect = n.el.querySelector('rect')
      return (rect as unknown as SVGElement)?.style.stroke
    })
    assert.equal(strokes[0], strokes[10])
  })
})
