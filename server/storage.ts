import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  users, categories, products, productAlternatives, orders, orderItems,
  type User, type UpsertUser, type InsertCategory, type Category,
  type InsertProduct, type Product, type InsertOrder, type Order,
  type InsertOrderItem, type OrderItem,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string, canApprove: boolean): Promise<User | undefined>;

  getCategories(): Promise<Category[]>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: number, cat: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  getProductAlternatives(productId: number): Promise<Product[]>;
  setProductAlternatives(productId: number, alternativeIds: number[]): Promise<void>;

  getOrders(): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string, approvedBy?: string): Promise<Order | undefined>;
  updateOrderActualTotal(id: number, total: number, receiptUrl?: string): Promise<Order | undefined>;
  assignDriver(orderId: number, driverId: string): Promise<Order | undefined>;

  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, item: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserRole(id: string, role: string, canApprove: boolean): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role, canApprove, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.sortOrder);
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const [result] = await db.insert(categories).values(cat).returning();
    return result;
  }

  async updateCategory(id: number, cat: Partial<InsertCategory>): Promise<Category | undefined> {
    const [result] = await db.update(categories).set(cat).where(eq(categories.id, id)).returning();
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true));
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return db.select().from(products).where(and(eq(products.categoryId, categoryId), eq(products.isActive, true)));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [result] = await db.insert(products).values(product).returning();
    return result;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [result] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return result;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  }

  async getProductAlternatives(productId: number): Promise<Product[]> {
    const alts = await db.select().from(productAlternatives).where(eq(productAlternatives.productId, productId));
    if (alts.length === 0) return [];
    const altIds = alts.map(a => a.alternativeProductId);
    const result: Product[] = [];
    for (const altId of altIds) {
      const [p] = await db.select().from(products).where(eq(products.id, altId));
      if (p) result.push(p);
    }
    return result;
  }

  async setProductAlternatives(productId: number, alternativeIds: number[]): Promise<void> {
    await db.delete(productAlternatives).where(eq(productAlternatives.productId, productId));
    for (const altId of alternativeIds) {
      await db.insert(productAlternatives).values({ productId, alternativeProductId: altId });
    }
  }

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.createdBy, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [result] = await db.insert(orders).values(order).returning();
    return result;
  }

  async updateOrderStatus(id: number, status: string, approvedBy?: string): Promise<Order | undefined> {
    const updates: any = { status, updatedAt: new Date() };
    if (approvedBy) updates.approvedBy = approvedBy;
    const [result] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return result;
  }

  async updateOrderActualTotal(id: number, total: number, receiptUrl?: string): Promise<Order | undefined> {
    const updates: any = { totalActual: total, updatedAt: new Date() };
    if (receiptUrl) updates.receiptImageUrl = receiptUrl;
    const [result] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return result;
  }

  async assignDriver(orderId: number, driverId: string): Promise<Order | undefined> {
    const [result] = await db.update(orders).set({ assignedDriver: driverId, updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();
    return result;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [result] = await db.insert(orderItems).values(item).returning();
    return result;
  }

  async updateOrderItem(id: number, item: Partial<InsertOrderItem>): Promise<OrderItem | undefined> {
    const [result] = await db.update(orderItems).set(item).where(eq(orderItems.id, id)).returning();
    return result;
  }

  async deleteOrderItem(id: number): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.id, id));
  }
}

export const storage = new DatabaseStorage();
