import { request } from "./request";
import type {
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  Session,
} from "./types";

interface SessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function login(body: LoginPayload): Promise<Session> {
  const session = await request<SessionResponse>("/auth/login", {
    method: "POST",
    body,
  });

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  };
}

export function registerAccount(body: RegisterPayload): Promise<RegisterResult> {
  return request<RegisterResult>("/auth/register", {
    method: "POST",
    body,
  });
}

export function logout(token: string): Promise<{ status: string }> {
  return request<{ status: string }>("/auth/logout", {
    method: "POST",
    token,
  });
}
