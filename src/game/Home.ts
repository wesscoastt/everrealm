import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { COTTAGE } from '../data/places_regional';
import { createPropMaterials, furniture } from '../world/props';

// A home of your own: Wendside Cottage, on the road east of Hollin Ford. Furniture is bought as
// items; arranging the house turns them into pieces on the floor, saved in the 'home' flag as
// [item, x, z, quarter-turns]. Only the owner sees their own arrangement.

export type Piece = [item: string, x: number, z: number, turn: number];

export interface HomeHost {
  scene: THREE.Scene;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  count(item: string): number;
  give(item: string): boolean;
  take(item: string): boolean;
  player(): THREE.Vector3;
  yaw(): number;
  system(text: string): void;
  sound(name: string): void;
}

/** The floor you may furnish: inside the walls, half a block clear of them. */
const IN = { x0: COTTAGE.x0 + 1.5, x1: COTTAGE.x0 + COTTAGE.w - 1.5, z0: COTTAGE.z0 + 1.5, z1: COTTAGE.z0 + COTTAGE.d - 1.5 };
const MAX_PIECES = 24;

export class Home {
  private M = createPropMaterials();
  private group = new THREE.Group();
  private ghost: THREE.Group | null = null;
  private tray: HTMLDivElement | null = null;
  /** The item being placed, and its quarter-turns. */
  private holding: string | null = null;
  private turn = 0;
  active = false;

  constructor(private host: HomeHost) {
    host.scene.add(this.group);
    this.render();
  }

  get owned(): boolean { return !!this.host.flag('home'); }
  pieces(): Piece[] { const v = this.host.flag('home'); return Array.isArray(v) ? (v as Piece[]) : []; }
  inside(p: THREE.Vector3): boolean { return p.x > IN.x0 - 1 && p.x < IN.x1 + 1 && p.z > IN.z0 - 1 && p.z < IN.z1 + 1 && Math.abs(p.y - COTTAGE.floor) < 2.5; }

  render(): void {
    this.group.clear();
    for (const [item, x, z, t] of this.pieces()) {
      const def = ITEMS[item]?.furn;
      const g = def && furniture(this.M, def.model, def.tint ?? 0);
      if (!g) continue;
      g.position.set(x, COTTAGE.floor, z);
      g.rotation.y = (t * Math.PI) / 2;
      this.group.add(g);
    }
  }

  start(): void {
    if (!this.owned) return;
    this.active = true;
    this.buildTray();
    this.host.system('Arranging the house. Pick a piece, then E to set it down, R to turn it, X to pick up the nearest. Esc when you\'re done.');
  }

  stop(): void {
    this.active = false;
    this.hold(null);
    this.tray?.remove();
    this.tray = null;
  }

  private hold(item: string | null): void {
    if (this.ghost) { this.host.scene.remove(this.ghost); this.ghost = null; }
    this.holding = item;
    const def = item ? ITEMS[item]?.furn : null;
    const g = def ? furniture(this.M, def.model, def.tint ?? 0) : null;
    if (!g) { this.holding = null; this.buildTray(); return; }
    // A see-through copy of the piece follows the player around
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => { const c = x.clone(); c.transparent = true; c.opacity = 0.55; c.depthWrite = false; return c; });
      m.material = Array.isArray(m.material) ? mats : mats[0];
    });
    this.ghost = g;
    this.host.scene.add(g);
    this.buildTray();
  }

  /** Where the held piece would go: a block and a half in front, snapped to half blocks, kept inside. */
  private spot(): [number, number] {
    const p = this.host.player(), yaw = this.host.yaw();
    const snap = (v: number) => Math.round(v * 2) / 2;
    const x = snap(p.x - Math.sin(yaw) * 1.5), z = snap(p.z - Math.cos(yaw) * 1.5);
    return [Math.min(IN.x1, Math.max(IN.x0, x)), Math.min(IN.z1, Math.max(IN.z0, z))];
  }

  update(): void {
    if (!this.active) return;
    if (!this.inside(this.host.player())) { this.stop(); this.host.system('You step outside and leave the furniture where it is.'); return; }
    if (this.ghost) {
      const [x, z] = this.spot();
      this.ghost.position.set(x, COTTAGE.floor, z);
      this.ghost.rotation.y = (this.turn * Math.PI) / 2;
    }
  }

  rotate(): void { this.turn = (this.turn + 1) % 4; this.host.sound('click'); }

  place(): void {
    if (!this.holding) { this.host.system('Pick a piece from the tray first.'); return; }
    const list = this.pieces();
    if (list.length >= MAX_PIECES) { this.host.system(`The cottage holds ${MAX_PIECES} pieces. Pick something up first.`); return; }
    if (!this.host.take(this.holding)) { this.hold(null); return; }
    const [x, z] = this.spot();
    this.host.setFlag('home', [...list, [this.holding, x, z, this.turn]]);
    this.host.sound('pickup');
    this.render();
    if (this.host.count(this.holding) < 1) this.hold(null); else this.buildTray();
  }

  pickUp(): void {
    const list = this.pieces();
    const p = this.host.player();
    let best = -1, bd = 2.6;
    list.forEach(([, x, z], i) => { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = i; } });
    if (best < 0) { this.host.system('Nothing close enough to pick up.'); return; }
    const [item] = list[best];
    if (!this.host.give(item)) { this.host.system('Your pack is full.'); return; }
    list.splice(best, 1);
    this.host.setFlag('home', list);
    this.host.sound('pickup');
    this.render();
    this.buildTray();
  }

  private buildTray(): void {
    if (!this.active) return;
    if (!this.tray) {
      this.tray = document.createElement('div');
      this.tray.id = 'hometray';
      document.body.appendChild(this.tray);
    }
    const mine = Object.values(ITEMS).filter((d) => d.furn && this.host.count(d.id) > 0);
    const placed = this.pieces().length;
    this.tray.innerHTML = `<div class="ht-head"><b>Wendside Cottage</b><span>${placed}/${MAX_PIECES} placed</span></div>
      <div class="ht-list">${mine.length ? mine.map((d) => `<button data-it="${d.id}" class="${d.id === this.holding ? 'on' : ''}">${d.name} <i>×${this.host.count(d.id)}</i></button>`).join('') : '<p>No furniture in your pack. Perrin at the Charter Market and Tamsin in Hollin Ford sell it.</p>'}</div>
      <div class="ht-keys"><span><kbd>E</kbd> set down</span><span><kbd>R</kbd> turn</span><span><kbd>X</kbd> pick up</span><button data-done>Done</button></div>`;
    this.tray.querySelectorAll<HTMLElement>('[data-it]').forEach((b) => b.addEventListener('click', () => { this.hold(b.dataset.it === this.holding ? null : b.dataset.it!); }));
    this.tray.querySelector('[data-done]')?.addEventListener('click', () => this.stop());
  }
}
