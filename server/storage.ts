import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type Shipment,
  type InsertShipment,
  users,
  products,
  orders,
  shipments,
  webhookEvents,
} from "@shared/schema";
import { db } from "./db";
import { and, eq, or, sql, isNull, isNotNull, notInArray } from "drizzle-orm";

export type OrderStatus = "CREATED" | "PAYMENT_PENDING" | "PAID" | "FAILED";

export interface WebhookEventRecord {
  id: string;
  receivedAt: string;
  provider: string;
  status: string;
  paymentReference?: string | null;
  orderId?: number | null;
  signatureValid: boolean;
  rawPayload: string;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  updateOrder(id: number, update: Partial<Order>): Promise<Order | undefined>;
  getOrderByPaymentReference(paymentReference: string): Promise<Order | undefined>;
  listOrdersByStatus(status: OrderStatus): Promise<Order[]>;
  listOrdersForShipmentPolling(): Promise<Order[]>;
  getNextInvoiceNumber(issuedAt: Date): Promise<string>;
  hasProcessedWebhookEvent(eventId: string): Promise<boolean>;
  recordWebhookEvent(event: WebhookEventRecord): Promise<void>;

  // Shipments
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, update: Partial<Shipment>): Promise<Shipment | undefined>;
  getShipmentByOrderId(orderId: number): Promise<Shipment | undefined>;
}

export class DbStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(insertProduct).returning();
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const values: InsertOrder = {
      ...insertOrder,
      userId: insertOrder.userId ?? null,
      productId: insertOrder.productId ?? null,
      deliveryCost: insertOrder.deliveryCost ?? 0,
      deliveryMethod: insertOrder.deliveryMethod ?? null,
      deliveryPointId: insertOrder.deliveryPointId ?? null,
      shipmentId: insertOrder.shipmentId ?? null,
      shipmentStatus: insertOrder.shipmentStatus ?? null,
      trackingNumber: insertOrder.trackingNumber ?? null,
      labelGenerated: insertOrder.labelGenerated ?? false,
      paymentIntentId: insertOrder.paymentIntentId ?? null,
      paymentProvider: insertOrder.paymentProvider ?? null,
      paymentReference: insertOrder.paymentReference ?? null,
      paymentPendingAt: insertOrder.paymentPendingAt ?? null,
      paymentConfirmedAt: insertOrder.paymentConfirmedAt ?? null,
      invoiceNumber: insertOrder.invoiceNumber ?? null,
      invoicePdfPath: insertOrder.invoicePdfPath ?? null,
      invoiceIssuedAt: insertOrder.invoiceIssuedAt ?? null,
      emailSentAt: insertOrder.emailSentAt ?? null,
    };

    const result = await db.insert(orders).values(values).returning();
    console.log("[DB] Order persisted", { id: result[0].id });
    return result[0];
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async updateOrder(id: number, update: Partial<Order>): Promise<Order | undefined> {
    const result = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async getOrderByPaymentReference(paymentReference: string): Promise<Order | undefined> {
    const result = await db
      .select()
      .from(orders)
      .where(or(eq(orders.paymentReference, paymentReference), eq(orders.paymentIntentId, paymentReference)))
      .limit(1);
    return result[0];
  }

  async listOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.status, status));
  }

  async listOrdersForShipmentPolling(): Promise<Order[]> {
    const terminalStatuses = ["delivered", "returned"];
    return db
      .select()
      .from(orders)
      .where(
        and(
          isNotNull(orders.shipmentId),
          or(
            isNull(orders.shipmentStatus),
            notInArray(sql`lower(${orders.shipmentStatus})`, terminalStatuses),
          ),
        ),
      );
  }

  async getNextInvoiceNumber(issuedAt: Date): Promise<string> {
    const year = issuedAt.getFullYear();
    const month = `${issuedAt.getMonth() + 1}`.padStart(2, "0");
    const prefix = `FV/${year}/${month}/`;

    const result = await db.execute<{ max: number | null }>(sql`
      select max(cast(substring(${orders.invoiceNumber} from '.*/(\\d+)$') as int)) as max
      from ${orders}
      where ${orders.invoiceNumber} like ${prefix + "%"}
    `);

    const current = result.rows?.[0]?.max ?? 0;
    const next = current + 1;
    const sequence = `${next}`.padStart(4, "0");
    return `FV/${year}/${month}/${sequence}`;
  }

  async hasProcessedWebhookEvent(eventId: string): Promise<boolean> {
    const result = await db.select({ id: webhookEvents.id }).from(webhookEvents).where(eq(webhookEvents.id, eventId)).limit(1);
    return Boolean(result[0]);
  }

  async recordWebhookEvent(event: WebhookEventRecord): Promise<void> {
    await db.insert(webhookEvents).values({
      id: event.id,
      receivedAt: event.receivedAt,
      provider: event.provider,
      status: event.status,
      paymentReference: event.paymentReference ?? null,
      orderId: event.orderId ?? null,
      signatureValid: event.signatureValid,
      rawPayload: event.rawPayload,
    });
  }

  async createShipment(insertShipment: InsertShipment): Promise<Shipment> {
    const result = await db
      .insert(shipments)
      .values({
        ...insertShipment,
        selectedOfferId: insertShipment.selectedOfferId ?? null,
        boughtAt: insertShipment.boughtAt ?? null,
        buyError: insertShipment.buyError ?? null,
        shippedAt: insertShipment.shippedAt ?? null,
      })
      .returning();

    console.log("[DB] Shipment persisted", {
      id: result[0].id,
      orderId: result[0].orderId,
      providerShipmentId: result[0].providerShipmentId,
    });

    return result[0];
  }

  async updateShipment(id: number, update: Partial<Shipment>): Promise<Shipment | undefined> {
    const result = await db.update(shipments).set(update).where(eq(shipments.id, id)).returning();
    return result[0];
  }

  async getShipmentByOrderId(orderId: number): Promise<Shipment | undefined> {
    const result = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
    return result[0];
  }
}

export const storage = new DbStorage();
