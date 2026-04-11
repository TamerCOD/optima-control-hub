import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { startCronJobs, runAllCronJobs } from "./src/server/cron.ts";

// ESM-совместимый __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const IS_PROD = process.env.NODE_ENV === "production";
const PORT    = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://fonts.googleapis.com https://esm.sh https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com wss://*.firebaseio.com https://api.telegram.org",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ")
    );
    next();
  });

  app.use(express.json({ limit: "2mb" }));

  // ── Health check (для Railway и мониторинга) ──────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
      env: process.env.NODE_ENV ?? "development",
    });
  });

  // ── Telegram proxy ────────────────────────────────────────────────────────
  app.post("/api/telegram/send", async (req, res) => {
    const { botToken, chatId, messageThreadId, text, parseMode, photoUrl, replyMarkup } = req.body;

    if (!botToken || !chatId || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { sendTelegramMessage } = await import("./src/server/cron.ts");
      const result = await sendTelegramMessage(botToken, chatId, text, messageThreadId, photoUrl, replyMarkup);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to send message", details: result.error });
      }
    } catch (error: any) {
      console.error("Telegram Proxy Error:", error);
      res.status(500).json({ error: "Failed to send message", details: error.message });
    }
  });

  // ── Cron trigger (внешний вызов) ──────────────────────────────────────────
  app.get("/api/cron/ping", async (req, res) => {
    try {
      const logs = await runAllCronJobs();
      res.json({ status: "ok", time: new Date().toISOString(), logs });
    } catch (e: any) {
      res.status(500).json({ status: "error", details: e.message });
    }
  });

  // ── PostCheck report ──────────────────────────────────────────────────────
  app.post("/api/postcheck/report", async (req, res) => {
    const { type } = req.body;
    if (type !== "daily" && type !== "weekly") {
      return res.status(400).json({ error: "Invalid report type. Use 'daily' or 'weekly'" });
    }
    try {
      const { sendPostCheckReportManual } = await import("./src/server/cron.ts");
      await sendPostCheckReportManual(type);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Mass Issues notify ────────────────────────────────────────────────────
  app.post("/api/issues/notify", async (req, res) => {
    const { issue, eventType } = req.body;
    if (!issue || !eventType) {
      return res.status(400).json({ error: "Missing issue or eventType" });
    }
    try {
      const { notifyIssueTelegram } = await import("./src/server/issueNotifier.ts");
      await notifyIssueTelegram(issue, eventType);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error in /api/issues/notify:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Frontend serving ──────────────────────────────────────────────────────
  if (!IS_PROD) {
    // Dev: Vite middleware
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("🔧  Vite dev middleware active");
    } catch (e) {
      console.warn("Vite not found, falling back to static serving");
      serveStatic(app);
    }
  } else {
    // Production: serve built dist/
    serveStatic(app);
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅  Server running on http://localhost:${PORT} [${process.env.NODE_ENV ?? "development"}]`);
    // Запускаем cron-задачи после старта сервера
    startCronJobs();
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
    // Принудительное завершение через 10с если что-то зависло
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

function serveStatic(app: express.Application) {
  const DIST_DIR = path.join(__dirname, "dist");
  app.use(express.static(DIST_DIR, {
    maxAge: "1y",          // Кеш статики на год (Vite ставит хеш в именах)
    index: false,          // SPA: не отдавать index.html для директорий через static
    etag: true,
    lastModified: true,
  }));
  // SPA fallback — всё что не файл → index.html
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
  console.log(`📦  Serving static from: ${DIST_DIR}`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
