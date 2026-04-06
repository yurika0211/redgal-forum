import { request, withListQuery } from "./request";
import type {
  CreateWallSubmissionPayload,
  ListParams,
  Paginated,
  WallEntry,
} from "./types";

export function fetchWallEntries(params?: ListParams): Promise<Paginated<WallEntry>> {
  return request<Paginated<WallEntry>>(withListQuery("/wall", params));
}

export function fetchWallSubmissions(token: string, params?: ListParams): Promise<Paginated<WallEntry>> {
  return request<Paginated<WallEntry>>(withListQuery("/wall/submissions", params), {
    token,
  });
}

export function createWallSubmission(
  body: CreateWallSubmissionPayload,
  token: string,
): Promise<WallEntry> {
  return request<WallEntry>("/wall/submissions", {
    method: "POST",
    body,
    token,
  });
}

export function reviewWallSubmission(
  token: string,
  submissionID: string,
  body: { decision: string; comment?: string },
): Promise<{ submission_id: string; status: string }> {
  return request<{ submission_id: string; status: string }>(
    `/wall/submissions/${encodeURIComponent(submissionID)}/review`,
    {
      method: "POST",
      token,
      body,
    },
  );
}
