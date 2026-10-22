import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paintCanvasTexture } from './textures';
import { roofApex, roofOverhang, roofRise } from './roofShape';

// Authored (non-voxel) props. Static pieces are batched per material into single meshes.

export interface PropMaterials {
  wood: THREE.MeshLambertMaterial;
  darkWood: THREE.MeshLambertMaterial;
  bark: THREE.MeshLambertMaterial;
  iron: THREE.MeshLambertMaterial;
  stone: THREE.MeshLambertMaterial;
  cobble: THREE.MeshLambertMaterial;
  plaster: THREE.MeshLambertMaterial;
  roofRed: THREE.MeshLambertMaterial;
  roofBlue: THREE.MeshLambertMaterial;
  roofSlate: THREE.MeshLambertMaterial;
  thatch: THREE.MeshLambertMaterial;
  glow: THREE.MeshLambertMaterial;
  fire: THREE.MeshBasicMaterial;
  bronze: THREE.MeshStandardMaterial;
  rope: THREE.MeshLambertMaterial;
  clothGreen: THREE.MeshLambertMaterial;
  clothRed: THREE.MeshLambertMaterial;
  clothBlue: THREE.MeshLambertMaterial;
  clothCream: THREE.MeshLambertMaterial;
  produce: THREE.MeshLambertMaterial;
  paper: THREE.MeshLambertMaterial;
}

export function createPropMaterials(): PropMaterials {
  const tex = (k: Parameters<typeof paintCanvasTexture>[0]) => paintCanvasTexture(k);
  const lam = (o: THREE.MeshLambertMaterialParameters) => new THREE.MeshLambertMaterial(o);
  return {
    wood: lam({ map: tex('planks') }),
    darkWood: lam({ map: tex('darkPlanks') }),
    bark: lam({ map: tex('bark') }),
    iron: lam({ map: tex('iron'), color: '#9aa0a8' }),
    stone: lam({ map: tex('stone') }),
    cobble: lam({ map: tex('cobble') }),
    plaster: lam({ map: tex('plaster') }),
    roofRed: lam({ map: tex('roofRed') }),
    roofBlue: lam({ map: tex('roofBlue') }),
    roofSlate: lam({ map: tex('roofSlate') }),
    thatch: lam({ map: tex('thatch') }),
    glow: lam({ color: '#3a2a10', emissive: new THREE.Color('#ffb24a'), emissiveIntensity: 0.4 }),
    fire: new THREE.MeshBasicMaterial({ color: '#ff8a2a' }),
    bronze: new THREE.MeshStandardMaterial({ color: '#b8873a', metalness: 0.75, roughness: 0.38 }),
    rope: lam({ color: '#a88b5a' }),
    clothGreen: lam({ color: '#3f7a3a', side: THREE.DoubleSide }),
    clothRed: lam({ color: '#a8382c', side: THREE.DoubleSide }),
    clothBlue: lam({ color: '#2f528f', side: THREE.DoubleSide }),
    clothCream: lam({ color: '#efe3c4', side: THREE.DoubleSide }),
    produce: lam({ vertexColors: true }),
    paper: lam({ color: '#efe6cf' }),
  };
}

const flatMats = new Map<string, THREE.MeshLambertMaterial>();
/** A plain coloured material, shared by every prop that asks for the same one so they batch together. */
export function flat(color: string, opts: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  const k = color + JSON.stringify(opts);
  let m = flatMats.get(k);
  if (!m) flatMats.set(k, (m = new THREE.MeshLambertMaterial({ color, ...opts })));
  return m;
}

/** Box with UVs scaled to world size so tiling textures keep a constant texel density. */
export function box(w: number, h: number, d: number, uvScale = 1): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] * uvScale, uv.getY(i) * dims[f][1] * uvScale);
  }
  return g;
}

export function cyl(rTop: number, rBot: number, h: number, seg = 8): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * Math.max(rTop, rBot), uv.getY(i) * h);
  return g;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function mat4(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/**
 * Collects geometry per material and merges it into one mesh per material. Multi-material meshes
 * are split by face group into the same buckets, and painted text (signs, boards, see textTexture)
 * is packed into one atlas per batch, so a street of signs costs one draw call, not one per face.
 */
export class Batcher {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private texts: { geo: THREE.BufferGeometry; canvas: HTMLCanvasElement }[] = [];
  /** Meshes that can't be merged are kept as-is (nothing currently needs this). */
  readonly loose = new THREE.Group();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4): void {
    const g = this.prepare(geo, m);
    const map = (mat as THREE.MeshLambertMaterial).map;
    if (map?.userData.text) { this.texts.push({ geo: g, canvas: map.image as HTMLCanvasElement }); return; }
    let list = this.buckets.get(mat);
    if (!list) this.buckets.set(mat, (list = []));
    list.push(g);
  }

  private prepare(geo: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') g.deleteAttribute(name);
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.color) {
      const c = new Float32Array(g.attributes.position.count * 3).fill(1);
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    }
    g.clearGroups();
    return g;
  }

  /** Add a group's meshes (with their local transforms) under a parent transform. */
  addGroup(group: THREE.Object3D, parent: THREE.Matrix4): void {
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = new THREE.Matrix4().multiplyMatrices(parent, mesh.matrixWorld);
      if (!Array.isArray(mesh.material)) { this.add(mesh.geometry, mesh.material, m); return; }
      // One piece per face group, each into its own material's bucket
      const flatGeo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const groups = mesh.geometry.groups;
      for (const gr of groups) {
        const mat = mesh.material[gr.materialIndex ?? 0];
        if (!mat) continue;
        const part = new THREE.BufferGeometry();
        for (const [name, attr] of Object.entries(flatGeo.attributes)) {
          const a = attr as THREE.BufferAttribute;
          part.setAttribute(name, new THREE.BufferAttribute((a.array as Float32Array).slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize));
        }
        this.add(part, mat, m);
      }
    });
  }

  build(shadows = true): THREE.Group {
    const out = new THREE.Group();
    out.add(this.loose);
    if (this.texts.length) this.buildTextAtlas(out, shadows);
    for (const [mat, list] of this.buckets) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      out.add(mesh);
    }
    this.buckets.clear();
    return out;
  }

  /**
   * Pack every text canvas into one atlas (rows of cells with a bleed margin for mipmaps) and map
   * each text face's UVs onto its cell, stretched to fill the face. The atlas material is owned by
   * the mesh: whoever drops the batch disposes it (see GameWorld).
   */
  private buildTextAtlas(out: THREE.Group, shadows: boolean): void {
    const PAD = 4, W = 1024;
    const cells = new Map<HTMLCanvasElement, [number, number]>();
    let x = 0, y = 0, rowH = 0;
    for (const { canvas: c } of this.texts) {
      if (cells.has(c)) continue;
      const w = Math.min(c.width, W - PAD * 2), cw = w + PAD * 2, ch = c.height + PAD * 2;
      if (x + cw > W) { x = 0; y += rowH; rowH = 0; }
      cells.set(c, [x, y]);
      x += cw; rowH = Math.max(rowH, ch);
    }
    const H = THREE.MathUtils.ceilPowerOfTwo(Math.max(16, y + rowH));
    const atlas = document.createElement('canvas');
    atlas.width = W; atlas.height = H;
    const ctx = atlas.getContext('2d')!;
    for (const [c, [cx, cy]] of cells) {
      const w = Math.min(c.width, W - PAD * 2);
      ctx.drawImage(c, cx, cy, w + PAD * 2, c.height + PAD * 2); // bleed
      ctx.drawImage(c, cx + PAD, cy + PAD, w, c.height);
    }
    const parts: THREE.BufferGeometry[] = [];
    for (const { geo, canvas: c } of this.texts) {
      const [cx, cy] = cells.get(c)!;
      const w = Math.min(c.width, W - PAD * 2);
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
      for (let i = 0; i < uv.count; i++) {
        const fu = (uv.getX(i) - u0) / Math.max(1e-6, u1 - u0), fv = (uv.getY(i) - v0) / Math.max(1e-6, v1 - v0);
        // Canvas y runs down, texture v runs up (flipY)
        uv.setXY(i, (cx + PAD + fu * w) / W, 1 - (cy + PAD + (1 - fv) * c.height) / H);
      }
      parts.push(geo);
    }
    const merged = mergeGeometries(parts, false);
    this.texts = [];
    if (!merged) return;
    merged.computeBoundingSphere();
    const tex = new THREE.CanvasTexture(atlas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    mat.userData.owned = true;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    out.add(mesh);
  }
}

// ------------------------------------------------------------ Roofs

/**
 * Gable roof along local X. Eaves curve upward in the last stretch so the silhouette
 * reads as storybook rather than as a voxel staircase.
 */
export function gableRoof(len: number, span: number, rise: number, overhang = 0.6, thick = 0.22, upturn = 0.35): THREE.BufferGeometry {
  const S = span / 2 + overhang;
  const L = len / 2 + overhang;
  const steps = 7;
  const prof: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = eave tip, 1 = ridge
    const z = -S + t * S;
    const lin = (rise * (S - Math.abs(z))) / (span / 2);
    const edge = Math.max(0, 1 - t * 2.2);
    prof.push([z, lin - rise * overhang / (span / 2) * 0 + upturn * edge * edge]);
  }
  const pos: number[] = [];
  const uv: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], ua: number[], ub: number[], uc: number[], ud: number[]) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
  };
  for (const side of [-1, 1]) {
    let vAcc = 0;
    for (let i = 0; i < steps; i++) {
      const [z0, y0] = prof[i];
      const [z1, y1] = prof[i + 1];
      const seg = Math.hypot(z1 - z0, y1 - y0);
      const zz0 = z0 * side, zz1 = z1 * side;
      const v0 = vAcc, v1 = vAcc + seg;
      vAcc = v1;
      // Top surface (winding depends on side)
      if (side < 0) quad([-L, y0, zz0], [L, y0, zz0], [L, y1, zz1], [-L, y1, zz1], [0, v0], [len, v0], [len, v1], [0, v1]);
      else quad([L, y0, zz0], [-L, y0, zz0], [-L, y1, zz1], [L, y1, zz1], [0, v0], [len, v0], [len, v1], [0, v1]);
      // Underside
      const t0 = y0 - thick, t1 = y1 - thick;
      if (side < 0) quad([L, t0, zz0], [-L, t0, zz0], [-L, t1, zz1], [L, t1, zz1], [0, v0], [len, v0], [len, v1], [0, v1]);
      else quad([-L, t0, zz0], [L, t0, zz0], [L, t1, zz1], [-L, t1, zz1], [0, v0], [len, v0], [len, v1], [0, v1]);
      // Gable-end edge strips
      for (const ex of [-L, L]) {
        const s = ex < 0 ? -1 : 1;
        const a = [ex, t0, zz0], b = [ex, y0, zz0], c = [ex, y1, zz1], d = [ex, t1, zz1];
        // (wound to face out of the roof, so the ends show from outside)
        if (s * side > 0) quad(a, b, c, d, [0, 0], [0, thick], [seg, thick], [seg, 0]);
        else quad(a, d, c, b, [0, 0], [seg, 0], [seg, thick], [0, thick]);
      }
    }
    // Eave fascia
    const [ze, ye] = prof[0];
    const z = ze * side;
    if (side > 0) quad([L, ye - thick, z], [-L, ye - thick, z], [-L, ye, z], [L, ye, z], [0, 0], [len, 0], [len, thick], [0, thick]);
    else quad([-L, ye - thick, z], [L, ye - thick, z], [L, ye, z], [-L, ye, z], [0, 0], [len, 0], [len, thick], [0, thick]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export interface HouseRoof {
  /** Centre of the wall plate (top of the walls). */
  x: number; y: number; z: number;
  /** Length along the ridge and width across it, in blocks. */
  len: number; span: number;
  /** 0 when the ridge runs along world X, PI/2 along world Z. */
  ry: number;
  mat: THREE.Material;
  thatch?: boolean;
  /** Dormers on one slope: +1 or -1 picks the slope (local +Z or -Z), 0 for none. */
  dormers?: number;
}

/**
 * A finished house roof: the covering, a dark trim that shows as fascia along the eaves and
 * barge boards up the gable ends, a ridge cap (a rolled ridge on thatch), half-timbered gables
 * with an attic light, and optional dormers. Proportions come from roofShape.ts so voxel
 * chimneys meet the same roofline.
 */
export function addHouseRoof(batch: Batcher, M: PropMaterials, r: HouseRoof): void {
  const { len, span, thatch } = r;
  const rise = roofRise(span);
  const ov = roofOverhang(!!thatch);
  const apex = roofApex(span, rise, ov);
  const base = mat4(r.x, r.y, r.z, r.ry);
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
    batch.add(geo, mat, new THREE.Matrix4().multiplyMatrices(base, mat4(x, y, z, ry, rx, rz)));

  if (thatch) {
    // Thick, soft-edged thatch with no upturn, and a rolled ridge
    put(gableRoof(len, span, rise, ov, 0.55, 0.0), r.mat, 0, 0, 0);
    put(cyl(0.34, 0.34, len + ov * 2 + 0.1, 8), r.mat, 0, apex - 0.12, 0, 0, 0, Math.PI / 2);
  } else {
    put(gableRoof(len, span, rise, ov, 0.3, 0.42), r.mat, 0, 0, 0);
    // Dark trim: the same roof a touch longer, wider and lower, so only its edges show
    const grow = 0.08;
    put(gableRoof(len + grow * 2, span, rise, ov + grow, 0.46, 0.42), M.darkWood, 0, -(grow * rise) / (span / 2) - 0.06, 0);
    put(box(len + ov * 2 + 0.25, 0.28, 0.36), M.darkWood, 0, apex + 0.04, 0);
  }

  // Close the attic: a five-sided timber wedge from the wall plate up to just under the lowest roof
  // skin (the trim's, or the thatch's), parallel to it. Without it there's a slit between the
  // walls and the eaves, and from under the eaves you could look up into the rooms.
  const drop = 0.58;
  const eaveH = Math.max(0.05, (2 * rise * ov) / span - drop), ridgeH = apex - drop - 0.02;
  const shell = new THREE.Shape();
  shell.moveTo(-span / 2, 0); shell.lineTo(span / 2, 0); shell.lineTo(span / 2, eaveH); shell.lineTo(0, ridgeH); shell.lineTo(-span / 2, eaveH);
  shell.closePath();
  const attic = new THREE.ExtrudeGeometry(shell, { depth: len - 0.04, bevelEnabled: false });
  attic.translate(0, 0, -(len - 0.04) / 2);
  put(attic, M.darkWood, 0, 0, 0, Math.PI / 2);

  // Gable ends: plaster infill, a tie beam, king post and two braces, and a lit attic window
  const gh = apex - 0.25;
  const gw = gableWall(span, gh, 0.9);
  for (const s of [-1, 1]) {
    put(gw, M.plaster, s * (len / 2 - 0.45), 0, 0, Math.PI / 2);
    const fx = s * (len / 2 + 0.03);
    put(box(0.12, 0.24, span), M.darkWood, fx, 0.12, 0);
    put(box(0.12, gh * 0.82, 0.22), M.darkWood, fx, gh * 0.41, 0);
    const bz = span * 0.3, by = gh * 0.42;
    const bl = Math.hypot(bz, by), ang = Math.atan2(bz, by);
    for (const side of [-1, 1]) put(box(0.12, bl, 0.18), M.darkWood, fx, by / 2 + 0.1, side * bz / 2, 0, -side * ang);
    if (gh > 2.2) put(box(0.1, 0.7, 0.5), M.glow, fx + s * 0.01, gh * 0.55, span * 0.17);
  }

  // Dormers: a plaster cheek with a lit window under its own small gable, set on the wall line
  const n = r.dormers ? (len >= 10 ? 2 : len >= 6 ? 1 : 0) : 0;
  const d = Math.sign(r.dormers ?? 0);
  for (let i = 0; i < n; i++) {
    const dx = n === 1 ? 0 : (i === 0 ? -1 : 1) * len * 0.24;
    const front = d * (span / 2 - 0.1), depth = 2.3, h = 1.8;
    put(box(1.9, h, depth), M.plaster, dx, h / 2, front - (d * depth) / 2);
    put(box(0.9, 0.95, 0.1), M.glow, dx, h * 0.55, front + d * 0.03);
    put(box(1.1, 0.12, 0.16), M.darkWood, dx, h * 0.55 - 0.53, front + d * 0.06);
    put(gableRoof(depth + 0.4, 2.3, 1.0, 0.3, 0.2, thatch ? 0 : 0.18), r.mat, dx, h, front - (d * (depth - 0.4)) / 2, Math.PI / 2);
    put(gableWall(2.1, 1.0, 0.2), M.plaster, dx, h, front - d * 0.05);
  }
}

/** Triangular gable wall filling the roof end above the wall plate. */
export function gableWall(span: number, rise: number, depth = 0.9): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0);
  shape.lineTo(span / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
  return g;
}

// ------------------------------------------------------------ Prop builders (return Groups)

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

export function lanternPost(M: PropMaterials, height = 2.6): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.22, height, 0.22), M.darkWood, 0, height / 2, 0));
  g.add(mesh(box(0.7, 0.14, 0.14), M.darkWood, 0.25, height - 0.15, 0));
  g.add(mesh(box(0.08, 0.3, 0.08), M.iron, 0.52, height - 0.35, 0));
  g.add(mesh(box(0.3, 0.36, 0.3), M.glow, 0.52, height - 0.62, 0));
  g.add(mesh(box(0.38, 0.06, 0.38), M.iron, 0.52, height - 0.42, 0));
  g.add(mesh(box(0.34, 0.05, 0.34), M.iron, 0.52, height - 0.82, 0));
  g.add(mesh(box(0.4, 0.12, 0.4), M.cobble, 0, 0.06, 0));
  return g;
}

export function wallLantern(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.08, 0.08, 0.4), M.iron, 0, 0.3, 0.2));
  g.add(mesh(box(0.26, 0.32, 0.26), M.glow, 0, 0.05, 0.42));
  g.add(mesh(box(0.32, 0.05, 0.32), M.iron, 0, 0.24, 0.42));
  return g;
}

export function anvil(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.32, 0.38, 0.55, 10), M.bark, 0, 0.27, 0));
  g.add(mesh(box(0.5, 0.12, 0.3), M.iron, 0, 0.61, 0));
  g.add(mesh(box(0.28, 0.2, 0.2), M.iron, 0, 0.77, 0));
  g.add(mesh(box(0.78, 0.18, 0.3), M.iron, 0.04, 0.95, 0));
  const horn = mesh(new THREE.ConeGeometry(0.14, 0.42, 8), M.iron, -0.53, 0.95, 0, 0, 0, Math.PI / 2);
  g.add(horn);
  g.add(mesh(box(0.06, 0.06, 0.4), M.iron, 0.2, 1.06, 0.05, 0.4));
  g.add(mesh(box(0.08, 0.08, 0.32), M.darkWood, 0.2, 1.08, 0.1, 0.4));
  return g;
}

export function barrel(M: PropMaterials, water = false): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.34, 0.3, 0.9, 12), M.wood, 0, 0.45, 0));
  g.add(mesh(cyl(0.355, 0.355, 0.06, 12), M.iron, 0, 0.2, 0));
  g.add(mesh(cyl(0.36, 0.36, 0.06, 12), M.iron, 0, 0.72, 0));
  if (water) g.add(mesh(cyl(0.3, 0.3, 0.02, 12), flat('#2e5a6e'), 0, 0.86, 0));
  else g.add(mesh(cyl(0.31, 0.31, 0.03, 12), M.darkWood, 0, 0.9, 0));
  return g;
}

export function crate(M: PropMaterials, s = 0.7): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(s, s, s), M.wood, 0, s / 2, 0));
  for (const y of [0.05, s - 0.05]) for (const z of [-s / 2, s / 2]) g.add(mesh(box(s + 0.02, 0.1, 0.06), M.darkWood, 0, y, z));
  g.add(mesh(box(0.06, s * 1.3, 0.06), M.darkWood, 0, s / 2, s / 2 + 0.01, 0, 0, Math.PI / 4));
  return g;
}

export function bench(M: PropMaterials, len = 2): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(len, 0.1, 0.42), M.wood, 0, 0.48, 0));
  for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) g.add(mesh(box(0.12, 0.45, 0.36), M.darkWood, x, 0.22, 0));
  return g;
}

export function fenceRun(M: PropMaterials, len: number): THREE.Group {
  const g = new THREE.Group();
  const posts = Math.max(1, Math.round(len / 1.5));
  for (let i = 0; i <= posts; i++) g.add(mesh(box(0.16, 1.05, 0.16), M.darkWood, -len / 2 + (i * len) / posts, 0.52, 0));
  g.add(mesh(box(len, 0.1, 0.08), M.wood, 0, 0.8, 0));
  g.add(mesh(box(len, 0.1, 0.08), M.wood, 0, 0.45, 0));
  return g;
}

export function bellFrame(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1, 1]) {
    g.add(mesh(box(0.26, 3.2, 0.26), M.darkWood, x, 1.6, 0));
    g.add(mesh(box(0.14, 1.2, 0.14), M.darkWood, x * 0.75, 2.75, 0, 0, 0, x * 0.6));
  }
  g.add(mesh(box(2.5, 0.28, 0.3), M.darkWood, 0, 3.2, 0));
  const cap = gableRoof(2.3, 0.9, 0.45, 0.25, 0.1, 0.12);
  g.add(mesh(cap, M.roofRed, 0, 3.35, 0));
  g.add(mesh(box(0.06, 0.4, 0.06), M.rope, 0.35, 2.9, 0.12));
  return g;
}

export function bellMesh(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector2[] = [];
  const prof: [number, number][] = [[0, 0.95], [0.18, 0.95], [0.26, 0.85], [0.3, 0.55], [0.36, 0.25], [0.5, 0.06], [0.52, 0], [0.46, 0.0], [0.33, 0.22], [0.26, 0.55], [0.2, 0.84], [0, 0.88]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  g.add(mesh(new THREE.LatheGeometry(pts, 20), M.bronze, 0, -0.95, 0));
  g.add(mesh(box(0.12, 0.18, 0.12), M.iron, 0, 0.05, 0));
  g.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), M.iron, 0, -0.85, 0));
  return g;
}

export function rainGauge(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.2, 1.4, 0.2), M.darkWood, 0, 0.7, 0));
  g.add(mesh(cyl(0.09, 0.09, 0.5, 10), flat('#bfe2f0', { transparent: true, opacity: 0.7 }), 0, 1.6, 0.0));
  g.add(mesh(cyl(0.085, 0.085, 0.18, 10), flat('#4a7da0'), 0, 1.44, 0));
  g.add(mesh(new THREE.ConeGeometry(0.16, 0.12, 10, 1, true), M.iron, 0, 1.9, 0, 0, Math.PI));
  return g;
}

export function signpost(M: PropMaterials, arms: { text: string; angle: number }[]): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.18, 2.4, 0.18), M.darkWood, 0, 1.2, 0));
  arms.forEach((a, i) => {
    const tex = textTexture(a.text, 256, 48, '#e8dcbf', '#3a2615', 26);
    const plank = new THREE.Mesh(box(1.4, 0.3, 0.06), [M.wood, M.wood, M.wood, M.wood, new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]);
    plank.position.set(Math.cos(a.angle) * 0.7, 2.1 - i * 0.38, -Math.sin(a.angle) * 0.7);
    plank.rotation.y = a.angle;
    g.add(plank);
  });
  return g;
}

export function textTexture(text: string, w: number, h: number, bg: string, fg: string, size: number, font = 'Georgia, serif'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = fg;
  ctx.font = `bold ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.text = true; // batched into a per-site atlas (see Batcher)
  return t;
}

export function noticeBoard(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.8, 0.8]) g.add(mesh(box(0.16, 2.2, 0.16), M.darkWood, x, 1.1, 0));
  g.add(mesh(box(1.8, 1.1, 0.1), M.wood, 0, 1.45, 0));
  const cap = gableRoof(1.8, 0.5, 0.25, 0.15, 0.08, 0.06);
  g.add(mesh(cap, M.roofRed, 0, 2.08, 0));
  const notes: [number, number, number, number][] = [[-0.5, 1.6, 0.42, 0.5], [0.05, 1.5, 0.5, 0.6], [0.55, 1.65, 0.36, 0.42], [0.45, 1.2, 0.4, 0.3], [-0.45, 1.15, 0.36, 0.3]];
  notes.forEach(([x, y, w, h], i) => g.add(mesh(box(w, h, 0.02), M.paper, x, y, 0.06, 0, 0, (i % 2 ? 1 : -1) * 0.06)));
  return g;
}

/** A mine cart, running along its length (z) like rails(): set on a track with the same turn, its wheels sit on the rails. */
export function cart(M: PropMaterials, ore = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.6, 0.55, 1.0), M.wood, 0, 0.6, 0));
  g.add(mesh(box(0.64, 0.08, 1.04), M.iron, 0, 0.86, 0));
  for (const x of [-0.34, 0.34]) for (const z of [-0.32, 0.32]) g.add(mesh(cyl(0.17, 0.17, 0.08, 10), M.iron, x, 0.22, z, 0, 0, Math.PI / 2));
  if (ore) {
    const rocks = new THREE.Group();
    for (let i = 0; i < 6; i++) rocks.add(mesh(box(0.26, 0.24, 0.28), i % 2 ? M.stone : M.cobble, -0.15 + Math.floor(i / 3) * 0.3, 0.92, -0.3 + (i % 3) * 0.3, i));
    g.add(rocks);
  }
  return g;
}

export function rails(M: PropMaterials, len: number): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.32, 0.32]) g.add(mesh(box(0.07, 0.08, len), M.iron, x, 0.1, 0));
  for (let z = -len / 2 + 0.3; z < len / 2; z += 0.7) g.add(mesh(box(1.0, 0.08, 0.22), M.darkWood, 0, 0.04, z));
  return g;
}

export function stall(M: PropMaterials, awning: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.4, 1.4]) for (const z of [-0.8, 0.8]) g.add(mesh(box(0.14, 2.5, 0.14), M.darkWood, x, 1.25, z));
  g.add(mesh(box(3.0, 0.9, 0.8), M.wood, 0, 0.45, 0.6));
  g.add(mesh(box(3.1, 0.08, 0.9), M.darkWood, 0, 0.92, 0.6));
  const roof = gableRoof(3.2, 2.0, 0.55, 0.25, 0.06, 0.18);
  g.add(mesh(roof, awning, 0, 2.5, 0));
  // Goods
  const colors = ['#c8452e', '#e8b33a', '#6aa13a', '#8a4fa0', '#d97a2a'];
  colors.forEach((c, i) => {
    const m = flat(c);
    for (let k = 0; k < 3; k++) g.add(mesh(new THREE.SphereGeometry(0.1, 6, 5), m, -1.1 + i * 0.5 + (k - 1) * 0.12, 1.04, 0.5 + (k % 2) * 0.12));
  });
  g.add(mesh(box(0.5, 0.35, 0.4), M.wood, -1.0, 1.15, 0.0));
  g.add(mesh(box(0.4, 0.5, 0.4), M.wood, 1.1, 1.2, 0.0));
  return g;
}

export function boat(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Shape();
  hull.moveTo(-1.6, 0.0);
  hull.quadraticCurveTo(-1.2, -0.5, 0, -0.55);
  hull.quadraticCurveTo(1.2, -0.5, 1.7, 0.15);
  hull.lineTo(-1.6, 0.15);
  const geo = new THREE.ExtrudeGeometry(hull, { depth: 1.1, bevelEnabled: false });
  geo.translate(0, 0.5, -0.55);
  g.add(mesh(geo, M.wood));
  g.add(mesh(box(0.2, 0.06, 1.0), M.darkWood, -0.3, 0.55, 0));
  g.add(mesh(box(0.2, 0.06, 1.0), M.darkWood, 0.6, 0.55, 0));
  g.add(mesh(box(2.2, 0.04, 0.05), M.darkWood, 0.3, 0.75, 0.5, 0, 0, 0.25));
  return g;
}

/**
 * A two-masted trading ship, built blocky like the world: bow toward +x, the deck at y 2.2 (so a
 * ship placed 2.2 below a deck height sits right), the hull's foot a little under the water.
 * Sails set for a ship under way, furled on the yards for one at her moorings.
 */
export function ship(M: PropMaterials, sails: 'set' | 'furled' | 'bare' = 'furled', stripe = '#7a2a1e', flag = '#2f528f'): THREE.Group {
  const g = new THREE.Group();
  // The hull in three courses, narrower toward the keel, and the bow and stern built up
  g.add(mesh(box(11, 1.2, 3.2), M.darkWood, 0, 0.1, 0));
  g.add(mesh(box(13, 1.0, 4.2), M.darkWood, 0.2, 1.0, 0));
  g.add(mesh(box(14, 0.7, 4.7), M.wood, 0.3, 1.85, 0));
  g.add(mesh(box(14.1, 0.22, 4.76), flat(stripe), 0.3, 1.55, 0));
  g.add(mesh(box(2.2, 1.9, 3.4), M.darkWood, 7.4, 1.5, 0));
  g.add(mesh(box(1.3, 1.6, 2.2), M.darkWood, 8.9, 2.1, 0));
  g.add(mesh(box(1.4, 2.0, 4.4), M.darkWood, -6.6, 1.6, 0));
  // Deck, the forecastle and the sterncastle with its rail and lantern
  g.add(mesh(box(13.6, 0.14, 4.3), M.wood, 0.3, 2.2, 0));
  g.add(mesh(box(2.8, 1.3, 4.3), M.wood, 6.2, 2.9, 0));
  g.add(mesh(box(3.8, 2.3, 4.7), M.wood, -5.2, 3.35, 0));
  for (const z of [-2.25, 2.25]) {
    g.add(mesh(box(3.8, 0.5, 0.12), M.darkWood, -5.2, 4.75, z));
    g.add(mesh(box(9.0, 0.45, 0.12), M.darkWood, 0.6, 2.5, z));
  }
  g.add(mesh(box(0.12, 0.5, 4.6), M.darkWood, -7.05, 4.75, 0));
  g.add(mesh(box(0.34, 0.44, 0.34), M.glow, -7.4, 4.1, 0));
  g.add(mesh(box(0.42, 0.06, 0.42), M.iron, -7.4, 4.36, 0));
  // A hull still on the slip has no masts yet
  if (sails === 'bare') return g;
  // Masts, yards and bowsprit
  g.add(mesh(cyl(0.16, 0.24, 13.5), M.wood, 0.2, 2.2 + 6.75, 0));
  g.add(mesh(cyl(0.13, 0.2, 10), M.wood, 5.0, 2.2 + 5, 0));
  g.add(mesh(cyl(0.08, 0.12, 5.4), M.wood, 10.4, 3.2, 0, 0, 0, -Math.PI / 2 + 0.32));
  const yard = (x: number, y: number, len: number) => g.add(mesh(box(0.2, 0.2, len), M.darkWood, x, y, 0));
  yard(0.2, 13.2, 6.4); yard(0.2, 8.0, 7.0); yard(5.0, 10.4, 4.8); yard(5.0, 6.6, 5.4);
  const cloth = M.clothCream;
  if (sails === 'set') {
    // Full sails, bellied a little forward
    g.add(mesh(box(0.1, 4.8, 6.0), cloth, 0.45, 10.6, 0));
    g.add(mesh(box(0.1, 3.4, 4.6), cloth, 5.25, 8.5, 0));
    g.add(mesh(box(0.1, 1.4, 5.2), flat(stripe), 0.5, 10.6, 0));
  } else {
    // Furled: rolled along the yards
    for (const [x, y, len] of [[0.2, 12.9, 6], [0.2, 7.7, 6.6], [5.0, 10.1, 4.4], [5.0, 6.3, 5]]) g.add(mesh(cyl(0.2, 0.2, len as number, 6), cloth, x as number, y as number, 0, 0, Math.PI / 2));
  }
  // Stays from the mast heads to bow and stern, and a pennant at the main top
  const stay = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    g.add(mesh(box(len, 0.05, 0.05), M.rope, (ax + bx) / 2, (ay + by) / 2, 0, 0, 0, Math.atan2(by - ay, bx - ax)));
  };
  stay(0.2, 15.6, 5.0, 12.0); stay(5.0, 12.0, 12.4, 4.0); stay(0.2, 15.6, -6.9, 4.8);
  g.add(mesh(box(0.04, 0.5, 1.4), flat(flag), 0.2, 16.1, 0.7));
  return g;
}

export function firepit(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(box(0.34, 0.26, 0.3), M.cobble, Math.cos(a) * 0.62, 0.13, Math.sin(a) * 0.62, -a));
  }
  for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.08, 0.08, 0.9, 6), M.bark, 0, 0.15, 0, (i * Math.PI) / 3, Math.PI / 2));
  for (const x of [-0.75, 0.75]) {
    g.add(mesh(box(0.08, 1.2, 0.08), M.darkWood, x, 0.6, 0, 0, 0, x > 0 ? -0.1 : 0.1));
  }
  g.add(mesh(box(1.7, 0.05, 0.05), M.iron, 0, 1.15, 0));
  g.add(mesh(cyl(0.22, 0.18, 0.28, 10), M.iron, 0, 0.82, 0));
  return g;
}

export function workbench(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.12, 0.8), M.wood, 0, 0.9, 0));
  for (const x of [-0.7, 0.7]) for (const z of [-0.3, 0.3]) g.add(mesh(box(0.12, 0.9, 0.12), M.darkWood, x, 0.45, z));
  // Ledger and tongs
  g.add(mesh(box(0.42, 0.06, 0.32), flat('#6a2f22'), -0.35, 0.99, 0.05, 0.15));
  g.add(mesh(box(0.38, 0.03, 0.28), M.paper, -0.35, 1.03, 0.05, 0.15));
  g.add(mesh(box(0.5, 0.03, 0.05), M.iron, -0.3, 1.06, 0.12, -0.3));
  g.add(mesh(box(0.25, 0.12, 0.2), M.iron, 0.4, 1.02, 0));
  return g;
}

export function chest(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.8, 0.45, 0.5), M.wood, 0, 0.23, 0));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 10, 1, false, 0, Math.PI), M.wood);
  lid.rotation.set(0, 0, Math.PI / 2);
  lid.position.set(0, 0.45, 0);
  g.add(lid);
  for (const x of [-0.28, 0.28]) g.add(mesh(box(0.06, 0.5, 0.52), M.iron, x, 0.25, 0));
  g.add(mesh(box(0.12, 0.14, 0.04), M.bronze, 0, 0.4, 0.26));
  return g;
}

export function door(M: PropMaterials, high = 2): THREE.Group {
  const g = new THREE.Group();
  // Fills a doorway `high` blocks tall
  const t = high - 0.08;
  g.add(mesh(box(0.92, t, 0.1), M.darkWood, 0, t / 2, 0));
  for (const y of high > 2 ? [0.45, 1.45, 2.45] : [0.35, 1.55]) g.add(mesh(box(0.7, 0.07, 0.04), M.iron, -0.06, y, 0.06));
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), M.iron, 0.32, 1.0, 0.08));
  return g;
}

export function windowBox(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.9, 0.22, 0.3), M.darkWood, 0, 0, 0.15));
  const cols = ['#d44a5a', '#f2c03a', '#e9e2ff', '#e46aa0'];
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.08, 5, 4), flat(cols[i % cols.length]), -0.34 + i * 0.17, 0.16, 0.16));
  return g;
}

export function bellows(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.9, 0.2, 0.6), M.darkWood, 0, 0.6, 0));
  g.add(mesh(box(0.8, 0.25, 0.55), flat('#6a4a32'), 0, 0.82, 0));
  g.add(mesh(box(0.9, 0.08, 0.6), M.darkWood, 0, 1.0, 0));
  g.add(mesh(cyl(0.05, 0.05, 0.6, 6), M.iron, 0.6, 0.65, 0, 0, 0, Math.PI / 2));
  for (const x of [-0.3, 0.3]) g.add(mesh(box(0.1, 0.5, 0.1), M.darkWood, x, 0.25, 0));
  return g;
}

// ------------------------------------------------------------ Furniture (interiors face +Z, origin on the floor)

export function table(M: PropMaterials, len = 1.6): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(len, 0.08, 0.86), M.wood, 0, 0.78, 0));
  g.add(mesh(box(len - 0.1, 0.1, 0.06), M.darkWood, 0, 0.7, 0.36));
  g.add(mesh(box(len - 0.1, 0.1, 0.06), M.darkWood, 0, 0.7, -0.36));
  for (const x of [-len / 2 + 0.1, len / 2 - 0.1]) for (const z of [-0.33, 0.33]) g.add(mesh(box(0.09, 0.74, 0.09), M.darkWood, x, 0.37, z));
  // A loaf, a jug and a candle
  g.add(mesh(box(0.3, 0.12, 0.18), M.produce, -0.35, 0.88, 0.05, 0.3));
  g.add(mesh(cyl(0.07, 0.09, 0.22, 8), M.clothCream, 0.3, 0.93, -0.1));
  g.add(mesh(cyl(0.035, 0.035, 0.14, 6), M.paper, 0.05, 0.89, 0.12));
  g.add(mesh(box(0.03, 0.05, 0.03), M.fire, 0.05, 0.98, 0.12));
  return g;
}

export function stool(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.2, 0.2, 0.06, 10), M.wood, 0, 0.46, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(mesh(box(0.05, 0.46, 0.05), M.darkWood, Math.cos(a) * 0.13, 0.22, Math.sin(a) * 0.13, 0, Math.sin(a) * 0.12, -Math.cos(a) * 0.12));
  }
  return g;
}

/** A dresser: cupboard below, plate rack above, with crockery. */
export function dresser(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.4, 0.9, 0.5), M.wood, 0, 0.45, 0));
  for (const x of [-0.35, 0.35]) g.add(mesh(box(0.6, 0.7, 0.03), M.darkWood, x, 0.45, 0.26));
  g.add(mesh(box(1.46, 0.06, 0.56), M.darkWood, 0, 0.92, 0));
  g.add(mesh(box(1.4, 1.0, 0.06), M.darkWood, 0, 1.45, -0.22));
  for (const x of [-0.69, 0.69]) g.add(mesh(box(0.06, 1.0, 0.3), M.darkWood, x, 1.45, -0.1));
  for (const y of [1.3, 1.7]) g.add(mesh(box(1.32, 0.04, 0.28), M.wood, 0, y, -0.1));
  g.add(mesh(box(1.5, 0.08, 0.36), M.darkWood, 0, 1.98, -0.1));
  for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.13, 0.13, 0.03, 10), M.paper, -0.45 + i * 0.3, 1.45, -0.17, 0, Math.PI / 2 - 0.25));
  for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.06, 0.08, 0.2, 8), i === 1 ? M.clothBlue : M.clothCream, -0.4 + i * 0.4, 1.82, -0.1));
  return g;
}

/** A stone fireplace with a mantel, a fire and a pot on the hook. */
export function fireplace(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.7, 0.12, 0.9), M.stone, 0, 0.06, 0.1));
  for (const x of [-0.65, 0.65]) g.add(mesh(box(0.4, 1.3, 0.6), M.cobble, x, 0.65, 0));
  g.add(mesh(box(1.7, 0.4, 0.62), M.cobble, 0, 1.45, 0));
  g.add(mesh(box(1.1, 1.3, 0.12), M.stone, 0, 0.65, -0.26));
  g.add(mesh(box(1.9, 0.12, 0.72), M.darkWood, 0, 1.7, 0.02));
  g.add(mesh(box(1.3, 1.4, 0.5), M.cobble, 0, 2.45, -0.06));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.42 - i * 0.08, 6), M.fire, (i - 1) * 0.12, 0.33 + i * 0.03, (i % 2) * 0.06));
  for (const x of [-0.18, 0.18]) g.add(mesh(box(0.5, 0.1, 0.1), M.bark, x, 0.17, 0.05, 0.4 * Math.sign(x)));
  g.add(mesh(cyl(0.16, 0.12, 0.2, 8), M.iron, 0, 0.75, 0.02));
  g.add(mesh(box(0.02, 0.4, 0.02), M.iron, 0, 1.05, 0.02));
  for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.05, 0.06, 0.16, 6), i === 1 ? M.bronze : M.clothCream, -0.5 + i * 0.5, 1.84, 0.05));
  return g;
}

export function rug(mat: THREE.Material, M: PropMaterials, w = 1.8, d = 1.2): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.02, d), mat, 0, 0.012, 0));
  g.add(mesh(box(w - 0.3, 0.025, d - 0.3), M.clothCream, 0, 0.014, 0));
  g.add(mesh(box(w - 0.5, 0.03, d - 0.5), mat, 0, 0.016, 0));
  return g;
}

/** A shop or bar counter, front panelled, with a few things on top. */
export function counter(M: PropMaterials, len = 2.4): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(len, 0.95, 0.6), M.darkWood, 0, 0.47, 0));
  for (let i = 0; i < Math.floor(len / 0.6); i++) g.add(mesh(box(0.45, 0.6, 0.03), M.wood, -len / 2 + 0.33 + i * 0.6, 0.47, 0.31));
  g.add(mesh(box(len + 0.1, 0.08, 0.7), M.wood, 0, 0.98, 0));
  g.add(mesh(box(0.3, 0.25, 0.22), M.wood, -len / 2 + 0.4, 1.14, 0));
  g.add(mesh(cyl(0.08, 0.1, 0.22, 8), M.clothCream, len / 2 - 0.4, 1.13, 0.05));
  g.add(mesh(box(0.34, 0.04, 0.26), M.paper, 0, 1.04, 0.05, 0.2));
  return g;
}

/** Tall wall shelves, stocked. */
export function shelves(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.68, 0.68]) g.add(mesh(box(0.06, 2.1, 0.42), M.darkWood, x, 1.05, 0));
  g.add(mesh(box(1.42, 2.1, 0.04), M.darkWood, 0, 1.05, -0.2));
  for (let s = 0; s < 4; s++) {
    const y = 0.15 + s * 0.55;
    g.add(mesh(box(1.32, 0.05, 0.4), M.wood, 0, y, 0));
    for (let k = 0; k < 3; k++) {
      const x = -0.42 + k * 0.42, h = (s * 3 + k) % 3;
      if (h === 0) g.add(mesh(box(0.3, 0.26, 0.28), M.wood, x, y + 0.16, 0));
      else if (h === 1) g.add(mesh(cyl(0.09, 0.11, 0.28, 8), s % 2 ? M.clothBlue : M.clothCream, x, y + 0.17, 0));
      else g.add(mesh(box(0.3, 0.2, 0.26), M.clothGreen, x, y + 0.13, 0));
    }
  }
  return g;
}

/** A lantern hanging from the beam above, for interiors. */
export function hangingLamp(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.03, 0.5, 0.03), M.iron, 0, -0.25, 0));
  g.add(mesh(box(0.28, 0.05, 0.28), M.iron, 0, -0.52, 0));
  g.add(mesh(box(0.22, 0.28, 0.22), M.glow, 0, -0.68, 0));
  g.add(mesh(box(0.28, 0.05, 0.28), M.iron, 0, -0.84, 0));
  return g;
}

/** A high-backed chair of office, carved, with a cushion. */
export function highChair(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.9, 0.5, 0.8), M.darkWood, 0, 0.25, 0));
  g.add(mesh(box(0.82, 0.12, 0.72), M.clothBlue, 0, 0.56, 0.02));
  g.add(mesh(box(0.9, 1.7, 0.14), M.darkWood, 0, 1.2, -0.36));
  g.add(mesh(box(0.6, 1.2, 0.04), M.clothBlue, 0, 1.25, -0.28));
  for (const x of [-0.42, 0.42]) { g.add(mesh(box(0.1, 0.42, 0.72), M.darkWood, x, 0.72, 0)); g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), M.bronze, x, 2.1, -0.36)); }
  g.add(mesh(box(0.5, 0.14, 0.1), M.bronze, 0, 2.02, -0.34));
  return g;
}

/** The door leaf standing open against the jamb (an open door, seen edge-on from outside). */
export function openDoor(M: PropMaterials, high = 3): THREE.Group {
  const g = new THREE.Group();
  // The leaf of a doorway `high` blocks tall, swung open against the wall
  const t = high - 0.08;
  g.add(mesh(box(0.1, t, 0.9), M.darkWood, 0, t / 2, 0));
  for (const y of high > 2 ? [0.45, 1.45, 2.45] : [0.35, 1.55]) g.add(mesh(box(0.04, 0.07, 0.7), M.iron, 0.06, y, 0.05));
  return g;
}

/** An interior piece by name (see interiors.ts); tint picks the rug colour. */
export function furniture(M: PropMaterials, item: string, tint = 0): THREE.Group | null {
  switch (item) {
    case 'bed': return cottageBed(M);
    case 'table': return table(M);
    case 'stool': return stool(M);
    case 'dresser': return dresser(M);
    case 'hearth': return fireplace(M);
    case 'rug': return rug([M.clothRed, M.clothBlue, M.clothGreen][tint % 3], M);
    case 'chest': return chest(M);
    case 'barrel': return barrel(M);
    case 'crate': return crate(M, 0.65);
    case 'counter': return counter(M);
    case 'shelves': return shelves(M);
    case 'lamp': return hangingLamp(M);
    case 'bench': return bench(M, 1.8);
    case 'desk': return workbench(M);
    case 'doorOpen': return openDoor(M);
    case 'chair': return highChair(M);
    case 'mushrooms': return mushrooms(tint);
    case 'letters': return letters(M, tint);
    case 'pinned': return pinnedLetters(M, tint);
    case 'candles': return candles(M);
    case 'offering': return offering(M, tint);
    case 'ribbons': return ribbons(M, tint);
    case 'gull': return gull();
    case 'coil': return ropeCoil(M);
    case 'hayrack': return hayRack(M);
    case 'hurdle': return hurdle(M);
    default: return null;
  }
}

export function cottageBed(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.0, 0.4, 2.0), M.wood, 0, 0.2, 0));
  g.add(mesh(box(0.92, 0.18, 1.6), M.clothCream, 0, 0.48, 0.1));
  g.add(mesh(box(0.96, 0.12, 1.2), M.clothRed, 0, 0.6, 0.35));
  return g;
}

export function mineHeadframe(M: PropMaterials, text = 'SALLOW PIT\nHarrowgate & Daughters'): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-3.6, 3.6]) g.add(mesh(box(0.45, 5.2, 0.45), M.darkWood, x, 2.6, 0));
  g.add(mesh(box(8.0, 0.5, 0.55), M.darkWood, 0, 5.1, 0));
  for (const x of [-3.0, 3.0]) g.add(mesh(box(0.25, 1.8, 0.25), M.darkWood, x * 0.9, 4.3, 0, 0, 0, x > 0 ? 0.7 : -0.7));
  const tex = textTexture(text, 512, 128, '#d9c79c', '#3a2414', 40);
  const sign = new THREE.Mesh(box(3.6, 0.9, 0.08), [M.wood, M.wood, M.wood, M.wood, new THREE.MeshLambertMaterial({ map: tex }), M.wood]);
  sign.position.set(0, 5.85, 0.1);
  g.add(sign);
  g.add(mesh(box(0.08, 0.8, 0.08), M.iron, -1.4, 5.7, 0.05));
  g.add(mesh(box(0.08, 0.8, 0.08), M.iron, 1.4, 5.7, 0.05));
  return g;
}

/** Hanging banner with a painted emblem. Returned mesh uses a shared wave material. */
export function bannerTexture(kind: 'hollin' | 'harrow' | 'aldermere'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const x = c.getContext('2d')!;
  const bg = kind === 'hollin' ? '#2f6a3a' : kind === 'harrow' ? '#7a2e22' : '#2a4a86';
  x.fillStyle = bg; x.fillRect(0, 0, 64, 128);
  x.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 128; i += 4) x.fillRect(0, i, 64, 1);
  x.strokeStyle = '#e6c46a'; x.lineWidth = 3; x.strokeRect(4, 4, 56, 112);
  x.fillStyle = '#efe3c4';
  if (kind === 'hollin') {
    // Bridge arch over a wave line
    x.fillRect(12, 52, 40, 6);
    x.beginPath(); x.arc(32, 72, 16, Math.PI, 0); x.lineWidth = 6; x.strokeStyle = '#efe3c4'; x.stroke();
    x.strokeStyle = '#7fb8e0'; x.lineWidth = 4; x.beginPath();
    for (let i = 0; i <= 40; i++) x.lineTo(12 + i, 84 + Math.sin(i * 0.5) * 3);
    x.stroke();
  } else if (kind === 'harrow') {
    // Crossed picks
    x.lineWidth = 6; x.strokeStyle = '#efe3c4';
    x.beginPath(); x.moveTo(16, 40); x.lineTo(48, 84); x.moveTo(48, 40); x.lineTo(16, 84); x.stroke();
    x.fillRect(10, 34, 14, 6); x.fillRect(40, 34, 14, 6);
  } else {
    x.beginPath(); x.moveTo(32, 30); x.lineTo(46, 60); x.lineTo(32, 90); x.lineTo(18, 60); x.closePath(); x.fill();
  }
  // Swallowtail cut
  x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.moveTo(0, 128); x.lineTo(32, 108); x.lineTo(64, 128); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createBannerMaterial(tex: THREE.Texture, time: { value: number }): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: 0.5 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = time;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
float sway = (1.0 - uv.y);
vec4 wp = modelMatrix * vec4(position, 1.0);
// Along the cloth's own normal and across it, so banners merged into one mesh still wave true
vec3 across = normalize(vec3(objectNormal.z, 0.0, -objectNormal.x) + vec3(1e-5));
transformed += objectNormal * sin(uTime * 2.2 + uv.y * 4.0 + wp.x * 0.3 + wp.z * 0.3) * 0.12 * sway;
transformed += across * sin(uTime * 1.7 + uv.y * 3.0) * 0.03 * sway;`);
  };
  return m;
}

export function bannerMesh(mat: THREE.Material, w = 0.9, h = 1.8): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h, 4, 10);
  geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

export function windmillSails(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.3, 0.3, 0.8, 10), M.darkWood, 0, 0, 0.2, 0, Math.PI / 2));
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    arm.add(mesh(box(0.22, 6.2, 0.18), M.darkWood, 0, 3.2, 0.5));
    const cloth = new THREE.Mesh(box(1.3, 5.0, 0.04), M.clothCream);
    cloth.position.set(0.75, 3.6, 0.55);
    arm.add(cloth);
    for (let k = 0; k < 6; k++) arm.add(mesh(box(1.45, 0.06, 0.08), M.wood, 0.72, 1.3 + k * 0.95, 0.5));
    g.add(arm);
  }
  return g;
}

/**
 * An undershot mill wheel: two rims with six spokes each, a dozen paddles, on an axle along x that
 * runs `axleLen` back toward the mill (-x) and a little past the wheel. Spin it about x.
 */
export function waterWheel(M: PropMaterials, axleLen = 5): THREE.Group {
  const g = new THREE.Group();
  const R = 2.4, W = 1.0, N = 12;
  g.add(mesh(cyl(0.16, 0.16, axleLen, 8), M.darkWood, -axleLen / 2 + 0.8, 0, 0, 0, 0, Math.PI / 2));
  for (const sx of [-W / 2, W / 2]) {
    const chord = 2 * R * Math.sin(Math.PI / N) + 0.06;
    for (let k = 0; k < N; k++) {
      const a = ((k + 0.5) / N) * Math.PI * 2;
      g.add(mesh(box(0.12, 0.16, chord), M.darkWood, sx, Math.sin(a) * R, Math.cos(a) * R, 0, Math.PI / 2 - a));
    }
    for (let k = 0; k < 6; k++) g.add(mesh(box(0.1, R * 2, 0.1), M.wood, sx, 0, 0, 0, (k / 6) * Math.PI));
  }
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    g.add(mesh(box(W + 0.15, 0.55, 0.07), M.wood, 0, Math.sin(a) * (R - 0.15), Math.cos(a) * (R - 0.15), 0, Math.PI / 2 - a));
  }
  return g;
}

export function tent(M: PropMaterials, color: string): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-1.3, 0); shape.lineTo(1.3, 0); shape.lineTo(0, 1.8); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false });
  geo.translate(0, 0, -1.3);
  g.add(mesh(geo, flat(color, { side: THREE.DoubleSide })));
  g.add(mesh(box(0.08, 2.1, 0.08), M.darkWood, 0, 1.0, 1.35));
  g.add(mesh(box(0.08, 2.1, 0.08), M.darkWood, 0, 1.0, -1.35));
  g.add(mesh(box(0.9, 1.2, 0.02), flat('#2a2018'), 0, 0.55, 1.31));
  return g;
}

export function well(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(1.1, 1.15, 0.9, 12), M.cobble, 0, 0.45, 0));
  g.add(mesh(cyl(0.85, 0.85, 0.05, 12), flat('#1e3a4a'), 0, 0.75, 0));
  for (const x of [-1, 1]) g.add(mesh(box(0.14, 2.2, 0.14), M.darkWood, x, 1.1, 0));
  g.add(mesh(cyl(0.12, 0.12, 2.1, 8), M.darkWood, 0, 1.8, 0, 0, 0, Math.PI / 2));
  g.add(mesh(gableRoof(2.4, 1.6, 0.7, 0.2, 0.08, 0.15), M.roofRed, 0, 2.2, 0, Math.PI / 2));
  g.add(mesh(cyl(0.18, 0.15, 0.3, 8), M.wood, 0.2, 1.2, 0));
  return g;
}

export function standingSign(M: PropMaterials, text: string): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.8, 0.8]) g.add(mesh(box(0.14, 1.9, 0.14), M.darkWood, x, 0.95, 0));
  const tex = textTexture(text, 384, 128, '#d9c79c', '#3a2414', 44);
  const board = new THREE.Mesh(box(1.9, 0.75, 0.08), [M.wood, M.wood, M.wood, M.wood, new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]);
  board.position.set(0, 1.5, 0);
  g.add(board);
  return g;
}

// ------------------------------------------------------------ Landmark detail (Hollow Oak, wreck, fold, isles)

/** A cluster of toadstools; tint picks red caps or brown. */
export function mushrooms(tint = 0): THREE.Group {
  const g = new THREE.Group();
  const cap = flat(tint % 2 ? '#8a5a3a' : '#b8402e'), stem = flat('#e8dcc0'), spot = flat('#f4ecd8');
  const at: [number, number, number][] = [[0, 0, 1], [0.22, 0.12, 0.7], [-0.18, 0.16, 0.55], [0.08, -0.22, 0.45]];
  at.forEach(([x, z, s], i) => {
    g.add(mesh(cyl(0.05 * s, 0.07 * s, 0.32 * s, 6), stem, x, 0.16 * s, z));
    g.add(mesh(new THREE.SphereGeometry(0.17 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, 0.3 * s, z, i));
    if (!(tint % 2)) g.add(mesh(box(0.05 * s, 0.03 * s, 0.05 * s), spot, x + 0.07 * s, 0.43 * s, z));
  });
  return g;
}

/** Letters tied in bundles and loose on top: the Hollow Oak's post. */
export function letters(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group();
  const seal = flat('#8a2a22'), string = flat('#a88b5a');
  for (let i = 0; i < 3 + (tint % 2); i++) {
    const y = 0.04 + i * 0.07, r = (i * 0.7 + tint) % 1.2 - 0.6;
    g.add(mesh(box(0.34, 0.06, 0.22), i % 2 ? M.paper : flat('#e2d4b0'), (i % 2) * 0.05, y, 0, r));
    g.add(mesh(box(0.36, 0.065, 0.025), string, (i % 2) * 0.05, y, 0, r));
  }
  g.add(mesh(box(0.05, 0.02, 0.05), seal, 0.06, 0.08 + (3 + (tint % 2)) * 0.07, 0.02));
  return g;
}

/** Letters pinned flat to a wall in a loose patchwork (stands at the wall's face, facing +z). */
export function pinnedLetters(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group();
  const old = flat('#d6c8a0'), pin = flat('#5a5a60');
  for (let i = 0; i < 7; i++) {
    const x = ((i * 0.37 + tint * 0.21) % 1.1) - 0.55, y = 0.2 + ((i * 0.53 + tint * 0.13) % 1.2), w = 0.18 + ((i * 0.31) % 0.12);
    g.add(mesh(box(w, w * 1.3, 0.02), i % 3 ? M.paper : old, x, y, 0.01 + i * 0.002, 0, 0, ((i % 3) - 1) * 0.18));
    g.add(mesh(box(0.03, 0.03, 0.03), pin, x, y + w * 0.5, 0.03));
  }
  return g;
}

/** Stubs of candle on a flat stone, the flames in the fire material (light comes from a 'glow'). */
export function candles(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.5, 0.06, 0.36), M.stone, 0, 0.03, 0));
  const wax = flat('#efe6cf');
  for (const [x, z, h] of [[-0.14, 0.04, 0.22], [0.04, -0.06, 0.32], [0.16, 0.07, 0.16]]) {
    g.add(mesh(cyl(0.035, 0.04, h, 6), wax, x, 0.06 + h / 2, z));
    g.add(mesh(new THREE.ConeGeometry(0.025, 0.07, 5), M.fire, x, 0.1 + h, z));
  }
  return g;
}

/** Things left at the roots: a wooden bowl of coins, a twist of ribbon, a small carved bird. */
export function offering(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.1, 10), M.wood, 0, 0.05, 0));
  for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.04, 0.04, 0.012, 8), M.bronze, -0.06 + (i % 2) * 0.1, 0.1 + i * 0.012, -0.04 + (i >> 1) * 0.07));
  g.add(mesh(box(0.3, 0.015, 0.05), [M.clothRed, M.clothBlue, M.clothGreen][tint % 3], 0.26, 0.01, 0.1, 0.6));
  g.add(mesh(box(0.08, 0.08, 0.16), M.darkWood, -0.28, 0.04, 0.06, 0.4));
  g.add(mesh(box(0.05, 0.05, 0.06), M.darkWood, -0.25, 0.1, 0.13, 0.4));
  return g;
}

/** Strips of cloth tied to a branch and hanging down from it (origin at the knot). */
export function ribbons(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group();
  const cols = [M.clothRed, M.clothCream, M.clothBlue, M.clothGreen];
  for (let i = 0; i < 4; i++) {
    const len = 0.5 + ((i * 0.37 + tint * 0.2) % 0.5);
    g.add(mesh(box(0.08, len, 0.015), cols[(i + tint) % 4], (i - 1.5) * 0.14, -len / 2, 0, 0, 0, (i % 2 ? 1 : -1) * 0.08));
  }
  return g;
}

/** A gull sitting, facing +z. */
export function gull(): THREE.Group {
  const g = new THREE.Group();
  const white = flat('#f2f2ee'), grey = flat('#9aa2aa'), beak = flat('#e0b030'), dark = flat('#2a2a2e');
  const body = mesh(new THREE.SphereGeometry(0.16, 8, 6), white, 0, 0.18, 0); body.scale.set(0.8, 0.75, 1.3); g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), white, 0, 0.3, 0.16));
  g.add(mesh(new THREE.ConeGeometry(0.025, 0.1, 5), beak, 0, 0.29, 0.27, 0, Math.PI / 2));
  for (const x of [-0.11, 0.11]) g.add(mesh(box(0.04, 0.12, 0.3), grey, x, 0.22, -0.04, 0, -0.15, 0));
  g.add(mesh(box(0.14, 0.03, 0.12), dark, 0, 0.2, -0.24, 0, 0.3));
  for (const x of [-0.05, 0.05]) g.add(mesh(box(0.02, 0.08, 0.02), beak, x, 0.04, 0));
  return g;
}

/** A coil of rope lying on the ground. */
export function ropeCoil(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.28 - i * 0.04, 0.035, 5, 14), M.rope, 0, 0.04 + i * 0.06, 0, 0, Math.PI / 2));
  return g;
}

/** A hay rack for the fold: a slatted V on legs, hay heaped in it. */
export function hayRack(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.9, 0.9]) for (const z of [-0.35, 0.35]) g.add(mesh(box(0.1, 1.1, 0.1), M.darkWood, x, 0.55, z));
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) g.add(mesh(box(0.05, 0.7, 0.05), M.wood, -0.8 + i * 0.27, 0.95, side * 0.22, 0, side * 0.45, 0));
  for (const side of [-1, 1]) g.add(mesh(box(2.0, 0.07, 0.07), M.darkWood, 0, 1.25, side * 0.38));
  g.add(mesh(box(1.9, 0.08, 0.3), M.darkWood, 0, 0.62, 0));
  g.add(mesh(box(1.7, 0.4, 0.5), flat('#d8b860'), 0, 1.0, 0));
  return g;
}

/** A woven hurdle used as a gate, leaning (local x along it). */
export function hurdle(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) g.add(mesh(box(0.07, 1.1, 0.07), M.darkWood, -0.9 + i * 0.45, 0.55, 0));
  for (let k = 0; k < 6; k++) g.add(mesh(box(1.95, 0.08, 0.05), M.bark, 0, 0.2 + k * 0.15, (k % 2) * 0.04 - 0.02));
  return g;
}

/**
 * A hanging rope (or root) from (0, 0, 0) to (len, -drop, 0) along local x, sagging by `sag`,
 * in short segments; thick tapers from `r0` to `r1`.
 */
export function strand(mat: THREE.Material, len: number, drop: number, sag: number, r0: number, r1 = r0, segs = 8): THREE.Group {
  const g = new THREE.Group();
  const pt = (t: number) => new THREE.Vector3(len * t, -drop * t - sag * 4 * t * (1 - t), 0);
  for (let i = 0; i < segs; i++) {
    const a = pt(i / segs), b = pt((i + 1) / segs);
    const d = b.clone().sub(a), l = d.length();
    const r = r0 + (r1 - r0) * (i + 0.5) / segs;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, l * 1.05, 5), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.add(m);
  }
  return g;
}
