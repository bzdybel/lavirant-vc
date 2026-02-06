import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Price in cents
  image: text("image").notNull(),
  category: text("category").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  total: integer("total").notNull(), // Total in cents
  deliveryCost: integer("delivery_cost").notNull().default(0),
  deliveryMethod: text("delivery_method"),
  deliveryPointId: text("delivery_point_id"),
  status: text("status").notNull(), // 'CREATED', 'PAYMENT_PENDING', 'PAID', 'FAILED'
  shipmentId: text("shipment_id"),
  shipmentStatus: text("shipment_status"),
  trackingNumber: text("tracking_number"),
  labelGenerated: boolean("label_generated"),
  paymentIntentId: text("payment_intent_id"),
  paymentProvider: text("payment_provider"),
  paymentReference: text("payment_reference"),
  paymentPendingAt: text("payment_pending_at"),
  paymentConfirmedAt: text("payment_confirmed_at"),
  invoiceNumber: text("invoice_number"),
  invoicePdfPath: text("invoice_pdf_path"),
  invoiceIssuedAt: text("invoice_issued_at"),
  emailSentAt: text("email_sent_at"),
  // Customer information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  createdAt: text("created_at").notNull(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  trackingUrl: text("tracking_url").notNull(),
  status: text("status").notNull(), // 'CREATED', 'SHIPPED'
  createdAt: text("created_at").notNull(),
  shippedAt: text("shipped_at"),
});

// Schemas and types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products);

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  productId: true,
  quantity: true,
  total: true,
  deliveryCost: true,
  deliveryMethod: true,
  deliveryPointId: true,
  status: true,
  shipmentId: true,
  shipmentStatus: true,
  trackingNumber: true,
  labelGenerated: true,
  paymentIntentId: true,
  paymentProvider: true,
  paymentReference: true,
  paymentPendingAt: true,
  paymentConfirmedAt: true,
  invoiceNumber: true,
  invoicePdfPath: true,
  invoiceIssuedAt: true,
  emailSentAt: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  country: true,
  createdAt: true,
});

export const insertShipmentSchema = createInsertSchema(shipments).pick({
  orderId: true,
  provider: true,
  trackingNumber: true,
  trackingUrl: true,
  status: true,
  createdAt: true,
  shippedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;
