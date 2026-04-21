export type AnimationMode = 'auto' | 'stepped'

export interface MermaidAnimatorOptions {
  mode: AnimationMode
  stagger: number
  duration: number
  easing: string
  pan: boolean
  zoom: boolean
  inspect: boolean
  minZoom: number
  maxZoom: number
  mermaid: Record<string, unknown>
}

export type PartialOptions = Partial<MermaidAnimatorOptions>

export const DEFAULT_OPTIONS: MermaidAnimatorOptions = {
  mode: 'auto',
  stagger: 80,
  duration: 300,
  easing: 'ease-out',
  pan: true,
  zoom: true,
  inspect: true,
  minZoom: 0.1,
  maxZoom: 5,
  mermaid: { theme: 'default' }
}

export type ElementCategory = 'cluster' | 'node' | 'edge' | 'label'

export interface GraphElement {
  el: SVGElement
  category: ElementCategory
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  connections: { incoming: string[]; outgoing: string[] }
}

export interface GraphModel {
  elements: GraphElement[]
  nodes: GraphElement[]
  edges: GraphElement[]
  clusters: GraphElement[]
  labels: GraphElement[]
  svgElement: SVGSVGElement
}

export interface AnimatorEvents {
  animationStart: []
  animationEnd: []
  nodeClick: [node: GraphElement]
  step: [index: number, total: number]
}
