import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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

// Enable offline persistence for instant reads & reduced network usage
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: browser not supported');
  }
});

export default app;
