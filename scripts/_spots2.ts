// Beach spots near Conch Key (just above the sea), and Kell's Works gate
import { TOWNS } from '../src/world/morrow';
import { heightAt, SEA } from '../src/world/terrain';
import { GATE, BRASSWICK } from '../src/data/kell';
const c = (TOWNS as Record<string, { x: number; z: number }>).conch;
const out: string[] = [];
for (let r = 8; r <= 90; r += 3) for (let a = 0; a < 16; a++) {
  const x = Math.round(c.x + Math.cos(a / 16 * Math.PI * 2) * r), z = Math.round(c.z + Math.sin(a / 16 * Math.PI * 2) * r), h = heightAt(x, z);
  if (h > SEA && h <= SEA + 1.2 && r > 20) out.push(`${x - c.x},${z - c.z}:${h.toFixed(1)}`);
}
console.log('SEA', SEA, 'conch', c.x, c.z, 'beach', out.slice(0, 40).join(' '));
console.log('GATE', JSON.stringify(GATE), 'BRASSWICK', JSON.stringify(BRASSWICK));
