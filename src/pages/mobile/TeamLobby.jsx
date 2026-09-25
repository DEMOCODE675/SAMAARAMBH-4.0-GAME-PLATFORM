import React, { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  LogIn, 
  ArrowLeft, 
  Crown, 
  Copy, 
  Check, 
  Sun, 
  Moon,
  Clock
} from 'lucide-react';
import GlassAvatar from '../../components/GlassAvatar';

export default function TeamLobby({ onBack }) {
  const { player } = useContext(AuthContext);

  const [modeTab, setModeTab] = useState('join'); // 'join' | 'create'
  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Live state for the team room
  const [activeTeam, setActiveTeam] = useState(null);
  const [roster, setRoster] = useState([]);

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

  // Listen for team updates if the player is in a team
  useEffect(() => {
    if (!player?.teamCode) return;

    // 1. Listen to the Team Document
    const teamRef = doc(db, 'events', 'samarambh', 'teams', player.teamCode);
    const unsubscribeTeam = onSnapshot(teamRef, (docSnap) => {
      if (docSnap.exists()) setActiveTeam(docSnap.data());
    }, (err) => {
      console.warn("Team listener error:", err.message);
    });

    // 2. Listen to all players who have this teamCode
    const playersRef = collection(db, 'players');
    const q = query(playersRef, where("teamCode", "==", player.teamCode));
    const unsubscribeRoster = onSnapshot(q, (querySnapshot) => {
      const teammates = [];
      querySnapshot.forEach((doc) => teammates.push(doc.data()));
      setRoster(teammates);
    }, (err) => {
      console.warn("Roster listener error:", err.message);
    });

    return () => {
      unsubscribeTeam();
      unsubscribeRoster();
    };
  }, [player?.teamCode]);

  const handleCopyCode = () => {
    if (!activeTeam?.teamCode) return;
    navigator.clipboard?.writeText(activeTeam.teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (teamName.trim().length < 2) throw new Error("Team name too short");

      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const teamRef = doc(db, 'events', 'samarambh', 'teams', code);
      await setDoc(teamRef, {
        teamName: teamName.trim(),
        teamCode: code,
        leaderPin: player.pin,
        totalScore: 0,
        createdAt: new Date()
      });

      const playerRef = doc(db, 'players', player.pin);
      await updateDoc(playerRef, { 
        teamCode: code, 
        teamName: teamName.trim(),
        isLeader: true 
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Please enter squad code");

      const teamRef = doc(db, 'events', 'samarambh', 'teams', code);
      const docSnap = await getDoc(teamRef);

      if (!docSnap.exists()) throw new Error("Team code not found.");
      const teamData = docSnap.data();

      const playerRef = doc(db, 'players', player.pin);
      await updateDoc(playerRef, { 
        teamCode: code, 
        teamName: teamData.teamName || '',
        isLeader: false 
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VIEW 1: ACTIVE SQUAD WAITING ROOM
  // ==========================================
  if (player?.teamCode && activeTeam) {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* Top Bar */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

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

        {/* Center Squad Lobby Content */}
        <div className="max-w-sm w-full mx-auto my-auto py-4 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl border p-6 shadow-xl text-center ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md' : 'bg-white border-slate-200 shadow-slate-200/50'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-500/20">
              <Users className="w-3.5 h-3.5" />
              <span>Squad Active</span>
            </div>

            <GlassAvatar 
              name={activeTeam.teamName} 
              seed={activeTeam.teamCode} 
              size="xl" 
              className="mx-auto mb-3 shadow-xl" 
            />

            <h1 className="text-2xl font-black tracking-tight mb-4">
              {activeTeam.teamName}
            </h1>

            {/* Code Box with Copy Button */}
            <div 
              onClick={handleCopyCode}
              role="button"
              tabIndex={0}
              className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between group ${
                isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/40' : 'bg-slate-50 border-slate-200 hover:border-emerald-500/40'
              }`}
            >
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Squad Invite Code
                </span>
                <p className="text-2xl font-black font-mono tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                  {activeTeam.teamCode}
                </p>
              </div>

              <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                copied 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 group-hover:text-white' : 'bg-white border-slate-200 text-slate-700 shadow-sm')
              }`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </div>
            </div>

            {/* Teammates Roster List */}
            <div className="mt-5 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                <span>Roster Members</span>
                <span className="text-emerald-500">{roster.length} Joined</span>
              </div>

              <div className={`rounded-2xl border divide-y overflow-hidden max-h-48 overflow-y-auto ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 divide-slate-800/80' : 'bg-slate-50 border-slate-200 divide-slate-200'
              }`}>
                {roster.map((member) => {
                  const isMe = member.pin === player.pin;
                  return (
                    <div key={member.pin} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <GlassAvatar name={member.name} seed={member.pin} size="xs" />
                        {member.isLeader && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className={`font-semibold ${isMe ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                          {member.name} {isMe && '(You)'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">#{member.pin}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Waiting Pulse */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-amber-500 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Awaiting host to launch round...</span>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 font-medium">
          Samarambh 4.0 · Squad Mode
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SQUAD LOGIN / JOIN / CREATE
  // ==========================================
  return (
    <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <button 
          onClick={onBack}
          className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

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

      {/* Main Team Card */}
      <div className="max-w-sm w-full mx-auto my-auto py-4">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-6 md:p-8 shadow-xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/80 border-slate-800 shadow-black/40 backdrop-blur-md' 
              : 'bg-white border-slate-200/90 shadow-slate-200/50'
          }`}
        >
          {/* Segmented Switch: Join vs Create */}
          <div className={`flex rounded-2xl p-1 mb-6 border ${
            isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => { setModeTab('join'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                modeTab === 'join' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join Squad</span>
            </button>
            <button
              type="button"
              onClick={() => { setModeTab('create'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                modeTab === 'create' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Squad</span>
            </button>
          </div>

          {/* Form: Join Squad */}
          {modeTab === 'join' && (
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Enter 4-Letter Code
                </label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  autoFocus
                  className={`w-full rounded-2xl px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.3em] outline-none border transition-all uppercase ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                  }`}
                  autoComplete="off"
                  required
                />
              </div>

              {error && (
                <p className="text-rose-500 text-xs text-center font-medium py-1">{error}</p>
              )}

              <button 
                type="submit" 
                disabled={loading || !joinCode.trim()} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-emerald-600/25 active:scale-[0.98] text-sm"
              >
                {loading ? 'Joining...' : 'Join Squad'}
              </button>
            </form>
          )}

          {/* Form: Create Squad */}
          {modeTab === 'create' && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Squad Name
                </label>
                <input 
                  type="text" 
                  maxLength={24}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Cyber Knights"
                  autoFocus
                  className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold outline-none border transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                  }`}
                  autoComplete="off"
                  required
                />
              </div>

              {error && (
                <p className="text-rose-500 text-xs text-center font-medium py-1">{error}</p>
              )}

              <button 
                type="submit" 
                disabled={loading || !teamName.trim()} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-emerald-600/25 active:scale-[0.98] text-sm"
              >
                {loading ? 'Creating...' : 'Create & Generate Code'}
              </button>
            </form>
          )}
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-slate-400 font-medium">
        TechArena · Squad Arena Mode
      </div>
    </div>
  );
}
