import type { PanZoomHandler } from './pan-zoom.js'

export interface KeyboardCallbacks {
  onFitToView: () => void
  onDismiss: () => void
  panZoom: PanZoomHandler | null
  container: HTMLElement
}

export class KeyboardHandler {
  private callbacks: KeyboardCallbacks
  private container: HTMLElement

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks
    this.container = callbacks.container
    this.container.setAttribute('tabindex', '0')
    this.container.addEventListener('keydown', this.onKeyDown)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault()
        this.callbacks.panZoom?.zoomIn()
        break
      case '-':
        e.preventDefault()
        this.callbacks.panZoom?.zoomOut()
        break
      case '0':
        e.preventDefault()
        this.callbacks.onFitToView()
        break
      case 'Escape':
        this.callbacks.onDismiss()
        break
    }
  }

  destroy(): void {
    this.container.removeEventListener('keydown', this.onKeyDown)
  }
}
