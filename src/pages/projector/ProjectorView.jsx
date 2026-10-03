import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Video, 
  Terminal, 
  HelpCircle, 
  CheckCircle2, 
  Image as ImageIcon,
  Sun,
  Moon
} from 'lucide-react';
import StageCountdown from '../../components/StageCountdown';
import GlassAvatar from '../../components/GlassAvatar';
import SkribblStage from './components/SkribblStage';

// Option badge designs with high-contrast big-screen presence
const getMcqBadges = (isLightMode) => [
  { 
    label: 'A', 
    border: isLightMode ? 'border-rose-300 hover:border-rose-400' : 'border-rose-500/70', 
    bg: isLightMode ? 'bg-white/95 text-slate-900 shadow-[0_12px_32px_rgba(244,63,94,0.10)]' : 'bg-rose-950/50', 
    badgeBg: isLightMode ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/35' : 'bg-rose-600 text-white shadow-rose-600/50', 
    text: isLightMode ? 'text-slate-900 font-black' : 'text-rose-100',
    glow: isLightMode ? 'shadow-lg ring-1 ring-rose-200/60' : 'shadow-[0_0_35px_rgba(244,63,94,0.25)]'
  },
  { 
    label: 'B', 
    border: isLightMode ? 'border-blue-300 hover:border-blue-400' : 'border-blue-500/70', 
    bg: isLightMode ? 'bg-white/95 text-slate-900 shadow-[0_12px_32px_rgba(59,130,246,0.10)]' : 'bg-blue-950/50', 
    badgeBg: isLightMode ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/35' : 'bg-blue-600 text-white shadow-blue-600/50', 
    text: isLightMode ? 'text-slate-900 font-black' : 'text-blue-100',
    glow: isLightMode ? 'shadow-lg ring-1 ring-blue-200/60' : 'shadow-[0_0_35px_rgba(59,130,246,0.25)]'
  },
  { 
    label: 'C', 
    border: isLightMode ? 'border-amber-300 hover:border-amber-400' : 'border-amber-500/70', 
    bg: isLightMode ? 'bg-white/95 text-slate-900 shadow-[0_12px_32px_rgba(245,158,11,0.10)]' : 'bg-amber-950/50', 
    badgeBg: isLightMode ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/35' : 'bg-amber-600 text-white shadow-amber-600/50', 
    text: isLightMode ? 'text-slate-900 font-black' : 'text-amber-100',
    glow: isLightMode ? 'shadow-lg ring-1 ring-amber-200/60' : 'shadow-[0_0_35px_rgba(245,158,11,0.25)]'
  },
  { 
    label: 'D', 
    border: isLightMode ? 'border-emerald-300 hover:border-emerald-400' : 'border-emerald-500/70', 
    bg: isLightMode ? 'bg-white/95 text-slate-900 shadow-[0_12px_32px_rgba(16,185,129,0.10)]' : 'bg-emerald-950/50', 
    badgeBg: isLightMode ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/35' : 'bg-emerald-600 text-white shadow-emerald-600/50', 
    text: isLightMode ? 'text-slate-900 font-black' : 'text-emerald-100',
    glow: isLightMode ? 'shadow-lg ring-1 ring-emerald-200/60' : 'shadow-[0_0_35px_rgba(16,185,129,0.25)]'
  }
];

// Top-Left Brand Logo Badge (declared outside to avoid React re-creation in render)
function TopLeftLogoBadge({ isLightMode }) {
  return (
    <div className="absolute top-6 left-6 z-40 select-none">
      <img 
        src="/images/logo.jpg" 
        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
        alt="MLSA MIET Organizer" 
        className={`w-10 h-10 md:w-12 md:h-12 object-contain rounded-xl p-1 transition-all ${
          isLightMode 
            ? 'bg-white/95 border border-slate-300 shadow-md' 
            : 'bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
        }`}
      />
    </div>
  );
}

// Projector Photo Card with pure React state error handling
function ProjectorImageCard({ img, isSingleImage, letter, badgeClass, isLightMode }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${isSingleImage ? 'h-72 md:h-96' : 'h-64 md:h-80'} rounded-3xl overflow-hidden border-2 p-2 shadow-2xl flex flex-col transition-all ${
      isLightMode 
        ? 'bg-white border-slate-200/90 shadow-[0_15px_35px_rgba(0,0,0,0.06)]' 
        : 'bg-black/60 border-white/20'
    }`}>
      {/* Prominent Image A / B or Visual Artifact Badge */}
      <div className={`absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-xl ${
        isLightMode 
          ? 'bg-white/95 border-slate-200 text-slate-900' 
          : 'bg-slate-950/85 border-white/20 text-white'
      }`}>
        {isSingleImage ? (
          <>
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md">
              <ImageIcon className="w-3.5 h-3.5" />
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isLightMode ? 'text-slate-800' : 'text-white'
            }`}>
              Visual Artifact
            </span>
          </>
        ) : (
          <>
            <span className={`w-6 h-6 rounded-lg ${badgeClass} text-white font-black text-xs flex items-center justify-center shadow-md`}>
              {letter}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isLightMode ? 'text-slate-800' : 'text-white'
            }`}>
              Image {letter}
            </span>
          </>
        )}
      </div>

      <div className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center p-2 ${
        isLightMode ? 'bg-slate-50' : 'bg-black/40'
      }`}>
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <ImageIcon className="w-10 h-10 text-slate-500 mb-2" />
            <span className="text-sm font-semibold">Image Preview Unavailable</span>
          </div>
        ) : (
          <img 
            src={img} 
            alt={isSingleImage ? 'Visual Artifact' : `Artifact ${letter}`} 
            className="w-full h-full object-contain rounded-xl" 
            onError={() => setHasError(true)}
          />
        )}
      </div>
    </div>
  );
}

export default function ProjectorView() {
  const { gameState } = useContext(GameContext);
  
  // Leaderboard data
  const [leaders, setLeaders] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  
  // Real-time players joined count
  const [playerCount, setPlayerCount] = useState(0);

  // Submissions count for current active question
  const [submissionCount, setSubmissionCount] = useState(0);

  // Synchronized Timers
  const [setupCountdown, setSetupCountdown] = useState(10); 
  const [questionTimer, setQuestionTimer] = useState(0);

  // Luminous Stage Theme (defaults to light mode as preferred, persistent in localStorage)
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('techarena_projector_theme') !== 'dark';
  });

  const toggleTheme = () => {
    setIsLightMode(prev => {
      const next = !prev;
      localStorage.setItem('techarena_projector_theme', next ? 'light' : 'dark');
      return next;
    });
  };

  const mcqBadges = useMemo(() => getMcqBadges(isLightMode), [isLightMode]);

  // Video Background Controls: 'auto' | 'firstbag' | 'leaderboard'
  const [videoMode, setVideoMode] = useState('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);

  // Dynamic host event join URL
  const eventUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/play`;
    }
    return "https://techarena.app/play";
  }, []);

  // Determine active video source
  const currentVideoSrc = useMemo(() => {
    if (videoMode === 'firstbag') return '/videos/firstbag.mp4';
    if (videoMode === 'leaderboard') return '/videos/leaderboardsolo.mp4';
    
    if (gameState?.status === 'leaderboard') {
      return '/videos/leaderboardsolo.mp4';
    }
    return '/videos/firstbag.mp4';
  }, [videoMode, gameState?.status]);

  // Fullscreen Toggle Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Keyboard shortcut listener ('F' for fullscreen, 'V' for video mode, 'T' for theme toggle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'v' || e.key === 'V') {
        setVideoMode(prev => prev === 'auto' ? 'leaderboard' : prev === 'leaderboard' ? 'firstbag' : 'auto');
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Listen to active player count in lobby
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'players'), (snapshot) => {
      setPlayerCount(snapshot.size);
    }, (err) => console.warn("Player count error:", err));

    return () => unsubscribe();
  }, []);

  // 2. Listen to submission count during active question
  const activeQuestionId = gameState?.activeQuestion?.id;
  useEffect(() => {
    if (gameState?.status !== 'playing' || !activeQuestionId) {
      const timer = setTimeout(() => setSubmissionCount(0), 0);
      return () => clearTimeout(timer);
    }

    try {
      const answersRef = collection(db, 'events', 'samarambh', 'answers');
      const q = query(answersRef, where("questionId", "==", activeQuestionId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setSubmissionCount(snapshot.size);
      }, (err) => console.warn("Answers count error:", err));

      return () => unsubscribe();
    } catch (err) {
      console.warn("Submissions query setup:", err);
    }
  }, [gameState?.status, activeQuestionId]);

  // 3. Question Timer Synchronization
  useEffect(() => {
    if (gameState?.status !== 'playing' || !gameState?.updatedAt) return;

    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();
    const questionDuration = gameState.activeQuestion?.timeLimit || 20;

    const updateTimers = () => {
      const nowMs = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((nowMs - updatedAtMs) / 1000));
      const remainingSetup = Math.min(10, Math.max(0, 10 - elapsedSeconds));

      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(questionDuration); 
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 10;
        const remainingQuestionTime = Math.max(0, questionDuration - activeElapsed);
        setQuestionTimer(remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, gameState?.status, gameState?.activeQuestion]);

  // Real-time map of teamCode -> teamName for all registered squads
  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'events', 'samarambh', 'teams'), (snapshot) => {
      const map = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const tName = d.teamName || d.name;
        if (tName) {
          if (d.teamCode) map[d.teamCode] = tName;
          map[docSnap.id] = tName;
        }
      });
      setTeamsMap(map);
    }, (error) => {
      console.warn("Teams map listener error:", error.message);
    });

    return () => unsubTeams();
  }, []);

  // 4. Leaderboard Data Listener (bounded to Top 10 with server-side sorting)
  useEffect(() => {
    if (gameState?.status !== 'leaderboard') return;
    const isTeamMode = gameState.gameMode === 'team';
    const qLeaders = isTeamMode
      ? query(collection(db, 'events', 'samarambh', 'teams'), orderBy('totalScore', 'desc'), limit(10))
      : query(collection(db, 'players'), orderBy('score', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(qLeaders, (snapshot) => {
      let results = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          name: isTeamMode ? (data.teamName || data.name) : data.name,
          score: isTeamMode ? (data.totalScore || 0) : (data.score || 0),
          teamCode: data.teamCode || null,
          teamName: data.teamName || null
        });
      });
      setLeaders(results.slice(0, 8));
    }, (error) => {
      console.warn("Leaderboard listener error:", error.message);
    });

    return () => unsubscribe();
  }, [gameState?.status, gameState?.gameMode]);

  // Shared Background Video Container with high-end atmospheric layering
  const renderBackgroundVideo = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      <video 
        ref={videoRef}
        key={currentVideoSrc}
        autoPlay 
        loop 
        muted 
        playsInline 
        className={`w-full h-full object-cover scale-105 filter contrast-110 saturate-125 transition-opacity duration-1000 ${
          isLightMode ? 'opacity-15' : 'opacity-45'
        }`}
      >
        <source src={currentVideoSrc} type="video/mp4" />
        <source src="/videos/leaderboardsolo.mp4" type="video/mp4" />
        <source src="/videos/firstbag.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Stage Vignettes & Gradient Shimmer */}
      <div className={`absolute inset-0 transition-colors duration-700 ${
        isLightMode 
          ? 'bg-gradient-to-t from-slate-100/90 via-slate-100/75 to-slate-100/85' 
          : 'bg-gradient-to-t from-[#070b14] via-[#070b14]/85 to-[#070b14]/90'
      }`} />
      <div className={`absolute inset-0 ${
        isLightMode 
          ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]' 
          : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)]'
      }`} />
    </div>
  );

  // Operator HUD Controls (Floating discreetly in bottom right)
  const renderOperatorBar = () => (
    <div 
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`flex items-center gap-2 backdrop-blur-xl border p-1.5 rounded-2xl shadow-2xl text-xs transition-all ${
              isLightMode 
                ? 'bg-white/95 border-slate-300 text-slate-700 shadow-slate-300/40' 
                : 'bg-slate-900/90 border-white/20 text-slate-300'
            }`}
          >
            <div className={`flex items-center gap-1 px-2 font-mono text-[11px] ${
              isLightMode ? 'text-indigo-600 font-bold' : 'text-amber-400'
            }`}>
              <Video className="w-3.5 h-3.5" />
              <span>BG:</span>
            </div>

            <button
              onClick={() => setVideoMode('auto')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoMode === 'auto' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : isLightMode 
                    ? 'hover:bg-slate-200/70 text-slate-600' 
                    : 'hover:bg-white/10 text-slate-400'
              }`}
            >
              Auto
            </button>

            <button
              onClick={() => setVideoMode('firstbag')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoMode === 'firstbag' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : isLightMode 
                    ? 'hover:bg-slate-200/70 text-slate-600' 
                    : 'hover:bg-white/10 text-slate-400'
              }`}
              title="/videos/firstbag.mp4"
            >
              Vid 1
            </button>

            <button
              onClick={() => setVideoMode('leaderboard')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoMode === 'leaderboard' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : isLightMode 
                    ? 'hover:bg-slate-200/70 text-slate-600' 
                    : 'hover:bg-white/10 text-slate-400'
              }`}
              title="/videos/leaderboardsolo.mp4"
            >
              Vid 2
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Toggle Button (Light / Dark) */}
      <button
        onClick={toggleTheme}
        className={`p-3 backdrop-blur-xl border rounded-2xl shadow-xl transition-all active:scale-95 ${
          isLightMode 
            ? 'bg-white/90 hover:bg-white border-slate-300 text-amber-500 shadow-amber-500/10' 
            : 'bg-slate-900/80 hover:bg-slate-800 border-white/20 text-indigo-400'
        }`}
        title={`Switch to ${isLightMode ? 'Dark' : 'Light'} Mode (T)`}
      >
        {isLightMode ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
      </button>

      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className={`p-3 backdrop-blur-xl border rounded-2xl shadow-xl transition-all active:scale-95 ${
          isLightMode 
            ? 'bg-white/90 hover:bg-white border-slate-300 text-slate-800' 
            : 'bg-slate-900/80 hover:bg-slate-800 border-white/20 text-white'
        }`}
        title="Toggle Fullscreen (F)"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );

  // =========================================================================
  // VIEW 1: GRAND STANDBY / WAITING SCREEN (LOBBY & QR CODE)
  // =========================================================================
  if (!gameState || gameState.status === 'waiting' || gameState.status === 'idle' || !gameState.status) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-between p-8 md:p-14 select-none overflow-hidden relative font-sans transition-colors duration-500 ${
        isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#070b14] text-white'
      }`}>
        <TopLeftLogoBadge isLightMode={isLightMode} />
        {renderBackgroundVideo()}
        {renderOperatorBar()}

        {/* Top Status Pill */}
        <div className="z-10 pt-2 flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wider transition-all ${
            isLightMode 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
          }`}>
            <Users className={`w-3.5 h-3.5 ${isLightMode ? 'text-indigo-600' : 'text-indigo-400'}`} />
            <span><strong>{playerCount}</strong> Competitors Right Now</span>
          </div>
        </div>

        {/* Central Stage Hero */}
        <div className="z-10 flex flex-col items-center max-w-6xl w-full my-auto text-center">
          <motion.div 
            initial={{ y: -30, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ duration: 0.7 }}
            className="mb-6 md:mb-8"
          >
            <h1 className={`text-6xl sm:text-7xl md:text-9xl font-black tracking-tight text-transparent bg-clip-text transition-all ${
              isLightMode 
                ? 'bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-700 drop-shadow-[0_10px_30px_rgba(99,102,241,0.15)]' 
                : 'bg-gradient-to-r from-white via-indigo-200 to-amber-200 drop-shadow-[0_0_60px_rgba(99,102,241,0.5)]'
            }`}>
              SAMARAMBH 4.0
            </h1>
          </motion.div>

          {/* Join Instructions & QR Code Card */}
          <motion.div 
            initial={{ scale: 0.94, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.6, delay: 0.2 }} 
            className={`w-full max-w-4xl backdrop-blur-2xl border-2 p-8 md:p-12 rounded-3xl grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12 transition-all ${
              isLightMode 
                ? 'bg-white/95 border-slate-200/90 shadow-[0_25px_60px_rgba(0,0,0,0.08)]' 
                : 'bg-slate-900/70 border-indigo-500/40 shadow-[0_0_80px_rgba(99,102,241,0.25)]'
            }`}
          >
            {/* Left Instructions */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
              <span className={`text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-md border ${
                isLightMode 
                  ? 'text-indigo-700 bg-indigo-50 border-indigo-200' 
                  : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
              }`}>
                Live Registration
              </span>

              <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}>
                Scan QR or Visit Link to Join
              </h2>

              <div className="w-full pt-5">
                <div className={`p-3.5 rounded-xl border text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate font-mono shadow-inner transition-all ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-300 text-indigo-950 font-black' 
                    : 'bg-black/60 border-white/15 text-amber-300'
                }`}>
                  {eventUrl}
                </div>
              </div>
            </div>

            {/* Right QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className={`p-5 rounded-3xl border-4 transition-all ${
                isLightMode 
                  ? 'bg-white shadow-[0_15px_40px_rgba(0,0,0,0.08)] border-indigo-200' 
                  : 'bg-white shadow-[0_0_50px_rgba(255,255,255,0.3)] border-indigo-400/50'
              }`}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(eventUrl)}&margin=4`} 
                  alt="Scan to Join Event" 
                  className="w-48 h-48 md:w-56 md:h-56 object-contain"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className={`z-10 text-center text-xs md:text-sm font-medium ${
          isLightMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Organized by <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Microsoft Learn Student Ambassadors MIET</strong> · Powered by TechArena
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EPIC LEADERBOARD & PODIUM SCREEN (RUNS leaderboardsolo.mp4)
  // =========================================================================
  if (gameState?.status === 'leaderboard') {
    const isTeamMode = gameState.gameMode === 'team';
    const completedQ = gameState.lastCompletedQuestion || gameState.activeQuestion;
    const roundText = completedQ?.round || (gameState.round ? `Round ${gameState.round}` : null);
    const questionNum = completedQ?.questionNumber || (completedQ?.roundIndex ? completedQ.roundIndex : null);

    let roundResultLabel = '';
    if (roundText && questionNum) {
      roundResultLabel = `${roundText} · Question ${questionNum} Results`;
    } else if (roundText) {
      roundResultLabel = `${roundText} Results`;
    } else if (questionNum) {
      roundResultLabel = `Question ${questionNum} Results`;
    } else {
      roundResultLabel = isTeamMode ? 'Squad Battle Standings' : 'Solo Arena Standings';
    }

    return (
      <div className={`min-h-screen flex flex-col items-center justify-between p-8 md:p-12 overflow-hidden relative select-none font-sans transition-colors duration-500 ${
        isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#070b14] text-white'
      }`}>
        <TopLeftLogoBadge isLightMode={isLightMode} />
        {renderBackgroundVideo()}
        {renderOperatorBar()}

        {/* Header Title with generous top padding to prevent screen clipping */}
        <motion.div 
          initial={{ y: -40, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.6 }} 
          className="text-center z-10 pt-8 md:pt-10"
        >
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-3 transition-all ${
            isLightMode 
              ? 'bg-amber-100/80 border-amber-300 text-amber-900 shadow-sm' 
              : 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          }`}>
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{roundResultLabel}</span>
          </div>

          <h1 className={`text-4xl sm:text-5xl md:text-7xl font-black tracking-wider text-transparent bg-clip-text transition-all ${
            isLightMode 
              ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 drop-shadow-[0_4px_16px_rgba(245,158,11,0.2)]' 
              : 'bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 drop-shadow-[0_0_40px_rgba(245,158,11,0.4)]'
          }`}>
            {isTeamMode ? 'SQUAD GRAND RANKINGS' : 'SOLO STANDINGS'}
          </h1>
        </motion.div>

        {/* Leaderboard Grid - Full spacious layout with beautiful card styling */}
        <div className="w-full max-w-5xl space-y-3.5 z-10 my-auto">
          {leaders.length === 0 ? (
            <div className={`text-center py-20 rounded-3xl backdrop-blur-xl border transition-all ${
              isLightMode 
                ? 'bg-white/90 border-slate-200 shadow-xl' 
                : 'bg-slate-900/60 border-white/10'
            }`}>
              <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500 animate-bounce" />
              <p className={`text-2xl font-bold uppercase tracking-widest ${
                isLightMode ? 'text-slate-800' : 'text-slate-300'
              }`}>
                Tabulating Arena Scores...
              </p>
              <p className="text-sm text-slate-500 mt-2">Connecting to live submission matrix</p>
            </div>
          ) : (
            leaders.map((leader, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              let cardStyle = isLightMode 
                ? 'border-slate-200/90 bg-white/90 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)]' 
                : 'border-white/10 bg-slate-900/60 text-slate-300';
              let badgeColor = isLightMode 
                ? 'bg-slate-100 text-slate-700 border-slate-300 font-bold' 
                : 'bg-slate-800 text-slate-300 border-slate-700';
              let rankText = `#0${index + 1}`;
              let medalIcon = null;
              let scoreColor = isLightMode ? 'text-indigo-600' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]';

              if (isFirst) {
                cardStyle = isLightMode
                  ? 'border-amber-400 bg-gradient-to-r from-amber-50 via-white to-amber-100/60 text-slate-900 shadow-[0_15px_40px_rgba(245,158,11,0.25)] scale-[1.02] ring-2 ring-amber-400/50'
                  : 'border-amber-400/80 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/50 text-white shadow-[0_0_45px_rgba(245,158,11,0.35)] scale-[1.02] ring-2 ring-amber-400/40';
                badgeColor = isLightMode
                  ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-black shadow-md'
                  : 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-[0_0_20px_rgba(245,158,11,0.6)]';
                rankText = '1ST';
                medalIcon = '🥇';
                scoreColor = isLightMode ? 'text-amber-600 font-black' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]';
              } else if (isSecond) {
                cardStyle = isLightMode
                  ? 'border-slate-300 bg-gradient-to-r from-slate-100 via-white to-slate-200/50 text-slate-900 shadow-[0_10px_25px_rgba(0,0,0,0.06)]'
                  : 'border-slate-300/60 bg-gradient-to-r from-slate-800/80 via-slate-900/90 to-slate-800/60 text-white shadow-[0_0_30px_rgba(203,213,225,0.2)]';
                badgeColor = isLightMode
                  ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-900 border-slate-300 font-black shadow-sm'
                  : 'bg-slate-300 text-slate-950 border-white font-bold shadow-[0_0_15px_rgba(203,213,225,0.5)]';
                rankText = '2ND';
                medalIcon = '🥈';
                scoreColor = isLightMode ? 'text-slate-700 font-black' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]';
              } else if (isThird) {
                cardStyle = isLightMode
                  ? 'border-orange-300 bg-gradient-to-r from-orange-50 via-white to-orange-100/50 text-slate-900 shadow-[0_10px_25px_rgba(249,115,22,0.1)]'
                  : 'border-amber-700/60 bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-amber-950/30 text-white shadow-[0_0_25px_rgba(180,83,9,0.2)]';
                badgeColor = isLightMode
                  ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white border-orange-400 font-black shadow-sm'
                  : 'bg-amber-700 text-white border-amber-600 font-bold';
                rankText = '3RD';
                medalIcon = '🥉';
                scoreColor = isLightMode ? 'text-amber-700 font-black' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]';
              }

              return (
                <motion.div 
                  key={leader.id} 
                  layout
                  initial={{ x: -40, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }} 
                  transition={{ 
                    layout: { type: "spring", stiffness: 350, damping: 28 },
                    duration: 0.35 
                  }} 
                  className={`flex justify-between items-center px-6 md:px-8 py-4 md:py-5 rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 ${cardStyle}`}
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Rank Badge */}
                    <div className={`px-4 py-2 rounded-xl border text-sm md:text-base font-mono flex items-center gap-1.5 shrink-0 ${badgeColor}`}>
                      {medalIcon && <span>{medalIcon}</span>}
                      <span>{rankText}</span>
                    </div>

                    {/* Translucent Glass Avatar */}
                    <GlassAvatar 
                      name={leader.name} 
                      seed={leader.id || leader.teamCode || leader.name} 
                      size="md" 
                    />

                    {/* Participant / Squad Name */}
                    <div className="flex flex-col">
                      <span className={`text-2xl md:text-3xl font-extrabold tracking-wide ${
                        isLightMode ? 'text-slate-900' : 'text-white'
                      }`}>
                        {leader.name}
                      </span>
                      {!isTeamMode && (leader.teamCode || leader.teamName) && (
                        <span className={`text-xs md:text-sm font-semibold tracking-wider ${
                          isLightMode ? 'text-indigo-600' : 'text-indigo-300'
                        }`}>
                          Squad: {leader.teamName || (leader.teamCode ? teamsMap[leader.teamCode] : null) || 'Squad Member'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-baseline gap-2.5">
                    <span className={`text-4xl md:text-5xl font-black tracking-wider font-mono ${scoreColor}`}>
                      {leader.score}
                    </span>
                    <span className={`text-sm md:text-base font-bold uppercase tracking-widest ${
                      isLightMode ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      PTS
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE PLAY / LIVE QUESTION TRANSMISSION SCREEN
  // =========================================================================
  if (gameState?.status === 'playing') {
    const qData = gameState?.activeQuestion || {};
    const payload = qData.payload || {};
    const qType = qData.type || payload.type || 'mcq';

    // Special Stage UI for Live Multiplayer Skribbl Game
    if (qType === 'skribbl') {
      return (
        <div className={`min-h-screen flex flex-col p-6 md:p-10 relative overflow-hidden select-none font-sans transition-colors duration-500 ${
          isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#070b14] text-white'
        }`}>
          <TopLeftLogoBadge isLightMode={isLightMode} />
          {renderBackgroundVideo()}
          {renderOperatorBar()}
          <SkribblStage
            activeQ={qData}
            gameState={gameState}
            playerCount={playerCount}
            isLightMode={isLightMode}
            embedded
          />
        </div>
      );
    }

    // Extract challenge contents across formats
    const questionText = qData.question || payload.question || payload.prompt || payload.missionText || payload.puzzleText || "Check your device for the active challenge!";
    const optionsList = qData.options || payload.options || [];
    
    // Robust image parsing for 1, 2, 3, or 4 images
    const rawImages = (Array.isArray(payload.images) && payload.images.length > 0)
      ? payload.images
      : (typeof payload.images === 'string' && payload.images.trim()
          ? payload.images.split(',')
          : (payload.imageUrl ? (typeof payload.imageUrl === 'string' ? payload.imageUrl.split(',') : [payload.imageUrl]) : []));
    const imagesList = rawImages.map(u => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
    const isSingleImage = imagesList.length === 1;

    const consoleText = payload.consoleText || "";

    const isTimeCritical = questionTimer <= 5;
    const isTimeWarning = questionTimer <= 10 && questionTimer > 5;

    return (
      <div className={`min-h-screen flex flex-col justify-between p-8 md:p-12 relative overflow-hidden select-none font-sans transition-colors duration-500 ${
        isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#070b14] text-white'
      }`}>
        <TopLeftLogoBadge isLightMode={isLightMode} />
        {renderBackgroundVideo()}
        {renderOperatorBar()}

        {/* Top Header Bar */}
        <header className={`flex justify-between items-center border-b pb-6 mb-6 z-10 pl-24 md:pl-0 ${
          isLightMode ? 'border-slate-300/80' : 'border-white/15'
        }`}>
          <div className="flex items-center gap-3">
          </div>

          {/* Submissions ticker & Timer */}
          <div className="flex items-center gap-4">
            {setupCountdown === 0 && submissionCount > 0 && (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-mono transition-all ${
                isLightMode 
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-sm' 
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>{submissionCount} Submissions Locked</span>
              </div>
            )}

            {setupCountdown === 0 && (
              <div className={`px-6 py-2.5 rounded-2xl border-2 text-2xl md:text-3xl font-black font-mono tracking-wider uppercase transition-all flex items-center gap-2.5 ${
                isLightMode
                  ? (isTimeCritical
                      ? 'border-rose-500 text-rose-600 bg-rose-50 animate-bounce shadow-md'
                      : isTimeWarning
                        ? 'border-amber-400 text-amber-700 bg-amber-50 shadow-sm'
                        : 'border-indigo-300 text-indigo-700 bg-indigo-50/80 shadow-sm')
                  : (isTimeCritical 
                      ? 'border-rose-500 text-rose-400 bg-rose-950/60 animate-bounce shadow-[0_0_30px_rgba(244,63,94,0.5)]' 
                      : isTimeWarning
                        ? 'border-amber-400 text-amber-300 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'border-indigo-500/50 text-indigo-300 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.25)]')
              }`}>
                <Clock className="w-6 h-6" />
                <span>{questionTimer}s</span>
              </div>
            )}
          </div>
        </header>

        {/* Question & Interactive Body View */}
        <main className="flex-1 flex flex-col justify-center items-center z-10 w-full max-w-6xl mx-auto my-auto py-4">
          {setupCountdown > 0 ? (
            /* 10-Second Countdown Before Question Is Revealed */
            <StageCountdown
              seconds={setupCountdown}
              secondsRemaining={setupCountdown}
              mode="projector"
              isDarkMode={!isLightMode}
              roundName={qData.round || (gameState.round ? `Round ${gameState.round}` : "Samarambh 4.0")}
              questionNumber={qData.questionNumber || qData.roundIndex || 1}
              totalQuestions={gameState.totalQuestions || 10}
              isProjector={true}
            />
          ) : (
            /* Active Live Challenge Presentation */
            <div className="w-full flex flex-col items-center">
              {qType === 'photo_recognize' ? (
                /* 1. VISUAL IDENTIFICATION CHALLENGE (1, 2, 3, or 4 images) */
                <motion.div 
                  initial={{ scale: 0.96, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full flex flex-col items-center space-y-6"
                >
                  <div className={`w-full backdrop-blur-2xl border-2 p-6 md:p-8 rounded-3xl shadow-2xl text-center transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)]' 
                      : 'bg-slate-900/80 border-indigo-500/40'
                  }`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-2 ${
                      isLightMode 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    }`}>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Visual Identification Challenge</span>
                    </div>
                    <h1 className={`text-3xl md:text-5xl font-extrabold leading-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      {questionText}
                    </h1>
                  </div>

                  {imagesList.length > 0 && (
                    <div className={`grid ${isSingleImage ? 'grid-cols-1 max-w-3xl' : 'grid-cols-2 max-w-5xl'} gap-6 w-full mx-auto`}>
                      {imagesList.map((img, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isA = i === 0;
                        const isB = i === 1;
                        const isC = i === 2;
                        const badgeClass = isA ? 'bg-rose-600' : isB ? 'bg-blue-600' : isC ? 'bg-amber-600' : 'bg-emerald-600';

                        return (
                          <ProjectorImageCard 
                            key={`${img}-${i}`} 
                            img={img} 
                            isSingleImage={isSingleImage} 
                            letter={letter} 
                            badgeClass={badgeClass} 
                            isLightMode={isLightMode}
                          />
                        );
                      })}
                    </div>
                  )}

                  {optionsList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                      {optionsList.map((opt, idx) => {
                        const b = mcqBadges[idx % mcqBadges.length];
                        return (
                          <div key={idx} className={`p-5 md:p-6 rounded-2xl border-2 backdrop-blur-xl flex items-center ${b.border} ${b.bg} ${b.glow}`}>
                            <span className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black mr-5 shrink-0 ${b.badgeBg}`}>
                              {b.label}
                            </span>
                            <span className={`text-xl md:text-3xl font-bold ${b.text}`}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : qType === 'terminal_hack' ? (
                /* 2. TERMINAL SHELL CHALLENGE */
                <motion.div 
                  initial={{ scale: 0.96, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full flex flex-col items-center space-y-6"
                >
                  <div className={`w-full backdrop-blur-2xl border-2 p-6 md:p-8 rounded-3xl shadow-2xl text-center transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-amber-300 shadow-[0_20px_50px_rgba(245,158,11,0.08)]' 
                      : 'bg-slate-900/80 border-amber-500/40'
                  }`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-2 ${
                      isLightMode 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}>
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Security Incident Command Mission</span>
                    </div>
                    <h1 className={`text-2xl md:text-4xl font-extrabold leading-relaxed font-mono ${
                      isLightMode ? 'text-amber-800' : 'text-amber-300'
                    }`}>
                      {questionText}
                    </h1>
                  </div>

                  {consoleText && (
                    <div className="w-full max-w-5xl rounded-3xl border-2 border-slate-700 bg-[#0c1220]/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-left font-mono">
                      <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-xs text-slate-400">root@arena-node:~# bash</span>
                      </div>
                      <pre className="p-6 md:p-8 text-xl md:text-3xl text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {consoleText}
                      </pre>
                    </div>
                  )}
                </motion.div>
              ) : qType === 'logic_puzzle' ? (
                /* 3. LOGIC RIDDLE / PUZZLE */
                <motion.div 
                  initial={{ scale: 0.96, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className={`w-full max-w-5xl backdrop-blur-2xl border-2 p-8 md:p-12 rounded-3xl shadow-2xl text-center space-y-6 transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-indigo-200 shadow-[0_20px_50px_rgba(99,102,241,0.08)]' 
                      : 'bg-slate-900/80 border-indigo-500/40'
                  }`}
                >
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
                    isLightMode 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  }`}>
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Logic Riddle Decryption</span>
                  </div>
                  <h1 className={`text-3xl md:text-5xl font-extrabold leading-relaxed ${
                    isLightMode ? 'text-slate-900' : 'text-white'
                  }`}>
                    {questionText}
                  </h1>
                  <p className={`text-sm md:text-base ${
                    isLightMode ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    Type your solution into your mobile controller before the time window expires!
                  </p>
                </motion.div>
              ) : (
                /* 4. STANDARD MULTIPLE CHOICE (MCQ) */
                <motion.div 
                  initial={{ scale: 0.96, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full flex flex-col items-center space-y-8"
                >
                  {/* Huge Question Text Card */}
                  <div className={`w-full backdrop-blur-2xl border-2 p-8 md:p-12 rounded-3xl shadow-2xl text-center transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)]' 
                      : 'bg-slate-900/80 border-indigo-500/40'
                  }`}>
                    <span className={`inline-block text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-md border mb-3 ${
                      isLightMode 
                        ? 'text-indigo-700 bg-indigo-50 border-indigo-200' 
                        : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                    }`}>
                      <HelpCircle className="w-3.5 h-3.5 inline-block mr-1" /> 
                      <span>Challenge Live Now</span>
                    </span>
                    <h1 className={`text-3xl sm:text-4xl md:text-6xl leading-tight ${
                      isLightMode ? 'text-slate-900 font-black' : 'text-white'
                    }`}>
                      {questionText}
                    </h1>
                  </div>

                  {/* 4 Colored Option Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 w-full">
                    {optionsList.map((opt, idx) => {
                      const b = mcqBadges[idx % mcqBadges.length];

                      return (
                        <div 
                          key={idx} 
                          className={`p-6 md:p-8 rounded-3xl border-2 backdrop-blur-xl flex items-center text-left transition-all ${b.border} ${b.bg} ${b.glow}`}
                        >
                          <span className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black mr-6 shrink-0 shadow-lg ${b.badgeBg}`}>
                            {b.label}
                          </span>
                          <span className={`text-2xl md:text-4xl font-extrabold leading-snug break-words ${b.text}`}>
                            {opt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </main>

        {/* Footer Bar */}
        <footer className={`mt-auto text-center border-t pt-5 z-10 items-center justify-between gap-3 text-xs md:text-sm font-semibold uppercase tracking-wider ${
          isLightMode 
            ? 'border-slate-300/80 text-slate-600' 
            : 'border-white/15 text-slate-300'
        }`}>
          <p className="font-bold">
            {setupCountdown > 0 
              ? 'Get ready to lock your answers...' 
              : questionTimer === 0 
                ? 'Time Expired! Host Push The Results...' 
                : 'Answering window open! Submit on Your Device!'}
          </p>
        </footer>
      </div>
    );
  }

  return null;
}
