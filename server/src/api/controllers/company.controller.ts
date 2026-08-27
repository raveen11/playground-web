import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import { sendInviteEmail } from "../../lib/auth/mail.js";
import { hashPassword } from "../../lib/auth/password.js";
import {
  createInviteToken,
  getInviteExpiry,
} from "../../lib/auth/tokens.js";
import { publicUser } from "../../lib/auth/session.js";
import type { CreateCompanyUserInput } from "../schemas/auth.schemas.js";

export const createCompanyUser: RequestHandler = async (req, res) => {
  const body = req.body as CreateCompanyUserInput;

  try {
    if (!req.user?.companyId) {
      res.status(403).json({ message: "Company scope required" });
      return;
    }

    const companyId = req.user.companyId;
    const email = body.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: "Email is already registered" });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }

    const shouldInvite = body.sendInvite !== false;

    if (shouldInvite) {
      const placeholderHash = await hashPassword(createInviteToken());
      const inviteToken = createInviteToken();

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: body.name,
            passwordHash: placeholderHash,
            role: "company_user",
            companyId,
            status: "invited",
            invitedBy: req.user!.userId,
          },
        });

        const invite = await tx.invite.create({
          data: {
            email,
            companyId,
            role: "company_user",
            token: inviteToken,
            invitedBy: req.user!.userId,
            expiresAt: getInviteExpiry(),
          },
        });

        return { user, invite };
      });

      await sendInviteEmail({
        to: email,
        inviteToken: result.invite.token,
        companyName: company.name,
      });

      res.status(201).json({
        user: publicUser(result.user),
        invite: {
          id: result.invite.id,
          email: result.invite.email,
          role: result.invite.role,
          expiresAt: result.invite.expiresAt,
        },
      });
      return;
    }

    const passwordHash = await hashPassword(body.password!);

    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email,
          name: body.name,
          passwordHash,
          role: "company_user",
          companyId,
          status: "active",
          invitedBy: req.user!.userId,
        },
      });
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    console.error("Create company user failed:", error);
    res.status(500).json({ message: "Failed to create company user" });
  }
};
