import * as THREE from 'three';
import * as P from './props';
import type { RegionId } from './terrain';
export { HOLLIN_SHRINE, SHRINE_RUNE, SHRINE_SOLID } from './shrineData';

// Waymark shrines: each region carves its own. A shrine stands on a 7 by 7 patch of clear ground,
// its middle at the patch's centre; the glowing rune is added by the game (Waymarks.ts), brighter
// once you've attuned to it. Shrines face +z before turning; SHRINE_SOLID says which cells are
// solid (as offsets for that facing) so nobody walks through a pillar.

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
};
const box = (w: number, h: number, d: number) => P.box(w, h, d);
const cyl = (r0: number, r1: number, h: number, seg = 8) => P.cyl(r0, r1, h, seg);

/** A shrine's carved body (no rune): origin on the ground at the middle of its patch. */
export function waymarkShrine(M: P.PropMaterials, theme: RegionId): THREE.Group {
  const g = new THREE.Group();
  const add = (o: THREE.Object3D) => g.add(o);
  const flat = P.flat;
  // Every shrine stands on a two-step round dais
  const dais = (outer: THREE.Material, inner: THREE.Material) => {
    add(mesh(cyl(2.7, 2.8, 0.22, 12), outer, 0, 0.11, 0));
    add(mesh(cyl(1.85, 1.95, 0.2, 12), inner, 0, 0.32, 0));
  };
  switch (theme) {
    case 'greenwake': {
      // The Hollin stone: a tapering menhir in three rough courses, crowned with holly, moss up its
      // north face, four lesser stones round it and a lantern either side of the way in
      dais(M.cobble, flat('#7a8a5a'));
      const grey = flat('#a39f93'), dark = flat('#8c887c'), cut = flat('#5c594f');
      add(mesh(box(1.04, 1.3, 0.84), grey, 0, 0.42 + 0.65, 0, 0.12));
      add(mesh(box(0.92, 1.2, 0.76), grey, 0, 0.42 + 1.9, 0, 0.12));
      add(mesh(box(0.8, 1.0, 0.66), dark, 0, 0.42 + 3.0, 0, 0.12));
      for (const y of [1.66, 2.55, 3.4]) add(mesh(box(0.96 - (y - 1.6) * 0.1, 0.05, 0.8 - (y - 1.6) * 0.1), cut, 0, y, 0, 0.12));
      add(mesh(box(1.06, 0.8, 0.32), flat('#5f7a3a'), 0.02, 0.9, -0.3, 0.12));
      add(mesh(box(0.7, 0.5, 0.3), flat('#6e8a44'), -0.05, 1.5, -0.3, 0.12));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        add(mesh(box(0.42, 0.34, 0.42), flat(i % 2 ? '#2f5a2a' : '#3e6e30'), Math.cos(a) * 0.46, 4.05 + (i % 3) * 0.08, Math.sin(a) * 0.38, a));
      }
      for (let i = 0; i < 5; i++) add(mesh(box(0.1, 0.1, 0.1), flat('#c8242a'), Math.cos(i * 1.3) * 0.4, 4.32, Math.sin(i * 1.3) * 0.35));
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        add(mesh(box(0.46, 1.3, 0.36), i % 2 ? grey : dark, Math.cos(a) * 2.25, 0.62, Math.sin(a) * 2.25, a, 0, (i % 2 ? -1 : 1) * 0.08));
      }
      for (const x of [-1.5, 1.5]) {
        add(mesh(box(0.16, 2.3, 0.16), M.darkWood, x, 1.15, 2.35));
        add(mesh(box(0.5, 0.1, 0.1), M.darkWood, x + Math.sign(x) * -0.18, 2.25, 2.35));
        add(mesh(box(0.3, 0.36, 0.3), M.glow, x - Math.sign(x) * 0.36, 1.95, 2.35));
        add(mesh(box(0.36, 0.06, 0.36), M.iron, x - Math.sign(x) * 0.36, 2.16, 2.35));
      }
      break;
    }
    case 'crownroad': {
      // The Charter's obelisk: a stepped plinth, a pale needle with a bronze cap, bollards and banners
      add(mesh(box(4.8, 0.3, 4.8), M.cobble, 0, 0.15, 0));
      add(mesh(box(3.4, 0.3, 3.4), flat('#cfc6b0'), 0, 0.45, 0));
      add(mesh(box(1.9, 0.7, 1.9), flat('#d8d0bc'), 0, 0.95, 0));
      add(mesh(box(0.92, 4.2, 0.92), flat('#e4dcc8'), 0, 1.3 + 2.1, 0));
      add(mesh(new THREE.ConeGeometry(0.72, 0.9, 4), M.bronze, 0, 5.85, 0, Math.PI / 4));
      for (const [x, z] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
        add(mesh(cyl(0.16, 0.2, 0.8), flat('#cfc6b0'), x, 0.7, z));
        add(mesh(new THREE.SphereGeometry(0.16, 8, 6), M.bronze, x, 1.18, z));
      }
      for (const x of [-1.6, 1.6]) {
        add(mesh(cyl(0.06, 0.07, 3.6), M.darkWood, x, 1.8, 1.9));
        add(mesh(box(0.06, 1.4, 0.9), M.clothBlue, x, 2.7, 1.9 + 0.48));
        add(mesh(box(0.07, 0.3, 0.92), M.bronze, x, 3.45, 1.9 + 0.48));
      }
      break;
    }
    case 'brambledeep': {
      // The root arch: two roots twisting up from the dais to meet overhead, moss hanging, a heartstone
      dais(flat('#3e3426'), flat('#4a5a32'));
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
        const t = i / 6, a = t * Math.PI * 0.5;
        const x = side * (2.0 - Math.sin(a) * 1.75), y = 0.4 + Math.sin(t * Math.PI * 0.5) * 3.9;
        add(mesh(box(0.62 - t * 0.18, 0.95, 0.6 - t * 0.16), M.bark, x, y, (i % 2 ? 0.08 : -0.06) * side, i * 0.4 * side, 0, side * a * 0.9));
      }
      add(mesh(box(0.7, 0.5, 0.6), M.bark, 0, 4.4, 0, 0.3));
      for (let i = 0; i < 6; i++) add(mesh(box(0.08, 0.8 + (i % 3) * 0.4, 0.08), flat('#5f7a3a'), -1.2 + i * 0.48, 3.4 - (i % 3) * 0.2, 0.15));
      add(mesh(box(0.9, 0.7, 0.8), flat('#5a6a4a'), 0, 0.75, 0, 0.6, 0.1));
      for (let i = 0; i < 5; i++) add(mesh(box(0.5, 0.18, 0.18), M.bark, Math.cos(i * 1.25) * 1.9, 0.5, Math.sin(i * 1.25) * 1.9, i * 1.25));
      break;
    }
    case 'saltwind': {
      // The beacon: a white column striped red, a lantern cage on top under a red cap, rope and anchor
      dais(flat('#d8d4c8'), flat('#b8c4c8'));
      add(mesh(cyl(0.44, 0.52, 3.6, 10), flat('#efece4'), 0, 0.42 + 1.8, 0));
      for (const y of [1.2, 2.9]) add(mesh(cyl(0.53, 0.53, 0.3, 10), flat('#b03a2e'), 0, y, 0));
      for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) add(mesh(box(0.06, 0.7, 0.06), M.iron, x, 4.4, z));
      add(mesh(box(0.55, 0.5, 0.55), M.glow, 0, 4.35, 0));
      add(mesh(new THREE.ConeGeometry(0.75, 0.6, 8), M.roofRed, 0, 5.05, 0));
      add(mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 14), M.rope, 1.6, 0.55, 0.9, 0, Math.PI / 2));
      add(mesh(box(0.12, 1.5, 0.12), M.iron, -1.7, 1.0, 0.8, 0, 0, 0.35));
      add(mesh(box(0.9, 0.12, 0.12), M.iron, -1.95, 0.35, 0.8, 0, 0, 0.35));
      break;
    }
    case 'redstone': {
      // The assay pillar: terracotta steps, a sandstone shaft bound in copper, a miner's lamp on top
      add(mesh(box(4.6, 0.3, 4.6), flat('#b8673a'), 0, 0.15, 0));
      add(mesh(box(3.2, 0.3, 3.2), flat('#c47a46'), 0, 0.45, 0));
      add(mesh(box(2.0, 0.3, 2.0), flat('#d08a52'), 0, 0.75, 0));
      add(mesh(box(1.0, 3.4, 1.0), flat('#dcae74'), 0, 0.9 + 1.7, 0));
      for (const y of [1.4, 3.4, 4.1]) add(mesh(box(1.12, 0.18, 1.12), flat('#b87333'), 0, y, 0));
      add(mesh(box(0.5, 0.5, 0.5), M.glow, 0, 4.6, 0));
      add(mesh(box(0.7, 0.1, 0.7), flat('#b87333'), 0, 4.9, 0));
      add(mesh(box(0.08, 1.4, 0.08), M.darkWood, 1.3, 1.4, 1.2, 0, 0, -0.3));
      add(mesh(box(0.6, 0.12, 0.12), M.iron, 1.55, 2.05, 1.2, 0, 0, -0.3));
      break;
    }
    case 'starfall': {
      // The shardstone: tall ice-blue crystals bursting from a basalt foot
      dais(flat('#3a3e46'), flat('#4a505a'));
      const ice = new THREE.MeshLambertMaterial({ color: '#a8e4ff', emissive: new THREE.Color('#2a6a8a'), transparent: true, opacity: 0.88 });
      add(mesh(box(1.2, 0.8, 1.2), flat('#2e3238'), 0, 0.8, 0, 0.4));
      for (const [x, z, h, tx, tz] of [[0, 0, 4.6, 0, 0], [-0.7, 0.2, 3.2, 0, 0.32], [0.65, -0.1, 3.6, 0.1, -0.3], [0.1, -0.7, 2.6, -0.3, 0], [-0.2, 0.7, 2.2, 0.3, 0.1]]) {
        add(mesh(box(0.42, h, 0.42), ice, x, 0.9 + h / 2, z, 0.6, tx, tz));
      }
      break;
    }
    case 'gannet': {
      // The chalk gate: two white uprights and a lintel, a gull turning on top
      dais(flat('#e8e4d6'), flat('#d4d8c0'));
      for (const x of [-1.3, 1.3]) add(mesh(box(0.85, 3.5, 0.85), flat('#ece8da'), x, 0.42 + 1.75, 0));
      add(mesh(box(3.7, 0.65, 0.95), flat('#e0dccc'), 0, 4.25, 0));
      add(mesh(box(0.5, 0.18, 0.18), flat('#f4f4f0'), 0, 4.75, 0));
      add(mesh(box(0.12, 0.05, 1.0), flat('#f4f4f0'), 0, 4.8, 0, 0, 0.1));
      add(mesh(box(0.14, 0.12, 0.12), flat('#e0a030'), 0.3, 4.76, 0));
      break;
    }
    case 'wrath': {
      // The marsh post: a carved willow post on a peat mound ringed with reeds, two lanterns on its arm
      add(mesh(cyl(2.6, 2.9, 0.5, 12), flat('#4a3a28'), 0, 0.25, 0));
      add(mesh(cyl(0.34, 0.4, 4.0, 8), M.bark, 0, 0.5 + 2.0, 0));
      for (const y of [1.3, 3.0]) add(mesh(box(0.5, 0.3, 0.5), M.darkWood, 0, y, 0, Math.PI / 4));
      add(mesh(box(2.2, 0.16, 0.16), M.darkWood, 0, 3.9, 0));
      for (const x of [-1.0, 1.0]) { add(mesh(box(0.05, 0.4, 0.05), M.iron, x, 3.6, 0)); add(mesh(box(0.3, 0.36, 0.3), M.glow, x, 3.25, 0)); }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        add(mesh(box(0.08, 0.9 + (i % 3) * 0.25, 0.08), flat(i % 2 ? '#8a9a4a' : '#a8a860'), Math.cos(a) * 2.5, 0.9, Math.sin(a) * 2.5, 0, 0.1, (i % 2 ? 0.12 : -0.1)));
      }
      break;
    }
    case 'tolmen': {
      // The holed stone: a granite ring standing on edge on a tor of boulders
      for (const [x, z, s] of [[-0.9, 0.3, 1.1], [0.8, -0.2, 1.0], [0.1, 0.8, 0.9], [-0.3, -0.8, 0.95], [1.6, 0.9, 0.7], [-1.7, -0.7, 0.75]]) add(mesh(box(s, s * 0.7, s), flat('#8a8680'), x, s * 0.35, z, x * 0.7));
      add(mesh(new THREE.TorusGeometry(1.05, 0.48, 8, 18), flat('#9a948a'), 0, 2.3, 0));
      for (const x of [-0.85, 0.85]) add(mesh(box(0.7, 0.9, 0.7), flat('#7e7a72'), x, 1.0, 0, 0.2));
      break;
    }
  }
  return g;
}
