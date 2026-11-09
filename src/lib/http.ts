// Small helpers shared by the API endpoints and the middleware.
export interface SiteEnv {
  DB?: D1Database;                // requests (migrations/0001_site_requests.sql)
  INBOX_PASSWORD?: string;
  REQUESTS_WEBHOOK?: string;
  IP_SALT?: string;               // key for the daily visitor hash
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

// A write must come from a page on this site: the browser's Origin header (or Sec-Fetch-Site when there is none)
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (origin) return origin === new URL(req.url).origin;
  return req.headers.get('sec-fetch-site') === 'same-origin';
}

export class BadBody extends Error {}
export async function readJson(req: Request, limit: number): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > limit) throw new BadBody('too large');
  try {
    const v: unknown = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BadBody('not an object');
    return v as Record<string, unknown>;
  } catch (e) { throw e instanceof BadBody ? e : new BadBody('not json'); }
}

// Equal strings in constant time: both sides are hashed first, so length and content leak nothing
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i]! ^ v[i]!;
  return d === 0;
}

// /inbox/ and /api/requests: HTTP Basic auth against INBOX_PASSWORD (any user name). No password set = inbox off.
export async function inboxAllowed(req: Request, e: SiteEnv): Promise<'ok' | 'off' | 'ask'> {
  if (!e.INBOX_PASSWORD) return 'off';
  const h = req.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return 'ask';
  let decoded = '';
  try { decoded = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), c => c.charCodeAt(0))); } catch { return 'ask'; }
  const pass = decoded.slice(decoded.indexOf(':') + 1);
  return (await safeEqual(pass, e.INBOX_PASSWORD)) ? 'ok' : 'ask';
}
