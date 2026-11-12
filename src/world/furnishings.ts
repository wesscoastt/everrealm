import * as THREE from 'three';
import { box, cyl, flat, type PropMaterials } from './props';

// The household furniture (owner 2026-11-07: "make more furniture props to use in the MMO"): twenty pieces for a
// house of your own and for the realm's interiors, made at a joiner's bench or an anvil, or bought (data/furnishings.ts).
// Each stands on the floor at y 0, its front toward +z, its footprint in world/interiors.ts FURN_SIZE.

const at = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0): THREE.Mesh => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
};
/** Upholstery and cloth, by the tint a piece was made in. */
const CLOTH = ['#7a2a24', '#2a4a6a', '#3e5a2e', '#8a6a3a'];
const BOOKS = ['#7a2a24', '#2a4a6a', '#3e5a2e', '#6a4a24', '#4a2a4a', '#8a6a3a', '#2a2a2a'];
const hash = (i: number, s: number) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

export function furnishing(M: PropMaterials, kind: string, tint = 0): THREE.Group | null {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => { g.add(at(geo, mat, x, y, z, ry, rx, rz)); };
  const cloth = flat(CLOTH[tint % CLOTH.length]);
  const brass = flat('#c8a050'), ironDark = flat('#3a3a3e'), linen = flat('#e8e0d0'), copper = flat('#9a5630');
  const flame = new THREE.MeshLambertMaterial({ color: '#ffd080', emissive: new THREE.Color('#ffb040'), emissiveIntensity: 1 });
  const legs4 = (w: number, d: number, h: number, t: number, m: THREE.Material) => { for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) for (const z of [-d / 2 + t / 2, d / 2 - t / 2]) add(box(t, h, t), m, x, h / 2, z); };
  switch (kind) {
    case 'f_wardrobe': { // an oak press, two panelled doors, a cornice, bun feet
      add(box(1.16, 1.86, 0.58), M.wood, 0, 1.05, 0);
      add(box(1.26, 0.1, 0.64), M.darkWood, 0, 2.03, 0);
      add(box(1.22, 0.06, 0.62), M.darkWood, 0, 0.14, 0);
      for (const x of [-0.27, 0.27]) {
        add(box(0.5, 1.6, 0.03), M.darkWood, x, 1.05, 0.3);
        for (const y of [0.62, 1.48]) add(box(0.38, 0.62, 0.02), M.wood, x, y, 0.32);
        add(box(0.04, 0.14, 0.04), brass, x > 0 ? 0.04 : -0.04, 1.1, 0.34);
      }
      for (const x of [-0.5, 0.5]) for (const z of [-0.22, 0.22]) add(cyl(0.06, 0.07, 0.1, 8), M.darkWood, x, 0.05, z);
      break;
    }
    case 'f_bookcase': { // floor to head height, five shelves of books, some lying flat
      add(box(1.2, 2.0, 0.06), M.darkWood, 0, 1.0, -0.17);
      for (const x of [-0.57, 0.57]) add(box(0.06, 2.0, 0.4), M.darkWood, x, 1.0, 0);
      for (let s = 0; s < 6; s++) add(box(1.14, 0.05, 0.38), M.wood, 0, 0.06 + s * 0.38, 0);
      add(box(1.28, 0.08, 0.44), M.darkWood, 0, 2.03, 0);
      for (let s = 0; s < 5; s++) {
        let x = -0.5;
        for (let i = 0; x < 0.48 && i < 14; i++) {
          const r = hash(i, s + tint * 7), w = 0.05 + r * 0.05, h = 0.22 + hash(i, s + 3) * 0.1;
          if (r > 0.88) { add(box(0.26, 0.05, 0.22), flat(BOOKS[(i + s) % BOOKS.length]), x + 0.13, 0.11 + s * 0.38, 0.02); x += 0.3; continue; }
          add(box(w, h, 0.26), flat(BOOKS[(i * 3 + s) % BOOKS.length]), x + w / 2, 0.085 + s * 0.38 + h / 2, 0.02, 0, 0, r < 0.08 ? 0.18 : 0);
          x += w + 0.008;
        }
      }
      break;
    }
    case 'f_armchair': { // a wing chair: deep seat, a tall back with wings, rolled arms, turned legs
      legs4(0.8, 0.72, 0.18, 0.07, M.darkWood);
      add(box(0.8, 0.22, 0.74), cloth, 0, 0.29, 0.02);
      add(box(0.66, 0.1, 0.6), cloth, 0, 0.45, 0.06);
      add(box(0.8, 0.86, 0.16), cloth, 0, 0.75, -0.3);
      for (const x of [-0.36, 0.36]) {
        add(box(0.1, 0.24, 0.62), cloth, x, 0.52, 0.04);
        add(cyl(0.07, 0.07, 0.62, 10), cloth, x, 0.66, 0.04, 0, Math.PI / 2);
        add(box(0.08, 0.44, 0.3), cloth, x, 0.94, -0.2);
      }
      add(cyl(0.4, 0.4, 0.16, 12, ), cloth, 0, 1.17, -0.3, 0, Math.PI / 2);
      break;
    }
    case 'f_settle': { // a high-backed settle, a cushion along the seat
      add(box(1.76, 0.08, 0.5), M.wood, 0, 0.46, 0);
      add(box(1.76, 0.42, 0.06), M.darkWood, 0, 0.21, 0.22);
      add(box(1.76, 1.3, 0.08), M.darkWood, 0, 0.85, -0.22);
      for (const x of [-0.86, 0.86]) { add(box(0.08, 1.3, 0.52), M.darkWood, x, 0.65, 0); add(box(0.1, 0.06, 0.56), M.wood, x, 1.32, 0); }
      for (let i = 0; i < 4; i++) add(box(0.36, 0.5, 0.02), M.wood, -0.6 + i * 0.4, 1.0, -0.17);
      add(box(1.6, 0.08, 0.42), cloth, 0, 0.54, 0.02);
      break;
    }
    case 'f_roundtable': { // a round oak table on a turned pedestal and three claw feet
      add(cyl(0.58, 0.58, 0.06, 18), M.wood, 0, 0.78, 0);
      add(cyl(0.56, 0.56, 0.04, 18), M.darkWood, 0, 0.73, 0);
      add(cyl(0.07, 0.11, 0.62, 10), M.darkWood, 0, 0.4, 0);
      add(cyl(0.14, 0.1, 0.12, 10), M.darkWood, 0, 0.12, 0);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(box(0.06, 0.06, 0.4), M.darkWood, Math.sin(a) * 0.2, 0.05, Math.cos(a) * 0.2, a); }
      add(cyl(0.1, 0.12, 0.03, 12), linen, 0.1, 0.82, 0.05);
      break;
    }
    case 'f_washstand': { // a stand with a bowl let into its top, the jug in the bowl, a towel on the rail
      legs4(0.76, 0.46, 0.78, 0.05, M.wood);
      add(box(0.78, 0.05, 0.48), M.wood, 0, 0.8, 0);
      add(box(0.7, 0.04, 0.4), M.wood, 0, 0.22, 0);
      add(box(0.78, 0.22, 0.04), M.wood, 0, 0.93, -0.22);
      add(cyl(0.2, 0.13, 0.1, 14), M.paper, 0, 0.86, 0.02);
      add(cyl(0.06, 0.08, 0.24, 10), flat('#c8d4dc'), 0.06, 1.0, 0.04);
      add(box(0.03, 0.06, 0.03), flat('#c8d4dc'), 0.06, 1.1, 0.12);
      add(cyl(0.015, 0.015, 0.7, 6), M.wood, 0, 0.7, 0.26, 0, 0, Math.PI / 2);
      add(box(0.3, 0.32, 0.02), linen, -0.18, 0.56, 0.27);
      add(cyl(0.06, 0.05, 0.1, 10), M.clay, -0.2, 0.29, 0);
      break;
    }
    case 'f_cradle': { // a hooded cradle on rockers, a quilt
      for (const x of [-0.3, 0.3]) add(new THREE.TorusGeometry(0.5, 0.03, 4, 12, Math.PI / 2.2), M.darkWood, x, 0.52, 0, Math.PI / 2, 0, -Math.PI / 2 - Math.PI / 4.4);
      add(box(0.6, 0.3, 0.86), M.wood, 0, 0.3, 0);
      add(box(0.52, 0.04, 0.78), linen, 0, 0.42, 0);
      add(box(0.54, 0.06, 0.5), cloth, 0, 0.44, 0.12);
      add(box(0.64, 0.4, 0.06), M.wood, 0, 0.62, -0.42);
      add(box(0.64, 0.05, 0.3), M.wood, 0, 0.82, -0.28, 0, -0.35);
      for (const x of [-0.31, 0.31]) add(box(0.04, 0.24, 0.3), M.wood, x, 0.66, -0.3);
      break;
    }
    case 'f_coatrack': { // a coat stand: a cloak hung on it, a hat on a peg, a stick leaning
      add(cyl(0.035, 0.05, 1.8, 8), M.darkWood, 0, 0.9, 0);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(box(0.04, 0.05, 0.36), M.darkWood, Math.sin(a) * 0.16, 0.03, Math.cos(a) * 0.16, a); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; add(cyl(0.015, 0.015, 0.2, 5), M.darkWood, Math.sin(a) * 0.08, 1.7, Math.cos(a) * 0.08, a, 0.9); }
      add(cyl(0.08, 0.22, 1.0, 8, ), cloth, 0.02, 1.1, 0.08, 0, 0.08);
      add(cyl(0.12, 0.12, 0.1, 10), flat('#2a2420'), -0.14, 1.78, -0.06);
      add(cyl(0.2, 0.2, 0.015, 12), flat('#2a2420'), -0.14, 1.73, -0.06);
      add(cyl(0.02, 0.02, 0.9, 6), M.wood, 0.2, 0.44, 0.1, 0, 0.12, -0.12);
      break;
    }
    case 'f_plant': { // a fern in a glazed pot on a little stand
      add(cyl(0.16, 0.12, 0.3, 10), M.glaze, 0, 0.35, 0);
      add(cyl(0.17, 0.17, 0.04, 10), M.glaze, 0, 0.5, 0);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(cyl(0.02, 0.02, 0.22, 5), M.darkWood, Math.sin(a) * 0.12, 0.1, Math.cos(a) * 0.12); }
      add(cyl(0.15, 0.15, 0.02, 10), flat('#3a2a1e'), 0, 0.5, 0);
      const fern = flat('#4a7a3a', { side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + hash(i, tint) * 0.4; add(new THREE.PlaneGeometry(0.12, 0.5), fern, Math.sin(a) * 0.12, 0.72, Math.cos(a) * 0.12, a, 0.6 + hash(i, 2) * 0.4); }
      break;
    }
    case 'f_candelabra': { // a standing iron candelabra: three arms, five candles lit
      add(cyl(0.025, 0.04, 1.4, 6), ironDark, 0, 0.7, 0);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(box(0.04, 0.04, 0.32), ironDark, Math.sin(a) * 0.14, 0.03, Math.cos(a) * 0.14, a); }
      add(box(0.6, 0.03, 0.03), ironDark, 0, 1.38, 0);
      add(box(0.03, 0.03, 0.6), ironDark, 0, 1.3, 0);
      for (const [x, z, y] of [[0, 0, 1.46], [-0.3, 0, 1.4], [0.3, 0, 1.4], [0, -0.3, 1.32], [0, 0.3, 1.32]]) {
        add(cyl(0.05, 0.05, 0.02, 8), ironDark, x, y - 0.06, z);
        add(cyl(0.025, 0.025, 0.14, 6), linen, x, y + 0.02, z);
        add(new THREE.SphereGeometry(0.025, 6, 5), flame, x, y + 0.11, z);
      }
      break;
    }
    case 'f_bathtub': { // a copper slipper bath on claw feet, the high end to the back
      add(box(1.36, 0.08, 0.66), copper, 0, 0.19, 0);                         // the floor of it
      for (const z of [-0.33, 0.33]) add(box(1.44, 0.5, 0.05), copper, 0, 0.42, z); // the sides
      add(box(0.05, 0.5, 0.7), copper, 0.7, 0.42, 0);
      add(box(0.05, 0.78, 0.7), copper, -0.7, 0.56, 0);                         // the high end
      add(box(1.32, 0.04, 0.6), flat('#8ab8c8'), 0, 0.5, 0);                    // the water
      for (const z of [-0.35, 0.35]) add(cyl(0.035, 0.035, 1.46, 8), brass, 0, 0.68, z, 0, 0, Math.PI / 2); // the rolled lip
      add(cyl(0.035, 0.035, 0.72, 8), brass, 0.71, 0.68, 0, 0, Math.PI / 2);
      add(cyl(0.035, 0.035, 0.72, 8), brass, -0.71, 0.95, 0, 0, Math.PI / 2);
      for (const x of [-0.58, 0.58]) for (const z of [-0.26, 0.26]) add(cyl(0.05, 0.04, 0.16, 6), brass, x, 0.08, z);
      add(box(0.3, 0.04, 0.24), linen, 0.62, 0.7, 0.18, 0, 0, 0.3);
      break;
    }
    case 'f_spinning': { // a spinning wheel: the wheel on its posts, the treadle, the flyer, a skein on the stool beside
      add(box(0.9, 0.08, 0.2), M.wood, 0, 0.36, 0, 0, 0, -0.12);
      for (const [x, z] of [[-0.38, -0.1], [-0.38, 0.1], [0.36, 0]]) add(cyl(0.025, 0.03, 0.38, 6), M.darkWood, x, 0.18, z);
      for (const z of [-0.07, 0.07]) add(cyl(0.02, 0.02, 0.5, 6), M.darkWood, -0.18, 0.62, z);
      add(new THREE.TorusGeometry(0.34, 0.025, 5, 20), M.darkWood, -0.18, 0.78, 0);
      for (let i = 0; i < 8; i++) add(box(0.015, 0.66, 0.015), M.wood, -0.18, 0.78, 0, 0, 0, (i / 8) * Math.PI);
      add(cyl(0.05, 0.05, 0.06, 8), M.darkWood, -0.18, 0.78, 0, 0, Math.PI / 2);
      for (const x of [0.26, 0.4]) add(cyl(0.02, 0.02, 0.3, 6), M.darkWood, x, 0.55, 0);
      add(cyl(0.05, 0.05, 0.18, 8), flat('#e8dcc0'), 0.33, 0.64, 0, 0, 0, Math.PI / 2);
      add(box(0.3, 0.02, 0.14), M.wood, -0.1, 0.06, 0.12, 0, 0.3);
      break;
    }
    case 'f_weaponrack': { // a wall rack: two spears, a sword, a round shield, a bow
      add(box(1.36, 0.08, 0.3), M.darkWood, 0, 0.06, 0);
      add(box(1.36, 0.08, 0.08), M.darkWood, 0, 1.46, -0.1);
      add(box(1.36, 0.06, 0.2), M.darkWood, 0, 0.5, -0.04);
      for (const x of [-0.64, 0.64]) add(box(0.08, 1.5, 0.08), M.darkWood, x, 0.75, -0.1);
      for (const x of [-0.42, -0.18]) { add(cyl(0.02, 0.02, 1.7, 6), M.wood, x, 0.92, -0.02); add(new THREE.ConeGeometry(0.04, 0.2, 4), M.iron, x, 1.86, -0.02); }
      add(box(0.06, 1.0, 0.015), M.iron, 0.08, 0.86, -0.02); add(box(0.24, 0.04, 0.05), brass, 0.08, 0.36, -0.02); add(box(0.04, 0.24, 0.04), flat('#3a2418'), 0.08, 0.22, -0.02);
      add(cyl(0.26, 0.26, 0.04, 14), cloth, 0.42, 0.9, 0.0, 0, Math.PI / 2); add(cyl(0.07, 0.07, 0.06, 10), M.iron, 0.42, 0.9, 0.03, 0, Math.PI / 2);
      add(new THREE.TorusGeometry(0.5, 0.015, 4, 14, Math.PI * 0.8), M.wood, 0.3, 0.86, -0.08, 0, 0, Math.PI * 0.6);
      break;
    }
    case 'f_armourstand': { // a stand of mail and a helm on it, the shoulders squared, gauntlets at its foot
      const mail = flat('#a8acb4'), plate = flat('#c8ccd4');
      add(box(0.6, 0.06, 0.5), M.darkWood, 0, 0.03, 0);
      add(cyl(0.035, 0.035, 1.3, 6), M.darkWood, 0, 0.7, 0);
      add(box(0.56, 0.06, 0.08), M.darkWood, 0, 1.34, 0);
      add(cyl(0.2, 0.22, 0.62, 10), mail, 0, 1.06, 0);
      add(cyl(0.24, 0.26, 0.18, 10), mail, 0, 0.7, 0);
      for (const x of [-0.27, 0.27]) add(new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), plate, x, 1.32, 0);
      add(cyl(0.21, 0.2, 0.06, 10), cloth, 0, 0.84, 0);
      add(box(0.36, 0.5, 0.06), cloth, 0, 1.0, 0.2);
      add(new THREE.SphereGeometry(0.15, 10, 8), plate, 0, 1.56, 0);
      add(box(0.3, 0.05, 0.04), ironDark, 0, 1.56, 0.14);
      add(box(0.04, 0.16, 0.04), plate, 0, 1.5, 0.15);
      for (const x of [-0.12, 0.12]) add(box(0.1, 0.06, 0.16), plate, x, 0.09, 0.14, x * 2);
      break;
    }
    case 'f_cupboard': { // a pie safe: a cupboard on legs, punched tin panels in its doors, crocks on top
      legs4(0.96, 0.48, 0.2, 0.06, M.darkWood);
      add(box(0.96, 1.2, 0.48), M.wood, 0, 0.8, 0);
      add(box(1.02, 0.06, 0.52), M.darkWood, 0, 1.43, 0);
      for (const x of [-0.23, 0.23]) {
        add(box(0.42, 0.9, 0.02), M.darkWood, x, 0.9, 0.25);
        for (const y of [0.68, 1.1]) add(box(0.3, 0.3, 0.015), flat('#a8a8a0'), x, y, 0.265);
        add(box(0.03, 0.08, 0.03), ironDark, x > 0 ? 0.03 : -0.03, 0.92, 0.27);
      }
      add(box(0.9, 0.18, 0.02), M.darkWood, 0, 0.32, 0.25);
      add(cyl(0.09, 0.08, 0.18, 10), M.clay, -0.25, 1.55, 0); add(cyl(0.07, 0.06, 0.13, 10), M.glaze, 0.0, 1.53, 0.02); add(cyl(0.11, 0.1, 0.14, 10), M.clay, 0.26, 1.53, -0.02);
      break;
    }
    case 'f_sideboard': { // a long low sideboard: three drawers over three doors, two candlesticks and a bowl on top
      add(box(1.76, 0.82, 0.5), M.darkWood, 0, 0.47, 0);
      add(box(1.84, 0.05, 0.56), M.wood, 0, 0.9, 0);
      for (const x of [-0.58, 0, 0.58]) {
        add(box(0.52, 0.16, 0.02), M.wood, x, 0.76, 0.26); add(box(0.08, 0.03, 0.03), brass, x, 0.76, 0.28);
        add(box(0.52, 0.5, 0.02), M.wood, x, 0.36, 0.26); add(cyl(0.02, 0.02, 0.03, 6), brass, x + 0.18, 0.4, 0.28, 0, Math.PI / 2);
      }
      for (const x of [-0.82, 0.82]) add(box(0.06, 0.08, 0.5), M.darkWood, x, 0.04, 0);
      for (const x of [-0.6, 0.6]) { add(cyl(0.06, 0.07, 0.03, 8), brass, x, 0.94, 0); add(cyl(0.02, 0.025, 0.24, 6), brass, x, 1.06, 0); add(cyl(0.022, 0.022, 0.16, 6), linen, x, 1.26, 0); add(new THREE.SphereGeometry(0.022, 6, 5), flame, x, 1.36, 0); }
      add(cyl(0.18, 0.1, 0.08, 12), M.glaze, 0, 0.96, 0);
      for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.05, 8, 6), flat(['#c83a2a', '#e0b040', '#7aa83a'][i]), -0.05 + i * 0.05, 1.01, (i - 1) * 0.03);
      break;
    }
    case 'f_bunk': { // two beds, one over the other, a ladder up the end
      for (const y of [0.2, 1.2]) {
        add(box(0.98, 0.16, 1.98), M.wood, 0, y + 0.1, 0);
        add(box(0.9, 0.14, 1.6), linen, 0, y + 0.25, 0.12);
        add(box(0.94, 0.08, 1.1), cloth, 0, y + 0.33, 0.38);
        add(box(0.5, 0.1, 0.3), linen, 0, y + 0.36, -0.74);
      }
      for (const x of [-0.46, 0.46]) for (const z of [-0.96, 0.96]) add(box(0.08, 1.9, 0.08), M.darkWood, x, 0.95, z);
      add(box(0.98, 0.3, 0.06), M.darkWood, 0, 1.75, -0.96);
      for (let i = 0; i < 5; i++) add(box(0.04, 0.04, 0.3), M.darkWood, 0.5, 0.3 + i * 0.3, 0.8);
      add(box(0.04, 1.6, 0.04), M.darkWood, 0.5, 0.8, 0.66); add(box(0.04, 1.6, 0.04), M.darkWood, 0.5, 0.8, 0.94);
      break;
    }
    case 'f_bureau': { // a writing bureau: the slope let down for a desk, pigeonholes, papers, a quill in its pot
      add(box(0.96, 0.78, 0.5), M.darkWood, 0, 0.43, -0.02);
      for (const y of [0.22, 0.48, 0.72]) { add(box(0.9, 0.2, 0.02), M.wood, 0, y, 0.24); add(cyl(0.025, 0.025, 0.03, 6), brass, 0, y, 0.26, 0, Math.PI / 2); }
      add(box(0.96, 0.38, 0.3), M.darkWood, 0, 1.0, -0.12);
      for (let i = 0; i < 6; i++) add(box(0.12, 0.12, 0.02), flat('#1e1612'), -0.36 + i * 0.145, 1.06, 0.035);
      add(box(0.9, 0.03, 0.4), M.wood, 0, 0.84, 0.22);
      add(box(0.3, 0.005, 0.22), M.paper, -0.12, 0.86, 0.24, 0.2); add(box(0.24, 0.005, 0.18), M.paper, 0.1, 0.865, 0.26, -0.1);
      add(cyl(0.035, 0.03, 0.07, 8), flat('#1e1a16'), 0.32, 0.89, 0.2); add(box(0.01, 0.26, 0.04), linen, 0.33, 1.02, 0.2, 0, 0, -0.25);
      break;
    }
    case 'f_logbasket': { // a basket of split logs for the fire, kindling on top
      add(cyl(0.3, 0.26, 0.36, 12), flat('#9a7a4a'), 0, 0.18, 0);
      add(new THREE.TorusGeometry(0.3, 0.02, 4, 16), flat('#7a5a32'), 0, 0.36, 0, 0, Math.PI / 2);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(cyl(0.06, 0.06, 0.62, 6), M.bark, Math.sin(a) * 0.14, 0.42, Math.cos(a) * 0.12, a, Math.PI / 2 + 0.15, 0); }
      for (let i = 0; i < 4; i++) add(cyl(0.015, 0.015, 0.5, 4), M.wood, -0.1 + i * 0.07, 0.55, 0.02, 0.4 * i, Math.PI / 2, 0);
      break;
    }
    case 'f_globe': { // a terrestrial globe in a brass ring on a turned stand
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(box(0.05, 0.05, 0.34), M.darkWood, Math.sin(a) * 0.14, 0.03, Math.cos(a) * 0.14, a); }
      add(cyl(0.04, 0.06, 0.6, 8), M.darkWood, 0, 0.34, 0);
      add(new THREE.TorusGeometry(0.3, 0.02, 4, 24), brass, 0, 0.98, 0, 0, 0, 0.4);
      const sea = new THREE.MeshLambertMaterial({ map: globeTexture() });
      add(new THREE.SphereGeometry(0.27, 18, 12), sea, 0, 0.98, 0, 0.6, 0, 0.4);
      add(cyl(0.12, 0.08, 0.06, 8), brass, 0, 0.67, 0);
      break;
    }
    default: return null;
  }
  return g;
}

let globeTex: THREE.CanvasTexture | null = null;
/** The globe's paper: a blue sea with the continents in buff, a few lines of latitude. */
function globeTexture(): THREE.CanvasTexture {
  if (globeTex) return globeTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#3a6a8a'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#d8c08a';
  for (const [cx, cy, rx, ry] of [[20, 22, 12, 9], [34, 40, 8, 12], [62, 20, 16, 8], [70, 36, 9, 10], [100, 26, 14, 11], [108, 46, 7, 5], [50, 56, 30, 4]]) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0.3, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = 'rgba(255,255,240,0.35)'; x.lineWidth = 1;
  for (const y of [16, 32, 48]) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); }
  globeTex = new THREE.CanvasTexture(c); globeTex.colorSpace = THREE.SRGBColorSpace;
  return globeTex;
}
