const handler: ProxyHandler<object> = {
  get(_target, prop) {
    const mermaid = (globalThis as { mermaid?: Record<string | symbol, unknown> }).mermaid
    if (!mermaid || typeof mermaid.initialize !== 'function') {
      throw new Error(
        'mermaid-animator: window.mermaid not found. Load mermaid (>=10) via <script> before mermaid-animator.umd.js.'
      )
    }
    return mermaid[prop]
  }
}

export default new Proxy({}, handler) as typeof import('mermaid').default
