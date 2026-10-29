import { CallingId, TUNE } from './classes';

// Talents: three trees for each calling, in the manner of the older WoW trees. Each tree is one way
// of playing the calling (what it leans on, and the two utilities it wants beside the signature),
// in six tiers: two talents a tier, each with ranks bought a point at a time, and a capstone at the
// foot that changes how the calling plays rather than only its numbers. A tier opens once five
// points are spent in that tree for each tier above it, so the foot needs twenty-five.
//
// Points come at three for every five levels (59 by level 100), and a full tree is 29. By the cap a
// character fills one tree and most of a second, and can hold only one capstone, so a build is a
// choice made over the whole climb, not by level 30. Talents change the numbers the calling's skills
// use (data/classes.ts TUNE), which is how the balance check (npm run balance) plays every tree and
// holds them level. Unlearn everything for nothing, any time out of a fight.

export type Tune = typeof TUNE;

export interface TalentDef {
  id: string;
  name: string;
  /** What one rank does (or the capstone's whole effect). */
  desc: string;
  ranks: number;
  /** 0 to 5: tier k opens at 5k points spent in the tree. */
  tier: number;
  capstone?: boolean;
  /** What one rank changes in the calling's numbers (applied to a copy, once per rank). */
  mod: (t: Tune) => void;
}

export interface TreeDef {
  id: string;
  name: string;
  desc: string;
  /** The two utilities this way of playing wants beside the signature (the balance check plays it with them). */
  bar: [string, string];
  talents: TalentDef[];
}

/** Points spent in a tree for each tier below the top. */
export const TIER_GATE = 5;

type Row = [string, string, number, string, (t: Tune) => void];
/** A tree from its rows: four tiers of two three-rank talents, a tier of two two-rank ones, and the capstone. */
function tree(id: string, name: string, desc: string, bar: [string, string], rows: Row[], cap: [string, string, string, (t: Tune) => void]): TreeDef {
  const talents: TalentDef[] = rows.map(([tid, tname, ranks, tdesc, mod], i) => ({ id: tid, name: tname, ranks, desc: tdesc, mod, tier: Math.floor(i / 2) }));
  talents.push({ id: cap[0], name: cap[1], desc: cap[2], ranks: 1, tier: 5, capstone: true, mod: cap[3] });
  return { id, name, desc, bar, talents };
}
/** A skill recharging faster. */
const cd = (t: Tune, id: string, k: number) => { t.cd[id] = (t.cd[id] ?? 1) * k; };

export const TREES: Record<CallingId, TreeDef[]> = {
  warden: [
    tree('w_line', 'The Line', 'Taking the blows. Bulwark, Resolve and Hold Fast, for the one who stands in front.', ['holdfast', 'rally'], [
      ['w_thick', 'Thick Skin', 3, 'Each Resolve takes a further 0.4% off the damage you take.', (t) => { t.resolve.per += 0.004; }],
      ['w_broad', 'Broad Shield', 3, 'Bulwark soaks 6% more.', (t) => { t.bulwark.shield *= 1.06; }],
      ['w_planted', 'Planted', 3, 'Hold Fast lasts half a second longer.', (t) => { t.holdfast.secs += 0.5; }],
      ['w_longward', 'Long Ward', 3, 'Bulwark lasts a second longer.', (t) => { t.bulwark.secs += 1; }],
      ['w_ironoath', 'Iron Oath', 3, 'Inside the Oath of the Ring you take 3% less.', (t) => { t.oath.taken -= 0.03; }],
      ['w_wind', 'Second Wind', 3, 'Rally heals 2% more of your health.', (t) => { t.rally.heal += 0.02; }],
      ['w_rim', 'Iron Rim', 3, 'Shield Bash hits 6% harder.', (t) => { t.bash.dmg *= 1.06; }],
      ['w_quickward', 'Quick Ward', 3, 'Bulwark recharges 5% faster.', (t) => cd(t, 'bulwark', 0.95)],
      ['w_deep', 'Deep Resolve', 2, 'Resolve stacks one higher.', (t) => { t.resolve.max += 1; }],
      ['w_bitter', 'Bitter Resolve', 2, 'Each Resolve adds 4% to the damage you deal.', (t) => { t.resolve.dmg += 0.04; }],
    ], ['w_unbroken', 'Unbroken', 'When Bulwark is broken it bursts: everything within four blocks takes a heavy blow and is stunned for a second. Shield Bash recharges a fifth faster.', (t) => { t.bulwark.burst = 2.4; t.bulwark.burstStun = 1; cd(t, 'bash', 0.8); }]),
    tree('w_toll', 'The Toll', 'Making them pay. Shield Bash, Shield Throw and the Oath\'s fire, for a Warden who ends fights.', ['shieldthrow', 'holdfast'], [
      ['w_heavy', 'Heavy Hand', 3, 'Shield Bash hits 6% harder.', (t) => { t.bash.dmg *= 1.06; }],
      ['w_strongarm', 'Strong Arm', 3, 'Shield Throw hits 6% harder.', (t) => { t.shieldthrow.dmg *= 1.06; }],
      ['w_ringing', 'Ringing Blow', 3, 'Shield Bash stuns 0.15 seconds longer.', (t) => { t.bash.stun += 0.15; }],
      ['w_fire', 'Fire in the Ring', 3, 'The Oath of the Ring burns 10% hotter.', (t) => { t.oath.burn *= 1.1; }],
      ['w_quickbash', 'Quick Bash', 3, 'Shield Bash recharges 6% faster.', (t) => cd(t, 'bash', 0.94)],
      ['w_wide', 'Wide Ring', 3, 'The Oath of the Ring reaches half a block farther.', (t) => { t.oath.r += 0.5; }],
      ['w_longarm', 'Long Arm', 3, 'Shield Throw reaches two blocks farther and staggers 0.15 seconds longer.', (t) => { t.shieldthrow.range += 2; t.shieldthrow.stun += 0.15; }],
      ['w_quickthrow', 'Quick Throw', 3, 'Shield Throw recharges 6% faster.', (t) => cd(t, 'shieldthrow', 0.94)],
      ['w_hotiron', 'Hot Iron', 2, 'The Oath of the Ring burns 12% hotter.', (t) => { t.oath.burn *= 1.12; }],
      ['w_crushing', 'Crushing Blow', 2, 'Shield Bash hits 10% harder.', (t) => { t.bash.dmg *= 1.1; }],
    ], ['w_tolldue', 'Toll Due', 'Shield Bash strikes everything within three blocks of your target, and Shield Throw springs on to strike a second foe.', (t) => { t.bash.cleave = 3; t.shieldthrow.bounce = 1; }]),
    tree('w_watch', 'The Watch', 'Lasting the night. The Oath, Rally and a ward that mends, for long fights alone.', ['rally', 'holdfast'], [
      ['w_steady', 'Steady', 3, 'Resolve holds a second longer without a blow.', (t) => { t.resolve.fade += 1; }],
      ['w_mending', 'Field Mending', 3, 'Rally heals 2% more of your health.', (t) => { t.rally.heal += 0.02; }],
      ['w_longoath', 'Long Oath', 3, 'The Oath of the Ring lasts 0.7 seconds longer.', (t) => { t.oath.secs += 0.7; }],
      ['w_quickrally', 'Quick Rally', 3, 'Rally recharges 6% faster.', (t) => cd(t, 'rally', 0.94)],
      ['w_watchman', 'Watchman', 3, 'Bulwark soaks 5% more and lasts half a second longer.', (t) => { t.bulwark.shield *= 1.05; t.bulwark.secs += 0.5; }],
      ['w_vigil', 'Vigil', 3, 'The Oath of the Ring recharges 5% faster.', (t) => cd(t, 'oath', 0.95)],
      ['w_mendward', 'Mending Ward', 3, 'When Bulwark runs out, 15% of what it had left heals you.', (t) => { t.bulwark.mend += 0.15; }],
      ['w_patient', 'Patient', 3, 'Hold Fast recharges 6% faster.', (t) => cd(t, 'holdfast', 0.94)],
      ['w_longwatch', 'Long Watch', 2, 'The Oath of the Ring lasts a second longer.', (t) => { t.oath.secs += 1; }],
      ['w_firm', 'Firm', 2, 'Each Resolve takes a further 0.5% off.', (t) => { t.resolve.per += 0.005; }],
    ], ['w_ever', 'Ever-watchful', 'While the Oath of the Ring holds, it heals you 3% of your health a second.', (t) => { t.oath.heal = 0.03; }]),
  ],
  reaver: [
    tree('r_blood', 'Blood', 'Bleeding them dry. Bloodletting, Rend and Hamstring, healing on every wound.', ['rend', 'hamstring'], [
      ['r_deep', 'Deep Cuts', 3, 'Bloodletting bleeds 8% harder.', (t) => { t.bleed.dot *= 1.08; }],
      ['r_jagged', 'Jagged Edge', 3, 'Rend and its bleed hit 6% harder.', (t) => { t.rend.dmg *= 1.06; t.rend.dot *= 1.06; }],
      ['r_long', 'Long Wound', 3, 'Bloodletting\'s bleed runs 0.7 seconds longer.', (t) => { t.bleed.secs += 0.7; }],
      ['r_drink', 'Drinker', 3, 'Each second of bleeding heals you a further 0.2%.', (t) => { t.bleed.heal += 0.002; }],
      ['r_vein', 'Open Vein', 3, 'Bloodletting\'s cut hits 7% harder.', (t) => { t.bleed.dmg *= 1.07; }],
      ['r_quickknife', 'Quick Knife', 3, 'Bloodletting recharges 5% faster.', (t) => cd(t, 'bleed', 0.95)],
      ['r_tendon', 'Tendon Cut', 3, 'Hamstring holds 0.15 seconds longer and hits 6% harder.', (t) => { t.hamstring.stun += 0.15; t.hamstring.dmg *= 1.06; }],
      ['r_gore', 'Gore', 3, 'Rend\'s bleed runs a second longer.', (t) => { t.rend.secs += 1; }],
      ['r_redtide', 'Red Tide', 2, 'Bloodletting bleeds 8% harder.', (t) => { t.bleed.dot *= 1.08; }],
      ['r_feast', 'Feast', 2, 'Bloodletting\'s cut heals you 1.5% more.', (t) => { t.bleed.cutHeal += 0.015; }],
    ], ['r_drain', 'Exsanguinate', 'When something dies bleeding, the bleed jumps to the nearest foe within five blocks with the time it had left.', (t) => { t.bleed.spread = 5; }]),
    tree('r_fury', 'Fury', 'Anger as a weapon. Fury, Blood Rush and the Red Hour, all of it at once.', ['rush', 'rend'], [
      ['r_temper', 'Quick Temper', 3, 'Every blow builds 0.7 more Fury.', (t) => { t.fury.perHit += 0.7; }],
      ['r_hotblood', 'Hot Blood', 3, 'Blood Rush lasts half a second longer.', (t) => { t.rush.secs += 0.5; }],
      ['r_seethe', 'Seething', 3, 'At full Fury your next skill hits a further 5% harder.', (t) => { t.fury.mult += 0.05; }],
      ['r_hour', 'The Long Hour', 3, 'The Red Hour lasts a second longer.', (t) => { t.redhour.secs += 1; }],
      ['r_lust', 'Bloodlust', 3, 'In the Red Hour you deal a further 2% more.', (t) => { t.redhour.dealt += 0.02; }],
      ['r_frenzy', 'Frenzy', 3, 'Blood Rush makes you swing a further 4% faster.', (t) => { t.rush.speed += 0.04; }],
      ['r_fuse', 'Short Fuse', 3, 'The Red Hour recharges 5% faster.', (t) => cd(t, 'redhour', 0.95)],
      ['r_quickrush', 'Quick Rush', 3, 'Blood Rush recharges 6% faster.', (t) => cd(t, 'rush', 0.94)],
      ['r_wrath', 'Wrath', 2, 'At full Fury your next skill hits a further 7% harder.', (t) => { t.fury.mult += 0.07; }],
      ['r_heedless', 'Heedless', 2, 'In the Red Hour you take 5% less of the extra damage.', (t) => { t.redhour.taken -= 0.05; }],
    ], ['r_berserk', 'Berserk', 'The Red Hour no longer makes you take more damage, and every blow you land in it builds double Fury.', (t) => { t.redhour.taken = 1; t.fury.red = 2; }]),
    tree('r_leap', 'The Leap', 'Falling on them. Leaping Cut and wide cuts, for packs.', ['rend', 'rush'], [
      ['r_longleap', 'Long Leap', 3, 'Leaping Cut reaches a block farther.', (t) => { t.leap.range += 1; }],
      ['r_landing', 'Heavy Landing', 3, 'Leaping Cut hits 6% harder.', (t) => { t.leap.dmg *= 1.06; }],
      ['r_crater', 'Crater', 3, 'Leaping Cut strikes a quarter of a block wider.', (t) => { t.leap.r += 0.25; }],
      ['r_spring', 'Spring', 3, 'Leaping Cut recharges 5% faster.', (t) => cd(t, 'leap', 0.95)],
      ['r_momentum', 'Momentum', 3, 'Leaping Cut hits 4% harder.', (t) => { t.leap.dmg *= 1.04; }],
      ['r_wideswing', 'Wide Swing', 3, 'Rend reaches a third of a block farther and hits 5% harder.', (t) => { t.rend.r += 0.33; t.rend.dmg *= 1.05; }],
      ['r_quickrend', 'Quick Rend', 3, 'Rend recharges 6% faster.', (t) => cd(t, 'rend', 0.94)],
      ['r_knees', 'Iron Knees', 3, 'Leaping Cut recharges 4% faster and hits 3% harder.', (t) => { cd(t, 'leap', 0.96); t.leap.dmg *= 1.03; }],
      ['r_avalanche', 'Avalanche', 2, 'Leaping Cut hits 6% harder.', (t) => { t.leap.dmg *= 1.06; }],
      ['r_whirl', 'Whirl', 2, 'Rend hits 8% harder.', (t) => { t.rend.dmg *= 1.08; }],
    ], ['r_thunder', 'Thunderfall', 'Leaping Cut knocks everything it strikes off its feet for a second, and strikes half a block wider.', (t) => { t.leap.stun = 1; t.leap.r += 0.5; }]),
  ],
  ashcaller: [
    tree('a_embers', 'Embers', 'The bolt and its burst. Ember Bolt and Kindle, for one foe at a time.', ['kindle', 'firewall'], [
      ['a_coals', 'Hot Coals', 3, 'Ember Bolt burns 3% hotter.', (t) => { t.bolt.dmg *= 1.03; }],
      ['a_burst', 'Bright Burst', 3, 'The burst burns 4% hotter.', (t) => { t.bolt.burst *= 1.04; }],
      ['a_spread', 'Spreading Fire', 3, 'The burst reaches a third of a block wider.', (t) => { t.bolt.r += 0.33; }],
      ['a_tinder', 'Tinder', 3, 'Kindle recharges 6% faster.', (t) => cd(t, 'kindle', 0.94)],
      ['a_longshot', 'Long Shot', 3, 'Ember Bolt reaches two blocks farther.', (t) => { t.bolt.range += 2; }],
      ['a_bellows', 'Bellows', 3, 'The bolt after a Kindle strikes a further 10% harder.', (t) => { t.kindle.mult += 0.1; }],
      ['a_white', 'White Heat', 3, 'Ember Bolt burns 3% hotter.', (t) => { t.bolt.dmg *= 1.03; }],
      ['a_flash', 'Flashover', 3, 'The burst burns 4% hotter.', (t) => { t.bolt.burst *= 1.04; }],
      ['a_banked', 'Banked Fire', 2, 'The bolt after a Kindle strikes a further 15% harder.', (t) => { t.kindle.mult += 0.15; }],
      ['a_searing', 'Searing', 2, 'Ember Bolt burns 2% hotter.', (t) => { t.bolt.dmg *= 1.02; }],
    ], ['a_storm', 'Firestorm', 'Every second Ember Bolt bursts, not every third.', (t) => { t.bolt.every = 2; }]),
    tree('a_stars', 'Stars', 'What falls from the sky. Starfall and the Ring of Fire, for crowds.', ['firewall', 'cinderstep'], [
      ['a_bright', 'Brighter Star', 3, 'Starfall strikes 5% harder.', (t) => { t.starfall.dmg *= 1.05; }],
      ['a_widering', 'Wide Ring', 3, 'The Ring of Fire reaches 0.3 blocks wider.', (t) => { t.firewall.r += 0.3; }],
      ['a_quick', 'Quick Fall', 3, 'The star comes down 0.12 seconds sooner.', (t) => { t.starfall.delay -= 0.12; }],
      ['a_widefall', 'Wide Fall', 3, 'Starfall strikes 0.3 blocks wider.', (t) => { t.starfall.r += 0.3; }],
      ['a_heavystar', 'Heavy Star', 3, 'Starfall strikes 6% harder.', (t) => { t.starfall.dmg *= 1.06; }],
      ['a_longring', 'Long Burning', 3, 'The Ring of Fire burns half a second longer.', (t) => { t.firewall.secs += 0.5; }],
      ['a_comet', 'Comet', 3, 'Starfall recharges 5% faster.', (t) => cd(t, 'starfall', 0.95)],
      ['a_hotground', 'Hot Ground', 3, 'The Ring of Fire burns 6% hotter.', (t) => { t.firewall.burn *= 1.06; }],
      ['a_falling', 'Falling Sky', 2, 'Starfall strikes 8% harder.', (t) => { t.starfall.dmg *= 1.08; }],
      ['a_quickring', 'Quick Kindling', 2, 'The Ring of Fire recharges 8% faster.', (t) => cd(t, 'firewall', 0.92)],
    ], ['a_twin', 'Two Stars', 'A second star falls on the same spot a moment after the first, at half its strength.', (t) => { t.starfall.twice = 0.5; }]),
    tree('a_cinders', 'Cinders', 'The ward and its fire. Cinder Ward and Cinder Step, for a Kindler who gets caught up close.', ['cinderstep', 'firewall'], [
      ['a_warm', 'Warm Hands', 3, 'Cinder Ward heals 5% more.', (t) => { t.ward.heal *= 1.05; }],
      ['a_hotward', 'Hot Ward', 3, 'Cinder Ward burns 7% hotter.', (t) => { t.ward.burn *= 1.07; }],
      ['a_wideward', 'Wide Ward', 3, 'Cinder Ward burns a third of a block farther out.', (t) => { t.ward.r += 0.33; }],
      ['a_lightfeet', 'Light Feet', 3, 'Cinder Step recharges 6% faster and springs half a block farther.', (t) => { cd(t, 'cinderstep', 0.94); t.cinderstep.dist += 0.5; }],
      ['a_slow', 'Slow Burn', 3, 'Cinder Ward lasts 0.7 seconds longer.', (t) => { t.ward.secs += 0.7; t.ward.heal *= 1.03; }],
      ['a_ash', 'Ash Trail', 3, 'Cinder Step\'s cinders burn 8% hotter.', (t) => { t.cinderstep.burn *= 1.08; }],
      ['a_quickward', 'Quick Ward', 3, 'Cinder Ward recharges 5% faster.', (t) => cd(t, 'ward', 0.95)],
      ['a_smoulder', 'Smoulder', 3, 'Cinder Step\'s cinders burn a second longer.', (t) => { t.cinderstep.secs += 1; }],
      ['a_pyre', 'Pyre', 2, 'Cinder Ward heals and burns 7% more.', (t) => { t.ward.heal *= 1.07; t.ward.burn *= 1.07; }],
      ['a_live', 'Live Embers', 2, 'The Ring of Fire burns 8% hotter.', (t) => { t.firewall.burn *= 1.08; }],
    ], ['a_hearth', 'Hearth', 'Standing in your own Ring of Fire or cinders heals you 3% of your health a second.', (t) => { t.firewall.heal = 0.03; }]),
  ],
  wizard: [
    tree('z_frost', 'Frost', 'The bolt and the freeze. Frost Bolt, Chill and Ice Lance, for one foe at a time.', ['icelance', 'frostnova'], [
      ['z_bite', 'Bitter Cold', 3, 'Frost Bolt hits 4% harder.', (t) => { t.frostbolt.dmg *= 1.04; }],
      ['z_crack', 'Crack', 3, 'A frozen foe cracks for 10% more.', (t) => { t.chill.shatter *= 1.1; }],
      ['z_hardfreeze', 'Hard Freeze', 3, 'A freeze holds 0.15 seconds longer.', (t) => { t.chill.freeze += 0.15; }],
      ['z_far', 'Far Sight', 3, 'Frost Bolt and Ice Lance reach two blocks farther.', (t) => { t.frostbolt.range += 2; t.icelance.range += 2; }],
      ['z_keen', 'Keen Lance', 3, 'Ice Lance hits 4% harder.', (t) => { t.icelance.dmg *= 1.04; }],
      ['z_linger', 'Lingering Cold', 3, 'Chill lasts two seconds longer before it fades.', (t) => { t.chill.fade += 2; }],
      ['z_quicklance', 'Quick Lance', 3, 'Ice Lance recharges 6% faster.', (t) => cd(t, 'icelance', 0.94)],
      ['z_splinter', 'Splinter', 3, 'Ice Lance hits a frozen foe a further 10% harder.', (t) => { t.icelance.frozen += 0.1; }],
      ['z_deepcold', 'Deep Cold', 2, 'A frozen foe cracks for 8% more.', (t) => { t.chill.shatter *= 1.08; }],
      ['z_brittle', 'Brittle', 2, 'Frost Bolt hits 4% harder.', (t) => { t.frostbolt.dmg *= 1.04; }],
    ], ['z_glacier', 'Glacier', 'Two Chill freeze a foe, not three.', (t) => { t.chill.max = 2; }]),
    tree('z_storm', 'Storm', 'The blizzard. Blizzard and Frost Nova, for crowds.', ['frostnova', 'blink'], [
      ['z_snow', 'Heavy Snow', 3, 'Blizzard cuts 5% harder.', (t) => { t.blizzard.dmg *= 1.05; }],
      ['z_widestorm', 'Wide Storm', 3, 'Blizzard covers a third of a block more.', (t) => { t.blizzard.r += 0.33; }],
      ['z_winter', 'Long Winter', 3, 'Blizzard lasts 0.7 seconds longer.', (t) => { t.blizzard.secs += 0.7; }],
      ['z_widenova', 'Wide Nova', 3, 'Frost Nova reaches a third of a block farther.', (t) => { t.frostnova.r += 0.33; }],
      ['z_hail', 'Hail', 3, 'Blizzard cuts 6% harder.', (t) => { t.blizzard.dmg *= 1.06; }],
      ['z_quicknova', 'Quick Nova', 3, 'Frost Nova recharges 6% faster.', (t) => cd(t, 'frostnova', 0.94)],
      ['z_gale', 'Gale', 3, 'Blizzard recharges 5% faster.', (t) => cd(t, 'blizzard', 0.95)],
      ['z_bitterwind', 'Bitter Wind', 3, 'Frost Nova hits 8% harder.', (t) => { t.frostnova.dmg *= 1.08; }],
      ['z_squall', 'Squall', 2, 'Blizzard cuts 8% harder.', (t) => { t.blizzard.dmg *= 1.08; }],
      ['z_deepfreeze', 'Deep Freeze', 2, 'Frost Nova freezes 0.3 seconds longer.', (t) => { t.frostnova.freeze += 0.3; }],
    ], ['z_white', 'Whiteout', 'Blizzard chills everything under it twice each second.', (t) => { t.blizzard.chills = 2; }]),
    tree('z_ward', 'Ward', 'The barrier and the step. Ice Barrier and Blink, for staying alive and making them pay for trying.', ['blink', 'icelance'], [
      ['z_thick', 'Thick Ice', 3, 'Ice Barrier soaks 8% more.', (t) => { t.icebarrier.shield *= 1.08; }],
      ['z_farstep', 'Far Step', 3, 'Blink reaches a block farther.', (t) => { t.blink.range += 1; }],
      ['z_lasting', 'Lasting Ice', 3, 'Ice Barrier lasts a second longer.', (t) => { t.icebarrier.secs += 1; }],
      ['z_quickblink', 'Quick Step', 3, 'Blink recharges 6% faster.', (t) => cd(t, 'blink', 0.94)],
      ['z_counter', 'Cold Counter', 3, 'Ice Lance hits 10% harder.', (t) => { t.icelance.dmg *= 1.1; }],
      ['z_vanish', 'Vanishing', 3, 'After a Blink nothing touches you for 0.15 seconds longer.', (t) => { t.blink.evade += 0.15; }],
      ['z_quickice', 'Quick Ice', 3, 'Ice Barrier recharges 5% faster.', (t) => cd(t, 'icebarrier', 0.95)],
      ['z_coldshoulder', 'Cold Shoulder', 3, 'Frost Nova freezes 0.2 seconds longer.', (t) => { t.frostnova.freeze += 0.2; }],
      ['z_glaze', 'Glaze', 2, 'Ice Barrier soaks 12% more.', (t) => { t.icebarrier.shield *= 1.12; }],
      ['z_frostbite', 'Frostbite', 2, 'Half the blows that land on your Ice Barrier chill whatever struck them.', (t) => { t.icebarrier.bite += 0.5; }],
    ], ['z_shatter', 'Shatter Shell', 'When Ice Barrier breaks, a Frost Nova bursts out of you.', (t) => { t.icebarrier.nova = 1; }]),
  ],
  pathfinder: [
    tree('p_arrows', 'Arrows', 'The volley. Volley, the Mark and Rain of Arrows, from a long way off.', ['rain', 'snare'], [
      ['p_fletch', 'Fletcher', 3, 'Volley\'s arrows hit 5% harder.', (t) => { t.volley.dmg *= 1.05; }],
      ['p_longmark', 'Long Mark', 3, 'A mark lasts a second longer.', (t) => { t.volley.mark += 1; }],
      ['p_eye', 'Sharp Eye', 3, 'Marked foes take a further 2% from you.', (t) => { t.volley.markBonus += 0.02; }],
      ['p_quickdraw', 'Quick Draw', 3, 'Volley recharges 5% faster.', (t) => cd(t, 'volley', 0.95)],
      ['p_heavyrain', 'Heavy Rain', 3, 'Rain of Arrows hits 6% harder.', (t) => { t.rain.dmg *= 1.06; }],
      ['p_widemark', 'Wide Marks', 3, 'Volley marks everything 0.6 blocks farther out.', (t) => { t.volley.markR += 0.6; }],
      ['p_barbs', 'Barbed Heads', 3, 'Volley\'s arrows hit 5% harder.', (t) => { t.volley.dmg *= 1.05; }],
      ['p_downpour', 'Downpour', 3, 'Rain of Arrows lasts half a second longer.', (t) => { t.rain.secs += 0.5; }],
      ['p_eagle', 'Eagle Eye', 2, 'Marked foes take a further 3% from you.', (t) => { t.volley.markBonus += 0.03; }],
      ['p_broad', 'Broadheads', 2, 'Volley\'s arrows hit 4% harder.', (t) => { t.volley.dmg *= 1.04; }],
    ], ['p_fourth', 'Fourth Shaft', 'Volley looses one more arrow, and Rain of Arrows marks everything it falls on.', (t) => { t.volley.arrows += 1; t.rain.mark = 1; }]),
    tree('p_shadow', 'Shadows', 'Behind them. Shadowstep, Quickstep and the heavy blow after.', ['quickstep', 'snare'], [
      ['p_quiet', 'Quiet Step', 3, 'Shadowstep reaches a block and a half farther.', (t) => { t.shadowstep.range += 1.5; }],
      ['p_daze', 'Dazing Step', 3, 'Shadowstep stuns a quarter of a second longer.', (t) => { t.shadowstep.stun += 0.25; }],
      ['p_ambush', 'Ambush', 3, 'The heavy Strike can come 0.6 seconds later.', (t) => { t.shadowstep.window += 0.6; t.quickstep.window += 0.6; }],
      ['p_lightfoot', 'Light Foot', 3, 'Quickstep recharges 6% faster.', (t) => cd(t, 'quickstep', 0.94)],
      ['p_kill', 'Killing Blow', 3, 'The heavy Strike hits a further fifth harder.', (t) => { t.shadowstep.mult += 0.2; }],
      ['p_shade', 'Shade', 3, 'Shadowstep recharges 5% faster.', (t) => cd(t, 'shadowstep', 0.95)],
      ['p_throat', 'Throat Cut', 3, 'The heavy Strike hits a further 15% harder.', (t) => { t.shadowstep.mult += 0.15; }],
      ['p_springheel', 'Springheel', 3, 'Quickstep springs a block farther.', (t) => { t.quickstep.dist += 1; }],
      ['p_coldblood', 'Cold Blood', 2, 'The heavy Strike hits a further fifth harder.', (t) => { t.shadowstep.mult += 0.2; }],
      ['p_slip', 'Slip', 2, 'Shadowstep recharges 6% faster.', (t) => cd(t, 'shadowstep', 0.94)],
    ], ['p_ghost', 'Ghost', 'Shadowstep and Quickstep leave you untouchable for a second.', (t) => { t.quickstep.evade = 1; }]),
    tree('p_field', 'Fieldcraft', 'Staying in the hunt. Field Dressing and the Snare, for a long day out.', ['snare', 'quickstep'], [
      ['p_bandage', 'Clean Bandage', 3, 'Field Dressing heals 2% more of your health.', (t) => { t.dressing.heal += 0.02; }],
      ['p_strongsnare', 'Strong Snare', 3, 'The Snare holds 0.2 seconds longer.', (t) => { t.snare.stun += 0.2; }],
      ['p_quickhands', 'Quick Hands', 3, 'Field Dressing recharges 5% faster.', (t) => cd(t, 'dressing', 0.95)],
      ['p_trapper', 'Trapper', 3, 'The Snare hurts 15% more.', (t) => { t.snare.dmg *= 1.15; }],
      ['p_tracker', 'Tracker', 3, 'A mark lasts a second longer and marked foes take a further 2.5%.', (t) => { t.volley.mark += 1; t.volley.markBonus += 0.025; }],
      ['p_quicksnare', 'Quick Snare', 3, 'The Snare recharges 6% faster.', (t) => cd(t, 'snare', 0.94)],
      ['p_surgeon', 'Field Surgeon', 3, 'Field Dressing heals 2% more of your health.', (t) => { t.dressing.heal += 0.02; }],
      ['p_widejaws', 'Wide Jaws', 3, 'The Snare catches 0.2 blocks wider.', (t) => { t.snare.r += 0.2; }],
      ['p_poultice', 'Poultice', 2, 'Field Dressing heals 3% more of your health.', (t) => { t.dressing.heal += 0.03; }],
      ['p_gintrap', 'Gin Trap', 2, 'The Snare holds 0.3 seconds longer.', (t) => { t.snare.stun += 0.3; }],
    ], ['p_survivor', 'Survivor', 'Field Dressing also heals a further 30% of your health over the next five seconds.', (t) => { t.dressing.hot = 0.3; }]),
  ],
  mender: [
    tree('m_lamp', 'The Lamp', 'Keeping everyone standing. Mend, Restoration and Grace, for the one the rest are glad of.', ['restore', 'lampward'], [
      ['m_steady', 'Steady Hands', 3, 'Mend heals 2% more of each one\'s health.', (t) => { t.mend.heal += 0.02; }],
      ['m_long', 'Long Light', 3, 'Mend and Restoration reach two blocks farther.', (t) => { t.mend.r += 2; t.restore.r += 2; }],
      ['m_slow', 'Slow Mending', 3, 'Restoration heals 2% more over its six seconds.', (t) => { t.restore.heal += 0.02; }],
      ['m_quick', 'Quick Hands', 3, 'Mend recharges 5% faster.', (t) => cd(t, 'mend', 0.95)],
      ['m_glow', 'Warm Glow', 3, 'Lantern Light\'s glow heals a further half a percent.', (t) => { t.lanternlight.heal += 0.005; }],
      ['m_reach', 'Wide Grace', 3, 'A full-Grace Mend reaches two blocks farther.', (t) => { t.grace.r += 2; }],
      ['m_vigil', 'Vigil', 3, 'Restoration recharges 5% faster.', (t) => cd(t, 'restore', 0.95)],
      ['m_full', 'Full Measure', 3, 'A full-Grace Mend heals a further tenth.', (t) => { t.grace.mult += 0.1; }],
      ['m_deep', 'Deep Mending', 2, 'Mend heals a further 3% of each one\'s health.', (t) => { t.mend.heal += 0.03; }],
      ['m_lasting', 'Lasting Mending', 2, 'Restoration heals a further 3%.', (t) => { t.restore.heal += 0.03; }],
    ], ['m_abiding', 'Abiding Grace', 'Grace is full at four, not five, Mend heals a further 4% of each one\'s health, and Lantern Light strikes a fifth harder.', (t) => { t.grace.max = 4; t.mend.heal += 0.04; t.lanternlight.dmg *= 1.2; }]),
    tree('m_shelter', 'The Shelter', 'Holding ground. Lamp Ward and Sanctuary, for a mender who keeps the blows off rather than mending them after.', ['lampward', 'rebuke'], [
      ['m_thick', 'Thick Ward', 3, 'Lamp Ward soaks 6% more.', (t) => { t.lampward.shield *= 1.06; }],
      ['m_wide', 'Wide Hallow', 3, 'Sanctuary reaches half a block farther.', (t) => { t.sanctuary.r += 0.5; }],
      ['m_longward', 'Long Ward', 3, 'Lamp Ward lasts a second longer.', (t) => { t.lampward.secs += 1; }],
      ['m_hallowed', 'Hallowed', 3, 'On Sanctuary you take a further 2% less.', (t) => { t.sanctuary.taken -= 0.02; }],
      ['m_quickward', 'Quick Ward', 3, 'Lamp Ward recharges 5% faster.', (t) => cd(t, 'lampward', 0.95)],
      ['m_holdground', 'Hold the Ground', 3, 'Sanctuary lasts half a second longer.', (t) => { t.sanctuary.secs += 0.5; }],
      ['m_wardreach', 'Far Ward', 3, 'Lamp Ward reaches two blocks farther.', (t) => { t.lampward.r += 2; }],
      ['m_hearth', 'Hearth Light', 3, 'Sanctuary heals a further half a percent a second.', (t) => { t.sanctuary.heal += 0.005; }],
      ['m_bright', 'Bright Ward', 2, 'Lamp Ward soaks 10% more.', (t) => { t.lampward.shield *= 1.1; }],
      ['m_close', 'Close Ranks', 2, 'On Sanctuary you take a further 3% less.', (t) => { t.sanctuary.taken -= 0.03; }],
    ], ['m_unbroken', 'Unbroken Light', 'Lamp Ward soaks a third more, and Sanctuary lasts three seconds longer and burns half as hot again.', (t) => { t.lampward.shield *= 1.33; t.sanctuary.secs += 3; t.sanctuary.burn *= 1.5; }]),
    tree('m_rebuke', 'The Rebuke', 'Light as a weapon. Lantern Light and Rebuke, for a mender walking the roads alone.', ['rebuke', 'restore'], [
      ['m_sharp', 'Sharp Light', 3, 'Lantern Light hits 5% harder.', (t) => { t.lanternlight.dmg *= 1.05; }],
      ['m_stern', 'Stern Word', 3, 'Rebuke hits 6% harder.', (t) => { t.rebuke.dmg *= 1.06; }],
      ['m_dazzle', 'Dazzle', 3, 'Rebuke dazes 0.15 seconds longer.', (t) => { t.rebuke.stun += 0.15; }],
      ['m_far', 'Far Light', 3, 'Lantern Light reaches two blocks farther.', (t) => { t.lanternlight.range += 2; }],
      ['m_quickword', 'Quick Word', 3, 'Rebuke recharges 6% faster.', (t) => cd(t, 'rebuke', 0.94)],
      ['m_burning', 'Burning Ground', 3, 'Sanctuary burns 10% hotter.', (t) => { t.sanctuary.burn *= 1.1; }],
      ['m_widerebuke', 'Wide Rebuke', 3, 'Rebuke reaches half a block farther.', (t) => { t.rebuke.r += 0.5; }],
      ['m_brighter', 'Brighter Light', 3, 'Lantern Light hits 5% harder.', (t) => { t.lanternlight.dmg *= 1.05; }],
      ['m_scald', 'Scald', 2, 'Rebuke hits 10% harder.', (t) => { t.rebuke.dmg *= 1.1; }],
      ['m_mercy', 'Hard Mercy', 2, 'Each foe Rebuke strikes heals you and yours 1% of your health.', (t) => { t.rebuke.heal += 0.01; }],
    ], ['m_searing', 'Searing Light', 'Lantern Light springs on to strike a second foe, and Rebuke recharges a fifth faster.', (t) => { t.lanternlight.bounce = 1; cd(t, 'rebuke', 0.8); }]),
  ],
  gravecaller: [
    tree('g_blood', 'The Blood', 'Paying in blood and living on it. Siphon, Bone Ward and Lifeblood, for a gravecaller who never stops to rest.', ['boneward', 'graverot'], [
      ['g_deep', 'Deep Draw', 3, 'Siphon heals 1% more of your health.', (t) => { t.siphon.heal += 0.01; }],
      ['g_thirst', 'Thirst', 3, 'Siphon strikes 5% harder.', (t) => { t.siphon.dmg *= 1.05; }],
      ['g_hoard', 'Hoard', 3, 'Lifeblood holds 3% more of your health.', (t) => { t.lifeblood.max += 0.03; }],
      ['g_quickdraw', 'Quick Draw', 3, 'Siphon recharges 5% faster.', (t) => cd(t, 'siphon', 0.95)],
      ['g_marrow', 'Marrow', 3, 'Bone Ward soaks 6% more.', (t) => { t.boneward.shield *= 1.06; }],
      ['g_longbone', 'Old Bone', 3, 'Bone Ward lasts a second longer.', (t) => { t.boneward.secs += 1; }],
      ['g_lastbreath', 'Last Breath', 3, 'A foe dying withered gives up 1% more Lifeblood.', (t) => { t.lifeblood.kill += 0.01; }],
      ['g_reach', 'Long Reach', 3, 'Siphon reaches two blocks farther.', (t) => { t.siphon.range += 2; }],
      ['g_bloodward', 'Blood Ward', 2, 'Bone Ward recharges 8% faster.', (t) => cd(t, 'boneward', 0.92)],
      ['g_gorge', 'Gorge', 2, 'Siphon heals a further 2% of your health.', (t) => { t.siphon.heal += 0.02; }],
    ], ['g_heart', 'Black Heart', 'Lifeblood holds a tenth more of your health, and Siphon heals a further 3%.', (t) => { t.lifeblood.max += 0.1; t.siphon.heal += 0.03; }]),
    tree('g_rot', 'The Rot', 'The slow death. Wither and Grave Rot, for a gravecaller who curses a whole pack and lets it fall.', ['graverot', 'gravegrip'], [
      ['g_canker', 'Canker', 3, 'Wither eats 5% faster.', (t) => { t.wither.dot *= 1.05; }],
      ['g_blight', 'Blight', 3, 'Wither\'s bolt strikes 5% harder.', (t) => { t.wither.dmg *= 1.05; }],
      ['g_linger', 'Linger', 3, 'Wither lasts half a second longer.', (t) => { t.wither.secs += 0.5; }],
      ['g_spread', 'Spreading Rot', 3, 'Grave Rot reaches half a block farther.', (t) => { t.graverot.r += 0.5; }],
      ['g_mould', 'Mould', 3, 'Grave Rot strikes 6% harder.', (t) => { t.graverot.dmg *= 1.06; }],
      ['g_quickrot', 'Quick Rot', 3, 'Grave Rot recharges 5% faster.', (t) => cd(t, 'graverot', 0.95)],
      ['g_farcold', 'Far Cold', 3, 'Wither reaches two blocks farther.', (t) => { t.wither.range += 2; }],
      ['g_sour', 'Sour Earth', 3, 'Wither eats 5% faster.', (t) => { t.wither.dot *= 1.05; }],
      ['g_fester', 'Fester', 2, 'Wither\'s bolt strikes 8% harder.', (t) => { t.wither.dmg *= 1.08; }],
      ['g_feed', 'Feed', 2, 'Each foe Grave Rot strikes heals you 1.5% of your health.', (t) => { t.graverot.heal += 0.015; }],
    ], ['g_deeprot', 'Deep Rot', 'Wither builds four deep, not three, and eats a sixth faster; Grave Rot leaves it three deep.', (t) => { t.wither.max = 4; t.wither.dot *= 1.16; t.graverot.stacks = 3; }]),
    tree('g_fallen', 'The Fallen', 'The dead at your back. Raise the Fallen and Grave Grip, for a gravecaller who would rather not stand alone.', ['gravegrip', 'boneward'], [
      ['g_strong', 'Strong Bones', 3, 'The raised hit 6% harder.', (t) => { t.raise.dmg *= 1.06; }],
      ['g_unquiet', 'Unquiet', 3, 'The raised stay up two seconds longer.', (t) => { t.raise.secs += 2; }],
      ['g_irongrip', 'Iron Grip', 3, 'Grave Grip holds 0.15 seconds longer.', (t) => { t.gravegrip.stun += 0.15; }],
      ['g_widegrip', 'Wide Grip', 3, 'Grave Grip reaches half a block farther.', (t) => { t.gravegrip.r += 0.5; }],
      ['g_quickgrip', 'Quick Grip', 3, 'Grave Grip recharges 6% faster.', (t) => cd(t, 'gravegrip', 0.94)],
      ['g_restless', 'Restless', 3, 'The raised swing 5% faster.', (t) => { t.raise.every *= 0.95; }],
      ['g_crush', 'Crush', 3, 'Grave Grip strikes 8% harder.', (t) => { t.gravegrip.dmg *= 1.08; }],
      ['g_quickcall', 'Quick Call', 3, 'Raise the Fallen recharges 5% faster.', (t) => cd(t, 'raise', 0.95)],
      ['g_coldhands', 'Cold Hands', 2, 'The raised hit 10% harder.', (t) => { t.raise.dmg *= 1.1; }],
      ['g_opengrave', 'Open Grave', 2, 'Grave Grip strikes 12% harder.', (t) => { t.gravegrip.dmg *= 1.12; }],
    ], ['g_host', 'The Host', 'Raise the Fallen raises three, not two.', (t) => { t.raise.n = 3; }]),
  ],
  prowler: [
    tree('k_shadow', 'The Shadow', 'Never where they look. Slip Away, Vanish and the blow from hiding, for a prowler who picks the moment.', ['vanish', 'tumble'], [
      ['k_dark', 'Dark Corners', 3, 'Out of sight a third of a second longer.', (t) => { t.slipaway.hide += 0.33; t.vanish.hide += 0.33; }],
      ['k_unseen', 'Unseen Hand', 3, 'A blow from hiding lands 8% harder.', (t) => { t.slipaway.mult += 0.08; t.ambush.mult += 0.08; }],
      ['k_quiet', 'Quiet Feet', 3, 'Vanish recharges 5% faster.', (t) => cd(t, 'vanish', 0.95)],
      ['k_mend', 'Lick the Wounds', 3, 'Slip Away heals 2% more of your health.', (t) => { t.slipaway.heal += 0.02; }],
      ['k_slip', 'Slippery', 3, 'Slip Away recharges 5% faster.', (t) => cd(t, 'slipaway', 0.95)],
      ['k_roll', 'Rolling Start', 3, 'Tumble carries you half a block farther.', (t) => { t.tumble.dist += 0.5; }],
      ['k_out', 'Way Out', 3, 'Tumble recharges 5% faster.', (t) => cd(t, 'tumble', 0.95)],
      ['k_cold', 'Cold Open', 3, 'A blow from hiding lands a further 8% harder.', (t) => { t.slipaway.mult += 0.08; t.ambush.mult += 0.08; }],
      ['k_long', 'Long Shadow', 2, 'Out of sight half a second longer.', (t) => { t.slipaway.hide += 0.5; t.vanish.hide += 0.5; }],
      ['k_twice', 'Twice Hidden', 2, 'Slip Away heals a further 3% of your health.', (t) => { t.slipaway.heal += 0.03; }],
    ], ['k_ghost', 'Ghost', 'Out of sight a second longer, a blow from hiding a fifth harder still, and one more blow in twenty misses you.', (t) => { t.slipaway.hide += 1; t.vanish.hide += 1; t.slipaway.mult += 0.2; t.ambush.mult += 0.2; t.openings.dodge += 0.05; }]),
    tree('k_knife', 'The Knife', 'Build them up and cash them in. Openings and Twist the Knife, for a prowler who ends things in one cut.', ['poisonblade', 'pocketsand'], [
      ['k_edge', 'Keen Edge', 3, 'Twist the Knife cuts 5% harder.', (t) => { t.twist.dmg *= 1.05; }],
      ['k_deep', 'Deep Twist', 3, 'Each Opening Twist the Knife spends adds 3% more.', (t) => { t.twist.per *= 1.03; }],
      ['k_quick', 'Quick Twist', 3, 'Twist the Knife recharges 4% faster.', (t) => cd(t, 'twist', 0.96)],
      ['k_reach', 'Long Knife', 3, 'Twist the Knife reaches a third of a block farther.', (t) => { t.twist.range += 0.33; }],
      ['k_cuts', 'Many Cuts', 3, 'A Thousand Cuts cuts 4% harder.', (t) => { t.thousand.dmg *= 1.04; }],
      ['k_venom', 'Venom', 3, 'Poisoned Blade\'s poison eats 5% faster.', (t) => { t.poisonblade.dot *= 1.05; }],
      ['k_coat', 'Coated', 3, 'Poisoned Blade lasts half a blow longer (one more blow every other rank).', (t) => { t.poisonblade.blows += 0.5; }],
      ['k_bare', 'Bare Steel', 3, 'Twist the Knife cuts a further 4% harder.', (t) => { t.twist.dmg *= 1.04; }],
      ['k_open', 'Wide Open', 2, 'Each Opening adds a further 5%.', (t) => { t.twist.per *= 1.05; }],
      ['k_last', 'Last Cut', 2, 'A Thousand Cuts cuts a further 6% harder.', (t) => { t.thousand.dmg *= 1.06; }],
    ], ['k_heart', 'Through the Heart', 'Openings hold one more, and each Opening spent adds a tenth more.', (t) => { t.openings.max += 1; t.twist.per *= 1.1; }]),
    tree('k_dirty', 'Dirty Fighting', 'Sand, iron and whatever else is to hand. Pocket Sand and Caltrops, for a prowler who never fights fair.', ['caltrops', 'pocketsand'], [
      ['k_grit', 'Grit', 3, 'Pocket Sand blinds them half a second longer.', (t) => { t.pocketsand.secs += 0.5; }],
      ['k_fist', 'Big Fist', 3, 'Pocket Sand reaches a third of a block farther.', (t) => { t.pocketsand.r += 0.33; }],
      ['k_dust', 'More Dust', 3, 'Pocket Sand recharges 5% faster.', (t) => cd(t, 'pocketsand', 0.95)],
      ['k_iron', 'Sharp Iron', 3, 'Caltrops cut 6% deeper.', (t) => { t.caltrops.dmg *= 1.06; }],
      ['k_spread', 'Wide Scatter', 3, 'Caltrops spread a third of a block wider.', (t) => { t.caltrops.r += 0.33; }],
      ['k_lame', 'Lamed', 3, 'Caltrops slow for half a second longer.', (t) => { t.caltrops.slow += 0.5; }],
      ['k_rust', 'Rusty', 3, 'Caltrops stay a second longer.', (t) => { t.caltrops.secs += 1; }],
      ['k_stun', 'Low Blow', 3, 'Pocket Sand stuns a tenth of a second longer.', (t) => { t.pocketsand.stun += 0.1; }],
      ['k_bag', 'Full Pockets', 2, 'Caltrops recharge 8% faster.', (t) => cd(t, 'caltrops', 0.92)],
      ['k_kick', 'Kick While Down', 2, 'Twist the Knife cuts 7% harder.', (t) => { t.twist.dmg *= 1.07; }],
    ], ['k_rotten', 'Rotten Luck', 'Pocket Sand stuns half a second longer, Caltrops cut a fifth deeper, and Twist the Knife a tenth.', (t) => { t.pocketsand.stun += 0.5; t.caltrops.dmg *= 1.2; t.twist.dmg *= 1.1; }]),
  ],
};

/** Talent points at a combat level: three for every five levels (one at level 3, 59 at 100). */
export const pointsAt = (level: number) => Math.max(0, Math.floor((level - 1) * 0.6));

/** Every talent, by id. */
export const TALENTS: Record<string, { def: TalentDef; tree: TreeDef; calling: CallingId }> = {};
for (const [calling, trees] of Object.entries(TREES) as [CallingId, TreeDef[]][]) for (const t of trees) for (const def of t.talents) TALENTS[def.id] = { def, tree: t, calling };

/** A tree learned in full: every talent at every rank (for the balance check). */
export const fullTree = (t: TreeDef): string[] => t.talents.flatMap((d) => Array<string>(d.ranks).fill(d.id));

/** The calling's numbers with these talents applied (to a copy). A talent's id appears once per rank. */
export function tuned(learned: string[]): Tune {
  const t = JSON.parse(JSON.stringify(TUNE)) as Tune;
  for (const id of learned) TALENTS[id]?.def.mod(t);
  return t;
}

/** Ranks held in a talent. */
export const rankOf = (id: string, learned: string[]) => learned.reduce((n, x) => n + (x === id ? 1 : 0), 0);
/** Points spent (a point a rank), in all or in one tree. */
export const spent = (learned: string[], tree?: string) => learned.filter((id) => TALENTS[id] && (!tree || TALENTS[id].tree.id === tree)).length;

/**
 * Whether a rank of a talent can be learned now: the calling's own, ranks left, a point to spend, its
 * tier open (five points in the tree for each tier above), and for a capstone, no other capstone held.
 */
export function canLearn(id: string, learned: string[], calling: CallingId, level: number, extra = 0): string | null {
  const t = TALENTS[id];
  if (!t || t.calling !== calling) return 'That isn\'t one of your calling\'s talents.';
  if (rankOf(id, learned) >= t.def.ranks) return 'You have every rank of it already.';
  // (extra: the points the rest of the pool leaves over: data/skillpoints.ts, game/Game.ts skillPool)
  if (pointsAt(level) + extra - spent(learned) < 1) return 'No skill points left to spend. They come with levels and with Insight.';
  const need = t.def.tier * TIER_GATE, have = spent(learned, t.tree.id);
  if (have < need) return `Spend ${need} points in ${t.tree.name} to open this tier (${have} so far).`;
  if (t.def.capstone && learned.some((x) => TALENTS[x]?.def.capstone)) return 'You can hold only one capstone. Unlearn the other first.';
  return null;
}
