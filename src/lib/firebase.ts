import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCxwmsBS-X_NrILcvFPDCqhH1zSOeK1MqU",
  authDomain: "fbchat-5324b.firebaseapp.com",
  projectId: "fbchat-5324b",
  storageBucket: "fbchat-5324b.firebasestorage.app",
  messagingSenderId: "933391437860",
  appId: "1:933391437860:web:15e4b46ed677ade6a988b1",
  measurementId: "G-VL93MK4H09"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
