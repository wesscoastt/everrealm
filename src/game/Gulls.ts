import * as THREE from 'three';
import type { PerchedGull } from '../world/siteProps';

// The perched gulls (bollards, rigging, roofs, lighthouse galleries) as live birds. Sitting, each one
// looks about in its own time, preens now and then, shakes out its wings, and bobs as it settles. Walk
// up to one and it lifts off, wings beating, climbs, circles wide over the water or the street for a
// while, and glides back down to the same perch. All of it is worked out from the clock and the gull's
// own seed, so nothing is kept between frames but the flight it's on.

/** A gull's flight: when it lifted off, and the circle it's flying. */
interface Flight { t0: number; cx: number; cz: number; r: number; dir: number; dur: number; alt: number }
const flights = new WeakMap<PerchedGull, Flight>();
/** When a gull last came down (it sits a while before it'll spook again). */
const landed = new WeakMap<PerchedGull, number>();

const FLUSH = 3.2;  // how close you can come before it goes
const TAKEOFF = 0.9, LAND = 1.4;

const hash = (s: number, k: number) => { const v = Math.sin(s * 9301 + k * 49.297) * 43758.5453; return v - Math.floor(v); };

export function animateGull(g: PerchedGull, t: number, _dt: number, player: THREE.Vector3): void {
  const { rig, perch, seed } = g;
  let f = flights.get(g);
  const d = Math.hypot(player.x - perch.x, player.z - perch.z), dy = Math.abs(player.y - perch.y);
  if (!f && d < FLUSH && dy < 4 && t - (landed.get(g) ?? -99) > 4) {
    // Off: away from you, out over a circle of its own
    const away = Math.atan2(perch.x - player.x, perch.z - player.z) + (hash(seed, t) - 0.5) * 0.8;
    const r = 5 + hash(seed, 2) * 6;
    f = { t0: t, cx: perch.x + Math.sin(away) * r, cz: perch.z + Math.cos(away) * r, r, dir: hash(seed, 3) < 0.5 ? 1 : -1, dur: 9 + hash(seed, 4) * 8, alt: 4 + hash(seed, 5) * 4 };
    flights.set(g, f);
  }
  if (f) {
    const k = t - f.t0;
    if (k >= f.dur) { flights.delete(g); landed.set(g, t); f = undefined; }
    else {
      // Round the circle, starting from the point nearest the perch; up off it, and back down to it at the end
      const start = Math.atan2(perch.x - f.cx, perch.z - f.cz);
      const a = start + f.dir * (k / f.dur) * Math.PI * 2 * (f.dur / 8);
      const ox = f.cx + Math.sin(a) * f.r, oz = f.cz + Math.cos(a) * f.r;
      const up = Math.min(1, k / TAKEOFF), down = Math.min(1, (f.dur - k) / LAND);
      const blend = Math.min(up, down);                                     // 0 on the perch, 1 out on the circle
      const x = perch.x + (ox - perch.x) * blend, z = perch.z + (oz - perch.z) * blend;
      const y = perch.y + f.alt * Math.sin(Math.min(1, blend) * Math.PI / 2) + Math.sin(k * 1.3 + seed * 7) * 0.3 * blend;
      rig.root.position.set(x, y, z);
      // Facing along the way it's going, banked into the turn
      const heading = a + f.dir * Math.PI / 2;
      rig.root.rotation.set(0, blend > 0.95 ? heading : g.ry + (heading - g.ry) * blend, 0);
      rig.body.rotation.z = -f.dir * 0.35 * blend;
      rig.body.rotation.x = up < 1 ? -0.4 * (1 - up) : down < 1 ? 0.3 * (1 - down) : 0;
      // Wings: beating hard off the perch and onto it, gliding with a lazy beat between
      const hard = up < 1 || down < 1;
      const beat = hard ? Math.sin(k * 22) * 0.9 : Math.sin(k * 7) * 0.25 + 0.1;
      rig.wl.rotation.z = 1.35 + beat; rig.wr.rotation.z = -1.35 - beat;
      rig.head.rotation.set(0, 0, 0);
      return;
    }
  }
  // Sitting: back on the perch, facing the way it sat
  rig.root.position.copy(perch);
  rig.root.rotation.set(0, g.ry, 0);
  rig.body.rotation.set(0, 0, 0);
  // Every few seconds something: a look round, a preen, a stretch of the wings, a call (head up, beak up)
  const slot = Math.floor((t + seed * 50) / 3.2), w = (t + seed * 50) / 3.2 - slot;
  const what = hash(seed, slot);
  const ease = Math.sin(Math.min(1, w * 2.2) * Math.PI);                     // in and back out, within the slot
  rig.head.rotation.set(0, 0, 0);
  rig.wl.rotation.z = 0; rig.wr.rotation.z = 0;
  if (what < 0.45) rig.head.rotation.y = (hash(seed, slot + 1) - 0.5) * 2.2 * ease;               // looks about
  else if (what < 0.6) { rig.head.rotation.set(0.9 * ease, (hash(seed, slot + 2) < 0.5 ? 1 : -1) * 1.6 * ease, 0); } // preens under a wing
  else if (what < 0.7) { rig.wl.rotation.z = 1.2 * ease; rig.wr.rotation.z = -1.2 * ease; rig.body.position.y = 0.04 * ease; } // stretches its wings
  else if (what < 0.78) rig.head.rotation.x = -0.9 * ease;                                         // calls, beak to the sky
  rig.body.position.y = what >= 0.6 && what < 0.7 ? 0.04 * ease : Math.sin(t * 1.7 + seed * 11) * 0.008; // settles, breathes
}
