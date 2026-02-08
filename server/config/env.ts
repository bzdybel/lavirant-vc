export function resolveEnv(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

export function requireEnv(name: string): string {
  const value = resolveEnv(name);
  if (!value) {
    throw new Error(`[CONFIG ERROR] Missing ${name} environment variable`);
  }
  if (/<[^>]+>/.test(value)) {
    throw new Error(`[CONFIG ERROR] Invalid ${name} placeholder value`);
  }
  return value;
}
