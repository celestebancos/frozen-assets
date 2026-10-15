// The park's little timers (people walking off, the stories on the lawn) run on this clock, so pausing the
// game freezes them where they are. pause(root) also stops every CSS transition under root (the stage), and
// the stage's .paused class stops its CSS animations (rain, the fan, swings, birds, walking).
export class PauseClock {
  constructor() {
    this.paused = false;
    this.timers = new Set();
    this.held = []; // transitions stopped by pause()
  }
  // Run fn after ms of unpaused time. Returns a handle for cancel().
  after(ms, fn) {
    const t = { fn, left: ms, start: 0, id: 0 };
    this.timers.add(t);
    if (!this.paused) this.arm(t);
    return t;
  }
  arm(t) {
    t.start = performance.now();
    t.id = setTimeout(() => {
      this.timers.delete(t);
      t.fn();
    }, Math.max(0, t.left));
  }
  cancel(t) {
    if (!t) return;
    clearTimeout(t.id);
    this.timers.delete(t);
  }
  wait(ms) {
    return new Promise((r) => this.after(ms, r));
  }
  pause(root) {
    if (this.paused) return;
    this.paused = true;
    const now = performance.now();
    for (const t of this.timers) {
      clearTimeout(t.id);
      t.left -= now - t.start;
    }
    root?.classList.add('paused');
    // CSS animations stop with the class; transitions (people walking, story actors moving) need stopping here
    const anims = root?.getAnimations ? root.getAnimations({ subtree: true }) : [];
    this.held = anims.filter((a) => a.playState === 'running' && !(typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation));
    for (const a of this.held) a.pause();
  }
  resume(root) {
    if (!this.paused) return;
    this.paused = false;
    root?.classList.remove('paused');
    for (const a of this.held) if (a.playState === 'paused') a.play();
    this.held = [];
    for (const t of this.timers) this.arm(t);
  }
  // Forget every timer (leaving the park).
  clear() {
    for (const t of this.timers) clearTimeout(t.id);
    this.timers.clear();
    this.held = [];
    this.paused = false;
  }
}
