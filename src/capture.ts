export async function renderSvgToImageData(
  svg: SVGSVGElement,
  width: number,
  height: number,
  background = '#fff'
): Promise<ImageData> {
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

  const img = new Image()
  img.width = width
  img.height = height
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}
