import { useState } from "react";
import { Link } from "react-router";
import { formatPrice, type Pack } from "../data/products";
import { orderDownloadUrl, type OrderItemShape, type OrderShape } from "../lib/api";
import { downloadReceipt } from "../lib/receipt";
import { CoverArt } from "./CoverArt";

/**
 * One Order line: thumb, title link, metadata, and whatever the order's
 * status makes available (license manifest once paid, file downloads too).
 * Shared by checkout's confirmation and the library so the two cannot drift.
 */
export function OrderLine({
  item,
  order,
  pack,
  email,
}: {
  item: OrderItemShape;
  order: OrderShape;
  pack: Pack | undefined;
  email: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-4">
      <div className="flex min-w-0 items-center gap-4">
        {pack && (
          <div className="hidden w-14 overflow-hidden rounded-lg sm:block">
            <CoverArt pack={pack} showTitle={false} className="block aspect-square w-full" />
          </div>
        )}
        <div className="min-w-0">
          {pack ? (
            <Link
              to={`/pack/${pack.slug}`}
              className="font-display text-lg font-bold text-ink hover:text-accent"
            >
              {item.title}
            </Link>
          ) : (
            <span className="font-display text-lg font-bold text-ink">{item.title}</span>
          )}
          <div className="label-caps mt-0.5">
            {pack?.formats.join(" · ") || "—"} · {formatPrice(item.price)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pack && (
          <button
            type="button"
            className="btn btn-ghost px-4! py-2!"
            onClick={() => downloadReceipt(pack, order, email)}
          >
            manifest
          </button>
        )}
        <FileDownloads order={order} pack={pack} />
      </div>
    </li>
  );
}

/** per-file download buttons — URLs minted live (presigned, 5 min) */
function FileDownloads({ order, pack }: { order: OrderShape; pack: Pack | undefined }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!pack?.files?.length || order.status !== "paid") {
    return order.status !== "paid" ? (
      <span className="label-caps text-faint">
        downloads unlock when we confirm your transfer
      </span>
    ) : null;
  }
  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {pack.files.map((f) => (
          <button
            key={f.id}
            type="button"
            className="btn btn-accent px-3! py-2!"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { url, fileName } = await orderDownloadUrl(f.id);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.click();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? `${f.name}: ${e.message}`
                    : `${f.name} could not start — try again in a moment.`,
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}