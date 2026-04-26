import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc

export interface FrameData {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface GifEncodeOptions {
  delay?: number
  loop?: boolean
}

export function encodeGif(frames: FrameData[], options: GifEncodeOptions = {}): Uint8Array {
  const { delay = 100, loop = true } = options
  if (frames.length === 0) throw new Error('No frames to encode')

  const { width, height } = frames[0]
  const gif = GIFEncoder()

  for (const frame of frames) {
    const palette = quantize(frame.data, 256)
    const indexed = applyPalette(frame.data, palette)
    gif.writeFrame(indexed, width, height, { palette, delay })
  }

  if (loop) {
    gif.writeFrame(new Uint8Array(0), width, height, { palette: [[0, 0, 0]], delay: 0, repeat: 0 })
  }

  gif.finish()
  return gif.bytes()
}
