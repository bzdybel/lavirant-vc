import type { Request, Response } from "express";
import { CreateOrderHandler } from "../CreateOrderHandler";
import { storage } from "../../storage";

jest.mock("../../storage", () => ({
  storage: {
    getProduct: jest.fn(),
    createOrder: jest.fn(),
  },
}));

type MockedStorage = typeof storage & {
  getProduct: jest.Mock;
  createOrder: jest.Mock;
};

function makeResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function baseRequestBody() {
  return {
    productId: 1,
    quantity: 2,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "123456789",
    address: "Main 1",
    city: "Warsaw",
    postalCode: "00-001",
    country: "PL",
  };
}

describe("CreateOrderHandler", () => {
  const mockedStorage = storage as MockedStorage;

  const emailService = {
    sendOrderConfirmation: jest.fn(),
  };

  const stripeService = {
    isMockMode: jest.fn(),
    getClient: jest.fn(),
  };

  const paymentStatusService = {
    applyPaymentStatusUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    emailService.sendOrderConfirmation.mockResolvedValue(true);
    stripeService.isMockMode.mockReturnValue(true);
    stripeService.getClient.mockReturnValue(null);
    paymentStatusService.applyPaymentStatusUpdate.mockResolvedValue({});
  });

  it("returns 400 when required fields are missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { quantity: 1 } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order data" });
    expect(mockedStorage.getProduct).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid quantity", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), quantity: 0 } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order data" });
  });

  it("returns 400 when InPost locker is selected without delivery point", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        deliveryMethod: "INPOST_PACZKOMAT",
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing InPost delivery point" });
  });

  it("returns 404 when product is not found", async () => {
    mockedStorage.getProduct.mockResolvedValue(undefined);

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: baseRequestBody() } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
  });

  it("calculates total with rounded delivery cost and non-negative shipping", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 10, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        deliveryCost: 10.4,
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 210,
        deliveryCost: 10,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses zero delivery cost when negative or invalid", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 50, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 11, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        deliveryCost: -5,
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 100,
        deliveryCost: 0,
      })
    );
  });

  it("sets PAYMENT_PENDING only when payment reference exists", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });

    mockedStorage.createOrder.mockImplementationOnce(async (data: any) => ({ id: 20, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: baseRequestBody() } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "CREATED",
        paymentPendingAt: null,
      })
    );

    mockedStorage.createOrder.mockImplementationOnce(async (data: any) => ({ id: 21, ...data }));

    const reqWithPayment = {
      body: { ...baseRequestBody(), paymentIntentId: "pi_123" },
    } as Request;
    const resWithPayment = makeResponse();

    await handler(reqWithPayment, resWithPayment);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PAYMENT_PENDING",
        paymentPendingAt: expect.any(String),
        paymentProvider: "stripe",
        paymentReference: "pi_123",
      })
    );
  });

  it("does not fail when order confirmation email fails", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 30, ...data }));
    emailService.sendOrderConfirmation.mockRejectedValue(new Error("email failed"));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: baseRequestBody() } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("skips Stripe reconciliation in mock mode", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 40, ...data, paymentIntentId: "pi_1" }));
    stripeService.isMockMode.mockReturnValue(true);

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), paymentIntentId: "pi_1" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(stripeService.getClient).not.toHaveBeenCalled();
    expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
  });

  it("reconciles Stripe payment when succeeded", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 50,
      ...data,
      paymentIntentId: "pi_50",
      status: "PAYMENT_PENDING",
    }));

    const stripeClient = {
      paymentIntents: {
        update: jest.fn().mockResolvedValue({}),
        retrieve: jest.fn().mockResolvedValue({ id: "pi_50", status: "succeeded" }),
      },
    };

    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(stripeClient);

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), paymentIntentId: "pi_50" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(stripeClient.paymentIntents.update).toHaveBeenCalledWith("pi_50", {
      metadata: { orderId: "50" },
    });
    expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalledWith("pi_50");
    expect(paymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "COMPLETED",
        paymentReference: "pi_50",
        paymentProvider: "stripe",
      })
    );
  });

  it("returns 400 when firstName is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), firstName: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("returns 400 when email is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), email: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("returns 400 when phone is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), phone: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("returns 400 when address is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), address: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("returns 400 when country is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), country: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("does not fail when Stripe reconciliation fails", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 60,
      ...data,
      paymentIntentId: "pi_60",
    }));

    const stripeClient = {
      paymentIntents: {
        update: jest.fn().mockRejectedValue(new Error("Stripe API error")),
        retrieve: jest.fn(),
      },
    };

    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(stripeClient);

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), paymentIntentId: "pi_60" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("does not fail when payment status update fails", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 70,
      ...data,
      paymentIntentId: "pi_70",
      status: "PAYMENT_PENDING",
    }));

    const stripeClient = {
      paymentIntents: {
        update: jest.fn().mockResolvedValue({}),
        retrieve: jest.fn().mockResolvedValue({ id: "pi_70", status: "succeeded" }),
      },
    };

    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(stripeClient);
    paymentStatusService.applyPaymentStatusUpdate.mockRejectedValue(new Error("Update failed"));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), paymentIntentId: "pi_70" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses paymentReference over paymentIntentId when both present", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 80, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        paymentIntentId: "pi_80",
        paymentReference: "ref_80",
        paymentProvider: "stripe",
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PAYMENT_PENDING",
        paymentReference: "ref_80",
        paymentProvider: "stripe",
      })
    );
  });

  it("does not reconcile payment status for payments with status other than succeeded", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 90,
      ...data,
      paymentIntentId: "pi_90",
      status: "PAYMENT_PENDING",
    }));

    const stripeClient = {
      paymentIntents: {
        update: jest.fn().mockResolvedValue({}),
        retrieve: jest.fn().mockResolvedValue({ id: "pi_90", status: "processing" }),
      },
    };

    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(stripeClient);

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), paymentIntentId: "pi_90" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns order with all expected fields", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 99.99, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 100, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: baseRequestBody() } as Request;
    const res = makeResponse();

    await handler(req, res);

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
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), quantity: -5 } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order data" });
  });

  it("does not update payment status when order is already PAID", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({
      id: 110,
      ...data,
      paymentIntentId: "pi_110",
      status: "PAID",
    }));

    const stripeClient = {
      paymentIntents: {
        update: jest.fn().mockResolvedValue({}),
        retrieve: jest.fn().mockResolvedValue({ id: "pi_110", status: "succeeded" }),
      },
    };

    stripeService.isMockMode.mockReturnValue(false);
    stripeService.getClient.mockReturnValue(stripeClient);

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), paymentIntentId: "pi_110" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(stripeClient.paymentIntents.update).toHaveBeenCalled();
    expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalled();
    expect(paymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rounds up delivery cost correctly", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 100, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 120, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        deliveryCost: 10.7,
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 211,
        deliveryCost: 11,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("uses zero delivery cost when undefined", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 50, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 130, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: baseRequestBody() } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 100,
        deliveryCost: 0,
      })
    );
  });

  it("uses zero delivery cost when NaN", async () => {
    mockedStorage.getProduct.mockResolvedValue({ id: 1, price: 50, name: "Game" });
    mockedStorage.createOrder.mockImplementation(async (data: any) => ({ id: 140, ...data }));

    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        deliveryCost: NaN,
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(mockedStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 100,
        deliveryCost: 0,
      })
    );
  });

  it("returns 400 when InPost locker selected with empty deliveryPoint.id", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = {
      body: {
        ...baseRequestBody(),
        deliveryMethod: "INPOST_PACZKOMAT",
        deliveryPoint: { id: "" },
      },
    } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing InPost delivery point" });
  });

  it("returns 400 when lastName is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), lastName: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("returns 400 when city is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), city: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });

  it("returns 400 when postalCode is missing", async () => {
    const handler = CreateOrderHandler({
      emailService: emailService as any,
      stripeService: stripeService as any,
      paymentStatusService: paymentStatusService as any,
    });

    const req = { body: { ...baseRequestBody(), postalCode: "" } } as Request;
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing customer information" });
  });
});
