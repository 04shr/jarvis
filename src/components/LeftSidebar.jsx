import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { ClipboardList, BellRing } from "lucide-react";

export default function LeftSidebar() {
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reminders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <div className="px-3 py-2 rounded-2xl bg-gradient-to-b from-[#071029]/50 to-[#0b1224]/40 backdrop-blur-sm border border-[#162034]">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-300" />
          <h3 className="text-sm text-slate-200 font-semibold">Tasks</h3>
        </div>
        <div className="mt-3 space-y-2 max-h-[36vh] overflow-auto custom-scrollbar pr-2">
          {tasks.length === 0 && <div className="text-xs text-slate-400">No tasks yet</div>}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="p-2 rounded-lg bg-[#071827]/60 border border-[#122034] text-sm text-slate-100"
            >
              <div className="font-medium">{t.title}</div>
              {t.dueAt && (
                <div className="text-xs text-slate-400 mt-1">
                  Due: {new Date(t.dueAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 rounded-2xl bg-gradient-to-b from-[#071029]/40 to-[#0b1224]/30 backdrop-blur-sm border border-[#162034]">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-amber-300" />
          <h3 className="text-sm text-slate-200 font-semibold">Reminders</h3>
        </div>
        <div className="mt-3 space-y-2 max-h-[36vh] overflow-auto custom-scrollbar pr-2">
          {reminders.length === 0 && <div className="text-xs text-slate-400">No reminders</div>}
          {reminders.map((r) => (
            <div
              key={r.id}
              className="p-2 rounded-lg bg-[#071827]/60 border border-[#122034] text-sm text-slate-100"
            >
              <div className="font-medium">{r.title}</div>
              {r.datetime && (
                <div className="text-xs text-slate-400 mt-1">
                  At: {new Date(r.datetime).toLocaleString()}
                </div>
              )}
              <div className="text-xs mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${r.status === "delivered" ? "bg-green-700/60" : r.status === "triggered" ? "bg-amber-700/60" : "bg-red-700/50"}`}>
                  {r.status || "scheduled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto px-3 text-xs text-slate-400">
        <div>Tip: Say “Remind me in 10 minutes to stand up”</div>
      </div>
    </div>
  );
}
