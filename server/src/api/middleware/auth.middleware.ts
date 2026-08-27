import type { RequestHandler } from "express";
import type { UserRole } from "@prisma/client";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "../../lib/auth/cookies.js";
import { verifyAccessToken } from "../../lib/auth/tokens.js";
import type { AccessTokenPayload } from "../../lib/auth/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

function readAccessToken(req: Parameters<RequestHandler>[0]): string | null {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return null;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = readAccessToken(req);

    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    req.user = await verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
}

export function readRefreshToken(
  req: Parameters<RequestHandler>[0],
): string | undefined {
  const token = req.cookies?.[REFRESH_COOKIE];
  return typeof token === "string" && token.length > 0 ? token : undefined;
}
