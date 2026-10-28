// A frame-rate readout for the minimum-phone check (SPEC §18): add ?fps=1 to the URL. Shows the
// average over the last second and the slowest frame in it, so a 30 fps target can be read on the
// phone itself.
export function mountFpsMeter(): void {
  if (new URLSearchParams(location.search).get('fps') !== '1') return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:99;padding:2px 8px;'
    + 'font:600 12px/1.4 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.6);border-radius:6px;pointer-events:none';
  document.body.appendChild(el);
  let frames = 0, worst = 0, last = performance.now(), windowStart = last;
  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    frames++;
    worst = Math.max(worst, dt);
    if (now - windowStart >= 1000) {
      const fps = (frames * 1000) / (now - windowStart);
      el.textContent = `${fps.toFixed(0)} fps · slowest ${worst.toFixed(0)} ms`;
      el.style.color = fps >= 30 ? '#9f9' : '#f99';
      frames = 0; worst = 0; windowStart = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
