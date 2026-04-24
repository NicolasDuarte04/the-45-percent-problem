// §2 Design System — Frontier Tech Editorial (v2.0)

// Editorial (cream) canvas — §2.2
export const editorialColors = {
  paper: '#F7F4EC',
  paperSunk: '#EEEAE0',
  paperElev: '#FCFAF4',
  ink: '#141414',
  inkBody: '#2A2A2A',
  inkSoft: '#5A5550',
  inkQuiet: '#8A847C',
  rule: 'rgb(31 31 31 / 0.10)',
} as const;

// Quant (warm slate) canvas — §2.3, softened from v1.0
export const quantColors = {
  slateCanvas: '#0F1216',
  slatePanel: '#151A21',
  slateElev: '#1C222B',
  slateRule: '#262D37',
  slateInk: '#EEE8DD',
  slateInkSoft: '#A8AFBC',
  slateInkQuiet: '#6D7585',
} as const;

// Prism — data visualization palette — §2.4
// Selected in OKLCH for perceptual uniformity; verified for deuteranopia / protanopia / tritanopia.
export const prism = {
  peach: '#F9B88A',   // primary warm accent; M★ lineage
  coral: '#EC7C6A',   // secondary warm; M1 lineage
  rose: '#E76E8A',    // negative divergence; Misses in Ledger
  plum: '#8E5A8A',    // deep editorial accent; M3 macro-prior lineage
  indigo: '#5B6CEC',  // primary cool; M2 FIFA-blend lineage
  cyan: '#7ED0E8',    // links, focus, cool emphasis
  mint: '#88E0B6',    // positive divergence; Hits in Ledger
  sun: '#F5D76E',     // Volatility Gate flag
} as const;

// Semantic bindings — §2.4
export const semantic = {
  edgePositive: prism.mint,
  edgeNegative: prism.rose,
  gateTripped: prism.sun,
  accentEditorial: prism.peach,
  accentQuant: prism.cyan,
  ledgerHit: prism.mint,
  ledgerMiss: prism.rose,
} as const;

// Typography — §2.5
export const typography = {
  fontSerif: '"Source Serif 4 Variable"',
  fontSans: '"Inter Variable"',
  fontMono: '"JetBrains Mono Variable"',
} as const;

// Spacing — §2.6 (editorial 4-point base, quant 8-point base preserved)
export const spacing = {
  panelPaddingV: '12px',
  panelPaddingH: '16px',
  rowPadding: '6px',
  gridUnitEditorial: '4px',
  gridUnitQuant: '8px',
} as const;

// Motion — §2.7
export const motion = {
  pageFade: '160ms',
  disclosureDuration: '180ms',
  chartEnter: '240ms',
  hoverDuration: '120ms',
  hoverEasing: 'ease-out',
} as const;
