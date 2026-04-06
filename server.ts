import express from "express";
import fetch from "node-fetch";
import path from "path";
import { startCronJobs, runAllCronJobs } from "./src/server/cron.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Start cron jobs
  startCronJobs();

  app.use(express.json());

  // Telegram Proxy Endpoint
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

  // Ping endpoint to keep server awake or trigger cron externally
  app.get("/api/cron/ping", async (req, res) => {
    try {
      const logs = await runAllCronJobs();
      res.json({ status: "ok", time: new Date().toISOString(), logs });
    } catch (e: any) {
      res.status(500).json({ status: "error", details: e.message });
    }
  });

  // Manual PostCheck Report Endpoint
  app.post("/api/postcheck/report", async (req, res) => {
    const { type } = req.body;
    if (type !== 'daily' && type !== 'weekly') {
      return res.status(400).json({ error: "Invalid report type" });
    }
    try {
      const { sendPostCheckReportManual } = await import("./src/server/cron.ts");
      await sendPostCheckReportManual(type);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  let useVite = false;
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      useVite = true;
    } catch (e) {
      console.warn("Vite not found, falling back to static serving");
    }
  }

  if (!useVite) {
    app.use(express.static('dist'));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
