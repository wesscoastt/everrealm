// Builds a review page for one region's side quests from the quest walker's report.
//   npm run quests && node scripts/questbook.mjs greenwake
// Writes artifacts/<region>-quest-book.html. Everything on the page comes from the game's own data,
// as the walker played it: journal entries at each stage, each ending's final entry, and the lines
// spoken along the way.

import fs from 'node:fs';

const region = process.argv[2] ?? 'greenwake';
const report = JSON.parse(fs.readFileSync('.walker/report.json', 'utf8'));
const quests = report.reports.filter((q) => q.region === region);
if (!quests.length) { console.error(`No quests for region "${region}" in the report.`); process.exit(1); }

const REGION_NAME = { greenwake: 'Hollindale', crownroad: 'Turnpike', brambledeep: 'Hagworm Wood', saltwind: 'Fleet Coast', redstone: 'Raddle Barrens', starfall: 'Scarth Highlands' }[region] ?? region;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const para = (s) => esc(s).split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
const DEPTH = { storyline: 'Storyline', quest: 'Quest', short: 'Short job' };

// Content-specific lines only: the region's own people (declared in src/data/content/<region>/people.ts),
// its notice boards, and nodes its hooks add to everyone else, which carry the region's prefix (gw*, cr*).
const PREFIX = { greenwake: 'gw', crownroad: 'cr' }[region] ?? region.slice(0, 2);
const peopleFile = `src/data/content/${region}/people.ts`;
const OWN = new Set(fs.existsSync(peopleFile) ? [...fs.readFileSync(peopleFile, 'utf8').matchAll(/\bid: '(\w+)'/g)].map((m) => m[1]) : []);
const NEW_TREES = new Set(quests.flatMap((q) => q.lines.map((l) => l.tree)).filter((t) => OWN.has(t) || t.startsWith('board:')));
// Another region's hooks into one of our people (Turnpike's cr* nodes on Bess, say) belong to that region's book.
const foreign = (node) => /^[a-z]{2}[A-Z0-9]/.test(node) && !node.startsWith(PREFIX) && ['gw', 'cr', 'br', 'sa', 're', 'st'].includes(node.slice(0, 2));
const isNew = (l) => l.node.startsWith(PREFIX) || (NEW_TREES.has(l.tree) && !foreign(l.node));

// Storylines: chains of quests, shown as one block with parts in order.
const byId = new Map(quests.map((q) => [q.id, q]));
const chains = [];
const placed = new Set();
for (const q of quests) {
  if (placed.has(q.id) || q.follows) continue;
  const chain = [q];
  placed.add(q.id);
  let n = q.next;
  while (n && byId.has(n)) { chain.push(byId.get(n)); placed.add(n); n = byId.get(n).next; }
  chains.push(chain);
}
const order = { storyline: 0, quest: 1, short: 2 };
chains.sort((a, b) => order[a[0].depth] - order[b[0].depth]);

const counts = {
  total: quests.length,
  storylines: chains.filter((c) => c[0].depth === 'storyline').length,
  storylineParts: quests.filter((q) => q.depth === 'storyline').length,
  quest: quests.filter((q) => q.depth === 'quest').length,
  short: quests.filter((q) => q.depth === 'short').length,
  endings: quests.reduce((n, q) => n + q.endings.length, 0),
  choices: quests.filter((q) => q.endings.length > 1).length,
  people: [...NEW_TREES].filter((t) => !t.startsWith('board:')).length,
  lines: quests.reduce((n, q) => n + q.lines.filter(isNew).length, 0),
};
const regionErrors = report.errors.filter((e) => quests.some((q) => e.includes(q.id)));

function choiceLabel(sig) {
  if (sig === '(single ending)') return '';
  return sig.split(', ').map((kv) => kv.split('=')[1]).join(' · ');
}

function questHtml(q, part) {
  const first = q.journal[0];
  const lines = q.lines.filter(isNew).sort((a, b) => (a.tree === b.tree ? a.order - b.order : 0));
  const byWho = new Map();
  for (const l of lines) { if (!byWho.has(l.who)) byWho.set(l.who, []); byWho.get(l.who).push(l); }
  const giver = q.givers.length ? `Given by ${esc(q.givers.join(' or '))}` : q.follows ? `Follows ${esc(byId.get(q.follows)?.name ?? q.follows)}` : 'Found by exploring';
  return `
  <article class="quest" id="${q.id}" data-depth="${q.depth}" data-choice="${q.endings.length > 1}">
    <header>
      ${part ? `<div class="part">Part ${part}</div>` : ''}
      <h3>${esc(q.name)}</h3>
      <div class="meta"><span class="chip ${q.depth}">${DEPTH[q.depth] ?? q.depth}</span><span>${giver}</span><span>${q.endings.length} ending${q.endings.length === 1 ? '' : 's'}</span></div>
    </header>
    ${first ? `<div class="lede">${para(first.notes)}</div>` : ''}
    <section class="steps">
      <h4>How it plays</h4>
      <ol>${q.journal.map((j) => `<li><div class="obj">${j.objectives.map(esc).join('<br>') || '<em>Talk it through</em>'}</div><div class="note">${para(j.notes)}</div></li>`).join('')}</ol>
    </section>
    <section class="endings">
      <h4>${q.endings.length > 1 ? 'Endings' : 'Ending'}</h4>
      ${q.endings.map((e) => `<div class="ending">${choiceLabel(e.signature) ? `<div class="sig">${esc(choiceLabel(e.signature))}</div>` : ''}${para(e.notes)}</div>`).join('')}
    </section>
    <details class="dialogue">
      <summary>Read the dialogue (${lines.length} lines)</summary>
      ${[...byWho].map(([who, ls]) => `<div class="speaker"><h5>${esc(who)}</h5>${ls.map((l) => `<div class="line ${l.speaker === 'narrator' ? 'narr' : ''}">${para(l.text)}${l.options.length ? `<ul class="opts">${l.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div>`).join('')}
    </details>
  </article>`;
}

const index = chains.map((c) => `<li><a href="#${c[0].id}">${esc(c.length > 1 ? c.map((q) => q.name).join(' → ') : c[0].name)}</a> <span class="ix-depth">${DEPTH[c[0].depth]}</span></li>`).join('');
const body = chains.map((c) => (c.length > 1
  ? `<section class="chain" data-depth="storyline"><div class="chain-head"><span class="chip storyline">Storyline</span><span>${c.length} parts</span></div>${c.map((q, i) => questHtml(q, i + 1)).join('')}</section>`
  : questHtml(c[0]))).join('');

const html = `<title>${esc(REGION_NAME)} Quest Book</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=Alegreya:ital,wght@0,400;0,600;1,400&family=Alegreya+Sans:wght@500;700&display=swap">
<style>
/* Layout: one reading column, like a page of the in-game journal; a slim index and filter bar above it. */
:root {
  --paper: #eef0e6; --leaf: #e2e7d8; --ink: #1d2620; --muted: #5a6658; --rule: #c9d0bd;
  --moss: #2f4a3a; --wheat: #a8862e; --slate: #3c5a7a; --clay: #8a4a2a;
  --display: 'Pixelify Sans', 'Courier New', monospace; --body: 'Alegreya', Georgia, serif; --ui: 'Alegreya Sans', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #141a16; --leaf: #1c241e; --ink: #e2e6da; --muted: #9aa695; --rule: #2e3a30; --moss: #8ec49c; --wheat: #d8b45a; --slate: #8fb4d8; --clay: #e09a72; color-scheme: dark; } }
:root[data-theme="dark"] { --paper: #141a16; --leaf: #1c241e; --ink: #e2e6da; --muted: #9aa695; --rule: #2e3a30; --moss: #8ec49c; --wheat: #d8b45a; --slate: #8fb4d8; --clay: #e09a72; color-scheme: dark; }
body { background: var(--paper); color: var(--ink); font: 17px/1.55 var(--body); }
.wrap { max-width: 46rem; margin: 0 auto; padding-block: 2.5rem 4rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 2rem; }
.eyebrow { font: 700 0.78rem var(--ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--wheat); }
h1 { font: 700 2.6rem/1.05 var(--display); color: var(--moss); margin: 0.3rem 0 0.8rem; text-wrap: balance; }
h1 + p { margin: 0; color: var(--muted); }
.tally { display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem; font: 500 0.95rem var(--ui); color: var(--muted); font-variant-numeric: tabular-nums; }
.tally b { color: var(--ink); font-weight: 700; }
.verdict { font: 500 0.95rem var(--ui); padding: 0.7rem 0.9rem; background: var(--leaf); border-radius: 6px; }
.verdict b { color: var(--moss); }
nav ol { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.25rem; font: 500 0.98rem var(--ui); }
nav a { color: var(--slate); text-decoration: none; }
nav a:hover, nav a:focus-visible { text-decoration: underline; }
.ix-depth { color: var(--muted); font-size: 0.82rem; }
.filters { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; position: sticky; top: env(safe-area-inset-top, 0px); background: var(--paper); padding-block: 0.6rem; z-index: 2; border-bottom: 1px solid var(--rule); }
.filters button { font: 700 0.85rem var(--ui); color: var(--ink); background: transparent; border: 1px solid var(--rule); border-radius: 999px; padding: 0.3rem 0.8rem; cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--moss); color: var(--paper); border-color: var(--moss); }
.filters input { flex: 1 1 10rem; min-width: 0; font: 500 0.95rem var(--ui); color: var(--ink); background: var(--leaf); border: 1px solid var(--rule); border-radius: 6px; padding: 0.4rem 0.6rem; }
:focus-visible { outline: 2px solid var(--wheat); outline-offset: 2px; }
.chain { display: grid; gap: 1.6rem; padding-top: 0.6rem; border-top: 3px double var(--rule); }
.chain-head { display: flex; gap: 0.8rem; align-items: center; font: 500 0.9rem var(--ui); color: var(--muted); }
.quest { display: grid; gap: 1rem; padding-top: 1.4rem; border-top: 1px solid var(--rule); min-width: 0; }
.chain .quest:first-of-type { border-top: 0; padding-top: 0; }
.part { font: 700 0.75rem var(--ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--wheat); }
h3 { font: 700 1.6rem/1.15 var(--display); color: var(--moss); margin: 0.1rem 0 0.4rem; text-wrap: balance; }
.meta { display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; font: 500 0.88rem var(--ui); color: var(--muted); align-items: center; }
.chip { font: 700 0.72rem var(--ui); letter-spacing: 0.08em; text-transform: uppercase; padding: 0.15rem 0.55rem; border-radius: 4px; border: 1px solid currentColor; }
.chip.storyline { color: var(--clay); } .chip.quest { color: var(--slate); } .chip.short { color: var(--moss); }
.lede p { margin: 0 0 0.6rem; font-size: 1.05rem; }
h4 { font: 700 0.8rem var(--ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 0 0 0.5rem; }
.steps ol { margin: 0; padding-left: 1.4rem; display: grid; gap: 0.8rem; }
.steps .obj { font: 700 0.95rem var(--ui); color: var(--slate); }
.steps .note p { margin: 0.2rem 0 0; color: var(--muted); font-size: 0.97rem; }
.endings { display: grid; gap: 0.6rem; }
.ending { background: var(--leaf); border-radius: 6px; padding: 0.7rem 0.9rem; }
.ending p { margin: 0; }
.sig { font: 700 0.75rem var(--ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--wheat); margin-bottom: 0.2rem; }
details.dialogue summary { font: 700 0.95rem var(--ui); color: var(--slate); cursor: pointer; }
.speaker { margin-top: 1rem; }
.speaker h5 { font: 700 0.85rem var(--ui); color: var(--ink); margin: 0 0 0.4rem; letter-spacing: 0.04em; }
.line { padding: 0.35rem 0 0.35rem 0.9rem; border-left: 2px solid var(--rule); }
.line p { margin: 0; }
.line.narr p { font-style: italic; color: var(--muted); }
.opts { margin: 0.25rem 0 0.2rem; padding-left: 1.1rem; font: 500 0.9rem var(--ui); color: var(--slate); }
.empty { color: var(--muted); font: 500 0.95rem var(--ui); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>

<main class="wrap">
  <header>
    <div class="eyebrow">Everrealm · Side quests · ${esc(REGION_NAME)}</div>
    <h1>${esc(REGION_NAME)} Quest Book</h1>
    <p>Every side quest in this batch as it plays in the game: what the journal says at each step, how each ending reads, and every line the quest adds. Built from the quest walker's run, so it matches the game exactly.</p>
  </header>

  <div class="tally">
    <span><b>${counts.total}</b> new quests</span>
    <span><b>${counts.storylines}</b> storylines (${counts.storylineParts} parts)</span>
    <span><b>${counts.quest}</b> quests</span>
    <span><b>${counts.short}</b> short jobs</span>
    <span><b>${counts.choices}</b> with choices</span>
    <span><b>${counts.endings}</b> endings</span>
    <span><b>${counts.people}</b> new villagers</span>
    <span><b>${counts.lines}</b> lines</span>
  </div>

  <div class="verdict">${regionErrors.length
    ? `<b>${regionErrors.length} problem${regionErrors.length === 1 ? '' : 's'}</b> found by the quest walker: ${regionErrors.map(esc).join('; ')}`
    : `<b>Walked clean.</b> The quest walker played every quest here down every dialogue branch and reached all ${counts.endings} endings, with no dead ends, broken links, unknown items or style-guide breaks.`}</div>

  <nav aria-label="Quests in this batch"><h4>Contents</h4><ol>${index}</ol></nav>

  <div class="filters" role="toolbar" aria-label="Filter quests">
    <button type="button" data-f="all" aria-pressed="true">All</button>
    <button type="button" data-f="storyline" aria-pressed="false">Storylines</button>
    <button type="button" data-f="quest" aria-pressed="false">Quests</button>
    <button type="button" data-f="short" aria-pressed="false">Short jobs</button>
    <button type="button" data-f="choice" aria-pressed="false">With choices</button>
    <input id="q" type="search" placeholder="Search names, people, lines" aria-label="Search the quest book">
  </div>

  <div id="book">${body}</div>
  <p class="empty" id="none" hidden>No quest matches that.</p>
  <p class="empty">Generated ${esc(report.when.slice(0, 10))} from <code>.walker/report.json</code>.</p>
</main>

<script>
(function () {
  var mode = 'all', query = '';
  var book = document.getElementById('book');
  function apply() {
    var shown = 0;
    book.querySelectorAll('.quest').forEach(function (q) {
      var okMode = mode === 'all' || (mode === 'choice' ? q.dataset.choice === 'true' : q.dataset.depth === mode);
      var okText = !query || q.textContent.toLowerCase().indexOf(query) !== -1;
      q.hidden = !(okMode && okText);
      if (!q.hidden) shown++;
    });
    book.querySelectorAll('.chain').forEach(function (c) { c.hidden = !c.querySelector('.quest:not([hidden])'); });
    document.getElementById('none').hidden = shown > 0;
  }
  document.querySelectorAll('.filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.f;
      document.querySelectorAll('.filters button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
  });
  document.getElementById('q').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); apply(); });
})();
</script>
`;

fs.mkdirSync('artifacts', { recursive: true });
const out = `artifacts/${region}-quest-book.html`;
fs.writeFileSync(out, html);
console.log(`${out}: ${counts.total} quests, ${counts.endings} endings, ${counts.lines} lines, ${regionErrors.length} errors`);
