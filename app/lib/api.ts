import { createAuthClient } from "better-auth/react";
import type { Pack } from "../data/products";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export const authClient = createAuthClient({ baseURL: API_BASE });

/** mirrors ProductShape in docs/frontend-handoff.md (backend contract) */
export interface ProductShape {
  id: number;
  title: string;
  description: string | null;
  price: number; // whole EGP
  previewUrl: string | null;
  thumbnailUrl: string | null; // presigned — EXPIRES, refetched per load
  files: { id: number; name: string; sizeBytes: number | null }[];
  tags: { id: number; name: string }[];
}

/** mirrors OrderShape in docs/frontend-handoff.md */
export interface OrderItemShape {
  id: number;
  orderId: number;
  productId: number;
  title: string;
  price: number;
}

export interface OrderShape {
  id: number;
  userId?: string;
  status: "pending_payment" | "paid" | "rejected" | "expired" | "revoked";
  totalPrice: number;
  paymentReference: string | null;
  screenshotKey: string;
  createdAt: string;
  updatedAt?: string;
  items: OrderItemShape[];
}

/**
 * Every backend call goes through here.
 *
 * Pass the loader's `request` when running server-side: a server `fetch` has
 * no cookie jar, so without the incoming Cookie header the call is anonymous.
 * Client-side calls omit it and rely on `credentials: "include"`.
 */
export async function api<T>(path: string, init?: RequestInit, req?: Request): Promise<T> {
  const cookie = req?.headers.get("cookie");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init?.headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (!res.ok) {
    let msg = `${init?.method ?? "GET"} ${path} → ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg += `: ${body.error}`;
    } catch {
      /* non-JSON body — status alone is enough */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/* ——— buyer endpoints (session cookie sent via credentials) ——— */

export function myOrders(req?: Request): Promise<OrderShape[]> {
  return api<OrderShape[]>("/orders/me", undefined, req);
}

export function createOrder(body: {
  items: { productId: number }[];
  paymentReference?: string;
  screenshotKey?: string;
}): Promise<OrderShape> {
  return api<OrderShape>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function presignScreenshot(contentType: string) {
  return api<{ key: string; uploadUrl: string; contentType: string }>("/orders/presign-screenshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
  });
}

/** buyer gets a fresh presigned URL per file — expires in 300s */
export function orderDownloadUrl(fileId: number) {
  return api<{ url: string; expiresIn: number; fileName: string }>(`/files/${fileId}/download`);
}

export interface AppSettings {
  payment_instructions?: string;
}

export function settings(req?: Request): Promise<AppSettings> {
  return api<AppSettings>("/settings", undefined, req);
}

/* ——— adapter: ProductShape → Pack ——————————————————————
 * Every visual component consumes the Pack shape (family, formats,
 * contents…), so real products get adapted once, here.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function productToPack(p: ProductShape, taken: Set<string>): Pack {
  const tagNames = p.tags.map((t) => t.name);
  const family = tagNames.some((n) => n.toLowerCase() === "audio") ? "audio" : "video";
  // Prefer a descriptive tag, but drop one that just restates the family or the
  // title — "Video transitions · Transitions" says nothing twice over.
  const titleWords = new Set(p.title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const sub =
    tagNames.find(
      (n) =>
        !["video", "audio"].includes(n.toLowerCase()) &&
        ![...titleWords].some((w) => n.toLowerCase().includes(w)),
    ) ?? "Packs";
  let slug = slugify(p.title) || `product-${p.id}`;
  if (taken.has(slug)) slug = `${slug}-${p.id}`; // title collision
  taken.add(slug);
  const formats = [
    ...new Set(
      p.files.flatMap((f) => {
        const ext = f.name.split(".").pop();
        return ext ? [ext.toUpperCase()] : [];
      }),
    ),
  ];
  return {
    id: String(p.id),
    productId: p.id,
    slug,
    name: p.title,
    family,
    sub,
    blurb: p.description ?? p.title,
    formats,
    // what the pack actually contains: its deliverable files
    contents: p.files.map((f) => ({
      label: (f.name.split(".").pop() ?? "file").toUpperCase(),
      note: f.name,
    })),
    size: formatSize(p.files.reduce((s, f) => s + (f.sizeBytes ?? 0), 0)),
    price: p.price,
    imageUrl: p.thumbnailUrl ?? undefined,
    files: p.files.map((f) => ({ id: f.id, name: f.name })),
  };
}

/** fetch + adapt the whole catalog (API has no pagination).
 *  In-flight dedup + short TTL: thumbnails are presigned and expire, so a
 *  long-lived cache would serve dead images; 5 min revalidates per load.
 *  ponytail: module-level, so under SSR it is one cache per process shared
 *  by all requests. Safe while the catalog is public and unmutated; move it
 *  into the loader if it ever becomes per-user. */
const CATALOG_TTL = 5 * 60 * 1000;
let catalogCache: { at: number; promise: Promise<Pack[]> } | null = null;

async function loadCatalog(): Promise<Pack[]> {
  const products = await api<ProductShape[]>("/products");
  const taken = new Set<string>();
  return products.map((p) => productToPack(p, taken));
}

export function fetchCatalog(): Promise<Pack[]> {
  if (!catalogCache || Date.now() - catalogCache.at > CATALOG_TTL) {
    catalogCache = {
      at: Date.now(),
      promise: loadCatalog().catch((err) => {
        catalogCache = null; // a failure must not poison the next attempt
        throw err;
      }),
    };
  }
  return catalogCache.promise;
}