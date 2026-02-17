import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).unique().notNull(),
  password: varchar("password", { length: 200 }).notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  firstNameEn: varchar("first_name_en"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default("household"),
  displayName: varchar("display_name"),
  canApprove: boolean("can_approve").notNull().default(false),
  canAddShortages: boolean("can_add_shortages").notNull().default(false),
  canApproveTrips: boolean("can_approve_trips").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  categoryId: integer("category_id").references(() => categories.id),
  estimatedPrice: integer("estimated_price").default(0),
  preferredStore: varchar("preferred_store", { length: 200 }),
  storeId: integer("store_id").references(() => stores.id),
  imageUrl: varchar("image_url", { length: 500 }),
  icon: varchar("icon", { length: 50 }),
  unit: varchar("unit", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
});

export const productAlternatives = pgTable("product_alternatives", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  alternativeProductId: integer("alternative_product_id").notNull().references(() => products.id),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  assignedDriver: varchar("assigned_driver").references(() => users.id),
  notes: text("notes"),
  totalEstimated: integer("total_estimated").default(0),
  totalActual: integer("total_actual").default(0),
  receiptImageUrl: varchar("receipt_image_url", { length: 500 }),
  scheduledFor: varchar("scheduled_for", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  estimatedPrice: integer("estimated_price").default(0),
  actualPrice: integer("actual_price"),
  isPurchased: boolean("is_purchased").notNull().default(false),
  substituteProductId: integer("substitute_product_id").references(() => products.id),
  notes: text("notes"),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  odometerReading: integer("odometer_reading").default(0),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  isPrivate: boolean("is_private").notNull().default(false),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  personName: varchar("person_name", { length: 200 }).notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  departureTime: timestamp("departure_time").notNull(),
  estimatedDuration: integer("estimated_duration").default(30),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
  assignedDriver: varchar("assigned_driver").references(() => users.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  startedAt: timestamp("started_at"),
  waitingStartedAt: timestamp("waiting_started_at"),
  waitingDuration: integer("waiting_duration").default(0),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  isPersonal: boolean("is_personal").notNull().default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tripLocations = pgTable("trip_locations", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  address: varchar("address", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  specialty: varchar("specialty", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  isExcluded: boolean("is_excluded").notNull().default(false),
  sortOrder: integer("sort_order").default(0),
});

export const userRooms = pgTable("user_rooms", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  roomId: integer("room_id").notNull().references(() => rooms.id),
});

export const housekeepingTasks = pgTable("housekeeping_tasks", {
  id: serial("id").primaryKey(),
  titleAr: varchar("title_ar", { length: 200 }).notNull(),
  titleEn: varchar("title_en", { length: 200 }),
  frequency: varchar("frequency", { length: 20 }).notNull().default("daily"),
  daysOfWeek: integer("days_of_week").array(),
  weeksOfMonth: integer("weeks_of_month").array(),
  specificDate: varchar("specific_date", { length: 10 }),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
});

export const taskCompletions = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => housekeepingTasks.id),
  completedBy: varchar("completed_by").notNull().references(() => users.id),
  completionDate: varchar("completion_date", { length: 10 }).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const laundryRequests = pgTable("laundry_requests", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const laundrySchedule = pgTable("laundry_schedule", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const mealItems = pgTable("meal_items", {
  id: serial("id").primaryKey(),
  mealType: varchar("meal_type", { length: 20 }).notNull(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  imageUrl: varchar("image_url", { length: 500 }),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(),
  dateStr: varchar("date_str", { length: 10 }),
  mealType: varchar("meal_type", { length: 20 }).notNull(),
  titleAr: varchar("title_ar", { length: 200 }).notNull(),
  titleEn: varchar("title_en", { length: 200 }),
  imageUrl: varchar("image_url", { length: 500 }),
  peopleCount: integer("people_count").notNull().default(4),
  notes: text("notes"),
});

export const shortages = pgTable("shortages", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  titleAr: varchar("title_ar", { length: 300 }).notNull(),
  titleEn: varchar("title_en", { length: 300 }),
  bodyAr: text("body_ar"),
  bodyEn: text("body_en"),
  type: varchar("type", { length: 50 }).notNull().default("general"),
  url: varchar("url", { length: 500 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maidCalls = pgTable("maid_calls", {
  id: serial("id").primaryKey(),
  calledBy: varchar("called_by").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  dismissedAt: timestamp("dismissed_at"),
});

export const insertMaidCallSchema = createInsertSchema(maidCalls).omit({ id: true, createdAt: true, dismissedAt: true });

export const registerSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });

export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true });
export const insertTripLocationSchema = createInsertSchema(tripLocations).omit({ id: true, createdAt: true });
export const insertTechnicianSchema = createInsertSchema(technicians).omit({ id: true, createdAt: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export const insertUserRoomSchema = createInsertSchema(userRooms).omit({ id: true });
export const insertHousekeepingTaskSchema = createInsertSchema(housekeepingTasks).omit({ id: true });
export const insertTaskCompletionSchema = createInsertSchema(taskCompletions).omit({ id: true, completedAt: true });
export const insertLaundryRequestSchema = createInsertSchema(laundryRequests).omit({ id: true, createdAt: true, completedAt: true });
export const insertLaundryScheduleSchema = createInsertSchema(laundrySchedule).omit({ id: true });
export const insertMealItemSchema = createInsertSchema(mealItems).omit({ id: true });
export const insertMealSchema = createInsertSchema(meals).omit({ id: true });
export const insertShortageSchema = createInsertSchema(shortages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });


export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type TripLocation = typeof tripLocations.$inferSelect;
export type InsertTripLocation = z.infer<typeof insertTripLocationSchema>;
export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type UserRoom = typeof userRooms.$inferSelect;
export type InsertUserRoom = z.infer<typeof insertUserRoomSchema>;
export type HousekeepingTask = typeof housekeepingTasks.$inferSelect;
export type InsertHousekeepingTask = z.infer<typeof insertHousekeepingTaskSchema>;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type InsertTaskCompletion = z.infer<typeof insertTaskCompletionSchema>;
export type LaundryRequest = typeof laundryRequests.$inferSelect;
export type InsertLaundryRequest = z.infer<typeof insertLaundryRequestSchema>;
export type LaundryScheduleEntry = typeof laundrySchedule.$inferSelect;
export type InsertLaundrySchedule = z.infer<typeof insertLaundryScheduleSchema>;
export type MealItem = typeof mealItems.$inferSelect;
export type InsertMealItem = z.infer<typeof insertMealItemSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Shortage = typeof shortages.$inferSelect;
export type InsertShortage = z.infer<typeof insertShortageSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type MaidCall = typeof maidCalls.$inferSelect;
export type InsertMaidCall = z.infer<typeof insertMaidCallSchema>;
