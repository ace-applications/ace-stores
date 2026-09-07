import type { Route } from "./+types/home";
import { Link } from "react-router";
import { PACKS, formatPrice, packBySlug, type Pack } from "../data/products";
import { useSignalPlayer } from "../components/SignalStrip";
import { PackCard } from "../components/PackCard";
import { CoverArt } from "../components/CoverArt";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ACE Stores — production assets made by the maker" },
    {
      name: "description",
      content:
        "Video transition packs and audio assets for music production, made and sold by ACE. One price per pack, instant download.",
    },
  ];
}

const FEATURED_SLUG = "night-frequencies";
const VIDEO_TILE_SLUG = "whip-cut";
const AUDIO_TILE_SLUG = "house-organs";

const TENETS = [
  {
    label: "First-party, always",
    text: "Every pack is produced by ACE — the same hands that use it. Nothing licensed in, nothing resold.",
  },
  {
    label: "Audition before you buy",
    text: "Hover a cover and it plays. Open a pack and scrub the demo to the moment you need. No account, no gate.",
  },
  {
    label: "Checkout to timeline in minutes",
    text: "One price per pack. The moment your order locks, it's in your library — download again any time.",
  },
];

export default function Home() {
  const featured = packBySlug(FEATURED_SLUG) as Pack;
  const player = useSignalPlayer(featured);
  const videoTile = packBySlug(VIDEO_TILE_SLUG) as Pack;
  const audioTile = packBySlug(AUDIO_TILE_SLUG) as Pack;
  const videoCount = PACKS.filter((p) => p.family === "video").length;
  const audioCount = PACKS.filter((p) => p.family === "audio").length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ——— hero: the claim + the featured pack ————————————— */}
      <section className="grid items-center gap-10 pt-14 pb-16 lg:grid-cols-[7fr_5fr] lg:pt-20">
        <div className="rise-in">
          <h1 className="font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[0.98] font-extrabold tracking-[-0.03em] text-ink uppercase">
            Transitions.
            <br />
            Sounds.
            <br />
            <span className="text-accent">Made by ACE.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15.5px] leading-relaxed text-dim">
            Video transition packs and audio assets for creators — produced in house, sold at one
            price, and in your library minutes after checkout. Hover a cover to hear it before you
            buy.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/catalog" className="btn btn-primary">
              shop the catalog
            </Link>
            <a href="#featured" className="btn btn-ghost">
              hear the featured pack
            </a>
          </div>
        </div>

        {/* featured pack */}
        <div id="featured" className="panel-raised rise-in rounded-2xl p-5" style={{ animationDelay: "120ms" }}>
          <div className="label-caps">featured pack</div>
          <div className="mt-3 overflow-hidden rounded-xl">
            <CoverArt pack={featured} className="block aspect-square w-full" />
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink">
              {featured.name}
            </h2>
            <span className="font-display text-2xl font-bold tnum text-ink">
              {formatPrice(featured.price)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-dim">{featured.blurb}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button type="button" className="btn btn-accent" onClick={() => void player.toggle()}>
              {player.playing ? (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <rect x="1" y="1" width="8" height="8" fill="currentColor" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path d="M2 1l7 4-7 4z" fill="currentColor" />
                </svg>
              )}
              {player.playing ? "stop" : "play demo"}
            </button>
            <Link to={`/pack/${featured.slug}`} className="btn btn-ghost">
              view pack
            </Link>
          </div>
        </div>
      </section>

      {/* ——— category tiles ———————————————————————————————— */}
      <section className="pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { pack: videoTile, title: "Video transitions", count: videoCount, to: "/catalog?family=video" },
            { pack: audioTile, title: "Audio assets", count: audioCount, to: "/catalog?family=audio" },
          ].map((tile) => (
            <Link
              key={tile.title}
              to={tile.to}
              className="panel card-lift group relative block h-60 overflow-hidden rounded-2xl md:h-72"
            >
              <CoverArt
                pack={tile.pack}
                showTitle={false}
                className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ground via-ground/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="label-caps !text-dim">{tile.count} packs · one license</div>
                <div className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
                  {tile.title}
                </div>
                <span className="mt-2 inline-block font-display text-[12.5px] font-bold tracking-[0.08em] text-accent uppercase">
                  discover →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ——— the catalog —————————————————————————————————— */}
      <section className="pb-16">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
            The catalog
          </h2>
          <span className="label-caps tnum">{PACKS.length} packs · one price each</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PACKS.map((p, i) => (
            <PackCard key={p.id} pack={p} delay={Math.min(i, 7) * 50} />
          ))}
        </div>
      </section>

      {/* ——— made by the maker ————————————————————————————— */}
      <section className="pb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Made by the maker
        </h2>
        <dl className="mt-8">
          {TENETS.map((t) => (
            <div
              key={t.label}
              className="grid gap-2 border-t border-hairline py-6 sm:grid-cols-[240px_1fr] sm:gap-8"
            >
              <dt className="font-display text-[13px] font-bold tracking-[0.09em] text-accent uppercase">
                {t.label}
              </dt>
              <dd className="max-w-[68ch] text-[15px] leading-relaxed text-dim">{t.text}</dd>
            </div>
          ))}
          <div className="border-t border-hairline" />
        </dl>
      </section>
    </div>
  );
}
