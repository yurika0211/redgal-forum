import { request } from "./request";
import type { HealthData } from "./types";

export function fetchHealth(token?: string): Promise<HealthData> {
  return request<HealthData>("/health", { token });
}
