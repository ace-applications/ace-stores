import { formatPrice, type Pack } from "../data/products";
import type { Order } from "./store";

/**
 * Instant delivery, demonstrated honestly: until real pack files are
 * uploaded, "download" issues the order receipt manifest — a real file a
 * customer could archive — instead of pretending to deliver media.
 */
export function downloadReceipt(pack: Pack, order: Order) {
  const text = [
    "ACE STORES — ORDER MANIFEST",
    "===========================",
    `order       ${order.id}`,
    `date        ${new Date(order.date).toLocaleString()}`,
    `licensee    ${order.email}`,
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
    "Pack files are delivered with your real inventory. This manifest",
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
