// Three-as-math-only projector: camera + world→screen + view-space depth.
// No Three renderer/scene; purely the math you want without rolling your own.

import { PerspectiveCamera, Vector3, Matrix4 } from 'three';
import type { CameraState, Vec3, Viewport } from '../types';
import { EPS } from '../../config';

export class ThreeProjector {
  private camera: PerspectiveCamera;
  // scratch objects to avoid allocations in hot paths
  private v3 = new Vector3();
  private viewMat = new Matrix4();

  constructor() {
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
  }

  configureCamera(cam: CameraState, vp: Viewport): void {
    // aspect and frustum
    this.camera.fov = cam.fovDeg;
    this.camera.aspect = Math.max(vp.width / Math.max(1, vp.height), EPS);
    this.camera.near = Math.max(cam.near, EPS);
    this.camera.far = Math.max(cam.far, this.camera.near + EPS);
    // pose
    this.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
    this.camera.up.set(cam.up.x, cam.up.y, cam.up.z);
    this.camera.lookAt(cam.target.x, cam.target.y, cam.target.z);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  updateOnResize(vp: Viewport): void {
    this.camera.aspect = Math.max(vp.width / Math.max(1, vp.height), EPS);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  worldToScreen(
    world: Vec3,
    vp: Viewport,
    rounding: 'rounded' | 'exact' = 'exact'   // was 'rounded'
  ): { x: number; y: number } {
    if (vp.width <= 0 || vp.height <= 0) {
      return { x: 0, y: 0 }; // early guard; avoids NaNs on first frame
    }
    this.v3.set(world.x, world.y, world.z).project(this.camera);
    const x = (this.v3.x + 1) * 0.5 * vp.width;
    const y = (1 - this.v3.y) * 0.5 * vp.height;
    return (rounding === 'rounded') ? { x: Math.round(x), y: Math.round(y) } : { x, y };
  }

  worldToViewZ(world: Vec3): number {
    this.viewMat.copy(this.camera.matrixWorldInverse);
    this.v3.set(world.x, world.y, world.z).applyMatrix4(this.viewMat);
    return this.v3.z;     // was: EPS clamp
  }

  getMatrices(): { view: Float32Array; proj: Float32Array } {
    // These are the actual internal Float32Arrays in three at runtime.
    const view = new Float32Array(this.camera.matrixWorldInverse.elements);
    const proj = new Float32Array(this.camera.projectionMatrix.elements);
    return { view, proj };
  }
}
