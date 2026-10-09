import type { Route } from "./+types/admin.products";
import { useRef, useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { formatPrice } from "../data/products";
import {
  adminAddFile,
  adminCreateProduct,
  adminCreateTag,
  adminDeleteFile,
  adminDeleteProduct,
  adminDeleteTag,
  adminPresign,
  adminProductsList,
  adminSetProductTags,
  adminTags,
  adminUpdateProduct,
} from "../lib/admin-api";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const [products, tags] = await Promise.all([adminProductsList(request), adminTags(request)]);
    return { products, tags, error: false };
  } catch {
    return { products: [], tags: [], error: true };
  }
}

export function meta({}: Route.MetaArgs) {
  // Private surface — nothing here belongs in an index.
  return [{ title: "Admin — Products" }, { name: "robots", content: "noindex, nofollow" }];
}

async function uploadToR2(uploadUrl: string, file: File, contentType: string) {
  if (!(await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file })).ok)
    throw new Error("Upload failed");
}

export default function AdminProducts() {
  const { products, tags, error } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [newTag, setNewTag] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  /** every mutation: run, then refresh the loader's data in place */
  async function run(id: number | null, fn: () => Promise<unknown>) {
    setBusy(id);
    setActionError(null);
    try {
      await fn();
      revalidator.revalidate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await run(null, async () => {
      await adminCreateProduct({
        title,
        price: Math.trunc(Number(price) || 0),
        description: desc || null,
        previewUrl: previewUrl || null,
      });
      setTitle("");
      setPrice("");
      setDesc("");
      setPreviewUrl("");
      setCreating(false);
    });
  }

  const deleteProduct = (id: number) =>
    confirm("Delete product? May 409 if order history exists.")
      ? run(id, () => adminDeleteProduct(id))
      : Promise.resolve();

  async function addTag() {
    const n = newTag.trim();
    if (!n) return;
    await run(null, async () => {
      await adminCreateTag({ name: n });
      setNewTag("");
    });
  }

  const deleteTag = (id: number) =>
    confirm("Delete tag?") ? run(id, () => adminDeleteTag(id)) : Promise.resolve();

  function toggleTag(pid: number, tid: number, checked: boolean) {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    const next = checked ? [...p.tags.map((t) => t.id), tid] : p.tags.map((t) => t.id).filter((x) => x !== tid);
    return run(pid, () => adminSetProductTags(pid, next));
  }

  function uploadMaterial(p: { id: number }, f: File) {
    return run(p.id, async () => {
      const pres = await adminPresign({
        kind: "material",
        productId: p.id,
        fileName: f.name,
        contentType: f.type || "application/octet-stream",
      });
      await uploadToR2(pres.uploadUrl, f, pres.contentType);
      await adminAddFile(p.id, { name: f.name, storageKey: pres.key, sizeBytes: f.size });
    });
  }

  function uploadThumb(p: { id: number }, f: File) {
    return run(p.id, async () => {
      const pres = await adminPresign({
        kind: "thumbnail",
        productId: p.id,
        fileName: f.name,
        contentType: f.type || "image/png",
      });
      await uploadToR2(pres.uploadUrl, f, pres.contentType);
      await adminUpdateProduct(p.id, { thumbnailKey: pres.key });
    });
  }

  const deleteFile = (fileId: number, pid: number) =>
    confirm("Delete file?") ? run(pid, () => adminDeleteFile(fileId)) : Promise.resolve();

  return (
    <>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-ink uppercase">Products</h1>
          <div className="flex gap-2">
            <Link to="/admin" className="btn btn-ghost">
              Orders
            </Link>
            <Link to="/admin/settings" className="btn btn-ghost">
              Settings
            </Link>
          </div>
        </div>

        {error && <p className="mt-6 text-danger">Failed to load</p>}
        {actionError && (
          <p className="mt-6 text-[13px] text-danger" role="alert">
            {actionError}
          </p>
        )}

        <section className="mt-8 panel rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Create product</h2>
          <form onSubmit={createProduct} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label-caps" htmlFor="np-title">
                Title
              </label>
              <input
                id="np-title"
                className="field mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="label-caps" htmlFor="np-price">
                Price (EGP)
              </label>
              <input
                id="np-price"
                className="field mt-2 tnum"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min={0}
                max={1e6}
              />
            </div>
            <div>
              <label className="label-caps" htmlFor="np-preview">
                Preview URL
              </label>
              <input
                id="np-preview"
                className="field mt-2"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://…"
              />
              <span className="label-caps mt-1 block">optional — link to hosted preview media</span>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps" htmlFor="np-desc">
                Description
              </label>
              <textarea
                id="np-desc"
                className="field mt-2 h-24"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={5e3}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary" disabled={creating}>
                Create
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 panel rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Tags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                className="chip"
                aria-label={`Delete tag ${t.name}`}
                onClick={() => void deleteTag(t.id)}
              >
                {t.name} ×
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <label className="sr-only" htmlFor="np-newtag">
              New tag name
            </label>
            <input
              id="np-newtag"
              className="field max-w-xs"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag"
            />
            <button type="button" className="btn btn-ghost" onClick={() => void addTag()}>
              Add
            </button>
          </div>
        </section>

        <div className="mt-8 space-y-6">
          {products.map((p) => (
            <article key={p.id} className="panel rounded-2xl p-6">
              <header className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="label-caps">Product #{p.id}</div>
                  <h3 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink">{p.title}</h3>
                  <div className="mt-1 text-dim tnum">{formatPrice(p.price)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost"
                    disabled={busy === p.id}
                    onClick={() => thumbInput.current?.click()}
                  >
                    Upload thumbnail
                  </button>
                  <input
                    ref={thumbInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadThumb(p, f);
                      if (e.target) e.target.value = "";
                    }}
                  />
                  <button className="btn btn-ghost" disabled={busy === p.id} onClick={() => fileInput.current?.click()}>
                    Add file
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed,audio/mpeg,audio/wav,image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadMaterial(p, f);
                      if (e.target) e.target.value = "";
                    }}
                  />
                  <button className="btn btn-ghost" disabled={busy === p.id} onClick={() => void deleteProduct(p.id)}>
                    Delete
                  </button>
                </div>
              </header>

              {p.description && <p className="mt-4 text-dim">{p.description}</p>}
              {p.previewUrl && <p className="mt-2 break-all text-[13px] text-dim">{p.previewUrl}</p>}
              {p.thumbnailUrl && (
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="mt-4 h-40 w-40 rounded-lg border border-hairline object-cover"
                />
              )}

              <div className="mt-5">
                <div className="label-caps">Tags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const on = p.tags.some((x) => x.id === t.id);
                    return (
                      <label key={t.id} className="chip cursor-pointer" data-on={on}>
                        <input
                          type="checkbox"
                          checked={on}
                          className="sr-only"
                          onChange={(e) => void toggleTag(p.id, t.id, e.target.checked)}
                        />
                        {t.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {p.files.length > 0 && (
                <div className="mt-5">
                  <div className="label-caps">Files</div>
                  <ul className="mt-2 space-y-2">
                    {p.files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between rounded-lg border border-hairline p-2">
                        <span className="truncate text-ink">{f.name}</span>
                        <button
                          className="btn btn-ghost"
                          onClick={() => void deleteFile(f.id, p.id)}
                          disabled={busy === p.id}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
    </>
  );
}