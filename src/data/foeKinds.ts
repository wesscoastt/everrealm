import type { EnemyDef, EnemyType } from './gameplay';
import type { OffhandModel } from '../entities/humanoid';

// The new kinds of foe (docs/COMBAT.md, stage F), one in every region's spawn table: casters who
// gather a bolt in a gold ring (stun them to break it, or roll as it comes), menders who heal the
// rest of the pack (kill them first, or break the heal), guards behind a shield (go round, or stun
// them), and summoners who call more of the region's beasts (break the call). Five of each.
//
// Each is written against its region's own foes: the numbers start from what the region's commonest
// foe has at the region's level, then lean the way the kind does (a caster is frail and hits hard, a
// guard is the other way about). Everything still meets you at your own level (data/scaling.ts).

export type FoeKindType =
  | 'wolfwife' | 'roadbully' | 'herbwife' | 'lampwrecker' | 'claimguard' | 'shardseeker' | 'bonesetter'
  | 'adderwife' | 'bailiff' | 'greysister' | 'mitekeeper' | 'keener' | 'wreckbosun' | 'gladehermit'
  | 'resinburner' | 'quarryforeman' | 'houndsman' | 'glassblower' | 'gravewarden' | 'wightpriest';

/** A region's commonest foe at the region's level: level, health, damage, experience, marks, respawn. */
type Lead = { level: number; hp: number; damage: number; xp: number; marks: [number, number]; respawn: number };
const L = (level: number, hp: number, damage: number, xp: number, marks: [number, number], respawn = 120): Lead => ({ level, hp, damage, xp, marks, respawn });

/** How each kind leans from its region's lead, and how it fights. */
const LEAN = {
  cast: { hp: 0.75, damage: 1.2, speed: 4.4, aggro: 16, leash: 34, attack: 'cast', windup: 1.5, range: 15, cooldown: 3.2 },
  mend: { hp: 0.85, damage: 0.8, speed: 4.6, aggro: 14, leash: 32, attack: 'lunge', windup: 0.6, range: 2.5, cooldown: 1.8 },
  guard: { hp: 1.35, damage: 0.9, speed: 4.4, aggro: 13, leash: 30, attack: 'lunge', windup: 0.7, range: 2.6, cooldown: 2.0 },
  summon: { hp: 1.0, damage: 0.9, speed: 4.4, aggro: 15, leash: 32, attack: 'cast', windup: 1.6, range: 14, cooldown: 3.6 },
} as const;
type Lean = keyof typeof LEAN;

function foe(type: FoeKindType, name: string, lean: Lean, lead: Lead, rest: Partial<EnemyDef> & Pick<EnemyDef, 'look' | 'loot'>): EnemyDef {
  const k = LEAN[lean];
  return {
    type: type as EnemyType, model: 'bandit', held: 'none', name, level: lead.level,
    hp: Math.round(lead.hp * k.hp), damage: Math.round(lead.damage * k.damage), speed: k.speed, aggro: k.aggro, leash: k.leash,
    attack: k.attack, windup: k.windup, range: k.range, cooldown: k.cooldown,
    xp: Math.round(lead.xp * 1.3), marks: [Math.round(lead.marks[0] * 1.25), Math.round(lead.marks[1] * 1.25)], respawn: lead.respawn,
    role: lean === 'cast' ? undefined : lean,
    ...rest,
  };
}

// Things carried in the other hand
const shield = (face: string, rim: string, family: OffhandModel['family'] = 'round', boss?: string): OffhandModel => ({ family, face, rim, boss });
const lamp = (glow: string): OffhandModel => ({ family: 'lantern', face: '#3a3020', rim: '#2a2218', glow });
const book = (face: string, glow?: string): OffhandModel => ({ family: 'tome', face, rim: '#2a1e14', glow });
const focus = (glow: string): OffhandModel => ({ family: 'focus', face: glow, rim: '#3a342c', glow });

export const FOE_KINDS: Record<FoeKindType, EnemyDef> = {
  // ---- The Charter Counties
  // Greenwake: an old woman who keeps the heath's wolves fed, and whistles them in when she's crossed
  wolfwife: foe('wolfwife', 'Wolf-wife', 'summon', L(4, 70, 9, 40, [1, 4], 100), {
    look: { tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#3a3430', hat: 'hood', hatColor: '#4a3e30', age: 0.95, frame: 'f', build: 0.9 },
    calls: 'wolf', callN: 2, bolt: '#c8b890', loot: [{ item: 'wolf_pelt', chance: 0.5 }, { item: 'bread', chance: 0.3 }],
  }),
  // Crownroad: a big man with a cartwheel hub for a shield, who stands in the road and dares you
  roadbully: foe('roadbully', 'Turnpike bully', 'guard', L(8, 125, 13, 72, [2, 5], 120), {
    look: { tunic: '#5a3a2a', trim: '#8a6a3a', trousers: '#3a3430', hat: 'cap', hatColor: '#3a2a1e', build: 1.2, facial: 3 },
    held: 'hammer', offhand: shield('#6a4a2a', '#3a3a3a', 'round', '#8a8a8a'), loot: [{ item: 'bread', chance: 0.4 }, { item: 'copper_ore', chance: 0.3 }],
  }),
  // Brambledeep: the poachers' herb-wife, who keeps them on their feet with what grows under the thorns
  herbwife: foe('herbwife', 'Herb-wife', 'mend', L(13, 210, 19, 130, [4, 9]), {
    look: { tunic: '#4a5a3a', trim: '#8a9a5a', trousers: '#3a3a2a', hat: 'kerchief', hatColor: '#6a7a3a', frame: 'f', age: 0.7 },
    attack: 'cast', windup: 1.4, range: 13, cooldown: 3.0, bolt: '#9ad06a', offhand: book('#3a4a2a', '#9ad06a'),
    loot: [{ item: 'cutting_vine', chance: 0.4 }, { item: 'bread', chance: 0.3 }],
  }),
  // Saltwind: she swings a lamp on the cliff on dark nights so the ships think it's the harbour
  lampwrecker: foe('lampwrecker', 'Lamp wrecker', 'cast', L(14, 240, 20, 150, [4, 8]), {
    look: { tunic: '#2e3a4a', trim: '#a8a090', trousers: '#2a2a30', hat: 'wide', hatColor: '#2a2a2a', frame: 'f' },
    bolt: '#ffb040', offhand: lamp('#ffb040'), loot: [{ item: 'lamp_oil', chance: 0.5 }, { item: 'salt_cod', chance: 0.25 }],
  }),
  // Redstone: hired to hold a claim, and paid by the day whether or not he holds it
  claimguard: foe('claimguard', 'Hired claim guard', 'guard', L(18, 300, 24, 200, [6, 12]), {
    look: { tunic: '#7a4a2a', trim: '#c87a3a', trousers: '#4a3a2a', hat: 'cap', hatColor: '#5a3a1a', build: 1.15 },
    held: 'pickaxe', offhand: shield('#8a5a3a', '#4a4a4a', 'heater'), loot: [{ item: 'copper_ore', chance: 0.5 }, { item: 'iron_ore', chance: 0.25 }],
  }),
  // Starfall: one who came for the fallen glass and stayed too long near it; it answers her now
  shardseeker: foe('shardseeker', 'Shard-seeker', 'cast', L(27, 520, 36, 380, [10, 18], 140), {
    look: { skin: '#d8d4e0', eyes: '#c8f4ff', tunic: '#3a3e5a', trim: '#9fe8ff', trousers: '#2a2a3a', hat: 'hood', hatColor: '#2e3250', frame: 'f' },
    bolt: '#9fe8ff', offhand: focus('#9fe8ff'), loot: [{ item: 'star_crystal', chance: 0.35 }, { item: 'black_shard', chance: 0.1 }],
  }),
  // Gannet: the Eyrie robbers' bonesetter; a fall off the cliff path is the common complaint
  bonesetter: foe('bonesetter', 'Eyrie bonesetter', 'mend', L(10, 130, 14, 80, [2, 5], 100), {
    look: { tunic: '#5a5a5a', trim: '#c8c0a8', trousers: '#3a3434', hat: 'kerchief', hatColor: '#c8c0a8', age: 0.8 },
    held: 'hatchet', loot: [{ item: 'bread', chance: 0.4 }, { item: 'rock_salt', chance: 0.3 }],
  }),
  // Wrath: the fen folk say the adders follow her about like ducklings
  adderwife: foe('adderwife', 'Adder-wife', 'summon', L(15, 230, 20, 150, [4, 8], 100), {
    look: { tunic: '#4a5a3a', trim: '#8a7a4a', trousers: '#3a3a2a', hat: 'straw', frame: 'f', age: 0.85 },
    calls: 'fenadder', callN: 2, bolt: '#7ac05a', loot: [{ item: 'smoked_eel', chance: 0.4 }, { item: 'bread', chance: 0.3 }],
  }),
  // Tolmen: the tinners' own law on the moor, and it doesn't care for yours
  bailiff: foe('bailiff', 'Stannary bailiff', 'guard', L(30, 600, 40, 430, [12, 20], 140), {
    look: { tunic: '#4a4a52', trim: '#c8a050', trousers: '#3a3434', hat: 'wide', hatColor: '#2a2a2e', cape: '#3a3a44', build: 1.15, facial: 2 },
    held: 'sword', offhand: shield('#4a4a52', '#c8a050', 'kite'), loot: [{ item: 'tin_ore', chance: 0.5 }, { item: 'silver_ore', chance: 0.15 }],
  }),
  // Inkholm: a sister of the Greyed, who tends them still and won't let them be put down
  greysister: foe('greysister', 'Grey sister', 'mend', L(22, 320, 26, 270, [6, 12], 140), {
    look: { skin: '#a4aa9c', tunic: '#7a7870', trim: '#d4ccbc', trousers: '#4a4844', hat: 'hood', hatColor: '#d4ccbc', frame: 'f', age: 0.6 },
    loot: [{ item: 'bread', chance: 0.4 }, { item: 'rock_salt', chance: 0.25 }],
  }),
  // Kell: keeps the brass mites in a box on her back and lets them out to eat
  mitekeeper: foe('mitekeeper', 'Mite-keeper', 'summon', L(36, 520, 46, 420, [10, 18], 110), {
    look: { skin: '#b8a090', tunic: '#5a3a2a', trim: '#c8a050', trousers: '#3a2a22', hat: 'cap', hatColor: '#3a2a1e', frame: 'f' },
    attack: 'throw', blast: 2.0, shot: '#c8a050', windup: 1.1, range: 12, cooldown: 3.0, calls: 'brassmite', callN: 3,
    loot: [{ item: 'brass_cog', chance: 0.5 }, { item: 'spirit_ember', chance: 0.1 }],
  }),
  // The Sickle: one of the drowned who keens on the shore, and the cold goes out from her like a wave
  keener: foe('keener', 'Drowned keener', 'cast', L(43, 980, 46, 580, [11, 20], 130), {
    look: { skin: '#c8dce8', eyes: '#c8f6ff', tunic: '#a8bcc8', trim: '#6a8498', trousers: '#8aa0b0', hat: 'hood', hatColor: '#c8d8e4', frame: 'f', age: 0.8 },
    bolt: '#c8f6ff', loot: [{ item: 'rime_shard', chance: 0.4 }, { item: 'frost_pelt', chance: 0.1 }],
  }),
  // ---- Morrow
  // The Keys: a wrecker crew's bosun with a ship's hatch cover for a shield
  wreckbosun: foe('wreckbosun', 'Wreck bosun', 'guard', L(44, 980, 38, 555, [11, 20]), {
    look: { skin: '#b07a50', tunic: '#e0d4b0', trim: '#2a6a7a', trousers: '#3a5a6a', hat: 'kerchief', hatColor: '#c83a2a', build: 1.2, facial: 4 },
    held: 'bronzeSword', offhand: shield('#8a6a4a', '#2a6a7a', 'tower'), loot: [{ item: 'salt_cod', chance: 0.4 }, { item: 'rock_salt', chance: 0.3 }],
  }),
  // The Glades: a hermit the glims have taken to; he lends them his lamp's light when they gutter
  gladehermit: foe('gladehermit', 'Glade hermit', 'mend', L(51, 1520, 51, 820, [12, 22]), {
    look: { skin: '#c8a888', tunic: '#5a6a3a', trim: '#c8d890', trousers: '#4a4a2a', hat: 'wide', hatColor: '#4a5a2a', age: 0.95, facial: 5 },
    attack: 'cast', windup: 1.4, range: 13, cooldown: 3.0, bolt: '#e8f0a0', offhand: lamp('#e8f0a0'),
    loot: [{ item: 'cutting_vine', chance: 0.4 }, { item: 'olive_bread', chance: 0.3 }],
  }),
  // The Amberwold: burns the old trees' resin for the smoke, and throws it burning
  resinburner: foe('resinburner', 'Resin-burner', 'cast', L(56, 1100, 55, 705, [13, 23]), {
    look: { tunic: '#7a4a1a', trim: '#e8a040', trousers: '#4a3a22', hat: 'kerchief', hatColor: '#a86a2a', build: 1.0 },
    bolt: '#ffa030', offhand: focus('#ffa030'), loot: [{ item: 'wold_bread', chance: 0.3 }, { item: 'lamp_oil', chance: 0.3 }],
  }),
  // The Bright: a terrace quarry's foreman, behind a slab of a shield, keeping trespassers off the cut
  quarryforeman: foe('quarryforeman', 'Quarry foreman', 'guard', L(60, 1020, 63, 715, [14, 24]), {
    look: { skin: '#c89070', tunic: '#c8b898', trim: '#7a6a4a', trousers: '#6a5a4a', hat: 'straw', build: 1.25 },
    held: 'hammer', offhand: shield('#a89878', '#6a5a4a', 'tower'), loot: [{ item: 'iron_ore', chance: 0.4 }, { item: 'olive_bread', chance: 0.3 }],
  }),
  // The Sunder: keeps the rift wolves as a shepherd keeps dogs, and they come to her whistle
  houndsman: foe('houndsman', 'Rift houndsman', 'summon', L(67, 1500, 62, 985, [15, 26]), {
    look: { tunic: '#3a3a4a', trim: '#8a7ab8', trousers: '#2a2a34', hat: 'hood', hatColor: '#2a2a3a', frame: 'f', cape: '#2a2a3a' },
    calls: 'riftwolf', callN: 2, bolt: '#b8a0ff', loot: [{ item: 'iron_ore', chance: 0.3 }, { item: 'black_glass', chance: 0.15 }],
  }),
  // The Glass Flats: the reavers' glassblower, who throws what's still molten on the pipe
  glassblower: foe('glassblower', 'Reaver glassblower', 'cast', L(76, 2100, 74, 1170, [16, 28]), {
    look: { skin: '#a8704a', tunic: '#d8c8a0', trim: '#5a4a3a', trousers: '#8a7a5a', hat: 'kerchief', hatColor: '#e8e0d0' },
    bolt: '#ffd080', loot: [{ item: 'black_glass', chance: 0.4 }, { item: 'rock_salt', chance: 0.3 }],
  }),
  // The Greywaste: keeps the waste's dead, and wakes them when anyone comes digging
  gravewarden: foe('gravewarden', 'Grave-warden', 'summon', L(83, 1740, 82, 1045, [17, 30]), {
    look: { skin: '#b8b0a4', tunic: '#3a3a36', trim: '#8a8478', trousers: '#2a2a28', hat: 'wide', hatColor: '#2a2a28', age: 0.9, cape: '#2a2a26' },
    held: 'pickaxe', calls: 'risen', callN: 1, bolt: '#a8c8b0', loot: [{ item: 'silver_ore', chance: 0.3 }, { item: 'bread', chance: 0.3 }],
  }),
  // The Held: a priest of the old king's barrows, who mends the wights as fast as you break them
  wightpriest: foe('wightpriest', 'Wight-priest', 'mend', L(95, 2950, 89, 1465, [18, 32]), {
    look: { skin: '#c0c8c8', eyes: '#9fe8ff', tunic: '#2a2a30', trim: '#b8a878', trousers: '#22222a', hat: 'circlet', hatColor: '#b8a878', age: 0.95, cape: '#1e1e24' },
    attack: 'cast', windup: 1.4, range: 14, cooldown: 3.0, bolt: '#9fe8ff', offhand: book('#1e1e24', '#9fe8ff'),
    loot: [{ item: 'silver_ore', chance: 0.4 }, { item: 'black_shard', chance: 0.1 }],
  }),
};

/** Which region each new kind belongs to (its spawn table: data/gameplay.ts REGION_SPAWNS). */
export const FOE_KIND_REGION: Record<FoeKindType, string> = {
  wolfwife: 'greenwake', roadbully: 'crownroad', herbwife: 'brambledeep', lampwrecker: 'saltwind', claimguard: 'redstone',
  shardseeker: 'starfall', bonesetter: 'gannet', adderwife: 'wrath', bailiff: 'tolmen', greysister: 'inkholm',
  mitekeeper: 'kell', keener: 'sickle', wreckbosun: 'keys', gladehermit: 'glades', resinburner: 'amberwold',
  quarryforeman: 'bright', houndsman: 'sunder', glassblower: 'glassflats', gravewarden: 'greywaste', wightpriest: 'held',
};
