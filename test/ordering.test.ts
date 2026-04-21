import { describe, it, expect } from 'vitest'
import { spatialOrder, topologicalOrder, groupByLevel } from '../src/ordering.js'
import type { GraphElement } from '../src/types.js'

function makeElement(overrides: Partial<GraphElement>): GraphElement {
  return {
    el: document.createElementNS('http://www.w3.org/2000/svg', 'g'),
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

describe('spatialOrder', () => {
  it('sorts elements top-to-bottom then left-to-right', () => {
    const a = makeElement({ id: 'a', x: 200, y: 0 })
    const b = makeElement({ id: 'b', x: 0, y: 100 })
    const c = makeElement({ id: 'c', x: 0, y: 0 })
    const result = spatialOrder([a, b, c])
    expect(result.map(e => e.id)).toEqual(['c', 'a', 'b'])
  })

  it('returns empty array for empty input', () => {
    expect(spatialOrder([])).toEqual([])
  })
})

describe('topologicalOrder', () => {
  it('orders nodes by dependency chain', () => {
    const a = makeElement({ id: 'A', connections: { incoming: [], outgoing: ['B'] } })
    const b = makeElement({ id: 'B', connections: { incoming: ['A'], outgoing: ['C'] } })
    const c = makeElement({ id: 'C', connections: { incoming: ['B'], outgoing: [] } })
    const result = topologicalOrder([c, a, b])
    expect(result.map(e => e.id)).toEqual(['A', 'B', 'C'])
  })

  it('falls back to spatial order when no connections exist', () => {
    const a = makeElement({ id: 'a', x: 100, y: 0 })
    const b = makeElement({ id: 'b', x: 0, y: 0 })
    const result = topologicalOrder([a, b])
    expect(result.map(e => e.id)).toEqual(['b', 'a'])
  })
})

describe('groupByLevel', () => {
  it('groups nodes by topological depth', () => {
    const a = makeElement({ id: 'A', connections: { incoming: [], outgoing: ['B', 'C'] } })
    const b = makeElement({ id: 'B', connections: { incoming: ['A'], outgoing: ['D'] } })
    const c = makeElement({ id: 'C', connections: { incoming: ['A'], outgoing: ['D'] } })
    const d = makeElement({ id: 'D', connections: { incoming: ['B', 'C'], outgoing: [] } })
    const groups = groupByLevel([a, b, c, d])
    expect(groups).toHaveLength(3)
    expect(groups[0].map(e => e.id)).toEqual(['A'])
    expect(groups[1].map(e => e.id).sort()).toEqual(['B', 'C'])
    expect(groups[2].map(e => e.id)).toEqual(['D'])
  })

  it('returns single group when no connections', () => {
    const a = makeElement({ id: 'a', x: 0, y: 0 })
    const b = makeElement({ id: 'b', x: 100, y: 0 })
    const groups = groupByLevel([a, b])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(2)
  })
})
