import type { MermaidAnimatorOptions } from './types.js'

export class PanZoomHandler {
  private container: HTMLElement
  private svg: SVGSVGElement
  private options: MermaidAnimatorOptions
  private viewBox: { x: number; y: number; w: number; h: number }
  private baseViewBox: { x: number; y: number; w: number; h: number }
  private isPanning = false
  private startX = 0
  private startY = 0
  private currentZoom = 1

  constructor(container: HTMLElement, svg: SVGSVGElement, options: MermaidAnimatorOptions) {
    this.container = container
    this.svg = svg
    this.options = options

    const vb = svg.viewBox.baseVal
    this.viewBox = { x: vb.x, y: vb.y, w: vb.width, h: vb.height }
    this.baseViewBox = { ...this.viewBox }

    if (options.pan) this.attachPan()
    if (options.zoom) this.attachZoom()
  }

  private updateViewBox(): void {
    this.svg.setAttribute(
      'viewBox',
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`
    )
  }

  private attachPan(): void {
    this.container.addEventListener('pointerdown', this.onPointerDown)
    this.container.addEventListener('pointermove', this.onPointerMove)
    this.container.addEventListener('pointerup', this.onPointerUp)
    this.container.addEventListener('pointerleave', this.onPointerUp)
  }

  private attachZoom(): void {
    this.container.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    this.isPanning = true
    this.startX = e.clientX
    this.startY = e.clientY
    this.container.style.cursor = 'grabbing'
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPanning) return
    const dx = e.clientX - this.startX
    const dy = e.clientY - this.startY
    const rect = this.container.getBoundingClientRect()
    const scaleX = this.viewBox.w / rect.width
    const scaleY = this.viewBox.h / rect.height

    this.viewBox.x -= dx * scaleX
    this.viewBox.y -= dy * scaleY
    this.startX = e.clientX
    this.startY = e.clientY
    this.updateViewBox()
  }

  private onPointerUp = (): void => {
    this.isPanning = false
    this.container.style.cursor = ''
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
    const newZoom = this.currentZoom * zoomFactor

    if (newZoom < this.options.minZoom || newZoom > this.options.maxZoom) return

    const rect = this.container.getBoundingClientRect()
    const mouseX = (e.clientX - rect.left) / rect.width
    const mouseY = (e.clientY - rect.top) / rect.height

    const newW = this.viewBox.w * zoomFactor
    const newH = this.viewBox.h * zoomFactor
    this.viewBox.x += (this.viewBox.w - newW) * mouseX
    this.viewBox.y += (this.viewBox.h - newH) * mouseY
    this.viewBox.w = newW
    this.viewBox.h = newH
    this.currentZoom = newZoom
    this.updateViewBox()
  }

  zoomIn(): void {
    this.applyZoom(0.8)
  }

  zoomOut(): void {
    this.applyZoom(1.25)
  }

  private applyZoom(factor: number): void {
    const newZoom = this.currentZoom * (1 / factor)
    if (newZoom < this.options.minZoom || newZoom > this.options.maxZoom) return

    const newW = this.viewBox.w * factor
    const newH = this.viewBox.h * factor
    this.viewBox.x += (this.viewBox.w - newW) * 0.5
    this.viewBox.y += (this.viewBox.h - newH) * 0.5
    this.viewBox.w = newW
    this.viewBox.h = newH
    this.currentZoom = newZoom
    this.updateViewBox()
  }

  fitToView(): void {
    this.viewBox = { ...this.baseViewBox }
    this.currentZoom = 1
    this.updateViewBox()
  }

  destroy(): void {
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointerleave', this.onPointerUp)
    this.container.removeEventListener('wheel', this.onWheel)
  }
}
