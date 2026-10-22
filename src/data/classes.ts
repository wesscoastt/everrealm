// Callings: the four ways to fight in the Charter Counties. The bar is Guild Wars 2's: your weapon's
// skills (Strike, Cleave and a third that depends on the weapon in your hand, keys 1 to 3), then the
// calling's heal (4), three utilities (5 to 7: its signature, and two you choose from three) and an
// elite (8). Some are aimed at
// the ground: they land where the cursor points (on a touch screen, on your target). Everyone shares
// the dodge roll (Q) and eating (F). Each calling also has a mechanic, in the manner of a GW2
// profession, and plays one of ESO's roles. None is stronger than another: they
// trade damage, safety and reach (see scripts/classbalance.ts for the numbers they're tuned to).
// You can change calling at any time out of a fight, from the journal: it's a choice of how to
// play, not a slot you're locked into.

export type CallingId = 'warden' | 'reaver' | 'ashcaller' | 'pathfinder';

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
  resolve: { per: 0.05, max: 5, fade: 6 },
  bulwark: { shield: 0.3, secs: 8 },
  bash: { dmg: 1.8, stun: 1.5, range: 3.6 },
  oath: { secs: 6, taken: 0.6, burn: 0.6, r: 5 },
  fury: { perHit: 8, mult: 1.5 },
  bleed: { dmg: 1.4, dot: 0.4, secs: 6, heal: 0.03, range: 3.2 },
  leap: { dmg: 2.4, r: 2.8, range: 10 },
  redhour: { secs: 10, dealt: 1.4, taken: 1.2 },
  ward: { heal: 0.33, secs: 5, burn: 0.35, r: 4 },
  bolt: { dmg: 1.5, range: 22, burst: 1.2, r: 3, every: 3 },
  starfall: { dmg: 5, r: 4.5, delay: 1.1, range: 22 },
  dressing: { heal: 0.45 },
  volley: { arrows: 3, dmg: 0.8, range: 22, mark: 6, markBonus: 0.15, markR: 4 },
  shadowstep: { stun: 0.8, mult: 3, window: 3, range: 16 },
  // Utilities (each calling picks three of its four)
  holdfast: { secs: 4, taken: 0.7 },
  shieldthrow: { dmg: 1.5, stun: 0.8, range: 14 },
  rally: { heal: 0.17 },
  rend: { dmg: 1.4, dot: 0.25, secs: 4, r: 3.4 },
  rush: { secs: 6, speed: 1.4 },
  hamstring: { dmg: 1.2, stun: 1.3, range: 3.4 },
  firewall: { r: 3.5, secs: 5, burn: 0.45, range: 18 },
  cinderstep: { dist: 7, r: 3, secs: 3, burn: 0.7 },
  kindle: { stacks: 2, mult: 2 },
  snare: { r: 1.6, stun: 2, dmg: 1.5, secs: 20, range: 14 },
  rain: { r: 4, secs: 4, dmg: 0.55, range: 20 },
  quickstep: { dist: 6, window: 4 },
  // Weapon skills (key 3, every calling: by the weapon in hand)
  riposte: { secs: 1.2, dmg: 2.2 },
  flurry: { hits: 4, dmg: 0.6, every: 0.16, range: 3.2 },
  sunder: { dmg: 2.4, r: 2.6, stun: 0.8, delay: 0.35, range: 6 },
};

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
/** The utilities on a calling's bar: its signature, then the two chosen (by id) from the other three, or the first two. */
export function chosenUtilities(c: CallingDef, ids: unknown): SkillDef[] {
  const want = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  const picked = [...new Set(want)].map((id) => c.utilities.find((s) => s.id === id)).filter((s): s is SkillDef => !!s).slice(0, 2);
  for (const s of c.utilities) if (picked.length < 2 && !picked.includes(s)) picked.push(s);
  return [c.skills[1], ...picked];
}
