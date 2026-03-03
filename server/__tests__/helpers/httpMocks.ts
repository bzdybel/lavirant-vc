/**
 * Shared HTTP mock helpers for handler tests.
 *
 * Centralises the Express Request/Response factory so every test file
 * uses the same implementation and a change only needs to be made once.
 */
import type { Request, Response } from "express";

/**
 * Creates a chainable Express Response mock with `status` and `json` spies.
 */
export function makeResponse(): Response {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

/**
 * Creates a minimal Express Request mock.
 * Pass overrides to set body, params, headers, etc.
 */
export function makeRequest(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as Request;
}

/** Convenience: create a jest.fn() that acts as an Express next() callback. */
export function makeNext(): jest.Mock {
  return jest.fn();
}
