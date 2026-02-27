import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import pg from "pg";

async function runMigrations() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='products'"
    );
    const existingCols = new Set(cols.rows.map((r: any) => r.column_name));

    if (!existingCols.has("unit_ar")) {
      await pool.query("ALTER TABLE products ADD COLUMN unit_ar VARCHAR(50)");
      console.log("[Migration] Added unit_ar column");
    }
    if (!existingCols.has("unit_en")) {
      await pool.query("ALTER TABLE products ADD COLUMN unit_en VARCHAR(50)");
      console.log("[Migration] Added unit_en column");
    }
    const spCols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='spare_part_orders'"
    );
    const spExistingCols = new Set(spCols.rows.map((r: any) => r.column_name));
    if (!spExistingCols.has("assigned_to")) {
      await pool.query("ALTER TABLE spare_part_orders ADD COLUMN assigned_to VARCHAR REFERENCES users(id)");
      console.log("[Migration] Added assigned_to column to spare_part_orders");
    }

    if (!existingCols.has("item_code")) {
      await pool.query("ALTER TABLE products ADD COLUMN item_code VARCHAR(20)");
      const rows = await pool.query("SELECT id FROM products ORDER BY id");
      for (let i = 0; i < rows.rows.length; i++) {
        await pool.query("UPDATE products SET item_code = $1 WHERE id = $2", [
          "P" + String(i + 1).padStart(3, "0"),
          rows.rows[i].id,
        ]);
      }
      try {
        await pool.query("ALTER TABLE products ADD CONSTRAINT products_item_code_unique UNIQUE (item_code)");
      } catch {}
      console.log("[Migration] Added item_code column to products");
    }
  } catch (e: any) {
    console.error("[Migration] Error:", e.message);
  } finally {
    await pool.end();
  }
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await runMigrations();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
