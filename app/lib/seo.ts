/**
 * SEO helpers. One place for the site origin, so canonicals, the sitemap and
 * JSON-LD can never disagree about what the public URL is.
 *
 * VITE_SITE_URL must be set in production — canonical URLs and og:image need an
 * absolute origin. Resource routes pass their `request` as a fallback, which
 * is right locally but wrong behind a proxy that rewrites the host.
 */
export function siteOrigin(request?: Request): string {
  const configured = import.meta.env.VITE_SITE_URL;
  if (typeof configured === "string" && configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }
  return request ? new URL(request.url).origin : "http://localhost:5173";
}

export function abs(path: string, request?: Request): string {
  return new URL(path, `${siteOrigin(request)}/`).href;
}

/** Trim to a search-friendly length without cutting mid-word. */
export function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Pages no buyer should find in search: account, cart, staff desk. */
export const NOINDEX = {
  name: "robots",
  content: "noindex, nofollow",
} as const;

/**
 * The full social/serp tag set for an indexable page.
 *
 * A route's `meta` REPLACES the parent's descriptors rather than merging with
 * them, so every indexable route has to emit the complete set — hence one
 * builder instead of the same six lines copied per route.
 */
export function pageMeta({
  title,
  description,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  image: string;
  type?: "website" | "product";
}) {
  return [
    { title },
    { name: "description", content: clamp(description, 160) },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}