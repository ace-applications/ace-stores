import { useRef, useState } from "react";
import { Link } from "react-router";
import { FAMILY_LABEL, formatPrice, type Pack } from "../data/products";
import { useStore } from "../lib/store";
import { CoverArt } from "./CoverArt";

/** The canon product card: cover-art-led, one price, one action.
 *  Honest-playback rule (DESIGN.md): when pack.preview exists, shows a
 *  play pill badge on the cover and plays a muted inline video loop on
 *  hover/focus. Products without previews show static cover art only. */
export function PackCard({ pack, delay = 0 }: { pack: Pack; delay?: number }) {
  const { addToCart, cart, inLibrary, hydrated } = useStore();
  const inCart = cart.includes(pack.id);
  const owned = hydrated && inLibrary(pack.productId);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPlayback = () => {
    if (!pack.preview) return;
    setPlaying(true);
    videoRef.current?.play().catch(() => {
      // autoplay rejection on low power/unsupported is expected; leave preview overlay
    });
  };

  const stopPlayback = () => {
    if (!pack.preview) return;
    setPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <article
      className="panel card-lift rise-in overflow-hidden rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={startPlayback}
      onMouseLeave={stopPlayback}
    >
      <Link
        to={`/pack/${pack.slug}`}
        className="relative block overflow-hidden"
        aria-label={`View ${pack.name}`}
        onFocus={startPlayback}
        onBlur={stopPlayback}
      >
        <CoverArt pack={pack} className="block aspect-square w-full" />

        {pack.preview && (
          <video
            ref={videoRef}
            src={pack.preview}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              playing ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
        )}

        {owned && (
          <span className="label-caps absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 !text-ground">
            in library
          </span>
        )}

        {pack.preview && (
          <span
            className="label-caps absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-ground/85 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.08em] text-ink backdrop-blur-sm border border-hairline"
            aria-hidden="true"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                playing ? "bg-accent animate-pulse" : "bg-ink/70"
              }`}
            />
            {playing ? "playing" : "preview"}
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
