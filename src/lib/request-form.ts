// The public request form (src/components/RequestForm.astro): sends
// the answers to /api/request, and puts the server's per-field messages next to their boxes.
// Messages arrive in Arabic; on English the page's i18n (public/assets/i18n.js) translates them as they appear.
const form = document.querySelector<HTMLFormElement>('[data-request-form]');
if (form) {
  const shown = performance.now();
  const kind = form.querySelector('select[name="kind"]') as unknown as HTMLSelectElement;
  const msg = form.querySelector<HTMLElement>('[data-msg]')!;
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const val = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '';

  // An error goes away as soon as the visitor fixes that box
  form.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    const err = t.name ? form.querySelector<HTMLElement>(`[data-err="${t.name}"]`) : null;
    if (err?.textContent) { err.textContent = ''; t.removeAttribute('aria-invalid'); }
  });
  // A link to #request from a page section can pre-pick what the visitor wants: <a href="#request" data-kind="leakmap">
  document.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-kind]');
    if (a && [...kind.options].some(o => o.value === a.dataset.kind)) kind.value = a.dataset.kind!;
  });

  const showErrors = (errors: Record<string, string>) => {
    form.querySelectorAll<HTMLElement>('[data-err]').forEach(el => {
      const m = errors[el.dataset.err!] ?? '';
      el.textContent = m;
      const input = form.elements.namedItem(el.dataset.err!) as HTMLInputElement | null;
      if (input && 'setAttribute' in input) { if (m) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    });
    const first = Object.keys(errors)[0];
    const el = first ? form.elements.namedItem(first) as HTMLElement | null : null;
    if (el) { el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); el.focus?.({ preventScroll: true }); }
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    showErrors({});
    msg.textContent = '';
    btn.disabled = true; btn.classList.add('loading');
    const body = {
      kind: kind.value, name: val('name'), company: val('company'), email: val('email'), message: val('message'),
      website: val('website'), consent: (form.elements.namedItem('consent') as HTMLInputElement).checked,
      page: location.pathname, lang: document.documentElement.lang === 'en' ? 'en' : 'ar', t: Math.round(performance.now() - shown),
    };
    try {
      const r = await fetch('/api/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({})) as { ok?: boolean; stored?: boolean; mailed?: boolean; error?: string; fields?: Record<string, string> };
      if (r.ok && j.ok && !j.mailed && form.dataset.mailTo) {
        const sent = await mailFromBrowser(form.dataset.mailTo, body);
        if (!sent && !j.stored) { msg.textContent = 'تعذّر إرسال طلبك الآن، حاول بعد قليل'; return; }
      }
      if (r.ok && j.ok) {
        form.querySelector<HTMLElement>('.st-fields')!.hidden = true;
        form.querySelector<HTMLElement>('.st-form-bar')!.hidden = true;
        form.querySelector<HTMLElement>('[data-done]')!.hidden = false;
        return;
      }
      if (j.fields) showErrors(j.fields);
      msg.textContent = j.error || 'صار خطأ، جرّب مرة ثانية';
    } catch {
      msg.textContent = 'ما وصل الطلب. تأكد من الاتصال وجرّب مرة ثانية';
    } finally {
      btn.disabled = false; btn.classList.remove('loading');
    }
  });
}

// FormSubmit (formsubmit.co) emails the owner. It takes submissions from browsers only, so the page sends it here.
// The first submission makes FormSubmit ask the owner to press «Activate» once; it counts as sent.
const KIND_LABEL: Record<string, string> = { board: 'تجربة لوحة Apipeline', leakmap: 'خريطة التسرب', other: 'استفسار آخر' };
async function mailFromBrowser(to: string, b: Record<string, unknown>): Promise<boolean> {
  const fields: Record<string, string> = {
    _subject: `طلب جديد من موقع Apipeline: ${KIND_LABEL[String(b.kind)] ?? ''}${b.company ? ` · ${b.company}` : ''}`,
    _template: 'table', _captcha: 'false', _replyto: String(b.email ?? ''),
    'الطلب': KIND_LABEL[String(b.kind)] ?? String(b.kind), 'الاسم': String(b.name ?? ''), 'الشركة': String(b.company || '—'),
    'الإيميل': String(b.email ?? ''), 'الرسالة': String(b.message || '—'), 'الصفحة': location.origin + String(b.page ?? '/'),
  };
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(fields) });
    const j = await r.json().catch(() => ({})) as { success?: string | boolean; message?: string };
    return r.ok && (String(j.success) === 'true' || /activat/i.test(j.message ?? ''));
  } catch { return false; }
}
