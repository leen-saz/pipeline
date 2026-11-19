// The rest of the demo app (src/components/DemoLab.astro): social, listening, design, voice, knowledge, connections.
// Fake data only: nothing leaves the browser (the product photo is read locally, the voice uses the browser's own
// speech engine when it has an Arabic voice). The sidebar counts follow what the visitor approves.
const $ = <T = HTMLElement>(s: string, r: Document | Element = document) => r.querySelector(s) as T | null;
const $$ = <T = HTMLElement>(s: string, r: Document | Element = document) => [...r.querySelectorAll(s)] as T[];
const ar = (n: number, d = 0) => n.toLocaleString('ar-SA', { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- sidebar counts
function bump(key: string, delta: number) {
  const b = $(`[data-count-for="${key}"]`);
  if (b) { const n = Math.max(0, Number(b.dataset.n || 0) + delta); b.dataset.n = String(n); b.textContent = ar(n); b.hidden = n === 0; }
  const total = $$('[data-count-for]').reduce((t, x) => t + Number(x.dataset.n || 0), 0);
  const bell = $('#dmPending'); if (bell) { bell.textContent = ar(total); bell.hidden = total === 0; }
}
export { bump };

// ---------------------------------------------------------------- التواصل الاجتماعي
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
type Post = { day: number; time: string; text: string; plats: string[]; st: 'pending' | 'scheduled' | 'done' };
const POSTS: Post[] = [
  { day: 0, time: '٩:٠٠ م', text: 'خطوة واحدة صباحًا، وبشرتك مرتاحة حتى المساء.', plats: ['Instagram', 'TikTok'], st: 'done' },
  { day: 1, time: '٨:٣٠ م', text: 'سؤال الأسبوع: كم خطوة في روتينك الصباحي؟', plats: ['X'], st: 'done' },
  { day: 2, time: '٩:٠٠ م', text: 'منتجنا الجديد: ترطيب يدوم طوال اليوم، ومكوّنات واضحة.', plats: ['Instagram', 'Snapchat'], st: 'pending' },
  { day: 4, time: '٧:٠٠ م', text: 'آراء عميلاتنا بعد أسبوع من الاستخدام.', plats: ['TikTok'], st: 'pending' },
  { day: 5, time: '١:٠٠ م', text: 'عرض نهاية الأسبوع: توصيل مجاني لكل الطلبات.', plats: ['Instagram', 'X'], st: 'scheduled' },
];
const ST_LABEL = { pending: 'بانتظار موافقتك', scheduled: 'مجدول', done: 'منشور' } as const;
function social() {
  const week = $('#dmWeek'), form = $<HTMLFormElement>('#dmCompose'), sel = $<HTMLSelectElement>('#dmPostDay'); if (!week || !form || !sel) return;
  sel.innerHTML = DAYS.map((d, i) => `<option value="${i}"${i === 3 ? ' selected' : ''}>${d} · ٩:٠٠ م</option>`).join('');
  const draw = () => {
    week.innerHTML = DAYS.map((d, i) => `<div class="dm-day"><p class="dm-dayh">${d}</p>${POSTS.map((p, j) => [p, j] as const).filter(([p]) => p.day === i).map(([p, j]) => `
      <article class="dm-post ${p.st}"><p class="t">${esc(p.text)}</p><p class="m"><span>${p.time}</span> ${p.plats.map(x => `<span class="st-chip">${x}</span>`).join('')}</p>
      <p class="s"><span class="st-chip ${p.st === 'pending' ? 'hot' : p.st === 'done' ? 'ok' : ''}">${ST_LABEL[p.st]}</span>${p.st === 'pending' ? `<button type="button" class="btn sm primary" data-ok="${j}">اعتمد</button>` : ''}</p></article>`).join('') || '<p class="dm-empty">—</p>'}</div>`).join('');
  };
  draw();
  week.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-ok]'); if (!b) return;
    POSTS[Number(b.dataset.ok)]!.st = 'scheduled'; bump('social', -1); draw();
  });
  $$<HTMLButtonElement>('#dmPostPlats [data-plat]').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = $<HTMLTextAreaElement>('#dmPost', form)!.value.trim(), plats = $$<HTMLButtonElement>('#dmPostPlats [aria-pressed=true]').map(b => b.dataset.plat!);
    if (!text || !plats.length) return;
    POSTS.push({ day: Number(sel.value), time: '٩:٠٠ م', text, plats, st: 'pending' }); bump('social', 1); draw();
  });
}

// ---------------------------------------------------------------- الرصد
type Mention = { src: string; who: string; text: string; s: 'pos' | 'neu' | 'neg'; ago: string; key: string };
const MENTIONS: Mention[] = [
  { src: 'X', who: '@noura_sa', text: 'جرّبت ترطيب روتين أسبوعًا كاملًا، فعلًا يدوم لين المساء.', s: 'pos', ago: 'قبل ١٢ دقيقة', key: 'روتين' },
  { src: 'TikTok', who: '@dana.skin', text: 'التوصيل تأخر يومين عن الموعد، أتمنى يتحسن.', s: 'neg', ago: 'قبل ساعة', key: 'روتين' },
  { src: 'Instagram', who: '@reem.beauty', text: 'مقارنة بين روتين ومنافسه: المكوّنات أوضح عند روتين.', s: 'pos', ago: 'قبل ٣ ساعات', key: 'منافس' },
  { src: 'X', who: '@a_alharbi', text: 'أحد جرّب سيروم المنافس؟ سعره أقل بكثير.', s: 'neu', ago: 'قبل ٥ ساعات', key: 'منافس' },
  { src: 'Reddit', who: 'u/skincare_ksa', text: 'خدمة العملاء ردّت علي بسرعة وحلّت المشكلة.', s: 'pos', ago: 'أمس', key: 'روتين' },
  { src: 'TikTok', who: '@lama_k', text: 'العبوة الجديدة تتسرّب في الشنطة.', s: 'neg', ago: 'أمس', key: 'روتين' },
];
const S_LABEL = { pos: 'إيجابي', neu: 'محايد', neg: 'سلبي' } as const;
function listen() {
  const keysBox = $('#dmKeys'), list = $('#dmMentions'), sent = $('#dmSent'), sov = $('#dmSov'), form = $<HTMLFormElement>('#dmKeyForm'); if (!keysBox || !list || !sent || !sov || !form) return;
  const keys = ['روتين', 'منافس', 'ترطيب البشرة'];
  let filter: 'all' | 'pos' | 'neg' = 'all';
  const draw = () => {
    keysBox.innerHTML = keys.map(k => `<span class="dm-pill dm-key">${esc(k)}</span>`).join('');
    list.innerHTML = MENTIONS.filter(m => filter === 'all' || m.s === filter).map(m => `<article class="dm-mention ${m.s}">
      <header><span class="st-chip">${m.src}</span><b dir="ltr">${esc(m.who)}</b><span class="ago">${m.ago}</span></header>
      <p>${esc(m.text)}</p><footer><span class="st-chip ${m.s === 'pos' ? 'ok' : m.s === 'neg' ? 'hot' : ''}">${S_LABEL[m.s]}</span>${m.s === 'neg' ? '<button type="button" class="btn sm secondary" data-reply>اقترح ردًا</button>' : ''}</footer>
      <p class="dm-reply" hidden>نعتذر لك، ونتواصل معك الآن على الخاص لحل الموضوع.</p></article>`).join('');
    const c = { pos: 0, neu: 0, neg: 0 }; MENTIONS.forEach(m => c[m.s]++);
    const t = MENTIONS.length;
    sent.innerHTML = `<div class="dm-sentbar"><i class="pos" style="width:${(100 * c.pos) / t}%"></i><i class="neu" style="width:${(100 * c.neu) / t}%"></i><i class="neg" style="width:${(100 * c.neg) / t}%"></i></div>
      <p class="dm-legend"><span class="sw pos"></span><span>إيجابي</span> <b>${ar((100 * c.pos) / t)}٪</b> <span class="sw neu"></span><span>محايد</span> <b>${ar((100 * c.neu) / t)}٪</b> <span class="sw neg"></span><span>سلبي</span> <b>${ar((100 * c.neg) / t)}٪</b></p>
      <p class="dm-note">أكثر موضوع سلبي: التوصيل والعبوة.</p>`;
    sov.innerHTML = [['روتين', .46], ['المنافس أ', .31], ['المنافس ب', .23]].map(([n, v]) => `<div class="dm-plat-row"><b>${n}</b><span class="bar"><i style="width:${(v as number) * 100}%"></i></span><span class="v"></span><span class="r">${ar((v as number) * 100)}٪</span></div>`).join('');
  };
  draw();
  $('#dmSentFilter')?.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-s]'); if (!b) return;
    $$('[data-s]', $('#dmSentFilter')!).forEach(x => x.setAttribute('aria-pressed', String(x === b))); filter = b.dataset.s as typeof filter; draw();
  });
  list.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-reply]'); if (!b) return;
    const r = $('.dm-reply', b.closest('article')!)!; r.hidden = false; b.remove();
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); const i = $<HTMLInputElement>('#dmKey')!, v = i.value.trim(); if (!v || keys.includes(v)) return;
    keys.push(v); i.value = ''; draw();
  });
  // Opening the section marks the new mentions as read
  $('#dmt-listen')?.addEventListener('click', () => { const b = $('[data-count-for="listen"]'); if (b && !b.hidden) bump('listen', -Number(b.dataset.n || 0)); }, { once: true });
}

// ---------------------------------------------------------------- التصميم
const SCENES: Record<string, [string, string, string]> = {
  desk: ['#F3EDE4', '#D9C7AE', '#8A6A48'], kitchen: ['#EEF3EF', '#BFD3C5', '#4F7A61'],
  nature: ['#E9F1F6', '#9DC4D8', '#3D6E86'], studio: ['#F1EEF6', '#CFC4E2', '#5D4C86'],
};
function drawProduct(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, img: HTMLImageElement | null) {
  if (img) { const r = img.width / img.height, w = h * r; ctx.drawImage(img, x - w / 2, y - h, w, h); return; }
  const w = h * .42; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * .78, w, h * .78, w * .18); ctx.fill();
  ctx.fillStyle = '#EE5A2C'; ctx.beginPath(); ctx.roundRect(x - w * .32, y - h, w * .64, h * .24, 6); ctx.fill();
  ctx.fillStyle = '#1A1A1A'; ctx.font = `600 ${Math.round(h * .07)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('ROUTINE', x, y - h * .42);
}
function render(c: HTMLCanvasElement, w: number, h: number, scene: string, head: string, img: HTMLImageElement | null) {
  const s = Math.min(2, devicePixelRatio || 1); c.width = w * s; c.height = h * s; const ctx = c.getContext('2d')!; ctx.scale(s, s);
  const [a, b, d] = SCENES[scene]!;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = d; ctx.globalAlpha = .18; ctx.fillRect(0, h * .72, w, h * .28); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(w / 2, h * .74, Math.min(w, h) * .2, Math.min(w, h) * .03, 0, 0, Math.PI * 2); ctx.fill();
  drawProduct(ctx, w / 2, h * .74, Math.min(w, h) * .5, img);
  ctx.fillStyle = '#1A1A1A'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
  ctx.font = `700 ${Math.round(Math.min(w, h) * .075)}px "Milan Display", "Thmanyah Sans", sans-serif`;
  ctx.fillText(head, w / 2, h * .16, w * .9);
  ctx.fillStyle = d; ctx.beginPath(); ctx.roundRect(w / 2 - 54, h * .84, 108, 30, 15); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 13px "Thmanyah Sans", sans-serif'; ctx.fillText('اطلب الآن', w / 2, h * .84 + 20);
}
function design() {
  const form = $<HTMLFormElement>('#dmDesignForm'), out = $('#dmDesignOut'), file = $<HTMLInputElement>('#dmProduct'); if (!form || !out || !file) return;
  let img: HTMLImageElement | null = null, scene = 'desk';
  file.addEventListener('change', () => {
    const f = file.files?.[0]; if (!f || !f.type.startsWith('image/')) return;
    const i = new Image(); i.onload = () => { img = i; $('.dm-upload span', form)!.textContent = f.name; }; i.src = URL.createObjectURL(f);
  });
  $$<HTMLButtonElement>('#dmScenes [data-scene]').forEach(b => b.addEventListener('click', () => {
    $$('#dmScenes [data-scene]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); scene = b.dataset.scene!;
  }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    out.innerHTML = '<p class="dm-msg bot">أجهّز المشهد وأضع منتجك فيه بثلاثة مقاسات…</p>';
    await new Promise(r => setTimeout(r, reduce ? 0 : 900));
    const head = $<HTMLInputElement>('#dmHead')!.value.trim() || ' ';
    out.innerHTML = `<div class="dm-designs">${[[180, 180, 'مربع ١:١'], [120, 213, 'قصة ٩:١٦'], [260, 146, 'عرضي ١٦:٩']].map(([w, h, l]) => `<figure><canvas width="${w}" height="${h}" style="height:${h}px" data-w="${w}" data-h="${h}"></canvas><figcaption>${l}</figcaption></figure>`).join('')}</div>
      <p class="dm-note">النص طبقة مستقلة: عدّله وأعد التوليد، والمنتج يبقى كما هو.</p>`;
    $$<HTMLCanvasElement>('canvas', out).forEach(c => render(c, Number(c.dataset.w), Number(c.dataset.h), scene, head, img));
  });
}

// ---------------------------------------------------------------- الصوت
function voice() {
  const form = $<HTMLFormElement>('#dmVoiceForm'), script = $<HTMLTextAreaElement>('#dmScript'), est = $('#dmEst'), player = $('#dmPlayer'), wave = $('#dmWave'), play = $<HTMLButtonElement>('#dmPlay'), time = $('#dmTime'), note = $('#dmVoiceNote');
  if (!form || !script || !est || !player || !wave || !play || !time || !note) return;
  const secs = () => Math.max(3, Math.round(script.value.trim().split(/\s+/).filter(Boolean).length / 2.3));
  const upd = () => { est.innerHTML = `<span>المدة التقريبية</span> <b>${ar(secs())}</b> <span>ثانية</span>`; };
  script.addEventListener('input', upd); upd();
  wave.innerHTML = Array.from({ length: 48 }, (_, i) => `<i style="--v:${(.25 + .75 * Math.abs(Math.sin(i * .7) * Math.cos(i * .23))).toFixed(2)}"></i>`).join('');
  let timer = 0;
  const stop = () => { clearInterval(timer); play.textContent = '▶'; play.setAttribute('aria-label', 'تشغيل'); speechSynthesis?.cancel(); };
  form.addEventListener('submit', async e => {
    e.preventDefault(); stop(); player.hidden = true; note.textContent = 'أولّد الصوت…';
    await new Promise(r => setTimeout(r, reduce ? 0 : 900));
    player.hidden = false; time.textContent = `٠:٠٠ / ٠:${ar(secs()).padStart(2, '٠')}`;
    note.textContent = `${$<HTMLSelectElement>('#dmDialect')!.value} · ${$<HTMLSelectElement>('#dmVoiceName')!.value}`;
  });
  play.addEventListener('click', () => {
    if (play.textContent === '❚❚') { stop(); return; }
    const total = secs(); let t = 0; play.textContent = '❚❚'; play.setAttribute('aria-label', 'إيقاف');
    const bars = $$('i', wave);
    const v = 'speechSynthesis' in window ? speechSynthesis.getVoices().find(x => x.lang.startsWith('ar')) : undefined;
    if (v) { const u = new SpeechSynthesisUtterance(script.value); u.voice = v; u.lang = v.lang; speechSynthesis.speak(u); }
    timer = window.setInterval(() => {
      t += .1; const p = Math.min(1, t / total);
      bars.forEach((b, i) => b.classList.toggle('on', i / bars.length < p));
      time.textContent = `٠:${ar(Math.floor(t)).padStart(2, '٠')} / ٠:${ar(total).padStart(2, '٠')}`;
      if (p >= 1) { stop(); bars.forEach(b => b.classList.remove('on')); }
    }, 100);
  });
}

// ---------------------------------------------------------------- المعرفة
function knowledge() {
  const goals = $('#dmGoals'), rules = $('#dmRules'), lessons = $('#dmLessons'), form = $<HTMLFormElement>('#dmRuleForm'); if (!goals || !rules || !lessons || !form) return;
  goals.innerHTML = [['العائد على الإنفاق', '٣×', '٣٫٤×', .9], ['تكلفة الطلب', 'أقل من ٦٠ ر.س', '٥٩ ر.س', .7], ['الإنفاق الشهري', '٦٠٬٠٠٠ ر.س', '٤٢٬١٠٠ ر.س', .7]]
    .map(([n, g, now, p]) => `<div class="dm-goal"><p><b>${n}</b> <span>الهدف</span> <span>${g}</span></p><span class="bar"><i style="width:${(p as number) * 100}%"></i></span><p class="now"><span>الآن</span> <b>${now}</b></p></div>`).join('');
  const R = ['لا ترفع ميزانية أي حملة أكثر من ٢٠٪ في اليوم.', 'أوقف أي إعلان ينفق ثلاثة أيام دون طلب.', 'لا تنشر في التواصل الاجتماعي قبل موافقتي.', 'التعليق الصوتي باللهجة النجدية فقط.'];
  const drawRules = () => { rules.innerHTML = R.map((r, i) => `<li><label><input type="checkbox" checked data-i="${i}"><span>${esc(r)}</span></label></li>`).join(''); };
  drawRules();
  form.addEventListener('submit', e => { e.preventDefault(); const i = $<HTMLInputElement>('#dmRule')!; if (!i.value.trim()) return; R.push(i.value.trim()); i.value = ''; drawRules(); });
  lessons.innerHTML = [
    ['الفيديو القصير على TikTok يحقق ضعف عائد الصور الثابتة لهذا المنتج.', 'من ١٢ قرارًا'],
    ['رفع الميزانية أكثر من ٢٥٪ يعيد الحملة إلى مرحلة التعلّم ويرفع التكلفة أسبوعًا.', 'من ٤ قرارات'],
    ['التصاميم تتعب بعد تكرار ٣٫٥ تقريبًا، فيُقترح تجديدها قبل ذلك.', 'من ٩ قرارات'],
  ].map(([t, n]) => `<li><span>${t}</span><small>${n}</small></li>`).join('');
}

// ---------------------------------------------------------------- الربط والإعدادات
function connect() {
  const box = $('#dmConns'), modes = $('#dmModes'); if (!box || !modes) return;
  const C: [string, boolean][] = [['Meta', true], ['Google Ads', true], ['Snapchat', true], ['TikTok', false], ['GA4', true], ['سلة', false]];
  const draw = () => {
    box.innerHTML = C.map(([n, on], i) => `<div class="dm-conn"><b>${n}</b>${on ? '<span class="st-chip ok">متصل</span>' : `<button type="button" class="btn sm secondary" data-c="${i}">ربط</button>`}</div>`).join('')
      + '<p class="dm-note">كل ربط بتسجيل الدخول في المنصة نفسها، دون مفاتيح.</p>';
  };
  draw();
  box.addEventListener('click', async e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-c]'); if (!b) return;
    b.disabled = true; b.textContent = 'جارٍ الربط…'; await new Promise(r => setTimeout(r, reduce ? 0 : 900));
    C[Number(b.dataset.c)]![1] = true; draw();
  });
  const A = ['احلم', 'مدير الإعلانات', 'التواصل الاجتماعي', 'الرصد', 'التصميم', 'الصوت'];
  modes.innerHTML = A.map((a, i) => `<div class="dm-mode"><b>${a}</b><div class="seg" role="group" aria-label="${a}"><button type="button" aria-pressed="${i === 3 ? 'true' : 'false'}">تلقائي</button><button type="button" aria-pressed="${i === 3 ? 'false' : 'true'}">بموافقتي</button></div></div>`).join('');
  modes.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.seg button'); if (!b) return;
    $$('button', b.parentElement!).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
}

if (document.getElementById('demo')) { bump('', 0); social(); listen(); design(); voice(); knowledge(); connect(); }
