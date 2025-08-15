// DPI-stable, allocation-light hit testing in screen (CSS) pixels.
// Priority: vertex first, then edge. Edges are suppressed right at endpoints
// to prevent corner flicker. All thresholds come from config.HIT.

import type { Vec3, Viewport, Edge } from '../types';
import { HIT } from '../../config';
import { pointSegmentDistance } from '../../util';
import { ThreeProjector } from '../projector/three-projector';

export type Hit =
  | { type: 'vertex'; id: number }
  | { type: 'edge'; id: number }
  | null;

// Scratch buffers to avoid per-move allocations
let projX: number[] = [];
let projY: number[] = [];
function ensureProjCapacity(n: number) {
  if (projX.length < n) {
    projX.length = n;
    projY.length = n;
  }
}

/**
 * Hit-test in CSS pixel space. The renderer already handles DPR internally,
 * so DO NOT multiply thresholds by DPR here.
 *
 * vertex-first policy:
 *   - If the mouse is within HIT.vertexRadiusPx of any vertex, return that vertex.
 *   - Only if no vertex hit, test edges with HIT.edgeTolerancePx
 *   - Suppress edge hits very close to their endpoints (endpoint guard) to avoid flicker at corners.
 */
export function hitTest(
  mouseCss: { x: number; y: number },
  projector: ThreeProjector,
  viewport: Viewport,
  vertices: Vec3[],
  edges: Edge[],
  overrides?: { vertexRadiusPx?: number; edgeTolerancePx?: number }
): Hit {
  if (viewport.width <= 0 || viewport.height <= 0 || vertices.length === 0) {
    return null;
  }

  // thresholds (CSS px)
  const vRad = overrides?.vertexRadiusPx ?? HIT.vertexRadiusPx;
  const eTol = overrides?.edgeTolerancePx ?? HIT.edgeTolerancePx;
  const endpointGuard = vRad * 1.05; // small guard to avoid edge-vs-vertex jitter at corners

  // Project all vertices once (exact, subpixel)
  ensureProjCapacity(vertices.length);
  for (let i = 0; i < vertices.length; i++) {
    const s = projector.worldToScreen(vertices[i], viewport);
    projX[i] = s.x;
    projY[i] = s.y;
  }

  // 1) Vertex test (priority)
  let bestVId = -1;
  let bestVDist = Infinity;

  const mx = mouseCss.x;
  const my = mouseCss.y;

  for (let i = 0; i < vertices.length; i++) {
    const dx = mx - projX[i];
    const dy = my - projY[i];
    const d = Math.hypot(dx, dy);
    if (d < vRad && d < bestVDist) {
      bestVDist = d;
      bestVId = i;
    }
  }

  if (bestVId !== -1) {
    return { type: 'vertex', id: bestVId };
  }

  // 2) Edge test (only if no vertex hit)
  let bestEId = -1;
  let bestEDist = Infinity;

  for (let i = 0; i < edges.length; i++) {
    const [aIdx, bIdx] = edges[i];
    const ax = projX[aIdx], ay = projY[aIdx];
    const bx = projX[bIdx], by = projY[bIdx];

    // Quick bbox reject with tolerance
    const minX = (ax < bx ? ax : bx) - eTol;
    const maxX = (ax > bx ? ax : bx) + eTol;
    const minY = (ay < by ? ay : by) - eTol;
    const maxY = (ay > by ? ay : by) + eTol;
    if (mx < minX || mx > maxX || my < minY || my > maxY) continue;

    // Endpoint guard: if very close to endpoints, prefer "no edge" so vertex can win next frame
    const dA = Math.hypot(mx - ax, my - ay);
    const dB = Math.hypot(mx - bx, my - by);
    if (dA < endpointGuard || dB < endpointGuard) continue;

    // True segment distance
    const d = pointSegmentDistance(mx, my, ax, ay, bx, by);
    if (d < eTol && d < bestEDist) {
      bestEDist = d;
      bestEId = i;
    }
  }

  if (bestEId !== -1) {
    return { type: 'edge', id: bestEId };
  }

  return null;
}
