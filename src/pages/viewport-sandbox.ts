// Minimal viewport-only sandbox to iterate safely on projection + rendering.
// Uses unified scene builder (base + highlights) and the animation FSM.
// Press Space to start the construction animation; H cycles a manual highlight.

import { buildScene } from '../core/scene/drawcall-scene';
import { beginDrawCall, tickAnimation } from '../core/fsm/animation';
import { hitTest } from '../core/interaction/hit-test';
import { COLORS } from '../config';
import { getState, setState } from '../core/state';
import { ThreeProjector } from '../core/projector/three-projector';
import { Canvas2DRenderer } from '../core/renderer/canvas2d';
import type { DrawItem } from '../core/types';

// Ensure a canvas exists (you can also add one in HTML with id="gpu-canvas")
function ensureCanvas(): HTMLCanvasElement {
  const existing = document.getElementById('gpu-canvas') as HTMLCanvasElement | null;
  if (existing) return existing;
  const c = document.createElement('canvas');
  c.id = 'gpu-canvas';
  document.body.appendChild(c);
  return c;
}

function main() {
  const canvas = ensureCanvas();
  const projector = new ThreeProjector();
  const renderer = new Canvas2DRenderer(canvas, projector);

  // Initial sizing & DPR
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    renderer.resize(rect.width, rect.height, dpr);

    setState({
      viewport: { width: rect.width, height: rect.height, dpr },
      projectionDirty: true, // let RAF handle (re)configuration
      sceneDirty: true,
    });
  }
  window.addEventListener('resize', resize);
  resize();

  // Hover: hit test in CSS px; update only on change
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Ensure projector has a valid camera before hitTest (esp. first move)
    let s = getState();
    if (s.projectionDirty) {
    projector.configureCamera(s.camera, s.viewport);
    const mats = projector.getMatrices();
    renderer.setCamera(mats.view, mats.proj);
    setState({ projectionDirty: false }, { silent: true });
    s = getState();
    }


    const hit = hitTest(mouse, projector, s.viewport, s.mesh.vertices, s.mesh.edges);
    const nextType: 'vertex' | 'edge' | null = hit ? hit.type : null;
    const nextId = hit ? hit.id : -1;

    if (
      s.interaction.hoverType !== nextType ||
      s.interaction.hoverId !== nextId ||
      s.interaction.mouse.x !== mouse.x ||
      s.interaction.mouse.y !== mouse.y
    ) {
      setState(
        { interaction: { hoverType: nextType, hoverId: nextId, mouse }, sceneDirty: true },
        { silent: true }
      );
    }
  });

  canvas.addEventListener('mouseleave', () => {
    const s = getState();
    setState(
      { interaction: { ...s.interaction, hoverType: null, hoverId: -1 }, sceneDirty: true },
      { silent: true }
    );
  });

  // UX helpers:
  // - Space: start construction animation
  // - H: cycle manual highlight (vertex 0 → edge 0 → none)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const s = getState();
      setState(
        { animation: beginDrawCall(performance.now(), s.animation), sceneDirty: true },
        { silent: true }
      );
    } else if (e.code === 'KeyH') {
      const s = getState();
      let next: { hoverType: 'vertex' | 'edge' | null; hoverId: number };
      if (s.interaction.hoverType === null) {
        next = { hoverType: 'vertex', hoverId: 0 };
      } else if (s.interaction.hoverType === 'vertex') {
        next = { hoverType: 'edge', hoverId: 0 };
      } else {
        next = { hoverType: null, hoverId: -1 };
      }
      setState({ interaction: { ...s.interaction, ...next }, sceneDirty: true }, { silent: true });
    }
  });

  function renderFrame() {
    let state = getState();

    // Optional safety: skip when zero-sized
    if (state.viewport.width <= 0 || state.viewport.height <= 0) {
      requestAnimationFrame(renderFrame);
      return;
    }

    // 1) Update camera matrices only when needed
    if (state.projectionDirty) {
      projector.configureCamera(state.camera, state.viewport);
      const mats = projector.getMatrices();
      renderer.setCamera(mats.view, mats.proj);
      setState({ projectionDirty: false }, { silent: true });
      state = getState();
    }

    const now = performance.now(); // single frame timestamp for consistency

    // 2) Tick animation with the same timestamp
    const animNext = tickAnimation(now, state.animation, state.mesh);
    if (animNext !== state.animation) {
      setState({ animation: animNext, sceneDirty: true, labelsDirty: true }, { silent: true });
      state = getState();
    }

    // 3) Build scene (base + highlights) with the same timestamp
    const scene = buildScene(
        now,
        projector,
        state.viewport,
        state.mesh,
        state.animation,
        state.interaction,
        state.ui
    );
    
    renderer.clear(COLORS.bg);
    
    // 4) Sort: depth ASC (far → near), then layer ASC (underlay→base→caps/labels)
    const items = scene.items.slice(); // make a copy before sort
    items.sort((a, b) => {
        // For our view space (nearer = more negative), ASC gives far→near
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.layer - b.layer;
    });
    
    // 5) Draw unified list
    for (const it of items) {
        switch (it.kind) {
        case 'quad':
            renderer.fillQuad(it.p1, it.p2, it.p3, it.p4, it.color, it.alpha ?? 1);
            break;
        case 'line':
            renderer.drawLine(it.a, it.b, it.widthPx, it.color, it.alpha ?? 1);
            break;
        case 'point':
            renderer.drawPoint(it.p, it.radiusPx, it.color, it.alpha ?? 1);
            break;
        case 'label':
            renderer.drawLabel(it.p, it.text, it.color, it.alpha ?? 1);
            break;
        }
    }
    

    renderer.present();
    requestAnimationFrame(renderFrame);
  }

  requestAnimationFrame(renderFrame);
}

main();
