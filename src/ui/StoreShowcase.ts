import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { mountLook } from '../data/mountLooks';
import { PETS } from '../data/pets';
import { CreatureModel, mountModel } from '../entities/creatures';
import { Humanoid, type Appearance } from '../entities/humanoid';
import { COSTUMES } from '../data/costumes';

// The store's windows: each card shows the thing itself, the very model the game draws, so a buyer
// sees exactly what they get (Wynncraft shows its pets the same way). Every window is drawn once, still,
// and the one under the pointer turns slowly. All of it through the game's own renderer into one
// small target, copied out, so the front page costs no second graphics context.

const W = 300, H = 190;

/** What a window holds: the model, how it moves, and (a bundle) how its things each turn. */
interface Shown { root: THREE.Object3D; update?: (dt: number) => void; cam: [number, number, number, number]; spin?: (yaw: number) => void;
  /** Someone standing: framed closer, turned to face the window to begin with. */
  figure?: boolean }

/** A figure to wear a cloak in the window, seen from behind. */
const WEARER: Appearance = { skin: '#d8a882', hair: '#4a2a18', hairStyle: 1, eyes: '#3a5a7a', tunic: '#3a4a5a', trim: '#c8a050', trousers: '#2e2a26', boots: '#2a1e14', frame: 'm' };

export class StoreShowcase {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
  private target = new THREE.WebGLRenderTarget(W, H);
  private pixels = new Uint8Array(W * H * 4);
  private pivot = new THREE.Group();
  /** The stage each thing stands on: a low round dais of dark stone, its edge lit in the thing's own colour. */
  private ground = new THREE.Group();
  private ring = new THREE.MeshBasicMaterial({ color: '#e8c050', transparent: true, opacity: 0.85 });
  private pool = new THREE.MeshBasicMaterial({ color: '#e8c050', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
  /** A light from behind and above in the thing's colour, so its outline stands off the backdrop. */
  private rim = new THREE.DirectionalLight('#e8c050', 2.2);
  /** Each thing's backdrop, made once: its colours behind it, a glow where it stands, the edges dark. */
  private backdrops = new Map<string, THREE.CanvasTexture>();
  private windows: { cv: HTMLCanvasElement; item: string; yaw: number }[] = [];
  private hot: HTMLCanvasElement | null = null;
  private raf = 0;
  private last = 0;
  private built = new Map<string, Shown>();
  /** Who wears the costumes and cloaks in the windows: your own character when there is one (ESO's way), else a stranger. */
  private wearer: Appearance = WEARER;
  setWearer(look: Appearance | null): void {
    const next = look ? { ...look, costume: null, capeDesign: null } : WEARER;
    if (JSON.stringify(next) === JSON.stringify(this.wearer)) return;
    this.wearer = next;
    // (the costumed figures are made again on the new wearer; the rest keep)
    for (const [k, m] of this.built) if (k.split(',').some((id) => ITEMS[id]?.costume || ITEMS[id]?.capeDesign)) { m.root.parent?.remove(m.root); this.built.delete(k); }
  }

  constructor(private renderer: THREE.WebGLRenderer) {
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#1e2738');
    this.scene.add(new THREE.HemisphereLight('#dfe8ff', '#5a4a38', 1.6));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
    sun.position.set(4, 8, 5);
    this.rim.position.set(-5, 6, -7);
    this.scene.add(sun, this.rim);
    // The dais: dressed stone, a bevel round its top, a thin lit ring at the edge and a pool of light on it
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.62, 0.22, 56), new THREE.MeshLambertMaterial({ color: '#1a1b22' }));
    stone.position.y = -0.11;
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.5, 0.05, 56), new THREE.MeshLambertMaterial({ color: '#23252d' }));
    lip.position.y = -0.005;
    const edge = new THREE.Mesh(new THREE.RingGeometry(1.43, 1.5, 56), this.ring);
    edge.rotation.x = -Math.PI / 2; edge.position.y = 0.025;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), this.pool);
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03;
    this.ground.add(stone, lip, edge, pool);
    this.scene.add(this.ground, this.pivot);
  }

  /** The colour a thing is shown in: a costume's glow or trim, a mount's mane, a pet's or cloak's second colour. */
  private accent(item: string): string {
    const first = item.split(',')[0], def = ITEMS[first];
    let hex: string;
    if (def?.costume) { const c = COSTUMES[def.costume]?.look; hex = c?.gear?.glow ?? c?.trim ?? '#e8c050'; }
    else if (def?.mount) hex = def.mount.glow ? def.mount.mane ?? '#e8c050' : def.mount.cloth ?? '#e8c050';
    else hex = def?.icon?.b ?? '#e8c050';
    // (bright enough to light the thing: a dark trim, an archer's blood red, is lifted to its own lighter shade)
    const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    if (hsl.l < 0.5) c.setHSL(hsl.h, Math.min(1, hsl.s * 1.1), 0.5);
    return '#' + c.getHexString();
  }

  /** The backdrop behind a thing: deep night in its own colours, a glow behind where it stands, light falling from above, motes in it, the corners dark. */
  private backdrop(item: string): THREE.CanvasTexture {
    const hit = this.backdrops.get(item);
    if (hit) return hit;
    const first = item.split(',')[0], def = ITEMS[first];
    const acc = new THREE.Color(this.accent(item)), base = new THREE.Color(def?.icon?.a ?? '#1e2738').lerp(new THREE.Color('#0a0c14'), 0.78);
    const css = (c: THREE.Color, a = 1) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d')!;
    // Night, a shade lighter toward the top
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, css(base.clone().lerp(acc, 0.12))); sky.addColorStop(1, css(base.clone().multiplyScalar(0.55)));
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // The glow behind the thing
    const halo = g.createRadialGradient(W / 2, H * 0.48, 4, W / 2, H * 0.48, W * 0.55);
    halo.addColorStop(0, css(acc, 0.42)); halo.addColorStop(0.45, css(acc, 0.13)); halo.addColorStop(1, css(acc, 0));
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    // Shafts of light falling from above, faint
    g.globalCompositeOperation = 'lighter';
    for (const [x, w, a] of [[0.38, 26, 0.06], [0.52, 40, 0.08], [0.66, 22, 0.05]] as const) {
      const sh = g.createLinearGradient(0, 0, 0, H * 0.85); sh.addColorStop(0, css(acc, a)); sh.addColorStop(1, css(acc, 0));
      g.fillStyle = sh; g.beginPath(); g.moveTo(W * x - w / 2, 0); g.lineTo(W * x + w / 2, 0); g.lineTo(W * x + w * 1.6, H * 0.85); g.lineTo(W * x - w * 0.4, H * 0.85); g.closePath(); g.fill();
    }
    // Motes in the light, the same on every draw of this thing
    let seed = 0; for (const ch of item) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 28; i++) {
      const x = W * (0.15 + rnd() * 0.7), y = H * (0.08 + rnd() * 0.62), r = 0.5 + rnd() * 1.3;
      g.fillStyle = css(acc.clone().lerp(new THREE.Color('#ffffff'), 0.5), 0.25 + rnd() * 0.45); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // The corners dark, and a band of shadow along the bottom for the dais to sit in
    const vig = g.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, W * 0.62);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = vig; g.fillRect(0, 0, W, H);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.backdrops.set(item, tex);
    return tex;
  }

  /** Puts the item's model in this canvas, and turns it while the pointer is over the card. */
  attach(cv: HTMLCanvasElement, item: string, card: HTMLElement): void {
    cv.width = W; cv.height = H;
    const w = { cv, item, yaw: -0.7 };
    card.style.setProperty('--acc', this.accent(item)); // (the card's frame takes the thing's colour)
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

  /** The model a window shows: one item, or a bundle's items side by side (ids joined with commas). */
  private model(item: string): Shown | null {
    const hit = this.built.get(item);
    if (hit) return hit;
    const ids = item.split(',');
    const made = ids.length === 1 ? this.make(item) : this.row(ids);
    if (made) this.built.set(item, made);
    return made;
  }

  /** A bundle: everything in it stood in a row, each a little apart, so you see all of what you get. */
  private row(ids: string[]): Shown | null {
    const g = new THREE.Group(), parts = ids.map((id) => this.make(id)).filter((m): m is NonNullable<typeof m> => !!m);
    if (!parts.length) return null;
    let x = 0;
    for (const m of parts) {
      const w = new THREE.Box3().setFromObject(m.root).getSize(new THREE.Vector3());
      const half = Math.max(w.x, w.z) / 2 + 0.15;
      x += half; m.root.position.x = x; x += half;
      g.add(m.root);
    }
    for (const m of parts) m.root.position.x -= x / 2;
    return { root: g, update: (dt) => { for (const m of parts) m.update?.(dt); }, cam: [0, 0, 0, 0], spin: (yaw) => { for (const m of parts) m.root.rotation.y = yaw + (m.root.userData.face ?? 0); } };
  }

  /** One item's model: a mount, a pet, a costume on someone, or a cloak on someone's back. */
  private make(item: string): Shown | null {
    const def = ITEMS[item];
    let made: Shown | null = null;
    if (def?.mount) {
      const look = mountLook(item, 0, 0);
      const m = look ? mountModel(look) : null;
      if (m) made = { root: m.root, update: (dt) => m.update(dt, 0), cam: [4.8, 2.5, 4.8, 1.25] };
    } else if (def?.pet && PETS[def.pet]) {
      const p = PETS[def.pet];
      const c = new CreatureModel(p.kind, p.pal);
      c.root.scale.multiplyScalar(p.scale);
      made = { root: c.root, update: (dt) => c.update(dt, 0), cam: [2.4, 1.3, 2.4, 0.45] };
    } else if (def?.costume) {
      // Someone wearing it, turned three-quarters so the cloak and the front both show
      const h = new Humanoid({ ...this.wearer, costume: def.costume });
      h.root.userData.face = -0.5;
      made = { root: h.root, update: (dt) => h.update(dt, 0), cam: [3.4, 1.9, 3.4, 1.2], figure: true };
    } else if (def?.capeDesign) {
      const h = new Humanoid({ ...this.wearer, cape: this.wearer.cape ?? '#2a3a5a', capeDesign: def.capeDesign });
      h.root.rotation.y = Math.PI; h.root.userData.face = Math.PI;
      made = { root: h.root, cam: [3.4, 1.9, 3.4, 1.2] };
    }
    return made;
  }

  private draw(w: { cv: HTMLCanvasElement; item: string; yaw: number }, dt: number): void {
    const m = this.model(w.item);
    if (!m) return;
    this.pivot.clear();
    this.pivot.add(m.root);
    // A bundle is seen from the front, its things each turning in place; one thing turns whole
    if (m.spin) { this.pivot.rotation.y = 0; m.spin(w.yaw); } else this.pivot.rotation.y = w.yaw + (m.figure ? Math.PI / 4 + 0.7 : 0);
    m.update?.(dt);
    // Framed by its own size: the whole of it in view, a little from above and to the side
    const box = new THREE.Box3().setFromObject(m.root), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    // (a row is fitted to the window's width: its half-angle across is about 23 degrees)
    const d = m.spin ? Math.max(size.x * 1.3, size.y * 2.6) + size.z * 0.5 + 0.4 : m.figure ? size.y * 2.4 : Math.max(size.x, size.y * 1.4, size.z) * 1.9 + 0.3;
    // The thing's own backdrop and colour on the dais' edge, its pool and the light behind it
    this.scene.background = this.backdrop(w.item);
    const acc = this.accent(w.item);
    this.ring.color.set(acc); this.pool.color.set(acc); this.rim.color.set(acc);
    const span = Math.max(size.x, size.z);
    // (the dais a little wider than the thing on it, whatever its size)
    const k = Math.max(0.12, span * 0.52);
    this.ground.scale.set(k, Math.max(0.3, Math.min(1, k)), k);
    this.ground.position.set(mid.x, box.min.y, mid.z);
    if (m.spin) this.camera.position.set(mid.x, mid.y + d * 0.3, mid.z + d);
    else if (m.figure) this.camera.position.set(mid.x + d * 0.68, mid.y + d * 0.12, mid.z + d * 0.68);
    else this.camera.position.set(mid.x + d * 0.62, mid.y + d * 0.32, mid.z + d * 0.62);
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
