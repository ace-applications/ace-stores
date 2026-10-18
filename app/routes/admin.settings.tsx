import type { Route } from "./+types/admin.settings";
import { useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { adminSettings, adminUpdateSettings } from "../lib/admin-api";
import { friendlyError } from "../lib/errors";

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

export default function AdminSettings() {
  const { settings, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [payment, setPayment] = useState(settings.payment_instructions ?? "");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      await adminUpdateSettings({ payment_instructions: payment });
      revalidator.revalidate();
    } catch (err) {
      setActionError(friendlyError(err, "Those settings didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Settings</h1>

        {error && <p className="mt-6 text-danger">Failed to load settings</p>}
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
          <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
            Save
          </button>
        </form>
    </>
  );
}