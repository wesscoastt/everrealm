import * as THREE from 'three';
import { ChoreProp, TaskDef, TASKS } from '../data/activities';
import { ENEMIES } from '../data/gameplay';
import { Enemy } from '../entities/Enemy';
import { B } from '../world/blocks';
import type { ActivityHost, EventPanel } from './Activities';
import type { MapMarker } from '../ui/Hud';

// Parish tasks: ground where the locals want a hand. Chores wait at glowing spots (press E) and
// pests keep coming while the task is open; each chore and each pest moves the bar on. A full bar
// pays out once per character. Progress is kept between visits.

const SPOTS = 6;
const CHORE = 12, PEST = 8;
const SPOT_BACK = 25, PEST_BACK = 10;
const NOT_GROUND = new Set<number>([B.Water, B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.OakLog, B.BirchLog, B.PineLog, B.Planks, B.DarkPlanks, B.Thatch, B.Barrier]);

interface Spot { mesh: THREE.Group; pos: THREE.Vector3 }
interface LiveTask { def: TaskDef; spots: Spot[]; refill: number[]; pests: Enemy[]; pestBack: number }

const mats = new Map<string, THREE.Material>();
const lam = (c: string, emissive?: string) => {
  const key = c + (emissive ?? '');
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, ...(emissive ? { emissive: new THREE.Color(emissive) } : {}) }); mats.set(key, m); }
  return m;
};
const box = (g: THREE.Group, w: number, h: number, d: number, c: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true;
  g.add(m);
  return m;
};
const MARK_GEO = new THREE.OctahedronGeometry(0.22, 0);

/** The thing to work on, about a block across, with a small gold mark floating over it. */
function choreMesh(prop: ChoreProp, seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = (i: number) => ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
  switch (prop) {
    case 'crop':
      box(g, 1.4, 0.12, 0.5, '#5a3a22', 0, 0.06, 0);
      for (let i = 0; i < 3; i++) { box(g, 0.22, 0.18, 0.22, '#e8dcc8', -0.45 + i * 0.45, 0.17, 0); box(g, 0.08, 0.36, 0.3, '#4a8a2a', -0.45 + i * 0.45, 0.4, 0, 0, i, 0.2); }
      break;
    case 'withy':
      for (let i = 0; i < 7; i++) box(g, 0.05, 1.3, 0.05, i % 2 ? '#a8865a' : '#8a6a3a', -0.12 + (i % 4) * 0.08, 0.65, -0.08 + Math.floor(i / 4) * 0.12, 0, 0, (r(i) - 0.5) * 0.15);
      box(g, 0.36, 0.06, 0.28, '#6a4a2a', 0, 0.55, 0);
      break;
    case 'sheaf':
      for (let i = 0; i < 3; i++) box(g, 0.32, 0.85, 0.32, i === 1 ? '#e0c060' : '#d0b050', -0.3 + i * 0.3, 0.42, (i - 1) * 0.06, 0, 0, (i - 1) * 0.25);
      box(g, 0.9, 0.06, 0.36, '#a8862a', 0, 0.5, 0);
      break;
    case 'rail':
      box(g, 0.16, 1.1, 0.16, '#6a4a2a', -0.7, 0.55, 0); box(g, 0.16, 1.1, 0.16, '#6a4a2a', 0.7, 0.55, 0);
      box(g, 1.6, 0.12, 0.1, '#7a5a3a', 0, 0.85, 0); box(g, 1.5, 0.12, 0.1, '#7a5a3a', 0.1, 0.3, 0.15, 0, 0.2, 0.35);
      break;
    case 'clamp': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#3a3028'));
      m.scale.set(1, 0.7, 1); g.add(m);
      box(g, 0.3, 0.12, 0.3, '#1a1612', 0, 0.58, 0);
      break;
    }
    case 'skep': {
      box(g, 0.7, 0.4, 0.7, '#6a4a2a', 0, 0.2, 0);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), lam('#c8a050'));
      s.scale.set(1, 1.2, 1); s.position.set(0.55, 0.3, 0.2); s.rotation.z = 1.4; g.add(s);
      break;
    }
    case 'salt':
      box(g, 1.4, 0.1, 1.0, '#6a5a44', 0, 0.05, 0); box(g, 1.2, 0.04, 0.8, '#f0eee6', 0, 0.12, 0);
      box(g, 0.08, 0.08, 1.2, '#7a5a3a', 0.5, 0.2, 0, 0, 0.3, 0);
      break;
    case 'kelp':
      for (let i = 0; i < 5; i++) box(g, 0.5, 0.25, 0.4, i % 2 ? '#3a4a22' : '#4a3a1e', (r(i) - 0.5) * 0.7, 0.12 + (i > 2 ? 0.2 : 0), (r(i + 9) - 0.5) * 0.6, 0, r(i) * 3, 0);
      break;
    case 'ochre':
      for (let i = 0; i < 4; i++) box(g, 0.35 + r(i) * 0.2, 0.3, 0.35, i % 2 ? '#c8642a' : '#a84a1e', (r(i) - 0.5) * 0.8, 0.15, (r(i + 3) - 0.5) * 0.8, 0, r(i) * 2, 0);
      box(g, 0.08, 0.9, 0.08, '#6a4a2a', 0.5, 0.45, 0.3, 0.3, 0, 0.2);
      break;
    case 'cistern':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(g, 0.4, 0.45, 0.25, '#8a8070', Math.cos(a) * 0.6, 0.22, Math.sin(a) * 0.6, 0, -a, 0); }
      box(g, 0.9, 0.08, 0.9, '#6a4a2a', 0, 0.3, 0);
      break;
    case 'peat':
      for (let i = 0; i < 6; i++) box(g, 0.45, 0.2, 0.25, i % 2 ? '#2e2218' : '#3a2a1c', -0.25 + (i % 2) * 0.5, 0.1 + Math.floor(i / 2) * 0.2, 0, 0, (i % 3) * 0.1, 0);
      break;
    case 'cairn':
      for (let i = 0; i < 6; i++) box(g, 0.35 + r(i) * 0.25, 0.25, 0.35, i % 2 ? '#8a8a88' : '#6e6e6a', (r(i) - 0.5) * 1.1, 0.12, (r(i + 4) - 0.5) * 1.1, 0, r(i) * 2, 0);
      break;
  }
  const mark = new THREE.Mesh(MARK_GEO, lam('#ffd870', '#c89a20'));
  mark.position.y = 1.6;
  mark.name = 'mark';
  g.add(mark);
  return g;
}

export class Tasks {
  private live = new Map<string, LiveTask>();
  private clock = 0;

  constructor(private host: ActivityHost, private spawn: (def: typeof ENEMIES[keyof typeof ENEMIES], x: number, z: number) => Enemy) {}

  done(id: string): boolean { return !!this.host.flag('task:' + id); }
  progress(id: string): number { return Number(this.host.flag('taskp:' + id) ?? 0); }

  /** A spot on open ground inside the task, away from the player. */
  private ground(def: TaskDef, P: THREE.Vector3, away: number): THREE.Vector3 | null {
    const V = this.host.voxels;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * def.r * 0.9;
      const x = Math.floor(def.x + Math.cos(a) * d), z = Math.floor(def.z + Math.sin(a) * d);
      if (!V.isLoaded(x, z) || Math.hypot(x - P.x, z - P.z) < away) continue;
      const y = V.topSolid(x, z);
      if (y < 0 || NOT_GROUND.has(V.get(x, y, z)) || V.get(x, y + 1, z) !== B.Air) continue;
      return new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
    }
    return null;
  }

  update(dt: number, P: THREE.Vector3): void {
    this.clock += dt;
    for (const def of TASKS) {
      const d = Math.hypot(P.x - def.x, P.z - def.z);
      let t = this.live.get(def.id);
      if (!t && d < def.r + 40 && !this.done(def.id) && this.host.voxels.isLoaded(def.x, def.z)) {
        t = { def, spots: [], refill: [], pests: [], pestBack: 0 };
        this.live.set(def.id, t);
        for (let i = 0; i < SPOTS; i++) t.refill.push(this.clock + i * 0.2);
      }
      if (!t) continue;
      if (d > def.r + 110 || this.done(def.id)) { this.close(t); continue; }
      // Chores come back a while after they're done
      for (let i = t.refill.length - 1; i >= 0; i--) {
        if (t.refill[i] > this.clock) continue;
        const pos = this.ground(def, P, 0);
        if (!pos) continue;
        const mesh = choreMesh(def.prop, Math.random() * 100);
        mesh.position.copy(pos);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        this.host.scene.add(mesh);
        t.spots.push({ mesh, pos });
        t.refill.splice(i, 1);
      }
      for (const s of t.spots) {
        const m = s.mesh.getObjectByName('mark');
        if (m) { m.position.y = 1.6 + Math.sin(this.clock * 2.5 + s.pos.x) * 0.12; m.rotation.y += dt * 2; }
      }
      // Pests keep turning up while there's work to do
      const alive = t.pests.filter((e) => e.alive).length;
      if (alive < def.pests.max && this.clock > t.pestBack) {
        const pos = this.ground(def, P, 10);
        if (pos) {
          const e = this.spawn(ENEMIES[def.pests.type], pos.x, pos.z);
          e.questTag = 'task:' + def.id;
          t.pests.push(e);
          t.pestBack = this.clock + PEST_BACK;
        }
      }
    }
  }

  private close(t: LiveTask): void {
    for (const s of t.spots) this.host.scene.remove(s.mesh);
    for (const e of t.pests) this.host.removeEnemy(e);
    this.live.delete(t.def.id);
  }

  private advance(def: TaskDef, by: number): void {
    if (this.done(def.id)) return;
    const p = Math.min(100, this.progress(def.id) + by);
    this.host.setFlag('taskp:' + def.id, p);
    if (p < 100) return;
    this.host.setFlag('task:' + def.id, 1);
    this.host.reward(def.xp, def.marks, def.loot, `${def.name}: task complete`);
    this.host.banner('Task complete', def.name);
    this.host.sound('levelUp');
    const t = this.live.get(def.id);
    if (t) this.close(t);
  }

  candidates(P: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const t of this.live.values()) {
      for (const s of t.spots) {
        if (Math.hypot(P.x - s.pos.x, P.z - s.pos.z) > 2.2 || Math.abs(P.y - s.pos.y) > 2) continue;
        out.push({ label: `${t.def.verb} the ${t.def.noun}`, pos: s.pos.clone().setY(s.pos.y + 0.8), use: () => this.chore(t, s) });
      }
    }
    return out;
  }

  private chore(t: LiveTask, s: Spot): void {
    if (!t.spots.includes(s)) return;
    this.host.scene.remove(s.mesh);
    t.spots.splice(t.spots.indexOf(s), 1);
    t.refill.push(this.clock + SPOT_BACK);
    this.host.sound('open');
    this.host.daily?.('chore');
    this.advance(t.def, CHORE);
  }

  onKilled(e: Enemy): void {
    if (!e.questTag?.startsWith('task:')) return;
    const def = TASKS.find((d) => 'task:' + d.id === e.questTag);
    if (def) {
      const t = this.live.get(def.id);
      if (t) {
        t.pestBack = this.clock + PEST_BACK;
        // Task pests don't come back where they fell; the body goes after a few seconds
        t.pests = t.pests.filter((x) => x !== e);
        setTimeout(() => this.host.removeEnemy(e), 6000);
      }
      this.advance(def, PEST);
    }
  }

  panel(P: THREE.Vector3): EventPanel | null {
    for (const t of this.live.values()) {
      if (Math.hypot(P.x - t.def.x, P.z - t.def.z) > t.def.r + 12) continue;
      const p = this.progress(t.def.id);
      return { kind: 'task', title: t.def.name, goal: t.def.goal, progress: p / 100, count: `${Math.round(p)}%` };
    }
    return null;
  }

  markers(): MapMarker[] {
    return TASKS.map((d) => ({ x: d.x, z: d.z, kind: this.done(d.id) ? 'taskDone' : 'task', label: d.name }));
  }
}
