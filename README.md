# Apipeline: موقع الشركة

موقع Apipeline العام، مستقل تمامًا عن Well Ads: ريبو خاص فيه، وWorker خاص فيه، وجدول طلبات خاص فيه.

| الصفحة | الرابط | الملف |
|---|---|---|
| الرئيسية (لوحة القرارات) | `/` | `src/components/LandingPage.astro` |
| الأمن السيبراني (موقع مستقل) | https://apipeline-security.leen-b9b.workers.dev | `src/components/SecurityPage.astro` (`npm run build:security` ثم `wrangler deploy --env security`. البيئة تنحدد وقت البناء، فلازم كل موقع ينبني بأمره قبل نشره) |
| بروفايل الشركة (يطبع PDF) | `/profile/` | `src/pages/profile/index.astro` |
| صندوق الطلبات (بكلمة سر) | `/inbox/` | `src/pages/inbox/index.astro` |

- **التقنية:** Astro 7 على Cloudflare Workers. الصفحات الثلاث تُبنى مسبقًا (static)، والـ Worker يشغّل بس `/api/*` و`/inbox/`.
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

## النشر (مرة وحدة)

1. **قاعدة الطلبات:** موجودة على كلاود فلير. أي تعديل على الجدول يكون بملف جديد في `migrations/`، وبعدها:
   ```bash
   npx wrangler d1 migrations apply apipeline-site --remote
   ```
2. **أسرار الـ Worker:**
   ```bash
   npx wrangler secret put INBOX_PASSWORD --env production
   npx wrangler secret put IP_SALT --env production
   # اختياري: إشعار بكل طلب جديد (Slack/Teams/أي رابط https)
   npx wrangler secret put REQUESTS_WEBHOOK --env production
   ```
3. **أسرار GitHub:** حط `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID` في أسرار الريبو. بعدها شغّل workflow **Deploy** يدويًا من تبويب Actions، أو شغّل `npm run deploy -- --env production` من جهازك.
4. **الدومين:** اربطه من Cloudflare على الـ Worker `pipeline`.
