import type { Route } from "./+types/admin.settings";
import { useEffect, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { adminSettings, adminUpdateSettings } from "../lib/admin-api";
import { friendlyError } from "../lib/errors";
import { useToast } from "../components/admin-ux";

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

export default function AdminSettings() {
  const { settings, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [payment, setPayment] = useState(settings.payment_instructions ?? "");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { show, toast } = useToast();
  const clean = payment === (settings.payment_instructions ?? "");
  // the Retry button refetches — the form must follow or "Save" would reseed
  // the textarea from the failed load's empty value
  useEffect(() => {
    setPayment(settings.payment_instructions ?? "");
  }, [settings]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (error) return; // a failed load renders an empty form — don't save that over the real value
    setSaving(true);
    setActionError(null);
    try {
      await adminUpdateSettings({ payment_instructions: payment });
      show("Settings saved");
      revalidator.revalidate();
    } catch (err) {
      setActionError(friendlyError(err, "Those settings didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
        {toast}
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

        <form onSubmit={save} className="mt-6 panel rounded-2xl p-6">
          <label className="label-caps" htmlFor="as-payment">
            Payment instructions
          </label>
          <textarea
            id="as-payment"
            className="field mt-3 h-40"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            placeholder="Shown at checkout — leave empty to close checkout"
            maxLength={1e4}
          />
          <span className="label-caps mt-2 block">
            shown to buyers at checkout · empty this closes checkout
          </span>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={saving || clean || error} data-busy={saving || undefined}>
              {saving ? "Saving…" : "Save"}
            </button>
            {/* always-mounted live region so SRs reliably announce the text change */}
            <span className="label-caps" role="status">
              {saving ? "saving — don't close this tab…" : clean || error ? "" : "unsaved changes"}
            </span>
          </div>
        </form>
    </>
  );
}