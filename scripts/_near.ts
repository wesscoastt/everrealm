import { WORLD_ROADS } from '../src/world/terrain';
for (const [x, z] of [[1092, 1009], [1742, 491]]) {
  let best = [Infinity, 0, 0];
  for (const r of WORLD_ROADS as number[][][]) for (let k = 0; k + 1 < r.length; k++) { const [ax, az] = r[k], [bx, bz] = r[k + 1], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - x, pz - z); if (d < best[0]) best = [d, px, pz]; }
  console.log(x, z, 'nearest road', best.map(Math.round));
}
