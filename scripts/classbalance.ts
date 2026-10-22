// Balance check for the callings (npm run balance). Plays each calling through four fights with a
// simple, consistent rotation and prints what it can do. Callings should differ in *how* they win
// (damage, safety, reach) but come out level overall: the check fails if any calling's overall score
// is more than 7% off the average, or if one is best at everything.
//
// Units: damage in P (one ordinary swing at your level); health as a fraction of your own.
import { CALLINGS, CallingId, chosenUtilities, type SkillDef, TUNE as BASE } from '../src/data/classes';
import { TREES, tuned, type Tune } from '../src/data/talents';

const DT = 0.05;
const CRIT = 0.12, CRIT_MULT = 1.6;
const CHAIN = [{ m: 1, d: 0.42 }, { m: 1.1, d: 0.42 }, { m: 1.5, d: 0.55 }];
const CLEAVE = { m: 1.5, d: 0.6, cd: 6 };

interface Foe { hp: number; stun: number; hitIn: number; rate: number; bleed: number; bleedPer: number; mark: number; chill: number }
interface Fight { name: string; foes: () => Foe[]; secs: number; ranged: boolean; dummy: boolean }

/** Fights: a training dummy, four dummies, a strong elite toe to toe, and a pack of four. */
const FIGHTS: Fight[] = [
  { name: 'single dps', foes: () => [foe(1e9, 0)], secs: 90, ranged: false, dummy: true },
  { name: 'pack dps', foes: () => [0, 1, 2, 3].map(() => foe(1e9, 0)), secs: 30, ranged: false, dummy: true },
  { name: 'elite duel', foes: () => [foe(90, 0.06)], secs: 120, ranged: false, dummy: false },
  { name: 'pack of four', foes: () => [0, 1, 2, 3].map(() => foe(14, 0.025)), secs: 120, ranged: false, dummy: false },
];
function foe(hp: number, rate: number): Foe { return { hp, stun: 0, hitIn: 0.6 + Math.random() * 0.6, rate, bleed: 0, bleedPer: 0, mark: 0, chill: 0 }; }

interface Result { dealt: number; secs: number; hpLeft: number; won: boolean }

/** The bar the rotation uses: the heal, three utilities (by id, or the first three) and the elite. */
function barOf(id: CallingId, utilities?: string[]): SkillDef[] {
  const c = CALLINGS.find((x) => x.id === id)!;
  return [c.skills[0], ...chosenUtilities(c, utilities ?? null), c.skills[2]];
}

function run(id: CallingId, f: Fight, ranged: boolean, TUNE: Tune = BASE, bar: SkillDef[] = barOf(id)): Result {
  const foes = f.foes();
  const cds = [0, 0, 0, 0, 0];
  let holdUntil = 0, rushUntil = 0, critNext = false, boltMult = 1;
  /** Burning or arrow-struck ground: so much a second to everything caught, until then. */
  const zones: { until: number; per: number; tick: number; chill?: boolean }[] = [];
  let evadeUntil = 0;
  let t = 0, hp = 1, busy = 0, chain = 0, cleaveCd = 0, dealt = 0;
  let resolve = 0, resolveAt = -99, fury = 0, kindling = 0, shield = 0, shieldUntil = 0, oathUntil = 0, oathTick = 0;
  let redUntil = 0, wardUntil = 0, wardTick = 0, stepUntil = 0, pendingStar = -1;
  const live = () => foes.filter((e) => e.hp > 0);
  const hit = (e: Foe, p: number, crit = Math.random() < CRIT) => {
    let d = p * (crit ? CRIT_MULT : 1);
    if (redUntil > t) d *= TUNE.redhour.dealt;
    if (e.mark > t) d *= 1 + TUNE.volley.markBonus;
    e.hp -= d; dealt += d;
    if (id === 'reaver') fury = Math.min(100, fury + TUNE.fury.perHit);
    return d;
  };
  const heal = (n: number) => { hp = Math.min(1, hp + n); };
  const aoe = (n: number, p: number) => live().slice(0, n).forEach((e) => hit(e, p));
  // The Wizard's Chill: the third freezes the foe and cracks it
  const chill = (e: Foe) => { if (++e.chill >= TUNE.chill.max) { e.chill = 0; e.stun = Math.max(e.stun, TUNE.chill.freeze); hit(e, TUNE.chill.shatter); } };
  // How many foes an area skill catches: a pack bunches up around you; the duel is one.
  const caught = () => Math.min(live().length, 4);

  for (; t < f.secs; t += DT) {
    const L = live();
    if (!L.length) return { dealt, secs: t, hpLeft: hp, won: true };
    const tgt = L[0];
    for (let i = 0; i < cds.length; i++) cds[i] = Math.max(0, cds[i] - DT);
    cleaveCd = Math.max(0, cleaveCd - DT);
    busy = Math.max(0, busy - DT);
    if (id === 'warden' && t - resolveAt > TUNE.resolve.fade) resolve = 0;

    // Effects over time
    if (oathUntil > t && (oathTick -= DT) <= 0) { oathTick = 1; aoe(caught(), TUNE.oath.burn); }
    if (wardUntil > t && (wardTick -= DT) <= 0) { wardTick = 1; heal(TUNE.ward.heal / TUNE.ward.secs); if (!ranged) aoe(caught(), TUNE.ward.burn); }
    for (const e of L) if (e.bleed > 0) { e.bleed -= DT; hit(e, e.bleedPer * DT, false); heal(TUNE.bleed.heal * DT); }
    if (pendingStar >= 0 && (pendingStar -= DT) < 0) { pendingStar = -1; aoe(caught(), TUNE.starfall.dmg); }
    for (const z of zones) if (z.until > t && (z.tick -= DT) <= 0) { z.tick = 1; aoe(caught(), z.per); if (z.chill) live().slice(0, caught()).forEach(chill); }

    // Incoming blows (rate = share of your health per second, landing every ~1.2 s)
    if (!f.dummy) for (const e of L) {
      if (e.stun > 0) { e.stun -= DT; continue; }
      if ((e.hitIn -= DT) > 0) continue;
      e.hitIn = 1.2;
      // At range, a ranged calling only gets reached about half the time (kiting, the approach)
      if (ranged && Math.random() < 0.5) continue;
      if (evadeUntil > t) continue;
      let d = e.rate * 1.2;
      if (id === 'warden') {
        d *= 1 - resolve * TUNE.resolve.per; resolve = Math.min(TUNE.resolve.max, resolve + 1); resolveAt = t;
        if (oathUntil > t) d *= TUNE.oath.taken;
      }
      if (redUntil > t) d *= TUNE.redhour.taken;
      if (holdUntil > t) d *= TUNE.holdfast.taken;
      if (shield > 0 && shieldUntil > t) { const s = Math.min(shield, d); shield -= s; d -= s; }
      hp -= d;
      if (hp <= 0) return { dealt, secs: t, hpLeft: 0, won: false };
    }
    if (busy > 0) continue;

    // The rotation: elite when it's worth it, signature, sustain when hurt (or on cooldown for damage), then swing
    const use = (i: number): boolean => {
      if (cds[i] > 0) return false;
      const s = bar[i];
      const furyK = id === 'reaver' && fury >= 100 && s.id !== 'redhour' ? TUNE.fury.mult : 1;
      switch (s.id) {
        case 'bulwark': if (f.dummy || hp > 0.85) return false; shield = TUNE.bulwark.shield; shieldUntil = t + TUNE.bulwark.secs; break;
        case 'bash': if (ranged) return false; hit(tgt, TUNE.bash.dmg); tgt.stun = Math.max(tgt.stun, TUNE.bash.stun); break;
        case 'oath': if (ranged) return false; oathUntil = t + TUNE.oath.secs; oathTick = 0; break;
        case 'bleed': if (ranged) return false; hit(tgt, TUNE.bleed.dmg * furyK); heal(TUNE.bleed.heal); tgt.bleed = TUNE.bleed.secs; tgt.bleedPer = TUNE.bleed.dot * furyK; break;
        case 'leap': aoe(caught(), TUNE.leap.dmg * furyK); break;
        case 'redhour': redUntil = t + TUNE.redhour.secs; break;
        case 'ward': if (!f.dummy && hp > 0.8) return false; wardUntil = t + TUNE.ward.secs; wardTick = 0; break;
        case 'bolt': {
          hit(tgt, TUNE.bolt.dmg * boltMult); boltMult = 1;
          if (++kindling >= TUNE.bolt.every) { kindling = 0; hit(tgt, TUNE.bolt.burst); aoe(caught(), 0); live().slice(1, caught()).forEach((e) => hit(e, TUNE.bolt.burst)); }
          break;
        }
        case 'starfall': pendingStar = TUNE.starfall.delay; break;
        case 'dressing': if (f.dummy || hp > 0.65) return false; heal(TUNE.dressing.heal); break;
        case 'volley': for (let k = 0; k < TUNE.volley.arrows; k++) hit(tgt, TUNE.volley.dmg); live().slice(0, caught()).forEach((e) => { e.mark = t + TUNE.volley.mark; }); break;
        case 'shadowstep': if (ranged) return false; tgt.stun = Math.max(tgt.stun, TUNE.shadowstep.stun); stepUntil = t + TUNE.shadowstep.window; break;
        case 'holdfast': if (f.dummy || hp > 0.9) return false; holdUntil = t + TUNE.holdfast.secs; break;
        case 'shieldthrow': hit(tgt, TUNE.shieldthrow.dmg); tgt.stun = Math.max(tgt.stun, TUNE.shieldthrow.stun); break;
        case 'rally': if (f.dummy || hp > 0.8) return false; heal(TUNE.rally.heal); resolve = TUNE.resolve.max; resolveAt = t; break;
        case 'rend': if (ranged) return false; aoe(caught(), TUNE.rend.dmg * furyK); zones.push({ until: t + TUNE.rend.secs, per: TUNE.rend.dot, tick: 1 }); break;
        case 'rush': rushUntil = t + TUNE.rush.secs; break;
        case 'hamstring': if (ranged) return false; hit(tgt, TUNE.hamstring.dmg * furyK); tgt.stun = Math.max(tgt.stun, TUNE.hamstring.stun); break;
        case 'firewall': zones.push({ until: t + TUNE.firewall.secs, per: TUNE.firewall.burn, tick: 0.2 }); break;
        case 'cinderstep': if (f.dummy) return false; zones.push({ until: t + TUNE.cinderstep.secs, per: TUNE.cinderstep.burn, tick: 0.2 }); break;
        case 'kindle': kindling = Math.min(TUNE.bolt.every - 1, kindling + TUNE.kindle.stacks); boltMult = TUNE.kindle.mult; break;
        case 'snare': hit(tgt, TUNE.snare.dmg); tgt.stun = Math.max(tgt.stun, TUNE.snare.stun); break;
        case 'rain': zones.push({ until: t + TUNE.rain.secs, per: TUNE.rain.dmg, tick: 0.2 }); break;
        case 'quickstep': stepUntil = t + TUNE.quickstep.window; break;
        case 'icebarrier': if (f.dummy || hp > 0.85) return false; shield = TUNE.icebarrier.shield; shieldUntil = t + TUNE.icebarrier.secs; break;
        case 'frostbolt': hit(tgt, TUNE.frostbolt.dmg); chill(tgt); break;
        case 'blizzard': zones.push({ until: t + TUNE.blizzard.secs, per: TUNE.blizzard.dmg, tick: 0.2, chill: true }); break;
        // Blink: a moment untouchable, and they have to come to you again
        case 'blink': if (f.dummy || hp > 0.7) return false; evadeUntil = t + TUNE.blink.evade; for (const e of L) e.hitIn += 1.5; break;
        case 'icelance': hit(tgt, TUNE.icelance.dmg * (tgt.stun > 0 ? TUNE.icelance.frozen : 1)); break;
        case 'frostnova': if (ranged) return false; aoe(caught(), TUNE.frostnova.dmg); live().slice(0, caught()).forEach((e) => { e.stun = Math.max(e.stun, TUNE.frostnova.freeze); }); break;
      }
      if (furyK > 1) fury = 0;
      cds[i] = s.cd;
      busy = TUNE.skillLock;
      return true;
    };
    if (use(4) || use(3) || use(2) || use(1) || use(0)) continue;
    if (ranged) continue; // at range, only the ranged skills
    if (cleaveCd <= 0 && L.length > 1) {
      aoe(Math.min(L.length, 4), CLEAVE.m); cleaveCd = CLEAVE.cd; busy = CLEAVE.d; chain = 0; continue;
    }
    const sw = CHAIN[chain];
    if (stepUntil > t) { hit(tgt, sw.m * TUNE.shadowstep.mult, true); stepUntil = 0; }
    else if (critNext) { hit(tgt, sw.m, true); critNext = false; }
    else hit(tgt, sw.m);
    busy = sw.d / (rushUntil > t ? TUNE.rush.speed : 1);
    chain = (chain + 1) % 3;
  }
  return { dealt, secs: f.secs, hpLeft: hp, won: live().length === 0 };
}

// Average many runs; ranged callings fight the way that suits them better
const RUNS = 300;
const rangedCallings = new Set<CallingId>(['ashcaller', 'wizard']);
const rows: Record<string, number[]> = {};
for (const c of CALLINGS) {
  const cells: number[] = [];
  for (const f of FIGHTS) {
    const modes = rangedCallings.has(c.id) && !f.dummy ? [false, true] : [false];
    let best = -Infinity;
    for (const ranged of modes) {
      let score = 0;
      for (let r = 0; r < RUNS; r++) {
        const res = run(c.id, f, ranged);
        // Dummies: damage a second. Real fights: health left at the end (a loss counts against you by how far the foe still had to go)
        if (f.dummy) score += res.dealt / res.secs;
        else score += res.won ? res.hpLeft : -(f.foes().reduce((s, e) => s + e.hp, 0) - res.dealt) / f.foes().reduce((s, e) => s + e.hp, 0);
      }
      best = Math.max(best, score / RUNS);
    }
    cells.push(best);
  }
  rows[c.id] = cells;
}

const pad = (s: string, n: number) => s.padEnd(n);
console.log(pad('calling', 12) + FIGHTS.map((f) => pad(f.name, 14)).join('') + 'overall');
// Overall: each fight scored against the average calling, then averaged
const avg = FIGHTS.map((_, i) => CALLINGS.reduce((s, c) => s + rows[c.id][i], 0) / CALLINGS.length);
const overall: Record<string, number> = {};
for (const c of CALLINGS) {
  const rel = rows[c.id].map((v, i) => FIGHTS[i].dummy ? v / avg[i] : 1 + (v - avg[i]));
  overall[c.id] = rel.reduce((s, v) => s + v, 0) / rel.length;
  console.log(pad(c.name, 12) + rows[c.id].map((v, i) => pad(FIGHTS[i].dummy ? v.toFixed(2) + ' P/s' : (v * 100).toFixed(0) + '% hp', 14)).join('') + overall[c.id].toFixed(3));
}
const mean = Object.values(overall).reduce((s, v) => s + v, 0) / CALLINGS.length;
let bad = 0;
for (const c of CALLINGS) {
  const off = overall[c.id] / mean - 1;
  if (Math.abs(off) > 0.07) { console.log(`  ${c.name} is ${(off * 100).toFixed(0)}% off the average`); bad++; }
  if (FIGHTS.every((_, i) => CALLINGS.every((o) => rows[c.id][i] >= rows[o.id][i]))) { console.log(`  ${c.name} is best at everything`); bad++; }
}
console.log(bad ? `${bad} balance problem(s)` : 'Balanced: every calling within 7% overall');

// Talent trees: each calling with each of its trees learned in full (capstone too), scored against
// the twelve builds' average the same way. Every tree has to stay within 7% of it, and no tree may be
// best at everything.
const builds: { calling: CallingId; tree: string; cells: number[] }[] = [];
for (const c of CALLINGS) for (const tree of TREES[c.id]) {
  const T = tuned(tree.talents.map((t) => t.id));
  const cells = FIGHTS.map((f) => {
    const modes = rangedCallings.has(c.id) && !f.dummy ? [false, true] : [false];
    let best = -Infinity;
    for (const ranged of modes) {
      let score = 0;
      for (let r = 0; r < RUNS; r++) {
        const res = run(c.id, f, ranged, T);
        if (f.dummy) score += res.dealt / res.secs;
        else score += res.won ? res.hpLeft : -(f.foes().reduce((sum, e) => sum + e.hp, 0) - res.dealt) / f.foes().reduce((sum, e) => sum + e.hp, 0);
      }
      best = Math.max(best, score / RUNS);
    }
    return best;
  });
  builds.push({ calling: c.id, tree: tree.name, cells });
}
const tavg = FIGHTS.map((_, i) => builds.reduce((sum, b) => sum + b.cells[i], 0) / builds.length);
const tover = builds.map((b) => b.cells.map((v, i) => FIGHTS[i].dummy ? v / tavg[i] : 1 + (v - tavg[i])).reduce((sum, v) => sum + v, 0) / FIGHTS.length);
const tmean = tover.reduce((sum, v) => sum + v, 0) / tover.length;
console.log('\ntalent trees, each learned in full');
builds.forEach((b, k) => console.log(pad(b.calling + ' / ' + b.tree, 26) + b.cells.map((v, i) => pad(FIGHTS[i].dummy ? v.toFixed(2) + ' P/s' : (v * 100).toFixed(0) + '% hp', 14)).join('') + tover[k].toFixed(3)));
let tbad = 0;
builds.forEach((b, k) => {
  const off = tover[k] / tmean - 1;
  if (Math.abs(off) > 0.07) { console.log(`  ${b.calling} / ${b.tree} is ${(off * 100).toFixed(0)}% off the average`); tbad++; }
  if (FIGHTS.every((_, i) => builds.every((o) => b.cells[i] >= o.cells[i]))) { console.log(`  ${b.calling} / ${b.tree} is best at everything`); tbad++; }
});
console.log(tbad ? `${tbad} talent balance problem(s)` : 'Talent trees balanced: every tree within 7% overall');

// Utility bars: each calling with every choice of two of its three chosen utilities (the signature is
// always there), against the twelve bars' average. None may be more than 10% off overall.
const bars: { calling: CallingId; name: string; cells: number[] }[] = [];
for (const c of CALLINGS) {
  const three = c.utilities;
  for (let skip = 0; skip < three.length; skip++) {
    const pick = three.filter((_, k) => k !== skip).map((s) => s.id);
    const bar = barOf(c.id, pick);
    const cells = FIGHTS.map((f) => {
      const modes = rangedCallings.has(c.id) && !f.dummy ? [false, true] : [false];
      let best = -Infinity;
      for (const ranged of modes) {
        let score = 0;
        for (let r = 0; r < RUNS; r++) {
          const res = run(c.id, f, ranged, BASE, bar);
          if (f.dummy) score += res.dealt / res.secs;
          else score += res.won ? res.hpLeft : -(f.foes().reduce((sum, e) => sum + e.hp, 0) - res.dealt) / f.foes().reduce((sum, e) => sum + e.hp, 0);
        }
        best = Math.max(best, score / RUNS);
      }
      return best;
    });
    bars.push({ calling: c.id, name: 'without ' + three[skip].name, cells });
  }
}
const bavg = FIGHTS.map((_, i) => bars.reduce((sum, b) => sum + b.cells[i], 0) / bars.length);
const bover = bars.map((b) => b.cells.map((v, i) => FIGHTS[i].dummy ? v / bavg[i] : 1 + (v - bavg[i])).reduce((sum, v) => sum + v, 0) / FIGHTS.length);
const bmean = bover.reduce((sum, v) => sum + v, 0) / bover.length;
console.log('\nutility bars, each choice of two beside the signature');
bars.forEach((b, k) => console.log(pad(b.calling + ' / ' + b.name, 34) + b.cells.map((v, i) => pad(FIGHTS[i].dummy ? v.toFixed(2) + ' P/s' : (v * 100).toFixed(0) + '% hp', 14)).join('') + bover[k].toFixed(3)));
let bbad = 0;
bars.forEach((b, k) => { const off = bover[k] / bmean - 1; if (Math.abs(off) > 0.1) { console.log(`  ${b.calling} / ${b.name} is ${(off * 100).toFixed(0)}% off the average`); bbad++; } });
console.log(bbad ? `${bbad} bar balance problem(s)` : 'Utility bars balanced: every choice within 10% overall');
process.exit(bad || tbad || bbad ? 1 : 0);
