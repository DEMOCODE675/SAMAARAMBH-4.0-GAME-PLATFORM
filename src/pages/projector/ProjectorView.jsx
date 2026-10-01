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
  Image as ImageIcon
} from 'lucide-react';
import StageCountdown from '../../components/StageCountdown';
import GlassAvatar from '../../components/GlassAvatar';
import SkribblStage from './components/SkribblStage';

// Option badge designs with high-contrast big-screen presence
const MCQ_BADGES = [
  { 
    label: 'A', 
    border: 'border-rose-500/70', 
    bg: 'bg-rose-950/50', 
    badgeBg: 'bg-rose-600 text-white shadow-rose-600/50', 
    text: 'text-rose-100',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.25)]'
  },
  { 
    label: 'B', 
    border: 'border-blue-500/70', 
    bg: 'bg-blue-950/50', 
    badgeBg: 'bg-blue-600 text-white shadow-blue-600/50', 
    text: 'text-blue-100',
    glow: 'shadow-[0_0_35px_rgba(59,130,246,0.25)]'
  },
  { 
    label: 'C', 
    border: 'border-amber-500/70', 
    bg: 'bg-amber-950/50', 
    badgeBg: 'bg-amber-600 text-white shadow-amber-600/50', 
    text: 'text-amber-100',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,0.25)]'
  },
  { 
    label: 'D', 
    border: 'border-emerald-500/70', 
    bg: 'bg-emerald-950/50', 
    badgeBg: 'bg-emerald-600 text-white shadow-emerald-600/50', 
    text: 'text-emerald-100',
    glow: 'shadow-[0_0_35px_rgba(16,185,129,0.25)]'
  }
];

// Top-Left Brand Logo Badge (declared outside to avoid React re-creation in render)
function TopLeftLogoBadge() {
  return (
    <div className="absolute top-6 left-6 z-40 select-none">
      <img 
        src="/images/logo.jpg" 
        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
        alt="MLSA MIET Organizer" 
        className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-xl p-1 bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
      />
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
    
    // Auto Mode:
    // When in Leaderboard view, play leaderboardsolo.mp4
    // When in Waiting / Playing view, play firstbag.mp4
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

  // Keyboard shortcut listener ('F' for fullscreen, 'V' to toggle video mode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'v' || e.key === 'V') {
        setVideoMode(prev => prev === 'auto' ? 'leaderboard' : prev === 'leaderboard' ? 'firstbag' : 'auto');
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
        className="w-full h-full object-cover scale-105 filter contrast-110 saturate-125 transition-opacity duration-1000 opacity-45"
      >
        <source src={currentVideoSrc} type="video/mp4" />
        <source src="/videos/leaderboardsolo.mp4" type="video/mp4" />
        <source src="/videos/firstbag.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Stage Vignettes & Gradient Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/85 to-[#070b14]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)]" />
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
            className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl border border-white/20 p-1.5 rounded-2xl shadow-2xl text-xs text-slate-300"
          >
            <div className="flex items-center gap-1 px-2 font-mono text-[11px] text-amber-400">
              <Video className="w-3.5 h-3.5" />
              <span>BG:</span>
            </div>

            <button
              onClick={() => setVideoMode('auto')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                videoMode === 'auto' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
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
                  : 'hover:bg-white/10 text-slate-400'
              }`}
              title="/videos/leaderboardsolo.mp4"
            >
              Vid 2
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleFullscreen}
        className="p-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-xl border border-white/20 text-white rounded-2xl shadow-xl transition-all active:scale-95"
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
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-between p-8 md:p-14 select-none overflow-hidden relative font-sans">
        <TopLeftLogoBadge />
        {renderBackgroundVideo()}
        {renderOperatorBar()}

        {/* Top Status Pill */}
        <div className="z-10 pt-2 flex items-center gap-2">
          {/*<div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Arena Lobby Live</span>
          </div>*/}

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wider">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
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
            {/*<div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs md:text-sm font-bold uppercase tracking-[0.3em] mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>State-Level Annual Tech Symposium</span>
            </div>*/}

            <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-amber-200 drop-shadow-[0_0_60px_rgba(99,102,241,0.5)]">
              SAMARAMBH 4.0
            </h1>
            
          </motion.div>

          {/* Join Instructions & QR Code Card */}
          <motion.div 
            initial={{ scale: 0.94, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.6, delay: 0.2 }} 
            className="w-full max-w-4xl bg-slate-900/70 backdrop-blur-2xl border-2 border-indigo-500/40 p-8 md:p-12 rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.25)] grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12"
          >
            {/* Left Instructions */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30">
                Live Registration
              </span>

              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Scan QR or Visit Link to Join
              </h2>

             {/* <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                Connect your mobile phone to the competition grid. Enter your assigned PIN to join your squad or solo ranking.
              </p> */}

              <div className="w-full pt-5">
  <div className="p-3.5 rounded-xl bg-black/60 border border-white/15 text-amber-300 font-mono text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate shadow-inner">
    {eventUrl}
  </div>
</div>
            </div>

            {/* Right QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-5 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.3)] border-4 border-indigo-400/50">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(eventUrl)}&margin=4`} 
                  alt="Scan to Join Event" 
                  className="w-48 h-48 md:w-56 md:h-56 object-contain"
                />
              </div>
              {/* <div className="flex items-center gap-2 mt-4 text-xs font-bold uppercase tracking-widest text-slate-300">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Instant Mobile Camera Scan</span>
              </div> */}
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="z-10 text-center text-xs md:text-sm text-slate-400 font-medium">
          Organized by <strong className="text-white">Microsoft Learn Student Ambassadors MIET</strong> · Powered by TechArena
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
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-between p-8 md:p-12 overflow-hidden relative select-none font-sans">
        <TopLeftLogoBadge />
        {renderBackgroundVideo()}
        {renderOperatorBar()}

        {/* Header Title */}
        <motion.div 
          initial={{ y: -40, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.6 }} 
          className="text-center z-10 pt-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{roundResultLabel}</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 drop-shadow-[0_0_40px_rgba(245,158,11,0.4)]">
            {isTeamMode ? 'SQUAD GRAND RANKINGS' : 'SOLO STANDINGS'}
          </h1>
        </motion.div>

        {/* Leaderboard Grid */}
        <div className="w-full max-w-5xl space-y-3.5 z-10 my-auto">
          {leaders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-xl">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400 animate-bounce" />
              <p className="text-2xl text-slate-300 font-bold uppercase tracking-widest">
                Tabulating Arena Scores...
              </p>
              <p className="text-sm text-slate-500 mt-2">Connecting to live submission matrix</p>
            </div>
          ) : (
            leaders.map((leader, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              let cardStyle = 'border-white/10 bg-slate-900/60 text-slate-300';
              let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
              let rankText = `#0${index + 1}`;
              let medalIcon = null;

              if (isFirst) {
                cardStyle = 'border-amber-400/80 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/50 text-white shadow-[0_0_45px_rgba(245,158,11,0.35)] scale-[1.02] ring-2 ring-amber-400/40';
                badgeColor = 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-[0_0_20px_rgba(245,158,11,0.6)]';
                rankText = '1ST';
                medalIcon = '🥇';
              } else if (isSecond) {
                cardStyle = 'border-slate-300/60 bg-gradient-to-r from-slate-800/80 via-slate-900/90 to-slate-800/60 text-white shadow-[0_0_30px_rgba(203,213,225,0.2)]';
                badgeColor = 'bg-slate-300 text-slate-950 border-white font-bold shadow-[0_0_15px_rgba(203,213,225,0.5)]';
                rankText = '2ND';
                medalIcon = '🥈';
              } else if (isThird) {
                cardStyle = 'border-amber-700/60 bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-amber-950/30 text-white shadow-[0_0_25px_rgba(180,83,9,0.2)]';
                badgeColor = 'bg-amber-700 text-white border-amber-600 font-bold';
                rankText = '3RD';
                medalIcon = '🥉';
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

                    {/* Translucent Glass Avatar with unique colorway */}
                    <GlassAvatar 
                      name={leader.name} 
                      seed={leader.id || leader.teamCode || leader.name} 
                      size="md" 
                    />

                    {/* Participant / Squad Name */}
                    <div className="flex flex-col">
                      <span className="text-2xl md:text-3xl font-extrabold tracking-wide text-white">
                        {leader.name}
                      </span>
                      {!isTeamMode && (leader.teamCode || leader.teamName) && (
                        <span className="text-xs md:text-sm font-semibold text-indigo-300 tracking-wider">
                          Squad: {leader.teamName || (leader.teamCode ? teamsMap[leader.teamCode] : null) || 'Squad Member'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl md:text-5xl font-black tracking-wider text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] font-mono">
                      {leader.score}
                    </span>
                    <span className="text-sm md:text-base font-bold text-slate-400 uppercase tracking-widest">
                      PTS
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer */}
       {/* <div className="z-10 text-center text-xs md:text-sm text-slate-400 font-medium">
          Samarambh 4.0 · Live Stage Leaderboard
        </div>*/}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE PLAY / LIVE QUESTION TRANSMISSION SCREEN
  // =========================================================================
  if (gameState?.status === 'playing') {
    const qData = gameState?.activeQuestion || {};
    const payload = qData.payload || {};
    const qType = qData.type || 'mcq';

    // SKRIBBL DRAW & GUESS: takes over the stage with its canvas, hint, and live guess feed
    if (qType === 'skribbl') {
      return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col p-6 md:p-10 relative overflow-hidden select-none font-sans">
          <TopLeftLogoBadge />
          {renderBackgroundVideo()}
          {renderOperatorBar()}
          <SkribblStage
            activeQ={qData}
            gameState={gameState}
            playerCount={playerCount}
            embedded
          />
        </div>
      );
    }

    // Extract challenge contents across formats
    const questionText = qData.question || payload.question || payload.prompt || payload.missionText || payload.puzzleText || "Check your device for the active challenge!";
    const optionsList = qData.options || payload.options || [];
    const imagesList = payload.images || (payload.imageUrl ? [payload.imageUrl] : []);
    const consoleText = payload.consoleText || "";

    const isTimeCritical = questionTimer <= 5;
    const isTimeWarning = questionTimer <= 10 && questionTimer > 5;

    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between p-8 md:p-12 relative overflow-hidden select-none font-sans">
        <TopLeftLogoBadge />
        {renderBackgroundVideo()}
        {renderOperatorBar()}

        {/* Top Header Bar */}
        <header className="flex justify-between items-center border-b border-white/15 pb-6 mb-6 z-10 pl-24 md:pl-0">
          <div className="flex items-center gap-3">
           {/* <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />*/}
          </div>

          {/* Submissions ticker & Timer */}
          <div className="flex items-center gap-4">
            {setupCountdown === 0 && submissionCount > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold font-mono shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{submissionCount} Submissions Locked</span>
              </div>
            )}

            {setupCountdown === 0 && (
              <div className={`px-6 py-2.5 rounded-2xl border-2 text-2xl md:text-3xl font-black font-mono tracking-wider uppercase transition-all flex items-center gap-2.5 ${
                isTimeCritical 
                  ? 'border-rose-500 text-rose-400 bg-rose-950/60 animate-bounce shadow-[0_0_30px_rgba(244,63,94,0.5)]' 
                  : isTimeWarning
                    ? 'border-amber-400 text-amber-300 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'border-indigo-400 text-indigo-300 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
              }`}>
                <Clock className="w-6 h-6" />
                <span>{questionTimer}s</span>
              </div>
            )}
          </div>
        </header>

        {/* Central Display Area */}
        <main className="flex-grow flex flex-col items-center justify-center z-10 my-auto w-full max-w-7xl mx-auto py-4">
          {setupCountdown > 0 ? (
            /* CINEMA-GRADE INCOMING TRANSMISSION COUNTDOWN */
            <StageCountdown
              seconds={setupCountdown}
              maxSeconds={10}
              mode="projector"
              badgeText="Incoming Arena Challenge"
              title="Incoming Arena Challenge"
              subtitle="Contestants, look at your mobile controllers! Fast responses receive maximum speed bonuses."
              timeWindow={qData.timeLimit || 20}
              brandName="Samarambh 4.0"
            />
          ) : (
            /* ACTIVE QUESTION CONTENT BASED ON CHALLENGE TYPE */
            <div className="w-full">
              {/* 1. VISUAL INSPECTION / PHOTO RECOGNIZE */}
              {qType === 'photo_recognize' ? (
                <motion.div 
                  initial={{ scale: 0.96, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full flex flex-col items-center space-y-6"
                >
                  <div className="w-full bg-slate-900/80 backdrop-blur-2xl border-2 border-indigo-500/40 p-6 md:p-8 rounded-3xl shadow-2xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Visual Evidence Inspection</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-relaxed">
                      {questionText}
                    </h1>
                  </div>

                  {imagesList.length > 0 && (
                    <div className={`grid ${imagesList.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-6 w-full max-w-5xl`}>
                      {imagesList.map((img, i) => {
                        const letter = String.fromCharCode(65 + i);
                        return (
                          <div key={i} className="relative h-64 md:h-80 bg-black/60 rounded-3xl overflow-hidden border-2 border-white/20 p-2 shadow-2xl">
                            {/* Prominent Image A / B Badge */}
                            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-white/20 backdrop-blur-md shadow-xl">
                              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                                {letter}
                              </span>
                              <span className="text-white text-xs font-bold uppercase tracking-wider">
                                Image {letter}
                              </span>
                            </div>
                            <img 
                              src={img} 
                              alt={`Artifact ${letter}`} 
                              className="w-full h-full object-contain rounded-2xl" 
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {optionsList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                      {optionsList.map((opt, idx) => {
                        const b = MCQ_BADGES[idx % MCQ_BADGES.length];
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
                  <div className="w-full bg-slate-900/80 backdrop-blur-2xl border-2 border-amber-500/40 p-6 md:p-8 rounded-3xl shadow-2xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Security Incident Command Mission</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-extrabold text-amber-300 leading-relaxed font-mono">
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
                  className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-2xl border-2 border-indigo-500/40 p-8 md:p-12 rounded-3xl shadow-2xl text-center space-y-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Logic Riddle Decryption</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-relaxed">
                    {questionText}
                  </h1>
                  <p className="text-sm md:text-base text-slate-400">
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
                  <div className="w-full bg-slate-900/80 backdrop-blur-2xl border-2 border-indigo-500/40 p-8 md:p-12 rounded-3xl shadow-2xl text-center">
                    <span className="inline-block text-xs uppercase font-extrabold tracking-widest text-indigo-400 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 mb-3">
                      <HelpCircle className="w-3.5 h-3.5 inline-block mr-1" /> 
                      <span>Challenge Live Now</span>
                    </span>
                    <h1 className="text-3xl sm:text-4xl md:text-6xl  text-white leading-tight">
                      {questionText}
                    </h1>
                  </div>

                  {/* 4 Colored Option Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 w-full">
                    {optionsList.map((opt, idx) => {
                      const b = MCQ_BADGES[idx % MCQ_BADGES.length];

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
        <footer className="mt-auto text-center border-t border-white/15 pt-5 z-10  items-center justify-between gap-3 text-xs md:text-sm text-slate-300 font-semibold uppercase tracking-wider">
          {/*<div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Samarambh 4.0 Live Session</span>
          </div>*/}

          <p className="font-bold">
            {setupCountdown > 0 
              ? 'Get ready to lock your answers...' 
              : questionTimer === 0 
                ? 'Time Expired! Host Push The Results...' 
                : 'Answering window open! Submit on Your Device!'}
          </p>

          {/*<div className="text-slate-400 text-xs font-mono">
            Press [F] Fullscreen
          </div>*/}
        </footer>

      </div>
    );
  }

  return null;
}
