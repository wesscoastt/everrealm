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

export type CallingId = 'warden' | 'reaver' | 'ashcaller' | 'pathfinder' | 'wizard' | 'mender' | 'gravecaller';

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
  /** Elites to choose instead of skills[2] (key 8): the calling's other big moment. */
  elites?: SkillDef[];
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
      { id: 'challenge', name: 'Challenge', icon: 'challenge', cd: 16, desc: 'Bang your shield and call them on: every foe within six blocks is cowed, its blows landing 15% softer for six seconds, and you gather two Resolve.' },
      { id: 'cover', name: 'Cover', icon: 'cover', cd: 22, desc: 'Bring your shield round for everyone near: each of your side within eight blocks gets a ward of an eighth of their health for six seconds, you a little less.' },
    ],
    elites: [
      { id: 'unbroken', name: 'Unbroken', icon: 'unbroken', cd: 60, desc: 'Nothing will put you down: for eight seconds you get back two fifths of your health, a little each second, and nothing stuns you or moves you.' },
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
      { id: 'finisher', name: 'Finishing Cut', icon: 'finisher', cd: 10, desc: 'A cut meant to end it: a solid blow, two and a half times that on a foe under a third of its health, and a kill with it mends you a little.' },
      { id: 'bloodup', name: 'Blood Up', icon: 'bloodup', cd: 16, desc: 'Open your own arm and let it make you angry: a sixteenth of your health for most of your Fury, and for eight seconds every blow you land gives a little health back.' },
    ],
    elites: [
      { id: 'massacre', name: 'Massacre', icon: 'massacre', cd: 60, desc: 'Turn and turn and turn again: three wide strikes, a heartbeat apart, on everything within five blocks.' },
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
      { id: 'smoulder', name: 'Smoulder', icon: 'smoulder', cd: 10, desc: 'Set your target smouldering from up to eighteen blocks: it burns, slowly and for a long time, for eight seconds.' },
      { id: 'flashfire', name: 'Flashfire', icon: 'flashfire', cd: 16, desc: 'Fire bursts out of you: everything within four blocks is burned and dazzled, stunned for a second.' },
    ],
    elites: [
      { id: 'pillar', name: 'Pillar of Fire', icon: 'pillar', cd: 60, aim: 16, desc: 'Call down a column of fire where you aim: everything within three blocks of it burns for ten seconds.' },
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
      { id: 'heartshot', name: 'Heart Shot', icon: 'heartshot', cd: 12, desc: 'Take your time over one arrow: a heavy shot, and a third heavier on a marked foe.' },
      { id: 'smoke', name: 'Smoke Arrow', icon: 'smoke', cd: 18, aim: 18, desc: 'An arrow of burning rags where you aim: everything there is singed, and everything in the smoke strikes 15% softer, moves slower and is marked for six seconds.' },
    ],
    elites: [
      { id: 'deadeye', name: 'Deadeye', icon: 'deadeye', cd: 60, desc: 'Steady breathing and a quiet hand: for seven seconds every blow and arrow you land is a critical hit.' },
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
      { id: 'shatter', name: 'Shatter', icon: 'shatter', cd: 12, desc: 'Break the cold in everything within ten blocks: each chilled foe takes a blow for every Chill on it, and the Chill is spent.' },
      { id: 'frostbite', name: 'Frostbite', icon: 'frostbite', cd: 10, desc: 'Cold into your target\'s blood from up to eighteen blocks: a Chill now, and it freezes slowly from within for six seconds.' },
    ],
    elites: [
      { id: 'deepfreeze', name: 'Deep Freeze', icon: 'deepfreeze', cd: 60, desc: 'The cold goes all the way in: everything within eight blocks is frozen solid for four seconds, and cracked for a blow.' },
    ],
    pros: 'Fights from range; freezes foes in place', cons: 'Little damage up close',
  },
  {
    id: 'mender', name: 'Mender', role: 'Healing and wards',
    blurb: 'Keeps people standing. The Minster in Ansbury trains its menders for the road and the bad winters, and gives each a lamp: the first of them did their work at night.',
    mechanic: { name: 'Grace', desc: 'Each Mend builds two Grace, each Restoration one. At five, your next Mend heals twice as much and reaches everyone near you.', color: '#f0d890' },
    skills: [
      { id: 'mend', name: 'Mend', icon: 'mend', cd: 12, desc: 'Heal the most hurt of your companions within fifteen blocks for three tenths of their health, and yourself for a third as much.' },
      { id: 'lanternlight', name: 'Lantern Light', icon: 'lanternlight', cd: 1.6, desc: 'A bolt of lamplight at your target from up to twenty-two blocks. Its glow heals the most hurt of you and yours a little.' },
      { id: 'sanctuary', name: 'Sanctuary', icon: 'sanctuary', cd: 60, desc: 'Hallow the ground where you stand for eight seconds: everyone of yours on it heals three percent of their health a second and takes fifteen percent less, and foes on it burn.' },
    ],
    utilities: [
      { id: 'lampward', name: 'Lamp Ward', icon: 'lampward', cd: 20, desc: 'A ward on you and everyone of yours within ten blocks, soaking a tenth of each one\'s health, for eight seconds.' },
      { id: 'rebuke', name: 'Rebuke', icon: 'rebuke', cd: 14, desc: 'Light bursts out of you: everything within five blocks is struck and dazed for over a second, and any blow it was winding up is lost.' },
      { id: 'restore', name: 'Restoration', icon: 'restore', cd: 24, desc: 'You and everyone of yours within ten blocks heal a tenth of their health over six seconds.' },
      { id: 'mercy', name: 'Mercy', icon: 'mercy', cd: 20, desc: 'A quarter of their health, at once, to the most hurt of yours within fifteen blocks (you heal for a third as much as you would anyone else).' },
      { id: 'judgement', name: 'Judgement', icon: 'judgement', cd: 12, desc: 'A hard bolt of lantern light at your target from up to twenty blocks: a heavy blow, and it is dazed for most of a second.' },
    ],
    elites: [
      { id: 'vigil', name: 'Vigil', icon: 'vigil', cd: 60, desc: 'Keep watch over them: for ten seconds you can\'t fall below a fifth of your health, and you and everyone of yours within fifteen blocks mend a little each second.' },
    ],
    pros: 'Heals and wards others; hard to bring down', cons: 'Least damage of any calling',
  },
  {
    id: 'gravecaller', name: 'Gravecaller', role: 'Curses and the raised dead',
    blurb: 'Borrows from the dead: their last breath, their bones, the cold they lie in. The barrow-keepers of Tolmen Moor learned it to keep the old barrows quiet, and they say the dead only lend.',
    mechanic: { name: 'Lifeblood', desc: 'Wither stores life as it eats at a foe, and a foe that dies withered gives up the rest; Siphon stores whatever it heals past full. Skills paid in health take it from your Lifeblood first.', color: '#b0383a' },
    skills: [
      { id: 'siphon', name: 'Siphon', icon: 'siphon', cd: 10, desc: 'Draw the life out of your target from up to eighteen blocks: it takes a heavy blow and you heal a tenth of your health. Whatever heals past full goes into your Lifeblood.' },
      { id: 'wither', name: 'Wither', icon: 'wither', cd: 1.6, desc: 'A bolt of grave-cold at your target from up to twenty-two blocks. It leaves Wither on them, eating at them for six seconds, up to three deep.' },
      { id: 'raise', name: 'Raise the Fallen', icon: 'raise', cd: 60, desc: 'Paid in health. Two of the dead get up out of the ground beside you and fight what you fight for twenty seconds, then lie down again.' },
    ],
    utilities: [
      { id: 'boneward', name: 'Bone Ward', icon: 'boneward', cd: 20, desc: 'Paid in health. A ward of bone soaks blows worth a fifth of your health for eight seconds, and withers whatever strikes it.' },
      { id: 'gravegrip', name: 'Grave Grip', icon: 'gravegrip', cd: 14, desc: 'Hands come up out of the ground under your target: it and everything within three blocks of it are held fast for two seconds, and any blow being wound up is lost.' },
      { id: 'graverot', name: 'Grave Rot', icon: 'graverot', cd: 16, desc: 'Paid in health. Rot spreads out from your target to every foe within six blocks of it, striking each and leaving Wither two deep.' },
      { id: 'bonespear', name: 'Bone Spear', icon: 'bonespear', cd: 10, desc: 'A spear of old bone thrown at your target: it goes through everything in a line fourteen blocks long.' },
      { id: 'dread', name: 'Dread', icon: 'dread', cd: 18, desc: 'Let them see what you have seen: everything within six blocks takes a blow, cowers, held for two seconds, and withers two deep.' },
    ],
    elites: [
      { id: 'plague', name: 'Plague', icon: 'plague', cd: 60, desc: 'Let the rot out: everything within ten blocks is struck and withered three deep.' },
    ],
    pros: 'Wears whole packs down; never waits on magicka for its blood skills', cons: 'Slow to kill one foe outright; pays in health',
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
  // Mender (heals and wards are shares of each one's own health)
  /** max: Grace to fill; per: Grace a heal gives (a Mend gives two). */
  grace: { max: 5, mult: 2, r: 12 },
  /** self: the share of it a mender gets themself (they look after the rest first). */
  mend: { heal: 0.3, r: 15, self: 0.35 },
  /** bounce: a second foe the light springs on to (0 none). */
  lanternlight: { dmg: 1.45, heal: 0.015, range: 22, r: 15, bounce: 0 },
  sanctuary: { r: 6, secs: 8, heal: 0.03, taken: 0.85, burn: 0.4 },
  lampward: { shield: 0.1, secs: 8, r: 10 },
  /** heal: a share of health for you and yours for each foe it strikes. */
  rebuke: { r: 5, dmg: 1.1, stun: 1.3, heal: 0 },
  restore: { heal: 0.09, secs: 6, r: 10 },
  // Gravecaller (Lifeblood is a share of your health; the blood skills' prices are in data/combat.ts)
  /** max: the most it holds; tick: stored a second for each depth of Wither; kill: from a foe dying withered; siphon: the share of Siphon's overheal kept. */
  lifeblood: { max: 0.3, tick: 0.006, kill: 0.05, siphon: 1 },
  siphon: { dmg: 1.2, heal: 0.1, range: 18 },
  /** dot: a second, for each depth of it. */
  wither: { dmg: 1.0, dot: 0.2, secs: 6, max: 3, range: 22 },
  /** n raised, for secs, each striking dmg every so many seconds. */
  raise: { n: 2, secs: 20, dmg: 0.4, every: 1.2 },
  boneward: { shield: 0.2, secs: 8 },
  gravegrip: { r: 3, dmg: 0.9, stun: 2, range: 18 },
  /** heal: a share of your health for each foe it strikes (talents). */
  graverot: { r: 6, dmg: 1.0, stacks: 2, range: 18, heal: 0 },
  /** Warden's Challenge: foes within r cowed (weaker blows) for secs; Resolve gathered. */
  challenge: { r: 6, secs: 6, resolve: 2 },
  /** Warden's Cover: a ward of a share of each friend's health (yours: self) within r. */
  cover: { r: 8, shield: 0.125, self: 0.09, secs: 6 },
  /** Reaver's Finishing Cut: a blow, mult times over on a foe under below of its health; a kill with it heals kill of yours. */
  finisher: { dmg: 2.05, below: 0.33, mult: 2.5, range: 3, kill: 0.05 },
  /** Reaver's Blood Up: Fury for the health it costs (data/combat.ts), and for secs every blow you land mends leech of your health. */
  bloodup: { fury: 60, secs: 8, leech: 0.008 },
  /** Kindler: Smoulder (a long burn on one foe) and Flashfire (a burst round you that stuns). */
  smoulder: { dot: 0.42, secs: 8, range: 18 },
  flashfire: { r: 4, dmg: 1.2, stun: 1.0 },
  /** Pathfinder: Heart Shot (a heavy arrow, heavier on a marked foe) and Smoke Arrow (foes in it weak and slowed). */
  heartshot: { dmg: 2.6, marked: 1.33, range: 24 },
  smoke: { r: 4, secs: 6, range: 18, dmg: 0.8 },
  /** Wizard: Shatter (a blow a Chill on every chilled foe near, the Chill spent) and Frostbite (a Chill and a cold burn). */
  shatter: { r: 10, dmg: 0.9 },
  frostbite: { dot: 0.32, secs: 6, range: 18 },
  /** Mender: Mercy (a share of the most hurt friend's health, at once) and Judgement (a heavy bolt that dazes). */
  mercy: { heal: 0.25, r: 15 },
  judgement: { dmg: 2.2, stun: 0.8, range: 20 },
  /** Gravecaller: Bone Spear (through a line) and Dread (everything near held, and withered). */
  bonespear: { dmg: 2.8, reach: 14, width: 1 },
  dread: { r: 6, stun: 2, stacks: 2, dmg: 1.5 },
  /** The elites to choose instead (CallingDef.elites). */
  unbroken: { heal: 0.4, secs: 8 },
  massacre: { r: 5, dmg: 1.3, hits: 3, every: 0.45 },
  pillar: { r: 3, burn: 1.0, secs: 10, range: 16 },
  deadeye: { secs: 7 },
  deepfreeze: { r: 8, freeze: 4, dmg: 2.0 },
  vigil: { secs: 10, r: 15, floor: 0.2, heal: 0.03 },
  plague: { r: 10, dmg: 1.2, stacks: 3 },
  // Key 2 by the weapon in hand (SECOND_SKILLS)
  backstab: { dmg: 1.1, behind: 2.3, range: 3 },
  hook: { dmg: 1.0, range: 6, pull: 9, stun: 0.6 },
  overhead: { dmg: 2.6, range: 3.2 },
  groundpound: { r: 3.5, dmg: 1.2, slow: 3 },
  spearsweep: { r: 4.2, dmg: 1.1, knock: 5 },
  pointblank: { dmg: 1.6, range: 5, knock: 10 },
  staffflurry: { hits: 3, dmg: 0.6, every: 0.18, range: 3.6 },
  // Weapon skills (key 3, every calling: by the weapon in hand)
  riposte: { secs: 1.2, dmg: 2.2 },
  flurry: { hits: 4, dmg: 0.6, every: 0.16, range: 3.2 },
  sunder: { dmg: 2.4, r: 2.6, stun: 0.8, delay: 0.35, range: 6 },
  /** An axe's chop: a blow, then a bleed (dot: a share of a swing each second, for secs); spread: more foes it reaches. */
  hack: { dmg: 1.5, dot: 0.3, secs: 6, range: 3, spread: 0 },
  /** A great axe swung all the way round: hits on everything within r, every so often. heal: a share of health for each foe struck. */
  whirl: { dmg: 1.1, hits: 2, every: 0.35, r: 3.2, heal: 0 },
  /** A mace or hammer to the head: a hard blow and a stun (so it breaks a wind-up). */
  bellringer: { dmg: 1.8, stun: 1.4, range: 3 },
  /** A spear's thrust down a line: everything within reach and a block either side of it. */
  longthrust: { dmg: 2.0, reach: 6, width: 1.0 },
  /** An arrow at the legs: a blow and the foe slowed (bleed: a share of a swing each second, for 4 seconds). */
  hobble: { dmg: 1.4, slow: 4, range: 24, bleed: 0 },
  /** A staff swept round low: a light blow to everything near, knocked back and off its feet a moment. */
  sweep: { dmg: 1.0, r: 3.5, knock: 7, stun: 0.6 },
};

/**
 * The bar fills as you level, as in the big online games: Strike from the start, then Cleave, the
 * calling's heal, its signature, the weapon skill, the two utilities and last the elite. By bar key
 * (useAbility's index: 0 Strike, 1 Cleave, 2 the weapon skill, 3 the heal, 4 the signature, 5 and 6
 * the utilities, 7 the elite); the dodge roll and eating are there from the start.
 */
export const UNLOCK_AT = [1, 2, 6, 3, 4, 8, 12, 16];
/** What each key's skill is called while it's still locked (the calling's own names come in once known). */
export const UNLOCK_NAMES = ['Strike', 'your second weapon skill', 'your weapon skill', 'your calling\'s heal', 'your calling\'s signature skill', 'a utility skill', 'a second utility skill', 'your calling\'s elite skill'];

/** A weapon's line, by how it swings: quick, heavy, or balanced (data/items.ts weapon.speed). */
export type WeaponLine = 'balanced' | 'quick' | 'heavy';
export function weaponLine(speed: number | undefined): WeaponLine {
  return (speed ?? 1) > 1.04 ? 'quick' : (speed ?? 1) < 0.96 ? 'heavy' : 'balanced';
}
/**
 * The weapon skill (key 3), by the kind of weapon in hand (docs/COMBAT.md): a sword parries, a dagger
 * cuts quick, a two-handed blade sunders, an axe opens a wound, a great axe whirls, a hammer rings a
 * skull, a spear reaches, a bow hobbles, a staff sweeps. With nothing in hand, by how fast your fists are.
 */
export type WeaponKit = WeaponLine | 'axe' | 'greataxe' | 'hammer' | 'spear' | 'bow' | 'staff';
export const WEAPON_SKILLS: Record<WeaponKit, SkillDef> = {
  balanced: { id: 'riposte', name: 'Riposte', icon: 'riposte', cd: 12, desc: 'Raise your blade: the next blow that reaches you in the next second is turned aside, and you strike back hard.' },
  quick: { id: 'flurry', name: 'Flurry', icon: 'flurry', cd: 10, desc: 'Four quick cuts at your target.' },
  heavy: { id: 'sunder', name: 'Sunder', icon: 'sunder', cd: 12, aim: 6, desc: 'Bring the blade down where you aim: everything there takes a heavy blow and is knocked off its feet.' },
  axe: { id: 'hack', name: 'Hack', icon: 'hack', cd: 10, desc: 'A short, ugly chop that opens a wound: a hard blow, and the target bleeds for six seconds.' },
  greataxe: { id: 'whirl', name: 'Whirl', icon: 'whirl', cd: 12, desc: 'Swing the great axe all the way round, twice: everything within three blocks is struck each time.' },
  hammer: { id: 'bellringer', name: 'Bell Ringer', icon: 'bellringer', cd: 14, desc: 'A blow to the head. The target is stunned for over a second, and whatever it was winding up is lost.' },
  spear: { id: 'longthrust', name: 'Long Thrust', icon: 'longthrust', cd: 10, desc: 'Lunge with the spear: everything in a line six blocks long takes a heavy thrust.' },
  bow: { id: 'hobble', name: 'Hobbling Shot', icon: 'hobble', cd: 12, desc: 'An arrow at the legs: a solid hit, and the target moves at two thirds of its pace for four seconds.' },
  staff: { id: 'sweep', name: 'Staff Sweep', icon: 'sweep', cd: 14, desc: 'Sweep the staff round low: everything near you is struck, knocked back and off its feet for a moment.' },
};
/**
 * Key 2, by the kind of weapon in hand: Cleave (Game.cleave) for swords and two-handed blades, and for
 * the rest a skill of their own, so a dagger, an axe, a hammer, a spear, a bow and a staff each fight
 * their own way at both keys.
 */
export const SECOND_SKILLS: Partial<Record<WeaponKit, SkillDef>> = {
  quick: { id: 'backstab', name: 'Backstab', icon: 'backstab', cd: 8, desc: 'A quick stab, and twice as hard and more on a foe that isn\'t facing you, or can\'t: stunned, or turned to someone else.' },
  axe: { id: 'hook', name: 'Hook', icon: 'hook', cd: 10, desc: 'Hook the axe behind your target, up to six blocks off, and drag it to you: a blow, and it stumbles for over half a second.' },
  greataxe: { id: 'overhead', name: 'Overhead Chop', icon: 'overhead', cd: 9, desc: 'Lift the great axe all the way and bring it down on one foe: the heaviest blow it has.' },
  hammer: { id: 'groundpound', name: 'Ground Pound', icon: 'groundpound', cd: 10, desc: 'Bring the head down on the ground at your feet: everything within three and a half blocks is struck and slowed for three seconds.' },
  spear: { id: 'spearsweep', name: 'Spear Sweep', icon: 'spearsweep', cd: 8, desc: 'Sweep the spear round at the end of its reach: everything within four blocks is struck and pushed back.' },
  bow: { id: 'pointblank', name: 'Point Blank', icon: 'pointblank', cd: 10, desc: 'Something too close? An arrow at five blocks or less, hard enough to knock it back.' },
  staff: { id: 'staffflurry', name: 'Staff Flurry', icon: 'staffflurry', cd: 8, desc: 'Both ends of the staff, three quick blows on your target.' },
};
/** The weapon skill's kind for a weapon: by its family, or (with nothing in hand) by speed. */
export function weaponKit(family: string | undefined, speed: number | undefined): WeaponKit {
  switch (family) {
    case 'sword': case 'longsword': case 'falchion': return 'balanced';
    case 'sabre': case 'dagger': return 'quick';
    case 'greatsword': case 'cleaver': return 'heavy';
    case 'axe': return 'axe';
    case 'greataxe': return 'greataxe';
    case 'mace': case 'hammer': return 'hammer';
    case 'spear': return 'spear';
    case 'bow': return 'bow';
    case 'staff': return 'staff';
  }
  return weaponLine(speed);
}
/** A calling's elites: its own, then the others it can choose instead. */
export function elitesOf(c: CallingDef): SkillDef[] { return [c.skills[2], ...(c.elites ?? [])]; }
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
