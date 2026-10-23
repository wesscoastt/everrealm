import type { Appearance } from '../entities/humanoid';
import { ORIGINS, originById } from '../data/origins';
import { CALLINGS, CallingId } from '../data/classes';
import { callingCard } from './callingCard';
import { drawFace } from './skin';
import { PROLOGUE } from '../data/prologue';
import './frontend.css';

// The screens around the game: character select (the main menu), the character creator, and the
// arrival intro's captions. The 3D side (who stands in the scene, where the camera is) belongs to
// Game; this module is DOM only and talks to Game through FrontCtx.

export interface CharSummary {
  id: string;
  name: string;
  look: Appearance;
  /** Null for characters made before origins existed. */
  origin: string | null;
  /** Character level: the fighting (Melee) level, 1 to 100. */
  level: number;
  /** Total of all skill levels. */
  total: number;
  /** The calling's name (Warden, Wizard...). */
  calling: string;
  /** Region the character last stood in. */
  place: string;
  playTime: number;
  /** Festival dye colours this character has unlocked for the wardrobe. */
  dyes?: string[];
  /** Festival hats this character has unlocked (data/seasons.ts). */
  hats?: string[];
}

export interface FrontCtx {
  characters(): CharSummary[];
  maxCharacters: number;
  selected(): string | null;
  /** Show this character in the scene (null: nobody, just the vale). */
  select(id: string | null): void;
  enter(id: string): void;
  deleteCharacter(id: string): void;
  create(name: string, look: Appearance, origin: string, calling: CallingId): void;
  /** Save a new look for an existing character. */
  restyle(id: string, look: Appearance): void;
  /** The creator's model (null removes it). */
  preview(look: Appearance | null): void;
  creatorView(view: 'body' | 'face'): void;
  spin(radians: number): void;
  realmUrl: string | null;
  /** The signed-in account's name on this realm, if any. */
  account(): string | null;
  signIn(user: string, pass: string, create: boolean): Promise<string | null>;
  signOut(): Promise<void>;
  openSettings(): void;
  sfx(n: 'click' | 'open' | 'close'): void;
  skipIntro(): void;
}

type HomeTab = 'start' | 'world' | 'callings' | 'homes' | 'together' | 'new';
const HOME_TABS: [HomeTab, string][] = [['world', 'The World'], ['callings', 'Callings'], ['homes', 'Homes'], ['together', 'Together'], ['new', 'What\'s new']];
/** The front page's words: a short pitch, then a page for each part of the game. */
const HOME_PAGES: Record<HomeTab, string> = {
  start: `<h2>A whole realm to wander</h2>
    <p>Step off the Charter Post in Hollin Ford with a few marks and a long road ahead. Fish the Wend, work the forge, take a house on the Ford road, and ride out to Ansbury, the coast and the high country beyond.</p>
    <p>When the world bosses rise, everyone nearby fights together. When the fair comes to town, everyone dances.</p>`,
  world: `<h2>The Charter Counties</h2>
    <p>Six regions in one seamless world, from the green vale of Hollindale to the walled capital of Ansbury, the fishing harbours of the Fleet Coast, the dark trees of Hagworm Wood, the red mines of the Raddle Barrens and the snow of the Scarth Highlands.</p>
    <ul><li>Dungeons, delves and caves to clear with friends</li><li>World bosses on a schedule the whole realm shares</li><li>Five festivals on the real calendar</li><li>Horses, Charter Posts and waymarks to get you there</li></ul>`,
  callings: `<h2>Four callings</h2>
    <ul><li><b>Warden.</b> Shield and steadiness. Soak the blow and hold the line.</li><li><b>Reaver.</b> Close-in fury. Bleed them, leap in, and live off the fight.</li><li><b>Kindler.</b> Fire from a distance. Build heat, then call down a star.</li><li><b>Pathfinder.</b> Arrows and quick feet. Mark your prey and step behind it.</li></ul>
    <p>Change calling whenever you're out of a fight. Your skills, gear and progress come with you.</p>`,
  homes: `<h2>A place of your own</h2>
    <p>Buy Wendside Cottage, or lease a lot from the Charter and have the Ansbury builders raise a house to your plans: size, storeys, stone or timber, thatch or slate.</p>
    <ul><li>Furnish every room, or make the furniture yourself at the joiner's bench</li><li>Sleep in your own bed to wake well rested</li><li>Invite friends round to see what you've done with it</li></ul>`,
  together: `<h2>Better with friends</h2>
    <ul><li>Groups, with a bonus for playing side by side</li><li>Guilds with ranks, a roster and their own chat</li><li>Friends lists and whispers</li><li>Trading, and one bank vault for all your characters</li><li>Shared events and world bosses, with a medal for everyone who helped</li></ul>`,
  new: `<h2>What's new</h2>
    <ul><li><b>Homes.</b> Lease a lot and build your own house, room by room.</li><li><b>Friends and whispers.</b> See who's online and where, and send a private word.</li><li><b>One realm clock.</b> Dawn and dusk come for everyone at once, and creatures stay down when someone kills them.</li><li><b>The Charter Bank.</b> One vault, every character.</li></ul>
    <p>Everrealm is in early access: new regions, dungeons and story chapters are on the way.</p>`,
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]!));
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

const CLOTH = ['#3a5a8a', '#2e3a5a', '#1e2a4a', '#5a7aa8', '#7a2a24', '#a8382c', '#8a4a3a', '#c86a3a', '#3f6a3a', '#2a4a2a', '#4a5a3a', '#7a8a4a', '#5a2f6a', '#7a4a8a', '#8a6a2a', '#c8a050', '#5a5048', '#3a3a3a', '#1e1a18', '#e8dcc0', '#c8c0a8', '#6a3a4a'];
const DYEABLE = new Set(['tunic', 'shirt', 'trim', 'trousers', 'hose', 'boots', 'cape', 'hatColor', 'gloves', 'belt']);
const OPT = {
  skin: ['#fbe3cf', '#f6d8bc', '#f0c8a0', '#e8b48a', '#e0b090', '#d09870', '#c88a62', '#a8704a', '#8a5636', '#6a4028', '#5a3420', '#4a2a18'],
  eyes: ['#3a5a7a', '#4a7a8a', '#7a8a9a', '#3a6a3a', '#5a3a1a', '#8a6a2a', '#6a6a7a', '#2a2a2a', '#7a5a2a'],
  hair: ['#0e0c0c', '#1e1612', '#3a2418', '#5a3a22', '#7a5a3a', '#6a2a1a', '#a8642e', '#c87a3a', '#e2c070', '#f0e0b0', '#cfc8b8', '#e8e4dc', '#9a948c', '#3a2a5a', '#2a3a6a', '#5a1a2a'],
  tunic: CLOTH,
  shirt: CLOTH,
  trim: ['#e0bd64', '#c8b890', '#a8382c', '#5fd0e6', '#e8dcc0', '#3a3a3a', '#8a6a2a', '#7a4a8a', '#3f6a3a', '#c8ccd2'],
  trousers: ['#4a3a2c', '#3a3430', '#2a2a34', '#4a4034', '#5a4a3a', '#2e3a2a', '#1e1a18', '#5a2a24', '#2e3a5a', '#7a6a4a'],
  hose: ['#e8dcc0', '#c8c0a8', '#7a2a24', '#2e3a5a', '#3f6a3a', '#3a3a3a', '#8a6a2a'],
  boots: ['#3a2a1c', '#2a1e14', '#1e1a18', '#5a4030', '#7a5a3a', '#4a2a2a', '#2e2e34', '#c8b890'],
  cape: ['none', '#7a2a24', '#a8382c', '#2f4a7a', '#1e2a4a', '#2f5a3a', '#4a2a3a', '#5a2f6a', '#e8dcc0', '#2a2420', '#8a6a2a'],
  hatColor: ['#4a5a3a', '#6a3a2a', '#a8382c', '#2e3a5a', '#d8d0b8', '#3a3a32', '#9aa0a8', '#5a2f6a', '#c8a050', '#1e1a18'],
  paint: ['none', '#2a4a8a', '#8a2a24', '#1e1e1e', '#e8e4dc', '#3f6a3a'],
  earring: ['none', '#d8b04a', '#c8ccd2', '#b87333'],
  gloves: ['none', '#4a3020', '#2a1e14', '#7a5a3a', '#1e1a18', '#c8b890', '#7a2a24'],
  belt: ['#3b2618', '#1e1a18', '#5a4030', '#7a2a24', '#c8a050', '#2e3a5a'],
};
type Tab = 'origin' | 'calling' | 'body' | 'face' | 'hair' | 'outfit' | 'gear';
const TAB_NAME: Record<Tab, string> = { origin: 'Origin', calling: 'Calling', body: 'Body', face: 'Face', hair: 'Hair', outfit: 'Outfit', gear: 'Gear' };
const HAIR_STYLES = ['Short', 'Long', 'Topknot', 'Shaved', 'Braids', 'Bob', 'Ponytail', 'Bun', 'Curls', 'Mohawk', 'Undercut', 'Twin tails', 'Wild mane'];
const FACIAL = ['None', 'Full beard', 'Stubble', 'Moustache', 'Goatee', 'Chinstrap', 'Long beard', 'Mutton chops', 'Forked beard'];
const BROWS = ['Straight', 'Heavy', 'Arched', 'Fine'];
const TOPS = ['Tunic', 'Doublet', 'Robe', 'Vest', 'Gambeson', 'Gown', 'Jerkin', 'Long coat'];
const LEGS = ['Trousers', 'Breeches', 'Kilt', 'Wide trousers'];
const SHOES = ['Boots', 'Tall boots', 'Shoes'];
const AGES: [string, number][] = [['Young', 0.05], ['Grown', 0.35], ['Weathered', 0.62], ['Old', 0.9]];
const HATS: [string, Appearance['hat']][] = [['None', 'none'], ['Hood', 'hood'], ['Cap', 'cap'], ['Kerchief', 'kerchief'], ['Wide hat', 'wide'], ['Straw hat', 'straw'], ['Beret', 'beret'], ['Circlet', 'circlet'], ['Mail coif', 'coif'], ['Headband', 'band']];
/** Festival hats: in the list only for a character that has unlocked them. */
const FEST_HATS: [string, Appearance['hat']][] = [["Fool's cap", 'fool'], ['Garland', 'garland'], ['Antlers', 'antlers'], ['Harvest crown', 'sheaf'], ['Turnip lantern', 'turnip'], ['Goose Fair hat', 'feathered'], ['Bobble hat', 'bobble']];
const PADS: [string, string | null][] = [['None', null], ['Iron', '#8c939d'], ['Leather', '#6a4a2a']];
const NAMES = ['Rowan', 'Merrin', 'Corwen', 'Ysolde', 'Hallam', 'Briony', 'Teague', 'Linden', 'Osgar', 'Wilmot', 'Sabeth', 'Edric', 'Nettle', 'Clement', 'Avice', 'Hesper', 'Tamar', 'Gethin', 'Orla', 'Piran'];

/** Name rules: 2 to 16 characters, letters with single spaces, apostrophes or hyphens between them. */
export function nameProblem(raw: string, taken: string[]): string | null {
  const n = raw.trim();
  if (n.length < 2) return 'At least two letters.';
  if (n.length > 16) return 'Sixteen characters at most.';
  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(n)) return 'Letters only, with single spaces, hyphens or apostrophes between them.';
  if (taken.some((t) => t.toLowerCase() === n.toLowerCase())) return 'A character in this browser already has that name.';
  return null;
}

function defaultLook(): Appearance {
  return { skin: '#e0b090', hair: '#5a3a22', hairStyle: 0, eyes: '#3a5a7a', tunic: '#3a5a8a', trim: '#e0bd64', trousers: '#4a3a2c', boots: '#3a2a1c', cape: '#7a2a24', beard: false, lashes: false, build: 1, height: 1, age: 0.35, hat: 'none', hatColor: '#4a5a3a', shoulderPads: null };
}

function randomLook(): Appearance {
  const hat = Math.random() < 0.3 ? pick(HATS)[1] : 'none';
  const frame = Math.random() < 0.5 ? 'f' : 'm';
  return {
    frame, facial: frame === 'm' && Math.random() < 0.45 ? 1 + Math.floor(Math.random() * 8) : 0,
    brows: Math.floor(Math.random() * 4), freckles: Math.random() < 0.2, scar: Math.random() < 0.1,
    paint: Math.random() < 0.08 ? pick(OPT.paint.slice(1)) : null, earring: Math.random() < 0.25 ? pick(OPT.earring.slice(1)) : null,
    top: Math.floor(Math.random() * TOPS.length), shirt: pick(OPT.shirt), legs: Math.floor(Math.random() * LEGS.length), hose: pick(OPT.hose),
    shoes: Math.floor(Math.random() * SHOES.length), gloves: Math.random() < 0.3 ? pick(OPT.gloves.slice(1)) : null, belt: pick(OPT.belt),
    skin: pick(OPT.skin), hair: pick(OPT.hair), hairStyle: Math.floor(Math.random() * HAIR_STYLES.length), eyes: pick(OPT.eyes),
    tunic: pick(OPT.tunic), trim: pick(OPT.trim), trousers: pick(OPT.trousers), boots: pick(OPT.boots),
    cape: ((c) => (c === 'none' ? null : c))(pick(OPT.cape)),
    lashes: frame === 'f' ? Math.random() < 0.8 : Math.random() < 0.2,
    build: Math.round((0.88 + Math.random() * 0.26) * 100) / 100, height: Math.round((0.92 + Math.random() * 0.14) * 100) / 100,
    age: pick(AGES)[1], hat, hatColor: pick(OPT.hatColor), shoulderPads: Math.random() < 0.2 ? pick(PADS)[1] : null,
  };
}

const playTime = (s: number) => {
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

export class Frontend {
  private root: HTMLElement;
  private screen: 'none' | 'home' | 'select' | 'creator' | 'intro' | 'prologue' = 'none';
  private homeTab: HomeTab = 'start';
  /** Players in the world on the chosen realm (null: not asked yet, or no realm). */
  private realmOnline: number | null = null;
  private look = defaultLook();
  private origin = ORIGINS[0].id;
  private calling: CallingId = 'warden';
  private tab: Tab = 'origin';
  /** The character whose look is being changed (null when making a new one). */
  private editing: CharSummary | null = null;
  private name = '';
  private view: 'body' | 'face' = 'body';
  private realmState: 'offline' | 'checking' | 'up' | 'down' = 'offline';

  constructor(private ctx: FrontCtx, host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'fe-root';
    host.append(this.root);
    window.addEventListener('keydown', (e) => this.key(e));
  }

  get active(): string { return this.screen; }

  hide(): void {
    this.screen = 'none';
    this.root.innerHTML = '';
  }

  // ------------------------------------------------------------------ Front page
  /** The front page: what Everrealm is, and the way in. The live vale stands behind it. */
  showHome(tab: HomeTab = this.homeTab): void {
    this.screen = 'home';
    this.homeTab = tab;
    const realm = this.ctx.realmUrl;
    if (realm && this.realmOnline === null) this.askOnline(realm);
    const status = realm
      ? `<span class="dot ${this.realmOnline === null ? 'checking' : this.realmOnline >= 0 ? 'up' : 'down'}"></span>${this.realmOnline === null ? 'Finding the realm…' : this.realmOnline < 0 ? 'The realm isn\'t answering' : this.realmOnline === 0 ? 'The realm is open' : `${this.realmOnline} in the world now`}`
      : '<span class="dot offline"></span>Playing offline, in this browser';
    const nav = HOME_TABS.map(([id, label]) => `<button class="hn ${id === tab ? 'sel' : ''}" data-h="${id}">${label}</button>`).join('');
    this.root.innerHTML = `<div class="fe fe-home">
      <header class="hm-top"><div class="hm-mark"><div class="gem"></div><b>EVER<span>REALM</span></b></div><nav>${nav}</nav><button class="btn hm-playsm" data-a="play">Play now</button></header>
      <section class="hm-card${tab === 'start' ? '' : ' compact'}">
        <div class="hm-brand"><div class="gem"></div><h1>EVER<span>REALM</span></h1><div class="hm-ea">Early Access</div></div>
        <div class="hm-body">${HOME_PAGES[tab]}</div>
        <button class="btn big hm-play" data-a="play">▶ Play now</button>
        <div class="hm-realm">${status}</div>
        <p class="hm-small">Free in your browser · Nothing to download · No pay-to-win, ever</p>
      </section>
      <nav class="fe-foot"><button class="link" data-a="settings">Settings</button><button class="link" data-a="credits">Credits</button></nav>
    </div>`;
    this.root.querySelectorAll<HTMLElement>('[data-h]').forEach((b) => b.addEventListener('click', () => { this.ctx.sfx('click'); this.showHome(b.dataset.h as HomeTab); }));
    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.a === 'play') { this.ctx.sfx('click'); this.showSelect(); } else this.act(b.dataset.a!, null);
    }));
  }

  /** How many are in the world on this realm (its /health page says), for the front page. */
  private askOnline(url: string): void {
    this.realmOnline = null;
    const base = url.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/+$/, '');
    const done = (n: number) => { this.realmOnline = n; if (this.screen === 'home') this.showHome(); };
    const timer = setTimeout(() => done(-1), 6000);
    fetch(base + '/health').then((r) => r.json()).then((j: { online?: number }) => { clearTimeout(timer); done(typeof j.online === 'number' ? j.online : 0); }).catch(() => { clearTimeout(timer); done(-1); });
  }

  // ------------------------------------------------------------------ Character select
  showSelect(): void {
    this.screen = 'select';
    const chars = this.ctx.characters();
    let sel = this.ctx.selected();
    if (!chars.some((c) => c.id === sel)) { sel = chars[0]?.id ?? null; this.ctx.select(sel); }
    const cur = chars.find((c) => c.id === sel) ?? null;
    const full = chars.length >= this.ctx.maxCharacters;
    const realm = this.ctx.realmUrl;
    this.root.innerHTML = `<div class="fe fe-select">
      <div class="fe-brand"><div class="gem"></div><b>EVER<span>REALM</span></b><i class="ea">Early Access</i></div>
      <button class="link fe-back" data-a="home">‹ Front page</button>
      <div class="fe-realm frame">
        <div><small>REALM</small><b>${realm ? 'Charter realm' : 'Hearth'}</b></div>
        <div class="st"><i class="dot ${realm ? this.realmState : 'offline'}"></i><span>${realm ? esc(realm.replace(/^wss?:\/\//, '')) + (this.realmState === 'checking' ? ' · checking' : this.realmState === 'up' ? ' · reachable' : this.realmState === 'down' ? ' · not answering' : '') : 'Offline · this browser'}</span></div>
        <button class="btn ghost sm" data-a="realm">Change</button>
        ${realm ? (this.ctx.account()
          ? `<div class="acct">Signed in as <b>${esc(this.ctx.account()!)}</b><span class="x"> · characters follow you to any device</span> <button class="link" data-a="signout">Sign out</button></div>`
          : '<div class="acct"><button class="btn sm" data-a="signin">Sign in or create an account</button><small>Play the same characters on any PC or phone</small></div>') : ''}
      </div>
      <aside class="fe-roster frame">
        <header><h3>Characters</h3><small>${chars.length} / ${this.ctx.maxCharacters}</small></header>
        <div class="list">${chars.length ? chars.map((c) => {
          const o = c.origin ? originById(c.origin) : null;
          return `<button class="card ${c.id === sel ? 'sel' : ''}" data-id="${c.id}"><canvas data-face="${c.id}"></canvas><span class="t"><b>${esc(c.name)}</b><small><em class="clv">Level ${c.level}</em> ${esc(c.calling)}${o ? ' · ' + esc(o.title) : ''}</small><small>${esc(c.place)} · ${playTime(c.playTime)}</small></span></button>`;
        }).join('') : '<p class="empty">No characters in this browser yet.</p>'}</div>
        <div class="row"><button class="btn ghost" data-a="new" ${full ? 'disabled' : ''}>${full ? 'All six slots are used' : 'Create new character'}</button></div>
        ${cur ? '<div class="row2"><button class="link" data-a="restyle">Change look</button><button class="link danger" data-a="delete">Delete character</button></div>' : ''}
      </aside>
      <aside class="fe-news frame">
        <header><h3>In this build</h3></header>
        <ul>
          <li><b>The Weatherholms.</b> The main story's second act: six new chapters after the sitting, up a hoist to the floating isles.</li>
          <li><b>Callings.</b> Warden, Reaver, Kindler or Pathfinder, each with its own mechanic and three skills. Change any time out of a fight.</li>
          <li><b>Festivals.</b> Five fairs on the real calendar, with stalls, tokens, dyes and a horse each. The journal says what's on.</li>
          <li><b>Chat and emotes.</b> Press Enter to talk, or /wave, /dance, /sit and more. Other players see them.</li>
        </ul>
      </aside>
      <div class="fe-enter">${cur
        ? `<div class="who"><h2>${esc(cur.name)}</h2><p><b class="clv">Level ${cur.level} ${esc(cur.calling)}</b> · ${cur.origin ? `${esc(originById(cur.origin).title)} from ${esc(originById(cur.origin).place)} · ` : ''}${esc(cur.place)} · skills ${cur.total}</p></div><button class="btn big" data-a="enter">Enter world</button><small class="hint">Enter to play · arrows to choose</small>`
        : `<div class="who"><h2>Welcome to the Charter Counties</h2><p>Make a character to begin in Hollindale.</p></div><button class="btn big" data-a="new">Create a character</button>`}</div>
      <nav class="fe-foot"><button class="link" data-a="settings">Settings</button><button class="link" data-a="credits">Credits</button></nav>
      <div class="fe-ver">Early Access · ${realm ? 'online realm' : 'single-player'}</div>
    </div>`;
    this.root.querySelectorAll<HTMLCanvasElement>('canvas[data-face]').forEach((cv) => {
      const c = chars.find((x) => x.id === cv.dataset.face);
      if (c) drawFace(cv, c.look);
    });
    this.root.querySelectorAll<HTMLElement>('.card').forEach((b) => b.addEventListener('click', () => { this.ctx.sfx('click'); this.ctx.select(b.dataset.id!); this.showSelect(); }));
    // The picked character's card is always in view, in a long list or a narrow strip
    this.root.querySelector<HTMLElement>('.card.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.a!, cur)));
    if (realm && this.realmState === 'offline') this.checkRealm(realm);
  }

  private act(a: string, cur: CharSummary | null): void {
    this.ctx.sfx('click');
    if (a === 'enter' && cur) this.ctx.enter(cur.id);
    else if (a === 'new') this.showCreator();
    else if (a === 'restyle' && cur) this.showCreator(cur);
    else if (a === 'delete' && cur) this.confirmDelete(cur);
    else if (a === 'settings') this.ctx.openSettings();
    else if (a === 'home') this.showHome();
    else if (a === 'credits') this.credits();
    else if (a === 'realm') this.realmPicker();
    else if (a === 'signin') this.accountForm();
    else if (a === 'signout') void this.ctx.signOut().then(() => this.showSelect());
  }

  private moveSelection(d: number): void {
    const chars = this.ctx.characters();
    if (!chars.length) return;
    const i = chars.findIndex((c) => c.id === this.ctx.selected());
    const next = chars[(i + d + chars.length) % chars.length];
    this.ctx.sfx('click');
    this.ctx.select(next.id);
    this.showSelect();
  }

  private modal(html: string, wire: (m: HTMLElement, close: () => void) => void): void {
    const m = document.createElement('div');
    m.className = 'fe-modal';
    m.innerHTML = `<div class="box frame">${html}</div>`;
    this.root.append(m);
    const close = () => { m.remove(); this.ctx.sfx('close'); };
    m.addEventListener('pointerdown', (e) => { if (e.target === m) close(); });
    wire(m, close);
    this.ctx.sfx('open');
  }

  private confirmDelete(c: CharSummary): void {
    this.modal(`<header><h3>Delete ${esc(c.name)}?</h3></header><div class="body">
      <p>Everything ${esc(c.name)} has done goes with them: skills, pack, marks and quests. This can't be undone.</p>
      <label>Type the name to confirm</label><input type="text" class="cf" maxlength="16" autocomplete="off" spellcheck="false">
      <div class="actions"><button class="btn ghost no">Keep</button><button class="btn danger yes" disabled>Delete</button></div></div>`, (m, close) => {
      const inp = m.querySelector<HTMLInputElement>('.cf')!;
      const yes = m.querySelector<HTMLButtonElement>('.yes')!;
      inp.addEventListener('input', () => { yes.disabled = inp.value.trim().toLowerCase() !== c.name.toLowerCase(); });
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !yes.disabled) yes.click(); if (e.key === 'Escape') close(); });
      m.querySelector('.no')!.addEventListener('click', close);
      yes.addEventListener('click', () => { close(); this.ctx.deleteCharacter(c.id); this.showSelect(); });
      setTimeout(() => inp.focus(), 30);
    });
  }

  private credits(): void {
    this.modal(`<header><h3>Credits</h3></header><div class="body prose">
      <p><b>Everrealm</b> is an original browser RPG. The world, its people, the writing and the code were made for this project.</p>
      <p>The score is synthesised live in Web Audio: strings, a vowel-formant choir, horns, harp and drums, all built in code.</p>
      <p>Built with Three.js and Vite. Type in Pixelify Sans, Alegreya and Alegreya Sans, from Google Fonts.</p>
      <div class="actions"><button class="btn ghost ok">Close</button></div></div>`, (m, close) => m.querySelector('.ok')!.addEventListener('click', close));
  }

  /** Sign in, or make an account: a name and a password for this realm's server. */
  private accountForm(): void {
    this.modal(`<header><h3>Your account</h3></header><div class="body acct-form">
      <p class="note">An account keeps your characters on the realm's server, so you can sign in and carry on from any PC or phone.</p>
      <label>Account name</label><input type="text" class="u" maxlength="20" autocomplete="username" spellcheck="false" placeholder="3 to 20 letters, digits or _">
      <label>Password</label><input type="password" class="p" maxlength="200" autocomplete="current-password" placeholder="At least 8 characters">
      <p class="err"></p>
      <div class="actions"><button class="btn ghost no">Cancel</button><button class="btn ghost mk">Create account</button><button class="btn in">Sign in</button></div></div>`, (m, close) => {
      const u = m.querySelector<HTMLInputElement>('.u')!, p = m.querySelector<HTMLInputElement>('.p')!, err = m.querySelector<HTMLElement>('.err')!;
      const go = async (create: boolean) => {
        err.textContent = create ? 'Making the account…' : 'Signing in…';
        const e = await this.ctx.signIn(u.value.trim(), p.value, create);
        if (e) { err.textContent = e; return; }
        close();
        this.showSelect();
      };
      for (const i of [u, p]) i.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') void go(false); });
      m.querySelector('.in')!.addEventListener('click', () => void go(false));
      m.querySelector('.mk')!.addEventListener('click', () => void go(true));
      m.querySelector('.no')!.addEventListener('click', close);
      setTimeout(() => u.focus(), 30);
    });
  }

  private realmPicker(): void {
    const cur = this.ctx.realmUrl;
    const local = 'ws://127.0.0.1:8787';
    this.modal(`<header><h3>Choose a realm</h3></header><div class="body">
      <button class="realm ${!cur ? 'sel' : ''}" data-u=""><b>Hearth</b><small>Offline. Characters and progress stay in this browser.</small></button>
      <button class="realm ${cur === local ? 'sel' : ''}" data-u="${local}"><b>Local server</b><small>${local} · start it with <code>npm run server</code></small></button>
      <label>Another server</label><div class="nrow"><input type="text" class="url" placeholder="ws://host:8787" value="${cur && cur !== local ? esc(cur) : ''}" spellcheck="false"><button class="btn ghost sm go">Use</button></div>
      <p class="note">Online, you see other players and can chat. Each server keeps its own copy of your characters.</p>
      <div class="actions"><button class="btn ghost no">Cancel</button></div></div>`, (m, close) => {
      const use = (u: string) => {
        const q = new URLSearchParams(location.search);
        q.delete('online'); q.delete('server'); q.delete('offline');
        if (u) q.set('server', u); else q.set('offline', '');
        const s = q.toString();
        location.search = s ? '?' + s : '';
      };
      m.querySelectorAll<HTMLElement>('.realm').forEach((b) => b.addEventListener('click', () => use(b.dataset.u!)));
      const inp = m.querySelector<HTMLInputElement>('.url')!;
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') m.querySelector<HTMLElement>('.go')!.click(); });
      m.querySelector('.go')!.addEventListener('click', () => { const u = inp.value.trim(); if (/^wss?:\/\/\S+$/.test(u)) use(u); else inp.classList.add('bad'); });
      m.querySelector('.no')!.addEventListener('click', close);
    });
  }

  /** Opens and closes a socket to see whether the realm's server answers. */
  private checkRealm(url: string): void {
    this.realmState = 'checking';
    let done = false;
    const finish = (s: 'up' | 'down') => {
      if (done) return;
      done = true;
      this.realmState = s;
      if (this.screen === 'select') this.showSelect();
    };
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => { finish('up'); ws.close(); };
      ws.onerror = () => finish('down');
      setTimeout(() => { finish('down'); try { ws.close(); } catch { /* already closed */ } }, 3500);
    } catch { finish('down'); }
  }

  // ------------------------------------------------------------------ Character creator
  /** Make a character, or (given one) change how an existing character looks. */
  showCreator(edit?: CharSummary): void {
    this.screen = 'creator';
    this.editing = edit ?? null;
    this.look = edit ? { ...edit.look } : defaultLook();
    this.origin = ORIGINS[0].id;
    this.calling = 'warden';
    this.tab = edit ? 'body' : 'origin';
    this.view = 'body';
    this.name = '';
    this.ctx.preview(this.look);
    this.ctx.creatorView('body');
    this.root.innerHTML = `<div class="fe fe-creator">
      <aside class="fe-steps frame"><header><h3>${edit ? `Change ${esc(edit.name)}'s look` : 'Create a character'}</h3></header>
        <div class="tabs">${(edit ? ['body', 'face', 'hair', 'outfit', 'gear'] as const : ['origin', 'calling', 'body', 'face', 'hair', 'outfit', 'gear'] as const).map((t) => `<button data-tab="${t}">${TAB_NAME[t]}</button>`).join('')}</div>
        <div class="pane"></div>
      </aside>
      <div class="fe-drag" title="Drag to turn"></div>
      <div class="fe-cam">
        <button class="btn ghost sm" data-v="body">Full</button><button class="btn ghost sm" data-v="face">Face</button><button class="btn ghost sm rand">Randomise</button>
      </div>
      <div class="fe-namebar frame">
        ${edit ? `<label>${esc(edit.name)}</label>` : '<label>NAME</label>'}
        <div class="nrow"${edit ? ' style="display:none"' : ''}><input type="text" class="nm" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Your name"><button class="btn ghost sm dice" title="Suggest a name">Suggest</button></div>
        <div class="err"></div>
        <div class="actions"><button class="btn ghost back">Back</button><button class="btn go">${edit ? 'Save look' : 'Create character'}</button></div>
      </div>
    </div>`;
    const r = this.root;
    r.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      this.ctx.sfx('click');
      const t = b.dataset.tab as Tab;
      this.tab = t;
      // Face and hair are easier to judge close up
      this.view = t === 'face' || t === 'hair' ? 'face' : 'body';
      this.ctx.creatorView(this.view);
      this.markCam();
      this.renderPane();
    }));
    r.querySelectorAll<HTMLElement>('[data-v]').forEach((b) => b.addEventListener('click', () => { this.view = b.dataset.v as 'body' | 'face'; this.ctx.creatorView(this.view); this.markCam(); }));
    r.querySelector('.rand')!.addEventListener('click', () => { this.ctx.sfx('click'); this.look = randomLook(); this.ctx.preview(this.look); this.renderPane(); });
    const nm = r.querySelector<HTMLInputElement>('.nm')!;
    const err = r.querySelector<HTMLElement>('.err')!;
    const taken = () => this.ctx.characters().map((c) => c.name);
    nm.addEventListener('input', () => { this.name = nm.value; err.textContent = ''; nm.classList.remove('bad'); });
    nm.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') r.querySelector<HTMLElement>('.go')!.click(); });
    r.querySelector('.dice')!.addEventListener('click', () => {
      const free = NAMES.filter((n) => !taken().some((t) => t.toLowerCase() === n.toLowerCase()));
      nm.value = this.name = pick(free.length ? free : NAMES);
      err.textContent = ''; nm.classList.remove('bad');
    });
    r.querySelector('.back')!.addEventListener('click', () => { this.ctx.sfx('click'); this.ctx.preview(null); this.ctx.select(this.ctx.selected()); this.showSelect(); });
    r.querySelector('.go')!.addEventListener('click', () => {
      if (this.editing) { this.ctx.sfx('click'); this.ctx.restyle(this.editing.id, { ...this.look }); return; }
      const problem = nameProblem(this.name, taken());
      if (problem) { err.textContent = problem; nm.classList.add('bad'); nm.focus(); return; }
      this.ctx.sfx('click');
      this.ctx.create(this.name.trim(), { ...this.look }, this.origin, this.calling);
    });
    // Drag the empty middle of the screen to turn the model
    const drag = r.querySelector<HTMLElement>('.fe-drag')!;
    let lastX: number | null = null;
    drag.addEventListener('pointerdown', (e) => { lastX = e.clientX; drag.setPointerCapture(e.pointerId); });
    drag.addEventListener('pointermove', (e) => { if (lastX === null) return; this.ctx.spin((e.clientX - lastX) * 0.012); lastX = e.clientX; });
    drag.addEventListener('pointerup', () => { lastX = null; });
    drag.addEventListener('wheel', (e) => { e.preventDefault(); this.view = e.deltaY < 0 ? 'face' : 'body'; this.ctx.creatorView(this.view); this.markCam(); }, { passive: false });
    this.renderPane();
    this.markCam();
  }

  private markCam(): void {
    this.root.querySelectorAll<HTMLElement>('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === this.view));
  }

  private renderPane(): void {
    const pane = this.root.querySelector<HTMLElement>('.pane');
    if (!pane) return;
    this.root.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === this.tab));
    const L = this.look;
    // Festival dyes join every cloth swatch, for the character that owns them
    const dyed = (k: keyof typeof OPT) => (DYEABLE.has(k) && this.editing?.dyes?.length ? [...OPT[k], ...this.editing.dyes.filter((d) => !OPT[k].includes(d))] : OPT[k]);
    const sw = (k: keyof typeof OPT, cur: string | null | undefined) => `<div class="swatches">${dyed(k).map((v) => `<button class="sw ${(cur ?? 'none') === v ? 'sel' : ''}" style="background:${v === 'none' ? 'repeating-linear-gradient(45deg,#333 0 4px,#555 4px 8px)' : v}" data-k="${k}" data-v="${v}" title="${v === 'none' ? 'None' : ''}"></button>`).join('')}</div>`;
    const hats = [...HATS, ...FEST_HATS.filter(([, id]) => this.editing?.hats?.includes(id as string))];
    const chips = (attr: string, items: [string, unknown][], cur: unknown) => `<div class="chips">${items.map(([t, v], i) => `<button class="chip ${cur === v ? 'sel' : ''}" data-${attr}="${i}">${t}</button>`).join('')}</div>`;
    const slider = (k: 'build' | 'height', label: string, min: number, max: number, lo: string, hi: string) => `<label>${label}</label><div class="slide"><small>${lo}</small><input type="range" min="${min}" max="${max}" step="0.01" value="${L[k] ?? 1}" data-s="${k}"><small>${hi}</small></div>`;
    if (this.tab === 'origin') {
      pane.innerHTML = `<label>MALE OR FEMALE</label>${chips('frame', [['Male', 'm'], ['Female', 'f']], L.frame ?? 'm')}<p class="lead">Everyone in the Charter Counties comes from somewhere. Where did you grow up?</p>${ORIGINS.map((o) => `<button class="origin ${o.id === this.origin ? 'sel' : ''}" data-o="${o.id}"><span class="h"><b>${esc(o.title)}</b><small>${esc(o.place)} · ${esc(o.region)}</small></span><span class="d">${esc(o.blurb)}</span><span class="s">${esc(o.startText)}</span></button>`).join('')}`;
    } else if (this.tab === 'calling') {
      pane.innerHTML = `<p class="lead">How do you fight? No calling is stronger than another, and you can change yours later from the journal, whenever you're not in a fight.</p>${CALLINGS.map((c) => callingCard(c, c.id === this.calling)).join('')}`;
    } else if (this.tab === 'body') {
      pane.innerHTML = `<label>MALE OR FEMALE</label>${chips('frame', [['Male', 'm'], ['Female', 'f']], L.frame ?? 'm')}
        <label>SKIN</label>${sw('skin', L.skin)}
        ${slider('build', 'BUILD', 0.86, 1.16, 'Slight', 'Broad')}${slider('height', 'HEIGHT', 0.9, 1.08, 'Short', 'Tall')}
        <label>AGE</label>${chips('age', AGES, L.age)}`;
    } else if (this.tab === 'face') {
      pane.innerHTML = `<label>EYES</label>${sw('eyes', L.eyes)}
        <label>BROWS</label>${chips('brows', BROWS.map((t, i) => [t, i]), L.brows ?? 0)}
        <label>DETAILS</label><div class="chips">${(['lashes', 'freckles', 'scar'] as const).map((k) => `<button class="chip ${L[k] ? 'sel' : ''}" data-t="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
        <label>FACE PAINT</label>${sw('paint', L.paint)}
        <label>EARRING</label>${sw('earring', L.earring)}`;
    } else if (this.tab === 'hair') {
      pane.innerHTML = `<label>STYLE</label>${chips('hs', HAIR_STYLES.map((t, i) => [t, i]), L.hairStyle)}<label>COLOUR</label>${sw('hair', L.hair)}
        <label>FACIAL HAIR</label>${chips('facial', FACIAL.map((t, i) => [t, i]), L.facial ?? (L.beard ? 1 : 0))}`;
    } else if (this.tab === 'outfit') {
      pane.innerHTML = `<label>TOP</label>${chips('top', TOPS.map((t, i) => [t, i]), L.top ?? 0)}
        <label>MAIN CLOTH</label>${sw('tunic', L.tunic)}<label>SHIRT AND SLEEVES</label>${sw('shirt', L.shirt ?? null)}<label>TRIM</label>${sw('trim', L.trim)}
        <label>CLOAK</label>${sw('cape', L.cape)}<label>SHOULDERS</label>${chips('pad', PADS, L.shoulderPads ?? null)}`;
    } else {
      pane.innerHTML = `<label>LEGS</label>${chips('legs', LEGS.map((t, i) => [t, i]), L.legs ?? 0)}<label>TROUSERS</label>${sw('trousers', L.trousers)}
        ${L.legs === 1 || L.legs === 2 ? `<label>HOSE</label>${sw('hose', L.hose ?? null)}` : ''}
        <label>FOOTWEAR</label>${chips('shoes', SHOES.map((t, i) => [t, i]), L.shoes ?? 0)}${sw('boots', L.boots)}
        <label>GLOVES</label>${sw('gloves', L.gloves)}<label>BELT</label>${sw('belt', L.belt ?? '#3b2618')}
        <label>HEADWEAR</label>${chips('hat', hats, L.hat ?? 'none')}${L.hat && L.hat !== 'none' && L.hat !== 'straw' && L.hat !== 'turnip' ? sw('hatColor', L.hatColor) : ''}`;
    }
    const changed = () => { this.ctx.sfx('click'); this.ctx.preview(this.look); this.renderPane(); };
    pane.querySelectorAll<HTMLElement>('.sw').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.v === 'none' ? null : b.dataset.v!;
      (this.look as unknown as Record<string, unknown>)[b.dataset.k!] = v;
      changed();
    }));
    pane.querySelectorAll<HTMLElement>('[data-calling]').forEach((b) => b.addEventListener('click', () => { this.calling = b.dataset.calling as CallingId; this.ctx.sfx('click'); this.renderPane(); }));
    pane.querySelectorAll<HTMLElement>('[data-o]').forEach((b) => b.addEventListener('click', () => { this.origin = b.dataset.o!; this.ctx.sfx('click'); this.renderPane(); }));
    pane.querySelectorAll<HTMLElement>('[data-age]').forEach((b) => b.addEventListener('click', () => { this.look.age = AGES[Number(b.dataset.age)][1]; changed(); }));
    pane.querySelectorAll<HTMLElement>('[data-hs]').forEach((b) => b.addEventListener('click', () => { this.look.hairStyle = Number(b.dataset.hs); changed(); }));
    const pickNum = (attr: string, key: 'facial' | 'brows' | 'top' | 'legs' | 'shoes', items: unknown[]) => pane.querySelectorAll<HTMLElement>(`[data-${attr}]`).forEach((b) => b.addEventListener('click', () => {
      this.look[key] = Number(b.dataset[attr]);
      if (key === 'facial') this.look.beard = this.look.facial! > 0;
      void items; changed();
    }));
    pickNum('facial', 'facial', FACIAL); pickNum('brows', 'brows', BROWS); pickNum('top', 'top', TOPS); pickNum('legs', 'legs', LEGS); pickNum('shoes', 'shoes', SHOES);
    pane.querySelectorAll<HTMLElement>('[data-frame]').forEach((b) => b.addEventListener('click', () => {
      const f = Number(b.dataset.frame) === 1 ? 'f' : 'm';
      if (f === this.look.frame) return;
      this.look.frame = f;
      // A switch brings the usual look with it (hair, lashes, a beard), which can all be changed after
      if (f === 'f') { this.look.facial = 0; this.look.beard = false; this.look.lashes = true; if ([0, 2, 3, 9, 10].includes(this.look.hairStyle ?? 0)) this.look.hairStyle = 1; }
      else { this.look.lashes = false; if ([1, 4, 5, 6, 7, 11].includes(this.look.hairStyle ?? 0)) this.look.hairStyle = 0; }
      changed();
    }));
    pane.querySelectorAll<HTMLElement>('[data-hat]').forEach((b) => b.addEventListener('click', () => { this.look.hat = hats[Number(b.dataset.hat)][1]; changed(); }));
    pane.querySelectorAll<HTMLElement>('[data-pad]').forEach((b) => b.addEventListener('click', () => { this.look.shoulderPads = PADS[Number(b.dataset.pad)][1]; changed(); }));
    pane.querySelectorAll<HTMLElement>('[data-t]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.t as 'lashes' | 'freckles' | 'scar'; this.look[k] = !this.look[k]; changed(); }));
    pane.querySelectorAll<HTMLInputElement>('[data-s]').forEach((s) => s.addEventListener('input', () => {
      this.look[s.dataset.s as 'build' | 'height'] = Number(s.value);
      this.ctx.preview(this.look);
    }));
  }

  // ------------------------------------------------------------------ Intro
  /** The storybook prologue: painted pages of the land, one after another; done() when it ends or is skipped. */
  showPrologue(done: () => void): void {
    this.screen = 'prologue';
    let i = -1, timer = 0;
    const finish = () => { if (this.screen !== 'prologue') return; window.clearTimeout(timer); this.prologueNext = null; done(); };
    const next = () => {
      if (this.screen !== 'prologue') return;
      window.clearTimeout(timer);
      if (++i >= PROLOGUE.length) { finish(); return; }
      const p = PROLOGUE[i];
      const page = document.createElement('div');
      page.className = 'pg' + (i % 2 ? ' left' : '');
      page.innerHTML = `<div class="pic" style="background-image:url('${p.img}')"></div><div class="band"><div class="k">${esc(p.kicker)}</div><p>${esc(p.text)}</p></div>`;
      const book = this.root.querySelector('.fe-book');
      book?.querySelectorAll('.pg').forEach((o) => { o.classList.add('out'); window.setTimeout(() => o.remove(), 1400); });
      book?.append(page);
      requestAnimationFrame(() => page.classList.add('in'));
      this.ctx.sfx('click');
      timer = window.setTimeout(next, 4200 + p.text.length * 55);
    };
    this.prologueNext = next;
    this.prologueSkip = finish;
    this.root.innerHTML = `<div class="fe fe-prologue"><div class="fe-book"></div><button class="fe-skip">Skip <kbd>Esc</kbd></button><div class="fe-turn">Click or <kbd>Space</kbd> to turn the page</div></div>`;
    this.root.querySelector('.fe-skip')!.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
    this.root.querySelector('.fe-prologue')!.addEventListener('click', () => next());
    next();
  }
  private prologueNext: (() => void) | null = null;
  private prologueSkip: (() => void) | null = null;

  showIntro(): void {
    this.screen = 'intro';
    this.root.innerHTML = `<div class="fe fe-intro"><div class="fe-fade"></div><button class="fe-skip">Skip <kbd>Space</kbd></button><div class="fe-cap"><div class="k"></div><p></p></div></div>`;
    this.root.querySelector('.fe-skip')!.addEventListener('click', () => this.ctx.skipIntro());
  }

  caption(kicker: string | undefined, text: string): void {
    const cap = this.root.querySelector<HTMLElement>('.fe-cap');
    if (!cap) return;
    cap.classList.remove('show');
    void cap.offsetWidth;
    cap.querySelector('.k')!.textContent = kicker ?? '';
    cap.querySelector('p')!.textContent = text;
    cap.classList.add('show');
  }

  /** 0 clear, 1 black. */
  fade(a: number): void {
    const f = this.root.querySelector<HTMLElement>('.fe-fade');
    if (f) f.style.opacity = String(a);
  }

  private key(e: KeyboardEvent): void {
    if (this.screen === 'none' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (this.root.querySelector('.fe-modal')) {
      if (e.key === 'Escape') this.root.querySelector<HTMLElement>('.fe-modal .no, .fe-modal .ok')?.click();
      return;
    }
    if (this.screen === 'prologue') {
      if (e.key === 'Escape') { e.preventDefault(); this.prologueSkip?.(); }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); this.prologueNext?.(); }
      return;
    }
    if (this.screen === 'intro' && (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); this.ctx.skipIntro(); }
    if (this.screen === 'home' && e.key === 'Enter') { e.preventDefault(); this.ctx.sfx('click'); this.showSelect(); return; }
    if (this.screen === 'select') {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.moveSelection(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.moveSelection(-1); }
      if (e.key === 'Enter') { const b = this.root.querySelector<HTMLElement>('[data-a="enter"]'); if (b) { e.preventDefault(); b.click(); } }
    }
    if (this.screen === 'creator' && e.key === 'Escape') this.root.querySelector<HTMLElement>('.back')?.click();
  }
}
