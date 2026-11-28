import * as THREE from 'three';
import type { Appearance } from '../entities/humanoid';

// The arms you see in first person (owner 2026-11-27, docs/briefs/first-person-arms.md: "properly constructed voxel-style
// arms ... wrists, hands, fingers ... armor or clothing transitions"; "the right hand must visibly grip the weapon handle";
// "first-person arms must reflect the character's currently equipped equipment"). One arm, built in blocks the way the
// figures are, in the frame the view holds it in:
//   +Y runs back up the forearm from the wrist to the elbow (the view points it at the elbow, out of frame);
//   +Z runs along the handle of what the hand holds, through the middle of the fist (the blade's way), and for the open
//   hand is the way the palm faces;
//   +X is the back of the hand for the right arm (side 1); the left (side -1) is its mirror.
// What it's dressed in comes from the figure's own look: a cloth sleeve and cuff, or a leather bracer laced in three straps
// over the sleeve with fingerless gloves, or a plate vambrace in three lames with an elbow cop and a gauntlet; gloves where
// the look has them, the skin where it hasn't. Shades vary a touch from block to block, as the world's own do.

export type ArmKind = 'cloth' | 'leather' | 'plate';
export interface ArmParts { arm: THREE.Group; closed: THREE.Group; open: THREE.Group }

const mats = new Map<string, THREE.MeshLambertMaterial>();
function mat(c: string): THREE.MeshLambertMaterial {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); }
  return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
/** A colour a shade lighter (k > 1) or darker. */
export function shadeOf(c: string, k: number): string {
  const col = new THREE.Color(c);
  col.r = Math.min(1, col.r * k); col.g = Math.min(1, col.g * k); col.b = Math.min(1, col.b * k);
  return '#' + col.getHexString();
}

export function armKind(look: Appearance): ArmKind {
  return look.bracers?.style === 'plate' ? 'plate' : look.bracers?.style === 'leather' ? 'leather' : 'cloth';
}

export function buildArm(look: Appearance, side: 1 | -1): ArmParts {
  const arm = new THREE.Group(), closed = new THREE.Group(), open = new THREE.Group();
  let n = 0;
  /** A block, its shade varied a little by where it is in the build, so a run of them doesn't read as one flat colour. */
  const b = (g: THREE.Object3D, w: number, h: number, d: number, c: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh => {
    const k = 0.96 + ((n++ * 37) % 9) * 0.01;
    const m = new THREE.Mesh(BOX, mat(shadeOf(c, k)));
    m.scale.set(w, h, d); m.position.set(x * side, y, z); m.rotation.set(rx, ry * side, rz * side);
    g.add(m);
    return m;
  };
  const kind = armKind(look);
  const skin = look.skin;
  const top = look.top ?? 0, shirt = look.shirt ?? shadeOf(look.trim, 0.9);
  const sleeve = look.sleeves ?? (top === 1 || top === 3 || top === 6 ? shirt : look.tunic);
  const cuff = look.sleeves ? shadeOf(look.sleeves, 0.7) : look.trim;
  const glove = look.gloves ?? null;
  const brace = look.bracers?.color ?? '#5a4030', trim = look.bracers?.trim ?? shadeOf(brace, 0.62);
  const iron = '#8a8c90', ironDark = '#5a5c60';

  // ---- the forearm and what's on it (the forearm itself is skin, a little narrower at the wrist; what's worn sits over it)
  b(arm, 0.12, 0.08, 0.125, glove && kind !== 'cloth' ? glove : skin, 0.005, 0.17, 0); // the wrist
  b(arm, 0.135, 0.45, 0.145, skin, 0, 0.43, 0);
  b(arm, 0.16, 0.72, 0.17, skin, 0, 1.0, 0);
  if (kind === 'cloth') {
    if (look.shortSleeves) {
      b(arm, 0.19, 0.16, 0.2, sleeve, 0, 1.28, 0); // rolled to above the elbow
      b(arm, 0.195, 0.04, 0.205, shadeOf(sleeve, 0.8), 0, 1.2, 0);
    } else {
      b(arm, 0.168, 0.42, 0.178, sleeve, 0, 0.51, 0);
      b(arm, 0.188, 0.74, 0.198, sleeve, 0, 1.07, 0);
      b(arm, 0.172, 0.04, 0.182, shadeOf(sleeve, 0.84), 0, 0.74, 0.004); // a fold where the sleeve gathers
      b(arm, 0.182, 0.07, 0.19, cuff, 0, 0.31, 0); // the cuff
      b(arm, 0.186, 0.02, 0.194, shadeOf(cuff, 0.75), 0, 0.27, 0);
    }
    if (glove) b(arm, 0.15, 0.06, 0.158, glove, 0, 0.215, 0); // a cloth glove's turned-back top
  } else if (kind === 'leather') {
    b(arm, 0.19, 0.62, 0.2, sleeve, 0, 1.1, 0);
    b(arm, 0.168, 0.5, 0.18, brace, 0, 0.47, 0); // the bracer
    b(arm, 0.172, 0.03, 0.184, shadeOf(brace, 1.18), 0, 0.71, 0); // its rolled top edge
    for (const y of [0.3, 0.47, 0.64]) {
      b(arm, 0.176, 0.045, 0.188, trim, 0, y, 0); // a strap
      b(arm, 0.03, 0.034, 0.03, iron, 0.089, y, 0.045); // its stud, and the buckle's tongue
      b(arm, 0.026, 0.03, 0.026, ironDark, 0.089, y, -0.045);
    }
    b(arm, 0.004, 0.42, 0.004, shadeOf(brace, 1.45), 0.085, 0.47, -0.07); // stitching down the seam
    b(arm, 0.004, 0.42, 0.004, shadeOf(brace, 1.45), 0.085, 0.47, 0.07);
    b(arm, 0.152, 0.05, 0.16, glove ?? brace, 0, 0.215, 0); // the glove's cuff under the bracer
  } else {
    b(arm, 0.192, 0.62, 0.202, glove ?? '#4a4c50', 0, 1.1, 0); // the arming sleeve under the plate
    const plate = brace;
    [0.31, 0.47, 0.63].forEach((y, i) => {
      const w = 0.178 + i * 0.006;
      b(arm, w, 0.17, w + 0.01, plate, 0, y, 0); // a lame of the vambrace
      b(arm, w + 0.006, 0.022, w + 0.016, shadeOf(plate, 0.7), 0, y - 0.075, 0); // its rolled lower edge
      b(arm, 0.022, 0.022, 0.022, shadeOf(plate, 1.3), 0.095 + i * 0.003, y + 0.03, 0.05); // a rivet
      b(arm, 0.022, 0.022, 0.022, shadeOf(plate, 1.3), 0.095 + i * 0.003, y + 0.03, -0.05);
    });
    b(arm, 0.006, 0.5, 0.03, shadeOf(plate, 1.35), 0.098, 0.47, 0); // the bright ridge down the outside
    b(arm, 0.21, 0.14, 0.215, plate, 0, 0.86, 0); // the elbow cop
    b(arm, 0.23, 0.06, 0.05, shadeOf(plate, 0.85), 0, 0.86, 0.11); // its fan
    b(arm, 0.176, 0.1, 0.186, plate, 0, 0.2, 0); // the gauntlet's flared cuff
    b(arm, 0.186, 0.02, 0.196, trim, 0, 0.155, 0);
  }

  // ---- the hand round a handle (the handle runs along Z through the origin; fingers stacked along it, wrapping from the
  // back of the hand under the grip to the tips on the inside, the thumb over the top)
  const handC = kind === 'plate' ? glove ?? '#3a3c40' : glove ?? skin;
  const tipC = kind === 'leather' ? skin : handC; // (a leather glove's fingers are cut short)
  const backC = kind === 'plate' ? brace : handC;
  b(closed, 0.075, 0.12, 0.165, backC, 0.055, 0.085, 0); // the back of the hand
  b(closed, 0.05, 0.1, 0.15, handC, -0.022, 0.08, 0); // the palm, against the grip
  b(closed, 0.032, 0.026, 0.162, kind === 'plate' ? shadeOf(brace, 1.2) : shadeOf(handC, 0.85), 0.09, 0.026, 0); // the knuckles
  const FINGERS: [number, number][] = [[0.06, 0.037], [0.021, 0.038], [-0.018, 0.036], [-0.054, 0.03]];
  for (const [zf, fw] of FINGERS) {
    b(closed, 0.05, 0.066, fw, kind === 'plate' ? shadeOf(brace, 0.95) : handC, 0.058, -0.018, zf); // over the grip
    b(closed, 0.082, 0.04, fw - 0.001, tipC === skin ? handC : tipC, 0.006, -0.06, zf); // under it
    b(closed, 0.038, 0.048, fw - 0.003, tipC, -0.044, -0.034, zf); // the tip, curled round on the inside
  }
  b(closed, 0.046, 0.07, 0.06, handC, -0.036, 0.085, 0.04); // the ball of the thumb
  b(closed, 0.04, 0.04, 0.082, tipC === skin && kind === 'leather' ? skin : handC, -0.044, 0.04, 0.062, 0, 0, 0.15); // the thumb, over the grip

  // ---- the hand open (a spell, a heal, a ward, or at rest with nothing in it): the palm faces +Z, the fingers run on
  // past the wrist (-Y), a little apart and a little curled, the thumb out on the inside
  b(open, 0.15, 0.135, 0.055, handC, 0, 0.035, 0);
  b(open, 0.152, 0.025, 0.058, kind === 'plate' ? shadeOf(brace, 1.15) : shadeOf(handC, 0.9), 0, -0.03, -0.004); // the knuckle line
  [-0.054, -0.018, 0.018, 0.054].forEach((fx, i) => {
    const len = i === 0 ? 0.06 : i === 3 ? 0.055 : 0.07, splay = (i - 1.5) * 0.07;
    const f1 = b(open, 0.033, len, 0.042, kind === 'plate' ? shadeOf(brace, 0.95) : handC, fx, -0.04 - len / 2, 0.002, 0, 0, splay);
    const f2 = b(open, 0.03, len * 0.85, 0.038, tipC, fx + splay * -0.05 * side, -0.04 - len - len * 0.4, 0.014, -0.3, 0, splay);
    void f1; void f2;
  });
  b(open, 0.042, 0.07, 0.042, handC, -0.088, 0.02, 0.012, 0, 0, 0.55); // the thumb
  b(open, 0.036, 0.05, 0.038, tipC, -0.118, -0.03, 0.02, 0, 0, 0.75);
  return { arm, closed, open };
}
