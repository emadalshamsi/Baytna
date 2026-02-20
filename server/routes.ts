import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import webpush from "web-push";
import { v2 as cloudinary } from "cloudinary";
import { registerSchema, loginSchema } from "@shared/schema";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@baytna.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; icon?: string; url?: string; tag?: string; badgeCount?: number }) {
  try {
    const subs = await storage.getPushSubscriptions(userId);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }
  } catch {}
}

function filterNotificationForUser(notif: any, user: { role: string; canApprove: boolean }) {
  if (user.role === "admin") return true;
  if (notif.type === "order_created" || notif.type === "trip_created") return false;
  if (notif.type === "order_ready_driver") return user.role === "driver";
  if (notif.type === "laundry_request" || notif.type === "maid_call") return user.role === "maid";
  return true;
}

async function notifyAndPush(userId: string, data: { titleAr: string; titleEn?: string; bodyAr?: string; bodyEn?: string; type: string; url?: string }) {
  try {
    await storage.createNotification({
      userId,
      titleAr: data.titleAr,
      titleEn: data.titleEn || null,
      bodyAr: data.bodyAr || null,
      bodyEn: data.bodyEn || null,
      type: data.type,
      url: data.url || null,
      isRead: false,
    });
    const unread = await storage.getUnreadNotificationCount(userId);
    await sendPushToUser(userId, {
      title: data.titleAr,
      body: data.bodyAr || "",
      url: data.url || "/",
      tag: data.type,
      badgeCount: unread,
    });
  } catch {}
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^image\/(jpeg|jpg|png|gif|webp|heic|heif)$/;
    cb(null, allowedMime.test(file.mimetype));
  },
});

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: "sessions",
  });

  const isProduction = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "baytna-dev-secret-key",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "بيانات غير صحيحة" });
      }

      const { username, password, firstName, lastName } = parsed.data;
      const firstNameEn = req.body.firstNameEn;

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userCount = await storage.getUserCount();
      const isFirstUser = userCount === 0;

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        firstName: firstName || null,
        firstNameEn: firstNameEn || null,
        lastName: lastName || null,
        role: isFirstUser ? "admin" : "household",
        canApprove: isFirstUser,
      });

      (req.session as any).userId = user.id;

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "فشل في إنشاء الحساب" });
    }
  });

  app.post("/api/admin/create-user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const admin = await storage.getUser(userId);
      if (!admin || (admin.role !== "admin" && !admin.canApprove)) {
        return res.status(403).json({ message: "Admin only" });
      }
      const { username, password, firstName, firstNameEn, lastName, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        firstName: firstName || null,
        firstNameEn: firstNameEn || null,
        lastName: lastName || null,
        role: role || "household",
        canApprove: false,
      });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Admin create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "يرجى إدخال اسم المستخدم وكلمة المرور" });
      }

      const { username, password } = parsed.data;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      if (user.isSuspended) {
        return res.status(403).json({ message: "تم تعليق حسابك. تواصل مع المدير" });
      }

      (req.session as any).userId = user.id;

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "فشل في تسجيل الدخول" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "فشل في تسجيل الخروج" });
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { firstName, firstNameEn, lastName, profileImageUrl } = req.body;
      const updateData: { firstName?: string | null; firstNameEn?: string | null; lastName?: string | null; profileImageUrl?: string | null } = {};
      if (firstName !== undefined) updateData.firstName = typeof firstName === "string" && firstName.trim() ? firstName.trim().slice(0, 100) : null;
      if (firstNameEn !== undefined) updateData.firstNameEn = typeof firstNameEn === "string" && firstNameEn.trim() ? firstNameEn.trim().slice(0, 100) : null;
      if (lastName !== undefined) updateData.lastName = typeof lastName === "string" && lastName.trim() ? lastName.trim().slice(0, 100) : null;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = typeof profileImageUrl === "string" && profileImageUrl.trim() ? profileImageUrl.trim().slice(0, 500) : null;
      const updated = await storage.updateUserProfile(userId, updateData);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Missing fields" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Password too short" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
      const hash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, hash);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { role, canApprove, canAddShortages, canApproveTrips } = req.body;
      const user = await storage.updateUserRole(req.params.id, role, canApprove ?? false, canAddShortages, canApproveTrips);
      if (user) {
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:id/suspend", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { isSuspended } = req.body;
      const user = await storage.suspendUser(req.params.id, isSuspended ?? true);
      if (user) {
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.patch("/api/users/:id/details", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { username, firstName, firstNameEn } = req.body;
      const updateData: { username?: string; firstName?: string | null; firstNameEn?: string | null } = {};
      if (username !== undefined) updateData.username = typeof username === "string" ? username.trim().slice(0, 100) : undefined;
      if (firstName !== undefined) updateData.firstName = typeof firstName === "string" && firstName.trim() ? firstName.trim().slice(0, 100) : null;
      if (firstNameEn !== undefined) updateData.firstNameEn = typeof firstNameEn === "string" && firstNameEn.trim() ? firstNameEn.trim().slice(0, 100) : null;
      const updated = await storage.updateUserProfile(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error: any) {
      if (error?.constraint === "users_username_unique" || error?.message?.includes("unique")) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(500).json({ message: "Failed to update user details" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (req.params.id === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/categories", isAuthenticated, async (_req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const cat = await storage.createCategory(req.body);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const cat = await storage.updateCategory(parseInt(req.params.id), req.body);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteCategory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.get("/api/products", isAuthenticated, async (_req, res) => {
    try {
      const prods = await storage.getProducts();
      res.json(prods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/category/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const prods = await storage.getProductsByCategory(parseInt(req.params.categoryId));
      res.json(prods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { nameAr, nameEn, categoryId, estimatedPrice, preferredStore, storeId, imageUrl, icon, unit, unitAr, unitEn, isActive } = req.body;
      const productData: any = { nameAr, nameEn, categoryId, estimatedPrice, preferredStore, storeId, imageUrl, icon, unit, isActive };
      if (unitAr !== undefined) productData.unitAr = unitAr;
      if (unitEn !== undefined) productData.unitEn = unitEn;
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error: any) {
      console.error("Failed to create product:", error?.message || error);
      if (error?.message?.includes("unit_ar") || error?.message?.includes("unit_en")) {
        const { unitAr, unitEn, ...safeBody } = req.body;
        try {
          const product = await storage.createProduct(safeBody);
          return res.json(product);
        } catch (e2: any) {
          console.error("Fallback create also failed:", e2?.message || e2);
        }
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { nameAr, nameEn, categoryId, estimatedPrice, preferredStore, storeId, imageUrl, icon, unit, unitAr, unitEn, isActive } = req.body;
      const productData: any = { nameAr, nameEn, categoryId, estimatedPrice, preferredStore, storeId, imageUrl, icon, unit, isActive };
      if (unitAr !== undefined) productData.unitAr = unitAr;
      if (unitEn !== undefined) productData.unitEn = unitEn;
      const product = await storage.updateProduct(parseInt(req.params.id), productData);
      res.json(product);
    } catch (error: any) {
      console.error("Failed to update product:", error?.message || error);
      if (error?.message?.includes("unit_ar") || error?.message?.includes("unit_en")) {
        const { unitAr, unitEn, ...safeBody } = req.body;
        try {
          const product = await storage.updateProduct(parseInt(req.params.id), safeBody);
          return res.json(product);
        } catch (e2: any) {
          console.error("Fallback update also failed:", e2?.message || e2);
        }
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteProduct(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/products/:id/alternatives", isAuthenticated, async (req, res) => {
    try {
      const alts = await storage.getProductAlternatives(parseInt(req.params.id));
      res.json(alts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alternatives" });
    }
  });

  app.put("/api/products/:id/alternatives", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.setProductAlternatives(parseInt(req.params.id), req.body.alternativeIds);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to set alternatives" });
    }
  });

  app.get("/api/orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      if (currentUser.role === "admin" || currentUser.canApprove || currentUser.role === "maid") {
        const allOrders = await storage.getOrders();
        res.json(allOrders);
      } else if (currentUser.role === "driver") {
        const approved = await storage.getOrdersByStatus("approved");
        const inProgress = await storage.getOrdersByStatus("in_progress");
        const completed = await storage.getOrdersByStatus("completed");
        const today = new Date().toISOString().split("T")[0];
        const allDriverOrders = [...approved, ...inProgress, ...completed];
        const filtered = allDriverOrders.filter(o => {
          if (o.status === "in_progress" || o.status === "completed") return true;
          if (!o.scheduledFor) return true;
          return o.scheduledFor <= today;
        });
        res.json(filtered);
      } else {
        const userOrders = await storage.getOrdersByUser(currentUser.id);
        res.json(userOrders);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const order = await storage.createOrder({ ...req.body, createdBy: userId, status: "pending" });
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === "admin" && u.id !== userId);
      for (const admin of admins) {
        notifyAndPush(admin.id, {
          titleAr: "طلب جديد",
          titleEn: "New Order",
          bodyAr: `طلب جديد #${order.id} بحاجة لاعتماد`,
          bodyEn: `New order #${order.id} needs approval`,
          type: "order_created",
          url: "/groceries",
        });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      const { status } = req.body;
      const orderId = parseInt(req.params.id);

      if (status === "approved" || status === "rejected") {
        if (!currentUser.canApprove && currentUser.role !== "admin") {
          return res.status(403).json({ message: "No approval permission" });
        }
        const order = await storage.updateOrderStatus(orderId, status, currentUser.id);
        if (order) {
          const titleAr = status === "approved" ? "تم اعتماد الطلب" : "تم رفض الطلب";
          const titleEn = status === "approved" ? "Order Approved" : "Order Rejected";
          notifyAndPush(order.createdBy, {
            titleAr, titleEn,
            bodyAr: `الطلب #${order.id} ${titleAr}`,
            bodyEn: `Order #${order.id} ${titleEn}`,
            type: `order_${status}`,
            url: "/groceries",
          });
          if (status === "approved") {
            const drivers = (await storage.getAllUsers()).filter(u => u.role === "driver");
            for (const driver of drivers) {
              notifyAndPush(driver.id, {
                titleAr: "طلب معتمد جاهز للتسوق",
                titleEn: "Approved order ready for shopping",
                bodyAr: `الطلب #${order.id} جاهز للتسوق`,
                bodyEn: `Order #${order.id} is ready`,
                type: "order_ready_driver",
                url: "/groceries",
              });
            }
          }
        }
        return res.json(order);
      }

      if (status === "in_progress" || status === "completed") {
        if (currentUser.role !== "driver" && currentUser.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const order = await storage.updateOrderStatus(orderId, status);
      if (order && status === "completed") {
        notifyAndPush(order.createdBy, {
          titleAr: "اكتمل الطلب",
          titleEn: "Order Completed",
          bodyAr: `الطلب #${order.id} اكتمل`,
          bodyEn: `Order #${order.id} completed`,
          type: "order_completed",
          url: "/groceries",
        });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id/driver", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "driver")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const driverId = req.body.driverId || currentUser.id;
      const order = await storage.assignDriver(parseInt(req.params.id), driverId);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  app.patch("/api/orders/:id/actual", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { totalActual, receiptImageUrl } = req.body;
      const order = await storage.updateOrderActualTotal(parseInt(req.params.id), totalActual, receiptImageUrl);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order total" });
    }
  });

  app.patch("/api/orders/:id/scheduled", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Order not found" });
      const isCreator = order.createdBy === currentUser.id && order.status === "pending";
      if (currentUser.role !== "admin" && !currentUser.canApprove && !isCreator) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (order.status !== "pending" && order.status !== "approved") {
        return res.status(400).json({ message: "Cannot edit this order" });
      }
      const { scheduledFor } = req.body;
      const updated = await storage.updateOrderScheduledFor(parseInt(req.params.id), scheduledFor || null);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.get("/api/orders/:id/items", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getOrderItems(parseInt(req.params.id));
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  app.post("/api/orders/:id/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Order not found" });
      const isAdminOrApprover = currentUser.role === "admin" || currentUser.canApprove;
      const isCreator = order.createdBy === currentUser.id && order.status === "pending";
      if (!isAdminOrApprover && !isCreator) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (order.status !== "pending" && order.status !== "approved") {
        return res.status(400).json({ message: "Cannot edit this order" });
      }
      const item = await storage.createOrderItem({ ...req.body, orderId: parseInt(req.params.id) });
      const items = await storage.getOrderItems(order.id);
      const newTotal = items.reduce((sum, i) => sum + (i.estimatedPrice || 0) * i.quantity, 0);
      await storage.updateOrderEstimatedTotal(order.id, newTotal);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order item" });
    }
  });

  app.patch("/api/order-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const existingItem = await storage.getOrderItem(parseInt(req.params.id));
      if (!existingItem) return res.status(404).json({ message: "Item not found" });
      const order = await storage.getOrder(existingItem.orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });
      const isDriver = currentUser.role === "driver" && order.assignedDriver === currentUser.id && order.status === "in_progress";
      const isAdminOrApprover = currentUser.role === "admin" || currentUser.canApprove;
      const isCreator = order.createdBy === currentUser.id && order.status === "pending";
      if (!isDriver && !isAdminOrApprover && !isCreator) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if ((isAdminOrApprover || isCreator) && !isDriver) {
        if (order.status !== "pending" && order.status !== "approved") {
          return res.status(400).json({ message: "Cannot edit this order" });
        }
      }
      const item = await storage.updateOrderItem(parseInt(req.params.id), req.body);
      if (item) {
        const items = await storage.getOrderItems(item.orderId);
        const newTotal = items.reduce((sum, i) => sum + (i.estimatedPrice || 0) * i.quantity, 0);
        await storage.updateOrderEstimatedTotal(item.orderId, newTotal);
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  app.delete("/api/order-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const targetItem = await storage.getOrderItem(parseInt(req.params.id));
      if (targetItem) {
        const order = await storage.getOrder(targetItem.orderId);
        if (order && order.status !== "pending" && order.status !== "approved") {
          return res.status(400).json({ message: "Cannot edit this order" });
        }
        const isCreator = order && order.createdBy === currentUser.id && order.status === "pending";
        if (currentUser.role !== "admin" && !currentUser.canApprove && !isCreator) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      await storage.deleteOrderItem(parseInt(req.params.id));
      if (targetItem) {
        const remaining = await storage.getOrderItems(targetItem.orderId);
        const newTotal = remaining.reduce((sum, i) => sum + (i.estimatedPrice || 0) * i.quantity, 0);
        await storage.updateOrderEstimatedTotal(targetItem.orderId, newTotal);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order item" });
    }
  });

  app.post("/api/upload", isAuthenticated, upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
      const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
      const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();
      console.log("[Cloudinary] Upload attempt:", {
        cloud_name: cloudName || "NOT SET",
        api_key_set: !!apiKey,
        api_key_length: apiKey.length,
        api_secret_set: !!apiSecret,
        api_secret_length: apiSecret.length,
        file_size: req.file.size,
        file_type: req.file.mimetype,
      });
      if (!cloudName || !apiKey || !apiSecret) {
        console.error("[Cloudinary] Missing credentials!", { cloudName: !!cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret });
        return res.status(500).json({ message: "Cloudinary not configured" });
      }
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "baytna",
        resource_type: "image",
      });
      console.log("[Cloudinary] Upload success:", {
        public_id: result?.public_id,
        secure_url: result?.secure_url,
        format: result?.format,
        bytes: result?.bytes,
      });
      res.json({ imageUrl: result.secure_url });
    } catch (error: any) {
      console.error("[Cloudinary] Upload failed - Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      res.status(500).json({ message: "Failed to upload file", error: error?.message || "Unknown error" });
    }
  });

  // Stores CRUD
  app.get("/api/stores", isAuthenticated, async (_req, res) => {
    try {
      const allStores = await storage.getStores();
      res.json(allStores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  app.post("/api/stores", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const store = await storage.createStore(req.body);
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to create store" });
    }
  });

  app.patch("/api/stores/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const store = await storage.updateStore(parseInt(req.params.id as string), req.body);
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Failed to update store" });
    }
  });

  app.delete("/api/stores/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteStore(parseInt(req.params.id as string));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete store" });
    }
  });

  // Helper: get current week Saturday to Friday
  function getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const diffToSat = day === 6 ? 0 : -(day + 1);
    const start = new Date(now);
    start.setDate(now.getDate() + diffToSat);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Helper: get current month range
  function getCurrentMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  app.get("/api/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getOrders();
      const allTrips = await storage.getTrips();
      const allSparePartOrders = await storage.getSparePartOrders();

      const pendingOrders = allOrders.filter(o => o.status === "pending").length;
      const pendingTrips = allTrips.filter(t => t.status === "pending").length;
      const pendingSparePartOrders = allSparePartOrders.filter(o => o.status === "pending").length;
      const pending = pendingOrders + pendingTrips + pendingSparePartOrders;

      const approved = allOrders.filter(o => o.status === "approved").length;
      const inProgress = allOrders.filter(o => o.status === "in_progress").length;

      const weekRange = getCurrentWeekRange();
      const weekOrders = await storage.getOrdersInDateRange(weekRange.start, weekRange.end);
      const completedOrdersThisWeek = weekOrders.filter(o => o.status === "completed").length;
      const completedTripsThisWeek = allTrips.filter(t => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= weekRange.start && new Date(t.completedAt) <= weekRange.end).length;
      const completedSpThisWeek = allSparePartOrders.filter(o => o.status === "completed" && o.createdAt && new Date(o.createdAt) >= weekRange.start && new Date(o.createdAt) <= weekRange.end).length;
      const completedThisWeek = completedOrdersThisWeek + completedTripsThisWeek + completedSpThisWeek;

      const total = allOrders.length + allTrips.length + allSparePartOrders.length;

      const monthRange = getCurrentMonthRange();
      const monthOrders = await storage.getOrdersInDateRange(monthRange.start, monthRange.end);
      const totalSpentThisMonth = monthOrders.filter(o => o.status === "completed").reduce((sum, o) => sum + (o.totalActual || o.totalEstimated || 0), 0);
      const sparePartsSpentThisMonth = allSparePartOrders
        .filter(o => o.status === "completed" && o.createdAt && new Date(o.createdAt) >= monthRange.start && new Date(o.createdAt) <= monthRange.end)
        .reduce((sum, o) => sum + (o.totalEstimated || 0), 0);

      res.json({
        pending,
        pendingOrders,
        pendingTrips,
        pendingSparePartOrders,
        approved,
        inProgress,
        completed: completedThisWeek,
        total,
        totalOrders: allOrders.length,
        totalTrips: allTrips.length,
        totalSparePartOrders: allSparePartOrders.length,
        totalSpent: totalSpentThisMonth + sparePartsSpentThisMonth,
        sparePartsSpent: sparePartsSpentThisMonth,
        weekStart: weekRange.start.toISOString(),
        weekEnd: weekRange.end.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Vehicles CRUD
  app.get("/api/vehicles", isAuthenticated, async (_req, res) => {
    try {
      const allVehicles = await storage.getVehicles();
      res.json(allVehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const vehicle = await storage.createVehicle(req.body);
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const vehicle = await storage.updateVehicle(parseInt(req.params.id), req.body);
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteVehicle(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  app.get("/api/drivers/:id/availability", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const driverId = req.params.id;
      const activeTrips = await storage.getDriverActiveTrips(driverId);
      const activeOrders = await storage.getDriverActiveOrders(driverId);

      const departureTime = req.query.departureTime ? new Date(req.query.departureTime as string) : null;
      const duration = req.query.duration ? parseInt(req.query.duration as string) : 30;
      const excludeTripId = req.query.excludeTripId ? parseInt(req.query.excludeTripId as string) : null;

      let timeConflicts: { id: number; personName: string; location: string; departureTime: Date; estimatedDuration: number | null }[] = [];
      if (departureTime) {
        const scheduledTrips = await storage.getDriverScheduledTrips(driverId);
        const newStart = departureTime.getTime();
        const newEnd = newStart + duration * 60 * 1000;
        timeConflicts = scheduledTrips.filter(t => {
          if (excludeTripId && t.id === excludeTripId) return false;
          const tripStart = new Date(t.departureTime).getTime();
          const tripEnd = tripStart + (t.estimatedDuration || 30) * 60 * 1000;
          return newStart < tripEnd && newEnd > tripStart;
        });
      }

      const filteredActiveTrips = excludeTripId ? activeTrips.filter(t => t.id !== excludeTripId) : activeTrips;
      res.json({
        busy: filteredActiveTrips.length > 0 || activeOrders.length > 0 || timeConflicts.length > 0,
        activeTrips: filteredActiveTrips.map(t => ({ id: t.id, personName: t.personName, location: t.location, status: t.status, isPersonal: (t as any).isPersonal || false })),
        activeOrders: activeOrders.map(o => ({ id: o.id, status: o.status })),
        timeConflicts: timeConflicts.map(t => ({
          id: t.id, personName: t.personName, location: t.location,
          departureTime: t.departureTime, estimatedDuration: t.estimatedDuration,
          isPersonal: (t as any).isPersonal || false,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check driver availability" });
    }
  });

  // Trip Locations CRUD
  app.get("/api/trip-locations", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const locations = await storage.getTripLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trip locations" });
    }
  });

  app.post("/api/trip-locations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const loc = await storage.createTripLocation(req.body);
      res.json(loc);
    } catch (error) {
      res.status(500).json({ message: "Failed to create trip location" });
    }
  });

  app.patch("/api/trip-locations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const loc = await storage.updateTripLocation(parseInt(req.params.id), req.body);
      if (!loc) return res.status(404).json({ message: "Location not found" });
      res.json(loc);
    } catch (error) {
      res.status(500).json({ message: "Failed to update trip location" });
    }
  });

  app.delete("/api/trip-locations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteTripLocation(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trip location" });
    }
  });

  // Trips CRUD
  app.get("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      const allTrips = await storage.getTrips();

      const now = new Date();
      for (const trip of allTrips) {
        if (trip.isPersonal && ["pending", "approved"].includes(trip.status) && trip.departureTime) {
          const dep = new Date(trip.departureTime);
          const duration = trip.estimatedDuration || 30;
          const endTime = new Date(dep.getTime() + duration * 60000);
          if (endTime <= now) {
            await storage.updateTripStatus(trip.id, "completed", { completedAt: endTime });
            trip.status = "completed";
            (trip as any).completedAt = endTime;
          }
        }
      }

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const filterOldCompleted = (trips: typeof allTrips) =>
        trips.filter(trip => {
          if (trip.status !== "completed") return true;
          const completedDate = trip.completedAt ? new Date(trip.completedAt) : (trip.createdAt ? new Date(trip.createdAt) : new Date());
          return completedDate >= twoDaysAgo;
        });

      if (currentUser.role === "driver") {
        const driverTrips = allTrips.filter(t => t.status === "approved" || t.status === "started" || t.status === "waiting" || t.status === "completed" || t.assignedDriver === currentUser.id);
        return res.json(filterOldCompleted(driverTrips));
      }
      if (currentUser.role === "admin") {
        return res.json(allTrips);
      }
      res.json(filterOldCompleted(allTrips));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const isPersonalTrip = req.body.isPersonal === true;
      if (!isPersonalTrip && currentUser.role !== "admin" && currentUser.role !== "household") {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (isPersonalTrip && currentUser.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can create personal trips" });
      }
      const depTime = req.body.departureTime ? new Date(req.body.departureTime) : new Date();
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (depTime < now) {
        return res.status(400).json({ message: "Cannot create a trip in the past" });
      }
      const tripData = {
        ...req.body,
        createdBy: currentUser.id,
        status: "pending",
        departureTime: depTime,
        estimatedDuration: req.body.estimatedDuration ? parseInt(req.body.estimatedDuration) : 30,
        vehicleId: req.body.vehicleId ? parseInt(req.body.vehicleId) : null,
        assignedDriver: isPersonalTrip ? currentUser.id : (req.body.assignedDriver || null),
        isPersonal: isPersonalTrip,
        approvedBy: null,
        startedAt: null,
        waitingStartedAt: null,
        waitingDuration: 0,
        completedAt: null,
      };
      const trip = await storage.createTrip(tripData);
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === "admin" && u.id !== currentUser.id);
      const approvers = allUsers.filter(u => u.canApproveTrips && u.id !== currentUser.id);
      const notifyUsers = [...new Map([...admins, ...approvers].map(u => [u.id, u])).values()];
      const personalLabel = isPersonalTrip ? " (خاص)" : "";
      const personalLabelEn = isPersonalTrip ? " (Personal)" : "";
      for (const u of notifyUsers) {
        notifyAndPush(u.id, {
          titleAr: "مشوار جديد",
          titleEn: "New Trip",
          bodyAr: `مشوار جديد لـ ${trip.personName} إلى ${trip.location}${personalLabel}`,
          bodyEn: `New trip for ${trip.personName} to ${trip.location}${personalLabelEn}`,
          type: "trip_created",
          url: "/logistics",
        });
      }
      res.json(trip);
    } catch (error) {
      console.error("Failed to create trip:", error);
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.patch("/api/trips/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.status !== "pending") {
        return res.status(400).json({ message: "Only pending trips can be edited" });
      }
      if (trip.createdBy !== currentUser.id && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Only the creator or admin can edit this trip" });
      }
      const updates: any = {};
      if (req.body.departureTime && typeof req.body.departureTime === "string") {
        const dt = new Date(req.body.departureTime);
        if (!isNaN(dt.getTime())) updates.departureTime = dt;
      }
      if (req.body.estimatedDuration !== undefined) {
        const dur = parseInt(req.body.estimatedDuration);
        if (!isNaN(dur) && dur >= 15 && dur <= 120) updates.estimatedDuration = dur;
      }
      if (req.body.vehicleId !== undefined) updates.vehicleId = req.body.vehicleId ? parseInt(req.body.vehicleId) : null;
      if (req.body.notes !== undefined) updates.notes = typeof req.body.notes === "string" ? req.body.notes || null : null;
      if (currentUser.role === "admin") {
        if (req.body.personName !== undefined) updates.personName = req.body.personName;
        if (req.body.location !== undefined) updates.location = req.body.location;
        if (req.body.assignedDriver !== undefined) updates.assignedDriver = req.body.assignedDriver || null;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const updated = await storage.updateTrip(tripId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update trip:", error);
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  app.patch("/api/trips/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      const { status } = req.body;
      const tripId = parseInt(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });

      if (status === "approved" || status === "rejected") {
        if (!currentUser.canApproveTrips && currentUser.role !== "admin") {
          return res.status(403).json({ message: "No approval permission" });
        }
        const updated = await storage.updateTripStatus(tripId, status, { approvedBy: currentUser.id });
        if (updated && updated.assignedDriver) {
          notifyAndPush(updated.assignedDriver, {
            titleAr: status === "approved" ? "تم اعتماد المشوار" : "تم رفض المشوار",
            titleEn: status === "approved" ? "Trip Approved" : "Trip Rejected",
            bodyAr: `المشوار إلى ${updated.location} ${status === "approved" ? "تم اعتماده" : "تم رفضه"}`,
            bodyEn: `Trip to ${updated.location} was ${status}`,
            type: `trip_${status}`,
            url: "/logistics",
          });
        }
        notifyAndPush(trip.createdBy, {
          titleAr: status === "approved" ? "تم اعتماد المشوار" : "تم رفض المشوار",
          titleEn: status === "approved" ? "Trip Approved" : "Trip Rejected",
          bodyAr: `المشوار إلى ${trip.location} ${status === "approved" ? "تم اعتماده" : "تم رفضه"}`,
          bodyEn: `Trip to ${trip.location} was ${status}`,
          type: `trip_${status}`,
          url: "/logistics",
        });
        return res.json(updated);
      }

      if (status === "cancelled") {
        if (trip.createdBy !== currentUser.id && currentUser.role !== "admin") {
          return res.status(403).json({ message: "Only the trip creator or admin can cancel" });
        }
        if (!["pending", "approved"].includes(trip.status)) {
          return res.status(400).json({ message: "Can only cancel pending or approved trips" });
        }
        const updated = await storage.updateTripStatus(tripId, status);
        return res.json(updated);
      }

      if (status === "started") {
        if (currentUser.role !== "driver" && currentUser.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const updated = await storage.updateTripStatus(tripId, status, {
          startedAt: new Date(),
          assignedDriver: currentUser.id,
        });
        return res.json(updated);
      }

      if (status === "waiting") {
        if (currentUser.role !== "driver" && currentUser.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const updated = await storage.updateTripStatus(tripId, status, {
          waitingStartedAt: new Date(),
        });
        return res.json(updated);
      }

      if (status === "completed") {
        if (currentUser.role !== "driver" && currentUser.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        let waitingDuration = trip.waitingDuration || 0;
        if (trip.waitingStartedAt) {
          waitingDuration += Math.floor((Date.now() - new Date(trip.waitingStartedAt).getTime()) / 1000);
        }
        const updated = await storage.updateTripStatus(tripId, status, {
          completedAt: new Date(),
          waitingDuration,
          waitingStartedAt: null,
        });
        return res.json(updated);
      }

      const updated = await storage.updateTripStatus(tripId, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update trip status" });
    }
  });

  // Technicians CRUD
  app.get("/api/technicians", isAuthenticated, async (_req, res) => {
    try {
      const allTechnicians = await storage.getTechnicians();
      res.json(allTechnicians);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  app.post("/api/technicians", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const tech = await storage.createTechnician(req.body);
      res.json(tech);
    } catch (error) {
      res.status(500).json({ message: "Failed to create technician" });
    }
  });

  app.patch("/api/technicians/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const tech = await storage.updateTechnician(parseInt(req.params.id), req.body);
      res.json(tech);
    } catch (error) {
      res.status(500).json({ message: "Failed to update technician" });
    }
  });

  app.delete("/api/technicians/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteTechnician(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete technician" });
    }
  });

  // Create a coordination trip for technician
  app.post("/api/technicians/:id/coordinate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      const tech = await storage.getTechnician(parseInt(req.params.id));
      if (!tech) return res.status(404).json({ message: "Technician not found" });

      const trip = await storage.createTrip({
        personName: tech.name,
        location: req.body.location || tech.specialty,
        departureTime: req.body.departureTime ? new Date(req.body.departureTime) : new Date(),
        status: "pending",
        notes: `تنسيق مع فني: ${tech.name} - ${tech.specialty} - ${tech.phone}`,
        createdBy: currentUser.id,
        assignedDriver: null,
        approvedBy: null,
        vehicleId: null,
        startedAt: null,
        waitingStartedAt: null,
        waitingDuration: 0,
        completedAt: null,
      });
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Failed to create coordination trip" });
    }
  });

  // ==================== SPARE PARTS ROUTES ====================

  app.get("/api/spare-part-categories", isAuthenticated, async (_req, res) => {
    try {
      const cats = await storage.getSparePartCategories();
      res.json(cats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spare part categories" });
    }
  });

  app.post("/api/spare-part-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const cat = await storage.createSparePartCategory(req.body);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ message: "Failed to create spare part category" });
    }
  });

  app.patch("/api/spare-part-categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const updated = await storage.updateSparePartCategory(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update spare part category" });
    }
  });

  app.delete("/api/spare-part-categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteSparePartCategory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete spare part category" });
    }
  });

  app.get("/api/spare-parts", isAuthenticated, async (_req, res) => {
    try {
      const parts = await storage.getSpareParts();
      res.json(parts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spare parts" });
    }
  });

  app.post("/api/spare-parts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const part = await storage.createSparePart(req.body);
      res.json(part);
    } catch (error) {
      res.status(500).json({ message: "Failed to create spare part" });
    }
  });

  app.patch("/api/spare-parts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const updated = await storage.updateSparePart(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update spare part" });
    }
  });

  app.delete("/api/spare-parts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteSparePart(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete spare part" });
    }
  });

  // Spare Part Orders
  app.get("/api/spare-part-orders", isAuthenticated, async (_req, res) => {
    try {
      const allOrders = await storage.getSparePartOrders();
      res.json(allOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spare part orders" });
    }
  });

  app.post("/api/spare-part-orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const { createdBy, notes, totalEstimated, status } = req.body;
      if (!createdBy || !status) return res.status(400).json({ message: "Missing required fields" });
      const order = await storage.createSparePartOrder({ createdBy, notes: notes || null, totalEstimated: totalEstimated || 0, status });
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create spare part order" });
    }
  });

  app.patch("/api/spare-part-orders/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(403).json({ message: "Forbidden" });
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required" });
      const isAdminOrApprover = currentUser.role === "admin" || currentUser.canApprove;
      const isDriver = currentUser.role === "driver";
      if (["approved", "rejected"].includes(status) && !isAdminOrApprover) return res.status(403).json({ message: "Forbidden" });
      if (["in_progress", "completed"].includes(status) && !isDriver && !isAdminOrApprover) return res.status(403).json({ message: "Forbidden" });
      const approvedBy = status === "approved" ? currentUser.id : undefined;
      const updated = await storage.updateSparePartOrderStatus(parseInt(req.params.id), status, approvedBy);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update spare part order status" });
    }
  });

  app.get("/api/spare-part-orders/:id/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const items = await storage.getSparePartOrderItems(parseInt(req.params.id));
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spare part order items" });
    }
  });

  app.post("/api/spare-part-orders/:id/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const { sparePartId, quantity, price } = req.body;
      if (!sparePartId || !quantity) return res.status(400).json({ message: "Missing required fields" });
      const item = await storage.createSparePartOrderItem({ orderId: parseInt(req.params.id), sparePartId, quantity, price: price || 0 });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create spare part order item" });
    }
  });

  // ==================== HOUSEKEEPING ROUTES ====================

  // Rooms CRUD
  app.get("/api/rooms", isAuthenticated, async (_req, res) => {
    try {
      const allRooms = await storage.getRooms();
      res.json(allRooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const allRooms = await storage.getRooms();
      const maxSort = allRooms.reduce((max, r) => Math.max(max, r.sortOrder || 0), 0);
      const room = await storage.createRoom({ ...req.body, sortOrder: maxSort + 1 });
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.post("/api/rooms/reorder", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { orderedIds } = req.body as { orderedIds: number[] };
      if (!Array.isArray(orderedIds)) return res.status(400).json({ message: "orderedIds required" });
      for (let i = 0; i < orderedIds.length; i++) {
        await storage.updateRoom(orderedIds[i], { sortOrder: i });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder rooms" });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const room = await storage.updateRoom(parseInt(req.params.id), req.body);
      if (!room) return res.status(404).json({ message: "Room not found" });
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteRoom(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  app.get("/api/user-rooms/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      if (currentUser.role !== "admin" && currentUser.id !== req.params.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const userRoomsList = await storage.getUserRooms(req.params.userId);
      res.json(userRoomsList.map(ur => ur.roomId));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user rooms" });
    }
  });

  app.put("/api/user-rooms/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { roomIds } = req.body as { roomIds: number[] };
      if (!Array.isArray(roomIds)) return res.status(400).json({ message: "roomIds required" });
      await storage.setUserRooms(req.params.userId, roomIds);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user rooms" });
    }
  });

  // Housekeeping Tasks CRUD
  app.get("/api/housekeeping-tasks", isAuthenticated, async (_req, res) => {
    try {
      const tasks = await storage.getHousekeepingTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/housekeeping-tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!req.body.roomId) {
        return res.status(400).json({ message: "Room is required" });
      }
      if (!req.body.titleAr) {
        return res.status(400).json({ message: "Task title is required" });
      }
      const task = await storage.createHousekeepingTask(req.body);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/housekeeping-tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const task = await storage.updateHousekeepingTask(parseInt(req.params.id), req.body);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/housekeeping-tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteHousekeepingTask(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task Completions
  app.get("/api/task-completions/:date", isAuthenticated, async (req, res) => {
    try {
      const completions = await storage.getTaskCompletions(req.params.date);
      res.json(completions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch completions" });
    }
  });

  app.post("/api/task-completions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const completion = await storage.createTaskCompletion({
        ...req.body,
        completedBy: userId,
      });
      res.json(completion);
    } catch (error) {
      res.status(500).json({ message: "Failed to create completion" });
    }
  });

  app.delete("/api/task-completions/:taskId/:date", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteTaskCompletion(parseInt(req.params.taskId), req.params.date);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete completion" });
    }
  });

  // Laundry Requests
  app.get("/api/laundry-requests", isAuthenticated, async (_req, res) => {
    try {
      const requests = await storage.getLaundryRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch laundry requests" });
    }
  });

  app.get("/api/laundry-requests/pending", isAuthenticated, async (_req, res) => {
    try {
      const requests = await storage.getPendingLaundryRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending laundry requests" });
    }
  });

  app.post("/api/laundry-requests", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const hasPending = await storage.hasPendingLaundryRequestToday(req.body.roomId);
      if (hasPending) {
        return res.status(400).json({ message: "A pending laundry request already exists for this room today" });
      }
      const request = await storage.createLaundryRequest({
        ...req.body,
        requestedBy: userId,
        status: "pending",
      });
      const room = await storage.getRoom(req.body.roomId);
      const maids = (await storage.getAllUsers()).filter(u => u.role === "maid" || u.role === "admin");
      for (const maid of maids) {
        if (maid.id !== userId) {
          notifyAndPush(maid.id, {
            titleAr: "طلب غسيل جديد",
            titleEn: "New Laundry Request",
            bodyAr: `طلب غسيل من ${room ? room.nameAr : "غرفة"}`,
            bodyEn: `Laundry request from ${room ? (room.nameEn || room.nameAr) : "room"}`,
            type: "laundry_request",
            url: "/housekeeping",
          });
        }
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to create laundry request" });
    }
  });

  app.delete("/api/laundry-requests/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      const requests = await storage.getLaundryRequests();
      const request = requests.find(r => r.id === parseInt(req.params.id));
      if (!request) return res.status(404).json({ message: "Request not found" });
      if (request.status !== "pending") return res.status(400).json({ message: "Can only cancel pending requests" });
      if (request.requestedBy !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const result = await storage.cancelLaundryRequest(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel laundry request" });
    }
  });

  app.patch("/api/laundry-requests/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const result = await storage.completeLaundryRequest(parseInt(req.params.id), userId);
      if (!result) return res.status(404).json({ message: "Request not found" });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete laundry request" });
    }
  });

  // Laundry Schedule
  app.get("/api/laundry-schedule", isAuthenticated, async (_req, res) => {
    try {
      const schedule = await storage.getLaundrySchedule();
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch laundry schedule" });
    }
  });

  app.put("/api/laundry-schedule", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.setLaundrySchedule(req.body.days || []);
      const schedule = await storage.getLaundrySchedule();
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update laundry schedule" });
    }
  });

  // Meals CRUD
  app.get("/api/meal-items", isAuthenticated, async (_req, res) => {
    try {
      const items = await storage.getMealItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal items" });
    }
  });

  app.post("/api/meal-items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== "admin" && !user.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const item = await storage.createMealItem(req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create meal item" });
    }
  });

  app.patch("/api/meal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== "admin" && !user.canApprove)) return res.status(403).json({ message: "Forbidden" });
      const item = await storage.updateMealItem(parseInt(req.params.id), req.body);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update meal item" });
    }
  });

  app.delete("/api/meal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || (user.role !== "admin" && !user.canApprove)) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteMealItem(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meal item" });
    }
  });

  app.get("/api/meals", isAuthenticated, async (_req, res) => {
    try {
      const allMeals = await storage.getMeals();
      res.json(allMeals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.post("/api/meals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const meal = await storage.createMeal(req.body);
      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create meal" });
    }
  });

  app.patch("/api/meals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const meal = await storage.updateMeal(parseInt(req.params.id), req.body);
      if (!meal) return res.status(404).json({ message: "Meal not found" });
      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  app.delete("/api/meals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || (currentUser.role !== "admin" && !currentUser.canApprove)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteMeal(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  // Allow maid to add items to in_progress orders
  app.post("/api/orders/:id/items/maid", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      const orderId = parseInt(req.params.id as string);
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      if (order.status !== "in_progress" && order.status !== "approved") {
        return res.status(400).json({ message: "Cannot add items to this order" });
      }

      if (currentUser.role !== "maid" && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const item = await storage.createOrderItem({ ...req.body, orderId });
      // Update estimated total
      const items = await storage.getOrderItems(orderId);
      const newTotal = items.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
      await storage.updateOrderActualTotal(orderId, order.totalActual || 0);

      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to add item" });
    }
  });

  // Maid Calls
  app.get("/api/maid-calls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allCalls = await storage.getMaidCalls();
      const now = Date.now();
      const TWO_MINUTES = 2 * 60 * 1000;
      const calls = allCalls.filter((c) => {
        if (c.status === "active") return true;
        if (c.status === "dismissed" && c.dismissedAt) {
          return (now - new Date(c.dismissedAt).getTime()) < TWO_MINUTES;
        }
        return false;
      });
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to get maid calls" });
    }
  });

  app.post("/api/maid-calls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser || currentUser.role !== "household") {
        return res.status(403).json({ message: "Only household users can call the maid" });
      }
      const { targetUserId } = req.body;
      const call = await storage.createMaidCall({ calledBy: userId, targetUserId: targetUserId || null, status: "active" });
      const callerNameAr = currentUser.firstName || currentUser.username;
      const callerNameEn = currentUser.firstNameEn || currentUser.username;
      if (targetUserId) {
        await notifyAndPush(targetUserId, {
          titleAr: `نداء من ${callerNameAr}`,
          titleEn: `Call from ${callerNameEn}`,
          bodyAr: `يرجى التوجه الآن ل${callerNameAr}`,
          bodyEn: `Please come now to ${callerNameEn}`,
          type: "maid_call",
          url: "/",
        });
      } else {
        const allUsers = await storage.getAllUsers();
        const maids = allUsers.filter(u => u.role === "maid" && !u.isSuspended);
        for (const maid of maids) {
          await notifyAndPush(maid.id, {
            titleAr: `نداء من ${callerNameAr}`,
            titleEn: `Call from ${callerNameEn}`,
            bodyAr: `يرجى التوجه الآن ل${callerNameAr}`,
            bodyEn: `Please come now to ${callerNameEn}`,
            type: "maid_call",
            url: "/",
          });
        }
      }
      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to create maid call" });
    }
  });

  app.patch("/api/maid-calls/:id/dismiss", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser || (currentUser.role !== "maid" && currentUser.role !== "admin")) {
        return res.status(403).json({ message: "Only maids or admins can dismiss calls" });
      }
      const call = await storage.dismissMaidCall(parseInt(req.params.id));
      if (!call) return res.status(404).json({ message: "Call not found" });
      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to dismiss maid call" });
    }
  });

  // Driver Calls
  app.get("/api/driver-calls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allCalls = await storage.getDriverCalls();
      const now = Date.now();
      const TWO_MINUTES = 2 * 60 * 1000;
      const calls = allCalls.filter((c) => {
        if (c.status === "active") return true;
        if (c.status === "dismissed" && c.dismissedAt) {
          return (now - new Date(c.dismissedAt).getTime()) < TWO_MINUTES;
        }
        return false;
      });
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to get driver calls" });
    }
  });

  app.post("/api/driver-calls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser || currentUser.role !== "household") {
        return res.status(403).json({ message: "Only household users can call the driver" });
      }
      const { targetUserId } = req.body;
      const call = await storage.createDriverCall({ calledBy: userId, targetUserId: targetUserId || null, status: "active" });
      const callerNameAr = currentUser.firstName || currentUser.username;
      const callerNameEn = currentUser.firstNameEn || currentUser.username;
      if (targetUserId) {
        await notifyAndPush(targetUserId, {
          titleAr: `نداء من ${callerNameAr}`,
          titleEn: `Call from ${callerNameEn}`,
          bodyAr: `يرجى التوجه الآن ل${callerNameAr}`,
          bodyEn: `Please come now to ${callerNameEn}`,
          type: "driver_call",
          url: "/",
        });
      } else {
        const allUsers = await storage.getAllUsers();
        const drivers = allUsers.filter(u => u.role === "driver" && !u.isSuspended);
        for (const driver of drivers) {
          await notifyAndPush(driver.id, {
            titleAr: `نداء من ${callerNameAr}`,
            titleEn: `Call from ${callerNameEn}`,
            bodyAr: `يرجى التوجه الآن ل${callerNameAr}`,
            bodyEn: `Please come now to ${callerNameEn}`,
            type: "driver_call",
            url: "/",
          });
        }
      }
      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to create driver call" });
    }
  });

  app.patch("/api/driver-calls/:id/dismiss", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser || (currentUser.role !== "driver" && currentUser.role !== "admin")) {
        return res.status(403).json({ message: "Only drivers or admins can dismiss calls" });
      }
      const call = await storage.dismissDriverCall(parseInt(req.params.id));
      if (!call) return res.status(404).json({ message: "Call not found" });
      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to dismiss driver call" });
    }
  });

  app.get("/api/vapid-public-key", (_req: Request, res: Response) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  app.post("/api/push-subscribe", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription" });
      }
      await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  app.post("/api/push-unsubscribe", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await storage.deletePushSubscription(endpoint);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const notifs = await storage.getNotifications(userId);
      const filtered = notifs.filter((n: any) => filterNotificationForUser(n, currentUser));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      const role = currentUser.role;

      const today = new Date();
      const dayOfWeek = today.getDay();
      const dateStr = today.toISOString().split("T")[0];

      let groceries = 0;
      let logistics = 0;
      let housekeeping = 0;

      if (role === "admin") {
        const allOrders = await storage.getOrders();
        const pendingOrders = allOrders.filter((o: any) => o.status === "pending");
        groceries = pendingOrders.length;

        const allTrips = await storage.getTrips();
        const pendingTrips = allTrips.filter((t: any) => t.status === "pending");
        logistics = pendingTrips.length;

        const laundryReqs = await storage.getLaundryRequests();
        const pendingLaundry = laundryReqs.filter((l: any) => l.status === "pending").length;
        housekeeping = pendingLaundry;

      } else if (role === "driver") {
        const allOrders = await storage.getOrders();
        const activeDriverOrders = allOrders.filter((o: any) => o.assignedDriver === userId && ["approved", "in_progress"].includes(o.status));
        groceries = activeDriverOrders.length;

        const allTrips = await storage.getTrips();
        const activeDriverTrips = allTrips.filter((t: any) => t.assignedDriver === userId && ["approved", "started", "waiting"].includes(t.status));
        logistics = activeDriverTrips.length;

      } else if (role === "maid") {
        const allOrders = await storage.getOrders();
        const activeOrders = allOrders.filter((o: any) => ["pending", "approved", "in_progress"].includes(o.status));
        groceries = activeOrders.length;

        const tasks = await storage.getHousekeepingTasks();
        const activeTasks = tasks.filter((t: any) => t.isActive && t.daysOfWeek && t.daysOfWeek.includes(dayOfWeek));
        const completions = await storage.getTaskCompletions(dateStr);
        const completedTaskIds = new Set(completions.map((c: any) => c.taskId));
        const incompleteTasks = activeTasks.filter((t: any) => !completedTaskIds.has(t.id)).length;

        const laundryReqs = await storage.getLaundryRequests();
        const pendingLaundry = laundryReqs.filter((l: any) => l.status === "pending").length;

        const mealsData = await storage.getMeals();
        const todayMeals = mealsData.filter((m: any) => m.dayOfWeek === dayOfWeek).length;

        housekeeping = incompleteTasks + pendingLaundry + todayMeals;

      } else if (role === "household") {
        const allOrders = await storage.getOrders();
        const myActiveOrders = allOrders.filter((o: any) => o.createdBy === userId && ["pending", "approved", "in_progress"].includes(o.status));
        groceries = myActiveOrders.length;

        const allTrips = await storage.getTrips();
        const myActiveTrips = allTrips.filter((t: any) => t.createdBy === userId && ["pending", "approved", "started", "waiting"].includes(t.status));
        logistics = myActiveTrips.length;

        const userRoomsList = await storage.getUserRooms(userId);
        const userRoomIds = userRoomsList.map((ur: any) => ur.roomId);
        const hasRoomFilter = userRoomIds.length > 0;

        const tasks = await storage.getHousekeepingTasks();
        let activeTasks = tasks.filter((t: any) => t.isActive && t.daysOfWeek && t.daysOfWeek.includes(dayOfWeek));
        if (hasRoomFilter) {
          activeTasks = activeTasks.filter((t: any) => userRoomIds.includes(t.roomId));
        }
        const completions = await storage.getTaskCompletions(dateStr);
        const completedTaskIds = new Set(completions.map((c: any) => c.taskId));
        const incompleteTasks = activeTasks.filter((t: any) => !completedTaskIds.has(t.id)).length;

        const laundryReqs = await storage.getLaundryRequests();
        let pendingLaundryList = laundryReqs.filter((l: any) => l.status === "pending");
        if (hasRoomFilter) {
          pendingLaundryList = pendingLaundryList.filter((l: any) => userRoomIds.includes(l.roomId));
        }
        const pendingLaundry = pendingLaundryList.length;

        const mealsData = await storage.getMeals();
        const todayMeals = mealsData.filter((m: any) => m.dayOfWeek === dayOfWeek).length;

        housekeeping = incompleteTasks + pendingLaundry + todayMeals;
      }

      const home = groceries + logistics + housekeeping;
      const count = home;

      res.json({ count, home, groceries, logistics, housekeeping });
    } catch (error) {
      res.status(500).json({ message: "Failed to get count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all read" });
    }
  });

  app.get("/api/shortages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      if (currentUser.role === "admin") {
        const all = await storage.getShortages();
        res.json(all);
      } else {
        const mine = await storage.getShortagesByUser(userId);
        res.json(mine);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shortages" });
    }
  });

  app.post("/api/shortages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      if (!currentUser.canAddShortages && currentUser.role !== "admin") {
        return res.status(403).json({ message: "ليس لديك صلاحية لإضافة نواقص" });
      }
      const { nameAr, nameEn, quantity, notes } = req.body;
      if (!nameAr || typeof nameAr !== "string" || !nameAr.trim()) {
        return res.status(400).json({ message: "nameAr is required" });
      }
      const shortage = await storage.createShortage({
        nameAr: nameAr.trim(),
        nameEn: nameEn?.trim() || null,
        quantity: typeof quantity === "number" && quantity > 0 ? quantity : 1,
        notes: notes?.trim() || null,
        createdBy: userId,
        status: "pending",
      });

      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.role === "admin");
      for (const admin of admins) {
        if (admin.id !== userId) {
          await notifyAndPush(admin.id, {
            titleAr: "طلب نقص جديد",
            titleEn: "New Shortage Request",
            bodyAr: `${currentUser.firstName || currentUser.username} أضاف نقص: ${req.body.nameAr}`,
            bodyEn: `${currentUser.firstName || currentUser.username} added shortage: ${req.body.nameEn || req.body.nameAr}`,
            type: "shortage",
            url: "/groceries",
          });
        }
      }

      res.json(shortage);
    } catch (error) {
      res.status(500).json({ message: "Failed to create shortage" });
    }
  });

  app.patch("/api/shortages/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { status } = req.body;
      const shortage = await storage.updateShortageStatus(parseInt(req.params.id), status, currentUser.id);
      if (!shortage) return res.status(404).json({ message: "Not found" });

      if (shortage.createdBy !== currentUser.id) {
        const statusAr = status === "approved" ? "تمت الموافقة" : status === "rejected" ? "تم الرفض" : status === "in_progress" ? "قيد التنفيذ" : "مكتمل";
        const statusEn = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : status === "in_progress" ? "In Progress" : "Completed";
        await notifyAndPush(shortage.createdBy, {
          titleAr: `تحديث طلب النقص: ${statusAr}`,
          titleEn: `Shortage Update: ${statusEn}`,
          bodyAr: `طلب النقص "${shortage.nameAr}" ${statusAr}`,
          bodyEn: `Shortage "${shortage.nameEn || shortage.nameAr}" ${statusEn}`,
          type: "shortage_update",
          url: "/groceries",
        });
      }

      res.json(shortage);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shortage status" });
    }
  });

  app.delete("/api/shortages/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteShortage(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shortage" });
    }
  });

  async function cleanupOldPendingOrders() {
    try {
      const count = await storage.deleteOldPendingOrders(15);
      if (count > 0) {
        console.log(`Cleaned up ${count} pending orders older than 15 days`);
      }
    } catch (err) {
      console.error("Failed to clean up old pending orders:", err);
    }
  }

  cleanupOldPendingOrders();
  setInterval(cleanupOldPendingOrders, 60 * 60 * 1000);

  return httpServer;
}
