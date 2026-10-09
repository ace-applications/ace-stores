import { fetchCatalog } from "../lib/api";
import type { Pack } from "../data/products";
import { siteOrigin } from "../lib/seo";

/**
 * Built from the live catalog rather than a hand-maintained list, so a new
 * pack appears without anyone remembering to edit a file. Only canonical,
 * indexable pages are listed.
 */
export async function loader({ request }: { request: Request }) {
  const origin = siteOrigin(request);
  const packs: Pack[] = await fetchCatalog().catch(() => []);

  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: `${origin}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${origin}/catalog`, priority: "0.9", changefreq: "daily" },
  ];
  for (const pack of packs) {
    urls.push({ loc: `${origin}/pack/${pack.slug}`, priority: "0.8", changefreq: "weekly" });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}