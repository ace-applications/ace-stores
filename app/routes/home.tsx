import type { Route } from "./+types/home";
import { Link, useLoaderData } from "react-router";
import { formatPrice, type Pack } from "../data/products";
import { fetchCatalog, API_BASE } from "../lib/api";
import { organizationJsonLd } from "../root";
import { abs, pageMeta } from "../lib/seo";
import logoMain from "../../assets/Logo/ACE Stores Logo/Ace Stores main.png";
import { PackCard } from "../components/PackCard";
import { CoverArt } from "../components/CoverArt";
import { useStore } from "../lib/store";

export async function loader() {
  try {
    return { packs: await fetchCatalog(), error: false };
  } catch {
    return { packs: [], error: true };
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    ...pageMeta({
      title: "ACE Stores — video transition packs & audio assets",
      description:
        "Video transition packs and audio assets for editors and producers, made and sold by ACE. One price per pack, instant self-serve download to your library.",
      image: abs(logoMain),
    }),
    { "script:ld+json": organizationJsonLd() },
  ];
}

const TENETS = [
  {
    label: "First-party, always",
    text: "Every pack is produced by ACE — the same hands that use it. Nothing licensed in, nothing resold.",
  },
  {
    label: "Know what you're buying",
    text: "Every pack lists its exact files, formats and total size before you pay. No account needed to look.",
  },
  {
    label: "Download again, any time",
    text: "One price per pack. Once we confirm your transfer the files unlock in your library — and stay there, on any machine.",
  },
];

export default function Home() {
  const { packs, error } = useLoaderData<typeof loader>();
  const store = useStore();
  const { addToCart } = store;
  const featured = packs[0];
  const inCart = featured ? store.cart.includes(featured.id) : false;
  const owned = featured ? store.hydrated && store.inLibrary(featured.productId) : false;
  const videoTile = packs.find((p) => p.family === "video");
  const audioTile = packs.find((p) => p.family === "audio");
  const videoCount = packs.filter((p) => p.family === "video").length;
  const audioCount = packs.filter((p) => p.family === "audio").length;
  const tiles = [
    videoTile && { pack: videoTile, title: "Video transitions", count: videoCount, to: "/catalog?family=video" },
    audioTile && { pack: audioTile, title: "Audio assets", count: audioCount, to: "/catalog?family=audio" },
  ].filter((t): t is { pack: Pack; title: string; count: number; to: string } => Boolean(t));

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
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-dim">
            Video transition packs and audio assets for creators — produced in house, sold at one
            price, and downloadable the moment we confirm your transfer.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/catalog" className="btn btn-primary">
              shop the catalog
            </Link>
          </div>
        </div>

        {/* featured pack */}
        {featured && (
        <div id="featured" className="panel-raised rise-in rounded-2xl p-5" style={{ animationDelay: "120ms" }}>
          <div className="label-caps">featured pack</div>
          <div className="mt-3 overflow-hidden rounded-xl">
            <CoverArt pack={featured} className="block aspect-square w-full" />
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink">
              {featured.name}
            </h2>
            <span className="font-display text-2xl font-bold price-display text-ink">
              {formatPrice(featured.price)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-dim">{featured.blurb}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {inCart ? (
              <Link to="/checkout" className="btn btn-accent">
                in cart → checkout
              </Link>
            ) : owned ? (
              <Link to="/library" className="btn btn-accent">
                in your library →
              </Link>
            ) : (
              <button type="button" className="btn btn-accent" onClick={() => addToCart(featured.id)}>
                add to cart
              </button>
            )}
            <Link to={`/pack/${featured.slug}`} className="btn btn-ghost">
              view pack
            </Link>
          </div>
        </div>
        )}
      </section>

      {/* ——— category tiles ———————————————————————————————— */}
      <section className="pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {tiles.map((tile) => (
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
                <div className="label-caps !text-dim">
                  {tile.count} {tile.count === 1 ? "pack" : "packs"} · one license
                </div>
                <div className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
                  {tile.title}
                </div>
                <span className="mt-2 inline-block font-chrome text-[12.5px] font-bold tracking-[0.08em] text-accent uppercase">
                  discover →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ——— the catalog —————————————————————————————————— */}
      <section className="mt-16 pb-16">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
            The catalog
          </h2>
          <span className="label-caps tnum">{packs.length} packs · one price each</span>
        </div>
        {packs.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packs.map((p, i) => (
              <PackCard key={p.id} pack={p} delay={Math.min(i, 7) * 50} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-[14px] text-dim">
            {error
              ? `Could not reach the store API at ${API_BASE} — is the backend running?`
              : "No packs live yet — inventory lands here first."}
          </p>
        )}
      </section>

      {/* ——— made by the maker ————————————————————————————— */}
      <section className="mt-16 pb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Made by the maker
        </h2>
        <dl className="mt-8">
          {TENETS.map((t) => (
            <div
              key={t.label}
              className="grid gap-2 border-t border-hairline py-6 sm:grid-cols-[240px_1fr] sm:gap-8"
            >
              <dt className="font-chrome text-[13px] font-bold tracking-[0.09em] text-accent uppercase">
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
