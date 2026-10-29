// Balance check for the callings (npm run balance). Plays each calling through four fights with a
// simple, consistent rotation and prints what it can do. Callings should differ in *how* they win
// (damage, safety, reach) but come out level overall: the check fails if any calling's overall score
// is more than 7% off the average, or if one is best at everything.
//
// Units: damage in P (one ordinary swing at your level); health as a fraction of your own.
import { CALLINGS, CallingId, chosenUtilities, elitesOf, type SkillDef, TUNE as BASE } from '../src/data/classes';
import { fullTree, TREES, tuned, type Tune } from '../src/data/talents';
import { applyRank, MORPHS } from '../src/data/skillpoints';
import { CALLING_POOL, POOLS, SKILL_COST, SLOT_COST, type Cost } from '../src/data/combat';

const DT = 0.05;
/** The pools as the game keeps them in a fight (Game.ts): stamina back at 12 a second, magicka at POOLS.magicka.regenFight. */
const STAMINA = { max: 100, regen: 12 };
/** The weapon skill's price (the sim's cleave stands in for it): always stamina, as in the game. */
const WEAPON_COST: Cost = { pool: 'stamina', n: 12 };
/** Seconds a skill was ready but couldn't be paid for, across runs (reset by whoever reads it). */
let dry = 0;
const CRIT = 0.12, CRIT_MULT = 1.6;
const CHAIN = [{ m: 1, d: 0.42 }, { m: 1.1, d: 0.42 }, { m: 1.5, d: 0.55 }];
const CLEAVE = { m: 1.5, d: 0.6, cd: 6 };

interface Foe { hp: number; stun: number; hitIn: number; rate: number; bleed: number; bleedPer: number; mark: number; chill: number; burned?: boolean; wither?: number; withered?: number; max: number; weak: number }
interface Fight { name: string; foes: () => Foe[]; secs: number; ranged: boolean; dummy: boolean }

/** Fights: a training dummy, four dummies, a strong elite toe to toe, and a pack of four. */
const FIGHTS: Fight[] = [
  { name: 'single dps', foes: () => [foe(1e9, 0)], secs: 90, ranged: false, dummy: true },
  { name: 'pack dps', foes: () => [0, 1, 2, 3].map(() => foe(1e9, 0)), secs: 30, ranged: false, dummy: true },
  { name: 'elite duel', foes: () => [foe(90, 0.06)], secs: 120, ranged: false, dummy: false },
  { name: 'pack of four', foes: () => [0, 1, 2, 3].map(() => foe(14, 0.025)), secs: 120, ranged: false, dummy: false },
];
function foe(hp: number, rate: number): Foe { return { hp, max: hp, weak: 0, stun: 0, hitIn: 0.6 + Math.random() * 0.6, rate, bleed: 0, bleedPer: 0, mark: 0, chill: 0 }; }

interface Result { dealt: number; secs: number; hpLeft: number; won: boolean }

/** The bar the rotation uses: the heal, three utilities (by id, or the first three) and the elite. */
function barOf(id: CallingId, utilities?: string[], elite?: string): SkillDef[] {
  const c = CALLINGS.find((x) => x.id === id)!;
  return [c.skills[0], ...chosenUtilities(c, utilities ?? null), elitesOf(c).find((e) => e.id === elite) ?? c.skills[2]];
}

function run(id: CallingId, f: Fight, ranged: boolean, TUNE: Tune = BASE, bar: SkillDef[] = barOf(id)): Result {
  const foes = f.foes();
  const cds = [0, 0, 0, 0, 0];
  // The pools: each skill's price as Game.skillCost works it out (bar index 0 the heal, 4 the elite)
  let sta = STAMINA.max, mag = POOLS.magicka.max, shortAt = -1;
  const costs: Cost[] = bar.map((s, i) => SKILL_COST[s.id] ?? { pool: CALLING_POOL[id] ?? 'stamina', n: i === 0 ? SLOT_COST.heal : i === 4 ? SLOT_COST.elite : SLOT_COST.utility });
  const canPay = (c: Cost) => c.pool === 'health' || (c.pool === 'stamina' ? sta : mag) >= c.n;
  const pay = (c: Cost) => { if (c.pool === 'stamina') sta -= c.n; else if (c.pool === 'magicka') mag -= c.n; };
  let holdUntil = 0, rushUntil = 0, critNext = false, boltMult = 1;
  /** Burning or arrow-struck ground: so much a second to everything caught, until then. */
  const zones: { until: number; per: number; tick: number; chill?: boolean; fire?: boolean; mark?: boolean }[] = [];
  let shieldKind = '', hotUntil = 0, star2 = -1;
  let evadeUntil = 0;
  // The Mender: Grace, Sanctuary underfoot, Restoration ticking
  let grace = 0, sanctUntil = 0, sanctTick = 0, restoreUntil = 0;
  // The Gravecaller: Lifeblood, the raised dead
  let blood = 0, raisedUntil = 0, raiseTick = 0;
  // The Reaver's Blood Up: blows give a little back, until then
  let bloodUpUntil = 0;
  const addBlood = (n: number) => { blood = Math.min(TUNE.lifeblood.max, blood + n); };
  /** A blood price (percent of health): Lifeblood first; false (and nothing paid) if it would take the last of you. */
  const payBlood = (pct: number) => { const c = pct / 100, from = Math.min(blood, c); if (hp - (c - from) <= 0.02) return false; blood -= from; hp -= c - from; return true; };
  const addWither = (e: Foe, n: number) => { e.wither = Math.min(TUNE.wither.max, ((e.withered ?? 0) > t ? e.wither ?? 0 : 0) + n); e.withered = t + TUNE.wither.secs; };
  let t = 0, hp = 1, busy = 0, chain = 0, cleaveCd = 0, dealt = 0;
  let resolve = 0, resolveAt = -99, fury = 0, kindling = 0, shield = 0, shieldUntil = 0, oathUntil = 0, oathTick = 0;
  let redUntil = 0, wardUntil = 0, wardTick = 0, stepUntil = 0, pendingStar = -1;
  const live = () => foes.filter((e) => e.hp > 0);
  // The other elites' clocks: Unbroken, Deadeye, the Vigil, Massacre's turns to come
  let unbrokenUntil = 0, deadeyeUntil = 0, vigilUntil = 0, massacreLeft = 0, massacreNext = 0;
  // The Prowler: Openings, out of sight until, the first blow from hiding, poisoned blows left, A Thousand Cuts to come
  let openings = 0, hiddenUntil = 0, fromHiding = 1, venom = 0, cutsLeft = 0, cutsNext = 0;
  // The Pathfinder's hound: until when, its next bite, its health (a share of yours)
  let houndUntil = 0, houndBite = 0, houndHp = 0;
  const hit = (e: Foe, p: number, crit = Math.random() < CRIT) => {
    let d = p * (crit || (deadeyeUntil > t && p > 0.3) ? CRIT_MULT : 1);
    if (redUntil > t) d *= TUNE.redhour.dealt;
    if (id === 'prowler' && p > 0.3) {
      let gain = 1;
      if (hiddenUntil > t) { d *= fromHiding; hiddenUntil = 0; fromHiding = 1; gain = TUNE.openings.back; }
      else if (e.stun > 0) gain = TUNE.openings.back;
      openings = Math.min(TUNE.openings.max, openings + gain);
      if (venom > 0) { venom--; e.bleed = TUNE.poisonblade.secs; e.bleedPer = TUNE.poisonblade.dot; }
    }
    if (e.mark > t) d *= 1 + TUNE.volley.markBonus;
    if (id === 'warden') d *= 1 + resolve * TUNE.resolve.dmg;
    const was = e.hp;
    e.hp -= d; dealt += d;
    // A foe dying withered gives up the rest of its life
    if (was > 0 && e.hp <= 0 && (e.withered ?? 0) > t) addBlood(TUNE.lifeblood.kill);
    if (id === 'reaver') fury = Math.min(100, fury + TUNE.fury.perHit * (redUntil > t ? TUNE.fury.red : 1));
    if (bloodUpUntil > t && p > 0.3) hp = Math.min(1, hp + TUNE.bloodup.leech);
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
    sta = Math.min(STAMINA.max, sta + STAMINA.regen * DT);
    mag = Math.min(POOLS.magicka.max, mag + POOLS.magicka.regenFight * DT);
    if (id === 'warden' && t - resolveAt > TUNE.resolve.fade) resolve = 0;

    // Effects over time
    if (oathUntil > t && (oathTick -= DT) <= 0) { oathTick = 1; aoe(caught(), TUNE.oath.burn); heal(TUNE.oath.heal); }
    if (shield > 0 && shieldUntil <= t) { if (shieldKind === 'bulwark') heal(shield * TUNE.bulwark.mend); shield = 0; }
    if (hotUntil > t) heal(TUNE.dressing.hot / 5 * DT);
    if (restoreUntil > t) heal(TUNE.restore.heal / TUNE.restore.secs * DT);
    if (unbrokenUntil > t) heal(TUNE.unbroken.heal / TUNE.unbroken.secs * DT);
    if (vigilUntil > t) heal(TUNE.vigil.heal * DT);
    if (houndUntil > t && houndHp > 0 && (houndBite -= DT) <= 0) { houndBite = TUNE.hound.every; const to = live()[0]; if (to) { hit(to, TUNE.hound.dmg); if (Math.random() < TUNE.hound.bleed) { to.bleed = 4; to.bleedPer = 0.15; } } }
    if (cutsLeft > 0 && t >= cutsNext) { const to = live()[0]; if (to) hit(to, TUNE.thousand.dmg); cutsLeft--; cutsNext += TUNE.thousand.every; }
    if (massacreLeft > 0 && t >= massacreNext) { aoe(caught(), TUNE.massacre.dmg); massacreLeft--; massacreNext += TUNE.massacre.every; }
    for (const e of L) if (e.wither && (e.withered ?? 0) > t) { hit(e, TUNE.wither.dot * e.wither * DT, false); addBlood(TUNE.lifeblood.tick * e.wither * DT); }
    if (raisedUntil > t && (raiseTick -= DT) <= 0) { raiseTick = TUNE.raise.every; const to = live()[0]; if (to) for (let k = 0; k < TUNE.raise.n; k++) hit(to, TUNE.raise.dmg); }
    // Sanctuary: you heal on it; foes burn on it only when they've come to you
    if (sanctUntil > t && (sanctTick -= DT) <= 0) { sanctTick = 1; heal(TUNE.sanctuary.heal); if (!ranged) aoe(caught(), TUNE.sanctuary.burn); }
    if (star2 >= 0 && (star2 -= DT) < 0) { star2 = -1; aoe(caught(), TUNE.starfall.dmg * TUNE.starfall.twice); }
    if (wardUntil > t && (wardTick -= DT) <= 0) { wardTick = 1; heal(TUNE.ward.heal / TUNE.ward.secs); if (!ranged) aoe(caught(), TUNE.ward.burn); }
    for (const e of L) if (e.bleed > 0) {
      e.bleed -= DT; hit(e, e.bleedPer * DT, false); if (id === 'reaver') heal(TUNE.bleed.heal * DT);
      // Exsanguinate: the bleed finds the next
      if (e.hp <= 0 && TUNE.bleed.spread > 0) { const n = live().find((o) => o.bleed <= 0); if (n) { n.bleed = e.bleed; n.bleedPer = e.bleedPer; } }
    }
    if (pendingStar >= 0 && (pendingStar -= DT) < 0) { pendingStar = -1; aoe(caught(), TUNE.starfall.dmg); if (TUNE.starfall.twice > 0) star2 = 0.7; }
    for (const z of zones) if (z.until > t && (z.tick -= DT) <= 0) {
      z.tick = 1; aoe(caught(), z.per);
      if (z.chill) for (let k = 0; k < TUNE.blizzard.chills; k++) live().slice(0, caught()).forEach(chill);
      if (z.mark) live().slice(0, caught()).forEach((e) => { e.mark = t + TUNE.volley.mark; });
      // Hearth: only up close is the Kindler standing in its own fire
      if (z.fire && !ranged) heal(TUNE.firewall.heal);
    }

    // Incoming blows (rate = share of your health per second, landing every ~1.2 s)
    if (!f.dummy) for (const e of L) {
      if (e.stun > 0) { e.stun -= DT; continue; }
      if ((e.hitIn -= DT) > 0) continue;
      e.hitIn = 1.2;
      // At range, a ranged calling only gets reached about half the time (kiting, the approach)
      if (ranged && Math.random() < 0.5) continue;
      if (evadeUntil > t || hiddenUntil > t) continue;
      if (id === 'prowler' && Math.random() < TUNE.openings.dodge) continue;
      // Some go for the hound instead (anything it has bitten may turn on it)
      if (houndUntil > t && houndHp > 0 && Math.random() < TUNE.hound.draw) { houndHp -= e.rate * 1.2; continue; }
      let d = e.rate * 1.2;
      if (id === 'warden') {
        d *= 1 - resolve * TUNE.resolve.per; resolve = Math.min(TUNE.resolve.max, resolve + 1); resolveAt = t;
        if (oathUntil > t) d *= TUNE.oath.taken;
      }
      if (redUntil > t) d *= TUNE.redhour.taken;
      if (e.weak > t) d *= 0.85;
      if (holdUntil > t) d *= TUNE.holdfast.taken;
      if (sanctUntil > t) d *= TUNE.sanctuary.taken;
      if (shield > 0 && shieldUntil > t) {
        if (shieldKind === 'ice' && Math.random() < TUNE.icebarrier.bite) chill(e);
        if (shieldKind === 'bone') addWither(e, 1);
        const s = Math.min(shield, d); shield -= s; d -= s;
        if (shield <= 0) {
          if (shieldKind === 'bulwark' && TUNE.bulwark.burst > 0) live().slice(0, caught()).forEach((o) => { hit(o, TUNE.bulwark.burst); o.stun = Math.max(o.stun, TUNE.bulwark.burstStun); });
          if (shieldKind === 'ice' && TUNE.icebarrier.nova > 0 && !ranged) live().slice(0, caught()).forEach((o) => { hit(o, TUNE.frostnova.dmg); o.stun = Math.max(o.stun, TUNE.frostnova.freeze); });
          shieldKind = '';
        }
      }
      if (vigilUntil > t) d = Math.min(d, Math.max(0, hp - TUNE.vigil.floor));
      hp -= d;
      if (hp <= 0) return { dealt, secs: t, hpLeft: 0, won: false };
    }
    if (busy > 0) continue;

    // The rotation: elite when it's worth it, signature, sustain when hurt (or on cooldown for damage), then swing
    const use = (i: number): boolean => {
      if (cds[i] > 0) return false;
      const s = bar[i];
      if (!canPay(costs[i])) { if (shortAt !== t) { shortAt = t; dry += DT; } return false; }
      const furyK = id === 'reaver' && fury >= 100 && s.id !== 'redhour' && s.id !== 'bloodup' ? TUNE.fury.mult : 1;
      switch (s.id) {
        case 'bulwark': if (f.dummy || hp > 0.85) return false; shield = TUNE.bulwark.shield; shieldUntil = t + TUNE.bulwark.secs; shieldKind = 'bulwark'; break;
        case 'bash': if (ranged) return false; (TUNE.bash.cleave > 0 ? live().slice(0, caught()) : [tgt]).forEach((o) => { hit(o, TUNE.bash.dmg); o.stun = Math.max(o.stun, TUNE.bash.stun); }); break;
        case 'oath': if (ranged) return false; oathUntil = t + TUNE.oath.secs; oathTick = 0; break;
        case 'bleed': if (ranged) return false; hit(tgt, TUNE.bleed.dmg * furyK); heal(TUNE.bleed.cutHeal); tgt.bleed = TUNE.bleed.secs; tgt.bleedPer = TUNE.bleed.dot * furyK; break;
        case 'leap': aoe(caught(), TUNE.leap.dmg * furyK); if (TUNE.leap.stun) live().slice(0, caught()).forEach((o) => { o.stun = Math.max(o.stun, TUNE.leap.stun); }); break;
        case 'redhour': redUntil = t + TUNE.redhour.secs; break;
        case 'ward': if (!f.dummy && hp > 0.8) return false; wardUntil = t + TUNE.ward.secs; wardTick = 0; break;
        case 'bolt': {
          hit(tgt, TUNE.bolt.dmg * boltMult); boltMult = 1;
          if (++kindling >= TUNE.bolt.every) { kindling = 0; hit(tgt, TUNE.bolt.burst); aoe(caught(), 0); live().slice(1, caught()).forEach((e) => hit(e, TUNE.bolt.burst)); }
          break;
        }
        case 'starfall': pendingStar = TUNE.starfall.delay; break;
        case 'dressing': if (f.dummy || hp > 0.65) return false; heal(TUNE.dressing.heal); if (TUNE.dressing.hot) hotUntil = t + 5; break;
        case 'volley': for (let k = 0; k < TUNE.volley.arrows; k++) hit(tgt, TUNE.volley.dmg); live().slice(0, caught()).forEach((e) => { e.mark = t + TUNE.volley.mark; }); break;
        case 'shadowstep': if (ranged) return false; tgt.stun = Math.max(tgt.stun, TUNE.shadowstep.stun); stepUntil = t + TUNE.shadowstep.window; if (TUNE.quickstep.evade) evadeUntil = t + TUNE.quickstep.evade; break;
        case 'holdfast': if (f.dummy || hp > 0.9) return false; holdUntil = t + TUNE.holdfast.secs; break;
        case 'shieldthrow': live().slice(0, 1 + Math.min(TUNE.shieldthrow.bounce, caught() - 1)).forEach((o) => { hit(o, TUNE.shieldthrow.dmg); o.stun = Math.max(o.stun, TUNE.shieldthrow.stun); }); break;
        case 'challenge': if (f.dummy) return false; live().slice(0, caught()).forEach((o) => { o.weak = t + TUNE.challenge.secs; }); resolve = Math.min(TUNE.resolve.max, resolve + TUNE.challenge.resolve); resolveAt = t; break;
        case 'cover': if (f.dummy || hp > 0.9) return false; shield = TUNE.cover.self; shieldUntil = t + TUNE.cover.secs; shieldKind = 'cover'; break;
        case 'finisher': if (ranged) return false; hit(tgt, TUNE.finisher.dmg * (tgt.hp < tgt.max * TUNE.finisher.below ? TUNE.finisher.mult : 1) * furyK); if (tgt.hp <= 0) heal(TUNE.finisher.kill); break;
        // (Blood Up only when there's Fury to want and health to spare)
        case 'bloodup': if (fury >= 50 || hp < 0.5 || !payBlood(SKILL_COST.bloodup.n)) return false; fury = Math.min(100, fury + TUNE.bloodup.fury); bloodUpUntil = t + TUNE.bloodup.secs; break;
        // Kindler: a long burn (a bleed, as the game's dots are) and a burst round you that stuns
        case 'smoulder': tgt.bleed = TUNE.smoulder.secs; tgt.bleedPer = TUNE.smoulder.dot; break;
        case 'flashfire': if (ranged) return false; live().slice(0, caught()).forEach((o) => { hit(o, TUNE.flashfire.dmg); o.stun = Math.max(o.stun, TUNE.flashfire.stun); }); break;
        // Pathfinder: a heavy arrow (heavier on a marked foe), and smoke that weakens what's in it
        case 'heartshot': hit(tgt, TUNE.heartshot.dmg * (tgt.mark > t ? TUNE.heartshot.marked : 1)); break;
        case 'smoke': if (f.dummy) return false; live().slice(0, caught()).forEach((o) => { hit(o, TUNE.smoke.dmg); o.weak = t + TUNE.smoke.secs; o.mark = t + TUNE.smoke.secs; }); break;
        // Wizard: every Chill broken for a blow apiece; a Chill and a cold burn
        case 'shatter': { const c = live().filter((o) => o.chill > 0); if (!c.length) return false; c.forEach((o) => { hit(o, TUNE.shatter.dmg * o.chill); o.chill = 0; }); break; }
        case 'frostbite': chill(tgt); tgt.bleed = TUNE.frostbite.secs; tgt.bleedPer = TUNE.frostbite.dot; break;
        // Mender: a quick big heal (alone, your own share), and a heavy bolt that dazes
        case 'mercy': if (f.dummy || hp > 0.7) return false; heal(TUNE.mercy.heal * TUNE.mend.self); break;
        case 'judgement': hit(tgt, TUNE.judgement.dmg); tgt.stun = Math.max(tgt.stun, TUNE.judgement.stun); break;
        // Gravecaller: a spear through a line (two, in a pack), and everything near held and withered
        case 'bonespear': live().slice(0, Math.min(2, caught())).forEach((o) => hit(o, TUNE.bonespear.dmg)); break;
        case 'dread': if (ranged) return false; live().slice(0, caught()).forEach((o) => { hit(o, TUNE.dread.dmg); o.stun = Math.max(o.stun, TUNE.dread.stun); addWither(o, TUNE.dread.stacks); }); break;
        // The other elites
        case 'unbroken': if (f.dummy || hp > 0.6) return false; unbrokenUntil = t + TUNE.unbroken.secs; break;
        case 'massacre': if (ranged) return false; aoe(caught(), TUNE.massacre.dmg); massacreLeft = TUNE.massacre.hits - 1; massacreNext = t + TUNE.massacre.every; break;
        case 'pillar': zones.push({ until: t + TUNE.pillar.secs, per: TUNE.pillar.burn, tick: 0.2, fire: true }); break;
        case 'deadeye': deadeyeUntil = t + TUNE.deadeye.secs; break;
        case 'deepfreeze': live().slice(0, caught()).forEach((o) => { hit(o, TUNE.deepfreeze.dmg); o.stun = Math.max(o.stun, TUNE.deepfreeze.freeze); }); break;
        case 'vigil': if (f.dummy || hp > 0.6) return false; vigilUntil = t + TUNE.vigil.secs; break;
        case 'plague': live().slice(0, caught()).forEach((o) => { hit(o, TUNE.plague.dmg); addWither(o, TUNE.plague.stacks); }); break;
        // The Prowler
        case 'hound': houndUntil = t + TUNE.hound.secs; houndBite = 0.5; houndHp = TUNE.hound.hp; break;
        case 'slipaway': if (!f.dummy && hp > 0.7) return false; heal(TUNE.slipaway.heal); hiddenUntil = t + TUNE.slipaway.hide; fromHiding = TUNE.slipaway.mult; break;
        case 'twist': { if (ranged || openings < 3) return false; const n = openings; openings = 0; hit(tgt, TUNE.twist.dmg + TUNE.twist.per * n); break; }
        case 'thousand': if (ranged) return false; cutsLeft = TUNE.thousand.hits; cutsNext = t; break;
        case 'vanish': hiddenUntil = t + TUNE.vanish.hide; fromHiding = TUNE.slipaway.mult; break;
        case 'pocketsand': if (f.dummy || ranged) return false; live().slice(0, caught()).forEach((o) => { o.weak = t + TUNE.pocketsand.secs; o.stun = Math.max(o.stun, TUNE.pocketsand.stun); }); break;
        case 'caltrops': zones.push({ until: t + TUNE.caltrops.secs, per: TUNE.caltrops.dmg, tick: 0.2 }); break;
        case 'poisonblade': venom = Math.floor(TUNE.poisonblade.blows); break;
        case 'tumble': if (f.dummy || hp > 0.75) return false; evadeUntil = t + TUNE.tumble.evade; for (const e of L) e.hitIn += 1; break;
        case 'ambush': hiddenUntil = t + 0.5; fromHiding = TUNE.ambush.mult; hit(tgt, 1.2); break;
        case 'rally': if (f.dummy || hp > 0.8) return false; heal(TUNE.rally.heal); resolve = TUNE.resolve.max; resolveAt = t; break;
        case 'rend': if (ranged) return false; aoe(caught(), TUNE.rend.dmg * furyK); zones.push({ until: t + TUNE.rend.secs, per: TUNE.rend.dot, tick: 1 }); break;
        case 'rush': rushUntil = t + TUNE.rush.secs; break;
        case 'hamstring': if (ranged) return false; hit(tgt, TUNE.hamstring.dmg * furyK); tgt.stun = Math.max(tgt.stun, TUNE.hamstring.stun); break;
        case 'firewall': zones.push({ until: t + TUNE.firewall.secs, per: TUNE.firewall.burn, tick: 0.2, fire: true }); break;
        case 'cinderstep': if (f.dummy) return false; zones.push({ until: t + TUNE.cinderstep.secs, per: TUNE.cinderstep.burn, tick: 0.2, fire: true }); break;
        case 'kindle': kindling = Math.min(TUNE.bolt.every - 1, kindling + TUNE.kindle.stacks); boltMult = TUNE.kindle.mult; break;
        case 'snare': hit(tgt, TUNE.snare.dmg); tgt.stun = Math.max(tgt.stun, TUNE.snare.stun); break;
        case 'rain': zones.push({ until: t + TUNE.rain.secs, per: TUNE.rain.dmg, tick: 0.2, mark: TUNE.rain.mark > 0 }); break;
        case 'quickstep': stepUntil = t + TUNE.quickstep.window; if (TUNE.quickstep.evade && !f.dummy) evadeUntil = t + TUNE.quickstep.evade; break;
        case 'icebarrier': if (f.dummy || hp > 0.85) return false; shield = TUNE.icebarrier.shield; shieldUntil = t + TUNE.icebarrier.secs; shieldKind = 'ice'; break;
        case 'frostbolt': hit(tgt, TUNE.frostbolt.dmg); chill(tgt); break;
        case 'blizzard': zones.push({ until: t + TUNE.blizzard.secs, per: TUNE.blizzard.dmg, tick: 0.2, chill: true }); break;
        // Blink: a moment untouchable, and they have to come to you again
        case 'blink': if (f.dummy || hp > 0.7) return false; evadeUntil = t + TUNE.blink.evade; for (const e of L) e.hitIn += 1.5; break;
        case 'icelance': hit(tgt, TUNE.icelance.dmg * (tgt.stun > 0 ? TUNE.icelance.frozen : 1)); break;
        // Gravecaller: blood prices come out of Lifeblood first
        case 'siphon': { hit(tgt, TUNE.siphon.dmg); const room = 1 - hp; heal(TUNE.siphon.heal); if (TUNE.siphon.heal > room) addBlood((TUNE.siphon.heal - room) * TUNE.lifeblood.siphon); break; }
        case 'wither': hit(tgt, TUNE.wither.dmg); addWither(tgt, 1); break;
        case 'raise': if (!payBlood(SKILL_COST.raise.n)) return false; raisedUntil = t + TUNE.raise.secs; raiseTick = 0.6; break;
        case 'boneward': if (f.dummy || hp > 0.85 || !payBlood(SKILL_COST.boneward.n)) return false; shield = TUNE.boneward.shield; shieldUntil = t + TUNE.boneward.secs; shieldKind = 'bone'; break;
        case 'gravegrip': live().slice(0, Math.min(caught(), 3)).forEach((o) => { hit(o, TUNE.gravegrip.dmg); o.stun = Math.max(o.stun, TUNE.gravegrip.stun); }); break;
        case 'graverot': { if (caught() < 2 || hp < 0.35 || !payBlood(SKILL_COST.graverot.n)) return false; live().slice(0, caught()).forEach((o) => { hit(o, TUNE.graverot.dmg); addWither(o, TUNE.graverot.stacks); }); heal(TUNE.graverot.heal * caught()); break; }
        // Mender: alone, every heal is for yourself
        case 'mend': {
          if (f.dummy || hp > 0.7) return false;
          const full = grace >= TUNE.grace.max;
          heal(TUNE.mend.heal * TUNE.mend.self * (full ? TUNE.grace.mult : 1)); grace = full ? 0 : Math.min(TUNE.grace.max, grace + 2);
          break;
        }
        case 'lanternlight':
          hit(tgt, TUNE.lanternlight.dmg); if (TUNE.lanternlight.bounce && L[1]) hit(L[1], TUNE.lanternlight.dmg);
          heal(TUNE.lanternlight.heal);
          break;
        case 'sanctuary': sanctUntil = t + TUNE.sanctuary.secs; sanctTick = 0; break;
        case 'lampward': if (f.dummy || hp > 0.85) return false; shield = TUNE.lampward.shield; shieldUntil = t + TUNE.lampward.secs; shieldKind = 'lamp'; break;
        case 'rebuke': { if (ranged) return false; const n = caught(); live().slice(0, n).forEach((o) => { hit(o, TUNE.rebuke.dmg); o.stun = Math.max(o.stun, TUNE.rebuke.stun); }); heal(TUNE.rebuke.heal * n); break; }
        case 'restore': if (f.dummy || hp > 0.8) return false; restoreUntil = t + TUNE.restore.secs; grace = Math.min(TUNE.grace.max, grace + 1); break;
        case 'frostnova': if (ranged) return false; aoe(caught(), TUNE.frostnova.dmg); live().slice(0, caught()).forEach((e) => { e.stun = Math.max(e.stun, TUNE.frostnova.freeze); }); break;
      }
      if (furyK > 1) fury = 0;
      pay(costs[i]);
      cds[i] = s.cd * (TUNE.cd[s.id] ?? 1);
      busy = TUNE.skillLock;
      return true;
    };
    if (use(4) || use(3) || use(2) || use(1) || use(0)) continue;
    if (ranged) continue; // at range, only the ranged skills
    if (cleaveCd <= 0 && L.length > 1 && canPay(WEAPON_COST)) {
      pay(WEAPON_COST); aoe(Math.min(L.length, 4), CLEAVE.m); cleaveCd = CLEAVE.cd; busy = CLEAVE.d; chain = 0; continue;
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
const rangedCallings = new Set<CallingId>(['ashcaller', 'wizard', 'mender', 'gravecaller']);
const rows: Record<string, number[]> = {};
/** How long each calling had a skill ready and couldn't pay for it, seconds a minute of fighting. */
const dryRate: Record<string, number> = {};
for (const c of CALLINGS) {
  const cells: number[] = [];
  dry = 0;
  let fought = 0;
  for (const f of FIGHTS) {
    const modes = rangedCallings.has(c.id) && !f.dummy ? [false, true] : [false];
    let best = -Infinity;
    for (const ranged of modes) {
      let score = 0;
      for (let r = 0; r < RUNS; r++) {
        const res = run(c.id, f, ranged);
        fought += res.secs;
        // Dummies: damage a second. Real fights: health left at the end (a loss counts against you by how far the foe still had to go)
        if (f.dummy) score += res.dealt / res.secs;
        else score += res.won ? res.hpLeft : -(f.foes().reduce((s, e) => s + e.hp, 0) - res.dealt) / f.foes().reduce((s, e) => s + e.hp, 0);
      }
      best = Math.max(best, score / RUNS);
    }
    cells.push(best);
  }
  rows[c.id] = cells;
  dryRate[c.id] = dry / (fought / 60);
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
console.log('held back by an empty pool, seconds a minute: ' + CALLINGS.map((c) => `${c.name} ${dryRate[c.id].toFixed(1)}`).join(', '));

// Talent trees: each calling with each of its trees learned in full (every rank, capstone too) and
// the two utilities the tree wants, scored against the fifteen builds' average the same way. Every tree has to stay within 7% of it, and no tree may be
// best at everything.
const builds: { calling: CallingId; tree: string; cells: number[] }[] = [];
for (const c of CALLINGS) for (const tree of TREES[c.id]) {
  const T = tuned(fullTree(tree));
  const treeBar = barOf(c.id, tree.bar);
  const cells = FIGHTS.map((f) => {
    const modes = rangedCallings.has(c.id) && !f.dummy ? [false, true] : [false];
    let best = -Infinity;
    for (const ranged of modes) {
      let score = 0;
      for (let r = 0; r < RUNS; r++) {
        const res = run(c.id, f, ranged, T, treeBar);
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

// Utility bars: each calling with every pair of the utilities it can choose from (the signature is
// always there), against all the bars' average. None may be more than 10% off overall.
const bars: { calling: CallingId; name: string; cells: number[] }[] = [];
for (const c of CALLINGS) {
  const pool = c.utilities;
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) {
    const pick = [pool[a].id, pool[b].id];
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
    bars.push({ calling: c.id, name: pool[a].name + ' + ' + pool[b].name, cells });
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
// Morphs (data/skillpoints.ts): every calling skill at rank IV, then each morph of each skill in turn,
// played with that skill on the bar. A morph is a different lean, not an upgrade: each has to stay
// within 7% of the same calling at rank IV unmorphed, and a skill's two morphs within 8% of each other.
const score = (id: CallingId, T: Tune, bar: SkillDef[]) => {
  const cells = FIGHTS.map((f) => {
    const modes = rangedCallings.has(id) && !f.dummy ? [false, true] : [false];
    let best = -Infinity;
    for (const ranged of modes) {
      let sc = 0;
      for (let r = 0; r < RUNS; r++) {
        const res = run(id, f, ranged, T, bar);
        if (f.dummy) sc += res.dealt / res.secs;
        else sc += res.won ? res.hpLeft : -(f.foes().reduce((sum, e) => sum + e.hp, 0) - res.dealt) / f.foes().reduce((sum, e) => sum + e.hp, 0);
      }
      best = Math.max(best, sc / RUNS);
    }
    return best;
  });
  return cells;
};
const rel = (cells: number[], base: number[]) => cells.map((v, i) => FIGHTS[i].dummy ? v / base[i] : 1 + (v - base[i])).reduce((sum, v) => sum + v, 0) / FIGHTS.length;
console.log('\nmorphs, each against its calling at rank IV unmorphed');
let mbad = 0;
for (const c of CALLINGS) {
  const ids = [...c.skills, ...c.utilities].map((x) => x.id);
  const rankIV = () => { const T = tuned([]); for (const id of ids) applyRank(T, id, 4); return T; };
  for (const sk of [...c.skills, ...(c.elites ?? []), ...c.utilities]) {
    const pair = MORPHS[sk.id];
    if (!pair) continue;
    const others = c.utilities.filter((u) => u.id !== sk.id).map((u) => u.id);
    const bar = barOf(c.id, c.utilities.some((u) => u.id === sk.id) ? [sk.id, others[0]] : undefined, sk.id);
    const base = score(c.id, rankIV(), bar);
    const vals = pair.map((m) => { const T = rankIV(); m.mod(T); return rel(score(c.id, T, bar), base); });
    const line = pad(c.id + ' / ' + sk.name, 30) + pair.map((m, k) => pad(m.name + ' ' + vals[k].toFixed(3), 30)).join('');
    console.log(line);
    for (let k = 0; k < 2; k++) if (Math.abs(vals[k] - 1) > 0.07) { console.log(`  ${pair[k].name} is ${((vals[k] - 1) * 100).toFixed(0)}% off its calling`); mbad++; }
    if (Math.abs(vals[0] - vals[1]) > 0.08) { console.log(`  ${sk.name}'s morphs are ${(Math.abs(vals[0] - vals[1]) * 100).toFixed(0)}% apart`); mbad++; }
  }
}
console.log(mbad ? `${mbad} morph balance problem(s)` : 'Morphs balanced: every morph within 7% of its calling, and each pair within 8%');
// Elites (CallingDef.elites): each other elite on the bar instead of the calling's own, against the
// calling with its own. A different big moment, not a better one: within 7%.
console.log('\nelites, each against its calling with its own');
let ebad = 0;
for (const c of CALLINGS) {
  const base = score(c.id, BASE, barOf(c.id));
  for (const el of c.elites ?? []) {
    const v = rel(score(c.id, BASE, barOf(c.id, undefined, el.id)), base);
    console.log(pad(c.id + ' / ' + el.name, 30) + v.toFixed(3));
    if (Math.abs(v - 1) > 0.07) { console.log(`  ${el.name} is ${((v - 1) * 100).toFixed(0)}% off its calling`); ebad++; }
  }
}
console.log(ebad ? `${ebad} elite balance problem(s)` : 'Elites balanced: every elite within 7% of its calling\'s own');
process.exit(bad || tbad || bbad || mbad || ebad ? 1 : 0);
