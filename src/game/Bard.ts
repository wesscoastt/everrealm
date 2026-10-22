import * as THREE from 'three';
import { partEvents, tuneLength, TUNE_BY_ID, VOICES, type NoteEvent, type PartId, type Voice } from '../data/tunes';
import type { AudioSystem } from '../systems/Audio';
import { realmNow } from '../world/clock';

// Performers: you, other players, and the Waits in Ansbury. A performance is a tune, a part of it
// and an instrument, starting at a moment on the realm clock. Everyone's game schedules the same
// notes from the same tune at the same moment, so a band's parts land together on every screen and
// nothing but the start has to cross the network. Free play (the number keys) sends single notes.

export interface Performance { tune: string; part: PartId; voice: Voice; /** Realm time it starts, ms. */ start: number; reps: number }

interface Live extends Performance {
  events: NoteEvent[];
  length: number;
  idx: number;
  rep: number;
  ch: { gain: GainNode; pan: StereoPannerNode } | null;
  droned: boolean;
}

/** Beyond this many blocks a performer can't be heard. */
export const HEARING = 55;

export class Bard {
  private live = new Map<string, Live>();
  private freeCh = new Map<string, { gain: GainNode; pan: StereoPannerNode }>();
  private due: { at: number; who: string; m: number; voice: Voice }[] = [];

  constructor(
    private readonly audio: AudioSystem,
    /** Where a performer is now (null when they've gone). */
    private readonly where: (who: string) => THREE.Vector3 | null,
    /** Where the listener stands, and the camera's right-hand direction (for the pan). */
    private readonly ear: () => { pos: THREE.Vector3; right: THREE.Vector3 },
    /** A note sounded: the performer's hands move, and a note rises over them. */
    private readonly onNote: (who: string, m: number, voice: Voice) => void,
    /** A performance ran to its end (not stopped). */
    private readonly onEnd: (who: string, p: Performance) => void,
  ) {}

  /** Start a performance (replacing any the performer had going). False if the tune can't be played that way. */
  start(who: string, p: Performance): boolean {
    const tune = TUNE_BY_ID[p.tune];
    if (!tune || !VOICES[p.voice] || !VOICES[p.voice].parts.includes(p.part) || !tune.parts[p.part]) return false;
    this.stop(who);
    this.live.set(who, { ...p, reps: Math.max(1, Math.min(4, p.reps)), events: partEvents(tune, p.part, p.voice), length: tuneLength(tune), idx: 0, rep: 0, ch: null, droned: false });
    return true;
  }

  stop(who: string): void {
    const l = this.live.get(who);
    if (!l) return;
    this.live.delete(who);
    this.release(l.ch);
  }

  playing(who: string): Performance | null {
    const l = this.live.get(who);
    return l ? { tune: l.tune, part: l.part, voice: l.voice, start: l.start, reps: l.reps } : null;
  }

  /** Seconds left in a performance (0 if none). */
  remaining(who: string): number {
    const l = this.live.get(who);
    return l ? Math.max(0, (l.start + l.length * l.reps * 1000 - realmNow()) / 1000) : 0;
  }

  /** One note now, from free play. */
  note(who: string, voice: Voice, m: number): void {
    const ctx = this.audio.ctx, I = this.audio.instruments;
    this.onNote(who, m, voice);
    if (!ctx || !I) return;
    let ch = this.freeCh.get(who);
    if (!ch) { ch = I.channel(); this.freeCh.set(who, ch); }
    const pos = this.where(who);
    if (!pos) return;
    const mix = this.mix(pos);
    ch.gain.gain.value = mix.gain;
    ch.pan.pan.value = mix.pan;
    if (mix.gain > 0.002) I.note(voice, ctx.currentTime + 0.01, m, voice === 'drum' ? 0.3 : 0.5, 0.9, ch.gain);
  }

  /** Who is performing now. */
  performers(): string[] { return [...this.live.keys()]; }

  /** Call every frame: schedules the notes just ahead, moves each performer's sound with them. */
  update(): void {
    const ctx = this.audio.ctx, I = this.audio.instruments;
    const now = realmNow();
    let loud = 0;
    for (const [who, l] of this.live) {
      const end = l.start + l.length * l.reps * 1000;
      if (now > end + 400) {
        this.live.delete(who);
        this.release(l.ch);
        this.onEnd(who, l);
        continue;
      }
      const pos = this.where(who);
      if (!pos) { this.live.delete(who); this.release(l.ch); continue; }
      const mix = this.mix(pos);
      if (now >= l.start) loud = Math.max(loud, mix.gain);
      if (ctx && I && !l.ch) l.ch = I.channel();
      if (ctx && l.ch) {
        l.ch.gain.gain.setTargetAtTime(mix.gain, ctx.currentTime, 0.08);
        l.ch.pan.pan.setTargetAtTime(mix.pan, ctx.currentTime, 0.08);
      }
      // The pipes' drone, held under the whole performance (from now, if we came in late)
      if (ctx && I && l.ch && l.voice === 'pipes' && l.part === 'lead' && !l.droned) {
        const from = Math.max(now, l.start), tune = TUNE_BY_ID[l.tune];
        I.drone(ctx.currentTime + (from - now) / 1000, tune.root, (end - from) / 1000, 0.9, l.ch.gain);
        l.droned = true;
      }
      // Notes due in the next quarter second; any already past are skipped (we came in late)
      const horizon = now + 250;
      for (;;) {
        const ev = l.events[l.idx];
        if (!ev) {
          if (l.rep + 1 < l.reps) { l.rep++; l.idx = 0; continue; }
          break;
        }
        const at = l.start + (l.rep * l.length + ev.t) * 1000;
        if (at > horizon) break;
        if (at >= now - 60) {
          if (ctx && I && l.ch && mix.gain > 0.002) I.note(l.voice, ctx.currentTime + Math.max(0, (at - now) / 1000), ev.m, ev.dur * 0.95, 0.9, l.ch.gain);
          this.due.push({ at, who, m: ev.m, voice: l.voice });
        }
        l.idx++;
      }
    }
    // Hands and rising notes, as each note sounds
    if (this.due.length) {
      const keep: typeof this.due = [];
      for (const d of this.due) (d.at <= now ? this.onNote(d.who, d.m, d.voice) : keep.push(d));
      this.due = keep;
    }
    this.audio.duck(loud * 0.85);
  }

  private mix(pos: THREE.Vector3): { gain: number; pan: number } {
    const e = this.ear();
    const dx = pos.x - e.pos.x, dz = pos.z - e.pos.z, d = Math.hypot(dx, dz, pos.y - e.pos.y);
    const gain = d < 5 ? 1 : Math.pow(Math.max(0, 1 - (d - 5) / (HEARING - 5)), 1.6);
    const pan = d < 0.5 ? 0 : Math.max(-0.8, Math.min(0.8, (dx * e.right.x + dz * e.right.z) / Math.hypot(dx, dz)));
    return { gain, pan };
  }

  private release(ch: { gain: GainNode; pan: StereoPannerNode } | null): void {
    const ctx = this.audio.ctx;
    if (!ch || !ctx) return;
    ch.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => { ch.gain.disconnect(); ch.pan.disconnect(); }, 2500);
  }
}
