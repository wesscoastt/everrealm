import { SkillId } from '../data/items';
import { Station } from '../data/gameplay';
import type { DeedInput, Moral, Need } from '../data/morality';

/** The narrow surface dialogue, quests and interactables use to read and change the game. */
export interface GameApi {
  flag(key: string): unknown;
  setFlag(key: string, value?: unknown): void;
  stage(quest: string): string | undefined;
  setStage(quest: string, stage: string): void;
  /** Write a deed in the character's book (data/morality.ts): alignment, traits, regard, people's feelings. Once per id; false if already done. Optional so test harnesses without it still run: use kit.ts deed() in content. */
  deed?(d: DeedInput): boolean;
  /** The character's alignment, traits, regard and the people's feelings, as the book of deeds has them. */
  moral?(): Moral;
  /** How many quests you've seen through to the end. */
  questsDone(): number;
  count(item: string): number;
  has(item: string, n?: number): boolean;
  give(item: string, n?: number): boolean;
  take(item: string, n?: number): boolean;
  readonly marks: number;
  /** The Wake Fair (game/WakeFair.ts): is it up, step up to a game, prized plays left today, the day's guess made. */
  /** Pin a place on the map (the land book's "show me"). */
  markOnMap(x: number, z: number, label: string): void;
  /** Who holds a home (a lot's id, or 'cottage'), or null: free, or not known offline. */
  homeHolder(id: string): string | null;
  /** Buy a house sold outright (the Mirador's, Verandah's), or sell yours back. */
  buyVilla(id: string): void;
  sellVilla(): void;
  /** Which home is yours, if any (a lot's id, a house's, 'cottage'). */
  myHouseId(): string | null;
  /** Hire a rowing boat from the nearest boatman (data/content/boats.ts) and put the player in her. */
  hireBoat(): void;
  /** At a shipwright (data/naval.ts, game/Sailing.ts): hire, build, call round, raise, paint or name a ship. */
  /** Sit down to a game of Quarters with someone who plays (data/cards.ts OPPONENTS). */
  playQuarters(npc: string): void;
  /** Amberwold Downs' bookmaker: bet on the next race (game/Races.ts). */
  openBook(): void;
  /** Dice, Find the Lady or BS at a keeper's table (data/tavernGames.ts). */
  playTavern(npc: string, game?: 'crown' | 'lady' | 'bs' | 'bj' | 'fish' | 'poker' | 'menu'): void;
  /** Guild halls on Hall Row (data/guildhalls.ts), as the realm last said: your guild, whether you may lease, its hall, the free ones, its vault's marks. */
  guildHall(): { online: boolean; guild: string | null; officer: boolean; hall: string | null; free: string[]; vaultMarks: number };
  /** Lease a hall for your guild, from its vault (an officer's or the leader's to do). */
  leaseHall(id: string): void;
  /** The guild panel, open on its hall page. */
  openHallPage(): void;
  naval(action: 'hire' | 'build' | 'call' | 'salvage' | 'paint' | 'sail' | 'name' | 'below' | 'refit', arg?: string): void;
  fairOn(): boolean;
  fairPlay(game: string): void;
  fairPlaysLeft(game: string): number;
  fairGuessed(): boolean;
  /** Companions (data/companions.ts, game/Companions.ts): bring one along, send them home, rapport and the rest. */
  compJoin(id: string): void;
  compDismiss(): void;
  compLeave(id: string): void;
  compRapport(id: string, delta: number): void;
  /** Choose something from your pack to give them (data/companionGifts.ts). */
  compGift(id: string): void;
  /** Whether you've anything they could be given. */
  compCanGift(): boolean;
  /** Their gear: what they wear that you gave them, and what in your pack they could. */
  compGear(id: string): void;
  /** A companion's rank and skills window (data/companionRanks.ts). */
  compSkills?(id: string): void;
  /** Send a companion to work (data/companionWork.ts). */
  compWork?(id: string): void;
  compActive(): string | null;
  /** Play a conversation where you stand (a quest spot's scene): the tree registered under this id, with this voice for its unmarked lines. */
  playScene(id: string, who: { name: string; title: string; look: import('../entities/humanoid').Appearance }): void;
  /** Music for a hard moment in the story (systems/music/Score.ts: the lament), for this many seconds. */
  storyTheme(theme: 'lament' | 'wonder' | 'ruins', seconds?: number): void;
  /** Are you within r blocks of (x, z)? (A companion's story is told where it happened.) */
  compNear(x: number, z: number, r: number): boolean;
  compHour(): number;
  compOutfit(id: string, outfit: string): void;
  /** Selling the house you bought (data/content/homeSale.ts): its name, what it fetches sold back, its price, the furniture out, and whether the realm is there. */
  homeSellView?(): { name: string; back: number; price: number; pieces: number; online: boolean } | null;
  homeSellBack?(): void;
  homeSellToPlayer?(furnished: boolean): void;
  /** The Hollin Ford Show (data/farmingFive.ts): each class, your best entry for it, whether you've entered today, your best place this season. */
  showView?(): { id: import('../data/farmingFive').ShowClass; name: string; says: string; best: { item: string; name: string } | null; today: boolean; place: number }[];
  /** Put your best for a class on the judges' table. */
  showEnter?(cls: import('../data/farmingFive').ShowClass): void;
  /** The pet at your heels (data/petCare.ts): who it is, how it is, and its wardrobe. Null with none out. */
  petInfo(): { id: string; kind: string; breed: string; name: string; named: boolean; bond: number; tier: string; fed: number; washed: number; played: number; spirits: number; mood: string; collarOpen: boolean; collar?: string; neck?: string; head?: string; back?: string; wardrobe: Record<'neck' | 'head' | 'back', { id: string; name: string; owned: boolean; dyed: boolean; how: string }[]> } | null;
  /** Look after it: feed, brush, play, or a fuss (stroke it). */
  petCare(k: 'fed' | 'washed' | 'played' | 'fuss'): void;
  /** Your horse where she stands (data/horseCare.ts, data/content/horseCare.ts), and seeing to her. */
  horseInfo?(): { name: string; named: boolean; level: number; levelName: string; next: number | null; health: number; stamina: number; dirt: number; healthWord: string; staminaWord: string; coat: string; feeds: { id: string; label: string }[] } | null;
  horseTend?(how: 'pat' | 'brush' | 'feed', feed?: string): void;
  horseRename?(): void;
  /** Give it a name (asks for one). */
  petRename(): void;
  /** Dress it: a collar's colour, or a piece in a slot and its colour (null takes it off). */
  petDress(slot: 'collar' | 'neck' | 'head' | 'back', value: string | null, color?: string): void;
  compRole(id: string, role: string): void;
  /** A part of their story is done (2 or 3): a banner and a little more trust. */
  compStory(id: string, part: number): void;
  addMarks(n: number): void;
  /** A crime done here, worth this much to the nearest town's book (the Outlaw Fortnight's hold-up: game/Justice.ts). */
  crimeHere(worth: number): void;
  /** Experience in a skill (farming orders, and the like). */
  addXp(skill: import('../data/items').SkillId, n: number): void;
  level(skill: SkillId): number;
  hasTool(skill: SkillId): boolean;
  toast(text: string): void;
  /** Opens a trader's panel; defaults to Tamsin's stall. Ids are keys of SHOPS. */
  openShop(id?: string): void;
  /** The Endless Tower (game/Tower.ts): start a run from floor 1 or a cleared checkpoint, your best, the starts open to you, and whether you're climbing. */
  towerBegin(from: number): string | null;
  towerBest(): number;
  /** Crowle's book: the realm's highest climbers (null offline, or before the realm has answered). */
  climbers(): { name: string; floor: number }[] | null;
  towerStarts(): number[];
  towerClimbing(): boolean;
  /** Lead your group up the tower from a floor (1, or a checkpoint you've cleared); why not, if not. */
  towerGroup(from: number): string | null;
  /** Leading a group, online. */
  towerLeads(): boolean;
  /** The day's and the week's climbs: floors cleared toward each, and whether paid. */
  towerTally(): { day: { floors: number; paid: boolean }; week: { floors: number; paid: boolean } };
  /** At an infirmary (data/infirmary.ts): every harm off you and full health, for the fee (free when you're poor); why not, or null. */
  treat(): string | null;
  openCrafting(station: Station, at?: { x: number; y: number; z: number }): void;
  /** Opens the Charter Post panel at the given stop (an id from POSTS). */
  openTravel(from: string): void;
  /** Take the packet to the other land (Gullmouth to Callis, or back): the page reloads into it. */
  crossLand(to: import('../world/land').LandId): void;
  /** Jago calls a duel in the Cockpit at Saltpenny (an id from data/duels.ts). */
  duel(id: string): void;
  /** One of Dave Kitto's fights (game/Reckoning.ts): Kezia on the quay, or the Reckoner at Gullmouth Light. */
  bout(id: 'kezia' | 'reckoner'): void;
  boutActive(): boolean;
  /** The law (game/Justice.ts): every town's price on you, and a fixer's fee to clear it all; clearing it. */
  bounties(): { total: number; fee: number };
  /** The Lamp Company (data/pledges.ts): today's pledge and how it stands; taking it; going back with it cleared (keys paid). */
  pledge(): { name: string; state: 'open' | 'taken' | 'done' | 'paid' } | null;
  takePledge(): void;
  turnInPledge(): number;
  clearName(): boolean;
  /** Opens a notice board (an id from the content BOARDS). */
  openBoard(id: string): void;
  startCasting(): void;
  /** Carry the player somewhere close by (a hoist basket, a rope): they arrive standing at (x, y, z). */
  ride(x: number, y: number, z: number, line?: string): void;
  /** The ground lurches under the player: a camera shake and a thud. */
  quake(strength?: number): void;
  playerName: string;
  /** Wendside Cottage: offer it for sale, or start arranging it. */
  buyHome(): void;
  arrangeHome(): void;
  /** A lot's stake: lease it, or draw up plans for a house on it. */
  lotAction(id: string): void;
  /** The Charter Bank's vault, at one of its counters (an id from BANKS). */
  openBank(id: string): void;
  /** The account's vault, opened somewhere that isn't a bank (the owner's chests at home). */
  openVaultAt(name: string, x: number, z: number): void;
  /** The signed-in account's name, or null playing as a guest. */
  accountName(): string | null;
  /** The Exchange's book, from a broker. */
  openExchange(): void;
  /** Your letters, at a Charter Post box. */
  openMail(): void;
}

export interface DOption {
  text: string | ((g: GameApi) => string);
  /** Node to go to. Omit to end the conversation. */
  next?: string;
  cond?: (g: GameApi) => boolean;
  effect?: (g: GameApi) => void;
  /** The moral weight of choosing it (data/morality.ts): written in the book of deeds when chosen, once. */
  moral?: DeedInput;
  /** Only offered when the character qualifies: alignment, traits, regard, feelings, past deeds. Shows its tag ("Heroic") when offered. */
  need?: Need;
  /** Hide the light or dark mark this option's weight would show. */
  quiet?: boolean;
}

export interface DNode {
  text: string | ((g: GameApi) => string);
  /** Defaults to the NPC. 'narrator' renders in italics. */
  speaker?: 'npc' | 'narrator';
  /** Not quest content and too wide to walk (the shipyard's designer: every part in every slot): the quest walker reads its text and stops. */
  noWalk?: boolean;
  /** Somebody else in the scene says this line: a companion's id, or another person's NPC id. */
  as?: string;
  options?: DOption[];
  next?: string;
  effect?: (g: GameApi) => void;
}

export interface DialogueTree {
  start: (g: GameApi) => string;
  nodes: Record<string, DNode>;
}
