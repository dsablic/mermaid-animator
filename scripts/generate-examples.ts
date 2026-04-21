import { execSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import puppeteer from 'puppeteer'

const DIAGRAMS: Record<string, string> = {
  flowchart: `graph TD
    Start([Start]) --> Validate[Validate Input]
    Validate --> Decision{Valid?}
    Decision -->|Yes| Process[Process Data]
    Decision -->|No| Error[Show Error]
    Error --> Validate
    Process --> Store[(Store Results)]

    subgraph Pipeline
      Process
      Store
    end

    Store --> Notify[Send Notification]
    Notify --> End([End])`,

  sequence: `sequenceDiagram
    participant Client
    participant Server
    participant Database

    Client->>Server: POST /api/login
    Server->>Database: Query user record
    Database-->>Server: User data
    Server->>Server: Validate credentials
    alt Valid credentials
        Server-->>Client: 200 OK + token
        Client->>Server: GET /api/profile
        Server->>Database: Fetch profile
        Database-->>Server: Profile data
        Server-->>Client: 200 OK + profile
    else Invalid credentials
        Server-->>Client: 401 Unauthorized
    end`
}

const THEMES = {
  dark: { background: '#1a1a2e', mermaid: { theme: 'dark' } },
  light: { background: '#ffffff', mermaid: { theme: 'default' } }
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
}

const rootDir = join(import.meta.dirname, '..')

function startServer(): Promise<{ server: ReturnType<typeof createServer>; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const filePath = join(rootDir, url.pathname === '/' ? 'index.html' : url.pathname)
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
    server.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, port })
    })
  })
}

async function main() {
  execSync('npm run build:all', { cwd: rootDir, stdio: 'inherit' })

  const { server, port } = await startServer()
  await mkdir(join(rootDir, 'examples'), { recursive: true })

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 800 })

  const themeName = process.argv[2] || 'dark'
  const theme = THEMES[themeName as keyof typeof THEMES] ?? THEMES.dark

  for (const [name, code] of Object.entries(DIAGRAMS)) {
    process.stdout.write(`Generating ${name}.gif (${themeName})...`)

    await page.goto(`http://localhost:${port}/demo/index.html`, { waitUntil: 'networkidle0' })

    const gifBytes = await page.evaluate(async (mermaidCode: string, bg: string, mermaidOpts: Record<string, unknown>) => {
      const { exportGif } = await import('../dist/mermaid-animator-export.js')
      const bytes = await exportGif(mermaidCode, {
        width: 800,
        height: 600,
        fps: 12,
        stagger: 100,
        fadeSteps: 3,
        holdFirstFrame: 300,
        holdLastFrame: 2000,
        background: bg,
        mermaid: mermaidOpts
      })
      return Array.from(bytes as Uint8Array)
    }, code, theme.background, theme.mermaid)

    await writeFile(
      join(rootDir, 'examples', `${name}.gif`),
      Buffer.from(gifBytes)
    )

    process.stdout.write(` done\n`)
  }

  await browser.close()
  server.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
