import Stripe from "stripe";
import { StripeServiceReal, StripeServiceNoop, mapStripeStatus } from "../StripeService";
import { PaymentWebhookStatus, StripePaymentIntentStatus } from "../../constants/paymentStatus";
import { ServiceUnavailableError } from "../../errors/AppError";

const mockPaymentIntentsCreate = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();
const mockPaymentIntentsUpdate = jest.fn();

jest.mock("stripe", () => {
  const StripeMock = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
      update: mockPaymentIntentsUpdate,
    },
  }));

  return {
    __esModule: true,
    default: StripeMock,
  };
});

const TEST_CONFIG = { secretKey: "sk_test_123", webhookSecret: "whsec_test_123" };

describe("StripeServiceReal", () => {
  const mockedStripe = Stripe as unknown as jest.Mock;

  beforeEach(() => {
    mockedStripe.mockClear();
    mockPaymentIntentsCreate.mockClear();
    mockPaymentIntentsRetrieve.mockClear();
    mockPaymentIntentsUpdate.mockClear();
  });

  describe("Initialization", () => {
    it("initializes Stripe client with provided config", () => {
      const _service = new StripeServiceReal(TEST_CONFIG);

      expect(mockedStripe).toHaveBeenCalledWith("sk_test_123", { apiVersion: "2025-08-27.basil" });
    });
  });

  describe("createPaymentIntent", () => {
    it("creates live payment intent with computed totals and metadata", async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: "pi_123",
        client_secret: "pi_123_secret",
        metadata: {
          orderId: "15",
          itemsTotal: "10.12",
          shippingCost: "2.34",
          finalAmount: "12.46",
        },
      });

      const service = new StripeServiceReal(TEST_CONFIG);
      const result = await service.createPaymentIntent({
        amount: 999,
        orderId: 15,
        itemsTotal: 10.12,
        shippingCost: 2.34,
      });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 1246,
        currency: "pln",
        automatic_payment_methods: { enabled: true, allow_redirects: "always" },
        metadata: {
          orderId: "15",
          itemsTotal: "10.12",
          shippingCost: "2.34",
          finalAmount: "12.46",
        },
        description: "Order #15",
      });

      expect(result).toEqual({ clientSecret: "pi_123_secret", paymentIntentId: "pi_123" });
    });

    it("falls back to frontend amount when totals are not finite", async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: "pi_456",
        client_secret: "pi_456_secret",
        metadata: {},
      });

      const service = new StripeServiceReal(TEST_CONFIG);
      await service.createPaymentIntent({ amount: 50, itemsTotal: Number.NaN, shippingCost: Number.NaN });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          metadata: { itemsTotal: "0", shippingCost: "0", finalAmount: "50" },
          description: undefined,
        })
      );
    });
  });

  describe("Client Delegation", () => {
    it("retrieves payment intent using Stripe client", async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({ id: "pi_retrieve" });
      const service = new StripeServiceReal(TEST_CONFIG);

      const result = await service.retrievePaymentIntent("pi_retrieve");

      expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith("pi_retrieve");
      expect(result).toEqual({ id: "pi_retrieve" });
    });

    it("updates payment intent metadata using Stripe client", async () => {
      mockPaymentIntentsUpdate.mockResolvedValue({ id: "pi_update", metadata: { orderId: "22" } });
      const service = new StripeServiceReal(TEST_CONFIG);

      const result = await service.updatePaymentIntentMetadata("pi_update", { orderId: "22" });

      expect(mockPaymentIntentsUpdate).toHaveBeenCalledWith("pi_update", { metadata: { orderId: "22" } });
      expect(result).toEqual({ id: "pi_update", metadata: { orderId: "22" } });
    });
  });

  describe("getWebhookSecret", () => {
    it("returns configured webhook secret", () => {
      const service = new StripeServiceReal({ secretKey: "sk_test", webhookSecret: "whsec_live_1" });
      expect(service.getWebhookSecret()).toBe("whsec_live_1");
    });

    it("returns empty string when webhook secret is empty", () => {
      const service = new StripeServiceReal({ secretKey: "sk_test", webhookSecret: "" });
      expect(service.getWebhookSecret()).toBe("");
    });
  });

  describe("mapStripeStatus", () => {
    it("maps Stripe statuses to normalized webhook statuses", () => {
      expect(StripeServiceReal.mapStripeStatus(StripePaymentIntentStatus.SUCCEEDED)).toBe(PaymentWebhookStatus.COMPLETED);
      expect(StripeServiceReal.mapStripeStatus(StripePaymentIntentStatus.CANCELED)).toBe(PaymentWebhookStatus.FAILED);
      expect(StripeServiceReal.mapStripeStatus(StripePaymentIntentStatus.REQUIRES_PAYMENT_METHOD)).toBe(PaymentWebhookStatus.FAILED);
      expect(StripeServiceReal.mapStripeStatus(StripePaymentIntentStatus.PROCESSING)).toBe(PaymentWebhookStatus.PENDING);
      expect(StripeServiceReal.mapStripeStatus("some_unknown_status")).toBe(PaymentWebhookStatus.PENDING);
    });
  });
});

describe("StripeServiceNoop", () => {
  describe("createPaymentIntent", () => {
    it("creates mock payment intent without calling Stripe", async () => {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456789);

      const service = new StripeServiceNoop();
      const result = await service.createPaymentIntent({ amount: 123, orderId: 11, itemsTotal: 100, shippingCost: 23 });

      expect(result.paymentIntentId).toBe("mock_pi_1700000000000");
      expect(result.clientSecret).toContain("mock_pi_1700000000000_secret_");

      nowSpy.mockRestore();
      randomSpy.mockRestore();
    });
  });

  describe("retrievePaymentIntent", () => {
    it("throws ServiceUnavailableError", async () => {
      const service = new StripeServiceNoop();
      await expect(service.retrievePaymentIntent("any")).rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe("updatePaymentIntentMetadata", () => {
    it("throws ServiceUnavailableError", async () => {
      const service = new StripeServiceNoop();
      await expect(service.updatePaymentIntentMetadata("any", {})).rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe("getWebhookSecret", () => {
    it("returns empty string", () => {
      expect(new StripeServiceNoop().getWebhookSecret()).toBe("");
    });
  });
});

describe("mapStripeStatus", () => {
  it("maps all known statuses correctly", () => {
    expect(mapStripeStatus(StripePaymentIntentStatus.SUCCEEDED)).toBe(PaymentWebhookStatus.COMPLETED);
    expect(mapStripeStatus(StripePaymentIntentStatus.CANCELED)).toBe(PaymentWebhookStatus.FAILED);
    expect(mapStripeStatus(StripePaymentIntentStatus.REQUIRES_PAYMENT_METHOD)).toBe(PaymentWebhookStatus.FAILED);
    expect(mapStripeStatus(StripePaymentIntentStatus.PROCESSING)).toBe(PaymentWebhookStatus.PENDING);
    expect(mapStripeStatus("unknown")).toBe(PaymentWebhookStatus.PENDING);
  });
});
