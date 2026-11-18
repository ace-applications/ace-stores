# Launch readiness — ace-backend + ace-stores

Read-only audit, 2026-11-18, against `ace-backend` @ `d16f724` and `ace-stores` @ `9c6754b` (both trees clean).

**Verdict:** the code is in good shape — 111 backend tests pass, both repos typecheck/lint clean, the order state machine, entitlement checks and admin CRUD are real. What is missing is almost entirely operational: production holds three placeholder products whose files do not exist, checkout is switched off by an empty settings table, the deployed backend is one feature behind the repo, and there is no email path at all.
Nothing in production has ever been bought — 0 orders, 0 users with a purchase — so no money has been taken yet.
Ship blocker count: 6. Estimated work to first real sale: a few hours of setup plus real product files.

---

## Blockers

Ordered by severity. Each: what is missing, evidence, why it blocks, smallest fix.

### 1. The catalog sells files that do not exist (highest severity)

- What is missing: the three listed packs have no deliverable file in the storage bucket. `ProductFile.sizeBytes` values are round mebibyte placeholders (734003200, 268435456, 419430400) that no upload produced, and the objects at their `storageKey`s are absent.
- Evidence: prod DB rows `ProductFile` 1–4 (`whipcut-pack.zip`, `whipcut-preview.mp4`, `night-frequencies.wav`, `glitch-burns.zip`) → S3 `Range: bytes=0-0` with the backend's own signing → **404 NoSuchKey** for all four. Products 1–3 also have `thumbnailKey`/`previewUrl` null, so `GET /products` returns `thumbnailUrl: null` for all three. The rows were copied from the local dev database by `ace-backend/scripts/seed-prod.mjs:11-33`, which copies metadata only and never touches object storage.
- Why it blocks: a buyer transfers 450 EGP, admin approves, the library renders download buttons (`ace-stores/app/components/OrderLine.tsx:84-111`) and every one fails at the presigned GET. That is a paid order with no delivery and no refund path — the worst possible launch failure.
- Smallest fix: unpublish or delete products 1–3 and 7 now, then upload the real archive through `/admin/products` (presign → `PUT` → register file) and re-check the object with a head request before publishing. Do not republish the seed rows.

### 2. Checkout is closed in production

- What is missing: the `Setting` table is empty, so `payment_instructions` is unset and the checkout page refuses to take a payment.
- Evidence: prod DB `SELECT key FROM "Setting"` → 0 rows; live `GET https://ace-stores-api.seifsheikhelarab.workers.dev/settings` → `{}`; the checkout route renders the "Checkout isn't open yet" panel when the key is falsy (`ace-stores/app/routes/checkout.tsx:22,284-299`).
- Why it blocks: no visitor can place a paid order at all. The storefront looks open (catalog, cart, sign-in all work) and dead-ends at the last step.
- Smallest fix: fill `payment_instructions` (and `support_email`, `policies_*`) at `/admin/settings`; the field exists and saves (`ace-stores/app/routes/admin.settings.tsx:39-47,77-91`). Then re-fetch `/settings` and confirm the checkout form appears.

### 3. A junk draft is live and first in the catalog

- What is missing: product 7 survives as `published: true`, title `New Product`, description `hello test`, price 20 EGP, with an unrelated JPG registered as its sole file.
- Evidence: prod DB `Product` id 7; live `GET /products` returns it first (ordered by `createdAt desc`, `ace-backend/src/routes/products.ts:19`) and its thumbnail presigns successfully (206) while products 1–3 return null thumbnails.
- Why it blocks: it is the only product on the live storefront whose cover art actually renders, so it reads as the store's real offering. It also makes the catalog lie about price and content.
- Smallest fix: `PATCH /admin/products/7 {published: false}` (or delete) in the desk UI.

### 4. The deployed backend is older than the repo, so licensing and free orders are not live

- What is missing: every `/v1/*` licensing route and the 0-EGP auto-paid path exist only on disk.
- Evidence: live `GET /v1/auth/public-key` → **404** and `GET /v1/licenses` → **404**, while `GET /media/preview?key=previews/…` → **302** (that route landed in `7acae46`, one commit before licensing `763da82`). Repo HEAD is `d16f724`. The licensing surface is complete in `ace-backend/src/routes/licensing.ts:230-811`; the free-order branch is `ace-backend/src/routes/orders.ts:68-93`; prod DB already has `DesktopApp`/`License`/`Device`/`Activation`/`DesktopSession`/`AuthCode`/`AuditLog` and a nullable `Order.screenshotKey`.
- Why it blocks: any licensing product sold today would take money and grant nothing, and the free 0-EGP product (which requires no proof of payment) cannot be ordered through the deployed API. Also keeps `POST /api/auth/admin/set-role` (mounted, returns 400 on bad body) as the only role tool while admin licensing pages stay dead.
- Smallest fix: deploy the backend from `d16f724` (`cd ace-backend && bunx wrangler deploy`), with `ACE_LICENSE_PRIVATE_KEY`/`ACE_LICENSE_PUBLIC_KEY` set as worker secrets first, then confirm `/v1/auth/public-key` returns 200 and the public key matches the Leveler build. Note `bun run deploy` here is `prisma deploy module.ts` (`ace-backend/package.json:10,16`) — it is not the command that publishes this Worker.

### 5. Auth cookies are third-party in production, so sign-in breaks on Safari, Firefox ETP and Brave

- What is missing: the frontend (`https://ace.seifsheikhelarab.workers.dev`) and the API (`https://ace-stores-api.seifsheikhelarab.workers.dev`) are two different `*.workers.dev` sites. The session cookie is therefore cross-site and must be `SameSite=None; Secure` to ride the credentialed fetch — which those browsers block.
- Evidence: `ace-backend/src/auth.ts:45-58` sets `sameSite: "none", secure: true` for any non-localhost `BETTER_AUTH_URL` and the comment states the limitation ("Safari/ITP still blocks this — custom domains on one registrable domain are the permanent fix"). Hosts are fixed in `ace-backend/wrangler.jsonc:11-12` and `ace-stores/.env.production`.
- Why it blocks: a share of real buyers cannot sign in, so cannot check out or reach their library, and nothing in the UI explains why. Every order needs a session (`ace-backend/src/routes/orders.ts:31,49`).
- Smallest fix: one registrable domain — e.g. `ace.example.com` (frontend) + `api.ace.example.com` (backend) — and update `BETTER_AUTH_URL` / `ALLOWED_ORIGINS` / `VITE_API_BASE_URL`. A same-origin proxy through the frontend Worker also works but is a code change; the domain is the cheap fix.

### 6. There is no email out at all

- What is missing: no mail provider, no sender, no templates. No email verification, no password reset, no order receipt, no "your transfer was approved" notice.
- Evidence: zero matches for `resend|sendEmail|nodemailer|smtp|mailgun|postmark` under `ace-backend/src` and `ace-stores/app`; `ace-backend/src/auth.ts:23-73` configures only `emailAndPassword` and rate limiting; the only "receipt" is a client-side JSON manifest download (`ace-stores/app/lib/receipt.ts`, `OrderLine.tsx:51-59`).
- Why it blocks (lowest of the six, but real): a buyer who forgets their password is locked out permanently — the admin has no reset UI either, only DB access. And with no confirmation email, the "we approve by hand, usually the same day" promise at `checkout.tsx:334-336` has no delivery channel, so every approval needs the buyer to come back and refresh.
- Smallest fix: Cloudflare Email Routing/Email Workers or any SMTP-free API provider for two templates only (password reset, order approved) — no marketing mail.

---

## Ship-after (works, but will hurt)

- **No licensing frontend at all.** `/authorize` 404s live; no account devices/licenses page; no `/admin/desktop-apps`, `/admin/licenses`, `/admin/audit` routes (`ace-stores/app/routes.ts:3-35`, `admin.layout.tsx:13-19`); `ProductEditor` has no `appId`/`grantsTier` fields; the library has no "download the app" affordance (`library.tsx`, `OrderLine.tsx` only link files). The backend surface is ready and tested — this is frontend-only work.
- **Free license purchase is impossible in the UI.** Checkout demands a screenshot before submitting regardless of total (`checkout.tsx:216`), while the API explicitly allows no proof when the total is 0 (`orders.ts:68-72`). A 0-EGP product shows a required file input (`checkout.tsx:321-333`).
- **Revoking an order does not revoke the license it granted.** `transitionOrder` only calls `grantLicensesForOrder` on the paid transition (`ace-backend/src/routes/admin.ts:448-451`); nothing deactivates `License`/`Device` rows on revoke. Revocation today only kills downloads.
- **No audit trail for order transitions.** `recordAudit` is wired into licensing actions only (`admin.ts:6`, `licensing/shared.ts:58`); approve/reject/revoke change money state with no actor log.
- **No refund path.** No refund endpoint, no payment gateway anywhere; revoke is the only reversal and it leaves the transfer in the buyer's bank.
- **Type drift between the two repos** (survives because nothing exercises it): `OrderShape.screenshotKey: string` vs nullable (`ace-stores/app/lib/api.ts:56` vs `contract.prisma:147`); `AdminOrder.screenshotUrl: string` vs `null` (`admin-api.ts:9` vs `admin.ts:91`); `adminAddFile` accepts `sizeBytes: null` while the schema is `.optional()` (`admin-api.ts:88` vs `admin.ts:42`).
- **Approve has no confirmation**, while reject and revoke do (`ace-stores/app/routes/admin.orders.$id.tsx:163-168`). Approve is the action that grants licenses and unlocks downloads — the one that most needs a confirm.
- **Admin order list is all-or-nothing on storage.** `GET /admin/orders` signs every screenshot without a try/catch (`admin.ts:86-94`); one signing failure 500s the whole list instead of degrading to "no screenshot".
- **`POST /orders` does not check `published`.** A draft product id can be ordered through the API (`orders.ts:59-61` only checks existence), while `/products/:id` correctly 404s drafts (`products.ts:81`).
- **No admin users screen and no `set-role` UI.** Roles come only from `ADMIN_EMAILS` at sign-up (`auth.ts:60-71`); promoting or demoting afterwards is a curl against `/api/auth/admin/set-role`. There is also no `/admin/users` listing at all.
- **Legal pages are empty by design.** `/policies` shows whatever `policies_terms`/`policies_privacy`/`policies_refund` hold, and all three are unset; the settings UI itself says "write it before launch" (`admin.settings.tsx:44-46`). Taking money without terms/refund policy is a jurisdiction question, not a code one.
- **Stale ops docs and scripts.** `ace-backend/README.md:3-21` still describes Prisma Composer/Prisma Compute and `bun run deploy`; `ace-backend/package.json:16` maps deploy to Composer. `ace-stores/Dockerfile:4,7,9,18` runs `npm ci` with no `package-lock.json` in the repo, so it cannot build. `ace-stores/README.md` is template leftover.
- **No staging environment and no rollback note.** Only prod and localhost; the local `.env` points at the prod database, so `bun run migrate` from a plain shell hits production.

---

## Verified working

Read in code, and where marked "ran", exercised.

- **Order state machine.** Create with server-computed `totalPrice` (`orders.ts:66-67`), `pending_payment` → `paid|rejected` and `paid` → `revoked` enforced by conditional updates that 409 on a wrong source state (`admin.ts:430-454`). Hourly cron expires stale pending orders using the admin-configurable window (`jobs/expire-orders.ts:9-23`, `wrangler.jsonc:9`).
- **Screenshot upload ordering.** Presign first, upload straight to storage, then create the order; a key must live under `screenshots/<userId>/` (`orders.ts:31-55`), and the frontend follows the same order (`checkout.tsx:221-241`).
- **Entitlement.** Downloads require a paid, non-revoked order containing the file's product (`products.ts:110-127`); the UI hides buttons unless the order is `paid` (`OrderLine.tsx:70-75`). Presigned download URL is 300 s, minted per click.
- **Storage degradation.** Missing bucket config becomes 503 with a message instead of a crash (`objectStore.ts`), catalog thumbnails degrade to null rather than failing the list (`products.ts:31-33`).
- **Admin CRUD.** Orders (list/detail/approve/reject/revoke), products, presign + file register/delete, tags, settings, full JSON export (`admin.ts:73-428`), all behind `.use("/admin/*", requireAdmin)` (`admin.ts:74`).
- **Auth.** Sign-up/in, DB-backed rate limits, `ADMIN_EMAILS` role at sign-up, Google optional (`auth.ts:19-73`); prod admin account exists (`seifusama@gmail.com`, role `admin`); account self-delete with the anonymize-vs-delete rule (`account.ts:18-44`).
- **Settings-driven UX.** Announcement strip, checkout gate, policy pages and the cron's expiry window all read the same `Setting` map (`settings.ts:8-12`).
- **Zero-EGP auto-paid path and licensing grant** in code, covered by tests (`orders.ts:68-93`, `licensing/shared.ts:33-56`).
- **Builds and checks (ran).** Backend `bun run check`, `bun run lint`, `bun run test` → 111/111 passing across 8 files (Node pool, cloned `ace_test`). Frontend `bun run typecheck`, `bun run lint`, `bun run build` → clean.
- **Production infrastructure (ran).** Prod DB migrated to HEAD (licensing tables present, `Order.screenshotKey` nullable, `updatedAt` non-null); prod B2 credentials work for reads (presigned thumbnail GET → 200); `/` `/products` `/admin` `/catalog` `/checkout` serve 200; live bundle hash matches a local build of `9c6754b`; `/media/preview` redirects correctly; service binding `API` → `ace-stores-api` in place (`ace-stores/wrangler.jsonc:14-16`).
- **No fake success states.** Zero `TODO`/`FIXME`/`.skip`/`it.only` in either repo's source or tests; the "checkout closed" and "downloads unlock when we confirm" panels are honest.

---

## Admin API vs admin UI matrix

| Capability | Endpoint | UI | State |
|---|---|---|---|
| Order list + status filter | `GET /admin/orders` | `/admin/orders` | Working |
| Order detail + screenshot | `GET /admin/orders/:id` | `/admin/orders/:id` | Working (500s the list if signing throws) |
| Approve / Reject / Revoke | `POST /admin/orders/:id/{approve,reject,revoke}` | same page | Working; approve has no confirm, revoke leaves licenses active |
| Products list/create/update/delete | `/admin/products*` | `/admin/products*` | Working |
| Presign upload / register file / delete file | `/admin/presign`, `/admin/products/:id/files`, `/admin/files/:fileId` | `/admin/products/:id` | Working; no `appId`/`grantsTier` fields |
| Tags CRUD | `/admin/tags*` | `/admin/tags` | Working |
| Settings read/write | `GET|PUT /admin/settings` | `/admin/settings` | Working; empty in prod |
| Full export | `GET /admin/export` | `/admin/settings` | Working |
| Desktop apps | `GET|POST /admin/desktop-apps`, `PATCH /admin/desktop-apps/:id` | — | **No UI, no nav** |
| Licenses | `GET|POST /admin/licenses`, `PATCH /admin/licenses/:id/status` | — | **No UI, no nav** |
| Audit log | `GET /admin/audit` | — | **No UI, no nav** |
| Role change | `POST /api/auth/admin/set-role` (Better Auth admin plugin) | — | **No UI, no user list** |
| Account deletion (buyer) | `POST /account/delete` | `/account` | Working |

---

## Config & ops checklist

**In place**
- Both Workers deployed and serving; frontend deploy path is correct (`ace-stores/package.json:13`, `wrangler.jsonc:1-5` warns about the root config).
- Prod vars for the API Worker: `BETTER_AUTH_URL`, `ALLOWED_ORIGINS`, bucket name/region/endpoint, `ADMIN_EMAILS` (`ace-backend/wrangler.jsonc:10-17`).
- Prod DB schema at repo HEAD, 7 migrations under `ace-backend/migrations/app/`.
- Prod object-storage read credentials valid (proven by live presigned thumbnail 200).
- Hourly cron trigger deployed.
- Frontend `.env.production` public URLs committed and baked into the live build.
- Backend admin account exists and matches `ADMIN_EMAILS`.
- `observability` enabled on both Workers.

**Missing or unverified**
- Worker secrets could not be listed (`wrangler secret list` needs `CLOUDFLARE_API_TOKEN` in this shell) — presence of `DATABASE_URL`, `BETTER_AUTH_SECRET`, `B2_ACCESS_KEY_ID/SECRET`, `ACE_LICENSE_PRIVATE_KEY/PUBLIC_KEY` is inferred, not confirmed.
- Licensing is not deployed at all (`/v1/*` 404), so its secrets are moot until blocker 4 is fixed.
- No email provider configured (blocker 6).
- `Setting` empty in production (blocker 2).
- Local `.dev.vars` B2 credentials are invalid (`SignatureDoesNotMatch`), so `wrangler dev` uploads fail locally; `.env` has the working pair.
- Local `.env` `DATABASE_URL` is the production database — one careless `bun run migrate` or seed script hits prod.
- Test accounts still in prod: `prod-smoke-59@example.com`, `deploy-agent@temp-ace.dev`, plus one unverified gmail account with no orders.
- No custom domain, no uptime check, no alerting, no backup/restore runbook, no staging environment.
- No refund/receipt process documented for the human doing approvals.

---

## Method

**Read (not run):** workspace `AGENTS.md`, `ace-backend/AGENTS.md`, `ace-stores/AGENTS.md`, `ace-backend/docs/frontend-handoff.md`, `ace-backend/docs/backend-fixes.md`, `ace-stores/docs/admin-frontend-handoff.md`, `DESIGN.md`, `PRODUCT.md`; backend `src/index.ts`, all of `src/routes/*.ts`, `src/middleware/session.ts`, `src/auth.ts`, `src/licensing/{shared,tokens}.ts`, `src/storage/objectStore.ts`, `src/jobs/expire-orders.ts`, `src/prisma/contract.prisma`, `wrangler.jsonc`, `.env`, `.env.example`, `.dev.vars`, `package.json`, `README.md`, `scripts/seed-prod.mjs`, `prisma.config.ts`, `migrations/app/*`; frontend `app/lib/{api,admin-api,store,errors,receipt}.*`, `app/routes.ts`, every `app/routes/*.tsx` in scope, `app/components/{OrderLine,ProductEditor,AdminGate,Nav}.tsx`, `workers/app.ts`, `vite.config.ts`, `wrangler.jsonc`, `package.json`, `Dockerfile`, `README.md`, `.env`, `.env.production`, `.dev.vars`.

**Ran (read-only or local):** `bun run check`, `bun run lint`, `bun run test` (111/111) and `bun run typecheck`, `bun run lint`, `bun run build` in the frontend; `curl` against both live Workers (`/`, `/products`, `/settings`, `/media/preview`, `/v1/auth/public-key`, `/v1/licenses`, `/api/auth/admin/set-role`, `/admin`, `/catalog`, `/checkout`); straight SQL `SELECT`s against the production database over `pg` (counts, product/file/setting/user/license rows, `information_schema` checks); object-existence probes against the production bucket signed with the repo's own `aws4fetch` code (`Range: bytes=0-0`, expect 206).

**Could not verify:** production Worker secret values; whether the B2 objects for products 1–3 ever existed; the impeccable design detector (its launcher fails under `node` with `SyntaxError: Invalid or unexpected token`, so the "0 findings" claim in `ace-stores/AGENTS.md` was not checked); any end-to-end browser checkout with a real session, because doing so would write orders to the production database.
