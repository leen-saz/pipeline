-- The request form asks for an email now, not a phone (Leen, 2026-11). SQLite cannot drop a NOT NULL in place, so the
-- table is rebuilt with phone optional (still checked when present) and every existing row copied as is.
create table site_requests_new (
  id integer primary key autoincrement,
  at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  kind text not null check (kind in ('board', 'leakmap', 'security', 'other')),
  name text not null check (length(name) between 2 and 80),
  company text check (company is null or length(company) <= 120),
  phone text check (phone is null or (phone glob '+[1-9]*' and length(phone) between 9 and 16)),
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
insert into site_requests_new (id, at, kind, name, company, phone, email, scope, message, page, lang, consent_at, ip_key, status, handled_at)
  select id, at, kind, name, company, phone, email, scope, message, page, lang, consent_at, ip_key, status, handled_at from site_requests;
drop table site_requests;
alter table site_requests_new rename to site_requests;
create index if not exists site_requests_at_idx on site_requests (at desc);
create index if not exists site_requests_ip_idx on site_requests (ip_key, at);
