import * as THREE from 'three';
import { Humanoid, type Appearance, type AnimState } from '../entities/humanoid';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { Sfx } from '../systems/Audio';

// Dave Kitto's fights (data/content/fishermanDave.ts): bouts he has to win on his own, with you watching
// from outside the ring. Kezia Mabe on Gullmouth quay, for practice; then the Reckoner at Gullmouth Light,
// for Becky White. You can't step in (the ring pushes you back), but you can shout: three times the foe
// shows what it's about to do, and if you call the answer you taught him, he takes it; call it wrong, or
// not at all, and he takes the blow instead. He can be put down once. He gets up. He always wins: that's
// the story the owner asked for, and the shouting decides how hard it goes for him.

const BASE: Appearance = { skin: '#d8a882', hair: '#3a2418', hairStyle: 0, eyes: '#3a2a1a', tunic: '#5a4a3a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14' };

export type BoutId = 'kezia' | 'reckoner';

export interface BoutHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  movePlayer(x: number, z: number): void;
  say(pos: THREE.Vector3, h: number, text: string): void;
  system(text: string): void;
  banner(title: string, sub: string): void;
  sfx(name: Sfx, vol?: number): void;
  /** Dave as he's dressed now. */
  daveLook(): Appearance;
  /** Hide his companion body while the bout's Dave stands in for him (and bring it back after). */
  hideCompanion(hidden: boolean): void;
  /** What you taught him (0 to 3): what he does if you don't shout. */
  skill(): number;
  /** The bout is over. */
  done(id: BoutId): void;
}

interface Shout {
  /** The foe's health share it comes at. */
  at: number;
  /** What you see it do. */
  move: string;
  options: { label: string; right: boolean }[];
  good: string;
  bad: string;
}

interface Bout {
  name: string;
  sub: string;
  foe: { name: string; look: Partial<Appearance>; held: string; scale: number; voice: string };
  /** The ring's middle, its radius. */
  at: [number, number];
  r: number;
  /** Who says what before it starts: 'd' Dave, 'f' the foe. */
  intro: ['d' | 'f', string][];
  /** The foe's lines in the fight, and Dave's. */
  foeLines: string[];
  daveLines: string[];
  /** Said when you come too near. */
  keepOut: ['d' | 'f', string];
  /** Dave put down, and getting up. */
  down: ['d' | 'f', string][];
  up: string;
  shouts: Shout[];
  /** How it ends. */
  outro: ['d' | 'f', string][];
  /** The foe goes into the ground at the end (the Reckoner), or stays standing (Kezia yields). */
  fades: boolean;
}

/** Literal coordinates: open grass south of Gullmouth Light (world/sites.ts), and the fair green above the harbour. */
export const RECKONER_RING: [number, number] = [1799.5, 703.5];
export const KEZIA_RING: [number, number] = [1768.5, 641.5];

const BOUTS: Record<BoutId, Bout> = {
  kezia: {
    name: 'Dave Kitto against Kezia Mabe', sub: 'On the fair green above Gullmouth, first to give in',
    foe: { name: 'Kezia', look: { frame: 'f', skin: '#c8906a', hair: '#8a8a84', hairStyle: 5, eyes: '#4a3a2a', tunic: '#7a2a22', trim: '#c8a050', shirt: '#e8dcc0', trousers: '#3a3028', boots: '#2a2018', hat: 'kerchief', hatColor: '#7a2a22', build: 1.35, height: 0.98, age: 0.7 }, held: 'none', scale: 1, voice: 'grunt' },
    at: KEZIA_RING, r: 4.5,
    intro: [
      ['f', 'Twenty-two years I wrestled at the Gullmouth fair. Nobody put me on my back. Your fisherman wants to try. Fine.'],
      ['d', 'I don\'t want to try. I want to learn. There\'s a difference, Kezia.'],
      ['f', 'There\'s no difference once you\'re on the stones. Hands up, Dave. Higher than that.'],
    ],
    foeLines: ['Higher!', 'You\'re standing like a man waiting on a tide that\'s been and gone.', 'Again.', 'That one I felt. Do it again.', 'Feet! Where are your feet?'],
    daveLines: ['Right.', 'Again, then.', 'I\'m all right.', 'That was a good one. For you, I mean.'],
    keepOut: ['f', 'He fights his own fights from now on. That\'s the lesson. Stand back.'],
    down: [['f', 'Down you go. Stay down if you like. Nobody\'ll think less of you.'], ['d', 'Give me a minute. Just a minute.']],
    up: 'I would. I\'d think less of me.',
    shouts: [
      { at: 0.7, move: 'Kezia drops her shoulder and comes in low, for his middle.', options: [{ label: '"Feet back, Dave!"', right: true }, { label: '"Hit her high!"', right: false }, { label: '"Hold your ground!"', right: false }], good: 'Feet back. Let her come.', bad: 'Oof. Should have moved.' },
      { at: 0.4, move: 'She feints left, the way she always feints left, and swings right.', options: [{ label: '"Guard up, watch the other hand!"', right: true }, { label: '"Go left with her!"', right: false }, { label: '"Close in!"', right: false }], good: 'The other hand. I saw it.', bad: 'She does that every time. Every time.' },
      { at: 0.15, move: 'Kezia is blowing hard. She leaves her guard down for a breath.', options: [{ label: '"Now, Dave! In!"', right: true }, { label: '"Wait for her!"', right: false }, { label: '"Back off!"', right: false }], good: 'Now.', bad: 'I waited. Shouldn\'t have waited.' },
    ],
    outro: [
      ['f', 'Enough. ENOUGH. All right. I give. Twenty-two years, and a fish-gutter has me giving.'],
      ['d', 'I didn\'t mean to hurt you.'],
      ['f', 'You didn\'t. You held back the last one, I felt it. Don\'t hold back with the other thing, Dave. Whatever it is. It won\'t.'],
    ],
    fades: false,
  },
  reckoner: {
    name: 'Dave Kitto against the Reckoner', sub: 'Gullmouth Light, in the fog. One pair of hands.',
    foe: { name: 'The Reckoner', look: { frame: 'm', skin: '#d4dce0', eyes: '#9fe8ff', hair: '#e8ecee', hairStyle: 0, tunic: '#16181c', trim: '#2a2e34', shirt: '#16181c', trousers: '#121418', boots: '#0c0e10', cape: '#101216', hat: 'hood', hatColor: '#0e1012', build: 0.75, height: 1.18, age: 1 }, held: 'reckoner_hook', scale: 1.35, voice: 'growl' },
    at: RECKONER_RING, r: 6,
    intro: [
      ['f', 'Kitto. David Kitto. You were owed, the night of the fog. She paid instead. I keep what is paid.'],
      ['d', 'You keep her stood on the water with a lamp, three winters, so I can see her from the quay and not reach her. I\'ve come to take her home.'],
      ['f', 'One pair of hands, then. Yours. No one else\'s.'],
      ['d', 'Mine.'],
    ],
    foeLines: ['Owed.', 'The sea is patient. I am the sea\'s patience.', 'You gut fish, Kitto. I gut years.', 'She stood where you stand. She did not shake.', 'Come closer. I have kept a place for you.'],
    daveLines: ['Not tonight.', 'I mend nets. I can mend this.', 'That\'s for the boat.', 'She\'s coming home.', 'Get back.'],
    keepOut: ['f', 'Not yours. Stand back, or I will count you too.'],
    down: [['f', 'Down. Like a net cut loose. I will take you now, and give her back her rest, and keep you both.'], ['d', 'Becky. Becky, I can\'t.']],
    up: 'No. I said I\'d bring her home. I don\'t say things twice.',
    shouts: [
      { at: 0.75, move: 'The Reckoner draws its hook back low and wide: it means to take his legs.', options: [{ label: '"Jump it, Dave! Feet!"', right: true }, { label: '"Block high!"', right: false }, { label: '"Go for its head!"', right: false }], good: 'Feet. Like on a heaving deck.', bad: 'Agh. My leg. Should have moved.' },
      { at: 0.45, move: 'It leans in close, its free hand open: it wants to take hold of him, not cut him.', options: [{ label: '"Don\'t let it hold you! Guard and turn!"', right: true }, { label: '"Grab it back!"', right: false }, { label: '"Stand still!"', right: false }], good: 'You don\'t get to hold me. You don\'t get to hold her.', bad: 'Cold. It\'s so cold.' },
      { at: 0.15, move: 'The hook comes up over its head for the last stroke, and the shroud falls open on nothing.', options: [{ label: '"Now! Under it, the gaff!"', right: true }, { label: '"Wait for it to tire!"', right: false }, { label: '"Run!"', right: false }], good: 'For Becky.', bad: 'Missed. Not done. Not done.' },
    ],
    outro: [
      ['f', 'One pair of hands. So it is. So it was always written. Take what is yours, Kitto. The sea will want it back one day.'],
      ['d', 'One day. Not this one.'],
    ],
    fades: true,
  },
};

/** One of Dave's fights, from the intro to the last word. */
export class Reckoning {
  private live: {
    id: BoutId; b: Bout; dave: Humanoid; foe: Humanoid; dHp: number; fHp: number; t: number;
    phase: 'intro' | 'fight' | 'shout' | 'down' | 'outro' | 'fade';
    line: number; next: number; shout: number; downed: boolean; ang: number; lunge: 'd' | 'f' | null; lungeT: number; kept: number;
    dPos: THREE.Vector3; fPos: THREE.Vector3; dState: AnimState; fState: AnimState; stateT: number;
  } | null = null;
  private ui: HTMLElement | null = null;
  private shoutUi: HTMLElement | null = null;
  private shoutWait = 0;

  constructor(private host: BoutHost) {}

  get active(): BoutId | null { return this.live?.id ?? null; }

  start(id: BoutId): void {
    if (this.live) return;
    const b = BOUTS[id], H = this.host;
    const dave = new Humanoid(H.daveLook());
    dave.setHeld(id === 'reckoner' ? 'kitto_gaff' : 'none');
    const foe = new Humanoid({ ...BASE, ...b.foe.look } as Appearance);
    foe.setHeld(b.foe.held);
    foe.root.scale.setScalar(b.foe.scale);
    H.scene.add(dave.root, foe.root);
    H.hideCompanion(true);
    const [cx, cz] = b.at;
    this.live = {
      id, b, dave, foe, dHp: 100, fHp: 100, t: 0, phase: 'intro', line: 0, next: 1.2, shout: 0, downed: false, ang: 0, lunge: null, lungeT: 0, kept: 0,
      dPos: new THREE.Vector3(cx - 2, 0, cz), fPos: new THREE.Vector3(cx + 2, 0, cz), dState: 'idle', fState: 'idle', stateT: 0,
    };
    H.banner(b.name, b.sub);
    H.sfx('bell');
    this.makeUi();
  }

  private makeUi(): void {
    const L = this.live!;
    const ui = document.createElement('div');
    ui.className = 'bout-bars';
    ui.innerHTML = `<div class="bout-side"><span>Dave</span><i><b class="bout-d"></b></i></div><div class="bout-side bout-foe"><span>${L.b.foe.name}</span><i><b class="bout-f"></b></i></div>`;
    document.body.appendChild(ui);
    this.ui = ui;
    this.paintBars();
  }
  private paintBars(): void {
    const L = this.live;
    if (!L || !this.ui) return;
    (this.ui.querySelector('.bout-d') as HTMLElement).style.width = `${Math.max(0, L.dHp)}%`;
    (this.ui.querySelector('.bout-f') as HTMLElement).style.width = `${Math.max(0, L.fHp)}%`;
  }

  private speak(who: 'd' | 'f', text: string): void {
    const L = this.live!;
    const p = who === 'd' ? L.dPos : L.fPos;
    this.host.say(p, who === 'd' ? 2.4 : 2.4 * L.b.foe.scale, text);
    this.host.system(`${who === 'd' ? 'Dave' : L.b.foe.name}: "${text}"`);
  }

  private act(who: 'd' | 'f', s: AnimState): void {
    const L = this.live!;
    if (who === 'd') L.dState = s; else L.fState = s;
    L.stateT = 0;
  }

  /** A blow lands: on Dave or on the foe. */
  private strike(on: 'd' | 'f', n: number): void {
    const L = this.live!;
    if (on === 'f') { L.fHp -= n; this.act('d', 'attack'); this.act('f', 'hit'); this.host.sfx(n > 14 ? 'hitHeavy' : 'hit'); }
    else { L.dHp -= n; this.act('f', L.id === 'reckoner' ? 'cleave' : 'attack'); this.act('d', 'hit'); this.host.sfx(n > 14 ? 'hitHeavy' : 'hurt', 0.8); }
    L.lunge = on === 'f' ? 'd' : 'f'; L.lungeT = 0;
    this.paintBars();
  }

  update(dt: number): void {
    const L = this.live;
    if (!L) return;
    const H = this.host, b = L.b, [cx, cz] = b.at;
    L.t += dt; L.stateT += dt; L.lungeT += dt;
    // Keep out: the ring pushes you back to its edge
    const P = H.player(), pd = Math.hypot(P.x - cx, P.z - cz);
    if (pd < b.r && L.phase !== 'fade') {
      const k = (b.r + 0.6) / Math.max(0.01, pd);
      H.movePlayer(cx + (P.x - cx) * k, cz + (P.z - cz) * k);
      if (L.t - L.kept > 6) { L.kept = L.t; this.speak(b.keepOut[0], b.keepOut[1]); }
    }
    // Circling, and a lunge in on each blow
    if (L.phase === 'fight') L.ang += dt * 0.18;
    const half = 1.6, lunge = L.lungeT < 0.5 ? Math.sin((L.lungeT / 0.5) * Math.PI) * 0.9 : 0;
    const ax = Math.cos(L.ang), az = Math.sin(L.ang);
    L.dPos.set(cx - ax * (half - (L.lunge === 'd' ? lunge : 0)), 0, cz - az * (half - (L.lunge === 'd' ? lunge : 0)));
    L.fPos.set(cx + ax * (half - (L.lunge === 'f' ? lunge : 0)), 0, cz + az * (half - (L.lunge === 'f' ? lunge : 0)));
    for (const p of [L.dPos, L.fPos]) p.y = H.voxels.groundBelow(p.x, H.player().y + 6, p.z);

    L.next -= dt;
    if (L.phase === 'intro' && L.next <= 0) {
      if (L.line < b.intro.length) { const [w, s] = b.intro[L.line++]; this.speak(w, s); L.next = 3.6; }
      else { L.phase = 'fight'; L.next = 1; H.sfx('bell'); }
    } else if (L.phase === 'fight' && L.next <= 0) {
      L.next = 2;
      const sh = b.shouts[L.shout];
      if (sh && L.fHp <= sh.at * 100) { this.openShout(sh); return; }
      // Dave down once, near the end of his strength; then he gets up
      if (L.dHp <= 14 && !L.downed) { L.downed = true; L.phase = 'down'; L.line = 0; L.next = 1.4; this.act('d', 'dead'); for (const [w, s] of b.down.slice(0, 1)) this.speak(w, s); return; }
      const skill = H.skill();
      const daveGoes = Math.random() < 0.5 + skill * 0.04;
      if (daveGoes) {
        this.strike('f', 5 + Math.floor(Math.random() * 4) + skill);
        if (Math.random() < 0.3) this.speak('d', b.daveLines[Math.floor(Math.random() * b.daveLines.length)]);
      } else {
        // (after he's got up, he can't be put down again)
        const n = 5 + Math.floor(Math.random() * 5);
        this.strike('d', L.downed ? Math.min(n, Math.max(0, L.dHp - 12)) : n);
        if (Math.random() < 0.35) this.speak('f', b.foeLines[Math.floor(Math.random() * b.foeLines.length)]);
      }
      if (L.fHp <= 0) { L.fHp = 0; this.paintBars(); L.phase = 'outro'; L.line = 0; L.next = 1.6; this.act('f', b.fades ? 'kneel' : 'idle'); H.sfx('hitHeavy'); }
    } else if (L.phase === 'shout') {
      this.shoutWait -= dt;
      if (this.shoutWait <= 0) this.answer(H.skill() >= 2 + Math.min(1, L.shout));
    } else if (L.phase === 'down' && L.next <= 0) {
      if (L.line === 0 && b.down[1]) { L.line = 1; this.speak(b.down[1][0], b.down[1][1]); L.next = 2.8; }
      else { L.phase = 'fight'; L.dHp = 45; this.paintBars(); this.act('d', 'idle'); this.speak('d', b.up); L.next = 2.4; H.sfx('cheer', 0.5); }
    } else if (L.phase === 'outro' && L.next <= 0) {
      if (L.line < b.outro.length) { const [w, s] = b.outro[L.line++]; this.speak(w, s); L.next = 4; }
      else if (b.fades) { L.phase = 'fade'; L.next = 3.2; H.sfx('thunder', 0.5); }
      else { this.finish(); return; }
    } else if (L.phase === 'fade') {
      const k = Math.max(0, L.next / 3.2);
      L.foe.root.scale.setScalar(b.foe.scale * (0.35 + 0.65 * k));
      if (L.next <= 0) { this.finish(); return; }
    }

    // Draw them: poses, facing each other
    const dS: AnimState = L.dState === 'dead' && L.phase === 'down' ? 'dead' : L.stateT < 0.5 ? L.dState : 'idle';
    const fS: AnimState = L.phase === 'outro' && b.fades ? ('kneel') : L.stateT < 0.5 ? L.fState : 'idle';
    L.dave.setState(dS); L.foe.setState(fS);
    L.dave.update(dt, 0); L.foe.update(dt, 0);
    L.dave.root.position.copy(L.dPos);
    L.foe.root.position.copy(L.fPos);
    if (L.phase === 'fade') L.foe.root.position.y -= (1 - L.next / 3.2) * 1.4;
    L.dave.root.rotation.y = Math.atan2(L.fPos.x - L.dPos.x, L.fPos.z - L.dPos.z);
    L.foe.root.rotation.y = Math.atan2(L.dPos.x - L.fPos.x, L.dPos.z - L.fPos.z);
  }

  private openShout(sh: Shout): void {
    const L = this.live!;
    L.phase = 'shout';
    this.shoutWait = 8;
    this.host.system(sh.move);
    const ui = document.createElement('div');
    ui.className = 'bout-shout';
    const opts = [...sh.options].sort(() => Math.random() - 0.5);
    ui.innerHTML = `<p>${sh.move}</p><div class="bout-shout-q">Shout to Dave:</div>`;
    opts.forEach((o) => {
      const btn = document.createElement('button');
      btn.textContent = o.label;
      btn.onclick = () => this.answer(o.right);
      ui.appendChild(btn);
    });
    document.body.appendChild(ui);
    this.shoutUi = ui;
  }

  /** Your shout (or his own judgement, if you said nothing): right, he takes the moment; wrong, it takes him. */
  private answer(right: boolean): void {
    const L = this.live;
    if (!L || L.phase !== 'shout') return;
    const sh = L.b.shouts[L.shout++];
    this.shoutUi?.remove(); this.shoutUi = null;
    L.phase = 'fight'; L.next = 2.2;
    if (right) { this.strike('f', 16); this.speak('d', sh.good); this.host.sfx('crit'); }
    else { this.strike('d', L.downed ? Math.min(16, Math.max(0, L.dHp - 12)) : 16); this.speak('d', sh.bad); }
    if (L.fHp <= 0) { L.fHp = 0; this.paintBars(); L.phase = 'outro'; L.line = 0; L.next = 1.6; }
  }

  private finish(): void {
    const L = this.live;
    if (!L) return;
    this.host.scene.remove(L.dave.root, L.foe.root);
    this.ui?.remove(); this.ui = null;
    this.shoutUi?.remove(); this.shoutUi = null;
    this.live = null;
    this.host.hideCompanion(false);
    this.host.done(L.id);
  }

  /** Called off (you left, or reloaded): no result. */
  cancel(): void {
    const L = this.live;
    if (!L) return;
    this.host.scene.remove(L.dave.root, L.foe.root);
    this.ui?.remove(); this.ui = null;
    this.shoutUi?.remove(); this.shoutUi = null;
    this.live = null;
    this.host.hideCompanion(false);
  }

  /** You walked off before it was done (more than this far from the ring). */
  tooFar(): boolean {
    const L = this.live;
    if (!L) return false;
    const P = this.host.player();
    return Math.hypot(P.x - L.b.at[0], P.z - L.b.at[1]) > 60;
  }
}
