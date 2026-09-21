import React, { useState } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function PhotoQuizUI({ player, gameState, questionTimer, setHasSubmitted }) {
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const payload = gameState.activeQuestion.payload;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || questionTimer <= 0) return;
    setIsSubmitting(true);

    try {
      const isCorrect = answerInput.trim().toLowerCase() === payload.correct.trim().toLowerCase();
      
      const answerRecord = {
        pin: player.pin,
        name: player.name,
        teamCode: player.teamCode || null,
        gameMode: gameState.gameMode || 'solo',
        questionText: payload.prompt || 'Photo Recognition Challenge',
        submittedAnswer: answerInput.trim(),
        isCorrect: isCorrect,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'events', 'samarambh', 'answers'), answerRecord);
      
      if (navigator.vibrate) navigator.vibrate(50);
      setHasSubmitted(true);
    } catch (error) {
      console.error("Failed to submit photo answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-gray-900 border border-cyan-500 p-6 rounded-2xl flex flex-col items-center">
      <span className="text-xs text-cyan-400 uppercase tracking-widest mb-3">🖼️ Visual Identification</span>
      
      {/* Target Image Preview */}
      <div className="w-full h-48 bg-black rounded-lg border border-gray-700 overflow-hidden mb-4 flex items-center justify-center">
        <img src={payload.imageUrl} alt="Challenge Target" className="max-h-full max-w-full object-contain" />
      </div>

      <p className="text-sm font-bold text-white mb-4 text-center">{payload.prompt}</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input 
          type="text"
          value={answerInput}
          onChange={(e) => setAnswerInput(e.target.value)}
          placeholder="Type your answer..."
          className="w-full bg-black border border-gray-700 p-3 rounded text-white text-center text-sm outline-none focus:border-cyan-500 uppercase tracking-wider"
          required
        />
        <button 
          type="submit"
          disabled={isSubmitting || questionTimer <= 0}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-extrabold py-3 rounded uppercase tracking-widest text-xs transition-colors"
        >
          {isSubmitting ? 'Transmitting...' : 'Lock Answer'}
        </button>
      </form>
    </div>
  );
}