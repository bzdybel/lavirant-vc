import fs from "fs";
import path from "path";
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { storage } from "./storage";
import { renderInvoiceBuffer } from "./invoice/InvoiceDocument";
import { AppConfig } from "./config/appConfig";
import { logger } from "./utils/logger";
import { LogPrefix } from "./constants/logPrefixes";

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



function getInvoiceStorageDir(): string {
  return AppConfig.INVOICE_STORAGE_DIR
    ? path.resolve(AppConfig.INVOICE_STORAGE_DIR)
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

  const buffer = await renderInvoiceBuffer(order, product, invoiceNumber, issuedAt);
  fs.writeFileSync(absolutePath, buffer);

  logger.info({ message: `${LogPrefix.INVOICE} Invoice generated`, invoiceNumber, orderId: order.id });

  return {
    invoiceNumber,
    invoicePdfPath: relativePath,
    invoiceIssuedAt: issuedAt.toISOString(),
    invoicePdfAbsolutePath: absolutePath,
  };
}
