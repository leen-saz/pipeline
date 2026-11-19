// The request form: field checks (src/lib/site-request.ts), the API (src/lib/requests-api.ts) on a real SQLite copy of
// the D1 table (migrations/0001_site_requests.sql, through node:sqlite), and the inbox password (src/lib/http.ts).
// Synthetic people and numbers only; fetch is stubbed for the webhook, so nothing leaves the test.
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanRequest, phone, ipKey, LIMIT_PER_HOUR } from '../src/lib/site-request';
import { submitRequest, listRequests, updateRequest, deleteRequest } from '../src/lib/requests-api';
import { inboxAllowed, safeEqual, type SiteEnv } from '../src/lib/http';
import MIGRATION from '../migrations/0001_site_requests.sql?raw';
import MIGRATION_2 from '../migrations/0002_phone_optional.sql?raw';

// node:sqlite behind the few D1 calls the store makes (prepare → bind → first / all / run)
const { DatabaseSync } = await import('node:sqlite' as string);
function d1(migrate = true): { db: D1Database; sql: { prepare(q: string): { all(...a: unknown[]): Record<string, unknown>[] } } } {
  const sql = new DatabaseSync(':memory:');
  if (migrate) { sql.exec(MIGRATION); sql.exec(MIGRATION_2); }
  const prepare = (q: string) => {
    let args: unknown[] = [];
    const st = {
      bind: (...a: unknown[]) => { args = a; return st; },
      first: async () => sql.prepare(q).get(...args) ?? null,
      all: async () => ({ results: sql.prepare(q).all(...args) }),
      run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...args).changes) } }),
    };
    return st;
  };
  return { db: { prepare } as unknown as D1Database, sql };
}
let E: SiteEnv & { DB: D1Database };
let SQL: ReturnType<typeof d1>['sql'];
beforeEach(() => { const x = d1(); SQL = x.sql; E = { DB: x.db, IP_SALT: 'salt', INBOX_PASSWORD: 'open-sesame' }; });
const rows = () => SQL.prepare('select * from site_requests order by id').all();
const SITE = 'https://apipeline.example';
const good = { kind: 'security', name: 'سارة', company: 'شركة تجربة', email: 'Test@Example.com', scope: ['web', 'nope', 'web'], message: 'نبي فحص', consent: true, page: '/security/', lang: 'ar', t: 9000 };

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('request fields', () => {
  it('Saudi mobiles in any shape become +9665…, other countries keep their code', () => {
    for (const v of ['0501234567', '501234567', '966501234567', '+966 50 123 4567', '00966501234567', '٠٥٠١٢٣٤٥٦٧']) expect(phone(v)).toBe('+966501234567');
    expect(phone('+971501234567')).toBe('+971501234567');
    for (const v of ['0401234567', '05012345', 'abc', '', '+966401234567']) expect(phone(v)).toBeNull();
  });
  it('a good request is cleaned: email lowercased, scope deduped and limited to known values', () => {
    expect(cleanRequest(good)).toEqual({ ok: true, data: { kind: 'security', name: 'سارة', company: 'شركة تجربة', phone: null, email: 'test@example.com', scope: ['web'], message: 'نبي فحص', page: '/security/', lang: 'ar' } });
  });
  it('the home page is "/", and unknown kinds and pages fall back', () => {
    expect(cleanRequest({ ...good, page: '/' })).toMatchObject({ ok: true, data: { page: '/' } });
    expect(cleanRequest({ ...good, page: '/profile/' })).toMatchObject({ ok: true, data: { page: '/profile/' } });
    const c = cleanRequest({ ...good, kind: 'hack', page: '/admin/' });
    expect(c.ok && c.data).toMatchObject({ kind: 'other', scope: [], page: '/' });
  });
  it('every problem comes back keyed by field', () => {
    const c = cleanRequest({ name: 'x', phone: '123', email: 'bad', consent: false, t: 9000 });
    expect(c.ok).toBe(false);
    expect(Object.keys((c as { errors: object }).errors).sort()).toEqual(['consent', 'email', 'name', 'phone']);
  });
  it('the honeypot and a too-fast submit are treated as a bot', () => {
    expect(cleanRequest({ ...good, website: 'http://spam' })).toEqual({ ok: false, bot: true });
    expect(cleanRequest({ ...good, t: 300 })).toEqual({ ok: false, bot: true });
  });
  it('the visitor key is not the address, and changes by day', async () => {
    const a = await ipKey('203.0.113.9', 'k', '2026-11-09');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain('203');
    expect(await ipKey('203.0.113.9', 'k', '2026-11-09')).toBe(a);
    expect(await ipKey('203.0.113.9', 'k', '2026-11-10')).not.toBe(a);
  });
});

const H = (extra: Record<string, string> = {}) => ({ origin: SITE, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...extra });
const send = (body: unknown, headers: Record<string, string> = {}, env: SiteEnv = E) =>
  submitRequest(new Request(`${SITE}/api/request`, { method: 'POST', body: JSON.stringify(body), headers: H(headers) }), env);
const inbox = (method: string, body?: unknown, query = '', headers: Record<string, string> = {}) =>
  new Request(`${SITE}/api/requests${query}`, { method, headers: H(headers), ...(body ? { body: JSON.stringify(body) } : {}) });
const quiet = () => vi.spyOn(console, 'log').mockImplementation(() => {});

describe('POST /api/request', () => {
  it('stores the request with consent time and a visitor key, never the address; the log has no phone', async () => {
    const log = quiet();
    expect((await send(good)).status).toBe(200);
    const [row] = rows();
    expect(row).toMatchObject({ kind: 'security', phone: null, email: 'test@example.com', scope: '["web"]', status: 'new', page: '/security/' });
    expect(String(row!.consent_at)).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(String(row!.at)).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
    expect(row!.ip_key).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(row)).not.toContain('203.0.113.9');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/9665|سارة|example\.com/);
  });
  it('a cross-site post is refused and nothing is stored', async () => {
    expect((await send(good, { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect(rows()).toEqual([]);
  });
  it('without the database, the salt or an email address, it says so', async () => {
    for (const env of [{}, { DB: E.DB }]) {
      const r = await send(good, {}, env);
      expect(r.status).toBe(503);
      expect((await r.json() as { error: string }).error).toContain('حاول بعد قليل');
    }
  });
  it('a bot gets OK and nothing is stored', async () => {
    expect((await send({ ...good, website: 'spam' })).status).toBe(200);
    expect(rows()).toEqual([]);
  });
  it('field errors come back per field, nothing stored', async () => {
    const r = await send({ ...good, email: 'nope', consent: false });
    expect(r.status).toBe(400);
    expect(Object.keys((await r.json() as { fields: object }).fields).sort()).toEqual(['consent', 'email']);
    expect(rows()).toEqual([]);
  });
  it('a body that is too big or not JSON is refused', async () => {
    expect((await submitRequest(new Request(`${SITE}/api/request`, { method: 'POST', body: 'x'.repeat(7000), headers: H() }), E)).status).toBe(400);
    expect((await submitRequest(new Request(`${SITE}/api/request`, { method: 'POST', body: '[1]', headers: H() }), E)).status).toBe(400);
  });
  it(`the ${LIMIT_PER_HOUR + 1}th request from one visitor in an hour waits; another visitor does not`, async () => {
    quiet();
    for (let i = 0; i < LIMIT_PER_HOUR; i++) expect((await send(good)).status).toBe(200);
    expect((await send(good)).status).toBe(429);
    expect((await send(good, { 'cf-connecting-ip': '198.51.100.7' })).status).toBe(200);
    expect(rows()).toHaveLength(LIMIT_PER_HOUR + 1);
  });
  it('the table itself refuses what the form would never send', () => {
    const bad = (cols: string) => () => SQL.prepare(`insert into site_requests (kind, name, phone, consent_at, ip_key${cols ? ', ' + cols.split('=')[0] : ''}) values ('board', 'سارة', '+966501234567', 'x', 'k'${cols ? ", '" + cols.split('=')[1] + "'" : ''})`).all();
    expect(bad('')).not.toThrow();
    expect(bad('status=deleted')).toThrow();
    expect(bad('lang=fr')).toThrow();
    expect(bad('scope=not json')).toThrow();
  });
  it('before the migration and with no email, a submit says it could not send', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await send(good, {}, { ...E, DB: d1(false).db });
    expect(r.status).toBe(503);
    expect((await r.json() as { error: string }).error).toContain('حاول بعد قليل');
  });
  it('the webhook note says what was asked and where to read it, without phone or email', async () => {
    quiet();
    const seen: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', async (u: string, init: RequestInit) => { seen.push({ url: String(u), body: String(init.body) }); return new Response(null, { status: 204 }); });
    await send(good, {}, { ...E, REQUESTS_WEBHOOK: 'https://hooks.example/abc' });
    const hook = seen.find(s => s.url === 'https://hooks.example/abc')!;
    expect(JSON.parse(hook.body).text).toContain('فحص أمني');
    expect(JSON.parse(hook.body).text).toContain(`${SITE}/inbox/`);
    expect(hook.body).not.toMatch(/9665|example\.com|0501/);
  });
});

describe('/api/requests (inbox)', () => {
  it('reads newest first, filters, updates and deletes', async () => {
    quiet();
    await send(good); await send({ ...good, kind: 'board', page: '/' }, { 'cf-connecting-ip': '198.51.100.7' });
    const all = await (await listRequests(inbox('GET'), E)).json() as { requests: { id: number; kind: string; scope: string[] }[] };
    expect(all.requests.map(r => r.kind)).toEqual(['board', 'security']);
    expect(all.requests[1]!.scope).toEqual(['web']);
    const id = all.requests[1]!.id;
    expect((await updateRequest(inbox('PATCH', { id, status: 'contacted' }), E)).status).toBe(200);
    expect(rows().find(r => r.id === id)).toMatchObject({ status: 'contacted' });
    expect(String(rows().find(r => r.id === id)!.handled_at)).toMatch(/^\d{4}-/);
    const only = await (await listRequests(inbox('GET', undefined, '?status=contacted'), E)).json() as { requests: unknown[] };
    expect(only.requests).toHaveLength(1);
    expect((await updateRequest(inbox('PATCH', { id, status: 'deleted' }), E)).status).toBe(400);
    expect((await updateRequest(inbox('PATCH', { id: 999, status: 'closed' }), E)).status).toBe(404);
    expect((await deleteRequest(inbox('DELETE', { id }), E)).status).toBe(200);
    expect(rows()).toHaveLength(1);
    expect((await deleteRequest(inbox('DELETE', { id }), E)).status).toBe(404);
  });
  it('changes from another site are refused (the browser sends the password on its own)', async () => {
    quiet(); await send(good);
    const evil = { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' };
    expect((await updateRequest(inbox('PATCH', { id: 1, status: 'closed' }, '', evil), E)).status).toBe(403);
    expect((await deleteRequest(inbox('DELETE', { id: 1 }, '', evil), E)).status).toBe(403);
    expect(rows()[0]).toMatchObject({ status: 'new' });
  });
  it('before the migration, it says which command to run', async () => {
    const j = await (await listRequests(inbox('GET'), { ...E, DB: d1(false).db })).json() as { missing?: string };
    expect(j.missing).toContain('d1 migrations apply');
  });
});

describe('inbox password', () => {
  const basic = (user: string, pass: string) => ({ authorization: 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${pass}`))) });
  const ask = (h: Record<string, string> = {}) => new Request(`${SITE}/inbox/`, { headers: h });
  it('no password set: the inbox is off', async () => {
    expect(await inboxAllowed(ask(basic('a', 'x')), {})).toBe('off');
  });
  it('asks until the right password comes, with any user name', async () => {
    expect(await inboxAllowed(ask(), E)).toBe('ask');
    expect(await inboxAllowed(ask(basic('leen', 'wrong')), E)).toBe('ask');
    expect(await inboxAllowed(ask({ authorization: 'Basic %%%' }), E)).toBe('ask');
    expect(await inboxAllowed(ask(basic('leen', 'open-sesame')), E)).toBe('ok');
    expect(await inboxAllowed(ask(basic('', 'open-sesame')), E)).toBe('ok');
  });
  it('a password with a colon or Arabic letters works', async () => {
    const e = { ...E, INBOX_PASSWORD: 'كلمة:سر' };
    expect(await inboxAllowed(ask(basic('x', 'كلمة:سر')), e)).toBe('ok');
  });
  it('safeEqual compares whole strings', async () => {
    expect(await safeEqual('abc', 'abc')).toBe(true);
    expect(await safeEqual('abc', 'abd')).toBe(false);
    expect(await safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('emailing a request', () => {
  const to = 'owner@example.test';
  const capture = () => {
    const seen: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (u: string, init: RequestInit) => { seen.push({ url: String(u), init }); return new Response('{}', { status: 200 }); });
    return seen;
  };
  it('goes to the owner through FormSubmit with every field, and is stored too', async () => {
    quiet(); const seen = capture();
    expect((await send(good, {}, { ...E, REQUESTS_EMAIL_TO: to })).status).toBe(200);
    const m = seen.find(s => s.url.startsWith('https://formsubmit.co/ajax/'))!;
    expect(m.url).toBe(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`);
    const b = JSON.parse(String(m.init.body));
    expect(b['الإيميل']).toBe('test@example.com');
    expect(b['الجوال']).toBeUndefined();
    expect(b['الاسم']).toBe('سارة');
    expect(b._replyto).toBe('test@example.com');
    expect(rows()).toHaveLength(1);
  });
  it('uses Resend when a key and sender are set', async () => {
    quiet(); const seen = capture();
    await send(good, {}, { ...E, REQUESTS_EMAIL_TO: to, RESEND_API_KEY: 'k', MAIL_FROM: 'site@example.test' });
    const m = seen.find(s => s.url === 'https://api.resend.com/emails')!;
    expect(JSON.parse(String(m.init.body)).to).toEqual([to]);
  });
  it('with no database, an email alone is enough', async () => {
    quiet(); capture();
    expect((await send(good, {}, { REQUESTS_EMAIL_TO: to })).status).toBe(200);
  });
  it('when the mail is refused and nothing was stored, the visitor is told', async () => {
    quiet(); vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    const r = await send(good, {}, { REQUESTS_EMAIL_TO: to });
    expect(r.status).toBe(503);
  });
});
