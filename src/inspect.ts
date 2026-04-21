import type { GraphElement, GraphModel } from './types.js'
import type { EventEmitter } from './events.js'
import type { AnimatorEvents } from './types.js'

export class InspectHandler {
  private container: HTMLElement
  private model: GraphModel
  private emitter: EventEmitter<AnimatorEvents>
  private popover: HTMLElement | null = null
  private activeNode: GraphElement | null = null

  constructor(
    container: HTMLElement,
    model: GraphModel,
    emitter: EventEmitter<AnimatorEvents>
  ) {
    this.container = container
    this.model = model
    this.emitter = emitter
    this.attachListeners()
  }

  private attachListeners(): void {
    for (const node of this.model.nodes) {
      node.el.style.cursor = 'pointer'
      node.el.addEventListener('click', (e) => {
        e.stopPropagation()
        this.inspectNode(node)
      })
    }
    this.container.addEventListener('click', this.dismiss)
  }

  inspectNode(node: GraphElement): void {
    this.dismiss()
    this.activeNode = node
    this.emitter.emit('nodeClick', node)

    const connected = new Set<string>([node.id])
    for (const id of node.connections.outgoing) connected.add(id)
    for (const id of node.connections.incoming) connected.add(id)

    for (const el of this.model.elements) {
      if (connected.has(el.id)) {
        el.el.classList.add('ma-highlighted')
        el.el.classList.remove('ma-dimmed')
      } else {
        el.el.classList.add('ma-dimmed')
        el.el.classList.remove('ma-highlighted')
      }
    }

    for (const edge of this.model.edges) {
      const isConnected = this.isEdgeConnected(edge, connected)
      if (isConnected) {
        edge.el.classList.add('ma-highlighted')
        edge.el.classList.remove('ma-dimmed')
      }
    }

    this.showPopover(node)
  }

  private isEdgeConnected(edge: GraphElement, connectedNodes: Set<string>): boolean {
    const dataFrom = edge.el.getAttribute('data-from')
    const dataTo = edge.el.getAttribute('data-to')
    if (dataFrom && dataTo) {
      for (const nodeId of connectedNodes) {
        const node = this.model.nodes.find(n => n.id === nodeId)
        const nodeDataId = node?.el.getAttribute('data-id') ?? ''
        if (nodeDataId === dataFrom || nodeDataId === dataTo) return true
      }
    }

    const dataId = edge.el.getAttribute('data-id') ?? edge.id
    const underscoreMatch = dataId.match(/^(?:L|id)_(.+?)_(.+?)_\d+$/)
    if (underscoreMatch) {
      const [, srcPart, tgtPart] = underscoreMatch
      for (const nodeId of connectedNodes) {
        const node = this.model.nodes.find(n => n.id === nodeId)
        const nodeDataId = node?.el.getAttribute('data-id') ?? ''
        if (nodeId.includes(srcPart) || nodeId.includes(tgtPart) ||
            nodeDataId.includes(srcPart) || nodeDataId.includes(tgtPart)) {
          return true
        }
      }
    }

    const legacyMatch = dataId.match(/L[_-](.+?)[_-](.+)/)
    if (legacyMatch) {
      return connectedNodes.has(legacyMatch[1]) || connectedNodes.has(legacyMatch[2])
    }

    return false
  }

  private showPopover(node: GraphElement): void {
    this.removePopover()

    const popover = document.createElement('div')
    popover.className = 'ma-popover'

    let html = `<div class="ma-popover-id">${node.id}</div>`
    if (node.label) {
      html += `<div class="ma-popover-label">${node.label}</div>`
    }

    const connections: string[] = []
    for (const id of node.connections.outgoing) connections.push(`-> ${id}`)
    for (const id of node.connections.incoming) connections.push(`<- ${id}`)
    if (connections.length > 0) {
      html += `<div class="ma-popover-connections">${connections.join('<br>')}</div>`
    }

    popover.innerHTML = html

    const rect = this.container.getBoundingClientRect()
    const svgRect = node.el.getBoundingClientRect()
    popover.style.left = `${svgRect.left - rect.left + svgRect.width / 2}px`
    popover.style.top = `${svgRect.top - rect.top - 10}px`
    popover.style.transform = 'translate(-50%, -100%)'

    this.container.appendChild(popover)
    this.popover = popover
  }

  private removePopover(): void {
    if (this.popover) {
      this.popover.remove()
      this.popover = null
    }
  }

  dismiss = (): void => {
    this.activeNode = null
    this.removePopover()
    for (const el of this.model.elements) {
      el.el.classList.remove('ma-highlighted', 'ma-dimmed')
    }
  }

  destroy(): void {
    this.dismiss()
    this.container.removeEventListener('click', this.dismiss)
  }
}
