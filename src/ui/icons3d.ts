import * as THREE from 'three';
import { Humanoid, offhandMesh, weaponMesh, type Appearance, type OffhandModel, type WeaponModel } from '../entities/humanoid';
import type { ArmourSlot } from '../data/armour';

// Item icons rendered from the item's own model (ui/icons.ts asks for them): a weapon or an off-hand
// thing from the mesh the hand holds, laid on the diagonal; a piece of armour on a plain mannequin,
// framed on the part it covers. One small offscreen renderer does them all, once each; the picture is
// cached by icons.ts as a data URL. Where there's no WebGL, icons.ts paints its shapes instead.

const SIZE = 96;
let R: THREE.WebGLRenderer | null = null, failed = false;
let scene: THREE.Scene, cam: THREE.OrthographicCamera;

function setup(): boolean {
  if (R) return true;
  if (failed) return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    R = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    R.setSize(SIZE, SIZE, false);
    R.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e8', '#4a4038', 1.5));
    const key = new THREE.DirectionalLight('#ffffff', 2.0); key.position.set(-2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight('#a8c8ff', 0.8); rim.position.set(3, 1, -3); scene.add(rim);
    cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    return true;
  } catch {
    failed = true;
    return false;
  }
}

/** Frame box b (in the object's world frame) in the camera, from the front-left, a little above. */
function shoot(obj: THREE.Object3D, frame?: THREE.Box3): string | null {
  if (!setup()) return null;
  scene.add(obj);
  obj.updateMatrixWorld(true);
  const b = frame ?? new THREE.Box3().setFromObject(obj);
  const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const half = Math.max(s.x, s.y, s.z) * 0.58;
  cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
  cam.position.set(c.x, c.y, c.z + 10);
  cam.lookAt(c);
  cam.updateProjectionMatrix();
  R!.render(scene, cam);
  scene.remove(obj);
  // A dark edge round the shape, like the painted icons' outline
  const out = document.createElement('canvas');
  out.width = out.height = SIZE;
  const x = out.getContext('2d')!;
  x.shadowColor = 'rgba(16, 10, 6, 0.95)';
  x.shadowBlur = 3;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { x.shadowOffsetX = dx; x.shadowOffsetY = dy; x.drawImage(R!.domElement, 0, 0); }
  x.shadowColor = 'transparent';
  x.drawImage(R!.domElement, 0, 0);
  return out.toDataURL();
}

/** A weapon, on the diagonal: grip at the bottom left, the point or the head at the top right. */
export function weaponIcon(w: WeaponModel): string | null {
  const g = new THREE.Group(), m = weaponMesh(w);
  m.rotation.y = Math.PI / 2;
  g.add(m);
  g.rotation.z = -Math.PI / 4;
  return shoot(g);
}

/** A shield, lantern, tome, horn or focus, face on and turned a little. */
export function offhandIcon(o: OffhandModel): string | null {
  const g = new THREE.Group(), m = offhandMesh(o);
  m.rotation.set(0.15, -0.5, 0);
  g.add(m);
  return shoot(g);
}

// The mannequin the armour is shown on: plain undyed cloth, so the piece is what you see
const PLAIN: Appearance = { skin: '#c8a688', hair: '#3a2a20', hairStyle: 0, eyes: '#3a3028', tunic: '#6a665e', trim: '#6a665e', trousers: '#4e4a44', boots: '#3a342e', hat: 'none', build: 1, height: 1, age: 0.3 } as Appearance;
/** Which part of the figure to frame for each slot: from this fraction of its height down from the top, to that one, how wide, and how far off the middle (gloves: one hand). */
const FRAME: Record<ArmourSlot, [number, number, number, number?]> = { head: [0, 0.3, 0.5], chest: [0.22, 0.6, 0.8], legs: [0.5, 0.92, 0.6], hands: [0.44, 0.64, 0.34, -0.36], feet: [0.8, 1.02, 0.5] };

export function armourIcon(slot: ArmourSlot, look: Partial<Appearance>): string | null {
  const h = new Humanoid({ ...PLAIN, ...look } as Appearance);
  const g = h.root;
  g.rotation.y = -0.45;
  g.updateMatrixWorld(true);
  const all = new THREE.Box3().setFromObject(g), H = all.max.y - all.min.y, W = all.max.x - all.min.x;
  const [t, bot, w, off = 0] = FRAME[slot];
  const cx = (all.min.x + all.max.x) / 2 + W * off;
  const frame = new THREE.Box3(new THREE.Vector3(cx - (W * w) / 2, all.max.y - H * bot, all.min.z), new THREE.Vector3(cx + (W * w) / 2, all.max.y - H * t, all.max.z));
  return shoot(g, frame);
}
