import { z } from "zod";

export const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required").max(100),
  description: z.string().max(500).optional(),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const createColumnSchema = z.object({
  name: z.string().min(1, "Column name is required").max(100),
  position: z.number().int().nonnegative().optional(),
});

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const createTicketSchema = z.object({
  boardId: z.string().uuid("Invalid board ID"),
  columnId: z.string().uuid("Invalid column ID"),
  title: z.string().min(1, "Ticket title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.string().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.string().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const moveTicketSchema = z.object({
  toColumnId: z.string().uuid("Invalid destination column ID"),
  position: z.number().int().nonnegative(),
});

export const createChatMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(1000),
  boardId: z.string().uuid().optional(),
});

export const createSocialMediaSchema = z.object({
  platform: z.string().min(1, "Platform name is required"),
  username: z.string().optional(),
  profileUrl: z.string().url().optional(),
  accessToken: z.string().optional(),
});

export const updateSocialMediaSchema = z.object({
  platform: z.string().min(1).optional(),
  username: z.string().nullable().optional(),
  profileUrl: z.string().url().nullable().optional(),
  accessToken: z.string().nullable().optional(),
});
