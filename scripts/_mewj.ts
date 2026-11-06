import { mewJetty, plan } from '../src/world/sites';
import { heightAt, SEA } from '../src/world/terrain';
plan();
const J = mewJetty();
console.log('jetty', J, 'SEA', SEA);
for (let z = J.z - 8; z <= J.z + 10; z++) { let r = String(z).padStart(5) + ' '; for (let x = J.x1 - 2; x <= J.x0 + 14; x++) { const h = heightAt(x, z); r += h < SEA ? '~' : String(Math.min(9, h - SEA)); } console.log(r); }
