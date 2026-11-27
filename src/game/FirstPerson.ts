import * as THREE from 'three';
import { armColours, heldObject, offhandObject, type Appearance } from '../entities/humanoid';

// First person, your own hands (owner 2026-11-27: "work on first person"; "the crawler kit could prob help the first
// person view and also armor and weapons"). Zoomed all the way in, you used to see the world and nothing of yourself.
// Now your forearms come up into the bottom of the view, in your own sleeves, cuffs, bracers and gloves, holding what
// you hold: the weapon from your belt drawn as the world sees it, the pick, the axe, the rod, and in the left hand a
// shield, a lamp or a book.
//
// The way of it is the dark-crawler kit's (~/.claude/skills/dark-crawler-kit, p16_weapons.js), made over in our blocks:
// - The hands live in camera space and are drawn in a pass of their own over the frame, the depth cleared first, so
//   they never sink into a wall you stand against.
// - Each pose is a hand position and the direction the blade points; the forearm is solved from a shoulder below the
//   view, so it always trails out of frame and never floats.
// - Swings are keyframed (a three-blow chain, the heavy cleave, the chop, the pick, the cast), sampled by how far
//   through the blow the game's own timer is, and eased toward with a stiffness that's high in a swing and soft at rest.
// - On top: breathing at rest, a walking bob that quickens at a run, a lag behind the mouse, a ribbon of light behind
//   the blade through the cut, and a jolt when a blow lands (with the game's hitstop and camera kick, Game.ts).
//
// Lit by the sky's own two lights, copied in each frame, darker under a roof and in the ground.

/** A pose: the hand's position (camera space: x right, y up, -z ahead) and the way the blade points. */
type Pose = [number, number, number, number, number, number];
type Key = [number, ...Pose];

const READY: Pose = [0.5, -0.36, -0.62, -0.16, 0.5, -0.85]; // (the fist just above the bar, the blade up and in)
const K = (t: number, p: Pose): Key => [t, ...p];
/** Swings, in seconds at a pace of 1 (sampled by the fraction of the blow done, so a faster pace swings faster). */
const SWINGS: Record<string, Key[]> = {
  // right to left, then left to right, then down the middle: Strike's chain (combo 0, 1, 2)
  s1: [K(0, READY), [0.15, 0.4, -0.1, -0.6, 0.8, 0.55, 0.2], [0.24, 0.05, -0.22, -0.68, -0.85, 0.15, -0.5], [0.33, -0.26, -0.42, -0.56, -0.8, -0.45, -0.25], K(0.6, READY)],
  s2: [K(0, READY), [0.14, -0.2, -0.14, -0.6, -0.85, 0.4, 0.1], [0.22, 0.08, -0.24, -0.68, 0.85, 0.15, -0.5], [0.31, 0.38, -0.38, -0.55, 0.85, -0.35, -0.2], K(0.6, READY)],
  s3: [K(0, READY), [0.2, 0.18, 0.06, -0.56, -0.05, 0.6, 0.8], [0.3, 0.06, -0.18, -0.7, -0.05, 0.5, -0.86], [0.38, 0.06, -0.5, -0.62, -0.05, -0.6, -0.8], K(0.7, READY)],
  // Cleave: wound up high and over the shoulder, then all the way across and down
  cleave: [K(0, READY), [0.16, 0.42, 0.1, -0.5, 0.3, 0.65, 0.7], [0.3, 0.02, -0.2, -0.72, -0.7, 0.35, -0.6], [0.42, -0.26, -0.5, -0.56, -0.75, -0.55, -0.3], K(0.62, READY)],
  // a tool brought down on rock or a trunk (looped while you work)
  chop: [[0, 0.34, 0.06, -0.5, 0.05, 0.9, 0.42], [0.32, 0.36, 0.12, -0.46, 0.02, 0.95, 0.3], [0.46, 0.18, -0.36, -0.66, 0.02, -0.25, -0.97], [0.6, 0.2, -0.32, -0.64, 0.02, -0.15, -0.99], [0.8, 0.34, 0.06, -0.5, 0.05, 0.9, 0.42]],
  // a skill from the hand: drawn back, then pushed out
  cast: [K(0, READY), [0.14, 0.3, -0.4, -0.42, 0.0, 0.6, -0.8], [0.26, 0.16, -0.24, -0.86, 0.0, 0.3, -0.95], K(0.7, READY)],
  // the rod: back over the shoulder and out over the water
  fishCast: [[0, 0.36, -0.42, -0.5, 0.0, 0.8, -0.6], [0.3, 0.38, -0.2, -0.36, 0.0, 0.98, 0.2], [0.55, 0.34, -0.36, -0.62, 0.0, 0.5, -0.86], [1.2, 0.36, -0.42, -0.56, 0.0, 0.62, -0.78]],
  // the bow: held out and drawn, then loosed
  shoot: [[0, 0.06, -0.3, -0.62, 0.05, 0.99, -0.1], [0.3, 0.04, -0.27, -0.58, 0.05, 0.99, -0.1], [0.36, 0.06, -0.3, -0.7, 0.05, 0.99, -0.1], [0.62, 0.06, -0.3, -0.62, 0.05, 0.99, -0.1]],
  // the off hand reaching for what's in front of you (picking, opening, patting)
  reach: [[0, -0.3, -0.62, -0.5, 0.4, 0.8, -0.4], [0.35, -0.14, -0.42, -0.72, 0.2, 0.3, -0.93], [0.7, -0.14, -0.44, -0.7, 0.2, 0.35, -0.9], [1.1, -0.3, -0.62, -0.5, 0.4, 0.8, -0.4]],
};
const ROD_HOLD: Pose = [0.36, -0.42, -0.56, 0.0, 0.62, -0.78];
const BOW_HOLD: Pose = [0.06, -0.32, -0.62, 0.05, 0.99, -0.1];
// (the left hand's way is where its knuckles face: a shield's face, a lamp's front, a book's cover)
const LEFT_READY: Pose = [-0.44, -0.62, -0.58, 0.3, 0.3, -0.9];
const LEFT_SHIELD: Pose = [-0.42, -0.52, -0.62, 0.25, 0.15, -0.95];
const LEFT_BLOCK: Pose = [-0.14, -0.3, -0.5, 0.05, 0.05, -1];
/** The shoulders the forearms are solved from: below and to the side of the view, a little behind the eyes. */
const SHOULDER_R = new THREE.Vector3(0.42, -0.95, 0.25), SHOULDER_L = new THREE.Vector3(-0.42, -0.95, 0.25);
/** How big the hands are drawn against the figure they belong to. */
const SCALE = 0.62;

/** What the game tells the view each frame. */
export interface FirstPersonState {
  look: Appearance;
  /** What's in the right hand (a weapon or tool id), and the left (an offhand item id). */
  held: string;
  offhand: string | null;
  /** The figure's animation, and how long it has been in it. */
  anim: string;
  animT: number;
  /** A blow in progress: how far through (0..1), which of the chain, or the cleave. */
  swing: { u: number; combo: number; cleave: boolean } | null;
  blocking: boolean;
  /** Ground speed (blocks a second), and whether you're sprinting. */
  speed: number;
  sprint: boolean;
  /** The camera's turn since last frame (radians), for the hands to lag behind it. */
  dYaw: number;
  dPitch: number;
  /** The sky's lights, and how much of them reaches you (a roof, the ground over you). */
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  shade: number;
}

class Hand {
  readonly root = new THREE.Group();
  /** The fist: its +Z is the way what it holds points, +Y back up the forearm. */
  readonly fist = new THREE.Group();
  held: THREE.Object3D | null = null;
  /** How far out along +Z the blade's tip is (fist space), for the trail. */
  tip = 0.9;
  pose: Pose;
  constructor(pose: Pose) { this.pose = [...pose] as Pose; this.root.add(this.fist); }
}

const mats = new Map<string, THREE.MeshLambertMaterial>();
const lam = (c: string) => { let m = mats.get(c); if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); } return m; };
const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); return m; };

export class FirstPerson {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(66, 1, 0.01, 10);
  private readonly hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  private readonly sun = new THREE.DirectionalLight('#ffffff', 2);
  private readonly right = new Hand(READY);
  private readonly left = new Hand(LEFT_READY);
  private key = '';
  private bob = 0;
  private bobA = 0;
  private lagX = 0;
  private lagY = 0;
  /** A jolt from a blow landing: decays to nothing. */
  private jolt = 0;
  private t = 0;
  private bow = false;
  private trail: THREE.Mesh;
  private trailPts: { a: THREE.Vector3; b: THREE.Vector3; age: number }[] = [];
  /** Whether it was drawn this frame (Game.ts draws its pass only then). */
  visible = false;

  constructor() {
    this.scene.add(this.hemi, this.sun, this.sun.target, this.right.root, this.left.root);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 2 * 3), 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(16 * 2), 1));
    const idx: number[] = [];
    for (let i = 0; i < 15; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
    this.trail = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float alpha; varying float vA; void main() { vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying float vA; void main() { gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * vA * 0.55, vA * 0.55); }',
    }));
    this.trail.frustumCulled = false;
    this.trail.visible = false;
    this.scene.add(this.trail);
  }

  /** A blow landed: the hands jolt back (harder for a critical). */
  hit(crit: boolean): void { this.jolt = Math.min(1.4, this.jolt + (crit ? 1.2 : 0.8)); }

  /** Build the forearms and what's in the hands again when the look or the gear changes. */
  private rebuild(s: FirstPersonState): void {
    const c = armColours(s.look);
    for (const [h, side, item] of [[this.right, 1, s.held], [this.left, -1, s.offhand]] as const) {
      h.fist.clear();
      // The forearm runs up +Y from the wrist, long enough to leave the frame; the sleeve, the cuff, then the hand
      const fore = c.bracers ? c.bracers.color : c.bare ? c.skin : c.sleeve;
      h.fist.add(box(0.17, 0.62, 0.19, fore, 0, 0.42, 0));
      if (c.bracers) h.fist.add(box(0.2, 0.06, 0.22, c.bracers.trim ?? c.cuff, 0, 0.16, 0), box(0.19, 0.06, 0.21, c.bracers.trim ?? c.cuff, 0, 0.58, 0));
      else if (!c.bare) h.fist.add(box(0.2, 0.08, 0.22, c.cuff, 0, 0.14, 0));
      // the fist: knuckles forward, the thumb wrapped over
      h.fist.add(box(0.16, 0.16, 0.17, c.hand, 0, 0.02, 0));
      h.fist.add(box(0.13, 0.05, 0.06, c.hand, 0, 0.04, 0.1));
      h.fist.add(box(0.05, 0.1, 0.06, c.hand, -0.07 * side, -0.02, 0.06));
      h.held = null;
      const o = side > 0 ? heldObject(item ?? 'none') : { mesh: offhandObject(item), bow: false };
      if (side > 0) this.bow = o.bow;
      if (o.mesh) {
        // as the figure holds it (Humanoid.setHeld: laid along the hand's +Z), so the same model and the same grip
        o.mesh.rotation.x = Math.PI / 2;
        if (side < 0) o.mesh.rotation.set(0, 0, 0); // (an offhand sits in the hand as it's built: its face along +Z, ahead)
        h.fist.add(o.mesh);
        h.held = o.mesh;
        const b = new THREE.Box3().setFromObject(o.mesh);
        h.tip = Math.max(0.3, b.max.z);
      }
      h.root.visible = side > 0 || !!o.mesh;
    }
    this.right.root.scale.setScalar(SCALE);
    this.left.root.scale.setScalar(SCALE);
  }

  private sample(keys: Key[], t: number): Pose {
    if (t <= keys[0][0]) return keys[0].slice(1) as Pose;
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i], k = (t - a[0]) / (b[0] - a[0]), e = k * k * (3 - 2 * k);
        return [1, 2, 3, 4, 5, 6].map((j) => a[j] + (b[j] - a[j]) * e) as Pose;
      }
    }
    return keys[keys.length - 1].slice(1) as Pose;
  }

  /** Set the fist where the pose says, the blade along its way, the forearm back toward the shoulder. */
  private place(h: Hand, p: Pose, shoulder: THREE.Vector3): void {
    // (the kit's poses are for a wider view than ours: drawn in nearer the middle and higher, so the fist rests on the
    // bottom edge of the frame with the blade rising into it, as theirs does)
    const at = new THREE.Vector3(p[0] * 0.8, p[1] * 0.6 - 0.04, p[2]);
    const z = new THREE.Vector3(p[3], p[4], p[5]).normalize();
    const up = shoulder.clone().sub(at).normalize();
    const y = up.sub(z.clone().multiplyScalar(up.dot(z))).normalize();
    if (y.lengthSq() < 0.01) y.set(0, 1, 0);
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    h.root.position.copy(at);
    h.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }

  private ease(h: Hand, want: Pose, k: number, dt: number): void {
    const a = 1 - Math.exp(-k * dt);
    for (let i = 0; i < 6; i++) h.pose[i] += (want[i] - h.pose[i]) * a;
  }

  update(dt: number, s: FirstPersonState, aspect: number): void {
    this.t += dt;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const key = JSON.stringify([s.look, s.held, s.offhand]);
    if (key !== this.key) { this.key = key; this.rebuild(s); }

    // The lights: the sky's own, as much as reaches you
    this.hemi.color.copy(s.hemi.color); this.hemi.groundColor.copy(s.hemi.groundColor);
    this.hemi.intensity = s.hemi.intensity * s.shade;
    this.sun.color.copy(s.sun.color);
    this.sun.intensity = s.sun.intensity * s.shade * s.shade;
    this.sun.position.set(0.5, 1, 0.6); // (from over the shoulder: the sun's own way would light the backs of the hands half the day)

    // Where each hand wants to be
    const A = s.anim;
    let R: Pose = this.bow ? [...BOW_HOLD] as Pose : [...READY] as Pose, kR = 14;
    let L: Pose = this.left.held ? [...LEFT_SHIELD] as Pose : [...LEFT_READY] as Pose, kL = 12;
    if (s.swing) {
      const keys = s.swing.cleave ? SWINGS.cleave : [SWINGS.s1, SWINGS.s2, SWINGS.s3][s.swing.combo % 3];
      R = this.sample(keys, s.swing.u * keys[keys.length - 1][0]); kR = 55;
    } else if (A === 'shoot') { R = this.sample(SWINGS.shoot, s.animT); kR = 40; }
    else if (A === 'mine' || A === 'chop' || A === 'hammer' || A === 'dig') { R = this.sample(SWINGS.chop, s.animT % 0.8); kR = 40; }
    else if (A === 'cast' || A === 'heal' || A === 'throw' || A === 'stomp') { R = this.sample(SWINGS.cast, Math.min(s.animT, 0.7)); kR = 40; }
    else if (A === 'fishCast') { R = this.sample(SWINGS.fishCast, s.animT); kR = 30; }
    else if (A === 'fishWait' || s.held === 'rod') { R = [...ROD_HOLD] as Pose; R[1] += Math.sin(this.t * 1.3) * 0.01; }
    if (A === 'gather' || A === 'open' || A === 'petting' || A === 'water' || A === 'cook' || A === 'read') {
      L = this.sample(SWINGS.reach, Math.min(s.animT, 1.1)); kL = 22; this.left.root.visible = true;
    } else this.left.root.visible = !!this.left.held;
    if (s.blocking) { L = [...LEFT_BLOCK] as Pose; kL = 24; if (!this.left.held) { R = [0.2, -0.3, -0.5, -0.9, 0.4, -0.2]; kR = 24; } }
    if (A === 'roll' || A === 'dash' || A === 'jump') { R[1] -= 0.12; L[1] -= 0.12; }
    if (A === 'hit') { R[1] -= 0.05; R[0] += 0.04; }

    // Breathing, the walk, the run (the blade lowered at a sprint), the lag behind the mouse, a blow's jolt
    const moving = Math.min(1, s.speed / 4.5);
    this.bobA += (moving - this.bobA) * (1 - Math.exp(-6 * dt));
    this.bob += dt * (s.sprint ? 13 : 8.5) * Math.max(0.2, this.bobA);
    const by = Math.sin(this.bob * 2) * 0.016 * this.bobA, bx = Math.cos(this.bob) * 0.014 * this.bobA, br = Math.sin(this.t * 1.6) * 0.005;
    this.lagX += (THREE.MathUtils.clamp(s.dYaw * 0.9, -0.07, 0.07) - this.lagX) * (1 - Math.exp(-10 * dt));
    this.lagY += (THREE.MathUtils.clamp(-s.dPitch * 0.9, -0.06, 0.06) - this.lagY) * (1 - Math.exp(-10 * dt));
    this.jolt *= Math.exp(-dt * 9);
    const sprintDrop = s.sprint && !s.swing ? 0.1 : 0;
    for (const [p, w] of [[R, 1], [L, 0.8]] as const) {
      p[0] += (bx + this.lagX) * w; p[1] += (by + br + this.lagY - sprintDrop) * w + this.jolt * 0.035; p[2] += this.jolt * 0.06;
      p[3] += this.lagX * 0.8 * w;
    }
    this.ease(this.right, R, kR, dt);
    this.ease(this.left, L, kL, dt);
    this.place(this.right, this.right.pose, SHOULDER_R);
    this.place(this.left, this.left.pose, SHOULDER_L);
    this.updateTrail(dt, !!s.swing && s.swing.u > 0.15 && s.swing.u < 0.62 && !!this.right.held && !this.bow);
    this.visible = true;
  }

  /** The ribbon behind the blade through the cut: the last few frames of its edge, fading. */
  private updateTrail(dt: number, on: boolean): void {
    for (const p of this.trailPts) p.age += dt;
    this.trailPts = this.trailPts.filter((p) => p.age < 0.12);
    if (on) {
      this.right.root.updateMatrixWorld(true);
      const f = this.right.fist.matrixWorld;
      this.trailPts.unshift({ a: new THREE.Vector3(0, 0, this.right.tip * 0.35).applyMatrix4(f), b: new THREE.Vector3(0, 0, this.right.tip).applyMatrix4(f), age: 0 });
      if (this.trailPts.length > 16) this.trailPts.length = 16;
    }
    const n = this.trailPts.length;
    this.trail.visible = n >= 2;
    if (n < 2) return;
    const pos = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute, al = this.trail.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    for (let i = 0; i < 16; i++) {
      const p = this.trailPts[Math.min(i, n - 1)], k = i < n ? 1 - p.age / 0.12 : 0;
      pos.setXYZ(i * 2, p.a.x, p.a.y, p.a.z); pos.setXYZ(i * 2 + 1, p.b.x, p.b.y, p.b.z);
      al.setX(i * 2, k * 0.25); al.setX(i * 2 + 1, k);
    }
    pos.needsUpdate = true; al.needsUpdate = true;
    this.trail.geometry.setDrawRange(0, (n - 1) * 6);
  }

  /** Drawn over the frame just rendered: the depth cleared, so the hands are always in front. */
  render(renderer: THREE.WebGLRenderer): void {
    if (!this.visible) return;
    const was = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = was;
  }
}
