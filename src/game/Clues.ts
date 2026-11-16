import * as THREE from 'three';
import { clueFrom, isSought, LOOK_BY_ID, spokenAt, type ClueLook } from '../data/clues';
import type { WorldThing } from '../data/places_regional';
import type { GameApi } from './api';

// Quest clues you can see (data/clues.ts says what each looks like): while a quest wants a spot found, what's there is
// drawn on the ground (prints leading off, blood, a dropped satchel, a letter, scorching, bones, a snapped arrow, spilled
// grain, a scrap of fleece or cloth, trampled stems), with a soft glint over it that pulses so the eye finds it from a
// way off. Once it's found (the quest's when() no longer holds) it's gone. Only spots near you are built.

export interface CluesHost {
  scene: THREE.Scene;
  api: GameApi;
  player(): THREE.Vector3;
  /** The ground a spot stands on, or null if it isn't loaded. */
  ground(wt: WorldThing, nearY: number): number | null;
  /** The ground at any column near a height, for laying prints along. */
  groundAt(x: number, z: number, nearY: number): number | null;
}

/** Spots that aren't clues: the world's own fixtures, always there, and shown by their own models. */
const FIXTURE = /^(monument:|bank:|post:|yard:|stall:|board:|vault:|sign:|ferry:|bell:|well:)/;
const NEAR = 64, FAR = 80, GLINT_FAR = 34;

const mats = new Map<string, THREE.MeshLambertMaterial>();
const mat = (c: string, opacity = 1) => {
  const k = c + opacity;
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c, transparent: opacity < 1, opacity, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mats.set(k, m);
  }
  return m;
};
const box = new THREE.BoxGeometry(1, 1, 1);
const disc = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);
const blob = new THREE.IcosahedronGeometry(1, 0);
const rod = new THREE.CylinderGeometry(1, 1, 1, 6);

let glintTex: THREE.Texture | null = null;
function glintTexture(): THREE.Texture {
  if (glintTex) return glintTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,248,220,1)'); g.addColorStop(0.18, 'rgba(255,230,160,0.8)'); g.addColorStop(1, 'rgba(255,220,140,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  // a four-pointed star through it
  x.fillStyle = 'rgba(255,250,230,0.9)';
  x.fillRect(31, 4, 2, 56); x.fillRect(4, 31, 56, 2);
  glintTex = new THREE.CanvasTexture(c);
  glintTex.colorSpace = THREE.SRGBColorSpace;
  return glintTex;
}

/** A steady number from a spot's id, so its prints always run the same way. */
const seed = (id: string) => { let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };

interface Built { group: THREE.Group; glint: THREE.Sprite; phase: number }

export class Clues {
  private built = new Map<string, Built>();
  private list: { wt: WorldThing; look: ClueLook }[] | null = null;
  private wait = 0;
  private t = 0;

  constructor(private host: CluesHost) {}

  /** The spots that are clues, and their looks (worked out once, the first time: content is all in by then). */
  private clues(all: WorldThing[]): { wt: WorldThing; look: ClueLook }[] {
    if (!this.list) {
      this.list = [];
      for (const wt of all) {
        if (!wt.when || wt.look === 'none' || FIXTURE.test(wt.id)) continue;
        // (what you're told there counts only where you're searching: elsewhere it describes, it doesn't lie on the ground)
        const look = wt.look ?? LOOK_BY_ID[wt.id] ?? clueFrom(wt.label, isSought(wt.label) ? spokenAt(wt.use) : undefined);
        // (a plain glint only over what you're looking for: not over a bench to work at or a bell to ring)
        if (look === 'glint' && !wt.look && !isSought(wt.label)) continue;
        this.list.push({ wt, look });
      }
    }
    return this.list;
  }

  update(dt: number, all: WorldThing[]): void {
    this.t += dt;
    const p = this.host.player();
    if ((this.wait -= dt) <= 0) {
      this.wait = 0.5;
      for (const { wt, look } of this.clues(all)) {
        const d = Math.hypot(wt.x - p.x, wt.z - p.z);
        const b = this.built.get(wt.id);
        if (d > FAR) { if (b) this.drop(wt.id, b); continue; }
        if (d > NEAR && !b) continue;
        let want = false;
        try { want = !!wt.when!(this.host.api); } catch { want = false; }
        if (!want) { if (b) b.group.visible = false; continue; }
        if (b) { b.group.visible = true; continue; }
        const y = this.host.ground(wt, p.y);
        if (y === null) continue;
        this.built.set(wt.id, this.build(wt, look, y));
      }
    }
    // the glints breathe, and fade as you come right up to them (by then you've found it)
    for (const b of this.built.values()) {
      if (!b.group.visible) continue;
      const d = Math.hypot(b.group.position.x - p.x, b.group.position.z - p.z);
      const near = Math.min(1, Math.max(0, (d - 1.5) / 3)), far = Math.max(0, 1 - Math.max(0, d - GLINT_FAR + 8) / 8);
      const m = b.glint.material as THREE.SpriteMaterial;
      m.opacity = (0.45 + 0.4 * Math.sin(this.t * 2.6 + b.phase)) * near * far;
      b.glint.visible = m.opacity > 0.01;
      const s = 0.55 + 0.12 * Math.sin(this.t * 2.6 + b.phase);
      b.glint.scale.set(s, s, 1);
    }
  }

  private drop(id: string, b: Built): void {
    this.host.scene.remove(b.group);
    (b.glint.material as THREE.Material).dispose();
    this.built.delete(id);
  }

  private build(wt: WorldThing, look: ClueLook, y: number): Built {
    const g = new THREE.Group();
    g.position.set(wt.x, y, wt.z);
    const r = seed(wt.id), ang = r * Math.PI * 2;
    const put = (geo: THREE.BufferGeometry, color: string, x: number, yy: number, z: number, sx: number, sy: number, sz: number, ry = 0, rx = 0, rz = 0, opacity = 1) => {
      const m = new THREE.Mesh(geo, mat(color, opacity));
      m.position.set(x, yy, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
      g.add(m);
      return m;
    };
    /** A point along the line the clue runs, k metres off, laid on the ground there. */
    const along = (k: number, side = 0): [number, number, number] => {
      const x = Math.sin(ang) * k + Math.cos(ang) * side, z = Math.cos(ang) * k - Math.sin(ang) * side;
      const gy = this.host.groundAt(wt.x + x, wt.z + z, y);
      return [x, (gy ?? y) - y, z];
    };
    switch (look) {
      case 'tracks':
        for (let i = 0; i < 9; i++) {
          const [x, yy, z] = along(-0.4 + i * 0.62, i % 2 ? 0.14 : -0.14);
          put(box, '#2e2216', x, yy + 0.012, z, 0.13, 0.02, 0.27, ang, 0, 0, 0.72);
          put(box, '#2e2216', x + Math.sin(ang) * 0.17, yy + 0.012, z + Math.cos(ang) * 0.17, 0.11, 0.02, 0.09, ang, 0, 0, 0.72); // (the heel)
        }
        break;
      case 'hoofprints':
        for (let i = 0; i < 10; i++) {
          const [x, yy, z] = along(-0.4 + i * 0.5, i % 2 ? 0.22 : -0.22);
          put(box, '#2e2216', x, yy + 0.012, z, 0.17, 0.02, 0.05, ang, 0, 0, 0.75);
          put(box, '#2e2216', x - Math.cos(ang) * 0.07, yy + 0.012, z + Math.sin(ang) * 0.07, 0.05, 0.02, 0.16, ang, 0, 0, 0.75);
          put(box, '#2e2216', x + Math.cos(ang) * 0.07, yy + 0.012, z - Math.sin(ang) * 0.07, 0.05, 0.02, 0.16, ang, 0, 0, 0.75);
        }
        break;
      case 'blood':
        put(disc, '#5a0e0c', 0, 0.014, 0, 0.42, 1, 0.3, ang, 0, 0, 0.85);
        put(disc, '#6a1410', 0.25, 0.016, 0.12, 0.18, 1, 0.14, ang * 2, 0, 0, 0.85);
        for (let i = 0; i < 6; i++) { const [x, yy, z] = along(0.6 + i * 0.55 + (i % 2) * 0.1, (i % 3 - 1) * 0.12); put(disc, '#5a0e0c', x, yy + 0.014, z, 0.06 + (i % 2) * 0.03, 1, 0.05, 0, 0, 0, 0.85); }
        break;
      case 'satchel': {
        const s = new THREE.Group(); s.rotation.set(0, ang, 0.25); s.position.y = 0.1; g.add(s);
        const sp = (c: string, x: number, yy: number, z: number, sx: number, sy: number, sz: number) => { const m = new THREE.Mesh(box, mat(c)); m.position.set(x, yy, z); m.scale.set(sx, sy, sz); s.add(m); };
        sp('#6a4424', 0, 0, 0, 0.36, 0.22, 0.13); sp('#5a3a1e', 0, 0.06, 0.07, 0.34, 0.14, 0.02); sp('#c8a050', 0, 0.02, 0.085, 0.05, 0.05, 0.01);
        put(box, '#4a2e18', 0.3, 0.012, 0.15, 0.04, 0.012, 0.5, ang + 0.6); // the strap, trailing
        put(box, '#e8dcc0', -0.3, 0.012, -0.1, 0.16, 0.008, 0.2, ang - 0.4); // a page fallen out
        break;
      }
      case 'letter':
        put(box, '#efe6cc', 0, 0.02, 0, 0.24, 0.01, 0.32, ang);
        for (let i = 0; i < 5; i++) put(box, '#3a3a48', Math.sin(ang) * (0.08 - i * 0.04), 0.027, Math.cos(ang) * (0.08 - i * 0.04), 0.17, 0.004, 0.012, ang + Math.PI / 2);
        put(rod, '#9a1e1a', Math.cos(ang) * 0.06, 0.03, -Math.sin(ang) * 0.06, 0.035, 0.012, 0.035);
        put(box, '#efe6cc', 0.35, 0.02, -0.15, 0.2, 0.01, 0.26, ang + 1.1); // its envelope
        break;
      case 'scorch':
        put(disc, '#141210', 0, 0.013, 0, 1.0, 1, 0.85, ang, 0, 0, 0.78);
        put(disc, '#26221e', 0.2, 0.016, -0.1, 0.55, 1, 0.45, ang, 0, 0, 0.8);
        for (let i = 0; i < 4; i++) put(box, '#1a1612', Math.cos(i * 1.7) * 0.4, 0.05, Math.sin(i * 1.7) * 0.35, 0.06, 0.06, 0.45, i * 0.9 + ang); // charred sticks
        for (let i = 0; i < 6; i++) put(blob, '#8a8680', Math.cos(i * 2.3) * 0.5, 0.03, Math.sin(i * 2.3) * 0.45, 0.05, 0.03, 0.05); // ash
        break;
      case 'bones':
        put(box, '#e8e0cc', 0, 0.09, 0, 0.17, 0.15, 0.2, ang); // the skull
        put(box, '#2a2622', Math.cos(ang) * 0.05, 0.11, -Math.sin(ang) * 0.05 + 0.1 * Math.cos(ang), 0.04, 0.04, 0.02, ang);
        for (let i = 0; i < 5; i++) put(rod, '#ddd4bc', 0.3 + i * 0.07, 0.03, -0.25 + i * 0.12, 0.025, 0.42 - i * 0.04, 0.025, 0, Math.PI / 2, ang + i * 0.6);
        break;
      case 'arrow':
        put(rod, '#8a6a3a', 0, 0.2, 0, 0.012, 0.42, 0.012, 0, 0.5, ang); // stuck in at a slant
        put(box, '#e8e0d0', 0.08, 0.38, 0, 0.005, 0.08, 0.05, ang, 0.5);
        put(rod, '#8a6a3a', 0.5, 0.015, 0.2, 0.012, 0.3, 0.012, 0, Math.PI / 2, ang + 0.9); // the broken half
        put(new THREE.ConeGeometry(1, 1, 4), '#6a6e74', 0.66, 0.015, 0.26, 0.025, 0.07, 0.025, 0, Math.PI / 2, ang + 0.9);
        break;
      case 'grain':
        put(box, '#c8b48a', 0, 0.1, 0, 0.45, 0.2, 0.32, ang, 0, 0.15);
        for (let i = 0; i < 26; i++) { const a = i * 2.4, k = 0.25 + (i % 7) * 0.09; put(box, i % 3 ? '#e0c060' : '#c8a040', Math.cos(a) * k + 0.25, 0.01, Math.sin(a) * k * 0.7, 0.04, 0.02, 0.04, a); }
        break;
      case 'fleece':
        for (let i = 0; i < 5; i++) put(blob, '#ece6d8', Math.cos(i * 1.9) * 0.4, 0.06 + (i % 2) * 0.05, Math.sin(i * 1.9) * 0.35, 0.09, 0.06, 0.08, i);
        break;
      case 'coins':
        for (let i = 0; i < 6; i++) put(rod, '#d8b048', Math.cos(i * 2.1) * 0.22, 0.012, Math.sin(i * 2.1) * 0.16, 0.05, 0.012, 0.05);
        put(box, '#6a4424', -0.25, 0.04, 0.05, 0.14, 0.08, 0.1, ang); // the purse they spilled from
        break;
      case 'cloth':
        put(box, '#8a2a24', 0, 0.25, 0, 0.3, 0.18, 0.01, ang, 0, 0.3); // caught on something low
        put(box, '#8a2a24', 0.05, 0.012, 0.15, 0.22, 0.01, 0.14, ang + 0.5);
        break;
      case 'trampled':
        for (let i = 0; i < 9; i++) put(box, i % 2 ? '#6a7a3a' : '#7a6a3a', (i - 4) * 0.12, 0.02, (i % 3) * 0.08 - 0.08, 0.03, 0.02, 0.5, ang + (i % 2 ? 0.15 : -0.12)); // flattened stems, all one way
        put(box, '#5a3a20', 0.4, 0.03, -0.3, 0.04, 0.04, 0.35, ang + 1.2); // a snapped twig
        put(box, '#7a2a20', -0.35, 0.015, 0.25, 0.1, 0.01, 0.08, ang + 0.4); // a scrap of something caught
        break;
      case 'chalk':
        // chalk on the ground and on a stone: tally strokes and a cross
        put(box, '#8a867c', 0, 0.18, 0, 0.5, 0.36, 0.3, ang);
        for (let i = 0; i < 5; i++) put(box, '#f4f2ea', Math.cos(ang) * (-0.14 + i * 0.07), 0.2, -Math.sin(ang) * (-0.14 + i * 0.07) + Math.cos(ang) * 0.152, 0.02, 0.2, 0.004, ang, 0, i === 4 ? 1.1 : 0);
        put(box, '#f4f2ea', 0.4, 0.014, 0.2, 0.32, 0.006, 0.03, ang + 0.7); put(box, '#f4f2ea', 0.4, 0.014, 0.2, 0.32, 0.006, 0.03, ang - 0.7);
        for (let i = 0; i < 4; i++) put(blob, '#ece8dc', -0.4 + i * 0.1, 0.01, 0.3 - i * 0.06, 0.025, 0.012, 0.025);
        break;
      case 'tags':
        put(box, '#6a4a2a', 0, 0.55, 0, 0.12, 1.1, 0.12, ang);
        put(box, '#3a2a1a', 0, 0.82, 0, 0.14, 0.03, 0.14, ang);
        for (let i = 0; i < 4; i++) { const a = ang + i * 1.57; put(box, '#c8a870', Math.sin(a) * 0.1, 0.7 - (i % 2) * 0.08, Math.cos(a) * 0.1, 0.07, 0.11, 0.015, a); put(box, '#2a2a2a', Math.sin(a) * 0.105, 0.71 - (i % 2) * 0.08, Math.cos(a) * 0.105, 0.03, 0.006, 0.016, a); }
        break;
      case 'skin':
        put(blob, '#7a5434', 0, 0.09, 0, 0.22, 0.09, 0.14, ang);
        put(rod, '#3a2a1a', Math.sin(ang) * 0.22, 0.1, Math.cos(ang) * 0.22, 0.035, 0.08, 0.035, 0, Math.PI / 2, ang);
        put(box, '#4a3020', 0.15, 0.012, -0.2, 0.03, 0.01, 0.45, ang + 0.8); // its strap
        put(disc, '#3a3020', -0.1, 0.012, 0.3, 0.3, 1, 0.18, ang, 0, 0, 0.6); // where it leaked
        break;
      case 'harness':
        for (let i = 0; i < 3; i++) put(box, '#5a3a20', (i - 1) * 0.12, 0.015, 0, 0.05, 0.02, 0.8, ang + (i - 1) * 0.3);
        put(box, '#5a3a20', 0, 0.015, 0.25, 0.6, 0.02, 0.05, ang);
        put(rod, '#b8b4a8', 0.12, 0.03, 0.25, 0.06, 0.02, 0.06); put(rod, '#b8b4a8', -0.2, 0.03, -0.3, 0.05, 0.02, 0.05); // the buckles
        put(box, '#c8a050', 0.3, 0.03, -0.15, 0.05, 0.04, 0.05, ang); // a brass
        break;
      case 'cairn':
        for (let i = 0; i < 6; i++) { const lv = i < 3 ? 0 : i < 5 ? 1 : 2, w = 0.32 - lv * 0.08; put(blob, i % 2 ? '#8a8a82' : '#9a968c', lv < 2 ? Math.cos(i * 2.1) * (0.18 - lv * 0.08) : 0, 0.1 + lv * 0.17, lv < 2 ? Math.sin(i * 2.1) * (0.18 - lv * 0.08) : 0, w, 0.11, w * 0.9, i); }
        break;
      case 'nest':
        put(rod, '#8a6a3a', 0, 0.06, 0, 0.3, 0.12, 0.3);
        put(rod, '#5a4024', 0, 0.1, 0, 0.22, 0.06, 0.22);
        for (let i = 0; i < 5; i++) put(box, '#7a5a30', Math.cos(i * 1.3) * 0.3, 0.1, Math.sin(i * 1.3) * 0.3, 0.02, 0.02, 0.22, i * 1.3 + 0.4); // twigs sticking out
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + ang; put(blob, '#9a8a70', Math.cos(a) * 0.09, 0.17, Math.sin(a) * 0.09, 0.06, 0.05, 0.06, a); put(box, '#e0a030', Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12, 0.025, 0.012, 0.03, a); } // the hatchlings, beaks up
        break;
      case 'harpoon':
        put(rod, '#6a4a2a', 0, 0.45, 0, 0.025, 1.1, 0.025, 0, 0, 0.35); // the shaft, leaning out of the snow
        put(new THREE.ConeGeometry(1, 1, 4), '#4a4e54', -0.19, 1.0, 0, 0.05, 0.18, 0.05, 0, 0, 0.35);
        put(box, '#4a4e54', -0.15, 0.92, 0, 0.12, 0.02, 0.02, 0, 0, -0.6); // the barb
        put(box, '#c8b898', 0.12, 0.15, 0, 0.04, 0.04, 0.04); put(box, '#3a3a3a', 0.2, 0.02, 0.1, 0.03, 0.01, 0.6, ang); // the lashing and its line
        put(disc, '#f4f8fc', 0, 0.014, 0, 0.45, 1, 0.4, 0, 0, 0, 0.9); // drifted snow round it
        break;
      case 'hoard':
        for (let i = 0; i < 18; i++) { const a = i * 2.4, k = 0.06 + (i % 6) * 0.06; put(i % 3 ? box : rod, ['#b08a3a', '#c8a050', '#8a8a8a', '#6a5020', '#d8c070'][i % 5], Math.cos(a) * k, 0.03 + (5 - (i % 6)) * 0.03, Math.sin(a) * k, 0.06, 0.03, 0.05, a); } // cogs, buttons, nails, a spoon
        put(box, '#c8ccd2', 0.1, 0.2, 0, 0.03, 0.02, 0.25, ang); // the spoon
        break;
      case 'crate':
        put(box, '#8a6a3a', 0, 0.22, 0, 0.5, 0.44, 0.4, ang);
        for (const yy of [0.08, 0.36]) put(box, '#6a4a2a', 0, yy, 0, 0.52, 0.05, 0.42, ang);
        put(box, '#7a5a30', 0.1, 0.46, 0.02, 0.5, 0.03, 0.42, ang + 0.15); // its lid, pushed askew
        put(blob, '#c8b898', 0.4, 0.04, 0.1, 0.07, 0.04, 0.06); // straw spilled
        break;
      case 'slab':
        put(box, '#8a867c', 0, 0.05, 0, 0.9, 0.1, 0.6, ang);
        put(box, '#6a665e', 0, 0.105, 0, 0.3, 0.004, 0.06, ang + 0.3); put(box, '#6a665e', 0.08, 0.105, 0.02, 0.18, 0.004, 0.05, ang - 0.5); // the gull, cut in the stone
        put(disc, '#2a2620', 0.5, 0.012, 0, 0.12, 1, 0.3, ang, 0, 0, 0.7); // the gap at its edge
        break;
      case 'glint':
        break;
    }
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    glint.position.set(0, look === 'glint' ? 1.0 : 0.45, 0);
    glint.renderOrder = 5;
    g.add(glint);
    this.host.scene.add(g);
    return { group: g, glint, phase: r * 6 };
  }
}
