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
  addMarks(n: number): void;
  level(skill: SkillId): number;
  hasTool(skill: SkillId): boolean;
  toast(text: string): void;
  /** Opens a trader's panel; defaults to Tamsin's stall. Ids are keys of SHOPS. */
  openShop(id?: string): void;
  openCrafting(station: Station): void;
  /** Opens the Charter Post panel at the given stop (an id from POSTS). */
  openTravel(from: string): void;
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
