import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";


const appletConfig = typeof window !== 'undefined' && window.firebaseAppletConfig ? window.firebaseAppletConfig : null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig?.appId
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Connect with persistent multi-tab local cache for seamless offline resilience
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, databaseId || undefined);
} catch {
  // If already initialized or fallback for restricted storage environments
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

