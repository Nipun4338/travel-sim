export const FIXED_DT = 1 / 60;

/**
 * Runs `step` at a fixed 60 Hz and `render` once per animation frame. `ahead` is how far (in seconds,
 * under one step) the frame is past the last step, so moving things can be drawn where they are now.
 */
export function startLoop(step: (dt: number) => void, render: (frameDt: number, ahead: number) => void): void {
  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    const frameDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += frameDt;
    while (acc >= FIXED_DT) {
      step(FIXED_DT);
      acc -= FIXED_DT;
    }
    render(frameDt, acc);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
