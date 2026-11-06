import { landDist } from '../src/world/terrain';
import { CALLIS_PACKET } from '../src/world/morrow';
import { WMIN, WMAX_X, WMAX } from '../src/world/VoxelWorld';
const G = 24, CLEAR = -40;
const A = [1822 + 220, 590.5], Z = [CALLIS_PACKET.x + 12 + 220, CALLIS_PACKET.z];
console.log('from', A, 'to', Z);
const nx = Math.ceil((WMAX_X - WMIN) / G), nz = Math.ceil((WMAX - WMIN) / G);
const ok = new Uint8Array(nx * nz);
for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) ok[j * nx + i] = landDist(WMIN + (i + 0.5) * G, WMIN + (j + 0.5) * G) < CLEAR ? 1 : 0;
const cell = (p: number[]) => [Math.floor((p[0] - WMIN) / G), Math.floor((p[1] - WMIN) / G)];
const [si, sj] = cell(A), [ti, tj] = cell(Z);
console.log('start ok', ok[sj * nx + si], 'goal ok', ok[tj * nx + ti]);
ok[sj * nx + si] = ok[tj * nx + ti] = 1;
const best = new Float64Array(nx * nz).fill(Infinity), from = new Int32Array(nx * nz).fill(-1);
const heap: [number, number][] = [];
const push = (f: number, k: number) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
const s = sj * nx + si, t = tj * nx + ti; best[s] = 0; push(0, s);
while (heap.length) { const k = pop(); if (k === t) break; const i = k % nx, j = (k / nx) | 0;
  for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const n = b * nx + a; if (!ok[n]) continue; if (di && dj && (!ok[j * nx + a] || !ok[b * nx + i])) continue;
    const c = best[k] + (di && dj ? 1.414 : 1); if (c < best[n]) { best[n] = c; from[n] = k; push(c + Math.hypot(a - ti, b - tj), n); } } }
if (best[t] === Infinity) { console.log('no way'); process.exit(); }
const cells: number[][] = []; for (let k = t; k >= 0; k = from[k]) cells.push([WMIN + ((k % nx) + 0.5) * G, WMIN + (((k / nx) | 0) + 0.5) * G]); cells.reverse();
cells[0] = A; cells[cells.length - 1] = Z;
const clear = (a: number[], b: number[]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d <= L; d += 6) if (landDist(a[0] + ((b[0] - a[0]) * d) / L, a[1] + ((b[1] - a[1]) * d) / L) > CLEAR + 10) return false; return true; };
const out = [A]; let at = 0;
while (at < cells.length - 1) { let j = cells.length - 1; while (j > at + 1 && !clear(cells[at], cells[j])) j--; out.push(cells[j]); at = j; }
let L = 0; for (let i = 1; i < out.length; i++) L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
console.log(JSON.stringify(out.slice(1, -1).map((p) => p.map(Math.round))), 'length', Math.round(L), 'secs at 40:', Math.round(L / 40));
