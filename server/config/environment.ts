import { z } from "zod";
import * as fs from "fs";
import crypto from "crypto";

/**
 * Environment Schema Definition
 *
 * Centralized Zod schema for all environment variables.
 * Provides type safety and runtime validation.
 */

const Port = z.coerce.number().int().positive().min(1).max(65535);
const Email = z.string().email();
const EmailFromField = z.string().min(1);
const Url = z.string().url();
const BooleanString = z.enum(["true", "false"]).transform(val => val === "true");
const NodeEnv = z.enum(["development", "production", "test", "staging"]).default("development");

export const EnvironmentSchema = z
  .object({
    NODE_ENV: NodeEnv,
    PORT: Port.default(5173),
    HOST: z.string().default("0.0.0.0"),
    BASE_URL: Url.optional(),
    DOTENV_CONFIG_PATH: z.string().optional(),
    DATABASE_PATH: z.string().default("./data.db"),

    // Email Configuration (SMTP)
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: Port.default(587),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    EMAIL_FROM: EmailFromField.optional(),
    EMAIL_SECURE: BooleanString.optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    USE_MOCK_STRIPE: BooleanString.default("false"),
    PAYMENT_WEBHOOK_SECRET: z.string().optional(),
    WEBHOOK_MANUAL_ONLY: BooleanString.default("false"),
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
    PAYMENT_STATUS_JOB_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
    PAYMENT_PENDING_THRESHOLD_MINUTES: z.coerce.number().int().positive().default(30),
    PAYMENT_STATUS_JOB_DRY_RUN: BooleanString.default("false"),
    SHIPX_POLLING_JOB_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
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

export type Environment = z.infer<typeof EnvironmentSchema>;

export interface EnvironmentLoader {
  load(): Environment;
  reload(): Environment;
  get<K extends keyof Environment>(key: K): Environment[K];
}

class ProcessEnvironmentLoader implements EnvironmentLoader {
  private _env: Environment | null = null;

  load(): Environment {
    try {
      console.log("Loading environment, DATABASE_PATH:", process.env.DATABASE_PATH);
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

class CachedEnvironmentLoader implements EnvironmentLoader {
  private _env: Environment | null = null;
  private _hash: string | null = null;

  private computeHash(env: NodeJS.ProcessEnv): string {
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

class EncryptedEnvironmentLoader implements EnvironmentLoader {
  private _env: Environment | null = null;

  constructor(
    private secretsPath: string,
    private decryptionKey: string
  ) {}

  private decrypt(data: string): string {
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

export function createEnvironmentLoader(): EnvironmentLoader {
  const nodeEnv = process.env.NODE_ENV || "development";

  switch (nodeEnv) {
    case "test":
      return new ProcessEnvironmentLoader();

    case "development":
    case "staging":
      return new CachedEnvironmentLoader();

    case "production": {
      const secretsPath = process.env.SECRETS_PATH;
      const decryptionKey = process.env.DECRYPTION_KEY;

      if (secretsPath && decryptionKey) {
        return new EncryptedEnvironmentLoader(secretsPath, decryptionKey);
      }

      return new CachedEnvironmentLoader();
    }

    default:
      return new CachedEnvironmentLoader();
  }
}

let _globalLoader: EnvironmentLoader | null = null;

export function getEnvironmentLoader(): EnvironmentLoader {
  if (!_globalLoader) {
    _globalLoader = createEnvironmentLoader();
  }
  return _globalLoader;
}

export function getEnvironment(): Environment {
  return getEnvironmentLoader().load();
}

export function getEnv<K extends keyof Environment>(key: K): Environment[K] {
  return getEnvironmentLoader().get(key);
}

export function resetEnvironmentLoader(): void {
  _globalLoader = null;
}
