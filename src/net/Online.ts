import * as THREE from 'three';

/** What a chat line is: said aloud, an emote, to the group or guild, or a whisper (received, or sent). */
export type ChatKind = 'say' | 'emote' | 'group' | 'guild' | 'whisper' | 'whisperTo';
import { setRealmTime } from '../world/clock';
import { Appearance, AnimState, HeldItem, Humanoid } from '../entities/humanoid';
import type { SaveData } from '../game/state';
import { CreatureModel } from '../entities/creatures';
import { ITEMS } from '../data/items';
import { currentAccount } from './Account';

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
}

interface PlayerPub { id: number; name: string; look: Appearance; x: number; y: number; z: number; yaw: number; anim: AnimState; held: HeldItem; mount?: string | null; guild?: string | null }

const SEAT = 1.08;

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
export interface GroupView { id: number; leader: number; members: { id: number; name: string; hp: number; max: number; level: number; calling: string; x: number; z: number }[] }
export interface TradeView { id: number; with: string; mine: TradeOffer; theirs: TradeOffer; myLock: boolean; theirLock: boolean; myAccept: boolean; theirAccept: boolean }

export type GuildRank = 'leader' | 'officer' | 'member';
export interface GuildView { name: string | null; motto: string; rank: GuildRank | null; founded: number; members: { name: string; rank: GuildRank; online: boolean; seen: number }[] }

export interface OnlineHooks {
  scene: THREE.Scene;
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
  /** A townsperson's answer in open talk (server/npc.mjs). Words only: the game reads nothing in it. */
  npcLine?(npc: string, text: string, ok: boolean): void;
  /** Home visits: someone asks to see your home; a host's layout arrives for you to see. */
  homeAsked?(from: string): void;
  homeShow?(owner: string, pieces: unknown[], plot: unknown): void;
  trade?(v: TradeView): void;
  tradeEnd?(why: string): void;
  tradeDone?(withName: string, give: TradeOffer, take: TradeOffer): void;
  status(s: OnlineStatus, players: number): void;
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
}

export class Online {
  status: OnlineStatus = 'off';
  readonly remotes = new Map<number, Remote>();
  /** Townsfolk the server can voice in open talk (empty when that's off). */
  aiNpcs: string[] = [];
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
      this.aiNpcs = [];
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

  disconnect(): void {
    window.clearTimeout(this.retryTimer);
    this.me = null;
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    this.aiNpcs = [];
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
        this.aiNpcs = Array.isArray(m.npcAi) ? (m.npcAi as unknown[]).map(String) : [];
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
        for (const [id, x, y, z, yaw, anim, held, mount] of m.p as [number, number, number, number, number, AnimState, HeldItem, string | 0 | undefined][]) {
          const r = this.remotes.get(id);
          if (!r) continue;
          r.from.copy(r.model.root.position);
          if (r.horse) r.from.y -= SEAT;
          r.mount = typeof mount === 'string' && ITEMS[mount]?.mount ? mount : null;
          r.to.set(x, y, z);
          r.t = 0;
          r.speed = r.from.distanceTo(r.to) / 0.1;
          r.yaw = yaw; r.anim = anim; r.held = held;
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
      case 'npcLine': this.hooks.npcLine?.(String(m.npc ?? ''), typeof m.text === 'string' ? m.text : '', !!m.ok); break;
      case 'mobDead': if (typeof m.key === 'string' && typeof m.left === 'number') this.hooks.mobDead?.(m.key, m.left); break;
      case 'tAsked': this.hooks.tradeAsked?.(String(m.from)); break;
      case 'hAsked': this.hooks.homeAsked?.(String(m.from)); break;
      case 'hShow': this.hooks.homeShow?.(String(m.owner), Array.isArray(m.pieces) ? m.pieces : [], m.plot ?? null); break;
      case 'trade': this.hooks.trade?.(m as unknown as TradeView); break;
      case 'tradeEnd': this.hooks.tradeEnd?.(String(m.why ?? '')); break;
      case 'tradeDone': this.hooks.tradeDone?.(String(m.with), m.give as TradeOffer, m.take as TradeOffer); break;
      case 'sys': this.hooks.system(String(m.text)); break;
      case 'boss': this.hooks.bossState?.(String(m.id), Number(m.cycle), Number(m.hp), Number(m.max)); break;
      case 'ev': this.hooks.eventState?.(String(m.id), Number(m.killed), Number(m.total), Number(m.wave), Number(m.left)); break;
      case 'evDone': this.hooks.eventDone?.(String(m.id), !!m.ok, Number(m.total), (m.shares && typeof m.shares === 'object' ? m.shares : {}) as Record<string, number>); break;
      case 'evCool': this.hooks.eventCool?.(String(m.id), Number(m.left)); break;
      case 'bossDown': this.hooks.bossDown?.(String(m.id), Number(m.cycle), Array.isArray(m.by) ? (m.by as unknown[]).map(String) : []); break;
    }
  }

  private addRemote(p: PlayerPub): void {
    this.removeRemote(p.id);
    const model = new Humanoid(p.look);
    const pos = new THREE.Vector3(p.x, p.y, p.z);
    model.root.position.copy(pos);
    this.hooks.scene.add(model.root);
    const mount = p.mount && ITEMS[p.mount]?.mount ? p.mount : null;
    this.remotes.set(p.id, { id: p.id, name: p.name, model, from: pos.clone(), to: pos.clone(), t: 1, yaw: p.yaw, anim: p.anim, held: p.held, speed: 0, mount, horse: null, horseOf: null, guild: p.guild ?? null });
  }

  private replaceModel(r: Remote, look: Appearance): void {
    const pos = r.model.root.position.clone();
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
    this.remotes.delete(id);
  }

  private clearRemotes(): void {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }

  /** Called every frame while playing: send our state, move everyone else. */
  update(dt: number, me: { x: number; y: number; z: number; yaw: number; anim: AnimState; held: HeldItem; mount?: string | null }): void {
    if (this.status !== 'online' || !this.ws) return;
    this.sendT -= dt * 1000;
    if (this.sendT <= 0) {
      this.sendT = SEND_MS;
      this.ws.send(JSON.stringify({ t: 'state', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2), yaw: +me.yaw.toFixed(3), anim: me.anim, held: me.held, mount: me.mount ?? null }));
    }
    for (const r of this.remotes.values()) {
      r.t = Math.min(1, r.t + dt / 0.1);
      r.model.root.position.lerpVectors(r.from, r.to, r.t);
      // A rider: their horse underfoot, and them in the saddle
      if (r.mount !== r.horseOf) {
        if (r.horse) this.hooks.scene.remove(r.horse.root);
        const m = r.mount ? ITEMS[r.mount].mount! : null;
        r.horse = m ? new CreatureModel('horse', { a: m.coat, b: m.mane, c: m.cloth, glow: m.glow }) : null;
        if (r.horse) this.hooks.scene.add(r.horse.root);
        r.horseOf = r.mount;
      }
      if (r.horse) {
        r.horse.root.position.copy(r.model.root.position);
        r.horse.root.rotation.y = r.model.root.rotation.y;
        const sp = r.t < 1 ? r.speed : 0;
        r.horse.setAnim(sp > 10.5 ? 'run' : sp > 0.4 ? 'walk' : 'idle');
        r.horse.update(dt, sp);
        r.model.root.position.y += SEAT;
      }
      // Turn the short way round.
      let dy = r.yaw - r.model.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      r.model.root.rotation.y += dy * Math.min(1, dt * 12);
      r.model.setState(r.anim);
      r.model.setHeld(r.held);
      r.model.update(dt, r.t < 1 ? r.speed : 0, r.anim === 'jump');
    }
  }

  get online(): boolean { return this.status === 'online' && !!this.ws; }

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
  /** Say something to an AI-voiced townsperson; the answer comes back as npcLine. */
  npcSay(npc: string, text: string): void { this.emit({ t: 'npcSay', npc, text: text.slice(0, 240) }); }
  homeAsk(name: string): void { this.emit({ t: 'hAsk', name }); }
  homeShow(name: string, accept: boolean, pieces: unknown[] | null, plot: unknown = null): void { this.emit({ t: 'hShow', name, accept, pieces, plot }); }
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

  /** Your id on the server (to know your own echoed chat). */
  myId = -1;

  private chatQueue: { text: string; kind: 'say' | 'emote' }[] = [];
  private chatSentAt = 0;
  private chatTimer = 0;

  /** Send a chat line. The server drops lines closer together than 600 ms, so they're paced here instead of lost. */
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
