import Stripe from "stripe";
import { AppConfig } from "../config/appConfig";
import { LogPrefix } from "../constants/logPrefixes";
import { ServiceUnavailableError } from "../errors/AppError";
import { StripePaymentIntentStatus, PaymentWebhookStatus, type PaymentWebhookStatusType } from "../constants/paymentStatus";

/**
 * Stripe Payment Intent Create Parameters
 */
export interface CreatePaymentIntentParams {
  amount: number;
  orderId?: number;
  itemsTotal?: number;
  shippingCost?: number;
}

/**
 * Stripe Payment Intent Response
 */
export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Stripe Service
 *
 * Encapsulates all Stripe integration logic.
 * Single Responsibility: Manage Stripe client and payment operations.
 */
export class StripeService {
  private readonly client: Stripe | null;
  private readonly useMockMode: boolean;

  constructor() {
    this.useMockMode = AppConfig.USE_MOCK_STRIPE;
    this.client = this.initializeClient();
  }

  /**
   * Initializes Stripe client
   */
  private initializeClient(): Stripe | null {
    if (this.useMockMode || !AppConfig.STRIPE_SECRET_KEY) {
      return null;
    }

    return new Stripe(AppConfig.STRIPE_SECRET_KEY, {
      apiVersion: "2025-04-30.basil",
    });
  }

  /**
   * Validates Stripe configuration and logs status
   */
  static validateConfiguration(): void {
    if (!AppConfig.STRIPE_SECRET_KEY && !AppConfig.USE_MOCK_STRIPE) {
      console.warn("Missing STRIPE_SECRET_KEY environment variable. Payment functionality will be disabled.");
    }

    if (AppConfig.USE_MOCK_STRIPE) {
      console.log("🔧 Running in MOCK STRIPE mode for development");
    }
  }

  /**
   * Checks if Stripe is available (not in mock mode)
   */
  isAvailable(): boolean {
    return !this.useMockMode && this.client !== null;
  }

  /**
   * Checks if running in mock mode
   */
  isMockMode(): boolean {
    return this.useMockMode;
  }

  /**
   * Gets the Stripe client instance
   * @throws ServiceUnavailableError if Stripe is not configured
   */
  getClient(): Stripe {
    if (!this.client) {
      throw new ServiceUnavailableError("Stripe", "Stripe is not configured");
    }
    return this.client;
  }

  /**
   * Creates a payment intent (real or mock)
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
    const { amount, orderId, itemsTotal, shippingCost } = params;

    const finalItemsTotal = Number.isFinite(itemsTotal) ? itemsTotal! : 0;
    const finalShippingCost = Number.isFinite(shippingCost) ? shippingCost! : 0;
    const finalAmount = finalItemsTotal + finalShippingCost || amount;

    console.log(`${LogPrefix.STRIPE} Payment Intent Creation`, {
      itemsTotal: finalItemsTotal,
      shippingCost: finalShippingCost,
      finalAmount,
      amountFromFrontend: amount,
      orderId,
      stripeMode: this.client ? "live" : "mock",
    });

    // Mock mode
    if (this.useMockMode) {
      return this.createMockPaymentIntent(finalAmount, finalItemsTotal, finalShippingCost);
    }

    // Real Stripe
    if (!this.client) {
      throw new ServiceUnavailableError("Stripe", "Stripe is not configured");
    }

    const amountInCents = Math.round(finalAmount * 100);

    const paymentIntent = await this.client.paymentIntents.create({
      amount: amountInCents,
      currency: "pln",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always',
      },
      metadata: {
        ...(orderId ? { orderId: String(orderId) } : {}),
        itemsTotal: String(finalItemsTotal),
        shippingCost: String(finalShippingCost),
        finalAmount: String(finalAmount),
      },
      description: orderId ? `Order #${orderId}` : undefined,
    });

    console.log("✅ Stripe payment intent created (LIVE)", {
      paymentIntentId: paymentIntent.id,
      amountInCents,
      amountInPLN: finalAmount,
      itemsTotal: finalItemsTotal,
      shippingCost: finalShippingCost,
      metadata: paymentIntent.metadata,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Creates a mock payment intent for development
   */
  private createMockPaymentIntent(
    amount: number,
    itemsTotal: number,
    shippingCost: number
  ): PaymentIntentResponse {
    const mockId = `mock_pi_${Date.now()}`;
    const mockClientSecret = `${mockId}_secret_${Math.random().toString(36).substring(7)}`;

    console.log("🧪 Mock payment intent created", {
      mockId,
      amount,
      itemsTotal,
      shippingCost,
    });

    return {
      clientSecret: mockClientSecret,
      paymentIntentId: mockId,
    };
  }

  /**
   * Retrieves an existing payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const client = this.getClient();
    return client.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Updates payment intent metadata
   */
  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    const client = this.getClient();
    return client.paymentIntents.update(paymentIntentId, { metadata });
  }

  /**
   * Maps Stripe payment intent status to webhook status
   */
  static mapStripeStatus(status: string): PaymentWebhookStatusType {
    switch (status) {
      case StripePaymentIntentStatus.SUCCEEDED:
        return PaymentWebhookStatus.COMPLETED;
      case StripePaymentIntentStatus.CANCELED:
      case StripePaymentIntentStatus.REQUIRES_PAYMENT_METHOD:
        return PaymentWebhookStatus.FAILED;
      default:
        return PaymentWebhookStatus.PENDING;
    }
  }

  /**
   * Gets webhook secret
   */
  getWebhookSecret(): string {
    return AppConfig.STRIPE_WEBHOOK_SECRET;
  }
}
