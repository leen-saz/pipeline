// Worker secrets (wrangler secret put …). wrangler types only knows the vars and bindings in wrangler.jsonc.
declare namespace Cloudflare {
  interface Env {
    INBOX_PASSWORD?: string;
    REQUESTS_WEBHOOK?: string;
    IP_SALT?: string;
  }
}
