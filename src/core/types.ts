// Shared shapes used across the app (state, scene, renderer).

export type Vec3 = { x: number; y: number; z: number };
export type VertexId = number;
export type Edge = [VertexId, VertexId];

export type Mesh = {
  vertices: Vec3[];
  edges: Edge[];
};

export type Phase =
  | 'IDLE'
  | 'INITIAL_DELAY'
  | 'VERTEX_CONSTRUCTION'
  | 'EDGE_DRAWING'
  | 'COMPLETE';

export type AnimationState = {
  phase: Phase;
  currentIndex: number;
  startTime: number; // performance.now() timebase; 0 means unset
  hasCompletedOnce: boolean;
};

export type InteractionState = {
  hoverType: 'vertex' | 'edge' | null;
  hoverId: number; // -1 when none
  mouse: { x: number; y: number }; // canvas local CSS px
};

export type UIState = {
  showLiveCoords: boolean;
  isLiveAnimating: boolean;
};

export type CameraState = {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fovDeg: number;
  near: number;
  far: number;
};

export type Viewport = {
  width: number;  // CSS px
  height: number; // CSS px
  dpr: number;    // device pixel ratio
};

// Optional: draw command shapes for scene builder outputs (kept tiny & generic)
export type LineCmd = {
  type: 'line';
  a: Vec3;
  b: Vec3;
  widthPx: number;
  color: string;
  alpha?: number;
  depth?: number; // camera-space z hint for ordering (far→near = ascending z)
};
export type PointCmd = {
  type: 'point';
  p: Vec3;
  radiusPx: number;
  color: string;
  alpha?: number;
  depth?: number;
};
export type LabelCmd = {
  type: 'label';
  p: Vec3;
  text: string;
  color?: string;
  alpha?: number;
  depth?: number;
};

// Unified draw items pipeline -------------------------------------------------
// Every drawable carries a view-space depth and a layer tiebreak (from config.LAYERS).
// Sorting rule later: (depth ASC → far-to-near), then (layer ASC).

export type Layer = number;

export interface BaseDrawItem {
  depth: number;
  layer: Layer;
  alpha?: number; // default 1
  color?: string; // optional; some items (labels) may supply at draw time
}

export interface QuadItem extends BaseDrawItem {
  kind: 'quad';
  p1: Vec3; p2: Vec3; p3: Vec3; p4: Vec3;
  color: string;
}

export interface LineItem extends BaseDrawItem {
  kind: 'line';
  a: Vec3; b: Vec3;
  widthPx: number;      // in CSS px; renderer manages DPR scaling internally
  color: string;
}

export interface PointItem extends BaseDrawItem {
  kind: 'point';
  p: Vec3;
  radiusPx: number;     // CSS px
  color: string;
}

export interface LabelItem extends BaseDrawItem {
  kind: 'label';
  p: Vec3;
  text: string;
  color?: string;
}

export type DrawItem = QuadItem | LineItem | PointItem | LabelItem;
