# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Content creators buying digital production assets:

- **Video editors** who buy transition packs for their editing suites (Premiere Pro, After Effects, DaVinci Resolve, Final Cut class tools).
- **Music producers** who buy audio assets — samples, loops, one-shots, presets — for music production.

They browse a specialized store, evaluate what a pack contains, buy it, and expect to download and use it immediately.

## Product Purpose

ACE Stores is a first-party ecommerce platform that sells ACE LLC's own digital products: video transition packs and audio assets for music production. It exists to sell the company's catalog directly to creators. Success means a visitor can discover a pack, understand exactly what's inside, pay, and be working with the files minutes later.

## Positioning

A maker-direct brand storefront — every product is ACE's own, curated and quality-controlled by the company that made it, sold with instant self-serve delivery. A generic marketplace cannot truthfully claim the same single-maker accountability for what it sells.

## Operating Context

- Digital-only catalog: media packs (video transition packs; audio assets for music production).
- Delivery is download, not shipping; the customer's purchased library is part of the product experience.
- Purchases happen in the browser; consumption happens later inside the customer's editing/production software.

## Capabilities and Constraints

Confirmed functionality:

- **Full self-serve commerce at launch:** customer accounts, payment, and instant download from the customer's own library.
- **First-party catalog only:** ACE LLC's own packs; no third-party sellers.
- **Language:** English at launch. Arabic (with right-to-left layout) is the planned next phase — the design must not preclude RTL, but no bilingual UI is required now.

Confirmed scaffold (existing codebase):

- React Router 8 in framework mode (SSR), Vite, Tailwind CSS 4, TypeScript, Bun lockfile, Docker deployment target. Dev server: `npm run dev` (http://localhost:5173).

Explicitly undecided product facts (record, do not invent):

- Payment provider and supported regions/currencies.
- Licensing terms attached to products (e.g., royalty-free standard license).
- Product preview strategy (audio players, video demos, image galleries) and required media formats.
- Launch catalog size, pricing structure, and whether any subscription/bundling exists.

## Brand Commitments

- **Name:** ACE Stores — part of the ACE LLC brand family. Sibling brand logo assets exist for ACE Apps and ACE Magazine.
- **Binding logo assets:** `assets/Logo/ACE Stores Logo/` (main, alternate, and white versions, PNG).
- **On-hand font library:** `assets/Fonts/` — Inter, Inter Tight, Red Rose, Janna, Lalezar. Janna and Lalezar are Arabic typefaces retained for the future Arabic phase.
- **Direction references the user made binding:** https://www.reasonstudios.com/, https://signaturesounds.org/, and https://www.boomlibrary.com/ — polished, creator-focused digital-asset stores. The user has chosen the category-standard "dark creator storefront" as the visual world (the earlier Signal Print world was replaced at their request); these three sites are the craft bar every surface is executed against.

## Evidence on Hand

- Logo assets (PNG) for the whole ACE family: ACE Stores (main/alternate/white), ACE LLC (main/alternate/white), ACE Apps, ACE Magazine — under `assets/Logo/`.
- Local font families under `assets/Fonts/`: Inter, Inter Tight, Red Rose, Janna, Lalezar.
- The app itself is still the stock React Router starter template — no store UI, product data, copy, or imagery exists yet.
- **Absence to respect:** no product photography, pack artwork, audio/video previews, testimonials, or pricing data exist in the repo. Future work must not fabricate products, reviews, customer counts, or claims.

## Product Principles

1. **Maker-direct curation** — one voice, one maker: everything sold is ACE's own, so the store speaks with authority about every product.
2. **Show the goods** — these are media products; what customers can see and hear does the selling, and purchase decisions should not depend on trusting text claims alone.
3. **Buy to work in minutes** — the purchase-to-download path is the core promise; friction there is the product's biggest failure mode.
4. **Arabic-ready** — English first, but content structure and layout leave room for the RTL phase without a rebuild.
5. **One ACE family** — the store is a sibling of ACE Apps and ACE Magazine under ACE LLC; identity must stay coherent with the family.

## Accessibility & Inclusion

- No specific formal standard has been required yet.
- Right-to-left Arabic support is a confirmed roadmap item: layout mirroring and Arabic typography (Janna, Lalezar on hand) must remain possible.
