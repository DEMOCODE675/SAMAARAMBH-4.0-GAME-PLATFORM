import React, { useRef, useEffect } from 'react';
import { useSkribbl, SkribblProvider } from '../../../context/SkribblContext';
import { replayAllStrokes } from '../../../utils/canvasEngine';
import { Palette, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function SkribblProjectorInner({ payload, activeQuestion }) {
  const { session, strokes, guesses } = useSkribbl();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !strokes) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    replayAllStrokes(ctx, strokes, canvas.width, canvas.height);
  }, [strokes]);

  return (
    <div className="w-full grow flex flex-col gap-6 min-h-[65vh]">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Palette className="w-8 h-8 text-rose-500" />
            Skribbl Draw
          </h2>
          <p className="text-rose-400 font-bold uppercase tracking-widest mt-1 text-sm">
            Watch & Guess the Word!
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Round {session?.roundNumber || 1}</p>
          <div className="text-4xl font-mono font-black text-emerald-400 tracking-[0.3em]">
            {session?.wordHint || '_ '.repeat(session?.wordLength || 0)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className="flex-3 bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border-4 border-slate-700/50 relative">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>

        <div className="flex-1 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 flex flex-col min-h-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            Live Guesses
          </h3>
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden flex flex-col-reverse space-y-reverse space-y-3 pb-2">
              <AnimatePresence>
                {guesses.slice(0, 15).map(g => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={g.id}
                    className={`px-4 py-3 rounded-2xl ${g.isCorrect ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300' : 'bg-white/5 border border-white/10 text-slate-300'}`}
                  >
                    <span className="font-bold opacity-75">{g.playerName}: </span>
                    {g.isCorrect ? '🎉 GUESSED THE WORD!' : g.guess}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SkribblProjectorView(props) {
  return (
    <SkribblProvider sessionId={props.payload.sessionId}>
      <SkribblProjectorInner {...props} />
    </SkribblProvider>
  );
}
