import React, { useEffect } from "react";
import PetModel from "./PetModel";
import { speak } from "../api/assistant";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

export default function MainContent({ petRef }) {

  // Reminder listener: speaks when reminder is triggered
  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      where("status", "==", "triggered")
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const text = `Reminder: ${data.title}`;

          // Only speak — no UI messages here
          speak(text, petRef);

          change.doc.ref.update({
            status: "delivered",
            deliveredAt: new Date().toISOString(),
          });
        }
      });
    });

    return () => unsub();
  }, [petRef]);

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center pt-6">

      {/* Top bar */}
      <div className="w-full max-w-4xl px-6 mb-4">
        <div className="rounded-2xl bg-gradient-to-r from-[#07102a]/40 to-[#1a0730]/30 p-3 border border-[#122034] backdrop-blur-md">
          <div className="text-slate-100 font-semibold text-lg">
            Welcome Shreya 👋
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Your JARVIS assistant — tasks and reminders at your service!
          </div>
        </div>
      </div>

      {/* PET Model Only */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center">
        <div className="relative w-[520px] h-[520px] rounded-2xl pet-model-border overflow-hidden bg-[#071226]/40 flex items-center justify-center">
          <PetModel ref={petRef} />
        </div>
      </div>

    </div>
  );
}
