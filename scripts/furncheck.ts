// Checks that no two pieces of furniture in any interior overlap (rugs and lamps aside).
import './canvas-stub.mjs';
import * as THREE from 'three';
import { plan } from '../src/world/sites';
import { createPropMaterials, furniture } from '../src/world/props';
const M = createPropMaterials();
const size: Record<string, [number, number]> = {};
for (const k of ['bed','table','stool','dresser','hearth','rug','chest','barrel','crate','counter','shelves','lamp','bench','desk','doorOpen','chair']) {
  const g = furniture(M, k)!; const b = new THREE.Box3().setFromObject(g); size[k] = [b.max.x - b.min.x, b.max.z - b.min.z];
}

const p = plan();
let n = 0;
const fp = (d: any) => { const [w, l] = size[d.item]; const r = d.ry ?? 0; const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return [ (w*c + l*s)/2, (w*s + l*c)/2 ]; };
for (const s of p.sites) {
  const f = s.props.filter((d: any) => d.t === 'furn' && size[d.item] && d.item !== 'rug' && d.item !== 'lamp');
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
    const a: any = f[i], b: any = f[j];
    if (Math.abs(a.y - b.y) > 1) continue;
    const [ax, az] = fp(a), [bx, bz] = fp(b);
    const ox = ax + bx - Math.abs(a.x - b.x), oz = az + bz - Math.abs(a.z - b.z);
    if (ox > 0.08 && oz > 0.08) { n++; if (n < 30) console.log(s.id, a.item, b.item, a.x.toFixed(1), a.z.toFixed(1), ox.toFixed(2), oz.toFixed(2)); }
  }
}
console.log(n ? `${n} overlapping pair(s).` : 'No furniture overlaps.');
if (n) process.exit(1);
