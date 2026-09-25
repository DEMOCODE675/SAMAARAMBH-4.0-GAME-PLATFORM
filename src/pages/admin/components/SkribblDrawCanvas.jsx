import React, { useEffect, useRef, useState } from 'react';
import { db } from '../../../config/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { encodePoints, ensureSegmentPoints, makeStrokeId } from '../../../utils/skribblEngine';
import { Eraser, Palette, Undo2, Trash2, Pencil } from 'lucide-react';

const PALETTE = [
  '#111827', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#78350f'
];
const SIZES = [3, 6, 12, 22];

// Admin-side interactive canvas. Captures pointer strokes, draws them instantly
// for the operator, and ships quantized point batches to Firestore every ~300ms
// (append-only docs — no hot-document contention, scales to 200+ viewers).
// seq is seeded from Date.now() so ordering survives an operator page refresh.
export default function SkribblDrawCanvas({ roundId, active = true }) {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(6);
  const [mode, setMode] = useState('draw'); // 'draw' | 'erase'

  const localSegmentsRef = useRef([]); // mirrors what viewers render
  const strokeOrderRef = useRef([]);   // strokeIds in creation order (for undo)
  const currentRef = useRef(null);     // in-progress stroke { strokeId, mode, color, size, points }
  const dirtyRef = useRef(true);
  const seqRef = useRef(Date.now());
  const flushTimerRef = useRef(null);

  // ------------------------------------------------------------------
  // Persistence: append one ops doc per flush window
  // ------------------------------------------------------------------
  const flushStroke = (final = false) => {
    const cur = currentRef.current;
    if (!cur || cur.points.length < 2) {
      if (final) currentRef.current = null;
      return;
    }
    if (!final && cur.points.length < 8) return; // wait for more data mid-stroke

    const points = ensureSegmentPoints(encodePoints(cur.points.slice()));
    const op = { m: cur.mode === 'erase' ? 'e' : 'd', c: cur.color, s: cur.size, p: points };

    localSegmentsRef.current.push({
      strokeId: cur.strokeId,
      mode: cur.mode,
      color: cur.color,
      size: cur.size,
      points
    });
    dirtyRef.current = true;

    setDocAsync(op, cur.strokeId);
    // Keep the stroke open for further mid-stroke flushes; null it on pointer-up.
    if (final) currentRef.current = null;
  };

  const setDocAsync = (op, strokeId) => {
    const seq = ++seqRef.current;
    addDoc(collection(db, 'events', 'samarambh', 'skribblStrokes'), {
      kind: 'ops',
      roundId,
      seq,
      strokeId,
      ops: [op],
      createdAtMs: Date.now()
    }).catch((err) => console.warn('Stroke upload failed:', err.message));
  };

  const startFlushTimer = () => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setInterval(() => {
      if (currentRef.current) flushStroke(false);
    }, 300);
  };

  useEffect(() => {
    startFlushTimer();
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  // ------------------------------------------------------------------
  // Pointer capture
  // ------------------------------------------------------------------
  const getNormPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    };
  };

  const handlePointerDown = (e) => {
    if (!active || !roundId) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const pt = getNormPoint(e);
    currentRef.current = {
      strokeId: makeStrokeId(),
      mode,
      color: mode === 'erase' ? '#ffffff' : color,
      size: mode === 'erase' ? size * 3 : size,
      points: [pt, pt] // duplicate so taps render a dot
    };
  };

  const handlePointerMove = (e) => {
    const cur = currentRef.current;
    if (!cur) return;
    e.preventDefault();
    const pt = getNormPoint(e);
    const pts = cur.points;
    const last = pts[pts.length - 1];
    // Distance filter keeps payloads small on jittery touch input.
    if (Math.abs(pt.x - last.x) + Math.abs(pt.y - last.y) < 0.004) return;
    pts.push(pt);
    dirtyRef.current = true;
  };

  const handlePointerUp = () => {
    const cur = currentRef.current;
    if (!cur) return;
    // Register the finished stroke BEFORE flushing so Undo can target it.
    strokeOrderRef.current.push(cur.strokeId);
    flushStroke(true);
  };

  // ------------------------------------------------------------------
  // Undo & clear (control docs replayed by every viewer)
  // ------------------------------------------------------------------
  const pushControlDoc = (payload) => {
    const seq = ++seqRef.current;
    addDoc(collection(db, 'events', 'samarambh', 'skribblStrokes'), {
      roundId,
      seq,
      createdAtMs: Date.now(),
      ...payload
    }).catch((err) => console.warn('Skribbl control op failed:', err.message));
  };

  const handleUndo = () => {
    const lastStrokeId = strokeOrderRef.current.pop();
    if (!lastStrokeId) return;
    localSegmentsRef.current = localSegmentsRef.current.filter(
      (seg) => seg.strokeId !== lastStrokeId
    );
    dirtyRef.current = true;
    pushControlDoc({ kind: 'undo', strokeId: lastStrokeId });
  };

  const handleClear = () => {
    strokeOrderRef.current = [];
    localSegmentsRef.current = [];
    dirtyRef.current = true;
    pushControlDoc({ kind: 'clear' });
  };

  // ------------------------------------------------------------------
  // Render loop (operator's own mirror — instant local feedback)
  // ------------------------------------------------------------------
  useEffect(() => {
    let rafId;
    const drawFrame = () => {
      rafId = requestAnimationFrame(drawFrame);
      const canvas = canvasRef.current;
      if (!canvas || !dirtyRef.current) return;
      dirtyRef.current = false;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(rect.width * dpr);
      const H = Math.round(rect.height * dpr);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      const scale = Math.max(W, H);
      const drawSeg = (seg) => {
        const pts = seg.points || [];
        if (pts.length < 4) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1, seg.size * (scale / 900));
        ctx.strokeStyle = seg.mode === 'erase' ? '#ffffff' : seg.color;
        ctx.beginPath();
        ctx.moveTo(pts[0] * W, pts[1] * H);
        if (pts.length === 4) {
          ctx.lineTo(pts[2] * W, pts[3] * H);
        } else {
          for (let i = 2; i < pts.length - 1; i += 2) {
            ctx.lineTo(pts[i] * W, pts[i + 1] * H);
          }
        }
        ctx.stroke();
      };

      localSegmentsRef.current.forEach(drawSeg);
      const cur = currentRef.current;
      if (cur) {
        drawSeg({
          strokeId: cur.strokeId,
          mode: cur.mode,
          color: cur.color,
          size: cur.size,
          points: ensureSegmentPoints(encodePoints(cur.points))
        });
      }
    };
    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-2">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`p-2 rounded-xl border transition-colors ${mode === 'draw' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
          title="Draw"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode('erase')}
          className={`p-2 rounded-xl border transition-colors ${mode === 'erase' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setMode('draw'); }}
              className={`w-6 h-6 rounded-lg border-2 transition-transform ${color === c && mode === 'draw' ? 'scale-110 border-white' : 'border-slate-700 hover:scale-105'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${size === s ? 'bg-slate-800 border-indigo-400' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
              title={`${s}px brush`}
            >
              <span
                className="rounded-full bg-slate-200 block"
                style={{ width: Math.min(s, 16), height: Math.min(s, 16) }}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!active}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold hover:border-slate-600 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!active}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-bold hover:border-rose-500 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas surface */}
      <div className="relative flex-1 min-h-[320px] rounded-2xl overflow-hidden border-2 border-slate-700 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className={`w-full h-full block touch-none ${active ? 'cursor-crosshair' : 'cursor-not-allowed opacity-70'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-slate-300 text-sm font-bold uppercase tracking-wider">
              <Palette className="w-4 h-4" />
              <span>{roundId ? 'Round not active' : 'Start a round to draw'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
