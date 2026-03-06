import fs from "fs";
import { generateInvoiceForOrder } from "../../invoiceService";
import { storage } from "../../storage";
import { renderInvoiceBuffer } from "../InvoiceDocument";
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
jest.mock("../InvoiceDocument", () => ({
  renderInvoiceBuffer: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockStorage = storage as jest.Mocked<typeof storage>;
const mockRenderInvoiceBuffer = renderInvoiceBuffer as jest.MockedFunction<typeof renderInvoiceBuffer>;

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
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockStorage.getNextInvoiceNumber.mockResolvedValue("FV/2024/0001");
    mockRenderInvoiceBuffer.mockResolvedValue(Buffer.from("%PDF-mock"));
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

  it("renders pdf with expected arguments", async () => {
    await generateInvoiceForOrder(baseOrder);

    expect(mockRenderInvoiceBuffer).toHaveBeenCalledWith(
      baseOrder,
      undefined,
      "FV/2024/0001",
      expect.any(Date)
    );

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".pdf"),
      expect.any(Buffer)
    );
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

  it("propagates pdf render errors", async () => {
    mockRenderInvoiceBuffer.mockRejectedValue(new Error("render failed"));

    await expect(generateInvoiceForOrder(baseOrder)).rejects.toThrow("render failed");
  });
});
