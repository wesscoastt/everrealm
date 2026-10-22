import * as THREE from 'three';
import { Appearance, HeldItem, Humanoid } from '../entities/humanoid';

// Your character in the pack, the way an MMO's character panel shows you: what you're wearing, on
// you, turning slowly, and you can drag it round. It's drawn by the game's own renderer into a
// corner of the frame, copied into the pack's canvas, and then the frame is drawn over it as usual,
// so there's no second WebGL context to pay for.

export class Doll {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 0.7, 0.1, 30);
  private model: Humanoid | null = null;
  private key = '';
  private readonly size = new THREE.Vector2();
  /** Which way it faces; the pack turns it when you drag. */
  yaw = 0.45;

  constructor() {
    this.scene.background = new THREE.Color('#121a2e');
    this.scene.add(new THREE.HemisphereLight('#e4ecff', '#3a2e24', 1.7));
    const sun = new THREE.DirectionalLight('#fff2dc', 2.3);
    sun.position.set(2.5, 4, 4);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#8ab0ff', 0.9);
    rim.position.set(-3, 2, -3);
    this.scene.add(rim);
    // A worn floor to stand on
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshLambertMaterial({ color: '#2a3048' }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.camera.position.set(0, 1.1, 4.0);
    this.camera.lookAt(0, 0.98, 0);
  }

  /** Dress it: rebuilt only when what you're wearing (or holding) changes. */
  set(look: Appearance, held: HeldItem): void {
    const key = JSON.stringify(look) + held;
    if (key === this.key) return;
    this.key = key;
    if (this.model) this.scene.remove(this.model.root);
    this.model = new Humanoid(look);
    this.model.setHeld(held);
    this.model.setState('idle');
    this.scene.add(this.model.root);
  }

  /** Draw it into `out`; call just before the frame is drawn. */
  draw(r: THREE.WebGLRenderer, dt: number, out: HTMLCanvasElement): void {
    const w = out.clientWidth, h = out.clientHeight;
    if (!this.model || !w || !h) return;
    const dpr = r.getPixelRatio(), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (out.width !== pw || out.height !== ph) { out.width = pw; out.height = ph; }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.model.update(dt, 0);
    this.model.root.rotation.y = this.yaw;
    r.getSize(this.size);
    r.setViewport(0, 0, w, h);
    r.setScissor(0, 0, w, h);
    r.setScissorTest(true);
    r.render(this.scene, this.camera);
    out.getContext('2d')?.drawImage(r.domElement, 0, r.domElement.height - ph, pw, ph, 0, 0, pw, ph);
    r.setScissorTest(false);
    r.setViewport(0, 0, this.size.x, this.size.y);
  }
}
