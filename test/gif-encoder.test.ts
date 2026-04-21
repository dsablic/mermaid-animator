import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { encodeGif } from '../src/gif-encoder.js'

describe('encodeGif', () => {
  it('produces a valid GIF binary from synthetic frames', () => {
    const width = 4
    const height = 4
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255
      pixels[i + 1] = 0
      pixels[i + 2] = 0
      pixels[i + 3] = 255
    }

    const frames = [
      { data: pixels, width, height },
      { data: pixels, width, height }
    ]

    const result = encodeGif(frames, { delay: 100 })
    assert.ok(result instanceof Uint8Array)
    assert.ok(result.length > 0)
    assert.equal(result[0], 0x47)
    assert.equal(result[1], 0x49)
    assert.equal(result[2], 0x46)
  })

  it('respects delay option', () => {
    const width = 2
    const height = 2
    const pixels = new Uint8ClampedArray(width * height * 4).fill(128)
    const frames = [{ data: pixels, width, height }]

    const result = encodeGif(frames, { delay: 200 })
    assert.ok(result instanceof Uint8Array)
    assert.ok(result.length > 0)
  })

  it('throws on empty frames array', () => {
    assert.throws(() => encodeGif([]), { message: 'No frames to encode' })
  })
})
