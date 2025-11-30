// backend/firebaseAdmin.js
import admin from "firebase-admin";

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing!");
}

// 1) Decode Base64 → string
let decodedJson;
try {
  decodedJson = Buffer.from(base64, "base64").toString("utf8");
} catch (e) {
  console.error("❌ Base64 decode failed:", e);
  throw e;
}

// 2) Parse JSON
let serviceAccount;
try {
  serviceAccount = JSON.parse(decodedJson);
} catch (e) {
  console.error("❌ JSON parse failed. The Base64 string is not valid JSON:", e);
  throw e;
}

// 3) Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("🔥 Firebase Admin initialized (Render)!");
}

export const db = admin.firestore();
export default admin;
