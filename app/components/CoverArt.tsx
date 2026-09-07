import type { Pack } from "../data/products";

/**
 * Authored cover art, generated per pack — synthetic placeholders for real
 * label artwork (disclosed in the footer). Deterministic duotone
 * compositions in the pack's cover hue: cut-frame motifs for video packs,
 * waveform motifs for audio packs.
 */

const HUES = [
  { hi: "#8b5cf6", lo: "#31156b" }, // violet
  { hi: "#22d3ee", lo: "#0d4a58" }, // cyan
  { hi: "#fb923c", lo: "#6b2a10" }, // orange
  { hi: "#e879f9", lo: "#5b1e66" }, // magenta
  { hi: "#60a5fa", lo: "#1e3a6b" }, // blue
  { hi: "#a3e635", lo: "#3a530d" }, // lime
];

function hueFor(pack: Pack) {
  const idx = pack.id.charCodeAt(pack.id.length - 1) % HUES.length;
  return HUES[idx];
}

/** simple deterministic bar heights for audio covers */
function barsFor(pack: Pack, n: number): number[] {
  let a = pack.id.charCodeAt(0) * 31 + pack.id.length * 97;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    a = (a * 1103515245 + 12345) % 2147483648;
    out.push(0.18 + ((a >>> 8) % 1000) / 1000 * 0.82);
  }
  return out;
}

export function CoverArt({
  pack,
  className = "",
  showTitle = true,
}: {
  pack: Pack;
  className?: string;
  showTitle?: boolean;
}) {
  const hue = hueFor(pack);
  const isVideo = pack.family === "video";
  const gid = `g-${pack.id}`;

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label={`${pack.name} cover art (placeholder)`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hue.hi} />
          <stop offset="100%" stopColor={hue.lo} />
        </linearGradient>
      </defs>

      <rect width="400" height="400" fill={`url(#${gid})`} />

      {isVideo ? (
        <>
          {/* cut-frame motif: two offset frames with a whip seam */}
          <g opacity="0.32">
            <rect x="36" y="120" width="150" height="150" fill="#0b0c10" />
            <rect x="214" y="130" width="150" height="150" fill="#0b0c10" />
          </g>
          <g opacity="0.9">
            <rect x="52" y="104" width="150" height="150" fill="#0b0c10" opacity="0.55" />
            <rect x="198" y="146" width="150" height="150" fill="#ffffff" opacity="0.14" />
          </g>
          <rect x="188" y="60" width="5" height="280" fill="#0b0c10" opacity="0.6" transform="rotate(8 200 200)" />
          {pack.signal.kind === "transition" &&
            pack.signal.cuts.map((c, i) => (
              <rect key={i} x={60 + i * 56} y="330" width="26" height="5" fill="#ffffff" opacity="0.5" />
            ))}
        </>
      ) : (
        <>
          {/* waveform motif: bar field */}
          <g fill="#0b0c10" opacity="0.62">
            {barsFor(pack, 16).map((v, i) => (
              <rect key={i} x={40 + i * 21} y={340 - v * 230} width="12" height={v * 230} rx="6" />
            ))}
          </g>
          <g fill="#ffffff" opacity="0.85">
            {barsFor(pack, 9).map((v, i) => (
              <rect key={i} x={76 + i * 30} y={330 - v * 190} width="16" height={v * 190} rx="8" />
            ))}
          </g>
        </>
      )}

      {showTitle && (
        <>
          <text
            x="32"
            y="72"
            fill="#ffffff"
            fontFamily="Inter Tight, Inter, sans-serif"
            fontWeight="800"
            fontSize="34"
            letterSpacing="-0.5"
          >
            {pack.name.length > 14 ? `${pack.name.slice(0, 13)}.` : pack.name}
          </text>
          <text
            x="32"
            y="96"
            fill="#ffffff"
            opacity="0.75"
            fontFamily="Inter Tight, Inter, sans-serif"
            fontWeight="600"
            fontSize="13"
            letterSpacing="2.4"
          >
            {pack.family === "video" ? "TRANSITIONS" : "SOUND PACK"}
          </text>
          <rect x="32" y="352" width="44" height="4" fill="#ffffff" opacity="0.55" />
        </>
      )}
    </svg>
  );
}
