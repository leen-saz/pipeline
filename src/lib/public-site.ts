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

// Header links. On the board site they point at the landing's sections from any page ('/#demo' works on '/' too).
export const NAV = SITE_MODE === 'security'
  ? [{ href: '/', label: 'الأمن السيبراني' }, { href: `${MAIN_URL}/profile/`, label: 'من نحن' }, { href: MAIN_URL, label: 'لوحة Apipeline' }]
  : [
      { href: '/#demo', label: 'العرض' },
      { href: '/#how', label: 'طريقة العمل' },
      { href: '/#agents', label: 'الوكلاء' },
      { href: '/#safety', label: 'الأمان' },
      { href: '/#faq', label: 'الأسئلة' },
      { href: '/profile/', label: 'من نحن' },
      { href: SECURITY_URL, label: 'الأمن السيبراني' },
    ];

// The thin bar above the header (null hides it). One line, one link.
export const ANNOUNCEMENT: { text: string; href: string } | null = SITE_MODE === 'security'
  ? null
  : { text: 'جديد: جرّب اللوحة كاملة في متصفحك ببيانات افتراضية، دون تسجيل', href: '/#demo' };

// The footer's link columns. Plain labels (no href) are listed as text.
type FootLink = { label: string; href?: string };
const AGENT_NAMES = ['احلم', 'التحليلات', 'مدير الإعلانات', 'التواصل الاجتماعي', 'الرصد', 'التصميم', 'الصوت', 'المعرفة', 'الربط'];
export const FOOTER: { title: string; links: FootLink[] }[] = SITE_MODE === 'security'
  ? [
      { title: 'الفحص', links: [{ label: 'الكود' }, { label: 'الموقع والـ API' }, { label: 'تطبيق الجوال' }, { label: 'السحابة والإعدادات' }] },
      { title: 'الشركة', links: [{ label: 'من نحن', href: `${MAIN_URL}/profile/` }, { label: 'لوحة Apipeline', href: MAIN_URL }, { label: 'اطلب فحصًا', href: '#request' }] },
    ]
  : [
      { title: 'الوكلاء', links: AGENT_NAMES.map(label => ({ label, href: '/#demo' })) },
      { title: 'المنصات', links: ['Meta', 'Google Ads', 'Snapchat', 'TikTok', 'GA4', 'X', 'Pinterest', 'Reddit', 'Search Console'].map(label => ({ label })) },
      { title: 'المنتج', links: [{ label: 'العرض التجريبي', href: '/#demo' }, { label: 'طريقة العمل', href: '/#how' }, { label: 'الأمان', href: '/#safety' }, { label: 'الأسئلة', href: '/#faq' }] },
      { title: 'الشركة', links: [{ label: 'من نحن', href: '/profile/' }, { label: 'الأمن السيبراني', href: SECURITY_URL }, { label: 'اطلب تجربة', href: '#request' }] },
    ];
