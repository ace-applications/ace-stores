import type { Route } from "./+types/library";
import { Link } from "react-router";
import { PACKS, formatPrice, type Pack } from "../data/products";
import { useStore, type Order } from "../lib/store";
import { downloadReceipt } from "../lib/receipt";
import { CoverArt } from "../components/CoverArt";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Your library — ACE Stores" }];
}

export default function Library() {
  const store = useStore();

  if (!store.hydrated) {
    return (
      <Shell>
        <p className="label-caps py-16 text-center">reading session…</p>
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
        {store.email && (
          <span className="label-caps tnum max-w-[16rem] truncate sm:max-w-none">{store.email}</span>
        )}
      </div>

      {store.orders.map((order) => {
        const packs = order.items
          .map((id) => PACKS.find((p) => p.id === id))
          .filter((p): p is Pack => Boolean(p));
        return (
          <section key={order.id} className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-2">
              <h2 className="font-display text-sm font-bold tracking-[0.09em] text-accent uppercase">
                order {order.id}
              </h2>
              <span className="label-caps tnum">{new Date(order.date).toLocaleString()}</span>
            </div>
            <ul>
              {packs.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="hidden w-14 overflow-hidden rounded-lg sm:block">
                      <CoverArt pack={p} showTitle={false} className="block aspect-square w-full" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/pack/${p.slug}`}
                        className="font-display text-lg font-bold text-ink hover:text-accent"
                      >
                        {p.name}
                      </Link>
                      <div className="label-caps mt-0.5">
                        {p.formats.join(" · ")} · {p.size} · {formatPrice(p.price)}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost px-4! py-2!" onClick={() => downloadReceipt(p, order)}>
                    download manifest
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-14">
        <h2 className="label-caps">order history</h2>
        <table className="mt-3 w-full text-left text-[13.5px]">
          <thead>
            <tr className="label-caps">
              <th scope="col" className="border-b border-hairline py-2 font-semibold">order</th>
              <th scope="col" className="border-b border-hairline py-2 font-semibold">date</th>
              <th scope="col" className="hidden border-b border-hairline py-2 font-semibold sm:table-cell">packs</th>
              <th scope="col" className="border-b border-hairline py-2 text-right font-semibold">total</th>
            </tr>
          </thead>
          <tbody className="tnum text-dim">
            {store.orders.map((o) => {
              const total = o.items.reduce((s, id) => s + (PACKS.find((p) => p.id === id)?.price ?? 0), 0);
              return (
                <tr key={o.id}>
                  <td className="border-b border-hairline py-2.5 text-ink">{o.id}</td>
                  <td className="border-b border-hairline py-2.5">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="hidden border-b border-hairline py-2.5 sm:table-cell">{o.items.length}</td>
                  <td className="border-b border-hairline py-2.5 text-right text-ink">{formatPrice(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">{children}</div>;
}
