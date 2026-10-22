// Callings: the four ways to fight in the Charter Counties. Everyone shares Strike, Cleave, the
// dodge roll and eating; a calling adds a mechanic and three skills of its own (keys 3, 4 and 5),
// in the manner of a Guild Wars 2 profession with ESO's roles. None is stronger than another: they
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
}

export interface CallingDef {
  id: CallingId;
  name: string;
  role: string;
  blurb: string;
  mechanic: { name: string; desc: string; color: string };
  skills: [SkillDef, SkillDef, SkillDef];
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
    pros: 'Hardest to bring down; stuns', cons: 'Lowest damage',
  },
  {
    id: 'reaver', name: 'Reaver', role: 'Close-in fury',
    blurb: 'Fights up close and fast, and heals by bleeding what it fights. Harrowgate breaks them from slag-yard brawlers and drovers who outlasted the road wolves.',
    mechanic: { name: 'Fury', desc: 'Every blow you land builds Fury. At full Fury your next skill hits half again as hard.', color: '#e0583a' },
    skills: [
      { id: 'bleed', name: 'Bloodletting', icon: 'bleed', cd: 10, desc: 'Open a wound that bleeds for six seconds. The cut and every second of bleeding heal you a little.' },
      { id: 'leap', name: 'Leaping Cut', icon: 'leap', cd: 12, desc: 'Leap at your target from up to ten blocks and strike everything where you land.' },
      { id: 'redhour', name: 'The Red Hour', icon: 'redhour', cd: 60, desc: 'For ten seconds you deal 40% more damage, and take 20% more.' },
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
      { id: 'starfall', name: 'Starfall', icon: 'star', cd: 60, desc: 'Call down a star on your target: after a moment it strikes everything in a wide ring.' },
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
};
