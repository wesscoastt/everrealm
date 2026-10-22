import * as THREE from 'three';
import { B } from './blocks';
import { EX, Layout, LOWER_WEND } from './generate';
import { distToPolyline, fbm2, hash2, smoothstep } from './noise';
import { SX, SZ, Grid, WATER_LEVEL } from './grid';

// Sprite atlas: 10 cells of 32x32 in a 320x32 canvas.
const enum S { Grass, TallGrass, Poppy, Cornflower, Buttercup, Daisy, Wheat, Reed, Kelp, SeaGrass }
const CELLS = 10;

function paintAtlas(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 32 * CELLS; c.height = 32;
  const x = c.getContext('2d')!;
  const blade = (ox: number, bx: number, h: number, lean: number, col: string, w = 2) => {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath(); x.moveTo(ox + bx, 32); x.quadraticCurveTo(ox + bx + lean * 0.3, 32 - h * 0.6, ox + bx + lean, 32 - h); x.stroke();
  };
  const grassCols = ['#4f8f2c', '#62a636', '#78bb44', '#8ccf52'];
  // Short grass
  for (let i = 0; i < 14; i++) blade(0, 4 + i * 1.8, 10 + (i * 7) % 9, ((i * 5) % 7) - 3, grassCols[i % 4]);
  // Tall grass
  for (let i = 0; i < 16; i++) blade(32, 3 + i * 1.7, 16 + (i * 11) % 13, ((i * 3) % 9) - 4, grassCols[(i + 1) % 4]);
  const flower = (cell: number, petal: string, centre: string, stems: number) => {
    const ox = cell * 32;
    for (let i = 0; i < 8; i++) blade(ox, 4 + i * 3.4, 8 + (i % 3) * 3, (i % 3) - 1, grassCols[i % 3]);
    for (let s = 0; s < stems; s++) {
      const fx = ox + 7 + s * (18 / Math.max(1, stems - 1)), fy = 8 + (s % 2) * 5;
      blade(ox, fx - ox, 32 - fy, 0, '#3f7a28', 1.5);
      x.fillStyle = petal;
      for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; x.beginPath(); x.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2.2, 0, 7); x.fill(); }
      x.fillStyle = centre; x.beginPath(); x.arc(fx, fy, 1.6, 0, 7); x.fill();
    }
  };
  flower(S.Poppy, '#d8362a', '#2a1a10', 3);
  flower(S.Cornflower, '#4a74d8', '#1e2a6a', 3);
  flower(S.Buttercup, '#f2c51e', '#c8860c', 4);
  flower(S.Daisy, '#ffffff', '#f2c51e', 3);
  // Wheat
  for (let i = 0; i < 9; i++) {
    const bx = 32 * S.Wheat + 3 + i * 3.2;
    blade(32 * S.Wheat, bx - 32 * S.Wheat, 26, (i % 3) - 1, '#b8a040', 1.5);
    x.fillStyle = i % 2 ? '#e2bf52' : '#d4ac3e';
    x.fillRect(bx - 1.5 + ((i % 3) - 1), 3, 3, 9);
  }
  // Reeds
  for (let i = 0; i < 10; i++) {
    const bx = 3 + i * 2.8;
    blade(32 * S.Reed, bx, 22 + (i % 4) * 2, (i % 3) - 1, i % 2 ? '#5e8a3a' : '#749a44', 2);
    if (i % 3 === 0) { x.fillStyle = '#6a4424'; x.fillRect(32 * S.Reed + bx - 1.5, 4 + (i % 4), 3, 7); }
  }
  // Kelp: broad olive ribbons with gas bladders, drawn to be stretched tall up from the sea bed
  for (let i = 0; i < 5; i++) {
    const bx = 4 + i * 6;
    blade(32 * S.Kelp, bx, 30 + (i % 2) * 2, ((i * 3) % 5) - 2, ['#5a6a2a', '#6e7a30', '#4a5a22'][i % 3], 3.5);
    x.fillStyle = '#8a8a3a';
    for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(32 * S.Kelp + bx + ((i * 3) % 5) - 2, 8 + k * 8 + (i % 2) * 3, 1.6, 0, 7); x.fill(); }
  }
  // Sea grass: thin green ribbons in the sandy shallows
  for (let i = 0; i < 12; i++) blade(32 * S.SeaGrass, 3 + i * 2.3, 18 + (i * 7) % 10, ((i * 5) % 7) - 3, i % 2 ? '#3e7a4a' : '#4f8a52', 1.6);
  // Bleed opaque colours into transparent pixels so mipmaps don't fringe the sprites black.
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = new Uint8Array(img.data);
  for (let pass = 0; pass < 4; pass++) {
    const src = d.slice();
    for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
      const i = (py * c.width + px) * 4;
      if (src[i + 3] > 0) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + ox, qy = py + oy;
        if (qx < 0 || qy < 0 || qx >= c.width || qy >= c.height) continue;
        const j = (qy * c.width + qx) * 4;
        if (src[j + 3] > 0 || (src[j] + src[j + 1] + src[j + 2]) > 0) { r += src[j]; g += src[j + 1]; b += src[j + 2]; n++; }
      }
      if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
    }
  }
  // Canvas rows run top-down; flip so v=1 is the top of the sprite.
  const flipped = new Uint8Array(d.length);
  const row = c.width * 4;
  for (let py = 0; py < c.height; py++) flipped.set(d.subarray(py * row, py * row + row), (c.height - 1 - py) * row);
  const t = new THREE.DataTexture(flipped, c.width, c.height, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function crossGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const p: number[] = [], uv: number[] = [], n: number[] = [];
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const dx = Math.cos(a) * 0.5, dz = Math.sin(a) * 0.5;
    p.push(-dx, 0, -dz, dx, 0, dz, dx, 1, dz, -dx, 0, -dz, dx, 1, dz, -dx, 1, -dz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    for (let i = 0; i < 6; i++) n.push(0, 1, 0);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  return g;
}

let sharedMat: THREE.MeshLambertMaterial | null = null;
let sharedGeo: THREE.BufferGeometry | null = null;

/** One grass/flower material shared by the authored vale and every streamed chunk. */
export function vegMaterial(time: { value: number }): THREE.MeshLambertMaterial {
  if (sharedMat) return sharedMat;
    const atlas = paintAtlas();
    sharedMat = new THREE.MeshLambertMaterial({ map: atlas, alphaTest: 0.45, side: THREE.DoubleSide });
    sharedMat!.onBeforeCompile = (s) => {
      s.uniforms.uTime = time;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aCell;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = vec2((uv.x + aCell) / ${CELLS.toFixed(1)}, uv.y);`)
        .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
float w = position.y * position.y;
transformed.x += sin(uTime * 1.9 + ip.x * 0.4 + ip.z * 0.3) * 0.12 * w;
transformed.z += cos(uTime * 1.5 + ip.x * 0.3) * 0.08 * w;`)
        // Grass reads better lit from above regardless of the quad's facing
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
      // Both faces of a blade are lit as if facing the sky (no back-face normal flip).
      s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', 'vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;');
    };

  return sharedMat!;
}

/** Instanced grass for one streamed chunk. data stride: x y z cell scale rot r g b. */
export function buildVegMesh(data: Float32Array, time: { value: number }): THREE.InstancedMesh | null {
  const n = data.length / 9;
  if (!n) return null;
  sharedGeo ??= crossGeometry();
  const mesh = new THREE.InstancedMesh(sharedGeo, vegMaterial(time), n);
  const cells = new Float32Array(n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const o = i * 9, cell = data[o + 3], sc = data[o + 4];
    const tall = cell === 1 || cell === 6 || cell === 7;
    // Kelp's scale is its height in blocks
    if (cell === S.Kelp) s.set(1.1, sc, 1.1);
    else s.set(sc, sc * (tall ? 1.25 : 0.85), sc);
    m.compose(p.set(data[o], data[o + 1], data[o + 2]), q.setFromAxisAngle(up, data[o + 5]), s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setRGB(data[o + 6], data[o + 7], data[o + 8]));
    cells[i] = cell;
  }
  mesh.geometry = sharedGeo.clone();
  mesh.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
  mesh.computeBoundingSphere();
  mesh.receiveShadow = true;
  return mesh;
}

export class Vegetation {
  readonly group = new THREE.Group();
  private material: THREE.MeshLambertMaterial;

  constructor(world: Grid, layout: Layout, time: { value: number }) {
    this.material = vegMaterial(time);
    const region = 80;
    const buckets = new Map<number, { m: THREE.Matrix4; cell: number; color: THREE.Color }[]>();
    const push = (x: number, y: number, z: number, cell: number, scale: number, color: THREE.Color, rot: number) => {
      const key = Math.floor(x / region) + Math.floor(z / region) * 100;
      let list = buckets.get(key);
      if (!list) buckets.set(key, (list = []));
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
        new THREE.Vector3(scale, scale * (cell === S.TallGrass || cell === S.Wheat || cell === S.Reed ? 1.25 : 0.85), scale),
      );
      list.push({ m, cell, color });
    };

    const white = new THREE.Color(1, 1, 1);
    for (let z = 1; z < SZ - 1; z++) for (let x = 1; x < SX - 1; x++) {
      const top = world.topSolid(x, z);
      if (top < 0) continue;
      const id = world.get(x, top, z);
      const above = world.get(x, top + 1, z);
      if (above !== B.Air) continue;
      const ex = layout.exclusion[x + z * SX];
      const r = hash2(x, z, 909);
      const r2 = hash2(x, z, 910);
      const jx = x + 0.2 + r * 0.6, jz = z + 0.2 + r2 * 0.6;

      if (id === B.Farmland) {
        for (let k = 0; k < 2; k++) push(x + 0.25 + k * 0.5, top + 1, z + 0.5 + (r - 0.5) * 0.3, S.Wheat, 1.0 + r * 0.2, white, r * 3);
        continue;
      }
      if (id === B.Sand && top + 1 <= WATER_LEVEL + 1) {
        const dR = distToPolyline(x, z, LOWER_WEND).d;
        if (dR < 8 && r < 0.35) push(jx, top + 1, jz, S.Reed, 1.0 + r2 * 0.4, white, r * 6);
        continue;
      }
      if (id !== B.Grass || ex === EX.Road || ex === EX.Building) continue;
      const tint = new THREE.Color(layout.tint[(z * SX + x) * 3], layout.tint[(z * SX + x) * 3 + 1], layout.tint[(z * SX + x) * 3 + 2]);
      const meadow = fbm2(x / 26, z / 26, 2, 300);
      const wet = smoothstep(26, 8, Math.hypot(x - 200, z - 238));
      const density = 0.2 + meadow * 0.42 + wet * 0.3;
      if (r < density) {
        const tall = r2 < 0.18 + wet * 0.4;
        push(jx, top + 1, jz, tall ? S.TallGrass : S.Grass, 0.9 + r2 * 0.5, tint, r * 6.28);
      }
      // Flower drifts: patches of one species rather than confetti
      const patch = fbm2(x / 11, z / 11, 2, 500);
      if (patch > 0.62 && r2 < 0.45) {
        const species = [S.Poppy, S.Cornflower, S.Buttercup, S.Daisy][Math.floor(fbm2(x / 40, z / 40, 1, 600) * 4) % 4];
        push(x + 0.5 + (r2 - 0.5) * 0.6, top + 1, z + 0.5 + (r - 0.5) * 0.6, species, 0.75 + r * 0.3, white, r2 * 6.28);
      }
    }

    const geo = crossGeometry();
    for (const list of buckets.values()) {
      const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
      const cells = new Float32Array(list.length);
      list.forEach((it, i) => {
        mesh.setMatrixAt(i, it.m);
        mesh.setColorAt(i, it.color);
        cells[i] = it.cell;
      });
      mesh.geometry = geo.clone();
      mesh.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  /** Hide patches far from the player, where their chunks are no longer loaded. */
  update(px: number, pz: number, maxDist: number): void {
    for (const m of this.group.children as THREE.InstancedMesh[]) {
      const s = m.boundingSphere;
      if (s) m.visible = Math.hypot(s.center.x - px, s.center.z - pz) < maxDist + s.radius * 0.5;
    }
  }
}
