import type { RequestHandler } from "express";
import { prisma } from "../../lib/prisma.js";
import { sendInviteEmail } from "../../lib/auth/mail.js";
import {
  createInviteToken,
  getInviteExpiry,
} from "../../lib/auth/tokens.js";
import { hashPassword } from "../../lib/auth/password.js";
import type { CreateCompanyInput } from "../schemas/auth.schemas.js";

export const createCompany: RequestHandler = async (req, res) => {
  const body = req.body as CreateCompanyInput;

  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const existingSlug = await prisma.company.findUnique({
      where: { slug: body.slug },
    });

    if (existingSlug) {
      res.status(409).json({ message: "Company slug is already taken" });
      return;
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: body.adminEmail.toLowerCase() },
    });

    if (existingEmail) {
      res.status(409).json({ message: "Admin email is already registered" });
      return;
    }

    // Placeholder hash so the invited user cannot log in until accept.
    const placeholderHash = await hashPassword(createInviteToken());
    const inviteToken = createInviteToken();

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: body.name,
          slug: body.slug,
          status: "active",
          createdBy: req.user!.userId,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: body.adminEmail.toLowerCase(),
          name: body.adminName,
          passwordHash: placeholderHash,
          role: "company_admin",
          companyId: company.id,
          status: "invited",
          invitedBy: req.user!.userId,
        },
      });

      const invite = await tx.invite.create({
        data: {
          email: body.adminEmail.toLowerCase(),
          companyId: company.id,
          role: "company_admin",
          token: inviteToken,
          invitedBy: req.user!.userId,
          expiresAt: getInviteExpiry(),
        },
      });

      return { company, adminUser, invite };
    });

    await sendInviteEmail({
      to: result.adminUser.email,
      inviteToken: result.invite.token,
      companyName: result.company.name,
    });

    res.status(201).json({
      company: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
        status: result.company.status,
      },
      invite: {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        expiresAt: result.invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Create company failed:", error);
    res.status(500).json({ message: "Failed to create company" });
  }
};
