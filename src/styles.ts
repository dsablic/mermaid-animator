import type { Theme } from './themes.js'

const STYLE_ID = 'mermaid-animator-styles'

export function buildPopoverCss(theme: Theme): string {
  return `
.ma-popover {
  position: absolute;
  background: ${theme.popoverBackground};
  color: ${theme.popoverText};
  border: 1px solid ${theme.popoverBorder};
  border-radius: 6px;
  padding: 10px 14px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  max-width: 280px;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.ma-popover-id {
  font-weight: 600;
  margin-bottom: 4px;
  color: ${theme.popoverIdColor};
}

.ma-popover-label {
  margin-bottom: 6px;
}

.ma-popover-connections {
  font-size: 12px;
  color: ${theme.popoverSecondaryText};
}
`
}

const BASE_CSS = `
.ma-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.ma-container svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ma-dimmed {
  opacity: 0.15 !important;
  transition: opacity 0.2s ease;
}

.ma-highlighted {
  opacity: 1 !important;
  transition: opacity 0.2s ease;
}

.ma-hidden {
  opacity: 0;
}
`

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = BASE_CSS
  document.head.appendChild(style)
}

const POPOVER_STYLE_ID = 'mermaid-animator-popover-styles'

export function injectPopoverStyles(theme: Theme): void {
  let style = document.getElementById(POPOVER_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = POPOVER_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = buildPopoverCss(theme)
}
