---
name: pill-cards-motion
description: Apipeline's "pill cards" pattern. A frosted glass card has a small ①②③ pager, a heading and a sub-line, and rows of rounded pills that run as endless marquees in alternating directions. Step 2 calms the rows into a tidy, healthy state. In step 3 a few pills break out along thin curved arrows with labels, then snap back once the agent fixes them. Use it for any "before: messy → after: in order" story on a public page, or when someone asks for pill rows, marquee pills, "pill cards", «كروت الحبوب» or «شرائح متحركة» in this style.
---

# Pill cards motion

The pattern tells one story in three beats inside a single card:
1. **Flowing.** Everything in one place: the agents, the platforms, the loop and the numbers all run.
2. **Healthy.** The rows ease to a stop and every pill gets a small green tick.
3. **Disrupted, then fixed.** One pill per row breaks out, rotates and drifts along a thin curved arrow with a short label (for example «يصرف بلا طلب»). After a hold, the pills snap back with a back-out ease and a «رجّعها الإيجنت بموافقتك» chip appears.

It lives in three files:
- `src/components/PillCards.astro` holds the markup and props.
- `src/lib/pill-cards.ts` holds the motion and is built on GSAP.
- `public/assets/site.css`, in the "pill cards" block, holds the look.

The first use is on the landing page (`src/pages/index.astro`), right after the hero.

## Structure

```
section.pc-sec > .st-wrap > article.pc[data-pc]
  .pc-pager (role=group)        3 buttons [data-pc-go], aria-pressed, 44×44 px hit area, 26 px circle
  .pc-texts > .pc-text[data-pc-text=i]  kick + h2/h3 + p (+ ul.pc-list on the last step); only the active one is shown
  ul.sr-only                    every pill label, once, for screen readers
  .pc-rows[aria-hidden]         the visual rows
    .pc-row[data-pc-row=fwd|rev] > .pc-track[dir=ltr] > .pc-set ×2 > .pc-pill
    svg.pc-arrows               curved arcs are added here in step 3
    .pc-notes > .pc-note        drift labels, positioned by JS
    .pc-fixed                   the "fixed" chip
  footer.pc-foot > .pc-badge    pill-shaped wordmark
```

Props: `rows: string[][]`, `steps: {kick,title,text,list?}[]`, `drift: string[]` (one label per row), `fixed: string`, `label` (the pager's aria-label), and an optional `id` (default `pills`).

Example:

```astro
<PillCards label="خطوات القصة" rows={ROWS} steps={STEPS} drift={DRIFT} fixed="رجّعها الإيجنت بموافقتك" />
```

**English:** every Arabic string needs its pair in `public/assets/i18n-en-site.js`. Each pill is its own text node, so `i18n.js` translates it as-is.

## Motion and timings

- **Marquee.** This is a light take on GSAP's `horizontalLoop` helper.
  - Each track holds its pills twice, and one tween moves it by exactly one copy: `xPercent 0 → -50`, or the reverse on `rev` rows. The seam never shows.
  - Speed is fixed at **38 px/s**, so every row moves at the same pace whatever its length (`duration = width/2 / 38`).
  - Tracks are forced to `dir="ltr"` so the maths is the same in RTL. Pill text keeps `dir="auto"`.
- **Pause.** On hover or focus, `timeScale` eases to 0 over **0.8 s** with `power2.out`. It never hard-stops. The same easing pauses the rows when the card is off screen (IntersectionObserver, threshold 0.35) and in steps 2 and 3.
- **Pager.** It auto-advances while the card is visible and not hovered.
  - It dwells **6 s** on ①, **4.2 s** on ② and **7 s** on ③.
  - The first click by the visitor stops auto-advance for good.
- **Disruption (step 3).** The timeline starts after a 0.3 s delay. Pills are staggered by 0.12 s.
  - Drift: 0.9 s, `power2.out`. Each pill moves up to 14 % of the card width sideways and 34–56 px up or down, with a 10–22° rotation.
  - Arc draw: a stroke-dashoffset tween, 0.7 s.
  - Label: fades in 0.3 s.
  - Hold 1.6 s, then fix: arcs and labels fade, then pills return in 0.75 s with `back.out(1.7)` and a 0.08 s stagger, then the chip fades in.
  - Breakouts pick one pill per row near the spots 30 / 66 / 42 / 78 % of the width, from pills whose centre is inside the card, so the four spread out.
- **Properties.** Only transforms and opacity are animated, following gsap-performance. Arcs are SVG quadratic curves with an arrowhead marker.

## Accessibility

- The visual rows are `aria-hidden`. The labels are listed once in `.sr-only`.
- The pager uses real buttons with `aria-pressed` and an accessible name («١ من ٣»). Focus is visible on the circle.
- Hover and focus both pause the motion. The text never moves.
- **`prefers-reduced-motion: reduce`:**
  - No marquee and no drift.
  - The rows wrap and centre, and the duplicate copy is hidden.
  - The pager only switches the text. The step-3 chip is shown statically, and the issues stay readable in `.pc-list`.
- Without JS, step ① shows with still rows.
- Pills are 40 px tall (36 px on phones). They are decorative, not targets.

## Reusing it

- Keep 3–4 rows of 5–8 short labels, at most about 3 words each. Long pills break the rhythm.
- Keep exactly one drift label per row, at most about 4 words.
- The card reads the page's glass tokens (`--glass`, `--glass-edge`). Pill colours come from `--pill`, `--pill-edge`, `--ok` and `--bad` on `.pc`, so restate those for a dark section.
- **Copy:** the Saudi house voice (`apipeline-saudi-voice`): dialect for the kicks and titles, light MSA for the sub-lines, no superlatives.

## Credits

- **Marquee loop:** the `horizontalLoop()` helper from the GreenSock forums and docs (GSAP helper functions; also covered on tutsplus). This is a simplified version: two copies and one tween per row.
- **Grainy gradients:** an SVG `feTurbulence` noise layer over CSS gradients (css-tricks, "Grainy Gradients"; Frontend Masters' write-up of the same technique).
- **Physics:** Matter.js (MIT) was considered for the breakout but not used. A GSAP timeline keeps it light and deterministic.
