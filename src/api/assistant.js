// src/api/assistant.js

/* -----------------------------------------
   Send text → Backend → Get intelligent reply
------------------------------------------ */
export async function sendTextToAssistant({ text, petRef }) {
  try {
    // Trigger model “thinking” mouth animation
    if (petRef?.current?.startSpeaking) petRef.current.startSpeaking();

    // Send text to NEW backend endpoint /process
    const res = await fetch("http://localhost:5001/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    // Close mouth after a short delay
    if (petRef?.current?.stopSpeaking) {
      setTimeout(() => petRef.current.stopSpeaking(), 300);
    }

    // If backend didn't return reply
    if (!data?.reply) {
      speak("Sorry, I didn't understand that.", petRef);
      return { reply: "Sorry, I didn't understand that." };
    }

    // Speak the reply
    speak(data.reply, petRef);

    return { reply: data.reply };

  } catch (err) {
    console.error("sendTextToAssistant error:", err);

    if (petRef?.current?.stopSpeaking) petRef.current.stopSpeaking();

    return { reply: "Error contacting assistant." };
  }
}

/* -----------------------------------------
   Text-to-Speech + Mouth Animation
------------------------------------------ */
export function speak(text, petRef) {
  if (!window.speechSynthesis) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = 1;
  utter.rate = 1;
  utter.volume = 1;

  utter.onstart = () => {
    if (petRef?.current?.startSpeaking) petRef.current.startSpeaking();
  };

  utter.onend = () => {
    if (petRef?.current?.stopSpeaking) petRef.current.stopSpeaking();
  };

  speechSynthesis.speak(utter);
}

/* -----------------------------------------
   Speech-to-Text (microphone)
------------------------------------------ */
let recognition = null;

export function startListening(callback) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Speech Recognition not supported.");
    return;
  }

  if (!recognition) {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      callback(text);
    };

    recognition.onerror = (err) => {
      console.error("Speech Recognition Error:", err);
    };
  }

  recognition.start();
}
