/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { Orchestra } from '../systems/music/Orchestra';
import { plan } from '../world/sites';
import { coastX, SEA } from '../world/terrain';
import { Enemy } from '../entities/Enemy';
import { ENEMIES } from '../data/gameplay';
import { isLeaves, isSolid } from '../world/blocks';
import { inRoof } from '../world/roofVolumes';

// The Everrealm trailer, made in the engine (previews/trailer.mjs drives it; ?trailer in the address
// loads it, never for players). In the manner of World of Warcraft's E3 2003 trailer: the world itself,
// one sweeping shot after another, riding and fighting in it, title cards between, cut to the game's
// own orchestra (systems/music), and the name at the end.
// Each frame is stepped by hand at thirty a second, drawn with its card, and encoded in the browser
// (WebCodecs); the score is rendered offline and encoded beside it; both go into one WebM.

type G = any;
const W = 1280, H = 720, FPS = 30;
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ease = (t: number) => t * t * (3 - 2 * t);

interface Shot {
  /** Where: a waymark's id, or a point. */
  at: string | [number, number];
  hour: number;
  dur: number;
  /** The camera at t (0..1), from the focal point f (on the ground there). */
  cam: (t: number, f: THREE.Vector3, g: G) => { pos: THREE.Vector3; look: THREE.Vector3 };
  card?: { text: string; sub?: string };
  /** Before the shot (after the world's loaded), and each frame of it. */
  setup?: (g: G, f: THREE.Vector3) => void;
  each?: (g: G, frame: number, f: THREE.Vector3) => void;
  done?: (g: G) => void;
}

const dolly = (a: [number, number, number], b: [number, number, number], la: [number, number, number], lb: [number, number, number]) =>
  (t: number, f: THREE.Vector3) => { const k = ease(t); return { pos: V3(f.x + a[0] + (b[0] - a[0]) * k, f.y + a[1] + (b[1] - a[1]) * k, f.z + a[2] + (b[2] - a[2]) * k), look: V3(f.x + la[0] + (lb[0] - la[0]) * k, f.y + la[1] + (lb[1] - la[1]) * k, f.z + la[2] + (lb[2] - la[2]) * k) }; };
const orbit = (r: number, h: number, a0: number, a1: number, lookY = 2, rise = 0) =>
  (t: number, f: THREE.Vector3) => { const a = a0 + (a1 - a0) * t; return { pos: V3(f.x + Math.sin(a) * r, f.y + h + rise * t, f.z + Math.cos(a) * r), look: V3(f.x, f.y + lookY, f.z) }; };
/** Following the player: from the side and a little behind, as they go. */
const follow = (side: number, up: number, back: number) => (_t: number, _f: THREE.Vector3, g: G) => {
  const p = g.player.position, yaw = g.player.yaw;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  return { pos: V3(p.x - fx * back + fz * side, p.y + up, p.z - fz * back - fx * side), look: V3(p.x + fx * 3, p.y + 1.4, p.z + fz * 3) };
};

const GULL = { x: coastX(600), z: 603 };

export const SHOTS: Shot[] = [
  { at: 'wm-hollin', hour: 6.4, dur: 7, cam: dolly([-30, 3, 22], [-16, 24, 36], [0, 4, 0], [4, 1, -8]), card: { text: 'THE CHARTER COUNTIES', sub: 'An online world of roads, rivers and harbours' } },
  { at: 'wm-aldermere', hour: 9.5, dur: 7, cam: orbit(48, 30, 0.5, 1.4, 6), card: { text: 'EXPLORE A LIVING WORLD' } },
  {
    at: 'wm-waystation', hour: 11, dur: 7, cam: follow(6, 2.6, 4), card: { text: 'RIDE FROM THE TURNPIKE TO THE SEA' },
    setup: (g) => { g.give('halter_bay', 1); g.lastCombat = -999; g.toggleMount('halter_bay'); g.rig.yaw = Math.PI / 2; g.input.down.add('KeyW'); g.input.down.add('ShiftLeft'); },
    done: (g) => { g.input.down.delete('KeyW'); g.input.down.delete('ShiftLeft'); g.dismount(true); },
  },
  { at: [GULL.x + 10, GULL.z], hour: 15, dur: 7, cam: (t) => { const k = ease(t); return { pos: V3(GULL.x + 44 - 24 * k, SEA + 14 - 8 * k, GULL.z + 26 - 10 * k), look: V3(GULL.x - 12, SEA + 4, GULL.z - 2) }; } },
  // The Mirador above Callis at golden hour: up from the city to the houses on the lip
  { at: [8600, 796], hour: 16.9, dur: 6, cam: dolly([14, -12, 74], [8, 5, 23], [2, 2, 14], [-40, -1, 18]), card: { text: 'A HOUSE ABOVE THE CITY', sub: 'Buy one outright, or build your own' } },
  {
    at: [714, 578], hour: 13, dur: 8, cam: orbit(8, 3.6, 0.4, 1.6, 1.2), card: { text: 'FIVE CALLINGS. FIFTEEN WAYS TO FIGHT.' },
    setup: (g, f) => {
      g.dev.god = true; g.save.xp.melee = 3_000_000;
      for (const id of ['bulwark', 'bash', 'oath', 'holdfast', 'shieldthrow']) g.setFlag('skun:' + id, 1);
      const wolves = [0, 1, 2].map((k) => {
        const e = new Enemy({ ...ENEMIES.wolf, aggro: 30, leash: 60 }, Math.floor(f.x + 3 + k * 1.5), Math.floor(f.z + 2 - k * 2), g.world.voxels);
        g.enemies.push(e); g.scene.add(e.model.root, e.telegraph);
        return e;
      });
      g.target = wolves[0];
      g.useAbility(0);
    },
    each: (g, n) => { const at = [40, 95, 150, 185]; const keys = [4, 7, 3, 5]; const i = at.indexOf(n); if (i >= 0) g.useAbility(keys[i]); },
  },
  { at: 'wm-vista-scarth', hour: 10.5, dur: 7, cam: dolly([0, 6, -8], [-26, 30, -46], [30, -4, 40], [60, -14, 70]) },
  { at: 'wm-harrowgate', hour: 17.6, dur: 6, cam: orbit(46, 22, 2.2, 3.0, 8) },
  { at: 'wm-temple', hour: 21.5, dur: 6, cam: orbit(24, 9, 0.3, 1.2, 10), card: { text: 'UNCOVER WHAT THE OLD KINGS BURIED' } },
  { at: [234, 196], hour: 20.6, dur: 7, cam: dolly([-7, 4.5, -8], [0, 4, 3], [3, 1.5, 14], [0, 1.2, 22]), card: { text: 'THE LANTERN WAKE IS ON', sub: 'Festivals all through the year' } },
  {
    at: 'wm-hollin', hour: 12, dur: 5, cam: (t, _f, g) => { const a = g.world.structures.interactables.find((i: G) => i.kind === 'anvil'); const k = ease(t); return { pos: V3(a.x + 3.2 - k, a.y + 2, a.z + 2.6 - k * 0.6), look: V3(a.x, a.y + 0.6, a.z) }; },
    card: { text: 'CRAFT. BUILD. BELONG.' },
    setup: (g) => {
      const a = g.world.structures.interactables.find((i: G) => i.kind === 'anvil');
      g.player.teleport(a.x + 1.4, a.y, a.z + 0.4);
      g.save.xp.smithing = 80000; g.give('iron_bar', 40);
      g.openCrafting('anvil'); g.startCraft('iron_sword', 20);
    },
    done: (g) => { g.cancelActions(); g.hud.closeAll(); },
  },
  { at: 'wm-vista-turnpike', hour: 18.7, dur: 10, cam: dolly([0, 4, 0], [-30, 44, -44], [60, 2, 60], [90, -8, 90]), card: { text: 'EVERREALM', sub: 'logo' } },
];
/** The end card after the last shot, black, in seconds. */
const END = 4;
export const DURATION = SHOTS.reduce((s, x) => s + x.dur, 0) + END;
const starts = SHOTS.reduce<number[]>((a, s, i) => (a.push(i ? a[i - 1] + SHOTS[i - 1].dur : 0), a), []);

// ---------------------------------------------------------------- The score
/** A cue for the trailer on the game's own orchestra, its hits on the cuts. D minor, a lift to D major at the end. */
export async function renderScore(): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * 48000), 48000);
  const o = new Orchestra(ctx, ctx.destination);
  const b = o.input;
  const Dm = [50, 57, 62, 65], Bb = [46, 58, 62, 65], F = [53, 57, 60, 65], C = [48, 55, 60, 64], Gm = [43, 55, 58, 62], A = [45, 57, 61, 64], D = [50, 57, 62, 66];
  const cut = (i: number) => starts[i] ?? DURATION - END;
  // Dawn and the city: choir and low strings, a flute over them, harp falling like water
  o.choir(0.2, [50, 57, 62], 7.5, 0.5, b, 'oo', 3);
  o.strings(0.5, [38, 50], 13.5, 0.55, b, { attack: 3 });
  o.choir(cut(1), [46, 58, 62], 7.5, 0.55, b, 'oo', 2);
  [74, 77, 81, 79, 77, 76, 74, 72, 74].forEach((m, k) => o.flute(2 + k * 0.9, m, 0.85, 0.45, b));
  for (let t = cut(1); t < cut(2); t += 0.5) o.harp(t, [62, 65, 69, 74, 69, 65][Math.round((t - cut(1)) * 2) % 6], 0.35, b);
  // The ride and the harbour: strings driving in eighths, the horns' theme over them
  o.taiko(cut(2), 1, b); o.timpani(cut(2), 38, 0.8, b);
  const ride = [Dm, Bb, F, C];
  for (let k = 0; k < 4; k++) {
    const t0 = cut(2) + k * 3.5;
    o.strings(t0, ride[k], 3.6, 0.5, b, { attack: 0.4, bright: 0.6 });
    o.bass(t0, ride[k][0] - 12, 3.4, 0.6, b, 0.2);
    for (let e = 0; e < 7; e++) o.spiccato(t0 + e * 0.5, ride[k][0] + (e % 2 ? 7 : 0), 0.45, b);
  }
  [[62, 1.5], [69, 1], [67, 0.5], [65, 1], [64, 1], [62, 2], [60, 1], [62, 2.5], [65, 1.5], [69, 1], [72, 1], [70, 1.5], [69, 3]].reduce((t, [m, d]) => { o.horn(t, m, d * 0.95, 0.55, b); return t + d; }, cut(2) + 0.5);
  // The wood: hushed, celesta and a held chord
  o.strings(cut(4), [45, 52, 57, 60], 6.5, 0.35, b, { attack: 2 });
  [81, 77, 74, 76, 72, 74].forEach((m, k) => o.celesta(cut(4) + 0.6 + k * 0.9, m, 0.35, b));
  // The fight: taiko on the beat, timpani on the bar, the strings sawing, the horns stabbing
  o.swell(cut(5) - 1.2, 1.2, 0.6, b);
  for (let t = cut(5); t < cut(6) - 0.2; t += 0.625) { o.taiko(t, (Math.round((t - cut(5)) / 0.625) % 4 === 0 ? 1 : 0.6), b); o.spiccato(t, 50, 0.5, b); o.spiccato(t + 0.3125, 57, 0.4, b); }
  for (let k = 0; k < 4; k++) { const t0 = cut(5) + k * 2; o.timpani(t0, 38, 0.7, b); o.strings(t0, [Dm, Gm, Bb, A][k], 2.1, 0.6, b, { attack: 0.15, bright: 0.85 }); o.horn(t0 + 0.05, [62, 67, 65, 64][k], 0.6, 0.6, b); }
  // The highlands, the Works, the Kirk: broad, then hushed for the night
  o.timpani(cut(6), 38, 0.9, b); o.taiko(cut(6), 1, b);
  const broad = [F, C, Dm, Bb];
  for (let k = 0; k < 4; k++) { const t0 = cut(6) + k * 3.25; o.strings(t0, broad[k], 3.4, 0.55, b, { attack: 0.8 }); o.choir(t0, broad[k].slice(1), 3.4, 0.4, b, 'ah', 0.8); o.bass(t0, broad[k][0] - 12, 3.2, 0.55, b); }
  [[72, 2], [74, 1], [77, 1], [76, 2], [72, 2], [74, 3], [69, 2]].reduce((t, [m, d]) => { o.horn(t, m, d * 0.95, 0.6, b); return t + d; }, cut(6) + 0.4);
  o.choir(cut(8), [47, 54, 59, 62], 6.5, 0.45, b, 'oo', 1.5);
  [83, 79, 78, 74, 76, 78].forEach((m, k) => o.celesta(cut(8) + 0.4 + k * 0.8, m, 0.3, b));
  // The Wake and the anvil: a dance in D dorian, flute and harp, light on its feet
  for (let t = cut(9); t < cut(11) - 0.3; t += 0.375) o.harp(t, [62, 69, 71, 74, 71, 69][Math.round((t - cut(9)) / 0.375) % 6], 0.32, b);
  [[74, 0.75], [76, 0.375], [77, 0.375], [79, 0.75], [77, 0.75], [76, 0.75], [74, 1.5], [71, 0.75], [72, 0.75], [74, 1.5], [69, 2]].reduce((t, [m, d]) => { o.flute(t, m, d * 0.9, 0.5, b); return t + d; }, cut(9) + 0.3);
  o.strings(cut(9), [50, 57, 59], 12, 0.3, b, { attack: 1.5 });
  for (let k = 0; k < 6; k++) o.taiko(cut(10) + k * 0.75, 0.35, b); // the hammer
  // The end: everything, building to the name, and a D major chord to stand on
  o.swell(cut(11) - 1.5, 1.6, 0.8, b);
  for (let r = 0; r < 12; r++) o.timpani(cut(11) - 1.2 + r * 0.1, 38, 0.3 + r * 0.04, b);
  const fin = [Dm, Bb, F, A];
  for (let k = 0; k < 4; k++) { const t0 = cut(11) + k * 1.6; o.strings(t0, fin[k], 1.8, 0.65, b, { attack: 0.3, bright: 0.8 }); o.choir(t0, fin[k].slice(1), 1.8, 0.55, b, 'ah', 0.3); o.taiko(t0, 0.9, b); o.horn(t0, fin[k][2], 1.5, 0.65, b); }
  const last = cut(11) + 6.4;
  o.taiko(last, 1, b); o.timpani(last, 38, 1, b);
  o.strings(last, [38, ...D], 7, 0.75, b, { attack: 0.2, release: 4, bright: 0.7 });
  o.choir(last, D.slice(1), 7, 0.6, b, 'ah', 0.3);
  o.horn(last, 62, 5, 0.6, b); o.horn(last, 66, 5, 0.5, b);
  o.bass(last, 38, 6, 0.7, b);
  return ctx.startRendering();
}

// ---------------------------------------------------------------- WebM (Matroska), written by hand
const enc = new TextEncoder();
function idBytes(id: number): number[] { const out: number[] = []; let v = id; while (v > 0) { out.unshift(v & 0xff); v = Math.floor(v / 256); } return out; }
function sizeBytes(n: number): number[] { const out = [0x01]; for (let i = 6; i >= 0; i--) out.push(Math.floor(n / 2 ** (8 * i)) & 0xff); return out; }
function uintBytes(n: number): number[] { const out: number[] = []; let v = n; do { out.unshift(v & 0xff); v = Math.floor(v / 256); } while (v > 0); return out; }
function el(id: number, body: Uint8Array | number[]): Uint8Array {
  const b = body instanceof Uint8Array ? body : Uint8Array.from(body);
  const head = [...idBytes(id), ...sizeBytes(b.length)];
  const out = new Uint8Array(head.length + b.length); out.set(head); out.set(b, head.length); return out;
}
const cat = (parts: Uint8Array[]) => { const n = parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const u = (id: number, n: number) => el(id, uintBytes(n));
const s = (id: number, t: string) => el(id, enc.encode(t));
const f64 = (id: number, v: number) => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, v); return el(id, new Uint8Array(b.buffer)); };
function block(track: number, rel: number, key: boolean, data: Uint8Array): Uint8Array {
  const head = new Uint8Array(4); head[0] = 0x80 | track; new DataView(head.buffer).setInt16(1, rel); head[3] = key ? 0x80 : 0;
  return el(0xa3, cat([head, data]));
}
interface Packet { track: number; ms: number; key: boolean; data: Uint8Array }
function webm(video: Packet[], audio: Packet[], vcodec: string, opusHead: Uint8Array, durMs: number): Uint8Array {
  const header = el(0x1a45dfa3, cat([u(0x4286, 1), u(0x42f7, 1), u(0x42f2, 4), u(0x42f3, 8), s(0x4282, 'webm'), u(0x4287, 4), u(0x4285, 2)]));
  const info = el(0x1549a966, cat([u(0x2ad7b1, 1_000_000), s(0x4d80, 'Everrealm'), s(0x5741, 'Everrealm trailer'), f64(0x4489, durMs)]));
  const vtrack = el(0xae, cat([u(0xd7, 1), u(0x73c5, 1), u(0x83, 1), s(0x86, vcodec), el(0xe0, cat([u(0xb0, W), u(0xba, H)]))]));
  const atrack = el(0xae, cat([u(0xd7, 2), u(0x73c5, 2), u(0x83, 2), s(0x86, 'A_OPUS'), el(0x63a2, opusHead), u(0x56aa, 6_500_000), u(0x56bb, 80_000_000), el(0xe1, cat([f64(0xb5, 48000), u(0x9f, 2)]))]));
  const tracks = el(0x1654ae6b, cat([vtrack, atrack]));
  // A cluster from each video keyframe, the audio of its span inside it
  const all = [...video, ...audio].sort((a, b) => a.ms - b.ms || a.track - b.track);
  const clusters: Uint8Array[] = [];
  let cur: Packet[] = [], t0 = 0;
  const flush = () => { if (!cur.length) return; clusters.push(el(0x1f43b675, cat([u(0xe7, t0), ...cur.map((p) => block(p.track, p.ms - t0, p.key, p.data))]))); cur = []; };
  for (const p of all) {
    if ((p.track === 1 && p.key) || (cur.length && p.ms - t0 > 30000)) { flush(); t0 = p.ms; }
    if (!cur.length) t0 = p.ms;
    cur.push(p);
  }
  flush();
  // The segment's size is left unknown (it runs to the end of the file), as live writers do
  const segHead = Uint8Array.from([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  return cat([header, segHead, info, tracks, ...clusters]);
}

// ---------------------------------------------------------------- Making it
/** Card text over the frame, fading in and out; and the fades between shots. */
function compose(c2: CanvasRenderingContext2D, gl: HTMLCanvasElement, shot: Shot, t: number, fadeIn: number, fadeOut: number): void {
  c2.globalAlpha = 1;
  c2.drawImage(gl, 0, 0, W, H);
  const dark = Math.max(0, 1 - t / fadeIn, 1 - (shot.dur - t) / fadeOut);
  if (dark > 0) { c2.fillStyle = `rgba(0,0,0,${Math.min(1, dark)})`; c2.fillRect(0, 0, W, H); }
  const card = shot.card;
  if (!card) return;
  const logo = card.sub === 'logo';
  const a0 = logo ? 3 : 0.9, a1 = logo ? Infinity : Math.min(shot.dur - 0.6, 5.4);
  const a = Math.max(0, Math.min(1, (t - a0) / 0.8, (a1 - t) / 0.8));
  if (a <= 0) return;
  c2.globalAlpha = a;
  c2.textAlign = 'center'; c2.textBaseline = 'middle';
  if (logo) {
    c2.fillStyle = 'rgba(0,0,0,0.35)'; c2.fillRect(0, H * 0.32, W, H * 0.36);
    c2.font = '700 132px "Pixelify Sans", "Alegreya", serif';
    const wE = c2.measureText('EVER').width, wR = c2.measureText('REALM').width, x0 = W / 2 - (wE + wR) / 2;
    c2.textAlign = 'left';
    c2.fillStyle = '#1a1208'; c2.fillText('EVER', x0 + 6, H * 0.46 + 7); c2.fillText('REALM', x0 + wE + 6, H * 0.46 + 7);
    c2.fillStyle = '#f1e6cc'; c2.fillText('EVER', x0, H * 0.46);
    c2.fillStyle = '#7fbf4d'; c2.fillText('REALM', x0 + wE, H * 0.46);
    c2.textAlign = 'center';
    c2.font = '600 26px "Alegreya", serif'; c2.fillStyle = '#f0c860';
    c2.fillText('EARLY ACCESS  ·  EVERREALM.QUEST', W / 2, H * 0.6);
  } else {
    c2.font = '700 46px "Alegreya", serif';
    c2.shadowColor = 'rgba(0,0,0,0.85)'; c2.shadowBlur = 18;
    c2.fillStyle = '#f4ead0'; c2.fillText(card.text, W / 2, H * 0.8);
    if (card.sub) { c2.font = 'italic 500 24px "Alegreya", serif'; c2.fillStyle = '#e8d8b0'; c2.fillText(card.sub, W / 2, H * 0.8 + 46); }
    c2.shadowBlur = 0;
  }
  c2.globalAlpha = 1;
}

/**
 * Run the frames of the game by hand while the world around a point loads: its blocks, and the
 * chunks meshed out far enough that no stand-in box shows over the real town (GameWorld's impostors
 * draw beyond the meshed radius).
 */
async function settle(g: G, f: THREE.Vector3, secs = 120, reach = 90): Promise<void> {
  const until = performance.now() + secs * 1000;
  const ring = [[0, 0], [60, 0], [-60, 0], [0, 60], [0, -60], [40, 40], [-40, -40]];
  let ok = 0;
  while (performance.now() < until) {
    g.frame(0.05);
    await new Promise((r) => setTimeout(r, 0));
    if (ring.every(([dx, dz]) => g.world.voxels.isLoaded(f.x + dx, f.z + dz)) && g.world.chunks.coveredRadius >= reach) { if (++ok > 60) return; }
  }
}

/** quick: a few frames a shot, to try the whole pipeline in a minute or two. */
export async function makeTrailer(g: G, E: G, progress: (s: string) => void, quick = false): Promise<Uint8Array> {
  (window as G).__erHold = true;
  g.hud.closeAll();
  g.rig.update = () => {};
  g.save.settings.renderScale = 1;
  g.save.look.costume = 'towerknight'; g.dress();
  const gl: HTMLCanvasElement = g.renderer.domElement;
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const c2 = comp.getContext('2d')!;
  // The video encoder: VP9 if the browser has it, VP8 if not
  const video: Packet[] = [];
  let vcodec = 'V_VP9', codec = 'vp09.00.10.08';
  if (!(await VideoEncoder.isConfigSupported({ codec, width: W, height: H })).supported) { codec = 'vp8'; vcodec = 'V_VP8'; }
  const ve = new VideoEncoder({ output: (ch) => { const d = new Uint8Array(ch.byteLength); ch.copyTo(d); video.push({ track: 1, ms: Math.round(ch.timestamp / 1000), key: ch.type === 'key', data: d }); }, error: (e) => progress('video error ' + e.message) });
  ve.configure({ codec, width: W, height: H, bitrate: 8_000_000, framerate: FPS });
  // The score first (it's quick), then encoded
  progress('scoring');
  const music = await renderScore();
  const audio: Packet[] = [];
  let opusHead: Uint8Array | null = null;
  const ae = new AudioEncoder({ output: (ch, meta) => { if (meta?.decoderConfig?.description && !opusHead) opusHead = new Uint8Array(meta.decoderConfig.description as ArrayBuffer); const d = new Uint8Array(ch.byteLength); ch.copyTo(d); audio.push({ track: 2, ms: Math.round(ch.timestamp / 1000), key: true, data: d }); }, error: (e) => progress('audio error ' + e.message) });
  ae.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 160_000 });
  const L = music.getChannelData(0), R = music.getChannelData(1);
  for (let i = 0; i + 960 <= L.length; i += 960) {
    const data = new Float32Array(1920); data.set(L.subarray(i, i + 960), 0); data.set(R.subarray(i, i + 960), 960);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: 960, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data });
    ae.encode(ad); ad.close();
  }
  await ae.flush();
  // The shots
  let n = 0;
  for (let si = 0; si < SHOTS.length; si++) {
    const shot = SHOTS[si];
    const wm = typeof shot.at === 'string' ? plan().waymarks.find((w: G) => w.id === shot.at) : null;
    const fx = wm ? wm.x : (shot.at as [number, number])[0], fz = wm ? wm.z : (shot.at as [number, number])[1];
    progress(`shot ${si + 1}/${SHOTS.length}: loading`);
    E.hour(shot.hour);
    g.player.teleport(fx + 0.5, (wm?.y ?? 80) + 1, fz + 0.5);
    await settle(g, V3(fx, 0, fz), quick ? 8 : 120);
    const fy = g.world.voxels.groundBelow(fx + 0.5, 140, fz + 0.5);
    const f = V3(fx + 0.5, fy, fz + 0.5);
    if (!wm) g.player.teleport(f.x, fy + 0.2, f.z);
    await settle(g, f, quick ? 8 : 30);
    shot.setup?.(g, f);
    E.hour(shot.hour);
    const frames = quick ? 8 : Math.round(shot.dur * FPS);
    let losClear = 1;
    for (let k = 0; k < frames; k++) {
      const t = k / FPS;
      const cam = shot.cam(k / frames, f, g);
      // Never inside a wall or the ground: up until there's air round the lens
      // (leaves too: a lens in a tree's crown sees nothing but leaf)
      const thick = (id: number) => isSolid(id) || isLeaves(id);
      for (let up = 0; up < 40 && [[0, 0], [0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]].some(([dx, dz]) => thick(g.world.voxels.get(Math.floor(cam.pos.x + dx), Math.floor(cam.pos.y), Math.floor(cam.pos.z + dz)))); up++) cam.pos.y += 1;
      {
        const d = cam.pos.clone().sub(cam.look), len = d.length();
        let clear = 1;
        for (let s2 = 0.6; s2 < len; s2 += 0.4) {
          const q = cam.look.clone().addScaledVector(d, s2 / len);
          if (isSolid(g.world.voxels.get(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z))) || inRoof(q.x, q.y, q.z, 0.2)) { clear = Math.max(0.15, (s2 - 0.8) / len); break; }
        }
        // Pull in at once, ease back out (no jump the frame a post passes)
        losClear = clear < losClear ? clear : losClear + (clear - losClear) * 0.08;
        if (k === 0) losClear = clear;
        cam.pos.copy(cam.look).addScaledVector(d, losClear);
      }
      g.camera.position.copy(cam.pos); g.camera.lookAt(cam.look);
      shot.each?.(g, k, f);
      // The hour held where the shot wants it: a frame takes far longer to render than it lasts, and
      // the sky follows the realm's clock, so a slow shot would otherwise run on into the night
      E.hour(shot.hour + t * 0.01);
      g.frame(1 / FPS);
      compose(c2, gl, shot, t, si === 0 ? 1.2 : 0.35, si === SHOTS.length - 1 ? 0.01 : 0.35);
      const vf = new VideoFrame(comp, { timestamp: Math.round((n / FPS) * 1e6), duration: Math.round(1e6 / FPS) });
      ve.encode(vf, { keyFrame: n % 60 === 0 });
      vf.close();
      n++;
      while (ve.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 5));
      if (k % 30 === 0) progress(`shot ${si + 1}/${SHOTS.length}: ${Math.round((k / frames) * 100)}%`);
    }
    shot.done?.(g);
  }
  // The end card: black, the name and the address
  const blank = document.createElement('canvas'); blank.width = W; blank.height = H; blank.getContext('2d')!.fillRect(0, 0, W, H);
  for (let k = 0; k < (quick ? 8 : END * FPS); k++) {
    c2.globalAlpha = 1; c2.fillStyle = '#000'; c2.fillRect(0, 0, W, H);
    c2.drawImage(comp, 0, 0); // (the canvas is cleared to black above; the logo goes on it at full strength)
    compose(c2, blank, { ...SHOTS[SHOTS.length - 1], dur: 99, card: { text: 'EVERREALM', sub: 'logo' } }, 10, 0.001, 0.001);
    // The last second fades to black
    const out = Math.max(0, (k / FPS - (END - 1)) / 1);
    if (out > 0) { c2.fillStyle = `rgba(0,0,0,${out})`; c2.fillRect(0, 0, W, H); }
    const vf = new VideoFrame(comp, { timestamp: Math.round((n / FPS) * 1e6), duration: Math.round(1e6 / FPS) });
    ve.encode(vf, { keyFrame: n % 60 === 0 }); vf.close(); n++;
    while (ve.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 5));
  }
  await ve.flush();
  (window as G).__erHold = false;
  progress('muxing');
  const head = opusHead ?? Uint8Array.from([...enc.encode('OpusHead'), 1, 2, 0x38, 0x01, 0x80, 0xbb, 0, 0, 0, 0, 0]);
  return webm(video, audio, vcodec, head, (n / FPS) * 1000);
}
