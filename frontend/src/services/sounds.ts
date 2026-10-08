// Sound effects using Web Audio API — no files needed, pure synthesis

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  isEnabled() { return this.enabled; }

  // Must be called on first user gesture to unlock AudioContext
  resume() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {}
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.01);
    } catch {}
  }

  private noise(duration: number, vol = 0.1, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const bufSize = ctx.sampleRate * duration;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      src.start(ctx.currentTime + delay);
      src.stop(ctx.currentTime + delay + duration + 0.01);
    } catch {}
  }

  // ── Sound effects ────────────────────────────────────────
  move() {
    this.noise(0.06, 0.15);
    this.tone(440, 0.06, 'square', 0.08);
  }

  capture() {
    this.noise(0.12, 0.2);
    this.tone(200, 0.1, 'sawtooth', 0.12);
    this.tone(150, 0.1, 'sawtooth', 0.08, 0.05);
  }

  check() {
    this.tone(880, 0.08, 'square', 0.2);
    this.tone(660, 0.1, 'square', 0.15, 0.08);
  }

  castle() {
    this.noise(0.05, 0.1);
    this.tone(330, 0.05, 'sine', 0.15);
    this.tone(440, 0.05, 'sine', 0.15, 0.06);
  }

  promote() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.25, i * 0.08));
  }

  win() {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((f, i) => this.tone(f, 0.15, 'sine', 0.3, i * 0.12));
  }

  lose() {
    [392, 349, 330, 294].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.25, i * 0.15));
  }

  draw() {
    [440, 440, 440].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.2, i * 0.15));
  }

  tick() {
    this.tone(880, 0.04, 'square', 0.05);
  }

  lowTime() {
    this.tone(660, 0.08, 'square', 0.15);
    this.tone(440, 0.08, 'square', 0.12, 0.1);
  }

  reaction() {
    this.tone(660, 0.08, 'sine', 0.2);
    this.tone(880, 0.08, 'sine', 0.2, 0.08);
  }
}

export const sounds = new SoundService();
