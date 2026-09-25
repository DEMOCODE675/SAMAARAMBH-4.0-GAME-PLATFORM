import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../../config/firebase';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  hintLevelForElapsed,
  renderHintString,
  skribblElapsedSeconds
} from '../../../utils/skribblEngine';
import SkribblCanvas from '../../../components/SkribblCanvas';
import GlassAvatar from '../../../components/GlassAvatar';
import {
  Brush,
  CheckCircle2,
  Clock,
  Lightbulb,
  MessagesSquare,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react';

// One listener for the projector's guess feed. Single-field `where` query —
// no composite index. Client-side cap keeps the feed bounded during a round.
const GUESSES_COL = collection(db, 'events', 'samarambh', 'skribblGuesses');

// When `embedded`, the stage fills its parent (ProjectorView <main>) instead of
// the full viewport, so the projector keeps its single-page chrome.
export default function SkribblStage({ activeQ, gameState, playerCount, embedded = false }) {
  const timeLimit = activeQ?.timeLimit || 75;
  const phase = gameState?.skribbl?.phase || 'drawing';

  const [guesses, setGuesses] = useState([]);
  // Initial value is never read; the interval below drives re-renders.
  const [, setNowTick] = useState(0);

  // 1s ticker for the derived timer.
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Live guess feed (bounded to the current round).
  useEffect(() => {
    if (!activeQ?.roundId) return undefined;
    const q = query(
      GUESSES_COL,
      where('roundId', '==', activeQ.roundId),
      limit(150)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      // Newest first; correct guesses render masked.
      rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setGuesses(rows);
    }, (err) => console.warn('Projector guess feed error:', err.message));
    return () => unsub();
  }, [activeQ?.roundId]);

  const elapsed = activeQ?.startTime
    ? skribblElapsedSeconds(activeQ.startTime, timeLimit)
    : 0;
  const remaining = Math.max(0, timeLimit - elapsed);
  const hintLevel = hintLevelForElapsed(elapsed, timeLimit);
  const hintString = activeQ?.hint
    ? renderHintString(activeQ.hint.display, activeQ.hint.reveals, hintLevel)
    : '';
  const correctCount = useMemo(() => guesses.filter((g) => g.isCorrect).length, [guesses]);
  const isReveal = phase === 'reveal';
  const revealTop = activeQ?.revealTop || [];

  return (
    <div className={`${
      embedded
        ? 'w-full h-full flex flex-col'
        : 'min-h-screen flex flex-col p-6 md:p-10'
    } bg-[#070b14] text-white relative overflow-hidden select-none font-sans`}>
      {/* Top header bar */}
      <header className="flex justify-between items-center border-b border-white/15 pb-5 z-10">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
          <div className="flex flex-col">
            <span className="text-sm font-extrabold uppercase tracking-wider text-rose-400">Live Drawing Challenge</span>
            <span className="text-xs text-slate-400">
              Round {activeQ?.roundIndex || '·'} · Type your guess on your phone!
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-bold font-mono">
            <Users className="w-4 h-4" />
            <span>{playerCount || 0} Players</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>{correctCount} Guessed</span>
          </div>
          <div className={`px-6 py-2.5 rounded-2xl border-2 text-2xl md:text-3xl font-black font-mono flex items-center gap-2.5 ${
            remaining <= 5
              ? 'border-rose-500 text-rose-400 bg-rose-950/60 animate-bounce'
              : remaining <= 10
                ? 'border-amber-400 text-amber-300 bg-amber-950/40'
                : 'border-indigo-400 text-indigo-300 bg-indigo-950/40'
          }`}>
            <Clock className="w-6 h-6" />
            <span>{isReveal ? '0' : Math.ceil(remaining)}s</span>
          </div>
        </div>
      </header>

      {/* Main stage area */}
      <main className="flex-grow flex items-center justify-center gap-6 py-6 z-10 min-h-0">
        {/* Canvas column */}
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-[2] min-w-0 h-full max-h-[70vh] rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.25)] bg-white"
        >
          <SkribblCanvas roundId={activeQ?.roundId} showWatermark />
        </motion.div>

        {/* Side column */}
        <div className="flex-1 min-w-0 max-w-sm h-full max-h-[70vh] flex flex-col gap-4">
          {/* Word hint / reveal */}
          {isReveal ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-amber-950/60 via-slate-900/80 to-slate-900/80 border-2 border-amber-500/50 rounded-3xl p-6 text-center shadow-[0_0_45px_rgba(245,158,11,0.3)]"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>The word was</span>
              </div>
              <p className="text-4xl md:text-5xl font-black text-white tracking-wide break-words">
                {activeQ?.word || '—'}
              </p>
            </motion.div>
          ) : (
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Guess the word</span>
              </div>
              <p className="font-mono text-2xl md:text-3xl tracking-[0.25em] text-amber-300 break-words">
                {hintString || '_ _ _'}
              </p>
            </div>
          )}

          {/* Reveal podium */}
          {isReveal && (
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-2.5 overflow-y-auto"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Fastest guessers
              </h3>
              {revealTop.length === 0 ? (
                <p className="text-sm text-slate-400">Nobody cracked it this round!</p>
              ) : (
                revealTop.map((s, i) => (
                  <div
                    key={s.pin}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border ${
                      i === 0
                        ? 'bg-amber-500/15 border-amber-500/40'
                        : 'bg-slate-950/60 border-white/10'
                    }`}
                  >
                    <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${
                      i === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {i + 1}
                    </span>
                    <GlassAvatar name={s.name} seed={s.pin} size="sm" />
                    <span className="flex-1 truncate font-bold text-white">{s.name}</span>
                    <span className="font-mono font-black text-amber-400">+{s.points}</span>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* Live guess feed */}
          {!isReveal && (
            <div className="flex-1 min-h-0 bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2 mb-3">
                <MessagesSquare className="w-4 h-4" /> Guess feed
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {guesses.length === 0 ? (
                  <p className="text-slate-500 text-xs py-6 text-center">Waiting for guesses…</p>
                ) : (
                  guesses.slice(0, 24).map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 border ${
                        g.isCorrect
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/60 border-white/10 text-slate-300'
                      }`}
                    >
                      <span className="font-bold truncate">{g.name}</span>
                      <span className={`ml-auto truncate max-w-[50%] ${g.isCorrect ? 'font-black' : 'text-slate-400'}`}>
                        {g.isCorrect ? '✓ guessed it!' : g.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/15 pt-4 z-10 flex items-center justify-between text-xs md:text-sm text-slate-300 font-semibold uppercase tracking-wider">
        <span className="flex items-center gap-2">
          <Brush className="w-4 h-4 text-amber-400" />
          Samarambh 4.0 · Skribbl Live
        </span>
        <p>
          {isReveal
            ? 'Round complete — scores banked!'
            : remaining <= 0
              ? 'Time expired — revealing the word…'
              : !activeQ?.startTime
                ? 'The artist is picking a word — get ready!'
                : 'Grab your phone and guess the word!'}
        </p>
        <span className="text-slate-400 text-xs font-mono hidden md:block">Round {activeQ?.roundIndex || '·'} of {gameState?.skribbl?.totalRounds || '·'}</span>
      </footer>
    </div>
  );
}
