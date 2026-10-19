import type { Route } from "./+types/admin.products._index";
import { useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { formatPrice } from "../data/products";
import { adminProductsList } from "../lib/admin-api";

/** Product index: one compact row per pack; the heavy editing lives on
 *  /admin/products/:id so this page stays scannable as the catalog grows. */
export async function clientLoader() {
  try {
    return { products: await adminProductsList(), error: false } as const;
  } catch {
    return { products: [], error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Products" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <div className="skeleton h-8 w-44" />
        <div className="skeleton h-9 w-36" />
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel flex items-center gap-4 rounded-2xl p-4">
            <div className="skeleton h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-56" />
            </div>
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

export default function AdminProductsIndex() {
  const { products, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [search, setSearch] = useState("");

  const needle = search.trim().toLowerCase();
  const matching = needle
    ? products.filter((p) => `${p.title} ${p.tags.map((t) => t.name).join(" ")}`.toLowerCase().includes(needle))
    : products;
  const drafts = products.filter((p) => !p.published).length;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Products</h1>
          {drafts > 0 && <p className="label-caps mt-1 text-dim">{drafts} draft{drafts > 1 ? "s" : ""} hidden from the storefront</p>}
        </div>
        <div className="flex gap-2">
          <label className="field flex max-w-xs items-center gap-2 py-1.5">
            <span className="sr-only">Search products</span>
            <input
              className="w-full bg-transparent text-ink outline-none"
              placeholder="Search title, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Link to="/admin/products/new" className="btn btn-primary">New product</Link>
        </div>
      </div>

      {error && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-danger">
          Failed to load products
          <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>Retry</button>
        </p>
      )}

      <div className="mt-6 space-y-3" aria-busy={error}>
        {!error && matching.length === 0 ? (
          <div className="panel rounded-2xl p-6">
            <p className="text-dim">{needle ? "No products match that search." : "No products yet."}</p>
            <p className="label-caps mt-2">create one with “new product”, then attach files and a cover</p>
          </div>
        ) : (
          matching.map((p) => (
            <Link
              key={p.id}
              to={`/admin/products/${p.id}`}
              className="panel card-lift flex items-center gap-4 rounded-2xl p-4 text-ink"
              aria-label={`Edit ${p.title}`}
            >
              {p.thumbnailUrl ? (
                <img src={p.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-hairline object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-lg border border-hairline" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display font-bold">{p.title}</span>
                  {!p.published && <span className="chip" data-on>draft</span>}
                </div>
                <div className="mt-0.5 truncate text-[13px] text-dim">
                  {p.tags.length > 0 ? p.tags.map((t) => t.name).join(" · ") : "no tags"}
                </div>
              </div>
              <span className="label-caps tnum hidden sm:block">{p.files.length} file{p.files.length === 1 ? "" : "s"}</span>
              <span className="tnum">{formatPrice(p.price)}</span>
              <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-dim">
                <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
