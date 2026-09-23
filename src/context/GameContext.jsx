import React, { createContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const GameContext = createContext();

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState({
    status: 'waiting', // 'waiting', 'playing', 'leaderboard'
    activeQuestion: null, // Holds the current question payload
    timeRemaining: 0,
  });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Listen to the master event document
    const eventRef = doc(db, 'events', 'samarambh');
    
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data());
      } else {
        console.log("Waiting for admin to initialize the game...");
      }
    }, (error) => {
      console.warn("Firestore event listener error:", error.message);
    });

    // Cleanup listener when app closes
    return () => unsubscribe();
  }, []);

  return (
    <GameContext.Provider value={{ gameState, isOnline }}>
      {children}
    </GameContext.Provider>
  );
}