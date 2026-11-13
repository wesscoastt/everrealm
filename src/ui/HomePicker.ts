// Which home to go to (owner 2026-11-13: "a ui/menu like eso to choose what house you want to go to for people that
// own or rent multiple"): your homes in a list, the one you live in first, each with the way there. Choosing another
// moves you into it (its furniture with it) and takes you there; the one you left keeps its own.

export interface HomeRow { id: string; name: string; where: string; current: boolean; kind: 'villa' | 'lot' | 'cottage' | 'room' }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const KIND: Record<HomeRow['kind'], string> = { villa: 'House', lot: 'Lot', cottage: 'Cottage', room: 'Let room' };

export class HomePicker {
  private el: HTMLDivElement | null = null;

  constructor(private sound: (n: 'open' | 'close' | 'click') => void) {}

  get open(): boolean { return !!this.el; }

  show(list: HomeRow[], go: (id: string) => void): void {
    this.close(true);
    const el = document.createElement('div');
    el.id = 'tavern';
    el.innerHTML = `<div class="tv-box hp-box"><div class="tv-head"><b>Your homes</b><button class="tv-x" data-close>✕</button></div>
      <p class="tv-help">Travel to any of them. Going to another moves you in there, furniture and all; the others keep theirs.</p>
      <div class="rb-list">${list.map((h) => `<div class="rb-row hp-row${h.current ? ' cur' : ''}"><span class="hp-kind">${KIND[h.kind]}</span>
        <div class="rb-name"><b>${esc(h.name)}</b><small>${h.current ? 'You live here now' : esc(h.where || '')}</small></div><span></span>
        <button class="btn" data-go="${esc(h.id)}">${h.current ? 'Go home' : 'Travel'}</button></div>`).join('')}</div></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.sound('open');
    el.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    el.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.go!; this.close(true); go(id); }));
  }

  close(quiet = false): void {
    if (!this.el) return;
    this.el.remove(); this.el = null;
    if (!quiet) this.sound('close');
  }
}
