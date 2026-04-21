import type { PanZoomHandler } from './pan-zoom.js'

export interface KeyboardCallbacks {
  onNext: () => void
  onPrev: () => void
  onReplay: () => void
  onFitToView: () => void
  onDismiss: () => void
  panZoom: PanZoomHandler | null
}

export class KeyboardHandler {
  private callbacks: KeyboardCallbacks

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks
    document.addEventListener('keydown', this.onKeyDown)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'Enter':
        e.preventDefault()
        this.callbacks.onNext()
        break
      case 'ArrowLeft':
        e.preventDefault()
        this.callbacks.onPrev()
        break
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
      case 'r':
      case 'R':
        e.preventDefault()
        this.callbacks.onReplay()
        break
    }
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown)
  }
}
