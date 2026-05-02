import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeszT3MRrv1XxO6YtnIrOjglIeWNJ4TKo",
  authDomain: "reservasi-4252e.firebaseapp.com",
  projectId: "reservasi-4252e",
  storageBucket: "reservasi-4252e.firebasestorage.app",
  messagingSenderId: "787037971750",
  appId: "1:787037971750:web:1961cce267facc5c7bcde7",
  measurementId: "G-SQ0CCJFRMV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);