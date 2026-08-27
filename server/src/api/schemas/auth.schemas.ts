import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const signupSchema = z.object({
  companyName: z.string().min(2).max(120),
  companySlug: slugSchema,
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(120),
});

export const createCompanyUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(120),
    password: passwordSchema.optional(),
    sendInvite: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    if (!value.sendInvite && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password is required when sendInvite is false",
        path: ["password"],
      });
    }
  });

export const acceptInviteSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateCompanyUserInput = z.infer<typeof createCompanyUserSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
