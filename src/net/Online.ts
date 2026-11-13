import * as THREE from 'three';
import { PETS } from '../data/pets';
import { Companion } from '../entities/Companion';

/** What a chat line is: said aloud, an emote, to the group or guild, or a whisper (received, or sent). */
export type ChatKind = 'say' | 'emote' | 'local' | 'trade' | 'group' | 'guild' | 'whisper' | 'whisperTo';
import { setRealmTime } from '../world/clock';
import { Appearance, AnimState, HeldItem, Humanoid } from '../entities/humanoid';
import type { SaveData } from '../game/state';
import { CreatureModel, mountModel, type MountLook } from '../entities/creatures';
import { passengerSeat, riderLift, type Seat } from '../entities/seats';
import { mountOf } from '../data/mountLooks';
import type { Post } from '../game/Posts';
import { boatUnderSeat } from '../game/Rowboat';
import { POST_CART, POST_CART_KEY, POST_RIDER_SEAT } from '../data/postStations';
import { CARTER } from '../game/PostRide';
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
  /** Their float and line while they fish, as everyone sees it. */
  float?: THREE.Group | null;
  /** The light they carry, lit: 1 a torch in the hand, 2 a lantern at the belt, 0 none. */
  light?: number;
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
  /** Rowing (mount 'boat_row'): the boat under them, and where she was last frame (to carry anyone standing in her). */
  boat?: THREE.Object3D | null;
  boatPrev?: { x: number; y: number; z: number; yaw: number } | null;
  /** The Post's carter on the box, while they ride the Post. */
  carter?: Humanoid;
  /** Their guild's name, shown under their name. */
  guild: string | null;
  /** Riding behind someone on a two-seat mount: that rider's id, or 0. */
  pillion: number;
  /** Their pet at their heels (data/pets.ts), if one is out. */
  pet: Companion | null;
  /** Their companion (game/Companions.ts), following them: the figure, the horse it rides when they ride, where it is. */
  comp?: { model: Humanoid; steedLook: MountLook | null; steed: CreatureModel | null; pos: THREE.Vector3; yaw: number } | null;
}

/** A companion as everyone else is told of it. */
export interface CompPub { name: string; look: Appearance; held: string; steed: MountLook | null }
interface PlayerPub { comp?: CompPub | null; land?: string; id: number; name: string; look: Appearance; x: number; y: number; z: number; yaw: number; anim: AnimState; held: HeldItem; mount?: string | null; guild?: string | null; pillion?: number; perf?: Performance | null; light?: number }

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
export interface HomeHeld { owner: string; spec: unknown; blocks: [number, number, number, number][]; /** A stall up at the gate. */ stall?: boolean; /** Given by the keeper (/granthome): it outranks a home in the holder's save. */ granted?: boolean }
/** A notice on the open world's board. */
export interface LfgNotice { id: number; name: string; kind: string; label: string; region: string; level: number; size: number; mine: boolean }
export interface GroupView { id: number; leader: number; members: { id: number; name: string; hp: number; max: number; level: number; calling: string; x: number; z: number }[] }
export interface TradeView { id: number; with: string; mine: TradeOffer; theirs: TradeOffer; myLock: boolean; theirLock: boolean; myAccept: boolean; theirAccept: boolean }

export type GuildRank = 'leader' | 'officer' | 'member';
/** A stack in the Exchange's book, and what the book owes you (takings, or a stack sent back). */
/** The guild vault as the realm sends it: left is a member's allowance for today (null: an officer's, none). */
/** The book of guild halls (server/guilds.mjs): by hall, who holds it, what's built, the roll of honour. */
export type HallsBook = Record<string, { guild: string; built: string[]; honour: string[] }>;
/** Your guild's hall as its members see it: what's built and being built, what's been given toward it, what everything costs. */
export interface HallView {
  guild: string | null; rank: GuildRank | null; hall: string | null; built: string[]; project: string | null;
  got: Record<string, Record<string, number>>; honour: string[];
  costs: Record<string, { items: Record<string, number>; marks: number }>; lease: number; vaultMarks: number; free: string[];
}
export interface GuildVaultView { guild: string; items: Record<string, number>; marks: number; log: { at: number; text: string }[]; left: { items: number; marks: number } | null; kinds: number }

export interface ExRow { id: number; item: string; n: number; price: number; seller: string; at: number; /** On a stall at this lot's gate, not in the brokers' book. */ shop?: string | null; /** An order (Wanted): seller is who wants it. */ want?: boolean }
/** A letter by the Charter Post (server/mail.mjs): from a character, or from the Post itself when one comes back. */
export interface Letter { id: number; from: string; fromKey: string | null; toName: string; subject: string; body: string; items: { id: string; n: number }[]; marks: number; at: number; read: boolean; returned?: boolean }
export interface ExOwed { kind: 'sold' | 'back' | 'got' | 'unwanted'; id?: number; item: string; n: number; marks?: number; buyer?: string; at: number; shop?: string }
export interface GuildView { name: string | null; motto: string; rank: GuildRank | null; founded: number; members: { name: string; rank: GuildRank; online: boolean; seen: number }[];
  /** The week's mission (server/guilds.mjs). */
  mission?: { kind: string; title: string; ask: string; target: number; progress: number; done: boolean; reward: number; top: { name: string; n: number }[] } }

/** Someone else's float and line: a red and white bob, and the line (filled in each frame). */
function fishFloat(): THREE.Group {
  const g = new THREE.Group();
  const bob = new THREE.Group();
  bob.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: '#e8402a' })));
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshLambertMaterial({ color: '#f4f0e8' }));
  top.position.y = 0.08;
  bob.add(top);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(8).fill(0).map(() => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#f0f0f0', transparent: true, opacity: 0.7 }));
  line.frustumCulled = false;
  g.add(bob, line);
  return g;
}

/** A run's fight as the realm remembers it: each creature's health taken (ten-thousandths), the dead, each room's state. */
export interface RunState { hits: [number, number][]; dead: number[]; rooms: [number, number][] }
const pairs = (v: unknown): [number, number][] => (Array.isArray(v) ? v.filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n))) : []);
function runState(v: unknown): RunState | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return { hits: pairs(o.hits), dead: Array.isArray(o.dead) ? o.dead.filter((n): n is number => Number.isInteger(n)) : [], rooms: pairs(o.rooms) };
}

export interface OnlineHooks {
  scene: THREE.Scene;
  /** A rowing boat to put under someone rowing (game/Rowboat.ts). */
  rowboatModel?(): THREE.Object3D;
  /** The ground under a point, near a height (for others' companions to walk on). */
  ground?(x: number, z: number, nearY: number): number;
  /** Someone helped you up while you were down. */
  revived?(by: string): void;
  /** The Arena at Verandah (server/arena.mjs; game/Arena.ts): challenges, matches, hits, the board. */
  pvp?(m: Record<string, unknown>): void;
  /** Someone in your group killed a creature near you: it counts for you too. */
  groupKill?(type: string, from: string): void;
  /** A groupmate moved a delve's room on (server/social.mjs gRoom). */
  groupRoom?(site: string, i: number, s: number): void;
  /** Travel to a friend: where they stand, once the realm has said they may be travelled to. */
  friendAt?(name: string, x: number, y: number, z: number): void;
  /** Message posts (server/signs.mjs): all of them in your land on coming in, then each one put up or taken down. */
  posts?(list: Post[]): void;
  post?(p: Post): void;
  postGone?(id: number): void;
  postUp?(id: number, n: number, until?: number): void;
  /** A post kept up a while longer (logs spent on it). */
  postTime?(id: number, until: number): void;
  postNo?(why: string): void;
  /** The realm's roll for a cast's mythic (server fishRoll). */
  fishRoll?(n: number, pick: string | null): void;
  /** Server messages for the log ("X has entered the world", chat lines). */
  system(text: string): void;
  /** A chat line; id is the speaker (yours too: it's echoed), kind 'emote' is "<from> waves." */
  chat(from: string, text: string, id?: number, kind?: ChatKind): void;
  /** Friends: who's in the world (and where), and word as one comes or goes. */
  friendStatus?(online: { name: string; x: number; z: number }[]): void;
  friendOn?(name: string): void;
  friendOff?(name: string): void;
  guild?(v: GuildView): void;
  /** The guild vault (at a bank counter): its state; goods or coin it turned down; goods or coin it let out. */
  guildVault?(v: GuildVaultView | null): void;
  guildRefund?(item: string | null, n: number, why: string): void;
  guildWithdrawn?(item: string | null, n: number): void;
  guildInvited?(from: string, guild: string): void;
  /** A groupmate's heal or ward on you (a Mender's). */
  aid?(from: string, heal: number, ward: number, secs: number): void;
  /** A groupmate's tavern table (game/TavernTable.ts). */
  table?(from: number, name: string, data: unknown): void;
  /** Guild halls: the realm's book of them; your guild's; goods or coin a project didn't need. */
  halls?(list: HallsBook): void;
  hall?(v: HallView | null): void;
  hallRefund?(item: string | null, n: number, why: string): void;
  /** Groups and trades (game/Social.ts). */
  group?(v: GroupView): void;
  /** Your group's plot on the public fields (server/plots.mjs): its tiles, or null when you're in no group. */
  groupPlot?(owner: string | null, tiles: Record<string, unknown> | null): void;
  groupInvited?(from: string): void;
  tradeAsked?(from: string): void;
  /** The Pledge: someone at an altar asks you; you and another have taken it; someone has parted from you. */
  pledgeAsked?(from: string): void;
  pledged?(withName: string): void;
  parted?(from: string): void;
  /** A creature someone else killed, and how long (ms) until it's back; the whole list on joining. */
  mobDead?(key: string, leftMs: number): void;
  mobLedger?(list: [string, number][]): void;
  /** The world boss you're on the list for (the Group Finder), or null. */
  wbSeek?(boss: string | null): void;
  /** The open world's board (server/social.mjs). */
  lfg?(list: LfgNotice[]): void;
  /** Another player's blows on the creature at a spawn point, as a share of its health (game/SharedMobs.ts). */
  mobHit?(key: string, share: number, from: number): void;
  /** Home visits: someone asks to see your home; a host's layout arrives for you to see. */
  homeAsked?(from: string): void;
  homeShow?(owner: string, pieces: unknown[], plot: unknown): void;
  /** Ships at sea (game/Sailing.ts, server/naval.mjs): another captain's ship (null: gone), a ball that struck yours, a ship you sank. */
  shipState?(name: string, st: unknown): void;
  shipHurt?(from: string, dmg: number): void;
  shipKill?(name: string): void;
  /** The realm's book of homes (server/homes.mjs): all of it on coming in, then each change, and the answer to a claim. */
  homes?(list: Record<string, HomeHeld>, mine: string | null, lapsed: string | null, mineAll?: string[]): void;
  home?(id: string, home: HomeHeld | null): void;
  homeClaimed?(id: string, ok: boolean, why: string, owner: string): void;
  /** Homes sold between players: an offer to you, the answer to yours, your purchase, your sale. */
  homeOffered?(id: string, from: string, price: number): void;
  homeOfferAns?(ok: boolean, why: string, to: string): void;
  homeBought?(id: string, ok: boolean, price: number, from: string, why: string): void;
  homeSold?(id: string, price: number, to: string): void;
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
  exBook?(rows: ExRow[], mine: number[], shop: string | null, wants: ExRow[], myWants: number[]): void;
  exWanted?(row: ExRow): void;
  exWantRefused?(price: number, why: string): void;
  exFilled?(row: ExRow, marks: number): void;
  exFillGone?(id: number, item: string, n: number, own: boolean): void;
  exUnwanted?(row: ExRow, marks: number): void;
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
  dStart?(run: number, dungeon: string, members: { id: number; name: string; role: string }[], missing: string[], state: RunState | null): void;
  /** A run you dropped out of is still going: go back in? */
  dResume?(run: number, dungeon: string): void;
  /** A member back in the run (after dropping out), or in late, under a new id. */
  dBack?(id: number, name: string, role: string): void;
  dEv?(from: number, k: 'hit' | 'kill' | 'room', i: number, dmg: number): void;
  dLeft?(name: string, back: boolean): void;
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
      case 'comp': { const r = this.remotes.get(m.id as number); if (r) this.setRemoteComp(r, (m.comp as CompPub | null) ?? null); break; }
      case 'snap':
        for (const [id, x, y, z, yaw, anim, held, mount, pillion, light] of m.p as [number, number, number, number, number, AnimState, HeldItem, string | 0 | undefined, number | undefined, number | undefined][]) {
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
          r.light = light === 1 || light === 2 ? light : 0;
        }
        break;
      case 'chat': this.hooks.chat(String(m.from), String(m.text), typeof m.id === 'number' ? m.id : undefined, (['emote', 'local', 'trade', 'group', 'guild', 'whisper', 'whisperTo'] as const).find((k) => k === m.kind) ?? 'say'); break;
      case 'fStatus': this.hooks.friendStatus?.(Array.isArray(m.online) ? (m.online as { name: string; x: number; z: number }[]) : []); break;
      case 'fOn': this.hooks.friendOn?.(String(m.name)); break;
      case 'fAt': if ([m.x, m.y, m.z].every((v) => Number.isFinite(Number(v)))) this.hooks.friendAt?.(String(m.name), Number(m.x), Number(m.y), Number(m.z)); break;
      case 'fOff': this.hooks.friendOff?.(String(m.name)); break;
      case 'uVault': this.hooks.guildVault?.(typeof m.guild === 'string' ? (m as unknown as GuildVaultView) : null); break;
      case 'uRefund': this.hooks.guildRefund?.(typeof m.item === 'string' ? m.item : null, Number(m.n) || 0, String(m.why ?? '')); break;
      case 'uWithdrawn': this.hooks.guildWithdrawn?.(typeof m.item === 'string' ? m.item : null, Number(m.n) || 0); break;
      case 'guild': this.hooks.guild?.({ name: null, motto: '', rank: null, founded: 0, members: [], ...(m as object) } as GuildView); break;
      case 'tbl': this.hooks.table?.(Number(m.from), String(m.name ?? ''), m.data); break;
      case 'gAid': this.hooks.aid?.(String(m.from ?? ''), Number(m.heal) || 0, Number(m.ward) || 0, Number(m.secs) || 0); break;
      case 'halls': this.hooks.halls?.(m.list && typeof m.list === 'object' ? (m.list as HallsBook) : {}); break;
      case 'uHall': this.hooks.hall?.(typeof m.guild === 'string' ? (m as unknown as HallView) : null); break;
      case 'uHallRefund': this.hooks.hallRefund?.(typeof m.item === 'string' ? m.item : null, Number(m.n) || 0, String(m.why ?? '')); break;
      case 'uInvited': this.hooks.guildInvited?.(String(m.from), String(m.guild)); break;
      case 'gtag': { const r = this.remotes.get(m.id as number); if (r) r.guild = typeof m.guild === 'string' ? m.guild : null; break; }
      case 'group': this.hooks.group?.(m as unknown as GroupView); this.emit({ t: 'gpGet' }); break;
      case 'gplot': this.hooks.groupPlot?.(typeof m.owner === 'string' ? m.owner : null, m.tiles && typeof m.tiles === 'object' ? (m.tiles as Record<string, unknown>) : null); break;
      case 'gInvited': this.hooks.groupInvited?.(String(m.from)); break;
      case 'wbSeek': this.hooks.wbSeek?.(typeof m.boss === 'string' ? m.boss : null); break;
      case 'lfg': if (Array.isArray(m.list)) this.hooks.lfg?.(m.list as LfgNotice[]); break;
      case 'mobDead': if (typeof m.key === 'string' && typeof m.left === 'number') this.hooks.mobDead?.(m.key, m.left); break;
      case 'mHit': if (typeof m.key === 'string' && typeof m.share === 'number' && typeof m.from === 'number') this.hooks.mobHit?.(m.key, m.share, m.from); break;
      case 'tAsked': this.hooks.tradeAsked?.(String(m.from)); break;
      case 'plAsked': this.hooks.pledgeAsked?.(String(m.from)); break;
      case 'pledged': this.hooks.pledged?.(String(m.with)); break;
      case 'parted': this.hooks.parted?.(String(m.from)); break;
      case 'hAsked': this.hooks.homeAsked?.(String(m.from)); break;
      case 'hShow': this.hooks.homeShow?.(String(m.owner), Array.isArray(m.pieces) ? m.pieces : [], m.plot ?? null); break;
      case 'shS': this.hooks.shipState?.(String(m.name), m.st ?? null); break;
      case 'shHurt': this.hooks.shipHurt?.(String(m.from), Math.max(0, Math.min(200, Number(m.dmg) || 0))); break;
      case 'shKill': this.hooks.shipKill?.(String(m.name)); break;
      case 'homes': this.hooks.homes?.((m.list ?? {}) as Record<string, HomeHeld>, typeof m.mine === 'string' ? m.mine : null, typeof m.lapsed === 'string' ? m.lapsed : null, Array.isArray(m.mineAll) ? (m.mineAll as unknown[]).filter((x): x is string => typeof x === 'string') : undefined); break;
      case 'home': if (typeof m.id === 'string') this.hooks.home?.(m.id, (m.home ?? null) as HomeHeld | null); break;
      case 'hClaimed': if (typeof m.id === 'string') this.hooks.homeClaimed?.(m.id, !!m.ok, String(m.why ?? ''), String(m.owner ?? '')); break;
      case 'hOffered': if (typeof m.id === 'string') this.hooks.homeOffered?.(m.id, String(m.from ?? ''), Math.max(0, Number(m.price) || 0)); break;
      case 'hOfferAns': this.hooks.homeOfferAns?.(!!m.ok, String(m.why ?? ''), String(m.to ?? '')); break;
      case 'hBought': if (typeof m.id === 'string') this.hooks.homeBought?.(m.id, !!m.ok, Math.max(0, Number(m.price) || 0), String(m.from ?? ''), String(m.why ?? '')); break;
      case 'hSold': if (typeof m.id === 'string') this.hooks.homeSold?.(m.id, Math.max(0, Number(m.price) || 0), String(m.to ?? '')); break;
      case 'trade': this.hooks.trade?.(m as unknown as TradeView); break;
      case 'tradeEnd': this.hooks.tradeEnd?.(String(m.why ?? '')); break;
      case 'tradeDone': this.hooks.tradeDone?.(String(m.with), m.give as TradeOffer, m.take as TradeOffer); break;
      case 'sys': this.hooks.system(String(m.text)); break;
      case 'revived': this.hooks.revived?.(String(m.by)); break;
      case 'pvpInvite': case 'pvpNo': case 'pvpStart': case 'pvpHurt': case 'pvpBoard': case 'pvpEnd': this.hooks.pvp?.(m); break;
      case 'gKill': if (typeof m.type === 'string') this.hooks.groupKill?.(m.type, String(m.from)); break;
      case 'gRoom': if (typeof m.site === 'string') this.hooks.groupRoom?.(m.site, Number(m.i), Number(m.s)); break;
      case 'posts': this.hooks.posts?.(Array.isArray(m.list) ? (m.list as Post[]) : []); break;
      case 'post': if (m.post) this.hooks.post?.(m.post as Post); break;
      case 'postGone': this.hooks.postGone?.(Number(m.id)); break;
      case 'postUp': this.hooks.postUp?.(Number(m.id), Number(m.up) || 0, Number(m.until) || undefined); break;
      case 'postTime': this.hooks.postTime?.(Number(m.id), Number(m.until) || 0); break;
      case 'postNo': this.hooks.postNo?.(String(m.why ?? '')); break;
      case 'fishRoll': this.hooks.fishRoll?.(Number(m.n), typeof m.pick === 'string' ? m.pick : null); break;
      case 'perform': this.hooks.perform?.(Number(m.id), { tune: String(m.tune), part: m.part as PartId, voice: m.voice as Voice, start: Number(m.start), reps: Number(m.reps) }); break;
      case 'perfStop': this.hooks.performStop?.(Number(m.id)); break;
      case 'note': this.hooks.note?.(Number(m.id), Number(m.m), m.voice as Voice); break;
      case 'bandPart': this.hooks.bandPart?.(Number(m.id), m.part as PartId, m.voice as Voice); break;
      case 'bandGo': this.hooks.bandGo?.(Number(m.from), String(m.name), String(m.tune), Number(m.start), Number(m.reps)); break;
      case 'exBook': this.hooks.exBook?.(Array.isArray(m.rows) ? (m.rows as ExRow[]) : [], Array.isArray(m.mine) ? (m.mine as number[]) : [], typeof m.shop === 'string' ? m.shop : null, Array.isArray(m.wants) ? (m.wants as ExRow[]) : [], Array.isArray(m.myWants) ? (m.myWants as number[]) : []); break;
      case 'exWanted': this.hooks.exWanted?.(m.row as ExRow); break;
      case 'exWantRefused': this.hooks.exWantRefused?.(Number(m.price) || 0, String(m.why ?? '')); break;
      case 'exFilled': this.hooks.exFilled?.(m.row as ExRow, Number(m.marks) || 0); break;
      case 'exFillGone': this.hooks.exFillGone?.(Number(m.id), String(m.item), Number(m.n) || 0, !!m.own); break;
      case 'exUnwanted': this.hooks.exUnwanted?.(m.row as ExRow, Number(m.marks) || 0); break;
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
      case 'dStart': this.hooks.dStart?.(Number(m.run), String(m.dungeon), Array.isArray(m.members) ? (m.members as { id: number; name: string; role: string }[]) : [], Array.isArray(m.missing) ? (m.missing as unknown[]).map(String) : [], runState(m.state)); break;
      case 'dResume': this.hooks.dResume?.(Number(m.run), String(m.dungeon)); break;
      case 'dBack': this.hooks.dBack?.(Number(m.id), String(m.name), String(m.role)); break;
      case 'dEv': if (m.k === 'hit' || m.k === 'kill' || m.k === 'room') this.hooks.dEv?.(Number(m.from), m.k, Number(m.i), Number(m.dmg) || 0); break;
      case 'dLeft': this.hooks.dLeft?.(String(m.name), !!m.back); break;
      case 'uGrant': this.hooks.uGrant?.(String(m.id), !!m.ok, Number(m.n) || 0, Number(m.cap) || 0, String(m.first ?? ''), !!m.gone); break;
      case 'uLedger': if (m.ledger && typeof m.ledger === 'object') this.hooks.uLedger?.(m.ledger as Record<string, { cap: number; found: { n: number; name: string }[] }>); break;
    }
  }

  private addRemote(p: PlayerPub): void {
    this.removeRemote(p.id);
    const model = new Humanoid(p.look);
    model.setPack(p.look?.pack ?? 0);
    const pos = new THREE.Vector3(p.x, p.y, p.z);
    model.root.position.copy(pos);
    this.hooks.scene.add(model.root);
    const mount = p.mount && mountOf(p.mount) ? p.mount : null;
    this.remotes.set(p.id, { id: p.id, name: p.name, model, from: pos.clone(), to: pos.clone(), t: 1, yaw: p.yaw, anim: p.anim, held: p.held, speed: 0, mount, horse: null, horseOf: null, guild: p.guild ?? null, pillion: p.pillion ?? 0, light: p.light ?? 0, pet: this.petFor(p.look, pos) });
    if (p.perf) this.hooks.perform?.(p.id, p.perf);
    if (p.comp) this.setRemoteComp(this.remotes.get(p.id)!, p.comp);
  }

  /** Someone's companion came out, changed, or went home. */
  private setRemoteComp(r: Remote, c: CompPub | null): void {
    if (r.comp) { this.hooks.scene.remove(r.comp.model.root); if (r.comp.steed) this.hooks.scene.remove(r.comp.steed.root); }
    if (!c) { r.comp = null; return; }
    const model = new Humanoid(c.look);
    model.setHeld(c.held);
    const pos = r.model.root.position.clone().add(new THREE.Vector3(-1.2, 0, -1.6));
    model.root.position.copy(pos);
    this.hooks.scene.add(model.root);
    r.comp = { model, steedLook: c.steed, steed: null, pos, yaw: r.yaw };
  }

  /** The keeper gives a home to a character (server/homes.mjs grant). */
  grantHome(to: string, id: string): void { this.emit({ t: 'hGrant', to, id }); }
  /** Tell everyone about the companion out with you (null: none). */
  setComp(c: CompPub | null): void { this.emit({ t: 'comp', comp: c }); }

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
    r.model.setPack(look.pack ?? 0);
    r.model.root.position.copy(pos);
    this.hooks.scene.add(r.model.root);
  }

  private removeRemote(id: number): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.hooks.scene.remove(r.model.root);
    if (r.horse) this.hooks.scene.remove(r.horse.root);
    if (r.boat) this.hooks.scene.remove(r.boat);
    if (r.float) this.hooks.scene.remove(r.float);
    if (r.pet) this.hooks.scene.remove(r.pet.model.root);
    if (r.comp) { this.hooks.scene.remove(r.comp.model.root); if (r.comp.steed) this.hooks.scene.remove(r.comp.steed.root); }
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
    // (you count as riding with them from the moment you climb up, before the next update tells this side so:
    // without it, the first look for your seat found none and set you straight back down beside the horse)
    const list = this.passengers(riderId);
    if (who === this.myId && !list.includes(who)) { list.push(who); list.sort((a, b) => a - b); }
    return passengerSeat(mountOf(mount), list.indexOf(who), at.x, at.y, at.z, at.yaw);
  }
  /** Everyone riding with a rider, by id. */
  passengers(riderId: number): number[] {
    const ids = [...this.remotes.values()].filter((o) => o.pillion === riderId).map((o) => o.id);
    if (this.myPillion === riderId) ids.push(this.myId);
    return ids.sort((a, b) => a - b);
  }
  private myPillion: number | null = null;

  update(dt: number, me: { x: number; y: number; z: number; yaw: number; anim: AnimState; held: HeldItem | string; mount?: string | null; pillion?: number | null; light?: number }): void {
    this.myPillion = me.pillion ?? null;
    if (this.status !== 'online' || !this.ws) return;
    this.sendT -= dt * 1000;
    if (this.sendT <= 0) {
      this.sendT = SEND_MS;
      this.ws.send(JSON.stringify({ t: 'state', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), anim: me.anim, held: me.held, mount: me.mount ?? null, pillion: me.pillion ?? 0, light: me.light ?? 0 }));
    }
    for (const r of this.remotes.values()) {
      r.t = Math.min(1, r.t + dt / 0.1);
      r.model.root.position.lerpVectors(r.from, r.to, r.t);
      // A rider: their horse underfoot, and them in the saddle
      if (r.mount !== r.horseOf) {
        if (r.horse) this.hooks.scene.remove(r.horse.root);
        const m = r.mount === 'boat_row' ? null : mountOf(r.mount);
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
        if (r.mount === POST_CART_KEY) {
          // On the Post: the carter on the box, and them on the back bench
          const st = passengerSeat(POST_CART, POST_RIDER_SEAT, r.horse.root.position.x, r.horse.root.position.y, r.horse.root.position.z, r.horse.root.rotation.y)!;
          r.model.root.position.set(st.x, st.y + st.lift, st.z);
          r.anim = 'seated'; r.held = 'none';
          if (!r.carter) { r.carter = new Humanoid(CARTER); this.hooks.scene.add(r.carter.root); }
          r.carter.root.position.copy(r.horse.root.position).setY(r.horse.root.position.y + riderLift(POST_CART));
          r.carter.root.rotation.y = r.horse.root.rotation.y;
          r.carter.setState('seated');
          r.carter.update(dt, 0);
        } else r.model.root.position.y += liftOf(r.mount);
      }
      // Rowing: their boat under them on the water, where everyone can see her (and stand in her)
      if (r.mount === 'boat_row' && this.hooks.rowboatModel) {
        if (!r.boat) { r.boat = this.hooks.rowboatModel(); this.hooks.scene.add(r.boat); r.boatPrev = null; }
        else r.boatPrev = { x: r.boat.position.x, y: r.boat.position.y, z: r.boat.position.z, yaw: r.boat.rotation.y };
        const p = r.model.root.position;
        boatUnderSeat(p.x, p.y, p.z, r.yaw, r.boat.position);
        r.boat.rotation.y = r.yaw;
        r.anim = 'seated'; r.held = 'none';
      } else if (r.boat) { this.hooks.scene.remove(r.boat); r.boat = null; r.boatPrev = null; }
      if (r.carter && r.mount !== POST_CART_KEY) { this.hooks.scene.remove(r.carter.root); r.carter = undefined; }
      // Riding behind someone: in the second seat of their mount, wherever we see it
      const seat = r.pillion ? this.seatOf(r.pillion, r.id) : null;
      if (seat) { r.model.root.position.set(seat.x, seat.y + seat.lift, seat.z); r.model.root.rotation.y = seat.yaw; r.yaw = seat.yaw; r.anim = seat.pose; r.held = 'none'; }
      // Fishing: a float out on the water ahead of them, and the line to it from the rod's tip
      if (r.anim === 'fishWait' || r.anim === 'fishCast') {
        if (!r.float) r.float = fishFloat(), this.hooks.scene.add(r.float);
        const p = r.model.root.position, yaw = r.model.root.rotation.y, out = r.anim === 'fishCast' ? 2 : 4.2;
        const fx = p.x + Math.sin(yaw) * out, fz = p.z + Math.cos(yaw) * out, fy = p.y - 0.75 + Math.sin(performance.now() * 0.003 + r.id) * 0.03;
        const bob = r.float.children[0], line = r.float.children[1] as THREE.Line;
        bob.position.set(fx, fy, fz);
        const pos = line.geometry.attributes.position as THREE.BufferAttribute, tipX = p.x + Math.sin(yaw) * 1.3, tipZ = p.z + Math.cos(yaw) * 1.3, tipY = p.y + 2.1;
        for (let i = 0; i < 8; i++) { const t = i / 7; pos.setXYZ(i, tipX + (fx - tipX) * t, tipY + (fy - tipY) * t - Math.sin(t * Math.PI) * 0.5, tipZ + (fz - tipZ) * t); }
        pos.needsUpdate = true;
      } else if (r.float) { this.hooks.scene.remove(r.float); r.float = null; }
      // Their light: a torch in the hand (not while riding behind someone or rowing), or the lantern at the belt
      r.model.setTorch(r.light === 1);
      r.model.setLantern(r.light === 2);
      r.pet?.update(dt, r.model.root.position, r.model.root.rotation.y);
      if (r.comp) this.followComp(r, dt);
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

  /**
   * Someone's companion, following them as yours follows you: a little behind and to the side, walking when they
   * walk, on its own horse beside theirs when they ride.
   */
  private followComp(r: Remote, dt: number): void {
    const c = r.comp!, o = r.model.root.position, yaw = r.model.root.rotation.y;
    const riding = !!r.horse, back = riding ? 1.2 : 2.0, side = riding ? 2.6 : 1.3;
    const tx = o.x - Math.sin(yaw) * back + Math.cos(yaw) * side, tz = o.z - Math.cos(yaw) * back - Math.sin(yaw) * side;
    const dx = tx - c.pos.x, dz = tz - c.pos.z, d = Math.hypot(dx, dz);
    // (too far behind, as after a ride or a jump: they're simply there)
    if (d > 30) c.pos.set(tx, o.y, tz);
    const speed = d > 0.3 ? Math.min(d * 2.2, riding ? 16 : 7) : 0;
    if (d > 0.3) { c.pos.x += (dx / d) * speed * dt; c.pos.z += (dz / d) * speed * dt; c.yaw = Math.atan2(dx, dz); } else c.yaw = yaw;
    c.pos.y = this.hooks.ground ? this.hooks.ground(c.pos.x, c.pos.z, o.y) : o.y;
    if (riding && c.steedLook) {
      if (!c.steed) { c.steed = mountModel(c.steedLook); this.hooks.scene.add(c.steed.root); }
      c.steed.root.position.copy(c.pos);
      c.steed.root.rotation.y = c.yaw;
      c.steed.setAnim(speed > 8 ? 'run' : speed > 0.4 ? 'walk' : 'idle');
      c.steed.update(dt, speed);
      c.model.root.position.copy(c.pos).setY(c.pos.y + riderLift(c.steedLook));
      c.model.setState('ride');
      c.model.straddle = c.steed.girth ?? 0.38;
    } else {
      if (c.steed) { this.hooks.scene.remove(c.steed.root); c.steed = null; }
      c.model.root.position.copy(c.pos);
      c.model.setState(speed > 4.5 ? 'run' : speed > 0.3 ? 'walk' : 'idle');
    }
    let dy = c.yaw - c.model.root.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    c.model.root.rotation.y += dy * Math.min(1, dt * 10);
    if (c.steed) c.steed.root.rotation.y = c.model.root.rotation.y;
    c.model.update(dt, speed, false);
  }

  get online(): boolean { return this.status === 'online' && !!this.ws; }

  /** Help someone who's down back to their feet (the server checks they're down and you're beside them). */
  revive(id: number): void { if (this.online) this.ws!.send(JSON.stringify({ t: 'revive', id })); }
  /** Tell your group about a kill, for their quests. */
  fishRoll(n: number, water: string): void { this.emit({ t: 'fishRoll', n, water }); }
  /** Ask to travel to a friend (or a group member): the realm answers with where they are, or why not. */
  goToFriend(name: string): void { this.emit({ t: 'fGo', name }); }
  putPost(text: string, x: number, y: number, z: number, yaw: number): void { this.emit({ t: 'postPut', text, x, y, z, yaw }); }
  upPost(id: number): void { this.emit({ t: 'postUp', id }); }
  mendPost(id: number): void { this.emit({ t: 'postMend', id }); }
  reportPost(id: number, why: string): void { this.emit({ t: 'postReport', id, why }); }
  removePost(id: number): void { this.emit({ t: 'postRemove', id }); }
  reviewPosts(restore?: number): void { this.emit({ t: 'postReview', restore }); }
  groupRoom(site: string, i: number, s: number): void { if (this.online) this.ws!.send(JSON.stringify({ t: 'gRoom', site, i, s })); }
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

  /** To the Arena (server/arena.mjs). */
  pvp(msg: { t: string } & Record<string, unknown>): void { this.emit(msg); }
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
  pledgeAsk(name: string): void { this.emit({ t: 'plAsk', name }); }
  pledgeAnswer(name: string, accept: boolean): void { this.emit({ t: 'plAnswer', name, accept }); }
  pledgePart(name: string): void { this.emit({ t: 'plPart', name }); }
  /** Tell the realm a creature at this spawn point died; it's gone for everyone for `secs`. */
  mobDead(key: string, secs: number): void { this.emit({ t: 'mobDead', key, secs }); }
  /** Look for a group for a world boss, or stop looking. */
  wbLook(boss: string, name: string): void { this.emit({ t: 'wbLook', boss, name }); }
  wbStop(): void { this.emit({ t: 'wbStop' }); }
  lfgList(): void { this.emit({ t: 'lfgList' }); }
  guildMission(kind: string, n: number): void { this.emit({ t: 'uMission', kind, n }); }
  lfgPost(kind: string, label: string, region: string): void { this.emit({ t: 'lfgPost', kind, label, region }); }
  lfgStop(): void { this.emit({ t: 'lfgStop' }); }
  lfgJoin(id: number): void { this.emit({ t: 'lfgJoin', id }); }
  /** A share of a creature's health you took off: the realm passes it to the players near you. */
  mobHit(key: string, share: number): void { this.emit({ t: 'mHit', key, share: Math.round(share * 1e4) / 1e4 }); }
  homeAsk(name: string): void { this.emit({ t: 'hAsk', name }); }
  /** A report about a player, for the realm's keeper (server: data/reports.json). */
  report(name: string, reason: string): void { this.emit({ t: 'report', name, reason }); }
  /** The latest reports (the keeper's accounts only). */
  reportsList(): void { this.emit({ t: 'reports' }); }
  homeShow(name: string, accept: boolean, pieces: unknown[] | null, plot: unknown = null): void { this.emit({ t: 'hShow', name, accept, pieces, plot }); }
  /** Dice rolled by the realm (server/social.mjs), heard by everyone near and by the group. */
  roll(max: number): void { this.emit({ t: 'roll', max }); }
  shipState(st: object | null): void { this.emit({ t: 'shS', st }); }
  shipHit(name: string, dmg: number): void { this.emit({ t: 'shHit', name, dmg }); }
  shipSunk(by: string | null): void { this.emit({ t: 'shSunk', by }); }
  /** The book of homes: lease one (spec: plans it's already built to), give it up, build or rebuild, lay blocks by hand. */
  homeClaim(id: string, spec?: unknown, blocks?: unknown): void { this.emit({ t: 'hClaim', id, spec, blocks }); }
  homeRelease(id: string): void { this.emit({ t: 'hRelease', id }); }
  groupPlotGet(): void { this.emit({ t: 'gpGet' }); }
  groupPlotSet(k: string, tile: unknown): void { this.emit({ t: 'gpSet', k, tile }); }
  homeOffer(id: string, to: string, price: number): void { this.emit({ t: 'hOffer', id, to, price }); }
  homeAccept(id: string): void { this.emit({ t: 'hAccept', id }); }
  homeDecline(id: string): void { this.emit({ t: 'hDecline', id }); }
  homeSpec(id: string, spec: unknown): void { this.emit({ t: 'hSpec', id, spec }); }
  homeBlocks(id: string, blocks: unknown): void { this.emit({ t: 'hBlocks', id, blocks }); }
  homeStall(id: string, open: boolean): void { this.emit({ t: 'hStall', id, open }); }
  tradeAnswer(name: string, accept: boolean): void { this.emit({ t: 'tAnswer', name, accept }); }
  tradeOffer(items: { id: string; n: number }[], marks: number): void { this.emit({ t: 'tOffer', items, marks }); }
  tradeLock(on: boolean): void { this.emit({ t: 'tLock', on }); }
  tradeAccept(): void { this.emit({ t: 'tAccept' }); }
  tradeCancel(): void { this.emit({ t: 'tCancel' }); }
  guildCreate(name: string, motto: string): void { this.emit({ t: 'uCreate', name, motto }); }
  /** The guild vault: ask for it, pay goods or coin in (item null: marks), take them out. */
  guildVaultGet(): void { this.emit({ t: 'uVaultGet' }); }
  guildDeposit(item: string | null, n: number): void { this.emit({ t: 'uDeposit', item, n }); }
  guildWithdraw(item: string | null, n: number): void { this.emit({ t: 'uWithdraw', item, n }); }
  guildInvite(name: string): void { this.emit({ t: 'uInvite', name }); }
  guildAnswer(accept: boolean): void { this.emit({ t: 'uAnswer', accept }); }
  guildLeave(): void { this.emit({ t: 'uLeave' }); }
  guildKick(name: string): void { this.emit({ t: 'uKick', name }); }
  guildRank(name: string, rank: GuildRank): void { this.emit({ t: 'uRank', name, rank }); }
  guildMotto(text: string): void { this.emit({ t: 'uMotto', text }); }
  guildChat(text: string): void { this.emit({ t: 'uChat', text }); }
  /** Guild halls: ask after yours, lease one, choose the next wing, give toward it (from the pack, or an officer's from the vault), a beast for the roll, give it up. */
  hallGet(): void { this.emit({ t: 'uHallGet' }); }
  /** A heal or a ward for a groupmate (by their id). */
  /** A word to a groupmate's tavern table (or all of them, to null). */
  table(to: number | null, data: unknown): void { this.emit({ t: 'tbl', to, data }); }
  aid(to: number, heal: number, ward: number, secs: number): void { this.emit({ t: 'gAid', to, heal: Math.round(heal), ward: Math.round(ward), secs }); }
  hallLease(id: string): void { this.emit({ t: 'uHallLease', id }); }
  hallPick(project: string): void { this.emit({ t: 'uHallPick', project }); }
  hallGive(item: string | null, n: number, vault = false): void { this.emit({ t: 'uHallGive', item, n, vault }); }
  hallHonour(name: string): void { this.emit({ t: 'uHonour', name }); }
  hallLeave(): void { this.emit({ t: 'uHallLeave' }); }
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
  dEv(run: number, k: 'hit' | 'kill' | 'room', i: number, dmg: number): void { this.emit({ t: 'dEv', run, k, i, dmg }); }
  /** Back into a run (the one you dropped out of), or into your group's, late. */
  dRejoin(run?: number, role?: string): void { this.emit({ t: 'dRejoin', run, role }); }
  dLeave(run: number): void { this.emit({ t: 'dLeave', run }); }
  exPost(item: string, n: number, price: number, shop?: string): void { this.emit({ t: 'exPost', item, n, price, shop }); }
  /** Orders: ask for goods at a price (the marks held in the book), fill someone's, or withdraw your own. */
  exWant(item: string, n: number, price: number): void { this.emit({ t: 'exWant', item, n, price }); }
  exFill(id: number, item: string, n: number): void { this.emit({ t: 'exFill', id, item, n }); }
  exUnwant(id: number): void { this.emit({ t: 'exUnwant', id }); }
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

  private chatQueue: { text: string; kind: 'say' | 'emote' | 'local' | 'trade' }[] = [];
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

  chat(text: string, kind: 'say' | 'emote' | 'local' | 'trade' = 'say'): void {
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
