import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Shop and desk are separate surfaces; each layout keeps the other side out.
  // Resource routes stay outside both — robots and sitemap must answer for
  // every crawler regardless of who is signed in.
  layout("routes/store.layout.tsx", [
    index("routes/home.tsx"),
    route("catalog", "routes/catalog.tsx"),
    route("pack/:slug", "routes/pack.$slug.tsx"),
    route("checkout", "routes/checkout.tsx"),
    route("library", "routes/library.tsx"),
    route("sign-in", "routes/sign-in.tsx"),
  ]),
  route("robots.txt", "routes/robots[.]txt.ts"),
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
  layout("routes/admin.layout.tsx", [
    route("admin", "routes/admin.tsx"),
    route("admin/products", "routes/admin.products.tsx"),
    route("admin/settings", "routes/admin.settings.tsx"),
  ]),
] satisfies RouteConfig;
