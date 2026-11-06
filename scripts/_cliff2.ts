import { heightAt } from '../src/world/terrain';
const xs = process.argv.slice(2).map(Number);
const edgeAt = (x: number) => { for (let z = 700; z < 900; z++) if (heightAt(x, z) - heightAt(x, z + 2) > 8) return z; return -1; };
for (const cx of xs) {
  let emin = 9999, emax = 0; const hs: number[] = [];
  for (let x = cx - 9; x <= cx + 9; x++) { const e = edgeAt(x); emin = Math.min(emin, e); emax = Math.max(emax, e); for (let z = e - 22; z < e - 1; z += 3) hs.push(heightAt(x, z)); }
  const foot: number[] = []; for (let x = cx - 9; x <= cx + 9; x += 3) foot.push(heightAt(x, emax + 6));
  console.log(cx, 'edge', emin, '..', emax, 'top', Math.min(...hs), '..', Math.max(...hs), 'foot', Math.min(...foot), '..', Math.max(...foot));
}
