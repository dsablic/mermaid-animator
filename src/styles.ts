const STYLE_ID = 'mermaid-animator-styles'

const CSS = `
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

.ma-popover {
  position: absolute;
  background: #1a1a2e;
  color: #e0e0e0;
  border: 1px solid #333;
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
  color: #7c9aff;
}

.ma-popover-label {
  margin-bottom: 6px;
}

.ma-popover-connections {
  font-size: 12px;
  color: #aaa;
}
`

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}
