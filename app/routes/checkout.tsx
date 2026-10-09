import type { Route } from "./+types/checkout";
import { Link, useLoaderData } from "react-router";
import { useState } from "react";
import { formatPrice, type Pack } from "../data/products";
import {
  authClient,
  createOrder,
  fetchCatalog,
  presignScreenshot,
  settings,
  type OrderShape,
} from "../lib/api";
import { useStore } from "../lib/store";
import { CoverArt } from "../components/CoverArt";
import { OrderLine } from "../components/OrderLine";
import { Shell } from "../components/Shell";

export async function loader({ request }: Route.LoaderArgs) {
  // no error swallowing here: a backend outage must not read as an empty cart
  // or as "no bank instructions set". The route error boundary owns it.
  const [packs, s] = await Promise.all([fetchCatalog(), settings(request)]);
  return { packs, paymentInstructions: s.payment_instructions ?? null };
}

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Checkout — ACE Stores" }, { name: "robots", content: "noindex, nofollow" }];
}

type Step = "cart" | "details" | "done";

export default function Checkout() {
  const { packs, paymentInstructions } = useLoaderData<typeof loader>();
  const store = useStore();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [step, setStep] = useState<Step>("cart");
  const [order, setOrder] = useState<OrderShape | null>(null);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = store.cart
    .map((id) => packs.find((p) => p.id === id))
    .filter((p): p is Pack => Boolean(p));
  const total = items.reduce((sum, p) => sum + p.price, 0);
  const email = session?.user?.email ?? "";

  if (!store.hydrated || (step === "details" && sessionPending)) {
    return (
      <Shell>
        <p className="label-caps py-16 text-center">reading session…</p>
      </Shell>
    );
  }

  // ——— done: order locked ————————————————————————————————
  if (step === "done" && order) {
    return (
      <Shell>
        <div className="panel-raised mx-auto max-w-2xl rounded-2xl p-8">
          <span className="label-caps inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 !text-ground">
            order placed
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-[-0.02em] text-ink">
            Receipt received.
          </h1>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-dim">
            Order <span className="tnum text-ink">{order.id}</span> is recorded against{" "}
            <span className="text-ink">{email}</span> and your receipt is with us. We check
            transfers by hand — the files unlock in{" "}
            <Link to="/library" className="text-accent underline underline-offset-4">
              your library
            </Link>{" "}
            once we confirm.
          </p>

          <ul className="mt-8">
            {order.items.map((it) => (
              <OrderLine
                key={it.id}
                item={it}
                order={order}
                pack={packs.find((p) => p.productId === it.productId)}
                email={email}
              />
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
          One price per pack. Everything here unlocks in your library the moment the order locks.
        </p>

        <ul className="mt-8">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="hidden w-14 overflow-hidden rounded-lg sm:block">
                  <CartThumb pack={p} />
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
                <span className="font-display text-xl font-bold price-display text-ink">{formatPrice(p.price)}</span>
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
            <span className="font-chrome text-sm font-bold tracking-[0.09em] text-dim uppercase">total</span>
            <span className="font-display text-3xl font-extrabold price-display text-ink">{formatPrice(total)}</span>
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
  if (!session?.user) {
    return (
      <Shell>
        <div className="panel mx-auto max-w-xl rounded-2xl px-6 py-16 text-center">
          <h1 className="font-display text-3xl font-extrabold text-ink">Sign in to check out.</h1>
          <p className="mx-auto mt-2 max-w-[48ch] text-[14px] text-dim">
            Orders, downloads, and your library live behind your account.
          </p>
          <Link to="/sign-in?next=/checkout" className="btn btn-accent mt-8">
            sign in
          </Link>
        </div>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!file) throw new Error("Attach the payment screenshot to place the order.");
      const ref = reference.trim() || undefined;
      const pre = await presignScreenshot(file.type);
      const put = await fetch(pre.uploadUrl, { method: "PUT", body: file });
      if (!put.ok) throw new Error("Screenshot upload failed — try again.");
      const placed = await createOrder({
        items: items.map((p) => ({ productId: Number(p.id) })),
        paymentReference: ref,
        screenshotKey: pre.key,
      });
      await store.refreshOrders();
      store.clearCart();
      setOrder(placed);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Confirm the order
        </h1>
        <p className="mt-2 max-w-[56ch] text-[14.5px] text-dim">
          {items.length} pack{items.length === 1 ? "" : "s"} ·{" "}
          <span className="tnum text-ink">{formatPrice(total)}</span> · files unlock in{" "}
          <Link to="/library" className="text-accent">
            your library
          </Link>{" "}
          once we confirm your transfer.
        </p>

        <form className="mt-8 space-y-6" onSubmit={(e) => void submit(e)}>
          <div className="panel rounded-2xl p-5">
            <div className="label-caps">account</div>
            <p className="mt-3 text-[14px] text-dim">
              Signed in as <span className="text-ink">{email}</span> — orders land on this account.
            </p>
          </div>

          <div className="panel rounded-2xl p-5">
            <div className="label-caps">payment</div>

            {!paymentInstructions ? (
              /* Honest dead end: we cannot take a payment we cannot explain.
                 Never demand proof of a transfer we never gave details for. */
              <div className="mt-3" role="status">
                <p className="text-[15px] leading-relaxed text-ink">
                  Checkout isn&apos;t open yet.
                </p>
                <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-dim">
                  We verify bank transfers by hand, and we haven&apos;t published the account
                  details yet. We won&apos;t take your money until that&apos;s live — your cart is
                  saved.
                </p>
                <Link to="/catalog" className="btn btn-ghost mt-5">
                  keep browsing
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-3 border-l-2 border-accent/60 pl-3 text-[13px] leading-relaxed text-dim">
                  {paymentInstructions}
                </p>
                <p className="mt-4 border-t border-hairline pt-4 text-[13px] text-ink">
                  Transfer <span className="tnum font-bold">{formatPrice(total)}</span> using the
                  details above, then attach your receipt below.
                </p>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[13px] text-dim">
                    Bank transfer reference (optional)
                  </span>
                  <input
                    className="field"
                    placeholder="e.g. your transfer ID"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[13px] text-dim">Payment screenshot</span>
                  <input
                    type="file"
                    required
                    accept="image/png,image/jpeg,image/webp"
                    className="field file:mr-3 file:rounded-md file:border-0 file:bg-accent/15 file:px-3 file:py-2.5 file:font-chrome file:text-[12px] file:font-bold file:tracking-wide file:text-accent"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="label-caps mt-2 block">
                    attach the transfer receipt — it&apos;s your proof of payment
                  </span>
                </label>
                <p className="mt-4 border-t border-hairline pt-3 text-[13px] leading-relaxed text-dim">
                  We check transfers by hand. Your files unlock once we confirm — usually the same
                  working day. Your cart stays intact until then.
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {paymentInstructions && (
              <button type="submit" className="btn btn-accent" disabled={busy}>
                {busy ? "locking…" : `place order — ${formatPrice(total)}`}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setStep("cart")} disabled={busy}>
              back to cart
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}

function CartThumb({ pack }: { pack: Pack }) {
  return <CoverArt pack={pack} showTitle={false} className="block aspect-square w-full" />;
}
