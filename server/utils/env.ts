import { LogPrefix } from "../constants/logPrefixes";

/**
 * Resolves an environment variable with an optional fallback value
 * @param name - Environment variable name
 * @param fallback - Fallback value if variable is not set (default: empty string)
 * @returns Trimmed variable value or fallback
 */
export function resolveEnv(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

/**
 * Requires an environment variable to be set and valid
 * @param name - Environment variable name
 * @throws Error if variable is missing or contains placeholder values
 * @returns Trimmed variable value
 */
export function requireEnv(name: string): string {
  const value = resolveEnv(name);
  if (!value) {
    throw new Error(`${LogPrefix.CONFIG_ERROR} Missing ${name} environment variable`);
  }
  if (/<[^>]+>/.test(value)) {
    throw new Error(`${LogPrefix.CONFIG_ERROR} Invalid ${name} placeholder value`);
  }
  return value;
}

/**
 * Parses an environment variable as an integer with a fallback
 * @param name - Environment variable name
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed integer or fallback
 */
export function parseEnvInt(name: string, fallback: number): number {
  const value = resolveEnv(name);
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Parses an environment variable as a boolean
 * @param name - Environment variable name
 * @returns true if value is exactly "true", false otherwise
 */
export function parseEnvBoolean(name: string): boolean {
  return resolveEnv(name) === "true";
}
