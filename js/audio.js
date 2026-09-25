/* Procedural audio engine: zero audio files. Ambience (rain/birds/focus
   tones) is synthesized live with Web Audio; all SFX are tiny synth blips.
   Everything here is original — no external tracks, fully offline. */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null; this.amb = null; this.sfxBus = null;
    this.muted = false;
    this.volA = 0.6; this.volS = 0.8;
    this.rain = null; this.birdTimer = null; this.toneTimer = null; this.toneStep = 0;
    this._unlocked = false;
  }
  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    const go = () => { try { this.ensure(); } catch {} };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
  }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1;
      this.amb = this.ctx.createGain(); this.amb.gain.value = this.volA;
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.volS;
      this.amb.connect(this.master); this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  }
  setMuted(m) {
    this.muted = m;
    document.body.classList.toggle("muted", m);
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }
  setVolA(v) { this.volA = v; if (this.ctx) this.amb.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setVolS(v) { this.volS = v; if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }

  noiseBuffer(sec = 2) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  /* ---- rain ---- */
  setRain(on) {
    if (on && !this.rain) {
      if (!this.ensure()) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer(); src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1400;
      const g = this.ctx.createGain(); g.gain.value = 0.16;
      src.connect(f); f.connect(g); g.connect(this.amb);
      src.start();
      this.rain = { src, g };
    } else if (!on && this.rain) {
      try { this.rain.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); const r = this.rain; setTimeout(() => { try { r.src.stop(); } catch {} }, 700); } catch {}
      this.rain = null;
    }
    document.querySelector("#room")?.setAttribute("data-rain", on ? "true" : "false");
  }

  /* ---- birds ---- */
  setBirds(on) {
    clearTimeout(this.birdTimer); this.birdTimer = null;
    if (on) { if (this.ensure()) this._chirpLoop(); }
  }
  _chirpLoop() {
    if (this.birdTimer === "off") return;
    this._chirp();
    this.birdTimer = setTimeout(() => this._chirpLoop(), 5000 + Math.random() * 9000);
  }
  _chirp() {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + 0.05;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const o = this.ctx.createOscillator(); o.type = "sine";
        const g = this.ctx.createGain(); g.gain.value = 0;
        const t = t0 + i * 0.16;
        const f = 2400 + Math.random() * 900;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.07);
        o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.13);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.03);
        g.gain.linearRampToValueAtTime(0, t + 0.14);
        o.connect(g); g.connect(this.amb);
        o.start(t); o.stop(t + 0.16);
      }
    } catch {}
  }

  /* ---- generative focus tones (original pad progression) ---- */
  setTones(on) {
    clearInterval(this.toneTimer); this.toneTimer = null;
    if (on) {
      if (!this.ensure()) return;
      this.toneStep = 0;
      this._pad();
      this.toneTimer = setInterval(() => this._pad(), 4600);
    }
  }
  _pad() {
    if (!this.ctx || this.muted) return;
    const chords = [
      [130.81, 164.81, 196.0, 246.94],   // Cmaj7
      [110.0, 130.81, 164.81, 196.0],    // Am7
      [87.31, 130.81, 174.61, 220.0],    // Fmaj7
      [98.0, 146.83, 196.0, 246.94],     // G6
    ];
    const notes = chords[this.toneStep++ % chords.length];
    try {
      const t0 = this.ctx.currentTime + 0.05;
      const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 750;
      lp.connect(this.amb);
      notes.forEach((f) => {
        const o = this.ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 1.5);
        g.gain.linearRampToValueAtTime(0, t0 + 4.4);
        o.connect(g); g.connect(lp);
        o.start(t0); o.stop(t0 + 4.6);
      });
    } catch {}
  }

  /* ---- one-shot SFX ---- */
  blip(f0, f1, dur, type = "sine", vol = 0.2, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  }
  noiseHit(dur = 0.12, freq = 2500, vol = 0.12, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime + when;
      const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuffer(0.3);
      const f = this.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.sfxBus);
      s.start(t); s.stop(t + dur + 0.05);
    } catch {}
  }
  sfx(name) {
    if (!this.ensure()) return;
    switch (name) {
      case "tick": this.blip(1100, 900, 0.05, "square", 0.04); break;
      case "pop": this.blip(480, 880, 0.1, "sine", 0.22); break;
      case "sip": this.blip(320, 560, 0.18, "sine", 0.16); this.noiseHit(0.08, 3000, 0.05, 0.1); break;
      case "page": this.noiseHit(0.14, 1800, 0.14); break;
      case "chime-soft": this.blip(523.25, 523.25, 0.9, "triangle", 0.16); this.blip(783.99, 783.99, 1.1, "triangle", 0.14, 0.14); break;
      case "chime":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.blip(f, f, 1.2, "triangle", 0.16, i * 0.13));
        this.blip(1318.5, 1318.5, 1.4, "sine", 0.07, 0.55);
        break;
    }
  }
}
