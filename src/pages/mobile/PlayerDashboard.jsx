import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext'; 
import { db } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function PlayerDashboard({ onOpenTeam }) {
  const { player, logout } = useContext(AuthContext);
  const { gameState } = useContext(GameContext); 
  
  const [allPlayers, setAllPlayers] = useState([]);
  const [myRank, setMyRank] = useState({ rank: '-', score: 0 });

  const [allTeams, setAllTeams] = useState([]);
  const [myTeamRank, setMyTeamRank] = useState({ rank: '-', score: 0, teamName: '' });
  const [activeTab, setActiveTab] = useState('solo'); 

  const canDisconnect = gameState?.allowDisconnect !== false;

  // 1. Real-time listener for players
  useEffect(() => {
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      let playersList = [];
      snapshot.forEach((doc) => {
        playersList.push({ id: doc.id, ...doc.data() });
      });

      playersList.sort((a, b) => (b.score || 0) - (a.score || 0));
      setAllPlayers(playersList);

      const index = playersList.findIndex((p) => p.pin === player.pin);
      if (index !== -1) {
        setMyRank({
          rank: index + 1,
          score: playersList[index].score || 0
        });
      }
    });

    return () => unsubscribePlayers();
  }, [player?.pin]);

  // 2. Real-time listener for teams
  useEffect(() => {
    const unsubscribeTeams = onSnapshot(collection(db, 'events', 'samarambh', 'teams'), (snapshot) => {
      let teamsList = [];
      snapshot.forEach((doc) => {
        teamsList.push({ id: doc.id, ...doc.data() });
      });

      teamsList.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      setAllTeams(teamsList);

      if (player?.teamCode) {
        const teamIndex = teamsList.findIndex((t) => t.teamCode === player.teamCode || t.id === player.teamCode);
        if (teamIndex !== -1) {
          setMyTeamRank({
            rank: teamIndex + 1,
            score: teamsList[teamIndex].totalScore || 0,
            teamName: teamsList[teamIndex].teamName || 'Your Squad'
          });
        }
      }
    });

    return () => unsubscribeTeams();
  }, [player?.teamCode]);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4 md:p-10 flex flex-col items-center justify-start">
      
      {/* WRAPPER CONTAINER: Max width expands gracefully on laptops */}
      <div className="w-full max-w-sm md:max-w-5xl mx-auto flex flex-col">

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-6">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Active Operative Terminal</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-cyan-400 mt-1">{player.name}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase block">Sync PIN</span>
              <span className="text-xl font-bold text-white tracking-widest">{player.pin}</span>
            </div>
            <button 
              onClick={onOpenTeam}
              className="bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-extrabold py-3 px-5 rounded-xl uppercase tracking-wider transition-all"
            >
              {player?.teamCode ? '🛡️ Squad Room' : '➕ Join Squad'}
            </button>
          </div>
        </div>

        {/* MODE SELECTOR TABS */}
        <div className="w-full flex bg-gray-900 rounded-xl p-1.5 border border-gray-800 mb-8 max-w-md mx-auto md:mx-0">
          <button 
            onClick={() => setActiveTab('solo')} 
            className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'solo' ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Solo Standings
          </button>
          <button 
            onClick={() => setActiveTab('team')} 
            className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'team' ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Team Standings
          </button>
        </div>

        {/* ================= TAB 1: SOLO VIEW (EXPANDED GRID FOR LAPTOPS) ================= */}
        {activeTab === 'solo' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Personal Standing Card */}
            <div className="md:col-span-1 flex flex-col gap-6">
              <div className="w-full bg-gradient-to-br from-cyan-950 to-gray-900 border-2 border-cyan-500 p-6 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.2)] flex md:flex-col justify-between items-center md:items-start">
                <div className="mb-0 md:mb-4">
                  <span className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Your Global Rank</span>
                  <h2 className="text-4xl md:text-6xl font-black text-white mt-2">#{myRank.rank}</h2>
                </div>
                <div className="text-right md:text-left">
                  <span className="text-3xl md:text-5xl font-black text-cyan-300">{myRank.score}</span>
                  <span className="text-xs text-gray-400 uppercase block tracking-widest mt-1">Total Points</span>
                </div>
              </div>

              {/* Session Control Footer inside column */}
             {/* <div className="hidden md:block bg-gray-950 border border-gray-800 p-6 rounded-2xl text-center">
                <p className="text-gray-500 text-xs mb-3">Session Security Controls</p>
                {canDisconnect ? (
                  <button onClick={logout} className="w-full bg-red-950/40 hover:bg-red-900/50 border border-red-600 text-red-400 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors">
                    Disconnect Session
                  </button>
                ) : (
                  <p className="text-gray-600 text-xs uppercase tracking-widest">🔒 Session Lock Active</p>
                )}
              </div> */}
            </div>

            {/* Column 2 & 3: Global Operative Standings List */}
            <div className="md:col-span-2 bg-gray-900/60 border border-gray-800 p-6 rounded-2xl flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Global Operative Leaderboard</h3>
                <span className="text-xs text-cyan-400 font-mono">{allPlayers.length} Active Operatives</span>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {allPlayers.map((p, idx) => {
                  const isMe = p.pin === player.pin;
                  return (
                    <div 
                      key={p.id} 
                      className={`flex justify-between items-center p-4 rounded-xl border text-sm transition-all ${
                        isMe 
                        ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                        : 'bg-black border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`font-black text-base md:text-lg w-8 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-base">
                          {p.name} {isMe && <span className="text-xs text-cyan-400 ml-2 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">(You)</span>}
                        </span>
                      </div>
                      <div className="font-black text-lg text-white">
                        {p.score || 0} <span className="text-xs text-gray-500 font-normal">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 2: TEAM VIEW (EXPANDED GRID FOR LAPTOPS) ================= */}
        {activeTab === 'team' && (
          <div className="w-full">
            {player?.teamCode ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1: Squad Card */}
                <div className="md:col-span-1 flex flex-col gap-6">
                  <div className="w-full bg-gradient-to-br from-green-950 to-gray-900 border-2 border-green-500 p-6 rounded-2xl shadow-[0_0_25px_rgba(34,197,94,0.2)] flex md:flex-col justify-between items-center md:items-start">
                    <div className="mb-0 md:mb-4">
                      <span className="text-xs text-green-400 uppercase tracking-widest font-bold">Squad Rank</span>
                      <h2 className="text-4xl md:text-6xl font-black text-white mt-2">#{myTeamRank.rank}</h2>
                      <p className="text-sm text-gray-300 font-bold mt-1">{myTeamRank.teamName}</p>
                    </div>
                    <div className="text-right md:text-left">
                      <span className="text-3xl md:text-5xl font-black text-green-300">{myTeamRank.score}</span>
                      <span className="text-xs text-gray-400 uppercase block tracking-widest mt-1">Squad Pts</span>
                    </div>
                  </div>

                  <button 
                    onClick={onOpenTeam}
                    className="w-full bg-transparent border-2 border-green-600 text-green-400 font-bold py-3.5 rounded-xl hover:bg-green-950/40 transition-colors uppercase tracking-wider text-xs"
                  >
                    🛡️ Manage Squad Room
                  </button>
                </div>

                {/* Column 2 & 3: Global Squad Standings */}
                <div className="md:col-span-2 bg-gray-900/60 border border-gray-800 p-6 rounded-2xl flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Global Squad Leaderboard</h3>
                    <span className="text-xs text-green-400 font-mono">{allTeams.length} Registered Squads</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {allTeams.map((t, idx) => {
                      const isMyTeam = t.teamCode === player.teamCode || t.id === player.teamCode;
                      return (
                        <div 
                          key={t.id} 
                          className={`flex justify-between items-center p-4 rounded-xl border text-sm transition-all ${
                            isMyTeam 
                            ? 'bg-green-950/60 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                            : 'bg-black border-gray-800 text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`font-black text-base md:text-lg w-8 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-base">
                              {t.teamName} {isMyTeam && <span className="text-xs text-green-400 ml-2 bg-green-950 px-2 py-0.5 rounded border border-green-800">(Your Squad)</span>}
                            </span>
                          </div>
                          <div className="font-black text-lg text-white">
                            {t.totalScore || 0} <span className="text-xs text-gray-500 font-normal">pts</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="w-full max-w-md mx-auto bg-gray-900 border border-yellow-600/50 p-8 rounded-2xl text-center my-10">
                <p className="text-yellow-400 text-base font-bold mb-2">No Squad Linked</p>
                <p className="text-gray-400 text-xs mb-6 leading-relaxed">You are currently operating solo. Join or create a squad to compete on the global team leaderboard!</p>
                <button 
                  onClick={onOpenTeam}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-extrabold py-3 px-6 rounded-xl uppercase tracking-wider transition-all"
                >
                  Access Team Roster
                </button>
              </div>
            )}
          </div>
        )}

        {/* MOBILE FOOTER DISCONNECT (Hidden on desktop since it's in the sidebar column) */}
        <div className="md:hidden w-full border-t border-gray-800 pt-6 text-center mt-12">
          {canDisconnect ? (
            <button onClick={logout} className="text-red-500 text-xs hover:text-red-400 underline decoration-red-900">
              Disconnect Session
            </button>
          ) : (
            <p className="text-gray-600 text-[10px] uppercase tracking-widest">
              🔒 Session Lock Active (Admin Controlled)
            </p>
          )}
        </div>

      </div>
    </div>
  );
}