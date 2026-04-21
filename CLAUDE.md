# Mermaid Animator

TypeScript library that renders Mermaid.js diagrams as animated, interactive SVGs with colorized edges and traveling dots.

## Project Structure

- `src/` - Library source (TypeScript, zero framework dependencies beyond Mermaid)
- `src/dots.ts` - Shared edge colorization and dot geometry (used by both live animation and GIF export)
- `src/export.ts` - GIF export entry point (separate bundle: `mermaid-animator/export`)
- `test/` - Unit tests (node:test + jsdom)
- `demo/` - Single-page demo app (no build step)
- `dist/` - Built output (ESM + UMD + export + .d.ts)
- `scripts/` - Puppeteer-based example GIF generation
- `examples/` - Generated animated GIF examples

## Commands

- `npm test` - Run tests
- `npm run build` - Build ESM bundle
- `npm run build:umd` - Build UMD bundle
- `npm run build:export` - Build export/GIF bundle
- `npm run build:all` - Build ESM + UMD + export + type declarations
- `npm run dev` - Serve project for demo testing
- `npm run generate-examples` - Regenerate example GIFs in `examples/` (requires build first, uses Puppeteer)

## Architecture

`MermaidAnimator.create(container, mermaidCode, options)` is the entry point. Pipeline:

1. Mermaid renders code to SVG
2. `discovery.ts` parses SVG elements by CSS class and data attributes into a graph model
3. `ordering.ts` computes animation order (topological or spatial)
4. `dots.ts` colorizes edges and computes dot geometries along paths
5. `animator.ts` runs continuous traveling dot animation via requestAnimationFrame
6. `pan-zoom.ts`, `inspect.ts`, `keyboard.ts` attach interaction handlers

GIF export (`src/export.ts`) uses the same `dots.ts` to render frames, then encodes via `gifenc`.

## Workflow

- Always run `npm run build:all` before committing source changes — `dist/` and `demo/` load built files
- Run `npm test` to verify nothing is broken
- Run `npm run generate-examples` after changes to export/rendering to update example GIFs
- Keep `README.md` in sync with code — update docs when adding/changing features or options

## Conventions

- TypeScript strict mode, ES modules with `"type": "module"`
- `node:` protocol for Node.js built-in imports
- `.js` extension on all local imports
- No comments, no emojis in code
- node:test + jsdom for unit tests, tsx for TypeScript execution
- Browser testing via `demo/index.html`
