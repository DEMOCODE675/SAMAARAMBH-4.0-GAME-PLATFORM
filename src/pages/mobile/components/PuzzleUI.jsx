import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { submitAnswerRecord } from '../../../utils/offlineSync';
import { 
  Clock, 
  Lock,
  Sun, 
  Moon, 
  Send 
} from 'lucide-react';
import StageCountdown from '../../../components/StageCountdown';

const checkPuzzleMatch = (input, target) => {
  if (!input || !target) return false;
  const i = String(input).trim().toLowerCase();
  const t = String(target).trim().toLowerCase();
  return i === t;
};

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

  const [setupCountdown, setSetupCountdown] = useState(10);
  const [questionTimer, setQuestionTimer] = useState(totalTimeLimit);

  useEffect(() => {
    if (!gameState?.updatedAt) return;
    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();

    const updateTimers = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
      const remainingSetup = Math.min(10, Math.max(0, 10 - elapsedSeconds));
      
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(totalTimeLimit);
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 10;
        const remainingQuestionTime = Math.max(0, totalTimeLimit - activeElapsed);
        setQuestionTimer(remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, totalTimeLimit]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!answerInput.trim() || isSubmitting || lockedAnswer) return;
    setIsSubmitting(true);

    const targetCorrect = payload.correctAnswer || payload.correct || payload.answer || '';
    const isCorrect = checkPuzzleMatch(answerInput, targetCorrect);
    const qId = gameState?.activeQuestion?.id || 'puzzle_q';
    const submittedVal = answerInput.trim();

    const totalLimit = totalTimeLimit || 25;
    const timeTaken = Math.max(0, totalLimit - questionTimer);
    const speedBonus = isCorrect ? Math.max(0, Math.round(((totalLimit - Math.min(totalLimit, timeTaken)) / totalLimit) * 500)) : 0;
    const pointsAwarded = isCorrect ? (1000 + speedBonus) : 0;

    let clientAwarded = false;

    // Immediately award points in Firestore with safety fallback
    if (pointsAwarded > 0 && player?.pin) {
      try {
        const playerRef = doc(db, 'players', player.pin);
        await updateDoc(playerRef, {
          score: increment(pointsAwarded)
        });
        clientAwarded = true;
      } catch (scoreErr) {
        console.warn("Direct player score increment deferred to admin batch:", scoreErr.message);
      }

      if (player.teamCode) {
        try {
          const teamRef = doc(db, 'events', 'samarambh', 'teams', player.teamCode);
          await updateDoc(teamRef, {
            totalScore: increment(pointsAwarded)
          });
        } catch (teamScoreErr) {
          console.warn("Direct team score increment deferred:", teamScoreErr.message);
        }
      }
    }

    const answerRecord = {
      pin: player.pin,
      playerPin: player.pin,
      name: player.name,
      playerName: player.name,
      teamCode: player.teamCode || null,
      gameMode: gameState?.gameMode || 'solo',
      questionId: qId,
      questionType: gameState?.activeQuestion?.type || 'logic_puzzle',
      questionText: payload.puzzleText || 'Logic Riddle Challenge',
      submittedAnswer: submittedVal,
      answer: submittedVal,
      isCorrect: isCorrect,
      pointsAwarded: pointsAwarded,
      clientAwarded: clientAwarded,
      timeTaken: Number(timeTaken.toFixed(1)),
      elapsedSeconds: Number(timeTaken.toFixed(1))
    };

    try {
      const localRecord = {
        questionId: qId,
        questionType: 'logic_puzzle',
        questionText: payload?.puzzleText || payload?.puzzlePrompt || payload?.riddle || 'Logic Puzzle',
        submittedAnswer: submittedVal,
        answer: submittedVal,
        timeTaken: Number(timeTaken.toFixed(1)),
        isCorrect,
        pointsAwarded,
        createdAt: Date.now(),
        timestamp: Date.now()
      };
      localStorage.setItem(`answer_${player.pin}_${qId}`, JSON.stringify(localRecord));
      localStorage.setItem(`latest_answer_${player.pin}`, JSON.stringify(localRecord));
      localStorage.setItem(`submitted_${player.pin}_${qId}`, 'true');
    } catch (err) {
      console.warn("Local storage write error:", err);
    }

    if (navigator.vibrate) navigator.vibrate(50);
    const lockedInfo = {
      submittedVal,
      isCorrect,
      pointsAwarded,
      timeTaken: Number(timeTaken.toFixed(1))
    };
    setLockedAnswer(lockedInfo);
    if (setParentSubmitted) setParentSubmitted(true);

    try {
      await submitAnswerRecord(answerRecord);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit puzzle input when timer hits 0
  useEffect(() => {
    if (setupCountdown === 0 && questionTimer === 0 && answerInput.trim() && !lockedAnswer && !isSubmitting) {
      handleSubmit();
    }
  }, [setupCountdown, questionTimer, answerInput, lockedAnswer, isSubmitting]);

  // 1. COUNTDOWN STATE
  if (setupCountdown > 0) {
    return (
      <StageCountdown
        seconds={setupCountdown}
        maxSeconds={10}
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

        {/* Center Lock Card */}
        <div className="max-w-md w-full mx-auto text-center py-8">
          {/* Animated Circular Ring - Hover and Running effect */}
          <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
            {/* Subtle glowing ambient aura */}
            <div className="absolute -inset-3 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-lg" />

            {/* Outer active running spinner ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 border-r-indigo-500 animate-spin" 
              style={{ animationDuration: '2s' }} 
            />
            {/* Reverse secondary subtle ring */}
            <div 
              className="absolute inset-2 rounded-full border border-dashed border-indigo-400/30 dark:border-indigo-300/25 animate-spin" 
              style={{ animationDuration: '5s', animationDirection: 'reverse' }} 
            />
            {/* Concentric radar pulse ring */}
            <div 
              className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-ping opacity-25" 
              style={{ animationDuration: '2.6s' }} 
            />
            {/* Centered lock badge */}
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/15">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Response Locked
          </h2>
          <p className={`text-xs mb-6 max-w-xs mx-auto leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Your response has been secured. Please wait for the host to conclude the round.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Live · Round in Progress</span>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center text-[11px] text-slate-400 pb-2">
          <span className="font-semibold text-slate-300">MLSA miet</span> © 2026 All Rights Reserved
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
