
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyATR3ukNQ-Lex6j4za6VxpnTMdCWsDXZHA",
  authDomain: "ai-recruitment-7bb5d.firebaseapp.com",
  projectId: "ai-recruitment-7bb5d",
  storageBucket: "ai-recruitment-7bb5d.firebasestorage.app",
  messagingSenderId: "351644755946",
  appId: "1:351644755946:web:ed4d3103cbc7d2d21c3493",
  measurementId: "G-JDBEJH3GYX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { db, analytics };
