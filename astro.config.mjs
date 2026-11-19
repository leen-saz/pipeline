// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// The pages are built ahead of time; only /api/* and the inbox run on the Worker.
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  security: {
    checkOrigin: true,
    // Strict CSP: Astro hashes its own scripts and styles; nothing inline without a hash. Fonts are served from /assets/fonts.
    // Framing is refused by the X-Frame-Options header (src/middleware.ts, public/_headers): a <meta> CSP cannot do it.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://formsubmit.co",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ],
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
});
