import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { invoices, companies, contacts } from "@paperclipai/db";
import type { CreateInvoice, UpdateInvoice, ListInvoicesQuery, Invoice, InvoiceType, InvoiceStatus } from "@paperclipai/shared";
import { notFound } from "../errors.js";

function mapInvoice(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    companyId: row.companyId,
    contactId: row.contactId,
    invoiceType: row.invoiceType as InvoiceType,
    status: row.status as InvoiceStatus,
    invoiceNumber: row.invoiceNumber,
    title: row.title,
    description: row.description,
    lineItems: row.lineItems as Array<{ description: string; quantity: number; unitPriceCents: number }>,
    subtotalCents: row.subtotalCents,
    vatRateBps: row.vatRateBps,
    vatAmountCents: row.vatAmountCents,
    totalCents: row.totalCents,
    portalToken: row.portalToken,
    issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function computeTotals(lineItems: Array<{ quantity: number; unitPriceCents: number }>, vatRateBps: number) {
  const subtotalCents = lineItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
  const vatAmountCents = Math.round((subtotalCents * vatRateBps) / 10000);
  const totalCents = subtotalCents + vatAmountCents;
  return { subtotalCents, vatAmountCents, totalCents };
}

async function generateInvoiceNumber(db: Db, companyId: string, invoiceType: string): Promise<string> {
  // Use a simple sequential counter per company per type
  const prefix = invoiceType === "quote" ? "OF" : "RE";

  // Count existing invoices of this type for this company to get next number
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), eq(invoices.invoiceType, invoiceType)));

  const count = Number(rows[0]?.count ?? 0) + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

export function invoiceService(db: Db) {
  return {
    list: async (companyId: string, query: ListInvoicesQuery) => {
      const conditions = [eq(invoices.companyId, companyId)];
      if (query.status) conditions.push(eq(invoices.status, query.status));
      if (query.invoiceType) conditions.push(eq(invoices.invoiceType, query.invoiceType));
      if (query.contactId) conditions.push(eq(invoices.contactId, query.contactId));

      const rows = await db
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt));
      return rows.map(mapInvoice);
    },

    getById: async (id: string) => {
      const row = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .then((r) => r[0] ?? null);
      return row ? mapInvoice(row) : null;
    },

    create: async (companyId: string, data: CreateInvoice) => {
      const lineItems = data.lineItems ?? [];
      const vatRateBps = data.vatRateBps ?? 810;
      const { subtotalCents, vatAmountCents, totalCents } = computeTotals(lineItems, vatRateBps);
      const invoiceNumber = await generateInvoiceNumber(db, companyId, data.invoiceType ?? "invoice");

      const [row] = await db
        .insert(invoices)
        .values({
          companyId,
          contactId: data.contactId ?? null,
          invoiceType: data.invoiceType ?? "invoice",
          invoiceNumber,
          title: data.title,
          description: data.description ?? null,
          lineItems,
          subtotalCents,
          vatRateBps,
          vatAmountCents,
          totalCents,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
        })
        .returning();

      if (!row) throw new Error("Failed to create invoice");
      return mapInvoice(row);
    },

    update: async (id: string, data: UpdateInvoice) => {
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .then((r) => r[0] ?? null);
      if (!existing) throw notFound("Invoice not found");

      const lineItems = data.lineItems ?? existing.lineItems as Array<{ description: string; quantity: number; unitPriceCents: number }>;
      const vatRateBps = data.vatRateBps ?? existing.vatRateBps;
      const { subtotalCents, vatAmountCents, totalCents } = computeTotals(lineItems, vatRateBps);

      const [row] = await db
        .update(invoices)
        .set({
          ...(data.contactId !== undefined ? { contactId: data.contactId } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          lineItems,
          vatRateBps,
          subtotalCents,
          vatAmountCents,
          totalCents,
          ...(data.issuedAt !== undefined ? { issuedAt: data.issuedAt ? new Date(data.issuedAt) : null } : {}),
          ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id))
        .returning();

      if (!row) throw notFound("Invoice not found");
      return mapInvoice(row);
    },

    delete: async (id: string) => {
      await db.delete(invoices).where(eq(invoices.id, id));
    },

    /**
     * Get full invoice data enriched with contact info for PDF generation.
     */
    getForPdf: async (id: string) => {
      const row = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .then((r) => r[0] ?? null);
      if (!row) throw notFound("Invoice not found");

      let contactName: string | null = null;
      let contactEmail: string | null = null;
      let companyName: string | null = null;

      if (row.contactId) {
        const contact = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, row.contactId))
          .then((r) => r[0] ?? null);
        contactName = contact?.name ?? null;
        contactEmail = contact?.email ?? null;
      }

      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, row.companyId))
        .then((r) => r[0] ?? null);
      companyName = company?.name ?? null;

      return { invoice: mapInvoice(row), contactName, contactEmail, companyName };
    },
  };
}
