// Worker secrets (wrangler secret put …). wrangler types only knows the vars in wrangler.jsonc, so they are added here.
declare namespace Cloudflare {
  interface Env {
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    INBOX_PASSWORD?: string;
    REQUESTS_WEBHOOK?: string;
    IP_SALT?: string;
  }
}
