import { AppConfig } from "./appConfig";
import type { Environment } from "./environment";

/**
 * Prerequisite Check Result
 */
export interface PrerequisiteCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Prerequisites Validator
 *
 * Validates that all required environment variables are set based on the application configuration.
 * Similar to bgord's PrerequisiteRunnerStartup pattern.
 */
export class Prerequisites {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Checks all prerequisites before server startup
   */
  check(env: Environment): PrerequisiteCheckResult {
    this.errors = [];
    this.warnings = [];

    // Always required
    this.checkRequired("DATABASE_URL", env.DATABASE_URL, "Database connection is required");

    // Stripe Configuration (required if not in mock mode)
    if (!env.USE_MOCK_STRIPE) {
      this.checkRequired(
        "STRIPE_SECRET_KEY",
        env.STRIPE_SECRET_KEY,
        "Stripe secret key is required when USE_MOCK_STRIPE is false"
      );
      this.checkRequired(
        "STRIPE_WEBHOOK_SECRET",
        env.STRIPE_WEBHOOK_SECRET,
        "Stripe webhook secret is required for webhook signature verification"
      );
    } else {
      this.warnings.push("⚠️  Running in MOCK STRIPE mode - payment processing is simulated");
    }

    // Payment Webhook Secret (required for webhook signature verification)
    if (!env.PAYMENT_WEBHOOK_SECRET && !env.STRIPE_WEBHOOK_SECRET) {
      this.warnings.push(
        "⚠️  No webhook secret configured (PAYMENT_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET) - webhook signatures cannot be verified"
      );
    }

    // Email Configuration (warn if not configured)
    if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
      this.warnings.push(
        "⚠️  Email service not configured - order confirmation emails will not be sent. " +
        "Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS to enable email functionality."
      );
    }

    // InPost Configuration (required if not in mock mode)
    if (!env.MOCK_INPOST && env.SHIPPING_PROVIDER === "INPOST") {
      this.checkRequired(
        "INPOST_API_SHIPX",
        env.INPOST_API_SHIPX,
        "InPost ShipX API token is required when MOCK_INPOST is false"
      );
      this.checkRequired(
        "INPOST_SHIPX_ORG_ID",
        env.INPOST_SHIPX_ORG_ID,
        "InPost ShipX organization ID is required when MOCK_INPOST is false"
      );
    } else if (env.MOCK_INPOST) {
      this.warnings.push("⚠️  Running in MOCK INPOST mode - shipping is simulated");
    }

    // Invoice Seller Information (required for invoice generation)
    const invoiceFields = [
      { key: "INVOICE_SELLER_NAME", value: env.INVOICE_SELLER_NAME },
      { key: "INVOICE_SELLER_EMAIL", value: env.INVOICE_SELLER_EMAIL },
      { key: "INVOICE_SELLER_ADDRESS", value: env.INVOICE_SELLER_ADDRESS },
      { key: "INVOICE_SELLER_NIP", value: env.INVOICE_SELLER_NIP },
    ];

    const missingInvoiceFields = invoiceFields.filter(f => !f.value);
    if (missingInvoiceFields.length > 0) {
      this.warnings.push(
        `⚠️  Missing invoice seller information: ${missingInvoiceFields.map(f => f.key).join(", ")} - ` +
        "invoices may not display correctly"
      );
    }

    return {
      passed: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Checks if a required value is present
   */
  private checkRequired(name: string, value: string | undefined, message: string): void {
    if (!value || value.trim().length === 0) {
      this.errors.push(`❌ ${name}: ${message}`);
    }
  }

  /**
   * Logs check results
   */
  static logResults(result: PrerequisiteCheckResult): void {
    if (result.warnings.length > 0) {
      console.log("\n⚠️  Configuration Warnings:");
      result.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (result.errors.length > 0) {
      console.error("\n❌ Configuration Errors:");
      result.errors.forEach(error => console.error(`   ${error}`));
      console.error("\nServer cannot start with missing required configuration.");
      console.error("Please check your .env file or environment variables.\n");
    } else if (result.warnings.length === 0) {
      console.log("✅ All prerequisites checked successfully");
    }
  }

  /**
   * Validates prerequisites and exits if validation fails
   */
  static validateOrExit(env: Environment): void {
    const prerequisites = new Prerequisites();
    const result = prerequisites.check(env);

    Prerequisites.logResults(result);

    if (!result.passed) {
      process.exit(1);
    }
  }
}
