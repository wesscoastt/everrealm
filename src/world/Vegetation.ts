import * as THREE from 'three';
import { B } from './blocks';
import { EX, Layout, LOWER_WEND } from './generate';
import { distToPolyline, fbm2, hash2, smoothstep } from './noise';
import { SX, SZ, Grid, WATER_LEVEL } from './grid';

// Sprite atlas: 15 cells of 32x32 in a 480x32 canvas.
const enum S { Grass, TallGrass, Poppy, Cornflower, Buttercup, Daisy, Wheat, Reed, Kelp, SeaGrass, Berry, Mushroom, Herb, BerryBlue, BerryCloud, Corn, Grape }
const CELLS = 17;

function paintAtlas(): THREE.Texture {
  const c = document.createElement('canvas');
  // Drawn at twice the size it's laid out in (owner 2026-11-14: "improve flat textures like the blackberry bush"): every
  // sprite keeps its 32-unit drawing, at 64 pixels a cell, so leaves, berries and stems read as themselves up close.
  const RES = 2;
  c.width = 32 * CELLS * RES; c.height = 32 * RES;
  const x = c.getContext('2d')!;
  x.scale(RES, RES);
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
  // Forage (game: picked with E): brambles and low bushes in fruit, a clump of mushrooms, a herb in flower
  /** A leaf: a pointed oval in its shade, a darker edge, and a pale midrib. */
  const leaf = (lx: number, ly: number, rot: number, len: number, wid: number, fill: string, edge: string) => {
    x.save(); x.translate(lx, ly); x.rotate(rot);
    x.fillStyle = fill; x.strokeStyle = edge; x.lineWidth = 0.4;
    x.beginPath(); x.moveTo(-len, 0); x.quadraticCurveTo(0, -wid * 1.6, len, 0); x.quadraticCurveTo(0, wid * 1.6, -len, 0); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(220,240,180,0.45)'; x.lineWidth = 0.3; x.beginPath(); x.moveTo(-len * 0.8, 0); x.lineTo(len * 0.8, 0); x.stroke();
    x.restore();
  };
  /** A berry: drupelets for a bramble or a cloudberry, one round fruit with a bloom for a bilberry; a glint of light on it. */
  const berry = (bx: number, by: number, col: string, drupes: boolean, r = 1.5) => {
    x.fillStyle = col;
    if (drupes) for (const [dx, dy] of [[0, 0], [-0.9, 0.5], [0.9, 0.5], [0, 1.1], [-0.5, -0.7], [0.5, -0.7]]) { x.beginPath(); x.arc(bx + dx * r * 0.62, by + dy * r * 0.62, r * 0.55, 0, 7); x.fill(); }
    else { x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill(); x.fillStyle = 'rgba(200,210,240,0.35)'; x.beginPath(); x.arc(bx, by, r * 0.8, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(bx - r * 0.35, by - r * 0.4, r * 0.28, 0, 7); x.fill();
  };
  /** Darken a cell toward its foot, over what's drawn there only: the bush shaded under itself. */
  const shadeFoot = (cell: number, a: number) => {
    x.save(); x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, 8, 0, 32); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(10,20,5,${a})`);
    x.fillStyle = g; x.fillRect(32 * cell, 0, 32, 32); x.restore();
  };
  // A bramble: arching canes, thorns along them, leaves in threes and fives, berries black, red and green on one bush
  {
    const o = 32 * S.Berry;
    for (let i = 0; i < 6; i++) {
      const sx = o + 3 + i * 5, ex = o + 4 + ((i * 11) % 26), top = 6 + (i % 3) * 3;
      x.strokeStyle = i % 2 ? '#6a2e2a' : '#5a3a26'; x.lineWidth = 1.1; x.lineCap = 'round';
      x.beginPath(); x.moveTo(sx, 32); x.quadraticCurveTo((sx + ex) / 2 + (i % 2 ? 6 : -6), top, ex, 14 + (i % 4) * 3); x.stroke();
      x.fillStyle = '#c8a080'; for (let k = 1; k < 4; k++) { const t = k / 4, px = (1 - t) * (1 - t) * sx + 2 * t * (1 - t) * ((sx + ex) / 2 + (i % 2 ? 6 : -6)) + t * t * ex, py = (1 - t) * (1 - t) * 32 + 2 * t * (1 - t) * top + t * t * (14 + (i % 4) * 3); x.fillRect(px, py - 0.9, 0.5, 0.9); }
    }
    const shades = ['#2f5a24', '#3d6e2c', '#4b7f34', '#5a8e3c'];
    for (let k = 0; k < 30; k++) leaf(o + 3 + ((k * 37) % 26), 30 - ((k * 53) % 24), ((k * 1.7) % 3.1) - 1.5, 2.6 + (k % 3) * 0.5, 1.2 + (k % 2) * 0.3, shades[k % 4], '#1e3a16');
    const ripe = ['#1a0c1e', '#2a1030', '#1a0c1e', '#8a1e2a', '#6a8a2a', '#1a0c1e', '#b02a30'];
    for (const [k, [bx, by]] of ([[7, 12], [12, 8], [18, 13], [24, 9], [9, 18], [15, 17], [22, 19], [27, 15], [13, 23], [20, 24], [5, 24]] as const).entries()) berry(o + bx, by, ripe[k % ripe.length], true, 1.5);
    shadeFoot(S.Berry, 0.55);
  }
  // Bilberries: a low wiry shrub, small round leaves, dusky blue berries
  {
    const o = 32 * S.BerryBlue;
    x.strokeStyle = '#4a6a2a'; x.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(o + 4 + i * 3.2, 32); x.lineTo(o + 3 + i * 3.4 + ((i % 3) - 1) * 2, 18 + (i % 3) * 2); x.stroke(); }
    for (let k = 0; k < 26; k++) leaf(o + 3 + ((k * 29) % 26), 31 - ((k * 41) % 14), ((k * 1.3) % 3) - 1.5, 1.6, 1.0, ['#3e7a2e', '#4e8a34', '#5c9a3c'][k % 3], '#24461a');
    for (let k = 0; k < 9; k++) berry(o + 5 + ((k * 19) % 22), 20 + ((k * 13) % 9), k % 4 ? '#2e3a72' : '#46528a', false, 1.3);
    shadeFoot(S.BerryBlue, 0.45);
  }
  // Cloudberries: broad lobed leaves low to the ground, an amber fruit up on a stalk
  {
    const o = 32 * S.BerryCloud;
    for (let k = 0; k < 9; k++) { const lx = o + 4 + ((k * 13) % 24), ly = 28 - (k % 3) * 3; x.fillStyle = ['#4a7a34', '#5a8a3c', '#3e6a2c'][k % 3]; for (let l = 0; l < 5; l++) { x.beginPath(); x.arc(lx + Math.cos(l * 1.25 - 2.5) * 2.2, ly + Math.sin(l * 1.25 - 2.5) * 1.6, 1.7, 0, 7); x.fill(); } }
    for (let k = 0; k < 4; k++) { const fx = o + 7 + k * 6, fy = 13 + (k % 2) * 4; x.strokeStyle = '#5a6a2a'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(fx, 30); x.lineTo(fx, fy); x.stroke(); berry(fx, fy, k % 2 ? '#f0a040' : '#e88a30', true, 1.9); }
    shadeFoot(S.BerryCloud, 0.4);
  }
  // Corn (Verandah's farm, world/mcland.ts): tall stalks, long leaves, a cob or two with its silk (kept to its own
  // cell: the leaves reached over into the cloudberries)
  x.save(); x.beginPath(); x.rect(32 * S.Corn, 0, 32, 32); x.clip();
  for (let i = 0; i < 4; i++) {
    const bx = 4 + i * 7.5;
    blade(32 * S.Corn, bx, 31, (i % 2) * 2 - 1, i % 2 ? '#5a8a2a' : '#6a9a32', 2.6);
    for (let k = 0; k < 3; k++) { const y = 26 - k * 7; x.strokeStyle = '#7aaa3a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(32 * S.Corn + bx, 32 - y); x.quadraticCurveTo(32 * S.Corn + bx + (k % 2 ? 5 : -5), 32 - y - 4, 32 * S.Corn + bx + (k % 2 ? 7 : -7), 32 - y + 3); x.stroke(); }
    x.fillStyle = '#e8c040'; x.fillRect(32 * S.Corn + bx + 1, 13 + (i % 2) * 3, 2.5, 6);
    x.fillStyle = '#c89a3a'; x.fillRect(32 * S.Corn + bx + 1, 11 + (i % 2) * 3, 2, 2);
  }
  x.restore();
  // A grape vine (Verandah's vineyard, across from the winery): a stake and its wire, the vine trained along
  // it in broad leaves, and the bunches hanging dark under them
  {
    const o = 32 * S.Grape;
    x.fillStyle = '#6a4a2a'; x.fillRect(o + 15, 4, 2, 28);
    x.fillStyle = '#5a5048'; x.fillRect(o + 1, 9, 30, 1); x.fillRect(o + 1, 17, 30, 1);
    x.strokeStyle = '#5a3a1e'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(o + 16, 31); x.quadraticCurveTo(o + 10, 22, o + 4, 17); x.moveTo(o + 16, 28); x.quadraticCurveTo(o + 22, 20, o + 28, 10); x.stroke();
    for (const [lx, ly, c] of [[4, 14, '#4a7a2a'], [9, 8, '#5a8a32'], [13, 15, '#3f6a24'], [20, 7, '#5a8a32'], [25, 13, '#4a7a2a'], [28, 6, '#3f6a24'], [7, 19, '#4a7a2a'], [22, 18, '#5a8a32']] as const) { x.fillStyle = c; x.beginPath(); x.arc(o + lx, ly, 3.6, 0, Math.PI * 2); x.fill(); }
    for (const [gx, gy] of [[6, 19], [12, 21], [19, 20], [25, 18], [9, 12]] as const) for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#4a2a5a' : '#5e3a72'; x.beginPath(); x.arc(o + gx + (k % 2) * 2 - 1, gy + Math.floor(k / 2) * 2, 1.4, 0, Math.PI * 2); x.fill(); }
  }
  // Chanterelles: a funnel cap with a wavy rim, ridges running down under it into the stem, lit from above; a little
  // moss at the foot
  {
    const o = 32 * S.Mushroom;
    for (const [mx, my, w, h] of [[8, 22, 5.5, 8], [16, 17, 6.5, 13], [24, 23, 5, 7], [12, 26, 3.6, 5]] as const) {
      const sx = o + mx;
      const st = x.createLinearGradient(sx - 1.5, 0, sx + 1.5, 0); st.addColorStop(0, '#c88a2a'); st.addColorStop(0.5, '#f0b850'); st.addColorStop(1, '#b07820');
      x.fillStyle = st; x.beginPath(); x.moveTo(sx - 1.4, 32); x.lineTo(sx - w * 0.75, my); x.lineTo(sx + w * 0.75, my); x.lineTo(sx + 1.4, 32); x.fill();
      x.strokeStyle = 'rgba(150,90,20,0.6)'; x.lineWidth = 0.35;
      for (let r = -2; r <= 2; r++) { x.beginPath(); x.moveTo(sx + r * w * 0.3, my + 0.4); x.lineTo(sx + r * 0.4, my + h * 0.6); x.stroke(); }
      const cap = x.createLinearGradient(0, my - 2.6, 0, my + 1); cap.addColorStop(0, '#f8c860'); cap.addColorStop(1, '#d08a20');
      x.fillStyle = cap; x.beginPath(); x.moveTo(sx - w, my);
      for (let k = 0; k <= 6; k++) x.lineTo(sx - w + (k * w) / 3, my - 1.8 - (k % 2) * 0.8 - Math.sin((k / 6) * Math.PI) * 1.2);
      x.lineTo(sx + w, my); x.quadraticCurveTo(sx, my + 1.6, sx - w, my); x.fill();
      x.fillStyle = 'rgba(255,240,190,0.55)'; x.beginPath(); x.ellipse(sx - w * 0.3, my - 2.4, w * 0.35, 0.6, 0, 0, 7); x.fill();
    }
    for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#3e6a2a' : '#4e7a32'; x.beginPath(); x.arc(o + 3 + k * 3.7, 31.2, 1.6, 0, 7); x.fill(); }
    shadeFoot(S.Mushroom, 0.35);
  }
  // Wild garlic: broad pointed leaves from the ground, and white starry flowers held up in loose heads
  {
    const o = 32 * S.Herb;
    for (let i = 0; i < 9; i++) {
      const lx = o + 4 + i * 3, lean = ((i * 3) % 5) - 2, h = 9 + (i * 7) % 7;
      x.save(); x.translate(lx, 32); x.rotate(lean * 0.12);
      x.fillStyle = ['#3e7a2e', '#4e8a36', '#5a9a3e'][i % 3]; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-2.4, -h * 0.5, 0, -h); x.quadraticCurveTo(2.4, -h * 0.5, 0, 0); x.fill();
      x.strokeStyle = 'rgba(210,240,180,0.45)'; x.lineWidth = 0.3; x.beginPath(); x.moveTo(0, -0.5); x.lineTo(0, -h + 1); x.stroke();
      x.restore();
    }
    for (const [fx, fy] of [[9, 9], [17, 6], [24, 10]] as const) {
      x.strokeStyle = '#5a8a3a'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(o + fx, 32); x.lineTo(o + fx, fy + 2); x.stroke();
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9, px = o + fx + Math.cos(a) * 2.6, py = fy + Math.sin(a) * 1.8;
        x.fillStyle = '#fbf8ee'; for (let p = 0; p < 6; p++) { const b = (p / 6) * Math.PI * 2; x.beginPath(); x.arc(px + Math.cos(b) * 0.7, py + Math.sin(b) * 0.7, 0.55, 0, 7); x.fill(); }
        x.fillStyle = '#e8e0a0'; x.beginPath(); x.arc(px, py, 0.35, 0, 7); x.fill();
      }
    }
    shadeFoot(S.Herb, 0.4);
  }
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
