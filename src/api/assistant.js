// src/api/assistant.js

/* -----------------------------------------
   Send text → Backend → Get intelligent reply
------------------------------------------ */
export async function sendTextToAssistant({ text, petRef }) {
  try {
    if (petRef?.current?.startSpeaking) petRef.current.startSpeaking();

    // CORRECT backend URL
    const API_URL = "https://jarvis-backend-q66l.onrender.com";

    const res = await fetch(`${API_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (petRef?.current?.stopSpeaking) {
      setTimeout(() => petRef.current.stopSpeaking(), 300);
    }

    if (!data?.reply) {
      speak("Sorry, I didn't understand that.", petRef);
      return { reply: "Sorry, I didn't understand that." };
    }

    speak(data.reply, petRef);
    return { reply: data.reply };
  } catch (err) {
    console.error("sendTextToAssistant error:", err);

    if (petRef?.current?.stopSpeaking) petRef.current.stopSpeaking();

    return { reply: "Error contacting assistant." };
  }
}

/* -----------------------------------------
   Text-to-Speech
------------------------------------------ */
export function speak(text, petRef) {
  const utter = new SpeechSynthesisUtterance(text);

  utter.onstart = () => petRef?.current?.startSpeaking?.();
  utter.onend = () => petRef?.current?.stopSpeaking?.();

  speechSynthesis.speak(utter);
}

/* -----------------------------------------
   Speech Recognition
------------------------------------------ */
let recognition = null;

export function startListening(callback) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    alert("Speech Recognition is not supported.");
    return;
  }

  if (!recognition) {
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.onresult = (e) => callback(e.results[0][0].transcript);
    recognition.onerror = console.error;
  }

  recognition.start();
}
