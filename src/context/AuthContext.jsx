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
    // Graceful fallback when Firebase Auth Anonymous provider is disabled or restricted
    console.warn("Anonymous sign-in unavailable, using client session UID:", error.message);
    let storedUid = localStorage.getItem('techarena_uid');
    if (!storedUid) {
      storedUid = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('techarena_uid', storedUid);
    }
    return storedUid;
  }
};

export function AuthProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if they already have a PIN saved in their browser on mount
  useEffect(() => {
    let unsubscribePlayer = null;

    const checkLocalSession = async () => {
      const savedPin = localStorage.getItem('techarena_pin');
      if (savedPin) {
        try {
          await ensureAuthSession();
          const playerRef = doc(db, 'players', savedPin);
          const docSnap = await getDoc(playerRef);

          if (docSnap.exists()) {
            // Attach a real-time listener to keep player data (like teamCode and score) synced
            unsubscribePlayer = onSnapshot(playerRef, (docSnapshot) => {
              if (docSnapshot.exists()) {
                setPlayer(docSnapshot.data());
              }
            }, (err) => {
              console.warn("Player session listener error:", err.message);
            });
          } else {
            localStorage.removeItem('techarena_pin');
          }
        } catch (error) {
          console.error("Session recovery failed:", error);
          localStorage.removeItem('techarena_pin');
        }
      }
      setLoading(false);
    };

    checkLocalSession();

    return () => {
      if (unsubscribePlayer) unsubscribePlayer();
    };
  }, []);

  // Generate a new PIN for a new student
  const registerNewPlayer = async (name) => {
    try {
      const uid = await ensureAuthSession();
      const pin = Math.floor(1000 + Math.random() * 9000).toString(); // e.g. "8392"

      const playerRef = doc(db, 'players', pin);
      const playerData = {
        name: name,
        pin: pin,
        uid: uid,
        teamCode: null,
        score: 0,
        createdAt: serverTimestamp()
      };
      
      await setDoc(playerRef, playerData);
      localStorage.setItem('techarena_pin', pin);
      setPlayer(playerData);
      return pin;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  // Let them log in or reconnect using their PIN
  const signInWithPin = async (pin) => {
    try {
      await ensureAuthSession();
      const playerRef = doc(db, 'players', pin);
      const docSnap = await getDoc(playerRef);

      if (docSnap.exists()) {
        const playerData = docSnap.data();
        localStorage.setItem('techarena_pin', pin);
        setPlayer(playerData);
        return playerData;
      } else {
        throw new Error("PIN not found. Try registering again.");
      }
    } catch (error) {
      localStorage.removeItem('techarena_pin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('techarena_pin');
    setPlayer(null);
  };

  return (
    <AuthContext.Provider value={{ player, loading, registerNewPlayer, signInWithPin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
