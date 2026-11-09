-- Requests sent from the Apipeline site (/, /security/, /profile/) through src/lib/requests-api.ts. Cloudflare D1 (SQLite).
-- Personal data under PDPL: collected only with the visitor's consent (consent_at), used only to answer the request,
-- read and deleted by the owner in /inbox/. No IP is stored: ip_key is a keyed hash that changes every day, used only
-- to limit how many requests one visitor sends in an hour. Times are ISO 8601 UTC strings; scope is a JSON array.
create table if not exists site_requests (
  id integer primary key autoincrement,
  at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  kind text not null check (kind in ('board', 'leakmap', 'security', 'other')),
  name text not null check (length(name) between 2 and 80),
  company text check (company is null or length(company) <= 120),
  phone text not null check (phone glob '+[1-9]*' and length(phone) between 9 and 16),
  email text check (email is null or length(email) <= 254),
  scope text not null default '[]' check (json_valid(scope)),
  message text check (message is null or length(message) <= 1500),
  page text not null default '/',
  lang text not null default 'ar' check (lang in ('ar', 'en')),
  consent_at text not null,
  ip_key text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  handled_at text
);
create index if not exists site_requests_at_idx on site_requests (at desc);
create index if not exists site_requests_ip_idx on site_requests (ip_key, at);
