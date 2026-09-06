import type { Request } from "express";
import { prisma } from "../prisma.js";

export async function resolveCompanyId(req: Request): Promise<string> {
  if (req.user?.companyId) {
    return req.user.companyId;
  }

  const existing = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing.id;
  }

  const defaultCompany = await prisma.company.create({
    data: {
      name: "Playground Company",
      slug: "playground",
      status: "active",
    },
  });

  return defaultCompany.id;
}

export async function resolveUserId(
  req: Request,
  companyId: string,
): Promise<string> {
  if (req.user?.userId) {
    return req.user.userId;
  }

  const user = await prisma.user.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  if (user) {
    return user.id;
  }

  // Create guest/demo user for standalone usage if no user exists in company
  const fallback = await prisma.user.create({
    data: {
      email: "demo@playground.local",
      name: "Demo User",
      passwordHash: "not-a-password",
      role: "company_user",
      companyId,
      status: "active",
    },
  });

  return fallback.id;
}
