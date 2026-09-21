import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext'; 

// Import our Views
import PlayerLogin from './PlayerLogin';
import PlayerDashboard from './PlayerDashboard';
import TeamLobby from './TeamLobby';
import QuizUI from './components/QuizUI';
import TerminalUI from './components/TerminalUI'; 
import PhotoQuizUI from './components/PhotoQuizUI';
import PuzzleUI from './components/PuzzleUI';

export default function MobileController() {
  const { player } = useContext(AuthContext);
  const { gameState } = useContext(GameContext); 
  
  // 🚀 Initialize currentView from localStorage so a refresh keeps you where you left off (or defaults to 'dashboard')
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('techarena_view') || 'dashboard';
  });
  
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Sync view choice to localStorage so refreshes remember it
  useEffect(() => {
    localStorage.setItem('techarena_view', currentView);
  }, [currentView]);

  // Automatically reset submission lock whenever the admin pushes a NEW question ID
  useEffect(() => {
    setHasSubmitted(false);
  }, [gameState?.activeQuestion?.id]);

  // 1. Not logged in? Show Login.
  if (!player) {
    return <PlayerLogin />;
  }

  // ==========================================
  // 🚀 THE COMPONENT REGISTRY (INTERCEPTOR)
  // If the host pushed a question, take over the screen!
  // ==========================================
  if (gameState?.status === 'playing' && gameState?.activeQuestion) {
    const block = gameState.activeQuestion;
    const questionTimer = gameState.timeRemaining || 20;

    // If student already locked an answer for THIS question, show waiting state
    if (hasSubmitted) {
      return (
        <div className="min-h-screen bg-black text-green-400 font-mono p-6 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-4 animate-bounce">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Answer Locked!</h2>
          <p className="text-gray-400 text-sm">Transmission received by server. Awaiting round closure...</p>
        </div>
      );
    }
    
    switch (block.type) {
      case 'mcq':
        return (
          <QuizUI 
            payload={block.payload} 
            player={player} 
            gameState={gameState} 
            questionTimer={questionTimer} 
            setHasSubmitted={setHasSubmitted} 
          />
        );
      case 'terminal_hack':
        return (
          <TerminalUI 
            payload={block.payload} 
            player={player} 
            gameState={gameState} 
            questionTimer={questionTimer} 
            setHasSubmitted={setHasSubmitted} 
          />
        );
      case 'photo_recognize':
        return (
          <PhotoQuizUI 
            player={player} 
            gameState={gameState} 
            questionTimer={questionTimer} 
            setHasSubmitted={setHasSubmitted} 
          />
        );
      case 'logic_puzzle':
        return (
          <PuzzleUI 
            player={player} 
            gameState={gameState} 
            questionTimer={questionTimer} 
            setHasSubmitted={setHasSubmitted} 
          />
        );
      default:
        return <div className="min-h-screen bg-black text-red-500 p-8">Unknown Component Type!</div>;
    }
  }

  // ==========================================
  // 🔀 FLEXIBLE NAVIGATION (SOLO & TEAM TOGGLE)
  // ==========================================

  // If view is set to team, render TeamLobby and pass a way to go back
  if (currentView === 'team') {
    return <TeamLobby onBack={() => setCurrentView('dashboard')} />;
  }

  // Default: Show Solo Dashboard, allowing them to jump to team view anytime
  return (
    <PlayerDashboard 
      onOpenTeam={() => setCurrentView('team')} 
    />
  );
}