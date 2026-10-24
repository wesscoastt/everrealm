import * as THREE from 'three';
import { PETS } from '../data/pets';
import { Companion } from '../entities/Companion';

/** What a chat line is: said aloud, an emote, to the group or guild, or a whisper (received, or sent). */
export type ChatKind = 'say' | 'emote' | 'group' | 'guild' | 'whisper' | 'whisperTo';
import { setRealmTime } from '../world/clock';
import { Appearance, AnimState, HeldItem, Humanoid } from '../entities/humanoid';
import type { SaveData } from '../game/state';
import { CreatureModel, mountModel } from '../entities/creatures';
import { passengerSeat, riderLift, type Seat } from '../entities/seats';
import { mountOf } from '../data/mountLooks';
import { ITEMS } from '../data/items';
import { currentAccount } from './Account';
import type { Performance } from '../game/Bard';
import type { PartId, Voice } from '../data/tunes';

// Connection to an Everrealm world server (server/server.mjs).
//   ?online               connects to ws://<this host>:8787
//   ?server=ws://host:port connects there
//   ?offline              stays offline
// A build made with VITE_REALM set (the hosted game) connects to that realm by default; any other
// build stays offline unless asked, and never opens a socket.

export type OnlineStatus = 'off' | 'connecting' | 'online' | 'denied' | 'lost';

interface Remote {
  id: number;
  name: string;
  model: Humanoid;
  /** Interpolation: where they were, where the latest snapshot says they are. */
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  yaw: number;
  anim: AnimState;
  held: HeldItem;
  speed: number;
  /** The halter of the horse they're riding, and that horse. */
  mount: string | null;
  horse: CreatureModel | null;
  horseOf: string | null;
  /** Their guild's name, shown under their name. */
  guild: string | null;
  /** Riding behind someone on a two-seat mount: that rider's id, or 0. */
  pillion: number;
  /** Their pet at their heels (data/pets.ts), if one is out. */
  pet: Companion | null;
}

interface PlayerPub { land?: string; id: number; name: string; look: Appearance; x: number; y: number; z: number; yaw: number; anim: AnimState; held: HeldItem; mount?: string | null; guild?: string | null; pillion?: number; perf?: Performance | null }

/** How high a rider sits on someone's mount, by its halter's id. */
const handL = new THREE.Vector3(), handR = new THREE.Vector3();
const liftOf = (mount: string | null) => riderLift(mountOf(mount));

const TOKENS_KEY = 'everrealm.netTokens';
const SEND_MS = 120;
const SAVE_GAP_MS = 10_000;

export function serverUrl(): string | null {
  const q = new URLSearchParams(location.search);
  if (q.has('offline')) return null;
  const s = q.get('server');
  if (s && /^wss?:\/\//.test(s)) return s;
  const realm = import.meta.env.VITE_REALM as string | undefined;
  if (realm && /^wss?:\/\//.test(realm) && !q.has('online')) return realm;
  // "localhost" can resolve to ::1 on Windows while the server listens on 127.0.0.1.
  const host = !location.hostname || location.hostname === 'localhost' ? '127.0.0.1' : location.hostname;
  if (q.has('online')) return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${host}:8787`;
  return null;
}

/** A per-browser secret for each character name: the server lets only the holder use that name. */
function tokenFor(name: string): string {
  let all: Record<string, string> = {};
  try { all = JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}'); } catch { /* fresh */ }
  const key = name.toLowerCase();
  if (!all[key]) {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    all[key] = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(TOKENS_KEY, JSON.stringify(all)); } catch { /* private window: the name works for this session only */ }
  }
  return all[key];
}

export interface TradeOffer { items: { id: string; n: number }[]; marks: number }
/** A home in the realm's book: who holds it, the plans it's built to (none yet: just leased), and the blocks laid on it by hand. */
export interface HomeHeld { owner: string; spec: unknown; blocks: [number, number, number, number][]; /** A stall up at the gate. */ stall?: boolean }
export interface GroupView { id: number; leader: number; members: { id: number; name: string; hp: number; max: number; level: number; calling: string; x: number; z: number }[] }
export interface TradeView { id: number; with: string; mine: TradeOffer; theirs: TradeOffer; myLock: boolean; theirLock: boolean; myAccept: boolean; theirAccept: boolean }

export type GuildRank = 'leader' | 'officer' | 'member';
/** A stack in the Exchange's book, and what the book owes you (takings, or a stack sent back). */
export interface ExRow { id: number; item: string; n: number; price: number; seller: string; at: number; /** On a stall at this lot's gate, not in the brokers' book. */ shop?: string | null }
/** A letter by the Charter Post (server/mail.mjs): from a character, or from the Post itself when one comes back. */
export interface Letter { id: number; from: string; fromKey: string | null; toName: string; subject: string; body: string; items: { id: string; n: number }[]; marks: number; at: number; read: boolean; returned?: boolean }
export interface ExOwed { kind: 'sold' | 'back'; id?: number; item: string; n: number; marks?: number; buyer?: string; at: number; shop?: string }
export interface GuildView { name: string | null; motto: string; rank: GuildRank | null; founded: number; members: { name: string; rank: GuildRank; online: boolean; seen: number }[] }

export interface OnlineHooks {
  scene: THREE.Scene;
  /** Someone helped you up while you were down. */
  revived?(by: string): void;
  /** Someone in your group killed a creature near you: it counts for you too. */
  groupKill?(type: string, from: string): void;
  /** Server messages for the log ("X has entered the world", chat lines). */
  system(text: string): void;
  /** A chat line; id is the speaker (yours too: it's echoed), kind 'emote' is "<from> waves." */
  chat(from: string, text: string, id?: number, kind?: ChatKind): void;
  /** Friends: who's in the world (and where), and word as one comes or goes. */
  friendStatus?(online: { name: string; x: number; z: number }[]): void;
  friendOn?(name: string): void;
  friendOff?(name: string): void;
  guild?(v: GuildView): void;
  guildInvited?(from: string, guild: string): void;
  /** Groups and trades (game/Social.ts). */
  group?(v: GroupView): void;
  groupInvited?(from: string): void;
  tradeAsked?(from: string): void;
  /** A creature someone else killed, and how long (ms) until it's back; the whole list on joining. */
  mobDead?(key: string, leftMs: number): void;
  mobLedger?(list: [string, number][]): void;
  /** Home visits: someone asks to see your home; a host's layout arrives for you to see. */
  homeAsked?(from: string): void;
  homeShow?(owner: string, pieces: unknown[], plot: unknown): void;
  /** The realm's book of homes (server/homes.mjs): all of it on coming in, then each change, and the answer to a claim. */
  homes?(list: Record<string, HomeHeld>, mine: string | null, lapsed: string | null): void;
  home?(id: string, home: HomeHeld | null): void;
  homeClaimed?(id: string, ok: boolean, why: string, owner: string): void;
  trade?(v: TradeView): void;
  tradeEnd?(why: string): void;
  tradeDone?(withName: string, give: TradeOffer, take: TradeOffer): void;
  status(s: OnlineStatus, players: number): void;
  /** Music (game/Bard.ts): someone starts or stops playing, plays a note, picks a band part, or strikes up the band. */
  perform?(id: number, p: Performance): void;
  performStop?(id: number): void;
  note?(id: number, m: number, voice: Voice): void;
  bandPart?(id: number, part: PartId, voice: Voice): void;
  bandGo?(from: number, name: string, tune: string, start: number, reps: number): void;
  /** The server has a newer copy of this character than the browser does. */
  newerSave(save: SaveData): void;
  /** A shared world boss's health, as the server keeps it. */
  bossState?(id: string, cycle: number, hp: number, max: number): void;
  /** The server says a world boss has fallen, and who fought it. */
  bossDown?(id: string, cycle: number, by: string[]): void;
  /** A shared event's progress: kills so far, the wave it's on, seconds left. */
  eventState?(id: string, killed: number, total: number, wave: number, left: number): void;
  /** A shared event is over (won or failed) with each player's kills. */
  eventDone?(id: string, ok: boolean, total: number, shares: Record<string, number>): void;
  /** That event ran lately and is resting for so many seconds. */
  eventCool?(id: string, left: number): void;
  /** The Exchange (game/Exchange.ts). */
  exBook?(rows: ExRow[], mine: number[], shop: string | null): void;
  exPosted?(row: ExRow): void;
  exRefused?(item: string, n: number, why: string): void;
  exBought?(row: ExRow): void;
  exBack?(row: ExRow): void;
  exGone?(id: number): void;
  exOwed?(rows: ExOwed[]): void;
  /** The Charter Post (game/Mail.ts): your box, a new letter, one posted or refused, things taken out, one gone, how many are unread. */
  mailBox?(letters: Letter[]): void;
  mailNew?(letter: Letter, unread: number): void;
  mailSent?(to: string): void;
  mailRefused?(items: { id: string; n: number }[], marks: number, postage: number, why: string): void;
  mailTaken?(id: number, items: { id: string; n: number }[], marks: number): void;
  mailGone?(id: number, unread: number | null): void;
  mailUnread?(n: number): void;
  /** The Group Finder (game/Dungeons.ts): the queue, a group ready, a run starting, and the run's blows and kills. */
  qStatus?(dungeon: string | null, n: number): void;
  qReady?(run: number, dungeon: string, names: string[], henchmen: number, secs: number): void;
  dStart?(run: number, dungeon: string, members: { id: number; name: string; role: string }[], missing: string[]): void;
  dEv?(from: number, k: 'hit' | 'kill', i: number, dmg: number): void;
  dLeft?(name: string): void;
  /** Our own mount's saddle, for drawing whoever rides behind us. */
  /** The mount we're on (where it stands, its halter), or null. */
  mySeat?(): { x: number; y: number; z: number; yaw: number; mount: string } | null;
  /** How dark it is (0 day, 1 night): riders carry torches after dark. */
  night?(): number;
  /** The realm's answer to a named piece dropping: its number, or none left (gone) / asked too soon. */
  uGrant?(id: string, ok: boolean, n: number, cap: number, first: string, gone: boolean): void;
  /** Every named piece: how many the realm holds, and who has found the ones given out. */
  uLedger?(ledger: Record<string, { cap: number; found: { n: number; name: string }[] }>): void;
}

export class Online {
  status: OnlineStatus = 'off';
  readonly remotes = new Map<number, Remote>();
  private ws: WebSocket | null = null;
  private sendT = 0;
  private lastSave = 0;
  private retry = 0;
  private retryTimer = 0;
  private me: { name: string; look: Appearance; playTime: number } | null = null;

  constructor(private readonly hooks: OnlineHooks, readonly url: string | null = serverUrl()) {}

  get enabled(): boolean { return !!this.url; }

  connect(name: string, look: Appearance, playTime: number): void {
    if (!this.url || this.ws) return;
    this.me = { name, look, playTime };
    this.setStatus('connecting');
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.setStatus('lost'); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ t: 'hello', name, token: tokenFor(name), session: currentAccount()?.token, look }));
    };
    ws.onmessage = (e) => this.onMessage(typeof e.data === 'string' ? e.data : '');
    ws.onclose = () => {
      this.ws = null;
      this.clearRemotes();
      if (this.status === 'denied') return;
      const wasOnline = this.status === 'online';
      this.setStatus('lost');
      if (wasOnline) this.hooks.system('Lost the connection to the server. Retrying…');
      // Back off: 2s, 4s, 8s … up to a minute.
      const wait = Math.min(60, 2 ** ++this.retry) * 1000;
      this.retryTimer = window.setTimeout(() => { if (this.me) this.connect(this.me.name, this.me.look, this.me.playTime); }, wait);
    };
  }

  /** What the character now looks like, armour and all: everyone else redraws them. */
  setLook(look: Appearance): void {
    if (!this.me) return;
    this.me.look = look;
    this.emit({ t: 'look', look });
  }

  disconnect(): void {
    window.clearTimeout(this.retryTimer);
    this.me = null;
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    this.clearRemotes();
    this.setStatus('off');
  }

  private setStatus(s: OnlineStatus): void {
    this.status = s;
    this.hooks.status(s, this.remotes.size + (s === 'online' ? 1 : 0));
  }

  private onMessage(raw: string): void {
    let m: { t: string; [k: string]: unknown };
    try { m = JSON.parse(raw); } catch { return; }
    switch (m.t) {
      case 'welcome': {
        this.myId = typeof m.id === 'number' ? m.id : -1;
        if (typeof m.now === 'number') setRealmTime(m.now);
        if (Array.isArray(m.mobs)) this.hooks.mobLedger?.(m.mobs as [string, number][]);
        for (const p of m.players as PlayerPub[]) this.addRemote(p);
        this.setStatus('online');
        const others = this.remotes.size;
        this.hooks.system(others ? `Connected. ${others} other ${others === 1 ? 'player is' : 'players are'} in the world.` : 'Connected. Nobody else is in the world yet.');
        const save = m.save as SaveData | null;
        if (save && this.me && save.playTime > this.me.playTime + 5) this.hooks.newerSave(save);
        break;
      }
      case 'denied':
        this.setStatus('denied');
        this.hooks.system(`${String(m.reason)} Playing offline.`);
        break;
      case 'join': this.addRemote(m.player as PlayerPub); this.setStatus('online'); break;
      case 'leave': this.removeRemote(m.id as number); this.setStatus('online'); break;
      case 'look': { const r = this.remotes.get(m.id as number); if (r) this.replaceModel(r, m.look as Appearance); break; }
      case 'snap':
        for (const [id, x, y, z, yaw, anim, held, mount, pillion] of m.p as [number, number, number, number, number, AnimState, HeldItem, string | 0 | undefined, number | undefined][]) {
          const r = this.remotes.get(id);
          if (!r) continue;
          r.from.copy(r.model.root.position);
          if (r.horse) r.from.y -= liftOf(r.horseOf);
          r.mount = typeof mount === 'string' && mountOf(mount) ? mount : null;
          r.to.set(x, y, z);
          r.t = 0;
          r.speed = r.from.distanceTo(r.to) / 0.1;
          r.yaw = yaw; r.anim = anim; r.held = held;
          r.pillion = typeof pillion === 'number' ? pillion : 0;
        }
        break;
      case 'chat': this.hooks.chat(String(m.from), String(m.text), typeof m.id === 'number' ? m.id : undefined, (['emote', 'group', 'guild', 'whisper', 'whisperTo'] as const).find((k) => k === m.kind) ?? 'say'); break;
      case 'fStatus': this.hooks.friendStatus?.(Array.isArray(m.online) ? (m.online as { name: string; x: number; z: number }[]) : []); break;
      case 'fOn': this.hooks.friendOn?.(String(m.name)); break;
      case 'fOff': this.hooks.friendOff?.(String(m.name)); break;
      case 'guild': this.hooks.guild?.({ name: null, motto: '', rank: null, founded: 0, members: [], ...(m as object) } as GuildView); break;
      case 'uInvited': this.hooks.guildInvited?.(String(m.from), String(m.guild)); break;
      case 'gtag': { const r = this.remotes.get(m.id as number); if (r) r.guild = typeof m.guild === 'string' ? m.guild : null; break; }
      case 'group': this.hooks.group?.(m as unknown as GroupView); break;
      case 'gInvited': this.hooks.groupInvited?.(String(m.from)); break;
      case 'mobDead': if (typeof m.key === 'string' && typeof m.left === 'number') this.hooks.mobDead?.(m.key, m.left); break;
      case 'tAsked': this.hooks.tradeAsked?.(String(m.from)); break;
      case 'hAsked': this.hooks.homeAsked?.(String(m.from)); break;
      case 'hShow': this.hooks.homeShow?.(String(m.owner), Array.isArray(m.pieces) ? m.pieces : [], m.plot ?? null); break;
      case 'homes': this.hooks.homes?.((m.list ?? {}) as Record<string, HomeHeld>, typeof m.mine === 'string' ? m.mine : null, typeof m.lapsed === 'string' ? m.lapsed : null); break;
      case 'home': if (typeof m.id === 'string') this.hooks.home?.(m.id, (m.home ?? null) as HomeHeld | null); break;
      case 'hClaimed': if (typeof m.id === 'string') this.hooks.homeClaimed?.(m.id, !!m.ok, String(m.why ?? ''), String(m.owner ?? '')); break;
      case 'trade': this.hooks.trade?.(m as unknown as TradeView); break;
      case 'tradeEnd': this.hooks.tradeEnd?.(String(m.why ?? '')); break;
      case 'tradeDone': this.hooks.tradeDone?.(String(m.with), m.give as TradeOffer, m.take as TradeOffer); break;
      case 'sys': this.hooks.system(String(m.text)); break;
      case 'revived': this.hooks.revived?.(String(m.by)); break;
      case 'gKill': if (typeof m.type === 'string') this.hooks.groupKill?.(m.type, String(m.from)); break;
      case 'perform': this.hooks.perform?.(Number(m.id), { tune: String(m.tune), part: m.part as PartId, voice: m.voice as Voice, start: Number(m.start), reps: Number(m.reps) }); break;
      case 'perfStop': this.hooks.performStop?.(Number(m.id)); break;
      case 'note': this.hooks.note?.(Number(m.id), Number(m.m), m.voice as Voice); break;
      case 'bandPart': this.hooks.bandPart?.(Number(m.id), m.part as PartId, m.voice as Voice); break;
      case 'bandGo': this.hooks.bandGo?.(Number(m.from), String(m.name), String(m.tune), Number(m.start), Number(m.reps)); break;
      case 'exBook': this.hooks.exBook?.(Array.isArray(m.rows) ? (m.rows as ExRow[]) : [], Array.isArray(m.mine) ? (m.mine as number[]) : [], typeof m.shop === 'string' ? m.shop : null); break;
      case 'exPosted': this.hooks.exPosted?.(m.row as ExRow); break;
      case 'exRefused': this.hooks.exRefused?.(String(m.item), Number(m.n) || 0, String(m.why ?? '')); break;
      case 'exBought': this.hooks.exBought?.(m.row as ExRow); break;
      case 'exBack': this.hooks.exBack?.(m.row as ExRow); break;
      case 'exGone': this.hooks.exGone?.(Number(m.id)); break;
      case 'mailBox': this.hooks.mailBox?.(Array.isArray(m.letters) ? (m.letters as Letter[]) : []); break;
      case 'mailNew': this.hooks.mailNew?.(m.letter as Letter, Number(m.unread) || 0); break;
      case 'mailSent': this.hooks.mailSent?.(String(m.to)); break;
      case 'mailRefused': this.hooks.mailRefused?.(Array.isArray(m.items) ? (m.items as { id: string; n: number }[]) : [], Number(m.marks) || 0, Number(m.postage) || 0, String(m.why ?? '')); break;
      case 'mailTaken': this.hooks.mailTaken?.(Number(m.id), Array.isArray(m.items) ? (m.items as { id: string; n: number }[]) : [], Number(m.marks) || 0); break;
      case 'mailGone': this.hooks.mailGone?.(Number(m.id), typeof m.unread === 'number' ? m.unread : null); break;
      case 'mailUnread': this.hooks.mailUnread?.(Number(m.n) || 0); break;
      case 'exOwed': this.hooks.exOwed?.(Array.isArray(m.rows) ? (m.rows as ExOwed[]) : []); break;
      case 'boss': this.hooks.bossState?.(String(m.id), Number(m.cycle), Number(m.hp), Number(m.max)); break;
      case 'ev': this.hooks.eventState?.(String(m.id), Number(m.killed), Number(m.total), Number(m.wave), Number(m.left)); break;
      case 'evDone': this.hooks.eventDone?.(String(m.id), !!m.ok, Number(m.total), (m.shares && typeof m.shares === 'object' ? m.shares : {}) as Record<string, number>); break;
      case 'evCool': this.hooks.eventCool?.(String(m.id), Number(m.left)); break;
      case 'bossDown': this.hooks.bossDown?.(String(m.id), Number(m.cycle), Array.isArray(m.by) ? (m.by as unknown[]).map(String) : []); break;
      case 'qStatus': this.hooks.qStatus?.(typeof m.dungeon === 'string' ? m.dungeon : null, Number(m.n) || 0); break;
      case 'qReady': this.hooks.qReady?.(Number(m.run), String(m.dungeon), Array.isArray(m.names) ? (m.names as unknown[]).map(String) : [], Number(m.henchmen) || 0, Number(m.secs) || 30); break;
      case 'dStart': this.hooks.dStart?.(Number(m.run), String(m.dungeon), Array.isArray(m.members) ? (m.members as { id: number; name: string; role: string }[]) : [], Array.isArray(m.missing) ? (m.missing as unknown[]).map(String) : []); break;
      case 'dEv': if (m.k === 'hit' || m.k === 'kill') this.hooks.dEv?.(Number(m.from), m.k, Number(m.i), Number(m.dmg) || 0); break;
      case 'dLeft': this.hooks.dLeft?.(String(m.name)); break;
      case 'uGrant': this.hooks.uGrant?.(String(m.id), !!m.ok, Number(m.n) || 0, Number(m.cap) || 0, String(m.first ?? ''), !!m.gone); break;
      case 'uLedger': if (m.ledger && typeof m.ledger === 'object') this.hooks.uLedger?.(m.ledger as Record<string, { cap: number; found: { n: number; name: string }[] }>); break;
    }
  }

  private addRemote(p: PlayerPub): void {
    this.removeRemote(p.id);
    const model = new Humanoid(p.look);
    const pos = new THREE.Vector3(p.x, p.y, p.z);
    model.root.position.copy(pos);
    this.hooks.scene.add(model.root);
    const mount = p.mount && ITEMS[p.mount]?.mount ? p.mount : null;
    this.remotes.set(p.id, { id: p.id, name: p.name, model, from: pos.clone(), to: pos.clone(), t: 1, yaw: p.yaw, anim: p.anim, held: p.held, speed: 0, mount, horse: null, horseOf: null, guild: p.guild ?? null, pillion: p.pillion ?? 0, pet: this.petFor(p.look, pos) });
    if (p.perf) this.hooks.perform?.(p.id, p.perf);
  }

  /** A pet for someone whose look names one. */
  private petFor(look: Appearance, at: THREE.Vector3): Companion | null {
    if (!look.pet || !PETS[look.pet]) return null;
    const c = new Companion(look.pet, at);
    this.hooks.scene.add(c.model.root);
    return c;
  }

  private replaceModel(r: Remote, look: Appearance): void {
    const pos = r.model.root.position.clone();
    if ((r.pet?.pet ?? null) !== (look.pet && PETS[look.pet] ? look.pet : null)) {
      if (r.pet) this.hooks.scene.remove(r.pet.model.root);
      r.pet = this.petFor(look, pos);
    }
    this.hooks.scene.remove(r.model.root);
    r.model = new Humanoid(look);
    r.model.root.position.copy(pos);
    this.hooks.scene.add(r.model.root);
  }

  private removeRemote(id: number): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.hooks.scene.remove(r.model.root);
    if (r.horse) this.hooks.scene.remove(r.horse.root);
    if (r.pet) this.hooks.scene.remove(r.pet.model.root);
    this.remotes.delete(id);
  }

  private clearRemotes(): void {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }

  /** Called every frame while playing: send our state, move everyone else. */
  /**
   * Passenger `who`'s seat on a rider's mount (null if there's no seat for them here). Passengers take
   * the seats in the order of their ids, so every game puts each of them in the same place.
   */
  seatOf(riderId: number, who = this.myId): Seat | null {
    let at: { x: number; y: number; z: number; yaw: number }, mount: string;
    if (riderId === this.myId) { const s = this.hooks.mySeat?.(); if (!s) return null; at = s; mount = s.mount; }
    else {
      const r = this.remotes.get(riderId);
      if (!r?.horse || !r.mount) return null;
      const h = r.horse.root;
      at = { x: h.position.x, y: h.position.y, z: h.position.z, yaw: h.rotation.y };
      mount = r.mount;
    }
    return passengerSeat(mountOf(mount), this.passengers(riderId).indexOf(who), at.x, at.y, at.z, at.yaw);
  }
  /** Everyone riding with a rider, by id. */
  passengers(riderId: number): number[] {
    const ids = [...this.remotes.values()].filter((o) => o.pillion === riderId).map((o) => o.id);
    if (this.myPillion === riderId) ids.push(this.myId);
    return ids.sort((a, b) => a - b);
  }
  private myPillion: number | null = null;

  update(dt: number, me: { x: number; y: number; z: number; yaw: number; anim: AnimState; held: HeldItem | string; mount?: string | null; pillion?: number | null }): void {
    this.myPillion = me.pillion ?? null;
    if (this.status !== 'online' || !this.ws) return;
    this.sendT -= dt * 1000;
    if (this.sendT <= 0) {
      this.sendT = SEND_MS;
      this.ws.send(JSON.stringify({ t: 'state', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), anim: me.anim, held: me.held, mount: me.mount ?? null, pillion: me.pillion ?? 0 }));
    }
    for (const r of this.remotes.values()) {
      r.t = Math.min(1, r.t + dt / 0.1);
      r.model.root.position.lerpVectors(r.from, r.to, r.t);
      // A rider: their horse underfoot, and them in the saddle
      if (r.mount !== r.horseOf) {
        if (r.horse) this.hooks.scene.remove(r.horse.root);
        const m = mountOf(r.mount);
        r.horse = m ? mountModel(m) : null;
        if (r.horse) this.hooks.scene.add(r.horse.root);
        r.horseOf = r.mount;
      }
      if (r.horse) {
        r.horse.root.position.copy(r.model.root.position);
        r.horse.root.rotation.y = r.model.root.rotation.y;
        const sp = r.t < 1 ? r.speed : 0;
        r.horse.setAnim(sp > 10.5 ? 'run' : sp > 0.4 ? 'walk' : 'idle');
        r.horse.update(dt, sp);
        r.model.root.position.y += liftOf(r.mount);
      }
      // Riding behind someone: in the second seat of their mount, wherever we see it
      const seat = r.pillion ? this.seatOf(r.pillion, r.id) : null;
      if (seat) { r.model.root.position.set(seat.x, seat.y + seat.lift, seat.z); r.model.root.rotation.y = seat.yaw; r.yaw = seat.yaw; r.anim = seat.pose; r.held = 'none'; }
      r.pet?.update(dt, r.model.root.position, r.model.root.rotation.y);
      // Turn the short way round.
      let dy = r.yaw - r.model.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      r.model.root.rotation.y += dy * Math.min(1, dt * 12);
      r.model.setState(r.anim);
      r.model.setHeld(r.held);
      r.model.setTorch((!!r.horse || !!r.pillion) && (this.hooks.night?.() ?? 0) > 0.45);
      r.model.straddle = r.horse?.girth ?? 0.38;
      r.model.update(dt, r.t < 1 ? r.speed : 0, r.anim === 'jump');
      r.horse?.holdReins(r.model.state === 'ride' ? r.model.handsAt(handL, handR) : null);
    }
  }

  get online(): boolean { return this.status === 'online' && !!this.ws; }

  /** Help someone who's down back to their feet (the server checks they're down and you're beside them). */
  revive(id: number): void { if (this.online) this.ws!.send(JSON.stringify({ t: 'revive', id })); }
  /** Tell your group about a kill, for their quests. */
  groupKill(type: string): void { if (this.online) this.ws!.send(JSON.stringify({ t: 'gKill', type })); }
  /** How many others are up and about within r of a point: who might come and help you up. */
  standingNear(x: number, z: number, r: number): number {
    let n = 0;
    for (const o of this.remotes.values()) if (o.anim !== 'dead' && Math.hypot(o.model.root.position.x - x, o.model.root.position.z - z) < r) n++;
    return n;
  }

  /** Ask for a world boss's shared health (sent when it rises in front of us). */
  bossSync(id: string, cycle: number, max: number): void {
    if (this.online) this.ws!.send(JSON.stringify({ t: 'bossSync', id, cycle, max }));
  }

  /** Near an event: join its run, or start one. */
  eventStart(id: string, waves: number[], time: number, cooldown: number): void {
    if (this.online) this.ws!.send(JSON.stringify({ t: 'evStart', id, waves, time, cooldown }));
  }

  /** One of an event's creatures fell to us. */
  eventKill(id: string): void {
    if (this.online) this.ws!.send(JSON.stringify({ t: 'evKill', id }));
  }

  /** A blow landed on a shared world boss. */
  bossHit(id: string, cycle: number, dmg: number, max: number): void {
    if (this.online) this.ws!.send(JSON.stringify({ t: 'bossHit', id, cycle, dmg, max }));
  }

  private emit(msg: object): void { if (this.status === 'online' && this.ws) this.ws.send(JSON.stringify(msg)); }
  groupInvite(name: string): void { this.emit({ t: 'gInvite', name }); }
  groupAnswer(accept: boolean): void { this.emit({ t: 'gAnswer', accept }); }
  groupLeave(): void { this.emit({ t: 'gLeave' }); }
  groupKick(name: string): void { this.emit({ t: 'gKick', name }); }
  groupPromote(name: string): void { this.emit({ t: 'gPromote', name }); }
  whisper(to: string, text: string): void { this.emit({ t: 'whisper', to, text }); }
  friendsWatch(names: string[]): void { this.emit({ t: 'fWatch', names }); }
  groupChat(text: string): void { this.emit({ t: 'gChat', text }); }
  vitals(hp: number, max: number, level: number, calling: string): void { this.emit({ t: 'vitals', hp, max, level, calling }); }
  tradeAsk(name: string): void { this.emit({ t: 'tAsk', name }); }
  /** Tell the realm a creature at this spawn point died; it's gone for everyone for `secs`. */
  mobDead(key: string, secs: number): void { this.emit({ t: 'mobDead', key, secs }); }
  homeAsk(name: string): void { this.emit({ t: 'hAsk', name }); }
  /** A report about a player, for the realm's keeper (server: data/reports.json). */
  report(name: string, reason: string): void { this.emit({ t: 'report', name, reason }); }
  /** The latest reports (the keeper's accounts only). */
  reportsList(): void { this.emit({ t: 'reports' }); }
  homeShow(name: string, accept: boolean, pieces: unknown[] | null, plot: unknown = null): void { this.emit({ t: 'hShow', name, accept, pieces, plot }); }
  /** The book of homes: lease one (spec: plans it's already built to), give it up, build or rebuild, lay blocks by hand. */
  homeClaim(id: string, spec?: unknown, blocks?: unknown): void { this.emit({ t: 'hClaim', id, spec, blocks }); }
  homeRelease(id: string): void { this.emit({ t: 'hRelease', id }); }
  homeSpec(id: string, spec: unknown): void { this.emit({ t: 'hSpec', id, spec }); }
  homeBlocks(id: string, blocks: unknown): void { this.emit({ t: 'hBlocks', id, blocks }); }
  homeStall(id: string, open: boolean): void { this.emit({ t: 'hStall', id, open }); }
  tradeAnswer(name: string, accept: boolean): void { this.emit({ t: 'tAnswer', name, accept }); }
  tradeOffer(items: { id: string; n: number }[], marks: number): void { this.emit({ t: 'tOffer', items, marks }); }
  tradeLock(on: boolean): void { this.emit({ t: 'tLock', on }); }
  tradeAccept(): void { this.emit({ t: 'tAccept' }); }
  tradeCancel(): void { this.emit({ t: 'tCancel' }); }
  guildCreate(name: string, motto: string): void { this.emit({ t: 'uCreate', name, motto }); }
  guildInvite(name: string): void { this.emit({ t: 'uInvite', name }); }
  guildAnswer(accept: boolean): void { this.emit({ t: 'uAnswer', accept }); }
  guildLeave(): void { this.emit({ t: 'uLeave' }); }
  guildKick(name: string): void { this.emit({ t: 'uKick', name }); }
  guildRank(name: string, rank: GuildRank): void { this.emit({ t: 'uRank', name, rank }); }
  guildMotto(text: string): void { this.emit({ t: 'uMotto', text }); }
  guildChat(text: string): void { this.emit({ t: 'uChat', text }); }
  /** The brokers' book, or one stall's (by its lot). */
  exList(shop?: string): void { this.emit({ t: 'exList', shop }); }
  // The Group Finder (server/finder.mjs)
  qJoin(dungeon: string, role: string): void { this.emit({ t: 'qJoin', dungeon, role }); }
  qLeave(): void { this.emit({ t: 'qLeave' }); }
  /** A named piece has dropped: ask the realm for its number. */
  uClaim(id: string): void { this.emit({ t: 'uClaim', id }); }
  uLedger(): void { this.emit({ t: 'uLedger' }); }
  /** Stop waiting for a full group: go in with whoever's queued, henchmen for the rest. */
  qNow(): void { this.emit({ t: 'qNow' }); }
  qGroup(dungeon: string): void { this.emit({ t: 'qGroup', dungeon }); }
  qAnswer(run: number, yes: boolean, role: string): void { this.emit({ t: 'qAnswer', run, yes, role }); }
  dEv(run: number, k: 'hit' | 'kill', i: number, dmg: number): void { this.emit({ t: 'dEv', run, k, i, dmg }); }
  dLeave(run: number): void { this.emit({ t: 'dLeave', run }); }
  exPost(item: string, n: number, price: number, shop?: string): void { this.emit({ t: 'exPost', item, n, price, shop }); }
  exBuy(id: number): void { this.emit({ t: 'exBuy', id }); }
  exCancel(id: number): void { this.emit({ t: 'exCancel', id }); }
  // The Charter Post (server/mail.mjs)
  mailBox(): void { this.emit({ t: 'mailBox' }); }
  mailSend(to: string, subject: string, body: string, items: { id: string; n: number }[], marks: number, postage: number): void { this.emit({ t: 'mailSend', to, subject, body, items, marks, postage }); }
  mailRead(id: number): void { this.emit({ t: 'mailRead', id }); }
  mailTake(id: number): void { this.emit({ t: 'mailTake', id }); }
  mailDelete(id: number): void { this.emit({ t: 'mailDelete', id }); }
  mailReturn(id: number): void { this.emit({ t: 'mailReturn', id }); }

  /** Your id on the server (to know your own echoed chat). */
  myId = -1;

  private chatQueue: { text: string; kind: 'say' | 'emote' }[] = [];
  private chatSentAt = 0;
  private chatTimer = 0;

  /** Send a chat line. The server drops lines closer together than 600 ms, so they're paced here instead of lost. */
  /** Start playing (the realm passes it to everyone), or stop. */
  perform(p: Performance, ms: number): void { this.emit({ t: 'perform', ...p, ms: Math.round(ms) }); }
  performStop(): void { this.emit({ t: 'perfStop' }); }
  /** A free-play note, to everyone in earshot. */
  note(m: number, voice: Voice): void { this.emit({ t: 'note', m, voice }); }
  /** Your part in your group's band, and striking it up. */
  bandPart(part: PartId, voice: Voice): void { this.emit({ t: 'bandPart', part, voice }); }
  bandGo(tune: string, start: number, reps: number): void { this.emit({ t: 'bandGo', tune, start, reps }); }

  chat(text: string, kind: 'say' | 'emote' = 'say'): void {
    if (this.status !== 'online' || !this.ws) return;
    if (this.chatQueue.length >= 6) { this.hooks.system('You are talking too fast: wait a moment.'); return; }
    this.chatQueue.push({ text, kind });
    this.flushChat();
  }

  private flushChat(): void {
    clearTimeout(this.chatTimer);
    while (this.chatQueue.length) {
      const wait = this.chatSentAt + 650 - Date.now();
      if (wait > 0) { this.chatTimer = window.setTimeout(() => this.flushChat(), wait); return; }
      if (this.status !== 'online' || !this.ws) { this.chatQueue = []; return; }
      const m = this.chatQueue.shift()!;
      this.ws.send(JSON.stringify({ t: 'chat', text: m.text, kind: m.kind }));
      this.chatSentAt = Date.now();
    }
  }

  /** Upload the character, at most every ten seconds unless forced. */
  save(save: SaveData, force = false): void {
    if (this.status !== 'online' || !this.ws) return;
    const now = Date.now();
    if (!force && now - this.lastSave < SAVE_GAP_MS) return;
    this.lastSave = now;
    if (this.me) this.me.playTime = save.playTime;
    this.ws.send(JSON.stringify({ t: 'save', save }));
  }
}
