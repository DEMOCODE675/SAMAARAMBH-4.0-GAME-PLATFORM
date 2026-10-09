import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../../config/firebase';
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { saveToOfflineQueue, flushOfflineQueue, submitAnswerRecord } from '../../../utils/offlineSync';
import {
  computeSkribblScore,
  hintLevelForElapsed,
  renderHintString,
  skribblElapsedSeconds,
  verifyGuess
} from '../../../utils/skribblEngine';
import SkribblCanvas from '../../../components/SkribblCanvas';
import { 
  Clock, 
  Lock, 
  Send, 
  Trophy, 
  AlertCircle 
} from 'lucide-react';

const EVENT = 'samarambh';

// Skribbl guesser view. Scale design (400+ concurrent players):
// - NO listener besides the shared GameContext one: hint/phase/reveal all come
//   from the event doc the player is already streaming.
// - Correct-guess state is cached in localStorage so a refresh keeps the
//   "guessed it" lock without re-querying anything.
// - Synchronized countdown interval matches the standard Quiz/Terminal experience.
// - Response locked state renders the signature TechArena radar lock card.
export default function SkribblUI({ player, gameState, questionTimer: _parentTimer, setHasSubmitted: setParentSubmitted }) {
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wrongGuess, setWrongGuess] = useState(null);
  const wrongGuessTimerRef = useRef(null);
  const inputRef = useRef(null);

  const activeQ = gameState?.activeQuestion;
  const roundId = activeQ?.roundId;
  const timeLimit = activeQ?.timeLimit || 75;
  const phase = gameState?.skribbl?.phase || 'drawing';

  const isDarkMode = false;

  // Synchronized countdown timer matching QuizUI / TerminalUI
  const [questionTimer, setQuestionTimer] = useState(timeLimit);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeQ?.startTime) {
      setQuestionTimer(timeLimit);
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const el = skribblElapsedSeconds(activeQ.startTime, timeLimit);
      const rem = Math.max(0, Math.ceil(timeLimit - el));
      setElapsedSeconds(el);
      setQuestionTimer(rem);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeQ?.startTime, timeLimit]);

  // Restore the "already guessed correctly" lock for THIS round after refresh.
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

  // Cleanup wrong guess timer on unmount
  useEffect(() => {
    return () => {
      if (wrongGuessTimerRef.current) clearTimeout(wrongGuessTimerRef.current);
    };
  }, []);

  const hintLevel = useMemo(
    () => hintLevelForElapsed(elapsedSeconds, timeLimit),
    [elapsedSeconds, timeLimit]
  );
  const hintString = activeQ?.hint
    ? renderHintString(activeQ.hint.display, activeQ.hint.reveals, hintLevel)
    : '';
  const canGuess = phase === 'drawing' && !!activeQ?.startTime;

  // Auto-focus the input bar when drawing begins
  useEffect(() => {
    if (canGuess && !isCorrect) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [canGuess, isCorrect]);

  const submitGuess = async (e) => {
    e.preventDefault();
    const text = guessInput.trim();
    // Guessing is only valid once the drawing clock is live — this blocks early
    // submissions during the word-picking phase from farming max speed bonuses.
    if (!text || isSubmitting || isCorrect || !canGuess || questionTimer <= 0) return;
    setIsSubmitting(true);

    const correct = verifyGuess(text, activeQ?.wordHash);
    const timeTaken = elapsedSeconds;
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

    if (correct) {
      setIsCorrect(true);
      setWrongGuess(null);
      const answerData = {
        questionId: roundId,
        questionType: 'skribbl',
        questionText: `🎨 Skribbl Round ${activeQ?.roundIndex || '1'}: Word Drawing`,
        submittedAnswer: text,
        answer: text,
        isCorrect: true,
        pointsAwarded,
        timeTaken: Number(timeTaken.toFixed(1)),
        createdAt: Date.now(),
        timestamp: Date.now()
      };
      try {
        localStorage.setItem(`skribbl_correct_${player.pin}_${roundId}`, '1');
        localStorage.setItem(`answer_${player.pin}_${roundId}`, JSON.stringify(answerData));
        localStorage.setItem(`latest_answer_${player.pin}`, JSON.stringify(answerData));
        localStorage.setItem(`submitted_${player.pin}_${roundId}`, 'true');
      } catch { /* storage full — non-fatal */ }
      if (setParentSubmitted) setParentSubmitted(true);

      // Record answer in answers collection for round review parity
      submitAnswerRecord({
        pin: player.pin,
        playerPin: player.pin,
        name: player.name,
        playerName: player.name,
        teamCode: player.teamCode || null,
        gameMode: gameState?.gameMode || 'solo',
        questionId: roundId,
        questionType: 'skribbl',
        questionText: `🎨 Skribbl Round ${activeQ?.roundIndex || '1'}: Word Drawing`,
        submittedAnswer: text,
        answer: text,
        isCorrect: true,
        pointsAwarded,
        clientAwarded: true,
        timeTaken: Number(timeTaken.toFixed(1)),
        createdAtMs: Date.now()
      }).catch(e => console.warn("Skribbl review answer save error:", e));
    } else {
      // Show small wrong guess badge with auto-dismiss
      setWrongGuess({ text, id: Date.now() });
      if (wrongGuessTimerRef.current) clearTimeout(wrongGuessTimerRef.current);
      wrongGuessTimerRef.current = setTimeout(() => {
        setWrongGuess(null);
      }, 2500);
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
    if (navigator.vibrate) navigator.vibrate(correct ? [60, 40, 60] : 40);

    try {
      await addDoc(collection(db, 'events', EVENT, 'skribblGuesses'), guessRecord);
    } catch (err) {
      console.warn('Guess upload deferred to offline buffer:', err.message);
      saveToOfflineQueue(guessRecord);
    } finally {
      setIsSubmitting(false);
      setGuessInput('');
      // Seamlessly keep text bar pointing cursor active without closing mobile keyboard
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
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
      <div className={`min-h-screen flex items-center justify-center p-6 text-center transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0b0f19] text-slate-300' : 'bg-slate-50 text-slate-700'
      }`}>
        <p className="text-sm">Waiting for the artist to prepare the next round…</p>
      </div>
    );
  }

  const isTimeCritical = questionTimer <= 5;
  const isTimeWarning = questionTimer <= 10 && questionTimer > 5;
  const timePercentage = Math.max(0, Math.min(100, (questionTimer / timeLimit) * 100));
  const revealTop = activeQ?.revealTop || [];

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Section */}
      <div>
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
                alt="MLSAMIET"
                className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight">
                    MLSA<span className="text-indigo-600 dark:text-indigo-400">MIET</span>
                  </span>
                 {/* <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Live
                  </span> */}
                </div>
                {/*<p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {gameState?.gameMode === 'team' ? 'Squad Mode' : 'Solo Arena'}
                </p>*/}
              </div>
            </div>

            {/* Timer Badge */}
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

            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="max-w-md w-full mx-auto px-4 py-4 space-y-3">
          {/* Live Canvas */}
          <div className="rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-md bg-white aspect-[4/3]">
            <SkribblCanvas roundId={roundId} showWatermark={false} />
          </div>

          {/* Word Hint */}
          <div className={`rounded-2xl border p-3 text-center transition-all ${
            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Guess the word</p>
            <p className="font-mono text-xl tracking-[0.25em] text-amber-500 dark:text-amber-300 break-words font-black">
              {phase === 'reveal' ? (activeQ?.word || '—') : hintString}
            </p>
          </div>

          {/* Phase: Reveal */}
          {phase === 'reveal' ? (
            <div className={`rounded-2xl border p-5 ${
              isDarkMode ? 'bg-amber-950/30 border-amber-500/40' : 'bg-amber-50 border-amber-300'
            }`}>
              <p className="text-sm font-black uppercase tracking-widest text-amber-500 dark:text-amber-300 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Fastest guessers
              </p>
              {revealTop.length === 0 ? (
                <p className="text-xs text-slate-500">Nobody cracked it this round!</p>
              ) : (
                <div className="space-y-1.5">
                  {revealTop.map((s, i) => (
                    <div
                      key={s.pin}
                      className="flex items-center justify-between text-xs bg-slate-950/5 dark:bg-slate-950/40 rounded-xl px-3 py-2"
                    >
                      <span className="font-semibold">
                        #{i + 1} {s.name}{s.pin === player?.pin ? ' (you)' : ''}
                      </span>
                      <span className="font-mono font-bold text-amber-500 dark:text-amber-300">
                        +{s.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isCorrect ? (
            /* Signature Response Locked Card matching QuizUI/TerminalUI */
            <div className={`p-5 rounded-2xl border text-center transition-all ${
              isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              {/* Concentric Radar Pulse Ring */}
              <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                <div className="absolute -inset-2.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-md" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 border-r-indigo-500 animate-spin"
                  style={{ animationDuration: '2s' }}
                />
                <div
                  className="absolute inset-1.5 rounded-full border border-dashed border-indigo-400/30 dark:border-indigo-300/25 animate-spin"
                  style={{ animationDuration: '5s', animationDirection: 'reverse' }}
                />
                <div
                  className="absolute -inset-1.5 rounded-full border border-indigo-500/20 animate-ping opacity-25"
                  style={{ animationDuration: '2.6s' }}
                />
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/15">
                  <Lock className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              <h2 className="text-lg font-bold tracking-tight mb-1 text-slate-900 dark:text-white">
                Response Locked
              </h2>
              <p className={`text-xs mb-3 max-w-xs mx-auto leading-relaxed ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Your guess has been secured. Points banked! Keep watching the artist complete the sketch.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span>Live · Round in Progress</span>
              </div>
            </div>
          ) : !canGuess ? (
            /* Word-picking intermission */
            <div className={`rounded-2xl border p-5 text-center ${
              isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-300">
                🎨 The artist is picking a word — get ready!
              </p>
            </div>
          ) : (
            /* Guess input form & Wrong Guess inline feedback */
            <div className="space-y-2">
              {/* Small wrong guess feedback alert */}
              {wrongGuess && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Wrong guess: <span className="font-bold underline decoration-rose-400/50">"{wrongGuess.text}"</span> — try again!
                  </span>
                </div>
              )}

              <form onSubmit={submitGuess} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={guessInput}
                  onChange={(e) => {
                    setGuessInput(e.target.value);
                    if (wrongGuess) setWrongGuess(null);
                  }}
                  placeholder={questionTimer <= 0 ? 'Time is up…' : 'Type your guess…'}
                  disabled={questionTimer <= 0 || isCorrect}
                  maxLength={40}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className={`flex-1 p-3.5 rounded-xl border text-sm outline-none transition-all ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm'
                  }`}
                />
                <button
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!guessInput.trim() || isSubmitting || !canGuess || questionTimer <= 0}
                  className={`px-5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center ${
                    guessInput.trim() && !isSubmitting && canGuess && questionTimer > 0
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
                  }`}
                  title="Send guess"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>

              {/* Helper text */}
              <p className="text-center text-[11px] text-slate-400">
                Guess as many times as you like — first correct answer scores with the biggest speed bonus!
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Footer Branding matching the other views */}
      <footer className="text-center text-[11px] text-slate-400 py-3">
        <span className="font-semibold text-slate-300">MLSA miet</span> © 2026 All Rights Reserved
      </footer>
    </div>
  );
}
