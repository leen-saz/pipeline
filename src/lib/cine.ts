// The cinematic hero (src/components/CineHero.astro). The stage is CSS-sticky inside a tall section, so there is no
// GSAP pin to fight the other scenes; one scrubbed timeline fades the intro out, walks through the chapters and lands
// on the closing line. On wide screens the video follows the scroll (cinematic-web-builder, phase 8): a
// requestAnimationFrame loop eases currentTime toward the target, never seeks while a seek is running, and keeps a
// slow drift of its own so the network never freezes. The clip is a seamless loop, so time wraps around.
// Phones get the plain autoplay loop; reduced motion gets the poster and the static layout.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 900px) and (pointer: fine)');

function scrubVideo(v: HTMLVideoElement, stage: HTMLElement, progress: () => number) {
  const DRIFT = 0.35;          // seconds of video per second of wall time when nobody scrolls
  const SPAN = 1;              // loops of video across the whole stage
  let base = 0, last = performance.now();
  v.pause();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const r = stage.getBoundingClientRect();
    const dur = v.duration;
    // only while the stage is on screen and the clip can seek
    if (r.bottom > 0 && r.top < innerHeight && dur && v.readyState >= 2) {
      base = (base + DRIFT * dt) % dur;
      const target = (base + progress() * SPAN * dur) % dur;
      let d = target - v.currentTime;
      if (d > dur / 2) d -= dur; else if (d < -dur / 2) d += dur;
      if (!v.seeking && Math.abs(d) > 1 / 90) v.currentTime = (v.currentTime + d * 0.15 + dur) % dur;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

for (const sec of document.querySelectorAll<HTMLElement>('[data-cine]')) {
  const video = sec.querySelector<HTMLVideoElement>('[data-cine-video]');
  if (reduce) { video?.pause(); video?.removeAttribute('autoplay'); continue; }
  sec.classList.add('cine-on');
  const intro = sec.querySelector('[data-cine-intro]');
  const chs = [...sec.querySelectorAll<HTMLElement>('[data-cine-ch]')];
  const fin = sec.querySelector('[data-cine-finale]');
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
  tl.to(intro, { autoAlpha: 0, y: -48, duration: 1 }, 0.4);
  let at = 1.2;
  chs.forEach((c, i) => {
    const side = c.dataset.side === 'end' ? -1 : 1;
    tl.fromTo(c, { autoAlpha: 0, y: 40, x: 24 * side }, { autoAlpha: 1, y: 0, x: 0, duration: 0.8 }, at);
    // each chapter is gone before the next one arrives: on phones they share the same spot
    if (i < chs.length - 1 || fin) tl.to(c, { autoAlpha: 0, y: -40, duration: 0.5 }, at + 1.5);
    at += 2.1;
  });
  if (fin) tl.fromTo(fin, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.8 }, at);
  tl.to({}, { duration: 0.6 });   // hold the last frame before the page moves on
  if (video) {
    if (wide.matches) scrubVideo(video, sec.querySelector<HTMLElement>('.cine-stage')!, () => tl.scrollTrigger?.progress ?? 0);
    else video.play().catch(() => { /* autoplay refused: the poster stays */ });
  }
}
ScrollTrigger.refresh();

// The footer's copy of the video: plays only while it is on screen, never for reduced motion
const foot = document.querySelector<HTMLVideoElement>('[data-foot-video]');
if (foot) {
  if (reduce) { foot.removeAttribute('autoplay'); foot.pause(); }
  else new IntersectionObserver(([e]) => { if (e?.isIntersecting) { foot.preload = 'auto'; foot.play().catch(() => {}); } else foot.pause(); }, { rootMargin: '200px' }).observe(foot);
}
