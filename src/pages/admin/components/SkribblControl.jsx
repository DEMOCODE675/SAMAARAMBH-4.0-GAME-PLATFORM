import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../../config/firebase';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  buildWordHint,
  computeRoundStandings,
  hashWord,
  hintLevelForElapsed,
  makeRoundId,
  renderHintString,
  skribblElapsedSeconds
} from '../../../utils/skribblEngine';
import { pickRandomWords } from '../../../data/skribblWords';
import SkribblDrawCanvas from './SkribblDrawCanvas';
import {
  Brush,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lightbulb,
  Loader,
  MessagesSquare,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  Users,
  Wand2,
  Pencil
} from 'lucide-react';

const EVENT = 'samarambh';
const EVENT_DOC = doc(db, 'events', EVENT);
const GUESSES_COL = collection(db, 'events', EVENT, 'skribblGuesses');
const WORD_KEY = 'techarena_skribbl_word'; // sessionStorage: survives operator refresh

export default function SkribblControl() {
  // Config
  const [roundCount, setRoundCount] = useState(4);
  const [roundSeconds, setRoundSeconds] = useState(75);
  const [customWord, setCustomWord] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [armedWord, setArmedWord] = useState('');

  // Lifecycle
  const [session, setSession] = useState(null);   // { roundIndex, totalRounds, phase }
  const [activeRound, setActiveRound] = useState(null); // mirrored from Firestore
  const [guesses, setGuesses] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  // 1s re-render ticker driving the derived timer/hint values below.
  const [, setNowTick] = useState(Date.now());

  // Local-only secret (never written to Firestore until reveal)
  const secretRef = useRef({ word: '', hash: '' });

  // ---------------------------------------------------------------
  // Firestore listeners
  // ---------------------------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(EVENT_DOC, (snap) => {
      const data = snap.data();
      if (data?.skribbl && data.activeQuestion) {
        setSession(data.skribbl);
        setActiveRound(data.activeQuestion);
      } else {
        // No skribbl state, or another operator action (e.g. Stop & Calculate)
        // cleared the active round — treat the session as over.
        setSession(null);
        setActiveRound(null);
      }
    }, (err) => console.warn('Skribbl session listener:', err.message));
    return () => unsub();
  }, []);

  useEffect(() => {
    const roundId = activeRound?.roundId;
    if (!roundId) {
      setGuesses([]);
      return;
    }
    const q = query(
      GUESSES_COL,
      where('roundId', '==', roundId),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setGuesses(rows);
    }, (err) => console.warn('Skribbl guesses listener:', err.message));
    return () => unsub();
  }, [activeRound?.roundId]);

  // Ticker for timer / hint logic
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Recover the armed word after an operator page refresh mid-round.
  useEffect(() => {
    const saved = sessionStorage.getItem(WORD_KEY);
    if (saved && !secretRef.current.word) {
      try {
        const parsed = JSON.parse(saved);
        secretRef.current = { word: parsed.word, hash: parsed.hash };
        setArmedWord(parsed.word || '');
      } catch { /* corrupt entry — ignore */ }
    }
  }, []);

  const roundGuesses = useMemo(
    () => guesses.filter((g) => g.roundId === activeRound?.roundId),
    [guesses, activeRound?.roundId]
  );
  const correctCount = roundGuesses.filter((g) => g.isCorrect).length;
  const standings = useMemo(() => computeRoundStandings(roundGuesses, 5), [roundGuesses]);

  const elapsed = activeRound?.startTime
    ? skribblElapsedSeconds(activeRound.startTime, activeRound.timeLimit)
    : 0;
  const remaining = activeRound ? Math.max(0, activeRound.timeLimit - elapsed) : 0;
  const hintLevel = activeRound ? hintLevelForElapsed(elapsed, activeRound.timeLimit) : 0;
  const isReveal = session?.phase === 'reveal';

  const flash = (msg, ms = 3000) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), ms);
  };

  // Fresh word suggestions whenever a round enters the choosing phase.
  useEffect(() => {
    if (session?.phase === 'choosing') {
      setSuggestions(pickRandomWords(3));
    }
  }, [session?.phase, session?.roundIndex]);

  const armWord = (word, roundId, roundIndex) => {
    const wordHash = hashWord(word);
    const hint = buildWordHint(word);
    secretRef.current = { word, hash: wordHash };
    setArmedWord(word);
    sessionStorage.setItem(WORD_KEY, JSON.stringify({ word, hash: wordHash }));
    return {
      id: roundId,
      type: 'skribbl',
      roundId,
      roundIndex,
      timeLimit: Number(roundSeconds) || 75,
      wordHash,
      hint: { display: hint.display, reveals: hint.reveals },
      hintLevel: 0,
      startTime: null,
      word: null // NEVER publish the word mid-round
    };
  };

  // ---------------------------------------------------------------
  // Round lifecycle
  // ---------------------------------------------------------------
  const startGame = async () => {
    setIsBusy(true);
    try {
      const roundId = makeRoundId();
      const word = customWord.trim() || suggestions[0] || pickRandomWords(1)[0];
      const activeQuestion = armWord(word, roundId, 1);

      await setDoc(EVENT_DOC, {
        status: 'playing',
        gameMode: 'solo',
        updatedAt: new Date(),
        skribbl: {
          roundIndex: 1,
          totalRounds: Number(roundCount) || 4,
          phase: 'choosing',
          wordLocked: false
        },
        activeQuestion
      }, { merge: true });

      setCustomWord('');
      flash('🎮 Skribbl armed — pick your word and start drawing!');
    } catch (err) {
      console.error(err);
      flash('❌ Failed to start Skribbl.');
    } finally {
      setIsBusy(false);
    }
  };

  const beginDrawing = async () => {
    setIsBusy(true);
    try {
      // If the admin selected/typed a different word than the auto-armed one,
      // re-arm the hash + hint so the broadcast always matches the drawing.
      const desired = customWord.trim();
      if (desired && desired !== secretRef.current.word) {
        const wordHash = hashWord(desired);
        const hint = buildWordHint(desired);
        secretRef.current = { word: desired, hash: wordHash };
        setArmedWord(desired);
        sessionStorage.setItem(WORD_KEY, JSON.stringify({ word: desired, hash: wordHash }));
        await updateDoc(EVENT_DOC, {
          'skribbl.phase': 'drawing',
          'activeQuestion.wordHash': wordHash,
          'activeQuestion.hint': { display: hint.display, reveals: hint.reveals },
          'activeQuestion.startTime': new Date(),
          'activeQuestion.hintLevel': 0,
          updatedAt: new Date()
        });
      } else {
        await updateDoc(EVENT_DOC, {
          'skribbl.phase': 'drawing',
          'activeQuestion.startTime': new Date(),
          'activeQuestion.hintLevel': 0,
          updatedAt: new Date()
        });
      }
      setCustomWord('');
      flash('🖌️ Drawing phase live — guessers, get typing!');
    } catch (err) {
      console.error(err);
      flash('❌ Failed to start drawing phase.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReveal = async (auto = false) => {
    if (isBusy || isReveal) return;
    setIsBusy(true);
    try {
      const top5 = computeRoundStandings(roundGuesses, 5);
      await updateDoc(EVENT_DOC, {
        'skribbl.phase': 'reveal',
        'activeQuestion.word': secretRef.current.word || '—',
        'activeQuestion.revealTop': top5,
        'activeQuestion.hintLevel': 3,
        updatedAt: new Date()
      });
      sessionStorage.removeItem(WORD_KEY);
      flash(auto ? '⏰ Time up — word revealed!' : '🏁 Round revealed!');
    } catch (err) {
      console.error(err);
      flash('❌ Failed to reveal round.');
    } finally {
      setIsBusy(false);
    }
  };

  const nextRound = async () => {
    if (isBusy) return;
    const nextIndex = (session?.roundIndex || 1) + 1;
    if (nextIndex > (session?.totalRounds || 1)) {
      await endGame();
      return;
    }
    setIsBusy(true);
    try {
      const roundId = makeRoundId();
      const word = customWord.trim() || pickRandomWords(1)[0];
      await updateDoc(EVENT_DOC, {
        'skribbl.roundIndex': nextIndex,
        'skribbl.phase': 'choosing',
        activeQuestion: armWord(word, roundId, nextIndex),
        updatedAt: new Date()
      });
      setCustomWord('');
      setSuggestions(pickRandomWords(3));
      flash(`🎯 Round ${nextIndex} armed!`);
    } catch (err) {
      console.error(err);
      flash('❌ Failed to arm next round.');
    } finally {
      setIsBusy(false);
    }
  };

  const endGame = async () => {
    setIsBusy(true);
    try {
      await setDoc(EVENT_DOC, {
        status: 'leaderboard',
        gameMode: 'solo',
        skribbl: null,
        activeQuestion: null,
        updatedAt: new Date()
      }, { merge: true });
      sessionStorage.removeItem(WORD_KEY);
      setArmedWord('');
      flash('🏆 Skribbl complete — leaderboard is live!');
    } catch (err) {
      console.error(err);
      flash('❌ Failed to end Skribbl.');
    } finally {
      setIsBusy(false);
    }
  };

  // Auto transition to reveal when the clock hits zero (admin is the referee).
  // isBusy is a dep so a transition blocked mid-write retries once it clears.
  useEffect(() => {
    if (session?.phase === 'drawing' && remaining <= 0 && !isBusy) {
      handleReveal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, session?.phase, isBusy]);

  // ---------------------------------------------------------------
  // Derived UI
  // ---------------------------------------------------------------
  const phase = session?.phase || null;
  const isChoosing = phase === 'choosing';
  const isDrawingPhase = phase === 'drawing';
  const maskedPreview = activeRound?.hint
    ? renderHintString(activeRound.hint.display, activeRound.hint.reveals, hintLevel)
    : '';

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="text-xs font-semibold px-4 py-2.5 rounded-xl border bg-indigo-950/60 border-indigo-800/80 text-indigo-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ==================== CONFIG (idle) ==================== */}
      {!phase && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-5">
          <div className="flex items-center gap-2 text-indigo-300">
            <Settings2 className="w-4 h-4" />
            <h3 className="font-bold uppercase tracking-wider text-xs">Skribbl Setup</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Rounds</label>
              <input
                type="number" min="1" max="12" value={roundCount}
                onChange={(e) => setRoundCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-200 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Seconds / Round</label>
              <input
                type="number" min="30" max="180" value={roundSeconds}
                onChange={(e) => setRoundSeconds(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-200 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-slate-500 leading-relaxed">
                200 players guess on their phones while you draw here. Scores use the platform's
                1000 + speed-bonus formula and flow straight into the stage leaderboard.
              </p>
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={isBusy}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-2xl uppercase tracking-wider text-xs shadow-lg shadow-indigo-950/60 transition-all active:scale-95 flex items-center gap-2"
          >
            {isBusy ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Arm Round 1</span>
          </button>
        </div>
      )}

      {/* ==================== ACTIVE SESSION ==================== */}
      {phase && activeRound && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: canvas & phase controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Round {session.roundIndex}/{session.totalRounds}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                  isDrawingPhase ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isReveal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                }`}>
                  {isChoosing ? 'Choose Word' : isDrawingPhase ? 'Live Drawing' : 'Revealed'}
                </span>
                {isDrawingPhase && (
                  <span className="text-xs font-mono text-slate-400">
                    ⏱ {Math.ceil(remaining)}s · hint L{hintLevel}
                  </span>
                )}
                {isDrawingPhase && (armedWord || secretRef.current.word) && (
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <Pencil className="w-3.5 h-3.5 text-emerald-400" /> Word: <span className="underline decoration-emerald-400 font-extrabold tracking-wider text-white uppercase">{armedWord || secretRef.current.word}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isDrawingPhase && (
                  <button onClick={() => handleReveal(false)} disabled={isBusy}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl uppercase text-xs tracking-wider flex items-center gap-2 disabled:opacity-50">
                    <Eye className="w-4 h-4" /> End Round
                  </button>
                )}
                {isReveal && (
                  <button onClick={nextRound} disabled={isBusy}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl uppercase text-xs tracking-wider flex items-center gap-2 disabled:opacity-50">
                    {session.roundIndex >= session.totalRounds ? <Trophy className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {session.roundIndex >= session.totalRounds ? 'Finish Game' : 'Next Round'}
                  </button>
                )}
                <button onClick={endGame} disabled={isBusy}
                  className="bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-300 font-bold px-4 py-2 rounded-xl uppercase text-xs">
                  End Game
                </button>
              </div>
            </div>

            {/* Word chooser (choosing phase) */}
            {isChoosing && (
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-amber-400" /> Pick a word to draw
                  </h3>
                  <button
                    onClick={() => setSuggestions(pickRandomWords(3))}
                    className="text-xs bg-slate-950 border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reroll
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((w) => (
                    <button key={w}
                      onClick={() => setCustomWord(w)}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                        customWord === w
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-950 border-slate-700 hover:border-indigo-400 text-slate-200'
                      }`}>
                      {w}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customWord} onChange={(e) => setCustomWord(e.target.value)}
                    placeholder="...or type a custom word"
                    className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-100 text-sm outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={beginDrawing}
                    disabled={isBusy || !customWord.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl uppercase text-xs tracking-wider flex items-center gap-2">
                    <Brush className="w-4 h-4" /> Draw This
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  The word is hashed on this device and never broadcast until reveal — players only
                  see a masked hint ({maskedPreview || 'e.g. _ _ _ _'}) and your drawing.
                </p>
              </div>
            )}

            {/* Drawing canvas (drawing phase) */}
            {isDrawingPhase && (
              <div className="h-[520px]">
                <SkribblDrawCanvas roundId={activeRound.roundId} active={isDrawingPhase} />
              </div>
            )}

            {/* Reveal panel */}
            {isReveal && (
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/60 border border-amber-500/40 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-amber-300 font-black uppercase tracking-widest text-sm">The word was</h3>
                </div>
                <p className="text-4xl font-black text-white tracking-wide">{activeRound.word}</p>
                {standings.length === 0 && (
                  <p className="text-xs text-slate-400">Nobody cracked it this round — the drawing lives on!</p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: guess feed & standings */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <MessagesSquare className="w-4 h-4 text-cyan-400" /> Live Guesses
                </h3>
                <span className="text-xs font-mono text-slate-400">{roundGuesses.length} total</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {correctCount} correct
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Users className="w-3.5 h-3.5" /> {new Set(roundGuesses.map((g) => g.pin)).size} players
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {roundGuesses.length === 0 && (
                  <p className="text-slate-500 text-xs py-6 text-center">No guesses yet...</p>
                )}
                {[...roundGuesses].reverse().map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-xs bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2">
                    <span className="font-bold text-slate-200 truncate flex-1">{g.name}</span>
                    <span className={`truncate max-w-[45%] ${g.isCorrect ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {g.isCorrect ? '✓ guessed it!' : g.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isReveal && standings.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-2.5">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Round Top 5
                </h3>
                {standings.map((s, i) => (
                  <div key={s.pin} className="flex items-center justify-between text-xs bg-slate-950/70 rounded-xl px-3 py-2">
                    <span className="text-slate-200 font-semibold">#{i + 1} {s.name}</span>
                    <span className="font-mono font-bold text-amber-400">+{s.points}</span>
                  </div>
                ))}
              </div>
            )}

            {isDrawingPhase && (
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-2">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" /> Players see
                </h3>
                <p className="font-mono text-lg text-amber-300 tracking-[0.2em]">{maskedPreview}</p>
                <p className="text-[11px] text-slate-500">Hints auto-reveal at 38% and 65% of the round.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
