import type { Route } from "./+types/pack.$slug";
import { Link, useLoaderData } from "react-router";
import { FAMILY_LABEL, formatPrice, type Pack } from "../data/products";
import { fetchCatalog, settings } from "../lib/api";
import { abs, clamp, pageMeta } from "../lib/seo";
import logoMain from "../../assets/Logo/ACE Stores Logo/Ace Stores main.png";
import { CoverArt } from "../components/CoverArt";
import { useStore } from "../lib/store";

interface ProductRouteData {
  pack?: Pack;
  purchasable?: boolean;
}

export async function loader({ params }: Route.LoaderArgs) {
  const packs = await fetchCatalog();
  const pack = packs.find((p) => p.slug === params.slug);
  if (!pack) throw new Response("Pack not found", { status: 404 });
  // Whether the store can actually take a payment decides if we may claim
  // InStock — see the JSON-LD below. PRODUCT.md forbids fabricated claims.
  const { payment_instructions } = await settings().catch(() => ({}) as { payment_instructions?: string });
  return { pack, purchasable: Boolean(payment_instructions?.trim()) };
}

export function meta({ matches }: Route.MetaArgs) {
  const match = matches.find((m) => m?.id === "routes/pack.$slug");
  const data = match && "loaderData" in match ? (match.loaderData as ProductRouteData) : undefined;
  const pack = data?.pack;
  const title = pack
    ? `${pack.name} — ${pack.family === "audio" ? "audio pack" : "transition pack"} | ACE Stores`
    : "ACE Stores";
  // Lead with what it is and what it costs; the blurb alone is often thin.
  const description = pack
    ? clamp(
        `${pack.name}: ${pack.blurb} ${pack.formats.join(", ")} · ${pack.size}. One price, ${formatPrice(pack.price)}.`,
        160,
      )
    : "Video transition packs and audio assets made by ACE.";
  const image = abs(pack?.imageUrl ?? logoMain);

  const metas: Route.MetaDescriptors = pageMeta({
    title,
    description,
    image,
    type: "product",
  });

  if (pack) {
    const url = abs(`/pack/${pack.slug}`);
    metas.push({
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            name: pack.name,
            description: pack.blurb,
            sku: String(pack.productId),
            category: FAMILY_LABEL[pack.family],
            brand: { "@type": "Brand", name: "ACE" },
            image: [abs(pack.imageUrl ?? logoMain)],
            offers: {
              "@type": "Offer",
              price: pack.price,
              priceCurrency: "EGP",
              url,
              // Only claim availability when checkout can actually be completed.
              ...(data?.purchasable ? { availability: "https://schema.org/InStock" } : {}),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
              { "@type": "ListItem", position: 2, name: "Catalog", item: abs("/catalog") },
              { "@type": "ListItem", position: 3, name: pack.name, item: url },
            ],
          },
        ],
      },
    });
  }

  return metas;
}

export default function PackDetail() {
  const { pack } = useLoaderData<typeof loader>();
  const { addToCart, cart, inLibrary, hydrated } = useStore();
  const inCart = cart.includes(pack.id);
  const owned = hydrated && inLibrary(pack.productId);

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
        {/* ——— cover + the placeholder strip ——————————————— */}
        <section>
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl lg:max-w-none">
            <CoverArt pack={pack} className="block aspect-square w-full" />
          </div>

          <div className="panel mt-6 rounded-2xl p-5">
            <div className="label-caps">what&apos;s inside</div>
            {pack.contents.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {pack.contents.map((c) => (
                  <li key={c.note} className="flex items-baseline gap-3 text-[14px] text-dim">
                    <span className="label-caps w-14 shrink-0 text-ink">{c.label}</span>
                    <span className="min-w-0 break-words text-ink">{c.note}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-dim">
                No preview media yet — this pack ships as a download only.
              </p>
            )}
            <p className="mt-4 border-t border-hairline pt-3 text-[13px] text-dim">
              <span className="label-caps !text-accent">demo in production</span> — no audio or
              video preview is published for this pack yet. The file list above is the full manifest.
            </p>
          </div>

          <p className="mt-6 max-w-[68ch] text-[15px] leading-relaxed text-dim">{pack.blurb}</p>
        </section>

        {/* ——— the spec panel ————————————————————————————— */}
        <aside className="panel-raised rounded-2xl p-6 lg:sticky lg:top-28">
          <div className="label-caps">spec</div>
          <dl className="mt-4">
            {[
              ["format", pack.formats.join(", ") || "—"],
              ["size", pack.size],
              ["files", String(pack.contents.length)],
              ["license", "standard royalty-free"],
              ["delivery", "unlocks when we confirm your transfer"],
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
              <span className="font-display text-4xl font-extrabold price-display text-ink">
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
              downloads unlock when we confirm your transfer
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
