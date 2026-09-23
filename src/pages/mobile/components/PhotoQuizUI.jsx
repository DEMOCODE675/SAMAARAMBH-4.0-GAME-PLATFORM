import React, { useState, useEffect } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { GameContext } from '../../../context/GameContext';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function PhotoQuizUI({ player, gameState, setHasSubmitted }) {
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeImageZoom, setActiveImageZoom] = useState(null);
  
  const payload = gameState?.activeQuestion?.payload || {};
  const questionId = gameState?.activeQuestion?.id;

  // 🛡️ REFRESH BUG FIX
  useEffect(() => {
    try {
      const localKey = `submitted_${player.pin}_${questionId}`;
      if (localStorage.getItem(localKey) === 'true') {
        setHasSubmitted(true);
      }
    } catch (err) {
      console.error("Error checking submission cache:", err);
    }
  }, [questionId, player.pin, setHasSubmitted]);

  // ⏱️ Synchronized 5s Setup Countdown + Question Timer
  const [setupCountdown, setSetupCountdown] = useState(5);
  const [questionTimer, setQuestionTimer] = useState(gameState?.activeQuestion?.timeLimit || 20);

  useEffect(() => {
    if (!gameState?.updatedAt) return;
    const timeLimit = gameState.activeQuestion?.timeLimit || 20;
    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();

    const updateTimers = () => {
      const elapsedSeconds = Math.floor((Date.now() - updatedAtMs) / 1000);
      const remainingSetup = 5 - elapsedSeconds;
      
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(timeLimit);
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = timeLimit - activeElapsed;
        setQuestionTimer(remainingQuestionTime <= 0 ? 0 : remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt]);

  const [questionStartTime, setQuestionStartTime] = useState(null);
  useEffect(() => {
    if (setupCountdown === 0 && !questionStartTime) {
      setQuestionStartTime(Date.now());
    }
  }, [setupCountdown, questionStartTime]);

  const handleLockVerdict = async () => {
    if (!selected || questionTimer <= 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const isCorrect = selected.trim().toLowerCase() === (payload?.correct || '').trim().toLowerCase();
      const timeTaken = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 0;

      const answerRecord = {
        pin: player.pin,
        name: player.name,
        teamCode: player.teamCode || null,
        gameMode: gameState.gameMode || 'solo',
        questionId: questionId,
        questionType: gameState?.activeQuestion?.type || 'photo_recognize',
        questionText: payload?.prompt || 'Threat Analysis Challenge',
        submittedAnswer: selected.trim(),
        isCorrect: isCorrect,
        explanation: payload?.explanation || '', // 🧠 Bundle explanation directly into the answer record!
        timeTaken: Number(timeTaken.toFixed(1)),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'events', 'samarambh', 'answers'), answerRecord);
      localStorage.setItem(`submitted_${player.pin}_${questionId}`, 'true');

      if (navigator.vibrate) navigator.vibrate(50);
      setHasSubmitted(true);
    } catch (error) {
      console.error("Failed to submit analysis:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const images = payload.images || (payload.imageUrl ? [payload.imageUrl] : []);
  
  let optionsList = [];
  if (Array.isArray(payload.options)) {
    optionsList = payload.options;
  } else if (typeof payload.options === 'string') {
    optionsList = payload.options.split(',').map(o => o.trim()).filter(Boolean);
  }

  if (setupCountdown > 0) {
    return (
      <div className="min-h-screen bg-black text-yellow-400 font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl font-black mb-6 animate-pulse">{setupCountdown}</div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">Analyzing Threat Payload...</h2>
        <p className="text-gray-500 text-sm">Inspecting phishing artifacts across network...</p>
        <div className="mt-8 border border-gray-800 bg-gray-900 p-4 rounded w-full max-w-xs text-xs text-gray-400 uppercase">
          Answering Window: {gameState?.activeQuestion?.timeLimit || 20}s
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col p-6 pt-8 items-center justify-center">
      <div className="w-full max-w-md mx-auto bg-gray-900 border border-cyan-500 p-6 rounded-2xl flex flex-col">
        
        <div className="flex justify-between items-center mb-6 bg-black p-3 rounded border border-gray-800">
          <span className="text-red-500 font-bold text-xs uppercase tracking-widest animate-pulse">🔴 LIVE THREAT</span>
          <span className={`font-bold text-sm ${questionTimer <= 5 ? 'text-red-500 animate-bounce' : 'text-yellow-400'}`}>
            ⏳ {questionTimer}s left
          </span>
          <span className="text-gray-400 text-xs uppercase">{gameState?.gameMode}</span>
        </div>

        {images.length > 0 && (
          <div className={`w-full grid ${images.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1'} mb-4`}>
            {images.map((imgUrl, index) => (
              <div 
                key={index} 
                onClick={() => setActiveImageZoom(imgUrl)}
                className="h-36 bg-black rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center p-1 relative cursor-pointer group hover:border-cyan-400 transition-colors"
              >
                <span className="absolute top-1 left-1 bg-black/70 text-[10px] text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800 z-10">
                  Ref #{index + 1} 🔍 Zoom
                </span>
                <img src={imgUrl} alt={`Threat Artifact ${index + 1}`} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        )}

        <h1 className="text-sm font-bold text-white mb-6 border-l-4 border-cyan-500 pl-4 leading-relaxed">
          {payload?.prompt || 'Examine artifact and identify anomaly:'}
        </h1>
        
        {optionsList.length > 0 ? (
          <div className="space-y-3">
            {optionsList.map((opt, idx) => (
              <button 
                key={idx}
                onClick={() => setSelected(opt)}
                disabled={questionTimer <= 0}
                className={`w-full p-3.5 rounded-xl border-2 text-left text-xs font-bold transition-all duration-200 uppercase tracking-wider flex items-center justify-between ${
                  selected === opt 
                  ? 'bg-cyan-900 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                  : 'bg-black border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-green-400'
                }`}
              >
                <span><span className="text-gray-600 mr-3">[{String.fromCharCode(65 + idx)}]</span> {opt}</span>
                <span className="text-[10px] opacity-60">{selected === opt ? 'SELECTED' : 'SELECT'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="w-full bg-red-950/40 border border-red-600 p-4 rounded-xl text-center">
            <p className="text-red-400 text-xs font-bold">⚠️ Configuration Error: No options loaded for this question block in CMS.</p>
          </div>
        )}

        {selected && (
          <div className="mt-6">
            <button 
              onClick={handleLockVerdict}
              disabled={isSubmitting || questionTimer <= 0}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 text-black font-extrabold py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {isSubmitting ? 'Transmitting Telemetry...' : '🔒 Lock Final Verdict'}
            </button>
          </div>
        )}

      </div>

      {activeImageZoom && (
        <div 
          onClick={() => setActiveImageZoom(null)} 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="absolute top-4 right-4 bg-gray-900 border border-gray-700 text-cyan-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            ✕ Tap anywhere to close
          </div>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center p-2">
            <img 
              src={activeImageZoom} 
              alt="Zoomed Threat Artifact" 
              className="max-h-[80vh] max-w-full object-contain rounded-lg border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)]" 
            />
          </div>
        </div>
      )}
    </div>
  );
}