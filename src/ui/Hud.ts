import './styles.css';
import './theme.css';
import { activeSet, GEAR_SETS, ITEMS, RARITY_COLOR, SkillId } from '../data/items';
import { levelForXp, RECIPES, SHOP_STOCK, SKILLS, Station, STATION_NAMES, UNLOCKS, xpForLevel } from '../data/gameplay';
import { places } from '../data/places';
import { continentChart } from '../world/atlas';
import { WMIN } from '../world/VoxelWorld';
import { POSTS } from '../data/travel';
import type { DailyView } from '../game/Dailies';
import type { FestivalView } from '../game/Festivals';
import type { GroupRow, TradeUi } from '../game/Social';
import type { GuildRank, GuildView } from '../net/Online';

/** Settlements the Charter's chart marks before you've been (the rest of the map waits to be found). */
/** Minimap zoom steps, in CSS pixels per block, and the CSS width they're measured across. */
const MM_ZOOM = [0.55, 0.9, 1.4, 2.1, 3.2];
const MM_SPAN = 176;

function mmHouse(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.fillStyle = '#f1e2bc'; c.strokeStyle = '#1e1208'; c.lineWidth = 2;
  c.fillRect(x - 7, y - 3, 14, 10); c.strokeRect(x - 7, y - 3, 14, 10);
  c.fillStyle = '#a8442e';
  c.beginPath(); c.moveTo(x - 10, y - 3); c.lineTo(x, y - 12); c.lineTo(x + 10, y - 3); c.closePath(); c.fill(); c.stroke();
}

/** A waypoint flag standing at (x, y), scaled by s. */
function mapPin(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#0b1122'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -18); c.stroke();
  c.fillStyle = '#5fc6ff'; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(0, -18); c.lineTo(12, -14); c.lineTo(0, -9); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#0b1122'; c.beginPath(); c.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Colours for activity markers. */
const ACT_COLOR: Record<string, string> = { event: '#ff9a2a', boss: '#e8402e', bossSoon: '#c0786a', shard: '#7fe0f4', task: '#ffd23a', taskDone: '#b8a878' };
const ACT_KINDS = new Set(['event', 'boss', 'bossSoon', 'shard', 'task', 'taskDone']);

/** An activity marker: an event's shield, a world boss's crowned skull, the Shardfall's crystal. */
function actGlyph(c: CanvasRenderingContext2D, kind: string, x: number, y: number, s: number): void {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = ACT_COLOR[kind]; c.strokeStyle = '#1e1208'; c.lineWidth = 1.6;
  if (kind === 'event') {
    c.beginPath(); c.moveTo(0, -7); c.lineTo(6, -4); c.lineTo(5, 3); c.lineTo(0, 7); c.lineTo(-5, 3); c.lineTo(-6, -4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1e1208'; c.fillRect(-0.8, -4, 1.6, 6); c.fillRect(-3, -1.5, 6, 1.4);
  } else if (kind === 'task' || kind === 'taskDone') {
    // A heart: hollow while there's work to do, filled once it's done
    c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-8, 0, -6, -7, 0, -3.2); c.bezierCurveTo(6, -7, 8, 0, 0, 6); c.closePath();
    c.fill(); c.stroke();
    if (kind === 'task') { c.fillStyle = '#1e1208'; c.beginPath(); c.moveTo(0, 2.6); c.bezierCurveTo(-3.6, -0.2, -2.8, -3.4, 0, -1.4); c.bezierCurveTo(2.8, -3.4, 3.6, -0.2, 0, 2.6); c.fill(); }
  } else if (kind === 'shard') {
    c.beginPath(); c.moveTo(0, -8); c.lineTo(4, 0); c.lineTo(0, 8); c.lineTo(-4, 0); c.closePath(); c.fill(); c.stroke();
  } else {
    c.globalAlpha = kind === 'bossSoon' ? 0.75 : 1;
    c.beginPath(); c.arc(0, 0, 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#f4ecd8'; c.beginPath(); c.arc(0, -0.5, 3.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1e1208'; c.fillRect(-2, -1.2, 1.4, 1.4); c.fillRect(0.6, -1.2, 1.4, 1.4);
    c.fillStyle = '#f3d58a'; c.beginPath(); c.moveTo(-5, -5); c.lineTo(-3, -9); c.lineTo(0, -6); c.lineTo(3, -9); c.lineTo(5, -5); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

/** Glyphs for dungeons (a dark gate), delves (a cave mouth) and vistas (a peak); false for others. */
function placeGlyph(c: CanvasRenderingContext2D, id: string, x: number, y: number, s: number): boolean {
  const kind = id.startsWith('pd-') ? 'pd' : id.startsWith('delve-') ? 'delve' : id.startsWith('vista-') ? 'vista' : '';
  if (!kind) return false;
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = '#1e1208'; c.lineWidth = 1.6;
  if (kind === 'vista') {
    c.fillStyle = '#c070d8';
    c.beginPath(); c.moveTo(0, -7); c.lineTo(7, 5); c.lineTo(-7, 5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4ecd8'; c.beginPath(); c.moveTo(0, -7); c.lineTo(2.6, -2.5); c.lineTo(-2.6, -2.5); c.closePath(); c.fill();
  } else {
    c.fillStyle = kind === 'pd' ? '#8a5ad8' : '#9a7048';
    c.beginPath(); c.moveTo(-7, 6); c.lineTo(-7, -1); c.arc(0, -1, 7, Math.PI, 0); c.lineTo(7, 6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1a1020'; c.beginPath(); c.moveTo(-3.5, 6); c.lineTo(-3.5, 0); c.arc(0, 0, 3.5, Math.PI, 0); c.lineTo(3.5, 6); c.closePath(); c.fill();
  }
  c.restore();
  return true;
}

function mmStar(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.fillStyle = '#e8c060'; c.strokeStyle = '#1e1208'; c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.42 : r, a = (i / 8) * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill(); c.stroke();
}

const MAP_TOWNS = new Set(['hollin', 'aldermere', 'cotters', 'waystation', 'woodcamp', 'gullmouth', 'harrowgate', 'coldhearth']);
import type { Appearance } from '../entities/humanoid';
import type { Inventory, SaveData } from '../game/state';
import { abilityIcon, itemIcon, shapeIcon } from './icons';

/**
 * Puts an item's icon in front of its name wherever a message mentions it ("You no longer have
 * 3 Bronze bar."). Longest names first, so "Cooked trout" wins over "trout"; names are matched
 * whole and case-sensitively, so ordinary words in a sentence are left alone.
 */
let itemNameRe: RegExp | null = null;
const itemByName = new Map<string, string>();
function withItemIcons(html: string): string {
  if (!itemNameRe) {
    const names: string[] = [];
    for (const d of Object.values(ITEMS)) if (d.name.length >= 4 && !itemByName.has(esc(d.name))) { itemByName.set(esc(d.name), d.id); names.push(esc(d.name)); }
    names.sort((a, b) => b.length - a.length);
    itemNameRe = new RegExp('(^|[^\\w>])(' + names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w])', 'g');
  }
  return html.replace(itemNameRe, (_m, pre: string, name: string) => `${pre}<img class="ric" src="${itemIcon(itemByName.get(name)!)}" alt="">${name}`);
}

/** The marks coin, for reward lines. */
const COIN_ICON = () => shapeIcon('coin', '#e8c050', '#a87a20');
import { CALLINGS, CallingDef, CallingId, callingById } from '../data/classes';
import { callingCard } from './callingCard';
import { EMOTES } from '../data/emotes';
import { applySkin, drawFace } from './skin';

export interface QuestEntry { id: string; name: string; notes: string; objectives: { text: string; done?: boolean; dist?: number }[]; done: boolean; story?: boolean }
export interface MapMarker { x: number; z: number; kind: 'quest' | 'npc' | 'enemy' | 'elite' | 'poi' | 'player' | 'post' | 'other' | 'event' | 'boss' | 'bossSoon' | 'shard' | 'task' | 'taskDone' | 'waymark' | 'waymarkDim' | 'fair' | 'giver' | 'ally'; label?: string; yaw?: number; id?: string }

/** The tracker for a running event, world boss or Shardfall (see game/Activities.ts). */
export interface EventPanel { kind: 'event' | 'boss' | 'shard' | 'task'; title: string; goal: string; progress: number; count: string; time?: number }
export interface PlateInfo { key: string; x: number; y: number; name: string; sub?: string; kind: 'npc' | 'enemy' | 'elite' | 'player'; hp?: number; mark?: string; targeted?: boolean }
export interface DialogueView { speaker: string; title: string; text: string; narrator: boolean; look?: Appearance; options: { text: string; leave?: boolean }[] }

export interface FeatView { id: string; name: string; group: string; desc: string; have: number; need: number; done: boolean; marks: number; title: string; worn: boolean }

export interface UiCtx {
  save: SaveData;
  inv: Inventory;
  level(s: SkillId): number;
  useSlot(i: number): void;
  daily(): DailyView;
  festival(): FestivalView;
  /** The trade on the table, if any, and what to do with it. */
  trade(): TradeUi | null;
  tradeAdd(id: string): void;
  tradeRemove(i: number): void;
  tradeMarks(n: number): void;
  tradeLock(): void;
  tradeAccept(): void;
  tradeCancel(): void;
  /** The guild panel: your guild (null: none), whether you're online at all, and what you can do. */
  guild(): { view: GuildView | null; online: boolean };
  guildDo(what: 'found' | 'leave' | 'kick' | 'rank' | 'motto', a?: string, b?: string): void;
  /** Friends: the list (with where each online one is), and what to do with one. */
  friends(): { rows: { name: string; online: boolean; where: string | null }[]; online: boolean };
  friendDo(what: 'add' | 'remove' | 'whisper' | 'invite', name: string): void;
  /** The group frame's buttons: leave, or (leading) promote or remove someone. */
  groupDo(what: 'leave' | 'promote' | 'kick' | 'whisper', name?: string): void;
  /** Leading the group (for the frame's menu). */
  groupLeader(): boolean;
  claimLogin(): void;
  feats(): FeatView[];
  calling(): CallingId;
  /** Change calling; returns why it can't be done, or null. */
  setCalling(id: CallingId): string | null;
  /** Wear a feat's title (null for none). */
  wearTitle(id: string | null): void;
  unequip(slot: 'weapon' | 'head'): void;
  dropSlot(i: number): void;
  craft(recipe: string, count: number): void;
  buy(item: string): void;
  sell(slot: number): void;
  quests(): QuestEntry[];
  dialogueChoose(i: number): void;
  settingsChanged(): void;
  sfx(name: 'click' | 'open' | 'close'): void;
  /** Deletes the character being played and goes back to character select. */
  resetSave(): void;
  ability(i: number): void;
  /** Play an emote (from the chat box's menu). */
  emote(id: string): void;
  /** Send what was typed in the chat box (lines and /commands). */
  say(text: string): void;
  /** True on the menus (character select, creator), false in the world. */
  inMenu: boolean;
  mapImage: HTMLCanvasElement;
  mapMarkers(): MapMarker[];
  /** Marks to go to a waymark from here, or null if it can't be reached that way now. */
  waymarkFare(id: string): number | null;
  travelWaymark(id: string): void;
  currentStation: Station | null;
  /** The trader whose panel is open. */
  shop(): ShopView;
  /** The Charter Post stop the player is standing at. */
  travel(): TravelView;
  travelTo(id: string): void;
}

export interface TravelView {
  from: string;
  stops: { id: string; name: string; fare: number; hours: number; known: boolean; here: boolean }[];
}

export interface ShopView {
  name: string;
  /** First name used in price lines, e.g. "Tamsin offers 6 each". */
  who: string;
  stock: { item: string; price: number }[];
  sellPrice(id: string): number;
  footer: string;
  /** Prices in a festival token instead of marks: its name and how many you have. */
  currency?: { id: string; name: string; have: number };
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type PanelId = 'inv' | 'skills' | 'journal' | 'craft' | 'shop' | 'map' | 'settings' | 'read' | 'travel' | 'trade' | 'guild';

export class Hud {
  readonly root = document.getElementById('ui')!;
  private q = <T extends HTMLElement = HTMLElement>(sel: string) => this.root.querySelector(sel) as T;
  private plates = new Map<string, HTMLElement>();
  private platesLayer!: HTMLElement;
  private floaters!: HTMLElement;
  private mm!: HTMLCanvasElement;
  private mmCtx!: CanvasRenderingContext2D;
  /** Minimap zoom step (MM_ZOOM) and whether it turns with the camera; remembered in this browser. */
  private mmZoom = 2;
  private mmRotate = false;
  private eventEl!: HTMLElement;
  private eventKey = '';
  /** Attuned waymarks where they were last drawn on the world map (canvas pixels), for clicks. */
  private wmHits: { x: number; y: number; id: string; name: string }[] = [];
  /** The world map's view (centre, canvas pixels per block, zoom limits), hover point and hidden icon kinds. */
  private mapView = { cx: 1024, cz: 1024, k: 1, kMin: 0.2, kMax: 7, dpr: 1, fresh: true, hover: null as { x: number; y: number } | null, hits: [] as { x: number; y: number; name: string; sub: string }[], hidden: new Set<string>() };
  /** A waypoint the player dropped on the map; it shows on the minimap too. */
  pin: { x: number; z: number } | null = null;
  private portrait!: HTMLCanvasElement;
  open = new Set<PanelId>();
  private selQuest = '';
  private openSkill: SkillId | null = null;
  private shopTab: 'buy' | 'sell' = 'buy';
  private dlgOptions: HTMLButtonElement[] = [];
  private dragFrom = -1;
  dialogueOpen = false;
  private lastBanner = '';

  constructor(private ctx: UiCtx) {
    applySkin();
    setTimeout(() => continentChart(), 3000); // paint the map's chart ahead of the first look
    this.build();
  }

  // ------------------------------------------------------------------ Construction
  private build(): void {
    const r = this.root;
    r.innerHTML = '';
    this.platesLayer = el('div'); this.platesLayer.id = 'plates'; this.platesLayer.className = 'hud-only';
    this.floaters = el('div'); this.floaters.id = 'floaters'; this.floaters.className = 'hud-only';
    r.append(this.platesLayer, this.floaters);

    const pf = el('div', 'unit frame hud-only');
    pf.id = 'player-frame';
    pf.innerHTML = `<div class="portrait"><canvas width="32" height="32"></canvas><div class="lvl">1</div></div>
      <div class="info"><div class="name"><span class="pn">Traveller</span><small class="pt">Hollindale</small></div>
      <div class="bar hp"><i class="lag"></i><i class="fill"></i><b></b></div><div class="bar en"><i></i><b></b></div></div>`;
    r.append(pf);
    this.portrait = pf.querySelector('canvas')!;

    const tf = el('div', 'unit frame hud-only');
    tf.id = 'target-frame';
    tf.innerHTML = `<div class="portrait"><span class="tl">3</span></div><div class="info"><div class="name"><span class="tn"></span><small class="ts"></small></div><div class="bar hp"><i class="fill"></i><b></b></div></div>`;
    r.append(tf);

    const boss = el('div', 'hud-only'); boss.id = 'bossbar';
    boss.innerHTML = '<div class="bb-head"><b class="bb-name"></b><span class="bb-rage">Enraged</span><small class="bb-lvl"></small></div><div class="bb-bar"><i class="bb-fill"></i><i class="bb-mark"></i><span class="bb-num"></span></div>';
    r.append(boss);
    const hurt = el('div', ''); hurt.id = 'hurt'; r.prepend(hurt);
    const evp = el('div', 'event-panel frame hud-only');
    evp.innerHTML = '<div class="ev-kind"></div><div class="ev-title"></div><div class="ev-goal"></div><div class="bar ev"><i></i><b></b></div><div class="ev-time"></div>';
    r.append(evp);
    this.eventEl = evp;
    const mmw = el('div', 'minimap-wrap hud-only');
    mmw.innerHTML = `<div class="zone-label">Hollindale</div><div class="minimap" title="Click to open the map (M)"><canvas width="352" height="352"></canvas><button class="mm-b mm-in" title="Zoom in">+</button><button class="mm-b mm-out" title="Zoom out">−</button><button class="mm-b mm-rot" title="Turn the map with the camera">⟲</button></div><div class="mm-row"><span class="clock">08:30</span><span class="daypart">Morning</span><span class="net"></span></div>`;
    r.append(mmw);
    this.mm = mmw.querySelector('canvas')!;
    this.mmCtx = this.mm.getContext('2d')!;
    const mmEl = mmw.querySelector('.minimap') as HTMLElement;
    mmEl.addEventListener('click', () => this.toggle('map'));
    const zoom = (d: number) => { this.mmZoom = Math.max(0, Math.min(MM_ZOOM.length - 1, this.mmZoom + d)); this.saveMinimap(); };
    const btn = (sel: string, fn: () => void) => mmw.querySelector(sel)!.addEventListener('click', (e) => { e.stopPropagation(); fn(); this.ctx.sfx('click'); });
    btn('.mm-in', () => zoom(1));
    btn('.mm-out', () => zoom(-1));
    btn('.mm-rot', () => { this.mmRotate = !this.mmRotate; mmw.querySelector('.mm-rot')!.classList.toggle('on', this.mmRotate); this.saveMinimap(); });
    mmEl.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    try {
      const saved = JSON.parse(localStorage.getItem('everrealm.minimap') ?? '{}');
      if (typeof saved.zoom === 'number') this.mmZoom = Math.max(0, Math.min(MM_ZOOM.length - 1, saved.zoom));
      if (saved.rotate) { this.mmRotate = true; mmw.querySelector('.mm-rot')!.classList.add('on'); }
    } catch { /* storage unavailable: defaults */ }

    const tr = el('div', 'hud-only'); tr.id = 'tracker'; r.append(tr);
    window.addEventListener('resize', () => this.stackTracker());

    this.buildChat();
    const ab = el('div', 'hud-only'); ab.id = 'actionbar';
    const slot = (i: number, k: string, key: string, t: string) => `<div class="ab-slot" data-ab="${i}" title="${t} (${key})"><img src="${abilityIcon(k)}" alt=""><span class="key">${key}</span><div class="cd"></div><div class="cdt"></div></div>`;
    ab.innerHTML = `<div id="xpbar"><div class="label">Melee 1</div><div class="bar xp"><i></i><b></b></div></div>
      <div id="ab-gauge"><i></i><span></span></div>
      <div class="ab-plate frame">
        ${[['strike', '1', 'Strike'], ['cleave', '2', 'Cleave']].map(([k, key, t], i) => slot(i, k, key, t)).join('')}
        <div class="ab-sep"></div>
        ${[3, 4, 5].map((key, j) => slot(2 + j, 'strike', String(key), '')).join('')}
        <div class="ab-sep"></div>
        ${slot(5, 'roll', 'Q', 'Dodge roll')}
        <div class="ab-slot" data-ab="6" title="Eat the best food you're carrying (F)"><img src="${abilityIcon('eat')}" alt=""><span class="key">F</span><span class="count"></span><div class="cd"></div><div class="cdt"></div></div>
        <div class="ab-sep"></div>
        <div class="menu-btns">
          <button class="menu-btn" data-p="inv">B<small>Bag</small></button>
          <button class="menu-btn" data-p="skills">K<small>Skills</small></button>
          <button class="menu-btn" data-p="journal">J<small>Journal</small></button>
          <button class="menu-btn" data-p="map">M<small>Map</small></button>
          <button class="menu-btn" data-p="guild">O<small>Guild</small></button>
          <button class="menu-btn" data-p="settings">☰<small>Menu</small></button>
        </div>
      </div>`;
    r.append(ab);
    ab.querySelectorAll<HTMLElement>('.ab-slot').forEach((s) => s.addEventListener('click', () => this.ctx.ability(Number(s.dataset.ab))));
    ab.querySelectorAll<HTMLElement>('.menu-btn').forEach((b) => b.addEventListener('click', () => this.toggle(b.dataset.p as PanelId)));

    r.append(Object.assign(el('div', 'frame hud-only'), { id: 'prompt' }));
    const cb = el('div', 'frame hud-only'); cb.id = 'castbar'; cb.innerHTML = '<div class="label"></div><div class="bar"><i></i></div>'; r.append(cb);
    r.append(Object.assign(el('div', 'hud-only', 'Pull!'), { id: 'bite' }));
    r.append(Object.assign(el('div', 'hud-only'), { id: 'loot' }));
    r.append(Object.assign(el('div', 'hud-only'), { id: 'xpdrops' }));
    r.append(Object.assign(el('div'), { id: 'banner' }));
    r.append(Object.assign(el('div', 'frame'), { id: 'tooltip' }));
    const death = el('div', '', '<h2>Knocked out</h2><p>You come round on a bench under the Moot Oak.</p>'); death.id = 'death'; r.append(death);
    r.append(Object.assign(el('div'), { id: 'fps' }));

    // Panels
    const panel = (id: string, title: string, pid: PanelId) => {
      const p = el('div', 'panel frame');
      p.id = id;
      p.innerHTML = `<header><h3>${title}</h3><button class="x" aria-label="Close">✕</button></header><div class="body"></div><div class="footer"></div>`;
      p.querySelector('.x')!.addEventListener('click', () => this.close(pid));
      r.append(p);
      return p;
    };
    panel('inv-panel', 'Pack', 'inv');
    panel('skills-panel', 'Skills', 'skills');
    panel('journal-panel', 'Journal', 'journal');
    panel('craft-panel', 'Crafting', 'craft');
    panel('shop-panel', 'Tamsin\'s Stall', 'shop');
    panel('map-panel', 'The Everrealm', 'map');
    panel('settings-panel', 'Menu', 'settings');
    panel('read-panel', '', 'read');
    panel('travel-panel', 'Charter Post', 'travel');
    // Closing the trade window by hand calls the trade off
    panel('trade-panel', 'Trade', 'trade').querySelector('.x')!.addEventListener('click', () => this.ctx.tradeCancel());
    panel('guild-panel', 'Friends', 'guild');
    const grp = el('div', 'hud-only'); grp.id = 'group'; r.append(grp);
    const ask = el('div', 'frame'); ask.id = 'askbox'; ask.innerHTML = '<p></p><div class="row"><button class="btn yes">Accept</button><button class="btn ghost no">Decline</button></div><i class="tm"></i>'; r.append(ask);
    const pm = el('div', 'frame'); pm.id = 'pmenu'; r.append(pm);
    window.addEventListener('pointerdown', (e) => { if (!(e.target as HTMLElement).closest('#pmenu')) pm.classList.remove('show'); }, true);

    const dlg = el('div', 'dlg'); dlg.innerHTML = '<div class="face"><canvas></canvas></div><div class="who"></div><div class="line"></div><div class="opts"></div>'; r.append(dlg);
  }

  // ------------------------------------------------------------------ Frames
  setPortrait(look: Appearance): void {
    drawFace(this.portrait, look);
  }

  setPlayer(name: string, level: number, hp: number, maxHp: number, energy: number): void {
    this.q('#player-frame .pn').textContent = name;
    this.q('#player-frame .lvl').textContent = String(level);
    const pct = Math.max(0, hp / maxHp) * 100;
    (this.q('#player-frame .bar.hp .fill') as HTMLElement).style.width = pct + '%';
    (this.q('#player-frame .bar.hp .lag') as HTMLElement).style.width = pct + '%';
    this.q('#player-frame .bar.hp b').textContent = `${Math.ceil(hp)} / ${maxHp}`;
    (this.q('#player-frame .bar.en i') as HTMLElement).style.width = energy + '%';
  }

  setTarget(t: { name: string; level: number; hp: number; max: number; elite?: boolean; friendly?: boolean; sub?: string } | null): void {
    const f = this.q('#target-frame');
    if (!t) { f.classList.remove('show'); return; }
    f.classList.add('show');
    f.classList.toggle('elite', !!t.elite);
    f.classList.toggle('friendly', !!t.friendly);
    this.q('#target-frame .tn').textContent = t.name;
    this.q('#target-frame .ts').textContent = t.sub ?? (t.elite ? 'Elite' : '');
    this.q('#target-frame .tl').textContent = t.friendly ? '' : String(t.level);
    (this.q('#target-frame .fill') as HTMLElement).style.width = (t.hp / t.max) * 100 + '%';
    this.q('#target-frame .bar b').textContent = t.friendly ? '' : `${Math.ceil(t.hp)} / ${t.max}`;
  }

  setXpBar(skill: SkillId, xp: number): void {
    const lv = levelForXp(xp);
    const a = xpForLevel(lv), b = xpForLevel(lv + 1);
    const name = SKILLS.find((s) => s.id === skill)!.name;
    this.q('#xpbar .label').textContent = `${name} ${lv}`;
    (this.q('#xpbar i') as HTMLElement).style.width = ((xp - a) / (b - a)) * 100 + '%';
    this.q('#xpbar b').textContent = `${xp - a} / ${b - a} XP`;
  }

  setAbilities(cds: { left: number; total: number; disabled?: boolean; count?: number }[]): void {
    this.root.querySelectorAll<HTMLElement>('.ab-slot').forEach((s, i) => {
      const c = cds[i];
      if (!c) return;
      const p = c.total > 0 ? Math.max(0, c.left / c.total) : 0;
      (s.querySelector('.cd') as HTMLElement).style.setProperty('--p', String(p));
      (s.querySelector('.cdt') as HTMLElement).textContent = c.left > 0.05 && c.total > 1.5 ? Math.ceil(c.left).toString() : '';
      s.classList.toggle('disabled', !!c.disabled);
      const cnt = s.querySelector('.count');
      if (cnt) cnt.textContent = c.count ? String(c.count) : '';
    });
  }

/** Put a calling's three skills on keys 3 to 5 and colour its gauge. */
  setCalling(c: CallingDef): void {
    const slots = this.root.querySelectorAll<HTMLElement>('.ab-slot');
    c.skills.forEach((sk, j) => {
      const s = slots[2 + j];
      s.querySelector('img')!.src = abilityIcon(sk.icon);
      s.title = `${sk.name} (${3 + j}): ${sk.desc}`;
    });
    const g = this.q('#ab-gauge');
    g.title = `${c.mechanic.name}: ${c.mechanic.desc}`;
    (g.querySelector('i') as HTMLElement).style.background = c.mechanic.color;
  }

  setGauge(label: string, value: number, max: number): void {
    const g = this.q('#ab-gauge');
    (g.querySelector('i') as HTMLElement).style.width = Math.min(100, (value / max) * 100) + '%';
    const sp = g.querySelector('span')!;
    if (sp.textContent !== label) sp.textContent = label;
    g.classList.toggle('full', value >= max);
  }

  pressAbility(i: number): void {
    const s = this.root.querySelectorAll<HTMLElement>('.ab-slot')[i];
    if (!s) return;
    s.classList.add('pressed');
    setTimeout(() => s.classList.remove('pressed'), 110);
  }

  setPrompt(key: string | null, text = '', sub = '', warn = ''): void {
    const p = this.q('#prompt');
    if (!key) { p.classList.remove('show'); return; }
    p.classList.add('show');
    p.innerHTML = `<kbd>${key}</kbd><span>${esc(text)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}${warn ? `<span class="warn">${esc(warn)}</span>` : ''}`;
  }

  setCast(label: string | null, progress = 0, alert = false): void {
    const c = this.q('#castbar');
    if (!label) { c.classList.remove('show'); return; }
    c.classList.add('show');
    c.classList.toggle('alert', alert);
    this.q('#castbar .label').textContent = label;
    (this.q('#castbar i') as HTMLElement).style.width = Math.min(100, progress * 100) + '%';
  }

  showBite(on: boolean): void {
    this.q('#bite').classList.toggle('show', on);
  }

  loot(itemId: string, n: number): void {
    const def = ITEMS[itemId];
    const line = el('div', 'loot-line', `<img src="${itemIcon(itemId)}" alt=""><span style="color:${RARITY_COLOR[def.rarity]}">${esc(def.name)}</span>${n > 1 ? ` <span>×${n}</span>` : ''}`);
    this.pushLoot(line);
  }

  /** A chat line from a player (or yourself): said, an emote ("Ada waves."), or group chat. */
  chat(from: string, text: string, kind: 'say' | 'emote' | 'group' | 'guild' | 'whisper' | 'whisperTo' = 'say'): void {
    this.chatLine('chat', kind === 'emote' ? `<i><b>${esc(from)}</b> ${esc(text)}</i>`
      : kind === 'group' ? `<b>[Group] ${esc(from)}:</b> ${esc(text)}`
      : kind === 'guild' ? `<b>[Guild] ${esc(from)}:</b> ${esc(text)}`
      : kind === 'whisper' ? `<b>${esc(from)} whispers:</b> ${esc(text)}`
      : kind === 'whisperTo' ? `<b>To ${esc(from)}:</b> ${esc(text)}`
      : `<b>${esc(from)}:</b> ${esc(text)}`, kind);
  }

  // ------------------------------------------------------------------ Groups and trades
  /** The group's frames, under your own (null: not in a group). */
  setGroup(rows: GroupRow[] | null): void {
    const box = this.q('#group');
    if (!rows) { box.innerHTML = ''; box.classList.remove('show'); return; }
    box.classList.add('show');
    box.innerHTML = '<h6>Group <button class="gleave" title="Leave the group">Leave</button></h6>' + rows.map((m) => `<div class="gm${m.me ? ' me' : ''}${m.near ? '' : ' far'}" data-n="${esc(m.name)}" title="${m.near ? 'Click for options' : 'Too far away to share in the group bonus'}"><div class="gn">${m.leader ? '<span class="crown">♛</span>' : ''}${esc(m.name)}<small>${m.level}${m.calling ? ' · ' + esc(m.calling[0].toUpperCase() + m.calling.slice(1)) : ''}</small></div><div class="bar hp"><i class="fill" style="width:${Math.max(0, Math.min(100, (m.hp / Math.max(1, m.max)) * 100))}%"></i></div></div>`).join('');
    box.querySelector('.gleave')!.addEventListener('click', () => this.ask('Leave the group?', () => this.ctx.groupDo('leave'), () => {}, 30));
    box.querySelectorAll<HTMLElement>('.gm:not(.me)').forEach((row) => row.addEventListener('click', (e) => {
      const name = row.dataset.n!;
      const lead = this.ctx.groupLeader();
      this.playerMenu(name, e.clientX, e.clientY, [
        { label: 'Whisper', act: () => this.ctx.groupDo('whisper', name) },
        ...(lead ? [{ label: 'Make leader', act: () => this.ctx.groupDo('promote', name) }, { label: 'Remove from group', act: () => this.ask(`Remove ${name} from the group?`, () => this.ctx.groupDo('kick', name), () => {}, 30) }] : []),
      ]);
    }));
  }

  private renderFriends(): void {
    const { rows, online } = this.ctx.friends();
    const body = this.q('#guild-panel .body');
    const foot = this.q('#guild-panel .footer');
    this.q('#guild-panel h3').textContent = 'Friends';
    const on = rows.filter((r) => r.online).length;
    body.innerHTML = `<div class="fadd"><input class="fname" maxlength="20" placeholder="Add a friend by name"><button class="btn sm fgo">Add</button></div>
      ${online ? '' : '<p class="gnote">You\'re playing offline: friends show as in the world only on the online realm.</p>'}
      <div class="groster">${rows.length ? rows.map((r) => `<div class="gmember${r.online ? ' on' : ''}"><span class="dot"></span><b>${esc(r.name)}</b><small>${r.online ? esc(r.where ?? 'In the world') : 'Away'}</small><span class="gacts">${r.online ? `<button class="btn ghost sm" data-fw="${esc(r.name)}">Whisper</button><button class="btn ghost sm" data-fi="${esc(r.name)}">Invite</button>` : ''}<button class="btn ghost sm danger" data-fr="${esc(r.name)}">Remove</button></span></div>`).join('') : '<p class="gnote">No friends on your list yet. Add someone by name, or click a player and choose <i>Add friend</i>.</p>'}</div>
      <p class="gnote">Whisper: /w name message, and /r to answer the last whisper.</p>`;
    const inp = body.querySelector<HTMLInputElement>('.fname')!;
    const add = () => { if (inp.value.trim()) { this.ctx.friendDo('add', inp.value); inp.value = ''; } };
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') add(); });
    body.querySelector('.fgo')!.addEventListener('click', add);
    body.querySelectorAll<HTMLElement>('[data-fw]').forEach((b) => b.addEventListener('click', () => this.ctx.friendDo('whisper', b.dataset.fw!)));
    body.querySelectorAll<HTMLElement>('[data-fi]').forEach((b) => b.addEventListener('click', () => this.ctx.friendDo('invite', b.dataset.fi!)));
    body.querySelectorAll<HTMLElement>('[data-fr]').forEach((b) => b.addEventListener('click', () => this.ask(`Take ${b.dataset.fr} off your friends list?`, () => this.ctx.friendDo('remove', b.dataset.fr!), () => {}, 30)));
    foot.innerHTML = `<span>${on} of ${rows.length} in the world</span>`;
  }

  private askT = 0;
  private askNo: (() => void) | null = null;
  /** A yes-or-no from another player (a group invite, a trade), answered or let lapse. */
  ask(text: string, yes: () => void, no: () => void, secs: number): void {
    const box = this.q('#askbox');
    if (this.askNo) this.askNo();
    clearTimeout(this.askT);
    box.querySelector('p')!.textContent = text;
    const done = (fn: () => void) => { box.classList.remove('show'); clearTimeout(this.askT); this.askNo = null; fn(); this.ctx.sfx('click'); };
    (box.querySelector('.yes') as HTMLElement).onclick = () => done(yes);
    (box.querySelector('.no') as HTMLElement).onclick = () => done(no);
    this.askNo = no;
    const tm = box.querySelector('.tm') as HTMLElement;
    tm.style.animation = 'none'; void tm.offsetWidth; tm.style.animation = `askTime ${secs}s linear forwards`;
    box.classList.add('show');
    this.ctx.sfx('open');
    this.askT = window.setTimeout(() => { if (this.askNo) done(no); }, secs * 1000);
  }

  /** A little menu by the cursor for another player: invite, trade and so on. */
  playerMenu(title: string, x: number, y: number, items: { label: string; act: () => void }[]): void {
    const pm = this.q('#pmenu');
    pm.innerHTML = `<b>${esc(title)}</b>`;
    for (const it of items) {
      const b = el('button', 'btn ghost sm', esc(it.label));
      b.addEventListener('click', () => { pm.classList.remove('show'); it.act(); });
      pm.append(b);
    }
    pm.classList.add('show');
    pm.style.left = Math.min(innerWidth - pm.offsetWidth - 8, x + 8) + 'px';
    pm.style.top = Math.min(innerHeight - pm.offsetHeight - 8, y - 10) + 'px';
  }

  /** The social panel (O) opens on Friends or Guild. */
  private socialTab: 'friends' | 'guild' = 'friends';
  private renderGuild(): void {
    const panel = this.q('#guild-panel');
    let tabs = panel.querySelector<HTMLElement>('.stabs');
    if (!tabs) {
      tabs = el('div', 'stabs', '<button data-st="friends">Friends</button><button data-st="guild">Guild</button>');
      panel.querySelector('.body')!.before(tabs);
      tabs.querySelectorAll<HTMLElement>('[data-st]').forEach((b) => b.addEventListener('click', () => { this.socialTab = b.dataset.st as 'friends' | 'guild'; this.ctx.sfx('click'); this.renderGuild(); }));
    }
    tabs.querySelectorAll<HTMLElement>('[data-st]').forEach((b) => b.classList.toggle('sel', b.dataset.st === this.socialTab));
    if (this.socialTab === 'friends') { this.renderFriends(); return; }
    const { view: g, online } = this.ctx.guild();
    const body = this.q('#guild-panel .body');
    const foot = this.q('#guild-panel .footer');
    this.q('#guild-panel h3').textContent = g?.name ?? 'Guild';
    if (!online) {
      body.innerHTML = '<p class="gnote">Guilds live on the online realm. You\'re playing offline: connect to a realm from the character screen to found or join one.</p>';
      foot.innerHTML = '';
      return;
    }
    if (!g) {
      body.innerHTML = `<p class="gnote">You aren't in a guild. Found one, or ask someone in a guild to invite you (they click you and choose <i>Invite to guild</i>).</p>
        <label class="gl">Name <input class="gname" maxlength="24" placeholder="The Lantern Watch"></label>
        <label class="gl">Motto <input class="gmotto" maxlength="140" placeholder="A line for the roster (optional)"></label>
        <button class="btn gfound">Found the guild</button>`;
      body.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => e.stopPropagation()));
      body.querySelector('.gfound')!.addEventListener('click', () => this.ctx.guildDo('found', (body.querySelector('.gname') as HTMLInputElement).value, (body.querySelector('.gmotto') as HTMLInputElement).value));
      foot.innerHTML = '<span>Free to found. Up to 200 members.</span>';
      return;
    }
    const lead = g.rank === 'leader', officer = lead || g.rank === 'officer';
    const order: Record<GuildRank, number> = { leader: 0, officer: 1, member: 2 };
    const members = [...g.members].sort((a, b) => Number(b.online) - Number(a.online) || order[a.rank] - order[b.rank] || a.name.localeCompare(b.name));
    const seen = (t: number) => { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
    const rankName: Record<GuildRank, string> = { leader: 'Leader', officer: 'Officer', member: 'Member' };
    body.innerHTML = `<div class="gmotto-row">${officer ? `<input class="gmotto-edit" maxlength="140" value="${esc(g.motto)}" placeholder="Set a motto for the guild">` : `<i>${esc(g.motto || 'No motto yet.')}</i>`}</div>
      <div class="gcount">${g.members.filter((m) => m.online).length} of ${g.members.length} in the world · your rank: ${rankName[g.rank ?? 'member']}</div>
      <div class="groster">${members.map((m) => {
        const acts: string[] = [];
        if (lead && m.rank !== 'leader') {
          acts.push(m.rank === 'member' ? `<button class="btn ghost sm" data-rank="officer" data-n="${esc(m.name)}">Promote</button>` : `<button class="btn ghost sm" data-rank="member" data-n="${esc(m.name)}">Demote</button>`);
          acts.push(`<button class="btn ghost sm" data-lead="${esc(m.name)}">Make leader</button>`);
        }
        if ((lead && m.rank !== 'leader') || (g.rank === 'officer' && m.rank === 'member')) acts.push(`<button class="btn ghost sm danger" data-kick="${esc(m.name)}">Remove</button>`);
        return `<div class="gmember${m.online ? ' on' : ''}"><span class="dot"></span><b>${esc(m.name)}</b><span class="grank ${m.rank}">${rankName[m.rank]}</span><small>${m.online ? 'In the world' : 'Seen ' + seen(m.seen)}</small><span class="gacts">${acts.join('')}</span></div>`;
      }).join('')}</div>
      <p class="gnote">Guild chat: /gu message. Invite: click a player and choose <i>Invite to guild</i>, or /ginvite name.</p>`;
    const motto = body.querySelector<HTMLInputElement>('.gmotto-edit');
    if (motto) { motto.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') motto.blur(); }); motto.addEventListener('change', () => this.ctx.guildDo('motto', motto.value)); }
    body.querySelectorAll<HTMLElement>('[data-rank]').forEach((b) => b.addEventListener('click', () => this.ctx.guildDo('rank', b.dataset.n!, b.dataset.rank!)));
    body.querySelectorAll<HTMLElement>('[data-lead]').forEach((b) => b.addEventListener('click', () => this.ask(`Hand the guild to ${b.dataset.lead}? You'll become an officer.`, () => this.ctx.guildDo('rank', b.dataset.lead!, 'leader'), () => {}, 30)));
    body.querySelectorAll<HTMLElement>('[data-kick]').forEach((b) => b.addEventListener('click', () => this.ask(`Remove ${b.dataset.kick} from the guild?`, () => this.ctx.guildDo('kick', b.dataset.kick!), () => {}, 30)));
    foot.innerHTML = `<span>Founded ${new Date(g.founded).toLocaleDateString()}</span><button class="btn ghost sm gleave">Leave the guild</button>`;
    foot.querySelector('.gleave')!.addEventListener('click', () => this.ask(`Leave ${g.name}?${g.members.length === 1 ? ' You are its only member: it will be gone.' : ''}`, () => this.ctx.guildDo('leave'), () => {}, 30));
  }

  private renderTrade(): void {
    const t = this.ctx.trade();
    const body = this.q('#trade-panel .body');
    if (!t) { body.innerHTML = ''; return; }
    this.q('#trade-panel h3').textContent = `Trade with ${t.with}`;
    const stack = (s: { id: string; n: number }, i: number, mine: boolean) => {
      const d = ITEMS[s.id];
      return `<div class="tslot r-${d?.rarity ?? 'common'}" data-i="${mine ? i : -1}" title="${esc(d?.name ?? s.id)}${mine ? ' (click to take back)' : ''}"><img src="${itemIcon(s.id)}" alt="">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}</div>`;
    };
    const side = (who: string, o: { items: { id: string; n: number }[]; marks: number }, mine: boolean, locked: boolean, accepted: boolean) => `
      <div class="tside${locked ? ' locked' : ''}">
        <h5>${esc(who)} <span>${accepted ? 'Accepted' : locked ? 'Locked' : 'Choosing'}</span></h5>
        <div class="tslots">${o.items.map((s, i) => stack(s, i, mine)).join('') || '<em>Nothing yet</em>'}</div>
        <div class="tmarks">${mine ? `<label>Marks <input type="number" min="0" max="${this.ctx.save.marks}" value="${o.marks}" ${locked ? 'disabled' : ''}></label>` : `<span class="coin">${o.marks} marks</span>`}</div>
      </div>`;
    body.innerHTML = `<div class="tsides">${side('You', t.mine, true, t.myLock, t.myAccept)}${side(t.with, t.theirs, false, t.theirLock, t.theirAccept)}</div>
      <h6 class="tpack-h">Your pack: click something to put it on the table</h6>
      <div class="tpack">${t.pack.map((s) => `<div class="tslot r-${ITEMS[s.id]?.rarity ?? 'common'}" data-add="${s.id}" title="${esc(ITEMS[s.id]?.name ?? s.id)}"><img src="${itemIcon(s.id)}" alt="">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}</div>`).join('') || '<em>Nothing in your pack that can be traded.</em>'}</div>
      <p class="tnote">Changing either side unlocks both. When both of you have locked, accept.</p>`;
    if (!t.myLock) {
      body.querySelectorAll<HTMLElement>('[data-add]').forEach((e) => e.addEventListener('click', () => this.ctx.tradeAdd(e.dataset.add!)));
      body.querySelectorAll<HTMLElement>('.tside [data-i]').forEach((e) => { const i = Number(e.dataset.i); if (i >= 0) e.addEventListener('click', () => this.ctx.tradeRemove(i)); });
      const inp = body.querySelector<HTMLInputElement>('.tmarks input');
      inp?.addEventListener('change', () => this.ctx.tradeMarks(Number(inp.value)));
      inp?.addEventListener('keydown', (e) => e.stopPropagation());
    }
    const both = t.myLock && t.theirLock;
    this.q('#trade-panel .footer').innerHTML = `<button class="btn ghost tcancel">Cancel</button><button class="btn ghost tlock">${t.myLock ? 'Unlock' : 'Lock'}</button><button class="btn taccept" ${both && !t.myAccept ? '' : 'disabled'}>${t.myAccept ? 'Waiting…' : 'Accept'}</button>`;
    this.q('#trade-panel .tcancel').addEventListener('click', () => this.ctx.tradeCancel());
    this.q('#trade-panel .tlock').addEventListener('click', () => this.ctx.tradeLock());
    this.q('#trade-panel .taccept').addEventListener('click', () => this.ctx.tradeAccept());
  }

  private chatFilter: 'all' | 'chat' | 'world' = 'all';
  private chatIdle = 0;
  private chatHistory: string[] = [];
  private chatHistoryAt = 0;

  /** Add a line to the chat box: channel 'chat' (players) or 'world' (the game's own messages). */
  private chatLine(ch: 'chat' | 'world', html: string, cls = ''): void {
    const log = this.q('#chatbox .cb-log');
    const atEnd = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    const d = new Date();
    const line = el('div', `cb-line ${ch} ${cls}`, `<time>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</time> ${html}`);
    line.hidden = this.chatFilter !== 'all' && this.chatFilter !== ch;
    log.append(line);
    while (log.children.length > 150) log.firstElementChild!.remove();
    if (atEnd) log.scrollTop = log.scrollHeight;
    this.chatWake();
  }

  /** The chat box fades back when nothing has happened in it for a while. */
  private chatWake(): void {
    const box = this.q('#chatbox');
    box.classList.remove('idle');
    clearTimeout(this.chatIdle);
    this.chatIdle = window.setTimeout(() => { if (!box.matches(':hover') && document.activeElement !== box.querySelector('input')) box.classList.add('idle'); }, 14000);
  }

  private buildChat(): void {
    const box = el('div', 'hud-only'); box.id = 'chatbox';
    box.innerHTML = `<div class="cb-tabs">${(['all', 'chat', 'world'] as const).map((c) => `<button data-ch="${c}" class="${c === 'all' ? 'sel' : ''}">${c === 'all' ? 'All' : c === 'chat' ? 'Chat' : 'World'}</button>`).join('')}<button class="cb-emo" title="Emotes">☺</button></div>
      <div class="cb-log"></div>
      <div class="cb-emotes">${EMOTES.map((e) => `<button data-emote="${e.id}" title="/${e.id}"><span>${e.icon}</span>${e.id[0].toUpperCase() + e.id.slice(1)}</button>`).join('')}</div>
      <input class="cb-input" maxlength="200" autocomplete="off" spellcheck="false" placeholder="Say something · /help for commands">`;
    this.root.append(box);
    box.querySelectorAll<HTMLElement>('[data-ch]').forEach((b) => b.addEventListener('click', () => {
      this.chatFilter = b.dataset.ch as 'all';
      box.querySelectorAll('[data-ch]').forEach((x) => x.classList.toggle('sel', x === b));
      box.querySelectorAll<HTMLElement>('.cb-line').forEach((l) => { l.hidden = this.chatFilter !== 'all' && !l.classList.contains(this.chatFilter); });
      const log = box.querySelector('.cb-log')!; log.scrollTop = log.scrollHeight;
    }));
    box.querySelector('.cb-emo')!.addEventListener('click', () => box.classList.toggle('emoting'));
    box.querySelectorAll<HTMLElement>('[data-emote]').forEach((b) => b.addEventListener('click', () => { box.classList.remove('emoting'); this.ctx.emote(b.dataset.emote!); }));
    box.addEventListener('mouseenter', () => this.chatWake());
    // Tapping the log opens the line on phones
    box.querySelector('.cb-log')!.addEventListener('click', () => { if (document.body.classList.contains('touch')) this.openChat((t) => this.ctx.say(t)); });
  }

  /** Online status next to the clock; null hides it (offline play). */
  setOnline(text: string | null, online = false): void {
    const e = this.q('.mm-row .net');
    e.textContent = text ?? '';
    e.classList.toggle('online', online);
  }

  /** Opens the chat line; Enter sends, Escape closes, up and down go through what you've said. Returns false if it was already open. */
  openChat(send: (text: string) => void, prefill = ''): boolean {
    const box = this.q('#chatbox');
    const input = box.querySelector<HTMLInputElement>('.cb-input')!;
    if (box.classList.contains('typing')) return false;
    box.classList.add('typing');
    input.value = prefill;
    input.focus();
    this.chatWake();
    this.chatHistoryAt = this.chatHistory.length;
    const done = () => { box.classList.remove('typing'); input.blur(); input.onkeydown = null; this.chatWake(); };
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const t = input.value.trim();
        if (t) { send(t); if (this.chatHistory[this.chatHistory.length - 1] !== t) this.chatHistory.push(t); if (this.chatHistory.length > 30) this.chatHistory.shift(); }
        done();
      } else if (e.key === 'Escape') done();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.chatHistoryAt = Math.max(0, Math.min(this.chatHistory.length, this.chatHistoryAt + (e.key === 'ArrowUp' ? -1 : 1)));
        input.value = this.chatHistory[this.chatHistoryAt] ?? '';
      }
    };
    input.onblur = () => { box.classList.remove('typing'); input.onkeydown = null; };
    return true;
  }

  /** The game's own messages: they go to the chat box's World channel. */
  system(text: string): void {
    this.chatLine('world', withItemIcons(esc(text)));
  }

  /** A speech bubble that follows a head: the game moves it each frame with placeBubble. */
  bubble(text: string, emote = false): HTMLElement {
    const b = el('div', 'bubble' + (emote ? ' emote' : ''), esc(text));
    this.floaters.append(b);
    return b;
  }

  private pushLoot(line: HTMLElement): void {
    const box = this.q('#loot');
    box.prepend(line);
    while (box.children.length > 7) box.lastElementChild!.remove();
    setTimeout(() => line.remove(), 5000);
  }

  xpDrop(skill: SkillId, amount: number): void {
    const s = SKILLS.find((k) => k.id === skill)!;
    const d = el('div', 'xpdrop', `<img src="${shapeIcon(s.icon as 'ore', s.color)}" alt=""><span style="color:${s.color}">+${amount} ${s.name}</span>`);
    this.q('#xpdrops').append(d);
    setTimeout(() => d.remove(), 1900);
  }

  /** Full-screen chapter card for the main story. */
  chapterCard(kicker: string, title: string): void {
    let c = this.q('#chapter');
    if (!c) { c = el('div'); c.id = 'chapter'; this.root.append(c); }
    c.classList.remove('show');
    c.innerHTML = `<div><div class="k">${esc(kicker)}</div><h1>${esc(title)}</h1><div class="rule"></div></div>`;
    void c.offsetWidth;
    c.classList.add('show');
    this.setCinema(true);
    setTimeout(() => { if (!this.cinemaHeld) this.setCinema(false); }, 5200);
  }

  private cinemaHeld = false;
  /** Letterbox bars, held while a story conversation is open. */
  setCinema(on: boolean, hold = false): void {
    if (hold) this.cinemaHeld = on;
    this.root.classList.toggle('cinema', on || this.cinemaHeld);
  }

  banner(title: string, sub = '', small = false): void {
    const key = title + sub;
    if (key === this.lastBanner && small) return;
    this.lastBanner = key;
    const b = this.q('#banner');
    b.innerHTML = `<div class="b${small ? ' small' : ''}"><div class="rod"></div><div class="cloth"><div class="stripe"></div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div>`;
    setTimeout(() => { if (this.lastBanner === key) this.lastBanner = ''; }, 4200);
  }

  private region = '';
  private worn: string | null = null;

  setZone(name: string, region?: string): void {
    this.q('.zone-label').textContent = name;
    if (region) this.region = region;
    this.q('#player-frame .pt').textContent = this.worn ?? this.region;
  }

  /** Open the journal on one of its pages (the login reward, a writ). */
  openJournalAt(page: string): void {
    this.selQuest = page;
    if (!this.isOpen('journal')) this.toggle('journal'); else this.renderJournal();
  }

  /** The title worn under the player's name, in place of the region. */
  setTitle(title: string | null): void {
    this.worn = title;
    this.q('#player-frame .pt').textContent = title ?? this.region;
  }

  setClock(hour: number): void {
    const h = Math.floor(hour), m = Math.floor((hour - h) * 60);
    this.q('.clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const part = hour < 5 ? 'Night' : hour < 8 ? 'Dawn' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 20 ? 'Evening' : 'Night';
    this.q('.daypart').textContent = this.weatherName && this.weatherName !== 'Clear' && this.weatherName !== 'Fair' ? `${part} · ${this.weatherName}` : part;
  }

  private weatherName = '';
  /** The weather's word, shown with the time of day under the minimap. */
  setWeather(name: string): void { this.weatherName = name; }

  setDeath(on: boolean): void {
    this.q('#death').classList.toggle('show', on);
  }

  setFps(text: string): void {
    this.q('#fps').textContent = text;
  }

  setTracker(entries: QuestEntry[]): void {
    const active = entries.filter((e) => !e.done);
    const html = active.map((e) => `<div class="q"><h4>${esc(e.name)}</h4>${e.objectives.map((o) => `<div class="obj${o.done ? ' done' : ''}">${esc(o.text)}${o.dist !== undefined && !o.done ? `<span class="dist">${Math.round(o.dist)}m</span>` : ''}</div>`).join('')}</div>`).join('');
    const tr = this.q('#tracker');
    if (tr.innerHTML !== html) tr.innerHTML = html;
    tr.style.display = active.length ? 'block' : 'none';
  }

  setJournalAlert(on: boolean): void {
    this.q('.menu-btn[data-p="journal"]').classList.toggle('alert', on);
  }

  // ------------------------------------------------------------------ World-space labels
  updatePlates(list: PlateInfo[]): void {
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.key);
      let e = this.plates.get(p.key);
      if (!e) {
        e = el('div', 'plate');
        this.platesLayer.append(e);
        this.plates.set(p.key, e);
      }
      e.className = `plate ${p.kind}${p.targeted ? ' targeted' : ''}`;
      // A trailing * marks a main-story marker, drawn in the story colour.
      const html = `${p.mark ? `<div class="mark${p.mark.endsWith('*') ? ' story' : ''}">${p.mark.replace('*', '')}</div>` : ''}<div>${esc(p.name)}</div>${p.sub ? `<div class="t">${esc(p.sub)}</div>` : ''}${p.hp !== undefined ? `<div class="hpb"><i style="width:${Math.max(0, p.hp * 100)}%"></i></div>` : ''}`;
      if (e.dataset.h !== html) { e.innerHTML = html; e.dataset.h = html; }
      e.style.left = p.x + 'px';
      e.style.top = p.y + 'px';
      e.style.display = 'block';
    }
    for (const [k, e] of this.plates) if (!seen.has(k)) e.style.display = 'none';
  }

  /** Recent numbers, so a quick run of hits stacks upward instead of printing over itself. */
  private recentFloats: { x: number; y: number; at: number }[] = [];

  floater(x: number, y: number, text: string, cls = ''): void {
    const f = el('div', 'floater ' + cls, esc(text));
    const now = performance.now();
    this.recentFloats = this.recentFloats.filter((r) => now - r.at < 450);
    const crowd = cls === 'chatter' ? 0 : this.recentFloats.filter((r) => Math.abs(r.x - x) < 60 && Math.abs(r.y - y) < 60).length;
    if (cls !== 'chatter') this.recentFloats.push({ x, y, at: now });
    f.style.left = x + (Math.random() - 0.5) * 24 + (crowd % 2 ? 14 : -6) + 'px';
    f.style.top = y - crowd * 17 + 'px';
    this.floaters.append(f);
    setTimeout(() => f.remove(), cls === 'chatter' ? 3400 : cls.includes('crit') ? 1250 : 1000);
  }

  /** The red at the screen's edges when you're hit, stronger for a bigger share of your health. */
  hurt(share: number): void {
    const v = this.q('#hurt');
    v.style.setProperty('--hurt', String(Math.min(1, 0.35 + share * 3)));
    v.classList.remove('hit');
    void v.offsetWidth;
    v.classList.add('hit');
  }

  /** A slow red pulse at the edges while health is low. */
  setLowHealth(on: boolean): void {
    this.q('#hurt').classList.toggle('low', on);
  }

  private bossKey = '';
  /** The bar across the top in a big fight. */
  setBoss(b: { name: string; level: number; hp: number; max: number; enraged: boolean } | null): void {
    const box = this.q('#bossbar');
    box.classList.toggle('show', !!b);
    if (!b) { this.bossKey = ''; return; }
    if (this.bossKey !== b.name) {
      this.bossKey = b.name;
      box.querySelector('.bb-name')!.textContent = b.name;
      box.querySelector('.bb-lvl')!.textContent = `Level ${b.level}`;
    }
    box.classList.toggle('enraged', b.enraged);
    const pct = Math.max(0, b.hp / b.max);
    (box.querySelector('.bb-fill') as HTMLElement).style.width = `${pct * 100}%`;
    box.querySelector('.bb-num')!.textContent = `${Math.ceil(b.hp).toLocaleString()} / ${b.max.toLocaleString()} · ${Math.ceil(pct * 100)}%`;
  }

  // ------------------------------------------------------------------ Minimap
  /** Shows (or hides) the tracker for the event, world boss or Shardfall you're in. */
  setEvent(ev: EventPanel | null): void {
    const p = this.eventEl;
    const was = p.classList.contains('show');
    p.classList.toggle('show', !!ev);
    if (was !== !!ev) this.stackTracker();
    if (!ev) return;
    const key = ev.kind + ev.title;
    if (key !== this.eventKey) {
      this.eventKey = key;
      requestAnimationFrame(() => this.stackTracker());
      p.dataset.kind = ev.kind;
      (p.querySelector('.ev-kind') as HTMLElement).textContent = ev.kind === 'event' ? 'Event' : ev.kind === 'boss' ? 'World boss' : ev.kind === 'task' ? 'Parish task' : 'Shardfall';
      (p.querySelector('.ev-title') as HTMLElement).textContent = ev.title;
    }
    (p.querySelector('.ev-goal') as HTMLElement).textContent = ev.goal;
    (p.querySelector('.ev i') as HTMLElement).style.width = `${Math.round(Math.min(1, ev.progress) * 100)}%`;
    (p.querySelector('.ev b') as HTMLElement).textContent = ev.count;
    const t = ev.time;
    (p.querySelector('.ev-time') as HTMLElement).textContent = t === undefined ? '' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} left`;
  }

  /**
   * The event panel and the quest tracker share the column under the minimap: while an event is
   * showing there, the tracker goes below it. (On a phone the event panel has its own corner.)
   */
  private stackTracker(): void {
    const tr = this.q('#tracker'), p = this.eventEl;
    tr.style.top = '';
    if (!p.classList.contains('show')) return;
    // Only when they share a column: their boxes overlap side to side
    const a = p.getBoundingClientRect(), b = tr.getBoundingClientRect();
    if (a.left < b.right && b.left < a.right) tr.style.top = `${p.offsetTop + p.offsetHeight + 8}px`;
  }

  private saveMinimap(): void {
    try { localStorage.setItem('everrealm.minimap', JSON.stringify({ zoom: this.mmZoom, rotate: this.mmRotate })); } catch { /* not kept */ }
    (this.mm.parentElement as HTMLElement).title = `Click to open the map (M) · wheel to zoom · ${Math.round(MM_SPAN / MM_ZOOM[this.mmZoom])} m across`;
  }

  /**
   * The minimap, in the manner of the big online games: round, the same chart and explored land as
   * the world map, north-up or turning with the camera, five zoom steps. Towns, found landmarks and
   * Charter Post stops have their own glyphs; people, foes and other players are dots; objectives
   * off the edge become arrows on the rim pointing the way. Drawn at twice the CSS size for crispness.
   */
  drawMinimap(px: number, pz: number, camYaw: number, playerYaw: number, markers: MapMarker[]): void {
    const c = this.mmCtx;
    const W = this.mm.width, R = W / 2;
    const k = MM_ZOOM[this.mmZoom] * (W / 176); // canvas pixels per block
    const rot = this.mmRotate ? camYaw - Math.PI : 0;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const at = (x: number, z: number): [number, number] => { const dx = (x - px) * k, dz = (z - pz) * k; return [dx * cos - dz * sin, dx * sin + dz * cos]; };
    c.save();
    c.clearRect(0, 0, W, W);
    c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#b8c6c8';
    c.fillRect(0, 0, W, W);
    // Chart and explored land, turned and scaled about the player
    c.save();
    c.translate(R, R); c.rotate(rot); c.scale(k, k); c.translate(-px, -pz);
    c.imageSmoothingEnabled = true;
    const chart = continentChart(), cs = this.ctx.mapImage.width / chart.width;
    c.drawImage(chart, WMIN, WMIN, chart.width * cs, chart.height * cs);
    c.fillStyle = 'rgba(236, 222, 186, 0.35)';
    c.fillRect(px - 400, pz - 400, 800, 800);
    c.imageSmoothingEnabled = k < 2.5;
    const span = (W / k) * 1.5;
    c.drawImage(this.ctx.mapImage, px - span / 2 - WMIN, pz - span / 2 - WMIN, span, span, px - span / 2, pz - span / 2, span, span);
    c.restore();
    // Inner shadow at the rim
    const vg = c.createRadialGradient(R, R, R * 0.62, R, R, R);
    vg.addColorStop(0, 'rgba(10, 16, 34, 0)'); vg.addColorStop(1, 'rgba(10, 16, 34, 0.5)');
    c.fillStyle = vg; c.fillRect(0, 0, W, W);
    c.translate(R, R);
    const inside = R - 14;

    // Towns, found landmarks and post stops
    const found = this.ctx.save.discovered;
    for (const p of places()) {
      if (p.kind === 'region') continue;
      const town = MAP_TOWNS.has(p.id);
      if (!town && !found.includes(p.id)) continue;
      const [x, y] = at(p.x, p.z);
      if (Math.hypot(x, y) > inside) continue;
      c.globalAlpha = found.includes(p.id) ? 1 : 0.55;
      if (town) mmHouse(c, x, y); else if (!placeGlyph(c, p.id, x, y, 1.6)) mmStar(c, x, y, 7);
      c.globalAlpha = 1;
    }
    for (const p of POSTS) {
      if (!found.includes(p.place)) continue;
      const [x, y] = at(p.x, p.z);
      if (Math.hypot(x, y) > inside) continue;
      c.fillStyle = '#c8803a'; c.strokeStyle = '#1e1208'; c.lineWidth = 2;
      c.fillRect(x - 2, y - 3, 4, 14); c.strokeRect(x - 2, y - 3, 4, 14);
      c.fillRect(x - 9, y - 10, 18, 8); c.strokeRect(x - 9, y - 10, 18, 8);
    }
    // Events, world bosses, the Shardfall: glyphs, or arrows on the rim when they're out of range
    for (const m of markers) {
      if (!ACT_KINDS.has(m.kind)) continue;
      const [x, y] = at(m.x, m.z), d = Math.hypot(x, y);
      if (d > inside) {
        if (m.kind === 'bossSoon' || m.kind === 'task' || m.kind === 'taskDone') continue;
        const ux = x / d, uy = y / d;
        c.save(); c.translate(ux * (R - 16), uy * (R - 16)); c.rotate(Math.atan2(uy, ux) + Math.PI / 2);
        c.fillStyle = ACT_COLOR[m.kind]; c.strokeStyle = '#0b1122'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 5); c.lineTo(0, 1); c.lineTo(-8, 5); c.closePath(); c.fill(); c.stroke();
        c.restore();
      } else actGlyph(c, m.kind, x, y, 1.6);
    }
    // People, foes, other players; objectives last, pinned to the rim when out of range
    for (const m of markers) {
      if (m.kind === 'quest' || ACT_KINDS.has(m.kind)) continue;
      if (m.kind === 'giver') {
        const [gx, gy] = at(m.x, m.z);
        if (Math.hypot(gx, gy) > inside) continue;
        c.fillStyle = '#ffd23a'; c.strokeStyle = '#3a2400'; c.lineWidth = 2;
        c.beginPath(); c.arc(gx, gy, 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#3a2400'; c.fillRect(gx - 1.2, gy - 4, 2.4, 5); c.fillRect(gx - 1.2, gy + 2, 2.4, 2);
        continue;
      }
      if (m.kind === 'fair') {
        const [fx, fy] = at(m.x, m.z);
        if (Math.hypot(fx, fy) > inside) continue;
        c.fillStyle = '#4a3020'; c.fillRect(fx - 1, fy - 9, 2.5, 16);
        c.fillStyle = '#e8a020'; c.strokeStyle = '#0b1122'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(fx + 1, fy - 9); c.lineTo(fx + 11, fy - 5); c.lineTo(fx + 1, fy - 1); c.closePath(); c.fill(); c.stroke();
        continue;
      }
      if (m.kind === 'waymark' || m.kind === 'waymarkDim') {
        const [wx, wy] = at(m.x, m.z);
        if (Math.hypot(wx, wy) > inside) continue;
        c.fillStyle = m.kind === 'waymark' ? '#3ab8ff' : '#7a8a96'; c.strokeStyle = '#0b1122'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(wx, wy - 8); c.lineTo(wx + 5, wy); c.lineTo(wx, wy + 8); c.lineTo(wx - 5, wy); c.closePath(); c.fill(); c.stroke();
        continue;
      }
      const [x, y] = at(m.x, m.z);
      if (Math.hypot(x, y) > inside) continue;
      const big = m.kind === 'elite';
      c.fillStyle = m.kind === 'ally' ? '#7fe05a' : m.kind === 'other' ? '#5fc6ff' : m.kind === 'npc' ? '#f4e6a0' : big ? '#ffb020' : m.kind === 'enemy' ? '#e8402e' : '#ffffff';
      c.strokeStyle = '#0b1122'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, big ? 8 : 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
      if (big) { c.strokeStyle = '#ffb020'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.stroke(); }
    }
    for (const m of markers) {
      if (m.kind !== 'quest') continue;
      let [x, y] = at(m.x, m.z);
      const d = Math.hypot(x, y);
      if (d > inside) {
        // An arrow on the rim, pointing the way
        const ux = x / d, uy = y / d, ex = ux * (R - 16), ey = uy * (R - 16);
        c.save(); c.translate(ex, ey); c.rotate(Math.atan2(uy, ux) + Math.PI / 2);
        c.fillStyle = '#ffd23a'; c.strokeStyle = '#3a2400'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(0, -12); c.lineTo(9, 6); c.lineTo(0, 1); c.lineTo(-9, 6); c.closePath(); c.fill(); c.stroke();
        c.restore();
        continue;
      }
      c.fillStyle = '#ffd23a'; c.strokeStyle = '#3a2400'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 10, y); c.lineTo(x, y + 12); c.lineTo(x - 10, y); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#3a2400'; c.fillRect(x - 1.5, y - 7, 3, 8); c.fillRect(x - 1.5, y + 3, 3, 3);
    }
    if (this.pin) {
      const [x, y] = at(this.pin.x, this.pin.z);
      const d = Math.hypot(x, y);
      if (d > inside) {
        const ux = x / d, uy = y / d;
        c.save(); c.translate(ux * (R - 16), uy * (R - 16)); c.rotate(Math.atan2(uy, ux) + Math.PI / 2);
        c.fillStyle = '#5fc6ff'; c.strokeStyle = '#0b1122'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(0, -12); c.lineTo(9, 6); c.lineTo(0, 1); c.lineTo(-9, 6); c.closePath(); c.fill(); c.stroke();
        c.restore();
      } else mapPin(c, x, y, 2);
    }
    // View cone and the player's arrow
    const look = rot - camYaw + Math.PI;
    c.save(); c.rotate(look);
    const cone = c.createRadialGradient(0, 0, 0, 0, 0, 110);
    cone.addColorStop(0, 'rgba(255, 244, 210, 0.42)'); cone.addColorStop(1, 'rgba(255, 244, 210, 0)');
    c.fillStyle = cone;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 110, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62); c.closePath(); c.fill();
    c.restore();
    c.save(); c.rotate(rot - playerYaw + Math.PI);
    c.fillStyle = '#fff6dc'; c.strokeStyle = '#0b1122'; c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(0, -15); c.lineTo(11, 11); c.lineTo(0, 5); c.lineTo(-11, 11); c.closePath(); c.stroke(); c.fill();
    c.restore();
    // Compass points on the rim (north in gold); they ride round when the map turns
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const [lt, a] of [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]] as const) {
      const ang = a + rot, cx = Math.sin(ang) * (R - 13), cy = -Math.cos(ang) * (R - 13);
      c.fillStyle = 'rgba(11, 17, 34, 0.85)';
      c.beginPath(); c.arc(cx, cy, 11, 0, Math.PI * 2); c.fill();
      c.font = '700 17px "Alegreya Sans SC", sans-serif';
      c.fillStyle = lt === 'N' ? '#f3d58a' : '#e8e0c8';
      c.fillText(lt, cx, cy + 1);
    }
    c.restore();
  }

  // ------------------------------------------------------------------ Panels
  isOpen(p: PanelId): boolean { return this.open.has(p); }
  anyOpen(): boolean { return this.open.size > 0; }

  toggle(p: PanelId): void {
    if (this.open.has(p)) this.close(p);
    else this.show(p);
  }

  show(p: PanelId): void {
    if (p === 'craft' || p === 'shop' || p === 'travel') { this.close('journal'); this.close('map'); this.close('settings'); }
    if (p === 'map' || p === 'journal' || p === 'settings') for (const o of ['craft', 'shop', 'travel', 'map', 'journal', 'settings'] as PanelId[]) if (o !== p) this.close(o);
    this.open.add(p);
    this.panelEl(p).classList.add('show');
    this.ctx.sfx('open');
    this.refresh(p);
    if (p === 'journal') this.setJournalAlert(false);
    if (p === 'map') this.mapView.fresh = true;
  }

  close(p: PanelId): void {
    if (!this.open.has(p)) return;
    this.open.delete(p);
    this.panelEl(p).classList.remove('show');
    this.hideTooltip();
    this.ctx.sfx('close');
  }

  closeAll(): boolean {
    const had = this.open.size > 0;
    for (const p of [...this.open]) this.close(p);
    return had;
  }

  private panelEl(p: PanelId): HTMLElement {
    return this.q(`#${p === 'inv' ? 'inv' : p}-panel`);
  }

  refresh(p?: PanelId): void {
    const list = p ? [p] : [...this.open];
    for (const id of list) {
      if (!this.open.has(id)) continue;
      switch (id) {
        case 'inv': this.renderInventory(); break;
        case 'skills': this.renderSkills(); break;
        case 'journal': this.renderJournal(); break;
        case 'craft': this.renderCraft(); break;
        case 'shop': this.renderShop(); break;
        case 'travel': this.renderTravel(); break;
        case 'trade': this.renderTrade(); break;
        case 'guild': this.renderGuild(); break;
        case 'map': this.renderMap(); break;
        case 'settings': this.renderSettings(); break;
      }
    }
  }

  /**
   * The armoury: every regional set, which pieces this character has found (they're remembered
   * after they're sold or dropped), and what each set does when its pair is worn.
   */
  private armoury(): HTMLElement {
    const save = this.ctx.save;
    const owned = new Set([save.equip.weapon, save.equip.head, ...save.inv.map((s) => s?.id)]);
    const found = (id: string) => owned.has(id) || !!save.flags['found:' + id];
    const pieces = Object.values(ITEMS).filter((d) => d.set);
    const box = el('details', 'armoury');
    const n = pieces.filter((d) => found(d.id)).length;
    box.append(el('summary', '', `Armoury · ${n} of ${pieces.length} found`));
    const active = activeSet(save.equip);
    for (const [id, S] of Object.entries(GEAR_SETS)) {
      const mine = pieces.filter((d) => d.set === id);
      const row = el('div', 'set' + (id === active ? ' on' : ''));
      const names = mine.map((d) => found(d.id) ? `<span class="got">${esc(d.name)}</span>` : '<span class="miss">?</span>').join(' · ');
      row.innerHTML = `<div class="nm">${esc(S.name)} <span class="where">${esc(S.where)}</span></div><div class="pc">${names}</div><div class="bn">${esc(S.bonus)}</div>`;
      box.append(row);
    }
    return box;
  }

  private tooltipFor(id: string, extra = ''): string {
    const d = ITEMS[id];
    if (d.set) {
      // Which set it belongs to, how much of it is worn, and what the pair does
      const S = GEAR_SETS[d.set], eq = this.ctx.save.equip;
      const worn = [eq.weapon, eq.head].filter((x) => x && ITEMS[x].set === d.set).length;
      extra = `<b>${esc(S.name)}</b> set (${worn}/2 worn): ${esc(S.bonus)}` + (extra ? '<br>' + extra : '');
    }
    const kindName: Record<string, string> = { material: 'Material', tool: 'Tool', weapon: 'Weapon', armor: 'Armour', food: 'Food', quest: 'Quest item', collectible: 'Collectible', trophy: 'Trophy' };
    return `<h5 style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</h5><div class="kind">${kindName[d.kind]}${d.rarity !== 'common' ? ' · ' + d.rarity[0].toUpperCase() + d.rarity.slice(1) : ''}</div><div class="desc">${esc(d.desc)}</div>${d.stats ? `<div class="stats">${esc(d.stats)}</div>` : ''}<div class="val">Worth about ${d.value} marks</div>${extra ? `<div class="hint">${extra}</div>` : ''}`;
  }

  showTooltip(html: string, x: number, y: number): void {
    const t = this.q('#tooltip');
    t.innerHTML = html;
    t.classList.add('show');
    const w = 280;
    t.style.left = Math.min(window.innerWidth - w - 10, x + 16) + 'px';
    t.style.top = Math.max(10, Math.min(window.innerHeight - t.offsetHeight - 10, y - 20)) + 'px';
  }

  hideTooltip(): void {
    this.q('#tooltip').classList.remove('show');
  }

  private slotEl(id: string | null, n: number, idx: number, hint: string): HTMLElement {
    const s = el('div', 'slot');
    if (id) {
      const d = ITEMS[id];
      s.classList.add('r-' + d.rarity);
      s.innerHTML = `<img src="${itemIcon(id)}" alt="${esc(d.name)}">${n > 1 ? `<span class="n">${n}</span>` : ''}`;
      s.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(id, hint), e.clientX, e.clientY));
      s.addEventListener('mouseleave', () => this.hideTooltip());
    }
    s.dataset.i = String(idx);
    return s;
  }

  private renderInventory(): void {
    const body = this.q('#inv-panel .body');
    const save = this.ctx.save;
    body.innerHTML = '';
    const eq = el('div', 'equip-row');
    for (const slot of ['weapon', 'head'] as const) {
      const id = save.equip[slot];
      const wrap = el('div', 'eq');
      const s = this.slotEl(id, 1, -1, 'Click to unequip');
      if (id) s.addEventListener('click', () => { this.ctx.unequip(slot); this.hideTooltip(); });
      wrap.append(s, el('span', '', slot === 'weapon' ? 'Weapon' : 'Head'));
      eq.append(wrap);
    }
    // Gear is horizontal: show the style each piece gives and the set in force, not a bigger number
    const style = (id: string | null) => (id ? (ITEMS[id].stats ?? '').split('.')[0] : 'None');
    const set = activeSet(save.equip);
    eq.append(el('div', 'stats', `Weapon <b>${esc(style(save.equip.weapon))}</b><br>Head <b>${esc(style(save.equip.head))}</b><br>${set ? `Set <b>${esc(GEAR_SETS[set].name)}</b><br>` : ''}Free slots <b>${this.ctx.inv.freeSlots()}</b>`));
    body.append(eq);
    body.append(this.armoury());
    const grid = el('div', 'inv-grid');
    save.inv.forEach((st, i) => {
      const def = st ? ITEMS[st.id] : null;
      const hint = !def ? '' : def.kind === 'food' ? 'Click to eat · Shift-click to drop' : def.kind === 'weapon' || def.kind === 'armor' ? 'Click to equip · Shift-click to drop' : this.open.has('shop') ? 'Click to sell' : 'Shift-click to drop';
      const s = this.slotEl(st?.id ?? null, st?.n ?? 0, i, hint);
      s.draggable = !!st;
      s.addEventListener('click', (e) => {
        if (!st) return;
        this.hideTooltip();
        if (e.shiftKey) this.ctx.dropSlot(i);
        else if (this.open.has('shop')) this.ctx.sell(i);
        else this.ctx.useSlot(i);
      });
      s.addEventListener('dragstart', () => { this.dragFrom = i; });
      s.addEventListener('dragover', (e) => { e.preventDefault(); s.classList.add('drag-over'); });
      s.addEventListener('dragleave', () => s.classList.remove('drag-over'));
      s.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.dragFrom >= 0 && this.dragFrom !== i) { this.ctx.inv.swap(this.dragFrom, i); this.renderInventory(); }
        this.dragFrom = -1;
      });
      grid.append(s);
    });
    body.append(grid);
    this.q('#inv-panel .footer').innerHTML = `<span>Drag to rearrange</span><span class="coin">${save.marks} marks</span>`;
  }

  private renderSkills(): void {
    const body = this.q('#skills-panel .body');
    body.innerHTML = '';
    let total = 0;
    for (const s of SKILLS) {
      const xp = this.ctx.save.xp[s.id];
      const lv = levelForXp(xp);
      total += lv;
      const a = xpForLevel(lv), b = xpForLevel(lv + 1);
      const row = el('div', 'skill' + (this.openSkill === s.id ? ' open' : ''));
      row.innerHTML = `<img src="${shapeIcon(s.icon as 'ore', s.color)}" alt=""><div class="nm">${s.name}</div><div class="lv">${lv}</div>
        <div class="bar xp"><i style="width:${((xp - a) / (b - a)) * 100}%;background:linear-gradient(180deg,${s.color},#2a1a10)"></i></div>
        <div class="xpt">${xp.toLocaleString()} XP · ${(b - xp).toLocaleString()} to level ${lv + 1}</div>
        <div class="unl">${UNLOCKS[s.id].map((u) => `<div class="${lv >= u.level ? 'got' : ''}">Level ${u.level}: ${esc(u.text)}</div>`).join('')}</div>`;
      row.addEventListener('click', () => { this.openSkill = this.openSkill === s.id ? null : s.id; this.renderSkills(); });
      body.append(row);
    }
    this.q('#skills-panel .footer').innerHTML = `<span>Click a skill for unlocks</span><span>Total level ${total}</span>`;
  }

  private renderJournal(): void {
    const body = this.q('#journal-panel .body');
    const qs = this.ctx.quests();
    if (!this.selQuest || (this.selQuest !== 'places' && this.selQuest !== 'feats' && this.selQuest !== 'calling' && this.selQuest !== 'festival' && this.selQuest !== 'writs' && this.selQuest !== 'login' && !qs.some((q) => q.id === this.selQuest))) this.selQuest = qs.find((q) => !q.done)?.id ?? qs[0]?.id ?? 'places';
    const list = el('div', 'jlist');
    const add = (title: string, items: QuestEntry[]) => {
      if (!items.length) return;
      list.append(el('h6', '', title));
      for (const q of items) {
        const ji = el('div', 'ji' + (q.id === this.selQuest ? ' sel' : '') + (q.done ? ' done' : '') + (q.story ? ' story' : ''), esc(q.name));
        ji.addEventListener('click', () => { this.selQuest = q.id; this.renderJournal(); });
        list.append(ji);
      }
    };
    list.append(el('h6', '', 'YOU'));
    const cj = el('div', 'ji' + (this.selQuest === 'calling' ? ' sel' : ''), 'Calling: ' + esc(callingById(this.ctx.calling())?.name ?? ''));
    cj.addEventListener('click', () => { this.selQuest = 'calling'; this.renderJournal(); });
    list.append(cj);
    add('MAIN STORY', qs.filter((q) => q.story && !q.done));
    add('ACTIVE', qs.filter((q) => !q.story && !q.done));
    add('COMPLETED', qs.filter((q) => q.done));
    list.append(el('h6', '', 'ATLAS'));
    const pl = el('div', 'ji' + (this.selQuest === 'places' ? ' sel' : ''), 'Places found');
    pl.addEventListener('click', () => { this.selQuest = 'places'; this.renderJournal(); });
    list.append(pl);
    list.append(el('h6', '', 'DAILY ROUND'));
    for (const [id, label] of [['writs', 'Charter writs'], ['login', 'Login rewards']] as const) {
      const d = this.ctx.daily();
      const dot = id === 'login' ? !d.login.claimedToday : d.writs.some((w) => !w.done);
      const ji = el('div', 'ji' + (this.selQuest === id ? ' sel' : ''), esc(label) + (dot ? ' <span class="dot-new">●</span>' : ''));
      ji.addEventListener('click', () => { this.selQuest = id; this.renderJournal(); });
      list.append(ji);
    }
    {
      const fv = this.ctx.festival();
      const fj = el('div', 'ji' + (this.selQuest === 'festival' ? ' sel' : ''), (fv.on ? esc(fv.on.name) : 'Festivals') + (fv.on && !fv.on.writ.done ? ' <span class="dot-new">●</span>' : ''));
      fj.addEventListener('click', () => { this.selQuest = 'festival'; this.renderJournal(); });
      list.append(fj);
    }
    const ft = el('div', 'ji' + (this.selQuest === 'feats' ? ' sel' : ''), 'Feats');
    ft.addEventListener('click', () => { this.selQuest = 'feats'; this.renderJournal(); });
    list.append(ft);
    const page = el('div', 'jbody');
    if (this.selQuest === 'writs' || this.selQuest === 'login') {
      const d = this.ctx.daily();
      const h = Math.floor(d.resetIn / 3600), m = Math.floor((d.resetIn % 3600) / 60);
      if (this.selQuest === 'writs') {
        page.innerHTML = `<h4>Charter writs</h4><div class="feat-sum">Three a day, the same for everyone. New ones in ${h}h ${m}m.${d.bundleDone ? ' All three done today.' : ` Finish all three for a bundle on top: <img class="ric" src="${COIN_ICON()}" alt="">${d.bundle.marks} marks and one of ${d.bundle.items.map((it) => `<img class="ric" src="${itemIcon(it)}" alt="" title="${esc(ITEMS[it]?.name ?? it)}">`).join('')}`}</div>`;
        for (const w of d.writs) {
          const row = el('div', 'feat' + (w.done ? ' done' : ''));
          row.innerHTML = `<div class="ft"><b>${esc(w.name)}</b><span>${w.done ? 'Done' : `${w.have.toLocaleString()} / ${w.need.toLocaleString()}`}</span></div><div class="fd">${esc(w.desc)}</div>${w.done ? '' : `<div class="bar feat-bar"><i style="width:${Math.min(100, (w.have / w.need) * 100)}%"></i></div>`}<div class="fr"><img class="ric" src="${COIN_ICON()}" alt="">${w.marks} marks and experience</div>`;
          page.append(row);
        }
      } else {
        const L = d.login;
        page.innerHTML = `<h4>Login rewards</h4><div class="feat-sum">A reward for each day you play this month (${L.count} of ${L.track.length} taken). The track starts again next month.</div>`;
        const grid = el('div', 'login-grid');
        L.track.forEach((r, i) => {
          const cell = el('div', 'lday' + (i < L.count ? ' got' : '') + (i === L.count && !L.claimedToday ? ' today' : '') + (r.rare ? ' rare' : ''));
          const ic = r.items.length ? itemIcon(r.items[0][0]) : COIN_ICON();
          cell.innerHTML = `<small>Day ${i + 1}</small><img class="lico" src="${ic}" alt=""><span>${esc(r.label)}</span>`;
          grid.append(cell);
        });
        page.append(grid);
        const claim = el('button', 'btn' + (L.claimedToday ? ' ghost' : ''), L.claimedToday ? `Come back in ${h}h ${m}m` : L.count >= L.track.length ? 'All taken this month' : `Claim day ${L.count + 1}`) as HTMLButtonElement;
        claim.disabled = L.claimedToday || L.count >= L.track.length;
        claim.classList.add('claim');
        claim.addEventListener('click', () => { this.ctx.claimLogin(); this.renderJournal(); });
        page.append(claim);
      }
    } else if (this.selQuest === 'festival') {
      const fv = this.ctx.festival();
      const on = fv.on;
      page.innerHTML = on
        ? `<h4>${esc(on.name)}</h4><div class="feat-sum">On until ${esc(on.closes)}. ${esc(on.blurb)}</div>
          <div class="feat${on.writ.done ? ' done' : ''}"><div class="ft"><b>Festival writ: ${esc(on.writ.name)}</b><span>${on.writ.done ? 'Done' : `${on.writ.have.toLocaleString()} / ${on.writ.need.toLocaleString()}`}</span></div><div class="fd">${esc(on.writ.desc)}</div>${on.writ.done ? '' : `<div class="bar feat-bar"><i style="width:${Math.min(100, (on.writ.have / on.writ.need) * 100)}%"></i></div>`}<div class="fr"><img class="ric" src="${itemIcon(on.token)}" alt="">8 ${esc(on.tokenName)} and <img class="ric" src="${COIN_ICON()}" alt="">20 marks · a new one every day</div></div>
          <div class="feat"><div class="ft"><b><img class="tok" src="${itemIcon(on.token)}" alt=""> ${on.have} ${esc(on.tokenName)}</b></div><div class="fd">Creatures drop them while the festival's on (big ones always do). Spend them at the festival stall beside any Charter Post: the pennant on your map.</div></div>`
        : `<h4>Festivals</h4><div class="feat-sum">No festival is on just now. They come round every year on the same days, for everyone.</div>`;
      page.append(el('h5', 'feat-group', 'The festival year'));
      for (const y of fv.year) page.append(el('div', 'feat' + (y.on ? ' done' : ''), `<div class="ft"><b>${esc(y.name)}</b><span>${y.on ? 'On now' : esc(y.when)}</span></div>`));
    } else if (this.selQuest === 'calling') {
      page.innerHTML = `<h4>Your calling</h4><div class="feat-sum">How you fight: keys 3, 4 and 5 and the bar above them. Change it whenever you're out of a fight; your gear, levels and everything else stay the same.</div><div class="callings">${CALLINGS.map((c) => callingCard(c, c.id === this.ctx.calling())).join('')}</div><div class="calling-msg"></div>`;
      page.querySelectorAll<HTMLElement>('[data-calling]').forEach((b) => b.addEventListener('click', () => {
        const why = this.ctx.setCalling(b.dataset.calling as CallingId);
        this.ctx.sfx('click');
        if (why) page.querySelector('.calling-msg')!.textContent = why;
        else this.renderJournal();
      }));
    } else if (this.selQuest === 'feats') {
      const fs = this.ctx.feats();
      const done = fs.filter((f) => f.done).length;
      page.innerHTML = `<h4>Feats</h4><div class="feat-sum">${done} of ${fs.length} done. Each pays out once and gives you a title to wear.</div>`;
      for (const group of [...new Set(fs.map((f) => f.group))]) {
        page.append(el('h5', 'feat-group', esc(group)));
        for (const f of fs.filter((x) => x.group === group)) {
          const row = el('div', 'feat' + (f.done ? ' done' : ''));
          const pct = Math.min(100, (f.have / f.need) * 100);
          row.innerHTML = `<div class="ft"><b>${esc(f.name)}</b><span>${f.done ? 'Done' : `${Math.min(f.have, f.need).toLocaleString()} / ${f.need.toLocaleString()}`}</span></div>
            <div class="fd">${esc(f.desc)}</div>
            ${f.done ? '' : `<div class="bar feat-bar"><i style="width:${pct}%"></i></div>`}
            <div class="fr"><img class="ric" src="${COIN_ICON()}" alt="">${f.marks} marks · title <i>${esc(f.title)}</i>${f.done ? ` <button class="btn sm${f.worn ? ' on' : ''}" data-t="${f.id}">${f.worn ? 'Worn' : 'Wear'}</button>` : ''}</div>`;
          row.querySelector('button')?.addEventListener('click', () => { this.ctx.wearTitle(f.worn ? null : f.id); this.renderJournal(); });
          page.append(row);
        }
      }
    } else if (this.selQuest === 'places') {
      const found = this.ctx.save.discovered;
      const all = places();
      const regions = all.filter((p) => p.kind === 'region');
      page.innerHTML = `<h4>Places found</h4><div class="places">${regions.map((rg) => {
        const sub = all.filter((p) => p.kind === 'place' && p.sub === rg.name || (rg.id === 'region:greenwake' && p.kind === 'place' && !p.sub.includes(' ') && false));
        void sub;
        return `<div><b>${found.includes(rg.id) ? esc(rg.name) : '<i style="opacity:.6">Unexplored region</i>'}</b> <span style="opacity:.7">${esc(rg.sub)}</span></div>`;
      }).join('')}<div style="margin-top:8px">${all.filter((p) => p.kind === 'place').map((r) => `<div>${found.includes(r.id) ? '◆ ' + esc(r.name) : '◇ <i style="opacity:.6">Not yet found</i>'}</div>`).join('')}</div></div>`;
    } else {
      const q = qs.find((x) => x.id === this.selQuest);
      if (q) page.innerHTML = `<h4>${esc(q.name)}</h4><div>${esc(q.notes)}</div>${q.objectives.length ? `<div class="objs">${q.objectives.map((o) => `<div class="${o.done ? 'done' : ''}">${esc(o.text)}</div>`).join('')}</div>` : ''}${q.done ? '<div class="objs"><div class="done">Complete</div></div>' : ''}`;
      else page.innerHTML = '<h4>Nothing yet</h4><div>Talk to people. Hollin Ford\'s reeve looks like she has a problem.</div>';
    }
    const wrap = el('div', 'journal');
    wrap.append(list, page);
    body.innerHTML = '';
    body.append(wrap);
    // On a phone the list is a strip: keep the open page's tab in view
    const selTab = list.querySelector<HTMLElement>('.ji.sel');
    if (selTab && list.scrollWidth > list.clientWidth) list.scrollLeft = selTab.offsetLeft - list.clientWidth / 2 + selTab.offsetWidth / 2;
  }

  private renderCraft(): void {
    const st = this.ctx.currentStation;
    if (!st) return;
    this.q('#craft-panel h3').textContent = STATION_NAMES[st];
    const body = this.q('#craft-panel .body');
    body.innerHTML = '';
    for (const r of RECIPES.filter((x) => x.station === st)) {
      const lv = this.ctx.level(r.skill);
      const okLevel = lv >= r.level;
      const maxMake = Math.min(...Object.entries(r.inputs).map(([id, n]) => Math.floor(this.ctx.inv.count(id) / n)));
      const row = el('div', 'recipe' + (okLevel ? '' : ' locked'));
      const out = ITEMS[r.output];
      const reqs = Object.entries(r.inputs).map(([id, n]) => {
        const have = this.ctx.inv.count(id);
        return `<span class="${have >= n ? 'ok' : 'no'}"><img class="ric" src="${itemIcon(id)}" alt="">${n}× ${esc(ITEMS[id].name)} (${have})</span>`;
      }).join('');
      const skillName = SKILLS.find((s) => s.id === r.skill)!.name;
      row.innerHTML = `<div class="slot r-${out.rarity}"><img src="${itemIcon(r.output)}" alt=""></div><div><div class="nm" style="color:${RARITY_COLOR[out.rarity]}">${esc(out.name)}</div><div class="req"><span class="${okLevel ? 'ok' : 'no'}">${skillName} ${r.level}</span>${reqs}<span>+${r.xp} XP</span></div></div><div class="btns"><button class="btn" data-n="1">Make</button><button class="btn ghost" data-n="99">All (${Math.max(0, maxMake)})</button></div>`;
      row.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.disabled = !okLevel || maxMake < 1;
        b.addEventListener('click', () => this.ctx.craft(r.id, Number(b.dataset.n)));
      });
      const slot = row.querySelector('.slot') as HTMLElement;
      slot.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(r.output), e.clientX, e.clientY));
      slot.addEventListener('mouseleave', () => this.hideTooltip());
      body.append(row);
    }
    this.q('#craft-panel .footer').innerHTML = '<span>Moving away stops crafting</span>';
  }

  private renderShop(): void {
    const body = this.q('#shop-panel .body');
    body.innerHTML = '';
    const tabs = el('div', 'tabs');
    for (const t of ['buy', 'sell'] as const) {
      const e = el('div', 'tab' + (this.shopTab === t ? ' sel' : ''), t === 'buy' ? 'Buy' : 'Sell');
      e.addEventListener('click', () => { this.shopTab = t; this.renderShop(); });
      tabs.append(e);
    }
    body.append(tabs);
    const shop = this.ctx.shop();
    this.q('#shop-panel h3').textContent = shop.name;
    if (this.shopTab === 'buy') {
      if (!shop.stock.length) body.append(el('div', '', `<p style="color:var(--muted)">${esc(shop.who)} isn't selling anything. Try the Sell tab.</p>`));
      for (const s of shop.stock) {
        const d = ITEMS[s.item];
        const row = el('div', 'shop-row');
        row.innerHTML = `<div class="slot r-${d.rarity}"><img src="${itemIcon(s.item)}" alt=""></div><div><div class="nm" style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</div><div class="d">${esc(d.stats ?? d.desc)}</div></div><span class="coin">${s.price}</span><button class="btn">Buy</button>`;
        const b = row.querySelector('button')!;
        b.disabled = (shop.currency ? shop.currency.have : this.ctx.save.marks) < s.price;
        if (shop.currency) { const c = row.querySelector('.coin') as HTMLElement; c.classList.add('token'); c.innerHTML = `<img src="${itemIcon(shop.currency.id)}" alt="">${s.price}`; c.title = shop.currency.name; }
        b.addEventListener('click', () => this.ctx.buy(s.item));
        const slot = row.querySelector('.slot') as HTMLElement;
        slot.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(s.item), e.clientX, e.clientY));
        slot.addEventListener('mouseleave', () => this.hideTooltip());
        body.append(row);
      }
    } else {
      const seen = new Set<string>();
      this.ctx.save.inv.forEach((st, i) => {
        if (!st || seen.has(st.id)) return;
        seen.add(st.id);
        const d = ITEMS[st.id];
        const price = shop.sellPrice(st.id);
        const row = el('div', 'shop-row');
        row.innerHTML = `<div class="slot r-${d.rarity}"><img src="${itemIcon(st.id)}" alt="">${this.ctx.inv.count(st.id) > 1 ? `<span class="n">${this.ctx.inv.count(st.id)}</span>` : ''}</div><div><div class="nm" style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</div><div class="d">${esc(shop.who)} offers ${price} each</div></div><span class="coin">${price}</span><button class="btn">Sell</button>`;
        const b = row.querySelector('button')!;
        b.disabled = price <= 0 || d.kind === 'quest';
        b.addEventListener('click', () => this.ctx.sell(i));
        body.append(row);
      });
      if (!seen.size) body.append(el('div', '', '<p style="color:var(--muted)">Your pack is empty.</p>'));
    }
    this.q('#shop-panel .footer').innerHTML = shop.currency
      ? `<span>${esc(shop.footer)}</span><span class="coin token"><img src="${itemIcon(shop.currency.id)}" alt="">${shop.currency.have} ${esc(shop.currency.name)}</span>`
      : `<span>${esc(shop.footer)}</span><span class="coin">${this.ctx.save.marks} marks</span>`;
  }

  private renderTravel(): void {
    const v = this.ctx.travel();
    const body = this.q('#travel-panel .body');
    body.innerHTML = '';
    for (const s of v.stops) {
      const row = el('div', 'shop-row' + (s.here ? ' here' : s.known ? '' : ' unknown'));
      const sub = s.here ? 'You are here' : s.known ? `${s.hours} ${s.hours === 1 ? 'hour' : 'hours'} on the road` : 'You haven\'t been there yet';
      row.innerHTML = `<div><div class="nm">${esc(s.name)}</div><div class="d">${sub}</div></div><span class="coin">${s.here || !s.known ? '' : s.fare}</span><button class="btn">Travel</button>`;
      const b = row.querySelector('button')!;
      b.disabled = s.here || !s.known || this.ctx.save.marks < s.fare;
      b.addEventListener('click', () => this.ctx.travelTo(s.id));
      body.append(row);
    }
    this.q('#travel-panel .footer').innerHTML = `<span>Fares by Charter. You can ride to any stop you've visited</span><span class="coin">${this.ctx.save.marks} marks</span>`;
  }

  /**
   * The world map (M), in the manner of the big online games: it opens on you, the wheel zooms
   * from the whole continent down to the streets, dragging pans, and labels come and go with the
   * zoom (regions far out, towns and landmarks nearer, people's names close in). Hover an icon for
   * its name; click to drop a waypoint (shown on the minimap too), right-click to clear it. The
   * legend's chips hide or show each kind of icon.
   */
  private renderMap(): void {
    const body = this.q('#map-panel .body');
    let c = body.querySelector('canvas');
    if (!c) c = this.buildMapView(body);
    const V = this.mapView;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(200, Math.round(body.clientWidth * dpr)), ch = Math.max(200, Math.round(body.clientHeight * dpr));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const WORLD = this.ctx.mapImage.width;
    const kMin = Math.min(cw, ch) / WORLD * 0.92, kMax = 7 * dpr;
    const markers = this.ctx.mapMarkers();
    const me = markers.find((m) => m.kind === 'player');
    if (V.fresh && me) { V.fresh = false; V.cx = me.x; V.cz = me.z; V.k = Math.max(kMin, 1.1 * dpr); }
    V.k = Math.max(kMin, Math.min(kMax, V.k));
    V.kMin = kMin; V.kMax = kMax; V.dpr = dpr;
    const k = V.k, z = k / dpr; // z: CSS pixels per block, for deciding what to label
    const sx = (wx: number) => (wx - V.cx) * k + cw / 2, sy = (wz: number) => (wz - V.cz) * k + ch / 2;
    const x = c.getContext('2d')!;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#0b1122';
    x.fillRect(0, 0, cw, ch);
    // The chart, faded like an old survey, and the land you've walked on top of it
    const X0 = sx(WMIN), Y0 = sy(WMIN), SW = WORLD * k;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(continentChart(), X0, Y0, SW, SW);
    x.fillStyle = 'rgba(236, 222, 186, 0.4)';
    x.fillRect(X0, Y0, SW, SW);
    x.imageSmoothingEnabled = z < 1.6;
    x.globalAlpha = 0.86;
    x.drawImage(this.ctx.mapImage, X0, Y0, SW, SW);
    x.globalAlpha = 1;
    const vg = x.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.4, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    vg.addColorStop(0, 'rgba(20, 14, 6, 0)'); vg.addColorStop(1, 'rgba(20, 14, 6, 0.45)');
    x.fillStyle = vg; x.fillRect(0, 0, cw, ch);

    const hits: { x: number; y: number; name: string; sub: string }[] = [];
    this.wmHits = [];
    const on = (f: string) => !V.hidden.has(f);
    const label = (text: string, lx: number, ly: number, font: string, fill: string, halo = 'rgba(250, 242, 220, 0.85)', width = 4) => {
      x.font = font; x.lineJoin = 'round'; x.lineWidth = width * dpr; x.strokeStyle = halo; x.fillStyle = fill;
      x.strokeText(text, lx, ly); x.fillText(text, lx, ly);
    };
    const px = (n: number) => Math.round(n * dpr);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const found = this.ctx.save.discovered;
    // Regions: big and faint far out, gone close in
    const regionA = Math.max(0, Math.min(0.85, (2.2 - z) / 1.2));
    if (regionA > 0.02) for (const r of places()) {
      if (r.kind !== 'region') continue;
      x.globalAlpha = regionA * (found.includes(r.id) ? 1 : 0.55);
      x.letterSpacing = px(5) + 'px';
      label(r.name.toUpperCase(), sx(r.x), sy(r.z), `700 ${px(Math.max(13, Math.min(30, 12 + z * 16)))}px "Alegreya Sans SC", "Alegreya", serif`, 'rgb(58, 36, 14)', 'rgba(250, 242, 220, 0.6)', 5);
      x.letterSpacing = '0px';
      x.globalAlpha = 1;
    }
    // Towns (on every chart) and the landmarks you've found
    for (const r of places()) {
      if (r.kind === 'region') continue;
      const town = MAP_TOWNS.has(r.id), seen = found.includes(r.id);
      if (town ? !on('towns') : (!seen || !on('landmarks'))) continue;
      const X = sx(r.x), Y = sy(r.z);
      if (X < -60 || Y < -60 || X > cw + 60 || Y > ch + 60) continue;
      const gw = r.x < 320 && r.z < 320;
      x.save(); x.globalAlpha = seen ? 1 : 0.55;
      x.translate(X, Y); x.scale(dpr * 1.25, dpr * 1.25);
      if (town) mmHouse(x, 0, 0); else if (!placeGlyph(x, r.id, 0, 0, 1)) mmStar(x, 0, 0, 7);
      x.restore();
      const show = town ? z > (gw ? 0.9 : 0.32) : z > (gw ? 1.2 : 0.6);
      if (show) { x.globalAlpha = seen ? 1 : 0.6; label(seen ? r.name : r.name + '?', X, Y + px(town ? 22 : 19), `${town ? 700 : 600} ${px(town ? 17 : 15)}px "Alegreya", Georgia, serif`, town ? '#2a1a0a' : '#4a3010'); x.globalAlpha = 1; }
      hits.push({ x: X, y: Y, name: seen ? r.name : r.name + ' (not yet visited)', sub: r.sub });
    }
    // Charter Post stops, people, other players, objectives
    for (const m of markers) {
      const X = sx(m.x), Y = sy(m.z);
      if (X < -40 || Y < -40 || X > cw + 40 || Y > ch + 40) continue;
      if ((m.kind === 'waymark' || m.kind === 'waymarkDim') && on('waymarks')) {
        const lit = m.kind === 'waymark';
        x.fillStyle = lit ? '#3ab8ff' : '#7a8a96'; x.strokeStyle = '#0b1122'; x.lineWidth = px(2);
        x.beginPath(); x.moveTo(X, Y - px(10)); x.lineTo(X + px(6), Y); x.lineTo(X, Y + px(10)); x.lineTo(X - px(6), Y); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = lit ? '#e8f8ff' : '#c8d0d6'; x.fillRect(X - px(1.5), Y - px(4), px(3), px(8));
        if (m.label && z > 0.6) label(m.label, X, Y + px(22), `600 ${px(12)}px "Alegreya Sans", sans-serif`, lit ? '#0e3a5a' : '#4a5660');
        const fare = lit && m.id ? this.ctx.waymarkFare(m.id) : null;
        hits.push({ x: X, y: Y, name: m.label ?? 'Waymark', sub: lit ? (fare !== null ? `Waymark · click to travel (${fare} marks)` : 'Waymark') : 'Waymark · walk up to it to attune' });
        if (lit && m.id) this.wmHits.push({ x: X, y: Y, id: m.id, name: m.label ?? 'Waymark' });
      } else if (m.kind === 'fair' && on('post')) {
        x.fillStyle = '#4a3020'; x.fillRect(X - px(1.5), Y - px(12), px(3), px(22));
        x.fillStyle = '#e8a020'; x.strokeStyle = '#1e1208'; x.lineWidth = px(2);
        x.beginPath(); x.moveTo(X + px(1.5), Y - px(12)); x.lineTo(X + px(15), Y - px(6)); x.lineTo(X + px(1.5), Y); x.closePath(); x.fill(); x.stroke();
        hits.push({ x: X, y: Y, name: m.label ?? 'Festival stall', sub: 'Festival stall: trade tokens here' });
      } else if (m.kind === 'post' && on('post')) {
        x.fillStyle = '#c8803a'; x.strokeStyle = '#1e1208'; x.lineWidth = px(2);
        x.fillRect(X - px(2), Y - px(3), px(4), px(14)); x.strokeRect(X - px(2), Y - px(3), px(4), px(14));
        x.fillRect(X - px(9), Y - px(11), px(18), px(8)); x.strokeRect(X - px(9), Y - px(11), px(18), px(8));
        hits.push({ x: X, y: Y, name: m.label ?? 'Charter Post', sub: 'Charter Post stop' });
      } else if (m.kind === 'npc' && on('people') && z > 1) {
        x.fillStyle = '#f4e6a0'; x.strokeStyle = '#2a1a0a'; x.lineWidth = px(2);
        x.beginPath(); x.arc(X, Y, px(5), 0, Math.PI * 2); x.fill(); x.stroke();
        if (m.label && z > 2.2) label(m.label, X, Y + px(15), `600 ${px(13)}px "Alegreya Sans", sans-serif`, '#2a1a0a');
        if (m.label) hits.push({ x: X, y: Y, name: m.label, sub: 'Townsperson' });
      } else if (m.kind === 'ally') {
        x.fillStyle = '#5fbf3a'; x.strokeStyle = '#fff'; x.lineWidth = px(2);
        x.beginPath(); x.arc(X, Y, px(6), 0, Math.PI * 2); x.fill(); x.stroke();
        if (m.label) { label(m.label, X, Y + px(16), `700 ${px(13)}px "Alegreya Sans", sans-serif`, '#1f4a10'); hits.push({ x: X, y: Y, name: m.label, sub: 'In your group' }); }
      } else if (m.kind === 'other') {
        x.fillStyle = '#3f8fc0'; x.strokeStyle = '#fff'; x.lineWidth = px(2);
        x.beginPath(); x.arc(X, Y, px(5), 0, Math.PI * 2); x.fill(); x.stroke();
        if (m.label) { label(m.label, X, Y + px(15), `600 ${px(13)}px "Alegreya Sans", sans-serif`, '#1d4a6a'); hits.push({ x: X, y: Y, name: m.label, sub: 'Another player' }); }
      }
    }
    for (const m of markers) {
      if (!ACT_KINDS.has(m.kind)) continue;
      if (!on(m.kind === 'event' ? 'events' : m.kind === 'task' || m.kind === 'taskDone' ? 'tasks' : 'bosses')) continue;
      const X = sx(m.x), Y = sy(m.z);
      actGlyph(x, m.kind, X, Y, dpr * 1.5);
      if (m.label && (z > 0.5 || (m.kind !== 'event' && m.kind !== 'taskDone' && m.kind !== 'task'))) label(m.label, X, Y + px(20), `700 ${px(14)}px "Alegreya", serif`, ACT_COLOR[m.kind] === '#ffd23a' ? '#5a3a00' : '#3a1008');
      hits.push({ x: X, y: Y, name: m.label ?? '', sub: m.kind === 'task' ? 'Parish task: the locals want a hand' : m.kind === 'taskDone' ? 'Parish task: done' : m.kind === 'event' ? 'Event under way' : m.kind === 'boss' ? 'World boss: up now' : m.kind === 'bossSoon' ? 'World boss: rising soon' : 'A Shardfall: a star has come down' });
    }
    if (on('quests') && z > 1.1) for (const m of markers) {
      if (m.kind !== 'giver') continue;
      const X = sx(m.x), Y = sy(m.z);
      x.fillStyle = '#ffd23a'; x.strokeStyle = '#3a2400'; x.lineWidth = px(2);
      x.beginPath(); x.arc(X, Y, px(7), 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#3a2400'; x.fillRect(X - px(1.3), Y - px(4.5), px(2.6), px(5.5)); x.fillRect(X - px(1.3), Y + px(2.2), px(2.6), px(2.2));
      hits.push({ x: X, y: Y, name: 'Someone with work', sub: 'Has a quest to offer' });
    }
    if (on('quests')) for (const m of markers) {
      if (m.kind !== 'quest') continue;
      const X = sx(m.x), Y = sy(m.z);
      x.fillStyle = '#ffd23a'; x.strokeStyle = '#3a2400'; x.lineWidth = px(3);
      x.beginPath(); x.moveTo(X, Y - px(12)); x.lineTo(X + px(10), Y); x.lineTo(X, Y + px(12)); x.lineTo(X - px(10), Y); x.closePath(); x.fill(); x.stroke();
      hits.push({ x: X, y: Y, name: 'Objective', sub: 'From your journal' });
    }
    if (this.pin) {
      const X = sx(this.pin.x), Y = sy(this.pin.z);
      mapPin(x, X, Y, dpr);
      hits.push({ x: X, y: Y - px(14), name: 'Your waypoint', sub: `${Math.round(this.pin.x)}, ${Math.round(this.pin.z)} · right-click to clear` });
    }
    if (me) {
      x.save(); x.translate(sx(me.x), sy(me.z)); x.rotate(-(me.yaw ?? 0) + Math.PI); x.scale(dpr, dpr);
      x.fillStyle = '#fff6dc'; x.strokeStyle = '#0b1122'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(0, -14); x.lineTo(10, 10); x.lineTo(0, 5); x.lineTo(-10, 10); x.closePath(); x.stroke(); x.fill();
      x.restore();
    }
    // A scale bar that picks a round length for the zoom
    const steps = [10, 25, 50, 100, 250, 500, 1000];
    const len = steps.find((m) => m * k > px(90)) ?? 1000;
    x.fillStyle = 'rgba(11, 17, 34, 0.75)';
    x.fillRect(px(14), ch - px(40), len * k + px(70), px(28));
    x.fillStyle = '#f3d58a';
    x.fillRect(px(22), ch - px(24), len * k, px(3));
    for (const t of [0, 0.5, 1]) x.fillRect(px(22) + len * k * t - px(1), ch - px(30), px(2), px(12));
    x.textAlign = 'left';
    label(len + ' m', px(30) + len * k, ch - px(24), `600 ${px(13)}px "Alegreya Sans", sans-serif`, '#f3d58a', 'rgba(11, 17, 34, 0.8)', 3);
    // Hover: the nearest icon's name
    V.hits = hits;
    if (V.hover) {
      let best: (typeof hits)[number] | null = null, bd = px(16);
      for (const h of hits) { const d = Math.hypot(h.x - V.hover.x * dpr, h.y - V.hover.y * dpr); if (d < bd) { bd = d; best = h; } }
      if (best) {
        x.font = `700 ${px(15)}px "Alegreya", serif`;
        const w1 = x.measureText(best.name).width;
        x.font = `500 ${px(12)}px "Alegreya Sans", sans-serif`;
        const w = Math.max(w1, x.measureText(best.sub).width) + px(20);
        const bx = Math.min(cw - w - px(6), best.x + px(14)), by = Math.max(px(6), best.y - px(48));
        x.fillStyle = 'rgba(12, 18, 36, 0.95)'; x.strokeStyle = 'rgba(243, 213, 138, 0.6)'; x.lineWidth = px(1);
        x.beginPath(); x.roundRect(bx, by, w, px(42), px(6)); x.fill(); x.stroke();
        x.textAlign = 'left'; x.textBaseline = 'alphabetic';
        x.fillStyle = '#f3d58a'; x.font = `700 ${px(15)}px "Alegreya", serif`; x.fillText(best.name, bx + px(10), by + px(18));
        x.fillStyle = '#c8c2d4'; x.font = `500 ${px(12)}px "Alegreya Sans", sans-serif`; x.fillText(best.sub, bx + px(10), by + px(34));
      }
    }
    this.q('#map-panel .footer').innerHTML = document.body.classList.contains('touch')
      ? '<span>Pinch to zoom · drag to pan · tap a blue waymark to travel · tap elsewhere to set a waypoint</span>'
      : '<span>Wheel to zoom · drag to pan · click a blue waymark to travel · click elsewhere for a waypoint (right-click clears it)</span><span>M to close</span>';
  }

  /** The map canvas, its zoom buttons and legend chips, and the mouse handling. */
  private buildMapView(body: HTMLElement): HTMLCanvasElement {
    body.innerHTML = '';
    const c = document.createElement('canvas');
    const V = this.mapView;
    const ctl = el('div', 'map-ctl');
    ctl.innerHTML = '<button class="mm-b" data-z="1" title="Zoom in">+</button><button class="mm-b" data-z="-1" title="Zoom out">−</button><button class="mm-b me" title="Centre on you">◎</button>';
    const legend = el('div', 'map-legend');
    for (const [f, name] of [['towns', 'Towns'], ['landmarks', 'Landmarks'], ['post', 'Charter Post'], ['quests', 'Objectives'], ['waymarks', 'Waymarks'], ['events', 'Events'], ['tasks', 'Tasks'], ['bosses', 'Bosses'], ['people', 'People']] as const) {
      const chip = el('button', 'chip on', name);
      chip.addEventListener('click', () => { if (V.hidden.has(f)) V.hidden.delete(f); else V.hidden.add(f); chip.classList.toggle('on', !V.hidden.has(f)); this.ctx.sfx('click'); });
      legend.append(chip);
    }
    body.append(c, ctl, legend);
    const zoomAt = (f: number, mx: number, my: number) => {
      const before = { x: V.cx + (mx * V.dpr - c.width / 2) / V.k, z: V.cz + (my * V.dpr - c.height / 2) / V.k };
      V.k = Math.max(V.kMin, Math.min(V.kMax, V.k * f));
      V.cx = before.x - (mx * V.dpr - c.width / 2) / V.k; V.cz = before.z - (my * V.dpr - c.height / 2) / V.k;
    };
    ctl.querySelectorAll('[data-z]').forEach((btn) => btn.addEventListener('click', () => zoomAt((btn as HTMLElement).dataset.z === '1' ? 1.6 : 1 / 1.6, c.clientWidth / 2, c.clientHeight / 2)));
    ctl.querySelector('.me')!.addEventListener('click', () => { V.fresh = true; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); const r = c.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    // Pointer events, so a finger drags the map and two fingers pinch it, as a mouse drags and wheels it
    let drag: { x: number; y: number; moved: number } | null = null;
    const fingers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      c.setPointerCapture(e.pointerId);
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) { const [p, q] = [...fingers.values()]; pinch = Math.hypot(p.x - q.x, p.y - q.y); drag = null; }
      else drag = { x: e.clientX, y: e.clientY, moved: 0 };
    });
    const lift = (e: PointerEvent) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = 0; };
    c.addEventListener('pointercancel', (e) => { lift(e); drag = null; });
    window.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      if (e.pointerType === 'mouse') V.hover = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && fingers.size === 2) {
        const [p, q] = [...fingers.values()];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d > 0) zoomAt(d / pinch, (p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top);
        pinch = d;
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
      V.cx -= (dx * V.dpr) / V.k; V.cz -= (dy * V.dpr) / V.k;
      c.style.cursor = 'grabbing';
    });
    window.addEventListener('pointerup', (e) => {
      lift(e);
      if (!drag) return;
      const click = drag.moved < 5;
      drag = null; c.style.cursor = '';
      if (!click) return;
      const r = c.getBoundingClientRect();
      const wx = V.cx + ((e.clientX - r.left) * V.dpr - c.width / 2) / V.k, wz = V.cz + ((e.clientY - r.top) * V.dpr - c.height / 2) / V.k;
      // A waymark under the click: offer the trip instead of setting a waypoint
      const cxp = (e.clientX - r.left) * V.dpr, cyp = (e.clientY - r.top) * V.dpr;
      const wm = this.wmHits.find((h) => Math.hypot(h.x - cxp, h.y - cyp) < 16 * V.dpr);
      if (wm) { this.offerWaymark(wm.id, wm.name); return; }
      // Tapping the waypoint again takes it away (a finger has no right button)
      if (this.pin && Math.hypot(this.pin.x - wx, this.pin.z - wz) * V.k / V.dpr < 16) { this.pin = null; this.ctx.sfx('click'); return; }
      if (wx >= WMIN && wz >= WMIN && wx < WMIN + this.ctx.mapImage.width && wz < WMIN + this.ctx.mapImage.height) { this.pin = { x: wx, z: wz }; this.ctx.sfx('click'); }
    });
    c.addEventListener('contextmenu', (e) => { e.preventDefault(); this.pin = null; });
    return c;
  }

  /** A small box over the map: go to this waymark for so many marks? */
  private offerWaymark(id: string, name: string): void {
    const body = this.q('#map-panel .body');
    body.querySelector('.wm-go')?.remove();
    const fare = this.ctx.waymarkFare(id);
    const box = el('div', 'wm-go frame');
    box.innerHTML = fare === null
      ? `<b>${esc(name)}</b><span>You can't travel by waymark just now.</span><div class="row"><button class="btn sm no">Close</button></div>`
      : `<b>${esc(name)}</b><span>Travel there for ${fare} mark${fare === 1 ? '' : 's'}? You have ${this.ctx.save.marks}.</span><div class="row"><button class="btn sm no">Stay</button><button class="btn sm go"${this.ctx.save.marks < fare ? ' disabled' : ''}>Travel</button></div>`;
    box.querySelector('.no')!.addEventListener('click', () => box.remove());
    box.querySelector('.go')?.addEventListener('click', () => { box.remove(); this.ctx.travelWaymark(id); });
    body.append(box);
    this.ctx.sfx('click');
  }

  private renderSettings(): void {
    const body = this.q('#settings-panel .body');
    const st = this.ctx.save.settings;
    const sliders: [keyof typeof st, string, number, number, number][] = [
      ['viewDist', 'View distance', 4, 10, 1],
      ['master', 'Master volume', 0, 1, 0.05], ['sfx', 'Effects', 0, 1, 0.05], ['ambience', 'Ambience', 0, 1, 0.05], ['music', 'Music', 0, 1, 0.05],
      ['renderScale', 'Render scale', 0.5, 1, 0.05],
    ];
    body.innerHTML = sliders.map(([k, label, min, max, step]) => `<div class="setting"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${st[k]}" data-k="${k}"><span class="v">${typeof st[k] === 'number' ? (k === 'dayLength' || k === 'viewDist' ? st[k] : Math.round((st[k] as number) * 100) + '%') : ''}</span></div>`).join('')
      + `<div class="setting"><span>Shadows</span><input type="checkbox" ${st.shadows ? 'checked' : ''} data-k="shadows"><span></span></div>`
      + `<h4 class="sec">Controls</h4><div class="help-grid">
        <kbd>W A S D</kbd><span>Move (relative to the camera)</span>
        <kbd>Mouse drag</kbd><span>Turn the camera · wheel zooms</span>
        <kbd>Shift</kbd><span>Sprint (uses energy)</span>
        <kbd>Space</kbd><span>Jump</span>
        <kbd>Click / 1</kbd><span>Strike · three-hit combo</span>
        <kbd>2</kbd><span>Cleave: spin attack</span>
        <kbd>3</kbd><kbd>4</kbd><kbd>5</kbd><span>Your calling's skills: heal or guard, signature, elite</span>
        <kbd>Q</kbd><span>Dodge roll, invulnerable while rolling</span>
        <kbd>Tab</kbd><span>Target the nearest enemy</span>
        <kbd>G</kbd><span>Call your horse, or get down (halters are sold in the towns)</span>
        <kbd>E</kbd><span>Talk, gather, use, pull in a bite</span>
        <kbd>Enter</kbd><span>Chat, when playing online</span>
        <kbd>F</kbd><span>Eat food</span>
        <kbd>Touch</kbd><span>Left thumb moves · drag elsewhere to look · pinch to zoom · tap the action bar for skills</span>
        <kbd>B / I</kbd><span>Pack</span>
        <kbd>K</kbd><span>Skills</span>
        <kbd>J</kbd><span>Journal</span>
        <kbd>M</kbd><span>Map</span>
        <kbd>Esc</kbd><span>Close windows</span>
      </div>
      ${this.ctx.inMenu ? '' : '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn ghost" data-act="title">Save and quit to character select</button><button class="btn danger" data-act="reset">Delete character</button></div>'}`;
    body.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k as keyof typeof st;
        if (inp.type === 'checkbox') (st as unknown as Record<string, unknown>)[k] = inp.checked;
        else (st as unknown as Record<string, unknown>)[k] = Number(inp.value);
        const v = inp.nextElementSibling as HTMLElement;
        if (v && inp.type !== 'checkbox') v.textContent = k === 'dayLength' || k === 'viewDist' ? inp.value : Math.round(Number(inp.value) * 100) + '%';
        this.ctx.settingsChanged();
      });
    });
    body.querySelector('[data-act="title"]')?.addEventListener('click', () => location.reload());
    body.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
      if (confirm(`Delete ${this.ctx.save.name} and all their progress? This cannot be undone.`)) this.ctx.resetSave();
    });
    this.q('#settings-panel .footer').innerHTML = '<span>Progress saves to this browser automatically</span>';
  }

  showReadable(title: string, text: string): void {
    const p = this.q('#read-panel');
    p.querySelector('h3')!.textContent = title;
    p.querySelector('.body')!.innerHTML = `<div class="paper">${esc(text)}</div>`;
    this.open.add('read');
    p.classList.add('show');
    this.ctx.sfx('open');
  }

  // ------------------------------------------------------------------ Dialogue
  showDialogue(v: DialogueView | null): void {
    const d = this.q('.dlg');
    this.dialogueOpen = !!v;
    if (!v) { d.classList.remove('show'); return; }
    d.classList.add('show');
    if (v.look) drawFace(d.querySelector('.face canvas') as HTMLCanvasElement, v.look);
    d.querySelector('.who')!.innerHTML = `${esc(v.speaker)}${v.title ? `<small>${esc(v.title)}</small>` : ''}`;
    const line = d.querySelector('.line')!;
    line.className = 'line' + (v.narrator ? ' narr' : '');
    line.textContent = v.text;
    const opts = d.querySelector('.opts')!;
    opts.innerHTML = '';
    this.dlgOptions = v.options.map((o, i) => {
      const b = el('button', 'opt' + (o.leave ? ' leave' : ''), `<span class="k">${i + 1}.</span>${esc(o.text)}`);
      b.addEventListener('click', () => this.ctx.dialogueChoose(i));
      opts.append(b);
      return b;
    });
  }

  // ------------------------------------------------------------------ Loading screen
  /** The logo with a loading line under it. The menus themselves are in Frontend. */
  showTitle(loadingText: string): void {
    let t = this.root.querySelector<HTMLElement>('.title-screen');
    if (!t) {
      t = el('div', 'title-screen');
      t.innerHTML = `<div class="logo"><div class="gem"></div><h1>EVER<span>REALM</span></h1><p>EXPLORE<i></i>CRAFT<i></i>BUILD<i></i>BELONG</p></div><div class="loading"></div>`;
      this.root.append(t);
    }
    t.classList.remove('hide');
    this.root.classList.add('hidden-hud');
    t.querySelector('.loading')!.textContent = loadingText;
  }

  hideTitle(): void {
    this.root.querySelector('.title-screen')?.classList.add('hide');
    this.root.classList.remove('hidden-hud');
  }

  /** Hide the in-game HUD (bars, minimap, action bar) behind the menus and the intro. */
  setHudHidden(on: boolean): void {
    this.root.classList.toggle('hidden-hud', on);
  }

  dialogueKey(i: number): boolean {
    if (!this.dialogueOpen) return false;
    if (i < this.dlgOptions.length) { this.ctx.dialogueChoose(i); return true; }
    return false;
  }
}

export function sellPrice(id: string): number {
  return Math.floor(ITEMS[id].value * 0.6);
}
