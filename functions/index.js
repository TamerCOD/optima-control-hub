
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();
const db = admin.firestore();

exports.checkMassIssuesStatus = onRequest(async (req, res) => {
  console.log("Cloud Trigger at:", new Date().toISOString());

  try {
    const now = new Date();
    await db.collection("settings").doc("heartbeat").set({ lastRun: now.toISOString() }, { merge: true });

    const settingsDoc = await db.collection("settings").doc("issues").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const sheetUrl = settings.googleSheetUrl;
    const globalEmail = settings.email && settings.email.enabled ? settings.email.recipient : null;

    const snapshot = await db.collection("mass_issues")
      .where("status", "in", ["scheduled", "open", "investigating"])
      .get();

    if (snapshot.empty) {
      res.status(200).send("No active issues.");
      return;
    }

    const batch = db.batch();
    const updatesToNotify = [];
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const issue = doc.data();
      const issueRef = db.collection("mass_issues").doc(doc.id);

      let newStatus = null;
      let eventType = null;

      const start = issue.scheduledStart ? new Date(issue.scheduledStart) : null;
      const end = issue.scheduledEnd ? new Date(issue.scheduledEnd) : null;

      if (issue.status === "scheduled" && start && start <= now) {
        if (end && end <= now) {
          newStatus = "resolved"; eventType = "auto_end";
        } else {
          newStatus = "open"; eventType = "auto_start";
        }
      } else if ((issue.status === "open" || issue.status === "investigating") && end && end <= now) {
        newStatus = "resolved"; eventType = "auto_end";
      }

      if (newStatus && newStatus !== issue.status) {
        const updateObj = {
          status: newStatus,
          updatedAt: now.toISOString(),
          resolvedAt: newStatus === "resolved" ? (issue.scheduledEnd || now.toISOString()) : issue.resolvedAt
        };
        batch.update(issueRef, updateObj);
        updatesToNotify.push({ ...issue, ...updateObj, eventType: eventType, emailRecipient: (issue.notifyEmail && globalEmail) ? globalEmail : null });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      if (sheetUrl) {
        for (const payload of updatesToNotify) {
          try {
            await fetch(sheetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } catch (e) { console.error("Webhook failed", e); }
        }
      }
      res.status(200).send(`Updated ${count} issues.`);
    } else {
      res.status(200).send("No status changes.");
    }
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
});
