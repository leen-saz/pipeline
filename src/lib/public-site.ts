// The Apipeline site pages (/, /profile/; Security on its own Worker): shared links and contact in one place.
// Change the contact here and every page and button follows.
export const CONTACT = {
  // WhatsApp number in international form, digits only. Empty hides every WhatsApp link: the request form
  // (emailed to the owner, src/lib/mail.ts) is the only way in.
  whatsapp: '',
  phoneLabel: '',
  // Where the request form emails each request (through FormSubmit, from the visitor's browser)
  requestsEmail: 'leen@brandsforhome.sa',
};

export const wa = (text: string) => CONTACT.whatsapp ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}` : '#contact';

// Two sites from one codebase: the board (main) and Apipeline Security on its own link. The build picks one with
// PUBLIC_SITE_MODE=security (npm run build:security); the Worker for each is its own wrangler env.
export const SITE_MODE: 'main' | 'security' = import.meta.env.PUBLIC_SITE_MODE === 'security' ? 'security' : 'main';
export const MAIN_URL = 'https://pipeline.leen-b9b.workers.dev';
export const SECURITY_URL = 'https://apipeline-security.leen-b9b.workers.dev';

export const NAV = SITE_MODE === 'security'
  ? [{ href: '/', label: 'الأمن السيبراني' }, { href: `${MAIN_URL}/profile/`, label: 'من نحن' }]
  : [{ href: '/', label: 'اللوحة' }, { href: '/profile/', label: 'من نحن' }];
