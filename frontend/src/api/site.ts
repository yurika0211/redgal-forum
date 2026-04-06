import { request, withListQuery } from "./request";
import type {
  CreateContentBlockPayload,
  CreateGalleryEntryPayload,
  ListParams,
  Paginated,
  SiteContent,
  SiteContentBlock,
  SiteGalleryEntry,
  UpdateContentBlockPayload,
  UpdateGalleryEntryPayload,
} from "./types";

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
