import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../../config/firebase';
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { saveToOfflineQueue, flushOfflineQueue } from '../../../utils/offlineSync';
import {
  computeSkribblScore,
  hintLevelForElapsed,
  renderHintString,
  skribblElapsedSeconds,
  verifyGuess
} from '../../../utils/skribblEngine';
import SkribblCanvas from '../../../components/SkribblCanvas';
import { Clock, PartyPopper, Send, Sun, Moon, Trophy, Users } from 'lucide-react';

const EVENT = 'samarambh';

// Skribbl guesser view. Scale design (200+ concurrent players):
// - NO listener besides the shared GameContext one: hint/phase/reveal all come
//   from the event doc the player is already streaming.
// - Correct-guess state is cached in localStorage so a refresh keeps the
//   "guessed it" lock without re-querying anything.
// - Reveal standings come from activeQuestion.revealTop (written once by admin)
//   instead of every device querying the guesses collection.
export default function SkribblUI({ player, gameState, setHasSubmitted: setParentSubmitted }) {
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const activeQ = gameState?.activeQuestion;
  const roundId = activeQ?.roundId;
  const timeLimit = activeQ?.timeLimit || 75;
  const phase = gameState?.skribbl?.phase || 'drawing';

  const [isDark, setIsDark] = useState(() => localStorage.getItem('techarena_theme') === 'dark');
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('techarena_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Restore the "already guessed correctly" lock for THIS round after refresh.
  // Runs in a timeout to avoid cascading renders on mount (platform convention).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!roundId || !player?.pin) {
        setIsCorrect(false);
        return;
      }
      const already = localStorage.getItem(`skribbl_correct_${player.pin}_${roundId}`);
      setIsCorrect(already === '1');
    }, 0);
    return () => clearTimeout(timer);
  }, [roundId, player?.pin]);

  // Clock derived from the server start timestamp (same model as other games).
  const elapsed = activeQ?.startTime
    ? skribblElapsedSeconds(activeQ.startTime, timeLimit)
    : 0;
  const remaining = Math.max(0, timeLimit - elapsed);
  const hintLevel = useMemo(
    () => hintLevelForElapsed(elapsed, timeLimit),
    [elapsed, timeLimit]
  );
  const hintString = activeQ?.hint
    ? renderHintString(activeQ.hint.display, activeQ.hint.reveals, hintLevel)
    : '';

  const submitGuess = async (e) => {
    e.preventDefault();
    const text = guessInput.trim();
    // Guessing is only valid once the drawing clock is live — this blocks early
    // submissions during the word-picking phase from farming max speed bonuses.
    if (!text || isSubmitting || isCorrect || !canGuess) return;
    setIsSubmitting(true);

    const correct = verifyGuess(text, activeQ?.wordHash);
    const timeTaken = elapsed;
    const pointsAwarded = correct ? computeSkribblScore(timeLimit, timeTaken) : 0;

    const guessRecord = {
      pin: player.pin,
      playerPin: player.pin,
      name: player.name,
      playerName: player.name,
      teamCode: player.teamCode || null,
      gameMode: gameState?.gameMode || 'solo',
      roundId,
      roundIndex: activeQ?.roundIndex || null,
      questionId: roundId, // keeps admin tooling conventions aligned
      questionType: 'skribbl',
      text, // wrong guesses are visible chat; correct ones are hidden by isCorrect
      isCorrect: correct,
      pointsAwarded,
      timeTaken: Number(timeTaken.toFixed(1)),
      createdAtMs: Date.now(),
      timestamp: serverTimestamp()
    };

    // Optimistic lock + local persistence first (offline-safe).
    if (correct) {
      setIsCorrect(true);
      try {
        localStorage.setItem(`skribbl_correct_${player.pin}_${roundId}`, '1');
      } catch { /* storage full — non-fatal */ }
    }
    if (pointsAwarded > 0 && player?.pin) {
      try {
        await updateDoc(doc(db, 'players', player.pin), { score: increment(pointsAwarded) });
      } catch (err) {
        console.warn('Skribbl score increment error:', err.message);
      }
      if (player.teamCode) {
        try {
          await updateDoc(doc(db, 'events', EVENT, 'teams', player.teamCode), {
            totalScore: increment(pointsAwarded)
          });
        } catch (err) {
          console.warn('Skribbl team score increment error:', err.message);
        }
      }
    }
    if (navigator.vibrate) navigator.vibrate(correct ? [60, 40, 60] : 30);
    if (setParentSubmitted) setParentSubmitted(true);

    try {
      await addDoc(collection(db, 'events', EVENT, 'skribblGuesses'), guessRecord);
    } catch (err) {
      console.warn('Guess upload deferred to offline buffer:', err.message);
      saveToOfflineQueue(guessRecord);
    } finally {
      setIsSubmitting(false);
      setGuessInput('');
    }
  };

  // Flush queued guesses when connectivity returns (same pattern as PuzzleUI).
  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue(async (item) => {
        await addDoc(collection(db, 'events', EVENT, 'skribblGuesses'), {
          ...item,
          timestamp: serverTimestamp()
        });
      });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  if (!roundId) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-300 flex items-center justify-center p-6 text-center">
        <p className="text-sm">Waiting for the artist to prepare the next round…</p>
      </div>
    );
  }

  const canGuess = phase === 'drawing' && !!activeQ?.startTime;

  const isTimeCritical = remaining <= 5;
  const timePct = Math.max(0, Math.min(100, (remaining / timeLimit) * 100));
  const revealTop = activeQ?.revealTop || [];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDark ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 overflow-hidden sticky top-0 z-40">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${isTimeCritical ? 'bg-rose-500' : remaining <= 10 ? 'bg-amber-500' : 'bg-indigo-600 dark:bg-indigo-400'}`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Header */}
      <header className={`px-4 py-3 border-b backdrop-blur-md sticky top-1.5 z-30 ${isDark ? 'bg-[#0b0f19]/90 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-sm'}`}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo.jpg"
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="TechArena"
              className={`h-9 w-9 rounded-xl object-contain p-1 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight">
                  Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Skribbl
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Round {activeQ?.roundIndex || '·'} · Draw & Guess
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${isTimeCritical
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse'
              : remaining <= 10
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                : isDark
                  ? 'bg-slate-900 border-slate-800 text-indigo-400'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.ceil(remaining)}s</span>
            </div>
            <button onClick={toggleTheme} className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`} title="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto px-4 py-4 flex-1 flex flex-col gap-3">
        {/* Live canvas */}
        <div className="rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-md bg-white aspect-[4/3]">
          <SkribblCanvas roundId={roundId} showWatermark={false} />
        </div>

        {/* Word hint */}
        <div className={`rounded-2xl border p-3.5 text-center ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'}`}>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">Guess the word</p>
          <p className="font-mono text-xl tracking-[0.25em] text-amber-500 dark:text-amber-300 break-words">
            {phase === 'reveal' ? (activeQ?.word || '—') : hintString}
          </p>
        </div>

        {/* Reveal state */}
        {phase === 'reveal' ? (
          <div className={`rounded-2xl border p-5 ${isDark ? 'bg-amber-950/30 border-amber-500/40' : 'bg-amber-50 border-amber-300'}`}>
            <p className="text-sm font-black uppercase tracking-widest text-amber-500 dark:text-amber-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Fastest guessers
            </p>
            {revealTop.length === 0 ? (
              <p className="text-xs text-slate-500">Nobody cracked it this round!</p>
            ) : (
              <div className="space-y-1.5">
                {revealTop.map((s, i) => (
                  <div key={s.pin} className="flex items-center justify-between text-xs bg-slate-950/5 dark:bg-slate-950/40 rounded-xl px-3 py-2">
                    <span className="font-semibold">#{i + 1} {s.name}{s.pin === player?.pin ? ' (you)' : ''}</span>
                    <span className="font-mono font-bold text-amber-500 dark:text-amber-300">+{s.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isCorrect ? (
          /* Guessed-it lock (canvas stays visible) */
          <div className={`rounded-2xl border p-5 text-center ${isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'}`}>
            <PartyPopper className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-300 text-sm">You guessed it!</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Points banked. Keep watching the artist…
            </p>
          </div>
        ) : !canGuess ? (
          /* Word-picking intermission */
          <div className={`rounded-2xl border p-5 text-center ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'}`}>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-300">
              🎨 The artist is picking a word — get ready!
            </p>
          </div>
        ) : (
          /* Guess input */
          <form onSubmit={submitGuess} className="flex gap-2">
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              placeholder={remaining <= 0 ? 'Time is up…' : 'Type your guess…'}
              disabled={isSubmitting || remaining <= 0}
              maxLength={40}
              autoFocus
              className={`flex-1 p-3.5 rounded-xl border text-sm outline-none transition-all ${isDark
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm'
              }`}
            />
            <button
              type="submit"
              disabled={!guessInput.trim() || isSubmitting || !canGuess || remaining <= 0}
              className={`px-5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center ${guessInput.trim() && !isSubmitting && canGuess && remaining > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
              }`}
              title="Send guess"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        )}

        {/* Wrong-guess helper note */}
        {canGuess && !isCorrect && (
          <p className="text-center text-[11px] text-slate-400">
            Guess as many times as you like — first correct answer scores with the biggest speed bonus!
          </p>
        )}
      </main>

      <div className="text-center text-[11px] text-slate-400 pb-3">
        Samarambh 4.0 · Live Stage
      </div>
    </div>
  );
}
