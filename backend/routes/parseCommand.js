// backend/routes/parseCommand.js
import express from "express";
import { askGroq } from "../utils/groqClient.js";
import * as chrono from "chrono-node";
import { db } from "../firebaseAdmin.js";
import { sendTelegramMessage } from "../utils/telegram.js";

const router = express.Router();

/* ----------------------------------------------------------
   Helpers
---------------------------------------------------------- */
function parseDatetime(raw) {
  if (!raw) return null;
  const dt = chrono.parseDate(raw);
  return dt ? dt.toISOString() : null;
}

function detectPriority(text, datetimeIso) {
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap")) return "high";
  if (lower.includes("important") || lower.includes("must")) return "high";
  if (lower.includes("low") || lower.includes("later")) return "low";

  if (datetimeIso) {
    const diff = new Date(datetimeIso) - new Date();
    if (diff < 3600_000 * 24) return "high";      // < 24 hours
    if (diff < 3600_000 * 48) return "medium";    // < 48 hours
  }
  return "medium";
}

async function findConflicts(datetimeIso, minutesRange = 30) {
  if (!datetimeIso) return [];
  const dt = new Date(datetimeIso);
  const before = new Date(dt.getTime() - minutesRange * 60 * 1000);
  const after = new Date(dt.getTime() + minutesRange * 60 * 1000);

  const snap = await db.collection("reminders")
    .where("status", "==", "scheduled")
    .get();

  const conflicts = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (!d.datetime) return;
    const other = new Date(d.datetime);
    if (other >= before && other <= after) {
      conflicts.push({ id: doc.id, ...d });
    }
  });

  return conflicts;
}

async function findNextFreeSlot(startIso, stepMinutes = 20, attempts = 20) {
  let candidate = new Date(startIso);
  for (let i = 0; i < attempts; i++) {
    candidate = new Date(candidate.getTime() + stepMinutes * 60 * 1000);
    const c = await findConflicts(candidate.toISOString(), 20);
    if (c.length === 0) return candidate.toISOString();
  }
  return null;
}

/* ----------------------------------------------------------
   MAIN ROUTE /parse
---------------------------------------------------------- */

router.post("/", async (req, res) => {
  const text = (req.body.text || "").trim();
  if (!text) return res.json({ success: false, error: "Missing text" });

  /* 1️⃣ Ask Groq for structured interpretation */
  const systemPrompt = `
You are an intelligent HR Task Assistant.
Extract user intent and output STRICT JSON ONLY:

{
  "intent": "create_task" | "create_reminder" | "create_task_and_reminder" | "unknown",
  "title": "",
  "datetime": "",
  "due": "",
  "notes": ""
}
`;
  let parsed;

  try {
    const groqResp = await askGroq(systemPrompt + "\nUser: " + text);
    parsed = JSON.parse(groqResp);
  } catch (e) {
    parsed = { intent: "unknown", title: text, datetime: "" };
  }

  /* 2️⃣ Normalize datetime */
  const reminderIso = parseDatetime(parsed.datetime || text);
  const dueIso = parseDatetime(parsed.due || parsed.datetime || text);

  /* 3️⃣ Priority */
  const priority = detectPriority(text, dueIso || reminderIso);

  const willCreateTask =
    parsed.intent === "create_task" ||
    parsed.intent === "create_task_and_reminder";

  const willCreateReminder =
    parsed.intent === "create_reminder" ||
    parsed.intent === "create_task_and_reminder";

  /* 4️⃣ Conflict Checking */
  let conflicts = [];
  if (willCreateReminder && reminderIso) {
    conflicts = await findConflicts(reminderIso);
  }

  /* 5️⃣ Create in DB */
  const reply = [];

  let createdTask = null;
  let createdReminder = null;

  // ---- TASK ----
  if (willCreateTask) {
    const taskData = {
      title: parsed.title || text,
      dueAt: dueIso || null,
      priority,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection("tasks").add(taskData);
    createdTask = { id: ref.id, ...taskData };

    reply.push(`Task added: ${taskData.title}`);
  }

  // ---- REMINDER ----
  if (willCreateReminder) {
    if (!reminderIso) {
      reply.push("Please specify a time for the reminder.");
    } else {
      let finalTime = reminderIso;

      if (conflicts.length > 0) {
        reply.push(
          `You already have ${conflicts.length} reminder(s) around that time.`
        );

        const newSlot = await findNextFreeSlot(reminderIso);

        if (newSlot) {
          finalTime = newSlot;
          reply.push(
            `Scheduled instead at ${new Date(newSlot).toLocaleString()} (free slot).`
          );
        }
      }

      const reminderData = {
        title: parsed.title || text,
        datetime: finalTime,
        status: "scheduled",
        priority,
        createdAt: new Date().toISOString()
      };

      const rRef = await db.collection("reminders").add(reminderData);
      createdReminder = { id: rRef.id, ...reminderData };

      reply.push(
        `Reminder set for ${new Date(finalTime).toLocaleString()}.`
      );

      await sendTelegramMessage(
        `🔔 Reminder: ${reminderData.title}\nAt: ${new Date(finalTime).toLocaleString()}`
      );
    }
  }

  if (reply.length === 0) reply.push("Done.");

  return res.json({
    success: true,
    parsed,
    createdTask,
    createdReminder,
    conflicts,
    reply: reply.join(" ")
  });
});

export default router;
