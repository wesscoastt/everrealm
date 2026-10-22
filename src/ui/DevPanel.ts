import { ITEMS } from '../data/items';
import { MAX_LEVEL } from '../data/gameplay';

// Dev tools, for the accounts the realm's server names as developers (DEV_ACCOUNTS in
// server/server.mjs), or anyone playing a local build with ?dev in the address. F8 opens it.
// Everything here acts on your own character only: where you stand, your levels, your pack.

export interface DevHost {
  /** Every waymark shrine, to jump to. */
  waymarks(): { name: string; x: number; y: number; z: number }[];
  /** Jump to a spot; null when you can't (inside a dungeon). Otherwise a line saying where. */
  teleport(x: number, z: number, y?: number): string | null;
  where(): { x: number; y: number; z: number; region: string };
  setLevel(level: number): void;
  heal(): void;
  give(id: string, n: number): boolean;
  addMarks(n: number): void;
  hour(): number;
  setHour(h: number): void;
  god: boolean;
  fast: boolean;
  /** Knock out every creature within reach; returns how many. */
  clearFoes(): number;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export class DevPanel {
  private readonly el: HTMLDivElement;
  private shown = false;
  private whereTimer = 0;

  constructor(parent: HTMLElement, private readonly host: DevHost, private readonly allowed: () => boolean) {
    const p = (this.el = document.createElement('div'));
    p.className = 'panel frame';
    p.id = 'dev-panel';
    const items = Object.values(ITEMS).map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');
    p.innerHTML = `<header><h3>Dev tools</h3><button class="x" aria-label="Close">✕</button></header>
      <div class="body">
        <h4 class="sec">Go to</h4>
        <div class="dev-row"><select data-k="way"></select><button class="btn" data-a="way">Go</button></div>
        <div class="dev-row"><input data-k="x" type="number" placeholder="x"><input data-k="z" type="number" placeholder="z"><button class="btn ghost" data-a="xz">Go</button></div>
        <div class="dev-where"></div>
        <h4 class="sec">You</h4>
        <div class="dev-row"><label>Level</label><input data-k="lvl" type="number" min="1" max="${MAX_LEVEL}" value="50"><button class="btn" data-a="lvl">Set every skill</button></div>
        <div class="dev-row"><label><input type="checkbox" data-k="god"> Can't be hurt</label><label><input type="checkbox" data-k="fast"> Run fast</label></div>
        <div class="dev-row"><button class="btn ghost" data-a="heal">Full health</button><button class="btn ghost" data-a="foes">Knock out foes nearby</button></div>
        <h4 class="sec">Things</h4>
        <div class="dev-row"><input data-k="item" list="dev-items" placeholder="Item name or id"><input data-k="n" type="number" min="1" max="999" value="1"><button class="btn" data-a="give">Give</button></div>
        <datalist id="dev-items">${items}</datalist>
        <div class="dev-row"><button class="btn ghost" data-a="m1">+1,000 marks</button><button class="btn ghost" data-a="m2">+100,000 marks</button></div>
        <h4 class="sec">World</h4>
        <div class="dev-row"><label>Hour</label><input data-k="hour" type="range" min="0" max="24" step="0.25"><span class="dev-hour"></span></div>
        <p class="dev-said"></p>
      </div>
      <div class="footer"><span>F8 opens and closes this.</span></div>`;
    parent.append(p);
    p.querySelector('.x')!.addEventListener('click', () => this.close());
    p.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
      if (a) this.act(a);
    });
    this.input('god').addEventListener('change', () => { this.host.god = this.input('god').checked; this.say(this.host.god ? 'Nothing can hurt you now.' : 'You can be hurt again.'); });
    this.input('fast').addEventListener('change', () => { this.host.fast = this.input('fast').checked; });
    this.input('hour').addEventListener('input', () => { this.host.setHour(Number(this.input('hour').value)); this.showHour(); });
    this.input('item').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.act('give'); });
  }

  get open(): boolean { return this.shown; }

  toggle(): void {
    if (this.shown) this.close();
    else if (this.allowed()) this.show();
  }

  /** Close it; true if it was open. */
  close(): boolean {
    if (!this.shown) return false;
    this.shown = false;
    this.el.classList.remove('show');
    (document.activeElement as HTMLElement | null)?.blur?.();
    return true;
  }

  /** Keep the "you are here" line current while it's open. */
  update(dt: number): void {
    if (!this.shown || (this.whereTimer -= dt) > 0) return;
    this.whereTimer = 0.25;
    const w = this.host.where();
    this.el.querySelector('.dev-where')!.textContent = `You're at ${Math.round(w.x)}, ${Math.round(w.y)}, ${Math.round(w.z)} in ${w.region}.`;
  }

  private show(): void {
    this.shown = true;
    const ways = this.host.waymarks().slice().sort((a, b) => a.name.localeCompare(b.name));
    this.sel('way').innerHTML = ways.map((w) => `<option value="${w.x},${w.y},${w.z}">${esc(w.name)}</option>`).join('');
    this.input('god').checked = this.host.god;
    this.input('fast').checked = this.host.fast;
    this.input('hour').value = String(this.host.hour());
    this.showHour();
    this.whereTimer = 0;
    this.el.classList.add('show');
  }

  private act(a: string): void {
    const h = this.host;
    if (a === 'way') {
      const [x, y, z] = this.sel('way').value.split(',').map(Number);
      if (Number.isFinite(x)) this.say(h.teleport(x, z, y) ?? 'Leave the dungeon first.');
    } else if (a === 'xz') {
      const x = Number(this.input('x').value), z = Number(this.input('z').value);
      if (this.input('x').value === '' || this.input('z').value === '' || !Number.isFinite(x) || !Number.isFinite(z)) { this.say('Give both x and z.'); return; }
      this.say(h.teleport(x, z) ?? 'Leave the dungeon first.');
    } else if (a === 'lvl') {
      const L = Math.max(1, Math.min(MAX_LEVEL, Math.round(Number(this.input('lvl').value) || 1)));
      h.setLevel(L);
      this.say(`Every skill is level ${L}.`);
    } else if (a === 'heal') {
      h.heal();
      this.say('Back to full health.');
    } else if (a === 'foes') {
      const n = h.clearFoes();
      this.say(n ? `Knocked out ${n} ${n === 1 ? 'creature' : 'creatures'}.` : 'Nothing to fight near you.');
    } else if (a === 'give') {
      const v = this.input('item').value.trim();
      const def = ITEMS[v] ?? Object.values(ITEMS).find((d) => d.name.toLowerCase() === v.toLowerCase());
      const n = Math.max(1, Math.min(999, Math.round(Number(this.input('n').value) || 1)));
      if (!def) { this.say(v ? `There's no item called "${v}".` : 'Pick an item first.'); return; }
      this.say(h.give(def.id, n) ? `Gave you ${n} × ${def.name}.` : 'Your pack is full.');
    } else if (a === 'm1' || a === 'm2') {
      h.addMarks(a === 'm1' ? 1000 : 100000);
      this.say(`Added ${a === 'm1' ? '1,000' : '100,000'} marks.`);
    }
  }

  private showHour(): void {
    const t = this.host.hour(), hh = Math.floor(t) % 24, mm = Math.round((t % 1) * 60);
    this.el.querySelector('.dev-hour')!.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private say(s: string): void { this.el.querySelector('.dev-said')!.textContent = s; }
  private input(k: string): HTMLInputElement { return this.el.querySelector(`input[data-k="${k}"]`)!; }
  private sel(k: string): HTMLSelectElement { return this.el.querySelector(`select[data-k="${k}"]`)!; }
}
