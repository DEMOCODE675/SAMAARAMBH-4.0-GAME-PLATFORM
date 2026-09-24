import React, { useEffect, useState } from 'react';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function PlayerRoundReview({ player }) {
  const [lastAnswer, setLastAnswer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestSubmission = async () => {
      try {
        setLoading(true);
        const answersRef = collection(db, 'events', 'samarambh', 'answers');
        const q = query(answersRef, where("pin", "==", player.pin));
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          let submissions = [];
          snapshot.forEach((docSnap) => {
            submissions.push({ id: docSnap.id, ...docSnap.data() });
          });

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

      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        {lastAnswer.questionText}
      </p>

      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs flex justify-between items-center">
        <span className="text-slate-500 dark:text-slate-400">Your Answer:</span>
        <span className="font-bold text-slate-900 dark:text-white">{lastAnswer.submittedAnswer || lastAnswer.answer}</span>
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
