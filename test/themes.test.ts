import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTheme, darkTheme, lightTheme } from '../src/themes.js'

describe('resolveTheme', () => {
  it('resolves "dark" to the dark theme', () => {
    const theme = resolveTheme('dark')
    assert.equal(theme.name, 'dark')
    assert.equal(theme.background, '#1a1a2e')
    assert.equal(theme.mermaidTheme, 'dark')
  })

  it('resolves "light" to the light theme', () => {
    const theme = resolveTheme('light')
    assert.equal(theme.name, 'light')
    assert.equal(theme.background, '#ffffff')
    assert.equal(theme.mermaidTheme, 'default')
  })

  it('throws for unknown theme name', () => {
    assert.throws(
      () => resolveTheme('neon'),
      { message: /Unknown theme: "neon"/ }
    )
  })

  it('returns a custom theme object as-is', () => {
    const custom = { ...darkTheme, name: 'custom', background: '#000' }
    const result = resolveTheme(custom)
    assert.equal(result.name, 'custom')
    assert.equal(result.background, '#000')
    assert.strictEqual(result, custom)
  })

  it('dark theme has popover style properties', () => {
    assert.ok(darkTheme.popoverBackground)
    assert.ok(darkTheme.popoverText)
    assert.ok(darkTheme.popoverBorder)
    assert.ok(darkTheme.popoverIdColor)
    assert.ok(darkTheme.popoverSecondaryText)
  })

  it('light theme has popover style properties', () => {
    assert.ok(lightTheme.popoverBackground)
    assert.ok(lightTheme.popoverText)
    assert.ok(lightTheme.popoverBorder)
    assert.ok(lightTheme.popoverIdColor)
    assert.ok(lightTheme.popoverSecondaryText)
  })

  it('dark and light themes have 10 edge colors each', () => {
    assert.equal(darkTheme.edgeColors.length, 10)
    assert.equal(lightTheme.edgeColors.length, 10)
  })
})
