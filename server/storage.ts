import { db } from "./db";
import { eq, desc, and, gte, lte, lt, inArray, or } from "drizzle-orm";
import {
  users, categories, stores, products, productAlternatives, orders, orderItems,
  vehicles, trips, tripLocations, technicians,
  rooms, userRooms, housekeepingTasks, taskCompletions, laundryRequests, laundrySchedule, mealItems, meals,
  shortages, pushSubscriptions, notifications, sparePartOrders, sparePartOrderItems,
  type User, type UpsertUser, type InsertCategory, type Category,
  type InsertStore, type Store,
  type InsertProduct, type Product, type InsertOrder, type Order,
  type InsertOrderItem, type OrderItem,
  type Vehicle, type InsertVehicle,
  type Trip, type InsertTrip,
  type TripLocation, type InsertTripLocation,
  type Technician, type InsertTechnician,
  type Room, type InsertRoom, type UserRoom,
  type HousekeepingTask, type InsertHousekeepingTask,
  type TaskCompletion, type InsertTaskCompletion,
  type LaundryRequest, type InsertLaundryRequest,
  type LaundryScheduleEntry, type InsertLaundrySchedule,
  type MealItem, type InsertMealItem,
  type Meal, type InsertMeal,
  type Shortage, type InsertShortage,
  type PushSubscription, type InsertPushSubscription,
  type Notification, type InsertNotification,
  type MaidCall, type InsertMaidCall,
  type DriverCall, type InsertDriverCall,
  type SparePartCategory, type InsertSparePartCategory,
  type SparePart, type InsertSparePart,
  type SparePartOrder, type InsertSparePartOrder,
  type SparePartOrderItem, type InsertSparePartOrderItem,
  maidCalls, driverCalls, sparePartCategories, spareParts,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  updateUserRole(id: string, role: string, canApprove: boolean, canAddShortages?: boolean, canApproveTrips?: boolean): Promise<User | undefined>;
  updateUserProfile(id: string, data: { firstName?: string | null; firstNameEn?: string | null; lastName?: string | null; profileImageUrl?: string | null; username?: string }): Promise<User | undefined>;
  updateUserPassword(id: string, newPasswordHash: string): Promise<void>;
  suspendUser(id: string, isSuspended: boolean): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

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
  deleteOldPendingOrders(daysOld: number): Promise<number>;

  getOrderItems(orderId: number): Promise<OrderItem[]>;
  getOrderItem(id: number): Promise<OrderItem | undefined>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, item: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(id: number): Promise<void>;
  updateOrderEstimatedTotal(id: number, total: number): Promise<Order | undefined>;
  updateOrderScheduledFor(id: number, scheduledFor: string | null): Promise<Order | undefined>;

  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<void>;

  getTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined>;
  updateTripStatus(id: number, status: string, updates?: Partial<Trip>): Promise<Trip | undefined>;

  getTripLocations(): Promise<TripLocation[]>;
  getTripLocation(id: number): Promise<TripLocation | undefined>;
  createTripLocation(loc: InsertTripLocation): Promise<TripLocation>;
  updateTripLocation(id: number, loc: Partial<InsertTripLocation>): Promise<TripLocation | undefined>;
  deleteTripLocation(id: number): Promise<void>;

  getDriverActiveTrips(driverId: string): Promise<Trip[]>;
  getDriverScheduledTrips(driverId: string): Promise<Trip[]>;
  getDriverActiveOrders(driverId: string): Promise<Order[]>;

  getTechnicians(): Promise<Technician[]>;
  getTechnician(id: number): Promise<Technician | undefined>;
  createTechnician(tech: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, tech: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: number): Promise<void>;

  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<void>;

  getUserRooms(userId: string): Promise<UserRoom[]>;
  setUserRooms(userId: string, roomIds: number[]): Promise<void>;

  getHousekeepingTasks(): Promise<HousekeepingTask[]>;
  getHousekeepingTask(id: number): Promise<HousekeepingTask | undefined>;
  createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask>;
  updateHousekeepingTask(id: number, task: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask | undefined>;
  deleteHousekeepingTask(id: number): Promise<void>;

  getTaskCompletions(date: string): Promise<TaskCompletion[]>;
  createTaskCompletion(completion: InsertTaskCompletion): Promise<TaskCompletion>;
  deleteTaskCompletion(taskId: number, date: string): Promise<void>;

  getLaundryRequests(): Promise<LaundryRequest[]>;
  getPendingLaundryRequests(): Promise<LaundryRequest[]>;
  createLaundryRequest(req: InsertLaundryRequest): Promise<LaundryRequest>;
  completeLaundryRequest(id: number, completedBy: string): Promise<LaundryRequest | undefined>;
  cancelLaundryRequest(id: number): Promise<LaundryRequest | undefined>;
  hasPendingLaundryRequestToday(roomId: number): Promise<boolean>;

  getLaundrySchedule(): Promise<LaundryScheduleEntry[]>;
  setLaundrySchedule(days: number[]): Promise<void>;

  getMealItems(): Promise<MealItem[]>;
  createMealItem(item: InsertMealItem): Promise<MealItem>;
  updateMealItem(id: number, item: Partial<InsertMealItem>): Promise<MealItem | undefined>;
  deleteMealItem(id: number): Promise<void>;

  getMeals(): Promise<Meal[]>;
  getMeal(id: number): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined>;
  deleteMeal(id: number): Promise<void>;

  getShortages(): Promise<Shortage[]>;
  getShortagesByUser(userId: string): Promise<Shortage[]>;
  getShortage(id: number): Promise<Shortage | undefined>;
  createShortage(shortage: InsertShortage): Promise<Shortage>;
  updateShortageStatus(id: number, status: string, approvedBy?: string): Promise<Shortage | undefined>;
  deleteShortage(id: number): Promise<void>;

  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: string): Promise<void>;

  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notif: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getMaidCalls(): Promise<MaidCall[]>;
  getActiveMaidCalls(): Promise<MaidCall[]>;
  createMaidCall(call: InsertMaidCall): Promise<MaidCall>;
  dismissMaidCall(id: number): Promise<MaidCall | undefined>;

  getDriverCalls(): Promise<DriverCall[]>;
  getActiveDriverCalls(): Promise<DriverCall[]>;
  createDriverCall(call: InsertDriverCall): Promise<DriverCall>;
  dismissDriverCall(id: number): Promise<DriverCall | undefined>;

  getSparePartCategories(): Promise<SparePartCategory[]>;
  createSparePartCategory(cat: InsertSparePartCategory): Promise<SparePartCategory>;
  updateSparePartCategory(id: number, cat: Partial<InsertSparePartCategory>): Promise<SparePartCategory | undefined>;
  deleteSparePartCategory(id: number): Promise<void>;

  getSpareParts(): Promise<SparePart[]>;
  getSparePart(id: number): Promise<SparePart | undefined>;
  createSparePart(part: InsertSparePart): Promise<SparePart>;
  updateSparePart(id: number, part: Partial<InsertSparePart>): Promise<SparePart | undefined>;
  deleteSparePart(id: number): Promise<void>;

  getSparePartOrders(): Promise<SparePartOrder[]>;
  createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder>;
  updateSparePartOrderStatus(id: number, status: string, approvedBy?: string): Promise<SparePartOrder | undefined>;
  getSparePartOrderItems(orderId: number): Promise<SparePartOrderItem[]>;
  createSparePartOrderItem(item: InsertSparePartOrderItem): Promise<SparePartOrderItem>;
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

  async updateUserRole(id: string, role: string, canApprove: boolean, canAddShortages?: boolean, canApproveTrips?: boolean): Promise<User | undefined> {
    const setData: any = { role, canApprove, updatedAt: new Date() };
    if (canAddShortages !== undefined) setData.canAddShortages = canAddShortages;
    if (canApproveTrips !== undefined) setData.canApproveTrips = canApproveTrips;
    const [user] = await db.update(users).set(setData).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserProfile(id: string, data: { firstName?: string | null; firstNameEn?: string | null; lastName?: string | null; profileImageUrl?: string | null; username?: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: string, newPasswordHash: string): Promise<void> {
    await db.update(users).set({ password: newPasswordHash, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async suspendUser(id: string, isSuspended: boolean): Promise<User | undefined> {
    const [user] = await db.update(users).set({ isSuspended, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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

  async deleteOldPendingOrders(daysOld: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const oldPending = await db.select().from(orders)
      .where(and(eq(orders.status, "pending"), lte(orders.createdAt, cutoff)));
    if (oldPending.length === 0) return 0;
    const orderIds = oldPending.map(o => o.id);
    await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await db.delete(orders).where(inArray(orders.id, orderIds));
    return oldPending.length;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    const [result] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return result;
  }

  async updateOrderEstimatedTotal(id: number, total: number): Promise<Order | undefined> {
    const [result] = await db.update(orders).set({ totalEstimated: total, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return result;
  }

  async updateOrderScheduledFor(id: number, scheduledFor: string | null): Promise<Order | undefined> {
    const [result] = await db.update(orders).set({ scheduledFor, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return result;
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

  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined> {
    const [result] = await db.update(trips).set(updates).where(eq(trips.id, id)).returning();
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

  async getDriverScheduledTrips(driverId: string): Promise<Trip[]> {
    return db.select().from(trips).where(
      and(
        eq(trips.assignedDriver, driverId),
        inArray(trips.status, ["pending", "approved", "started", "waiting"])
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

  async getRooms(): Promise<Room[]> {
    return db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(rooms.sortOrder);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [result] = await db.insert(rooms).values(room).returning();
    return result;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const [result] = await db.update(rooms).set(room).where(eq(rooms.id, id)).returning();
    return result;
  }

  async deleteRoom(id: number): Promise<void> {
    await db.update(rooms).set({ isActive: false }).where(eq(rooms.id, id));
  }

  async getUserRooms(userId: string): Promise<UserRoom[]> {
    return db.select().from(userRooms).where(eq(userRooms.userId, userId));
  }

  async setUserRooms(userId: string, roomIds: number[]): Promise<void> {
    await db.delete(userRooms).where(eq(userRooms.userId, userId));
    if (roomIds.length > 0) {
      await db.insert(userRooms).values(roomIds.map(roomId => ({ userId, roomId })));
    }
  }

  async getHousekeepingTasks(): Promise<HousekeepingTask[]> {
    return db.select().from(housekeepingTasks).where(eq(housekeepingTasks.isActive, true)).orderBy(housekeepingTasks.sortOrder);
  }

  async getHousekeepingTask(id: number): Promise<HousekeepingTask | undefined> {
    const [task] = await db.select().from(housekeepingTasks).where(eq(housekeepingTasks.id, id));
    return task;
  }

  async createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask> {
    const [result] = await db.insert(housekeepingTasks).values(task).returning();
    return result;
  }

  async updateHousekeepingTask(id: number, task: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask | undefined> {
    const [result] = await db.update(housekeepingTasks).set(task).where(eq(housekeepingTasks.id, id)).returning();
    return result;
  }

  async deleteHousekeepingTask(id: number): Promise<void> {
    await db.update(housekeepingTasks).set({ isActive: false }).where(eq(housekeepingTasks.id, id));
  }

  async getTaskCompletions(date: string): Promise<TaskCompletion[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoffDate = weekAgo.toISOString().split("T")[0];
    await db.delete(taskCompletions).where(lt(taskCompletions.completionDate, cutoffDate));
    return db.select().from(taskCompletions).where(eq(taskCompletions.completionDate, date));
  }

  async createTaskCompletion(completion: InsertTaskCompletion): Promise<TaskCompletion> {
    const [result] = await db.insert(taskCompletions).values(completion).returning();
    return result;
  }

  async deleteTaskCompletion(taskId: number, date: string): Promise<void> {
    await db.delete(taskCompletions).where(
      and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.completionDate, date))
    );
  }

  async getLaundryRequests(): Promise<LaundryRequest[]> {
    return db.select().from(laundryRequests).orderBy(desc(laundryRequests.createdAt));
  }

  async getPendingLaundryRequests(): Promise<LaundryRequest[]> {
    return db.select().from(laundryRequests).where(eq(laundryRequests.status, "pending")).orderBy(desc(laundryRequests.createdAt));
  }

  async createLaundryRequest(req: InsertLaundryRequest): Promise<LaundryRequest> {
    const [result] = await db.insert(laundryRequests).values(req).returning();
    return result;
  }

  async completeLaundryRequest(id: number, completedBy: string): Promise<LaundryRequest | undefined> {
    const [result] = await db.update(laundryRequests).set({
      status: "done",
      completedBy,
      completedAt: new Date(),
    }).where(eq(laundryRequests.id, id)).returning();
    return result;
  }

  async cancelLaundryRequest(id: number): Promise<LaundryRequest | undefined> {
    const [result] = await db.update(laundryRequests).set({
      status: "cancelled",
    }).where(and(eq(laundryRequests.id, id), eq(laundryRequests.status, "pending"))).returning();
    return result;
  }

  async hasPendingLaundryRequestToday(roomId: number): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const results = await db.select().from(laundryRequests).where(
      and(
        eq(laundryRequests.roomId, roomId),
        eq(laundryRequests.status, "pending"),
        gte(laundryRequests.createdAt, today),
        lt(laundryRequests.createdAt, tomorrow),
      )
    );
    return results.length > 0;
  }

  async getLaundrySchedule(): Promise<LaundryScheduleEntry[]> {
    return db.select().from(laundrySchedule).where(eq(laundrySchedule.isActive, true));
  }

  async setLaundrySchedule(days: number[]): Promise<void> {
    await db.delete(laundrySchedule);
    for (const day of days) {
      await db.insert(laundrySchedule).values({ dayOfWeek: day, isActive: true });
    }
  }

  async getMealItems(): Promise<MealItem[]> {
    return db.select().from(mealItems).orderBy(mealItems.mealType);
  }

  async createMealItem(item: InsertMealItem): Promise<MealItem> {
    const [result] = await db.insert(mealItems).values(item).returning();
    return result;
  }

  async updateMealItem(id: number, item: Partial<InsertMealItem>): Promise<MealItem | undefined> {
    const [result] = await db.update(mealItems).set(item).where(eq(mealItems.id, id)).returning();
    return result;
  }

  async deleteMealItem(id: number): Promise<void> {
    await db.delete(mealItems).where(eq(mealItems.id, id));
  }

  async getMeals(): Promise<Meal[]> {
    return db.select().from(meals).orderBy(meals.dayOfWeek);
  }

  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal;
  }

  async createMeal(meal: InsertMeal): Promise<Meal> {
    const [result] = await db.insert(meals).values(meal).returning();
    return result;
  }

  async updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined> {
    const [result] = await db.update(meals).set(meal).where(eq(meals.id, id)).returning();
    return result;
  }

  async deleteMeal(id: number): Promise<void> {
    await db.delete(meals).where(eq(meals.id, id));
  }

  async getShortages(): Promise<Shortage[]> {
    return db.select().from(shortages).orderBy(desc(shortages.createdAt));
  }

  async getShortagesByUser(userId: string): Promise<Shortage[]> {
    return db.select().from(shortages).where(eq(shortages.createdBy, userId)).orderBy(desc(shortages.createdAt));
  }

  async getShortage(id: number): Promise<Shortage | undefined> {
    const [result] = await db.select().from(shortages).where(eq(shortages.id, id));
    return result;
  }

  async createShortage(shortage: InsertShortage): Promise<Shortage> {
    const [result] = await db.insert(shortages).values(shortage).returning();
    return result;
  }

  async updateShortageStatus(id: number, status: string, approvedBy?: string): Promise<Shortage | undefined> {
    const setData: any = { status, updatedAt: new Date() };
    if (approvedBy) setData.approvedBy = approvedBy;
    const [result] = await db.update(shortages).set(setData).where(eq(shortages.id, id)).returning();
    return result;
  }

  async deleteShortage(id: number): Promise<void> {
    await db.delete(shortages).where(eq(shortages.id, id));
  }

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
    const [result] = await db.insert(pushSubscriptions).values(sub).returning();
    return result;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.length;
  }

  async createNotification(notif: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notif).returning();
    return result;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async runCleanup(): Promise<void> {
    const now = new Date();

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    try {
      await db.delete(notifications).where(lt(notifications.createdAt, twoWeeksAgo));
    } catch (e) { console.error("Cleanup notifications error:", e); }

    try {
      await db.delete(trips).where(
        and(
          or(eq(trips.status, "completed"), eq(trips.status, "rejected")),
          lt(trips.createdAt, twoWeeksAgo)
        )
      );
    } catch (e) { console.error("Cleanup trips error:", e); }

    try {
      await db.delete(laundryRequests).where(
        and(
          or(eq(laundryRequests.status, "done"), eq(laundryRequests.status, "cancelled")),
          lt(laundryRequests.createdAt, twoWeeksAgo)
        )
      );
    } catch (e) { console.error("Cleanup laundry error:", e); }

    try {
      await db.delete(shortages).where(
        and(
          or(eq(shortages.status, "completed"), eq(shortages.status, "rejected")),
          lt(shortages.createdAt, twoWeeksAgo)
        )
      );
    } catch (e) { console.error("Cleanup shortages error:", e); }

    try {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      await db.delete(maidCalls).where(
        or(
          and(eq(maidCalls.status, "dismissed"), lt(maidCalls.dismissedAt, fiveMinAgo)),
          lt(maidCalls.createdAt, twoWeeksAgo)
        )
      );
    } catch (e) { console.error("Cleanup maid calls error:", e); }

    try {
      const fiveMinAgoDriver = new Date(now.getTime() - 5 * 60 * 1000);
      await db.delete(driverCalls).where(
        or(
          and(eq(driverCalls.status, "dismissed"), lt(driverCalls.dismissedAt, fiveMinAgoDriver)),
          lt(driverCalls.createdAt, twoWeeksAgo)
        )
      );
    } catch (e) { console.error("Cleanup driver calls error:", e); }

    try {
      const oldOrders = await db.select({ id: orders.id, receiptImageUrl: orders.receiptImageUrl })
        .from(orders)
        .where(
          and(
            or(eq(orders.status, "completed"), eq(orders.status, "rejected")),
            lt(orders.createdAt, oneMonthAgo)
          )
        );

      if (oldOrders.length > 0) {
        const oldOrderIds = oldOrders.map(o => o.id);
        await db.delete(orderItems).where(inArray(orderItems.orderId, oldOrderIds));
        await db.delete(orders).where(inArray(orders.id, oldOrderIds));
      }
    } catch (e) { console.error("Cleanup orders error:", e); }


    console.log(`[Cleanup] Completed at ${now.toISOString()}`);
  }

  async getMaidCalls(): Promise<MaidCall[]> {
    return db.select().from(maidCalls).orderBy(desc(maidCalls.createdAt));
  }

  async getActiveMaidCalls(): Promise<MaidCall[]> {
    return db.select().from(maidCalls).where(eq(maidCalls.status, "active")).orderBy(desc(maidCalls.createdAt));
  }

  async createMaidCall(call: InsertMaidCall): Promise<MaidCall> {
    const [created] = await db.insert(maidCalls).values(call).returning();
    return created;
  }

  async dismissMaidCall(id: number): Promise<MaidCall | undefined> {
    const [updated] = await db.update(maidCalls).set({ status: "dismissed", dismissedAt: new Date() }).where(eq(maidCalls.id, id)).returning();
    return updated;
  }

  async getDriverCalls(): Promise<DriverCall[]> {
    return db.select().from(driverCalls).orderBy(desc(driverCalls.createdAt));
  }

  async getActiveDriverCalls(): Promise<DriverCall[]> {
    return db.select().from(driverCalls).where(eq(driverCalls.status, "active")).orderBy(desc(driverCalls.createdAt));
  }

  async createDriverCall(call: InsertDriverCall): Promise<DriverCall> {
    const [created] = await db.insert(driverCalls).values(call).returning();
    return created;
  }

  async dismissDriverCall(id: number): Promise<DriverCall | undefined> {
    const [updated] = await db.update(driverCalls).set({ status: "dismissed", dismissedAt: new Date() }).where(eq(driverCalls.id, id)).returning();
    return updated;
  }

  async getSparePartCategories(): Promise<SparePartCategory[]> {
    return db.select().from(sparePartCategories);
  }

  async createSparePartCategory(cat: InsertSparePartCategory): Promise<SparePartCategory> {
    const [created] = await db.insert(sparePartCategories).values(cat).returning();
    return created;
  }

  async updateSparePartCategory(id: number, cat: Partial<InsertSparePartCategory>): Promise<SparePartCategory | undefined> {
    const [updated] = await db.update(sparePartCategories).set(cat).where(eq(sparePartCategories.id, id)).returning();
    return updated;
  }

  async deleteSparePartCategory(id: number): Promise<void> {
    await db.delete(sparePartCategories).where(eq(sparePartCategories.id, id));
  }

  async getSpareParts(): Promise<SparePart[]> {
    return db.select().from(spareParts).orderBy(desc(spareParts.createdAt));
  }

  async getSparePart(id: number): Promise<SparePart | undefined> {
    const [part] = await db.select().from(spareParts).where(eq(spareParts.id, id));
    return part;
  }

  async createSparePart(part: InsertSparePart): Promise<SparePart> {
    const [created] = await db.insert(spareParts).values(part).returning();
    return created;
  }

  async updateSparePart(id: number, part: Partial<InsertSparePart>): Promise<SparePart | undefined> {
    const [updated] = await db.update(spareParts).set(part).where(eq(spareParts.id, id)).returning();
    return updated;
  }

  async deleteSparePart(id: number): Promise<void> {
    await db.delete(spareParts).where(eq(spareParts.id, id));
  }

  async getSparePartOrders(): Promise<SparePartOrder[]> {
    return await db.select().from(sparePartOrders).orderBy(desc(sparePartOrders.createdAt));
  }

  async createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder> {
    const [created] = await db.insert(sparePartOrders).values(order).returning();
    return created;
  }

  async updateSparePartOrderStatus(id: number, status: string, approvedBy?: string): Promise<SparePartOrder | undefined> {
    const data: any = { status };
    if (approvedBy) data.approvedBy = approvedBy;
    const [updated] = await db.update(sparePartOrders).set(data).where(eq(sparePartOrders.id, id)).returning();
    return updated;
  }

  async getSparePartOrderItems(orderId: number): Promise<SparePartOrderItem[]> {
    return await db.select().from(sparePartOrderItems).where(eq(sparePartOrderItems.orderId, orderId));
  }

  async createSparePartOrderItem(item: InsertSparePartOrderItem): Promise<SparePartOrderItem> {
    const [created] = await db.insert(sparePartOrderItems).values(item).returning();
    return created;
  }

}

export const storage = new DatabaseStorage();

setInterval(() => {
  storage.runCleanup().catch(e => console.error("Cleanup failed:", e));
}, 6 * 60 * 60 * 1000);

setTimeout(() => {
  storage.runCleanup().catch(e => console.error("Initial cleanup failed:", e));
}, 30 * 1000);
