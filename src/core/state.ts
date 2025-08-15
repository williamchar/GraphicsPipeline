// Minimal, framework-free store for the viewport.
// Slices + dirty flags + subscribe with selector to avoid needless work.

import type {
    AnimationState,
    CameraState,
    InteractionState,
    Mesh,
    UIState,
    Viewport,
    Vec3,
  } from './types';
  
  type Listener<T> = (value: T, prev: T) => void;
  type Selector<T> = (s: State) => T;
  
  export type State = {
    mesh: Mesh;
    camera: CameraState;
    viewport: Viewport;
    animation: AnimationState;
    interaction: InteractionState;
    ui: UIState;
  
    // Dirty flags (consumed by controller/viewport loop)
    projectionDirty: boolean;
    sceneDirty: boolean;
    labelsDirty: boolean;
  };
  
  // --- Initial data (a unit cube like your original) ---
  function cubeVertices(): Vec3[] {
    return [
      { x: -1, y: -1, z:  1 }, { x: -1, y: -1, z: -1 }, { x:  1, y: -1, z: -1 }, { x:  1, y: -1, z:  1 },
      { x: -1, y:  1, z:  1 }, { x: -1, y:  1, z: -1 }, { x:  1, y:  1, z: -1 }, { x:  1, y:  1, z:  1 },
    ];
  }
  function cubeEdges(): [number, number][] {
    return [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ];
  }
  
  const initialState: State = {
    mesh: { vertices: cubeVertices(), edges: cubeEdges() },
    camera: {
      position: { x: 5, y: 3.5, z: 5.5 },
      target:   { x: 0, y: 0.5, z: 0   },
      up:       { x: 0, y: 1,   z: 0   },
      fovDeg: 45,
      near: 0.1,
      far: 100,
    },
    viewport: { width: 0, height: 0, dpr: 1 },
    animation: { phase: 'IDLE', currentIndex: 0, startTime: 0, hasCompletedOnce: false },
    interaction: { hoverType: null, hoverId: -1, mouse: { x: 0, y: 0 } },
    ui: { showLiveCoords: false, isLiveAnimating: false },
  
    projectionDirty: true,
    sceneDirty: true,
    labelsDirty: true,
  };
  
  // --- Simple store implementation ---
  let state: State = initialState;
  
  type Sub<T> = { selector: Selector<T>; cb: Listener<T>; last: T | undefined };
  const subs: Sub<any>[] = [];
  
  export function getState(): State {
    return state;
  }
  
  export function setState(patch: Partial<State>, options?: { silent?: boolean }): void {
    const prev = state;
    state = { ...state, ...patch };
  
    if (options?.silent) return;
  
    // Notify subscribers whose selected slice changed by reference
    for (const s of subs) {
      const nextVal = s.selector(state);
      if (s.last !== nextVal) {
        const prevVal = s.last as any;
        s.last = nextVal;
        s.cb(nextVal, prevVal);
      }
    }
  }
  
  export function subscribe<T>(selector: Selector<T>, cb: Listener<T>): () => void {
    const sub: Sub<T> = { selector, cb, last: selector(state) };
    subs.push(sub);
    return () => {
      const i = subs.indexOf(sub);
      if (i >= 0) subs.splice(i, 1);
    };
  }
  
  // Phase timing helper (skeleton; full FSM hooks can be added later)
  export function advancePhase(now: number): void {
    const { animation } = state;
    if (animation.phase === 'IDLE' || animation.phase === 'COMPLETE') return;
    if (animation.startTime === 0) {
      setState({ animation: { ...animation, startTime: now } }, { silent: true });
      return;
    }
    // The scene builder/loop will interpret durations; here we only store timebase.
  }
  