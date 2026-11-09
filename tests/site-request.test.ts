// The request form: field checks (src/lib/site-request.ts), the API (src/lib/requests-api.ts) and the inbox password
// (src/lib/http.ts). Synthetic people and numbers only; fetch is stubbed, so nothing leaves the test.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanRequest, phone, ipKey, LIMIT_PER_HOUR } from '../src/lib/site-request';
import { submitRequest, listRequests, updateRequest, deleteRequest } from '../src/lib/requests-api';
import { inboxAllowed, safeEqual, type SiteEnv } from '../src/lib/http';

const E: SiteEnv = { SUPABASE_URL: 'https://sb.example', SUPABASE_SERVICE_ROLE_KEY: 'service', INBOX_PASSWORD: 'open-sesame' };
const SITE = 'https://apipeline.example';
const good = { kind: 'security', name: 'سارة', company: 'شركة تجربة', phone: '٠٥٠١٢٣٤٥٦٧', email: 'Test@Example.com', scope: ['web', 'nope', 'web'], message: 'نبي فحص', consent: true, page: '/security/', lang: 'ar', t: 9000 };

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('request fields', () => {
  it('Saudi mobiles in any shape become +9665…, other countries keep their code', () => {
    for (const v of ['0501234567', '501234567', '966501234567', '+966 50 123 4567', '00966501234567', '٠٥٠١٢٣٤٥٦٧']) expect(phone(v)).toBe('+966501234567');
    expect(phone('+971501234567')).toBe('+971501234567');
    for (const v of ['0401234567', '05012345', 'abc', '', '+966401234567']) expect(phone(v)).toBeNull();
  });
  it('a good request is cleaned: email lowercased, scope deduped and limited to known values', () => {
    expect(cleanRequest(good)).toEqual({ ok: true, data: { kind: 'security', name: 'سارة', company: 'شركة تجربة', phone: '+966501234567', email: 'test@example.com', scope: ['web'], message: 'نبي فحص', page: '/security/', lang: 'ar' } });
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

type Seen = { url: string; method: string; body?: string };
function world({ recent = 0, rows = [] as unknown[], storeStatus = 201 } = {}) {
  const seen: Seen[] = [];
  vi.stubGlobal('fetch', async (u: string | URL, init?: RequestInit) => {
    const url = String(u), method = init?.method ?? 'GET';
    seen.push({ url, method, ...(typeof init?.body === 'string' ? { body: init.body } : {}) });
    if (url.includes('/site_requests') && method === 'GET' && url.includes('ip_key=eq.')) return new Response(JSON.stringify(Array.from({ length: recent }, (_, i) => ({ id: i }))), { status: 200 });
    if (url.includes('/site_requests') && method === 'GET') return new Response(JSON.stringify(rows), { status: 200 });
    if (url.includes('/site_requests') && method === 'POST') return new Response('', { status: storeStatus });
    return new Response(null, { status: 204 });
  });
  return seen;
}
const H = (extra: Record<string, string> = {}) => ({ origin: SITE, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9', ...extra });
const send = (body: unknown, headers: Record<string, string> = {}, env: SiteEnv = E) =>
  submitRequest(new Request(`${SITE}/api/request`, { method: 'POST', body: JSON.stringify(body), headers: H(headers) }), env);
const inbox = (method: string, body?: unknown, query = '', headers: Record<string, string> = {}) =>
  new Request(`${SITE}/api/requests${query}`, { method, headers: H(headers), ...(body ? { body: JSON.stringify(body) } : {}) });

describe('POST /api/request', () => {
  it('stores the request with consent time and a visitor key, never the address; the log has no phone', async () => {
    const seen = world();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const r = await send(good);
    expect(r.status).toBe(200);
    const post = seen.find(s => s.url.endsWith('/rest/v1/site_requests') && s.method === 'POST')!;
    const row = JSON.parse(post.body!);
    expect(row).toMatchObject({ kind: 'security', phone: '+966501234567', scope: ['web'] });
    expect(row.consent_at).toMatch(/^\d{4}-/);
    expect(row.ip_key).toMatch(/^[0-9a-f]{32}$/);
    expect(post.body).not.toContain('203.0.113.9');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/9665|سارة|example\.com/);
  });
  it('a cross-site post is refused before anything is read or stored', async () => {
    const seen = world();
    expect((await send(good, { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect(seen).toEqual([]);
  });
  it('without Supabase set up, it says so and points to WhatsApp', async () => {
    const r = await send(good, {}, {});
    expect(r.status).toBe(503);
    expect((await r.json() as { error: string }).error).toContain('واتساب');
  });
  it('a bot gets OK and nothing is stored', async () => {
    const seen = world();
    expect((await send({ ...good, website: 'spam' })).status).toBe(200);
    expect(seen.some(s => s.method === 'POST')).toBe(false);
  });
  it('field errors come back per field, nothing stored', async () => {
    const seen = world();
    const r = await send({ ...good, phone: '12', consent: false });
    expect(r.status).toBe(400);
    expect(Object.keys((await r.json() as { fields: object }).fields).sort()).toEqual(['consent', 'phone']);
    expect(seen.some(s => s.method === 'POST')).toBe(false);
  });
  it('a body that is too big or not JSON is refused', async () => {
    world();
    expect((await submitRequest(new Request(`${SITE}/api/request`, { method: 'POST', body: 'x'.repeat(7000), headers: H() }), E)).status).toBe(400);
    expect((await submitRequest(new Request(`${SITE}/api/request`, { method: 'POST', body: '[1]', headers: H() }), E)).status).toBe(400);
  });
  it(`the ${LIMIT_PER_HOUR + 1}th request from one visitor in an hour waits`, async () => {
    const seen = world({ recent: LIMIT_PER_HOUR });
    expect((await send(good)).status).toBe(429);
    expect(seen.some(s => s.method === 'POST')).toBe(false);
  });
  it('a store that fails says so (and points to WhatsApp)', async () => {
    world({ storeStatus: 500 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await send(good);
    expect(r.status).toBe(503);
    expect((await r.json() as { error: string }).error).toContain('واتساب');
  });
  it('the webhook note says what was asked and where to read it, without phone or email', async () => {
    const seen = world();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await send(good, {}, { ...E, REQUESTS_WEBHOOK: 'https://hooks.example/abc' });
    const hook = seen.find(s => s.url === 'https://hooks.example/abc')!;
    expect(JSON.parse(hook.body!).text).toContain('فحص أمني');
    expect(JSON.parse(hook.body!).text).toContain(`${SITE}/inbox/`);
    expect(hook.body).not.toMatch(/9665|example\.com|0501/);
  });
});

describe('/api/requests (inbox)', () => {
  it('reads, filters, updates and deletes', async () => {
    const seen = world({ rows: [{ id: 1, kind: 'board', name: 'x', phone: '+966501234567', status: 'new' }] });
    const g = await listRequests(inbox('GET', undefined, '?status=new'), E);
    expect(g.status).toBe(200);
    expect((await g.json() as { requests: unknown[] }).requests).toHaveLength(1);
    expect(seen.find(s => s.url.includes('/site_requests?select='))!.url).toContain('status=eq.new');
    expect((await updateRequest(inbox('PATCH', { id: 1, status: 'contacted' }), E)).status).toBe(200);
    expect(JSON.parse(seen.find(s => s.method === 'PATCH')!.body!)).toMatchObject({ status: 'contacted' });
    expect((await updateRequest(inbox('PATCH', { id: 1, status: 'deleted' }), E)).status).toBe(400);
    expect((await deleteRequest(inbox('DELETE', { id: 1 }), E)).status).toBe(200);
    expect(seen.find(s => s.method === 'DELETE')!.url).toContain('id=eq.1');
  });
  it('changes from another site are refused (the browser sends the password on its own)', async () => {
    const seen = world();
    const evil = { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' };
    expect((await updateRequest(inbox('PATCH', { id: 1, status: 'closed' }, '', evil), E)).status).toBe(403);
    expect((await deleteRequest(inbox('DELETE', { id: 1 }, '', evil), E)).status).toBe(403);
    expect(seen).toEqual([]);
  });
  it('before the migration, it says which file to run', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ code: '42P01' }), { status: 404 }));
    const j = await (await listRequests(inbox('GET'), E)).json() as { missing?: string };
    expect(j.missing).toContain('001_site_requests.sql');
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
