import { api, type OrderShape, type ProductShape } from "./api";

/**
 * Admin desk endpoints. Every wrapper takes an optional `Request` and
 * forwards it so server-side loaders carry the session cookie — see `api()`.
 */
export interface AdminOrder extends OrderShape {
  user: { id: string; email: string; name: string };
  screenshotUrl: string;
}

export function adminOrders(status?: string, req?: Request): Promise<AdminOrder[]> {
  const q = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  return api<AdminOrder[]>(`/admin/orders${q}`, undefined, req);
}

export function adminApproveOrder(id: number, req?: Request): Promise<{ id: number; status: string }> {
  return api<{ id: number; status: string }>(`/admin/orders/${id}/approve`, { method: "POST" }, req);
}

export function adminRejectOrder(id: number, req?: Request): Promise<{ id: number; status: string }> {
  return api<{ id: number; status: string }>(`/admin/orders/${id}/reject`, { method: "POST" }, req);
}

export function adminRevokeOrder(id: number, req?: Request): Promise<{ id: number; status: string }> {
  return api<{ id: number; status: string }>(`/admin/orders/${id}/revoke`, { method: "POST" }, req);
}

export function adminCreateProduct(
  body: {
    title: string;
    price: number;
    description?: string | null;
    previewUrl?: string | null;
    thumbnailKey?: string | null;
  },
  req?: Request,
): Promise<ProductShape> {
  return api<ProductShape>(
    "/admin/products",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    req,
  );
}

export function adminUpdateProduct(
  id: number,
  body: Partial<{
    title: string;
    price: number;
    description: string | null;
    previewUrl: string | null;
    thumbnailKey: string | null;
  }>,
  req?: Request,
): Promise<ProductShape> {
  return api<ProductShape>(
    `/admin/products/${id}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    req,
  );
}

export function adminDeleteProduct(id: number, req?: Request): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/products/${id}`, { method: "DELETE" }, req);
}

/** presigned R2 target; caller PUTs the bytes, then records the key */
export function adminPresign(
  body: { kind: "material" | "thumbnail" | "preview"; productId?: number; fileName?: string; contentType: string },
  req?: Request,
): Promise<{ key: string; uploadUrl: string; contentType: string }> {
  return api<{ key: string; uploadUrl: string; contentType: string }>(
    "/admin/presign",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    req,
  );
}

export function adminAddFile(
  productId: number,
  body: { name: string; storageKey: string; sizeBytes?: number | null },
  req?: Request,
): Promise<{ id: number; name: string; sizeBytes: number | null }> {
  return api<{ id: number; name: string; sizeBytes: number | null }>(
    `/admin/products/${productId}/files`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    req,
  );
}

export function adminDeleteFile(fileId: number, req?: Request): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/files/${fileId}`, { method: "DELETE" }, req);
}

export interface AdminTag {
  id: number;
  name: string;
}

export function adminProductsList(req?: Request): Promise<ProductShape[]> {
  return api<ProductShape[]>("/products", undefined, req);
}

export function adminTags(req?: Request): Promise<AdminTag[]> {
  return api<AdminTag[]>("/tags", undefined, req);
}

export function adminCreateTag(body: { name: string }, req?: Request): Promise<AdminTag> {
  return api<AdminTag>(
    "/admin/tags",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    req,
  );
}

export function adminDeleteTag(id: number, req?: Request): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/tags/${id}`, { method: "DELETE" }, req);
}

export function adminSetProductTags(
  productId: number,
  tagIds: number[],
  req?: Request,
): Promise<{ productId: number; tagIds: number[] }> {
  return api<{ productId: number; tagIds: number[] }>(
    `/admin/products/${productId}/tags`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagIds }) },
    req,
  );
}

export function adminSettings(req?: Request): Promise<Record<string, string>> {
  return api<Record<string, string>>("/admin/settings", undefined, req);
}

export function adminUpdateSettings(
  entries: Record<string, string>,
  req?: Request,
): Promise<Record<string, string>> {
  return api<Record<string, string>>(
    "/admin/settings",
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries }) },
    req,
  );
}