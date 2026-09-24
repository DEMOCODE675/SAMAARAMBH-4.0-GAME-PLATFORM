import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, setDoc, updateDoc, onSnapshot, increment, query, where } from 'firebase/firestore';
import { 
  ShieldAlert, 
  Terminal, 
  Layers, 
  Tv, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  RefreshCw, 
  StopCircle, 
  FilePlus, 
  Sliders, 
  Sparkles,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('builder'); 
  const [statusMsg, setStatusMsg] = useState('');

  // Builder Form States
  const [targetRound, setTargetRound] = useState('Round 1');
  const [uiType, setUiType] = useState('mcq');
  const [timeLimit, setTimeLimit] = useState(20);
  
  // Payload Fields based on type
  const [mcqQuestion, setMcqQuestion] = useState('');
  const [mcqOptions, setMcqOptions] = useState('');
  const [mcqCorrect, setMcqCorrect] = useState('');
  
  const [termLog, setTermLog] = useState('');
  const [termMission, setTermMission] = useState('');
  const [termCorrect, setTermCorrect] = useState('');

  // 🚀 Upgraded Threat Detection / Photo Recognition Fields
  const [photoUrls, setPhotoUrls] = useState('');
  const [photoPrompt, setPhotoPrompt] = useState('');
  const [photoOptions, setPhotoOptions] = useState('');
  const [photoCorrect, setPhotoCorrect] = useState('');
  const [photoExplanation, setPhotoExplanation] = useState(''); // 🧠 Operative Briefing Explanation

  const [puzzlePrompt, setPuzzlePrompt] = useState('');
  const [puzzleCorrect, setPuzzleCorrect] = useState('');

  // Controller & Arsenal States
  const [savedBlocks, setSavedBlocks] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState('solo'); 
  const [liveState, setLiveState] = useState(null);
  const [activeRoundTab, setActiveRoundTab] = useState('Round 1');

  const fetchBlocks = async () => {
    setIsFetching(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'content', 'samarambh', 'questions'));
      const blocks = [];
      querySnapshot.forEach((document) => blocks.push({ id: document.id, ...document.data() }));
      setSavedBlocks(blocks);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to load blocks.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchBlocks();

    // Listen to real-time status of the event
    const unsubscribe = onSnapshot(doc(db, 'events', 'samarambh'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveState(data);
        if (data.gameMode) {
          setBroadcastMode(data.gameMode);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setStatusMsg('Saving challenge block...');

    let payload = {};
    if (uiType === 'mcq') {
      payload = {
        question: mcqQuestion,
        options: mcqOptions.split(',').map(s => s.trim()),
        correctAnswer: mcqCorrect.trim()
      };
    } else if (uiType === 'terminal_hack') {
      payload = {
        consoleText: termLog,
        missionText: termMission,
        correctCommand: termCorrect.trim()
      };
    } else if (uiType === 'photo_recognize') {
      const urlList = photoUrls.split(',').map(s => s.trim()).filter(Boolean);
      payload = {
        imageUrl: urlList[0] || '',
        images: urlList,
        prompt: photoPrompt,
        options: photoOptions.split(',').map(s => s.trim()),
        correctAnswer: photoCorrect.trim(),
        explanation: photoExplanation.trim()
      };
    } else if (uiType === 'logic_puzzle') {
      payload = {
        puzzleText: puzzlePrompt,
        correctAnswer: puzzleCorrect.trim()
      };
    }

    try {
      await addDoc(collection(db, 'content', 'samarambh', 'questions'), {
        round: targetRound,
        type: uiType,
        timeLimit: Number(timeLimit),
        payload: payload,
        isUsed: false,
        createdAt: serverTimestamp()
      });

      setStatusMsg('✅ Challenge block secured to arsenal!');
      // Reset form
      setMcqQuestion(''); setMcqOptions(''); setMcqCorrect('');
      setTermLog(''); setTermMission(''); setTermCorrect('');
      setPhotoUrls(''); setPhotoPrompt(''); setPhotoOptions(''); setPhotoCorrect(''); setPhotoExplanation('');
      setPuzzlePrompt(''); setPuzzleCorrect('');
      fetchBlocks();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to save block.');
    }
  };

  const handlePushToGlobal = async (block) => {
    setStatusMsg(`Deploying "${block.round}" to live arena...`);
    try {
      // 1. Mark as used in database
      await updateDoc(doc(db, 'content', 'samarambh', 'questions', block.id), {
        isUsed: true
      });

      // 2. Push to Active Event Controller
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'playing',
        gameMode: broadcastMode, 
        activeQuestion: {
          id: block.id,
          type: block.type,
          timeLimit: block.timeLimit,
          payload: block.payload,
          startTime: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      setStatusMsg('🚀 Question broadcast live!');
      fetchBlocks();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to broadcast challenge.');
    }
  };

  const handleStopGame = async () => {
    setStatusMsg('Calculating scores & pushing leaderboard...');
    try {
      if (!liveState || !liveState.activeQuestion) {
        setStatusMsg('❌ No active challenge to score.');
        return;
      }

      const activeQ = liveState.activeQuestion;
      const qId = activeQ.id;
      const correctVal = activeQ.payload?.correctAnswer || activeQ.payload?.correctCommand || activeQ.payload?.correct || activeQ.payload?.answer || '';

      // 1. Query submitted answers for this active challenge
      const answersSnap = await getDocs(
        query(
          collection(db, 'events', 'samarambh', 'answers'),
          where('questionId', '==', qId)
        )
      );

      const scoredPlayers = new Set();
      const updates = [];

      answersSnap.forEach((ansDoc) => {
        const data = ansDoc.data();
        const pPin = data.pin || data.playerPin;
        const answerText = (data.submittedAnswer || data.answer || '').toString().trim().toLowerCase();
        const targetCorrect = (correctVal || '').toString().trim().toLowerCase();
        const teamCode = data.teamCode || null;

        if (pPin && !scoredPlayers.has(pPin)) {
          scoredPlayers.add(pPin);
          
          if (data.pointsAwarded && data.pointsAwarded > 0) {
            updates.push({
              pin: pPin,
              teamCode,
              points: data.pointsAwarded,
              alreadyAwarded: true
            });
          } else if (data.isCorrect || (targetCorrect && answerText === targetCorrect)) {
            const elapsed = data.timeTaken !== undefined ? Number(data.timeTaken) : (data.elapsedSeconds !== undefined ? Number(data.elapsedSeconds) : (activeQ.timeLimit || 20));
            const totalLimit = activeQ.timeLimit || 20;
            const speedBonus = Math.max(0, Math.round(((totalLimit - Math.min(totalLimit, elapsed)) / totalLimit) * 500));
            const totalPointsAwarded = 1000 + speedBonus;

            updates.push({
              pin: pPin,
              teamCode,
              points: totalPointsAwarded,
              alreadyAwarded: false
            });
          }
        }
      });

      // 2. Commit updates to players and teams in Firestore
      for (const u of updates) {
        if (!u.alreadyAwarded) {
          try {
            const playerRef = doc(db, 'players', u.pin);
            await updateDoc(playerRef, {
              score: increment(u.points)
            });
            if (u.teamCode) {
              const teamRef = doc(db, 'events', 'samarambh', 'teams', u.teamCode);
              await updateDoc(teamRef, {
                totalScore: increment(u.points)
              });
            }
          } catch (e) {
            console.warn("Player score update error in stop game:", e);
          }
        }
      }

      // 3. Switch Stage Display to Leaderboard
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'leaderboard',
        gameMode: broadcastMode,
        activeQuestion: null,
        updatedAt: serverTimestamp()
      });

      setStatusMsg(`🏆 Scores calculated for ${updates.length} correct entries! Showing Leaderboard.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to calculate scores.');
    }
  };

  const handleProjectorOverride = async (newStatus, overrideMode = 'solo') => {
    setStatusMsg(`Changing projector to ${newStatus}...`);
    try {
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: newStatus, 
        gameMode: overrideMode,
        activeQuestion: null, 
        updatedAt: serverTimestamp()
      });
      setStatusMsg('✅ Projector updated successfully!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (err) {
      setStatusMsg('❌ Failed to update projector.');
    }
  };

  const filteredBlocks = savedBlocks.filter(b => b.round === activeRoundTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10 selection:bg-rose-500/30">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Control Bar Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Admin Control Panel
                <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                  Operator Mode
                </span>
              </h1>
              <p className="text-xs text-slate-400">Samarambh 4.0 Realtime Stage & Content Engine</p>
            </div>
          </div>

          {statusMsg && (
            <div className={`text-xs font-semibold px-4 py-2.5 rounded-xl border flex items-center gap-2 animate-in fade-in duration-200 ${
              statusMsg.includes('❌') 
                ? "text-rose-300 bg-rose-950/60 border-rose-800/80" 
                : "text-emerald-300 bg-emerald-950/60 border-emerald-800/80"
            }`}>
              {statusMsg.includes('❌') ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>{statusMsg}</span>
            </div>
          )}
        </header>
        
        {/* Modern Segmented Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl max-w-md">
          <button 
            onClick={() => setActiveTab('builder')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'builder' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            <span>Game Builder (CMS)</span>
          </button>

          <button 
            onClick={() => setActiveTab('controller')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'controller' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Event Controller</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GAME BUILDER (CMS) */}
        {/* ========================================================================= */}
        {activeTab === 'builder' && (
          <form onSubmit={handleSaveQuestion} className="bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Create New Challenge Block</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Author and deploy battle items directly to the arena repository.</p>
              </div>
            </div>
            
            {/* Top configuration parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Target Round</label>
                <select 
                  value={targetRound} 
                  onChange={(e) => setTargetRound(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3 rounded-xl text-slate-200 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                >
                  <option value="Round 1">Round 1</option>
                  <option value="Round 2">Round 2</option>
                  <option value="Round 3">Round 3</option>
                  <option value="Finals">Finals</option>
                  <option value="Bonus">Bonus Round</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Challenge Type</label>
                <select 
                  value={uiType} 
                  onChange={(e) => setUiType(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3 rounded-xl text-slate-200 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                >
                  <option value="mcq">Standard MCQ</option>
                  <option value="terminal_hack">Terminal Hack</option>
                  <option value="photo_recognize">Threat / Photo Recognition</option>
                  <option value="logic_puzzle">Logic Puzzle</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Time Limit (Sec)</label>
                <input 
                  type="number" 
                  value={timeLimit} 
                  onChange={(e) => setTimeLimit(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3 rounded-xl text-slate-200 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors" 
                />
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-6">
              {/* DYNAMIC FORM FIELDS BASED ON TYPE */}
              {uiType === 'mcq' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Question Text</label>
                    <input 
                      type="text" 
                      value={mcqQuestion} 
                      onChange={e => setMcqQuestion(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="What is React?" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Options (Comma separated)</label>
                    <input 
                      type="text" 
                      value={mcqOptions} 
                      onChange={e => setMcqOptions(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="Library, Framework, DB" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-400 text-xs font-bold uppercase mb-1.5">Correct Answer</label>
                    <input 
                      type="text" 
                      value={mcqCorrect} 
                      onChange={e => setMcqCorrect(e.target.value)} 
                      className="w-full bg-slate-950 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-sm outline-none focus:border-emerald-500" 
                      placeholder="Library" 
                      required 
                    />
                  </div>
                </div>
              )}

              {uiType === 'terminal_hack' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Terminal Console Output</label>
                    <textarea 
                      value={termLog} 
                      onChange={e => setTermLog(e.target.value)} 
                      rows="4" 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-emerald-400 font-mono text-sm outline-none focus:border-rose-500" 
                      placeholder="root@server:~# ..." 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Mission Directive</label>
                    <input 
                      type="text" 
                      value={termMission} 
                      onChange={e => setTermMission(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-400 text-xs font-bold uppercase mb-1.5">Correct Answer</label>
                    <input 
                      type="text" 
                      value={termCorrect} 
                      onChange={e => setTermCorrect(e.target.value)} 
                      className="w-full bg-slate-950 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-sm outline-none focus:border-emerald-500" 
                      required 
                    />
                  </div>
                </div>
              )}

              {uiType === 'photo_recognize' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Image URLs (Comma-separated for side-by-side images)</label>
                    <input 
                      type="text" 
                      value={photoUrls} 
                      onChange={e => setPhotoUrls(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="https://imgur.com/fake.png, https://imgur.com/real.png" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Analysis Prompt</label>
                    <input 
                      type="text" 
                      value={photoPrompt} 
                      onChange={e => setPhotoPrompt(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="Which indicator confirms the left login banner is a phishing clone?" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">4 Multi-Choice Options (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={photoOptions} 
                      onChange={e => setPhotoOptions(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="Mismatched SSL, Subdomain Typo, Missing Footer, Wrong Font" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-400 text-xs font-bold uppercase mb-1.5">Correct Answer (Must match one of the options)</label>
                    <input 
                      type="text" 
                      value={photoCorrect} 
                      onChange={e => setPhotoCorrect(e.target.value)} 
                      className="w-full bg-slate-950 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-sm outline-none focus:border-emerald-500" 
                      placeholder="Subdomain Typo" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-cyan-400 text-xs font-bold uppercase mb-1.5">Operative Briefing / Explanation (Why this answer is correct)</label>
                    <textarea 
                      value={photoExplanation} 
                      onChange={e => setPhotoExplanation(e.target.value)} 
                      rows="3" 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-cyan-300 text-sm outline-none focus:border-rose-500" 
                      placeholder="Explain the security flaw (e.g. The domain uses netflix-support.com instead of netflix.com)" 
                      required 
                    />
                  </div>
                </div>
              )}

              {uiType === 'logic_puzzle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Puzzle / Riddle Text</label>
                    <textarea 
                      value={puzzlePrompt} 
                      onChange={e => setPuzzlePrompt(e.target.value)} 
                      rows="4" 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="I speak without a mouth and hear without ears..." 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-400 text-xs font-bold uppercase mb-1.5">Correct Answer</label>
                    <input 
                      type="text" 
                      value={puzzleCorrect} 
                      onChange={e => setPuzzleCorrect(e.target.value)} 
                      className="w-full bg-slate-950 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-sm outline-none focus:border-emerald-500" 
                      placeholder="Echo" 
                      required 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 px-8 rounded-2xl uppercase tracking-wider text-xs shadow-lg shadow-rose-950/60 transition-all active:scale-95"
              >
                Save Challenge to Arsenal
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE CONTROLLER */}
        {/* ========================================================================= */}
        {activeTab === 'controller' && (
          <div className="space-y-6">
            
            {/* Live Playing Banner & Panic Action */}
            {liveState?.status === 'playing' && (
              <div className="bg-rose-950/50 border border-rose-500/50 p-6 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-xl shadow-rose-950/40">
                <div>
                  <h2 className="text-rose-400 font-extrabold tracking-widest uppercase text-sm mb-1 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    Game is currently LIVE
                  </h2>
                  <p className="text-slate-200 text-xs">Students are submitting answers right now.</p>
                </div>
                <button 
                  onClick={handleStopGame}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-3.5 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-rose-900/60 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>🛑 Stop & Calculate</span>
                </button>
              </div>
            )}

            {/* Stage Display Overrides */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Tv className="w-4 h-4" />
                <h3 className="font-bold uppercase tracking-wider text-xs">Stage Display Overrides</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  onClick={() => handleProjectorOverride('leaderboard', 'solo')} 
                  disabled={liveState?.status === 'playing'} 
                  className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-300 disabled:opacity-40 font-bold py-3 px-4 rounded-xl text-xs transition-colors"
                >
                  Force Solo Leaderboard
                </button>
                <button 
                  onClick={() => handleProjectorOverride('leaderboard', 'team')} 
                  disabled={liveState?.status === 'playing'} 
                  className="bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 disabled:opacity-40 font-bold py-3 px-4 rounded-xl text-xs transition-colors"
                >
                  Force Team Leaderboard
                </button>
                <button 
                  onClick={() => handleProjectorOverride('waiting', 'solo')} 
                  disabled={liveState?.status === 'playing'} 
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 disabled:opacity-40 font-bold py-3 px-4 rounded-xl text-xs transition-colors"
                >
                  🔄 Reset to Standby
                </button>
              </div>
            </div>

            {/* Broadcast Mode & Content Arsenal */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-white font-bold text-sm">Set Event Broadcast Mode</h3>
                  <p className="text-slate-400 text-xs">Determines how points are calculated.</p>
                </div>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                  <button 
                    onClick={() => setBroadcastMode('solo')} 
                    className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                      broadcastMode === 'solo' 
                        ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SOLO MODE
                  </button>
                  <button 
                    onClick={() => setBroadcastMode('team')} 
                    className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                      broadcastMode === 'team' 
                        ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TEAM MODE
                  </button>
                </div>
              </div>

              {/* ROUND TABS & REFRESH */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-base font-bold text-white">Content Arsenal</h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {['Round 1', 'Round 2', 'Round 3', 'Finals', 'Bonus'].map((round) => (
                    <button 
                      key={round}
                      onClick={() => setActiveRoundTab(round)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        activeRoundTab === round 
                          ? 'bg-rose-600 text-white shadow-sm' 
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {round}
                    </button>
                  ))}
                  <button 
                    onClick={fetchBlocks} 
                    className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
              
              {/* Challenge Blocks List */}
              {isFetching ? (
                <div className="text-slate-500 text-center py-12 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  <span>Accessing database...</span>
                </div>
              ) : filteredBlocks.length === 0 ? (
                <p className="text-slate-500 text-center py-12 text-xs">No challenges built for {activeRoundTab} yet.</p>
              ) : (
                <div className="space-y-3">
                  {filteredBlocks.map((block) => {
                    const isLive = liveState?.status === 'playing' && liveState?.activeQuestion?.id === block.id;
                    const isUsed = block.isUsed;
                    const textLabel = block.payload.question || block.payload.missionText || block.payload.prompt || block.payload.puzzleText;

                    return (
                      <div 
                        key={block.id} 
                        className={`p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 border transition-colors ${
                          isLive 
                            ? 'bg-rose-950/30 border-rose-500/80 shadow-md shadow-rose-950/40' 
                            : isUsed 
                            ? 'bg-slate-950/40 border-slate-900 opacity-60' 
                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isLive && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />}
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {block.type}
                          </span>
                          <span className={`text-sm font-semibold truncate ${
                            isLive ? 'text-rose-300' : isUsed ? 'text-slate-500 line-through' : 'text-slate-200'
                          }`}>
                            {textLabel}
                          </span>
                        </div>

                        <button 
                          onClick={() => handlePushToGlobal(block)}
                          disabled={liveState?.status === 'playing' || isUsed}
                          className={`font-bold px-5 py-2.5 rounded-xl uppercase text-xs tracking-wider transition-all shrink-0 ${
                            isLive 
                              ? 'bg-rose-600 text-white cursor-not-allowed opacity-90' 
                              : isUsed 
                              ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed' 
                              : liveState?.status === 'playing' 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm active:scale-95'
                          }`}
                        >
                          {isLive ? 'Currently Live' : isUsed ? '🔒 Sent / Used' : 'Push to Screens'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
