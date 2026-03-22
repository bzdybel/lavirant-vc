import type { RequestHandler } from "express";
import type { MiddlewareExpressPort } from "../utils/middlewareExpressPort";
import { resolveEnv } from "../utils/env";

export class HealthBasicAuthMiddleware implements MiddlewareExpressPort {
  handle(): RequestHandler {
    return (req, res, next) => {
      const unauthorized = () => {
        res.setHeader("WWW-Authenticate", 'Basic realm="healthcheck"');
        res.status(401).json({ error: "Unauthorized" });
      };

      const authHeader = req.headers["authorization"];

      if (!authHeader || !authHeader.startsWith("Basic ")) {
        unauthorized();
        return;
      }

      const base64Credentials = authHeader.slice("Basic ".length);
      let credentials: string;

      try {
        credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
      } catch {
        unauthorized();
        return;
      }

      const colonIndex = credentials.indexOf(":");
      if (colonIndex === -1) {
        unauthorized();
        return;
      }

      const username = credentials.slice(0, colonIndex);
      const password = credentials.slice(colonIndex + 1);

      const expectedUsername = resolveEnv("HEALTH_USERNAME");
      const expectedPassword = resolveEnv("HEALTH_PASSWORD");

      if (!expectedUsername || !expectedPassword) {
        unauthorized();
        return;
      }

      if (username !== expectedUsername || password !== expectedPassword) {
        unauthorized();
        return;
      }

      next();
    };
  }
}
