// The hero orb (src/components/OrbHero.astro) leans a few pixels toward the cursor on desktop. One rAF loop eases the
// offset (lerp 0.06) and stops itself once it settles, so nothing runs while the mouse is still. Off for touch screens
// and for reduced motion (the CSS animations are switched off there too).
const orb = document.querySelector<HTMLElement>('[data-orb]');
const fine = matchMedia('(pointer: fine) and (min-width: 900px)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (orb && fine && !reduce) {
  const MAX = 22;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const tick = () => {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    orb.style.setProperty('--mx', `${x.toFixed(2)}px`); orb.style.setProperty('--my', `${y.toFixed(2)}px`);
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth - 0.5) * 2 * MAX; ty = (e.clientY / innerHeight - 0.5) * 2 * MAX;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
}
export {};
