import { request, withListQuery } from "./request";
import type {
  CreateRelayPayload,
  CreateWritingContestPayload,
  ListParams,
  Paginated,
  RelayEvent,
  UpdateRelayStatusPayload,
  UpdateWritingContestStatusPayload,
  WritingContest,
} from "./types";

export function fetchRelays(params?: ListParams): Promise<Paginated<RelayEvent>> {
  return request<Paginated<RelayEvent>>(withListQuery("/activities/relays", params));
}

export function fetchWritingContests(params?: ListParams): Promise<Paginated<WritingContest>> {
  return request<Paginated<WritingContest>>(withListQuery("/activities/contests", params));
}

export function createRelay(token: string, body: CreateRelayPayload): Promise<RelayEvent> {
  return request<RelayEvent>("/admin/activities/relays", {
    method: "POST",
    token,
    body,
  });
}

export function updateRelayStatus(
  token: string,
  relayID: string,
  body: UpdateRelayStatusPayload,
): Promise<RelayEvent> {
  return request<RelayEvent>(`/admin/activities/relays/${encodeURIComponent(relayID)}/status`, {
    method: "PATCH",
    token,
    body,
  });
}

export function createWritingContest(
  token: string,
  body: CreateWritingContestPayload,
): Promise<WritingContest> {
  return request<WritingContest>("/admin/activities/contests", {
    method: "POST",
    token,
    body,
  });
}

export function updateWritingContestStatus(
  token: string,
  contestID: string,
  body: UpdateWritingContestStatusPayload,
): Promise<WritingContest> {
  return request<WritingContest>(`/admin/activities/contests/${encodeURIComponent(contestID)}/status`, {
    method: "PATCH",
    token,
    body,
  });
}
