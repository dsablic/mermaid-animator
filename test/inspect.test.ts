import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { InspectHandler } from '../src/inspect.js'
import { EventEmitter } from '../src/events.js'
import type { GraphElement, GraphModel, AnimatorEvents } from '../src/types.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const document = dom.window.document
globalThis.document = document as unknown as Document

function makeSvg(): SVGSVGElement {
  const container = document.createElement('div')
  container.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  return container.querySelector('svg') as unknown as SVGSVGElement
}

function makeNode(id: string, connections = { incoming: [] as string[], outgoing: [] as string[] }): GraphElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGElement
  Object.defineProperty(g, 'getBoundingClientRect', {
    value: () => ({ left: 10, top: 10, width: 50, height: 30, right: 60, bottom: 40 })
  })
  return {
    el: g,
    category: 'node',
    id,
    label: `Label ${id}`,
    x: 10,
    y: 10,
    width: 50,
    height: 30,
    connections
  }
}

function makeModel(nodes: GraphElement[]): GraphModel {
  return {
    elements: [...nodes],
    nodes,
    edges: [],
    clusters: [],
    labels: [],
    svgElement: makeSvg()
  }
}

function makeContainer(): HTMLElement {
  const div = document.createElement('div') as unknown as HTMLElement
  Object.defineProperty(div, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 })
  })
  return div
}

describe('InspectHandler', () => {
  it('constructs and sets cursor on nodes', () => {
    const nodeA = makeNode('A')
    const model = makeModel([nodeA])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)
    assert.equal(nodeA.el.style.cursor, 'pointer')
    handler.destroy()
  })

  it('inspectNode emits nodeClick event', () => {
    const nodeA = makeNode('A')
    const model = makeModel([nodeA])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    let clicked: GraphElement | null = null
    emitter.on('nodeClick', (node) => { clicked = node })

    handler.inspectNode(nodeA)
    assert.equal(clicked, nodeA)
    handler.destroy()
  })

  it('inspectNode creates a popover element', () => {
    const nodeA = makeNode('A')
    const model = makeModel([nodeA])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    handler.inspectNode(nodeA)
    const popover = (container as unknown as Element).querySelector('.ma-popover')
    assert.ok(popover)
    handler.destroy()
  })

  it('popover shows node id', () => {
    const nodeA = makeNode('A')
    const model = makeModel([nodeA])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    handler.inspectNode(nodeA)
    const idEl = (container as unknown as Element).querySelector('.ma-popover-id')
    assert.ok(idEl)
    assert.equal(idEl!.textContent, 'A')
    handler.destroy()
  })

  it('popover shows connections', () => {
    const nodeA = makeNode('A', { incoming: [], outgoing: ['B'] })
    const nodeB = makeNode('B', { incoming: ['A'], outgoing: [] })
    const model = makeModel([nodeA, nodeB])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    handler.inspectNode(nodeA)
    const connEl = (container as unknown as Element).querySelector('.ma-popover-connections')
    assert.ok(connEl)
    assert.ok(connEl!.textContent!.includes('B'))
    handler.destroy()
  })

  it('dismiss removes popover and clears highlight', () => {
    const nodeA = makeNode('A')
    const model = makeModel([nodeA])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    handler.inspectNode(nodeA)
    assert.ok((container as unknown as Element).querySelector('.ma-popover'))

    handler.dismiss()
    assert.equal((container as unknown as Element).querySelector('.ma-popover'), null)
    handler.destroy()
  })

  it('inspectNode highlights connected nodes and dims others', () => {
    const nodeA = makeNode('A', { incoming: [], outgoing: ['B'] })
    const nodeB = makeNode('B', { incoming: ['A'], outgoing: [] })
    const nodeC = makeNode('C')
    const model = makeModel([nodeA, nodeB, nodeC])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    handler.inspectNode(nodeA)
    assert.ok(nodeA.el.classList.contains('ma-highlighted'))
    assert.ok(nodeB.el.classList.contains('ma-highlighted'))
    assert.ok(nodeC.el.classList.contains('ma-dimmed'))
    handler.destroy()
  })

  it('destroy removes popover and cleans up listeners', () => {
    const nodeA = makeNode('A')
    const model = makeModel([nodeA])
    const container = makeContainer()
    const emitter = new EventEmitter<AnimatorEvents>()
    const handler = new InspectHandler(container, model, emitter)

    handler.inspectNode(nodeA)
    handler.destroy()
    assert.equal((container as unknown as Element).querySelector('.ma-popover'), null)
  })
})
