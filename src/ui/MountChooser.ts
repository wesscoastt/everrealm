import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { clothsOf, coatsOf, mountLook } from '../data/mountLooks';
import { mountModel, type CreatureModel } from '../entities/creatures';

// Choosing a mount's look before you pay: a coat and a saddle cloth (or a wagon's paint), with the
// animal itself turning slowly in a little window as you try them. The window is drawn by the game's
// own renderer into a small target and copied out, so it costs no second graphics context.

const W = 360, H = 230;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class MountChooser {
  private el: HTMLDivElement | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 60);
  private target = new THREE.WebGLRenderTarget(W, H);
  private pixels = new Uint8Array(W * H * 4);
  private model: CreatureModel | null = null;
  /** Turns the model about its middle (a wagon's is well ahead of its box). */
  private pivot = new THREE.Group();
  private raf = 0;
  private last = 0;
  private id = '';
  private coat = 0;
  private cloth = 0;

  constructor(private renderer: THREE.WebGLRenderer) {
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#2a3448');
    this.scene.add(new THREE.HemisphereLight('#dfe8ff', '#5a4a38', 1.6));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
    sun.position.set(4, 8, 5);
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshLambertMaterial({ color: '#4a6a34' }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.scene.add(this.pivot);
  }

  get open(): boolean { return !!this.el; }

  /** Opens on a mount for sale: `buy` gets the coat and cloth chosen. */
  show(id: string, price: string, canPay: boolean, buy: (coat: number, cloth: number) => void): void {
    this.close();
    this.id = id; this.coat = 0; this.cloth = 0;
    const el = document.createElement('div');
    el.id = 'mountpick';
    document.body.appendChild(el);
    this.el = el;
    const def = ITEMS[id];
    const coats = coatsOf(id), cloths = clothsOf(id), wagon = !!def.mount?.wagon;
    el.innerHTML = `<div class="mp-head"><b>${esc(def.name)}</b><button class="mp-x" data-close>✕</button></div>
      <canvas width="${W}" height="${H}"></canvas>
      <h6>${wagon ? 'The animal in the shafts' : 'Coat'} <i data-coatname></i></h6><div class="mp-row" data-coats>${coats.map((c, i) => `<button class="mp-sw" data-coat="${i}" title="${esc(c.name)}"><span style="background:linear-gradient(135deg, ${c.a} 0 62%, ${c.b} 62% 100%)"></span></button>`).join('')}</div>
      <h6>${wagon ? 'Paint and harness' : 'Saddle cloth'} <i data-clothname></i></h6><div class="mp-row" data-cloths>${cloths.map((c, i) => `<button class="mp-sw" data-cloth="${i}" title="${esc(c.name)}"><span style="background:${c.hex}"></span></button>`).join('')}</div>
      <div class="mp-foot"><span>Yours for good once bought. The look can't be changed after.</span><button class="btn" data-buy${canPay ? '' : ' disabled'}>Buy · ${esc(price)}</button></div>`;
    el.querySelectorAll<HTMLElement>('[data-coat]').forEach((b) => b.addEventListener('click', () => { this.coat = Number(b.dataset.coat); this.refresh(); }));
    el.querySelectorAll<HTMLElement>('[data-cloth]').forEach((b) => b.addEventListener('click', () => { this.cloth = Number(b.dataset.cloth); this.refresh(); }));
    el.querySelector('[data-close]')!.addEventListener('click', () => this.close());
    el.querySelector('[data-buy]')!.addEventListener('click', () => { const c = this.coat, k = this.cloth; this.close(); buy(c, k); });
    this.refresh();
    this.last = performance.now();
    const loop = (now: number) => { if (!this.el) return; this.draw(Math.min(0.1, (now - this.last) / 1000)); this.last = now; this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  close(): void {
    cancelAnimationFrame(this.raf);
    if (this.model) { this.pivot.remove(this.model.root); this.model = null; }
    this.el?.remove();
    this.el = null;
  }

  private refresh(): void {
    if (!this.el) return;
    const look = mountLook(this.id, this.coat, this.cloth);
    if (!this.model) this.pivot.rotation.y = -0.7;
    if (this.model) this.pivot.remove(this.model.root);
    this.model = look ? mountModel(look) : null;
    const long = !!look?.wagon;
    if (this.model) { this.model.root.position.z = long ? -0.7 : 0; this.pivot.add(this.model.root); }
    this.camera.position.set(long ? 6.6 : 4.6, long ? 3.6 : 2.5, long ? 6.6 : 4.6);
    this.camera.lookAt(0, long ? 1.2 : 1.25, 0);
    this.el.querySelectorAll<HTMLElement>('[data-coat]').forEach((b) => b.classList.toggle('on', Number(b.dataset.coat) === this.coat));
    this.el.querySelectorAll<HTMLElement>('[data-cloth]').forEach((b) => b.classList.toggle('on', Number(b.dataset.cloth) === this.cloth));
    this.el.querySelector('[data-coatname]')!.textContent = coatsOf(this.id)[this.coat]?.name ?? '';
    this.el.querySelector('[data-clothname]')!.textContent = clothsOf(this.id)[this.cloth]?.name ?? '';
  }

  private draw(dt: number): void {
    const cv = this.el?.querySelector('canvas');
    if (!cv || !this.model) return;
    this.pivot.rotation.y += dt * 0.45;
    this.model.update(dt, 0);
    const r = this.renderer, was = r.getRenderTarget();
    r.setRenderTarget(this.target);
    r.render(this.scene, this.camera);
    r.readRenderTargetPixels(this.target, 0, 0, W, H, this.pixels);
    r.setRenderTarget(was);
    // The target's rows run bottom-up: turn them over for the canvas
    const img = new ImageData(W, H), row = W * 4;
    for (let y = 0; y < H; y++) img.data.set(this.pixels.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    cv.getContext('2d')!.putImageData(img, 0, 0);
  }
}
