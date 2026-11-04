import type { Route } from "./+types/admin.orders._index";
import { useDeferredValue, useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { formatDate, formatPrice } from "../data/products";
import { adminApproveOrder, adminOrders, adminRejectOrder, adminRevokeOrder } from "../lib/admin-api";
import { friendlyError } from "../lib/errors";
import { useConfirm, useToast } from "../components/admin-ux";

/** clientLoader mutations are explicit revalidate() calls (no router-driven
 *  refetch of these arrays), so conditional shouldRevalidate is a no-op here —
 *  but the export keeps the desk's revalidation philosophy in one place:
 *  navigation-driven refetch is opt-in, mutation-driven refetch is manual. */
export function shouldRevalidate() {
  return false;
}

/** Fetches ALL orders once; status chips and search filter client-side — the
 *  full arrays are small and it keeps chip counts free. */
export async function clientLoader() {
  try {
    const orders = await adminOrders();
    return { orders, error: false } as const;
  } catch {
    return { orders: [], error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Orders" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton h-9 w-24" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {[112, 128, 76, 96, 88, 90].map((w, i) => (
          <div key={i} className="skeleton rounded-full" style={{ width: w, height: 32 }} aria-hidden />
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel rounded-2xl p-6">
            <div className="flex justify-between gap-4">
              <div className="space-y-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-44" />
              </div>
              <div className="skeleton h-6 w-24" />
            </div>
            <div className="skeleton mt-5 h-4 w-56" />
          </div>
        ))}
      </div>
    </>
  );
}

const STATUSES = ["all", "pending_payment", "paid", "rejected", "expired", "revoked"] as const;

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default function AdminOrdersIndex() {
  const { orders, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [current, setCurrent] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();

  function setStatus(s: string) {
    setCurrent(s);
  }

  /** every mutation: run, swipe the row optimistically, then refresh */
  async function run(id: number, target: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(id);
    setActionError(null);
    // INP budget (web.dev): the click is the interaction, not the round trip.
    // The row swipes to its target immediately; revalidation swaps the loader's
    // truth in within the same render so the flash never lands. The overlay is
    // per-order and converges exactly when the server value matches target.
    setOverlay((o) => ({ ...o, [id]: target }));
    try {
      await fn();
      if (done) show(done);
      revalidator.revalidate();
    } catch (e) {
      setActionError(friendlyError(e, "That didn't save. Try again."));
      setOverlay((o) => ({ ...o, [id]: undefined }));
    } finally {
      setBusy(null);
    }
  }

  /** per-order optimistic status overlay — the row swipes before the network
   *  answers (INP budget) and revalidation swaps the server value back. */
  const [overlay, setOverlay] = useState<Record<number, string | undefined>>({});
  const displayed = orders.map((o) =>
    overlay[o.id] && overlay[o.id] !== o.status ? { ...o, status: overlay[o.id]! } : o,
  );

  const approve = (id: number) => run(id, "paid", () => adminApproveOrder(id), "Approved");

  const reject = (id: number) =>
    ask({ title: `Reject order #${id}?`, confirmLabel: "Reject", danger: true, action: () => void run(id, "rejected", () => adminRejectOrder(id)) });

  const revoke = (id: number) =>
    ask({
      title: `Revoke order #${id}?`,
      body: "This kills downloads for the buyer.",
      confirmLabel: "Revoke",
      danger: true,
      action: () => void run(id, "revoked", () => adminRevokeOrder(id)),
    });

  const needle = useDeferredValue(search).trim().toLowerCase();
  // the needle trails the keystrokes by one interruptible render — typing never
  // waits on the filter pass over the full list (React's SWR-like pattern)
  const matching = displayed.filter((o) => {
    if (current !== "all" && o.status !== current) return false;
    if (!needle) return true;
    const haystack = `#${o.id} ${o.paymentReference ?? ""} ${o.user.email} ${o.user.name ?? ""}`;
    return haystack.toLowerCase().includes(needle);
  });
  const count = (s: string) => displayed.filter((o) => s === "all" || o.status === s).length;

  return (
    <>
      {dialog}
      {toast}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Orders</h1>
        <label className="field flex max-w-xs items-center gap-2 py-1.5">
          <span className="sr-only">Search orders</span>
          <input
            className="w-full bg-transparent text-ink outline-none"
            placeholder="Search email, #id, ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter orders by status">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className="chip tnum"
            data-on={current === s}
            aria-pressed={current === s}
            onClick={() => setStatus(s)}
          >
            {statusLabel(s)} ({count(s)})
          </button>
        ))}
      </nav>

      {error && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-danger">
          Failed to load orders
          <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>
            Retry
          </button>
        </p>
      )}
      {actionError && (
        <p className="mt-6 text-[13px] text-danger" role="alert">{actionError}</p>
      )}

      <div className="desk-orders mt-6 space-y-4" aria-busy={busy !== null}>
        {!error && matching.length === 0 ? (
          <div className="panel rounded-2xl p-6">
            <p className="text-dim">{needle ? "No orders match that search." : current === "all" ? "No orders yet." : `No ${statusLabel(current)} orders yet.`}</p>
            <p className="label-caps mt-2">
              {current === "pending_payment" && !needle ? "buyers reaching checkout appear here with their payment screenshot" : "try a different filter or search"}
            </p>
          </div>
        ) : (
          matching.map((o) => (
            <article key={o.id} className="panel card-lift rounded-2xl p-5 sm:p-6" style={{ contentVisibility: "auto" }} aria-busy={busy === o.id}>
              <header className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="label-caps">Order <Link className="text-ink underline decoration-hairline" to={`/admin/orders/${o.id}`}>#{o.id}</Link></div>
                  <div className="mt-1 text-[13.5px] text-dim">
                    {formatDate(o.createdAt)} · {o.user.email}
                  </div>
                  {o.user.name && <div className="text-[13.5px] text-dim">{o.user.name}</div>}
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold price-display text-ink">{formatPrice(o.totalPrice)}</div>
                  <div className="label-caps mt-1">{statusLabel(o.status)}</div>
                  {o.paymentReference && (
                    <div className="mt-1 text-[12.5px] text-dim tnum">Ref: {o.paymentReference}</div>
                  )}
                </div>
              </header>

              <div className="mt-5 space-y-2">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-baseline justify-between">
                    <div className="text-ink">{it.title}</div>
                    <div className="tnum text-dim">{formatPrice(it.price)}</div>
                  </div>
                ))}
              </div>

              {o.screenshotUrl && (
                <details className="mt-5">
                  <summary className="btn btn-ghost cursor-pointer">View payment screenshot</summary>
                  <img
                    src={o.screenshotUrl}
                    alt={`Payment screenshot — order #${o.id}`}
                    className="mt-4 max-w-full rounded-lg border border-hairline"
                    loading="lazy"
                  />
                </details>
              )}

              <footer className="mt-6 flex flex-wrap gap-2">
                <Link to={`/admin/orders/${o.id}`} className="btn btn-ghost">Details</Link>
                {o.status === "pending_payment" && (
                  <>
                    <button className="btn btn-primary" disabled={busy === o.id} data-busy={busy === o.id || undefined} onClick={() => void approve(o.id)}>Approve</button>
                    <button className="btn btn-ghost" disabled={busy === o.id} data-busy={busy === o.id || undefined} onClick={() => reject(o.id)}>Reject</button>
                  </>
                )}
                {o.status === "paid" && (
                  <button className="btn btn-ghost" disabled={busy === o.id} data-busy={busy === o.id || undefined} onClick={() => revoke(o.id)}>Revoke (kills downloads)</button>
                )}
              </footer>
            </article>
          ))
        )}
      </div>
    </>
  );
}
