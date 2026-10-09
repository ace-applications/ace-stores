import { formatPrice, type Pack } from "../data/products";
import type { OrderShape } from "./api";

/**
 * Per-pack order manifest — a real downloadable file certifying the
 * license against the server order. Real media ships via the library.
 */
export function downloadReceipt(pack: Pack, order: OrderShape, email: string) {
  const text = [
    "ACE STORES — ORDER MANIFEST",
    "===========================",
    `order       ${order.id}`,
    `date        ${new Date(order.createdAt).toLocaleString()}`,
    `licensee    ${email}`,
    "",
    `pack        ${pack.name}`,
    `family      ${pack.family} / ${pack.sub}`,
    `formats     ${pack.formats.join(", ")}`,
    `size        ${pack.size}`,
    `price       ${formatPrice(pack.price)} — one-time, royalty-free license`,
    "",
    "contents:",
    ...pack.contents.map((c) => `  - ${c.note}`),
    "",
    "Pack files are delivered from your library. This manifest",
    "verifies the license above against your order.",
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${order.id}-${pack.slug}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}