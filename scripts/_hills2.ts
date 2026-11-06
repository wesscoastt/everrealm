import { heightAt, regionAt, SEA } from '../src/world/terrain';
import { plan } from '../src/world/sites';
const P = plan() as any;
const [cx, cz, R, step] = process.argv.slice(2).map(Number);
for (let z = cz - R; z <= cz + R; z += step) {
  let row = '';
  for (let x = cx - R; x <= cx + R; x += step) { const h = Math.round(heightAt(x, z) - SEA); row += h < 0 ? ' ~~' : String(h).padStart(3); }
  console.log(String(z).padStart(6), row);
}
const regs = new Set<string>();
for (let z = cz - R; z <= cz + R; z += step * 2) for (let x = cx - R; x <= cx + R; x += step * 2) regs.add(regionAt(x, z).a);
console.log('regions', [...regs].join(' '));
for (const s of P.sites) if (Math.hypot(s.x - cx, s.z - cz) < R * 1.6) console.log('site', s.id, Math.round(s.x), Math.round(s.z), s.r);
