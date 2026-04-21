# mermaid-animator &nbsp; [![CI](https://github.com/dsablic/mermaid-animator/actions/workflows/ci.yml/badge.svg)](https://github.com/dsablic/mermaid-animator/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/mermaid-animator)](https://www.npmjs.com/package/mermaid-animator) [![license](https://img.shields.io/npm/l/mermaid-animator)](./LICENSE)

Animated, interactive Mermaid.js diagram viewer. Takes Mermaid code in, produces an animated SVG you can pan, zoom, and click to inspect.

Supports all Mermaid diagram types: flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, and more.

## Features

- Animated rendering -- nodes fade/scale in, edges draw progressively, staggered by graph order
- Auto-play and stepped (presentation) modes
- Pan and zoom via mouse/touch, with keyboard shortcuts
- Click any node to highlight its connections and see a detail popover
- Works with all Mermaid diagram types
- Zero dependencies beyond Mermaid.js
- Ships as ESM and UMD, with TypeScript declarations

## Installation

```bash
npm install mermaid-animator mermaid
```

## Usage

```html
<div id="diagram" style="width: 800px; height: 600px;"></div>

<script type="module">
  import { MermaidAnimator } from 'mermaid-animator'

  const animator = await MermaidAnimator.create(
    document.getElementById('diagram'),
    `graph TD
      A[Start] --> B{Decision}
      B -->|Yes| C[Process]
      B -->|No| D[End]
      C --> D`
  )
</script>
```

### Options

```js
const animator = await MermaidAnimator.create(container, code, {
  mode: 'auto',        // 'auto' or 'stepped'
  stagger: 80,         // ms between element animations
  duration: 300,       // ms per animation
  easing: 'ease-out',  // CSS easing
  pan: true,           // enable pan
  zoom: true,          // enable zoom
  inspect: true,       // enable click-to-inspect
  minZoom: 0.1,
  maxZoom: 5,
  mermaid: { theme: 'default' }  // passed to mermaid.initialize()
})
```

### Methods

```js
animator.replay()           // restart animation
animator.next()             // next step (stepped mode)
animator.prev()             // previous step (stepped mode)
animator.fitToView()        // reset zoom/pan
animator.update(newCode)    // re-render with new Mermaid code
animator.inspect('nodeId')  // programmatically inspect a node
animator.destroy()          // cleanup
```

### Events

```js
animator.on('animationStart', () => {})
animator.on('animationEnd', () => {})
animator.on('nodeClick', (node) => {})
animator.on('step', (index, total) => {})
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Right / Space / Enter | Next step |
| Left | Previous step |
| + / - | Zoom in / out |
| 0 | Fit to view |
| R | Replay |
| Escape | Dismiss popover |

### UMD / Script Tag

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid-animator/dist/mermaid-animator.umd.js"></script>
<script>
  MermaidAnimator.MermaidAnimator.create(container, code)
</script>
```

## Development

```bash
git clone https://github.com/dsablic/mermaid-animator.git
cd mermaid-animator
npm install --ignore-scripts=false
npm test              # run tests
npm run build         # build ESM bundle
npm run dev           # serve demo at localhost:3000/demo/
```

## License

[MIT](./LICENSE)
