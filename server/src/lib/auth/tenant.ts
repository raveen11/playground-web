import type { UserRole } from "@prisma/client";
import type { AuthUser } from "./session.js";

/**
 * Restrict tenant-scoped queries to the caller's company unless they are
 * a platform-level super_admin.
 */
export function tenantWhere(
  user: Pick<AuthUser, "role" | "companyId">,
  companyId?: string | null,
): { companyId?: string } {
  if (user.role === "super_admin") {
    if (companyId) {
      return { companyId };
    }
    return {};
  }

  if (!user.companyId) {
    throw new Error("Authenticated user is missing company scope");
  }

  if (companyId && companyId !== user.companyId) {
    throw new Error("Cross-tenant access denied");
  }

  return { companyId: user.companyId };
}

export function assertCompanyScope(
  user: Pick<AuthUser, "role" | "companyId">,
  companyId: string,
): void {
  if (user.role === "super_admin") {
    return;
  }

  if (user.companyId !== companyId) {
    throw new Error("Cross-tenant access denied");
  }
}

export function isPlatformAdmin(role: UserRole): boolean {
  return role === "super_admin";
}
