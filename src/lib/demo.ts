// The landing page demo (src/components/DemoLab.astro): fake data only, nothing leaves the browser.
// Arabic strings are written here; i18n.js translates them on the fly for English (pairs in public/assets/i18n-en-site.js).
const $ = <T = HTMLElement>(s: string, r: Document | Element = document) => r.querySelector(s) as T | null;
const $$ = <T = HTMLElement>(s: string, r: Document | Element = document) => [...r.querySelectorAll(s)] as T[];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const ar = (n: number, d = 0) => n.toLocaleString('ar-SA', { maximumFractionDigits: d, minimumFractionDigits: d });
const wait = (ms: number) => new Promise(r => setTimeout(r, reduce ? 0 : ms));

// ---------------------------------------------------------------- tabs
function tabs() {
  const list = $$<HTMLButtonElement>('.dm-tabs [role=tab]');
  const show = (b: HTMLButtonElement, focus = false) => {
    for (const t of list) {
      const on = t === b;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls')!); if (p) p.hidden = !on;
    }
    if (focus) b.focus();
  };
  list.forEach((b, i) => {
    b.addEventListener('click', () => show(b));
    b.addEventListener('keydown', e => {
      const rtl = document.documentElement.dir !== 'ltr';
      const next = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight'), prev = e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
      if (!next && !prev && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (next ? 1 : -1) + list.length) % list.length;
      show(list[j]!, true);
    });
  });
}

// ---------------------------------------------------------------- احلم
type Part = { key: string; title: string; html: () => string; alt: () => string };
interface Plan { strategy: [string, string]; audience: string[]; budget: [string, number][]; copy: [string, string, string]; head: string; vo: [string, string] }

const PLANS: Record<string, Plan> = {
  skin: {
    strategy: ['نبدأ بأسبوع تعريف بالمنتج على تيك توك وسناب، وبعدها إعادة استهداف لمن شاف الفيديو على ميتا.', 'نركّز الأسبوع الأول على الفيديو القصير، ونحوّل الميزانية للإعلان اللي تكلفة بيعته أقل.'],
    audience: ['نساء ١٨–٣٤', 'مهتمات بالعناية بالبشرة', 'الرياض وجدة', 'زوار الموقع آخر ٣٠ يوم'],
    budget: [['TikTok', 35], ['Snapchat', 30], ['Meta', 25], ['Google', 10]],
    copy: ['بشرتك تستاهل روتين بسيط. جرّبيه أسبوع وشوفي الفرق بنفسك.', 'جديدنا وصل: ترطيب يدوم طول اليوم، ومكوّنات واضحة.', 'روتينك الصباحي في دقيقتين. اطلبيه الحين والتوصيل سريع.'],
    head: 'روتين بسيط، ترطيب يدوم',
    vo: ['صباحك زحمة؟ روتينك ما يحتاج يكون كذا. خطوة وحدة، ترطيب يدوم طول اليوم. اطلبيه الحين.', 'خطوة وحدة الصبح، وبشرتك مرتاحة لين الليل. جديدنا وصل، اطلبيه الحين.'],
  },
  home: {
    strategy: ['نبدأ بإعلانات بحث في قوقل لمن يدوّر على أدوات المطبخ، ونعيد استهداف زوار المتجر على ميتا بالعرض.', 'آخر ثلاث أيام من العرض نرفع الميزانية على الإعلانات اللي العائد فيها فوق الهدف.'],
    audience: ['رجال ونساء ٢٥–٤٥', 'مهتمين بالطبخ والبيت', 'كل المملكة', 'من أضاف للسلة ولا اشترى'],
    budget: [['Google', 35], ['Meta', 35], ['Snapchat', 20], ['TikTok', 10]],
    copy: ['العرض قرب يخلص: أدوات مطبخك بأسعار نهاية الموسم.', 'جهّز مطبخك للموسم الجاي، والتوصيل لين بابك.', 'شي في سلتك ينتظرك. كمّل طلبك قبل ما يخلص العرض.'],
    head: 'عرض نهاية الموسم',
    vo: ['مطبخك يستاهل تجديد. عرض نهاية الموسم على أدوات المطبخ، لين نهاية الأسبوع بس.', 'العرض قرب يخلص. جدّد أدوات مطبخك، والتوصيل لين بابك.'],
  },
  clinic: {
    strategy: ['نبدأ بنماذج حجز على سناب وميتا، ونتابع كل حجز في نظام العملاء عشان نعرف أي إعلان يجيب حجز مدفوع.', 'نوقف أي إعلان يصرف ثلاث أيام بدون حجز، ونرفع اللي تكلفة حجزه تحت الهدف.'],
    audience: ['رجال ونساء ٢٥–٥٥', 'عائلات في الرياض', 'مهتمين بالصحة والعافية', 'من زار صفحة الخدمات'],
    budget: [['Snapchat', 40], ['Meta', 35], ['Google', 15], ['TikTok', 10]],
    copy: ['فريقنا الطبي المرخّص يجيك البيت، وتحجز موعدك بدقيقة.', 'تقييم طبي في بيتك بالوقت اللي يناسبك.', 'احجز جلستك اليوم، ومتابعة من فريق مختص.'],
    head: 'رعايتك في بيتك',
    vo: ['موعدك الطبي يجيك البيت. فريق مرخّص، وحجز بدقيقة، وبالوقت اللي يناسبك.', 'لا زحمة ولا انتظار. فريقنا الطبي يجيك البيت. احجز موعدك اليوم.'],
  },
};
const ideaKey = (text: string): string => {
  const t = text.trim();
  if (/بشر|عناي|روتين|skin/i.test(t)) return 'skin';
  if (/مطبخ|منزل|موسم|متجر|عرض|kitchen|home|store/i.test(t)) return 'home';
  if (/عياد|صح|طب|جلس|حجز|clinic|health/i.test(t)) return 'clinic';
  return 'skin';
};
const SIZES: [string, number, number][] = [['مربع ١:١', 1080, 1080], ['ستوري ٩:١٦', 1080, 1920], ['عرضي ١٫٩:١', 1200, 628]];

const CANVAS_EN: Record<string, string> = { 'روتين بسيط، ترطيب يدوم': 'A simple routine, lasting hydration', 'عرض نهاية الموسم': 'End-of-season offer', 'رعايتك في بيتك': 'Care at your home', 'اطلب الحين': 'Order now' };
const tr = (s: string) => (document.documentElement.lang === 'en' ? CANVAS_EN[s] ?? s : s);
function drawDesign(c: HTMLCanvasElement, w: number, h: number, head: string, cta: string, alt: boolean) {
  const s = 360 / Math.max(w, h); c.width = Math.round(w * s); c.height = Math.round(h * s);
  const x = c.getContext('2d'); if (!x) return;
  const W = c.width, H = c.height;
  // The landing palette: near-black top, amber middle, glowing cream at the bottom (the hero capsule), plus a little grain
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0E0C0A'); g.addColorStop(alt ? .4 : .5, alt ? '#5A3A1E' : '#3A2716'); g.addColorStop(.8, '#C8893F'); g.addColorStop(1, '#F2E9DA');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * (alt ? .25 : .75), H * .25, 0, W * (alt ? .25 : .75), H * .25, Math.min(W, H) * .5);
  glow.addColorStop(0, 'rgba(207,227,238,.22)'); glow.addColorStop(1, 'rgba(207,227,238,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 6; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  const pad = W * .07, fs = Math.round(Math.min(W, H) * .1);
  x.direction = document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl'; x.textAlign = x.direction === 'rtl' ? 'right' : 'left';
  const tx = x.textAlign === 'right' ? W - pad : pad;
  x.fillStyle = '#F2E9DA'; x.font = `400 ${fs}px "Thmanyah Sans", system-ui, sans-serif`;
  x.fillText(head, tx, H * .3, W - pad * 2);
  const cs = Math.round(fs * .5); x.font = `700 ${cs}px "Thmanyah Sans", system-ui, sans-serif`;
  const cw = x.measureText(cta).width + cs * 2, ch = cs * 2.2, cy = H * .38;
  const cx = x.textAlign === 'right' ? W - pad - cw : pad;
  x.fillStyle = 'rgba(242,233,218,.16)'; x.beginPath(); x.roundRect(cx, cy, cw, ch, ch / 2); x.fill();
  x.fillStyle = '#F2E9DA'; x.textAlign = 'center'; x.fillText(cta, cx + cw / 2, cy + ch * .68);
}

function dream() {
  const form = $<HTMLFormElement>('#dmAsk'), input = $<HTMLInputElement>('#dmIdea');
  const chat = $('#dmChat')!, draft = $('#dmDraft')!, bar = $('#dmPublishBar')!;
  const pub = $<HTMLButtonElement>('#dmPublish'), dlg = $<HTMLDialogElement>('#dmConfirm');
  if (!form || !input || !chat || !draft || !bar || !pub || !dlg) return;
  let plan: Plan = PLANS.skin!, approved = new Set<string>(), alt = new Set<string>(), run = 0;

  const parts = (): Part[] => [
    { key: 'strategy', title: 'الاستراتيجية', html: () => `<p>${esc(plan.strategy[0])}</p>`, alt: () => `<p>${esc(plan.strategy[1])}</p>` },
    { key: 'audience', title: 'الجمهور', html: () => `<div class="dm-chips">${plan.audience.map(a => `<span class="st-chip">${esc(a)}</span>`).join('')}</div>`,
      alt: () => `<div class="dm-chips">${[...plan.audience.slice(0, 3), 'متابعين حساباتك'].map(a => `<span class="st-chip">${esc(a)}</span>`).join('')}</div>` },
    { key: 'budget', title: 'الميزانية لكل منصة', html: () => budget(plan.budget), alt: () => budget(plan.budget.map(([p, v], i) => [p, i === 0 ? v - 5 : i === 1 ? v + 5 : v])) },
    { key: 'copy', title: 'النصوص', html: () => `<ol class="dm-copy">${plan.copy.map(c => `<li>${esc(c)}</li>`).join('')}</ol>`,
      alt: () => `<ol class="dm-copy">${[...plan.copy].reverse().map(c => `<li>${esc(c)}</li>`).join('')}</ol>` },
    { key: 'design', title: 'التصاميم', html: () => designs(), alt: () => designs() },
    { key: 'voice', title: 'الفويس أوفر', html: () => `<p class="dm-vo">«<span>${esc(plan.vo[0])}</span>»</p><p class="muted"><span>نجدي</span> · <span>٢٢</span> <span>ثانية تقريبًا</span></p>`,
      alt: () => `<p class="dm-vo">«<span>${esc(plan.vo[1])}</span>»</p><p class="muted"><span>نجدي</span> · <span>١٨</span> <span>ثانية تقريبًا</span></p>` },
  ];
  const budget = (rows: [string, number][]) => `<p class="muted"><span>الميزانية اليومية:</span> <b>٥٠٠</b> <span>ر.س</span></p><ul class="dm-bars">${rows.map(([p, v]) =>
    `<li><span class="n">${p}</span><span class="bar"><i style="width:${v}%"></i></span><span class="v">${ar(v)}٪</span></li>`).join('')}</ul>`;
  const designs = () => `<div class="dm-designs">${SIZES.map(([l], i) => `<figure><canvas data-size="${i}" aria-label="${esc(l)}"></canvas><figcaption>${esc(l)}</figcaption></figure>`).join('')}</div>`;

  const paint = (card: HTMLElement) => {
    $$<HTMLCanvasElement>('canvas[data-size]', card).forEach(c => { const [, w, h] = SIZES[Number(c.dataset.size)]!; drawDesign(c, w, h, tr(plan.head), tr('اطلب الحين'), alt.has('design')); });
  };
  const count = () => {
    $('#dmApproved')!.textContent = ar(approved.size);
    pub.disabled = approved.size < parts().length;
  };
  const card = (p: Part) => `<article class="dm-part" data-part="${p.key}"><header><h4>${esc(p.title)}</h4><span class="dm-state" hidden>معتمد</span></header>
    <div class="dm-body">${alt.has(p.key) ? p.alt() : p.html()}</div>
    <form class="dm-edit" hidden><label class="sr-only" for="ed-${p.key}">وش تبي تعدّل؟</label><input id="ed-${p.key}" type="text" maxlength="120" placeholder="وش تبي تعدّل؟"><button class="btn secondary" type="submit">أرسل التعديل</button></form>
    <div class="st-acts"><button type="button" class="btn ghost" data-act="edit">عدّل</button><button type="button" class="btn secondary" data-act="ok">اعتمد</button></div></article>`;

  async function start(text: string) {
    const me = ++run; plan = PLANS[ideaKey(text)]!; approved = new Set(); alt = new Set();
    chat.innerHTML = `<p class="dm-msg me">${esc(text)}</p><p class="dm-msg bot" id="dmThink">أفكر في الحملة… أقرا أهدافك ونتائج حملاتك السابقة.</p>`;
    draft.hidden = false; draft.innerHTML = ''; bar.hidden = true;
    await wait(700);
    for (const p of parts()) {
      if (me !== run) return;
      draft.insertAdjacentHTML('beforeend', card(p));
      const el = draft.lastElementChild as HTMLElement; el.classList.add('in'); paint(el);
      await wait(380);
    }
    if (me !== run) return;
    $('#dmThink')!.textContent = 'جهزت المسودة. راجع كل جزء: عدّله أو اعتمده، وبعدها انشر.';
    $('#dmTotal')!.textContent = ar(parts().length); bar.hidden = false; count();
  }

  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value.trim(); if (!v) { input.focus(); return; } start(v); });
  $$<HTMLButtonElement>('[data-idea]').forEach(b => b.addEventListener('click', () => { input.value = b.textContent!.trim(); start(input.value); }));

  draft.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-act]'); if (!b) return;
    const el = b.closest<HTMLElement>('.dm-part')!, key = el.dataset.part!;
    if (b.dataset.act === 'ok') {
      approved.add(key); el.classList.add('ok'); $('.dm-state', el)!.hidden = false; b.disabled = true; count();
    } else {
      const f = $<HTMLFormElement>('.dm-edit', el)!; f.hidden = !f.hidden; if (!f.hidden) $<HTMLInputElement>('input', f)!.focus();
    }
  });
  draft.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target as HTMLFormElement, el = f.closest<HTMLElement>('.dm-part')!, key = el.dataset.part!;
    const want = $<HTMLInputElement>('input', f)!.value.trim() || 'خله أقصر';
    chat.insertAdjacentHTML('beforeend', `<p class="dm-msg me">${esc(want)}</p><p class="dm-msg bot"><span>عدّلت</span> «<span>${esc(parts().find(p => p.key === key)!.title)}</span>». <span>راجعه.</span></p>`);
    alt.has(key) ? alt.delete(key) : alt.add(key); approved.delete(key);
    const p = parts().find(x => x.key === key)!;
    $('.dm-body', el)!.innerHTML = alt.has(key) ? p.alt() : p.html(); paint(el);
    el.classList.remove('ok'); $('.dm-state', el)!.hidden = true; $<HTMLButtonElement>('[data-act=ok]', el)!.disabled = false;
    f.hidden = true; f.reset(); count();
  });

  pub.addEventListener('click', () => {
    $('#dmConfirmList')!.innerHTML = plan.budget.map(([p, v]) => `<li><b>${p}</b> <span>حملة وحدة، ٣ إعلانات، ميزانية يومية</span> <span>${ar(5 * v)}</span> <span>ر.س</span> <span class="st-chip">موقوفة</span></li>`).join('');
    dlg.showModal();
  });
  $('#dmConfirmNo')!.addEventListener('click', () => dlg.close());
  $('#dmConfirmOk')!.addEventListener('click', () => {
    dlg.close();
    chat.insertAdjacentHTML('beforeend', '<p class="dm-msg bot">تم في الديمو: الحملات جاهزة وموقوفة. في النظام الحقيقي تلقاها في كل منصة، وتشغّلها أنت.</p>');
    pub.disabled = true; pub.textContent = 'انتشرت (ديمو)';
  });
}

// ---------------------------------------------------------------- التحليلات
function series(days: number) {
  // Deterministic fake daily numbers (same every load), spend and sales in SAR
  const out: { spend: number; sales: number }[] = [];
  for (let i = 0; i < days; i++) {
    const s = 420 + 90 * Math.sin(i / 3.1) + 40 * Math.cos(i / 1.7) + i * 1.5;
    out.push({ spend: Math.round(s), sales: Math.round(s * (3.1 + .6 * Math.sin(i / 4.3 + 1))) });
  }
  return out;
}
function analytics() {
  const kpis = $('#dmKpis'), funnel = $('#dmFunnel'), chart = $('#dmChart'), seg = $('#dmRange');
  if (!kpis || !funnel || !chart || !seg) return;
  const render = (days: number) => {
    const all = series(days * 2), d = all.slice(days), prev = all.slice(0, days);
    const sum = (a: { spend: number; sales: number }[], k: 'spend' | 'sales') => a.reduce((t, x) => t + x[k], 0);
    const spend = sum(d, 'spend'), sales = sum(d, 'sales'), pSpend = sum(prev, 'spend'), pSales = sum(prev, 'sales');
    const orders = Math.round(sales / 185), pOrders = Math.round(pSales / 185);
    const chg = (a: number, b: number) => (b ? (100 * (a - b)) / b : 0);
    const tile = (l: string, v: string, c: number, why: string, lowerIsBetter = false) => {
      const good = lowerIsBetter ? c < 0 : c > 0;
      return `<div class="dm-kpi"><span class="l">${l}</span><b>${v}</b><span class="d ${good ? 'up' : 'down'}">${c >= 0 ? '▲' : '▼'} ${ar(Math.abs(c), 1)}٪</span><span class="why">${why}</span></div>`;
    };
    kpis.innerHTML = [
      tile('الصرف', `${ar(spend)} <small>ر.س</small>`, chg(spend, pSpend), 'أكبر زيادة من TikTok'),
      tile('المبيعات', `${ar(sales)} <small>ر.س</small>`, chg(sales, pSales), 'أكبر زيادة من Meta'),
      tile('الطلبات', ar(orders), chg(orders, pOrders), 'متوسط الطلب ١٨٥ ر.س'),
      tile('العائد على الصرف', `${ar(sales / spend, 2)}×`, chg(sales / spend, pSales / pSpend), 'المبيعات ÷ الصرف'),
    ].join('');
    const impr = spend * 210, clicks = Math.round(impr * .012), carts = Math.round(clicks * .09);
    const steps: [string, number][] = [['الظهور', impr], ['النقرات', clicks], ['أضاف للسلة', carts], ['اشترى', orders]];
    funnel.innerHTML = steps.map(([l, v], i) => {
      const rate = i ? `<span class="r">${ar((100 * v) / steps[i - 1]![1], 1)}٪</span>` : '';
      return `<div class="dm-fs" style="--w:${[100, 78, 56, 38][i]}%"><span class="l">${l}</span><b>${ar(v)}</b>${rate}</div>`;
    }).join('');
    const W = 320, H = 140, P = 8, max = Math.max(...d.map(x => x.sales));
    const pts = (k: 'spend' | 'sales') => d.map((x, i) => `${P + (i * (W - 2 * P)) / Math.max(1, d.length - 1)},${H - P - ((H - 2 * P) * x[k]) / max}`).join(' ');
    chart.innerHTML = `<polyline class="ln a" points="${pts('sales')}"/><polyline class="ln b" points="${pts('spend')}"/>`;
  };
  seg.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-days]'); if (!b) return;
    $$('[data-days]', seg).forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(Number(b.dataset.days));
  });
  render(30);
}

// ---------------------------------------------------------------- الميديا باير
const RECS = [
  { t: 'إيقاف إعلان يصرف ٣ أيام بدون ولا طلب', plat: 'Meta', why: 'صرف ٨٤٠ ر.س، ونسبة النقر ٠٫٤٪، وصفر طلبات من ثلاث أيام.', risk: 'منخفض: الإعلان ما جاب نتيجة، وإيقافه يوفّر الصرف.', metric: 'تكلفة الطلب في الحملة بعد ٣ أيام' },
  { t: 'رفع ميزانية مجموعة ٢٠٪', plat: 'TikTok', why: 'العائد على الصرف ٤٫٢× لمدة أسبوع، فوق هدفك ٣×.', risk: 'متوسط: الرفع الكبير يرجّع المنصة لمرحلة التعلم، فنرفع ٢٠٪ بس.', metric: 'العائد على الصرف يبقى فوق ٣× بعد ٧ أيام' },
  { t: 'تجديد الكرييتف لإعلان تعب منه الجمهور', plat: 'Snapchat', why: 'نسبة النقر نزلت من ١٫٨٪ إلى ٠٫٩٪ خلال أسبوعين، والتكرار ٤٫٦.', risk: 'منخفض: نجرّب نسختين جديدة جنب القديمة.', metric: 'نسبة النقر ترجع فوق ١٫٥٪' },
];
function buyer() {
  const box = $('#dmRecs'), log = $('#dmLog'); if (!box || !log) return;
  box.innerHTML = RECS.map((r, i) => `<article class="dm-rec" data-i="${i}"><header><span class="st-chip">${r.plat}</span><h4>${esc(r.t)}</h4></header>
    <dl><div><dt>السبب</dt><dd>${esc(r.why)}</dd></div><div><dt>المخاطرة</dt><dd>${esc(r.risk)}</dd></div><div><dt>كيف نقيس النجاح</dt><dd>${esc(r.metric)}</dd></div></dl>
    <div class="dm-reject" hidden><label for="rj-${i}">سبب الرفض</label><select id="rj-${i}"><option>الرقم مو كافي للحين</option><option>عندي سبب من السوق</option><option>نجربه الأسبوع الجاي</option></select><button type="button" class="btn secondary" data-act="rj-ok">ارفض</button></div>
    <div class="st-acts"><button type="button" class="btn primary" data-act="ok">اعتمد</button><button type="button" class="btn ghost" data-act="no">ارفض</button></div></article>`).join('');
  const add = (text: string) => {
    if (log.querySelector('.muted')) log.innerHTML = '';
    const now = new Date(); const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    log.insertAdjacentHTML('afterbegin', `<li><span class="t">${time}</span> ${text}</li>`);
  };
  box.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-act]'); if (!b) return;
    const el = b.closest<HTMLElement>('.dm-rec')!, r = RECS[Number(el.dataset.i)]!;
    const done = (cls: string, word: string, msg: string) => { el.classList.add(cls); $$<HTMLButtonElement>('button', el).forEach(x => (x.disabled = true)); $('.st-acts', el)!.insertAdjacentHTML('beforeend', `<span class="st-chip ${cls === 'ok' ? 'ok' : 'hot'}">${word}</span>`); add(msg); };
    if (b.dataset.act === 'ok') done('ok', 'معتمد', `<span>اعتمدت:</span> <span>${esc(r.t)}</span> · <span>${r.plat}</span>. <span>ينقاس بعد ٣ و٧ أيام.</span>`);
    else if (b.dataset.act === 'no') { const f = $('.dm-reject', el)!; f.hidden = !f.hidden; if (!f.hidden) $<HTMLSelectElement>('select', f)!.focus(); }
    else done('no', 'مرفوض', `<span>رفضت:</span> <span>${esc(r.t)}</span> · <span>السبب:</span> <span>${esc($<HTMLSelectElement>('select', el)!.value)}</span>. <span>ينحفظ كدرس.</span>`);
  });
}

if (document.getElementById('demo')) { tabs(); dream(); analytics(); buyer(); }
