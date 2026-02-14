import { db } from "./db";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import {
  users, categories, stores, products, productAlternatives, orders, orderItems,
  vehicles, trips, tripLocations, technicians,
  type User, type UpsertUser, type InsertCategory, type Category,
  type InsertStore, type Store,
  type InsertProduct, type Product, type InsertOrder, type Order,
  type InsertOrderItem, type OrderItem,
  type Vehicle, type InsertVehicle,
  type Trip, type InsertTrip,
  type TripLocation, type InsertTripLocation,
  type Technician, type InsertTechnician,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  updateUserRole(id: string, role: string, canApprove: boolean): Promise<User | undefined>;
  suspendUser(id: string, isSuspended: boolean): Promise<User | undefined>;

  getCategories(): Promise<Category[]>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: number, cat: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  getStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined>;
  deleteStore(id: number): Promise<void>;

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
  getOrdersInDateRange(start: Date, end: Date): Promise<Order[]>;

  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, item: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(id: number): Promise<void>;

  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<void>;

  getTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTripStatus(id: number, status: string, updates?: Partial<Trip>): Promise<Trip | undefined>;

  getTripLocations(): Promise<TripLocation[]>;
  getTripLocation(id: number): Promise<TripLocation | undefined>;
  createTripLocation(loc: InsertTripLocation): Promise<TripLocation>;
  updateTripLocation(id: number, loc: Partial<InsertTripLocation>): Promise<TripLocation | undefined>;
  deleteTripLocation(id: number): Promise<void>;

  getDriverActiveTrips(driverId: string): Promise<Trip[]>;
  getDriverActiveOrders(driverId: string): Promise<Order[]>;

  getTechnicians(): Promise<Technician[]>;
  getTechnician(id: number): Promise<Technician | undefined>;
  createTechnician(tech: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, tech: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUserCount(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async updateUserRole(id: string, role: string, canApprove: boolean): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role, canApprove, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async suspendUser(id: string, isSuspended: boolean): Promise<User | undefined> {
    const [user] = await db.update(users).set({ isSuspended, updatedAt: new Date() }).where(eq(users.id, id)).returning();
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

  async getStores(): Promise<Store[]> {
    return db.select().from(stores).where(eq(stores.isActive, true));
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [result] = await db.insert(stores).values(store).returning();
    return result;
  }

  async updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined> {
    const [result] = await db.update(stores).set(store).where(eq(stores.id, id)).returning();
    return result;
  }

  async deleteStore(id: number): Promise<void> {
    await db.update(stores).set({ isActive: false }).where(eq(stores.id, id));
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

  async getOrdersInDateRange(start: Date, end: Date): Promise<Order[]> {
    return db.select().from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
      .orderBy(desc(orders.createdAt));
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

  async getVehicles(): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.isActive, true));
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [v] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return v;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [result] = await db.insert(vehicles).values(vehicle).returning();
    return result;
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [result] = await db.update(vehicles).set(vehicle).where(eq(vehicles.id, id)).returning();
    return result;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.update(vehicles).set({ isActive: false }).where(eq(vehicles.id, id));
  }

  async getTrips(): Promise<Trip[]> {
    return db.select().from(trips).orderBy(desc(trips.createdAt));
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [result] = await db.insert(trips).values(trip).returning();
    return result;
  }

  async updateTripStatus(id: number, status: string, updates?: Partial<Trip>): Promise<Trip | undefined> {
    const setData: any = { status, ...updates };
    const [result] = await db.update(trips).set(setData).where(eq(trips.id, id)).returning();
    return result;
  }

  async getTripLocations(): Promise<TripLocation[]> {
    return db.select().from(tripLocations).where(eq(tripLocations.isActive, true));
  }

  async getTripLocation(id: number): Promise<TripLocation | undefined> {
    const [loc] = await db.select().from(tripLocations).where(eq(tripLocations.id, id));
    return loc;
  }

  async createTripLocation(loc: InsertTripLocation): Promise<TripLocation> {
    const [result] = await db.insert(tripLocations).values(loc).returning();
    return result;
  }

  async updateTripLocation(id: number, loc: Partial<InsertTripLocation>): Promise<TripLocation | undefined> {
    const [result] = await db.update(tripLocations).set(loc).where(eq(tripLocations.id, id)).returning();
    return result;
  }

  async deleteTripLocation(id: number): Promise<void> {
    await db.update(tripLocations).set({ isActive: false }).where(eq(tripLocations.id, id));
  }

  async getDriverActiveTrips(driverId: string): Promise<Trip[]> {
    return db.select().from(trips).where(
      and(
        eq(trips.assignedDriver, driverId),
        inArray(trips.status, ["started", "waiting"])
      )
    );
  }

  async getDriverActiveOrders(driverId: string): Promise<Order[]> {
    return db.select().from(orders).where(
      and(
        eq(orders.assignedDriver, driverId),
        eq(orders.status, "in_progress")
      )
    );
  }

  async getTechnicians(): Promise<Technician[]> {
    return db.select().from(technicians).where(eq(technicians.isActive, true));
  }

  async getTechnician(id: number): Promise<Technician | undefined> {
    const [tech] = await db.select().from(technicians).where(eq(technicians.id, id));
    return tech;
  }

  async createTechnician(tech: InsertTechnician): Promise<Technician> {
    const [result] = await db.insert(technicians).values(tech).returning();
    return result;
  }

  async updateTechnician(id: number, tech: Partial<InsertTechnician>): Promise<Technician | undefined> {
    const [result] = await db.update(technicians).set(tech).where(eq(technicians.id, id)).returning();
    return result;
  }

  async deleteTechnician(id: number): Promise<void> {
    await db.update(technicians).set({ isActive: false }).where(eq(technicians.id, id));
  }
}

export const storage = new DatabaseStorage();
