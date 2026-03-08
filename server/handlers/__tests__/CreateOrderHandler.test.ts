import type { Request, Response } from "express";
import { CreateOrderHandler } from "../CreateOrderHandler";
import { storage } from "../../storage";
import { makeResponse, makeRequest } from "../../__tests__/helpers/httpMocks";
import { makeOrderBody, makeProduct } from "../../__tests__/fixtures/orderFixtures";
import { makeEmailServiceMock, makeStripeServiceMock, makePaymentStatusServiceMock } from "../../__tests__/helpers/serviceMocks";

jest.mock("../../storage", () => ({
  storage: {
    getProduct: jest.fn(),
    createOrder: jest.fn(),
  },
}));

type MockedStorage = {
  getProduct: jest.Mock;
  createOrder: jest.Mock;
};

const mockedStorage = storage as unknown as MockedStorage;

let emailService: ReturnType<typeof makeEmailServiceMock>;
let stripeService: ReturnType<typeof makeStripeServiceMock>;
let paymentStatusService: ReturnType<typeof makePaymentStatusServiceMock>;
let handler: ReturnType<typeof CreateOrderHandler>;

beforeEach(() => {
  emailService = makeEmailServiceMock();
  stripeService = makeStripeServiceMock();
  paymentStatusService = makePaymentStatusServiceMock();

  handler = CreateOrderHandler({
    emailService: emailService as any,
    stripeService: stripeService as any,
    paymentStatusService: paymentStatusService as any,
  });
});

describe("CreateOrderHandler", () => {

  it("returns 400 when required fields are missing", async () => {
    const req = makeRequest({ body: { quantity: 1 } });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order data" });
    expect(mockedStorage.getProduct).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid quantity", async () => {
    const req = makeRequest({ body: makeOrderBody({ quantity: 0 }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order data" });
  });

  it("returns 400 when InPost locker is selected without delivery point", async () => {
    const req = makeRequest({ body: makeOrderBody({ deliveryMethod: "INPOST_PACZKOMAT" }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing InPost delivery point" });
  });

  it("returns 404 when product is not found", async () => {
    mockedStorage.getProduct.mockResolvedValue(undefined);

    const req = makeRequest({ body: makeOrderBody() });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
  });

  it("rounds down fractional delivery cost (floor)", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody({ deliveryCost: 10.4 }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total: 210, deliveryCost: 10 })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses zero delivery cost when negative", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 50 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody({ deliveryCost: -5 }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total: 100, deliveryCost: 0 })
    );
  });

  it("sets CREATED status when no payment reference is provided", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody() });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CREATED", paymentPendingAt: null })
    );
  });

  it("sets PAYMENT_PENDING status when payment reference is provided", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody({ paymentIntentId: "pi_123" }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PAYMENT_PENDING",
        paymentPendingAt: expect.any(String),
        paymentProvider: "stripe",
        paymentReference: "pi_123",
      })
    );
  });

  it("returns 201 even when order confirmation email fails", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));
    emailService.sendOrderConfirmation.mockRejectedValue(new Error("email failed"));

    const req = makeRequest({ body: makeOrderBody() });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("skips Stripe reconciliation when no paymentIntentId", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody() });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(stripeService.updatePaymentIntentMetadata).not.toHaveBeenCalled();
    expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
  });

  it("reconciles Stripe payment when succeeded", async () => {
    const PAYMENT_INTENT_ID = "pi_50";
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 1,
      ...data,
      paymentIntentId: PAYMENT_INTENT_ID,
      status: "PAYMENT_PENDING",
    }));

    stripeService.updatePaymentIntentMetadata.mockResolvedValue({});
    stripeService.retrievePaymentIntent.mockResolvedValue({ id: PAYMENT_INTENT_ID, status: "succeeded" } as any);

    const req = makeRequest({ body: makeOrderBody({ paymentIntentId: PAYMENT_INTENT_ID }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(stripeService.updatePaymentIntentMetadata).toHaveBeenCalledWith(PAYMENT_INTENT_ID, { orderId: "1" });
    expect(stripeService.retrievePaymentIntent).toHaveBeenCalledWith(PAYMENT_INTENT_ID);
    expect(paymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        paymentReference: PAYMENT_INTENT_ID,
        paymentProvider: "stripe",
      })
    );
  });

  it.each([
    ["firstName"],
    ["lastName"],
    ["email"],
    ["phone"],
    ["address"],
    ["city"],
    ["postalCode"],
    ["country"],
  ] as [string][])(
    "returns 400 when %s is missing",
    async (field) => {
      const req = makeRequest({ body: makeOrderBody({ [field]: "" }) });
      const res = makeResponse();

      await handler(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
    }
  );

  it("returns 201 even when Stripe API update throws", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 1,
      ...data,
      paymentIntentId: "pi_stripe_fail",
    }));

    stripeService.updatePaymentIntentMetadata.mockRejectedValue(new Error("Stripe API error"));

    const req = makeRequest({ body: makeOrderBody({ paymentIntentId: "pi_stripe_fail" }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 201 even when payment status service throws", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 1,
      ...data,
      paymentIntentId: "pi_update_fail",
      status: "PAYMENT_PENDING",
    }));

    stripeService.updatePaymentIntentMetadata.mockResolvedValue({});
    stripeService.retrievePaymentIntent.mockResolvedValue({ id: "pi_update_fail", status: "succeeded" } as any);
    paymentStatusService.applyPaymentStatusUpdate.mockRejectedValue(new Error("Update failed"));

    const req = makeRequest({ body: makeOrderBody({ paymentIntentId: "pi_update_fail" }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses paymentReference over paymentIntentId when both present", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({
      body: makeOrderBody({ paymentIntentId: "pi_80", paymentReference: "ref_80", paymentProvider: "stripe" }),
    });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PAYMENT_PENDING", paymentReference: "ref_80", paymentProvider: "stripe" })
    );
  });

  it("skips reconciliation when Stripe status is not succeeded", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 1,
      ...data,
      paymentIntentId: "pi_processing",
      status: "PAYMENT_PENDING",
    }));

    stripeService.updatePaymentIntentMetadata.mockResolvedValue({});
    stripeService.retrievePaymentIntent.mockResolvedValue({ id: "pi_processing", status: "processing" } as any);

    const req = makeRequest({ body: makeOrderBody({ paymentIntentId: "pi_processing" }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("persists all customer fields when creating an order", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 99.99 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody() });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "123456789",
        address: "Main 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "PL",
        productId: 1,
        quantity: 2,
        total: expect.any(Number),
      })
    );
  });

  it("returns 400 for negative quantity", async () => {
    const req = makeRequest({ body: makeOrderBody({ quantity: -5 }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order data" });
  });

  it("skips applyPaymentStatusUpdate when order is already PAID", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 1,
      ...data,
      paymentIntentId: "pi_paid",
      status: "PAID",
    }));

    stripeService.updatePaymentIntentMetadata.mockResolvedValue({});
    stripeService.retrievePaymentIntent.mockResolvedValue({ id: "pi_paid", status: "succeeded" } as any);

    const req = makeRequest({ body: makeOrderBody({ paymentIntentId: "pi_paid" }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(stripeService.updatePaymentIntentMetadata).toHaveBeenCalled();
    expect(stripeService.retrievePaymentIntent).toHaveBeenCalled();
    expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rounds up fractional delivery cost (ceil)", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 100 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody({ deliveryCost: 10.7 }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total: 211, deliveryCost: 11 })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses zero delivery cost when undefined", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 50 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody() });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total: 100, deliveryCost: 0 })
    );
  });

  it("uses zero delivery cost when NaN", async () => {
    mockedStorage.getProduct.mockResolvedValue(makeProduct({ price: 50 }));
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 1, ...data }));

    const req = makeRequest({ body: makeOrderBody({ deliveryCost: NaN }) });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total: 100, deliveryCost: 0 })
    );
  });

  it("returns 400 when InPost locker selected with empty deliveryPoint.id", async () => {
    const req = makeRequest({
      body: makeOrderBody({ deliveryMethod: "INPOST_PACZKOMAT", deliveryPoint: { id: "" } }),
    });
    const res = makeResponse();

    await handler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing InPost delivery point" });
  });
});
