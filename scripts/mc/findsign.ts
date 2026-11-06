// Signs anywhere in a Bedrock world whose words match a pattern: where they stand and what they say.
// npx tsx scripts/mc/findsign.ts <db> <pattern>
import { readDb } from './leveldb';
import { NbtReader, type Nbt } from './bedrock';
const [dir, pat] = process.argv.slice(2);
const re = new RegExp(pat, 'i');
const ents = readDb(dir, (k) => k.length === 9 && k[8] === 0x31);
for (const [, e] of ents) {
  if (!e.value || !re.test(e.value.toString('latin1'))) continue;
  const r = new NbtReader(e.value);
  while (r.p < e.value.length) {
    let t: Record<string, Nbt>;
    try { t = r.read() as Record<string, Nbt>; } catch { break; }
    const front = (t.FrontText as Record<string, Nbt> | undefined)?.Text ?? t.Text ?? '';
    const back = (t.BackText as Record<string, Nbt> | undefined)?.Text ?? '';
    const text = `${String(front)} ${String(back)}`.replace(/§./g, '');
    if (re.test(text)) console.log(t.x, t.y, t.z, String(t.id), '|', text.replace(/\n/g, ' / ').trim());
  }
}
