import { plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const P = plan() as any;
const box = [830, 482, 1020, 580];
for (const s of P.sites) {
  const hit = (s.rects ?? []).filter((r: number[]) => r[2] > box[0] && r[0] < box[2] && r[3] > box[1] && r[1] < box[3]);
  if (hit.length) console.log(s.id, s.name, Math.round(s.x), Math.round(s.z), hit.length, JSON.stringify(hit.slice(0, 8)));
}
for (let z = box[1]; z <= box[3]; z += 6) {
  let row = String(z).padStart(4) + ' ';
  for (let x = box[0]; x <= box[2]; x += 6) row += String(Math.round(heightAt(x, z))).padStart(3);
  console.log(row);
}
