import * as THREE from 'three';
import { Birds } from './Birds';
import { PETS } from '../data/pets';
import { Companion } from '../entities/Companion';
import { canLearn, pointsAt, rankOf, spent, TALENTS, TIER_GATE, TREES } from '../data/talents';
import { landAt, landOf, type LandId } from '../world/land';
import { MORROW_OX } from '../world/morrow';
import { CALLIS_PACKET } from '../world/morrow';
import { plan as sitePlan } from '../world/sites';
import { applyRank, earlyPoints, MORPHS, RANK_AT, RANK_NAMES, rankFor as skillRankFor, RESPEC_PER_POINT, SHARDS_PER_POINT } from '../data/skillpoints';
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
  ANIMAL_SPAWNS, ENEMIES, ENEMY_SPAWNS, FISH_TABLE, levelForXp, xpForLevel, ORE_INFO, RECIPES, REGION_SPAWNS, STATION_NAMES, SHOP_STOCK, SKILLS, Station, TREE_INFO, RIDE_PACE, RIDE_RANKS, RIDE_WIND, rideRank,
  type EnemyType,
} from '../data/gameplay';
import { activeSet, ITEMS, SkillId } from '../data/items';
import { affixFits, AFFIXES, baseOf, ENCHANTS, enchantedId, NAMED_BY_SOURCE, rollGear, unidentified, type DropSource, type NamedFx } from '../data/gear';
import { ARMOUR_LEANINGS, COLOUR_WORD, craftColour, craftPoints, PASSIVE, PASSIVES, QUALITY_STEPS, researchMinutes, WEAPON_LEANINGS } from '../data/crafting';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/quests';
import { Animal, type AnimalKind } from '../entities/Animal';
import { Enemy, FOE_RULES, type EnemyContext } from '../entities/Enemy';
import { EFFECTS, inflictionOf, type EffectId, type Infliction } from '../data/effects';
import { Companions } from './Companions';
import { DYE_COST, DYE_SLOTS, STARTER_DYES, dyeLook, type DyeChannel, type DyeSlot } from '../data/gearDyes';
import { COMPANIONS, type CompanionId, type CompanionRole } from '../data/companions';
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
import { ISLAND_COURSES } from '../data/islandCourses';
import { MASTERY, MASTERY_BY_ID, masteryEarned, readMastery, type MasteryId } from '../data/mastery';
import { Sailing, type ShipState } from './Sailing';
import { BERTHS, HULL_PAINTS, HULLS, SAIL_CLOTHS, SALVAGE, WALE_PAINTS, type HullId, type Livery } from '../data/naval';
import { applyColourVision } from '../ui/colourVision';
import { ATTACK_WAYS, BEAST_NOTES, BEAST_TIERS, bestiaryRoster, ROLE_WAYS } from '../data/bestiary';
import { CABINS, CABIN_BASE, cabinAt, cabinFixtures, cabinReserved, cabinShape } from '../data/cabins';
import { CRIME, JURISDICTIONS, jurisdictionAt } from '../data/justice';
import '../data/pledges';
import { Doll } from '../ui/Doll';
import { Dailies } from './Dailies';
import { Waymarks, waymarks, waymarkFare } from './Waymarks';
import { FEATS, FeatApi } from '../data/feats';
import { Hud, MapMarker, PlateInfo, QuestEntry, ShopView } from '../ui/Hud';
import { SHOPS, shopBuyPrice, shopPrice } from '../data/shops';
import { STABLES } from '../data/stables';
import { PACKET_COURSE, POSTS, postBoxOf, postFare, postHours, postKnown } from '../data/travel';
import { Online, type HallView, type HomeHeld } from '../net/Online';
import { BOARDS, SET_PIECES } from '../data/content';

/** Chapter numbers for the main story's quests, I to XXX. */
const ROMAN = ['', ...Array.from({ length: 199 }, (_, i) => { let n = i + 1, s = ''; for (const [v, r] of [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as const) while (n >= v) { s += r; n -= v; } return s; })];
/** People whose every conversation is a story scene. */
const STORY_CAST = new Set(['lowen', 'maren', 'rhosyn', 'wynn', 'sela', 'selaSitting', 'joan', 'joanSitting']);
/** The stretch of temple floor that lifts in Chapter V: centre, radius and paving height. */
const LIFT = { x: 1201, z: 1800, r: 6, y: 89 };
import { ALDERMERE, BANKS, CAMP, COLD, COTTAGE, GULL, QUEST_SPAWNS, TEMPLE, WORKS, WORLD_THINGS, WorldThing } from '../data/places_regional';
import { bigIsle } from '../world/holms';
import { B, isLeaves, isSolid } from '../world/blocks';
import { fellTree, FishSpot, LOWER_WEND, OreNode, regrowTree, TreeNode } from '../world/generate';
import { distToPolyline } from '../world/noise';
import { Interactable } from '../world/structures';
import { DialogueTree, DNode, GameApi } from './api';
import { GameWorld , ForageSpot } from './GameWorld';
import { places } from '../data/places';
import { fireMaterial, flameCard, furniture, PUMPKIN_GLOW } from '../world/props';
import { inRoof, roofOver } from '../world/roofVolumes';
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
import { Building, doorCell, stallAt, type LaidBlock, type LotHouse } from './Building';
import { GuildHalls } from './GuildHalls';
import type { Friend } from './ClassKit';
import { PostStations } from './PostStations';
import { POST_CART_KEY } from '../data/postStations';
import { CALLING_POOL, EXPOSED, GUARD, POOLS, SKILL_COST, SLOT_COST, type Cost } from '../data/combat';
import type { ScheduledShip } from '../world/Ferry';
import { HALL_BY_ID, HALLS, forgeStations, hallArrive, hallCounter, hallMaps, hallTable, inHall, type HallId } from '../data/guildhalls';
import { LotBuild } from './LotBuild';
import { Planner } from './Planner';
import { Bank } from './Bank';
import { VILLA_BY_ID, VILLA_RESALE, villaDoor, villaGate, villaLocks, villaShape, VILLAS } from '../data/mirador';
import { COTTAGE_BUYBACK, COTTAGE_SHAPE, costOf, HomeShape, housePlace, HouseSpec, Lot, LOT_BY_ID, LOT_PRICE, LOTS, plotShape, readPlot, WENDSIDE_LOTS } from '../data/housing';
import { updateDoors } from '../world/Doors';
import { Social } from './Social';
import { Exchange } from './Exchange';
import { Mail } from './Mail';
import { Seasons } from './Seasons';
import { WakeFair } from './WakeFair';
import { Farming, farmPatches } from './Farming';
import { Rowboat } from './Rowboat';
import { PostRide, rideMinutes, roadNet, wayLength } from './PostRide';
import { mewJetty } from '../world/sites';
import { MONUMENTS } from '../data/monuments';
import { jewelDrop } from '../data/jewellery';
import { SKILL_SCHOOL } from '../data/skillSchools';
import { BOATMEN, BOAT_HIRE, BOAT_HIRE_MS } from '../data/content/boats';
import type { FairGameId } from '../data/wakeFair';
import { REEKS } from '../data/inkholm';
import { Dungeons } from './Dungeons';
import { SetPieces } from './SetPieces';
import { SharedMobs } from './SharedMobs';
import { QuartersTable } from './QuartersTable';
import { OPPONENT_BY_NPC, TILE_BY_ID, TILE_DROPS } from '../data/cards';
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
import { CallingDef, CallingId, callingById, crossUtilities, elitesOf, TUNE, UNLOCK_AT, UNLOCK_NAMES, SECOND_SKILLS, WEAPON_SKILLS, weaponKit } from '../data/classes';
import { DUMMY_SPOTS, MASTER_OF } from '../data/content/masters';
import { INTRO } from '../data/intro';
import { serverUrl } from '../net/Online';
import { currentAccount, deleteRemote, isDevAccount, loadTravellers, recoverAccount, remoteCharacters, signIn, signOut, uploadSave , storeOwned } from '../net/Account';
import { DevPanel, type DevHost } from '../ui/DevPanel';

type Mode = 'loading' | 'title' | 'creator' | 'intro' | 'play';

/** Where the selected or new character stands on the menus, and the way the camera looks at them. */
const STAGE = { x: 153, z: 187, dir: new THREE.Vector3(4.2, 0, 0.9).normalize() };
/** The music for each region; the outer lands borrow a neighbour's until their own is written. */
const REGION_THEME: Record<RegionId, ThemeId> = {
  greenwake: 'greenwake', crownroad: 'crownroad', brambledeep: 'brambledeep', saltwind: 'saltwind', redstone: 'redstone', starfall: 'starfall',
  gannet: 'crownroad', wrath: 'brambledeep', tolmen: 'starfall', inkholm: 'brambledeep', kell: 'redstone', sickle: 'starfall',
  keys: 'saltwind', glades: 'brambledeep', amberwold: 'brambledeep', bright: 'crownroad', sunder: 'starfall', glassflats: 'redstone', greywaste: 'starfall', held: 'starfall',
};

/** Each region's other pieces, played in turn with its own theme (eight minutes each, on the realm clock). */
const REGION_PIECE: Partial<Record<RegionId, ThemeId[]>> = {
  greenwake: ['heartland', 'meadow'], crownroad: ['heartland', 'meadow'], gannet: ['heartland'], saltwind: ['heartland', 'shanty'],
  brambledeep: ['wildwood', 'grove'], wrath: ['wildwood'], inkholm: ['wildwood', 'grove'],
  starfall: ['highlands', 'fells'], tolmen: ['highlands', 'fells'], redstone: ['highlands'], kell: ['tinkers', 'highlands'], sickle: ['rime', 'highlands'],
  // Morrow's own
  keys: ['keys', 'shanty'], bright: ['keys', 'whitecity'], glades: ['amber', 'grove'], amberwold: ['amber', 'grove'], sunder: ['held'], glassflats: ['caravan', 'held'], greywaste: ['held'], held: ['held', 'rime'],
};
/** Where a place has a second piece of its own, the two take turns (Ansbury's market day, Gullmouth's shanty). */
const PLACE_PIECE: Partial<Record<ThemeId, ThemeId>> = { ansbury: 'charter', harbour: 'shanty', night: 'rainfall' };
/** Each dungeon's and delve's own music, by its id (data/dungeons.ts for the group dungeons, world/sites.ts for the rest). */
const UNDER_THEME: Record<string, ThemeId> = {
  'gd-oldman': 'oldman', 'gd-kettle': 'kettle', 'gd-escapement': 'escapement', 'gd-kingsbarrow': 'kingsbarrow',
  'pd-mortlake': 'mortlake', 'pd-blackcut': 'blackcut', 'delve-badger': 'badger', 'delve-culvert': 'culvert', 'delve-smugglers': 'smugglers',
  'delve-tinner': 'tinner', 'delve-seep': 'seep', 'delve-glimmer': 'glimmer', 'delve-gullery': 'gullery', 'delve-hob': 'hob', 'delve-holmsey': 'holmsey', 'ink-priory': 'priory',
};

/** Furniture that works as a crafting station once it's set down at home, and what using it says. */
const HOME_STATIONS: Record<string, { station: Station; label: string }> = {
  furn_workbench: { station: 'bench', label: 'Work at your bench' },
  furn_range: { station: 'hearth', label: 'Cook at your range' },
  furn_anvil: { station: 'anvil', label: 'Use your anvil' },
  furn_forge: { station: 'furnace', label: 'Use your forge' },
};

/** Hand-laid blocks as saved (in the 'lotBlocks' flag, or the book): anything malformed is dropped. */
function readLaid(v: unknown): LaidBlock[] {
  return Array.isArray(v) ? (v as unknown[]).filter((c): c is LaidBlock => Array.isArray(c) && c.length === 4 && c.every((n) => Number.isInteger(n))) : [];
}

/** Where townsfolk walk, and how many of them, busiest in the capital. */
/** Each land's packet harbour: where the Constant lies at the quay, and the way out to the open sea (east, both). */
const HARBOURS: Record<LandId, Harbour> = {
  counties: { berth: [1822, 590.5], heading: Math.PI / 2 },
  morrow: { berth: [CALLIS_PACKET.x + 12, CALLIS_PACKET.z], heading: Math.PI / 2 },
};

function crowdZones(): CrowdZone[] {
  return [
    { id: 'ansbury', x: 820, z: 300, r: 196, n: 40, lines: [
      'The minster bell\'s cracked. You can hear it on the low note.',
      'They\'re tilting Saturday. My money\'s on the Harrowgate lad.',
      'Wipe your boots before the Charter Hall, they take your name.',
      'Somebody\'s left a dray across the Shambles again.',
      'The guildhall clock\'s five minutes fast. It always is.',
      'If the Weighhouse says a pound, it\'s a pound.',
    ] },
    { id: 'hollinford', x: 165, z: 182, r: 42, n: 8, lines: [
      'The ford\'s up to my knees today.',
      'Haverwood\'s thick with mushrooms after the rain.',
    ] },
    { id: 'gullmouth', x: coastX(600) - 80, z: 600, r: 72, n: 16, lines: [
      'Tide\'s turning. Get the nets in.',
      'The light wants oil again.',
      'A gull had my pie. The whole pie.',
    ] },
    { id: 'harrowgate', x: 975, z: 1003, r: 60, n: 12, lines: [
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

interface CraftAction { recipe: string; left: number; t: number; station: Station; cost: Record<string, number>; out: string; xp: number; time: number }
/** How a piece at the anvil is to be made: a researched leaning worked in, and its quality (data/crafting.ts). */
export interface CraftOpts { affix?: string; q?: number }

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
/** A training dummy's count starts again after this many seconds without a blow (and the dummy's whole again: Enemy.ts). */
const PRACTICE_REST = 6;
const tmpV2 = new THREE.Vector3();
/** How far a melee Strike reaches for its foe: from a few blocks off, the swing lunges in. */
const MELEE_REACH = 5.5;
const handL = new THREE.Vector3(), handR = new THREE.Vector3();

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
  /** Quarters, the tavern game (game/QuartersTable.ts): made the first time someone sits down. */
  private quartersT: QuartersTable | null = null;
  private get quarters(): QuartersTable {
    return (this.quartersT ??= new QuartersTable({
      renderer: this.renderer,
      tiles: () => ({ ...((this.flag('qTiles') as Record<string, number> | undefined) ?? {}) }),
      setTiles: (t) => this.setFlag('qTiles', t),
      deck: () => ((this.flag('qDeck') as string[] | undefined) ?? []),
      setDeck: (d) => this.setFlag('qDeck', d),
      nameOf: (npc) => this.npcs.find((n) => n.def.id === npc)?.def.name ?? 'They',
      sound: (n) => this.sfx(n === 'open' ? 'shuffle' : n === 'click' ? 'card' : n as Sfx),
      system: (t) => this.hud.system(t),
      persist: () => this.persist(),
    }));
  }
  /** Sit down with someone who plays. */
  playQuarters(npc: string): void {
    const o = OPPONENT_BY_NPC.get(npc);
    if (!o) return;
    this.hud.closeAll();
    this.cancelActions();
    this.quarters.start(o);
  }
  /** The open world's creatures, the same for every player by them (game/SharedMobs.ts). */
  private shared!: SharedMobs;
  /** Hidden chests across the land (game/Chests.ts). */
  private chests!: Chests;
  /** The towns' dogs and cats, spawned near the player (one list, so each keeps its place). */
  /** Your pet, following you (data/pets.ts), if one is out. */
  private companion: Companion | null = null;
  /** Where feet stand at (x, z) near a height: the floor under a step's reach, for a pet at your heels. */
  private footing(x: number, z: number, near: number): number | null {
    const V = this.world.voxels, ix = Math.floor(x), iz = Math.floor(z);
    for (let y = Math.floor(near) + 2; y > Math.floor(near) - 5; y--) if (isSolid(V.get(ix, y - 1, iz)) && !isSolid(V.get(ix, y, iz))) return y;
    return null;
  }
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
  /** Ships of your own under sail, the raiders and the guns (game/Sailing.ts). */
  sailing!: Sailing;
  /** The camera's distance before you took a ship's helm, to go back to. */
  private rigBeforeHelm = 0;
  private shipPanel: HTMLDivElement | null = null;
  private shipPanelT = 0;
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
  /** The Wake Fair at Hollin Ford, and its games, while the Lantern Wake is on. */
  private fair!: WakeFair;
  /** Your farming patches (data/farming.ts). */
  private farming!: Farming;
  /** Your rowing boat, or the one you've hired (game/Rowboat.ts). */
  private boat!: Rowboat;
  /**
   * Trying something on at a shop, ESO's way: your own figure wearing it (or the mount led out beside
   * you), the camera brought round in front of you, until you walk on, close the shop, or half a minute
   * passes. Nothing is bought or kept.
   */
  private trying: { id: string; at: THREE.Vector3; t: number; mount: CreatureModel | null } | null = null;
  canPreview(id: string): boolean {
    const d = ITEMS[id];
    return !!(d && (d.costume || d.hat || d.capeDesign || d.armor?.look || d.mount));
  }
  previewItem(id: string): void {
    const d = ITEMS[id];
    if (!d || !this.canPreview(id) || this.horse || this.dead) return;
    this.endPreview(false);
    const look = this.wornLook();
    if (d.costume) look.costume = d.costume;
    if (d.hat) look.hat = d.hat as Appearance['hat'];
    if (d.capeDesign) { look.capeDesign = d.capeDesign; look.cape = look.cape ?? '#2a3a5a'; }
    if (d.armor?.look) Object.assign(look, d.armor.look);
    this.player.setAppearance(look, this.scene);
    let mount: CreatureModel | null = null;
    const P = this.player.position, f = this.player.facing;
    if (d.mount) {
      // Led out beside you, side on to the camera
      mount = mountModel(d.mount);
      const x = P.x + Math.cos(f) * 2.4, z = P.z - Math.sin(f) * 2.4;
      mount.root.position.set(x, this.world.voxels.groundBelow(x, P.y + 2, z), z);
      mount.root.rotation.y = f + Math.PI / 2;
      this.scene.add(mount.root);
    }
    this.trying = { id, at: P.clone(), t: 0, mount };
    // The camera round in front of you, a little above, to see it
    this.rig.yaw = f + (d.capeDesign ? Math.PI * 0.85 : 0.35);
    this.rig.pitch = 0.18;
    this.hud.system(`Trying ${d.name}. Walk on to take it off.`);
    this.sfx('click');
  }
  /** Take off whatever you were trying, and (unless something else is about to be tried) dress as you were. */
  private endPreview(dress = true): void {
    const t = this.trying;
    if (!t) return;
    if (t.mount) this.scene.remove(t.mount.root);
    this.trying = null;
    if (dress) this.dress();
  }
  /** The Charter Post cart you're riding, when you are (game/PostRide.ts). */
  private post!: PostRide;
  /** The way along the roads between two post stops, worked out once. */
  private rideWays = new Map<string, [number, number][] | null>();
  private wayBetween(a: { id: string; x: number; z: number }, b: { id: string; x: number; z: number }): [number, number][] | null {
    const k = a.id + '>' + b.id;
    if (!this.rideWays.has(k)) this.rideWays.set(k, roadNet().route([a.x, a.z], [b.x, b.z]));
    return this.rideWays.get(k)!;
  }
  /** The Mewstones ferry runs between these two stops: she's the way across, not the board. */
  private static ferryPair(a: string, b: string): boolean { return (a === 'gullmouth' && b === 'mewstones') || (a === 'mewstones' && b === 'gullmouth'); }
  /** Off the post cart: set down at the stop you were bound for, or (getting off on the way) beside her. */
  private endRide(arrived: boolean, stay = false): void {
    const r = this.post;
    if (!r.active) return;
    const there = POSTS.find((x) => x.id === r.dest), s = r.seat();
    r.end();
    if (stay) return;
    const P = this.player;
    if (arrived && there) {
      const fx = Math.sin(there.ry), fz = Math.cos(there.ry), x = there.x + fx * 2, z = there.z + fz * 2;
      P.teleport(x, this.world.voxels.groundBelow(x, s.y + 4, z), z);
      P.yaw = Math.atan2(fx, fz);
      this.currentPost = there.id;
      this.hud.banner(there.name, 'The Charter Post', true);
    } else {
      // Down off the side of the cart
      const x = s.x + Math.cos(s.yaw) * 1.6, z = s.z - Math.sin(s.yaw) * 1.6;
      P.teleport(x, this.world.voxels.groundBelow(x, s.y + 3, z), z);
      this.hud.system('You climb down off the cart.');
    }
    P.velocity.set(0, 0, 0);
    P.fallStartY = P.position.y;
  }
  fairOn(): boolean { return !!this.fair?.on; }
  /** Hire a rowing boat from the boatman you're talking to: into the water and you in her. */
  hireBoat(): void {
    const P = this.player.position;
    const bm = BOATMEN.slice().sort((a, b) => Math.hypot(a.at[0] - P.x, a.at[1] - P.z) - Math.hypot(b.at[0] - P.x, b.at[1] - P.z))[0];
    if (!bm) return;
    if (this.boat.aboard) { this.hud.system('You\'re in a boat already.'); return; }
    if (this.save.marks < BOAT_HIRE) { this.hud.system(`A boat's ${BOAT_HIRE} marks for the hour.`); return; }
    const surf = this.boat.surface(bm.water[0], bm.water[1], P.y);
    if (surf === null) return;
    this.addMarks(-BOAT_HIRE);
    this.setFlag('boatHire', Date.now() + BOAT_HIRE_MS);
    this.persist();
    this.boat.launch(bm.water[0], bm.water[1], surf, bm.yaw, true);
    this.boardBoat();
    this.hud.system('Dan pushes you off. An hour, and both oars back. W and S row, A and D turn; E by the shore to step out.');
  }
  private boardBoat(): void {
    if (this.horse) { this.hud.system('Get down off your mount first.'); return; }
    this.cancelActions();
    this.seated = null;
    this.emote = null;
    this.boat.aboard = true;
    // Into her seat at once (out of reach of it, you'd count as carried off and be put back out)
    this.boat.seat(this.player.position);
    this.player.velocity.set(0, 0, 0);
    this.sfx('click');
  }
  /** Out of the boat: onto the shore beside her, or over the side into the water. */
  private leaveBoat(to: THREE.Vector3 | null): void {
    const b = this.boat;
    if (!b.aboard) return;
    b.aboard = false;
    const P = this.player;
    if (to) P.teleport(to.x, to.y, to.z);
    else P.position.y -= 0.4;
    P.velocity.set(0, 0, 0);
    P.fallStartY = P.position.y;
    // A hired boat whose hour is up goes back to the boatman once you're out of her
    if (b.hired && Number(this.flag('boatHire') ?? 0) < Date.now()) { b.stow(); this.hud.system('Dan\'s boy rows her back.'); }
  }
  markOnMap(x: number, z: number, label: string): void { this.hud.pin = { x, z }; this.hud.system(`${label}: pinned on your map (M).`); this.sfx('click'); }
  fairPlay(game: string): void { this.fair.play(game as FairGameId); }
  fairPlaysLeft(game: string): number { return this.fair.playsLeft(game as FairGameId); }
  fairGuessed(): boolean { return this.fair.guessedToday(); }
  home!: Home;
  /** The great cabin of a ship of your own, a second home with its own furniture (data/cabins.ts). */
  private cabin!: Home;
  building!: Building;
  /** The halls on Hall Row, dressed as the realm's book has them (game/GuildHalls.ts); your guild's, as its members see it. */
  halls!: GuildHalls;
  /** The carts and horses waiting in the Post's coaching yards (game/PostStations.ts). */
  private postStations!: PostStations;
  hallView: HallView | null = null;
  /** The Post's fares at half: the travel board was opened from the map room of your guild's hall. */
  private hallFare = false;
  /** Laying and digging blocks by hand on your own lot. */
  lotBuild!: LotBuild;
  /** Blocks laid since the realm's book last heard (sent a moment after you stop). */
  private laidDirty = -1;
  planner!: Planner;
  readonly bank: Bank = new Bank({
    pack: () => this.social['host'].pack(),
    count: (id) => this.inv.count(id), canAdd: (id, n) => this.inv.canAdd(id, n),
    give: (id, n) => this.inv.add(id, n), take: (id, n) => this.inv.remove(id, n),
    marks: () => this.save.marks, addMarks: (n) => { this.save.marks = Math.max(0, this.save.marks + n); },
    sound: (n) => this.sfx(n as Sfx), system: (t) => this.hud.system(t),
    persist: () => this.persist(), refresh: () => this.hud.refresh(),
    player: () => this.player.position,
    guildName: () => (this.online.status === 'online' ? this.social.guild?.name ?? null : null),
    guildSend: (op, item, n) => (op === 'get' ? this.online.guildVaultGet() : op === 'in' ? this.online.guildDeposit(item, n) : this.online.guildWithdraw(item, n)),
  });
  /** While visiting: the home whose door is open to you (a lot's id, or 'cottage'). */
  private visitLot: string | null = null;
  /**
   * The realm's book of homes once it's come (server/homes.mjs): which are held, by whom, and what's
   * built on them. Null offline, where only your own home counts and no other is shown.
   */
  private homesBook: Map<string, HomeHeld> | null = null;
  /** Bumped whenever the book changes, so the lots round you are looked at again. */
  private homesVer = 0;
  /** A home asked of the book, what to do once it's granted, and what to do if it isn't. */
  private pendingClaim: { id: string; then: () => void; fail?: () => void; leaving?: string | null } | null = null;
  /** The lots last shown, and where from (they're looked at again as you move or anything changes). */
  private lotsShown: { key: string; x: number; z: number; laid: unknown } = { key: '', x: 1e9, z: 1e9, laid: null };
  /** When the friends list last asked the realm where everyone is (game seconds). */
  friendsAsked = -99;
  /** The online group's frames as the server last sent them (null: not in one). */
  private groupRows: GroupRow[] | null = null;
  /** Group dungeons: the finder, a run, the henchmen (game/Dungeons.ts). */
  dungeons!: Dungeons;
  /** Story set pieces: things that stand in the world only while a chapter needs them. */
  private setPieces!: SetPieces;
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
  /** The birds over the land round you, the same for everyone (game/Birds.ts). */
  private birds!: Birds;
  /** Every bench, chair and stool in the world (sit on one with E), and the seat you're on. */
  private seats: { x: number; y: number; z: number; ry: number; half: number; both: boolean }[] = [];
  private seated: { x: number; y: number; z: number; yaw: number } | null = null;
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
  /** A skill pressed mid-swing: it fires the moment the swing lands (ESO's weaving), not after the follow-through. */
  private queuedSkill = -1;
  /**
   * Auto-attack (GW2's): Strike once at a foe and you keep striking it, moving or not, until it falls,
   * you turn to something else, or it gets well away. Off in Settings for those who'd rather press.
   */
  private autoFoe: Enemy | null = null;
  /** A blow rolled through clean opens a riposte: the next Strike within it is a sure critical. */
  private riposteUntil = 0;
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
      // (held while the trailer steps the frames itself: src/dev/trailer.ts)
      if (!(window as unknown as { __erHold?: boolean }).__erHold) this.frame(dt);
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
    this.crowd = new Crowd(this.scene, this.world.voxels, crowdZones(), (pos, h, text) => this.floatAt(pos, h, text, 'chatter'), () => this.world.doors());
    // The watch keeps every town's peace: the Counties' busy towns, and Morrow's (data/justice.ts)
    // (the Counties' busy towns, and Morrow's: data/justice.ts)
    this.roadfolk = new Roadfolk(this.scene, this.world.voxels, [...crowdZones(), ...JURISDICTIONS.filter((j) => landOf(j) === 'morrow').map((j) => ({ id: j.id, x: j.x, z: j.z, r: j.r }))], (pos, h, text) => this.floatAt(pos, h, text, 'chatter'));
    this.scene.add(this.torchLight);
    this.voyage = new Voyage({
      scene: this.scene, props: this.world.props, player: this.player,
      sfx: (n, v) => this.sfx(n as Sfx, v), banner: (t, sub) => this.hud.banner(t, sub, true),
    });
    this.sailing = new Sailing({
      scene: this.scene, props: this.world.props, voxels: this.world.voxels,
      sfx: (n, v) => this.sfx(n as Sfx, v), system: (t) => this.hud.system(t), banner: (t, sub) => this.hud.banner(t, sub, true),
      floatAt: (pos, h, text, kind) => this.floatAt(pos, h, text, kind),
      sank: (kind, name, at) => this.raiderSunk(kind.id, kind.name, kind.level, kind.marks, kind.plunder, name, at),
      lost: () => this.shipLost(),
      wanted: () => this.justice.prices()[0]?.n ?? 0,
      gunMul: () => 1 + this.mastery('gunnery'), hullMul: () => 1 + this.mastery('timbers'),
      // (the Black Hen is out east of the Mewstones while the Margery's Bell wants her: data/content/gullmouthSide.ts)
      raiderName: (lane) => (lane === 0 && this.stage('gullMargery') === 'hen' ? 'Black Hen' : null),
      sendState: (st) => { if (this.online.online) this.online.shipState(st); },
      sendHit: (name, dmg) => { if (this.online.online) this.online.shipHit(name, dmg); },
      sendSunk: (by) => { if (this.online.online) this.online.shipSunk(by); },
    });
    this.justice = new Justice({
      noticed: () => this.companions?.event('crime'),
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
      voxels: this.world.voxels,
      dozing: () => this.input.held('Space'),
      dismount: () => { this.dismount(true); if (this.pillion !== null) this.leavePillion(); },
      hudHidden: (on) => this.hud.setHudHidden(on),
      lockpick: () => { const T = TIERS[1]; return this.hud.lockpick(T.name, T.pins, T.zone, T.speed, () => this.inv.count('lockpick'), () => { this.inv.remove('lockpick', 1); this.sfx('pickSnap' as Sfx); }); },
      busy: () => !!this.dialogue || this.dead || !!this.cine,
      props: this.world.props, hour: () => this.world.sky.hour,
      count: (it) => this.inv.count(it), give: (it, n = 1) => this.give(it, n), take: (it, n = 1) => { this.inv.remove(it, n); this.hud.refresh(); },
      lockDoorway: (x, y0, z, shut) => {
        const V = this.world.voxels;
        if (!V.isLoaded(x, z)) return;
        for (const y of [y0, y0 + 1]) { const b = V.get(x, y, z); if (shut && b === B.Air) V.set(x, y, z, B.Barrier); else if (!shut && b === B.Barrier) V.set(x, y, z, B.Air); }
        for (const d of this.world.doors()) if (Math.abs(d.hinge.y - y0) < 2 && Math.abs(d.hinge.x - x - 0.5) < 1.6 && Math.abs(d.hinge.z - z - 0.5) < 1.6) d.locked = shut;
      },
    });
    this.festivals = new Festivals({
      scene: this.scene, voxels: this.world.voxels, particles: this.particles, lamps: this.world.extraLamps,
      flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      give: (it, n) => this.give(it, n), count: (it) => this.inv.count(it), addMarks: (n) => this.addMarks(n),
      banner: (t, s) => this.hud.banner(t, s, true), system: (t) => this.hud.system(t), sound: (n) => this.sfx(n),
    });
    this.birds = new Birds(this.scene);
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
    this.player.extraSolid = (x, y, z, half, height) => this.world.boardable.some((f) => f.blocks(x, y, z, half, height));
    this.farming = new Farming({
      scene: this.scene, voxels: this.world.voxels,
      flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      give: (it, n) => this.give(it, n), take: (it, n) => this.take(it, n), count: (it) => this.inv.count(it),
      level: (sk) => this.level(sk), addXp: (sk, n) => this.addXp(sk, n),
      system: (t) => this.hud.system(t), sound: (n) => this.sfx(n), persist: () => this.persist(),
      player: () => this.player.position,
    }, farmPatches(sitePlan().sites));
    // Hollin Ford's own (world/structures.ts places them, the ford post where the stones start)
    for (const m of MONUMENTS) if (m.town === 'hollin' && m.at && !WORLD_THINGS.some((w) => w.id === 'monument:' + m.id)) {
      WORLD_THINGS.push({ id: 'monument:' + m.id, x: m.at[0], z: m.at[1], label: m.model === 'pump' ? 'Look at the village pump' : 'Read ' + m.title.replace(/^The /, 'the '), radius: 2.4, read: 'monument:' + m.id });
    }
    // The cities' monuments stand where the planner put them; each has its plaque to read
    for (const m of sitePlan().monuments) if (!WORLD_THINGS.some((w) => w.id === 'monument:' + m.id)) {
      const def = MONUMENTS.find((k) => k.id === m.id)!;
      WORLD_THINGS.push({ land: def.town === 'callis' || def.town === 'northgate' || def.town === 'saltpenny' || def.town === 'tenwells' || def.town === 'liftwick' || def.town === 'branchley' || def.town === 'reedwater' ? 'morrow' : undefined, id: 'monument:' + m.id, x: m.x, z: m.z, y: m.y, label: (def.model === 'drownedboard' || def.model === 'tallystone' || def.model === 'priceboard' || def.model === 'companysign' || def.model === 'tallypost' || def.model === 'keeperstones' || def.model === 'watchboard' || def.model === 'oarrack' || def.model === 'lawstone' || def.model === 'routeboard' || def.model === 'assemblynotice' || def.model === 'heightmarks' || def.model === 'chalklizard' || def.model === 'floodpunt' ? 'Read ' : def.model === 'flywheel' || def.model === 'cairn' || def.model === 'sledge' || def.model === 'wallbell' || def.model === 'figurehead' || def.model === 'compassrose' || def.model === 'glassslab' || def.model === 'boundstone' || def.model === 'doorstep' || def.model === 'longseat' || def.model === 'findingpost' || def.model === 'bogoak' ? 'Look at ' : 'Read the plaque: ') + def.title.replace(/^The /, 'the '), radius: def.model === 'jawbones' || def.model === 'companysign' ? 4.5 : 2.8, read: 'monument:' + m.id });
    }
    this.boat = new Rowboat(this.scene, this.world.voxels, this.world.props);
    this.post = new PostRide(this.scene, this.world.voxels);
    this.fair = new WakeFair({
      scene: this.scene, voxels: this.world.voxels, particles: this.particles, lamps: this.world.extraLamps,
      fest: () => this.festivals.fest,
      flag: (k) => this.flag(k), setFlag: (k, v) => { this.setFlag(k, v); this.persist(); },
      give: (it, n) => this.give(it, n), take: (it, n) => this.take(it, n), count: (it) => this.inv.count(it),
      marks: () => this.save.marks, addMarks: (n) => { if (n < 0) this.save.marks = Math.max(0, this.save.marks + n); else this.addMarks(n); this.hud.refresh(); },
      system: (t) => this.hud.system(t), banner: (t, sub) => this.hud.banner(t, sub, true), sound: (n) => this.sfx(n),
      player: () => this.player.position,
    });
    this.home = new Home({
      scene: this.scene, flag: (k) => this.flag(k), setFlag: (k, v) => this.setFlag(k, v),
      count: (it) => this.inv.count(it), give: (it) => this.give(it), take: (it) => this.take(it),
      player: () => this.player.position, yaw: () => this.player.yaw,
      system: (t) => this.hud.system(t), sound: (n) => this.sfx(n as Sfx),
      shape: () => this.myHome(),
    });
    // (the cabin keeps its furniture under 'cabin:<hull>', one layout for each kind of ship you own)
    const cabinFlag = (k: string) => (k === 'home' ? 'cabin:' + (this.cabinHull() ?? 'none') : k);
    this.cabin = new Home({
      scene: this.scene, flag: (k) => this.flag(cabinFlag(k)), setFlag: (k, v) => this.setFlag(cabinFlag(k), v),
      count: (it) => this.inv.count(it), give: (it) => this.give(it), take: (it) => this.take(it),
      player: () => this.player.position, yaw: () => this.player.yaw,
      system: (t) => this.hud.system(t), sound: (n) => this.sfx(n as Sfx),
      shape: () => { const h = this.cabinHull(); return h ? cabinShape(h) : null; },
      reserved: () => { const h = this.cabinHull(); return h ? cabinReserved(h) : new Set(); },
    });
    this.building = new Building({ scene: this.scene, voxels: this.world.voxels, buildProps: (s) => this.world.buildProps(s) });
    this.halls = new GuildHalls({ scene: this.scene, buildProps: (s) => this.world.buildProps(s) });
    this.world.extraDoors = () => this.building.doors();
    this.lotBuild = new LotBuild({
      scene: this.scene, voxels: this.world.voxels,
      lot: () => { const pl = readPlot(this.flag('plot')); return pl ? LOTS.find((l) => l.id === pl.lot) ?? null : null; },
      laid: () => readLaid(this.flag('lotBlocks')),
      setLaid: (b) => { this.setFlag('lotBlocks', b); this.laidDirty = this.elapsed; },
      count: (i) => this.inv.count(i), take: (i) => this.take(i), give: (i) => this.give(i),
      player: () => this.player.position,
      aim: () => {
        const ray = new THREE.Raycaster(), touch = document.body.classList.contains('touch');
        ray.setFromCamera(new THREE.Vector2(touch ? 0 : (this.input.mouseX / innerWidth) * 2 - 1, touch ? 0 : -(this.input.mouseY / innerHeight) * 2 + 1), this.camera);
        return { o: ray.ray.origin.clone(), d: ray.ray.direction.clone() };
      },
      system: (t) => this.hud.system(t), sound: (n) => this.sfx(n as Sfx),
    });
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
        n *= this.healingTaken();
        const h = Math.min(this.maxHp - this.hp, Math.round(n));
        if (h > 0 && !this.dead) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
        this.dungeons.shareHeal(n);
      },
      maxHp: () => this.maxHp,
      cleanse: (n) => this.cleanse(n),
      friends: () => this.friendsNear(),
      hp: () => this.hp,
      level: () => this.level('melee'),
      voxels: () => this.world.voxels,
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
      used: (id) => this.skillUsed(id),
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
    // Training dummies in the masters' yards (data/content/masters.ts)
    for (const d of DUMMY_SPOTS) {
      const e = new Enemy(ENEMIES.dummy, d.x, d.z, this.world.voxels, this.world.grid);
      e.yaw = d.yaw;
      this.enemies.push(e);
      this.scene.add(e.model.root, e.telegraph);
    }
    for (const a of ANIMAL_SPAWNS) {
      const an = new Animal(a.kind, a.x, a.z, a.radius, this.world.voxels, this.world.grid, a.kind === 'duck' && a.x % 2 < 1 ? {} : a.kind === 'duck' ? { a: '#8a6a4a', b: '#7a5a3a' } : {});
      this.animals.push(an);
      this.scene.add(an.model.root);
    }
    this.stables = new Stables(this.scene, this.world.voxels);
    this.postStations = new PostStations(this.scene, this.world.voxels);
    // Dogs and cats about the towns: by every Charter Post sign and in Hollin Ford, coats from a few kinds
    {
      const dogCoats: Palette[] = [{ a: '#26211e', b: '#efe8dc', c: '#a8682e' }, { a: '#8a5a2e', b: '#e8d8b8', c: '#5a3a1e' }, { a: '#c8a060', b: '#f0e4c8', c: '#8a6a3a' }, { a: '#3a3a3a', b: '#d8d8d8', c: '#6a6a6a' }];
      const catCoats: Palette[] = [{ a: '#d8843a', b: '#9a5420', c: '#f2e8d8' }, { a: '#2a2626', b: '#1a1616', c: '#3a3434' }, { a: '#8a8a8e', b: '#5a5a60', c: '#d8d8dc' }, { a: '#f0ece4', b: '#c8843a', c: '#ffffff' }];
      const spots: [number, number][] = [[171.5, 188.5], [147.5, 183.5], [182.5, 196.5], ...POSTS.filter((q) => !q.ferryFrom).flatMap((q): [number, number][] => [[q.x + 4.5, q.z + 3.5], [q.x - 4.5, q.z + 2.5]]), [687.5, 420.5], [675.5, 286.5], [787.5, 182.5]];
      spots.forEach(([x, z], i) => this.pets.push({ kind: i % 3 === 1 ? 'dog' : 'cat', x, z, pal: i % 3 === 1 ? dogCoats[i % dogCoats.length] : catCoats[(i * 7) % catCoats.length], a: null }));
      for (const st of this.world.sites) for (const ws of st.stations ?? []) this.worldStations.push(ws);
      for (const st of this.world.sites) for (const d of st.props) {
        if (d.t === 'bench') this.seats.push({ x: d.x, y: d.y, z: d.z, ry: d.ry ?? 0, half: (d.len ?? 1.6) / 2 - 0.3, both: true });
        else if (d.t === 'furn' && (d.item === 'chair' || d.item === 'stool' || d.item === 'bench')) this.seats.push({ x: d.x, y: d.y, z: d.z, ry: d.ry ?? 0, half: d.item === 'bench' ? 0.6 : 0, both: d.item !== 'chair' });
      }
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
    this.companions = new Companions({
      scene: this.scene,
      voxels: this.world.voxels,
      player: () => ({ pos: this.player.position, yaw: this.player.yaw, speed: this.player.speed, dead: this.dead, riding: !!this.horse, swimming: this.player.swimming, hp: this.hp, max: this.maxHp }),
      level: () => this.level('melee'),
      target: () => this.target,
      fighting: () => this.elapsed - this.lastCombat < 4,
      hit: (e, d) => this.dealDamage(e, d * (0.9 + Math.random() * 0.2), Math.random() < 0.1, true),
      healPlayer: (n) => { if (this.dead) return; const h = Math.min(this.maxHp - this.hp, Math.round(n)); if (h > 0) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); this.particles.heal(this.player.position); } },
      flag: (k) => this.flag(k),
      setFlag: (k, v) => this.setFlag(k, v),
      say: (pos, h, text) => this.floatAt(pos, h, text, 'chatter'),
      system: (t) => this.hud.system(t),
      hour: () => this.world.sky.hour,
      festival: () => (this.festivals.view().on?.name === 'The Lantern Wake' ? 'lantern' : null),
      town: (x, z) => {
        const towns: [string, number, number, number][] = [['ansbury', 845, 360, 70], ['gullmouth', coastX(600) - 30, 595, 60], ['harrowgate', 1000, 1010, 60], ['kelderby', 303, 1470, 40], ['kirk', 1174, 1816, 30]];
        const t = towns.find(([, tx, tz, r]) => Math.hypot(x - tx, z - tz) < r);
        return t ? (t[0] as never) : null;
      },
    });
    this.shared = new SharedMobs({
      others: () => [...this.online.remotes.values()].map((r) => [r.id, r.model.root.position] as [number, THREE.Vector3]),
      me: () => this.player.position,
      send: (key, share) => this.online.mobHit(key, share),
      claimed: (e) => this.dungeons.owns(e),
      now: () => this.elapsed,
    });
    this.setPieces = new SetPieces(this.scene, this.world.voxels, this.world.props, SET_PIECES);
    this.dungeons = new Dungeons({
      cleared: () => this.dailies.bump('dungeon'),
      companion: () => (this.companions.active ? this.companions.henchmanOf(this.companions.active) : null),
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
      read: (title, text) => this.hud.showReadable(title, text),
    });
    this.online = new Online({
      scene: this.scene,
      night: () => this.world.sky.night,
      mySeat: () => {
        // On the Post: the cart, with its spare benches for whoever climbs up
        if (this.post.active) return { ...this.post.where, mount: POST_CART_KEY };
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
      guildVault: (v) => this.bank.guildState(v),
      guildRefund: (item, n, why) => this.bank.guildRefund(item, n, why),
      guildWithdrawn: (item, n) => this.bank.guildOut(item, n),
      halls: (list) => { this.halls.book = list; },
      hall: (v) => { this.hallView = v?.guild ? v : null; this.hud.refresh('guild'); },
      aid: (from, heal, ward, secs) => {
        if (this.dead) return;
        // (capped here, by your own health: the realm passes it on, it doesn't keep anyone's)
        const h = Math.min(this.maxHp - this.hp, Math.round(Math.min(heal, this.maxHp * 0.6)));
        if (h > 0) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
        if (ward > 0) { this.kit.addShield(Math.min(ward, this.maxHp * 0.5), Math.min(secs, 12)); this.floatAt(this.player.position, 2.6, `Warded by ${from}`, 'heal'); }
      },
      hallRefund: (item, n, why) => { if (item) this.give(item, n); else this.save.marks += n; if (why) this.hud.system(why); this.hud.refresh(); },
      mobHit: (key: string, share: number, from: number) => {
        const e = this.shared.theirs(this.enemies, key, share, from);
        if (!e) return;
        if (this.target === e) this.target = null;
        // Your blow was in it: the kill is yours too
        if (this.shared.wasMine(e)) this.onEnemyKilled(e, true);
      },
      groupKill: (type: string) => {
        this.setFlag('killed:' + type, Number(this.flag('killed:' + type) ?? 0) + 1);
        this.hud.setTracker(this.questEntries());
      },
      revived: (by: string) => { if (this.dead) { this.raise(0.5); this.hud.system(`${by} helps you to your feet.`); this.sfx('quest', 0.5); } },
      wbSeek: (boss: string | null) => { this.wbSeek = boss; this.hud.refresh('finder'); },
      mobLedger: (list: [string, number][]) => { for (const [k, ms] of list) this.mobDeadElsewhere(k, ms); },
      homeAsked: (from: string) => {
        if (!this.home.owned) { this.online.homeShow(from, true, null); return; }
        const where = this.myVilla() ? { lot: this.myVilla()!.id } : readPlot(this.flag('plot'));
        this.hud.ask(`${from} would like to visit your home.`, () => this.online.homeShow(from, true, this.home.pieces(), where), () => this.online.homeShow(from, false, null), 60);
      },
      shipState: (name: string, st: unknown) => this.sailing.remoteShip(name, st as ShipState | null),
      shipHurt: (from: string, dmg: number) => this.sailing.hurtByRemote(dmg, from),
      shipKill: (name: string) => {
        this.setFlag('captainsSunk', Number(this.flag('captainsSunk') ?? 0) + 1);
        this.hud.banner(`${name}'s ship is going down`, 'Sunk in the Freewater', true);
        this.sfx('quest');
      },
      homeShow: (owner: string, pieces: unknown[], plot: unknown) => {
        const vl = VILLA_BY_ID.get(String((plot as { lot?: unknown } | null)?.lot ?? ''));
        const hp = vl ? null : readPlot(plot);
        const shape = vl ? villaShape(vl) : plotShape(hp) ?? COTTAGE_SHAPE;
        this.visitLot = vl ? vl.id! : hp?.spec ? hp.lot : 'cottage';
        this.home.visit(owner, pieces as Piece[], shape);
        const lot = hp?.spec ? LOTS.find((l) => l.id === hp.lot)! : null;
        this.hud.system(vl ? `${owner}'s home is ${vl.name} on the Mirador, above Callis. The door's open to you.` : lot ? `${owner}'s house stands on ${lot.name}, ${WENDSIDE_LOTS.includes(lot) ? 'east of Hollin Ford' : `by ${(POSTS.find((q) => q.id === lot.town)?.name ?? 'the road').split(',')[0]}`}. The door's open to you.` : `${owner}'s home is Wendside Cottage, on the road east of Hollin Ford. The door's open to you.`);
        this.hud.pin = { x: shape.x0 + shape.w / 2, z: shape.z0 + shape.d / 2 };
      },
      homes: (list: Record<string, HomeHeld>, mine: string | null, lapsed: string | null) => {
        this.homesBook = new Map(Object.entries(list));
        this.homesVer++;
        // (not while the page is about to reload onto the server's newer copy of this character)
        if (!this.restoring) this.reconcileHome(mine, lapsed);
      },
      home: (id: string, h: HomeHeld | null) => {
        if (!this.homesBook) return;
        if (h) this.homesBook.set(id, h); else this.homesBook.delete(id);
        this.homesVer++;
      },
      homeClaimed: (id: string, ok: boolean, why: string, owner: string) => {
        const c = this.pendingClaim;
        if (!c || c.id !== id) return;
        this.pendingClaim = null;
        if (ok) { c.then(); return; }
        // Not granted: keep hold of the one you were leaving, and say why
        if (c.leaving) this.online.homeClaim(c.leaving);
        if (c.fail) { c.fail(); return; }
        this.hud.system(why === 'taken' ? `${owner} has just taken ${this.homeName(id)}.` : why === 'one' ? 'The Charter\'s book already has a home in your name.' : 'The Charter\'s book won\'t take another lease just now.');
        this.sfx('fail');
      },
      chat: (from, t0, id, kind) => {
        // Someone you've ignored isn't heard, aloud or in a whisper
        if (from !== this.save.name && this.isIgnored(from)) return;
        if (kind === 'trade' && this.save.settings.hideTrade && from !== this.save.name) return;
        const t = this.save.settings.filterChat ? filterLanguage(t0) : t0;
        this.hud.chat(from, t, kind);
        if (kind === 'whisper') { this.social.lastWhisper = from; this.sfx('click'); }
        // Only what's said aloud shows over a head: group, guild and whispers are private
        if (id !== undefined && (kind === 'say' || kind === 'local' || kind === 'emote' || !kind)) this.addBubble(id === this.online.myId ? -1 : id, kind === 'emote' ? `${from} ${t}` : t, kind === 'emote');
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
    this.world.onChunk = (cx, cz, r) => { this.spawnChunk(cx, cz, r); this.building?.chunkLoaded(cx, cz); if (this.homesBook) this.lockCottage(); };
    this.world.onChunkGone = (cx, cz) => this.despawnChunk(cx, cz);
    this.mode = 'title';
    this.applySettings();
    // Keep the loading screen up until the square is built, so the menu never shows half a village.
    // (Come here to cross from the other land: straight back into the character who crossed.)
    try { this.autoEnter = sessionStorage.getItem(ENTER_KEY); sessionStorage.removeItem(ENTER_KEY); } catch { this.autoEnter = null; }
    this.hud.showTitle(this.autoEnter ? 'Coming home…' : 'Raising Hollin Ford…');
    this.menuPending = true;
  }

  // =================================================================== GameApi
  flag(key: string): unknown { return this.save.flags[key]; }
  setFlag(key: string, value: unknown = true): void {
    // A companion notices the first time you stand on a vista, find a wonder, read a book
    if (value && !this.save.flags[key] && this.companions) {
      if (key.startsWith('vista:')) this.companions.event('vista');
      else if (key.startsWith('found:sc-')) this.companions.event('wonder');
      else if (key.startsWith('book:')) this.companions.event('book');
    }
    this.save.flags[key] = value;
  }
  stage(q: string): string | undefined { return this.save.quests[q]; }
  setStage(q: string, s: string): void {
    const prev = this.save.quests[q];
    if (prev === s) return;
    this.save.quests[q] = s;
    if (s === 'done') this.dailies?.bump('quest');
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
      this.companions?.event('quest');
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
    } else if (ITEMS[item]) {
      // A full pack loses nothing: it goes ahead by Charter Post, to be collected at any post box
      this.toParcel(item, n);
      this.hud.refresh('inv');
      return true;
    }
    this.hud.refresh('inv');
    return ok;
  }

  /** What wouldn't fit in the pack, held at the Charter Post until it's collected at any post box. */
  private get parcel(): { id: string; n: number }[] { return (this.save.flags.parcel as { id: string; n: number }[] | undefined) ?? []; }
  private toParcel(item: string, n: number): void {
    const p = this.parcel.map((x) => ({ ...x }));
    const same = ITEMS[item]?.stack ? p.find((x) => x.id === item) : undefined;
    if (same) same.n += n; else p.push({ id: item, n });
    this.setFlag('parcel', p);
    this.persist();
    this.hud.system(`Your pack is full, so ${ITEMS[item].name}${n > 1 ? ` ×${n}` : ''} has gone ahead by Charter Post. Collect it at any post box.`);
    this.sfx('click');
  }
  /** Take what will fit out of the parcel. */
  private collectParcel(): void {
    const left: { id: string; n: number }[] = [];
    let got = 0;
    for (const st of this.parcel) {
      if (!ITEMS[st.id]) continue;
      if (ITEMS[st.id].stack) { if (this.inv.canAdd(st.id, st.n)) { this.inv.add(st.id, st.n); got += st.n; } else left.push(st); continue; }
      let k = st.n;
      while (k > 0 && this.inv.canAdd(st.id, 1)) { this.inv.add(st.id, 1); k--; got++; }
      if (k > 0) left.push({ id: st.id, n: k });
    }
    if (left.length) this.setFlag('parcel', left); else delete this.save.flags.parcel;
    this.persist();
    this.hud.refresh('inv');
    if (got) this.sfx('pickup');
    this.hud.system(left.length ? `You take what fits. ${left.reduce((a, x) => a + x.n, 0)} still waiting: make some room and come back.` : got ? 'Your parcel, all of it.' : 'Nothing will fit. Make some room first.');
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
  openTravel(from: string): void { this.currentPost = from; this.hallFare = false; this.hud.show('travel'); }
  /** A ferry calling at both these Post stops, and their places on her route. */
  private ferryBetween(a: string, b: string): { ship: ScheduledShip; from: number; to: number } | null {
    for (const ship of this.world.ferries) {
      const i = ship.route.stops.findIndex((q) => q.post === a), j = ship.route.stops.findIndex((q) => q.post === b);
      if (i >= 0 && j >= 0) return { ship, from: i, to: j };
    }
    return null;
  }
  /** A ferry to a stop from somewhere not on her route: the ship, and her stop the Post can take you to. */
  private ferryTo(a: string, b: string): { ship: ScheduledShip; home: (typeof POSTS)[number] } | null {
    const here = POSTS.find((q) => q.id === a);
    for (const ship of this.world.ferries) {
      if (!ship.route.stops.some((q) => q.post === b) || ship.route.stops.some((q) => q.post === a)) continue;
      // (her stop with a road to here: the nearest that isn't an island)
      const homes = ship.route.stops.map((q) => POSTS.find((x) => x.id === q.post)!).filter((x) => here && landOf(x) === landOf(here) && !x.ferryFrom);
      const home = homes.sort((x, y) => Math.hypot(x.x - here!.x, x.z - here!.z) - Math.hypot(y.x - here!.x, y.z - here!.z))[0];
      if (home) return { ship, home };
    }
    return null;
  }
  /** A wait, as the timetables say it. */
  private static wait(sec: number): string { return sec < 50 ? `${Math.max(5, Math.round(sec / 5) * 5)} seconds` : `${Math.round(sec / 60)} minute${Math.round(sec / 60) === 1 ? '' : 's'}`; }
  /** What each ferry was doing last frame, so the bell rings when she comes in and before she goes. */
  private ferryLast = new Map<ScheduledShip, { spell: number; warned: boolean; checked: boolean }>();
  /** The ferries' bells and the mates' calls, for anyone near; the Assembly's passes looked at before she sails. */
  private ferryCalls(): void {
    const now = realmNow() / 1000, P = this.player.position;
    for (const ship of this.world.ferries) {
      const st = ship.state(now), last = this.ferryLast.get(ship), R = ship.route;
      const near = ship.root.position.distanceTo(P) < 110, aboard = ship.aboard(P);
      const Ship = R.ship[0].toUpperCase() + R.ship.slice(1);
      if (!last || last.spell !== st.spell) {
        if (last && st.docked !== null) {
          const stop = R.stops[st.docked];
          if (near) { this.sfx('bell', 0.7); this.hud.system(`${Ship} is in at ${stop.name}. She sails for ${R.stops[st.to].name} in ${Game.wait(st.left)}.`); }
          if (aboard) this.hud.banner(stop.name, Ship, true);
        } else if (last && aboard) this.hud.system(`${Ship} casts off for ${R.stops[st.to].name}.`);
        this.ferryLast.set(ship, { spell: st.spell, warned: false, checked: false });
        continue;
      }
      if (st.docked === null) continue;
      if (!last.warned && st.left < 15) {
        last.warned = true;
        if (near) { this.sfx('bell', 0.5); this.hud.system(`The mate of ${R.ship}: "All aboard for ${R.stops[st.to].name}!"`); }
      }
      // Bound for a stop you need a pass for: the mate puts you back on the jetty
      const gate = R.stops[st.to].gate;
      if (!last.checked && st.left < 2 && aboard && gate && !this.flag(gate)) {
        last.checked = true;
        const pl = ship.plan.piers[st.docked], dx = pl.to[0] - pl.from[0], dz = pl.to[1] - pl.from[1], L = Math.hypot(dx, dz);
        this.player.teleport(pl.to[0] + 0.5 - (dx / L) * 2, SEA + 1.05, pl.to[1] + 0.5 - (dz / L) * 2);
        this.player.velocity.set(0, 0, 0);
        this.hud.system(`The mate of ${R.ship}: "${R.stops[st.to].refused ?? 'Not without a pass.'}"`);
      }
    }
  }
  /** Each ferry's timetable as her jetty's board gives it. */
  private readTimetable(ship: ScheduledShip, stop: number): void {
    const now = realmNow() / 1000, R = ship.route;
    const lines = this.world.ferries.filter((x) => x.route.id === R.id).map((x) => {
      const nx = x.nextFrom(stop, now);
      return nx.alongside ? `Alongside now, and sails for ${R.stops[nx.to].name} in ${Game.wait(nx.wait)}.` : `Next sails from here for ${R.stops[nx.to].name} in ${Game.wait(nx.wait)}.`;
    });
    this.hud.system(`${R.ship[0].toUpperCase() + R.ship.slice(1)}, ${R.stops.map((q) => q.name).join(' · ')}, there and back. ${[...new Set(lines)].join(' ')} No fare: the Charter pays her out of the harbour dues.`);
  }

  /**
   * You and everyone on your side near you, for a Mender's heals and wards (game/ClassKit.ts): you first,
   * then a dungeon's henchmen still standing, then groupmates within forty blocks (theirs go by the realm).
   */
  private friendsNear(): Friend[] {
    const P = this.player.position, out: Friend[] = [];
    out.push({
      name: this.save.name, pos: P, hp: this.hp, max: this.maxHp, me: true,
      heal: (n) => { const h = Math.min(this.maxHp - this.hp, Math.round(n * this.healingTaken())); if (h > 0 && !this.dead) { this.hp += h; this.floatAt(P, 2.2, `+${h}`, 'heal'); } },
      ward: (n, secs) => this.kit.addShield(n, secs),
    });
    for (const a of this.dungeons.run?.allies ?? []) {
      if (a.down || a.pos.distanceTo(P) > 40) continue;
      out.push({
        name: a.name, pos: a.pos, hp: a.hp, max: a.max,
        heal: (n) => { const h = a.heal(n); if (h > 0) this.floatAt(a.pos, 2.4, `+${h}`, 'heal'); },
        ward: (n, secs) => { a.ward = Math.max(a.ward, n); a.wardUntil = performance.now() / 1000 + secs; },
      });
    }
    const grp = this.social.group;
    if (grp && this.online.status === 'online') for (const m of grp.members) {
      if (m.id === this.online.myId || m.hp <= 0) continue;
      const r = this.online.remotes.get(m.id);
      if (!r || r.model.root.position.distanceTo(P) > 40) continue;
      out.push({
        name: m.name, pos: r.model.root.position, hp: m.hp, max: m.max,
        heal: (n) => { this.online.aid(m.id, n, 0, 0); m.hp = Math.min(m.max, m.hp + n); this.floatAt(r.model.root.position, 2.4, `+${Math.round(n)}`, 'heal'); },
        ward: (n, secs) => this.online.aid(m.id, 0, n, secs),
      });
    }
    return out;
  }

  /** A Post fare: half, from the map room of your guild's hall. */
  private fareOf(a: (typeof POSTS)[number], b: (typeof POSTS)[number]): number { const f = postFare(a, b); return this.hallFare ? Math.ceil(f / 2) : f; }

  // =================================================================== Guild halls (data/guildhalls.ts)
  guildHall() {
    const v = this.hallView, rank = this.social.guild?.rank ?? null;
    // (the free halls from the book everyone hears, so they're right for someone with no guild too)
    const free = HALLS.filter((h) => !this.halls.holder(h.id)).map((h) => h.id);
    return { online: this.online.status === 'online', guild: this.social.guild?.name ?? null, officer: rank === 'leader' || rank === 'officer', hall: v?.hall ?? null, free, vaultMarks: v?.vaultMarks ?? 0 };
  }
  leaseHall(id: string): void { if (this.online.status === 'online') this.online.hallLease(id); }
  openHallPage(): void { this.hud.socialPage('hall'); this.hud.show('guild'); if (this.online.status === 'online') this.online.hallGet(); }
  /** Your guild's hall, if it has one. */
  myHall() { const id = this.hallView?.hall as HallId | undefined; return id ? HALL_BY_ID.get(id) ?? null : null; }
  /** To your guild's hall from anywhere, once an hour: you arrive inside the front door. */
  goToHall(): void {
    const h = this.myHall();
    if (!h) { this.hud.system('Your guild has no hall.'); return; }
    const wait = 3600_000 - (Date.now() - Number(this.flag('hallGoAt') ?? 0));
    if (wait > 0) { this.hud.system(`You can go straight to the hall again in ${Math.ceil(wait / 60000)} min. The Charter Post rides to Ansbury's south gate from anywhere.`); return; }
    if (this.dead || this.dialogue || this.voyage.active || this.post.active) return;
    this.dismount(true);
    this.cancelActions();
    this.hud.closeAll();
    const a = hallArrive(h);
    this.player.teleport(a.x, a.y + 0.05, a.z);
    this.player.velocity.set(0, 0, 0);
    this.player.fallStartY = this.player.position.y;
    this.setFlag('hallGoAt', Date.now());
    this.sfx('open', 0.6);
    this.hud.system(`${h.name[0].toUpperCase() + h.name.slice(1)}, Hall Row, outside Ansbury's south gate.`);
    this.persist();
  }
  /** Goods (or marks, item null) toward the hall's next wing: from your pack, or an officer's from the vault. */
  hallGive(item: string | null, n: number, vault = false): void {
    if (this.online.status !== 'online' || !this.hallView?.project || n <= 0) return;
    if (!vault) {
      if (item) { n = Math.min(n, this.inv.count(item)); if (n <= 0) return; this.inv.remove(item, n); }
      else { n = Math.min(n, this.save.marks); if (n <= 0) return; this.save.marks -= n; }
    }
    this.online.hallGive(item, n, vault);
    this.sfx('coin');
    this.hud.refresh();
    this.persist();
  }
  /** Supper at the long table, once a day. */
  private hallSupper(): void {
    const today = Math.floor(Date.now() / 86_400_000);
    if (Number(this.flag('hallSupper') ?? -1) === today) { this.hud.system('You\'ve had your supper in hall today. Come back tomorrow.'); return; }
    this.setFlag('hallSupper', today);
    this.setFlag('buff:food', { id: 'hall_supper', left: 45 * 60 });
    this.hp = this.maxHp;
    this.sfx('eat', 0.8);
    this.hud.system('Supper in hall: a tenth more health, and stamina back a quarter faster, for three-quarters of an hour.');
    this.hud.refresh();
  }
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
    // Out to sea with you on her deck, across the sea between the lands, and in on the far side
    const from = to === 'morrow' ? 'counties' : 'morrow';
    this.rig.yaw = HARBOURS[from].heading + Math.PI;
    const course = to === 'morrow' ? PACKET_COURSE : [...PACKET_COURSE].reverse();
    this.voyage.depart(HARBOURS[from], () => {
      this.hud.banner('The open sea', to === 'morrow' ? 'Bound for Callis' : 'Bound for Gullmouth');
      this.voyage.cross([Voyage.offing(HARBOURS[from], Voyage.OUT), ...course, Voyage.offing(HARBOURS[to], Voyage.IN)], () => {
        this.rig.yaw = HARBOURS[to].heading;
        this.voyage.arrive(HARBOURS[to], () => { this.player.teleport(at[0], at[1], at[2]); this.player.yaw = yaw; this.hud.banner(to === 'morrow' ? 'Callis' : 'Gullmouth', 'Ashore'); });
      });
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
      // (this land's stops: the other land is the packet's, from Gullmouth or Callis)
      stops: POSTS.filter((p) => landOf(p) === landOf(here)).map((p) => ({
        id: p.id, name: p.name, here: p.id === here.id,
        known: postKnown(p, this.save.discovered) && (!p.gate || !!this.flag(p.gate)),
        fare: this.ferryBetween(here.id, p.id) ? 0 : this.fareOf(here, this.ferryTo(here.id, p.id)?.home ?? p),
        ...((): { note: string; by: 'ride' | 'cross' | 'ferry' } => {
          if (p.id === here.id) return { note: '', by: 'ride' };
          if (Game.ferryPair(here.id, p.id)) return { note: 'By the ferry from the jetty: she sails every few minutes', by: 'ferry' };
          const fb = this.ferryBetween(here.id, p.id);
          if (fb) { const nx = fb.ship.nextFrom(fb.from, realmNow() / 1000); return { note: `Aboard ${fb.ship.route.ship} from her jetty: ${nx.alongside ? `alongside now, sails in ${Game.wait(nx.wait)}` : `next sails in ${Game.wait(nx.wait)}`}`, by: 'ferry' }; }
          const ft = this.ferryTo(here.id, p.id);
          if (ft) return { note: `The Post to ${ft.home.name}, then ${ft.ship.route.ship} from her jetty`, by: 'ride' };
          const way = this.wayBetween(here, p);
          if (way) { const m = rideMinutes(wayLength(way)); return { note: `About ${m} minute${m === 1 ? '' : 's'} on the cart`, by: 'ride' }; }
          const h = postHours(here, p);
          return { note: `A crossing by boat, ${h} ${h === 1 ? 'hour' : 'hours'}`, by: 'cross' };
        })(),
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
    if (!here || !there || here === there || landOf(here) !== landOf(there) || !postKnown(there, this.save.discovered) || (there.gate && !this.flag(there.gate))) return;
    // The Mewstones ferry is a ship you board, not a ticket: show where she berths
    if (Game.ferryPair(here.id, there.id)) {
      const J = mewJetty(), at: [number, number] = here.id === 'gullmouth' ? [Math.floor(coastX(600)) + 34, 608] : [J.x1 + 1, J.z + 1];
      this.hud.close('travel');
      this.markOnMap(at[0], at[1], 'The ferry\'s berth');
      return;
    }
    // The ferries are ships you board, not tickets: from a stop on her route, where her jetty is and when
    // she sails; from anywhere else, the Post as far as her home port
    {
      const fb = this.ferryBetween(here.id, there.id);
      if (fb) {
        const pier = fb.ship.plan.piers[fb.from], nx = fb.ship.nextFrom(fb.from, realmNow() / 1000);
        this.hud.close('travel');
        this.markOnMap(pier.from[0], pier.from[1], `${fb.ship.route.ship[0].toUpperCase() + fb.ship.route.ship.slice(1)}'s jetty`);
        this.hud.system(`${fb.ship.route.ship[0].toUpperCase() + fb.ship.route.ship.slice(1)} ${nx.alongside ? 'is alongside now and sails' : 'next sails'} for ${fb.ship.route.stops[nx.to].name} in ${Game.wait(nx.wait)}. Walk aboard; she calls at ${fb.ship.route.stops.map((q) => q.name).join(', ')}.`);
        return;
      }
      const ft = this.ferryTo(here.id, there.id);
      if (ft && ft.home.id !== here.id) {
        this.hud.system(`The Post goes as far as ${ft.home.name}. ${ft.ship.route.ship[0].toUpperCase() + ft.ship.route.ship.slice(1)} sails from her jetty there for ${there.name.replace(/ \(.*\)$/, '')}.`);
        this.travelTo(ft.home.id);
        return;
      }
    }
    const fare = this.fareOf(here, there);
    if (this.save.marks < fare || this.dead || this.dialogue) return;
    this.save.marks -= fare;
    this.sfx('coin');
    this.hud.closeAll();
    this.cancelActions();
    this.target = null;
    // On the cart, along the roads, in real time
    const way = this.wayBetween(here, there);
    if (way) {
      this.dismount(true);
      this.post.start(way, this.player.position.y, there.id);
      const st = this.post.seat();
      this.player.position.set(st.x, st.y, st.z);
      this.hud.system(`On the Charter Post to ${there.name}, about ${rideMinutes(wayLength(way))} min. Sit back and watch the country go by; Space or E to get off.`);
      return;
    }
    // No road there (an island): the island packet, the Plover, out of Gullmouth and over the sea, and in to
    // the island's landing (or back the other way). Set down a couple of blocks in front of the sign, facing away from it.
    const fx = Math.sin(there.ry), fz = Math.cos(there.ry);
    const isle = ISLAND_COURSES[there.id] ?? ISLAND_COURSES[here.id];
    if (isle && !this.voyage.active) {
      const outward = there.id in ISLAND_COURSES, island: Harbour = { berth: isle.berth, heading: isle.heading };
      const from = outward ? HARBOURS.counties : island, to = outward ? island : HARBOURS.counties;
      this.dismount(true);
      this.voyage.style = { kind: 'cog', wale: '#2f528f', flag: '#d8b04a', name: 'PLOVER', banner: ['The Plover casts off', `For ${there.name.split(' (')[0]}`] };
      this.rig.yaw = from.heading + Math.PI;
      this.voyage.depart(from, () => this.voyage.cross(outward ? isle.course : [...isle.course].reverse(), () => {
        this.rig.yaw = to.heading;
        this.voyage.arrive(to, () => {
          const x = there.x + fx * 2, z = there.z + fz * 2;
          this.player.teleport(x, heightAt(x, z) + 1, z);
          this.player.yaw = Math.atan2(fx, fz);
          this.voyage.style = {};
          this.hud.banner(there.name.split(' (')[0], 'Ashore', true);
        });
      }));
      return;
    }
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
    const villa = this.myVilla();
    if (villa) return villaShape(villa);
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
    this.stallOpenAt = null;
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
    if (mine?.lot === id) { this.hud.closeAll(); this.planner.open(lot, mine.spec); return; }
    const held = this.homesBook?.get(id);
    if (held) { this.hud.system(held.spec ? `${lot.name}: ${held.owner}'s house.` : `${lot.name}: leased to ${held.owner}, not built on yet.`); return; }
    if (mine) { this.hud.system(`${lot.name}: to let. You already hold ${LOTS.find((l) => l.id === mine.lot)!.name}; one home to a household.`); return; }
    if (this.myVilla()) { this.hud.system(`${lot.name}: to let. You hold ${this.myVilla()!.name} on the Mirador; one home to a household. Teresa Mas will buy it back at the gate.`); return; }
    // Moving out of Wendside Cottage: the Charter takes it back when you lease, empty
    const cottage = this.myHomeId() === 'cottage';
    if (cottage && this.home.pieces().length) { this.hud.system(`${lot.name}: to let. You hold Wendside Cottage: pick up your furniture there first (Arrange the furniture, then X), and the Charter will buy it back when you lease.`); this.sfx('fail'); return; }
    if (this.save.marks < LOT_PRICE) { this.hud.system(`${lot.name}: to let for ninety-nine years, ${LOT_PRICE} marks to the Charter. You have ${this.save.marks}.`); this.sfx('fail'); return; }
    this.hud.ask(`Lease ${lot.name} from the Charter for ${LOT_PRICE} marks?${cottage ? ` The Charter takes Wendside Cottage back and pays you ${COTTAGE_BUYBACK} for it.` : ''} Then draw up plans and have a house built on it.`, () => {
      if (readPlot(this.flag('plot')) || this.save.marks < LOT_PRICE) return;
      this.claimHome(id, () => {
        if (readPlot(this.flag('plot')) || this.save.marks < LOT_PRICE) return;
        this.addMarks(-LOT_PRICE);
        if (cottage) { this.addMarks(COTTAGE_BUYBACK); this.setFlag('home', null); this.hud.system(`You give Wendside Cottage back to the Charter, and Maud Ashby pays you ${COTTAGE_BUYBACK} marks for it.`); }
        this.setFlag('plot', { lot: id });
        this.hud.banner(lot.name, 'Leased for ninety-nine years', true);
        this.sfx('discover');
        this.hud.refresh();
        this.persist();
        this.planner.open(lot);
      }, cottage ? 'cottage' : null);
    }, () => {}, 30);
  }

  /** A stall at your lot's gate: stock it at your own prices, and anyone passing can buy, you there or not. */
  private stallUp(): void {
    const pl = readPlot(this.flag('plot'));
    if (!pl) return;
    if (!this.homesBook || !this.online.online) { this.hud.system('A stall sells through the realm\'s Exchange book. Play online to keep one.'); this.sfx('fail'); return; }
    this.setFlag('stall', true);
    this.online.homeStall(pl.lot, true);
    this.sfx('open');
    this.hud.system('You put up a stall at your gate. Set out what you\'d sell and at what price: anyone passing can buy, and the takings come to you.');
    this.openStall(pl.lot, this.save.name, true);
    this.persist();
  }
  /** Take your stall down; its stock comes back to your pack. */
  stallDown(): void {
    const pl = readPlot(this.flag('plot'));
    if (!pl || !this.flag('stall')) return;
    this.exchange.clearStall();
    this.setFlag('stall', null);
    this.online.homeStall(pl.lot, false);
    this.hud.close('exchange');
    this.hud.system('You take the stall down. Whatever was on it is coming back to your pack.');
    this.persist();
  }
  /** Where the stall whose page is open stands (null: a broker's book). */
  private stallOpenAt: { x: number; z: number } | null = null;
  private openStall(id: string, owner: string, mine: boolean): void {
    if (!this.online.online) { this.hud.system('A stall sells through the realm\'s Exchange book. Play online to trade at one.'); return; }
    this.hud.closeAll();
    const lt = LOT_BY_ID.get(id);
    this.stallOpenAt = lt ? stallAt(lt) : { x: this.player.position.x, z: this.player.position.z };
    this.exchange.open({ id, owner, mine });
    this.hud.show('exchange');
    if (mine) this.showPackBeside();
  }

  /** Which home is yours in the book: your lot's id, 'cottage' for Wendside Cottage, or null (a let room isn't in it). */
  private myHomeId(): string | null {
    const plot = readPlot(this.flag('plot'));
    if (plot) return plot.lot;
    const villa = this.myVilla();
    if (villa) return villa.id;
    return this.flag('home') && !readTenancy(this.flag('flat')) ? 'cottage' : null;
  }

  /** Who holds a home (a lot's id, or 'cottage'): the book's word online; offline only your own is known. */
  homeHolder(id: string): string | null {
    if (this.myHomeId() === id) return this.save.name;
    return this.homesBook?.get(id)?.owner ?? null;
  }
  private homeName(id: string): string { const v = VILLA_BY_ID.get(id); return id === 'cottage' ? 'Wendside Cottage' : v ? v.name[0].toUpperCase() + v.name.slice(1) : LOTS.find((l) => l.id === id)?.name ?? id; }
  /** The house on the Mirador that's yours, if one is. */
  private myVilla() { return VILLA_BY_ID.get(String(this.flag('villa') ?? '')) ?? null; }

  /**
   * Buy a house on the Mirador outright from the family selling it. One home to a household, so the one
   * you have goes: Wendside Cottage back to the Charter for what it pays, a lot's lease back to the
   * Charter for half what it cost (the house on it comes down), another villa back to its family for two
   * thirds, a let room simply given up.
   */
  buyVilla(id: string): void {
    const v = VILLA_BY_ID.get(id);
    if (!v) return;
    const name = this.homeName(id);
    if (this.myHomeId() === id) return;
    const held = this.homesBook?.get(id);
    if (held) { this.hud.system(`${name} is ${held.owner}'s.`); return; }
    const was = this.myHomeId(), plot = readPlot(this.flag('plot')), other = this.myVilla();
    if (was && this.home.pieces().length) { this.hud.system(`Your furniture is still set out at ${this.myHome()?.name ?? 'home'}. Pick it up first (Arrange the furniture, then X), and you can move.`); this.sfx('fail'); return; }
    const back = was === 'cottage' ? COTTAGE_BUYBACK : plot ? Math.round(LOT_PRICE / 2) : other ? Math.round(other.price * VILLA_RESALE) : 0;
    const cost = v.price - back;
    if (this.save.marks < cost) { this.hud.system(`${name}: ${v.price.toLocaleString()} marks${back ? ` (${cost.toLocaleString()} once your home is paid back)` : ''}. You have ${this.save.marks.toLocaleString()}.`); this.sfx('fail'); return; }
    const leaving = was === 'cottage' ? ' The Charter takes Wendside Cottage back and pays you ' + COTTAGE_BUYBACK + '.'
      : plot ? ` The Charter takes back your lease on ${LOT_BY_ID.get(plot.lot)?.name ?? 'your lot'} for ${back} marks, and the house on it comes down.`
      : other ? ` ${this.homeName(other.id!)} goes back to its family for ${back.toLocaleString()}.` : '';
    this.hud.ask(`Buy ${v.name} for ${v.price.toLocaleString()} marks? It's yours for good: furnish it however you like.${leaving}`, () => {
      if (this.myHomeId() === id || this.homesBook?.get(id) || this.save.marks < cost) return;
      if (readTenancy(this.flag('flat')) && !this.leaveRoom()) return;
      this.claimHome(id, () => {
        if (this.myHomeId() === id || this.save.marks < cost) return;
        this.addMarks(-cost);
        this.setFlag('plot', null); this.setFlag('lotBlocks', null); this.setFlag('stall', null);
        this.setFlag('villa', id);
        this.setFlag('home', []);
        this.home.render();
        this.hud.banner(name, 'Your house on the Mirador', true);
        this.sfx('discover');
        this.hud.system(`Teresa Mas hands you the keys. ${name} is yours: inside, use the prompt to arrange the furniture.`);
        this.hud.refresh();
        this.persist();
      }, was);
    }, () => {}, 30);
  }

  /** Sell your house on the Mirador back to its family, for two thirds of what it cost. */
  sellVilla(): void {
    const v = this.myVilla();
    if (!v) return;
    if (this.home.pieces().length) { this.hud.system(`Your furniture is still set out at ${this.homeName(v.id!)}. Pick it up first (Arrange the furniture, then X).`); this.sfx('fail'); return; }
    const back = Math.round(v.price * VILLA_RESALE);
    this.hud.ask(`Sell ${v.name} back to its family for ${back.toLocaleString()} marks? Someone else can buy it after.`, () => {
      if (this.myVilla() !== v) return;
      if (this.homesBook && this.online.online) this.online.homeRelease(v.id!);
      this.addMarks(back);
      this.setFlag('villa', null);
      this.setFlag('home', null);
      this.home.render();
      this.sfx('coin');
      this.hud.system(`Teresa Mas takes the keys back and counts out ${back.toLocaleString()} marks.`);
      this.hud.refresh();
      this.persist();
    }, () => {}, 30);
  }

  /** Someone else's purchase of your villa got into the book first: the family pays you back in full. */
  private villaLost(id: string, owner: string): void {
    const v = VILLA_BY_ID.get(id);
    if (!v) return;
    this.furnitureBack(false);
    this.setFlag('villa', null);
    this.setFlag('home', null);
    this.addMarks(v.price);
    this.hud.system(`${this.homeName(id)} was sold to ${owner} before your money reached the family. They've paid you back all ${v.price.toLocaleString()} marks, and your furniture is in your pack.`);
    this.hud.refresh();
    this.persist();
  }

  /** Ask the book for a home (giving up the one you're leaving), and act once it's yours. Offline it's yours at once. */
  private claimHome(id: string, then: () => void, leaving: string | null = null, spec?: HouseSpec): void {
    if (!this.homesBook || !this.online.online) { then(); return; }
    if (leaving) this.online.homeRelease(leaving);
    this.pendingClaim = { id, then, leaving };
    this.online.homeClaim(id, spec);
  }

  /**
   * On coming in: your home and the book brought into step. Yours and theirs agree, or the book hears of
   * your home for the first time (homes kept from before there was a book), or someone else was down for
   * it first and you're given the next lot like it, or you were away three months and it lapsed.
   */
  private reconcileHome(mine: string | null, lapsed: string | null): void {
    const local = this.myHomeId(), plot = readPlot(this.flag('plot'));
    if (lapsed && lapsed === local) { this.loseHome(local); return; }
    if (local && mine === local) {
      const held = this.homesBook?.get(local);
      if (plot?.spec && JSON.stringify(held?.spec ?? null) !== JSON.stringify(plot.spec)) this.online.homeSpec(local, plot.spec);
      if (!!held?.stall !== !!this.flag('stall') && plot) this.online.homeStall(local, !!this.flag('stall'));
      return;
    }
    // The book has a home in your name this save doesn't know of (it was leased on another device, say): it's yours
    if (mine && !local && !readTenancy(this.flag('flat'))) {
      const held = this.homesBook?.get(mine), spec = held && mine !== 'cottage' ? readPlot({ lot: mine, spec: held.spec })?.spec : undefined;
      if (mine === 'cottage') this.setFlag('home', this.home.pieces());
      else if (VILLA_BY_ID.has(mine)) { this.setFlag('villa', mine); this.setFlag('home', this.home.pieces()); }
      else this.setFlag('plot', { lot: mine, ...(spec ? { spec } : {}) });
      if (held?.blocks?.length) this.setFlag('lotBlocks', held.blocks);
      if (held?.stall) this.setFlag('stall', true);
      this.persist();
      return;
    }
    // Two homes, one in the book and one in this save, from before the book: the save's stands
    if (mine && mine !== local) this.online.homeRelease(mine);
    if (!local) return;
    const other = this.homesBook?.get(local);
    const lost = (owner: string) => (VILLA_BY_ID.has(local) ? this.villaLost(local, owner) : this.moveHome(local, owner, 0));
    if (!other) { this.pendingClaim = { id: local, then: () => { if (this.flag('stall') && plot) this.online.homeStall(local, true); }, fail: () => lost(this.homesBook?.get(local)?.owner ?? 'someone') }; this.online.homeClaim(local, plot?.spec, plot ? this.flag('lotBlocks') : undefined); return; }
    lost(other.owner);
  }

  /**
   * Two leases on one home from before the Charter kept one book: the one it heard of first stands, and
   * you're given the next free lot like it (on the same estate if there's room, facing the same way if
   * not) with the same house raised on it, or a cottage for Wendside Cottage. Your furniture's in your pack.
   */
  private moveHome(id: string, owner: string, tries: number): void {
    const plot = readPlot(this.flag('plot'));
    const was = LOTS.find((l) => l.id === id);
    const free = LOTS.filter((l) => !this.homesBook?.has(l.id));
    const like = free.find((l) => was && l.estate === was.estate) ?? free.find((l) => was && l.door === was.door) ?? free[0];
    if (!like || tries > 4) { this.hud.system(`The Charter's book has ${owner} down for ${this.homeName(id)}, and no lot free to give you instead. Your home stays as it was for now.`); return; }
    const spec: HouseSpec = plot?.spec ?? { size: 'cottage', floors: 1, wall: 'plaster', roof: 'thatch' };
    this.pendingClaim = {
      id: like.id,
      then: () => {
        this.furnitureBack(false);
        this.setFlag('plot', { lot: like.id, spec });
        this.setFlag('home', []);
        this.setFlag('lotBlocks', null);
        this.setFlag('stall', null);
        this.hud.system(`The Charter's book had ${owner} down for ${this.homeName(id)} before you. Their lease stands, and the Charter has given you ${like.name} instead, with ${plot?.spec ? 'your house' : 'a cottage'} raised on it. Your furniture is in your pack.`);
        this.hud.pin = { x: like.x0 + 7.5, z: like.z0 + 6.5 };
        this.hud.refresh();
        this.persist();
      },
      fail: () => this.moveHome(id, owner, tries + 1),
    };
    this.online.homeClaim(like.id, spec);
  }

  /** Every piece of furniture set out at home, back in the pack (or sent on by the Post if it won't fit). */
  private furnitureBack(post: boolean): void {
    const parcel = this.parcel.map((x) => ({ ...x }));
    for (const [item] of this.home.pieces()) {
      if (!ITEMS[item]) continue;
      if (!post && this.inv.canAdd(item, 1)) { this.inv.add(item, 1); continue; }
      const same = ITEMS[item].stack ? parcel.find((x) => x.id === item) : undefined;
      if (same) same.n++; else parcel.push({ id: item, n: 1 });
    }
    if (parcel.length) this.setFlag('parcel', parcel);
    this.setFlag('home', []);
    this.home.render();
  }

  /** Away three months and more, and the lease lapsed: the Charter has the home back and sent your furniture on by the Post. */
  private loseHome(id: string): void {
    const name = this.homeName(id);
    this.furnitureBack(true);
    this.setFlag('home', null);
    this.setFlag('plot', null);
    this.setFlag('villa', null);
    this.setFlag('lotBlocks', null);
    this.setFlag('stall', null);
    this.hud.system(`You were away three months and more, and the Charter took ${name} back and put it up for sale. Your furniture went ahead by the Charter Post: collect it at any post box.`);
    this.hud.refresh();
    this.persist();
  }

  /** The step outside a held home's front door (for knocking), or null for a lot not built on. */
  private homeDoorOutside(id: string, h: HomeHeld): { x: number; y: number; z: number } | null {
    if (id === 'cottage') return { x: COTTAGE.x0 + Math.floor(COTTAGE.w / 2) + 0.5, y: COTTAGE.floor, z: COTTAGE.z0 + COTTAGE.d + 0.5 };
    const v = VILLA_BY_ID.get(id);
    if (v) { const [dx, dz] = villaDoor(v); return { x: dx + 0.5, y: v.base, z: dz - 0.7 }; }
    const lot = LOT_BY_ID.get(id), spec = lot && readPlot({ lot: id, spec: h.spec })?.spec;
    if (!lot || !spec) return null;
    const at = housePlace(lot, spec), [dx, dz] = doorCell(at);
    const [nx, nz] = at.door === 's' ? [0, 1] : at.door === 'n' ? [0, -1] : at.door === 'e' ? [1, 0] : [-1, 0];
    return { x: dx + 0.5 + nx * 1.2, y: at.base, z: dz + 0.5 + nz * 1.2 };
  }

  /** The lots round you as the book has them (yours as you've built it), looked at again as you move or anything changes. */
  private syncLots(): void {
    const P = this.player.position, S = this.lotsShown;
    const plot = readPlot(this.flag('plot'));
    // (the blocks you've laid by reference: every change sets a new list)
    const key = `${this.homesVer}|${JSON.stringify(plot)}|${this.visitLot}|${!!this.flag('stall')}`, laid = this.flag('lotBlocks');
    if (key === S.key && laid === S.laid && Math.hypot(P.x - S.x, P.z - S.z) < 16) return;
    S.key = key; S.laid = laid; S.x = P.x; S.z = P.z;
    const list: LotHouse[] = [];
    for (const lot of LOTS) {
      if (Math.abs(lot.x0 + 7 - P.x) > 220 || Math.abs(lot.z0 + 6 - P.z) > 220) continue;
      if (plot?.lot === lot.id) { list.push({ lot, spec: plot.spec ?? null, blocks: readLaid(this.flag('lotBlocks')), owner: this.save.name, locked: false, stall: !!this.flag('stall') }); continue; }
      if (!this.homesBook) continue;
      const h = this.homesBook.get(lot.id);
      list.push({ lot, spec: h ? readPlot({ lot: lot.id, spec: h.spec })?.spec ?? null : null, blocks: h ? readLaid(h.blocks) : [], owner: h?.owner ?? null, locked: this.visitLot !== lot.id, stall: !!h?.stall });
    }
    this.building.sync(list);
    this.lockCottage();
  }

  /** Wendside Cottage is someone else's and you're not their guest: its door stays shut and the doorway is barred. */
  private lockCottage(): void {
    const h = this.homesBook?.get('cottage');
    const lock = !!h && this.myHomeId() !== 'cottage' && this.visitLot !== 'cottage';
    const dx = COTTAGE.x0 + Math.floor(COTTAGE.w / 2), dz = COTTAGE.z0 + COTTAGE.d - 1, V = this.world.voxels;
    if (V.isLoaded(dx, dz)) for (const y of [COTTAGE.floor, COTTAGE.floor + 1]) {
      const b = V.get(dx, y, dz);
      if (lock && b === B.Air) V.set(dx, y, dz, B.Barrier);
      else if (!lock && b === B.Barrier) V.set(dx, y, dz, B.Air);
    }
    for (const d of this.world.doors()) if (Math.abs(d.hinge.x - dx - 0.5) < 1.6 && Math.abs(d.hinge.z - dz - 0.5) < 1.6) d.locked = lock;
    // The houses on the Mirador: every door into one (an empty one stands open for anyone to look round)
    const P = this.player.position;
    for (const v of VILLAS) {
      if (!v.id || Math.abs(v.x0 - P.x) > 200 || Math.abs(v.z0 - P.z) > 200) continue;
      const shut = !!this.homesBook?.get(v.id) && this.myHomeId() !== v.id && this.visitLot !== v.id;
      for (const [x, y0, z] of villaLocks(v)) {
        if (!V.isLoaded(x, z)) continue;
        for (const y of [y0, y0 + 1]) { const b = V.get(x, y, z); if (shut && b === B.Air) V.set(x, y, z, B.Barrier); else if (!shut && b === B.Barrier) V.set(x, y, z, B.Air); }
        for (const d of this.world.doors()) if (Math.abs(d.hinge.y - y0) < 2 && Math.abs(d.hinge.x - x - 0.5) < 1.6 && Math.abs(d.hinge.z - z - 0.5) < 1.6) d.locked = shut;
      }
    }
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
    if (this.homesBook) this.online.homeSpec(lot.id, spec);
    this.planner.close();
    this.hud.banner(rebuild ? 'Rebuilt' : 'Your house stands', `${lot.name}, the Wendside lots`, true);
    this.sfx('levelUp');
    this.hud.system('The Ansbury builders raise it in an afternoon and leave you the key. Furnish it however you like: inside, use the prompt to arrange the furniture.');
    this.hud.refresh();
    this.persist();
  }

  buyHome(): void {
    const held = this.homesBook?.get('cottage');
    if (held && this.myHomeId() !== 'cottage') { this.hud.system(`Wendside Cottage is ${held.owner}'s now. The Charter has lots to let by every Post town: ask a land clerk.`); return; }
    if (this.myVilla()) { this.hud.system(`You hold ${this.myVilla()!.name} on the Mirador; one home to a household.`); return; }
    if (readTenancy(this.flag('flat')) && !this.leaveRoom()) return;
    if (this.home.owned) return;
    const price = COTTAGE.price;
    if (this.save.marks < price) { this.hud.system(`"Wendside Cottage. Two rooms' worth of floor, a sound roof, a good hearth. ${price} marks to the Charter." You have ${this.save.marks}.`); this.sfx('fail'); return; }
    this.hud.ask(`Buy Wendside Cottage for ${price} marks? It's yours for good: furnish it however you like.`, () => this.claimHome('cottage', () => {
      if (this.home.owned || this.save.marks < price) return;
      this.addMarks(-price);
      this.setFlag('home', []);
      this.home.render();
      this.hud.banner('Wendside Cottage', 'A home of your own', true);
      this.sfx('discover');
      this.hud.system('The key is under the barrel. Buy furniture from Tamsin or Perrin, then use the prompt inside to arrange it.');
      this.hud.refresh();
      this.persist();
    }), () => {}, 30);
  }

  /** Ships of your own, as saved: what she is, how she's painted, how she was left, and whether she's on the bottom. */
  private myShips(): { hull: HullId; livery: Livery; hp: number; sunk?: boolean }[] {
    const v = this.flag('ships');
    return Array.isArray(v) ? (v as { hull: HullId; livery: Livery; hp: number; sunk?: boolean }[]).filter((x) => x && x.hull in HULLS && x.livery) : [];
  }
  private nearestBerth() { const P = this.player.position; return BERTHS.slice().sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; }
  private defaultLivery(id: HullId): Livery { return { hull: HULL_PAINTS[0], wale: WALE_PAINTS[0], sail: SAIL_CLOTHS[0], name: `${this.save.name}'s ${HULLS[id].name}` }; }

  naval(action: 'hire' | 'build' | 'call' | 'salvage' | 'paint' | 'sail' | 'name' | 'below', arg?: string): void {
    const berth = this.nearestBerth(), ships = this.myShips();
    const sailOut = (hull: HullId, livery: Livery, hp?: number) => {
      if (this.horse) this.dismount(true);
      this.boat.aboard = false;
      this.sailing.launch(hull, livery, berth.x, berth.z, berth.heading, hp);
      this.takeHelm();
      this.sfx('bell' as Sfx, 0.6);
    };
    if (action === 'hire') {
      const id = (arg as HullId) in HULLS ? arg as HullId : 'cutter', h = HULLS[id];
      if (this.save.marks < h.hire) { this.hud.system(`A ${h.name.toLowerCase()} is ${h.hire} marks for the hour.`); this.sfx('fail'); return; }
      this.addMarks(-h.hire);
      this.setFlag('shipHire', { hull: id, until: Date.now() + 3600_000 });
      sailOut(id, { hull: '#3a2a1e', wale: '#7a2a1e', sail: '#efe3c4', name: 'Yard ' + h.name }, h.hp);
      this.hud.system(`The yard's ${h.name.toLowerCase()} is yours for the hour. W and S set and take in sail, A and D the helm. F fires the broadside on the side you're looking at (Z port, C starboard). Mind the wind.`);
      this.persist();
      return;
    }
    if (action === 'build') {
      const id = (arg as HullId) in HULLS ? arg as HullId : 'cutter', h = HULLS[id];
      if (ships.length >= 3) { this.hud.system('The yard won\'t lay down a fourth keel for one captain. Three ships is a fleet.'); return; }
      for (const [it, n] of Object.entries(h.build.items)) if (this.inv.count(it) < n) { this.hud.system(`For a ${h.name.toLowerCase()} the yard needs ${n} ${ITEMS[it]?.name ?? it}, and you have ${this.inv.count(it)}.`); this.sfx('fail'); return; }
      if (this.save.marks < h.build.marks) { this.hud.system(`The yard wants ${h.build.marks.toLocaleString()} marks for the labour, and you have ${this.save.marks.toLocaleString()}.`); this.sfx('fail'); return; }
      for (const [it, n] of Object.entries(h.build.items)) this.inv.remove(it, n);
      this.addMarks(-h.build.marks);
      this.setFlag('ships', [...ships, { hull: id, livery: this.defaultLivery(id), hp: h.hp }]);
      this.hud.banner('Launched', `Your ${h.name.toLowerCase()} is in the water`, true);
      this.sfx('levelUp');
      this.hud.system('Ask at any shipwright to bring her round, paint her or name her.');
      this.hud.refresh();
      this.persist();
      return;
    }
    const i = Math.max(0, Math.min(ships.length - 1, Number(arg ?? 0) || 0)), sh = ships[i];
    if (!sh) { this.hud.system('You have no ship of your own at the yard.'); return; }
    if (action === 'below') {
      if (sh.sunk) { this.hud.system(`The ${sh.livery.name} is on the bottom. Nobody's sleeping aboard her.`); return; }
      this.hud.closeAll();
      this.hud.system(`The yard's boy rows you out to the ${sh.livery.name} where she lies at her mooring.`);
      this.goBelow(sh.hull, this.player.position.clone());
      return;
    }
    if (action === 'call') {
      if (sh.sunk) { this.hud.system(`The ${sh.livery.name} is on the bottom. The yard can raise her for ${Math.round(HULLS[sh.hull].build.marks * SALVAGE)} marks.`); return; }
      sailOut(sh.hull, sh.livery, sh.hp);
      this.setFlag('shipOut', i);
      this.hud.system(`The ${sh.livery.name} comes round to the berth.`);
      return;
    }
    if (action === 'salvage') {
      const cost = Math.round(HULLS[sh.hull].build.marks * SALVAGE);
      if (!sh.sunk) { this.hud.system(`The ${sh.livery.name} is afloat. Nothing to raise.`); return; }
      if (this.save.marks < cost) { this.hud.system(`Raising her is ${cost} marks. You have ${this.save.marks}.`); this.sfx('fail'); return; }
      this.addMarks(-cost);
      this.setFlag('ships', ships.map((x, k) => (k === i ? { ...x, sunk: false, hp: HULLS[x.hull].hp } : x)));
      this.hud.system(`The yard's divers and the sheer hulk have her up. The ${sh.livery.name} is sound again.`);
      this.persist();
      return;
    }
    if (action === 'paint' || action === 'sail' || action === 'name') {
      const L = { ...sh.livery };
      if (action === 'paint') { const k = HULL_PAINTS.indexOf(L.hull); L.hull = HULL_PAINTS[(k + 1) % HULL_PAINTS.length]; L.wale = WALE_PAINTS[(WALE_PAINTS.indexOf(L.wale) + (k % 2 ? 1 : 0) + 1) % WALE_PAINTS.length]; }
      if (action === 'sail') L.sail = SAIL_CLOTHS[(SAIL_CLOTHS.indexOf(L.sail) + 1) % SAIL_CLOTHS.length];
      if (action === 'name') { const names = ['Plover', 'Swift', 'Constance', 'Good Intent', 'Margery', 'Kestrel', 'Second Chance', 'Fair Wind', 'Wren', 'Last Word']; L.name = names[(names.indexOf(L.name) + 1) % names.length]; }
      this.setFlag('ships', ships.map((x, k) => (k === i ? { ...x, livery: L } : x)));
      this.hud.system(action === 'name' ? `She's the ${L.name} now, in gilt on her stern.` : 'The yard\'s painters go over her. She\'ll be dry by morning.');
      this.persist();
    }
  }

  /** Working at a training dummy: what you've put into it since you started, and the best single blow. */
  private practice: { first: number; last: number; total: number; hits: number; best: number; bestCrit: boolean; drawn: number } | null = null;
  private practiced(dmg: number, crit: boolean): void {
    const now = this.elapsed;
    if (!this.practice || now - this.practice.last > PRACTICE_REST) this.practice = { first: now, last: now, total: 0, hits: 0, best: 0, bestCrit: false, drawn: -1 };
    const pr = this.practice;
    pr.last = now; pr.total += dmg; pr.hits++;
    if (dmg > pr.best) { pr.best = dmg; pr.bestCrit = crit; }
  }
  /** The dummy's count over the action bar, a few times a second, gone a while after you stop. */
  private drawPractice(): void {
    const pr = this.practice;
    if (!pr) return;
    const now = this.elapsed;
    if (now - pr.last > PRACTICE_REST) { this.practice = null; this.hud.dpsMeter(null); return; }
    if (now - pr.drawn < 0.25) return;
    pr.drawn = now;
    const secs = Math.max(1, pr.last - pr.first + 0.5), n = (v: number) => Math.round(v).toLocaleString();
    this.hud.dpsMeter(`Training dummy · ${secs.toFixed(1)} s<b>${n(pr.total / secs)}</b>a second<small>${n(pr.total)} in ${pr.hits} blow${pr.hits === 1 ? '' : 's'} · best ${n(pr.best)}${pr.bestCrit ? ' (critical)' : ''} · it's whole again ${PRACTICE_REST} s after you stop</small>`);
  }

  /** The world boss you're on the Group Finder's list for (the realm says), if any. */
  wbSeek: string | null = null;
  private finderTick = 0;

  /** The cabin you live in aboard: the kind of the ship you last went below in, while you still own one afloat. */
  private cabinHull(): HullId | null {
    const h = this.flag('cabinHull') as HullId | null;
    return h && h in CABINS && this.myShips().some((x) => x.hull === h && !x.sunk) ? h : null;
  }
  /** Whichever home you're standing in: your ship's cabin, or the one ashore. */
  private get homeHere(): Home { return this.cabin.owned && this.cabin.inside(this.player.position) ? this.cabin : this.home; }
  /** Dry land near a point (a berth's water): where you come ashore if your ship isn't there to come up on. */
  private shoreNear(x: number, z: number): THREE.Vector3 {
    for (let r = 0; r <= 80; r += 2) for (let a = 0; a < 16; a++) {
      const qx = Math.floor(x + Math.cos((a / 16) * Math.PI * 2) * r), qz = Math.floor(z + Math.sin((a / 16) * Math.PI * 2) * r);
      const top = this.world.voxels.isLoaded(qx, qz) ? this.world.voxels.groundBelow(qx + 0.5, 140, qz + 0.5) : heightAt(qx, qz);
      if (top > SEA + 0.5) return new THREE.Vector3(qx + 0.5, top + 0.2, qz + 0.5);
    }
    return new THREE.Vector3(x, SEA + 2, z);
  }
  /** Down the companion ladder into her cabin; you come up again where she lies (or ashore by her berth, if she's gone back to the yard). */
  private goBelow(hull: HullId, ashore: THREE.Vector3): void {
    if (this.horse) this.dismount(true);
    if (this.sailing.atHelm) { this.sailing.atHelm = false; if (this.rigBeforeHelm) { this.rig.distance = this.rigBeforeHelm; this.rigBeforeHelm = 0; } }
    this.cancelActions();
    this.setFlag('cabinHull', hull);
    this.setFlag('cabinBack', [Math.round(ashore.x * 10) / 10, Math.round(ashore.y * 10) / 10, Math.round(ashore.z * 10) / 10]);
    if (!Array.isArray(this.flag('cabin:' + hull))) this.setFlag('cabin:' + hull, []);
    const fx = cabinFixtures(hull);
    this.player.teleport(fx.ladder.x - 1.2, CABIN_BASE + 0.05, fx.ladder.z);
    this.player.velocity.set(0, 0, 0);
    this.player.fallStartY = this.player.position.y;
    this.player.yaw = -Math.PI / 2;
    this.cabin.render();
    this.sfx('open', 0.6);
    if (!this.flag('cabinSeen:' + hull)) {
      this.setFlag('cabinSeen:' + hull, 1);
      this.hud.system(`${CABINS[hull].blurb} It's yours to furnish: Arrange the furniture, as at home. The cot is made up, and the sea chest is your bank.`);
    }
    this.persist();
  }
  private goUp(): void {
    const sh = this.sailing.mine, out = Number(this.flag('shipOut') ?? -1);
    if (sh && sh.sinking < 0 && out >= 0 && this.myShips()[out]?.hull === this.cabinHull()) {
      const at = sh.helm(new THREE.Vector3()), f = sh.fwd;
      this.player.teleport(at.x + f.x * 1.5, at.y + 0.1, at.z + f.z * 1.5);
    } else {
      const b = this.flag('cabinBack');
      const at = Array.isArray(b) && b.length === 3 && b.every((n) => typeof n === 'number') ? new THREE.Vector3(b[0], b[1], b[2]) : this.shoreNear(BERTHS[0].x, BERTHS[0].z);
      this.player.teleport(at.x, at.y, at.z);
    }
    this.player.velocity.set(0, 0, 0);
    this.player.fallStartY = this.player.position.y;
    this.sfx('open', 0.6);
  }

  /** Take the helm of your ship: the camera pulled back to see all of her. */
  private takeHelm(): void {
    const sh = this.sailing.mine;
    if (!sh) return;
    this.cancelActions();
    this.seated = null;
    this.emote = null;
    this.sailing.atHelm = true;
    if (!this.rigBeforeHelm) this.rigBeforeHelm = this.rig.distance;
    this.rig.distance = Math.max(this.rig.distance, 10 + sh.hull.len * 0.9);
    sh.helm(this.player.position);
    this.player.velocity.set(0, 0, 0);
  }

  /** Off the helm: onto the shore beside her (she's left moored there), or over the side into the sea. */
  private leaveHelm(to: THREE.Vector3 | null): void {
    const sh = this.sailing.mine;
    this.sailing.atHelm = false;
    if (this.rigBeforeHelm) { this.rig.distance = this.rigBeforeHelm; this.rigBeforeHelm = 0; }
    const P = this.player;
    if (to) P.teleport(to.x, to.y, to.z);
    else if (sh) { const side = sh.side(1); P.teleport(sh.pos.x + side.x * (sh.hull.beam * 0.5 + 1.5), SEA - 0.5, sh.pos.z + side.z * (sh.hull.beam * 0.5 + 1.5)); }
    P.velocity.set(0, 0, 0);
    P.fallStartY = P.position.y;
    if (!sh) return;
    // Your own ship remembers how she was left; a hired one whose hour is up goes back to the yard
    const out = Number(this.flag('shipOut') ?? -1), ships = this.myShips();
    if (out >= 0 && ships[out]) this.setFlag('ships', ships.map((x, k) => (k === out ? { ...x, hp: Math.round(sh.hp) } : x)));
    const hire = this.flag('shipHire') as { until: number } | null;
    if (hire && hire.until < Date.now() && out < 0) { this.sailing.stow(); this.setFlag('shipHire', null); this.hud.system('The yard\'s boy takes her back round to the berth.'); }
  }

  /** Dry land beside her to step onto: within a few blocks of her side, a little above the sea. */
  private shipShore(): THREE.Vector3 | null {
    const sh = this.sailing.mine;
    if (!sh) return null;
    const V2 = this.world.voxels, r = Math.ceil(sh.hull.beam * 0.5 + 3);
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = Math.floor(sh.pos.x) + dx, z = Math.floor(sh.pos.z) + dz;
      if (!V2.isLoaded(x, z)) continue;
      const g = V2.groundBelow(x + 0.5, SEA + 6, z + 0.5);
      if (g < SEA + 0.5 || g > SEA + 5 || V2.get(x, g - 1, z) === B.Water || isSolid(V2.get(x, g, z)) || isSolid(V2.get(x, g + 1, z))) continue;
      const d = Math.hypot(x + 0.5 - sh.pos.x, z + 0.5 - sh.pos.z);
      if (d < bd) { bd = d; best = new THREE.Vector3(x + 0.5, g, z + 0.5); }
    }
    return best;
  }

  /** A raider sunk by your guns: what floats up, what the Charter pays for it, and the feat. */
  private raiderSunk(id: string, kindName: string, level: number, marks: [number, number], plunder: [string, number, number][], name: string, _at: THREE.Vector3): void {
    const m = marks[0] + Math.floor(Math.random() * (marks[1] - marks[0] + 1));
    this.addMarks(m);
    const got: string[] = [];
    for (const [it, a, b] of plunder) { const n = a + Math.floor(Math.random() * (b - a + 1)); if (n > 0 && ITEMS[it] && this.give(it, n)) got.push(`${n} ${ITEMS[it].name}`); }
    this.addXp('melee', level * 18);
    this.setFlag('raidersSunk', Number(this.flag('raidersSunk') ?? 0) + 1);
    if (name === 'Black Hen' && this.stage('gullMargery') === 'hen' && this.give('margery_bell', 1)) { this.setStage('gullMargery', 'nessa'); this.hud.system('Floating up out of the Black Hen as she goes: a ship\'s bell on a broken plank. MARGERY GULLMOUTH, cut round the lip.'); }
    this.setFlag('sunk:' + id, Number(this.flag('sunk:' + id) ?? 0) + 1);
    this.hud.banner(`The ${name} is going down`, `${kindName}, sunk`, true);
    this.hud.system(`You pick ${m} marks${got.length ? ' and ' + got.join(', ') : ''} out of the wreckage.`);
    this.sfx('quest');
    this.hud.setTracker(this.questEntries());
  }

  /** Your ship went down under you: you're in the sea where she was; your own goes on the yard's books to be raised. */
  private shipLost(): void {
    this.sailing.atHelm = false;
    if (this.rigBeforeHelm) { this.rig.distance = this.rigBeforeHelm; this.rigBeforeHelm = 0; }
    const out = Number(this.flag('shipOut') ?? -1), ships = this.myShips();
    if (out >= 0 && ships[out]) this.setFlag('ships', ships.map((x, k) => (k === out ? { ...x, sunk: true, hp: 0 } : x)));
    this.setFlag('shipOut', null);
    this.setFlag('shipHire', null);
    this.player.velocity.set(0, 0, 0);
    this.hud.system(out >= 0 ? 'She\'s gone. Swim for it. Any shipwright can raise her again, for a tenth of what she cost.' : 'The yard\'s ship is gone, and the yard will want words. Swim for it.');
    this.persist();
  }

  /** The panel over the hotbar while you've the helm: wind, sail, speed, hull, and the guns either side. */
  private updateShipPanel(dt: number): void {
    const sh = this.sailing.mine, on = !!sh && this.sailing.atHelm;
    if (!on) { if (this.shipPanel) { this.shipPanel.remove(); this.shipPanel = null; } return; }
    this.shipPanelT -= dt;
    if (this.shipPanelT > 0 && this.shipPanel) return;
    this.shipPanelT = 0.2;
    if (!this.shipPanel) {
      const el = document.createElement('div');
      el.id = 'shippanel';
      el.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);padding:8px 14px;border-radius:10px;background:rgba(18,20,26,.72);color:#f2ead8;font:600 13px/1.45 Alegreya,serif;pointer-events:none;text-align:center;min-width:300px;box-shadow:0 2px 10px rgba(0,0,0,.4)';
      document.body.appendChild(el);
      this.shipPanel = el;
    }
    const w = this.sailing.wind(), from = (w.dir + Math.PI) % (Math.PI * 2);
    const pts = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    // (north is -z, east +x: the wind comes from the opposite of where it blows)
    const comp = pts[Math.round(((Math.atan2(Math.sin(from), -Math.cos(from)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
    const gun = (i: number) => (sh!.reload[i] > 0 ? `${sh!.reload[i].toFixed(1)}s` : 'ready');
    const foe = this.sailing.nearestFoe();
    this.shipPanel.innerHTML = `<b>${sh!.livery.name}</b> &nbsp;·&nbsp; hull ${Math.max(0, Math.round(sh!.hp))}/${sh!.hull.hp} &nbsp;·&nbsp; ${['sails furled', 'fighting sail', 'all plain sail'][sh!.sails]} &nbsp;·&nbsp; ${(sh!.speed * 0.9).toFixed(1)} knots<br>wind from the ${comp}, ${w.strength > 0.85 ? 'fresh' : w.strength > 0.65 ? 'steady' : 'light'} &nbsp;·&nbsp; port guns ${gun(0)} &nbsp;·&nbsp; starboard guns ${gun(1)}${foe && foe.d < 300 ? ` &nbsp;·&nbsp; <span style="color:#ff9a7a">${foe.ship.npc?.name ?? foe.ship.remote ?? 'a ship'} ${Math.round(foe.d)} off</span>` : ''}`;
  }

  arrangeHome(): void { this.hud.closeAll(); const H = this.cabin.active ? this.cabin : this.homeHere; if (H.active) H.stop(); else H.start(); }

  // =================================================================== XP and items
  addXp(skill: SkillId, amount: number): void {
    if (this.social.groupNearby()) amount = Math.round(amount * 1.1);
    if (Number(this.flag('rested') ?? 0) > 0) amount = Math.round(amount * 1.25);
    if (skill !== 'melee' && this.mastery('scholar')) amount = Math.round(amount * (1 + this.mastery('scholar')));
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

  get maxHp(): number { return Math.round((100 + (this.level('melee') - 1) * 6 + this.armour.vigor) * (1 + this.buffSum('hp')) * (1 + this.mastery('hardiness'))); }

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
    if (this.kit.hidden()) out.push({ name: 'Hidden', left: 0, kind: 'hidden' });
    for (const [id, h] of this.harms) out.push({ name: EFFECTS[id].name + (h.stacks > 1 ? ` ×${h.stacks}` : ''), left: Math.max(0, h.until - this.elapsed), kind: 'harm' });
    return out;
  }

  // ---- Harms (data/effects.ts): what foes' blows leave on you
  /** The harms on you: how deep, until when, when they last ticked, and when they came (for cleansing the newest). */
  private harms = new Map<EffectId, { stacks: number; until: number; tick: number; at: number }>();
  private inflictions = new WeakMap<object, Infliction | null>();
  /** A harm on you, or deeper and fresh again. */
  harm(id: EffectId, secs: number): void {
    const d = EFFECTS[id], h = this.harms.get(id);
    if (h) { h.stacks = Math.min(d.max, h.stacks + 1); h.until = this.elapsed + secs; h.at = this.elapsed; }
    else { this.harms.set(id, { stacks: 1, until: this.elapsed + secs, tick: 1, at: this.elapsed }); this.floatAt(this.player.position, 2.8, d.name, 'player'); }
  }
  /** Take off the newest harms (a heal, a Restoration's tick). */
  cleanse(n = 1): number {
    let done = 0;
    for (; done < n && this.harms.size; done++) {
      const [id] = [...this.harms].sort((a, b) => b[1].at - a[1].at)[0];
      this.harms.delete(id);
      this.floatAt(this.player.position, 2.6, 'Cleansed', 'heal');
    }
    return done;
  }
  /** The sum of one number over the harms on you (slow, weak, vuln), or the product (healing). */
  private harmed(k: 'slow' | 'weak' | 'vuln'): number { let v = 0; for (const [id] of this.harms) v += EFFECTS[id][k] ?? 0; return v; }
  private healingTaken(): number { let v = 1; for (const [id] of this.harms) v *= EFFECTS[id].healing ?? 1; return v; }
  /** Harms tick (the ones that hurt, each second) and wear off. */
  private tickHarms(dt: number): void {
    for (const [id, h] of this.harms) {
      if (h.until <= this.elapsed || this.dead) { this.harms.delete(id); continue; }
      const dot = EFFECTS[id].dot;
      if (!dot || (h.tick -= dt) > 0) continue;
      h.tick = 1;
      if (this.dev.god) continue;
      const n = Math.max(1, Math.round(this.maxHp * dot * h.stacks));
      // (something still eating at you keeps you in the fight: no resting it off)
      this.lastCombat = this.elapsed;
      this.hp -= n;
      this.floatAt(this.player.position, 2.0, `-${n}`, 'tick');
      if (this.hp <= 0) { this.die(); return; }
    }
  }
  /** Out of breath: run dry and you trudge until a third of it is back. */
  private winded = false;
  /** Magicka (docs/COMBAT.md): what spells are paid in. Stamina is `energy`. */
  magicka = 100;
  get maxMagicka(): number { return Math.round(POOLS.magicka.max * (1 + this.armour.light * 0.04)); }
  /** Holding the guard up (V): and when it went up, for the perfect block's window. */
  private guarding = false;
  private guardAt = -9;
  /** When the last "not enough" was said, so it isn't said every frame a key is held. */
  private shortAt = -9;
  /** What a skill on the bar costs (slot: 2 the weapon skill, 3 the heal, 4-6 utilities, 7 the elite). */
  skillCost(slot: number): Cost | null {
    const sk = slot === 1 ? this.kit.secondSkill : slot === 2 ? this.kit.weaponSkill : this.kit.bar[slot - 3];
    if (!sk) return null;
    const listed = SKILL_COST[sk.id];
    if (listed) return listed;
    const pool = slot <= 2 ? 'stamina' : CALLING_POOL[this.kit.calling.id] ?? 'stamina';
    return { pool, n: slot === 1 ? 10 : slot === 2 ? 12 : slot === 3 ? SLOT_COST.heal : slot === 7 ? SLOT_COST.elite : SLOT_COST.utility };
  }
  /** Can the skill be paid for now? */
  canPay(c: Cost | null): boolean {
    if (!c) return true;
    // A blood price: Lifeblood first, and it never takes your last
    if (c.pool === 'health') return this.hp - Math.max(0, c.n / 100 - this.kit.lifeblood) * this.maxHp >= 1;
    return (c.pool === 'stamina' ? this.energy : this.magicka) >= c.n;
  }

  /**
   * Everything the armour adds up to (data/armour.ts): defense off each hit, health, energy, roll
   * time, and the weights' own effects (light: skill haste; medium: crits and cheaper rolls; heavy:
   * health, slower energy).
   */
  private get armour() {
    const e = this.save.equip;
    const a = { defense: 0, vigor: 0, wind: 0, roll: 0, crit: 0, rollCost: 25, haste: 1, light: 0, medium: 0, heavy: 0, thorns: 0, swift: 0 };
    for (const id of [e.head, e.chest, e.legs, e.hands, e.feet]) {
      const r = id ? ITEMS[id]?.armor : undefined;
      if (!r) continue;
      // Its enchantment, if it has one (data/gear.ts ENCHANTS)
      const en = ITEMS[id!]?.enchant;
      if (en?.id === 'warding') a.vigor += [15, 25, 35][en.tier - 1];
      else if (en?.id === 'vigour') a.wind += [0.05, 0.08, 0.11][en.tier - 1];
      else if (en?.id === 'thorns') a.thorns += [0.06, 0.09, 0.12][en.tier - 1];
      else if (en?.id === 'swift') a.swift = Math.min(0.08, a.swift + [0.02, 0.03, 0.04][en.tier - 1]);
      a.defense += r.defense; a.vigor += r.vigor ?? 0; a.wind += r.wind ?? 0; a.roll += r.roll ?? 0;
      if (r.weight) a[r.weight]++;
    }
    for (const id of [e.ring1, e.ring2, e.neck, e.ear]) {
      const j = id ? ITEMS[id]?.jewel : undefined;
      if (!j) continue;
      a.vigor += j.vigor ?? 0; a.crit += j.crit ?? 0; a.wind += j.wind ?? 0; a.haste += j.haste ?? 0;
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
  /** A mastery passive's worth (data/mastery.ts): its points times its share per point. */
  private mastery(id: MasteryId): number {
    const n = readMastery(this.save.flags.mastery)[id] ?? 0;
    return n ? n * MASTERY_BY_ID.get(id)!.per : 0;
  }
  /** Mastery, for its tab on the talent screen. */
  masteryView() {
    const earned = masteryEarned(this.save.xp.melee), put = readMastery(this.save.flags.mastery);
    const spent = Object.values(put).reduce((a, b) => a + (b ?? 0), 0);
    return {
      open: this.level('melee') >= 100, earned: earned.points, next: earned.next, spent, left: earned.points - spent, temple: this.atTemple(),
      sets: MASTERY.map((st) => ({ id: st.id, name: st.name, blurb: st.blurb, icon: st.icon, color: st.color, passives: st.passives.map((d) => ({ id: d.id, name: d.name, n: put[d.id] ?? 0, cap: d.cap, now: d.desc(put[d.id] ?? 0), at: d.desc(Math.min(d.cap, (put[d.id] ?? 0) + 1)) })) })),
    };
  }
  /** A point into a passive (or, at a temple, every point back). */
  masterySpend(id: MasteryId | 'reset'): string | null {
    const v = this.masteryView(), put = readMastery(this.save.flags.mastery);
    if (id === 'reset') {
      if (!v.temple && this.mode === 'play') return 'Mastery is put back at a temple: kneel at the altar of any chapel, the Glass Kirk or the Hall of the Two Stones.';
      this.save.flags.mastery = {};
    } else {
      const d = MASTERY_BY_ID.get(id);
      if (!d) return null;
      if (v.left <= 0) return v.open ? 'No mastery points left. Every so much experience past level 100 is another.' : 'Mastery opens at level 100.';
      if ((put[id] ?? 0) >= d.cap) return `${d.name} is as far as it goes.`;
      this.save.flags.mastery = { ...put, [id]: (put[id] ?? 0) + 1 };
    }
    this.sfx(id === 'reset' ? 'open' : 'click');
    this.hud.refresh();
    this.persist();
    return null;
  }
  /** Horsemanship: your rank, and how far to the next (blocks), for the pack panel. */
  ridingInfo(): { rank: number; next: number | null } {
    const d = Number(this.flag('rideDist') ?? 0), rank = rideRank(d);
    return { rank, next: rank < RIDE_RANKS.length ? RIDE_RANKS[rank] - d : null };
  }
  /** Ground covered in the saddle counts toward horsemanship; a new rank is announced. */
  private rodeOn(dist: number): void {
    if (dist <= 0 || dist > 20) return;
    const was = Number(this.flag('rideDist') ?? 0), now = was + dist;
    this.save.flags.rideDist = now;
    const a = rideRank(was), b = rideRank(now);
    if (b > a) {
      this.hud.banner(`Horsemanship ${b}`, b >= RIDE_RANKS.length ? 'As good in the saddle as anyone in the realm' : 'A surer seat: a little more pace, and the gallop tires you less', true);
      this.sfx('levelUp');
      this.hud.refresh();
    }
  }
  private rideLast: THREE.Vector3 | null = null;
  /** Your helm and gloves: shown, or hidden (they still guard you). */
  gearShown(): { head: boolean; hands: boolean } { return { head: !this.flag('hideHead'), hands: !this.flag('hideHands') }; }
  toggleGearShown(slot: 'head' | 'hands'): void {
    const k = slot === 'head' ? 'hideHead' : 'hideHands';
    this.setFlag(k, !this.flag(k));
    this.dress();
    this.hud.refresh();
    this.persist();
  }

  /** The look the character shows: their own, with what they're wearing over it. */
  private wornLook(): Appearance {
    const e = this.save.equip;
    const look: Appearance = { ...this.save.look };
    for (const slot of ['chest', 'legs', 'hands', 'feet', 'head'] as const) {
      // (a helm or gloves you'd rather not see still guard you: they just aren't drawn)
      if ((slot === 'head' && this.flag('hideHead')) || (slot === 'hands' && this.flag('hideHands'))) continue;
      const id = e[slot];
      const l = id ? ITEMS[id]?.armor?.look : undefined;
      if (l) Object.assign(look, dyeLook(slot, l, this.gearDye(slot)));
    }
    return look;
  }
  /** The dyes on a worn slot (data/gearDyes.ts). */
  private gearDye(slot: DyeSlot): { main?: string; trim?: string } {
    const v = this.save.flags['gdye:' + slot];
    return v && typeof v === 'object' ? (v as { main?: string; trim?: string }) : {};
  }
  gearDyes(): Record<DyeSlot, { main?: string; trim?: string }> {
    return Object.fromEntries(DYE_SLOTS.map((k) => [k, this.gearDye(k)])) as Record<DyeSlot, { main?: string; trim?: string }>;
  }
  /** Every dye you can use on armour: the common ones and the ones you've found. */
  dyePalette(): { name: string; hex: string }[] {
    const found = Object.keys(this.save.flags).filter((k) => k.startsWith('dye:')).map((k) => ({ name: String(this.save.flags[k] === true ? 'Found dye' : this.save.flags[k]), hex: k.slice(4) }));
    return [...STARTER_DYES, ...found.filter((d) => !STARTER_DYES.some((x) => x.hex === d.hex))];
  }
  /** Dye one channel of a worn slot (null washes it back to the piece's own colour, free). */
  dyeGear(slot: DyeSlot, channel: DyeChannel, hex: string | null): void {
    if (!DYE_SLOTS.includes(slot)) return;
    const cur = { ...this.gearDye(slot) };
    if (hex) {
      if (!this.dyePalette().some((d) => d.hex === hex)) return;
      if (cur[channel] === hex) return;
      if (this.mode === 'play' && this.save.marks < DYE_COST) { this.toast(`Dyeing costs ${DYE_COST} marks.`); this.sfx('fail'); return; }
      if (this.mode === 'play') this.save.marks -= DYE_COST;
      cur[channel] = hex;
    } else delete cur[channel];
    this.setFlag('gdye:' + slot, cur.main || cur.trim ? cur : undefined);
    if (!cur.main && !cur.trim) delete this.save.flags['gdye:' + slot];
    this.sfx('click');
    this.dress();
    this.persist();
    this.hud.refresh();
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
  private dropped(id: string, source: DropSource): string { const d = ITEMS[id]; return d ? unidentified(rollGear(d, source), (k) => ITEMS[k]) : id; }
  /** A named piece has dropped: the realm numbers it, if any are left (server/uniques.mjs). Offline there's
   *  no count to keep, so none drop. */
  private claimNamed(id: string): void {
    if (this.online.status !== 'online') return;
    if (this.inv.freeSlots() < 1) { this.hud.system('Something glints in what\'s left of it, but your pack is full.'); return; }
    this.online.uClaim(id);
  }
  private healSelf(n: number): void {
    const h = Math.min(this.maxHp - this.hp, Math.round(n * this.healingTaken()));
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
    // The interface's size (the world's own labels keep theirs), and colour vision
    document.documentElement.style.setProperty('--ui-scale', String(Math.min(1.3, Math.max(0.8, s.uiScale ?? 1))));
    applyColourVision(s.colourVision);
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
      get mapImageEast() { return g.world?.mapImageEast ?? null; },
      get currentStation() { return g.currentStation; },
      level: (s: SkillId) => g.level(s),
      useSlot: (i: number) => g.useSlot(i),
      sortPack: () => { g.inv.sort(); g.hud.refresh(); g.persist(); },
      daily: () => g.dailies.view(),
      festival: () => ({ ...g.festivals.view(), extra: g.seasons.journal() }),
      trade: () => g.social.ui(),
      tradeAdd: (id: string, n?: number) => g.social.add(id, n),
      tradeRemove: (i: number) => g.social.remove(i),
      tradeMarks: (n: number) => g.social.setMarks(n),
      tradeLock: () => g.social.lock(),
      tradeAccept: () => g.social.accept(),
      tradeCancel: () => g.social.cancel(),
      exchange: () => g.exchange.view(),
      exBuy: (id: number) => g.exchange.buy(id),
      exPost: (item: string, n: number, price: number) => g.exchange.post(item, n, price),
      exStallDown: () => g.stallDown(),
      exTakeBack: (id: number) => g.exchange.takeBack(id),
      exWant: (item: string, n: number, price: number) => g.exchange.want(item, n, price),
      exFill: (id: number) => g.exchange.fill(id),
      exUnwant: (id: number) => g.exchange.unwant(id),
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
      finder: () => ({ ...g.dungeons.view(), bosses: g.activities.bossBoard(), wbSeek: g.wbSeek }),
      finderDo: (what: 'role' | 'hench' | 'find' | 'now' | 'cancel' | 'leave' | 'vet' | 'rhench' | 'rfind' | 'wbfind' | 'wbstop', id?: string) => {
        let why: string | null = null;
        if (what === 'wbfind' && id) {
          const b = g.activities.bossBoard().find((x) => x.id === id);
          if (!b) return null;
          if (g.online.status !== 'online') why = 'Finding a group needs the online realm.';
          else g.online.wbLook(b.id, b.name);
        } else if (what === 'wbstop') g.online.wbStop();
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
      hall: () => (g.online.status === 'online' ? g.hallView : null),
      hallDo: (what: 'give' | 'vault' | 'pick' | 'go' | 'leave', a?: string | null, n?: number) => {
        if (what === 'give' || what === 'vault') g.hallGive(a ?? null, n ?? 0, what === 'vault');
        else if (what === 'pick' && a) g.online.hallPick(a);
        else if (what === 'go') g.goToHall();
        else if (what === 'leave') g.online.hallLeave();
      },
      guildDo: (what: 'found' | 'leave' | 'kick' | 'rank' | 'motto', a?: string, b?: string) => {
        if (what === 'found') g.social.guildFound(a ?? '', b ?? '');
        else if (what === 'leave') g.social.guildLeave();
        else if (what === 'kick') g.social.guildKick(a ?? '');
        else if (what === 'rank') g.social.guildRank(a ?? '', (b ?? 'member') as 'leader' | 'officer' | 'member');
        else g.social.guildMotto(a ?? '');
      },
      claimLogin: () => { g.dailies.claimLogin(); g.hud.refresh(); },
      respawnNow: () => { if (g.dead) g.respawn(); },
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
      mastery: () => g.masteryView(),
      bestiary: () => ({
        tiers: BEAST_TIERS,
        entries: bestiaryRoster().map(({ type, regions }) => {
          const d = ENEMIES[type];
          return {
            type, name: d.name, level: d.level, where: regions.map((r) => REGION_INFO[r]?.name ?? r), kills: Number(g.flag('killed:' + type) ?? 0),
            how: [ATTACK_WAYS[d.attack] ?? '', d.role ? ROLE_WAYS[d.role] : ''].filter(Boolean).join(' '), loot: [...new Set(d.loot.map((l) => ITEMS[l.item]?.name).filter((n): n is string => !!n))], note: BEAST_NOTES[type],
          };
        }),
      }),
      masterySpend: (id: string) => g.masterySpend(id as MasteryId | 'reset'),
      callingFree: () => !g.flag('callingSet'),
      apprentice: () => { const a = g.apprentice; return a ? { name: a.name, master: MASTER_OF[a.id]?.name ?? '' } : null; },
      bar: () => ({ chosen: g.kit.bar.slice(2, 4).map((s) => s.id), pool: [...g.kit.calling.utilities, ...crossUtilities(g.apprentice)], cross: crossUtilities(g.apprentice).map((s) => s.id), signature: g.kit.calling.skills[1], heal: g.kit.calling.skills[0], elite: g.kit.elite, elites: elitesOf(g.kit.calling), weapon: g.kit.weaponSkill }),
      setUtilities: (ids: string[]) => g.setUtilities(ids),
      setElite: (id: string) => g.setElite(id),
      learnTalent: (id: string) => g.learnTalent(id),
      skillsView: () => g.skillsView(),
      unlockSkill: (id: string) => g.unlockSkill(id),
      morphSkill: (id: string, w: 'a' | 'b') => g.morphSkill(id, w),
      saveBuild: (i: number) => g.saveBuild(i),
      loadBuild: (i: number) => g.loadBuild(i),
      resetTalents: () => g.resetTalents(),
      wearTitle: (id: string | null) => { g.setFlag('title', id); g.hud.setTitle(id ? FEATS.find((f) => f.id === id)?.title ?? null : null); },
      unequip: (slot: keyof Equip) => g.unequip(slot),
      gearDyes: () => g.gearDyes(),
      dyePalette: () => g.dyePalette(),
      dyeGear: (slot: DyeSlot, channel: DyeChannel, hex: string | null) => g.dyeGear(slot, channel, hex),
      armourSummary: () => g.armourSummary(),
      packInfo: () => g.packInfo(),
      togglePack: () => g.togglePack(),
      gearShown: () => g.gearShown(),
      ridingInfo: () => g.ridingInfo(),
      toggleGearShown: (slot: 'head' | 'hands') => g.toggleGearShown(slot),
      dropSlot: (i: number) => g.dropSlot(i),
      craft: (r: string, n: number, o?: CraftOpts) => g.startCraft(r, n, o),
      craftView: () => g.craftView(),
      craftCost: (id: string, o: CraftOpts) => g.costOf(id, o),
      takeApart: (id: string) => g.takeApart(id),
      passivesOf: (k: SkillId) => g.passivesOf(k),
      learnPassive: (id: string) => g.learnPassive(id),
      buy: (item: string) => g.buy(item),
      sell: (slot: number) => g.sell(slot),
      buyBack: (i: number) => g.buyBack(i),
      quests: () => g.questEntries(),
      trackQuest: (id: string, on: boolean) => g.trackQuest(id, on),
      focusQuest: (id: string | null) => g.focusQuest(id),
      showQuestOnMap: (id: string) => g.showQuestOnMap(id),
      abandonQuest: (id: string) => g.abandonQuest(id),
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
      canPreview: (id: string) => g.canPreview(id),
      previewItem: (id: string) => g.previewItem(id),
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
      const pets = Object.keys(s.flags ?? {}).filter((k) => k.startsWith('petOwn:')).map((k) => k.slice(7));
      return { id, name: s.name, look: s.look, origin: s.origin ?? null, level, total, calling, place: REGION_INFO[regionAt(s.pos[0], s.pos[2]).a].name, playTime: s.playTime, dyes, hats, capes, costumes, pets };
    };
    return {
      renderer: () => g.renderer,
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
      signIn: async (user, pass, create, code) => {
        const err = await signIn(user, pass, create, code);
        if (!err) await g.syncAccount();
        return err;
      },
      recover: async (user, code, pass) => {
        const err = await recoverAccount(user, code, pass);
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
    void loadTravellers(); // (the board at Hollin Ford)
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
    this.kit.setElite(this.flag('elite:' + this.calling));
    this.kit.setUtilities(this.flag('bar:' + this.calling), this.apprentice);
    this.migrateSkills();
    this.retune();
    this.appliedApprentice = this.flag('apprentice');
    this.kit.weapon = weaponKit(this.blade?.model?.family, this.blade?.speed);
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill);
  }

  /** Choose the two utilities beside the signature (from the calling's other three). */
  /** Choose the elite for key 8 (out of a fight). */
  setElite(id: string): string | null {
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    this.setFlag('elite:' + this.calling, id);
    this.kit.setElite(id);
    this.sfx('page');
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill);
    this.persist();
    return null;
  }
  setUtilities(ids: string[]): string | null {
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    this.setFlag('bar:' + this.calling, ids.slice(0, 2));
    this.kit.setUtilities(ids, this.apprentice);
    this.sfx('page');
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill);
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
    const why = canLearn(id, have, this.calling, this.level('melee'), this.poolExtra());
    if (why) return why;
    this.setFlag('talents:' + this.calling, [...have, id]);
    this.retune();
    this.sfx('levelUp', 0.6);
    this.persist();
    return null;
  }

  /**
   * Unlearn everything for the current calling (talents, unlocked skills, morphs) and have the points
   * back: only kneeling at a temple's altar, out of a fight, for a few marks a point (ESO's shrines).
   */
  resetTalents(): string | null {
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    if (this.mode === 'play' && !this.atTemple()) return 'Unlearning is done at a temple: kneel at the altar of any chapel, the Glass Kirk or the Hall of the Two Stones in Callis.';
    const pool = this.skillPool(), cost = (pool.total - pool.left) * RESPEC_PER_POINT;
    if (this.mode === 'play' && this.save.marks < cost) return `It costs ${cost} marks to unlearn ${pool.total - pool.left} points. You have ${this.save.marks}.`;
    if (this.mode === 'play') this.save.marks -= cost;
    this.setFlag('talents:' + this.calling, []);
    for (const id of [...this.skillIds(), ...this.weaponSkillIds()]) { this.setFlag('skun:' + id, null); this.setFlag('skmorph:' + id, null); }
    this.retune();
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill);
    if (this.mode === 'play') { this.hud.banner('Unlearned', 'Your points are yours to spend again', true); this.sfx('quest', 0.6); }
    this.persist();
    return null;
  }

  // =================================================================== Skill points, ranks and morphs (data/skillpoints.ts)
  /** Shards of Insight: every waymark attuned, every vista stood on, every wonder found (ESO's skyshards). */
  private insight(): number {
    const f = this.save.flags;
    return Object.keys(f).filter((k) => f[k] && (k.startsWith('wm-') || k.startsWith('vista:') || k.startsWith('found:sc-'))).length;
  }
  /** The calling's skills the points unlock: its heal, signature, elite and utilities, and an apprentice's borrowed ones. */
  private skillIds(): string[] {
    const c = this.kit.calling;
    return [...c.skills.map((x) => x.id), ...(c.elites ?? []).map((x) => x.id), ...c.utilities.map((x) => x.id), ...crossUtilities(this.apprentice).map((x) => x.id)];
  }
  private weaponSkillIds(): string[] { return [...Object.values(WEAPON_SKILLS), ...Object.values(SECOND_SKILLS)].map((x) => x!.id); }
  /** Is a calling skill unlocked (weapon skills come with the weapon)? */
  skillUnlocked(id: string): boolean { if (id === 'spark') id = 'frostbolt'; return this.weaponSkillIds().includes(id) || !!this.flag('skun:' + id); }
  private skillRank(id: string): number { return skillRankFor(Number(this.flag('skuse:' + id) ?? 0)); }
  private morphOf(id: string): 'a' | 'b' | null { const m = this.flag('skmorph:' + id); return m === 'a' || m === 'b' ? m : null; }
  /** The pool: points from levels (the talents' own and the early ones) and Insight, and what's spent of it. */
  skillPool(): { total: number; left: number; insight: number; skills: number; morphs: number; talents: number } {
    const lvl = this.level('melee'), ins = this.insight();
    const total = pointsAt(lvl) + earlyPoints(lvl) + Math.floor(ins / SHARDS_PER_POINT);
    const skills = this.skillIds().filter((id) => this.flag('skun:' + id)).length;
    const morphs = [...this.skillIds(), ...this.weaponSkillIds()].filter((id) => this.morphOf(id)).length;
    const talents = spent(this.learned());
    return { total, left: total - skills - morphs - talents, insight: ins, skills, morphs, talents };
  }
  /** What the pool holds for talents beyond the talents' own level points (for canLearn). */
  private poolExtra(): number {
    const P = this.skillPool();
    return P.total - pointsAt(this.level('melee')) - P.skills - P.morphs;
  }
  /** The kit's numbers: talents, then each skill's rank and morph. */
  private retune(): void {
    const ids = [...this.skillIds(), ...this.weaponSkillIds()];
    this.kit.setTalents(this.learned(), (t) => {
      for (const id of ids) {
        applyRank(t, id, this.skillRank(id));
        const m = this.morphOf(id);
        if (m && MORPHS[id]) MORPHS[id][m === 'a' ? 0 : 1].mod(t);
      }
    });
  }
  /** A skill went off: it counts towards its next rank. */
  private skillUsed(id: string): void {
    const before = this.skillRank(id);
    const uses = Number(this.flag('skuse:' + id) ?? 0) + 1;
    this.setFlag('skuse:' + id, uses);
    const after = skillRankFor(uses);
    if (after > before) {
      const name = [...this.kit.calling.skills, ...this.kit.calling.utilities, ...Object.values(WEAPON_SKILLS), ...crossUtilities(this.apprentice)].find((x) => x.id === id)?.name ?? id;
      this.hud.banner(`${name} ${RANK_NAMES[after - 1]}`, after === 4 ? 'Ready to morph: open your skills (T)' : 'Rank up', true);
      this.sfx('levelUp', 0.5);
      this.retune();
    }
  }
  /** Unlock a calling skill for a point, once your level allows it. */
  unlockSkill(id: string): string | null {
    if (!this.skillIds().includes(id)) return 'That isn\'t one of your skills.';
    if (this.skillUnlocked(id)) return 'Already unlocked.';
    const c = this.kit.calling, lvl = this.level('melee');
    const need = id === c.skills[0].id ? UNLOCK_AT[3] : id === c.skills[1].id ? UNLOCK_AT[4] : id === c.skills[2].id || c.elites?.some((x) => x.id === id) ? UNLOCK_AT[7] : UNLOCK_AT[5];
    if (lvl < need) return `That opens at level ${need}.`;
    if (this.skillPool().left < 1) return 'No skill points left to spend. They come with levels and with Insight.';
    this.setFlag('skun:' + id, 1);
    this.retune();
    this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill);
    this.sfx('levelUp', 0.6);
    this.persist();
    return null;
  }
  /** Morph a rank IV skill one of its two ways, for a point. Changing your mind is done at a temple. */
  morphSkill(id: string, which: 'a' | 'b'): string | null {
    if (!MORPHS[id]) return 'That skill doesn\'t morph.';
    if (!this.skillUnlocked(id)) return 'Unlock it first.';
    if (this.skillRank(id) < 4) return `Use it more: it morphs at rank IV (${RANK_AT[3]} uses).`;
    if (this.morphOf(id)) return 'Already morphed. Unlearn it at a temple to choose again.';
    if (this.skillPool().left < 1) return 'No skill points left to spend.';
    this.setFlag('skmorph:' + id, which);
    this.retune();
    const m = MORPHS[id][which === 'a' ? 0 : 1];
    this.hud.banner(m.name, 'Morphed', true);
    this.sfx('discover');
    this.persist();
    return null;
  }
  /** Characters from before skill points: what their level had opened on the bar is unlocked, from the new early points. */
  private migrateSkills(): void {
    const key = 'skv2:' + this.calling;
    if (this.flag(key)) return;
    const lvl = this.level('melee'), c = this.kit.calling;
    if (lvl >= UNLOCK_AT[3]) this.setFlag('skun:' + c.skills[0].id, 1);
    if (lvl >= UNLOCK_AT[4]) this.setFlag('skun:' + c.skills[1].id, 1);
    if (lvl >= UNLOCK_AT[7]) this.setFlag('skun:' + c.skills[2].id, 1);
    const bar = this.kit.bar.slice(2, 4).map((x) => x.id);
    if (lvl >= UNLOCK_AT[5] && bar[0]) this.setFlag('skun:' + bar[0], 1);
    if (lvl >= UNLOCK_AT[6] && bar[1]) this.setFlag('skun:' + bar[1], 1);
    this.setFlag(key, 1);
  }
  /** Every skill as the Skills page shows it: unlocked or not, rank and progress, morphs. */
  skillsView() {
    const c = this.kit.calling, lvl = this.level('melee');
    const one = (sk: { id: string; name: string; icon: string; desc: string }, need: number, kind: string) => {
      const uses = Number(this.flag('skuse:' + sk.id) ?? 0), rank = skillRankFor(uses), m = this.morphOf(sk.id);
      const next = RANK_AT[rank] ?? null;
      return {
        id: sk.id, name: m ? MORPHS[sk.id][m === 'a' ? 0 : 1].name : sk.name, base: sk.name, icon: sk.icon, desc: sk.desc, kind, need,
        open: lvl >= need, unlocked: this.skillUnlocked(sk.id), free: this.weaponSkillIds().includes(sk.id),
        rank, uses, next, from: RANK_AT[rank - 1], morph: m,
        morphs: (MORPHS[sk.id] ?? []).map((x, i) => ({ key: (i ? 'b' : 'a') as 'a' | 'b', name: x.name, desc: x.desc })),
      };
    };
    const cross = crossUtilities(this.apprentice);
    return {
      pool: this.skillPool(), temple: this.atTemple(), respec: (this.skillPool().total - this.skillPool().left) * RESPEC_PER_POINT,
      calling: [one(c.skills[0], UNLOCK_AT[3], 'Heal · key 4'), one(c.skills[1], UNLOCK_AT[4], 'Signature · key 5'), one(c.skills[2], UNLOCK_AT[7], 'Elite · key 8'), ...(c.elites ?? []).map((x) => one(x, UNLOCK_AT[7], 'Elite · key 8, chosen instead'))],
      utilities: [...c.utilities, ...cross].map((u) => one(u, UNLOCK_AT[5], cross.includes(u) ? 'Borrowed from your master' : 'Utility · keys 6 and 7')),
      weapons: [...Object.values(SECOND_SKILLS).map((w) => one(w!, UNLOCK_AT[1], 'Weapon skill · key 2')), ...Object.values(WEAPON_SKILLS).map((w) => one(w, UNLOCK_AT[2], 'Weapon skill · key 3'))],
    };
  }

  // ---- Temples: kneel at the altar to unlearn, or to change build
  private templeSpots: { x: number; y: number; z: number }[] | null = null;
  private temples(): { x: number; y: number; z: number }[] {
    if (this.templeSpots) return this.templeSpots;
    const out: { x: number; y: number; z: number }[] = [];
    for (const site of sitePlan().sites) for (const pr of site.props) if (pr.altar) out.push({ x: pr.x, y: pr.y, z: pr.z });
    out.push({ x: TEMPLE.x + 0.5, y: heightAt(TEMPLE.x, TEMPLE.z), z: TEMPLE.z + 0.5 });
    return (this.templeSpots = out);
  }
  /** Kneeling distance from an altar. */
  atTemple(): boolean {
    const p = this.player.position;
    return this.temples().some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 6 && Math.abs(t.y - p.y) < 4);
  }

  /** What the talent screen shows of the trees: each talent with the icon of the skill it changes, and the saved builds. */
  talentView() {
    const have = this.learned(), lvl = this.level('melee'), c = this.kit.calling;
    const skills = [...c.skills, ...(c.elites ?? []), ...c.utilities, this.kit.weaponSkill];
    // A talent's icon: the skill its words name, or the calling's signature for its mechanic and the rest
    const iconFor = (text: string) => skills.find((sk) => text.includes(sk.name))?.icon ?? c.skills[1].icon;
    return {
      points: this.skillPool().left, total: this.skillPool().total, level: lvl,
      calling: { name: c.name, role: c.role, color: c.mechanic.color, icon: c.skills[1].icon, mechanic: c.mechanic.name },
      fighting: this.mode === 'play' && this.elapsed - this.lastCombat < 6,
      trees: TREES[this.calling].map((t) => ({
        id: t.id, name: t.name, desc: t.desc, icon: iconFor(t.desc),
        spent: spent(have, t.id), gate: TIER_GATE, bar: t.bar.map((u) => c.utilities.find((s) => s.id === u)?.name ?? u),
        talents: t.talents.map((d) => ({ id: d.id, name: d.name, desc: d.desc, tier: d.tier, ranks: d.ranks, rank: rankOf(d.id, have), capstone: !!d.capstone, why: canLearn(d.id, have, this.calling, lvl, this.poolExtra()), icon: iconFor(d.name + ' ' + d.desc) })),
      })),
      builds: this.builds().map((b) => b && {
        name: b.name,
        // (how it's spread: the tree names and their points, most first)
        sum: TREES[this.calling].map((t) => [t.name, spent(b.talents, t.id)] as const).filter(([, n]) => n > 0).sort((a, z) => z[1] - a[1]).map(([n, k]) => `${n} ${k}`).join(' · ') || 'No talents',
        on: b.talents.length === have.length && [...b.talents].sort().join() === [...have].sort().join() && b.bar.join() === this.kit.bar.slice(2, 4).map((x) => x.id).join(),
      }),
    };
  }

  // Builds (GW2's build templates): three saved sets of talents and utilities for each calling, to
  // switch between out of a fight, so a Warden can hold the line in a dungeon and go back to the
  // Toll for the open world without learning it all again.
  private builds(): ({ name: string; talents: string[]; bar: string[]; elite?: string } | null)[] {
    const v = this.flag('builds:' + this.calling);
    const list = Array.isArray(v) ? (v as ({ name: string; talents: string[]; bar: string[]; elite?: string } | null)[]) : [];
    return [0, 1, 2].map((i) => list[i] ?? null);
  }
  saveBuild(i: number): string | null {
    if (i < 0 || i > 2) return null;
    const list = this.builds(), have = this.learned();
    const top = TREES[this.calling].map((t) => [t.name, spent(have, t.id)] as const).sort((a, z) => z[1] - a[1])[0];
    list[i] = { name: have.length ? top[0] : 'Untrained', talents: have, bar: this.kit.bar.slice(2, 4).map((x) => x.id), elite: this.kit.elite.id };
    this.setFlag('builds:' + this.calling, list);
    this.persist();
    return null;
  }
  loadBuild(i: number): string | null {
    const b = this.builds()[i];
    if (!b) return 'Nothing saved there yet.';
    if (this.mode === 'play' && this.elapsed - this.lastCombat < 6) return 'Not while you are fighting.';
    if (this.mode === 'play' && !this.atTemple()) return 'Builds are changed at a temple: kneel at the altar of any chapel, the Glass Kirk or the Hall of the Two Stones.';
    // Learned again in order, as far as the points and tiers allow now (a build saved at a higher level
    // than you are fills what it can)
    const lvl = this.level('melee'), got: string[] = [];
    this.setFlag('talents:' + this.calling, []);
    for (const id of b.talents) if (!canLearn(id, got, this.calling, lvl, this.poolExtra())) got.push(id);
    this.setFlag('talents:' + this.calling, got);
    this.retune();
    if (b.elite) this.setElite(b.elite);
    this.setUtilities(b.bar);
    this.sfx('levelUp', 0.5);
    this.persist();
    return got.length < b.talents.length ? `Some of that build needs a higher level: ${got.length} of its ${b.talents.length} points are in.` : null;
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
    // A character saved in Morrow when it was a map of its own: set down where Morrow is now, east over the sea
    if (this.save.land === 'morrow') { this.save.pos[0] += MORROW_OX; this.save.land = undefined; this.setFlag('voyage', null); }
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
  /** Look over the unidentified piece in pack slot i with a loupe (one used up): it becomes what it was all along. */
  private identify(i: number): void {
    const st = this.save.inv[i], def = st && ITEMS[st.id];
    if (!st || !def?.unid) return;
    if (this.count('loupe') < 1) {
      this.hud.system(`${def.name}: you'll need a jeweller's loupe to see what it is. General merchants and the pedlars sell them.`);
      this.sfx('fail');
      return;
    }
    this.take('loupe', 1);
    this.inv.removeAt(i, 1);
    this.inv.add(def.unid, 1);
    const now = ITEMS[def.unid];
    this.hud.banner(now.name, 'Identified', true);
    this.hud.system(`Identified: ${now.name}.${now.enchant ? ' It\'s enchanted.' : ''}`);
    this.sfx(now.rarity === 'epic' || now.enchant ? 'discover' : 'pickup');
    this.hud.refresh('inv');
  }

  private useSlot(i: number): void {
    const st = this.save.inv[i];
    if (!st) return;
    const def = ITEMS[st.id];
    if (def.furn) { this.hud.system(this.home.owned ? `Furniture goes down at home: press E inside ${this.myHome()?.name ?? 'your home'} and choose Arrange the furniture.` : 'Furniture needs a house to go in. There\'s a cottage for sale on the road east of Hollin Ford.'); return; }
    if (def.unid) { this.identify(i); return; }
    if (def.jewel) {
      const eq = this.save.equip, slot = def.jewel.slot === 'ring' ? (!eq.ring1 ? 'ring1' : !eq.ring2 ? 'ring2' : 'ring1') : def.jewel.slot;
      const old = eq[slot] ?? null;
      this.inv.removeAt(i, 1);
      eq[slot] = st.id;
      if (old) this.inv.add(old, 1);
      this.hp = Math.min(this.hp, this.maxHp);
      this.hud.system(`You put on the ${def.name.toLowerCase()}.`);
      this.sfx('equip');
      this.hud.refresh();
      return;
    }
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
    } else if (def.pet) {
      // A pet joins the wardrobe for good, and comes to heel at once if none is out
      this.inv.removeAt(i, 1);
      this.setFlag('petOwn:' + def.pet, 1);
      if (!this.save.look.pet) { this.save.look.pet = def.pet; this.dress(); }
      this.hud.banner(def.name, 'Your pet now', true);
      this.hud.system(`${def.name} is yours now and follows you about. Change pets, or send her home, under Pet with Change look, on the character screen.`);
      this.sfx('discover');
    } else if (def.glyph) {
      // A glyph: into the weapon in hand, or into a piece of armour worn (the first without one, chest first)
      const E = ENCHANTS[def.glyph.id];
      const eq = this.save.equip;
      let slot: keyof typeof eq | null = null;
      if (E.kind === 'weapon') slot = eq.weapon && ITEMS[eq.weapon]?.weapon && !ITEMS[eq.weapon]?.named ? 'weapon' : null;
      else {
        const worn = (['chest', 'legs', 'head', 'hands', 'feet'] as const).filter((k) => eq[k] && ITEMS[eq[k]!]?.armor && !ITEMS[eq[k]!]?.named);
        slot = worn.find((k) => !ITEMS[eq[k]!]?.enchant) ?? worn[0] ?? null;
      }
      if (!slot) { this.hud.system(E.kind === 'weapon' ? 'Hold the weapon you want to enchant first (named pieces can\'t take a glyph).' : 'Wear the armour you want to enchant first (named pieces can\'t take a glyph).'); return; }
      const old = eq[slot]!, now = enchantedId(old, def.glyph.id, def.glyph.tier);
      if (!ITEMS[now]) { this.hud.system('That piece won\'t take an enchantment.'); return; }
      this.inv.removeAt(i, 1);
      (eq as unknown as Record<string, string | null | undefined>)[slot] = now;
      this.hud.banner(ITEMS[now].name, 'Enchanted', true);
      this.hud.system(`${def.name} goes into ${ITEMS[old].name}: ${E.text(def.glyph.tier)}`);
      this.particles.burst(tmpV.copy(this.player.position).setY(this.player.position.y + 1.2), '#c8a0ff', 22);
      this.sfx('discover');
      this.dress();
      this.hud.refresh();
    } else if (def.teaches) {
      // A recipe card: learned for good, the card used up
      if (this.flag('recipe:' + def.teaches)) { this.hud.system('You already know that one.'); return; }
      this.inv.removeAt(i, 1);
      this.setFlag('recipe:' + def.teaches, 1);
      const r = RECIPES.find((x) => x.id === def.teaches);
      this.hud.banner(ITEMS[r?.output ?? '']?.name ?? def.name, 'Recipe learned', true);
      this.hud.system(`You learn ${ITEMS[r?.output ?? '']?.name ?? 'the recipe'}: it's at any ${r ? STATION_NAMES[r.station].toLowerCase() : 'station'} now.`);
      this.sfx('discover');
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
    this.sfx('equip', 0.7);
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
    this.sfx('land', 0.45); // (it hits the ground)
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
      buyback: this.soldLately().map(({ id, n, price }) => ({ id, n, price })),
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
      this.inv.remove(view.currency.id, s.price);
      this.give(item, 1);
      this.sfx('coin');
      this.hud.refresh();
      return;
    }
    if (this.save.marks < s.price) return;
    if (ITEMS[item]?.mount && !this.inv.canAdd(item)) { this.hud.system('Your pack is full.'); return; }
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
    // On the buy-back list, with the last of the same sold at the same price if it's on top
    const list = this.soldLately(), top = list[0];
    if (top && top.id === st.id && top.price === price) { top.n++; top.at = Date.now(); } else list.unshift({ id: st.id, n: 1, price, at: Date.now() });
    this.setFlag('buyback', list.slice(0, Game.BUYBACK_MAX));
    this.sfx('coin');
    this.hud.refresh();
  }

  /** How many sales the traders remember, and for how long. */
  private static readonly BUYBACK_MAX = 12;
  private static readonly BUYBACK_MS = 24 * 3600_000;
  /** What you've sold lately, newest first (the 'buyback' flag), less anything a day old. */
  private soldLately(): { id: string; n: number; price: number; at: number }[] {
    const raw = this.flag('buyback');
    const now = Date.now();
    return (Array.isArray(raw) ? raw : [])
      .filter((e): e is { id: string; n: number; price: number; at: number } => !!e && typeof e.id === 'string' && !!ITEMS[e.id] && Number.isInteger(e.n) && e.n > 0 && typeof e.price === 'number' && typeof e.at === 'number')
      .filter((e) => now - e.at < Game.BUYBACK_MS)
      .map((e) => ({ ...e }));
  }
  /** Buy one back of something you sold, for what you got for it. */
  private buyBack(i: number): void {
    const list = this.soldLately(), e = list[i];
    if (!e) return;
    if (this.save.marks < e.price) { this.hud.system('You haven\'t the marks.'); return; }
    if (!this.inv.canAdd(e.id)) { this.hud.system('Your pack is full.'); return; }
    this.save.marks -= e.price;
    this.give(e.id, 1);
    if (--e.n <= 0) list.splice(i, 1);
    this.setFlag('buyback', list);
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
      const longer = [1, 1.25, 1.5][this.passive(def.buff.slot === 'food' ? 'ck_chef' : 'ck_brewer')];
      this.setFlag('buff:' + def.buff.slot, { id: best, left: def.buff.mins * 60 * longer });
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
  /** Is this recipe known? Most are from the start; a card teaches the rest (data/content/recipes.ts). */
  recipeKnown(id: string): boolean {
    const r = RECIPES.find((x) => x.id === id);
    return !!r && (!r.learn || !!this.flag('recipe:' + id));
  }
  /** Leanings researched, for weapons ('w') or armour ('a'). */
  leanings(kind: 'w' | 'a'): string[] {
    return (kind === 'w' ? WEAPON_LEANINGS : ARMOUR_LEANINGS).filter((a) => this.flag(`known:${kind}:${a}`));
  }
  /** A craft passive's rank (data/crafting.ts PASSIVES). */
  passive(id: string): number { return Number(this.flag('cpass:' + id) ?? 0); }
  /** What a recipe costs made this way: its inputs, the extra metal a better quality takes, a silver bar for Masterwork. */
  private craftCost(r: (typeof RECIPES)[number], o: CraftOpts): Record<string, number> {
    const cost = { ...r.inputs };
    const step = QUALITY_STEPS.find((x) => x.q === (o.q ?? 1)) ?? QUALITY_STEPS[0];
    if (step.extra) {
      const [main, n] = Object.entries(r.inputs).sort((a, b) => b[1] - a[1])[0];
      const thrift = [1, 2 / 3, 1 / 2][this.passive('sm_thrift')];
      cost[main] = n + Math.max(1, Math.ceil(n * step.extra * thrift));
    }
    if (step.silver) cost.silver_bar = (cost.silver_bar ?? 0) + step.silver;
    return cost;
  }
  /** What a recipe costs made this way (for the crafting window). */
  costOf(id: string, o: CraftOpts): Record<string, number> {
    const r = RECIPES.find((x) => x.id === id);
    return r ? this.craftCost(r, o) : {};
  }
  /** Why this recipe can't be made here and now, made this way (null: it can). */
  craftBlock(id: string, o: CraftOpts = {}): string | null {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) return 'No such recipe.';
    if (!this.recipeKnown(id)) return 'You don\'t know this recipe yet.';
    const lv = this.level(r.skill);
    if (lv < r.level) return `Needs ${SKILLS.find((k) => k.id === r.skill)!.name} ${r.level}.`;
    if (r.region) {
      const st = this.stationAt(r.station), here = regionAt(st.x, st.z).a;
      if (here !== r.region) return `Made only at an anvil in ${REGION_INFO[r.region].name}.`;
      if (this.leanings('a').length < (r.research ?? 0)) return `Needs ${r.research} armour leanings researched (you have ${this.leanings('a').length}).`;
    }
    const out = ITEMS[r.output];
    if (o.affix) {
      const kind = out?.weapon ? 'w' : out?.armor ? 'a' : null;
      if (!kind || !this.leanings(kind).includes(o.affix) || !affixFits(out, o.affix)) return 'That leaning can\'t go into this.';
    }
    const step = QUALITY_STEPS.find((x) => x.q === (o.q ?? 1));
    if (!step || ((o.q ?? 1) !== 1 && !(out?.weapon || out?.armor))) return 'No such quality.';
    if (lv < r.level + step.over) return `${step.word} needs ${SKILLS.find((k) => k.id === r.skill)!.name} ${r.level + step.over}.`;
    return null;
  }
  private startCraft(id: string, count: number, o: CraftOpts = {}): void {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) return;
    const why = this.craftBlock(id, o);
    if (why) { this.hud.system(why); return; }
    const cost = this.craftCost(r, o);
    const can = Math.min(...Object.entries(cost).map(([k, n]) => Math.floor(this.inv.count(k) / n)));
    if (can < 1) return;
    const q = o.q ?? 1, step = QUALITY_STEPS.find((x) => x.q === q)!;
    const out = o.affix || q !== 1 ? `${r.output}__${o.affix ?? ''}${q}` : r.output;
    // Experience: the recipe's colour for you (WoW's), more for a better piece or a leaning worked in
    const xp = Math.max(1, Math.round(r.xp * craftColour(this.level(r.skill), r.level).xp * step.xp * (o.affix ? 1.1 : 1)));
    const time = r.time / (r.station === 'bench' ? [1, 1.2, 1.33][this.passive('wc_quick')] : 1) / (1 + this.mastery('quick'));
    this.cancelActions();
    this.craftAction = { recipe: id, left: Math.min(count, can), t: 0, station: r.station, cost, out, xp, time };
    // The work starting: the hammer on the anvil, the furnace drawing, the pan going on, the saw at the bench
    this.sfx(r.station === 'anvil' ? 'anvil' : r.station === 'furnace' ? 'sizzle' : r.station === 'hearth' ? 'sizzle' : 'chop', 0.8);
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
    this.hud.setCast(`${ITEMS[c.out]?.name ?? ITEMS[r.output].name} (${c.left} left)`, c.t / c.time);
    if (c.t < c.time) return;
    c.t = 0;
    for (const [k, n] of Object.entries(c.cost)) this.inv.remove(k, n);
    let out = c.out;
    if (r.failAtReq !== undefined) {
      const fail = Math.max(0, r.failAtReq - (this.level(r.skill) - r.level) * 0.05) * [1, 2 / 3, 1 / 3][this.passive('ck_steady')];
      if (Math.random() < fail) out = r.failItem!;
    }
    if (out === c.out) {
      // The passives' extras: a second bar from the furnace, one more from the pot, a log left over at the bench
      const extra = (c.station === 'furnace' && Math.random() < [0, 0.1, 0.2][this.passive('sm_yield')]) || (c.station === 'hearth' && Math.random() < [0, 0.1, 0.2][this.passive('ck_plenty')]) ? 1 : 0;
      this.give(out, r.count + extra);
      if (extra) this.floatAt(this.player.position, 2.2, `+1 ${ITEMS[out].name}`, 'heal');
      if (c.station === 'bench' && Math.random() < [0, 1 / 6, 1 / 3][this.passive('wc_saw')]) { const log = Object.keys(c.cost).find((k) => k.endsWith('_logs')); if (log) this.give(log, 1); }
      this.addXp(r.skill, c.xp);
      if (c.station === 'furnace') this.particles.sparks(tmpV.set(st.x, st.y + 0.2, st.z), 16, '#ffd070');
    } else {
      this.give(out, 1);
      this.hud.system('You burnt it.');
      this.addXp(r.skill, Math.round(c.xp * 0.2));
    }
    c.left--;
    const can = Math.min(...Object.entries(c.cost).map(([k, n]) => Math.floor(this.inv.count(k) / n)));
    if (c.left <= 0 || can < 1) {
      this.craftAction = null;
      this.player.locked = false;
      this.hud.setCast(null);
    }
    this.hud.refresh();
  }

  // ---- Research: take a leaning piece apart at the anvil, and in a while its leaning is yours to work in
  /** What's being researched, by kind: each leaning and when it's done (ms, the realm's clock). */
  research(kind: 'w' | 'a'): { affix: string; until: number }[] {
    const v = this.flag('research:' + kind);
    return Array.isArray(v) ? (v as { affix: string; until: number }[]) : [];
  }
  /** Take a piece apart for its leaning: returns why not, or null. */
  takeApart(id: string): string | null {
    const def = ITEMS[id];
    if (!def?.affix || !(def.weapon || def.armor)) return 'Only a piece with a leaning teaches anything taken apart.';
    if (!this.inv.count(id)) return 'You don\'t have that.';
    const kind = def.weapon ? 'w' : 'a', what = kind === 'w' ? 'weapons' : 'armour';
    const name = AFFIXES[def.affix].word;
    if (this.leanings(kind).includes(def.affix)) return `You already know ${name} for ${what}.`;
    const now = this.research(kind);
    if (now.some((x) => x.affix === def.affix)) return `${name} is already being researched.`;
    const slots = this.passive('sm_bench') ? 2 : 1;
    if (now.length >= slots) return `You're already researching ${slots === 1 ? 'a leaning' : 'two leanings'} for ${what}. Quick Study and Two at the Bench (smithing passives) help.`;
    const mins = researchMinutes(this.leanings(kind).length) * [1, 0.75, 0.5][this.passive('sm_study')];
    this.inv.remove(id, 1);
    this.setFlag('research:' + kind, [...now, { affix: def.affix, until: realmNow() + mins * 60_000 }]);
    this.hud.system(`You take ${def.name} apart to see how it was made. ${name} for ${what} will be understood in ${Math.round(mins)} minutes, whether you're at the anvil or not.`);
    this.sfx('anvil');
    this.persist();
    return null;
  }
  /** Research that's finished becomes known (checked every few seconds). */
  private researchT = 0;
  private tickResearch(dt: number): void {
    this.researchT -= dt;
    if (this.researchT > 0) return;
    this.researchT = 3;
    for (const kind of ['w', 'a'] as const) {
      const now = this.research(kind), done = now.filter((x) => x.until <= realmNow());
      if (!done.length) continue;
      for (const d of done) {
        this.setFlag(`known:${kind}:${d.affix}`, 1);
        this.hud.banner(`${AFFIXES[d.affix].word} ${kind === 'w' ? 'weapons' : 'armour'}`, 'Research done: work it into what you smith', true);
        this.sfx('discover');
      }
      this.setFlag('research:' + kind, now.filter((x) => x.until > realmNow()));
      this.persist();
    }
  }
  /** Spend a craft point on a passive (data/crafting.ts): returns why not, or null. */
  learnPassive(id: string): string | null {
    const p = PASSIVE[id];
    if (!p) return 'No such passive.';
    const have = this.passive(id);
    if (have >= p.ranks) return 'Every rank learned.';
    const pts = craftPoints(this.level(p.craft)) - PASSIVES.filter((x) => x.craft === p.craft).reduce((n, x) => n + this.passive(x.id), 0);
    if (pts < 1) return `No ${SKILLS.find((k) => k.id === p.craft)!.name.toLowerCase()} points to spend: one comes every ten levels.`;
    this.setFlag('cpass:' + id, have + 1);
    this.sfx('levelUp', 0.5);
    this.persist();
    return null;
  }
  /** A craft's passives as the skills page shows them. */
  passivesOf(craft: SkillId): { points: number; list: { id: string; name: string; ranks: number; rank: number; desc: string[] }[] } {
    const list = PASSIVES.filter((x) => x.craft === craft);
    return { points: craftPoints(this.level(craft)) - list.reduce((n, x) => n + this.passive(x.id), 0), list: list.map((x) => ({ id: x.id, name: x.name, ranks: x.ranks, rank: this.passive(x.id), desc: x.desc })) };
  }
  /** What the crafting window needs beyond the recipes: known recipes, colours, leanings, research, pieces to take apart. */
  craftView() {
    const st = this.currentStation;
    const pos = st ? this.stationAt(st) : null;
    const kinds = (['w', 'a'] as const).map((kind) => ({
      kind, known: this.leanings(kind),
      researching: this.research(kind).map((x) => ({ affix: x.affix, word: AFFIXES[x.affix].word, mins: Math.max(0, Math.ceil((x.until - realmNow()) / 60_000)) })),
      slots: this.passive('sm_bench') ? 2 : 1,
    }));
    const apart = [...new Set(this.save.inv.filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.id))]
      .filter((id) => ITEMS[id]?.affix && (ITEMS[id].weapon || ITEMS[id].armor))
      .map((id) => ({ id, name: ITEMS[id].name, kind: (ITEMS[id].weapon ? 'w' : 'a') as 'w' | 'a', affix: ITEMS[id].affix!, word: AFFIXES[ITEMS[id].affix!].word, known: this.leanings(ITEMS[id].weapon ? 'w' : 'a').includes(ITEMS[id].affix!) }));
    return {
      region: pos ? regionAt(pos.x, pos.z).a : null,
      kinds, apart,
      recipes: Object.fromEntries(RECIPES.filter((r) => r.station === st).map((r) => {
        const c = craftColour(this.level(r.skill), r.level);
        return [r.id, { known: this.recipeKnown(r.id), colour: c.colour, word: COLOUR_WORD[c.colour], xp: Math.max(1, Math.round(r.xp * c.xp)), block: this.craftBlock(r.id) }];
      })),
    };
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

  /** Who says a line spoken by somebody else in the scene (DNode.as): a companion, or another person. */
  private whoIs(id: string): { name: string; title: string; look: Appearance } | null {
    const c = COMPANIONS[id as CompanionId];
    if (c) return { name: c.name, title: c.title, look: c.look as Appearance };
    const n = this.npcs.find((x) => x.def.id === id);
    return n ? { name: n.def.name, title: n.def.title, look: n.def.look } : null;
  }

  private renderNode(node: DNode): void {
    const d = this.dialogue!;
    const who = node.as ? this.whoIs(node.as) : null;
    this.hud.showDialogue({
      speaker: who?.name ?? d.npc.def.name,
      title: who?.title ?? d.npc.def.title,
      text: d.text ?? (typeof node.text === 'function' ? node.text(this) : node.text),
      narrator: node.speaker === 'narrator',
      look: who?.look ?? d.npc.def.look,
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
    const hidden = this.questHidden(), focus = this.questFocus();
    for (const [id, stage] of Object.entries(this.save.quests)) {
      const def = QUESTS[id];
      if (!def) continue;
      const objs = def.objectives(this, stage).map((o) => {
        const p = o.marker ? this.markerPos(o.marker) : null;
        return { text: o.text, done: o.done, dist: p ? Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) : undefined };
      });
      if (id === 'fordBell' && stage === 'casting' && this.casting) objs[0].text = `Wait while Bram pours the bell (${Math.ceil(this.casting.dur - this.casting.t)}s)`;
      const done = stage === 'done';
      out.push({
        id, name: def.story ? `${ROMAN[def.story.chapter]}. ${def.name}` : def.name, notes: def.notes(this, stage), objectives: objs, done, story: !!def.story,
        tracked: !hidden.includes(id), focus: focus === id, canAbandon: !done && !def.story, onMap: !done && !!this.questWhere(id),
      });
    }
    // Breadcrumbs: where a new character starts, and where the main story starts once they've found their feet
    const lead = (id: string, name: string, notes: string, text: string, marker: string, story = false) => {
      const p = this.markerPos(marker);
      out.unshift({ id, name, notes, objectives: [{ text, dist: p ? Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) : undefined }], done: false, story });
    };
    if (!this.stage('fordBell')) lead('lead:hollin', 'Hollin Ford', 'The reeve runs the village from the square. If anyone needs a hand, she\'ll know.', 'Talk to Maud Ashby, the reeve, in the square', 'maud');
    else if (this.stage('fordBell') === 'done' && !this.stage('storyNotice')) lead('lead:story', 'The Charter\'s Debt', 'Everyone on the road is talking about a notice the Charter has posted by Ansbury\'s south gate.', 'Read the Charter notice by Ansbury\'s south gate', 'charterNotice', true);
    // The focused quest leads the list (and so the tracker), ahead of the breadcrumbs
    out.sort((a, b) => Number(!!b.focus) - Number(!!a.focus));
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

  /** Quests taken off the tracker and the map in the journal (Track), and the one put first (Focus). */
  private questHidden(): string[] { return (this.flag('qHidden') as string[] | undefined) ?? []; }
  private questFocus(): string | undefined { return (this.flag('qFocus') as string | undefined) || undefined; }

  /** Where a quest's next objective is, if it points anywhere. */
  private questWhere(id: string): THREE.Vector3 | null {
    const def = QUESTS[id], stage = this.save.quests[id];
    if (!def || !stage || stage === 'done') return null;
    for (const o of def.objectives(this, stage)) if (o.marker && !o.done) { const p = this.markerPos(o.marker); if (p) return p; }
    return null;
  }

  /** Journal: show a quest on the tracker and the map, or hide it. Hiding the focused quest unfocuses it. */
  trackQuest(id: string, on: boolean): void {
    const hidden = this.questHidden().filter((q) => q !== id);
    if (!on) hidden.push(id);
    this.setFlag('qHidden', hidden);
    if (!on && this.questFocus() === id) this.setFlag('qFocus', '');
    this.hud.setTracker(this.questEntries());
    this.sfx('click');
  }

  /** Journal: put one quest first on the tracker, its objectives marked brighter on the map (or none). */
  focusQuest(id: string | null): void {
    this.setFlag('qFocus', id ?? '');
    if (id) this.setFlag('qHidden', this.questHidden().filter((q) => q !== id));
    this.hud.setTracker(this.questEntries());
    this.sfx('click');
  }

  /** Journal: open the map on where a quest points next. */
  showQuestOnMap(id: string): void {
    const p = this.questWhere(id);
    if (!p) { this.hud.system('That quest doesn\'t point anywhere on the map just now.'); return; }
    this.hud.showOnMap(p.x, p.z);
  }

  /**
   * Journal: give up a side quest. Its stage and its own bookkeeping (the counts it started from, a choice
   * half-made) go; what you did in the world stays done, and whoever gave it will offer it again.
   * The main story can't be abandoned.
   */
  abandonQuest(id: string): void {
    const def = QUESTS[id], stage = this.save.quests[id];
    if (!def || def.story || !stage || stage === 'done') return;
    delete this.save.quests[id];
    for (const k of Object.keys(this.save.flags)) if (k === id || k.startsWith(id + ':')) delete this.save.flags[k];
    this.setFlag('qHidden', this.questHidden().filter((q) => q !== id));
    if (this.questFocus() === id) this.setFlag('qFocus', '');
    this.hud.system(`Abandoned: ${def.name}. Whoever gave you it will offer it again.`);
    this.hud.setTracker(this.questEntries());
    this.sfx('click');
    this.persist();
  }

  /** Where the journal's objectives point (not the quests you've hidden), and (giver) the people with a quest to offer. */
  private questMarkers(): { p: THREE.Vector3; giver?: boolean; label?: string; sub?: string; focus?: boolean }[] {
    const out: { p: THREE.Vector3; giver?: boolean; label?: string; sub?: string; focus?: boolean }[] = [];
    const hidden = this.questHidden(), focus = this.questFocus();
    for (const [id, stage] of Object.entries(this.save.quests)) {
      const def = QUESTS[id];
      if (!def || hidden.includes(id)) continue;
      for (const o of def.objectives(this, stage)) if (o.marker && !o.done) { const p = this.markerPos(o.marker); if (p) out.push({ p, label: def.name, sub: o.text, focus: focus === id }); }
    }
    if (!this.stage('fordBell')) { const m = this.npcs.find((n) => n.id === 'maud'); if (m) out.push({ p: m.pos, label: 'Hollin Ford', sub: 'Talk to Maud Ashby, the reeve' }); }
    else if (this.stage('fordBell') === 'done' && !this.stage('storyNotice')) { const p = this.markerPos('charterNotice'); if (p) out.push({ p, label: "The Charter's Debt", sub: "Read the notice by Ansbury's south gate" }); }
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
    // Your companion: talk to them
    if (this.companions.active && this.companions.body && !this.horse) {
      const b = this.companions.body, d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
      const id = this.companions.active;
      if (d < 2.8) consider({ kind: 'act', label: `Talk to ${COMPANIONS[id].name.split(' ')[0]}`, pos: b.pos.clone().setY(b.pos.y + 1.8), act: () => this.talkToCompanion(id) }, d + 0.3);
    }
    // An altar: kneel and pray, to unlearn or change build (the talent screen, in the temple's light)
    if (!this.horse) for (const t of this.temples()) {
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      if (d < 3.2 && Math.abs(t.y - p.y) < 3) consider({ kind: 'act', label: 'Pray at the altar', pos: new THREE.Vector3(t.x, t.y + 1, t.z), act: () => this.pray() }, d);
    }
    // Someone down: kneel and help them up
    if (!this.horse && !this.reviving) for (const r of this.online.remotes.values()) {
      if (r.anim !== 'dead') continue;
      const at = r.model.root.position, d = Math.hypot(at.x - p.x, at.z - p.z);
      if (d < 2.6 && Math.abs(at.y - p.y) < 2) consider({ kind: 'act', label: `Help ${r.name} up`, pos: at.clone().setY(at.y + 0.6), act: () => this.startRevive(r.id, r.name) }, d);
    }
    // Someone in your group on a mount with a seat free: behind the saddle, or in the back of the wagon
    // (and anyone at all on the Post: the carter doesn't mind company, and a bench is a bench)
    if (!this.horse && this.pillion === null && !this.post.active) {
      for (const r of this.online.remotes.values()) {
        const rm = mountOf(r.mount), post = r.mount === POST_CART_KEY;
        if (!rm || !spareSeats(rm) || (!post && !this.social.group?.members.some((m) => m.id === r.id))) continue;
        if (this.online.passengers(r.id).length >= spareSeats(rm) - (post ? 1 : 0)) continue;
        const at = r.horse?.root.position ?? r.model.root.position, back = rm.wagon ? 1.3 : 0;
        const d = Math.hypot(at.x - Math.sin(r.model.root.rotation.y) * back - p.x, at.z - Math.cos(r.model.root.rotation.y) * back - p.z);
        if (d < (rm.wagon ? 3.2 : 3)) consider({ kind: 'act', label: post ? `Climb onto the Post cart with ${r.name}` : rm.wagon ? `Climb into ${r.name}'s wagon` : `Ride behind ${r.name}`, pos: at.clone(), act: () => this.takePillion(r.id, r.name) }, d);
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
    // A bench, chair or stool to sit on: the nearest place along it, facing out from the side you're on
    if (!this.horse && !this.seated && !this.player.swimming) {
      let best: { x: number; y: number; z: number; yaw: number } | null = null, bd = 1.9;
      for (const st of this.seats) {
        if (Math.abs(st.y - p.y) > 1.2 || Math.abs(st.x - p.x) > 4 || Math.abs(st.z - p.z) > 4) continue;
        const ax = Math.cos(st.ry), az = -Math.sin(st.ry), nx = Math.sin(st.ry), nz = Math.cos(st.ry);
        const along = THREE.MathUtils.clamp((p.x - st.x) * ax + (p.z - st.z) * az, -st.half, st.half);
        const side = st.both && (p.x - st.x) * nx + (p.z - st.z) * nz < 0 ? -1 : 1;
        const sx = st.x + ax * along, sz = st.z + az * along, dd = Math.hypot(sx - p.x, sz - p.z);
        if (dd < bd) { bd = dd; best = { x: sx, y: st.y, z: sz, yaw: Math.atan2(nx * side, nz * side) }; }
      }
      if (best) { const b = best; consider({ kind: 'act', label: 'Sit', pos: new THREE.Vector3(b.x, b.y + 0.7, b.z), act: () => this.sitDown(b) }, bd + 0.4); }
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
    for (const it of this.world.structures.interactables) {
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
    for (const c of this.fair.candidates(p)) consider({ kind: 'act', label: c.label, pos: c.pos, act: c.use }, Math.hypot(c.pos.x - p.x, c.pos.z - p.z));
    for (const c of this.farming.candidates(p)) consider({ kind: 'act', label: c.label, pos: c.pos, act: c.use, warn: c.warn }, Math.hypot(c.pos.x - p.x, c.pos.z - p.z) - 0.5);
    // On the post cart: get off whenever you like
    if (this.post.active) { const st = this.post.seat(); consider({ kind: 'act', label: 'Get off the cart', pos: new THREE.Vector3(st.x, st.y + 1.6, st.z), act: () => this.endRide(false) }, 0.05); }
    // The rowing boat: step out of her, climb into her, take her up, or launch her (game/Rowboat.ts)
    {
      const b = this.boat;
      if (b.aboard) {
        const to = b.shore();
        if (to) consider({ kind: 'act', label: 'Step ashore', pos: to.clone().setY(to.y + 0.6), act: () => this.leaveBoat(to) }, 0.1);
      } else {
        const d = b.afloat ? Math.hypot(b.pos.x - p.x, b.pos.z - p.z) : Infinity;
        if (d < 3) {
          consider({ kind: 'act', label: b.hired ? 'Climb into the hired boat' : 'Climb into your boat', pos: b.pos.clone().setY(b.pos.y + 0.8), act: () => this.boardBoat() }, d);
          if (!b.hired) consider({ kind: 'act', label: 'Haul your boat out', pos: b.pos.clone().setY(b.pos.y + 0.5), act: () => { b.stow(); this.hud.system('You haul her out and stow her.'); } }, d + 0.3);
        } else if (this.inv.count('rowboat') > 0 && !this.horse) {
          const at = b.launchSpot(p);
          if (at) consider({ kind: 'act', label: 'Launch your rowing boat', pos: new THREE.Vector3(at.x, at.surf + 0.6, at.z), act: () => { b.launch(at.x, at.z, at.surf, at.yaw, false); this.boardBoat(); } }, 2.5);
        }
      }
    }
    // Your ship: step ashore when she's alongside, take her helm again when she's moored and you're by her
    {
      const sh = this.sailing.mine;
      if (sh && this.sailing.atHelm && sh.sinking < 0) {
        const to = this.shipShore();
        if (to) consider({ kind: 'act', label: 'Step ashore', pos: to.clone().setY(to.y + 0.6), act: () => this.leaveHelm(to) }, 0.1);
      } else if (sh && !this.sailing.atHelm && sh.sinking < 0) {
        const d = Math.hypot(sh.pos.x - p.x, sh.pos.z - p.z);
        if (d < sh.hull.len * 0.5 + 5 && p.y > SEA - 1) consider({ kind: 'act', label: `Take the helm of the ${sh.livery.name}`, pos: sh.helm(new THREE.Vector3()).setY(p.y + 1), act: () => this.takeHelm() }, Math.max(0.5, d - sh.hull.len * 0.4));
      }
      // Below, to her cabin, from by the helm (yours, not a hired one: the yard keeps its cabins locked)
      const own = this.myShips()[Number(this.flag('shipOut') ?? -1)];
      if (sh && own && sh.sinking < 0 && p.y > SEA) {
        const hm = sh.helm(new THREE.Vector3()), d = Math.hypot(hm.x - p.x, hm.z - p.z);
        if (d < 3.2) consider({ kind: 'act', label: `Go below to ${CABINS[own.hull].name}`, pos: hm.clone().setY(p.y + 1), act: () => { const berth = BERTHS.slice().sort((a, b) => Math.hypot(a.x - sh.pos.x, a.z - sh.pos.z) - Math.hypot(b.x - sh.pos.x, b.z - sh.pos.z))[0]; this.goBelow(own.hull, this.shoreNear(berth.x, berth.z)); } }, 1.2 + d * 0.3);
      }
    }
    // In her cabin: up the ladder, into the cot, into the sea chest
    {
      const hull = cabinAt(p.x, p.y, p.z);
      if (hull) {
        const fx = cabinFixtures(hull), near = (q: { x: number; z: number }) => Math.hypot(q.x - p.x, q.z - p.z);
        if (near(fx.ladder) < 2.6) consider({ kind: 'act', label: 'Go up on deck', pos: new THREE.Vector3(fx.ladder.x, CABIN_BASE + 1.6, fx.ladder.z), act: () => this.goUp() }, near(fx.ladder) * 0.4);
        if (this.cabinHull() === hull) {
          if (near(fx.cot) < 2.6) consider({ kind: 'act', label: 'Sleep in your cot', pos: new THREE.Vector3(fx.cot.x, CABIN_BASE + 1, fx.cot.z), act: () => this.sleep() }, near(fx.cot) * 0.3);
          if (near(fx.chest) < 2.6) consider({ kind: 'act', label: 'Open your sea chest', sub: 'Your bank, aboard', pos: new THREE.Vector3(fx.chest.x, CABIN_BASE + 1, fx.chest.z), act: () => { this.hud.closeAll(); void this.bank.show('Sea chest', fx.chest.x, fx.chest.z); } }, near(fx.chest) * 0.4);
        }
      }
    }
    // A parcel waiting: collect it at any post box
    if (this.parcel.length) for (const pt of POSTS) {
      const b = postBoxOf(pt), d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < 2.4) consider({ kind: 'act', label: `Collect your parcel (${this.parcel.reduce((a, x) => a + x.n, 0)})`, pos: new THREE.Vector3(b.x, p.y + 1.4, b.z), act: () => this.collectParcel() }, d - 0.2);
    }
    // A pedlar on the road: they stop for you, and open their pack
    for (const pd of this.roadfolk.pedlarsNear(p, 3.4)) consider({ kind: 'act', label: `Trade with ${pd.name}`, sub: pd.title, pos: new THREE.Vector3(pd.pos.x, pd.pos.y + 1, pd.pos.z), act: () => this.openPedlar(pd.id) }, Math.hypot(pd.pos.x - p.x, pd.pos.z - p.z));
    const H = this.homeHere;
    const bed = !H.active && H.bed();
    if (bed && H.inside(p) && Math.abs(bed.y - p.y) < 2) consider({ kind: 'act', label: 'Sleep in your bed', pos: new THREE.Vector3(bed.x, bed.y + 1, bed.z), act: () => this.sleep() }, Math.hypot(bed.x - p.x, bed.z - p.z) * 0.3);
    // Someone else's house: knock, and if they're in the world they're asked to let you in
    if (this.homesBook && !this.home.visiting) for (const [id, h] of this.homesBook) {
      const lt = LOT_BY_ID.get(id), vl = VILLA_BY_ID.get(id);
      const cx = lt ? lt.x0 + 7 : vl ? vl.x0 + vl.w / 2 : COTTAGE.x0 + 4, cz = lt ? lt.z0 + 6 : vl ? vl.z0 + vl.d / 2 : COTTAGE.z0 + 4;
      if (Math.abs(cx - p.x) > 16 || Math.abs(cz - p.z) > 16) continue;
      const at = this.homeDoorOutside(id, h);
      if (!at || id === this.myHomeId()) continue;
      const d = Math.hypot(at.x - p.x, at.z - p.z);
      if (d < 2.4 && Math.abs(at.y - p.y) < 3) consider({ kind: 'act', label: `Knock at ${h.owner}'s door`, pos: new THREE.Vector3(at.x, at.y + 1.4, at.z), act: () => { this.online.homeAsk(h.owner); this.sfx('click'); } }, d);
    }
    // At a gate on the Mirador: a house for sale to buy (the door stands open to look round first), or yours to sell back
    for (const v of VILLAS) {
      if (!v.id || Math.abs(v.x0 - p.x) > 20 || Math.abs(v.z0 - p.z) > 20) continue;
      const g = villaGate(v), d = Math.hypot(g.x - p.x, g.z - p.z);
      if (d > 2.6 || Math.abs(v.base - p.y) > 3) continue;
      const name = this.homeName(v.id);
      if (this.myHomeId() === v.id) consider({ kind: 'act', label: `Sell ${v.name} back (${Math.round(v.price * VILLA_RESALE).toLocaleString()} marks)`, pos: new THREE.Vector3(g.x, v.base + 1.4, g.z), act: () => this.sellVilla() }, d + 0.5);
      else if (!this.homesBook?.get(v.id)) consider({ kind: 'act', label: `Buy ${v.name}`, sub: `For sale, ${v.price.toLocaleString()} marks`, pos: new THREE.Vector3(g.x, v.base + 1.4, g.z), act: () => this.buyVilla(v.id!) }, d);
      else consider({ kind: 'act', label: name, sub: `${this.homesBook.get(v.id)!.owner}'s house`, pos: new THREE.Vector3(g.x, v.base + 1.4, g.z), act: () => this.hud.system(`${name}: ${this.homesBook!.get(v.id!)!.owner}'s house. Knock at the door if you'd like to be let in.`) }, d + 0.5);
    }
    // Stalls at the lots' gates: put one up at yours and mind it; browse anyone else's
    {
      const pl = readPlot(this.flag('plot')), mineLot = pl ? LOT_BY_ID.get(pl.lot) : undefined;
      if (mineLot) {
        const st = stallAt(mineLot), d = Math.hypot(st.x - p.x, st.z - p.z);
        if (d < 3 && Math.abs(mineLot.base - p.y) < 3) consider(this.flag('stall')
          ? { kind: 'act', label: 'Mind your stall', pos: new THREE.Vector3(st.x, mineLot.base + 1.4, st.z), act: () => this.openStall(mineLot.id, this.save.name, true) }
          : { kind: 'act', label: 'Put up a stall at your gate', pos: new THREE.Vector3(st.x, mineLot.base + 1.4, st.z), act: () => this.stallUp() }, d);
      }
      if (this.homesBook) for (const [id, h] of this.homesBook) {
        if (!h.stall || id === pl?.lot) continue;
        const lt = LOT_BY_ID.get(id);
        if (!lt || Math.abs(lt.x0 + 7 - p.x) > 16 || Math.abs(lt.z0 + 6 - p.z) > 16) continue;
        const st = stallAt(lt), d = Math.hypot(st.x - p.x, st.z - p.z);
        if (d < 3 && Math.abs(lt.base - p.y) < 3) consider({ kind: 'act', label: `Browse ${h.owner}'s stall`, pos: new THREE.Vector3(st.x, lt.base + 1.4, st.z), act: () => this.openStall(id, h.owner, false) }, d);
      }
    }
    // On your own lot: lay blocks and dig them out by hand
    if (!this.lotBuild.active && !this.home.active && this.lotBuild.onLot(p)) consider({ kind: 'act', label: 'Build on your lot', pos: new THREE.Vector3(p.x, p.y + 1, p.z), act: () => { this.hud.closeAll(); this.lotBuild.start(); } }, 2.2);
    // Stations of your own at home: a bench, a range, an anvil, a forge, each works like the town's
    if (!H.active && !H.visiting && H.owned) {
      const h = H.where();
      if (h) for (const [item, x, z, , f] of H.pieces()) {
        const st = HOME_STATIONS[item];
        if (!st) continue;
        const y = h.base + (f ?? 0) * 4, d = Math.hypot(x - p.x, z - p.z);
        if (d < 2.2 && Math.abs(y - p.y) < 2) consider({ kind: 'act', label: st.label, pos: new THREE.Vector3(x, y + 1, z), act: () => this.openCrafting(st.station, { x, y, z }) }, d);
      }
    }
    // Indoors at home: arrange the furniture from anywhere in the house
    if (!H.active && !H.visiting && H.owned && H.inside(p)) consider({ kind: 'act', label: 'Arrange the furniture', pos: new THREE.Vector3(p.x, p.y + 1, p.z), act: () => this.arrangeHome() }, 1.6);
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
    // A ferry's timetable, on the board at her jetty's landward end
    for (const ship of this.world.ferries) ship.plan.piers.forEach((pl, k) => {
      const d = Math.hypot(pl.from[0] + 0.5 - p.x, pl.from[1] + 0.5 - p.z);
      if (d < 4 && Math.abs(SEA + 1 - p.y) < 3) consider({ kind: 'act', label: `Read ${ship.route.ship}'s timetable`, pos: new THREE.Vector3(pl.from[0] + 0.5, SEA + 2.4, pl.from[1] + 0.5), act: () => this.readTimetable(ship, k) }, d + 0.5);
    });
    // In your guild's hall: what its wings are for
    {
      const hall = this.myHall(), built = new Set(this.hallView?.built ?? []);
      if (hall && inHall(hall, p.x, p.z)) {
        const at = (q: { x: number; y: number; z: number }, r: number) => { const d = Math.hypot(q.x - p.x, q.z - p.z); return d < r && Math.abs(q.y - p.y) < 2.5 ? d : -1; };
        const t = hallTable(hall), c = hallCounter(hall), m = hallMaps(hall);
        let d = at(t, 3.6);
        if (built.has('table') && d >= 0) consider({ kind: 'act', label: 'Sit down to supper in hall', pos: new THREE.Vector3(t.x, t.y + 1, t.z), act: () => this.hallSupper() }, d);
        if (built.has('forge')) for (const ws of forgeStations(hall)) { d = at(ws, 2.2); if (d >= 0) consider({ kind: 'act', label: ws.label, pos: new THREE.Vector3(ws.x, ws.y + 0.6, ws.z), act: () => this.openCrafting(ws.station, ws) }, d); }
        d = at(c, 2.6);
        if (built.has('counting') && d >= 0) consider({ kind: 'act', label: 'The counting room: your bank and the guild vault', pos: new THREE.Vector3(c.x, c.y + 1, c.z), act: () => { this.hud.closeAll(); void this.bank.show('The counting room', c.x, c.z); } }, d);
        d = at(m, 2.6);
        if (built.has('maproom') && d >= 0) consider({ kind: 'act', label: 'The map room: the Charter Post at half fare', pos: new THREE.Vector3(m.x, m.y + 1, m.z), act: () => { this.openTravel('aldermere'); this.hallFare = true; this.hud.refresh('travel'); } }, d);
      }
    }
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
      questsDone: Object.values(this.save.quests).filter((v) => v === 'done').length,
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
    // Fighting means a hit given or taken lately, or something hostile after you: not a swing at the air
    if (this.inCombat()) { this.hud.system('Not while you\'re fighting.'); return; }
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

  /** Kneel at an altar: the talent screen opens, where unlearning and builds can be done here. */
  private pray(): void {
    this.cancelActions();
    this.emote = { id: 'kneel', left: 4 } as typeof this.emote;
    this.hud.show('talents');
    this.hud.system('You kneel at the altar. Here you can unlearn your talents, skills and morphs, or change to a saved build.');
    this.sfx('bell', 0.4);
  }

  /** Kneeling by someone who's down, helping them up: who, and how long you've been at it. */
  private reviving: { id: number; name: string; t: number } | null = null;
  /** Your companion (game/Companions.ts). */
  private companions!: Companions;

  // ---- Companions: what their conversations can ask of the game (api.ts)
  compJoin(id: string): void { if (COMPANIONS[id as CompanionId]) { this.companions.join(id as CompanionId); this.persist(); } }
  compDismiss(): void { this.companions.dismiss(); this.persist(); }
  compLeave(id: string): void { this.companions.leave(id as CompanionId); this.persist(); }
  compRapport(id: string, delta: number): void { this.companions.addRapport(id as CompanionId, delta); }
  compActive(): string | null { return this.companions?.active ?? null; }
  compNear(x: number, z: number, r: number): boolean { return Math.hypot(this.player.position.x - x, this.player.position.z - z) < r; }
  compHour(): number { return this.world.sky.hour; }
  compOutfit(id: string, outfit: string): void { this.setFlag(`comp:${id}:outfit`, outfit); this.companions.refresh(); this.persist(); }
  compRole(id: string, role: string): void { if (COMPANIONS[id as CompanionId]?.roles.includes(role as CompanionRole)) { this.setFlag(`comp:${id}:role`, role); this.companions.refresh(); this.persist(); } }
  compStory(id: string, part: number): void {
    const c = COMPANIONS[id as CompanionId];
    if (!c) return;
    const names: Record<string, string[]> = { wenna: ['', '', 'Six Barrels', 'The Gate Book'], ottilie: ['', '', 'The Thirtieth Name', 'A True Measure'], tam: ['', '', 'The Kittiwake\'s Man', 'Clean Hands'] };
    this.hud.banner(names[id]?.[part] ?? c.name, `${c.name} · their story, part ${part === 2 ? 'two' : 'three'}`, true);
    this.sfx('quest');
    this.persist();
  }
  /** Talk to the companion beside you: their conversation, the way you'd talk to anyone. */
  private talkToCompanion(id: CompanionId): void {
    const npc = this.npcs.find((n) => n.def.id === 'comp_' + id), body = this.companions.body;
    if (!npc || !body) return;
    npc.pos.copy(body.pos);
    this.startDialogue(npc);
  }
  private startRevive(id: number, name: string): void {
    if (this.dead || this.horse || this.inCombat()) { if (this.inCombat()) this.hud.system('Not while you\'re fighting.'); return; }
    this.cancelActions();
    this.reviving = { id, name, t: 0 };
  }
  /** Each frame while helping: three seconds, broken off by moving, a blow, or them getting up or going. */
  private keepReviving(dt: number, moving: boolean): void {
    const rv = this.reviving;
    if (!rv) return;
    const r = this.online.remotes.get(rv.id);
    const p = this.player.position;
    if (!r || r.anim !== 'dead' || moving || this.dead || this.horse || this.elapsed - this.lastCombat < 0.3 || Math.hypot(r.model.root.position.x - p.x, r.model.root.position.z - p.z) > 3.2) {
      this.reviving = null; this.hud.setCast(null); return;
    }
    // Face them while you work
    this.player.yaw = Math.atan2(r.model.root.position.x - p.x, r.model.root.position.z - p.z);
    rv.t += dt;
    this.hud.setCast(`Helping ${rv.name} up`, rv.t / 3);
    if (rv.t >= 3) {
      this.online.revive(rv.id);
      this.companions.event('revive');
      this.hud.system(`You help ${rv.name} to their feet.`);
      this.reviving = null; this.hud.setCast(null);
    }
  }

  /** Sit on a seat: held there until you move or jump (the same way a pillion rider is). */
  private sitDown(at: { x: number; y: number; z: number; yaw: number }): void {
    if (this.horse || this.dead || this.inCombat()) return;
    this.cancelActions();
    this.seated = { ...at };
    this.sfx('seat');
  }
  private standUp(): void {
    const s = this.seated;
    if (!s) return;
    this.seated = null;
    this.sfx('cloth', 0.8);
    // Up and a step forward, clear of the seat
    this.player.position.set(s.x + Math.sin(s.yaw) * 0.85, s.y + 0.05, s.z + Math.cos(s.yaw) * 0.85);
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
    else if (i === 1 && !this.kit.secondSkill) this.cleave();
    else if (i <= 7) {
      if (this.dash) return;
      // Mid-swing: once the blow has landed the follow-through is cut short for the skill; before
      // that, the skill waits for the blow and goes the instant it lands
      if (this.attack) {
        if (!this.attack.hit) { this.queuedSkill = i; return; }
        this.attack = null;
      }
      this.cancelActions();
      if (i > 2) {
        const sk = this.kit.bar[i - 3];
        if (sk && !this.skillUnlocked(sk.id)) { this.hud.system(`${sk.name} isn't unlocked yet: spend a skill point on it in your skills (T).`); this.sfx('fail'); return; }
      }
      // Paid in stamina or magicka (data/combat.ts), only when it goes off
      const cost = this.skillCost(i);
      if (!this.canPay(cost)) {
        if (this.elapsed - this.shortAt > 1.2) { this.shortAt = this.elapsed; this.hud.system(`Not enough ${cost!.pool} for that.`); this.sfx('fail'); }
        return;
      }
      const ok = i === 1 ? this.kit.useSecond() : i === 2 ? this.kit.useWeapon() : this.kit.use(i - 3);
      // The skill's own sound, by its school (data/skillSchools.ts), when it actually goes off
      if (ok) { const id = i === 1 ? this.kit.secondSkill?.id : i === 2 ? this.kit.weaponSkill.id : this.kit.bar[i - 3]?.id; const school = id ? SKILL_SCHOOL[id] : undefined; if (school) this.audio.skillCast(school); }
      if (ok && i > 2 && this.kit.bar[i - 3]?.id === 'attune') this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill);
      if (ok) {
        this.cds.strike = Math.max(this.cds.strike, TUNE.skillLock); this.comboWindow = 0;
        if (cost) {
          if (cost.pool === 'stamina') this.energy = Math.max(0, this.energy - cost.n);
          else if (cost.pool === 'health') { const rest = this.kit.payBlood(cost.n / 100); if (rest > 0) this.hp = Math.max(1, this.hp - Math.round(rest * this.maxHp)); }
          else this.magicka = Math.max(0, this.magicka - cost.n);
        }
      }
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
      // The foe you're looking at first: nearest and most in front of the camera (targetOrder), within reach;
      // failing that, whatever's nearest
      best = this.targetOrder().find((e) => e.pos.distanceTo(this.player.position) < range) ?? null;
      if (!best) {
        let bd = range;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const d = e.pos.distanceTo(this.player.position);
          if (d < bd) { bd = d; best = e; }
        }
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
    const at = this.faceTarget(this.player.swimming ? 6 : MELEE_REACH);
    if (at) this.autoFoe = at;
    // A few blocks off: close the gap in a quick lunge, so a swing never whiffs at the air in front of you
    const lunge = at && this.lungeTo(at);
    if (lunge) { this.dash = lunge; this.particles.dust(this.player.position, 4); }
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
  }

  /** Where a Strike's lunge would carry you to reach this foe, if it's a few blocks off over open, level-enough ground. */
  private lungeTo(at: Enemy): { fx: number; fy: number; fz: number; tx: number; tz: number; ty: number; t: number; dur: number } | null {
    if (this.player.swimming || this.horse || !this.player.onGround) return null;
    const P0 = this.player.position, dx = at.pos.x - P0.x, dz = at.pos.z - P0.z, d = Math.hypot(dx, dz);
    const stop = 1.3 + (at.def.elite ? 0.5 : 0);
    if (d <= 2.4 || d > MELEE_REACH || Math.abs(at.pos.y - P0.y) > 1.6) return null;
    const k = (d - stop) / d, tx = P0.x + dx * k, tz = P0.z + dz * k;
    const ty = this.world.voxels.groundBelow(tx, P0.y + 2, tz);
    if (Math.abs(ty - P0.y) >= 1.6 || this.world.voxels.raycast(P0.x, P0.y + 1, P0.z, dx / d, 0, dz / d, d - stop)) return null;
    return { fx: P0.x, fy: P0.y, fz: P0.z, tx, tz, ty, t: 0, dur: 0.14 };
  }

  /** A bow's Strike: an arrow at the target, up to twenty-four blocks off, a little slower than a swing. */
  private loose(): void {
    if (this.cds.strike > 0) return;
    const e = this.faceTarget(24);
    if (!e) { this.hud.system('Nothing in range to shoot at: target something (Tab) within twenty-four blocks.'); this.cds.strike = 0.6; return; }
    this.autoFoe = e;
    const dur = 0.62 / this.pace;
    this.cds.strike = dur;
    this.player.model.setState('shoot');
    this.player.model.stateTime = 0;
    const crit = Math.random() < 0.08 + (this.blade?.crit ?? 0) + this.armour.crit + this.mastery('keen');
    this.kit.loose(e, this.swingPower() * (0.9 + Math.random() * 0.2), crit);
    this.sfx('swing', 1.6);
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
  }

  /** An ordinary swing's damage at this level with this weapon, before the roll and crits. */
  private swingPower(): number {
    const lvl = this.level('melee');
    return (7 + lvl * 1.45 + (this.blade?.damage ?? 0)) * (1 + (lvl - 1) * 0.02) * (1 + this.buffSum('power')) * (1 + this.mastery('edge'));
  }

  /** A foe that's turned on one of a Gravecaller's raised dead goes for it instead of you (ClassKit.drawnTo). */
  private raisedCtx(e: Enemy, base: EnemyContext): EnemyContext | null {
    const b = this.kit.drawnTo(e);
    if (!b) return null;
    return { ...base, player: b.pos, playerAlive: true, playerInvulnerable: false, playerSwimming: false, hitPlayer: (d: number) => this.kit.hurtRaised(b, d) };
  }

  /** When a guard's shield last said so (once a second or so, not every blow). */
  private guardSaid = -9;

  /** What a foe did this frame besides its blows (stage F): a heal, a call, a boss's words, a full stagger. */
  private foeDid(e: Enemy): void {
    const P = this.player.position;
    if (e.mended) {
      const { e: t, n } = e.mended; e.mended = null;
      if (t.pos.distanceTo(P) < 60) { this.floatAt(t.pos, t.model.plateHeight + 0.4, '+' + n, 'heal'); this.particles.heal(t.pos); }
    }
    if (e.calling) {
      const { type, n } = e.calling; e.calling = null;
      this.callUp(e, type, n);
    }
    if (e.says) {
      if (e.pos.distanceTo(P) < 60) this.hud.system(e.says);
      e.says = null;
    }
    if (e.staggered) {
      e.staggered = false;
      if (e.pos.distanceTo(P) < 60) {
        this.floatAt(e.pos, e.model.plateHeight + 0.8, 'Staggered!', 'crit');
        this.rig.addShake(0.3);
        this.sfx('hitHeavy', 0.9);
        this.particles.burst(tmpV.copy(e.pos).setY(e.pos.y + 1.2), '#ffd23a', 26);
      }
    }
  }

  /** A summoner's call answered: n of a kind come up beside it, fight for a while, and go when it falls. */
  private callUp(m: Enemy, type: EnemyType, n: number): void {
    const base = ENEMIES[type];
    if (!base) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random(), x = m.pos.x + Math.cos(a) * 2.5, z = m.pos.z + Math.sin(a) * 2.5;
      // (no loot, a little experience, and never back: they were only ever borrowed)
      const e = new Enemy({ ...base, loot: [], marks: [0, 0], xp: Math.round(base.xp * 0.3), respawn: 99999 }, Math.floor(x), Math.floor(z), this.world.voxels);
      e.home.set(x, this.world.voxels.groundBelow(x, m.pos.y + 3, z), z);
      e.pos.copy(e.home);
      e.master = m;
      e.lifeLeft = FOE_RULES.summon.life;
      e.state = 'chase';
      this.enemies.push(e);
      this.scene.add(e.model.root, e.telegraph);
      this.particles.burst(tmpV.copy(e.pos).setY(e.pos.y + 0.6), '#b890ff', 14);
    }
    if (m.pos.distanceTo(this.player.position) < 60) this.floatAt(m.pos, m.model.plateHeight + 0.6, 'Called!', 'crit');
  }

  /** Clear away a called foe once it's fallen or gone back. */
  private dropCalled(e: Enemy): void {
    this.scene.remove(e.model.root, e.telegraph);
    this.enemies = this.enemies.filter((x) => x !== e);
    if (this.target === e) this.target = null;
  }

  /** Every blow the player lands goes through here: the calling's bonuses, the boss share, numbers, experience, a kill. */
  private dealDamage(e: Enemy, raw: number, crit: boolean, quiet = false): number {
    if (!e.alive) return 0;
    // Deadeye: every blow a critical hit while it lasts
    if (!quiet && this.kit.deadeye()) crit = true;
    const fx = this.fx;
    // The Clinker tusk: blows in a row on one foe build, 5% a blow up to a quarter
    if (fx.has('momentum') && !quiet) { this.streak = this.streak.e === e ? { e, n: Math.min(5, this.streak.n + 1) } : { e, n: 0 }; raw *= 1 + this.streak.n * 0.05; }
    const flank = (this.gearSet === 'oldman' && this.dungeons.onSomeoneElse(e) ? 1.1 : 1) * (e.exposedLeft > 0 ? 1 + EXPOSED : 1);
    // A guard's shield, if you're in front of it: most of the blow is turned (go round it, or stun it)
    const guarded = e.guarding(this.player.position);
    const dmg = Math.max(1, Math.round(this.kit.outgoing(e, raw, quiet) * (crit ? 1.6 : 1) * flank * (guarded ? 1 - FOE_RULES.guard.cut : 1) * (1 - this.harmed('weak'))));
    if (guarded && !quiet && this.elapsed - this.guardSaid > 1.2) { this.guardSaid = this.elapsed; this.floatAt(e.pos, e.model.plateHeight + 0.6, 'Guarded', 'dodge'); this.sfx('hitHeavy', 0.4); }
    const landed = this.activities.beforeHit(e, dmg);
    e.takeDamage(landed, this.player.position, this.elapsed);
    this.shared.mine(e, landed);
    if (e.def.anchored) this.practiced(landed, crit);
    this.dungeons.onPlayerHit(e, dmg);
    this.activities.escorts.onPlayerHit(e);
    // Barrowborn: below half health, a tenth of every blow comes back to you
    if (this.gearSet === 'barrow' && !this.dead && this.hp < this.maxHp / 2) this.hp = Math.min(this.maxHp, this.hp + Math.round(dmg * 0.1));
    if (this.gearSet === 'fold' && !this.dead && e.alive && (e.state === 'chase' || e.state === 'windup' || e.state === 'attack' || e.state === 'recover') && !this.dungeons.onSomeoneElse(e)) {
      const h = Math.min(this.maxHp - this.hp, Math.round(dmg * 0.05));
      if (h > 0) this.hp += h;
    }
    this.kit.landed(quiet);
    this.target = this.target && this.target.alive ? this.target : e;
    this.floatAt(e.pos, e.model.plateHeight + 0.2, String(dmg), crit ? 'crit' : quiet ? 'tick' : '');
    if (!quiet) this.particles.sparks(tmpV2.copy(e.pos).setY(e.pos.y + 0.8), crit ? 14 : 7, crit ? '#ffe080' : '#ffb060');
    if (crit) { e.punch = Math.max(e.punch, e.def.elite ? 0.12 : 0.24); this.hitstop = Math.max(this.hitstop, 0.08); this.rig.addShake(0.16); this.sfx('crit', 0.7); }
    if (!quiet && e.alive && this.elapsed - (this.voiced.get(e) ?? -9) > 0.9) { this.voiced.set(e, this.elapsed); this.audio.playAt(voiceOf(e.def.model ?? e.def.type, 'hurt'), e.pos.distanceTo(this.player.position), 0.7); }
    // (a training dummy teaches you your build, not your trade: no experience off it)
    if (!e.def.anchored) this.addXp('melee', Math.max(1, Math.round(dmg * HIT_XP)));
    if (!quiet) {
      if (fx.has('bleed') && e.alive) this.kit.addDot(e, (dmg * 0.33) / 4, 4);
      // The weapon's enchantment (data/gear.ts ENCHANTS)
      const en = ITEMS[this.save.equip.weapon ?? '']?.enchant;
      if (en && e.alive) {
        const k = en.tier - 1;
        if (en.id === 'flame') this.kit.addDot(e, dmg * [0.06, 0.09, 0.12][k], 3);
        else if (en.id === 'frost' && Math.random() < [0.2, 0.25, 0.33][k]) { e.slowLeft = 3; this.particles.sparks(tmpV2.copy(e.pos).setY(e.pos.y + 0.8), 6, '#c8f4ff'); }
        else if (en.id === 'leech') this.healSelf(dmg * [0.02, 0.03, 0.04][k]);
        else if (en.id === 'storm' && Math.random() < 0.125 && !this.chaining) { this.chaining = true; this.particles.sparks(tmpV2.copy(e.pos).setY(e.pos.y + 1.4), 16, '#d8d0ff'); this.dealDamage(e, raw * [0.3, 0.45, 0.6][k], false, true); this.chaining = false; }
      }
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
    // A riposte after a clean dodge: this blow is a sure critical
    const riposte = a.kind === 'strike' && this.riposteUntil > this.elapsed;
    if (riposte) { this.riposteUntil = 0; bonus.crit = true; }
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
      const crit = bonus.crit || Math.random() < 0.12 + (blade?.crit ?? 0) + this.armour.crit + this.mastery('keen') || (this.gearSet === 'thornback' && e.hp >= e.def.hp);
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

  /** byOther: someone else landed the last blow on a creature you'd hurt (game/SharedMobs.ts); they tell the realm and the group. */
  private onEnemyKilled(e: Enemy, byOther = false): void {
    this.audio.playAt(voiceOf(e.def.model ?? e.def.type, 'die'), e.pos.distanceTo(this.player.position), 0.9);
    if (e.spawnKey && !e.questTag && Number.isFinite(e.def.respawn) && e.def.respawn < 99999) {
      this.ledger.set(e.spawnKey, realmNow() + e.def.respawn * 1000);
      if (!byOther) this.online.mobDead(e.spawnKey, e.def.respawn);
    }
    this.dailies.bump('kill');
    this.festivals.onKill(!!e.def.elite);
    if (WORLD_BOSSES.some((b) => b.type === e.def.type)) { this.dailies.bump('boss'); if (this.hallView?.hall) this.online.hallHonour(e.def.name); }
    // A Quarters tile off the great ones: Old Notch's always, a world boss's now and then
    const tileChance = TILE_DROPS[e.def.type];
    if (tileChance && TILE_BY_ID.has(e.def.type) && Math.random() < tileChance) {
      const t = { ...((this.flag('qTiles') as Record<string, number> | undefined) ?? {}) };
      t[e.def.type] = (t[e.def.type] ?? 0) + 1;
      this.setFlag('qTiles', t);
      this.hud.banner(`${e.def.name}: a Quarters tile`, 'A great tile, for the tables', true);
    }
    if (e.isBoss || WORLD_BOSSES.some((b) => b.type === e.def.type)) this.companions?.event('boss');
    else if (e.def.type.startsWith('r_')) this.companions?.event('rare');
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
    const m = Math.round((lo + Math.floor(Math.random() * (hi - lo + 1))) * (this.fx.has('fortune') ? 1.33 : 1) * (1 + this.mastery('thrift')));
    if (m > 0) this.addMarks(m);
    if (this.fx.has('howl')) this.furyUntil = this.elapsed + 6;
    if (this.fx.has('second_wind')) this.healSelf(this.maxHp * 0.06);
    if (!e.questTag) for (const d of NAMED_BY_SOURCE.get(e.def.type) ?? []) if (Math.random() < d.named!.chance) this.claimNamed(d.id);
    const reg = regionAt(e.home.x, e.home.z).a, pieces = REGION_ARMOUR[reg];
    if (e.def.type.startsWith('r_')) this.gainStanding(reg, GAINS.rare);
    else if (WORLD_BOSSES.some((b) => b.type === e.def.type)) this.gainStanding(reg, GAINS.boss);
    const source: DropSource = e.isBoss ? 'boss' : e.def.elite || e.def.type.startsWith('r_') ? 'elite' : 'mob';
    if (pieces && !e.questTag && Math.random() < (e.def.elite ? 0.25 : 0.03)) this.give(this.dropped(pieces[Math.floor(Math.random() * pieces.length)], source), 1);
    // A glyph, now and then: elites and bosses more often, and stronger
    if (!e.questTag && Math.random() < (source === 'boss' ? 0.5 : source === 'elite' ? 0.12 : 0.015)) {
      const kinds = Object.keys(ENCHANTS), tier = source === 'boss' ? (Math.random() < 0.5 ? 3 : 2) : source === 'elite' ? (Math.random() < 0.3 ? 2 : 1) : 1;
      this.give(`glyph_${kinds[Math.floor(Math.random() * kinds.length)]}_${tier}`, 1);
    }
    // Jewellery, now and then: elites and bosses more often
    if (!e.questTag && Math.random() < (source === 'boss' ? 0.2 : source === 'elite' ? 0.06 : 0.004)) { const j = jewelDrop(e.def.level); if (j) this.give(j, 1); }
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
    // Every kill is counted by creature type, for bounties and quests; in a group it counts for everyone near
    // (a kill someone in your group finished is already counted, by theirs)
    if (!byOther || !this.social.group) this.setFlag('killed:' + e.def.type, Number(this.flag('killed:' + e.def.type) ?? 0) + 1);
    if (!e.questTag && this.social.group && !byOther) this.online.groupKill(e.def.type);
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
    // Out of sight (a Prowler's hiding): the blow goes where you were; and a Prowler slips a share of the rest
    if (this.kit.hidden()) return;
    if (this.kit.calling.id === 'prowler' && Math.random() < TUNE.openings.dodge) { this.floatAt(this.player.position, 2.4, 'Dodged!', 'dodge'); this.lastCombat = this.elapsed; return; }
    if (this.iframes > 0) {
      // Rolled clean through a blow: a riposte is open, and a little wind comes back
      if (this.player.rolling > 0 && this.riposteUntil < this.elapsed) {
        this.riposteUntil = this.elapsed + 1.8;
        this.energy = Math.min(100, this.energy + 8);
        this.floatAt(this.player.position, 2.4, 'Dodged!', 'dodge');
        this.sfx('click', 0.6);
      }
      // Brine: an attack rolled through gives back a little health, once a roll
      if (this.gearSet === 'brine' && !this.rolledThrough) {
        this.rolledThrough = true;
        const h = Math.min(this.maxHp - this.hp, Math.round(this.maxHp * 0.06));
        if (h > 0) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
      }
      return;
    }
    // The guard (docs/COMBAT.md): a blow from in front, held up in time, comes to nothing and staggers
    // whoever threw it; held up already, it takes half (more with a shield) for a little stamina
    if (this.guarding) {
      const toFoe = Math.atan2(from.pos.x - this.player.position.x, from.pos.z - this.player.position.z);
      const off = Math.abs(Math.atan2(Math.sin(toFoe - this.player.yaw), Math.cos(toFoe - this.player.yaw)));
      if (off < GUARD.arc) {
        this.energy = Math.max(0, this.energy - GUARD.cost);
        this.lastCombat = this.elapsed;
        if (this.elapsed - this.guardAt < GUARD.perfect) {
          from.stun = GUARD.stagger;
          this.floatAt(this.player.position, 2.4, 'Perfect block!', 'dodge');
          this.sfx('hitHeavy', 0.7);
          this.rig.addShake(0.12);
          return;
        }
        dmg *= 1 - (this.kit.calling.id === 'warden' ? GUARD.shieldCut : GUARD.cut);
        this.floatAt(this.player.position, 2.6, 'Blocked', 'dodge');
        if (this.energy <= 0) { this.guarding = false; this.floatAt(this.player.position, 2.9, 'Guard broken', 'player'); }
      }
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
    if (this.mastery('bracing')) taken = Math.max(1, Math.round(taken * (1 - this.mastery('bracing'))));
    this.lastHurt = this.elapsed;
    taken = Math.round(taken * (1 + this.harmed('vuln')));
    this.hp -= taken;
    // What the blow leaves behind (data/effects.ts)
    if (!this.inflictions.has(from.base)) this.inflictions.set(from.base, inflictionOf(from.base));
    const inf = this.inflictions.get(from.base);
    if (inf && Math.random() < inf.chance) this.harm(inf.id, inf.secs);
    // In the Cockpit nobody dies: a duellist's blow that leaves you at a quarter, and you yield
    if (this.activities.duels.playerHit(from, this.hp, this.maxHp)) this.hp = Math.max(this.hp, 1);
    // The Rust Queen's gauntlets give a third of it back; the sexton's helm wards you below half health
    if (fx.has('thorns') && from.alive) this.dealDamage(from, taken * 0.33, false, true);
    else if (this.armour.thorns > 0 && from.alive) this.dealDamage(from, taken * this.armour.thorns, false, true);
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

  /**
   * How long you stay down before coming round: a minute when there's anyone up and about near you to
   * help you up (GW2's and ESO's way), a few seconds when you're alone; a dungeon's raise has its own.
   */
  private downFor = 3.5;
  private die(): void {
    // (in god mode, the trailer's and the tester's, nothing puts you down: hazards and drowning included)
    if (this.dev.god) { this.hp = this.maxHp; return; }
    this.hp = 0;
    this.dead = true;
    this.deadTimer = 0;
    const P = this.player.position;
    this.downFor = this.dungeons.raising ? 9 : this.online.online && this.online.standingNear(P.x, P.z, 40) > 0 ? 60 : 3.5;
    this.attack = null;
    this.cancelActions();
    this.endDialogue();
    this.player.locked = true;
    this.hud.setDeath(true, this.downFor > 10 ? this.downFor : 0);
    this.sfx('death');
  }

  /** Up again where you fell (a healer's work), with this share of your health. */
  private raise(share: number): void {
    if (!this.dead) return;
    this.sfx('heal'); this.sfx('levelUp', 0.35); // (breath back, and the light of it)
    this.dead = false;
    this.player.locked = false;
    this.hp = Math.max(1, Math.round(this.maxHp * share));
    this.hud.setDeath(false);
    this.iframes = 1.2;
  }

  private respawn(): void {
    this.sfx('heal', 0.8);
    this.harms.clear();
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
        this.startPlay(false, 'Coming home…');
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
    this.tickResearch(dt);
    if (this.dungeons.run) { if (this.companions.body) this.companions.body.model.root.visible = false; }
    else { if (this.companions.body) this.companions.body.model.root.visible = true; this.companions.update(dt); }
    this.updateQuests(dt);

    const P = this.player.position;
    const ctx = {
      player: P,
      playerAlive: !this.dead,
      playerInvulnerable: this.iframes > 0 || this.kit.hidden(),
      playerSwimming: this.player.swimming,
      level: this.level('melee'),
      hitPlayer: (d: number, from: Enemy) => this.hitPlayer(d, from),
      sound: (name: 'growl' | 'squelch' | 'skitter' | 'swing', at: THREE.Vector3) => this.audio.playAt(name, at.distanceTo(P), 0.8),
      allies: (at: THREE.Vector3, r: number) => this.enemies.filter((o) => o.alive && !o.def.anchored && o.pos.distanceTo(at) < r),
    };
    for (const e of this.enemies) {
      if (!this.world.voxels.isLoaded(e.pos.x, e.pos.z)) { e.model.root.visible = false; continue; }
      const d = e.pos.distanceTo(P);
      if (d > 90 && e.state !== 'dead') { e.model.root.visible = false; continue; }
      e.model.root.visible = e.state !== 'dead' || e.model.root.visible;
      e.update(dt, this.dungeons.ctxFor(e, ctx) ?? this.activities.escorts.ctxFor(e, ctx) ?? this.raisedCtx(e, ctx) ?? this.shared.ctxFor(e, ctx) ?? ctx);
      if (e.interrupted) { e.interrupted = false; this.floatAt(e.pos, 2.8, 'Interrupted!', 'crit'); this.sfx('hitHeavy', 0.6); }
      if (e.resisted) { e.resisted = false; this.floatAt(e.pos, 2.6, 'Resisted', 'dodge'); }
      this.foeDid(e);
      characterDetail(e.model.root, e.pos.distanceTo(this.camera.position));
    }
    // Foes called up by a summoner, fallen or sent back, are cleared away
    for (const e of this.enemies) if (e.master && e.gone) this.dropCalled(e);
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
    this.setPieces.update(dt, this, this.player.position);
    this.shared.update(dt);
    // Out of a cleared dungeon with a click, not a walk back to the ladder
    const cleared = !!this.dungeons.run?.done;
    if (cleared !== this.leaveShown) { this.leaveShown = cleared; this.hud.setLeaveButton(cleared ? `Leave ${this.dungeons.run!.def.name}` : null, () => this.dungeons.leave()); }
    this.hazards.update(dt);
    this.stables.update(dt, P);
    this.postStations.update(dt, P);
    this.crowd.update(dt, P, this.camera.position, this.world.sky.hour, !!this.dialogue || this.dead);
    this.roadfolk.update(dt, P, this.camera.position, this.enemies, this.elapsed, !!this.dialogue || this.dead);
    this.checkFeats(dt);
    this.waymarkStones.update(P, this.elapsed);
    this.festivals.update(dt, P);
    this.seasons.update(dt, P);
    this.fair.update(dt, this.world.sky.night);
    this.farming.update(dt);
    // Trying something on: it comes off when you walk on, close the shop, or after half a minute
    if (this.trying) {
      const t = this.trying;
      t.t += dt;
      t.mount?.update(dt, 0);
      if (t.t > 30 || this.player.position.distanceTo(t.at) > 0.8 || (!this.hud.isOpen('shop') && t.t > 0.5)) this.endPreview();
    }
    // A boat left at the shore rocks at her mooring; a hired one goes home when the hour's up
    if (this.boat.afloat && !this.boat.aboard) {
      this.boat.place(dt);
      if (this.boat.hired && Number(this.flag('boatHire') ?? 0) < Date.now()) { this.boat.stow(); this.hud.system('Your hour\'s up: Dan\'s boy has rowed the boat back.'); }
    }
    // Every carved face glows brighter as it gets dark
    PUMPKIN_GLOW.emissiveIntensity = 0.3 + this.world.sky.night * 1.4;
    this.birds.update(dt, P, this.underCover ? 1 : this.world.sky.night);
    if (this.flag('apprentice') !== this.appliedApprentice) this.applyCalling();
    if (this.flag('talentsRedrawn')) {
      this.setFlag('talentsRedrawn', 0);
      this.hud.banner('Talents redrawn', 'Your points are back to spend', true);
      this.hud.system('The talent trees have been redrawn: six tiers each, with ranks, and a capstone that changes how your calling plays. Your old picks are gone and every point is back. Spend them in the journal, under Calling.');
    }
    this.home.update();
    this.cabin.update();
    // The Group Finder's boss clocks run while it's open
    if (this.hud.isOpen('finder') && (this.finderTick += dt) > 1) { this.finderTick = 0; this.hud.refresh('finder'); }
    this.drawPractice();
    this.lotBuild.update();
    // What you've laid on your lot goes to the realm's book a moment after you stop
    if (this.laidDirty >= 0 && this.elapsed - this.laidDirty > 1.5) {
      this.laidDirty = -1;
      const pl = readPlot(this.flag('plot'));
      if (pl && this.homesBook) this.online.homeBlocks(pl.lot, readLaid(this.flag('lotBlocks')));
      this.persist();
    }
    // A let room's furniture goes when the rent runs out, and comes back when it's paid
    const paid = !!readTenancy(this.flag('flat')) && (readTenancy(this.flag('flat'))!.until > Date.now());
    if (paid !== this.letPaid) { this.letPaid = paid; if (!this.home.visiting) this.home.render(); if (!paid && readTenancy(this.flag('flat'))) this.hud.system('The rent on your room has run out. Your things are safe; pay at the door to get back in.'); }
    this.planner.update();
    this.bank.update();
    if (this.parked && this.parked.model.root.position.distanceTo(this.player.position) < 90) this.parked.model.update(dt, 0);
    // The lots round you, as the book has them; a host's door open while you visit them
    if (!this.home.visiting) this.visitLot = null;
    this.syncLots();
    this.halls.sync(this.player.position.x, this.player.position.z);
    this.ferryCalls();
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
    // Standing on the ferry's deck, you go where she goes
    {
      // (every ship's carry is asked each frame, so each keeps track of how she's moved since the last)
      let ride: { pos: THREE.Vector3; turn: number } | null = null;
      for (const f of this.world.boardable) ride = f.carry(this.player.position, this.player.onGround) ?? ride;
      if (ride) this.player.carried(ride.pos, ride.turn);
    }
    // Doors open for anyone walking up to them: you, other players, the villagers
    const movers = [P, ...[...this.online.remotes.values()].map((r) => r.model.root.position), ...this.npcs.filter((n) => n.placed !== false).map((n) => n.pos), ...this.crowd.movers()];
    updateDoors(this.world.doors(), dt, movers, P, (open) => this.sfx(open ? 'doorOpen' : 'doorShut', 0.6));
    this.voyage.update(dt);
    this.sailing.update(dt, P);
    if (this.horse && !this.dead) { if (this.rideLast) this.rodeOn(Math.hypot(P.x - this.rideLast.x, P.z - this.rideLast.z)); (this.rideLast ??= new THREE.Vector3()).copy(P); } else this.rideLast = null;
    this.updateShipPanel(dt);
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
    if (this.lotBuild.active) {
      // Building on your lot: E lays the block in hand, X digs out the one you point at
      if (I.pressedOnce('KeyE')) { this.lotBuild.place(); this.hud.refresh('inv'); }
      if (I.pressedOnce('KeyX')) { this.lotBuild.dig(); this.hud.refresh('inv'); }
      if (I.pressedOnce('Escape')) this.lotBuild.stop();
    }
    for (const H of [this.home, this.cabin]) if (H.active) {
      // Arranging the house: E sets the held piece down, R turns it, X picks up the nearest
      if (I.pressedOnce('KeyE')) { H.place(); this.hud.refresh(); this.persist(); }
      if (I.pressedOnce('KeyR')) H.rotate();
      if (I.pressedOnce('KeyX')) { H.pickUp(); this.hud.refresh(); this.persist(); }
      if (I.pressedOnce('Escape')) H.stop();
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
    if (I.pressedOnce('KeyT')) this.hud.toggle('talents');
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
    if (this.quartersT?.open) { if (this.input.pressedOnce('Escape')) this.quartersT.close(); return; } // at the Quarters table
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
      this.hud.system(off ? 'You put your light away. Press L to take it out again.' : 'You take your light out again. It burns once it\'s dark; L puts it away.');
      this.sfx(off ? 'snuff' : 'flint');
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
    // (a broker's book closes when you walk away from the broker, a stall's when you walk away from the stall)
    if (this.hud.isOpen('exchange') && (this.stallOpenAt
      ? Math.hypot(this.stallOpenAt.x - this.player.position.x, this.stallOpenAt.z - this.player.position.z) > 6
      : !this.npcs.some((n) => (n.id === 'wray' || n.id === 'tregear' || n.id === 'pound' || n.id === 'hall_josiah') && n.pos.distanceTo(this.player.position) < 6))) this.hud.close('exchange');
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
      // (others see you down, so they can come and help you up)
      this.online.update(dt, { x: P.position.x, y: P.position.y, z: P.position.z, yaw: P.yaw, anim: 'dead', held: 'none', mount: null, pillion: null });
      if (this.downFor > 10) this.hud.setDeath(true, this.downFor - this.deadTimer);
      if (this.deadTimer > this.downFor) this.respawn();
      return;
    }

    // Attacks
    if (this.attack) {
      const a = this.attack;
      a.t += dt;
      if (!a.hit && a.t >= a.hitAt) {
        a.hit = true; this.resolveAttack();
        if (this.queuedSkill >= 0) { const q = this.queuedSkill; this.queuedSkill = -1; this.attack = null; this.useAbility(q); }
      }
      if (this.attack && a.t >= a.dur) {
        this.attack = null;
        this.comboWindow = 0.6;
        if (this.queuedStrike) { this.queuedStrike = false; this.cds.strike = 0; this.strike(); }
      }
    }

    // Auto-attack: keep at the foe you struck while it's up, in reach and still your target
    if (this.autoFoe) {
      const e = this.autoFoe, d = Math.hypot(e.pos.x - P.position.x, e.pos.z - P.position.z);
      const bow = this.bowInHand, reach = bow ? 24 : MELEE_REACH;
      if (!e.alive || this.target !== e || this.dead || this.horse || this.dialogue || this.action || this.craftAction || d > reach + (bow ? 2 : 6) || this.save.settings.autoAttack === false) this.autoFoe = null;
      // (in reach of a swing, or of a lunge; out of both, you close in yourself and it picks up again)
      else if (!this.attack && !this.dash && P.rolling <= 0 && this.cds.strike <= 0 && (bow ? d <= reach : d <= 3 || !!this.lungeTo(e))) this.strike();
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

    const mv = this.dialogue || this.fair.playing ? new THREE.Vector3() : this.moveVector();
    const sprint = this.input.held('ShiftLeft') || this.input.held('ShiftRight');
    // A wagon rolls a little slower than a horse alone
    const haul = this.horse && ITEMS[this.flag('mount') as string]?.mount?.wagon ? 0.85 : 1;
    this.magicka = Math.min(this.maxMagicka, this.magicka + dt * (this.elapsed - this.lastCombat > 3 ? POOLS.magicka.regenCalm : POOLS.magicka.regenFight) * (1 + this.armour.light * 0.05 + this.buffSum('regen')));
    // The guard: held up while V is down (not mounted, swimming, rolling or swinging); it drops when the stamina's gone
    {
      const want = this.input.down.has('KeyV') && !this.horse && !this.player.swimming && this.player.rolling <= 0 && !this.dead && this.mode === 'play' && !this.dialogue && this.energy > 1;
      if (want && !this.guarding) { this.guardAt = this.elapsed; this.attack = null; }
      this.guarding = want;
    }
    if (this.energy <= 0.5 && !this.winded) { this.winded = true; this.hud.system('You\'re winded. Walk it off.'); }
    else if (this.winded && this.energy >= 50) this.winded = false;
    // (horsemanship: a little more pace each rank, and the gallop tires you less)
    const rank = this.horse ? rideRank(Number(this.flag('rideDist') ?? 0)) : 1;
    const sure = 1 + (rank - 1) * RIDE_PACE, wind = 1 - (rank - 1) * RIDE_WIND;
    let speed = this.horse ? 9.6 * haul * sure : this.winded || this.guarding ? 3.6 : 5.4;
    if (sprint && mv.lengthSq() > 0.01 && this.energy > 1 && !this.winded) { speed = this.horse ? 13 * haul * sure : 8.0; this.energy = Math.max(0, this.energy - dt * (this.gearSet === 'tollriders' ? 7 : 14) * (this.horse ? 0.6 * wind : 1)); }
    else this.energy = Math.min(100, this.energy + dt * (this.elapsed - this.lastCombat > 3 ? 22 : 12) * (1 + this.armour.wind + this.buffSum('regen') + this.mastery('wind')) * (this.winded ? 0.5 : 1));
    this.tickBuffs(dt);
    this.hud.setBuffs(this.buffList());
    if (this.attack) speed *= this.attack.kind === 'cleave' ? 0.6 : 0.85;
    speed *= 1 - this.harmed('slow');
    this.tickHarms(dt);
    if (this.dev.fast) speed *= 2.5;
    if (!this.fx.has('mudwalker')) speed *= this.hazards.slow;
    speed *= 1 + this.armour.swift;
    if (this.fx.has('drover') && this.elapsed - this.lastCombat > 3) speed *= 1.12;
    const jump = this.input.pressedOnce('Space') && !this.dialogue && !this.fair.playing;
    // Moving, jumping, fighting or working puts an instrument away, and ends an emote (the short ones end on their own)
    if (this.music.out && (mv.lengthSq() > 0.01 || jump || this.attack || this.action || this.craftAction || P.swimming || this.horse || this.dead)) this.music.away();
    if (this.emote) {
      this.emote.left -= dt;
      if (mv.lengthSq() > 0.01 || jump || this.attack || this.action || this.craftAction || P.swimming || this.horse || this.hitAnim > 0 || (this.emote.left <= 0 && emoteById(this.emote.id)!.secs > 0)) this.emote = null;
    }
    // Swimming: Space rises, C dives, and underwater you swim where the camera looks
    const wasSwimming = P.swimming;
    P.rise = !this.dialogue && !this.fair.playing && this.input.held('Space');
    P.sink = !this.dialogue && this.input.held('KeyC');
    P.swimAim = THREE.MathUtils.clamp((0.32 - this.rig.pitch) * 1.2, -1.2, 1.2);
    let fall: number;
    const seat = this.pillion !== null ? this.online.seatOf(this.pillion) : null;
    if (this.pillion !== null && (!seat || jump || this.dead)) this.leavePillion();
    // On a bench: any step, a jump, a fight or a fall and you're up again
    const stepping = !this.dialogue && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some((k) => this.input.held(k));
    if (this.seated && (jump || stepping || this.dead || this.horse || this.elapsed - this.lastCombat < 0.5)) this.standUp();
    this.keepReviving(dt, jump || stepping);
    // Off the cart if you've died or been carried off elsewhere
    if (this.post.active) { const st = this.post.seat(); if (this.dead || Math.hypot(P.position.x - st.x, P.position.z - st.z) > 4) this.endRide(false, true); }
    // Out of the boat if you've died, or been carried off elsewhere (a waymark, a summons)
    if (this.boat.aboard && (this.dead || P.position.distanceTo(this.boat.seat(new THREE.Vector3())) > 3)) this.boat.aboard = false;
    // ...and off a ship's helm the same way
    if (this.sailing.atHelm && this.sailing.mine && (this.dead || P.position.distanceTo(this.sailing.mine.helm(new THREE.Vector3())) > 4)) { this.sailing.atHelm = false; if (this.rigBeforeHelm) { this.rig.distance = this.rigBeforeHelm; this.rigBeforeHelm = 0; } }
    if (this.post.active) {
      // On the post cart: she goes where she's going; you look about
      const done = this.post.update(dt), st = this.post.seat();
      P.position.set(st.x, st.y, st.z);
      P.velocity.set(0, 0, 0);
      P.yaw = st.yaw;
      P.fallStartY = st.y;
      P.model.root.position.set(st.x, st.y + st.lift, st.z);
      P.model.root.rotation.y = st.yaw;
      fall = 0;
      if (done) this.endRide(true);
      else if (jump) this.endRide(false);
    } else if (this.sailing.mine && this.sailing.atHelm) {
      // At a ship's helm: W and S set and take in sail, A and D the helm, F fires the broadside on the side
      // you're looking toward (Z port, C starboard), Space over the side (game/Sailing.ts)
      const sh = this.sailing.mine, I = this.input, free = !this.dialogue && !this.fair.playing;
      const sails = free ? (I.pressedOnce('KeyW') || I.pressedOnce('ArrowUp') ? 1 : 0) - (I.pressedOnce('KeyS') || I.pressedOnce('ArrowDown') ? 1 : 0) : 0;
      const turn = free ? (I.held('KeyA') || I.held('ArrowLeft') ? 1 : 0) - (I.held('KeyD') || I.held('ArrowRight') ? 1 : 0) : 0;
      let fire: -1 | 0 | 1 = 0;
      if (free && I.pressedOnce('KeyZ')) fire = -1;
      else if (free && I.pressedOnce('KeyC')) fire = 1;
      else if (free && I.pressedOnce('KeyF')) { const look = this.rig.yaw - Math.PI, off = Math.atan2(Math.sin(look - sh.yaw), Math.cos(look - sh.yaw)); fire = off < 0 ? 1 : -1; }
      this.sailing.steer(dt, sails, turn, fire);
      sh.helm(P.position);
      P.velocity.set(0, 0, 0);
      P.yaw = sh.yaw;
      P.fallStartY = P.position.y;
      P.model.root.position.copy(P.position);
      P.model.root.rotation.y = sh.yaw;
      fall = 0;
      if (jump) this.leaveHelm(null);
    } else if (this.boat.aboard) {
      // Rowing: W and S pull and back the oars, A and D turn her, Space over the side (game/Rowboat.ts)
      const b = this.boat, I = this.input, free = !this.dialogue && !this.fair.playing;
      const pull = free ? (I.held('KeyW') || I.held('ArrowUp') ? 1 : 0) - (I.held('KeyS') || I.held('ArrowDown') ? 1 : 0) : 0;
      const turn = free ? (I.held('KeyA') || I.held('ArrowLeft') ? 1 : 0) - (I.held('KeyD') || I.held('ArrowRight') ? 1 : 0) : 0;
      b.row(dt, pull, turn);
      b.seat(P.position);
      P.velocity.set(0, 0, 0);
      P.yaw = b.yaw;
      P.fallStartY = P.position.y;
      P.model.root.position.copy(P.position);
      P.model.root.rotation.y = b.yaw;
      fall = 0;
      if (jump) this.leaveBoat(null);
    } else if (this.seated) {
      const s = this.seated;
      P.position.set(s.x, s.y, s.z);
      P.velocity.set(0, 0, 0);
      P.yaw = s.yaw;
      P.fallStartY = s.y;
      fall = 0;
    } else if (this.pillion !== null && seat) {
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
      if ((hand || belt) && !this.flag('lightHint')) { this.setFlag('lightHint', 1); this.hud.system('Your light is lit for the dark. Press L to put it away, or to take it out again.'); }
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
    else if (this.seated || this.boat.aboard || this.post.active) { M.setState('seated'); held = 'none'; }
    else if (this.reviving) { M.setState('kneel'); held = 'none'; }
    else if (this.hitAnim > 0) M.setState('hit');
    else if (P.swimming) M.setState(P.speed > 0.6 || Math.abs(P.velocity.y) > 1.2 ? 'swim' : 'tread');
    else if (!P.onGround && !P.swimming) M.setState('jump');
    else if (P.speed > 0.4) M.setState(P.speed > 6.5 ? 'run' : 'walk');
    else M.setState('idle');
    M.setHeld(P.swimming && (M.state === 'swim' || M.state === 'tread') ? 'none' : held);
    M.swimPitch = P.swimPitch;
    M.straddle = this.horse?.girth ?? 0.38;
    M.update(dt, P.speed, !P.onGround && !P.swimming);
    this.horse?.holdReins(M.state === 'ride' ? M.handsAt(handL, handR) : null);
    // (on the Post, everyone sees the cart go by with you on its bench)
    if (this.post.active) { const w = this.post.where; this.online.update(dt, { x: w.x, y: w.y, z: w.z, yaw: w.yaw, anim: 'seated', held: 'none', mount: POST_CART_KEY, pillion: null }); }
    else this.online.update(dt, { x: P.position.x, y: P.position.y, z: P.position.z, yaw: P.yaw, anim: M.state, held, mount: this.horse ? this.mountKeyOf(this.flag('mount') as string) : null, pillion: this.pillion });
    this.music.update();
    this.chests.update();
    // Your own pet at your heels (data/pets.ts), the one your look names
    const petId = this.save.look.pet && PETS[this.save.look.pet] ? this.save.look.pet : null;
    if ((this.companion?.pet ?? null) !== petId) {
      if (this.companion) this.scene.remove(this.companion.model.root);
      this.companion = petId ? new Companion(petId, P.position) : null;
      if (this.companion) this.scene.add(this.companion.model.root);
    }
    this.companion?.update(dt, P.position, P.yaw, (x, z, near) => this.footing(x, z, near));
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
    this.candidate = this.dialogue || this.fair.playing || this.hud.picking || this.quartersT?.open || this.voyage.active || this.justice.busy ? null : this.findCandidate();
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
    sky.sheltered = this.world.voxels.topSolid(P.x, P.z) > P.y + 1.9 || roofOver(P.x, P.z) > P.y + 1.9;
    if (!sky.coverAt) {
      // Rain stops at the highest thing over a column that isn't a tree (it comes through the leaves),
      // or under a roof (a roof is a mesh over the walls, not blocks)
      const V = this.world.voxels;
      sky.coverAt = (x, z) => {
        let y = V.topSolid(x, z);
        if (y < 0) return -1e4;
        while (y > 0 && isLeaves(V.get(Math.floor(x), y, Math.floor(z)))) y--;
        return Math.max(y + 1, roofOver(x, z));
      };
    }
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
    // Underground: the dungeon's or delve's own piece, if it's one of them
    if (underground) return UNDER_THEME[this.dungeons.run?.def.id ?? ''] ?? UNDER_THEME[this.activities.undergroundSite(this.player.position) ?? ''] ?? 'deep';
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
    const turn = Math.floor(Date.now() / 480000);
    if (place) return PLACE_PIECE[place] && turn % 2 === 1 ? PLACE_PIECE[place]! : place;
    if (this.world.sky.night > 0.65) return turn % 2 === 1 ? 'rainfall' : 'night';
    // First light and evening have pieces of their own
    const h = this.world.sky.hour;
    if (h >= 5.6 && h < 7.8) return 'dawn';
    if (h >= 18.4 && h < 20.2) return 'dusk';
    // Out in the country, the region's own theme and its long piece take turns, eight minutes each
    const own = this.regionTheme(), r = regionAt(P.x, P.z), pieces = REGION_PIECE[r.t < 0.35 ? r.a : r.b] ?? [];
    const all = [own, ...pieces];
    return all[turn % all.length];
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

  /**
   * Banks, places to craft, merchants and stables, for the maps: in places you've found. A workshop's
   * stations (furnace, anvil, bench, hearth) show as one badge with what's there.
   */
  private serviceList: MapMarker[] | null = null;
  private serviceSeen = -1;
  private serviceMarkers(): MapMarker[] {
    if (this.serviceList && this.serviceSeen === this.save.discovered.length) return this.serviceList;
    const found = (x: number, z: number) => places().some((p) => p.kind === 'place' && this.save.discovered.includes(p.id) && Math.hypot(p.x - x, p.z - z) < p.r + 30);
    const out: MapMarker[] = [];
    for (const t of WORLD_THINGS) if (t.id.startsWith('bank:') && found(t.x, t.z)) out.push({ x: t.x, z: t.z, kind: 'service', svc: 'bank', label: 'Bank' });
    const shops: { x: number; z: number; n: string[] }[] = [];
    for (const ws of this.worldStations) {
      if (!found(ws.x, ws.z)) continue;
      const near = shops.find((c) => Math.hypot(c.x - ws.x, c.z - ws.z) < 10);
      const nm = ws.station === 'bench' ? 'workbench' : ws.station === 'hearth' ? 'cook fire' : ws.station;
      if (near) { if (!near.n.includes(nm)) near.n.push(nm); } else shops.push({ x: ws.x, z: ws.z, n: [nm] });
    }
    for (const c of shops) out.push({ x: c.x, z: c.z, kind: 'service', svc: 'craft', label: 'Crafting: ' + c.n.join(', ') });
    for (const n of this.npcs) {
      const shop = SHOPS[n.def.id];
      if (!shop || (n.def.when && !n.def.when(this))) continue;
      const [hx, hz] = n.def.schedule[0].at;
      if (found(hx, hz)) out.push({ x: hx, z: hz, kind: 'service', svc: 'shop', label: shop.name });
    }
    for (const st of STABLES) if (found(st.x, st.z)) out.push({ x: st.x, z: st.z, kind: 'service', svc: 'stable', label: st.name });
    this.serviceList = out;
    this.serviceSeen = this.save.discovered.length;
    return out;
  }

  private mapMarkers(full = false): MapMarker[] {
    const out: MapMarker[] = [];
    for (const q of this.questMarkers()) out.push({ x: q.p.x, z: q.p.z, kind: q.giver ? 'giver' : 'quest', label: q.label, sub: q.sub, focus: q.focus });
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
    out.push(...this.activities.markers(), ...this.seasons.markers(), ...this.fair.markers(), ...this.farming.markers());
    out.push(...this.waymarkStones.markers());
    out.push(...this.festivals.markers());
    out.push(...this.serviceMarkers().filter((m) => full || Math.hypot(m.x - this.player.position.x, m.z - this.player.position.z) < 160));
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
          this.hud.system('Chat: just type and press Enter, and everyone in the realm hears. /s <message> for those nearby only, /trade <message> for the Trade channel, /w <name> for a whisper, /g for your group and /gu for your guild. Also: /me <action> (e.g. /me tips a hat), /roll [max], /emotes, /who, /played, /clear. Emotes: ' + EMOTES.map((e) => '/' + e.id).join(' ') + '. Moving ends an emote.');
          return;
        case 'emotes': this.hud.system('Emotes: ' + EMOTES.map((e) => `/${e.id}`).join(', ') + '. Or click the ☺ on the chat box.'); return;
        case 'me': case 'e': case 'em':
          if (!arg) { this.hud.system('Try /me looks out over the valley.'); return; }
          this.sendEmoteLine(arg.slice(0, 120));
          return;
        case 's': case 'say': case 'near': if (arg) this.speak(arg, 'local'); else this.hud.system('Nearby: /s <message>, heard by everyone within shouting distance.'); return;
        case '1': case 'general': if (arg) this.speak(arg); return;
        case '2': case 'trade': case 'wts': case 'wtb':
          if (!arg) { this.hud.system('Trade: /trade <message>, to everyone in the realm who has the Trade channel on.'); return; }
          if (this.save.settings.hideTrade) { this.save.settings.hideTrade = false; this.hud.system('The Trade channel is on again (Settings to hide it).'); }
          this.speak(arg, 'trade');
          return;
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
        case 'roll': case 'dice': {
          const max = Math.max(2, Math.min(1000, Math.floor(Number(arg) || 100)));
          if (this.online.status === 'online') this.online.roll(max);
          else this.hud.system(`${this.save.name} rolls ${1 + Math.floor(Math.random() * max)} (1-${max}).`);
          return;
        }
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

  private speak(text: string, kind: 'say' | 'local' | 'trade' = 'say'): void {
    if (this.online.status === 'online') { this.online.chat(text, kind); return; } // the server echoes it back to everyone, you included
    this.hud.chat(this.save.name, text, kind);
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
    this.sfx(({ clap: 'clapHands', cheer: 'cheer', laugh: 'laughEmote', sit: 'seat', dance: 'clapHands' } as Record<string, Sfx>)[e.id] ?? 'cloth', e.id === 'dance' ? 0.5 : 1);
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
    this.hud.setPlayer(this.save.name, this.level('melee'), this.hp, this.maxHp, this.energy, (this.magicka / this.maxMagicka) * 100);
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
    this.hud.setBoss(boss ? { name: boss.name, level: boss.def.level, hp: boss.hp, max: boss.def.hp, enraged: boss.enraged, stagger: boss.staggerBar, staggerLocked: boss.staggerLocked, cast: boss.casting } : null);
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
    // (a boss you've targeted is on the boss bar already, with its cast and stagger: the frame steps aside)
    this.hud.setTarget(t && t !== boss ? { name: t.name, level: t.def.level, hp: t.hp, max: t.def.hp, elite: t.def.elite, cast: t.casting } : null);
    const foodCount = this.save.inv.reduce((s, st) => s + (st && ITEMS[st.id].heal ? st.n : 0), 0);
    const L = this.level('melee');
    const lock = <T extends object>(c: T, i: number): T & { locked?: number } => (L < UNLOCK_AT[i] ? { ...c, locked: UNLOCK_AT[i] } : c);
    // What each key costs, for the pip on its corner (Cleave and Strike are free)
    const price = (i: number) => (i === 1 && !this.kit.secondSkill ? null : this.skillCost(i));
    this.hud.setAbilities([
      lock({ left: this.cds.strike, total: 0.5 }, 0),
      lock(this.kit.secondSkill ? { ...this.kit.secondSlot(), disabled: !this.canPay(this.skillCost(1)), cost: price(1) } : { left: this.cds.cleave, total: 6, cost: null }, 1),
      // (a skill you can't pay for just now is greyed: data/combat.ts)
      lock({ ...this.kit.weaponSlot(), disabled: !this.canPay(this.skillCost(2)), cost: price(2) }, 2),
      // (open by level but not unlocked with a point: marked for the skills page, T)
      ...this.kit.slots().map((c, k) => (L >= UNLOCK_AT[3 + k] && this.kit.bar[k] && !this.skillUnlocked(this.kit.bar[k].id) ? { ...c, locked: -1 } : lock({ ...c, disabled: !this.canPay(this.skillCost(3 + k)), cost: price(3 + k) }, 3 + k))),
      { left: this.cds.roll, total: 0.8, disabled: this.energy < this.armour.rollCost },
      { left: this.cds.eat, total: 1.5, disabled: foodCount === 0, count: foodCount },
    ]);
    // The weapon skill follows the weapon in hand
    const line = weaponKit(this.blade?.model?.family, this.blade?.speed);
    if (line !== this.kit.weapon) { this.kit.weapon = line; this.kit.wcd = 0; this.kit.w2cd = 0; this.hud.setCalling(this.kit.calling, this.kit.bar, this.kit.weaponSkill, this.kit.secondSkill); }
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
