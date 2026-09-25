import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export const AuthContext = createContext();

// Helper to obtain a user ID either from Firebase Auth or persistent client storage
const ensureAuthSession = async () => {
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (error) {
    // Graceful fallback when Firebase Auth Anonymous provider is restricted
    console.warn("Anonymous sign-in unavailable, using client session UID:", error.message);
    let storedUid = localStorage.getItem('techarena_uid');
    if (!storedUid) {
      storedUid = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('techarena_uid', storedUid);
    }
    return storedUid;
  }
};

// Generates a collision-resistant 6-digit PIN with existence verification
const generateUniquePin = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const snap = await getDoc(doc(db, 'players', candidate));
      if (!snap.exists()) {
        return candidate;
      }
    } catch {
      // In case of read restriction, return candidate
      return candidate;
    }
  }
  // Fallback high-entropy code if 6-digit space encounters high contention
  return 'P' + Math.floor(100000 + Math.random() * 900000).toString();
};

export function AuthProvider({ children }) {
  const [currentPin, setCurrentPin] = useState(() => {
    return localStorage.getItem('techarena_pin') || null;
  });
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(() => {
    return Boolean(localStorage.getItem('techarena_pin'));
  });

  // Maintain active real-time listener for current player profile
  useEffect(() => {
    if (!currentPin) {
      setPlayer(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let unsubscribe = null;

    const setupPlayerListener = async () => {
      try {
        await ensureAuthSession();
        const playerRef = doc(db, 'players', currentPin);
        
        unsubscribe = onSnapshot(playerRef, (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            setPlayer({ id: docSnap.id, ...docSnap.data() });
          } else {
            console.warn("Player PIN not found in database, clearing session.");
            localStorage.removeItem('techarena_pin');
            setPlayer(null);
            setCurrentPin(null);
          }
          setLoading(false);
        }, (err) => {
          console.warn("Player session snapshot error:", err.message);
          if (isMounted) setLoading(false);
        });
      } catch (err) {
        console.error("Failed to initialize player session:", err);
        if (isMounted) setLoading(false);
      }
    };

    setupPlayerListener();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentPin]);

  // Register new player with unique 6-digit PIN and immediate listener attachment
  const registerNewPlayer = async (name) => {
    try {
      const uid = await ensureAuthSession();
      const pin = await generateUniquePin();

      const playerRef = doc(db, 'players', pin);
      const playerData = {
        name: name.trim(),
        pin: pin,
        uid: uid,
        teamCode: null,
        teamName: null,
        score: 0,
        createdAt: serverTimestamp()
      };
      
      await setDoc(playerRef, playerData);
      localStorage.setItem('techarena_pin', pin);
      setPlayer(playerData);
      setCurrentPin(pin);
      return pin;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  // Sign in with PIN (supports both legacy 4-digit and modern 6-digit PINs)
  const signInWithPin = async (rawPin) => {
    const pin = (rawPin || '').trim();
    if (!pin) throw new Error("Please enter your PIN code.");

    try {
      await ensureAuthSession();
      const playerRef = doc(db, 'players', pin);
      const docSnap = await getDoc(playerRef);

      if (docSnap.exists()) {
        const playerData = { id: docSnap.id, ...docSnap.data() };
        localStorage.setItem('techarena_pin', pin);
        setPlayer(playerData);
        setCurrentPin(pin);
        return playerData;
      } else {
        throw new Error("PIN not found. Please verify or register anew.");
      }
    } catch (error) {
      console.warn("Sign-in verification failed:", error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('techarena_pin');
    setCurrentPin(null);
    setPlayer(null);
  };

  return (
    <AuthContext.Provider value={{ player, loading, registerNewPlayer, signInWithPin, logout }}>
      {loading ? (
        <div className="min-h-screen bg-[#080c16] flex items-center justify-center p-6 text-center select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Connecting to Arena...</span>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
