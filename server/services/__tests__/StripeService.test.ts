import Stripe from "stripe";
import { StripeService } from "../StripeService";
import { AppConfig } from "../../config/appConfig";
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

jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    USE_MOCK_STRIPE: false,
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test_123",
  },
}));

describe("StripeService", () => {
  const mockedStripe = Stripe as unknown as jest.Mock;
  const mockedAppConfig = AppConfig as unknown as {
    USE_MOCK_STRIPE: boolean;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppConfig.USE_MOCK_STRIPE = false;
    mockedAppConfig.STRIPE_SECRET_KEY = "sk_test_123";
    mockedAppConfig.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
  });

  describe("Initialization", () => {
    it("initializes Stripe client when key is provided and mock mode is disabled", () => {
      const service = new StripeService();

      expect(mockedStripe).toHaveBeenCalledWith("sk_test_123", {
        apiVersion: "2025-08-27.basil",
      });
      expect(service.isAvailable()).toBe(true);
      expect(service.isMockMode()).toBe(false);
    });

    it("does not initialize Stripe client in mock mode", () => {
      mockedAppConfig.USE_MOCK_STRIPE = true;

      const service = new StripeService();

      expect(mockedStripe).not.toHaveBeenCalled();
      expect(service.isAvailable()).toBe(false);
      expect(service.isMockMode()).toBe(true);
    });

    it("does not initialize Stripe client when secret key is missing", () => {
      mockedAppConfig.STRIPE_SECRET_KEY = undefined;

      const service = new StripeService();

      expect(mockedStripe).not.toHaveBeenCalled();
      expect(service.isAvailable()).toBe(false);
      expect(() => service.getClient()).toThrow(ServiceUnavailableError);
      expect(() => service.getClient()).toThrow("Stripe is not configured");
    });
  });

  describe("validateConfiguration", () => {
    it("warns when STRIPE_SECRET_KEY is missing and mock mode is off", () => {
      mockedAppConfig.STRIPE_SECRET_KEY = undefined;
      mockedAppConfig.USE_MOCK_STRIPE = false;
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

      StripeService.validateConfiguration();

      expect(warnSpy).toHaveBeenCalledWith(
        "Missing STRIPE_SECRET_KEY environment variable. Payment functionality will be disabled."
      );
      warnSpy.mockRestore();
    });

    it("logs mock mode message when USE_MOCK_STRIPE is enabled", () => {
      mockedAppConfig.USE_MOCK_STRIPE = true;
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

      StripeService.validateConfiguration();

      expect(logSpy).toHaveBeenCalledWith("🔧 Running in MOCK STRIPE mode for development");
      logSpy.mockRestore();
    });
  });

  describe("createPaymentIntent", () => {
    it("creates mock payment intent in mock mode", async () => {
      mockedAppConfig.USE_MOCK_STRIPE = true;
      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456789);

      const service = new StripeService();
      const result = await service.createPaymentIntent({
        amount: 123,
        orderId: 11,
        itemsTotal: 100,
        shippingCost: 23,
      });

      expect(result.paymentIntentId).toBe("mock_pi_1700000000000");
      expect(result.clientSecret).toContain("mock_pi_1700000000000_secret_");
      expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();

      nowSpy.mockRestore();
      randomSpy.mockRestore();
    });

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

      const service = new StripeService();
      const result = await service.createPaymentIntent({
        amount: 999,
        orderId: 15,
        itemsTotal: 10.12,
        shippingCost: 2.34,
      });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 1246,
        currency: "pln",
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "always",
        },
        metadata: {
          orderId: "15",
          itemsTotal: "10.12",
          shippingCost: "2.34",
          finalAmount: "12.46",
        },
        description: "Order #15",
      });

      expect(result).toEqual({
        clientSecret: "pi_123_secret",
        paymentIntentId: "pi_123",
      });
    });

    it("falls back to frontend amount when totals are not finite", async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: "pi_456",
        client_secret: "pi_456_secret",
        metadata: {},
      });

      const service = new StripeService();
      await service.createPaymentIntent({
        amount: 50,
        itemsTotal: Number.NaN,
        shippingCost: Number.NaN,
      });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          metadata: {
            itemsTotal: "0",
            shippingCost: "0",
            finalAmount: "50",
          },
          description: undefined,
        })
      );
    });

    it("throws when Stripe is unavailable in non-mock mode", async () => {
      mockedAppConfig.USE_MOCK_STRIPE = false;
      mockedAppConfig.STRIPE_SECRET_KEY = undefined;

      const service = new StripeService();

      await expect(service.createPaymentIntent({ amount: 10 })).rejects.toThrow(ServiceUnavailableError);
      await expect(service.createPaymentIntent({ amount: 10 })).rejects.toThrow("Stripe is not configured");
    });
  });

  describe("Client Delegation", () => {
    it("retrieves payment intent using Stripe client", async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({ id: "pi_retrieve" });
      const service = new StripeService();

      const result = await service.retrievePaymentIntent("pi_retrieve");

      expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith("pi_retrieve");
      expect(result).toEqual({ id: "pi_retrieve" });
    });

    it("updates payment intent metadata using Stripe client", async () => {
      mockPaymentIntentsUpdate.mockResolvedValue({
        id: "pi_update",
        metadata: { orderId: "22" },
      });
      const service = new StripeService();

      const result = await service.updatePaymentIntentMetadata("pi_update", { orderId: "22" });

      expect(mockPaymentIntentsUpdate).toHaveBeenCalledWith("pi_update", {
        metadata: { orderId: "22" },
      });
      expect(result).toEqual({
        id: "pi_update",
        metadata: { orderId: "22" },
      });
    });
  });

  describe("Helpers", () => {
    it("maps Stripe statuses to normalized webhook statuses", () => {
      expect(StripeService.mapStripeStatus(StripePaymentIntentStatus.SUCCEEDED)).toBe(PaymentWebhookStatus.COMPLETED);
      expect(StripeService.mapStripeStatus(StripePaymentIntentStatus.CANCELED)).toBe(PaymentWebhookStatus.FAILED);
      expect(StripeService.mapStripeStatus(StripePaymentIntentStatus.REQUIRES_PAYMENT_METHOD)).toBe(PaymentWebhookStatus.FAILED);
      expect(StripeService.mapStripeStatus(StripePaymentIntentStatus.PROCESSING)).toBe(PaymentWebhookStatus.PENDING);
      expect(StripeService.mapStripeStatus("some_unknown_status")).toBe(PaymentWebhookStatus.PENDING);
    });

    it("returns configured webhook secret", () => {
      mockedAppConfig.STRIPE_WEBHOOK_SECRET = "whsec_live_1";
      const service = new StripeService();

      expect(service.getWebhookSecret()).toBe("whsec_live_1");
    });

    it("returns empty string when webhook secret is missing", () => {
      mockedAppConfig.STRIPE_WEBHOOK_SECRET = undefined;
      const service = new StripeService();

      expect(service.getWebhookSecret()).toBe("");
    });
  });
});
