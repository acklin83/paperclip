import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { Invoice } from "@paperclipai/shared";

const execFileAsync = promisify(execFile);

function formatCHF(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatBps(bps: number): string {
  return (bps / 100).toFixed(1);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function buildInvoiceHtml(opts: {
  invoice: Invoice;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
}): string {
  const { invoice, companyName, contactName, contactEmail } = opts;
  const isQuote = invoice.invoiceType === "quote";
  const docLabel = isQuote ? "Offerte" : "Rechnung";

  const lineRows = invoice.lineItems
    .map((item) => {
      const lineTotal = Math.round(item.quantity * item.unitPriceCents);
      return `
      <tr>
        <td class="desc">${escapeHtml(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">CHF ${formatCHF(item.unitPriceCents)}</td>
        <td class="num">CHF ${formatCHF(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 11pt; color: #111; padding: 40px 48px; }
  h1 { font-size: 22pt; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 32px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .header-left h2 { font-size: 14pt; font-weight: 600; margin-bottom: 4px; }
  .header-right { text-align: right; }
  .section-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .bill-to { margin-bottom: 32px; }
  .bill-to p { font-size: 11pt; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #f0f0f0; }
  thead th { padding: 8px 10px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid #e8e8e8; }
  tbody td { padding: 8px 10px; vertical-align: top; }
  td.desc { width: 50%; }
  td.num { text-align: right; white-space: nowrap; }
  .totals { width: 280px; margin-left: auto; }
  .totals table { margin-bottom: 0; }
  .totals td { padding: 5px 10px; }
  .totals .label { font-size: 10pt; color: #555; }
  .totals .value { text-align: right; font-size: 10pt; }
  .totals .total-row td { font-weight: 700; font-size: 12pt; border-top: 2px solid #111; padding-top: 8px; }
  .title-section { margin-bottom: 24px; }
  .title-section h1 { font-size: 18pt; }
  .title-section .sub { font-size: 10pt; color: #555; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: #e8f5e9; color: #2e7d32; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 8pt; color: #888; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h2>${escapeHtml(companyName ?? "Störsender Studio")}</h2>
    </div>
    <div class="header-right">
      <div class="section-label">${docLabel}-Nr.</div>
      <strong>${escapeHtml(invoice.invoiceNumber)}</strong><br/>
      <div class="section-label" style="margin-top:8px">Datum</div>
      ${formatDate(invoice.issuedAt ?? invoice.createdAt)}<br/>
      ${invoice.dueAt ? `<div class="section-label" style="margin-top:8px">Fällig am</div>${formatDate(invoice.dueAt)}` : ""}
    </div>
  </div>

  ${contactName || contactEmail ? `
  <div class="bill-to">
    <div class="section-label">An</div>
    <p>
      ${contactName ? `<strong>${escapeHtml(contactName)}</strong><br/>` : ""}
      ${contactEmail ? escapeHtml(contactEmail) : ""}
    </p>
  </div>` : ""}

  <div class="title-section">
    <h1>${escapeHtml(invoice.title)}</h1>
    ${invoice.description ? `<div class="sub">${escapeHtml(invoice.description)}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Beschreibung</th>
        <th class="num">Menge</th>
        <th class="num">Einzelpreis</th>
        <th class="num">Betrag</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px;">Keine Positionen</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="label">Subtotal</td>
        <td class="value">CHF ${formatCHF(invoice.subtotalCents)}</td>
      </tr>
      <tr>
        <td class="label">MwSt ${formatBps(invoice.vatRateBps)}%</td>
        <td class="value">CHF ${formatCHF(invoice.vatAmountCents)}</td>
      </tr>
      <tr class="total-row">
        <td class="label">Total CHF</td>
        <td class="value">CHF ${formatCHF(invoice.totalCents)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    ${isQuote ? "Diese Offerte ist 30 Tage gültig." : "Bitte überweisen Sie den Betrag bis zum angegebenen Fälligkeitsdatum."}
    &nbsp;|&nbsp; Erstellt mit Paperclip
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate PDF from HTML.
 * Tries WeasyPrint first; falls back to returning the HTML as text/html if unavailable.
 */
export async function generatePdfBuffer(html: string): Promise<{ buffer: Buffer; contentType: string }> {
  // Try WeasyPrint
  const weasyAvailable = await checkWeasyPrintAvailable();

  if (weasyAvailable) {
    const id = randomBytes(8).toString("hex");
    const htmlPath = join(tmpdir(), `paperclip-invoice-${id}.html`);
    const pdfPath = join(tmpdir(), `paperclip-invoice-${id}.pdf`);
    try {
      await writeFile(htmlPath, html, "utf8");
      await execFileAsync("weasyprint", [htmlPath, pdfPath], { timeout: 30_000 });
      const buffer = await readFile(pdfPath);
      return { buffer, contentType: "application/pdf" };
    } finally {
      // Clean up temp files (best-effort)
      unlink(htmlPath).catch(() => {});
      unlink(pdfPath).catch(() => {});
    }
  }

  // HTML fallback
  return { buffer: Buffer.from(html, "utf8"), contentType: "text/html; charset=utf-8" };
}

let _weasyChecked = false;
let _weasyAvailable = false;

async function checkWeasyPrintAvailable(): Promise<boolean> {
  if (_weasyChecked) return _weasyAvailable;
  try {
    await execFileAsync("weasyprint", ["--version"], { timeout: 5_000 });
    _weasyAvailable = true;
  } catch {
    _weasyAvailable = false;
  }
  _weasyChecked = true;
  return _weasyAvailable;
}
