import type { Route } from "./+types/admin.orders.$id";
import { useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { formatDate, formatPrice } from "../data/products";
import { adminApproveOrder, adminOrder, adminRejectOrder, adminRevokeOrder } from "../lib/admin-api";
import { friendlyError } from "../lib/errors";
import { useConfirm, useToast } from "../components/admin-ux";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return { order: null, error: false } as const;
  try {
    return { order: await adminOrder(id), error: false } as const;
  } catch {
    return { order: null, error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Order" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="skeleton h-6 w-40" />
      <div className="mt-6 panel rounded-2xl p-6">
        <div className="flex justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-4 w-56" />
          </div>
          <div className="skeleton h-8 w-24" />
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-5 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function AdminOrderDetail() {
  const { order, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();

  if (error || !order) {
    return (
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Order not found</h1>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-dim">
          {error ? "It failed to load" : "No order with that id"}.
          <Link to="/admin/orders" className="btn btn-ghost">Back to orders</Link>
          {error && (
            <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>Retry</button>
          )}
        </p>
      </div>
    );
  }

  /** every mutation: run, then refresh the loader's data in place */
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      show("Done");
      revalidator.revalidate();
    } catch (e) {
      setActionError(friendlyError(e, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = order.status.replace(/_/g, " ");

  return (
    <>
      {toast}
      {dialog}
      <p className="mb-2">
        <Link to="/admin/orders" className="btn btn-ghost">
          <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" className="mr-1 inline-block">
            <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Orders
        </Link>
      </p>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Order #{order.id}</h1>
      <p className="mt-2 text-dim">
        {formatDate(order.createdAt)} · {statusLabel}
      </p>

      {actionError && (
        <p className="mt-4 text-[13px] text-danger" role="alert">{actionError}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Items</h2>
          <div className="mt-4 space-y-3">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-baseline justify-between gap-3">
                <Link to={`/admin/products/${it.productId}`} className="text-ink underline decoration-hairline">
                  {it.title}
                </Link>
                <span className="tnum text-dim">{formatPrice(it.price)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-baseline justify-between border-t border-hairline pt-4">
            <span className="label-caps">Total</span>
            <span className="font-display text-2xl font-bold price-display text-ink tnum">{formatPrice(order.totalPrice)}</span>
          </div>
          <dl className="mt-6 space-y-2 text-[13.5px]">
            <div className="flex justify-between gap-3">
              <dt className="label-caps">Buyer</dt>
              <dd className="text-ink">{order.user.name ? `${order.user.name} · ` : ""}{order.user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="label-caps">Payment ref</dt>
              <dd className="tnum text-ink">{order.paymentReference ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="label-caps">Last update</dt>
              <dd className="tnum text-ink">{formatDate(order.updatedAt ?? order.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          {order.screenshotUrl && (
            <section className="panel rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Payment screenshot</h2>
              <img
                src={order.screenshotUrl}
                alt={`Payment screenshot — order #${order.id}`}
                className="mt-4 max-h-[28rem] w-full rounded-lg border border-hairline object-contain"
              />
            </section>
          )}
          <section className="panel rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Action</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {order.status === "pending_payment" && (
                <>
                  <button className="btn btn-primary" disabled={busy} onClick={() => void run(() => adminApproveOrder(order.id))}>Approve</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => ask({ title: `Reject order #${order.id}?`, confirmLabel: "Reject", danger: true, action: () => void run(() => adminRejectOrder(order.id)) })}>Reject</button>
                </>
              )}
              {order.status === "paid" && (
                <button className="btn btn-ghost" disabled={busy} onClick={() => ask({ title: `Revoke order #${order.id}?`, body: "This kills downloads for the buyer.", confirmLabel: "Revoke", danger: true, action: () => void run(() => adminRevokeOrder(order.id)) })}>Revoke (kills downloads)</button>
              )}
              {["rejected", "expired", "revoked"].includes(order.status) && (
                <p className="text-dim">This order is closed — no further actions apply.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
