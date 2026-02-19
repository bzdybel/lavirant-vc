import crypto from "crypto";
import type Stripe from "stripe";
import { WebhookHeaders } from "../constants/webhookHeaders";

/**
 * Webhook Signature Verification Result
 */
export interface WebhookVerificationResult {
  isValid: boolean;
  payload: any | null;
  provider: 'stripe' | 'generic' | null;
}

/**
 * Normalizes signature header format
 * Handles both hex and base64 encoded signatures
 */
function normalizeSignatureHeader(signatureHeader: string): string {
  if (signatureHeader.includes("=")) {
    const parts = signatureHeader.split("=");
    return parts[parts.length - 1].trim();
  }
  return signatureHeader.trim();
}

/**
 * Verifies HMAC signature
 */
function verifyHmacSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  if (!secret || !signatureHeader) return false;

  const normalized = normalizeSignatureHeader(signatureHeader);
  const computedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const computed = Buffer.from(computedHex, "hex");

  let provided: Buffer;
  try {
    provided = Buffer.from(normalized, "hex");
    if (provided.length !== computed.length) {
      provided = Buffer.from(normalized, "base64");
    }
  } catch {
    return false;
  }

  if (provided.length !== computed.length) return false;
  return crypto.timingSafeEqual(computed, provided);
}

/**
 * Verifies Stripe webhook signature and constructs event
 */
function verifyStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
  stripe: Stripe
): WebhookVerificationResult {
  try {
    const payload = stripe.webhooks.constructEvent(rawBody, signatureHeader, secret);
    return {
      isValid: true,
      payload,
      provider: 'stripe',
    };
  } catch (error) {
    console.error("❌ Stripe webhook signature verification failed:", error);
    return {
      isValid: false,
      payload: null,
      provider: null,
    };
  }
}

/**
 * Verifies generic HMAC webhook signature
 */
function verifyGenericSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): WebhookVerificationResult {
  const isValid = verifyHmacSignature(rawBody, signatureHeader, secret);

  if (!isValid) {
    return {
      isValid: false,
      payload: null,
      provider: null,
    };
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    return {
      isValid: true,
      payload,
      provider: 'generic',
    };
  } catch (error) {
    console.error("❌ Failed to parse webhook payload:", error);
    return {
      isValid: false,
      payload: null,
      provider: null,
    };
  }
}

/**
 * Webhook Signature Verifier
 *
 * Handles webhook signature verification for multiple providers
 */
export class WebhookSignatureVerifier {
  constructor(
    private readonly stripe: Stripe | null,
    private readonly stripeWebhookSecret: string,
    private readonly genericWebhookSecret: string
  ) {}

  /**
   * Verifies webhook signature from request headers
   */
  verify(rawBody: Buffer, headers: Record<string, any>): WebhookVerificationResult {
    const stripeSignature = headers[WebhookHeaders.STRIPE_SIGNATURE] as string | undefined;
    const hmacSignature = (
      headers[WebhookHeaders.X_WEBHOOK_SIGNATURE] ||
      headers[WebhookHeaders.X_SIGNATURE]
    ) as string | undefined;

    // Try Stripe verification first
    if (this.stripe && stripeSignature && this.stripeWebhookSecret) {
      return verifyStripeSignature(
        rawBody,
        stripeSignature,
        this.stripeWebhookSecret,
        this.stripe
      );
    }

    // Try generic HMAC verification
    if (hmacSignature && this.genericWebhookSecret) {
      return verifyGenericSignature(
        rawBody,
        hmacSignature,
        this.genericWebhookSecret
      );
    }

    return {
      isValid: false,
      payload: null,
      provider: null,
    };
  }
}
