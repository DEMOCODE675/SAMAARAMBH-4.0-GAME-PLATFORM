import React, { useEffect, useState } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function PlayerRoundReview({ player }) {
  const [lastAnswer, setLastAnswer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestSubmission = async () => {
      try {
        setLoading(true);
        const answersRef = collection(db, 'events', 'samarambh', 'answers');
        // Query by player pin only (avoids needing a Firestore composite index)
        const q = query(answersRef, where("pin", "==", player.pin));
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          let submissions = [];
          snapshot.forEach((doc) => {
            submissions.push({ id: doc.id, ...doc.data() });
          });

          // Sort locally in JavaScript by timestamp descending (newest submission first)
          submissions.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
          });

          setLastAnswer(submissions[0]);
        }
      } catch (err) {
        console.error("Error fetching submission review:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestSubmission();
  }, [player.pin]);

  if (loading) {
    return (
      <div className="w-full bg-gray-900 border border-gray-700 p-5 rounded-xl text-center my-4 animate-pulse">
        <p className="text-xs text-gray-400 uppercase tracking-widest">Crunching threat telemetry...</p>
      </div>
    );
  }

  if (!lastAnswer) {
    return (
      <div className="w-full bg-gray-900 border border-yellow-600/50 p-5 rounded-xl text-center my-4">
        <p className="text-yellow-400 font-bold text-xs uppercase tracking-wider">⚠️ No Transmission Recorded</p>
        <p className="text-gray-400 text-xs mt-1">You did not lock a verdict for this challenge before round closure.</p>
      </div>
    );
  }

  const isPhishingRound = lastAnswer.questionType === 'photo_recognize';

  return (
    <div className={`w-full border-2 p-5 rounded-xl my-4 text-left transition-all ${
      lastAnswer.isCorrect 
        ? 'bg-green-950/30 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
        : 'bg-red-950/30 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.15)]'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Result of This Question</span>
        <span className={`text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider ${
          lastAnswer.isCorrect ? 'bg-green-600 text-black' : 'bg-red-600 text-white'
        }`}>
          {lastAnswer.isCorrect ? 'CORRECT' : 'INCORRECT'}
        </span>
      </div>

      <p className="text-xs text-gray-300 font-bold mb-3">
        <span className="text-gray-500">Mission:</span> {lastAnswer.questionText}
      </p>

      <div className="bg-black/60 border border-gray-800 p-3 rounded-lg text-xs space-y-2 mb-3">
        <div className="flex justify-between text-gray-400">
          <span>Your Answer:</span>
          <span className="text-white font-bold">{lastAnswer.submittedAnswer}</span>
        </div>
      </div>

      {/* 🧠 OPERATIVE BRIEFING EXPLANATION */}
      {isPhishingRound && lastAnswer.explanation && (
        <div className="bg-cyan-950/40 border border-cyan-800/60 p-3.5 rounded-lg mt-3">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-extrabold mb-1">
          Explanation & Threat Analysis:
          </p>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            {lastAnswer.explanation}
          </p>
        </div>
      )}
    </div>
  );
}