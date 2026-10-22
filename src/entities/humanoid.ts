import * as THREE from 'three';
import type { EmoteAnim } from '../data/emotes';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


/**
 * Everyone's overall scale. A figure at height 1 stands about 1.85 blocks to the top of the hair,
 * under the lintel of a two-high door (the player's collider is 1.8 blocks).
 */
export const FIGURE = 0.82;

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: number; // 0 short, 1 long, 2 topknot, 3 shaved, 4 braids
  eyes: string;
  tunic: string;
  trim: string;
  trousers: string;
  boots: string;
  cape?: string | null;
  beard?: boolean;
  apron?: boolean;
  hat?: 'none' | 'hood' | 'cap' | 'kerchief' | 'wide' | 'straw' | 'beret' | 'circlet' | 'coif' | 'band';
  hatColor?: string;
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

export type AnimState = 'idle' | 'ride' | 'walk' | 'run' | 'swim' | 'tread' | 'attack' | 'cleave' | 'mine' | 'chop' | 'fishCast' | 'fishWait' | 'hit' | 'dead' | 'roll' | 'talk' | 'hammer' | 'bellows' | 'jump' | 'heal' | 'cook' | EmoteAnim;

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

function faceTexture(a: Appearance): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  x.fillStyle = a.skin; x.fillRect(0, 0, 32, 32);
  // Soft cheek shading
  x.fillStyle = shade(a.skin, 0.93); x.fillRect(0, 22, 32, 10);
  x.fillStyle = 'rgba(220,90,90,0.18)'; x.fillRect(5, 19, 5, 3); x.fillRect(22, 19, 5, 3);
  // Brows, in four shapes
  const brow = (a.age ?? 0) > 0.6 ? '#cfcac0' : shade(a.hair, 0.8);
  x.fillStyle = brow;
  switch (a.brows ?? 0) {
    case 1: x.fillRect(5, 9, 8, 3); x.fillRect(19, 9, 8, 3); break;
    case 2: x.fillRect(6, 10, 2, 1); x.fillRect(8, 9, 4, 1); x.fillRect(12, 10, 1, 1); x.fillRect(19, 10, 1, 1); x.fillRect(20, 9, 4, 1); x.fillRect(24, 10, 2, 1); break;
    case 3: x.fillRect(7, 10, 5, 1); x.fillRect(20, 10, 5, 1); break;
    default: x.fillRect(6, 10, 7, 2); x.fillRect(19, 10, 7, 2);
  }
  if (a.paint) { x.fillStyle = a.paint; x.fillRect(3, 12, 26, 6); }
  // Eyes
  x.fillStyle = '#f6f2ea'; x.fillRect(7, 13, 6, 4); x.fillRect(19, 13, 6, 4);
  x.fillStyle = a.eyes; x.fillRect(9, 13, 3, 4); x.fillRect(20, 13, 3, 4);
  x.fillStyle = '#16100c'; x.fillRect(10, 14, 2, 2); x.fillRect(21, 14, 2, 2);
  x.fillStyle = '#ffffff'; x.fillRect(10, 14, 1, 1); x.fillRect(21, 14, 1, 1);
  if (a.lashes) { x.fillStyle = '#1a120c'; x.fillRect(6, 12, 7, 1); x.fillRect(19, 12, 7, 1); }
  // Nose and mouth
  x.fillStyle = shade(a.skin, 0.82); x.fillRect(15, 15, 2, 5); x.fillRect(14, 19, 4, 1);
  x.fillStyle = shade(a.skin, 0.6); x.fillRect(12, 24, 8, 1);
  x.fillStyle = shade(a.skin, 0.75); x.fillRect(13, 25, 6, 1);
  if ((a.age ?? 0) > 0.5) { x.fillStyle = shade(a.skin, 0.85); x.fillRect(5, 17, 3, 1); x.fillRect(24, 17, 3, 1); x.fillRect(8, 8, 16, 1); }
  if (a.freckles) { x.fillStyle = shade(a.skin, 0.78); for (const [fx, fy] of [[7, 18], [9, 19], [11, 18], [21, 18], [23, 19], [25, 18], [8, 20], [24, 20]]) x.fillRect(fx, fy, 1, 1); }
  if (a.scar) { x.fillStyle = shade(a.skin, 0.68); for (let i = 0; i < 7; i++) x.fillRect(21 + Math.floor(i / 2), 8 + i * 2, 1, 2); }
  const fh = facialOf(a), hc = a.hair, lip = shade(a.skin, 0.55);
  if (fh === 1 || fh === 6 || fh === 8) { x.fillStyle = hc; x.fillRect(3, 21, 26, 11); x.fillRect(10, 20, 12, 3); x.fillStyle = lip; x.fillRect(12, 24, 8, 2); }
  if (fh === 2) { x.fillStyle = 'rgba(40,28,20,0.28)'; x.fillRect(4, 21, 24, 11); }
  if (fh === 3 || fh === 4) { x.fillStyle = hc; x.fillRect(10, 21, 12, 2); x.fillRect(9, 22, 2, 2); x.fillRect(21, 22, 2, 2); }
  if (fh === 4) { x.fillStyle = hc; x.fillRect(13, 26, 6, 6); }
  if (fh === 5) { x.fillStyle = hc; x.fillRect(3, 18, 3, 12); x.fillRect(26, 18, 3, 12); x.fillRect(5, 28, 22, 4); }
  if (fh === 7) { x.fillStyle = hc; x.fillRect(3, 16, 5, 14); x.fillRect(24, 16, 5, 14); x.fillRect(8, 21, 16, 2); }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Facial hair, reading old saves that only had a beard on or off. */
function facialOf(a: Appearance): number {
  return a.facial ?? (a.beard ? 1 : 0);
}

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
  private cape: THREE.Mesh | null = null;
  private held: THREE.Group | null = null;
  heldKind: HeldItem = 'none';
  private phase = 0;
  private blink = 0;
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
    part(this.hips, rbox((fem ? 0.54 : 0.5) * build, 0.2, 0.3, 0.05), look.trousers, 0, 0, 0);

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
    const chestW = (fem ? 0.5 : 0.6) * build, waistW = (fem ? 0.46 : 0.54) * build;
    part(this.torso, rbox(waistW, 0.38, 0.32, 0.06), body, 0, 0.36, 0);
    part(this.torso, rbox(chestW, 0.24, 0.34, 0.07), body, 0, 0.58, 0);
    if (fem) part(this.torso, rbox(0.4 * build, 0.15, 0.08, 0.04), body, 0, 0.5, 0.16);
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
    this.eyeLids = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.06), skinMat);
    this.eyeLids.position.set(0, 0.29, 0.215);
    this.eyeLids.visible = false;
    this.head.add(this.eyeLids);
    // Ears, and an earring
    for (const side of [1, -1]) part(this.head, rbox(0.06, 0.12, 0.08, 0.02), look.skin, side * 0.23, 0.27, 0);
    if (look.earring) part(this.head, rbox(0.03, 0.06, 0.03, 0.01), look.earring, 0.25, 0.18, 0.01);
    // Beards that hang below the chin
    const fh = facialOf(look);
    if (fh === 6) part(this.head, rbox(0.3, 0.26, 0.14, 0.05), look.hair, 0, 0.0, 0.17);
    if (fh === 8) for (const side of [1, -1]) part(this.head, rbox(0.1, 0.24, 0.1, 0.03), look.hair, side * 0.07, -0.02, 0.17);
    this.buildHair(part);

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
    this.foreR.add(this.handR);

    if (look.cape) {
      const capeGeo = new THREE.PlaneGeometry(0.62 * build, 1.0, 2, 6);
      capeGeo.translate(0, -0.5, 0);
      this.cape = new THREE.Mesh(capeGeo, new THREE.MeshLambertMaterial({ color: look.cape, side: THREE.DoubleSide }));
      this.cape.position.set(0, 0.72, -0.18);
      this.cape.castShadow = true;
      this.torso.add(this.cape);
    }
    this.root.traverse((o) => { o.userData.humanoid = this; });
  }

  private buildHair(part: (p: THREE.Object3D, g: THREE.BufferGeometry, c: string, x: number, y: number, z: number) => THREE.Mesh): void {
    const h = this.look.hair;
    const hat = this.look.hat ?? 'none';
    const style = this.look.hairStyle;
    if (hat === 'coif') {
      // A mail coif: the whole head but the face
      const mail = this.look.hatColor ?? '#9aa0a8';
      part(this.head, rbox(0.5, 0.18, 0.48, 0.08), mail, 0, 0.52, -0.01);
      part(this.head, rbox(0.5, 0.5, 0.14, 0.05), mail, 0, 0.3, -0.18);
      for (const s of [1, -1]) part(this.head, rbox(0.06, 0.52, 0.42, 0.03), mail, s * 0.25, 0.26, 0);
      return;
    }
    if (hat === 'hood') {
      part(this.head, rbox(0.52, 0.32, 0.5, 0.1), this.look.hatColor ?? '#4a5a3a', 0, 0.48, -0.02);
      part(this.head, rbox(0.52, 0.42, 0.18, 0.06), this.look.hatColor ?? '#4a5a3a', 0, 0.28, -0.18);
      for (const s of [1, -1]) part(this.head, rbox(0.06, 0.44, 0.44, 0.03), this.look.hatColor ?? '#4a5a3a', s * 0.25, 0.3, 0);
      return;
    }
    // The base cap of hair (a shaved head has stubble only; a mohawk and an undercut keep the sides short)
    const shaved = style === 3 || style === 9;
    if (!shaved) {
      part(this.head, rbox(0.48, 0.14, 0.46, 0.06), h, 0, 0.53, -0.01);
      part(this.head, rbox(0.48, 0.34, 0.12, 0.04), h, 0, 0.36, -0.18);
      if (style !== 10) for (const s of [1, -1]) part(this.head, rbox(0.06, 0.24, 0.36, 0.03), h, s * 0.235, 0.4, -0.03);
      part(this.head, rbox(0.42, 0.08, 0.06, 0.03), h, 0, 0.5, 0.2);
    } else {
      part(this.head, rbox(0.45, 0.04, 0.43, 0.02), shade(h, 0.8), 0, 0.51, 0);
    }
    switch (style) {
      case 5: // bob: to the jaw all round
        for (const s of [1, -1]) part(this.head, rbox(0.08, 0.36, 0.4, 0.04), h, s * 0.24, 0.3, -0.02);
        part(this.head, rbox(0.48, 0.36, 0.1, 0.04), h, 0, 0.3, -0.2);
        break;
      case 6: // ponytail
        part(this.head, rbox(0.12, 0.12, 0.12, 0.04), h, 0, 0.44, -0.26);
        part(this.head, rbox(0.1, 0.42, 0.1, 0.04), h, 0, 0.18, -0.3);
        break;
      case 7: // bun
        part(this.head, rbox(0.2, 0.18, 0.18, 0.08), h, 0, 0.5, -0.27);
        break;
      case 8: // curls
        for (const [cx, cy, cz] of [[-0.16, 0.6, 0.06], [0, 0.62, 0.08], [0.16, 0.6, 0.06], [-0.2, 0.58, -0.12], [0.2, 0.58, -0.12], [0, 0.6, -0.16], [-0.24, 0.42, -0.04], [0.24, 0.42, -0.04]]) part(this.head, rbox(0.14, 0.14, 0.14, 0.06), h, cx, cy, cz);
        break;
      case 9: // mohawk
        part(this.head, rbox(0.1, 0.16, 0.5, 0.04), h, 0, 0.6, -0.02);
        break;
      case 10: // undercut: long on top, swept over
        part(this.head, rbox(0.42, 0.1, 0.44, 0.05), h, 0.04, 0.6, 0);
        part(this.head, rbox(0.12, 0.16, 0.3, 0.04), h, 0.2, 0.52, 0.02);
        break;
      case 11: // twin tails
        for (const s of [1, -1]) { part(this.head, rbox(0.1, 0.1, 0.1, 0.03), h, s * 0.26, 0.48, -0.12); part(this.head, rbox(0.09, 0.4, 0.09, 0.03), h, s * 0.3, 0.24, -0.14); }
        break;
      case 12: // wild mane
        part(this.head, rbox(0.56, 0.2, 0.52, 0.08), h, 0, 0.56, -0.03);
        part(this.head, rbox(0.56, 0.6, 0.16, 0.06), h, 0, 0.2, -0.22);
        for (const s of [1, -1]) part(this.head, rbox(0.1, 0.5, 0.34, 0.05), h, s * 0.26, 0.24, -0.06);
        break;
    }
    if (style === 1) part(this.head, rbox(0.46, 0.5, 0.1, 0.04), h, 0, 0.18, -0.22);
    if (style === 2) { part(this.head, rbox(0.18, 0.18, 0.18, 0.07), h, 0, 0.66, -0.06); part(this.head, rbox(0.1, 0.06, 0.1, 0.02), '#a8442e', 0, 0.58, -0.06); }
    if (style === 4) for (const s of [1, -1]) { part(this.head, rbox(0.1, 0.5, 0.1, 0.04), h, s * 0.2, 0.08, -0.15); part(this.head, rbox(0.11, 0.05, 0.11, 0.02), '#e2c070', s * 0.2, -0.15, -0.15); }
    if (hat === 'cap') part(this.head, rbox(0.5, 0.12, 0.5, 0.05), this.look.hatColor ?? '#6a3a2a', 0, 0.58, 0);
    if (hat === 'wide' || hat === 'straw') {
      const c = hat === 'straw' ? '#d8b860' : this.look.hatColor ?? '#3a3a32';
      part(this.head, rbox(0.8, 0.04, 0.8, 0.02), c, 0, 0.56, 0);
      part(this.head, rbox(0.44, 0.2, 0.44, 0.06), c, 0, 0.66, 0);
      part(this.head, rbox(0.45, 0.05, 0.45, 0.02), hat === 'straw' ? '#a8382c' : shade(c, 0.6), 0, 0.6, 0);
    }
    if (hat === 'beret') { const c = this.look.hatColor ?? '#2e3a5a'; const b = part(this.head, rbox(0.5, 0.1, 0.48, 0.05), c, -0.04, 0.6, 0); b.rotation.z = 0.15; }
    if (hat === 'circlet') {
      const c = this.look.hatColor === '#d8d0b8' ? '#d8d0b8' : '#d8b04a';
      part(this.head, rbox(0.47, 0.04, 0.45, 0.01), c, 0, 0.47, 0);
      part(this.head, rbox(0.06, 0.06, 0.03, 0.01), '#5fd0e6', 0, 0.48, 0.23);
    }
    if (hat === 'band') part(this.head, rbox(0.47, 0.06, 0.45, 0.02), this.look.hatColor ?? '#a8382c', 0, 0.46, 0);
    if (hat === 'kerchief') { part(this.head, rbox(0.5, 0.14, 0.48, 0.06), this.look.hatColor ?? '#a8382c', 0, 0.55, -0.02); part(this.head, rbox(0.14, 0.14, 0.08, 0.03), this.look.hatColor ?? '#a8382c', 0, 0.42, -0.26); }
  }

  setHeld(kind: HeldItem): void {
    if (kind === this.heldKind) return;
    if (this.held) this.handR.remove(this.held);
    this.held = kind === 'none' ? null : heldMesh(kind);
    if (this.held) {
      this.held.rotation.x = Math.PI / 2;
      this.handR.add(this.held);
    }
    this.heldKind = kind;
  }

  /** Stroke phase, and the swimmer's body pitch (set by the player; 0 is level, positive head-up). */
  private swimPhase = 0;
  swimPitch = 0;

  setState(s: AnimState): void {
    if (s !== this.state) { this.state = s; this.stateTime = 0; }
  }

  /** speed is horizontal speed in m/s; used to drive the stride. */
  update(dt: number, speed: number, airborne = false): void {
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
      const blade = this.heldKind === 'sword' || this.heldKind === 'bronzeSword';
      P.held.rotation.set(blade && resting ? Math.PI / 2 + 0.38 : Math.PI / 2, 0, 0);
    }

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
        P.legL.rotation.set(-1.05, 0, 0.5); P.legR.rotation.set(-1.05, 0, -0.5);
        P.shinL.rotation.x = 1.25; P.shinR.rotation.x = 1.25;
        P.armL.rotation.x = -0.65; P.armR.rotation.x = -0.65;
        P.armL.rotation.z = 0.12; P.armR.rotation.z = -0.12;
        P.foreL.rotation.x = -0.55; P.foreR.rotation.x = -0.55;
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
        P.legL.rotation.x = -0.35; P.legR.rotation.x = 0.3; P.shinR.rotation.x = 0.3;
        break;
      }
      case 'cleave': {
        const k = Math.min(1, t / 0.55);
        P.body.rotation.y = k * Math.PI * 2;
        P.armR.rotation.x = -1.5;
        P.armR.rotation.z = -1.3;
        P.armL.rotation.z = 1.2;
        P.legL.rotation.x = -0.4; P.legR.rotation.x = 0.4;
        P.body.position.y = Math.sin(k * Math.PI) * 0.15;
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
