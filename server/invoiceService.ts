import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import type { Order, Product } from "@shared/schema";
import { storage } from "./storage";

interface InvoiceGenerationResult {
  invoiceNumber: string;
  invoicePdfPath: string;
  invoiceIssuedAt: string;
  invoicePdfAbsolutePath: string;
}

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), "storage", "invoices");

function ensureDirectoryExists(dirPath: string) {
  if (fs.existsSync(dirPath)) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} zł`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function renderInvoiceHtml(order: Order, product: Product | undefined, invoiceNumber: string, issuedAt: Date): string {
  const sellerName = process.env.INVOICE_SELLER_NAME || "Lavirant";
  const sellerAddress = process.env.INVOICE_SELLER_ADDRESS || "";
  const sellerNip = process.env.INVOICE_SELLER_NIP || "";
  const sellerEmail = process.env.INVOICE_SELLER_EMAIL || "zamowienia@lavirant.pl";

  const buyerName = `${order.firstName} ${order.lastName}`;
  const buyerAddress = `${order.address}, ${order.postalCode} ${order.city}, ${order.country}`;

  const itemName = product?.name || "Lavirant";
  const unitPrice = order.quantity > 0 ? Math.round(order.total / order.quantity) : order.total;

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Faktura ${invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin-bottom: 24px; font-size: 13px; color: #555; }
    .section { margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; gap: 24px; }
    .box { flex: 1; border: 1px solid #e5e5e5; padding: 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f7f7f7; }
    .total { text-align: right; font-weight: bold; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Faktura VAT</h1>
  <div class="meta">
    Numer: ${invoiceNumber}<br />
    Data wystawienia: ${formatDate(issuedAt)}
  </div>

  <div class="section row">
    <div class="box">
      <strong>Sprzedawca</strong><br />
      ${sellerName}<br />
      ${sellerAddress ? `${sellerAddress}<br />` : ""}
      ${sellerNip ? `NIP: ${sellerNip}<br />` : ""}
      ${sellerEmail}
    </div>
    <div class="box">
      <strong>Nabywca</strong><br />
      ${buyerName}<br />
      ${buyerAddress}<br />
      ${order.email}
    </div>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Produkt</th>
          <th>Ilość</th>
          <th>Cena jednostkowa</th>
          <th>Razem</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${itemName}</td>
          <td>${order.quantity}</td>
          <td>${formatPrice(unitPrice)}</td>
          <td>${formatPrice(order.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section total">Suma do zapłaty: ${formatPrice(order.total)}</div>
</body>
</html>
  `;
}

interface PdfRenderer {
  render(html: string, outputPath: string): Promise<void>;
}

class PuppeteerPdfRenderer implements PdfRenderer {
  async render(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.pdf({ path: outputPath, format: "A4", printBackground: true });
    } finally {
      await browser.close();
    }
  }
}

const pdfRenderer: PdfRenderer = new PuppeteerPdfRenderer();

function getInvoiceStorageDir(): string {
  return process.env.INVOICE_STORAGE_DIR
    ? path.resolve(process.env.INVOICE_STORAGE_DIR)
    : DEFAULT_STORAGE_DIR;
}

function buildInvoiceFilePaths(invoiceNumber: string) {
  const sanitized = invoiceNumber.replace(/\//g, "-");
  const fileName = `invoice-${sanitized}.pdf`;
  const storageDir = getInvoiceStorageDir();
  const absolutePath = path.join(storageDir, fileName);
  const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");

  return { storageDir, absolutePath, relativePath };
}

export async function generateInvoiceForOrder(order: Order, product?: Product): Promise<InvoiceGenerationResult> {
  if (order.invoiceNumber && order.invoicePdfPath && order.invoiceIssuedAt) {
    const absolutePath = path.isAbsolute(order.invoicePdfPath)
      ? order.invoicePdfPath
      : path.join(process.cwd(), order.invoicePdfPath);

    return {
      invoiceNumber: order.invoiceNumber,
      invoicePdfPath: order.invoicePdfPath,
      invoiceIssuedAt: order.invoiceIssuedAt,
      invoicePdfAbsolutePath: absolutePath,
    };
  }

  const issuedAt = new Date();
  const invoiceNumber = order.invoiceNumber || await storage.getNextInvoiceNumber(issuedAt);
  const { storageDir, absolutePath, relativePath } = buildInvoiceFilePaths(invoiceNumber);

  ensureDirectoryExists(storageDir);

  const html = renderInvoiceHtml(order, product, invoiceNumber, issuedAt);
  await pdfRenderer.render(html, absolutePath);

  return {
    invoiceNumber,
    invoicePdfPath: relativePath,
    invoiceIssuedAt: issuedAt.toISOString(),
    invoicePdfAbsolutePath: absolutePath,
  };
}
