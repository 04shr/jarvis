// backend/routes/processCommand.js
import express from "express";
import { askGroq } from "../utils/groqClient.js";
import * as chrono from "chrono-node";
import { db } from "../firebaseAdmin.js";
import { sendTelegramMessage } from "../utils/telegram.js";

const router = express.Router();

/* ============================================================
   1) Robust Date Parser (NO FUTURE-DAY BUGS)
   ============================================================ */
function parseDatetime(raw) {
  if (!raw) return null;
  const text = raw.toString().trim();
  const now = new Date();

  /* ---------- A) PURE RELATIVE: in X seconds/minutes ---------- */
  const rel = text.match(/\bin\s+(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b/i);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const dt = new Date(now);

    if (unit.startsWith("sec")) dt.setSeconds(dt.getSeconds() + n);
    else if (unit.startsWith("min")) dt.setMinutes(dt.getMinutes() + n);
    else if (unit.startsWith("h")) dt.setHours(dt.getHours() + n);

    return dt.toISOString();
  }

  /* ---------- B) CHRONO NATURAL LANGUAGE ---------- */
  let dt = chrono.parseDate(text, now);

  // If chrono fails, return null
  if (!dt) return null;

  /* ---------- C) If result is in past & user DID NOT specify a date ---------- */
  const explicitDate = /\b(\d{4}|\d{1,2}\/\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|today|tomorrow)\b/i.test(
    text
  );

  if (!explicitDate && dt.getTime() <= now.getTime()) {
    // bump to next valid future time
    dt = new Date(dt.getTime() + 24 * 60 * 60 * 1000);
  }

  return dt.toISOString();
}

/* ============================================================
   2) Priority Detection
   ============================================================ */
function detectPriority(t, datetimeIso) {
  const text = t.toLowerCase();
  if (text.includes("urgent") || text.includes("asap")) return "high";
  if (text.includes("important") || text.includes("priority")) return "high";
  if (text.includes("low") || text.includes("later")) return "low";

  if (datetimeIso) {
    const diff = new Date(datetimeIso) - new Date();
    if (diff < 24 * 3600 * 1000) return "high";
    if (diff < 48 * 3600 * 1000) return "medium";
  }
  return "medium";
}

/* ============================================================
   3) Conflict Detection (tasks only)
   ============================================================ */
async function findConflicts(datetimeIso, range = 30) {
  if (!datetimeIso) return [];
  const dt = new Date(datetimeIso);
  const before = new Date(dt.getTime() - range * 60 * 1000);
  const after = new Date(dt.getTime() + range * 60 * 1000);

  const snap = await db.collection("tasks").where("status", "==", "scheduled").get();

  const conflicts = [];
  snap.forEach((doc) => {
    const d = doc.data();
    if (!d.datetime) return;
    const other = new Date(d.datetime);
    if (other >= before && other <= after) conflicts.push({ id: doc.id, ...d });
  });

  return conflicts;
}

/* ============================================================
   4) Find Next Free Slot
   ============================================================ */
async function findNextFreeSlot(startIso, step = 20, attempts = 12) {
  let t = new Date(startIso);
  for (let i = 0; i < attempts; i++) {
    t = new Date(t.getTime() + step * 60 * 1000);
    const c = await findConflicts(t.toISOString(), 20);
    if (c.length === 0) return t.toISOString();
  }
  return null;
}

/* ============================================================
   5) Helpers to Add to Firestore
   ============================================================ */
async function makeTask({ title, notes = "", datetime = null, priority = "medium" }) {
  const datetimeMs = datetime ? new Date(datetime).getTime() : null;

  const doc = {
    title,
    notes,
    datetime,
    datetimeMs,
    priority,
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  const ref = await db.collection("tasks").add(doc);
  return { id: ref.id, ...doc };
}

async function makeReminder({ title, datetime }) {
  const datetimeMs = new Date(datetime).getTime();

  const doc = {
    title,
    datetime,
    datetimeMs,
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  const ref = await db.collection("reminders").add(doc);
  return { id: ref.id, ...doc };
}

/* ============================================================
   6) MAIN ROUTE — /process
   ============================================================ */
router.post("/", async (req, res) => {
  const text = (req.body.text || "").trim();
  if (!text) return res.json({ success: false, error: "Missing text" });

  let parsed;

  /* ----- A) Ask Groq (LLM Parser) ----- */
  const systemPrompt = `
You are an intelligent task parser. Return STRICT JSON ONLY:
{
 "intent": "create_task" | "create_reminder" | "create_task_and_reminder" | "unknown",
 "title": "",
 "datetime": "",
 "due": "",
 "notes": ""
}
`;

  try {
    const g = await askGroq(systemPrompt + "\nUser: " + text);
    parsed = JSON.parse(g);
  } catch (e) {
    parsed = { intent: "unknown", title: text, datetime: "" };
  }

  /* ----- B) Normalize Dates ----- */
  const raw = parsed.datetime || parsed.due || text;
  const reminderIso = parseDatetime(raw);
  const dueIso = parseDatetime(parsed.due || raw);

  const priority = detectPriority(text, reminderIso || dueIso);
  const willTask =
    parsed.intent === "create_task" || parsed.intent === "create_task_and_reminder";
  const willReminder =
    parsed.intent === "create_reminder" || parsed.intent === "create_task_and_reminder";

  /* ----- C) Conflict Checking ----- */
  let conflicts = [];
  if (willReminder && reminderIso) {
    conflicts = await findConflicts(reminderIso);
  }

  const replies = [];
  let createdTask = null;
  let createdReminder = null;
  let suggestedSlot = null;

  if (conflicts.length > 0) {
    const hasHigh = conflicts.some((c) => c.priority === "high");
    if (priority === "low" || (priority === "medium" && hasHigh)) {
      suggestedSlot = await findNextFreeSlot(reminderIso);
      replies.push(
        `You're busy around ${new Date(reminderIso).toLocaleString()}.`
      );
      if (suggestedSlot)
        replies.push(
          `Suggested: ${new Date(suggestedSlot).toLocaleString()}`
        );
    }
  }

  /* ----- D) Create Task ----- */
  if (willTask) {
    createdTask = await makeTask({
      title: parsed.title || text,
      notes: parsed.notes || "",
      datetime: dueIso || null,
      priority,
    });
    replies.push(`Task added: ${createdTask.title}`);
  }

  /* ----- E) Create Reminder ----- */
  if (willReminder) {
    if (!reminderIso) {
      replies.push("Please specify a time for the reminder.");
    } else {
      const finalTime = suggestedSlot || reminderIso;

      createdReminder = await makeReminder({
        title: parsed.title || text,
        datetime: finalTime,
      });

      replies.push(`Reminder scheduled at ${new Date(finalTime).toLocaleString()}.`);

      await sendTelegramMessage(
        `🔔 Reminder: ${createdReminder.title}\nAt: ${new Date(finalTime).toLocaleString()}`
      );
    }
  }

  return res.json({
    success: true,
    parsed,
    createdTask,
    createdReminder,
    conflicts,
    suggestedSlot,
    reply: replies.join(" "),
  });
});

export default router;
