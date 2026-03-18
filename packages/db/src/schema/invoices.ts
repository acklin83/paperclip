import { pgTable, uuid, text, timestamp, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { contacts } from "./contacts.js";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number; // price in Rappen (CHF cents)
}

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    // Invoice type: "invoice" (Rechnung RE-XXXX) or "quote" (Offerte OF-XXXX)
    invoiceType: text("invoice_type").notNull().default("invoice"),
    // Status: draft | sent | accepted | rejected | paid | cancelled
    status: text("status").notNull().default("draft"),
    // Human-readable number: RE-0001, OF-0001
    invoiceNumber: text("invoice_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    // Line items stored as JSON array
    lineItems: jsonb("line_items").notNull().$type<InvoiceLineItem[]>().default([]),
    // Totals in Rappen (CHF cents)
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    vatRateBps: integer("vat_rate_bps").notNull().default(810), // 810 = 8.1% Swiss VAT
    vatAmountCents: integer("vat_amount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    // Portal access: link this invoice to a portal token contact
    portalToken: text("portal_token"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("invoices_company_idx").on(table.companyId),
    contactIdx: index("invoices_contact_idx").on(table.contactId),
    statusIdx: index("invoices_company_status_idx").on(table.companyId, table.status),
    invoiceNumberUniqueIdx: uniqueIndex("invoices_number_unique_idx").on(table.companyId, table.invoiceNumber),
    portalTokenIdx: index("invoices_portal_token_idx").on(table.portalToken),
  }),
);
