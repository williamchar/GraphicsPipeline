import type { DrawItem, Mesh, AnimationState } from '../types';
import { HIGHLIGHT, LAYERS, SIZES, COLORS } from '../../config';
import { ThreeProjector } from '../projector/three-projector';
import { clamp01, lerp } from '../../util';
import { edgeProgress } from '../fsm/animation';
import type { InteractionState } from '../types';



export type InteractionLike =
  | { hoverType: 'vertex'; hoverId: number }
  | { hoverType: 'edge';   hoverId: number }
  | { hoverType: null;     hoverId: -1 };

export function emitHighlights(
  now: number,
  projector: ThreeProjector,
  mesh: Mesh,
  animation: AnimationState,
  interaction: InteractionState   // ← use your real app type
): DrawItem[] {
  const items: DrawItem[] = [];
  if (!interaction.hoverType || interaction.hoverId < 0) return items;

  if (interaction.hoverType === 'vertex') {
    const i = interaction.hoverId;
    if (i < 0 || i >= mesh.vertices.length) return items;

    const v = mesh.vertices[i];
    const depth = projector.worldToViewZ(v);

    // 1) Halo underlay (semi-translucent yellow), sits UNDER the white dot.
    items.push({
      kind: 'point',
      p: v,
      radiusPx: SIZES.vertexRadiusPx * HIGHLIGHT.vertexHaloScale,
      color: HIGHLIGHT.color,
      alpha: HIGHLIGHT.vertexHaloAlpha,
      depth,
      layer: LAYERS.POINT_HL_UNDERLAY,
    });

    // 2) Ensure a white dot exists on top (even if base points are hidden while IDLE).
    items.push({
      kind: 'point',
      p: v,
      radiusPx: SIZES.vertexRadiusPx,
      color: COLORS.vertex,
      alpha: 1,
      depth,
      layer: LAYERS.POINT_BASE,
    });

    return items;
  }

  if (interaction.hoverType === 'edge') {
    const ei = interaction.hoverId;
    if (ei < 0 || ei >= mesh.edges.length) return items;

    const [ai, bi] = mesh.edges[ei];
    const a = mesh.vertices[ai];
    const b = mesh.vertices[bi];

    let t = 1;
    if (animation.phase === 'EDGE_DRAWING') {
      t = clamp01(edgeProgress(ei, now, animation));
    }

    const end = (t >= 1)
      ? b
      : { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };

    const edgeDepth = (projector.worldToViewZ(a) + projector.worldToViewZ(b)) * 0.5;

    // 1) Underlay stroke (thicker, translucent), exact same segment length as base.
    items.push({
      kind: 'line',
      a,
      b: end,
      widthPx: SIZES.edgeWidthPx * HIGHLIGHT.edgeWidthScale,
      color: HIGHLIGHT.color,
      alpha: HIGHLIGHT.edgeAlpha,
      depth: edgeDepth,
      layer: LAYERS.EDGE_HL_UNDERLAY,
    });

    // 2) Endpoint caps (enlarged white dots) so the yellow never "covers" vertices.
    const capR = SIZES.vertexRadiusPx * HIGHLIGHT.endCapScale;

    items.push({
      kind: 'point',
      p: a,
      radiusPx: capR,
      color: COLORS.vertex,
      alpha: 1,
      depth: projector.worldToViewZ(a),
      layer: LAYERS.POINT_BASE,
    });

    // Cap at the moving end (partial) or the far endpoint (full).
    items.push({
      kind: 'point',
      p: end,
      radiusPx: capR,
      color: COLORS.vertex,
      alpha: 1,
      depth: projector.worldToViewZ(end),
      layer: LAYERS.POINT_BASE,
    });

    return items;
  }

  return items;
}
