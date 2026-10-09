import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("catalog", "routes/catalog.tsx"),
  route("pack/:slug", "routes/pack.$slug.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("library", "routes/library.tsx"),
  route("sign-in", "routes/sign-in.tsx"),
  route("robots.txt", "routes/robots[.]txt.ts"),
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
  layout("routes/admin.layout.tsx", [
    route("admin", "routes/admin.tsx"),
    route("admin/products", "routes/admin.products.tsx"),
    route("admin/settings", "routes/admin.settings.tsx"),
  ]),
] satisfies RouteConfig;
