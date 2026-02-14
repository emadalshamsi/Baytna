import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { role, canApprove } = req.body;
      const user = await storage.updateUserRole(req.params.id, role, canApprove ?? false);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
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

  app.post("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const cat = await storage.createCategory(req.body);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const cat = await storage.updateCategory(parseInt(req.params.id), req.body);
      res.json(cat);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const product = await storage.updateProduct(parseInt(req.params.id), req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.put("/api/products/:id/alternatives", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.setProductAlternatives(parseInt(req.params.id), req.body.alternativeIds);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to set alternatives" });
    }
  });

  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const order = await storage.createOrder({ ...req.body, createdBy: userId, status: "pending" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.patch("/api/orders/:id/driver", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  app.patch("/api/orders/:id/actual", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/orders/:id/items", isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.createOrderItem({ ...req.body, orderId: parseInt(req.params.id) });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order item" });
    }
  });

  app.patch("/api/order-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.updateOrderItem(parseInt(req.params.id), req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  app.delete("/api/order-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteOrderItem(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order item" });
    }
  });

  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const allOrders = await storage.getOrders();
      const pending = allOrders.filter(o => o.status === "pending").length;
      const approved = allOrders.filter(o => o.status === "approved").length;
      const inProgress = allOrders.filter(o => o.status === "in_progress").length;
      const completed = allOrders.filter(o => o.status === "completed").length;
      const totalSpent = allOrders.filter(o => o.status === "completed").reduce((sum, o) => sum + (o.totalActual || 0), 0);
      res.json({ pending, approved, inProgress, completed, total: allOrders.length, totalSpent });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
