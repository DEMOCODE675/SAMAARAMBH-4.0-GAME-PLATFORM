import React, { useContext, useEffect, useState, useMemo } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Clock, 
  Terminal, 
  HelpCircle, 
  CheckCircle2, 
  Image as ImageIcon
} from 'lucide-react';
import StageCountdown from '../../components/StageCountdown';
import GlassAvatar from '../../components/GlassAvatar';
import SkribblStage from './components/SkribblStage';
import { 
  SamaarambhBackground, 
  SamaarambhMascots, 
  SamaarambhHeroTitle 
} from '../../components/SamaarambhTheme';

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
    <div className="absolute top-4 left-4 md:top-6 md:left-8 z-40 select-none">
      <img 
        src="/images/logo.jpg" 
        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
        alt="MLSA MIET Organizer" 
        className={`w-9 h-9 md:w-11 md:h-11 object-contain rounded-xl p-1 transition-all ${
          isLightMode 
            ? 'bg-white/95 border border-slate-300 shadow-md' 
            : 'bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
        }`}
      />
    </div>
  );
}

function SideEventStickers() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 hidden sm:block" aria-hidden="true">
      <img
        src="/images/Theme_Samaarambh 4.O (1).png"
        alt=""
        className="absolute bottom-0 left-0 h-[30vh] max-h-[300px] w-auto -translate-x-[8%] object-contain object-bottom md:h-[38vh]"
      />
      <img
        src="/images/Theme_Samaarambh 4.O.png"
        alt=""
        className="absolute bottom-0 right-0 h-[30vh] max-h-[300px] w-auto translate-x-[8%] object-contain object-bottom md:h-[38vh]"
      />
    </div>
  );
}

// Projector Photo Card with flexible max-height viewport containment and pure React state error handling
function ProjectorImageCard({ img, isSingleImage, letter, badgeClass, isLightMode }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative h-full max-h-[46vh] rounded-2xl overflow-hidden border-2 p-2 shadow-xl flex flex-col transition-all ${
      isLightMode 
        ? 'bg-white border-slate-200/90 shadow-[0_10px_25px_rgba(0,0,0,0.06)]' 
        : 'bg-slate-900/90 border-white/20'
    }`}>
      {/* Prominent Badge: Single image displays "Visual Artifact", multiple display "Image A/B/C/D" */}
      <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-md ${
        isLightMode 
          ? 'bg-white/95 border-slate-200 text-slate-900' 
          : 'bg-slate-950/85 border-white/20 text-white'
      }`}>
        {isSingleImage ? (
          <>
            <span className="w-5 h-5 rounded-md font-black text-[11px] flex items-center justify-center text-white shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600">
              <ImageIcon className="w-3 h-3" />
            </span>
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              isLightMode ? 'text-slate-800' : 'text-white'
            }`}>
              Visual Artifact
            </span>
          </>
        ) : (
          <>
            <span className={`w-5 h-5 rounded-md font-black text-[11px] flex items-center justify-center text-white shadow-sm ${badgeClass}`}>
              {letter}
            </span>
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              isLightMode ? 'text-slate-800' : 'text-white'
            }`}>
              Image {letter}
            </span>
          </>
        )}
      </div>

      <div className={`w-full h-full rounded-xl overflow-hidden flex items-center justify-center p-1.5 ${
        isLightMode ? 'bg-slate-50' : 'bg-black/60'
      }`}>
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
            <span className="text-xs font-semibold">Image Preview Unavailable</span>
          </div>
        ) : (
          <img 
            src={img} 
            alt={isSingleImage ? 'Visual Artifact' : `Artifact ${letter}`} 
            className="w-full h-full object-contain rounded-lg" 
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
  const [setupCountdown, setSetupCountdown] = useState(5); 
  const [questionTimer, setQuestionTimer] = useState(0);

  // Projector uses the fixed light theme.
  const isLightMode = true;

  const mcqBadges = useMemo(() => getMcqBadges(isLightMode), [isLightMode]);

  // Dynamic host event join URL
  const eventUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/play`;
    }
    return "https://techarena.app/play";
  }, []);

  // Fullscreen Toggle Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Fullscreen keyboard shortcut listener.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
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
      const remainingSetup = Math.min(5, Math.max(0, 5 - elapsedSeconds));

      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(questionDuration); 
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
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

  // Operator HUD Controls (Disabled UI button per preference; 'F' keyboard shortcut toggles fullscreen)
  const renderOperatorBar = () => null;

  // =========================================================================
  // VIEW 1: GRAND STANDBY / WAITING SCREEN (LOBBY & QR CODE)
  // =========================================================================
  if (!gameState || gameState.status === 'waiting' || gameState.status === 'idle' || !gameState.status) {
    return (
      <div className="h-screen h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between items-center select-none relative font-sans p-2 sm:p-4 md:p-6 bg-[#fbe99f] text-slate-900">
        <SamaarambhBackground />
        {renderOperatorBar()}

        {/* Top Header Bar on light-red band */}
        <header className="relative z-20 w-[90%] sm:w-[88%] md:w-[86%] lg:w-[84%] max-w-5xl lg:max-w-6xl xl:max-w-7xl flex items-center justify-between shrink-0 px-2 pt-1 pb-1 sm:pb-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <img 
              src="/images/logo.jpg" 
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="Logo" 
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain p-1 bg-white border border-slate-200/60 shadow-md"
            />
            <span className="font-black text-base sm:text-lg tracking-tight text-white drop-shadow-sm">
              MLSA<span className="text-amber-200">MIET</span>
            </span>
          </div>

          {/* Competitors Count Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1 sm:py-1.5 rounded-full bg-white/95 border border-white/60 shadow-md text-xs font-bold text-slate-800">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span><strong className="text-indigo-600">{playerCount}</strong> Competitors Joined</span>
          </div>
        </header>

        {/* Framed Center Card: Grand & Wide on laptop, margins on phone, 100% zero scroll */}
        <div className="relative flex-1 w-[90%] sm:w-[88%] md:w-[86%] lg:w-[84%] max-w-5xl lg:max-w-6xl xl:max-w-7xl rounded-[2.2rem] sm:rounded-[2.8rem] md:rounded-[3.2rem] border-2 sm:border-[3px] border-slate-900 bg-white text-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col justify-between overflow-hidden z-10 my-1 sm:my-2 px-4 py-3 sm:py-5 md:py-6">
          {/* Top: SAMAARAMBH 4.0 Hero Title with Sparkles */}
          <div className="relative z-20 pt-1 sm:pt-2 md:pt-4 px-4 text-center shrink-0">
            <SamaarambhHeroTitle className="text-[clamp(1.8rem,5.5vw,4.5rem)]" />
          </div>

          {/* Center: The QR Code Display & Scan CTA */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center my-auto py-2">
            {/* QR Code Container */}
            <div className="p-3 sm:p-4 rounded-3xl border-2 sm:border-4 border-indigo-200 bg-white shadow-[0_15px_35px_rgba(99,102,241,0.12)] transition-all">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(eventUrl)}&margin=4`} 
                alt="Scan to Join Event" 
                className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 lg:w-56 lg:h-56 object-contain"
              />
            </div>

            {/* Below QR: Scan CTA */}
            <div className="mt-3 text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                Scan QR to Join
              </h2>
              
            </div>
          </div>

          {/* Bottom: Footer info */}
          <footer className="relative z-20 w-full px-4 pb-1 sm:pb-2 flex items-center justify-center shrink-0 text-[10px] sm:text-xs text-slate-400 font-medium">
            <p className="text-center">
              Organized by <strong className="text-slate-800">MLSA MIET</strong>
            </p>
          </footer>
        </div>

        {/* Mascots Overlapping the bottom-left and bottom-right of the white card */}
        <SamaarambhMascots />
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
      <div className="h-screen h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col items-center justify-between px-6 py-6 md:px-12 md:py-8 lg:py-10 select-none relative font-sans bg-[#fbe99f] text-slate-900">
        <SamaarambhBackground />
        <TopLeftLogoBadge isLightMode={isLightMode} />
        <SideEventStickers />
        {renderOperatorBar()}

        {/* Header Title with guaranteed safe headroom against overscan / clipping */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.5 }} 
          className="text-center z-10 pt-2 md:pt-4 shrink-0"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-2.5 transition-all ${
            isLightMode 
              ? 'bg-white/95 border-slate-300/80 text-slate-800 shadow-sm' 
              : 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          }`}>
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{roundResultLabel}</span>
          </div>

          <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-wider transition-all ${
            isLightMode 
              ? 'text-slate-900 drop-shadow-[0_2px_12px_rgba(255,255,255,0.6)]' 
              : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 drop-shadow-[0_0_40px_rgba(245,158,11,0.4)]'
          }`}>
            {isTeamMode ? 'SQUAD GRAND RANKINGS' : 'SOLO STANDINGS'}
          </h1>
        </motion.div>

        {/* Leaderboard Grid */}
        <div className="w-full max-w-5xl space-y-3 md:space-y-3.5 z-10 my-auto">
          {leaders.length === 0 ? (
            <div className={`text-center py-16 rounded-3xl backdrop-blur-xl border transition-all ${
              isLightMode 
                ? 'bg-white/90 border-slate-200 shadow-xl' 
                : 'bg-slate-900/60 border-white/10'
            }`}>
              <Trophy className="w-14 h-14 mx-auto mb-3 text-amber-500 animate-bounce" />
              <p className={`text-xl font-bold uppercase tracking-widest ${
                isLightMode ? 'text-slate-800' : 'text-slate-300'
              }`}>
                Tabulating Arena Scores...
              </p>
              <p className="text-sm text-slate-500 mt-1">Connecting to live submission matrix</p>
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
                  ? 'border-amber-400 bg-gradient-to-r from-amber-50 via-white to-amber-100/60 text-slate-900 shadow-[0_15px_40px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50'
                  : 'border-amber-400/80 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/50 text-white shadow-[0_0_45px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40';
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
                  className={`flex justify-between items-center px-6 md:px-8 py-3 md:py-3.5 rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 ${cardStyle}`}
                >
                  <div className="flex items-center gap-3 md:gap-5">
                    {/* Rank Badge */}
                    <div className={`px-3 py-1 md:px-3.5 md:py-1.5 rounded-xl border text-xs md:text-sm font-mono flex items-center gap-1 shrink-0 ${badgeColor}`}>
                      {medalIcon && <span>{medalIcon}</span>}
                      <span>{rankText}</span>
                    </div>

                    {/* Translucent Glass Avatar */}
                    <GlassAvatar 
                      name={leader.name} 
                      seed={leader.id || leader.teamCode || leader.name} 
                      size="sm" 
                    />

                    {/* Participant / Squad Name */}
                    <div className="flex flex-col">
                      <span className={`text-xl md:text-2xl font-black tracking-wide ${
                        isLightMode ? 'text-slate-900' : 'text-white'
                      }`}>
                        {leader.name}
                      </span>
                      {!isTeamMode && (leader.teamCode || leader.teamName) && (
                        <span className={`text-xs font-semibold tracking-wider ${
                          isLightMode ? 'text-indigo-600' : 'text-indigo-300'
                        }`}>
                          Squad: {leader.teamName || (leader.teamCode ? teamsMap[leader.teamCode] : null) || 'Squad Member'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl md:text-4xl font-black tracking-wider font-mono ${scoreColor}`}>
                      {leader.score}
                    </span>
                    <span className={`text-xs md:text-sm font-bold uppercase tracking-widest ${
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
  // VIEW 3: ACTIVE PLAY / LIVE QUESTION TRANSMISSION SCREEN (ZERO-SCROLL VIEWPORT CONTAINMENT)
  // =========================================================================
  if (gameState?.status === 'playing') {
    const qData = gameState?.activeQuestion || {};
    const payload = qData.payload || {};
    const qType = qData.type || payload.type || 'mcq';

    // Special Stage UI for Live Multiplayer Skribbl Game
    if (qType === 'skribbl') {
      return (
        <div className={`h-screen max-h-screen overflow-hidden flex flex-col p-4 md:p-6 relative select-none font-sans transition-colors duration-500 ${
          isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#070b14] text-white'
        }`}>
          <TopLeftLogoBadge isLightMode={isLightMode} />
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
      <div className={`h-screen max-h-screen overflow-hidden flex flex-col justify-between p-3 md:p-4 lg:p-5 relative select-none font-sans transition-colors duration-500 ${
        isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-[#070b14] text-white'
      }`}>
        <TopLeftLogoBadge isLightMode={isLightMode} />
        {renderOperatorBar()}

        {/* Top Header Bar */}
        <header className={`shrink-0 flex justify-between items-center border-b pb-2 mb-2 z-10 pl-16 md:pl-20 ${
          isLightMode ? 'border-slate-300/80' : 'border-white/15'
        }`}>
          <div className="flex items-center gap-2 md:gap-3">
            <span className={`text-xs md:text-sm font-extrabold uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${
              isLightMode 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
            }`}>
              {qData.round || (gameState.round ? `Round ${gameState.round}` : "Samarambh 4.0")}
            </span>
            <span className={`text-xs md:text-sm font-bold tracking-wider ${
              isLightMode ? 'text-slate-700' : 'text-slate-300'
            }`}>
              Question {qData.questionNumber || qData.roundIndex || 1}
            </span>
          </div>

          {/* Submissions ticker & Timer */}
          <div className="flex items-center gap-3 md:gap-4">
            {setupCountdown === 0 && submissionCount > 0 && (
              <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs md:text-sm font-bold font-mono transition-all ${
                isLightMode 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm' 
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              }`}>
                <CheckCircle2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>{submissionCount} Submissions Locked</span>
              </div>
            )}

            {setupCountdown === 0 && (
              <div className={`px-4 py-1.5 md:px-5 md:py-2 rounded-2xl border-2 text-xl md:text-2xl font-black font-mono tracking-wider uppercase transition-all flex items-center gap-2 ${
                isTimeCritical 
                  ? (isLightMode 
                      ? 'border-rose-500 text-rose-700 bg-rose-50 animate-bounce shadow-lg shadow-rose-200' 
                      : 'border-rose-500 text-rose-400 bg-rose-950/60 animate-bounce shadow-[0_0_30px_rgba(244,63,94,0.5)]')
                  : isTimeWarning
                    ? (isLightMode 
                        ? 'border-amber-400 text-amber-800 bg-amber-50 shadow-md' 
                        : 'border-amber-400 text-amber-300 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]')
                    : (isLightMode 
                        ? 'border-indigo-300 text-indigo-900 bg-white/95 shadow-md' 
                        : 'border-indigo-400 text-indigo-300 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.3)]')
              }`}>
                <Clock className="w-5 h-5" />
                <span>{questionTimer}s</span>
              </div>
            )}
          </div>
        </header>

        {/* Central Display Area - auto-contained within remaining screen height */}
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center z-10 w-full max-w-7xl mx-auto overflow-hidden my-auto">
          {setupCountdown > 0 ? (
            /* 5-Second Countdown Before Question Is Revealed */
            <StageCountdown
              seconds={setupCountdown}
              secondsRemaining={setupCountdown}
              maxSeconds={5}
              mode="projector"
              isDarkMode={false}
              roundName={qData.round || (gameState.round ? `Round ${gameState.round}` : "Samarambh 4.0")}
              questionNumber={qData.questionNumber || qData.roundIndex || 1}
              totalQuestions={gameState.totalQuestions || 10}
              isProjector={true}
            />
          ) : (
            /* Active Live Challenge Presentation - Zero Scroll Viewport Contained */
            <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden">
              {qType === 'photo_recognize' ? (
                /* 1. VISUAL IDENTIFICATION CHALLENGE (1, 2, 3, or 4 images) */
                <motion.div 
                  initial={{ scale: 0.98, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full h-full flex flex-col justify-between items-center gap-2 md:gap-3 overflow-hidden py-1"
                >
                  {/* Question Header Card - Compact, Crisp, High Contrast */}
                  <div className={`w-full shrink-0 backdrop-blur-2xl border-2 px-5 py-2 md:py-2.5 rounded-2xl text-center shadow-lg transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)]' 
                      : 'bg-slate-900/80 border-indigo-500/40'
                  }`}>
                   
                    <h1 className={`text-xl md:text-2xl lg:text-3xl font-black leading-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      {questionText}
                    </h1>
                  </div>

                  {/* Images Display Grid - Dynamically fills remaining height */}
                  {imagesList.length > 0 && (
                    <div className={`w-full flex-1 min-h-0 grid gap-3 md:gap-4 items-center justify-center ${
                      isSingleImage 
                        ? 'grid-cols-1 max-w-3xl lg:max-w-4xl mx-auto' 
                        : imagesList.length === 2 
                          ? 'grid-cols-2 max-w-5xl mx-auto' 
                          : imagesList.length === 3 
                            ? 'grid-cols-3 max-w-6xl mx-auto' 
                            : 'grid-cols-2 md:grid-cols-4 w-full'
                    }`}>
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

                  {/* Options Display Row - Guaranteed inside viewport without clipping */}
                  {optionsList.length > 0 && (
                    <div className={`w-full shrink-0 grid gap-2.5 md:gap-3 ${
                      optionsList.length <= 2 
                        ? 'grid-cols-2 max-w-3xl mx-auto' 
                        : optionsList.length === 3 
                          ? 'grid-cols-3 max-w-5xl mx-auto' 
                          : 'grid-cols-2 md:grid-cols-4'
                    }`}>
                      {optionsList.map((opt, idx) => {
                        const b = mcqBadges[idx % mcqBadges.length];
                        return (
                          <div 
                            key={idx} 
                            className={`px-4 py-2.5 md:py-3 rounded-2xl border-2 backdrop-blur-xl flex items-center transition-all ${b.border} ${b.bg} ${b.glow}`}
                          >
                            <span className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-base md:text-lg font-black mr-3 shrink-0 shadow-sm ${b.badgeBg}`}>
                              {b.label}
                            </span>
                            <span className={`text-base md:text-xl font-extrabold truncate ${b.text}`}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : qType === 'terminal_hack' ? (
                /* 2. TERMINAL SHELL CHALLENGE */
                <motion.div 
                  initial={{ scale: 0.98, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full h-full flex flex-col justify-between items-center gap-3 overflow-hidden py-1"
                >
                  <div className={`w-full shrink-0 backdrop-blur-2xl border-2 px-6 py-3 rounded-2xl shadow-xl text-center transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-amber-300/80 shadow-[0_10px_30px_rgba(0,0,0,0.06)]' 
                      : 'bg-slate-900/80 border-amber-500/40'
                  }`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-1 ${
                      isLightMode 
                        ? 'bg-amber-100/80 border-amber-300 text-amber-900' 
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}>
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Security Incident Command Mission</span>
                    </div>
                    <h1 className={`text-xl md:text-3xl font-extrabold leading-relaxed font-mono ${
                      isLightMode ? 'text-amber-950 font-black' : 'text-amber-300'
                    }`}>
                      {questionText}
                    </h1>
                  </div>

                  {consoleText && (
                    <div className="w-full max-w-5xl flex-1 min-h-0 rounded-2xl border-2 border-slate-700 bg-[#0c1220]/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col text-left font-mono">
                      <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-xs text-slate-400">root@arena-node:~# bash</span>
                      </div>
                      <pre className="p-4 md:p-6 text-lg md:text-2xl text-emerald-400 overflow-y-auto flex-1 whitespace-pre-wrap leading-relaxed">
                        {consoleText}
                      </pre>
                    </div>
                  )}
                </motion.div>
              ) : qType === 'logic_puzzle' ? (
                /* 3. LOGIC RIDDLE / PUZZLE */
                <motion.div 
                  initial={{ scale: 0.98, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className={`w-full max-w-4xl backdrop-blur-2xl border-2 px-8 py-8 md:py-10 rounded-3xl shadow-2xl text-center space-y-4 transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.08)]' 
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
                  <h1 className={`text-2xl md:text-4xl lg:text-5xl font-extrabold leading-relaxed ${
                    isLightMode ? 'text-slate-900 font-black' : 'text-white'
                  }`}>
                    {questionText}
                  </h1>
                  <p className={`text-sm md:text-base ${
                    isLightMode ? 'text-slate-600 font-medium' : 'text-slate-400'
                  }`}>
                    Type your solution into your mobile controller before the time window expires!
                  </p>
                </motion.div>
              ) : (
                /* 4. STANDARD MULTIPLE CHOICE (MCQ) */
                <motion.div 
                  initial={{ scale: 0.98, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-full h-full flex flex-col justify-center items-center gap-4 md:gap-6 overflow-hidden my-auto"
                >
                  {/* Huge Question Text Card */}
                  <div className={`w-full shrink-0 backdrop-blur-2xl border-2 px-6 py-5 md:px-8 md:py-6 lg:py-8 rounded-3xl shadow-xl text-center transition-all ${
                    isLightMode 
                      ? 'bg-white/95 border-slate-200/90 shadow-[0_15px_40px_rgba(0,0,0,0.06)]' 
                      : 'bg-slate-900/80 border-indigo-500/40'
                  }`}>
                    <span className={`inline-block text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-md border mb-2 ${
                      isLightMode 
                        ? 'text-indigo-800 bg-indigo-50 border-indigo-200' 
                        : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                    }`}>
                      <HelpCircle className="w-3.5 h-3.5 inline-block mr-1" /> 
                      <span>Challenge Live Now</span>
                    </span>
                    <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight line-clamp-3 ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      {questionText}
                    </h1>
                  </div>

                  {/* 4 Colored Option Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-5 w-full shrink-0">
                    {optionsList.map((opt, idx) => {
                      const b = mcqBadges[idx % mcqBadges.length];

                      return (
                        <div 
                          key={idx} 
                          className={`p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl border-2 backdrop-blur-xl flex items-center text-left transition-all ${b.border} ${b.bg} ${b.glow}`}
                        >
                          <span className={`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black mr-4 md:mr-5 shrink-0 shadow-lg ${b.badgeBg}`}>
                            {b.label}
                          </span>
                          <span className={`text-xl md:text-2xl lg:text-3xl font-extrabold leading-snug break-words ${b.text}`}>
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
        <footer className={`mt-auto shrink-0 text-center border-t pt-2 md:pt-3 z-10 items-center justify-between gap-2 text-xs md:text-sm font-semibold uppercase tracking-wider ${
          isLightMode 
            ? 'border-slate-300/80 text-slate-600' 
            : 'border-white/15 text-slate-300'
        }`}>
          <p className="font-bold text-[11px] md:text-xs">
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
