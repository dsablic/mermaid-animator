# Mermaid Animator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `mermaid-animator`, a TypeScript library that renders Mermaid diagrams as animated, interactive SVGs with pan/zoom and click-to-inspect.

**Architecture:** Single npm package. Mermaid renders the SVG, then we parse the SVG elements by CSS class, compute animation order (topological or spatial), and animate them in sequence using the Web Animations API. Pan/zoom via viewBox manipulation, inspect via DOM highlighting + popover. A demo `index.html` wraps the library in a split-pane editor.

**Tech Stack:** TypeScript, Mermaid.js, Web Animations API, esbuild, vitest + jsdom for tests.

---

## Project Structure

```
mermaid-animator/
  src/
    index.ts            # MermaidAnimator class + public exports
    types.ts            # All interfaces and type definitions
    events.ts           # Typed EventEmitter
    discovery.ts        # Parse Mermaid SVG into graph model
    ordering.ts         # Topological + spatial ordering
    animator.ts         # Animation sequencer
    pan-zoom.ts         # Pan/zoom handler
    inspect.ts          # Click-to-inspect + popover
    keyboard.ts         # Keyboard shortcuts
    styles.ts           # Injected CSS for .ma-highlighted, .ma-dimmed, etc.
  test/
    events.test.ts
    discovery.test.ts
    ordering.test.ts
  demo/
    index.html
  package.json
  tsconfig.json
  .gitignore
  .npmrc
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `src/` directory
- Create: `test/` directory
- Create: `demo/` directory

**Step 1: Initialize git repo**

```bash
cd /Users/denis/Documents/labtiva/experiment/fanfa
git init
```

**Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
*.tgz
```

**Step 3: Create `.npmrc`**

```
ignore-scripts=true
save-exact=true
save-prefix=
```

**Step 4: Create `package.json`**

```json
{
  "name": "mermaid-animator",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/mermaid-animator.js",
  "exports": {
    ".": "./dist/mermaid-animator.js"
  },
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "esbuild src/index.ts --bundle --format=esm --outfile=dist/mermaid-animator.js --external:mermaid",
    "build:umd": "esbuild src/index.ts --bundle --format=iife --global-name=MermaidAnimator --outfile=dist/mermaid-animator.umd.js --external:mermaid",
    "build:all": "npm run build && npm run build:umd && tsc --emitDeclarationOnly",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "npx serve ."
  },
  "peerDependencies": {
    "mermaid": ">=10.0.0"
  },
  "devDependencies": {}
}
```

**Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "declaration": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["es2022", "dom", "dom.iterable"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test", "demo"]
}
```

**Step 6: Install dependencies**

```bash
npm install --save-dev typescript esbuild mermaid vitest jsdom @types/jsdom
```

**Step 7: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts']
  }
})
```

**Step 8: Create placeholder files**

```bash
mkdir -p src test demo
touch src/index.ts src/types.ts
```

**Step 9: Verify setup compiles**

```bash
npx tsc --noEmit
```
Expected: no errors (empty files).

**Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with TypeScript, esbuild, vitest"
```

---

### Task 2: Types

**Files:**
- Create: `src/types.ts`

**Step 1: Write type definitions**

```ts
export type AnimationMode = 'auto' | 'stepped'

export interface MermaidAnimatorOptions {
  mode: AnimationMode
  stagger: number
  duration: number
  easing: string
  pan: boolean
  zoom: boolean
  inspect: boolean
  minZoom: number
  maxZoom: number
  mermaid: Record<string, unknown>
}

export type PartialOptions = Partial<MermaidAnimatorOptions>

export const DEFAULT_OPTIONS: MermaidAnimatorOptions = {
  mode: 'auto',
  stagger: 80,
  duration: 300,
  easing: 'ease-out',
  pan: true,
  zoom: true,
  inspect: true,
  minZoom: 0.1,
  maxZoom: 5,
  mermaid: { theme: 'default' }
}

export type ElementCategory = 'cluster' | 'node' | 'edge' | 'label'

export interface GraphElement {
  el: SVGElement
  category: ElementCategory
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  connections: { incoming: string[]; outgoing: string[] }
}

export interface GraphModel {
  elements: GraphElement[]
  nodes: GraphElement[]
  edges: GraphElement[]
  clusters: GraphElement[]
  labels: GraphElement[]
  svgElement: SVGSVGElement
}

export interface AnimatorEvents {
  animationStart: []
  animationEnd: []
  nodeClick: [node: GraphElement]
  step: [index: number, total: number]
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add type definitions and default options"
```

---

### Task 3: Event Emitter

**Files:**
- Create: `src/events.ts`
- Create: `test/events.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../src/events.js'

describe('EventEmitter', () => {
  it('calls registered listener when event is emitted', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = vi.fn()
    emitter.on('ping', listener)
    emitter.emit('ping', 'hello')
    expect(listener).toHaveBeenCalledWith('hello')
  })

  it('supports multiple listeners on same event', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('ping', a)
    emitter.on('ping', b)
    emitter.emit('ping', 'hello')
    expect(a).toHaveBeenCalledWith('hello')
    expect(b).toHaveBeenCalledWith('hello')
  })

  it('removes listener with off()', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = vi.fn()
    emitter.on('ping', listener)
    emitter.off('ping', listener)
    emitter.emit('ping', 'hello')
    expect(listener).not.toHaveBeenCalled()
  })

  it('removeAll clears all listeners', () => {
    const emitter = new EventEmitter<{ ping: []; pong: [] }>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('ping', a)
    emitter.on('pong', b)
    emitter.removeAll()
    emitter.emit('ping')
    emitter.emit('pong')
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('does not throw when emitting event with no listeners', () => {
    const emitter = new EventEmitter<{ ping: [] }>()
    expect(() => emitter.emit('ping')).not.toThrow()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run test/events.test.ts
```
Expected: FAIL (module not found)

**Step 3: Implement EventEmitter**

```ts
type Listener<T extends unknown[]> = (...args: T) => void

export class EventEmitter<Events extends Record<string, unknown[]>> {
  private listeners = new Map<keyof Events, Set<Listener<unknown[]>>>()

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as Listener<unknown[]>)
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown[]>)
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.listeners.get(event)?.forEach(listener => listener(...args))
  }

  removeAll(): void {
    this.listeners.clear()
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run test/events.test.ts
```
Expected: all PASS

**Step 5: Commit**

```bash
git add src/events.ts test/events.test.ts
git commit -m "feat: add typed EventEmitter with tests"
```

---

### Task 4: SVG Discovery

**Files:**
- Create: `src/discovery.ts`
- Create: `test/discovery.test.ts`

This module parses Mermaid's rendered SVG and extracts graph elements by CSS class. Tests use synthetic SVG strings parsed via jsdom.

**Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
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
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run test/discovery.test.ts
```

**Step 3: Implement discovery module**

```ts
import type { GraphElement, GraphModel, ElementCategory } from './types.js'

const CATEGORY_SELECTORS: [ElementCategory, string[]][] = [
  ['cluster', ['.cluster', '.section']],
  ['node', ['.node', '.state', '.entity', '.task', '.actor']],
  ['edge', ['.edgePath', '.messageLine', '.relation']],
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
      const graphEl: GraphElement = {
        el,
        category,
        id: el.id || `${category}-${elements.length}`,
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run test/discovery.test.ts
```

**Step 5: Commit**

```bash
git add src/discovery.ts test/discovery.test.ts
git commit -m "feat: add SVG discovery module with tests"
```

---

### Task 5: Ordering Algorithms

**Files:**
- Create: `src/ordering.ts`
- Create: `test/ordering.test.ts`

**Step 1: Write failing tests**

```ts
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
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run test/ordering.test.ts
```

**Step 3: Implement ordering module**

```ts
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run test/ordering.test.ts
```

**Step 5: Commit**

```bash
git add src/ordering.ts test/ordering.test.ts
git commit -m "feat: add topological and spatial ordering with tests"
```

---

### Task 6: Injected CSS Styles

**Files:**
- Create: `src/styles.ts`

**Step 1: Implement styles module**

This injects a `<style>` tag once for animation states (.ma-highlighted, .ma-dimmed, .ma-animating) and the popover.

```ts
const STYLE_ID = 'mermaid-animator-styles'

const CSS = `
.ma-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.ma-container svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ma-dimmed {
  opacity: 0.15 !important;
  transition: opacity 0.2s ease;
}

.ma-highlighted {
  opacity: 1 !important;
  transition: opacity 0.2s ease;
}

.ma-hidden {
  opacity: 0;
}

.ma-popover {
  position: absolute;
  background: #1a1a2e;
  color: #e0e0e0;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 10px 14px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  max-width: 280px;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.ma-popover-id {
  font-weight: 600;
  margin-bottom: 4px;
  color: #7c9aff;
}

.ma-popover-label {
  margin-bottom: 6px;
}

.ma-popover-connections {
  font-size: 12px;
  color: #aaa;
}
`

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/styles.ts
git commit -m "feat: add injectable CSS styles for animation states"
```

---

### Task 7: Animation Engine

**Files:**
- Create: `src/animator.ts`

This module uses the Web Animations API which is not available in jsdom, so it is verified via the demo app in Task 9.

**Step 1: Implement animation sequencer**

```ts
import type { GraphElement, GraphModel, MermaidAnimatorOptions } from './types.js'
import { topologicalOrder, groupByLevel } from './ordering.js'

export interface AnimationSequence {
  play(): Promise<void>
  cancel(): void
  groups: GraphElement[][]
}

function hideAll(model: GraphModel): void {
  for (const el of model.elements) {
    el.el.classList.add('ma-hidden')
  }
}

function animateNode(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    { duration: options.duration, easing: options.easing, fill: 'forwards' }
  )
}

function animateCluster(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    { duration: options.duration, easing: options.easing, fill: 'forwards' }
  )
}

function animateEdge(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  const path = el.el.querySelector('path')
  if (path) {
    const length = path.getTotalLength?.() ?? 300
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    return path.animate(
      [
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
      ],
      { duration: options.duration * 1.5, easing: options.easing, fill: 'forwards' }
    )
  }
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: options.duration, easing: options.easing, fill: 'forwards' }
  )
}

function animateLabel(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: options.duration * 0.8, easing: options.easing, fill: 'forwards' }
  )
}

function animateElement(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  switch (el.category) {
    case 'cluster': return animateCluster(el, options)
    case 'node': return animateNode(el, options)
    case 'edge': return animateEdge(el, options)
    case 'label': return animateLabel(el, options)
  }
}

export function buildSequence(model: GraphModel, options: MermaidAnimatorOptions): AnimationSequence {
  const ordered = topologicalOrder(model.nodes)
  const groups = groupByLevel(ordered)

  const allOrdered: GraphElement[] = [
    ...model.clusters,
    ...groups.flat(),
    ...model.edges,
    ...model.labels
  ]

  let cancelled = false
  const activeAnimations: Animation[] = []

  async function play(): Promise<void> {
    cancelled = false
    hideAll(model)

    for (let i = 0; i < allOrdered.length; i++) {
      if (cancelled) return
      const anim = animateElement(allOrdered[i], options)
      activeAnimations.push(anim)
      await new Promise<void>(resolve => {
        setTimeout(resolve, options.stagger)
      })
    }

    await Promise.all(activeAnimations.map(a => a.finished.catch(() => {})))
  }

  function cancel(): void {
    cancelled = true
    for (const anim of activeAnimations) {
      anim.cancel()
    }
    activeAnimations.length = 0
  }

  return { play, cancel, groups }
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/animator.ts
git commit -m "feat: add animation sequencer using Web Animations API"
```

---

### Task 8: Pan/Zoom Handler

**Files:**
- Create: `src/pan-zoom.ts`

Browser-verified. Uses pointer events + SVG viewBox manipulation.

**Step 1: Implement pan/zoom**

```ts
import type { MermaidAnimatorOptions } from './types.js'

export class PanZoomHandler {
  private container: HTMLElement
  private svg: SVGSVGElement
  private options: MermaidAnimatorOptions
  private viewBox: { x: number; y: number; w: number; h: number }
  private baseViewBox: { x: number; y: number; w: number; h: number }
  private isPanning = false
  private startX = 0
  private startY = 0
  private currentZoom = 1

  constructor(container: HTMLElement, svg: SVGSVGElement, options: MermaidAnimatorOptions) {
    this.container = container
    this.svg = svg
    this.options = options

    const vb = svg.viewBox.baseVal
    this.viewBox = { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
    this.baseViewBox = { ...this.viewBox }

    if (options.pan) this.attachPan()
    if (options.zoom) this.attachZoom()
  }

  private updateViewBox(): void {
    this.svg.setAttribute(
      'viewBox',
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`
    )
  }

  private attachPan(): void {
    this.container.addEventListener('pointerdown', this.onPointerDown)
    this.container.addEventListener('pointermove', this.onPointerMove)
    this.container.addEventListener('pointerup', this.onPointerUp)
    this.container.addEventListener('pointerleave', this.onPointerUp)
  }

  private attachZoom(): void {
    this.container.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    this.isPanning = true
    this.startX = e.clientX
    this.startY = e.clientY
    this.container.style.cursor = 'grabbing'
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPanning) return
    const dx = e.clientX - this.startX
    const dy = e.clientY - this.startY
    const rect = this.container.getBoundingClientRect()
    const scaleX = this.viewBox.w / rect.width
    const scaleY = this.viewBox.h / rect.height

    this.viewBox.x -= dx * scaleX
    this.viewBox.y -= dy * scaleY
    this.startX = e.clientX
    this.startY = e.clientY
    this.updateViewBox()
  }

  private onPointerUp = (): void => {
    this.isPanning = false
    this.container.style.cursor = ''
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
    const newZoom = this.currentZoom * zoomFactor

    if (newZoom < this.options.minZoom || newZoom > this.options.maxZoom) return

    const rect = this.container.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) / rect.width
    const mouseY = (e.clientY - rect.top) / rect.height

    const newW = this.viewBox.w * zoomFactor
    const newH = this.viewBox.h * zoomFactor
    this.viewBox.x += (this.viewBox.w - newW) * mouseX
    this.viewBox.y += (this.viewBox.h - newH) * mouseY
    this.viewBox.w = newW
    this.viewBox.h = newH
    this.currentZoom = newZoom
    this.updateViewBox()
  }

  zoomIn(): void {
    this.applyZoom(0.8)
  }

  zoomOut(): void {
    this.applyZoom(1.25)
  }

  private applyZoom(factor: number): void {
    const newZoom = this.currentZoom * (1 / factor)
    if (newZoom < this.options.minZoom || newZoom > this.options.maxZoom) return

    const newW = this.viewBox.w * factor
    const newH = this.viewBox.h * factor
    this.viewBox.x += (this.viewBox.w - newW) * 0.5
    this.viewBox.y += (this.viewBox.h - newH) * 0.5
    this.viewBox.w = newW
    this.viewBox.h = newH
    this.currentZoom = newZoom
    this.updateViewBox()
  }

  fitToView(): void {
    this.viewBox = { ...this.baseViewBox }
    this.currentZoom = 1
    this.updateViewBox()
  }

  destroy(): void {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointerleave', this.onPointerUp)
    this.container.removeEventListener('wheel', this.onWheel)
  }
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/pan-zoom.ts
git commit -m "feat: add pan/zoom handler with pointer events and viewBox"
```

---

### Task 9: Click-to-Inspect

**Files:**
- Create: `src/inspect.ts`

**Step 1: Implement inspect handler**

```ts
import type { GraphElement, GraphModel } from './types.js'
import type { EventEmitter } from './events.js'
import type { AnimatorEvents } from './types.js'

export class InspectHandler {
  private container: HTMLElement
  private model: GraphModel
  private emitter: EventEmitter<AnimatorEvents>
  private popover: HTMLElement | null = null
  private activeNode: GraphElement | null = null

  constructor(
    container: HTMLElement,
    model: GraphModel,
    emitter: EventEmitter<AnimatorEvents>
  ) {
    this.container = container
    this.model = model
    this.emitter = emitter
    this.attachListeners()
  }

  private attachListeners(): void {
    for (const node of this.model.nodes) {
      node.el.style.cursor = 'pointer'
      node.el.addEventListener('click', (e) => {
        e.stopPropagation()
        this.inspectNode(node)
      })
    }
    this.container.addEventListener('click', this.dismiss)
  }

  inspectNode(node: GraphElement): void {
    this.dismiss()
    this.activeNode = node
    this.emitter.emit('nodeClick', node)

    const connected = new Set<string>([node.id])
    for (const id of node.connections.outgoing) connected.add(id)
    for (const id of node.connections.incoming) connected.add(id)

    for (const el of this.model.elements) {
      if (connected.has(el.id)) {
        el.el.classList.add('ma-highlighted')
        el.el.classList.remove('ma-dimmed')
      } else {
        el.el.classList.add('ma-dimmed')
        el.el.classList.remove('ma-highlighted')
      }
    }

    for (const edge of this.model.edges) {
      const edgeId = edge.id
      const isConnected = this.isEdgeConnected(edgeId, connected)
      if (isConnected) {
        edge.el.classList.add('ma-highlighted')
        edge.el.classList.remove('ma-dimmed')
      }
    }

    this.showPopover(node)
  }

  private isEdgeConnected(edgeId: string, connectedNodes: Set<string>): boolean {
    const match = edgeId.match(/L-(.+)-(.+)/)
    if (!match) return false
    return connectedNodes.has(match[1]) || connectedNodes.has(match[2])
  }

  private showPopover(node: GraphElement): void {
    this.removePopover()

    const popover = document.createElement('div')
    popover.className = 'ma-popover'

    let html = `<div class="ma-popover-id">${node.id}</div>`
    if (node.label) {
      html += `<div class="ma-popover-label">${node.label}</div>`
    }

    const connections: string[] = []
    for (const id of node.connections.outgoing) connections.push(`-> ${id}`)
    for (const id of node.connections.incoming) connections.push(`<- ${id}`)
    if (connections.length > 0) {
      html += `<div class="ma-popover-connections">${connections.join('<br>')}</div>`
    }

    popover.innerHTML = html

    const rect = this.container.getBoundingClientRect()
    const svgRect = node.el.getBoundingClientRect()
    popover.style.left = `${svgRect.left - rect.left + svgRect.width / 2}px`
    popover.style.top = `${svgRect.top - rect.top - 10}px`
    popover.style.transform = 'translate(-50%, -100%)'

    this.container.appendChild(popover)
    this.popover = popover
  }

  private removePopover(): void {
    if (this.popover) {
      this.popover.remove()
      this.popover = null
    }
  }

  dismiss = (): void => {
    this.activeNode = null
    this.removePopover()
    for (const el of this.model.elements) {
      el.el.classList.remove('ma-highlighted', 'ma-dimmed')
    }
  }

  destroy(): void {
    this.dismiss()
    this.container.removeEventListener('click', this.dismiss)
  }
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/inspect.ts
git commit -m "feat: add click-to-inspect with highlighting and popover"
```

---

### Task 10: Keyboard Handler

**Files:**
- Create: `src/keyboard.ts`

**Step 1: Implement keyboard handler**

```ts
import type { PanZoomHandler } from './pan-zoom.js'

export interface KeyboardCallbacks {
  onNext: () => void
  onPrev: () => void
  onReplay: () => void
  onFitToView: () => void
  onDismiss: () => void
  panZoom: PanZoomHandler | null
}

export class KeyboardHandler {
  private callbacks: KeyboardCallbacks

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks
    document.addEventListener('keydown', this.onKeyDown)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'Enter':
        e.preventDefault()
        this.callbacks.onNext()
        break
      case 'ArrowLeft':
        e.preventDefault()
        this.callbacks.onPrev()
        break
      case '+':
      case '=':
        e.preventDefault()
        this.callbacks.panZoom?.zoomIn()
        break
      case '-':
        e.preventDefault()
        this.callbacks.panZoom?.zoomOut()
        break
      case '0':
        e.preventDefault()
        this.callbacks.onFitToView()
        break
      case 'Escape':
        this.callbacks.onDismiss()
        break
      case 'r':
      case 'R':
        e.preventDefault()
        this.callbacks.onReplay()
        break
    }
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown)
  }
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/keyboard.ts
git commit -m "feat: add keyboard shortcut handler"
```

---

### Task 11: MermaidAnimator Main Class

**Files:**
- Create: `src/index.ts`

This wires up all modules into the public API.

**Step 1: Implement the main class**

```ts
import mermaid from 'mermaid'
import type { PartialOptions, MermaidAnimatorOptions, GraphModel, AnimatorEvents, GraphElement } from './types.js'
import { DEFAULT_OPTIONS } from './types.js'
import { EventEmitter } from './events.js'
import { discoverElements } from './discovery.js'
import { buildSequence, type AnimationSequence } from './animator.js'
import { PanZoomHandler } from './pan-zoom.js'
import { InspectHandler } from './inspect.js'
import { KeyboardHandler } from './keyboard.js'
import { injectStyles } from './styles.js'

export type { PartialOptions, MermaidAnimatorOptions, GraphModel, GraphElement, AnimatorEvents }

export class MermaidAnimator {
  private container: HTMLElement
  private options: MermaidAnimatorOptions
  private emitter = new EventEmitter<AnimatorEvents>()
  private model: GraphModel | null = null
  private sequence: AnimationSequence | null = null
  private panZoom: PanZoomHandler | null = null
  private inspectHandler: InspectHandler | null = null
  private keyboard: KeyboardHandler | null = null
  private currentStep = 0

  private constructor(container: HTMLElement, options: MermaidAnimatorOptions) {
    this.container = container
    this.options = options
  }

  static async create(
    container: HTMLElement,
    code: string,
    options?: PartialOptions
  ): Promise<MermaidAnimator> {
    const merged = { ...DEFAULT_OPTIONS, ...options }
    const instance = new MermaidAnimator(container, merged)
    await instance.render(code)
    return instance
  }

  private async render(code: string): Promise<void> {
    injectStyles()
    this.cleanup()

    this.container.classList.add('ma-container')

    mermaid.initialize({
      startOnLoad: false,
      ...this.options.mermaid
    })

    const id = `ma-${Date.now()}`
    const { svg } = await mermaid.render(id, code)
    this.container.innerHTML = svg

    const svgEl = this.container.querySelector('svg')
    if (!svgEl) throw new Error('Mermaid did not produce an SVG element')

    this.model = discoverElements(svgEl)
    this.buildConnections()

    this.sequence = buildSequence(this.model, this.options)

    if (this.options.pan || this.options.zoom) {
      this.panZoom = new PanZoomHandler(this.container, svgEl, this.options)
    }

    if (this.options.inspect) {
      this.inspectHandler = new InspectHandler(this.container, this.model, this.emitter)
    }

    this.keyboard = new KeyboardHandler({
      onNext: () => this.next(),
      onPrev: () => this.prev(),
      onReplay: () => this.replay(),
      onFitToView: () => this.fitToView(),
      onDismiss: () => this.inspectHandler?.dismiss(),
      panZoom: this.panZoom
    })

    if (this.options.mode === 'auto') {
      this.emitter.emit('animationStart')
      await this.sequence.play()
      this.emitter.emit('animationEnd')
    } else {
      this.hideAll()
      this.currentStep = 0
    }
  }

  private buildConnections(): void {
    if (!this.model) return

    for (const edge of this.model.edges) {
      const match = edge.id.match(/L-(.+?)-(.+)/)
      if (!match) continue

      const [, sourceId, targetId] = match
      const source = this.model.nodes.find(n => n.id.includes(sourceId))
      const target = this.model.nodes.find(n => n.id.includes(targetId))

      if (source && target) {
        source.connections.outgoing.push(target.id)
        target.connections.incoming.push(source.id)
      }
    }
  }

  private hideAll(): void {
    if (!this.model) return
    for (const el of this.model.elements) {
      el.el.classList.add('ma-hidden')
    }
  }

  async replay(): Promise<void> {
    if (!this.sequence || !this.model) return
    this.sequence.cancel()
    this.currentStep = 0
    this.emitter.emit('animationStart')
    await this.sequence.play()
    this.emitter.emit('animationEnd')
  }

  next(): void {
    if (!this.sequence || this.options.mode !== 'stepped') return
    const groups = this.sequence.groups
    if (this.currentStep >= groups.length) return

    const group = groups[this.currentStep]
    for (const el of group) {
      el.el.classList.remove('ma-hidden')
      el.el.animate(
        [
          { opacity: 0, transform: 'scale(0.8)' },
          { opacity: 1, transform: 'scale(1)' }
        ],
        { duration: this.options.duration, easing: this.options.easing, fill: 'forwards' }
      )
    }

    this.currentStep++
    this.emitter.emit('step', this.currentStep, groups.length)
  }

  prev(): void {
    if (!this.sequence || this.options.mode !== 'stepped') return
    if (this.currentStep <= 0) return

    this.currentStep--
    const group = this.sequence.groups[this.currentStep]
    for (const el of group) {
      el.el.classList.add('ma-hidden')
    }

    this.emitter.emit('step', this.currentStep, this.sequence.groups.length)
  }

  fitToView(): void {
    this.panZoom?.fitToView()
  }

  async update(code: string): Promise<void> {
    await this.render(code)
  }

  inspect(nodeId: string): void {
    if (!this.model || !this.inspectHandler) return
    const node = this.model.nodes.find(n => n.id === nodeId || n.id.includes(nodeId))
    if (node) this.inspectHandler.inspectNode(node)
  }

  on<K extends keyof AnimatorEvents>(
    event: K,
    listener: (...args: AnimatorEvents[K]) => void
  ): void {
    this.emitter.on(event, listener)
  }

  off<K extends keyof AnimatorEvents>(
    event: K,
    listener: (...args: AnimatorEvents[K]) => void
  ): void {
    this.emitter.off(event, listener)
  }

  private cleanup(): void {
    this.sequence?.cancel()
    this.panZoom?.destroy()
    this.inspectHandler?.destroy()
    this.keyboard?.destroy()
    this.model = null
    this.sequence = null
    this.panZoom = null
    this.inspectHandler = null
    this.keyboard = null
  }

  destroy(): void {
    this.cleanup()
    this.emitter.removeAll()
    this.container.innerHTML = ''
    this.container.classList.remove('ma-container')
  }
}
```

**Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add MermaidAnimator main class wiring all modules"
```

---

### Task 12: Demo Web App

**Files:**
- Create: `demo/index.html`

**Step 1: Build the library for the demo**

```bash
npm run build
```

**Step 2: Create the demo HTML**

This is a single self-contained HTML file with a split-pane editor. The left pane has a textarea with example Mermaid code and a dropdown to switch examples. The right pane renders the animated diagram with a toolbar.

The demo loads Mermaid from CDN and the built library from `../dist/mermaid-animator.js`.

Create `demo/index.html` with:
- Split-pane layout (CSS grid, 40/60 split)
- Left: dropdown for examples, textarea, Run button, auto-run checkbox
- Right: diagram container, toolbar (replay, prev/next, mode toggle, step counter, fit-to-view)
- 5 example diagrams: flowchart, sequence, class diagram, state diagram, ER diagram
- Wire up `MermaidAnimator.create()` and toolbar buttons
- Debounced auto-run (500ms) when checkbox is on

**Step 3: Serve and test in browser**

```bash
npm run dev
```

Open `http://localhost:3000/demo/` and verify:
- Default flowchart renders and animates on load
- Switching examples works
- Auto-run re-animates when editing code
- Toolbar buttons work (replay, stepped mode, prev/next, fit-to-view)
- Pan (click-drag) and zoom (scroll wheel) work
- Click a node to see highlight + popover
- Escape dismisses popover
- Keyboard shortcuts work (R, +/-, 0, arrows)

**Step 4: Commit**

```bash
git add demo/index.html
git commit -m "feat: add demo web app with split-pane editor"
```

---

### Task 13: Build Configuration for Distribution

**Files:**
- Modify: `package.json` (verify scripts)

**Step 1: Build ESM + UMD + type declarations**

```bash
npm run build:all
```

Verify output:
- `dist/mermaid-animator.js` (ESM bundle)
- `dist/mermaid-animator.umd.js` (UMD bundle)
- `dist/index.d.ts` and other `.d.ts` files

**Step 2: Verify ESM import works**

Create a quick test:
```bash
node -e "import('./dist/mermaid-animator.js').then(m => console.log(Object.keys(m)))"
```
Expected: prints `['MermaidAnimator']`

**Step 3: Verify UMD loads in browser**

Add a test in the demo that loads via `<script>` tag and accesses `window.MermaidAnimator`.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify build produces ESM, UMD, and type declarations"
```

---

### Task 14: Edge Connection Discovery Refinement

**Files:**
- Modify: `src/discovery.ts`
- Modify: `src/index.ts`

Mermaid's edge ID format varies by diagram type. The `L-source-target` pattern works for flowcharts but not for sequence diagrams, class diagrams, etc. Refine the connection-building logic to also inspect Mermaid's internal data attributes and the edge's visual proximity to nodes.

**Step 1: Inspect real Mermaid SVG output**

Use the demo app to render each diagram type. Open DevTools, inspect the SVG, and note:
- Edge element IDs and class names per diagram type
- Any `data-*` attributes Mermaid adds
- How edges relate to nodes visually

**Step 2: Update `buildConnections` in `src/index.ts`**

Add fallback strategies for non-flowchart diagram types based on what you find in step 1. This may include:
- Parsing `data-*` attributes
- Matching edge paths to nearest nodes by position
- Parsing Mermaid's internal markers/arrows

**Step 3: Test each diagram type in the demo**

Verify that clicking a node in each diagram type correctly highlights connected nodes.

**Step 4: Commit**

```bash
git add src/discovery.ts src/index.ts
git commit -m "feat: improve edge connection discovery for non-flowchart diagrams"
```

---

## Testing Strategy

- **Unit tests (vitest + jsdom):** EventEmitter, ordering algorithms, SVG discovery with synthetic SVG
- **Browser verification (demo app):** animation playback, pan/zoom, inspect, keyboard, stepped mode
- Run `npx vitest run` for unit tests
- Run `npm run dev` and open `http://localhost:3000/demo/` for browser verification

## Task Order Summary

| Task | Description | Testable via |
|------|-------------|--------------|
| 1 | Project scaffolding | `tsc --noEmit` |
| 2 | Type definitions | `tsc --noEmit` |
| 3 | Event emitter | vitest |
| 4 | SVG discovery | vitest |
| 5 | Ordering algorithms | vitest |
| 6 | CSS styles | `tsc --noEmit` |
| 7 | Animation engine | browser (Task 12) |
| 8 | Pan/zoom handler | browser (Task 12) |
| 9 | Click-to-inspect | browser (Task 12) |
| 10 | Keyboard handler | browser (Task 12) |
| 11 | MermaidAnimator main class | browser (Task 12) |
| 12 | Demo web app | browser manual test |
| 13 | Build for distribution | node + browser |
| 14 | Edge discovery refinement | browser manual test |
