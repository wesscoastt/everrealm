import * as THREE from 'three';
import { Bard, type Performance } from './Bard';
import { countiesOnly } from '../world/land';
import { degree, FREE_MODE, FREE_ROOT, PART_NAMES, TUNE_BY_ID, TUNES, tuneLength, VOICES, type PartId, type Voice } from '../data/tunes';
import { ITEMS } from '../data/items';
import { realmNow } from '../world/clock';
import type { AudioSystem } from '../systems/Audio';
import type { Particles } from '../systems/Particles';
import type { Humanoid } from '../entities/humanoid';
import type { GroupView, Online, OnlineHooks } from '../net/Online';
import { TAVERN_SPOTS } from '../data/content/taverns';

// Playing music: taking an instrument out, playing a tune from the songbook or note by note on the
// number keys, playing with your group as a band, and being heard by everyone near (Bard.ts does
// the sound). At a performance spot, people stop to listen and leave something in your hat.

/** Where people gather to listen: a bandstand, a square, an inn yard. Tips once every twenty minutes at each. */
export interface Spot { id: string; name: string; x: number; z: number; r: number }

export const SPOTS: Spot[] = [
  // Every tavern: a musician earns their supper
  ...TAVERN_SPOTS.map((t) => ({ id: t.id, name: t.name, x: t.x, z: t.z, r: t.r })),
  { id: 'green', name: 'the bandstand on the Charter Green', x: 659.5, z: 414.5, r: 8 },
  { id: 'moot', name: 'the moot oak at Hollin Ford', x: 147.5, z: 179.5, r: 9 },
  { id: 'waystation', name: 'the Waystation yard', x: 708.5, z: 576.5, r: 9 },
  { id: 'fellers', name: 'the fire at Fellers\' Camp', x: 446.5, z: 520.5, r: 9 },
  { id: 'kelderby', name: 'the well at Kelderby', x: 296.5, z: 1461.5, r: 11 },
  { id: 'gullmouth', name: 'the Gullmouth quay', x: 1744.5, z: 600.5, r: 10 },
  { id: 'arches', name: 'the Ketley Arches', x: 176.5, z: 860.5, r: 12 },
  { id: 'keep', name: 'the keep steps in Ansbury', x: 820.5, z: 314.5, r: 8 },
  { id: 'minster', name: 'the Minster steps', x: 848.5, z: 441.5, r: 9 },
  { id: 'kirk', name: 'the pilgrims\' road at the Glass Kirk', x: 1174.5, z: 1806.5, r: 9 },
  { id: 'harrowgate', name: 'the Works yard at Harrowgate', x: 1010.5, z: 1031.5, r: 9 },
];

export interface StageHost {
  audio: AudioSystem;
  particles: Particles;
  online(): Online;
  myPos(): THREE.Vector3;
  myModel(): Humanoid;
  remote(id: number): { pos: THREE.Vector3; model: Humanoid } | null;
  /** An NPC performer (the Waits), by id. */
  npc(id: string): { pos: THREE.Vector3; model: Humanoid } | null;
  camRight(): THREE.Vector3;
  group(): GroupView | null;
  myId(): number;
  system(text: string): void;
  refresh(): void;
  flag(k: string): unknown;
  setFlag(k: string, v?: unknown): void;
  addMarks(n: number): void;
  /** A tune played through to the end: where (a spot's id), and with how many in the band. */
  played(tune: string, spot: string | null, band: number): void;
}

const NOTE_COLOUR: Record<Voice, string> = {
  whistle: '#e8f4ff', bone: '#f0e4c0', fiddle: '#ffb070', pipes: '#ff8a8a', lute: '#ffd86a', harp: '#ffe8a0', drum: '#d0b090', horn: '#ffd040', gurdy: '#ffa860',
};

/** What the songbook panel shows. */
export interface MusicView {
  out: { item: string; voice: Voice; name: string } | null;
  owned: { item: string; name: string; voice: Voice }[];
  tunes: { id: string; name: string; from: string; desc: string; parts: PartId[]; secs: number }[];
  playing: { tune: string; part: PartId; left: number } | null;
  myPart: PartId;
  band: { id: number; name: string; part: PartId | null; voice: Voice | null; me: boolean }[] | null;
  leader: boolean;
  spot: string | null;
  online: boolean;
}

export class Stage {
  readonly bard: Bard;
  /** The instrument in your hands, if any. */
  out: { item: string; voice: Voice } | null = null;
  /** Your part when the band strikes up. */
  myPart: PartId = 'lead';
  private bandParts = new Map<number, { part: PartId; voice: Voice }>();
  private tmp = new THREE.Vector3();

  constructor(private readonly host: StageHost, private readonly owned: () => string[]) {
    this.bard = new Bard(
      host.audio,
      (who) => this.whereOf(who),
      () => ({ pos: host.myPos(), right: host.camRight() }),
      (who, _m, voice) => this.sounded(who, voice),
      (who, p) => { if (who === 'me') this.finished(p); },
    );
  }

  /** Instruments you're carrying. */
  instruments(): { item: string; name: string; voice: Voice }[] {
    const seen = new Set<string>();
    const out: { item: string; name: string; voice: Voice }[] = [];
    for (const id of this.owned()) {
      const v = ITEMS[id]?.instrument;
      if (v && !seen.has(id)) { seen.add(id); out.push({ item: id, name: ITEMS[id].name, voice: v }); }
    }
    return out;
  }

  /** Tunes in your songbook. */
  known(): string[] { return TUNES.filter((t) => this.host.flag('tune:' + t.id)).map((t) => t.id); }

  take(item: string): void {
    const v = ITEMS[item]?.instrument;
    if (!v) return;
    this.stop();
    this.out = { item, voice: v };
    if (!VOICES[v].parts.includes(this.myPart)) this.myPart = VOICES[v].parts[0];
    this.host.online().bandPart(this.myPart, v);
    this.host.refresh();
  }

  away(): void {
    if (!this.out) return;
    this.stop();
    this.out = null;
    this.host.refresh();
  }

  /** Play a tune from the songbook, on your own, twice through. */
  play(tune: string, part: PartId = this.myPart, reps = 2): boolean {
    if (!this.out) return false;
    if (!this.host.flag('tune:' + tune)) { this.host.system('That tune isn\'t in your songbook.'); return false; }
    return this.begin(tune, part, realmNow() + 500, reps);
  }

  stop(): void {
    if (!this.bard.playing('me')) return;
    this.bard.stop('me');
    this.host.online().performStop();
    this.host.refresh();
  }

  /** Free play: key k (0 to 7) is a step of the scale, Shift an octave up. A drum strikes or taps. */
  key(k: number, shift: boolean): void {
    if (!this.out) return;
    if (this.bard.playing('me')) this.stop();
    const v = this.out.voice;
    const m = v === 'drum' ? (k % 2 === 0 ? 1 : 0) : FREE_ROOT + VOICES[v].octave + degree(FREE_MODE, k + (shift ? 7 : 0));
    this.bard.note('me', v, m);
    this.host.online().note(m, v);
  }

  pickPart(part: PartId): void {
    if (!this.out || !VOICES[this.out.voice].parts.includes(part)) return;
    this.myPart = part;
    this.host.online().bandPart(part, this.out.voice);
    this.host.refresh();
  }

  /** Strike the band up: everyone in your group with an instrument out comes in on the same beat. */
  strikeUp(tune: string, reps = 2): void {
    if (!this.out) { this.host.system('Take an instrument out first.'); return; }
    if (!this.host.flag('tune:' + tune)) { this.host.system('That tune isn\'t in your songbook.'); return; }
    const start = realmNow() + 3500;
    this.host.online().bandGo(tune, start, reps);
    this.begin(tune, this.myPart, start, reps);
    this.host.system(`One, two, three, four: "${TUNE_BY_ID[tune].name}".`);
  }

  hooks(): Partial<OnlineHooks> {
    return {
      perform: (id, p) => { this.bard.start('p:' + id, p); },
      performStop: (id) => this.bard.stop('p:' + id),
      note: (id, m, voice) => this.bard.note('p:' + id, voice, m),
      bandPart: (id, part, voice) => { this.bandParts.set(id, { part, voice }); this.host.refresh(); },
      bandGo: (_from, name, tune, start, reps) => {
        const t = TUNE_BY_ID[tune];
        if (!t) return;
        if (!this.out) { this.host.system(`${name} strikes up "${t.name}". Take an instrument out to join in.`); return; }
        if (this.begin(tune, this.myPart, start, reps)) this.host.system(`${name} strikes up "${t.name}". You come in on the ${PART_NAMES[this.myPart].toLowerCase()}.`);
      },
    };
  }

  update(): void { this.bard.update(); }

  view(): MusicView {
    const g = this.host.group(), me = this.host.myId();
    const p = this.bard.playing('me');
    const v = this.out?.voice;
    return {
      out: this.out ? { ...this.out, name: ITEMS[this.out.item].name } : null,
      owned: this.instruments(),
      tunes: this.known().map((id) => {
        const t = TUNE_BY_ID[id];
        return { id, name: t.name, from: t.from, desc: t.desc, parts: (Object.keys(t.parts) as PartId[]).filter((k) => !v || VOICES[v].parts.includes(k)), secs: Math.round(tuneLength(t)) };
      }),
      playing: p ? { tune: p.tune, part: p.part, left: Math.ceil(this.bard.remaining('me')) } : null,
      myPart: this.myPart,
      band: g && g.members.length > 1 ? g.members.map((m) => {
        const mine = m.id === me;
        const b = mine ? (this.out ? { part: this.myPart, voice: this.out.voice } : null) : this.bandParts.get(m.id) ?? null;
        return { id: m.id, name: m.name, part: b?.part ?? null, voice: b?.voice ?? null, me: mine };
      }) : null,
      leader: !!g && g.leader === me,
      spot: this.spotAt()?.name ?? null,
      online: this.host.online().status === 'online',
    };
  }

  private begin(tune: string, part: PartId, start: number, reps: number): boolean {
    if (!this.out) return false;
    const t = TUNE_BY_ID[tune];
    if (!t || !t.parts[part]) { this.host.system(`"${t?.name ?? tune}" has no ${PART_NAMES[part].toLowerCase()} part.`); return false; }
    const p: Performance = { tune, part, voice: this.out.voice, start, reps };
    if (!this.bard.start('me', p)) { this.host.system(`A ${ITEMS[this.out.item].name.toLowerCase()} can't take the ${PART_NAMES[part].toLowerCase()} part.`); return false; }
    this.host.online().perform(p, tuneLength(t) * reps * 1000);
    this.host.refresh();
    return true;
  }

  private whereOf(who: string): THREE.Vector3 | null {
    if (who === 'me') return this.host.myPos();
    if (who.startsWith('p:')) return this.host.remote(Number(who.slice(2)))?.pos ?? null;
    if (who.startsWith('npc:')) return this.host.npc(who.slice(4))?.pos ?? null;
    return null;
  }

  /** A note sounded: the performer's hands move, and a note rises over them. */
  private sounded(who: string, voice: Voice): void {
    const m = who === 'me' ? this.host.myModel() : who.startsWith('p:') ? this.host.remote(Number(who.slice(2)))?.model : this.host.npc(who.slice(4))?.model;
    m?.pluck();
    const pos = this.whereOf(who);
    if (!pos) return;
    const near = this.host.myPos();
    if (Math.hypot(pos.x - near.x, pos.z - near.z) > 40) return;
    this.host.particles.note(this.tmp.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 2.2, pos.z + (Math.random() - 0.5) * 0.5), NOTE_COLOUR[voice]);
  }

  private spotAt(): Spot | null {
    const p = this.host.myPos();
    return SPOTS.find((s) => Math.hypot(s.x - p.x, s.z - p.z) < s.r) ?? null;
  }

  /** You played a tune through: the quests hear of it, and at a spot people leave a little. */
  private finished(p: Performance): void {
    const spot = this.spotAt();
    // The band: the others in your group nearby who played the same tune from the same beat
    let band = 1;
    for (const who of this.bard.performers()) {
      const o = this.bard.playing(who);
      if (who !== 'me' && o && o.tune === p.tune && Math.abs(o.start - p.start) < 50) band++;
    }
    const g = this.host.group();
    if (g) for (const m of g.members) {
      if (m.id === this.host.myId()) continue;
      const pos = this.host.remote(m.id)?.pos;
      if (pos && Math.hypot(pos.x - this.host.myPos().x, pos.z - this.host.myPos().z) < 14 && this.bandParts.has(m.id)) band = Math.max(band, 2);
    }
    this.host.played(p.tune, spot?.id ?? null, band);
    if (!spot) return;
    const slot = Math.floor(realmNow() / 1_200_000);
    if (this.host.flag('busk:' + spot.id) === slot) return;
    this.host.setFlag('busk:' + spot.id, slot);
    const tip = 4 + band * 3 + (p.reps > 1 ? 2 : 0);
    this.host.addMarks(tip);
    this.host.system(band > 1
      ? `A crowd gathers at ${spot.name} for the band. They leave ${tip} marks in your hat.`
      : `A few people stop at ${spot.name} to listen. They leave ${tip} marks in your hat.`);
  }
}

// Placed on the first continent: none of them in Morrow (world/land.ts)
countiesOnly(SPOTS);
