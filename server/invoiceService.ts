import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { storage } from "./storage";
import { renderInvoiceHtml } from "./invoice/renderInvoiceHtml";

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

function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildInvoiceFilePaths(invoiceNumber: string, issuedAt: Date) {
  const parts = invoiceNumber.split("/");
  const prefix = parts[0] || "FV";
  const number = parts[parts.length - 1] || invoiceNumber.replace(/\//g, "-");
  const dateStamp = formatDateForFilename(issuedAt);
  const fileName = `Faktura-${prefix}-${dateStamp}-${number}.pdf`;
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
  const { storageDir, absolutePath, relativePath } = buildInvoiceFilePaths(invoiceNumber, issuedAt);

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
