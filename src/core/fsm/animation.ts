// Time-only finite state machine for the construction animation.
// Pure functions: no DOM, no canvas. Easy to test and reason about.

import type { AnimationState, Mesh } from '../types';
import { DURATIONS } from '../../config';
// @ts-expect-error: '../../util' module may not be found in some environments
import { clamp01, easeCubicInOut } from '../../util';

export function beginDrawCall(now: number, anim: AnimationState): AnimationState {
  return {
    phase: 'INITIAL_DELAY',
    currentIndex: 0,
    startTime: now,
    hasCompletedOnce: anim.hasCompletedOnce,
  };
}

export function tickAnimation(
  now: number,
  anim: AnimationState,
  mesh: Mesh,
  durations = DURATIONS
): AnimationState {
  const { phase, currentIndex, startTime } = anim;

  if (phase === 'IDLE' || phase === 'COMPLETE') return anim;
  if (startTime === 0) {
    return { ...anim, startTime: now };
  }

  const elapsed = now - startTime;

  switch (phase) {
    case 'INITIAL_DELAY': {
      if (elapsed >= durations.initialDelay) {
        return { phase: 'VERTEX_CONSTRUCTION', currentIndex: 0, startTime: now, hasCompletedOnce: anim.hasCompletedOnce };
      }
      return anim;
    }
    case 'VERTEX_CONSTRUCTION': {
      if (elapsed >= durations.vertexBuild) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= mesh.vertices.length) {
          return { phase: 'EDGE_DRAWING', currentIndex: 0, startTime: now, hasCompletedOnce: anim.hasCompletedOnce };
        }
        return { phase: 'VERTEX_CONSTRUCTION', currentIndex: nextIndex, startTime: now, hasCompletedOnce: anim.hasCompletedOnce };
      }
      return anim;
    }
    case 'EDGE_DRAWING': {
      if (elapsed >= durations.edgeDraw) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= mesh.edges.length) {
          return { phase: 'COMPLETE', currentIndex: 0, startTime: now, hasCompletedOnce: true };
        }
        return { phase: 'EDGE_DRAWING', currentIndex: nextIndex, startTime: now, hasCompletedOnce: anim.hasCompletedOnce };
      }
      return anim;
    }
  }

  return anim;
}

// Scene-facing helpers

export function vertexVisibility(
  i: number,
  now: number,
  anim: AnimationState,
  durations = DURATIONS
): { visible: boolean; alpha: number } {
  const { phase, currentIndex, startTime } = anim;

  if (phase === 'IDLE' || phase === 'INITIAL_DELAY') return { visible: false, alpha: 0 };
  if (phase === 'VERTEX_CONSTRUCTION') {
    if (i < currentIndex) return { visible: true, alpha: 1 };
    if (i === currentIndex) {
      const t = clamp01((now - startTime) / durations.vertexBuild);
      return { visible: true, alpha: easeCubicInOut(t) };
    }
    return { visible: false, alpha: 0 };
  }
  // EDGE_DRAWING or COMPLETE
  return { visible: true, alpha: 1 };
}

export function edgeProgress(
  i: number,
  now: number,
  anim: AnimationState,
  durations = DURATIONS
): number {
  const { phase, currentIndex, startTime } = anim;

  if (phase === 'EDGE_DRAWING') {
    if (i < currentIndex) return 1;
    if (i === currentIndex) return clamp01((now - startTime) / durations.edgeDraw);
    return 0;
  }
  if (phase === 'COMPLETE') return 1;
  return 0; // IDLE or VERTEX_CONSTRUCTION
}
