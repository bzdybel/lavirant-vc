import type { Request, Response } from "express";
import { CreatePaymentIntentHandler } from "../CreatePaymentIntentHandler";
import { storage } from "../../storage";
import { makeResponse, makeRequest } from "../../__tests__/helpers/httpMocks";
import { makeStripeServiceMock } from "../../__tests__/helpers/serviceMocks";

jest.mock("../../storage", () => ({
  storage: {
    getOrder: jest.fn(),
    updateOrder: jest.fn(),
  },
}));

type MockedStorage = {
  getOrder: jest.Mock;
  updateOrder: jest.Mock;
};

describe("CreatePaymentIntentHandler", () => {
  const mockedStorage = storage as unknown as MockedStorage;

  let stripeService: ReturnType<typeof makeStripeServiceMock>;

  beforeEach(() => {
    stripeService = makeStripeServiceMock();
    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(null);
    mockedStorage.updateOrder.mockResolvedValue({});
  });

  describe("Validation", () => {
    it("returns 400 when amount is missing", async () => {
      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: {} } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });

    it("returns 400 when amount is zero", async () => {
      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 0 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });

    it("returns 400 when amount is negative", async () => {
      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: -100 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });

    it("returns 400 when amount is NaN", async () => {
      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: NaN } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });
  });

  describe("Existing Payment Intent", () => {
    it("returns existing payment intent when order has one", async () => {
      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        paymentIntentId: "pi_existing",
      });

      const stripeClient = {
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue({
            id: "pi_existing",
            client_secret: "secret_existing",
          }),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getOrder).toHaveBeenCalledWith(1);
      expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalledWith("pi_existing");
      expect(res.json).toHaveBeenCalledWith({
        clientSecret: "secret_existing",
        paymentIntentId: "pi_existing",
      });
      expect(res.status).not.toHaveBeenCalled();
    });

    it("creates new payment intent when order has no paymentIntentId", async () => {
      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        paymentIntentId: null,
      });

      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clientSecret: expect.any(String),
          paymentIntentId: expect.stringContaining("mock_pi_"),
        })
      );
    });

    it("creates new payment intent when order does not exist", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);

      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 999 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clientSecret: expect.any(String),
          paymentIntentId: expect.stringContaining("mock_pi_"),
        })
      );
    });

    it("creates new payment intent when stripe client is not available", async () => {
      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        paymentIntentId: "pi_123",
      });

      stripeService.getClient.mockReturnValue(null);
      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clientSecret: expect.any(String),
          paymentIntentId: expect.stringContaining("mock_pi_"),
        })
      );
    });
  });

  describe("Amount Calculation", () => {
    it("uses itemsTotal + shippingCost when provided", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_123",
            client_secret: "secret_123",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = {
        body: {
          amount: 500,
          itemsTotal: 300,
          shippingCost: 50,
        },
      } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 35000, // (300 + 50) * 100
          metadata: expect.objectContaining({
            itemsTotal: "300",
            shippingCost: "50",
            finalAmount: "350",
          }),
        })
      );
    });

    it("falls back to amount when itemsTotal and shippingCost are not provided", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_456",
            client_secret: "secret_456",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 200 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 20000, // 200 * 100
          metadata: expect.objectContaining({
            itemsTotal: "0",
            shippingCost: "0",
            finalAmount: "200",
          }),
        })
      );
    });

    it("uses 0 for non-finite itemsTotal", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_789",
            client_secret: "secret_789",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = {
        body: {
          amount: 100,
          itemsTotal: NaN,
          shippingCost: 20,
        },
      } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2000, // (0 + 20) * 100
          metadata: expect.objectContaining({
            itemsTotal: "0",
            shippingCost: "20",
            finalAmount: "20",
          }),
        })
      );
    });

    it("uses 0 for non-finite shippingCost", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_abc",
            client_secret: "secret_abc",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = {
        body: {
          amount: 100,
          itemsTotal: 80,
          shippingCost: undefined,
        },
      } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 8000, // (80 + 0) * 100
          metadata: expect.objectContaining({
            itemsTotal: "80",
            shippingCost: "0",
            finalAmount: "80",
          }),
        })
      );
    });
  });

  describe("Mock Mode", () => {
    it("creates mock payment intent with proper structure", async () => {
      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        clientSecret: expect.stringMatching(/^mock_pi_\d+_secret_[a-z0-9]+$/),
        paymentIntentId: expect.stringMatching(/^mock_pi_\d+$/),
      });
    });

    it("marks order as PAYMENT_PENDING when orderId provided", async () => {
      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 5 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          status: "PAYMENT_PENDING",
          paymentPendingAt: expect.any(String),
          paymentProvider: "stripe",
          paymentIntentId: expect.stringMatching(/^mock_pi_\d+$/),
          paymentReference: expect.stringMatching(/^mock_pi_\d+$/),
        })
      );
    });

    it("does not mark order when orderId is not provided", async () => {
      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).not.toHaveBeenCalled();
    });
  });

  describe("Real Stripe Mode", () => {
    it("creates real payment intent with correct amount in cents", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_real",
            client_secret: "secret_real",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 123.45 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 12345, // 123.45 * 100, rounded
          currency: "pln",
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'always',
          },
        })
      );
    });

    it("includes metadata with amounts", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_meta",
            client_secret: "secret_meta",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = {
        body: {
          amount: 150,
          itemsTotal: 100,
          shippingCost: 50,
        },
      } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            itemsTotal: "100",
            shippingCost: "50",
            finalAmount: "150",
          },
        })
      );
    });

    it("includes metadata with orderId when provided", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);

      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_order",
            client_secret: "secret_order",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = {
        body: {
          amount: 100,
          orderId: 42,
        },
      } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            orderId: "42",
            itemsTotal: "0",
            shippingCost: "0",
            finalAmount: "100",
          },
          description: "Order #42",
        })
      );
    });

    it("does not include description when orderId is not provided", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_nodesc",
            client_secret: "secret_nodesc",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
        })
      );
    });

    it("marks order as PAYMENT_PENDING after creating intent", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);

      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_pending",
            client_secret: "secret_pending",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 10 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          status: "PAYMENT_PENDING",
          paymentPendingAt: expect.any(String),
          paymentProvider: "stripe",
          paymentIntentId: "pi_pending",
          paymentReference: "pi_pending",
        })
      );
    });

    it("returns payment intent result", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_result",
            client_secret: "secret_result",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        clientSecret: "secret_result",
        paymentIntentId: "pi_result",
      });
    });

    it("rounds fractional cents correctly", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_round",
            client_secret: "secret_round",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 99.999 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // Math.round(99.999 * 100) = 10000
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("falls back to amount when itemsTotal and shippingCost sum to zero", async () => {
      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_fallback",
            client_secret: "secret_fallback",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = {
        body: {
          amount: 150,
          itemsTotal: 0,
          shippingCost: 0,
        },
      } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 15000, // Falls back to amount: 150 * 100
          metadata: expect.objectContaining({
            finalAmount: "150",
          }),
        })
      );
    });

    it("handles orderId of 0 as valid", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);

      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 0 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      // orderId 0 is falsy, so it won't try to update order
      expect(mockedStorage.updateOrder).not.toHaveBeenCalled();
    });

    it("returns existing intent with null client_secret when present", async () => {
      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        paymentIntentId: "pi_null_secret",
      });

      const stripeClient = {
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue({
            id: "pi_null_secret",
            client_secret: null,
          }),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        clientSecret: null,
        paymentIntentId: "pi_null_secret",
      });
    });

    it("handles storage.updateOrder failure in mock mode gracefully", async () => {
      mockedStorage.updateOrder.mockRejectedValue(new Error("DB error"));
      stripeService.isMockMode.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 5 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("DB error");
    });

    it("handles storage.updateOrder failure in real Stripe mode gracefully", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);
      mockedStorage.updateOrder.mockRejectedValue(new Error("DB error"));

      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({
            id: "pi_error",
            client_secret: "secret_error",
          }),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 7 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("DB error");
    });

    it("handles stripe.paymentIntents.create failure", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);

      const stripeClient = {
        paymentIntents: {
          create: jest.fn().mockRejectedValue(new Error("Stripe API error")),
        },
      };

      stripeService.isMockMode.mockReturnValue(false);
      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("Stripe API error");
    });

    it("handles stripe.paymentIntents.retrieve failure when checking existing intent", async () => {
      mockedStorage.getOrder.mockResolvedValue({
        id: 1,
        paymentIntentId: "pi_failed",
      });

      const stripeClient = {
        paymentIntents: {
          retrieve: jest.fn().mockRejectedValue(new Error("Stripe retrieve error")),
        },
      };

      stripeService.getClient.mockReturnValue(stripeClient);

      const handler = CreatePaymentIntentHandler({
        stripeService: stripeService as any,
      });

      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("Stripe retrieve error");
    });
  });
});
