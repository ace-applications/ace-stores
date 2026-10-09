import type { Route } from "./+types/admin";
import { useState } from "react";
import { useLoaderData, useRevalidator, useSearchParams, Link } from "react-router";
import { formatDate, formatPrice } from "../data/products";
import { adminApproveOrder, adminOrders, adminRejectOrder, adminRevokeOrder } from "../lib/admin-api";

export async function loader({ request }: Route.LoaderArgs) {
  const status = new URL(request.url).searchParams.get("status") ?? "pending_payment";
  try {
    return { orders: await adminOrders(status, request), status, error: false };
  } catch {
    return { orders: [], status, error: true };
  }
}

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Admin — Orders" }, { name: "robots", content: "noindex, nofollow" }];
}

const STATUSES = ["all", "pending_payment", "paid", "rejected", "expired", "revoked"] as const;

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default function Admin() {
  const { orders, status, error } = useLoaderData<typeof loader>();
  const [search, setSearch] = useSearchParams();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const current = status;

  function setStatus(s: string) {
    if (s === "pending_payment") search.delete("status");
    else search.set("status", s);
    setSearch(search, { replace: true });
  }

  /** every mutation: run, then refresh the loader's data in place */
  async function run(id: number, fn: () => Promise<unknown>) {
    setBusy(id);
    setActionError(null);
    try {
      await fn();
      revalidator.revalidate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  }

  const approve = (id: number) => run(id, () => adminApproveOrder(id));

  const reject = (id: number) =>
    confirm("Reject this order?") ? run(id, () => adminRejectOrder(id)) : Promise.resolve();

  const revoke = (id: number) =>
    confirm("Revoke this order? This kills downloads for the buyer.")
      ? run(id, () => adminRevokeOrder(id))
      : Promise.resolve();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Orders desk
        </h1>
        <Link to="/admin/products" className="btn btn-ghost">
          Products
        </Link>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} type="button" className="chip" data-on={current === s} onClick={() => setStatus(s)}>
            {statusLabel(s)}
          </button>
        ))}
      </nav>

      {error && <p className="mt-6 text-danger">Failed to load orders</p>}
      {actionError && (
        <p className="mt-6 text-[13px] text-danger" role="alert">
          {actionError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <div className="panel rounded-2xl p-6 text-dim">No orders</div>
        ) : (
          orders.map((o) => (
            <article key={o.id} className="panel rounded-2xl p-5 sm:p-6">
              <header className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="label-caps">Order #{o.id}</div>
                  <div className="mt-1 text-[13.5px] text-dim">
                    {formatDate(o.createdAt)} · {o.user.email}
                  </div>
                  {o.user.name && <div className="text-[13.5px] text-dim">{o.user.name}</div>}
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold price-display text-ink">{formatPrice(o.totalPrice)}</div>
                  <div className="label-caps mt-1">{o.status}</div>
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
                    alt="Payment screenshot"
                    className="mt-4 max-w-full rounded-lg border border-hairline"
                    loading="lazy"
                  />
                </details>
              )}

              <footer className="mt-6 flex flex-wrap gap-2">
                {o.status === "pending_payment" && (
                  <>
                    <button className="btn btn-primary" disabled={busy === o.id} onClick={() => void approve(o.id)}>
                      Approve
                    </button>
                    <button className="btn btn-ghost" disabled={busy === o.id} onClick={() => void reject(o.id)}>
                      Reject
                    </button>
                  </>
                )}
                {o.status === "paid" && (
                  <button className="btn btn-ghost" disabled={busy === o.id} onClick={() => void revoke(o.id)}>
                    Revoke (kills downloads)
                  </button>
                )}
              </footer>
            </article>
          ))
        )}
      </div>
    </>
  );
}