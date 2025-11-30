// backend/firebaseAdmin.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 not found in ENV!");
}

const jsonString = Buffer.from(base64, "base64").toString("utf8");

// Temporary file path at runtime
const tempPath = path.join(process.cwd(), "serviceAccount.json");

// Write the file if not exists
if (!fs.existsSync(tempPath)) {
  fs.writeFileSync(tempPath, jsonString);
}

const serviceAccount = JSON.parse(fs.readFileSync(tempPath));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("🔥 Firebase Admin initialized!");
}

export const db = admin.firestore();
export default admin;
