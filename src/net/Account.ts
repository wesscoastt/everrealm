import type { SaveData } from '../game/state';
import { serverUrl } from './Online';

// An Everrealm account on the realm's server (server/server.mjs): a name and a password that work
// in any browser, on any device. The account's characters live on the server; signing in brings
// them down into this browser, and play sends them back up (every quarter minute, and on leaving).

const KEY = 'everrealm.account';
const UPLOAD_GAP_MS = 15_000;

export interface AccountInfo { user: string; token: string; server: string }

/** The realm's HTTP address: the same host and port as its world socket. */
export function apiBase(ws = serverUrl()): string | null {
  return ws ? ws.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/+$/, '') : null;
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

/** Sign in (or make the account first). Returns an error message, or null when signed in. */
export async function signIn(user: string, pass: string, create: boolean): Promise<string | null> {
  const r = await call('POST', create ? '/api/register' : '/api/login', { user, pass });
  if (r.status !== 200) return String(r.data.error ?? 'Something went wrong.');
  remember({ user: String(r.data.user), token: String(r.data.token), server: apiBase()! });
  return null;
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
  return r.status === 200 ? (r.data.characters as { name: string; save: SaveData | null }[]) : null;
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
