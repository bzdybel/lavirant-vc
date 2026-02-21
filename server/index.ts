import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
const envPath = process.env.DOTENV_CONFIG_PATH
  ? path.resolve(process.env.DOTENV_CONFIG_PATH)
  : path.resolve(".env");
dotenv.config({ path: envPath });

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSitemapRoute } from "./sitemap";
import { PaymentStatusJob } from "./jobs/PaymentStatusJob";
import { ShipXPollingJob } from "./jobs/ShipXPollingJob";
import { initializeDatabase } from "./db";
import { emailService, stripeService, paymentStatusService, shippingService } from "./services/init";
import { StripeService } from "./services/StripeService";
import { AppConfig } from "./config/appConfig";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { LogPrefix } from "./constants/logPrefixes";

const app = express();

const skipWebhookParsing = (req: Request) => req.path === "/api/payments/webhook";

app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") {
    return next();
  }
  return express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (skipWebhookParsing(req)) {
    return next();
  }
  return express.urlencoded({ extended: false })(req, res, next);
});

// Apply request logging middleware
app.use(requestLogger);

(async () => {
  // Validate runtime configuration
  AppConfig.validateRuntimeConfig();

  StripeService.validateConfiguration();
  emailService.initialize();
  await initializeDatabase();

  const server = await registerRoutes(app, {
    emailService,
    stripeService,
    paymentStatusService,
    shippingService,
  });

  // Initialize and start background jobs
  const paymentStatusJob = new PaymentStatusJob(stripeService, paymentStatusService);
  const shipXPollingJob = new ShipXPollingJob();

  paymentStatusJob.start();
  shipXPollingJob.start();

  // Setup SEO sitemap route
  setupSitemapRoute(app);

  // Apply error handling middleware (must be last)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000 (actually 5173)
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = AppConfig.PORT;
  server.listen({
    port,
    host: AppConfig.HOST,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
