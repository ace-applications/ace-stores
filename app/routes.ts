import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("catalog", "routes/catalog.tsx"),
  route("pack/:slug", "routes/pack.$slug.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("library", "routes/library.tsx"),
] satisfies RouteConfig;
