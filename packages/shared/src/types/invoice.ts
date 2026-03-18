export type InvoiceType = "invoice" | "quote";

export type InvoiceStatus = "draft" | "sent" | "accepted" | "rejected" | "paid" | "cancelled";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  contactId: string | null;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  invoiceNumber: string;
  title: string;
  description: string | null;
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  vatRateBps: number;
  vatAmountCents: number;
  totalCents: number;
  portalToken: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}
