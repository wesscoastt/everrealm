import type { Tune } from './talents';

// Skill points, ranks and morphs, the way ESO does them.
//   Points: one pool, earned by levelling (a point a level for the first twelve, then the talents'
//     three every five) and by Insight: every waymark attuned, every vista stood on and every wonder
//     found is a shard of it, and three shards make a point (ESO's skyshards).
//   They buy everything: a calling skill unlocked, a morph chosen, a talent rank.
//   Ranks: a skill grows with use, rank I to IV, each rank a little stronger.
//   Morphs: at rank IV it can be turned one of two ways, for a point. The two are different, not
//     better and worse: one leans one way and one the other.
//   Unlearning it all is done at a temple, kneeling at the altar (game/Game.ts), for a few marks a point.

/** Uses of a skill to reach each rank (I, II, III, IV). */
export const RANK_AT = [0, 10, 30, 60];
export const RANK_NAMES = ['I', 'II', 'III', 'IV'];
/** The rank (1..4) a skill has reached after this many uses. */
export const rankFor = (uses: number) => RANK_AT.filter((n) => uses >= n).length;
/** Each rank past the first makes a skill's blows, heals and wards this much stronger. */
export const RANK_STEP = 0.03;

/** Points from levels beyond the talents' own: a point a level for the first twelve (ESO's early points). */
export const earlyPoints = (level: number) => Math.min(Math.max(0, level - 1), 12);
/** Shards of Insight to a point. */
export const SHARDS_PER_POINT = 3;
/** Marks to unlearn everything at a temple, for each point spent. */
export const RESPEC_PER_POINT = 10;

export interface Morph { id: string; name: string; desc: string; mod: (t: Tune) => void }
const scale = (o: Record<string, number>, k: string, f: number) => { o[k] = (o[k] ?? 0) * f; };
const cd = (t: Tune, id: string, k: number) => { t.cd[id] = (t.cd[id] ?? 1) * k; };

/** Two morphs for every calling skill and weapon skill, by skill id: [a, b]. */
export const MORPHS: Record<string, [Morph, Morph]> = {
  // ---------------------------------------------------------------- Warden
  bulwark: [
    { id: 'bulwark_a', name: 'Stone Bulwark', desc: 'Soaks a fifth more, for two seconds less.', mod: (t) => { scale(t.bulwark, 'shield', 1.2); t.bulwark.secs -= 2; } },
    { id: 'bulwark_b', name: 'Mending Bulwark', desc: 'When it runs out, two fifths of what\'s left of it heals you.', mod: (t) => { t.bulwark.mend += 0.4; } },
  ],
  bash: [
    { id: 'bash_a', name: 'Ringing Bash', desc: 'Stuns 0.6 seconds longer; hits a little lighter.', mod: (t) => { t.bash.stun += 0.6; scale(t.bash, 'dmg', 0.92); } },
    { id: 'bash_b', name: 'Sweeping Bash', desc: 'Also strikes everything within two and a half blocks of the target, a little lighter.', mod: (t) => { t.bash.cleave = Math.max(t.bash.cleave, 2.5); scale(t.bash, 'dmg', 0.9); } },
  ],
  oath: [
    { id: 'oath_a', name: 'Oath of Iron', desc: 'You take half damage instead of three fifths; the ring burns cooler.', mod: (t) => { t.oath.taken -= 0.1; scale(t.oath, 'burn', 0.8); } },
    { id: 'oath_b', name: 'Burning Oath', desc: 'The ring burns a third hotter and a block wider; you take a little more.', mod: (t) => { scale(t.oath, 'burn', 1.35); t.oath.r += 1; t.oath.taken += 0.08; } },
  ],
  holdfast: [
    { id: 'holdfast_a', name: 'Rooted', desc: 'Lasts two seconds longer.', mod: (t) => { t.holdfast.secs += 2; } },
    { id: 'holdfast_b', name: 'Braced', desc: 'You take two fifths less instead of three tenths, for half a second less.', mod: (t) => { t.holdfast.taken -= 0.1; t.holdfast.secs -= 0.5; } },
  ],
  shieldthrow: [
    { id: 'shieldthrow_a', name: 'Ricochet', desc: 'The shield springs on to a second foe; each blow a tenth lighter.', mod: (t) => { t.shieldthrow.bounce = Math.max(1, t.shieldthrow.bounce); scale(t.shieldthrow, 'dmg', 0.9); } },
    { id: 'shieldthrow_b', name: 'Long Throw', desc: 'Reaches six blocks farther and staggers 0.4 seconds longer.', mod: (t) => { t.shieldthrow.range += 6; t.shieldthrow.stun += 0.4; } },
  ],
  rally: [
    { id: 'rally_a', name: 'Deep Breath', desc: 'Heals a further sixteenth of your health.', mod: (t) => { t.rally.heal += 0.06; } },
    { id: 'rally_b', name: 'Rallying Cry', desc: 'Recharges a quarter faster, healing a little less.', mod: (t) => { cd(t, 'rally', 0.75); t.rally.heal -= 0.03; } },
  ],
  // ---------------------------------------------------------------- Reaver
  bleed: [
    { id: 'bleed_a', name: 'Deep Cut', desc: 'Bleeds a fifth harder and a second and a half longer; the cut heals you less.', mod: (t) => { scale(t.bleed, 'dot', 1.2); t.bleed.secs += 1.5; t.bleed.cutHeal -= 0.015; } },
    { id: 'bleed_b', name: 'Blood Feast', desc: 'The cut and the bleeding heal you more; it bleeds lighter.', mod: (t) => { t.bleed.heal += 0.01; t.bleed.cutHeal += 0.01; scale(t.bleed, 'dot', 0.8); } },
  ],
  leap: [
    { id: 'leap_a', name: 'Crashing Leap', desc: 'Knocks everything where you land off its feet for a second; hits a tenth lighter.', mod: (t) => { t.leap.stun = Math.max(t.leap.stun, 1); scale(t.leap, 'dmg', 0.9); } },
    { id: 'leap_b', name: 'Long Leap', desc: 'Reaches five blocks farther, and the landing is wider.', mod: (t) => { t.leap.range += 5; t.leap.r += 0.7; } },
  ],
  redhour: [
    { id: 'redhour_a', name: 'The Long Hour', desc: 'Lasts four seconds longer, a little less fierce.', mod: (t) => { t.redhour.secs += 4; t.redhour.dealt -= 0.07; } },
    { id: 'redhour_b', name: 'The Bloody Hour', desc: 'Half again as much damage dealt instead of two fifths, and three tenths more taken.', mod: (t) => { t.redhour.dealt += 0.1; t.redhour.taken += 0.1; } },
  ],
  rend: [
    { id: 'rend_a', name: 'Wide Rend', desc: 'A block and more wider; a tenth lighter.', mod: (t) => { t.rend.r += 1.2; scale(t.rend, 'dmg', 0.9); } },
    { id: 'rend_b', name: 'Deep Rend', desc: 'The bleeding is two fifths harder and lasts two seconds longer.', mod: (t) => { scale(t.rend, 'dot', 1.4); t.rend.secs += 2; } },
  ],
  rush: [
    { id: 'rush_a', name: 'Long Rush', desc: 'Lasts three seconds longer.', mod: (t) => { t.rush.secs += 3; } },
    { id: 'rush_b', name: 'Frenzy', desc: 'You swing over half again as fast, for two seconds less.', mod: (t) => { t.rush.speed += 0.15; t.rush.secs -= 2; } },
  ],
  hamstring: [
    { id: 'hamstring_a', name: 'Crippling Cut', desc: 'Holds the target 0.7 seconds longer.', mod: (t) => { t.hamstring.stun += 0.7; } },
    { id: 'hamstring_b', name: 'Tendon Strike', desc: 'Hits a third harder; holds it 0.4 seconds less.', mod: (t) => { scale(t.hamstring, 'dmg', 1.3); t.hamstring.stun -= 0.4; } },
  ],
  // ---------------------------------------------------------------- Kindler
  ward: [
    { id: 'ward_a', name: 'Bright Ward', desc: 'Heals a further twelfth of your health.', mod: (t) => { t.ward.heal += 0.08; } },
    { id: 'ward_b', name: 'Searing Ward', desc: 'Burns half again as hot and a block wider; heals a little less.', mod: (t) => { scale(t.ward, 'burn', 1.5); t.ward.r += 1; t.ward.heal -= 0.05; } },
  ],
  bolt: [
    { id: 'bolt_a', name: 'Bursting Bolt', desc: 'The burst on every third bolt is a third harder and a block wider.', mod: (t) => { scale(t.bolt, 'burst', 1.3); t.bolt.r += 1; } },
    { id: 'bolt_b', name: 'Quick Bolt', desc: 'Recharges a fifth faster, a tenth lighter.', mod: (t) => { cd(t, 'bolt', 0.8); scale(t.bolt, 'dmg', 0.9); } },
  ],
  starfall: [
    { id: 'starfall_a', name: 'Twin Stars', desc: 'A second star falls after the first at half strength; both a fifth lighter.', mod: (t) => { t.starfall.twice = Math.max(t.starfall.twice, 0.5); scale(t.starfall, 'dmg', 0.8); } },
    { id: 'starfall_b', name: 'Falling Sky', desc: 'Strikes a block and a half wider, a moment later.', mod: (t) => { t.starfall.r += 1.5; t.starfall.delay += 0.3; } },
  ],
  firewall: [
    { id: 'firewall_a', name: 'Wide Ring', desc: 'A block wider, a tenth cooler.', mod: (t) => { t.firewall.r += 1; scale(t.firewall, 'burn', 0.9); } },
    { id: 'firewall_b', name: 'Hearth Ring', desc: 'Standing in it heals you a fiftieth of your health a second.', mod: (t) => { t.firewall.heal += 0.02; } },
  ],
  cinderstep: [
    { id: 'cinderstep_a', name: 'Long Step', desc: 'Springs three blocks farther.', mod: (t) => { t.cinderstep.dist += 3; } },
    { id: 'cinderstep_b', name: 'Burning Step', desc: 'The cinders burn two fifths hotter and a second longer.', mod: (t) => { scale(t.cinderstep, 'burn', 1.4); t.cinderstep.secs += 1; } },
  ],
  kindle: [
    { id: 'kindle_a', name: 'Stoke', desc: 'Gathers three Kindling instead of two.', mod: (t) => { t.kindle.stacks += 1; } },
    { id: 'kindle_b', name: 'White Heat', desc: 'The next Ember Bolt strikes two and a half times as hard instead of twice.', mod: (t) => { t.kindle.mult += 0.5; } },
  ],
  // ---------------------------------------------------------------- Pathfinder
  dressing: [
    { id: 'dressing_a', name: 'Clean Dressing', desc: 'Heals a further fourteenth of your health at once.', mod: (t) => { t.dressing.heal += 0.07; } },
    { id: 'dressing_b', name: 'Poultice', desc: 'Heals an eighth less at once, and a seventh of your health over the next five seconds.', mod: (t) => { t.dressing.heal -= 0.12; t.dressing.hot += 0.14; } },
  ],
  volley: [
    { id: 'volley_a', name: 'Five Arrows', desc: 'Five arrows instead of three, each lighter.', mod: (t) => { t.volley.arrows += 2; scale(t.volley, 'dmg', 0.7); } },
    { id: 'volley_b', name: 'Hunter\'s Mark', desc: 'The mark makes everything near it take more, half a block farther round.', mod: (t) => { t.volley.markBonus += 0.05; t.volley.markR += 0.5; } },
  ],
  shadowstep: [
    { id: 'shadowstep_a', name: 'Ambush', desc: 'The Strike after it hits harder still, with a little less time to land it.', mod: (t) => { t.shadowstep.mult += 0.6; t.shadowstep.window -= 0.5; } },
    { id: 'shadowstep_b', name: 'Fading Step', desc: 'Reaches six blocks farther and stuns 0.6 seconds longer.', mod: (t) => { t.shadowstep.range += 6; t.shadowstep.stun += 0.6; } },
  ],
  snare: [
    { id: 'snare_a', name: 'Gin', desc: 'Snaps half again as hard and holds half a second longer.', mod: (t) => { scale(t.snare, 'dmg', 1.5); t.snare.stun += 0.5; } },
    { id: 'snare_b', name: 'Wide Snare', desc: 'Catches anything within a block more of it.', mod: (t) => { t.snare.r += 1; } },
  ],
  rain: [
    { id: 'rain_a', name: 'Storm of Arrows', desc: 'A block and a half wider, a tenth lighter.', mod: (t) => { t.rain.r += 1.5; scale(t.rain, 'dmg', 0.9); } },
    { id: 'rain_b', name: 'Marking Rain', desc: 'Everything it falls on is marked, as Volley marks.', mod: (t) => { t.rain.mark = 1; } },
  ],
  quickstep: [
    { id: 'quickstep_a', name: 'Long Spring', desc: 'Springs three blocks farther.', mod: (t) => { t.quickstep.dist += 3; } },
    { id: 'quickstep_b', name: 'Slip Away', desc: 'Nothing touches you for most of a second after it.', mod: (t) => { t.quickstep.evade = Math.max(t.quickstep.evade, 0.8); } },
  ],
  // ---------------------------------------------------------------- Wizard
  icebarrier: [
    { id: 'icebarrier_a', name: 'Frost Shell', desc: 'Soaks a fifth more, for three seconds less.', mod: (t) => { scale(t.icebarrier, 'shield', 1.2); t.icebarrier.secs -= 3; } },
    { id: 'icebarrier_b', name: 'Shattering Barrier', desc: 'Bursts into a Frost Nova when it breaks; soaks a tenth less.', mod: (t) => { t.icebarrier.nova = Math.max(1, t.icebarrier.nova); scale(t.icebarrier, 'shield', 0.9); } },
  ],
  frostbolt: [
    { id: 'frostbolt_a', name: 'Heavy Shard', desc: 'Hits nearly a fifth harder.', mod: (t) => { scale(t.frostbolt, 'dmg', 1.18); cd(t, 'frostbolt', 1.1); } },
    { id: 'frostbolt_b', name: 'Far Shard', desc: 'Reaches eight blocks farther.', mod: (t) => { t.frostbolt.range += 8; } },
  ],
  blizzard: [
    { id: 'blizzard_a', name: 'Whiteout', desc: 'A block and a half wider, a tenth lighter.', mod: (t) => { t.blizzard.r += 1.5; scale(t.blizzard, 'dmg', 0.9); } },
    { id: 'blizzard_b', name: 'Deep Cold', desc: 'Chills twice as fast.', mod: (t) => { t.blizzard.chills += 1; } },
  ],
  blink: [
    { id: 'blink_a', name: 'Long Blink', desc: 'Reaches five blocks farther.', mod: (t) => { t.blink.range += 5; } },
    { id: 'blink_b', name: 'Fading Blink', desc: 'Nothing touches you for most of a second longer after it.', mod: (t) => { t.blink.evade += 0.8; } },
  ],
  icelance: [
    { id: 'icelance_a', name: 'Shatter Lance', desc: 'Even harder on a frozen foe, a tenth lighter on the rest.', mod: (t) => { t.icelance.frozen += 0.6; scale(t.icelance, 'dmg', 0.9); } },
    { id: 'icelance_b', name: 'Quick Lance', desc: 'Recharges a fifth faster.', mod: (t) => { cd(t, 'icelance', 0.8); scale(t.icelance, 'dmg', 0.95); } },
  ],
  frostnova: [
    { id: 'frostnova_a', name: 'Wide Nova', desc: 'Reaches a block and a half farther.', mod: (t) => { t.frostnova.r += 1.5; } },
    { id: 'frostnova_b', name: 'Deep Freeze', desc: 'Holds them frozen a second longer, hurting a little less.', mod: (t) => { t.frostnova.freeze += 1; scale(t.frostnova, 'dmg', 0.85); } },
  ],
  // ---------------------------------------------------------------- Mender
  mend: [
    { id: 'mend_a', name: 'Swift Mend', desc: 'Recharges a quarter faster, healing a sixth less.', mod: (t) => { cd(t, 'mend', 0.75); scale(t.mend, 'heal', 0.84); } },
    { id: 'mend_b', name: 'Deep Mend', desc: 'Heals a further eighth, and recharges a sixth slower.', mod: (t) => { scale(t.mend, 'heal', 1.125); cd(t, 'mend', 1.16); } },
  ],
  lanternlight: [
    { id: 'lanternlight_a', name: 'Searing Lantern', desc: 'Strikes a twentieth harder; its glow heals a quarter less.', mod: (t) => { scale(t.lanternlight, 'dmg', 1.05); scale(t.lanternlight, 'heal', 0.75); } },
    { id: 'lanternlight_b', name: 'Kindly Lantern', desc: 'Its glow heals a quarter more; it strikes a twentieth lighter.', mod: (t) => { scale(t.lanternlight, 'heal', 1.25); scale(t.lanternlight, 'dmg', 0.95); } },
  ],
  sanctuary: [
    { id: 'sanctuary_a', name: 'Long Vigil', desc: 'Lasts four seconds longer, healing a little less a second.', mod: (t) => { t.sanctuary.secs += 4; t.sanctuary.heal -= 0.012; } },
    { id: 'sanctuary_b', name: 'Burning Ground', desc: 'Burns foes on it twice as hot; you take a little more on it.', mod: (t) => { scale(t.sanctuary, 'burn', 2); t.sanctuary.taken += 0.07; } },
  ],
  lampward: [
    { id: 'lampward_a', name: 'Heavy Ward', desc: 'Soaks a quarter more, for three seconds less.', mod: (t) => { scale(t.lampward, 'shield', 1.25); t.lampward.secs -= 3; } },
    { id: 'lampward_b', name: 'Wide Ward', desc: 'Reaches six blocks farther, soaking a tenth less.', mod: (t) => { t.lampward.r += 6; scale(t.lampward, 'shield', 0.9); } },
  ],
  rebuke: [
    { id: 'rebuke_a', name: 'Blinding Word', desc: 'Dazes 0.7 seconds longer; strikes a tenth lighter.', mod: (t) => { t.rebuke.stun += 0.7; scale(t.rebuke, 'dmg', 0.9); } },
    { id: 'rebuke_b', name: 'Scalding Word', desc: 'Strikes a quarter harder; dazes 0.4 seconds less.', mod: (t) => { scale(t.rebuke, 'dmg', 1.25); t.rebuke.stun -= 0.4; } },
  ],
  restore: [
    { id: 'restore_a', name: 'Quick Restoration', desc: 'All of it in three seconds, not six, a little less of it.', mod: (t) => { t.restore.secs = 3; t.restore.heal -= 0.02; } },
    { id: 'restore_b', name: 'Deep Restoration', desc: 'Heals a fifth more, and recharges a fifth slower.', mod: (t) => { scale(t.restore, 'heal', 1.2); cd(t, 'restore', 1.2); } },
  ],
  // ---------------------------------------------------------------- Gravecaller
  siphon: [
    { id: 'siphon_a', name: 'Drink Deep', desc: 'Heals a fifth more, and recharges a fifth slower.', mod: (t) => { scale(t.siphon, 'heal', 1.2); cd(t, 'siphon', 1.2); } },
    { id: 'siphon_b', name: 'Leech', desc: 'Strikes a quarter harder, healing a sixth less.', mod: (t) => { scale(t.siphon, 'dmg', 1.25); scale(t.siphon, 'heal', 0.84); } },
  ],
  wither: [
    { id: 'wither_a', name: 'Black Frost', desc: 'The bolt strikes a tenth harder; the curse eats a tenth slower.', mod: (t) => { scale(t.wither, 'dmg', 1.1); scale(t.wither, 'dot', 0.9); } },
    { id: 'wither_b', name: 'Long Wither', desc: 'The curse lasts three seconds longer; the bolt strikes a tenth lighter.', mod: (t) => { t.wither.secs += 3; scale(t.wither, 'dmg', 0.9); } },
  ],
  raise: [
    { id: 'raise_a', name: 'Old Soldiers', desc: 'The raised hit a quarter harder, and lie down five seconds sooner.', mod: (t) => { scale(t.raise, 'dmg', 1.25); t.raise.secs -= 5; } },
    { id: 'raise_b', name: 'Long Watch', desc: 'The raised stay up eight seconds longer, hitting a sixth lighter.', mod: (t) => { t.raise.secs += 8; scale(t.raise, 'dmg', 0.84); } },
  ],
  boneward: [
    { id: 'boneward_a', name: 'Thick Bone', desc: 'Soaks a quarter more, for three seconds less.', mod: (t) => { scale(t.boneward, 'shield', 1.25); t.boneward.secs -= 3; } },
    { id: 'boneward_b', name: 'Quick Bone', desc: 'Recharges a fifth faster, soaking a sixth less.', mod: (t) => { cd(t, 'boneward', 0.8); scale(t.boneward, 'shield', 0.84); } },
  ],
  gravegrip: [
    { id: 'gravegrip_a', name: 'Deep Grip', desc: 'Holds 0.6 seconds longer; strikes a tenth lighter.', mod: (t) => { t.gravegrip.stun += 0.6; scale(t.gravegrip, 'dmg', 0.9); } },
    { id: 'gravegrip_b', name: 'Crushing Grip', desc: 'Strikes a quarter harder; holds 0.4 seconds less.', mod: (t) => { scale(t.gravegrip, 'dmg', 1.25); t.gravegrip.stun -= 0.4; } },
  ],
  graverot: [
    { id: 'graverot_a', name: 'Wide Rot', desc: 'Reaches two blocks farther, striking a tenth lighter.', mod: (t) => { t.graverot.r += 2; scale(t.graverot, 'dmg', 0.9); } },
    { id: 'graverot_b', name: 'Black Rot', desc: 'Strikes a quarter harder, reaching a block less.', mod: (t) => { scale(t.graverot, 'dmg', 1.25); t.graverot.r -= 1; } },
  ],
  // ---------------------------------------------------------------- Weapon skills (key 3)
  riposte: [
    { id: 'riposte_a', name: 'Iron Guard', desc: 'The guard stays up 0.6 seconds longer.', mod: (t) => { t.riposte.secs += 0.6; } },
    { id: 'riposte_b', name: 'Counter', desc: 'Strikes back a third harder, the guard up 0.3 seconds less.', mod: (t) => { scale(t.riposte, 'dmg', 1.3); t.riposte.secs -= 0.3; } },
  ],
  flurry: [
    { id: 'flurry_a', name: 'Whirl of Steel', desc: 'Six cuts instead of four, each lighter.', mod: (t) => { t.flurry.hits += 2; scale(t.flurry, 'dmg', 0.72); } },
    { id: 'flurry_b', name: 'Measured Cuts', desc: 'Three cuts instead of four, each a third and more harder.', mod: (t) => { t.flurry.hits -= 1; scale(t.flurry, 'dmg', 1.36); } },
  ],
  sunder: [
    { id: 'sunder_a', name: 'Earthbreaker', desc: 'Strikes a block wider, a tenth lighter.', mod: (t) => { t.sunder.r += 1; scale(t.sunder, 'dmg', 0.9); } },
    { id: 'sunder_b', name: 'Felling Blow', desc: 'Knocks them down 0.7 seconds longer.', mod: (t) => { t.sunder.stun += 0.7; } },
  ],
};

/** A skill's numbers stronger by its rank: its blows, heals, wards and burns (applied to a tuned copy). */
export function applyRank(t: Tune, id: string, rank: number): void {
  const o = (t as unknown as Record<string, Record<string, number>>)[id];
  if (!o || rank <= 1) return;
  const k = 1 + RANK_STEP * (rank - 1);
  for (const f of ['dmg', 'heal', 'shield', 'burn', 'dot', 'burst']) if (typeof o[f] === 'number') o[f] *= k;
}
