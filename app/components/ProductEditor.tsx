import { useEffect, useRef, useState } from "react";
import { useNavigate, useRevalidator, useBlocker } from "react-router";
import {
  adminAddFile,
  adminCreateProduct,
  adminCreateTag,
  adminDeleteFile,
  adminDeleteProduct,
  adminPresign,
  adminSetProductTags,
  adminUpdateProduct,
  type AdminTag,
} from "../lib/admin-api";
import type { ProductShape } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { useConfirm, useToast } from "./admin-ux";

/** Editor for one product — create mode (`product = null`) or edit mode.
 *  The page dirties relative to the loader's snapshot, warns on navigation
 *  (useBlocker) and on unload, and publishes via an immediate toggle. */
export function ProductEditor({
  product,
  tags,
  creating,
}: {
  product: ProductShape | null;
  tags: AdminTag[];
  creating: boolean;
}) {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [title, setTitle] = useState(product?.title ?? "");  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [desc, setDesc] = useState(product?.description ?? "");
  const [previewUrl, setPreviewUrl] = useState(product?.previewUrl ?? "");
  const [newTag, setNewTag] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const { ask, dialog } = useConfirm();
  const { show, toast } = useToast();

  /* baseline of the loader data: dirty = form differs from this; reset when the
     loaded row changes id, and re-set explicitly after each successful save */
  const [baseline, setBaseline] = useState(() =>
    product
      ? { title: product.title, price: String(product.price), desc: product.description ?? "", previewUrl: product.previewUrl ?? "" }
      : { title: "", price: "", desc: "", previewUrl: "" },
  );
  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setPrice(String(product.price));
      setDesc(product.description ?? "");
      setPreviewUrl(product.previewUrl ?? "");
      setBaseline({ title: product.title, price: String(product.price), desc: product.description ?? "", previewUrl: product.previewUrl ?? "" });
    } else {
      setTitle("");
      setPrice("");
      setDesc("");
      setPreviewUrl("");
      setBaseline({ title: "", price: "", desc: "", previewUrl: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when switching rows; mid-edit revalidates must not clobber typing
  }, [product?.id]);

  const dirty =
    !creating &&
    (title !== baseline.title ||
      Math.trunc(Number(price) || 0) !== Number(baseline.price) ||
      desc !== baseline.desc ||
      previewUrl !== baseline.previewUrl);

  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (confirm("Unsaved changes — leave this product anyway?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    const body = {
      title: title.trim(),
      price: Math.trunc(Number(price) || 0),
      description: desc || null,
      previewUrl: previewUrl.trim() || null,
    };
    if (creating) {
      setBusy(true);
      try {
        const created = await adminCreateProduct({ ...body, published: false });
        navigate(`/admin/products/${created.id}`);
      } catch (err) {
        setActionError(friendlyError(err, "Couldn't create the product."));
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      await adminUpdateProduct(product!.id, body);
      setBaseline({ title: body.title, price: String(body.price), desc: body.description ?? "", previewUrl: body.previewUrl ?? "" });
      show("Saved");
      revalidator.revalidate();
    } catch (err) {
      setActionError(friendlyError(err, "That didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const togglePublished = () =>
    run(async () => {
      await adminUpdateProduct(product!.id, { published: !product!.published });
      show(product!.published ? "Moved to drafts" : "Published");
    });

  async function uploadThumb(f: File) {
    await run(async () => {
      const pres = await adminPresign({ kind: "thumbnail", productId: product!.id, fileName: f.name, contentType: f.type || "image/png" });
      await uploadToBucket(pres.uploadUrl, f, pres.contentType);
      await adminUpdateProduct(product!.id, { thumbnailKey: pres.key });
      show("Thumbnail updated");
    });
  }

  function uploadMaterial(f: File) {
    return run(async () => {
      const pres = await adminPresign({ kind: "material", productId: product!.id, fileName: f.name, contentType: f.type || "application/octet-stream" });
      await uploadToBucket(pres.uploadUrl, f, pres.contentType);
      await adminAddFile(product!.id, { name: f.name, storageKey: pres.key, sizeBytes: f.size });
      show("File added");
    });
  }

  const deleteFile = (fileId: number) =>
    ask(
      {
        title: "Remove this file?",
        body: "Buyers with an active order lose access to it.",
        confirmLabel: "Remove",
        danger: true,
        action: () => void run(async () => { await adminDeleteFile(fileId); show("File removed"); }),
      },
    );

  function addTag() {
    const n = newTag.trim();
    if (!n) return;
    void run(async () => {
      const tag = await adminCreateTag({ name: n });
      await adminSetProductTags(product!.id, [...product!.tags.map((t) => t.id), tag.id]);
      setNewTag("");
      show(`Tagged "${n}"`);
    });
  }

  function toggleTag(tid: number, checked: boolean) {
    const ids = product!.tags.map((t) => t.id);
    const next = checked ? [...ids, tid] : ids.filter((x) => x !== tid);
    return run(() => adminSetProductTags(product!.id, next));
  }

  const deleteProduct = () =>
    ask({
      title: "Delete this product?",
      body: "Files and tags detach. Products with order history cannot be deleted.",
      confirmLabel: "Delete product",
      danger: true,
      action: () =>
        void run(async () => {
          await adminDeleteProduct(product!.id);
          navigate("/admin/products");
        }),
    });

  const saveable = title.trim() !== "" && price !== "" && Number(price) >= 0 && Number(price) <= 1e6;

  return (
    <>
      {toast}
      {dialog}
      {actionError && (
        <p className="mb-4 text-[13px] text-danger" role="alert">{actionError}</p>
      )}

      <form onSubmit={save} className="panel rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-caps" htmlFor="ed-title">Title</label>
            <input id="ed-title" className="field mt-2" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <label className="label-caps" htmlFor="ed-price">Price (EGP)</label>
            <input id="ed-price" className="field mt-2 tnum" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min={0} max={1e6} />
          </div>
          <div>
            <label className="label-caps" htmlFor="ed-preview">Preview URL</label>
            <input id="ed-preview" className="field mt-2" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://…" />
            <span className="label-caps mt-1 block">optional — link to hosted preview media</span>
          </div>
          <div className="sm:col-span-2">
            <label className="label-caps" htmlFor="ed-desc">Description</label>
            <textarea id="ed-desc" className="field mt-2 h-24" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={5e3} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy || !saveable} data-busy={busy || undefined}>
            {creating ? "Create draft" : busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {!creating && (
            <button type="button" className="chip" data-on={product!.published} aria-pressed={product!.published} disabled={busy} onClick={() => void togglePublished()}>
              {product!.published ? "Live on storefront" : "Draft — hidden"}
            </button>
          )}
          {dirty && <span className="label-caps text-dim">unsaved changes</span>}
        </div>
      </form>

      {!creating && (
        <>
          <section className="mt-6 panel rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Cover</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {product!.thumbnailUrl ? (
                <img src={product!.thumbnailUrl} alt={`Cover art for ${product!.title}`} className="h-40 w-40 shrink-0 rounded-lg border border-hairline object-cover" />
              ) : (
                <div className="h-40 w-40 shrink-0 rounded-lg border border-hairline" aria-hidden />
              )}
              <div className="flex flex-col gap-2">
                <input ref={thumbInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumb(f); e.target.value = ""; }} />
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => thumbInput.current?.click()}>
                  {product!.thumbnailUrl ? "Replace cover" : "Upload cover"}
                </button>
                <span className="label-caps text-dim">png · jpg · webp</span>
              </div>
            </div>
          </section>

          <section className="mt-6 panel rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => {
                const on = product!.tags.some((x) => x.id === t.id);
                return (
                  <label key={t.id} className="chip cursor-pointer" data-on={on}>
                    <input type="checkbox" checked={on} className="sr-only" onChange={(e) => void toggleTag(t.id, e.target.checked)} />
                    {t.name}
                  </label>
                );
              })}
              {tags.length === 0 && <span className="label-caps text-dim">no tags yet — create some on the tags page</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <label className="sr-only" htmlFor="ed-newtag">New tag name</label>
              <input id="ed-newtag" className="field max-w-xs" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Create tag" />
              <button type="button" className="btn btn-ghost" disabled={busy || !newTag.trim()} data-busy={busy || undefined} onClick={() => void addTag()}>Add</button>
            </div>
          </section>

          <section className="mt-6 panel rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink uppercase">Files ({product!.files.length})</h2>
            <input ref={fileInput} type="file" accept=".zip,application/zip,application/x-zip-compressed,audio/mpeg,audio/wav,image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadMaterial(f); e.target.value = ""; }} />
            {product!.files.length === 0 ? (
              <p className="mt-4 text-dim">No files attached yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {product!.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg border border-hairline p-2">
                    <span className="truncate text-ink">{f.name}</span>
                    <span className="ml-2 flex items-center gap-3">
                      {f.sizeBytes != null && <span className="tnum label-caps">{(f.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>}
                      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => deleteFile(f.id)}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn btn-ghost mt-4" disabled={busy} onClick={() => fileInput.current?.click()}>Add file</button>
            <span className="label-caps mt-2 block text-dim">zip · mp3 · wav · png · jpg · webp</span>
          </section>

          <section className="mt-6 rounded-2xl border border-danger/40 p-6">
            <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-danger uppercase">Danger zone</h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-dim">Deleting removes the storefront pack, its files and its tag links.</p>
              <button type="button" className="btn btn-primary" data-danger disabled={busy} data-busy={busy || undefined} onClick={() => deleteProduct()}>Delete product</button>
            </div>
          </section>
        </>
      )}

      {dirty && !creating && <span className="sr-only" aria-live="polite">Product has unsaved changes</span>}
    </>
  );
}

async function uploadToBucket(uploadUrl: string, file: File, contentType: string) {
  if (!(await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file })).ok)
    throw new Error("Upload failed");
}
