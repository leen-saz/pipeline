// Every response the Worker makes gets the security headers (static files get the same from public/_headers),
// and the inbox (/inbox/, /api/requests) asks for the INBOX_PASSWORD first.
import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { inboxAllowed, json } from './lib/http';

const HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

const isInbox = (p: string) => p === '/inbox' || p.startsWith('/inbox/') || p === '/api/requests';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const inbox = isInbox(ctx.url.pathname);
  let res: Response;
  if (inbox) {
    const a = await inboxAllowed(ctx.request, env);
    if (a === 'off') res = json(503, { error: 'صندوق الطلبات مقفل: حط INBOX_PASSWORD في أسرار الـ Worker' });
    else if (a === 'ask') res = new Response('Password required', { status: 401, headers: { 'www-authenticate': 'Basic realm="Apipeline inbox", charset="UTF-8"' } });
    else res = await next();
  } else res = await next();
  // Some responses come with locked headers: a copy can take ours
  res = new Response(res.body, res);
  for (const [k, v] of Object.entries(HEADERS)) if (!res.headers.has(k)) res.headers.set(k, v);
  if (inbox) { res.headers.set('cache-control', 'no-store'); res.headers.set('x-robots-tag', 'noindex'); }
  return res;
});
