import { RouterContextProvider, createContext, createRequestHandler } from "react-router";

import { setSsrFetch } from "../app/lib/api";

export interface Env {
  // service binding to the backend Worker; workers.dev SSR fetches cannot
  // cross *.workers.dev hostnames, so api() routes through this binding.
  API: Fetcher;
}

const cloudflareContext = createContext<{ env: Env; ctx: ExecutionContext }>();

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    // idempotent per-isolate: the binding interface is the same every request
    setSsrFetch(env.API.fetch.bind(env.API));
    const routerContext = new RouterContextProvider();
    routerContext.set(cloudflareContext, { env, ctx });
    return requestHandler(request, routerContext);
  },
} satisfies ExportedHandler<Env>;
