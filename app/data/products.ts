/**
 * Catalog types + display helpers. Product data comes from the backend
 * (app/lib/api.ts adapts ProductShape → Pack); this module holds no
 * inventory of its own.
 */

export type Family = "video" | "audio";

export interface ContentFact {
  /** short label shown at the callout anchor */
  label: string;
  /** the fact the leader line lands on */
  note: string;
}

export interface Pack {
  /** stable key for the cart + render lists */
  id: string;
  /** the backend's productId — join against OrderItemShape.productId directly */
  productId: number;
  slug: string;
  name: string;
  family: Family;
  sub: string;
  blurb: string;
  formats: string[];
  contents: ContentFact[];
  size: string;
  price: number;
  /** real product thumbnail (presigned URL — expires); generated art when absent */
  imageUrl?: string;
  /** deliverable files (id/name) — download URLs are minted per file */
  files?: { id: number; name: string }[];
}

export const DATA_NOTE =
  "Catalog served live from the ACE Stores API — prices in EGP, one license per pack.";

export const CURRENCY = { symbol: "E£", code: "EGP" };

export function formatPrice(price: number): string {
  return `${CURRENCY.symbol}${price}`; // whole EGP, no decimals
}

/**
 * Fixed locale + UTC so server and client render the same string. A bare
 * toLocaleString() picks up the host's locale and timezone, which makes SSR
 * HTML disagree with the first client render. Formatters are hoisted —
 * Intl.DateTimeFormat construction is expensive per call.
 */
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatDay(iso: string): string {
  return DATE_ONLY.format(new Date(iso));
}

/** hue anchor for a pack's demo waveform strip (cover-only products) */
export function packHue(pack: Pack): string {
  if (pack.family === "video") return "var(--color-accent-soft)";
  switch (pack.sub) {
    case "Lo-fi":
    case "Ambient":
      return "var(--color-accent)";
    case "Trailer":
      return "var(--color-danger)";
    default:
      return "var(--color-accent-soft)";
  }
}

export const FAMILY_LABEL: Record<Family, string> = {
  video: "Video transitions",
  audio: "Audio assets",
};

/** Customers never see a backend enum. One wording per state, stated once. */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "awaiting payment confirmation",
  paid: "ready to download",
  rejected: "payment rejected",
  expired: "expired — not paid",
  revoked: "revoked by us",
};
