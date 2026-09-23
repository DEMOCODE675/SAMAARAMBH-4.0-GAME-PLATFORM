import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { saveToOfflineQueue, flushOfflineQueue } from '../../../utils/offlineSync';
import { 
  CheckCircle2, 
  Clock, 
  Sun, 
  Moon, 
  Sparkles, 
  Send 
} from 'lucide-react';
import StageCountdown from '../../../components/StageCountdown';

export default function PuzzleUI({ player, gameState, setHasSubmitted: setParentSubmitted }) {
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedAnswer, setLockedAnswer] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('techarena_theme') === 'dark';
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('techarena_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const payload = gameState?.activeQuestion?.payload || {};
  const totalTimeLimit = gameState?.activeQuestion?.timeLimit || 25;

  const [setupCountdown, setSetupCountdown] = useState(5);
  const [questionTimer, setQuestionTimer] = useState(totalTimeLimit);

  useEffect(() => {
    if (!gameState?.updatedAt) return;
    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();

    const updateTimers = () => {
      const elapsedSeconds = Math.floor((Date.now() - updatedAtMs) / 1000);
      const remainingSetup = 5 - elapsedSeconds;
      
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(totalTimeLimit);
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = totalTimeLimit - activeElapsed;
        setQuestionTimer(remainingQuestionTime <= 0 ? 0 : remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, totalTimeLimit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || questionTimer <= 0 || isSubmitting) return;
    setIsSubmitting(true);

    const isCorrect = answerInput.trim().toLowerCase() === (payload.correct || '').trim().toLowerCase();
    const qId = gameState?.activeQuestion?.id || 'puzzle_q';
    const submittedVal = answerInput.trim();

    const answerRecord = {
      pin: player.pin,
      name: player.name,
      teamCode: player.teamCode || null,
      gameMode: gameState?.gameMode || 'solo',
      questionId: qId,
      questionText: payload.puzzleText || 'Logic Riddle Challenge',
      submittedAnswer: submittedVal,
      isCorrect: isCorrect,
      timestamp: serverTimestamp()
    };

    try {
      localStorage.setItem(`answer_${player.pin}_${qId}`, JSON.stringify({
        answer: submittedVal,
        isCorrect
      }));
    } catch (err) {
      console.warn("Local storage write error:", err);
    }

    if (navigator.vibrate) navigator.vibrate(50);
    setLockedAnswer(submittedVal);
    if (setParentSubmitted) setParentSubmitted(true);

    try {
      await addDoc(collection(db, 'events', 'samarambh', 'answers'), answerRecord);
    } catch (error) {
      console.warn("Puzzle submission deferred, saving to offline buffer:", error.message);
      saveToOfflineQueue(answerRecord);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue(async (item) => {
        await addDoc(collection(db, 'events', 'samarambh', 'answers'), {
          ...item,
          timestamp: serverTimestamp()
        });
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // 1. COUNTDOWN STATE
  if (setupCountdown > 0) {
    return (
      <StageCountdown
        seconds={setupCountdown}
        maxSeconds={5}
        mode="mobile"
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        badgeText="Puzzle Decrypting"
        title="Get Ready to Solve!"
        subtitle="Analyze the riddle carefully and enter your solution before the timer runs out."
        timeWindow={totalTimeLimit}
        brandName="Logic Puzzle"
      />
    );
  }

  // 2. LOCKED STATE
  if (lockedAnswer) {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="max-w-md w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/images/logo.jpg" 
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="TechArena" 
              className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            />
            <span className="font-extrabold text-sm tracking-tight">
              Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            questionTimer > 5 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{questionTimer}s remaining</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Solution Locked!
          </h1>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Your answer has been sent to the host.
          </p>

          <div className={`p-4 rounded-2xl border text-left space-y-2 mb-4 ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Your Submission
            </span>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                {lockedAnswer}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 pb-2">
          Samarambh 4.0 · Live Stage
        </div>
      </div>
    );
  }

  // 3. ACTIVE PUZZLE VIEW
  const timePercentage = Math.max(0, Math.min(100, (questionTimer / totalTimeLimit) * 100));
  const isTimeCritical = questionTimer <= 5;
  const isTimeWarning = questionTimer <= 10 && questionTimer > 5;

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 overflow-hidden sticky top-0 z-40">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            isTimeCritical 
              ? 'bg-rose-500' 
              : isTimeWarning 
                ? 'bg-amber-500' 
                : 'bg-indigo-600 dark:bg-indigo-400'
          }`}
          style={{ width: `${timePercentage}%` }}
        />
      </div>

      {/* Header */}
      <header className={`px-4 py-3 border-b backdrop-blur-md sticky top-1.5 z-30 transition-colors ${
        isDarkMode ? 'bg-[#0b0f19]/90 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-sm'
      }`}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img 
              src="/images/logo.jpg" 
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="TechArena" 
              className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight">
                  Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Riddle
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Logic Challenge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
              isTimeCritical 
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse' 
                : isTimeWarning
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{questionTimer}s</span>
            </div>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-md w-full mx-auto px-4 py-5 flex-1 flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Riddle Card */}
          <div className={`p-5 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-slate-900/70 border-slate-800' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <span className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md mb-2 inline-block ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              Logic Riddle
            </span>

            <p className="text-base font-medium leading-relaxed text-slate-900 dark:text-white">
              {payload.puzzleText || 'Crack the riddle and enter the key phrase:'}
            </p>
          </div>

          {/* Solution Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block px-1">
              Your Solution:
            </label>
            <input 
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Type your answer here..."
              disabled={isSubmitting || questionTimer <= 0}
              className={`w-full p-4 rounded-xl border text-sm font-medium outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm'
              }`}
              required
              autoFocus
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={!answerInput.trim() || isSubmitting || questionTimer <= 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm ${
                answerInput.trim() && questionTimer > 0 && !isSubmitting
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Solution...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Lock In Solution</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-[11px] text-slate-400 pb-2">
          Samarambh 4.0 · Live Stage
        </div>
      </main>

    </div>
  );
}
