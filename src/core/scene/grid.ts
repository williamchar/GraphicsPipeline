// Builds a ground plane quad and grid lines on Y = groundY.
// Uses the projector to pick a sensible grid step so spacing ~ 20–40 CSS px.

import type { Vec3, Viewport } from '../types';
import { COLORS, SIZES } from '../../config';
import { ThreeProjector } from '../projector/three-projector';

export type GridResult = {
  ground: [Vec3, Vec3, Vec3, Vec3]; // p1..p4 in world-space (CCW)
  lines: Array<{ a: Vec3; b: Vec3 }>; // world-space line segments
  step: number;   // chosen world-unit step
  range: number;  // half-extent actually used
};

// Pick a "nice" step (…0.5,1,2,5×10^k…) so projected spacing ≈ targetPx
function chooseStep(pxPerUnit: number, targetPx = 28): number {
  if (pxPerUnit <= 0) return 1;
  const mant = [1, 2, 5];
  let best = 1, bestErr = Infinity;
  for (let exp = -3; exp <= 3; exp++) {
    const scale = Math.pow(10, exp);
    for (const m of mant) {
      const step = m * scale;
      const spacing = pxPerUnit * step;
      const err = Math.abs(spacing - targetPx);
      if (err < bestErr) {
        bestErr = err;
        best = step;
      }
    }
  }
  return best;
}

// Estimate px per world unit near origin on the ground plane.
function estimatePxPerUnit(projector: ThreeProjector, vp: Viewport, groundY: number): number {
  const p0 = { x: 0, y: groundY, z: 0 };
  const pxX = projector.worldToScreen({ x: 1, y: groundY, z: 0 }, vp, 'exact');
  const px0 = projector.worldToScreen(p0, vp, 'exact');
  const pxZ = projector.worldToScreen({ x: 0, y: groundY, z: 1 }, vp, 'exact');
  const dx = Math.hypot(pxX.x - px0.x, pxX.y - px0.y);
  const dz = Math.hypot(pxZ.x - px0.x, pxZ.y - px0.y);
  return Math.max(0.0001, Math.min(dx, dz));
}

export function buildGrid(
    projector: ThreeProjector,
    vp: Viewport,
    opts?: {
      groundY?: number;
      range?: number;         // half-extent (world units), centered at origin
      adaptive?: boolean;     // choose step based on pixel density
      maxLines?: number;
      stepOverride?: number;  // ← NEW: force a fixed world-unit step (e.g., 1)
    }
  ): GridResult {
    const groundY = opts?.groundY ?? -1;
    const baseRange = opts?.range ?? SIZES.gridMaxExtent;
    const adaptive = opts?.adaptive ?? true;
    const maxLines = Math.max(16, opts?.maxLines ?? 160);
  
    // --- STEP SELECTION ---
    const pxPerUnit = estimatePxPerUnit(projector, vp, groundY);
    let step = (opts?.stepOverride != null && opts.stepOverride > 0)
      ? opts.stepOverride                                // ← forced fixed step
      : (adaptive ? chooseStep(pxPerUnit, 28) : 1);
  
    // --- RANGE / LINE COUNT CLAMP ---
    // compute how many integer steps fit on each side using integer multiples
    const halfSteps = Math.floor(baseRange / step);
    let range = halfSteps * step; // snap range to an exact multiple of step
  
    const nominalLinesPerAxis = (halfSteps * 2) + 1; // positions: -N…0…+N
    if ((nominalLinesPerAxis * 2) > maxLines) {
      // keep step, reduce halfSteps so total lines stay bounded
      const allowed = Math.max(1, Math.floor((maxLines / 2 - 1) / 2));
      range = allowed * step;
    }
  
    // --- GROUND QUAD (CCW) ---
    const ground: [Vec3, Vec3, Vec3, Vec3] = [
      { x: -range, y: groundY, z: -range },
      { x:  range, y: groundY, z: -range },
      { x:  range, y: groundY, z:  range },
      { x: -range, y: groundY, z:  range },
    ];
  
    // --- GRID LINES BY INTEGER MULTIPLES (no float accumulation) ---
    const lines: Array<{ a: Vec3; b: Vec3 }> = [];
    const N = Math.round(range / step);
    for (let i = -N; i <= N; i++) {
      const v = i * step;
      // parallel to Z (vary X)
      lines.push({ a: { x: v, y: groundY, z: -range }, b: { x: v, y: groundY, z: range } });
      // parallel to X (vary Z)
      lines.push({ a: { x: -range, y: groundY, z: v }, b: { x: range, y: groundY, z: v } });
    }
  
    return { ground, lines, step, range };
  }
  