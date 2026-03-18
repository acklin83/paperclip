import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
});

export type CreateContact = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial();

export type UpdateContact = z.infer<typeof updateContactSchema>;

export const generatePortalTokenSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(30),
});

export type GeneratePortalToken = z.infer<typeof generatePortalTokenSchema>;
