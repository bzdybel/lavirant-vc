import { getEnvironment, type Environment } from "./environment";
import { JobConfig } from "../constants/jobConfig";

/**
 * Application Configuration
 *
 * Centralized configuration management for the application.
 * All environment variable access should go through this module.
 *
 * Uses Zod-validated environment variables for type safety.
 */
export class AppConfig {
  private static _env: Environment | null = null;

  /**
   * Lazy-loads and caches the validated environment
   */
  private static get env(): Environment {
    if (!this._env) {
      this._env = getEnvironment();
    }
    return this._env;
  }

  // Server Configuration
  static get PORT(): number {
    return this.env.PORT;
  }

  static get HOST(): string {
    return this.env.HOST;
  }

  static get NODE_ENV(): string {
    return this.env.NODE_ENV;
  }

  static get IS_PRODUCTION(): boolean {
    return this.env.NODE_ENV === "production";
  }

  static get IS_DEVELOPMENT(): boolean {
    return this.env.NODE_ENV === "development";
  }

  static get BASE_URL(): string | undefined {
    return this.env.BASE_URL;
  }

  // Email Configuration
  static get EMAIL_HOST(): string | undefined {
    return this.env.EMAIL_HOST;
  }

  static get EMAIL_PORT(): number {
    return this.env.EMAIL_PORT;
  }

  static get EMAIL_USER(): string | undefined {
    return this.env.EMAIL_USER;
  }

  static get EMAIL_PASSWORD(): string | undefined {
    return this.env.EMAIL_PASSWORD || this.env.EMAIL_PASS;
  }

  static get EMAIL_FROM(): string | undefined {
    return this.env.EMAIL_FROM;
  }

  static get EMAIL_SECURE(): boolean {
    return this.env.EMAIL_SECURE === true || this.env.EMAIL_PORT === 465;
  }

  // Stripe Configuration
  static get STRIPE_SECRET_KEY(): string | undefined {
    return this.env.STRIPE_SECRET_KEY;
  }

  static get STRIPE_WEBHOOK_SECRET(): string | undefined {
    return this.env.STRIPE_WEBHOOK_SECRET;
  }

  static get USE_MOCK_STRIPE(): boolean {
    return this.env.USE_MOCK_STRIPE;
  }

  // Payment Webhook Configuration
  static get PAYMENT_WEBHOOK_SECRET(): string | undefined {
    return this.env.PAYMENT_WEBHOOK_SECRET;
  }

  static get WEBHOOK_MANUAL_ONLY(): boolean {
    return this.env.WEBHOOK_MANUAL_ONLY;
  }

  // InPost Configuration
  static get INPOST_API_SHIPX(): string | undefined {
    return this.env.INPOST_API_SHIPX;
  }

  static get INPOST_SHIPX_ORG_ID(): string | undefined {
    return this.env.INPOST_SHIPX_ORG_ID;
  }

  static get INPOST_SHIPX_ENV(): string {
    return this.env.INPOST_SHIPX_ENV || (this.IS_PRODUCTION ? "production" : "sandbox");
  }

  static get INPOST_GEOWIDGET(): string | undefined {
    return this.env.INPOST_GEOWIDGET;
  }

  static get INPOST_GEOWIDGET_NGROK(): string | undefined {
    return this.env.INPOST_GEOWIDGET_NGROK;
  }

  static get MOCK_INPOST(): boolean {
    return this.env.MOCK_INPOST;
  }

  static get SHIPPING_PROVIDER(): string {
    return this.env.SHIPPING_PROVIDER;
  }

  // Job Configuration
  static get PAYMENT_STATUS_JOB_INTERVAL_MINUTES(): number {
    return this.env.PAYMENT_STATUS_JOB_INTERVAL_MINUTES;
  }

  static get PAYMENT_PENDING_THRESHOLD_MINUTES(): number {
    return this.env.PAYMENT_PENDING_THRESHOLD_MINUTES;
  }

  static get PAYMENT_STATUS_JOB_DRY_RUN(): boolean {
    return this.env.PAYMENT_STATUS_JOB_DRY_RUN;
  }

  static get SHIPX_POLLING_JOB_INTERVAL_MINUTES(): number {
    return this.env.SHIPX_POLLING_JOB_INTERVAL_MINUTES;
  }

  // Invoice Configuration
  static get INVOICE_STORAGE_DIR(): string | undefined {
    return this.env.INVOICE_STORAGE_DIR;
  }

  static get INVOICE_SELLER_NAME(): string | undefined {
    return this.env.INVOICE_SELLER_NAME;
  }

  static get INVOICE_SELLER_FIRST_NAME(): string | undefined {
    return this.env.INVOICE_SELLER_FIRST_NAME;
  }

  static get INVOICE_SELLER_LAST_NAME(): string | undefined {
    return this.env.INVOICE_SELLER_LAST_NAME;
  }

  static get INVOICE_SELLER_EMAIL(): string | undefined {
    return this.env.INVOICE_SELLER_EMAIL;
  }

  static get INVOICE_SELLER_PHONE(): string | undefined {
    return this.env.INVOICE_SELLER_PHONE;
  }

  static get INVOICE_SELLER_STREET(): string | undefined {
    return this.env.INVOICE_SELLER_STREET;
  }

  static get INVOICE_SELLER_BUILDING(): string | undefined {
    return this.env.INVOICE_SELLER_BUILDING;
  }

  static get INVOICE_SELLER_CITY(): string | undefined {
    return this.env.INVOICE_SELLER_CITY;
  }

  static get INVOICE_SELLER_POST_CODE(): string | undefined {
    return this.env.INVOICE_SELLER_POST_CODE;
  }

  static get INVOICE_SELLER_ADDRESS(): string | undefined {
    return this.env.INVOICE_SELLER_ADDRESS;
  }

  static get INVOICE_SELLER_NIP(): string | undefined {
    return this.env.INVOICE_SELLER_NIP;
  }

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
      ? (this.INPOST_GEOWIDGET || "")
      : (this.INPOST_GEOWIDGET_NGROK || this.INPOST_GEOWIDGET || "");
  }

  /**
   * Reloads the environment configuration (useful for testing)
   */
  static reload(): void {
    this._env = null;
  }
}
