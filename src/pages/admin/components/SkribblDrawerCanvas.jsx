import React, { useRef, useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePoint, drawStroke, replayAllStrokes } from '../../../utils/canvasEngine';
import { Eraser, Pencil, Trash2 } from 'lucide-react';

const COLORS = ['#000000', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const SIZES = [2, 4, 8, 16];

export default function SkribblDrawerCanvas({ sessionId, existingStrokes = [], onClear }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(SIZES[1]);
  const [tool, setTool] = useState('pen');
  
  const currentStrokeRef = useRef(null);
  const strokeIndexRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    replayAllStrokes(ctx, existingStrokes, canvas.width, canvas.height);
    
    // Update local index based on history length to prevent index collisions
    if (existingStrokes.length > 0) {
       strokeIndexRef.current = Math.max(...existingStrokes.map(s => s.strokeIndex)) + 1;
    } else {
       strokeIndexRef.current = 0;
    }
  }, [existingStrokes]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    currentStrokeRef.current = {
      points: [normalizePoint(x, y, canvas.width, canvas.height)],
      color: tool === 'eraser' ? '#ffffff' : color,
      lineWidth,
      tool,
      strokeIndex: strokeIndexRef.current++
    };
  };

  const draw = (e) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoint = normalizePoint(x, y, canvas.width, canvas.height);
    currentStrokeRef.current.points.push(newPoint);

    drawStroke(ctx, currentStrokeRef.current, canvas.width, canvas.height);
  };

  const stopDrawing = async () => {
    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);

    const strokeData = { ...currentStrokeRef.current, timestamp: serverTimestamp() };
    currentStrokeRef.current = null;

    try {
      await addDoc(collection(db, 'events', 'samarambh', 'skribblSessions', sessionId, 'strokes'), strokeData);
    } catch (err) {
      console.error("Failed to save stroke", err);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex gap-2 border-r border-slate-700 pr-4">
          <button onClick={() => setTool('pen')} className={`p-2 rounded-lg ${tool === 'pen' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Pencil className="w-5 h-5" />
          </button>
          <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Eraser className="w-5 h-5" />
          </button>
        </div>

        {tool === 'pen' && (
          <div className="flex gap-2 border-r border-slate-700 pr-4">
            {COLORS.map(c => (
              <button 
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 border-r border-slate-700 pr-4 items-center">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setLineWidth(s)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${lineWidth === s ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            >
              <div className="bg-white rounded-full" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>

        <button 
          onClick={onClear}
          className="ml-auto flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors font-medium text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden aspect-video relative border-4 border-slate-800 touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerOut={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
}
