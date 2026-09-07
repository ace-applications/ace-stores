import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { packHue, type Pack } from "../data/products";
import { computeWaveform, SignalEngine, drawTransitionFrame } from "../lib/signal";

/* ——— playback hook shared by hero + strips ————————————— */

export function useSignalPlayer(pack: Pack) {
  const engineRef = useRef<SignalEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const ensureLoaded = useCallback(async () => {
    if (pack.family !== "audio" || !pack.hasDemo) return;
    engineRef.current ??= new SignalEngine();
    const engine = engineRef.current;
    engine.onState = () => setPlaying(engine.playing);
    if (!ready) {
      await engine.load(pack.signal as Extract<Pack["signal"], { kind: "audio" }>);
      setReady(true);
    }
  }, [pack, ready]);

  const toggle = useCallback(async () => {
    await ensureLoaded();
    engineRef.current?.toggle();
  }, [ensureLoaded]);

  const stop = useCallback(() => {
    if (engineRef.current?.playing) engineRef.current.stop();
  }, []);

  const seek = useCallback(
    async (fraction: number) => {
      await ensureLoaded();
      engineRef.current?.play(Math.max(0, Math.min(0.999, fraction)) * engineRef.current.duration);
    },
    [ensureLoaded],
  );

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [pack.id]);

  return { engine: engineRef, playing, ready, toggle, stop, seek };
}

/* ——— waveform SVG (deterministic, SSR-safe) ————————————— */

function WaveformSvg({ pack, buckets }: { pack: Pack; buckets: number }) {
  const wave = useMemo(() => computeWaveform(pack.signal, buckets), [pack.signal, buckets]);
  const hue = packHue(pack);
  return (
    <svg
      viewBox={`0 0 ${buckets} 100`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {wave.map((v, i) => {
        const h = Math.max(2, v * 92);
        return (
          <rect
            key={i}
            x={i + 0.15}
            y={50 - h / 2}
            width={0.7}
            height={h}
            fill={hue}
            fillOpacity={0.5 + 0.5 * v}
          />
        );
      })}
    </svg>
  );
}

/* ——— the strip ————————————————————————————————————— */

export function SignalStrip({
  pack,
  height = 64,
  buckets = 160,
  label = true,
  control = false,
}: {
  pack: Pack;
  height?: number;
  buckets?: number;
  label?: boolean;
  control?: boolean;
}) {
  const { engine, playing, toggle, seek } = useSignalPlayer(pack);
  const playheadRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastSeek = useRef(0);

  // playhead follows the engine without re-rendering
  useEffect(() => {
    if (pack.family !== "audio" || !pack.hasDemo) return;
    let raf = 0;
    const tick = () => {
      const e = engine.current;
      if (e && e.duration > 0 && playheadRef.current) {
        const pct = (e.position / e.duration) * 100;
        playheadRef.current.style.left = `${pct}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, pack.family, pack.hasDemo]);

  // video: static cut field, scrubbed frames on pointer move
  const drawVideoFrame = useCallback(
    (t01: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = (canvas.width = canvas.offsetWidth * 2);
      const h = (canvas.height = canvas.offsetHeight * 2);
      drawTransitionFrame(ctx, w, h, pack.signal as Extract<Pack["signal"], { kind: "transition" }>, t01);
    },
    [pack.signal],
  );

  useEffect(() => {
    if (pack.family === "video" && pack.hasDemo) drawVideoFrame(0.02);
  }, [drawVideoFrame, pack.family, pack.hasDemo]);

  const fracFromEvent = (e: ReactPointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!pack.hasDemo) return;
    if (pack.family === "audio") {
      void seek(fracFromEvent(e));
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
      drawVideoFrame(fracFromEvent(e));
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pack.hasDemo) return;
    if (!(e.buttons & 1) || !wrapRef.current?.hasPointerCapture(e.pointerId)) return;
    const frac = fracFromEvent(e);
    const now = performance.now();
    if (pack.family === "audio") {
      if (now - lastSeek.current > 60) {
        lastSeek.current = now;
        void seek(frac);
      }
    } else {
      drawVideoFrame(frac);
    }
  };

  return (
    <div className="relative w-full select-none" style={{ height }}>
      <div
        ref={wrapRef}
        className={`panel absolute inset-0 overflow-hidden ${pack.hasDemo ? "cursor-ew-resize" : ""}`}
        style={pack.hasDemo ? { touchAction: "none" } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
        aria-label={pack.hasDemo ? `Audition ${pack.name}` : `${pack.name} — no demo available`}
        role={pack.hasDemo ? "slider" : undefined}
      >
        {pack.family === "video" && pack.hasDemo ? (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-90" />
        ) : pack.hasDemo ? (
          <WaveformSvg pack={pack} buckets={buckets} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="label-caps">no demo — cover only</span>
          </div>
        )}

        {pack.hasDemo && control && (
          <button
            type="button"
            onClick={() => void toggle()}
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] uppercase backdrop-blur-sm ${
              playing ? "bg-accent text-ground" : "bg-ground/80 text-ink"
            }`}
            aria-label={playing ? `Stop ${pack.name} demo` : `Play ${pack.name} demo`}
          >
            {playing ? (
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                <rect x="1" y="1" width="8" height="8" fill="currentColor" />
              </svg>
            ) : (
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                <path d="M2 1l7 4-7 4z" fill="currentColor" />
              </svg>
            )}
            {playing ? "stop" : "play"}
          </button>
        )}

        {pack.hasDemo && (
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-px bg-accent"
            style={{ left: "0%", transition: "none" }}
          />
        )}

        {/* edge ticks carry the strip's own label-capsscreen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-hairline" />
      </div>

      {label && pack.hasDemo && (
        <button
          type="button"
          onClick={() => void toggle()}
          className={`label-caps absolute -top-6 right-0 inline-flex items-center gap-1.5 text-[10px]! ${playing ? "text-accent!" : ""}`}
          aria-label={playing ? `Stop ${pack.name} demo` : `Play ${pack.name} demo`}
        >
          {playing ? (
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
              <rect x="1" y="1" width="8" height="8" fill="currentColor" />
            </svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 1l7 4-7 4z" fill="currentColor" />
            </svg>
          )}
          {playing ? "stop" : "play"}
        </button>
      )}
    </div>
  );
}
