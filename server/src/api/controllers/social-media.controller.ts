import type { RequestHandler } from "express";
import { socialMediaService } from "../../services/social-media.service.js";
import { resolveCompanyId } from "../../lib/auth/company-scope.js";
import { paramStr } from "../../lib/params.js";

export const listSocialMedia: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const records = await socialMediaService.listSocialMedia(companyId);
    res.json(records);
  } catch (error) {
    console.error("List social media failed:", error);
    res.status(500).json({ message: "Failed to list social media accounts" });
  }
};

export const createSocialMedia: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const record = await socialMediaService.createSocialMedia(
      companyId,
      req.body,
    );
    res.status(201).json(record);
  } catch (error) {
    console.error("Create social media failed:", error);
    res.status(500).json({ message: "Failed to create social media account" });
  }
};

export const updateSocialMedia: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const id = paramStr(req.params.id);
    const record = await socialMediaService.updateSocialMedia(
      id,
      companyId,
      req.body,
    );
    res.json(record);
  } catch (error) {
    console.error("Update social media failed:", error);
    res.status(500).json({ message: "Failed to update social media account" });
  }
};

export const deleteSocialMedia: RequestHandler = async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    const id = paramStr(req.params.id);
    await socialMediaService.deleteSocialMedia(id, companyId);
    res.json({ message: "Social media account deleted successfully", id });
  } catch (error) {
    console.error("Delete social media failed:", error);
    res.status(500).json({ message: "Failed to delete social media account" });
  }
};
