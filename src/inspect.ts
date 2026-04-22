import type { GraphElement, GraphModel } from './types.js'
import type { EventEmitter } from './events.js'
import type { AnimatorEvents } from './types.js'

export class InspectHandler {
  private container: HTMLElement
  private model: GraphModel
  private emitter: EventEmitter<AnimatorEvents>
  private popover: HTMLElement | null = null
  private activeNode: GraphElement | null = null
  private hoverNode: GraphElement | null = null
  private cleanups: (() => void)[] = []

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
      const onClick = (e: Event) => { e.stopPropagation(); this.inspectNode(node) }
      const onEnter = () => { if (this.activeNode) return; this.hoverNode = node; this.highlightConnected(node) }
      const onLeave = () => { if (this.activeNode || this.hoverNode !== node) return; this.hoverNode = null; this.clearHighlight() }
      node.el.addEventListener('click', onClick)
      node.el.addEventListener('mouseenter', onEnter)
      node.el.addEventListener('mouseleave', onLeave)
      this.cleanups.push(() => {
        node.el.removeEventListener('click', onClick)
        node.el.removeEventListener('mouseenter', onEnter)
        node.el.removeEventListener('mouseleave', onLeave)
      })
    }
    this.container.addEventListener('click', this.dismiss)
  }

  private highlightConnected(node: GraphElement): void {
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
      if (this.isEdgeConnected(edge, connected)) {
        edge.el.classList.add('ma-highlighted')
        edge.el.classList.remove('ma-dimmed')
      }
    }
  }

  private clearHighlight(): void {
    for (const el of this.model.elements) {
      el.el.classList.remove('ma-highlighted', 'ma-dimmed')
    }
  }

  inspectNode(node: GraphElement): void {
    this.dismiss()
    this.activeNode = node
    this.hoverNode = null
    this.emitter.emit('nodeClick', node)
    this.highlightConnected(node)
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

    const idDiv = document.createElement('div')
    idDiv.className = 'ma-popover-id'
    idDiv.textContent = node.id
    popover.appendChild(idDiv)

    if (node.label) {
      const labelDiv = document.createElement('div')
      labelDiv.className = 'ma-popover-label'
      labelDiv.textContent = node.label
      popover.appendChild(labelDiv)
    }

    const connections: string[] = []
    for (const id of node.connections.outgoing) connections.push(`→ ${id}`)
    for (const id of node.connections.incoming) connections.push(`← ${id}`)
    if (connections.length > 0) {
      const connDiv = document.createElement('div')
      connDiv.className = 'ma-popover-connections'
      connDiv.textContent = connections.join('\n')
      connDiv.style.whiteSpace = 'pre-line'
      popover.appendChild(connDiv)
    }

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
    this.hoverNode = null
    this.removePopover()
    this.clearHighlight()
  }

  destroy(): void {
    this.dismiss()
    for (const cleanup of this.cleanups) cleanup()
    this.cleanups.length = 0
    this.container.removeEventListener('click', this.dismiss)
  }
}
