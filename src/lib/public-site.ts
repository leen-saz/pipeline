// The Apipeline site pages (/, /profile/, /security/): shared links and contact in one place.
// Change the contact here and every page and button follows.
export const CONTACT = {
  // WhatsApp number in international form, digits only. Empty hides every WhatsApp link: the request form
  // (emailed to the owner, src/lib/mail.ts) is the only way in.
  whatsapp: '',
  phoneLabel: '',
};

export const wa = (text: string) => CONTACT.whatsapp ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}` : '#contact';

export const NAV = [
  { href: '/', label: 'اللوحة' },
  { href: '/security/', label: 'الأمن السيبراني' },
  { href: '/profile/', label: 'من نحن' },
];
