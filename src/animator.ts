import type { GraphElement, GraphModel, MermaidAnimatorOptions } from './types.js'
import { topologicalOrder, groupByLevel } from './ordering.js'

export interface AnimationSequence {
  play(): Promise<void>
  cancel(): void
  groups: GraphElement[][]
}

function hideAll(model: GraphModel): void {
  for (const el of model.elements) {
    el.el.classList.add('ma-hidden')
  }
}

function animateNode(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    { duration: options.duration, easing: options.easing, fill: 'forwards' }
  )
}

function animateCluster(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    { duration: options.duration, easing: options.easing, fill: 'forwards' }
  )
}

function animateEdge(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  const path = el.el.querySelector('path')
  if (path) {
    const length = path.getTotalLength?.() ?? 300
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    return path.animate(
      [
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
      ],
      { duration: options.duration * 1.5, easing: options.easing, fill: 'forwards' }
    )
  }
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: options.duration, easing: options.easing, fill: 'forwards' }
  )
}

function animateLabel(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  el.el.classList.remove('ma-hidden')
  return el.el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: options.duration * 0.8, easing: options.easing, fill: 'forwards' }
  )
}

function animateElement(el: GraphElement, options: MermaidAnimatorOptions): Animation {
  switch (el.category) {
    case 'cluster': return animateCluster(el, options)
    case 'node': return animateNode(el, options)
    case 'edge': return animateEdge(el, options)
    case 'label': return animateLabel(el, options)
  }
}

export function buildSequence(model: GraphModel, options: MermaidAnimatorOptions): AnimationSequence {
  const ordered = topologicalOrder(model.nodes)
  const groups = groupByLevel(ordered)

  const allOrdered: GraphElement[] = [
    ...model.clusters,
    ...groups.flat(),
    ...model.edges,
    ...model.labels
  ]

  let cancelled = false
  const activeAnimations: Animation[] = []

  async function play(): Promise<void> {
    cancelled = false
    hideAll(model)

    for (let i = 0; i < allOrdered.length; i++) {
      if (cancelled) return
      const anim = animateElement(allOrdered[i], options)
      activeAnimations.push(anim)
      await new Promise<void>(resolve => {
        setTimeout(resolve, options.stagger)
      })
    }

    await Promise.all(activeAnimations.map(a => a.finished.catch(() => {})))
  }

  function cancel(): void {
    cancelled = true
    for (const anim of activeAnimations) {
      anim.cancel()
    }
    activeAnimations.length = 0
  }

  return { play, cancel, groups }
}
