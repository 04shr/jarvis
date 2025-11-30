import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1ecVTJibc_pjHcduBs57eCkb6hNFdifc",
  authDomain: "jarvis-79bcc.firebaseapp.com",
  projectId: "jarvis-79bcc",
  storageBucket: "jarvis-79bcc.firebasestorage.app",
  messagingSenderId: "64198072612",
  appId: "1:64198072612:web:8ca5ad1d5338f17350bbb1",
  measurementId: "G-V6SN85FRTN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;