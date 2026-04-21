import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderSvgToImageData } from '../src/capture.js'

describe('renderSvgToImageData', () => {
  it('is a function', () => {
    assert.equal(typeof renderSvgToImageData, 'function')
  })
})
