---
name: ACE Stores
description: Production assets made by the maker — the dark creator storefront, executed at full fidelity.
colors:
  ground: "#0b0c10"
  panel: "#131519"
  panel-raised: "#1a1d23"
  hairline: "#262a32"
  ink: "#f5f5f7"
  body-dim: "#9b9ba3"
  label-faint: "#808089"
  accent: "#8b5cf6"
  accent-soft: "#a78bfa"
  danger: "#ff5470"
typography:
  display:
    fontFamily: "Inter Tight, Inter, sans-serif"
    fontSize: "clamp(2.8rem, 6vw, 5.4rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter Tight, Inter, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  card: "16px"
  control: "8px"
  pill: "999px"
spacing:
  grid-gap: "16px"
  card-pad: "16px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ground}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.body-dim}"
    rounded: "{rounded.pill}"
    padding: "6px 13px"
  field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Design System: ACE Stores

## Overview

**Creative North Star: "The Midnight Label"**

The dark creator storefront, chosen by the user and executed against three named competitors (Reason Studios, Signature Sounds, BOOM Library) as the craft bar. Near-black ground, massive uppercase display type, cover-art-led product cards, category tiles, and one confident violet accent. Confident and commercial where the previous world was laboratory-restrained; the covers carry the color, the chrome stays neutral.

**Key Characteristics:**
- Near-black neutral ground (#0b0c10) with raised panels and soft 16px card radii
- Inter Tight 800 uppercase display; Inter body; Inter Tight 600 caps labels
- One violet accent (#8b5cf6) for live/active/CTA-support; white-fill primary buttons
- Cover-art-led cards: every product shows authored duotone artwork, hover-plays its demo
- Category tiles and featured-pack hero in the grammar of the reference stores
- One authored motion: card lift + rise-in entrances; hover-play is the signature interaction

## Colors

A commercial dark palette where color is either neutral chrome or the accent voice.

### Primary
- **Violet Accent** (#8b5cf6): the single accent — active states, playing badges, order-locked, "discover" links. Used sparingly; its scarcity is the point.
- **Accent Soft** (#a78bfa): hover lift of the accent, nothing else.

### Neutral
- **Ground** (#0b0c10): the page field, always.
- **Panel** (#131519): cards and resting surfaces; **Panel Raised** (#1a1d23) for sticky/focused surfaces with a deep soft shadow.
- **Hairline** (#262a32): every border and divider.
- **Ink** (#f5f5f7): primary text and the primary button's fill.
- **Body Dim** (#9b9ba3): body copy; **Label Faint** (#808089): caps labels and metadata.

### Named Rules
**The One-Accent Rule.** Violet is the only accent. It marks what is live, active, or chosen — never decoration, never a second color voice.

**The Cover-Carries-Color Rule.** Product color lives in the cover art (duotone hues: violet, cyan, orange, magenta, blue, lime). Chrome stays neutral so the catalog reads like a record-shop wall.

**The Honest-Playback Rule.** A card plays only when a real demo exists. Cover-only products show no player and no play badge — the absence is stated, not faked.

## Typography

**Display Font:** Inter Tight 800 (with Inter fallback)
**Body Font:** Inter (with system fallback)
**Label Font:** Inter Tight 600 caps

**Character:** One family, two voices — massive tight uppercase for claims, quiet caps for labels. The commercial-storefront register the references share.

### Hierarchy
- **Display** (800, clamp(2.8rem–5.4rem), 0.98, −0.03em, uppercase): hero claims and section titles.
- **Title** (700–800, 18–24px, −0.01em): pack names, order headers.
- **Body** (400, 15px, 1.6, 65–75ch): blurbs, tenets, checkout copy.
- **Label** (600, 11.5px, +0.1em, uppercase): category lines, spec keys, readouts.

### Named Rules
**The Claim-Is-Content Rule.** Display lines carry product truth ("Transitions. Sounds. Made by ACE."), not slogans or eyebrow labels.

## Layout

One container, 72rem (max-w-6xl), 16/24px gutters. Home composes: hero (7fr/5fr claim beside featured pack) → two category tiles → cover grid (4-up desktop, 2-up mobile) → tenets. Catalog: control bar in a panel, then 4-up cover grid. Product: 7fr/5fr cover+signal beside sticky spec panel. Sections breathe 64px; cards sit on a 16px grid with 4px hover lift.

## Elevation & Depth

Layered dark surfaces with real soft shadows: cards rest flat on ground, lift −4px on hover with a 16px/40px shadow at 50% black. Panel-raised carries 8px/24px. No glow, no colored halos — depth is neutral and physical.

## Shapes

Cards and panels at 16px radius; controls and fields at 8px; chips and play badges full-round pills. Drawn inline-SVG icons at 9–12px with 1.2px strokes; no glyph icons.

## Components

### Buttons
- **Shape:** 8px radius, Inter Tight 700 caps, +0.06em, 12.5px
- **Primary:** Ink fill, ground text — hover lifts 1px and brightens to white
- **Accent:** Violet fill, ground text — the buy/play action
- **Ghost:** hairline border, ink text — hover brightens border and adds a faint white wash
- **Focus:** 2px violet outline, 2px offset, on every interactive element

### Chips
- **Style:** pill, hairline border, dim text, 11.5px caps
- **State:** selected = solid violet with ground text; hover brightens border/text

### Fields
- **Style:** ground fill, hairline border, 8px radius, violet caret
- **Focus:** border arms to violet

### Cards (signature)
The product unit: full-bleed square cover art (authored duotone SVG with title lockup), hover-play badge bottom-right when a demo exists, "in library" badge top-left when owned, name/formats/price row beneath, one action. Lifts −4px with a deep shadow on hover.

### Navigation
Announcement strip (violet, product truth), then ground bar: white logo left; Catalog/Library caps links center-right; cart pill with tabular count, violet when holding items.

### Leader-line Callouts
Pack contents annotated onto the demo strip: two staggered label rows, hairlines dropping to violet anchors — visible on desktop, spoken as a list on mobile.

## Do's and Don'ts

### Do:
- **Do** lead every product surface with its cover art; the artwork is the merchandise.
- **Do** reserve violet for live/active/CTA-support and use white-fill buttons for primary commerce actions.
- **Do** keep hover-play honest: only packs with real demos get the badge and behavior.
- **Do** use tabular numerals for prices, counts, and readouts.

### Don't:
- **Don't** add glow, neon, glass, or gradient text — the references are dark but matte.
- **Don't** introduce a second accent color; violet is the whole voice.
- **Don't** fake players, reviews, or payment — placeholders stay labeled.
- **Don't** use Unicode glyphs as icons — draw inline SVG.
- **Don't** hard-code left/right CSS direction — the Arabic phase requires logical properties.
