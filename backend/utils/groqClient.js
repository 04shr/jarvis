// backend/utils/groqClient.js
import dotenv from "dotenv";
dotenv.config();  // <-- FORCE LOAD .env

import Groq from "groq-sdk";

console.log("groqClient.js — Loaded Key:", process.env.GROQ_API_KEY?.slice(0, 10) + "...");

if (!process.env.GROQ_API_KEY) {
  console.error("❌ ERROR: GROQ_API_KEY is missing from .env");
  throw new Error("Missing GROQ_API_KEY");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function askGroq(prompt) {
  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // FREE MODEL
      messages: [
        { role: "system", content: "You are a task & reminder command parser. Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 300
    });

    return resp.choices[0].message.content;

  } catch (err) {
    console.error("Groq error:", err);
    throw new Error("grok_failed");
  }
}
