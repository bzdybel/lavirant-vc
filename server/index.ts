import dotenv from "dotenv";
const envPath = process.env.DOTENV_CONFIG_PATH ?? ".env";
dotenv.config({ path: envPath });

import express from "express";
import { serveStatic, setupVite, log } from "./vite";
import { registerRoutes } from "./routes";
import { setupSitemapRoute } from "./sitemap";
import { PaymentStatusJob } from "./jobs/PaymentStatusJob";
import { ShipXPollingJob } from "./jobs/ShipXPollingJob";
import { initializeDatabase } from "./db";
import { StripeService } from "./services/StripeService";
import { AppConfig } from "./config/appConfig";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { securityHeaders } from "./middleware/securityHeaders";
import { getEnvironment } from "./config/environment";
import { Prerequisites } from "./config/prerequisites";

const app = express();

// Apply security headers in production only.
// In development, Vite's HMR preamble is an inline <script type="module"> that
// would be blocked by CSP, breaking React Fast Refresh.
if (process.env.NODE_ENV === "production") {
  app.use(securityHeaders);
}

app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") {
    return next();
  }
  return express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") {
    return next();
  }
  return express.urlencoded({ extended: false })(req, res, next);
});

// Apply request logging middleware
app.use(requestLogger);

(async () => {
  // Load and validate environment
  const env = getEnvironment();
  Prerequisites.validateOrExit(env);

  // Initialize services after environment is validated
  const { initializeServices, getEmailService, getStripeService, getPaymentStatusService, getShippingService } = await import("./services/init");

  initializeServices();
  const emailService = getEmailService();
  const stripeService = getStripeService();
  const paymentStatusService = getPaymentStatusService();
  const shippingService = getShippingService();

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

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = AppConfig.PORT;
  server.listen({
    port,
    host: AppConfig.HOST,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
