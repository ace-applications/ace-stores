import type { ContentFact } from "../data/products";

/**
 * Leader-line annotations: pack contents documented on the signal itself.
 * Labels stagger on two rows above the waveform; hairlines drop to anchors.
 */
export function Callouts({ facts }: { facts: ContentFact[] }) {
  return (
    <div className="relative h-24 w-full" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {facts.map((f, i) => {
          const y1 = i % 2 === 0 ? 34 : 68;
          return (
            <g key={f.label}>
              <line x1={f.at * 100} y1={y1} x2={f.at * 100} y2={100} stroke="#3a4049" strokeWidth={0.35} />
              <circle cx={f.at * 100} cy={100} r={0.9} fill="#8b5cf6" />
            </g>
          );
        })}
      </svg>
      {facts.map((f, i) => (
        <div
          key={f.label}
          className="absolute -translate-x-1/2 text-center"
          style={{ left: `${f.at * 100}%`, top: i % 2 === 0 ? 0 : "2.1rem" }}
        >
          <div className="font-display text-[13px] font-bold tracking-[0.08em] text-ink uppercase">{f.label}</div>
          <div className="mx-auto mt-0.5 max-w-44 text-[11px] leading-snug text-faint">{f.note}</div>
        </div>
      ))}
    </div>
  );
}
