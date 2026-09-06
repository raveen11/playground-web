import { Router, type Router as ExpressRouter } from "express";
import {
  listSocialMedia,
  createSocialMedia,
  updateSocialMedia,
  deleteSocialMedia,
} from "../controllers/social-media.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createSocialMediaSchema,
  updateSocialMediaSchema,
} from "../schemas/board.schemas.js";

export const socialMediaRouter: ExpressRouter = Router();

socialMediaRouter.get("/", listSocialMedia);
socialMediaRouter.post(
  "/",
  validateBody(createSocialMediaSchema),
  createSocialMedia,
);
socialMediaRouter.patch(
  "/:id",
  validateBody(updateSocialMediaSchema),
  updateSocialMedia,
);
socialMediaRouter.delete("/:id", deleteSocialMedia);
