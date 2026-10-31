import type { Fx } from './skillLines';

// The two morphs of every skill of the realm's lines (data/skillLines.ts), as the callings' skills
// have (data/skillpoints.ts): at rank IV, for a point, it turns one way or the other. A morph gives the
// skill new effects (fx, in place of its own) and may change how long it takes to come back (cd, a
// multiplier). The two are different, not better and worse.

export interface LineMorph { name: string; desc: string; fx: Fx[]; cd?: number }

export const LINE_MORPHS: Record<string, [LineMorph, LineMorph]> = {
  // ---------------------------------------------------------------- The Wayfarers' Road
  ln_secondwind: [
    { name: 'Third Wind', desc: 'A quarter of your health over six seconds instead of a fifth.', fx: [{ k: 'heal', over: [0.25, 6], cleanse: 1 }] },
    { name: 'Catch Your Breath', desc: 'A tenth back at once and a tenth more over four seconds, and two harms shaken off.', fx: [{ k: 'heal', now: 0.1, over: [0.1, 4], cleanse: 2 }] },
  ],
  ln_longstride: [
    { name: 'Forced March', desc: 'Ten blocks instead of seven; no lighter blows after.', fx: [{ k: 'dash', dist: 10 }] },
    { name: 'Dodging Stride', desc: 'Seven blocks, and nothing lands on you for half a second after.', fx: [{ k: 'dash', dist: 7 }, { k: 'buff', secs: 0.5, evade: true }] },
  ],
  ln_roadsong: [
    { name: 'Marching Song', desc: 'Blows a tenth harder for sixteen seconds instead.', fx: [{ k: 'buff', secs: 16, dealt: 1.1 }] },
    { name: 'Lament for the Toll', desc: 'Blows a sixth harder for six seconds.', fx: [{ k: 'buff', secs: 6, dealt: 1.17 }] },
  ],
  ln_remedy: [
    { name: 'Carter\'s Flask', desc: 'A fifth of your health back, and one harm off instead of two.', fx: [{ k: 'heal', now: 0.2, cleanse: 1 }] },
    { name: 'Clean Bandage', desc: 'Every harm on you off, and a little health back.', fx: [{ k: 'heal', now: 0.05, cleanse: 6 }] },
  ],
  ln_waymark: [
    { name: 'Far Waymark', desc: 'Up to eighteen blocks; it comes back a little slower.', fx: [{ k: 'buff', secs: 0.5, evade: true }, { k: 'blink', range: 18 }], cd: 1.15 },
    { name: 'Waymark\'s Wake', desc: 'Where you leave from is struck, staggering whatever stood by you.', fx: [{ k: 'burst', r: 3, dmg: 0.6, stun: 0.6 }, { k: 'buff', secs: 0.5, evade: true }, { k: 'blink', range: 12 }] },
  ],
  // ---------------------------------------------------------------- The Muster
  ln_ridercharge: [
    { name: 'Run Them Down', desc: 'The landing strikes everything within two blocks of the target.', fx: [{ k: 'leap', range: 12, dmg: 1.1, stun: 0.6 }, { k: 'burst', r: 2.5, dmg: 0.5 }] },
    { name: 'Rider\'s Reach', desc: 'From up to eighteen blocks, and it leaves the target exposed.', fx: [{ k: 'leap', range: 18, dmg: 1.2, expose: 3 }] },
  ],
  ln_hock: [
    { name: 'Deep Cut', desc: 'The wound bleeds half again as much; no slow.', fx: [{ k: 'strike', range: 3.5, dmg: 0.8, dot: [1.8, 6] }] },
    { name: 'Lame', desc: 'Slowed for eight seconds and held a moment.', fx: [{ k: 'strike', range: 3.5, dmg: 0.8, slow: 8, stun: 0.6, dot: [0.8, 6] }] },
  ],
  ln_horn: [
    { name: 'Call to Arms', desc: 'You and everyone with you are warded as it sounds.', fx: [{ k: 'buff', secs: 8, dealt: 1.12 }, { k: 'ward', amt: 0.1, secs: 8, all: true }] },
    { name: 'Charge Horn', desc: 'A fifth harder for six seconds; no lighter blows.', fx: [{ k: 'buff', secs: 6, dealt: 1.2 }] },
  ],
  ln_closeranks: [
    { name: 'Shield Wall', desc: 'A ward of a fifth on you alone, and you take a sixth less for six seconds.', fx: [{ k: 'ward', amt: 0.2, secs: 8 }, { k: 'buff', secs: 6, taken: 0.84 }] },
    { name: 'Rank and File', desc: 'The ward lasts fourteen seconds.', fx: [{ k: 'ward', amt: 0.16, secs: 14, all: true }] },
  ],
  ln_trample: [
    { name: 'Stampede', desc: 'A wider patch, five blocks across, a little lighter.', fx: [{ k: 'ground', range: 10, r: 5, dmg: 1.2, delay: 0.4, stun: 1 }] },
    { name: 'Iron-shod', desc: 'Harder, and the ground is broken: it slows what crosses it for five seconds.', fx: [{ k: 'ground', range: 8, r: 3.5, dmg: 1.8, delay: 0.4 }, { k: 'zone', range: 8, r: 3.5, secs: 5, dmg: 0.15, slow: 1.5, color: '#8a6a4a' }] },
  ],
  // ---------------------------------------------------------------- Hedge-craft
  ln_poultice: [
    { name: 'Comfrey Poultice', desc: 'A third of your health over twelve seconds.', fx: [{ k: 'heal', over: [0.33, 12] }] },
    { name: 'Yarrow Poultice', desc: 'A tenth at once and the rest over four seconds; a harm off too.', fx: [{ k: 'heal', now: 0.1, over: [0.15, 4], cleanse: 1 }] },
  ],
  ln_thorns: [
    { name: 'Blackthorn Hex', desc: 'It bleeds harder, for five seconds instead of eight.', fx: [{ k: 'strike', range: 14, dmg: 0.4, dot: [2.4, 5] }] },
    { name: 'Briar Hex', desc: 'Slowed for the eight seconds it bleeds.', fx: [{ k: 'strike', range: 14, dmg: 0.3, slow: 8, dot: [1.9, 8] }] },
  ],
  ln_rowan: [
    { name: 'Rowan Wreath', desc: 'The ward goes on everyone with you, a little thinner.', fx: [{ k: 'ward', amt: 0.15, secs: 10, all: true }] },
    { name: 'Witch-bottle', desc: 'Thicker, a quarter of your health, and a harm off as it goes on.', fx: [{ k: 'ward', amt: 0.25, secs: 10 }, { k: 'heal', cleanse: 1 }] },
  ],
  ln_bitter: [
    { name: 'Wormwood Cup', desc: 'Your blows a seventh harder for ten seconds; one harm off.', fx: [{ k: 'heal', cleanse: 1 }, { k: 'buff', secs: 10, dealt: 1.14 }] },
    { name: 'Feverfew Cup', desc: 'A sixth of your health back and every harm off; no stronger blows.', fx: [{ k: 'heal', now: 0.16, cleanse: 6 }] },
  ],
  ln_fairyring: [
    { name: 'Ring of Stones', desc: 'The first foot in it is held there two seconds; no sting after.', fx: [{ k: 'zone', range: 12, r: 3, secs: 12, dmg: 0.7, snare: 2, color: '#b07ae0' }] },
    { name: 'Pixie-led', desc: 'Wider and longer, eight seconds, five blocks across.', fx: [{ k: 'zone', range: 12, r: 4.5, secs: 8, dmg: 0.32, slow: 1.5, color: '#b07ae0' }] },
  ],
  // ---------------------------------------------------------------- The Wheel
  ln_brassbomb: [
    { name: 'Cluster Bomb', desc: 'Three small blasts across a wider patch.', fx: [{ k: 'ground', range: 14, r: 4.5, dmg: 0.7, delay: 0.6 }, { k: 'ground', range: 14, r: 4.5, dmg: 0.7, delay: 0.9 }, { k: 'ground', range: 14, r: 4.5, dmg: 0.7, delay: 1.2 }] },
    { name: 'Concussion Bomb', desc: 'Lighter, but it knocks everything there off its feet.', fx: [{ k: 'ground', range: 14, r: 3, dmg: 1.2, delay: 0.8, stun: 1.4 }] },
  ],
  ln_steamvent: [
    { name: 'Pressure Valve', desc: 'Wider, five blocks round you, and it slows.', fx: [{ k: 'burst', r: 5, dmg: 0.7, slow: 4 }] },
    { name: 'Scald', desc: 'Harder, scalding everything close; a shorter stagger.', fx: [{ k: 'burst', r: 3.5, dmg: 1.1, stun: 0.5 }] },
  ],
  ln_springheel: [
    { name: 'Coiled Spring', desc: 'Twelve blocks; it comes back a little slower.', fx: [{ k: 'buff', secs: 0.45, evade: true }, { k: 'dash', dist: 12 }], cd: 1.2 },
    { name: 'Spring Kick', desc: 'Off the springs feet-first: what you leave behind is staggered.', fx: [{ k: 'burst', r: 2.5, dmg: 0.6, stun: 0.8 }, { k: 'buff', secs: 0.45, evade: true }, { k: 'dash', dist: 8 }] },
  ],
  ln_governor: [
    { name: 'Flywheel Ward', desc: 'Thicker, a quarter of your health, for five seconds.', fx: [{ k: 'ward', amt: 0.28, secs: 5 }] },
    { name: 'Running Governor', desc: 'A fifth of your health for fourteen seconds.', fx: [{ k: 'ward', amt: 0.2, secs: 14 }] },
  ],
  ln_escapement: [
    { name: 'Overwound', desc: 'A quarter harder for five seconds, and you take a fifth more.', fx: [{ k: 'buff', secs: 5, dealt: 1.25, taken: 1.2 }] },
    { name: 'Regulated', desc: 'An eighth harder for ten seconds, with no cost in blows taken.', fx: [{ k: 'buff', secs: 10, dealt: 1.13 }] },
  ],
  // ---------------------------------------------------------------- The Gatekeepers' Rolls
  ln_saltline: [
    { name: 'Salt Circle', desc: 'A circle round you instead, held fourteen seconds.', fx: [{ k: 'zone', range: 0, r: 3.5, secs: 14, dmg: 0.6, snare: 1.6, color: '#f4f0e8' }] },
    { name: 'Brine', desc: 'No snare: it burns what stands in it for eight seconds.', fx: [{ k: 'zone', range: 10, r: 3, secs: 8, dmg: 0.5, slow: 1.2, color: '#f4f0e8' }] },
  ],
  ln_rollcall: [
    { name: 'The Long Roll', desc: 'The ward holds sixteen seconds.', fx: [{ k: 'ward', amt: 0.14, secs: 16, all: true }] },
    { name: 'Answered', desc: 'A tenth of your health back with it, and a harm off.', fx: [{ k: 'ward', amt: 0.12, secs: 10, all: true }, { k: 'heal', now: 0.1, cleanse: 1 }] },
  ],
  ln_shutgate: [
    { name: 'Bar the Postern', desc: 'Holds them two seconds; lighter.', fx: [{ k: 'burst', r: 4.5, dmg: 0.8, stun: 2 }] },
    { name: 'Gate Hammer', desc: 'Harder; it holds them a shorter moment.', fx: [{ k: 'burst', r: 4.5, dmg: 1.5, stun: 0.8 }] },
  ],
  ln_gatelantern: [
    { name: 'Beacon', desc: 'Burns longer, ten seconds, wider.', fx: [{ k: 'zone', range: 12, r: 4, secs: 10, dmg: 0.45, color: '#ffc070' }] },
    { name: 'Hooded Lantern', desc: 'Set down by you, it burns hotter for five seconds.', fx: [{ k: 'zone', range: 0, r: 3.5, secs: 5, dmg: 0.85, color: '#ffc070' }] },
  ],
  ln_lastwatch: [
    { name: 'Forty Years', desc: 'You take two fifths less, for eight seconds.', fx: [{ k: 'heal', now: 0.06 }, { k: 'buff', secs: 8, taken: 0.6 }] },
    { name: 'Relieved', desc: 'A quarter of your health back; a fifth less taken for four seconds.', fx: [{ k: 'heal', now: 0.25 }, { k: 'buff', secs: 4, taken: 0.8 }] },
  ],
  // ---------------------------------------------------------------- The Brethren's Ways
  ln_boardinghook: [
    { name: 'Grappling Iron', desc: 'From twenty blocks, and the landing staggers.', fx: [{ k: 'leap', range: 20, dmg: 0.9, stun: 0.8 }] },
    { name: 'Over the Rail', desc: 'The landing strikes everything close, and the target is exposed.', fx: [{ k: 'leap', range: 14, dmg: 0.8, expose: 3 }, { k: 'burst', r: 2.5, dmg: 0.5 }] },
  ],
  ln_cutlass: [
    { name: 'Six Cuts', desc: 'Six lighter cuts.', fx: [{ k: 'strike', range: 3.5, dmg: 0.31, hits: 6 }] },
    { name: 'Hilt and Edge', desc: 'Three cuts and the hilt: the last staggers.', fx: [{ k: 'strike', range: 3.5, dmg: 0.5, hits: 3, stun: 0.8 }] },
  ],
  ln_smokepot: [
    { name: 'Stinkpot', desc: 'What breathes it chokes and slows for six seconds; you stay in sight.', fx: [{ k: 'burst', r: 4, dmg: 0.5, slow: 6 }] },
    { name: 'Fog of the Keys', desc: 'Out of sight five seconds; nothing staggers.', fx: [{ k: 'buff', secs: 5, hide: true }] },
  ],
  ln_grog: [
    { name: 'Double Ration', desc: 'A quarter of your health back; no stronger blows.', fx: [{ k: 'heal', now: 0.25 }] },
    { name: 'Dutch Courage', desc: 'A sixth harder for ten seconds, and you take a twentieth more.', fx: [{ k: 'heal', now: 0.06 }, { k: 'buff', secs: 10, dealt: 1.17, taken: 1.05 }] },
  ],
  ln_broadside: [
    { name: 'Chain Shot', desc: 'A wider patch, slowing what it hits.', fx: [{ k: 'ground', range: 16, r: 5.5, dmg: 1.6, delay: 1 }, { k: 'zone', range: 16, r: 5.5, secs: 4, dmg: 0.1, slow: 1.5, color: '#ff8a40' }] },
    { name: 'Double-shotted', desc: 'Two salvos, one after the other.', fx: [{ k: 'ground', range: 16, r: 4, dmg: 1.2, delay: 1 }, { k: 'ground', range: 16, r: 4, dmg: 1.2, delay: 1.6 }] },
  ],
  // ---------------------------------------------------------------- The Levels' Ways
  ln_eelspear: [
    { name: 'Barbed Spear', desc: 'It bleeds for six seconds instead of slowing.', fx: [{ k: 'strike', range: 5, dmg: 0.9, dot: [1.1, 6] }] },
    { name: 'Long Spear', desc: 'From seven blocks, and it holds the foe a moment.', fx: [{ k: 'strike', range: 7, dmg: 0.9, stun: 0.6 }] },
  ],
  ln_mudpatch: [
    { name: 'Bog Hole', desc: 'The first foot in it is held there two seconds.', fx: [{ k: 'zone', range: 12, r: 3, secs: 12, dmg: 0.5, snare: 2, color: '#6a5a3a' }] },
    { name: 'Wide Mire', desc: 'Wider and longer: ten seconds, five blocks across.', fx: [{ k: 'zone', range: 12, r: 5, secs: 10, dmg: 0.15, slow: 1.5, color: '#6a5a3a' }] },
  ],
  ln_poleleap: [
    { name: 'Long Pole', desc: 'Eleven blocks; it comes back a little slower.', fx: [{ k: 'dash', dist: 11 }], cd: 1.15 },
    { name: 'Vault and Strike', desc: 'You come down on what was in front of you: everything you leave is staggered.', fx: [{ k: 'burst', r: 2.5, dmg: 0.6, stun: 0.6 }, { k: 'dash', dist: 8 }] },
  ],
  ln_willwisp: [
    { name: 'Corpse Candle', desc: 'Out of sight six seconds; no mending.', fx: [{ k: 'buff', secs: 6, hide: true }] },
    { name: 'Hob-lantern', desc: 'A sixth of your health over four seconds, and out of sight two.', fx: [{ k: 'buff', secs: 2, hide: true }, { k: 'heal', over: [0.16, 4] }] },
  ],
  ln_floodgate: [
    { name: 'Spring Tide', desc: 'Wider, six blocks across, a little lighter.', fx: [{ k: 'ground', range: 14, r: 6, dmg: 1.0, delay: 0.9, stun: 1.1 }] },
    { name: 'Standing Water', desc: 'The water stays: whatever\'s in it is slowed five seconds after.', fx: [{ k: 'ground', range: 14, r: 4.5, dmg: 1.2, delay: 0.9 }, { k: 'zone', range: 14, r: 4.5, secs: 5, dmg: 0.1, slow: 1.5, color: '#6a9ac8' }] },
  ],
  // ---------------------------------------------------------------- The Reekers' Fires
  ln_reeksmoke: [
    { name: 'Thick Reek', desc: 'It slows as it stings, for eight seconds.', fx: [{ k: 'zone', range: 12, r: 3.5, secs: 8, dmg: 0.4, slow: 1.5, color: '#8a9a6a' }] },
    { name: 'Reek Pot', desc: 'It goes up in a blast first, then smoulders.', fx: [{ k: 'ground', range: 12, r: 3.5, dmg: 0.9, delay: 0.5 }, { k: 'zone', range: 12, r: 3.5, secs: 4, dmg: 0.4, color: '#8a9a6a' }] },
  ],
  ln_firebrand: [
    { name: 'Hot Iron', desc: 'Harder, and it holds them a moment; burns less.', fx: [{ k: 'strike', range: 3.5, dmg: 1.3, stun: 0.5, dot: [0.6, 4] }] },
    { name: 'Wildfire Brand', desc: 'It burns longer and hotter, ten seconds.', fx: [{ k: 'strike', range: 3.5, dmg: 0.7, dot: [2.0, 10] }] },
  ],
  ln_stonering: [
    { name: 'Five Rings', desc: 'The ward goes on everyone with you.', fx: [{ k: 'ward', amt: 0.15, secs: 10, all: true }, { k: 'heal', cleanse: 1 }] },
    { name: 'Hesketh\'s Reek', desc: 'Every harm burned off you, and a thinner ward.', fx: [{ k: 'ward', amt: 0.12, secs: 10 }, { k: 'heal', cleanse: 6 }] },
  ],
  ln_cleansingfire: [
    { name: 'Scorched Earth', desc: 'The ground burns longer, eight seconds.', fx: [{ k: 'burst', r: 4, dmg: 0.8 }, { k: 'zone', range: 0, r: 4, secs: 8, dmg: 0.35, color: '#ff7a2a' }] },
    { name: 'Flashpoint', desc: 'Harder, and it throws them back a moment; no burning after.', fx: [{ k: 'burst', r: 4.5, dmg: 1.4, stun: 0.8 }] },
  ],
  ln_wystan: [
    { name: 'The Abbot\'s Pyre', desc: 'It burns twelve seconds.', fx: [{ k: 'ground', range: 14, r: 3.5, dmg: 1.2, delay: 0.6 }, { k: 'zone', range: 14, r: 3.5, secs: 12, dmg: 0.45, color: '#ffb040' }] },
    { name: 'Down into the Bed', desc: 'One great blast that throws them off their feet; no fire after.', fx: [{ k: 'ground', range: 14, r: 4.5, dmg: 2.6, delay: 0.8, stun: 1.2 }] },
  ],
  // ---------------------------------------------------------------- The Storm-hunters
  ln_stormrod: [
    { name: 'Forked Rod', desc: 'It jumps to everything within three blocks of the target, lighter.', fx: [{ k: 'strike', range: 16, dmg: 0.9 }, { k: 'ground', range: 16, r: 3, dmg: 0.5, delay: 0.1 }] },
    { name: 'Grounded Rod', desc: 'It holds the target a moment as it strikes.', fx: [{ k: 'strike', range: 16, dmg: 1.0, stun: 0.8 }] },
  ],
  ln_glare: [
    { name: 'Noon Glare', desc: 'Wider, six blocks round you.', fx: [{ k: 'burst', r: 6, dmg: 0.3, stun: 1.0 }] },
    { name: 'Burning Glass', desc: 'Harder, and it slows; a shorter blinding.', fx: [{ k: 'burst', r: 4, dmg: 0.8, stun: 0.5, slow: 4 }] },
  ],
  ln_saltwind: [
    { name: 'Dust Devil', desc: 'Round you instead, and it keeps them off: everything there is slowed.', fx: [{ k: 'zone', range: 0, r: 4.5, secs: 6, dmg: 0.4, slow: 1.5, color: '#e8e0d0' }] },
    { name: 'Sandblast', desc: 'Harder and shorter, four seconds.', fx: [{ k: 'zone', range: 14, r: 4, secs: 4, dmg: 0.75, color: '#e8e0d0' }] },
  ],
  ln_glassward: [
    { name: 'Mirror Glass', desc: 'Thinner, but nothing touches you for a second as it goes on.', fx: [{ k: 'ward', amt: 0.16, secs: 8 }, { k: 'buff', secs: 1, evade: true }] },
    { name: 'The Mother\'s Scale', desc: 'A quarter of your health, for twelve seconds.', fx: [{ k: 'ward', amt: 0.25, secs: 12 }] },
  ],
  ln_callstorm: [
    { name: 'The Long Storm', desc: 'Five strikes, lighter.', fx: [{ k: 'ground', range: 16, r: 3.5, dmg: 0.7, delay: 0.5 }, { k: 'ground', range: 16, r: 3.5, dmg: 0.7, delay: 0.9 }, { k: 'ground', range: 16, r: 3.5, dmg: 0.7, delay: 1.3 }, { k: 'ground', range: 16, r: 3.5, dmg: 0.7, delay: 1.7 }, { k: 'ground', range: 16, r: 3.5, dmg: 0.7, delay: 2.1 }] },
    { name: 'Thunderclap', desc: 'One great strike that throws everything there down.', fx: [{ k: 'ground', range: 16, r: 4.5, dmg: 2.6, delay: 0.8, stun: 1.4 }] },
  ],
  // ---------------------------------------------------------------- The Skyfarmers' Craft
  ln_featherfall: [
    { name: 'Long Fall', desc: 'Up to twenty blocks; it comes back a little slower.', fx: [{ k: 'buff', secs: 0.5, evade: true }, { k: 'blink', range: 20 }], cd: 1.2 },
    { name: 'Slab-step', desc: 'Where you land, the ground lifts: everything close is staggered.', fx: [{ k: 'buff', secs: 0.5, evade: true }, { k: 'blink', range: 14 }, { k: 'ground', range: 14, r: 3, dmg: 0.5, delay: 0.2, stun: 0.8 }] },
  ],
  ln_lift: [
    { name: 'High Lift', desc: 'Up longer, two seconds, lighter.', fx: [{ k: 'burst', r: 4, dmg: 0.4, stun: 2 }] },
    { name: 'Hard Landing', desc: 'They come down harder; a shorter lift.', fx: [{ k: 'burst', r: 4, dmg: 1.2, stun: 0.8 }] },
  ],
  ln_ropebridge: [
    { name: 'Long Line', desc: 'From twenty-two blocks.', fx: [{ k: 'leap', range: 22, dmg: 0.8, stun: 0.6 }] },
    { name: 'Pinned', desc: 'The pin holds it: exposed and slowed after you land.', fx: [{ k: 'leap', range: 16, dmg: 0.7, expose: 3 }, { k: 'strike', range: 3, dmg: 0.2, slow: 5 }] },
  ],
  ln_slabward: [
    { name: 'Still Air', desc: 'A third less taken, for four seconds.', fx: [{ k: 'buff', secs: 4, taken: 0.67 }] },
    { name: 'Drift', desc: 'A fifth less for ten seconds, and a sixth of you mends.', fx: [{ k: 'buff', secs: 10, taken: 0.8 }, { k: 'heal', over: [0.16, 10] }] },
  ],
  ln_slabfall: [
    { name: 'Shower of Stones', desc: 'Three smaller lumps over a wider patch.', fx: [{ k: 'ground', range: 16, r: 5, dmg: 1.0, delay: 0.9 }, { k: 'ground', range: 16, r: 5, dmg: 1.0, delay: 1.3 }, { k: 'ground', range: 16, r: 5, dmg: 1.0, delay: 1.7 }] },
    { name: 'The Last Slab', desc: 'Harder still, and it breaks the ground: slowed five seconds after.', fx: [{ k: 'ground', range: 16, r: 4.5, dmg: 2.7, delay: 1.2, stun: 1.0 }, { k: 'zone', range: 16, r: 4.5, secs: 5, dmg: 0.1, slow: 1.5, color: '#e8f4ff' }] },
  ],
};
