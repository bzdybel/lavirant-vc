import type { Request } from "express";
import { CreatePaymentIntentHandler } from "../CreatePaymentIntentHandler";
import { storage } from "../../storage";
import { makeResponse } from "../../__tests__/helpers/httpMocks";
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
    mockedStorage.getOrder.mockResolvedValue(null);
    mockedStorage.updateOrder.mockResolvedValue({});
  });

  describe("Validation", () => {
    it("returns 400 when amount is missing", async () => {
      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: {} } as Request;
      const res = makeResponse();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });

    it("returns 400 when amount is zero", async () => {
      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 0 } } as Request;
      const res = makeResponse();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });

    it("returns 400 when amount is negative", async () => {
      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: -100 } } as Request;
      const res = makeResponse();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });

    it("returns 400 when amount is NaN", async () => {
      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: NaN } } as Request;
      const res = makeResponse();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid amount" });
    });
  });

  describe("Existing Payment Intent", () => {
    it("returns existing payment intent when order has one and service is available", async () => {
      mockedStorage.getOrder.mockResolvedValue({ id: 1, paymentIntentId: "pi_existing" });
      stripeService.isAvailable.mockReturnValue(true);
      stripeService.retrievePaymentIntent.mockResolvedValue({
        id: "pi_existing",
        client_secret: "secret_existing",
      });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(stripeService.retrievePaymentIntent).toHaveBeenCalledWith("pi_existing");
      expect(res.json).toHaveBeenCalledWith({ clientSecret: "secret_existing", paymentIntentId: "pi_existing" });
      expect(stripeService.createPaymentIntent).not.toHaveBeenCalled();
    });

    it("creates new payment intent when service is not available", async () => {
      mockedStorage.getOrder.mockResolvedValue({ id: 1, paymentIntentId: "pi_123" });
      stripeService.isAvailable.mockReturnValue(false);
      stripeService.createPaymentIntent.mockResolvedValue({ clientSecret: "mock_secret", paymentIntentId: "mock_pi_456" });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(stripeService.retrievePaymentIntent).not.toHaveBeenCalled();
      expect(stripeService.createPaymentIntent).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ clientSecret: "mock_secret", paymentIntentId: "mock_pi_456" });
    });

    it("creates new payment intent when order has no paymentIntentId", async () => {
      mockedStorage.getOrder.mockResolvedValue({ id: 1, paymentIntentId: null });
      stripeService.isAvailable.mockReturnValue(true);

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(stripeService.retrievePaymentIntent).not.toHaveBeenCalled();
      expect(stripeService.createPaymentIntent).toHaveBeenCalled();
    });

    it("creates new payment intent when order does not exist", async () => {
      mockedStorage.getOrder.mockResolvedValue(null);

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 999 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(stripeService.retrievePaymentIntent).not.toHaveBeenCalled();
      expect(stripeService.createPaymentIntent).toHaveBeenCalled();
    });

    it("returns existing intent with null client_secret", async () => {
      mockedStorage.getOrder.mockResolvedValue({ id: 1, paymentIntentId: "pi_null_secret" });
      stripeService.isAvailable.mockReturnValue(true);
      stripeService.retrievePaymentIntent.mockResolvedValue({ id: "pi_null_secret", client_secret: null });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({ clientSecret: null, paymentIntentId: "pi_null_secret" });
    });
  });

  describe("Creating New Payment Intent", () => {
    it("calls createPaymentIntent with correct params", async () => {
      stripeService.createPaymentIntent.mockResolvedValue({ clientSecret: "secret_123", paymentIntentId: "pi_123" });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 5, itemsTotal: 80, shippingCost: 20 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith({ amount: 100, orderId: 5, itemsTotal: 80, shippingCost: 20 });
    });

    it("returns result from createPaymentIntent", async () => {
      stripeService.createPaymentIntent.mockResolvedValue({ clientSecret: "secret_result", paymentIntentId: "pi_result" });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({ clientSecret: "secret_result", paymentIntentId: "pi_result" });
    });

    it("marks order as PAYMENT_PENDING when orderId provided", async () => {
      stripeService.createPaymentIntent.mockResolvedValue({ clientSecret: "secret_pending", paymentIntentId: "pi_pending" });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 10 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(mockedStorage.updateOrder).toHaveBeenCalledWith(10, expect.objectContaining({
        status: "PAYMENT_PENDING",
        paymentPendingAt: expect.any(String),
        paymentProvider: "stripe",
        paymentIntentId: "pi_pending",
        paymentReference: "pi_pending",
      }));
    });

    it("does not mark order when orderId is not provided", async () => {
      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(mockedStorage.updateOrder).not.toHaveBeenCalled();
    });

    it("orderId of 0 is falsy and skips order update", async () => {
      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 0 } } as Request;
      const res = makeResponse();
      await handler(req, res);

      expect(mockedStorage.updateOrder).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("propagates retrievePaymentIntent failure", async () => {
      mockedStorage.getOrder.mockResolvedValue({ id: 1, paymentIntentId: "pi_failed" });
      stripeService.isAvailable.mockReturnValue(true);
      stripeService.retrievePaymentIntent.mockRejectedValue(new Error("Stripe retrieve error"));

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 1 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("Stripe retrieve error");
    });

    it("propagates createPaymentIntent failure", async () => {
      stripeService.createPaymentIntent.mockRejectedValue(new Error("Stripe API error"));

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("Stripe API error");
    });

    it("propagates updateOrder failure", async () => {
      mockedStorage.updateOrder.mockRejectedValue(new Error("DB error"));
      stripeService.createPaymentIntent.mockResolvedValue({ clientSecret: "secret", paymentIntentId: "pi_123" });

      const handler = CreatePaymentIntentHandler({ stripeService: stripeService as any });
      const req = { body: { amount: 100, orderId: 5 } } as Request;
      const res = makeResponse();

      await expect(handler(req, res)).rejects.toThrow("DB error");
    });
  });
});
