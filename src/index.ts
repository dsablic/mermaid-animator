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

    mermaid.initialize({
      startOnLoad: false,
      ...this.options.mermaid
    })

    const id = `ma-${Date.now()}`
    const { svg } = await mermaid.render(id, code)
    this.container.innerHTML = svg

    const svgEl = this.container.querySelector('svg')
    if (!svgEl) throw new Error('Mermaid did not produce an SVG element')

    this.model = discoverElements(svgEl)
    this.buildConnections()

    this.sequence = buildSequence(this.model, this.options)

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

    for (const edge of this.model.edges) {
      const match = edge.id.match(/L-(.+?)-(.+)/)
      if (!match) continue

      const [, sourceId, targetId] = match
      const source = this.model.nodes.find(n => n.id.includes(sourceId))
      const target = this.model.nodes.find(n => n.id.includes(targetId))

      if (source && target) {
        source.connections.outgoing.push(target.id)
        target.connections.incoming.push(source.id)
      }
    }
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
