// backend/scheduler.js
import cron from "node-cron";
import { db } from "./firebaseAdmin.js";
import { sendTelegramMessage } from "./utils/telegram.js";

/* ============================================================
   SCHEDULER — runs every minute using datetimeMs (NO timezone issues)
   ============================================================ */
export function startReminderScheduler() {
  console.log("⏱️ Reminder Scheduler Started");

  cron.schedule("* * * * *", async () => {
    const nowMs = Date.now();
    console.log("⏳ Checking reminders at", new Date().toLocaleString());

    const snap = await db
      .collection("reminders")
      .where("status", "==", "scheduled")
      .get();

    snap.forEach(async (doc) => {
      const r = doc.data();

      const targetMs =
        r.datetimeMs ||
        (r.datetime ? new Date(r.datetime).getTime() : null);

      if (!targetMs) return;

      if (targetMs <= nowMs) {
        console.log("📨 Sending reminder:", r.title);

        try {
          await sendTelegramMessage(
            `🔔 Reminder: ${r.title}`
          );

          await doc.ref.update({
            status: "delivered",
            deliveredAt: new Date().toISOString(),
          });

          console.log("✅ Reminder delivered!");
        } catch (err) {
          console.error("Reminder delivery failed:", err);
        }
      }
    });
  });
}
