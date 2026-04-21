import type { GraphElement } from './types.js'

export function spatialOrder(elements: GraphElement[]): GraphElement[] {
  return [...elements].sort((a, b) => {
    const rowSize = 50
    const rowA = Math.floor(a.y / rowSize)
    const rowB = Math.floor(b.y / rowSize)
    if (rowA !== rowB) return rowA - rowB
    return a.x - b.x
  })
}

export function topologicalOrder(elements: GraphElement[]): GraphElement[] {
  const hasConnections = elements.some(
    e => e.connections.incoming.length > 0 || e.connections.outgoing.length > 0
  )

  if (!hasConnections) return spatialOrder(elements)

  const byId = new Map(elements.map(e => [e.id, e]))
  const inDegree = new Map(elements.map(e => [e.id, 0]))

  for (const el of elements) {
    for (const dep of el.connections.incoming) {
      if (byId.has(dep)) {
        inDegree.set(el.id, (inDegree.get(el.id) ?? 0) + 1)
      }
    }
  }

  const queue: GraphElement[] = []
  for (const el of elements) {
    if (inDegree.get(el.id) === 0) queue.push(el)
  }

  const result: GraphElement[] = []
  while (queue.length > 0) {
    const el = queue.shift()!
    result.push(el)
    for (const outId of el.connections.outgoing) {
      const target = byId.get(outId)
      if (!target) continue
      const newDeg = (inDegree.get(outId) ?? 1) - 1
      inDegree.set(outId, newDeg)
      if (newDeg === 0) queue.push(target)
    }
  }

  for (const el of elements) {
    if (!result.includes(el)) result.push(el)
  }

  return result
}

export function groupByLevel(elements: GraphElement[]): GraphElement[][] {
  const hasConnections = elements.some(
    e => e.connections.incoming.length > 0 || e.connections.outgoing.length > 0
  )

  if (!hasConnections) return [spatialOrder(elements)]

  const byId = new Map(elements.map(e => [e.id, e]))
  const depth = new Map<string, number>()

  function getDepth(id: string, visited: Set<string>): number {
    if (depth.has(id)) return depth.get(id)!
    if (visited.has(id)) return 0
    visited.add(id)

    const el = byId.get(id)
    if (!el || el.connections.incoming.length === 0) {
      depth.set(id, 0)
      return 0
    }

    let maxParentDepth = 0
    for (const parentId of el.connections.incoming) {
      if (byId.has(parentId)) {
        maxParentDepth = Math.max(maxParentDepth, getDepth(parentId, visited) + 1)
      }
    }

    depth.set(id, maxParentDepth)
    return maxParentDepth
  }

  for (const el of elements) {
    getDepth(el.id, new Set())
  }

  const maxDepth = Math.max(...[...depth.values()], 0)
  const groups: GraphElement[][] = []

  for (let d = 0; d <= maxDepth; d++) {
    const group = elements.filter(e => (depth.get(e.id) ?? 0) === d)
    if (group.length > 0) groups.push(spatialOrder(group))
  }

  return groups
}
