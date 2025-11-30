import React, { useRef, useState } from "react";
import { sendTextToAssistant, startListening, speak } from "../api/assistant";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";
import { MessageSquare, Mic, StopCircle } from "lucide-react";

export default function RightSidebar({ petRef }) {
  const [messages, setMessages] = useState([
    { from: "assistant", text: "Hi — I'm JARVIS." },
  ]);
  const [listening, setListening] = useState(false);

  const inputRef = useRef();

  // -----------------------------------------------------------
  // SAVE TASK TO FIRESTORE
  // -----------------------------------------------------------
  async function saveTaskToDB(parsed) {
    await addDoc(collection(db, "tasks"), {
      title: parsed.title,
      createdAt: serverTimestamp(),
    });
  }

  // -----------------------------------------------------------
  // SAVE REMINDER TO FIRESTORE
  // -----------------------------------------------------------
  async function saveReminderToDB(parsed) {
  await addDoc(collection(db, "reminders"), {
    title: parsed.title,
    datetime: parsed.datetime || null,
    email: "shreayprakash@gmail.com",   // you can add user's email later
    status: "scheduled",
    createdAt: serverTimestamp(),
  });
}


  // -----------------------------------------------------------
  // HANDLE SEND MESSAGE
  // -----------------------------------------------------------
  const handleSend = async () => {
    const text = inputRef.current.value;
    if (!text) return;

    setMessages((m) => [...m, { from: "user", text }]);
    inputRef.current.value = "";

    const res = await sendTextToAssistant({ text, petRef });

    // *** FIRESTORE WRITE ***
    if (res.parsed) {
      const p = res.parsed;

      if (p.intent === "create_task") await saveTaskToDB(p);
      if (p.intent === "create_reminder") await saveReminderToDB(p);
    }

    if (res.reply) {
      setMessages((m) => [...m, { from: "assistant", text: res.reply }]);
    }
  };

  // -----------------------------------------------------------
  // MICROPHONE INPUT
  // -----------------------------------------------------------
  const handleMic = async () => {
    if (listening) {
      setListening(false);
      return;
    }

    setListening(true);
    try {
      const transcript = await startListening();
      inputRef.current.value = transcript;
    } catch (e) {
      console.error("STT error:", e);
    } finally {
      setListening(false);
    }
  };

  // -----------------------------------------------------------
  // UI
  // -----------------------------------------------------------
  return (
    <div className="h-full p-4 flex flex-col">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-300" />
          <div className="text-sm text-slate-100 font-semibold">JARVIS Assistant</div>
        </div>

        
      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-auto space-y-3 custom-scrollbar pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[90%] ${m.from === "assistant" ? "self-start" : "self-end"}`}>
            <div
              className={`px-3 py-2 rounded-2xl ${
                m.from === "assistant"
                  ? "bg-[#081c29]/70 text-cyan-200"
                  : "bg-[#11202b]/80 text-slate-100"
              }`}
            >
              {m.text}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {m.from === "assistant" ? "PET" : "You"}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="mt-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 bg-[#071028]/60 border border-[#122034] rounded-xl p-2 text-slate-100"
            placeholder="Type a message..."
          />
          <button
            onClick={handleSend}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-black font-semibold"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
}
