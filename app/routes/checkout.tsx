import type { Route } from "./+types/checkout";
import { Link } from "react-router";
import { useState } from "react";
import { PACKS, formatPrice, type Pack } from "../data/products";
import { useStore, type Order } from "../lib/store";
import { downloadReceipt } from "../lib/receipt";
import { CoverArt } from "../components/CoverArt";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Checkout — ACE Stores" }];
}

type Step = "cart" | "details" | "done";

export default function Checkout() {
  const store = useStore();
  const [step, setStep] = useState<Step>("cart");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = store.cart
    .map((id) => PACKS.find((p) => p.id === id))
    .filter((p): p is Pack => Boolean(p));
  const total = items.reduce((sum, p) => sum + p.price, 0);

  if (!store.hydrated) {
    return (
      <Shell>
        <p className="label-caps py-16 text-center">reading session…</p>
      </Shell>
    );
  }

  // ——— done: order locked ————————————————————————————————
  if (step === "done" && order) {
    const ordered = order.items
      .map((id) => PACKS.find((p) => p.id === id))
      .filter((p): p is Pack => Boolean(p));
    return (
      <Shell>
        <div className="panel-raised mx-auto max-w-2xl rounded-2xl p-8">
          <span className="label-caps inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 !text-ground">
            order locked
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-[-0.02em] text-ink">
            It's on your shelf.
          </h1>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-dim">
            Order <span className="tnum text-ink">{order.id}</span> is confirmed for{" "}
            <span className="text-ink">{order.email}</span>. Your packs are in the library now —
            download here or any time from your shelf.
          </p>

          <ul className="mt-8">
            {ordered.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4"
              >
                <div>
                  <Link
                    to={`/pack/${p.slug}`}
                    className="font-display text-lg font-bold text-ink hover:text-accent"
                  >
                    {p.name}
                  </Link>
                  <div className="label-caps mt-0.5">
                    {p.formats.join(" · ")} · {p.size}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost px-4! py-2!" onClick={() => downloadReceipt(p, order)}>
                  download manifest
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/library" className="btn btn-primary">
              open the library
            </Link>
            <Link to="/catalog" className="btn btn-ghost">
              keep browsing
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ——— cart ————————————————————————————————————————————
  if (step === "cart") {
    if (items.length === 0) {
      return (
        <Shell>
          <div className="panel mx-auto max-w-2xl rounded-2xl px-6 py-16 text-center">
            <svg viewBox="0 0 48 48" className="mx-auto w-12" aria-hidden>
              <rect x="8" y="14" width="32" height="26" rx="4" fill="none" stroke="#3a3f4a" strokeWidth="2" />
              <path d="M8 22h32M20 14v-4h8v4" fill="none" stroke="#3a3f4a" strokeWidth="2" />
              <circle cx="24" cy="30" r="3" fill="#8b5cf6" />
            </svg>
            <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Your cart is empty.</h1>
            <p className="mx-auto mt-2 max-w-[44ch] text-[14px] text-dim">
              Nothing loaded yet — the catalog is one click away.
            </p>
            <Link to="/catalog" className="btn btn-primary mt-8">
              shop the catalog
            </Link>
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Your cart
        </h1>
        <p className="mt-2 max-w-[56ch] text-[14.5px] text-dim">
          One price per pack. Everything here downloads the moment the order locks.
        </p>

        <ul className="mt-8">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="hidden w-14 overflow-hidden rounded-lg sm:block">
                  <CartThumb id={p.id} />
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/pack/${p.slug}`}
                    className="font-display text-lg font-bold text-ink hover:text-accent"
                  >
                    {p.name}
                  </Link>
                  <div className="label-caps mt-0.5 truncate">
                    {p.formats.join(" · ")} · {p.size}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display text-xl font-bold tnum text-ink">{formatPrice(p.price)}</span>
                <button
                  type="button"
                  className="label-caps inline-flex items-center gap-1.5 hover:!text-danger"
                  onClick={() => store.removeFromCart(p.id)}
                  aria-label={`Remove ${p.name} from cart`}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                    <circle cx="6" cy="6" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3.8 3.8l4.4 4.4M8.2 3.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  remove
                </button>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between border-t-2 border-hairline pt-4 pb-2">
            <span className="font-display text-sm font-bold tracking-[0.09em] text-dim uppercase">total</span>
            <span className="font-display text-3xl font-extrabold tnum text-ink">{formatPrice(total)}</span>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-accent" onClick={() => setStep("details")}>
            continue to details
          </button>
          <Link to="/catalog" className="btn btn-ghost">
            keep browsing
          </Link>
        </div>
      </Shell>
    );
  }

  // ——— details: account + payment ————————————————————————
  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Lock the order
        </h1>
        <p className="mt-2 max-w-[56ch] text-[14.5px] text-dim">
          {items.length} pack{items.length === 1 ? "" : "s"} ·{" "}
          <span className="tnum text-ink">{formatPrice(total)}</span> · instant delivery to{" "}
          <Link to="/library" className="text-accent">
            your library
          </Link>
          .
        </p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = email.trim();
            if (!clean || !clean.includes("@")) {
              setError("Enter the email your library should live under.");
              return;
            }
            setError(null);
            const placed = store.placeOrder(clean);
            setOrder(placed);
            setStep("done");
          }}
        >
          <div className="panel rounded-2xl p-5">
            <div className="label-caps">account</div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[13px] text-dim">Email — this becomes your library</span>
              <input
                type="email"
                required
                className="field"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <p className="mt-2 text-[12px] text-faint">
              No password yet — the account backend is wired at launch. This session keeps your shelf
              on this machine.
            </p>
          </div>

          <div className="panel rounded-2xl p-5">
            <div className="label-caps">payment</div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-dim">
              Card, wallet, and regional methods arrive with the payment provider — the step is
              built and waiting. This demo checkout charges nothing and says so.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["card", "paypal", "ideal", "klarna"].map((m) => (
                <span key={m} className="chip opacity-60">
                  {m} — pending
                </span>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-accent">
              place order — {formatPrice(total)}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep("cart")}>
              back to cart
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}

function CartThumb({ id }: { id: string }) {
  const pack = PACKS.find((p) => p.id === id);
  if (!pack) return null;
  return <CoverArt pack={pack} showTitle={false} className="block aspect-square w-full" />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">{children}</div>;
}
