// The inbox (/inbox/): list the requests, change their status, delete one for good. Text is set with textContent,
// never as HTML, because everything here was typed by a visitor.
const KIND: Record<string, string> = { board: 'تجربة اللوحة', leakmap: 'خريطة التسرب', security: 'فحص أمني', other: 'استفسار' };
const SCOPE: Record<string, string> = { code: 'الكود', web: 'الموقع والـ API', mobile: 'تطبيق الجوال', cloud: 'السحابة والإعدادات' };
const STATUS: Record<string, string> = { new: 'جديد', contacted: 'تواصلنا', closed: 'مقفل' };

interface Req { id: number; at: string; kind: string; name: string; company: string | null; phone: string | null; email: string | null; scope: string[]; message: string | null; page: string; status: string }

const list = document.getElementById('rq-list')!;
const msg = document.getElementById('msg')!;
const filter = document.getElementById('rq-filter') as unknown as HTMLSelectElement;
const en = () => document.documentElement.lang === 'en';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<Record<string, string>> = {}, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v != null) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

async function call(method: string, body?: unknown, query = ''): Promise<Record<string, unknown>> {
  // location.origin, not a relative path: a page opened as https://user:pass@… cannot fetch a relative URL
  const r = await fetch(location.origin + '/api/requests' + query, { method, headers: body ? { 'content-type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = await r.json().catch(() => ({})) as Record<string, unknown>;
  if (!r.ok) throw new Error(String(j.error || 'صار خطأ، جرّب مرة ثانية'));
  return j;
}

function card(r: Req): HTMLElement {
  const a = el('article', { class: 'rq', 'data-id': String(r.id), 'data-status': r.status });
  const head = el('div', { class: 'rq-head' });
  head.appendChild(el('b', {}, r.name));
  if (r.company) head.appendChild(el('span', { class: 'muted' }, r.company));
  head.appendChild(el('span', { class: 'chip' }, KIND[r.kind] ?? KIND.other!));
  for (const s of r.scope ?? []) head.appendChild(el('span', { class: 'chip' }, SCOPE[s] ?? s));
  head.appendChild(el('time', { class: 'muted', datetime: r.at }, new Date(r.at).toLocaleString(en() ? 'en-GB' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' })));
  a.appendChild(head);
  const meta = el('div', { class: 'rq-meta' });
  if (r.phone) meta.appendChild(el('a', { href: `tel:${r.phone}`, dir: 'ltr' }, r.phone));
  if (r.email) meta.appendChild(el('a', { href: `mailto:${r.email}`, dir: 'ltr' }, r.email));
  meta.appendChild(el('span', { class: 'muted', dir: 'ltr' }, r.page));
  a.appendChild(meta);
  if (r.message) a.appendChild(el('p', { class: 'rq-msg' }, r.message));
  const acts = el('div', { class: 'rq-acts' });
  const sel = el('select', { 'aria-label': 'الحالة', 'data-status-select': '' });
  for (const [k, v] of Object.entries(STATUS)) { const o = el('option', { value: k }, v); if (k === r.status) o.setAttribute('selected', ''); sel.appendChild(o); }
  acts.appendChild(sel);
  acts.appendChild(el('button', { class: 'btn ghost sm', type: 'button', 'data-del': '' }, 'حذف'));
  a.appendChild(acts);
  return a;
}

async function load() {
  msg.textContent = '';
  list.replaceChildren(el('p', { class: 'muted' }, 'يحمّل…'));
  try {
    const j = await call('GET', undefined, filter.value ? `?status=${filter.value}` : '');
    if (j.missing) { list.replaceChildren(); msg.textContent = String(j.missing); return; }
    const rows = (j.requests ?? []) as Req[];
    list.replaceChildren(...(rows.length ? rows.map(card) : [el('p', { class: 'muted' }, 'ما وصل طلب للحين.')]));
  } catch (err) { list.replaceChildren(); msg.textContent = (err as Error).message; }
}

filter.addEventListener('change', load);
list.addEventListener('change', async e => {
  const sel = (e.target as HTMLElement).closest('[data-status-select]') as unknown as HTMLSelectElement | null; if (!sel) return;
  const art = sel.closest('.rq') as HTMLElement;
  try { await call('PATCH', { id: Number(art.dataset.id), status: sel.value }); art.dataset.status = sel.value; msg.textContent = 'انحفظ.'; }
  catch (err) { msg.textContent = (err as Error).message; }
});
list.addEventListener('click', async e => {
  const b = (e.target as HTMLElement).closest('[data-del]') as HTMLButtonElement | null; if (!b) return;
  if (!confirm(en() ? 'Delete this request for good? This cannot be undone.' : 'تحذف هالطلب نهائيًا؟ ما تقدر ترجعه.')) return;
  const art = b.closest('.rq') as HTMLElement;
  b.disabled = true;
  try { await call('DELETE', { id: Number(art.dataset.id) }); art.remove(); msg.textContent = 'انحذف.'; }
  catch (err) { msg.textContent = (err as Error).message; b.disabled = false; }
});
load();
