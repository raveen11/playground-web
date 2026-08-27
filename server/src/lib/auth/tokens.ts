import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

export type AccessTokenPayload = {
  userId: string;
  role: UserRole;
  companyId: string | null;
};

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function requireSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): Uint8Array {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return new TextEncoder().encode(value);
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    role: payload.role,
    companyId: payload.companyId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(requireSecret("JWT_ACCESS_SECRET"));
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, requireSecret("JWT_ACCESS_SECRET"));

  if (typeof payload.sub !== "string") {
    throw new Error("Invalid access token subject");
  }

  return {
    userId: payload.sub,
    role: payload.role as UserRole,
    companyId: (payload.companyId as string | null) ?? null,
  };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(from = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_MS);
}

export function createInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getInviteExpiry(from = new Date()): Date {
  return new Date(from.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days
}
