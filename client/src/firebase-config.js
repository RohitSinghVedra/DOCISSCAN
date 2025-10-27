import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBER0HDreTZb7B1xaod8bJBDj4085ieASI",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "iddocscan.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "iddocscan",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "iddocscan.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "523972049807",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:523972049807:web:d0877ec150eca66eaa29fa"
};

// Debug logging
console.log('Firebase Config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
