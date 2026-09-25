import React, { useEffect, useRef } from 'react';
import useSkribblStrokes from '../hooks/useSkribblStrokes';

// Shared live canvas renderer for Skribbl viewers (projector + mobile).
// Pulls stroke segments from the Firestore feed via useSkribblStrokes and
// redraws on a rAF loop only when new data arrives (dirty-flag pattern).
// Background is forced opaque white — eraser works everywhere and the canvas
// never relies on transparency.
export default function SkribblCanvas({ roundId, className = '', showWatermark = true }) {
  const canvasRef = useRef(null);
  const strokes = useSkribblStrokes(roundId);
  const lastVersionRef = useRef(-1);

  useEffect(() => {
    let rafId;

    const drawFrame = () => {
      rafId = requestAnimationFrame(drawFrame);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const version = strokes.getVersion();
      if (version === lastVersionRef.current && !strokes.isDirty()) return;
      lastVersionRef.current = version;
      strokes.clearDirty();

      // Match backing store to displayed size for crisp lines (no CSS blur).
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const segments = strokes.getSegments();
      const lineScale = Math.max(targetW, targetH);

      for (const seg of segments) {
        const pts = seg.points || [];
        if (pts.length < 4) continue;
        const width = Math.max(1, seg.size * (lineScale / 900));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = seg.mode === 'erase' ? '#ffffff' : seg.color;

        if (pts.length === 4) {
          // Single dot (tap) — draw a zero-length round-cap line.
          ctx.beginPath();
          ctx.moveTo(pts[0] * canvas.width, pts[1] * canvas.height);
          ctx.lineTo(pts[2] * canvas.width, pts[3] * canvas.height);
          ctx.stroke();
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0] * canvas.width, pts[1] * canvas.height);
        for (let i = 2; i < pts.length - 1; i += 2) {
          ctx.lineTo(pts[i] * canvas.width, pts[i + 1] * canvas.height);
        }
        ctx.stroke();
      }

      if (showWatermark && segments.length === 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.round(canvas.width * 0.045);
        ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
        ctx.fillText('Waiting for the artist to draw...', canvas.width / 2, canvas.height / 2);
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [strokes, showWatermark]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block touch-none bg-white ${className}`}
    />
  );
}
