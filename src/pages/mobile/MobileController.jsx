import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext'; 
import { CheckCircle2, Clock, Sun, Moon } from 'lucide-react';

// Import our Views
import PlayerLogin from './PlayerLogin';
import PlayerDashboard from './PlayerDashboard';
import TeamLobby from './TeamLobby';
import QuizUI from './components/QuizUI';
import TerminalUI from './components/TerminalUI'; 
import PhotoQuizUI from './components/PhotoQuizUI';
import PuzzleUI from './components/PuzzleUI';

function LockedFallbackView({ gameState }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('techarena_theme') === 'dark';
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('techarena_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const timeRemaining = gameState?.timeRemaining || 0;

  return (
    <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img 
            src="/images/logo.jpg" 
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            alt="TechArena" 
            className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          />
          <span className="font-extrabold text-sm tracking-tight">
            Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-colors ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
          title="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Center Card */}
      <div className="max-w-md w-full mx-auto text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-1">
          Answer Locked!
        </h2>
        <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Your response has been registered. Awaiting round closure from the host...
        </p>

        {timeRemaining > 0 && (
          <div className={`p-3 rounded-xl border text-xs max-w-xs mx-auto flex items-center justify-center gap-2 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
          }`}>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Time remaining in round: <strong className="font-mono">{timeRemaining}s</strong></span>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400 pb-2">
        Samarambh 4.0 · Live Stage
      </div>
    </div>
  );
}

export default function MobileController() {
  const { player } = useContext(AuthContext);
  const { gameState, isOnline } = useContext(GameContext); 
  
  // 🚀 Initialize currentView from localStorage
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('techarena_view') || 'dashboard';
  });
  
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const activeQuestionId = gameState?.activeQuestion?.id;

  // Sync view choice to localStorage so refreshes remember it
  useEffect(() => {
    localStorage.setItem('techarena_view', currentView);
  }, [currentView]);

  // Automatically sync submission lock: check if player already answered this question ID in local storage or state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activeQuestionId || !player?.pin) {
        setHasSubmitted(false);
        return;
      }
      const alreadyAnswered = localStorage.getItem(`answer_${player.pin}_${activeQuestionId}`) || 
                              localStorage.getItem(`submitted_${player.pin}_${activeQuestionId}`);
      setHasSubmitted(Boolean(alreadyAnswered));
    }, 0);
    return () => clearTimeout(timer);
  }, [activeQuestionId, player?.pin]);

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

    const renderActiveView = () => {
      // If student already locked an answer for THIS question, show waiting state
      if (hasSubmitted) {
        return <LockedFallbackView gameState={gameState} />;
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
          return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-rose-500 p-8 flex items-center justify-center text-center">
              <p className="text-sm font-semibold">Unknown question challenge format.</p>
            </div>
          );
      }
    };

    return (
      <>
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 font-bold text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            <span>Connection dropped: Offline mode active. Your choice is saved locally and will auto-sync!</span>
          </div>
        )}
        {renderActiveView()}
      </>
    );
  }

  // ==========================================
  // 🔀 FLEXIBLE NAVIGATION (SOLO & TEAM TOGGLE)
  // ==========================================
  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 font-bold text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-md">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          <span>Offline Mode Active: Your answers are saved locally and will auto-sync when network returns!</span>
        </div>
      )}
      {currentView === 'team' ? (
        <TeamLobby onBack={() => setCurrentView('dashboard')} />
      ) : (
        <PlayerDashboard onOpenTeam={() => setCurrentView('team')} />
      )}
    </>
  );
}
