// اللغة: عربي (الافتراضي) أو إنجليزي. الاختيار ينحفظ في المتصفح ويمشي على كل صفحات الموقع.
// الترجمة تمسك النصوص الظاهرة والـplaceholder والـaria-label والـtitle تلقائياً، حتى اللي ينرسم بعدين.
const KEY = 'apipeline-lang';
export const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ar') { try { localStorage.setItem(KEY, q); } catch {} return q; }
  try { if (localStorage.getItem(KEY) === 'en') return 'en'; } catch {}
  return 'ar';
})();
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl';

// The English strings are fetched only for English; Arabic, the default, needs none of them
const { EN, PAT } = LANG === 'en'
  ? await import('./i18n-en.js').then(m => ({ EN: m.EN, PAT: m.pat(t) }))
  : { EN: {}, PAT: [] };

// Arabic-Indic digits (٠-٩ ٫ ٪ ٬) become the digits an English page uses
const latin = x => x.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/٪/g, '%').replace(/٬/g, ',');
export function t(s) {
  if (LANG !== 'en' || s == null) return s;
  let str = String(s), k = str.trim();
  if (!k) return str;
  if (EN[k]) return str.replace(k, EN[k]);
  if (/[٠-٩٫٪٬]/.test(k)) { const n = latin(k); str = str.replace(k, n); k = n; if (EN[k]) return str.replace(k, EN[k]); }
  // "a · b": each part on its own
  if (k.includes(' · ')) { const parts = k.split(' · ').map(p => t(p)); const j = parts.join(' · '); if (j !== k) return str.replace(k, j); }
  for (const [re, to] of PAT) if (re.test(k)) return str.replace(k, k.replace(re, to));
  return str;
}

const ATTRS = ['placeholder', 'aria-label', 'data-tip', 'title'];
function translate(root) {
  if (LANG !== 'en' || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentElement.tagName)) continue;
    const v = t(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v;
  }
  const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [];
  for (const el of els) for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v) { const w = t(v); if (w !== v) el.setAttribute(a, w); } }
}
if (LANG === 'en') {
  const OBS = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') { const v = t(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; } else m.addedNodes.forEach(n => n.nodeType === 3 ? (n.nodeValue = t(n.nodeValue)) : translate(n)); } });
  const go = () => {
    translate(document.body);
    document.title = t(document.title);
    const d = document.querySelector('meta[name="description"]'); if (d) d.setAttribute('content', t(d.getAttribute('content')));
    OBS.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.dispatchEvent(new CustomEvent('i18n:ready'));
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
}

// زر اللغة: يحفظ الاختيار ويعيد تحميل الصفحة بنفس العنوان
export function langSwitch() {
  return `<span class="seg lang" role="group" aria-label="اللغة"><button data-lang="ar" aria-pressed="${LANG === 'ar'}">عربي</button><button data-lang="en" aria-pressed="${LANG === 'en'}">English</button></span>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lang]'); if (!b || b.dataset.lang === LANG) return;
  try { localStorage.setItem(KEY, b.dataset.lang); } catch {}
  const u = new URL(location.href); u.searchParams.delete('lang'); if (b.dataset.lang === 'en') u.searchParams.set('lang', 'en'); location.href = u.toString();
});
