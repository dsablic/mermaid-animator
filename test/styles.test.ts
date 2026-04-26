import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { injectStyles, injectPopoverStyles, buildPopoverCss } from '../src/styles.js'
import { darkTheme, lightTheme } from '../src/themes.js'

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
const document = dom.window.document

describe('injectStyles', () => {
  it('injects a style element into the document head', () => {
    (globalThis as Record<string, unknown>).document = document
    injectStyles()
    const style = document.getElementById('mermaid-animator-styles')
    assert.ok(style)
    assert.ok(style.textContent?.includes('.ma-container'))
    assert.ok(style.textContent?.includes('.ma-dimmed'))
    assert.ok(style.textContent?.includes('.ma-highlighted'))
  })

  it('does not inject duplicate styles', () => {
    injectStyles()
    injectStyles()
    const styles = document.querySelectorAll('#mermaid-animator-styles')
    assert.equal(styles.length, 1)
  })
})

describe('buildPopoverCss', () => {
  it('generates CSS with dark theme colors', () => {
    const css = buildPopoverCss(darkTheme)
    assert.ok(css.includes(darkTheme.popoverBackground))
    assert.ok(css.includes(darkTheme.popoverText))
    assert.ok(css.includes(darkTheme.popoverBorder))
    assert.ok(css.includes(darkTheme.popoverIdColor))
    assert.ok(css.includes(darkTheme.popoverSecondaryText))
  })

  it('generates CSS with light theme colors', () => {
    const css = buildPopoverCss(lightTheme)
    assert.ok(css.includes(lightTheme.popoverBackground))
    assert.ok(css.includes(lightTheme.popoverText))
    assert.ok(css.includes(lightTheme.popoverBorder))
    assert.ok(css.includes(lightTheme.popoverIdColor))
    assert.ok(css.includes(lightTheme.popoverSecondaryText))
  })

  it('includes popover class selectors', () => {
    const css = buildPopoverCss(darkTheme)
    assert.ok(css.includes('.ma-popover'))
    assert.ok(css.includes('.ma-popover-id'))
    assert.ok(css.includes('.ma-popover-label'))
    assert.ok(css.includes('.ma-popover-connections'))
  })
})

describe('injectPopoverStyles', () => {
  it('injects popover styles into document head', () => {
    injectPopoverStyles(darkTheme)
    const style = document.getElementById('mermaid-animator-popover-styles')
    assert.ok(style)
    assert.ok(style.textContent?.includes(darkTheme.popoverBackground))
  })

  it('updates styles when theme changes', () => {
    injectPopoverStyles(darkTheme)
    const style = document.getElementById('mermaid-animator-popover-styles')
    assert.ok(style?.textContent?.includes(darkTheme.popoverIdColor))

    injectPopoverStyles(lightTheme)
    assert.ok(style?.textContent?.includes(lightTheme.popoverIdColor))
    assert.ok(!style?.textContent?.includes(darkTheme.popoverIdColor))
  })
})
