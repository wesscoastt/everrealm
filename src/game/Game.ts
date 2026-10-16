import * as THREE from 'three';
import { characterDetail } from '../entities/lod';
import { Activities } from './Activities';
import { legacyChunkKey } from '../world/VoxelWorld';
import { createRenderer } from '../core/Renderer';
import { DIALOGUE, READABLES } from '../data/dialogue';
import {
  ANIMAL_SPAWNS, ENEMIES, ENEMY_SPAWNS, FISH_TABLE, levelForXp, xpForLevel, ORE_INFO, RECIPES, REGION_SPAWNS, SHOP_STOCK, SKILLS, Station, TREE_INFO,
} from '../data/gameplay';
import { activeSet, ITEMS, SkillId } from '../data/items';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/quests';
import { Animal } from '../entities/Animal';
import { Enemy } from '../entities/Enemy';
import { Appearance, HeldItem, Humanoid } from '../entities/humanoid';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { AudioSystem, Sfx } from '../systems/Audio';
import type { ThemeId } from '../systems/music/Score';
import { CameraRig } from '../systems/CameraRig';
import { Input } from '../systems/Input';
import { Particles } from '../systems/Particles';
import { TouchControls } from '../ui/TouchControls';
import { Hud, MapMarker, PlateInfo, QuestEntry, ShopView } from '../ui/Hud';
import { SHOPS, shopBuyPrice, shopPrice } from '../data/shops';
import { POSTS, postFare, postHours } from '../data/travel';
import { Online } from '../net/Online';
import { BOARDS } from '../data/content';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
/** People whose every conversation is a story scene. */
const STORY_CAST = new Set(['lowen', 'maren', 'rhosyn', 'wynn', 'sela', 'selaSitting', 'joan', 'joanSitting']);
/** The stretch of temple floor that lifts in Chapter V: centre, radius and paving height. */
const LIFT = { x: 1201, z: 1800, r: 6, y: 89 };
import { QUEST_SPAWNS, WORLD_THINGS, WorldThing } from '../data/places_regional';
import { B } from '../world/blocks';
import { fellTree, FishSpot, LOWER_WEND, OreNode, regrowTree, TreeNode } from '../world/generate';
import { distToPolyline } from '../world/noise';
import { Interactable } from '../world/structures';
import { DialogueTree, DNode, GameApi } from './api';
import { GameWorld } from './GameWorld';
import { places } from '../data/places';
import { coastX, heightAt, regionAt, REGION_INFO, riverDist } from '../world/terrain';
import type { ChunkResult } from '../world/chunkgen';
import { chunkKey } from '../world/VoxelWorld';
import { Inventory, newSave, SaveData, writeSave } from './state';
import { MAX_CHARACTERS, deleteCharacter, lastPlayed, listCharacters, newCharacterId, rememberCharacter, saveKeyFor, setLastPlayed } from './roster';
import { CharSummary, FrontCtx, Frontend } from '../ui/Frontend';
import { originById } from '../data/origins';
import { INTRO } from '../data/intro';
import { serverUrl } from '../net/Online';
import { currentAccount, deleteRemote, remoteCharacters, signIn, signOut, uploadSave } from '../net/Account';

type Mode = 'loading' | 'title' | 'creator' | 'intro' | 'play';

/** Where the selected or new character stands on the menus, and the way the camera looks at them. */
const STAGE = { x: 153, z: 187, dir: new THREE.Vector3(4.2, 0, 0.9).normalize() };

interface Candidate {
  kind: 'npc' | 'ore' | 'tree' | 'fish' | 'thing' | 'wthing' | 'act';
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
  private cds = { strike: 0, cleave: 0, wind: 0, roll: 0, eat: 0 };
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
  private autosave = 0;
  private hudTimer = 0;
  private lastSkill: SkillId = 'melee';
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
    this.hud = new Hud(this.uiCtx());
    new TouchControls(this.input, this.hud.root);
    this.front = new Frontend(this.frontCtx(), this.hud.root);
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
    this.rig = new CameraRig(this.camera, this.world.voxels);
    this.player = new Player(this.world.voxels, this.save.look);
    this.activities = new Activities({
      scene: this.scene,
      voxels: this.world.voxels,
      player: () => this.player.position,
      alive: () => !this.dead,
      addEnemy: (e) => { this.enemies.push(e); this.scene.add(e.model.root, e.telegraph); },
      removeEnemy: (e) => { this.scene.remove(e.model.root, e.telegraph); this.enemies = this.enemies.filter((x) => x !== e); if (this.target === e) this.target = null; },
      hitPlayer: (d, from) => this.hitPlayer(d, from),
      reward: (xp, marks, items, why) => {
        if (xp) this.addXp('melee', xp);
        if (marks) this.addMarks(marks);
        for (const it of items) this.give(it, 1);
        this.hud.system(why + (xp ? ` (+${xp} XP)` : ''));
      },
      banner: (t, sub) => this.hud.banner(t, sub),
      system: (t) => this.hud.system(t),
      sound: (n) => this.sfx(n),
      flag: (k) => this.flag(k),
      setFlag: (k, v) => this.setFlag(k, v),
      discovered: (id) => this.save.discovered.includes(id),
      cinematic: (view, then) => { this.cine = { view, t: 0, then }; this.player.locked = true; this.hud.setHudHidden(true); },
      setEvent: (panel) => this.hud.setEvent(panel),
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
      this.enemies.push(e);
      this.scene.add(e.model.root, e.telegraph);
    }
    for (const a of ANIMAL_SPAWNS) {
      const an = new Animal(a.kind, a.x, a.z, a.radius, this.world.voxels, this.world.grid);
      this.animals.push(an);
      this.scene.add(an.model.root);
    }
    this.online = new Online({
      scene: this.scene,
      system: (t) => this.hud.system(t),
      chat: (from, t) => this.hud.chat(from, t),
      status: (s, n) => this.hud.setOnline(s === 'off' ? null : s === 'online' ? `Online · ${n}` : s === 'connecting' ? 'Connecting…' : s === 'denied' ? 'Offline' : 'Reconnecting…', s === 'online'),
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
    this.world.onChunk = (cx, cz, r) => this.spawnChunk(cx, cz, r);
    this.world.onChunkGone = (cx, cz) => this.despawnChunk(cx, cz);
    this.mode = 'title';
    this.applySettings();
    // Keep the loading screen up until the square is built, so the menu never shows half a village.
    this.hud.showTitle('Raising Hollin Ford…');
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
      this.hud.banner(`Chapter ${ROMAN[def.story.chapter]} complete`, def.story.title, true);
      this.sfx('quest');
      // The next chapter opens a moment later, on the game clock (browser timers stall in background tabs).
      if (def.next && !this.stage(def.next[0])) this.chapterQueue.push({ q: def.next[0], s: def.next[1], t: 2.6 });
    } else if (s === 'done') {
      this.hud.banner('Quest complete', def.name, true);
      this.sfx('quest');
    } else if (!prev && def.story) {
      this.hud.chapterCard(`The Charter's Debt · Chapter ${ROMAN[def.story.chapter]}`, def.story.title);
      this.sfx('levelUp');
    } else if (!prev) {
      this.hud.banner('New quest', def.name, true);
      this.sfx('quest');
    } else {
      this.hud.system(`${def.name}: updated`);
      this.sfx('pickup');
    }
    this.hud.setJournalAlert(true);
    this.persist();
  }
  count(item: string): number { return this.inv.count(item); }
  has(item: string, n = 1): boolean { return this.inv.count(item) >= n; }
  give(item: string, n = 1): boolean {
    const ok = this.inv.add(item, n);
    if (ok) {
      this.hud.loot(item, n); this.sfx('pickup');
      const d = ITEMS[item];
      if (d.weapon || d.armor) this.setFlag('found:' + item); // the armoury remembers every piece
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
  level(s: SkillId): number { return levelForXp(this.save.xp[s]); }
  hasTool(s: SkillId): boolean {
    return this.save.inv.some((st) => st && ITEMS[st.id].tool?.skill === s);
  }
  toast(text: string): void { this.hud.system(text); }
  openShop(id = 'tamsin'): void { this.currentShop = SHOPS[id] ? id : 'tamsin'; this.hud.show('shop'); this.hud.show('inv'); }
  openTravel(from: string): void { this.currentPost = from; this.hud.show('travel'); }

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
        known: this.save.discovered.includes(p.place),
        fare: postFare(here, p), hours: postHours(here, p),
      })),
    };
  }

  /** Ride the post cart: pay, lose some hours, and wake up at the other stop once its ground has loaded. */
  private travelTo(id: string): void {
    const here = POSTS.find((p) => p.id === this.currentPost);
    const there = POSTS.find((p) => p.id === id);
    if (!here || !there || here === there || !this.save.discovered.includes(there.place)) return;
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
    this.save.hour = (this.world.sky.hour + postHours(here, there)) % 24;
    this.save.hp = this.hp;
    this.arriving = there.name;
    this.startPlay(false, 'On the Charter Post…');
  }

  openCrafting(st: Station): void { this.currentStation = st; this.hud.show('craft'); this.hud.show('inv'); }
  startCasting(): void { this.casting = { t: 0, dur: 30 }; }
  get playerName(): string { return this.save.name; }

  // =================================================================== XP and items
  addXp(skill: SkillId, amount: number): void {
    const before = this.level(skill);
    this.save.xp[skill] += Math.round(amount);
    const after = this.level(skill);
    this.lastSkill = skill;
    this.hud.xpDrop(skill, Math.round(amount));
    if (after > before) {
      const name = SKILLS.find((s) => s.id === skill)!.name;
      this.hud.banner(`${name} ${after}`, 'Level up', true);
      this.sfx('levelUp');
      this.particles.burst(tmpV.copy(this.player.position).setY(this.player.position.y + 1.2), SKILLS.find((s) => s.id === skill)!.color, 40);
      if (skill === 'melee') this.hp = this.maxHp;
    }
    this.hud.refresh('skills');
  }

  get maxHp(): number { return 100 + (this.level('melee') - 1) * 6 + (this.helm?.vigor ?? 0); }
  /** The equipped weapon's and helm's traits (gear is horizontal: see GEAR_BUDGET in items.ts). */
  private get blade() { return this.save.equip.weapon ? ITEMS[this.save.equip.weapon].weapon : undefined; }
  private get helm() { return this.save.equip.head ? ITEMS[this.save.equip.head].armor : undefined; }
  /** The regional set bonus in force (GEAR_SETS), if both pieces match. */
  private get gearSet() { return activeSet(this.save.equip); }

  private sfx(name: Sfx, vol = 1): void { this.audio.play(name, vol); }

  // =================================================================== Settings and save
  private applySettings(): void {
    const s = this.save.settings;
    this.audio.volumes = { master: s.master, sfx: s.sfx, ambience: s.ambience, music: s.music };
    this.audio.applyVolumes();
    this.renderer.shadowMap.enabled = s.shadows;
    if (this.world) this.world.chunks.viewRadius = s.viewDist;
    if (this.world) this.world.sky.sun.castShadow = s.shadows;
    this.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && 'needsUpdate' in m) m.needsUpdate = true; });
  }

  persist(): void {
    if (this.mode !== 'play' || this.restoring) return;
    const p = this.player.position;
    this.save.pos = [p.x, p.y, p.z];
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
      unequip: (slot: 'weapon' | 'head') => g.unequip(slot),
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
      mapMarkers: () => g.mapMarkers(true),
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
      const level = (Object.values(s.xp) as number[]).reduce((a, xp) => a + levelForXp(xp), 0);
      return { id, name: s.name, look: s.look, origin: s.origin ?? null, level, place: REGION_INFO[regionAt(s.pos[0], s.pos[2]).a].name, playTime: s.playTime };
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
      create: (name, look, origin) => g.newGame(name, look, origin),
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
    this.front.showSelect();
  }

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

  private newGame(name: string, look: Appearance, origin: string): void {
    this.online.disconnect(); // the new character connects under its own name once it is in the world
    const settings = this.save.settings;
    this.charId = newCharacterId();
    this.save = newSave(name, look);
    this.save.settings = settings;
    this.save.origin = origin;
    const o = originById(origin);
    if ('marks' in o.start) this.save.marks += o.start.marks;
    else this.save.xp[o.start.skill] = xpForLevel(o.start.level);
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
    this.player.setAppearance(this.save.look, this.scene);
    this.player.model.root.visible = true;
    this.player.yaw = this.save.yaw;
    this.world.sky.hour = this.save.hour;
    this.intro = { t: 0, shot: -1 };
    this.front.showIntro();
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
    this.previewLook(null);
    this.front.hide();
    const [sx, , sz] = this.save.pos;
    this.player.teleport(this.save.pos[0], this.save.pos[1], this.save.pos[2]);
    // Explored chunks saved before the world grew past 0 use the old chunk keys
    if (!this.flag('mapV2')) { this.save.explored = this.save.explored?.map(legacyChunkKey); this.setFlag('mapV2'); }
    if (this.save.explored?.length) this.world.chunks.queueMapTiles(this.save.explored);
    this.startPending = { fresh };
    this.hud.showTitle(title);
    void sx; void sz;
  }

  /** Called once the chunks around the player are generated and meshed. */
  private finishStart(fresh: boolean): void {
    this.startPending = null;
    this.mode = 'play';
    this.hud.hideTitle();
    this.player.setAppearance(this.save.look, this.scene);
    this.player.model.root.visible = true;
    this.player.yaw = this.save.yaw;
    this.rig.yaw = this.save.yaw + Math.PI;
    this.rig.snap(this.player.position);
    this.world.sky.hour = this.save.hour;
    this.hp = Math.min(this.maxHp, Math.max(1, this.save.hp));
    for (const n of this.npcs) n.placed = false;
    // Old Notch stays dead across sessions.
    for (const e of this.enemies) if (e.def.type === 'notch' && this.flag('notchKilled')) { e.hp = 0; e.state = 'dead'; e.respawnIn = Infinity; e.model.root.visible = false; }
    // A pour interrupted by closing the tab finishes off-screen.
    if (this.stage('fordBell') === 'casting') this.save.quests.fordBell = 'report';
    this.world.structures.bell.visible = ['report', 'done'].includes(this.stage('fordBell') ?? '');
    this.hud.setPortrait(this.save.look);
    this.audio.unlock();
    this.hud.setTracker(this.questEntries());
    if (this.online.enabled && this.online.status === 'off') this.online.connect(this.save.name, this.save.look, this.save.playTime);
    if (this.arriving) {
      this.hud.banner(this.arriving, 'The post cart sets you down');
      this.arriving = null;
    }
    if (fresh) {
      this.hud.banner('Hollin Ford', 'Hollindale');
      this.currentRegion = 'hollin';
      if (!this.save.discovered.includes('hollin')) this.save.discovered.push('hollin');
      setTimeout(() => this.hud.system('WASD to move. Drag the mouse to look around.'), 1500);
      setTimeout(() => this.hud.system('People with a gold ! have something to say. Press E to talk.'), 5000);
    }
    this.persist();
  }

  // =================================================================== Inventory actions
  private useSlot(i: number): void {
    const st = this.save.inv[i];
    if (!st) return;
    const def = ITEMS[st.id];
    if (def.kind === 'food') this.eat(st.id);
    else if (def.weapon) {
      const old = this.save.equip.weapon;
      this.inv.removeAt(i, 1);
      this.save.equip.weapon = st.id;
      if (old) this.inv.add(old, 1);
      this.hud.system(`Equipped ${def.name}.`);
      this.sfx('pickup');
    } else if (def.armor) {
      const old = this.save.equip.head;
      this.inv.removeAt(i, 1);
      this.save.equip.head = st.id;
      if (old) this.inv.add(old, 1);
      this.hp = Math.min(this.hp, this.maxHp);
      this.hud.system(`Equipped ${def.name}.`);
      this.sfx('pickup');
    } else if (st.id === 'wren_whistle') {
      this.sfx('whistle');
    }
    this.hud.refresh();
  }

  private unequip(slot: 'weapon' | 'head'): void {
    const id = this.save.equip[slot];
    if (!id) return;
    if (!this.inv.canAdd(id)) { this.hud.system('Your pack is full.'); return; }
    this.inv.add(id);
    this.save.equip[slot] = null;
    this.hp = Math.min(this.hp, this.maxHp);
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
    return {
      name: shop.name,
      who: shop.who ?? (owner ? owner.name.split(' ')[0] : shop.name),
      stock: shop.stock.filter((x) => !x.when || x.when(this)).map((x) => ({ item: x.item, price: shopPrice(this, shop, x.price) })),
      sellPrice: (id: string) => shopBuyPrice(this, shop, id),
      footer: shop.footer(this),
    };
  }

  private buy(item: string): void {
    const s = this.shopView().stock.find((x) => x.item === item);
    if (!s || this.save.marks < s.price) return;
    if (!this.inv.canAdd(item)) { this.hud.system('Your pack is full.'); return; }
    this.save.marks -= s.price;
    this.give(item, 1);
    this.sfx('coin');
    this.hud.refresh();
  }

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
    if (this.hp >= this.maxHp) { this.hud.system('You\'re not hungry.'); return; }
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
    this.hp = Math.min(this.maxHp, this.hp + (def.heal ?? 0));
    this.cds.eat = 1.5;
    this.sfx('heal', 0.6);
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
    const st = this.world.structures.interactables.find((i) => i.kind === c.station)!;
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

  private questMarkers(): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (const [id, stage] of Object.entries(this.save.quests)) {
      const def = QUESTS[id];
      if (!def) continue;
      for (const o of def.objectives(this, stage)) if (o.marker && !o.done) { const p = this.markerPos(o.marker); if (p) out.push(p); }
    }
    if (!this.stage('fordBell')) { const m = this.npcs.find((n) => n.id === 'maud'); if (m) out.push(m.pos); }
    for (const def of Object.values(QUESTS)) {
      if (this.stage(def.id) || !def.marks) continue;
      for (const id of Object.keys(def.marks(this, undefined))) { const n = this.npcs.find((x) => x.id === id); if (n?.placed) out.push(n.pos); }
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
    for (const a of this.activities.candidates(p)) consider({ kind: 'act', label: a.label, pos: a.pos, act: a.use }, Math.hypot(a.pos.x - p.x, a.pos.z - p.z));
    for (const wt of WORLD_THINGS) {
      const d = Math.hypot(wt.x - p.x, wt.z - p.z);
      if (d > wt.radius || (wt.when && !wt.when(this))) continue;
      const y = this.thingGround(wt);
      if (y === null || Math.abs(y - p.y) > 2.5) continue;
      consider({ kind: 'wthing', label: wt.label, pos: new THREE.Vector3(wt.x, y + 1, wt.z), wthing: wt }, d);
    }
    return best;
  }

  private interact(c: Candidate): void {
    if (c.warn) { this.hud.system(c.warn + '.'); this.sfx('fail'); return; }
    switch (c.kind) {
      case 'npc': this.startDialogue(c.npc!); break;
      case 'ore': this.startGather({ kind: 'mine', ore: c.ore, tool: this.inv.bestTool('mining', this.level('mining'))! }); break;
      case 'tree': this.startGather({ kind: 'chop', tree: c.tree, tool: this.inv.bestTool('woodcutting', this.level('woodcutting'))! }); break;
      case 'fish': this.startGather({ kind: 'fish', spot: c.spot, tool: this.inv.bestTool('fishing', 99)! }); break;
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
  private thingGround(wt: WorldThing): number | null {
    if (wt.y !== undefined) return this.world.voxels.isLoaded(wt.x, wt.z) ? wt.y : null;
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
  private useAbility(i: number): void {
    if (this.mode !== 'play' || this.dead) return;
    this.hud.pressAbility(i);
    if (i === 0) this.strike();
    else if (i === 1) this.cleave();
    else if (i === 2) this.secondWind();
    else if (i === 3) this.roll();
    else if (i === 4) this.eat();
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

  private strike(): void {
    if (this.action || this.craftAction) this.cancelActions();
    if (this.attack) { this.queuedStrike = true; return; }
    if (this.cds.strike > 0) return;
    this.faceTarget(4.5);
    const combo = this.comboWindow > 0 ? (this.comboIndex + 1) % 3 : 0;
    this.comboIndex = combo;
    const dur = (combo === 2 ? 0.55 : 0.42) / (this.blade?.speed ?? 1);
    this.attack = { kind: 'strike', t: 0, dur, hitAt: dur * 0.48, hit: false, combo };
    this.player.model.comboIndex = combo;
    this.player.model.setState('attack');
    this.player.model.stateTime = 0;
    this.cds.strike = dur * 0.9;
    this.sfx('swing');
    this.lastCombat = this.elapsed;
  }

  private cleave(): void {
    if (this.cds.cleave > 0 || this.attack) return;
    this.cancelActions();
    const pace = this.blade?.speed ?? 1;
    this.attack = { kind: 'cleave', t: 0, dur: 0.6 / pace, hitAt: 0.28 / pace, hit: false, combo: 0 };
    this.player.model.setState('cleave');
    this.player.model.stateTime = 0;
    this.cds.cleave = this.gearSet === 'harrow' ? 4 : 6;
    this.sfx('swing', 1.3);
    this.lastCombat = this.elapsed;
  }

  private secondWind(): void {
    if (this.cds.wind > 0) return;
    this.cds.wind = this.gearSet === 'tolley' ? 20 : 30;
    this.healOverTime = { left: 3, perSec: (this.maxHp * 0.35) / 3 };
    this.healAnim = 0.6;
    this.sfx('heal');
    this.particles.heal(this.player.position);
  }

  private roll(): void {
    if (this.cds.roll > 0 || this.energy < 25 || this.player.swimming) return;
    this.cancelActions();
    this.energy -= 25;
    this.cds.roll = 0.8;
    this.iframes = 0.46 + (this.helm?.roll ?? 0);
    this.rolledThrough = false;
    const mv = this.moveVector();
    this.player.startRoll(mv.lengthSq() > 0.01 ? mv : new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw)));
    this.attack = null;
    this.sfx('roll');
    this.particles.dust(this.player.position, 8);
  }

  private resolveAttack(): void {
    const a = this.attack!;
    const P = this.player.position;
    const face = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    const blade = this.blade;
    const weapon = blade?.damage ?? 0;
    const lvl = this.level('melee');
    let drawn = 0;
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = tmpV.subVectors(e.pos, P);
      const dist = Math.hypot(to.x, to.z);
      if (Math.abs(to.y) > 2.2) continue;
      const reach = (a.kind === 'cleave' ? 3.4 : 2.7 + (e.def.elite ? 0.6 : 0)) + (blade?.reach ?? 0);
      if (dist > reach) continue;
      if (a.kind === 'strike') {
        const ang = Math.acos(THREE.MathUtils.clamp((to.x * face.x + to.z * face.z) / Math.max(0.01, dist), -1, 1));
        if (ang > 1.35 && dist > 1.1) continue;
      }
      const mult = a.kind === 'cleave' ? 1.5 : [1, 1.1, 1.5][a.combo];
      let dmg = (7 + lvl * 1.45 + weapon) * mult * (0.9 + Math.random() * 0.2) * (1 + (lvl - 1) * 0.02);
      const crit = Math.random() < 0.12 + (blade?.crit ?? 0) || (this.gearSet === 'thornback' && e.hp >= e.def.hp);
      if (crit && this.gearSet === 'starglass') this.energy = Math.min(100, this.energy + 6);
      if (crit) dmg *= 1.6;
      dmg = Math.round(dmg);
      e.takeDamage(dmg, P, this.elapsed);
      drawn += dmg * (blade?.leech ?? 0);
      any = true;
      this.target = this.target && this.target.alive ? this.target : e;
      this.floatAt(e.pos, e.model.plateHeight + 0.2, String(dmg), crit ? 'crit' : '');
      this.particles.sparks(tmpV2.copy(e.pos).setY(e.pos.y + 0.8), crit ? 14 : 7, crit ? '#ffe080' : '#ffb060');
      this.addXp('melee', Math.max(1, Math.round(dmg * 0.4)));
      if (e.justDied) this.onEnemyKilled(e);
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

  private onEnemyKilled(e: Enemy): void {
    this.activities.onKilled(e);
    this.addXp('melee', e.def.xp);
    const [lo, hi] = e.def.marks;
    const m = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (m > 0) this.addMarks(m);
    for (const l of e.def.loot) {
      if (Math.random() < l.chance) {
        this.give(l.item, l.min ?? 1);
        // Gear is a sidegrade, so say what it trades
        const d = ITEMS[l.item];
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
    if (this.dead) return;
    if (this.iframes > 0) {
      // Brine: an attack rolled through gives back a little health, once a roll
      if (this.gearSet === 'brine' && !this.rolledThrough) {
        this.rolledThrough = true;
        const h = Math.min(this.maxHp - this.hp, Math.round(this.maxHp * 0.06));
        if (h > 0) { this.hp += h; this.floatAt(this.player.position, 2.2, `+${h}`, 'heal'); }
      }
      return;
    }
    const armor = this.helm?.defense ?? 0;
    const taken = Math.max(1, Math.round(dmg * (0.9 + Math.random() * 0.2) - armor));
    this.hp -= taken;
    this.lastCombat = this.elapsed;
    this.hitAnim = 0.3;
    this.sfx('hurt');
    this.rig.addShake(0.25);
    this.floatAt(this.player.position, 2.2, `-${taken}`, 'player');
    const away = tmpV.subVectors(this.player.position, from.pos).setY(0).normalize();
    this.player.velocity.addScaledVector(away, 5);
    if (!this.target || !this.target.alive) this.target = from;
    if (this.action || this.craftAction) this.cancelActions();
    if (this.hp <= 0) this.die();
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

  private respawn(): void {
    this.dead = false;
    this.player.locked = false;
    this.hp = Math.round(this.maxHp * 0.6);
    this.player.teleport(145.5, 19, 179.6);
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
    const h = m.look.height ?? 1;
    const close = creator && this.creatorView === 'face';
    const right = new THREE.Vector3(d.z, 0, -d.x);
    const pos = base.clone().addScaledVector(d, close ? 2.5 : creator ? 4.4 : 5.2).add(new THREE.Vector3(0, (close ? 1.8 : 1.35) * h, 0));
    const look = base.clone().add(new THREE.Vector3(0, (close ? 1.6 : 1.05) * h, 0));
    // In the creator the options panel covers the left of the screen, so frame the model right of centre.
    if (creator && innerWidth > 860) look.addScaledVector(right, close ? -0.45 : -0.85);
    if (!this.menuCam) this.menuCam = { pos: pos.clone(), look: look.clone() };
    const k = 1 - Math.exp(-dt * 5);
    this.menuCam.pos.lerp(pos, k);
    this.menuCam.look.lerp(look, k);
    this.camera.position.copy(this.menuCam.pos);
    this.camera.lookAt(this.menuCam.look);
  }

  private frame(dt: number): void {
    this.elapsed += dt;
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
      if (this.menuPending && this.world.chunks.isReady(STAGE.x, STAGE.z, 2)) { this.menuPending = false; this.showMenu(); }
      this.world.update(dt, focus, this.elapsed, timeScale * 0.3);
      if (this.startPending && this.world.chunks.isReady(focus.x, focus.z, 2)) {
        // Drop the player onto solid ground if the saved height is stale
        const g = this.world.voxels.groundBelow(focus.x, Math.max(focus.y + 1, 0) + 0.5, focus.z);
        const top = this.world.voxels.topSolid(focus.x, focus.z) + 1;
        // Post-cart arrivals always stand on the real ground at the stop; nothing should be overhead there.
        if (this.arriving || this.world.voxels.solidAt(focus.x, focus.y + 0.2, focus.z) || focus.y - g > 30) this.player.teleport(focus.x, top, focus.z);
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
    this.updatePlayer(dt);
    this.updateGather(dt);
    this.updateCraft(dt);
    this.updateQuests(dt);

    const P = this.player.position;
    const ctx = {
      player: P,
      playerAlive: !this.dead,
      playerInvulnerable: this.iframes > 0,
      hitPlayer: (d: number, from: Enemy) => this.hitPlayer(d, from),
      sound: (name: 'growl' | 'squelch' | 'skitter' | 'swing', at: THREE.Vector3) => this.audio.playAt(name, at.distanceTo(P), 0.8),
    };
    for (const e of this.enemies) {
      if (!this.world.voxels.isLoaded(e.pos.x, e.pos.z)) { e.model.root.visible = false; continue; }
      const d = e.pos.distanceTo(P);
      if (d > 90 && e.state !== 'dead') { e.model.root.visible = false; continue; }
      e.model.root.visible = e.state !== 'dead' || e.model.root.visible;
      e.update(dt, ctx);
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
    this.activities.update(dt);
    for (const a of this.animals) {
      const far = a.pos.distanceTo(P) > 90 || !this.world.voxels.isLoaded(a.pos.x, a.pos.z);
      a.model.root.visible = !far;
      if (far) continue;
      a.update(dt, P);
      characterDetail(a.model.root, a.pos.distanceTo(this.camera.position));
    }
    this.particles.update(dt);
    this.world.update(dt, P, this.elapsed, timeScale);
    this.rig.ceiling = this.player.underwater ? this.player.waterTop - 0.3 : Infinity; // follow a diver down
    this.rig.update(dt, P);
    if (this.cine) {
      const c = this.cine, [vx, vy, vz, lx, ly, lz] = c.view, DUR = 7;
      c.t += dt;
      const a = (c.t / DUR) * Math.PI * 1.25 - 0.4, r = 26 + c.t * 2.2;
      this.camera.position.set(vx + Math.cos(a) * r, vy + 10 + Math.sin(c.t * 0.6) * 2, vz + Math.sin(a) * r);
      this.camera.lookAt(lx, ly, lz);
      if (c.t >= DUR) { this.cine = null; this.player.locked = false; this.hud.setHudHidden(false); c.then(); }
    }
    this.world.sky.underwater = this.world.voxels.isWater(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.player.model.root.visible = this.rig.actualDistance > 1.1;
    this.ambientFx(dt);
    this.respawnNodes();
    this.updateHud(dt);

    this.autosave += dt;
    if (this.autosave > 20) { this.autosave = 0; this.persist(); }
    this.input.endFrame();
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
    if (I.pressedOnce('Escape')) {
      if (!this.hud.closeAll()) {
        if (this.target) this.target = null;
        else this.hud.show('settings');
      }
      this.currentStation = null;
    }
    if (I.pressedOnce('KeyI') || I.pressedOnce('KeyB')) this.hud.toggle('inv');
    if (I.pressedOnce('KeyK')) this.hud.toggle('skills');
    if (I.pressedOnce('KeyJ')) this.hud.toggle('journal');
    if (I.pressedOnce('KeyM')) this.hud.toggle('map');
    if (I.pressedOnce('Enter') && this.online.status === 'online') {
      this.input.down.clear();
      this.hud.openChat((t) => { this.online.chat(t); });
    }
    if (I.dragX || I.dragY) this.rig.rotate(I.dragX, I.dragY);
    if (I.wheel) this.rig.zoom(I.wheel);
    if (this.dead) return;

    if (I.pressedOnce('Digit1')) this.useAbility(0);
    if (I.pressedOnce('Digit2')) this.useAbility(1);
    if (I.pressedOnce('Digit3')) this.useAbility(2);
    if (I.pressedOnce('KeyQ')) this.useAbility(3);
    if (I.pressedOnce('KeyF')) this.useAbility(4);
    if (I.pressedOnce('Tab')) this.cycleTarget();

    const ePressed = I.pressedOnce('KeyE');
    if (ePressed) {
      if (!this.pullLine()) {
        if (this.candidate && !(this.action && this.action.kind !== 'fish')) this.interact(this.candidate);
        else if (this.action) this.cancelActions();
      }
    }
    if (I.click) {
      if (this.action?.kind === 'fish' && this.pullLine()) return;
      const picked = this.pick(I.click.x, I.click.y);
      if (picked instanceof Enemy) {
        this.target = picked;
        if (picked.pos.distanceTo(this.player.position) < 4) this.strike();
      } else if (picked instanceof Npc) {
        if (picked.pos.distanceTo(this.player.position) < 4.5) this.startDialogue(picked);
        else this.hud.system(`${picked.def.name} is too far away to talk to.`);
      } else if (!this.hud.isOpen('map')) this.strike();
    }
    // Moving cancels gathering and crafting.
    const mv = this.moveVector();
    if (mv.lengthSq() > 0.01 && (this.action || this.craftAction)) this.cancelActions();
    if (this.currentStation && this.hud.isOpen('craft')) {
      const st = this.world.structures.interactables.find((i) => i.kind === this.currentStation)!;
      if (Math.hypot(st.x - this.player.position.x, st.z - this.player.position.z) > 4) { this.hud.close('craft'); this.currentStation = null; }
    } else if (!this.hud.isOpen('craft')) this.currentStation = null;
    if (this.hud.isOpen('travel')) {
      const p = POSTS.find((x) => x.id === this.currentPost);
      if (!p || Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) > 5) this.hud.close('travel');
    }
    if (this.hud.isOpen('shop')) {
      const t = this.npcs.find((n) => n.id === SHOPS[this.currentShop].owner);
      if (!t || t.pos.distanceTo(this.player.position) > 6) this.hud.close('shop');
    }
    void dt;
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

  private cycleTarget(): void {
    const P = this.player.position;
    const list = this.enemies.filter((e) => e.alive && e.pos.distanceTo(P) < 25).sort((a, b) => a.pos.distanceTo(P) - b.pos.distanceTo(P));
    if (!list.length) { this.target = null; return; }
    const i = this.target ? list.indexOf(this.target) : -1;
    this.target = list[(i + 1) % list.length];
  }

  private updatePlayer(dt: number): void {
    const P = this.player;
    for (const k of Object.keys(this.cds) as (keyof typeof this.cds)[]) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.hitAnim = Math.max(0, this.hitAnim - dt);
    this.healAnim = Math.max(0, this.healAnim - dt);

    if (this.dead) {
      this.deadTimer += dt;
      P.model.setState('dead');
      P.update(dt, new THREE.Vector3(), 0, false);
      P.model.update(dt, 0);
      if (this.deadTimer > 3.5) this.respawn();
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
    if (this.elapsed - this.lastCombat > 6 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.035 * dt);

    const mv = this.dialogue || this.attack?.kind === 'cleave' ? new THREE.Vector3() : this.moveVector();
    const sprint = this.input.held('ShiftLeft') || this.input.held('ShiftRight');
    let speed = 5.4;
    if (sprint && mv.lengthSq() > 0.01 && this.energy > 1) { speed = 8.0; this.energy = Math.max(0, this.energy - dt * (this.gearSet === 'tollriders' ? 7 : 14)); }
    else this.energy = Math.min(100, this.energy + dt * (this.elapsed - this.lastCombat > 3 ? 22 : 12) * (1 + (this.helm?.wind ?? 0)));
    if (this.attack) speed *= 0.35;
    const jump = this.input.pressedOnce('Space') && !this.dialogue;
    // Swimming: Space rises, C dives, and underwater you swim where the camera looks
    const wasSwimming = P.swimming;
    P.rise = !this.dialogue && this.input.held('Space');
    P.sink = !this.dialogue && this.input.held('KeyC');
    P.swimAim = THREE.MathUtils.clamp((0.32 - this.rig.pitch) * 1.2, -1.2, 1.2);
    const fall = P.update(dt, mv, speed, jump);
    if (P.swimming !== wasSwimming) document.body.classList.toggle('swimming', P.swimming);
    if (P.swimming && !wasSwimming && P.velocity.y < -3) {
      this.particles.splash(tmpV.set(P.position.x, P.waterTop, P.position.z), 22);
      this.sfx('splash', 0.8);
    }
    if (P.swimming && !P.underwater && P.speed > 1) {
      this.wakeTimer -= dt;
      if (this.wakeTimer <= 0) { this.wakeTimer = 0.28; this.particles.ripple(tmpV.set(P.position.x, P.waterTop - 0.05, P.position.z)); }
    }
    if (fall > 5) {
      const dmg = Math.round((fall - 4) * 7);
      this.hp -= dmg;
      this.floatAt(P.position, 2.2, `-${dmg}`, 'player');
      this.sfx('hurt');
      this.rig.addShake(0.2);
      if (this.hp <= 0) this.die();
    }
    if (fall > 1.5) this.particles.dust(P.position, 6);

    // Footsteps
    if (P.onGround && P.speed > 1) {
      this.stepTimer -= dt * (P.speed / 5);
      if (this.stepTimer <= 0) { this.stepTimer = 0.36; this.sfx('step', 0.5); }
    }

    // Animation state
    const M = P.model;
    let held: HeldItem = this.save.equip.weapon ? ITEMS[this.save.equip.weapon].weapon!.held : 'none';
    if (P.rolling > 0) M.setState('roll');
    else if (this.attack) { if (M.state !== 'attack' && M.state !== 'cleave') M.setState(this.attack.kind === 'cleave' ? 'cleave' : 'attack'); }
    else if (this.healAnim > 0) M.setState('heal');
    else if (this.action) {
      held = ITEMS[this.action.tool].tool!.held;
      if (this.action.kind === 'fish') M.setState(this.action.phase === 'cast' ? 'fishCast' : 'fishWait');
      else M.setState(this.action.kind === 'mine' ? 'mine' : 'chop');
    } else if (this.craftAction) {
      const st = this.craftAction.station;
      M.setState(st === 'anvil' ? 'hammer' : st === 'hearth' ? 'cook' : 'bellows');
      held = st === 'anvil' ? 'hammer' : st === 'furnace' ? 'tongs' : 'none';
    } else if (this.hitAnim > 0) M.setState('hit');
    else if (P.swimming) M.setState(P.speed > 0.6 || Math.abs(P.velocity.y) > 1.2 ? 'swim' : 'tread');
    else if (!P.onGround && !P.swimming) M.setState('jump');
    else if (P.speed > 0.4) M.setState(P.speed > 6.5 ? 'run' : 'walk');
    else M.setState('idle');
    M.setHeld(P.swimming && (M.state === 'swim' || M.state === 'tread') ? 'none' : held);
    M.swimPitch = P.swimPitch;
    M.update(dt, P.speed, !P.onGround && !P.swimming);
    this.online.update(dt, { x: P.position.x, y: P.position.y, z: P.position.z, yaw: P.yaw, anim: M.state, held });

    // Interaction candidate
    this.candidate = this.dialogue ? null : this.findCandidate();
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
    this.audio.ambience(dt, { night: this.world.sky.night, river, fire, underground, inTown: this.currentRegion === 'hollin' });
    this.audio.musicContext({ theme: this.musicTheme(underground), combat: this.inCombat() });
  }

  /** Theme for where the player is and the time of day. */
  private musicTheme(underground: boolean): ThemeId {
    if (underground) return 'deep';
    const town = this.currentRegion === 'hollin';
    if (this.world.sky.night > 0.65 && !town) return 'night';
    if (town) return 'hollin';
    return this.regionTheme();
  }

  /** Region theme; Hollindale by default. */
  private regionTheme(): ThemeId {
    const p = this.player.position;
    const r = regionAt(p.x, p.z);
    return (r.t < 0.35 ? r.a : r.b) as ThemeId;
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
    for (const q of this.questMarkers()) out.push({ x: q.x, z: q.z, kind: 'quest' });
    for (const n of this.npcs) {
      // Only people who are there (see NpcDef.when), in places the player has found.
      if (!n.def.title || (n.def.when && !n.def.when(this))) continue;
      const [hx, hz] = n.def.schedule[0].at;
      if (!places().some((p) => p.kind === 'place' && this.save.discovered.includes(p.id) && Math.hypot(p.x - hx, p.z - hz) < p.r + 30)) continue;
      const x = n.placed ? n.pos.x : hx, z = n.placed ? n.pos.z : hz;
      out.push({ x, z, kind: 'npc', label: full ? n.def.name.split(' ')[0] : undefined });
    }
    if (!full) for (const e of this.enemies) if (e.alive && e.pos.distanceTo(this.player.position) < 55) out.push({ x: e.pos.x, z: e.pos.z, kind: e.def.elite ? 'elite' : 'enemy' });
    for (const r of this.online.remotes.values()) out.push({ x: r.model.root.position.x, z: r.model.root.position.z, kind: 'other', label: full ? r.name : undefined });
    if (full) for (const p of POSTS) if (this.save.discovered.includes(p.place)) out.push({ x: p.x, z: p.z, kind: 'post', label: p.name });
    out.push(...this.activities.markers());
    if (full) out.push({ x: this.player.position.x, z: this.player.position.z, kind: 'player', yaw: this.player.yaw });
    return out;
  }

  private updateHud(dt: number): void {
    const P = this.player.position;
    this.hud.setPlayer(this.save.name, this.level('melee'), this.hp, this.maxHp, this.energy);
    if (this.target && (!this.target.alive || this.target.pos.distanceTo(P) > 40)) this.target = null;
    const t = this.target;
    this.hud.setTarget(t ? { name: t.name, level: t.def.level, hp: t.hp, max: t.def.hp, elite: t.def.elite } : null);
    const foodCount = this.save.inv.reduce((s, st) => s + (st && ITEMS[st.id].heal ? st.n : 0), 0);
    this.hud.setAbilities([
      { left: this.cds.strike, total: 0.5 },
      { left: this.cds.cleave, total: 6 },
      { left: this.cds.wind, total: 30 },
      { left: this.cds.roll, total: 0.8, disabled: this.energy < 25 },
      { left: this.cds.eat, total: 1.5, disabled: foodCount === 0, count: foodCount },
    ]);
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
      const s = project(n.pos.x, n.pos.y + 2.25 * (n.def.look.height ?? 1), n.pos.z);
      if (s) plates.push({ key: 'n' + n.id, x: s.x, y: s.y, name: n.def.name, sub: d < 12 ? n.def.title : undefined, kind: 'npc', mark: this.npcMark(n) });
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
      const s = project(rp.x, rp.y + 2.25 * (r.model.look.height ?? 1), rp.z);
      if (s) plates.push({ key: 'p' + r.id, x: s.x, y: s.y, name: r.name, kind: 'player' });
    }
    this.hud.updatePlates(plates);

    this.hudTimer -= dt;
    if (this.hudTimer > 0) return;
    this.hudTimer = 0.2;
    this.hud.drawMinimap(P.x, P.z, this.rig.yaw, this.player.yaw, this.mapMarkers());
    this.hud.setClock(this.world.sky.hour);
    this.hud.setXpBar(this.lastSkill, this.save.xp[this.lastSkill]);
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
          if (regionId !== 'region:greenwake') { this.hud.banner(rp.name, rp.sub); this.sfx('discover'); }
        } else if (!this.save.discovered.includes(r.id)) {
          this.save.discovered.push(r.id);
          this.hud.banner(r.name, r.sub);
          this.sfx('discover');
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
    if (!r || !r.spawns.length) return;
    const list = { enemies: [] as Enemy[], animals: [] as Animal[] };
    for (const s of r.spawns) {
      const table = REGION_SPAWNS[s.region];
      if (s.animal) {
        if (!table.animals.length) continue;
        const kind = table.animals[Math.floor(s.roll * table.animals.length)];
        const a = new Animal(kind, s.x, s.z, 10, this.world.voxels);
        list.animals.push(a);
        this.animals.push(a);
        this.scene.add(a.model.root);
      } else {
        const type = table.enemies[Math.floor(s.roll * table.enemies.length)];
        const e = new Enemy(ENEMIES[type], Math.floor(s.x), Math.floor(s.z), this.world.voxels);
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
  private debugApi() {
    return {
      game: this,
      tp: (x: number, y: number, z: number) => { this.player.teleport(x, y, z); this.rig.snap(this.player.position); },
      region: () => { const p = this.player.position; return { region: regionAt(p.x, p.z), zone: this.currentRegion, theme: this.regionTheme(), chunks: this.world.chunks.entries.size, covered: this.world.chunks.coveredRadius, gen: this.world.chunks.stats }; },
      info: REGION_INFO,
      give: (id: string, n = 1) => this.give(id, n),
      xp: (s: SkillId, n: number) => this.addXp(s, n),
      stage: (q: string, s: string) => this.setStage(q, s),
      hour: (h: number) => { this.world.sky.hour = h; },
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
      finishCasting: () => { if (this.casting) this.casting.t = this.casting.dur; },
    };
  }
}

void UP;
