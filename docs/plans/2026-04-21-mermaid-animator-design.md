# Mermaid Animator Design

An open-source TypeScript library that takes Mermaid.js diagram code and produces animated, interactive SVG diagrams with pan, zoom, and click-to-inspect.

## Architecture

Two deliverables:

- **`@mermaid-animator/core`** -- the engine. Takes a Mermaid string, renders via Mermaid.js, animates the resulting SVG, attaches interaction handlers. Zero dependencies beyond Mermaid. Ships as ESM + UMD.
- **Demo web app** -- single `index.html` with split-pane editor. No build step required for development.

### Entry Point

```ts
const animator = await MermaidAnimator.create(container, mermaidCode, options?)
```

Pipeline:
1. Call Mermaid to render code into SVG
2. Parse SVG to build internal graph model (nodes, edges, clusters, labels)
3. Run animation sequence
4. Attach interaction handlers (pan, zoom, inspect)

### Diagram-Type Agnostic

The graph model works by analyzing Mermaid's SVG output (CSS classes like `.node`, `.edgePath`, `.cluster`, `.label`) rather than parsing Mermaid syntax per diagram type. This supports all diagram types without type-specific code.

## Animation Engine

### Discovery Phase

Scans rendered SVG and classifies elements by Mermaid CSS classes:

| Category | CSS classes |
|----------|-------------|
| Nodes | `.node`, `.state`, `.entity`, `.task`, `.actor` |
| Edges | `.edgePath`, `.messageLine`, `.relation` |
| Clusters | `.cluster`, `.section` |
| Labels | `.edgeLabel`, `.noteText` |

Each element gets a computed position (from SVG transform/coordinates) for animation ordering.

### Ordering

- **Topological** for flowcharts (respects graph direction)
- **Spatial fallback** (top-left to bottom-right) for other diagram types

### Playback

Uses the Web Animations API:

| Element type | Animation |
|---|---|
| Clusters | Fade in + scale 0.95 to 1.0 (appear first) |
| Nodes | Fade in + scale 0.8 to 1.0, staggered |
| Edges | stroke-dashoffset to draw path progressively |
| Labels | Fade in, timed with parent edge/node |

Default timing: ~80ms stagger, 300ms per element. All configurable.

### Stepped Mode

Same sequence, pauses between groups. A group is one topological level (or spatial row). Arrow keys / Space advance to next group.

## Interaction Layer

### Pan and Zoom

- Implemented via pointer events + SVG `viewBox` manipulation
- Scroll wheel zooms centered on cursor
- Click-drag pans
- Pinch-to-zoom on touch
- Smooth transitions via `requestAnimationFrame`
- Min/max zoom bounds configurable

### Click-to-Inspect

1. Clicked node + connected edges + neighbor nodes get `.ma-highlighted`
2. Everything else gets `.ma-dimmed` (reduced opacity)
3. Lightweight popover appears near clicked node:
   - Node ID and label text
   - Connections: incoming and outgoing
   - Diagram type-specific info if available
4. Click background or Escape to dismiss

Popover is plain HTML absolutely positioned relative to SVG container.

### Keyboard Support

| Key | Action |
|-----|--------|
| Arrow keys / Space / Enter | Stepped mode navigation |
| `+` / `-` | Zoom in/out |
| `0` | Reset view (fit diagram) |
| Escape | Dismiss inspect popover |
| `R` | Replay animation |

All interaction is opt-out via options.

## API

```ts
const animator = await MermaidAnimator.create(container, mermaidCode, {
  // Animation
  mode: 'auto' | 'stepped',       // default: 'auto'
  stagger: 80,                      // ms between elements
  duration: 300,                    // ms per element animation
  easing: 'ease-out',              // CSS easing string

  // Interaction
  pan: true,
  zoom: true,
  inspect: true,
  minZoom: 0.1,
  maxZoom: 5,

  // Mermaid passthrough
  mermaid: { theme: 'default' },   // passed to mermaid.initialize()
})

// Methods
animator.replay()                   // restart animation
animator.next() / animator.prev()   // stepped mode navigation
animator.fitToView()                // reset zoom/pan
animator.update(newMermaidCode)      // re-render with new code
animator.inspect(nodeId)             // programmatically inspect a node
animator.destroy()                   // cleanup

// Events
animator.on('animationStart', () => {})
animator.on('animationEnd', () => {})
animator.on('nodeClick', (node) => {})
animator.on('step', (index, total) => {})
```

## Demo Web App

Single `index.html` with split-pane layout:

- **Left pane:** textarea for Mermaid code, example diagram dropdown, Run button, auto-run toggle (debounced 500ms)
- **Right pane:** animated diagram output with toolbar: Play/Replay, Prev/Next (stepped mode), step counter, mode toggle, fit-to-view

No framework, no build step for development. One esbuild call bundles for distribution.

## Tech Stack

- TypeScript, zero framework dependencies
- Mermaid.js as only runtime dependency
- Web Animations API for SVG animation
- SVG viewBox manipulation for pan/zoom
- esbuild for bundling (ESM + UMD)
