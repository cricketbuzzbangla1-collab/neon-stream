import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAmPQ5fK9PPn_Wv-rIFFUfYiDA1vSXILTY",
  authDomain: "livetv-c2912.firebaseapp.com",
  projectId: "livetv-c2912",
  storageBucket: "livetv-c2912.firebasestorage.app",
  messagingSenderId: "680763910622",
  appId: "1:680763910622:web:baf61bf7eba115a623d54f",
  measurementId: "G-HCQN42B204"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
