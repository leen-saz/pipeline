// What the endpoints do, kept apart from Astro so the tests can call it with a plain Request and env.
//   POST   /api/request    public: the request form on /, /profile/ and the Security site (src/pages/api/request.ts)
//   GET    /api/requests   inbox: the list, newest first, optional ?status=
//   PATCH  /api/requests   inbox: { id, status } new → contacted → closed
//   DELETE /api/requests   inbox: { id } removes the row for good (a visitor asking to be forgotten, PDPL)
// The public route guards itself: same-origin only, a honeypot and a minimum fill time, consent required, and at most
// LIMIT_PER_HOUR requests per visitor per hour (counted by a daily keyed hash, never the address itself).
// If REQUESTS_WEBHOOK is set, the owner gets a short note with no phone or email in it, only what was asked.
import { json, readJson, sameOrigin, type SiteEnv } from './http';
import { recentCount, insertRequest, listRows, setStatus, deleteRow, missingTable } from './store';
import { cleanRequest, ipKey, LIMIT_PER_HOUR, KIND_AR, type SiteRequest } from './site-request';
import { mailRequest } from './mail';

const STATUSES = ['new', 'contacted', 'closed'];
const NOT_APPLIED = 'جدول الطلبات ما انضاف بعد: شغّل npx wrangler d1 migrations apply apipeline-site --remote';
const OFF = 'قاعدة الطلبات غير مربوطة';
const PAUSED = 'الإرسال متوقف مؤقتًا، جرّب بعد شوي';
const FAILED = 'ما قدرنا نرسل طلبك الحين، جرّب بعد شوي';

async function notify(hook: string | undefined, r: SiteRequest, origin: string) {
  if (!hook || !/^https:\/\//.test(hook)) return;
  const text = `طلب جديد من موقع Apipeline: ${KIND_AR[r.kind]}${r.company ? ` · ${r.company}` : ''}${r.scope.length ? ` · ${r.scope.join('، ')}` : ''}\n${origin}/inbox/`;
  await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(4000) })
    .catch(() => { console.warn('site_request_notify_failed'); });
}

// The request is emailed to the owner and kept in D1 (the inbox). It counts as sent when either one worked.
export async function submitRequest(req: Request, e: SiteEnv): Promise<Response> {
  const db = e.DB;
  if ((!db || !e.IP_SALT) && !e.REQUESTS_EMAIL_TO) return json(503, { error: PAUSED });
  if (!sameOrigin(req)) return json(403, { error: 'طلب مرفوض' });
  let body: Record<string, unknown>;
  try { body = await readJson(req, 6000); } catch { return json(400, { error: 'الطلب غير صالح' }); }
  const c = cleanRequest(body);
  if (!c.ok && 'bot' in c) return json(200, { ok: true });
  if (!c.ok) return json(400, { error: 'راجع الحقول المظللة', fields: c.errors });
  let stored = false;
  if (db && e.IP_SALT) {
    const key = await ipKey(req.headers.get('cf-connecting-ip') || 'unknown', e.IP_SALT);
    try {
      if (await recentCount(db, key, new Date(Date.now() - 3600_000).toISOString()) >= LIMIT_PER_HOUR) return json(429, { error: 'وصلنا طلبك قبل شوي. بنتواصل معك قريب' });
      await insertRequest(db, c.data, new Date().toISOString(), key);
      stored = true;
    } catch (err) {
      console.error('site_request_store_failed', JSON.stringify({ missing: missingTable(err) }));
    }
  }
  const origin = new URL(req.url).origin;
  const mailed = await mailRequest(e, c.data, origin);
  if (!stored && !mailed) return json(503, { error: FAILED });
  // What was asked, never who asked: the log is not a place for phone numbers
  console.log(JSON.stringify({ event: 'site_request', kind: c.data.kind, page: c.data.page, scope: c.data.scope.length, stored, mailed }));
  await notify(e.REQUESTS_WEBHOOK, c.data, origin);
  return json(200, { ok: true });
}

export async function listRequests(req: Request, e: SiteEnv): Promise<Response> {
  if (!e.DB) return json(503, { error: OFF });
  const status = new URL(req.url).searchParams.get('status');
  try { return json(200, { requests: await listRows(e.DB, status && STATUSES.includes(status) ? status : null) }); }
  catch (err) { return missingTable(err) ? json(200, { requests: [], missing: NOT_APPLIED }) : json(502, { error: 'ما قدرنا نقرا الطلبات' }); }
}

async function idFrom(req: Request, limit: number): Promise<{ id: number; b: Record<string, unknown> } | null> {
  try { const b = await readJson(req, limit); const id = Number(b.id); return Number.isInteger(id) && id > 0 ? { id, b } : null; } catch { return null; }
}

export async function updateRequest(req: Request, e: SiteEnv): Promise<Response> {
  if (!e.DB) return json(503, { error: OFF });
  if (!sameOrigin(req)) return json(403, { error: 'طلب مرفوض' });
  const x = await idFrom(req, 500);
  if (!x || !STATUSES.includes(String(x.b.status))) return json(400, { error: 'طلب غير صالح' });
  try { return (await setStatus(e.DB, x.id, String(x.b.status))) ? json(200, { ok: true }) : json(404, { error: 'ما لقينا الطلب' }); }
  catch { return json(502, { error: 'ما انحفظ التعديل' }); }
}

export async function deleteRequest(req: Request, e: SiteEnv): Promise<Response> {
  if (!e.DB) return json(503, { error: OFF });
  if (!sameOrigin(req)) return json(403, { error: 'طلب مرفوض' });
  const x = await idFrom(req, 200);
  if (!x) return json(400, { error: 'طلب غير صالح' });
  try { return (await deleteRow(e.DB, x.id)) ? json(200, { ok: true }) : json(404, { error: 'ما لقينا الطلب' }); }
  catch { return json(502, { error: 'ما انحذف الطلب' }); }
}
