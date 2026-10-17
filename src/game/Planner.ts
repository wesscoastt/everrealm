import { ITEMS } from '../data/items';
import { costOf, HouseSpec, Lot, LOT_D, LOT_W, ROOFS, SIZES, WALLS } from '../data/housing';
import { itemIcon, shapeIcon } from '../ui/icons';

// The land agent's plans, drawn up at your lot: pick a size, storeys, walls and roof, see what the
// builders will want for it, and watch a ghost of the house stand on the lot while you choose.

export interface PlannerHost {
  count(item: string): number;
  marks(): number;
  /** Show the ghost of these plans on the lot (null: take it away). */
  preview(lot: Lot | null, spec: HouseSpec | null): void;
  /** Build it: the host checks and takes the goods. */
  build(lot: Lot, spec: HouseSpec): void;
  sound(name: string): void;
  player(): { x: number; z: number };
  /** True when a house already stands on the lot (so building again means pulling it down). */
  standing(): boolean;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const coin = () => shapeIcon('coin', '#e8c050', '#a87a20');

export class Planner {
  lot: Lot | null = null;
  private spec: HouseSpec = { size: 'cottage', floors: 1, wall: 'plaster', roof: 'thatch' };
  private el: HTMLDivElement | null = null;

  constructor(private host: PlannerHost) {}

  open(lot: Lot, start?: HouseSpec): void {
    this.lot = lot;
    if (start) this.spec = { ...start };
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'plantray';
      document.body.appendChild(this.el);
    }
    this.render();
  }

  close(): void {
    this.lot = null;
    this.el?.remove();
    this.el = null;
    this.host.preview(null, null);
  }

  /** Walking off the lot puts the plans away. */
  update(): void {
    if (!this.lot) return;
    const p = this.host.player();
    if (Math.hypot(p.x - (this.lot.x0 + LOT_W / 2), p.z - (this.lot.z0 + LOT_D / 2)) > 22) this.close();
  }

  private render(): void {
    if (!this.el || !this.lot) return;
    const s = this.spec, size = SIZES[s.size];
    if (!size.floors.includes(s.floors)) s.floors = 1;
    this.host.preview(this.lot, s);
    const cost = costOf(s);
    const rows = Object.entries(cost.items).map(([id, n]) => {
      const have = this.host.count(id);
      return `<li class="${have >= n ? 'ok' : 'no'}"><img class="ric" src="${itemIcon(id)}" alt="">${n} × ${esc(ITEMS[id]?.name ?? id)} <i>(${have})</i></li>`;
    });
    const haveMarks = this.host.marks();
    rows.push(`<li class="${haveMarks >= cost.marks ? 'ok' : 'no'}"><img class="ric" src="${coin()}" alt="">${cost.marks} marks for the builders <i>(${haveMarks})</i></li>`);
    const ready = Object.entries(cost.items).every(([id, n]) => this.host.count(id) >= n) && haveMarks >= cost.marks;
    const pick = (group: string, options: [string, string][], cur: string) => `<div class="pl-row"><span>${group}</span><div>${options.map(([v, label]) => `<button data-g="${group}" data-v="${v}" class="${v === cur ? 'on' : ''}">${esc(label)}</button>`).join('')}</div></div>`;
    this.el.innerHTML = `<div class="ht-head"><b>Plans for ${esc(this.lot.name)}</b><button class="pl-x" data-close>✕</button></div>
      ${pick('Size', Object.entries(SIZES).map(([k, v]) => [k, `${v.name} ${v.w}×${v.d}`]), s.size)}
      ${size.floors.length > 1 ? pick('Storeys', [['1', 'One'], ['2', 'Two']], String(s.floors)) : ''}
      ${pick('Walls', Object.entries(WALLS).map(([k, v]) => [k, v.name]), s.wall)}
      ${pick('Roof', Object.entries(ROOFS).map(([k, v]) => [k, v.name]), s.roof)}
      <p class="pl-blurb">${esc(size.blurb)} ${esc(WALLS[s.wall].blurb)}</p>
      <div class="pl-cost"><b>The builders want</b><ul>${rows.join('')}</ul></div>
      <div class="ht-keys"><span>${this.host.standing() ? 'Building again pulls the old house down: nothing comes back from it.' : 'Timber and ironwork from you; the builders bring the rest.'}</span><button data-build ${ready ? '' : 'disabled'}>${this.host.standing() ? 'Pull down and rebuild' : 'Build it'}</button></div>`;
    this.el.querySelectorAll<HTMLElement>('[data-g]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.v!;
      if (b.dataset.g === 'Size') this.spec.size = v as HouseSpec['size'];
      if (b.dataset.g === 'Storeys') this.spec.floors = Number(v) as 1 | 2;
      if (b.dataset.g === 'Walls') this.spec.wall = v as HouseSpec['wall'];
      if (b.dataset.g === 'Roof') this.spec.roof = v as HouseSpec['roof'];
      this.host.sound('click');
      this.render();
    }));
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    this.el.querySelector('[data-build]')?.addEventListener('click', () => { const lot = this.lot!; const spec = { ...this.spec }; this.host.build(lot, spec); });
  }
}
