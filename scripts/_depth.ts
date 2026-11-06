import { heightAt, SEA } from '../src/world/terrain';
const [x, z0, z1] = process.argv.slice(2).map(Number);
const row: string[] = [];
for (let z = z0; z <= z1; z += 2) row.push(`${z}:${heightAt(x, z).toFixed(0)}`);
console.log('SEA', SEA, row.join(' '));
