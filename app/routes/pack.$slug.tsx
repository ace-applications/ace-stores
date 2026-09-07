import type { Route } from "./+types/pack.$slug";
import { Link, useLoaderData } from "react-router";
import { useMemo } from "react";
import { FAMILY_LABEL, formatPrice, packBySlug } from "../data/products";
import { computeWaveform } from "../lib/signal";
import { packHue } from "../data/products";
import { Callouts } from "../components/Callouts";
import { SignalStrip } from "../components/SignalStrip";
import { TransitionMonitor } from "../components/TransitionMonitor";
import { CoverArt } from "../components/CoverArt";
import { useStore } from "../lib/store";

export function loader({ params }: Route.LoaderArgs) {
  const pack = packBySlug(params.slug ?? "");
  if (!pack) throw new Response("Pack not found", { status: 404 });
  return { pack };
}

export function meta({ matches }: Route.MetaArgs) {
  const match = matches.find((m) => m?.id === "routes/pack.$slug");
  const pack =
    match && "loaderData" in match
      ? (match.loaderData as { pack?: ReturnType<typeof packBySlug> } | undefined)?.pack
      : undefined;
  return [
    { title: pack ? `${pack.name} — ACE Stores` : "ACE Stores" },
    { name: "description", content: pack?.blurb ?? "Production assets made by ACE." },
  ];
}

export default function PackDetail() {
  const { pack } = useLoaderData<typeof loader>();
  const { addToCart, cart, inLibrary, hydrated } = useStore();
  const inCart = cart.includes(pack.id);
  const owned = hydrated && inLibrary(pack.id);
  const audio = pack.signal.kind === "audio" ? pack.signal : null;
  const video = pack.signal.kind === "transition" ? pack.signal : null;
  const coverWave = useMemo(() => computeWaveform(pack.signal, 220), [pack]);
  const hue = packHue(pack);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Link to="/catalog" className="label-caps hover:!text-accent">
        ← catalog
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-0.02em] text-ink uppercase">
          {pack.name}
        </h1>
        <span className="label-caps">
          {FAMILY_LABEL[pack.family]} · {pack.sub}
        </span>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[7fr_5fr]">
        {/* ——— cover + the signal ——————————————————————————— */}
        <section>
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl lg:max-w-none">
            <CoverArt pack={pack} className="block aspect-square w-full" />
          </div>

          {audio && pack.hasDemo && (
            <div className="panel mt-6 rounded-2xl p-5">
              <div className="hidden md:block">
                <Callouts facts={pack.contents} />
              </div>
              <div className="mt-2 md:mt-0">
                <SignalStrip pack={pack} height={160} buckets={220} label={false} control />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
                <span className="label-caps">
                  drag the strip to audition — <span className="!text-accent">full demo</span>
                </span>
                <span className="label-caps tnum">
                  {audio.key} · {audio.bpm} bpm · {pack.size}
                </span>
              </div>
            </div>
          )}

          {video && pack.hasDemo && (
            <div className="mt-6">
              <TransitionMonitor pack={pack} />
              <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
                <span className="label-caps">
                  cuts on the reel:{" "}
                  <span className="!text-accent tnum">{String(video.cuts.length).padStart(2, "0")}</span>
                </span>
                <span className="label-caps">
                  kinds:{" "}
                  <span className="!text-accent">{[...new Set(video.cuts.map((c) => c.kind))].join(" / ")}</span>
                </span>
                <span className="label-caps tnum">{pack.size}</span>
              </div>
            </div>
          )}

          {!pack.hasDemo && (
            <div className="panel mt-6 rounded-2xl p-5">
              <svg viewBox="0 0 220 100" preserveAspectRatio="none" className="h-40 w-full" aria-hidden>
                {coverWave.map((v, i) => (
                  <rect
                    key={i}
                    x={i + 0.15}
                    y={50 - Math.max(2, v * 92) / 2}
                    width={0.7}
                    height={Math.max(2, v * 92)}
                    fill={hue}
                    fillOpacity={0.4 + 0.5 * v}
                  />
                ))}
              </svg>
              <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                <span className="label-caps">demo in production</span>
                <span className="label-caps !text-accent">contents listed below</span>
              </div>
            </div>
          )}

          <ul className="mt-6 space-y-2 md:sr-only">
            {pack.contents.map((c) => (
              <li key={c.label} className="text-[14px] text-dim">
                <span className="font-display font-bold tracking-wide text-ink uppercase">{c.label}</span>
                <span className="mx-2 text-faint">—</span>
                {c.note}
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-[68ch] text-[15.5px] leading-relaxed text-dim">{pack.blurb}</p>
        </section>

        {/* ——— the spec panel ————————————————————————————— */}
        <aside className="panel-raised rounded-2xl p-6 lg:sticky lg:top-28">
          <div className="label-caps">spec</div>
          <dl className="mt-4">
            {[
              ["format", pack.formats.join(", ")],
              ["size", pack.size],
              ["license", "standard royalty-free"],
              ["delivery", "instant — your library after checkout"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[92px_1fr] gap-3 border-t border-hairline py-3 first:border-t-0"
              >
                <dt className="label-caps pt-0.5">{k}</dt>
                <dd className="text-[13.5px] leading-snug text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 border-t border-hairline pt-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-extrabold tnum text-ink">
                {formatPrice(pack.price)}
              </span>
              <span className="label-caps">one-time</span>
            </div>

            {owned ? (
              <Link to="/library" className="btn btn-accent mt-4 w-full">
                in your library → open
              </Link>
            ) : inCart ? (
              <Link to="/checkout" className="btn btn-accent mt-4 w-full">
                in cart → checkout
              </Link>
            ) : (
              <button type="button" className="btn btn-accent mt-4 w-full" onClick={() => addToCart(pack.id)}>
                add to cart
              </button>
            )}

            <p className="mt-4 flex items-center gap-2 text-[12.5px] text-dim">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              download the moment checkout locks
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
