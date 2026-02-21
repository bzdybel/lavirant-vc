import { z } from "zod";
import * as path from "path";
import * as fs from "fs";

/**
 * Environment Schema Definition
 *
 * Centralized Zod schema for all environment variables.
 * Provides type safety and runtime validation.
 */

// Custom Zod validators
const Port = z.coerce.number().int().positive().min(1).max(65535);
const Email = z.string().email();
const Url = z.string().url();
const NonEmptyString = z.string().min(1);
const BooleanString = z.enum(["true", "false"]).transform(val => val === "true");
const NodeEnv = z.enum(["development", "production", "test", "staging"]).default("development");

export const EnvironmentSchema = z
  .object({
    // Node Environment
    NODE_ENV: NodeEnv,

    // Server Configuration
    PORT: Port.default(5173),
    HOST: z.string().default("0.0.0.0"),
    BASE_URL: Url.optional(),
    DOTENV_CONFIG_PATH: z.string().optional(),

    // Database Configuration
    DATABASE_URL: z.string().min(1),

    // Email Configuration (SMTP)
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: Port.default(587),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    EMAIL_FROM: Email.optional(),
    EMAIL_SECURE: BooleanString.optional(),

    // Stripe Payment Configuration
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    USE_MOCK_STRIPE: BooleanString.default("false"),

    // Payment Webhook Configuration
    PAYMENT_WEBHOOK_SECRET: z.string().optional(),
    WEBHOOK_MANUAL_ONLY: BooleanString.default("false"),

    // InPost Shipping Configuration
    INPOST_API_SHIPX: z.string().optional(),
    INPOST_SHIPX_ORG_ID: z.string().optional(),
    INPOST_SHIPX_ENV: z.enum(["sandbox", "production"]).optional(),
    INPOST_GEOWIDGET: z.string().optional(),
    INPOST_GEOWIDGET_NGROK: z.string().optional(),
    INPOST_SERVICE_LOCKER: z.string().default("inpost_locker_standard"),
    INPOST_SERVICE_COURIER: z.string().default("inpost_courier_standard"),
    INPOST_PARCEL_TEMPLATE: z.string().default("small"),
    INPOST_PARCEL_LENGTH_MM: z.coerce.number().default(80),
    INPOST_PARCEL_WIDTH_MM: z.coerce.number().default(360),
    INPOST_PARCEL_HEIGHT_MM: z.coerce.number().default(640),
    INPOST_PARCEL_WEIGHT_KG: z.coerce.number().default(2),
    MOCK_INPOST: BooleanString.default("false"),
    SHIPPING_PROVIDER: z.enum(["INPOST", "MOCK"]).default("INPOST"),

    // Background Jobs Configuration
    PAYMENT_STATUS_JOB_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
    PAYMENT_PENDING_THRESHOLD_MINUTES: z.coerce.number().int().positive().default(30),
    PAYMENT_STATUS_JOB_DRY_RUN: BooleanString.default("false"),
    SHIPX_POLLING_JOB_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),

    // Invoice Configuration
    INVOICE_STORAGE_DIR: z.string().optional(),
    INVOICE_SELLER_NAME: z.string().optional(),
    INVOICE_SELLER_FIRST_NAME: z.string().optional(),
    INVOICE_SELLER_LAST_NAME: z.string().optional(),
    INVOICE_SELLER_EMAIL: Email.optional(),
    INVOICE_SELLER_PHONE: z.string().optional(),
    INVOICE_SELLER_STREET: z.string().optional(),
    INVOICE_SELLER_BUILDING: z.string().optional(),
    INVOICE_SELLER_CITY: z.string().optional(),
    INVOICE_SELLER_POST_CODE: z.string().optional(),
    INVOICE_SELLER_ADDRESS: z.string().optional(),
    INVOICE_SELLER_NIP: z.string().optional(),
  })
  .strip();

/**
 * Parsed and validated environment variables
 */
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Environment loader interface
 */
export interface EnvironmentLoader {
  load(): Environment;
  reload(): Environment;
  get<K extends keyof Environment>(key: K): Environment[K];
}

/**
 * Simple environment loader that loads from process.env
 */
class ProcessEnvironmentLoader implements EnvironmentLoader {
  private _env: Environment | null = null;

  load(): Environment {
    try {
      this._env = EnvironmentSchema.parse(process.env);
      return this._env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Environment validation failed:");
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join(".")}: ${err.message}`);
        });
      }
      throw new Error("Failed to load environment configuration");
    }
  }

  reload(): Environment {
    this._env = null;
    return this.load();
  }

  get<K extends keyof Environment>(key: K): Environment[K] {
    if (!this._env) {
      this.load();
    }
    return this._env![key];
  }
}

/**
 * Cache-enabled environment loader with lazy loading
 */
class CachedEnvironmentLoader implements EnvironmentLoader {
  private _env: Environment | null = null;
  private _hash: string | null = null;

  private computeHash(env: NodeJS.ProcessEnv): string {
    const crypto = require("crypto");
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(env))
      .digest("hex");
  }

  load(): Environment {
    const currentHash = this.computeHash(process.env);

    if (this._env && this._hash === currentHash) {
      return this._env;
    }

    try {
      this._env = EnvironmentSchema.parse(process.env);
      this._hash = currentHash;
      return this._env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Environment validation failed:");
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join(".")}: ${err.message}`);
        });
      }
      throw new Error("Failed to load environment configuration");
    }
  }

  reload(): Environment {
    this._env = null;
    this._hash = null;
    return this.load();
  }

  get<K extends keyof Environment>(key: K): Environment[K] {
    if (!this._env) {
      this.load();
    }
    return this._env![key];
  }
}

/**
 * File-based encrypted environment loader
 * Similar to bgord's EnvironmentLoaderEncryptedAdapter
 */
class EncryptedEnvironmentLoader implements EnvironmentLoader {
  private _env: Environment | null = null;

  constructor(
    private secretsPath: string,
    private decryptionKey: string
  ) {}

  private decrypt(data: string): string {
    const crypto = require("crypto");
    const parts = data.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(this.decryptionKey, "hex"),
      iv
    );

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  load(): Environment {
    if (!fs.existsSync(this.secretsPath)) {
      throw new Error(`Secrets file not found: ${this.secretsPath}`);
    }

    try {
      const encryptedData = fs.readFileSync(this.secretsPath, "utf-8");
      const decryptedData = this.decrypt(encryptedData);
      const envData = JSON.parse(decryptedData);

      this._env = EnvironmentSchema.parse(envData);
      return this._env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Environment validation failed:");
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join(".")}: ${err.message}`);
        });
      }
      throw new Error("Failed to load encrypted environment configuration");
    }
  }

  reload(): Environment {
    this._env = null;
    return this.load();
  }

  get<K extends keyof Environment>(key: K): Environment[K] {
    if (!this._env) {
      this.load();
    }
    return this._env![key];
  }
}

/**
 * Factory function to create appropriate environment loader
 * Similar to bgord's createEnvironmentLoader pattern
 */
export function createEnvironmentLoader(): EnvironmentLoader {
  const nodeEnv = process.env.NODE_ENV || "development";

  switch (nodeEnv) {
    case "test":
      // Simple loader for tests
      return new ProcessEnvironmentLoader();

    case "development":
    case "staging":
      // Cached loader for dev/staging
      return new CachedEnvironmentLoader();

    case "production":
      // Check if encrypted secrets are available
      const secretsPath = process.env.SECRETS_PATH;
      const decryptionKey = process.env.DECRYPTION_KEY;

      if (secretsPath && decryptionKey) {
        return new EncryptedEnvironmentLoader(secretsPath, decryptionKey);
      }

      // Fallback to cached loader
      return new CachedEnvironmentLoader();

    default:
      return new CachedEnvironmentLoader();
  }
}

/**
 * Global environment loader instance
 */
let _globalLoader: EnvironmentLoader | null = null;

/**
 * Gets the global environment loader (singleton)
 */
export function getEnvironmentLoader(): EnvironmentLoader {
  if (!_globalLoader) {
    _globalLoader = createEnvironmentLoader();
  }
  return _globalLoader;
}

/**
 * Convenience function to get environment
 */
export function getEnvironment(): Environment {
  return getEnvironmentLoader().load();
}

/**
 * Convenience function to get a specific environment variable
 */
export function getEnv<K extends keyof Environment>(key: K): Environment[K] {
  return getEnvironmentLoader().get(key);
}

/**
 * Resets the global loader (useful for testing)
 */
export function resetEnvironmentLoader(): void {
  _globalLoader = null;
}
