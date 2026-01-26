import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type Shipment,
  type InsertShipment
} from "@shared/schema";

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
  getNextInvoiceNumber(issuedAt: Date): Promise<string>;
  hasProcessedWebhookEvent(eventId: string): Promise<boolean>;
  recordWebhookEvent(event: WebhookEventRecord): Promise<void>;

  // Shipments
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, update: Partial<Shipment>): Promise<Shipment | undefined>;
  getShipmentByOrderId(orderId: number): Promise<Shipment | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private shipments: Map<number, Shipment>;
  private shipmentsByOrderId: Map<number, number>;
  private webhookEvents: Map<string, WebhookEventRecord>;
  private invoiceCounters: Map<string, number>;
  currentId: number;
  currentProductId: number;
  currentOrderId: number;
  currentShipmentId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.shipments = new Map();
    this.shipmentsByOrderId = new Map();
    this.webhookEvents = new Map();
    this.invoiceCounters = new Map();
    this.currentId = 1;
    this.currentProductId = 1;
    this.currentOrderId = 1;
    this.currentShipmentId = 1;

    // Add sample products for testing
    this.initSampleProducts();
  }

  private initSampleProducts() {
    const sampleProducts = [
      {
        name: "Lavirant",
        description: "Pełna edycja z aplikacją mobilną. Intensywna gra towarzyska łącząca logiczne myślenie, umiejętność czytania ludzi i perfekcyjne kłamstwo. Idealna na imprezy i wieczory ze znajomymi.",
        price: 29900, // 299.00 zł in cents
        image: "/image.png",
        category: "Gry planszowe"
      }
    ];

    sampleProducts.forEach(product => {
      const id = this.currentProductId++;
      this.products.set(id, { ...product, id });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
  }

  // Orders
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      ...insertOrder,
      id,
      userId: insertOrder.userId ?? null,
      productId: insertOrder.productId ?? null,
      deliveryCost: insertOrder.deliveryCost ?? 0,
      paymentIntentId: insertOrder.paymentIntentId ?? null,
      paymentProvider: insertOrder.paymentProvider ?? null,
      paymentReference: insertOrder.paymentReference ?? null,
      paymentPendingAt: insertOrder.paymentPendingAt ?? null,
      paymentConfirmedAt: insertOrder.paymentConfirmedAt ?? null,
      invoiceNumber: insertOrder.invoiceNumber ?? null,
      invoicePdfPath: insertOrder.invoicePdfPath ?? null,
      invoiceIssuedAt: insertOrder.invoiceIssuedAt ?? null,
      emailSentAt: insertOrder.emailSentAt ?? null
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrder(id: number, update: Partial<Order>): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    const updated: Order = { ...existing, ...update };
    this.orders.set(id, updated);
    return updated;
  }

  async getOrderByPaymentReference(paymentReference: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.paymentReference === paymentReference || order.paymentIntentId === paymentReference,
    );
  }

  async listOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((order) => order.status === status);
  }

  async getNextInvoiceNumber(issuedAt: Date): Promise<string> {
    const year = issuedAt.getFullYear();
    const month = `${issuedAt.getMonth() + 1}`.padStart(2, "0");
    const key = `${year}-${month}`;
    const current = this.invoiceCounters.get(key) ?? 0;
    const next = current + 1;
    this.invoiceCounters.set(key, next);
    const sequence = `${next}`.padStart(4, "0");
    return `FV/${year}/${month}/${sequence}`;
  }

  async hasProcessedWebhookEvent(eventId: string): Promise<boolean> {
    return this.webhookEvents.has(eventId);
  }

  async recordWebhookEvent(event: WebhookEventRecord): Promise<void> {
    this.webhookEvents.set(event.id, event);
  }

  async createShipment(insertShipment: InsertShipment): Promise<Shipment> {
    const id = this.currentShipmentId++;
    const shipment: Shipment = {
      ...insertShipment,
      id,
      shippedAt: insertShipment.shippedAt ?? null,
    };
    this.shipments.set(id, shipment);
    this.shipmentsByOrderId.set(insertShipment.orderId, id);
    return shipment;
  }

  async updateShipment(id: number, update: Partial<Shipment>): Promise<Shipment | undefined> {
    const existing = this.shipments.get(id);
    if (!existing) return undefined;
    const updated: Shipment = { ...existing, ...update };
    this.shipments.set(id, updated);
    return updated;
  }

  async getShipmentByOrderId(orderId: number): Promise<Shipment | undefined> {
    const shipmentId = this.shipmentsByOrderId.get(orderId);
    if (!shipmentId) return undefined;
    return this.shipments.get(shipmentId);
  }
}

export const storage = new MemStorage();
