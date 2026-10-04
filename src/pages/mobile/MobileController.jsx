import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext'; 
import { Lock, Sun, Moon } from 'lucide-react';

// Import our Views
import PlayerLogin from './PlayerLogin';
import PlayerDashboard from './PlayerDashboard';
import TeamLobby from './TeamLobby';
import QuizUI from './components/QuizUI';
import TerminalUI from './components/TerminalUI'; 
import PhotoQuizUI from './components/PhotoQuizUI';
import PuzzleUI from './components/PuzzleUI';
import SkribblUI from './components/SkribblUI';

function LockedFallbackView() {
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
            alt="MLSAMIET" 
            className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          />
          <span className="font-extrabold text-sm tracking-tight">
            MLSA<span className="text-indigo-600 dark:text-indigo-400">MIET</span>
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

      {/* Center Lock Card */}
      <div className="max-w-md w-full mx-auto text-center py-8">
        {/* Animated Circular Ring - Hover and Running effect */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          {/* Subtle glowing ambient aura */}
          <div className="absolute -inset-3 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-lg" />

          {/* Outer active running spinner ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 border-r-indigo-500 animate-spin" 
            style={{ animationDuration: '2s' }} 
          />
          {/* Reverse secondary subtle ring */}
          <div 
            className="absolute inset-2 rounded-full border border-dashed border-indigo-400/30 dark:border-indigo-300/25 animate-spin" 
            style={{ animationDuration: '5s', animationDirection: 'reverse' }} 
          />
          {/* Concentric radar pulse ring */}
          <div 
            className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-ping opacity-25" 
            style={{ animationDuration: '2.6s' }} 
          />
          {/* Centered lock badge */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/15">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Response Locked
        </h2>
        <p className={`text-xs mb-6 max-w-xs mx-auto leading-relaxed ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          Your response has been secured. Please wait for the host to conclude the round.
        </p>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Live · Round in Progress</span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-slate-400 pb-2">
      <span className="font-semibold text-slate-300">MLSA MIET</span> © 2026 All Rights Reserved
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
    if (!activeQuestionId || !player?.pin) {
      setHasSubmitted(false);
      return;
    }
    const alreadyAnswered = localStorage.getItem(`answer_${player.pin}_${activeQuestionId}`) || 
                            localStorage.getItem(`submitted_${player.pin}_${activeQuestionId}`);
    setHasSubmitted(Boolean(alreadyAnswered));
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
    // Skribbl guessers stay on the live canvas even after a correct guess,
    // so the one-shot submission lock must not apply to this game type.
    const isSkribblRound = block.type === 'skribbl';

    const renderActiveView = () => {
      // If student already locked an answer for THIS question, show waiting state
      if (hasSubmitted && !isSkribblRound) {
        return <LockedFallbackView />;
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
        case 'skribbl':
          return (
            <SkribblUI 
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
