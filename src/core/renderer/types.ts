// Minimal renderer contract so draw code is swappable.
// Canvas2D today; Pixi/WebGL2/etc. later if you ever want them.

import type { Vec3 } from '../types';

export interface Renderer {
  resize(width: number, height: number, dpr: number): void;
  clear(cssColor: string): void;

  // Keep API consistent even if Canvas2D doesn't need matrices.
  // Useful for debugging overlays or future backends.
  setCamera(view: Float32Array, proj: Float32Array): void;

  fillQuad(p1: Vec3, p2: Vec3, p3: Vec3, p4: Vec3, cssColor: string, alpha?: number): void;




  drawLine(a: Vec3, b: Vec3, widthPx: number, cssColor: string, alpha?: number): void;
  drawPoint(p: Vec3, radiusPx: number, cssColor: string, alpha?: number): void;
  drawLabel(p: Vec3, text: string, cssColor?: string, alpha?: number): void;

  present(): void;
}
