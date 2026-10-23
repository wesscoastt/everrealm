// Callings: the five ways to fight in the Charter Counties. The bar is Guild Wars 2's: your weapon's
// skills (Strike, Cleave and a third that depends on the weapon in your hand, keys 1 to 3), then the
// calling's heal (4), three utilities (5 to 7: its signature, and two you choose from three) and an
// elite (8). Some are aimed at
// the ground: they land where the cursor points (on a touch screen, on your target). Everyone shares
// the dodge roll (Q) and eating (F). Each calling also has a mechanic, in the manner of a GW2
// profession, and plays one of ESO's roles. None is stronger than another: they
// trade damage, safety and reach (see scripts/classbalance.ts for the numbers they're tuned to).
// A calling is chosen when a character is made and kept for life, as in WoW and ESO. From level 25
// a master of another calling will teach an apprentice one of their utilities (data/content/masters.ts).
// Each calling has three talent trees (data/talents.ts), one for each way of playing it.

export type CallingId = 'warden' | 'reaver' | 'ashcaller' | 'pathfinder' | 'wizard';

export interface SkillDef {
  id: string;
  name: string;
  /** Icon kind (drawn in ui/icons.ts). */
  icon: string;
  /** Seconds between uses. */
  cd: number;
  desc: string;
  /** Aimed at the ground: lands at the point under the cursor, up to this many blocks away. */
  aim?: number;
}

export interface CallingDef {
  id: CallingId;
  name: string;
  role: string;
  blurb: string;
  mechanic: { name: string; desc: string; color: string };
  /** The heal, the first utility and the elite (what the calling card shows first). */
  skills: [SkillDef, SkillDef, SkillDef];
  /** The calling's other utilities: skills[1] is its signature and always on the bar (key 5); two of these go beside it (6 and 7). */
  utilities: SkillDef[];
  /** Shown in the creator: how it plays in a line each. */
  pros: string;
  cons: string;
}

export const CALLINGS: CallingDef[] = [
  {
    id: 'warden', name: 'Warden', role: 'Shield and steadiness',
    blurb: 'Stands in front and lets the blows come. The charter wardens kept the tolls and the peace on the old roads, and they still hold a line when the wolves come down.',
    mechanic: { name: 'Resolve', desc: 'Every blow you take adds Resolve (up to five), and each takes 5% off the damage you take. It fades if nothing hits you for six seconds.', color: '#7fb0e0' },
    skills: [
      { id: 'bulwark', name: 'Bulwark', icon: 'shield', cd: 18, desc: 'A ward that soaks up damage equal to almost a third of your health, for eight seconds.' },
      { id: 'bash', name: 'Shield Bash', icon: 'bash', cd: 8, desc: 'Strike your target hard and stun it for a second and a half.' },
      { id: 'oath', name: 'Oath of the Ring', icon: 'oath', cd: 60, desc: 'For six seconds you take 40% less damage, and everything within five blocks of you burns.' },
    ],
    utilities: [
      { id: 'holdfast', name: 'Hold Fast', icon: 'holdfast', cd: 20, desc: 'Plant your feet: for four seconds nothing knocks you back, and you take 30% less damage.' },
      { id: 'shieldthrow', name: 'Shield Throw', icon: 'shieldthrow', cd: 10, desc: 'Throw your shield at your target from up to fourteen blocks. It strikes hard and staggers it.' },
      { id: 'rally', name: 'Rally', icon: 'rally', cd: 25, desc: 'Get your breath back: heal a sixth of your health and gather full Resolve.' },
    ],
    pros: 'Hardest to bring down; stuns', cons: 'Lowest damage',
  },
  {
    id: 'reaver', name: 'Reaver', role: 'Close-in fury',
    blurb: 'Fights up close and fast, and heals by bleeding what it fights. Harrowgate breaks them from slag-yard brawlers and drovers who outlasted the road wolves.',
    mechanic: { name: 'Fury', desc: 'Every blow you land builds Fury. At full Fury your next skill hits half again as hard.', color: '#e0583a' },
    skills: [
      { id: 'bleed', name: 'Bloodletting', icon: 'bleed', cd: 10, desc: 'Open a wound that bleeds for six seconds. The cut and every second of bleeding heal you a little.' },
      { id: 'leap', name: 'Leaping Cut', icon: 'leap', cd: 12, aim: 10, desc: 'Leap to where you aim, up to ten blocks, and strike everything where you land.' },
      { id: 'redhour', name: 'The Red Hour', icon: 'redhour', cd: 60, desc: 'For ten seconds you deal 40% more damage, and take 20% more.' },
    ],
    utilities: [
      { id: 'rend', name: 'Rend', icon: 'rend', cd: 9, desc: 'A wide cut through everything in front of you, leaving them bleeding.' },
      { id: 'rush', name: 'Blood Rush', icon: 'rush', cd: 18, desc: 'For six seconds you swing 40% faster.' },
      { id: 'hamstring', name: 'Hamstring', icon: 'hamstring', cd: 12, desc: 'Cut your target behind the knee: it takes a blow and can\'t move for over a second.' },
    ],
    pros: 'Highest damage; heals by fighting', cons: 'Takes more harm; melee only',
  },
  {
    id: 'ashcaller', name: 'Kindler', role: 'Fire from a distance',
    blurb: 'Calls fire and falling stars from a distance. The Glass Kirk teaches it to anyone who can sit still long enough to listen to a star.',
    mechanic: { name: 'Kindling', desc: 'Each Ember Bolt adds Kindling. The third bursts in a ball of fire that scorches everything near the target.', color: '#f0a040' },
    skills: [
      { id: 'ward', name: 'Cinder Ward', icon: 'ward', cd: 22, desc: 'Wrap yourself in embers: heal a third of your health over five seconds while foes beside you burn.' },
      { id: 'bolt', name: 'Ember Bolt', icon: 'bolt', cd: 1.6, desc: 'Throw a bolt of fire at your target from up to twenty-two blocks.' },
      { id: 'starfall', name: 'Starfall', icon: 'star', cd: 60, aim: 22, desc: 'Call down a star where you aim: after a moment it strikes everything in a wide ring.' },
    ],
    utilities: [
      { id: 'firewall', name: 'Ring of Fire', icon: 'firewall', cd: 15, aim: 18, desc: 'Set the ground alight where you aim: for five seconds it burns whatever stands in it.' },
      { id: 'cinderstep', name: 'Cinder Step', icon: 'cinderstep', cd: 16, desc: 'Leap back out of reach, and leave a patch of burning cinders where you stood.' },
      { id: 'kindle', name: 'Kindle', icon: 'kindle', cd: 12, desc: 'Gather two Kindling at once, and your next Ember Bolt strikes twice as hard.' },
    ],
    pros: 'Fights from range; big area damage', cons: 'Fragile up close',
  },
  {
    id: 'pathfinder', name: 'Pathfinder', role: 'Arrows and quick feet',
    blurb: 'Marks its quarry with arrows and is behind it before it turns. The Hagworm fellers and the coast trackers trade the craft in both directions.',
    mechanic: { name: 'Mark', desc: 'Volley marks its target, and anything close by, for six seconds: everything you do to a marked foe hits 15% harder.', color: '#8ad06a' },
    skills: [
      { id: 'dressing', name: 'Field Dressing', icon: 'dressing', cd: 20, desc: 'Bind your wounds: heal nearly half your health at once.' },
      { id: 'volley', name: 'Volley', icon: 'volley', cd: 5, desc: 'Loose three arrows at your target from up to twenty-two blocks, and mark it and everything within four blocks of it.' },
      { id: 'shadowstep', name: 'Shadowstep', icon: 'step', cd: 20, desc: 'Step out of sight and appear behind your target. Your next Strike within three seconds is a heavy critical blow.' },
    ],
    utilities: [
      { id: 'snare', name: 'Snare', icon: 'snare', cd: 14, aim: 14, desc: 'Set a snare where you aim. The first creature to step in is caught fast for two seconds, and hurt.' },
      { id: 'rain', name: 'Rain of Arrows', icon: 'rain', cd: 18, aim: 20, desc: 'Loose arrows high over where you aim: for four seconds they fall on everything there.' },
      { id: 'quickstep', name: 'Quickstep', icon: 'quickstep', cd: 10, desc: 'Spring back out of reach. Your next Strike within four seconds is a heavy critical blow.' },
    ],
    pros: 'Range and mobility; burst', cons: 'Little to soak a long fight',
  },
  {
    id: 'wizard', name: 'Wizard', role: 'Frost and the old words',
    blurb: 'Speaks the cold into things until they freeze. The keepers at Scarth Watch learned it from the winters on the high pasture, and write every word of it down.',
    mechanic: { name: 'Chill', desc: 'Frost Bolt, Blizzard and Frost Nova chill what they hit. At three Chill a foe freezes solid for a moment and cracks for extra damage.', color: '#8ad8f0' },
    skills: [
      { id: 'icebarrier', name: 'Ice Barrier', icon: 'icebarrier', cd: 22, desc: 'A shell of ice that soaks up damage equal to almost a third of your health, for ten seconds.' },
      { id: 'frostbolt', name: 'Frost Bolt', icon: 'frostbolt', cd: 1.6, desc: 'Throw a shard of ice at your target from up to twenty-two blocks. It chills what it hits.' },
      { id: 'blizzard', name: 'Blizzard', icon: 'blizzard', cd: 60, aim: 20, desc: 'Call a storm down where you aim: for six seconds it cuts and chills everything under it.' },
    ],
    utilities: [
      { id: 'blink', name: 'Blink', icon: 'blink', cd: 14, aim: 10, desc: 'Vanish and step out of the air up to ten blocks away, where you aim. Nothing touches you for a moment.' },
      { id: 'icelance', name: 'Ice Lance', icon: 'icelance', cd: 8, desc: 'A long spear of ice at your target. It hits more than twice as hard on a frozen foe.' },
      { id: 'frostnova', name: 'Frost Nova', icon: 'frostnova', cd: 16, desc: 'Cold bursts out of you: everything within five blocks is hurt and frozen for two seconds.' },
    ],
    pros: 'Fights from range; freezes foes in place', cons: 'Little damage up close',
  },
];

export const callingById = (id: unknown): CallingDef | null => CALLINGS.find((c) => c.id === id) ?? null;

/**
 * Every number the callings' skills use, in one place for the game (game/ClassKit.ts) and the
 * balance check (npm run balance). Damage is in multiples of an ordinary swing at your level ("P");
 * healing and shields are fractions of your health.
 */
export const TUNE = {
  /** Using a calling skill costs this much swinging time, so skills trade against Strike for everyone. */
  skillLock: 0.5,
  /** Skills recharging faster (talents): a multiplier on the cooldown, by skill id. */
  cd: {} as Record<string, number>,
  /** dmg: share added to the damage you deal, for each Resolve (talents). */
  resolve: { per: 0.05, max: 5, fade: 6, dmg: 0 },
  /** burst: the blow when it's broken (0 none); mend: share of what's left that heals you when it runs out. */
  bulwark: { shield: 0.3, secs: 8, burst: 0, burstStun: 0, mend: 0 },
  /** cleave: the radius round the target it also strikes (0 none). */
  bash: { dmg: 1.8, stun: 1.5, range: 3.6, cleave: 0 },
  /** heal: share of your health a second while it holds. */
  oath: { secs: 6, taken: 0.6, burn: 0.6, r: 5, heal: 0 },
  /** red: Fury gained in the Red Hour, as a multiple. */
  fury: { perHit: 8, mult: 1.5, red: 1 },
  /** heal: a second of bleeding; cutHeal: the cut itself; spread: how far a bleed jumps from the dead (0 not). */
  bleed: { dmg: 1.4, dot: 0.4, secs: 6, heal: 0.03, cutHeal: 0.03, range: 3.2, spread: 0 },
  leap: { dmg: 2.4, r: 2.8, range: 10, stun: 0 },
  redhour: { secs: 10, dealt: 1.4, taken: 1.2 },
  ward: { heal: 0.33, secs: 5, burn: 0.35, r: 4 },
  bolt: { dmg: 1.5, range: 22, burst: 1.2, r: 3, every: 3 },
  /** twice: a second star's strength (0 none). */
  starfall: { dmg: 5, r: 4.5, delay: 1.1, range: 22, twice: 0 },
  /** hot: a further share of health over five seconds. */
  dressing: { heal: 0.45, hot: 0 },
  volley: { arrows: 3, dmg: 0.8, range: 22, mark: 6, markBonus: 0.15, markR: 4 },
  shadowstep: { stun: 0.8, mult: 3, window: 3, range: 16 },
  // Utilities (each calling puts two of its three beside the signature)
  holdfast: { secs: 4, taken: 0.7 },
  shieldthrow: { dmg: 1.5, stun: 0.8, range: 14, bounce: 0 },
  rally: { heal: 0.17 },
  rend: { dmg: 1.4, dot: 0.25, secs: 4, r: 3.4 },
  rush: { secs: 6, speed: 1.4 },
  hamstring: { dmg: 1.2, stun: 1.3, range: 3.4 },
  /** heal: share of your health a second standing in your own fire (the ring or cinders). */
  firewall: { r: 3.5, secs: 5, burn: 0.45, range: 18, heal: 0 },
  cinderstep: { dist: 7, r: 3, secs: 3, burn: 0.7 },
  kindle: { stacks: 2, mult: 2 },
  snare: { r: 1.6, stun: 2, dmg: 1.5, secs: 20, range: 14 },
  rain: { r: 4, secs: 4, dmg: 0.55, range: 20, mark: 0 },
  /** evade: seconds untouchable after it, or after a Shadowstep. */
  quickstep: { dist: 6, window: 4, evade: 0 },
  // Wizard
  chill: { max: 3, freeze: 1.2, shatter: 1.0, fade: 8 },
  /** nova: a Frost Nova when it breaks; bite: the chance a blow on it chills the attacker. */
  icebarrier: { shield: 0.3, secs: 10, nova: 0, bite: 0 },
  frostbolt: { dmg: 1.4, range: 22 },
  blizzard: { r: 5, secs: 6, dmg: 0.75, range: 20, chills: 1 },
  blink: { range: 10, evade: 1 },
  icelance: { dmg: 1.6, frozen: 2.2, range: 22 },
  frostnova: { r: 5, dmg: 0.8, freeze: 2 },
  // Weapon skills (key 3, every calling: by the weapon in hand)
  riposte: { secs: 1.2, dmg: 2.2 },
  flurry: { hits: 4, dmg: 0.6, every: 0.16, range: 3.2 },
  sunder: { dmg: 2.4, r: 2.6, stun: 0.8, delay: 0.35, range: 6 },
};

/**
 * The bar fills as you level, as in the big online games: Strike from the start, then Cleave, the
 * calling's heal, its signature, the weapon skill, the two utilities and last the elite. By bar key
 * (useAbility's index: 0 Strike, 1 Cleave, 2 the weapon skill, 3 the heal, 4 the signature, 5 and 6
 * the utilities, 7 the elite); the dodge roll and eating are there from the start.
 */
export const UNLOCK_AT = [1, 2, 6, 3, 4, 8, 12, 16];
/** What each key's skill is called while it's still locked (the calling's own names come in once known). */
export const UNLOCK_NAMES = ['Strike', 'Cleave', 'your weapon skill', 'your calling\'s heal', 'your calling\'s signature skill', 'a utility skill', 'a second utility skill', 'your calling\'s elite skill'];

/** A weapon's line, by how it swings: quick, heavy, or balanced (data/items.ts weapon.speed). */
export type WeaponLine = 'balanced' | 'quick' | 'heavy';
export function weaponLine(speed: number | undefined): WeaponLine {
  return (speed ?? 1) > 1.04 ? 'quick' : (speed ?? 1) < 0.96 ? 'heavy' : 'balanced';
}
/** The third weapon skill (key 3), by the line of the weapon in hand. */
export const WEAPON_SKILLS: Record<WeaponLine, SkillDef> = {
  balanced: { id: 'riposte', name: 'Riposte', icon: 'riposte', cd: 12, desc: 'Raise your blade: the next blow that reaches you in the next second is turned aside, and you strike back hard.' },
  quick: { id: 'flurry', name: 'Flurry', icon: 'flurry', cd: 10, desc: 'Four quick cuts at your target.' },
  heavy: { id: 'sunder', name: 'Sunder', icon: 'sunder', cd: 12, aim: 6, desc: 'Bring the blade down where you aim: everything there takes a heavy blow and is knocked off its feet.' },
};
/** Cross-classing (data/content/masters.ts): the level an apprenticeship can start, and its fee. */
export const APPRENTICE_LEVEL = 25, APPRENTICE_FEE = 500;
/** Skills that only work through their own calling's craft, so no master teaches them. */
const NOT_TAUGHT = new Set(['kindle', 'rally']);
/** What a master of a calling teaches an apprentice: its utilities, less those. */
export function crossUtilities(ap: CallingDef | null | undefined): SkillDef[] {
  return ap ? ap.utilities.filter((s) => !NOT_TAUGHT.has(s.id)) : [];
}

/**
 * The signature and the two utilities beside it: the calling's own, and (for an apprentice) at most
 * one of the master's.
 */
export function chosenUtilities(c: CallingDef, ids: unknown, ap: CallingDef | null = null): SkillDef[] {
  const want = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  const cross = crossUtilities(ap && ap.id !== c.id ? ap : null);
  let crossed = 0;
  const picked = [...new Set(want)].map((id) => c.utilities.find((s) => s.id === id) ?? cross.find((s) => s.id === id)).filter((s): s is SkillDef => {
    if (!s) return false;
    if (cross.includes(s)) { if (crossed) return false; crossed++; }
    return true;
  }).slice(0, 2);
  for (const s of c.utilities) if (picked.length < 2 && !picked.includes(s)) picked.push(s);
  return [c.skills[1], ...picked];
}
