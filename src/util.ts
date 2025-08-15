// Small, shared helpers used across scene, animation, and hit-testing.
// Keep this lean; add only hot-path or widely reused utilities.

export function clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
  }
  export function clamp01(x: number): number {
    return clamp(x, 0, 1);
  }
  export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  export function invLerp(a: number, b: number, v: number): number {
    if (a === b) return 0;
    return (v - a) / (b - a);
  }
  export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp01(invLerp(edge0, edge1, x));
    return t * t * (3 - 2 * t);
  }
  export function easeCubicInOut(t: number): number {
    t = clamp01(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  export function approxEq(a: number, b: number, eps = 1e-6): boolean {
    return Math.abs(a - b) <= eps;
  }
  
  // 2D helpers (screen space)
  export function dist2(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }
  export function pointSegmentDistance(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
  ): number {
    const dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    const tt = clamp(t, 0, 1);
    const cx = ax + tt * dx, cy = ay + tt * dy;
    return Math.hypot(px - cx, py - cy);
  }
  
  // Formatting
  export function toFixedN(n: number, digits = 1): string {
    return n.toFixed(digits);
  }
  export function formatVec3(
    v: { x: number; y: number; z: number },
    digits = 1
  ): string {
    return `(${toFixedN(v.x, digits)},${toFixedN(v.y, digits)},${toFixedN(v.z, digits)})`;
  }
  