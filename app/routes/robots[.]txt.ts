import { siteOrigin } from "../lib/seo";

/** Crawl policy. Buyer-facing pages are open; account and staff routes are not. */
export function loader({ request }: { request: Request }) {
  const body = `# ACE Stores
User-agent: *
Allow: /

# Account, cart and staff surfaces have nothing to index
Disallow: /admin
Disallow: /checkout
Disallow: /library
Disallow: /sign-in

Sitemap: ${siteOrigin(request)}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}