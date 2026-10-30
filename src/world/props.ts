import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DoorKind } from './doorKinds';
export type { DoorKind } from './doorKinds';
import { paintCanvasTexture } from './textures';
import { roofApex, roofOverhang, roofRise } from './roofShape';
import { addGableVolume } from './roofVolumes';
import { guildArms } from '../data/guildhalls';

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
  /** Kell's roofs: copper sheet gone green. */
  roofCopper: THREE.MeshLambertMaterial;
  thatch: THREE.MeshLambertMaterial;
  glow: THREE.MeshLambertMaterial;
  fire: THREE.ShaderMaterial;
  /** A bed of glowing coals under a fire. */
  embers: THREE.MeshBasicMaterial;
  bronze: THREE.MeshStandardMaterial;
  rope: THREE.MeshLambertMaterial;
  clothGreen: THREE.MeshLambertMaterial;
  clothRed: THREE.MeshLambertMaterial;
  clothBlue: THREE.MeshLambertMaterial;
  clothCream: THREE.MeshLambertMaterial;
  produce: THREE.MeshLambertMaterial;
  paper: THREE.MeshLambertMaterial;
  /** Fired clay, and a potter's blue glaze. */
  clay: THREE.MeshLambertMaterial;
  glaze: THREE.MeshStandardMaterial;
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
    roofCopper: lam({ map: tex('roofCopper') }),
    thatch: lam({ map: tex('thatch') }),
    glow: lam({ color: '#3a2a10', emissive: new THREE.Color('#ffb24a'), emissiveIntensity: 0.4 }),
    fire: fireMaterial(),
    embers: emberMaterial(),
    bronze: new THREE.MeshStandardMaterial({ color: '#b8873a', metalness: 0.75, roughness: 0.38 }),
    rope: lam({ color: '#a88b5a' }),
    clothGreen: lam({ color: '#3f7a3a', side: THREE.DoubleSide }),
    clothRed: lam({ color: '#a8382c', side: THREE.DoubleSide }),
    clothBlue: lam({ color: '#2f528f', side: THREE.DoubleSide }),
    clothCream: lam({ color: '#efe3c4', side: THREE.DoubleSide }),
    produce: lam({ vertexColors: true }),
    paper: lam({ color: '#efe6cf' }),
    clay: lam({ color: '#b8683e' }),
    glaze: new THREE.MeshStandardMaterial({ color: '#3f6a94', roughness: 0.35, metalness: 0.05 }),
  };
}

/** Every flame's clock in seconds, stepped by GameWorld.update. */
export const FIRE_TIME = { value: 0 };
let fireMat: THREE.ShaderMaterial | null = null;

/**
 * The material every flame shares, drawn on flame cards (flameCard): a teardrop of fire, white-gold
 * at the heart, orange through the body and red at the edges, that bends, licks and breaks into
 * tongues at the top on its own clock. Each flame flickers out of step with the next by where it
 * stands, so it works in merged batches too.
 */
export function fireMaterial(): THREE.ShaderMaterial {
  if (fireMat) return fireMat;
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  uniforms.uTime = FIRE_TIME;
  fireMat = new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `#include <common>
#include <fog_pars_vertex>
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
  vUv = uv;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  vec4 wp = modelMatrix * p;
  float seed = wp.x * 1.7 + wp.z * 2.3;
  vSeed = seed;
  float h = clamp(uv.y, 0.0, 1.0);
  wp.x += sin(uTime * 5.3 + seed) * 0.02 * h * h;
  wp.z += cos(uTime * 4.1 + seed * 1.3) * 0.016 * h * h;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `#include <common>
#include <fog_pars_fragment>
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
  float y = clamp(vUv.y, 0.0, 1.0);
  float t = uTime + vSeed;
  float x = vUv.x * 2.0 - 1.0;
  // The flame bends and licks, more the higher it goes
  x += (sin(y * 6.0 - t * 5.0) * 0.16 + sin(y * 11.0 - t * 8.3 + 1.3) * 0.08) * y;
  // A teardrop: narrow at the root, widest a third of the way up, drawn to a point
  float width = 1.6 * sqrt(y + 0.02) * (1.0 - y);
  float d = abs(x) / max(width, 0.001);
  // The top breaks into tongues that rise and go out
  float tongues = 0.5 + 0.5 * sin(x * 7.0 + t * 3.0) * sin(y * 5.0 - t * 6.5);
  float heat = (1.0 - d) * (1.0 - y * (0.55 + 0.35 * tongues));
  if (heat <= 0.02) discard;
  vec3 col = mix(vec3(0.75, 0.16, 0.04), vec3(1.0, 0.5, 0.1), smoothstep(0.05, 0.3, heat));
  col = mix(col, vec3(1.0, 0.8, 0.3), smoothstep(0.3, 0.55, heat));
  col = mix(col, vec3(1.0, 0.97, 0.85), smoothstep(0.55, 0.85, heat));
  gl_FragColor = vec4(col, smoothstep(0.02, 0.2, heat));
  #include <fog_fragment>
}`,
  });
  return fireMat;
}

/** A flame card for fireMaterial: two planes crossed, w wide and h tall, standing on y = 0. */
export function flameCard(w: number, h: number, x = 0, z = 0, turn = 0): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY(turn);
  const b = a.clone().rotateY(Math.PI / 2);
  const g = mergeGeometries([a, b], false)!;
  return g.translate(x, 0, z);
}

/** A cook fire's or camp fire's flames, as one shape standing on its own origin. */
export function campFlame(): THREE.BufferGeometry {
  return mergeGeometries([flameCard(0.62, 0.9, 0, 0, 0.3), flameCard(0.44, 0.66, -0.16, 0.06, 0.9), flameCard(0.46, 0.7, 0.15, -0.05, 1.4), flameCard(0.3, 0.45, 0.03, 0.15, 0.6)], false)!;
}

let emberMat: THREE.MeshBasicMaterial | null = null;
/** Coals: black and grey, with orange and gold where they're burning through. */
function emberMaterial(): THREE.MeshBasicMaterial {
  if (emberMat) return emberMat;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  let r = 9;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
    const v = rnd();
    x.fillStyle = v < 0.3 ? '#1c1410' : v < 0.45 ? '#3a2a22' : v < 0.7 ? '#b8380e' : v < 0.88 ? '#f07a1a' : '#ffc850';
    x.fillRect(i, j, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  emberMat = new THREE.MeshBasicMaterial({ map: tex });
  return emberMat;
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
  /** Plain gable ends, no timbers: a stone house (Morrow's). */
  plain?: boolean;
  /** Only the roof: no gable ends, no attic (an open shelter). */
  open?: boolean;
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
  // Solid to the camera (world/roofVolumes.ts)
  addGableVolume(r.x, r.y, r.z, len, span, rise, ov, r.ry, thatch ? 0.55 : 0.62, thatch ? 0 : 0.42);

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

  // An open roof (a lean-to, a market shelter): only the roof itself, nothing under it to look like a house
  if (r.open) return;
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
  // (a hair below the gable ends' foot: the two shared a face there, and under a door's hood, where you
  // see it, it flickered)
  put(attic, M.darkWood, 0, -0.03, 0, Math.PI / 2);

  // Gable ends: plaster infill, a tie beam, king post and two braces, and a lit attic window
  const gh = apex - 0.25;
  const gw = gableWall(span, gh, 0.9);
  for (const s of [-1, 1]) {
    put(gw, M.plaster, s * (len / 2 - 0.45), 0, 0, Math.PI / 2);
    if (r.plain) { if (gh > 2.2) put(box(0.1, 0.7, 0.5), M.glow, s * (len / 2 + 0.03) + s * 0.01, gh * 0.45, 0); continue; }
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

/**
 * A bench, len long. Style 0 is the plain plank on two trestles (pews, quays, yards); a town's
 * squares and gardens get the others: 1 a slatted seat with a back, 2 a stone slab on two blocks,
 * 3 iron ends painted green with a back, 4 a plank on two logs, gone grey.
 */
export function bench(M: PropMaterials, len = 2, style = 0): THREE.Group {
  const g = new THREE.Group();
  if (style === 1) {
    for (const z of [-0.14, 0, 0.14]) g.add(mesh(box(len, 0.06, 0.12), M.wood, 0, 0.48, z));
    for (const y of [0.72, 0.9]) g.add(mesh(box(len, 0.1, 0.05), M.wood, 0, y, -0.22, 0, 0.12));
    for (const x of [-len / 2 + 0.15, len / 2 - 0.15]) { g.add(mesh(box(0.1, 0.45, 0.4), M.darkWood, x, 0.22, 0)); g.add(mesh(box(0.1, 0.62, 0.08), M.darkWood, x, 0.78, -0.22, 0, 0.12)); }
  } else if (style === 2) {
    g.add(mesh(box(len, 0.14, 0.5), M.stone, 0, 0.46, 0));
    for (const x of [-len / 2 + 0.3, len / 2 - 0.3]) g.add(mesh(box(0.34, 0.4, 0.44), M.cobble, x, 0.2, 0));
  } else if (style === 3) {
    const green = flat('#2f4a3a');
    for (const z of [-0.15, -0.05, 0.05, 0.15]) g.add(mesh(box(len, 0.05, 0.08), M.wood, 0, 0.48, z));
    for (const y of [0.7, 0.84]) g.add(mesh(box(len, 0.08, 0.04), M.wood, 0, y, -0.24));
    for (const x of [-len / 2 + 0.12, len / 2 - 0.12]) {
      g.add(mesh(box(0.06, 0.46, 0.06), green, x, 0.23, 0.16)); g.add(mesh(box(0.06, 0.9, 0.06), green, x, 0.45, -0.22, 0, 0.1));
      g.add(mesh(box(0.06, 0.06, 0.44), green, x, 0.52, -0.02)); g.add(mesh(box(0.06, 0.06, 0.36), green, x, 0.66, 0.05));
    }
  } else if (style === 4) {
    const grey = flat('#8a8070');
    g.add(mesh(box(len, 0.1, 0.4), grey, 0, 0.44, 0));
    for (const x of [-len / 2 + 0.25, len / 2 - 0.25]) g.add(mesh(cyl(0.2, 0.22, 0.4, 7), M.bark, x, 0.2, 0));
  } else {
    g.add(mesh(box(len, 0.1, 0.42), M.wood, 0, 0.48, 0));
    for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) g.add(mesh(box(0.12, 0.45, 0.36), M.darkWood, x, 0.22, 0));
  }
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

/** Iron bars across a cell's front, len along x and h high: uprights a hand apart, flats top, middle and foot. */
export function ironBars(M: PropMaterials, len: number, h = 4): THREE.Group {
  const g = new THREE.Group();
  const n = Math.max(2, Math.round(len / 0.24));
  for (let i = 0; i <= n; i++) g.add(mesh(box(0.07, h, 0.07), M.iron, -len / 2 + (i * len) / n, h / 2, 0));
  for (const y of [0.1, h * 0.5, h - 0.1]) g.add(mesh(box(len, 0.1, 0.12), M.iron, 0, y, 0));
  // The cell door's lock, a hand's height above the middle flat
  g.add(mesh(box(0.22, 0.26, 0.18), M.iron, len * 0.3, h * 0.5 + 0.2, 0));
  return g;
}

/** A cellar hatch in the street: two plank leaves in an iron-bound frame, one propped open on its stay, dark below. */
export function cellarHatch(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.5, 0.12, 1.3), M.darkWood, 0, 0.06, 0));
  g.add(mesh(box(1.3, 0.04, 1.1), new THREE.MeshBasicMaterial({ color: '#0a0806' }), 0, 0.13, 0));
  g.add(mesh(box(0.66, 0.08, 1.12), M.wood, -0.34, 0.16, 0));
  const leaf = mesh(box(0.66, 0.08, 1.12), M.wood, 0, 0, 0);
  const hinge = new THREE.Group();
  hinge.position.set(0.66, 0.16, 0);
  hinge.rotation.z = 1.15;
  leaf.position.set(-0.33, 0, 0);
  hinge.add(leaf);
  for (const z of [-0.4, 0.4]) hinge.add(mesh(box(0.6, 0.1, 0.06), M.iron, -0.33, 0.05, z));
  g.add(hinge);
  for (const z of [-0.4, 0.4]) g.add(mesh(box(0.6, 0.1, 0.06), M.iron, -0.34, 0.2, z));
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // The words fit the board: a long name breaks onto two lines at the middle space, and the type
  // comes down until the widest line and the lines' height sit inside the margins
  let lines = text.split('\n');
  const widest = (px: number) => { ctx.font = `bold ${px}px ${font}`; return Math.max(...lines.map((ln) => ctx.measureText(ln).width)); };
  if (lines.length === 1 && widest(size) > w * 0.88 && text.includes(' ')) {
    const mid = text.length / 2;
    let at = -1;
    for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
    lines = [text.slice(0, at), text.slice(at + 1)];
  }
  let px = size;
  while (px > 10 && (widest(px) > w * 0.88 || lines.length * px * 1.15 > h * 0.86)) px -= 2;
  ctx.font = `bold ${px}px ${font}`;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * px * 1.15));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.text = true; // batched into a per-site atlas (see Batcher)
  return t;
}

/** The travellers' board: a wide plank under a little roof, rows of names cut into it and inked, the newest at the foot. */
export function travellersBoard(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.25, 1.25]) g.add(mesh(box(0.18, 2.7, 0.18), M.darkWood, x, 1.35, 0));
  g.add(mesh(box(2.7, 0.1, 0.7), M.roofRed, 0, 2.78, 0.04, 0, 0.22));
  g.add(mesh(box(2.4, 1.5, 0.1), M.wood, 0, 1.65, 0));
  g.add(mesh(box(2.5, 0.12, 0.14), M.darkWood, 0, 2.43, 0)); g.add(mesh(box(2.5, 0.12, 0.14), M.darkWood, 0, 0.87, 0));
  g.add(mesh(box(1.5, 0.14, 0.02), flat('#2a2018'), 0, 2.26, 0.06));                       // the heading
  for (let c = 0; c < 3; c++) for (let r = 0; r < 8; r++) {
    const w = 0.34 + ((r * 7 + c * 3) % 5) * 0.06;
    g.add(mesh(box(w, 0.045, 0.02), flat(r === 7 && c === 2 ? '#7a2a1e' : '#3a2a1a'), -0.75 + c * 0.75 - 0.3 + w / 2, 2.05 - r * 0.14, 0.06));
  }
  g.add(mesh(box(0.12, 0.3, 0.06), M.iron, 1.0, 1.05, 0.08));                             // a knife on a string, to cut yours
  return g;
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
/** A repeatable 0..1 from a seed and a key: the street kit's way of making each piece its own. */
function seeded(seed: number, k: number): number { const v = Math.sin((seed * 733 + k * 91.3) * 12.9898) * 43758.5453; return v - Math.floor(v); }

/**
 * A hand cart. With ore (the mines', the works') it's heaped with rock; given a seed instead it
 * carries whatever its owner left in it: sacks, a load of hay, barrels, turnips, cut logs, or
 * nothing, and some stand tipped back on their handles.
 */
export function cart(M: PropMaterials, ore = true, seed = -1): THREE.Group {
  const g = new THREE.Group();
  if (!ore && seed >= 0) {
    const r = (k: number) => seeded(seed, k), tipped = r(1) < 0.3;
    const body = new THREE.Group(); g.add(body);
    body.add(mesh(box(0.9, 0.12, 1.5), M.wood, 0, 0.62, 0));
    for (const k of [-1, 1]) body.add(mesh(box(0.06, 0.3, 1.5), M.darkWood, k * 0.45, 0.82, 0));
    body.add(mesh(box(0.9, 0.3, 0.06), M.darkWood, 0, 0.82, -0.74));
    for (const k of [-1, 1]) body.add(mesh(box(0.07, 0.07, 1.1), M.darkWood, k * 0.32, 0.62, 1.2));      // the handles
    for (const k of [-1, 1]) g.add(mesh(cyl(0.42, 0.42, 0.08, 12), M.darkWood, k * 0.52, 0.42, -0.1, 0, 0, Math.PI / 2));
    const load = Math.floor(r(2) * 6), top = 0.7;
    if (load === 0) for (let i = 0; i < 4; i++) body.add(mesh(box(0.36, 0.3, 0.5), flat(r(10 + i) < 0.5 ? '#c8b48a' : '#b8a074'), (i % 2 - 0.5) * 0.4, top + 0.16, (Math.floor(i / 2) - 0.5) * 0.6, r(20 + i) - 0.5)); // sacks
    else if (load === 1) body.add(mesh(box(0.84, 0.5, 1.3), M.thatch, 0, top + 0.26, 0, 0, 0.04));                   // hay
    else if (load === 2) for (let i = 0; i < 2; i++) body.add(mesh(cyl(0.24, 0.24, 0.56, 10), M.wood, 0, top + 0.28, (i - 0.5) * 0.62)); // barrels
    else if (load === 3) for (let i = 0; i < 9; i++) body.add(mesh(box(0.16, 0.14, 0.16), flat(r(30 + i) < 0.5 ? '#e8d8c8' : '#9a5a8a'), (r(40 + i) - 0.5) * 0.7, top + 0.08 + r(50 + i) * 0.1, (r(60 + i) - 0.5) * 1.2)); // turnips
    else if (load === 4) for (let i = 0; i < 5; i++) { const lg = mesh(cyl(0.11, 0.11, 1.3, 6), M.bark, -0.3 + i * 0.15, top + 0.12 + (i % 2) * 0.1, 0); lg.rotation.set(Math.PI / 2, 0, 0); body.add(lg); }
    if (tipped) { body.rotation.x = -0.32; body.position.y = 0.32; } // back on its handles, out of the way
    return g;
  }
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
  // Bottom boards above the waterline: a boat afloat is dry inside, not open to the sea under her
  g.add(mesh(box(2.7, 0.05, 1.02), M.darkWood, 0.05, 0.47, 0));
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

// ------------------------------------------------------------ The trades (world/sites.ts buildBusiness)

/**
 * A row of vines on a trellis, len long along x: posts, two wires, leafy growth along them and grape
 * bunches hanging under (dark for a red vineyard, pale green-gold for a white). Hops, tall, the same
 * way (hops: true): taller poles and the bines climbing them, cones instead of grapes.
 */
export function vineRow(M: PropMaterials, len = 12, white = false, hops = false): THREE.Group {
  const g = new THREE.Group();
  const H = hops ? 4.2 : 1.6;
  const leaf = [flat('#3f6a2a'), flat('#4f7a32'), flat('#5a8a3a')];
  const fruit = hops ? flat('#a8c870') : flat(white ? '#c8c86a' : '#4a2a4a');
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 3) g.add(mesh(box(0.12, H, 0.12), M.darkWood, x, H / 2, 0));
  for (const y of hops ? [H - 0.1] : [0.8, 1.45]) g.add(mesh(box(len, 0.02, 0.02), M.iron, 0, y, 0));
  let k = 0;
  for (let x = -len / 2 + 0.3; x < len / 2; x += 0.55, k++) {
    const hh = hops ? 0.6 + ((k * 7) % 5) * 0.65 : 0.7 + ((k * 3) % 4) * 0.22;
    g.add(mesh(box(0.5, hops ? 0.5 : 0.42, 0.42), leaf[k % 3], x, hh, ((k * 5) % 3 - 1) * 0.05));
    if (hops) g.add(mesh(box(0.04, H, 0.04), leaf[0], x, H / 2, 0.1));
    if (k % 2 === 0) g.add(mesh(box(0.14, hops ? 0.14 : 0.22, 0.14), fruit, x + 0.1, hh - (hops ? 0.2 : 0.32), 0.18 * (k % 4 === 0 ? 1 : -1)));
  }
  return g;
}

/** A wine press: a slatted oak basket on a stone bed, the great screw and its bar over it, a tub at the spout. */
export function winePress(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.8, 0.4, 1.8), M.stone, 0, 0.2, 0));
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.add(mesh(box(0.12, 0.9, 0.2), M.wood, Math.cos(a) * 0.55, 0.85, Math.sin(a) * 0.55, -a)); }
  for (const y of [0.55, 1.15]) g.add(mesh(new THREE.TorusGeometry(0.6, 0.04, 5, 16), M.iron, 0, y, 0, 0, Math.PI / 2));
  g.add(mesh(box(0.25, 2.6, 0.25), M.darkWood, -0.95, 1.3, 0)); g.add(mesh(box(0.25, 2.6, 0.25), M.darkWood, 0.95, 1.3, 0));
  g.add(mesh(box(2.3, 0.3, 0.3), M.darkWood, 0, 2.5, 0));
  g.add(mesh(cyl(0.1, 0.1, 1.2, 8), M.darkWood, 0, 1.9, 0));
  g.add(mesh(box(1.6, 0.08, 0.08), M.wood, 0, 1.6, 0, 0.4));
  g.add(mesh(box(0.3, 0.06, 0.2), M.stone, 0, 0.35, 1.0));
  g.add(mesh(cyl(0.32, 0.28, 0.4, 10), M.wood, 0, 0.2, 1.4));
  g.add(mesh(cyl(0.28, 0.28, 0.04, 10), flat('#4a1a2a'), 0, 0.38, 1.4));
  return g;
}

/** Barrels on their sides in a cradle, two high, len long along x: a cellar's or a brewery's racks. */
export function barrelRack(M: PropMaterials, len = 4): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-0.45, 0.45]) g.add(mesh(box(len, 0.14, 0.12), M.darkWood, 0, 0.1, z));
  for (let row = 0; row < 2; row++) for (let x = -len / 2 + 0.45; x <= len / 2 - 0.4; x += 0.85) {
    const b = new THREE.Group();
    b.add(mesh(cyl(0.38, 0.38, 1.0, 10), M.wood));
    for (const y of [-0.38, 0, 0.38]) b.add(mesh(cyl(0.4, 0.4, 0.06, 10), M.iron, 0, y, 0));
    b.add(mesh(cyl(0.3, 0.3, 1.02, 10), M.darkWood));
    b.rotation.x = Math.PI / 2;
    b.position.set(x + row * 0.42, 0.55 + row * 0.7, 0);
    g.add(b);
  }
  return g;
}

/** A rack of cheeses maturing: shelves of wheels, pale rinds and a few waxed red ones. */
export function cheeseRack(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.85, 0.85]) g.add(mesh(box(0.1, 2.0, 0.6), M.wood, x, 1.0, 0));
  for (const y of [0.3, 0.9, 1.5]) {
    g.add(mesh(box(1.8, 0.06, 0.6), M.wood, 0, y, 0));
    for (let k = 0; k < 3; k++) g.add(mesh(cyl(0.22, 0.22, 0.16, 12), flat((k + Math.round(y * 3)) % 4 === 0 ? '#a8382c' : '#e8d8a0'), -0.55 + k * 0.55, y + 0.11, 0));
  }
  return g;
}

/** A fish rack: a timber frame with rows of split fish hanging to cure in the smoke and the wind. */
export function smokeRack(M: PropMaterials, len = 3): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-len / 2, len / 2]) g.add(mesh(box(0.12, 2.2, 0.12), M.darkWood, x, 1.1, 0));
  for (const y of [1.3, 2.0]) {
    g.add(mesh(box(len, 0.06, 0.06), M.darkWood, 0, y, 0));
    for (let x = -len / 2 + 0.25; x < len / 2; x += 0.3) g.add(mesh(box(0.12, 0.5, 0.03), flat(y > 1.5 ? '#c8904a' : '#a8702a'), x, y - 0.3, 0));
  }
  return g;
}

/** A tan-pit's vat: a timbered square sunk to the brim, the liquor in it the colour of oak bark. */
export function tanVat(M: PropMaterials, color = '#6a4a22'): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z, w, d] of [[0, -0.95, 2, 0.1], [0, 0.95, 2, 0.1], [-0.95, 0, 0.1, 2], [0.95, 0, 0.1, 2]] as const) g.add(mesh(box(w, 0.35, d), M.darkWood, x, 0.17, z));
  g.add(mesh(box(1.8, 0.04, 1.8), flat(color), 0, 0.26, 0));
  g.add(mesh(box(1.2, 0.03, 0.6), flat('#b8906a'), 0.1, 0.29, -0.2, 0.3));
  return g;
}

/** Hides stretched on a frame to dry, two to a frame. */
export function hideFrame(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.2, 1.2]) g.add(mesh(box(0.1, 2.0, 0.1), M.darkWood, x, 1.0, 0));
  g.add(mesh(box(2.5, 0.08, 0.08), M.darkWood, 0, 1.95, 0));
  g.add(mesh(box(2.5, 0.08, 0.08), M.darkWood, 0, 0.35, 0));
  g.add(mesh(box(1.0, 1.4, 0.03), flat('#a8784a'), -0.55, 1.15, 0));
  g.add(mesh(box(0.9, 1.3, 0.03), flat('#c8a070'), 0.55, 1.12, 0, 0, 0, 0.05));
  return g;
}

/** A copper pot still: the round-bellied pot on its brick firebox, the neck, the lyne arm to the worm tub. */
export function potStill(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: '#c87a4a', metalness: 0.7, roughness: 0.35 });
  g.add(mesh(box(1.6, 0.8, 1.6), flat('#8a4a3a'), 0, 0.4, 0));
  g.add(mesh(box(0.5, 0.35, 0.05), M.glow, 0, 0.35, 0.81));
  g.add(mesh(new THREE.SphereGeometry(0.75, 12, 8), copper, 0, 1.5, 0));
  g.add(mesh(cyl(0.18, 0.4, 0.9, 10), copper, 0, 2.4, 0));
  g.add(mesh(cyl(0.12, 0.12, 1.4, 8), copper, 0.6, 2.95, 0, 0, 0, -1.25));
  g.add(mesh(cyl(0.45, 0.45, 1.2, 10), M.wood, 1.5, 0.6, 0));
  for (const y of [0.3, 0.9]) g.add(mesh(cyl(0.47, 0.47, 0.05, 10), M.iron, 1.5, y, 0));
  return g;
}

/** A fish box on the quay: a shallow crate of the morning's catch on ice, silver and slate-blue. */
export function fishBox(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.9, 0.22, 0.6), M.wood, 0, 0.11, 0));
  g.add(mesh(box(0.84, 0.04, 0.54), flat('#dfeaf0'), 0, 0.2, 0));
  const tones = ['#9aa8b4', '#6a7a8a', '#b8c4cc', '#7a8a7a'];
  for (let k = 0; k < 6; k++) {
    const x = -0.3 + (k % 3) * 0.3, z = k < 3 ? -0.12 : 0.13, ry = (k % 2 ? 0.3 : -0.25);
    g.add(mesh(box(0.26, 0.06, 0.08), flat(tones[k % 4]), x, 0.25, z, ry));
    g.add(mesh(box(0.06, 0.05, 0.1), flat(tones[k % 4]), x - 0.15 * Math.cos(ry), 0.25, z + 0.15 * Math.sin(ry), ry));
  }
  return g;
}

/** A mooring bollard on a quay's edge: a squat iron post with a lip, a rope's turn round it. */
export function bollard(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const iron = flat('#2e3034');
  g.add(mesh(cyl(0.2, 0.24, 0.55, 10), iron, 0, 0.28, 0));
  g.add(mesh(cyl(0.28, 0.28, 0.1, 10), iron, 0, 0.6, 0));
  g.add(mesh(new THREE.TorusGeometry(0.23, 0.04, 5, 14), M.rope, 0, 0.36, 0, 0, Math.PI / 2));
  return g;
}

/**
 * A harbour crane, the old way: a timber tower on a stone footing, a treadwheel at its foot, a jib
 * reaching out over the water (toward +x) with a rope and hook, a net of cargo hanging from it.
 */
export function dockCrane(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(2.4, 0.5, 2.4), M.stone, 0, 0.25, 0));
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) g.add(mesh(box(0.28, 5.4, 0.28), M.darkWood, x, 3.2, z));
  for (const y of [1.6, 3.4, 5.6]) { g.add(mesh(box(1.9, 0.18, 0.18), M.darkWood, 0, y, -0.8)); g.add(mesh(box(1.9, 0.18, 0.18), M.darkWood, 0, y, 0.8)); g.add(mesh(box(0.18, 0.18, 1.9), M.darkWood, -0.8, y, 0)); g.add(mesh(box(0.18, 0.18, 1.9), M.darkWood, 0.8, y, 0)); }
  // Braces across the tower's faces
  for (const z of [-0.8, 0.8]) g.add(mesh(box(0.14, 2.5, 0.14), M.wood, 0, 2.5, z, 0, 0, 0.62));
  // The cap and the jib, braced from below
  g.add(mesh(box(2.2, 0.3, 2.2), M.wood, 0, 6.05, 0));
  g.add(mesh(box(5.6, 0.3, 0.32), M.darkWood, 2.2, 6.4, 0));
  g.add(mesh(box(0.2, 3.0, 0.2), M.wood, 2.6, 5.2, 0, 0, 0, 0.9));
  g.add(mesh(box(0.42, 0.42, 0.42), M.iron, 4.8, 6.2, 0));
  // Rope down from the jib's end, a hook, a cargo net of sacks on it
  g.add(mesh(box(0.05, 2.9, 0.05), M.rope, 4.8, 4.6, 0));
  g.add(mesh(box(0.08, 0.3, 0.08), M.iron, 4.8, 3.05, 0));
  g.add(mesh(box(1.0, 0.8, 0.9), flat('#a88b5a'), 4.8, 2.5, 0));
  g.add(mesh(box(1.04, 0.06, 0.94), M.rope, 4.8, 2.6, 0));
  g.add(mesh(box(0.06, 0.84, 0.94), M.rope, 4.8, 2.5, 0));
  // The treadwheel at the foot, a man's height across, on its axle
  const wheel = new THREE.Group();
  wheel.add(mesh(new THREE.TorusGeometry(1.2, 0.09, 6, 20), M.darkWood));
  wheel.add(mesh(new THREE.TorusGeometry(1.2, 0.09, 6, 20), M.darkWood, 0, 0, 0.9));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; wheel.add(mesh(box(0.12, 0.08, 0.95), M.wood, Math.cos(a) * 1.18, Math.sin(a) * 1.18, 0.45)); }
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI; wheel.add(mesh(box(2.4, 0.08, 0.08), M.wood, 0, 0, 0, 0, 0, a)); wheel.add(mesh(box(2.4, 0.08, 0.08), M.wood, 0, 0, 0.9, 0, 0, a)); }
  wheel.position.set(-1.9, 1.5, -0.45);
  g.add(wheel);
  g.add(mesh(cyl(0.08, 0.08, 1.6, 6), M.iron, -1.9, 1.5, 0, 0, Math.PI / 2));
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

/** A shut door filling a doorway `high` blocks tall, of the kind its building deserves (see doorLeaf). */
export function door(M: PropMaterials, high = 2, kind: DoorKind = 'cottage', paint?: string): THREE.Group {
  const g = new THREE.Group();
  // (the leaf is built across z; a shut door's runs across x, its front to +z)
  const leaf = doorLeaf(M, high, kind, paint);
  leaf.rotation.y = -Math.PI / 2;
  g.add(leaf);
  return g;
}


/**
 * A door's leaf, `high` blocks tall and a block wide across z, a tenth thick across x. Hung from its +z
 * end (see Doors.makeDoor). Its front, the +x face, carries the hinges, the handle and the knocker; the
 * back the ledges and the bar. Built of small pieces, so it's merged per material wherever it's used.
 */
export function doorLeaf(M: PropMaterials, high = 2, kind: DoorKind = 'cottage', paint?: string): THREE.Group {
  const g = new THREE.Group();
  const t = high - 0.08, W = 0.9;
  const paintMat = paint ? flat(paint) : null;
  const seam = flat('#140e0a');
  const brass = M.bronze;
  const blackIron = flat('#26262a');
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => g.add(mesh(geo, mat, x, y, z, 0, rx));
  /** Both faces: f is +1 for the front, -1 for the back. */
  const faces = (fn: (f: number) => void) => { fn(1); fn(-1); };
  // Strap hinges from the hinge end, with a spear tip, on the front; at y
  const strap = (y: number, len = 0.62, mat: THREE.Material = blackIron, wide = 0.07) => {
    add(box(0.025, wide, len), mat, 0.062, y, W / 2 - len / 2);
    const tip = mesh(box(0.025, wide * 1.15, wide * 1.15), mat, 0.062, y, W / 2 - len);
    tip.rotation.x = Math.PI / 4;
    g.add(tip);
  };
  // Board joints, grooves down both faces
  const boards = (n: number, mat: THREE.Material = seam) => faces((f) => { for (let i = 1; i < n; i++) add(box(0.006, t - 0.04, 0.016), mat, f * 0.051, t / 2, -W / 2 + (W / n) * i); });
  // Ledges and a brace on the back
  const ledged = (body: THREE.Material) => {
    const ys = [0.28, t / 2, t - 0.28];
    for (const y of ys) add(box(0.04, 0.13, W - 0.1), body, -0.07, y, 0);
    for (let i = 0; i < 2; i++) {
      const y0 = ys[i] + 0.06, y1 = ys[i + 1] - 0.06, dy = y1 - y0, dz = W - 0.26;
      add(box(0.035, Math.hypot(dy, dz), 0.11), body, -0.068, (y0 + y1) / 2, 0, Math.atan2(dz, dy));
    }
  };
  // A raised panel on both faces
  const panel = (mat: THREE.Material, y0: number, y1: number, z0: number, z1: number) => faces((f) => {
    add(box(0.022, y1 - y0, z1 - z0), mat, f * 0.058, (y0 + y1) / 2, (z0 + z1) / 2);
    // its moulding, a darker line round it
    add(box(0.008, 0.018, z1 - z0 + 0.03), seam, f * 0.052, y0 - 0.012, (z0 + z1) / 2);
    add(box(0.008, 0.018, z1 - z0 + 0.03), seam, f * 0.052, y1 + 0.012, (z0 + z1) / 2);
  });
  const knob = (mat: THREE.Material, y: number) => faces((f) => add(new THREE.SphereGeometry(0.045, 8, 6), mat, f * 0.09, y, -W / 2 + 0.1));
  const ring = (mat: THREE.Material, y: number, z: number, r = 0.075, f = 1) => {
    const tor = mesh(new THREE.TorusGeometry(r, r * 0.2, 5, 12), mat, f * 0.075, y - r * 0.6, z, Math.PI / 2);
    g.add(tor);
    add(box(0.02, 0.06, 0.06), mat, f * 0.058, y, z);
  };
  const glass = (warm: boolean) => flat(warm ? '#c89a50' : '#8fb0b8', { emissive: new THREE.Color(warm ? '#6a3a10' : '#1a2a2e') });

  switch (kind) {
    case 'cottage': case 'painted': {
      const body = kind === 'painted' && paintMat ? paintMat : M.darkWood;
      add(box(0.1, t, W), body, 0, t / 2, 0);
      boards(4);
      ledged(body);
      strap(0.32); strap(t - 0.36);
      // A thumb latch: the grip on the front, the bar across the back
      add(box(0.03, 0.18, 0.04), blackIron, 0.07, t * 0.52, -W / 2 + 0.12);
      add(box(0.03, 0.04, 0.24), blackIron, -0.1, t * 0.52 + 0.05, -W / 2 + 0.16);
      break;
    }
    case 'panelled': {
      const body = paintMat ?? M.darkWood;
      add(box(0.1, t, W), body, 0, t / 2, 0);
      const mid = t * 0.44;
      for (const [z0, z1] of [[-0.36, -0.04], [0.04, 0.36]]) { panel(body, 0.16, mid - 0.1, z0, z1); panel(body, mid + 0.1, t - 0.14, z0, z1); }
      // A lock rail, the knob, a letter plate and the knocker in brass
      faces((f) => add(box(0.012, 0.03, W - 0.08), seam, f * 0.051, mid, 0));
      knob(brass, mid);
      add(box(0.014, 0.05, 0.22), brass, 0.058, mid - 0.24, 0);
      ring(brass, t * 0.7, 0, 0.07);
      break;
    }
    case 'dutch': {
      // An inn's stable door: two halves, a shelf on the lower to lean on, a lit window in the upper
      const body = paintMat ?? M.darkWood;
      const cut = t * 0.5;
      add(box(0.1, cut - 0.012, W), body, 0, (cut - 0.012) / 2, 0);
      add(box(0.1, t - cut - 0.012, W), body, 0, cut + 0.012 + (t - cut - 0.012) / 2, 0);
      faces((f) => add(box(0.004, 0.024, W), seam, f * 0.05, cut, 0));
      add(box(0.13, 0.045, W + 0.02), M.wood, 0.075, cut - 0.03, 0);
      boards(3);
      const wy = cut + (t - cut) * 0.55, wh = (t - cut) * 0.42;
      add(box(0.104, wh, 0.42), glass(true), 0, wy, -0.08);
      faces((f) => {
        add(box(0.012, wh + 0.06, 0.03), body, f * 0.053, wy, -0.08);
        add(box(0.012, 0.03, 0.48), body, f * 0.053, wy, -0.08);
        add(box(0.012, wh + 0.06, 0.03), body, f * 0.053, wy, -0.08 - 0.225);
        add(box(0.012, wh + 0.06, 0.03), body, f * 0.053, wy, -0.08 + 0.225);
      });
      strap(0.3, 0.5); strap(cut - 0.22, 0.5); strap(cut + 0.2, 0.5); strap(t - 0.24, 0.5);
      ring(blackIron, cut - 0.14, -W / 2 + 0.16, 0.06);
      break;
    }
    case 'glazed': {
      // A shop door: a panel below, small panes above to see the goods through
      const body = paintMat ?? M.darkWood;
      const sill = t * 0.42, top = t - 0.1;
      add(box(0.1, sill, W), body, 0, sill / 2, 0);
      add(box(0.1, 0.1, W), body, 0, t - 0.05, 0);
      faces((f) => { add(box(0.1, top - sill, 0.1), body, 0, (sill + top) / 2, (W / 2 - 0.05) * f); });
      add(box(0.06, top - sill, W - 0.2), glass(true), 0, (sill + top) / 2, 0);
      // glazing bars: two across, one down
      faces((f) => {
        for (const k of [1, 2]) add(box(0.03, 0.025, W - 0.2), body, f * 0.025, sill + ((top - sill) * k) / 3, 0);
        add(box(0.03, top - sill, 0.025), body, f * 0.025, (sill + top) / 2, 0);
      });
      panel(body, 0.14, sill - 0.1, -0.33, 0.33);
      // A brass pull and a shop bell over the door
      add(box(0.03, 0.34, 0.03), brass, 0.1, sill + 0.05, -W / 2 + 0.12);
      for (const dy of [-0.14, 0.14]) add(box(0.05, 0.03, 0.03), brass, 0.075, sill + 0.05 + dy, -W / 2 + 0.12);
      add(box(0.014, 0.05, 0.2), brass, 0.058, sill - 0.24, 0);
      break;
    }
    case 'studded': {
      // A smithy's, a gaol's, a tower's: heavy boards, three iron bands, rows of nail heads
      add(box(0.12, t, W), M.darkWood, 0, t / 2, 0);
      boards(5);
      const bands = [0.24, t / 2, t - 0.24];
      faces((f) => {
        for (const y of bands) add(box(0.025, 0.1, W), M.iron, f * 0.07, y, 0);
        for (let y = 0.42; y < t - 0.3; y += 0.3) {
          if (bands.some((b) => Math.abs(b - y) < 0.12)) continue;
          for (const z of [-0.33, -0.11, 0.11, 0.33]) add(box(0.03, 0.05, 0.05), M.iron, f * 0.07, y, z);
        }
      });
      ring(M.iron, t * 0.55, -W / 2 + 0.2, 0.09);
      ring(M.iron, t * 0.55, -W / 2 + 0.2, 0.09, -1);
      break;
    }
    case 'iron': {
      // A bank's: plate on oak, riveted round the edge, a brass lock box and a bar
      add(box(0.12, t, W), M.darkWood, 0, t / 2, 0);
      const plate = flat('#4a4e54');
      faces((f) => {
        add(box(0.02, t - 0.06, W - 0.06), plate, f * 0.068, t / 2, 0);
        for (let y = 0.12; y < t - 0.05; y += 0.2) for (const z of [-0.39, 0.39]) add(box(0.025, 0.04, 0.04), blackIron, f * 0.08, y, z);
        for (let z = -0.3; z < 0.31; z += 0.15) for (const y of [0.1, t - 0.1, t * 0.5]) add(box(0.025, 0.04, 0.04), blackIron, f * 0.08, y, z);
        add(box(0.02, 0.08, W - 0.06), blackIron, f * 0.08, t * 0.32, 0);
        add(box(0.02, 0.08, W - 0.06), blackIron, f * 0.08, t * 0.72, 0);
      });
      add(box(0.03, 0.26, 0.18), brass, 0.09, t * 0.52, -W / 2 + 0.18);
      add(box(0.01, 0.07, 0.025), seam, 0.106, t * 0.5, -W / 2 + 0.18);
      ring(brass, t * 0.42, -W / 2 + 0.18, 0.06);
      break;
    }
    case 'carved': {
      // A chapel's or a hall's: oak in a carved frame, a bronze sun on the front, the hinges scrolled
      add(box(0.11, t, W), M.wood, 0, t / 2, 0);
      const frame = M.darkWood;
      faces((f) => {
        add(box(0.03, 0.08, W - 0.1), frame, f * 0.062, 0.12, 0);
        add(box(0.03, 0.08, W - 0.1), frame, f * 0.062, t - 0.12, 0);
        add(box(0.03, 0.08, W - 0.1), frame, f * 0.062, t * 0.4, 0);
        for (const z of [-0.39, 0.39]) add(box(0.03, t - 0.16, 0.08), frame, f * 0.062, t / 2, z);
        add(box(0.03, t * 0.6 - 0.16, 0.06), frame, f * 0.062, t * 0.4 + (t * 0.6 - 0.08) / 2, 0);
      });
      const sun = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), brass, 0.08, t * 0.68, 0, 0, 0, Math.PI / 2);
      g.add(sun);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const ray = mesh(box(0.02, 0.09, 0.025), brass, 0.08, t * 0.68 + Math.cos(a) * 0.16, Math.sin(a) * 0.16);
        ray.rotation.x = -a;
        g.add(ray);
      }
      // Scrolled hinges: the strap, then two curls splitting off its end
      for (const y of [0.34, t - 0.38]) {
        strap(y, 0.5, blackIron, 0.06);
        for (const k of [-1, 1]) {
          const curl = mesh(box(0.022, 0.04, 0.2), blackIron, 0.062, y + k * 0.07, W / 2 - 0.52);
          curl.rotation.x = k * 0.6;
          g.add(curl);
        }
      }
      ring(blackIron, t * 0.4, -W / 2 + 0.17, 0.08);
      break;
    }
    case 'rough': {
      // A store's or a shed's: boards of no great care, a Z brace, a rope loop to pull
      const n = 4, bw = W / n;
      for (let i = 0; i < n; i++) {
        const h = t - [0, 0.05, 0.02, 0.07][i];
        add(box(0.08, h, bw - 0.012), i % 2 ? M.wood : M.darkWood, 0, h / 2, -W / 2 + bw * (i + 0.5));
      }
      for (const y of [0.26, t - 0.3]) add(box(0.04, 0.13, W - 0.08), M.wood, -0.06, y, 0);
      { const y0 = 0.32, y1 = t - 0.36, dz = W - 0.24; add(box(0.035, Math.hypot(y1 - y0, dz), 0.11), M.wood, -0.058, (y0 + y1) / 2, 0, Math.atan2(dz, y1 - y0)); }
      for (const y of [0.3, t - 0.34]) add(box(0.02, 0.05, 0.16), blackIron, 0.05, y, W / 2 - 0.08);
      const loop = mesh(new THREE.TorusGeometry(0.06, 0.014, 4, 10), M.rope, 0.06, t * 0.5, -W / 2 + 0.14, Math.PI / 2);
      g.add(loop);
      break;
    }
  }
  return g;
}

/** A stone doorstep, half a block high, in front of a door that stands a block above the ground. */
export function doorstep(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.2, 0.5, 0.8), M.cobble, 0, 0.25, 0));
  g.add(mesh(box(1.26, 0.06, 0.86), flat('#9a968c'), 0, 0.5, 0.01)); // a worn top slab, a shade lighter
  return g;
}

/** A painted shutter, folded back against the wall beside a window: boards, two battens and a hinge. */
export function shutter(M: PropMaterials, color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.44, 1.9, 0.06), flat(color), 0, 0.95, 0.03));
  for (const y of [0.35, 1.55]) g.add(mesh(box(0.46, 0.1, 0.04), flat(color), 0, y, 0.07));
  g.add(mesh(box(0.06, 0.06, 0.05), M.iron, 0.2, 0.35, 0.09));
  return g;
}

/** A Charter Post box on its stake: painted the Post's blue, a sloped lid, a brass slot, and the Post's horn on its face. */
/**
 * A reek-fire's hearth on Inkholm: a raised ring of stones heaped with bundles of dried reek (the
 * bitter herb the Reekers burn against the Grey), an iron basket on a pole over it. Cold until lit
 * (game/Game.ts sets the flames on it).
 */
export function reekHearth(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(mesh(box(0.4, 0.42, 0.36), M.cobble, Math.cos(a) * 0.82, 0.21, Math.sin(a) * 0.82, -a));
  }
  const reek = flat('#4a5a3a'), tie = flat('#8a6a3a');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = mesh(cyl(0.11, 0.13, 0.9, 6), reek, Math.cos(a) * 0.32, 0.5, Math.sin(a) * 0.32, 0.5 * Math.cos(a), 0, 0.5 * Math.sin(a));
    g.add(b);
    g.add(mesh(cyl(0.135, 0.135, 0.06, 6), tie, Math.cos(a) * 0.32, 0.5, Math.sin(a) * 0.32, 0.5 * Math.cos(a), 0, 0.5 * Math.sin(a)));
  }
  g.add(mesh(box(0.08, 2.2, 0.08), M.iron, 1.1, 1.1, 0));
  g.add(mesh(box(0.7, 0.06, 0.06), M.iron, 0.8, 2.15, 0));
  for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) g.add(mesh(box(0.03, 0.34, 0.03), M.iron, 0.45 + dx, 1.95, dz));
  g.add(mesh(box(0.36, 0.04, 0.36), M.iron, 0.45, 1.78, 0));
  return g;
}

export function postBox(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const paint = flat('#2c4a6a'), brass = flat('#c9a24a');
  g.add(mesh(box(0.16, 0.95, 0.16), M.darkWood, 0, 0.475, 0));
  g.add(mesh(box(0.64, 0.56, 0.46), paint, 0, 1.22, 0));
  g.add(mesh(box(0.72, 0.07, 0.58), paint, 0, 1.53, -0.01, 0.16, 0, 0));
  g.add(mesh(box(0.74, 0.05, 0.05), M.darkWood, 0, 0.95, 0.21));
  // The slot, and the horn (a ring and its bell) under it
  g.add(mesh(box(0.36, 0.09, 0.02), brass, 0, 1.38, 0.235));
  g.add(mesh(box(0.28, 0.03, 0.03), flat('#141414'), 0, 1.38, 0.24));
  g.add(mesh(new THREE.TorusGeometry(0.07, 0.018, 4, 10), brass, -0.04, 1.14, 0.235));
  g.add(mesh(cyl(0.012, 0.05, 0.14, 6), brass, 0.09, 1.14, 0.235, 0, 0, Math.PI / 2));
  // The clerk's lock on the side
  g.add(mesh(box(0.03, 0.1, 0.08), M.iron, 0.33, 1.2, 0.1));
  return g;
}

/**
 * A window box. Each house plants its own (seed 0..1, from where it hangs): geraniums in one colour,
 * a mix, ivy trailing over the front, herbs, or bare earth where nobody has got round to it; the
 * box itself dark wood, or painted to go with the shutters.
 */
export function windowBox(M: PropMaterials, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const r = (k: number) => { const v = Math.sin((seed * 911 + k * 57.3) * 12.9898) * 43758.5453; return v - Math.floor(v); };
  g.add(mesh(box(0.9, 0.22, 0.3), [M.darkWood, M.darkWood, flat('#3a5a7a'), flat('#4a6a4a'), flat('#7a3a32'), M.wood][Math.floor(r(1) * 6)], 0, 0, 0.15));
  const what = r(2);
  if (what > 0.92) { g.add(mesh(box(0.8, 0.04, 0.22), flat('#4a3a26'), 0, 0.12, 0.15)); return g; } // bare earth
  const sets = [['#d44a5a'], ['#f4f0f8'], ['#e46aa0'], ['#d44a5a', '#f2c03a', '#e9e2ff', '#e46aa0'], ['#9a5ad8', '#f4f0f8'], ['#e8803a', '#f2c03a'], ['#3a5ad8', '#f4f0f8']];
  if (what > 0.8) {
    for (let i = 0; i < 4; i++) g.add(mesh(box(0.16, 0.14 + r(10 + i) * 0.14, 0.16), flat(['#7a9a6a', '#4a6a3a', '#5a8a3a'][i % 3]), -0.3 + i * 0.2, 0.18, 0.15)); // herbs
    return g;
  }
  const cols = sets[Math.floor(r(3) * sets.length)], n = 4 + Math.floor(r(4) * 4);
  for (let i = 0; i < n; i++) g.add(mesh(new THREE.SphereGeometry(0.07 + r(20 + i) * 0.03, 5, 4), flat(cols[Math.floor(r(30 + i) * cols.length)]), -0.36 + (i + r(40 + i) * 0.5) * (0.72 / n), 0.14 + r(50 + i) * 0.06, 0.1 + r(60 + i) * 0.12));
  if (what < 0.25) for (let i = 0; i < 3; i++) g.add(mesh(box(0.1, 0.24 + r(70 + i) * 0.2, 0.04), flat('#3a5a2a'), -0.3 + i * 0.3 + r(80 + i) * 0.1, -0.1 - r(70 + i) * 0.1, 0.31)); // ivy over the front
  return g;
}

// ---- The street kit: what makes a town street look lived in (world/sites.ts houseInto and the
// towns' dressing). Each stands on its own frame with +z out from the wall it's fixed to.

/**
 * A trade's sign on an iron bracket, hung out from the wall beside the door so it reads from up and
 * down the street: a painted board with the trade's emblem on both faces. emblem: 0 an inn's tankard,
 * 1 a shop's loaf, 2 a workshop's hammer, 3 an office's scroll, 4 a key, 5 a boot.
 */
export function shopSign(M: PropMaterials, color: string, emblem = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.08, 0.08, 1.15), M.iron, 0, 0, 0.58));
  g.add(mesh(box(0.06, 0.5, 0.06), M.iron, 0, -0.22, 0.06));
  g.add(mesh(box(0.05, 0.05, 0.7), M.iron, 0, -0.26, 0.38, 0, -0.62));
  for (const z of [0.42, 1.0]) g.add(mesh(box(0.03, 0.18, 0.03), M.iron, 0, -0.1, z));
  const board = flat(color), ink = flat('#1e1610'), gilt = flat('#e0bd64');
  g.add(mesh(box(0.08, 0.66, 0.78), board, 0, -0.52, 0.71));
  g.add(mesh(box(0.1, 0.72, 0.06), gilt, 0, -0.52, 0.31));
  g.add(mesh(box(0.1, 0.72, 0.06), gilt, 0, -0.52, 1.11));
  g.add(mesh(box(0.1, 0.06, 0.86), gilt, 0, -0.17, 0.71));
  g.add(mesh(box(0.1, 0.06, 0.86), gilt, 0, -0.87, 0.71));
  const icon = (w: number, h: number, y: number, z: number, m: THREE.Material = ink) => g.add(mesh(box(0.11, h, w), m, 0, -0.52 + y, 0.71 + z));
  if (emblem === 0) { icon(0.26, 0.3, -0.02, -0.04, gilt); icon(0.06, 0.18, 0, 0.16, gilt); icon(0.3, 0.06, 0.16, -0.04, flat('#f4f0e0')); }
  else if (emblem === 1) { icon(0.44, 0.18, -0.04, 0, flat('#c8863a')); icon(0.34, 0.08, 0.08, 0, flat('#c8863a')); for (const z of [-0.1, 0.02, 0.14]) icon(0.03, 0.12, 0.02, z); }
  else if (emblem === 2) { icon(0.06, 0.36, -0.06, 0, flat('#8a5a32')); icon(0.32, 0.12, 0.14, 0, flat('#9aa0a6')); }
  else if (emblem === 3) { icon(0.4, 0.26, 0, 0, flat('#f4ecd8')); icon(0.06, 0.32, 0, -0.2, flat('#c8a050')); icon(0.06, 0.32, 0, 0.2, flat('#c8a050')); icon(0.24, 0.03, 0.04, 0); icon(0.2, 0.03, -0.04, 0); }
  else if (emblem === 4) { icon(0.16, 0.16, 0.08, -0.12, gilt); icon(0.32, 0.05, 0.08, 0.1, gilt); icon(0.05, 0.1, 0.0, 0.2, gilt); }
  else { icon(0.12, 0.3, 0.04, -0.08, flat('#5a3a22')); icon(0.3, 0.12, -0.1, 0.02, flat('#5a3a22')); }
  return g;
}

/** A striped canvas awning over a shop window or a stall front, len wide, on two iron stays. */
export function awning(M: PropMaterials, color: string, len = 2.4): THREE.Group {
  const g = new THREE.Group();
  const a = flat(color, { side: THREE.DoubleSide }), b = flat('#efe6cf', { side: THREE.DoubleSide });
  const n = Math.max(3, Math.round(len / 0.32));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    g.add(mesh(box(len / n, 0.04, 1.15), i % 2 ? b : a, x, -0.28, 0.55, 0, 0.48));
    g.add(mesh(box(len / n, 0.22, 0.03), i % 2 ? b : a, x, -0.62, 1.07)); // the valance
  }
  for (const k of [-1, 1]) g.add(mesh(box(0.04, 0.04, 1.2), M.iron, k * (len / 2 - 0.05), -0.55, 0.5, 0, -0.1));
  return g;
}

/** A planter of flowers: a stone trough (tint 0) or a painted box (1), full of colour. */
/**
 * A planter of flowers. Without a seed it's the tidy one (stone, or dark wood for tint); with one
 * (0..1, from where it stands) no two are alike: the box stone, wood, painted or terracotta, and in
 * it flowers in their own colours and scatter, kitchen herbs, a clipped box shrub, or somebody's
 * flowers gone over and not cleared.
 */
export function planter(M: PropMaterials, tint = 0, seed = -1): THREE.Group {
  const g = new THREE.Group();
  const r = (k: number) => { const v = Math.sin((seed * 977 + k * 131.7) * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const fancy = seed >= 0;
  const boxMat = !fancy ? (tint ? M.darkWood : M.stone) : [M.stone, M.darkWood, flat('#3a5a7a'), flat('#b8643a'), M.wood, flat('#e4ddcc')][Math.floor(r(1) * 6)];
  const len = fancy ? 1.1 + Math.floor(r(2) * 3) * 0.2 : 1.5;
  g.add(mesh(box(len, 0.5, 0.55), boxMat, 0, 0.25, 0));
  g.add(mesh(box(len - 0.12, 0.08, 0.44), flat('#4a3a26'), 0, 0.5, 0));
  const what = fancy ? r(3) : 0;
  if (what > 0.86) {
    // A clipped box shrub
    g.add(mesh(box(len - 0.3, 0.55, 0.42), flat('#2f5a2a'), 0, 0.8, 0));
    return g;
  }
  if (what > 0.74) {
    // Herbs for the kitchen: sage, rosemary, chives, in clumps
    for (let i = 0; i < 4; i++) g.add(mesh(box(0.22, 0.18 + r(10 + i) * 0.22, 0.22), flat(['#7a9a6a', '#4a6a3a', '#5a8a3a', '#8aa07a'][i]), -len / 2 + 0.25 + i * (len - 0.5) / 3, 0.62, (r(20 + i) - 0.5) * 0.12));
    return g;
  }
  g.add(mesh(box(len - 0.2, 0.22, 0.4), flat(what > 0.68 ? '#6a6a3a' : '#3f7a34'), 0, 0.62, 0));
  if (what > 0.68) return g; // gone over
  const sets = [['#d44a5a', '#f2c03a', '#f4f0f8'], ['#9a5ad8', '#f29a3a', '#f4e04a'], ['#e46aa0', '#ffffff', '#d44a5a'], ['#3a5ad8', '#ffffff', '#f4e04a'], ['#e8803a', '#c8302a', '#f2c03a'], ['#f4f0f8', '#c8a0e8', '#9a5ad8']];
  const cols = fancy ? sets[Math.floor(r(4) * sets.length)] : sets[Math.abs(Math.round(tint * 7)) % 3];
  const n = fancy ? 5 + Math.floor(r(5) * 8) : 9;
  for (let i = 0; i < n; i++) {
    const x = fancy ? (r(30 + i) - 0.5) * (len - 0.3) : -0.56 + i * 0.14, z = fancy ? (r(50 + i) - 0.5) * 0.3 : (i % 3 - 1) * 0.11;
    g.add(mesh(box(0.12, 0.12, 0.12), flat(cols[fancy ? Math.floor(r(70 + i) * 3) : i % 3]), x, 0.78 + (fancy ? r(90 + i) * 0.12 : (i % 2) * 0.05), z));
  }
  return g;
}

/** A stone balustrade len long along x: a plinth, turned balusters a hand apart, a broad rail on top, a pier at each end. */
export function balustrade(M: PropMaterials, len: number): THREE.Group {
  const g = new THREE.Group();
  const st = flat('#e4ddcc'), dk = flat('#c4bca8');
  g.add(mesh(box(len, 0.16, 0.42), dk, 0, 0.08, 0));
  g.add(mesh(box(len + 0.1, 0.14, 0.5), st, 0, 0.98, 0));
  const n = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    g.add(mesh(cyl(0.07, 0.1, 0.24, 6), st, x, 0.28, 0));
    g.add(mesh(cyl(0.11, 0.07, 0.3, 6), st, x, 0.55, 0));
    g.add(mesh(cyl(0.06, 0.08, 0.2, 6), st, x, 0.8, 0));
  }
  for (const k of [-1, 1]) g.add(mesh(box(0.34, 1.12, 0.48), dk, k * (len / 2 - 0.12), 0.56, 0));
  return g;
}

/** A deck's rail len long along x: a cap rail on square posts every block and a half, square balusters between, a bottom rail. */
export function deckRail(M: PropMaterials, len: number): THREE.Group {
  const g = new THREE.Group();
  const posts = Math.max(1, Math.round(len / 1.5));
  for (let i = 0; i <= posts; i++) g.add(mesh(box(0.14, 1.1, 0.14), M.darkWood, -len / 2 + (i * len) / posts, 0.55, 0));
  g.add(mesh(box(len + 0.12, 0.08, 0.2), M.darkWood, 0, 1.08, 0));
  g.add(mesh(box(len, 0.06, 0.08), M.wood, 0, 0.12, 0));
  const n = Math.max(2, Math.round(len / 0.2));
  for (let i = 1; i < n; i++) g.add(mesh(box(0.05, 0.9, 0.05), M.wood, -len / 2 + (i * len) / n, 0.6, 0));
  return g;
}

/** A canvas sunshade over a table: a pole, the cloth in the colour given with a pale trim round its edge. */
export function parasol(M: PropMaterials, color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.04, 0.04, 2.5, 6), M.darkWood, 0, 1.25, 0));
  const cloth = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.5, 8, 1, true), flat(color, { side: THREE.DoubleSide }));
  cloth.position.y = 2.45;
  g.add(cloth);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.14, 8, 1, true), flat('#f2ead8', { side: THREE.DoubleSide }));
  trim.position.y = 2.15;
  g.add(trim);
  g.add(mesh(box(0.1, 0.1, 0.1), M.darkWood, 0, 2.74, 0));
  return g;
}

/** Lamps strung on a line len long along x, sagging in the middle: small glass lamps, lit. */
export function stringLights(M: PropMaterials, len: number, sag = 0.4): THREE.Group {
  const g = new THREE.Group();
  const n = Math.max(3, Math.round(len / 0.9));
  const yAt = (t: number) => -sag * 4 * t * (1 - t);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const x0 = -len / 2 + t0 * len, x1 = -len / 2 + t1 * len, y0 = yAt(t0), y1 = yAt(t1);
    const seg = mesh(box(Math.hypot(x1 - x0, y1 - y0), 0.02, 0.02), M.rope, (x0 + x1) / 2, (y0 + y1) / 2, 0);
    seg.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    g.add(seg);
    if (i > 0) { g.add(mesh(box(0.03, 0.12, 0.03), M.iron, x0, y0 - 0.06, 0)); g.add(mesh(box(0.12, 0.14, 0.12), M.glow, x0, y0 - 0.18, 0)); }
  }
  return g;
}

/** A washing line between two posts, len long, with the day's wash pegged out on it. */
/** A line of washing between two posts. The seed (0..1, from where it hangs) is whose washing it is. */
export function washLine(M: PropMaterials, len = 4, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const r = (k: number) => seeded(seed, k);
  for (const k of [-1, 1]) { g.add(mesh(box(0.1, 2.1, 0.1), M.darkWood, k * len / 2, 1.05, 0)); g.add(mesh(box(0.08, 0.08, 0.4), M.darkWood, k * len / 2, 2.0, 0)); }
  g.add(mesh(box(len, 0.02, 0.02), M.rope, 0, 1.96, 0));
  const cloths = ['#f4f0e4', '#7a2a24', '#3a5a8a', '#e8dcc0', '#5a7a3a', '#c8a050', '#4a3a5a', '#d8c0b0', '#2a3a4a', '#a8582a'];
  let x = -len / 2 + 0.35 + r(1) * 0.4;
  for (let i = 0; x < len / 2 - 0.4; i++) {
    const w = 0.3 + r(10 + i) * 0.45, h = 0.35 + r(30 + i) * 0.6;
    if (r(50 + i) > 0.82) { x += w + 0.3; continue; } // a gap where something's been taken in
    const c = flat(cloths[Math.floor(r(70 + i) * cloths.length)], { side: THREE.DoubleSide });
    if (r(90 + i) < 0.25) { // a shirt, its arms out
      g.add(mesh(box(w, h * 0.8, 0.02), c, x + w / 2, 1.94 - h * 0.4, 0));
      g.add(mesh(box(w + 0.36, 0.16, 0.02), c, x + w / 2, 1.86, 0));
    } else g.add(mesh(box(w, h, 0.02), c, x + w / 2, 1.94 - h / 2, 0));
    g.add(mesh(box(0.03, 0.06, 0.04), M.wood, x + 0.05, 1.96, 0)); // pegs
    g.add(mesh(box(0.03, 0.06, 0.04), M.wood, x + w - 0.05, 1.96, 0));
    x += w + 0.08 + r(110 + i) * 0.2;
  }
  return g;
}

/** Split logs stacked against a wall under a lean-to of boards. */
/**
 * Split logs stacked against a wall under a lean-to of boards. With a seed (0..1, from where it
 * stands) each household's is its own: burned down to a row or two or stacked to the roof, under
 * boards, slates, an old sail or nothing, and some with the chopping block and its axe beside it
 * or a bundle of kindling.
 */
export function woodpile(M: PropMaterials, len = 2, seed = -1): THREE.Group {
  const g = new THREE.Group();
  const r = (k: number) => seed < 0 ? 0.5 : seeded(seed, k);
  const logs = Math.max(3, Math.round(len / 0.28)), rows = seed < 0 ? 4 : 1 + Math.floor(r(1) * 4.99);
  for (let row = 0; row < rows; row++) for (let i = 0; i < logs - (row % 2); i++) {
    if (row === rows - 1 && seed >= 0 && r(10 + i) < 0.25) continue; // the top row half taken
    const m = mesh(cyl(0.13, 0.13, 0.8, 6), (i + row) % 3 ? M.bark : M.wood, -len / 2 + 0.15 + i * 0.27 + (row % 2) * 0.13, 0.13 + row * 0.24, 0.2, 0, 0, Math.PI / 2);
    m.rotation.set(Math.PI / 2, 0, 0);
    g.add(m);
  }
  const roof = seed < 0 ? 0 : Math.floor(r(2) * 4);
  const rise = 0.04 + Math.max(4, rows) * 0.24;
  if (roof === 0) g.add(mesh(box(len + 0.3, 0.06, 0.9), M.darkWood, 0, rise, 0.22, 0, 0.2));
  else if (roof === 1) g.add(mesh(box(len + 0.3, 0.08, 0.9), M.roofSlate, 0, rise, 0.22, 0, 0.2));
  else if (roof === 2) g.add(mesh(box(len + 0.1, 0.03, 0.8), flat('#c8bca0', { side: THREE.DoubleSide }), 0, 0.2 + rows * 0.24, 0.24, 0, 0.12, 0.03)); // an old sail thrown over
  if (seed >= 0 && r(3) < 0.35) {
    // The chopping block, the axe left in it, chips round it
    const bx = (r(4) < 0.5 ? -1 : 1) * (len / 2 + 0.5);
    g.add(mesh(cyl(0.26, 0.28, 0.5, 9), M.bark, bx, 0.25, 0.5));
    g.add(mesh(box(0.05, 0.5, 0.05), M.wood, bx + 0.05, 0.72, 0.5, 0, 0, 0.5));
    g.add(mesh(box(0.2, 0.12, 0.04), M.iron, bx - 0.04, 0.53, 0.5, 0, 0, 0.5));
    for (let i = 0; i < 5; i++) g.add(mesh(box(0.08, 0.02, 0.05), M.wood, bx + (r(20 + i) - 0.5) * 0.9, 0.01, 0.5 + (r(30 + i) - 0.5) * 0.8, r(40 + i) * 3));
  } else if (seed >= 0 && r(3) < 0.55) {
    // A bundle of kindling tied with twine
    for (let i = 0; i < 6; i++) { const k = mesh(box(0.04, 0.04, 0.7), M.wood, len / 2 + 0.35 + (i % 3) * 0.05, 0.05 + Math.floor(i / 3) * 0.05, 0.5); k.rotation.y = 0.6; g.add(k); }
  }
  return g;
}

/** A statue on a plinth: a figure in a long coat, one hand on a sword, the other holding up a book. */
export function statue(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const st = flat('#c8c6be'), dk = flat('#9a988e');
  g.add(mesh(box(2.2, 0.4, 2.2), dk, 0, 0.2, 0));
  g.add(mesh(box(1.6, 1.4, 1.6), st, 0, 1.1, 0));
  g.add(mesh(box(1.9, 0.2, 1.9), dk, 0, 1.9, 0));
  g.add(mesh(box(0.9, 1.4, 0.6), st, 0, 2.7, 0)); // the coat
  g.add(mesh(box(0.8, 0.8, 0.5), st, 0, 3.75, 0)); // the chest
  g.add(mesh(box(0.42, 0.46, 0.42), st, 0, 4.4, 0)); // the head
  g.add(mesh(box(0.22, 0.75, 0.22), st, -0.55, 3.55, 0.05, 0, 0, 0.1));
  g.add(mesh(box(0.22, 0.75, 0.22), st, 0.55, 4.05, 0.1, 0, 0, -2.6));
  g.add(mesh(box(0.34, 0.42, 0.1), dk, 0.75, 4.5, 0.15)); // the book
  g.add(mesh(box(0.08, 1.3, 0.08), dk, -0.62, 2.9, 0.18)); // the sword
  g.add(mesh(box(0.3, 0.06, 0.08), dk, -0.62, 3.5, 0.18));
  return g;
}

/**
 * One of the cities' monuments (data/monuments.ts), each its own piece: a figure, a stone, a bell,
 * a fountain. Faces +z, its plaque on that side. Fits a 2 x 2 square (the rider runs to 3 long).
 */
export function monument(M: PropMaterials, model: string): THREE.Group {
  const g = new THREE.Group();
  const pale = flat('#cfccc2'), grey = flat('#9a988e'), sand = flat('#c9b48a'), sandDk = flat('#a8925f'), granite = flat('#7e7f80');
  const verd = flat('#5e8c78'), verdDk = flat('#46695a'), white = flat('#ece8dc'), black = flat('#2a2a2e');
  const brass = flat('#c8a050');
  /** A plinth w square and h tall on a footing, with a cornice; returns its top. */
  const plinth = (w: number, h: number, body: THREE.Material, trim: THREE.Material, d = w) => {
    g.add(mesh(box(w + 0.4, 0.28, d + 0.4), trim, 0, 0.14, 0));
    g.add(mesh(box(w, h, d), body, 0, 0.28 + h / 2, 0));
    g.add(mesh(box(w + 0.22, 0.16, d + 0.22), trim, 0, 0.28 + h + 0.08, 0));
    return 0.28 + h + 0.16;
  };
  /** A plaque on the plinth's front face. */
  const plaque = (y: number, z: number, w = 0.7, mat: THREE.Material = brass) => g.add(mesh(box(w, 0.36, 0.03), mat, 0, y, z));
  /** A standing figure at y facing +z: skirts or legs, chest, head. Arms and whatever it holds go on the group. */
  const figure = (m: THREE.Material, x: number, y: number, z: number, skirt: boolean, ry = 0) => {
    const f = new THREE.Group();
    f.position.set(x, y, z); f.rotation.y = ry; g.add(f);
    if (skirt) {
      f.add(mesh(box(0.96, 0.34, 0.74), m, 0, 0.17, 0));                                // the hem, flared
      f.add(mesh(box(0.8, 0.9, 0.62), m, 0, 0.75, 0));
    } else {
      for (const k of [-1, 1]) { f.add(mesh(box(0.28, 0.9, 0.3), m, k * 0.17, 0.45, 0)); f.add(mesh(box(0.3, 0.16, 0.44), m, k * 0.17, 0.08, 0.06)); }
      f.add(mesh(box(0.76, 0.48, 0.48), m, 0, 1.0, 0)); // coat skirts
    }
    f.add(mesh(box(0.66, 0.66, 0.4), m, 0, 1.5, 0));
    f.add(mesh(box(0.88, 0.18, 0.46), m, 0, 1.84, 0));                                  // shoulders
    f.add(mesh(box(0.18, 0.12, 0.18), m, 0, 1.98, 0));                                  // neck
    f.add(mesh(box(0.36, 0.42, 0.36), m, 0, 2.24, 0));
    f.add(mesh(box(0.4, 0.14, 0.4), m, 0, 2.48, -0.02));                                // hair
    f.add(mesh(box(0.4, 0.3, 0.1), m, 0, 2.34, -0.17));
    f.add(mesh(box(0.08, 0.1, 0.06), m, 0, 2.2, 0.2));                                  // nose
    return f;
  };
  /** An arm from the shoulder (side -1 or 1), swung forward by fwd and out by out (radians). */
  const arm = (f: THREE.Group, m: THREE.Material, side: number, fwd: number, out = 0) => {
    const a = new THREE.Group();
    a.position.set(side * 0.45, 1.85, 0); a.rotation.set(-fwd, 0, side * out); f.add(a);
    a.add(mesh(box(0.2, 0.72, 0.2), m, 0, -0.34, 0));
    return a;
  };
  switch (model) {
    case 'milestone': {
      // The Nought Stone: a post worn to a waist, on a round of setts with the four roads marked out
      g.add(mesh(cyl(1.15, 1.15, 0.08, 18), M.cobble, 0, 0.04, 0));
      for (let i = 0; i < 4; i++) g.add(mesh(box(0.1, 0.02, 0.9), black, Math.sin(i * Math.PI / 2) * 0.68, 0.09, Math.cos(i * Math.PI / 2) * 0.68, i * Math.PI / 2));
      g.add(mesh(box(0.56, 0.5, 0.42), grey, 0, 0.33, 0));
      g.add(mesh(box(0.44, 0.36, 0.32), grey, 0, 0.76, 0));
      g.add(mesh(box(0.56, 0.5, 0.42), grey, 0, 1.19, 0));
      g.add(mesh(cyl(0.28, 0.28, 0.42, 12), grey, 0, 1.44, 0, 0, 0, Math.PI / 2));
      g.add(mesh(box(0.36, 0.08, 0.02), black, 0, 1.25, 0.22)); g.add(mesh(box(0.22, 0.06, 0.02), black, 0, 1.1, 0.22));
      break;
    }
    case 'speaker': {
      const top = plinth(1.5, 1.5, pale, grey);
      plaque(1.0, 0.77);
      const f = figure(pale, 0, top, 0, true);
      arm(f, pale, -1, 1.0, 0.15); arm(f, pale, 1, 1.0, -0.15);
      f.add(mesh(box(1.1, 0.72, 0.05), pale, 0, 1.38, 0.62, 0, -0.5));               // the Charter, held open
      for (const k of [-1, 1]) f.add(mesh(cyl(0.07, 0.07, 0.78, 8), grey, k * 0.56, 1.38, 0.62, 0, -0.5));
      for (const k of [-0.25, 0, 0.25]) f.add(mesh(cyl(0.07, 0.07, 0.03, 8), sand, k, 1.18, 0.74, 0, 1.07)); // the seals, worn smooth
      f.add(mesh(box(0.8, 0.12, 0.5), grey, 0, 1.97, 0));                             // a collar of office
      break;
    }
    case 'rider': {
      const top = plinth(1.3, 1.5, granite, grey, 2.7);
      plaque(1.0, 1.37);
      const h = new THREE.Group(); h.position.y = top; g.add(h);
      for (const [x, z, r] of [[-0.24, 0.75, -0.25], [0.24, 0.7, 0], [-0.24, -0.75, 0], [0.24, -0.72, 0.1]]) h.add(mesh(box(0.18, 1.0, 0.2), M.bronze, x, 0.5, z, 0, r));
      h.add(mesh(box(0.66, 0.8, 1.9), M.bronze, 0, 1.35, 0));                         // the horse's barrel
      h.add(mesh(box(0.34, 0.95, 0.42), M.bronze, 0, 1.95, 1.0, 0, -0.55));            // neck
      h.add(mesh(box(0.3, 0.32, 0.7), M.bronze, 0, 2.3, 1.38, 0, 0.35));               // head
      h.add(mesh(box(0.14, 0.7, 0.16), M.bronze, 0, 1.25, -1.0, 0, 0.35));             // tail
      // The rider, cloaked, a lantern held up on a pole: they rode the Turnpike at night
      h.add(mesh(box(0.56, 0.72, 0.36), M.bronze, 0, 2.1, -0.1));
      h.add(mesh(box(0.34, 0.38, 0.34), M.bronze, 0, 2.66, -0.1));
      h.add(mesh(box(0.5, 0.08, 0.5), M.bronze, 0, 2.88, -0.1));                       // the hat's brim
      for (const k of [-1, 1]) h.add(mesh(box(0.2, 0.7, 0.24), M.bronze, k * 0.4, 1.6, 0.05, 0, -0.3));
      h.add(mesh(box(0.7, 0.9, 0.08), M.bronze, 0, 2.05, -0.32, 0, 0.2));              // cloak
      h.add(mesh(box(0.08, 1.9, 0.08), M.bronze, 0.42, 2.7, 0.15, 0, 0.12));           // the pole
      h.add(mesh(box(0.22, 0.3, 0.22), M.bronze, 0.42, 3.55, 0.38));                   // its lantern
      break;
    }
    case 'scales': {
      const top = plinth(1.4, 1.3, sand, sandDk);
      plaque(0.95, 0.72, 0.62, verdDk);
      g.add(mesh(box(0.8, 0.07, 0.01), white, 0.05, 0.62, 0.71, 0, 0, 0.06));          // the chalk
      const f = figure(verd, 0, top, 0, true);
      arm(f, verd, -1, 0.15, 0.1);
      const a = arm(f, verd, 1, 0.3, 1.7);                                            // held out level, the beam hanging from it
      a.add(mesh(box(0.06, 0.4, 0.06), verdDk, 0, -0.85, 0));
      const beam = new THREE.Group(); beam.position.set(0.9, top + 1.75, 0.15); g.add(beam);
      beam.add(mesh(box(1.1, 0.06, 0.06), verdDk, 0, 0, 0));
      for (const k of [-1, 1]) {
        beam.add(mesh(box(0.02, 0.5, 0.02), verdDk, k * 0.52, -0.25, 0));
        beam.add(mesh(cyl(0.22, 0.16, 0.06, 10), verd, k * 0.52, -0.52, 0));
      }
      break;
    }
    case 'cross': {
      // The Butter Cross: three worn octagonal steps, a shaft and a stubby head
      for (const [r, y] of [[1.3, 0.14], [1.0, 0.42], [0.7, 0.7]] as const) g.add(mesh(cyl(r, r, 0.28, 8), M.stone, 0, y, 0, Math.PI / 8));
      g.add(mesh(box(0.42, 0.5, 0.42), grey, 0, 1.09, 0));
      g.add(mesh(box(0.28, 2.5, 0.28), grey, 0, 2.5, 0));
      g.add(mesh(box(0.22, 0.62, 0.2), grey, 0, 4.0, 0));
      g.add(mesh(box(0.6, 0.2, 0.2), grey, 0, 3.92, 0));
      g.add(mesh(box(0.26, 0.18, 0.02), M.iron, 0, 2.0, 0.15));                       // the tin plate
      break;
    }
    case 'fountain': {
      // The Fullers' Fountain: a stele with a lion's head spout over a basin, a cup on a chain
      g.add(mesh(box(1.8, 0.24, 1.6), sandDk, 0, 0.12, 0.1));
      g.add(mesh(box(1.5, 2.3, 0.6), sand, 0, 1.39, -0.4));
      g.add(mesh(box(1.7, 0.2, 0.72), sandDk, 0, 2.64, -0.4));
      g.add(mesh(cyl(0.2, 0.28, 0.42, 8), sandDk, 0, 2.95, -0.4));                     // the finial
      g.add(mesh(cyl(0.32, 0.32, 0.06, 12), verd, 0, 2.0, -0.08, 0, Math.PI / 2));     // the Fullers' roundel
      g.add(mesh(box(0.34, 0.34, 0.16), verd, 0, 1.32, -0.05));                         // the lion's head
      g.add(mesh(box(0.08, 0.08, 0.24), verdDk, 0, 1.24, 0.12));
      g.add(mesh(cyl(0.72, 0.62, 0.55, 12), sand, 0, 0.5, 0.42));
      g.add(mesh(cyl(0.62, 0.62, 0.04, 12), flat('#2c4a56'), 0, 0.72, 0.42));
      g.add(mesh(box(0.02, 0.5, 0.02), M.iron, 0.4, 0.95, -0.08));
      g.add(mesh(cyl(0.07, 0.06, 0.12, 8), M.iron, 0.4, 0.66, 0.0));
      break;
    }
    case 'obelisk': {
      g.add(mesh(box(1.9, 0.3, 1.9), granite, 0, 0.15, 0));
      g.add(mesh(box(1.3, 1.1, 1.3), granite, 0, 0.85, 0));
      g.add(mesh(box(1.45, 0.14, 1.45), grey, 0, 1.47, 0));
      g.add(mesh(cyl(0.34, 0.56, 3.3, 4), granite, 0, 3.19, 0, Math.PI / 4));
      g.add(mesh(cyl(0, 0.34, 0.45, 4), grey, 0, 5.06, 0, Math.PI / 4));
      // The names, in rows down every face of the die
      for (let s = 0; s < 4; s++) for (let i = 0; i < 7; i++) {
        const a = s * Math.PI / 2, w = 0.5 + ((i * 7 + s * 3) % 5) * 0.08;
        g.add(mesh(box(w, 0.045, 0.02), black, Math.sin(a) * 0.66, 1.3 - i * 0.12, Math.cos(a) * 0.66, a));
      }
      break;
    }
    case 'bell': {
      // The cracked bell, hung low between two oak posts on a stone sill
      g.add(mesh(box(2.3, 0.3, 1.0), grey, 0, 0.15, 0));
      for (const k of [-1, 1]) {
        g.add(mesh(box(0.26, 2.7, 0.26), M.darkWood, k * 0.95, 1.65, 0));
        g.add(mesh(box(0.5, 0.12, 0.5), M.darkWood, k * 0.95, 0.36, 0));
      }
      g.add(mesh(box(2.3, 0.26, 0.3), M.darkWood, 0, 3.0, 0));
      g.add(mesh(box(0.4, 0.3, 0.3), M.darkWood, 0, 2.74, 0));
      g.add(mesh(cyl(0.34, 0.6, 0.95, 14), M.bronze, 0, 2.1, 0));
      g.add(mesh(cyl(0.64, 0.64, 0.1, 14), M.bronze, 0, 1.62, 0));
      g.add(mesh(cyl(0.34, 0.34, 0.12, 14), M.bronze, 0, 2.6, 0));
      g.add(mesh(box(0.04, 0.85, 0.03), black, 0.12, 2.08, 0.5, 0, -0.45, 0.12));     // the crack
      g.add(mesh(box(0.7, 0.3, 0.03), brass, 0, 0.18, 0.51));
      break;
    }
    case 'dog': {
      const top = plinth(1.3, 0.8, pale, grey, 0.8);
      plaque(0.65, 0.42, 0.5);
      const d = new THREE.Group(); d.position.set(0, top, 0); d.rotation.y = 0.35; g.add(d);
      for (const [x, z] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) d.add(mesh(box(0.1, 0.36, 0.1), M.bronze, x, 0.18, z));
      d.add(mesh(box(0.34, 0.34, 0.86), M.bronze, 0, 0.5, 0));
      d.add(mesh(box(0.2, 0.03, 0.7), flat('#e0b870'), 0, 0.68, 0));                  // rubbed bright
      d.add(mesh(box(0.28, 0.3, 0.3), M.bronze, 0, 0.82, 0.48));
      d.add(mesh(box(0.16, 0.14, 0.2), M.bronze, 0, 0.74, 0.7));
      for (const k of [-1, 1]) d.add(mesh(box(0.08, 0.16, 0.06), M.bronze, k * 0.12, 1.0, 0.42, 0, 0, k * 0.4));
      d.add(mesh(box(0.06, 0.06, 0.42), M.bronze, 0, 0.75, -0.55, 0, -0.7));
      g.add(mesh(cyl(0.2, 0.15, 0.1, 10), M.iron, 0.55, 0.05, 0.85));                  // the water bowl
      g.add(mesh(cyl(0.17, 0.17, 0.02, 10), flat('#2c4a56'), 0.55, 0.09, 0.85));
      break;
    }
    case 'plough': {
      const top = plinth(1.1, 0.9, sand, sandDk, 2.2);
      plaque(0.7, 1.12);
      const p = new THREE.Group(); p.position.y = top; g.add(p);
      p.add(mesh(box(0.12, 0.12, 2.0), M.bronze, 0, 0.42, 0.1, 0, -0.22));               // the beam
      for (const k of [-1, 1]) p.add(mesh(box(0.07, 0.07, 1.0), M.bronze, k * 0.24, 0.62, -0.95, 0, -0.55)); // handles
      p.add(mesh(box(0.08, 0.5, 0.42), M.bronze, 0, 0.22, -0.25, 0, 0.3));             // the mouldboard
      p.add(mesh(box(0.06, 0.06, 0.5), M.bronze, 0, 0.04, 0.05));                      // the share
      p.add(mesh(cyl(0.26, 0.26, 0.06, 12), M.bronze, 0, 0.28, 1.0, 0, 0, Math.PI / 2));
      for (const [x, z] of [[0.12, -0.05], [-0.1, 0.2], [0.05, 0.35]]) p.add(mesh(box(0.16, 0.1, 0.14), M.bronze, x, 0.05, z, x * 9)); // clods
      break;
    }
    case 'column': {
      g.add(mesh(box(1.7, 0.4, 1.7), grey, 0, 0.2, 0));
      g.add(mesh(box(1.25, 1.1, 1.25), pale, 0, 0.95, 0));
      g.add(mesh(box(1.4, 0.16, 1.4), grey, 0, 1.58, 0));
      plaque(1.0, 0.64, 0.8);
      g.add(mesh(cyl(0.36, 0.42, 4.2, 14), pale, 0, 3.76, 0));
      g.add(mesh(box(0.98, 0.3, 0.98), grey, 0, 6.0, 0));
      g.add(mesh(cyl(0.22, 0.32, 0.5, 10), pale, 0, 6.4, 0));                          // the urn, its lid long gone
      g.add(mesh(cyl(0.3, 0.22, 0.22, 10), pale, 0, 6.76, 0));
      break;
    }
    case 'seated': case 'netmender': {
      const net = model === 'netmender';
      const top = net ? 0.5 : plinth(1.5, 0.7, pale, grey, 1.2);
      if (net) g.add(mesh(box(1.8, 0.5, 1.6), white, 0, 0.25, 0));
      plaque(net ? 0.3 : 0.6, net ? 0.81 : 0.62, 0.62, net ? black : brass);
      const m = M.bronze, f = new THREE.Group(); f.position.y = top; g.add(f);
      if (net) f.add(mesh(cyl(0.3, 0.34, 0.6, 10), M.iron, 0, 0.3, -0.15));           // the bollard she sits on
      else f.add(mesh(box(0.8, 0.6, 0.7), m, 0, 0.3, -0.15));                           // the school chair
      for (const k of [-1, 1]) {
        f.add(mesh(box(0.26, 0.22, 0.62), m, k * 0.16, 0.7, 0.2));                     // thighs
        f.add(mesh(box(0.24, 0.62, 0.24), m, k * 0.16, 0.3, 0.48));                    // shins
      }
      f.add(mesh(box(0.64, 0.74, 0.4), m, 0, 1.15, -0.1, 0, -0.08));
      f.add(mesh(box(0.34, 0.4, 0.34), m, 0, 1.72, 0.0, 0, 0.12));                     // looking down at her knee
      if (!net) f.add(mesh(box(0.42, 0.42, 0.18), m, 0, 1.8, -0.18));                  // her hair, put up
      else f.add(mesh(box(0.42, 0.3, 0.4), m, 0, 1.88, -0.04));                        // a headscarf
      for (const k of [-1, 1]) f.add(mesh(box(0.18, 0.18, 0.5), m, k * 0.3, 1.0, 0.25, 0, 0.35));
      if (net) {
        const n = flat('#6a7a6a', { transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        f.add(mesh(box(1.1, 0.02, 0.7), n, 0.1, 0.84, 0.3, 0.2));
        f.add(mesh(box(1.0, 0.6, 0.02), n, 0.15, 0.55, 0.66));
        for (let i = 0; i < 4; i++) f.add(mesh(box(0.1, 0.08, 0.1), flat('#c8402a'), -0.3 + i * 0.25, 0.86, 0.6));
      } else {
        f.add(mesh(box(0.5, 0.04, 0.36), flat('#3a3e44'), 0, 0.84, 0.3));             // the slate
        f.add(mesh(box(0.3, 0.02, 0.1), white, 0, 0.865, 0.3));
        for (let i = 0; i < 3; i++) f.add(mesh(box(0.38, 0.1, 0.28), m, 0.62, 0.05 + i * 0.1, 0.1, i * 0.4)); // a pile of books
      }
      break;
    }
    case 'boots': {
      const top = plinth(1.4, 1.7, pale, grey);
      plaque(1.1, 0.72, 0.62, white);
      for (const k of [-1, 1]) {
        g.add(mesh(box(0.3, 0.3, 0.52), pale, k * 0.18, top + 0.15, 0.08));
        g.add(mesh(box(0.28, 0.66, 0.3), pale, k * 0.18, top + 0.63, 0));
      }
      g.add(mesh(box(0.86, 0.3, 0.5), pale, 0, top + 0.86, -0.06, 0, 0.1));            // the coat's hem, and nothing above it
      g.add(mesh(box(0.86, 0.18, 0.5), M.stone, 0.02, top + 1.06, -0.04, 0.3, 0.2));   // rough where the chisel stopped
      break;
    }
    case 'masons': {
      g.add(mesh(box(2.4, 0.5, 1.4), granite, 0, 0.25, 0));
      plaque(0.25, 0.71, 0.9);
      g.add(mesh(box(0.92, 0.7, 0.72), M.stone, 0, 0.85, 0, 0.12, 0, 0.12));           // the real block, tipped up
      g.add(mesh(box(0.28, 0.28, 0.02), black, 0.0, 0.88, 0.37, 0.12, 0, 0.12));       // Bray's mark
      for (const k of [-1, 1]) {
        const f = figure(M.bronze, k * 0.95, 0.5, 0, false, -k * Math.PI / 2);
        f.children.slice(-2).forEach((c) => { c.rotation.x = 0.35; c.position.z += 0.18; }); // bent to the work
        arm(f, M.bronze, -1, 1.2); arm(f, M.bronze, 1, 1.2);
      }
      g.add(mesh(box(0.08, 0.08, 2.2), M.iron, 0, 0.95, 0.28, Math.PI / 2, 0, 0.2));   // the crowbar between them
      break;
    }
    case 'plumb': {
      // The Warden's Plumb: a white frame pinned with black, a bronze bob hanging off its old mark
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.add(mesh(box(1, 0.06, 1), (i + j) % 2 ? black : white, -0.5 + i, 0.03, -0.5 + j));
      for (const k of [-1, 1]) {
        g.add(mesh(box(0.3, 3.4, 0.3), white, k * 0.85, 1.7, 0));
        for (const y of [0.9, 2.0, 3.0]) g.add(mesh(box(0.34, 0.12, 0.34), black, k * 0.85, y, 0));
      }
      g.add(mesh(box(2.1, 0.3, 0.4), black, 0, 3.55, 0));
      g.add(mesh(box(0.02, 2.75, 0.02), M.rope, 0.12, 2.04, 0));
      g.add(mesh(cyl(0.16, 0.0, 0.36, 8), M.bronze, 0.12, 0.5, 0));
      g.add(mesh(box(0.02, 0.01, 0.3), black, 0, 0.065, 0));                           // the old mark
      g.add(mesh(box(0.02, 0.01, 0.3), black, 0.12, 0.065, 0));                        // the new one
      g.add(mesh(box(0.02, 0.01, 0.2), grey, 0.22, 0.065, 0));                         // and a fainter one past it
      g.add(mesh(box(0.7, 0.3, 0.03), brass, 0, 1.1, 0.17));
      break;
    }
    case 'stones': {
      g.add(mesh(box(2.0, 0.24, 1.6), grey, 0, 0.12, 0));
      g.add(mesh(box(1.5, 0.8, 1.1), black, 0, 0.64, 0));
      g.add(mesh(box(1.4, 0.9, 1.0), white, 0, 1.53, 0));                              // the white, lifted off the black
      g.add(mesh(box(0.6, 0.26, 0.03), brass, 0, 0.66, 0.56));
      break;
    }
    case 'jawbones': {
      // Two jawbones stood up to meet over the street, bleached, a little twisted, lashed at the top
      const bone = flat('#e8e0cc'), boneDk = flat('#c8bea6');
      for (const k of [-1, 1]) for (let i = 0; i < 9; i++) {
        const t0 = i / 9, t1 = (i + 1) / 9;
        const p = (t: number) => [k * 3.5 * Math.cos(t * Math.PI / 2) * (1 - 0.08 * Math.sin(t * Math.PI)), 6.2 * Math.sin(t * Math.PI / 2)];
        const [x0, y0] = p(t0), [x1, y1] = p(t1), len = Math.hypot(x1 - x0, y1 - y0) + 0.08, w = 0.55 - t0 * 0.22;
        g.add(mesh(box(w, len, 0.5 - t0 * 0.12), i % 3 ? bone : boneDk, (x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 0, Math.atan2(x0 - x1, y1 - y0)));
      }
      for (const k of [-1, 1]) g.add(mesh(box(1.0, 0.4, 0.9), M.cobble, k * 3.5, 0.2, 0));               // their footings
      g.add(mesh(cyl(0.3, 0.3, 0.6, 8), M.rope, 0, 6.15, 0, 0, Math.PI / 2));                            // the lashing
      g.add(mesh(box(1.6, 0.36, 0.05), M.darkWood, 0, 5.4, 0.3));                                         // THE GIFT, carved
      break;
    }
    case 'drownedboard': {
      // A slate board on two posts under a little roof, the names painted white, the newest bright
      for (const k of [-1, 1]) g.add(mesh(box(0.2, 2.6, 0.2), M.darkWood, k * 1.05, 1.3, 0));
      g.add(mesh(box(2.3, 0.12, 0.6), M.roofSlate, 0, 2.7, 0.05, 0, 0.25));
      g.add(mesh(box(2.0, 1.6, 0.1), flat('#3a3e44'), 0, 1.6, 0));
      g.add(mesh(box(2.1, 1.7, 0.06), M.darkWood, 0, 1.6, -0.06));
      for (let i = 0; i < 11; i++) {
        const w = 0.5 + ((i * 7) % 5) * 0.12, fresh = i >= 8;
        g.add(mesh(box(w, 0.05, 0.02), flat(fresh ? '#f4f0e8' : i < 3 ? '#8a8e94' : '#c8c8c4'), -0.85 + w / 2 + (i % 2) * 0.1, 2.25 - i * 0.12, 0.06));
      }
      g.add(mesh(box(0.06, 0.18, 0.06), flat('#e86a8a'), 0.55, 1.12, 0.08));                             // the sprig of thrift
      g.add(mesh(box(0.1, 0.06, 0.06), flat('#4a7a3a'), 0.55, 1.03, 0.08));
      break;
    }
    case 'fogbell': {
      // An iron standard on a granite block, a bell hung off its arm, the rope running away along the quay
      g.add(mesh(box(0.9, 0.5, 0.9), M.stone, 0, 0.25, 0));
      g.add(mesh(box(0.16, 3.0, 0.16), M.iron, 0, 2.0, 0));
      g.add(mesh(box(0.12, 0.12, 1.2), M.iron, 0, 3.4, 0.5));
      g.add(mesh(box(0.08, 0.6, 0.08), M.iron, 0, 3.15, 0.95, 0, -0.6));
      g.add(mesh(cyl(0.22, 0.42, 0.62, 12), M.bronze, 0, 2.95, 1.05));
      g.add(mesh(cyl(0.44, 0.44, 0.06, 12), M.bronze, 0, 2.64, 1.05));
      g.add(mesh(cyl(0.05, 0.05, 0.3, 6), M.iron, 0, 2.5, 1.05));                                          // the clapper
      g.add(mesh(box(0.03, 0.03, 4.0), M.rope, 0, 3.3, -1.0, 0, -0.18));                                  // the rope, away to the office
      g.add(mesh(box(0.5, 0.3, 0.03), flat('#c8a050'), 0, 0.35, 0.47));
      break;
    }
    case 'boundstone': {
      // A squat boundary stone lifted a finger off the ground, chained to an iron pin, a bell on the chain
      g.add(mesh(box(0.72, 0.85, 0.6), M.stone, 0, 0.5, 0));
      g.add(mesh(box(0.6, 0.12, 0.5), flat('#8a887e'), 0, 0.98, 0));
      g.add(mesh(box(0.66, 0.06, 0.54), flat('#2a2622'), 0, 0.04, 0));                  // the gap under it
      g.add(mesh(box(0.3, 0.04, 0.01), flat('#3a3832'), 0, 0.72, 0.305));               // the wheatsheaf
      for (const dx of [-0.08, 0, 0.08]) g.add(mesh(box(0.03, 0.2, 0.01), flat('#3a3832'), dx, 0.62, 0.305, 0, 0, dx * 3));
      g.add(mesh(box(0.34, 0.03, 0.01), flat('#3a3832'), 0, 0.45, 0.305, 0, 0, 0.12));  // the wavy line
      g.add(mesh(box(0.08, 0.5, 0.08), flat('#3a3a3e'), 0.95, 0.25, 0));                // the iron pin
      g.add(mesh(box(0.14, 0.06, 0.14), flat('#3a3a3e'), 0.95, 0.5, 0));
      for (let i = 0; i < 6; i++) { const t = i / 5; g.add(mesh(box(0.1, 0.05, 0.06), flat('#4a4a50'), 0.36 + t * 0.56, 0.62 - t * 0.14, 0, 0, 0, -0.25 + (i % 2) * 0.5)); }
      g.add(mesh(box(0.1, 0.12, 0.1), flat('#a8884a'), 0.62, 0.48, 0));                 // the little bell
      break;
    }
    case 'assemblynotice': {
      // A printed Assembly notice on a board against the tower, chalk on grey under it
      g.add(mesh(box(0.95, 1.25, 0.05), flat('#6a6a68'), 0, 1.55, 0.03));
      g.add(mesh(box(0.8, 0.5, 0.01), flat('#ece6d6'), 0, 1.88, 0.06));
      for (let i = 0; i < 5; i++) g.add(mesh(box(0.66 - (i % 2) * 0.16, 0.025, 0.005), flat('#2a2a2e'), 0, 2.04 - i * 0.07, 0.068));
      g.add(mesh(box(0.12, 0.12, 0.005), flat('#a83a2e'), 0.3, 1.7, 0.068));            // the Assembly's seal
      for (let i = 0; i < 3; i++) g.add(mesh(box(0.5 - i * 0.1, 0.03, 0.005), flat('#d8d4cc'), -0.08, 1.48 - i * 0.09, 0.058));
      g.add(mesh(box(0.6, 0.035, 0.005), flat('#e8e4dc'), 0, 1.08, 0.058));            // THE BEES RIDE FREE
      break;
    }
    case 'doorstep': {
      // The bottom course of a cottage's walls, cut off clean, a doorstep in front, the floor swept
      const st = M.stone, cut = flat('#a8a49a');
      g.add(mesh(box(4.4, 0.06, 3.6), flat('#8a8478'), 0, 0.03, 0));                  // the floor, flagged
      for (const [x, z, w, d] of [[-2.1, 0, 0.3, 3.6], [2.1, 0, 0.3, 3.6], [0, -1.65, 4.5, 0.3], [-1.45, 1.65, 1.6, 0.3], [1.45, 1.65, 1.6, 0.3]] as const) {
        g.add(mesh(box(w, 0.32, d), st, x, 0.16, z));
        g.add(mesh(box(w, 0.02, d), cut, x, 0.33, z));                                // the clean cut
      }
      g.add(mesh(box(1.3, 0.18, 0.55), flat('#b4ae9e'), 0, 0.09, 2.05));              // the doorstep
      g.add(mesh(box(0.7, 0.02, 0.4), flat('#9a948a'), 0, 0.19, 2.05));               // worn hollow
      break;
    }
    case 'glassslab': {
      // A door-high slab of black glass on end, chalk sums high on it, knife-scratched drakes low down
      const glass = new THREE.MeshStandardMaterial({ color: '#16161e', roughness: 0.15, metalness: 0.3 });
      g.add(mesh(box(1.5, 2.5, 0.42), glass, 0, 1.25, 0, 0, 0.04));
      g.add(mesh(box(1.2, 0.5, 0.36), glass, 0.1, 2.6, 0.02, 0.3, 0.06, 0.2));
      for (let i = 0; i < 5; i++) g.add(mesh(box(0.5 - (i % 2) * 0.18, 0.025, 0.01), flat('#e8e4dc'), -0.2 + (i % 3) * 0.1, 2.25 - i * 0.12, 0.23));
      g.add(mesh(box(0.7, 0.02, 0.01), flat('#e8e4dc'), -0.1, 1.6, 0.23)); g.add(mesh(box(0.7, 0.02, 0.01), flat('#e8e4dc'), -0.1, 1.56, 0.23));
      for (let i = 0; i < 28; i++) g.add(mesh(box(0.07, 0.04, 0.01), flat(i % 4 ? '#6a6a72' : '#8a8a92'), -0.62 + (i % 9) * 0.155, 0.25 + Math.floor(i / 9) * 0.14, 0.215));
      for (const x of [-0.6, 0.6]) g.add(mesh(box(0.14, 0.12, 1.1), flat('#6a5a46'), x, 0.06, 0)); // the sledge's runners it came on
      break;
    }
    case 'lawstone': {
      // A squat white stone cut deep with the law, and smaller under it
      const white = flat('#e8dcc0');
      g.add(mesh(box(0.95, 0.75, 0.6), white, 0, 0.38, 0));
      g.add(mesh(box(0.8, 0.1, 0.5), flat('#d8ccb0'), 0, 0.8, 0));
      for (let i = 0; i < 3; i++) g.add(mesh(box(0.72 - i * 0.12, 0.05, 0.01), flat('#5a4a3a'), 0, 0.62 - i * 0.1, 0.305));
      for (let i = 0; i < 2; i++) g.add(mesh(box(0.5, 0.025, 0.01), flat('#7a6a5a'), 0, 0.3 - i * 0.07, 0.305));
      break;
    }
    case 'routeboard': {
      // Two roads painted as lines on a board, a nail for every stop, chalk days; the top nail pulled
      const board = flat('#c8b088');
      for (const x of [-0.85, 0.85]) g.add(mesh(box(0.14, 2.0, 0.14), flat('#5a4630'), x, 1.0, 0));
      g.add(mesh(box(1.7, 1.2, 0.07), board, 0, 1.3, 0.04));
      g.add(mesh(box(1.8, 0.1, 0.18), flat('#5a4630'), 0, 1.95, 0.05));
      for (const [lx, col] of [[-0.35, '#a8382c'], [0.35, '#2f4a7a']] as const) {
        g.add(mesh(box(0.05, 1.0, 0.01), flat(col), lx, 1.3, 0.08));
        for (let i = 0; i < 6; i++) {
          if (lx < 0 && i === 5) continue; // Fellside's nail, pulled
          g.add(mesh(box(0.05, 0.05, 0.04), flat('#3a3a3e'), lx, 0.85 + i * 0.18, 0.09));
          g.add(mesh(box(0.14, 0.02, 0.01), flat('#f0ece4'), lx + 0.16, 0.85 + i * 0.18, 0.08));
        }
      }
      g.add(mesh(box(0.42, 0.12, 0.01), flat('#d4bc94'), -0.25, 1.75, 0.082)); // the painted-over name
      break;
    }
    case 'oarrack': {
      // Oars stood on end in a rack, blades up, a name burnt on each; one sawn short; a few ringed
      const ash = flat('#b8a07a'), ashDk = flat('#8a7656'), burn = flat('#3a2a1a');
      g.add(mesh(box(6.0, 0.14, 0.2), flat('#5a4630'), 0, 0.5, -0.12));
      g.add(mesh(box(6.0, 0.14, 0.2), flat('#5a4630'), 0, 1.5, -0.12));
      for (const x of [-3.0, 3.0]) g.add(mesh(box(0.18, 1.8, 0.18), flat('#4a3a28'), x, 0.9, -0.12));
      for (let i = 0; i < 17; i++) {
        const x = -2.7 + i * 0.34, short = i === 8, h = short ? 1.7 : 2.5 + ((i * 5) % 7) * 0.08;
        const wood = i % 3 === 1 ? ashDk : ash;
        g.add(mesh(box(0.07, h - 0.8, 0.07), wood, x, (h - 0.8) / 2, 0, 0, ((i * 3) % 5 - 2) * 0.015));
        g.add(mesh(box(0.18, 0.8, 0.03), wood, x, h - 0.4, 0, 0, ((i * 3) % 5 - 2) * 0.015));
        g.add(mesh(box(0.12, 0.03, 0.01), burn, x, h - 0.3, 0.02));
        if (i % 6 === 2) g.add(mesh(box(0.07, 0.07, 0.01), burn, x, h - 0.52, 0.02));
      }
      break;
    }
    case 'figurehead': {
      // A carved woman off a frigate's bow, leaning forward on a heap of ballast stones, a tin cup in her hands
      const blue = flat('#7088a2'), blueDk = flat('#56687e'), gold = flat('#c8aa5a'), skin = flat('#e2d6c2'), wood = flat('#7a6a54');
      g.add(mesh(box(1.6, 0.45, 1.5), M.stone, 0, 0.22, 0));
      g.add(mesh(box(1.15, 0.4, 1.05), M.cobble, 0.05, 0.62, -0.05, 0.3));
      const fig = new THREE.Group(); fig.position.set(0, 0.82, -0.15); fig.rotation.x = 0.26; fig.scale.setScalar(1.35); g.add(fig);
      fig.add(mesh(box(0.3, 1.7, 0.3), wood, 0, 0.85, -0.34));                  // the stem timber she was carved from
      fig.add(mesh(box(0.66, 0.5, 0.5), blueDk, 0, 0.25, 0.0));                  // skirt, scrolling into the stem
      fig.add(mesh(box(0.6, 0.45, 0.46), blue, 0, 0.7, 0.02));
      fig.add(mesh(box(0.66, 0.08, 0.5), gold, 0, 0.94, 0.02));                  // the gilt sash
      fig.add(mesh(box(0.48, 0.6, 0.36), blue, 0, 1.26, 0.04));                  // bodice
      fig.add(mesh(box(0.14, 0.12, 0.14), skin, 0, 1.6, 0.06));                  // neck
      fig.add(mesh(box(0.32, 0.34, 0.32), skin, 0, 1.82, 0.08));                 // head
      fig.add(mesh(box(0.38, 0.4, 0.22), gold, 0, 1.88, -0.06));                 // hair, gilt, down her back
      fig.add(mesh(box(0.2, 0.5, 0.12), gold, 0, 1.55, -0.2));
      for (const sx of [-1, 1]) { fig.add(mesh(box(0.13, 0.4, 0.13), blue, sx * 0.28, 1.36, 0.1)); fig.add(mesh(box(0.12, 0.12, 0.42), skin, sx * 0.16, 1.18, 0.34)); }
      fig.add(mesh(box(0.42, 0.08, 0.2), flat('#5a7a44'), 0, 1.18, 0.6));       // the wreath
      fig.add(mesh(box(0.16, 0.18, 0.16), flat('#b8b8b0'), 0, 1.3, 0.6));       // the tin cup in it
      break;
    }
    case 'compassrose': {
      // A brass compass rose nailed into the boards, its south point prised out
      const brass = flat('#c8a252'), brassDk = flat('#94763a');
      g.add(mesh(box(1.2, 0.03, 1.2), brassDk, 0, 0.015, 0, Math.PI / 4));
      g.add(mesh(box(1.05, 0.035, 1.05), brass, 0, 0.02, 0));
      g.add(mesh(box(0.4, 0.04, 0.4), brassDk, 0, 0.03, 0, Math.PI / 4));
      for (let k = 0; k < 8; k++) {
        if (k === 4) continue; // the south point: gone
        const a = (k * Math.PI) / 4, long = k % 2 === 0, len = long ? 2.3 : 1.4;
        g.add(mesh(box(long ? 0.32 : 0.22, 0.03, len), k % 2 ? brassDk : brass, Math.sin(a) * len * 0.5, 0.025, Math.cos(a) * len * 0.5, a));
        g.add(mesh(box(long ? 0.14 : 0.1, 0.035, len * 0.3), k % 2 ? brass : brassDk, Math.sin(a) * len * 0.85, 0.03, Math.cos(a) * len * 0.85, a));
      }
      for (const d of [0.8, 1.4, 2.0]) g.add(mesh(box(0.05, 0.012, 0.05), flat('#2a241a'), 0, 0.012, -d)); // the nail holes where it was
      break;
    }
    case 'keeperstones': {
      // Fourteen small upright stones in a row, a name on each, the first worn low and smooth; a fifteenth, blank
      for (let i = 0; i < 15; i++) {
        const x = -2.52 + i * 0.36, worn = i === 0, blank = i === 14, h = worn ? 0.32 : 0.46 + ((i * 7) % 5) * 0.03;
        const mat = worn ? flat('#8a887e') : blank ? flat('#b8b4a8') : M.stone;
        g.add(mesh(box(0.28, h, 0.16), mat, x, h / 2, 0, 0, i % 4 === 1 ? 0.05 : i % 4 === 3 ? -0.04 : 0));
        g.add(mesh(box(0.2, 0.06, 0.14), mat, x, h + 0.02, 0));
        if (!blank) { g.add(mesh(box(0.18, 0.025, 0.012), flat('#3a3832'), x, h - 0.1, 0.085)); if (!worn) g.add(mesh(box(0.12, 0.025, 0.012), flat('#3a3832'), x, h - 0.18, 0.085)); }
      }
      g.add(mesh(box(0.22, 0.03, 0.012), flat('#24221e'), -2.52, 0.12, 0.085)); // the charge, cut deep
      g.add(mesh(box(5.6, 0.06, 0.4), M.cobble, 0, 0.03, 0)); // the kerb they're set in
      break;
    }
    case 'wallbell': {
      // A bronze bell in an oak frame, its clapper strapped to the post, the rope looped up on a hook
      const oak = flat('#4a3624'), bronze = flat('#8a6a34');
      for (const x of [-0.75, 0.75]) { g.add(mesh(box(0.22, 2.6, 0.22), oak, x, 1.3, 0)); g.add(mesh(box(0.22, 0.12, 0.7), oak, x, 0.06, 0)); }
      g.add(mesh(box(1.8, 0.24, 0.26), oak, 0, 2.62, 0));
      g.add(mesh(box(0.5, 0.16, 0.5), bronze, 0, 2.38, 0));
      g.add(mesh(box(0.72, 0.5, 0.72), bronze, 0, 2.06, 0));
      g.add(mesh(box(0.94, 0.16, 0.94), bronze, 0, 1.76, 0));
      g.add(mesh(box(0.96, 0.04, 0.96), flat('#5a4a28'), 0, 1.82, 0));    // the cast letters round the rim
      g.add(mesh(box(0.1, 0.4, 0.1), flat('#3a3a3e'), 0, 1.55, 0));        // the clapper
      g.add(mesh(box(0.68, 0.05, 0.05), flat('#6a4a2a'), -0.36, 1.5, 0)); // its strap, to the post
      g.add(mesh(box(0.04, 0.9, 0.04), flat('#b8a478'), -0.84, 1.75, 0.14)); // the rope, looped up
      g.add(mesh(box(0.14, 0.14, 0.06), flat('#b8a478'), -0.84, 2.2, 0.16));
      break;
    }
    case 'watchboard': {
      // A board with a row of hooks, one per tower, a named peg on all but one, chalk under the empty hook
      const board = flat('#5a4630');
      for (const x of [-0.85, 0.85]) g.add(mesh(box(0.14, 1.9, 0.14), flat('#3a2c1e'), x, 0.95, 0));
      g.add(mesh(box(1.8, 0.95, 0.08), board, 0, 1.35, 0.04));
      for (let i = 0; i < 9; i++) {
        const x = -0.72 + i * 0.18;
        g.add(mesh(box(0.03, 0.03, 0.08), flat('#2a2a2e'), x, 1.62, 0.12));
        if (i !== 3) g.add(mesh(box(0.06, 0.22, 0.04), flat(i % 3 ? '#c8b088' : '#a89060'), x, 1.48, 0.14));
      }
      g.add(mesh(box(0.2, 0.06, 0.01), flat('#e8e4d8'), -0.18, 1.2, 0.085));
      g.add(mesh(box(1.9, 0.1, 0.2), flat('#3a2c1e'), 0, 1.86, 0.06)); // the drip board over it
      break;
    }
    case 'tallypost': {
      // A grey larch post notched on every side, rows of fives, one notch black with pitch
      const larch = flat('#8a8478');
      g.add(mesh(box(0.34, 2.6, 0.34), larch, 0, 1.3, 0));
      for (let i = 0; i < 9; i++) for (const side of [-1, 1]) g.add(mesh(box(0.38, 0.03, 0.05), flat('#4a463e'), 0, 0.4 + i * 0.24, side * 0.16));
      g.add(mesh(box(0.38, 0.05, 0.06), flat('#1a1612'), 0, 2.36, 0.16));
      g.add(mesh(box(0.42, 0.12, 0.42), larch, 0, 2.66, 0, Math.PI / 4));
      break;
    }
    case 'cairn': {
      // A heap of carried stones, broad at the foot, a crook-height high, a mitten in the top
      const stones = [[0, 0.25, 0, 1.4, 0.5, 1.2], [0.1, 0.7, -0.05, 1.1, 0.45, 0.95], [-0.05, 1.1, 0.05, 0.8, 0.4, 0.7], [0.05, 1.45, 0, 0.55, 0.32, 0.5], [0, 1.72, 0, 0.32, 0.24, 0.3]] as const;
      stones.forEach(([x, y, z, w, h, d], i) => g.add(mesh(box(w, h, d), i % 2 ? M.cobble : M.stone, x, y, z, i * 0.7)));
      g.add(mesh(box(0.14, 0.18, 0.08), flat('#a83a2e'), 0.12, 1.88, 0.06, 0.4));
      for (let i = 0; i < 6; i++) { const a = i * 1.1; g.add(mesh(box(0.3, 0.2, 0.26), M.cobble, Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.8, a)); }
      break;
    }
    case 'sledge': {
      // Ash runners curled up at the front, a slatted bed, a rope harness in the snow
      const ash = flat('#b89868'), ashDk = flat('#7a6040'), iron = flat('#4a4a50');
      for (const x of [-0.45, 0.45]) {
        g.add(mesh(box(0.08, 0.1, 2.0), iron, x, 0.05, 0));
        g.add(mesh(box(0.1, 0.14, 2.0), ash, x, 0.17, 0));
        g.add(mesh(box(0.1, 0.4, 0.12), ash, x, 0.32, 1.02, 0.5));
        for (const z of [-0.7, 0, 0.7]) g.add(mesh(box(0.08, 0.3, 0.08), ashDk, x, 0.36, z));
      }
      for (let i = 0; i < 6; i++) g.add(mesh(box(1.0, 0.05, 0.22), ash, 0, 0.52, -0.75 + i * 0.3));
      g.add(mesh(box(1.0, 0.36, 0.06), ashDk, 0, 0.72, -0.98));
      g.add(mesh(box(0.8, 0.12, 0.02), flat('#d8ccb0'), 0, 0.76, -1.015));
      for (const x of [-0.4, 0.4]) g.add(mesh(box(0.05, 0.05, 0.9), flat('#a89060'), x, 0.08, 1.5));
      break;
    }
    case 'fordpost': {
      // A black oak post at the water's edge, notched down its river side, THE FORD carved at the top
      g.add(mesh(box(0.32, 2.4, 0.32), flat('#2e241c'), 0, 1.2, 0));
      for (let i = 0; i < 4; i++) g.add(mesh(box(0.36, 0.05, 0.12), flat('#c8b898'), 0, 0.5 + i * 0.42, 0.13));
      g.add(mesh(box(0.7, 0.32, 0.06), flat('#4a3a2a'), 0, 2.15, 0.19));
      g.add(mesh(box(0.56, 0.06, 0.02), flat('#c8b898'), 0, 2.15, 0.225));
      break;
    }
    case 'floodstone': {
      // A slab in the bank, lines cut across it at the heights the water came to
      g.add(mesh(box(1.1, 1.5, 0.3), M.stone, 0, 0.75, 0, 0, 0.03));
      for (const [y, w] of [[1.32, 0.9], [1.05, 0.7], [0.84, 0.9], [0.62, 0.6], [0.4, 0.8]] as const) g.add(mesh(box(w, 0.035, 0.02), flat('#3a3832'), -0.04, y, 0.16));
      g.add(mesh(box(0.22, 0.03, 0.02), flat('#f0ece0'), 0.32, 0.52, 0.165)); // the chalk mark, over the newest line
      break;
    }
    case 'mootstone': {
      // A low flat stone, dished on top from the boots of three hundred years of reeves
      g.add(mesh(box(1.3, 0.5, 1.0), M.stone, 0, 0.25, 0));
      g.add(mesh(box(1.1, 0.06, 0.8), flat('#8a887e'), 0, 0.5, 0));
      g.add(mesh(box(0.7, 0.04, 0.5), flat('#6e6c64'), 0, 0.52, 0));
      for (let i = 0; i < 5; i++) g.add(mesh(box(0.18, 0.03, 0.02), flat('#3a3832'), -0.5 + i * 0.24, 0.3, 0.505));
      break;
    }
    case 'pump': {
      // A green cast-iron pump on a post, a stone trough under its spout, a tin cup on a chain
      const iron = flat('#3a5a42'), ironDk = flat('#24382a');
      g.add(mesh(box(0.3, 1.5, 0.3), iron, 0, 0.75, 0));
      g.add(mesh(box(0.36, 0.2, 0.36), ironDk, 0, 1.55, 0));
      g.add(mesh(box(0.1, 0.1, 0.5), iron, 0, 1.15, 0.36));                 // the spout
      const handle = mesh(box(0.06, 0.06, 0.8), ironDk, 0, 1.62, -0.35); handle.rotation.x = 0.4; g.add(handle);
      g.add(mesh(box(1.3, 0.5, 0.6), M.stone, 0, 0.25, 0.75));                 // the trough
      g.add(mesh(box(1.1, 0.06, 0.42), flat('#5a7a8a'), 0, 0.46, 0.75));       // water in it
      g.add(mesh(box(0.12, 0.12, 0.12), flat('#a8a8a0'), 0.22, 1.0, 0.18));    // the cup
      g.add(mesh(box(0.42, 0.3, 0.02), flat('#d8ccb0'), 0, 1.2, -0.16));       // the notice
      break;
    }
    case 'tallystone': {
      // A low standing stone painted with rows of strokes in fives, the newest row short
      g.add(mesh(box(1.6, 1.15, 0.5), M.stone, 0, 0.58, 0, 0, 0.04));
      g.add(mesh(box(1.4, 0.2, 0.45), M.cobble, 0, 1.2, 0));
      for (let row = 0; row < 6; row++) {
        const n = row === 5 ? 31 : 36 + ((row * 3) % 5);
        for (let i = 0; i < n; i++) {
          const five = i % 5 === 4;
          const sx = -0.7 + Math.floor(i / 5) * 0.17 + (i % 5) * 0.028;
          g.add(mesh(box(five ? 0.15 : 0.012, five ? 0.012 : 0.1, 0.01), flat('#f4f0e8'), five ? sx - 0.06 : sx, 1.02 - row * 0.15, 0.26, 0, 0, five ? 0.6 : 0));
        }
      }
      break;
    }
    case 'companysign': {
      // Two squared posts either side of the gate and a long board across the top, the letters cut and painted
      for (const k of [-1, 1]) {
        g.add(mesh(box(0.42, 5.4, 0.42), M.darkWood, k * 3.6, 2.7, 0));
        g.add(mesh(box(0.7, 0.4, 0.7), M.stone, k * 3.6, 0.2, 0));
        g.add(mesh(box(0.14, 1.1, 0.14), M.darkWood, k * 3.1, 4.3, 0, 0, 0, k * 0.8)); // braces
      }
      g.add(mesh(box(7.9, 1.1, 0.18), flat('#7a2a1e'), 0, 4.9, 0));
      g.add(mesh(box(8.1, 0.14, 0.3), M.darkWood, 0, 5.52, 0));
      g.add(mesh(box(8.1, 0.14, 0.3), M.darkWood, 0, 4.28, 0));
      for (let i = 0; i < 14; i++) g.add(mesh(box(0.34, 0.5, 0.02), flat('#e8c860'), -3.2 + i * 0.49, 4.98, 0.1)); // the letters, larger every spring
      for (let i = 0; i < 9; i++) g.add(mesh(box(0.22, 0.22, 0.02), flat('#e8dcc0'), -2.0 + i * 0.5, 4.55, 0.1));
      break;
    }
    case 'priceboard': {
      // A painted board on two legs by the trestle: the company's prices, and the pencil column down the side
      for (const k of [-1, 1]) g.add(mesh(box(0.16, 2.2, 0.16), M.darkWood, k * 0.85, 1.1, 0));
      g.add(mesh(box(1.9, 1.3, 0.08), flat('#e8dcc0'), 0, 1.55, 0));
      g.add(mesh(box(1.5, 0.12, 0.02), flat('#7a2a1e'), -0.1, 2.06, 0.05));
      for (let i = 0; i < 6; i++) g.add(mesh(box(0.9 - (i % 3) * 0.12, 0.05, 0.02), flat('#2a2018'), -0.35, 1.86 - i * 0.15, 0.05));
      for (let i = 0; i < 5; i++) g.add(mesh(box(0.28, 0.03, 0.02), flat('#8a8a8a'), 0.62, 1.82 - i * 0.15, 0.05)); // the pencil
      break;
    }
    case 'flywheel': {
      // The old engine's flywheel leaned on the wall: a rim, a hub, seven spokes of eight, a crack by the gap
      const w = new THREE.Group(); w.position.set(0, 2.15, 0.2); w.rotation.x = -0.18; g.add(w);
      const iron = flat('#4a4e56'), rust = flat('#7a4a32');
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; w.add(mesh(box(0.6, 0.26, 0.28), i % 5 === 2 ? rust : iron, Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0, 0, 0, a + Math.PI / 2)); }
      w.add(mesh(cyl(0.38, 0.38, 0.5, 12), iron, 0, 0, 0, 0, Math.PI / 2));
      for (let i = 0; i < 8; i++) { if (i === 3) continue; const a = (i / 8) * Math.PI * 2; w.add(mesh(box(0.16, 1.7, 0.16), i % 2 ? iron : rust, Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0, 0, 0, a - Math.PI / 2)); }
      w.add(mesh(box(0.05, 0.4, 0.3), flat('#1a1a1c'), Math.cos(Math.PI * 0.8) * 2.0, Math.sin(Math.PI * 0.8) * 2.0, 0.01, 0, 0, Math.PI * 0.8)); // the crack
      for (let i = 0; i < 4; i++) w.add(mesh(box(0.3, 0.05, 0.02), flat('#f0ece0'), -0.6 + i * 0.36, -1.98, 0.16)); // DELIA SAYS KEEP IT, in chalk
      g.add(mesh(box(1.4, 0.2, 0.6), M.stone, 0, 0.1, 0.6));                                              // the block it stands on
      break;
    }
    case 'anselbench': {
      // A bench made from a hatch cover, its back board carved with his name
      const b = bench(M, 2, 1); g.add(b);
      g.add(mesh(box(1.9, 0.5, 0.06), flat('#6a5238'), 0, 0.98, -0.25, 0, 0.12));
      for (let i = 0; i < 3; i++) g.add(mesh(box(0.9 - i * 0.2, 0.04, 0.02), flat('#2a2018'), 0, 1.1 - i * 0.12, -0.21, 0, 0.12));
      g.add(mesh(cyl(0.2, 0.2, 0.12, 10), M.rope, 0.55, 0.6, 0.0));                                     // a coil of new rope
      break;
    }
    default: return statue(M);
  }
  return g;
}

/** A parish pump: a cast-iron standard painted green, its handle up, a stone trough under the spout. */
export function pump(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group();
  const paint = flat(['#2f4a3a', '#3a3f48', '#5a2a26'][tint % 3]);
  g.add(mesh(box(1.6, 0.1, 1.0), M.cobble, 0, 0.05, 0.1));
  g.add(mesh(box(0.34, 1.7, 0.34), paint, 0, 0.95, -0.2));
  g.add(mesh(cyl(0.24, 0.24, 0.16, 10), paint, 0, 1.86, -0.2));
  g.add(mesh(cyl(0.1, 0.2, 0.2, 10), paint, 0, 2.02, -0.2));
  g.add(mesh(box(0.08, 0.08, 0.38), paint, 0, 1.2, 0.0));                             // the spout
  g.add(mesh(box(0.06, 0.06, 0.9), M.iron, 0.2, 1.75, -0.45, 0, -0.5));               // the handle
  g.add(mesh(box(1.3, 0.42, 0.56), M.stone, 0, 0.31, 0.32));
  g.add(mesh(box(1.16, 0.02, 0.42), flat('#2c4a56'), 0, 0.5, 0.32));
  return g;
}

/** A long stone horse trough with a ring to tie up at either end. */
export function trough(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(2.3, 0.62, 0.8), M.stone, 0, 0.31, 0));
  g.add(mesh(box(2.1, 0.02, 0.6), flat('#2c4a56'), 0, 0.58, 0));
  for (const k of [-1, 1]) {
    g.add(mesh(box(0.3, 0.68, 0.86), M.cobble, k * 1.05, 0.34, 0));
    g.add(mesh(cyl(0.1, 0.1, 0.03, 8), M.iron, k * 1.21, 0.5, 0, 0, 0, Math.PI / 2));
  }
  return g;
}

/** A stone well-head without a roof: a drum of dressed stone, an iron hoop over it with a pulley and a bucket. */
export function wellhead(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.95, 1.02, 0.85, 14), M.stone, 0, 0.42, 0));
  g.add(mesh(cyl(1.0, 1.0, 0.1, 14), M.cobble, 0, 0.9, 0));
  g.add(mesh(cyl(0.72, 0.72, 0.04, 14), flat('#0e2430'), 0, 0.88, 0));
  for (const k of [-1, 1]) g.add(mesh(box(0.08, 1.7, 0.08), M.iron, k * 0.85, 1.75, 0));
  g.add(mesh(box(1.78, 0.08, 0.08), M.iron, 0, 2.6, 0));
  g.add(mesh(cyl(0.16, 0.16, 0.06, 10), M.iron, 0, 2.45, 0, 0, 0, Math.PI / 2));
  g.add(mesh(box(0.02, 0.9, 0.02), M.rope, 0, 1.95, 0.12));
  g.add(mesh(cyl(0.18, 0.15, 0.28, 8), M.wood, 0.55, 1.08, 0.5));
  return g;
}

/** A round seat built round a tree's trunk: eight slatted boards on legs. */
export function ringSeat(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = Math.sin(a) * 1.1, z = Math.cos(a) * 1.1;
    g.add(mesh(box(0.92, 0.08, 0.42), M.wood, x, 0.46, z, a));
    g.add(mesh(box(0.08, 0.44, 0.08), M.darkWood, Math.sin(a) * 1.25, 0.22, Math.cos(a) * 1.25));
  }
  return g;
}

/** A rack of nets hung out to dry between two posts, len long, floats along the top. Each boat's floats are its own colours (seed). */
export function netRack(M: PropMaterials, len = 3, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const r = (k: number) => seeded(seed, k);
  for (const k of [-1, 1]) g.add(mesh(box(0.12, 2, 0.12), M.darkWood, k * len / 2, 1, 0));
  g.add(mesh(box(len + 0.2, 0.1, 0.1), M.darkWood, 0, 1.95, 0));
  const net = flat(['#6a7a6a', '#5a6a7a', '#7a6a4a', '#4a5a4a'][Math.floor(r(1) * 4)], { transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const drop = 1.0 + r(2) * 0.6;
  g.add(mesh(box(len - 0.1, drop, 0.02), net, 0, 1.93 - drop / 2, 0));
  if (r(3) < 0.4) g.add(mesh(box(0.6 + r(4) * 0.6, 0.5, 0.02), net, (r(5) - 0.5) * len * 0.6, 1.93 - drop - 0.2, 0.02, 0, 0, (r(6) - 0.5) * 0.4)); // a torn piece hanging lower, waiting on the mending
  const pairs = [['#c8402a', '#e8dcc0'], ['#2a5a9a', '#e8dcc0'], ['#e8c040', '#3a3a3a'], ['#3a7a3a', '#e8dcc0'], ['#e87a2a', '#e8e8e0']];
  const pr = pairs[Math.floor(r(7) * pairs.length)];
  for (let i = 0; i < Math.round(len / 0.4); i++) g.add(mesh(box(0.14, 0.1, 0.14), flat(pr[i % 2]), -len / 2 + 0.3 + i * 0.4, 1.86, 0.06));
  return g;
}

/** Lobster pots stacked on the quay, as many as the boat owns (seed), willow cages with their rope and a buoy or two. */
export function lobsterPots(M: PropMaterials, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const rr = (k: number) => seeded(seed, k);
  const cage = flat(rr(1) < 0.5 ? '#7a5a32' : '#8a6a3a');
  const spots = [[-0.35, 0.22, 0, 0], [0.35, 0.22, 0.05, 0.3], [0, 0.66, 0.02, 0.15], [0.1, 0.22, -0.6, -0.2], [-0.5, 0.22, -0.55, 0.5], [-0.15, 1.1, 0.0, -0.3]] as const;
  const n = 2 + Math.floor(rr(2) * 4.99);
  if (rr(3) < 0.5) g.add(mesh(box(0.22, 0.3, 0.22), flat(['#c8402a', '#e8c040', '#2a5a9a'][Math.floor(rr(4) * 3)]), 0.75, 0.15, 0.3)); // a buoy, the boat's colour
  for (const [x, y, z, r] of spots.slice(0, n)) {
    const pot = new THREE.Group();
    pot.add(mesh(box(0.6, 0.06, 0.5), cage, 0, -0.18, 0));
    for (const k of [-0.25, 0, 0.25]) pot.add(mesh(box(0.05, 0.04, 0.52), cage, k, 0.2, 0, 0, 0, 0));
    for (const kx of [-0.28, 0.28]) for (const kz of [-0.22, 0.22]) pot.add(mesh(box(0.04, 0.4, 0.04), cage, kx, 0, kz));
    pot.position.set(x, y, z); pot.rotation.y = r;
    g.add(pot);
  }
  if (rr(5) < 0.6) g.add(mesh(cyl(0.18, 0.18, 0.14, 8), M.rope, 0.6, 0.07, -0.5));
  return g;
}

/** A bank's vault door in its frame against the back wall: round, iron, a wheel to open it and bolts all round. */
export function vaultDoor(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.9, 2.3, 0.2), M.stone, 0, 1.15, -0.15));                       // the frame set in the wall
  const door = mesh(cyl(0.82, 0.82, 0.16, 20), M.iron, 0, 1.15, -0.02, 0, Math.PI / 2);
  g.add(door);
  g.add(mesh(cyl(0.68, 0.68, 0.04, 20), flat('#3a3a40'), 0, 1.15, 0.07, 0, Math.PI / 2)); // the door's face, darker
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(mesh(box(0.08, 0.08, 0.06), flat('#c8a050'), Math.cos(a) * 0.74, 1.15 + Math.sin(a) * 0.74, 0.08)); } // brass bolts
  g.add(mesh(cyl(0.24, 0.24, 0.05, 12), flat('#c8a050'), 0, 1.15, 0.12, 0, Math.PI / 2)); // the wheel's hub
  for (let i = 0; i < 4; i++) { const sp = mesh(box(0.06, 0.6, 0.05), flat('#c8a050'), 0, 1.15, 0.13); sp.rotation.z = (i * Math.PI) / 4; g.add(sp); } // its spokes
  g.add(mesh(box(0.3, 0.08, 0.12), M.iron, 0.6, 1.15, 0.1));                        // the hinge side's great hinge
  return g;
}

/** An iron-bound strongbox with a heavy lock. */
export function strongbox(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.74, 0.5, 0.54), M.darkWood, 0, 0.25, 0));
  for (const x of [-0.25, 0, 0.25]) g.add(mesh(box(0.06, 0.52, 0.56), M.iron, x, 0.25, 0));
  g.add(mesh(box(0.76, 0.06, 0.56), M.iron, 0, 0.5, 0));
  g.add(mesh(box(0.14, 0.16, 0.06), flat('#c8a050'), 0, 0.34, 0.29));                // the lock
  return g;
}

/** A carved turnip with a candle in it, the face lit. The Lantern Wake's, on a step or a sill; hung on a post, it's cut all round. */
export function carvedTurnip(allRound = false): THREE.Group {
  const g = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: '#ffb040' });
  g.add(mesh(box(0.34, 0.3, 0.32), flat('#e8dcc0'), 0, 0.15, 0));
  g.add(mesh(box(0.3, 0.08, 0.28), flat('#7a3a6a'), 0, 0.32, 0));
  g.add(mesh(box(0.04, 0.12, 0.04), flat('#5a8a3a'), 0.03, 0.42, 0));
  for (let k = 0; k < (allRound ? 4 : 1); k++) {
    const face = new THREE.Group();
    for (const sx of [-0.07, 0.07]) face.add(mesh(box(0.06, 0.05, 0.02), glow, sx, 0.19, 0.165));
    face.add(mesh(box(0.16, 0.03, 0.02), glow, 0, 0.09, 0.165));
    face.rotation.y = k * Math.PI / 2;
    g.add(face);
  }
  return g;
}

/**
 * The light behind every carved face: one material for all the jack-o'-lanterns, so the game can turn
 * them up after dark (Game sets emissiveIntensity from the night).
 */
export const PUMPKIN_GLOW = new THREE.MeshLambertMaterial({ color: '#ffc060', emissive: new THREE.Color('#ff8a20'), emissiveIntensity: 1 });

/** A pumpkin `size` across (1 is about two thirds of a block): ribbed lobes round a core, a stalk, a sunken crown. */
export function pumpkin(color = '#e8801e', size = 1, stalk = '#5a5a26'): THREE.Group {
  const g = new THREE.Group(), s = size;
  const body = flat(color), dark = flat(new THREE.Color(color).multiplyScalar(0.72).getStyle());
  g.add(mesh(box(0.5 * s, 0.42 * s, 0.5 * s), body, 0, 0.21 * s, 0));
  // Four lobes turned through the eighth-turns: eight ribs all round
  // Lobes turned through the eighth-turns: eight ribs all round (a big one gets twelve, so it reads round, not a crate)
  const lobes = size > 2 ? 6 : 4;
  for (let k = 0; k < lobes; k++) g.add(mesh(box(0.6 * s, 0.36 * s, 0.3 * s), k % 2 ? body : dark, 0, 0.19 * s, 0, (k * Math.PI) / lobes));
  g.add(mesh(box(0.24 * s, 0.05 * s, 0.24 * s), dark, 0, 0.42 * s, 0));
  const st = mesh(box(0.07 * s, 0.17 * s, 0.07 * s), flat(stalk), 0.01 * s, 0.5 * s, 0);
  st.rotation.z = 0.18;
  g.add(st);
  return g;
}

/**
 * A pumpkin with a face cut in it and a candle inside: the faces are Barty Rudd's six (data/wakeFair.ts
 * FACES): a grin, a fright, a scowl, all teeth, a cat and a wink.
 */
export function jackOLantern(face = 0, size = 1, color = '#e8801e'): THREE.Group {
  const g = pumpkin(color, size);
  const s = size, z = 0.302 * s, body = flat(color);
  const cut = (w: number, h: number, x: number, y: number, rz = 0, mat: THREE.Material = PUMPKIN_GLOW) => {
    const m = mesh(box(w * s, h * s, 0.02 * s), mat, x * s, y * s, z);
    m.rotation.z = rz;
    g.add(m);
  };
  // A triangle, near enough, in steps: wide at the foot
  const tri = (x: number, y: number, w = 0.11) => { cut(w, 0.035, x, y); cut(w * 0.6, 0.035, x, y + 0.035); cut(w * 0.25, 0.03, x, y + 0.065); };
  switch (((face % 6) + 6) % 6) {
    case 0: // The grin: triangle eyes and nose, a wide mouth with two teeth left in
      tri(-0.11, 0.27); tri(0.11, 0.27); tri(0, 0.21, 0.06);
      cut(0.3, 0.05, 0, 0.14); cut(0.2, 0.035, 0, 0.11);
      cut(0.04, 0.03, -0.06, 0.155, 0, body); cut(0.04, 0.03, 0.06, 0.125, 0, body);
      break;
    case 1: // The fright: round eyes, an O of a mouth
      cut(0.09, 0.09, -0.11, 0.3); cut(0.09, 0.09, 0.11, 0.3);
      cut(0.1, 0.12, 0, 0.14); cut(0.06, 0.16, 0, 0.14);
      break;
    case 2: // The scowl: brows down, a flat mouth turned down at the ends
      cut(0.13, 0.045, -0.11, 0.3, -0.35); cut(0.13, 0.045, 0.11, 0.3, 0.35);
      cut(0.24, 0.035, 0, 0.15); cut(0.04, 0.06, -0.13, 0.125); cut(0.04, 0.06, 0.13, 0.125);
      break;
    case 3: // All teeth: small mean eyes over a mouth full of them
      cut(0.07, 0.06, -0.1, 0.31); cut(0.07, 0.06, 0.1, 0.31);
      cut(0.34, 0.12, 0, 0.15);
      for (let k = 0; k < 4; k++) { cut(0.045, 0.04, -0.12 + k * 0.08, 0.19, 0, body); cut(0.045, 0.04, -0.08 + k * 0.08, 0.11, 0, body); }
      break;
    case 4: // The cat: slit eyes, a little nose, a mouth like a w
      cut(0.12, 0.04, -0.11, 0.3, 0.2); cut(0.12, 0.04, 0.11, 0.3, -0.2);
      cut(0.025, 0.07, -0.11, 0.3, 0, body); cut(0.025, 0.07, 0.11, 0.3, 0, body);
      tri(0, 0.21, 0.05);
      cut(0.09, 0.03, -0.045, 0.16, -0.5); cut(0.09, 0.03, 0.045, 0.16, 0.5);
      break;
    case 5: // The wink: one eye shut, a crooked grin
      tri(-0.11, 0.27); cut(0.11, 0.025, 0.11, 0.3, -0.1);
      cut(0.28, 0.05, 0.02, 0.15, 0.14); cut(0.06, 0.04, 0.14, 0.18, 0.4);
      break;
  }
  return g;
}

/** Gourds and marrows heaped round a sheaf of oats, with a carved turnip in front. */
export function gourdPile(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.34, 0.9, 0.3), flat('#d8b050'), -0.2, 0.45, -0.15));
  g.add(mesh(box(0.38, 0.08, 0.34), flat('#a0522d'), -0.2, 0.55, -0.15));
  for (const [x, z, sz, c] of [[0.2, -0.1, 0.36, '#e8801e'], [0.3, 0.22, 0.26, '#c8a040'], [-0.3, 0.2, 0.3, '#5a7a3a'], [0.05, 0.25, 0.2, '#e8a030']] as const) {
    g.add(mesh(box(sz, sz * 0.8, sz), flat(c), x, sz * 0.4, z));
    g.add(mesh(box(0.05, 0.1, 0.05), flat('#4a6a2a'), x, sz * 0.8 + 0.05, z));
  }
  const t = carvedTurnip(); t.position.set(-0.05, 0, 0.32); t.scale.setScalar(0.8); g.add(t);
  void M;
  return g;
}

/** A straw man on a pole in an old coat, with a turnip for a head and a hat gone soft with rain. */
export function scarecrow(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.1, 1.9, 0.1), M.darkWood, 0, 0.95, 0));
  g.add(mesh(box(1.2, 0.08, 0.08), M.darkWood, 0, 1.45, 0));
  g.add(mesh(box(0.46, 0.66, 0.26), flat('#5a4a3a'), 0, 1.25, 0));           // the coat
  for (const sx of [-1, 1]) {
    g.add(mesh(box(0.42, 0.18, 0.2), flat('#5a4a3a'), sx * 0.4, 1.45, 0));     // its sleeves
    g.add(mesh(box(0.08, 0.16, 0.06), flat('#e8c860'), sx * 0.64, 1.42, 0));   // straw out of the cuffs
  }
  g.add(mesh(box(0.14, 0.14, 0.02), flat('#7a9a3a'), 0.1, 1.2, 0.135));       // a patch
  g.add(mesh(box(0.1, 0.22, 0.06), flat('#e8c860'), 0, 0.84, 0));             // straw out of the hem
  const head = carvedTurnip(); head.position.set(0, 1.58, 0); head.scale.setScalar(1.15); g.add(head);
  g.add(mesh(box(0.62, 0.04, 0.6), flat('#3a3028'), 0, 2.02, 0));
  const crown = mesh(box(0.32, 0.2, 0.32), flat('#3a3028'), 0.02, 2.13, 0); crown.rotation.z = 0.12; g.add(crown);
  return g;
}

/** A straw beehive on its stand: a skep in coils, with its little door. */
export function beehive(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.7, 0.5, 0.7), M.darkWood, 0, 0.25, 0));
  const straw = flat('#c8a050');
  for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.34 - i * 0.07, 0.36 - i * 0.07, 0.16, 10), i % 2 ? straw : flat('#b8903a'), 0, 0.58 + i * 0.15, 0));
  g.add(mesh(box(0.12, 0.08, 0.04), flat('#1e1610'), 0, 0.56, 0.35));
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
  g.add(mesh(flameCard(0.07, 0.11), M.fire, 0.05, 0.965, 0.12));
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
  g.add(mesh(box(0.88, 0.95, 0.02), flat('#1e1a18'), 0, 0.6, -0.195));
  g.add(mesh(box(0.66, 0.05, 0.34), M.embers, 0, 0.145, 0.02));
  for (const x of [-0.18, 0.18]) g.add(mesh(box(0.5, 0.1, 0.1), M.bark, x, 0.2, 0.05, 0.4 * Math.sign(x)));
  g.add(mesh(box(0.62, 0.11, 0.11), M.bark, 0, 0.2, -0.1));
  for (const [x, z, w, h, turn] of [[0, 0, 0.44, 0.66, 0.3], [-0.16, 0.04, 0.32, 0.48, 0.9], [0.16, -0.02, 0.34, 0.52, 1.4], [-0.07, -0.09, 0.24, 0.36, 0.1], [0.08, 0.09, 0.2, 0.3, 1.1]]) {
    g.add(mesh(flameCard(w, h, x, z, turn), M.fire, 0, 0.17, 0));
  }
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
/** The leaf of a doorway `high` blocks tall, swung open against the wall (its kind: see doorLeaf). */
export function openDoor(M: PropMaterials, high = 3, kind: DoorKind = 'cottage', paint?: string): THREE.Group {
  return doorLeaf(M, high, kind, paint);
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
    case 'lounger': return lounger(M, tint);
    case 'easel': return easel(M);
    case 'spyglass': return spyglass(M);
    case 'anvil': return anvil(M);
    case 'forge': return homeForge(M);
    case 'crocks': return crocks(M, tint);
    case 'hayrack': return hayRack(M);
    case 'hurdle': return hurdle(M);
    case 'bones': return bones(tint);
    case 'turnip': return carvedTurnip();
    case 'pumpkin': return jackOLantern(tint);
    case 'vault': return vaultDoor(M);
    case 'strongbox': return strongbox(M);
    case 'gourds': return gourdPile(M);
    case 'scarecrow': return scarecrow(M);
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
export function bannerTexture(kind: BannerKind): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const x = c.getContext('2d')!;
  if (kind.startsWith('guild:')) {
    // A guild's own, from its name (data/guildhalls.ts guildArms): the field divided one of five ways,
    // a roundel with the guild's initial on it, a gold edge, and a swallowtail
    const a = guildArms(kind.slice(6));
    x.fillStyle = a.field; x.fillRect(0, 0, 64, 128);
    x.fillStyle = a.charge;
    if (a.division === 1) x.fillRect(32, 0, 32, 128); // per pale
    else if (a.division === 2) x.fillRect(0, 64, 64, 64); // per fess
    else if (a.division === 3) { x.beginPath(); x.moveTo(0, 104); x.lineTo(32, 70); x.lineTo(64, 104); x.lineTo(64, 120); x.lineTo(32, 86); x.lineTo(0, 120); x.fill(); } // a chevron
    else if (a.division === 4) { x.lineWidth = 9; x.strokeStyle = a.charge; x.beginPath(); x.moveTo(0, 6); x.lineTo(64, 122); x.moveTo(64, 6); x.lineTo(0, 122); x.stroke(); } // a saltire
    x.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 128; i += 4) x.fillRect(0, i, 64, 1);
    x.fillStyle = a.field; x.beginPath(); x.arc(32, 46, 17, 0, Math.PI * 2); x.fill();
    x.lineWidth = 3; x.strokeStyle = a.charge; x.stroke();
    x.fillStyle = a.charge; x.font = 'bold 24px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(a.initial, 32, 47);
    x.strokeStyle = '#e6c46a'; x.lineWidth = 2; x.strokeRect(3, 3, 58, 114);
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.moveTo(0, 128); x.lineTo(32, 108); x.lineTo(64, 128); x.closePath(); x.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  if (kind === 'tally') {
    // A gang's tally: an oxblood rag, frayed, with a stroke chalked for every cart they've taken
    x.fillStyle = '#4a1a16'; x.fillRect(0, 0, 64, 128);
    x.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 128; i += 3) x.fillRect(0, i, 64, 1);
    x.strokeStyle = '#e8e0cc'; x.lineWidth = 3; x.lineCap = 'round';
    for (let g = 0; g < 4; g++) {
      const ox = 10 + (g % 2) * 24, oy = 14 + Math.floor(g / 2) * 34;
      x.beginPath();
      for (let k = 0; k < 4; k++) { x.moveTo(ox + k * 4.5, oy); x.lineTo(ox + k * 4.5 + (k % 2 ? 1 : -1), oy + 22); }
      x.moveTo(ox - 3, oy + 18); x.lineTo(ox + 18, oy + 4);
      x.stroke();
    }
    x.beginPath(); x.moveTo(12, 92); x.lineTo(12, 112); x.moveTo(17, 92); x.lineTo(18, 112); x.stroke();
    // Frayed bottom
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 64; i += 4) x.fillRect(i, 118 + ((i * 7) % 9), 3, 12);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  if (kind === 'assembly') {
    // The Assembly's: the two stones of Callis, a black block set on a white one, on white cloth with a
    // black hem; old and weathered, as the one on the Mirador's tower is
    x.fillStyle = '#ece6d6'; x.fillRect(0, 0, 64, 128);
    x.fillStyle = 'rgba(0,0,0,0.04)';
    for (let i = 0; i < 128; i += 3) x.fillRect(0, i, 64, 1);
    x.fillStyle = '#d8d0bc'; x.fillRect(16, 58, 32, 26);
    x.strokeStyle = '#a8a08c'; x.lineWidth = 2; x.strokeRect(16, 58, 32, 26);
    x.fillStyle = '#1c1c20'; x.fillRect(20, 34, 24, 24);
    x.fillStyle = '#1c1c20'; x.fillRect(0, 112, 64, 10);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 64; i += 4) x.fillRect(i, 121 + ((i * 3) % 5), 2, 8);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  if (kind === 'brethren') {
    // The Brethren's sign: two crossed oars, because every captain started out pulling one, on sea-dark
    // cloth gone grey at the edges, the hem ragged from the wind
    x.fillStyle = '#1e2a30'; x.fillRect(0, 0, 64, 128);
    x.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 128; i += 3) x.fillRect(0, i, 64, 1);
    x.strokeStyle = '#d8ccb0'; x.lineCap = 'round';
    for (const [ax, ay, bx, by] of [[14, 30, 50, 92], [50, 30, 14, 92]]) {
      x.lineWidth = 4; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      // the blade at the lower end
      const ux = (bx - ax) / Math.hypot(bx - ax, by - ay), uy = (by - ay) / Math.hypot(bx - ax, by - ay);
      x.fillStyle = '#d8ccb0'; x.beginPath();
      x.ellipse(bx - ux * 6, by - uy * 6, 4, 10, Math.atan2(uy, ux) - Math.PI / 2, 0, Math.PI * 2); x.fill();
    }
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 64; i += 3) x.fillRect(i, 116 + ((i * 5) % 11), 2, 14);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
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

/** A banner's cloth: a town's, a gang's tally, a company's, or a guild's own ('guild:' and its name). */
export type BannerKind = 'hollin' | 'harrow' | 'aldermere' | 'tally' | 'brethren' | 'assembly' | `guild:${string}`;

/**
 * A guild hall's roll of honour (data/guildhalls.ts): a dark board in a moulded frame on the wall, len
 * wide, lettered in gold, the great beasts the guild has brought down in two columns under the heading.
 */
export function rollBoard(M: PropMaterials, text: string, len = 3.2): THREE.Group {
  const g = new THREE.Group();
  const h = len * 0.8;
  const c = document.createElement('canvas');
  c.width = 320; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#1c2a22'; x.fillRect(0, 0, 320, 256);
  x.strokeStyle = '#c8a050'; x.lineWidth = 3; x.strokeRect(10, 10, 300, 236);
  x.fillStyle = '#e8c860'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 24px Georgia, serif'; x.fillText('ROLL OF HONOUR', 160, 36);
  x.fillRect(90, 54, 140, 2);
  const names = text.split('\n').filter(Boolean);
  x.font = '15px Georgia, serif';
  if (!names.length) { x.font = 'italic 15px Georgia, serif'; x.fillStyle = '#a89058'; x.fillText('Room for the first.', 160, 140); }
  names.slice(0, 22).forEach((n, i) => x.fillText(n, i < 11 ? 85 : 235, 76 + (i % 11) * 15.5, 140));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshLambertMaterial({ map: tex }));
  face.position.set(0, 1.05 + h / 2, -0.04);
  g.add(face);
  // The frame
  for (const [w, hh, px, py] of [[len + 0.24, 0.12, 0, 1.05 - 0.06], [len + 0.24, 0.12, 0, 1.05 + h + 0.06], [0.12, h, -len / 2 - 0.06, 1.05 + h / 2], [0.12, h, len / 2 + 0.06, 1.05 + h / 2]] as const) g.add(mesh(box(w, hh, 0.1), M.darkWood, px, py, -0.07));
  return g;
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

/** A covered well; its little roof red tile unless mat says slate or thatch. */
export function well(M: PropMaterials, mat?: string): THREE.Group {
  const g = new THREE.Group();
  // A ring of cobble round an open shaft, capped with dressed stone, and dark water well down it
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(mesh(box(0.56, 0.9, 0.3), M.cobble, Math.cos(a) * 0.95, 0.45, Math.sin(a) * 0.95, -a - Math.PI / 2));
    g.add(mesh(box(0.6, 0.1, 0.4), M.stone, Math.cos(a) * 0.97, 0.95, Math.sin(a) * 0.97, -a - Math.PI / 2));
  }
  g.add(mesh(cyl(0.82, 0.82, 0.04, 16), flat('#0e2430'), 0, 0.12, 0));
  for (const x of [-1, 1]) g.add(mesh(box(0.14, 2.2, 0.14), M.darkWood, x, 1.1, 0));
  g.add(mesh(cyl(0.12, 0.12, 2.1, 8), M.darkWood, 0, 1.8, 0, 0, 0, Math.PI / 2));
  g.add(mesh(gableRoof(2.4, 1.6, 0.7, 0.2, 0.08, 0.15), mat === 'slate' ? M.roofSlate : mat === 'thatch' ? M.thatch : M.roofRed, 0, 2.2, 0, Math.PI / 2));
  g.add(mesh(cyl(0.18, 0.15, 0.3, 8), M.wood, 0.2, 1.2, 0));
  return g;
}

/**
 * A grave marker. 0: a round-topped headstone; 1: a cross; 2: a chest tomb, lying along the grave;
 * 3: an old slab, mossy and leaning; 4: a small slate. Stand it at the head of the grave.
 */
export function gravestone(M: PropMaterials, kind = 0): THREE.Group {
  const g = new THREE.Group();
  if (kind === 1) {
    g.add(mesh(box(0.14, 1.05, 0.13), M.stone, 0, 0.52, 0));
    g.add(mesh(box(0.52, 0.13, 0.11), M.stone, 0, 0.74, 0));
  } else if (kind === 2) {
    g.add(mesh(box(0.8, 0.5, 1.7), M.stone, 0, 0.25, -0.75));
    g.add(mesh(box(0.92, 0.1, 1.84), M.cobble, 0, 0.55, -0.75));
  } else if (kind === 3) {
    g.add(mesh(box(0.56, 0.78, 0.13), M.cobble, 0, 0.34, 0, 0, -0.22, 0.1));
  } else if (kind === 4) {
    g.add(mesh(box(0.42, 0.46, 0.08), flat('#4a4e56'), 0, 0.23, 0));
  } else {
    g.add(mesh(box(0.62, 0.66, 0.14), M.stone, 0, 0.33, 0));
    g.add(mesh(cyl(0.31, 0.31, 0.12, 12), M.stone, 0, 0.66, 0, 0, Math.PI / 2));
  }
  return g;
}

export function standingSign(M: PropMaterials, text: string): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.8, 0.8]) g.add(mesh(box(0.14, 1.9, 0.14), M.darkWood, x, 0.95, -0.11));
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
    g.add(mesh(flameCard(0.07, 0.12), M.fire, x, 0.065 + h, z));
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

/**
 * A gull that moves (world/siteProps.ts, game/GameWorld.ts animates it): the head and each wing on a pivot
 * of its own so it can look about, preen, stretch and fly. Facing +z, sitting.
 */
export function gullRig(): { root: THREE.Group; body: THREE.Group; head: THREE.Group; wl: THREE.Group; wr: THREE.Group } {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const white = flat('#f2f2ee'), grey = flat('#9aa2aa'), tip = flat('#2a2a2e'), beak = flat('#e0b030');
  const b = mesh(new THREE.SphereGeometry(0.16, 8, 6), white, 0, 0.18, 0); b.scale.set(0.8, 0.75, 1.3); body.add(b);
  body.add(mesh(box(0.14, 0.03, 0.12), tip, 0, 0.2, -0.24, 0, 0.3));
  for (const x of [-0.05, 0.05]) root.add(mesh(box(0.02, 0.08, 0.02), beak, x, 0.04, 0));
  const head = new THREE.Group(); head.position.set(0, 0.27, 0.12); body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), white, 0, 0.03, 0.04));
  head.add(mesh(new THREE.ConeGeometry(0.025, 0.1, 5), beak, 0, 0.02, 0.15, 0, Math.PI / 2));
  head.add(mesh(box(0.012, 0.012, 0.012), tip, 0.05, 0.05, 0.08)); head.add(mesh(box(0.012, 0.012, 0.012), tip, -0.05, 0.05, 0.08));
  const wing = (side: number) => {
    // pivoted at the shoulder: folded it lies along the back; opened (rotation.z) it spreads out sideways
    const w = new THREE.Group(); w.position.set(side * 0.1, 0.24, 0.02); body.add(w);
    w.add(mesh(box(0.3, 0.025, 0.22), grey, side * 0.15, 0, 0));
    w.add(mesh(box(0.16, 0.022, 0.16), tip, side * 0.36, 0, -0.02));
    return w;
  };
  return { root, body, head, wl: wing(-1), wr: wing(1) };
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
/** A potter's turned profile (radius, height) pairs, as a lathe solid. */
function turned(pts: [number, number][], mat: THREE.Material, x = 0, z = 0): THREE.Mesh {
  return mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 14), mat, x, 0, z);
}

/**
 * Crocks from the potter's: a tall storage jar, a jug with its lip, and a wide bowl; terracotta (tint 0)
 * or glazed blue (tint 1).
 */
export function crocks(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group(), mat = tint ? M.glaze : M.clay;
  g.add(turned([[0, 0], [0.13, 0], [0.19, 0.12], [0.2, 0.3], [0.15, 0.46], [0.1, 0.5], [0.11, 0.54], [0, 0.54]], mat, -0.18, 0));
  g.add(turned([[0, 0], [0.09, 0], [0.13, 0.1], [0.12, 0.22], [0.07, 0.3], [0.08, 0.36], [0, 0.36]], mat, 0.14, 0.06));
  g.add(turned([[0, 0], [0.1, 0], [0.18, 0.06], [0.2, 0.12], [0.18, 0.12], [0, 0.04]], mat, 0.06, -0.2));
  return g;
}

/** A forge for a house: a brick hearth waist high, the fire glowing in its mouth, a hood and a flue over it, the bellows at its side. */
export function homeForge(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  const brick = new THREE.MeshLambertMaterial({ color: '#8a3e2a' });
  g.add(mesh(box(1.2, 0.9, 1.0), brick, 0, 0.45, 0));
  g.add(mesh(box(0.7, 0.32, 0.12), M.glow, 0, 0.62, 0.45));
  g.add(mesh(box(0.5, 0.06, 0.5), M.embers, 0, 0.93, 0));
  g.add(mesh(box(1.0, 0.5, 0.8), brick, 0, 1.8, -0.05));
  g.add(mesh(box(0.4, 0.9, 0.4), brick, 0, 2.5, -0.1));
  const bl = bellows(M);
  bl.scale.setScalar(0.6); bl.position.set(0.85, 0, 0.1); bl.rotation.y = -Math.PI / 2;
  g.add(bl);
  return g;
}

/** A lounging chair for a deck: a slatted seat that tilts back into a long back, on a low frame, a cushion on it. */
export function lounger(M: PropMaterials, tint = 0): THREE.Group {
  const g = new THREE.Group();
  for (const k of [-1, 1]) g.add(mesh(box(0.06, 0.3, 1.7), M.darkWood, k * 0.3, 0.15, 0));
  g.add(mesh(box(0.66, 0.06, 1.1), M.wood, 0, 0.32, 0.3));
  g.add(mesh(box(0.66, 0.06, 0.8), M.wood, 0, 0.55, -0.62, 0, -0.55));
  const cush = flat(['#e8dcc0', '#3a5a8a', '#7a2a24'][Math.abs(tint) % 3]);
  g.add(mesh(box(0.58, 0.07, 1.0), cush, 0, 0.38, 0.3));
  g.add(mesh(box(0.58, 0.07, 0.7), cush, 0, 0.61, -0.6, 0, -0.55));
  return g;
}

/** A painter's easel: three legs, a ledge, and a canvas on it half done (the bay, by the colours). */
export function easel(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.05, 1.8, 0.05), M.wood, -0.3, 0.88, 0, 0, 0.12, 0.1));
  g.add(mesh(box(0.05, 1.8, 0.05), M.wood, 0.3, 0.88, 0, 0, 0.12, -0.1));
  g.add(mesh(box(0.05, 1.7, 0.05), M.wood, 0, 0.8, -0.35, 0, -0.35));
  g.add(mesh(box(0.8, 0.05, 0.12), M.darkWood, 0, 0.8, 0.12));
  g.add(mesh(box(0.74, 0.56, 0.03), flat('#f2ead8'), 0, 1.12, 0.14, 0, 0.12));
  g.add(mesh(box(0.7, 0.22, 0.01), flat('#3a6a9a'), 0, 1.0, 0.17, 0, 0.12));
  g.add(mesh(box(0.7, 0.14, 0.01), flat('#e8e4d8'), 0, 1.16, 0.15, 0, 0.12));
  g.add(mesh(box(0.7, 0.16, 0.01), flat('#9ac0dc'), 0, 1.31, 0.13, 0, 0.12));
  return g;
}

/** A brass spyglass on a tripod, aimed out to sea. */
export function spyglass(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(mesh(box(0.04, 1.3, 0.04), M.darkWood, Math.sin(a) * 0.22, 0.62, Math.cos(a) * 0.22, 0, Math.cos(a) * 0.18, -Math.sin(a) * 0.18)); }
  g.add(mesh(cyl(0.05, 0.07, 0.9, 8), M.bronze, 0, 1.36, 0.1, 0, Math.PI / 2 - 0.12));
  g.add(mesh(cyl(0.075, 0.075, 0.1, 8), M.bronze, 0, 1.42, 0.55, 0, Math.PI / 2 - 0.12));
  return g;
}

export function ropeCoil(M: PropMaterials): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.28 - i * 0.04, 0.035, 5, 14), M.rope, 0, 0.04 + i * 0.06, 0, 0, Math.PI / 2));
  return g;
}

/**
 * A gear wheel standing upright (in the XY plane, turning about z): a toothed rim, six spokes and an
 * iron hub. r is its radius to the teeth. The Kilnfolk's machines are made of them.
 */
export function cog(M: PropMaterials, r = 1.5): THREE.Group {
  const g = new THREE.Group();
  const t = Math.max(0.12, r * 0.1);
  const n = Math.max(8, Math.round(r * 7));
  g.add(mesh(new THREE.TorusGeometry(r * 0.82, r * 0.11, 6, 36), M.bronze));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = mesh(box(r * 0.2, r * 0.22, t * 2), M.bronze, Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.96, 0);
    m.rotation.z = a;
    g.add(m);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const m = mesh(box(r * 0.8, r * 0.1, t * 1.2), M.bronze, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, 0);
    m.rotation.z = a;
    g.add(m);
  }
  g.add(mesh(new THREE.CylinderGeometry(r * 0.17, r * 0.17, t * 3, 12), M.iron, 0, 0, 0, 0, Math.PI / 2, 0));
  return g;
}

/** A run of pipe along +z for len, flanged every two blocks, r thick. */
export function pipe(M: PropMaterials, len: number, r = 0.18): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, len, 10), M.bronze, 0, 0, len / 2, 0, Math.PI / 2, 0));
  for (let k = 0; k <= len + 0.01; k += 2) g.add(mesh(new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.12, 10), M.iron, 0, 0, k, 0, Math.PI / 2, 0));
  return g;
}

/** Bones on a cave floor: long bones crossed, ribs, and a skull (a sheep's, or worse, by tint). */
export function bones(tint = 0): THREE.Group {
  const g = new THREE.Group();
  const bone = flat(tint ? '#d8ccb0' : '#e8e0cc');
  const r = (k: number) => Math.sin(k * 12.9898 + tint * 78.233) * 0.5 + 0.5;
  for (let i = 0; i < 5; i++) {
    const m = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.5 + r(i) * 0.3, 5), bone, (r(i + 1) - 0.5) * 0.8, 0.04, (r(i + 2) - 0.5) * 0.8, r(i + 3) * Math.PI, 0, Math.PI / 2);
    g.add(m);
  }
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(0.18, 0.02, 4, 10, Math.PI), bone, 0.3, 0.02 + i * 0.001, -0.25 + i * 0.12, 0, -Math.PI / 2, 0));
  g.add(mesh(box(0.2, 0.16, 0.28), bone, -0.32, 0.08, 0.22, 0.6));
  g.add(mesh(box(0.12, 0.08, 0.14), bone, -0.32, 0.06, 0.4, 0.6));
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
