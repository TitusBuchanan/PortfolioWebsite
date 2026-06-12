// Fully procedural WebAudio SFX + ambient bed. No audio files.
let ctx = null, master = null, noiseBuf = null;

function ensure() { return ctx !== null; }

function noise(dur = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = dur > noiseBuf.duration;
  return src;
}

function env(gainNode, t0, a, peak, d) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + a);
  g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

export const SFX = {
  init() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._ambient();
  },

  _ambient() {
    // dark drone pad
    const g = ctx.createGain(); g.gain.value = 0.05; g.connect(master);
    for (const f of [55, 82.5, 110.3]) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = 0.5;
      o.connect(og); og.connect(g); o.start();
    }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.025;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    // wind
    const w = noise(999); w.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 0.4;
    const wg = ctx.createGain(); wg.gain.value = 0.045;
    const wl = ctx.createOscillator(); wl.frequency.value = 0.13;
    const wlg = ctx.createGain(); wlg.gain.value = 0.02;
    wl.connect(wlg); wlg.connect(wg.gain);
    w.connect(f); f.connect(wg); wg.connect(master);
    w.start(); wl.start();
  },

  swing(pitch = 1) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const s = noise(0.25);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6;
    f.frequency.setValueAtTime(700 * pitch, t);
    f.frequency.exponentialRampToValueAtTime(2800 * pitch, t + 0.12);
    const g = ctx.createGain();
    env(g, t, 0.015, 0.22, 0.16);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + 0.3);
  },

  hit(big = false) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const s = noise(0.2);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
    const g = ctx.createGain(); env(g, t, 0.004, big ? 0.5 : 0.3, 0.1);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.15);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(big ? 70 : 110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const og = ctx.createGain(); env(og, t, 0.004, big ? 0.6 : 0.32, 0.2);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.25);
  },

  hurt() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    const g = ctx.createGain(); env(g, t, 0.005, 0.3, 0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
  },

  step() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const s = noise(0.06);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = ctx.createGain(); env(g, t, 0.003, 0.07, 0.05);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.08);
  },

  dodge() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const s = noise(0.3);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1400, t + 0.2);
    const g = ctx.createGain(); env(g, t, 0.02, 0.16, 0.22);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.3);
  },

  crystal(idx, good = true) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const base = good ? [523, 659, 784, 988][idx % 4] : 130;
    const o = ctx.createOscillator(); o.type = good ? 'sine' : 'square';
    o.frequency.value = base;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = base * 2.01;
    const g = ctx.createGain(); env(g, t, 0.01, good ? 0.25 : 0.2, good ? 0.9 : 0.35);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + 1.1); o2.stop(t + 1.1);
  },

  bell() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    for (const [f, a] of [[392, 0.3], [587, 0.18], [988, 0.1], [1568, 0.05]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + Math.random() * 0.004);
      const g = ctx.createGain(); env(g, t, 0.004, a, 2.4);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 2.6);
    }
  },

  ignite() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const s = noise(0.7);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(4000, t + 0.15);
    f.frequency.exponentialRampToValueAtTime(800, t + 0.6);
    const g = ctx.createGain(); env(g, t, 0.03, 0.3, 0.65);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.8);
  },

  levelup() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain(); env(g, t + i * 0.09, 0.01, 0.2, 0.5);
      o.connect(g); g.connect(master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.6);
    });
  },

  boom(big = false) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(big ? 90 : 70, t);
    o.frequency.exponentialRampToValueAtTime(28, t + (big ? 0.9 : 0.4));
    const g = ctx.createGain(); env(g, t, 0.01, big ? 0.8 : 0.45, big ? 1.1 : 0.5);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.3);
    const s = noise(0.6);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = big ? 900 : 600;
    const sg = ctx.createGain(); env(sg, t, 0.01, big ? 0.4 : 0.22, big ? 0.8 : 0.4);
    s.connect(f); f.connect(sg); sg.connect(master); s.start(t); s.stop(t + 1);
  },

  octa() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const s = noise(0.1);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.value = 1200 + i * 350;
      const g = ctx.createGain(); env(g, t + i * 0.11, 0.005, 0.2, 0.09);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t + i * 0.11); s.stop(t + i * 0.11 + 0.12);
    }
  },

  chime() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    [880, 1109, 1319].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); env(g, t + i * 0.12, 0.01, 0.16, 1.2);
      o.connect(g); g.connect(master); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1.4);
    });
  },

  death() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = ctx.createGain(); env(g, t, 0.02, 0.4, 1.8);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 2);
  },
};
