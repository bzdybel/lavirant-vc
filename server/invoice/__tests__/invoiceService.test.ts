import fs from "fs";
import { generateInvoiceForOrder } from "../../invoiceService";
import { storage } from "../../storage";
import { renderInvoiceHtml } from "../renderInvoiceHtml";
import { AppConfig } from "../../config/appConfig";
import type { Order } from "../../../shared/types/order";

jest.mock("fs");
jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    INVOICE_STORAGE_DIR: "./storage/invoices",
  },
}));
jest.mock("../../storage", () => ({
  storage: {
    getNextInvoiceNumber: jest.fn(),
  },
}));
jest.mock("../renderInvoiceHtml", () => ({
  renderInvoiceHtml: jest.fn(),
}));

const launchMock = jest.fn();
jest.mock("puppeteer", () => ({
  __esModule: true,
  default: {
    launch: (...args: unknown[]) => launchMock(...args),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockStorage = storage as jest.Mocked<typeof storage>;
const mockRenderInvoiceHtml = renderInvoiceHtml as jest.MockedFunction<typeof renderInvoiceHtml>;

const baseOrder: Order = {
  id: 1,
  quantity: 1,
  total: 199,
  status: "PAID",
  firstName: "Jan",
  lastName: "Nowak",
  email: "jan@example.com",
  phone: "+48123123123",
  address: "Sezamkowa 1",
  city: "Warszawa",
  postalCode: "00-001",
  country: "PL",
  createdAt: new Date().toISOString(),
};

describe("generateInvoiceForOrder", () => {
  const originalInvoiceDir = AppConfig.INVOICE_STORAGE_DIR;

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as never);
    mockStorage.getNextInvoiceNumber.mockResolvedValue("FV/2024/0001");
    mockRenderInvoiceHtml.mockReturnValue("<html>invoice</html>");

    const page = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(undefined),
    };

    launchMock.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    Object.defineProperty(AppConfig, "INVOICE_STORAGE_DIR", {
      value: originalInvoiceDir,
      configurable: true,
    });
  });

  it("returns existing invoice metadata without regeneration", async () => {
    const orderWithInvoice: Order = {
      ...baseOrder,
      invoiceNumber: "FV/2024/0003",
      invoicePdfPath: "storage/invoices/existing.pdf",
      invoiceIssuedAt: "2024-01-01T10:00:00.000Z",
    };

    const result = await generateInvoiceForOrder(orderWithInvoice);

    expect(result.invoiceNumber).toBe("FV/2024/0003");
    expect(result.invoicePdfPath).toBe("storage/invoices/existing.pdf");
    expect(mockStorage.getNextInvoiceNumber).not.toHaveBeenCalled();
    expect(launchMock).not.toHaveBeenCalled();
  });

  it("generates invoice number when missing", async () => {
    const result = await generateInvoiceForOrder(baseOrder);

    expect(mockStorage.getNextInvoiceNumber).toHaveBeenCalledTimes(1);
    expect(result.invoiceNumber).toBe("FV/2024/0001");
    expect(result.invoicePdfPath).toContain("Faktura-FV-");
    expect(result.invoicePdfPath).toContain(".pdf");
  });

  it("uses order invoice number when provided", async () => {
    await generateInvoiceForOrder({ ...baseOrder, invoiceNumber: "FV/2024/9999" });

    expect(mockStorage.getNextInvoiceNumber).not.toHaveBeenCalled();
  });

  it("creates storage directory when it does not exist", async () => {
    mockFs.existsSync.mockReturnValue(false);

    await generateInvoiceForOrder(baseOrder);

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it("does not create directory when already exists", async () => {
    mockFs.existsSync.mockReturnValue(true);

    await generateInvoiceForOrder(baseOrder);

    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  it("renders html and creates pdf with expected options", async () => {
    await generateInvoiceForOrder(baseOrder);

    expect(mockRenderInvoiceHtml).toHaveBeenCalledWith(
      baseOrder,
      undefined,
      "FV/2024/0001",
      expect.any(Date)
    );

    expect(launchMock).toHaveBeenCalledWith({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  });

  it("uses custom storage directory when configured", async () => {
    Object.defineProperty(AppConfig, "INVOICE_STORAGE_DIR", {
      value: "./tmp/invoices",
      configurable: true,
    });

    const result = await generateInvoiceForOrder(baseOrder);

    expect(result.invoicePdfPath).toContain("tmp/invoices");
  });

  it("propagates getNextInvoiceNumber errors", async () => {
    mockStorage.getNextInvoiceNumber.mockRejectedValue(new Error("db down"));

    await expect(generateInvoiceForOrder(baseOrder)).rejects.toThrow("db down");
  });

  it("propagates puppeteer launch errors", async () => {
    launchMock.mockRejectedValue(new Error("launch failed"));

    await expect(generateInvoiceForOrder(baseOrder)).rejects.toThrow("launch failed");
  });
});
