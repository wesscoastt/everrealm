import { fitOut } from '../src/world/interiors';
for (const door of ['s', 'n'] as const) {
  const x0 = 858, z0 = door === 's' ? 491 : 509, w = 15, d = 11, base = 24;
  const doorX = x0 + Math.floor(w / 2), doorZ = door === 's' ? z0 + d - 1 : z0;
  const f = fitOut({ x0, z0, w, d, floors: 2, base, door, doorX, doorZ, role: 'vacant' } as any);
  for (const fl of [0, 1]) {
    console.log('door', door, 'floor', fl);
    const g: string[][] = Array.from({ length: d }, () => Array(w).fill('.'));
    for (const [x, y, z, k] of f.blocks) if (Math.floor((y - base) / 4) === fl || (k === 'air' && Math.floor((y + 1 - base) / 4) === fl)) g[z - z0][x - x0] = k === 'step' ? 'S' : k === 'air' ? 'o' : String(k)[0];
    for (const it of f.furn) if (Math.round((it.y - base) / 4) === fl) { const c = g[Math.floor(it.z) - z0]?.[Math.floor(it.x) - x0]; if (c !== undefined) g[Math.floor(it.z) - z0][Math.floor(it.x) - x0] = it.item[0].toUpperCase(); }
    g.forEach((r, i) => console.log(String(z0 + i), r.join('')));
  }
}
{
  const x0 = 858, z0 = 491, w = 15, d = 11, base = 24;
  const f = fitOut({ x0, z0, w, d, floors: 2, base, door: 's', doorX: x0 + 7, doorZ: z0 + 10, role: 'vacant' } as any);
  const kinds = new Map<string, number>();
  for (const b of f.blocks) kinds.set(String(b[3]), (kinds.get(String(b[3])) ?? 0) + 1);
  console.log([...kinds]);
  console.log('steps', f.blocks.filter((b) => b[3] === 'step').map((b) => `${b[0] - x0},${b[1] - base},${b[2] - z0}`).join(' '));
  console.log('furn', f.furn.map((i) => `${i.item}@${i.x - x0},${i.y - base},${i.z - z0}`).join(' '));
}
