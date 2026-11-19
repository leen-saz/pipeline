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

export const MAIN_URL = 'https://pipeline.leen-b9b.workers.dev';

// Header links. On the board site they point at the landing's sections from any page ('/#demo' works on '/' too).
export const NAV = [
  { href: '/#demo', label: 'العرض' },
  { href: '/#how', label: 'طريقة العمل' },
  { href: '/#agents', label: 'الوكلاء' },
  { href: '/#safety', label: 'الأمان' },
  { href: '/#faq', label: 'الأسئلة' },
  { href: '/profile/', label: 'من نحن' },
];

// The thin bar above the header (null hides it). One line, one link.
export const ANNOUNCEMENT: { text: string; href: string } | null =
  { text: 'جديد: جرّب اللوحة كاملة في متصفحك ببيانات افتراضية، دون تسجيل', href: '/#demo' };

// The footer's link columns. Plain labels (no href) are listed as text.
type FootLink = { label: string; href?: string };
const AGENT_NAMES = ['احلم', 'التحليلات', 'مدير الإعلانات', 'التواصل الاجتماعي', 'الرصد', 'التصميم', 'الصوت', 'المعرفة', 'الربط'];
export const FOOTER: { title: string; links: FootLink[] }[] = [
  { title: 'الوكلاء', links: AGENT_NAMES.map(label => ({ label, href: '/#demo' })) },
  { title: 'المنصات', links: ['Meta', 'Google Ads', 'Snapchat', 'TikTok', 'GA4', 'X', 'Pinterest', 'Reddit', 'Search Console'].map(label => ({ label })) },
  { title: 'المنتج', links: [{ label: 'العرض التجريبي', href: '/#demo' }, { label: 'طريقة العمل', href: '/#how' }, { label: 'الأمان', href: '/#safety' }, { label: 'الأسئلة', href: '/#faq' }] },
  { title: 'الشركة', links: [{ label: 'من نحن', href: '/profile/' }, { label: 'اطلب تجربة', href: '#request' }] },
];
