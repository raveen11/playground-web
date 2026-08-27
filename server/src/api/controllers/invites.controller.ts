import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/auth/password.js";
import {
  createSessionTokens,
  publicUser,
} from "../../lib/auth/session.js";
import { setAuthCookies } from "../../lib/auth/cookies.js";
import type { AcceptInviteInput } from "../schemas/auth.schemas.js";

export const acceptInvite: RequestHandler = async (req, res) => {
  const token = String(req.params.token ?? "");
  const body = req.body as AcceptInviteInput;

  try {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!invite || invite.acceptedAt) {
      res.status(404).json({ message: "Invite not found" });
      return;
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ message: "Invite has expired" });
      return;
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: invite.email },
      });

      if (!existing) {
        throw new Error("INVITE_USER_MISSING");
      }

      if (
        existing.companyId !== invite.companyId ||
        existing.role !== invite.role
      ) {
        throw new Error("INVITE_USER_MISMATCH");
      }

      const updated = await tx.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          status: "active",
          ...(body.name ? { name: body.name } : {}),
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return updated;
    });

    const tokens = await createSessionTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      company: {
        id: invite.company.id,
        name: invite.company.name,
        slug: invite.company.slug,
        status: invite.company.status,
      },
      user: publicUser(user),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "INVITE_USER_MISSING" ||
        error.message === "INVITE_USER_MISMATCH")
    ) {
      res.status(400).json({ message: "Invite cannot be accepted" });
      return;
    }

    console.error("Accept invite failed:", error);
    res.status(500).json({ message: "Failed to accept invite" });
  }
};
