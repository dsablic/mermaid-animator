# Mermaid Animator

TypeScript library that renders Mermaid.js diagrams as animated, interactive SVGs.

## Project Structure

- `src/` - Library source (TypeScript, zero framework dependencies beyond Mermaid)
- `test/` - Unit tests (vitest + jsdom)
- `demo/` - Single-page demo app (no build step)
- `dist/` - Built output (ESM + UMD + .d.ts)

## Commands

- `npm test` - Run tests
- `npm run build` - Build ESM bundle
- `npm run build:umd` - Build UMD bundle
- `npm run build:all` - Build ESM + UMD + type declarations
- `npm run dev` - Serve project for demo testing

## Architecture

`MermaidAnimator.create(container, mermaidCode, options)` is the entry point. Pipeline:

1. Mermaid renders code to SVG
2. `discovery.ts` parses SVG elements by CSS class and data attributes into a graph model
3. `ordering.ts` computes animation order (topological or spatial)
4. `animator.ts` sequences animations using Web Animations API
5. `pan-zoom.ts`, `inspect.ts`, `keyboard.ts` attach interaction handlers

## Conventions

- TypeScript strict mode, ES modules with `"type": "module"`
- `node:` protocol for Node.js built-in imports
- `.js` extension on all local imports
- No comments, no emojis in code
- vitest + jsdom for unit tests
- Browser testing via `demo/index.html`
