// Hablena sound effects, synthesised with the Web Audio API (no audio files, no licences).
// window.HablenaSfx.play('correct' | 'wrong' | 'tap' | 'combo' | 'complete'), .muted, .toggle()
(() => {
  const KEY = 'hablena-sfx-muted';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch {}
  let ctx = null;
  const audio = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  // One soft bell-like note: sine + quieter octave, fast attack, exponential decay.
  function note(ac, freq, start, dur = 0.35, gain = 0.18, type = 'sine') {
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, start);
    out.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    out.connect(ac.destination);
    [[freq, 1], [freq * 2, 0.25]].forEach(([f, g]) => {
      const osc = ac.createOscillator();
      const og = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, start);
      og.gain.value = g;
      osc.connect(og).connect(out);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  }

  function thud(ac, start) {
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, start);
    out.gain.exponentialRampToValueAtTime(0.16, start + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(out).connect(ac.destination);
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, start);
    osc.frequency.exponentialRampToValueAtTime(110, start + 0.28);
    osc.connect(filter);
    osc.start(start);
    osc.stop(start + 0.35);
  }

  const SOUNDS = {
    tap: (ac, t) => note(ac, 1180, t, 0.06, 0.05),
    correct: (ac, t) => { note(ac, 784, t, 0.22, 0.16); note(ac, 1175, t + 0.09, 0.42, 0.16); },
    wrong: (ac, t) => { thud(ac, t); thud(ac, t + 0.13); },
    combo: (ac, t) => [784, 988, 1175, 1568].forEach((f, i) => note(ac, f, t + i * 0.07, 0.3, 0.12)),
    complete: (ac, t) => {
      [523, 659, 784, 1047].forEach((f, i) => note(ac, f, t + i * 0.11, 0.5, 0.15));
      [1319, 1568, 2093].forEach((f, i) => note(ac, f, t + 0.5 + i * 0.06, 0.6, 0.07, 'triangle'));
    },
  };

  window.HablenaSfx = {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch {}
      return muted;
    },
    play(name) {
      if (muted || !SOUNDS[name]) return;
      const ac = audio();
      if (!ac) return;
      SOUNDS[name](ac, ac.currentTime + 0.01);
    },
  };
})();
