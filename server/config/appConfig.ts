import { resolveEnv, parseEnvBoolean, parseEnvInt } from "../utils/env";
import { JobConfig } from "../constants/jobConfig";

/**
 * Application Configuration
 *
 * Centralized configuration management for the application.
 * All environment variable access should go through this module.
 */
export class AppConfig {
  // Server Configuration
  static readonly PORT = 5173;
  static readonly HOST = "0.0.0.0";
  static readonly NODE_ENV = resolveEnv("NODE_ENV", "development");
  static readonly IS_PRODUCTION = this.NODE_ENV === "production";
  static readonly IS_DEVELOPMENT = this.NODE_ENV === "development";

  // Email Configuration
  static readonly EMAIL_HOST = resolveEnv("EMAIL_HOST");
  static readonly EMAIL_PORT = resolveEnv("EMAIL_PORT", "587");
  static readonly EMAIL_USER = resolveEnv("EMAIL_USER");
  static readonly EMAIL_PASSWORD = resolveEnv("EMAIL_PASS") || resolveEnv("EMAIL_PASSWORD");
  static readonly EMAIL_FROM = resolveEnv("EMAIL_FROM");
  static readonly EMAIL_SECURE = parseEnvBoolean("EMAIL_SECURE") || this.EMAIL_PORT === "465";

  // Stripe Configuration
  static readonly STRIPE_SECRET_KEY = resolveEnv("STRIPE_SECRET_KEY");
  static readonly STRIPE_WEBHOOK_SECRET = resolveEnv("STRIPE_WEBHOOK_SECRET");
  static readonly USE_MOCK_STRIPE = parseEnvBoolean("USE_MOCK_STRIPE");

  // Payment Webhook Configuration
  static readonly PAYMENT_WEBHOOK_SECRET = resolveEnv("PAYMENT_WEBHOOK_SECRET");
  static readonly WEBHOOK_MANUAL_ONLY = parseEnvBoolean("WEBHOOK_MANUAL_ONLY");

  // InPost Configuration
  static readonly INPOST_API_SHIPX = resolveEnv("INPOST_API_SHIPX");
  static readonly INPOST_SHIPX_ORG_ID = resolveEnv("INPOST_SHIPX_ORG_ID");
  static readonly INPOST_SHIPX_ENV = resolveEnv("INPOST_SHIPX_ENV", this.IS_PRODUCTION ? "production" : "sandbox");
  static readonly INPOST_GEOWIDGET = resolveEnv("INPOST_GEOWIDGET");
  static readonly INPOST_GEOWIDGET_NGROK = resolveEnv("INPOST_GEOWIDGET_NGROK");
  static readonly MOCK_INPOST = parseEnvBoolean("MOCK_INPOST");
  static readonly SHIPPING_PROVIDER = resolveEnv("SHIPPING_PROVIDER", "INPOST");

  // Job Configuration
  static readonly PAYMENT_STATUS_JOB_INTERVAL_MINUTES = parseEnvInt(
    "PAYMENT_STATUS_JOB_INTERVAL_MINUTES",
    JobConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES
  );
  static readonly PAYMENT_PENDING_THRESHOLD_MINUTES = parseEnvInt(
    "PAYMENT_PENDING_THRESHOLD_MINUTES",
    JobConfig.PAYMENT_PENDING_THRESHOLD_MINUTES
  );
  static readonly PAYMENT_STATUS_JOB_DRY_RUN = parseEnvBoolean("PAYMENT_STATUS_JOB_DRY_RUN");

  // Invoice Configuration
  static readonly INVOICE_STORAGE_DIR = resolveEnv("INVOICE_STORAGE_DIR");

  /**
   * Validates required runtime configuration
   * @throws Error if critical configuration is missing
   */
  static validateRuntimeConfig(): void {
    if (this.MOCK_INPOST) {
      throw new Error("[CONFIG ERROR] MOCK_INPOST cannot be used in runtime or E2E mode");
    }

    if (!this.INPOST_API_SHIPX) {
      throw new Error("[CONFIG ERROR] INPOST_API_SHIPX is required for runtime ShipX integration");
    }

    if (!this.INPOST_SHIPX_ORG_ID) {
      throw new Error("[CONFIG ERROR] INPOST_SHIPX_ORG_ID is required for runtime ShipX integration");
    }
  }

  /**
   * Checks if email service is properly configured
   */
  static isEmailConfigured(): boolean {
    return Boolean(this.EMAIL_HOST && this.EMAIL_USER && this.EMAIL_PASSWORD);
  }

  /**
   * Gets the appropriate geowidget token based on environment
   */
  static getGeowidgetToken(): string {
    return this.IS_PRODUCTION
      ? this.INPOST_GEOWIDGET
      : (this.INPOST_GEOWIDGET_NGROK || this.INPOST_GEOWIDGET);
  }
}
