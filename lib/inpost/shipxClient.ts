import type { InpostEnvironment, ShipXErrorPayload } from "./types";

const BASE_URLS: Record<InpostEnvironment, string> = {
  production: "https://api-shipx-pl.easypack24.net",
  sandbox: "https://sandbox-api-shipx-pl.easypack24.net",
};

export class ShipXError extends Error {
  public readonly status: number;
  public readonly payload?: ShipXErrorPayload;

  constructor(message: string, status: number, payload?: ShipXErrorPayload) {
    super(message);
    this.name = "ShipXError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ShipXClientConfig {
  token: string;
  environment: InpostEnvironment;
}

export class ShipXClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: ShipXClientConfig) {
    this.baseUrl = BASE_URLS[config.environment];
    this.token = config.token;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = await this.safeParseErrorPayload(response);
      console.error("ShipX API error", {
        status: response.status,
        path,
        payload,
      });
      const message =
        payload?.error?.message ||
        payload?.message ||
        "ShipX API request failed";
      throw new ShipXError(message, response.status, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async requestBinary(path: string, init: RequestInit = {}): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = await this.safeParseErrorPayload(response);
      console.error("ShipX API error", {
        status: response.status,
        path,
        payload,
      });
      const message =
        payload?.error?.message ||
        payload?.message ||
        "ShipX API request failed";
      throw new ShipXError(message, response.status, payload);
    }

    return await response.arrayBuffer();
  }

  private async safeParseErrorPayload(
    response: Response
  ): Promise<ShipXErrorPayload | undefined> {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return undefined;
    }
    try {
      return (await response.json()) as ShipXErrorPayload;
    } catch {
      return undefined;
    }
  }
}

export const getShipXClient = (): ShipXClient => {
  const token = process.env.INPOST_API_SHIPX;
  if (!token) {
    throw new Error("Missing INPOST_API_SHIPX env variable");
  }

  const environment =
    (process.env.INPOST_SHIPX_ENV as InpostEnvironment) ??
    (process.env.NODE_ENV === "production" ? "production" : "sandbox");

  if (environment !== "production" && environment !== "sandbox") {
    throw new Error("Invalid INPOST_SHIPX_ENV value");
  }

  return new ShipXClient({ token, environment });
};
