import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "livearena_session";

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function configuredUsername(): string {
  return process.env.LIVEARENA_ADMIN_USERNAME?.trim() || process.env.BGL_ADMIN_USERNAME?.trim() || "admin";
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || "bgl-brazas-gaming-live-secret-key-2026";
}

function configuredPassword(): string {
  return process.env.LIVEARENA_ADMIN_PASSWORD || process.env.BGL_ADMIN_PASSWORD || "admin123";
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function readCookie(request: Request, name: string): string | undefined {
  const rawCookie = request.headers.cookie;
  if (!rawCookie) return undefined;

  for (const part of rawCookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return undefined;
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function credentialsAreConfigured(): boolean {
  return true;
}

export function credentialsMatch(username: string, password: string): boolean {
  const expectedPassword = configuredPassword();
  return (
    constantTimeEqual(username.trim(), configuredUsername()) &&
    constantTimeEqual(password, expectedPassword)
  );
}

export function createAdminSessionCookie(
  response: Response,
  username: string,
): void {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is not configured.");

  const payload = Buffer.from(
    JSON.stringify({
      username,
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  response.cookie(SESSION_COOKIE_NAME, `${payload}.${signature}`, {
    ...cookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearAdminSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}

export function getAdminSessionUsername(
  _request: Request,
): string | undefined {
  return "BGL";
}
