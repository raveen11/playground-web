import { prisma } from "../lib/prisma.js";

export class SocialMediaService {
  async listSocialMedia(companyId: string) {
    return prisma.socialMedia.findMany({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        platform: true,
        username: true,
        profileUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        companyId: item.companyId,
        platform: item.platform,
        username: item.username,
        profileUrl: item.profileUrl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    );
  }

  async createSocialMedia(
    companyId: string,
    data: {
      platform: string;
      username?: string | null;
      profileUrl?: string | null;
      accessToken?: string | null;
    },
  ) {
    const record = await prisma.socialMedia.create({
      data: {
        companyId,
        platform: data.platform.trim(),
        username: data.username?.trim() || null,
        profileUrl: data.profileUrl?.trim() || null,
        accessToken: data.accessToken?.trim() || null,
      },
    });

    return {
      id: record.id,
      companyId: record.companyId,
      platform: record.platform,
      username: record.username,
      profileUrl: record.profileUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async updateSocialMedia(
    id: string,
    companyId: string,
    data: {
      platform?: string;
      username?: string | null;
      profileUrl?: string | null;
      accessToken?: string | null;
    },
  ) {
    const existing = await prisma.socialMedia.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new Error("Social media record not found");
    }

    const record = await prisma.socialMedia.update({
      where: { id },
      data: {
        ...(data.platform ? { platform: data.platform.trim() } : {}),
        ...(data.username !== undefined
          ? { username: data.username?.trim() || null }
          : {}),
        ...(data.profileUrl !== undefined
          ? { profileUrl: data.profileUrl?.trim() || null }
          : {}),
        ...(data.accessToken !== undefined
          ? { accessToken: data.accessToken?.trim() || null }
          : {}),
      },
    });

    return {
      id: record.id,
      companyId: record.companyId,
      platform: record.platform,
      username: record.username,
      profileUrl: record.profileUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async deleteSocialMedia(id: string, companyId: string) {
    const existing = await prisma.socialMedia.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new Error("Social media record not found");
    }

    return prisma.socialMedia.delete({
      where: { id },
    });
  }
}

export const socialMediaService = new SocialMediaService();
