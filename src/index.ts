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
import { resolveTheme } from './themes.js'
export type { Theme } from './themes.js'

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

    const theme = resolveTheme(this.options.theme)
    mermaid.initialize({
      startOnLoad: false,
      theme: theme.mermaidTheme as 'dark' | 'default',
      ...this.options.mermaid
    })

    const id = `ma-${Date.now()}`
    const { svg } = await mermaid.render(id, code)
    this.container.innerHTML = svg

    const svgEl = this.container.querySelector('svg')
    if (!svgEl) throw new Error('Mermaid did not produce an SVG element')

    svgEl.removeAttribute('width')
    svgEl.removeAttribute('height')
    svgEl.style.maxWidth = 'none'
    svgEl.setAttribute('overflow', 'visible')

    this.model = discoverElements(svgEl)
    this.buildConnections()

    this.sequence = buildSequence(this.model, this.options, theme)

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

    const nodeDataIds = new Map<string, GraphElement>()
    for (const node of this.model.nodes) {
      const dataId = node.el.getAttribute('data-id')
      if (dataId) nodeDataIds.set(dataId, node)
      nodeDataIds.set(node.id, node)
    }

    for (const edge of this.model.edges) {
      const dataId = edge.el.getAttribute('data-id') ?? ''
      const dataFrom = edge.el.getAttribute('data-from')
      const dataTo = edge.el.getAttribute('data-to')

      let source: GraphElement | undefined
      let target: GraphElement | undefined

      if (dataFrom && dataTo) {
        source = nodeDataIds.get(dataFrom) ??
          this.model.nodes.find(n => n.el.getAttribute('data-id') === dataFrom)
        target = nodeDataIds.get(dataTo) ??
          this.model.nodes.find(n => n.el.getAttribute('data-id') === dataTo)
      }

      if (!source || !target) {
        const underscoreMatch = dataId.match(/^(?:L|id)_(.+?)_(.+?)_\d+$/)
        if (underscoreMatch) {
          const [, srcPart, tgtPart] = underscoreMatch
          source = this.findNodeByPartialId(srcPart)
          target = this.findNodeByPartialId(tgtPart)
        }
      }

      if (!source || !target) {
        const hyphenMatch = dataId.match(/^id_(entity-.+?)_(entity-.+?)_\d+$/)
        if (hyphenMatch) {
          const [, srcPart, tgtPart] = hyphenMatch
          source = nodeDataIds.get(srcPart) ?? this.findNodeByPartialId(srcPart)
          target = nodeDataIds.get(tgtPart) ?? this.findNodeByPartialId(tgtPart)
        }
      }

      if (!source || !target) {
        const legacyMatch = edge.id.match(/L[_-](.+?)[_-](.+?)(?:[_-]\d+)?$/)
        if (legacyMatch) {
          const [, srcPart, tgtPart] = legacyMatch
          source = this.findNodeByPartialId(srcPart)
          target = this.findNodeByPartialId(tgtPart)
        }
      }

      if (source && target) {
        if (!source.connections.outgoing.includes(target.id)) {
          source.connections.outgoing.push(target.id)
        }
        if (!target.connections.incoming.includes(source.id)) {
          target.connections.incoming.push(source.id)
        }
      }
    }
  }

  private findNodeByPartialId(partial: string): GraphElement | undefined {
    if (!this.model) return undefined
    return this.model.nodes.find(n => {
      const nodeDataId = n.el.getAttribute('data-id') ?? ''
      return n.id === partial ||
        nodeDataId === partial ||
        n.id.includes(partial) ||
        nodeDataId.includes(partial)
    })
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
