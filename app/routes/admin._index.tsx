import type { Route } from "./+types/admin._index";
import { useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { formatPrice } from "../data/products";
import { adminApproveOrder, adminOrders, adminProductsList, adminRejectOrder } from "../lib/admin-api";
import { friendlyError } from "../lib/errors";
import { useConfirm, useToast } from "../components/admin-ux";

/** Overview = the desk's two list endpoints read as-is; every stat is computed
 *  client-side, so the dashboard costs zero backend work. */
export async function clientLoader() {
  try {
    const [orders, products] = await Promise.all([adminOrders(), adminProductsList()]);
    return { orders, products, error: false } as const;
  } catch {
    return { orders: [], products: [], error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Admin — Overview" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="skeleton h-8 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel rounded-2xl p-5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-8 panel rounded-2xl p-6">
        <div className="skeleton h-5 w-40" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function AdminOverview() {
  const { orders, products, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();

  const pending = orders.filter((o) => o.status === "pending_payment");
  const paid = orders.filter((o) => o.status === "paid");
  const drafts = products.filter((p) => !p.published);

  /** every mutation: run, then refresh the loader's data in place */
  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      if (done) show(done);
      revalidator.revalidate();
    } catch (e) {
      setActionError(friendlyError(e, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const approve = (id: number) => run(() => adminApproveOrder(id), "Approved");

  return (
    <>
      {dialog}
      {toast}
      {error ? (
        <p className="flex flex-wrap items-center gap-3 text-danger">
          Failed to load admin data
          <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>
            Retry
          </button>
        </p>
      ) : (
        <>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Overview</h1>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="panel rounded-2xl p-5">
              <div className="label-caps">Awaiting payment check</div>
              <div className="tnum mt-2 font-display text-3xl font-bold text-ink" aria-live={pending.length > 0 ? "polite" : undefined}>
                {pending.length}
              </div>
            </div>
            <div className="panel rounded-2xl p-5">
              <div className="label-caps">Collected (paid)</div>
              <div className="tnum mt-2 font-display text-3xl font-bold text-ink">
                {formatPrice(paid.reduce((sum, o) => sum + o.totalPrice, 0))}
              </div>
            </div>
            <div className="panel rounded-2xl p-5">
              <div className="label-caps">Products live</div>
              <div className="tnum mt-2 font-display text-3xl font-bold text-ink">
                {products.length - drafts.length}
                {drafts.length > 0 && <span className="label-caps ml-3 align-middle">+{drafts.length} drafts</span>}
              </div>
            </div>
            <div className="panel rounded-2xl p-5">
              <div className="label-caps">Files attached</div>
              <div className="tnum mt-2 font-display text-3xl font-bold text-ink">
                {products.reduce((n, p) => n + p.files.length, 0)}
              </div>
            </div>
          </div>

          <section className="mt-8 panel rounded-2xl p-6" aria-busy={busy || undefined}>
            <header className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">
                Payment queue
              </h2>
              <Link to="/admin/orders" className="btn btn-ghost">
                All orders
              </Link>
            </header>
            {actionError && (
              <p className="mt-4 text-[13px] text-danger" role="alert">{actionError}</p>
            )}
            {pending.length === 0 ? (
              <p className="mt-4 text-dim">Nothing waiting — the desk is clear.</p>
            ) : (
              <ul className="mt-4 divide-y divide-hairline">
                {pending.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Link to={`/admin/orders/${o.id}`} className="font-display font-bold text-ink">
                      #{o.id}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-dim">{o.user.email}</span>
                    <span className="tnum text-ink">{formatPrice(o.totalPrice)}</span>
                    <span className="flex gap-2">
                      <button className="btn btn-primary" disabled={busy} data-busy={busy || undefined} onClick={() => void approve(o.id)}>
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost"
                        disabled={busy}
                        data-busy={busy || undefined}
                        onClick={() =>
                          ask({
                            title: `Reject order #${o.id}?`,
                            confirmLabel: "Reject",
                            danger: true,
                            action: () => void run(() => adminRejectOrder(o.id), "Rejected"),
                          })
                        }
                      >
                        Reject
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {pending.length > 5 && (
              <p className="mt-3 label-caps text-dim">+{pending.length - 5} more waiting — see all orders</p>
            )}
          </section>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link to="/admin/products" className="panel card-lift rounded-2xl p-5">
              <div className="font-display font-bold text-ink uppercase">Products</div>
              <p className="mt-1 text-[13px] text-dim">Edit packs, publish drafts, attach files</p>
            </Link>
            <Link to="/admin/tags" className="panel card-lift rounded-2xl p-5">
              <div className="font-display font-bold text-ink uppercase">Tags</div>
              <p className="mt-1 text-[13px] text-dim">Rename, create, retire</p>
            </Link>
            <Link to="/admin/settings" className="panel card-lift rounded-2xl p-5">
              <div className="font-display font-bold text-ink uppercase">Settings</div>
              <p className="mt-1 text-[13px] text-dim">Payment instructions and delivery notes</p>
            </Link>
          </div>
        </>
      )}
    </>
  );
}
