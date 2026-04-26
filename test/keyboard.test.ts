import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const document = dom.window.document

describe('KeyboardHandler', () => {
  it('exports a KeyboardHandler class', async () => {
    const { KeyboardHandler } = await import('../src/keyboard.js')
    assert.equal(typeof KeyboardHandler, 'function')
  })

  it('interface requires container property', async () => {
    const { KeyboardHandler } = await import('../src/keyboard.js')
    const container = document.createElement('div') as unknown as HTMLElement
    const callbacks = {
      onFitToView: () => {},
      onDismiss: () => {},
      panZoom: null,
      container
    }
    const handler = new KeyboardHandler(callbacks)
    assert.ok(handler)
    handler.destroy()
  })

  it('sets tabindex on container', async () => {
    const { KeyboardHandler } = await import('../src/keyboard.js')
    const container = document.createElement('div') as unknown as HTMLElement
    const callbacks = {
      onFitToView: () => {},
      onDismiss: () => {},
      panZoom: null,
      container
    }
    const handler = new KeyboardHandler(callbacks)
    assert.equal(container.getAttribute('tabindex'), '0')
    handler.destroy()
  })
})
