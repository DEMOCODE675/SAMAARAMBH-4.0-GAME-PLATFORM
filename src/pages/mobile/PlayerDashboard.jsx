import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext'; 
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy, limit, getCountFromServer, where } from 'firebase/firestore';
import PlayerRoundReview from './components/PlayerRoundReview';
import { 
  Users, 
  User, 
  Copy, 
  Check, 
  Search, 
  LogOut, 
  Target, 
  ChevronRight,
} from 'lucide-react';
import GlassAvatar from '../../components/GlassAvatar';
import { SamaarambhBackground } from '../../components/SamaarambhTheme';

export default function PlayerDashboard({ onOpenTeam }) {
  const { player, logout } = useContext(AuthContext);
  const { gameState } = useContext(GameContext); 
  
  const [allPlayers, setAllPlayers] = useState([]);
  const [totalContributors, setTotalContributors] = useState(0);
  const [myRank, setMyRank] = useState({ rank: '-', score: 0 });

  const [allTeams, setAllTeams] = useState([]);
  const [totalTeamsCount, setTotalTeamsCount] = useState(0);
  const [myTeamRank, setMyTeamRank] = useState({ rank: '-', score: 0, teamName: '' });
  
  const [activeTab, setActiveTab] = useState('solo'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active state & search controls
  const [copiedPin, setCopiedPin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Theme state: defaults to comfortable eye-friendly Light mode
  const isDarkMode = false;

  const myPlayerRowRef = useRef(null);
  const canDisconnect = gameState?.allowDisconnect !== false;


  // 1. Real-time listener for top players + lightweight count aggregation for exact rank & total
  useEffect(() => {
    // 1a. Efficiently get total contributor count (costs only 1 read per 1,000 docs)
    getCountFromServer(collection(db, 'players'))
      .then(snap => setTotalContributors(snap.data().count))
      .catch(err => console.warn("Player count error:", err));

    const q = query(collection(db, 'players'), orderBy('score', 'desc'), limit(50));
    const unsubscribePlayers = onSnapshot(q, async (snapshot) => {
      const playersList = [];
      snapshot.forEach((docSnap) => {
        playersList.push({ id: docSnap.id, ...docSnap.data() });
      });

      setAllPlayers(playersList);

      const index = playersList.findIndex((p) => p.pin === player?.pin);
      if (index !== -1) {
        setMyRank({
          rank: index + 1,
          score: playersList[index].score ?? player?.score ?? 0
        });
      } else {
        // Player is outside top 50: compute exact rank via lightweight count query (costs only 1 read!)
        const myScore = player?.score || 0;
        try {
          const higherSnap = await getCountFromServer(
            query(collection(db, 'players'), where('score', '>', myScore))
          );
          const higherCount = higherSnap.data().count;
          setMyRank({
            rank: higherCount + 1,
            score: myScore
          });
        } catch (err) {
          console.warn("Exact rank lookup error:", err);
          setMyRank({
            rank: `${playersList.length}+`,
            score: myScore
          });
        }
      }
    }, (error) => {
      console.warn("Players listener error:", error.message);
    });

    return () => unsubscribePlayers();
  }, [player?.pin, player?.score]);

  // 2. Real-time listener for top teams + lightweight count aggregation
  useEffect(() => {
    getCountFromServer(collection(db, 'events', 'samarambh', 'teams'))
      .then(snap => setTotalTeamsCount(snap.data().count))
      .catch(err => console.warn("Teams count error:", err));

    const qTeams = query(collection(db, 'events', 'samarambh', 'teams'), orderBy('totalScore', 'desc'), limit(50));
    const unsubscribeTeams = onSnapshot(qTeams, async (snapshot) => {
      const teamsList = [];
      snapshot.forEach((docSnap) => {
        teamsList.push({ id: docSnap.id, ...docSnap.data() });
      });

      setAllTeams(teamsList);

      if (player?.teamCode) {
        const teamIndex = teamsList.findIndex((t) => t.teamCode === player.teamCode || t.id === player.teamCode);
        if (teamIndex !== -1) {
          setMyTeamRank({
            rank: teamIndex + 1,
            score: teamsList[teamIndex].totalScore || 0,
            teamName: teamsList[teamIndex].teamName || 'Your Squad'
          });
        } else {
          try {
            const teamDoc = teamsList.find(t => t.id === player.teamCode);
            const myTeamScore = teamDoc?.totalScore || 0;
            const higherSnap = await getCountFromServer(
              query(collection(db, 'events', 'samarambh', 'teams'), where('totalScore', '>', myTeamScore))
            );
            const higherCount = higherSnap.data().count;
            setMyTeamRank({
              rank: higherCount + 1,
              score: myTeamScore,
              teamName: teamDoc?.teamName || 'Your Squad'
            });
          } catch (err) {
            console.warn("Squad rank count error:", err);
          }
        }
      }
    }, (error) => {
      console.warn("Teams listener error:", error.message);
    });

    return () => unsubscribeTeams();
  }, [player?.teamCode]);

  // Compute verified total counts (lightweight fallback chain)
  const displayTotalPlayers = Math.max(totalContributors, allPlayers.length, typeof myRank.rank === 'number' ? myRank.rank : 0);
  const displayTotalTeams = Math.max(totalTeamsCount, allTeams.length, typeof myTeamRank.rank === 'number' ? myTeamRank.rank : 0);

  // Filtered lists: search ONLY by public names (Never search or reveal PINs)
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return allPlayers;
    const q = searchQuery.toLowerCase();
    return allPlayers.filter(p => p.name?.toLowerCase().includes(q));
  }, [allPlayers, searchQuery]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return allTeams;
    const q = searchQuery.toLowerCase();
    return allTeams.filter(t => t.teamName?.toLowerCase().includes(q));
  }, [allTeams, searchQuery]);

  // Copy private PIN
  const handleCopyPin = (e) => {
    e.stopPropagation();
    if (player?.pin) {
      navigator.clipboard?.writeText(player.pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // Scroll to player rank
  const handleScrollToMe = () => {
    if (myPlayerRowRef.current) {
      myPlayerRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen relative text-slate-900 selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* 3-Band Event Background Layer (Fixed behind the dashboard) */}
      <SamaarambhBackground isFixed={true} />

      {/* Left Mascot Sticker: Standing Student Presenting Leaderboard (Only on laptop/desktop in side margin) */}
      <div className="hidden xl:block fixed left-2 2xl:left-12 bottom-6 z-20 pointer-events-none select-none">
        <img 
          src="/images/Theme_Samaarambh 4.O (8).png"
          alt="Samaarambh Host"
          className="h-[40vh] 2xl:h-[48vh] max-h-[440px] w-auto object-contain object-bottom drop-shadow-2xl"
        />
      </div>

      {/* Right Mascot Sticker: Welcoming Presenter Host (Only on laptop/desktop in side margin) */}
      <div className="hidden xl:block fixed right-2 2xl:right-12 bottom-6 z-20 pointer-events-none select-none">
        <img 
          src="/images/Theme_Samaarambh 4.O (9).png"
          alt="Samaarambh Presenter"
          className="h-[40vh] 2xl:h-[48vh] max-h-[440px] w-auto object-contain object-bottom drop-shadow-2xl"
        />
      </div>

      {/* TOP HEADER BAR (STUCK TO TOP) */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm px-4 py-3 md:px-8 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Top-Left: Logo & App Title */}
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.jpg" 
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="MLSAMIET Logo" 
              className="h-10 w-10 md:h-11 md:w-11 rounded-xl object-contain p-1 border shadow-sm bg-white border-slate-200 transition-all"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm md:text-base tracking-tight">
                  MLSA<span className="text-indigo-600">MIET</span>
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right Controls */}
          <div className="flex items-center gap-2 md:gap-2.5">
            
            {/* Login PIN Chip: Always visible */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono bg-slate-100 border-slate-200 text-slate-700 transition-colors"
              title="Your personal login PIN"
            >
              <span className="text-[10px] uppercase font-sans font-semibold hidden sm:inline text-slate-500">
                Login PIN
              </span>
              <span className="font-bold tracking-widest text-indigo-600 font-mono">
                {player?.pin || '----'}
              </span>

              <button 
                onClick={handleCopyPin}
                className="p-1 hover:text-indigo-600 text-slate-400 transition-colors"
                title="Copy my PIN"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Squad Action Button */}
            <button 
              onClick={onOpenTeam}
              className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 md:py-2 md:px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {player?.teamCode ? (myTeamRank.teamName || 'Squad') : 'Squad'}
              </span>
            </button>

            {/* Disconnect Option */}
            {canDisconnect && (
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="p-2 rounded-xl border transition-colors border-transparent text-slate-400 hover:text-red-600 hover:bg-red-50"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from going behind fixed header */}
      <div className="h-[65px] md:h-[69px] w-full shrink-0" aria-hidden="true" />

      {/* MAIN CONTAINER */}
      <main className="relative max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* HERO PROFILE & SUMMARY CARD */}
        <section className={`rounded-2xl p-4 sm:p-5 md:p-6 border transition-all ${
          isDarkMode 
            ? 'bg-slate-900/60 border-slate-800' 
            : 'bg-white border-slate-200/80 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Player Avatar & Identity */}
            <div className="flex items-center gap-3.5">
              <GlassAvatar 
                name={player?.name || 'Player'} 
                seed={player?.pin || ''} 
                size="lg" 
              />
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                    {player?.name || 'Player'}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* 3 CLEAN METRIC CARDS */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-5">
            
            {/* 1. Solo Rank */}
            <div className={`p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between min-w-0 ${
              isDarkMode 
                ? 'bg-slate-950/40 border-slate-800' 
                : 'bg-slate-50 border-slate-200/80 hover:border-indigo-300'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`text-[11px] sm:text-xs font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Solo Rank</span>
              </div>
              <div className="flex items-baseline gap-1 flex-wrap sm:flex-nowrap min-w-0">
                <span className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-none">
                  {myRank.rank !== '-' ? `#${myRank.rank}` : '-'}
                </span>
                <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  / {displayTotalPlayers || '-'}
                </span>
              </div>
            </div>

            {/* 2. Total Points */}
            <div className={`p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between min-w-0 ${
              isDarkMode 
                ? 'bg-slate-950/40 border-slate-800' 
                : 'bg-slate-50 border-slate-200/80 hover:border-emerald-300'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`text-[11px] sm:text-xs font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Score</span>
              </div>
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-lg sm:text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                  {myRank.score}
                </span>
                <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>pts</span>
              </div>
            </div>

            {/* 3. Squad Status */}
            <div className={`p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between min-w-0 ${
              isDarkMode 
                ? 'bg-slate-950/40 border-slate-800' 
                : 'bg-slate-50 border-slate-200/80 hover:border-indigo-300'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`text-[11px] sm:text-xs font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Squad Rank</span>
              </div>
              {player?.teamCode ? (
                <div className="flex items-baseline gap-1 flex-wrap sm:flex-nowrap min-w-0">
                  <span className="text-lg sm:text-2xl md:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
                    {myTeamRank.rank !== '-' ? `#${myTeamRank.rank}` : '-'}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    / {displayTotalTeams || '-'}
                  </span>
                </div>
              ) : (
                <button 
                  onClick={onOpenTeam}
                  className="flex items-center gap-1 text-xs md:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
                >
                  <span>Join</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ROUND REVIEW (If active) */}
        {gameState?.status === 'leaderboard' && (
          <section className="w-full">
            <PlayerRoundReview player={player} gameState={gameState} />
          </section>
        )}

        {/* LEADERBOARD HEADER & SEARCH */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Segmented Switcher */}
            <div className={`inline-flex p-1 rounded-xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/70 border-slate-200'
            }`}>
              <button 
                onClick={() => { setActiveTab('solo'); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'solo' 
                    ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 shadow-sm') 
                    : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Solo ({displayTotalPlayers})</span>
              </button>

              <button 
                onClick={() => { setActiveTab('team'); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'team' 
                    ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 shadow-sm') 
                    : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Squads ({displayTotalTeams})</span>
              </button>
            </div>

            {/* Search Input & "My Rank" Jump */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'solo' ? "Search player name..." : "Search squad name..."}
                  className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl outline-none border transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500' 
                      : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-900 placeholder-slate-400 shadow-sm'
                  }`}
                />
              </div>

              {activeTab === 'solo' && myRank.rank !== '-' && (
                <button
                  onClick={handleScrollToMe}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-slate-800' 
                      : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm'
                  }`}
                  title="Scroll to my position"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My Rank</span>
                </button>
              )}
            </div>
          </div>

          {/* ================= TAB 1: SOLO PLAYERS ================= */}
          {activeTab === 'solo' && (
            <div className="space-y-4">
              {/* CLEAN LEADERBOARD TABLE (Strictly hides secret login PINs) */}
              <div className={`rounded-2xl border overflow-hidden transition-all ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between text-xs font-semibold ${
                  isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500 bg-slate-50/50'
                }`}>
                  <div className="flex items-center gap-6">
                    <span className="w-8 text-center">Rank</span>
                    <span>Player</span>
                  </div>
                  <span>Score</span>
                </div>

                <div className={`divide-y max-h-[460px] overflow-y-auto ${
                  isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'
                }`}>
                  {filteredPlayers.length === 0 ? (
                    <div className={`p-8 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      No players found matching "{searchQuery}".
                    </div>
                  ) : (
                    filteredPlayers.map((p) => {
                      const actualRank = allPlayers.findIndex(item => item.pin === p.pin) + 1;
                      const isMe = p.pin === player?.pin;

                      return (
                        <motion.div 
                          layout
                          key={p.id || p.pin}
                          ref={isMe ? myPlayerRowRef : null}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            layout: { type: "spring", stiffness: 350, damping: 28 },
                            duration: 0.25
                          }}
                          className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isMe 
                              ? (isDarkMode 
                                  ? 'bg-indigo-950/40 border-l-4 border-l-indigo-400 text-white' 
                                  : 'bg-indigo-50/80 border-l-4 border-l-indigo-600 text-slate-900 font-medium')
                              : (isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-700')
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className={`w-8 text-center font-bold text-xs md:text-sm shrink-0 ${
                              actualRank === 1 ? 'text-amber-500 font-extrabold' :
                              actualRank === 2 ? (isDarkMode ? 'text-slate-300' : 'text-slate-600') :
                              actualRank === 3 ? 'text-orange-500 font-extrabold' :
                              (isDarkMode ? 'text-slate-500' : 'text-slate-400')
                            }`}>
                              #{actualRank}
                            </span>

                            <GlassAvatar 
                              name={p.name} 
                              seed={p.pin || p.id} 
                              size="sm" 
                            />
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold truncate">
                                  {p.name}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded shrink-0">
                                    YOU
                                  </span>
                                )}
                              </div>
                             {/* {(() => {
                                const sName = p.teamName || allTeams.find(t => t.teamCode === p.teamCode || t.id === p.teamCode)?.teamName;
                                return (
                                  <span className={`text-[11px] truncate block ${
                                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    {p.teamCode ? (sName ? `Squad: ${sName}` : 'Squad Member') : 'Solo Player'}
                                  </span>
                                );
                              })()} */}
                            </div>
                          </div>

                          <div className="text-right pl-3 shrink-0">
                            <span className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {p.score || 0}
                            </span>
                            <span className={`text-xs ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>pts</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* If player is outside top 50 list, display their pinned rank banner */}
              {!allPlayers.some(p => p.pin === player?.pin) && player && myRank.rank !== '-' && (
                <div className={`p-3.5 px-4 rounded-xl border flex items-center justify-between text-xs shadow-sm ${
                  isDarkMode 
                    ? 'bg-indigo-950/40 border-indigo-800/80 text-white' 
                    : 'bg-indigo-50/90 border-indigo-200 text-indigo-950 font-medium'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-indigo-400">#{myRank.rank}</span>
                    <GlassAvatar name={player.name} seed={player.pin} size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{player.name}</span>
                        <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">YOU</span>
                      </div>
                     
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-500 text-sm">{myRank.score}</span>
                    <span className="text-[10px] ml-1 text-slate-400">pts</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: SQUADS ================= */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              
              {/* If user has no squad, display clean invitation card */}
              {!player?.teamCode && (
                <div className={`p-4 md:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800' 
                    : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Competing Individually</h4>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Join or create a team squad to battle together.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={onOpenTeam}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Create / Join Squad
                  </button>
                </div>
              )}

              {/* Complete Squads Table */}
              <div className={`rounded-2xl border overflow-hidden transition-all ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
              }`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between text-xs font-semibold ${
                  isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500 bg-slate-50/50'
                }`}>
                  <div className="flex items-center gap-6">
                    <span className="w-8 text-center">Rank</span>
                    <span>Squad Name</span>
                  </div>
                  <span>Combined Score</span>
                </div>

                <div className={`divide-y max-h-[460px] overflow-y-auto ${
                  isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'
                }`}>
                  {filteredTeams.length === 0 ? (
                    <div className={`p-8 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {allTeams.length === 0 ? 'No squads registered yet.' : `No squads found matching "${searchQuery}".`}
                    </div>
                  ) : (
                    filteredTeams.map((t) => {
                      const actualRank = allTeams.findIndex(item => item.id === t.id || item.teamCode === t.teamCode) + 1;
                      const isMyTeam = t.teamCode === player?.teamCode || t.id === player?.teamCode;

                      return (
                        <motion.div 
                          layout
                          key={t.id || t.teamCode}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            layout: { type: "spring", stiffness: 350, damping: 28 },
                            duration: 0.25
                          }}
                          className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isMyTeam 
                              ? (isDarkMode 
                                  ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400 text-white' 
                                  : 'bg-emerald-50/80 border-l-4 border-l-emerald-600 text-slate-900 font-medium')
                              : (isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-700')
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className={`w-8 text-center font-bold text-xs md:text-sm shrink-0 ${
                              actualRank === 1 ? 'text-amber-500 font-extrabold' :
                              actualRank === 2 ? (isDarkMode ? 'text-slate-300' : 'text-slate-600') :
                              actualRank === 3 ? 'text-orange-500 font-extrabold' :
                              (isDarkMode ? 'text-slate-500' : 'text-slate-400')
                            }`}>
                              #{actualRank}
                            </span>
                            
                            <GlassAvatar 
                              name={t.teamName} 
                              seed={t.teamCode || t.id} 
                              size="sm" 
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold truncate">
                                  {t.teamName}
                                </span>
                                {isMyTeam && (
                                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded shrink-0">
                                    YOUR SQUAD
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] truncate block ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                {isMyTeam ? 'Your Active Squad' : 'Registered Squad'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right pl-3 shrink-0">
                            <span className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {t.totalScore || 0}
                            </span>
                            <span className={`text-xs ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>pts</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div 
          onClick={() => setShowLogoutModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative border rounded-2xl max-w-sm w-full p-6 pt-7 text-center space-y-4 shadow-2xl transition-all ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* 10th Mascot Sticker perched on top of modal */}
            <div className="absolute -top-24 sm:-top-28 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10">
              <img 
                src="/images/Theme_Samaarambh 4.O (10).png" 
                alt="Student Mascot" 
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
              />
            </div>

            <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Disconnect Session?</h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Your score and rank are saved under your <span className="font-bold text-indigo-600 dark:text-indigo-400">Login PIN</span>. You can reconnect anytime with your Login PIN to continue competing. Disconnecting will log-out of this session.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className={`flex-1 text-xs font-semibold py-2.5 rounded-xl border transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
