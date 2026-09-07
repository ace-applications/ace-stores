/**
 * Signal engine — the store renders every product by its own signal.
 *
 * Waveform strips and spectral fields are computed deterministically from
 * each pack's pattern, so they render identically on the server (SVG/first
 * paint) and the client. Playback synthesizes the same pattern with Web
 * Audio; video packs render procedural transition demos on canvas.
 */

import type { AudioPattern, SignalPattern, TransitionPattern } from "../data/products";

/* ——— seeded PRNG (mulberry32) ————————————————————— */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ——— waveform strip: one amplitude per bucket, 0..1 ————— */

const VOICE_WEIGHT = { kick: 1, snare: 0.8, hat: 0.3, bass: 0.6, lead: 0.42 } as const;

function audioEnergyAt(pat: AudioPattern, step: number): number {
  const w = VOICE_WEIGHT;
  return Math.min(
    1,
    pat.kick[step] * w.kick +
      pat.snare[step] * w.snare +
      pat.hat[step] * w.hat +
      pat.bass[step] * w.bass +
      pat.lead[step] * w.lead,
  );
}

function transitionEnergyAt(pat: TransitionPattern, t: number): number {
  // cut spikes over a calm carrier
  let e = 0.22;
  for (const cut of pat.cuts) {
    const d = Math.abs(t - cut.at);
    if (d < 0.05) e = Math.max(e, 1 - d / 0.05);
  }
  return e;
}

export function computeWaveform(pattern: SignalPattern, buckets = 192): number[] {
  const out: number[] = [];
  for (let b = 0; b < buckets; b++) {
    const t = b / buckets;
    let e: number;
    if (pattern.kind === "audio") {
      const steps = pattern.kick.length; // 16 or 32
      // one bucket spans a fraction of a step; sample with fractional offset
      const s = t * steps;
      const s0 = Math.floor(s) % steps;
      const s1 = (s0 + 1) % steps;
      const f = s - Math.floor(s);
      const base =
        audioEnergyAt(pattern, s0) * (1 - f) + audioEnergyAt(pattern, s1) * f;
      e = base;
    } else {
      e = transitionEnergyAt(pattern, t);
    }
    // deterministic jitter so the strip reads organic, not geometric
    const jitter = 0.82 + 0.36 * rng(pattern.seed * 7919 + b * 131)();
    out.push(Math.min(1, Math.max(0.04, e * jitter)));
  }
  // soften: neighbor average keeps the trace readable at strip sizes
  const smooth = out.map(
    (v, i) => (out[(i + out.length - 1) % out.length] + 2 * v + out[(i + 1) % out.length]) / 4,
  );
  return smooth;
}

/* ——— spectral field: rows (top = high freq) x cols, 0..1 ——— */

export function computeSpectral(pattern: SignalPattern, cols = 96, rows = 44): number[][] {
  const field: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let c = 0; c < cols; c++) {
    const t = c / cols;
    const rand = rng(pattern.seed * 31337 + c * 977);
    if (pattern.kind === "audio") {
      const steps = pattern.kick.length;
      const s0 = Math.floor(t * steps) % steps;
      // voices own frequency bands: kick/bass low, lead/snare mid, hats high
      const bands: [number, number, number][] = [
        // [centerRow(from bottom), spread, energy]
        [4, 5, audioEnergyAt(pattern, s0) * (pattern.kick[s0] * 0.9 + pattern.bass[s0])],
        [rows * 0.5, 7, (pattern.lead[s0] + pattern.snare[s0]) * 0.8],
        [rows - 4, 6, pattern.hat[s0] * 0.75],
      ];
      for (const [center, spread, energy] of bands) {
        if (energy <= 0) continue;
        for (let r = 0; r < rows; r++) {
          const d = Math.abs(r - center) / spread;
          if (d > 1) continue;
          field[r][c] = Math.min(1, field[r][c] + energy * (1 - d * d) * (0.7 + 0.5 * rand()));
        }
      }
      // faint noise floor across the field
      for (let r = 0; r < rows; r++) field[r][c] += 0.03 * rand();
    } else {
      // video: quiet field, spectral burst at each cut; leaks bleed upward
      for (const cut of pattern.cuts) {
        const d = Math.abs(t - cut.at);
        const burst = Math.max(0, 1 - d / 0.06);
        if (burst <= 0) continue;
        const center = cut.kind === "leak" || cut.kind === "burn" ? rows * 0.68 : rows * 0.42;
        for (let r = 0; r < rows; r++) {
          const dr = Math.abs(r - center) / (rows * 0.34);
          if (dr > 1) continue;
          field[r][c] = Math.min(1, field[r][c] + burst * (1 - dr * dr) * (0.75 + 0.45 * rand()));
        }
      }
      for (let r = 0; r < rows; r++) field[r][c] += 0.02 * rand();
    }
  }
  return field;
}

/** map spectral energy to a frequency→color: violet (low) → cyan (mid) → red (high) */
export function spectralColor(v: number, rowFromTop: number, rows: number): string {
  const band = 1 - rowFromTop / (rows - 1); // 1 = top = high frequency
  if (v < 0.06) return "rgba(233,229,218,0.05)";
  const a = Math.min(1, 0.25 + v * 0.95);
  if (band > 0.66) return `rgba(255,46,99,${a})`; // high: red
  if (band > 0.33) return `rgba(34,211,238,${a})`; // mid: cyan
  return `rgba(139,92,246,${a})`; // low: violet
}

/* ——— audio synthesis: pattern → AudioBuffer (client) ————— */

export function patternDuration(pat: AudioPattern): number {
  const barSec = (60 / pat.bpm) * 4;
  return barSec * 2; // two bars
}

function onePoleLP(data: Float32Array, cutoff01: number) {
  let y = 0;
  const a = Math.min(0.9, cutoff01);
  for (let i = 0; i < data.length; i++) y += a * (data[i] - y), (data[i] = y);
}

export function synthesizePattern(pat: AudioPattern): Float32Array {
  const sr = 44100;
  const dur = patternDuration(pat);
  const n = Math.floor(sr * dur);
  const out = new Float32Array(n);
  const steps = pat.kick.length;
  const stepSec = dur / steps;
  const root = pat.style === "trap" ? 43.65 : pat.style === "ambient" ? 73.42 : 55; // F1-ish
  const add = (
    start: number,
    len: number,
    gen: (t: number, phase: number) => number,
    gain: number,
  ) => {
    const s0 = Math.floor(start * sr);
    const lenN = Math.floor(len * sr);
    for (let i = 0; i < lenN; i++) {
      const idx = s0 + i;
      if (idx >= n) break;
      const t = i / sr;
      const env = Math.exp(-t * (3.4 / Math.max(0.05, len)));
      out[idx] += gen(t, i) * env * gain;
    }
  };

  for (let s = 0; s < steps; s++) {
    const at = s * stepSec;
    if (pat.kick[s] > 0) {
      const g = pat.kick[s];
      add(
        at,
        0.3,
        (t) => {
          const f = 160 * Math.exp(-t * 26) + 46;
          return Math.sin(2 * Math.PI * f * t) * 1.1;
        },
        0.85 * g,
      );
    }
    if (pat.snare[s] > 0) {
      const g = pat.snare[s];
      add(at, 0.16, (_t, i) => (Math.random() * 2 - 1) * 0.9 + Math.sin(2 * Math.PI * 185 * (i / sr)) * 0.4, 0.3 * g);
    }
    if (pat.hat[s] > 0) {
      const g = pat.hat[s];
      add(at, 0.045, () => (Math.random() * 2 - 1) * 0.8, 0.16 * g);
    }
    if (pat.bass[s] > 0) {
      const g = pat.bass[s];
      add(at, stepSec * 1.6, (t) => Math.tanh(Math.sin(2 * Math.PI * root * t) * 1.6) * 0.9, 0.5 * g);
    }
    if (pat.lead[s] > 0) {
      const g = pat.lead[s];
      const f = root * 4 * (s % 3 === 0 ? 1.19 : 1);
      add(at, 0.4, (t) => Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2.01 * t) * 0.2, 0.2 * g);
    }
  }

  // style pass: tape hiss + one-pole lowpass per family voice
  if (pat.style === "lofi" || pat.style === "breaks") {
    const noise = rng(pat.seed * 61);
    for (let i = 0; i < n; i++) out[i] += (noise() * 2 - 1) * 0.012;
    onePoleLP(out, 0.38);
  } else if (pat.style === "ambient") {
    // soften attacks into swells: moving-average over ~60ms
    const w = Math.floor(sr * 0.06);
    const acc = new Float32Array(n);
    let run = 0;
    for (let i = 0; i < n; i++) {
      run += out[i] - (i >= w ? out[i - w] : 0);
      acc[i] = run / w;
    }
    for (let i = 0; i < n; i++) out[i] = acc[i] * 1.5;
  } else if (pat.style === "trap") {
    onePoleLP(out, 0.55);
  }

  // master: soft clip + normalize toward 0.9
  let peak = 0.0001;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const norm = 0.9 / peak;
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * norm * 1.1) * 0.92;
  return out;
}

/* ——— playback engine (client only) ————————————————— */

export class SignalEngine {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private src: AudioBufferSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  private startedAt = 0;
  private offset = 0;
  playing = false;
  onState: (() => void) | null = null;

  get duration(): number {
    return this.buffer ? this.buffer.duration : 0;
  }

  get position(): number {
    if (!this.ctx) return this.offset;
    return this.playing
      ? Math.min(this.duration, this.offset + (this.ctx.currentTime - this.startedAt))
      : this.offset;
  }

  async load(pat: AudioPattern): Promise<void> {
    if (this.buffer && this.playing) this.stop();
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx ??= new AC();
    const data = synthesizePattern(pat);
    const buf = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
    // pattern synthesized at 44.1k; resample linearly if ctx differs
    const ratio = 44100 / this.ctx.sampleRate;
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const x = i * ratio;
      const i0 = Math.floor(x);
      const f = x - i0;
      const a = data[Math.min(data.length - 1, i0)];
      const b = data[Math.min(data.length - 1, i0 + 1)];
      ch[i] = a + (b - a) * f;
    }
    this.buffer = buf;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.offset = 0;
    this.playing = false;
    this.onState?.();
  }

  play(from?: number) {
    if (!this.ctx || !this.buffer) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.stopSource();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.analyser!);
    this.analyser!.connect(this.ctx.destination);
    this.offset = from ?? (this.offset >= this.duration ? 0 : this.offset);
    src.start(0, this.offset);
    src.onended = () => {
      if (this.src === src) {
        this.playing = false;
        this.offset = 0;
        this.onState?.();
      }
    };
    this.src = src;
    this.startedAt = this.ctx.currentTime;
    this.playing = true;
    this.onState?.();
  }

  private stopSource() {
    if (this.src) {
      this.src.onended = null;
      try {
        this.src.stop();
      } catch {
        /* already stopped */
      }
      this.src.disconnect();
      this.src = null;
    }
  }

  stop() {
    this.offset = this.position % this.duration;
    this.stopSource();
    this.playing = false;
    this.onState?.();
  }

  toggle() {
    if (this.playing) this.stop();
    else this.play();
  }

  dispose() {
    this.stopSource();
    void this.ctx?.close();
    this.ctx = null;
    this.buffer = null;
  }
}

/* ——— video transition demos (canvas, client) ————————— */

interface Scene {
  sky: [string, string];
  sun: string;
  ridges: string[];
}

function sceneFor(pat: TransitionPattern, index: number): Scene {
  const r = rng(pat.seed * 104729 + index * 3571);
  const skies: [string, string][] = [
    ["#0e2a33", "#134e4a"],
    ["#1b1f3b", "#312e5f"],
    ["#2a1e2e", "#513a52"],
    ["#0d1f26", "#1f3d4d"],
  ];
  const sky = skies[Math.floor(r() * skies.length)];
  const sun = ["#22d3ee", "#67e8f9", "#a5f3fc", "#e8a54b"][Math.floor(r() * 4)];
  const ridges = ["#0b151c", "#0f1d26", "#132531"];
  return { sky, sun, ridges };
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, sc: Scene, drift: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sc.sky[0]);
  g.addColorStop(1, sc.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // sun
  ctx.fillStyle = sc.sun;
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.36 + drift * 4, Math.min(w, h) * 0.11, 0, Math.PI * 2);
  ctx.fill();
  // ridges, back to front
  for (let i = 0; i < sc.ridges.length; i++) {
    const base = h * (0.55 + i * 0.15);
    ctx.fillStyle = sc.ridges[i];
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 24) {
      const y =
        base -
        Math.sin(x / (w / 5) + i * 2.3 + drift * 2) * h * 0.045 -
        Math.sin(x / (w / 13) + i) * h * 0.02;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

/** draw one frame of the pack's transition demo; t01 in 0..1 */
export function drawTransitionFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pat: TransitionPattern,
  t01: number,
) {
  const cuts = pat.cuts;
  // current scene index = number of cuts passed
  let idx = 0;
  for (const c of cuts) if (t01 >= c.at) idx++;
  const scA = sceneFor(pat, Math.max(0, idx - 1));
  const scB = sceneFor(pat, idx);
  const drift = Math.sin(t01 * Math.PI * 6);

  // find an active cut window (±3% of timeline)
  let active: { kind: string; t: number } | null = null;
  for (const c of cuts) {
    const t = (t01 - c.at) / 0.06 + 0.5;
    if (t >= 0 && t <= 1) active = { kind: c.kind, t };
  }

  if (!active) {
    drawScene(ctx, w, h, idx === 0 ? scB : scB, drift);
    return;
  }

  const { kind, t } = active;
  if (kind === "whip") {
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const off = e * w * 1.15;
    for (const [dx, alpha] of [
      [-18, 0.25],
      [0, 1],
      [18, 0.25],
    ] as const) {
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(-off + dx, 0);
      drawScene(ctx, w, h, scA, drift);
      ctx.restore();
      ctx.save();
      ctx.translate(w - off + dx, 0);
      drawScene(ctx, w, h, scB, drift);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  } else if (kind === "push") {
    const e = 1 - Math.pow(1 - t, 3);
    ctx.save();
    drawScene(ctx, w, h, scA, drift);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);
    const s = 1.6 - 0.6 * e;
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -h / 2);
    drawScene(ctx, w, h, scB, drift);
    ctx.restore();
    ctx.globalAlpha = 1;
  } else if (kind === "glitch") {
    if (t < 0.5) drawScene(ctx, w, h, scA, drift);
    else drawScene(ctx, w, h, scB, drift);
    // slice offsets
    const r = rng(pat.seed + Math.floor(t01 * 600));
    const slices = 9;
    for (let i = 0; i < slices; i++) {
      const sy = (i / slices) * h;
      const sh = h / slices;
      const dx = (r() - 0.5) * w * 0.18 * Math.sin(t * Math.PI);
      ctx.drawImage(ctx.canvas, 0, sy, w, sh, dx, sy, w, sh);
    }
    // RGB split
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.35 * Math.sin(t * Math.PI);
    ctx.drawImage(ctx.canvas, 4, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  } else if (kind === "burn") {
    drawScene(ctx, w, h, scA, drift);
    // sceneB revealed through a growing ragged circle
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d")!;
    drawScene(octx, w, h, scB, drift);
    octx.globalCompositeOperation = "destination-in";
    const rad = t * Math.max(w, h) * 0.75;
    const grad = octx.createRadialGradient(w / 2, h / 2, rad * 0.7, w / 2, h / 2, rad);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    octx.fillStyle = grad;
    octx.fillRect(0, 0, w, h);
    ctx.drawImage(off, 0, 0);
    // burning rim
    ctx.strokeStyle = `rgba(255,122,26,${0.8 * Math.sin(t * Math.PI)})`;
    ctx.lineWidth = Math.max(2, h * 0.012);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, rad * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // leak: warm wash sweeps across the cut
    drawScene(ctx, w, h, t < 0.5 ? scA : scB, drift);
    const g = ctx.createLinearGradient((t - 0.5) * w * 2, 0, (t + 0.2) * w, 0);
    g.addColorStop(0, "rgba(255,140,40,0)");
    g.addColorStop(0.5, `rgba(255,170,60,${0.55 * Math.sin(t * Math.PI)})`);
    g.addColorStop(1, "rgba(255,200,90,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
