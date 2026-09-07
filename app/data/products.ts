/**
 * ACE Stores demo catalog.
 *
 * SYNTHETIC DATA — every product, price, and signal pattern here is a
 * placeholder authored to demonstrate the store. Replace with real
 * inventory before launch. (Flagged to visitors in the footer as
 * "Demo catalog".)
 */

export type Family = "video" | "audio";

export type TransitionKind = "whip" | "glitch" | "burn" | "push" | "leak";

export interface ContentFact {
  /** short label shown at the callout anchor */
  label: string;
  /** the fact the leader line lands on */
  note: string;
  /** x position on the signal, 0..1 */
  at: number;
}

export interface TransitionPattern {
  kind: "transition";
  seed: number;
  /** normalized cut positions on the demo timeline */
  cuts: { at: number; kind: TransitionKind }[];
}

export interface AudioPattern {
  kind: "audio";
  seed: number;
  bpm: number;
  key: string;
  style: string;
  /** 16-step gate patterns, 0..1 velocities; two bars = 32 steps */
  kick: number[];
  snare: number[];
  hat: number[];
  bass: number[];
  lead: number[];
}

export type SignalPattern = TransitionPattern | AudioPattern;

export interface Pack {
  id: string;
  slug: string;
  name: string;
  family: Family;
  sub: string;
  blurb: string;
  formats: string[];
  contents: ContentFact[];
  size: string;
  price: number;
  hasDemo: boolean;
  signal: SignalPattern;
}

export const PACKS: Pack[] = [
  // ——— video transitions ———————————————————————————————
  {
    id: "v1",
    slug: "whip-cut",
    name: "Whip Cut",
    family: "video",
    sub: "Transitions",
    blurb:
      "Twenty-four whip-pan transitions with direction-matched pairs, motion-blur baked at export so the cut survives a timeline scrub.",
    formats: ["Premiere Pro", "After Effects", "DaVinci Resolve", "Final Cut"],
    contents: [
      { label: "24", note: "24 transitions, 4K UHD ProRes 4444 + alpha", at: 0.08 },
      { label: "PAIRS", note: "12 direction-matched in/out pairs", at: 0.52 },
      { label: "blur", note: "Motion blur baked at 540° shutter", at: 0.86 },
    ],
    size: "3.2 GB",
    price: 29,
    hasDemo: true,
    signal: {
      kind: "transition",
      seed: 11,
      cuts: [
        { at: 0.09, kind: "whip" },
        { at: 0.24, kind: "push" },
        { at: 0.41, kind: "whip" },
        { at: 0.58, kind: "whip" },
        { at: 0.79, kind: "push" },
      ],
    },
  },
  {
    id: "v2",
    slug: "glitch-cut",
    name: "Glitch Cut",
    family: "video",
    sub: "Transitions",
    blurb:
      "Eighteen datamosh and slice transitions tuned for beat-cutting — every cut lands on a 1/8 grid so they drop straight onto drums.",
    formats: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
    contents: [
      { label: "18", note: "18 glitch transitions, 4K UHD ProRes 4444", at: 0.1 },
      { label: "1/8", note: "Cuts gridded to 1/8 for beat sync", at: 0.55 },
      { label: "rgb", note: "RGB-split and slice variants included", at: 0.85 },
    ],
    size: "2.7 GB",
    price: 27,
    hasDemo: true,
    signal: {
      kind: "transition",
      seed: 23,
      cuts: [
        { at: 0.06, kind: "glitch" },
        { at: 0.18, kind: "glitch" },
        { at: 0.33, kind: "glitch" },
        { at: 0.47, kind: "whip" },
        { at: 0.62, kind: "glitch" },
        { at: 0.83, kind: "glitch" },
      ],
    },
  },
  {
    id: "v3",
    slug: "push-and-pull",
    name: "Push & Pull",
    family: "video",
    sub: "Transitions",
    blurb:
      "Twenty camera-move transitions — push-ins, pull-outs, and roll moves — rendered with optical blur and optional 35mm grain.",
    formats: ["Premiere Pro", "After Effects", "Final Cut"],
    contents: [
      { label: "20", note: "20 camera-move transitions, 4K UHD", at: 0.07 },
      { label: "35mm", note: "Optional 35mm grain pass, 4K overlay", at: 0.62 },
      { label: "LUTs", note: "12 print LUTs to finish the move", at: 0.9 },
    ],
    size: "4.1 GB",
    price: 31,
    hasDemo: true,
    signal: {
      kind: "transition",
      seed: 37,
      cuts: [
        { at: 0.12, kind: "push" },
        { at: 0.29, kind: "push" },
        { at: 0.51, kind: "push" },
        { at: 0.72, kind: "push" },
        { at: 0.91, kind: "push" },
      ],
    },
  },
  {
    id: "v4",
    slug: "film-burns",
    name: "Film Burns",
    family: "video",
    sub: "Overlays",
    blurb:
      "Sixteen scanned film-burn transitions from real 16mm leader — organic burn fronts, no stock-looking symmetrics.",
    formats: ["Premiere Pro", "After Effects", "DaVinci Resolve", "Final Cut"],
    contents: [
      { label: "16", note: "16 scanned 16mm burn transitions", at: 0.14 },
      { label: "alpha", note: "Matte passes for every burn front", at: 0.68 },
    ],
    size: "2.2 GB",
    price: 24,
    hasDemo: false,
    signal: {
      kind: "transition",
      seed: 41,
      cuts: [
        { at: 0.16, kind: "burn" },
        { at: 0.44, kind: "burn" },
        { at: 0.77, kind: "burn" },
      ],
    },
  },
  {
    id: "v5",
    slug: "light-leaks",
    name: "Light Leaks Vol. 1",
    family: "video",
    sub: "Overlays",
    blurb:
      "Fourteen analog light-leak overlays shot on vintage glass — screen them over cuts for warm, hand-exposed seams.",
    formats: ["Premiere Pro", "Final Cut", "DaVinci Resolve"],
    contents: [
      { label: "14", note: "14 light-leak overlays, 4K UHD", at: 0.11 },
      { label: "warm", note: "Three temperature grades: warm, neutral, cool", at: 0.58 },
    ],
    size: "1.9 GB",
    price: 22,
    hasDemo: true,
    signal: {
      kind: "transition",
      seed: 53,
      cuts: [
        { at: 0.1, kind: "leak" },
        { at: 0.36, kind: "leak" },
        { at: 0.64, kind: "leak" },
        { at: 0.88, kind: "leak" },
      ],
    },
  },

  // ——— audio ———————————————————————————————————————————
  {
    id: "a1",
    slug: "night-frequencies",
    name: "Night Frequencies",
    family: "audio",
    sub: "Lo-fi",
    blurb:
      "One hundred twenty-eight lo-fi loops — dusty drums, tape keys, and upright bass — all tempo-keyed at 82 BPM and cut for the MPC style grid.",
    formats: ["WAV", "MIDI"],
    contents: [
      { label: "82bpm", note: "128 loops locked at 82 BPM, A-minor keyed", at: 0.12 },
      { label: "tape", note: "Tape-saturated drums: 48 kick, 40 snare, 40 hat loops", at: 0.46 },
      { label: "keys", note: "24 tape-piano and 16 upright-bass loops", at: 0.84 },
    ],
    size: "860 MB",
    price: 34,
    hasDemo: true,
    signal: {
      kind: "audio",
      seed: 7,
      bpm: 82,
      key: "A min",
      style: "lofi",
      kick: [1, 0, 0, 0, 0, 0, 0.7, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.6, 1, 0, 0, 0],
      hat: [0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.4, 0.9, 0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.5, 0.9],
      bass: [0.8, 0, 0, 0.5, 0, 0, 0.6, 0, 0.7, 0, 0, 0.4, 0, 0, 0.5, 0],
      lead: [0, 0, 0.6, 0, 0.5, 0, 0, 0.7, 0, 0.5, 0, 0, 0.6, 0, 0, 0.5],
    },
  },
  {
    id: "a2",
    slug: "808-vault",
    name: "808 Vault",
    family: "audio",
    sub: "Trap",
    blurb:
      "Ninety-six 808 bass one-shots and glides recorded through tube preamps — long-decay cores that stay tuned under pitch bends.",
    formats: ["WAV", "Ableton Rack"],
    contents: [
      { label: "96", note: "96 tuned 808 one-shots, C1–B2 root map", at: 0.09 },
      { label: "glide", note: "32 pre-bounced glide phrases at 140 BPM", at: 0.49 },
      { label: "tube", note: "Tube-preamp saturation on every sample", at: 0.87 },
    ],
    size: "410 MB",
    price: 28,
    hasDemo: true,
    signal: {
      kind: "audio",
      seed: 13,
      bpm: 140,
      key: "F min",
      style: "trap",
      kick: [1, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 1, 0, 0, 0, 0.5, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.4],
      hat: [0.9, 0.4, 0.7, 0.4, 0.9, 0.4, 0.7, 0.4, 0.9, 0.4, 0.7, 0.4, 0.9, 0.4, 0.7, 0.6],
      bass: [1, 0, 0, 0.6, 0, 0.5, 0, 0, 0.9, 0, 0, 0.7, 0, 0, 0.6, 0],
      lead: [0, 0, 0.4, 0, 0, 0, 0.5, 0, 0, 0, 0.4, 0, 0, 0, 0, 0],
    },
  },
  {
    id: "a3",
    slug: "house-organs",
    name: "House Organs",
    family: "audio",
    sub: "House",
    blurb:
      "Seventy-two classic organ and electric-piano loops tracked for 124 BPM house — chords voiced to sit under a four-on-the-floor without fighting it.",
    formats: ["WAV", "MIDI"],
    contents: [
      { label: "124", note: "72 loops at 124 BPM, F-minor and C-minor sets", at: 0.1 },
      { label: "chords", note: "36 organ + 36 EP loops, 4- and 8-bar phrases", at: 0.5 },
      { label: "midi", note: "Full MIDI stems for every loop", at: 0.88 },
    ],
    size: "640 MB",
    price: 32,
    hasDemo: true,
    signal: {
      kind: "audio",
      seed: 17,
      bpm: 124,
      key: "F min",
      style: "house",
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0.3, 0, 0, 0, 0, 1, 0, 0, 0.3],
      hat: [0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0, 0.8],
      bass: [0.7, 0, 0.5, 0, 0, 0.6, 0, 0, 0.7, 0, 0.5, 0, 0, 0.6, 0, 0],
      lead: [0, 0, 0, 0.6, 0.5, 0, 0, 0.6, 0, 0, 0, 0.5, 0.6, 0, 0, 0],
    },
  },
  {
    id: "a4",
    slug: "trap-hats",
    name: "Trap Hats",
    family: "audio",
    sub: "Trap",
    blurb:
      "One hundred forty hat and cymbal one-shots plus rolling phrase loops — from tight closed ticks to long open silvers, velocity-mapped.",
    formats: ["WAV", "Ableton Rack", "Maschine Kit"],
    contents: [
      { label: "140", note: "140 hat/cymbal one-shots, round-robin ready", at: 0.08 },
      { label: "rolls", note: "48 roll phrases: 1/16 to 1/64, 140–160 BPM", at: 0.55 },
      { label: "kit", note: "Maschine + Ableton drum kits pre-mapped", at: 0.9 },
    ],
    size: "240 MB",
    price: 19,
    hasDemo: true,
    signal: {
      kind: "audio",
      seed: 19,
      bpm: 150,
      key: "—",
      style: "trap",
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.9, 0.7],
      bass: [0.6, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0],
      lead: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: "a5",
    slug: "ambient-textures",
    name: "Ambient Textures",
    family: "audio",
    sub: "Ambient",
    blurb:
      "Sixty-four evolving pads and granular beds for scoring — six-minute evolutions, not four-second loops, rendered at 24-bit.",
    formats: ["WAV", "Kontakt Instrument"],
    contents: [
      { label: "64", note: "64 texture beds, 4–6 min evolutions each", at: 0.15 },
      { label: "24bit", note: "24-bit / 48k masters, noise-floor printed", at: 0.6 },
      { label: "kt", note: "Kontakt instrument with XY morph control", at: 0.91 },
    ],
    size: "2.4 GB",
    price: 36,
    hasDemo: true,
    signal: {
      kind: "audio",
      seed: 29,
      bpm: 70,
      key: "D min",
      style: "ambient",
      kick: [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat: [0, 0, 0.2, 0, 0, 0, 0.2, 0, 0, 0, 0.2, 0, 0, 0, 0.2, 0],
      bass: [0.5, 0, 0, 0, 0.3, 0, 0, 0, 0.5, 0, 0, 0, 0.3, 0, 0, 0],
      lead: [0.7, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.7, 0, 0.4, 0, 0.6, 0, 0.4, 0],
    },
  },
  {
    id: "a6",
    slug: "cinematic-braams",
    name: "Cinematic Braams",
    family: "audio",
    sub: "Trailer",
    blurb:
      "Forty braams, risers, and downshifters cut for trailer edits — designed on modular hardware, mastered for theatrical loudness.",
    formats: ["WAV"],
    contents: [
      { label: "40", note: "40 hits: 14 braams, 14 risers, 12 downshifters", at: 0.13 },
      { label: "thx", note: "Theatrical master: −23 LKFS, true peak −1 dBTP", at: 0.66 },
    ],
    size: "1.1 GB",
    price: 26,
    hasDemo: false,
    signal: {
      kind: "audio",
      seed: 31,
      bpm: 90,
      key: "E min",
      style: "trailer",
      kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bass: [0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lead: [0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: "a7",
    slug: "vinyl-breaks",
    name: "Vinyl Breaks",
    family: "audio",
    sub: "Breaks",
    blurb:
      "Fifty-two drum breaks played live to tape, dust and all — chopped-ready, with every fill left in so the loop breathes like the take.",
    formats: ["WAV", "Ableton Rack"],
    contents: [
      { label: "52", note: "52 live drum breaks, 2–8 bars, 88–108 BPM", at: 0.1 },
      { label: "tape", note: "Recorded to 8-track tape, no cleanup pass", at: 0.48 },
      { label: "chops", note: "Ableton choke groups pre-set for chopping", at: 0.85 },
    ],
    size: "520 MB",
    price: 24,
    hasDemo: true,
    signal: {
      kind: "audio",
      seed: 43,
      bpm: 96,
      key: "—",
      style: "breaks",
      kick: [1, 0, 0, 0.5, 0, 0, 0.8, 0, 0, 0.6, 0, 0, 0.9, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0.4, 0, 0, 0, 0, 1, 0, 0.5, 0],
      hat: [0.5, 0.6, 0.7, 0.6, 0.5, 0.6, 0.7, 0.6, 0.5, 0.6, 0.7, 0.6, 0.5, 0.6, 0.7, 0.8],
      bass: [0.7, 0, 0, 0, 0.5, 0, 0, 0, 0.7, 0, 0, 0, 0.5, 0, 0, 0],
      lead: [0, 0, 0.3, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0],
    },
  },
];

export const DATA_NOTE =
  "Demo catalog — names, prices, audio, and previews are synthetic placeholders pending real inventory.";

export const CURRENCY = { symbol: "$", code: "USD" };

export function packBySlug(slug: string): Pack | undefined {
  return PACKS.find((p) => p.slug === slug);
}

export function formatPrice(price: number): string {
  return `${CURRENCY.symbol}${price.toFixed(2)}`;
}

/** hue anchor for a pack's demo waveform strip (cover-only products) */
export function packHue(pack: Pack): string {
  if (pack.family === "video") return "var(--color-accent-soft)";
  switch (pack.sub) {
    case "Lo-fi":
    case "Ambient":
      return "var(--color-accent)";
    case "Trailer":
      return "var(--color-danger)";
    default:
      return "var(--color-accent-soft)";
  }
}

export const FAMILY_LABEL: Record<Family, string> = {
  video: "Video transitions",
  audio: "Audio assets",
};
