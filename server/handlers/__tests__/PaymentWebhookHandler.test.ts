import type { Request } from "express";
import { PaymentWebhookHandler } from "../PaymentWebhookHandler";
import { storage } from "../../storage";
import crypto from "crypto";
import { makeResponse } from "../../__tests__/helpers/httpMocks";
import {
  makeEmailServiceMock,
  makeStripeServiceMock,
  makePaymentStatusServiceMock,
} from "../../__tests__/helpers/serviceMocks";

jest.mock("../../storage", () => ({
  storage: {
    getOrder: jest.fn(),
    getOrderByPaymentReference: jest.fn(),
    getProduct: jest.fn(),
    updateOrder: jest.fn(),
    recordWebhookEvent: jest.fn(),
    hasProcessedWebhookEvent: jest.fn(),
  },
}));

jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    PAYMENT_WEBHOOK_SECRET: "test_webhook_secret",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
  },
}));

type MockedStorage = {
  getOrder: jest.Mock;
  getOrderByPaymentReference: jest.Mock;
  getProduct: jest.Mock;
  updateOrder: jest.Mock;
  recordWebhookEvent: jest.Mock;
  hasProcessedWebhookEvent: jest.Mock;
};

function makeStripePayload(status: string = "succeeded", orderId?: number) {
  return {
    id: "evt_test_123",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_test_123",
        status,
        amount: 10000,
        metadata: orderId ? { orderId: String(orderId) } : {},
      },
    },
  };
}

function makeGenericPayload(status: string, orderId?: number, paymentRef?: string) {
  return {
    eventId: "gen_evt_123",
    status,
    orderId,
    paymentReference: paymentRef,
    provider: "generic",
  };
}

describe("PaymentWebhookHandler", () => {
  const mockedStorage = storage as unknown as MockedStorage;

  let emailService: ReturnType<typeof makeEmailServiceMock>;
  let stripeService: ReturnType<typeof makeStripeServiceMock>;
  let paymentStatusService: ReturnType<typeof makePaymentStatusServiceMock>;

  beforeEach(() => {
    emailService = makeEmailServiceMock();
    stripeService = makeStripeServiceMock();
    stripeService.isAvailable.mockReturnValue(true);
    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(null);
    paymentStatusService = makePaymentStatusServiceMock();
    paymentStatusService.applyPaymentStatusUpdate.mockImplementation(async (params: any) => ({
      ...params.order,
      status: "PAID",
    }));
    mockedStorage.recordWebhookEvent.mockResolvedValue(undefined);
    mockedStorage.hasProcessedWebhookEvent.mockResolvedValue(false);
    mockedStorage.updateOrder.mockImplementation(async (id: number, data: any) => ({ id, ...data }));
  });

  describe("Signature Verification", () => {
    it("returns 401 when Stripe signature is invalid", async () => {
      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw new Error("Invalid signature");
          }),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const payload = makeStripePayload();
      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "invalid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid webhook signature" });
      expect(mockedStorage.recordWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          signatureValid: false,
          status: "INVALID_SIGNATURE",
        })
      );
    });

    it("processes webhook when Stripe signature is valid", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.webhooks.constructEvent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("bypasses Stripe signature verification in mock mode", async () => {
      stripeService.isMockMode.mockReturnValue(true);

      const payload = makeStripePayload("succeeded", 1);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "mock_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("processes webhook when HMAC signature is valid", async () => {
      const payload = makeGenericPayload("COMPLETED", 1, "ref_123");
      const rawBody = Buffer.from(JSON.stringify(payload));

      const validSignature = crypto
        .createHmac("sha256", "test_webhook_secret")
        .update(rawBody)
        .digest("hex");

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 100,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: rawBody,
        headers: {
          "x-webhook-signature": validSignature,
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("returns 401 when HMAC signature is invalid", async () => {
      const payload = makeGenericPayload("COMPLETED", 1, "ref_123");
      const rawBody = Buffer.from(JSON.stringify(payload));

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: rawBody,
        headers: {
          "x-webhook-signature": "invalid_hmac_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid webhook signature" });
    });

    it("returns 401 when no signature headers present", async () => {
      const payload = makeGenericPayload("COMPLETED", 1, "ref_123");
      const rawBody = Buffer.from(JSON.stringify(payload));

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: rawBody,
        headers: {},
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid webhook signature" });
    });

    it("handles HMAC signature with prefix format", async () => {
      const payload = makeGenericPayload("COMPLETED", 1, "ref_123");
      const rawBody = Buffer.from(JSON.stringify(payload));

      const signature = crypto
        .createHmac("sha256", "test_webhook_secret")
        .update(rawBody)
        .digest("hex");

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 100,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: rawBody,
        headers: {
          "x-signature": `sha256=${signature}`,
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("Event Filtering", () => {
    it("ignores unsupported Stripe event types", async () => {
      const payload = {
        id: "evt_test",
        type: "payment_intent.created",
        data: {
          object: {
            id: "pi_test",
            status: "processing",
          },
        },
      };

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, ignored: "unsupported_event" });
      expect(mockedStorage.getOrder).not.toHaveBeenCalled();
    });

    it("processes payment_intent.succeeded events", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(paymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalled();
    });
  });

  describe("Deduplication", () => {
    it("returns 200 with duplicate flag for already processed events", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);
      mockedStorage.hasProcessedWebhookEvent.mockResolvedValue(true);

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, duplicate: true });
      expect(mockedStorage.getOrder).not.toHaveBeenCalled();
      expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    });

    it("processes new events normally", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);
      mockedStorage.hasProcessedWebhookEvent.mockResolvedValue(false);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(paymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalled();
    });
  });

  describe("Order Lookup", () => {
    it("finds order by orderId from metadata", async () => {
      const payload = makeStripePayload("succeeded", 42);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 42,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getOrder).toHaveBeenCalledWith(42);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("finds order by payment reference when orderId not in metadata", async () => {
      const payload = makeStripePayload("succeeded");

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue(undefined);
      mockedStorage.getOrderByPaymentReference.mockResolvedValue({
        id: 5,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
        paymentReference: "pi_test_123",
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getOrderByPaymentReference).toHaveBeenCalledWith("pi_test_123");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 202 when order not found", async () => {
      const payload = makeStripePayload("succeeded");

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue(undefined);
      mockedStorage.getOrderByPaymentReference.mockResolvedValue(undefined);

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ received: true, order: "not_found" });
      expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    });

    it("returns 200 with already_paid when order is already PAID", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAID",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, order: "already_paid" });
      expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Amount Reconciliation", () => {
    it("updates order total from Stripe amount", async () => {
      const payload = makeStripePayload("succeeded", 1);
      payload.data.object.amount = 15000;

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          total: 15000,
          deliveryCost: 5000,
        })
      );
    });

    it("extracts delivery cost from Stripe metadata", async () => {
      const payload = makeStripePayload("succeeded", 1);
      payload.data.object.amount = 12000;
      (payload.data.object.metadata as any).shippingCost = 2000;

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          total: 12000,
          deliveryCost: 2000,
        })
      );
    });

    it("rounds delivery cost from metadata", async () => {
      const payload = makeStripePayload("succeeded", 1);
      payload.data.object.amount = 12500;
      (payload.data.object.metadata as any).shippingCost = 2500.7;

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          deliveryCost: 2501,
        })
      );
    });

    it("skips update when amounts match", async () => {
      const payload = makeStripePayload("succeeded", 1);
      payload.data.object.amount = 10000;

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).not.toHaveBeenCalled();
    });

    it("handles order without product", async () => {
      const payload = makeStripePayload("succeeded", 1);
      payload.data.object.amount = 15000;

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: null,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue(undefined);

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          total: 15000,
          deliveryCost: 5000,
        })
      );
    });
  });

  describe("Payment Processing", () => {
    it("calls paymentStatusService with correct parameters", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000, name: "Test Product" });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(paymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalledWith({
        order: expect.objectContaining({ id: 1 }),
        status: "COMPLETED",
        paymentReference: "pi_test_123",
        paymentProvider: "stripe",
        product: expect.objectContaining({ id: 1, name: "Test Product" }),
      });
    });

    it("records successful webhook event when payment status is PAID", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.recordWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "evt_test_123",
          provider: "stripe",
          status: "COMPLETED",
          paymentReference: "pi_test_123",
          orderId: 1,
          signatureValid: true,
        })
      );
    });

    it("returns 200 after successful processing", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const rawBody = Buffer.from(JSON.stringify(payload));

      const req = {
        body: rawBody,
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("Status Mapping", () => {
    it("maps generic status strings to COMPLETED", async () => {
      const statusVariations = ["COMPLETED", "SUCCESS", "PAID", "SUCCEEDED"];

      for (const status of statusVariations) {
        jest.clearAllMocks();

        const payload = makeGenericPayload(status, 1, "ref_123");
        const rawBody = Buffer.from(JSON.stringify(payload));

        const validSignature = crypto
          .createHmac("sha256", "test_webhook_secret")
          .update(rawBody)
          .digest("hex");

        mockedStorage.getOrder.mockResolvedValue({
          id: 1,
          status: "PAYMENT_PENDING",
          total: 100,
          productId: 1,
          quantity: 1,
          deliveryCost: 0,
        });

        mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100 });

        const handler = PaymentWebhookHandler({
          emailService: emailService as any,
          stripeService: stripeService as any,
          paymentStatusService: paymentStatusService as any,
        });

        const req = {
          body: rawBody,
          headers: {
            "x-webhook-signature": validSignature,
          },
        } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(paymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "COMPLETED",
          })
        );
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles non-Buffer request body", async () => {
      const payload = makeStripePayload("succeeded", 1);

      const stripeClient = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(payload),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 10000,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 10000 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: payload, // Not a Buffer
        headers: {
          "stripe-signature": "valid_signature",
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles malformed JSON in HMAC request", async () => {
      const rawBody = Buffer.from("invalid json{{{");

      const validSignature = crypto
        .createHmac("sha256", "test_webhook_secret")
        .update(rawBody)
        .digest("hex");

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: rawBody,
        headers: {
          "x-webhook-signature": validSignature,
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid webhook signature" });
    });

    it("generates event ID from raw body when not in payload", async () => {
      const payload = { status: "COMPLETED", orderId: 1, paymentReference: "ref_123" };
      const rawBody = Buffer.from(JSON.stringify(payload));

      const validSignature = crypto
        .createHmac("sha256", "test_webhook_secret")
        .update(rawBody)
        .digest("hex");

      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        status: "PAYMENT_PENDING",
        total: 100,
        productId: 1,
        quantity: 1,
        deliveryCost: 0,
        paymentReference: "ref_123",
      });

      mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100 });

      const handler = PaymentWebhookHandler({
        emailService: emailService as any,
        stripeService: stripeService as any,
        paymentStatusService: paymentStatusService as any,
      });

      const req = {
        body: rawBody,
        headers: {
          "x-webhook-signature": validSignature,
        },
      } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.recordWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        })
      );
    });
  });
});
