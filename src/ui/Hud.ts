import './styles.css';
import { SLOT_NAMES } from '../data/armour';
import { DYE_COST, DYE_SLOTS, type DyeChannel, type DyeSlot } from '../data/gearDyes';
import type { Equip } from '../data/items';
import './theme.css';
import { activeSet, GEAR_SETS, gearPoints, ITEMS, RARITY_COLOR, SkillId, type ItemDef } from '../data/items';
import { baseOf, QUALITY } from '../data/gear';
import { levelForXp, MAX_LEVEL, RECIPES, SHOP_STOCK, SKILLS, Station, STATION_NAMES, UNLOCKS, xpForLevel } from '../data/gameplay';
import { places } from '../data/places';
import { continentChart } from '../world/atlas';
import { drawWorldMap } from './worldMap';
import { MAP_SCALE, WMAX, WMAX_X, WMIN, WSIZE } from '../world/VoxelWorld';
import { POSTS } from '../data/travel';
import type { DailyView } from '../game/Dailies';
import type { FestivalView } from '../game/Festivals';
import type { GroupRow, TradeUi } from '../game/Social';
import type { ExchangeView } from '../game/Exchange';
import { MAIL_STACKS, postage, type MailView } from '../game/Mail';
import type { FinderView } from '../game/Dungeons';
import type { MusicView } from '../game/Stage';
import { PART_NAMES, type PartId } from '../data/tunes';
import { HENCHMEN, ROLE_DESC, ROLE_NAMES, ROLES } from '../data/dungeons';
import type { GuildRank, GuildView, HallView } from '../net/Online';
import { HALL_BY_ID, HALL_PROJECTS, PROJECT_BY_ID, type HallId } from '../data/guildhalls';

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
const ACT_COLOR: Record<string, string> = { event: '#ff9a2a', boss: '#e8402e', bossSoon: '#c0786a', shard: '#7fe0f4', task: '#ffd23a', taskDone: '#b8a878', treasure: '#d8402a' };
const ACT_KINDS = new Set(['event', 'boss', 'bossSoon', 'shard', 'task', 'taskDone', 'treasure']);

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
  } else if (kind === 'treasure') {
    // An X on a scrap of parchment
    c.fillStyle = '#e8d8a8'; c.fillRect(-6.5, -6.5, 13, 13); c.strokeRect(-6.5, -6.5, 13, 13);
    c.strokeStyle = ACT_COLOR.treasure; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(-4, -4); c.lineTo(4, 4); c.moveTo(4, -4); c.lineTo(-4, 4); c.stroke();
  } else {
    c.globalAlpha = kind === 'bossSoon' ? 0.75 : 1;
    c.beginPath(); c.arc(0, 0, 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#f4ecd8'; c.beginPath(); c.arc(0, -0.5, 3.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1e1208'; c.fillRect(-2, -1.2, 1.4, 1.4); c.fillRect(0.6, -1.2, 1.4, 1.4);
    c.fillStyle = '#f3d58a'; c.beginPath(); c.moveTo(-5, -5); c.lineTo(-3, -9); c.lineTo(0, -6); c.lineTo(3, -9); c.lineTo(5, -5); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

/** Glyphs for dungeons (a dark gate), delves (a cave mouth), vistas (a peak) and dive sites (an anchor); false for others. */
function placeGlyph(c: CanvasRenderingContext2D, id: string, x: number, y: number, s: number): boolean {
  const kind = id.startsWith('pd-') || id.startsWith('gd-') ? 'pd' : id.startsWith('delve-') ? 'delve' : id.startsWith('vista-') ? 'vista' : id.startsWith('dive-') ? 'dive' : '';
  if (!kind) return false;
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = '#1e1208'; c.lineWidth = 1.6;
  if (kind === 'dive') {
    c.fillStyle = '#3aa8b8';
    c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#f4ecd8'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -4.5); c.lineTo(0, 4.5); c.moveTo(-2.5, -2.5); c.lineTo(2.5, -2.5); c.moveTo(-4, 1.5); c.quadraticCurveTo(0, 6.5, 4, 1.5); c.stroke();
    c.beginPath(); c.arc(0, -5, 1.2, 0, Math.PI * 2); c.stroke();
  } else if (kind === 'vista') {
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

const MAP_TOWNS = new Set(['hollin', 'aldermere', 'cotters', 'waystation', 'woodcamp', 'gullmouth', 'harrowgate', 'coldhearth', 'cragsby', 'holme', 'scarrow']);
import type { Appearance } from '../entities/humanoid';
import type { ColourVision, Inventory, SaveData } from '../game/state';
import { COLOUR_VISION_NAMES } from './colourVision';
import { FESTIVALS } from '../data/festivals';
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
import { CALLINGS, CallingDef, CallingId, callingById, type SkillDef } from '../data/classes';
import { callingCard } from './callingCard';
import { EMOTES } from '../data/emotes';
import { applySkin, drawFace } from './skin';

/** The pack's filter tabs, and which tab a thing belongs under. */
type BagFilter = 'all' | 'gear' | 'food' | 'mat' | 'tool' | 'other';
function bagKind(d: ItemDef): BagFilter {
  if (d.weapon || d.armor || d.jewel || d.unid) return 'gear';
  return d.kind === 'food' ? 'food' : d.kind === 'material' ? 'mat' : d.kind === 'tool' ? 'tool' : 'other';
}

export interface QuestEntry {
  id: string; name: string; notes: string; objectives: { text: string; done?: boolean; dist?: number }[]; done: boolean; story?: boolean;
  /** On the tracker and the map (false: hidden from both in the journal); the one put first; can be given up; points somewhere on the map. */
  tracked?: boolean; focus?: boolean; canAbandon?: boolean; onMap?: boolean;
}
/** How each service shows on the maps: a badge with a letter. */
const SERVICE_LOOK: Record<NonNullable<MapMarker['svc']>, { bg: string; fg: string; letter: string; name: string }> = {
  bank: { bg: '#e8c040', fg: '#2a1a00', letter: 'B', name: 'Bank' },
  craft: { bg: '#8a96a8', fg: '#101418', letter: 'C', name: 'Crafting' },
  shop: { bg: '#5fbf6a', fg: '#0a2410', letter: 'M', name: 'Merchant' },
  stable: { bg: '#b07a48', fg: '#2a1406', letter: 'S', name: 'Stable' },
};

export interface MapMarker { x: number; z: number; kind: 'quest' | 'npc' | 'enemy' | 'elite' | 'poi' | 'player' | 'post' | 'other' | 'event' | 'boss' | 'bossSoon' | 'shard' | 'task' | 'taskDone' | 'treasure' | 'waymark' | 'waymarkDim' | 'fair' | 'giver' | 'ally' | 'service'; label?: string; yaw?: number; id?: string;
  /** A service (kind 'service'): a bank, a place to craft, a merchant, a stable. */
  svc?: 'bank' | 'craft' | 'shop' | 'stable';
  /** An objective's line under its quest's name, and whether it's the focused quest's. */
  sub?: string; focus?: boolean }

/** The tracker for a running event, world boss or Shardfall (see game/Activities.ts). */
export interface EventPanel { kind: 'event' | 'boss' | 'shard' | 'task' | 'escort'; title: string; goal: string; progress: number; count: string; time?: number }
export interface PlateInfo { key: string; x: number; y: number; name: string; sub?: string; kind: 'npc' | 'enemy' | 'elite' | 'player'; hp?: number; mark?: string; targeted?: boolean }
export interface DialogueView { speaker: string; title: string; text: string; narrator: boolean; look?: Appearance; options: { text: string; leave?: boolean }[] }

export interface FeatView { id: string; name: string; group: string; desc: string; have: number; need: number; done: boolean; marks: number; title: string; worn: boolean }

/** One skill as the Skills page shows it. */
export interface SkillCard { id: string; name: string; base: string; icon: string; desc: string; kind: string; need: number; open: boolean; unlocked: boolean; free: boolean; rank: number; uses: number; next: number | null; from: number; morph: 'a' | 'b' | null; morphs: { key: 'a' | 'b'; name: string; desc: string }[] }
export interface SkillsView {
  pool: { total: number; left: number; insight: number; skills: number; morphs: number; talents: number };
  temple: boolean; respec: number;
  calling: SkillCard[]; utilities: SkillCard[]; weapons: SkillCard[];
}

/** The talent screen's view of a calling's trees (game/Game.ts talentView). */
export interface TalentView {
  points: number; total: number; level: number;
  calling: { name: string; role: string; color: string; icon: string; mechanic: string };
  fighting: boolean;
  trees: { id: string; name: string; desc: string; icon: string; spent: number; gate: number; bar: string[]; talents: { id: string; name: string; desc: string; tier: number; ranks: number; rank: number; capstone: boolean; why: string | null; icon: string }[] }[];
  builds: ({ name: string; sum: string; on: boolean } | null)[];
}

/** What the crafting window shows besides the recipes themselves. */
export interface CraftView {
  region: string | null;
  kinds: { kind: 'w' | 'a'; known: string[]; researching: { affix: string; word: string; mins: number }[]; slots: number }[];
  apart: { id: string; name: string; kind: 'w' | 'a'; affix: string; word: string; known: boolean }[];
  recipes: Record<string, { known: boolean; colour: 'orange' | 'yellow' | 'green' | 'grey'; word: string; xp: number; block: string | null }>;
}

export interface UiCtx {
  save: SaveData;
  inv: Inventory;
  level(s: SkillId): number;
  useSlot(i: number): void;
  /** Tidy the pack: stacks together, in order. */
  sortPack(): void;
  daily(): DailyView;
  festival(): FestivalView;
  /** The trade on the table, if any, and what to do with it. */
  trade(): TradeUi | null;
  tradeAdd(id: string, n?: number): void;
  tradeRemove(i: number): void;
  tradeMarks(n: number): void;
  tradeLock(): void;
  tradeAccept(): void;
  tradeCancel(): void;
  /** The guild panel: your guild (null: none), whether you're online at all, and what you can do. */
  guild(): { view: GuildView | null; online: boolean };
  guildDo(what: 'found' | 'leave' | 'kick' | 'rank' | 'motto', a?: string, b?: string): void;
  /** Your guild's hall (null: none heard, or offline), and what you can do about it. */
  hall(): HallView | null;
  hallDo(what: 'give' | 'vault' | 'pick' | 'go' | 'leave', a?: string | null, n?: number): void;
  /** Friends: the list (with where each online one is), and what to do with one. */
  friends(): { rows: { name: string; online: boolean; where: string | null }[]; online: boolean };
  friendDo(what: 'add' | 'remove' | 'whisper' | 'invite', name: string): void;
  /** The group frame's buttons: leave, or (leading) promote or remove someone. */
  groupDo(what: 'leave' | 'promote' | 'kick' | 'whisper', name?: string): void;
  /** Leading the group (for the frame's menu). */
  groupLeader(): boolean;
  claimLogin(): void;
  /** Down and waiting for help: give up waiting and come round at the usual place. */
  respawnNow(): void;
  feats(): FeatView[];
  /** The library: every lore book, shelf by shelf, and which you've read (data/lorebooks.ts). */
  library(): { shelf: string; books: { id: string; title: string; where: string; read: boolean }[] }[];
  readBook(id: string): void;
  /** The factions: which you've joined, your rank, and what's next (data/factions.ts). */
  factions(): { id: string; name: string; where: string; blurb: string; join: string; rank: string | null; rankIdx: number; ranks: string[]; next: string | null; open: boolean }[];
  /** Standing in each region (data/standing.ts). */
  standing(): { id: string; name: string; points: number; rank: string; off: number; from: number; next: { name: string; at: number; off: number } | null }[];
  calling(): CallingId;
  /** The calling's talent trees: points to spend, and each talent's state (why it can't be learned yet, if not). */
  talents(): TalentView;
  /** Mastery past level 100 (data/mastery.ts): points earned and spent, the three sets; a point into a passive, or (at a temple) all back. */
  mastery(): MasteryView;
  /** The journal's bestiary: every creature of the wilds, with how many you've killed (data/bestiary.ts). */
  bestiary(): { tiers: readonly number[]; entries: BestiaryEntry[] };
  masterySpend(id: string): string | null;
  /** Skills (ESO's): unlocked with points, ranked by use, morphed at rank IV (game/Game.ts skillsView). */
  skillsView(): SkillsView;
  unlockSkill(id: string): string | null;
  morphSkill(id: string, which: 'a' | 'b'): string | null;
  /** Builds: save what's learned (and the utilities) into slot i, or put slot i's back. */
  saveBuild(i: number): string | null;
  loadBuild(i: number): string | null;
  learnTalent(id: string): string | null;
  resetTalents(): string | null;
  /** The bar: the two utilities chosen, the three to choose from, the signature, heal and elite, and the weapon skill. */
  bar(): { chosen: string[]; pool: SkillDef[]; cross: string[]; signature: SkillDef; heal: SkillDef; elite: SkillDef; elites: SkillDef[]; weapon: SkillDef };
  setUtilities(ids: string[]): string | null;
  setElite(id: string): string | null;
  /** Change calling; returns why it can't be done, or null. */
  setCalling(id: CallingId): string | null;
  /** Whether this character still has its one change of calling (characters from before callings were for life). */
  callingFree(): boolean;
  /** The calling you're apprenticed to, and the master who taught you. */
  apprentice(): { name: string; master: string } | null;
  /** Wear a feat's title (null for none). */
  wearTitle(id: string | null): void;
  unequip(slot: keyof Equip): void;
  /** Armour dyes (data/gearDyes.ts): what's on each slot, the dyes you have, and dyeing a channel. */
  gearDyes(): Record<DyeSlot, { main?: string; trim?: string }>;
  dyePalette(): { name: string; hex: string }[];
  dyeGear(slot: DyeSlot, channel: DyeChannel, hex: string | null): void;
  /** The armour worn: what it takes off a hit, the weights and what they do, the set in force. */
  armourSummary(): { defense: number; weights: string; set: string | null };
  /** The backpack you wear (null: none yet), and hiding or showing it. */
  packInfo(): { name: string; slots: number; hidden: boolean } | null;
  togglePack(): void;
  /** Helm and gloves drawn or hidden (they guard you either way). */
  gearShown(): { head: boolean; hands: boolean };
  /** Horsemanship rank, and blocks to the next (null at the top). */
  ridingInfo(): { rank: number; next: number | null };
  toggleGearShown(slot: 'head' | 'hands'): void;
  dropSlot(i: number): void;
  craft(recipe: string, count: number, opts?: { affix?: string; q?: number }): void;
  /** The crafting window's state (game/Game.ts craftView): known recipes and their colours, leanings, research. */
  craftView(): CraftView;
  craftCost(recipe: string, opts: { affix?: string; q?: number }): Record<string, number>;
  /** Take a piece apart at the anvil to research its leaning: why not, or null. */
  takeApart(id: string): string | null;
  /** A craft's passives (data/crafting.ts), and spending a point on one. */
  passivesOf(craft: SkillId): { points: number; list: { id: string; name: string; ranks: number; rank: number; desc: string[] }[] };
  learnPassive(id: string): string | null;
  buy(item: string): void;
  sell(slot: number): void;
  /** Buy one back of the i-th thing on the buy-back list (ShopView.buyback). */
  buyBack(i: number): void;
  quests(): QuestEntry[];
  trackQuest(id: string, on: boolean): void;
  focusQuest(id: string | null): void;
  showQuestOnMap(id: string): void;
  abandonQuest(id: string): void;
  dialogueChoose(i: number): void;
  settingsChanged(): void;
  sfx(name: 'click' | 'open' | 'close' | 'page'): void;
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
  /** The explored map of Morrow's half of the world, once any of it has been seen. */
  mapImageEast: HTMLCanvasElement | null;
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
  /** Whether a shop's item can be tried on (worn, or a mount led out beside you), and trying it. */
  canPreview(id: string): boolean;
  previewItem(id: string): void;
  /** The Exchange's book (game/Exchange.ts). */
  exchange(): ExchangeView;
  exBuy(id: number): void;
  exPost(item: string, n: number, price: number): void;
  exTakeBack(id: number): void;
  exWant(item: string, n: number, price: number): void;
  exFill(id: number): void;
  exUnwant(id: number): void;
  exReload(): void;
  /** Take your stall down (its stock comes back to your pack). */
  exStallDown(): void;
  /** Letters by the Charter Post (game/Mail.ts). */
  mail(): MailView;
  mailDo(what: 'read' | 'back' | 'write' | 'reply' | 'attach' | 'send' | 'take' | 'delete' | 'return' | 'reload', id?: number, item?: string, n?: number): void;
  /** The Group Finder (game/Dungeons.ts). */
  finder(): FinderView;
  /** The songbook: instruments, tunes, the band (game/Stage.ts). */
  music(): MusicView;
  musicDo(what: 'take' | 'away' | 'play' | 'stop' | 'part' | 'strike', arg?: string): void;
  finderDo(what: 'role' | 'hench' | 'find' | 'now' | 'cancel' | 'leave' | 'vet' | 'rhench' | 'rfind' | 'wbfind' | 'wbstop', id?: string): string | null;
}

export interface TravelView {
  from: string;
  /** How each stop is reached from here: the cart along the roads, a boat crossing, or the ferry (pinned on the map). */
  stops: { id: string; name: string; fare: number; note: string; by: 'ride' | 'cross' | 'ferry'; known: boolean; here: boolean }[];
}

export interface ShopView {
  name: string;
  /** First name used in price lines, e.g. "Tamsin offers 6 each". */
  who: string;
  stock: { item: string; price: number }[];
  sellPrice(id: string): number;
  /** What you've sold lately, newest first, to buy back at what you got for it. */
  buyback: { id: string; n: number; price: number }[];
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
/** How long ago, roughly: 'just now', '5 min ago', '3 h ago', '2 days ago'. */
const ago = (t: number) => { const s = (Date.now() - t) / 1000; return s < 90 ? 'just now' : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 129600 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} days ago`; };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface MasteryView {
  open: boolean; earned: number; next: number | null; spent: number; left: number; temple: boolean;
  sets: { id: string; name: string; blurb: string; icon: string; color: string; passives: { id: string; name: string; n: number; cap: number; now: string; at: string }[] }[];
}

export interface BestiaryEntry { type: string; name: string; level: number; where: string[]; kills: number; how: string; loot: string[]; note?: string }

export type PanelId = 'inv' | 'skills' | 'talents' | 'journal' | 'craft' | 'shop' | 'map' | 'settings' | 'read' | 'travel' | 'trade' | 'guild' | 'exchange' | 'finder' | 'music' | 'mail';

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
  /** Buildings' names, shown on the minimap at the two closest zooms (GameWorld.buildingLabels). */
  mapLabels: { x: number; z: number; text: string }[] = [];
  private mmRotate = false;
  /** Listening for full screen ending (Esc, F11), so the Settings box stays right. */
  private fsWatch = false;
  private eventEl!: HTMLElement;
  private eventKey = '';
  /** Attuned waymarks where they were last drawn on the world map (canvas pixels), for clicks. */
  private wmHits: { x: number; y: number; id: string; name: string }[] = [];
  /** The world map's view (centre, canvas pixels per block, zoom limits), hover point and hidden icon kinds. */
  private mapView = { cx: 1024, cz: 1024, k: 1, kMin: 0.2, kMax: 7, dpr: 1, fresh: true, world: false, hover: null as { x: number; y: number } | null, hits: [] as { x: number; y: number; name: string; sub: string }[], hidden: new Set<string>() };
  /** A waypoint the player dropped on the map; it shows on the minimap too. */
  pin: { x: number; z: number } | null = null;
  private portrait!: HTMLCanvasElement;
  open = new Set<PanelId>();
  private selQuest = '';
  /** The talent tree open on the Calling page (by index), or -1 for the one with the most points in it. */
  private talTree = -1;
  private openSkill: SkillId | null = null;
  private shopTab: 'buy' | 'sell' | 'back' = 'buy';
  /** The Exchange panel: which page, what's typed in the search, the stack being priced. */
  private exTab: 'buy' | 'sell' | 'want' = 'buy';
  /** The Wanted page's order form: the search, and the item picked. */
  private exWantQuery = '';
  private exWantPick: string | null = null;
  /** The dungeon the Group Finder shows first (the door you came to). */
  finderAt: string | null = null;
  private exQuery = '';
  private exSell: string | null = null;
  private dlgOptions: HTMLButtonElement[] = [];
  private dragFrom = -1;
  /** Your character in the pack (ui/Doll.ts): the canvas it's drawn into, and which way it faces. */
  dollCanvas: HTMLCanvasElement | null = null;
  dollYaw = 0.45;
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
      <div class="bar hp"><i class="lag"></i><i class="fill"></i><b></b></div><div class="bar en" title="Stamina: running, the dodge, the guard and the body's skills"><i></i><b></b></div><div class="bar mg" title="Magicka: what spells are paid in"><i></i><b></b></div></div>`;
    r.append(pf);
    this.portrait = pf.querySelector('canvas')!;

    const tf = el('div', 'unit frame hud-only');
    tf.id = 'target-frame';
    tf.innerHTML = `<div class="portrait"><span class="tl">3</span></div><div class="info"><div class="name"><span class="tn"></span><small class="ts"></small></div><div class="bar hp"><i class="fill"></i><b></b></div><div class="castbar"><i></i><b></b></div></div>`;
    r.append(tf);

    const boss = el('div', 'hud-only'); boss.id = 'bossbar';
    boss.innerHTML = '<div class="bb-head"><b class="bb-name"></b><span class="bb-rage">Enraged</span><small class="bb-lvl"></small></div><div class="bb-bar"><i class="bb-fill"></i><i class="bb-mark"></i><span class="bb-num"></span></div><div class="bb-stagger" title="Stagger: stuns and knockdowns fill it; full, it reels"><i></i></div><div class="castbar"><i></i><b></b></div>';
    r.append(boss);
    const hurt = el('div', ''); hurt.id = 'hurt'; r.prepend(hurt);
    const evp = el('div', 'event-panel frame hud-only');
    evp.innerHTML = '<div class="ev-kind"></div><div class="ev-title"></div><div class="ev-goal"></div><div class="bar ev"><i></i><b></b></div><div class="ev-time"></div>';
    r.append(evp);
    this.eventEl = evp;
    const mmw = el('div', 'minimap-wrap hud-only');
    mmw.innerHTML = `<div class="zone-label">Hollindale</div><div class="minimap" title="Click to open the map (M)"><canvas width="352" height="352"></canvas><button class="mm-b mm-in" title="Zoom in">+</button><button class="mm-b mm-out" title="Zoom out">−</button><button class="mm-b mm-rot" title="Turn the map with the camera">⟲</button></div><div class="mm-row"><span class="clock">08:30</span><span class="daypart">Morning</span><span class="net"></span></div><div class="mm-mail" title="Letters waiting at the Charter Post"><img alt=""><b></b></div>`;
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
    window.addEventListener('resize', () => { this.stackTracker(); this.fitChat(); });
    // The bar's width changes with the calling and the screen: keep the chat clear of it
    setInterval(() => this.fitChat(), 1000);

    this.buildChat();
    const ab = el('div', 'hud-only'); ab.id = 'actionbar';
    const slot = (i: number, k: string, key: string, t: string) => `<div class="ab-slot" data-ab="${i}" title="${t} (${key})"><img src="${abilityIcon(k)}" alt=""><span class="key">${key}</span><div class="cd"></div><div class="cdt"></div></div>`;
    ab.innerHTML = `<div id="xpbar" title="Your level: earned by fighting and by quests"><div id="skillxp"><span></span><div class="bar"><i></i><b></b></div></div><div class="label">Level 1</div><div class="bar xp"><i></i><b></b></div></div>
      <div id="ab-gauge"><i></i><span></span></div>
      <div class="ab-plate frame">
        ${[['strike', '1', 'Strike'], ['cleave', '2', 'Cleave'], ['riposte', '3', 'Weapon skill']].map(([k, key, t], i) => slot(i, k, key, t)).join('')}
        <div class="ab-sep"></div>
        ${slot(3, 'dressing', '4', 'Heal')}
        <div class="ab-sep"></div>
        ${[5, 6, 7].map((key, j) => slot(4 + j, 'strike', String(key), 'Utility')).join('')}
        <div class="ab-sep"></div>
        ${slot(7, 'star', '8', 'Elite')}
        <div class="ab-sep"></div>
        ${slot(8, 'roll', 'Q', 'Dodge roll')}
        <div class="ab-slot" data-ab="9" title="Eat the best food you're carrying (F)"><img src="${abilityIcon('eat')}" alt=""><span class="key">F</span><span class="count"></span><div class="cd"></div><div class="cdt"></div></div>
        <div class="ab-sep"></div>
        <div class="menu-btns">
          <button class="menu-btn" data-p="inv">B<small>Bag</small></button>
          <button class="menu-btn" data-p="skills">K<small>Skills</small></button>
          <button class="menu-btn" data-p="talents" title="Talents and builds (T)">T<small>Talents</small></button>
          <button class="menu-btn" data-p="journal">J<small>Journal</small></button>
          <button class="menu-btn" data-p="map">M<small>Map</small></button>
          <button class="menu-btn" data-p="finder" title="Group Finder: dungeons, with a group or henchmen (P)">P<small>Group</small></button>
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
    const death = el('div', '', '<h2>Knocked out</h2><p class="dt-where">You come round on a bench under the Moot Oak.</p><p class="dt-wait"></p><button class="btn dt-up">Come round now</button>'); death.id = 'death'; r.append(death);
    death.querySelector('.dt-up')!.addEventListener('click', () => this.ctx.respawnNow());
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
    panel('talents-panel', 'Talents', 'talents');
    panel('craft-panel', 'Crafting', 'craft');
    panel('shop-panel', 'Tamsin\'s Stall', 'shop');
    panel('map-panel', 'The Everrealm', 'map');
    panel('settings-panel', 'Menu', 'settings');
    panel('read-panel', '', 'read');
    panel('travel-panel', 'Charter Post', 'travel');
    // Closing the trade window by hand calls the trade off
    panel('trade-panel', 'Trade', 'trade').querySelector('.x')!.addEventListener('click', () => this.ctx.tradeCancel());
    panel('guild-panel', 'Friends', 'guild');
    panel('exchange-panel', 'The Exchange', 'exchange');
    panel('mail-panel', 'The Charter Post', 'mail');
    panel('finder-panel', 'Group Finder', 'finder');
    panel('music-panel', 'Songbook', 'music');
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

  /** The meals, drinks and states working on you, under your health bar. */
  private buffKey = '';
  setBuffs(list: { name: string; left: number; kind: string }[]): void {
    const key = list.map((b) => b.name + (b.kind === 'harm' ? Math.ceil(b.left) : Math.ceil(b.left / 60))).join('|');
    if (key === this.buffKey) return;
    this.buffKey = key;
    let box = document.getElementById('buffs');
    if (!box) { box = el('div', 'hud-only'); box.id = 'buffs'; this.root.append(box); }
    box.innerHTML = list.map((b) => `<span class="bf ${b.kind}">${esc(b.name)}${b.left > 0 ? ` <i>${b.kind === 'harm' ? Math.ceil(b.left) + 's' : Math.ceil(b.left / 60) + 'm'}</i>` : ''}</span>`).join('');
  }

  setPlayer(name: string, level: number, hp: number, maxHp: number, energy: number, magicka = 100): void {
    this.q('#player-frame .pn').textContent = name;
    const lv = this.q('#player-frame .lvl');
    if (lv.textContent !== String(level)) { lv.textContent = String(level); lv.title = `Level ${level}`; }
    const pct = Math.max(0, hp / maxHp) * 100;
    (this.q('#player-frame .bar.hp .fill') as HTMLElement).style.width = pct + '%';
    (this.q('#player-frame .bar.hp .lag') as HTMLElement).style.width = pct + '%';
    this.q('#player-frame .bar.hp b').textContent = `${Math.ceil(hp)} / ${maxHp}`;
    (this.q('#player-frame .bar.en i') as HTMLElement).style.width = energy + '%';
    (this.q('#player-frame .bar.mg i') as HTMLElement).style.width = magicka + '%';
  }

  /** A cast bar (the target's, the boss's): what it's gathering and how far, gold if a stun would break it. */
  private fillCast(bar: HTMLElement, c: { label: string; k: number; breakable: boolean } | null | undefined): void {
    bar.classList.toggle('show', !!c);
    if (!c) return;
    bar.classList.toggle('breakable', c.breakable);
    (bar.firstElementChild as HTMLElement).style.width = c.k * 100 + '%';
    bar.lastElementChild!.textContent = c.breakable ? c.label + ' · stun to break' : c.label;
  }

  setTarget(t: { name: string; level: number; hp: number; max: number; elite?: boolean; friendly?: boolean; sub?: string; cast?: { label: string; k: number; breakable: boolean } | null } | null): void {
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
    this.fillCast(this.q('#target-frame .castbar'), t.cast);
  }

/** The level bar over the action bar: your level, always (the trades show their own, briefly, above it). */
  setXpBar(xp: number): void {
    const lv = levelForXp(xp, 'melee');
    const a = xpForLevel(lv, 'melee'), b = xpForLevel(lv + 1, 'melee');
    const top = lv >= MAX_LEVEL;
    this.q('#xpbar > .label').textContent = `Level ${lv}`;
    (this.q('#xpbar > .bar > i') as HTMLElement).style.width = (top ? 100 : ((xp - a) / (b - a)) * 100) + '%';
    this.q('#xpbar > .bar > b').textContent = top ? 'The highest level there is' : `${(xp - a).toLocaleString()} / ${(b - a).toLocaleString()} XP`;
  }

  /** A trade's progress, shown for a few seconds over the level bar when it earns experience. */
  skillXp(skill: SkillId, xp: number): void {
    const s = SKILLS.find((k) => k.id === skill)!;
    const lv = levelForXp(xp, skill), a = xpForLevel(lv, skill), b = xpForLevel(lv + 1, skill);
    const box = this.q('#skillxp');
    box.querySelector('span')!.textContent = `${s.name} ${lv}`;
    const fill = box.querySelector('i') as HTMLElement;
    fill.style.width = (lv >= MAX_LEVEL ? 100 : ((xp - a) / (b - a)) * 100) + '%';
    fill.style.background = `linear-gradient(#ffffff55 0 2px, ${s.color} 2px 65%, #00000040 65%)`;
    box.querySelector('b')!.textContent = lv >= MAX_LEVEL ? 'Mastered' : `${(xp - a).toLocaleString()} / ${(b - a).toLocaleString()}`;
    box.classList.add('show');
    clearTimeout(this.skillXpT);
    this.skillXpT = window.setTimeout(() => box.classList.remove('show'), 4500);
  }
  private skillXpT = 0;

  /** locked: the level a key opens at; -1, open but not unlocked with a skill point yet. */
  setAbilities(cds: { left: number; total: number; disabled?: boolean; count?: number; locked?: number; cost?: { pool: string; n: number } | null }[]): void {
    this.root.querySelectorAll<HTMLElement>('.ab-slot').forEach((s, i) => {
      const c = cds[i];
      if (!c) return;
      // Not yet learned: dark, with the level it comes at
      const lockText = c.locked === -1 ? 'T' : c.locked ? `Lv ${c.locked}` : '';
      if ((s.dataset.lock ?? '') !== lockText) { s.dataset.lock = lockText; s.classList.toggle('locked', !!c.locked); }
      const p = c.total > 0 ? Math.max(0, c.left / c.total) : 0;
      (s.querySelector('.cd') as HTMLElement).style.setProperty('--p', String(p));
      (s.querySelector('.cdt') as HTMLElement).textContent = c.left > 0.05 && c.total > 1.5 ? Math.ceil(c.left).toString() : '';
      s.classList.toggle('disabled', !!c.disabled);
      const cnt = s.querySelector('.count');
      if (cnt) cnt.textContent = c.count ? String(c.count) : '';
      // The price on the corner: blue for magicka, green for stamina, red for blood
      const pk = c.cost && !c.locked ? `${c.cost.pool}:${c.cost.n}` : '';
      if ((s.dataset.pip ?? '') !== pk) {
        s.dataset.pip = pk;
        let pip = s.querySelector<HTMLElement>('.pip');
        if (!pk) pip?.remove();
        else {
          if (!pip) { pip = document.createElement('i'); s.append(pip); }
          pip.className = 'pip ' + c.cost!.pool;
          pip.textContent = c.cost!.pool === 'health' ? c.cost!.n + '%' : String(c.cost!.n);
          pip.title = `${c.cost!.n}${c.cost!.pool === 'health' ? '% of your health' : ' ' + c.cost!.pool}`;
        }
      }
    });
  }

/** Put the weapon skill on key 3 and the calling's bar on 4 to 8 (heal, three utilities, elite), and colour its gauge. */
  setCalling(c: CallingDef, bar: SkillDef[], weapon: SkillDef, second: SkillDef | null = null): void {
    const slots = this.root.querySelectorAll<HTMLElement>('.ab-slot');
    // Key 2: the weapon's own skill, or Cleave
    const two = slots[1];
    if (two) {
      two.querySelector('img')!.src = abilityIcon(second ? second.icon : 'cleave');
      two.title = second ? `${second.name} (2) · Weapon skill: ${second.desc}` : 'Cleave (2): a wide swing at everything in front of you.';
    }
    [weapon, ...bar].forEach((sk, j) => {
      const s = slots[2 + j];
      if (!s) return;
      s.querySelector('img')!.src = abilityIcon(sk.icon);
      const kind = j === 0 ? 'Weapon skill' : j === 1 ? 'Heal' : j === 5 ? 'Elite' : 'Utility';
      s.title = `${sk.name} (${3 + j}) · ${kind}${sk.aim ? ', aimed at the ground' : ''}: ${sk.desc}`;
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
    // On a touch screen the prompt itself is the button (TouchControls)
    const k = key === 'E' && document.body.classList.contains('touch') ? 'Tap' : key;
    p.innerHTML = `<kbd>${k}</kbd><span>${esc(text)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}${warn ? `<span class="warn">${esc(warn)}</span>` : ''}`;
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
  chat(from: string, text: string, kind: 'say' | 'emote' | 'local' | 'trade' | 'group' | 'guild' | 'whisper' | 'whisperTo' = 'say'): void {
    this.chatLine('chat', kind === 'emote' ? `<i><b>${esc(from)}</b> ${esc(text)}</i>`
      : kind === 'local' ? `<b>[Nearby] ${esc(from)}:</b> ${esc(text)}`
      : kind === 'trade' ? `<b>[Trade] ${esc(from)}:</b> ${esc(text)}`
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
    box.innerHTML = '<h6>Group <button class="gleave" title="Leave the group">Leave</button></h6>' + rows.map((m) => `<div class="gm${m.me ? ' me' : ''}${m.hench ? ' hench' : ''}${m.near ? '' : ' far'}" data-n="${esc(m.name)}" title="${m.hench ? 'A henchman, with you for this dungeon' : m.near ? 'Click for options' : 'Too far away to share in the group bonus'}"><div class="gn">${m.leader ? '<span class="crown">♛</span>' : ''}${esc(m.name)}<small>${m.level}${m.calling ? ' · ' + esc(m.calling[0].toUpperCase() + m.calling.slice(1)) : ''}</small></div><div class="bar hp"><i class="fill" style="width:${Math.max(0, Math.min(100, (m.hp / Math.max(1, m.max)) * 100))}%"></i></div></div>`).join('');
    const henchOnly = rows.every((m) => m.me || m.hench);
    box.querySelector('.gleave')!.addEventListener('click', () => this.ask(henchOnly ? 'Leave the dungeon? Your henchmen go home.' : 'Leave the group?', () => this.ctx.groupDo('leave'), () => {}, 30));
    box.querySelectorAll<HTMLElement>('.gm:not(.me):not(.hench)').forEach((row) => row.addEventListener('click', (e) => {
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

  /**
   * The guild's hall (data/guildhalls.ts): where it is and the way there, the wings built, and the one
   * being built with what it still wants, each line with what you've got to give toward it. Officers
   * choose the next wing and can pay from the vault; the leader can give the hall up.
   */
  private renderHall(): void {
    const body = this.q('#guild-panel .body');
    const foot = this.q('#guild-panel .footer');
    const { view: g, online } = this.ctx.guild();
    const v = this.ctx.hall();
    this.q('#guild-panel h3').textContent = g?.name ?? 'Guild hall';
    foot.innerHTML = '';
    if (!online || !g) {
      body.innerHTML = `<p class="gnote">${!online ? 'Guild halls are on the online realm. You\'re playing offline.' : 'A hall is a guild\'s. Found a guild, or join one, first.'}</p>`;
      return;
    }
    if (!v) { body.innerHTML = '<p class="gnote">Asking after the hall…</p>'; return; }
    const officer = v.rank === 'leader' || v.rank === 'officer';
    const hall = v.hall ? HALL_BY_ID.get(v.hall as HallId) : null;
    if (!hall) {
      body.innerHTML = `<p class="gnote">${esc(g.name ?? "Your guild")} has no hall. Walter Pinnock, Clerk of the Halls, lets the old company halls on Hall Row, outside Ansbury's south gate, for ${v.lease.toLocaleString()} marks from the guild vault. ${officer ? 'As an officer you can take the lease: see him at his desk at the head of the lane.' : 'An officer or the leader takes the lease.'}</p>
        <div class="gcount">The vault holds ${v.vaultMarks.toLocaleString()} marks · ${v.free.length} of 8 halls free</div>`;
      return;
    }
    const name = (id: string) => ITEMS[id]?.name ?? id;
    const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
    const built = HALL_PROJECTS.filter((pr) => v.built.includes(pr.id));
    const cur = v.project ? PROJECT_BY_ID.get(v.project as never) : null;
    let html = `<div class="hall-head"><b>${esc(cap(hall.name))}</b><span>Hall Row, outside Ansbury's south gate</span><button class="btn sm hgo">Go to the hall</button></div>`;
    html += `<div class="hall-built">${HALL_PROJECTS.map((pr) => `<span class="${v.built.includes(pr.id) ? 'on' : ''}${pr.id === v.project ? ' cur' : ''}" title="${esc(pr.perk)}">${esc(pr.name)}</span>`).join('')}</div>`;
    if (cur) {
      const cost = v.costs[cur.id], got = v.got[cur.id] ?? {};
      const line = (item: string | null) => {
        const need = item ? cost.items[item] : cost.marks, have = item ? got[item] ?? 0 : got.marks ?? 0, left = Math.max(0, need - have);
        const mine = item ? this.ctx.inv.count(item) : this.ctx.save.marks;
        const pct = Math.min(100, Math.round((have / need) * 100));
        return `<div class="hall-need${left ? '' : ' done'}"><div class="nm">${item ? `<img src="${itemIcon(item)}" alt="">${esc(name(item))}` : 'Marks'}</div><div class="bar"><i style="width:${pct}%"></i><span>${have.toLocaleString()} / ${need.toLocaleString()}</span></div>${left ? `<button class="btn sm" data-give="${item ?? ''}" data-n="${Math.min(left, item ? mine : Math.min(mine, 500))}"${mine > 0 ? '' : ' disabled'}>Give ${Math.min(left, item ? mine : Math.min(mine, 500)).toLocaleString()}</button>${officer ? `<button class="btn ghost sm" data-vault="${item ?? ''}" data-n="${left}" title="Pay it from the guild vault">From the vault</button>` : ''}` : '<span class="ok">Enough</span>'}</div>`;
      };
      html += `<div class="hall-proj"><b>Building: ${esc(cur.name)}</b><p>${esc(cur.blurb)} <i>${esc(cur.perk)}</i></p>${Object.keys(cost.items).map((k) => line(k)).join('')}${line(null)}</div>`;
    } else if (built.length < HALL_PROJECTS.length) {
      html += `<p class="gnote">Nothing is being built. ${officer ? 'Choose what the guild builds next:' : 'An officer chooses what the guild builds next.'}</p>`;
      if (officer) html += HALL_PROJECTS.filter((pr) => !v.built.includes(pr.id)).map((pr) => {
        const c = v.costs[pr.id];
        const what = [...Object.entries(c.items).map(([k, n]) => `${n} ${name(k).toLowerCase()}`), `${c.marks.toLocaleString()} marks`].join(', ');
        return `<div class="hall-pick"><div><b>${esc(pr.name)}</b><p>${esc(pr.blurb)} <i>${esc(pr.perk)}</i></p><small>${esc(what)}</small></div><button class="btn sm" data-pick="${pr.id}">Build this next</button></div>`;
      }).join('');
    } else html += '<p class="gnote">Every wing of the hall is built.</p>';
    if (v.honour.length) html += `<p class="gnote">On the roll of honour${v.built.includes('honour') ? '' : ' (once the board is up)'}: ${v.honour.map(esc).join(', ')}.</p>`;
    body.innerHTML = html;
    body.querySelector('.hgo')!.addEventListener('click', () => this.ctx.hallDo('go'));
    body.querySelectorAll<HTMLButtonElement>('[data-give]').forEach((b) => b.addEventListener('click', () => this.ctx.hallDo('give', b.dataset.give || null, Number(b.dataset.n))));
    body.querySelectorAll<HTMLButtonElement>('[data-vault]').forEach((b) => b.addEventListener('click', () => this.ctx.hallDo('vault', b.dataset.vault || null, Number(b.dataset.n))));
    body.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) => b.addEventListener('click', () => this.ctx.hallDo('pick', b.dataset.pick)));
    foot.innerHTML = `<span>The vault holds ${v.vaultMarks.toLocaleString()} marks</span>${v.rank === 'leader' ? '<button class="btn ghost sm hleave">Give up the hall</button>' : ''}`;
    foot.querySelector('.hleave')?.addEventListener('click', () => this.ask(`Give up ${hall.name}? The lease isn't refunded, and everything built in it goes with it.`, () => this.ctx.hallDo('leave'), () => {}, 30));
  }

  /** The social panel (O) opens on Friends, Guild or the guild's Hall. */
  private socialTab: 'friends' | 'guild' | 'hall' = 'friends';
  /** Open the social panel on this page next time it's shown. */
  socialPage(t: 'friends' | 'guild' | 'hall'): void { this.socialTab = t; }
  private renderGuild(): void {
    const panel = this.q('#guild-panel');
    let tabs = panel.querySelector<HTMLElement>('.stabs');
    if (!tabs) {
      tabs = el('div', 'stabs', '<button data-st="friends">Friends</button><button data-st="guild">Guild</button><button data-st="hall">Hall</button>');
      panel.querySelector('.body')!.before(tabs);
      tabs.querySelectorAll<HTMLElement>('[data-st]').forEach((b) => b.addEventListener('click', () => { this.socialTab = b.dataset.st as 'friends' | 'guild' | 'hall'; this.ctx.sfx('click'); this.renderGuild(); }));
    }
    tabs.querySelectorAll<HTMLElement>('[data-st]').forEach((b) => b.classList.toggle('sel', b.dataset.st === this.socialTab));
    if (this.socialTab === 'friends') { this.renderFriends(); return; }
    if (this.socialTab === 'hall') { this.renderHall(); return; }
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
      <h6 class="tpack-h">Your pack: click something to put it on the table <label class="tamt">Amount <input type="number" min="1" step="1" placeholder="all" value="${this.tradeAmount ?? ''}"></label></h6>
      <div class="tpack">${t.pack.map((s) => `<div class="tslot r-${ITEMS[s.id]?.rarity ?? 'common'}" data-add="${s.id}" title="${esc(ITEMS[s.id]?.name ?? s.id)}"><img src="${itemIcon(s.id)}" alt="">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}</div>`).join('') || '<em>Nothing in your pack that can be traded.</em>'}</div>
      <p class="tnote">Changing either side unlocks both. When both of you have locked, accept.</p>`;
    if (!t.myLock) {
      // How many go on the table from a stack: the amount typed, or the lot
      const amt = body.querySelector<HTMLInputElement>('.tamt input');
      if (amt) { amt.addEventListener('keydown', (e) => e.stopPropagation()); amt.addEventListener('input', () => { const v = Math.floor(Number(amt.value)); this.tradeAmount = v > 0 ? v : null; }); }
      body.querySelectorAll<HTMLElement>('[data-add]').forEach((e) => e.addEventListener('click', () => this.ctx.tradeAdd(e.dataset.add!, this.tradeAmount ?? undefined)));
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
    this.fitChat();
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

  /** The knocked-out screen; wait is the seconds left to be helped up, when there's anyone near to do it. */
  setDeath(on: boolean, wait = 0): void {
    const d = this.q('#death');
    d.classList.toggle('show', on);
    d.classList.toggle('waiting', on && wait > 0);
    if (on && wait > 0) this.q('#death .dt-wait').textContent = `Someone nearby can help you up. Waiting ${Math.ceil(wait)}s, or come round now.`;
  }

  setFps(text: string): void {
    this.q('#fps').textContent = text;
  }

  setTracker(entries: QuestEntry[]): void {
    const active = entries.filter((e) => !e.done && e.tracked !== false);
    const html = active.map((e) => `<div class="q${e.focus ? ' focus' : ''}" data-q="${esc(e.id)}"><h4>${esc(e.name)}</h4>${e.objectives.map((o) => `<div class="obj${o.done ? ' done' : ''}">${esc(o.text)}${o.dist !== undefined && !o.done ? `<span class="dist">${Math.round(o.dist)}m</span>` : ''}</div>`).join('')}</div>`).join('');
    const tr = this.q('#tracker');
    if (tr.innerHTML !== html) tr.innerHTML = html;
    if (!tr.dataset.wired) {
      tr.dataset.wired = '1';
      tr.addEventListener('click', (ev) => { const q = (ev.target as HTMLElement).closest<HTMLElement>('.q[data-q]'); if (q?.dataset.q) this.openJournalAt(q.dataset.q); });
    }
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
  setBoss(b: { name: string; level: number; hp: number; max: number; enraged: boolean; stagger?: number; staggerLocked?: boolean; cast?: { label: string; k: number; breakable: boolean } | null } | null): void {
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
    const st = box.querySelector('.bb-stagger') as HTMLElement;
    st.classList.toggle('locked', !!b.staggerLocked);
    (st.firstElementChild as HTMLElement).style.width = (b.staggerLocked ? 100 : (b.stagger ?? 0) * 100) + '%';
    this.fillCast(box.querySelector('.castbar') as HTMLElement, b.cast);
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
      (p.querySelector('.ev-kind') as HTMLElement).textContent = ev.kind === 'event' ? 'Event' : ev.kind === 'boss' ? 'World boss' : ev.kind === 'task' ? 'Parish task' : ev.kind === 'escort' ? 'Escort' : 'Shardfall';
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
  /**
   * Lift the chat box above the action bar wherever the two would overlap (any screen size, any bar),
   * and stack what you pick up (ore, loot, quest items) just above the chat box, never over it.
   */
  private fitChat(): void {
    const bar = document.getElementById('actionbar'), chat = document.getElementById('chatbox'), loot = document.getElementById('loot');
    if (loot) loot.style.bottom = '';
    if (!bar || !chat || document.body.classList.contains('touch')) return;
    chat.style.bottom = '';
    const b = bar.getBoundingClientRect(), c = chat.getBoundingClientRect();
    if (!b.width || !c.width) return;
    if (c.right > b.left - 8 && c.bottom > b.top - 8) chat.style.bottom = `${Math.ceil(window.innerHeight - b.top + 10)}px`;
    if (loot) loot.style.bottom = `${Math.ceil(window.innerHeight - chat.getBoundingClientRect().top + 8)}px`;
  }

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
    const span = (W / k) * 1.5;
    // (the world is two squares: the Counties', and Morrow's east of it across the sea)
    const east = px + span / 2 > WMAX, west = px - span / 2 < WMAX;
    if (west) c.drawImage(continentChart(0), WMIN, WMIN, WSIZE, WSIZE);
    if (east) c.drawImage(continentChart(1), WMAX, WMIN, WSIZE, WSIZE);
    c.fillStyle = 'rgba(236, 222, 186, 0.35)';
    c.fillRect(px - 400, pz - 400, 800, 800);
    c.imageSmoothingEnabled = k < 2.5;
    if (west) c.drawImage(this.ctx.mapImage, (px - span / 2 - WMIN) / MAP_SCALE, (pz - span / 2 - WMIN) / MAP_SCALE, span / MAP_SCALE, span / MAP_SCALE, px - span / 2, pz - span / 2, span, span);
    const ee = this.ctx.mapImageEast;
    if (east && ee) c.drawImage(ee, (px - span / 2 - WMAX) / MAP_SCALE, (pz - span / 2 - WMIN) / MAP_SCALE, span / MAP_SCALE, span / MAP_SCALE, px - span / 2, pz - span / 2, span, span);
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
    // Close in, the buildings' names: nearest first, and none drawn over another
    if (this.mmZoom >= 3) {
      c.font = '600 19px "Alegreya Sans", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const taken: [number, number, number, number][] = [];
      const near = this.mapLabels.map((L) => ({ L, p: at(L.x, L.z) })).filter((e) => Math.hypot(e.p[0], e.p[1]) < inside - 18).sort((a, b) => Math.hypot(a.p[0], a.p[1]) - Math.hypot(b.p[0], b.p[1]));
      for (const { L, p: [x, y] } of near) {
        const w = c.measureText(L.text).width / 2 + 4, ty = y - 14;
        if (Math.hypot(Math.abs(x) + w, Math.abs(ty) + 10) > R - 8) continue; // whole, inside the rim
        if (taken.some((r) => x - w < r[2] && x + w > r[0] && ty - 11 < r[3] && ty + 11 > r[1])) continue;
        taken.push([x - w, ty - 11, x + w, ty + 11]);
        c.lineWidth = 5; c.strokeStyle = 'rgba(16, 12, 8, 0.85)'; c.strokeText(L.text, x, ty);
        c.fillStyle = '#f2e4bc'; c.fillText(L.text, x, ty);
        c.fillStyle = '#f2e4bc'; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
      }
    }
    // Events, world bosses, the Shardfall: glyphs, or arrows on the rim when they're out of range
    for (const m of markers) {
      if (!ACT_KINDS.has(m.kind)) continue;
      const [x, y] = at(m.x, m.z), d = Math.hypot(x, y);
      if (d > inside) {
        if (m.kind === 'bossSoon' || m.kind === 'task' || m.kind === 'taskDone' || m.kind === 'treasure') continue;
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
      if (m.kind === 'service') {
        const [sx2, sy2] = at(m.x, m.z);
        if (Math.hypot(sx2, sy2) > inside) continue;
        const st = SERVICE_LOOK[m.svc ?? 'shop'];
        c.fillStyle = st.bg; c.strokeStyle = '#0b1122'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(sx2 - 6.5, sy2 - 6.5, 13, 13, 3); c.fill(); c.stroke();
        c.fillStyle = st.fg; c.font = '700 10px "Alegreya Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(st.letter, sx2, sy2 + 0.5);
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
    // View cone (what the camera sees) and the player's arrow. The camera looks along -sin/-cos of
    // its yaw while the player faces along +sin/+cos of theirs, so the cone takes no half turn.
    const look = rot - camYaw;
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
    if (p === 'craft' || p === 'shop' || p === 'travel' || p === 'exchange' || p === 'finder') { this.close('journal'); this.close('map'); this.close('settings'); }
    if (p === 'map' || p === 'journal' || p === 'settings' || p === 'talents') for (const o of ['craft', 'shop', 'travel', 'exchange', 'finder', 'map', 'journal', 'settings', 'talents', 'inv', 'skills'] as PanelId[]) if (o !== p) this.close(o);
    this.open.add(p);
    this.panelEl(p).classList.add('show');
    this.ctx.sfx(p === 'journal' || p === 'map' || p === 'read' || p === 'mail' ? 'page' : 'open');
    // (the map opens on you, or on where Show on map asked for: set before the first draw)
    if (p === 'map') this.mapView.fresh = true;
    this.refresh(p);
    if (p === 'journal') this.setJournalAlert(false);
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
        case 'talents': this.renderTalents(); break;
        case 'journal': this.renderJournal(); break;
        case 'craft': this.renderCraft(); break;
        case 'shop': this.renderShop(); break;
        case 'travel': this.renderTravel(); break;
        case 'trade': this.renderTrade(); break;
        case 'guild': this.renderGuild(); break;
        case 'exchange': this.renderExchange(); break;
        case 'mail': this.renderMail(); break;
        case 'finder': this.renderFinder(); break;
        case 'music': this.renderMusic(); break;
        case 'map': this.renderMap(); break;
        case 'settings': this.renderSettings(); break;
      }
    }
  }

  /**
   * The armoury: every regional set, which pieces this character has found (they're remembered
   * after they're sold or dropped), and what each set does when its pair is worn.
   */
  /** Dye your armour: pick a worn slot's main colour or trim, then a dye. */
  private dyePick: { slot: DyeSlot; channel: DyeChannel } = { slot: 'chest', channel: 'main' };
  private dyeOpen = false;
  private dyeBox(): HTMLElement {
    const box = el('details', 'armoury dyes') as HTMLDetailsElement;
    box.open = this.dyeOpen;
    box.addEventListener('toggle', () => { this.dyeOpen = box.open; });
    box.append(el('summary', '', `Dye your armour · ${DYE_COST} marks a colour`));
    const eq = this.ctx.save.equip, dyes = this.ctx.gearDyes(), pal = this.ctx.dyePalette();
    const names: Record<DyeSlot, string> = { head: 'Head', chest: 'Chest', legs: 'Legs', hands: 'Hands', feet: 'Feet' };
    const nameOf = (hex?: string) => (hex ? pal.find((d) => d.hex === hex)?.name ?? hex : 'its own');
    const rows = el('div', 'dy-rows');
    for (const slot of DYE_SLOTS) {
      const worn = eq[slot];
      const row = el('div', 'dy-row' + (worn ? '' : ' none'));
      row.append(el('span', 'dy-slot', names[slot]));
      for (const ch of ['main', 'trim'] as const) {
        const hex = dyes[slot][ch];
        const b = el('button', 'dy-chan' + (this.dyePick.slot === slot && this.dyePick.channel === ch ? ' on' : '')) as HTMLButtonElement;
        b.innerHTML = `<i style="background:${hex ?? 'transparent'}"${hex ? '' : ' class="own"'}></i>${ch === 'main' ? 'Main' : 'Trim'}`;
        b.title = `${names[slot]} ${ch === 'main' ? 'main colour' : 'trim'}: ${nameOf(hex)}`;
        b.addEventListener('click', () => { this.ctx.sfx('click'); this.dyePick = { slot, channel: ch }; this.refresh(); });
        row.append(b);
      }
      row.append(el('span', 'dy-what', worn ? ITEMS[worn]?.name ?? '' : 'nothing worn'));
      rows.append(row);
    }
    box.append(rows);
    const { slot, channel } = this.dyePick;
    box.append(el('div', 'dy-hint', `${names[slot]}, ${channel === 'main' ? 'main colour' : 'trim'}: ${esc(nameOf(dyes[slot][channel]))}. Pick a dye.`));
    const sw = el('div', 'dy-pal');
    const wash = el('button', 'dy-sw wash', '×') as HTMLButtonElement;
    wash.title = 'Wash it out (free)';
    wash.addEventListener('click', () => this.ctx.dyeGear(slot, channel, null));
    sw.append(wash);
    for (const d of pal) {
      const b = el('button', 'dy-sw' + (dyes[slot][channel] === d.hex ? ' on' : '')) as HTMLButtonElement;
      b.style.background = d.hex;
      b.title = d.name;
      b.addEventListener('click', () => this.ctx.dyeGear(slot, channel, d.hex));
      sw.append(b);
    }
    box.append(sw);
    box.append(el('div', 'dy-note', 'The colour stays with the slot, so a new piece comes in it too. Festival and rare dyes join the list once you find them.'));
    return box;
  }

  private armoury(): HTMLElement {
    const save = this.ctx.save;
    // (a rolled piece counts as the piece it was rolled from)
    const owned = new Set([save.equip.weapon, save.equip.head, save.equip.chest, save.equip.legs, save.equip.hands, save.equip.feet, ...save.inv.map((s) => s?.id)].map((x) => x && baseOf(x)));
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

  /** For a piece in the pack: what you wear in the same place, its line, and whether this one is better. */
  private compareWith(id: string): string {
    const d = ITEMS[id], eq = this.ctx.save.equip;
    if (!d || d.unid) return '';
    const worn = d.weapon ? [eq.weapon] : d.armor ? [eq[d.armor.slot]] : d.jewel ? (d.jewel.slot === 'ring' ? [eq.ring1, eq.ring2] : [eq[d.jewel.slot]]) : [];
    if (!worn.length || worn.includes(id)) return '';
    const on = worn.filter((w): w is string => !!w).map((w) => ITEMS[w]).filter(Boolean);
    if (!on.length) return '<div class="cmp"><span class="cmp-h">Nothing worn there</span></div>';
    const score = (x: typeof d) => (x.jewel ? (x.jewel.vigor ?? 0) / 10 + (x.jewel.crit ?? 0) / 0.01 + (x.jewel.wind ?? 0) / 0.02 + (x.jewel.haste ?? 0) / 0.01 : gearPoints(x));
    return on.map((w) => {
      const diff = score(d) - score(w), word = Math.abs(diff) < 0.5 ? '<i class="cmp-same">about the same</i>' : diff > 0 ? '<i class="cmp-up">▲ better</i>' : '<i class="cmp-down">▼ worse</i>';
      return `<div class="cmp"><span class="cmp-h">Worn now ${word}</span><b style="color:${RARITY_COLOR[w.rarity]}">${esc(w.name)}</b>${w.stats ? `<span class="cmp-s">${esc(w.stats)}</span>` : ''}</div>`;
    }).join('');
  }

  private tooltipFor(id: string, extra = ''): string {
    const d = ITEMS[id];
    if (d.set) {
      // Which set it belongs to, how much of it is worn, and what the pair does
      const S = GEAR_SETS[d.set], eq = this.ctx.save.equip;
      const worn = [eq.weapon, eq.head, eq.chest, eq.legs, eq.hands, eq.feet].filter((x) => x && ITEMS[x]?.set === d.set).length;
      extra = `<b>${esc(S.name)}</b> set (${worn}/2 worn): ${esc(S.bonus)}` + (extra ? '<br>' + extra : '');
    }
    const kindName: Record<string, string> = { material: 'Material', tool: 'Tool', weapon: 'Weapon', armor: d.jewel ? 'Jewellery' : 'Armour', food: 'Food', quest: 'Quest item', collectible: 'Collectible', trophy: 'Trophy' };
    // Rolled gear says its quality; a named piece says what it does, its number, and where it comes from
    const grade = d.named ? 'Named' : d.quality !== undefined ? QUALITY[d.quality].word : d.rarity !== 'common' ? d.rarity[0].toUpperCase() + d.rarity.slice(1) : '';
    let named = '';
    if (d.named) {
      const first = d.serial ? this.ctx.save.flags['u:' + id] : undefined;
      named = `<div class="named"><b>${esc(d.named.text)}</b><span>${d.serial ? `No. ${d.serial} of the ${d.named.cap} in the realm` : `The realm holds ${d.named.cap}`}${first ? ` · first found by ${esc(String(first))}` : ''}</span><span>From ${esc(d.named.where)}</span></div>`;
    }
    return `<h5 style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</h5><div class="kind">${kindName[d.kind]}${grade ? ' · ' + grade : ''}</div><div class="desc">${esc(d.desc)}</div>${d.stats ? `<div class="stats">${esc(d.stats)}</div>` : ''}${named}<div class="val">Worth about ${d.value} marks</div>${extra ? `<div class="hint">${extra}</div>` : ''}`;
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
      s.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(id, hint) + (idx >= 0 ? this.compareWith(id) : ''), e.clientX, e.clientY));
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
    // Like an MMO's character panel: armour down the left, you in the middle, the rest on the right
    const doll = el('div', 'paperdoll');
    const column = (list: readonly ('weapon' | 'head' | 'chest' | 'legs' | 'hands' | 'feet')[]) => {
      const col = el('div', 'col');
      for (const slot of list) {
        const id = save.equip[slot] ?? null;
        const wrap = el('div', 'eq');
        const s = this.slotEl(id, 1, -1, 'Click to unequip');
        if (id) s.addEventListener('click', () => { this.ctx.unequip(slot); this.hideTooltip(); });
        wrap.append(s, el('span', '', slot === 'weapon' ? 'Weapon' : SLOT_NAMES[slot]));
        col.append(wrap);
      }
      return col;
    };
    const canvas = document.createElement('canvas');
    canvas.className = 'doll';
    canvas.title = 'Drag to turn';
    let dragX: number | null = null;
    canvas.addEventListener('pointerdown', (e) => { dragX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (dragX === null) return; this.dollYaw += (e.clientX - dragX) * 0.012; dragX = e.clientX; });
    canvas.addEventListener('pointerup', () => { dragX = null; });
    this.dollCanvas = canvas;
    doll.append(column(['head', 'chest', 'legs']), canvas, column(['weapon', 'hands', 'feet']));
    eq.append(doll);
    const jw = el('div', 'jewel-row');
    for (const [slot, name] of [['neck', 'Neck'], ['ear', 'Ear'], ['ring1', 'Ring'], ['ring2', 'Ring']] as const) {
      const id = save.equip[slot] ?? null;
      const wrap = el('div', 'eq');
      const s = this.slotEl(id, 1, -1, 'Click to take off');
      if (id) s.addEventListener('click', () => { this.ctx.unequip(slot); this.hideTooltip(); });
      wrap.append(s, el('span', '', name));
      jw.append(wrap);
    }
    eq.append(jw);
    // Gear is horizontal: show the weapon's style, the armour's weights and the set in force, not a bigger number
    const style = (id: string | null) => (id ? (ITEMS[id].stats ?? (ITEMS[id].named ? 'Named' : '')).split('.')[0] : 'None');
    const a = this.ctx.armourSummary();
    const pk = this.ctx.packInfo();
    const stats = el('div', 'stats', `Weapon <b>${esc(style(save.equip.weapon))}</b><br>Armour <b>defence ${a.defense}, ${Math.round((a.defense / (a.defense + 40)) * 100)}% off each blow</b><br>Weights <b>${esc(a.weights)}</b><br>${a.set ? `Set <b>${esc(GEAR_SETS[a.set].name)}</b>: ${esc(GEAR_SETS[a.set].bonus)}<br>` : ''}Free slots <b>${this.ctx.inv.freeSlots()}</b> of ${save.inv.length}${pk ? `<br>Pack <b>${esc(pk.name)}</b> (+${pk.slots}) <button class="link" data-hidepack>${pk.hidden ? 'Show it' : 'Hide it'}</button>` : '<br>Pack <b>none</b>: a satchel from any general stall adds four slots'}<br>Horsemanship <b>${this.ctx.ridingInfo().rank}</b>${this.ctx.ridingInfo().next !== null ? ` (${(this.ctx.ridingInfo().next! / 1000).toFixed(1)} km to the next)` : ' (the top)'}${save.equip.head || save.equip.hands ? `<br>Shown ${save.equip.head ? `<button class="link" data-showgear="head">${this.ctx.gearShown().head ? 'Hide helm' : 'Show helm'}</button>` : ''} ${save.equip.hands ? `<button class="link" data-showgear="hands">${this.ctx.gearShown().hands ? 'Hide gloves' : 'Show gloves'}</button>` : ''}` : ''}`);
    stats.querySelector('[data-hidepack]')?.addEventListener('click', () => { this.ctx.sfx('click'); this.ctx.togglePack(); });
    stats.querySelectorAll<HTMLElement>('[data-showgear]').forEach((b) => b.addEventListener('click', () => { this.ctx.sfx('click'); this.ctx.toggleGearShown(b.dataset.showgear as 'head' | 'hands'); }));
    eq.append(stats);
    // Two columns: you and what you wear on the left, the pack on the right, always in view
    const layout = el('div', 'inv-layout'), charCol = el('div', 'inv-char'), bagCol = el('div', 'inv-bag');
    charCol.append(eq, this.armoury(), this.dyeBox());
    layout.append(charCol, bagCol);
    body.append(layout);
    // The pack's own bar: what kind of thing to show, a search, and sorting
    const used = save.inv.filter(Boolean).length;
    const kinds: [BagFilter, string][] = [['all', 'All'], ['gear', 'Gear'], ['food', 'Food'], ['mat', 'Materials'], ['tool', 'Tools'], ['other', 'Other']];
    const bar = el('div', 'bag-bar');
    bar.innerHTML = `<div class="bag-tabs">${kinds.map(([k, n]) => `<button class="bag-tab${this.bagFilter === k ? ' sel' : ''}" data-bf="${k}">${n}</button>`).join('')}</div>
      <div class="bag-tools"><input class="bag-search" type="search" placeholder="Search the pack" value="${esc(this.bagSearch)}" aria-label="Search the pack"><button class="btn ghost sm" data-sortpack title="Sort the pack by kind and worth">Sort</button></div>`;
    bar.querySelectorAll<HTMLElement>('[data-bf]').forEach((b) => b.addEventListener('click', () => { this.ctx.sfx('click'); this.bagFilter = b.dataset.bf as BagFilter; this.renderInventory(); }));
    bar.querySelector('[data-sortpack]')!.addEventListener('click', () => { this.ctx.sfx('click'); this.hideTooltip(); this.ctx.sortPack(); });
    const search = bar.querySelector<HTMLInputElement>('.bag-search')!;
    search.addEventListener('input', () => { this.bagSearch = search.value; this.markBag(grid); });
    search.addEventListener('keydown', (e) => e.stopPropagation()); // (typing a name doesn't walk you about)
    bagCol.append(bar);
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
      s.dataset.slot = String(i);
      grid.append(s);
    });
    bagCol.append(grid);
    this.markBag(grid);
    const foot = el('div', 'bag-foot');
    foot.innerHTML = `<span class="bag-used${used >= save.inv.length ? ' full' : ''}"><b>${used}</b> / ${save.inv.length} slots</span><span class="bag-hint">Click to use or wear · Shift-click to drop · Drag to move</span>`;
    bagCol.append(foot);
    this.q('#inv-panel .footer').innerHTML = `<span>${used >= save.inv.length ? 'Your pack is full' : `${save.inv.length - used} slots free`}</span><span class="coin">${save.marks.toLocaleString()} marks</span>`;
  }

  /** The pack's filter tab and search (kept while the window is open and between visits). */
  private bagFilter: BagFilter = 'all';
  private bagSearch = '';
  /** Dim the slots that don't match the tab or the search (they keep their places: dragging still works). */
  private markBag(grid: HTMLElement): void {
    const q = this.bagSearch.trim().toLowerCase(), inv = this.ctx.save.inv;
    grid.querySelectorAll<HTMLElement>('.slot[data-slot]').forEach((s) => {
      const st = inv[Number(s.dataset.slot)], d = st ? ITEMS[st.id] : null;
      const fits = !d ? this.bagFilter === 'all' && !q : bagKind(d) === this.bagFilter || this.bagFilter === 'all';
      const named = !q || (d ? d.name.toLowerCase().includes(q) : false);
      s.classList.toggle('dim', !(fits && named));
    });
  }

  /** Which build slot's menu is open on the talent screen, and the talent under the pointer. */
  private talHover: string | null = null;
  /** The talent screen's page: the skills (ESO's lines) or the talent trees. */
  private talTab: 'skills' | 'talents' | 'mastery' = 'skills';
  /** Mastery's page: the points, and the three sets side by side, a bar for each passive filling to its cap. */
  private masteryPage(): string {
    const m = this.ctx.mastery();
    if (!m.open) return `<div class="ms-closed"><h4>Mastery opens at level 100</h4><p>Past the top, experience doesn't stop: every so much of it is a mastery point, up to three hundred, to put into the Blade, the Shield and the Hand. Small things, a little at a time, and more of them than any one character can have.</p></div>`;
    return `<div class="ms-head"><div class="ms-pts${m.left > 0 ? ' some' : ''}"><b>${m.left}</b><small>to spend</small></div><p>${m.earned} of 300 earned · ${m.next !== null ? `${m.next.toLocaleString()} experience to the next` : 'every point earned'}<br><span>Click a passive for a point. ${m.temple ? 'You kneel at the altar: you can put every point back.' : 'Points are put back only at a temple.'}</span></p>${m.temple && m.spent ? '<button class="btn ghost sm" data-msreset>Put every point back</button>' : ''}</div>
      <div class="ms-sets">${m.sets.map((st) => `<section class="ms-set" style="--mc:${st.color}"><header><img src="${abilityIcon(st.icon)}" alt=""><div><h4>${esc(st.name)}</h4><p>${esc(st.blurb)}</p></div></header>${st.passives.map((d) => `<button class="ms-p${d.n >= d.cap ? ' full' : d.n ? ' some' : ''}" data-ms="${d.id}"><span class="ms-row"><b>${esc(d.name)}</b><em>${d.n}/${d.cap}</em></span><i class="ms-bar"><i style="width:${Math.round((d.n / d.cap) * 100)}%"></i></i><small>${esc(d.n ? d.now : d.at)}${d.n && d.n < d.cap ? ` <span>Next: ${esc(d.at)}</span>` : ''}</small></button>`).join('')}</section>`).join('')}</div>`;
  }
  /**
   * The talent screen (T): the calling's three trees side by side, each a column of six tiers that open
   * as points go in, its capstone at the foot; the details of whatever's under the pointer; points to
   * spend; and three builds to save and switch between.
   */
  private renderTalents(): void {
    const panel = this.q('#talents-panel');
    const body = panel.querySelector('.body') as HTMLElement, foot = panel.querySelector('.footer') as HTMLElement;
    const tv = this.ctx.talents();
    const sv = this.ctx.skillsView();
    const all = tv.trees.flatMap((t) => t.talents.map((d) => ({ d, t })));
    panel.style.setProperty('--cc', tv.calling.color);
    const pips = (d: TalentView['trees'][number]['talents'][number]) => d.ranks > 1 ? `<span class="tn-pips">${Array.from({ length: d.ranks }, (_, k) => `<i class="${k < d.rank ? 'on' : ''}"></i>`).join('')}</span>` : '';
    const node = (d: TalentView['trees'][number]['talents'][number]) => {
      const full = d.rank >= d.ranks, cls = full ? 'got' : d.why ? (d.rank ? 'part no' : 'no') : d.rank ? 'part can' : 'can';
      return `<button class="tn ${cls}${d.capstone ? ' cap' : ''}" data-tal="${d.id}" aria-label="${esc(d.name)}"><span class="tn-gem"><img src="${abilityIcon(d.icon)}" alt=""></span>${d.capstone ? '' : `<span class="tn-rank">${d.rank}/${d.ranks}</span>`}${pips(d)}<span class="tn-name">${esc(d.name)}</span></button>`;
    };
    const tree = (t: TalentView['trees'][number]) => {
      const fill = Math.min(1, t.spent / (5 * t.gate));
      return `<section class="tl-tree${t.spent ? ' used' : ''}">
        <header class="tl-banner"><img class="tl-sigil" src="${abilityIcon(t.icon)}" alt=""><div><h4>${esc(t.name)}</h4><p>${esc(t.desc)}</p><small>Plays best with ${t.bar.map(esc).join(' and ')}</small></div><b class="tl-spent">${t.spent}</b></header>
        <div class="tl-grid" style="--fill:${fill}">${[0, 1, 2, 3, 4, 5].map((k) => `<div class="tl-tier${t.spent < k * t.gate ? ' shut' : ''}${k === 5 ? ' tl-captier' : ''}">${k ? `<span class="tl-gate" title="Opens at ${k * t.gate} points in ${esc(t.name)}">${k * t.gate}</span>` : ''}<div class="tl-row">${t.talents.filter((d) => d.tier === k).map(node).join('')}</div></div>`).join('')}</div>
      </section>`;
    };
    const detailOf = (id: string | null) => { const hov = all.find((x) => x.d.id === id) ?? null; return hov ? (() => {
      const { d, t } = hov, full = d.rank >= d.ranks;
      return `<img src="${abilityIcon(d.icon)}" alt=""><div><h5>${esc(d.name)} <em>${d.capstone ? 'Capstone' : `Rank ${d.rank} of ${d.ranks}`}</em> <small>${esc(t.name)} · tier ${d.tier + 1}</small></h5><p>${d.ranks > 1 ? '<b>Each rank:</b> ' : ''}${esc(d.desc)}</p><p class="tl-why ${full ? 'full' : d.why ? 'no' : 'can'}">${full ? 'Every rank learned.' : d.why ? esc(d.why) : 'Click to learn a rank.'}</p></div>`;
    })() : `<div><h5>${esc(tv.calling.name)} <em>${esc(tv.calling.role)}</em></h5><p>Point at a talent to read it; click to learn a rank. A tier opens once five points are in that tree for every tier above it, and you can hold one capstone. Three points come every five levels, from level 3. Unlearning is free, out of a fight.</p></div>`; };
    body.innerHTML = `<div class="tl-top">
        <div class="tl-calling"><span class="tl-crest"><img src="${abilityIcon(tv.calling.icon)}" alt=""></span><div><b>${esc(tv.calling.name)}</b><small>${esc(tv.calling.role)} · level ${tv.level}</small></div></div>
        <div class="tl-points${tv.points > 0 ? ' some' : ''}" title="Skill points come with levels, and with Insight: every waymark attuned, vista stood on and wonder found is a shard, and three shards make a point."><b>${tv.points}</b><small>skill ${tv.points === 1 ? 'point' : 'points'} to spend<br>of ${tv.total} · Insight ${sv.pool.insight}</small></div>
        <div class="tl-builds">${tv.builds.map((b, i) => `<div class="tl-build${b?.on ? ' on' : ''}"><span class="tl-bn">${i + 1}</span><div><b>${b ? esc(b.name) : 'Empty'}</b><small>${b ? esc(b.sum) : 'Save what you have here'}</small></div><button class="btn ghost sm" data-bsave="${i}" title="Save your talents and utilities here">Save</button>${b ? `<button class="btn sm" data-bload="${i}"${b.on || tv.fighting || !sv.temple ? ' disabled' : ''} title="${tv.fighting ? 'Not while you are fighting' : !sv.temple ? 'Builds are changed kneeling at a temple\'s altar' : 'Switch to this build'}">${b.on ? 'In use' : 'Use'}</button>` : ''}</div>`).join('')}</div>
      </div>
      <div class="tl-tabs"><button class="tl-tab${this.talTab === 'skills' ? ' on' : ''}" data-ttab="skills">Skills</button><button class="tl-tab${this.talTab === 'talents' ? ' on' : ''}" data-ttab="talents">Talents</button><button class="tl-tab${this.talTab === 'mastery' ? ' on' : ''}" data-ttab="mastery">Mastery</button>${sv.temple ? '<span class="tl-temple">You kneel at the altar: unlearning and builds can be done here</span>' : ''}</div>
      ${this.talTab === 'talents' ? `<div class="tl-trees">${tv.trees.map(tree).join('')}</div>` : this.talTab === 'mastery' ? this.masteryPage() : this.skillsPage(sv)}
      <p class="tl-msg"></p>`;
    foot.innerHTML = `<span>${this.talTab === 'talents' ? 'Click a talent to learn a rank · a tier opens at five points per tier above · one capstone at a time' : this.talTab === 'mastery' ? 'A point for every so much experience past level 100' : 'Skills rank up as you use them; at rank IV they morph one of two ways'} · T to close</span>${sv.temple ? `<button class="btn ghost sm tl-reset"${tv.fighting ? ' disabled' : ''}>Unlearn everything (${sv.respec} marks)</button>` : '<span class="tl-hint">Unlearn at a temple: kneel at any chapel\'s altar</span>'}`;
    const msg = (t: string) => { body.querySelector('.tl-msg')!.textContent = t; };
    body.querySelectorAll<HTMLElement>('[data-tal]').forEach((b) => {
      // The talent's card, floating beside it (to the left of it near the right edge)
      b.addEventListener('pointerenter', () => {
        this.talHover = b.dataset.tal!;
        const card = panel.querySelector<HTMLElement>('.tl-detail') ?? panel.appendChild(el('div', 'tl-detail'));
        card.innerHTML = detailOf(this.talHover);
        const r = b.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        const right = r.right + 360 < pr.right;
        card.style.left = (right ? r.right - pr.left + 6 : r.left - pr.left - 356) + 'px';
        card.style.top = Math.min(r.top - pr.top, pr.height - 150) + 'px';
        card.classList.add('show');
      });
      b.addEventListener('pointerleave', () => panel.querySelector('.tl-detail')?.classList.remove('show'));
      b.addEventListener('click', () => {
        const why = this.ctx.learnTalent(b.dataset.tal!);
        if (why) { msg(why); return; }
        this.renderTalents();
        const again = this.q(`#talents-panel [data-tal="${b.dataset.tal}"]`);
        again?.classList.add('just');
      });
    });
    body.querySelectorAll<HTMLElement>('[data-bsave]').forEach((b) => b.addEventListener('click', () => { this.ctx.saveBuild(Number(b.dataset.bsave)); this.ctx.sfx('click'); this.renderTalents(); }));
    body.querySelectorAll<HTMLElement>('[data-bload]').forEach((b) => b.addEventListener('click', () => { const why = this.ctx.loadBuild(Number(b.dataset.bload)); this.renderTalents(); if (why) msg(why); }));
    foot.querySelector('.tl-reset')?.addEventListener('click', () => this.ask(`Unlearn every talent, skill and morph for ${sv.respec} marks? Save this build first if you want it back.`, () => { const why = this.ctx.resetTalents(); this.renderTalents(); if (why) msg(why); }, () => {}, 20));
    body.querySelectorAll<HTMLElement>('[data-ttab]').forEach((b) => b.addEventListener('click', () => { this.talTab = b.dataset.ttab as 'skills' | 'talents' | 'mastery'; this.ctx.sfx('click'); this.renderTalents(); }));
    body.querySelectorAll<HTMLElement>('[data-ms]').forEach((b) => b.addEventListener('click', () => { const why = this.ctx.masterySpend(b.dataset.ms!); if (why) msg(why); else this.renderTalents(); }));
    body.querySelector('[data-msreset]')?.addEventListener('click', () => { const why = this.ctx.masterySpend('reset'); if (why) msg(why); else this.renderTalents(); });
    body.querySelectorAll<HTMLElement>('[data-sunlock]').forEach((b) => b.addEventListener('click', () => { const why = this.ctx.unlockSkill(b.dataset.sunlock!); this.renderTalents(); if (why) msg(why); }));
    body.querySelectorAll<HTMLElement>('[data-smorph]').forEach((b) => b.addEventListener('click', () => { const [id, w] = b.dataset.smorph!.split(':'); const why = this.ctx.morphSkill(id, w as 'a' | 'b'); this.renderTalents(); if (why) msg(why); }));
  }

  /** The Skills page: each skill's rank, its progress, unlocking it, and its morphs at rank IV. */
  private skillsPage(sv: SkillsView): string {
    const card = (k: SkillCard) => {
      const state = !k.open ? 'shut' : !k.unlocked ? 'locked' : k.morph ? 'morphed' : k.rank >= 4 ? 'ready' : 'got';
      const pct = k.next === null ? 100 : Math.round(((k.uses - k.from) / Math.max(1, k.next - k.from)) * 100);
      const rank = k.unlocked ? `<div class="sk-rank"><span class="sk-pips">${[1, 2, 3, 4].map((r) => `<i class="${r <= k.rank ? 'on' : ''}"></i>`).join('')}</span><em>Rank ${['I', 'II', 'III', 'IV'][k.rank - 1]}</em>${k.next !== null ? `<span class="sk-bar"><i style="width:${pct}%"></i></span><small>${k.uses}/${k.next} uses</small>` : ''}</div>` : '';
      const act = !k.open ? `<p class="sk-why">Opens at level ${k.need}</p>`
        : !k.unlocked ? `<button class="btn sm" data-sunlock="${k.id}"${sv.pool.left < 1 ? ' disabled' : ''}>Unlock · 1 point</button>`
        : k.morph ? `<p class="sk-morph"><b>Morphed:</b> ${esc(k.morphs.find((m) => m.key === k.morph)?.desc ?? '')}</p>`
        : k.morphs.length ? `<div class="sk-morphs${k.rank < 4 ? ' far' : ''}">${k.morphs.map((m) => `<button class="sk-mo" data-smorph="${k.id}:${m.key}"${k.rank < 4 || sv.pool.left < 1 ? ' disabled' : ''}><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></button>`).join('')}</div>${k.rank < 4 ? '<p class="sk-why">Morphs at rank IV</p>' : ''}` : '';
      return `<div class="sk-card ${state}"><img src="${abilityIcon(k.icon)}" alt=""><div><b>${esc(k.name)}</b>${k.morph ? `<small class="sk-was">${esc(k.base)}</small>` : ''}<small>${esc(k.kind)}${k.free ? ' · comes with the weapon' : ''}</small><p>${esc(k.desc)}</p>${rank}${act}</div></div>`;
    };
    const col = (title: string, list: SkillCard[]) => `<section class="sk-col"><h4>${title}</h4>${list.map(card).join('')}</section>`;
    return `<div class="sk-page">${col('Your calling', sv.calling)}${col('Utilities', sv.utilities)}${col('Weapon skills', sv.weapons)}</div>`;
  }

  private renderSkills(): void {
    const body = this.q('#skills-panel .body');
    body.innerHTML = '';
    let total = 0;
    for (const s of SKILLS) {
      const xp = this.ctx.save.xp[s.id];
      const lv = levelForXp(xp, s.id);
      total += lv;
      const a = xpForLevel(lv, s.id), b = xpForLevel(lv + 1, s.id);
      const row = el('div', 'skill' + (this.openSkill === s.id ? ' open' : ''));
      row.innerHTML = `<img src="${shapeIcon(s.icon as 'ore', s.color)}" alt=""><div class="nm">${s.name}</div><div class="lv">${lv}</div>
        <div class="bar xp"><i style="width:${((xp - a) / (b - a)) * 100}%;background:linear-gradient(180deg,${s.color},#2a1a10)"></i></div>
        <div class="xpt">${xp.toLocaleString()} XP · ${(b - xp).toLocaleString()} to level ${lv + 1}</div>
        <div class="unl">${UNLOCKS[s.id].map((u) => `<div class="${lv >= u.level ? 'got' : ''}">Level ${u.level}: ${esc(u.text)}</div>`).join('')}${(() => {
          const pv = this.ctx.passivesOf(s.id);
          if (!pv.list.length) return '';
          return `<div class="cpass"><h6>Passives <span>${pv.points} ${pv.points === 1 ? 'point' : 'points'} to spend · one every ten levels</span></h6>${pv.list.map((x) => `<div class="cp${x.rank >= x.ranks ? ' full' : ''}"><b>${esc(x.name)} <em>${x.rank}/${x.ranks}</em></b><span>${esc(x.desc[Math.min(x.rank, x.ranks - 1)])}</span>${x.rank < x.ranks ? `<button class="btn sm" data-cp="${x.id}"${pv.points < 1 ? ' disabled' : ''}>Learn</button>` : ''}</div>`).join('')}</div>`;
        })()}</div>`;
      row.querySelectorAll<HTMLElement>('[data-cp]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const why = this.ctx.learnPassive(b.dataset.cp!); if (why) this.system(why); this.renderSkills(); }));
      row.addEventListener('click', () => { this.openSkill = this.openSkill === s.id ? null : s.id; this.renderSkills(); });
      body.append(row);
    }
    this.q('#skills-panel .footer').innerHTML = `<span>Click a skill for unlocks</span><span>Total level ${total}</span>`;
  }

  /** The quest the journal page shows (for its buttons). */
  private questControls: QuestEntry | null = null;
  /** Under a quest's page: Track, Focus, Show on map, and Abandon (side quests; it asks twice). */
  private questButtons(q: QuestEntry): HTMLElement {
    const row = el('div', 'qctl');
    const btn = (label: string, cls: string, title: string, fn: () => void) => { const b = el('button', 'btn sm ' + cls, esc(label)) as HTMLButtonElement; b.title = title; b.addEventListener('click', fn); row.append(b); return b; };
    btn(q.tracked === false ? 'Track' : 'Tracking', q.tracked === false ? '' : 'on', 'Show this quest on the tracker and the map', () => { this.ctx.trackQuest(q.id, q.tracked === false); this.renderJournal(); });
    btn(q.focus ? 'Focused' : 'Focus', q.focus ? 'on' : '', 'Put this quest first, its objectives brightest on the map', () => { this.ctx.focusQuest(q.focus ? null : q.id); this.renderJournal(); });
    if (q.onMap) btn('Show on map', '', 'Open the map on where this quest points next', () => this.ctx.showQuestOnMap(q.id));
    if (q.canAbandon) {
      const ab = btn('Abandon', 'danger', 'Give up this quest. Whoever gave it will offer it again.', () => {
        if (ab.dataset.sure) { this.ctx.abandonQuest(q.id); this.selQuest = ''; this.renderJournal(); return; }
        ab.dataset.sure = '1'; ab.textContent = 'Abandon? Click again';
        setTimeout(() => { if (ab.isConnected) { delete ab.dataset.sure; ab.textContent = 'Abandon'; } }, 3500);
      });
    }
    return row;
  }

  /** Open the map on a spot (the journal's Show on map). */
  private mapFocus: { x: number; z: number } | null = null;
  showOnMap(x: number, z: number): void {
    this.mapFocus = { x, z };
    this.mapView.world = false;
    if (this.isOpen('map')) { this.mapView.fresh = true; this.renderMap(); } else this.toggle('map');
  }

  private renderJournal(): void {
    const body = this.q('#journal-panel .body');
    const qs = this.ctx.quests();
    if (!this.selQuest || (this.selQuest !== 'places' && this.selQuest !== 'bestiary' && this.selQuest !== 'feats' && this.selQuest !== 'library' && this.selQuest !== 'factions' && this.selQuest !== 'standing' && this.selQuest !== 'calling' && this.selQuest !== 'festival' && this.selQuest !== 'writs' && this.selQuest !== 'weekly' && this.selQuest !== 'login' && !qs.some((q) => q.id === this.selQuest))) this.selQuest = qs.find((q) => !q.done)?.id ?? qs[0]?.id ?? 'places';
    const list = el('div', 'jlist');
    const add = (title: string, items: QuestEntry[]) => {
      if (!items.length) return;
      list.append(el('h6', '', title));
      for (const q of items) {
        const ji = el('div', 'ji' + (q.id === this.selQuest ? ' sel' : '') + (q.done ? ' done' : '') + (q.story ? ' story' : '') + (q.tracked === false && !q.done ? ' untracked' : ''), (q.focus ? '★ ' : '') + esc(q.name));
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
    const bj = el('div', 'ji' + (this.selQuest === 'bestiary' ? ' sel' : ''), 'Bestiary');
    bj.addEventListener('click', () => { this.selQuest = 'bestiary'; this.renderJournal(); });
    list.append(bj);
    list.append(el('h6', '', 'DAILY ROUND'));
    for (const [id, label] of [['writs', 'Charter writs'], ['weekly', 'This week'], ['login', 'Login rewards']] as const) {
      const d = this.ctx.daily();
      const dot = id === 'login' ? !d.login.claimedToday : id === 'weekly' ? d.weekly.writs.some((w) => !w.done) : d.writs.some((w) => !w.done);
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
    const lj = el('div', 'ji' + (this.selQuest === 'library' ? ' sel' : ''), 'Library');
    lj.addEventListener('click', () => { this.selQuest = 'library'; this.renderJournal(); });
    list.append(lj);
    const fj2 = el('div', 'ji' + (this.selQuest === 'factions' ? ' sel' : ''), 'Factions');
    fj2.addEventListener('click', () => { this.selQuest = 'factions'; this.renderJournal(); });
    list.append(fj2);
    const sj = el('div', 'ji' + (this.selQuest === 'standing' ? ' sel' : ''), 'Standing');
    sj.addEventListener('click', () => { this.selQuest = 'standing'; this.renderJournal(); });
    list.append(sj);
    const page = el('div', 'jbody');
    if (this.selQuest === 'weekly') {
      // The week's commissions, and what's coming: the resets, the world bosses' next risings, the festivals
      const d = this.ctx.daily(), wk = d.weekly;
      const dh = (s: number) => (s >= 86_400 ? `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
      const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      page.innerHTML = `<h4>This week</h4><div class="feat-sum">Three Charter commissions a week, the same for everyone. New ones in ${dh(wk.resetIn)}.${wk.bundleDone ? ' All three done this week.' : ` Finish all three for ${wk.bundle.marks} marks and a glyph.`}</div>`;
      for (const w of wk.writs) {
        const row = el('div', 'feat' + (w.done ? ' done' : ''));
        row.innerHTML = `<div class="ft"><b>${esc(w.name)}</b><span>${w.done ? 'Done' : `${w.have.toLocaleString()} / ${w.need.toLocaleString()}`}</span></div><div class="fd">${esc(w.desc)} ${w.marks} marks.</div>${w.done ? '' : `<div class="bar feat-bar"><i style="width:${Math.min(100, (w.have / w.need) * 100)}%"></i></div>`}`;
        page.append(row);
      }
      const bosses = (this.ctx.finder().bosses ?? []).slice().sort((a, b) => a.until - b.until);
      const now = new Date(), md = (m: number, d2: number) => new Date(Date.UTC(now.getUTCFullYear(), m - 1, d2));
      const fest = FESTIVALS.map((f) => {
        let from = md(f.from[0], f.from[1]), to = md(f.to[0], f.to[1]);
        if (to < from) to = new Date(Date.UTC(now.getUTCFullYear() + 1, f.to[0] - 1, f.to[1]));
        if (to.getTime() + 86_400_000 < now.getTime()) { from = new Date(Date.UTC(now.getUTCFullYear() + 1, f.from[0] - 1, f.from[1])); to = new Date(Date.UTC(now.getUTCFullYear() + 1 + (f.to[0] < f.from[0] ? 1 : 0), f.to[0] - 1, f.to[1])); }
        return { name: f.name, from, to, on: now >= from && now.getTime() <= to.getTime() + 86_400_000 };
      }).sort((a, b) => Number(b.on) - Number(a.on) || a.from.getTime() - b.from.getTime()).slice(0, 4);
      const day = (t: Date) => t.toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' });
      const cal = el('div', 'cal');
      cal.innerHTML = `<h5>Coming up</h5>`
        + `<div class="cal-row"><b>Writs</b><span>new in ${dh(d.resetIn)}</span></div><div class="cal-row"><b>Commissions</b><span>new in ${dh(wk.resetIn)}</span></div>`
        + bosses.map((b) => `<div class="cal-row${b.until < 0 ? ' up' : ''}"><b>${esc(b.name)}</b><span>${b.until < 0 ? `up now in ${esc(b.where)}, ${mm(-b.until)} left` : `rises in ${esc(b.where)} in ${mm(b.until)}`}</span></div>`).join('')
        + fest.map((f) => `<div class="cal-row${f.on ? ' up' : ''}"><b>${esc(f.name)}</b><span>${f.on ? `on now, until ${day(f.to)}` : `${day(f.from)} to ${day(f.to)}`}</span></div>`).join('');
      page.append(cal);
    } else if (this.selQuest === 'writs' || this.selQuest === 'login') {
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
      for (const x of fv.extra ?? []) page.append(el('div', 'feat', `<div class="ft"><b>${esc(x.title)}</b></div><div class="fd">${esc(x.text)}</div>`));
      page.append(el('h5', 'feat-group', 'The festival year'));
      for (const y of fv.year) page.append(el('div', 'feat' + (y.on ? ' done' : ''), `<div class="ft"><b>${esc(y.name)}</b><span>${y.on ? 'On now' : esc(y.when)}</span></div>`));
    } else if (this.selQuest === 'calling') {
      const tv = this.ctx.talents();
      const tal = (d: (typeof tv.trees)[number]['talents'][number]) => { const full = d.rank >= d.ranks; return `<button class="tal${full ? ' got' : d.rank ? ' part' : ''}${!full && !d.why ? ' can' : ''}${!full && d.why ? ' no' : ''}${d.capstone ? ' cap' : ''}" data-tal="${d.id}" title="${esc(full ? 'Every rank learned' : d.why ?? 'Click to learn a rank')}"><b>${esc(d.name)}</b><span>${d.ranks > 1 ? 'Each rank: ' : ''}${esc(d.desc)}</span><i>${d.capstone ? (full ? 'Capstone · learned' : 'Capstone') : `Rank ${d.rank} of ${d.ranks}`}</i></button>`; };
      if (this.talTree < 0 || this.talTree >= tv.trees.length) this.talTree = tv.trees.reduce((b, t, i) => (t.spent > tv.trees[b].spent ? i : b), 0);
      const tabs = `<div class="ttabs">${tv.trees.map((t, i) => `<button class="ttab${i === this.talTree ? ' on' : ''}" data-ttab="${i}">${esc(t.name)}<em>${t.spent}</em></button>`).join('')}</div>`;
      const tree = (t: (typeof tv.trees)[number]) => `<div class="ttree"><div class="tdesc">${esc(t.desc)} <b>Wants ${t.bar.map(esc).join(' and ')} on the bar.</b></div>${[0, 1, 2, 3, 4, 5].map((k) => `<div class="ttier${t.spent < k * t.gate ? ' shut' : ''}"><u>${k ? `Tier ${k + 1} · opens at ${k * t.gate} points in ${esc(t.name)}` : 'Tier 1'}</u><div class="trow">${t.talents.filter((d) => d.tier === k).map(tal).join('')}</div></div>`).join('')}</div>`;
      const bv = this.ctx.bar();
      const sk = (s: SkillDef, key: string, extra = '') => `<button class="bsk${extra}" data-u="${s.id}" title="${esc(s.desc)}"><img src="${abilityIcon(s.icon)}" alt=""><span><b>${key ? key + ' · ' : ''}${esc(s.name)}${s.aim ? ' <i>aimed</i>' : ''}</b><small>${esc(s.desc)} ${s.cd >= 2 ? `(${s.cd} s)` : ''}</small></span></button>`;
      page.innerHTML = `<h4>Your bar</h4><div class="feat-sum">Keys 1 to 3 are your weapon's: Strike, then two that depend on the weapon in your hand (Cleave and a third for a sword). Then your calling's heal (4), its signature (5), two utilities you choose (6 and 7) and its elite (8). They come as you level: Cleave at 2, the heal at 3, the signature at 4, the weapon skill at 6, the utilities at 8 and 12, the elite at 16. Aimed skills land where the cursor points. Click a utility or an elite to put it on the bar, out of a fight.</div>
        <div class="bar-pick">${sk(bv.weapon, '3')}${sk(bv.heal, '4')}${sk(bv.signature, '5')}${bv.pool.map((s) => sk(s, bv.chosen.includes(s.id) ? String(6 + bv.chosen.indexOf(s.id)) : '', (bv.chosen.includes(s.id) ? ' on' : ' off') + (bv.cross.includes(s.id) ? ' cross' : ''))).join('')}${bv.elites.map((s) => sk(s, s.id === bv.elite.id ? '8' : '', (s.id === bv.elite.id ? ' on' : ' off') + ' elite')).join('')}</div><div class="bar-msg"></div>
        <h4>Your calling</h4>${this.ctx.callingFree()
          ? `<div class="feat-sum">A calling is for life now. Because yours was chosen when callings could still be changed, you may change it once more, out of a fight.</div><div class="callings">${CALLINGS.map((c) => callingCard(c, c.id === this.ctx.calling())).join('')}</div>`
          : `<div class="callings">${CALLINGS.filter((c) => c.id === this.ctx.calling()).map((c) => callingCard(c, true)).join('')}</div>`}
        <div class="feat-sum">${((ap) => ap ? `<b>Apprenticed to ${esc(ap.master)}</b> (${esc(ap.name)}): one of their skills, marked above, can take your second utility key.` : `<b>Apprenticeship.</b> Your calling is for life, but from level 25 a master of another calling will teach you their skills, for 500 marks: one can take your second utility key. Hugh Caddick at the Waystation toll (Warden), Bet Hollis in the Harrowgate slag yard (Reaver), Tobias Fenwick at the Glass Kirk (Kindler), Ned Thackery at Fellers' Camp (Pathfinder), Rosalind Eyre at Kelderby (Wizard).`)(this.ctx.apprentice())}</div><div class="calling-msg"></div>
        <h4 class="tal-h">Talents <span>${tv.points} of ${tv.total} points to spend</span><button class="btn tal-open">Open the talent trees (T)</button></h4>
        <div class="feat-sum">${tv.trees.map((t) => `<b>${esc(t.name)}</b> ${t.spent}`).join(' · ')}. Three trees, one for each way of playing ${esc(tv.calling.name)}; three builds to switch between out of a fight.</div>`;
      void tabs; void tree;
      page.querySelector('.tal-open')?.addEventListener('click', () => { this.show('talents'); });
      // An elite: the one chosen takes key 8
      page.querySelectorAll<HTMLElement>('.bsk.elite').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.u === bv.elite.id) return;
        const why = this.ctx.setElite(b.dataset.u!);
        this.ctx.sfx('click');
        if (why) page.querySelector('.bar-msg')!.textContent = why; else this.renderJournal();
      }));
      page.querySelectorAll<HTMLElement>('.bsk.on:not(.elite), .bsk.off:not(.elite)').forEach((b) => b.addEventListener('click', () => {
        // Swap a utility in: it takes the place of the one chosen longest ago that isn't it
        const id = b.dataset.u!, cur = bv.chosen;
        if (cur.includes(id)) return;
        const why = this.ctx.setUtilities([...cur.slice(1), id]);
        this.ctx.sfx('click');
        if (why) page.querySelector('.bar-msg')!.textContent = why; else this.renderJournal();
      }));
      // Learning keeps your place on the page
      const again = () => { const sc = page.scrollTop; this.renderJournal(); const pg = this.q('#journal-panel .jbody'); if (pg) pg.scrollTop = sc; };
      page.querySelectorAll<HTMLElement>('[data-ttab]').forEach((b) => b.addEventListener('click', () => { this.talTree = Number(b.dataset.ttab); this.ctx.sfx('click'); again(); }));
      page.querySelectorAll<HTMLElement>('[data-tal]').forEach((b) => b.addEventListener('click', () => {
        const why = this.ctx.learnTalent(b.dataset.tal!);
        if (why) page.querySelector('.tal-msg')!.textContent = why; else again();
      }));
      page.querySelector('.tal-reset')?.addEventListener('click', () => { const why = this.ctx.resetTalents(); if (why) page.querySelector('.calling-msg')!.textContent = why; else this.renderJournal(); });
      page.querySelectorAll<HTMLElement>('[data-calling]').forEach((b) => b.addEventListener('click', () => {
        const why = this.ctx.setCalling(b.dataset.calling as CallingId);
        this.ctx.sfx('click');
        if (why) page.querySelector('.calling-msg')!.textContent = why;
        else this.renderJournal();
      }));
    } else if (this.selQuest === 'library') {
      const shelves = this.ctx.library();
      const all = shelves.flatMap((x) => x.books), have = all.filter((b) => b.read).length;
      page.innerHTML = `<h4>Library</h4><div class="feat-sum">${have} of ${all.length} books found. People left them where they wrote them: look for a book lying open on a stand by the place it's about. Click one you've found to read it again.</div>`;
      for (const sh of shelves) {
        page.append(el('h5', 'feat-group', esc(sh.shelf)));
        for (const b of sh.books) {
          const row = el('div', 'feat book' + (b.read ? ' done' : ''));
          row.innerHTML = b.read ? `<div class="ft"><b>${esc(b.title)}</b><span>Read</span></div>` : `<div class="ft"><b class="miss">Not yet found</b><span></span></div><div class="fd">Somewhere near ${esc(b.where)}.</div>`;
          if (b.read) { row.style.cursor = 'pointer'; row.addEventListener('click', () => { this.ctx.sfx('click'); this.ctx.readBook(b.id); }); }
          page.append(row);
        }
      }
    } else if (this.selQuest === 'factions') {
      const rows = this.ctx.factions();
      page.innerHTML = '<h4>Factions</h4><div class="feat-sum">Companies you can join, each with its own hall, people and storyline. Every chapter of a storyline raises your rank; the last gives a title.</div>';
      for (const f of rows) {
        const row = el('div', 'feat' + (f.rankIdx === f.ranks.length - 1 ? ' done' : ''));
        const pct = f.rankIdx < 0 ? 0 : ((f.rankIdx + 1) / f.ranks.length) * 100;
        row.innerHTML = `<div class="ft"><b>${esc(f.name)}</b><span>${f.rank ? esc(f.rank) : f.open ? 'Not joined' : 'Not yet open'}</span></div><div class="fd">${esc(f.blurb)}</div>`
          + (f.rankIdx >= 0 ? `<div class="bar feat-bar"><i style="width:${pct}%"></i></div><div class="fd">${esc(f.ranks.join(' · '))}</div>` : '')
          + `<div class="fd"><b>${esc(f.where)}.</b> ${esc(f.rankIdx >= 0 ? f.next ?? 'You have risen as high as it goes.' : f.join)}</div>`;
        page.append(row);
      }
    } else if (this.selQuest === 'standing') {
      const rows = this.ctx.standing();
      page.innerHTML = '<h4>Standing</h4><div class="feat-sum">How well each region knows you. Its quests, parish tasks, events, rares, world boss and group dungeon all count. Trusted takes 5% off its traders\' prices, Honoured 10% and Revered 15%, and Revered gives a title.</div>';
      for (const r of rows) {
        const row = el('div', 'feat' + (r.next ? '' : ' done'));
        const pct = r.next ? Math.min(100, ((r.points - r.from) / Math.max(1, r.next.at - r.from)) * 100) : 100;
        const pc = (n: number) => `${Math.round(n * 100)}% off`;
        row.innerHTML = `<div class="ft"><b>${esc(r.name)}</b><span>${esc(r.rank)}${r.off ? ' · ' + pc(r.off) : ''}</span></div>`
          + (r.next ? `<div class="bar feat-bar"><i style="width:${pct}%"></i></div><div class="fd">${r.points.toLocaleString()} of ${r.next.at.toLocaleString()} to ${esc(r.next.name)}${r.next.off ? ` (${pc(r.next.off)})` : ''}</div>` : `<div class="fd">${r.points.toLocaleString()} standing: as high as it goes.</div>`);
        page.append(row);
      }
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
    } else if (this.selQuest === 'bestiary') {
      // Every creature of the wilds by where it lives: met ones by name, the rest a hint; each part of an
      // entry opens at so many kills (data/bestiary.ts)
      const v = this.ctx.bestiary();
      const met = v.entries.filter((e) => e.kills > 0).length;
      const groups = new Map<string, BestiaryEntry[]>();
      for (const e of v.entries) { const k = e.where[0] ?? 'The wilds'; groups.set(k, [...(groups.get(k) ?? []), e]); }
      const part = (open: boolean, need: number, html: string) => (open ? html : `<div class="bz-locked">Kill ${need} to learn more</div>`);
      page.innerHTML = `<h4>Bestiary</h4><div class="feat-sum">${met} of ${v.entries.length} met. One kill writes an entry; ten tell you how it fights and what it leaves; fifty, what the hunters say.</div>`
        + [...groups.entries()].map(([region, list]) => `<h5 class="bz-region">${esc(region)}</h5>${list.map((e) => {
          if (!e.kills) return `<div class="bz unmet"><div class="bz-head"><b>Something in ${esc(region)}</b><span>level ${e.level}</span></div></div>`;
          const next = v.tiers.find((t) => t > e.kills);
          return `<div class="bz"><div class="bz-head"><b>${esc(e.name)}</b><span>level ${e.level} · ${e.kills.toLocaleString()} killed${next ? ` · ${next - e.kills} to the next` : ''}</span></div>`
            + `<div class="bz-where">${esc(e.where.join(', '))}</div>`
            + part(e.kills >= v.tiers[1], v.tiers[1], `<div class="bz-how">${esc(e.how)}${e.loot.length ? ` <span>Leaves: ${esc(e.loot.join(', '))}.</span>` : ''}</div>`)
            + part(e.kills >= v.tiers[2], v.tiers[2], e.note ? `<div class="bz-note">${esc(e.note)}</div>` : '<div class="bz-note">Nobody\'s told you anything about these worth repeating.</div>')
            + '</div>';
        }).join('')}`).join('');
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
      if (q) this.questControls = q;
      if (q) page.innerHTML = `<h4>${esc(q.name)}</h4><div>${esc(q.notes)}</div>${q.objectives.length ? `<div class="objs">${q.objectives.map((o) => `<div class="${o.done ? 'done' : ''}">${esc(o.text)}</div>`).join('')}</div>` : ''}${q.done ? '<div class="objs"><div class="done">Complete</div></div>' : ''}`;
      else page.innerHTML = '<h4>Nothing yet</h4><div>Talk to people. Hollin Ford\'s reeve looks like she has a problem.</div>';
      if (q && !q.done && !q.id.startsWith('lead:')) page.append(this.questButtons(q));
    }
    const wrap = el('div', 'journal');
    wrap.append(list, page);
    body.innerHTML = '';
    body.append(wrap);
    // On a phone the list is a strip: keep the open page's tab in view
    const selTab = list.querySelector<HTMLElement>('.ji.sel');
    if (selTab && list.scrollWidth > list.clientWidth) list.scrollLeft = selTab.offsetLeft - list.clientWidth / 2 + selTab.offsetWidth / 2;
  }

  /** The leaning and quality chosen for each gear recipe at the anvil, kept while the window's open. */
  private craftPick: Record<string, { affix?: string; q?: number }> = {};
  /** The amount typed in the trade window: how many of a stack go on the table. */
  private tradeAmount: number | null = null;
  /** How many the crafting window's Make makes (null: one). */
  private craftAmount: number | null = null;
  private renderCraft(): void {
    const st = this.ctx.currentStation;
    if (!st) return;
    this.q('#craft-panel h3').textContent = STATION_NAMES[st];
    const body = this.q('#craft-panel .body');
    body.innerHTML = '';
    const cv = this.ctx.craftView();
    // The research bench (ESO's): what's known and being learned, and pieces to take apart for their leanings
    if (st === 'anvil') {
      const kindName = { w: 'Weapons', a: 'Armour' } as const;
      const box = el('div', 'research', `<h5>Research</h5><p>Take apart a piece with a leaning to learn it; then you can work that leaning into what you smith. It takes real time, wherever you are.</p>
        <div class="rk">${cv.kinds.map((k) => `<div><b>${kindName[k.kind]}</b> ${k.known.length ? k.known.map((a) => `<span class="lean">${esc(a[0].toUpperCase() + a.slice(1))}</span>`).join('') : '<i>none yet</i>'}${k.researching.map((x) => `<span class="lean busy">${esc(x.word)} · ${x.mins} min</span>`).join('')}</div>`).join('')}</div>
        ${cv.apart.length ? `<div class="apart">${cv.apart.map((a) => `<button class="btn ghost sm" data-apart="${esc(a.id)}"${a.known ? ' disabled' : ''} title="${a.known ? 'Already known' : 'Take it apart: learn ' + esc(a.word)}">Take apart ${esc(a.name)}</button>`).join('')}</div>` : '<p class="none">Nothing in your pack has a leaning to learn from.</p>'}<p class="rmsg"></p>`);
      box.querySelectorAll<HTMLElement>('[data-apart]').forEach((b) => b.addEventListener('click', () => {
        const why = this.ctx.takeApart(b.dataset.apart!);
        if (why) { box.querySelector('.rmsg')!.textContent = why; return; }
        this.renderCraft();
      }));
      body.append(box);
    }
    for (const r of RECIPES.filter((x) => x.station === st)) {
      const info = cv.recipes[r.id];
      const lv = this.ctx.level(r.skill);
      const out = ITEMS[r.output];
      const skillName = SKILLS.find((s) => s.id === r.skill)!.name;
      // Not learned yet: shown faint, with where the recipe comes from (WoW's trainers and drops)
      if (!info?.known) {
        const row = el('div', 'recipe locked unknown', `<div class="slot r-${out.rarity}"><img src="${itemIcon(r.output)}" alt=""></div><div><div class="nm">${esc(out.name)}</div><div class="req"><span>${skillName} ${r.level}</span><span class="src">Recipe not known. ${esc(r.learn ?? '')}</span></div></div><div></div>`);
        body.append(row);
        continue;
      }
      const gear = st === 'anvil' && !!(out.weapon || out.armor);
      const pick = (this.craftPick[r.id] ??= {});
      const okLevel = lv >= r.level;
      const cost = gear ? this.ctx.craftCost(r.id, pick) : r.inputs;
      const maxMake = Math.min(...Object.entries(cost).map(([id, n]) => Math.floor(this.ctx.inv.count(id) / n)));
      const row = el('div', 'recipe' + (okLevel && !info.block ? '' : ' locked'));
      const reqs = Object.entries(cost).map(([id, n]) => {
        const have = this.ctx.inv.count(id);
        return `<span class="${have >= n ? 'ok' : 'no'}"><img class="ric" src="${itemIcon(id)}" alt="">${n}× ${esc(ITEMS[id].name)} (${have})</span>`;
      }).join('');
      // A gear recipe's choices: a researched leaning that fits, and how fine to make it
      const kind = out.weapon ? 'w' : 'a';
      const leanings = gear ? (cv.kinds.find((k) => k.kind === kind)?.known ?? []) : [];
      const choose = gear ? `<div class="choose"><label>Leaning <select data-pick="affix"><option value="">Plain</option>${leanings.map((a) => `<option value="${a}"${pick.affix === a ? ' selected' : ''}>${esc(a[0].toUpperCase() + a.slice(1))}</option>`).join('')}</select></label>
        <label>Quality <select data-pick="q">${[[1, 'Fine', 0], [2, 'Superior', 8], [3, 'Masterwork', 16]].map(([q, w, o]) => `<option value="${q}"${(pick.q ?? 1) === q ? ' selected' : ''}${lv < r.level + Number(o) ? ' disabled' : ''}>${w}${o ? ` (${skillName} ${r.level + Number(o)})` : ''}</option>`).join('')}</select></label></div>` : '';
      const where = r.region ? `<span class="${info.block ? 'no' : 'ok'}">${esc(info.block ?? 'Set piece: this region\'s anvil')}</span>` : '';
      row.innerHTML = `<div class="slot r-${out.rarity}"><img src="${itemIcon(r.output)}" alt=""></div><div><div class="nm" style="color:${RARITY_COLOR[out.rarity]}">${esc(out.name)}</div><div class="req"><span class="dif dif-${info.colour}" title="${esc(info.word)}">${skillName} ${r.level}</span>${where}${reqs}<span>+${info.xp} XP</span></div>${choose}</div><div class="btns"><button class="btn" data-n="1">Make${this.craftAmount ? ` ${this.craftAmount}` : ''}</button><button class="btn ghost" data-n="99">All (${Math.max(0, maxMake)})</button></div>`;
      row.querySelectorAll<HTMLSelectElement>('select[data-pick]').forEach((sel) => sel.addEventListener('change', () => {
        if (sel.dataset.pick === 'affix') pick.affix = sel.value || undefined; else pick.q = Number(sel.value);
        this.renderCraft();
      }));
      row.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.disabled = !okLevel || maxMake < 1 || !!info.block;
        b.addEventListener('click', () => this.ctx.craft(r.id, b.dataset.n === '1' ? this.craftAmount ?? 1 : Number(b.dataset.n), gear ? pick : undefined));
      });
      const slot = row.querySelector('.slot') as HTMLElement;
      slot.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(r.output), e.clientX, e.clientY));
      slot.addEventListener('mouseleave', () => this.hideTooltip());
      body.append(row);
    }
    const foot = this.q('#craft-panel .footer');
    foot.innerHTML = `<span><i class="dif dif-orange">●</i> new <i class="dif dif-yellow">●</i> <i class="dif dif-green">●</i> <i class="dif dif-grey">●</i> outgrown: less experience</span><label class="camt">Make <input type="number" min="1" step="1" placeholder="1" value="${this.craftAmount ?? ''}"> at a time</label>`;
    const ca = foot.querySelector<HTMLInputElement>('.camt input')!;
    ca.addEventListener('keydown', (e) => e.stopPropagation());
    ca.addEventListener('change', () => { const v = Math.floor(Number(ca.value)); this.craftAmount = v > 0 ? v : null; this.renderCraft(); });
  }

  private renderShop(): void {
    const body = this.q('#shop-panel .body');
    body.innerHTML = '';
    const tabs = el('div', 'tabs');
    const shopNow = this.ctx.shop();
    for (const t of ['buy', 'sell', 'back'] as const) {
      const e = el('div', 'tab' + (this.shopTab === t ? ' sel' : ''), t === 'buy' ? 'Buy' : t === 'sell' ? 'Sell' : `Buy back${shopNow.buyback.length ? ` (${shopNow.buyback.length})` : ''}`);
      e.addEventListener('click', () => { this.shopTab = t; this.renderShop(); });
      tabs.append(e);
    }
    body.append(tabs);
    const shop = shopNow;
    this.q('#shop-panel h3').textContent = shop.name;
    if (this.shopTab === 'buy') {
      if (!shop.stock.length) body.append(el('div', '', `<p style="color:var(--muted)">${esc(shop.who)} isn't selling anything. Try the Sell tab.</p>`));
      for (const s of shop.stock) {
        const d = ITEMS[s.item];
        const row = el('div', 'shop-row');
        const tryOn = this.ctx.canPreview(s.item);
        row.innerHTML = `<div class="slot r-${d.rarity}"><img src="${itemIcon(s.item)}" alt=""></div><div><div class="nm" style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</div><div class="d">${esc(d.stats ?? d.desc)}</div></div><span class="coin">${s.price}</span>${tryOn ? '<button class="btn ghost try" title="See it on you before you buy">Try on</button>' : ''}<button class="btn buy">Buy</button>`;
        if (tryOn) row.querySelector('.try')!.addEventListener('click', () => this.ctx.previewItem(s.item));
        const b = row.querySelector('.buy') as HTMLButtonElement;
        b.disabled = (shop.currency ? shop.currency.have : this.ctx.save.marks) < s.price;
        if (shop.currency) { const c = row.querySelector('.coin') as HTMLElement; c.classList.add('token'); c.innerHTML = `<img src="${itemIcon(shop.currency.id)}" alt="">${s.price}`; c.title = shop.currency.name; }
        b.addEventListener('click', () => this.ctx.buy(s.item));
        const slot = row.querySelector('.slot') as HTMLElement;
        slot.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(s.item), e.clientX, e.clientY));
        slot.addEventListener('mouseleave', () => this.hideTooltip());
        body.append(row);
      }
    } else if (this.shopTab === 'back') {
      // What you've sold today, to any trader: back for what you got for it
      body.append(el('p', 'gnote', 'Sold something you meant to keep? Traders hold what you sell them for a day, and let you have it back for what they paid.'));
      shop.buyback.forEach((s, i) => {
        const d = ITEMS[s.id];
        if (!d) return;
        const row = el('div', 'shop-row');
        row.innerHTML = `<div class="slot r-${d.rarity}"><img src="${itemIcon(s.id)}" alt="">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}</div><div><div class="nm" style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</div><div class="d">You sold ${s.n > 1 ? `${s.n} for ${s.price} each` : `it for ${s.price}`}</div></div><span class="coin">${s.price}</span><button class="btn">Buy back</button>`;
        const b = row.querySelector('button')!;
        b.disabled = this.ctx.save.marks < s.price;
        b.addEventListener('click', () => this.ctx.buyBack(i));
        const slot = row.querySelector('.slot') as HTMLElement;
        slot.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(s.id), e.clientX, e.clientY));
        slot.addEventListener('mouseleave', () => this.hideTooltip());
        body.append(row);
      });
      if (!shop.buyback.length) body.append(el('div', '', '<p style="color:var(--muted)">You haven\'t sold anything today.</p>'));
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

  /** The Exchange: Buy (the book, cheapest first, searchable) and Sell (your stacks, and pricing one from your pack). */
  // ------------------------------------------------------------------ The Group Finder
  private renderFinder(): void {
    const v = this.ctx.finder();
    const body = this.q('#finder-panel .body');
    const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    let status = '';
    if (v.run) {
      const with_ = [...v.run.others, ...v.run.henchmen];
      status = `<div class="gf-status in"><b>In ${esc(v.run.name)}${v.run.done ? ' (cleared)' : ''}</b><span>With ${with_.length ? esc(with_.join(', ')) : 'nobody'}.</span><button class="btn ghost" data-gf="leave">Leave the dungeon</button></div>`;
    } else if (v.queue) {
      const d = v.dungeons.find((x) => x.id === v.queue!.dungeon);
      const left = Math.max(0, 90 - v.queue.secs);
      status = `<div class="gf-status"><b>Looking for players: ${esc(d?.name ?? '')}</b><span>${v.queue.count} of 4 queued · ${mm(v.queue.secs)}${left ? ` · henchmen fill the empty places in ${mm(left)}` : ' · filling with henchmen'}</span><div class="gf-btns"><button class="btn" data-gf="now" title="Go in with whoever is queued; henchmen take the other places">Go now</button><button class="btn ghost" data-gf="cancel">Stop looking</button></div></div>`;
    }
    const roles = `<div class="gf-roles"><span class="lbl">Go in as</span>${ROLES.map((r) => `<button class="gf-role${v.role === r ? ' sel' : ''}" data-role="${r}" title="${esc(ROLE_DESC[r])}"><b>${ROLE_NAMES[r]}</b></button>`).join('')}<small>${esc(ROLE_DESC[v.role])}${v.role === 'healer' ? ' Six tenths of the damage you deal goes to them, and your calling\'s heal (key 4) mends everyone near you as well.' : v.role === 'tank' ? ' What you hit stays on you: your blows count three times for keeping its attention.' : ''}</small></div>`;
    const anyVet = v.dungeons.some((d) => d.clears > 0);
    const vetRow = `<div class="gf-roles"><span class="lbl">Difficulty</span><button class="gf-role${v.vet ? '' : ' sel'}" data-vet="0"><b>Normal</b></button><button class="gf-role${v.vet ? ' sel' : ''}" data-vet="1"${anyVet ? '' : ' disabled'} title="${anyVet ? 'Harder creatures, faster boss moves, better rewards' : 'Clear a dungeon once to open its veteran mode'}"><b>Veteran</b></button><small>${anyVet ? (v.vet ? 'Veteran: creatures have 70% more health and hit a third harder, bosses\' big moves come sooner and land heavier. The chest pays more, every boss is likelier to drop its piece, and the first veteran clear gives the Laurel cloak. Only for dungeons you\'ve cleared.' : 'The dungeons as they come.') : 'Clear a dungeon once and its veteran mode opens: harder, and better paid.'}</small></div>`;
    const order = [...v.dungeons].sort((a, b) => Number(b.id === this.finderAt) - Number(a.id === this.finderAt));
    // The random dungeon, ESO's way: any of them, and the day's first pays the Lamp Company's bonus
    const busyR = !!v.run || !!v.queue, findOffR = busyR || !v.online || (!!v.group && !v.group.leader);
    const pl = v.pledge;
    const pledgeLine = pl ? `<div class="gf-meta">The Lamp Company's pledge today: <b>${esc(pl.name)}</b>. ${pl.state === 'open' ? 'Take it from Ruth Penhale at Ansbury\'s south gate (or Xisca Mir in Callis), clear it, and go back for Lamp keys.' : pl.state === 'taken' ? 'Taken: clear it (veteran pays double), then go back for your keys.' : pl.state === 'done' ? 'Cleared: go back to the Company for your keys.' : 'Done and paid. A new one at midnight.'}</div>` : '';
    const randomCard = `<div class="gf-card gf-random"><h5>Random dungeon<small>any of them · for four · at your level</small></h5>
      <p>The finder picks one for you. ${v.randomReady ? 'The day\'s first random clear pays the Lamp Company\'s bonus: a heap of experience, marks, and a Lamp key.' : 'Today\'s bonus is taken; it comes back at midnight. The chest pays as always.'}</p>${pledgeLine}
      <div class="gf-go"><button class="btn" data-gf="rfind"${findOffR ? ' disabled' : ''}>${v.group ? (v.group.leader ? `Take your group (${v.group.size})` : 'Your leader takes you in') : 'Find players'}</button><button class="btn ghost" data-gf="rhench"${busyR ? ' disabled' : ''}>Go alone with henchmen</button></div></div>`;
    const cards = order.map((d) => {
      const busy = !!v.run || !!v.queue;
      const findLabel = v.group ? (v.group.leader ? `Take your group in (${v.group.size})` : 'Your group\'s leader takes you in') : 'Find players';
      const findOff = busy || !v.online || (!!v.group && !v.group.leader);
      return `<div class="gf-card${d.id === this.finderAt ? ' sel' : ''}"><h5>${esc(d.name)}<small>${esc(d.where)} · for four · at your level</small></h5>
        <p>${esc(d.blurb)}</p>
        <div class="gf-meta">${d.clears ? `Cleared ${d.clears === 1 ? 'once' : d.clears + ' times'}${d.vetClears ? `, ${d.vetClears === 1 ? 'once' : d.vetClears + ' times'} on veteran` : ''}. The day's first clear pays half again.${v.vet ? ' You\'ll go in on veteran.' : ''}` : `Not cleared yet.${v.vet ? ' Veteran opens once you have: this one goes in on normal.' : ''}`}</div>
        <div class="gf-go"><button class="btn" data-gf="find" data-id="${d.id}"${findOff ? ' disabled' : ''} title="${v.online ? 'Real players first; henchmen take any place still empty after a minute and a half' : 'Finding other players needs the online realm.'}">${findLabel}</button><button class="btn ghost" data-gf="hench" data-id="${d.id}"${busy ? ' disabled' : ''}>Go alone with henchmen</button></div>${v.online && !v.group ? '<div class="gf-meta">Real players first. Any place still empty after 1:30 goes to a henchman, so you might go in two and two.</div>' : ''}</div>`;
    }).join('');
    // World bosses: when each rises next, and a group to take it on with
    const bosses = v.bosses ?? [];
    const bossCard = bosses.length ? `<div class="gf-card gf-bosses"><h5>World bosses<small>out in the world · anyone may join in · groups of up to five</small></h5>
      <p>Find a group for one and the realm puts you in a group already going after it, or with the next player who looks. If you lead a group, looking opens yours to them.</p>
      ${bosses.map((b) => { const up = b.until < 0, seeking = v.wbSeek === b.id; return `<div class="gf-boss${up ? ' up' : ''}"><div><b>${esc(b.name)}</b><small>${esc(b.where)}</small></div><span class="gf-when">${up ? `Up now · ${mm(-b.until)} left` : `Rises in ${mm(b.until)}`}</span>${seeking ? '<button class="btn ghost sm" data-gf="wbstop">Stop looking</button>' : `<button class="btn sm" data-gf="wbfind" data-id="${b.id}"${v.online ? '' : ' disabled'} title="${v.online ? 'Join or start a group for it' : 'Needs the online realm'}">Find a group</button>`}</div>`; }).join('')}</div>` : '';
    const hench = HENCHMEN.map((h) => `<b>${esc(h.name)}</b> (${esc(h.title.toLowerCase())}, ${ROLE_NAMES[h.role].toLowerCase()})`).join(', ');
    body.innerHTML = status + bossCard + roles + vetRow + randomCard + cards + `<p class="gf-note">Henchmen fill any place a player doesn't: ${hench}. They follow you, step out of what they see coming, and fight to their role.${v.online ? '' : ' You\'re offline, so it\'s henchmen only.'}</p>`;
    this.q('#finder-panel .footer').innerHTML = `<span>${document.body.classList.contains('touch') ? 'The Group button' : 'P'} opens this anywhere. Each also has a door to walk to: the boarded one in Sallow Pit's chamber, and the crack in the Kettle's north wall.</span>`;
    body.querySelectorAll<HTMLElement>('[data-role]').forEach((b) => b.addEventListener('click', () => { this.ctx.sfx('click'); this.ctx.finderDo('role', b.dataset.role); }));
    body.querySelectorAll<HTMLButtonElement>('[data-vet]').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; this.ctx.sfx('click'); this.ctx.finderDo('vet', b.dataset.vet); }));
    body.querySelectorAll<HTMLButtonElement>('[data-gf]').forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return;
      this.ctx.sfx('click');
      const what = b.dataset.gf as 'hench' | 'find' | 'now' | 'cancel' | 'leave' | 'rhench' | 'rfind' | 'wbfind' | 'wbstop';
      if (what === 'leave') { this.ask('Leave the dungeon?', () => this.ctx.finderDo('leave'), () => {}, 30); return; }
      this.ctx.finderDo(what, b.dataset.id);
    }));
  }

  private renderMusic(): void {
    const v = this.ctx.music();
    const body = this.q('#music-panel .body');
    const keys = document.body.classList.contains('touch') ? 'the skill buttons' : 'keys 1 to 8';
    this.q('#music-panel .footer').innerHTML = `<span>${document.body.classList.contains('touch') ? 'Your instrument in the pack' : 'N'} opens the songbook. With an instrument out, ${keys} play the scale${document.body.classList.contains('touch') ? '' : ' (Shift for the octave above)'}. Walking off puts it away.</span>`;
    if (!v.owned.length) {
      body.innerHTML = '<p class="mu-note">You don\'t carry an instrument. The Waits\' House in Ansbury, on the Charter Green, takes on apprentices, and starts them with a tin whistle.</p>';
      return;
    }
    const inst = v.owned.map((o) => `<button class="btn${v.out?.item === o.item ? '' : ' ghost'} mu-inst" data-mu="take" data-a="${o.item}"><img src="${itemIcon(o.item)}" alt=""> ${esc(o.name)}</button>`).join('');
    let html = `<div class="mu-row">${inst}${v.out ? '<button class="btn ghost" data-mu="away">Put it away</button>' : ''}</div>`;
    if (v.playing) {
      const t = v.tunes.find((x) => x.id === v.playing!.tune);
      html += `<div class="mu-now"><b>Playing "${esc(t?.name ?? v.playing.tune)}"</b><span>${PART_NAMES[v.playing.part]} · ${Math.floor(v.playing.left / 60)}:${String(v.playing.left % 60).padStart(2, '0')} left</span><button class="btn ghost" data-mu="stop">Stop</button></div>`;
    }
    if (v.spot) html += `<p class="mu-note">You're at ${esc(v.spot)}. Play a tune through and people will stop to listen.</p>`;
    if (v.out) {
      // Your part, for the songbook and for the band
      const parts = (['lead', 'harmony', 'bass', 'drum'] as PartId[]).filter((k) => v.tunes.some((t) => t.parts.includes(k)) || k === v.myPart);
      html += `<div class="mu-row mu-parts"><span class="lbl">You play</span>${parts.map((k) => `<button class="gf-role${v.myPart === k ? ' sel' : ''}" data-mu="part" data-a="${k}"><b>${PART_NAMES[k]}</b></button>`).join('')}</div>`;
    }
    if (v.band) {
      const rows = v.band.map((m) => `<li${m.me ? ' class="me"' : ''}><b>${esc(m.name)}</b><span>${m.voice ? `${esc(m.voice)} · ${PART_NAMES[m.part!]}` : 'no instrument out'}</span></li>`).join('');
      html += `<div class="mu-band"><h5>Your band</h5><ul>${rows}</ul><p class="mu-note">${v.leader ? 'Strike up any tune in your songbook below: everyone in your group with an instrument out comes in on the same beat, each on their own part.' : 'Your group\'s leader strikes the band up. Have your instrument out, and pick your part.'}${v.online ? '' : ' Bands need the online realm.'}</p></div>`;
    }
    if (!v.tunes.length) html += '<p class="mu-note">No tunes in your songbook yet. You can still play by ear on the number keys.</p>';
    else html += v.tunes.map((t) => {
      const can = !!v.out && t.parts.includes(v.myPart);
      const strike = v.band && v.leader && v.online ? `<button class="btn ghost" data-mu="strike" data-a="${t.id}"${v.out ? '' : ' disabled'}>Strike up the band</button>` : '';
      return `<div class="mu-tune"><h5>${esc(t.name)}<small>${Math.floor(t.secs / 60)}:${String(t.secs % 60).padStart(2, '0')} · from ${esc(t.from)}</small></h5><p>${esc(t.desc)}</p><div class="mu-row"><button class="btn" data-mu="play" data-a="${t.id}"${can ? '' : ' disabled'} title="${v.out ? (can ? 'Play it through twice' : 'Your instrument can\'t take that part of this tune') : 'Take an instrument out first'}">Play</button>${strike}</div></div>`;
    }).join('');
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('[data-mu]').forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return;
      this.ctx.sfx('click');
      this.ctx.musicDo(b.dataset.mu as 'take' | 'away' | 'play' | 'stop' | 'part' | 'strike', b.dataset.a);
    }));
  }

  /**
   * A button at the top of the screen that takes you out of a group dungeon once it's cleared
   * (Dungeons: the last boss down), so nobody has to walk back to the ladder. Null hides it.
   */
  /** A training dummy's count over the action bar (null takes it away). */
  dpsMeter(html: string | null): void {
    let e = this.root.querySelector<HTMLElement>('#dps');
    if (!html) { e?.remove(); return; }
    if (!e) { e = el('div', 'hud-only'); e.id = 'dps'; this.root.append(e); }
    if (e.innerHTML !== html) e.innerHTML = html;
  }

  setLeaveButton(label: string | null, onClick?: () => void): void {
    let b = document.getElementById('leave-btn') as HTMLButtonElement | null;
    if (!label) { if (b) b.style.display = 'none'; return; }
    if (!b) { b = document.createElement('button'); b.id = 'leave-btn'; b.className = 'btn hud-only'; this.root.append(b); }
    b.textContent = label;
    b.style.display = '';
    b.onclick = () => { this.ctx.sfx('click'); onClick?.(); };
  }

  /** The envelope by the minimap while letters wait unread at the Charter Post. */
  setMailBadge(n: number): void {
    const b = this.q('.mm-mail') as HTMLElement | null;
    if (!b) return;
    if (!b.querySelector('img')!.getAttribute('src')) b.querySelector('img')!.src = shapeIcon('letter', '#efe4c8', '#b03a2e');
    b.classList.toggle('show', n > 0);
    b.querySelector('b')!.textContent = n > 1 ? String(n) : '';
    b.title = n === 1 ? 'A letter waits for you at the Charter Post' : `${n} letters wait for you at the Charter Post`;
  }

  private renderMail(): void {
    const v = this.ctx.mail();
    const body = this.q('#mail-panel .body');
    body.innerHTML = '';
    const marks = this.ctx.save.marks;
    this.q('#mail-panel .footer').innerHTML = `<span>Postage: a mark a letter, and a mark for each stack sent with it</span><span class="coin">${marks} marks</span>`;
    if (!v.online) {
      body.append(el('p', 'ex-note', 'The Charter Post keeps everyone\'s letters on the realm server. You\'re playing offline, so the clerk has nothing to hand you. Play online to read and send letters.'));
      return;
    }
    const slot = (id: string, n: number) => `<div class="slot r-${ITEMS[id]?.rarity ?? 'common'}" data-tip="${id}"><img src="${itemIcon(id)}" alt="">${n > 1 ? `<span class="n">${n}</span>` : ''}</div>`;
    const tips = (root: HTMLElement) => root.querySelectorAll<HTMLElement>('[data-tip]').forEach((s) => {
      s.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(s.dataset.tip!), e.clientX, e.clientY));
      s.addEventListener('mouseleave', () => this.hideTooltip());
    });
    const stopKeys = (i: HTMLElement) => i.addEventListener('keydown', (e) => e.stopPropagation());
    const tabs = el('div', 'tabs');
    const tab = (label: string, on: boolean, go: () => void) => { const t = el('div', 'tab' + (on ? ' sel' : ''), label); t.addEventListener('click', () => { this.ctx.sfx('click'); go(); }); tabs.append(t); };
    tab(`Letters${v.unread ? ` (${v.unread} new)` : ''}`, !v.writing, () => this.ctx.mailDo('back'));
    tab('Write a letter', v.writing, () => this.ctx.mailDo('write'));
    const reload = el('button', 'btn ghost ex-reload', 'Refresh');
    reload.addEventListener('click', () => this.ctx.mailDo('reload'));
    tabs.append(reload);
    body.append(tabs);

    // ---- Writing
    if (v.writing) {
      const d = v.draft;
      const form = el('div', 'ml-write');
      form.innerHTML = `<label>To <input class="ml-to" maxlength="20" placeholder="A character's name"></label>
        <label>Subject <input class="ml-subj" maxlength="60"></label>
        <textarea class="ml-body" maxlength="1200" placeholder="Dear…"></textarea>`;
      const to = form.querySelector('.ml-to') as HTMLInputElement, subj = form.querySelector('.ml-subj') as HTMLInputElement, text = form.querySelector('.ml-body') as HTMLTextAreaElement;
      to.value = d.to; subj.value = d.subject; text.value = d.body;
      for (const i of [to, subj, text]) stopKeys(i);
      to.addEventListener('input', () => { d.to = to.value; });
      subj.addEventListener('input', () => { d.subject = subj.value; });
      text.addEventListener('input', () => { d.body = text.value; });
      body.append(form);
      // What goes with it
      body.append(el('h6', 'ex-h', `Sent with it (${d.items.length} of ${MAIL_STACKS} stacks)`));
      const sent = el('div', 'ml-with');
      for (const st of d.items) {
        const have = this.ctx.save.inv.reduce((a, x) => a + (x && x.id === st.id ? x.n : 0), 0);
        const row = el('div', 'shop-row');
        row.innerHTML = `${slot(st.id, st.n)}<div><div class="nm" style="color:${RARITY_COLOR[ITEMS[st.id]?.rarity ?? 'common']}">${esc(ITEMS[st.id]?.name ?? st.id)}</div><div class="d">You have ${have}</div></div>${have > 1 ? `<input type="number" class="ml-n" min="1" max="${have}" value="${st.n}">` : '<span></span>'}<button class="btn ghost">Take out</button>`;
        const nIn = row.querySelector('.ml-n') as HTMLInputElement | null;
        if (nIn) { stopKeys(nIn); nIn.addEventListener('change', () => { st.n = Math.min(have, Math.max(1, Math.floor(Number(nIn.value) || 1))); nIn.value = String(st.n); this.renderMail(); }); }
        row.querySelector('button')!.addEventListener('click', () => this.ctx.mailDo('attach', undefined, st.id));
        sent.append(row);
      }
      const mk = el('label', 'ml-marks');
      mk.innerHTML = `Marks <input type="number" min="0" max="1000000" value="${d.marks || 0}">`;
      const mIn = mk.querySelector('input') as HTMLInputElement;
      stopKeys(mIn);
      mIn.addEventListener('change', () => { d.marks = Math.max(0, Math.min(1_000_000, Math.floor(Number(mIn.value) || 0))); this.renderMail(); });
      sent.append(mk);
      body.append(sent);
      const cost = postage(d.items.length);
      const go = el('div', 'ml-go');
      go.innerHTML = `<span>Postage ${cost} ${cost === 1 ? 'mark' : 'marks'}${d.marks ? `, and ${d.marks} sent` : ''}</span><button class="btn">${v.sending ? 'Posting…' : 'Post it'}</button>`;
      const b = go.querySelector('button')!;
      b.disabled = v.sending || marks < cost + (d.marks || 0);
      b.addEventListener('click', () => { d.to = to.value; d.subject = subj.value; d.body = text.value; this.ctx.mailDo('send'); });
      body.append(go);
      // Your pack, to choose from
      body.append(el('h6', 'ex-h', 'From your pack'));
      const grid = el('div', 'ml-pack');
      const seen = new Map<string, number>();
      for (const st of this.ctx.save.inv) if (st && ITEMS[st.id] && ITEMS[st.id].kind !== 'quest') seen.set(st.id, (seen.get(st.id) ?? 0) + st.n);
      if (!seen.size) grid.append(el('p', 'ex-note', 'Nothing in your pack the Post will carry.'));
      for (const [id, n] of seen) {
        const cell = el('div', 'ml-cell' + (d.items.some((x) => x.id === id) ? ' on' : ''));
        cell.innerHTML = slot(id, n);
        cell.addEventListener('click', () => this.ctx.mailDo('attach', undefined, id, n));
        grid.append(cell);
      }
      body.append(grid);
      tips(body);
      return;
    }

    // ---- Reading one
    const l = v.reading;
    if (l) {
      const card = el('div', 'ml-letter');
      card.innerHTML = `<div class="ml-head"><b>${esc(l.subject)}</b><span>${l.returned ? 'The Charter Post' : 'From ' + esc(l.from)} · ${ago(l.at)}</span></div><div class="ml-text">${esc(l.body) || '<i>No letter, only what came with it.</i>'}</div>`;
      if (l.items.length || l.marks) {
        const w = el('div', 'ml-in');
        w.innerHTML = `<span>In the letter</span>${l.items.map((x) => slot(x.id, x.n)).join('')}${l.marks ? `<span class="coin">${l.marks}</span>` : ''}<button class="btn">Take it out</button>`;
        w.querySelector('button')!.addEventListener('click', () => this.ctx.mailDo('take', l.id));
        card.append(w);
      }
      const acts = el('div', 'ml-acts');
      const act = (label: string, ghost: boolean, go: () => void) => { const b = el('button', 'btn' + (ghost ? ' ghost' : ''), label); b.addEventListener('click', go); acts.append(b); };
      act('Back to the letters', true, () => this.ctx.mailDo('back'));
      if (l.fromKey) act('Reply', false, () => this.ctx.mailDo('reply', l.id));
      if (l.fromKey && !l.returned) act('Send it back', true, () => this.ctx.mailDo('return', l.id));
      if (!l.items.length && !l.marks) act('Throw away', true, () => this.ctx.mailDo('delete', l.id));
      card.append(acts);
      body.append(card);
      tips(card);
      return;
    }

    // ---- The box
    if (!v.letters.length) {
      body.append(el('p', 'ex-note', v.loading ? 'The clerk is looking through the pigeonholes…' : 'Nothing has come for you. Letters other players send you wait here, at any Charter Post box.'));
      return;
    }
    const list = el('div', 'ex-list');
    for (const x of v.letters) {
      const row = el('div', 'shop-row ml-row' + (x.read ? '' : ' unread'));
      const holds = x.items.length || x.marks;
      row.innerHTML = `<div class="slot"><img src="${shapeIcon('letter', x.read ? '#d8cfb6' : '#f4ead0', x.returned ? '#6a6a6a' : '#b03a2e')}" alt=""></div><div><div class="nm">${esc(x.subject)}</div><div class="d">${x.returned ? 'Returned by the Post' : esc(x.from)} · ${ago(x.at)}${holds ? ' · something in it' : ''}</div></div><span></span><button class="btn ghost">Read</button>`;
      row.addEventListener('click', () => this.ctx.mailDo('read', x.id));
      list.append(row);
    }
    body.append(list);
  }

  private renderExchange(): void {
    const v = this.ctx.exchange();
    const body = this.q('#exchange-panel .body');
    body.innerHTML = '';
    const marks = this.ctx.save.marks;
    // A stall's page: whose it is in the title, no cut, and only the side of it that's yours to use
    const stall = v.stall;
    this.q('#exchange-panel header h3').textContent = stall ? (stall.mine ? 'Your stall' : `${stall.owner}'s stall`) : 'The Exchange';
    if (stall) this.exTab = stall.mine ? 'sell' : 'buy';
    this.q('#exchange-panel .footer').innerHTML = `<span>${stall ? (stall.mine ? 'No cut: a stall\'s takings are all yours' : `Paid to ${esc(stall.owner)}, there or not`) : 'A mark in twenty of every sale goes to the Exchange'}</span><span class="coin">${marks} marks</span>`;
    if (!v.online) {
      body.append(el('p', 'ex-note', 'The Exchange keeps one book for the whole realm, on the realm server. You\'re playing offline, so the broker can\'t read it to you. Play online to buy and sell here.'));
      return;
    }
    const tabs = el('div', 'tabs');
    for (const t of (stall ? [this.exTab] : ['buy', 'sell', 'want']) as ('buy' | 'sell' | 'want')[]) {
      const e = el('div', 'tab' + (this.exTab === t ? ' sel' : ''), t === 'buy' ? 'Buy' : t === 'want' ? `Wanted${v.myWants.length ? ` (${v.myWants.length})` : ''}` : `Sell${v.mine.length ? ` (${v.mine.length})` : ''}`);
      e.addEventListener('click', () => { this.exTab = t; this.ctx.sfx('click'); this.renderExchange(); });
      tabs.append(e);
    }
    const reload = el('button', 'btn ghost ex-reload', 'Refresh');
    reload.addEventListener('click', () => this.ctx.exReload());
    tabs.append(reload);
    body.append(tabs);
    const slot = (id: string, n: number) => `<div class="slot r-${ITEMS[id]?.rarity ?? 'common'}"><img src="${itemIcon(id)}" alt="">${n > 1 ? `<span class="n">${n}</span>` : ''}</div>`;
    const tip = (row: HTMLElement, id: string) => {
      const s = row.querySelector('.slot') as HTMLElement;
      s.addEventListener('mousemove', (e) => this.showTooltip(this.tooltipFor(id), e.clientX, e.clientY));
      s.addEventListener('mouseleave', () => this.hideTooltip());
    };
    if (this.exTab === 'buy') {
      const search = el('input', 'ex-search') as HTMLInputElement;
      search.placeholder = 'Search the book';
      search.value = this.exQuery;
      search.addEventListener('keydown', (e) => e.stopPropagation());
      search.addEventListener('input', () => { this.exQuery = search.value; this.renderExchangeRows(list, v.rows, marks, slot, tip); });
      body.append(search);
      const list = el('div', 'ex-list');
      body.append(list);
      this.renderExchangeRows(list, v.rows, marks, slot, tip);
      if (!v.rows.length) list.append(el('p', 'ex-note', v.loading ? (stall ? 'Looking over the stall…' : 'The broker is finding the page…') : stall ? `Nothing on ${esc(stall.owner)}'s stall just now.` : 'Nothing is for sale in the book just now. Be the first: the Sell page posts a stack.'));
      setTimeout(() => { if (this.exQuery) search.focus(); }, 0);
      return;
    }
    if (this.exTab === 'want') { this.renderWanted(body, v, marks, slot, tip); return; }
    // Sell: your stacks in the book, then your pack
    body.append(el('h6', 'ex-h', stall ? `On your stall (${v.mine.length} of 24)` : `Your stacks in the book (${v.mine.length} of 20)`));
    if (!v.mine.length) body.append(el('p', 'ex-note', stall ? 'Nothing yet. Choose something from your pack below to set it out.' : 'None. Choose something from your pack below to post it.'));
    if (stall) {
      const down = el('button', 'btn ghost ex-reload', 'Take the stall down');
      down.addEventListener('click', () => this.ctx.exStallDown());
      body.append(down);
    }
    for (const r of v.mine) {
      const d = ITEMS[r.item];
      const row = el('div', 'shop-row');
      row.innerHTML = `${slot(r.item, r.n)}<div><div class="nm" style="color:${RARITY_COLOR[d?.rarity ?? 'common']}">${esc(d?.name ?? r.item)}</div><div class="d">Posted ${ago(r.at)}</div></div><span class="coin">${r.price}</span><button class="btn ghost">Take back</button>`;
      row.querySelector('button')!.addEventListener('click', () => this.ctx.exTakeBack(r.id));
      tip(row, r.item);
      body.append(row);
    }
    body.append(el('h6', 'ex-h', 'Post from your pack'));
    const seen = new Map<string, number>();
    for (const st of this.ctx.save.inv) if (st && ITEMS[st.id] && ITEMS[st.id].kind !== 'quest') seen.set(st.id, (seen.get(st.id) ?? 0) + st.n);
    if (!seen.size) body.append(el('p', 'ex-note', 'Nothing in your pack the broker will take.'));
    if (this.exSell && !seen.has(this.exSell)) this.exSell = null;
    for (const [id, have] of seen) {
      const d = ITEMS[id];
      const row = el('div', 'shop-row ex-pick' + (this.exSell === id ? ' sel' : ''));
      const each = v.cheapest.get(id);
      row.innerHTML = `${slot(id, have)}<div><div class="nm" style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</div><div class="d">${each !== undefined ? `In the book from ${Math.ceil(each)} each` : 'None in the book'}</div></div><span></span><button class="btn">${this.exSell === id ? 'Choosing' : 'Sell'}</button>`;
      row.querySelector('button')!.addEventListener('click', () => { this.exSell = this.exSell === id ? null : id; this.renderExchange(); });
      tip(row, id);
      body.append(row);
      if (this.exSell !== id) continue;
      // Pricing: how many, at what price, and what you'll see after the cut
      const guide = Math.max(1, Math.round(each ?? Math.max(2, d.value * 1.5)));
      const form = el('div', 'ex-form');
      form.innerHTML = `<label>How many <input type="number" class="ex-n" min="1" max="${have}" value="${have}"></label><label>Price for the stack <input type="number" class="ex-p" min="1" max="1000000" value="${guide * have}"></label><span class="ex-net"></span><button class="btn ex-post">Post</button>`;
      const nIn = form.querySelector('.ex-n') as HTMLInputElement, pIn = form.querySelector('.ex-p') as HTMLInputElement, net = form.querySelector('.ex-net') as HTMLElement;
      const upd = () => { const p = Math.max(0, Math.floor(Number(pIn.value) || 0)); net.textContent = `You get ${stall ? p : p - Math.floor(p * 0.05)} when it sells`; };
      for (const i of [nIn, pIn]) { i.addEventListener('keydown', (e) => e.stopPropagation()); i.addEventListener('input', upd); }
      nIn.addEventListener('change', () => { const n = Math.min(have, Math.max(1, Math.floor(Number(nIn.value) || 1))); nIn.value = String(n); pIn.value = String(guide * n); upd(); });
      upd();
      form.querySelector('.ex-post')!.addEventListener('click', () => {
        const n = Math.min(have, Math.max(1, Math.floor(Number(nIn.value) || 1)));
        this.ctx.exPost(id, n, Math.floor(Number(pIn.value) || 0));
        this.exSell = null;
      });
      body.append(form);
    }
  }

  /**
   * The Wanted page: everyone's orders (fill one from your pack and be paid now), your own (withdraw them),
   * and a form to post one: find the item, say how many and what you'll pay, and the marks are held.
   */
  private renderWanted(body: HTMLElement, v: ExchangeView, marks: number, slot: (id: string, n: number) => string, tip: (row: HTMLElement, id: string) => void): void {
    body.append(el('p', 'ex-note', 'Orders: what people want, and what they\'ll pay. Fill one from your pack and you\'re paid on the spot, less a mark in twenty. Post your own and your marks are held till someone fills it; it\'s how you get a crafter to make something for you.'));
    body.append(el('h6', 'ex-h', `Wanted (${v.wants.length})`));
    if (!v.wants.length) body.append(el('p', 'ex-note', v.loading ? 'The broker is finding the page…' : 'Nobody wants anything just now.'));
    for (const w of v.wants) {
      const d = ITEMS[w.item], have = this.ctx.save.inv.reduce((a, st) => a + (st && st.id === w.item ? st.n : 0), 0);
      const row = el('div', 'shop-row');
      row.innerHTML = `${slot(w.item, w.n)}<div><div class="nm" style="color:${RARITY_COLOR[d?.rarity ?? 'common']}">${esc(d?.name ?? w.item)}${w.n > 1 ? ` × ${w.n}` : ''}</div><div class="d">Wanted by ${esc(w.seller)}, ${ago(w.at)} · you have ${have}</div></div><span class="coin">${w.price}</span><button class="btn"${have >= w.n ? '' : ' disabled'}>Fill</button>`;
      row.querySelector('button')!.addEventListener('click', () => this.ctx.exFill(w.id));
      tip(row, w.item);
      body.append(row);
    }
    body.append(el('h6', 'ex-h', `Your orders (${v.myWants.length} of 10)`));
    if (!v.myWants.length) body.append(el('p', 'ex-note', 'None.'));
    for (const w of v.myWants) {
      const d = ITEMS[w.item];
      const row = el('div', 'shop-row');
      row.innerHTML = `${slot(w.item, w.n)}<div><div class="nm" style="color:${RARITY_COLOR[d?.rarity ?? 'common']}">${esc(d?.name ?? w.item)}${w.n > 1 ? ` × ${w.n}` : ''}</div><div class="d">Posted ${ago(w.at)}; held till filled, or a week</div></div><span class="coin">${w.price}</span><button class="btn ghost">Withdraw</button>`;
      row.querySelector('button')!.addEventListener('click', () => this.ctx.exUnwant(w.id));
      tip(row, w.item);
      body.append(row);
    }
    body.append(el('h6', 'ex-h', 'Post an order'));
    const search = el('input', 'ex-search') as HTMLInputElement;
    search.placeholder = 'What do you want? Type part of its name';
    search.value = this.exWantQuery;
    search.addEventListener('keydown', (e) => e.stopPropagation());
    body.append(search);
    const picks = el('div', 'ex-list');
    body.append(picks);
    const draw = () => {
      picks.innerHTML = '';
      const q = this.exWantQuery.trim().toLowerCase();
      if (q.length < 2) { picks.append(el('p', 'ex-note', 'Two letters or more.')); return; }
      const found = Object.values(ITEMS).filter((d) => d.kind !== 'quest' && d.name.toLowerCase().includes(q)).slice(0, 8);
      if (!found.length) { picks.append(el('p', 'ex-note', 'The broker doesn\'t know that one.')); return; }
      for (const d of found) {
        const row = el('div', 'shop-row ex-pick' + (this.exWantPick === d.id ? ' sel' : ''));
        const each = v.cheapest.get(d.id);
        row.innerHTML = `${slot(d.id, 1)}<div><div class="nm" style="color:${RARITY_COLOR[d.rarity]}">${esc(d.name)}</div><div class="d">${each !== undefined ? `For sale from ${Math.ceil(each)} each` : 'None for sale'}</div></div><button class="btn ghost">${this.exWantPick === d.id ? 'Close' : 'Order'}</button>`;
        row.querySelector('button')!.addEventListener('click', () => { this.exWantPick = this.exWantPick === d.id ? null : d.id; this.renderExchange(); });
        tip(row, d.id);
        picks.append(row);
        if (this.exWantPick !== d.id) continue;
        const guide = Math.max(1, Math.round(each ?? Math.max(2, d.value * 1.5)));
        const form = el('div', 'ex-form');
        form.innerHTML = `<label>How many <input type="number" class="ex-n" min="1" max="999" value="1"></label><label>You'll pay, for all of them <input type="number" class="ex-p" min="1" max="1000000" value="${guide}"></label><span class="ex-net"></span><button class="btn ex-post">Post the order</button>`;
        const nIn = form.querySelector('.ex-n') as HTMLInputElement, pIn = form.querySelector('.ex-p') as HTMLInputElement, net = form.querySelector('.ex-net') as HTMLElement;
        const upd = () => { const pr = Math.max(0, Math.floor(Number(pIn.value) || 0)); net.textContent = pr > marks ? `You have ${marks} marks` : `${pr} marks held by the Exchange`; };
        for (const i of [nIn, pIn]) { i.addEventListener('keydown', (e) => e.stopPropagation()); i.addEventListener('input', upd); }
        nIn.addEventListener('change', () => { const n = Math.min(999, Math.max(1, Math.floor(Number(nIn.value) || 1))); nIn.value = String(n); pIn.value = String(guide * n); upd(); });
        upd();
        form.querySelector('.ex-post')!.addEventListener('click', () => {
          this.ctx.exWant(d.id, Math.min(999, Math.max(1, Math.floor(Number(nIn.value) || 1))), Math.floor(Number(pIn.value) || 0));
          this.exWantPick = null;
        });
        picks.append(form);
      }
    };
    search.addEventListener('input', () => { this.exWantQuery = search.value; this.exWantPick = null; draw(); });
    draw();
    setTimeout(() => { if (this.exWantQuery) search.focus(); }, 0);
  }

  private renderExchangeRows(list: HTMLElement, rows: { id: number; item: string; n: number; price: number; seller: string }[], marks: number, slot: (id: string, n: number) => string, tip: (row: HTMLElement, id: string) => void): void {
    list.innerHTML = '';
    const q = this.exQuery.trim().toLowerCase();
    const shown = rows.filter((r) => !q || (ITEMS[r.item]?.name ?? r.item).toLowerCase().includes(q)).slice(0, 120);
    if (q && !shown.length) list.append(el('p', 'ex-note', 'Nothing in the book matches that.'));
    for (const r of shown) {
      const d = ITEMS[r.item];
      const row = el('div', 'shop-row');
      const each = r.n > 1 ? ` · ${Math.ceil(r.price / r.n)} each` : '';
      row.innerHTML = `${slot(r.item, r.n)}<div><div class="nm" style="color:${RARITY_COLOR[d?.rarity ?? 'common']}">${esc(d?.name ?? r.item)}${r.n > 1 ? ` × ${r.n}` : ''}</div><div class="d">${esc(r.seller)}${each}</div></div><span class="coin">${r.price}</span><button class="btn">Buy</button>`;
      const b = row.querySelector('button')!;
      b.disabled = marks < r.price;
      b.addEventListener('click', () => this.ctx.exBuy(r.id));
      tip(row, r.item);
      list.append(row);
    }
  }

  private renderTravel(): void {
    const v = this.ctx.travel();
    const body = this.q('#travel-panel .body');
    body.innerHTML = '';
    for (const s of v.stops) {
      const row = el('div', 'shop-row' + (s.here ? ' here' : s.known ? '' : ' unknown'));
      const sub = s.here ? 'You are here' : s.known ? s.note : 'You haven\'t been there yet';
      row.innerHTML = `<div><div class="nm">${esc(s.name)}</div><div class="d">${esc(sub)}</div></div><span class="coin">${s.here || !s.known || s.by === 'ferry' ? '' : s.fare}</span><button class="btn">${s.by === 'ride' ? 'Ride' : s.by === 'ferry' ? 'Show me' : 'Cross'}</button>`;
      const b = row.querySelector('button')!;
      b.disabled = s.here || !s.known || this.ctx.save.marks < s.fare;
      b.addEventListener('click', () => this.ctx.travelTo(s.id));
      body.append(row);
    }
    this.q('#travel-panel .footer').innerHTML = `<span>Fares by Charter. Ride to any stop you've visited, and get off when you like</span><span class="coin">${this.ctx.save.marks} marks</span>`;
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
    const WORLD = WSIZE;
    const kMin = Math.min(cw, ch) / WORLD * 0.92, kMax = 7 * dpr;
    const markers = this.ctx.mapMarkers();
    const me = markers.find((m) => m.kind === 'player');
    // The World view: every land on one sea, and the ships between them (ui/worldMap.ts)
    if (V.world) {
      V.hits = [];
      drawWorldMap(c, dpr, me ? { x: me.x, z: me.z } : null, V.hover, () => { if (this.isOpen('map')) this.renderMap(); });
      this.q('#map-panel .footer').innerHTML = '<span>The whole known world: the Charter Counties and Morrow, and the ships between. Back to the land you are in with the button at the top.</span><span>M to close</span>';
      return;
    }
    if (V.fresh && this.mapFocus) { V.fresh = false; V.cx = this.mapFocus.x; V.cz = this.mapFocus.z; V.k = Math.max(kMin, 1.6 * dpr); this.mapFocus = null; }
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
    const X0 = sx(WMIN), Y0 = sy(WMIN), SW = WORLD * k, X1 = sx(WMAX);
    // Morrow's square east of the Counties', drawn (and its chart painted) only when it's in view
    const eastIn = X1 < cw;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    if (X1 > 0) x.drawImage(continentChart(0), X0, Y0, SW, SW);
    if (eastIn) x.drawImage(continentChart(1), X1, Y0, SW, SW);
    x.fillStyle = 'rgba(236, 222, 186, 0.4)';
    x.fillRect(X0, Y0, SW * (eastIn ? 2 : 1), SW);
    x.imageSmoothingEnabled = z < 1.6;
    x.globalAlpha = 0.86;
    if (X1 > 0) x.drawImage(this.ctx.mapImage, X0, Y0, SW, SW);
    if (eastIn && this.ctx.mapImageEast) x.drawImage(this.ctx.mapImageEast, X1, Y0, SW, SW);
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
      } else if (m.kind === 'service' && on('services')) {
        const st = SERVICE_LOOK[m.svc ?? 'shop'], r = px(8);
        x.fillStyle = st.bg; x.strokeStyle = '#1e1208'; x.lineWidth = px(2);
        x.beginPath(); x.roundRect(X - r, Y - r, r * 2, r * 2, px(3)); x.fill(); x.stroke();
        x.fillStyle = st.fg; x.font = `700 ${px(12)}px "Alegreya Sans", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(st.letter, X, Y + px(0.5));
        if (m.label && z > 1.6) label(m.label, X, Y + px(18), `600 ${px(12)}px "Alegreya Sans", sans-serif`, '#2a1a0a');
        hits.push({ x: X, y: Y, name: m.label ?? st.name, sub: st.name });
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
      if (!on(m.kind === 'event' ? 'events' : m.kind === 'task' || m.kind === 'taskDone' || m.kind === 'treasure' ? 'tasks' : 'bosses')) continue;
      const X = sx(m.x), Y = sy(m.z);
      actGlyph(x, m.kind, X, Y, dpr * 1.5);
      if (m.label && (z > 0.5 || (m.kind !== 'event' && m.kind !== 'taskDone' && m.kind !== 'task'))) label(m.label, X, Y + px(20), `700 ${px(14)}px "Alegreya", serif`, ACT_COLOR[m.kind] === '#ffd23a' ? '#5a3a00' : '#3a1008');
      hits.push({ x: X, y: Y, name: m.label ?? '', sub: m.kind === 'treasure' ? 'Dig a few strides from the landmark here' : m.kind === 'task' ? 'Parish task: the locals want a hand' : m.kind === 'taskDone' ? 'Parish task: done' : m.kind === 'event' ? 'Event under way' : m.kind === 'boss' ? 'World boss: up now' : m.kind === 'bossSoon' ? 'World boss: rising soon' : 'A Shardfall: a star has come down' });
    }
    if (on('quests') && z > 1.1) for (const m of markers) {
      if (m.kind !== 'giver') continue;
      const X = sx(m.x), Y = sy(m.z);
      x.fillStyle = '#ffd23a'; x.strokeStyle = '#3a2400'; x.lineWidth = px(2);
      x.beginPath(); x.arc(X, Y, px(7), 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#3a2400'; x.fillRect(X - px(1.3), Y - px(4.5), px(2.6), px(5.5)); x.fillRect(X - px(1.3), Y + px(2.2), px(2.6), px(2.2));
      hits.push({ x: X, y: Y, name: 'Someone with work', sub: 'Has a quest to offer' });
    }
    if (on('quests')) for (const m of [...markers.filter((k) => k.kind === 'quest' && !k.focus), ...markers.filter((k) => k.kind === 'quest' && k.focus)]) {
      const X = sx(m.x), Y = sy(m.z), s = m.focus ? 1.35 : 1;
      if (m.focus) { x.strokeStyle = 'rgba(255,210,58,.85)'; x.lineWidth = px(2.5); x.beginPath(); x.arc(X, Y, px(19), 0, Math.PI * 2); x.stroke(); }
      x.fillStyle = m.focus ? '#ffe27a' : '#ffd23a'; x.strokeStyle = '#3a2400'; x.lineWidth = px(3);
      x.beginPath(); x.moveTo(X, Y - px(12 * s)); x.lineTo(X + px(10 * s), Y); x.lineTo(X, Y + px(12 * s)); x.lineTo(X - px(10 * s), Y); x.closePath(); x.fill(); x.stroke();
      if (m.focus && m.label) label(m.label, X, Y + px(26), `700 ${px(14)}px "Alegreya", serif`, '#5a3a00');
      hits.push({ x: X, y: Y, name: m.label ?? 'Objective', sub: m.sub ?? 'From your journal' });
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
    ctl.innerHTML = '<button class="mm-b wide" data-world title="The whole known world, and the ships between its lands">World</button><button class="mm-b" data-z="1" title="Zoom in">+</button><button class="mm-b" data-z="-1" title="Zoom out">−</button><button class="mm-b me" title="Centre on you">◎</button>';
    const legend = el('div', 'map-legend');
    for (const [f, name] of [['towns', 'Towns'], ['landmarks', 'Landmarks'], ['post', 'Charter Post'], ['services', 'Banks, crafting, shops'], ['quests', 'Objectives'], ['waymarks', 'Waymarks'], ['events', 'Events'], ['tasks', 'Tasks'], ['bosses', 'Bosses'], ['people', 'People']] as const) {
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
    ctl.querySelector('.me')!.addEventListener('click', () => { V.fresh = true; V.world = false; this.renderMap(); });
    const wb = ctl.querySelector<HTMLElement>('[data-world]')!;
    wb.addEventListener('click', () => { V.world = !V.world; wb.textContent = V.world ? 'Here' : 'World'; wb.title = V.world ? 'Back to the land you are in' : 'The whole known world, and the ships between its lands'; this.ctx.sfx('click'); this.renderMap(); });
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
      if (!click || V.world) return;
      const r = c.getBoundingClientRect();
      const wx = V.cx + ((e.clientX - r.left) * V.dpr - c.width / 2) / V.k, wz = V.cz + ((e.clientY - r.top) * V.dpr - c.height / 2) / V.k;
      // A waymark under the click: offer the trip instead of setting a waypoint
      const cxp = (e.clientX - r.left) * V.dpr, cyp = (e.clientY - r.top) * V.dpr;
      const wm = this.wmHits.find((h) => Math.hypot(h.x - cxp, h.y - cyp) < 16 * V.dpr);
      if (wm) { this.offerWaymark(wm.id, wm.name); return; }
      // Tapping the waypoint again takes it away (a finger has no right button)
      if (this.pin && Math.hypot(this.pin.x - wx, this.pin.z - wz) * V.k / V.dpr < 16) { this.pin = null; this.ctx.sfx('click'); return; }
      if (wx >= WMIN && wz >= WMIN && wx < WMAX_X && wz < WMIN + WSIZE) { this.pin = { x: wx, z: wz }; this.ctx.sfx('click'); }
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
    if (!this.fsWatch) {
      this.fsWatch = true;
      document.addEventListener('fullscreenchange', () => { const b = this.root.querySelector<HTMLInputElement>('#settings-panel input[data-fs]'); if (b) b.checked = !!document.fullscreenElement; });
    }
    const body = this.q('#settings-panel .body');
    const st = this.ctx.save.settings;
    const sliders: [keyof typeof st, string, number, number, number][] = [
      ['viewDist', 'View distance', 4, 10, 1],
      ['master', 'Master volume', 0, 1, 0.05], ['sfx', 'Effects', 0, 1, 0.05], ['ambience', 'Ambience', 0, 1, 0.05], ['music', 'Music', 0, 1, 0.05],
      ['renderScale', 'Render scale', 0.5, 1, 0.05],
      ['mouseSens', 'Mouse look speed', 0.3, 2.5, 0.05],
      ['uiScale', 'Interface size', 0.8, 1.3, 0.05],
    ];
    body.innerHTML = sliders.map(([k, label, min, max, step]) => `<div class="setting"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${st[k]}" data-k="${k}"><span class="v">${typeof st[k] === 'number' ? (k === 'dayLength' || k === 'viewDist' ? st[k] : Math.round((st[k] as number) * 100) + '%') : ''}</span></div>`).join('')
      + `<div class="setting"><span>Colour vision</span><select data-cv>${(Object.keys(COLOUR_VISION_NAMES) as ColourVision[]).map((k) => `<option value="${k}"${(st.colourVision ?? 'standard') === k ? ' selected' : ''}>${COLOUR_VISION_NAMES[k]}</option>`).join('')}</select><span></span></div>`
      + `<div class="setting"><span>Shadows</span><input type="checkbox" ${st.shadows ? 'checked' : ''} data-k="shadows"><span></span></div>`
      + `<div class="setting"><span>Invert mouse look</span><input type="checkbox" ${st.invertY ? 'checked' : ''} data-k="invertY"><span></span></div>`
      + `<div class="setting"><span>Auto-attack: Strike keeps striking your target</span><input type="checkbox" ${st.autoAttack !== false ? 'checked' : ''} data-k="autoAttack"><span></span></div>`
      + `<div class="setting"><span>Show the Trade channel (/trade)</span><input type="checkbox" ${st.hideTrade ? '' : 'checked'} data-trade><span></span></div>`
      + `<div class="setting"><span>Filter strong language</span><input type="checkbox" ${st.filterChat ? 'checked' : ''} data-k="filterChat"><span></span></div>`
      + (st.ignored.length ? `<div class="setting"><span>Ignoring</span><span class="v" style="flex:2">${st.ignored.map(esc).join(', ')} <small>(/unignore name)</small></span></div>` : '')
      // Full screen on a computer (phones and tablets go full screen their own way, or can't)
      + (document.fullscreenEnabled && !document.body.classList.contains('touch') ? `<div class="setting"><span>Full screen</span><input type="checkbox" ${document.fullscreenElement ? 'checked' : ''} data-fs><span></span></div>` : '')
      + `<h4 class="sec">Controls</h4><div class="help-grid">
        <kbd>W A S D</kbd><span>Move (relative to the camera)</span>
        <kbd>Mouse drag</kbd><span>Turn the camera · wheel zooms</span>
        <kbd>Shift</kbd><span>Sprint (uses energy)</span>
        <kbd>Space</kbd><span>Jump</span>
        <kbd>Click / 1</kbd><span>Strike · three-hit combo</span>
        <kbd>2</kbd><span>Cleave with a sword or a great blade; with anything else, that weapon's own skill</span>
        <kbd>3 – 8</kbd><span>Weapon skill, heal, your calling's skills and elite, as you reach their levels</span>
        <kbd>Q</kbd><span>Dodge roll, invulnerable while rolling</span>
        <kbd>V</kbd><span>Hold to block: half the blow from in front, for stamina; raised just as it lands, none of it, and the attacker reels</span>
        <kbd>Tab</kbd><span>Target the nearest enemy</span>
        <kbd>G</kbd><span>Call your horse, or get down (halters are sold in the towns)</span>
        <kbd>E</kbd><span>Talk, gather, use, pull in a bite</span>
        <kbd>Enter</kbd><span>Chat, when playing online</span>
        <kbd>P</kbd><span>Group finder</span>
        <kbd>O</kbd><span>Guild</span>
        <kbd>F</kbd><span>Eat food</span>
        <kbd>Touch</kbd><span>Left thumb moves · drag elsewhere to look · pinch to zoom · tap the action bar for skills</span>
        <kbd>B / I</kbd><span>Pack</span>
        <kbd>K</kbd><span>Skills</span>
        <kbd>J</kbd><span>Journal</span>
        <kbd>M</kbd><span>Map</span>
        <kbd>Esc</kbd><span>Close windows</span>
      </div>
      ${this.ctx.inMenu ? '' : '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn ghost" data-act="title">Save and quit to character select</button><button class="btn danger" data-act="reset">Delete character</button></div>'}`;
    body.querySelector<HTMLInputElement>('input[data-trade]')?.addEventListener('change', (e) => { st.hideTrade = !(e.target as HTMLInputElement).checked; this.ctx.settingsChanged(); });
    body.querySelector<HTMLSelectElement>('select[data-cv]')?.addEventListener('change', (e) => { st.colourVision = (e.target as HTMLSelectElement).value as ColourVision; this.ctx.settingsChanged(); });
    body.querySelector<HTMLInputElement>('input[data-fs]')?.addEventListener('change', (e) => {
      const on = (e.target as HTMLInputElement).checked;
      (on ? document.documentElement.requestFullscreen() : document.exitFullscreen()).catch(() => { (e.target as HTMLInputElement).checked = !!document.fullscreenElement; });
    });
    body.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((inp) => {
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

  /** True while the lockpicking overlay is up (the game ignores its own keys then). */
  picking = false;

  /**
   * Picking a lock: a row of pins, each tumbler bobbing past the shear line. Press E, Space or
   * click as it crosses the line to set the pin. A slip snaps a pick and the pin drops back.
   * Resolves true when the last pin sets, false on Esc or when the picks run out.
   */
  lockpick(title: string, pins: number, zone: number, speed: number, picks: () => number, snap: () => void): Promise<boolean> {
    const box = el('div', 'frame');
    box.id = 'lockpick';
    const lines = Array.from({ length: pins }, (_, i) => 0.28 + ((Math.sin(i * 12.9898 + pins * 7.1) + 1) / 2) * 0.44);
    box.innerHTML = `<h4>${esc(title)}</h4><div class="lp-pins">${lines.map((b) => `<div class="lp-pin"><i class="lp-line" style="bottom:calc(${(b - zone / 2) * 100}% );height:${zone * 100}%"></i><b class="lp-tumbler"></b></div>`).join('')}</div><p class="lp-help"></p>`;
    this.root.append(box);
    this.picking = true;
    const cols = [...box.querySelectorAll<HTMLElement>('.lp-pin')];
    const help = box.querySelector<HTMLElement>('.lp-help')!;
    let i = 0, t0 = performance.now(), raf = 0, done = false, y = 0;
    const touch = document.body.classList.contains('touch');
    const say = () => { help.textContent = `Lockpicks: ${picks()} · ${touch ? 'Tap' : 'E, Space or click'} as the pin crosses the line · ${touch ? 'Back' : 'Esc'} to stop`; };
    say();
    return new Promise<boolean>((resolve) => {
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', key, true);
        setTimeout(() => { box.remove(); this.picking = false; resolve(ok); }, ok ? 380 : 120);
      };
      const press = () => {
        if (done || i >= pins) return;
        if (Math.abs(y - lines[i]) <= zone / 2) {
          cols[i].classList.add('set');
          cols[i].querySelector<HTMLElement>('.lp-tumbler')!.style.bottom = `calc(${lines[i] * 100}% - 7px)`;
          this.ctx.sfx('click');
          i++;
          t0 = performance.now();
          if (i >= pins) finish(true);
        } else {
          snap();
          cols[i].classList.remove('slip'); void cols[i].offsetWidth; cols[i].classList.add('slip');
          if (picks() < 1) { help.textContent = 'The last pick snaps.'; finish(false); return; }
          say();
          t0 = performance.now();
        }
      };
      const key = (e: KeyboardEvent) => {
        if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); return; }
        if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(); }
      };
      window.addEventListener('keydown', key, true);
      box.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
      const frame = () => {
        if (done) return;
        if (i < pins) {
          // The tumbler bobs up and down, a little quicker on each pin
          const t = (performance.now() - t0) / 1000;
          y = 0.5 - Math.cos(t * speed * (2.2 + i * 0.25)) * 0.45;
          cols[i].querySelector<HTMLElement>('.lp-tumbler')!.style.bottom = `calc(${y * 100}% - 7px)`;
          cols.forEach((c, k) => c.classList.toggle('on', k === i));
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
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
    // (small screens clear the way for the conversation: see body.talking in styles.css)
    document.body.classList.toggle('talking', !!v);
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
      t.innerHTML = `<div class="logo"><div class="gem"></div><h1>EVER<span>REALM</span></h1><div class="ea">Early Access</div><p>EXPLORE<i></i>CRAFT<i></i>BUILD<i></i>BELONG</p></div><div class="loading"></div>`;
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
