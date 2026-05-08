import type { Context } from "hono";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { verifySessionToken } from "./session";
import { findUserByUnionId } from "../queries/users";

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  let token = cookies[Session.cookieName];

  // Fallback: Authorization: Bearer <token> — Safari ITP blocks cross-origin cookies
  if (!token) {
    const authHeader = headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
  }

  if (!token) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

// Kept for compatibility but not used
export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    return c.json({ error: "OAuth not supported" }, 400);
  };
}
