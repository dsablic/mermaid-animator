# GIF Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GIF export feature as a separate entry point (`mermaid-animator/export`) that captures animation frames and encodes them into an animated GIF.

**Architecture:** The export module renders the Mermaid SVG into an offscreen canvas frame-by-frame, stepping through the animation groups programmatically. Each frame is quantized to a 256-color palette and encoded using `gifenc`. The module is a separate esbuild entry point so the GIF encoder (~5KB) doesn't bloat the main bundle.

**Tech Stack:** gifenc (GIF encoding), Canvas API (SVG-to-raster), esbuild (separate bundle entry point)

---

### Task 1: Migrate tests from vitest to node:test

The project currently uses vitest + jsdom. Migrate to node:test + jsdom (used as a library) to remove the vitest dependency.

**Files:**
- Modify: `test/events.test.ts`
- Modify: `test/ordering.test.ts`
- Modify: `test/discovery.test.ts`
- Modify: `package.json` (scripts, devDependencies)
- Delete: `vitest.config.ts`

**Step 1: Update test/events.test.ts**

Replace vitest imports with node:test equivalents. Replace `vi.fn()` with `mock.fn()`. Replace `expect(...).toHaveBeenCalledWith(...)` with assert-based checks on `mock.fn().mock.calls`.

```typescript
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from '../src/events.js'

describe('EventEmitter', () => {
  it('calls registered listener when event is emitted', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = mock.fn()
    emitter.on('ping', listener)
    emitter.emit('ping', 'hello')
    assert.equal(listener.mock.callCount(), 1)
    assert.deepEqual(listener.mock.calls[0].arguments, ['hello'])
  })

  it('supports multiple listeners on same event', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const a = mock.fn()
    const b = mock.fn()
    emitter.on('ping', a)
    emitter.on('ping', b)
    emitter.emit('ping', 'hello')
    assert.deepEqual(a.mock.calls[0].arguments, ['hello'])
    assert.deepEqual(b.mock.calls[0].arguments, ['hello'])
  })

  it('removes listener with off()', () => {
    const emitter = new EventEmitter<{ ping: [value: string] }>()
    const listener = mock.fn()
    emitter.on('ping', listener)
    emitter.off('ping', listener)
    emitter.emit('ping', 'hello')
    assert.equal(listener.mock.callCount(), 0)
  })

  it('removeAll clears all listeners', () => {
    const emitter = new EventEmitter<{ ping: []; pong: [] }>()
    const a = mock.fn()
    const b = mock.fn()
    emitter.on('ping', a)
    emitter.on('pong', b)
    emitter.removeAll()
    emitter.emit('ping')
    emitter.emit('pong')
    assert.equal(a.mock.callCount(), 0)
    assert.equal(b.mock.callCount(), 0)
  })

  it('does not throw when emitting event with no listeners', () => {
    const emitter = new EventEmitter<{ ping: [] }>()
    assert.doesNotThrow(() => emitter.emit('ping'))
  })
})
```

**Step 2: Update test/ordering.test.ts**

Replace vitest imports. Replace `expect(x).toEqual(y)` with `assert.deepEqual`. Replace `expect(x).toHaveLength(n)` with `assert.equal(x.length, n)`. Since `makeElement` uses `document.createElementNS`, we need jsdom. Add jsdom setup at the top of the file.

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { spatialOrder, topologicalOrder, groupByLevel } from '../src/ordering.js'
import type { GraphElement } from '../src/types.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const document = dom.window.document

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

describe('spatialOrder', () => {
  it('sorts elements top-to-bottom then left-to-right', () => {
    const a = makeElement({ id: 'a', x: 200, y: 0 })
    const b = makeElement({ id: 'b', x: 0, y: 100 })
    const c = makeElement({ id: 'c', x: 0, y: 0 })
    const result = spatialOrder([a, b, c])
    assert.deepEqual(result.map(e => e.id), ['c', 'a', 'b'])
  })

  it('returns empty array for empty input', () => {
    assert.deepEqual(spatialOrder([]), [])
  })
})

describe('topologicalOrder', () => {
  it('orders nodes by dependency chain', () => {
    const a = makeElement({ id: 'A', connections: { incoming: [], outgoing: ['B'] } })
    const b = makeElement({ id: 'B', connections: { incoming: ['A'], outgoing: ['C'] } })
    const c = makeElement({ id: 'C', connections: { incoming: ['B'], outgoing: [] } })
    const result = topologicalOrder([c, a, b])
    assert.deepEqual(result.map(e => e.id), ['A', 'B', 'C'])
  })

  it('falls back to spatial order when no connections exist', () => {
    const a = makeElement({ id: 'a', x: 100, y: 0 })
    const b = makeElement({ id: 'b', x: 0, y: 0 })
    const result = topologicalOrder([a, b])
    assert.deepEqual(result.map(e => e.id), ['b', 'a'])
  })
})

describe('groupByLevel', () => {
  it('groups nodes by topological depth', () => {
    const a = makeElement({ id: 'A', connections: { incoming: [], outgoing: ['B', 'C'] } })
    const b = makeElement({ id: 'B', connections: { incoming: ['A'], outgoing: ['D'] } })
    const c = makeElement({ id: 'C', connections: { incoming: ['A'], outgoing: ['D'] } })
    const d = makeElement({ id: 'D', connections: { incoming: ['B', 'C'], outgoing: [] } })
    const groups = groupByLevel([a, b, c, d])
    assert.equal(groups.length, 3)
    assert.deepEqual(groups[0].map(e => e.id), ['A'])
    assert.deepEqual(groups[1].map(e => e.id).sort(), ['B', 'C'])
    assert.deepEqual(groups[2].map(e => e.id), ['D'])
  })

  it('returns single group when no connections', () => {
    const a = makeElement({ id: 'a', x: 0, y: 0 })
    const b = makeElement({ id: 'b', x: 100, y: 0 })
    const groups = groupByLevel([a, b])
    assert.equal(groups.length, 1)
    assert.equal(groups[0].length, 2)
  })
})
```

**Step 3: Update test/discovery.test.ts**

Same pattern: replace vitest with node:test + jsdom.

```typescript
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
```

**Step 4: Update package.json**

Change test scripts and remove vitest from devDependencies:

```json
"scripts": {
  ...
  "test": "node --import tsx --test test/**/*.test.ts",
  "test:watch": "node --import tsx --test --watch test/**/*.test.ts",
  ...
}
```

Add `tsx` to devDependencies (for TypeScript test execution without a build step). Remove `vitest` from devDependencies.

**Step 5: Delete vitest.config.ts**

Remove the file entirely.

**Step 6: Run tests to verify migration**

Run: `npm test`
Expected: All tests pass with node:test runner output.

**Step 7: Commit**

```bash
git add test/ package.json && git rm vitest.config.ts
git commit -m "refactor: migrate tests from vitest to node:test"
```

---

### Task 2: Add gifenc dependency and export entry point scaffolding

**Files:**
- Modify: `package.json` (add gifenc dependency, add export entry point, add build:export script)
- Modify: `tsconfig.json` (if needed for declaration generation)
- Create: `src/export.ts` (empty module with types)

**Step 1: Install gifenc**

Run: `npm install gifenc`

This is a runtime dependency (not dev) since consumers of the export feature need it.

**Step 2: Update package.json exports and build scripts**

Add a second entry point and build script:

```json
"exports": {
  ".": "./dist/mermaid-animator.js",
  "./export": "./dist/mermaid-animator-export.js"
},
"scripts": {
  ...
  "build:export": "esbuild src/export.ts --bundle --format=esm --outfile=dist/mermaid-animator-export.js --external:mermaid",
  "build:all": "npm run build && npm run build:umd && npm run build:export && tsc --emitDeclarationOnly",
  ...
}
```

Add gifenc to `dependencies` (not devDependencies):

```json
"dependencies": {
  "gifenc": "^1.0.3"
}
```

**Step 3: Create src/export.ts with type definitions**

```typescript
import type { MermaidAnimatorOptions, GraphModel } from './types.js'

export interface GifExportOptions {
  width?: number
  height?: number
  fps?: number
  quality?: number
}

export type ExportOptions = GifExportOptions & {
  mermaid?: MermaidAnimatorOptions['mermaid']
  stagger?: number
  duration?: number
}
```

**Step 4: Verify build**

Run: `npm run build:export`
Expected: Builds successfully to `dist/mermaid-animator-export.js`.

**Step 5: Commit**

```bash
git add src/export.ts package.json package-lock.json
git commit -m "feat: add gifenc dependency and export entry point scaffold"
```

---

### Task 3: Implement SVG-to-canvas frame capture

The core challenge: render the Mermaid SVG at each animation step to a canvas. The approach is to serialize the SVG to a blob URL, load it into an `Image`, then `drawImage` onto an offscreen canvas. We do this once per animation group (not per-element) to match the stepped animation model.

**Files:**
- Create: `src/capture.ts`
- Create: `test/capture.test.ts`

**Step 1: Write failing test for capture.ts**

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { renderSvgToImageData } from '../src/capture.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true,
  resources: 'usable'
})

describe('renderSvgToImageData', () => {
  it('returns ImageData with correct dimensions', async () => {
    const svg = dom.window.document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '100')
    svg.setAttribute('height', '80')
    svg.innerHTML = '<rect width="100" height="80" fill="red"/>'
    const result = await renderSvgToImageData(svg, 100, 80)
    assert.equal(result.width, 100)
    assert.equal(result.height, 80)
    assert.ok(result.data.length > 0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - cannot resolve `../src/capture.js`

**Step 3: Implement src/capture.ts**

```typescript
export async function renderSvgToImageData(
  svg: SVGSVGElement,
  width: number,
  height: number
): Promise<ImageData> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = new Image()
    img.width = width
    img.height = height
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, width, height)
    return ctx.getImageData(0, 0, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

**Step 4: Run test**

Run: `npm test`

Note: jsdom does not support `OffscreenCanvas` or full canvas rendering. The capture test may need to be a browser-only integration test, or we may need to mock canvas. If it fails due to jsdom limitations, mark the test as a TODO and verify manually in the browser (Task 6). The unit test can at least verify the function exists and has the right signature.

If jsdom fails, simplify the test to just verify the function is importable:

```typescript
it('is importable', async () => {
  assert.equal(typeof renderSvgToImageData, 'function')
})
```

**Step 5: Commit**

```bash
git add src/capture.ts test/capture.test.ts
git commit -m "feat: add SVG-to-canvas frame capture utility"
```

---

### Task 4: Implement GIF encoding from frames

**Files:**
- Create: `src/gif-encoder.ts`
- Create: `test/gif-encoder.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { encodeGif } from '../src/gif-encoder.js'

describe('encodeGif', () => {
  it('produces a valid GIF binary from synthetic frames', () => {
    const width = 4
    const height = 4
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255     // R
      pixels[i + 1] = 0   // G
      pixels[i + 2] = 0   // B
      pixels[i + 3] = 255 // A
    }

    const frames = [
      { data: pixels, width, height },
      { data: pixels, width, height }
    ]

    const result = encodeGif(frames, { delay: 100 })
    assert.ok(result instanceof Uint8Array)
    assert.ok(result.length > 0)
    // GIF89a magic bytes
    assert.equal(result[0], 0x47) // G
    assert.equal(result[1], 0x49) // I
    assert.equal(result[2], 0x46) // F
  })

  it('respects delay option', () => {
    const width = 2
    const height = 2
    const pixels = new Uint8ClampedArray(width * height * 4).fill(128)
    const frames = [{ data: pixels, width, height }]

    const result = encodeGif(frames, { delay: 200 })
    assert.ok(result instanceof Uint8Array)
    assert.ok(result.length > 0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - cannot resolve `../src/gif-encoder.js`

**Step 3: Implement src/gif-encoder.ts**

```typescript
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

export interface FrameData {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface GifEncodeOptions {
  delay?: number
}

export function encodeGif(frames: FrameData[], options: GifEncodeOptions = {}): Uint8Array {
  const { delay = 100 } = options
  if (frames.length === 0) throw new Error('No frames to encode')

  const { width, height } = frames[0]
  const gif = GIFEncoder()

  for (const frame of frames) {
    const palette = quantize(frame.data, 256)
    const indexed = applyPalette(frame.data, palette)
    gif.writeFrame(indexed, width, height, { palette, delay })
  }

  gif.finish()
  return gif.bytes()
}
```

**Step 4: Run test**

Run: `npm test`
Expected: PASS - GIF magic bytes verified

**Step 5: Commit**

```bash
git add src/gif-encoder.ts test/gif-encoder.test.ts
git commit -m "feat: add GIF encoding from frame data"
```

---

### Task 5: Implement the exportGif() orchestrator

This is the main export function that ties everything together: renders Mermaid code, steps through animation groups, captures each frame, and encodes the GIF.

**Files:**
- Modify: `src/export.ts` (implement `exportGif()`)

**Step 1: Implement src/export.ts**

```typescript
import mermaid from 'mermaid'
import { DEFAULT_OPTIONS } from './types.js'
import { discoverElements } from './discovery.js'
import { topologicalOrder, groupByLevel } from './ordering.js'
import { injectStyles } from './styles.js'
import { renderSvgToImageData } from './capture.js'
import { encodeGif } from './gif-encoder.js'
import type { FrameData } from './gif-encoder.js'

export interface GifExportOptions {
  width?: number
  height?: number
  fps?: number
  stagger?: number
  duration?: number
  holdFirstFrame?: number
  holdLastFrame?: number
  mermaid?: Record<string, unknown>
}

export async function exportGif(
  code: string,
  options: GifExportOptions = {}
): Promise<Uint8Array> {
  const {
    width = 800,
    height = 600,
    fps = 10,
    stagger = 80,
    duration = 300,
    holdFirstFrame = 500,
    holdLastFrame = 1500,
    mermaid: mermaidOptions = { theme: 'default' }
  } = options

  const delay = Math.round(1000 / fps)

  const container = document.createElement('div')
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  try {
    injectStyles()
    container.classList.add('ma-container')

    mermaid.initialize({ startOnLoad: false, ...mermaidOptions })
    const id = `ma-export-${Date.now()}`
    const { svg } = await mermaid.render(id, code)
    container.innerHTML = svg

    const svgEl = container.querySelector('svg')!
    svgEl.setAttribute('width', String(width))
    svgEl.setAttribute('height', String(height))

    const model = discoverElements(svgEl)
    const ordered = topologicalOrder(model.nodes)
    const groups = groupByLevel(ordered)
    const allGroups = [model.clusters, ...groups, model.edges, model.labels]
      .filter(g => g.length > 0)

    for (const el of model.elements) {
      el.el.classList.add('ma-hidden')
    }

    const frames: FrameData[] = []

    const initialFrame = await renderSvgToImageData(svgEl, width, height)
    const holdFirstCount = Math.max(1, Math.round(holdFirstFrame / delay))
    for (let i = 0; i < holdFirstCount; i++) {
      frames.push(initialFrame)
    }

    for (const group of allGroups) {
      for (const el of group) {
        el.el.classList.remove('ma-hidden')
        el.el.style.opacity = '1'
      }
      const frame = await renderSvgToImageData(svgEl, width, height)
      const staggerFrames = Math.max(1, Math.round(stagger / delay))
      for (let i = 0; i < staggerFrames; i++) {
        frames.push(frame)
      }
    }

    const holdLastCount = Math.max(1, Math.round(holdLastFrame / delay))
    for (let i = 1; i < holdLastCount; i++) {
      frames.push(frames[frames.length - 1])
    }

    return encodeGif(frames, { delay })
  } finally {
    container.remove()
  }
}
```

**Step 2: Verify build**

Run: `npm run build:export`
Expected: Builds successfully.

**Step 3: Commit**

```bash
git add src/export.ts
git commit -m "feat: implement exportGif orchestrator"
```

---

### Task 6: Add demo integration and browser testing

Add a GIF export button to the demo page so we can test the full pipeline in a real browser.

**Files:**
- Modify: `demo/index.html`

**Step 1: Add export button and handler to demo**

In the toolbar section of `demo/index.html`, add an "Export GIF" button next to the existing controls. Add a script section that imports `exportGif` from the built export module and wires it up:

- Button labeled "Export GIF" in the toolbar
- On click: call `exportGif(code, { width, height })` with the current editor code
- Show a loading indicator while encoding
- On completion: create a blob URL and trigger a download, plus show a preview `<img>` tag

**Step 2: Build everything**

Run: `npm run build:all`
Expected: All bundles build.

**Step 3: Manual browser test**

Run: `npm run dev`
Open http://localhost:3000/demo/
- Load a flowchart example
- Click "Export GIF"
- Verify a GIF downloads and plays the animation

**Step 4: Commit**

```bash
git add demo/index.html
git commit -m "feat: add GIF export button to demo"
```

---

### Task 7: Update README and package.json exports

**Files:**
- Modify: `README.md`
- Modify: `package.json` (types for export entry point)

**Step 1: Add GIF export section to README**

Add after the Events section:

```markdown
### GIF Export

Export animated diagrams as GIF files. Available as a separate import to keep the main bundle small.

\```js
import { exportGif } from 'mermaid-animator/export'

const gifBytes = await exportGif(`graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D[End]
  C --> D`, {
  width: 800,
  height: 600,
  fps: 10
})

// Download
const blob = new Blob([gifBytes], { type: 'image/gif' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'diagram.gif'
a.click()
\```

#### Export Options

| Option | Default | Description |
|--------|---------|-------------|
| `width` | 800 | GIF width in pixels |
| `height` | 600 | GIF height in pixels |
| `fps` | 10 | Frames per second |
| `stagger` | 80 | ms between groups appearing |
| `duration` | 300 | ms per animation step |
| `holdFirstFrame` | 500 | ms to hold the blank/initial frame |
| `holdLastFrame` | 1500 | ms to hold the final complete frame |
| `mermaid` | `{ theme: 'default' }` | Mermaid configuration |
```

**Step 2: Update package.json for export types**

Ensure the `exports` field includes types for the export entry point:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/mermaid-animator.js"
  },
  "./export": {
    "types": "./dist/export.d.ts",
    "default": "./dist/mermaid-animator-export.js"
  }
}
```

**Step 3: Commit**

```bash
git add README.md package.json
git commit -m "docs: add GIF export documentation to README"
```

---

### Task 8: Generate example GIFs for README

Use the demo or a small script to generate 2-3 example GIFs (flowchart, sequence diagram, class diagram) and add them to the README.

**Files:**
- Create: `examples/` directory with generated GIF files
- Modify: `README.md` (add GIF images at the top)

**Step 1: Create a generation script**

Create a small HTML file or script that runs in the browser, generates GIFs for the example diagrams from the demo, and offers them for download. Or use the demo page directly.

**Step 2: Generate GIFs**

Run the demo, export a flowchart and a sequence diagram as GIF.

**Step 3: Add to README**

Add images near the top of the README, after the description:

```markdown
<p align="center">
  <img src="examples/flowchart.gif" alt="Flowchart animation" width="400"/>
  <img src="examples/sequence.gif" alt="Sequence diagram animation" width="400"/>
</p>
```

**Step 4: Update .gitattributes for binary files**

```
examples/*.gif binary
```

**Step 5: Commit**

```bash
git add examples/ README.md .gitattributes
git commit -m "docs: add example animated GIFs to README"
```
