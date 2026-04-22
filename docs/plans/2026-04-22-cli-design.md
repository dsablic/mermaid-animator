# CLI Design

## Goal

Add a CLI to mermaid-animator so users can generate animated GIFs from .mmd files without writing code. Also replaces the custom generate-examples Puppeteer script.

## Usage

```
mermaid-animator <input.mmd> [options]
cat input.mmd | mermaid-animator [options]

Options:
  -o, --output <file>     Output GIF path (default: stdout)
  -t, --theme <name>      'dark' or 'light' (default: dark)
  -W, --width <px>        Max width (default: 800)
  -H, --height <px>       Max height (default: 600)
  --fps <n>               Frames per second (default: 12)
  --frames <n>            Total frames (default: 60)
```

## Architecture

Thin Node script (`src/cli.ts`) that:
1. Parses args with `node:parseArgs`
2. Reads mermaid code from file or stdin
3. Launches headless Puppeteer
4. Serves a minimal HTML page on a random port
5. Calls `exportGif()` in the browser context
6. Writes GIF bytes to output file or stdout

Build: new esbuild step (`build:cli`) produces `dist/cli.js` with `--platform=node --format=esm`. Puppeteer and mermaid are external.

Package.json: `"bin": { "mermaid-animator": "dist/cli.js" }`

## generate-examples replacement

Mermaid source moves to `scripts/diagrams/*.mmd` files. Generate script becomes a shell script calling the CLI:

```bash
#!/bin/bash
for diagram in flowchart sequence; do
  for theme in dark light; do
    node dist/cli.js "scripts/diagrams/${diagram}.mmd" \
      -o "examples/${diagram}-${theme}.gif" -t $theme
  done
done
```

## Decisions

- GIF output only (no PNG/SVG for now)
- Zero dependencies for arg parsing (node:parseArgs)
- Same package (bin field), not separate CLI package
- Files + stdin input, no inline code flag
