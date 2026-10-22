import type { Route } from "./+types/admin.tags";
import { useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { adminCreateTag, adminDeleteTag, adminProductsList, adminRenameTag, adminTags, type AdminTag } from "../lib/admin-api";
import { friendlyError } from "../lib/errors";
import { useConfirm, useToast } from "../components/admin-ux";

/** Tag registry: create, rename, retire. Product usage counts come free off
 *  the admin product list. */
export async function clientLoader() {
  try {
    const [tags, products] = await Promise.all([adminTags(), adminProductsList()]);
    const usage: Record<number, string> = {};
    for (const p of products) for (const t of p.tags) if (!usage[t.id]) usage[t.id] = p.title;
    return { tags, usage, error: false } as const;
  } catch {
    return { tags: [], usage: {} as Record<number, string>, error: true } as const;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Tags" }, { name: "robots", content: "noindex, nofollow" }];
}

export function HydrateFallback() {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-9 w-24" />
      </div>
      <div className="mt-8 panel rounded-2xl p-6">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-11" />
          ))}
        </div>
        <div className="skeleton mt-5 h-9 w-28" />
      </div>
    </>
  );
}

export default function AdminTags() {
  const { tags, usage, error } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();

  /** every mutation: run, then refresh the loader's data in place */
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      revalidator.revalidate();
    } catch (e) {
      setActionError(friendlyError(e, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  function addTag(e: React.FormEvent) {
    e.preventDefault();
    const n = newTag.trim();
    if (!n) return;
    void run(async () => {
      await adminCreateTag({ name: n });
      setNewTag("");
      show(`Created "${n}"`);
    });
  }

  function rename(t: AdminTag) {
    const n = renameValue.trim();
    if (!n) return;
    setRenaming(null);
    void run(async () => {
      await adminRenameTag(t.id, n);
      show("Renamed");
    });
  }

  const removeTag = (t: AdminTag) =>
    ask({
      title: `Delete tag "${t.name}"?`,
      body: "Products keep their other tags; this tag detaches from all of them.",
      confirmLabel: "Delete tag",
      danger: true,
      action: () => void run(async () => {
        await adminDeleteTag(t.id);
        show("Tag deleted");
      }),
    });

  function startRename(t: AdminTag) {
    setRenaming(t.id);
    setRenameValue(t.name);
  }

  return (
    <>
      {toast}
      {dialog}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Tags</h1>
      </div>

      {error && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-danger">
          Failed to load tags
          <button type="button" className="btn btn-ghost" onClick={() => revalidator.revalidate()}>Retry</button>
        </p>
      )}
      {actionError && (
        <p className="mt-6 text-[13px] text-danger" role="alert">{actionError}</p>
      )}

      <div className="mt-6 panel rounded-2xl p-6">
        {tags.length === 0 && !error ? (
          <p className="text-dim">No tags yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {tags.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3" aria-busy={busy}>
                {renaming === t.id ? (
                  <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); rename(t); }}>
                    <label className="sr-only" htmlFor={`rename-${t.id}`}>Rename tag</label>
                    <input
                      id={`rename-${t.id}`}
                      className="field flex-1"
                      value={renameValue}
                      autoFocus
                      maxLength={50}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Element | null)) setRenaming(null); }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={busy || !renameValue.trim()} data-busy={busy || undefined}>Save</button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-ink">{t.name}</span>
                    <span className="label-caps text-dim">{usage[t.id] ? `on “${usage[t.id]}”` : "unused"}</span>
                    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => startRename(t)}>Rename</button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      data-danger
                      disabled={busy}
                      onClick={() => removeTag(t)}
                      aria-label={`Delete tag ${t.name}`}
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form className="mt-5 flex gap-2" onSubmit={addTag}>
          <label className="sr-only" htmlFor="new-tag">New tag name</label>
          <input
            id="new-tag"
            className="field max-w-xs"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name"
            maxLength={50}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !newTag.trim()} data-busy={busy || undefined}>Add tag</button>
        </form>
        <p className="label-caps mt-3 text-dim">tags group related packs and filter the catalog</p>
      </div>
    </>
  );
}
