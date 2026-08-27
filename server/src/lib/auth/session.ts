import type { User, UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  createRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  signAccessToken,
  type AccessTokenPayload,
} from "./tokens.js";

export type AuthUser = Pick<User, "id" | "role" | "companyId" | "email" | "name" | "status">;

export function toAccessPayload(user: {
  id: string;
  role: UserRole;
  companyId: string | null;
}): AccessTokenPayload {
  return {
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
  };
}

export async function createSessionTokens(user: {
  id: string;
  role: UserRole;
  companyId: string | null;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const accessToken = await signAccessToken(toAccessPayload(user));

  return { accessToken, refreshToken };
}

export async function rotateSession(
  currentRefreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
} | null> {
  const currentHash = hashRefreshToken(currentRefreshToken);

  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash: currentHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true,
          status: true,
        },
      },
    },
  });

  if (!session || session.user.status !== "active") {
    return null;
  }

  const nextRefreshToken = createRefreshToken();
  const nextHash = hashRefreshToken(nextRefreshToken);

  await prisma.$transaction([
    prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    }),
    prisma.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: nextHash,
        expiresAt: getRefreshTokenExpiry(),
      },
    }),
  ]);

  const accessToken = await signAccessToken(toAccessPayload(session.user));

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    user: session.user,
  };
}

export async function revokeRefreshToken(
  refreshToken: string | undefined,
): Promise<void> {
  if (!refreshToken) {
    return;
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    status: user.status,
  };
}
