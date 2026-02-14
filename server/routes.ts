import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { registerSchema, loginSchema } from "@shared/schema";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
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
      secret: process.env.SESSION_SECRET || "baytkom-dev-secret-key",
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
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { role, canApprove } = req.body;
      const user = await storage.updateUserRole(req.params.id, role, canApprove ?? false);
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
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const product = await storage.updateProduct(parseInt(req.params.id), req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
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

      if (currentUser.role === "admin" || currentUser.canApprove) {
        const allOrders = await storage.getOrders();
        res.json(allOrders);
      } else if (currentUser.role === "driver") {
        const approved = await storage.getOrdersByStatus("approved");
        const inProgress = await storage.getOrdersByStatus("in_progress");
        const completed = await storage.getOrdersByStatus("completed");
        res.json([...approved, ...inProgress, ...completed]);
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
        return res.json(order);
      }

      if (status === "in_progress" || status === "completed") {
        if (currentUser.role !== "driver" && currentUser.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const order = await storage.updateOrderStatus(orderId, status);
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
      const item = await storage.createOrderItem({ ...req.body, orderId: parseInt(req.params.id) });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order item" });
    }
  });

  app.patch("/api/order-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const item = await storage.updateOrderItem(parseInt(req.params.id), req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  app.delete("/api/order-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteOrderItem(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order item" });
    }
  });

  app.use("/uploads", (await import("express")).default.static(uploadsDir));

  app.post("/api/upload", isAuthenticated, upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
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
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
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
      if (!currentUser || currentUser.role !== "admin") {
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
      const pending = allOrders.filter(o => o.status === "pending").length;
      const approved = allOrders.filter(o => o.status === "approved").length;
      const inProgress = allOrders.filter(o => o.status === "in_progress").length;

      // Completed orders = current week (Saturday to Friday)
      const weekRange = getCurrentWeekRange();
      const weekOrders = await storage.getOrdersInDateRange(weekRange.start, weekRange.end);
      const completedThisWeek = weekOrders.filter(o => o.status === "completed").length;

      // Total spent = current month
      const monthRange = getCurrentMonthRange();
      const monthOrders = await storage.getOrdersInDateRange(monthRange.start, monthRange.end);
      const totalSpentThisMonth = monthOrders.filter(o => o.status === "completed").reduce((sum, o) => sum + (o.totalActual || 0), 0);

      res.json({
        pending,
        approved,
        inProgress,
        completed: completedThisWeek,
        total: allOrders.length,
        totalSpent: totalSpentThisMonth,
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

  // Trips CRUD
  app.get("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

      const allTrips = await storage.getTrips();
      if (currentUser.role === "driver") {
        const driverTrips = allTrips.filter(t => t.status === "approved" || t.status === "started" || t.status === "waiting" || t.status === "completed" || t.assignedDriver === currentUser.id);
        return res.json(driverTrips);
      }
      res.json(allTrips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser((req.session as any).userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const trip = await storage.createTrip({ ...req.body, createdBy: currentUser.id, status: "pending" });
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Failed to create trip" });
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
        if (!currentUser.canApprove && currentUser.role !== "admin") {
          return res.status(403).json({ message: "No approval permission" });
        }
        const updated = await storage.updateTripStatus(tripId, status, { approvedBy: currentUser.id });
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

  return httpServer;
}
