---
name: cinematic-web-builder
description: Build award-style cinematic websites with AI-generated video backgrounds — Pinterest inspiration → ChatGPT image → Google Veo (Flow "Frames to Video") animation → Claude Code build (React + Vite + Tailwind) with pinned and scroll-scrubbed video heroes → screen-record and post on X to grow. Use whenever the user wants an animated/3D/cinematic landing page, a hero section with a video background, a scroll-driven video effect, a "motion site", a website from a Pinterest reference, prompts for turning an image into a looping background video, or advice on posting a website demo on X/Twitter — including Arabic requests like "موقع متحرك", "هيرو فيديو", "خلفية فيديو للموقع", "موقع سينمائي", "صفحة هبوط فخمة", "حوّل الصورة لفيديو للموقع", "انشر الموقع في تويتر".
---

# Cinematic Web Builder

A repeatable pipeline for websites that look hand-crafted and animated rather than "AI template". The look comes from three things working together: **a real video background** (not CSS effects), **a design system set first and reused everywhere**, and **a single background color sampled from the video** so sections blend into it.

Reply in the user's language (often Saudi Arabic). Image and video generation happen in the user's own tools (ChatGPT, Google Flow), so for those phases your job is to hand over ready-to-paste prompts and say exactly what settings to pick. For the build phases, write the code yourself.

Work phase by phase and show the result after each one. Don't build the whole site in one go: when the site is built step by step, each section reuses the style the hero already set, and that reuse is what keeps the design consistent.

---

## Phase 1: Inspiration
Ask the user for a reference image (Pinterest is the usual source): a 3D object, planet, product or scene that fits the brand. If they have none, suggest Pinterest search terms for their niche. The image should have **one hero object**, a dark or simple backdrop, and room for text.

## Phase 2: Hero image (ChatGPT)
Give a prompt to paste into ChatGPT along with the reference image:

> Create an image like this, but place the [object] closer to the bottom of the frame and leave a lot of empty space above it. 16:9 landscape, dark background, no text.

Why: the empty space is where the headline will sit. Tell the user ChatGPT may return 3:2 instead of 16:9, and that they should crop or extend the image if so.

## Phase 3: Image → video (Google Veo in Flow)
Use **Frames to Video** with a start frame and an end frame.

- **Seamless loop** (hero or footer that plays automatically): use the **same image** as the start and end frame. The motion then returns to where it began, so the loop never jumps.
- **Directional motion** (a video scrubbed by scroll): generate a second image of the same scene in ChatGPT (for example a rotated angle) and use it as the end frame.

Video prompt to paste:
> Rotate the [object] slowly in place. Smooth motion with true depth. Do not change size or position, no zoom in or zoom out, no camera movement.

Settings: 16:9, highest available resolution, about 8 seconds. Veo may add audio; that's fine, because the site plays the video muted.

"No zoom" and "no position change" are the most important instructions: a background video has to stay still so the text layout on top of it doesn't break.

## Phase 4: Build the hero (Claude Code)
1. If the user has a design prompt or template they like (e.g. from motionsites.ai), start from it so you have fonts, spacing and a nav already set. Otherwise set them yourself: a serif display font for headings (e.g. Playfair Display italic) with a clean sans for body text (Inter), a pill-shaped nav, and generous whitespace.
2. Stack: React + TypeScript + Vite + Tailwind + lucide-react.
3. Build **only the hero section** first, on a pure black background, without hover or reveal effects for now.
4. Add the video as the hero background with `autoPlay muted loop playsInline`, `object-cover`, and **no overlay or gradient on top of it**. Change the accent color to one that fits the video, ask the user for a hex value, or pick one from the video itself.

## Phase 5: Sections that build on the hero
- **Pinned video:** keep the hero video fixed while the hero text fades out, then show 2–3 "chapters" of text (tagline, headline, short description) placed around the video (left and right) with no card backgrounds. Then a short headline.
- Then build the rest of the page in **4–5 sections** in the same style, and hide the video once the pinned part ends. Good section types: an eras or feature list, a row of stats, a quote, pricing (3 tiers with a "Most popular" middle card), an FAQ accordion, and a closing call-to-action plus footer.
- If two sections come out too similar, delete one rather than tweaking it.
- Watch for AI-looking tells: purple strokes around every card, gradient borders, identical card grids. Remove strokes and keep at most one highlighted element per section.

## Phase 6: Match colors to the video
Sample the video's average background color: take a frame, blur it heavily (with ffmpeg `boxblur`, or ask the user to do it in Figma), then pick a pixel. Use that hex (often around `#09090B`) as the background of **every** section. When the page color equals the video's edge color, the video looks like part of the page instead of a box on top of it.

```bash
ffmpeg -ss 1 -i hero.mp4 -frames:v 1 -vf "boxblur=40:5,scale=1:1" -f rawvideo -pix_fmt rgb24 - | xxd -p
```

## Phase 7: More video
Put video backgrounds behind sections that look empty: the stats row, the quote, and the closing CTA. Let the CTA video run behind the footer as well. Remove the divider between them, and the copyright line if the user wants it gone. Use no overlays anywhere. Make text readable instead: white footer headings, light text, and adjusting `object-position` so the bright part of the video isn't behind the text.

## Phase 8: Scroll-scrubbed hero video
Tie the hero video's `currentTime` to scroll progress:
- Run a `requestAnimationFrame` loop that lerps toward the target time (about 0.15 per frame, with a small dead zone).
- Don't send a new seek while one is still running (check `video.seeking`).
- Map the full video length to roughly the pinned section's scroll distance (for example finishing at about 1.25 viewports), then hold the last frame.
- Fade the video into the solid background color with a gradient, so it doesn't cut off hard at the boundary.
- Re-encode for smooth seeking, especially in Safari:
  ```bash
  ffmpeg -i in.mp4 -c:v libx264 -g 15 -keyint_min 15 -an -movflags +faststart out.mp4
  ```
- If a `mix-blend-difference` heading glitches over the video, wrap the video in `isolation: isolate`.

## Phase 9: The rest of the pages
Add react-router-dom and shared building blocks (nav with active state, mobile menu, section heading, the CTA plus footer), then build the inner pages (features, guides, pricing, sign-up...) in the same style, reusing the existing videos. Every page ends with the shared CTA plus footer. Check every route in the browser and on mobile widths.

## Phase 10: Post it on X (growth)
When the user wants to share the result:
1. Screen-record a 15–25 second walkthrough: hero animation, scroll effect, one or two other pages.
2. **The first frame is the thumbnail.** Trim the clip so it starts at a moment where the animation is moving and the headline is visible.
3. Keep the text very short, tag the tool used (e.g. `@claudeai`), add one emoji, and don't write an essay. Example: "@claudeai + Claude Code ❤️ It's easy now to create websites with AI".
4. Post the lead magnet (prompts, template, contact link) **in a reply**, not in the main post. The main post just shows value; a link there reads as spam.

---

## Quick checklist before calling it done
- [ ] Every video: muted, playsInline, no overlay, no zoom drift
- [ ] All section backgrounds use the color sampled from the video
- [ ] No more than one stroked or highlighted card per section
- [ ] Scroll-scrubbed video re-encoded with `-g 15`
- [ ] Looks right on mobile (stacked layout, hamburger menu, `100dvh` heroes)
- [ ] Typecheck passes and there are no console errors on any route
