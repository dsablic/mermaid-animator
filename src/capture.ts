export function loadSvgAsImage(
  svg: SVGSVGElement,
  width: number,
  height: number
): Promise<HTMLImageElement> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

  const img = new Image()
  img.width = width
  img.height = height
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export async function renderSvgToImageData(
  svg: SVGSVGElement,
  width: number,
  height: number,
  background = '#fff'
): Promise<ImageData> {
  const img = await loadSvgAsImage(svg, width, height)

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2d context from OffscreenCanvas')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}
