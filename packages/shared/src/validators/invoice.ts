import { z } from "zod";

export const INVOICE_TYPES = ["invoice", "quote"] as const;

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "paid",
  "cancelled",
] as const;

// Swiss VAT rate in basis points (8.1% = 810 bps)
export const SWISS_VAT_RATE_BPS = 810;

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().min(0),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

export const createInvoiceSchema = z.object({
  invoiceType: z.enum(INVOICE_TYPES).default("invoice"),
  contactId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  lineItems: z.array(invoiceLineItemSchema).default([]),
  vatRateBps: z.number().int().min(0).max(10000).default(SWISS_VAT_RATE_BPS),
  issuedAt: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export type CreateInvoice = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(INVOICE_STATUSES).optional(),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  vatRateBps: z.number().int().min(0).max(10000).optional(),
  issuedAt: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;

export const listInvoicesQuerySchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
  invoiceType: z.enum(INVOICE_TYPES).optional(),
  contactId: z.string().uuid().optional(),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
