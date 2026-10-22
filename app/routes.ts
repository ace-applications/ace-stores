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
    route("account", "routes/account.tsx"),
    route("policies", "routes/policies.tsx"),
    route("sign-in", "routes/sign-in.tsx"),
  ]),
  route("robots.txt", "routes/robots[.]txt.ts"),
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
  layout("routes/admin.layout.tsx", [
    route("admin", "routes/admin.tsx", [
      index("routes/admin._index.tsx"),
      route("orders", "routes/admin.orders.tsx", [
        index("routes/admin.orders._index.tsx"),
        route(":id", "routes/admin.orders.$id.tsx"),
      ]),
      route("products", "routes/admin.products.tsx", [
        index("routes/admin.products._index.tsx"),
        route("new", "routes/admin.products.new.tsx"),
        route(":id", "routes/admin.products.$id.tsx"),
      ]),
      route("tags", "routes/admin.tags.tsx"),
      route("settings", "routes/admin.settings.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
