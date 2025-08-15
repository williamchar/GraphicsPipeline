// Pure scene builder → returns ONE unified draw list (base items + highlights)

import type {
    AnimationState,
    InteractionState,
    Mesh,
    Viewport,
    Vec3,
    DrawItem,
  } from '../types';
  import { COLORS, SIZES, LAYERS } from '../../config';
  import { ThreeProjector } from '../projector/three-projector';
  import { buildGrid } from './grid';
  import { edgeProgress } from '../fsm/animation';
  import { clamp01, lerp } from '../../util';
  import { emitHighlights } from '../highlight/highlight-system';
  
  export type SceneUnified = {
    items: DrawItem[]; // unified base items + highlights (depth-correct)
  };
  
  export function buildScene(
    now: number,
    projector: ThreeProjector,
    viewport: Viewport,
    mesh: Mesh,
    animation: AnimationState,
    interaction: InteractionState,
    ui: { isLiveAnimating: boolean }
  ): SceneUnified {
    const items: DrawItem[] = [];
  
    // --- Ground + Grid (unchanged look) ---
    const grid = buildGrid(projector, viewport, {
      groundY: -1,
      range: 2,        // half-extent: 2
      adaptive: false, // fixed 1-unit spacing for perfect alignment
      stepOverride: 1,
      maxLines: 100,
    });
  
    // Ground quad as a DrawItem (depth from center point)
    const groundCenter = { x: 0, y: -1, z: 0 };
    items.push({
      kind: 'quad',
      p1: grid.ground[0], p2: grid.ground[1], p3: grid.ground[2], p4: grid.ground[3],
      color: COLORS.ground,
      alpha: 1,
      depth: projector.worldToViewZ(groundCenter),
      layer: LAYERS.GROUND,
    });
  
    // Grid lines as DrawItems (depth per segment)
    for (const seg of grid.lines) {
      items.push({
        kind: 'line',
        a: seg.a,
        b: seg.b,
        widthPx: 0.5,
        color: COLORS.grid,
        alpha: 1,
        depth: depthAvg(projector, seg.a, seg.b),
        layer: LAYERS.GRID,
      });
    }
  
    // --- Edges (full when IDLE/COMPLETE, partial only during EDGE_DRAWING) ---
    for (let i = 0; i < mesh.edges.length; i++) {
      const [ai, bi] = mesh.edges[i];
      const a = mesh.vertices[ai];
      const b = mesh.vertices[bi];
  
      const t = (animation.phase === 'EDGE_DRAWING')
        ? clamp01(edgeProgress(i, now, animation))
        : 1;
  
      if (t <= 0) continue;
  
      const end = (t >= 1)
        ? b
        : { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
  
      items.push({
        kind: 'line',
        a,
        b: end,
        widthPx: SIZES.edgeWidthPx,
        color: COLORS.edge,
        alpha: 1,
        depth: depthAvg(projector, a, end), // use the visible segment for depth
        layer: LAYERS.EDGE_BASE,
      });
    } // ← close edges loop
  
    // --- Points (always visible at rest) ---
    const showPoints = true;
    const alpha = 1;
    if (showPoints) {
      for (let i = 0; i < mesh.vertices.length; i++) {
        const v = mesh.vertices[i];
        items.push({
          kind: 'point',
          p: v,
          radiusPx: SIZES.vertexRadiusPx,
          color: COLORS.vertex,
          alpha,
          depth: projector.worldToViewZ(v),
          layer: LAYERS.POINT_BASE,
        });
      }
    }
  
    // --- Highlights (depth-correct, layered into the same list) ---
    items.push(
      ...emitHighlights(now, projector, mesh, animation, interaction)
    );
  
    return { items };
  }
  
  // helpers
  function depthAvg(
    projector: ThreeProjector,
    a: Vec3, b: Vec3
  ): number {
    return (projector.worldToViewZ(a) + projector.worldToViewZ(b)) * 0.5;
  }
  