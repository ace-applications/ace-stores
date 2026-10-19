import type { Route } from "./+types/admin.products.$id";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { ProductEditor } from "../components/ProductEditor";
import { adminProductsList, adminTags } from "../lib/admin-api";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = Number(params.id);
  try {
    // one round trip for both lists; a draft is only reachable through the
    // admin list, so the product may legitimately be missing for old links
    const [products, tags] = await Promise.all([adminProductsList(), adminTags()]);
    return { product: products.find((p) => p.id === id) ?? null, tags, error: false } as const;
  } catch {
    return { product: null, tags: [], error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Edit product" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="skeleton h-6 w-40" />
      <div className="mt-6 panel rounded-2xl p-6">
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-[74px] sm:col-span-2" />
          <div className="skeleton h-[74px]" />
          <div className="skeleton h-[74px]" />
        </div>
        <div className="skeleton mt-4 h-9 w-24" />
      </div>
    </>
  );
}

export default function AdminProductEdit() {
  const { product, tags, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  return (
    <>
      <p className="mb-2">
        <Link to="/admin/products" className="btn btn-ghost">
          <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" className="mr-1 inline-block">
            <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Products
        </Link>
      </p>
      {!error && product ? (
        <>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">{product.title}</h1>
          <p className="mt-2 text-dim">
            Product #{product.id} · {product.published ? "live on storefront" : "draft, hidden from buyers"}
          </p>
          <div className="mt-6">
            <ProductEditor product={product} tags={tags} creating={false} />
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">
            {error ? "Product failed to load" : "Product not found"}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-dim">
            {error ? "The desk couldn't reach the catalog." : "It may have been deleted, or the link is stale."}
            <Link to="/admin/products" className="btn btn-ghost">All products</Link>
            {error && <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>Retry</button>}
          </p>
        </>
      )}
    </>
  );
}
