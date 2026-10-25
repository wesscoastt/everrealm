import * as THREE from 'three';
import { wearing } from '../data/costumes';
import { capeTexture } from './capes';
import type { EmoteAnim } from '../data/emotes';
import type { Voice as InstrumentVoice } from '../data/tunes';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { shade as voxShade, Vox } from './vox';

// ---------------------------------------------------------------------------------------------
// A torch's fire, in cubes half the world's pixel: three tongues of flame one inside another (deep
// orange, amber, a white-yellow heart), each a teardrop that licks up and leans on its own beat,
// sparks that climb off the top and go out, and a soft glow round it all. Unlit, so it shows at
// night. Built once and shared by every torch.
const FS = 1 / 32;
let flameKit: { layers: THREE.BufferGeometry[]; spark: THREE.BufferGeometry; glow: THREE.Texture } | null = null;
const FLAME_MAT = new THREE.MeshBasicMaterial({ vertexColors: true });
function flameParts() {
  if (flameKit) return flameKit;
  // A teardrop r wide at its belly, h tall, its tip pulled to a point; ragged at the edge
  // Hot at the root and cooling to the tip: white-yellow, amber, orange, red at the very top
  const heat = (t: number, n: number) => (t < 0.22 ? voxShade('#fff4c8', 0.96 + n * 0.06) : t < 0.5 ? voxShade('#ffc038', 0.94 + n * 0.1) : t < 0.8 ? voxShade('#ff7a1a', 0.92 + n * 0.12) : voxShade('#d83a14', 0.9 + n * 0.14));
  const drop = (r: number, h: number) => new Vox(FS, true).fill([-r, 0, -r], [r, h, r], (x, y, z) => {
    const t = y / h, w = r * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.95)) * (1 - t * 0.35);
    return x * x + z * z <= w * w;
  }, (_x, y, _z, n) => heat(y / h + n * 0.08, n)).mesh().geometry;
  // The body of the fire, and two tongues that lick up beside it
  const layers = [drop(0.1, 0.3), drop(0.065, 0.21), drop(0.06, 0.18)];
  const spark = new THREE.BoxGeometry(FS, FS, FS);
  // The glow: a soft round warm light, brightest in the middle
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,200,110,0.55)'); gr.addColorStop(0.4, 'rgba(255,140,50,0.22)'); gr.addColorStop(1, 'rgba(255,100,30,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glow = new THREE.CanvasTexture(c); glow.colorSpace = THREE.SRGBColorSpace;
  return (flameKit = { layers, spark, glow });
}
/** Where each part of the fire stands on the torch head: the body in the middle, the tongues off to two sides. */
const TONGUES: [number, number][] = [[0, 0], [0.045, 0.02], [-0.035, -0.035]];
const SPARK_MATS = ['#ffd070', '#ff9a30', '#ffe8a0'].map((c) => new THREE.MeshBasicMaterial({ color: c }));


/**
 * Everyone's overall scale. A figure at height 1 stands about 1.85 blocks to the top of the hair,
 * under the lintel of a two-high door (the player's collider is 1.8 blocks).
 */
export const FIGURE = 0.82;

export interface Appearance {
  skin: string;
  hair: string;
  /** Bright roots (hair style 13): the colour of the top, over the rest of the hair. */
  hairRoots?: string;
  hairStyle: number; // 0 short, 1 long, 2 topknot, 3 shaved, 4 braids
  eyes: string;
  tunic: string;
  trim: string;
  trousers: string;
  boots: string;
  cape?: string | null;
  /** A design worked on the cloak in the trim colour (data/capes.ts), collected into the wardrobe. */
  capeDesign?: string | null;
  beard?: boolean;
  apron?: boolean;
  hat?: 'none' | 'hood' | 'cap' | 'kerchief' | 'wide' | 'straw' | 'beret' | 'circlet' | 'coif' | 'band'
    /** Festival hats (data/seasons.ts), unlocked into the wardrobe. */
    | 'fool' | 'garland' | 'antlers' | 'sheaf' | 'turnip' | 'feathered' | 'bobble' | 'pumpkin'
    /** Costume headwear (data/costumes.ts): the witch's hat, the skull, the scarecrow's sack, the ghost's sheet, the crow mask. */
    | 'witch' | 'skull' | 'sack' | 'sheet' | 'crow'
    /** The corsair's (data/costumes.ts): three sides of the brim turned up, a plume over one. */
    | 'tricorn';
  hatColor?: string;
  /** A costume worn over all of it (data/costumes.ts), or none. */
  costume?: string | null;
  /** The pet at their heels (data/pets.ts), or none. Not drawn on the figure: game/Game.ts and net/Online.ts walk it beside them. */
  pet?: string | null;
  /** Body shape: the broader-shouldered frame, or the narrower one with a fuller chest and hips. */
  frame?: 'm' | 'f';
  /** 0 none, 1 full beard, 2 stubble, 3 moustache, 4 goatee, 5 chinstrap, 6 long beard, 7 mutton chops, 8 forked beard. Old saves use `beard`. */
  facial?: number;
  /** 0 straight, 1 heavy, 2 arched, 3 fine. */
  brows?: number;
  freckles?: boolean;
  scar?: boolean;
  /** Face paint colour (a band across the eyes), or none. */
  paint?: string | null;
  /** Earring metal, or none. */
  earring?: string | null;
  /** 0 tunic, 1 doublet, 2 robe, 3 vest over a shirt, 4 gambeson, 5 gown, 6 jerkin, 7 long coat. */
  top?: number;
  /** The second cloth: sleeves, the shirt under a vest, a gown's bodice. */
  shirt?: string;
  /** 0 trousers, 1 breeches and hose, 2 kilt, 3 wide trousers. */
  legs?: number;
  hose?: string;
  /** 0 boots, 1 tall boots, 2 shoes. */
  shoes?: number;
  gloves?: string | null;
  belt?: string;
  build?: number; // 0.9 slim .. 1.15 broad
  height?: number;
  shoulderPads?: string | null;
  lashes?: boolean;
  age?: number; // 0 young .. 1 old (greys brows, adds lines)
  // Armour worn over the clothes (data/armour.ts). Each slot's piece sets its own, so a breastplate
  // from one set and greaves from another sit together.
  /** On the body: a breastplate, scales, a riveted brigandine, a leather cuirass, or mail. */
  chestArmour?: { style: 'plate' | 'scale' | 'brigandine' | 'cuirass' | 'mail'; color: string; trim?: string };
  /** On the shoulders: rounded or layered plate, plate with spikes, fur, leather, or a cloth mantle. */
  shoulders?: { style: 'round' | 'layered' | 'spiked' | 'fur' | 'leather' | 'mantle'; color: string; trim?: string };
  /** A tabard over it all, front and back, with an emblem on the chest. */
  tabard?: { color: string; trim: string; emblem?: string };
  /** On the forearms: plate with a cop at the elbow, or laced leather. */
  bracers?: { style: 'plate' | 'leather'; color: string; trim?: string };
  /** On the legs: plate (cuisses, knee cops, greaves), leather guards, or plates hanging from the hips. */
  legArmour?: { style: 'plate' | 'leather' | 'tassets'; color: string; trim?: string };
  /** Plate over the boots. */
  sabatons?: { color: string };
  /** A helm, which covers the hair (and any hat): nasal, kettle, sallet, barbute, great helm or horned. */
  helm?: { style: 'nasal' | 'kettle' | 'sallet' | 'barbute' | 'great' | 'horned'; color: string; trim?: string; plume?: string };
}

export type HeldItem = 'none' | 'sword' | 'bronzeSword' | 'pickaxe' | 'hatchet' | 'rod' | 'hammer' | 'tongs';

/** Length of a dodge roll in seconds (the player's movement uses the same figure). */
export const ROLL_TIME = 0.55;
/** Roll keyframes: `at` is the fraction of the roll; `lift` is the pivot's height above the feet. */
interface RollPose { at: number; leg: number; shin: number; split: number; curl: number; nod: number; arm: number; wide: number; fore: number; lift: number }
const ROLL_KEYS: RollPose[] = [
  { at: 0, leg: 0, shin: 0, split: 0, curl: 0, nod: 0, arm: 0, wide: 0.08, fore: -0.15, lift: 1.0 },
  // dive: lean in, push off the back foot, arms reaching
  { at: 0.14, leg: -0.7, shin: 0.5, split: 0.9, curl: 0.55, nod: 0.25, arm: -2.0, wide: 0.15, fore: -0.1, lift: 0.86 },
  // tucked ball
  { at: 0.3, leg: -2.2, shin: 2.4, split: 0, curl: 1.0, nod: 0.6, arm: -0.9, wide: -0.25, fore: -1.5, lift: 0.7 },
  { at: 0.68, leg: -2.2, shin: 2.4, split: 0, curl: 1.0, nod: 0.6, arm: -0.9, wide: -0.25, fore: -1.5, lift: 0.7 },
  // coming up into a crouch, arms out for balance
  { at: 0.86, leg: -1.1, shin: 1.7, split: 0.2, curl: 0.5, nod: 0.1, arm: -0.6, wide: 0.45, fore: -0.4, lift: 0.8 },
  { at: 1, leg: 0, shin: 0, split: 0, curl: 0.1, nod: 0, arm: 0, wide: 0.08, fore: -0.15, lift: 1.0 },
];

export type AnimState = 'idle' | 'ride' | 'walk' | 'run' | 'swim' | 'tread' | 'attack' | 'shoot' | 'cleave' | 'mine' | 'chop' | 'fishCast' | 'fishWait' | 'hit' | 'dead' | 'roll' | 'talk' | 'hammer' | 'bellows' | 'jump' | 'heal' | 'cook' | 'perform' | 'seated' | EmoteAnim;

const geoCache = new Map<string, THREE.BufferGeometry>();
function rbox(w: number, h: number, d: number, r = 0.04): THREE.BufferGeometry {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}:${r}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    geoCache.set(key, g);
  }
  return g;
}

const matCache = new Map<string, THREE.MeshLambertMaterial>();
function lam(color: string): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); matCache.set(color, m); }
  return m;
}

function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return '#' + c.getHexString();
}

/**
 * The face, painted on a 64-pixel square over the front of the head (the nose and any beard are
 * built on top in 3D). Rows: brows 18-22, eyes 24-31, nose shadow 39-41, mouth 46-49.
 */
function faceTexture(a: Appearance): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const px = (col: string, X: number, Y: number, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const fem = a.frame === 'f', age = a.age ?? 0;
  px(a.skin, 0, 0, 64, 64);
  // Light falls from above: a lit brow, shadowed jaw and temples
  px(shade(a.skin, 1.04), 6, 6, 52, 10);
  px(shade(a.skin, 0.95), 0, 50, 64, 14);
  px(shade(a.skin, 0.93), 0, 0, 4, 64); px(shade(a.skin, 0.93), 60, 0, 4, 64);
  // Cheeks
  x.fillStyle = fem ? 'rgba(214,96,96,0.22)' : 'rgba(200,100,90,0.13)';
  x.fillRect(9, 36, 9, 5); x.fillRect(46, 36, 9, 5);
  // Brows, in four shapes
  const brow = age > 0.6 ? '#cfcac0' : shade(a.hair, 0.78);
  switch (a.brows ?? 0) {
    case 1: px(brow, 11, 18, 15, 4); px(brow, 38, 18, 15, 4); px(brow, 24, 20, 2, 2); px(brow, 38, 20, 2, 2); break;
    case 2: px(brow, 12, 21, 3, 2); px(brow, 15, 19, 7, 2); px(brow, 22, 20, 3, 2); px(brow, 39, 20, 3, 2); px(brow, 42, 19, 7, 2); px(brow, 49, 21, 3, 2); break;
    case 3: px(brow, 14, 20, 10, 1); px(brow, 40, 20, 10, 1); break;
    default: px(brow, 12, 19, 13, 3); px(brow, 39, 19, 13, 3); px(brow, 12, 21, 2, 1); px(brow, 50, 21, 2, 1);
  }
  if (a.paint) { x.fillStyle = a.paint; x.fillRect(5, 23, 54, 11); }
  // Eyes: almond whites, a coloured iris with a dark pupil and a catch of light, a lid line above
  for (const cx of [19, 45]) {
    px('#f4efe6', cx - 5, 26, 10, 4); px('#f4efe6', cx - 4, 25, 8, 1); px('#f4efe6', cx - 3, 30, 6, 1);
    px(a.eyes, cx - 2, 25, 5, 6);
    px(shade(a.eyes, 0.6), cx - 2, 25, 5, 1);
    px('#120c08', cx - 1, 26, 3, 3);
    px('#ffffff', cx + 1, 26, 1, 1);
    px(shade(a.skin, 0.55), cx - 5, 24, 10, 1); px(shade(a.skin, 0.55), cx - 6, 25, 1, 1);
    px(shade(a.skin, 0.86), cx - 4, 31, 8, 1);
    if (a.lashes) { px('#1a120c', cx - 6, 24, 12, 1); px('#1a120c', cx + (cx < 32 ? -7 : 6), 23, 1, 1); }
  }
  // Under the nose (the nose itself stands out in 3D), and the mouth
  px(shade(a.skin, 0.78), 28, 40, 2, 1); px(shade(a.skin, 0.78), 34, 40, 2, 1);
  px(shade(a.skin, 0.88), 27, 41, 10, 1);
  const lip = fem ? shade(a.skin, 0.72) : shade(a.skin, 0.78);
  px(lip, 26, 46, 12, 1);
  px(shade(a.skin, 0.5), 25, 47, 14, 1); px(shade(a.skin, 0.62), 24, 46, 1, 1); px(shade(a.skin, 0.62), 39, 46, 1, 1);
  px(fem ? 'rgba(190,80,80,0.45)' : shade(a.skin, 0.82), 27, 48, 10, 2);
  px(shade(a.skin, 0.9), 28, 52, 8, 1);
  // Age: lines at the eyes, across the brow and down from the nose
  if (age > 0.45) { px(shade(a.skin, 0.84), 9, 27, 2, 1); px(shade(a.skin, 0.84), 53, 27, 2, 1); px(shade(a.skin, 0.84), 22, 42, 1, 4); px(shade(a.skin, 0.84), 41, 42, 1, 4); }
  if (age > 0.65) { px(shade(a.skin, 0.86), 16, 13, 32, 1); px(shade(a.skin, 0.86), 20, 15, 24, 1); px(shade(a.skin, 0.84), 9, 29, 2, 1); px(shade(a.skin, 0.84), 53, 29, 2, 1); }
  if (a.freckles) for (const [fx, fy] of [[14, 35], [17, 37], [21, 35], [12, 38], [43, 35], [46, 37], [50, 35], [52, 38], [29, 36], [34, 36]]) px(shade(a.skin, 0.76), fx, fy, 1, 1);
  if (a.scar) { for (let i = 0; i < 9; i++) px(shade(a.skin, 0.66), 47 - Math.floor(i / 3), 15 + i * 2, 1, 2); }
  // Facial hair is mostly built in 3D; stubble and the shadow under a full beard are painted
  const fh = facialOf(a), hc = shade(a.hair, 0.9);
  if (fh === 2) { x.fillStyle = 'rgba(40,28,20,0.3)'; x.fillRect(6, 43, 52, 21); x.fillRect(22, 41, 20, 3); }
  if (fh === 1 || fh === 6 || fh === 8 || fh === 5 || fh === 7) { px(hc, 4, 52, 56, 12); }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Facial hair, reading old saves that only had a beard on or off. */
function facialOf(a: Appearance): number {
  return a.facial ?? (a.beard ? 1 : 0);
}

/** How a weapon looks in the hand (data/weapons.ts gives each its own). */
export type WeaponFamily = 'sword' | 'sabre' | 'longsword' | 'greatsword' | 'dagger' | 'falchion' | 'cleaver' | 'axe' | 'greataxe' | 'mace' | 'hammer' | 'spear' | 'staff' | 'bow';
/** A maker's shapes: the guard, the pommel, and the head (a blade's profile, an axe's bit, a mace's head, a staff's top). */
export type WeaponGuard = 'bar' | 'crescent' | 'disc' | 'swept' | 'none';
export type WeaponPommel = 'cube' | 'wheel' | 'fishtail' | 'gem' | 'ring' | 'cap';
export type WeaponHead = 'fuller' | 'leaf' | 'tapered' | 'wavy' | 'bearded' | 'broad' | 'crescent' | 'hatchet' | 'pick' | 'flanged' | 'studded' | 'star' | 'knob' | 'maul' | 'lucerne' | 'crook' | 'orb' | 'gnarled' | 'forked' | 'ringed' | 'winged' | 'harpoon' | 'glaive' | 'gig';
export interface WeaponModel { family: WeaponFamily; metal: string; hilt: string; grip: string; accent?: string; glow?: string; guard?: WeaponGuard; pommel?: WeaponPommel; head?: WeaponHead }
/** What can be held off the right hand: a shield, a lantern, a tome, a horn, a focus (data/offhand.ts). */
export type OffhandFamily = 'heater' | 'round' | 'kite' | 'buckler' | 'tower' | 'lantern' | 'tome' | 'horn' | 'focus';
export interface OffhandModel { family: OffhandFamily; face: string; rim: string; boss?: string; emblem?: string; glow?: string }

/** Items to models: set once by the game, so anyone holding an item by its id is drawn with it. */
let weaponModelOf: (id: string) => WeaponModel | null = () => null;
let offhandModelOf: (id: string) => OffhandModel | null = () => null;
let instrumentOf: (id: string) => InstrumentVoice | null = () => null;
export function setGearModels(weapon: (id: string) => WeaponModel | null, offhand: (id: string) => OffhandModel | null, instrument?: (id: string) => InstrumentVoice | null): void {
  weaponModelOf = weapon; offhandModelOf = offhand;
  if (instrument) instrumentOf = instrument;
}

/** A weapon in the right hand. Its +y runs from the grip out along the blade or the haft; the edge
 *  (and an axe's bit) faces +z, the flat of the blade faces x. Each maker has its own guard, pommel
 *  and head (data/weapons.ts), so a Charter sword and a Barrow sword differ in shape, not just colour. */
/** A leather quiver slung on the back, its arrows' fletchings over the right shoulder. */
function quiverMesh(): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(rbox(0.17, 0.56, 0.15, 0.04), '#6a4a2a', 0, 0, 0);
  add(rbox(0.19, 0.05, 0.17, 0.015), '#3a2a1a', 0, 0.26, 0);
  add(rbox(0.19, 0.05, 0.17, 0.015), '#3a2a1a', 0, -0.2, 0);
  for (const [x, z, c] of [[-0.04, -0.03, '#f0ece0'], [0.04, 0.02, '#c8402a'], [0, 0.04, '#f0ece0'], [0.05, -0.04, '#2a4a7a'], [-0.05, 0.03, '#c8402a']] as const) {
    add(rbox(0.012, 0.16, 0.012, 0.003), '#8a6a3a', x, 0.34, z);
    add(rbox(0.035, 0.08, 0.008, 0.002), c, x, 0.4, z);
  }
  g.position.set(-0.16, 0.24, -0.34); // over a cape, if there is one
  g.rotation.z = -0.35;
  return g;
}

function weaponMesh(w: WeaponModel): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, color: string | THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? lam(color) : color);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const M = w.metal, H = w.hilt, G = w.grip, A = w.accent ?? w.hilt;
  const edge = shade(M, 1.2), dark = shade(M, 0.75);
  const glow = w.glow ? new THREE.MeshLambertMaterial({ color: w.glow, emissive: new THREE.Color(w.glow).multiplyScalar(0.7) }) : null;
  const cone = (r: number, h: number) => new THREE.ConeGeometry(r, h, 4);

  /** The guard across the top of the grip, `span` long. */
  const guard = (y: number, span: number) => {
    switch (w.guard ?? 'bar') {
      case 'bar': add(rbox(0.09, 0.06, span, 0.02), H, 0, y, 0); break;
      case 'crescent': // quillons turned up toward the blade
        add(rbox(0.09, 0.06, span * 0.62, 0.02), H, 0, y, 0);
        for (const s of [1, -1]) { add(rbox(0.08, 0.07, 0.08, 0.02), H, 0, y + 0.025, s * span * 0.36); add(rbox(0.07, 0.08, 0.05, 0.02), A, 0, y + 0.075, s * span * 0.42); }
        break;
      case 'disc': add(rbox(span * 0.42, 0.045, span * 0.5, 0.06), H, 0, y, 0); add(rbox(span * 0.3, 0.05, span * 0.36, 0.04), A, 0, y - 0.01, 0); break;
      case 'swept': // a knuckle bow down to the pommel, and a side ring
        add(rbox(0.08, 0.05, span * 0.8, 0.02), H, 0, y, 0);
        add(rbox(0.03, 0.26, 0.03, 0.01), H, 0, y - 0.12, span * 0.36);
        add(rbox(0.03, 0.03, span * 0.36, 0.01), H, 0, y - 0.24, span * 0.18);
        add(rbox(0.1, 0.03, 0.03, 0.01), H, 0.04, y - 0.02, -span * 0.12);
        break;
      case 'none': add(rbox(0.08, 0.04, 0.09, 0.02), H, 0, y, 0); break;
    }
  };
  /** The pommel at the foot of the grip. */
  const pommel = (y: number, s = 0.065) => {
    const P = glow ?? A;
    switch (w.pommel ?? 'cube') {
      case 'cube': add(rbox(s, s, s, 0.02), P, 0, y, 0); break;
      case 'wheel': add(rbox(s * 0.7, s * 1.5, s * 1.5, s * 0.5), P, 0, y - s * 0.2, 0); break;
      case 'fishtail': for (const k of [1, -1]) add(rbox(s * 0.8, s * 0.9, s * 0.5, 0.015), P, 0, y - s * 0.15, k * s * 0.42, k * 0.45); break;
      case 'gem': add(rbox(s * 0.9, s * 0.4, s * 0.9, 0.015), H, 0, y + s * 0.2, 0); add(rbox(s * 0.8, s * 0.8, s * 0.8, 0.02), P, 0, y - s * 0.3, 0).rotation.set(Math.PI / 4, 0, Math.PI / 4); break;
      case 'ring': for (const [dy, dz, hh, dd] of [[0, s * 0.55, s * 1.2, s * 0.3], [0, -s * 0.55, s * 1.2, s * 0.3], [s * 0.45, 0, s * 0.3, s * 1.4], [-s * 0.45, 0, s * 0.3, s * 1.4]]) add(rbox(s * 0.45, hh, dd, 0.01), P, 0, y - s * 0.4 + dy, dz); break;
      case 'cap': add(rbox(s * 1.25, s * 0.6, s * 1.25, 0.02), P, 0, y, 0); add(rbox(s * 0.5, s * 0.45, s * 0.5, 0.015), P, 0, y - s * 0.45, 0); break;
    }
  };
  /** A straight blade from y0, len long, wide across, shaped by the maker's head. */
  const blade = (y0: number, len: number, wide: number) => {
    const head = w.head ?? 'fuller';
    if (head === 'leaf') {
      // Narrow at the shoulders, swelling past the middle, then to a point: old bronze
      const segs = [0.82, 0.95, 1.12, 1.2, 1.05];
      segs.forEach((f, i) => add(rbox(0.05, len / segs.length + 0.005, wide * f, 0.012), M, 0, y0 + (i + 0.5) * (len / segs.length), 0));
      add(rbox(0.054, len * 0.85, 0.018, 0.005), dark, 0, y0 + len * 0.45, 0);
      add(cone(wide * 0.55, 0.2), M, 0, y0 + len + 0.09, 0);
    } else if (head === 'tapered') {
      const segs = [1.05, 0.9, 0.75, 0.6];
      segs.forEach((f, i) => add(rbox(0.045, len / segs.length + 0.005, wide * f, 0.012), M, 0, y0 + (i + 0.5) * (len / segs.length), 0));
      add(cone(wide * 0.3, 0.22), M, 0, y0 + len + 0.1, 0);
      add(rbox(0.048, len * 0.5, 0.016, 0.004), edge, 0, y0 + len * 0.3, 0);
    } else if (head === 'wavy') {
      const n = 7;
      for (let i = 0; i < n; i++) add(rbox(0.05, len / n + 0.01, wide, 0.012), i % 2 ? edge : M, 0, y0 + (i + 0.5) * (len / n), (i % 2 ? 1 : -1) * wide * 0.12);
      add(cone(wide / 2, 0.16), M, 0, y0 + len + 0.07, 0);
    } else {
      add(rbox(0.05, len, wide, 0.015), M, 0, y0 + len / 2, 0);
      add(rbox(0.052, len * 0.8, 0.02, 0.005), edge, 0, y0 + len * 0.45, 0); // the fuller
      add(cone(wide / 2, 0.14), M, 0, y0 + len + 0.07, 0);
    }
  };
  /** An axe's bit at height `top` on the haft, scaled by s; `twin` adds a second bit behind. */
  const axeHead = (top: number, s: number, twin: boolean) => {
    add(rbox(0.085, 0.13 * s, 0.11, 0.02), H, 0, top, 0); // the eye
    const bit = (dir: number) => {
      switch (w.head ?? 'bearded') {
        case 'broad': // flares evenly toward the edge
          [[0.08, 0.14], [0.15, 0.24], [0.22, 0.34]].forEach(([z, h]) => add(rbox(0.05, h * s, 0.08 * s, 0.012), M, 0, top, dir * z * s));
          add(rbox(0.054, 0.36 * s, 0.03, 0.006), edge, 0, top, dir * 0.27 * s);
          break;
        case 'crescent': // the edge curves round, horns up and down
          [[0.08, 0.14, 0], [0.15, 0.24, 0], [0.21, 0.36, 0]].forEach(([z, h, dy]) => add(rbox(0.05, h * s, 0.08 * s, 0.012), M, 0, top + dy, dir * z * s));
          for (const v of [1, -1]) add(rbox(0.05, 0.1 * s, 0.07 * s, 0.012), M, 0, top + v * 0.2 * s, dir * 0.27 * s);
          add(rbox(0.054, 0.3 * s, 0.03, 0.006), edge, 0, top, dir * 0.27 * s);
          for (const v of [1, -1]) add(rbox(0.054, 0.1 * s, 0.03, 0.006), edge, 0, top + v * 0.2 * s, dir * 0.31 * s);
          break;
        case 'hatchet': // a small bit, a hammer poll behind
          add(rbox(0.05, 0.12 * s, 0.1 * s, 0.012), M, 0, top, dir * 0.1 * s);
          add(rbox(0.05, 0.18 * s, 0.06 * s, 0.012), M, 0, top, dir * 0.17 * s);
          add(rbox(0.054, 0.2 * s, 0.025, 0.006), edge, 0, top, dir * 0.205 * s);
          break;
        case 'pick': // a miner's pick: a spike each way, curving down
          for (const d of [1, -1]) {
            add(rbox(0.05, 0.07 * s, 0.12 * s, 0.015), M, 0, top, d * 0.1 * s);
            add(rbox(0.045, 0.06 * s, 0.1 * s, 0.012), M, 0, top - 0.025 * s, d * 0.2 * s);
            add(cone(0.03 * s, 0.12 * s), dark, 0, top - 0.06 * s, d * 0.27 * s, d * 2.2);
          }
          break;
        default: // bearded: the bit hangs down below the eye, to hook a shield's rim
          add(rbox(0.05, 0.16 * s, 0.1 * s, 0.012), M, 0, top + 0.01 * s, dir * 0.1 * s);
          add(rbox(0.05, 0.26 * s, 0.08 * s, 0.012), M, 0, top - 0.04 * s, dir * 0.18 * s);
          add(rbox(0.05, 0.14 * s, 0.06 * s, 0.012), M, 0, top - 0.17 * s, dir * 0.16 * s);
          add(rbox(0.054, 0.36 * s, 0.03, 0.006), edge, 0, top - 0.06 * s, dir * 0.225 * s);
      }
    };
    bit(1);
    if (twin && (w.head ?? 'bearded') !== 'pick' && (w.head ?? 'bearded') !== 'hatchet') bit(-1);
    else if (!twin && (w.head ?? 'bearded') !== 'pick' && (w.head ?? 'bearded') !== 'hatchet') add(cone(0.03, 0.12), dark, 0, top, -0.1, -Math.PI / 2); // the back spike
  };

  switch (w.family) {
    case 'sword':
    case 'longsword':
    case 'greatsword': {
      const long = w.family === 'longsword', great = w.family === 'greatsword';
      const grip = great ? 0.3 : long ? 0.24 : 0.16, len = great ? 1.25 : long ? 1.0 : 0.8, wide = great ? 0.16 : long ? 0.11 : 0.12;
      add(rbox(0.07, grip, 0.07, 0.02), G, 0, -0.02 - (grip - 0.16) / 2, 0);
      for (let k = 1; k < grip / 0.06; k++) add(rbox(0.075, 0.015, 0.075, 0.005), shade(G, 0.7), 0, 0.06 - (grip - 0.02) * (k / (grip / 0.06)), 0); // the wrap
      guard(0.08, great ? 0.5 : long ? 0.38 : 0.32);
      blade(0.1, len, wide);
      if (great) add(rbox(0.07, 0.08, 0.06, 0.02), H, 0, 0.2, 0.09); // the lugs of a two-hander
      pommel(-0.1 - (grip - 0.16));
      break;
    }
    case 'sabre': {
      add(rbox(0.07, 0.16, 0.07, 0.02), G, 0, -0.02, 0);
      if ((w.guard ?? 'swept') === 'disc') guard(0.08, 0.3);
      else {
        add(rbox(0.09, 0.05, 0.22, 0.02), H, 0, 0.08, 0);
        add(rbox(0.03, 0.26, 0.03, 0.01), H, 0, -0.01, 0.1); // the knuckle guard
      }
      for (let i = 0; i < 4; i++) add(rbox(0.045, 0.22, 0.1, 0.015), i === 3 ? edge : M, 0, 0.2 + i * 0.2, 0.02 + i * i * 0.012, -i * 0.07);
      pommel(-0.11, 0.055);
      break;
    }
    case 'dagger': {
      add(rbox(0.06, 0.12, 0.06, 0.02), G, 0, -0.01, 0);
      guard(0.06, 0.18);
      if (w.head === 'leaf' || w.head === 'tapered') blade(0.08, 0.34, 0.085);
      else {
        add(rbox(0.04, 0.34, 0.08, 0.012), M, 0, 0.25, 0);
        add(rbox(0.042, 0.28, 0.016, 0.004), edge, 0, 0.24, 0);
        add(cone(0.04, 0.1), M, 0, 0.47, 0);
      }
      pommel(-0.08, 0.05);
      break;
    }
    case 'falchion':
    case 'cleaver': {
      const cl = w.family === 'cleaver';
      add(rbox(0.07, 0.18, 0.07, 0.02), G, 0, -0.03, 0);
      guard(0.08, 0.24);
      add(rbox(0.05, 0.36, cl ? 0.22 : 0.13, 0.015), M, 0, 0.29, cl ? 0.05 : 0.01);
      add(rbox(0.05, 0.36, cl ? 0.26 : 0.18, 0.015), M, 0, 0.62, cl ? 0.07 : 0.03); // widening toward the point
      add(rbox(0.052, 0.66, 0.02, 0.005), edge, 0, 0.46, cl ? -0.05 : -0.04);
      if (!cl) add(cone(0.09, 0.14), M, 0, 0.86, 0.03);
      else add(rbox(0.05, 0.06, 0.1, 0.015), M, 0, 0.82, 0.14); // the squared-off end hooks forward
      pommel(-0.13, 0.06);
      break;
    }
    case 'axe':
    case 'greataxe': {
      const great = w.family === 'greataxe', haft = great ? 1.25 : 0.82;
      add(rbox(0.06, haft, 0.06, 0.02), G, 0, haft / 2 - 0.15, 0);
      for (const y of great ? [-0.05, 0.35] : [-0.05]) add(rbox(0.07, 0.14, 0.07, 0.02), H, 0, y, 0); // grip wraps
      axeHead(haft - 0.2, great ? 1.45 : 1, great);
      add(rbox(0.07, 0.08, 0.07, 0.02), A, 0, -0.16, 0);
      break;
    }
    case 'mace':
    case 'hammer': {
      const ham = w.family === 'hammer', haft = ham ? 0.86 : 0.7;
      add(rbox(0.06, haft, 0.06, 0.02), G, 0, haft / 2 - 0.12, 0);
      add(rbox(0.075, 0.18, 0.075, 0.02), H, 0, -0.02, 0); // the wrapped grip
      const top = haft - 0.12;
      if (ham) {
        const head = w.head ?? 'maul';
        if (head === 'pick') {
          add(rbox(0.12, 0.12, 0.14, 0.025), M, 0, top, 0.06);
          add(rbox(0.13, 0.03, 0.15, 0.01), edge, 0, top + 0.05, 0.06);
          add(rbox(0.05, 0.06, 0.16, 0.015), M, 0, top, -0.1);
          add(cone(0.04, 0.2), dark, 0, top - 0.02, -0.26, -1.87);
          add(cone(0.03, 0.14), dark, 0, top + 0.12, 0);
        } else if (head === 'lucerne') {
          add(rbox(0.12, 0.13, 0.12, 0.025), M, 0, top, 0.05);
          for (const [dy, dx] of [[0.04, 0.035], [0.04, -0.035], [-0.04, 0]]) add(rbox(0.03, 0.03, 0.06, 0.008), edge, dx, top + dy, 0.13);
          add(cone(0.035, 0.22), dark, 0, top, -0.18, -Math.PI / 2);
          add(rbox(0.04, 0.24, 0.04, 0.012), M, 0, top + 0.16, 0);
          add(cone(0.03, 0.12), dark, 0, top + 0.33, 0);
        } else {
          add(rbox(0.16, 0.16, 0.3, 0.03), M, 0, top, 0.04);
          add(rbox(0.17, 0.04, 0.31, 0.01), edge, 0, top + 0.06, 0.04);
          for (const z of [0.12, -0.04]) add(rbox(0.17, 0.17, 0.025, 0.006), A, 0, top, z); // bands
          add(cone(0.05, 0.18), dark, 0, top, -0.2, -Math.PI / 2);
        }
      } else {
        const head = w.head ?? 'flanged';
        if (head === 'studded') {
          add(rbox(0.15, 0.17, 0.15, 0.06), M, 0, top, 0);
          for (const [x, y, z] of [[0.08, 0, 0], [-0.08, 0, 0], [0, 0, 0.08], [0, 0, -0.08], [0, 0.09, 0], [0.055, 0.05, 0.055], [-0.055, 0.05, -0.055], [0.055, -0.05, -0.055], [-0.055, -0.05, 0.055]]) add(rbox(0.04, 0.04, 0.04, 0.01), dark, x, top + y, z);
        } else if (head === 'star') {
          add(rbox(0.14, 0.14, 0.14, 0.05), M, 0, top, 0);
          for (const [x, y, z, rx, rz] of [[0.09, 0, 0, 0, -Math.PI / 2], [-0.09, 0, 0, 0, Math.PI / 2], [0, 0, 0.09, Math.PI / 2, 0], [0, 0, -0.09, -Math.PI / 2, 0], [0, 0.09, 0, 0, 0], [0.06, 0.06, 0, 0, -0.8], [-0.06, 0.06, 0, 0, 0.8], [0, 0.06, 0.06, 0.8, 0], [0, 0.06, -0.06, -0.8, 0]]) add(cone(0.022, 0.09), edge, x, top + y, z, rx, rz);
        } else if (head === 'knob') {
          add(rbox(0.14, 0.2, 0.14, 0.06), M, 0, top, 0);
          for (const y of [-0.05, 0.05]) add(rbox(0.15, 0.025, 0.15, 0.008), A, 0, top + y, 0);
          add(rbox(0.06, 0.05, 0.06, 0.02), dark, 0, top + 0.12, 0);
        } else {
          add(rbox(0.13, 0.2, 0.13, 0.04), M, 0, top, 0);
          for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(rbox(0.03, 0.22, 0.09, 0.01), k % 2 ? edge : M, Math.cos(a) * 0.08, top, Math.sin(a) * 0.08).rotation.y = -a; } // flanges
          add(cone(0.035, 0.08), dark, 0, top + 0.14, 0);
        }
      }
      add(rbox(0.07, 0.06, 0.07, 0.02), glow ?? A, 0, -0.14, 0);
      break;
    }
    case 'bow': {
      // Two limbs bending back toward the archer from a wrapped grip, horn nocks at the tips, and the
      // string straight across behind them (local +Z is toward the mark)
      const wood = shade(G, 1.25), dark2 = shade(G, 0.8);
      add(rbox(0.06, 0.18, 0.07, 0.02), H, 0, 0, 0);
      for (const sgn of [1, -1]) {
        for (let k = 0; k < 7; k++) {
          const t0 = k / 7, t1 = (k + 1) / 7;
          const y0 = sgn * (0.08 + t0 * 0.66), y1 = sgn * (0.08 + t1 * 0.66);
          const z0 = -0.2 * t0 * t0, z1 = -0.2 * t1 * t1;
          const seg = add(rbox(0.045 - k * 0.003, Math.hypot(y1 - y0, z1 - z0) + 0.02, 0.05 - k * 0.003, 0.012), k % 3 === 2 ? dark2 : wood, 0, (y0 + y1) / 2, (z0 + z1) / 2);
          seg.rotation.x = -Math.atan2(z1 - z0, y1 - y0) * sgn;
        }
        add(rbox(0.05, 0.07, 0.05, 0.015), A, 0, sgn * 0.77, -0.19); // the nock
      }
      add(rbox(0.008, 1.52, 0.008, 0.002), '#e8e0cc', 0, 0, -0.2); // the string
      add(rbox(0.02, 0.03, 0.06, 0.006), M, 0, 0.1, 0.03); // the arrow rest
      break;
    }
    case 'spear': {
      add(rbox(0.05, 1.9, 0.05, 0.015), G, 0, 0.35, 0);
      add(rbox(0.07, 0.1, 0.07, 0.02), H, 0, 1.3, 0); // the socket
      const head = w.head ?? 'leaf';
      if (head === 'harpoon') {
        add(rbox(0.035, 0.3, 0.06, 0.01), M, 0, 1.5, 0);
        add(cone(0.05, 0.16), M, 0, 1.73, 0);
        for (const d of [1, -1]) add(rbox(0.03, 0.12, 0.03, 0.008), edge, 0, 1.6, d * 0.06, 0, 0).rotation.x = d * 0.6; // barbs
      } else if (head === 'glaive') {
        add(rbox(0.04, 0.5, 0.12, 0.012), M, 0, 1.6, 0.03);
        add(rbox(0.04, 0.16, 0.08, 0.012), M, 0, 1.88, 0.06);
        add(rbox(0.042, 0.6, 0.02, 0.005), edge, 0, 1.66, 0.095);
        add(rbox(0.04, 0.06, 0.06, 0.01), M, 0, 1.42, -0.06); // the back spur
      } else if (head === 'gig') {
        add(rbox(0.04, 0.05, 0.24, 0.012), M, 0, 1.38, 0);
        for (const z of [-0.1, 0, 0.1]) { add(rbox(0.03, 0.3, 0.03, 0.008), M, 0, 1.55, z); add(cone(0.028, 0.1), edge, 0, 1.74, z); }
      } else {
        add(rbox(0.04, 0.36, 0.11, 0.012), M, 0, 1.52, 0);
        add(cone(0.06, 0.18), M, 0, 1.79, 0);
        add(rbox(0.042, 0.4, 0.02, 0.005), edge, 0, 1.56, 0);
        if (head === 'winged') add(rbox(0.04, 0.04, 0.26, 0.01), H, 0, 1.34, 0); // lugs, to stop a boar on the shaft
      }
      add(rbox(0.06, 0.08, 0.06, 0.02), A, 0, -0.58, 0); // the butt cap
      if (w.accent) add(rbox(0.02, 0.18, 0.08, 0.005), w.accent, 0.04, 1.22, 0); // a pennant ribbon
      break;
    }
    case 'staff': {
      add(rbox(0.055, 1.85, 0.055, 0.018), G, 0, 0.38, 0);
      for (const y of [0.2, -0.2]) add(rbox(0.065, 0.06, 0.065, 0.01), H, 0, y, 0); // grip bindings
      const head = w.head ?? (glow ? 'orb' : 'crook');
      const stone = glow ?? M;
      if (head === 'orb') {
        add(rbox(0.1, 0.06, 0.1, 0.02), H, 0, 1.3, 0);
        for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(rbox(0.02, 0.2, 0.02, 0.006), H, x * 0.05, 1.42, z * 0.05);
        add(rbox(0.11, 0.13, 0.11, 0.03), stone, 0, 1.43, 0).rotation.y = Math.PI / 4; // a stone held in claws
      } else if (head === 'gnarled') {
        add(rbox(0.08, 0.16, 0.08, 0.03), G, 0.02, 1.36, 0);
        add(rbox(0.07, 0.14, 0.07, 0.03), G, -0.02, 1.48, 0.02);
        add(rbox(0.06, 0.12, 0.06, 0.025), G, 0.01, 1.58, -0.02);
        add(rbox(0.07, 0.07, 0.07, 0.02), stone, 0, 1.5, 0.06);
      } else if (head === 'forked') {
        for (const d of [1, -1]) { add(rbox(0.045, 0.2, 0.045, 0.012), G, 0, 1.4, d * 0.05, d * -0.3); add(rbox(0.04, 0.16, 0.04, 0.012), G, 0, 1.56, d * 0.09); }
        add(rbox(0.07, 0.06, 0.07, 0.02), H, 0, 1.3, 0);
      } else if (head === 'ringed') {
        for (const [dy, dz, hh, dd] of [[0, 0.1, 0.24, 0.035], [0, -0.1, 0.24, 0.035], [0.11, 0, 0.035, 0.24], [-0.11, 0, 0.035, 0.24]]) add(rbox(0.035, hh, dd, 0.008), M, 0, 1.46 + dy, dz);
        for (const z of [0.06, -0.06]) add(rbox(0.02, 0.06, 0.06, 0.008), A, 0, 1.3, z); // rings that chime
        add(rbox(0.08, 0.06, 0.08, 0.02), H, 0, 1.3, 0);
      } else {
        add(rbox(0.1, 0.1, 0.1, 0.03), H, 0, 1.3, 0);
        add(rbox(0.06, 0.2, 0.16, 0.02), M, 0, 1.44, 0.05).rotation.x = -0.4; // a crook head
      }
      add(rbox(0.06, 0.06, 0.06, 0.02), A, 0, -0.54, 0);
      break;
    }
  }
  return g;
}

/** Something in the left hand. Shields face out from the forearm; the rest hang or are carried. */
function offhandMesh(o: OffhandModel): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, color: string | THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? lam(color) : color);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const glow = o.glow ? new THREE.MeshLambertMaterial({ color: o.glow, emissive: new THREE.Color(o.glow).multiplyScalar(0.8) }) : null;
  switch (o.family) {
    case 'heater':
    case 'kite':
    case 'tower':
    case 'round':
    case 'buckler': {
      // The shield stands off the outside of the forearm, its face outward (+x)
      const dims = { heater: [0.56, 0.62], kite: [0.5, 0.86], tower: [0.66, 1.0], round: [0.66, 0.66], buckler: [0.34, 0.34] }[o.family];
      const [w, h] = dims;
      add(rbox(0.06, h, w, o.family === 'round' || o.family === 'buckler' ? 0.2 : 0.06), o.face, 0.1, -0.06, 0);
      add(rbox(0.07, h + 0.04, 0.04, 0.01), o.rim, 0.1, -0.06, w / 2);
      add(rbox(0.07, h + 0.04, 0.04, 0.01), o.rim, 0.1, -0.06, -w / 2);
      add(rbox(0.07, 0.04, w + 0.04, 0.01), o.rim, 0.1, -0.06 + h / 2, 0);
      if (o.family === 'heater' || o.family === 'kite') {
        // The point at the bottom
        add(rbox(0.06, h * 0.32, w * 0.55, 0.04), o.face, 0.1, -0.06 - h / 2 - h * 0.1, 0);
        add(rbox(0.06, h * 0.18, w * 0.25, 0.03), o.face, 0.1, -0.06 - h / 2 - h * 0.28, 0);
      } else add(rbox(0.07, 0.04, w + 0.04, 0.01), o.rim, 0.1, -0.06 - h / 2, 0);
      if (o.boss) add(rbox(0.06, 0.14, 0.14, 0.05), o.boss, 0.14, -0.04, 0);
      if (o.emblem) {
        add(rbox(0.01, h * 0.6, 0.06, 0.01), o.emblem, 0.135, -0.06, 0);
        add(rbox(0.01, 0.06, w * 0.6, 0.01), o.emblem, 0.135, 0.02, 0);
      }
      if (glow) add(rbox(0.02, 0.08, 0.08, 0.02), glow, 0.15, 0.12, 0);
      break;
    }
    case 'lantern': {
      add(rbox(0.02, 0.18, 0.02, 0.005), o.rim, 0, -0.1, 0); // the bail
      add(rbox(0.16, 0.04, 0.16, 0.01), o.rim, 0, -0.2, 0);
      add(rbox(0.13, 0.18, 0.13, 0.02), glow ?? o.face, 0, -0.31, 0);
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(rbox(0.02, 0.2, 0.02, 0.005), o.rim, x * 0.07, -0.31, z * 0.07);
      add(rbox(0.16, 0.04, 0.16, 0.01), o.rim, 0, -0.42, 0);
      break;
    }
    case 'tome': {
      add(rbox(0.08, 0.3, 0.24, 0.02), o.face, 0.04, -0.12, 0.06);
      add(rbox(0.06, 0.28, 0.22, 0.01), '#e8dcc0', 0.04, -0.12, 0.07); // pages
      add(rbox(0.09, 0.3, 0.03, 0.01), o.rim, 0.04, -0.12, -0.06); // the spine
      if (o.emblem) add(rbox(0.01, 0.08, 0.08, 0.01), o.emblem, 0.085, -0.1, 0.06);
      if (glow) add(rbox(0.01, 0.05, 0.05, 0.01), glow, 0.086, -0.2, 0.06);
      break;
    }
    case 'horn': {
      for (let i = 0; i < 4; i++) add(rbox(0.07 + i * 0.02, 0.12, 0.07 + i * 0.02, 0.03), i === 3 ? o.rim : o.face, 0, -0.06 - i * 0.1, i * i * 0.02, i * 0.12);
      add(rbox(0.02, 0.3, 0.02, 0.005), o.rim, -0.06, -0.15, 0.05); // the baldric strap
      break;
    }
    case 'focus': {
      add(rbox(0.04, 0.16, 0.04, 0.01), o.rim, 0, -0.06, 0);
      add(rbox(0.12, 0.16, 0.12, 0.04), glow ?? o.face, 0, -0.2, 0).rotation.y = Math.PI / 4;
      add(rbox(0.06, 0.06, 0.06, 0.02), o.rim, 0, -0.32, 0);
      break;
    }
  }
  return g;
}

/**
 * An instrument being played: the body is carried on the torso where it's played from (a whistle at
 * the mouth, a lute across the belly, the pipes' bag under the left arm), and anything worked by the
 * right hand (a bow, a beater, the gurdy's crank) goes in the hand. The torso faces +z.
 */
function instrumentMesh(v: InstrumentVoice): { body: THREE.Group; hand: THREE.Group | null } {
  const body = new THREE.Group(), hand = new THREE.Group();
  const put = (gr: THREE.Group, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, lam(color));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gr.add(m);
    return m;
  };
  const wood = '#8a4a22', dark = '#3a2414', brass = '#d8a84a', gut = '#e8dcb0';
  switch (v) {
    case 'whistle':
    case 'bone': {
      // From the lips, down and forward, with the finger holes on top
      const pipe = new THREE.Group();
      pipe.position.set(0, 0.95, 0.27);
      pipe.rotation.x = 1.05;
      body.add(pipe);
      const c = v === 'bone' ? '#e8dcc0' : '#c8ccd0';
      put(pipe, rbox(0.035, 0.36, 0.035, 0.01), c, 0, -0.18, 0);
      put(pipe, rbox(0.042, 0.06, 0.042, 0.01), v === 'bone' ? '#b8a888' : '#3a3d42', 0, -0.01, 0);
      for (let i = 0; i < 6; i++) put(pipe, rbox(0.012, 0.012, 0.01, 0.003), '#2a2622', 0, -0.12 - i * 0.035, 0.018);
      if (v === 'bone') for (const y of [-0.1, -0.3]) put(pipe, rbox(0.04, 0.012, 0.04, 0.004), '#8a7a5a', 0, y, 0); // carved bands
      return { body, hand: null };
    }
    case 'fiddle': {
      // Under the chin on the left shoulder, the neck out along the left arm
      const f = new THREE.Group();
      f.position.set(0.14, 0.66, 0.2);
      f.rotation.set(0, -0.5, Math.PI / 2 - 0.25);
      body.add(f);
      put(f, rbox(0.17, 0.13, 0.07, 0.03), wood, 0, 0.07, 0);
      put(f, rbox(0.13, 0.05, 0.068, 0.015), shade(wood, 0.85), 0, 0, 0); // the waist
      put(f, rbox(0.19, 0.15, 0.07, 0.035), wood, 0, -0.08, 0);
      put(f, rbox(0.03, 0.04, 0.012, 0.005), dark, 0, -0.04, 0.036); // the bridge
      put(f, rbox(0.04, 0.26, 0.03, 0.01), dark, 0, 0.27, 0.01); // the neck
      put(f, rbox(0.045, 0.06, 0.05, 0.02), dark, 0, 0.42, 0); // the scroll
      put(f, rbox(0.04, 0.12, 0.01, 0.004), '#1a1410', 0, -0.13, 0.036); // the chin rest
      // The bow, in the right hand, across the strings
      put(hand, rbox(0.012, 0.6, 0.012, 0.004), dark, 0, -0.04, 0.24, Math.PI / 2 - 0.15);
      put(hand, rbox(0.006, 0.54, 0.02, 0.002), gut, 0, -0.07, 0.25, Math.PI / 2 - 0.15);
      return { body, hand };
    }
    case 'lute':
    case 'gurdy': {
      // Across the belly, the neck up and out to the left
      const l = new THREE.Group();
      l.position.set(-0.02, 0.32, 0.24);
      l.rotation.set(0.15, 0, v === 'lute' ? -0.85 : -1.45);
      body.add(l);
      if (v === 'lute') {
        put(l, rbox(0.3, 0.34, 0.16, 0.12), '#a0602a', 0, -0.04, 0);
        put(l, rbox(0.07, 0.07, 0.01, 0.03), '#2a1810', 0, 0, 0.081); // the rose
        put(l, rbox(0.05, 0.36, 0.035, 0.01), dark, 0, 0.3, 0.02);
        put(l, rbox(0.06, 0.12, 0.03, 0.01), dark, 0, 0.5, -0.03, -0.6); // the pegbox, bent back
        for (const x of [-0.015, 0, 0.015]) put(l, rbox(0.003, 0.5, 0.003, 0.001), gut, x, 0.15, 0.045);
      } else {
        // Hurdy-gurdy: a deep box, the key-box on top, the wheel's cover, and the crank
        put(l, rbox(0.24, 0.42, 0.16, 0.06), '#7a4a26', 0, 0, 0);
        put(l, rbox(0.1, 0.3, 0.05, 0.015), dark, 0, 0.04, 0.09);
        for (let i = 0; i < 6; i++) put(l, rbox(0.02, 0.02, 0.03, 0.005), '#e8dcc0', 0.06, -0.06 + i * 0.04, 0.1);
        put(l, rbox(0.2, 0.08, 0.17, 0.04), shade('#7a4a26', 0.8), 0, -0.22, 0);
        put(hand, rbox(0.03, 0.03, 0.1, 0.008), brass, 0, -0.02, 0.05); // the crank handle
      }
      return { body, hand: v === 'gurdy' ? hand : null };
    }
    case 'harp': {
      // A small harp on the chest: soundbox, neck and pillar, strings between
      const h = new THREE.Group();
      h.position.set(0.04, 0.42, 0.28);
      h.rotation.set(0, 0.25, 0);
      body.add(h);
      put(h, rbox(0.06, 0.46, 0.09, 0.02), wood, 0.12, 0, 0, 0, 0, 0.2); // soundbox, leaning
      put(h, rbox(0.3, 0.05, 0.05, 0.02), wood, 0.0, 0.24, 0, 0, 0, -0.15); // neck
      put(h, rbox(0.04, 0.44, 0.04, 0.015), dark, -0.14, 0.02, 0); // pillar
      put(h, rbox(0.05, 0.05, 0.05, 0.02), brass, -0.14, 0.26, 0);
      for (let i = 0; i < 6; i++) put(h, rbox(0.004, 0.36 - i * 0.04, 0.004, 0.001), brass, 0.08 - i * 0.04, 0.02 + i * 0.02, 0);
      return { body, hand: null };
    }
    case 'drum': {
      // A frame drum held up in the left hand, struck with a beater in the right
      const d = new THREE.Group();
      d.position.set(0.22, 0.52, 0.3);
      d.rotation.set(0, -0.6, 0);
      body.add(d);
      put(d, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), '#6a4a2a', 0, 0, 0, Math.PI / 2);
      put(d, new THREE.CylinderGeometry(0.186, 0.186, 0.066, 18), '#e0cfa0', 0, 0, 0.002, Math.PI / 2); // the skin
      put(d, rbox(0.04, 0.2, 0.02, 0.008), dark, 0, 0, -0.04); // the cross-brace behind
      put(hand, rbox(0.02, 0.26, 0.02, 0.006), dark, 0, -0.02, 0.1, Math.PI / 2);
      put(hand, rbox(0.045, 0.06, 0.045, 0.02), '#c8b088', 0, -0.02, 0.24);
      return { body, hand };
    }
    case 'horn': {
      // A coiled post horn at the mouth, the bell forward
      const h = new THREE.Group();
      h.position.set(0, 0.9, 0.28);
      body.add(h);
      put(h, rbox(0.03, 0.03, 0.12, 0.01), brass, 0, 0, 0);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; put(h, rbox(0.035, 0.035, 0.07, 0.012), brass, Math.cos(a) * 0.09, -0.06 + Math.sin(a) * 0.09, 0.12, 0, a, 0); }
      put(h, new THREE.ConeGeometry(0.08, 0.14, 10, 1, true), brass, 0, -0.06, 0.28, Math.PI / 2);
      return { body, hand: null };
    }
    case 'pipes': {
      // The bag under the left arm, three drones over the shoulder, the chanter down in front
      put(body, rbox(0.2, 0.2, 0.26, 0.08), '#4a2a3a', 0.3, 0.42, 0.04);
      for (let i = 0; i < 3; i++) {
        const len = [0.62, 0.48, 0.48][i];
        put(body, rbox(0.035, len, 0.035, 0.01), dark, 0.3 + i * 0.03 - 0.03, 0.5 + len / 2, -0.06 - i * 0.06, -0.35, 0, -0.25);
        put(body, rbox(0.05, 0.04, 0.05, 0.015), '#e8dcc0', 0.3 + i * 0.03 - 0.03 - Math.sin(0.25) * len, 0.5 + len - 0.02, -0.06 - i * 0.06 - Math.sin(0.35) * len * 0.5);
      }
      put(body, rbox(0.035, 0.4, 0.035, 0.01), dark, 0.04, 0.6, 0.3, 0.35);
      put(body, rbox(0.05, 0.05, 0.05, 0.015), '#e8dcc0', 0.04, 0.42, 0.37);
      put(body, rbox(0.02, 0.14, 0.02, 0.006), dark, 0.0, 0.9, 0.24, 0.9); // the blowpipe
      return { body, hand: null };
    }
  }
  return { body, hand: null };
}

const TOOLS = new Set<string>(['sword', 'bronzeSword', 'pickaxe', 'hatchet', 'rod', 'hammer', 'tongs']);

function heldMesh(kind: HeldItem): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, lam(color));
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    g.add(m);
  };
  const wood = '#6e4a2c', iron = '#8e959e', dark = '#3a3d42', bronze = '#c08a42';
  switch (kind) {
    case 'sword':
    case 'bronzeSword': {
      const blade = kind === 'sword' ? '#b4bcc6' : '#d6a052';
      add(rbox(0.07, 0.16, 0.07, 0.02), '#4a2e1c', 0, -0.02, 0);
      add(rbox(0.09, 0.06, 0.32, 0.02), kind === 'sword' ? dark : bronze, 0, 0.08, 0);
      add(rbox(0.05, 0.8, 0.12, 0.015), blade, 0, 0.5, 0);
      add(rbox(0.06, 0.06, 0.06, 0.02), kind === 'sword' ? dark : bronze, 0, -0.12, 0);
      add(new THREE.ConeGeometry(0.06, 0.14, 4), blade, 0, 0.96, 0);
      break;
    }
    case 'pickaxe':
      add(rbox(0.06, 0.95, 0.06, 0.02), wood, 0, 0.3, 0);
      add(rbox(0.08, 0.1, 0.62, 0.02), iron, 0, 0.74, 0.0);
      add(new THREE.ConeGeometry(0.045, 0.16, 4), iron, 0, 0.74, 0.38, Math.PI / 2);
      add(new THREE.ConeGeometry(0.045, 0.16, 4), iron, 0, 0.74, -0.38, -Math.PI / 2);
      break;
    case 'hatchet':
      add(rbox(0.06, 0.75, 0.06, 0.02), wood, 0, 0.25, 0);
      add(rbox(0.06, 0.24, 0.26, 0.02), iron, 0, 0.56, 0.12);
      break;
    case 'rod':
      add(new THREE.CylinderGeometry(0.018, 0.03, 2.2, 5), '#8a6a3a', 0, 1.0, 0);
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), dark, 0, 0.1, 0.06, 0, Math.PI / 2);
      break;
    case 'hammer':
      add(rbox(0.05, 0.55, 0.05, 0.02), wood, 0, 0.18, 0);
      add(rbox(0.14, 0.12, 0.26, 0.02), dark, 0, 0.45, 0.04);
      break;
    case 'tongs':
      add(rbox(0.03, 0.7, 0.03, 0.01), dark, 0.025, 0.25, 0);
      add(rbox(0.03, 0.7, 0.03, 0.01), dark, -0.025, 0.25, 0);
      break;
  }
  return g;
}

/** How far the thighs open (radians) for each metre a mount is wider than a horse. */
const SPREAD = 2.6;

export class Humanoid {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private handR = new THREE.Group();
  private handL = new THREE.Group();
  private cape: THREE.Mesh | null = null;
  private held: THREE.Group | null = null;
  /** Holding a bow (drawn upright in front when shooting), and the quiver that goes with it. */
  private bow = false;
  private quiver: THREE.Group | null = null;
  /** A tool by name, or a weapon by its item id (its model comes from data/weapons.ts). */
  heldKind: HeldItem | string = 'none';
  private offhand: THREE.Group | null = null;
  /** An instrument being played: its body on the torso, and what the right hand works (a bow, a beater). */
  private instr: { voice: InstrumentVoice; body: THREE.Group; hand: THREE.Group | null } | null = null;
  /** A note just played, fading: drives a strike or a pluck in the pose. */
  private pulse = 0;
  offhandKind: string | null = null;
  private phase = 0;
  private blink = 1 + Math.random() * 3;
  state: AnimState = 'idle';
  stateTime = 0;
  /** 0..1 progress hint for one-shot actions (attack, mine, chop). */
  actionSpeed = 1;
  comboIndex = 0;
  private capeSwing = 0;
  /** Lowest point of the model through a dodge roll, sampled on first use (see rollFloorAt). */
  private rollFloor: Float32Array | null = null;
  private eyeLids: THREE.Mesh;

  constructor(public look: Appearance) {
    // A costume goes on over the clothes and armour; the figure is built from what shows
    this.look = look = wearing(look);
    const build = look.build ?? 1;
    const s = (look.height ?? 1) * FIGURE;
    this.root.add(this.body);
    this.body.scale.setScalar(s);

    const part = (parent: THREE.Object3D, geo: THREE.BufferGeometry, color: string | THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, typeof color === 'string' ? lam(color) : color);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    // Hips sit at the top of the legs; everything hangs from here.
    const fem = look.frame === 'f';
    const top = look.top ?? 0, legs = look.legs ?? 0, shoes = look.shoes ?? 0;
    const shirt = look.shirt ?? shade(look.trim, 0.9), hose = look.hose ?? shade(look.trousers, 0.8), belt = look.belt ?? '#3b2618';
    const long = top === 2 || top === 5; // robe and gown reach the shins
    this.hips.position.y = 0.86;
    this.body.add(this.hips);
    // (up under the belt, so there's never daylight between the trousers and the shirt)
    part(this.hips, rbox((fem ? 0.54 : 0.5) * build, 0.36, 0.3, 0.05), look.trousers, 0, 0.07, 0);

    for (const [leg, shin, side] of [[this.legL, this.shinL, 1], [this.legR, this.shinR, -1]] as const) {
      leg.position.set(0.13 * side * build, -0.04, 0);
      this.hips.add(leg);
      const thigh = legs === 3 ? 0.26 : 0.22;
      part(leg, rbox(thigh, 0.42, thigh + 0.02, 0.05), legs === 2 ? hose : look.trousers, 0, -0.2, 0);
      shin.position.set(0, -0.4, 0);
      leg.add(shin);
      // Lower leg: trousers, or hose under breeches and kilts
      part(shin, rbox(legs === 3 ? 0.25 : 0.21, 0.24, legs === 3 ? 0.27 : 0.23, 0.05), legs === 1 || legs === 2 ? hose : look.trousers, 0, -0.1, 0);
      if (shoes === 1) part(shin, rbox(0.25, 0.42, 0.27, 0.05), look.boots, 0, -0.18, 0.01); // tall boots to the knee
      if (shoes === 2) {
        part(shin, rbox(0.22, 0.12, 0.31, 0.04), look.boots, 0, -0.37, 0.04);
      } else {
        part(shin, rbox(0.25, 0.22, 0.32, 0.06), look.boots, 0, -0.32, 0.03);
      }
      part(shin, rbox(0.27, 0.06, 0.34, 0.03), shade(look.boots, 0.7), 0, -0.41, 0.03);
    }
    // A kilt over the thighs, pleated
    if (legs === 2 && !long) {
      part(this.hips, rbox(0.56 * build, 0.38, 0.34, 0.04), look.trousers, 0, -0.18, 0);
      for (let i = -2; i <= 2; i++) part(this.hips, rbox(0.02, 0.36, 0.35, 0.005), shade(look.trousers, 0.75), i * 0.1 * build, -0.18, 0);
    }

    this.torso.position.y = 0.06;
    this.hips.add(this.torso);
    // The upper body, by cut: a vest shows its shirt, a doublet is closer-fitted and buttoned
    const body = top === 3 ? shirt : look.tunic;
    const chestW = (fem ? 0.48 : 0.6) * build, waistW = (fem ? 0.41 : 0.54) * build;
    part(this.torso, rbox(waistW, 0.38, 0.32, 0.06), body, 0, 0.36, 0);
    part(this.torso, rbox(chestW, 0.24, 0.34, 0.07), body, 0, 0.58, 0);
    if (fem) part(this.torso, rbox(0.4 * build, 0.16, 0.09, 0.045), body, 0, 0.51, 0.165);
    part(this.torso, rbox(waistW + 0.02, 0.09, 0.35, 0.03), belt, 0, 0.16, 0);
    part(this.torso, rbox(0.1, 0.08, 0.04, 0.015), '#c8a040', 0, 0.16, 0.18);
    const hem = shade(look.tunic, 0.9);
    if (top === 0 || top === 4 || top === 6) part(this.torso, rbox(waistW + 0.02, 0.2, 0.34, 0.04), hem, 0, 0.03, 0); // skirt below the belt
    if (top === 1) for (let i = 0; i < 4; i++) part(this.torso, rbox(0.04, 0.04, 0.02, 0.01), look.trim, 0, 0.62 - i * 0.12, 0.17);
    if (top === 3) {
      // The vest: two front panels and a back over the shirt
      for (const side of [1, -1]) part(this.torso, rbox(0.2 * build, 0.5, 0.05, 0.02), look.tunic, side * 0.15 * build, 0.45, 0.16);
      part(this.torso, rbox(chestW, 0.5, 0.05, 0.02), look.tunic, 0, 0.45, -0.17);
    }
    if (top === 4) for (let i = 0; i < 4; i++) part(this.torso, rbox(waistW + 0.03, 0.015, 0.345, 0.005), shade(look.tunic, 0.78), 0, 0.28 + i * 0.12, 0);
    if (top === 6) for (const side of [1, -1]) part(this.torso, rbox(0.06, 0.62, 0.35, 0.01), belt, side * 0.1, 0.42, 0, );
    if (long) {
      // Robe and gown: a long skirt from the belt to the shins, a gown flaring wider
      const w = (top === 5 ? 0.66 : 0.58) * build;
      part(this.hips, rbox(w, 0.72, top === 5 ? 0.46 : 0.38, 0.06), top === 5 ? look.tunic : hem, 0, -0.32, 0);
      part(this.hips, rbox(w + 0.02, 0.05, (top === 5 ? 0.46 : 0.38) + 0.02, 0.02), look.trim, 0, -0.66, 0);
      if (top === 5) part(this.torso, rbox(0.12, 0.42, 0.02, 0.01), shirt, 0, 0.44, 0.17); // laced bodice
    }
    if (top === 7) {
      // Long coat: tails at the back to the knee, and lapels
      part(this.torso, rbox(chestW, 0.6, 0.05, 0.02), look.tunic, 0, -0.12, -0.17);
      for (const side of [1, -1]) part(this.torso, rbox(0.08, 0.4, 0.03, 0.01), look.trim, side * 0.12, 0.5, 0.17);
    }
    // Collar trim
    part(this.torso, rbox(0.3, 0.06, 0.34, 0.02), look.trim, 0, 0.71, 0);
    if (look.apron) part(this.torso, rbox(0.42, 0.62, 0.04, 0.02), '#5a3a24', 0, 0.28, 0.18);
    if (look.shoulderPads) {
      for (const side of [1, -1]) part(this.torso, rbox(0.26, 0.15, 0.36, 0.06), look.shoulderPads, side * (fem ? 0.3 : 0.34) * build, 0.68, 0);
    }

    // Head
    this.head.position.set(0, 0.76, 0);
    this.torso.add(this.head);
    part(this.head, rbox(0.14, 0.08, 0.14, 0.03), look.skin, 0, 0.02, 0);
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture(look) });
    const skinMat = lam(look.skin);
    const headGeo = rbox(0.44, 0.46, 0.42, 0.07);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 0.28, 0);
    headMesh.castShadow = true;
    this.head.add(headMesh);
    const faceQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.42), faceMat);
    faceQuad.position.set(0, 0.28, 0.212);
    this.head.add(faceQuad);
    this.eyeLids = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.05), skinMat);
    this.eyeLids.position.set(0, 0.305, 0.215);
    this.eyeLids.visible = false;
    this.head.add(this.eyeLids);
    // Ears, and an earring
    for (const side of [1, -1]) part(this.head, rbox(0.06, 0.12, 0.08, 0.02), look.skin, side * 0.23, 0.27, 0);
    if (look.earring) part(this.head, rbox(0.03, 0.06, 0.03, 0.01), look.earring, 0.25, 0.18, 0.01);
    // The nose, standing out from the face (broader on a broad frame). It ends at the painted nose
    // shadow (face row 41), well above the mouth (rows 46-49), so the camera looking down sees both.
    const nw = look.frame === 'f' ? 0.06 : 0.07;
    part(this.head, rbox(nw, 0.075, 0.035, 0.014), shade(look.skin, 0.96), 0, 0.263, 0.226);
    this.buildBeard(part);
    this.buildHair(part);
    this.buildHelm(part);

    // Arms
    // Sleeves are the shirt's under a doublet, vest or jerkin
    const sleeve = top === 1 || top === 3 || top === 6 ? shirt : look.tunic;
    for (const [arm, fore, side] of [[this.armL, this.foreL, 1], [this.armR, this.foreR, -1]] as const) {
      arm.position.set((fem ? 0.33 : 0.37) * side * build, 0.64, 0);
      this.torso.add(arm);
      part(arm, rbox(fem ? 0.16 : 0.18, 0.32, fem ? 0.18 : 0.2, 0.05), sleeve, 0, -0.13, 0);
      fore.position.set(0, -0.3, 0);
      arm.add(fore);
      part(fore, rbox(fem ? 0.15 : 0.17, 0.26, fem ? 0.17 : 0.19, 0.05), shade(sleeve, 0.95), 0, -0.1, 0);
      part(fore, rbox(0.19, 0.07, 0.21, 0.02), look.trim, 0, -0.2, 0);
      part(fore, rbox(0.16, 0.15, 0.17, 0.05), look.gloves ?? look.skin, 0, -0.3, 0);
    }
    this.handR.position.set(0, -0.32, 0.02);
    this.buildArmour(part, build, fem, chestW, waistW);
    this.foreR.add(this.handR);
    this.handL.position.set(0, -0.3, 0.02);
    this.foreL.add(this.handL);

    if (look.cape) {
      const capeGeo = new THREE.PlaneGeometry(0.62 * build, 1.0, 2, 6);
      capeGeo.translate(0, -0.5, 0);
      this.cape = new THREE.Mesh(capeGeo, look.capeDesign
        ? new THREE.MeshLambertMaterial({ map: capeTexture(look.cape, look.trim, look.capeDesign), side: THREE.DoubleSide })
        : new THREE.MeshLambertMaterial({ color: look.cape, side: THREE.DoubleSide }));
      this.cape.position.set(0, 0.72, -0.18);
      this.cape.castShadow = true;
      this.torso.add(this.cape);
    }
    this.root.traverse((o) => { o.userData.humanoid = this; });
  }

  /** Facial hair in 3D: the jaw and chin, a moustache, chops and forks, shaded a little darker underneath. */
  private buildBeard(part: (p: THREE.Object3D, g: THREE.BufferGeometry, c: string, x: number, y: number, z: number) => THREE.Mesh): void {
    const fh = facialOf(this.look);
    if (!fh || fh === 2) return;
    const h = shade(this.look.hair, 0.95), d = shade(this.look.hair, 0.82);
    const b = (w: number, ht: number, dp: number, x: number, y: number, z: number, c = h) => part(this.head, rbox(w, ht, dp, 0.02), c, x, y, z);
    const moustache = () => { b(0.2, 0.04, 0.05, 0, 0.196, 0.238); for (const s of [1, -1]) b(0.05, 0.05, 0.04, s * 0.1, 0.175, 0.234, d); };
    const jaw = (low = 0) => {
      b(0.42, 0.11 + low, 0.06, 0, 0.105 - low / 2, 0.215);
      for (const s of [1, -1]) b(0.05, 0.24, 0.3, s * 0.215, 0.17, 0.06);
      b(0.3, 0.06 + low, 0.08, 0, 0.055 - low / 2, 0.205, d);
    };
    switch (fh) {
      case 1: jaw(); moustache(); break;
      case 3: moustache(); break;
      case 4: moustache(); b(0.12, 0.11, 0.06, 0, 0.1, 0.22); b(0.08, 0.05, 0.05, 0, 0.05, 0.21, d); break;
      case 5: for (const s of [1, -1]) b(0.04, 0.24, 0.3, s * 0.218, 0.17, 0.06); b(0.4, 0.05, 0.06, 0, 0.07, 0.205); break;
      case 6: jaw(0.04); moustache(); b(0.3, 0.22, 0.12, 0, -0.04, 0.17); b(0.2, 0.1, 0.1, 0, -0.18, 0.15, d); break;
      case 7: moustache(); for (const s of [1, -1]) b(0.08, 0.26, 0.16, s * 0.2, 0.16, 0.14); break;
      case 8: jaw(); moustache(); for (const s of [1, -1]) { b(0.1, 0.18, 0.1, s * 0.07, -0.04, 0.18); b(0.07, 0.08, 0.08, s * 0.08, -0.16, 0.17, d); } break;
    }
  }

  /**
   * Hair, built from pieces rather than a single cap: the crown with a few lighter tufts on top, the
   * temples and the nape, a fringe that's different for each style, and whatever hangs down. Under a
   * hat only what shows below its brim is built.
   */
  /** Armour over the clothes: the body, the shoulders, a tabard, the forearms, the legs and the feet. */
  private buildArmour(part: (p: THREE.Object3D, g: THREE.BufferGeometry, c: string, x: number, y: number, z: number) => THREE.Mesh, build: number, fem: boolean, chestW: number, waistW: number): void {
    const L = this.look, T = this.torso;
    const lit = (c: string) => shade(c, 1.18), deep = (c: string) => shade(c, 0.78);
    const ch = L.chestArmour;
    if (ch) {
      const c = ch.color, t = ch.trim ?? deep(c);
      if (ch.style === 'plate') {
        part(T, rbox(chestW + 0.06, 0.3, 0.4, 0.09), c, 0, 0.56, 0.01); // breastplate
        part(T, rbox(waistW + 0.05, 0.22, 0.38, 0.07), c, 0, 0.34, 0.01);
        part(T, rbox(0.04, 0.44, 0.03, 0.01), lit(c), 0, 0.46, 0.205); // the ridge down the middle
        for (let i = 0; i < 3; i++) part(T, rbox(waistW + 0.08 + i * 0.02, 0.07, 0.4 + i * 0.01, 0.02), i % 2 ? deep(c) : c, 0, 0.19 - i * 0.075, 0.01); // fauld
        part(T, rbox(chestW * 0.62, 0.05, 0.06, 0.015), t, 0, 0.7, 0.18); // the rolled edge at the neck
        for (const sd of [1, -1]) part(T, rbox(0.035, 0.035, 0.02, 0.008), t, sd * 0.16 * build, 0.6, 0.215); // rivets
      } else if (ch.style === 'scale') {
        part(T, rbox(chestW + 0.04, 0.54, 0.38, 0.07), deep(c), 0, 0.44, 0);
        for (let r = 0; r < 6; r++) for (let k = -2; k <= 2; k++) {
          const x = k * 0.11 * build + (r % 2 ? 0.055 : 0);
          if (Math.abs(x) > chestW / 2) continue;
          part(T, rbox(0.1, 0.075, 0.025, 0.015), (r + k) % 3 ? c : lit(c), x, 0.66 - r * 0.085, 0.195);
        }
        part(T, rbox(chestW * 0.66, 0.05, 0.06, 0.015), t, 0, 0.71, 0.17);
      } else if (ch.style === 'brigandine') {
        part(T, rbox(chestW + 0.05, 0.52, 0.39, 0.07), c, 0, 0.45, 0);
        for (let r = 0; r < 5; r++) for (let k = -2; k <= 2; k++) part(T, rbox(0.03, 0.03, 0.015, 0.008), t, k * 0.1 * build, 0.64 - r * 0.1, 0.2);
        for (const sd of [1, -1]) part(T, rbox(0.03, 0.5, 0.012, 0.005), deep(c), sd * 0.22 * build, 0.45, 0.2); // seams
      } else if (ch.style === 'cuirass') {
        part(T, rbox(chestW + 0.03, 0.48, 0.37, 0.08), c, 0, 0.46, 0);
        for (const y of [0.69, 0.23]) part(T, rbox(chestW + 0.04, 0.03, 0.375, 0.01), t, 0, y, 0); // stitched edges
        for (const sd of [1, -1]) {
          part(T, rbox(0.06, 0.03, 0.4, 0.01), t, sd * 0.17, 0.72, 0); // straps over the shoulders
          part(T, rbox(0.05, 0.05, 0.02, 0.01), '#c8a050', sd * 0.17, 0.5, 0.195); // buckles
        }
      } else {
        part(T, rbox(chestW + 0.03, 0.56, 0.37, 0.06), c, 0, 0.44, 0);
        for (let r = 0; r < 8; r++) part(T, rbox(chestW + 0.035, 0.012, 0.375, 0.004), r % 2 ? deep(c) : lit(c), 0, 0.68 - r * 0.065, 0); // the rows of rings
        part(T, rbox(waistW + 0.06, 0.16, 0.38, 0.04), c, 0, 0.08, 0); // the skirt of it
      }
    }
    const tb = L.tabard;
    if (tb) {
      for (const z of [0.205, -0.205]) {
        part(T, rbox(0.36 * build, 0.92, 0.025, 0.01), tb.color, 0, 0.22, z);
        part(T, rbox(0.37 * build, 0.04, 0.03, 0.01), tb.trim, 0, -0.22, z); // hem
        for (const sd of [1, -1]) part(T, rbox(0.025, 0.9, 0.03, 0.005), tb.trim, sd * 0.18 * build, 0.22, z); // edges
      }
      if (tb.emblem) {
        const e = part(T, rbox(0.13, 0.13, 0.012, 0.01), tb.emblem, 0, 0.48, 0.222);
        e.rotation.z = Math.PI / 4;
        part(T, rbox(0.04, 0.2, 0.014, 0.005), tb.emblem, 0, 0.3, 0.222);
      }
    }
    const sh = L.shoulders;
    if (sh) {
      const c = sh.color, t = sh.trim ?? deep(c);
      if (sh.style === 'mantle' || sh.style === 'fur') {
        // Over the shoulders and round the back of the neck
        const fur = sh.style === 'fur';
        part(T, rbox(chestW + 0.18, fur ? 0.16 : 0.12, 0.44, fur ? 0.07 : 0.04), c, 0, 0.7, 0);
        part(T, rbox(chestW + 0.08, fur ? 0.22 : 0.32, 0.05, 0.03), fur ? deep(c) : c, 0, fur ? 0.6 : 0.55, -0.21);
        if (fur) for (let k = -3; k <= 3; k++) part(T, rbox(0.08, 0.08 + (k % 2 ? 0.03 : 0), 0.08, 0.03), k % 2 ? lit(c) : c, k * 0.09 * build, 0.8, (k % 3) * 0.04);
        else part(T, rbox(chestW + 0.2, 0.03, 0.45, 0.01), t, 0, 0.64, 0); // its edge
      } else {
        for (const [arm, side] of [[this.armL, 1], [this.armR, -1]] as const) {
          if (sh.style === 'leather') {
            part(arm, rbox(0.25, 0.12, 0.28, 0.05), c, side * 0.02, 0.03, 0);
            part(arm, rbox(0.26, 0.025, 0.29, 0.01), t, side * 0.02, -0.03, 0);
            continue;
          }
          part(arm, rbox(0.28, 0.13, 0.31, 0.07), c, side * 0.025, 0.04, 0); // the cop over the point of the shoulder
          part(arm, rbox(0.26, 0.08, 0.29, 0.03), sh.style === 'layered' ? deep(c) : c, side * 0.04, -0.05, 0);
          if (sh.style === 'layered') part(arm, rbox(0.24, 0.07, 0.27, 0.03), c, side * 0.055, -0.12, 0);
          part(arm, rbox(0.29, 0.025, 0.32, 0.008), t, side * 0.025, -0.015, 0); // its rolled edge
          if (sh.style === 'spiked') for (const dz of [-0.07, 0.07]) {
            const sp = part(arm, new THREE.ConeGeometry(0.03, 0.14, 5), lit(c), side * 0.06, 0.15, dz);
            sp.rotation.z = -side * 0.4;
          }
        }
      }
    }
    const br = L.bracers;
    if (br) for (const fore of [this.foreL, this.foreR]) {
      if (br.style === 'plate') {
        part(fore, rbox(0.2, 0.2, 0.22, 0.05), br.color, 0, -0.13, 0);
        part(fore, rbox(0.17, 0.1, 0.17, 0.04), lit(br.color), 0, 0.02, -0.02); // the cop at the elbow
      } else {
        part(fore, rbox(0.19, 0.19, 0.21, 0.05), br.color, 0, -0.13, 0);
        for (const y of [-0.07, -0.13, -0.19]) part(fore, rbox(0.195, 0.012, 0.215, 0.004), br.trim ?? deep(br.color), 0, y, 0); // lacing
      }
    }
    const lg = L.legArmour;
    if (lg) {
      const c = lg.color, t = lg.trim ?? deep(c);
      if (lg.style === 'tassets' || lg.style === 'plate') for (const sd of [1, -1]) part(this.hips, rbox(0.22, 0.2, 0.05, 0.02), lg.style === 'plate' ? deep(c) : c, sd * 0.13 * build, -0.1, 0.17);
      for (const [leg, shin] of [[this.legL, this.shinL], [this.legR, this.shinR]] as const) {
        if (lg.style === 'plate') {
          part(leg, rbox(0.26, 0.3, 0.27, 0.06), c, 0, -0.17, 0.01); // cuisse
          part(leg, rbox(0.2, 0.11, 0.1, 0.03), lit(c), 0, -0.38, 0.13); // the knee cop
          part(shin, rbox(0.25, 0.22, 0.28, 0.05), c, 0, -0.09, 0.01); // greave
          part(shin, rbox(0.04, 0.2, 0.02, 0.01), lit(c), 0, -0.09, 0.15);
        } else if (lg.style === 'leather') {
          part(leg, rbox(0.24, 0.28, 0.06, 0.02), c, 0, -0.18, 0.12);
          part(shin, rbox(0.24, 0.2, 0.27, 0.05), c, 0, -0.09, 0.01);
          for (const y of [-0.03, -0.1, -0.17]) part(shin, rbox(0.245, 0.014, 0.275, 0.004), t, 0, y, 0.01); // wraps
        } else part(leg, rbox(0.24, 0.12, 0.05, 0.02), deep(c), 0, -0.18, 0.13);
      }
    }
    if (L.sabatons) for (const shin of [this.shinL, this.shinR]) {
      part(shin, rbox(0.27, 0.1, 0.34, 0.04), L.sabatons.color, 0, -0.33, 0.05);
      part(shin, rbox(0.25, 0.04, 0.12, 0.02), lit(L.sabatons.color), 0, -0.3, 0.17);
    }
  }

  /** A helm on the head, over the hair. */
  private buildHelm(part: (p: THREE.Object3D, g: THREE.BufferGeometry, c: string, x: number, y: number, z: number) => THREE.Mesh): void {
    const hm = this.look.helm;
    if (!hm) return;
    const H = this.head, c = hm.color, t = hm.trim ?? shade(c, 0.75), dark = '#0c0a0a';
    switch (hm.style) {
      case 'nasal':
      case 'horned':
        part(H, rbox(0.48, 0.24, 0.46, 0.12), c, 0, 0.49, 0);
        part(H, rbox(0.5, 0.06, 0.48, 0.02), t, 0, 0.38, 0); // the band
        part(H, rbox(0.05, 0.18, 0.04, 0.01), c, 0, 0.27, 0.235); // nasal
        part(H, rbox(0.04, 0.2, 0.03, 0.01), shade(c, 1.15), 0, 0.55, 0.2); // ridge
        if (hm.style === 'horned') for (const sd of [1, -1]) {
          const horn = part(H, new THREE.ConeGeometry(0.05, 0.3, 6), '#e8dcc0', sd * 0.3, 0.5, 0);
          horn.rotation.z = -sd * 1.0;
        }
        break;
      case 'kettle':
        part(H, rbox(0.47, 0.22, 0.45, 0.1), c, 0, 0.5, 0);
        part(H, rbox(0.7, 0.04, 0.68, 0.02), c, 0, 0.4, 0); // the brim
        part(H, rbox(0.72, 0.02, 0.7, 0.01), t, 0, 0.385, 0);
        break;
      case 'sallet':
        part(H, rbox(0.5, 0.3, 0.48, 0.13), c, 0, 0.46, -0.01);
        part(H, rbox(0.44, 0.08, 0.2, 0.03), c, 0, 0.34, -0.27).rotation.x = -0.3; // the tail over the neck
        part(H, rbox(0.47, 0.13, 0.07, 0.03), shade(c, 0.92), 0, 0.33, 0.225); // the visor
        part(H, rbox(0.36, 0.022, 0.012, 0.004), dark, 0, 0.335, 0.262); // its slit
        break;
      // (the closed helms stand forward of the face, nose and all, and out past the ears, so nothing of the head shows through)
      case 'barbute':
        part(H, rbox(0.55, 0.52, 0.5, 0.13), c, 0, 0.3, 0.012);
        part(H, rbox(0.3, 0.045, 0.012, 0.004), dark, 0, 0.32, 0.264); // the T of the opening
        part(H, rbox(0.09, 0.2, 0.012, 0.004), dark, 0, 0.2, 0.264);
        part(H, rbox(0.04, 0.24, 0.03, 0.01), shade(c, 1.15), 0, 0.47, 0.22);
        break;
      case 'great':
        part(H, rbox(0.55, 0.52, 0.5, 0.07), c, 0, 0.29, 0.012);
        part(H, rbox(0.57, 0.05, 0.52, 0.01), t, 0, 0.42, 0.012); // reinforcing band
        part(H, rbox(0.38, 0.03, 0.012, 0.004), dark, 0, 0.335, 0.264); // the sight
        for (let k = 0; k < 3; k++) for (const sd of [1, -1]) part(H, rbox(0.025, 0.025, 0.012, 0.004), dark, sd * (0.06 + k * 0.05), 0.2, 0.264); // breaths
        part(H, rbox(0.04, 0.2, 0.012, 0.004), t, 0, 0.18, 0.264);
        break;
    }
    if (hm.plume) {
      part(H, rbox(0.07, 0.2, 0.34, 0.03), hm.plume, 0, 0.66, -0.06);
      part(H, rbox(0.07, 0.14, 0.12, 0.03), shade(hm.plume, 0.85), 0, 0.6, -0.26);
    }
  }

  private buildHair(part: (p: THREE.Object3D, g: THREE.BufferGeometry, c: string | THREE.Material, x: number, y: number, z: number) => THREE.Mesh): void {
    if (this.look.helm) return; // the helm covers it
    const h = this.look.hair;
    const hat = this.look.hat ?? 'none';
    const style = this.look.hairStyle;
    const fem = this.look.frame === 'f';
    /** A piece of hair: shade above 1 for the lit tops, below for the undersides. */
    // Bright roots (style 13): the hair over the top of the head, crown and fringe, grows out in a second colour
    const roots = style === 13 ? this.look.hairRoots ?? '#7fe05a' : null;
    const p = (w: number, ht: number, d: number, x: number, y: number, z: number, tone = 1, r = 0.025) => { const c = roots && y > 0.47 ? roots : h; return part(this.head, rbox(w, ht, d, r), tone === 1 ? c : shade(c, tone), x, y, z); };
    if (hat === 'coif') {
      // A mail coif: the whole head but the face
      const mail = this.look.hatColor ?? '#9aa0a8';
      part(this.head, rbox(0.5, 0.18, 0.48, 0.08), mail, 0, 0.52, -0.01);
      part(this.head, rbox(0.5, 0.5, 0.14, 0.05), mail, 0, 0.3, -0.18);
      for (const s of [1, -1]) part(this.head, rbox(0.06, 0.52, 0.42, 0.03), mail, s * 0.25, 0.26, 0);
      return;
    }
    if (hat === 'turnip') {
      // A carved turnip over the whole head: cream flesh, a purple crown, leaves, and the candle showing through
      const glow = new THREE.MeshLambertMaterial({ color: '#ffc060', emissive: new THREE.Color('#ff8a20'), emissiveIntensity: 1.3 });
      part(this.head, rbox(0.66, 0.5, 0.64, 0.16), '#e8dcc0', 0, 0.27, 0.01);
      part(this.head, rbox(0.6, 0.16, 0.58, 0.12), '#7a3a6a', 0, 0.56, 0.01);
      for (const [x, rz] of [[-0.06, 0.3], [0.04, -0.2], [0.1, -0.5]] as const) { const l = part(this.head, rbox(0.06, 0.26, 0.04, 0.02), '#5a8a3a', x, 0.76, 0); l.rotation.z = rz; }
      for (const sx of [-0.13, 0.13]) part(this.head, rbox(0.11, 0.09, 0.03, 0.01), glow, sx, 0.35, 0.335);
      part(this.head, rbox(0.3, 0.06, 0.03, 0.01), glow, 0, 0.16, 0.335);
      for (const sx of [-0.1, 0, 0.1]) part(this.head, rbox(0.05, 0.04, 0.03, 0.01), glow, sx, 0.2, 0.335);
      return;
    }
    if (hat === 'pumpkin') {
      // The Wake Fair's prize: a whole pumpkin over the head, ribbed, carved in a grin and lit from inside
      const glow = new THREE.MeshLambertMaterial({ color: '#ffc060', emissive: new THREE.Color('#ff8a20'), emissiveIntensity: 1.3 });
      part(this.head, rbox(0.62, 0.56, 0.6, 0.16), '#e8801e', 0, 0.28, 0.01);
      for (const [w, d, ry] of [[0.74, 0.34, 0], [0.34, 0.72, 0], [0.7, 0.34, Math.PI / 4], [0.7, 0.34, -Math.PI / 4]] as const) { const l = part(this.head, rbox(w, 0.5, d, 0.12), '#c8641a', 0, 0.27, 0.01); l.rotation.y = ry; }
      part(this.head, rbox(0.24, 0.06, 0.24, 0.03), '#9a4a14', 0, 0.57, 0.01);
      { const st = part(this.head, rbox(0.08, 0.2, 0.08, 0.02), '#5a5a26', 0.02, 0.68, 0); st.rotation.z = 0.2; }
      for (const sx of [-1, 1]) { part(this.head, rbox(0.13, 0.05, 0.03, 0.01), glow, sx * 0.13, 0.34, 0.37); part(this.head, rbox(0.07, 0.04, 0.03, 0.01), glow, sx * 0.13, 0.385, 0.37); }
      part(this.head, rbox(0.06, 0.05, 0.03, 0.01), glow, 0, 0.26, 0.37);
      part(this.head, rbox(0.36, 0.06, 0.03, 0.01), glow, 0, 0.15, 0.37);
      part(this.head, rbox(0.24, 0.04, 0.03, 0.01), glow, 0, 0.11, 0.37);
      return;
    }
    // Costume heads (data/costumes.ts): each covers the whole head, so no hair under it
    if (hat === 'skull') {
      const bone = '#e8e2d0', hole = '#141016';
      part(this.head, rbox(0.54, 0.34, 0.52, 0.14), bone, 0, 0.38, 0.01);               // the brow and crown
      part(this.head, rbox(0.46, 0.2, 0.46, 0.08), bone, 0, 0.17, 0.03);                // cheekbones and jaw
      for (const sx of [-0.12, 0.12]) part(this.head, rbox(0.14, 0.13, 0.03, 0.03), hole, sx, 0.33, 0.27);
      part(this.head, rbox(0.06, 0.07, 0.03, 0.01), hole, 0, 0.23, 0.27);                // the nose
      part(this.head, rbox(0.3, 0.07, 0.03, 0.01), bone, 0, 0.12, 0.265);
      for (let k = -2; k <= 2; k++) part(this.head, rbox(0.012, 0.07, 0.03, 0.002), hole, k * 0.06, 0.12, 0.275); // the teeth
      // A black hood behind the mask
      part(this.head, rbox(0.58, 0.5, 0.2, 0.08), '#16141a', 0, 0.32, -0.2);
      for (const sd of [1, -1]) part(this.head, rbox(0.06, 0.5, 0.36, 0.03), '#16141a', sd * 0.29, 0.3, -0.04);
      return;
    }
    if (hat === 'sack') {
      const sack = '#b89a68', stitch = '#3a2a1e';
      part(this.head, rbox(0.56, 0.56, 0.54, 0.16), sack, 0, 0.29, 0.01);
      for (const sx of [-0.12, 0.12]) { const a = part(this.head, rbox(0.12, 0.025, 0.02, 0.005), stitch, sx, 0.34, 0.28); a.rotation.z = 0.7; const b = part(this.head, rbox(0.12, 0.025, 0.02, 0.005), stitch, sx, 0.34, 0.28); b.rotation.z = -0.7; }
      part(this.head, rbox(0.28, 0.025, 0.02, 0.005), stitch, 0, 0.17, 0.28);
      for (let k = -3; k <= 3; k++) part(this.head, rbox(0.012, 0.07, 0.02, 0.002), stitch, k * 0.04, 0.17, 0.285);
      part(this.head, rbox(0.5, 0.06, 0.48, 0.02), '#8a6a3a', 0, 0.04, 0.01);           // tied at the neck with twine
      // The straw hat on top, and straw coming out from under it
      part(this.head, rbox(0.82, 0.04, 0.8, 0.02), '#d8b860', 0, 0.58, 0);
      part(this.head, rbox(0.44, 0.2, 0.44, 0.05), '#c8a850', 0, 0.69, 0);
      for (const [x, z, rz] of [[-0.3, 0.1, 0.9], [0.3, 0.05, -0.9], [-0.28, -0.12, 1.2], [0.29, -0.1, -1.1], [0.05, 0.3, 0]] as const) { const t = part(this.head, rbox(0.04, 0.16, 0.04, 0.01), '#e8c860', x, 0.06, z); t.rotation.z = rz; }
      return;
    }
    if (hat === 'sheet') {
      const lin = '#f4f2ec';
      part(this.head, rbox(0.62, 0.64, 0.6, 0.24), lin, 0, 0.3, 0);
      part(this.head, rbox(0.7, 0.14, 0.66, 0.06), lin, 0, -0.02, 0);                   // where it falls to the shoulders
      for (const sx of [-0.11, 0.11]) part(this.head, rbox(0.1, 0.13, 0.03, 0.04), '#141016', sx, 0.34, 0.3);
      return;
    }
    if (hat === 'crow') {
      const c = this.look.hatColor ?? '#16141a';
      part(this.head, rbox(0.54, 0.34, 0.52, 0.12), c, 0, 0.44, -0.01);
      part(this.head, rbox(0.54, 0.46, 0.2, 0.06), c, 0, 0.28, -0.18);
      for (const sd of [1, -1]) part(this.head, rbox(0.06, 0.46, 0.44, 0.03), c, sd * 0.27, 0.3, 0);
      part(this.head, rbox(0.46, 0.22, 0.06, 0.04), '#2a2420', 0, 0.3, 0.24);           // the mask over the face
      const glass = new THREE.MeshLambertMaterial({ color: '#e8a030', emissive: new THREE.Color('#a05010'), emissiveIntensity: 0.8 });
      for (const sx of [-0.11, 0.11]) part(this.head, rbox(0.1, 0.1, 0.03, 0.04), glass, sx, 0.33, 0.275);
      const beak = part(this.head, rbox(0.14, 0.12, 0.42, 0.03), '#6a4a2a', 0, 0.2, 0.44);
      beak.rotation.x = 0.35;
      const tip = part(this.head, rbox(0.08, 0.07, 0.16, 0.02), '#4a3220', 0, 0.08, 0.64);
      tip.rotation.x = 0.6;
      return;
    }
    if (hat === 'hood') {
      const c = this.look.hatColor ?? '#4a5a3a';
      part(this.head, rbox(0.52, 0.32, 0.5, 0.1), c, 0, 0.48, -0.02);
      part(this.head, rbox(0.52, 0.42, 0.18, 0.06), c, 0, 0.28, -0.18);
      for (const s of [1, -1]) part(this.head, rbox(0.06, 0.44, 0.44, 0.03), c, s * 0.25, 0.3, 0);
      part(this.head, rbox(0.42, 0.05, 0.05, 0.02), shade(c, 0.75), 0, 0.5, 0.23);
      if (style !== 3 && style !== 9) p(0.3, 0.05, 0.03, -0.03, 0.47, 0.222, 1.0, 0.012);
      return;
    }
    const covered = hat === 'cap' || hat === 'wide' || hat === 'straw' || hat === 'beret' || hat === 'kerchief' || hat === 'fool' || hat === 'feathered' || hat === 'bobble' || hat === 'witch' || hat === 'tricorn';
    const shaved = style === 3 || style === 9;
    if (shaved) {
      p(0.45, 0.035, 0.43, 0, 0.515, 0, 0.78, 0.015);
      for (const s of [1, -1]) p(0.03, 0.14, 0.3, s * 0.222, 0.42, -0.04, 0.78, 0.01);
    } else {
      // Crown, temples, nape
      p(0.48, 0.1, 0.46, 0, 0.555, -0.01);
      if (!covered && style !== 2 && style !== 6 && style !== 7) {
        p(0.18, 0.05, 0.2, -0.09, 0.615, 0.03, 1.12);
        p(0.15, 0.04, 0.17, 0.1, 0.61, -0.06, 1.06);
        p(0.13, 0.04, 0.13, -0.02, 0.612, -0.17, 0.96);
      }
      // The sides, from the nape forward to the temples, and down behind the ears (no bare patch above or behind them)
      if (style !== 10) for (const s of [1, -1]) {
        p(0.05, 0.22, 0.36, s * 0.236, 0.43, -0.02, 0.96);
        p(0.04, 0.15, 0.06, s * 0.232, 0.455, 0.175, 0.98, 0.012);
        p(0.05, 0.13, 0.15, s * 0.236, 0.27, -0.12, 0.92, 0.015);
      }
      p(0.48, 0.3, 0.1, 0, 0.39, -0.19, 0.94);
      p(0.38, 0.06, 0.08, 0, 0.22, -0.19, 0.88);
      if (!fem && (style === 0 || style === 8 || style === 10)) for (const s of [1, -1]) p(0.035, 0.1, 0.06, s * 0.226, 0.33, 0.12, 0.9, 0.01);
    }
    // The fringe across the forehead (the face's front is at z 0.21)
    const Z = 0.228;
    const fringe = (pieces: [number, number, number][]) => { for (const [x, w, ht] of pieces) p(w, ht, 0.045, x, 0.515 - ht / 2, Z, 1.02, 0.015); };
    switch (style) {
      case 0: fringe([[-0.15, 0.14, 0.1], [-0.02, 0.14, 0.08], [0.11, 0.13, 0.06], [0.19, 0.06, 0.04]]); if (!covered) { p(0.32, 0.07, 0.14, -0.04, 0.625, 0.13, 1.1, 0.03); p(0.18, 0.05, 0.1, 0.12, 0.615, 0.15, 1.04, 0.02); } break;
      case 1: case 4: case 11: case 13: fringe([[-0.14, 0.15, 0.07], [-0.2, 0.05, 0.12], [0.14, 0.15, 0.07], [0.2, 0.05, 0.12]]); break;
      case 5: fringe([[-0.12, 0.2, 0.1], [0.08, 0.2, 0.1], [0.19, 0.06, 0.08]]); break;
      case 8: for (const [x, y] of [[-0.14, 0.49], [0.0, 0.5], [0.14, 0.49]]) p(0.12, 0.1, 0.08, x, y, 0.21, 1.04, 0.04); break;
      case 10: fringe([[0.04, 0.32, 0.06]]); p(0.13, 0.15, 0.05, 0.14, 0.45, Z, 1.04, 0.015); break;
      case 12: fringe([[-0.16, 0.12, 0.12], [-0.03, 0.12, 0.09], [0.1, 0.12, 0.13], [0.2, 0.06, 0.08]]); break;
      default: if (!shaved) p(0.42, 0.035, 0.04, 0, 0.51, 0.222, 1, 0.01);
    }
    // What hangs down, by style
    switch (style) {
      case 13: // bright roots: long and loose like 1, the top another colour (below)
      case 1: // long, loose
        for (const s of [1, -1]) { p(0.07, 0.42, 0.22, s * 0.24, 0.25, 0.04, 0.96); p(0.06, 0.08, 0.16, s * 0.24, 0.0, 0.05, 0.9); }
        p(0.48, 0.5, 0.1, 0, 0.2, -0.21, 0.94);
        for (const [x, w, ht] of [[-0.16, 0.14, 0.07], [0.02, 0.14, 0.1], [0.17, 0.12, 0.06]] as const) p(w, ht, 0.09, x, -0.05 - ht / 2, -0.21, 0.88);
        break;
      case 2: // topknot
        p(0.17, 0.15, 0.17, 0, 0.66, -0.06, 1.05, 0.06);
        p(0.11, 0.06, 0.11, 0, 0.75, -0.06, 1.12, 0.04);
        part(this.head, rbox(0.12, 0.05, 0.12, 0.02), '#a8442e', 0, 0.595, -0.06);
        break;
      case 4: // two braids down the back
        for (const s of [1, -1]) {
          for (let k = 0; k < 5; k++) p(0.09, 0.09, 0.09, s * 0.19 + (k % 2 ? 0.012 : -0.012) * s, 0.27 - k * 0.085, -0.13, k % 2 ? 0.92 : 1.02, 0.03);
          part(this.head, rbox(0.1, 0.04, 0.1, 0.015), '#e2c070', s * 0.19, -0.15, -0.13);
          p(0.06, 0.06, 0.06, s * 0.19, -0.2, -0.13, 0.9, 0.02);
        }
        break;
      case 5: // bob, to the jaw all round
        for (const s of [1, -1]) p(0.08, 0.36, 0.42, s * 0.245, 0.3, -0.02, 0.95);
        p(0.5, 0.36, 0.1, 0, 0.3, -0.21, 0.93);
        break;
      case 6: // ponytail, tied with a thong
        part(this.head, rbox(0.1, 0.08, 0.06, 0.02), '#3a2a1a', 0, 0.44, -0.255);
        p(0.13, 0.14, 0.1, 0, 0.34, -0.28, 1.0, 0.04);
        p(0.11, 0.14, 0.09, 0, 0.21, -0.3, 0.95, 0.04);
        p(0.08, 0.12, 0.08, 0, 0.09, -0.3, 0.9, 0.03);
        break;
      case 7: // bun
        p(0.21, 0.17, 0.17, 0, 0.49, -0.27, 1.0, 0.07);
        p(0.14, 0.06, 0.12, 0, 0.59, -0.26, 1.1, 0.04);
        break;
      case 8: // curls all over
        for (const [cx, cy, cz] of [[-0.16, 0.6, 0.06], [0, 0.63, 0.08], [0.16, 0.6, 0.06], [-0.2, 0.58, -0.12], [0.2, 0.58, -0.12], [0, 0.61, -0.16], [-0.25, 0.42, -0.04], [0.25, 0.42, -0.04], [-0.15, 0.36, -0.22], [0.15, 0.36, -0.22]]) p(0.14, 0.14, 0.14, cx, cy, cz, (cx + cz) % 0.2 > 0 ? 1.06 : 0.96, 0.06);
        break;
      case 9: // mohawk: a crest, tallest at the crown
        [[0.16, 0.1], [0.06, 0.15], [-0.05, 0.18], [-0.16, 0.13]].forEach(([z, ht], i) => p(0.1, ht, 0.11, 0, 0.52 + ht / 2, z, i % 2 ? 0.95 : 1.06, 0.03));
        break;
      case 10: // undercut: long on top, swept over
        p(0.42, 0.1, 0.44, 0.03, 0.61, 0, 1.06);
        p(0.12, 0.16, 0.3, 0.2, 0.53, 0.02, 0.98);
        break;
      case 11: // twin tails
        for (const s of [1, -1]) {
          part(this.head, rbox(0.08, 0.06, 0.06, 0.02), '#a8442e', s * 0.26, 0.47, -0.1);
          p(0.11, 0.14, 0.1, s * 0.29, 0.37, -0.12, 1.02, 0.04);
          p(0.09, 0.18, 0.09, s * 0.31, 0.21, -0.13, 0.94, 0.03);
          p(0.07, 0.1, 0.07, s * 0.31, 0.07, -0.13, 0.9, 0.03);
        }
        break;
      case 12: // wild mane
        p(0.56, 0.2, 0.52, 0, 0.57, -0.03, 1.02, 0.06);
        p(0.56, 0.6, 0.16, 0, 0.2, -0.22, 0.94, 0.05);
        for (const s of [1, -1]) { p(0.1, 0.5, 0.34, s * 0.27, 0.24, -0.06, 0.96, 0.04); p(0.08, 0.14, 0.12, s * 0.3, -0.04, -0.02, 0.88, 0.03); }
        for (const [x, z] of [[-0.18, 0.1], [0.05, 0.14], [0.2, -0.05], [-0.1, -0.2]]) p(0.12, 0.08, 0.12, x, 0.69, z, 1.1, 0.04);
        break;
    }

    if (hat === 'cap') part(this.head, rbox(0.5, 0.12, 0.5, 0.05), this.look.hatColor ?? '#6a3a2a', 0, 0.6, 0);
    if (hat === 'wide' || hat === 'straw') {
      const c = hat === 'straw' ? '#d8b860' : this.look.hatColor ?? '#3a3a32';
      part(this.head, rbox(0.8, 0.04, 0.8, 0.02), c, 0, 0.6, 0);
      part(this.head, rbox(0.46, 0.2, 0.46, 0.06), c, 0, 0.7, 0);
      part(this.head, rbox(0.47, 0.05, 0.47, 0.02), hat === 'straw' ? '#a8382c' : shade(c, 0.6), 0, 0.64, 0);
    }
    if (hat === 'beret') { const c = this.look.hatColor ?? '#2e3a5a'; const b = part(this.head, rbox(0.52, 0.1, 0.5, 0.05), c, -0.04, 0.62, 0); b.rotation.z = 0.15; }
    if (hat === 'circlet') {
      const c = this.look.hatColor === '#d8d0b8' ? '#d8d0b8' : '#d8b04a';
      part(this.head, rbox(0.5, 0.04, 0.48, 0.01), c, 0, 0.5, 0);
      part(this.head, rbox(0.06, 0.06, 0.03, 0.01), '#5fd0e6', 0, 0.51, 0.245);
    }
    if (hat === 'band') part(this.head, rbox(0.5, 0.06, 0.48, 0.02), this.look.hatColor ?? '#a8382c', 0, 0.49, 0);
    if (hat === 'kerchief') { part(this.head, rbox(0.52, 0.14, 0.5, 0.06), this.look.hatColor ?? '#a8382c', 0, 0.57, -0.02); part(this.head, rbox(0.14, 0.14, 0.08, 0.03), this.look.hatColor ?? '#a8382c', 0, 0.44, -0.27); }
    // Festival hats (data/seasons.ts)
    if (hat === 'fool') {
      part(this.head, rbox(0.52, 0.14, 0.5, 0.06), '#c8401e', 0, 0.58, 0);
      for (const [sx, c] of [[1, '#c8401e'], [-1, '#f2d75a']] as const) {
        const horn = part(this.head, rbox(0.12, 0.42, 0.12, 0.05), c, sx * 0.17, 0.78, 0);
        horn.rotation.z = -sx * 0.7;
        part(this.head, rbox(0.09, 0.09, 0.09, 0.04), '#e8c040', sx * 0.33, 0.92, 0);
      }
    }
    if (hat === 'garland') {
      const cols = ['#f0a0b8', '#f2d75a', '#f4f0e4', '#f2d75a'];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        part(this.head, rbox(0.1, 0.07, 0.1, 0.03), i % 2 ? cols[(i >> 1) % cols.length] : '#5a8a3a', Math.cos(a) * 0.26, 0.55, Math.sin(a) * 0.25);
      }
    }
    if (hat === 'antlers') {
      part(this.head, rbox(0.5, 0.06, 0.48, 0.02), '#5a3a22', 0, 0.52, 0);
      for (const sx of [1, -1]) {
        const beam = part(this.head, rbox(0.06, 0.42, 0.06, 0.02), '#8a6a4a', sx * 0.22, 0.74, -0.02);
        beam.rotation.z = -sx * 0.35;
        const t1 = part(this.head, rbox(0.05, 0.2, 0.05, 0.02), '#8a6a4a', sx * 0.36, 0.86, 0.05);
        t1.rotation.z = -sx * 0.9;
        const t2 = part(this.head, rbox(0.05, 0.16, 0.05, 0.02), '#8a6a4a', sx * 0.3, 0.98, -0.06);
        t2.rotation.x = -0.6;
      }
    }
    if (hat === 'sheaf') {
      part(this.head, rbox(0.52, 0.06, 0.5, 0.02), '#c89838', 0, 0.53, 0);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const ear = part(this.head, rbox(0.045, 0.2, 0.045, 0.02), '#e0c060', Math.cos(a) * 0.26, 0.64, Math.sin(a) * 0.25);
        ear.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      }
    }
    if (hat === 'feathered') {
      const c = this.look.hatColor ?? '#2a2420';
      part(this.head, rbox(0.66, 0.04, 0.66, 0.02), c, 0, 0.58, 0);
      part(this.head, rbox(0.44, 0.38, 0.44, 0.04), c, 0, 0.79, 0);
      part(this.head, rbox(0.45, 0.07, 0.45, 0.02), '#4a3a2a', 0, 0.64, 0);
      part(this.head, rbox(0.1, 0.07, 0.03, 0.01), '#d8b04a', 0, 0.64, 0.228);
      const quill = part(this.head, rbox(0.035, 0.42, 0.08, 0.02), '#f4f0e4', 0.23, 0.86, -0.06);
      quill.rotation.z = -0.35;
    }
    if (hat === 'tricorn') {
      // A low crown, and the brim turned up on three sides: one at the front, coming to a point, and one
      // each side behind; gold braid along the edges, and a plume curling back over the left
      const c = this.look.hatColor ?? '#1a1418', braid = '#d8b050';
      part(this.head, rbox(0.5, 0.16, 0.5, 0.06), c, 0, 0.64, 0);
      part(this.head, rbox(0.52, 0.04, 0.52, 0.02), c, 0, 0.57, 0);
      for (const [a, x, z] of [[0, 0, 0.26], [2.1, 0.23, -0.15], [-2.1, -0.23, -0.15]] as const) {
        const g = new THREE.Group(); g.position.set(x, 0.58, z); g.rotation.y = a; this.head.add(g);
        const wall = part(g, rbox(0.56, 0.17, 0.04, 0.02), c, 0, 0.07, 0); wall.rotation.x = -0.32;
        const edge = part(g, rbox(0.57, 0.025, 0.05, 0.01), braid, 0, 0.15, -0.03); edge.rotation.x = -0.32;
      }
      const plume = part(this.head, rbox(0.07, 0.07, 0.42, 0.03), '#f4f0e4', -0.2, 0.74, -0.08); plume.rotation.set(0.4, 0.3, 0.3);
    }
    if (hat === 'witch') {
      // Broad brim, and a crown that goes up a long way and gives up at the top
      const c = this.look.hatColor ?? '#2a2030';
      part(this.head, rbox(0.86, 0.04, 0.84, 0.02), c, 0, 0.57, 0);
      part(this.head, rbox(0.46, 0.18, 0.46, 0.05), c, 0, 0.67, -0.01);
      part(this.head, rbox(0.47, 0.06, 0.47, 0.02), '#5a3a22', 0, 0.62, -0.01);
      part(this.head, rbox(0.1, 0.08, 0.03, 0.01), '#c8a040', 0, 0.62, 0.235);
      for (const [w, y, z, rx] of [[0.36, 0.82, -0.04, -0.12], [0.26, 0.96, -0.09, -0.25], [0.17, 1.07, -0.16, -0.5], [0.09, 1.13, -0.25, -0.9]] as const) { const t = part(this.head, rbox(w, 0.16, w, 0.04), c, 0, y, z); t.rotation.x = rx; }
    }
    if (hat === 'bobble') {
      const c = this.look.hatColor ?? '#b0202a';
      part(this.head, rbox(0.52, 0.22, 0.5, 0.1), c, 0, 0.6, -0.01);
      part(this.head, rbox(0.54, 0.09, 0.52, 0.04), '#f4f8fc', 0, 0.5, -0.01);
      part(this.head, rbox(0.17, 0.17, 0.17, 0.08), '#f4f8fc', 0, 0.78, -0.02);
    }
  }

  setHeld(kind: HeldItem | string): void {
    if (kind === this.heldKind) return;
    if (this.held) this.handR.remove(this.held);
    if (this.instr) { this.torso.remove(this.instr.body); if (this.instr.hand) this.handR.remove(this.instr.hand); this.instr = null; }
    // An instrument by its item id: played from the torso, not carried in the hand
    const voice = TOOLS.has(kind) ? null : instrumentOf(kind);
    if (voice) {
      const m = instrumentMesh(voice);
      this.instr = { voice, ...m };
      this.torso.add(m.body);
      if (m.hand) this.handR.add(m.hand);
      this.held = null;
      this.heldKind = kind;
      return;
    }
    const model = TOOLS.has(kind) ? null : weaponModelOf(kind);
    this.held = kind === 'none' ? null : model ? weaponMesh(model) : heldMesh(TOOLS.has(kind) ? (kind as HeldItem) : 'sword');
    this.bow = model?.family === 'bow';
    if (this.held) {
      this.held.rotation.x = Math.PI / 2;
      this.handR.add(this.held);
    }
    // A quiver of arrows on the back while a bow is held
    if (this.quiver) { this.torso.remove(this.quiver); this.quiver = null; }
    if (this.bow) this.torso.add((this.quiver = quiverMesh()));
    this.heldKind = kind;
  }

  /** A note was played: a beat for the strike or the pluck. */
  pluck(): void { this.pulse = 1; }
  /** The instrument being played, if any. */
  get instrument(): InstrumentVoice | null { return this.instr?.voice ?? null; }

  /** A torch in the left hand (riding at night): a pitch-wrapped brand with its flame, held up off the reins. */
  private torch: THREE.Group | null = null;
  private torchFlame: THREE.Object3D | null = null;
  private flameLayers: THREE.Mesh[] = [];
  private sparks: THREE.Mesh[] = [];
  get torchLit(): boolean { return !!this.torch; }
  setTorch(on: boolean): void {
    if (on === !!this.torch) return;
    if (!on) { this.handL.remove(this.torch!); this.torch = null; this.torchFlame = null; this.flameLayers = []; this.sparks = []; if (this.offhand) this.offhand.visible = true; return; }
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: '#5a3a22' }), wrap = new THREE.MeshLambertMaterial({ color: '#2a2018' });
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), wood); stick.position.set(0, 0.1, 0.06); g.add(stick);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), wrap); head.position.set(0, 0.42, 0.06); g.add(head);
    // Two cords round the pitch-wrapped head, and its top charred and glowing where the fire sits
    const cord = new THREE.MeshLambertMaterial({ color: '#7a5a32' });
    for (const y of [0.37, 0.45]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.022, 0.115), cord); b.position.set(0, y, 0.06); g.add(b); b.userData.plain = true; }
    const char = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.11), new THREE.MeshBasicMaterial({ color: '#c84a14' })); char.position.set(0, 0.5, 0.06); g.add(char);
    const flame = new THREE.Group();
    flame.position.set(0, 0.5, 0.06); g.add(flame);
    const kit = flameParts();
    this.flameLayers = kit.layers.map((geo, i) => { const m = new THREE.Mesh(geo, FLAME_MAT); m.position.set(TONGUES[i][0], 0, TONGUES[i][1]); m.userData.plain = true; flame.add(m); return m; });
    this.sparks = [0, 1, 2, 3, 4].map((i) => { const m = new THREE.Mesh(kit.spark, SPARK_MATS[i % 3]); m.userData.plain = true; m.userData.t = i / 5; flame.add(m); return m; });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.75); halo.position.y = 0.14; flame.add(halo);
    for (const m of [stick, head, char]) m.userData.plain = true;
    if (this.offhand) this.offhand.visible = false;
    this.handL.add(g);
    this.torch = g; this.torchFlame = flame;
  }
  /** The fire on the move: each tongue licks up and leans on its own beat; sparks climb and go out. */
  private burn(dt: number): void {
    const now = performance.now() * 0.001;
    this.flameLayers.forEach((m, i) => {
      const k = now * (7 + i * 3.1) + i * 1.7;
      const lick = 0.88 + Math.sin(k) * 0.08 + Math.sin(k * 2.3 + 1) * 0.06 + Math.sin(k * 5.1) * 0.03;
      m.scale.set(1 - (lick - 0.9) * 0.6, lick, 1 - (lick - 0.9) * 0.6);
      m.rotation.set(Math.sin(k * 0.7 + 2) * 0.12, k * 0.2, Math.sin(k * 0.9) * 0.12);
    });
    for (const sp of this.sparks) {
      let t = (sp.userData.t as number) + dt * (0.9 + (sp.id % 3) * 0.25);
      if (t > 1) t -= 1;
      sp.userData.t = t;
      const a = sp.id * 2.4 + t * 3;
      sp.position.set(Math.sin(a) * 0.05 * (0.4 + t), 0.2 + t * 0.42, Math.cos(a) * 0.05 * (0.4 + t));
      sp.scale.setScalar(t < 0.8 ? 1 : (1 - t) * 5);
    }
  }
  /** The flame's place in the world, for the light it throws. */
  torchAt(out: THREE.Vector3): THREE.Vector3 | null { return this.torchFlame ? this.torchFlame.getWorldPosition(out) : null; }

  /** A backpack on the shoulders (look 1..6: satchel to haversack), or none. */
  private pack: THREE.Group | null = null;
  private packLook = 0;
  setPack(look: number): void {
    if (look === this.packLook) return;
    if (this.pack) { this.torso.remove(this.pack); this.pack = null; }
    this.packLook = look;
    if (!look) return;
    const g = new THREE.Group();
    const add = (w: number, h: number, d: number, color: string, x: number, y: number, z: number) => { const m = new THREE.Mesh(rbox(w, h, d, Math.min(w, h, d) * 0.25), lam(color)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    const hide = ['#8a5a32', '#7a5a3a', '#5a4a3a', '#3a4a3a', '#2a4a6a', '#6a2a24'][look - 1], trim = ['#5a3a22', '#3a2a1a', '#c8a050', '#d8b050', '#e8dcc0', '#e0bd64'][look - 1];
    if (look === 1) {
      // A satchel at the hip on a strap across the chest
      add(0.3, 0.26, 0.12, hide, 0.24, -0.18, -0.12); add(0.32, 0.08, 0.14, trim, 0.24, -0.06, -0.12);
      const strap = add(0.05, 0.62, 0.04, trim, 0.02, 0.14, 0.14); strap.rotation.z = 0.7;
    } else {
      const k = 0.85 + look * 0.09, w = 0.42 * k, h = 0.5 * k, d = 0.22 * k;
      add(w, h, d, hide, 0, 0.16, -0.18 - d / 2);
      add(w * 1.02, h * 0.28, d * 1.05, shade(hide, 0.8), 0, 0.16 + h * 0.36, -0.18 - d / 2); // the flap
      for (const sx of [-1, 1]) add(0.05, h * 0.9, 0.04, trim, sx * w * 0.32, 0.18, -0.16);
      if (look >= 3) { const roll = add(w * 1.15, 0.14, 0.14, look === 5 ? '#e8dcc0' : '#5a6a4a', 0, 0.2 + h * 0.62, -0.18 - d / 2); roll.rotation.z = 0; }
      if (look >= 4) for (const sx of [-1, 1]) add(0.06, 0.06, 0.06, '#c8a050', sx * w * 0.5, 0.16 + h * 0.4, -0.18);
      if (look === 6) for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.06, 0.06, 0.06, '#e0bd64', x * w * 0.48, 0.16 + y * h * 0.46, -0.18 - d);
    }
    this.torso.add(g);
    this.pack = g;
  }

  /** A lantern hung on the belt at the left hip, hands free: for a shield or a bow in hand. */
  private lantern: THREE.Group | null = null;
  private lanternGlow: THREE.Mesh | null = null;
  setLantern(on: boolean): void {
    if (on === !!this.lantern) return;
    if (!on) { this.hips.remove(this.lantern!); this.lantern = null; this.lanternGlow = null; return; }
    const g = new THREE.Group(), iron = new THREE.MeshLambertMaterial({ color: '#2a2a2e' });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.11), new THREE.MeshBasicMaterial({ color: '#ffd078' }));
    g.add(glow);
    for (const [x, y, z, w, h, d] of [[0, 0.09, 0, 0.15, 0.03, 0.15], [0, -0.08, 0, 0.15, 0.03, 0.15], [0.065, 0, 0.065, 0.02, 0.16, 0.02], [-0.065, 0, 0.065, 0.02, 0.16, 0.02], [0.065, 0, -0.065, 0.02, 0.16, 0.02], [-0.065, 0, -0.065, 0.02, 0.16, 0.02], [0, 0.14, 0, 0.02, 0.07, 0.02]] as const) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), iron); m.position.set(x, y, z); g.add(m);
    }
    g.traverse((o) => { o.userData.plain = true; });
    g.position.set(0.31, -0.14, 0.06);
    this.hips.add(g);
    this.lantern = g; this.lanternGlow = glow;
  }
  lanternAt(out: THREE.Vector3): THREE.Vector3 | null { return this.lanternGlow ? this.lanternGlow.getWorldPosition(out) : null; }

  /** Something in the left hand by its item id (a shield, a lantern, a tome), or nothing. */
  setOffhand(id: string | null): void {
    if (id === this.offhandKind) return;
    if (this.offhand) this.handL.remove(this.offhand);
    const model = id ? offhandModelOf(id) : null;
    this.offhand = model ? offhandMesh(model) : null;
    if (this.offhand) this.handL.add(this.offhand);
    this.offhandKind = id;
  }

  /** Stroke phase, and the swimmer's body pitch (set by the player; 0 is level, positive head-up). */
  private swimPhase = 0;
  swimPitch = 0;

  /** The half-width of what you're riding, so the legs go round it rather than into it (CreatureModel.girth). */
  straddle = 0.38;
  /** Where the hands are (world), for the reins: left then right. A torch in the left hand gives both reins to the right. */
  handsAt(l: THREE.Vector3, r: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
    this.handR.getWorldPosition(r);
    if (this.torch) l.copy(r); else this.handL.getWorldPosition(l);
    return [l, r];
  }

  setState(s: AnimState): void {
    if (s !== this.state) { this.state = s; this.stateTime = 0; }
  }

  /** speed is horizontal speed in m/s; used to drive the stride. */
  update(dt: number, speed: number, airborne = false): void {
    if (this.torchFlame) this.burn(dt);
    this.stateTime += dt;
    const t = this.stateTime;
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2 + Math.random() * 3;
    this.eyeLids.visible = this.blink < 0 && this.state !== 'dead';

    // Reset pose
    const P = this;
    P.body.position.set(0, 0, 0);
    P.body.rotation.set(0, 0, 0);
    P.hips.rotation.set(0, 0, 0);
    P.torso.rotation.set(0, 0, 0);
    P.torso.position.y = 0.06; // (a shrug or a breath leaves it raised otherwise, a gap at the waist)
    P.head.rotation.set(0, 0, 0);
    for (const g of [P.armL, P.armR, P.foreL, P.foreR, P.legL, P.legR, P.shinL, P.shinR]) g.rotation.set(0, 0, 0);
    P.armL.rotation.z = 0.08;
    P.armR.rotation.z = -0.08;
    P.foreL.rotation.x = -0.15;
    P.foreR.rotation.x = -0.15;
    if (P.held) {
      // Blades rest in a low guard, pointing forward and a little down; tools and swings hold
      // perpendicular to the forearm.
      const resting = ['idle', 'walk', 'run', 'jump', 'talk', 'hit'].includes(this.state);
      const blade = !TOOLS.has(this.heldKind) || this.heldKind === 'sword' || this.heldKind === 'bronzeSword';
      P.held.rotation.set(blade && resting ? Math.PI / 2 + 0.38 : Math.PI / 2, 0, 0);
      // A bow hangs upright at your side, and comes up level with the eye when it's drawn
      if (this.bow) P.held.rotation.set(this.state === 'shoot' ? Math.PI / 2 : 0.1, 0, 0);
    }

    if (this.instr) {
      const on = this.state === 'perform';
      this.instr.body.visible = on;
      if (this.instr.hand) this.instr.hand.visible = on;
    }
    this.pulse = Math.max(0, this.pulse - dt * 6);

    const stride = Math.min(1, speed / 6);
    if (speed > 0.2) this.phase += dt * (4.5 + speed * 1.15);
    const sw = Math.sin(this.phase);
    const breathe = Math.sin(performance.now() * 0.0022) * 0.015;

    const legs = (amp: number) => {
      P.legL.rotation.x = sw * amp;
      P.legR.rotation.x = -sw * amp;
      P.shinL.rotation.x = Math.max(0, -Math.sin(this.phase - 0.9)) * amp * 1.3;
      P.shinR.rotation.x = Math.max(0, Math.sin(this.phase - 0.9)) * amp * 1.3;
      P.body.position.y = Math.abs(Math.cos(this.phase)) * 0.05 * amp * 1.6;
    };
    const armsSwing = (amp: number) => {
      P.armL.rotation.x = -sw * amp;
      P.armR.rotation.x = sw * amp;
      P.foreL.rotation.x = -0.25 - Math.max(0, sw) * amp * 0.6;
      P.foreR.rotation.x = -0.25 - Math.max(0, -sw) * amp * 0.6;
    };

    switch (this.state) {
      case 'idle':
      case 'talk': {
        P.torso.position.y = 0.06 + breathe;
        P.armL.rotation.z = 0.1 + breathe;
        P.armR.rotation.z = -0.1 - breathe;
        P.head.rotation.y = Math.sin(performance.now() * 0.0006) * 0.12;
        if (this.state === 'talk') {
          P.armR.rotation.x = -0.6 - Math.sin(t * 3) * 0.25;
          P.foreR.rotation.x = -0.9;
          P.head.rotation.x = Math.sin(t * 5) * 0.05;
        }
        break;
      }
      case 'walk':
      case 'run': {
        const amp = this.state === 'run' ? 0.95 : 0.55 + stride * 0.2;
        legs(amp);
        armsSwing(amp * 0.9);
        P.torso.rotation.x = this.state === 'run' ? 0.14 : 0.04;
        P.torso.rotation.y = sw * 0.06;
        break;
      }
      case 'ride': {
        // In the saddle: thighs astride the horse, lower legs down its sides, hands forward on the
        // reins. The body rises and falls with the horse, more at a gallop.
        const gait = Math.min(1, speed / 9);
        if (speed > 0.2) this.swimPhase += dt * (3.4 + speed * 0.62);
        const s = this.swimPhase;
        // The wider the beast, the wider the knees; the shins come back in to hang down its sides
        const wide = Math.max(0, this.straddle - 0.38);
        P.legL.rotation.set(-1.05, 0, 0.5 + wide * SPREAD); P.legR.rotation.set(-1.05, 0, -0.5 - wide * SPREAD);
        P.shinL.rotation.set(1.25, 0, -wide * SPREAD * 0.6); P.shinR.rotation.set(1.25, 0, wide * SPREAD * 0.6);
        P.armL.rotation.x = -0.65; P.armR.rotation.x = -0.65;
        P.armL.rotation.z = 0.12; P.armR.rotation.z = -0.12;
        P.foreL.rotation.x = -0.55; P.foreR.rotation.x = -0.55;
        // A torch held up and out to the side, clear of the horse's head
        if (this.torch) { P.armL.rotation.set(-1.25, 0, 0.42); P.foreL.rotation.x = -0.35; }
        // (raised by what the figure's scale takes off the hips, so a rider sits on the saddle)
        P.body.position.y = Math.abs(Math.sin(s)) * 0.07 * gait + 0.86 * (1 - P.body.scale.y);
        P.torso.rotation.x = 0.08 + gait * 0.14;
        P.head.rotation.x = -gait * 0.1;
        break;
      }
      case 'swim': {
        // Front crawl, body near level and pivoting about the chest: arms wheel overhead in turn,
        // legs flutter, the head lifts to look ahead and turns to breathe on every other stroke.
        const lean = THREE.MathUtils.clamp(1.3 - this.swimPitch, 0.2, 2.6), h = 1.15;
        this.swimPhase += dt * (3.2 + speed * 0.55);
        const s = this.swimPhase;
        P.body.rotation.x = lean;
        P.body.position.y = h - h * Math.cos(lean);
        P.body.position.z = -h * Math.sin(lean) * 0.55;
        P.armL.rotation.x = -(s % (Math.PI * 2));
        P.armR.rotation.x = -((s + Math.PI) % (Math.PI * 2));
        P.armL.rotation.z = 0.25; P.armR.rotation.z = -0.25;
        P.foreL.rotation.x = -0.35 - Math.max(0, Math.sin(s)) * 0.5;
        P.foreR.rotation.x = -0.35 - Math.max(0, -Math.sin(s)) * 0.5;
        P.legL.rotation.x = Math.sin(s * 2.2) * 0.32; P.legR.rotation.x = -Math.sin(s * 2.2) * 0.32;
        P.shinL.rotation.x = 0.15 + Math.max(0, Math.sin(s * 2.2)) * 0.3; P.shinR.rotation.x = 0.15 + Math.max(0, -Math.sin(s * 2.2)) * 0.3;
        P.head.rotation.x = -Math.min(1.1, lean * 0.7);
        P.head.rotation.y = Math.sin(s * 0.5) > 0.7 ? Math.sin(s * 0.5) * 0.5 : 0;
        P.torso.rotation.y = Math.sin(s) * 0.18;
        break;
      }
      case 'tread': {
        // Treading water: upright with a slight lean, hands sculling, legs cycling, a gentle bob
        this.swimPhase += dt * 3.4;
        const s = this.swimPhase;
        P.body.rotation.x = 0.18;
        P.body.position.y = Math.sin(s * 0.6) * 0.05;
        P.armL.rotation.x = -0.35; P.armR.rotation.x = -0.35;
        P.armL.rotation.z = 0.75 + Math.sin(s) * 0.3; P.armR.rotation.z = -0.75 - Math.sin(s) * 0.3;
        P.armL.rotation.y = Math.sin(s) * 0.35; P.armR.rotation.y = -Math.sin(s) * 0.35;
        P.foreL.rotation.x = -0.7; P.foreR.rotation.x = -0.7;
        P.legL.rotation.x = -0.35 + Math.sin(s * 1.3) * 0.45; P.legR.rotation.x = -0.35 - Math.sin(s * 1.3) * 0.45;
        P.shinL.rotation.x = 0.7 + Math.cos(s * 1.3) * 0.35; P.shinR.rotation.x = 0.7 - Math.cos(s * 1.3) * 0.35;
        P.head.rotation.x = -0.12;
        break;
      }
      case 'jump': {
        P.legL.rotation.x = -0.6; P.shinL.rotation.x = 1.0;
        P.legR.rotation.x = 0.25; P.shinR.rotation.x = 0.5;
        P.armL.rotation.x = -0.9; P.armR.rotation.x = -0.5;
        P.armL.rotation.z = 0.5; P.armR.rotation.z = -0.5;
        break;
      }
      case 'attack': {
        // Three-step combo: right slash, backhand, overhead.
        const d = 0.42 / this.actionSpeed;
        const k = Math.min(1, t / d);
        const wind = k < 0.35 ? k / 0.35 : 1;
        const strike = k < 0.35 ? 0 : Math.min(1, (k - 0.35) / 0.3);
        if (this.comboIndex === 0) {
          P.armR.rotation.x = -1.6 * wind + 1.9 * strike;
          P.armR.rotation.z = -0.9 * wind + 0.9 * strike;
          P.torso.rotation.y = 0.5 * wind - 1.0 * strike;
        } else if (this.comboIndex === 1) {
          P.armR.rotation.x = -1.3;
          P.armR.rotation.y = -0.8 * wind + 1.6 * strike;
          P.armR.rotation.z = -1.2;
          P.torso.rotation.y = -0.5 * wind + 1.0 * strike;
        } else {
          P.armR.rotation.x = -2.8 * wind + 2.6 * strike;
          P.armL.rotation.x = -2.4 * wind + 2.2 * strike;
          P.torso.rotation.x = -0.2 * wind + 0.45 * strike;
        }
        P.foreR.rotation.x = -0.4;
        // On the move the legs keep their stride under the swing (GW2's and ESO's way); standing, a lunge
        if (speed > 0.6) legs(0.55 + stride * 0.25);
        else { P.legL.rotation.x = -0.35; P.legR.rotation.x = 0.3; P.shinR.rotation.x = 0.3; }
        break;
      }
      case 'cleave': {
        const k = Math.min(1, t / 0.55);
        P.body.rotation.y = k * Math.PI * 2;
        P.armR.rotation.x = -1.5;
        P.armR.rotation.z = -1.3;
        P.armL.rotation.z = 1.2;
        if (speed > 0.6) legs(0.5); else { P.legL.rotation.x = -0.4; P.legR.rotation.x = 0.4; }
        P.body.position.y += Math.sin(k * Math.PI) * 0.15;
        break;
      }
      case 'mine':
      case 'chop':
      case 'hammer': {
        const period = this.state === 'hammer' ? 0.7 : 0.9 / this.actionSpeed;
        const k = (t % period) / period;
        const up = k < 0.55 ? k / 0.55 : 1 - (k - 0.55) / 0.15;
        const v = Math.max(0, Math.min(1, up));
        if (this.state === 'chop') {
          P.torso.rotation.y = 0.7 * v - 0.4;
          P.armR.rotation.x = -1.3;
          P.armR.rotation.z = -1.6 * v + 0.2;
          P.armL.rotation.x = -1.0;
          P.armL.rotation.z = 0.2;
        } else {
          P.armR.rotation.x = -2.9 * v - 0.2;
          P.armL.rotation.x = this.state === 'hammer' ? -0.6 : -2.7 * v - 0.2;
          P.torso.rotation.x = 0.35 * (1 - v);
          P.foreR.rotation.x = -0.4 * v;
        }
        P.legL.rotation.x = -0.25; P.legR.rotation.x = 0.25;
        break;
      }
      case 'fishCast': {
        const k = Math.min(1, t / 0.7);
        const back = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
        P.armR.rotation.x = -1.2 - back * 1.6;
        P.foreR.rotation.x = -0.4;
        P.torso.rotation.x = -0.1 * back;
        break;
      }
      case 'fishWait': {
        P.armR.rotation.x = -0.9 + Math.sin(t * 1.5) * 0.03;
        P.armL.rotation.x = -0.7; P.armL.rotation.z = -0.25;
        P.foreR.rotation.x = -0.3;
        P.torso.position.y = 0.06 + breathe;
        break;
      }
      case 'cook': {
        P.armR.rotation.x = -1.0 + Math.sin(t * 3) * 0.15;
        P.armL.rotation.x = -0.6;
        P.torso.rotation.x = 0.25;
        P.legL.rotation.x = -0.9; P.shinL.rotation.x = 1.2; P.legR.rotation.x = 0.2; P.shinR.rotation.x = 1.6;
        P.body.position.y = -0.22;
        break;
      }
      case 'bellows': {
        const k = Math.sin(t * 3.4);
        P.armR.rotation.x = -0.9 - k * 0.35; P.armL.rotation.x = -0.9 - k * 0.35;
        P.foreR.rotation.x = -0.6; P.foreL.rotation.x = -0.6;
        P.torso.rotation.x = 0.2 + k * 0.08;
        break;
      }
      case 'hit': {
        const k = Math.max(0, 1 - t / 0.3);
        P.torso.rotation.x = -0.35 * k;
        P.head.rotation.x = -0.3 * k;
        P.armL.rotation.z = 0.6 * k;
        P.armR.rotation.z = -0.6 * k;
        break;
      }
      case 'shoot': {
        // The bow arm straight out at the mark, the other hand drawn back to the cheek
        const k = Math.min(1, t / 0.12);
        P.armR.rotation.x = -1.55 * k; P.armR.rotation.z = -0.12;
        P.armL.rotation.x = -1.45 * k; P.armL.rotation.z = -0.62 * k; P.foreL.rotation.x = -1.35 * k;
        P.head.rotation.y = 0.12 * k;
        if (speed > 0.6) legs(0.5);
        break;
      }
      case 'heal': {
        const k = Math.min(1, t / 0.5);
        P.armL.rotation.x = -2.2 * k; P.armR.rotation.x = -2.2 * k;
        P.armL.rotation.z = 0.5; P.armR.rotation.z = -0.5;
        P.head.rotation.x = -0.3 * k;
        break;
      }
      case 'roll': {
        const k = Math.min(1, t / ROLL_TIME);
        this.poseRoll(k);
        // Keep the tucked body on the ground: no sinking through it, no floating over it.
        P.body.position.y -= this.rollFloorAt(k);
        break;
      }
      // Emotes (data/emotes.ts). One-shots ease in and out over their length; loops hold.
      case 'wave': {
        const k = Math.min(1, t / 0.25) * Math.min(1, Math.max(0, (2.2 - t) / 0.3));
        P.armR.rotation.z = (-2.5 + Math.sin(t * 9) * 0.28) * k;
        P.foreR.rotation.x = -0.3 * k;
        P.head.rotation.z = -0.08 * k; P.torso.position.y = 0.06 + breathe;
        break;
      }
      case 'bow': {
        const k = Math.sin(Math.PI * Math.min(1, t / 2));
        P.torso.rotation.x = 0.75 * k; P.head.rotation.x = 0.25 * k;
        P.armR.rotation.x = -0.9 * k; P.foreR.rotation.x = -1.2 * k; P.armR.rotation.z = 0.25 * k;
        P.armL.rotation.x = 0.35 * k;
        break;
      }
      case 'cheer': {
        const k = Math.min(1, t / 0.2) * Math.min(1, Math.max(0, (2.4 - t) / 0.3));
        const hop = Math.abs(Math.sin(t * 7));
        P.armL.rotation.x = -2.9 * k; P.armR.rotation.x = -2.9 * k;
        P.armL.rotation.z = (0.35 + hop * 0.15) * k; P.armR.rotation.z = (-0.35 - hop * 0.15) * k;
        P.body.position.y = hop * 0.12 * k; P.shinL.rotation.x = hop * 0.4 * k; P.shinR.rotation.x = hop * 0.4 * k;
        P.head.rotation.x = -0.25 * k;
        break;
      }
      case 'clap': {
        const k = Math.min(1, t / 0.2) * Math.min(1, Math.max(0, (2.4 - t) / 0.3));
        const c = Math.abs(Math.sin(t * 11));
        P.armL.rotation.x = -1.15 * k; P.armR.rotation.x = -1.15 * k;
        P.armL.rotation.z = (-0.15 - c * 0.35) * k; P.armR.rotation.z = (0.15 + c * 0.35) * k;
        P.foreL.rotation.x = -0.5 * k; P.foreR.rotation.x = -0.5 * k;
        P.torso.position.y = 0.06 + breathe;
        break;
      }
      case 'laugh': {
        const k = Math.min(1, t / 0.2) * Math.min(1, Math.max(0, (2.2 - t) / 0.3));
        P.torso.rotation.x = (-0.18 + Math.sin(t * 16) * 0.05) * k; P.head.rotation.x = -0.35 * k;
        P.armL.rotation.x = -0.5 * k; P.armR.rotation.x = -0.5 * k; P.foreL.rotation.x = -1.4 * k; P.foreR.rotation.x = -1.4 * k;
        P.armL.rotation.z = -0.15 * k; P.armR.rotation.z = 0.15 * k;
        P.body.position.y = Math.abs(Math.sin(t * 16)) * 0.025 * k;
        break;
      }
      case 'salute': {
        const k = Math.min(1, t / 0.25) * Math.min(1, Math.max(0, (2 - t) / 0.3));
        P.armR.rotation.x = -1.6 * k; P.armR.rotation.z = -0.9 * k; P.foreR.rotation.x = -1.9 * k;
        P.torso.rotation.x = -0.05 * k; P.head.rotation.x = -0.08 * k;
        break;
      }
      case 'point': {
        const k = Math.min(1, t / 0.25) * Math.min(1, Math.max(0, (2 - t) / 0.3));
        P.armR.rotation.x = -1.55 * k; P.foreR.rotation.x = 0; P.armR.rotation.z = 0;
        P.torso.rotation.y = -0.15 * k; P.head.rotation.x = -0.05 * k;
        break;
      }
      case 'shrug': {
        const k = Math.sin(Math.PI * Math.min(1, t / 1.8));
        P.armL.rotation.z = 0.45 * k; P.armR.rotation.z = -0.45 * k; P.foreL.rotation.x = -1.1 * k; P.foreR.rotation.x = -1.1 * k;
        P.torso.position.y = 0.06 + 0.05 * k; P.head.rotation.z = 0.18 * k;
        break;
      }
      case 'dance': {
        const b = t * 6.5;
        P.body.position.y = Math.abs(Math.sin(b)) * 0.08;
        P.body.rotation.y = Math.sin(b * 0.5) * 0.35;
        P.hips.rotation.z = Math.sin(b) * 0.12;
        P.torso.rotation.z = -Math.sin(b) * 0.1;
        P.armL.rotation.x = -1.4 - Math.sin(b) * 0.9; P.armR.rotation.x = -1.4 + Math.sin(b) * 0.9;
        P.armL.rotation.z = 0.4; P.armR.rotation.z = -0.4; P.foreL.rotation.x = -0.6; P.foreR.rotation.x = -0.6;
        P.legL.rotation.x = Math.max(0, Math.sin(b)) * -0.5; P.shinL.rotation.x = Math.max(0, Math.sin(b)) * 0.9;
        P.legR.rotation.x = Math.max(0, -Math.sin(b)) * -0.5; P.shinR.rotation.x = Math.max(0, -Math.sin(b)) * 0.9;
        P.head.rotation.z = Math.sin(b) * 0.1;
        break;
      }
      case 'seated': {
        // On a bench at a table: thighs level, shins down, forearms on the table; now and then a drink
        P.body.position.y = -0.36;
        P.legL.rotation.set(-1.5, 0, 0.06); P.legR.rotation.set(-1.5, 0, -0.06);
        P.shinL.rotation.x = 1.5; P.shinR.rotation.x = 1.5;
        const sip = Math.max(0, Math.sin(performance.now() * 0.0007 + this.phase * 3) - 0.85) / 0.15;
        P.armL.rotation.x = -0.55; P.foreL.rotation.x = -0.75;
        P.armR.rotation.x = -0.55 - sip * 0.75; P.foreR.rotation.x = -0.75 - sip * 0.9;
        P.armL.rotation.z = -0.12; P.armR.rotation.z = 0.12;
        P.torso.position.y = 0.06 + breathe;
        P.head.rotation.x = -sip * 0.25;
        P.head.rotation.y = sip > 0 ? 0 : Math.sin(performance.now() * 0.0004 + this.phase) * 0.35;
        break;
      }
      case 'sit': {
        const k = Math.min(1, t / 0.5);
        P.body.position.y = -0.72 * k;
        P.legL.rotation.set(-1.45 * k, 0, 0.12 * k); P.legR.rotation.set(-1.45 * k, 0, -0.12 * k);
        P.shinL.rotation.x = 0.35 * k; P.shinR.rotation.x = 0.35 * k;
        P.armL.rotation.x = 0.45 * k; P.armR.rotation.x = 0.45 * k; P.armL.rotation.z = 0.3 * k; P.armR.rotation.z = -0.3 * k;
        P.torso.rotation.x = -0.12 * k; P.torso.position.y = 0.06 + breathe;
        P.head.rotation.y = Math.sin(performance.now() * 0.0005) * 0.2;
        break;
      }
      case 'kneel': {
        const k = Math.min(1, t / 0.5);
        P.body.position.y = -0.42 * k;
        P.legL.rotation.x = -1.5 * k; P.shinL.rotation.x = 1.5 * k;
        P.legR.rotation.x = -0.05 * k; P.shinR.rotation.x = 1.55 * k;
        P.torso.rotation.x = 0.1 * k; P.head.rotation.x = 0.3 * k;
        P.armL.rotation.x = -0.5 * k; P.foreL.rotation.x = -0.8 * k; P.armR.rotation.x = -0.2 * k;
        break;
      }
      case 'perform': {
        // Each instrument held the way it's played; a note just played moves the hand that plays it
        const k = Math.min(1, t / 0.35), q = this.pulse, v = this.instr?.voice;
        P.torso.position.y = 0.06 + breathe;
        if (v === 'whistle' || v === 'bone' || v === 'horn') {
          P.armL.rotation.x = -1.15 * k; P.armR.rotation.x = -1.05 * k;
          P.armL.rotation.z = -0.38 * k; P.armR.rotation.z = 0.38 * k;
          P.foreL.rotation.x = -1.25 * k; P.foreR.rotation.x = -1.05 * k - q * 0.08;
          P.head.rotation.x = (v === 'horn' ? -0.12 : 0.08) * k;
        } else if (v === 'fiddle') {
          const bow = Math.sin(t * 2.6);
          P.armL.rotation.x = -1.35 * k; P.armL.rotation.z = 0.25 * k; P.foreL.rotation.x = -0.45 * k;
          P.armR.rotation.x = -0.95 * k; P.armR.rotation.z = (-0.15 + bow * 0.32) * k; P.foreR.rotation.x = (-1.15 + bow * 0.2) * k;
          P.head.rotation.z = 0.22 * k; P.head.rotation.x = 0.12 * k;
        } else if (v === 'lute' || v === 'gurdy') {
          P.armL.rotation.x = -0.75 * k; P.armL.rotation.z = 0.45 * k; P.foreL.rotation.x = -0.95 * k;
          P.armR.rotation.x = -0.45 * k; P.armR.rotation.z = 0.28 * k;
          P.foreR.rotation.x = (v === 'gurdy' ? -1.2 + Math.sin(t * 6) * 0.25 : -1.25 - q * 0.3) * k;
          P.head.rotation.x = 0.18 * k;
        } else if (v === 'harp') {
          P.armL.rotation.x = -0.85 * k; P.armR.rotation.x = -0.85 * k;
          P.armL.rotation.z = -0.1 * k; P.armR.rotation.z = 0.25 * k;
          P.foreL.rotation.x = (-0.8 + Math.sin(t * 5) * 0.08) * k; P.foreR.rotation.x = (-0.85 - q * 0.25) * k;
          P.head.rotation.x = 0.15 * k;
        } else if (v === 'drum') {
          P.armL.rotation.x = -1.15 * k; P.armL.rotation.z = 0.15 * k; P.foreL.rotation.x = -0.55 * k;
          P.armR.rotation.x = (-0.95 + q * 0.45) * k; P.armR.rotation.z = 0.2 * k; P.foreR.rotation.x = (-1.05 - q * 0.35) * k;
        } else if (v === 'pipes') {
          P.armL.rotation.x = -0.65 * k; P.armL.rotation.z = 0.12 * k; P.foreL.rotation.x = -1.05 * k;
          P.armR.rotation.x = -0.55 * k; P.armR.rotation.z = 0.3 * k; P.foreR.rotation.x = -1.15 * k;
          P.head.rotation.x = 0.1 * k;
        }
        // A tap of the foot on the beat
        P.legR.rotation.x = -q * 0.12;
        break;
      }
      case 'sleep': {
        const k = Math.min(1, t / 0.8);
        P.body.rotation.x = -k * Math.PI / 2;
        P.body.position.y = 0.12 * k;
        P.body.position.z = -0.6 * k;
        P.armL.rotation.z = 0.15 * k; P.armR.rotation.x = -2.6 * k; P.foreR.rotation.x = -1.4 * k;
        P.torso.position.y = 0.06 + Math.sin(performance.now() * 0.0012) * 0.02;
        P.head.rotation.y = 0.4 * k;
        break;
      }
      case 'dead': {
        const k = Math.min(1, t / 0.6);
        P.body.rotation.x = -k * Math.PI / 2;
        P.body.position.y = 0.15 * k;
        P.body.position.z = -0.6 * k;
        P.armL.rotation.z = 1.2 * k; P.armR.rotation.z = -1.2 * k;
        break;
      }
    }
    if (airborne && this.state !== 'roll' && this.state !== 'attack' && this.state !== 'cleave') {
      P.legL.rotation.x = -0.5; P.shinL.rotation.x = 0.9; P.legR.rotation.x = 0.2; P.shinR.rotation.x = 0.4;
    }
    // A torch on foot: held up and forward in the left hand, whatever the legs are doing
    if (this.torch && this.state !== 'ride' && this.state !== 'roll' && this.state !== 'swim' && this.state !== 'tread' && this.state !== 'dead') {
      P.armL.rotation.set(-0.95 + Math.sin(this.phase * 0.5) * 0.03, 0, 0.22); P.foreL.rotation.x = -0.55;
    }
    // The torch stands upright whatever the arm is doing (it hangs from the hand, which tips forward
    // as the arm lifts): turn it back by the arm's lift and spread, and the body's lean, flame on top
    if (this.torch) this.torch.rotation.set(-(P.torso.rotation.x + P.armL.rotation.x + P.foreL.rotation.x) + 0.1, 0, -P.armL.rotation.z);
    // A belt lantern swings a little as you go
    if (this.lantern) this.lantern.rotation.x = Math.sin(performance.now() * 0.008 + this.phase) * Math.min(1, speed / 4) * 0.35;
    if (this.cape) {
      const target = 0.15 + Math.min(1, speed / 7) * 0.9 + (airborne ? 0.4 : 0);
      this.capeSwing += (target - this.capeSwing) * Math.min(1, dt * 5);
      this.cape.rotation.x = this.capeSwing + Math.sin(performance.now() * 0.006 + this.phase) * 0.05;
    }
  }

  /**
   * Dodge-roll pose at fraction k: dive with the arms reaching, tuck, tumble once about the
   * tucked body's middle, then come up through a crouch. Poses are keyed and eased between.
   */
  private poseRoll(k: number): void {
    const P = this;
    let a = ROLL_KEYS[0], b = ROLL_KEYS[1];
    for (let i = 1; i < ROLL_KEYS.length; i++) { a = ROLL_KEYS[i - 1]; b = ROLL_KEYS[i]; if (k <= b.at) break; }
    const u = THREE.MathUtils.smoothstep(k, a.at, b.at);
    const m = (f: keyof RollPose) => a[f] + (b[f] - a[f]) * u;
    P.legL.rotation.x = m('leg'); P.legR.rotation.x = m('leg') + m('split');
    P.shinL.rotation.x = m('shin'); P.shinR.rotation.x = m('shin') - m('split') * 0.5;
    P.torso.rotation.x = m('curl');
    P.head.rotation.x = m('nod');
    P.armL.rotation.x = m('arm'); P.armR.rotation.x = m('arm');
    P.armL.rotation.z = m('wide'); P.armR.rotation.z = -m('wide');
    P.foreL.rotation.x = m('fore'); P.foreR.rotation.x = m('fore');
    // Turn the whole body about a pivot near the middle of the tucked shape, so the roll
    // travels over the shoulders instead of swinging round the feet.
    const ang = Math.PI * 2 * THREE.MathUtils.smootherstep(k, 0.1, 0.8);
    const s = P.body.scale.x, py = 1.0, pz = 0.3;
    P.body.rotation.x = ang;
    P.body.position.y = s * (m('lift') - (py * Math.cos(ang) - pz * Math.sin(ang)));
    P.body.position.z = s * (pz - (py * Math.sin(ang) + pz * Math.cos(ang)));
  }

  /**
   * Height of the model's lowest point above its feet at roll fraction k. Measured once per
   * model from the real meshes (builds, heights and hats differ), leaving out the held item
   * and the cape, which may brush the ground.
   */
  private rollFloorAt(k: number): number {
    if (!this.rollFloor) {
      const n = 32, f = new Float32Array(n + 1);
      const box = new THREE.Box3(), base = new THREE.Vector3();
      const skip = new Set<THREE.Object3D | null>([this.held, this.cape]);
      const measure = (o: THREE.Object3D) => {
        if (skip.has(o)) return;
        if ((o as THREE.Mesh).isMesh && o !== this.eyeLids) box.expandByObject(o, true);
        for (const c of o.children) measure(c);
      };
      for (let i = 0; i <= n; i++) {
        this.poseRoll(i / n);
        this.root.updateMatrixWorld(true);
        box.makeEmpty();
        measure(this.body);
        // Standing feet sit a hair below zero; measure the roll against that, not against 0.
        f[i] = box.min.y - this.root.getWorldPosition(base).y;
      }
      const rest = f[0];
      for (let i = 0; i <= n; i++) f[i] -= rest;
      this.rollFloor = f;
    }
    const f = this.rollFloor, x = k * (f.length - 1), i = Math.min(f.length - 2, Math.floor(x));
    return f[i] + (f[i + 1] - f[i]) * (x - i);
  }

  /** Approximate world position of the held item tip (used for sparks, fishing line origin). */
  heldTip(out: THREE.Vector3): THREE.Vector3 {
    if (!this.held) return this.handR.getWorldPosition(out);
    const local = new THREE.Vector3(0, this.heldKind === 'rod' ? 2.1 : 0.75, 0);
    return this.held.localToWorld(out.copy(local));
  }
}
