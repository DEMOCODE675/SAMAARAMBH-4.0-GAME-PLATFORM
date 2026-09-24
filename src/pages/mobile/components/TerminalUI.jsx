import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { GameContext } from '../../../context/GameContext';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { saveToOfflineQueue, flushOfflineQueue } from '../../../utils/offlineSync';
import { 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Sun, 
  Moon, 
  Sparkles, 
  Send, 
  CornerDownLeft, 
  AlertCircle 
} from 'lucide-react';
import StageCountdown from '../../../components/StageCountdown';

const checkTerminalMatch = (input, target) => {
  if (!input || !target) return false;
  const i = String(input).trim().toLowerCase().replace(/^[$#>\s]+/, '');
  const t = String(target).trim().toLowerCase().replace(/^[$#>\s]+/, '');
  return i === t;
};

export default function TerminalUI({ payload, setHasSubmitted: setParentSubmitted }) {
  const { player } = useContext(AuthContext);
  const { gameState } = useContext(GameContext);
  
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedAnswer, setLockedAnswer] = useState(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (setupCountdown === 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [setupCountdown]);

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!input.trim() || questionTimer <= 0 || isSubmitting) return;
    setIsSubmitting(true);

    const targetCorrect = payload?.correctCommand || payload?.correctAnswer || payload?.correct || payload?.answer || '';
    const isCorrect = checkTerminalMatch(input, targetCorrect);
    const qId = gameState?.activeQuestion?.id || 'terminal_q';
    const submittedVal = input.trim();

    const totalLimit = totalTimeLimit || 25;
    const timeTaken = Math.max(0, totalLimit - questionTimer);
    const speedBonus = isCorrect ? Math.max(0, Math.round(((totalLimit - Math.min(totalLimit, timeTaken)) / totalLimit) * 500)) : 0;
    const pointsAwarded = isCorrect ? (1000 + speedBonus) : 0;

    const answerRecord = {
      pin: player.pin,
      playerPin: player.pin,
      name: player.name,
      playerName: player.name,
      teamCode: player.teamCode || null,
      gameMode: gameState?.gameMode || 'solo',
      questionId: qId,
      questionType: gameState?.activeQuestion?.type || 'terminal_hack',
      questionText: payload?.missionText || 'Terminal Command Mission',
      submittedAnswer: submittedVal,
      answer: submittedVal,
      isCorrect: isCorrect,
      pointsAwarded: pointsAwarded,
      timeTaken: Number(timeTaken.toFixed(1)),
      elapsedSeconds: Number(timeTaken.toFixed(1)),
      timestamp: serverTimestamp()
    };

    // Store in localStorage immediately
    try {
      localStorage.setItem(`answer_${player.pin}_${qId}`, JSON.stringify({
        answer: submittedVal,
        timeTaken: Number(timeTaken.toFixed(1)),
        isCorrect,
        pointsAwarded
      }));
      localStorage.setItem(`submitted_${player.pin}_${qId}`, 'true');
    } catch (err) {
      console.warn("Local storage write error:", err);
    }

    // Immediately award points in Firestore to player doc and squad
    if (pointsAwarded > 0 && player?.pin) {
      try {
        const playerRef = doc(db, 'players', player.pin);
        await updateDoc(playerRef, {
          score: increment(pointsAwarded)
        });
      } catch (scoreErr) {
        console.warn("Direct player score increment error:", scoreErr);
      }

      if (player.teamCode) {
        try {
          const teamRef = doc(db, 'events', 'samarambh', 'teams', player.teamCode);
          await updateDoc(teamRef, {
            totalScore: increment(pointsAwarded)
          });
        } catch (teamScoreErr) {
          console.warn("Direct team score increment error:", teamScoreErr);
        }
      }
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
      await addDoc(collection(db, 'events', 'samarambh', 'answers'), answerRecord);
    } catch (error) {
      console.warn("Terminal submission deferred, saving to offline buffer:", error.message);
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

  if (!payload) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 text-center ${
        isDarkMode ? 'bg-[#0b0f19] text-rose-400' : 'bg-slate-50 text-rose-600'
      }`}>
        <div className="max-w-md p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
          <h2 className="text-base font-bold">Terminal Inactive</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Waiting for next terminal challenge from the host.
          </p>
        </div>
      </div>
    );
  }

  // 1. COUNTDOWN STATE
  if (setupCountdown > 0) {
    return (
      <StageCountdown
        seconds={setupCountdown}
        maxSeconds={5}
        mode="mobile"
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        badgeText="Spawning Shell Environment"
        title="Terminal Readying"
        subtitle="Prepare to inspect the log output and execute the right bash command syntax."
        timeWindow={totalTimeLimit}
        brandName="Terminal Shell"
      />
    );
  }

  // 2. LOCKED STATE
  if (lockedAnswer) {
    const commandText = typeof lockedAnswer === 'object' ? lockedAnswer.submittedVal : lockedAnswer;
    const isAnswerCorrect = typeof lockedAnswer === 'object' ? lockedAnswer.isCorrect : false;
    const pointsGained = typeof lockedAnswer === 'object' ? (lockedAnswer.pointsAwarded || 0) : 0;

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
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 shadow-sm ${
            isAnswerCorrect 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
          }`}>
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Command Executed!
          </h1>
          <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Output sent to host. Results will appear when the timer finishes.
          </p>

          {/* Points Earned Banner */}
          {isAnswerCorrect ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
              <div className="flex items-center justify-center gap-2 font-black text-base">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <span>+{pointsGained.toLocaleString()} Points Earned!</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                Terminal command verified successfully!
              </p>
            </div>
          ) : (
            <div className={`p-3 rounded-xl border text-xs mb-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <span>Command registered · Awaiting host resolution</span>
            </div>
          )}

          <div className={`p-4 rounded-2xl border text-left space-y-2 mb-4 ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Executed Command
            </span>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-emerald-500 font-bold">$</span>
              <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-100">
                {commandText}
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

  // 3. ACTIVE TERMINAL INTERACTION
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
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  CLI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Command Mission
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
        <form onSubmit={handleExecute} className="space-y-4">
          
          {/* Mission Objective */}
          <div className={`p-4 md:p-5 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-slate-900/70 border-slate-800' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <span className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md mb-2 inline-block ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              Objective
            </span>

            <p className="text-sm md:text-base font-bold leading-relaxed text-slate-900 dark:text-white">
              {payload.missionText || 'Identify the correct command to execute:'}
            </p>
          </div>

          {/* Sleek Terminal Log Console */}
          {payload.consoleText && (
            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] text-slate-200 overflow-hidden shadow-md">
              <div className="bg-[#1e293b] px-4 py-2 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Terminal className="w-3 h-3" />
                  <span>bash — 80×24</span>
                </div>
              </div>
              <div className="p-3.5 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed whitespace-pre-wrap">
                {payload.consoleText}
              </div>
            </div>
          )}

          {/* Command Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block px-1">
              Enter Command:
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-indigo-500 font-mono font-bold text-sm">
                $
              </span>
              <input 
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. grep, sudo, kill, cat..."
                disabled={isSubmitting || questionTimer <= 0}
                className={`w-full pl-8 pr-12 py-3.5 rounded-xl border text-sm font-mono outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm'
                }`}
                required
                autoCapitalize="none"
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isSubmitting || questionTimer <= 0}
                className="absolute right-2 p-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-30 disabled:bg-slate-500 transition-opacity"
                title="Execute"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={!input.trim() || isSubmitting || questionTimer <= 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm ${
                input.trim() && questionTimer > 0 && !isSubmitting
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing Command...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute & Lock Command</span>
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
