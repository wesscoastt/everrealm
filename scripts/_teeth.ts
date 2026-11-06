import { landDist, baseHeight, SEA } from '../src/world/terrain';
const OX = 6400;
for (let z = 3480; z <= 4060; z += 20) { let r = ''; for (let x = -2250; x <= -1400; x += 15) { const d = landDist(x + OX, z); r += d > 0 ? (baseHeight(x + OX, z) > SEA + 8 ? '^' : '#') : d > -30 ? '+' : '.'; } console.log(String(z).padStart(5), r); }
console.log('local x from -2250 step 15 (world +6400)');
