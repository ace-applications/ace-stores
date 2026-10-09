# ACE Stores — Admin frontend handoff

Build the admin surface into `ace-stores` (seller operations: order review, product/file/tag administration, store settings). Backend is **done** — this is frontend-only work, the same way the storefront was integrated.

Primary backend source of truth: `ace-backend/docs/frontend-handoff.md` (+ `ace-backend/src/routes/admin.ts`, `src/auth.ts`, `src/prisma/contract.prisma`). When code and any doc disagree, **code wins** — then fix the doc, never code around the backend. If backend behavior looks wrong, log it to `ace-backend/docs/backend-fixes.md`; do not patch around it.

## Repos, run, env

| Repo | Path | Command | Port |
|---|---|---|---|
| Backend | `…\ace-backend` | `bun run dev` | 8787 |
| Frontend (this repo) | `…\ace-stores` | `bun run dev` | 5173 |

- API base: `.env` → `VITE_API_BASE_URL=http://localhost:8787`. Backend CORS allows **only** `http://localhost:5173` (`ALLOWED_ORIGINS` in backend `.dev.vars`) — run the frontend on that port.
- Every app fetch must send the session cookie: use the `api()` wrapper in `app/lib/api.ts` (it sets `credentials: "include"`). Never fetch the API raw for session-routes.
- Typecheck: `bun run typecheck` (runs `react-router typegen` + `tsc`). Required before "done". Typegen regenerates route types in `app/routes/+types/`.
- Test data already in the local DB: 3 seeded products, one `pending_payment` order (id 1) — perfect for exercising the admin queue. Test user `persist-test@example.com` / `Passw0rd!x`.

## Admin auth gate

- Role check: `session.user.role === "admin"`. Server enforces it on every `/admin/*` route (`401` no session, `403` not admin) — the frontend gate is UX only.
- TS may not type `role` on `session.user` (no shared types package) — cast at the gate if needed:
  ```ts
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  ```
- Roles are assigned **only at sign-up**, when the email is in backend `ADMIN_EMAILS` env. To make an existing user admin without a fresh sign-up: admin can call `POST /api/auth/admin/set-role` (better-auth `admin()` plugin, 200 with an admin session, 401 without). Editing backend `.dev.vars` requires a backend restart.
- Auth is rate-limited (DB-backed, per IP): repeated bad sign-ins → `429`. Show the error, don't retry-storm.

## Backend contract (admin-relevant surface)

All paths relative to `API_BASE`. Prices are **integer EGP** (no piastres). **No pagination anywhere** — list endpoints return full arrays.

### Admin endpoints (session + `role === "admin"`)

| Method + path | Request | Response |
|---|---|---|
| `GET /admin/orders?status=pending_payment` | query filter optional | `AdminOrder[]` newest first |
| `POST /admin/orders/:id/approve` | — | `{ id, status }` \| 409 not `pending_payment` |
| `POST /admin/orders/:id/reject` | — | same, from `pending_payment` |
| `POST /admin/orders/:id/revoke` | — | same, from `paid` (kills downloads) |
| `POST /admin/products` | `{ title, price, description?, previewUrl?, thumbnailKey? }` | `201 product` |
| `PATCH /admin/products/:id` | any subset of the above | `product` \| 404 |
| `DELETE /admin/products/:id` | — | `{ ok }` \| 409 if order history exists |
| `POST /admin/presign` | `{ kind: "material" \| "thumbnail" \| "preview", productId?, fileName?, contentType }` | `{ key, uploadUrl, contentType }` |
| `POST /admin/products/:id/files` | `{ name, storageKey, sizeBytes? }` | `201 file` — `storageKey` must start `materials/<id>/` |
| `DELETE /admin/files/:fileId` | — | `{ ok }` (R2 object left behind — known backend debt) |
| `POST /admin/tags` | `{ name }` | `201 tag` \| 409 duplicate |
| `DELETE /admin/tags/:id` | — | `{ ok }` \| 409 tag in use |
| `PUT /admin/products/:id/tags` | `{ tagIds: number[] }` | `{ productId, tagIds }` — full replace, `[]` clears |
| `GET /admin/settings` | — | `Record<string, string>` |
| `PUT /admin/settings` | `{ entries: Record<string, string> }` | full map after write |

### Shapes

```ts
type AdminOrder = OrderShape & {
  user: { id: string; email: string; name: string };
  screenshotUrl: string;   // presigned GET — EXPIRES (~300 s), refetch
};

type OrderShape = {
  id: number;
  userId?: string;
  status: "pending_payment" | "paid" | "rejected" | "expired" | "revoked";
  totalPrice: number;
  paymentReference: string | null;
  screenshotKey: string;
  createdAt: string;
  updatedAt?: string;
  items: { id: number; orderId: number; productId: number; title: string; price: number }[];
};

type ProductShape = {
  id: number;
  title: string;
  description: string | null;
  price: number;
  previewUrl: string | null;
  thumbnailUrl: string | null;   // presigned GET — EXPIRES, refetch per load
  files: { id: number; name: string; sizeBytes: number | null }[];
  tags: { id: number; name: string }[];
};
```

### Validation limits (mirror in the UI; server enforces)

- `POST /admin/products` — `title` 1–200; `price` int 0–1,000,000; `description` ≤ 5000; `previewUrl` must be a valid URL.
- `PATCH /admin/products/:id` — empty body → `400`.
- `PUT /admin/products/:id/tags` — unknown tag id → `400`.
- `PUT /admin/settings` — keys 1–100 chars, values ≤ 10,000 chars.
- Path ids (`:id`, `:fileId`) must be positive ints → `400` otherwise. Missing row → `404`.
- Allowed upload `contentType`s: `image/png`, `image/jpeg`, `image/webp`, `application/zip`, `application/x-zip-compressed`, `audio/mpeg`, `audio/wav`. `kind: "material"` requires `productId`.

### Error handling contract

Branch on **status code**; message is best-effort. Bodies:

- Normal errors: `{ "error": string }` (400/401/403/404/409).
- Zod failures: `{ "success": false, "error": { "name": "ZodError", "message": "…" } }` — pre-validate to avoid showing these raw.
- `401` = signed out, `403` = not admin / not entitled, `409` = illegal state transition or duplicate, `429` = auth-rate-limited.

### Upload flow (admin material/thumbnail/preview)

1. `POST /admin/presign` → `{ key, uploadUrl, contentType }`.
2. `fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file })` — direct to R2, **no credentials**, Content-Type must match exactly (it's signed).
3. **After** the PUT succeeds, register metadata: `POST /admin/products/:id/files { name, storageKey: key, sizeBytes }` or `PATCH /admin/products/:id { thumbnailKey: key }`.

Presigned TTLs: GET (downloads, `thumbnailUrl`, `screenshotUrl`) = **300 s**; PUT (uploads) = **900 s**. **Never cache a presigned URL — always refetch.**

### Order state machine

```
pending_payment → paid | rejected   (admin)
pending_payment → expired           (automatic, 7 days, hourly cron)
paid → revoked                      (admin, kills downloads)
```

Download entitlement = any of the buyer's orders containing the product is `paid`. Revocation is order-level. Don't build buyer-cancel or refunds — not in scope.

### Known backend gaps (plan around them)

- **R2 creds are EMPTY** in backend `.dev.vars` → presigned URLs sign against a dead host (`https://.r2.…`). Every real upload AND every presigned GET (`screenshotUrl`, `thumbnailUrl`) fails at the R2 end until creds are filled. Build the flows fully; verify metadata queries and logic via curl; real media round-trips (upload, screenshot display) stay dead until the env is fixed. Surface upload failures with an honest message, not a fake success.
- No product soft-delete: `DELETE /admin/products/:id` → `409` once order history exists. Handle the 409 as text in the UI (confirm dialog naming the consequence).
- Google login unwired — email/password only; keep any Google button behind `VITE_ENABLE_GOOGLE_LOGIN`.

## Frontend architecture (what this repo already established)

### Routes

`app/routes.ts` is the manual route config. Each route file exports `loader`, `meta`, and the default component (React Router 8 framework mode — loaders run SSR + client side). Pattern:

```ts
// app/routes/admin.tsx
import type { Route } from "./+types/admin";          // generated by typegen
import { useLoaderData, Link, redirect } from "react-router";
import { useStore } from "../lib/store";               // if you need cart/orders
import { authClient, api } from "../lib/api";

export async function loader() { /* SSR-safe fetches here */ }
export function meta({}: Route.MetaArgs) { return [{ title: "…" }]; }
export default function Admin() { /* markup */ }
```

Shell convention (matches every route): `<div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">…`.

### API layer — extend `app/lib/api.ts`

Mirror types from this doc (no shared types package). Follow the existing function style — typed, throws server message via `api()`:

```ts
export interface AdminOrder extends OrderShape {
  user: { id: string; email: string; name: string };
  screenshotUrl: string;
}

export function adminOrders(status?: string) {
  const q = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  return api<AdminOrder[]>(`/admin/orders${q}`);
}

export function adminApproveOrder(id: number) {
  return api<{ id: number; status: string }>(`/admin/orders/${id}/approve`, { method: "POST" });
}

export function adminPresign(body: { kind: "material" | "thumbnail" | "preview"; productId?: number; fileName?: string; contentType: string }) {
  return api<{ key: string; uploadUrl: string; contentType: string }>("/admin/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
```

`api<T>` already sends cookies, parses JSON, and throws `Error` with the server's message for non-OK — reuse it; don't duplicate fetch.

### Session + role

`authClient.useSession()` (already used in `Nav.tsx` and `store.tsx`). Gate admin routes on `isAdmin` (cast above). Decisions:

- **Signed out** → reuse the sign-in flow with `?next=/admin` (existing `/sign-in` route returns to `next`).
- **Signed in, not admin** → honest panel: "this desk is for store staff" + back-to-store link. Never fake-access via client-side guard alone — the server 403s anyway; the gate is UX.
- Consider one shared `AdminGate` wrapper component rather than per-route guards.

### Navigation

`app/components/Nav.tsx` — add an admin link rendered only when `isAdmin` (e.g. `Desk` NavLink beside Library) using the same `LINK` class. Don't touch the announcement strip.

### Existing UI pieces to reuse

| Piece | Where | Use for |
|---|---|---|
| `.btn` / `.btn-primary` / `.btn-accent` / `.btn-ghost` | `app/app.css` | all actions. **Primary commerce = white-fill**; violet accent = live/active/CTA-support; ghost = secondary |
| `.chip` + `data-on="true"` | app.css | status filters (the storefront filter-bar pattern: family/formats/sort) |
| `.field` | app.css | inputs, select-safe styling (48px min-height on coarse pointers) |
| `.label-caps` | app.css | section labels, spec keys, readouts (11.5px caps) |
| `.panel` / `.panel-raised` | app.css | cards, dialogs, sticky surfaces |
| `.tnum` | app.css utility | prices, counts, order ids (tabular numerals) |
| `CoverArt` | `components/CoverArt.tsx` | product rows (thumbnail or generated art fallback) |
| `PackCard` | `components/PackCard.tsx` | product list/grid |
| `formatPrice` | `data/products.ts` | whole-EGP money display |
| `Shell` wrapper pattern | every route | page frame |

## Style choices & tokens — "The Midnight Label"

`DESIGN.md` + `PRODUCT.md` at repo root are the world. `app/app.css` `@theme` block is the single token source — use Tailwind utilities (`bg-ground`, `text-ink`, `border-hairline`, `text-dim`, `text-faint`, `text-accent`, `text-danger`), never hard-coded hex in components.

### Tokens

| Token | Hex | Role |
|---|---|---|
| `ground` | `#0b0c10` | page field, always |
| `panel` | `#131519` | cards, resting surfaces |
| `panel2` | `#1a1d23` | raised/sticky surfaces |
| `hairline` | `#262a32` | borders, dividers |
| `hairline-bright` | `#343945` | hover-brightened borders |
| `ink` | `#f5f5f7` | primary text; primary button fill |
| `dim` | `#9b9ba3` | body copy secondary |
| `faint` | `#808089` | caps labels, metadata |
| `accent` | `#8b5cf6` | the ONE accent — live/active/chosen |
| `accent-soft` | `#a78bfa` | accent hover lift only |
| `danger` | `#ff5470` | destructive actions, errors |

### Type ramp (Inter / Inter Tight — self-hosted in `assets/Fonts/`)

| Role | Size | Weight / tracking | Use |
|---|---|---|---|
| Display | `clamp(2.8rem, 6vw, 5.4rem)` | 800, −0.03em, uppercase | page claims only |
| Title | 18–24px | 700–800, −0.02em | headings, order headers |
| Body | 15px, lh 1.6 | 400, 65–75ch | paragraphs |
| Label | 11.5px | 600, +0.1em, uppercase | spec keys, readouts |
| Metadata | 12.5–14px (canon 13.5) | 600, +0.05em | helper text, subtle copy |
| Button | 12.5px | 700, +0.06em, uppercase | `.btn` |
| Micro | 10.5px | 700, +0.08em, uppercase | tiny badges only |

Radii: cards/panels **16px**, controls/fields **8px**, chips/pills **999px**. Spacing: sections 64px, cards on 16px grid, 16px bars in filter bars.

### Rules (enforced by the detector — keep green)

- **One-Accent Rule.** Violet marks what is live, active, or chosen — never decoration, never a second color voice. Commerce-primary actions are white-fill.
- **Cover-Carries-Color Rule.** Chrome stays neutral; product color lives in cover art.
- **Honest-Playback Rule.** No fake players, reviews, or payment. Placeholders and pending states stay labeled (e.g. `pending payment`, "unlocks when paid").
- Don't add glow, neon, glass, gradient text, or a second accent.
- Don't use Unicode glyphs/emoji as icons — inline 1.2px-stroke SVG (9–12px).
- Tabular numerals for prices, counts, ids (`tnum`).
- Logical CSS properties only — the Arabic phase is coming (no hard-coded `left`/`right`).
- `prefers-reduced-motion` + coarse-pointer hit areas are already global in `app.css` — new UI inherits them. Don't add motion beyond the one authored language (`.rise-in` entrance, `.card-lift` hover).

## Scope sketch (what "admin frontend" means here)

1. **Orders desk** (`/admin`) — payments are the operational job. Queue filtered by status (chips, `?status=`), newest first. Row: order id + date, buyer email + name, items (`title × price`), `totalPrice`, `paymentReference` when present, screenshot (render `screenshotUrl` — refetch per load, it expires), status. Actions by state: `approve` / `reject` (from `pending_payment`), `revoke` (from `paid`). Buttons name the action + consequence (confirm revoke: it kills downloads).
2. **Products** (`/admin/products`) — list (reuse `PackCard` or a leaner table), create, edit (title/price/description), thumbnail via presign→PUT→`PATCH thumbnailKey`, `previewUrl` as external URL, files per product (presign `material` + `POST …/files`, delete via `DELETE /admin/files/:fileId`), tags (create, delete, assign tagIds).
3. **Settings** (`/admin/settings`) — `payment_instructions` textarea (the key checkout needs) → `PUT /admin/settings { entries }`.

Ship order: gate → orders desk → products → settings. Each is verifiable independently against the live API.

## Verification loop for this environment

- No browser automation here — verify **SSR 200 + curl** against 8787 for each flow (sign in with the test user via cookie jar → `GET /admin/orders` → transitions), mirroring how the storefront slice was proven.
- `bun run typecheck` before calling done.
- Run `.agents/skills/impeccable/scripts/impeccable detect` over new/changed files — currently **0 findings**; keep it there.
- If the API misbehaves, confirm against `ace-backend/src/routes/admin.ts` before writing a doc claim; report real bugs to `backend-fixes.md`.