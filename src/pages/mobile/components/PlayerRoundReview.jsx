import React, { useEffect, useState } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function PlayerRoundReview({ player, gameState }) {
  const [lastAnswer, setLastAnswer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player?.pin) {
      setLoading(false);
      return;
    }

    // 1. Instant check from local cache to avoid Firestore read storm across 400 clients
    try {
      // If server specified the completed question ID, check that specific answer record first
      const completedQ = gameState?.lastCompletedQuestion;
      if (completedQ?.id) {
        const specificRaw = localStorage.getItem(`answer_${player.pin}_${completedQ.id}`);
        if (specificRaw) {
          try {
            const parsed = JSON.parse(specificRaw);
            if (parsed) {
              setLastAnswer({
                questionText: completedQ.questionText || parsed.questionText || 'Latest Arena Challenge',
                submittedAnswer: parsed.submittedAnswer || parsed.answer || '',
                answer: parsed.submittedAnswer || parsed.answer || '',
                isCorrect: Boolean(parsed.isCorrect),
                pointsAwarded: parsed.pointsAwarded || 0,
                questionType: completedQ.type || parsed.questionType || 'mcq',
                explanation: parsed.explanation || '',
                createdAt: parsed.createdAt || parsed.timestamp || 0
              });
              setLoading(false);
              return;
            }
          } catch { /* malformed — fallback */ }
        }
      }

      // First check direct latest answer pointer
      const latestDirectRaw = localStorage.getItem(`latest_answer_${player.pin}`);
      if (latestDirectRaw) {
        const parsed = JSON.parse(latestDirectRaw);
        if (parsed && (parsed.submittedAnswer || parsed.answer || parsed.pointsAwarded !== undefined)) {
          setLastAnswer({
            questionText: parsed.questionText || 'Latest Arena Challenge',
            submittedAnswer: parsed.submittedAnswer || parsed.answer || '',
            answer: parsed.submittedAnswer || parsed.answer || '',
            isCorrect: Boolean(parsed.isCorrect),
            pointsAwarded: parsed.pointsAwarded || 0,
            questionType: parsed.questionType || 'mcq',
            explanation: parsed.explanation || '',
            createdAt: parsed.createdAt || parsed.timestamp || 0
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: scan all answer keys for this player and pick the newest by timestamp
      const prefix = `answer_${player.pin}_`;
      let latestLocal = null;
      let latestTime = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const itemTime = Number(parsed.createdAt || parsed.timestamp || parsed.createdAtMs || 0);
              // Pick candidate with newest timestamp, or if no timestamps, prefer entries that have answers
              if (!latestLocal || itemTime > latestTime || (!latestTime && (parsed.submittedAnswer || parsed.answer))) {
                latestLocal = parsed;
                latestTime = itemTime;
              }
            } catch { /* malformed item — skip */ }
          }
        }
      }

      if (latestLocal && (latestLocal.submittedAnswer || latestLocal.answer || latestLocal.pointsAwarded !== undefined)) {
        setLastAnswer({
          questionText: latestLocal.questionText || 'Latest Arena Challenge',
          submittedAnswer: latestLocal.submittedAnswer || latestLocal.answer || '',
          answer: latestLocal.submittedAnswer || latestLocal.answer || '',
          isCorrect: Boolean(latestLocal.isCorrect),
          pointsAwarded: latestLocal.pointsAwarded || 0,
          questionType: latestLocal.questionType || 'mcq',
          explanation: latestLocal.explanation || '',
          createdAt: latestTime
        });
        setLoading(false);
        return;
      }
    } catch (localErr) {
      console.warn("Local review read fallback to network:", localErr);
    }

    // 2. Network fallback (queries answers & skribblGuesses)
    const fetchLatestSubmission = async () => {
      try {
        setLoading(true);
        const submissions = [];

        // Check standard answers collection
        try {
          const answersRef = collection(db, 'events', 'samarambh', 'answers');
          const q = query(answersRef, where("pin", "==", player.pin));
          const snapshot = await getDocs(q);
          snapshot.forEach((docSnap) => {
            submissions.push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch (ansErr) {
          console.warn("Answers review query error:", ansErr);
        }

        // Also check skribblGuesses collection
        try {
          const skribblRef = collection(db, 'events', 'samarambh', 'skribblGuesses');
          const skribblQ = query(skribblRef, where("pin", "==", player.pin));
          const skribblSnap = await getDocs(skribblQ);
          skribblSnap.forEach((docSnap) => {
            const data = docSnap.data();
            submissions.push({
              id: docSnap.id,
              questionText: `🎨 Skribbl Round ${data.roundIndex || ''}: Word Drawing`,
              submittedAnswer: data.text,
              answer: data.text,
              isCorrect: Boolean(data.isCorrect),
              pointsAwarded: data.pointsAwarded || 0,
              questionType: 'skribbl',
              createdAtMs: data.createdAtMs || 0,
              timestamp: data.timestamp
            });
          });
        } catch (skribblErr) {
          console.warn("Skribbl review query error:", skribblErr);
        }

        if (submissions.length > 0) {
          submissions.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAtMs || a.createdAt || 0);
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAtMs || b.createdAt || 0);
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
  }, [player?.pin, gameState?.lastCompletedQuestion?.id]);

  if (loading) {
    return (
      <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center my-3 animate-pulse">
        <p className="text-xs text-slate-500 font-medium">Loading round results...</p>
      </div>
    );
  }

  if (!lastAnswer) {
    return (
      <div className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl text-center my-3">
        <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>No answer recorded for this question</span>
        </div>
      </div>
    );
  }

  const isPhishingRound = lastAnswer.questionType === 'photo_recognize';
  const displayAnswer = lastAnswer.submittedAnswer || lastAnswer.answer || '';

  return (
    <div className={`w-full border rounded-2xl p-4 md:p-5 my-3 text-left transition-all ${
      lastAnswer.isCorrect 
        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 shadow-sm' 
        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 shadow-sm'
    }`}>
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-1.5">
          {lastAnswer.isCorrect ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span className={`text-xs font-bold uppercase tracking-wider ${
            lastAnswer.isCorrect 
              ? 'text-emerald-700 dark:text-emerald-300' 
              : 'text-rose-700 dark:text-rose-300'
          }`}>
            {lastAnswer.isCorrect ? 'Correct Answer' : 'Incorrect'}
          </span>
        </div>

        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          lastAnswer.isCorrect 
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700' 
            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700'
        }`}>
          Round Review
        </span>
      </div>

      {lastAnswer.questionText && (
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          {lastAnswer.questionText}
        </p>
      )}

      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs flex justify-between items-center">
        <span className="text-slate-500 dark:text-slate-400">Your Answer:</span>
        <span className="font-bold text-slate-900 dark:text-white">
          {displayAnswer ? (
            displayAnswer
          ) : (
            <span className="text-slate-400 italic font-normal">No answer submitted</span>
          )}
        </span>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs flex justify-between items-center mt-2">
        <span className="text-slate-500 dark:text-slate-400">Points Awarded:</span>
        <span className={`font-bold ${lastAnswer.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
          {lastAnswer.isCorrect ? `+${(lastAnswer.pointsAwarded || 1000).toLocaleString()} pts` : '0 pts'}
        </span>
      </div>

      {isPhishingRound && lastAnswer.explanation && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 p-3 rounded-xl mt-3 text-xs">
          <p className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
            Explanation:
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {lastAnswer.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
