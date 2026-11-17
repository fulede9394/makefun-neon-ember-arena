// Audio: every sound is synthesized with WebAudio oscillators — no audio
// files, no network. Created lazily on first user gesture so browsers
// allow it; silent (but harmless) in headless screenshot mode.
export function createAudio() {
  let ctx = null;
  let muted = false;
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t); osc.stop(t + dur);
  }
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    shoot() { tone(720, 0.07, 'square', 0.05, 320); },
    hit() { tone(190, 0.08, 'sawtooth', 0.08, 90); },
    explode() { tone(140, 0.3, 'sawtooth', 0.14, 40); tone(70, 0.35, 'triangle', 0.12, 30); },
    hurt() { tone(220, 0.18, 'sawtooth', 0.12, 70); },
    wave() { tone(440, 0.12, 'sine', 0.1); setTimeout(() => tone(660, 0.16, 'sine', 0.1), 120); },
    upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.1), i * 90)); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.11), i * 140)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sawtooth', 0.08), i * 160)); },
  };
}
