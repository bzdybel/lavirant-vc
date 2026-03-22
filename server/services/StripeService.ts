import Stripe from "stripe";
import { LogPrefix } from "../constants/logPrefixes";
import { ServiceUnavailableError } from "../errors/AppError";
import { StripePaymentIntentStatus, PaymentWebhookStatus, type PaymentWebhookStatusType } from "../constants/paymentStatus";
import { logger } from "../utils/logger";

export interface CreatePaymentIntentParams {
  amount: number;
  orderId?: number;
  itemsTotal?: number;
  shippingCost?: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface IStripeService {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse>;
  retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
  updatePaymentIntentMetadata(paymentIntentId: string, metadata: Record<string, string>): Promise<Stripe.PaymentIntent>;
  constructWebhookEvent(rawBody: Buffer, signature: string, webhookSecret: string): any;
  getWebhookSecret(): string;
  healthcheck(): Promise<boolean>;
}

export function mapStripeStatus(status: string): PaymentWebhookStatusType {
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

export class StripeServiceReal implements IStripeService {
  private readonly client: Stripe;

  constructor(private readonly config: StripeConfig) {
    this.client = new Stripe(config.secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  getClient(): Stripe {
    return this.client;
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
    const { amount, orderId, itemsTotal, shippingCost } = params;

    const finalItemsTotal = Number.isFinite(itemsTotal) ? itemsTotal! : 0;
    const finalShippingCost = Number.isFinite(shippingCost) ? shippingCost! : 0;
    const finalAmount = finalItemsTotal + finalShippingCost || amount;
    const normalizedFinalAmount = Math.round(finalAmount * 100) / 100;
    const amountInCents = Math.round(normalizedFinalAmount * 100);

    logger.info({
      message: `${LogPrefix.STRIPE} Payment Intent Creation`,
      itemsTotal: finalItemsTotal,
      shippingCost: finalShippingCost,
      finalAmount: normalizedFinalAmount,
      amountFromFrontend: amount,
      orderId,
    });

    const paymentIntent = await this.client.paymentIntents.create({
      amount: amountInCents,
      currency: "pln",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "always",
      },
      metadata: {
        ...(orderId ? { orderId: String(orderId) } : {}),
        itemsTotal: String(finalItemsTotal),
        shippingCost: String(finalShippingCost),
        finalAmount: String(normalizedFinalAmount),
      },
      description: orderId ? `Order #${orderId}` : undefined,
    });

    logger.info({
      message: "Stripe payment intent created",
      paymentIntentId: paymentIntent.id,
      amountInCents,
      amountInPLN: normalizedFinalAmount,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.retrieve(paymentIntentId);
  }

  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.update(paymentIntentId, { metadata });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, webhookSecret: string): any {
    return this.client.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  getWebhookSecret(): string {
    return this.config.webhookSecret;
  }

  async healthcheck(): Promise<boolean> {
    let cleanup: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      cleanup = setTimeout(() => reject(new Error("Stripe healthcheck timeout")), 5000);
    });
    try {
      await Promise.race([this.client.balance.retrieve(), timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(cleanup);
    }
  }

  static mapStripeStatus(status: string): PaymentWebhookStatusType {
    return mapStripeStatus(status);
  }
}

export class StripeServiceNoop implements IStripeService {
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
    const { amount, orderId, itemsTotal, shippingCost } = params;

    const finalItemsTotal = Number.isFinite(itemsTotal) ? itemsTotal! : 0;
    const finalShippingCost = Number.isFinite(shippingCost) ? shippingCost! : 0;
    const finalAmount = finalItemsTotal + finalShippingCost || amount;
    const normalizedFinalAmount = Math.round(finalAmount * 100) / 100;

    const mockId = `pi_mock_${Date.now()}`;
    const mockClientSecret = `${mockId}_secret_${Math.random().toString(36).substring(7)}`;

    logger.info({
      message: "Mock payment intent created",
      mockId,
      amount: normalizedFinalAmount,
      itemsTotal: finalItemsTotal,
      shippingCost: finalShippingCost,
      orderId,
    });

    return { clientSecret: mockClientSecret, paymentIntentId: mockId };
  }

  async retrievePaymentIntent(_paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    throw new ServiceUnavailableError("Stripe", "Stripe is not configured");
  }

  async updatePaymentIntentMetadata(
    _paymentIntentId: string,
    _metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    throw new ServiceUnavailableError("Stripe", "Stripe is not configured");
  }

  constructWebhookEvent(rawBody: Buffer, _signature: string, _webhookSecret: string): any {
    try {
      return JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new ServiceUnavailableError("Stripe", "Failed to parse webhook payload");
    }
  }

  getWebhookSecret(): string {
    return "";
  }

  async healthcheck(): Promise<boolean> {
    return true;
  }
}

// Backward-compatible alias used by PaymentStatusJob and tests
export { StripeServiceReal as StripeService };
