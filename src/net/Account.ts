import type { SaveData } from '../game/state';
import { serverUrl } from './Online';

// An Everrealm account on the realm's server (server/server.mjs): a name and a password that work
// in any browser, on any device. The account's characters live on the server; signing in brings
// them down into this browser, and play sends them back up (every quarter minute, and on leaving).

const KEY = 'everrealm.account';
const UPLOAD_GAP_MS = 15_000;

export interface AccountInfo { user: string; token: string; server: string; dev?: boolean }

/** The realm's HTTP address: the same host and port as its world socket. */
export function apiBase(ws = serverUrl()): string | null {
  return ws ? ws.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/+$/, '') : null;
}

/** The travellers' board at Hollin Ford (server /api/travellers): who has played, in the order they came. */
export const travellers: { names: string[]; loaded: boolean } = { names: [], loaded: false };
export async function loadTravellers(): Promise<void> {
  const base = apiBase();
  if (!base) return;
  try {
    const r = await fetch(base + '/api/travellers');
    const d = await r.json() as { names?: unknown };
    if (Array.isArray(d.names)) { travellers.names = d.names.filter((n): n is string => typeof n === 'string'); travellers.loaded = true; }
  } catch { /* the realm isn't answering: the board shows what it had */ }
}

/** The account signed in to this realm in this browser, if any. */
export function currentAccount(): AccountInfo | null {
  const base = apiBase();
  if (!base) return null;
  try {
    const a = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AccountInfo | null;
    return a && a.server === base && a.user && a.token ? a : null;
  } catch { return null; }
}

function remember(a: AccountInfo | null): void {
  try { if (a) localStorage.setItem(KEY, JSON.stringify(a)); else localStorage.removeItem(KEY); } catch { /* private window: lasts this session */ }
}

async function call(method: string, path: string, body?: unknown, keepalive = false): Promise<{ status: number; data: Record<string, unknown> }> {
  const base = apiBase();
  if (!base) return { status: 0, data: { error: 'No realm chosen.' } };
  const acc = currentAccount();
  try {
    const r = await fetch(base + path, {
      method, keepalive,
      headers: { 'Content-Type': 'application/json', ...(acc ? { Authorization: 'Bearer ' + acc.token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && acc && path !== '/api/login' && path !== '/api/register') remember(null); // the session ran out
    return { status: r.status, data };
  } catch {
    return { status: 0, data: { error: 'The realm\'s server isn\'t answering.' } };
  }
}

/** What signIn says when the account has two-step sign-in on and the app's code is wanted. */
export const NEED_CODE = 'Enter the six-digit code from your authenticator app.';

/** Sign in (or make the account first). Returns an error message, or null when signed in. */
export async function signIn(user: string, pass: string, create: boolean, code?: string): Promise<string | null> {
  const r = await call('POST', create ? '/api/register' : '/api/login', { user, pass, ...(code ? { code } : {}) });
  if (r.status !== 200) return r.data.need2fa && !code ? NEED_CODE : String(r.data.error ?? 'Something went wrong.');
  remember({ user: String(r.data.user), token: String(r.data.token), server: apiBase()!, dev: r.data.dev === true });
  return null;
}

// ---------------------------------------------------------------- Keeping the account safe
/** How safe the account is (server/server.mjs /api/me): never the secrets themselves. */
export interface Safety { twoStep: boolean; recoveryLeft: number; otherSessions: number; created: number | null; passChanged: number | null }
export async function accountSafety(): Promise<Safety | null> {
  if (!currentAccount()) return null;
  const r = await call('GET', '/api/me');
  return r.status === 200 && r.data.safety ? (r.data.safety as unknown as Safety) : null;
}
const said = (r: { status: number; data: Record<string, unknown> }) => (r.status === 200 ? null : String(r.data.error ?? 'Something went wrong.'));
/** A new password (the current one to prove it's you); every other device is signed out. */
export async function changePassword(old: string, pass: string): Promise<string | null> { return said(await call('POST', '/api/password', { old, pass })); }
/** Sign out every other browser and device; how many were signed out, or an error. */
export async function signOutOthers(): Promise<number | string> {
  const r = await call('POST', '/api/signout-others');
  return r.status === 200 ? Number(r.data.n) || 0 : String(r.data.error ?? 'Something went wrong.');
}
/** Eight one-use recovery codes, replacing any before; shown once. */
export async function makeRecoveryCodes(pass: string): Promise<string[] | string> {
  const r = await call('POST', '/api/recovery', { pass });
  return r.status === 200 && Array.isArray(r.data.codes) ? (r.data.codes as string[]) : String(r.data.error ?? 'Something went wrong.');
}
/** A forgotten password: a recovery code sets a new one (and turns two-step sign-in off). Signs in. */
export async function recoverAccount(user: string, code: string, pass: string): Promise<string | null> {
  const r = await call('POST', '/api/recover', { user, code, pass });
  if (r.status !== 200) return String(r.data.error ?? 'Something went wrong.');
  remember({ user: String(r.data.user), token: String(r.data.token), server: apiBase()!, dev: r.data.dev === true });
  return null;
}
/** Two-step sign-in: a key for the authenticator app, then its first code to turn it on; or off again. */
export async function twoStepKey(pass: string): Promise<{ secret: string; uri: string } | string> {
  const r = await call('POST', '/api/2fa/setup', { pass });
  return r.status === 200 ? { secret: String(r.data.secret), uri: String(r.data.uri) } : String(r.data.error ?? 'Something went wrong.');
}
export async function twoStepOn(code: string): Promise<string | null> { return said(await call('POST', '/api/2fa/enable', { code })); }
export async function twoStepOff(pass: string, code: string): Promise<string | null> { return said(await call('POST', '/api/2fa/disable', { pass, code })); }

/**
 * May this player open the dev tools? A developer's account (the server says so when they sign in),
 * or anyone running a build on their own machine with ?dev in the address.
 */
export function isDevAccount(): boolean {
  if (currentAccount()?.dev) return true;
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return local && new URLSearchParams(location.search).has('dev');
}

/** The bank vault shared by the account's characters, or null if the server can't be reached. */
export async function getVault(): Promise<{ vault: { items: Record<string, number>; marks: number }; ver: number } | null> {
  const r = await call('GET', '/api/vault');
  if (r.status !== 200) return null;
  return { vault: r.data.vault as { items: Record<string, number>; marks: number }, ver: Number(r.data.ver) || 0 };
}

/** Store the vault as changed against version `ver`; a stale version comes back with the vault as it is. */
export async function putVault(vault: { items: Record<string, number>; marks: number }, ver: number): Promise<{ ok: boolean; ver?: number; vault?: { items: Record<string, number>; marks: number }; error?: string }> {
  const r = await call('PUT', '/api/vault', { vault, ver });
  if (r.status === 200) return { ok: true, ver: Number(r.data.ver) };
  if (r.status === 409) return { ok: false, vault: r.data.vault as { items: Record<string, number>; marks: number }, ver: Number(r.data.ver) };
  return { ok: false, error: String(r.data.error ?? 'The realm\'s server isn\'t answering.') };
}

export async function signOut(): Promise<void> {
  if (currentAccount()) await call('POST', '/api/logout');
  remember(null);
}

/** The account's characters on the server, or null if they couldn't be fetched. */
export async function remoteCharacters(): Promise<{ name: string; save: SaveData | null }[] | null> {
  if (!currentAccount()) return null;
  const r = await call('GET', '/api/me');
  if (r.status !== 200) return null;
  // The server's word on dev tools is the latest one (an account can be added or taken off)
  const acc = currentAccount();
  if (acc && !!acc.dev !== (r.data.dev === true)) remember({ ...acc, dev: r.data.dev === true });
  return r.data.characters as { name: string; save: SaveData | null }[];
}

let lastUpload = 0;
/** Send a character up to the account; at most every quarter minute unless forced (leaving). */
export function uploadSave(save: SaveData, force = false): Promise<string | null> | null {
  if (!currentAccount()) return null;
  const now = Date.now();
  if (!force && now - lastUpload < UPLOAD_GAP_MS) return null;
  lastUpload = now;
  return call('PUT', '/api/characters/' + encodeURIComponent(save.name), { save }, force).then((r) => (r.status === 200 ? null : String(r.data.error ?? 'refused')));
}

export async function deleteRemote(name: string): Promise<void> {
  if (currentAccount()) await call('DELETE', '/api/characters/' + encodeURIComponent(name));
}

// ---------------------------------------------------------------- The store (server/store.mjs)
export interface StoreItem { id: string; cat?: string; name: string; price: number; blurb: string; items: string[] }
/** What the store sells, and whether it's open for payments yet. */
export async function storeCatalog(): Promise<{ open: boolean; items: StoreItem[] } | null> {
  const r = await call('GET', '/api/store/catalog');
  return r.status === 200 ? (r.data as unknown as { open: boolean; items: StoreItem[] }) : null;
}
/** Asks for a payment page for one item: its address, or why not. The page is Stripe's own. */
export async function storeCheckout(sku: string): Promise<{ url?: string; error?: string }> {
  const r = await call('POST', '/api/store/checkout', { sku });
  return r.status === 200 ? { url: String(r.data.url) } : { error: String(r.data.error ?? 'The store couldn\'t be reached.') };
}
/** Claims a free item from the store for this account (once): true when it's the account's. */
export async function storeClaim(sku: string): Promise<{ ok: boolean; again?: boolean; error?: string }> {
  const r = await call('POST', '/api/store/claim', { sku });
  return r.status === 200 ? { ok: true, again: !!r.data.again } : { ok: false, error: String(r.data.error ?? 'The store couldn\'t be reached.') };
}
/** The items this account owns from the store (the server's word, not this browser's). */
export async function storeOwned(): Promise<string[] | null> {
  if (!currentAccount()) return null;
  const r = await call('GET', '/api/store/owned');
  return r.status === 200 && Array.isArray(r.data.owned) ? (r.data.owned as string[]) : null;
}
