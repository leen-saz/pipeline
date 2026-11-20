// Emails each site request to the owner. The address is REQUESTS_EMAIL_TO (a Worker var or secret).
// With RESEND_API_KEY it goes through Resend from the server (MAIL_FROM, or Resend's own test sender, which can mail the
// Resend account's own address with no domain to verify); otherwise through FormSubmit's AJAX endpoint, which needs no
// key: the first message asks the owner to click «Activate» once, and every message after that is delivered.
// Returns true only when the provider accepted the message. Never logs the visitor's details.
import { KIND_AR, type SiteRequest } from './site-request';

// Resend's shared sender: works before any domain is verified, but only to the address the Resend account was opened with
export const RESEND_TEST_FROM = 'Apipeline <onboarding@resend.dev>';

export interface MailEnv { REQUESTS_EMAIL_TO?: string; RESEND_API_KEY?: string; MAIL_FROM?: string }

export function requestLines(r: SiteRequest): [string, string][] {
  const rows: [string, string | null][] = [
    ['الطلب', KIND_AR[r.kind]], ['الاسم', r.name], ['الشركة', r.company], ['الجوال', r.phone], ['الإيميل', r.email],
    ['الرسالة', r.message],
    ['الصفحة', r.page], ['اللغة', r.lang === 'en' ? 'English' : 'عربي'],
  ];
  return rows.filter((x): x is [string, string] => !!x[1]);
}

export async function mailRequest(e: MailEnv, r: SiteRequest, origin: string, f: typeof fetch = fetch): Promise<boolean> {
  const to = (e.REQUESTS_EMAIL_TO || '').trim();
  if (!to) return false;
  const subject = `طلب جديد من موقع Apipeline: ${KIND_AR[r.kind]}${r.company ? ` · ${r.company}` : ''}`;
  const lines = requestLines(r);
  const text = lines.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nكل الطلبات: ${origin}/inbox/`;
  try {
    const key = (e.RESEND_API_KEY || '').trim(), from = (e.MAIL_FROM || '').trim() || RESEND_TEST_FROM;
    const res = key && from
      ? await f('https://api.resend.com/emails', {
          method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from, to: [to], subject, text, ...(r.email ? { reply_to: r.email } : {}) }), signal: AbortSignal.timeout(6000),
        })
      : await f(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
          method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', origin, referer: `${origin}/` },
          body: JSON.stringify({ _subject: subject, _template: 'table', _captcha: 'false', ...(r.email ? { _replyto: r.email } : {}), ...Object.fromEntries(lines) }),
          signal: AbortSignal.timeout(6000),
        });
    if (!res.ok) console.error('site_request_mail_status', res.status);
    return res.ok;
  } catch { console.error('site_request_mail_failed'); return false; }
}
