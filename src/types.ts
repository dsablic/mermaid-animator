import type { Theme } from './themes.js'

export interface MermaidAnimatorOptions {
  pan: boolean
  zoom: boolean
  inspect: boolean
  minZoom: number
  maxZoom: number
  theme: string | Theme
  dotSpeed: number
  dotsPerEdge: number
  dotRadius: number
  mermaid: Record<string, unknown>
}

export type PartialOptions = Partial<MermaidAnimatorOptions>

export const DEFAULT_OPTIONS: MermaidAnimatorOptions = {
  pan: true,
  zoom: true,
  inspect: true,
  minZoom: 0.1,
  maxZoom: 5,
  theme: 'dark',
  dotSpeed: 0.008,
  dotsPerEdge: 3,
  dotRadius: 3,
  mermaid: {}
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
  nodeClick: [node: GraphElement]
}
