// The requests table in Cloudflare D1 (migrations/0001_site_requests.sql). Only the Worker can reach it: D1 has no
// public endpoint, so the binding is the whole access control.
import type { SiteRequest } from './site-request';

export interface Row extends Omit<SiteRequest, 'scope'> { id: number; at: string; scope: string[]; status: string; handled_at: string | null }

// D1 says "no such table" until the migration has been applied
export const missingTable = (e: unknown) => /no such table/i.test(String((e as Error)?.message ?? e));

export async function recentCount(db: D1Database, key: string, sinceIso: string): Promise<number> {
  const r = await db.prepare('select count(*) as n from site_requests where ip_key = ?1 and at >= ?2').bind(key, sinceIso).first<{ n: number }>();
  return r?.n ?? 0;
}

export async function insertRequest(db: D1Database, r: SiteRequest, consentAt: string, key: string): Promise<void> {
  await db.prepare(`insert into site_requests (kind, name, company, phone, email, scope, message, page, lang, consent_at, ip_key)
    values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
    .bind(r.kind, r.name, r.company, r.phone, r.email, JSON.stringify(r.scope), r.message, r.page, r.lang, consentAt, key).run();
}

export async function listRows(db: D1Database, status: string | null): Promise<Row[]> {
  const sql = `select id, at, kind, name, company, phone, email, scope, message, page, lang, status, handled_at from site_requests
    ${status ? 'where status = ?1' : ''} order by at desc, id desc limit 200`;
  const stmt = status ? db.prepare(sql).bind(status) : db.prepare(sql);
  const { results } = await stmt.all<Omit<Row, 'scope'> & { scope: string }>();
  return results.map(x => ({ ...x, scope: (() => { try { return JSON.parse(x.scope) as string[]; } catch { return []; } })() }));
}

export async function setStatus(db: D1Database, id: number, status: string): Promise<boolean> {
  const r = await db.prepare('update site_requests set status = ?1, handled_at = ?2 where id = ?3')
    .bind(status, status === 'new' ? null : new Date().toISOString(), id).run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function deleteRow(db: D1Database, id: number): Promise<boolean> {
  const r = await db.prepare('delete from site_requests where id = ?1').bind(id).run();
  return (r.meta?.changes ?? 0) > 0;
}
