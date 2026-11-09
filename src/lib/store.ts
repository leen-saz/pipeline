// The requests table in Supabase (supabase/migrations/001_site_requests.sql), over its REST API with the service key.
// Server only: the table has row level security on and no policies, so nothing else can read it.
import type { SiteEnv } from './http';

export interface Db { url: string; key: string }
export function db(e: SiteEnv): Db | null {
  return e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY ? { url: e.SUPABASE_URL.replace(/\/+$/, ''), key: e.SUPABASE_SERVICE_ROLE_KEY } : null;
}

export async function rest<T = unknown>(d: Db, path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
  const headers: Record<string, string> = { apikey: d.key, authorization: `Bearer ${d.key}` };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.prefer) headers.prefer = init.prefer;
  try {
    const r = await fetch(`${d.url}/rest/v1/${path}`, {
      method: init.method ?? 'GET', headers, signal: AbortSignal.timeout(8000),
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    const text = await r.text();
    let data: T | null = null;
    try { data = text ? JSON.parse(text) as T : null; } catch { /* not json */ }
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// PostgREST says 42P01 / PGRST205 when the table is not there yet (the migration was not run)
export const missingTable = (r: { status: number; data: unknown }) =>
  r.status === 404 || /42P01|PGRST205/.test(JSON.stringify(r.data ?? ''));
