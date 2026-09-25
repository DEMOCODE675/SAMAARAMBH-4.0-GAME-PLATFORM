import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { GameContext } from '../../../context/GameContext';
import { db } from '../../../config/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { submitAnswerRecord } from '../../../utils/offlineSync';
import { 
  Check, 
  Clock, 
  Lock, 
  Sun, 
  Moon, 
  Zap, 
  AlertCircle 
} from 'lucide-react';
import StageCountdown from '../../../components/StageCountdown';

const OPTION_BADGES = [
  { label: 'A', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60' },
  { label: 'B', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60' },
  { label: 'C', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60' },
  { label: 'D', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60' },
  { label: 'E', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60' },
  { label: 'F', bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/60' }
];

// Robust comparison helper supporting exact string, letter indices, and prefixes
const checkMcqMatch = (selected, target, options) => {
  if (!selected || !target) return false;
  const s = String(selected).trim().toLowerCase();
  const t = String(target).trim().toLowerCase();
  if (s === t) return true;

  const letterMap = ['a', 'b', 'c', 'd', 'e', 'f'];
  const targetIndex = letterMap.indexOf(t);
  if (targetIndex !== -1 && options && options[targetIndex]) {
    if (String(options[targetIndex]).trim().toLowerCase() === s) return true;
  }

  const selectedIndex = letterMap.indexOf(s);
  if (selectedIndex !== -1 && options && options[selectedIndex]) {
    if (String(options[selectedIndex]).trim().toLowerCase() === t) return true;
  }

  const cleanS = s.replace(/^[a-f0-9][.)\-:\s]+/i, '').trim();
  const cleanT = t.replace(/^[a-f0-9][.)\-:\s]+/i, '').trim();
  if (cleanS && cleanS === cleanT) return true;

  return false;
};

export default function QuizUI({ payload, setHasSubmitted: setParentSubmitted }) {
  const { player } = useContext(AuthContext);
  const { gameState } = useContext(GameContext);
  
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedAnswer, setLockedAnswer] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Eye-friendly theme preference
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

  const totalTimeLimit = gameState?.activeQuestion?.timeLimit || 20;
  const [setupCountdown, setSetupCountdown] = useState(5);
  const [questionTimer, setQuestionTimer] = useState(totalTimeLimit);

  // Synchronized Countdown & Question Timer with drift clamping
  useEffect(() => {
    if (!gameState?.updatedAt) return;
    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();

    const updateTimers = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
      const remainingSetup = Math.min(5, Math.max(0, 5 - elapsedSeconds));
      
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(totalTimeLimit);
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = Math.max(0, totalTimeLimit - activeElapsed);
        setQuestionTimer(remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, totalTimeLimit]);

  // Record time question became interactive
  useEffect(() => {
    if (setupCountdown === 0 && !questionStartTime) {
      const now = Date.now();
      const timer = setTimeout(() => {
        setQuestionStartTime(now);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [setupCountdown, questionStartTime]);

  const handleLockAnswer = async () => {
    if (!selected || isSubmitting || lockedAnswer) return;
    setIsSubmitting(true);

    const targetCorrect = payload?.correctAnswer || payload?.correct || payload?.answer || '';
    const isCorrect = checkMcqMatch(selected, targetCorrect, payload?.options);
    const timeTaken = questionStartTime ? Math.max(0, (Date.now() - questionStartTime) / 1000) : 0;
    const qId = gameState?.activeQuestion?.id || 'active_q';

    const totalLimit = totalTimeLimit || 20;
    const speedBonus = isCorrect ? Math.max(0, Math.round(((totalLimit - Math.min(totalLimit, timeTaken)) / totalLimit) * 500)) : 0;
    const pointsAwarded = isCorrect ? (1000 + speedBonus) : 0;

    let clientAwarded = false;

    // Direct score update with safety fallback
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
      questionType: gameState?.activeQuestion?.type || 'mcq',
      questionText: payload?.question || 'Unknown Question',
      submittedAnswer: selected,
      answer: selected,
      isCorrect: isCorrect,
      pointsAwarded: pointsAwarded,
      clientAwarded: clientAwarded,
      timeTaken: Number(timeTaken.toFixed(1)),
      elapsedSeconds: Number(timeTaken.toFixed(1))
    };

    // Store in localStorage immediately so student response and points are preserved
    try {
      localStorage.setItem(`answer_${player.pin}_${qId}`, JSON.stringify({
        answer: selected,
        timeTaken: Number(timeTaken.toFixed(1)),
        isCorrect,
        pointsAwarded
      }));
      localStorage.setItem(`submitted_${player.pin}_${qId}`, 'true');
    } catch (e) {
      console.warn("Local storage write error:", e);
    }

    // Immediately reflect locked UI on the student device
    const lockedInfo = {
      selected,
      isCorrect,
      pointsAwarded,
      timeTaken: Number(timeTaken.toFixed(1))
    };
    setLockedAnswer(lockedInfo);
    if (setParentSubmitted) setParentSubmitted(true);
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      await submitAnswerRecord(answerRecord);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit chosen option if timer expires
  useEffect(() => {
    if (setupCountdown === 0 && questionTimer === 0 && selected && !lockedAnswer && !isSubmitting) {
      handleLockAnswer();
    }
  }, [setupCountdown, questionTimer, selected, lockedAnswer, isSubmitting]);

  // Safe Guard
  if (!payload) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 text-center ${
        isDarkMode ? 'bg-[#0b0f19] text-rose-400' : 'bg-slate-50 text-rose-600'
      }`}>
        <div className="max-w-md p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
          <h2 className="text-base font-bold">Question Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Waiting for the host to send the next challenge payload.
          </p>
        </div>
      </div>
    );
  }

  // 1. PHASE 1: COUNTDOWN / GET READY SCREEN (5 Seconds)
  if (setupCountdown > 0) {
    return (
      <StageCountdown
        seconds={setupCountdown}
        maxSeconds={5}
        mode="mobile"
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        badgeText="Next Question Starting"
        title="Get Ready!"
        subtitle="Prepare to choose your answer quickly. Accuracy and speed determine your points!"
        timeWindow={totalTimeLimit}
        brandName="MCQ Challenge"
      />
    );
  }

  // 2. PHASE 2: SUBMITTED / LOCKED STATE
  if (lockedAnswer) {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* Top Header */}
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

  // 3. PHASE 3: ACTIVE QUESTION ANSWERING
  const optionsList = payload?.options || [];
  const timePercentage = Math.max(0, Math.min(100, (questionTimer / totalTimeLimit) * 100));

  // Determine timer color state
  const isTimeCritical = questionTimer <= 5;
  const isTimeWarning = questionTimer <= 10 && questionTimer > 5;

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Dynamic Animated Progress Bar along the top edge */}
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

      {/* TOP HEADER */}
      <header className={`px-4 py-3 border-b backdrop-blur-md sticky top-1.5 z-30 transition-colors ${
        isDarkMode ? 'bg-[#0b0f19]/90 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-sm'
      }`}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Category */}
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
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {gameState?.gameMode === 'team' ? 'Squad Mode' : 'Solo Arena'}
              </p>
            </div>
          </div>

          {/* Timer Badge & Theme Switch */}
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

      {/* QUESTION BODY */}
      <main className="max-w-md w-full mx-auto px-4 py-5 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Question Card */}
          <div className={`p-5 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-slate-900/70 border-slate-800' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md ${
                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}>
                Question
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3 text-amber-500" /> Speed Bonus
              </span>
            </div>

            <h1 className="text-base md:text-lg font-bold leading-relaxed text-slate-900 dark:text-white">
              {payload?.question}
            </h1>
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {optionsList.map((opt, idx) => {
              const isSelected = selected === opt;
              const badge = OPTION_BADGES[idx % OPTION_BADGES.length];

              return (
                <button 
                  key={idx}
                  onClick={() => setSelected(opt)}
                  disabled={isSubmitting || questionTimer <= 0}
                  className={`w-full p-3.5 md:p-4 rounded-xl border text-left transition-all flex items-center justify-between group active:scale-[0.99] min-h-[56px] ${
                    isSelected 
                      ? (isDarkMode 
                          ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 text-white' 
                          : 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/30 text-indigo-950 shadow-sm')
                      : (isDarkMode 
                          ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900' 
                          : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-slate-50/80 shadow-sm')
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 scale-105' 
                        : badge.bg
                    }`}>
                      {badge.label}
                    </span>
                    <span className="text-sm font-medium leading-snug break-words">
                      {opt}
                    </span>
                  </div>

                  <div className="shrink-0 pl-1">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : (isDarkMode ? 'border-slate-700' : 'border-slate-300')
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SUBMISSION ACTION */}
        <div className="pt-5 pb-3">
          <button 
            onClick={handleLockAnswer}
            disabled={!selected || isSubmitting || questionTimer <= 0}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm ${
              selected && questionTimer > 0 && !isSubmitting
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95 cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Recording Answer...</span>
              </>
            ) : selected ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Lock In Answer</span>
              </>
            ) : (
              <span>Select an Option Above</span>
            )}
          </button>
        </div>
      </main>

    </div>
  );
}
