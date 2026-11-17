// Pill cards motion (src/components/PillCards.astro, documented in .claude/skills/pill-cards-motion/SKILL.md).
//
// Marquee: a light take on GSAP's horizontalLoop helper (GSAP forums / tutsplus): each row holds its pills twice, and
// one endless tween moves the track by exactly one copy (xPercent 0 → -50, or back for the reversed rows), so the seam
// never shows. Speed is set in px per second so short and long rows move at the same pace. Hover or focus eases the
// timeScale to 0 instead of a hard stop.
//
// Story, driven by the pager (auto-advances while the card is on screen, stops for good once the visitor uses it):
//   0 flowing, 1 healthy (rows ease to a stop, pills ticked), 2 disrupted then fixed (one pill per row breaks out along
//   a thin curved arrow with a label, holds, then snaps back with a back-out ease).
// Reduced motion: no marquee, no drift. The rows sit still and the pager only switches the text.
import { gsap } from 'gsap';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = 38;                         // px per second
const DWELL = [6000, 4200, 7000];         // ms on each step while auto-advancing
const SVG = 'http://www.w3.org/2000/svg';

function horizontalLoop(track: HTMLElement, reversed: boolean) {
  const w = track.scrollWidth / 2;
  return gsap.fromTo(track, { xPercent: reversed ? -50 : 0 }, { xPercent: reversed ? 0 : -50, duration: w / SPEED, ease: 'none', repeat: -1 });
}

function setup(card: HTMLElement) {
  const rows = [...card.querySelectorAll<HTMLElement>('[data-pc-row]')];
  const box = card.querySelector<HTMLElement>('[data-pc-rows]')!;
  const svg = card.querySelector<SVGSVGElement>('[data-pc-arrows]')!;
  const notes = [...card.querySelectorAll<HTMLElement>('.pc-note')];
  const fixedTag = card.querySelector<HTMLElement>('[data-pc-fixed]')!;
  const go = [...card.querySelectorAll<HTMLButtonElement>('[data-pc-go]')];
  const texts = [...card.querySelectorAll<HTMLElement>('[data-pc-text]')];
  let step = 0, timer = 0, manual = false, visible = false, hovered = false;
  let story: gsap.core.Timeline | null = null;

  const loops = reduce ? [] : rows.map(r => horizontalLoop(r.querySelector<HTMLElement>('[data-pc-track]')!, r.dataset.pcRow === 'rev'));
  const speed = (to: number, d = .8) => loops.forEach(l => gsap.to(l, { timeScale: to, duration: d, ease: 'power2.out', overwrite: true }));
  const flowing = () => step === 0 && !hovered && visible;
  const sync = () => { if (!reduce) speed(flowing() ? 1 : 0); };

  function clearStory() {
    story?.kill(); story = null;
    svg.querySelectorAll('path.pc-arc').forEach(p => p.remove());
    gsap.set(card.querySelectorAll('.pc-pill'), { clearProps: 'transform,zIndex' });
    card.querySelectorAll('.pc-pill.is-out').forEach(p => p.classList.remove('is-out'));
    gsap.set([...notes, fixedTag], { autoAlpha: 0 });
  }

  // one pill per row near a target spot, so the four breaks spread over the card
  function pick() {
    const b = box.getBoundingClientRect(); const spots = [.3, .66, .42, .78];
    return rows.map((r, i) => {
      let best: HTMLElement | null = null, d = Infinity;
      r.querySelectorAll<HTMLElement>('.pc-pill').forEach(p => {
        const c = p.getBoundingClientRect(); const x = (c.left + c.width / 2 - b.left) / b.width;
        if (c.left + c.width / 2 < b.left + 12 || c.left + c.width / 2 > b.right - 12) return;
        const dd = Math.abs(x - spots[i % spots.length]!); if (dd < d) { d = dd; best = p; }
      });
      return best as HTMLElement | null;
    });
  }

  function disrupt() {
    clearStory();
    const b = box.getBoundingClientRect(); const picks = pick();
    const tl = gsap.timeline({ delay: .3 }); story = tl;
    picks.forEach((p, i) => {
      if (!p) return;
      const c = p.getBoundingClientRect();
      const sx = c.left + c.width / 2 - b.left, sy = c.top + c.height / 2 - b.top;
      const up = i < 2 ? -1 : 1, side = i % 2 ? -1 : 1;
      const dx = side * Math.min(110, b.width * .14), dy = up * (i === 0 || i === 3 ? 40 : 24), rot = side * (10 + i * 4);
      const ex = sx + dx, ey = sy + dy;
      const arc = document.createElementNS(SVG, 'path');
      const mx = (sx + ex) / 2 + side * 26, my = (sy + ey) / 2 + up * 30;
      arc.setAttribute('d', `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`); arc.setAttribute('class', 'pc-arc');
      arc.setAttribute('marker-end', svg.dataset.tip || '');
      svg.appendChild(arc);
      const len = arc.getTotalLength(); gsap.set(arc, { strokeDasharray: len, strokeDashoffset: len });
      const n = notes[i];
      if (n) gsap.set(n, { left: Math.max(70, Math.min(b.width - 70, ex)), top: Math.max(2, Math.min(b.height - 28, ey + up * 30 - 12)) });
      tl.add(() => p.classList.add('is-out'), i * .12)
        .to(p, { x: dx, y: dy, rotation: rot, zIndex: 3, duration: .9, ease: 'power2.out' }, i * .12)
        .to(arc, { strokeDashoffset: 0, duration: .7, ease: 'power1.inOut' }, i * .12 + .15)
        .to(n ?? {}, { autoAlpha: 1, duration: .3 }, i * .12 + .6);
    });
    tl.to({}, { duration: 1.6 })
      .addLabel('fix')
      .to(svg.querySelectorAll('.pc-arc'), { autoAlpha: 0, duration: .3 }, 'fix')
      .to(notes, { autoAlpha: 0, duration: .25 }, 'fix')
      .to(picks.filter(Boolean), { x: 0, y: 0, rotation: 0, duration: .75, ease: 'back.out(1.7)', stagger: .08 }, 'fix+=.1')
      .add(() => picks.forEach(p => p?.classList.remove('is-out')), 'fix+=.5')
      .to(fixedTag, { autoAlpha: 1, duration: .35 }, 'fix+=.6');
  }

  function show(i: number) {
    step = i;
    go.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    texts.forEach((t, j) => (t.hidden = j !== i));
    card.dataset.step = String(i);
    clearStory(); sync();
    if (i === 2) { if (reduce) gsap.set(fixedTag, { autoAlpha: 1 }); else disrupt(); }
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (manual || reduce || !visible || hovered) return;
    timer = window.setTimeout(() => show((step + 1) % texts.length), DWELL[step] ?? 5000);
  }

  go.forEach((b, i) => b.addEventListener('click', () => { manual = true; show(i); }));
  const hold = (on: boolean) => { hovered = on; sync(); schedule(); };
  card.addEventListener('pointerenter', () => hold(true));
  card.addEventListener('pointerleave', () => hold(false));
  card.addEventListener('focusin', () => hold(true));
  card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget as Node | null)) hold(false); });
  new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; sync(); schedule(); }, { threshold: .35 }).observe(card);
  gsap.set([...notes, fixedTag], { autoAlpha: 0 });
  show(0);
}

document.querySelectorAll<HTMLElement>('[data-pc]').forEach(setup);
