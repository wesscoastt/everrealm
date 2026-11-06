import { ITEMS } from '../src/data/items';
// The same rules as ui/icons.ts refine(), read from the source so this stays honest
import { readFileSync } from 'fs';
const src = readFileSync('src/ui/icons.ts', 'utf8');
let body = src.slice(src.indexOf('const BETTER'), src.indexOf('export function itemIcon'));
body = body.replace(/const BETTER: [^=]*= \[/, 'const BETTER = [').replace(/new Set<[^>]*>/, 'new Set').replace(/function refine\([^)]*\): IconSpec/, 'function refine(def)');
const fn = new Function(body + '; return refine;')();
const moved = new Map<string, string[]>();
for (const d of Object.values(ITEMS)) { const r = fn(d); if (r.shape !== d.icon.shape) (moved.get(r.shape) ?? moved.set(r.shape, []).get(r.shape)!).push(d.name); }
for (const [k, v] of moved) console.log(String(v.length).padStart(3), k.padEnd(8), v.slice(0, 10).join("; "));
const one: string[] = []; const seenS = new Set<string>();
for (const d of Object.values(ITEMS)) { const r = fn(d); if (r.shape !== d.icon.shape && !seenS.has(r.shape)) { seenS.add(r.shape); one.push(d.id); } }
console.log(JSON.stringify(one));
