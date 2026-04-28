import express from "express";
import fetch from "node-fetch";
import path from "path";
import admin from "firebase-admin";
import { startCronJobs, runAllCronJobs } from "./src/server/cron.ts";

// Initialize Firebase Admin
let adminApp: admin.app.App | null = null;
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    const cert = JSON.parse(
      serviceAccount.startsWith('{') ? serviceAccount : Buffer.from(serviceAccount, 'base64').toString()
    );
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(cert)
    });
    console.log("Firebase Admin SDK initialized successfully");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT not found. Admin features will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
}

const db = adminApp ? admin.firestore() : null;
const auth = adminApp ? admin.auth() : null;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Start cron jobs
  startCronJobs();

  app.use(express.json());

  // Middleware to check if admin features are enabled
  const checkAdmin = (req: any, res: any, next: any) => {
    if (!adminApp || !auth || !db) {
      return res.status(400).json({ error: "Admin features are not configured. FIREBASE_SERVICE_ACCOUNT is missing." });
    }
    next();
  };

  // --- Admin User Management API ---
  
  // Create User
  app.post("/api/admin/users", checkAdmin, async (req, res) => {
    const { email, password, name, departmentId, roles, avatar, telegramId, telegramUsername } = req.body;
    
    try {
      // 1. Create in Firebase Auth
      const userRecord = await auth!.createUser({
        email,
        password,
        displayName: name,
      });

      // 2. Create in Firestore
      const userData = {
        id: userRecord.uid,
        name,
        email,
        departmentId: departmentId || 'hq',
        roles: roles || ['employee'],
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${userRecord.uid}`,
        isDeleted: false,
        isActive: true,
        needsPasswordChange: true,
        createdAt: new Date().toISOString(),
        telegramId: telegramId || null,
        telegramUsername: telegramUsername || null,
        telegramNotificationsEnabled: true
      };

      await db!.collection('users').doc(userRecord.uid).set(userData);

      res.status(201).json({ success: true, user: userData });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Change Password
  app.patch("/api/admin/users/:uid/password", checkAdmin, async (req, res) => {
    const { uid } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    try {
      await auth!.updateUser(uid, {
        password: password
      });
      
      // Also reset needsPasswordChange if it was a target to force changes
      await db!.collection('users').doc(uid).update({
        needsPasswordChange: true
      });

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete User
  app.delete("/api/admin/users/:uid", checkAdmin, async (req, res) => {
    const { uid } = req.params;

    try {
      // 1. Delete from Auth
      await auth!.deleteUser(uid);

      // 2. Mark as deleted in Firestore (we usually don't delete doc to keep integrity of history)
      await db!.collection('users').doc(uid).update({
        isDeleted: true,
        isActive: false,
        deletedAt: new Date().toISOString()
      });

      res.json({ success: true, message: "User deleted from system" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });


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

  // Mass Issues Notification Endpoint
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
