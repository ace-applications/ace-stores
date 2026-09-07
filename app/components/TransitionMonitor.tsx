import { useEffect, useRef, useState } from "react";
import type { Pack, TransitionPattern } from "../data/products";
import { drawTransitionFrame } from "../lib/signal";

/**
 * Monitor for video-pack demos: the transition demo loops; hovering pauses
 * and scrubs — same grammar as the audio strips.
 */
export function TransitionMonitor({ pack }: { pack: Pack }) {
  const pat = pack.signal as TransitionPattern;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(0);
  const pausedRef = useRef(false);
  const offscreenRef = useRef(false);
  const [readout, setReadout] = useState({ kind: "—", tc: "00:00" });

  // pause the render loop entirely when the monitor leaves the viewport
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        offscreenRef.current = !entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const tc = (t: number) => {
      const s = Math.floor(t * 24);
      return `00:${String(s).padStart(2, "0")}:${String(Math.floor((t * 24 - s) * 24)).padStart(2, "0")}`;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !offscreenRef.current) {
        tRef.current = (tRef.current + dt / 12) % 1; // 12s loop
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = (canvas.width = Math.floor(wrap.offsetWidth * dpr));
        const h = (canvas.height = Math.floor(wrap.offsetHeight * dpr));
        drawTransitionFrame(ctx, w, h, pat, tRef.current);
        const near = pat.cuts.reduce(
          (best, c) => (Math.abs(c.at - tRef.current) < best.d ? { d: Math.abs(c.at - tRef.current), kind: c.kind } : best),
          { d: 1, kind: "—" },
        );
        setReadout({ kind: near.d < 0.05 ? near.kind : "scene", tc: tc(tRef.current) });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pat]);

  const scrub = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    tRef.current = Math.max(0, Math.min(0.999, (e.clientX - rect.left) / rect.width));
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    drawTransitionFrame(ctx, Math.floor(wrapRef.current!.offsetWidth * dpr), Math.floor(wrapRef.current!.offsetHeight * dpr), pat, tRef.current);
  };

  return (
    <div>
      <div
        ref={wrapRef}
        className="panel relative aspect-video w-full cursor-ew-resize overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerEnter={() => (pausedRef.current = true)}
        onPointerLeave={() => (pausedRef.current = false)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) scrub(e);
        }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
        aria-label={`Transition demo for ${pack.name}`}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div className="label-caps pointer-events-none absolute top-3 left-3">{pack.name} — demo reel</div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="label-caps">
          effect: <span className="!text-ink">{readout.kind}</span>
        </span>
        <span className="label-caps tnum">{readout.tc}</span>
      </div>
    </div>
  );
}
