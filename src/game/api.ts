import { SkillId } from '../data/items';
import { Station } from '../data/gameplay';

/** The narrow surface dialogue, quests and interactables use to read and change the game. */
export interface GameApi {
  flag(key: string): unknown;
  setFlag(key: string, value?: unknown): void;
  stage(quest: string): string | undefined;
  setStage(quest: string, stage: string): void;
  count(item: string): number;
  has(item: string, n?: number): boolean;
  give(item: string, n?: number): boolean;
  take(item: string, n?: number): boolean;
  readonly marks: number;
  /** The Wake Fair (game/WakeFair.ts): is it up, step up to a game, prized plays left today, the day's guess made. */
  /** Pin a place on the map (the land book's "show me"). */
  markOnMap(x: number, z: number, label: string): void;
  /** Hire a rowing boat from the nearest boatman (data/content/boats.ts) and put the player in her. */
  hireBoat(): void;
  fairOn(): boolean;
  fairPlay(game: string): void;
  fairPlaysLeft(game: string): number;
  fairGuessed(): boolean;
  /** Companions (data/companions.ts, game/Companions.ts): bring one along, send them home, rapport and the rest. */
  compJoin(id: string): void;
  compDismiss(): void;
  compLeave(id: string): void;
  compRapport(id: string, delta: number): void;
  compActive(): string | null;
  /** Are you within r blocks of (x, z)? (A companion's story is told where it happened.) */
  compNear(x: number, z: number, r: number): boolean;
  compHour(): number;
  compOutfit(id: string, outfit: string): void;
  compRole(id: string, role: string): void;
  /** A part of their story is done (2 or 3): a banner and a little more trust. */
  compStory(id: string, part: number): void;
  addMarks(n: number): void;
  level(skill: SkillId): number;
  hasTool(skill: SkillId): boolean;
  toast(text: string): void;
  /** Opens a trader's panel; defaults to Tamsin's stall. Ids are keys of SHOPS. */
  openShop(id?: string): void;
  openCrafting(station: Station): void;
  /** Opens the Charter Post panel at the given stop (an id from POSTS). */
  openTravel(from: string): void;
  /** Take the packet to the other land (Gullmouth to Callis, or back): the page reloads into it. */
  crossLand(to: import('../world/land').LandId): void;
  /** Jago calls a duel in the Cockpit at Saltpenny (an id from data/duels.ts). */
  duel(id: string): void;
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
}

export interface DNode {
  text: string | ((g: GameApi) => string);
  /** Defaults to the NPC. 'narrator' renders in italics. */
  speaker?: 'npc' | 'narrator';
  options?: DOption[];
  next?: string;
  effect?: (g: GameApi) => void;
}

export interface DialogueTree {
  start: (g: GameApi) => string;
  nodes: Record<string, DNode>;
}
