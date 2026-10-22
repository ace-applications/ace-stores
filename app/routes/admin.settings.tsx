import type { Route } from "./+types/admin.settings";
import { useEffect, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import {
  adminExport,
  adminSettings,
  adminUpdateSettings,
} from "../lib/admin-api";
import { friendlyError } from "../lib/errors";
import { useConfirm, useToast } from "../components/admin-ux";

/** clientLoader on purpose: see admin.tsx — SSR would send no session cookie. */
export async function clientLoader() {
  try {
    return { settings: await adminSettings(), error: false } as const;
  } catch {
    return { settings: {} as Record<string, string>, error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Admin — Settings" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="skeleton h-8 w-40" />
      <div className="mt-6 panel rounded-2xl p-6">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-3" style={{ height: 160 }} />
        <div className="skeleton mt-4 h-9 w-24" />
      </div>
    </>
  );
}

const TEXT_FIELDS = [
  { key: "support_email", label: "Support email", kind: "email" as const, max: 200, hint: "Shown on checkout failures and the buyer's account page — mailto links point here." },
  { key: "announcement", label: "Announcement strip", kind: "text" as const, max: 160, hint: "Buyer header strip copy. Empty restores the house line: one price per pack · downloads unlock on confirmation." },
  { key: "order_expiry_days", label: "Order expiry window (days)", kind: "number" as const, max: 3, hint: "How long an unpaid order can wait before cron expires it. 1–365, default 7." },
  { key: "payment_instructions", label: "Payment instructions", kind: "textarea" as const, max: 10000, hint: "Shown to buyers at checkout — empty closes checkout." },
  { key: "policies_terms", label: "Terms of service", kind: "textarea" as const, max: 10000, hint: "Published as-is at /policies. Empty means the store ships no terms — write it before launch." },
  { key: "policies_privacy", label: "Privacy policy", kind: "textarea" as const, max: 10000, hint: "Published as-is at /policies." },
  { key: "policies_refund", label: "Refund policy", kind: "textarea" as const, max: 10000, hint: "Digital-goods case: state what happens for a wrong purchase or a dead download." },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminSettings() {
  const { settings, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { show, toast } = useToast();
  const { ask, dialog } = useConfirm();

  // the baseline resets after load AND after save — "Save" must not reseed the
  // form from whatever the failed load's empty value was
  const baseline = settings;
  useEffect(() => {
    setDraft(Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, baseline[f.key] ?? ""])));
  }, [baseline]);

  const changed = !error && TEXT_FIELDS.some((f) => (draft[f.key] ?? "") !== (baseline[f.key] ?? ""));
  const emailOk = !draft.support_email || EMAIL_RE.test(draft.support_email.trim());
  const daysOk =
    !draft.order_expiry_days ||
    (draft.order_expiry_days === String(Number.parseInt(draft.order_expiry_days, 10)) &&
      Number.parseInt(draft.order_expiry_days, 10) >= 1 &&
      Number.parseInt(draft.order_expiry_days, 10) <= 365);
  const valid = emailOk && daysOk;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (error || !changed || !valid) return; // a failed load renders an empty form — don't save that over the real value
    setSaving(true);
    setActionError(null);
    try {
      await adminUpdateSettings(Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, draft[f.key] ?? ""])));
      show("Settings saved");
      revalidator.revalidate();
    } catch (err) {
      setActionError(friendlyError(err, "Those settings didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  async function downloadExport() {
    setExporting(true);
    setActionError(null);
    try {
      const data = await adminExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ace-stores-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      show("Export downloaded");
    } catch (err) {
      setActionError(friendlyError(err, "Export failed. It's your data — the endpoint owes it to you; try again."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {toast}
      {dialog}
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Settings</h1>

      {error && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-danger">
          Failed to load settings
          <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>
            Retry
          </button>
        </p>
      )}
      {actionError && (
        <p className="mt-6 text-[13px] text-danger" role="alert">
          {actionError}
        </p>
      )}

      <form onSubmit={save} className="mt-6 space-y-6">
        {TEXT_FIELDS.map((f) => (
          <section key={f.key} className="panel rounded-2xl p-6" aria-labelledby={`set-${f.key}`}>
            <h2 id={`set-${f.key}`} className="text-[13px] font-semibold text-ink">
              {f.label}
            </h2>
            {f.kind === "textarea" ? (
              <textarea
                id={`set-${f.key}`}
                aria-label={f.label}
                className="field mt-3 h-40 w-full"
                value={draft[f.key] ?? ""}
                maxLength={f.max}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            ) : (
              <input
                id={`set-${f.key}`}
                aria-label={f.label}
                className="field mt-3"
                type={f.kind === "email" ? "email" : f.kind === "number" ? "text" : "text"}
                inputMode={f.kind === "number" ? "numeric" : undefined}
                value={draft[f.key] ?? ""}
                maxLength={f.max}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            )}
            <span className="label-caps mt-2 block max-w-[60ch] normal-case">{f.hint}</span>
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving || !changed || error || !valid} data-busy={saving || undefined}>
            {saving ? "Saving…" : "Save"}
          </button>
          {/* always-mounted live region so SRs reliably announce the text change */}
          <span className="label-caps" role="status">
            {saving
              ? "saving — don't close this tab…"
              : !emailOk
                ? "that email doesn't parse"
                : !daysOk
                  ? "expiry needs a whole number of days, 1–365"
                  : changed
                    ? "unsaved changes"
                    : ""}
          </span>
        </div>
      </form>

      <section className="mt-10 panel rounded-2xl p-6" aria-labelledby="set-export">
        <h2 id="set-export" className="text-[13px] font-semibold text-ink">
          Data export
        </h2>
        <p className="mt-2 max-w-[56ch] text-[13.5px] text-dim">
          Orders, products, users, and settings in one JSON file — the store's whole
          business record, minus auth secrets. Download before risky changes.
        </p>
        {!error && (
          <button
            type="button"
            className="btn btn-ghost mt-4"
            disabled={exporting}
            data-busy={exporting || undefined}
            onClick={() =>
              ask({
                title: "Prepare a full export?",
                body: "One JSON file with orders, products, users, and settings. It may take a moment.",
                confirmLabel: "Download",
                action: () => void downloadExport(),
              })
            }
          >
            {exporting ? "Preparing…" : "download full export"}
          </button>
        )}
      </section>
    </>
  );
}
