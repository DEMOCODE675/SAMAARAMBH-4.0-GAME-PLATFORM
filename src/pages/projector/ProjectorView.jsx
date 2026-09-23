import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function ProjectorView() {
  const { gameState } = useContext(GameContext);
  const [leaders, setLeaders] = useState([]);
  
  const [setupCountdown, setSetupCountdown] = useState(5); 
  const [questionTimer, setQuestionTimer] = useState(0);

  const eventUrl = "https://SAMARAMBH_event.com"; 

  useEffect(() => {
    if (gameState?.status !== 'playing' || !gameState?.updatedAt) return;

    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();
    const questionDuration = gameState.activeQuestion?.timeLimit || 20;

    const updateTimers = () => {
      const nowMs = Date.now();
      const elapsedSeconds = Math.floor((nowMs - updatedAtMs) / 1000);

      const remainingSetup = 5 - elapsedSeconds;
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(questionDuration); 
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = questionDuration - activeElapsed;
        setQuestionTimer(remainingQuestionTime <= 0 ? 0 : remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, gameState?.status, gameState?.activeQuestion]);

  useEffect(() => {
    if (gameState?.status !== 'leaderboard') return;
    const isTeamMode = gameState.gameMode === 'team';
    const collectionPath = isTeamMode ? 'events/samarambh/teams' : 'players';
    
    const unsubscribe = onSnapshot(collection(db, collectionPath), (snapshot) => {
      let results = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          name: isTeamMode ? data.teamName : data.name,
          score: isTeamMode ? (data.totalScore || 0) : (data.score || 0) 
        });
      });
      results.sort((a, b) => b.score - a.score);
      setLeaders(results.slice(0, 5));
    });

    return () => unsubscribe();
  }, [gameState?.status, gameState?.gameMode]);

  // 🏷️ TOP-LEFT LOGO BADGE
  const TopLeftLogoBadge = () => (
    <div className="absolute top-6 left-6 z-50 bg-black/40 backdrop-blur-md border border-fuchsia-500/30 p-2 rounded-2xl shadow-[0_0_20px_rgba(217,70,239,0.2)] select-none">
      <img 
        src="/images/logo.jpg" 
        alt="MLSA MIET Organizer" 
        className="w-12 h-12 md:w-16 md:h-16 object-contain rounded-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
      />
    </div>
  );

  // ================= 1. VIEW 1: STANDBY / WAITING SCREEN =================
  if (!gameState || gameState.status === 'waiting' || gameState.status === 'idle' || !gameState.status) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-8 text-center select-none overflow-hidden relative">
        <TopLeftLogoBadge />

        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-45 scale-105">
            <source src="/videos/firstbag.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/40"></div>
        </div>

        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="mb-10 z-10">
          <h2 className="text-2xl text-amber-300 tracking-[0.4em] uppercase font-bold mb-2">TechArena Live Event</h2>
          <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-amber-300 to-orange-400 tracking-wider drop-shadow-[0_0_50px_rgba(232,60,180,0.6)]">
            SAMARAMBH 4.0
          </h1>
        </motion.div>

        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-5xl bg-gray-950/85 backdrop-blur-md border-4 border-fuchsia-500/80 p-10 md:p-14 rounded-3xl shadow-[0_0_80px_rgba(232,60,180,0.3)] grid grid-cols-1 md:grid-cols-2 items-center gap-10 z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
        
            <p className="text-2xl md:text-3xl font-bold text-gray-300 tracking-wider">Join via Link:</p>
            <p className="text-3xl md:text-4xl font-black text-amber-400 tracking-wide break-all underline decoration-fuchsia-500 underline-offset-8">
              {eventUrl}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.25)] max-w-[280px] mx-auto w-full">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(eventUrl)}`} alt="Scan to Join Game" className="w-48 h-48 md:w-56 md:h-56 object-contain" />
            <span className="text-black font-black text-[11px] uppercase tracking-widest mt-3">Scan QR Code to Join</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="mt-10 z-10">
          <p className="text-center text-gray-400 text-sm">
            Need help? Contact the event host for assistance.
          </p>
        </motion.div>
      </div>
    );
  }

  // ================= 2. VIEW 2: LEADERBOARD SCREEN =================
  if (gameState?.status === 'leaderboard') {
    const isTeamMode = gameState.gameMode === 'team';
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center p-12 overflow-hidden relative">
        <TopLeftLogoBadge />

        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-40 scale-105 filter contrast-125 saturate-150">
            <source src="/videos/firstbag.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f051d]/95 via-black/70 to-[#0f051d]/85"></div>
        </div>

        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="text-center mb-16 pt-8 z-10">
          <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-amber-300 to-orange-400 tracking-widest drop-shadow-[0_0_30px_rgba(232,60,180,0.4)]">
            {isTeamMode ? 'SQUAD RANKINGS' : 'SOLO RANKINGS'}
          </h1>
        </motion.div>

        <div className="w-full max-w-5xl space-y-6 z-10">
          {leaders.length === 0 ? (
            <div className="text-center py-24 bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-md">
              <p className="text-3xl text-gray-500 animate-pulse uppercase tracking-widest">Tabulating telemetry data...</p>
            </div>
          ) : (
            leaders.map((leader, index) => {
              let borderStyle = 'border-gray-800 bg-gray-950/80 text-gray-400';
              let rankBadge = `#${index + 1}`;
              
              if (index === 0) { 
                borderStyle = 'border-amber-500 bg-gradient-to-r from-amber-950/40 to-gray-950 text-amber-300 shadow-[0_0_40px_rgba(234,179,8,0.25)] scale-[1.02]'; 
                rankBadge = '🥇 01'; 
              } else if (index === 1) { 
                borderStyle = 'border-fuchsia-400 bg-gradient-to-r from-gray-900 to-gray-950 text-gray-200 shadow-[0_0_25px_rgba(232,60,180,0.15)]'; 
                rankBadge = '🥈 02'; 
              } else if (index === 2) { 
                borderStyle = 'border-orange-700 bg-gradient-to-r from-orange-950/30 to-gray-950 text-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.15)]'; 
                rankBadge = '🥉 03'; 
              }

              return (
                <motion.div key={leader.id} initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: index * 0.1 }} className={`flex justify-between items-center px-10 py-6 rounded-2xl border-2 transition-all duration-300 backdrop-blur-md ${borderStyle}`}>
                  <div className="flex items-center gap-8">
                    <span className="text-4xl font-black w-24 tracking-wider">{rankBadge}</span>
                    <div className="flex flex-col">
                      <span className="text-4xl font-bold tracking-wide text-white">{leader.name}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black tracking-wider text-amber-400 drop-shadow-[0_0_10px_rgba(232,60,180,0.3)]">{leader.score}</span>
                    <span className="text-xl font-bold text-gray-500 uppercase tracking-widest">pts</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ================= 3. VIEW 3: ACTIVE PLAY / QUESTION SCREEN =================
  if (gameState?.status === 'playing') {
    // Fallback support if activeQuestion is stored directly or inside payload
    const qData = gameState?.activeQuestion || {};
    const questionText = qData.question || qData.payload?.question || "Check your device for the active challenge!";
    const optionsList = qData.options || qData.payload?.options || [];
    const missionText = qData.missionText || qData.payload?.missionText || "";
    const consoleText = qData.consoleText || qData.payload?.consoleText || "";
    const qType = qData.type || 'mcq';
    const isTeamMode = gameState?.gameMode === 'team';

    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col p-8 md:p-12 relative overflow-hidden justify-between">
        <TopLeftLogoBadge />

        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-35 scale-105 filter contrast-125 saturate-150">
            <source src="/videos/firstbag.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f051d]/95 via-black/80 to-[#0f051d]/90"></div>
        </div>

        {/* Top Header */}
        <div className="flex justify-between items-center border-b-2 border-fuchsia-900/60 pb-6 mb-8 z-10 pt-4 md:pt-0">
          <div className="flex items-center gap-6 pl-28 md:pl-0">
            <div className="w-8 h-8 bg-rose-600 rounded-full animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.8)]"></div>
           
          </div>
          
          {setupCountdown === 0 ? (
            <div className={`px-6 py-2 md:px-8 md:py-3 border-4 rounded-xl text-2xl md:text-3xl font-extrabold tracking-widest uppercase ${
              questionTimer <= 5 ? 'border-red-600 text-red-500 bg-red-950/40 animate-bounce' : 'border-amber-400 text-amber-300'
            }`}>
              Time Left: {questionTimer}s
            </div>
          ) : (
            <div className="px-6 py-2 md:px-8 md:py-3 border-4 border-amber-400 text-amber-300 rounded-xl text-2xl md:text-3xl font-extrabold uppercase animate-pulse">
              Deploying in: {setupCountdown}s
            </div>
          )}

          <div className={`px-6 py-2 md:px-8 md:py-3 border-4 rounded-xl text-2xl md:text-3xl font-bold uppercase ${isTeamMode ? 'border-fuchsia-500 text-fuchsia-400' : 'border-violet-500 text-violet-400'}`}>
            {isTeamMode ? 'Team Mode' : 'Solo Mode'}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col items-center justify-center z-10 my-auto w-full max-w-7xl mx-auto">
          {setupCountdown > 0 ? (
            <div className="text-center">
              <div className="text-9xl font-black text-amber-300 mb-6 animate-pulse drop-shadow-[0_0_35px_rgba(251,191,36,0.5)]">
                {setupCountdown}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-200 tracking-widest uppercase">
                Incoming Transmission...
              </h1>
            </div>
          ) : (
            <>
              {qType !== 'terminal_hack' ? (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full flex flex-col items-center">
                  <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-12 text-center leading-relaxed border-l-8 border-fuchsia-500 pl-6 md:pl-10 bg-black/40 backdrop-blur-md p-6 rounded-2xl w-full shadow-2xl">
                    {questionText}
                  </h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
                    {(optionsList).map((opt, idx) => (
                      <div key={idx} className="bg-[#120724]/90 border-4 border-fuchsia-900/60 p-6 md:p-8 rounded-2xl flex items-center text-left backdrop-blur-md shadow-2xl">
                        <span className="text-3xl md:text-4xl font-black text-fuchsia-400/60 mr-6">[{idx + 1}]</span>
                        <span className="text-2xl md:text-4xl font-bold text-fuchsia-200">{opt}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full flex flex-col items-center">
                  <h1 className="text-3xl md:text-5xl text-amber-400 mb-8 font-bold text-center border-b-4 border-amber-900/60 pb-6">
                    Mission: {missionText || questionText}
                  </h1>
                  <div className="bg-gray-950/95 border-4 border-amber-900/80 p-8 rounded-2xl w-full shadow-2xl backdrop-blur-md">
                    <pre className="text-2xl md:text-4xl text-amber-300 font-mono whitespace-pre-wrap">{consoleText}</pre>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Footer Status */}
        <div className="mt-auto text-center border-t-2 border-fuchsia-900/60 pt-6 z-10">
          <p className="text-2xl md:text-4xl text-gray-300 uppercase tracking-widest font-bold">
            {setupCountdown > 0 ? 'Get ready to read the question...' : questionTimer === 0 ? 'TIME EXPIRED!' : 'Answering window is open! Lock in your answer!'}
          </p>
        </div>

      </div>
    );
  }

  return null;
}