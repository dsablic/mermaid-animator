import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { PanZoomHandler } from '../src/pan-zoom.js'
import { DEFAULT_OPTIONS } from '../src/types.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const document = dom.window.document

function makeSvg(vb = { x: 0, y: 0, width: 800, height: 600 }): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as unknown as SVGSVGElement
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`)
  Object.defineProperty(svg, 'viewBox', {
    value: {
      baseVal: { ...vb }
    }
  })
  return svg
}

function makeContainer(svg: SVGSVGElement): HTMLElement {
  const div = document.createElement('div') as unknown as HTMLElement
  div.appendChild(svg as unknown as Node)
  Object.defineProperty(div, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 })
  })
  return div
}

describe('PanZoomHandler', () => {
  it('constructs without error', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const handler = new PanZoomHandler(container, svg, DEFAULT_OPTIONS)
    assert.ok(handler)
    handler.destroy()
  })

  it('fitToView restores original viewBox', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const handler = new PanZoomHandler(container, svg, DEFAULT_OPTIONS)

    handler.zoomIn()
    const afterZoom = svg.getAttribute('viewBox')
    assert.ok(afterZoom)
    assert.notEqual(afterZoom, '0 0 800 600')

    handler.fitToView()
    assert.equal(svg.getAttribute('viewBox'), '0 0 800 600')
    handler.destroy()
  })

  it('zoomIn reduces viewBox dimensions', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const handler = new PanZoomHandler(container, svg, DEFAULT_OPTIONS)
    handler.zoomIn()
    const parts = svg.getAttribute('viewBox')!.split(' ').map(Number)
    assert.ok(parts[2] < 800)
    assert.ok(parts[3] < 600)
    handler.destroy()
  })

  it('zoomOut increases viewBox dimensions', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const handler = new PanZoomHandler(container, svg, DEFAULT_OPTIONS)
    handler.zoomOut()
    const parts = svg.getAttribute('viewBox')!.split(' ').map(Number)
    assert.ok(parts[2] > 800)
    assert.ok(parts[3] > 600)
    handler.destroy()
  })

  it('zoomIn then zoomOut returns to approximately original size', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const handler = new PanZoomHandler(container, svg, DEFAULT_OPTIONS)
    handler.zoomIn()
    handler.zoomOut()
    const parts = svg.getAttribute('viewBox')!.split(' ').map(Number)
    assert.ok(Math.abs(parts[2] - 800) < 1)
    assert.ok(Math.abs(parts[3] - 600) < 1)
    handler.destroy()
  })

  it('respects maxZoom limit', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const opts = { ...DEFAULT_OPTIONS, maxZoom: 1.5 }
    const handler = new PanZoomHandler(container, svg, opts)
    for (let i = 0; i < 20; i++) handler.zoomIn()
    const parts = svg.getAttribute('viewBox')!.split(' ').map(Number)
    assert.ok(parts[2] > 0)
    handler.destroy()
  })

  it('respects minZoom limit', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const opts = { ...DEFAULT_OPTIONS, minZoom: 0.5 }
    const handler = new PanZoomHandler(container, svg, opts)
    for (let i = 0; i < 20; i++) handler.zoomOut()
    const parts = svg.getAttribute('viewBox')!.split(' ').map(Number)
    assert.ok(parts[2] < 10000)
    handler.destroy()
  })

  it('destroy removes event listeners without error', () => {
    const svg = makeSvg()
    const container = makeContainer(svg)
    const handler = new PanZoomHandler(container, svg, DEFAULT_OPTIONS)
    handler.destroy()
    handler.destroy()
  })
})
