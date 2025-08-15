// Canvas2D renderer: crisp strokes, DPR handling, and world→screen mapping via ThreeProjector.

import type { Renderer } from './types';       // this is src/core/renderer/types.ts
import type { Vec3, Viewport } from '../types'; // go up to src/core/types.ts (one level up)
import { ThreeProjector } from '../projector/three-projector';

// --- Crispness helpers (CSS px; renderer already scales for DPR) ---
function roundPx(v: number): number { return Math.round(v); }
function roundLabelBaselineY(v: number): number { return Math.round(v); }

function isFinite2(x: number, y: number) {
    return Number.isFinite(x) && Number.isFinite(y);
  }
  



export class Canvas2DRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projector: ThreeProjector;

  private width = 0;
  private height = 0;
  private dpr = 1;

  // cached matrices (not used by Canvas2D but kept for parity/debug)
  private viewMat?: Float32Array;
  private projMat?: Float32Array;

  // tokenized mono font; resolved once (falls back to a safe stack)
  private fontMono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  constructor(canvas: HTMLCanvasElement, projector: ThreeProjector) {
    this.canvas = canvas;
    const ctx =
      this.canvas.getContext('2d', { alpha: true, desynchronized: true }) ??
      this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context not available');
    this.ctx = ctx;
    this.projector = projector;

    // nicer line aesthetics
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.globalCompositeOperation = 'source-over'; // NEW


    // Resolve --font-mono once; keep fallback if token not set
    const root = document.documentElement;
    const mono = getComputedStyle(root).getPropertyValue('--font-mono').trim();
    if (mono) this.fontMono = mono;
  }

  resize(width: number, height: number, dpr: number): void {
    this.width  = Math.max(1, Math.floor(width));  // CHANGED: ensure ≥ 1
    this.height = Math.max(1, Math.floor(height)); // CHANGED: ensure ≥ 1

    this.dpr = Math.max(1, dpr);



    // Set backing store size
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    // Ensure CSS size reflects logical pixels
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Scale the context so drawing uses CSS px units
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over'; // NEW

  }


  

  clear(cssColor: string): void {
    if (this.width <= 0 || this.height <= 0) return; // NEW

    this.ctx.save();
    this.ctx.fillStyle = cssColor;
    this.ctx.globalCompositeOperation = 'source-over'; // NEW (belt-and-suspenders)
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  setCamera(view: Float32Array, proj: Float32Array): void {
    this.viewMat = view;
    this.projMat = proj;
    // Canvas2D doesn't use these matrices directly,
    // but we keep them for parity with other backends and potential debug overlays.
  }

  private worldToScreen(world: Vec3, rounding: 'rounded' | 'exact' = 'rounded'): { x: number; y: number } {
    if (this.width < 1 || this.height < 1) return { x: NaN as any, y: NaN as any }; // readiness guard
    const vp: Viewport = { width: this.width, height: this.height, dpr: 1 };        // <— CSS px
    return this.projector.worldToScreen(world, vp, rounding);
  }
  

  fillQuad(p1: Vec3, p2: Vec3, p3: Vec3, p4: Vec3, cssColor: string, alpha = 1): void {
    // Rounded screen coords keep edges crisp against grid lines.
    const s1 = this.worldToScreen(p1, 'exact');
    const s2 = this.worldToScreen(p2, 'exact');
    const s3 = this.worldToScreen(p3, 'exact');
    const s4 = this.worldToScreen(p4, 'exact');

        // NEW: bail if any screen coord is not finite
    if (
        !isFinite2(s1.x, s1.y) || !isFinite2(s2.x, s2.y) ||
        !isFinite2(s3.x, s3.y) || !isFinite2(s4.x, s4.y)
    ) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = cssColor;
    this.ctx.beginPath();
    this.ctx.moveTo(roundPx(s1.x), roundPx(s1.y));
    this.ctx.lineTo(roundPx(s2.x), roundPx(s2.y));
    this.ctx.lineTo(roundPx(s3.x), roundPx(s3.y));
    this.ctx.lineTo(roundPx(s4.x), roundPx(s4.y));
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  
  drawLine(a: Vec3, b: Vec3, widthPx: number, cssColor: string, alpha = 1): void {
    if (!(widthPx > 0) || !Number.isFinite(widthPx)) return; // NEW
    const s1 = this.worldToScreen(a, 'exact');
    const s2 = this.worldToScreen(b, 'exact');
    if (!isFinite2(s1.x, s1.y) || !isFinite2(s2.x, s2.y)) return;
    const x1 = roundPx(s1.x), y1 = roundPx(s1.y);
    const x2 = roundPx(s2.x), y2 = roundPx(s2.y);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = cssColor;
    this.ctx.lineWidth = widthPx;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPoint(p: Vec3, radiusPx: number, cssColor: string, alpha = 1): void {
    if (!(radiusPx > 0) || !Number.isFinite(radiusPx)) return; // NEW
    const s = this.worldToScreen(p, 'exact');
    if (!isFinite2(s.x, s.y)) return;
    const cx = roundPx(s.x), cy = roundPx(s.y);
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = cssColor;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawLabel(p: Vec3, text: string, cssColor = '#f0f0f0', alpha = 1): void {
    // Use exact X (sub-pixel kerning), but round the baseline Y for crisp text.
    const anchor = this.worldToScreen(p, 'exact');
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return;
    const bx = anchor.x;                    // sub-pixel OK for kerning
    const by = roundLabelBaselineY(anchor.y);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = cssColor;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.font = `12px ${this.fontMono}`;
    this.ctx.fillText(text, bx, by);
    this.ctx.restore();
  }

  present(): void {
    // no-op for Canvas2D; kept for parity with other backends
  }
}
