import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const SkribblContext = createContext();

export function SkribblProvider({ children, sessionId, player }) {
  const [session, setSession] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [scores, setScores] = useState([]);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // Listen to session state
    const sessionRef = doc(db, 'events', 'samarambh', 'skribblSessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSession(data);
        if (data.status === 'drawing' && !hasGuessedCorrectly) {
           // We could check if we already guessed it, but relies on guess list 
        }
      }
    });

    // Listen to strokes
    const strokesRef = collection(db, 'events', 'samarambh', 'skribblSessions', sessionId, 'strokes');
    const qStrokes = query(strokesRef, orderBy('strokeIndex', 'asc'));
    const unsubStrokes = onSnapshot(qStrokes, (snapshot) => {
      const currentStrokes = [];
      snapshot.forEach(doc => {
        currentStrokes.push({ id: doc.id, ...doc.data() });
      });
      setStrokes(currentStrokes);
    });

    // Listen to guesses
    const guessesRef = collection(db, 'events', 'samarambh', 'skribblSessions', sessionId, 'guesses');
    const qGuesses = query(guessesRef, orderBy('timestamp', 'desc'));
    const unsubGuesses = onSnapshot(qGuesses, (snapshot) => {
      const currentGuesses = [];
      let playerGuessedCorrectly = false;
      snapshot.forEach(doc => {
        const data = doc.data();
        currentGuesses.push({ id: doc.id, ...data });
        if (player && data.playerPin === player.pin && data.isCorrect) {
          playerGuessedCorrectly = true;
        }
      });
      setGuesses(currentGuesses);
      if (playerGuessedCorrectly) setHasGuessedCorrectly(true);
    });

    // Listen to scores
    const scoresRef = collection(db, 'events', 'samarambh', 'skribblSessions', sessionId, 'scores');
    const unsubScores = onSnapshot(scoresRef, (snapshot) => {
      const currentScores = [];
      snapshot.forEach(doc => {
        currentScores.push({ id: doc.id, ...doc.data() });
      });
      setScores(currentScores);
    });

    return () => {
      unsubSession();
      unsubStrokes();
      unsubGuesses();
      unsubScores();
    };
  }, [sessionId, player?.pin]);

  const submitGuess = async (text) => {
    if (!player || !sessionId || hasGuessedCorrectly) return;
    if (!text.trim()) return;

    const sanitizedGuess = text.trim().toLowerCase();

    try {
      await addDoc(collection(db, 'events', 'samarambh', 'skribblSessions', sessionId, 'guesses'), {
        playerPin: player.pin,
        playerName: player.name,
        guess: sanitizedGuess,
        isCorrect: false, // updated by admin 
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error submitting guess", error);
    }
  };

  return (
    <SkribblContext.Provider value={{ session, strokes, guesses, scores, submitGuess, hasGuessedCorrectly }}>
      {children}
    </SkribblContext.Provider>
  );
}

export const useSkribbl = () => useContext(SkribblContext);
