/**
 * @deprecated Use server/utils/env.ts instead
 * This file is kept for backward compatibility only
 */

import { resolveEnv as resolveEnvUtil, requireEnv as requireEnvUtil } from "../utils/env";

export function resolveEnv(name: string, fallback = ""): string {
  return resolveEnvUtil(name, fallback);
}

export function requireEnv(name: string): string {
  return requireEnvUtil(name);
}
