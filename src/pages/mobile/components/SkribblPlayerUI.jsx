import React, { useRef, useState, useEffect } from 'react';
import { useSkribbl, SkribblProvider } from '../../../context/SkribblContext';
import { replayAllStrokes } from '../../../utils/canvasEngine';
import Confetti from 'react-confetti';
import { Send, Clock } from 'lucide-react';

function SkribblPlayerInner({ player, gameState, questionTimer }) {
  const { session, strokes, guesses, submitGuess, hasGuessedCorrectly } = useSkribbl();
  const canvasRef = useRef(null);
  const [guessInput, setGuessInput] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(questionTimer);
  useEffect(() => {
    setTimeLeft(questionTimer);
  }, [questionTimer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !strokes) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    replayAllStrokes(ctx, strokes, canvas.width, canvas.height);
  }, [strokes]);

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (!guessInput.trim() || hasGuessedCorrectly) return;
    submitGuess(guessInput);
    setGuessInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      {hasGuessedCorrectly && <Confetti recycle={false} numberOfPieces={200} />}
      
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-950 shadow-sm z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase">Round {session?.roundNumber || 1}</p>
          <div className="text-lg font-mono font-bold tracking-[0.3em] text-slate-800 dark:text-slate-100">
            {session?.wordHint || '_ '.repeat(session?.wordLength || 0)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full font-bold">
          <Clock className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Canvas Viewer */}
      <div className="bg-white m-4 rounded-xl overflow-hidden aspect-video relative border-2 border-slate-200 dark:border-slate-800 shadow-sm pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Chat Feed */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4 flex flex-col-reverse">
        {guesses.map((g, i) => (
          <div key={g.id || i} className={`text-sm px-3 py-2 rounded-lg ${g.isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800' : 'bg-slate-200 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'}`}>
            <span className="font-semibold opacity-75">{g.playerName}: </span>
            {g.isCorrect ? '🎉 guessed the word!' : g.guess}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleGuessSubmit} className="flex gap-2">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            disabled={hasGuessedCorrectly || timeLeft === 0}
            placeholder={hasGuessedCorrectly ? "You guessed it!" : "Type your guess..."}
            className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-rose-500 disabled:opacity-50 transition-colors"
          />
          <button 
            type="submit" 
            disabled={hasGuessedCorrectly || !guessInput.trim() || timeLeft === 0}
            className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-5 py-3 shadow-sm disabled:opacity-50 transition-all flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SkribblPlayerUI(props) {
  return (
    <SkribblProvider sessionId={props.payload.sessionId} player={props.player}>
      <SkribblPlayerInner {...props} />
    </SkribblProvider>
  );
}
