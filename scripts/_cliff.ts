import { heightAt, SEA } from '../src/world/terrain';
const [x0, x1, step] = process.argv.slice(2).map(Number);
for (let x = x0; x <= x1; x += step) {
  let edge = -1, top = 0, foot = 0;
  for (let z = 700; z < 900; z++) { const a = heightAt(x, z), b = heightAt(x, z + 2); if (a - b > 8) { edge = z; top = a; foot = heightAt(x, z + 6); break; } }
  console.log(x, 'edge z', edge, 'top', Math.round(top - SEA), 'foot', Math.round(foot - SEA), 'h@-20', Math.round(heightAt(x, edge - 20) - SEA), 'h@-40', Math.round(heightAt(x, edge - 40) - SEA));
}
