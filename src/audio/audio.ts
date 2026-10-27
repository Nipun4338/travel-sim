// Web Audio for the game (SPEC §14): master, music, effects and voice levels from the settings,
// decoded sounds cached by name, loops whose pitch and level follow the game, one-shots, and a
// couple of synthesised sounds. Starts on the first tap or key (browsers block autoplay) and goes
// quiet while the tab is hidden.
import { loadSettings } from '../core/settings';

export type Bus = 'music' | 'sfx' | 'voice';

export interface Loop { setRate(r: number): void; setGain(g: number): void; stop(): void; }

const SILENT_LOOP: Loop = { setRate() {}, setGain() {}, stop() {} };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses = {} as Record<Bus, GainNode>;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private pending: Array<() => void> = [];

  constructor() {
    const start = () => this.ensure();
    addEventListener('pointerdown', start, { once: false });
    addEventListener('keydown', start, { once: false });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume();
    });
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const b of ['music', 'sfx', 'voice'] as Bus[]) { this.buses[b] = this.ctx.createGain(); this.buses[b].connect(this.master); }
      this.applyVolumes();
      const waiting = this.pending;
      this.pending = [];
      waiting.forEach(fn => fn());
    }
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume();
    return this.ctx;
  }

  /** Re-reads the volume settings (call after the player changes them). */
  applyVolumes(): void {
    if (!this.ctx) return;
    const s = loadSettings();
    this.master.gain.value = s.volMaster;
    this.buses.music.gain.value = s.volMusic;
    this.buses.sfx.gain.value = s.volSfx;
    this.buses.voice.gain.value = s.volVoice;
  }

  private buffer(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      p = fetch(`${import.meta.env.BASE_URL}audio/${name}.m4a`)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then(data => this.ctx!.decodeAudioData(data))
        .catch(err => { console.warn(`audio ${name}`, err); return null; });
      this.buffers.set(name, p);
    }
    return p;
  }

  /** Decodes sounds ahead of time so the first play isn't late. */
  preload(names: string[]): void {
    const go = () => names.forEach(n => void this.buffer(n));
    if (this.ctx) go(); else this.pending.push(go);
  }

  /** A looping sound; silent until audio has started and the sound has loaded. */
  loop(name: string, bus: Bus = 'sfx', gain = 1, rate = 1): Loop {
    let src: AudioBufferSourceNode | null = null, g: GainNode | null = null, stopped = false;
    let wantGain = gain, wantRate = rate;
    const begin = async () => {
      const ctx = this.ctx!, buf = await this.buffer(name);
      if (!buf || stopped) return;
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = wantRate;
      g = ctx.createGain();
      g.gain.value = wantGain;
      src.connect(g).connect(this.buses[bus]);
      // Start at a random point so two loops of the same sound don't phase.
      src.start(0, Math.random() * buf.duration);
    };
    if (this.ctx) void begin(); else this.pending.push(() => void begin());
    return {
      setRate: r => { wantRate = r; if (src && this.ctx) src.playbackRate.setTargetAtTime(r, this.ctx.currentTime, 0.08); },
      setGain: v => { wantGain = v; if (g && this.ctx) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); },
      stop: () => { stopped = true; try { src?.stop(); } catch { /* not started */ } },
    };
  }

  /** A one-shot sound. */
  play(name: string, opts: { bus?: Bus; gain?: number; rate?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    void this.buffer(name).then(buf => {
      if (!buf) return;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      g.gain.value = opts.gain ?? 1;
      src.connect(g).connect(this.buses[opts.bus ?? 'sfx']);
      src.start();
    });
  }

  /**
   * A synthesised tone that can be switched on and off (the stall horn is a single reed tone, so
   * it isn't worth a recording) or pulsed (a CNG's electric horn: beep-beep).
   */
  tone(freq: number, type: OscillatorType = 'sawtooth', level = 0.25): { set(on: boolean): void } {
    let osc: OscillatorNode | null = null, g: GainNode | null = null;
    const build = () => {
      const ctx = this.ctx!;
      osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 3;
      g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(filter).connect(g).connect(this.buses.sfx);
      osc.start();
    };
    return {
      set: on => {
        if (!this.ctx) return;
        if (!osc) build();
        g!.gain.setTargetAtTime(on ? level : 0, this.ctx.currentTime, 0.03);
      },
    };
  }

  /** Two short electric-horn beeps, as a CNG or a car does in Dhaka traffic. */
  beep(freq = 520, count = 2, level = 0.18): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.value = freq;
    f.type = 'bandpass';
    f.frequency.value = freq * 1.5;
    g.gain.value = 0;
    osc.connect(f).connect(g).connect(this.buses.sfx);
    const t0 = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      g.gain.setValueAtTime(level, t0 + i * 0.22);
      g.gain.setValueAtTime(0, t0 + i * 0.22 + 0.14);
    }
    osc.start(t0);
    osc.stop(t0 + count * 0.22 + 0.05);
  }

  get running(): boolean { return this.ctx?.state === 'running'; }
  get silentLoop(): Loop { return SILENT_LOOP; }
}

export const audio = new AudioEngine();
