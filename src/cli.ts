import { parseArgs } from 'node:util'
import { readFileSync, realpathSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, extname, resolve as resolvePath, parse as parsePath } from 'node:path'
import puppeteer from 'puppeteer'

const USAGE = `Usage: mermaid-animator <input.mmd> [options]
       cat input.mmd | mermaid-animator [options]

Options:
  -o, --output <file>     Output GIF path (default: stdout)
  -t, --theme <name>      'dark' or 'light' (default: dark)
  -W, --width <px>        Max width (default: 800)
  -H, --height <px>       Max height (default: 600)
  --fps <n>               Frames per second (default: 12)
  --frames <n>            Total frames (default: 60)
  -h, --help              Show this help`

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
}

function findPackageRoot(): string {
  let dir = import.meta.dirname
  while (parsePath(dir).root !== dir) {
    try {
      readFileSync(join(dir, 'package.json'))
      return dir
    } catch {
      dir = join(dir, '..')
    }
  }
  return import.meta.dirname
}

function startServer(rootDir: string): Promise<{ server: ReturnType<typeof createServer>; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      let filePath: string
      try {
        filePath = realpathSync(resolvePath(rootDir, url.pathname === '/' ? 'index.html' : '.' + url.pathname))
      } catch {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      if (!filePath.startsWith(realpathSync(rootDir))) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      try {
        const content = readFileSync(filePath)
        const ext = extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' })
        res.end(content)
      } catch {
        res.writeHead(404)
        res.end('Not found')
      }
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, port })
    })
  })
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
      theme: { type: 'string', short: 't', default: 'dark' },
      width: { type: 'string', short: 'W', default: '800' },
      height: { type: 'string', short: 'H', default: '600' },
      fps: { type: 'string', default: '12' },
      frames: { type: 'string', default: '60' },
      help: { type: 'boolean', short: 'h', default: false },
    }
  })

  if (values.help) {
    console.log(USAGE)
    process.exit(0)
  }

  let code: string
  if (positionals.length > 0) {
    code = readFileSync(positionals[0], 'utf8')
  } else if (!process.stdin.isTTY) {
    code = await readStdin()
  } else {
    console.error(USAGE)
    process.exit(1)
  }

  code = code.trim()
  if (!code) {
    console.error('Error: empty input')
    process.exit(1)
  }

  function parsePositiveInt(value: string, name: string): number {
    const n = parseInt(value, 10)
    if (isNaN(n) || n <= 0) {
      console.error(`Error: ${name} must be a positive integer, got "${value}"`)
      return process.exit(1)
    }
    return n
  }

  const width = parsePositiveInt(values.width!, '--width')
  const height = parsePositiveInt(values.height!, '--height')
  const fps = parsePositiveInt(values.fps!, '--fps')
  const frames = parsePositiveInt(values.frames!, '--frames')

  const rootDir = findPackageRoot()
  const { server, port } = await startServer(rootDir)

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 800 })

  try {
    await page.goto(`http://localhost:${port}/demo/index.html`, { waitUntil: 'networkidle0' })

    const gifBytes = await page.evaluate(
      async (mermaidCode: string, theme: string, w: number, h: number, fps: number, frames: number) => {
        const mod = '../dist/mermaid-animator-export.js'
        const { exportGif } = await import(/* @vite-ignore */ mod)
        const bytes = await exportGif(mermaidCode, {
          width: w,
          height: h,
          fps,
          totalFrames: frames,
          theme
        })
        return Array.from(bytes as Uint8Array)
      },
      code,
      values.theme!,
      width,
      height,
      fps,
      frames
    )

    const buf = Buffer.from(gifBytes)

    if (values.output) {
      await writeFile(values.output, buf)
      console.error(`Wrote ${values.output} (${(buf.length / 1024).toFixed(0)}KB)`)
    } else {
      process.stdout.write(buf)
    }
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
