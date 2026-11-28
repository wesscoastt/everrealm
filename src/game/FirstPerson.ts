import * as THREE from 'three';
import { heldFamily, heldObject, offhandObject, type Appearance, type WeaponFamily } from '../entities/humanoid';
import { buildArm } from './fpArms';

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

// (owner 2026-11-27: "arms in first person need to be more natural positioion"): the fist rests low in the right corner, a
// little way out from the eye, the blade angled forward and in over the ground ahead rather than standing up in the view
// (owner 2026-11-27, docs/briefs/first-person-arms.md: the concept's right hand low on the right, the fingers round the grip
// and the blade rising up and a little out; the left hand low on the left, open and easy, palm down)
const READY: Pose = [0.59, -0.23, -0.78, 0.22, 0.8, -0.56];
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
// ---------------------------------------------------------------------------------------------------------------
// The skills (owner 2026-11-27: "first person needs work, lots of skills have no animation need stuff like eso first
// person level triple a"). Every skill on the bar has a move of its own, both hands keyframed: what it is comes from
// the skill (its name and what it does), so a thrust stabs, a spin sweeps the blade all the way across, a slam brings
// both hands down to the ground, a ward puts a palm up behind a disc of light, a heal opens the off hand palm up in a
// gold glow, a cast pushes the open off hand out with the calling's own colour gathered in it.
// (the off hand rests low in the left corner, above the bar, knuckles forward and a little in)
const LIDLE: Pose = [-0.46, -0.27, -0.72, 0.12, -0.92, -0.36];
/** A move: keys for the right hand, the left, how long it lasts, which hands glow (and from when), and its kick. */
export interface Move { R?: Key[]; L?: Key[]; dur: number; open?: boolean; glow?: 'L' | 'R' | 'both'; glowAt?: [number, number]; ward?: boolean; kickAt?: number; kick?: number; trail?: [number, number] }
const MOVES: Record<string, Move> = {
  slash: { R: SWINGS.s1, L: [K(0, LIDLE), [0.2, -0.56, -0.62, -0.5, 0.4, 0.2, -0.9], K(0.6, LIDLE)], dur: 0.6, trail: [0.12, 0.36] },
  backhand: { R: SWINGS.s2, dur: 0.6, trail: [0.12, 0.34] },
  overhead: { R: SWINGS.s3, dur: 0.7, trail: [0.18, 0.4], kickAt: 0.36, kick: 0.05 },
  thrust: { R: [K(0, READY), [0.12, 0.38, -0.32, -0.4, -0.05, 0.2, -0.98], [0.2, 0.08, -0.2, -0.95, -0.02, 0.08, -1], [0.3, 0.1, -0.22, -0.9, -0.02, 0.1, -1], K(0.5, READY)], dur: 0.5, trail: [0.12, 0.26] },
  flurry: { R: [K(0, READY), [0.08, 0.08, -0.2, -0.92, 0, 0.08, -1], [0.14, 0.35, -0.3, -0.5, 0, 0.2, -1], [0.22, -0.05, -0.15, -0.92, 0, 0.1, -1], [0.28, 0.35, -0.3, -0.5, 0, 0.2, -1], [0.36, 0.15, -0.25, -0.95, 0, 0.05, -1], K(0.6, READY)], dur: 0.6, trail: [0.04, 0.4] },
  spin: { R: [K(0, READY), [0.12, 0.75, -0.15, -0.35, 0.95, 0.15, 0.2], [0.26, 0.1, -0.2, -0.75, 0.2, 0.1, -1], [0.38, -0.75, -0.2, -0.4, -0.95, 0.1, 0.15], K(0.7, READY)], L: [K(0, LIDLE), [0.2, -0.72, -0.5, -0.3, 0.3, 0.3, -0.9], K(0.7, LIDLE)], dur: 0.7, trail: [0.1, 0.42], kickAt: 0.26, kick: 0.04 },
  slam: { R: [K(0, READY), [0.22, 0.2, 0.25, -0.45, 0.05, 0.95, 0.3], [0.34, 0.08, -0.36, -0.72, 0.02, -0.6, -0.8], [0.5, 0.08, -0.34, -0.7, 0.02, -0.55, -0.8], K(0.8, READY)], L: [K(0, LIDLE), [0.22, -0.15, 0.2, -0.45, 0, 0.9, -0.3], [0.34, -0.08, -0.36, -0.72, 0, -0.5, -0.9], [0.5, -0.08, -0.34, -0.7, 0, -0.5, -0.9], K(0.8, LIDLE)], dur: 0.8, trail: [0.24, 0.38], kickAt: 0.34, kick: 0.16 },
  leap: { R: [K(0, READY), [0.3, 0.25, 0.3, -0.4, 0.05, 0.95, 0.3], [0.44, 0.08, -0.38, -0.72, 0.02, -0.6, -0.8], [0.6, 0.08, -0.34, -0.7, 0.02, -0.55, -0.8], K(0.9, READY)], L: [K(0, LIDLE), [0.3, -0.25, 0.1, -0.4, 0, 0.9, -0.3], [0.44, -0.2, -0.38, -0.6, 0, -0.5, -0.9], K(0.9, LIDLE)], dur: 0.9, trail: [0.32, 0.48], kickAt: 0.44, kick: 0.2 },
  bash: { L: [K(0, LIDLE), [0.1, -0.42, -0.45, -0.4, 0.3, 0.1, -0.9], [0.2, -0.1, -0.25, -0.88, 0.05, 0, -1], [0.32, -0.12, -0.27, -0.85, 0.05, 0, -1], K(0.55, LIDLE)], R: [K(0, READY), [0.15, 0.62, -0.45, -0.45, 0.1, 0.6, -0.6], K(0.55, READY)], dur: 0.55, kickAt: 0.2, kick: 0.08 },
  uppercut: { R: [K(0, READY), [0.14, 0.2, -0.6, -0.5, 0.1, -0.4, -0.9], [0.26, 0.05, 0.1, -0.75, 0, 0.95, -0.3], K(0.55, READY)], dur: 0.55, trail: [0.14, 0.3], kickAt: 0.26, kick: 0.05 },
  warcry: { R: [K(0, READY), [0.15, 0.45, 0.15, -0.55, 0, 1, 0.1], [0.55, 0.45, 0.18, -0.55, 0, 1, 0.1], K(0.8, READY)], L: [K(0, LIDLE), [0.15, -0.4, 0.12, -0.55, 0, 1, 0.1], [0.55, -0.4, 0.15, -0.55, 0, 1, 0.1], K(0.8, LIDLE)], dur: 0.8, kickAt: 0.15, kick: 0.1 },
  cast: { L: [K(0, LIDLE), [0.14, -0.3, -0.35, -0.4, 0.1, 0.5, -0.85], [0.26, -0.08, -0.15, -0.88, 0, 0.1, -1], [0.4, -0.08, -0.15, -0.85, 0, 0.1, -1], K(0.65, LIDLE)], R: [K(0, READY), [0.2, 0.62, -0.5, -0.55, -0.1, 0.5, -0.85], K(0.65, READY)], dur: 0.65, open: true, glow: 'L', glowAt: [0.05, 0.45] },
  castBoth: { L: [K(0, LIDLE), [0.14, -0.3, -0.35, -0.4, 0.1, 0.5, -0.85], [0.26, -0.1, -0.15, -0.88, 0.2, 0.1, -1], [0.4, -0.1, -0.15, -0.85, 0.2, 0.1, -1], K(0.65, LIDLE)], R: [K(0, READY), [0.14, 0.3, -0.3, -0.45, -0.3, 0.5, -0.8], [0.26, 0.12, -0.15, -0.85, -0.2, 0.2, -0.95], [0.4, 0.12, -0.15, -0.82, -0.2, 0.2, -0.95], K(0.65, READY)], dur: 0.65, open: true, glow: 'both', glowAt: [0.05, 0.45], kickAt: 0.26, kick: 0.05 },
  channel: { L: [K(0, LIDLE), [0.18, -0.12, -0.18, -0.8, 0.15, 0.15, -1], [0.85, -0.12, -0.16, -0.8, 0.15, 0.15, -1], K(1.05, LIDLE)], R: [K(0, READY), [0.18, 0.14, -0.18, -0.8, -0.15, 0.2, -0.95], [0.85, 0.14, -0.16, -0.8, -0.15, 0.2, -0.95], K(1.05, READY)], dur: 1.05, open: true, glow: 'both', glowAt: [0.1, 0.9] },
  heal: { L: [K(0, LIDLE), [0.2, -0.25, -0.35, -0.55, 0.1, 0.9, -0.3], [0.45, -0.2, -0.22, -0.6, 0.05, 0.95, -0.2], K(0.8, LIDLE)], R: [K(0, READY), [0.3, 0.55, -0.3, -0.6, -0.1, 0.6, -0.8], K(0.8, READY)], dur: 0.8, open: true, glow: 'L', glowAt: [0.15, 0.7] },
  ward: { L: [K(0, LIDLE), [0.15, -0.2, -0.15, -0.55, 0, 0.1, -1], [0.6, -0.2, -0.12, -0.55, 0, 0.1, -1], K(0.85, LIDLE)], dur: 0.85, open: true, glow: 'L', glowAt: [0.1, 0.7], ward: true },
  throw: { R: [K(0, READY), [0.16, 0.45, 0.2, -0.2, 0, 0.9, 0.4], [0.28, 0.1, -0.1, -0.95, 0, 0.2, -1], K(0.55, READY)], L: [K(0, LIDLE), [0.16, -0.2, -0.2, -0.8, 0.2, 0.2, -1], K(0.55, LIDLE)], dur: 0.55, trail: [0.16, 0.3] },
  dash: { R: [K(0, READY), [0.1, 0.55, -0.62, -0.3, 0, 0.4, -0.9], [0.3, 0.55, -0.62, -0.35, 0, 0.4, -0.9], K(0.45, READY)], L: [K(0, LIDLE), [0.1, -0.55, -0.62, -0.3, 0.3, 0.4, -0.9], [0.3, -0.55, -0.62, -0.35, 0.3, 0.4, -0.9], K(0.45, LIDLE)], dur: 0.45, kickAt: 0.05, kick: 0.06 },
  stomp: { R: [K(0, READY), [0.18, 0.4, 0.0, -0.5, 0.05, 0.9, 0.2], [0.3, 0.3, -0.4, -0.6, 0.02, -0.3, -0.9], K(0.6, READY)], L: [K(0, LIDLE), [0.18, -0.35, 0.0, -0.5, 0, 0.9, -0.2], [0.3, -0.3, -0.4, -0.6, 0, -0.3, -0.9], K(0.6, LIDLE)], dur: 0.6, kickAt: 0.3, kick: 0.14 },
  whistle: { L: [K(0, LIDLE), [0.2, -0.05, -0.15, -0.25, 0, 0.3, -1], [0.65, -0.05, -0.15, -0.25, 0, 0.3, -1], K(0.85, LIDLE)], dur: 0.85 },
  crouch: { R: [K(0, READY), [0.2, 0.5, -0.58, -0.6, -0.16, 0.5, -0.85], K(0.65, READY)], L: [K(0, LIDLE), [0.2, -0.5, -0.62, -0.6, 0.35, 0.35, -0.85], K(0.65, LIDLE)], dur: 0.65 },
  shoot: { R: SWINGS.shoot, dur: 0.62 },
  volley: { R: [[0, 0.06, -0.3, -0.62, 0.05, 0.99, -0.1], [0.25, 0.1, 0.05, -0.55, 0.05, 0.9, 0.4], [0.35, 0.1, 0.08, -0.6, 0.05, 0.9, 0.4], [0.6, 0.06, -0.3, -0.62, 0.05, 0.99, -0.1]], dur: 0.6, kickAt: 0.35, kick: 0.04 },
};
/** The move a skill makes, from the animation it asks of the body and what it is (its name and what it does). */
export function moveFor(anim: string, name: string, desc: string, bow: boolean): string {
  const t = (name + ' ' + desc).toLowerCase(), has = (...w: string[]) => w.some((x) => t.includes(x));
  if (bow && (anim === 'shoot' || anim === 'attack')) return has('volley', 'rain', 'hail of', 'barrage') ? 'volley' : 'shoot';
  const elemental = has('fire', 'frost', 'ice', 'lightning', 'storm', 'bolt', 'flame', 'spark', 'smoulder', 'ember', 'cinder', 'element', 'curse', 'hex', 'spirit', 'shadow', 'grave');
  switch (anim) {
    case 'shoot': return has('volley', 'rain', 'hail of', 'barrage') ? 'volley' : 'shoot';
    case 'heal':
      if (has('ward', 'barrier', 'aegis', 'shield of', 'bulwark', 'guard', 'cover')) return 'ward';
      if (has(' cry', 'shout', 'roar', 'rally', 'war ', 'horn', 'banner', 'howl', 'bellow', 'blade', 'poison', 'hold fast')) return 'warcry';
      if (elemental || has('ring of', 'wall')) return 'castBoth';
      return 'heal';
    case 'cast': return has('channel', 'beam', 'stream', 'drain', 'siphon') ? 'channel' : 'castBoth';
    case 'cleave':
      if (has('spin', 'whirl', 'sweep', 'circle', 'cyclone', 'around you', 'all round')) return 'spin';
      if (has('leap', 'jump', 'pounce', 'vault')) return 'leap';
      if (has('slam', 'smash', 'quake', 'crush', 'hammer', 'ground', 'shatter', 'grip')) return 'slam';
      if (has('challenge', 'taunt', 'dread', 'fear', 'terror', 'rebuke')) return 'warcry';
      if (elemental) return 'castBoth';
      return 'overhead';
    case 'attack':
      if (has('bash', 'shove', 'shield', 'buffet', 'knock back', 'knocks back')) return 'bash';
      if (has('flurry', 'rapid', 'twin', 'quick', 'thousand', 'flurries', 'three blows', 'two blows', 'backstab')) return 'flurry';
      if (has('thrust', 'stab', 'pierce', 'lunge', 'sting', 'fang', 'impale', 'skewer', 'spear', 'riposte')) return 'thrust';
      if (has('uppercut', 'rising', 'launch', 'upward', 'bell')) return 'uppercut';
      if (has('sand', 'snare', 'net', 'caltrop', 'dust', 'toss')) return 'throw';
      if (has('tumble', 'roll', 'step')) return 'dash';
      if (has('finish', 'execute', 'cleave', 'chop')) return 'overhead';
      if (elemental) return 'cast';
      // the rest alternate, by name, between the forehand and the backhand, so a bar of them doesn't look the same
      return [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 2 ? 'backhand' : 'slash';
    case 'stomp': return 'stomp';
    case 'dash': return 'dash';
    case 'throw': return 'throw';
    case 'whistle': return 'whistle';
    case 'crouch': return 'crouch';
    default: return 'slash';
  }
}

const ROD_HOLD: Pose = [0.36, -0.42, -0.56, 0.0, 0.62, -0.78];
const BOW_HOLD: Pose = [0.06, -0.32, -0.62, 0.05, 0.99, -0.1];
// (the left hand's way is where its knuckles face: a shield's face, a lamp's front, a book's cover)
const LEFT_READY: Pose = [-0.46, -0.27, -0.72, 0.12, -0.92, -0.36];
/** How each kind of weapon rests in the hand: a dagger low and pointing ahead, a two-hander up across the body with the
 *  other hand below on the grip, a spear levelled, a staff upright. (Swords, axes and maces take READY.) */
const REST: Partial<Record<WeaponFamily, Pose>> = {
  dagger: [0.56, -0.3, -0.72, -0.08, 0.3, -0.95],
  // (two-handers further out and nearer the middle, so the off hand on the grip below shows and the blade doesn't fill the view)
  greatsword: [0.24, -0.2, -1.05, -0.36, 0.78, -0.5],
  greataxe: [0.26, -0.22, -1.05, -0.38, 0.76, -0.52],
  hammer: [0.26, -0.22, -1.05, -0.38, 0.76, -0.52],
  spear: [0.24, -0.26, -1.0, -0.08, 0.2, -0.98],
  staff: [0.58, -0.24, -0.84, 0.05, 0.98, -0.18],
};
/** Two-handed: the off hand takes the grip below the right. */
const TWO_HANDED = new Set<WeaponFamily>(['greatsword', 'greataxe', 'hammer', 'spear']);
const LEFT_SHIELD: Pose = [-0.56, -0.3, -0.72, 0.25, 0.12, -0.96];
const LEFT_BLOCK: Pose = [-0.14, -0.3, -0.5, 0.05, 0.05, -1];
/** The shoulders the forearms are solved from: below and to the side of the view, a little behind the eyes. */
// Where each elbow is: out of the view below and to the side, a little ahead of the eye. Every forearm is aimed straight
// at its elbow, so the arm always runs off the bottom corner to the body it belongs to, and the elbow follows the hand a
// little as it moves (a swing across the body pulls it in). (The V the owner saw came from aiming at points behind the eye.)
const ELBOW_R = new THREE.Vector3(0.66, -0.55, -0.26), ELBOW_L = new THREE.Vector3(-0.66, -0.55, -0.26);
/** How big the hands are drawn against the figure they belong to. */
const SCALE = 0.62;
/** Where the wrist is, up the forearm from the grip (in the hand's own units). */
const WRIST = 0.15;

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
  /** A skill being used: its move (moveFor), how long since it went off, and its colour (the calling's element, or gold). */
  skill: { move: string; t: number; color: string } | null;
}

class Hand {
  readonly root = new THREE.Group();
  /** The fist: its +Z is the way what it holds points, +Y back up the forearm. */
  readonly fist = new THREE.Group();
  /** The hand closed round what it holds, and open (a spell, a heal, a ward): one shown at a time. */
  readonly closed = new THREE.Group();
  readonly open = new THREE.Group();
  /** What gathers in the palm while a skill is cast: a bright core and a soft halo. */
  readonly glow = new THREE.Group();
  held: THREE.Object3D | null = null;
  /** How far out along +Z the blade's tip is (fist space), for the trail. */
  tip = 0.9;
  pose: Pose;
  /** The forearm, a piece of its own from the wrist to the elbow: it aims at the elbow while the hand turns at the wrist
   *  to hold the blade where it should point (one rigid piece forced the blade back at the eye). Its blocks hang in
   *  foreInner, shifted so the joint is its origin. */
  readonly fore = new THREE.Group();
  readonly foreInner = new THREE.Group();
  constructor(pose: Pose) { this.pose = [...pose] as Pose; this.root.add(this.fist); this.fist.add(this.closed, this.open, this.glow); this.fore.add(this.foreInner); this.foreInner.position.y = -WRIST; }
}
const GLOW_CORE = new THREE.SphereGeometry(0.065, 12, 9), GLOW_HALO = new THREE.SphereGeometry(0.14, 12, 9), WARD_DISC = new THREE.CircleGeometry(0.46, 32);

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
  /** What family of weapon is in the right hand, and whether it takes both hands. */
  private fam: WeaponFamily | null = null;
  private twoH = false;
  /** A light that's always with you, so your own arms never go black at night or in a cellar (the sky's lights on top). */
  private readonly fill = new THREE.AmbientLight('#fff2e0', 0.5);
  private trail: THREE.Mesh;
  private trailPts: { a: THREE.Vector3; b: THREE.Vector3; age: number }[] = [];
  /** Whether it was drawn this frame (Game.ts draws its pass only then). */
  visible = false;

  constructor() {
    this.scene.add(this.hemi, this.sun, this.sun.target, this.fill, this.right.root, this.left.root, this.right.fore, this.left.fore);
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
    this.fam = heldFamily(s.held);
    this.twoH = !!this.fam && TWO_HANDED.has(this.fam) && !s.offhand;
    for (const [h, side, item] of [[this.right, 1, s.held], [this.left, -1, s.offhand]] as const) {
      for (const g of [h.fist, h.closed, h.open, h.glow, h.foreInner]) g.clear();
      h.fist.add(h.closed, h.open, h.glow);
      // The arm as the figure is dressed (game/fpArms.ts): forearm, wrist, sleeve or bracer or vambrace, the hand round the
      // grip and the hand open
      const parts = buildArm(s.look, side);
      h.foreInner.add(parts.arm);
      h.closed.add(...parts.closed.children);
      h.open.add(...parts.open.children);
      h.open.visible = false;
      // the glow in the palm, and (the left) a ward's disc of light in front of it
      const core = new THREE.Mesh(GLOW_CORE, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
      const halo = new THREE.Mesh(GLOW_HALO, new THREE.MeshBasicMaterial({ color: '#ffd080', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      core.position.set(0, -0.08, 0.14); halo.position.copy(core.position);
      h.glow.add(core, halo);
      if (side < 0) { const disc = new THREE.Mesh(WARD_DISC, new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); disc.position.set(0, -0.12, 0.42); disc.name = 'ward'; h.glow.add(disc); }
      h.glow.visible = false;
      h.held = null;
      const o = side > 0 ? heldObject(item ?? 'none') : { mesh: offhandObject(item), bow: false };
      if (side > 0) this.bow = o.bow;
      if (o.mesh) {
        // as the figure holds it (Humanoid.setHeld: laid along the hand's +Z), so the same model and the same grip
        o.mesh.rotation.x = Math.PI / 2;
        if (side < 0) o.mesh.rotation.set(0, 0, 0); // (an offhand sits in the hand as it's built: its face along +Z, ahead)
        h.closed.add(o.mesh);
        h.held = o.mesh;
        const b = new THREE.Box3().setFromObject(o.mesh);
        h.tip = Math.max(0.3, b.max.z);
      }
      h.root.visible = true; // (both hands, as ESO shows them: the off hand low and ready when it holds nothing)
      h.fore.visible = true;
    }
    for (const h of [this.right, this.left]) { h.root.scale.setScalar(SCALE); h.fore.scale.setScalar(SCALE); }
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

  /** Set the hand where the pose says: its forearm aimed at its elbow, the blade's way kept as near as the wrist allows. */
  private place(h: Hand, p: Pose, elbow: THREE.Vector3): void {
    // (the poses are written for a wider view than ours: drawn in nearer the middle and a little higher)
    this.orient(h, new THREE.Vector3(p[0] * 0.8, p[1] * 0.6 - 0.04, p[2]), new THREE.Vector3(p[3], p[4], p[5]), elbow);
  }

  /** Put a hand at a point (camera space), the forearm running straight to its elbow (which follows the hand a little), and
   *  turn it about the forearm so what it holds points as near the way asked as it can. The forearm is never bent to suit
   *  the blade: it's what keeps the arm joined to the body. */
  private orient(h: Hand, at: THREE.Vector3, way: THREE.Vector3, elbow: THREE.Vector3): void {
    const E = elbow.clone().addScaledVector(at, 0.3);
    // The hand: what it holds points the way asked; its back up toward the elbow as near as that allows (the wrist bends)
    const z = way.clone().normalize();
    const toE = E.clone().sub(at).normalize();
    const y = toE.clone().addScaledVector(z, -toE.dot(z));
    if (y.lengthSq() < 1e-4) y.set(0, 1, 0).addScaledVector(z, -z.y);
    y.normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    h.root.position.copy(at);
    h.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    // The forearm: from the wrist straight to the elbow, turned with the hand about its own length
    const wrist = at.clone().add(y.clone().multiplyScalar(WRIST * SCALE));
    const fy = E.sub(wrist).normalize();
    const fz = z.clone().addScaledVector(fy, -z.dot(fy));
    if (fz.lengthSq() < 1e-4) fz.copy(x).cross(fy);
    fz.normalize();
    const fx = new THREE.Vector3().crossVectors(fy, fz).normalize();
    h.fore.position.copy(wrist);
    h.fore.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fx, fy, fz));
  }

  /** A two-hander: the off hand takes the grip below the right, the same way along the handle, its own forearm to its own elbow. */
  private gripBelow(): void {
    this.right.root.updateMatrixWorld(true);
    const at = this.right.fist.localToWorld(new THREE.Vector3(0, 0, -0.21));
    const way = new THREE.Vector3(0, 0, 1).transformDirection(this.right.fist.matrixWorld);
    this.orient(this.left, at, way, ELBOW_L);
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
    // ...and never less than enough to see your own hands by: the darker it is, the more the fill makes up
    const lit = this.hemi.intensity + this.sun.intensity * 0.4;
    this.fill.intensity = THREE.MathUtils.clamp(1.25 - lit, 0.3, 1.0);

    // Where each hand wants to be
    const A = s.anim;
    let R: Pose = this.bow ? [...BOW_HOLD] as Pose : [...(this.fam && REST[this.fam] ? REST[this.fam]! : READY)] as Pose, kR = 14;
    let L: Pose = this.left.held ? [...LEFT_SHIELD] as Pose : [...LIDLE] as Pose, kL = 12;
    // A skill's own move, both hands, over its own length
    const mv = s.skill && !s.swing ? MOVES[s.skill.move] : null, mt = s.skill?.t ?? 0;
    let glowR = 0, glowL = 0, ward = 0, trailOn = false;
    if (mv && mt < mv.dur) {
      if (mv.R) { R = this.sample(mv.R, mt); kR = 50; }
      if (mv.L) { L = this.sample(mv.L, mt); kL = 45; }
      const [g0, g1] = mv.glowAt ?? [0, 0], up = mt > g0 && mt < g1 ? Math.min(1, (mt - g0) / 0.08, (g1 - mt) / 0.12) : 0;
      if (mv.glow === 'L' || mv.glow === 'both') glowL = up;
      if (mv.glow === 'R' || mv.glow === 'both') glowR = up;
      if (mv.ward) ward = up;
      if (mv.trail && mt > mv.trail[0] && mt < mv.trail[1]) trailOn = true;
      if (mv.kickAt !== undefined && this.lastMoveT < mv.kickAt && mt >= mv.kickAt) { this.jolt = Math.min(1.4, this.jolt + 0.6); this.kick += mv.kick ?? 0.05; }
    }
    this.lastMoveT = mt;
    // the off hand opens for a spell, a heal or a ward (and the right too, when it holds nothing)
    const openNow = !!mv && !!mv.open && mt < mv.dur;
    // An empty hand rests open and easy, as the concept's left does; it closes round a grip, or to strike with nothing in it.
    // A two-hander's off hand is closed on the grip unless a spell takes it away.
    const twoGrip = this.twoH && !openNow;
    this.left.open.visible = !this.left.held && !twoGrip; this.left.closed.visible = !this.left.open.visible;
    this.right.open.visible = !this.right.held && (openNow || !s.swing); this.right.closed.visible = !this.right.open.visible;
    this.setGlow(this.left, glowL, s.skill?.color, ward);
    this.setGlow(this.right, glowR, s.skill?.color, 0);
    if (s.swing) {
      const keys = s.swing.cleave ? SWINGS.cleave : [SWINGS.s1, SWINGS.s2, SWINGS.s3][s.swing.combo % 3];
      R = this.sample(keys, s.swing.u * keys[keys.length - 1][0]); kR = 55;
    } else if (mv && mt < mv.dur) { /* (the skill's move, above) */ }
    else if (A === 'shoot') { R = this.sample(SWINGS.shoot, s.animT); kR = 40; }
    else if (A === 'mine' || A === 'chop' || A === 'hammer' || A === 'dig') { R = this.sample(SWINGS.chop, s.animT % 0.8); kR = 40; }
    else if (A === 'cast' || A === 'heal' || A === 'throw' || A === 'stomp') { R = this.sample(SWINGS.cast, Math.min(s.animT, 0.7)); kR = 40; }
    else if (A === 'fishCast') { R = this.sample(SWINGS.fishCast, s.animT); kR = 30; }
    else if (A === 'fishWait' || s.held === 'rod') { R = [...ROD_HOLD] as Pose; R[1] += Math.sin(this.t * 1.3) * 0.01; }
    if (A === 'gather' || A === 'open' || A === 'petting' || A === 'water' || A === 'cook' || A === 'read') { L = this.sample(SWINGS.reach, Math.min(s.animT, 1.1)); kL = 22; }
    if (s.blocking) {
      // a two-hander is held across the body to take the blow; a shield comes up; an empty off hand comes up with the blade
      if (this.twoH) { R = [0.18, -0.22, -0.62, -0.95, 0.28, -0.1]; kR = 24; }
      else { L = [...LEFT_BLOCK] as Pose; kL = 24; if (!this.left.held) { R = [0.2, -0.3, -0.5, -0.9, 0.4, -0.2]; kR = 24; } }
    }
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
    this.place(this.right, this.right.pose, ELBOW_R);
    if (twoGrip) this.gripBelow(); else this.place(this.left, this.left.pose, ELBOW_L);
    this.updateTrail(dt, ((!!s.swing && s.swing.u > 0.15 && s.swing.u < 0.62) || trailOn) && !!this.right.held && !this.bow);
    this.visible = true;
  }

  /** How far through the current move it was last frame (for its kick), and the kick owed to the camera. */
  private lastMoveT = 0;
  private kick = 0;
  /** The camera shake owed by a move landing (slam, leap, bash): taken once by Game.ts. */
  takeKick(): number { const k = this.kick; this.kick = 0; return k; }

  /** Light the palm (k 0..1) in the skill's colour, pulsing; and the ward's disc in front of the left hand. */
  private setGlow(h: Hand, k: number, color: string | undefined, ward: number): void {
    h.glow.visible = k > 0.01 || ward > 0.01;
    if (!h.glow.visible) return;
    const pulse = 1 + Math.sin(this.t * 18) * 0.12;
    const [core, halo, disc] = h.glow.children as THREE.Mesh[];
    (core.material as THREE.MeshBasicMaterial).color.set('#ffffff').lerp(new THREE.Color(color ?? '#ffd080'), 0.35);
    (halo.material as THREE.MeshBasicMaterial).color.set(color ?? '#ffd080');
    core.scale.setScalar(k * pulse); halo.scale.setScalar(k * (1.1 + Math.sin(this.t * 7) * 0.15));
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.35 * k;
    if (disc) {
      disc.visible = ward > 0.01;
      (disc.material as THREE.MeshBasicMaterial).color.set(color ?? '#ffe08a');
      (disc.material as THREE.MeshBasicMaterial).opacity = 0.28 * ward * (0.85 + Math.sin(this.t * 9) * 0.15);
      disc.scale.setScalar(0.4 + 0.6 * ward);
    }
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
