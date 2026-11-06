import { morrowLandDist } from '../src/world/morrowLocal';
for (const z of [-2290, -2250, -2200, -2100, -2000, 3500, 3700, 3900, 4000, 4080]) {
  let land = 0, minD = 1e9;
  for (let x = -2300; x <= 4090; x += 10) { const d = morrowLandDist(x, z); if (d > 0) land++; minD = Math.min(minD, -d); }
  console.log('z', z, 'land cells', land, 'closest to land', minD.toFixed(0));
}
for (const x of [-2290, -2200, 2600, 2800, 3200, 4000]) {
  let land = 0;
  for (let z = -2300; z <= 4090; z += 10) if (morrowLandDist(x, z) > 0) land++;
  console.log('x', x, 'land cells', land);
}
