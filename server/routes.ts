import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import { emailService } from "./emailService";

const USE_MOCK_STRIPE = process.env.USE_MOCK_STRIPE === 'true';

if (!process.env.STRIPE_SECRET_KEY && !USE_MOCK_STRIPE) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Payment functionality will be disabled.');
}

const stripe = (process.env.STRIPE_SECRET_KEY && !USE_MOCK_STRIPE)
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

if (USE_MOCK_STRIPE) {
  console.log('🔧 Running in MOCK STRIPE mode for development');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent route
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Mock mode for development
      if (USE_MOCK_STRIPE) {
        const mockClientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`;
        return res.json({ clientSecret: mockClientSecret });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "pln",
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: `Error creating payment intent: ${error.message}` });
    }
  });

  // Create order endpoint
  app.post("/api/orders", async (req, res) => {
    try {
      const {
        productId,
        quantity,
        paymentIntentId,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        country
      } = req.body;

      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      if (!firstName || !lastName || !email || !phone || !address || !city || !postalCode || !country) {
        return res.status(400).json({ message: "Missing customer information" });
      }

      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const total = product.price * quantity; // Already in cents

      const order = await storage.createOrder({
        userId: null, // Anonymous order (no login required)
        productId,
        quantity,
        total,
        status: paymentIntentId ? "completed" : "pending",
        paymentIntentId: paymentIntentId || null,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        country,
        createdAt: new Date().toISOString(),
      });

      // Send order confirmation email
      emailService.sendOrderConfirmation({
        orderId: order.id,
        firstName,
        lastName,
        email,
        productName: product.name,
        quantity,
        total,
        address,
        city,
        postalCode,
        country,
        orderDate: order.createdAt,
      }).catch(error => {
        console.error('Failed to send order confirmation email:', error);
        // Don't fail the order if email fails
      });

      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
