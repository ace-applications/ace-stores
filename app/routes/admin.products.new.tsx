import type { Route } from "./+types/admin.products.new";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { ProductEditor } from "../components/ProductEditor";
import { adminTags } from "../lib/admin-api";

export async function clientLoader() {
  try {
    return { tags: await adminTags(), error: false } as const;
  } catch {
    return { tags: [], error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — New product" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="skeleton h-6 w-48" />
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

export default function AdminProductNew() {
  const { tags, error } = useLoaderData<typeof clientLoader>();
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
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">New product</h1>
      <p className="mt-2 text-dim">Drafts are hidden from the storefront until you publish.</p>
      {error ? (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-danger">
          Failed to load tags
          <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>Retry</button>
        </p>
      ) : (
        <div className="mt-6">
          <ProductEditor product={null} tags={tags} creating />
        </div>
      )}
    </>
  );
}
