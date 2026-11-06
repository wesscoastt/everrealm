import { landDist, baseHeight, SEA } from '../src/world/terrain';
for (let z = -2250; z <= -950; z += 40) { let r = ''; for (let x = 2300; x <= 3700; x += 25) { const d = landDist(x, z); r += d > 0 ? (baseHeight(x, z) > SEA + 30 ? '^' : '#') : d > -40 ? '+' : '.'; } console.log(String(z).padStart(6), r); }
console.log('x from 2300 step 25; ^ above SEA+30');
