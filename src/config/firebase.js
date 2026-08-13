// ============================================================
//  IMPORTANT: Replace this placeholder config with your own Firebase
//  project credentials from: https://console.firebase.google.com
//  Project Settings → General → Your apps → SDK setup & configuration
// ============================================================
//  After updating the config, enable these in Firebase Console:
//    • Authentication → Sign-in method → Email/Password
//    • Firestore Database (start in test mode, then deploy firestore.rules)
//    • Storage (default bucket — deploy storage.rules for production)

// ============================================================
import { initializeApp }  from 'firebase/app';
import { getFirestore }   from 'firebase/firestore';
import { getAuth }        from 'firebase/auth';
import { getStorage }     from 'firebase/storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);
export default app;
