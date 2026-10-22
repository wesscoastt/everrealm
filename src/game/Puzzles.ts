import * as THREE from 'three';
import { PieceLook, PuzzleDef, PUZZLES } from '../data/puzzles';
import type { MapMarker } from '../ui/Hud';
import type { ActivityHost } from './Activities';

// Puzzles (data/puzzles.ts) in the world: the pieces, the clue to read, and the chest. Press a
// piece and it lights if it's next in the order; press the wrong one and they all go dark.

interface Live { def: PuzzleDef; root: THREE.Group; pieces: THREE.Group[]; clue: THREE.Vector3; at: THREE.Vector3[]; pressed: number; chest: THREE.Group | null }

const lam = (c: string) => new THREE.MeshLambertMaterial({ color: c });
const box = (g: THREE.Group, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = true;
  g.add(b);
  return b;
};

/** A mark painted on a cairn's face: sun, cloud, moon or star, pale on dark stone. */
function markTexture(mark: 'sun' | 'cloud' | 'moon' | 'star'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#e8e0c8'; x.strokeStyle = '#e8e0c8'; x.lineWidth = 5; x.lineCap = 'round';
  if (mark === 'sun') {
    x.beginPath(); x.arc(32, 32, 11, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x.beginPath(); x.moveTo(32 + Math.cos(a) * 17, 32 + Math.sin(a) * 17); x.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); x.stroke(); }
  } else if (mark === 'cloud') {
    for (const [cx, cy, r] of [[22, 36, 10], [34, 30, 13], [46, 37, 9]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    x.fillRect(14, 36, 40, 10);
  } else if (mark === 'moon') {
    x.beginPath(); x.arc(32, 32, 20, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(42, 26, 18, 0, Math.PI * 2); x.fill();
  } else {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 9 : 24; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

function pieceMesh(look: PieceLook): THREE.Group {
  const g = new THREE.Group();
  if (look.kind === 'weight') {
    const s = look.size, iron = lam('#4a4a50');
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.5 * s, 0.9 * s, 10), iron);
    m.position.y = 0.45 * s; m.castShadow = true; g.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14 * s + 0.04, 0.04, 6, 12), iron);
    ring.position.y = 0.9 * s + 0.12; g.add(ring);
  } else if (look.kind === 'cairn') {
    const stone = lam('#9a9890');
    box(g, 1.1, 0.5, 0.9, stone, 0, 0.25, 0); box(g, 0.9, 0.45, 0.75, lam('#aaa79e'), 0.05, 0.72, 0, 0.2); box(g, 0.7, 0.45, 0.6, stone, -0.03, 1.15, 0, -0.15);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: markTexture(look.mark), transparent: true }));
    face.position.set(0, 0.95, 0.47); g.add(face);
    const back = face.clone(); back.position.z = -0.47; back.rotation.y = Math.PI; g.add(back);
  } else {
    // A dyer's pot, stained all over with its own dye
    const clay = lam(look.color);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.45, 12), clay);
    b.position.y = 0.225; b.castShadow = true; g.add(b);
    const dye = new THREE.Mesh(new THREE.CircleGeometry(0.48, 12).rotateX(-Math.PI / 2), lam(look.color));
    dye.position.y = 0.4; g.add(dye);
  }
  // The light that comes on when it's pressed in turn
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe080', transparent: true, opacity: 0.85, depthWrite: false }));
  glow.position.y = 0.05; glow.name = 'glow'; glow.visible = false;
  g.add(glow);
  return g;
}

function chestMesh(): THREE.Group {
  const g = new THREE.Group();
  const wood = lam('#6a4a2a'), iron = lam('#3a3a3e');
  box(g, 1.0, 0.55, 0.65, wood, 0, 0.28, 0);
  const lid = box(g, 1.0, 0.12, 0.65, wood, 0, 0.62, -0.2);
  lid.rotation.x = -1.1;
  box(g, 1.04, 0.08, 0.68, iron, 0, 0.42, 0);
  return g;
}

export class Puzzles {
  private live = new Map<string, Live>();

  constructor(private host: ActivityHost) {}

  private solved(id: string): boolean { return !!this.host.flag('puzzle:' + id); }

  update(_dt: number, P: THREE.Vector3): void {
    const V = this.host.voxels;
    for (const def of PUZZLES) {
      const d = Math.hypot(P.x - def.x, P.z - def.z);
      let l = this.live.get(def.id);
      if (!l && d < 60 && V.isLoaded(def.x, def.z)) {
        const root = new THREE.Group();
        const at: THREE.Vector3[] = [];
        const pieces = def.pieces.map((p) => {
          const m = pieceMesh(p.look);
          const x = def.x + p.dx + 0.5, z = def.z + p.dz + 0.5;
          const pos = new THREE.Vector3(x, V.groundBelow(x, 140, z), z);
          m.position.copy(pos);
          m.lookAt(def.x + 0.5, pos.y, def.z + 0.5);
          root.add(m);
          at.push(pos);
          return m;
        });
        // The clue: a short post and a board
        const cx = def.x + def.clue.dx + 0.5, cz = def.z + def.clue.dz + 0.5;
        const clue = new THREE.Vector3(cx, V.groundBelow(cx, 140, cz), cz);
        const post = new THREE.Group();
        box(post, 0.14, 1.1, 0.14, lam('#5a4028'), 0, 0.55, 0);
        box(post, 0.9, 0.55, 0.08, lam('#c8b088'), 0, 1.05, 0.08);
        post.position.copy(clue);
        post.lookAt(def.x + 0.5, clue.y, def.z + 0.5);
        root.add(post);
        this.host.scene.add(root);
        l = { def, root, pieces, clue, at, pressed: 0, chest: null };
        this.live.set(def.id, l);
        if (this.solved(def.id)) this.showSolved(l);
        if (!this.host.flag('puzzleSeen:' + def.id)) this.host.setFlag('puzzleSeen:' + def.id, 1);
      } else if (l && d > 90) {
        this.host.scene.remove(l.root);
        this.live.delete(def.id);
      }
    }
  }

  private showSolved(l: Live): void {
    l.pressed = l.def.order.length;
    for (const p of l.pieces) p.getObjectByName('glow')!.visible = true;
    if (!l.chest) {
      l.chest = chestMesh();
      const V = this.host.voxels;
      l.chest.position.set(l.def.x + 0.5, V.groundBelow(l.def.x + 0.5, 140, l.def.z + 0.5), l.def.z + 0.5);
      l.root.add(l.chest);
    }
  }

  candidates(P: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const l of this.live.values()) {
      if (Math.hypot(P.x - l.clue.x, P.z - l.clue.z) < 2.4) out.push({ label: `Read ${l.def.clue.what}`, pos: l.clue.clone().setY(l.clue.y + 1.6), use: () => this.host.system(l.def.clue.text) });
      if (this.solved(l.def.id)) continue;
      l.at.forEach((a, i) => {
        if (Math.hypot(P.x - a.x, P.z - a.z) > 2 || Math.abs(P.y - a.y) > 2.5) return;
        const lit = l.def.order.slice(0, l.pressed).includes(i);
        if (!lit) out.push({ label: `Press ${l.def.pieces[i].name}`, pos: a.clone().setY(a.y + 1.4), use: () => this.press(l, i) });
      });
    }
    return out;
  }

  private press(l: Live, i: number): void {
    const def = l.def;
    if (def.order[l.pressed] !== i) {
      l.pressed = 0;
      for (const p of l.pieces) p.getObjectByName('glow')!.visible = false;
      this.host.system(`${def.name}: that was the wrong one, and they all go dark. Start again.`);
      return;
    }
    l.pieces[i].getObjectByName('glow')!.visible = true;
    l.pressed++;
    this.host.sound('open');
    if (l.pressed < def.order.length) return;
    this.host.setFlag('puzzle:' + def.id, 1);
    this.showSolved(l);
    this.host.reward(def.xp, def.marks, def.loot, `${def.name}: solved`);
    this.host.banner('Puzzle solved', def.name);
    this.host.sound('discover');
  }

  markers(): MapMarker[] {
    return PUZZLES.filter((d) => this.host.flag('puzzleSeen:' + d.id)).map((d) => ({ x: d.x, z: d.z, kind: this.solved(d.id) ? 'taskDone' : 'poi', label: d.name }));
  }
}
