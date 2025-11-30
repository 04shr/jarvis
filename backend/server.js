// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import processCommandRoute from "./routes/processCommand.js";   // <-- NEW intellignt parser
import { startReminderScheduler } from "./scheduler.js";

dotenv.config();

// ---- Initialize app FIRST ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- Routes ----
app.use("/process", processCommandRoute);   // <-- USE /process NOT /parse

// ---- Start scheduler ----
startReminderScheduler();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("groqClient.js — Loaded Key:", process.env.GROQ_API_KEY?.slice(0, 10) + "...");
  console.log("🔥 Firebase Admin initialized!");
  console.log("⏱️ Reminder Scheduler Started");
  console.log(`JARVIS backend running on Groq at port ${PORT}`);
});
