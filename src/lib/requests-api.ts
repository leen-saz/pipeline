// What the endpoints do, kept apart from Astro so the tests can call it with a plain Request and env.
//   POST   /api/request    public: the request form on /, /security/ and /profile/ (src/pages/api/request.ts)
//   GET    /api/requests   inbox: the list, newest first, optional ?status=
//   PATCH  /api/requests   inbox: { id, status } new → contacted → closed
//   DELETE /api/requests   inbox: { id } removes the row for good (a visitor asking to be forgotten, PDPL)
// The public route guards itself: same-origin only, a honeypot and a minimum fill time, consent required, and at most
// LIMIT_PER_HOUR requests per visitor per hour (counted by a daily keyed hash, never the address itself).
// If REQUESTS_WEBHOOK is set, the owner gets a short note with no phone or email in it, only what was asked.
import { json, readJson, sameOrigin, type SiteEnv } from './http';
import { db, rest, missingTable, type Db } from './store';
import { cleanRequest, ipKey, LIMIT_PER_HOUR, KIND_AR, type SiteRequest } from './site-request';

const STATUSES = ['new', 'contacted', 'closed'];
const NOT_APPLIED = 'جدول الطلبات ما انضاف بعد: شغّل supabase/migrations/001_site_requests.sql في Supabase.';

async function notify(hook: string | undefined, r: SiteRequest, origin: string) {
  if (!hook || !/^https:\/\//.test(hook)) return;
  const text = `طلب جديد من موقع Apipeline: ${KIND_AR[r.kind]}${r.company ? ` · ${r.company}` : ''}${r.scope.length ? ` · ${r.scope.join('، ')}` : ''}\n${origin}/inbox/`;
  await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(4000) })
    .catch(() => { console.warn('site_request_notify_failed'); });
}

async function tooMany(d: Db, key: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const r = await rest<unknown[]>(d, `site_requests?ip_key=eq.${key}&at=gte.${encodeURIComponent(since)}&select=id&limit=${LIMIT_PER_HOUR}`);
  return r.ok && Array.isArray(r.data) && r.data.length >= LIMIT_PER_HOUR;
}

export async function submitRequest(req: Request, e: SiteEnv): Promise<Response> {
  const d = db(e);
  if (!d) return json(503, { error: 'الإرسال متوقف مؤقتًا، تواصل معنا واتساب' });
  if (!sameOrigin(req)) return json(403, { error: 'طلب مرفوض' });
  let body: Record<string, unknown>;
  try { body = await readJson(req, 6000); } catch { return json(400, { error: 'الطلب غير صالح' }); }
  const c = cleanRequest(body);
  if (!c.ok && 'bot' in c) return json(200, { ok: true });
  if (!c.ok) return json(400, { error: 'راجع الحقول المظللة', fields: c.errors });
  const key = await ipKey(req.headers.get('cf-connecting-ip') || 'unknown', e.IP_SALT || d.key);
  if (await tooMany(d, key)) return json(429, { error: 'وصلنا طلبك قبل شوي. بنتواصل معك قريب' });
  const w = await rest(d, 'site_requests', { method: 'POST', prefer: 'return=minimal', body: { ...c.data, consent_at: new Date().toISOString(), ip_key: key } });
  if (!w.ok) {
    console.error('site_request_store_failed', JSON.stringify({ status: w.status, missing: missingTable(w) }));
    return json(503, { error: 'ما قدرنا نحفظ الطلب الحين، تواصل معنا واتساب' });
  }
  // What was asked, never who asked: the log is not a place for phone numbers
  console.log(JSON.stringify({ event: 'site_request', kind: c.data.kind, page: c.data.page, scope: c.data.scope.length }));
  await notify(e.REQUESTS_WEBHOOK, c.data, new URL(req.url).origin);
  return json(200, { ok: true });
}

export async function listRequests(req: Request, e: SiteEnv): Promise<Response> {
  const d = db(e);
  if (!d) return json(503, { error: 'Supabase غير مربوط' });
  const status = new URL(req.url).searchParams.get('status');
  const filter = status && STATUSES.includes(status) ? `&status=eq.${status}` : '';
  const r = await rest<unknown[]>(d, `site_requests?select=id,at,kind,name,company,phone,email,scope,message,page,lang,status,handled_at${filter}&order=at.desc&limit=200`);
  if (missingTable(r)) return json(200, { requests: [], missing: NOT_APPLIED });
  if (!r.ok) return json(502, { error: 'ما قدرنا نقرا الطلبات' });
  return json(200, { requests: r.data });
}

export async function updateRequest(req: Request, e: SiteEnv): Promise<Response> {
  const d = db(e);
  if (!d) return json(503, { error: 'Supabase غير مربوط' });
  if (!sameOrigin(req)) return json(403, { error: 'طلب مرفوض' });
  let b: Record<string, unknown>;
  try { b = await readJson(req, 500); } catch { return json(400, { error: 'طلب غير صالح' }); }
  const id = Number(b.id);
  if (!Number.isInteger(id) || id < 1 || !STATUSES.includes(String(b.status))) return json(400, { error: 'طلب غير صالح' });
  const r = await rest(d, `site_requests?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: b.status, handled_at: b.status === 'new' ? null : new Date().toISOString() } });
  return r.ok ? json(200, { ok: true }) : json(502, { error: 'ما انحفظ التعديل' });
}

export async function deleteRequest(req: Request, e: SiteEnv): Promise<Response> {
  const d = db(e);
  if (!d) return json(503, { error: 'Supabase غير مربوط' });
  if (!sameOrigin(req)) return json(403, { error: 'طلب مرفوض' });
  let b: Record<string, unknown>;
  try { b = await readJson(req, 200); } catch { return json(400, { error: 'طلب غير صالح' }); }
  const id = Number(b.id);
  if (!Number.isInteger(id) || id < 1) return json(400, { error: 'طلب غير صالح' });
  const r = await rest(d, `site_requests?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
  return r.ok ? json(200, { ok: true }) : json(502, { error: 'ما انحذف الطلب' });
}
