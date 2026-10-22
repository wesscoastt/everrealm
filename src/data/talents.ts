import { CallingId, TUNE } from './classes';

// Talents: three trees for each calling, bought with points from your combat level (one a level
// from level 3). Each tree has four talents and a capstone; a talent costs 1, 2, 2 or 3 points, a
// capstone 4, and you may hold only one capstone at a time, so a build is a choice. Talents change
// the numbers the calling's skills use (data/classes.ts TUNE), which is how the balance check
// (npm run balance) can play every tree and hold them level. Unlearn everything for nothing, any
// time out of a fight.

export type Tune = typeof TUNE;

export interface TalentDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  capstone?: boolean;
  /** What it changes in the calling's numbers (applied to a copy). */
  mod: (t: Tune) => void;
}

export interface TreeDef { id: string; name: string; desc: string; talents: TalentDef[] }

const tal = (id: string, name: string, cost: number, desc: string, mod: (t: Tune) => void, capstone = false): TalentDef => ({ id, name, cost, desc, mod, capstone });

export const TREES: Record<CallingId, TreeDef[]> = {
  warden: [
    { id: 'w_line', name: 'The Line', desc: 'Taking the blows', talents: [
      tal('w_thick', 'Thick Skin', 1, 'Each Resolve takes 6% off the damage you take, not 5%.', (t) => { t.resolve.per = 0.06; }),
      tal('w_hold', 'Hold Fast', 2, 'Bulwark soaks a quarter more.', (t) => { t.bulwark.shield *= 1.25; }),
      tal('w_longward', 'Long Ward', 2, 'Bulwark lasts eleven seconds.', (t) => { t.bulwark.secs = 11; }),
      tal('w_ironoath', 'Iron Oath', 3, 'Inside the Oath of the Ring you take half damage.', (t) => { t.oath.taken = 0.5; }),
      tal('w_unbroken', 'Unbroken', 4, 'Resolve stacks to seven.', (t) => { t.resolve.max = 7; }, true),
    ] },
    { id: 'w_toll', name: 'The Toll', desc: 'Making them pay', talents: [
      tal('w_heavy', 'Heavy Hand', 1, 'Shield Bash hits a fifth harder.', (t) => { t.bash.dmg *= 1.2; }),
      tal('w_ringing', 'Ringing Blow', 2, 'Shield Bash stuns half a second longer.', (t) => { t.bash.stun += 0.5; }),
      tal('w_fire', 'Fire in the Ring', 2, 'The Oath of the Ring burns 40% harder.', (t) => { t.oath.burn *= 1.4; }),
      tal('w_wide', 'Wide Ring', 3, 'The Oath of the Ring reaches seven blocks.', (t) => { t.oath.r = 7; }),
      tal('w_tolldue', 'Toll Due', 4, 'Shield Bash hits 40% harder again.', (t) => { t.bash.dmg *= 1.4; }, true),
    ] },
    { id: 'w_watch', name: 'The Watch', desc: 'Lasting the night', talents: [
      tal('w_steady', 'Steady', 1, 'Resolve holds for nine seconds without a blow.', (t) => { t.resolve.fade = 9; }),
      tal('w_longoath', 'Long Oath', 2, 'The Oath of the Ring lasts eight seconds.', (t) => { t.oath.secs = 8; }),
      tal('w_reach', 'Long Arm', 2, 'Shield Bash reaches five blocks.', (t) => { t.bash.range = 5; }),
      tal('w_watchman', 'Watchman', 3, 'Bulwark soaks 15% more and lasts ten seconds.', (t) => { t.bulwark.shield *= 1.15; t.bulwark.secs = Math.max(t.bulwark.secs, 10); }),
      tal('w_ever', 'Ever-watchful', 4, 'The Oath of the Ring lasts ten seconds.', (t) => { t.oath.secs = 10; }, true),
    ] },
  ],
  reaver: [
    { id: 'r_blood', name: 'Blood', desc: 'Bleeding them dry', talents: [
      tal('r_deep', 'Deep Cuts', 1, 'Bloodletting bleeds a quarter harder.', (t) => { t.bleed.dot *= 1.25; }),
      tal('r_long', 'Long Wound', 2, 'The bleed runs eight seconds.', (t) => { t.bleed.secs = 8; }),
      tal('r_drink', 'Drinker', 2, 'Each second of bleeding heals you 4%.', (t) => { t.bleed.heal = 0.04; }),
      tal('r_vein', 'Open Vein', 3, 'The cut itself hits 30% harder.', (t) => { t.bleed.dmg *= 1.3; }),
      tal('r_drain', 'Exsanguinate', 4, 'The bleed runs 40% harder again.', (t) => { t.bleed.dot *= 1.4; }, true),
    ] },
    { id: 'r_fury', name: 'Fury', desc: 'Anger as a weapon', talents: [
      tal('r_temper', 'Quick Temper', 1, 'Every blow builds 10 Fury, not 8.', (t) => { t.fury.perHit = 10; }),
      tal('r_seethe', 'Seething', 2, 'At full Fury your next skill hits 65% harder, not 50%.', (t) => { t.fury.mult = 1.65; }),
      tal('r_hour', 'The Long Hour', 2, 'The Red Hour lasts thirteen seconds.', (t) => { t.redhour.secs = 13; }),
      tal('r_lust', 'Bloodlust', 3, 'In the Red Hour you deal 50% more, not 40%.', (t) => { t.redhour.dealt = 1.5; }),
      tal('r_berserk', 'Berserk', 4, 'The Red Hour no longer makes you take more damage.', (t) => { t.redhour.taken = 1; }, true),
    ] },
    { id: 'r_leap', name: 'The Leap', desc: 'Falling on them', talents: [
      tal('r_longleap', 'Long Leap', 1, 'Leaping Cut reaches fourteen blocks.', (t) => { t.leap.range = 14; }),
      tal('r_crater', 'Crater', 2, 'Leaping Cut strikes everything within 3.6 blocks.', (t) => { t.leap.r = 3.6; }),
      tal('r_landing', 'Heavy Landing', 2, 'Leaping Cut hits a fifth harder.', (t) => { t.leap.dmg *= 1.2; }),
      tal('r_momentum', 'Momentum', 3, 'Leaping Cut hits a fifth harder again.', (t) => { t.leap.dmg *= 1.2; }),
      tal('r_thunder', 'Thunderfall', 4, 'Leaping Cut hits 35% harder and strikes 0.6 blocks wider.', (t) => { t.leap.dmg *= 1.35; t.leap.r += 0.6; }, true),
    ] },
  ],
  ashcaller: [
    { id: 'a_embers', name: 'Embers', desc: 'The bolt and its burst', talents: [
      tal('a_kindle', 'Kindle', 1, 'Ember Bolt burns 15% hotter.', (t) => { t.bolt.dmg *= 1.15; }),
      tal('a_burst', 'Bright Burst', 2, 'The third bolt\'s burst burns 15% hotter.', (t) => { t.bolt.burst *= 1.15; }),
      tal('a_spread', 'Spreading Fire', 2, 'The burst reaches four blocks.', (t) => { t.bolt.r = 4; }),
      tal('a_longshot', 'Long Shot', 3, 'Ember Bolt reaches 28 blocks.', (t) => { t.bolt.range = 28; }),
      tal('a_storm', 'Firestorm', 4, 'Every second bolt bursts, not every third.', (t) => { t.bolt.every = 2; }, true),
    ] },
    { id: 'a_stars', name: 'Stars', desc: 'What falls from the sky', talents: [
      tal('a_bright', 'Brighter Star', 1, 'Starfall strikes 15% harder.', (t) => { t.starfall.dmg *= 1.15; }),
      tal('a_quick', 'Quick Fall', 2, 'The star comes down in 0.7 seconds.', (t) => { t.starfall.delay = 0.7; }),
      tal('a_widefall', 'Wide Fall', 2, 'Starfall strikes everything within 5.5 blocks.', (t) => { t.starfall.r = 5.5; }),
      tal('a_heavystar', 'Heavy Star', 3, 'Starfall strikes a fifth harder again.', (t) => { t.starfall.dmg *= 1.2; }),
      tal('a_twin', 'Two Stars', 4, 'Starfall strikes 35% harder again.', (t) => { t.starfall.dmg *= 1.35; }, true),
    ] },
    { id: 'a_cinders', name: 'Cinders', desc: 'The ward and its fire', talents: [
      tal('a_warm', 'Warm Hands', 1, 'Cinder Ward heals 15% more.', (t) => { t.ward.heal *= 1.15; }),
      tal('a_hotring', 'Hot Ring', 2, 'Cinder Ward burns 20% hotter.', (t) => { t.ward.burn *= 1.2; }),
      tal('a_wideward', 'Wide Ward', 2, 'Cinder Ward burns everything within five blocks.', (t) => { t.ward.r = 5; }),
      tal('a_longward', 'Slow Burn', 3, 'Cinder Ward lasts seven seconds.', (t) => { t.ward.secs = 7; }),
      tal('a_pyre', 'Pyre', 4, 'Cinder Ward heals and burns 15% more.', (t) => { t.ward.heal *= 1.15; t.ward.burn *= 1.15; }, true),
    ] },
  ],
  wizard: [
    { id: 'z_frost', name: 'Frost', desc: 'The bolt and the freeze', talents: [
      tal('z_bite', 'Bitter Cold', 1, 'Frost Bolt hits 15% harder.', (t) => { t.frostbolt.dmg *= 1.15; }),
      tal('z_crack', 'Crack', 2, 'A frozen foe cracks for 30% more.', (t) => { t.chill.shatter *= 1.3; }),
      tal('z_hold', 'Hard Freeze', 2, 'A freeze holds half a second longer.', (t) => { t.chill.freeze += 0.5; }),
      tal('z_far', 'Far Sight', 3, 'Frost Bolt reaches 28 blocks.', (t) => { t.frostbolt.range = 28; }),
      tal('z_glacier', 'Glacier', 4, 'A frozen foe cracks for 40% more again, and stays frozen a little longer.', (t) => { t.chill.shatter *= 1.4; t.chill.freeze += 0.3; }, true),
    ] },
    { id: 'z_storm', name: 'Storm', desc: 'The blizzard', talents: [
      tal('z_snow', 'Heavy Snow', 1, 'Blizzard cuts 15% harder.', (t) => { t.blizzard.dmg *= 1.15; }),
      tal('z_wide', 'Wide Storm', 2, 'Blizzard covers six blocks round.', (t) => { t.blizzard.r = 6; }),
      tal('z_winter', 'Long Winter', 2, 'Blizzard lasts eight seconds.', (t) => { t.blizzard.secs = 8; }),
      tal('z_hail', 'Hail', 3, 'Blizzard cuts a fifth harder again.', (t) => { t.blizzard.dmg *= 1.2; }),
      tal('z_white', 'Whiteout', 4, 'Blizzard cuts 35% harder again.', (t) => { t.blizzard.dmg *= 1.35; }, true),
    ] },
    { id: 'z_ward', name: 'Ward', desc: 'The barrier and the lance', talents: [
      tal('z_thick', 'Thick Ice', 1, 'Ice Barrier soaks a fifth more.', (t) => { t.icebarrier.shield *= 1.2; }),
      tal('z_keen', 'Keen Lance', 2, 'Ice Lance hits a fifth harder.', (t) => { t.icelance.dmg *= 1.2; }),
      tal('z_lasting', 'Lasting Ice', 2, 'Ice Barrier lasts thirteen seconds.', (t) => { t.icebarrier.secs = 13; }),
      tal('z_shard', 'Splinter', 3, 'Ice Lance hits a frozen foe two and a half times as hard.', (t) => { t.icelance.frozen = 2.5; }),
      tal('z_rime', 'Rime Armour', 4, 'Ice Barrier soaks 35% more again.', (t) => { t.icebarrier.shield *= 1.35; }, true),
    ] },
  ],
  pathfinder: [
    { id: 'p_arrows', name: 'Arrows', desc: 'The volley', talents: [
      tal('p_fletch', 'Fletcher', 1, 'Volley\'s arrows hit 15% harder.', (t) => { t.volley.dmg *= 1.15; }),
      tal('p_four', 'Four Shafts', 2, 'Volley looses four arrows.', (t) => { t.volley.arrows = 4; }),
      tal('p_longmark', 'Long Mark', 2, 'A mark lasts nine seconds.', (t) => { t.volley.mark = 9; }),
      tal('p_eye', 'Sharp Eye', 3, 'Marked foes take 22% more from you, not 15%.', (t) => { t.volley.markBonus = 0.22; }),
      tal('p_rain', 'Rain of Arrows', 4, 'Volley looses one more arrow and marks everything within six blocks.', (t) => { t.volley.arrows += 1; t.volley.markR = 6; }, true),
    ] },
    { id: 'p_shadow', name: 'Shadows', desc: 'Behind them', talents: [
      tal('p_quiet', 'Quiet Step', 1, 'Shadowstep reaches twenty blocks.', (t) => { t.shadowstep.range = 20; }),
      tal('p_daze', 'Dazing Step', 2, 'Shadowstep stuns for 1.6 seconds.', (t) => { t.shadowstep.stun = 1.6; }),
      tal('p_ambush', 'Ambush', 2, 'The heavy Strike after a Shadowstep can come up to five seconds later.', (t) => { t.shadowstep.window = 5; }),
      tal('p_kill', 'Killing Blow', 3, 'That Strike hits four times as hard, not three.', (t) => { t.shadowstep.mult = 4; }),
      tal('p_ghost', 'Ghost', 4, 'That Strike hits 35% harder again.', (t) => { t.shadowstep.mult *= 1.35; }, true),
    ] },
    { id: 'p_field', name: 'Fieldcraft', desc: 'Staying in the hunt', talents: [
      tal('p_bandage', 'Clean Bandage', 1, 'Field Dressing heals 55% of your health.', (t) => { t.dressing.heal = 0.55; }),
      tal('p_widemark', 'Wide Marks', 2, 'Volley marks everything within six blocks, and marked foes take 4% more.', (t) => { t.volley.markR = 6; t.volley.markBonus += 0.04; }),
      tal('p_surgeon', 'Field Surgeon', 2, 'Field Dressing heals 8% more of your health.', (t) => { t.dressing.heal += 0.08; }),
      tal('p_tracker', 'Tracker', 3, 'A mark lasts three seconds longer and adds 12% more.', (t) => { t.volley.mark += 3; t.volley.markBonus += 0.12; }),
      tal('p_survivor', 'Survivor', 4, 'Field Dressing heals 20% more of your health.', (t) => { t.dressing.heal += 0.2; }, true),
    ] },
  ],
};

/** Talent points at a combat level: one a level from level 3. */
export const pointsAt = (level: number) => Math.max(0, level - 2);

/** Every talent, by id. */
export const TALENTS: Record<string, { def: TalentDef; tree: TreeDef; calling: CallingId; index: number }> = {};
for (const [calling, trees] of Object.entries(TREES) as [CallingId, TreeDef[]][]) for (const tree of trees) tree.talents.forEach((def, index) => { TALENTS[def.id] = { def, tree, calling, index }; });

/** The calling's numbers with these talents applied (to a copy). */
export function tuned(learned: string[]): Tune {
  const t = JSON.parse(JSON.stringify(TUNE)) as Tune;
  for (const id of learned) TALENTS[id]?.def.mod(t);
  return t;
}

/** Points spent on a calling's talents. */
export const spent = (learned: string[]) => learned.reduce((n, id) => n + (TALENTS[id]?.def.cost ?? 0), 0);

/**
 * Whether a talent can be learned now: the calling's own, not held, enough points, the one before
 * it in its tree held (they go in order), and for a capstone, no other capstone held.
 */
export function canLearn(id: string, learned: string[], calling: CallingId, level: number): string | null {
  const t = TALENTS[id];
  if (!t || t.calling !== calling) return 'That isn\'t one of your calling\'s talents.';
  if (learned.includes(id)) return 'You know it already.';
  if (pointsAt(level) - spent(learned) < t.def.cost) return `It costs ${t.def.cost} points.`;
  if (t.index > 0 && !learned.includes(t.tree.talents[t.index - 1].id)) return `Learn ${t.tree.talents[t.index - 1].name} first.`;
  if (t.def.capstone && learned.some((x) => TALENTS[x]?.def.capstone)) return 'You can hold only one capstone. Unlearn the other first.';
  return null;
}
