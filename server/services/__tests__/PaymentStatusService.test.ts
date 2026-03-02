import { PaymentStatusService } from "../PaymentStatusService";
import { storage } from "../../storage";
import { generateInvoiceForOrder } from "../../invoiceService";
import { PaymentWebhookStatus } from "../../constants/paymentStatus";

jest.mock("../../storage", () => ({
  storage: {
    updateOrder: jest.fn(),
  },
}));

jest.mock("../../invoiceService", () => ({
  generateInvoiceForOrder: jest.fn(),
}));

type MockedStorage = typeof storage & {
  updateOrder: jest.Mock;
};



describe("PaymentStatusService", () => {
  const mockedStorage = storage as MockedStorage;
  const mockedInvoiceService = generateInvoiceForOrder as unknown as jest.Mock;

  const emailService = {
    sendPaidInvoiceEmail: jest.fn(),
  };

  const shippingService = {
    onOrderPaid: jest.fn(),
  };

  let service: PaymentStatusService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentStatusService(emailService as any, shippingService as any);
    emailService.sendPaidInvoiceEmail.mockResolvedValue(true);
    shippingService.onOrderPaid.mockResolvedValue({});
    mockedStorage.updateOrder.mockImplementation(async (id, data) => ({ id, ...data }));
    mockedInvoiceService.mockResolvedValue({
      invoiceNumber: "INV-001",
      invoicePdfPath: "invoices/inv-001.pdf",
      invoicePdfAbsolutePath: "/abs/path/invoices/inv-001.pdf",
      invoiceIssuedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  describe("Status Handling", () => {
    it("handles PENDING status", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: null,
      };

      const result = await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
        paymentReference: "ref_123",
        paymentProvider: "stripe",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "PAYMENT_PENDING",
          paymentPendingAt: expect.any(String),
          paymentReference: "ref_123",
          paymentProvider: "stripe",
        })
      );
      expect(result).toHaveProperty("status");
    });

    it("handles FAILED status", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: null,
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.FAILED,
        paymentReference: "ref_456",
        paymentProvider: "stripe",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "FAILED",
          paymentReference: "ref_456",
          paymentProvider: "stripe",
        })
      );
    });

    it("handles CANCELED status", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: null,
        paymentProvider: null,
      };

       await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.CANCELED,
        paymentReference: "ref_789",
        paymentProvider: "stripe",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "FAILED",
          paymentReference: "ref_789",
          paymentProvider: "stripe",
        })
      );
    });

    it("handles COMPLETED status and triggers workflows", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: null,
        paymentProvider: null,
        emailSentAt: null,
      };

       await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
        paymentReference: "ref_completed",
        paymentProvider: "stripe",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "PAID",
          paymentConfirmedAt: expect.any(String),
          paymentReference: "ref_completed",
          paymentProvider: "stripe",
        })
      );

      expect(shippingService.onOrderPaid).toHaveBeenCalled();
      expect(mockedInvoiceService).toHaveBeenCalled();
      expect(emailService.sendPaidInvoiceEmail).toHaveBeenCalled();
    });

    it("returns order unchanged for UNKNOWN status", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
      };

      const result = await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.UNKNOWN,
      });

      expect(mockedStorage.updateOrder).not.toHaveBeenCalled();
      expect(result).toBe(order);
    });
  });

  describe("Reference Resolution", () => {
    it("uses order.paymentReference if available", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: "order_ref",
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
        paymentReference: "param_ref",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentReference: "order_ref",
        })
      );
    });

    it("falls back to parameter paymentReference", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
        paymentReference: "param_ref",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentReference: "param_ref",
        })
      );
    });

    it("returns null if neither reference available", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentReference: null,
        })
      );
    });
  });

  describe("Provider Resolution", () => {
    it("uses order.paymentProvider if available", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: "order_provider",
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
        paymentProvider: "param_provider",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentProvider: "order_provider",
        })
      );
    });

    it("falls back to parameter paymentProvider", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
        paymentProvider: "param_provider",
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentProvider: "param_provider",
        })
      );
    });

    it("returns null if neither provider available", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentProvider: null,
        })
      );
    });
  });

  describe("Post-Payment Workflow", () => {
    it("creates shipment via shippingService", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      expect(shippingService.onOrderPaid).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 })
      );
    });

    it("generates invoice for paid order", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      const product: any = {
        id: 1,
        name: "Product A",
        price: 100,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
        product,
      });

      expect(mockedInvoiceService).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        product
      );

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          invoiceNumber: "INV-001",
          invoicePdfPath: "invoices/inv-001.pdf",
          invoiceIssuedAt: "2026-01-01T00:00:00.000Z",
        })
      );
    });

    it("sends paid invoice email with correct parameters", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      const product: any = {
        id: 1,
        name: "Product A",
        price: 100,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
        product,
      });

      expect(emailService.sendPaidInvoiceEmail).toHaveBeenCalledWith({
        order: expect.objectContaining({ id: 1 }),
        product,
        invoiceNumber: "INV-001",
        invoicePdfPath: "/abs/path/invoices/inv-001.pdf",
      });
    });

    it("skips email if already sent", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: "2026-01-01T00:00:00.000Z",
      };

      // First call: update to PAID status
      mockedStorage.updateOrder.mockResolvedValueOnce({
        ...order,
        status: "PAID",
        paymentConfirmedAt: expect.any(String),
      });

      // Second call: update with invoice info - returns order WITH emailSentAt
      mockedStorage.updateOrder.mockResolvedValueOnce({
        ...order,
        status: "PAID",
        invoiceNumber: "INV-001",
        invoicePdfPath: "invoices/inv-001.pdf",
        invoiceIssuedAt: "2026-01-01T00:00:00.000Z",
        emailSentAt: "2026-01-01T00:00:00.000Z",
      });

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      expect(emailService.sendPaidInvoiceEmail).not.toHaveBeenCalled();
    });

    it("updates emailSentAt when email sent successfully", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      // First call: update to PAID status
      // Second call: update with invoice info
      // Third call: update emailSentAt
      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          emailSentAt: expect.any(String),
        })
      );
    });

    it("does not update emailSentAt when email fails", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      emailService.sendPaidInvoiceEmail.mockResolvedValue(false);

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      const updateCalls = mockedStorage.updateOrder.mock.calls;
      const emailSentAtUpdates = updateCalls.filter((call: any) => call[1].emailSentAt);
      expect(emailSentAtUpdates).toHaveLength(0);
    });
  });

  describe("Idempotency", () => {
    it("skips status update if already in target status", async () => {
      const order: any = {
        id: 1,
        status: "PAID",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      expect(mockedStorage.updateOrder).not.toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "PAID" })
      );
    });

    it("preserves paymentPendingAt when already set", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentPendingAt: "2026-01-01T00:00:00.000Z",
        paymentReference: null,
        paymentProvider: null,
      };

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentPendingAt: "2026-01-01T00:00:00.000Z",
        })
      );
    });

    it("preserves paymentConfirmedAt when already set", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentConfirmedAt: "2026-01-01T00:00:00.000Z",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: "2026-01-01T00:00:00.000Z",
      };

      mockedStorage.updateOrder.mockResolvedValueOnce({
        ...order,
        status: "PAID",
      });

      await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          paymentConfirmedAt: "2026-01-01T00:00:00.000Z",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("returns original order when updateOrder returns null", async () => {
      const order: any = {
        id: 1,
        status: "CREATED",
        paymentReference: null,
        paymentProvider: null,
      };

      mockedStorage.updateOrder.mockResolvedValue(null);

      const result = await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.PENDING,
      });

      expect(result).toBe(order);
    });

    it("returns invoiced order when final email update returns null", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      let callCount = 0;
      mockedStorage.updateOrder.mockImplementation(async (id, data) => {
        callCount++;
        if (callCount === 3) {
          return null; // Final emailSentAt update fails
        }
        return { id, ...data };
      });

      const result = await service.applyPaymentStatusUpdate({
        order,
        status: PaymentWebhookStatus.COMPLETED,
      });

      expect(result).toHaveProperty("id", 1);
      expect(result).not.toHaveProperty("emailSentAt");
    });

    it("continues workflow even if shipping service fails", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      shippingService.onOrderPaid.mockRejectedValue(new Error("Shipping failed"));

      await expect(
        service.applyPaymentStatusUpdate({
          order,
          status: PaymentWebhookStatus.COMPLETED,
        })
      ).rejects.toThrow("Shipping failed");

      expect(shippingService.onOrderPaid).toHaveBeenCalled();
      expect(mockedInvoiceService).not.toHaveBeenCalled();
    });

    it("continues workflow even if invoice generation fails", async () => {
      const order: any = {
        id: 1,
        status: "PAYMENT_PENDING",
        paymentReference: "ref_1",
        paymentProvider: "stripe",
        emailSentAt: null,
      };

      mockedInvoiceService.mockRejectedValue(new Error("Invoice generation failed"));

      await expect(
        service.applyPaymentStatusUpdate({
          order,
          status: PaymentWebhookStatus.COMPLETED,
        })
      ).rejects.toThrow("Invoice generation failed");

      expect(shippingService.onOrderPaid).toHaveBeenCalled();
      expect(mockedInvoiceService).toHaveBeenCalled();
      expect(emailService.sendPaidInvoiceEmail).not.toHaveBeenCalled();
    });
  });
});
