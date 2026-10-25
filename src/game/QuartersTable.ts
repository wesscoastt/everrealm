import * as THREE from 'three';
import { ENEMIES } from '../data/gameplay';
import { STARTER_TILES, TILE_BY_ID, TILES, type Opponent, type TileDef } from '../data/cards';
import { CreatureModel, type CreatureKind } from '../entities/creatures';
import { FoeModel } from '../entities/foes';
import { bestMove, newGame, over, play, score, type QState, type Side, type Tile } from './quarters';

// The Quarters table (the rules are game/quarters.ts, the tiles data/cards.ts): choose your five, sit
// down with someone who plays, lay tiles in turn, and take one of theirs if you win. Losing costs
// nothing. Each tile's picture is the creature itself, drawn once off the game's own models.

export interface QuartersHost {
  renderer: THREE.WebGLRenderer;
  /** The tiles you hold: id -> how many. */
  tiles(): Record<string, number>;
  setTiles(t: Record<string, number>): void;
  /** The five you last sat down with. */
  deck(): string[];
  setDeck(d: string[]): void;
  /** Someone's name, by their NPC id. */
  nameOf(npc: string): string;
  sound(name: 'click' | 'coin' | 'quest' | 'fail' | 'open' | 'close'): void;
  system(text: string): void;
  persist(): void;
}

const RARITY_NAME: Record<TileDef['rarity'], string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', great: 'Great' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const num = (n: number) => (n >= 10 ? 'A' : String(n));

export class QuartersTable {
  private el: HTMLDivElement | null = null;
  private opp: Opponent | null = null;
  private phase: 'deck' | 'play' | 'end' = 'deck';
  private pick = new Set<string>();
  private st: QState | null = null;
  private sel: number | null = null;
  private turned = new Set<number>();
  private thinking = false;
  private result: { text: string; prize: string | null } | null = null;
  private art = new Map<string, string>();
  private rt = new THREE.WebGLRenderTarget(160, 160);
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(30, 1, 0.05, 200);

  constructor(private host: QuartersHost) {
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404858, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(2, 4, 3);
    this.scene.add(sun);
  }

  get open(): boolean { return !!this.el; }

  /** A tile's picture: the creature, three-quarter on, off its own model (drawn once, then kept). */
  private picture(id: string): string {
    const hit = this.art.get(id);
    if (hit) return hit;
    const d = ENEMIES[id as keyof typeof ENEMIES];
    let url = '';
    if (d) {
      const kind = (d.model ?? d.type) as CreatureKind;
      const model = kind === 'bandit' ? new FoeModel(d.look ?? {}, d.held ?? 'sword', 7) : new CreatureModel(kind, d.palette, d.scale);
      model.setAnim('idle');
      model.update(0.016, 0);
      const root = model.root;
      root.rotation.y = -0.65;
      this.scene.add(root);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const r = Math.max(size.x, size.y, size.z) * 2.05;
      this.cam.position.set(c.x + r * 0.18, c.y + r * 0.2, c.z + r);
      this.cam.lookAt(c);
      const R = this.host.renderer, prev = R.getRenderTarget(), clear = R.getClearColor(new THREE.Color()), alpha = R.getClearAlpha();
      R.setRenderTarget(this.rt);
      R.setClearColor(0x000000, 0);
      R.clear();
      R.render(this.scene, this.cam);
      const px = new Uint8Array(160 * 160 * 4);
      R.readRenderTargetPixels(this.rt, 0, 0, 160, 160, px);
      R.setRenderTarget(prev);
      R.setClearColor(clear, alpha);
      this.scene.remove(root);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 160;
      const ctx = cv.getContext('2d')!, img = ctx.createImageData(160, 160);
      // (the target is read bottom row first)
      for (let y = 0; y < 160; y++) img.data.set(px.subarray((159 - y) * 640, (160 - y) * 640), y * 640);
      ctx.putImageData(img, 0, 0);
      url = cv.toDataURL();
    }
    this.art.set(id, url);
    return url;
  }

  /** A tile as a card: its picture, its four numbers on its four sides, its name. */
  private card(id: string, owner: Side | null, extra = ''): string {
    const t = TILE_BY_ID.get(id), d = ENEMIES[id as keyof typeof ENEMIES];
    if (!t) return '';
    const [a, b, c, e] = t.edges;
    return `<div class="qt-card r-${t.rarity}${owner === null ? '' : owner === 0 ? ' mine' : ' theirs'}${extra}" data-tile="${id}" title="${esc(d?.name ?? id)} · ${RARITY_NAME[t.rarity]}">
      <img src="${this.picture(id)}" alt=""><b class="e t">${num(a)}</b><b class="e r">${num(b)}</b><b class="e b">${num(c)}</b><b class="e l">${num(e)}</b><span class="nm">${esc(d?.name ?? id)}</span></div>`;
  }

  /** Sit down at someone's table: choose your five first. */
  start(opp: Opponent): void {
    const have = this.host.tiles();
    if (!Object.keys(have).length) {
      const t: Record<string, number> = {};
      for (const id of STARTER_TILES) t[id] = 1;
      this.host.setTiles(t);
      this.host.system(`${this.host.nameOf(opp.npc)} pushes five worn tiles across the table: "Everyone's first five are wolves and jellies. Keep them."`);
      this.host.persist();
    }
    this.opp = opp;
    this.phase = 'deck';
    const owned = this.host.tiles();
    this.pick = new Set(this.host.deck().filter((id) => owned[id]).slice(0, 5));
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'quarters'; document.body.appendChild(this.el); }
    this.host.sound('open');
    this.render();
  }

  close(): void {
    if (!this.el) return;
    this.el.remove(); this.el = null; this.opp = null; this.st = null; this.thinking = false;
    this.host.sound('close');
  }

  private begin(): void {
    if (!this.opp || this.pick.size !== 5) return;
    this.host.setDeck([...this.pick]);
    this.host.persist();
    const mine: Tile[] = [...this.pick].map((id) => ({ id, edges: TILE_BY_ID.get(id)!.edges }));
    const theirs: Tile[] = this.opp.deck.map((id) => ({ id, edges: TILE_BY_ID.get(id)!.edges }));
    this.st = newGame(mine, theirs, Math.random() < 0.5 ? 0 : 1);
    this.phase = 'play'; this.sel = null; this.turned.clear(); this.result = null;
    this.render();
    if (this.st.turn === 1) this.theirMove();
  }

  private lay(h: number, at: number): void {
    if (!this.st || this.thinking || this.st.turn !== 0 || this.st.board[at]) return;
    const r = play(this.st, h, at);
    this.st = r.state; this.sel = null; this.turned = new Set(r.turned);
    this.host.sound(r.turned.length ? 'coin' : 'click');
    this.after();
  }

  private theirMove(): void {
    if (!this.st || !this.opp) return;
    this.thinking = true;
    this.render();
    setTimeout(() => {
      if (!this.st || !this.opp || !this.el) return;
      const [h, at] = bestMove(this.st, this.opp.depth);
      const r = play(this.st, h, at);
      this.st = r.state; this.turned = new Set(r.turned); this.thinking = false;
      this.host.sound(r.turned.length ? 'coin' : 'click');
      this.after();
    }, 750);
  }

  private after(): void {
    if (!this.st || !this.opp) return;
    if (!over(this.st)) { this.render(); if (this.st.turn === 1) this.theirMove(); return; }
    const [a, b] = score(this.st), name = this.host.nameOf(this.opp.npc);
    let prize: string | null = null;
    if (a > b) {
      // A tile off them: one you haven't got, if they have one
      const have = this.host.tiles(), fresh = this.opp.prizes.filter((id) => !have[id]);
      const from = fresh.length ? fresh : this.opp.prizes;
      prize = from[Math.floor(Math.random() * from.length)];
      this.host.setTiles({ ...have, [prize]: (have[prize] ?? 0) + 1 });
      this.host.persist();
      this.host.sound('quest');
    } else this.host.sound(a === b ? 'click' : 'fail');
    this.result = { text: a > b ? `You win, ${a} to ${b}. ${name}: "${this.opp.won}"` : a < b ? `${name} wins, ${b} to ${a}. "${this.opp.lost}"` : `A draw, ${a} each. ${name} shrugs and gathers the tiles.`, prize };
    this.phase = 'end';
    this.render();
  }

  private render(): void {
    if (!this.el || !this.opp) return;
    const name = this.host.nameOf(this.opp.npc);
    if (this.phase === 'deck') {
      const have = this.host.tiles();
      const ids = TILES.map((t) => t.id as string).filter((id) => have[id]);
      this.el.innerHTML = `<div class="qt-box"><div class="qt-head"><b>Quarters with ${esc(name)}</b><button class="qt-x" data-close>✕</button></div>
        <p class="qt-say">"${esc(this.opp.hello)}"</p>
        <p class="qt-help">Choose five tiles. You take turns laying them on a board of three by three; lay one beside one of theirs, and if your side facing it is higher, theirs turns to your colour. Most tiles at the end wins, and the winner takes one of the other's. You lose nothing if you lose.</p>
        <div class="qt-pick">${ids.map((id) => this.card(id, this.pick.has(id) ? 0 : null, this.pick.has(id) ? ' sel' : '') + (have[id] > 1 ? '' : '')).join('')}</div>
        <div class="qt-foot"><span>${this.pick.size} of 5 chosen · ${ids.length} tile${ids.length === 1 ? '' : 's'} held</span><button class="btn ghost" data-best>Best five</button><button class="btn" data-go${this.pick.size === 5 ? '' : ' disabled'}>Sit down</button></div></div>`;
      this.el.querySelectorAll<HTMLElement>('.qt-pick [data-tile]').forEach((c) => c.addEventListener('click', () => {
        const id = c.dataset.tile!;
        if (this.pick.has(id)) this.pick.delete(id); else if (this.pick.size < 5) this.pick.add(id);
        this.host.sound('click'); this.render();
      }));
      this.el.querySelector('[data-best]')?.addEventListener('click', () => {
        const sum = (id: string) => TILE_BY_ID.get(id)!.edges.reduce((x, y) => x + y, 0);
        this.pick = new Set(ids.slice().sort((x, y) => sum(y) - sum(x)).slice(0, 5));
        this.render();
      });
      this.el.querySelector('[data-go]')?.addEventListener('click', () => this.begin());
      this.el.querySelector('[data-close]')?.addEventListener('click', () => this.close());
      return;
    }
    const s = this.st!, [a, b] = score(s);
    const hand = (side: Side) => s.hands[side].map((t, i) => this.card(t.id, side, side === 0 && this.sel === i ? ' sel' : '').replace('data-tile=', `data-h="${i}" data-tile=`)).join('');
    const board = s.board.map((c, i) => `<div class="qt-sq${c ? '' : ' empty'}${this.sel !== null && !c && s.turn === 0 ? ' can' : ''}" data-sq="${i}">${c ? this.card(c.tile.id, c.owner, this.turned.has(i) ? ' flip' : '') : ''}</div>`).join('');
    const status = this.phase === 'end' ? esc(this.result?.text ?? '') : this.thinking || s.turn === 1 ? `${esc(name)} is thinking…` : this.sel === null ? 'Your turn: choose a tile.' : 'Now a square.';
    this.el.innerHTML = `<div class="qt-box play"><div class="qt-head"><b>Quarters with ${esc(name)}</b><span class="qt-score"><i class="mine">${a}</i> · <i class="theirs">${b}</i></span><button class="qt-x" data-close>✕</button></div>
      <div class="qt-table"><div class="qt-col theirs">${hand(1)}</div><div class="qt-board">${board}</div><div class="qt-col mine">${hand(0)}</div></div>
      <div class="qt-foot"><span class="qt-status">${status}</span>${this.phase === 'end' ? `${this.result?.prize ? `<span class="qt-prize">You take: ${this.card(this.result.prize, 0)}</span>` : ''}<button class="btn ghost" data-again>Again</button><button class="btn" data-close>Leave the table</button>` : ''}</div></div>`;
    this.el.querySelectorAll<HTMLElement>('.qt-col.mine [data-h]').forEach((c) => c.addEventListener('click', () => {
      if (this.phase !== 'play' || s.turn !== 0 || this.thinking) return;
      const i = Number(c.dataset.h);
      this.sel = this.sel === i ? null : i; this.host.sound('click'); this.render();
    }));
    this.el.querySelectorAll<HTMLElement>('[data-sq]').forEach((q) => q.addEventListener('click', () => { if (this.sel !== null) this.lay(this.sel, Number(q.dataset.sq)); }));
    this.el.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', () => this.close()));
    this.el.querySelector('[data-again]')?.addEventListener('click', () => { if (this.opp) this.start(this.opp); });
  }

  /** Esc leaves the table (a game left unfinished costs nothing). */
  key(code: string): boolean {
    if (!this.el) return false;
    if (code === 'Escape') { this.close(); return true; }
    return true;
  }
}
