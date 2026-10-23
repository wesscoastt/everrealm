import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { mountLook } from '../data/mountLooks';
import { PETS } from '../data/pets';
import { CreatureModel, mountModel } from '../entities/creatures';
import { Humanoid, type Appearance } from '../entities/humanoid';

// The store's windows: each card shows the thing itself, the very model the game draws, so a buyer
// sees exactly what they get (Wynncraft shows its pets the same way). Every window is drawn once, still,
// and the one under the pointer turns slowly. All of it through the game's own renderer into one
// small target, copied out, so the front page costs no second graphics context.

const W = 300, H = 190;

/** A figure to wear a cloak in the window, seen from behind. */
const WEARER: Appearance = { skin: '#d8a882', hair: '#4a2a18', hairStyle: 1, eyes: '#3a5a7a', tunic: '#3a4a5a', trim: '#c8a050', trousers: '#2e2a26', boots: '#2a1e14', frame: 'm' };

export class StoreShowcase {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
  private target = new THREE.WebGLRenderTarget(W, H);
  private pixels = new Uint8Array(W * H * 4);
  private pivot = new THREE.Group();
  private windows: { cv: HTMLCanvasElement; item: string; yaw: number }[] = [];
  private hot: HTMLCanvasElement | null = null;
  private raf = 0;
  private last = 0;
  private built = new Map<string, { root: THREE.Object3D; update?: (dt: number) => void; cam: [number, number, number, number] }>();

  constructor(private renderer: THREE.WebGLRenderer) {
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#1e2738');
    this.scene.add(new THREE.HemisphereLight('#dfe8ff', '#5a4a38', 1.6));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
    sun.position.set(4, 8, 5);
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshLambertMaterial({ color: '#3e5a2e' }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground, this.pivot);
  }

  /** Puts the item's model in this canvas, and turns it while the pointer is over the card. */
  attach(cv: HTMLCanvasElement, item: string, card: HTMLElement): void {
    cv.width = W; cv.height = H;
    const w = { cv, item, yaw: -0.7 };
    this.windows.push(w);
    card.addEventListener('pointerenter', () => { this.hot = cv; this.run(); });
    card.addEventListener('pointerleave', () => { if (this.hot === cv) this.hot = null; });
    this.draw(w, 0);
  }

  /** Forgets the windows (the page was redrawn or left). */
  clear(): void {
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.windows = []; this.hot = null;
  }

  private run(): void {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      const w = this.windows.find((x) => x.cv === this.hot && x.cv.isConnected);
      if (!w) { this.raf = 0; return; }
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      w.yaw += dt * 0.6;
      this.draw(w, dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** The model an item shows: a mount, a pet, or a cloak on someone's back. */
  private model(item: string): { root: THREE.Object3D; update?: (dt: number) => void; cam: [number, number, number, number] } | null {
    const hit = this.built.get(item);
    if (hit) return hit;
    const def = ITEMS[item];
    let made: { root: THREE.Object3D; update?: (dt: number) => void; cam: [number, number, number, number] } | null = null;
    if (def?.mount) {
      const look = mountLook(item, 0, 0);
      const m = look ? mountModel(look) : null;
      if (m) made = { root: m.root, update: (dt) => m.update(dt, 0), cam: [4.8, 2.5, 4.8, 1.25] };
    } else if (def?.pet && PETS[def.pet]) {
      const p = PETS[def.pet];
      const c = new CreatureModel(p.kind, p.pal);
      c.root.scale.multiplyScalar(p.scale);
      made = { root: c.root, update: (dt) => c.update(dt, 0), cam: [2.4, 1.3, 2.4, 0.45] };
    } else if (def?.capeDesign) {
      const h = new Humanoid({ ...WEARER, cape: '#2a3a5a', capeDesign: def.capeDesign });
      h.root.rotation.y = Math.PI;
      made = { root: h.root, cam: [3.4, 1.9, 3.4, 1.2] };
    }
    if (made) this.built.set(item, made);
    return made;
  }

  private draw(w: { cv: HTMLCanvasElement; item: string; yaw: number }, dt: number): void {
    const m = this.model(w.item);
    if (!m) return;
    this.pivot.clear();
    this.pivot.add(m.root);
    this.pivot.rotation.y = w.yaw;
    m.update?.(dt);
    // Framed by its own size: the whole of it in view, a little from above and to the side
    const box = new THREE.Box3().setFromObject(m.root), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const d = Math.max(size.x, size.y * 1.4, size.z) * 1.9 + 0.3;
    this.camera.position.set(mid.x + d * 0.62, mid.y + d * 0.32, mid.z + d * 0.62);
    this.camera.lookAt(mid.x, mid.y, mid.z);
    const r = this.renderer, was = r.getRenderTarget();
    r.setRenderTarget(this.target);
    r.render(this.scene, this.camera);
    r.readRenderTargetPixels(this.target, 0, 0, W, H, this.pixels);
    r.setRenderTarget(was);
    // The target's rows run bottom-up: turn them over for the canvas
    const img = new ImageData(W, H), row = W * 4;
    for (let y = 0; y < H; y++) img.data.set(this.pixels.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    w.cv.getContext('2d')?.putImageData(img, 0, 0);
  }
}
