declare module 'gifenc' {
  interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: { palette?: number[][]; delay?: number }): void
    finish(): void
    bytes(): Uint8Array
  }
  function GIFEncoder(): GIFEncoderInstance
  function quantize(data: Uint8ClampedArray, maxColors: number): number[][]
  function applyPalette(data: Uint8ClampedArray, palette: number[][]): Uint8Array

  const gifenc: {
    GIFEncoder: typeof GIFEncoder
    quantize: typeof quantize
    applyPalette: typeof applyPalette
  }
  export default gifenc
}
