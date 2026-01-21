import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder
} from "@shared/schema";
 // modify the interface with any CRUD methods
// you might need

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  currentId: number;
  currentProductId: number;
  currentOrderId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.currentId = 1;
    this.currentProductId = 1;
    this.currentOrderId = 1;

    // Add sample products for testing
    this.initSampleProducts();
  }

  private initSampleProducts() {
    const sampleProducts = [
      {
        name: "Lavirant – gra blefu i dedukcji",
        description: "Pełna edycja z aplikacją mobilną. Intensywna gra towarzyska łącząca logiczne myślenie, umiejętność czytania ludzi i perfekcyjne kłamstwo. Idealna na imprezy i wieczory ze znajomymi.",
        price: 29900, // 299.00 zł in cents
        image: "/attached_assets/image.png",
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
      paymentIntentId: insertOrder.paymentIntentId ?? null
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
}

export const storage = new MemStorage();
