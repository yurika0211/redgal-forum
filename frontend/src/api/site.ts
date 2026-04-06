import { request, withListQuery } from "./request";
import type {
  CreateContentBlockPayload,
  GalleryAssetUploadResult,
  CreateGalleryEntryPayload,
  ListParams,
  Paginated,
  SiteContent,
  SiteContentBlock,
  SiteGalleryEntry,
  UpdateContentBlockPayload,
  UpdateGalleryEntryPayload,
} from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

export function fetchSiteContent(): Promise<SiteContent> {
  return request<SiteContent>("/site/content");
}

export function fetchAdminContentBlocks(
  token: string,
  params?: ListParams,
): Promise<Paginated<SiteContentBlock>> {
  return request<Paginated<SiteContentBlock>>(withListQuery("/admin/site/content-blocks", params), {
    token,
  });
}

export function createContentBlock(
  token: string,
  body: CreateContentBlockPayload,
): Promise<SiteContentBlock> {
  return request<SiteContentBlock>("/admin/site/content-blocks", {
    method: "POST",
    token,
    body,
  });
}

export function updateContentBlock(
  token: string,
  blockID: string,
  body: UpdateContentBlockPayload,
): Promise<SiteContentBlock> {
  return request<SiteContentBlock>(`/admin/site/content-blocks/${encodeURIComponent(blockID)}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteContentBlock(token: string, blockID: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/admin/site/content-blocks/${encodeURIComponent(blockID)}`, {
    method: "DELETE",
    token,
  });
}

export function fetchAdminGalleryEntries(token: string, params?: ListParams): Promise<Paginated<SiteGalleryEntry>> {
  return request<Paginated<SiteGalleryEntry>>(withListQuery("/admin/site/gallery-entries", params), {
    token,
  });
}

export function createGalleryEntry(token: string, body: CreateGalleryEntryPayload): Promise<SiteGalleryEntry> {
  return request<SiteGalleryEntry>("/admin/site/gallery-entries", {
    method: "POST",
    token,
    body,
  });
}

export function updateGalleryEntry(
  token: string,
  entryID: string,
  body: UpdateGalleryEntryPayload,
): Promise<SiteGalleryEntry> {
  return request<SiteGalleryEntry>(`/admin/site/gallery-entries/${encodeURIComponent(entryID)}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteGalleryEntry(token: string, entryID: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/admin/site/gallery-entries/${encodeURIComponent(entryID)}`, {
    method: "DELETE",
    token,
  });
}

export async function uploadGalleryAssets(
  token: string,
  files: readonly File[],
): Promise<GalleryAssetUploadResult> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE_URL}/admin/site/gallery-assets`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: GalleryAssetUploadResult; error?: string; ok?: boolean }
    | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  if (!payload?.data || !Array.isArray(payload.data.files)) {
    throw new Error("上传响应缺少图片数据");
  }

  return payload.data;
}
