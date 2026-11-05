// npm run -s docksteps: every place a deck by the water (a jetty, a pier, a quay's boards, a landing) still
// meets dry ground two or more blocks above it, with nothing to step up on. A player steps up one block on
// foot (entities/Player.ts), so a rise of two from a dock to the land is a wall (owner 2026-11-04). The
// plan lays steps at every one it can (world/sites.ts dockSteps); this lists any left, by place, and exits
// non-zero while there are.
import { dockRises, plan } from '../src/world/sites';

const p = plan();
// Known and meant: the Gannet's Wreck is broken boards at all heights, there to be scrambled over
const MEANT = new Set(["The Gannet's Wreck"]);
const nameNear = (x: number, z: number) => { let best = '', bd = Infinity; for (const st of p.sites) { const d = Math.hypot(st.x - x, st.z - z); if (d < bd && d < 260) { bd = d; best = st.name || st.id; } } return best || '(the wild)'; };
const left = dockRises(p.overrides).filter((f) => !MEANT.has(nameNear(f.x, f.z)));
const bySite = new Map<string, typeof left>();
for (const f of left) {
  let best = '', bd = Infinity;
  for (const st of p.sites) { const d = Math.hypot(st.x - f.x, st.z - f.z); if (d < bd && d < 260) { bd = d; best = st.name || st.id; } }
  bySite.set(best || '(the wild)', [...(bySite.get(best || '(the wild)') ?? []), f]);
}
for (const [site, list] of [...bySite].sort((a, b) => b[1].length - a[1].length)) console.log(`${site.padEnd(28)} ${String(list.length).padStart(3)}  e.g. ${list.slice(0, 3).map((f) => `${f.x},${f.z} (+${f.n - f.s})`).join('  ')}`);
console.log(left.length ? `${left.length} places where a deck still meets ground two or more blocks above it.` : 'Every deck by the water can be walked off onto the land.');
process.exit(left.length ? 1 : 0);
