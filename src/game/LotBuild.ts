import * as THREE from 'three';
import { BUILD_BLOCKS } from '../data/content/buildyard';
import { LOT_D, LOT_W, type Lot } from '../data/housing';
import { ITEMS } from '../data/items';
import { B, isSolid } from '../world/blocks';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { LaidBlock } from './Building';

// Building by hand on your own lot, a block at a time: lay the blocks you've bought from a land clerk
// (data/content/buildyard.ts) anywhere inside the lot's stakes, from a few blocks under its floor to
// well above its roof, or dig out what's there, the builders' walls and the ground included. A block
// you laid comes back to your pack when you dig it out. What you lay is kept with your lease (the
// 'lotBlocks' flag, and the realm's book: server/homes.mjs), so everyone sees it (game/Building.ts).
// You build where you point: the mouse, or the middle of the screen on a phone.

/** How far under the lot's floor you may dig, and how high over it you may build. */
export const LOT_DOWN = 3, LOT_UP = 24;
/** Cells a lot keeps changed by hand (the realm's book holds no more). */
export const MAX_LAID = 2400;
/** How far from you a block can be laid or dug. */
const REACH = 7;

export interface LotBuildHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  /** Your lot, if you hold one. */
  lot(): Lot | null;
  laid(): LaidBlock[];
  setLaid(b: LaidBlock[]): void;
  count(item: string): number;
  take(item: string): boolean;
  give(item: string): boolean;
  player(): THREE.Vector3;
  /** The line you're building along: from the camera, the way you point. */
  aim(): { o: THREE.Vector3; d: THREE.Vector3 };
  system(text: string): void;
  sound(name: string): void;
}

type Cell = [number, number, number];

export class LotBuild {
  active = false;
  /** The block item in hand, or null for the spade. */
  private holding: string | null = null;
  private readonly ghost: THREE.LineSegments;
  private tray: HTMLDivElement | null = null;
  private place_: Cell | null = null;
  private dig_: Cell | null = null;

  constructor(private host: LotBuildHost) {
    this.ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03, 1.03, 1.03)), new THREE.LineBasicMaterial({ color: 0x9fe870, depthTest: false, transparent: true }));
    this.ghost.renderOrder = 10;
    this.ghost.visible = false;
    host.scene.add(this.ghost);
  }

  /** Standing on your own lot (or a step off it). */
  onLot(p: THREE.Vector3): boolean {
    const l = this.host.lot();
    return !!l && p.x > l.x0 - 1 && p.x < l.x0 + LOT_W + 1 && p.z > l.z0 - 1 && p.z < l.z0 + LOT_D + 1 && Math.abs(p.y - l.base) < LOT_UP;
  }

  start(): void {
    if (!this.host.lot()) return;
    this.active = true;
    this.holding = BUILD_BLOCKS.find((b) => this.host.count(b.item) > 0)?.item ?? null;
    this.buildTray();
    this.host.system('Building on your lot. Pick a block, then E to lay it against the face you point at; X digs out the block you point at. Esc when you\'re done.');
  }

  stop(): void {
    this.active = false;
    this.ghost.visible = false;
    this.tray?.remove();
    this.tray = null;
  }

  /** A cell's place in the lot's box, from its corner and floor; null outside it. */
  private rel(x: number, y: number, z: number): Cell | null {
    const l = this.host.lot();
    if (!l) return null;
    const rx = x - l.x0, ry = y - l.base, rz = z - l.z0;
    return rx >= 0 && rx < LOT_W && rz >= 0 && rz < LOT_D && ry >= -LOT_DOWN && ry <= LOT_UP ? [rx, ry, rz] : null;
  }

  /** Whether a block in this cell would be inside you. */
  private inYou([x, y, z]: Cell, p: THREE.Vector3): boolean {
    return Math.abs(x + 0.5 - p.x) < 0.82 && Math.abs(z + 0.5 - p.z) < 0.82 && y + 1 > p.y && y < p.y + 1.8;
  }

  update(): void {
    if (!this.active) return;
    const p = this.host.player();
    if (!this.onLot(p)) { this.stop(); this.host.system('You step off your lot and put the tools down.'); return; }
    const { o, d } = this.host.aim();
    const hit = this.host.voxels.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 40);
    this.place_ = this.dig_ = null;
    if (hit && Math.hypot(hit.x + 0.5 - p.x, hit.y + 0.5 - p.y - 1, hit.z + 0.5 - p.z) <= REACH) {
      const dig: Cell = [hit.x, hit.y, hit.z], put: Cell = [hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz];
      if (this.rel(...dig) && hit.id !== B.Barrier) this.dig_ = dig;
      if (this.rel(...put) && !isSolid(this.host.voxels.get(...put)) && !this.inYou(put, p)) this.place_ = put;
    }
    const c = this.holding ? this.place_ : this.dig_;
    this.ghost.visible = !!c;
    if (c) {
      this.ghost.position.set(c[0] + 0.5, c[1] + 0.5, c[2] + 0.5);
      (this.ghost.material as THREE.LineBasicMaterial).color.set(this.holding ? 0x9fe870 : 0xe8806a);
    }
  }

  /** E: lay the block in hand against the face you point at (with the spade in hand, dig instead). */
  place(): void {
    if (!this.holding) { this.dig(); return; }
    const c = this.place_;
    if (!c) { this.host.system('Point at the face of a block on your lot to lay against it.'); this.host.sound('fail'); return; }
    const bb = BUILD_BLOCKS.find((b) => b.item === this.holding)!;
    const [rx, ry, rz] = this.rel(...c)!;
    const laid = this.host.laid();
    const rest = laid.filter(([x, y, z]) => !(x === rx && y === ry && z === rz));
    if (rest.length >= MAX_LAID) { this.host.system(`A lot keeps ${MAX_LAID} blocks laid or dug by hand. Dig some of yours out first.`); this.host.sound('fail'); return; }
    if (!this.host.take(this.holding)) { this.holding = null; this.buildTray(); return; }
    this.host.setLaid([...rest, [rx, ry, rz, bb.block]]);
    this.host.sound('stepStone');
    if (this.host.count(this.holding) < 1) this.holding = null;
    this.buildTray();
  }

  /** X: dig out the block you point at. One you laid comes back to your pack; the ground and the builders' walls don't. */
  dig(): void {
    const c = this.dig_;
    if (!c) { this.host.system('Point at a block on your lot to dig it out.'); this.host.sound('fail'); return; }
    const [rx, ry, rz] = this.rel(...c)!;
    const laid = this.host.laid();
    const mine = laid.find(([x, y, z]) => x === rx && y === ry && z === rz);
    const rest = laid.filter((b) => b !== mine);
    if (rest.length >= MAX_LAID) { this.host.system(`A lot keeps ${MAX_LAID} blocks laid or dug by hand. Put some back first.`); this.host.sound('fail'); return; }
    if (mine && mine[3] !== B.Air) {
      const bb = BUILD_BLOCKS.find((b) => b.block === mine[3]);
      if (bb && !this.host.give(bb.item)) { this.host.system('Your pack is full.'); this.host.sound('fail'); return; }
    }
    this.host.setLaid([...rest, [rx, ry, rz, B.Air]]);
    this.host.sound('oreBreak');
    this.buildTray();
  }

  private buildTray(): void {
    if (!this.active) return;
    if (!this.tray) {
      this.tray = document.createElement('div');
      this.tray.id = 'hometray';
      document.body.appendChild(this.tray);
    }
    const have = BUILD_BLOCKS.filter((b) => this.host.count(b.item) > 0);
    const l = this.host.lot()!;
    const name = (item: string) => ITEMS[item].name.replace(/ \(block\)$/, '');
    this.tray.innerHTML = `<div class="ht-head"><b>${l.name}</b><span>${this.host.laid().length}/${MAX_LAID} changed</span></div>
      <div class="ht-list"><button data-it="" class="${this.holding ? '' : 'on'}">Spade</button>${have.map((b) => `<button data-it="${b.item}" class="${b.item === this.holding ? 'on' : ''}">${name(b.item)} <i>×${this.host.count(b.item)}</i></button>`).join('')}${have.length ? '' : '<p>No blocks in your pack. The land clerks sell stone, brick, timber and glass.</p>'}</div>
      <div class="ht-keys"><span><kbd>E</kbd> lay</span><span><kbd>X</kbd> dig</span><button data-done>Done</button></div>`;
    this.tray.querySelectorAll<HTMLElement>('[data-it]').forEach((btn) => btn.addEventListener('click', () => { this.holding = btn.dataset.it || null; this.buildTray(); }));
    this.tray.querySelector('[data-done]')?.addEventListener('click', () => this.stop());
  }
}
