import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesQuerySchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { invoiceService } from "../services/invoices.js";
import { buildInvoiceHtml, generatePdfBuffer } from "../services/invoice-pdf.js";
import { assertCompanyAccess } from "./authz.js";

export function invoiceRoutes(db: Db) {
  const router = Router();
  const svc = invoiceService(db);

  // List invoices for a company
  router.get("/companies/:companyId/invoices", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const queryResult = listInvoicesQuerySchema.safeParse(req.query);
    const query = queryResult.success ? queryResult.data : {};

    const result = await svc.list(companyId, query);
    res.json(result);
  });

  // Create an invoice
  router.post("/companies/:companyId/invoices", validate(createInvoiceSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const invoice = await svc.create(companyId, req.body);
    res.status(201).json(invoice);
  });

  // Get a specific invoice
  router.get("/invoices/:invoiceId", async (req, res) => {
    const invoiceId = req.params.invoiceId as string;
    const invoice = await svc.getById(invoiceId);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    assertCompanyAccess(req, invoice.companyId);
    res.json(invoice);
  });

  // Update an invoice
  router.patch("/invoices/:invoiceId", validate(updateInvoiceSchema), async (req, res) => {
    const invoiceId = req.params.invoiceId as string;
    const existing = await svc.getById(invoiceId);
    if (!existing) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const updated = await svc.update(invoiceId, req.body);
    res.json(updated);
  });

  // Delete an invoice
  router.delete("/invoices/:invoiceId", async (req, res) => {
    const invoiceId = req.params.invoiceId as string;
    const existing = await svc.getById(invoiceId);
    if (!existing) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    await svc.delete(invoiceId);
    res.status(204).send();
  });

  // Generate PDF — POST triggers generation (idempotent)
  router.post("/invoices/:invoiceId/generate-pdf", async (req, res) => {
    const invoiceId = req.params.invoiceId as string;
    const existing = await svc.getById(invoiceId);
    if (!existing) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const pdfData = await svc.getForPdf(invoiceId);
    const html = buildInvoiceHtml(pdfData);
    const { buffer, contentType } = await generatePdfBuffer(html);

    const filename = `${pdfData.invoice.invoiceNumber.replace(/\s+/g, "-")}.${contentType.includes("pdf") ? "pdf" : "html"}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  });

  // GET PDF — returns the generated PDF directly
  router.get("/invoices/:invoiceId/pdf", async (req, res) => {
    const invoiceId = req.params.invoiceId as string;
    const existing = await svc.getById(invoiceId);
    if (!existing) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const pdfData = await svc.getForPdf(invoiceId);
    const html = buildInvoiceHtml(pdfData);
    const { buffer, contentType } = await generatePdfBuffer(html);

    const filename = `${pdfData.invoice.invoiceNumber.replace(/\s+/g, "-")}.${contentType.includes("pdf") ? "pdf" : "html"}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  });

  return router;
}
