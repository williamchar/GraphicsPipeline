// Centralized configuration: zero magic numbers sprinkled around.
// Importable from anywhere (scene builder, renderer, UI).

export const COLORS = {
    bg: '#1a1a1a',
    panel: '#22252a',
    text: '#f0f0f0',
    muted: '#999999',
    axisX: '#ff6b6b',
    axisY: '#63ff9e',
    axisZ: '#70a1ff',
    grid: 'rgba(204, 204, 204, 0.15)',
    ground: 'rgba(50, 50, 50, 0.5)',
    edge: '#a0e6ff',
    vertex: '#ffffff',
    label: '#f0f0f0',
    highlight: '#f0ff63',
  } as const;
  
  export const DURATIONS = {
    initialDelay: 750,
    vertexBuild: 600,
    edgeDraw: 250,
  } as const;
  
  export const SIZES = {
    gridMaxExtent: 6,     // world units (half-extent per axis for baseline grid)
    axisLength: 2.0,      // world units
    vertexRadiusPx: 3,    // CSS px (renderer handles DPR)
    edgeWidthPx: 2.5,     // CSS px
    labelLeaderLenPx: 40, // CSS px
  } as const;
  
  // Hover thresholds (CSS pixels; renderer already handles DPR)
  export const HIT = {
    vertexRadiusPx: 12, // comfortable for HiDPI
    edgeTolerancePx: 8,
  } as const;
  
  export const EPS = 1e-6; // numeric epsilon for guards
  
  // ---------- HIGHLIGHT TUNING (single source of truth) ----------
  export const HIGHLIGHT = {
    // use the same color as COLORS.highlight to avoid drift
    color: COLORS.highlight,
  
    // vertex hover look
    vertexHaloAlpha: 0.45, // translucency of the halo under the white dot
    vertexHaloScale: 1.8,  // halo radius = vertexRadiusPx * this
  
    // edge hover look
    edgeWidthScale: 1.6,   // underlay line width = edgeWidthPx * this
    edgeAlpha: 0.45,       // translucency of the edge underlay
  
    // endpoints when an edge is highlighted (to avoid line bleeding over vertices)
    endCapScale: 1.6,      // end-cap dot radius = vertexRadiusPx * this
  } as const;
  
  // ---------- DRAW ORDER LAYERS (tiebreak within the same depth) ----------
  export const LAYERS = {
    // lower numbers draw first (i.e., behind)
    GROUND: 10,
    GRID: 20,
  
    // highlight underlays render just beneath their base geometry
    EDGE_HL_UNDERLAY: 30,
    EDGE_BASE: 40,
  
    POINT_HL_UNDERLAY: 50,
    POINT_BASE: 60,
  
    LABEL: 70,
  } as const;
  
  // ---------- DEBUG SWITCHES (optional, off by default) ----------
  export const DEBUG = {
    drawDepth: false,     // overlay small depth numbers (for QA)
    forceLayerViz: false, // tint underlay/base/caps differently (for QA)
  } as const;
  