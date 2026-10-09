import { Link } from "react-router";
import { FAMILY_LABEL, formatPrice, type Pack } from "../data/products";
import { useStore } from "../lib/store";
import { CoverArt } from "./CoverArt";

/** The canon product card: cover-art-led, one price, one action. */
export function PackCard({ pack, delay = 0 }: { pack: Pack; delay?: number }) {
  const { addToCart, cart, inLibrary, hydrated } = useStore();
  const inCart = cart.includes(pack.id);
  const owned = hydrated && inLibrary(pack.productId);

  return (
    <article
      className="panel card-lift rise-in overflow-hidden rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link to={`/pack/${pack.slug}`} className="relative block" aria-label={`View ${pack.name}`}>
        <CoverArt pack={pack} className="block aspect-square w-full" />
        {owned && (
          <span className="label-caps absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 !text-ground">
            in library
          </span>
        )}
      </Link>

      <div className="p-4">
        <div className="label-caps">
          {FAMILY_LABEL[pack.family]} · {pack.sub}
        </div>
        <Link
          to={`/pack/${pack.slug}`}
          className="mt-1.5 block font-display text-lg font-bold tracking-[-0.01em] text-ink hover:text-accent"
        >
          {pack.name}
        </Link>
        <div className="mt-1 text-[12px] text-faint">{pack.formats.join(" · ")}</div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="font-display text-xl font-bold price-display text-ink">{formatPrice(pack.price)}</span>
          {owned ? (
            <Link to="/library" className="text-[12px] font-bold tracking-wide text-accent uppercase">
              in library →
            </Link>
          ) : inCart ? (
            <Link to="/checkout" className="text-[12px] font-bold tracking-wide text-accent uppercase">
              in cart →
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-ghost px-3.5! py-2!"
              onClick={() => addToCart(pack.id)}
            >
              add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
