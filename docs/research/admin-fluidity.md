# Admin Fluidity Research

Goal: fluid, coherent React Router 8 framework-mode admin panel. Context: React 19, Vite SSR, Tailwind 4, Cloudflare Workers, clientLoader-heavy because session cookie lives on API host.

Scope note: only primary sources used. Unverified first-party design posts (Shopify Admin / Stripe Dashboard / Linear) are called out in §5 — no claims invented from them.

---

## 1. FACTS — React Router data loading, navigation, pending UI

### loader vs clientLoader

- `loader` runs on server for initial SSR and for client navigations (via automatic fetch from browser to server). `loader` is removed from client bundles, so server-only APIs are safe. Source: https://reactrouter.com/start/framework/data-loading
- `clientLoader` fetches on client only, for pages/projects preferred to fetch browser-only. `HydrateFallback` renders while client loader runs. Source: https://reactrouter.com/start/framework/data-loading
- Both can be used together: `loader` on initial SSR, `clientLoader` on subsequent client navigations. Client loader can call `serverLoader()` to reuse server result. Source: https://reactrouter.com/start/framework/data-loading
- `clientLoader.hydrate = true` forces client loader to run during hydration before page renders; pair with `HydrateFallback`. Source: https://reactrouter.com/start/framework/data-loading
- Route module doc repeats: `clientLoader` is called only in browser, provides data in addition to / in place of `loader`; `hydrate` property enables hydration participation. Source: https://reactrouter.com/start/framework/route-module
- Client-data pattern for BFF: load from server `loader` on document load, from `clientLoader` on subsequent loads; router will NOT call clientLoader on hydration in that pattern. Fullstack-state pattern: server loader gives partial data, clientLoader combines server + client data, requires `HydrateFallback` + `clientLoader.hydrate = true`. Source: https://reactrouter.com/how-to/client-data

### Code splitting

- Route modules define automatic code-splitting, data loading, actions, revalidation, error boundaries. Source: https://reactrouter.com/start/framework/route-module
- Component routes via `<Routes>/<Route>` do NOT participate in data loading, actions, code splitting. Source: https://reactrouter.com/start/framework/routing

### Pending UI

- Global pending navigation: `useNavigation()` returns current navigation, default idle. Render pending UI (e.g. global spinner) from `navigation.state` / `navigation.location`. Source: https://reactrouter.com/api/hooks/useNavigation and https://reactrouter.com/start/framework/pending-ui
- Pending-UI guide: "When the user navigates to a new route, or submits data to an action, the UI should immediately respond ... Application code is responsible for this." Source: https://reactrouter.com/start/framework/pending-ui
- Local pending: `NavLink` children/className/style callbacks receive `isPending`; `className` supports `a.pending`, `a.active`. Source: https://reactrouter.com/start/framework/navigating and https://reactrouter.com/start/framework/pending-ui
- Fetcher forms give independent pending state (`fetcher.state !== "idle"`); non-fetcher forms use `useNavigation` (`navigation.formAction`). Source: https://reactrouter.com/start/framework/pending-ui
- Optimistic UI pattern documented with fetcher: read `fetcher.formData` to derive optimistic value (e.g. task status). Source: https://reactrouter.com/start/framework/pending-ui

### Actions / revalidation

- Route actions: when action completes, all loader data on page is revalidated automatically. `clientAction` vs server `action`, client priority. Source: https://reactrouter.com/start/framework/actions and https://reactrouter.com/start/framework/route-module
- Framework SSR default: opt-out revalidation — active loaders revalidated on navigations and successful submissions via Link/Form/fetcher.submit. Failed (4xx/5xx) submissions do NOT revalidate by default. Source: https://reactrouter.com/how-to/optimize-revalidation
- `shouldRevalidate` exports per-route opt-out; matched routes handled independently — child skip does not skip ancestors. Prefer conditional `shouldRevalidate` inspecting `formMethod/formAction` and returning `defaultShouldRevalidate` over always `false`. Source: https://reactrouter.com/how-to/optimize-revalidation and https://reactrouter.com/start/framework/route-module
- Call-site opt-out: `defaultShouldRevalidate={false}` on Form/Link/fetcher, or `fetcher.submit(..., {defaultShouldRevalidate:false})`; routes exporting `shouldRevalidate` still get final say via `defaultShouldRevalidate` arg. Source: https://reactrouter.com/how-to/optimize-revalidation
- Plain `fetch()` to resource route does NOT go through router, does NOT revalidate loaders. `fetcher.load` only revalidates after action submissions and explicit `useRevalidator`. Source: https://reactrouter.com/how-to/optimize-revalidation

### HydrateFallback / headers / links

- `HydrateFallback`: on initial page load, route component renders only after client loader finished; fallback renders immediately in place. Source: https://reactrouter.com/start/framework/route-module
- `headers()` route export sets response headers (`Cache-Control` example given). `links()` export defines `<link>` elements in head, aggregated via `<Links/>`. Source: https://reactrouter.com/start/framework/route-module

### Rendering strategies

- SSR global setting, individual routes can still be client-loaded via `clientLoader` to avoid server fetch for that UI portion. Source: https://reactrouter.com/start/framework/rendering

---

## 2. FACTS — React 19

### useOptimistic

- `useOptimistic(value, reducer?)` — setter must be called inside an Action (`startTransition` or action prop); outside warns and briefly renders. Optimistic state is temporary, converges in single render when transition completes; parent prop update during action determines final state; failure reverts to previous `value`. Source: https://react.dev/reference/react/useOptimistic
- Reducer pattern needed when base state may change during pending action (e.g. list additions); updater functions only see state from transition start. Source: https://react.dev/reference/react/useOptimistic
- Pending detection: compare `optimistic !== value`, or `useTransition`, or per-item `pending` flag in reducer. Source: https://react.dev/reference/react/useOptimistic

### useTransition / startTransition

- Marks updates non-blocking, interruptible; `isPending` true until all actions complete. Caveats: cannot control text inputs; post-`await` updates need nested `startTransition`; multiple concurrent transitions batch together; out-of-order async completions possible — `useActionState`/form actions handle ordering. Source: https://react.dev/reference/react/useTransition
- Transitions prevent unwanted loading indicators (hide already-revealed content) but do not wait for nested Suspense boundaries. Routers expected to wrap navigations in Transitions. Source: https://react.dev/reference/react/useTransition and https://react.dev/reference/react/Suspense

### useActionState

- Queues `dispatchAction` sequentially, each receives previous result; stable identity; must be called from Action (wrap in `startTransition` or pass to action prop). Throwing cancels queued actions → Error Boundary. Source: https://react.dev/reference/react/useActionState
- Pairs with `useOptimistic` for immediate feedback. Aborting actions via AbortController possible but unsafe for mutations (server change not undone). Source: https://react.dev/reference/react/useActionState

### useFormStatus / form action

- `<form action={fn}>` runs submission in Transition, tracks pending, resets uncontrolled fields after success. `useFormStatus` in child button reads `pending`. Source: https://react.dev/reference/react-dom/components/form

### Activity

- `<Activity mode="visible|hidden">` hides with `display:none`, destroys Effects, preserves state + DOM; hidden children still re-render at lower priority. Pre-rendering hidden content fetches Suspense-activated data early; also enables Selective Hydration. Caveat: DOM side effects persist (video/audio/iframe) — pause on hide via layout effect cleanup. Source: https://react.dev/reference/react/Activity

### Suspense

- Fallback is lightweight placeholder (spinner or skeleton). Suspense only activates for lazy code, `use()` promises, stylesheet with precedence, streaming HTML — NOT Effect/event-handler fetches. Reveals at most once per 300ms, batched. Nested boundaries reveal progressively. Source: https://react.dev/reference/react/Suspense
- `useDeferredValue` keeps stale content while fresh loads (dim via opacity) instead of fallback; integrated with Suspense, interruptible background render. Source: https://react.dev/reference/react/useDeferredValue and https://react.dev/reference/react/Suspense

---

## 3. FACTS — Web platform: INP, fonts, skeletons

### INP

- INP observes latency of all click/tap/key interactions; final value = longest interaction, ignoring outliers (75th percentile). Good ≤200ms, needs improvement >200–500ms, poor >500ms. Source: https://web.dev/articles/inp
- Interaction latency = input delay + processing duration + presentation delay. Goal is next-paint feedback, not full async completion. Source: https://web.dev/articles/inp
- Optimize: reduce input delay (script evaluation/long tasks during startup), yield long event callbacks (setTimeout / requestAnimationFrame + setTimeout defer non-critical work), avoid layout thrashing, minimize DOM size, use `content-visibility` for off-screen. Source: https://web.dev/articles/optimize-inp
- Long tasks during startup from script parse/compile/execute delay interaction; keep scripts small, defer non-critical. Source: https://web.dev/articles/optimize-inp

### Fonts / CLS

- `font-display` values: `block` (short block, infinite swap), `swap` (tiny block, infinite swap), `fallback` (tiny block, short swap), `optional` (tiny block, no swap). Timeline: block period invisible fallback, swap period visible fallback, failure period fallback. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display
- `size-adjust` scales fallback font metrics to harmonize with primary font, reducing layout shift on swap. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/size-adjust
- Preload fonts via `<link rel="preload" as="font" type="font/woff2" crossorigin>` — crossorigin required for fonts; preload helps reduce FOUT. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload

### Skeletons vs spinners

- React docs: Suspense fallback "in practice, a fallback is a lightweight placeholder view, such as a loading spinner or skeleton." Source: https://react.dev/reference/react/Suspense
- No primary Chrome/web.dev source fetched for skeleton-vs-spinner comparative efficacy; web.dev INP doc only says quick visual feedback beats delay. Not claimed beyond that. Source: https://web.dev/articles/inp

---

## 4. FACTS — Bundle waterfall / caching / preconnect / code splitting

### React Router splitting

- Automatic code-splitting per route module (see §1). Component `<Routes>` bypass splitting. Sources: https://reactrouter.com/start/framework/route-module , https://reactrouter.com/start/framework/routing

### Preload / modulepreload / prefetch / preconnect

- `rel="preload"` = high-priority current-page subresource; result in per-document in-memory cache; don't preload everything. `rel="modulepreload"` parses/compiles JS modules + deps into module map. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload and https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading
- `rel="prefetch"` = future same-site navigation/subresource; HTTP cache; Cache-Control can block it. `rel="preconnect"` warms DNS+TCP+TLS for cross-origin; no benefit same-origin; use only for most critical origins. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect and https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading
- React `<link>` component: stylesheet with `precedence` suspends, deduped by href; `rel="preload"`/`modulepreload` support `as`, `fetchPriority`. Route `links()` aggregates into head. Sources: https://react.dev/reference/react-dom/components/link , https://reactrouter.com/start/framework/route-module

### HTTP caching (Workers static assets)

- `Cache-Control: public, max-age=31536000, immutable` for hashed static assets (cache-busting pattern); HTML/main resource `no-cache` (+ `private` if personalized). `no-cache` = store but revalidate; `no-store` = don't store; `private` prevents shared-cache leak of personalized content. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control and https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- `stale-while-revalidate` lets cache serve stale while revalidating in background, hiding revalidation latency. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Heuristic caching exists when no `Cache-Control` given — avoid by always setting explicit header. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- Cache API entries do NOT expire unless deleted; must version + purge; does not honor HTTP headers. (Service worker context, not Worker static-assets.) Source: https://developer.mozilla.org/en-US/docs/Web/API/Cache

### Critical rendering path

- CSS is render-blocking; DOM nodes increase layout time; batch updates, avoid animating box-model props; minimize critical resources, defer non-critical, prioritize critical asset order. Source: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path

### Cloudflare Workers specifics

- NOT verified from a Cloudflare primary doc in this pass (no Workers static-assets / `Cache-Control` behavior doc fetched). Per assignment pacing, no Workers-specific claim is made. Treat §4 HTTP caching as platform-generic until a Cloudflare doc verifies Workers asset headers.

---

## 5. FACTS — Admin coherence (Shopify / Stripe / Linear)

- Attempted first-party fetch: `https://shopify.engineering/building-react-applications` → 404. No Stripe/Linear first-party design/engineering post fetched in this pass.
- Therefore: NO verified claim is made about Shopify Admin, Stripe Dashboard, or Linear patterns. Any coherence recommendation below is synthesis from React Router / React / web.dev sources only, not attributed to those products.

---

## 6. FACTS — Data-layer fluidity

### In-flight dedup / caching pitfalls

- React Router client-data guide shows module-level cache pattern (`cache.set/get/delete`, `isInitialRequest` flag) with `clientLoader.hydrate = true` priming and `clientAction` invalidation. Source: https://reactrouter.com/how-to/client-data
- That pattern as printed is single-user/browser oriented; the guide does NOT discuss SSR request isolation. No primary source fetched verifies module-level cache behavior across concurrent SSR requests in Workers. Do not assume safe sharing — treat as unverified risk (see Recommendations).
- Browser `Cache` API: no expiry, manual version/purge needed. Source: https://developer.mozilla.org/en-US/docs/Web/API/Cache
- HTTP shared vs private cache: personalized content must use `private` or it can leak via shared cache. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching

### SWR expectations

- HTTP `stale-while-revalidate` semantics defined as above. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- React `useDeferredValue` + Suspense "show stale while fresh loads" is the React-native SWR-like UI pattern. Source: https://react.dev/reference/react/useDeferredValue
- No source fetched defines a client-side SWR library contract (React Query/SWR). No such claim made.

---

## RECOMMENDATIONS (synthesis — not direct source claims)

1. **Keep clientLoader, fix hydration.** Use BFF pattern (server loader initial, clientLoader after) where possible; only set `clientLoader.hydrate = true` when full client data needed before first render, always with skeleton `HydrateFallback`. Avoid hydrating with mismatched loader/clientLoader data.
2. **Skeletons over global spinner for admin lists.** Per Suspense doc, fallback = placeholder preview; local `HydrateFallback`/skeleton per route beats global spinner from `useNavigation`. Keep `useNavigation` only as subtle top progress bar, not full-screen block.
3. **Local pending + optimistic for mutations.** Order approve/reject, product publish, tag save, settings save: fetcher or `useActionState` + `useOptimistic` (list reducer with `pending` flag per row). Button shows pending text/disabled; row dims or line-through optimistically (React docs example pattern). Revert on error via thrown → ErrorBoundary or returned error state.
4. **Trim revalidation.** After a mutation, keep defaults but skip re-running expensive loaders (`shouldRevalidate` conditional on `formAction`, or `defaultShouldRevalidate={false}` on analytics-type submissions). Don't blanket `return false`.
5. **Prefetch admin nav.** `NavLink` in toolbar to likely next pages (orders → order detail); rely on route code-splitting + browser prefetch of chunk on hover/viewport if available; verify chunk loading rather than assuming `prefetch` API exists in RR8 (no such API verified).
6. **Fonts.** `font-display: swap` + `size-adjust`/`ascent-override` fallback metrics + preload woff2 with crossorigin; audit CLS on admin table render.
7. **INP budget.** Keep admin tables' DOM small (no giant inline HTML dumps), break long render loops, defer non-render work (word counts, exports) after next paint; target ≤200ms per web.dev threshold.
8. **Static assets.** Hashed JS/CSS: long `max-age, immutable`; HTML `no-cache, private` for admin; never cache personalized admin JSON in shared cache. Set via route `headers()` where RR supports it; verify Workers serves it (unverified, see §4).
9. **Preconnect to API host.** Single `<link rel="preconnect">` to API origin (session cookie host); don't preconnect many origins.
10. **Module cache caution.** Any clientLoader memory cache must be keyed per user/resource and invalidated in `clientAction` after mutations; never share across users; don't port the docs' simple `isInitialRequest` flag to SSR loaders without request-scoped storage (unverified in Workers).
11. **Activity for tabs/panels.** Product editor tabs, settings sections: `<Activity>` to keep draft/DOM state when switching, pre-render likely next tab. Pause media/iframes on hide if present.

---

## Prioritized checklist — small single-admin desk

| # | Item | Applies to | Source |
|---|------|-----------|--------|
| 1 | Skeleton `HydrateFallback` per admin route; remove global blocking spinner | Overview, orders, products, tags, settings | https://reactrouter.com/start/framework/route-module , https://react.dev/reference/react/Suspense |
| 2 | `useNavigation` only for thin progress bar; `NavLink isPending` on sidebar links | All admin nav | https://reactrouter.com/start/framework/pending-ui |
| 3 | Optimistic row status via `useOptimistic` reducer (approved/rejected/published) | Orders queue, product editor | https://react.dev/reference/react/useOptimistic |
| 4 | Fetcher forms for inline mutations (no full navigation) | Orders detail, tags row edit | https://reactrouter.com/start/framework/pending-ui |
| 5 | `useActionState` for settings/products save with inline error state, throw only for unknown errors | Settings, product editor | https://react.dev/reference/react/useActionState |
| 6 | Conditional `shouldRevalidate` by `formAction`; call-site `defaultShouldRevalidate={false}` for non-data posts | All admin mutations | https://reactrouter.com/how-to/optimize-revalidation |
| 7 | `font-display: swap` + fallback metrics `size-adjust`; preload woff2 `crossorigin` | Global layout | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display , https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/size-adjust |
| 8 | Hashed assets `Cache-Control: public, max-age=31536000, immutable`; admin HTML `no-cache, private` | Workers assets + admin routes | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control |
| 9 | Single `preconnect` to API host; `modulepreload` only for critical admin chunk | Root head | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect , https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading |
| 10 | Keep orders/products tables DOM lean; `content-visibility` off-screen rows; yield long renders | Orders, products lists | https://web.dev/articles/optimize-inp |
| 11 | `useDeferredValue` for search/filter inputs (stale list dims, no fallback flash) | Orders filter, product search | https://react.dev/reference/react/useDeferredValue |
| 12 | `<Activity>` for editor tabs / settings sections to preserve drafts | Product editor, settings | https://react.dev/reference/react/Activity |
| 13 | Key + invalidate clientLoader cache in `clientAction`; never module-share personalized data | All clientLoader routes | https://reactrouter.com/how-to/client-data |
| 14 | Verify INP ≤200ms field/lab for click-heavy flows; measure, don't guess | Orders actions, editor save | https://web.dev/articles/inp |

## Gaps / not verified

- Shopify Admin / Stripe / Linear first-party patterns: not verified (Shopify URL 404, others not fetched). No claims made.
- Cloudflare Workers static-asset `Cache-Control` / immutable behavior: not verified from Cloudflare doc in this pass.
- RR8 link prefetch API: no `prefetch` prop/API verified in fetched docs; do not assume it exists.
- Module-level cache safety across SSR requests on Workers: not verified; flag as risk, not fact.
