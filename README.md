# Apipeline: موقع الشركة

موقع Apipeline العام، مستقل تمامًا عن Well Ads: ريبو خاص فيه، وWorker خاص فيه، وجدول طلبات خاص فيه.

| الصفحة | الرابط | الملف |
|---|---|---|
| الرئيسية (لوحة القرارات) | `/` | `src/components/LandingPage.astro` |
| بروفايل الشركة (يطبع PDF) | `/profile/` | `src/pages/profile/index.astro` |
| صندوق الطلبات (بكلمة سر) | `/inbox/` | `src/pages/inbox/index.astro` |

- **التقنية:** Astro 7 على Cloudflare Workers. الصفحتان تُبنى مسبقًا (static)، والـ Worker يشغّل بس `/api/*` و`/inbox/`.
- **الهوية:** كحلي وبيبي بلو على كل الصفحات (`.st-night` في `public/assets/site.css`). خلفية كل الأقسام `#040C20`، والكروت زجاج بحافة مضيئة، وهو نفس لون أطراف الفيديو، عشان الفيديو يذوب في الصفحة.
- **فيديو الهيرو:** شريط ضوء أزرق يتموّج ويتنفّس على الكحلي، ٨ ثواني ويتكرر بدون قفزة (`public/assets/video/light-*.mp4`). يتبع السكرول على الكمبيوتر، ويشتغل لحاله على الجوال، ويرجع بعد الفوتر. ينولّد بـ `scripts/render-hero.py`، وتقدر تستبدله بفيديو Veo بنفس الاسم والمقاس. الطريقة كاملة في `.claude/skills/cinematic-web-builder`.
- **الحركة مع السكرول:** GSAP ScrollTrigger في `src/lib/scroll-story.ts`. وإذا المتصفح طالب حركة أقل، تطلع الصفحة ثابتة.
- **اللغة:** عربي افتراضيًا، وزر English يترجم من `public/assets/i18n-en-site.js`.
- **التواصل:** رقم الواتساب وروابط القائمة في `src/lib/public-site.ts`.
- **صوت الكتابة:** `.claude/skills/apipeline-saudi-voice`. ومعه skills السكرول والكتابة العربية في `.claude/skills` (مصادرها في `SOURCES.md`).

## نموذج الطلب

- **الحفظ:** `POST /api/request` يحفظ الطلب في جدول `site_requests` داخل قاعدة D1 على كلاود فلير اسمها `apipeline-site` (`migrations/0001_site_requests.sql`). القاعدة ما لها رابط عام، والـ Worker بس يوصل لها.
- **الحماية:**
  - يقبل بس من نفس الموقع.
  - فيه حقل مخفي للبوتات، وحد أدنى لوقت التعبئة.
  - موافقة إلزامية.
  - ثلاث طلبات بالساعة لكل زائر.
- **الخصوصية:** ما ينحفظ IP الزائر. ينحفظ بداله hash يتغيّر كل يوم.
- **الصندوق:** `/inbox/` يطلب `INBOX_PASSWORD`، واسم المستخدم أي شي. منه تغيّرين حالة الطلب أو تحذفينه.

## التشغيل محليًا

```bash
npm install
cp .dev.vars.example .dev.vars   # عبّي القيم
npx wrangler d1 migrations apply apipeline-site --local
npm run dev                      # يبني ثم يشغّل wrangler dev
```

`npm test` للاختبارات، و`npm run typecheck` للأنواع.

## النشر

النشر من هذا الريبو فقط، وما له علاقة بأي ريبو ثاني (ولا Well Ads).

- **التشغيل:** تبويب Actions ← **Deploy** ← Run workflow. يشغّل الاختبارات، ويبني الموقع، ويطبّق تعديلات قاعدة D1 الجديدة (`migrations/`)، وبعدها ينشر الـ Worker على https://pipeline.leen-b9b.workers.dev
- **أسرار GitHub (موجودة):** `CLOUDFLARE_API_TOKEN` (مفتاح خاص بالموقع بصلاحية Workers وD1) و`CLOUDFLARE_ACCOUNT_ID`.
- **أسرار الـ Worker (مرة وحدة):**
  ```bash
  npx wrangler secret put INBOX_PASSWORD --env production
  npx wrangler secret put IP_SALT --env production
  # اختياري: إشعار بكل طلب جديد (Slack/Teams/أي رابط https)
  npx wrangler secret put REQUESTS_WEBHOOK --env production
  ```
- **تعديل الجدول:** أي تعديل يكون بملف جديد في `migrations/`، وينطبق تلقائيًا في النشر التالي.
- **الدومين:** يرتبط من Cloudflare على الـ Worker `pipeline`.
