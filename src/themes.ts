export interface Theme {
  name: string
  background: string
  mermaidTheme: string
  edgeColors: string[]
  dotGlowOpacity: number
  nodeStrokeWidth: number
  nodeFillOpacity: number
  nodeBorderDefault: string
  clusterStrokeWidth: number
  clusterFillOpacity: number
  clusterBorderOpacity: number
  popoverBackground: string
  popoverText: string
  popoverBorder: string
  popoverIdColor: string
  popoverSecondaryText: string
}

const VIBRANT_PALETTE = [
  '#06b6d4',
  '#a855f7',
  '#f472b6',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#60a5fa',
  '#f87171',
  '#c084fc',
  '#2dd4bf',
]

export const darkTheme: Theme = {
  name: 'dark',
  background: '#1a1a2e',
  mermaidTheme: 'dark',
  edgeColors: VIBRANT_PALETTE,
  dotGlowOpacity: 0.3,
  nodeStrokeWidth: 1.5,
  nodeFillOpacity: 0.35,
  nodeBorderDefault: '#4a4e69',
  clusterStrokeWidth: 1,
  clusterFillOpacity: 0.08,
  clusterBorderOpacity: 0.5,
  popoverBackground: '#1a1a2e',
  popoverText: '#e0e0e0',
  popoverBorder: '#333',
  popoverIdColor: '#7c9aff',
  popoverSecondaryText: '#aaa',
}

export const lightTheme: Theme = {
  name: 'light',
  background: '#ffffff',
  mermaidTheme: 'default',
  edgeColors: [
    '#0891b2',
    '#7c3aed',
    '#db2777',
    '#ea580c',
    '#ca8a04',
    '#059669',
    '#2563eb',
    '#dc2626',
    '#9333ea',
    '#0d9488',
  ],
  dotGlowOpacity: 0.2,
  nodeStrokeWidth: 1.5,
  nodeFillOpacity: 0.06,
  nodeBorderDefault: '#94a3b8',
  clusterStrokeWidth: 1.5,
  clusterFillOpacity: 0.06,
  clusterBorderOpacity: 0.8,
  popoverBackground: '#ffffff',
  popoverText: '#1a1a2e',
  popoverBorder: '#d1d5db',
  popoverIdColor: '#2563eb',
  popoverSecondaryText: '#6b7280',
}

const builtInThemes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
}

export function resolveTheme(theme: string | Theme): Theme {
  if (typeof theme === 'string') {
    const resolved = builtInThemes[theme]
    if (!resolved) throw new Error(`Unknown theme: "${theme}". Available: ${Object.keys(builtInThemes).join(', ')}`)
    return resolved
  }
  return theme
}
