import type { Route } from "./+types/library";
import { Link, useLoaderData } from "react-router";
import { useEffect } from "react";
import { formatDate, formatDay, formatPrice, ORDER_STATUS_LABEL } from "../data/products";
import { authClient, fetchCatalog } from "../lib/api";
import { useStore } from "../lib/store";
import { OrderLine } from "../components/OrderLine";
import { Shell } from "../components/Shell";

export async function loader() {
  return { packs: await fetchCatalog() };
}

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Your library — ACE Stores" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function Library() {
  const { packs } = useLoaderData<typeof loader>();
  const store = useStore();
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? "";
  const userId = session?.user?.id;
  const { refreshOrders } = store;

  // An admin approves orders on their own desk, so identity-keyed fetching
  // leaves this shelf stale. Re-read whenever the buyer arrives here. Keyed on
  // userId (an id, not the session object) so a session refetch alone does not
  // re-hit the backend.
  useEffect(() => {
    if (userId) void refreshOrders();
  }, [userId, refreshOrders]);

  if (!session?.user) {
    return (
      <Shell>
        <div className="panel mx-auto max-w-xl rounded-2xl px-6 py-16 text-center">
          <h1 className="font-display text-3xl font-extrabold text-ink">Your library is gated.</h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-dim">
            Sign in — every pack you buy lives here, downloadable any time from any machine.
          </p>
          <Link to="/sign-in?next=/library" className="btn btn-accent mt-8">
            sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (store.orders.length === 0) {
    return (
      <Shell>
        <div className="panel mx-auto max-w-2xl rounded-2xl px-6 py-16 text-center">
          <svg viewBox="0 0 48 48" className="mx-auto w-12" aria-hidden>
            <path
              d="M10 36V16h6v-4h6v4h4v-4h6v4h6v20z"
              fill="none"
              stroke="#3a3f4a"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="26" r="3" fill="#8b5cf6" />
          </svg>
          <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Your shelf is empty.</h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-dim">
            Every pack you buy lives here — re-downloadable, any time, any machine.
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
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink uppercase">
          Your shelf
        </h1>
        <span className="label-caps tnum max-w-[16rem] truncate sm:max-w-none">{email}</span>
      </div>

      {store.orders.map((order) => (
        <section key={order.id} className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-2">
            <h2 className="font-chrome text-sm font-bold tracking-[0.09em] text-accent uppercase">
              order {order.id} ·{" "}
              <span className="!text-dim">{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
            </h2>
            <span className="label-caps tnum">{formatDate(order.createdAt)}</span>
          </div>
          <ul>
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
        </section>
      ))}

      <section className="mt-14">
        <h2 className="label-caps">order history</h2>
        <table className="mt-3 w-full text-left text-[13.5px]">
          <thead>
            <tr className="label-caps">
              <th scope="col" className="border-b border-hairline py-2 font-semibold">order</th>
              <th scope="col" className="border-b border-hairline py-2 font-semibold">date</th>
              <th scope="col" className="hidden border-b border-hairline py-2 font-semibold sm:table-cell">status</th>
              <th scope="col" className="border-b border-hairline py-2 text-right font-semibold">total</th>
            </tr>
          </thead>
          <tbody className="tnum text-dim">
            {store.orders.map((o) => (
              <tr key={o.id}>
                <td className="border-b border-hairline py-2.5 text-ink">{o.id}</td>
                <td className="border-b border-hairline py-2.5">{formatDay(o.createdAt)}</td>
                <td className="hidden border-b border-hairline py-2.5 sm:table-cell">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </td>
                <td className="border-b border-hairline py-2.5 text-right text-ink">{formatPrice(o.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
