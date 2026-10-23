import * as THREE from 'three';
import { canLearn, pointsAt, rankOf, spent, TALENTS, TIER_GATE, TREES } from '../data/talents';
import { LAND, LAND_FORCED, setNextLand, type LandId } from '../world/land';
import { CALLIS_PACKET } from '../world/morrow';
/** Session storage: the character to go straight into after crossing between lands. */
const ENTER_KEY = 'everrealm.enter';
import type { Equip } from '../data/items';
import { BRIGHTCUT, REGION_ARMOUR, WEIGHTS } from '../data/armour';
import { REGION_WEAPONS } from '../data/weapons';
import { Stage } from './Stage';
import { Chests, TIERS } from './Chests';
import { LoreBooks } from './LoreBooks';
import { FishSchools } from './FishSchools';
import type { Palette } from '../entities/creatures';
import { BOOK_BY_ID, LORE_BOOKS, SHELVES } from '../data/lorebooks';
import { FACTIONS, factionRank } from '../data/factions';
import { HEARING } from './Bard';
import type { PartId } from '../data/tunes';
import { FIGURE } from '../entities/humanoid';
import { realmNow } from '../world/clock';
import { characterDetail } from '../entities/lod';
import { Activities } from './Activities';
import { legacyChunkKey, v2ChunkKey } from '../world/VoxelWorld';
import { createRenderer } from '../core/Renderer';
import { DIALOGUE, READABLES } from '../data/dialogue';
import {
  ANIMAL_SPAWNS, ENEMIES, ENEMY_SPAWNS, FISH_TABLE, levelForXp, xpForLevel, ORE_INFO, RECIPES, REGION_SPAWNS, SHOP_STOCK, SKILLS, Station, TREE_INFO,
} from '../data/gameplay';
import { activeSet, ITEMS, SkillId } from '../data/items';
import { baseOf, NAMED_BY_SOURCE, rollGear, type DropSource, type NamedFx } from '../data/gear';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/quests';
import { Animal, type AnimalKind } from '../entities/Animal';
import { Enemy } from '../entities/Enemy';
import { Appearance, HeldItem, Humanoid, setGearModels, type AnimState } from '../entities/humanoid';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { AudioSystem, Sfx, voiceOf, type Soundscape } from '../systems/Audio';
import type { ThemeId } from '../systems/music/Score';
import { CameraRig } from '../systems/CameraRig';
import { Input } from '../systems/Input';
import { Particles } from '../systems/Particles';
import { CreatureModel, mountModel, type CreatureKind } from '../entities/creatures';
import { riderLift, riderPose, spareSeats, type SeatPose } from '../entities/seats';
import { mountKey, mountOf } from '../data/mountLooks';
import { MountChooser } from '../ui/MountChooser';
import { TouchControls } from '../ui/TouchControls';
import { Crowd, CrowdZone } from './Crowd';
import { Roadfolk } from './Roadfolk';
import { Justice } from './Justice';
import { Voyage, type Harbour } from './Voyage';
import { CRIME, JURISDICTIONS, jurisdictionAt } from '../data/justice';
import '../data/pledges';
import { Doll } from '../ui/Doll';
import { Dailies } from './Dailies';
import { Waymarks, waymarks, waymarkFare } from './Waymarks';
import { FEATS, FeatApi } from '../data/feats';
import { Hud, MapMarker, PlateInfo, QuestEntry, ShopView } from '../ui/Hud';
import { SHOPS, shopBuyPrice, shopPrice } from '../data/shops';
import { POSTS, postFare, postHours, postKnown } from '../data/travel';
import { Online } from '../net/Online';
import { BOARDS } from '../data/content';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** People whose every conversation is a story scene. */
const STORY_CAST = new Set(['lowen', 'maren', 'rhosyn', 'wynn', 'sela', 'selaSitting', 'joan', 'joanSitting']);
/** The stretch of temple floor that lifts in Chapter V: centre, radius and paving height. */
const LIFT = { x: 1201, z: 1800, r: 6, y: 89 };
import { ALDERMERE, BANKS, CAMP, COLD, COTTAGE, GULL, QUEST_SPAWNS, TEMPLE, WORKS, WORLD_THINGS, WorldThing } from '../data/places_regional';
import { bigIsle } from '../world/holms';
import { B, isSolid } from '../world/blocks';
import { fellTree, FishSpot, LOWER_WEND, OreNode, regrowTree, TreeNode } from '../world/generate';
import { distToPolyline } from '../world/noise';
import { Interactable } from '../world/structures';
import { DialogueTree, DNode, GameApi } from './api';
import { GameWorld , ForageSpot } from './GameWorld';
import { places } from '../data/places';
import { fireMaterial, flameCard, furniture } from '../world/props';
import { inRoof } from '../world/roofVolumes';
import { coastX, heightAt, regionAt, REGION_INFO, RegionId, riverDist, SEA } from '../world/terrain';
import { hash2 } from '../world/noise';
import { weatherAt } from '../world/weather';
import type { ChunkResult } from '../world/chunkgen';
import { chunkKey } from '../world/VoxelWorld';
import { filterLanguage, fixSave, Inventory, newSave, SaveData, writeSave, INV_SIZE } from './state';
import { MAX_CHARACTERS, deleteCharacter, lastPlayed, listCharacters, newCharacterId, rememberCharacter, saveKeyFor, setLastPlayed } from './roster';
import { CharSummary, FrontCtx, Frontend } from '../ui/Frontend';
import { originById } from '../data/origins';
import { ClassKit } from './ClassKit';
import { Festivals } from './Festivals';
import { Home, Piece } from './Home';
import { Building } from './Building';
import { Planner } from './Planner';
import { Bank } from './Bank';
import { COTTAGE_BUYBACK, COTTAGE_SHAPE, costOf, HomeShape, HouseSpec, Lot, LOT_PRICE, LOTS, PlotState, plotShape, readPlot } from '../data/housing';
import { updateDoors } from '../world/Doors';
import { Social } from './Social';
import { Exchange } from './Exchange';
import { Mail } from './Mail';
import { Seasons } from './Seasons';
import { REEKS } from '../data/inkholm';
import { Dungeons } from './Dungeons';
import { Hazards } from './Hazards';
import { Stables } from './Stables';
import { lodgeAt, LODGINGS, MAX_WEEKS, readTenancy, roomBase, ROOMS, roomShape, WEEK } from '../data/lodgings';
import { henchmenFor, Role } from '../data/dungeons';
import { GAINS, rankFor } from '../data/standing';
import { CAPE_DESIGNS, FEAT_CAPE, REGION_CAPE, type CapeDesign } from '../data/capes';
import { marksScale, regionLevel, rewardScale } from '../data/scaling';
import { HIT_XP, killXp, QUEST_KILLS } from '../data/pacing';
import { WORLD_BOSSES } from '../data/activities';
import type { GroupRow } from './Social';
import { FESTIVALS } from '../data/festivals';
import { EMOTES, EmoteAnim, emoteById } from '../data/emotes';
import { CallingDef, CallingId, callingById, crossUtilities, TUNE, UNLOCK_AT, UNLOCK_NAMES, weaponLine } from '../data/classes';
import { MASTER_OF } from '../data/content/masters';
import { INTRO } from '../data/intro';
import { serverUrl } from '../net/Online';
import { currentAccount, deleteRemote, isDevAccount, remoteCharacters, signIn, signOut, uploadSave , storeOwned } from '../net/Account';
import { DevPanel, type DevHost } from '../ui/DevPanel';

type Mode = 'loading' | 'title' | 'creator' | 'intro' | 'play';

/** Where the selected or new character stands on the menus, and the way the camera looks at them. */
const STAGE = { x: 153, z: 187, dir: new THREE.Vector3(4.2, 0, 0.9).normalize() };
/** The music for each region; the outer lands borrow a neighbour's until their own is written. */
const REGION_THEME: Record<RegionId, ThemeId> = {
  greenwake: 'greenwake', crownroad: 'crownroad', brambledeep: 'brambledeep', saltwind: 'saltwind', redstone: 'redstone', starfall: 'starfall',
  gannet: 'crownroad', wrath: 'brambledeep', tolmen: 'starfall', inkholm: 'brambledeep', kell: 'redstone',
  keys: 'saltwind', glades: 'brambledeep', amberwold: 'brambledeep', bright: 'crownroad', sunder: 'starfall', glassflats: 'redstone', greywaste: 'starfall', held: 'starfall',
};

/** Where townsfolk walk, and how many of them, busiest in the capital. */
/** Each land's packet harbour: where the Constant lies at the quay, and the way out to the open sea (east, both). */
const HARBOURS: Record<LandId, Harbour> = {
  counties: { berth: [1822, 590.5], heading: Math.PI / 2 },
  morrow: { berth: [CALLIS_PACKET.x + 12, CALLIS_PACKET.z], heading: Math.PI / 2 },
};

function crowdZones(): CrowdZone[] {
  if (LAND !== 'counties') return [];
  return [
    { id: 'ansbury', x: 820, z: 300, r: 196, n: 30, lines: [
      'The minster bell\'s cracked. You can hear it on the low note.',
      'They\'re tilting Saturday. My money\'s on the Harrowgate lad.',
      'Wipe your boots before the Charter Hall, they take your name.',
      'Somebody\'s left a dray across the Shambles again.',
      'The guildhall clock\'s five minutes fast. It always is.',
      'If the Weighhouse says a pound, it\'s a pound.',
    ] },
    { id: 'hollinford', x: 165, z: 182, r: 42, n: 6, lines: [
      'The ford\'s up to my knees today.',
      'Haverwood\'s thick with mushrooms after the rain.',
    ] },
    { id: 'gullmouth', x: coastX(600) - 80, z: 600, r: 72, n: 11, lines: [
      'Tide\'s turning. Get the nets in.',
      'The light wants oil again.',
      'A gull had my pie. The whole pie.',
    ] },
    { id: 'harrowgate', x: 975, z: 1003, r: 60, n: 8, lines: [
      'Shift bell\'s in ten.',
      'Company store\'s put candles up again.',
      'Slag\'s still warm. Don\'t sit on it.',
    ] },
    { id: 'kelderby', x: 300, z: 1460, r: 30, n: 4, lines: ['Wind\'s got teeth up here today.'] },
    { id: 'cotters', x: 486, z: 252, r: 26, n: 3 },
  ];
}

interface Candidate {
  kind: 'npc' | 'ore' | 'tree' | 'fish' | 'forage' | 'thing' | 'wthing' | 'act';
  forage?: ForageSpot;
  act?: () => void;
  label: string;
  pos: THREE.Vector3;
  npc?: Npc;
  ore?: OreNode;
  tree?: TreeNode;
  spot?: FishSpot;
  thing?: Interactable;
  wthing?: WorldThing;
  warn?: string;
  sub?: string;
}

interface GatherAction {
  kind: 'mine' | 'chop' | 'fish';
  ore?: OreNode;
  tree?: TreeNode;
  spot?: FishSpot;
  tool: string;
  t: number;
  swings: number;
  phase: 'cast' | 'wait' | 'bite' | 'reel';
  waitFor: number;
}

interface CraftAction { recipe: string; left: number; t: number; station: Station }

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

export class Game implements GameApi {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2600);
  world!: GameWorld;
  readonly input: Input;
  rig!: CameraRig;
  readonly audio = new AudioSystem();
  readonly particles = new Particles();
  hud!: Hud;
  save: SaveData;
  inv: Inventory;
  player!: Player;
  npcs: Npc[] = [];
  enemies: Enemy[] = [];
  /** Events, world bosses, Shardfalls, dungeon creatures and chests, vistas (see Activities.ts). */
  private activities!: Activities;
  /** Hidden chests across the land (game/Chests.ts). */
  private chests!: Chests;
  /** The towns' dogs and cats, spawned near the player (one list, so each keeps its place). */
  /** Town pets, and farm stock (world/sites.ts Site.animals): put out as you come near, each keeping its own spot. */
  /** Whether the Leave dungeon button is up. */
  private leaveShown = false;
  private pets: { kind: AnimalKind; x: number; z: number; r?: number; pal: Palette; a: Animal | null }[] = [];
  /** Lore books lying open by the places they're about (game/LoreBooks.ts). */
  private books!: LoreBooks;
  /** Schools of fish in the water near you (game/FishSchools.ts). */
  private fish!: FishSchools;
  private crowd!: Crowd;
  private roadfolk!: Roadfolk;
  /** The law: prices on your head, the watch, the wagon and the cells (game/Justice.ts). */
  justice!: Justice;
  /** The light of a torch carried on horseback at night (always in the scene, dark when unused, so nothing recompiles). */
  private torchLight = new THREE.PointLight('#ffb060', 0, 24, 1.1);
  private darkT = 0;
  private underCover = false;
  /** The Constant under way with you aboard, between the lands (game/Voyage.ts). */
  voyage!: Voyage;
  /** A pose the law holds you in (on the wagon's bench, picking oakum, lying in a cell). */
  private lawPose: AnimState | null = null;
  private doll = new Doll();
  readonly dailies = new Dailies({
    flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
    addMarks: (n) => this.addMarks(n), addXp: (s, n) => { this.writXp = true; this.addXp(s, n); this.writXp = false; },
    give: (it, n) => this.give(it, n), banner: (t, s) => this.hud.banner(t, s, true), system: (t) => this.hud.system(t), sound: () => this.sfx('quest'),
    also: (k, n) => this.festivals?.bump(k, n),
  });
  /** The festival that's on, its stalls and its writ. */
  festivals!: Festivals;
  /** The festival's round, boss, bags and hats (data/seasons.ts). */
  seasons!: Seasons;
  home!: Home;
  building!: Building;
  planner!: Planner;
  readonly bank: Bank = new Bank({
    pack: () => this.social['host'].pack(),
    count: (id) => this.inv.count(id), canAdd: (id, n) => this.inv.canAdd(id, n),
    give: (id, n) => this.inv.add(id, n), take: (id, n) => this.inv.remove(id, n),
    marks: () => this.save.marks, addMarks: (n) => { this.save.marks = Math.max(0, this.save.marks + n); },
    sound: (n) => this.sfx(n as Sfx), system: (t) => this.hud.system(t),
    persist: () => this.persist(), refresh: () => this.hud.refresh(),
    player: () => this.player.position,
  });
  /** While visiting: the host's lot and plans, shown in place of your own. */
  private visitPlot: PlotState | null = null;
  /** When the friends list last asked the realm where everyone is (game seconds). */
  friendsAsked = -99;
  /** The online group's frames as the server last sent them (null: not in one). */
  private groupRows: GroupRow[] | null = null;
  /** Group dungeons: the finder, a run, the henchmen (game/Dungeons.ts). */
  dungeons!: Dungeons;
  /** Vents, bogs and loose cliffs (game/Hazards.ts). */
  private hazards!: Hazards;
  /** The horses for sale in the stables' paddocks (game/Stables.ts). */
  private stables!: Stables;
  /** The frames under your own: the online group, and any henchmen with you. */
  private showGroup(): void {
    const extra = this.dungeons?.rows() ?? [];
    if (!extra.length) { this.hud.setGroup(this.groupRows); return; }
    const me: GroupRow = { id: -1, name: this.save.name, hp: this.hp, max: this.maxHp, level: this.level('melee'), leader: true, me: true, near: true, calling: this.calling };
    this.hud.setGroup([...(this.groupRows ?? [me]), ...extra]);
  }
  /** Groups and trades with other players. */
  readonly social: Social = new Social({
    net: () => this.online,
    system: (t) => this.hud.system(t),
    ask: (t, y, n, s) => this.hud.ask(t, y, n, s),
    setGroup: (rows) => { this.groupRows = rows; this.showGroup(); },
    openTrade: (open) => { if (open) { this.hud.show('trade'); } else this.hud.close('trade'); },
    refreshTrade: () => this.hud.refresh('trade'),
    refreshGuild: () => this.hud.refresh('guild'),
    player: () => ({ x: this.player.position.x, z: this.player.position.z, hp: this.hp, max: this.maxHp, level: this.level('melee'), calling: this.calling }),
    pack: () => {
      const m = new Map<string, number>();
      for (const s of this.save.inv) if (s) m.set(s.id, (m.get(s.id) ?? 0) + s.n);
      return [...m].map(([id, n]) => ({ id, n }));
    },
    count: (id) => this.inv.count(id),
    take: (id, n) => this.inv.remove(id, n),
    give: (id, n) => this.give(id, n),
    freeSlots: () => this.inv.freeSlots(),
    marks: () => this.save.marks,
    addMarks: (n) => { this.save.marks = Math.max(0, this.save.marks + n); this.hud.refresh(); },
    sound: (n) => this.sfx(n),
    persist: () => this.persist(),
    flag: (k) => this.flag(k),
    setFlag: (k, v) => this.setFlag(k, v),
    refreshFriends: () => this.hud.refresh('guild'),
  });
  /** Music: instruments, the songbook, bands, and everyone near who's playing (game/Stage.ts). */
  readonly music: Stage = new Stage({
    audio: this.audio,
    particles: this.particles,
    online: () => this.online,
    myPos: () => this.player.position,
    myModel: () => this.player.model,
    remote: (id) => { const r = this.online?.remotes.get(id); return r ? { pos: r.model.root.position, model: r.model } : null; },
    npc: (id) => { const n = this.npcs.find((x) => x.id === id); return n ? { pos: n.pos, model: n.model } : null; },
    camRight: () => { const f = this.camera.getWorldDirection(new THREE.Vector3()); return new THREE.Vector3(-f.z, 0, f.x).normalize(); },
    group: () => this.social.group,
    myId: () => this.online?.myId ?? -1,
    system: (t) => this.hud.system(t),
    refresh: () => this.hud.refresh('music'),
    flag: (k) => this.flag(k),
    setFlag: (k, v) => this.setFlag(k, v),
    addMarks: (n) => this.addMarks(n),
    played: (tune, spot, band) => this.tunePlayed(tune, spot, band),
  }, () => this.save.inv.filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.id));
  /** The auction house: one book for the realm, read at any broker. */
  readonly exchange: Exchange = new Exchange({
    net: () => this.online,
    online: () => this.online?.status === 'online',
    system: (t) => this.hud.system(t),
    count: (id) => this.inv.count(id),
    take: (id, n) => this.inv.remove(id, n),
    give: (id, n) => this.give(id, n),
    marks: () => this.save.marks,
    addMarks: (n) => { this.save.marks = Math.max(0, this.save.marks + n); this.hud.refresh(); },
    sound: (n) => this.sfx(n),
    persist: () => this.persist(),
    refresh: () => this.hud.refresh('exchange'),
  });
  /** Letters by the Charter Post, read and posted at its boxes. */
  readonly mail: Mail = new Mail({
    net: () => this.online,
    online: () => this.online?.status === 'online',
    myName: () => this.save.name,
    system: (t) => this.hud.system(t),
    count: (id) => this.inv.count(id),
    take: (id, n) => this.inv.remove(id, n),
    give: (id, n) => this.give(id, n),
    room: (stacks) => {
      let need = 0;
      const seen = new Set<string>();
      for (const st of stacks) {
        const d = ITEMS[st.id];
        if (!d) continue;
        if (!d.stack) need += st.n;
        else if (!seen.has(st.id) && this.inv.count(st.id) === 0) need++;
        seen.add(st.id);
      }
      return this.inv.freeSlots() >= need;
    },
    marks: () => this.save.marks,
    addMarks: (n) => { if (n > 0) this.addMarks(n); else { this.save.marks = Math.max(0, this.save.marks + n); this.hud.refresh(); } },
    sound: (n) => this.sfx(n),
    persist: () => this.persist(),
    refresh: () => { this.hud.refresh('mail'); this.hud.setMailBadge(this.mail.unread); },
  });
  /** Swimming strokes, every other ripple; and what's round the listener (see listen()). */
  private strokes = 0;
  private listenT = 0;
  private scape: Partial<Soundscape> = {};
  private readonly towns = crowdZones();
  /** When each creature last cried out at a blow (so a flurry isn't a chorus). */
  private voiced = new WeakMap<Enemy, number>();
  /** Where the post box is that the letters page was opened at. */
  private mailAt: { x: number; z: number } | null = null;
  /** Set while a writ pays its experience, so the payment doesn't count toward other writs. */
  private writXp = false;
  private travelled = 0;
  private waymarkStones!: Waymarks;
  private weatherT = 0;
  /** The horse under the player, while riding. */
  private horse: CreatureModel | null = null;
  /** Riding with someone in your group, behind their saddle or in their wagon: their id on the realm, or null. */
  private pillion: number | null = null;
  /** How a passenger sits: astride behind a saddle, or on a wagon's bench. */
  private pillionPose: SeatPose = 'ride';
  /** A wagon left standing where you got down from it: its bed opens beside it, and G drives it on. */
  private parked: { id: string; model: CreatureModel } | null = null;
  /** A vista's camera: circling the view for a few seconds, then back to the player. */
  private cine: { view: [number, number, number, number, number, number]; t: number; then: () => void } | null = null;
  animals: Animal[] = [];
  mode: Mode = 'loading';
  hasSave = false;
  /** Roster id of the character in this.save (null before any character exists). */
  charId: string | null = null;
  front!: Frontend;
  private previewSpin = 0;
  private creatorView: 'body' | 'face' = 'body';
  private menuCam: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private intro: { t: number; shot: number } | null = null;
  private menuPending = false;

  // Combat and status
  hp = 100;
  energy = 100;
  dead = false;
  private deadTimer = 0;
  private cds = { strike: 0, cleave: 0, roll: 0, eat: 0 };
  /** The calling's skills (keys 3 to 5), mechanic and the effects they leave. */
  kit!: ClassKit;
  /** The emote being played (until it ends, or you move). */
  private emote: { id: EmoteAnim; left: number } | null = null;
  /** Speech bubbles over heads: -1 is you, otherwise a player's id on the server. */
  private bubbles: { el: HTMLElement; who: number; until: number }[] = [];
  /** A leap or a shadowstep under way. */
  private dash: { fx: number; fy: number; fz: number; tx: number; tz: number; ty: number; t: number; dur: number } | null = null;
  private attack: { kind: 'strike' | 'cleave'; t: number; dur: number; hitAt: number; hit: boolean; combo: number } | null = null;
  private comboIndex = 0;
  private comboWindow = 0;
  private queuedStrike = false;
  private healOverTime = { left: 0, perSec: 0 };
  private healAnim = 0;
  private hitAnim = 0;
  private iframes = 0;
  private rolledThrough = false;
  private wakeTimer = 0;
  private lastCombat = -99;
  private hitstop = 0;
  target: Enemy | null = null;

  // Activities
  private action: GatherAction | null = null;
  private craftAction: CraftAction | null = null;
  currentStation: Station | null = null;
  /** Which trader's panel is open (a key of SHOPS). */
  currentShop = 'tamsin';
  /** The Charter Post stop whose panel is open. */
  currentPost = 'hollin';
  /** Connection to a world server; inert unless the page was opened with ?online or ?server=. */
  private online!: Online;
  /** True while reloading onto a save fetched from the server: nothing may save over it. */
  private restoring = false;
  /** Set while the post cart is on the road, so arrival can be announced. */
  private arriving: string | null = null;
  private arrivingBy: 'post' | 'waymark' | 'dungeon' = 'post';
  private arrivingSub = '';
  /** Live creatures placed by QUEST_SPAWNS, by tag. */
  private questSpawned = new Map<string, Enemy[]>();
  /** Ground height under each regional world thing, found once its chunk has loaded. */
  private thingY = new Map<string, number>();
  private dialogue: { npc: Npc; tree: DialogueTree; node: string; text?: string } | null = null;
  private casting: { t: number; dur: number } | null = null;
  private candidate: Candidate | null = null;
  private outline: THREE.LineSegments;
  private bobber: THREE.Group;
  private fishLine: THREE.Line;
  private stepTimer = 0;
  private regionTimer = 0;
  private currentRegion = '';
  /** Dev tools (ui/DevPanel.ts): F8, for developers' accounts only. */
  private devPanel!: DevPanel;
  private dev = { god: false, fast: false };
  /** What the named pieces you wear do (data/gear.ts), worked out again when what you wear changes. */
  private fxKey = '';
  private fxSet = new Set<NamedFx>();
  /** Blows in a row on one foe (the Clinker tusk); a fury after a kill (Tallow Jack's knife); when you were
   *  last hurt (Whiteface's ruff); when the sexton's helm last warded you; a leaping crit in flight (the Kettle light). */
  private streak: { e: Enemy | null; n: number } = { e: null, n: 0 };
  private furyUntil = 0;
  private lastHurt = -99;
  private glassAt = -99;
  private chaining = false;
  private autosave = 0;
  private hudTimer = 0;
  private elapsed = 0;
  private previewModel: Humanoid | null = null;
  private orbit = 0;
  private fpsAcc = { t: 0, n: 0 };
  private debug = new URLSearchParams(location.search).has('debug');
  private smokeTimer = 0;
  private fishFx = 0;
  private anvilTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.input = new Input(canvas);
    // The last character played, so the menus start on them and their settings apply
    const chars = listCharacters();
    const lastChar = chars.find((c) => c.id === lastPlayed()) ?? chars[0];
    const loaded = lastChar?.save ?? null;
    this.charId = lastChar?.id ?? null;
    this.hasSave = !!loaded;
    this.save = loaded ?? newSave('Rowan', { skin: '#e0b090', hair: '#5a3a22', hairStyle: 0, eyes: '#3a5a7a', tunic: '#3a5a8a', trim: '#e0bd64', trousers: '#4a3a2c', boots: '#3a2a1c', cape: '#7a2a24' });
    this.inv = new Inventory(this.save);
    // Weapons and off-hand pieces are drawn from their items (data/weapons.ts, data/offhand.ts)
    setGearModels((id) => ITEMS[id]?.weapon?.model ?? null, (id) => ITEMS[id]?.trinket?.model ?? null, (id) => ITEMS[id]?.instrument ?? null);
    this.hud = new Hud(this.uiCtx());
    new TouchControls(this.input, this.hud.root);
    this.front = new Frontend(this.frontCtx(), this.hud.root);
    this.devPanel = new DevPanel(this.hud.root, this.devHost(), isDevAccount);
    this.hud.showTitle('Preparing Hollindale');

    const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04));
    this.outline = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: '#fff3c0', transparent: true, opacity: 0.85, depthTest: true }));
    this.outline.visible = false;
    this.scene.add(this.outline);

    this.bobber = new THREE.Group();
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshLambertMaterial({ color: '#e8402a' }));
    const bobTop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshLambertMaterial({ color: '#f4f0e8' }));
    bobTop.position.y = 0.08;
    this.bobber.add(bob, bobTop);
    this.bobber.visible = false;
    this.scene.add(this.bobber);
    this.fishLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(10).fill(0).map(() => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#f0f0f0', transparent: true, opacity: 0.7 }));
    this.fishLine.frustumCulled = false;
    this.fishLine.visible = false;
    this.scene.add(this.fishLine);
    this.scene.add(this.particles.group);

    window.addEventListener('pointerdown', () => this.audio.unlock(), { once: false });
    window.addEventListener('keydown', () => this.audio.unlock());

    // Let the title paint before the heavy generation work.
    setTimeout(() => this.buildWorld(), 60);
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    (window as unknown as { __EVERREALM__: unknown }).__EVERREALM__ = this.debugApi();
  }

  private buildWorld(): void {
    this.world = new GameWorld(this.scene, (l) => this.hud.showTitle(l + '…'));
    this.hud.mapLabels = this.world.buildingLabels();
    this.rig = new CameraRig(this.camera, this.world.voxels);
    this.player = new Player(this.world.voxels, this.save.look);
    this.waymarkStones = new Waymarks(this.scene, this.world.voxels, (id) => !!this.flag(id), (w) => {
      this.setFlag(w.id, 1);
      this.hud.banner('Waymark attuned', w.name, true);
      this.hud.system(`Waymark attuned: ${w.name}. Open the map (M) and click it to travel here from anywhere.`);
      this.sfx('discover');
    });
    this.crowd = new Crowd(this.scene, this.world.voxels, crowdZones(), (pos, h, text) => this.floatAt(pos, h, text, 'chatter'));
    // The watch keeps every town's peace: the Counties' busy towns, and Morrow's (data/justice.ts)
    this.roadfolk = new Roadfolk(this.scene, this.world.voxels, LAND === 'counties' ? crowdZones() : JURISDICTIONS.map((j) => ({ id: j.id, x: j.x, z: j.z, r: j.r })), (pos, h, text) => this.floatAt(pos, h, text, 'chatter'));
    this.scene.add(this.torchLight);
    this.voyage = new Voyage({
      scene: this.scene, props: this.world.props, player: this.player,
      sfx: (n, v) => this.sfx(n as Sfx, v), banner: (t, sub) => this.hud.banner(t, sub, true),
    });
    this.justice = new Justice({
      scene: this.scene, camera: this.camera, player: this.player, look: this.save.look,
      setPose: (st) => { this.lawPose = st; },
      marks: () => this.save.marks, spend: (n) => { this.save.marks = Math.max(0, this.save.marks - n); this.hud.refresh(); },
      flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      system: (t) => this.hud.system(t), banner: (t, sub) => this.hud.banner(t, sub, true), sfx: (n, v) => this.sfx(n as Sfx, v),
      say: (pos, h, text) => this.floatAt(pos, h, text, 'chatter'),
      hp: () => [this.hp, this.maxHp],
      hurt: (n, from) => {
        if (this.dead) return;
        this.hp = Math.max(1, this.hp - n);
        this.hitAnim = 0.3;
        this.sfx('hurt');
        this.rig.addShake(0.2);
        this.floatAt(this.player.position, 2.2, `-${n}`, 'player');
        this.hud.hurt(n / this.maxHp);
        this.player.velocity.addScaledVector(tmpV.subVectors(this.player.position, from).setY(0).normalize(), 3);
        this.lastCombat = this.elapsed;
      },
      guards: (p, r) => this.roadfolk.guards(p, r),
      chase: (id, target) => this.roadfolk.chase(id, target),
      swing: (id) => this.roadfolk.swing(id),
      witnesses: (p, r) => this.crowd.near(p, r) + this.npcs.filter((n) => n.placed !== false && n.model.root.visible && n.pos.distanceTo(p) < r).length,
      ground: (x, z, fromY) => this.world.voxels.groundBelow(x, fromY, z),
      dismount: () => { this.dismount(true); if (this.pillion !== null) this.leavePillion(); },
      hudHidden: (on) => this.hud.setHudHidden(on),
      lockpick: () => { const T = TIERS[1]; return this.hud.lockpick(T.name, T.pins, T.zone, T.speed, () => this.inv.count('lockpick'), () => { this.inv.remove('lockpick', 1); this.sfx('pickSnap' as Sfx); }); },
      busy: () => !!this.dialogue || this.dead || !!this.cine,
    });
    this.festivals = new Festivals({
      scene: this.scene, voxels: this.world.voxels, particles: this.particles, lamps: this.world.extraLamps,
      flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      give: (it, n) => this.give(it, n), count: (it) => this.inv.count(it), addMarks: (n) => this.addMarks(n),
      banner: (t, s) => this.hud.banner(t, s, true), system: (t) => this.hud.system(t), sound: (n) => this.sfx(n),
    });
    this.seasons = new Seasons({
      scene: this.scene, voxels: this.world.voxels, particles: this.particles, fest: () => this.festivals.fest,
      flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      give: (it, n) => this.give(it, n), count: (it) => this.inv.count(it), addMarks: (n) => this.addMarks(n),
      banner: (t, s) => this.hud.banner(t, s, true), system: (t) => this.hud.system(t), toast: (t) => this.hud.system(t), sound: (n) => this.sfx(n),
      doorsNear: (x, z, r) => [...this.world.doors()].filter((d) => Math.hypot(d.hinge.x - x, d.hinge.z - z) < r).map((d) => {
        // The way out of a door, from the angle it opens to (see world/Doors.ts)
        const nx = Math.round(Math.sin(d.open)), nz = Math.round(Math.cos(d.open));
        return { x: d.hinge.x + nz * 0.42, y: d.hinge.y, z: d.hinge.z - nx * 0.42, ry: Math.atan2(nx, nz) };
      }),
      addEnemy: (e) => { this.enemies.push(e); this.scene.add(e.model.root, e.telegraph); },
      removeEnemy: (e) => { this.scene.remove(e.model.root, e.telegraph); this.enemies = this.enemies.filter((x) => x !== e); if (this.target === e) this.target = null; },
      hour: () => this.world.sky.hour,
      lamps: this.world.extraLamps,
    });
    this.home = new Home({
      scene: this.scene, flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      count: (it) => this.inv.count(it), give: (it) => this.give(it), take: (it) => this.take(it),
      player: () => this.player.position, yaw: () => this.player.yaw,
      system: (t) => this.hud.system(t), sound: (n) => this.sfx(n as Sfx),
      shape: () => this.myHome(),
    });
    this.building = new Building({ scene: this.scene, voxels: this.world.voxels, buildProps: (s) => this.world.buildProps(s) });
    this.world.extraDoors = () => this.building.doors();
    this.planner = new Planner({
      count: (it) => this.inv.count(it), marks: () => this.save.marks,
      preview: (l, s) => this.building.showPlan(l, s),
      build: (l, s) => this.buildHouse(l, s),
      sound: (n) => this.sfx(n as Sfx),
      player: () => this.player.position,
      standing: () => !!readPlot(this.flag('plot'))?.spec,
    });
    this.kit = new ClassKit({
      scene: this.scene,
      particles: this.particles,
      player: () => this.player.position,
      yaw: () => this.player.yaw,
      enemies: () => this.enemies,
      faceTarget: (r) => this.faceTarget(r),
      setTarget: (e) => { this.target = e; },
      power: () => this.swingPower(),
      hit: (e, d, o) => this.dealDamage(e, d * (0.9 + Math.random() * 0.2), o?.crit ?? (!o?.quiet && Math.random() < 0.12 + (this.blade?.crit ?? 0)), !!o?.quiet),
      heal: (n) => {
        const h = Math.min(this.maxHp - this.hp, Math.round(n));
        if (h > 0 && !this.dead) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
        this.dungeons.shareHeal(n);
      },
      maxHp: () => this.maxHp,
      bow: () => this.bowInHand,
      anim: (st) => {
        if (st === 'heal') { this.healAnim = 0.6; return; }
        this.player.model.setState(st); this.player.model.stateTime = 0; this.healAnim = 0;
      },
      sfx: (n) => this.sfx(n),
      moveTo: (x, z, secs, y) => {
        const p = this.player.position;
        this.dash = { fx: p.x, fy: p.y, fz: p.z, tx: x, tz: z, ty: y ?? p.y, t: 0, dur: Math.max(0.05, secs) };
      },
      canReach: (e) => {
        // Leaps and steps go to a creature you could walk to: not up a cliff, not through a wall
        const p = this.player.position;
        const why = Math.abs(e.pos.y - p.y) > (this.player.swimming && e.swims ? 8 : 3) ? (e.pos.y > p.y ? "It's too far above you." : "It's too far below you.") : null;
        const dx = e.pos.x - p.x, dy = e.pos.y + 0.9 - (p.y + 1.2), dz = e.pos.z - p.z, d = Math.hypot(dx, dy, dz);
        const hit = d > 0.8 ? this.world.voxels.raycast(p.x, p.y + 1.2, p.z, dx / d, dy / d, dz / d, d - 0.6) : null;
        const msg = why ?? (hit ? 'Something is in the way.' : null);
        if (msg) { this.hud.system(msg); this.sfx('fail'); return false; }
        return true;
      },
      inCombat: () => { this.lastCombat = this.elapsed; this.dismount(); },
      sustainScale: () => (this.gearSet === 'tolley' ? 2 / 3 : 1),
      skillHaste: () => this.armour.haste * (this.gearSet === 'escapement' ? 1.1 : 1),
      aim: (range) => this.aimPoint(range),
      dash: (dir, dist) => this.springAlong(dir, dist),
      clear: (at) => {
        const p = this.player.position;
        if (Math.abs(at.y - p.y) > 3) { this.hud.system(at.y > p.y ? "That's too far above you." : "That's too far below you."); this.sfx('fail'); return false; }
        const dx = at.x - p.x, dy = at.y - p.y, dz = at.z - p.z, d = Math.hypot(dx, dy, dz);
        if (d > 0.8 && this.world.voxels.raycast(p.x, p.y + 1.2, p.z, dx / d, dy / d, dz / d, d - 0.6)) { this.hud.system('Something is in the way.'); this.sfx('fail'); return false; }
        return true;
      },
    });
    this.chests = new Chests({
      scene: this.scene,
      voxels: this.world.voxels,
      player: () => this.player.position,
      flag: (k) => this.flag(k),
      setFlag: (k, v) => this.setFlag(k, v),
      count: (id) => this.inv.count(id),
      take: (id, n) => this.take(id, n),
      reward: (marks0, items, why) => {
        const marks = Math.round(marks0 * marksScale(this.level('melee'), regionLevel(regionAt(this.player.position.x, this.player.position.z).a)));
        if (marks) this.addMarks(marks);
        for (const it of items) this.give(it.source ? this.dropped(it.id, it.source) : it.id, 1);
        this.hud.system(`${why}: ${marks} marks${items.length ? ' and ' + items.map((it) => ITEMS[it.id]?.name ?? it.id).join(', ') : ''}.`);
      },
      system: (t) => this.hud.system(t),
      sound: (n) => this.sfx(n),
      lockpick: (tier, picks, snap) => { const T = TIERS[tier]; return this.hud.lockpick(T.name, T.pins, T.zone, T.speed, picks, snap); },
      known: (id) => this.inv.count(id) > 0,
    });
    this.fish = new FishSchools(this.scene, this.world.voxels);
    this.books = new LoreBooks({
      scene: this.scene,
      voxels: this.world.voxels,
      player: () => this.player.position,
      api: () => this,
      flag: (k) => this.flag(k),
      setFlag: (k, v) => this.setFlag(k, v),
      read: (title, text) => this.hud.showReadable(title, text),
      system: (t) => this.hud.system(t),
      sound: (n) => this.sfx(n),
      sparkle: (at) => this.particles.note(at, '#fff4d0'),
    });
    this.activities = new Activities({
      standing: (r, n) => this.gainStanding(r as RegionId, n),
      daily: (k) => { this.dailies.bump(k); this.gainStanding(regionAt(this.player.position.x, this.player.position.z).a, k === 'event' ? GAINS.event : GAINS.task); },
      killed: (e) => this.onEnemyKilled(e),
      count: (id) => this.inv.count(id),
      take: (id, n = 1) => { const ok = this.inv.remove(id, n); if (ok) this.persist(); return ok; },
      shared: {
        on: () => !!this.online?.online,
        sync: (id, cycle, max) => this.online.bossSync(id, cycle, max),
        hit: (id, cycle, dmg, max) => this.online.bossHit(id, cycle, dmg, max),
        evStart: (id, waves, time, cooldown) => this.online.eventStart(id, waves, time, cooldown),
        evKill: (id) => this.online.eventKill(id),
      },
      scene: this.scene,
      voxels: this.world.voxels,
      player: () => this.player.position,
      alive: () => !this.dead,
      addEnemy: (e) => { this.enemies.push(e); this.scene.add(e.model.root, e.telegraph); },
      removeEnemy: (e) => { this.scene.remove(e.model.root, e.telegraph); this.enemies = this.enemies.filter((x) => x !== e); if (this.target === e) this.target = null; },
      hitPlayer: (d, from) => this.hitPlayer(d, from),
      reward: (xp0, marks0, items, why) => {
        // Written for the region's own level, paid at yours (data/scaling.ts)
        const w = regionLevel(regionAt(this.player.position.x, this.player.position.z).a);
        const xp = Math.round(xp0 * rewardScale(this.level('melee'), w)), marks = Math.round(marks0 * marksScale(this.level('melee'), w));
        if (xp) this.addXp('melee', xp);
        if (marks) this.addMarks(marks);
        for (const it of items) this.give(this.dropped(it, 'elite'), 1);
        this.hud.system(why + (xp ? ` (+${xp} XP)` : ''));
      },
      level: () => this.level('melee'),
      banner: (t, sub) => this.hud.banner(t, sub),
      system: (t) => this.hud.system(t),
      sound: (n) => this.sfx(n),
      flag: (k) => this.flag(k),
      setFlag: (k, v) => this.setFlag(k, v),
      discovered: (id) => this.save.discovered.includes(id),
      cinematic: (view, then) => { this.cine = { view, t: 0, then }; this.player.locked = true; this.hud.setHudHidden(true); },
      setEvent: (panel) => this.hud.setEvent(panel),
      say: (who, text, bubble) => {
        this.hud.chat(who, text, 'say');
        if (bubble !== undefined) this.addBubble(bubble, text, false);
      },
    });
    this.scene.add(this.player.model.root);
    this.player.model.root.visible = false;
    for (const def of NPCS) {
      const n = new Npc(def, this.world.voxels);
      this.npcs.push(n);
      this.scene.add(n.model.root);
    }
    for (const s of ENEMY_SPAWNS) {
      const e = new Enemy(ENEMIES[s.type], s.x, s.z, this.world.voxels, this.world.grid);
      e.spawnKey = `${s.type}@${s.x},${s.z}`;
      this.enemies.push(e);
      this.scene.add(e.model.root, e.telegraph);
    }
    for (const a of ANIMAL_SPAWNS) {
      const an = new Animal(a.kind, a.x, a.z, a.radius, this.world.voxels, this.world.grid, a.kind === 'duck' && a.x % 2 < 1 ? {} : a.kind === 'duck' ? { a: '#8a6a4a', b: '#7a5a3a' } : {});
      this.animals.push(an);
      this.scene.add(an.model.root);
    }
    this.stables = new Stables(this.scene, this.world.voxels);
    // Dogs and cats about the towns: by every Charter Post sign and in Hollin Ford, coats from a few kinds
    {
      const dogCoats: Palette[] = [{ a: '#26211e', b: '#efe8dc', c: '#a8682e' }, { a: '#8a5a2e', b: '#e8d8b8', c: '#5a3a1e' }, { a: '#c8a060', b: '#f0e4c8', c: '#8a6a3a' }, { a: '#3a3a3a', b: '#d8d8d8', c: '#6a6a6a' }];
      const catCoats: Palette[] = [{ a: '#d8843a', b: '#9a5420', c: '#f2e8d8' }, { a: '#2a2626', b: '#1a1616', c: '#3a3434' }, { a: '#8a8a8e', b: '#5a5a60', c: '#d8d8dc' }, { a: '#f0ece4', b: '#c8843a', c: '#ffffff' }];
      const spots: [number, number][] = [[171.5, 188.5], [147.5, 183.5], [182.5, 196.5], ...POSTS.filter((q) => !q.ferryFrom).flatMap((q): [number, number][] => [[q.x + 4.5, q.z + 3.5], [q.x - 4.5, q.z + 2.5]]), [687.5, 420.5], [675.5, 286.5], [787.5, 182.5]];
      spots.forEach(([x, z], i) => this.pets.push({ kind: i % 3 === 1 ? 'dog' : 'cat', x, z, pal: i % 3 === 1 ? dogCoats[i % dogCoats.length] : catCoats[(i * 7) % catCoats.length], a: null }));
      for (const st of this.world.sites) for (const ws of st.stations ?? []) this.worldStations.push(ws);
      for (const st of this.world.sites) for (const an of st.animals ?? []) this.pets.push({ kind: an.kind, x: an.x, z: an.z, r: an.r, pal: an.pal ?? {}, a: null });
    }
    Animal.voice = (kind, at) => this.audio.playAt(({ dog: 'bark', cat: 'meow', duck: 'quack', sheep: 'baa', cow: 'moo', pig: 'oink' } as Record<string, Sfx>)[kind] ?? 'click', at.distanceTo(this.player.position), 0.8);
    this.hazards = new Hazards({
      scene: this.scene,
      voxels: this.world.voxels,
      particles: this.particles,
      player: () => this.player.position,
      hurt: (share, at, what) => this.hurtByGround(share, at, what),
      enemies: () => this.enemies,
      hitEnemy: (e, dmg) => {
        e.takeDamage(dmg, e.pos.clone().add(new THREE.Vector3(0.1, 0, 0.1)), this.elapsed);
        this.floatAt(e.pos, e.model.plateHeight + 0.2, String(dmg), 'tick');
        if (e.justDied) this.onEnemyKilled(e);
      },
      sound: (name, at) => this.audio.playAt(name, at.distanceTo(this.player.position), 0.8),
      firstNear: (kind, text) => { if (this.flag('hz:' + kind)) return; this.setFlag('hz:' + kind, true); this.hud.system(text); },
    });
    this.dungeons = new Dungeons({
      scene: this.scene,
      voxels: this.world.voxels,
      particles: this.particles,
      player: () => this.player.position,
      dead: () => this.dead,
      invulnerable: () => this.iframes > 0,
      swimming: () => this.player.swimming,
      level: () => this.level('melee'),
      hp: () => ({ hp: this.hp, max: this.maxHp }),
      calling: () => this.calling,
      inCombat: () => this.elapsed - this.lastCombat < 6,
      hurtPlayer: (d, from) => this.hitPlayer(d, from),
      healPlayer: (n) => { if (this.dead || n <= 0) return; this.hp = Math.min(this.maxHp, this.hp + n); this.floatAt(this.player.position, 2.2, `+${Math.round(n)}`, 'heal'); this.particles.heal(this.player.position); },
      raise: (share) => this.raise(share),
      addEnemy: (e) => { this.enemies.push(e); this.scene.add(e.model.root, e.telegraph); },
      removeEnemy: (e) => { this.scene.remove(e.model.root, e.telegraph); this.enemies = this.enemies.filter((x) => x !== e); if (this.target === e) this.target = null; },
      killed: (e) => this.onEnemyKilled(e),
      target: () => this.target,
      travel: (at, yaw, banner, sub) => this.travelInto(at, yaw, banner, sub),
      reward: (xp, marks, items, why) => {
        if (xp) this.addXp('melee', xp);
        if (marks) this.addMarks(marks);
        for (const it of items) this.give(this.dropped(it, 'boss'), 1);
        this.hud.system(why + (xp ? ` (+${xp} XP)` : ''));
      },
      banner: (t, sub) => this.hud.banner(t, sub),
      system: (t) => this.hud.system(t),
      say: (who, text, bubble) => {
        if (who) this.hud.chat(who, text, 'say'); else this.hud.system(text);
        if (bubble !== undefined) this.addBubble(bubble, text, false);
      },
      float: (at, h, text, cls) => this.floatAt(at, h, text, cls),
      sound: (name, at) => this.audio.playAt(name, at.distanceTo(this.player.position), 0.8),
      sfx: (n, v) => this.sfx(n, v),
      ask: (t, y, n, s) => this.hud.ask(t, y, n, s),
      flag: (k) => this.flag(k),
      setFlag: (k, v) => this.setFlag(k, v),
      persist: () => this.persist(),
      standing: (region, n) => this.gainStanding(region as RegionId, n),
      net: {
        on: () => this.online.status === 'online',
        queue: (d, role) => this.online.qJoin(d, role),
        unqueue: () => this.online.qLeave(),
        queueNow: () => this.online.qNow(),
        groupGo: (d) => this.online.qGroup(d),
        answer: (run, yes, role) => this.online.qAnswer(run, yes, role),
        event: (run, k, i, dmg) => this.online.dEv(run, k, i, dmg),
        leaveRun: (run) => this.online.dLeave(run),
      },
      remote: (id) => this.online.remotes.get(id)?.model.root.position ?? null,
      group: () => (this.social.inGroup ? { leader: this.social.group!.leader === this.online.myId, size: this.social.group!.members.length } : null),
      refresh: () => { this.showGroup(); this.hud.refresh('finder'); },
    });
    this.online = new Online({
      scene: this.scene,
      night: () => this.world.sky.night,
      mySeat: () => {
        const id = this.flag('mount') as string;
        return this.horse && spareSeats(ITEMS[id]?.mount) > 0 ? { x: this.horse.root.position.x, y: this.horse.root.position.y, z: this.horse.root.position.z, yaw: this.horse.root.rotation.y, mount: id } : null;
      },
      system: (t) => this.hud.system(t),
      qStatus: (d, n) => this.dungeons.onQueue(d, n),
      uGrant: (id, ok, n, cap, first) => {
        const d = ITEMS[id];
        if (!ok || !d?.named) return;
        const item = `${id}__n${n}`;
        this.setFlag('u:' + item, first);
        if (!this.give(item)) { this.setFlag('uPending', [...((this.flag('uPending') as string[] | undefined) ?? []), item]); return; }
        this.hud.banner(d.name, `Named · No. ${n} of ${cap} in the realm`, true);
        this.hud.system(`${d.name}, No. ${n} of the ${cap} in the realm. ${d.named.text}`);
        this.audio.sting('victory');
      },
      qReady: (run, d, names, hench, secs) => this.dungeons.onReady(run, d, names, hench, secs),
      dStart: (run, d, members, missing) => this.dungeons.onStart(run, d, members.map((m) => ({ id: m.id, name: m.name, role: (m.role === 'tank' || m.role === 'healer' ? m.role : 'damage') as Role })), henchmenFor(missing.filter((r): r is Role => r === 'tank' || r === 'healer' || r === 'damage')).map((h) => h.id)),
      dEv: (from, k, i, dmg) => this.dungeons.onEvent(from, k, i, dmg),
      dLeft: (name) => this.dungeons.onLeft(name),
      ...this.social.hooks(),
      ...this.exchange.hooks(),
      ...this.mail.hooks(),
      ...this.music.hooks(),
      mobDead: (key: string, leftMs: number) => this.mobDeadElsewhere(key, leftMs),
      mobLedger: (list: [string, number][]) => { for (const [k, ms] of list) this.mobDeadElsewhere(k, ms); },
      homeAsked: (from: string) => {
        if (!this.home.owned) { this.online.homeShow(from, true, null); return; }
        this.hud.ask(`${from} would like to visit your home.`, () => this.online.homeShow(from, true, this.home.pieces(), readPlot(this.flag('plot'))), () => this.online.homeShow(from, false, null), 60);
      },
      homeShow: (owner: string, pieces: unknown[], plot: unknown) => {
        const hp = readPlot(plot);
        const shape = plotShape(hp) ?? COTTAGE_SHAPE;
        this.visitPlot = hp?.spec ? hp : null;
        this.home.visit(owner, pieces as Piece[], shape);
        this.hud.system(hp?.spec ? `${owner}'s house stands on ${LOTS.find((l) => l.id === hp.lot)!.name}, the Wendside lots east of Hollin Ford.` : `${owner}'s home is Wendside Cottage, on the road east of Hollin Ford.`);
      },
      chat: (from, t0, id, kind) => {
        // Someone you've ignored isn't heard, aloud or in a whisper
        if (from !== this.save.name && this.isIgnored(from)) return;
        const t = this.save.settings.filterChat ? filterLanguage(t0) : t0;
        this.hud.chat(from, t, kind);
        if (kind === 'whisper') { this.social.lastWhisper = from; this.sfx('click'); }
        // Only what's said aloud shows over a head: group, guild and whispers are private
        if (id !== undefined && (kind === 'say' || kind === 'emote' || !kind)) this.addBubble(id === this.online.myId ? -1 : id, kind === 'emote' ? `${from} ${t}` : t, kind === 'emote');
      },
      status: (s, n) => {
        if (s === 'online') this.social.watch();
        this.hud.setOnline(s === 'off' ? null : s === 'online' ? `Online · ${n}` : s === 'connecting' ? 'Connecting…' : s === 'denied' ? 'Offline' : 'Reconnecting…', s === 'online');
      },
      bossState: (id, cycle, hp) => this.activities.bossState(id, cycle, hp),
      bossDown: (id, cycle, by) => this.activities.bossDown(id, cycle, by, this.save.name),
      eventState: (id, killed, total, wave, left) => this.activities.eventState(id, killed, total, wave, left),
      eventDone: (id, ok, total, shares) => this.activities.eventDone(id, ok, total, shares, this.save.name),
      eventCool: (id, left) => this.activities.eventCool(id, left),
      newerSave: (save) => {
        // Another browser played this character further. Take the server's copy and restart on it.
        this.hud.system('The server has newer progress for this character. Loading it…');
        this.restoring = true;
        writeSave(save, saveKeyFor(this.charId ?? 'main'));
        setTimeout(() => location.reload(), 1200);
      },
    });
    // Closing the tab saves locally and sends the server the final copy (uploads are otherwise throttled).
    window.addEventListener('pagehide', () => { if (this.restoring) return; this.persist(); this.online.save(this.save, true); if (this.mode === 'play') uploadSave(this.save, true); });
    this.world.onChunk = (cx, cz, r) => { this.spawnChunk(cx, cz, r); this.building?.chunkLoaded(cx, cz); };
    this.world.onChunkGone = (cx, cz) => this.despawnChunk(cx, cz);
    this.mode = 'title';
    this.applySettings();
    // Keep the loading screen up until the square is built, so the menu never shows half a village.
    // (Come here to cross from the other land: straight back into the character who crossed.)
    try { this.autoEnter = sessionStorage.getItem(ENTER_KEY); sessionStorage.removeItem(ENTER_KEY); } catch { this.autoEnter = null; }
    // The menu is in the Counties: a page in Morrow with nobody to bring in goes back there
    if (LAND !== 'counties' && !this.autoEnter && !LAND_FORCED) { setNextLand('counties'); setTimeout(() => location.reload(), 50); }
    this.hud.showTitle(this.autoEnter ? (LAND === 'morrow' ? 'Coming ashore at Callis…' : 'Coming ashore at Gullmouth…') : 'Raising Hollin Ford…');
    this.menuPending = true;
  }

  // =================================================================== GameApi
  flag(key: string): unknown { return this.save.flags[key]; }
  setFlag(key: string, value: unknown = true): void { this.save.flags[key] = value; }
  stage(q: string): string | undefined { return this.save.quests[q]; }
  setStage(q: string, s: string): void {
    const prev = this.save.quests[q];
    if (prev === s) return;
    this.save.quests[q] = s;
    const def = QUESTS[q];
    if (s === 'done' && def.story) {
      this.audio.sting('chapter');
      this.hud.banner(`Chapter ${ROMAN[def.story.chapter]} complete`, def.story.title, true);
      this.sfx('quest');
      // The next chapter opens a moment later, on the game clock (browser timers stall in background tabs).
      if (def.next && !this.stage(def.next[0])) this.chapterQueue.push({ q: def.next[0], s: def.next[1], t: 2.6 });
    } else if (s === 'done') {
      this.hud.banner('Quest complete', def.name, true);
      this.sfx('quest');
    } else if (!prev && def.story) {
      this.hud.chapterCard(`${def.story.act ?? 'The Charter\'s Debt'} · Chapter ${ROMAN[def.story.chapter]}`, def.story.title);
      this.sfx('levelUp');
    } else if (!prev) {
      this.hud.banner('New quest', def.name, true);
      this.sfx('quest');
    } else {
      this.hud.system(`${def.name}: updated`);
      this.sfx('pickup');
    }
    if (s === 'done' && !this.flag('qxp:' + q)) {
      // A finished quest is worth so many kills at your level (data/pacing.ts), once
      this.setFlag('qxp:' + q, 1);
      const xp = Math.round(killXp(this.level('melee')) * (def.story ? QUEST_KILLS.story : QUEST_KILLS[def.depth ?? 'quest']));
      this.addXp('melee', xp);
      this.hud.system(`${def.name}: +${xp.toLocaleString()} XP`);
    }
    if (s === 'done') {
      const reg = def.region && def.region in REGION_INFO ? (def.region as RegionId) : regionAt(this.player.position.x, this.player.position.z).a;
      this.gainStanding(reg, def.story ? GAINS.story : GAINS[def.depth ?? 'quest']);
    }
    this.hud.setJournalAlert(true);
    this.persist();
  }

  // =================================================================== Standing (data/standing.ts)
  /** Standing in a region goes up; a new rank is announced. */
  gainStanding(region: RegionId, n: number): void {
    if (!REGION_INFO[region] || n <= 0) return;
    const k = 'rep:' + region, before = Number(this.flag(k) ?? 0), after = before + n;
    this.setFlag(k, after);
    const a = rankFor(before), b = rankFor(after);
    if (b.i > a.i) {
      this.hud.banner(`${b.rank.name} in ${REGION_INFO[region].name}`, b.rank.off ? `Its traders sell to you for ${Math.round(b.rank.off * 100)}% less` : 'People there know your name now', true);
      this.sfx('levelUp', 0.6);
      const cape = REGION_CAPE[region];
      if (cape && b.next === null) this.unlockCape(cape);
    }
  }
  /** Add a cloak design to the wardrobe for good (data/capes.ts). */
  private unlockCape(id: CapeDesign): void {
    const d = CAPE_DESIGNS[id];
    if (!d || this.flag('capeD:' + id)) return;
    this.setFlag('capeD:' + id, 1);
    this.hud.banner(d.name, 'Added to your wardrobe', true);
    this.hud.system(`${d.name} is in your wardrobe now: pick it under Cloak with Change look, on the character screen. It is worked in your trim colour.`);
    this.sfx('discover');
  }
  /** What the shops of a region take off for you. */
  private standingOff(region: RegionId): number { return rankFor(Number(this.flag('rep:' + region) ?? 0)).rank.off; }
  /** The journal's Standing page. */
  standingView() {
    return (Object.keys(REGION_INFO) as RegionId[]).map((r) => {
      const points = Number(this.flag('rep:' + r) ?? 0), x = rankFor(points);
      return { id: r, name: REGION_INFO[r].name, points, rank: x.rank.name, off: x.rank.off, from: x.rank.at, next: x.next ? { name: x.next.name, at: x.next.at, off: x.next.off } : null };
    });
  }
  count(item: string): number { return this.inv.count(item); }
  has(item: string, n = 1): boolean { return this.inv.count(item) >= n; }
  give(item: string, n = 1): boolean {
    const ok = this.inv.add(item, n);
    if (ok) {
      this.hud.loot(item, n); this.sfx('pickup');
      const d = ITEMS[item];
      if (d.weapon || d.armor) this.setFlag('found:' + baseOf(item)); // the armoury remembers every piece
    }
    else this.hud.system('Your pack is full.');
    this.hud.refresh('inv');
    return ok;
  }
  take(item: string, n = 1): boolean {
    const ok = this.inv.remove(item, n);
    this.hud.refresh('inv');
    return ok;
  }
  get marks(): number { return this.save.marks; }
  addMarks(n: number): void {
    this.save.marks += n;
    if (n > 0) { this.hud.system(`+${n} marks`); this.sfx('coin'); }
    this.hud.refresh();
  }
  level(s: SkillId): number { return levelForXp(this.save.xp[s], s); }
  hasTool(s: SkillId): boolean {
    return this.save.inv.some((st) => st && ITEMS[st.id].tool?.skill === s);
  }
  toast(text: string): void { this.hud.system(text); }

  ride(x: number, y: number, z: number, line?: string): void {
    this.dismount(true);
    this.cancelActions();
    this.player.teleport(x, y + 0.05, z);
    this.rig.snap(this.player.position);
    this.particles.dust(this.player.position, 10);
    this.sfx('roll', 0.7);
    if (line) this.hud.system(line);
  }

  quake(strength = 0.6): void {
    this.rig.addShake(strength);
    this.sfx('hitHeavy');
    this.particles.dust(this.player.position, 24);
  }
  /** The festival stall trades through the shop panel, in tokens. */
  private openFestivalStall(): void {
    const f = this.festivals.fest;
    if (!f) return;
    SHOPS.festival = {
      id: 'festival', name: f.name + ' stall', owner: '', who: 'The stallholder',
      stock: f.stall, currency: f.token, buyRate: () => 0,
      footer: () => `Prices in ${f.tokenPlural}. The stall takes nothing else.`,
    };
    this.currentShop = 'festival';
    this.hud.show('shop'); this.showPackBeside();
    this.sfx('open');
  }

  /** A pedlar's pack, on the road (data/content/pedlars.ts). */
  private openPedlar(id: string): void {
    this.currentShop = 'pedlar_' + id;
    this.hud.show('shop'); this.showPackBeside();
    this.roadfolk.pedlarSay(id);
    this.sfx('open');
  }

  openShop(id = 'tamsin'): void { this.currentShop = SHOPS[id] ? id : 'tamsin'; this.hud.show('shop'); this.showPackBeside(); }
  openTravel(from: string): void { this.currentPost = from; this.hud.show('travel'); }
  duel(id: string): void { this.activities.duels.start(id); }
  /** The Lamp Company's pledge today, and how it stands; taking it; going back with it done (keys paid). */
  pledge(): { name: string; state: 'open' | 'taken' | 'done' | 'paid' } | null { return this.dungeons.pledge(); }
  takePledge(): void { this.dungeons.takePledge(); }
  turnInPledge(): number { return this.dungeons.turnInPledge(); }
  /** Every town's price on you added up, and what a fixer charges to make it go away. */
  bounties(): { total: number; fee: number } { return { total: this.justice.total, fee: this.justice.fixerPrice }; }
  /** A fixer clears every book, if you can pay. */
  clearName(): boolean {
    const fee = this.justice.fixerPrice;
    if (fee <= 0 || this.save.marks < fee) return false;
    this.save.marks -= fee;
    this.justice.clearAll();
    this.sfx('coin');
    this.hud.refresh();
    return true;
  }
  crossLand(to: LandId): void {
    if (this.inCombat()) { this.hud.system('Not in the middle of a fight.'); return; }
    if (this.voyage.active) return;
    // Where the packet sets you down: the end of Callis's packet pier, or Gullmouth's quay
    const at: [number, number, number] = to === 'morrow' ? [CALLIS_PACKET.x - 6.5, 23, CALLIS_PACKET.z + 0.5] : [1724.5, 24, 597.5];
    const yaw = to === 'morrow' ? -Math.PI / 2 : Math.PI / 2;
    this.dismount(true);
    this.hud.closeAll();
    // Out to sea with you on her deck; the crossing itself is the loading screen; then in from the sea on the far side
    this.setFlag('voyage', to);
    this.rig.yaw = HARBOURS[LAND].heading + Math.PI;
    this.voyage.depart(HARBOURS[LAND], () => {
      this.player.teleport(at[0], at[1], at[2]);
      this.player.yaw = yaw;
      this.switchLand(to, to === 'morrow' ? 'The Constant, a day and a night out of Gullmouth…' : 'The Constant, a day and a night out of Callis…');
    });
  }

  /** A notice board talks like a person with no face: the dialogue panel, headed with the board's name. */
  openBoard(id: string): void {
    const b = BOARDS.find((x) => x.id === id);
    if (!b) return;
    const y = b.y ?? this.world.voxels.groundBelow(b.x, 95, b.z);
    const speaker = {
      id: 'board:' + b.id, talking: false,
      def: { id: 'board:' + b.id, name: b.name, title: 'Notice board', schedule: [{ from: 0, to: 24, at: [b.x, b.z], face: [b.x, b.z], anim: 'idle' }] },
      pos: new THREE.Vector3(b.x, y, b.z),
    } as unknown as Npc;
    this.startDialogue(speaker);
  }

  private travelView() {
    const here = POSTS.find((p) => p.id === this.currentPost)!;
    return {
      from: here.name,
      stops: POSTS.map((p) => ({
        id: p.id, name: p.name, here: p.id === here.id,
        known: postKnown(p, this.save.discovered) && (!p.gate || !!this.flag(p.gate)),
        fare: postFare(here, p), hours: postHours(here, p),
      })),
    };
  }

  /** Ride the post cart: pay, lose some hours, and wake up at the other stop once its ground has loaded. */
  waymarkFareTo(id: string): number | null {
    const w = waymarks().find((x) => x.id === id);
    if (!w || !this.flag(id) || this.mode !== 'play' || this.dead || this.dialogue) return null;
    if (this.elapsed - this.lastCombat < 5) return null;
    return waymarkFare(this.player.position, w);
  }

  /** Go by waymark: pay, and the world loads round the stone. */
  travelWaymark(id: string): void {
    if (this.justice.jailed) { this.hud.system('Not from a cell.'); return; }
    const w = waymarks().find((x) => x.id === id);
    const fare = this.waymarkFareTo(id);
    if (!w || fare === null) { this.hud.system('You can\'t travel by waymark just now (not in a fight, not in a conversation).'); return; }
    if (this.save.marks < fare) { this.hud.system('You don\'t have the marks for that.'); return; }
    this.save.marks -= fare;
    this.sfx('coin');
    this.dismount(true);
    this.hud.closeAll();
    this.cancelActions();
    this.target = null;
    const y = w.ay ?? heightAt(w.ax, w.az) + 1;
    this.save.pos = [w.ax, y + 0.5, w.az];
    this.save.hour = this.world.sky.hour;
    this.save.hp = this.hp;
    this.arriving = w.name;
    this.arrivingBy = 'waymark';
    this.startPlay(false, 'Following the waymarks…');
  }

  /** Into a group dungeon or back out of it: the world loads round the point. */
  private travelInto(at: [number, number, number], yaw: number, banner: string, sub: string): void {
    this.dismount(true);
    this.hud.closeAll();
    this.cancelActions();
    this.target = null;
    this.save.pos = [at[0], at[1] + 0.05, at[2]];
    this.save.yaw = yaw;
    this.save.hour = this.world.sky.hour;
    this.save.hp = this.hp;
    this.arriving = banner;
    this.arrivingBy = 'dungeon';
    this.arrivingSub = sub;
    this.startPlay(false, sub.startsWith('Group dungeon') ? 'Down the shaft ladder…' : 'Up the ladder…');
  }

  /** The Group Finder, open at a dungeon (the door, or key P). */
  openFinder(id?: string): void {
    if (id) this.hud.finderAt = id;
    this.hud.show('finder');
  }

  private travelTo(id: string): void {
    const here = POSTS.find((p) => p.id === this.currentPost);
    const there = POSTS.find((p) => p.id === id);
    if (!here || !there || here === there || !postKnown(there, this.save.discovered) || (there.gate && !this.flag(there.gate))) return;
    const fare = postFare(here, there);
    if (this.save.marks < fare || this.dead || this.dialogue) return;
    this.save.marks -= fare;
    this.sfx('coin');
    this.hud.closeAll();
    this.cancelActions();
    this.target = null;
    // Set down a couple of blocks in front of the sign, facing away from it.
    const fx = Math.sin(there.ry), fz = Math.cos(there.ry);
    const x = there.x + fx * 2, z = there.z + fz * 2;
    this.save.pos = [x, heightAt(x, z) + 1, z];
    this.save.yaw = Math.atan2(fx, fz);
    this.save.hp = this.hp;
    this.arriving = there.name;
    this.arrivingBy = 'post';
    this.startPlay(false, here.ferryFrom || there.ferryFrom ? 'Crossing on the ferry…' : 'On the Charter Post…');
  }

  /** The pack opens beside a trader or a station, where there's room for both; on a phone, one panel at a time. */
  private showPackBeside(): void { if (innerWidth > 520) this.hud.show('inv'); }

  /** Where a crafting station stands: the joiner's bench is at the cottage, the rest in Hollin Ford. */
  private stationAt(st: Station): { x: number; y: number; z: number } {
    if (this.stationPos) return this.stationPos;
    if (st === 'bench') return { ...COTTAGE.bench, y: COTTAGE.floor };
    return this.world.structures.interactables.find((i) => i.kind === st)!;
  }

  /** Where the station you're working at stands, when it isn't Hollin Ford's (a town smithy's: world/sites.ts). */
  private stationPos: { x: number; y: number; z: number } | null = null;
  /** Every station anyone can use out in the world. */
  private worldStations: { station: Station; x: number; y: number; z: number }[] = [];
  openCrafting(st: Station, at?: { x: number; y: number; z: number }): void { this.currentStation = st; this.stationPos = at ?? null; this.hud.show('craft'); this.showPackBeside(); }
  startCasting(): void { this.casting = { t: 0, dur: 30 }; }
  get playerName(): string { return this.save.name; }

  /** A night in your own bed: well rested for 30 minutes of play, once every 8 hours. */
  private sleep(): void {
    const last = Number(this.flag('slept') ?? 0), now = Date.now();
    if (now - last < 8 * 3600_000) {
      const h = Math.ceil((8 * 3600_000 - (now - last)) / 3600_000);
      this.hud.system(`You lie down for a while, but you're not tired. Try again in ${h} hour${h === 1 ? '' : 's'}.`);
      return;
    }
    this.setFlag('slept', now);
    this.setFlag('rested', 30 * 60);
    this.hp = this.maxHp;
    this.hud.banner('Well rested', 'A quarter more experience for half an hour', true);
    this.sfx('heal');
    this.hud.refresh();
  }

  /** Your home: the house on your lot once it's built, otherwise Wendside Cottage if you bought it. */
  private myHome(): HomeShape | null {
    const plot = plotShape(readPlot(this.flag('plot')));
    if (plot) return plot;
    // A room let by the week is home while the rent is paid
    const t = readTenancy(this.flag('flat'));
    if (t) return t.until > Date.now() ? roomShape(LODGINGS.find((l) => l.id === t.house)!, t.room) : null;
    return this.flag('home') ? COTTAGE_SHAPE : null;
  }

  /** Whether the room you rent is paid up (watched, so its furniture goes when the rent runs out). */
  private letPaid = false;

  /** A lodging room's door: rent it, pay another week, or move into it from another. */
  private roomDoor(house: string, room: number): void {
    const L = LODGINGS.find((l) => l.id === house)!;
    const name = ROOMS[room].name;
    const t = readTenancy(this.flag('flat'));
    const until = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    if (t && t.house === house && t.room === room) {
      const from = Math.max(Date.now(), t.until);
      if (from - Date.now() >= (MAX_WEEKS - 1) * WEEK) { this.hud.system(`${name} is yours until ${until(t.until)}. The landlord won't take more than ${MAX_WEEKS} weeks ahead.`); return; }
      this.hud.ask(`${name}, ${L.name}: ${t.until > Date.now() ? `paid until ${until(t.until)}` : 'the rent has run out, and the door is shut on your things'}. Pay a week for ${L.rent} marks?`, () => {
        if (this.save.marks < L.rent) { this.hud.system(`A week is ${L.rent} marks and you have ${this.save.marks}.`); this.sfx('fail'); return; }
        this.addMarks(-L.rent);
        this.setFlag('flat', { house, room, until: Math.max(Date.now(), t.until) + WEEK });
        this.sfx('open');
        this.hud.system(`Paid. ${name} is yours until ${until(Math.max(Date.now(), t.until) + WEEK)}.`);
        this.persist();
      }, () => {}, 30);
      return;
    }
    if (readPlot(this.flag('plot'))?.spec || (this.flag('home') && !t)) { this.hud.system(`${name}: to let by the week. You have a home of your own.`); return; }
    if (t && this.home.pieces().length) { this.hud.system(`You already rent ${ROOMS[t.room].name} at ${LODGINGS.find((l) => l.id === t.house)!.name}. Pick up your furniture there first (Arrange the furniture, then X), and you can move.`); return; }
    this.hud.ask(`${name}, ${L.name}: a room of your own, ${L.rent} marks a week. Furnish it, sleep in it, keep things in the chest.${t ? ' You give up your other room.' : ''} Rent it?`, () => {
      if (this.save.marks < L.rent) { this.hud.system(`A week is ${L.rent} marks and you have ${this.save.marks}.`); this.sfx('fail'); return; }
      this.addMarks(-L.rent);
      this.setFlag('flat', { house, room, until: Date.now() + WEEK });
      if (!Array.isArray(this.flag('home'))) this.setFlag('home', []);
      this.letPaid = true;
      this.home.render();
      this.hud.banner(name, `${L.name}, ${L.town}`, true);
      this.sfx('discover');
      this.hud.system(`The key's yours until ${until(Date.now() + WEEK)}. Inside, use the prompt to arrange furniture; the chest by the wall opens your Charter Bank vault. Pay again at the door any time.`);
      this.hud.refresh();
      this.persist();
    }, () => {}, 30);
  }

  /** Give up a let room (moving into a house of your own): false if its furniture is still out. */
  private leaveRoom(): boolean {
    if (!readTenancy(this.flag('flat'))) return true;
    if (this.home.pieces().length) { this.hud.system('Your furniture is still set out in your rented room. Pick it up first (Arrange the furniture, then X).'); this.sfx('fail'); return false; }
    this.setFlag('flat', null);
    this.setFlag('home', null);
    this.hud.system('You hand back the key to your rented room.');
    return true;
  }

  openExchange(): void {
    this.hud.closeAll();
    this.exchange.open();
    this.hud.show('exchange');
    this.showPackBeside();
  }

  openMail(): void {
    this.hud.closeAll();
    this.mailAt = { x: this.player.position.x, z: this.player.position.z };
    this.mail.open();
    this.hud.show('mail');
  }

  openBank(id: string): void {
    const b = BANKS.find((x) => x.id === id);
    if (!b) return;
    this.hud.closeAll();
    void this.bank.show(b.name, b.x, b.z);
  }

  lotAction(id: string): void {
    const lot = LOTS.find((l) => l.id === id)!;
    const mine = readPlot(this.flag('plot'));
    if (mine && mine.lot !== id) { this.hud.system(`${lot.name}: to let. You already hold ${LOTS.find((l) => l.id === mine.lot)!.name}; one home to a household.`); return; }
    if (!mine) {
      if (this.save.marks < LOT_PRICE) { this.hud.system(`${lot.name}: to let for ninety-nine years, ${LOT_PRICE} marks to the Charter. You have ${this.save.marks}.`); this.sfx('fail'); return; }
      this.hud.ask(`Lease ${lot.name} from the Charter for ${LOT_PRICE} marks? Then draw up plans and have a house built on it.`, () => {
        if (readPlot(this.flag('plot')) || this.save.marks < LOT_PRICE) return;
        this.addMarks(-LOT_PRICE);
        this.setFlag('plot', { lot: id });
        this.hud.banner(lot.name, 'Leased for ninety-nine years', true);
        this.sfx('discover');
        this.hud.refresh();
        this.persist();
        this.planner.open(lot);
      }, () => {}, 30);
      return;
    }
    this.hud.closeAll();
    this.planner.open(lot, mine.spec);
  }

  /** The builders raise the house: they take the timber, ironwork and wages, and it stands. */
  private buildHouse(lot: Lot, spec: HouseSpec): void {
    const mine = readPlot(this.flag('plot'));
    if (!mine || mine.lot !== lot.id) return;
    const pieces = this.home.pieces();
    if (pieces.length) { this.hud.system(`Your furniture is still set out at ${this.myHome()?.name ?? 'home'}. Pick it up first (Arrange the furniture, then X): the builders won't shift it.`); this.sfx('fail'); return; }
    const cost = costOf(spec);
    for (const [id, n] of Object.entries(cost.items)) if (this.inv.count(id) < n) { this.hud.system(`The builders need ${n} ${ITEMS[id].name} and you have ${this.inv.count(id)}.`); this.sfx('fail'); return; }
    if (this.save.marks < cost.marks) { this.hud.system(`The builders want ${cost.marks} marks and you have ${this.save.marks}.`); this.sfx('fail'); return; }
    const rebuild = !!mine.spec;
    if (!rebuild && !this.leaveRoom()) return;
    const fromCottage = !rebuild && !!this.flag('home');
    for (const [id, n] of Object.entries(cost.items)) this.inv.remove(id, n);
    this.addMarks(-cost.marks);
    if (fromCottage) { this.addMarks(COTTAGE_BUYBACK); this.hud.system(`You give Wendside Cottage back to the Charter, and Maud Ashby pays you ${COTTAGE_BUYBACK} marks for it.`); }
    this.setFlag('plot', { lot: lot.id, spec });
    this.setFlag('home', []);
    this.planner.close();
    this.hud.banner(rebuild ? 'Rebuilt' : 'Your house stands', `${lot.name}, the Wendside lots`, true);
    this.sfx('levelUp');
    this.hud.system('The Ansbury builders raise it in an afternoon and leave you the key. Furnish it however you like: inside, use the prompt to arrange the furniture.');
    this.hud.refresh();
    this.persist();
  }

  buyHome(): void {
    if (readTenancy(this.flag('flat')) && !this.leaveRoom()) return;
    if (this.home.owned) return;
    const price = COTTAGE.price;
    if (this.save.marks < price) { this.hud.system(`"Wendside Cottage. Two rooms' worth of floor, a sound roof, a good hearth. ${price} marks to the Charter." You have ${this.save.marks}.`); this.sfx('fail'); return; }
    this.hud.ask(`Buy Wendside Cottage for ${price} marks? It's yours for good: furnish it however you like.`, () => {
      if (this.home.owned || this.save.marks < price) return;
      this.addMarks(-price);
      this.setFlag('home', []);
      this.home.render();
      this.hud.banner('Wendside Cottage', 'A home of your own', true);
      this.sfx('discover');
      this.hud.system('The key is under the barrel. Buy furniture from Tamsin or Perrin, then use the prompt inside to arrange it.');
      this.hud.refresh();
      this.persist();
    }, () => {}, 30);
  }

  arrangeHome(): void { this.hud.closeAll(); if (this.home.active) this.home.stop(); else this.home.start(); }

  // =================================================================== XP and items
  addXp(skill: SkillId, amount: number): void {
    if (this.social.groupNearby()) amount = Math.round(amount * 1.1);
    if (Number(this.flag('rested') ?? 0) > 0) amount = Math.round(amount * 1.25);
    if (!this.writXp && skill !== 'melee') this.dailies.bump(`xp:${skill}`, Math.round(amount));
    const before = this.level(skill);
    this.save.xp[skill] += Math.round(amount);
    const after = this.level(skill);
    this.hud.xpDrop(skill, Math.round(amount));
    if (skill !== 'melee') this.hud.skillXp(skill, this.save.xp[skill]);
    if (after > before) {
      const name = SKILLS.find((s) => s.id === skill)!.name;
      this.hud.banner(`${name} ${after}`, 'Level up', true);
      this.sfx('levelUp');
      this.particles.burst(tmpV.copy(this.player.position).setY(this.player.position.y + 1.2), SKILLS.find((s) => s.id === skill)!.color, 40);
      if (skill === 'melee') {
        this.hp = this.maxHp;
        // A new skill on the bar
        UNLOCK_AT.forEach((lv, i) => {
          if (lv <= before || lv > after) return;
          const s = i === 2 ? this.kit.weaponSkill : i >= 3 ? this.kit.bar[i - 3] : null;
          this.hud.system(`New skill: ${s?.name ?? UNLOCK_NAMES[i]}, on key ${i + 1}.`);
          this.hud.banner(s?.name ?? UNLOCK_NAMES[i], `New skill · key ${i + 1}`, true);
        });
      }
    }
    this.hud.refresh('skills');
  }

  get maxHp(): number { return Math.round((100 + (this.level('melee') - 1) * 6 + this.armour.vigor) * (1 + this.buffSum('hp'))); }

  /** A meal's and a drink's good together (data/items.ts buff). */
  private buffSum(k: 'hp' | 'regen' | 'power'): number {
    let n = 0;
    for (const slot of ['food', 'drink'] as const) {
      const b = this.flag('buff:' + slot) as { id: string; left: number } | undefined;
      if (b && b.left > 0) n += ITEMS[b.id]?.buff?.[k] ?? 0;
    }
    return n;
  }
  /** Time the meals and drinks down, and say when one wears off. */
  private tickBuffs(dt: number): void {
    for (const slot of ['food', 'drink'] as const) {
      const b = this.flag('buff:' + slot) as { id: string; left: number } | undefined;
      if (!b || b.left <= 0) continue;
      b.left -= dt;
      if (b.left <= 0) { this.setFlag('buff:' + slot, null); this.hp = Math.min(this.hp, this.maxHp); this.hud.system(`${ITEMS[b.id]?.name ?? 'It'} has worn off.`); }
    }
  }
  /** What's working on you now, for the frame under your health. */
  buffList(): { name: string; left: number; kind: string }[] {
    const out: { name: string; left: number; kind: string }[] = [];
    for (const slot of ['food', 'drink'] as const) {
      const b = this.flag('buff:' + slot) as { id: string; left: number } | undefined;
      if (b && b.left > 0) out.push({ name: ITEMS[b.id]?.name ?? b.id, left: b.left, kind: slot });
    }
    if (this.winded) out.push({ name: 'Winded', left: 0, kind: 'winded' });
    return out;
  }
  /** Out of breath: run dry and you trudge until a third of it is back. */
  private winded = false;

  /**
   * Everything the armour adds up to (data/armour.ts): defense off each hit, health, energy, roll
   * time, and the weights' own effects (light: skill haste; medium: crits and cheaper rolls; heavy:
   * health, slower energy).
   */
  private get armour() {
    const e = this.save.equip;
    const a = { defense: 0, vigor: 0, wind: 0, roll: 0, crit: 0, rollCost: 25, haste: 1, light: 0, medium: 0, heavy: 0 };
    for (const id of [e.head, e.chest, e.legs, e.hands, e.feet]) {
      const r = id ? ITEMS[id]?.armor : undefined;
      if (!r) continue;
      a.defense += r.defense; a.vigor += r.vigor ?? 0; a.wind += r.wind ?? 0; a.roll += r.roll ?? 0;
      if (r.weight) a[r.weight]++;
    }
    a.haste += a.light * 0.04;
    a.crit += a.medium * 0.015; a.rollCost -= a.medium * 2;
    a.vigor += a.heavy * 12; a.wind -= a.heavy * 0.03;
    return a;
  }

  /** What the gear panel says about the armour worn. */
  armourSummary(): { defense: number; weights: string; set: string | null } {
    const a = this.armour;
    const w = (['light', 'medium', 'heavy'] as const).filter((k) => a[k] > 0).map((k) => `${a[k]} ${WEIGHTS[k].name.toLowerCase()} (${WEIGHTS[k].desc})`);
    const s = this.gearSet;
    return { defense: a.defense, weights: w.join('; ') || 'none', set: s };
  }

  /** Put the worn look on the character, and show it to everyone else. */
  private dress(): void {
    const look = this.wornLook();
    this.player.setAppearance(look, this.scene);
    this.online.setLook(look);
  }
  /** The pack's room: the base slots and whatever the pack you've strapped on adds. */
  private fitPack(): void {
    const want = INV_SIZE + Number(this.flag('packSlots') ?? 0);
    while (this.save.inv.length < want) this.save.inv.push(null);
  }
  /** The pack you wear, for the pack panel; and hiding it (it still holds what it holds). */
  packInfo(): { name: string; slots: number; hidden: boolean } | null {
    const look = Number(this.flag('packLook') ?? 0);
    if (!look) return null;
    const def = Object.values(ITEMS).find((d) => d.pack?.look === look);
    return { name: def?.name ?? 'Pack', slots: Number(this.flag('packSlots') ?? 0), hidden: !!this.flag('hidePack') };
  }
  togglePack(): void { this.setFlag('hidePack', !this.flag('hidePack')); this.hud.refresh(); }

  /** The look the character shows: their own, with what they're wearing over it. */
  private wornLook(): Appearance {
    const e = this.save.equip;
    const look: Appearance = { ...this.save.look };
    for (const id of [e.chest, e.legs, e.hands, e.feet, e.head]) {
      const l = id ? ITEMS[id]?.armor?.look : undefined;
      if (l) Object.assign(look, l);
    }
    return look;
  }
  /** The equipped weapon's and helm's traits (gear is horizontal: see GEAR_BUDGET in items.ts). */
  private get blade() { return this.save.equip.weapon ? ITEMS[this.save.equip.weapon].weapon : undefined; }
  private get helm() { return this.save.equip.head ? ITEMS[this.save.equip.head].armor : undefined; }
  /** The regional set bonus in force (GEAR_SETS), if both pieces match. */
  private get gearSet() { return activeSet(this.save.equip); }
  private get fx(): Set<NamedFx> {
    const e = this.save.equip, worn = [e.weapon, e.head, e.chest, e.legs, e.hands, e.feet], key = worn.join('|');
    if (key !== this.fxKey) {
      this.fxKey = key;
      this.fxSet = new Set(worn.map((id) => (id ? ITEMS[id]?.named?.fx : undefined)).filter((f): f is NamedFx => !!f));
    }
    return this.fxSet;
  }
  /** How fast you swing: the weapon, the calling's haste, and a fury after a kill. */
  private get pace(): number { return (this.blade?.speed ?? 1) * this.kit.attackSpeed() * (this.furyUntil > this.elapsed ? 1.25 : 1); }
  /** A drop: weapons and armour come rolled (data/gear.ts), anything else as it is. */
  private dropped(id: string, source: DropSource): string { const d = ITEMS[id]; return d ? rollGear(d, source) : id; }
  /** A named piece has dropped: the realm numbers it, if any are left (server/uniques.mjs). Offline there's
   *  no count to keep, so none drop. */
  private claimNamed(id: string): void {
    if (this.online.status !== 'online') return;
    if (this.inv.freeSlots() < 1) { this.hud.system('Something glints in what\'s left of it, but your pack is full.'); return; }
    this.online.uClaim(id);
  }
  private healSelf(n: number): void {
    const h = Math.min(this.maxHp - this.hp, Math.round(n));
    if (h > 0 && !this.dead) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
  }

  private sfx(name: Sfx, vol = 1): void { this.audio.play(name, vol); }

  // =================================================================== Settings and save
  private applySettings(): void {
    const s = this.save.settings;
    if (this.rig) { this.rig.sens = s.mouseSens ?? 1; this.rig.invertY = !!s.invertY; }
    // A phone or tablet starts on lighter settings, once per browser; Settings can raise them again
    const TUNED = 'everrealm.phoneTuned';
    let tuned = true;
    try { tuned = !!localStorage.getItem(TUNED); } catch { /* storage blocked: leave the settings be */ }
    if (!tuned && matchMedia('(pointer: coarse)').matches) {
      s.viewDist = Math.min(s.viewDist, 5);
      s.renderScale = Math.min(s.renderScale, 0.75);
      s.shadows = false;
      try { localStorage.setItem(TUNED, '1'); } catch { /* as above */ }
    }
    this.audio.volumes = { master: s.master, sfx: s.sfx, ambience: s.ambience, music: s.music };
    this.audio.applyVolumes();
    this.renderer.shadowMap.enabled = s.shadows;
    if (this.world) this.world.chunks.viewRadius = s.viewDist;
    if (this.world) this.world.sky.sun.castShadow = s.shadows;
    this.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && 'needsUpdate' in m) m.needsUpdate = true; });
  }

  persist(): void {
    if (this.mode !== 'play' || this.restoring) return;
    // A named piece the realm numbered for you while your pack was full
    const owed = this.flag('uPending') as string[] | undefined;
    if (owed?.length && this.inv.freeSlots() > 0 && this.give(owed[0])) this.setFlag('uPending', owed.slice(1));
    const p = this.player.position;
    this.save.pos = this.dungeons?.savePos() ?? [p.x, p.y, p.z];
    this.save.yaw = this.player.yaw;
    this.save.hour = this.world.sky.hour;
    this.save.hp = this.hp;
    this.save.explored = this.world.exploredKeys();
    writeSave(this.save, saveKeyFor(this.charId ?? 'main'));
    this.hasSave = true;
    this.online?.save(this.save);
    uploadSave(this.save);
  }

  // =================================================================== UI context
  private uiCtx() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const g = this;
    return {
      get save() { return g.save; },
      get inv() { return g.inv; },
      get inMenu() { return g.mode !== 'play'; },
      get mapImage() { return g.world?.mapImage ?? document.createElement('canvas'); },
      get currentStation() { return g.currentStation; },
      level: (s: SkillId) => g.level(s),
      useSlot: (i: number) => g.useSlot(i),
      daily: () => g.dailies.view(),
      festival: () => ({ ...g.festivals.view(), extra: g.seasons.journal() }),
      trade: () => g.social.ui(),
      tradeAdd: (id: string) => g.social.add(id),
      tradeRemove: (i: number) => g.social.remove(i),
      tradeMarks: (n: number) => g.social.setMarks(n),
      tradeLock: () => g.social.lock(),
      tradeAccept: () => g.social.accept(),
      tradeCancel: () => g.social.cancel(),
      exchange: () => g.exchange.view(),
      exBuy: (id: number) => g.exchange.buy(id),
      exPost: (item: string, n: number, price: number) => g.exchange.post(item, n, price),
      exTakeBack: (id: number) => g.exchange.takeBack(id),
      exReload: () => g.exchange.open(),
      mail: () => g.mail.view(),
      mailDo: (what: 'read' | 'back' | 'write' | 'reply' | 'attach' | 'send' | 'take' | 'delete' | 'return' | 'reload', id?: number, item?: string, n?: number) => {
        if (what === 'read' && id !== undefined) g.mail.read(id);
        else if (what === 'back') g.mail.back();
        else if (what === 'write') g.mail.write();
        else if (what === 'reply' && id !== undefined) g.mail.reply(id);
        else if (what === 'attach' && item) g.mail.attach(item, n ?? 1);
        else if (what === 'send') g.mail.send();
        else if (what === 'take' && id !== undefined) g.mail.takeFrom(id);
        else if (what === 'delete' && id !== undefined) g.mail.remove(id);
        else if (what === 'return' && id !== undefined) g.mail.sendBack(id);
        else if (what === 'reload') g.mail.open();
      },
      music: () => g.music.view(),
      musicDo: (what: 'take' | 'away' | 'play' | 'stop' | 'part' | 'strike', arg?: string) => {
        if (what === 'take' && arg) { if (g.music.out?.item === arg) g.music.away(); else g.music.take(arg); }
        else if (what === 'away') g.music.away();
        else if (what === 'play' && arg) g.music.play(arg);
        else if (what === 'stop') g.music.stop();
        else if (what === 'part' && arg) g.music.pickPart(arg as PartId);
        else if (what === 'strike' && arg) g.music.strikeUp(arg);
        g.hud.refresh('music');
      },
      finder: () => g.dungeons.view(),
      finderDo: (what: 'role' | 'hench' | 'find' | 'now' | 'cancel' | 'leave' | 'vet' | 'rhench' | 'rfind', id?: string) => {
        let why: string | null = null;
        if (what === 'vet') g.dungeons.setVet(id === '1');
        if (what === 'role' && (id === 'tank' || id === 'healer' || id === 'damage')) g.dungeons.setRole(id);
        else if (what === 'hench' && id) why = g.dungeons.goWithHenchmen(id);
        else if (what === 'rhench') why = g.dungeons.random('hench');
        else if (what === 'rfind') why = g.dungeons.random('find');
        else if (what === 'find' && id) why = g.dungeons.findGroup(id);
        else if (what === 'now') g.dungeons.goNow();
        else if (what === 'cancel') g.dungeons.unqueue();
        else if (what === 'leave') g.dungeons.leave();
        if (why) g.hud.system(why);
        g.hud.refresh('finder');
        return why;
      },
      guild: () => ({ view: g.social.guild, online: g.online.status === 'online' }),
      friends: () => {
        // Where friends are: asked of the realm again now and then while the list is open
        if (g.online.status === 'online' && g.elapsed - g.friendsAsked > 10) { g.friendsAsked = g.elapsed; g.social.watch(); }
        return {
        online: g.online.status === 'online',
        rows: g.social.friendRows().map((r) => ({ name: r.name, online: r.online, where: r.online && r.x !== undefined && (r.x !== 0 || r.z !== 0) ? REGION_INFO[regionAt(r.x, r.z!).a].name : null })),
        };
      },
      friendDo: (what: 'add' | 'remove' | 'whisper' | 'invite', name: string) => {
        if (what === 'add') g.social.addFriend(name);
        else if (what === 'remove') g.social.removeFriend(name);
        else if (what === 'invite') g.social.invite(name);
        else { g.hud.close('guild'); g.hud.openChat((t) => g.say(t), `/w ${name} `); }
      },
      groupDo: (what: 'leave' | 'promote' | 'kick' | 'whisper', name?: string) => {
        if (what === 'leave' && !g.social.inGroup && g.dungeons.active) g.dungeons.leave();
        else if (what === 'leave') g.social.leave();
        else if (what === 'promote' && name) g.social.promote(name);
        else if (what === 'kick' && name) g.social.kick(name);
        else if (what === 'whisper' && name) g.hud.openChat((t) => g.say(t), `/w ${name} `);
      },
      groupLeader: () => !!g.social.group && g.social.group.leader === g.online.myId,
      guildDo: (what: 'found' | 'leave' | 'kick' | 'rank' | 'motto', a?: string, b?: string) => {
        if (what === 'found') g.social.guildFound(a ?? '', b ?? '');
        else if (what === 'leave') g.social.guildLeave();
        else if (what === 'kick') g.social.guildKick(a ?? '');
        else if (what === 'rank') g.social.guildRank(a ?? '', (b ?? 'member') as 'leader' | 'officer' | 'member');
        else g.social.guildMotto(a ?? '');
      },
      claimLogin: () => { g.dailies.claimLogin(); g.hud.refresh(); },
      standing: () => g.standingView(),
      library: () => SHELVES.map((shelf) => ({ shelf, books: LORE_BOOKS.filter((b) => b.shelf === shelf).map((b) => ({ id: b.id, title: b.title, where: b.where, read: !!g.flag('book:' + b.id) })) })),
      readBook: (id: string) => { const b = BOOK_BY_ID[id]; if (b && g.flag('book:' + id)) g.books.open(b); },
      factions: () => FACTIONS.map((f) => {
        const r = factionRank(g, f.id);
        const nextQ = f.storyline.find((q) => g.stage(q) !== 'done');
        const cur = nextQ ? g.stage(nextQ) : undefined;
        const next = !nextQ ? null : cur ? `Under way: "${QUESTS[nextQ]?.name ?? nextQ}". See its page in the journal.` : `Next: "${QUESTS[nextQ]?.name ?? nextQ}". Ask at the hall.`;
        return { id: f.id, name: f.name, where: f.where, blurb: f.blurb, join: f.join, rank: r >= 0 ? f.ranks[r] : null, rankIdx: r, ranks: f.ranks, next, open: f.open };
      }),
      feats: () => {
        const api = g.featApi();
        const worn = g.flag('title');
        return FEATS.map((f) => ({ id: f.id, name: f.name, group: f.group, desc: f.desc, have: f.have(api), need: f.need, done: !!g.flag('feat:' + f.id), marks: f.marks, title: f.title, worn: worn === f.id }));
      },
      calling: () => g.calling,
      setCalling: (id: CallingId) => g.setCalling(id),
      talents: () => g.talentView(),
      callingFree: () => !g.flag('callingSet'),
      apprentice: () => { const a = g.apprentice; return a ? { name: a.name, master: MASTER_OF[a.id]?.name ?? '' } : null; },
      bar: () => ({ chosen: g.kit.bar.slice(2, 4).map((s) => s.id), pool: [...g.kit.calling.utilities, ...crossUtilities(g.apprentice)], cross: crossUtilities(g.apprentice).map((s) => s.id), signature: g.kit.calling.skills[1], heal: g.kit.calling.skills[0], elite: g.kit.calling.skills[2], weapon: g.kit.weaponSkill }),
      setUtilities: (ids: string[]) => g.setUtilities(ids),
      learnTalent: (id: string) => g.learnTalent(id),
      resetTalents: () => g.resetTalents(),
      wearTitle: (id: string | null) => { g.setFlag('title', id); g.hud.setTitle(id ? FEATS.find((f) => f.id === id)?.title ?? null : null); },
      unequip: (slot: keyof Equip) => g.unequip(slot),
      armourSummary: () => g.armourSummary(),
      packInfo: () => g.packInfo(),
      togglePack: () => g.togglePack(),
      dropSlot: (i: number) => g.dropSlot(i),
      craft: (r: string, n: number) => g.startCraft(r, n),
      buy: (item: string) => g.buy(item),
      sell: (slot: number) => g.sell(slot),
      quests: () => g.questEntries(),
      dialogueChoose: (i: number) => g.chooseOption(i),
      settingsChanged: () => g.applySettings(),
      sfx: (n: 'click' | 'open' | 'close') => g.sfx(n),
      resetSave: () => { if (g.charId) deleteCharacter(g.charId); location.reload(); },
      ability: (i: number) => g.useAbility(i),
      emote: (id: string) => g.doEmote(id),
      say: (t: string) => g.say(t),
      mapMarkers: () => g.mapMarkers(true),
      waymarkFare: (id: string) => g.waymarkFareTo(id),
      travelWaymark: (id: string) => g.travelWaymark(id),
      shop: () => g.shopView(),
      travel: () => g.travelView(),
      travelTo: (id: string) => g.travelTo(id),
    };
  }

  // =================================================================== Menus
  private frontCtx(): FrontCtx {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const g = this;
    const summary = (id: string, s: SaveData): CharSummary => {
      fixSave(s); // (a character from the realm server may predate a change)
      const total = SKILLS.reduce((a, k) => a + levelForXp(s.xp[k.id] ?? 0, k.id), 0);
      const level = levelForXp(s.xp.melee ?? 0, 'melee');
      const calling = callingById(s.flags?.class)?.name ?? 'Warden';
      const dyes = Object.keys(s.flags ?? {}).filter((k) => k.startsWith('dye:')).map((k) => k.slice(4));
      const hats = Object.keys(s.flags ?? {}).filter((k) => k.startsWith('hat:')).map((k) => k.slice(4));
      const capes = Object.keys(s.flags ?? {}).filter((k) => k.startsWith('capeD:')).map((k) => k.slice(6));
      const costumes = Object.keys(s.flags ?? {}).filter((k) => k.startsWith('costume:')).map((k) => k.slice(8));
      return { id, name: s.name, look: s.look, origin: s.origin ?? null, level, total, calling, place: REGION_INFO[regionAt(s.pos[0], s.pos[2]).a].name, playTime: s.playTime, dyes, hats, capes, costumes };
    };
    return {
      characters: () => listCharacters().map((c) => summary(c.id, c.save)),
      maxCharacters: MAX_CHARACTERS,
      selected: () => g.charId,
      select: (id) => g.selectCharacter(id),
      enter: (id) => { g.selectCharacter(id); if (g.charId) setLastPlayed(g.charId); g.front.hide(); g.startPlay(); },
      deleteCharacter: (id) => {
        const gone = listCharacters().find((c) => c.id === id);
        if (gone) void deleteRemote(gone.save.name);
        deleteCharacter(id);
        if (id === g.charId) g.selectCharacter(listCharacters()[0]?.id ?? null);
      },
      create: (name, look, origin, calling) => g.newGame(name, look, origin, calling),
      restyle: (id, look) => {
        // A new look for a character already made: saved here and sent up to the account
        const c = listCharacters().find((x) => x.id === id);
        if (!c) return;
        c.save.look = look;
        writeSave(c.save, saveKeyFor(id));
        void uploadSave(c.save, true);
        g.previewLook(null);
        g.charId = null;
        g.selectCharacter(id);
        g.front.showSelect();
      },
      preview: (look) => {
        if (look) { g.previewSpin = g.mode === 'creator' ? g.previewSpin : 0; g.previewLook(look, 'creator'); } else g.previewLook(null);
      },
      creatorView: (v) => { g.creatorView = v; },
      spin: (r) => { g.previewSpin += r; },
      realmUrl: serverUrl(),
      account: () => currentAccount()?.user ?? null,
      signIn: async (user, pass, create) => {
        const err = await signIn(user, pass, create);
        if (!err) await g.syncAccount();
        return err;
      },
      signOut: async () => { await signOut(); },
      openSettings: () => g.hud.toggle('settings'),
      sfx: (n) => g.sfx(n),
      skipIntro: () => g.endIntro(),
    };
  }

  /**
   * Bring the account's characters into this browser and send up the ones only this browser has.
   * A character in both places keeps whichever copy has been played longer.
   */
  async syncAccount(): Promise<void> {
    const remote = await remoteCharacters();
    if (!remote) return;
    const local = listCharacters();
    for (const r of remote) {
      if (!r.save) continue;
      const mine = local.find((c) => c.save.name.toLowerCase() === r.name.toLowerCase());
      if (!mine) {
        if (listCharacters().length >= MAX_CHARACTERS) continue;
        const id = newCharacterId();
        writeSave(r.save, saveKeyFor(id));
        rememberCharacter(id);
      } else if (r.save.playTime > mine.save.playTime + 1) writeSave(r.save, saveKeyFor(mine.id));
    }
    for (const c of local) if (!remote.some((r) => r.name.toLowerCase() === c.save.name.toLowerCase())) await uploadSave(c.save, true);
    if (this.mode !== 'play') { const keep = this.charId ?? listCharacters()[0]?.id ?? null; this.charId = null; this.selectCharacter(keep); if (this.front.active === 'select') this.front.showSelect(); }
  }

  /** Character select over the vale, with the last-played character standing in the square. */
  private showMenu(): void {
    if (currentAccount()) void this.syncAccount();
    this.hud.hideTitle();
    this.hud.setHudHidden(true);
    this.selectCharacter(this.charId);
    // The front page the first time; straight to the characters after that (leaving the world)
    if (!this.homeShown) { this.homeShown = true; this.front.showHome(); } else this.front.showSelect();
  }
  private homeShown = false;
  /** A character to go straight into once the world is built (back from a crossing). */
  private autoEnter: string | null = null;

  /** Load a character from the roster into this.save and stand them in the scene. */
  private selectCharacter(id: string | null): void {
    const c = id ? listCharacters().find((x) => x.id === id) : undefined;
    if (!c) {
      this.charId = null;
      this.hasSave = false;
      this.previewLook(null);
      return;
    }
    if (c.id !== this.charId || this.mode !== 'title' || !this.previewModel) {
      const settings = this.save.settings;
      this.charId = c.id;
      this.save = c.save;
      fixSave(this.save);
      // Volume and graphics are the browser's, not the character's: keep them across a switch.
      this.save.settings = settings;
      this.inv = new Inventory(this.save);
      this.hasSave = true;
      this.player.setAppearance(this.save.look, this.scene);
      this.player.model.root.visible = false;
      this.previewLook(this.save.look, 'title');
    }
  }

  private previewLook(look: Appearance | null, mode: 'title' | 'creator' = 'creator'): void {
    if (this.previewModel) { this.scene.remove(this.previewModel.root); this.previewModel = null; }
    if (!this.world) return;
    this.mode = look ? mode : 'title';
    if (!look) return;
    this.previewModel = new Humanoid(look);
    // Armed on the select screen; empty-handed in the creator, where the sword hides the face.
    this.previewModel.setHeld(mode === 'title' ? 'sword' : 'none');
    this.previewModel.root.position.set(STAGE.x, 19, STAGE.z);
    this.scene.add(this.previewModel.root);
  }

  /** The character's calling (characters made before callings start as Wardens until they choose). */
  get calling(): CallingId { return callingById(this.flag('class'))?.id ?? 'warden'; }

  /** The calling you're apprenticed to (data/content/masters.ts), if any and if it isn't your own. */
  private get apprentice(): CallingDef | null {
    const a = this.flag('apprentice') as CallingId | undefined;
    return a && a !== this.calling ? callingById(a) ?? null : null;
  }
  private appliedApprentice: unknown = undefined;

  private applyCalling(): void {
    this.kit.set(this.calling);
    this.kit.setTalents(this.learned());
    this.kit.setUtilities(this.flag('bar:' + this.calling), this.apprentice);
    this.appliedApprentice = this.flag('apprentice');
    this.kit.weapon = weaponLine(this.blade?.speed);
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill);
  }

  /** Choose the two utilities beside the signature (from the calling's other three). */
  setUtilities(ids: string[]): string | null {
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    this.setFlag('bar:' + this.calling, ids.slice(0, 2));
    this.kit.setUtilities(ids, this.apprentice);
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill);
    this.persist();
    return null;
  }

  // =================================================================== Talents (data/talents.ts)
  /** The talents learned for the current calling. */
  private learned(): string[] {
    const v = this.flag('talents:' + this.calling);
    return Array.isArray(v) ? (v as string[]).filter((id) => TALENTS[id]?.calling === this.calling) : [];
  }

  /** Learn a talent; returns why not, or null. */
  learnTalent(id: string): string | null {
    const have = this.learned();
    const why = canLearn(id, have, this.calling, this.level('melee'));
    if (why) return why;
    this.setFlag('talents:' + this.calling, [...have, id]);
    this.kit.setTalents(this.learned());
    this.sfx('levelUp', 0.6);
    this.persist();
    return null;
  }

  /** Unlearn every talent of the current calling, for nothing: only out of a fight. */
  resetTalents(): string | null {
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    this.setFlag('talents:' + this.calling, []);
    this.kit.setTalents([]);
    this.persist();
    return null;
  }

  /** What the Calling page shows of the trees. */
  talentView() {
    const have = this.learned(), lvl = this.level('melee');
    return {
      points: pointsAt(lvl) - spent(have), total: pointsAt(lvl),
      trees: TREES[this.calling].map((t) => ({
        name: t.name, desc: t.desc,
        spent: spent(have, t.id), gate: TIER_GATE, bar: t.bar.map((u) => this.kit.calling.utilities.find((s) => s.id === u)?.name ?? u),
        talents: t.talents.map((d) => ({ id: d.id, name: d.name, desc: d.desc, tier: d.tier, ranks: d.ranks, rank: rankOf(d.id, have), capstone: !!d.capstone, why: canLearn(d.id, have, this.calling, lvl) })),
      })),
    };
  }

  /** Change calling: only out of a fight. Returns why not, or null. */
  setCalling(id: CallingId): string | null {
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    const c = callingById(id);
    if (!c) return 'No such calling.';
    // A calling is for life, as in WoW and ESO. Characters made before that keep one change.
    if (this.mode === 'play' && this.flag('callingSet')) return 'Your calling is yours for life. To learn another\'s skills, apprentice yourself to one of its masters from level 25.';
    if (this.mode === 'play') this.setFlag('callingSet', 1);
    this.setFlag('class', id);
    this.applyCalling();
    if (this.mode === 'play') {
      this.hud.banner(c.name, c.role, true);
      this.particles.burst(tmpV.copy(this.player.position).setY(this.player.position.y + 1), c.mechanic.color, 24);
      this.sfx('discover');
    }
    return null;
  }

  private newGame(name: string, look: Appearance, origin: string, calling: CallingId = 'warden'): void {
    this.online.disconnect(); // the new character connects under its own name once it is in the world
    const settings = this.save.settings;
    this.charId = newCharacterId();
    this.save = newSave(name, look);
    this.save.settings = settings;
    this.save.origin = origin;
    this.save.flags.class = calling;
    this.save.flags.callingSet = 1; // chosen at creation, for life
    // A Pathfinder starts with a hunting bow from the Hollin smithy, the old sword in the pack beside it
    if (calling === 'pathfinder' && ITEMS.w_hollin_bow) { this.save.equip.weapon = 'w_hollin_bow'; const slot = this.save.inv.indexOf(null); if (slot >= 0) this.save.inv[slot] = { id: 'worn_sword', n: 1 }; }
    const o = originById(origin);
    if ('marks' in o.start) this.save.marks += o.start.marks;
    else this.save.xp[o.start.skill] = xpForLevel(o.start.level, o.start.skill);
    this.inv = new Inventory(this.save);
    (this.hud as unknown as { ctx: unknown }).ctx = this.uiCtx();
    writeSave(this.save, saveKeyFor(this.charId));
    setLastPlayed(this.charId);
    this.hasSave = true;
    this.previewLook(null);
    this.front.hide();
    this.player.setAppearance(look, this.scene);
    this.startPlay(true);
  }

  // =================================================================== Arrival intro
  private beginIntro(): void {
    this.startPending = null;
    this.mode = 'intro';
    this.hud.hideTitle();
    this.hud.setHudHidden(true);
    this.hud.setCinema(true, true);
    this.dress();
    this.player.model.root.visible = true;
    this.player.yaw = this.save.yaw;
    // A new character's first time: the storybook of the land, then down the Wend into Hollin Ford
    const flyover = () => { if (this.mode !== 'intro') return; this.intro = { t: 0, shot: -1 }; this.front.showIntro(); };
    if (this.flag('prologueSeen')) { flyover(); return; }
    this.setFlag('prologueSeen', 1);
    this.intro = null;
    this.front.showPrologue(flyover);
  }

  private endIntro(): void {
    if (this.mode !== 'intro') return;
    this.intro = null;
    this.hud.setCinema(false, true);
    this.front.hide();
    this.finishStart(true);
  }

  /** One frame of the intro: which shot, where the camera is on it, and the fades between shots. */
  private introFrame(dt: number): void {
    const it = this.intro!;
    it.t += dt;
    let acc = 0, i = 0;
    while (i < INTRO.length && it.t > acc + INTRO[i].seconds) { acc += INTRO[i].seconds; i++; }
    if (i >= INTRO.length) { this.endIntro(); return; }
    const shot = INTRO[i];
    const local = it.t - acc;
    if (i !== it.shot) {
      it.shot = i;
      this.front.caption(shot.kicker, typeof shot.text === 'function' ? shot.text(originById(this.save.origin)) : shot.text);
    }
    const k = THREE.MathUtils.smootherstep(local / shot.seconds, 0, 1);
    const lerp3 = (a: [number, number, number], b: [number, number, number]) => new THREE.Vector3(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
    this.camera.position.copy(lerp3(shot.from.at, shot.to.at));
    this.camera.lookAt(lerp3(shot.from.look, shot.to.look));
    // Fade up from black at the start, dip to black between shots, and hold the last shot clear.
    const last = i === INTRO.length - 1;
    const fadeIn = i === 0 ? 1 - local / 1.6 : 1 - local / 0.6;
    const fadeOut = last ? 0 : (local - (shot.seconds - 0.6)) / 0.6;
    this.front.fade(THREE.MathUtils.clamp(Math.max(fadeIn, fadeOut), 0, 1));
  }

  private startPending: { fresh: boolean } | null = null;

  private startPlay(fresh = false, title = 'Finding your feet…'): void {
    if (!this.world || this.startPending) return;
    // A character in the other land: reload into that land, and come straight back to them
    if (!LAND_FORCED && (this.save.land ?? 'counties') !== LAND) { this.switchLand(this.save.land ?? 'counties'); return; }
    this.previewLook(null);
    this.front.hide();
    const [sx, , sz] = this.save.pos;
    this.player.teleport(this.save.pos[0], this.save.pos[1], this.save.pos[2]);
    // Explored chunks are saved by chunk key, and a key depends on the world's size: convert saves
    // from before the world grew past 0, and from before the outer lands
    if (!this.flag('mapV2')) { this.save.explored = this.save.explored?.map(legacyChunkKey); this.setFlag('mapV2'); this.setFlag('mapV3'); }
    else if (!this.flag('mapV3')) { this.save.explored = this.save.explored?.map(v2ChunkKey); this.setFlag('mapV3'); }
    if (this.save.explored?.length) this.world.chunks.queueMapTiles(this.save.explored);
    const worn = this.flag('title') as string | undefined;
    this.hud.setTitle(worn ? FEATS.find((f) => f.id === worn)?.title ?? null : null);
    this.startPending = { fresh };
    this.hud.showTitle(title);
    void sx; void sz;
  }

  /**
   * Go to the other land (world/land.ts): the page reloads into it behind a loading screen, and then
   * goes straight into this character there. The save already holds where they arrive.
   */
  switchLand(land: LandId, title = land === 'morrow' ? 'Crossing to Morrow…' : 'Crossing to the Counties…'): void {
    this.save.land = land === 'counties' ? undefined : land;
    this.persist();
    if (this.mode === 'play') uploadSave(this.save, true);
    this.online.save(this.save, true);
    setNextLand(land);
    try { sessionStorage.setItem(ENTER_KEY, this.charId ?? 'main'); } catch { /* the menu, then */ }
    this.restoring = true;
    this.hud.showTitle(title);
    setTimeout(() => location.reload(), 500);
  }

  /** Called once the chunks around the player are generated and meshed. */
  private finishStart(fresh: boolean): void {
    this.startPending = null;
    this.mode = 'play';
    this.hud.hideTitle();
    this.fitPack();
    // A torch for everyone (it comes out after dark); given once to characters made before torches
    if (!this.flag('gotTorch')) { if (this.inv.count('torch') > 0 || this.give('torch', 1)) this.setFlag('gotTorch', true); }
    // What the account owns from the store, to this character (once each; the server says what's owned)
    void storeOwned().then((owned) => {
      for (const id of owned ?? []) {
        if (!ITEMS[id] || this.flag('store:' + id)) continue;
        if (this.give(id, 1)) { this.setFlag('store:' + id, true); this.hud.system(`From the Everrealm store: ${ITEMS[id].name}. Thank you for keeping the lights on.`); }
      }
    });
    // In from the sea, if you came by the packet: her deck until she's tied up, then the quay
    if (this.flag('voyage') === LAND) {
      this.setFlag('voyage', null);
      const at = [...this.save.pos] as [number, number, number], yaw = this.save.yaw;
      this.rig.yaw = HARBOURS[LAND].heading;
      this.voyage.arrive(HARBOURS[LAND], () => { this.player.teleport(at[0], at[1], at[2]); this.player.yaw = yaw; this.hud.banner(LAND === 'morrow' ? 'Callis' : 'Gullmouth', 'Ashore'); });
    }
    this.dress();
    this.player.model.root.visible = true;
    this.player.yaw = this.save.yaw;
    this.rig.yaw = this.save.yaw + Math.PI;
    // Never start the game stuck inside something built since the save
    this.player.standClear();
    this.rig.snap(this.player.position);
    this.hp = Math.min(this.maxHp, Math.max(1, this.save.hp));
    for (const n of this.npcs) n.placed = false;
    // Old Notch stays dead across sessions.
    for (const e of this.enemies) if (e.def.type === 'notch' && this.flag('notchKilled')) { e.hp = 0; e.state = 'dead'; e.respawnIn = Infinity; e.model.root.visible = false; }
    // A pour interrupted by closing the tab finishes off-screen.
    if (this.stage('fordBell') === 'casting') this.save.quests.fordBell = 'report';
    this.world.structures.bell.visible = ['report', 'done'].includes(this.stage('fordBell') ?? '');
    this.hud.setPortrait(this.save.look);
    this.applyCalling();
    this.festivals.greet(fresh);
    if (!this.flag('class')) {
      // Characters from before callings: show them the choice once (they play as Wardens until they pick)
      this.setFlag('class', 'warden');
      this.hud.system('Callings have come to the Charter Counties. Choose how you fight in the journal (J): you can change it any time out of a fight.');
      setTimeout(() => this.hud.openJournalAt('calling'), 1200);
    }
    this.audio.unlock();
    this.hud.setTracker(this.questEntries());
    if (this.online.enabled && this.online.status === 'off') this.online.connect(this.save.name, this.wornLook(), this.save.playTime);
    // The day's login reward, waiting in the journal. A new character gets to see the world first;
    // someone coming back gets the journal opened for them, as long as nothing else is on screen.
    if (this.dailies.loginReady) setTimeout(() => {
      if (this.mode !== 'play' || !this.dailies.loginReady) return;
      this.hud.setJournalAlert(true);
      this.hud.system('A login reward is waiting in your journal (J), under Daily round.');
      if (!fresh && this.save.playTime > 600 && !this.dialogue && !this.hud.anyOpen()) this.hud.openJournalAt('login');
    }, fresh ? 30000 : 2500);
    if (this.arriving) {
      this.hud.banner(this.arriving, this.arrivingBy === 'waymark' ? 'By waymark' : this.arrivingBy === 'dungeon' ? this.arrivingSub : 'The post cart sets you down');
      this.arriving = null;
    }
    if (fresh) {
      this.hud.banner('Hollin Ford', 'Hollindale');
      this.currentRegion = 'hollin';
      if (!this.save.discovered.includes('hollin')) this.save.discovered.push('hollin');
      const touch = document.body.classList.contains('touch');
      setTimeout(() => this.hud.system(touch ? 'The stick on the left moves you. Drag anywhere else to look around.' : 'WASD to move. Drag the mouse to look around.'), 1500);
      setTimeout(() => this.hud.system(touch ? 'People with a gold ! have something to say. Tap the prompt, or Use, to talk.' : 'People with a gold ! have something to say. Press E to talk.'), 5000);
    }
    this.persist();
  }

  // =================================================================== Inventory actions
  private useSlot(i: number): void {
    const st = this.save.inv[i];
    if (!st) return;
    const def = ITEMS[st.id];
    if (def.furn) { this.hud.system(this.home.owned ? 'Furniture goes down at home: press E inside Wendside Cottage and choose Arrange the furniture.' : 'Furniture needs a house to go in. There\'s a cottage for sale on the road east of Hollin Ford.'); return; }
    if (def.kind === 'food') this.eat(st.id);
    else if (def.weapon) {
      const old = this.save.equip.weapon;
      this.inv.removeAt(i, 1);
      this.save.equip.weapon = st.id;
      if (old) this.inv.add(old, 1);
      this.hud.system(`Equipped ${def.name}.`);
      this.sfx('pickup');
    } else if (def.armor) {
      const slot = def.armor.slot;
      const old = this.save.equip[slot] ?? null;
      this.inv.removeAt(i, 1);
      this.save.equip[slot] = st.id;
      if (old) this.inv.add(old, 1);
      this.hp = Math.min(this.hp, this.maxHp);
      this.dress();
      this.sfx('equip');
      this.hud.system(`Equipped ${def.name}.`);
      this.sfx('pickup');
    } else if (def.instrument) {
      this.hud.toggle('inv');
      if (this.music.out?.item === st.id) this.music.away();
      else { this.cancelActions(); this.emote = null; this.music.take(st.id); this.hud.show('music'); }
    } else if (def.mount) {
      this.hud.toggle('inv');
      this.toggleMount(st.id);
    } else if (def.dye) {
      // A dye joins the wardrobe for good: the item is used up
      this.inv.removeAt(i, 1);
      this.setFlag('dye:' + def.dye.color, def.dye.name);
      this.hud.banner(def.dye.name, 'Added to your wardrobe', true);
      this.hud.system(`${def.dye.name} is in your wardrobe now: pick it from any cloth swatch with Change look, on the character screen.`);
      this.sfx('discover');
    } else if (def.bag) {
      // A festival bag: opened from the pack (game/Seasons.ts)
      this.inv.removeAt(i, 1);
      const what = this.seasons.openBag(st.id);
      if (what) this.hud.system(what);
      this.sfx('pickup');
    } else if (def.pack) {
      // A bigger pack: strapped on for good, the old one left behind
      const have = Number(this.flag('packSlots') ?? 0);
      if (def.pack.slots <= have) { this.hud.system(`Your pack already holds more than the ${def.name.toLowerCase()} would.`); return; }
      this.inv.removeAt(i, 1);
      this.setFlag('packSlots', def.pack.slots);
      this.setFlag('packLook', def.pack.look);
      this.fitPack();
      this.hud.banner(def.name, `${INV_SIZE + def.pack.slots} slots in your pack now`, true);
      this.sfx('equip');
      this.hud.refresh();
    } else if (def.capeDesign) {
      this.inv.removeAt(i, 1);
      this.unlockCape(def.capeDesign);
    } else if (def.costume) {
      // A costume joins the wardrobe for good
      this.inv.removeAt(i, 1);
      this.setFlag('costume:' + def.costume, 1);
      this.hud.banner(def.name, 'Added to your wardrobe', true);
      this.hud.system(`${def.name} is in your wardrobe now: put it on under Costume with Change look, on the character screen. It goes over your clothes and armour.`);
      this.sfx('discover');
    } else if (def.hat) {
      // A festival hat joins the wardrobe for good
      this.inv.removeAt(i, 1);
      this.setFlag('hat:' + def.hat, 1);
      this.hud.banner(def.name, 'Added to your wardrobe', true);
      this.hud.system(`${def.name} is in your wardrobe now: pick it under Headwear with Change look, on the character screen.`);
      this.sfx('discover');
    } else if (st.id === 'wren_whistle') {
      this.sfx('whistle');
    }
    this.hud.refresh();
  }

  private unequip(slot: keyof Equip): void {
    const id = this.save.equip[slot];
    if (!id) return;
    if (!this.inv.canAdd(id)) { this.hud.system('Your pack is full.'); return; }
    this.inv.add(id);
    this.save.equip[slot] = null;
    this.hp = Math.min(this.hp, this.maxHp);
    if (slot !== 'weapon') this.dress();
    this.hud.refresh();
  }

  private dropSlot(i: number): void {
    const st = this.save.inv[i];
    if (!st) return;
    const def = ITEMS[st.id];
    if (def.kind === 'quest' || def.kind === 'collectible' || def.kind === 'trophy' || def.rarity === 'rare') {
      if (!confirm(`Drop ${def.name}? It will be gone for good.`)) return;
    }
    this.inv.removeAt(i, st.n);
    this.hud.system(`Dropped ${def.name}.`);
    this.hud.refresh();
  }

  private shopView(): ShopView {
    const shop = SHOPS[this.currentShop];
    const owner = NPCS.find((n) => n.id === shop.owner);
    // Standing in the trader's region takes a share off (not off festival tokens)
    const where = owner ? regionAt(owner.schedule[0].at[0], owner.schedule[0].at[1]).a : null;
    const off = where && !shop.currency ? this.standingOff(where) : 0;
    return {
      name: shop.name,
      who: shop.who ?? (owner ? owner.name.split(' ')[0] : shop.name),
      stock: shop.stock.filter((x) => !x.when || x.when(this)).map((x) => ({ item: x.item, price: Math.max(1, Math.round(shopPrice(this, shop, x.price) * (1 - off))) })),
      sellPrice: (id: string) => shopBuyPrice(this, shop, id),
      footer: shop.footer(this) + (off ? ` · ${rankFor(Number(this.flag('rep:' + where) ?? 0)).rank.name} in ${REGION_INFO[where!].name}: ${Math.round(off * 100)}% off` : ''),
      currency: shop.currency ? { id: shop.currency, name: FESTIVALS.find((f) => f.token === shop.currency)?.tokenPlural ?? ITEMS[shop.currency].name, have: this.inv.count(shop.currency) } : undefined,
    };
  }

  private buy(item: string): void {
    const view = this.shopView();
    const s = view.stock.find((x) => x.item === item);
    if (!s) return;
    if (view.currency) {
      if (view.currency.have < s.price) return;
      if (!this.inv.canAdd(item)) { this.hud.system('Your pack is full.'); return; }
      this.inv.remove(view.currency.id, s.price);
      this.give(item, 1);
      this.sfx('coin');
      this.hud.refresh();
      return;
    }
    if (this.save.marks < s.price) return;
    if (!this.inv.canAdd(item)) { this.hud.system('Your pack is full.'); return; }
    if (ITEMS[item]?.mount && !this.mountPick.open) {
      // A mount: choose its coat and cloth before paying
      this.mountPick.show(item, `${s.price} marks`, true, (coat, cloth) => {
        if (this.save.marks < s.price || !this.inv.canAdd(item)) return;
        this.save.marks -= s.price;
        this.give(item, 1);
        this.setFlag('look:' + item, `${Math.min(9, coat)}${Math.min(9, cloth)}`);
        this.sfx('coin');
        this.hud.refresh();
      });
      return;
    }
    this.save.marks -= s.price;
    this.give(item, 1);
    this.sfx('coin');
    this.hud.refresh();
  }

  /** The look chooser for a mount on sale (ui/MountChooser.ts). */
  private _mountPick: MountChooser | null = null;
  private get mountPick(): MountChooser { return (this._mountPick ??= new MountChooser(this.renderer)); }

  private sell(slot: number): void {
    const st = this.save.inv[slot];
    if (!st) return;
    const def = ITEMS[st.id];
    const view = this.shopView();
    const price = view.sellPrice(st.id);
    if (def.kind === 'quest' || price <= 0) { this.hud.system(`${view.who} won't take that.`); return; }
    this.inv.removeAt(slot, 1);
    this.save.marks += price;
    this.sfx('coin');
    this.hud.refresh();
  }

  private eat(id?: string): void {
    if (this.cds.eat > 0 || this.dead) return;
    // A meal or a brew with lasting good is always welcome; plain food only when you're hurt
    if (this.hp >= this.maxHp && !(id && ITEMS[id]?.buff)) { this.hud.system('You\'re not hungry.'); return; }
    let best = id ?? null;
    if (!best) {
      let heal = 0;
      for (const st of this.save.inv) {
        const h = st ? ITEMS[st.id].heal ?? 0 : 0;
        if (h > heal) { heal = h; best = st!.id; }
      }
    }
    if (!best) { this.hud.system('You have nothing to eat.'); return; }
    const def = ITEMS[best];
    this.inv.remove(best, 1);
    if (def.buff) {
      this.setFlag('buff:' + def.buff.slot, { id: best, left: def.buff.mins * 60 });
      const parts = [def.buff.hp ? `${Math.round(def.buff.hp * 100)}% more health` : '', def.buff.regen ? `stamina back ${Math.round(def.buff.regen * 100)}% faster` : '', def.buff.power ? `blows ${Math.round(def.buff.power * 100)}% harder` : ''].filter(Boolean);
      this.hud.system(`${def.name}: ${parts.join(', ')}, for ${def.buff.mins} minutes.`);
    }
    this.hp = Math.min(this.maxHp, this.hp + (def.heal ?? 0));
    this.cds.eat = 1.5;
    this.sfx(/(_ale|_beer|_porter|_wine|_cider)$/.test(best) ? 'drink' : 'eat', 0.8);
    this.sfx('heal', 0.35);
    this.floatAt(this.player.position, 2.2, `+${def.heal}`, 'heal');
    this.hud.refresh('inv');
  }

  // =================================================================== Crafting
  private startCraft(id: string, count: number): void {
    const r = RECIPES.find((x) => x.id === id);
    if (!r || this.level(r.skill) < r.level) return;
    const can = Math.min(...Object.entries(r.inputs).map(([k, n]) => Math.floor(this.inv.count(k) / n)));
    if (can < 1) return;
    this.cancelActions();
    this.craftAction = { recipe: id, left: Math.min(count, can), t: 0, station: r.station };
    this.player.locked = true;
  }

  private updateCraft(dt: number): void {
    const c = this.craftAction;
    if (!c) return;
    const r = RECIPES.find((x) => x.id === c.recipe)!;
    c.t += dt;
    const st = this.stationAt(c.station);
    this.player.faceTowards(st.x, st.z);
    if (c.station === 'anvil') {
      this.anvilTimer -= dt;
      if (this.anvilTimer <= 0) {
        this.anvilTimer = 0.7;
        this.sfx('anvil');
        this.particles.sparks(tmpV.set(st.x, st.y + 0.2, st.z), 8);
      }
    } else if (c.station === 'furnace' && Math.random() < dt * 8) this.particles.fire(tmpV.set(st.x, st.y, st.z - 0.4));
    else if (c.station === 'hearth' && Math.random() < dt * 3) this.sfx('sizzle', 0.5);
    this.hud.setCast(`${ITEMS[r.output].name} (${c.left} left)`, c.t / r.time);
    if (c.t < r.time) return;
    c.t = 0;
    for (const [k, n] of Object.entries(r.inputs)) this.inv.remove(k, n);
    let out = r.output;
    if (r.failAtReq !== undefined) {
      const fail = Math.max(0, r.failAtReq - (this.level(r.skill) - r.level) * 0.05);
      if (Math.random() < fail) out = r.failItem!;
    }
    if (out === r.output) {
      this.give(out, r.count);
      this.addXp(r.skill, r.xp);
      if (c.station === 'furnace') this.particles.sparks(tmpV.set(st.x, st.y + 0.2, st.z), 16, '#ffd070');
    } else {
      this.give(out, 1);
      this.hud.system('You burnt it.');
      this.addXp(r.skill, Math.round(r.xp * 0.2));
    }
    c.left--;
    const can = Math.min(...Object.entries(r.inputs).map(([k, n]) => Math.floor(this.inv.count(k) / n)));
    if (c.left <= 0 || can < 1) {
      this.craftAction = null;
      this.player.locked = false;
      this.hud.setCast(null);
    }
    this.hud.refresh();
  }

  // =================================================================== Dialogue
  private startDialogue(npc: Npc): void {
    const tree = DIALOGUE[npc.id];
    if (!tree) return;
    this.cancelActions();
    this.hud.closeAll();
    npc.talking = true;
    this.dialogue = { npc, tree, node: '' };
    if (this.isStoryScene(npc.id)) this.hud.setCinema(true, true);
    this.player.faceTowards(npc.pos.x, npc.pos.z);
    this.enterNode(tree.start(this));
  }

  private enterNode(id: string): void {
    if (!this.dialogue) return;
    this.dialogue.node = id;
    const node = this.dialogue.tree.nodes[id];
    if (!node) { this.endDialogue(); return; }
    // Resolve the line before the node's effect runs, so a greeting can check a "met" flag the effect sets.
    this.dialogue.text = typeof node.text === 'function' ? node.text(this) : node.text;
    node.effect?.(this);
    if (!this.dialogue) return;
    this.renderNode(node);
  }

  private nodeOptions(node: DNode): { text: string; next?: string; effect?: (g: GameApi) => void; leave?: boolean }[] {
    const opts = (node.options ?? []).filter((o) => !o.cond || o.cond(this)).map((o) => ({
      text: typeof o.text === 'function' ? o.text(this) : o.text,
      next: o.next,
      effect: o.effect,
      leave: !o.next && !o.effect,
    }));
    if (!opts.length) opts.push(node.next ? { text: 'Continue', next: node.next, effect: undefined, leave: false } : { text: 'Leave', next: undefined, effect: undefined, leave: true });
    return opts;
  }

  private renderNode(node: DNode): void {
    const d = this.dialogue!;
    this.hud.showDialogue({
      speaker: d.npc.def.name,
      title: d.npc.def.title,
      text: d.text ?? (typeof node.text === 'function' ? node.text(this) : node.text),
      narrator: node.speaker === 'narrator',
      look: d.npc.def.look,
      options: this.nodeOptions(node).map((o) => ({ text: o.text, leave: o.leave })),
    });
    this.sfx('click');
  }

  private chooseOption(i: number): void {
    const d = this.dialogue;
    if (!d) return;
    const node = d.tree.nodes[d.node];
    const opt = this.nodeOptions(node)[i];
    if (!opt) return;
    opt.effect?.(this);
    if (!this.dialogue) return;
    if (opt.next) this.enterNode(opt.next);
    else this.endDialogue();
  }

  private endDialogue(): void {
    if (this.dialogue) this.dialogue.npc.talking = false;
    this.dialogue = null;
    this.hud.setCinema(false, true);
    this.hud.showDialogue(null);
    this.hud.setTracker(this.questEntries());
    this.persist();
  }

  // =================================================================== Quests
  questEntries(): QuestEntry[] {
    const out: QuestEntry[] = [];
    for (const [id, stage] of Object.entries(this.save.quests)) {
      const def = QUESTS[id];
      if (!def) continue;
      const objs = def.objectives(this, stage).map((o) => {
        const p = o.marker ? this.markerPos(o.marker) : null;
        return { text: o.text, done: o.done, dist: p ? Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) : undefined };
      });
      if (id === 'fordBell' && stage === 'casting' && this.casting) objs[0].text = `Wait while Bram pours the bell (${Math.ceil(this.casting.dur - this.casting.t)}s)`;
      out.push({ id, name: def.story ? `${ROMAN[def.story.chapter]}. ${def.name}` : def.name, notes: def.notes(this, stage), objectives: objs, done: stage === 'done', story: !!def.story });
    }
    // Breadcrumbs: where a new character starts, and where the main story starts once they've found their feet
    const lead = (id: string, name: string, notes: string, text: string, marker: string, story = false) => {
      const p = this.markerPos(marker);
      out.unshift({ id, name, notes, objectives: [{ text, dist: p ? Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) : undefined }], done: false, story });
    };
    if (!this.stage('fordBell')) lead('lead:hollin', 'Hollin Ford', 'The reeve runs the village from the square. If anyone needs a hand, she\'ll know.', 'Talk to Maud Ashby, the reeve, in the square', 'maud');
    else if (this.stage('fordBell') === 'done' && !this.stage('storyNotice')) lead('lead:story', 'The Charter\'s Debt', 'Everyone on the road is talking about a notice the Charter has posted by Ansbury\'s south gate.', 'Read the Charter notice by Ansbury\'s south gate', 'charterNotice', true);
    return out;
  }

  private markerPos(key: string): THREE.Vector3 | null {
    if (key.startsWith('ore:')) {
      const kind = key.slice(4);
      const P = this.player.position;
      let best: OreNode | null = null;
      let bd = Infinity;
      for (const o of this.world.layout.ores) {
        if (o.kind !== kind || o.depletedUntil) continue;
        const d = Math.hypot(o.x - P.x, o.z - P.z) + Math.abs(o.y - P.y) * 2;
        if (d < bd) { bd = d; best = o; }
      }
      return best ? new THREE.Vector3(best.x + 0.5, best.y, best.z + 0.5) : this.world.structures.poi.pitMouth;
    }
    if (key.startsWith('tree:')) {
      // Nearest standing tree of a kind in the loaded area around the player.
      const kind = key.slice(5);
      const P = this.player.position;
      let best: TreeNode | null = null;
      let bd = Infinity;
      for (const t of this.world.nodesNear(P.x, P.z).flatMap((b) => b.trees)) {
        if (t.kind !== kind || t.depletedUntil > this.elapsed) continue;
        const d = Math.hypot(t.x - P.x, t.z - P.z);
        if (d < bd) { bd = d; best = t; }
      }
      return best ? new THREE.Vector3(best.x + 0.5, best.y + 1, best.z + 0.5) : null;
    }
    const npc = this.npcs.find((n) => n.id === key);
    // Far-off NPCs aren't placed until their chunk loads; point at where they stand.
    if (npc) return npc.placed ? npc.pos : new THREE.Vector3(npc.def.schedule[0].at[0], this.player.position.y, npc.def.schedule[0].at[1]);
    const it = this.world.structures.interactables.find((i) => i.id === key);
    if (it) return new THREE.Vector3(it.x, it.y, it.z);
    const wt = WORLD_THINGS.find((w) => w.id === key);
    if (wt) return new THREE.Vector3(wt.x, wt.y ?? this.thingY.get(wt.id) ?? this.player.position.y, wt.z);
    return this.world.structures.poi[key] ?? null;
  }

  /** Where the journal's objectives point, and (giver) the people with a quest to offer. */
  private questMarkers(): { p: THREE.Vector3; giver?: boolean }[] {
    const out: { p: THREE.Vector3; giver?: boolean }[] = [];
    for (const [id, stage] of Object.entries(this.save.quests)) {
      const def = QUESTS[id];
      if (!def) continue;
      for (const o of def.objectives(this, stage)) if (o.marker && !o.done) { const p = this.markerPos(o.marker); if (p) out.push({ p }); }
    }
    if (!this.stage('fordBell')) { const m = this.npcs.find((n) => n.id === 'maud'); if (m) out.push({ p: m.pos }); }
    else if (this.stage('fordBell') === 'done' && !this.stage('storyNotice')) { const p = this.markerPos('charterNotice'); if (p) out.push({ p }); }
    const seen = new Set<string>();
    for (const def of Object.values(QUESTS)) {
      if (this.stage(def.id) || !def.marks) continue;
      for (const id of Object.keys(def.marks(this, undefined))) {
        const n = this.npcs.find((x) => x.id === id);
        if (n?.placed && !seen.has(id)) { seen.add(id); out.push({ p: n.pos, giver: true }); }
      }
    }
    return out;
  }

  private npcMark(n: Npc): string | undefined {
    const fb = this.stage('fordBell');
    if (n.id === 'maud' && !fb) return '!';
    if (n.id === 'maud' && fb === 'report') return '?';
    if (n.id === 'bram' && (fb === 'askBram' || (fb === 'deliver' && this.count('bronze_bar') >= 3))) return '?';
    if (n.id === 'bram' && (fb === 'done') && !this.flag('tolleyPickGiven') && !this.flag('bramPaid') && this.flag('bellChoice') !== 'report') return '?';
    if (n.id === 'pell' && !this.stage('pellTrout') && this.flag('pellMet')) return '!';
    if (n.id === 'pell' && this.stage('pellTrout') === 'catch' && this.has('raw_trout')) return '?';
    let mark: string | undefined;
    for (const def of Object.values(QUESTS)) {
      const m = def.marks?.(this, this.stage(def.id))[n.id];
      if (!m) continue;
      const tagged = def.story ? m + '*' : m;
      if (m === '?' || def.story) return tagged;
      mark = tagged;
    }
    return mark;
  }

  private updateQuests(dt: number): void {
    for (const [id, stage] of Object.entries(this.save.quests)) {
      const nxt = QUESTS[id]?.advance?.(this, stage);
      if (nxt) this.setStage(id, nxt);
    }
    this.updateQuestSpawns();
    this.updateLift(dt);
    // Any finished chapter whose successor never started (a save made in between) queues it now.
    for (const def of Object.values(QUESTS)) {
      if (def.next && this.stage(def.id) === 'done' && !this.stage(def.next[0]) && !this.chapterQueue.some((c) => c.q === def.next![0])) this.chapterQueue.push({ q: def.next[0], s: def.next[1], t: 2.6 });
    }
    for (const c of this.chapterQueue) c.t -= dt;
    const due = this.chapterQueue.filter((c) => c.t <= 0);
    this.chapterQueue = this.chapterQueue.filter((c) => c.t > 0);
    for (const c of due) if (!this.stage(c.q)) this.setStage(c.q, c.s);
    if (this.casting) {
      this.casting.t += dt;
      const bram = this.npcs.find((n) => n.id === 'bram')!;
      const wren = this.npcs.find((n) => n.id === 'wren')!;
      bram.override = { anim: 'hammer', held: 'hammer' };
      wren.override = { anim: 'bellows' };
      const furnace = this.world.structures.interactables.find((i) => i.kind === 'furnace')!;
      if (Math.random() < dt * 10) this.particles.fire(tmpV.set(furnace.x, furnace.y - 0.2, furnace.z - 0.5));
      if (Math.random() < dt * 3) this.particles.sparks(tmpV.set(furnace.x, furnace.y, furnace.z), 6, '#ffb040');
      if (this.casting.t >= this.casting.dur) {
        this.casting = null;
        bram.override = null;
        wren.override = null;
        this.world.structures.bell.visible = true;
        const bell = this.world.structures.bell.position;
        this.audio.playAt('bell', bell.distanceTo(this.player.position) * 0.3, 1);
        this.hud.banner('The Ford Bell', 'It hangs on the bridge again', true);
        this.setStage('fordBell', 'report');
      }
    }
  }

  // =================================================================== Interaction
  private findCandidate(): Candidate | null {
    const p = this.player.position;
    const chest = tmpV.set(p.x, p.y + 1.1, p.z);
    const face = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    let best: Candidate | null = null;
    let bestScore = Infinity;
    const consider = (c: Candidate, dist: number) => {
      const dir = tmpV2.set(c.pos.x - p.x, 0, c.pos.z - p.z);
      const l = dir.length();
      const ang = l > 0.3 ? Math.acos(THREE.MathUtils.clamp(dir.dot(face) / l, -1, 1)) : 0;
      const score = dist + ang * 1.2;
      if (score < bestScore) { bestScore = score; best = c; }
    };
    // Someone in your group on a mount with a seat free: behind the saddle, or in the back of the wagon
    if (!this.horse && this.pillion === null && this.social.group) {
      for (const r of this.online.remotes.values()) {
        const rm = mountOf(r.mount);
        if (!rm || !spareSeats(rm) || !this.social.group.members.some((m) => m.id === r.id)) continue;
        if (this.online.passengers(r.id).length >= spareSeats(rm)) continue;
        const at = r.model.root.position, back = rm.wagon ? 1.3 : 0;
        const d = Math.hypot(at.x - Math.sin(r.model.root.rotation.y) * back - p.x, at.z - Math.cos(r.model.root.rotation.y) * back - p.z);
        if (d < (rm.wagon ? 3.2 : 3)) consider({ kind: 'act', label: rm.wagon ? `Climb into ${r.name}'s wagon` : `Ride behind ${r.name}`, pos: at.clone(), act: () => this.takePillion(r.id, r.name) }, d);
      }
    }
    // Your own wagon, standing where you left it: its bed to load, its box to climb back onto
    if (this.parked && !this.horse) {
      const pk = this.parked, at = pk.model.root.position, yaw = pk.model.root.rotation.y;
      const bx = at.x - Math.sin(yaw) * 1.3, bz = at.z - Math.cos(yaw) * 1.3, d = Math.hypot(bx - p.x, bz - p.z);
      if (d < 3.4) {
        const def = ITEMS[pk.id];
        consider({ kind: 'act', label: `Open the ${def.name.toLowerCase()}'s bed`, pos: new THREE.Vector3(bx, at.y + 1.2, bz), act: () => this.openWagonBed() }, d);
        consider({ kind: 'act', label: `Drive the ${def.name.toLowerCase()}`, pos: new THREE.Vector3(at.x, at.y + 1.4, at.z), act: () => this.toggleMount(pk.id) }, d + 0.5);
      }
    }
    for (const n of this.npcs) {
      const d = n.pos.distanceTo(p);
      if (d < 3.6 && n.model.root.visible) consider({ kind: 'npc', label: `Talk to ${n.def.name}`, pos: n.pos, npc: n }, d);
    }
    const near = this.world.nodesNear(p.x, p.z);
    for (const o of near.flatMap((b) => b.ores)) {
      if (o.depletedUntil > this.elapsed) continue;
      const c = new THREE.Vector3(o.x + 0.5, o.y + 0.5, o.z + 0.5);
      const d = c.distanceTo(chest);
      if (d < 2.9) {
        const info = ORE_INFO[o.kind];
        const tool = this.inv.bestTool('mining', this.level('mining'));
        consider({ kind: 'ore', label: `Mine ${info.name.toLowerCase()}`, pos: c, ore: o, warn: !tool ? 'Needs a pickaxe' : this.level('mining') < info.level ? `Needs Mining ${info.level}` : '' }, d);
      }
    }
    for (const t of near.flatMap((b) => b.trees)) {
      if (!t.choppable || t.depletedUntil > this.elapsed) continue;
      const dx = t.x + 0.5 - p.x, dz = t.z + 0.5 - p.z;
      if (Math.abs(dx) > 3 || Math.abs(dz) > 3 || Math.abs(t.y - p.y) > 2.5) continue;
      const d = Math.hypot(dx, dz);
      if (d < 2.4) {
        const info = TREE_INFO[t.kind];
        const tool = this.inv.bestTool('woodcutting', this.level('woodcutting'));
        consider({ kind: 'tree', label: `Chop ${info.name.toLowerCase()}`, pos: new THREE.Vector3(t.x + 0.5, t.y + 1, t.z + 0.5), tree: t, warn: !tool ? 'Needs a hatchet' : this.level('woodcutting') < info.level ? `Needs Woodcutting ${info.level}` : '' }, d);
      }
    }
    // Forage: berries, mushrooms and herbs, picked by hand
    for (const f of near.flatMap((b) => b.forage)) {
      if (f.bareUntil > this.elapsed) continue;
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (d < 2.2 && Math.abs(f.y - p.y) < 2) consider({ kind: 'forage', label: `Pick ${ITEMS[f.kind]?.name.toLowerCase() ?? f.kind}`, pos: new THREE.Vector3(f.x, f.y + 0.4, f.z), forage: f }, d);
    }
    if (!this.player.swimming) {
      for (const f of near.flatMap((b) => b.fish)) {
        const d = Math.hypot(f.x - p.x, f.z - p.z);
        if (d < 5.2 && Math.abs(f.y - p.y) < 3.5) {
          consider({ kind: 'fish', label: f.water === 'eelpool' ? 'Fish the still pool' : 'Fish here', pos: new THREE.Vector3(f.x, f.y, f.z), spot: f, warn: !this.hasTool('fishing') ? 'Needs a fishing rod' : '', sub: f.water === 'spill' ? 'The Spill' : f.water === 'eelpool' ? '' : f.water === 'sea' ? 'Open water' : f.water === 'highland' ? 'Mountain tarn' : f.water === 'lake' ? 'Still water' : 'The Wend' }, d + 0.8);
        }
      }
    }
    for (const it of LAND === 'counties' ? this.world.structures.interactables : []) {
      const pos = new THREE.Vector3(it.x, it.y, it.z);
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < it.radius && Math.abs(it.y - p.y - 1) < 2.5) {
        let label = it.label;
        if (it.kind === 'bellframe' && this.world.structures.bell.visible) label = 'Ring the bell';
        if (it.kind === 'chest' && this.flag('lanternOpened')) label = 'Look in the tin box';
        consider({ kind: 'thing', label, pos, thing: it }, d);
      }
    }
    const stall = this.festivals.stallNear(p);
    if (stall && this.festivals.fest) consider({ kind: 'act', label: `Browse the ${this.festivals.fest.name} stall`, pos: new THREE.Vector3(stall.x, stall.y + 1, stall.z), act: () => this.openFestivalStall() }, Math.hypot(stall.x - p.x, stall.z - p.z));
    // The festival's round: a spot near you (game/Seasons.ts)
    for (const c of this.seasons.candidates(p)) consider({ kind: 'act', label: c.label, pos: c.pos, act: c.use }, Math.hypot(c.pos.x - p.x, c.pos.z - p.z));
    // A pedlar on the road: they stop for you, and open their pack
    for (const pd of this.roadfolk.pedlarsNear(p, 3.4)) consider({ kind: 'act', label: `Trade with ${pd.name}`, sub: pd.title, pos: new THREE.Vector3(pd.pos.x, pd.pos.y + 1, pd.pos.z), act: () => this.openPedlar(pd.id) }, Math.hypot(pd.pos.x - p.x, pd.pos.z - p.z));
    const bed = !this.home.active && this.home.bed();
    if (bed && this.home.inside(p) && Math.abs(bed.y - p.y) < 2) consider({ kind: 'act', label: 'Sleep in your bed', pos: new THREE.Vector3(bed.x, bed.y + 1, bed.z), act: () => this.sleep() }, Math.hypot(bed.x - p.x, bed.z - p.z) * 0.3);
    // Indoors at home: arrange the furniture from anywhere in the house
    if (!this.home.active && !this.home.visiting && this.home.owned && this.home.inside(p)) consider({ kind: 'act', label: 'Arrange the furniture', pos: new THREE.Vector3(p.x, p.y + 1, p.z), act: () => this.arrangeHome() }, 1.6);
    // Lodging houses: every room's door, and your own room's chest
    for (const L of LODGINGS) {
      if (Math.hypot(L.x - p.x, L.z - p.z) > 20) continue;
      const t = readTenancy(this.flag('flat'));
      const base = roomBase(L);
      ROOMS.forEach((r, i) => {
        const [dx, dz] = lodgeAt(L, r.door[0], r.door[1]);
        const d = Math.hypot(dx + 0.5 - p.x, dz + 0.5 - p.z);
        const mine = t?.house === L.id && t.room === i;
        if (d < 1.8 && Math.abs(p.y - base) < 2) consider({ kind: 'act', label: mine ? `${r.name}: yours (pay rent)` : `${r.name}: rent it (${L.rent} marks a week)`, pos: new THREE.Vector3(dx + 0.5, base + 2.2, dz + 0.5), act: () => this.roomDoor(L.id, i) }, d);
        const [cx, cz] = lodgeAt(L, r.chest[0], r.chest[1]);
        const dc = Math.hypot(cx + 0.5 - p.x, cz + 0.5 - p.z);
        if (mine && t.until > Date.now() && dc < 2) consider({ kind: 'act', label: 'Open your chest', pos: new THREE.Vector3(cx + 0.5, base + 1, cz + 0.5), act: () => { this.hud.closeAll(); void this.bank.show(`your chest, ${L.name}`, cx + 0.5, cz + 0.5); } }, dc);
      });
    }
    for (const a of this.animals) {
      if (a.kind !== 'dog' && a.kind !== 'cat') continue;
      const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
      if (d > 2 || Math.abs(a.pos.y - p.y) > 1.5) continue;
      consider({ kind: 'act', label: a.kind === 'dog' ? 'Pet the dog' : 'Stroke the cat', pos: a.pos.clone().add(new THREE.Vector3(0, 0.9, 0)), act: () => {
        a.pet();
        this.sfx(a.kind === 'dog' ? 'bark' : 'purr');
        for (let i = 0; i < 4; i++) this.particles.note(new THREE.Vector3(a.pos.x + (Math.random() - 0.5) * 0.5, a.pos.y + 0.9 + i * 0.1, a.pos.z + (Math.random() - 0.5) * 0.5), '#ff8aa8');
        this.setFlag(`pet:${a.kind}@${Math.round(a.home.x)},${Math.round(a.home.z)}`, true);
      } }, d);
    }
    for (const a of this.books.candidates(p)) consider({ kind: 'act', label: a.label, pos: a.pos, act: a.use }, Math.hypot(a.pos.x - p.x, a.pos.z - p.z));
    for (const a of this.chests.candidates(p)) consider({ kind: 'act', label: a.label, pos: a.pos, act: a.use }, Math.hypot(a.pos.x - p.x, a.pos.z - p.z));
    for (const a of this.justice.candidates(p)) consider({ kind: 'act', label: a.label, pos: a.pos, act: a.use }, Math.hypot(a.pos.x - p.x, a.pos.z - p.z));
    for (const a of this.activities.candidates(p)) consider({ kind: 'act', label: a.label, pos: a.pos, act: a.use }, Math.hypot(a.pos.x - p.x, a.pos.z - p.z));
    for (const a of this.dungeons.candidates(p, (id) => this.openFinder(id))) consider({ kind: 'act', label: a.label, pos: a.pos, act: a.use }, Math.hypot(a.pos.x - p.x, a.pos.z - p.z));
    // A town smithy's stations
    for (const ws of this.worldStations) {
      const d = Math.hypot(ws.x - p.x, ws.z - p.z);
      if (d > 2.4 || Math.abs(ws.y - p.y) > 2.5) continue;
      consider({ kind: 'act', label: ws.station === 'furnace' ? 'Use the furnace' : ws.station === 'anvil' ? 'Use the anvil' : ws.station === 'bench' ? "Work at the joiner's bench" : 'Cook at the fire', pos: new THREE.Vector3(ws.x, ws.y + 0.4, ws.z), act: () => this.openCrafting(ws.station, ws) }, d);
    }
    for (const wt of WORLD_THINGS) {
      const d = Math.hypot(wt.x - p.x, wt.z - p.z);
      if (d > wt.radius || (wt.when && !wt.when(this))) continue;
      const y = this.thingGround(wt, p.y);
      if (y === null || Math.abs(y - p.y) > 2.5) continue;
      consider({ kind: 'wthing', label: wt.label, pos: new THREE.Vector3(wt.x, y + 1, wt.z), wthing: wt }, d);
    }
    return best;
  }

  private interact(c: Candidate): void {
    this.dismount();
    if (c.warn) { this.hud.system(c.warn + '.'); this.sfx('fail'); return; }
    switch (c.kind) {
      case 'npc': this.startDialogue(c.npc!); break;
      case 'ore': this.startGather({ kind: 'mine', ore: c.ore, tool: this.inv.bestTool('mining', this.level('mining'))! }); break;
      case 'tree': this.startGather({ kind: 'chop', tree: c.tree, tool: this.inv.bestTool('woodcutting', this.level('woodcutting'))! }); break;
      case 'fish': this.startGather({ kind: 'fish', spot: c.spot, tool: this.inv.bestTool('fishing', 99)! }); break;
      case 'forage': {
        // A handful, and the bush is bare for ten minutes
        const f = c.forage!, n = 1 + (Math.random() < 0.35 ? 1 : 0);
        if (!this.give(f.kind, n)) { this.hud.system('Your pack is full.'); this.sfx('fail'); break; }
        f.bareUntil = this.elapsed + 600;
        this.addXp('cooking', 14);
        this.sfx('pickup');
        this.particles.leaves(tmpV.set(f.x, f.y + 0.4, f.z), f.kind === 'chanterelles' ? '#d89028' : '#4a7a32', 6);
        this.player.faceTowards(f.x, f.z);
        this.persist();
        break;
      }
      case 'thing': this.useThing(c.thing!); break;
      case 'act': c.act!(); this.hud.refresh(); this.persist(); break;
      case 'wthing': {
        const wt = c.wthing!;
        if (wt.read) this.read(wt.read);
        else { wt.use?.(this); this.hud.setTracker(this.questEntries()); this.hud.refresh(); this.persist(); }
        break;
      }
    }
  }

  /** True for conversations that belong to the main story: the cast, or anyone a story objective points at. */
  private isStoryScene(id: string): boolean {
    if (STORY_CAST.has(id)) return true;
    for (const [qid, stage] of Object.entries(this.save.quests)) {
      const def = QUESTS[qid];
      if (!def?.story || stage === 'done') continue;
      if (def.objectives(this, stage).some((o) => o.marker === id)) return true;
    }
    return false;
  }

  private chapterQueue: { q: string; s: string; t: number }[] = [];
  private lift: { t: number; steps: number } | null = null;
  /** Chapter V: walking up to the cut while Harrowgate's crew is stripping it sets the ground moving. */
  private updateLift(dt: number): void {
    const P = this.player.position;
    if (!this.lift && this.stage('storyLift') === 'cut' && !this.flag('templeLifted') && Math.hypot(P.x - LIFT.x, P.z - LIFT.z) < 16) {
      this.lift = { t: 0, steps: 0 };
      this.hud.system('The paving under your feet cracks along the line of the cut.');
      this.audio.play('hitHeavy', 1);
      this.rig.addShake(0.4);
    }
    if (!this.lift) return;
    this.lift.t += dt;
    if (Math.random() < dt * 8) this.rig.addShake(0.12);
    if (this.lift.steps < 2 && this.lift.t > 1.2 + this.lift.steps * 1.4) {
      this.raiseTemple(1);
      this.lift.steps++;
      this.audio.play('hitHeavy', 1);
      this.rig.addShake(0.5);
      this.particles.burst(tmpV.set(LIFT.x, P.y + 1, LIFT.z), '#bfeeff', 60);
    }
    if (this.lift.steps >= 2 && this.lift.t > 4.4) {
      this.lift = null;
      this.setFlag('templeLifted', true);
      this.hud.banner('The ground lifts', 'Two feet, in four seconds', false);
      this.setStage('storyLift', 'fight');
    }
  }

  /** Raise the temple floor east of the crystal by n blocks, exposing crystal underneath. */
  private raiseTemple(n: number): void {
    const V = this.world.voxels;
    if (!V.isLoaded(LIFT.x, LIFT.z)) return;
    for (let step = 0; step < n; step++) {
      for (let z = LIFT.z - LIFT.r; z <= LIFT.z + LIFT.r; z++) for (let x = LIFT.x - LIFT.r; x <= LIFT.x + LIFT.r; x++) {
        if ((x - LIFT.x) ** 2 / (LIFT.r * LIFT.r) + (z - LIFT.z) ** 2 / ((LIFT.r - 1) * (LIFT.r - 1)) > 1) continue;
        const top = V.topSolid(x, z, LIFT.y + 14);
        for (let y = top; y >= LIFT.y - 4; y--) V.set(x, y + 1, z, V.get(x, y, z));
        V.set(x, LIFT.y - 4, z, B.Crystal);
      }
    }
  }

  /** Ground under a regional world thing, or null while its chunk isn't loaded. */
  /**
   * The floor a thing stands on. Looked for near the player's own height first, so a thing on a
   * keep's steps, under an arch or inside a building isn't taken to be up on the roof above it.
   */
  private thingGround(wt: WorldThing, nearY?: number): number | null {
    if (wt.y !== undefined) return this.world.voxels.isLoaded(wt.x, wt.z) ? wt.y : null;
    if (nearY !== undefined && this.world.voxels.isLoaded(wt.x, wt.z)) {
      const y = this.world.voxels.groundBelow(wt.x, nearY + 2.5, wt.z);
      if (Math.abs(y - nearY) <= 2.5) return y;
    }
    const known = this.thingY.get(wt.id);
    if (known !== undefined) return known;
    if (!this.world.voxels.isLoaded(wt.x, wt.z)) return null;
    // The ground under it, looking down through any canopy.
    let y = this.world.voxels.groundBelow(wt.x, 95, wt.z);
    const leaf = (b: number) => b === B.OakLeaves || b === B.BirchLeaves || b === B.PineLeaves;
    while (y > 1 && leaf(this.world.voxels.get(Math.floor(wt.x), y - 1, Math.floor(wt.z)))) y = this.world.voxels.groundBelow(wt.x, y - 2, wt.z);
    this.thingY.set(wt.id, y);
    return y;
  }

  /** Puts quest creatures into the world while their quest needs them, and takes them away after. */
  private updateQuestSpawns(): void {
    for (const qs of QUEST_SPAWNS) {
      const live = this.questSpawned.get(qs.tag);
      const want = qs.when(this);
      const loaded = qs.at.every(([x, z]) => this.world.voxels.isLoaded(x, z));
      if (live && (!want || !loaded)) {
        // Gone out of range or no longer needed: remove the ones still standing (kills are already counted).
        for (const e of live) { this.scene.remove(e.model.root, e.telegraph); if (this.target === e) this.target = null; }
        const gone = new Set(live);
        this.enemies = this.enemies.filter((e) => !gone.has(e));
        this.questSpawned.delete(qs.tag);
        continue;
      }
      if (!live && want && loaded) {
        const left = Math.max(0, qs.at.length - Number(this.flag('kills:' + qs.tag) ?? 0));
        const list: Enemy[] = [];
        for (const [x, z] of qs.at.slice(0, left)) {
          const e = new Enemy(ENEMIES[qs.type], Math.floor(x), Math.floor(z), this.world.voxels);
          if (qs.y !== undefined) { e.home.y = qs.y; e.pos.copy(e.home); }
          e.questTag = qs.tag;
          list.push(e);
          this.enemies.push(e);
          this.scene.add(e.model.root, e.telegraph);
        }
        this.questSpawned.set(qs.tag, list);
      }
    }
  }

  private useThing(it: Interactable): void {
    switch (it.kind) {
      case 'furnace': this.openCrafting('furnace'); break;
      case 'anvil': this.openCrafting('anvil'); break;
      case 'hearth': this.openCrafting('hearth'); break;
      case 'bellframe':
        if (this.world.structures.bell.visible) {
          this.sfx('bell');
          (this.world.structures.bell.userData as { swing?: number }).swing = 1;
          if (!this.flag('rungBell')) { this.setFlag('rungBell'); setTimeout(() => this.hud.system('From across the water, someone shouts: "About time!"'), 1400); }
        } else this.read('bellframe');
        break;
      case 'chest':
        if (!this.flag('lanternOpened')) {
          if (!this.inv.canAdd('wren_whistle')) { this.hud.system('Your pack is full.'); return; }
          this.setFlag('lanternOpened');
          this.give('wren_whistle');
          this.addMarks(12);
          this.hud.showReadable('A note in the tin box', 'PRIVATE.\nproperty of W. Tolley age 9.\nif your reading this put it BACK');
        } else this.hud.showReadable('The tin box', 'Empty, apart from a pressed daisy and some crumbs.');
        break;
      default: {
        const board = BOARDS.find((b) => b.interactable === it.kind);
        if (board) this.openBoard(board.id);
        else this.read(it.kind);
      }
    }
  }

  private read(key: string): void {
    const r = READABLES[key];
    if (!r) return;
    const body = typeof r.body === 'function' ? r.body(this) : r.body;
    r.effect?.(this);
    this.hud.showReadable(r.title, body);
    this.hud.setTracker(this.questEntries());
    if (r.effect) this.persist();
  }

  // =================================================================== Gathering
  private startGather(a: Omit<GatherAction, 't' | 'swings' | 'phase' | 'waitFor'>): void {
    this.cancelActions();
    const act: GatherAction = { ...a, t: 0, swings: 0, phase: 'cast', waitFor: 0 };
    if (a.kind === 'mine' && a.ore) {
      const info = ORE_INFO[a.ore.kind];
      if (this.level('mining') < info.level) { this.hud.system(`You need Mining ${info.level}.`); return; }
    }
    if (a.kind === 'chop' && a.tree) {
      const info = TREE_INFO[a.tree.kind];
      if (this.level('woodcutting') < info.level) { this.hud.system(`You need Woodcutting ${info.level}.`); return; }
    }
    if (!this.inv.freeSlots() && !this.save.inv.some((s) => s && ITEMS[s.id].stack)) { this.hud.system('Your pack is full.'); return; }
    this.action = act;
    this.player.locked = true;
    if (a.kind === 'fish') {
      this.player.faceTowards(a.spot!.x, a.spot!.z);
      this.sfx('cast');
    }
  }

  private cancelActions(): void {
    if (this.action) {
      this.action = null;
      this.bobber.visible = false;
      this.fishLine.visible = false;
      this.hud.showBite(false);
    }
    if (this.craftAction) this.craftAction = null;
    this.player.locked = false;
    this.hud.setCast(null);
  }

  private updateGather(dt: number): void {
    const a = this.action;
    if (!a) return;
    a.t += dt;
    const P = this.player;
    if (a.kind === 'mine' || a.kind === 'chop') {
      const target = a.ore ? new THREE.Vector3(a.ore.x + 0.5, a.ore.y + 0.5, a.ore.z + 0.5) : new THREE.Vector3(a.tree!.x + 0.5, a.tree!.y + 1, a.tree!.z + 0.5);
      P.faceTowards(target.x, target.z);
      const tool = ITEMS[a.tool].tool!;
      const skill: SkillId = a.kind === 'mine' ? 'mining' : 'woodcutting';
      const period = 0.9;
      P.model.actionSpeed = 1;
      const swingAt = period * 0.62;
      const prevSwings = a.swings;
      const k = Math.floor((a.t - swingAt) / period) + 1;
      this.hud.setCast(a.kind === 'mine' ? ORE_INFO[a.ore!.kind].name : TREE_INFO[a.tree!.kind].name, ((a.t % period) / period));
      if (k > prevSwings && a.t >= swingAt) {
        a.swings = k;
        const lvl = this.level(skill);
        const req = a.ore ? ORE_INFO[a.ore.kind].level : TREE_INFO[a.tree!.kind].level;
        const chance = THREE.MathUtils.clamp(0.3 + (lvl - req) * 0.04 + (tool.power - 1) * 0.16, 0.15, 0.92);
        const hitPos = target.clone().lerp(tmpV.copy(P.position).setY(P.position.y + 1), 0.45);
        if (a.kind === 'mine') {
          this.sfx('clink');
          const col = a.ore!.kind === 'copper' ? ['#c8743a', '#7f8389', '#4fae8c'] : a.ore!.kind === 'tin' ? ['#c6ccd2', '#7f8389'] : ['#e4ecf6', '#7f8389'];
          this.particles.debris(hitPos, col, 6, 3);
          this.particles.sparks(hitPos, 4);
          this.rig.addShake(0.04);
        } else {
          this.sfx('chop');
          this.particles.debris(hitPos, ['#7a5636', '#c49a64'], 5, 2.5);
          this.particles.leaves(new THREE.Vector3(a.tree!.x + 0.5, a.tree!.y + 4, a.tree!.z + 0.5), a.tree!.kind === 'birch' ? '#8ab848' : a.tree!.kind === 'pine' ? '#2b5e3e' : '#4f8f2c', 3);
        }
        if (Math.random() < chance) this.gatherSuccess(a);
      }
      return;
    }
    // Fishing
    const spot = a.spot!;
    const rodTip = P.model.heldTip(new THREE.Vector3());
    const bobPos = new THREE.Vector3(spot.x + Math.sin(a.t * 0.7) * 0.15, spot.y - 0.08, spot.z + Math.cos(a.t * 0.5) * 0.15);
    if (a.phase === 'cast') {
      this.hud.setCast('Casting', a.t / 0.7);
      if (a.t > 0.7) {
        a.phase = 'wait';
        a.t = 0;
        const lvl = this.level('fishing');
        a.waitFor = Math.max(1.8, 3 + Math.random() * 5 - lvl * 0.1);
        this.sfx('splash', 0.5);
        this.particles.ripple(bobPos);
      }
    } else if (a.phase === 'wait') {
      this.hud.setCast('Waiting for a bite…', a.t / a.waitFor);
      bobPos.y += Math.sin(a.t * 3) * 0.02;
      if (a.t > a.waitFor) {
        a.phase = 'bite';
        a.t = 0;
        this.sfx('bite');
        this.particles.splash(bobPos, 8);
        this.hud.showBite(true);
      }
    } else if (a.phase === 'bite') {
      bobPos.y -= 0.18 + Math.sin(a.t * 30) * 0.05;
      this.hud.setCast('Pull! (E or click)', 1 - a.t / 1.15, true);
      if (a.t > 1.15) {
        this.hud.showBite(false);
        this.hud.system('It got away.');
        a.phase = 'reel';
        a.t = 0;
      }
    } else if (a.phase === 'reel') {
      this.hud.setCast('Recasting', a.t / 1);
      if (a.t > 1) { a.phase = 'cast'; a.t = 0; this.sfx('cast'); }
    }
    const show = a.phase !== 'cast' || a.t > 0.45;
    this.bobber.visible = show;
    this.fishLine.visible = show;
    if (show) {
      this.bobber.position.copy(bobPos);
      const pos = this.fishLine.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const x = rodTip.x + (bobPos.x - rodTip.x) * t;
        const z = rodTip.z + (bobPos.z - rodTip.z) * t;
        const y = rodTip.y + (bobPos.y - rodTip.y) * t - Math.sin(t * Math.PI) * 0.6;
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }
  }

  /** Called by E / click while fishing. */
  private pullLine(): boolean {
    const a = this.action;
    if (!a || a.kind !== 'fish') return false;
    if (a.phase === 'bite') {
      this.hud.showBite(false);
      const lvl = this.level('fishing');
      const table = FISH_TABLE[a.spot!.water].filter((f) => f.level <= lvl);
      if (!table.length) { this.hud.system('Whatever it was was too quick for you.'); a.phase = 'reel'; a.t = 0; return true; }
      const total = table.reduce((s, f) => s + f.weight, 0);
      let roll = Math.random() * total;
      let pick = table[0];
      for (const f of table) { roll -= f.weight; if (roll <= 0) { pick = f; break; } }
      if (!this.inv.canAdd(pick.item)) { this.hud.system('Your pack is full.'); this.cancelActions(); return true; }
      this.give(pick.item);
      this.addXp('fishing', pick.xp);
      this.sfx('catch');
      this.particles.splash(this.bobber.position, 16);
      a.phase = 'reel';
      a.t = 0;
      return true;
    }
    if (a.phase === 'wait') {
      this.hud.system('Too early. You reel in and cast again.');
      a.phase = 'reel';
      a.t = 0.4;
      return true;
    }
    return false;
  }

  private gatherSuccess(a: GatherAction): void {
    if (a.kind === 'mine' && a.ore) {
      const info = ORE_INFO[a.ore.kind];
      if (!this.inv.canAdd(info.item)) { this.hud.system('Your pack is full.'); this.cancelActions(); return; }
      this.give(info.item);
      if ((this.fx.has('prospector') || this.gearSet === 'brightcut') && Math.random() < 0.2 && this.inv.canAdd(info.item)) this.give(info.item);
      this.addXp('mining', info.xp);
      this.sfx('oreBreak');
      this.particles.debris(new THREE.Vector3(a.ore.x + 0.5, a.ore.y + 0.5, a.ore.z + 0.5), ['#7f8389', '#5d6066'], 14, 4);
      a.ore.depletedUntil = this.elapsed + info.respawn;
      this.world.voxels.set(a.ore.x, a.ore.y, a.ore.z, B.Depleted);
      this.cancelActions();
    } else if (a.kind === 'chop' && a.tree) {
      const info = TREE_INFO[a.tree.kind];
      if (!this.inv.canAdd(info.item)) { this.hud.system('Your pack is full.'); this.cancelActions(); return; }
      this.give(info.item);
      if ((this.fx.has('prospector') || this.gearSet === 'brightcut') && Math.random() < 0.2 && this.inv.canAdd(info.item)) this.give(info.item);
      this.addXp('woodcutting', info.xp);
      a.tree.logs--;
      if (a.tree.logs <= 0) {
        this.sfx('treeFall');
        const top = new THREE.Vector3(a.tree.x + 0.5, a.tree.y + 4, a.tree.z + 0.5);
        this.particles.leaves(top, a.tree.kind === 'birch' ? '#8ab848' : a.tree.kind === 'pine' ? '#2b5e3e' : '#4f8f2c', 30);
        this.particles.debris(top, ['#7a5636', '#5f4128'], 12, 3);
        fellTree(this.world.voxels, a.tree);
        a.tree.depletedUntil = this.elapsed + info.respawn;
        this.cancelActions();
      }
    }
  }

  private respawnNodes(): void {
    const oreBlock = { copper: B.CopperOre, tin: B.TinOre, silver: B.SilverOre, iron: B.IronOre, crystal: B.Crystal };
    const buckets = [...this.world.loadedBuckets()];
    for (const o of buckets.flatMap((b) => b.ores)) {
      if (o.depletedUntil && o.depletedUntil <= this.elapsed) {
        o.depletedUntil = 0;
        this.world.voxels.set(o.x, o.y, o.z, oreBlock[o.kind]);
      }
    }
    for (const t of buckets.flatMap((b) => b.trees)) {
      if (t.depletedUntil && t.depletedUntil <= this.elapsed) {
        // Don't regrow on top of the player.
        if (Math.hypot(t.x + 0.5 - this.player.position.x, t.z + 0.5 - this.player.position.z) < 4) continue;
        t.depletedUntil = 0;
        t.logs = 2 + Math.floor(Math.random() * 3);
        regrowTree(this.world.voxels, t);
      }
    }
  }

  // =================================================================== Combat
  featApi(): FeatApi {
    const flags = this.save.flags;
    return {
      flag: (k) => flags[k],
      countFlags: (prefix) => Object.keys(flags).filter((k) => k.startsWith(prefix) && flags[k]).length,
      explored: this.save.explored?.length ?? 0,
      owns: (id) => this.inv.count(id) > 0,
      totalLevel: SKILLS.reduce((a, k) => a + this.level(k.id), 0),
    };
  }

  private featT = 2;
  /** Every couple of seconds: anything newly earned pays out and says so. */
  private checkFeats(dt: number): void {
    this.featT -= dt;
    if (this.featT > 0) return;
    this.featT = 2;
    const api = this.featApi();
    for (const f of FEATS) {
      if (this.flag('feat:' + f.id) || f.have(api) < f.need) continue;
      this.setFlag('feat:' + f.id, Date.now());
      this.addMarks(f.marks);
      this.hud.banner('Feat', f.name, true);
      this.hud.system(`Feat: ${f.name}. ${f.marks} marks, and the title "${f.title}" (wear it from the journal's Feats page).`);
      if (FEAT_CAPE[f.id]) this.unlockCape(FEAT_CAPE[f.id]);
      this.sfx('quest');
      break;
    }
  }

  /** The halters in the pack, the chosen one first. */
  /** Your mount's key as others see it: its halter and the coat and cloth you chose. */
  private mountKeyOf(id: string): string {
    const v = String(this.flag('look:' + id) ?? '');
    return v ? mountKey(id, Number(v[0]) || 0, Number(v[1]) || 0) : id;
  }

  private halters(): string[] {
    const own = this.save.inv.filter((st) => st && ITEMS[st.id]?.mount).map((st) => st!.id);
    const pick = this.flag('mount') as string | undefined;
    return pick && own.includes(pick) ? [pick, ...own.filter((x) => x !== pick)] : own;
  }

  /** Call your horse and get up, or get down. */
  private toggleMount(which?: string): void {
    if (this.pillion !== null) { this.leavePillion(); return; }
    if (this.justice.jailed || this.justice.busy) { this.hud.system('Not now.'); return; }
    if (this.horse && !which) { this.dismount(); return; }
    // Near your parked wagon, G drives it on
    const pk = this.parked, nearWagon = pk && pk.model.root.position.distanceTo(this.player.position) < 9 ? pk.id : undefined;
    const id = which ?? nearWagon ?? this.halters()[0];
    if (!id) { this.hud.system('You have no horse. The stables outside Ansbury, Gullmouth and Harrowgate Works sell them, and so does Cai Morgan in Kelderby. The far towns over the necks breed rarer ones.'); return; }
    const P = this.player;
    if (this.dialogue || this.dead || this.mode !== 'play') return;
    if (P.swimming) { this.hud.system('Not in the water.'); return; }
    if (this.elapsed - this.lastCombat < 5) { this.hud.system('Not while you\'re fighting.'); return; }
    if (!this.roomForHorse()) { this.hud.system('There\'s no room for a horse here.'); return; }
    this.dismount(true);
    this.cancelActions();
    const m = ITEMS[id].mount!;
    let horse: CreatureModel;
    if (this.parked?.id === id && this.parked.model.root.position.distanceTo(P.position) < 9) {
      // Back up onto the box of the wagon where it stands
      horse = this.parked.model;
      this.parked = null;
      const at = horse.root.position;
      P.teleport(at.x, at.y, at.z);
      P.yaw = horse.root.rotation.y;
    } else {
      // A wagon called from somewhere else comes round with its bed as you left it
      if (this.parked?.id === id) { this.scene.remove(this.parked.model.root); this.parked = null; }
      horse = mountModel(mountOf(this.mountKeyOf(id)) ?? m);
      P.footPosition(horse.root.position);
      horse.root.rotation.y = P.facing;
      this.scene.add(horse.root);
    }
    this.horse = horse;
    P.seat = riderLift(m);
    this.setFlag('mount', id);
    this.particles.dust(P.position, 14);
    this.sfx('whistle', 0.6);
    setTimeout(() => this.sfx('neigh', 0.7), 450);
  }

  private dismount(quiet = false): void {
    if (!this.horse) return;
    const id = this.flag('mount') as string;
    if (ITEMS[id]?.mount?.wagon) {
      // A wagon stays where you leave it; you step down beside the box
      if (this.parked) this.scene.remove(this.parked.model.root);
      this.parked = { id, model: this.horse };
      this.horse.setAnim('idle');
      this.horse = null;
      this.player.seat = 0;
      const P = this.player.position, yaw = this.parked.model.root.rotation.y;
      const x = P.x - Math.cos(yaw) * 1.3, z = P.z + Math.sin(yaw) * 1.3;
      this.player.teleport(x, this.world.voxels.groundBelow(x, P.y + 2.5, z), z);
      if (!quiet) { this.sfx('snort', 0.5); this.hud.system('The wagon stands where you left it. Load its bed beside it; G drives it on.'); }
      return;
    }
    this.scene.remove(this.horse.root);
    this.horse = null;
    this.player.seat = 0;
    if (!quiet) { this.particles.dust(this.player.position, 8); this.sfx('snort', 0.5); }
  }

  /** Up behind a friend on their two-seat mount: you go where they ride until you jump down (Space or G). */
  private takePillion(id: number, name: string): void {
    if (this.dead || this.dialogue || this.elapsed - this.lastCombat < 5) { this.hud.system('Not while you\'re fighting.'); return; }
    this.dismount(true);
    this.cancelActions();
    this.pillion = id;
    this.hud.system(`You climb up behind ${name}. Jump, or press G, to get down.`);
    this.sfx('pickup', 0.5);
  }

  private leavePillion(): void {
    if (this.pillion === null) return;
    this.pillion = null;
    this.player.seat = 0;
    // Down beside the horse, on the ground
    const P = this.player.position, side = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw)).multiplyScalar(1.2);
    const x = P.x + side.x, z = P.z + side.z;
    this.player.teleport(x, this.world.voxels.groundBelow(x, P.y + 2.5, z), z);
    this.particles.dust(this.player.position, 8);
  }

  /** Your parked wagon's bed: goods kept in it stay with that wagon, wherever it stands. */
  private openWagonBed(): void {
    const pk = this.parked;
    if (!pk) return;
    const def = ITEMS[pk.id], at = pk.model.root.position, yaw = pk.model.root.rotation.y, key = `wagon:${pk.id}`;
    this.hud.closeAll();
    void this.bank.show(def.name, at.x - Math.sin(yaw) * 1.3, at.z - Math.cos(yaw) * 1.3, {
      title: `${def.name}: the bed`, kinds: def.mount!.wagon!.bed, note: 'What you load stays with this wagon, wherever you leave it.',
      load: () => ({ ...((this.flag(key) as Record<string, number> | undefined) ?? {}) }),
      save: (items) => this.setFlag(key, items),
    });
  }

  /** Headroom for a rider: nothing solid over the saddle. */
  private roomForHorse(): boolean {
    const p = this.player.position, V = this.world.voxels;
    for (let y = 2; y <= 3; y++) for (const [dx, dz] of [[0, 0], [0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]]) {
      if (isSolid(V.get(Math.floor(p.x + dx), Math.floor(p.y + y), Math.floor(p.z + dz)))) return false;
    }
    return true;
  }

  private useAbility(i: number): void {
    if (this.mode !== 'play' || this.dead) return;
    if (i < UNLOCK_AT.length && this.level('melee') < UNLOCK_AT[i]) { this.hud.system(`That skill comes at level ${UNLOCK_AT[i]}.`); this.sfx('fail'); return; }
    this.dismount();
    this.hud.pressAbility(i);
    if (i === 0) this.strike();
    else if (i === 1) this.cleave();
    else if (i <= 7) {
      if (this.attack || this.dash) return;
      this.cancelActions();
      const ok = i === 2 ? this.kit.useWeapon() : this.kit.use(i - 3);
      if (ok) { this.cds.strike = Math.max(this.cds.strike, TUNE.skillLock); this.comboWindow = 0; }
    }
    else if (i === 8) this.roll();
    else if (i === 9) this.eat();
  }

  /**
   * Where a ground-aimed skill lands: the ground under the cursor, or on a touch screen (or with
   * the cursor off the ground) on your target or a little ahead; never further than the skill
   * reaches. You turn to face it.
   */
  private aimPoint(range: number): THREE.Vector3 {
    const P = this.player.position;
    let at: THREE.Vector3 | null = null;
    if (!document.body.classList.contains('touch')) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((this.input.mouseX / innerWidth) * 2 - 1, -(this.input.mouseY / innerHeight) * 2 + 1), this.camera);
      const o = ray.ray.origin, d = ray.ray.direction;
      const hit = this.world.voxels.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 90);
      // (Underground the camera's line can strike the ceiling, or the ground above it: only a point near your own height counts)
      if (hit && Math.abs(hit.y + 1 - P.y) < 6) at = new THREE.Vector3(hit.x + 0.5, hit.y + 1, hit.z + 0.5);
    }
    if (!at) at = this.target?.alive ? this.target.pos.clone() : P.clone().add(new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw)).multiplyScalar(range * 0.6));
    const flat = new THREE.Vector3(at.x - P.x, 0, at.z - P.z);
    if (flat.length() > range) { flat.setLength(range); at.set(P.x + flat.x, at.y, P.z + flat.z); }
    at.y = this.world.voxels.groundBelow(at.x, Math.min(Math.max(at.y, P.y) + 3, P.y + 6), at.z);
    if (flat.length() > 0.5) this.player.yaw = Math.atan2(flat.x, flat.z);
    return at;
  }

  /** Spring along a direction (Cinder Step, Quickstep): as far as there's open, level-enough ground. */
  private springAlong(dir: THREE.Vector3, dist: number): boolean {
    const P = this.player.position, d = dir.clone().setY(0).normalize();
    for (let k = dist; k >= 2; k -= 1) {
      const x = P.x + d.x * k, z = P.z + d.z * k;
      const g = this.world.voxels.groundBelow(x, P.y + 2.5, z);
      if (Math.abs(g - P.y) > 2.5 || this.world.voxels.raycast(P.x, P.y + 1, P.z, d.x, 0, d.z, k)) continue;
      this.dash = { fx: P.x, fy: P.y, fz: P.z, tx: x, tz: z, ty: g, t: 0, dur: 0.2 };
      this.sfx('roll');
      return true;
    }
    this.hud.system('No room to spring back.');
    return false;
  }

  /** Foes you can see ahead, best first: near, and in front of the camera. */
  private targetOrder(): Enemy[] {
    const P = this.player.position, cy = this.rig.yaw;
    const ahead = new THREE.Vector3(-Math.sin(cy), 0, -Math.cos(cy));
    const score = (e: Enemy) => {
      const dx = e.pos.x - P.x, dz = e.pos.z - P.z, d = Math.hypot(dx, dz);
      const ang = d > 0.5 ? Math.acos(THREE.MathUtils.clamp((dx * ahead.x + dz * ahead.z) / d, -1, 1)) : 0;
      return d * (1 + ang * 0.8);
    };
    return this.enemies
      .filter((e) => e.alive && e.model.root.visible && e.pos.distanceTo(P) < 32)
      .sort((a, b) => score(a) - score(b));
  }

  /** Tab: the next foe in front of you (GW2): nearest and most ahead first, then the next on each press. */
  private cycleTarget(): void {
    const list = this.targetOrder();
    if (!list.length) { this.target = null; return; }
    const i = this.target ? list.indexOf(this.target) : -1;
    this.target = list[(i + 1) % list.length];
    this.sfx('click', 0.4);
  }

  private faceTarget(range: number): Enemy | null {
    let best: Enemy | null = null;
    if (this.target && this.target.alive && this.target.pos.distanceTo(this.player.position) < range + 1.5) best = this.target;
    else {
      let bd = range;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.pos.distanceTo(this.player.position);
        if (d < bd) { bd = d; best = e; }
      }
    }
    if (best) {
      this.player.faceTowards(best.pos.x, best.pos.z);
      if (!this.target) this.target = best;
    }
    return best;
  }

  /** Whether the weapon in hand is a bow (Strike looses an arrow instead of swinging). */
  private get bowInHand(): boolean { return this.blade?.model?.family === 'bow'; }

  private strike(): void {
    if (this.action || this.craftAction) this.cancelActions();
    if (this.bowInHand) { this.loose(); return; }
    if (this.attack) { this.queuedStrike = true; return; }
    if (this.cds.strike > 0) return;
    const at = this.faceTarget(this.player.swimming ? 6 : 4.5);
    if (this.player.swimming && at) {
      const P = this.player.position;
      const to = tmpV.set(at.pos.x - P.x, at.pos.y + 0.4 - (P.y + 0.9), at.pos.z - P.z);
      const d = to.length();
      if (d > 2 && d < 7.5) this.player.velocity.addScaledVector(to.normalize(), Math.min(7, d * 1.5));
    }
    const combo = this.comboWindow > 0 ? (this.comboIndex + 1) % 3 : 0;
    this.comboIndex = combo;
    const dur = (combo === 2 ? 0.55 : 0.42) / this.pace;
    this.attack = { kind: 'strike', t: 0, dur, hitAt: dur * 0.48, hit: false, combo };
    this.player.model.comboIndex = combo;
    this.player.model.setState('attack');
    this.player.model.stateTime = 0;
    this.cds.strike = dur * 0.9;
    this.sfx('swing');
    this.lastCombat = this.elapsed;
  }

  /** A bow's Strike: an arrow at the target, up to twenty-four blocks off, a little slower than a swing. */
  private loose(): void {
    if (this.cds.strike > 0) return;
    const e = this.faceTarget(24);
    if (!e) { this.hud.system('Nothing in range to shoot at: target something (Tab) within twenty-four blocks.'); this.cds.strike = 0.6; return; }
    const dur = 0.62 / this.pace;
    this.cds.strike = dur;
    this.player.model.setState('shoot');
    this.player.model.stateTime = 0;
    const crit = Math.random() < 0.08 + (this.blade?.crit ?? 0) + this.armour.crit;
    this.kit.loose(e, this.swingPower() * (0.9 + Math.random() * 0.2), crit);
    this.sfx('swing', 1.6);
    this.lastCombat = this.elapsed;
  }

  private cleave(): void {
    if (this.cds.cleave > 0 || this.attack) return;
    this.cancelActions();
    const pace = this.pace;
    this.attack = { kind: 'cleave', t: 0, dur: 0.6 / pace, hitAt: 0.28 / pace, hit: false, combo: 0 };
    this.player.model.setState('cleave');
    this.player.model.stateTime = 0;
    this.cds.cleave = this.gearSet === 'harrow' ? 4 : 6;
    this.sfx('swing', 1.3);
    this.lastCombat = this.elapsed;
  }

  /** An ordinary swing's damage at this level with this weapon, before the roll and crits. */
  private swingPower(): number {
    const lvl = this.level('melee');
    return (7 + lvl * 1.45 + (this.blade?.damage ?? 0)) * (1 + (lvl - 1) * 0.02) * (1 + this.buffSum('power'));
  }

  /** Every blow the player lands goes through here: the calling's bonuses, the boss share, numbers, experience, a kill. */
  private dealDamage(e: Enemy, raw: number, crit: boolean, quiet = false): number {
    if (!e.alive) return 0;
    const fx = this.fx;
    // The Clinker tusk: blows in a row on one foe build, 5% a blow up to a quarter
    if (fx.has('momentum') && !quiet) { this.streak = this.streak.e === e ? { e, n: Math.min(5, this.streak.n + 1) } : { e, n: 0 }; raw *= 1 + this.streak.n * 0.05; }
    const flank = this.gearSet === 'oldman' && this.dungeons.onSomeoneElse(e) ? 1.1 : 1;
    const dmg = Math.max(1, Math.round(this.kit.outgoing(e, raw) * (crit ? 1.6 : 1) * flank));
    e.takeDamage(this.activities.beforeHit(e, dmg), this.player.position, this.elapsed);
    this.dungeons.onPlayerHit(e, dmg);
    this.activities.escorts.onPlayerHit(e);
    // Barrowborn: below half health, a tenth of every blow comes back to you
    if (this.gearSet === 'barrow' && !this.dead && this.hp < this.maxHp / 2) this.hp = Math.min(this.maxHp, this.hp + Math.round(dmg * 0.1));
    if (this.gearSet === 'fold' && !this.dead && e.alive && (e.state === 'chase' || e.state === 'windup' || e.state === 'attack' || e.state === 'recover') && !this.dungeons.onSomeoneElse(e)) {
      const h = Math.min(this.maxHp - this.hp, Math.round(dmg * 0.05));
      if (h > 0) this.hp += h;
    }
    this.kit.landed();
    this.lastCombat = this.elapsed;
    this.target = this.target && this.target.alive ? this.target : e;
    this.floatAt(e.pos, e.model.plateHeight + 0.2, String(dmg), crit ? 'crit' : quiet ? 'tick' : '');
    if (!quiet) this.particles.sparks(tmpV2.copy(e.pos).setY(e.pos.y + 0.8), crit ? 14 : 7, crit ? '#ffe080' : '#ffb060');
    if (crit) { e.punch = Math.max(e.punch, e.def.elite ? 0.12 : 0.24); this.hitstop = Math.max(this.hitstop, 0.08); this.rig.addShake(0.16); this.sfx('crit', 0.7); }
    if (!quiet && e.alive && this.elapsed - (this.voiced.get(e) ?? -9) > 0.9) { this.voiced.set(e, this.elapsed); this.audio.playAt(voiceOf(e.def.model ?? e.def.type, 'hurt'), e.pos.distanceTo(this.player.position), 0.7); }
    this.addXp('melee', Math.max(1, Math.round(dmg * HIT_XP)));
    if (!quiet) {
      if (fx.has('bleed') && e.alive) this.kit.addDot(e, (dmg * 0.33) / 4, 4);
      if (fx.has('chill')) e.slowLeft = 3;
      if (fx.has('weaken')) e.weakLeft = 4;
      if (crit && fx.has('crit_heal')) this.healSelf(this.maxHp * 0.02);
      // The Kettle light: a critical hit leaps to the nearest other foe
      if (crit && fx.has('chain') && !this.chaining) {
        const o = this.enemies.filter((x) => x !== e && x.alive && x.pos.distanceTo(e.pos) < 5).sort((a, b) => a.pos.distanceTo(e.pos) - b.pos.distanceTo(e.pos))[0];
        if (o) { this.chaining = true; this.particles.sparks(tmpV2.copy(o.pos).setY(o.pos.y + 0.8), 10, '#c8f4ff'); this.dealDamage(o, raw * 0.5, false, true); this.chaining = false; }
      }
    }
    if (e.justDied) this.onEnemyKilled(e);
    return dmg;
  }

  private roll(): void {
    const cost = this.armour.rollCost;
    if (this.cds.roll > 0 || this.energy < cost) return;
    this.cancelActions();
    this.energy -= cost;
    if (this.fx.has('tide')) { this.energy = Math.min(100, this.energy + 10); this.healSelf(this.maxHp * 0.04); }
    this.cds.roll = 0.8;
    this.iframes = 0.46 + this.armour.roll;
    this.rolledThrough = false;
    const P = this.player;
    const mv = this.moveVector();
    const dir = mv.lengthSq() > 0.01 ? mv.clone() : new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    // Under the surface the kick goes the way you're swimming, along the camera's aim
    if (P.swimming && mv.lengthSq() > 0.01 && (P.underwater || P.swimAim < -0.45)) dir.set(mv.x * Math.cos(P.swimAim), Math.sin(P.swimAim), mv.z * Math.cos(P.swimAim));
    P.startRoll(dir);
    this.attack = null;
    if (P.swimming) { this.sfx('splash', 0.5); this.particles.bubbles(tmpV.copy(P.position).setY(P.position.y + 0.9), 14); }
    else { this.sfx('roll'); this.particles.dust(P.position, 8); }
  }

  private resolveAttack(): void {
    const a = this.attack!;
    const P = this.player.position;
    const face = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    const blade = this.blade;
    const power = this.swingPower();
    const bonus = a.kind === 'strike' ? this.kit.strikeBonus() : { mult: 1, crit: false };
    const swim = this.player.swimming;
    let drawn = 0;
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = tmpV.subVectors(e.pos, P);
      const flat = Math.hypot(to.x, to.z);
      if (!swim && Math.abs(to.y) > 2.2) continue;
      const dist = swim ? Math.hypot(flat, e.pos.y + (e.swims ? 0.4 : 0.8) - (P.y + 0.9)) : flat;
      const reach = (a.kind === 'cleave' ? 3.4 : 2.7 + (e.def.elite ? 0.6 : 0)) + (blade?.reach ?? 0);
      if (dist > reach) continue;
      if (a.kind === 'strike') {
        const ang = Math.acos(THREE.MathUtils.clamp((to.x * face.x + to.z * face.z) / Math.max(0.01, flat), -1, 1));
        if (ang > 1.35 && flat > 1.1) continue;
      }
      const mult = a.kind === 'cleave' ? 1.5 : [1, 1.1, 1.5][a.combo];
      const crit = bonus.crit || Math.random() < 0.12 + (blade?.crit ?? 0) + this.armour.crit || (this.gearSet === 'thornback' && e.hp >= e.def.hp);
      if (crit && this.gearSet === 'starglass') this.energy = Math.min(100, this.energy + 6);
      const dmg = this.dealDamage(e, power * mult * bonus.mult * (0.9 + Math.random() * 0.2), crit);
      drawn += dmg * (blade?.leech ?? 0);
      any = true;
    }
    // Nothing hostile in reach: a blow at the town itself, its watch, its people or its beasts, goes in its book (game/Justice.ts)
    if (!any && jurisdictionAt(P.x, P.z)) {
      const reach = (a.kind === 'cleave' ? 3.4 : 2.7) + (blade?.reach ?? 0);
      const inFront = (q: THREE.Vector3) => {
        const to = tmpV.subVectors(q, P), flat = Math.hypot(to.x, to.z);
        if (flat > reach || Math.abs(to.y) > 2.2) return false;
        return a.kind === 'cleave' || flat < 1.1 || Math.acos(THREE.MathUtils.clamp((to.x * face.x + to.z * face.z) / Math.max(0.01, flat), -1, 1)) <= 1.1;
      };
      const guard = this.roadfolk.guards(P, reach + 1).find((g) => inFront(g.pos));
      const npc = !guard && this.npcs.find((n) => n.placed !== false && n.model.root.visible && inFront(n.pos));
      const beast = !guard && !npc && this.animals.find((x) => x.kind in CRIME.beast && inFront(x.pos));
      if (guard) { this.sfx('hit'); this.justice.crime('guard', guard.pos, undefined, guard.id); }
      else if (npc) { this.sfx('hit'); this.floatAt(npc.pos, 2.3, ['Ow!', 'Watch! Watch!', 'What was that for?'][Math.floor(Math.random() * 3)], 'chatter'); this.justice.crime('assault', npc.pos); }
      else if (beast) { this.sfx('hit', 0.7); beast.scare(P); this.particles.dust(beast.pos, 6); this.justice.crime('beast', beast.pos, beast.kind); }
    }
    if (drawn >= 1 && !this.dead) {
      const healed = Math.min(this.maxHp - this.hp, Math.round(drawn));
      if (healed > 0) { this.hp += healed; this.floatAt(this.player.position, 2.2, `+${healed}`, 'heal'); }
    }
    if (any) {
      this.sfx(a.kind === 'cleave' || a.combo === 2 ? 'hitHeavy' : 'hit');
      this.hitstop = a.combo === 2 || a.kind === 'cleave' ? 0.07 : 0.04;
      this.rig.addShake(a.combo === 2 || a.kind === 'cleave' ? 0.18 : 0.08);
      this.lastCombat = this.elapsed;
    }
  }

  /**
   * Spawn points remember their dead: a creature killed here stays gone for its full respawn time,
   * even if its chunk streams out and back in, and (online) a kill anyone makes counts for everyone.
   */
  private readonly ledger = new Map<string, number>();
  private applyLedger(e: Enemy): void {
    const until = e.spawnKey ? this.ledger.get(e.spawnKey) : undefined;
    if (until === undefined) return;
    const left = (until - realmNow()) / 1000;
    if (left <= 0) { this.ledger.delete(e.spawnKey!); return; }
    e.vanish(left);
  }
  /** Another player killed the creature at this spawn point: ours goes too, unless it's fighting us. */
  private mobDeadElsewhere(key: string, leftMs: number): void {
    this.ledger.set(key, realmNow() + leftMs);
    const e = this.enemies.find((x) => x.spawnKey === key);
    if (e && e.alive && (e.state === 'idle' || e.state === 'wander' || e.state === 'return')) {
      if (this.target === e) this.target = null;
      e.vanish(leftMs / 1000);
    }
  }

  private onEnemyKilled(e: Enemy): void {
    this.audio.playAt(voiceOf(e.def.model ?? e.def.type, 'die'), e.pos.distanceTo(this.player.position), 0.9);
    if (e.spawnKey && !e.questTag && Number.isFinite(e.def.respawn) && e.def.respawn < 99999) {
      this.ledger.set(e.spawnKey, realmNow() + e.def.respawn * 1000);
      this.online.mobDead(e.spawnKey, e.def.respawn);
    }
    this.dailies.bump('kill');
    this.festivals.onKill(!!e.def.elite);
    if (e.def.elite) this.audio.sting('victory');
    this.activities.onKilled(e);
    this.dungeons.onKilled(e);
    // A Bright-cut piece (data/armour.ts): anything, anywhere, about one kill in four thousand, and
    // always a piece you haven't found before
    if (Math.random() < 1 / 4000) {
      const left = BRIGHTCUT.filter((id) => !this.flag('brightcut:' + id));
      if (left.length && this.inv.canAdd(left[0])) {
        const id = left[Math.floor(Math.random() * left.length)];
        this.setFlag('brightcut:' + id, 1);
        this.give(id, 1);
        this.hud.banner(ITEMS[id].name, 'Something very rare', true);
        this.audio.sting('victory');
        this.hud.system(`Among what the ${e.def.name.toLowerCase()} left behind: ${ITEMS[id].name}. Pale blue, cut square. Nobody knows who made it. (${5 - left.length + 1} of 5)`);
      }
    }
    this.addXp('melee', e.def.xp);
    const [lo, hi] = e.def.marks;
    const m = Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (this.fx.has('fortune') ? 1.33 : 1));
    if (m > 0) this.addMarks(m);
    if (this.fx.has('howl')) this.furyUntil = this.elapsed + 6;
    if (this.fx.has('second_wind')) this.healSelf(this.maxHp * 0.06);
    if (!e.questTag) for (const d of NAMED_BY_SOURCE.get(e.def.type) ?? []) if (Math.random() < d.named!.chance) this.claimNamed(d.id);
    const reg = regionAt(e.home.x, e.home.z).a, pieces = REGION_ARMOUR[reg];
    if (e.def.type.startsWith('r_')) this.gainStanding(reg, GAINS.rare);
    else if (WORLD_BOSSES.some((b) => b.type === e.def.type)) this.gainStanding(reg, GAINS.boss);
    const source: DropSource = e.isBoss ? 'boss' : e.def.elite || e.def.type.startsWith('r_') ? 'elite' : 'mob';
    if (pieces && !e.questTag && Math.random() < (e.def.elite ? 0.25 : 0.03)) this.give(this.dropped(pieces[Math.floor(Math.random() * pieces.length)], source), 1);
    // The region's own weapons, now and then
    const arms = REGION_WEAPONS[reg];
    if (arms && !e.questTag && Math.random() < (e.def.elite ? 0.15 : 0.02)) this.give(this.dropped(arms[Math.floor(Math.random() * arms.length)], source), 1);
    for (const l of e.def.loot) {
      if (Math.random() < l.chance) {
        const got = this.dropped(l.item, source);
        this.give(got, l.min ?? 1);
        // Gear is a sidegrade, so say what it trades
        const d = ITEMS[got];
        if ((d.weapon || d.armor) && d.stats) this.hud.system(`${d.name}: ${d.stats}`);
      }
    }
    // Old Notch is one wolf, not a kind of wolf: once he's dead, he stays dead.
    if (e.def.type === 'notch') e.respawnIn = Infinity;
    if (e.def.type === 'notch' && !this.flag('notchKilled')) {
      this.setFlag('notchKilled');
      this.hud.banner('Old Notch', 'Felled near the Lantern', true);
    }
    // Every kill is counted by creature type, for bounties.
    this.setFlag('killed:' + e.def.type, Number(this.flag('killed:' + e.def.type) ?? 0) + 1);
    if (e.questTag) {
      const k = 'kills:' + e.questTag;
      this.setFlag(k, Number(this.flag(k) ?? 0) + 1);
      e.respawnIn = Infinity;
      this.hud.setTracker(this.questEntries());
    }
    if (this.target === e) this.target = null;
    this.particles.burst(tmpV.copy(e.pos).setY(e.pos.y + 0.6), '#ffd080', 16);
  }

  private hitPlayer(dmg: number, from: Enemy): void {
    if (this.dead || this.dev.god) return;
    if (this.iframes > 0) {
      // Brine: an attack rolled through gives back a little health, once a roll
      if (this.gearSet === 'brine' && !this.rolledThrough) {
        this.rolledThrough = true;
        const h = Math.min(this.maxHp - this.hp, Math.round(this.maxHp * 0.06));
        if (h > 0) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
      }
      return;
    }
    const armor = this.armour.defense;
    // Defence takes a share of the blow, with diminishing returns (D/(D+40)): see data/armour.ts
    const fx = this.fx;
    if (from.weakLeft > 0) dmg *= 0.85; // tarnished by Verdigris greaves
    let taken = Math.round(this.kit.incoming(Math.max(1, dmg * (0.9 + Math.random() * 0.2) * (1 - armor / (armor + 40))), from));
    if (taken <= 0) { this.floatAt(this.player.position, 2.2, 'Absorbed', 'heal'); this.lastCombat = this.elapsed; return; }
    // The barnacle coat when you're low; Whiteface's ruff after a quiet spell
    if (fx.has('last_stand') && this.hp < this.maxHp / 3) taken = Math.max(1, Math.round(taken * 0.75));
    if (fx.has('stone_skin') && this.elapsed - this.lastHurt > 8) taken = Math.max(1, Math.round(taken * 0.5));
    this.lastHurt = this.elapsed;
    this.hp -= taken;
    // In the Cockpit nobody dies: a duellist's blow that leaves you at a quarter, and you yield
    if (this.activities.duels.playerHit(from, this.hp, this.maxHp)) this.hp = Math.max(this.hp, 1);
    // The Rust Queen's gauntlets give a third of it back; the sexton's helm wards you below half health
    if (fx.has('thorns') && from.alive) this.dealDamage(from, taken * 0.33, false, true);
    if (fx.has('glassward') && this.hp > 0 && this.hp < this.maxHp / 2 && this.elapsed - this.glassAt > 60) {
      this.glassAt = this.elapsed;
      this.kit.addShield(this.maxHp * 0.2, 8);
      this.floatAt(this.player.position, 2.6, 'Warded', 'heal');
    }
    this.lastCombat = this.elapsed;
    this.dismount();
    this.hitAnim = 0.3;
    this.sfx('hurt');
    this.rig.addShake(0.25);
    this.floatAt(this.player.position, 2.2, `-${taken}`, 'player');
    this.hud.hurt(taken / this.maxHp);
    const away = tmpV.subVectors(this.player.position, from.pos).setY(0).normalize();
    if (!this.kit.steady()) this.player.velocity.addScaledVector(away, 5);
    if (!this.target || !this.target.alive) this.target = from;
    if (this.action || this.craftAction) this.cancelActions();
    if (this.hp <= 0) this.die();
  }

  /** Caught by the ground itself (a vent, a falling stone): so much of your health. Rolling clear, or a
   *  shield, saves you; armour doesn't. */
  private hurtByGround(share: number, at: THREE.Vector3, what: string): void {
    if (this.dead || this.iframes > 0) return;
    const taken = Math.round(this.kit.incoming(this.maxHp * share));
    if (taken <= 0) { this.floatAt(this.player.position, 2.2, 'Absorbed', 'heal'); return; }
    this.hp -= taken;
    this.dismount();
    this.hitAnim = 0.3;
    this.sfx('hurt');
    this.rig.addShake(0.3);
    this.floatAt(this.player.position, 2.2, `-${taken}`, 'player');
    this.hud.hurt(taken / this.maxHp);
    const away = tmpV.subVectors(this.player.position, at).setY(0);
    if (away.lengthSq() < 0.01) away.set(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    if (!this.kit.steady()) this.player.velocity.addScaledVector(away.normalize(), 6);
    if (this.action || this.craftAction) this.cancelActions();
    if (this.hp <= 0) { this.hud.system(`${what}: you went down.`); this.die(); }
  }

  private die(): void {
    this.hp = 0;
    this.dead = true;
    this.deadTimer = 0;
    this.attack = null;
    this.cancelActions();
    this.endDialogue();
    this.player.locked = true;
    this.hud.setDeath(true);
    this.sfx('death');
  }

  /** Up again where you fell (a healer's work), with this share of your health. */
  private raise(share: number): void {
    if (!this.dead) return;
    this.dead = false;
    this.player.locked = false;
    this.hp = Math.max(1, Math.round(this.maxHp * share));
    this.hud.setDeath(false);
    this.iframes = 1.2;
  }

  private respawn(): void {
    this.dead = false;
    this.player.locked = false;
    this.hp = Math.round(this.maxHp * 0.6);
    // Back on your feet in the square at Hollin Ford, by the Charter Post (clear of the Moot Oak's benches),
    // or at the start of the dungeon you're in
    const start = this.dungeons.respawnAt();
    if (start) this.player.teleport(start[0], start[1], start[2]);
    else this.player.teleport(152.5, 19, 185.5);
    this.player.standClear();
    this.rig.snap(this.player.position);
    this.target = null;
    this.hud.setDeath(false);
    for (const e of this.enemies) if (e.alive && e.state !== 'idle') e.state = 'return';
  }

  // =================================================================== Frame
  private moveVector(): THREE.Vector3 {
    const f = this.input.held('KeyW') || this.input.held('ArrowUp') ? 1 : 0;
    const b = this.input.held('KeyS') || this.input.held('ArrowDown') ? 1 : 0;
    const l = this.input.held('KeyA') || this.input.held('ArrowLeft') ? 1 : 0;
    const r = this.input.held('KeyD') || this.input.held('ArrowRight') ? 1 : 0;
    const yaw = this.rig.yaw;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const v = fwd.multiplyScalar(f - b - this.input.moveY).addScaledVector(right, r - l + this.input.moveX);
    if (this.input.leftDown && this.input.rightDown) v.add(new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)));
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  /** Camera and model for character select (model faces the camera) and the creator (drag to turn, two framings). */
  private menuFrame(dt: number): void {
    const m = this.previewModel!;
    const d = STAGE.dir;
    // The square's chunk may still be loading when the model is placed: keep it on the ground.
    const V = this.world.voxels;
    if (V.isLoaded(STAGE.x, STAGE.z)) m.root.position.y = V.groundBelow(STAGE.x, 40, STAGE.z);
    const base = m.root.position;
    const face = Math.atan2(d.x, d.z);
    const creator = this.mode === 'creator';
    m.root.rotation.y = creator ? face + this.previewSpin : face + Math.sin(this.elapsed * 0.35) * 0.18;
    m.setState('idle');
    m.update(dt, 0);
    // (framed for the figure as it stands: everyone is scaled by FIGURE)
    const h = (m.look.height ?? 1) * FIGURE;
    const close = creator && this.creatorView === 'face';
    const right = new THREE.Vector3(d.z, 0, -d.x);
    const pos = base.clone().addScaledVector(d, close ? 2.2 : creator ? 3.8 : 4.5).add(new THREE.Vector3(0, (close ? 1.8 : 1.35) * h, 0));
    const look = base.clone().add(new THREE.Vector3(0, (close ? 1.6 : 1.05) * h, 0));
    // In the creator the options panel covers the left of the screen, so frame the model right of centre.
    if (creator && innerWidth > 860) look.addScaledVector(right, close ? -0.45 : -0.85);
    // On a narrow screen the character list runs across the top: stand back and aim higher so the model sits below it
    if (!creator && innerWidth <= 860) { pos.addScaledVector(d, 0.4); pos.y += 0.25 * h; look.y += 0.85 * h; }
    if (!this.menuCam) this.menuCam = { pos: pos.clone(), look: look.clone() };
    const k = 1 - Math.exp(-dt * 5);
    this.menuCam.pos.lerp(pos, k);
    this.menuCam.look.lerp(look, k);
    this.camera.position.copy(this.menuCam.pos);
    this.camera.lookAt(this.menuCam.look);
  }

  /** Graphics watchdog: the renderer's frame count, and how long it has stood still. */
  private gfxFrame = -1;
  private gfxStuck = 0;

  /**
   * If the GPU drops the WebGL context (a phone rotating, the app going to the background, a driver
   * reset) and it doesn't come back, three.js quietly stops drawing and the world goes black. Save,
   * and reload once; if it happens again straight away, say so instead of reloading in a loop.
   */
  private watchGraphics(dt: number): void {
    const f = this.renderer.info.render.frame;
    if (f !== this.gfxFrame || document.hidden) { this.gfxFrame = f; this.gfxStuck = 0; return; }
    this.gfxStuck += dt;
    if (this.gfxStuck < 2.5) return;
    this.gfxStuck = -1e9; // once
    let last = 0;
    try { last = Number(sessionStorage.getItem('everrealm.gfxReset') ?? 0); } catch { /* none */ }
    if (Date.now() - last < 30000) { this.hud.system('The graphics stopped drawing. Reloading the page will bring them back; your progress is saved.'); return; }
    try { sessionStorage.setItem('everrealm.gfxReset', String(Date.now())); } catch { /* none */ }
    if (this.mode === 'play') this.persist();
    location.reload();
  }

  private frame(dt: number): void {
    this.elapsed += dt;
    this.watchGraphics(dt);
    const w = this.canvasResize();
    void w;
    if (!this.world) { this.renderer.render(this.scene, this.camera); return; }
    const timeScale = 60 / Math.max(1, this.save.settings.dayLength);

    if (this.mode !== 'play') {
      this.orbit += dt * 0.05;
      if (this.mode === 'intro' && this.intro) {
        this.introFrame(dt);
        this.player.update(dt, new THREE.Vector3(), 0, false);
        this.player.model.setState('idle');
        this.player.model.update(dt, 0);
      } else if (this.previewModel) {
        this.menuFrame(dt);
      } else {
        const cx = 166, cz = 186;
        this.camera.position.set(cx + Math.cos(this.orbit) * 46, 40, cz + Math.sin(this.orbit) * 46);
        this.camera.lookAt(cx, 22, cz);
      }
      const focus = this.startPending || this.mode === 'intro' ? this.player.position.clone() : new THREE.Vector3(166, 19, 184);
      if (this.menuPending && this.autoEnter) {
        // Back from a crossing: into the world at once
        this.menuPending = false;
        const id = this.autoEnter;
        this.autoEnter = null;
        this.selectCharacter(id);
        if (id) setLastPlayed(id);
        this.front.hide();
        this.startPlay(false, LAND === 'morrow' ? 'Coming ashore…' : 'Coming home…');
      } else if (this.menuPending && this.world.chunks.isReady(STAGE.x, STAGE.z, 2)) { this.menuPending = false; this.showMenu(); }
      this.world.update(dt, focus, this.elapsed, timeScale * 0.3);
      if (this.startPending && this.world.chunks.isReady(focus.x, focus.z, 2)) {
        // Drop the player onto solid ground if the saved height is stale
        const g = this.world.voxels.groundBelow(focus.x, Math.max(focus.y + 1, 0) + 0.5, focus.z);
        const top = this.world.voxels.topSolid(focus.x, focus.z) + 1;
        // Post-cart arrivals always stand on the real ground at the stop; nothing should be overhead there.
        if ((this.arriving && this.arrivingBy !== 'dungeon') || this.world.voxels.solidAt(focus.x, focus.y + 0.2, focus.z) || focus.y - g > 30) this.player.teleport(focus.x, top, focus.z);
        if (this.startPending.fresh) this.beginIntro();
        else this.finishStart(false);
        return;
      }
      for (const n of this.npcs) if (this.world.voxels.isLoaded(n.pos.x, n.pos.z)) n.update(dt, this.world.sky.hour, this.camera.position);
      // On the menus: only people present for this character, and nobody wandering into the portrait.
      if (this.mode === 'title' || this.mode === 'creator') {
        for (const n of this.npcs) {
          const p = n.model.root.position;
          n.model.root.visible = (!n.def.when || n.def.when(this)) && (!this.previewModel || Math.hypot(p.x - STAGE.x, p.z - STAGE.z) > 8);
        }
      }
      for (const a of this.animals) a.update(dt, this.camera.position);
      this.particles.update(dt);
      this.audio.musicContext({ theme: this.mode === 'intro' ? 'greenwake' : 'title', combat: false });
      this.input.endFrame();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.15; }
    this.save.playTime += dt;
    this.handleInput(dt);
    this.devPanel.update(dt);
    this.updatePlayer(dt);
    this.updateGather(dt);
    this.updateCraft(dt);
    this.updateQuests(dt);

    const P = this.player.position;
    const ctx = {
      player: P,
      playerAlive: !this.dead,
      playerInvulnerable: this.iframes > 0,
      playerSwimming: this.player.swimming,
      level: this.level('melee'),
      hitPlayer: (d: number, from: Enemy) => this.hitPlayer(d, from),
      sound: (name: 'growl' | 'squelch' | 'skitter' | 'swing', at: THREE.Vector3) => this.audio.playAt(name, at.distanceTo(P), 0.8),
    };
    for (const e of this.enemies) {
      if (!this.world.voxels.isLoaded(e.pos.x, e.pos.z)) { e.model.root.visible = false; continue; }
      const d = e.pos.distanceTo(P);
      if (d > 90 && e.state !== 'dead') { e.model.root.visible = false; continue; }
      e.model.root.visible = e.state !== 'dead' || e.model.root.visible;
      e.update(dt, this.dungeons.ctxFor(e, ctx) ?? this.activities.escorts.ctxFor(e, ctx) ?? ctx);
      characterDetail(e.model.root, e.pos.distanceTo(this.camera.position));
    }
    for (const n of this.npcs) {
      const home = n.def.schedule[0].at;
      if (n.def.when && !n.def.when(this)) { n.model.root.visible = false; n.placed = false; continue; }
      // An NPC not yet placed still sits at the origin, so only its home chunk matters until it is.
      if (!this.world.voxels.isLoaded(home[0], home[1]) || (n.placed && !this.world.voxels.isLoaded(n.pos.x, n.pos.z))) { n.model.root.visible = false; n.placed = false; continue; }
      if (!n.placed) { n.place(this.world.sky.hour); n.placed = true; }
      n.model.root.visible = true;
      n.update(dt, this.world.sky.hour, P);
      characterDetail(n.model.root, n.pos.distanceTo(this.camera.position));
      if (n.striking && n.pos.distanceTo(P) < 18) {
        const t = n.model.stateTime % 0.7;
        if (t < dt * 1.01) {
          this.audio.playAt('anvil', n.pos.distanceTo(P), 0.5);
          this.particles.sparks(tmpV.set(185.4, 20.1, 179.6), 6);
        }
      }
    }
    this.npcMusic();
    this.activities.update(dt);
    this.dungeons.update(dt);
    // Out of a cleared dungeon with a click, not a walk back to the ladder
    const cleared = !!this.dungeons.run?.done;
    if (cleared !== this.leaveShown) { this.leaveShown = cleared; this.hud.setLeaveButton(cleared ? `Leave ${this.dungeons.run!.def.name}` : null, () => this.dungeons.leave()); }
    this.hazards.update(dt);
    this.stables.update(dt, P);
    this.crowd.update(dt, P, this.camera.position, this.world.sky.hour, !!this.dialogue || this.dead);
    this.roadfolk.update(dt, P, this.camera.position, this.enemies, this.elapsed, !!this.dialogue || this.dead);
    this.checkFeats(dt);
    this.waymarkStones.update(P, this.elapsed);
    this.festivals.update(dt, P);
    this.seasons.update(dt, P);
    if (this.flag('apprentice') !== this.appliedApprentice) this.applyCalling();
    if (this.flag('talentsRedrawn')) {
      this.setFlag('talentsRedrawn', 0);
      this.hud.banner('Talents redrawn', 'Your points are back to spend', true);
      this.hud.system('The talent trees have been redrawn: six tiers each, with ranks, and a capstone that changes how your calling plays. Your old picks are gone and every point is back. Spend them in the journal, under Calling.');
    }
    this.home.update();
    // A let room's furniture goes when the rent runs out, and comes back when it's paid
    const paid = !!readTenancy(this.flag('flat')) && (readTenancy(this.flag('flat'))!.until > Date.now());
    if (paid !== this.letPaid) { this.letPaid = paid; if (!this.home.visiting) this.home.render(); if (!paid && readTenancy(this.flag('flat'))) this.hud.system('The rent on your room has run out. Your things are safe; pay at the door to get back in.'); }
    this.planner.update();
    this.bank.update();
    if (this.parked && this.parked.model.root.position.distanceTo(this.player.position) < 90) this.parked.model.update(dt, 0);
    // The house on the lots: a host's while you visit them, otherwise your own
    if (!this.home.visiting) this.visitPlot = null;
    this.building.show(this.home.visiting ? this.visitPlot : readPlot(this.flag('plot')));
    // Well rested: half an hour of play at a quarter more experience, after a night in your own bed
    const rested = Number(this.flag('rested') ?? 0);
    if (rested > 0) {
      const left = rested - dt;
      this.setFlag('rested', left > 0 ? left : 0);
      if (left <= 0) this.hud.system("The good night's sleep has worn off.");
    }
    this.social.update(dt);
    for (const a of this.animals) {
      const far = a.pos.distanceTo(P) > 90 || !this.world.voxels.isLoaded(a.pos.x, a.pos.z);
      a.model.root.visible = !far;
      if (far) continue;
      a.update(dt, P, this.player.speed);
      characterDetail(a.model.root, a.pos.distanceTo(this.camera.position));
    }
    this.particles.update(dt);
    this.world.update(dt, P, this.elapsed, timeScale);
    // Doors open for anyone walking up to them: you, other players, the villagers
    const movers = [P, ...[...this.online.remotes.values()].map((r) => r.model.root.position), ...this.npcs.filter((n) => n.placed !== false).map((n) => n.pos)];
    updateDoors(this.world.doors(), dt, movers, P, (open) => this.sfx(open ? 'doorOpen' : 'doorShut', 0.6));
    this.voyage.update(dt);
    this.rig.ceiling = this.player.underwater ? this.player.waterTop - 0.3 : Infinity; // follow a diver down
    this.rig.update(dt, this.horse ? tmpV.set(P.x, P.y + 0.9, P.z) : P);
    const ind = this.world.shared.uIndoor;
    ind.value += ((this.rig.indoor ? 1 : 0) - ind.value) * Math.min(1, dt * 4);
    if (this.cine) {
      const c = this.cine, [vx, vy, vz, lx, ly, lz] = c.view, DUR = 7;
      c.t += dt;
      const a = (c.t / DUR) * Math.PI * 1.25 - 0.4, r = 26 + c.t * 2.2;
      this.camera.position.set(vx + Math.cos(a) * r, vy + 10 + Math.sin(c.t * 0.6) * 2, vz + Math.sin(a) * r);
      this.camera.lookAt(lx, ly, lz);
      if (c.t >= DUR) { this.cine = null; this.player.locked = false; this.hud.setHudHidden(false); c.then(); }
    }
    this.justice.update(dt);
    this.world.sky.underwater = this.world.voxels.isWater(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.player.model.root.visible = this.rig.actualDistance > 1.1 || this.justice.busy;
    // In first person you face where you look
    if (this.rig.firstPerson && !this.dialogue && !this.action && !this.craftAction) this.player.yaw = this.rig.yaw - Math.PI;
    this.ambientFx(dt);
    this.respawnNodes();
    this.updateHud(dt);

    this.autosave += dt;
    if (this.autosave > 20) { this.autosave = 0; this.persist(); }
    this.input.endFrame();
    // Your character in the pack, while it's open (drawn first; the frame goes over it)
    const dc = this.hud.dollCanvas;
    if (dc?.isConnected && dc.clientWidth) {
      this.doll.set(this.wornLook(), this.save.equip.weapon ? ITEMS[this.save.equip.weapon]?.weapon?.held ?? 'none' : 'none');
      this.doll.yaw = this.hud.dollYaw += dt * 0.25;
      this.doll.draw(this.renderer, dt, dc);
    }
    this.renderer.render(this.scene, this.camera);
    if (this.debug) {
      this.fpsAcc.t += dt; this.fpsAcc.n++;
      if (this.fpsAcc.t > 0.5) {
        const i = this.renderer.info;
        this.hud.setFps(`${Math.round(this.fpsAcc.n / this.fpsAcc.t)} fps · ${i.render.calls} calls · ${(i.render.triangles / 1000).toFixed(0)}k tris · ${P.x.toFixed(1)}, ${P.y.toFixed(1)}, ${P.z.toFixed(1)}`);
        this.fpsAcc = { t: 0, n: 0 };
      }
    }
  }

  private canvasResize(): boolean {
    const canvas = this.renderer.domElement;
    const scale = this.save.settings.renderScale;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
    const w = Math.max(1, Math.floor(canvas.clientWidth)), h = Math.max(1, Math.floor(canvas.clientHeight));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      return true;
    }
    return false;
  }

  private handleInput(dt: number): void {
    const I = this.input;
    // Dialogue captures number keys and Escape.
    if (this.dialogue) {
      for (let k = 1; k <= 9; k++) if (I.pressedOnce('Digit' + k)) this.hud.dialogueKey(k - 1);
      if (I.pressedOnce('Space') || I.pressedOnce('Enter')) this.hud.dialogueKey(0);
      if (I.pressedOnce('Escape')) this.endDialogue();
      if (this.dialogue && this.dialogue.npc.pos.distanceTo(this.player.position) > 6) this.endDialogue();
      if (I.dragX || I.dragY) this.rig.rotate(I.dragX, I.dragY);
      if (I.wheel) this.rig.zoom(I.wheel);
      return;
    }
    if (I.pressedOnce('F8')) this.devPanel.toggle();
    if (this.planner.lot && I.pressedOnce('Escape')) this.planner.close();
    if (this.bank.open && I.pressedOnce('Escape')) this.bank.close();
    if (this._mountPick?.open && I.pressedOnce('Escape')) this._mountPick.close();
    if (this.home.active) {
      // Arranging the house: E sets the held piece down, R turns it, X picks up the nearest
      if (I.pressedOnce('KeyE')) { this.home.place(); this.hud.refresh(); this.persist(); }
      if (I.pressedOnce('KeyR')) this.home.rotate();
      if (I.pressedOnce('KeyX')) { this.home.pickUp(); this.hud.refresh(); this.persist(); }
      if (I.pressedOnce('Escape')) this.home.stop();
    }
    if (I.pressedOnce('Escape')) {
      if (!this.devPanel.close() && !this.hud.closeAll()) {
        if (this.target) this.target = null;
        else this.hud.show('settings');
      }
      this.currentStation = null;
    }
    if (I.pressedOnce('KeyI') || I.pressedOnce('KeyB')) this.hud.toggle('inv');
    if (I.pressedOnce('KeyK')) this.hud.toggle('skills');
    if (I.pressedOnce('KeyJ')) this.hud.toggle('journal');
    if (I.pressedOnce('KeyM')) this.hud.toggle('map');
    if (I.pressedOnce('KeyO')) this.hud.toggle('guild');
    if (I.pressedOnce('KeyP')) this.hud.toggle('finder');
    const enter = I.pressedOnce('Enter'), slash = I.pressedOnce('Slash');
    if (enter || slash) {
      this.input.down.clear();
      this.hud.openChat((t) => this.say(t), slash && !enter ? '/' : '');
    }
    if (I.dragX || I.dragY) this.rig.rotate(I.dragX, I.dragY);
    if (I.wheel) this.rig.zoom(I.wheel);
    if (this.dead) return;

    if (this.hud.picking) return; // the lock has your hands
    if (I.pressedOnce('KeyN')) this.hud.toggle('music');
    if (this.music.out) {
      const up = I.held('ShiftLeft') || I.held('ShiftRight');
      for (let k = 1; k <= 8; k++) if (I.pressedOnce('Digit' + k)) this.music.key(k - 1, up);
    } else {
      for (let k = 1; k <= 8; k++) if (I.pressedOnce('Digit' + k)) this.useAbility(k - 1);
      if (I.pressedOnce('KeyQ')) this.useAbility(8);
      if (I.pressedOnce('KeyF')) this.useAbility(9);
    }
    if (I.pressedOnce('Tab')) this.cycleTarget();
    if (I.pressedOnce('KeyG')) this.toggleMount();
    if (I.pressedOnce('KeyL') && (this.inv.count('torch') > 0 || this.inv.count('belt_lantern') > 0)) {
      const off = !this.flag('lightOff');
      this.setFlag('lightOff', off);
      this.hud.system(off ? 'You put your light out.' : 'You light your light again. It burns once it\'s dark.');
      this.sfx(off ? 'snort' as Sfx : 'click');
    }

    const ePressed = I.pressedOnce('KeyE');
    if (ePressed) {
      if (!this.pullLine()) {
        if (this.candidate && !(this.action && this.action.kind !== 'fish')) this.interact(this.candidate);
        else if (this.action) this.cancelActions();
      }
    }
    if (I.click) {
      if (this.action?.kind === 'fish' && this.pullLine()) return;
      const other = this.pickPlayer(I.click.x, I.click.y);
      if (other) {
        const name = other.name;
        this.hud.playerMenu(name, I.click.x, I.click.y, [
          ...(this.social.isAlly(other.id) ? [] : [{ label: 'Invite to group', act: () => this.social.invite(name) }]),
          ...(this.social.canInviteToGuild && !this.online.remotes.get(other.id)?.guild ? [{ label: 'Invite to guild', act: () => this.social.guildInvite(name) }] : []),
          { label: 'Trade', act: () => this.social.ask(name) },
          { label: 'Whisper', act: () => this.hud.openChat((t) => this.say(t), `/w ${name} `) },
          ...(this.social.isFriend(name) ? [] : [{ label: 'Add friend', act: () => this.social.addFriend(name) }]),
          { label: 'Visit their home', act: () => this.online.homeAsk(name) },
          { label: 'Wave', act: () => this.doEmote('wave') },
          this.isIgnored(name) ? { label: 'Stop ignoring', act: () => this.say('/unignore ' + name) } : { label: 'Ignore', act: () => this.say('/ignore ' + name) },
          { label: 'Report…', act: () => this.hud.openChat((t) => this.say(t), `/report ${name} `) },
        ]);
        return;
      }
      const picked = this.pick(I.click.x, I.click.y);
      if (picked instanceof Enemy) {
        this.target = picked;
        if (picked.pos.distanceTo(this.player.position) < 4) this.strike();
      } else if (picked instanceof Npc) {
        if (picked.pos.distanceTo(this.player.position) < 4.5) this.startDialogue(picked);
        else this.hud.system(`${picked.def.name} is too far away to talk to.`);
      } else if (!this.hud.isOpen('map') && !this.horse) this.strike();
    }
    // Moving cancels gathering and crafting.
    const mv = this.moveVector();
    if (mv.lengthSq() > 0.01 && (this.action || this.craftAction)) this.cancelActions();
    if (this.currentStation && this.hud.isOpen('craft')) {
      const st = this.stationAt(this.currentStation);
      if (Math.hypot(st.x - this.player.position.x, st.z - this.player.position.z) > 4) { this.hud.close('craft'); this.currentStation = null; }
    } else if (!this.hud.isOpen('craft')) this.currentStation = null;
    if (this.hud.isOpen('travel')) {
      const p = POSTS.find((x) => x.id === this.currentPost);
      if (!p || Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) > 5) this.hud.close('travel');
    }
    // The letters close when you walk away from the post box, and the book when you leave the broker
    if (this.hud.isOpen('mail') && this.mailAt && Math.hypot(this.mailAt.x - this.player.position.x, this.mailAt.z - this.player.position.z) > 5) this.hud.close('mail');
    if (this.hud.isOpen('exchange') && !this.npcs.some((n) => (n.id === 'wray' || n.id === 'tregear' || n.id === 'pound') && n.pos.distanceTo(this.player.position) < 6)) this.hud.close('exchange');
    if (this.hud.isOpen('shop')) {
      if (this.currentShop === 'festival') { if (!this.festivals.stallNear(this.player.position, 6)) this.hud.close('shop'); }
      else if (this.currentShop.startsWith('pedlar_')) { if (!this.roadfolk.pedlarsNear(this.player.position, 6).some((x) => 'pedlar_' + x.id === this.currentShop)) this.hud.close('shop'); }
      else {
        const t = this.npcs.find((n) => n.id === SHOPS[this.currentShop].owner);
        if (!t || t.pos.distanceTo(this.player.position) > 6) this.hud.close('shop');
      }
    }
    void dt;
  }

  /** Another player under the cursor, nearer than anything else in the way. */
  private pickPlayer(x: number, y: number): { id: number; name: string } | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), this.camera);
    let best: { id: number; name: string } | null = null, bd = 30;
    for (const r of this.online.remotes.values()) {
      const c = r.model.root.position;
      const hit = ray.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(c.x, c.y + 1.1, c.z), 0.8), tmpV);
      if (!hit) continue;
      const d = hit.distanceTo(this.camera.position);
      if (d < bd) { bd = d; best = { id: r.id, name: r.name }; }
    }
    return best;
  }

  private pick(x: number, y: number): Enemy | Npc | null {
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    let best: Enemy | Npc | null = null;
    let bestD = Infinity;
    const test = (obj: THREE.Object3D, center: THREE.Vector3, r: number, ref: Enemy | Npc) => {
      if (!obj.visible) return;
      const s = new THREE.Sphere(center, r);
      const hit = ray.ray.intersectSphere(s, tmpV);
      if (hit) { const d = hit.distanceTo(this.camera.position); if (d < bestD) { bestD = d; best = ref; } }
    };
    for (const e of this.enemies) if (e.alive) test(e.model.root, tmpV2.copy(e.pos).setY(e.pos.y + 0.6), e.def.elite ? 1.4 : 0.9, e);
    for (const n of this.npcs) test(n.model.root, new THREE.Vector3(n.pos.x, n.pos.y + 1.1, n.pos.z), 0.75, n);
    return best;
  }

  private updatePlayer(dt: number): void {
    const P = this.player;
    for (const k of Object.keys(this.cds) as (keyof typeof this.cds)[]) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.hitAnim = Math.max(0, this.hitAnim - dt);
    this.healAnim = Math.max(0, this.healAnim - dt);
    this.kit.update(dt);

    if (this.dead) {
      this.deadTimer += dt;
      P.model.setState('dead');
      P.update(dt, new THREE.Vector3(), 0, false);
      P.model.update(dt, 0);
      if (this.deadTimer > (this.dungeons.raising ? 9 : 3.5)) this.respawn();
      return;
    }

    // Attacks
    if (this.attack) {
      const a = this.attack;
      a.t += dt;
      if (!a.hit && a.t >= a.hitAt) { a.hit = true; this.resolveAttack(); }
      if (a.t >= a.dur) {
        this.attack = null;
        this.comboWindow = 0.6;
        if (this.queuedStrike) { this.queuedStrike = false; this.cds.strike = 0; this.strike(); }
      }
    }

    // Healing
    if (this.healOverTime.left > 0) {
      const h = Math.min(this.healOverTime.left, dt) * this.healOverTime.perSec;
      this.healOverTime.left -= dt;
      this.hp = Math.min(this.maxHp, this.hp + h);
      if (Math.random() < dt * 6) this.particles.heal(P.position);
    }
    const moss = this.fx.has('regrowth');
    if (this.elapsed - this.lastCombat > (moss ? 3 : 6) && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.035 * (moss ? 1.5 : 1) * dt);

    const mv = this.dialogue || this.attack?.kind === 'cleave' ? new THREE.Vector3() : this.moveVector();
    const sprint = this.input.held('ShiftLeft') || this.input.held('ShiftRight');
    // A wagon rolls a little slower than a horse alone
    const haul = this.horse && ITEMS[this.flag('mount') as string]?.mount?.wagon ? 0.85 : 1;
    if (this.energy <= 0.5 && !this.winded) { this.winded = true; this.hud.system('You\'re winded. Walk it off.'); }
    else if (this.winded && this.energy >= 50) this.winded = false;
    let speed = this.horse ? 9.6 * haul : this.winded ? 3.6 : 5.4;
    if (sprint && mv.lengthSq() > 0.01 && this.energy > 1 && !this.winded) { speed = this.horse ? 13 * haul : 8.0; this.energy = Math.max(0, this.energy - dt * (this.gearSet === 'tollriders' ? 7 : 14) * (this.horse ? 0.6 : 1)); }
    else this.energy = Math.min(100, this.energy + dt * (this.elapsed - this.lastCombat > 3 ? 22 : 12) * (1 + this.armour.wind + this.buffSum('regen')) * (this.winded ? 0.5 : 1));
    this.tickBuffs(dt);
    this.hud.setBuffs(this.buffList());
    if (this.attack) speed *= 0.35;
    if (this.dev.fast) speed *= 2.5;
    if (!this.fx.has('mudwalker')) speed *= this.hazards.slow;
    if (this.fx.has('drover') && this.elapsed - this.lastCombat > 3) speed *= 1.12;
    const jump = this.input.pressedOnce('Space') && !this.dialogue;
    // Moving, jumping, fighting or working puts an instrument away, and ends an emote (the short ones end on their own)
    if (this.music.out && (mv.lengthSq() > 0.01 || jump || this.attack || this.action || this.craftAction || P.swimming || this.horse || this.dead)) this.music.away();
    if (this.emote) {
      this.emote.left -= dt;
      if (mv.lengthSq() > 0.01 || jump || this.attack || this.action || this.craftAction || P.swimming || this.horse || this.hitAnim > 0 || (this.emote.left <= 0 && emoteById(this.emote.id)!.secs > 0)) this.emote = null;
    }
    // Swimming: Space rises, C dives, and underwater you swim where the camera looks
    const wasSwimming = P.swimming;
    P.rise = !this.dialogue && this.input.held('Space');
    P.sink = !this.dialogue && this.input.held('KeyC');
    P.swimAim = THREE.MathUtils.clamp((0.32 - this.rig.pitch) * 1.2, -1.2, 1.2);
    let fall: number;
    const seat = this.pillion !== null ? this.online.seatOf(this.pillion) : null;
    if (this.pillion !== null && (!seat || jump || this.dead)) this.leavePillion();
    if (this.pillion !== null && seat) {
      P.seat = seat.lift;
      this.pillionPose = seat.pose;
      P.position.set(seat.x, seat.y, seat.z);
      P.velocity.set(0, 0, 0);
      P.yaw = seat.yaw;
      P.fallStartY = seat.y;
      fall = 0;
    } else if (this.dash) {
      // A leap arcs; a shadowstep is near enough instant
      const d = this.dash, V = this.world.voxels;
      d.t += dt;
      const k = Math.min(1, d.t / d.dur);
      const wet = V.get(Math.floor(d.tx), Math.floor(d.ty + 1), Math.floor(d.tz)) === B.Water && P.swimming;
      const gy = wet ? d.fy + (d.ty - d.fy) * k : Math.max(d.fy, P.position.y);
      P.position.set(d.fx + (d.tx - d.fx) * k, gy + (d.dur > 0.2 && !wet ? Math.sin(Math.PI * k) * 2.2 : 0), d.fz + (d.tz - d.fz) * k);
      P.velocity.set(0, 0, 0);
      if (k >= 1 && wet) {
        // In the water there's no ground to land on: stop where the leap was going, if there's room
        this.dash = null;
        const tx = Math.floor(d.tx), ty = Math.floor(d.ty), tz = Math.floor(d.tz);
        if (isSolid(V.get(tx, ty, tz)) || isSolid(V.get(tx, ty + 1, tz))) P.position.set(d.fx, d.fy, d.fz);
        this.particles.bubbles(tmpV.copy(P.position).setY(P.position.y + 0.9), 12);
      } else if (k >= 1) {
        this.dash = null;
        // Land where there's room to stand, at the target's height: next to it if the spot itself is
        // taken, back where you started if nowhere near is free. Never up onto a roof or a hilltop.
        const free = (x: number, y: number, z: number) => !isSolid(V.get(x, y, z)) && !isSolid(V.get(x, y + 1, z)) && isSolid(V.get(x, y - 1, z));
        let spot: [number, number, number] | null = null;
        const baseY = Math.round(d.ty);
        search: for (const r of [0, 0.8, 1.5]) for (let a = 0; a < (r ? 8 : 1); a++) {
          const x = Math.floor(d.tx + Math.cos((a * Math.PI) / 4) * r), z = Math.floor(d.tz + Math.sin((a * Math.PI) / 4) * r);
          for (const dy of [0, 1, -1, 2, -2]) if (free(x, baseY + dy, z)) { spot = [x + 0.5, baseY + dy, z + 0.5]; break search; }
        }
        if (spot) P.position.set(spot[0], spot[1], spot[2]);
        else P.position.set(d.fx, d.fy, d.fz);
        this.particles.dust(P.position, 10);
      }
      fall = P.update(dt, new THREE.Vector3(), 0, false);
      // A leap, a step or a spring is never a fall
      fall = 0;
      P.fallStartY = P.position.y;
    } else {
      const grounded = P.onGround;
      fall = P.update(dt, mv, speed, jump);
      if (jump && grounded && !P.onGround && !P.swimming && !this.horse) this.sfx('jump', 0.6);
    }
    if (P.swimming !== wasSwimming) document.body.classList.toggle('swimming', P.swimming);
    // The first dive: how fighting works down here
    if (P.underwater && !this.flag('tipDive')) {
      this.setFlag('tipDive', 1);
      this.hud.system('Underwater you fight as you do on land, and your dodge is a kick in any direction. Sea creatures only hunt swimmers: climb out and they leave you be.');
    }
    this.travelled += P.speed * dt;
    if (this.travelled >= 50) { this.dailies.bump('travel', Math.floor(this.travelled)); this.travelled %= 1; }
    document.body.classList.toggle('riding', !!this.horse);
    // After dark or underground, the light you carry: a torch in your free hand (on foot or riding),
    // or the lantern at your belt when a bow fills both hands; L puts it out
    {
      if ((this.darkT -= dt) <= 0) { this.darkT = 0.5; this.underCover = this.world.voxels.topSolid(P.position.x, P.position.z) > P.position.y + 3; }
      const want = !this.flag('lightOff') && (this.world.sky.night > 0.45 || this.underCover) && !P.swimming && !this.dead && !this.justice.jailed;
      const hand = want && this.inv.count('torch') > 0 && !this.bowInHand && !this.music.out;
      const belt = want && !hand && this.inv.count('belt_lantern') > 0;
      P.model.setTorch(hand);
      P.model.setLantern(belt);
      P.model.setPack(this.flag('hidePack') ? 0 : Number(this.flag('packLook') ?? 0));
      const at = hand ? P.model.torchAt(tmpV2) : belt ? P.model.lanternAt(tmpV2) : null;
      if (at) { this.torchLight.position.copy(at); this.torchLight.intensity = (hand ? 12 : 9) + Math.sin(performance.now() * 0.02) * 0.8 + Math.sin(performance.now() * 0.047) * 0.6; }
      else this.torchLight.intensity = 0;
    }
    if (this.horse) {
      if (P.swimming || !this.roomForHorse()) this.dismount();
      else {
        P.footPosition(this.horse.root.position);
        this.horse.root.rotation.y = P.facing;
        this.horse.setAnim(!P.onGround ? 'run' : P.speed > 10.5 ? 'run' : P.speed > 0.4 ? 'walk' : 'idle');
        this.horse.update(dt, P.speed);
        characterDetail(this.horse.root, this.horse.root.position.distanceTo(this.camera.position));
        if (P.onGround && P.speed > 9 && Math.random() < dt * 8) this.particles.dust(P.position, 1);
      }
    }
    if (P.swimming && !wasSwimming && P.velocity.y < -3) {
      this.particles.splash(tmpV.set(P.position.x, P.waterTop, P.position.z), 22);
      this.sfx('splash', 0.8);
    }
    if (P.swimming && !P.underwater && P.speed > 1) {
      this.wakeTimer -= dt;
      if (this.wakeTimer <= 0) {
        this.wakeTimer = 0.28;
        this.particles.ripple(tmpV.set(P.position.x, P.waterTop - 0.05, P.position.z));
        if ((this.strokes = (this.strokes + 1) % 2) === 0) this.sfx('swim', 0.4);
      }
    }
    if (fall > 5 && !this.dev.god) {
      const dmg = Math.round((fall - 4) * 7);
      this.hp -= dmg;
      this.floatAt(P.position, 2.2, `-${dmg}`, 'player');
      this.sfx('hurt');
      this.rig.addShake(0.2);
      if (this.hp <= 0) this.die();
    }
    if (fall > 1.5) { this.particles.dust(P.position, 6); this.sfx('land', Math.min(1, fall / 4)); }

    // Footsteps
    if (P.onGround && P.speed > 1) {
      this.stepTimer -= dt * (P.speed / 5);
      if (this.stepTimer <= 0) { this.stepTimer = this.horse ? 0.62 : 0.36; this.sfx(this.horse ? 'hoof' : this.stepSound(), this.horse ? 0.6 : 0.5); }
    }

    // Animation state
    const M = P.model;
    // A weapon by its id, so it's drawn as itself (and others see it so); tools by name
    const wid = this.save.equip.weapon;
    let held: HeldItem | string = wid ? (ITEMS[wid]?.weapon?.model ? wid : ITEMS[wid]?.weapon?.held ?? 'none') : 'none';
    if (this.lawPose) { M.setState(this.lawPose); held = 'none'; }
    else if (P.rolling > 0) M.setState('roll');
    else if (this.attack) { if (M.state !== 'attack' && M.state !== 'cleave') M.setState(this.attack.kind === 'cleave' ? 'cleave' : 'attack'); }
    else if (this.healAnim > 0) M.setState('heal');
    else if (this.music.out && !this.horse) { M.setState('perform'); held = this.music.out.item; }
    else if (this.emote && !this.horse) M.setState(this.emote.id);
    else if (this.action) {
      held = ITEMS[this.action.tool].tool!.held;
      if (this.action.kind === 'fish') M.setState(this.action.phase === 'cast' ? 'fishCast' : 'fishWait');
      else M.setState(this.action.kind === 'mine' ? 'mine' : 'chop');
    } else if (this.craftAction) {
      const st = this.craftAction.station;
      M.setState(st === 'anvil' || st === 'bench' ? 'hammer' : st === 'hearth' ? 'cook' : 'bellows');
      held = st === 'anvil' ? 'hammer' : st === 'furnace' ? 'tongs' : 'none';
    } else if (this.horse || this.pillion !== null) { M.setState(this.horse ? riderPose(ITEMS[this.flag('mount') as string]?.mount) : this.pillionPose); held = 'none'; }
    else if (this.hitAnim > 0) M.setState('hit');
    else if (P.swimming) M.setState(P.speed > 0.6 || Math.abs(P.velocity.y) > 1.2 ? 'swim' : 'tread');
    else if (!P.onGround && !P.swimming) M.setState('jump');
    else if (P.speed > 0.4) M.setState(P.speed > 6.5 ? 'run' : 'walk');
    else M.setState('idle');
    M.setHeld(P.swimming && (M.state === 'swim' || M.state === 'tread') ? 'none' : held);
    M.swimPitch = P.swimPitch;
    M.update(dt, P.speed, !P.onGround && !P.swimming);
    this.online.update(dt, { x: P.position.x, y: P.position.y, z: P.position.z, yaw: P.yaw, anim: M.state, held, mount: this.horse ? this.mountKeyOf(this.flag('mount') as string) : null, pillion: this.pillion });
    this.music.update();
    this.chests.update();
    // Town pets come and go with you, each keeping its own spot
    for (const pt of this.pets) {
      const d = Math.hypot(pt.x - this.player.position.x, pt.z - this.player.position.z);
      if (!pt.a && d < 90 && this.world.voxels.isLoaded(pt.x, pt.z)) {
        pt.a = new Animal(pt.kind, pt.x, pt.z, pt.r ?? (pt.kind === 'dog' ? 9 : 5), this.world.voxels, undefined, pt.pal);
        this.animals.push(pt.a);
        this.scene.add(pt.a.model.root);
      } else if (pt.a && d > 130) {
        this.scene.remove(pt.a.model.root);
        this.animals = this.animals.filter((x) => x !== pt.a);
        pt.a = null;
      }
    }
    this.books.update(dt);
    this.updateReekFires(dt);
    this.fish.update(dt, this.player.position);

    // Interaction candidate
    this.candidate = this.dialogue || this.hud.picking || this.voyage.active || this.justice.busy ? null : this.findCandidate();
    if (this.candidate?.kind === 'ore') {
      this.outline.visible = true;
      this.outline.position.set(this.candidate.ore!.x + 0.5, this.candidate.ore!.y + 0.5, this.candidate.ore!.z + 0.5);
      this.outline.scale.set(1, 1, 1);
    } else if (this.candidate?.kind === 'tree') {
      const t = this.candidate.tree!;
      this.outline.visible = true;
      this.outline.position.set(t.x + 0.5, t.y + 1, t.z + 0.5);
      this.outline.scale.set(1, 2, 1);
    } else this.outline.visible = false;
    (this.outline.material as THREE.LineBasicMaterial).opacity = 0.55 + Math.sin(this.elapsed * 6) * 0.3;

    // Bell swing after ringing
    const bell = this.world.structures.bell;
    const sw = (bell.userData as { swing?: number }).swing ?? 0;
    if (sw > 0) {
      (bell.userData as { swing: number }).swing = Math.max(0, sw - dt * 0.35);
      bell.rotation.x = Math.sin(this.elapsed * 7) * 0.35 * sw;
    }
  }

  private ambientFx(dt: number): void {
    const P = this.player.position;
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.35;
      for (const s of this.world.structures.smoke) if (s.distanceTo(P) < 80) this.particles.smoke(s, this.world.sky.night);
    }
    const hearth = this.world.structures.interactables.find((i) => i.kind === 'hearth')!;
    if (Math.hypot(hearth.x - P.x, hearth.z - P.z) < 40 && Math.random() < dt * 9) this.particles.fire(new THREE.Vector3(hearth.x, hearth.y - 0.4, hearth.z));
    this.fishFx -= dt;
    if (this.fishFx <= 0) {
      this.fishFx = 0.9;
      for (const f of this.world.nodesNear(P.x, P.z).flatMap((b) => b.fish)) if (Math.hypot(f.x - P.x, f.z - P.z) < 40) this.particles.ripple(new THREE.Vector3(f.x + (Math.random() - 0.5), f.y - 0.1, f.z + (Math.random() - 0.5)));
    }
    // Ore glints so rare veins catch the eye without glowing constantly
    if (Math.random() < dt * 2) {
      for (const o of this.world.nodesNear(P.x, P.z).flatMap((b) => b.ores)) {
        if (o.depletedUntil || (o.kind !== 'silver' && o.kind !== 'crystal')) continue;
        if (Math.hypot(o.x - P.x, o.z - P.z) < 18) this.particles.sparks(new THREE.Vector3(o.x + 0.5 + (Math.random() - 0.5) * 0.9, o.y + 0.5 + (Math.random() - 0.5) * 0.9, o.z + 0.5 + (Math.random() - 0.5) * 0.9), 1, '#e8f4ff');
      }
    }
    const waterNear = Math.min(distToPolyline(P.x, P.z, LOWER_WEND).d - 3, Math.hypot(P.x - 94, P.z - 96) * 0.5, riverDist(P.x, P.z) - 4, (coastX(P.z) - P.x) * 0.6);
    const river = Math.max(0, 1 - waterNear / 22);
    const fire = Math.max(0, 1 - Math.hypot(hearth.x - P.x, hearth.z - P.z) / 10);
    const underground = this.world.voxels.topSolid(P.x, P.z) > P.y + 3;
    // Weather follows the region you're in, on a clock every player shares
    const sky = this.world.sky;
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      this.weatherT = 1;
      const w = weatherAt(regionAt(P.x, P.z).a, sky.hour);
      sky.setWeather(w);
      this.hud.setWeather(w.name);
    }
    sky.sheltered = this.world.voxels.topSolid(P.x, P.z) > P.y + 1.9;
    const wet = sky.weather.snow ? 0 : sky.weather.precip;
    if (wet > 0.75 && !underground && Math.random() < dt / 25) {
      sky.flash = 1;
      setTimeout(() => this.sfx('thunder', 0.8), 600 + Math.random() * 2200);
    }
    this.listenT -= dt;
    if (this.listenT <= 0) { this.listenT = 1; this.listen(P, sky.night, sky.sheltered); }
    this.audio.ambience(dt, { night: sky.night, river, fire, underground, inTown: this.currentRegion === 'hollin' || (this.scape.crowd ?? 0) > 0, rain: underground ? 0 : wet * (sky.sheltered ? 0.45 : 1), ...this.scape });
    this.audio.musicContext({ theme: this.musicTheme(underground), combat: this.inCombat(), boss: this.bossFight() });
  }

  /** Inkholm's relit reek-fires (data/inkholm.ts): flames on the hearth and a glow, built near the player. */
  private reekFlames = new Map<string, THREE.Group>();
  private reekGlow: THREE.Texture | null = null;
  private updateReekFires(dt: number): void {
    const P = this.player.position;
    for (const r of REEKS) {
      const on = !!this.flag('reekLit:' + r.id) && Math.hypot(P.x - r.x, P.z - r.z) < 150;
      let f = this.reekFlames.get(r.id);
      if (on && !f) {
        f = new THREE.Group();
        const flame = fireMaterial(), core = flame;
        for (let i = 0; i < 4; i++) {
          const c = new THREE.Mesh(flameCard(0.8 - i * 0.1, 1.5 + (i % 2) * 0.4, 0, 0, i * 0.7), i === 3 ? core : flame);
          c.position.set(Math.cos(i * 2.1) * 0.18, 0.4, Math.sin(i * 2.1) * 0.18);
          f.add(c);
        }
        if (!this.reekGlow) {
          const cv = document.createElement('canvas'); cv.width = cv.height = 64;
          const x = cv.getContext('2d')!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
          gr.addColorStop(0, 'rgba(255,190,110,0.85)'); gr.addColorStop(1, 'rgba(255,140,60,0)');
          x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
          this.reekGlow = new THREE.CanvasTexture(cv);
        }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.reekGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.setScalar(5.5); glow.position.y = 1.3;
        f.add(glow);
        f.position.set(r.x + 0.5, heightAt(r.x, r.z), r.z + 0.5);
        this.scene.add(f);
        this.reekFlames.set(r.id, f);
      } else if (!on && f) { this.scene.remove(f); this.reekFlames.delete(r.id); f = undefined; }
      if (!f) continue;
      const t = this.elapsed;
      f.children.forEach((c, i) => { if (c instanceof THREE.Mesh) { c.scale.y = 0.85 + Math.sin(t * 9 + i * 1.7) * 0.18; c.rotation.y += dt * (1 + i * 0.3); } });
      if (Math.random() < dt * 3) this.particles.sparks(tmpV.set(f.position.x, f.position.y + 1.4, f.position.z), 2, '#ffd080');
    }
  }

  /** What the feet are on: grass, stone, boards, gravel, sand, snow, or shallow water. */
  private stepSound(): Sfx {
    const P = this.player.position, V = this.world.voxels;
    if (V.get(Math.floor(P.x), Math.floor(P.y + 0.1), Math.floor(P.z)) === B.Water) return 'stepWater';
    const ix = Math.floor(P.x), iz = Math.floor(P.z);
    let under = V.get(ix, Math.floor(P.y - 0.1), iz);
    if (under === B.Air) under = V.get(ix, Math.floor(P.y - 1.1), iz);
    switch (under) {
      case B.Stone: case B.Cobble: case B.StoneBrick: case B.MossyCobble: case B.MossyStone: case B.DeepStone: case B.Basalt: case B.Ice: case B.Crystal:
      case B.TerraOrange: case B.TerraCream: case B.TerraBrown: case B.CopperOre: case B.TinOre: case B.SilverOre: case B.IronOre: case B.Depleted:
        return 'stepStone';
      case B.Planks: case B.DarkPlanks: case B.Timber: case B.OakLog: case B.BirchLog: case B.PineLog: case B.Hay: case B.Barrier:
        return 'stepWood';
      case B.Gravel: case B.Path: return 'stepGravel';
      case B.Sand: case B.RedSand: case B.Clay: return 'stepSand';
      case B.Snow: case B.SnowGrass: return 'stepSnow';
      default: return 'stepGrass';
    }
  }

  /** What's round the listener, for the ambience, looked at once a second: sea, woods, falls, a crowd. */
  private listen(P: THREE.Vector3, night: number, sheltered: boolean): void {
    const V = this.world.voxels;
    let sea = 0, wood = 0, n = 0;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      for (const r of [9, 26, 48]) {
        const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
        n++;
        if (heightAt(Math.floor(x), Math.floor(z)) < SEA - 1) sea++;
        const top = V.topSolid(x, z);
        const id = top > 0 ? V.get(Math.floor(x), top, Math.floor(z)) : 0;
        if (id === B.OakLeaves || id === B.BirchLeaves || id === B.PineLeaves) wood++;
      }
    }
    const town = this.towns.find((t) => Math.hypot(t.x - P.x, t.z - P.z) < t.r);
    this.scape = {
      coast: Math.min(1, (sea / n) * 3.5), forest: Math.min(1, (wood / n) * 4),
      falls: Math.max(0, 1 - Math.hypot(P.x - 94, P.z - 95) / 38),
      crowd: town ? (night < 0.5 ? (town.r > 100 ? 1 : 0.6) : sheltered ? 0.9 : 0.1) : 0,
      indoors: sheltered,
    };
  }

  /** Theme for where the player is and the time of day. */
  /**
   * The music for where the player is: underground, a festival green, indoors in a town, then the
   * place itself (each town and the big landmarks have their own), and otherwise the region by day
   * and the night theme after dark.
   */
  private musicTheme(underground: boolean): ThemeId {
    if (underground) return 'deep';
    const P = this.player.position;
    const near = (x: number, z: number, r: number) => Math.hypot(P.x - x, P.z - z) < r;
    const place: ThemeId | null = this.currentRegion === 'hollin' ? 'hollin'
      : near(ALDERMERE.cx, ALDERMERE.cz, 95) ? 'ansbury'
      : near(GULL.coast - 34, GULL.z, 50) ? 'harbour'
      : near(WORKS.cx, WORKS.cz, 50) ? 'works'
      : near(TEMPLE.x, TEMPLE.z, 45) ? 'kirk'
      : near(COLD.x, COLD.z, 40) || near(CAMP.x, CAMP.z, 30) || near(708, 572, 30) ? 'hearth'
      : near(bigIsle().x, bigIsle().z, 70) ? 'holms'
      : null;
    if (place && this.festivals.stallNear(P, 14)) return 'festival';
    if (place && place !== 'holms' && place !== 'kirk' && this.world.sky.sheltered) return 'inn';
    if (place) return place;
    if (this.world.sky.night > 0.65) return 'night';
    return this.regionTheme();
  }

  /** In a fight with something big: an elite, a story boss or a world boss nearby and awake. */
  private bossFight(): boolean {
    return this.enemies.some((e) => e.alive && e.def.elite && (e.state === 'chase' || e.state === 'windup' || e.state === 'attack') && e.pos.distanceTo(this.player.position) < 30);
  }

  /** Region theme; Hollindale by default. */
  private regionTheme(): ThemeId {
    const p = this.player.position;
    const r = regionAt(p.x, p.z);
    return REGION_THEME[r.t < 0.35 ? r.a : r.b];
  }

  private inCombat(): boolean {
    if (this.dead) return false;
    if (this.elapsed - this.lastCombat < 5) return true;
    return this.enemies.some((e) => e.alive && (e.state === 'chase' || e.state === 'windup' || e.state === 'attack') && e.pos.distanceTo(this.player.position) < 22);
  }

  private floatAt(pos: THREE.Vector3, height: number, text: string, cls: string): void {
    const fwd = this.camera.getWorldDirection(new THREE.Vector3());
    if (tmpV.set(pos.x, pos.y + height, pos.z).sub(this.camera.position).dot(fwd) < 0.5) return;
    const v = tmpV.set(pos.x, pos.y + height, pos.z).project(this.camera);
    if (v.z > 1) return;
    this.hud.floater((v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight, text, cls);
  }

  private mapMarkers(full = false): MapMarker[] {
    const out: MapMarker[] = [];
    for (const q of this.questMarkers()) out.push({ x: q.p.x, z: q.p.z, kind: q.giver ? 'giver' : 'quest' });
    for (const n of this.npcs) {
      // Only people who are there (see NpcDef.when), in places the player has found.
      if (!n.def.title || (n.def.when && !n.def.when(this))) continue;
      const [hx, hz] = n.def.schedule[0].at;
      if (!places().some((p) => p.kind === 'place' && this.save.discovered.includes(p.id) && Math.hypot(p.x - hx, p.z - hz) < p.r + 30)) continue;
      const x = n.placed ? n.pos.x : hx, z = n.placed ? n.pos.z : hz;
      out.push({ x, z, kind: 'npc', label: full ? n.def.name.split(' ')[0] : undefined });
    }
    for (const pd of this.roadfolk.pedlarsNear(this.player.position, 95)) out.push({ x: pd.pos.x, z: pd.pos.z, kind: 'npc', label: full ? pd.name.split(' ')[0] : undefined });
    if (!full) for (const e of this.enemies) if (e.alive && e.pos.distanceTo(this.player.position) < 55) out.push({ x: e.pos.x, z: e.pos.z, kind: e.def.elite ? 'elite' : 'enemy' });
    for (const r of this.online.remotes.values()) out.push({ x: r.model.root.position.x, z: r.model.root.position.z, kind: this.social.isAlly(r.id) ? 'ally' : 'other', label: full || this.social.isAlly(r.id) ? r.name : undefined });
    if (full) for (const p of POSTS) if (this.save.discovered.includes(p.place)) out.push({ x: p.x, z: p.z, kind: 'post', label: p.name });
    out.push(...this.activities.markers(), ...this.seasons.markers());
    out.push(...this.waymarkStones.markers());
    out.push(...this.festivals.markers());
    if (full) out.push({ x: this.player.position.x, z: this.player.position.z, kind: 'player', yaw: this.player.yaw });
    return out;
  }

  // =================================================================== Chat and emotes
  /** What was typed in the chat box: a /command, or a line to say. */
  private say(raw: string): void {
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!text) return;
    if (text.startsWith('/')) {
      const [cmd, ...rest] = text.slice(1).split(' ');
      const arg = rest.join(' ');
      const c = cmd.toLowerCase();
      if (emoteById(c)) { this.doEmote(c); return; }
      switch (c) {
        case 'help': case '?':
          this.hud.system('Groups and trades: click another player, or /invite <name>, /p <message> (group chat), /leave, /kick <name>, /trade <name>.');
          this.hud.system('Guilds (O): /gu <message> (guild chat), /ginvite <name>, /gleave, /gkick, /gpromote, /gdemote.');
          this.hud.system('Safety: /ignore <name> hides someone\'s chat and whispers (/unignore, /ignored); /report <name> <what happened> tells the realm\'s keeper. Or click them.');
          this.hud.system('Chat: just type and press Enter. Commands: /me <action> (e.g. /me tips a hat), /emotes, /who, /played, /clear. Emotes: ' + EMOTES.map((e) => '/' + e.id).join(' ') + '. Moving ends an emote.');
          return;
        case 'emotes': this.hud.system('Emotes: ' + EMOTES.map((e) => `/${e.id}`).join(', ') + '. Or click the ☺ on the chat box.'); return;
        case 'me': case 'e': case 'em':
          if (!arg) { this.hud.system('Try /me looks out over the valley.'); return; }
          this.sendEmoteLine(arg.slice(0, 120));
          return;
        case 's': case 'say': if (arg) this.speak(arg); return;
        case 'who': {
          const others = [...this.online.remotes.values()].map((r) => r.name);
          this.hud.system(this.online.status !== 'online' ? 'You are playing offline.' : others.length ? `In the world with you (${others.length}): ${others.slice(0, 30).join(', ')}${others.length > 30 ? '…' : ''}` : 'Nobody else is in the world right now.');
          return;
        }
        case 'played': {
          const h = Math.floor(this.save.playTime / 3600), m = Math.floor((this.save.playTime % 3600) / 60);
          this.hud.system(`${this.save.name} has played for ${h ? h + 'h ' : ''}${m}m.`);
          return;
        }
        case 'clear': document.querySelectorAll('#chatbox .cb-line').forEach((l) => l.remove()); return;
        case 'invite': case 'inv': if (arg) this.social.invite(arg); else this.hud.system('Who? /invite <name>, or click them and choose Invite.'); return;
        case 'leave': case 'leavegroup': this.social.leave(); return;
        case 'promote': if (arg) this.social.promote(arg); return;
        case 'w': case 'whisper': case 'tell': case 't': case 'msg': {
          const sp = arg.indexOf(' ');
          if (sp < 1) { this.hud.system('Whisper: /w <name> <message>'); return; }
          this.social.whisper(arg.slice(0, sp), arg.slice(sp + 1));
          return;
        }
        case 'r': case 'reply':
          if (!this.social.lastWhisper) { this.hud.system('Nobody has whispered to you yet.'); return; }
          if (arg) this.social.whisper(this.social.lastWhisper, arg);
          return;
        case 'friend': case 'addfriend': if (arg) this.social.addFriend(arg); else this.hud.system('Who? /friend <name>, or click them and choose Add friend.'); return;
        case 'unfriend': case 'removefriend': if (arg) this.social.removeFriend(arg); return;
        case 'kick': if (arg) this.social.kick(arg); return;
        case 'ignore': case 'block': {
          if (!arg) { this.hud.system('Ignore whom? /ignore <name>. /ignored lists them, /unignore <name> lets them back.'); return; }
          const n = arg.trim().toLowerCase();
          if (n === this.save.name.toLowerCase()) return;
          if (!this.save.settings.ignored.includes(n)) this.save.settings.ignored.push(n);
          this.persist();
          this.hud.system(`You won't see ${arg.trim()}'s chat or whispers now. /unignore ${arg.trim()} to undo it.`);
          return;
        }
        case 'unignore': case 'unblock': {
          const n = arg.trim().toLowerCase();
          this.save.settings.ignored = this.save.settings.ignored.filter((x) => x !== n);
          this.persist();
          this.hud.system(arg ? `${arg.trim()} is no longer ignored.` : 'Unignore whom? /unignore <name>.');
          return;
        }
        case 'ignored': this.hud.system(this.save.settings.ignored.length ? 'Ignoring: ' + this.save.settings.ignored.join(', ') + '.' : "You aren't ignoring anyone."); return;
        case 'report': {
          const sp = arg.indexOf(' ');
          if (sp < 1) { this.hud.system('Report: /report <name> <what happened>. It goes to the realm\'s keeper with what they said lately.'); return; }
          if (this.online.status !== 'online') { this.hud.system('Reports go to the realm server: you need to be playing online.'); return; }
          this.online.report(arg.slice(0, sp), arg.slice(sp + 1));
          return;
        }
        case 'reports': this.online.reportsList(); return;
        case 'p': case 'party': case 'g': case 'group': if (arg) this.social.say(arg); return;
        case 'trade': if (arg) this.social.ask(arg); else this.hud.system('Who? /trade <name>, or click them and choose Trade.'); return;
        case 'gu': case 'gc': if (arg) this.social.guildSay(arg); return;
        case 'ginvite': if (arg) this.social.guildInvite(arg); return;
        case 'gleave': this.social.guildLeave(); return;
        case 'gkick': if (arg) this.social.guildKick(arg); return;
        case 'gpromote': if (arg) this.social.guildRank(arg, 'officer'); return;
        case 'gdemote': if (arg) this.social.guildRank(arg, 'member'); return;
        default: this.hud.system(`There's no /${cmd}. Type /help for the list.`); return;
      }
    }
    this.speak(text);
  }

  private isIgnored(name: string): boolean { return this.save.settings.ignored.includes(name.toLowerCase()); }

  private speak(text: string): void {
    if (this.online.status === 'online') { this.online.chat(text, 'say'); return; } // the server echoes it back to everyone, you included
    this.hud.chat(this.save.name, text);
    this.addBubble(-1, text, false);
  }

  /** An action line ("Ada waves."): shown to everyone nearby on the server, or just you offline. */
  private sendEmoteLine(text: string): void {
    if (this.online.status === 'online') { this.online.chat(text, 'emote'); return; }
    this.hud.chat(this.save.name, text, 'emote');
    this.addBubble(-1, `${this.save.name} ${text}`, true);
  }

  /**
   * The Waits, and anyone else with tunes in their day, play on the realm clock: a tune starts every
   * forty seconds, the same one for everyone, so all who stand near hear the same bar.
   */
  private npcMusic(): void {
    const now = realmNow(), P = this.player.position;
    for (const n of this.npcs) {
      const play = n.performing, who = 'npc:' + n.id;
      const voice = play ? ITEMS[n.model.heldKind]?.instrument : undefined;
      if (!play || !voice || n.pos.distanceTo(P) > HEARING + 10) { if (this.music.bard.playing(who)) this.music.bard.stop(who); continue; }
      const slot = Math.floor(now / 40_000), start = slot * 40_000;
      if (this.music.bard.playing(who)?.start === start || now - start > 32_000) continue;
      this.music.bard.start(who, { tune: play.tunes[slot % play.tunes.length], part: play.part, voice, start, reps: 1 });
    }
  }

  /** A tune played through to the end: noted for the quests (data/content/waits.ts reads these flags). */
  private tunePlayed(tune: string, spot: string | null, band: number): void {
    this.setFlag('played:' + tune, true);
    if (spot) this.setFlag(`played:${tune}@${spot}`, true);
    const hour = this.world.sky.hour;
    if (spot && hour >= 4.5 && hour < 8) this.setFlag(`played:${tune}@${spot}:dawn`, true);
    if (band > 1) this.setFlag('playedBand:' + tune, Math.max(band, Number(this.flag('playedBand:' + tune) ?? 0)));
    this.setFlag('tunesPlayed', Number(this.flag('tunesPlayed') ?? 0) + 1);
  }

  doEmote(id: string): void {
    const e = emoteById(id);
    if (!e || this.mode !== 'play') return;
    if (this.dead) { this.hud.system('Not while you are down.'); return; }
    if (this.horse || this.player.swimming) { this.hud.system(this.horse ? 'Get down from your horse first (G).' : 'Not while swimming.'); return; }
    this.cancelActions();
    this.attack = null;
    this.emote = { id: e.id, left: e.secs };
    this.player.model.setState(e.id);
    this.sendEmoteLine(e.text);
  }

  private addBubble(who: number, text: string, emote: boolean): void {
    // One bubble per head: a new line replaces the old
    for (const b of this.bubbles) if (b.who === who) b.el.remove();
    this.bubbles = this.bubbles.filter((b) => b.who !== who);
    this.bubbles.push({ el: this.hud.bubble(text.length > 120 ? text.slice(0, 117) + '…' : text, emote), who, until: this.elapsed + Math.min(9, 3.5 + text.length * 0.05) });
  }

  /** Keep bubbles over their heads; hide them behind the camera or far off. */
  private placeBubbles(): void {
    const fwd = this.camera.getWorldDirection(tmpV2);
    this.bubbles = this.bubbles.filter((b) => {
      const pos = b.who === -1 ? this.player.position : b.who <= -100 ? this.dungeons.bubbleAt(b.who) ?? this.activities.escorts.bubbleAt(b.who) : this.online.remotes.get(b.who)?.model.root.position;
      if (!pos || this.elapsed > b.until) { b.el.remove(); return false; }
      const lift = b.who === -1 ? 2.35 + (this.horse ? 1.1 : 0) : 2.35;
      tmpV.set(pos.x, pos.y + lift, pos.z);
      const far = tmpV.distanceTo(this.camera.position) > 45;
      const behind = tmpV.clone().sub(this.camera.position).dot(fwd) < 0.5;
      const v = tmpV.project(this.camera);
      b.el.style.display = far || behind || v.z > 1 ? 'none' : '';
      b.el.style.left = (v.x * 0.5 + 0.5) * window.innerWidth + 'px';
      b.el.style.top = (-v.y * 0.5 + 0.5) * window.innerHeight + 'px';
      b.el.classList.toggle('fading', b.until - this.elapsed < 0.4);
      return true;
    });
  }

  private updateHud(dt: number): void {
    this.placeBubbles();
    const P = this.player.position;
    this.hud.setPlayer(this.save.name, this.level('melee'), this.hp, this.maxHp, this.energy);
    if (this.target && (!this.target.alive || this.target.pos.distanceTo(P) > 40)) this.target = null;
    this.hud.setLowHealth(!this.dead && this.hp < this.maxHp * 0.3);
    // A big fight: the nearest awake boss, or the one you've targeted
    let boss: Enemy | null = this.target && this.target.alive && this.target.isBoss ? this.target : null;
    if (!boss) {
      let bd = 40;
      for (const e of this.enemies) {
        if (!e.alive || !e.isBoss || e.state === 'idle' || e.state === 'wander' || e.state === 'return') continue;
        const d = e.pos.distanceTo(P);
        if (d < bd) { bd = d; boss = e; }
      }
    }
    this.hud.setBoss(boss ? { name: boss.name, level: boss.def.level, hp: boss.hp, max: boss.def.hp, enraged: boss.enraged } : null);
    for (const e of this.enemies) if (e.justEnraged) {
      e.justEnraged = false;
      if (e.pos.distanceTo(P) > 50) continue;
      this.hud.system(`${e.name} is enraged: it hits faster now. Watch for the wide circle.`);
      this.floatAt(e.pos, e.model.plateHeight + 0.8, 'Enraged', 'crit');
      this.audio.playAt('growl', e.pos.distanceTo(P), 1);
      this.rig.addShake(0.35);
      this.particles.burst(tmpV.copy(e.pos).setY(e.pos.y + 1.2), '#ff5a2a', 30);
    }
    // A target that dies, or that you leave far behind, is let go
    if (this.target && (!this.target.alive || this.target.pos.distanceTo(this.player.position) > 48)) this.target = null;
    const t = this.target;
    this.hud.setTarget(t ? { name: t.name, level: t.def.level, hp: t.hp, max: t.def.hp, elite: t.def.elite } : null);
    const foodCount = this.save.inv.reduce((s, st) => s + (st && ITEMS[st.id].heal ? st.n : 0), 0);
    const L = this.level('melee');
    const lock = <T extends object>(c: T, i: number): T & { locked?: number } => (L < UNLOCK_AT[i] ? { ...c, locked: UNLOCK_AT[i] } : c);
    this.hud.setAbilities([
      lock({ left: this.cds.strike, total: 0.5 }, 0),
      lock({ left: this.cds.cleave, total: 6 }, 1),
      lock(this.kit.weaponSlot(), 2),
      ...this.kit.slots().map((c, k) => lock(c, 3 + k)),
      { left: this.cds.roll, total: 0.8, disabled: this.energy < this.armour.rollCost },
      { left: this.cds.eat, total: 1.5, disabled: foodCount === 0, count: foodCount },
    ]);
    // The weapon skill follows the weapon in hand
    const line = weaponLine(this.blade?.speed);
    if (line !== this.kit.weapon) { this.kit.weapon = line; this.kit.wcd = 0; this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill); }
    const gauge = this.kit.gauge();
    this.hud.setGauge(gauge.label, gauge.value, gauge.max);
    // Prompt
    const c = this.candidate;
    if (this.action?.kind === 'fish' && this.action.phase === 'bite') this.hud.setPrompt('E', 'Pull in the line');
    else if (this.action) this.hud.setPrompt('E', 'Stop', 'or move');
    else if (c && !this.craftAction) this.hud.setPrompt('E', c.label, c.sub ?? '', c.warn ?? '');
    else this.hud.setPrompt(null);
    if (!this.action && !this.craftAction) this.hud.setCast(null);

    // Plates
    const plates: PlateInfo[] = [];
    const W = window.innerWidth, H = window.innerHeight;
    const camFwd = this.camera.getWorldDirection(new THREE.Vector3());
    const project = (x: number, y: number, z: number) => {
      // Skip anything behind the camera; projection alone can fold it back onto the screen.
      if ((x - this.camera.position.x) * camFwd.x + (y - this.camera.position.y) * camFwd.y + (z - this.camera.position.z) * camFwd.z < 0.5) return null;
      const v = tmpV.set(x, y, z).project(this.camera);
      if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) return null;
      return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
    };
    for (const n of this.npcs) {
      const d = n.pos.distanceTo(P);
      if (d > 28 || !n.model.root.visible) continue;
      const s = project(n.pos.x, n.pos.y + 2.3 * FIGURE * (n.def.look.height ?? 1), n.pos.z);
      if (s) plates.push({ key: 'n' + n.id, x: s.x, y: s.y, name: n.def.name, sub: d < 12 ? n.def.title : undefined, kind: 'npc', mark: this.npcMark(n) });
    }
    for (const pd of this.roadfolk.pedlarsNear(P, 28)) {
      const s = project(pd.pos.x, pd.pos.y + 2.3 * FIGURE * pd.height, pd.pos.z);
      if (s) plates.push({ key: 'pd' + pd.id, x: s.x, y: s.y, name: pd.name, sub: pd.pos.distanceTo(P) < 12 ? pd.title : undefined, kind: 'npc' });
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(P);
      if (d > 26) continue;
      const s = project(e.pos.x, e.pos.y + e.model.plateHeight + 0.3, e.pos.z);
      const showHp = e === this.target || e.hp < e.def.hp;
      if (s) plates.push({ key: 'e' + e.id, x: s.x, y: s.y, name: d < 16 || e === this.target ? `${e.name} · ${e.def.level}` : '', kind: e.def.elite ? 'elite' : 'enemy', hp: showHp ? e.hp / e.def.hp : undefined, targeted: e === this.target });
    }
    for (const r of this.online.remotes.values()) {
      const rp = r.model.root.position;
      if (rp.distanceTo(P) > 40) continue;
      const s = project(rp.x, rp.y + 2.3 * FIGURE * (r.model.look.height ?? 1), rp.z);
      if (s) plates.push({ key: 'p' + r.id, x: s.x, y: s.y, name: r.name, sub: r.guild ? `<${r.guild}>` : undefined, kind: 'player' });
    }
    this.hud.updatePlates(plates);

    this.hudTimer -= dt;
    if (this.hudTimer > 0) return;
    this.hudTimer = 0.2;
    this.hud.drawMinimap(P.x, P.z, this.rig.yaw, this.player.yaw, this.mapMarkers());
    this.hud.setClock(this.world.sky.hour);
    this.hud.setXpBar(this.save.xp.melee);
    this.hud.setTracker(this.questEntries());
    if (this.hud.isOpen('map')) this.hud.refresh('map');

    // Region discovery
    this.regionTimer -= 0.2;
    if (this.regionTimer <= 0) {
      this.regionTimer = 0.5;
      const reg = regionAt(P.x, P.z);
      const regionId = 'region:' + (reg.t < 0.35 ? reg.a : reg.b);
      const r = places().find((g) => g.kind === 'place' && Math.hypot(g.x - P.x, g.z - P.z) < g.r && (!g.y || (P.y >= g.y[0] && P.y <= g.y[1])))
        ?? places().find((g) => g.id === regionId)!;
      const id = r.id;
      if (id !== this.currentRegion) {
        this.currentRegion = id;
        this.hud.setZone(r.name, places().find((p) => p.id === regionId)?.name);
        // Entering a region for the first time announces it with its level range
        if (!this.save.discovered.includes(regionId)) {
          const rp = places().find((g) => g.id === regionId)!;
          this.save.discovered.push(regionId);
          if (regionId !== 'region:greenwake') { this.hud.banner(rp.name, rp.sub); this.sfx('discover'); this.audio.sting('discover'); }
        } else if (!this.save.discovered.includes(r.id)) {
          this.save.discovered.push(r.id);
          this.hud.banner(r.name, r.sub);
          this.sfx('discover');
          this.audio.sting('discover');
        }
        if (!this.save.discovered.includes(r.id)) this.save.discovered.push(r.id);
        this.persist();
      }
    }
  }

  // =================================================================== Streamed creatures
  private spawned = new Map<number, { enemies: Enemy[]; animals: Animal[] }>();

  private spawnChunk(cx: number, cz: number, r: ChunkResult | null): void {
    if (this.flag('templeLifted') && cx === LIFT.x >> 5 && cz === LIFT.z >> 5) this.raiseTemple(2);
    if (!r) return;
    const list = { enemies: [] as Enemy[], animals: [] as Animal[] };
    // Ducks on inland water: now and then a pair, where a river or a pond is deep enough to float on
    if (hash2(cx, cz, 313) < 0.4) {
      const V = this.world.voxels;
      for (let k = 0; k < 14; k++) {
        const x = cx * 32 + 2 + Math.floor(hash2(cx * 7 + k, cz, 317) * 28) + 0.5, z = cz * 32 + 2 + Math.floor(hash2(cx, cz * 7 + k, 319) * 28) + 0.5;
        let y = 90;
        while (y > 2 && V.get(Math.floor(x), y, Math.floor(z)) === B.Air) y--;
        if (V.get(Math.floor(x), y, Math.floor(z)) !== B.Water || V.get(Math.floor(x), y - 1, Math.floor(z)) !== B.Water || y <= SEA + 1) continue;
        for (const pal of [{}, { a: '#8a6a4a', b: '#7a5a3a' }]) {
          const a = new Animal('duck', x + (pal.a ? 1.2 : 0), z, 6, V, undefined, pal);
          list.animals.push(a); this.animals.push(a); this.scene.add(a.model.root);
        }
        break;
      }
    }
    for (const s of r.spawns) {
      const table = REGION_SPAWNS[s.region];
      if (s.animal) {
        if (!table.animals.length) continue;
        const kind = table.animals[Math.floor(s.roll * table.animals.length)];
        // A flock has the odd black sheep, and a ram
        const pal = kind !== 'sheep' ? {} : s.roll * 97 % 1 < 0.12 ? { a: '#4a443e', b: '#221e1a' } : s.roll * 31 % 1 < 0.15 ? { breed: 'ram' as const } : {};
        const a = new Animal(kind, s.x, s.z, 10, this.world.voxels, undefined, pal);
        list.animals.push(a);
        this.animals.push(a);
        this.scene.add(a.model.root);
      } else {
        const from = s.sea ? table.sea : table.enemies;
        const type = from[Math.floor(s.roll * from.length)];
        const e = new Enemy(ENEMIES[type], Math.floor(s.x), Math.floor(s.z), this.world.voxels);
        e.spawnKey = `${type}@${Math.floor(s.x)},${Math.floor(s.z)}`;
        this.applyLedger(e);
        list.enemies.push(e);
        this.enemies.push(e);
        this.scene.add(e.model.root, e.telegraph);
      }
    }
    this.spawned.set(chunkKey(cx, cz), list);
  }

  private despawnChunk(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const list = this.spawned.get(key);
    if (!list) return;
    this.spawned.delete(key);
    for (const e of list.enemies) {
      this.scene.remove(e.model.root, e.telegraph);
      if (this.target === e) this.target = null;
    }
    for (const a of list.animals) this.scene.remove(a.model.root);
    const gone = new Set<unknown>([...list.enemies, ...list.animals]);
    this.enemies = this.enemies.filter((e) => !gone.has(e));
    this.animals = this.animals.filter((a) => !gone.has(a));
  }

  // =================================================================== Debug hooks (used for automated checks)
  /** What the dev tools can do, all of it to your own character. A jump goes the way a waymark does. */
  private devHost(): DevHost {
    const dev = this.dev;
    return {
      waymarks: () => waymarks().map((w) => ({ name: w.name, x: w.ax, y: w.ay ?? heightAt(w.ax, w.az) + 1, z: w.az })),
      teleport: (x, z, y) => {
        if (this.dungeons.active) return null;
        const V = this.world.voxels;
        const gy = y ?? (V.isLoaded(Math.floor(x), Math.floor(z)) ? V.groundBelow(x, 94, z) : heightAt(Math.floor(x), Math.floor(z)) + 1);
        this.devPanel.close();
        this.dismount(true);
        this.hud.closeAll();
        this.cancelActions();
        this.target = null;
        this.save.pos = [x, gy + 0.5, z];
        this.save.hour = this.world.sky.hour;
        this.save.hp = this.hp;
        this.startPlay(false, 'Going there…');
        return `Off to ${Math.round(x)}, ${Math.round(z)}.`;
      },
      where: () => { const p = this.player.position, r = regionAt(p.x, p.z).a; return { x: p.x, y: p.y, z: p.z, region: REGION_INFO[r]?.name ?? r }; },
      setLevel: (L) => {
        for (const s of SKILLS) this.save.xp[s.id] = xpForLevel(L, s.id);
        this.applyCalling();
        this.hp = this.maxHp;
        this.hud.refresh();
        this.persist();
      },
      heal: () => { this.hp = this.maxHp; this.energy = 100; this.hud.refresh(); },
      give: (id, n) => { const ok = this.give(id, n); this.hud.refresh(); this.persist(); return ok; },
      addMarks: (n) => { this.addMarks(n); this.persist(); },
      hour: () => this.world.sky.hour,
      setHour: (h) => { this.world.sky.hour = h; },
      get god() { return dev.god; },
      set god(v) { dev.god = v; },
      get fast() { return dev.fast; },
      set fast(v) { dev.fast = v; },
      clearFoes: () => {
        let n = 0;
        for (const e of this.enemies) {
          if (!e.alive || e.pos.distanceTo(this.player.position) > 40) continue;
          e.takeDamage(e.hp + 1, this.player.position, this.elapsed);
          if (e.justDied) this.onEnemyKilled(e);
          n++;
        }
        return n;
      },
    };
  }

  private debugApi() {
    return {
      game: this,
      tp: (x: number, y: number, z: number) => { this.player.teleport(x, y, z); this.rig.snap(this.player.position); },
      region: () => { const p = this.player.position; return { region: regionAt(p.x, p.z), zone: this.currentRegion, theme: this.regionTheme(), chunks: this.world.chunks.entries.size, covered: this.world.chunks.coveredRadius, gen: this.world.chunks.stats }; },
      info: REGION_INFO,
      give: (id: string, n = 1) => this.give(id, n),
      item: (id: string) => ITEMS[id],
      books: () => LORE_BOOKS,
      xp: (s: SkillId, n: number) => this.addXp(s, n),
      stage: (q: string, s: string) => this.setStage(q, s),
      hour: (h: number) => { this.world.sky.hour = h; },
      creature: (kind: CreatureKind, pal = {}) => new CreatureModel(kind, pal),
      figure: (look: Appearance) => new Humanoid(look),
      prop: (item: string) => furniture(this.world.props, item, 0),
      inRoof: (x: number, y: number, z: number, m = 0) => inRoof(x, y, z, m),
      state: () => ({
        mode: this.mode, hp: this.hp, pos: this.player?.position.toArray().map((v) => +v.toFixed(2)), quests: { ...this.save.quests }, flags: { ...this.save.flags },
        marks: this.save.marks, inv: this.save.inv.filter(Boolean), levels: Object.fromEntries(SKILLS.map((s) => [s.id, this.level(s.id)])),
        calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, candidate: this.candidate?.label, dialogue: this.dialogue?.node,
      }),
      talk: (id: string) => { const n = this.npcs.find((x) => x.id === id); if (n) this.startDialogue(n); },
      choose: (i: number) => this.chooseOption(i),
      interact: () => { if (this.candidate) this.interact(this.candidate); return this.candidate?.label; },
      pull: () => this.pullLine(),
      key: (code: string) => { (this.input as unknown as { pressed: Set<string> }).pressed.add(code); },
      festival: () => this.festivals.view(),
      finishCasting: () => { if (this.casting) this.casting.t = this.casting.dur; },
      calling: (id: CallingId) => this.setCalling(id),
      skill: (i: number) => this.useAbility(3 + i),
      say: (t: string) => this.say(t),
      emote: (id: string) => this.doEmote(id),
    };
  }
}

void UP;
