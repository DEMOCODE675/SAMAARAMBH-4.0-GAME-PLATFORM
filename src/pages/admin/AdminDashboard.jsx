import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, setDoc, updateDoc, onSnapshot, writeBatch, increment, query, where } from 'firebase/firestore';

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

  useEffect(() => {
    if (activeTab === 'controller') fetchBlocks();

    const unsubscribe = onSnapshot(doc(db, 'events', 'samarambh'), (docSnap) => {
      if (docSnap.exists()) setLiveState(docSnap.data());
    });
    return () => unsubscribe();
  }, [activeTab]);

  const fetchBlocks = async () => {
    setIsFetching(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'content', 'samarambh', 'questions'));
      const blocks = [];
      querySnapshot.forEach((document) => blocks.push({ id: document.id, ...document.data() }));
      setSavedBlocks(blocks);
    } catch (error) {
      console.error("Error fetching blocks:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setStatusMsg('Saving to database...');
    try {
      let payload = {};
      if (uiType === 'mcq') {
        payload = { question: mcqQuestion, options: mcqOptions.split(',').map(opt => opt.trim()), correct: mcqCorrect };
      } else if (uiType === 'terminal_hack') {
        payload = { consoleText: termLog, missionText: termMission, correct: termCorrect };
      } else if (uiType === 'photo_recognize') {
        // Parses comma-separated images, options, and includes the explanation payload
        payload = { 
          images: photoUrls.split(',').map(url => url.trim()).filter(Boolean), 
          prompt: photoPrompt, 
          options: photoOptions.split(',').map(opt => opt.trim()).filter(Boolean),
          correct: photoCorrect,
          explanation: photoExplanation 
        };
      } else if (uiType === 'logic_puzzle') {
        payload = { puzzleText: puzzlePrompt, correct: puzzleCorrect };
      }

      await addDoc(collection(db, 'content', 'samarambh', 'questions'), { 
        round: targetRound,
        type: uiType, 
        timeLimit: Number(timeLimit), 
        payload: payload, 
        isUsed: false,
        createdAt: serverTimestamp() 
      });
      
      setStatusMsg(`✅ Saved successfully to ${targetRound}!`);
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (error) {
      setStatusMsg('❌ Error saving block.');
    }
  };

  const handlePushToGlobal = async (block) => {
    if (block.isUsed) return;

    setStatusMsg('Broadcasting to all devices...');
    try {
      const blockRef = doc(db, 'content', 'samarambh', 'questions', block.id);
      await updateDoc(blockRef, { isUsed: true });

      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'playing',
        gameMode: broadcastMode,
        activeQuestion: block,
        timeRemaining: block.timeLimit,
        updatedAt: serverTimestamp()
      });

      fetchBlocks();
      setStatusMsg(`📡 LIVE: Pushed as ${broadcastMode.toUpperCase()} mode!`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg('❌ Failed to push.');
    }
  };

  const handleStopGame = async () => {
    if (!liveState?.activeQuestion) return;
    
    setStatusMsg('Halting game and calculating latency scores...');
    try {
      const qText = liveState.activeQuestion.payload.question || liveState.activeQuestion.payload.missionText || liveState.activeQuestion.payload.prompt || liveState.activeQuestion.payload.puzzleText;
      const currentMode = liveState.gameMode;
      const questionTimeLimit = liveState.activeQuestion.timeLimit || 20;
      
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'leaderboard', 
        gameMode: currentMode,
        activeQuestion: null, 
        updatedAt: serverTimestamp()
      });

      const answersRef = collection(db, 'events', 'samarambh', 'answers');
      const q = query(answersRef, where("questionText", "==", qText), where("isCorrect", "==", true));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const batch = writeBatch(db);
        const pointsMap = {}; 

        snapshot.forEach((docSnap) => {
          const ans = docSnap.data();
          const identifier = currentMode === 'team' ? ans.teamCode : ans.pin;
          
          if (identifier) {
            const timeTaken = ans.timeTaken || 0;
            const timeRemaining = Math.max(0, questionTimeLimit - timeTaken);
            const basePoints = 500;
            const speedBonus = Math.round(500 * (timeRemaining / questionTimeLimit));
            const earnedPoints = basePoints + speedBonus;

            pointsMap[identifier] = (pointsMap[identifier] || 0) + earnedPoints;
          }
        });

        for (const [id, points] of Object.entries(pointsMap)) {
          if (currentMode === 'team') {
            const teamRef = doc(db, 'events', 'samarambh', 'teams', id);
            batch.update(teamRef, { totalScore: increment(points) });
          } else {
            const playerRef = doc(db, 'players', id);
            batch.update(playerRef, { score: increment(points) });
          }
        }

        await batch.commit();
      }

      setStatusMsg('🛑 Game Stopped. Leaderboard Updated!');
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
    <div className="min-h-screen bg-gray-950 text-white font-mono p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-red-500">Admin Control Panel</h1>
          {statusMsg && <p className={statusMsg.includes('❌') ? "text-red-400 font-bold bg-red-900/50 px-4 py-2 rounded" : "text-green-400 font-bold bg-green-900/50 px-4 py-2 rounded"}>{statusMsg}</p>}
        </div>
        
        <div className="flex gap-4 mb-8 border-b border-gray-800 pb-4">
          <button onClick={() => setActiveTab('builder')} className={`px-4 py-2 font-bold ${activeTab === 'builder' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Game Builder (CMS)</button>
          <button onClick={() => setActiveTab('controller')} className={`px-4 py-2 font-bold ${activeTab === 'controller' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Live Event Controller</button>
        </div>

        {/* TAB 1: GAME BUILDER */}
        {activeTab === 'builder' && (
          <form onSubmit={handleSaveQuestion} className="bg-gray-900 border border-gray-700 p-6 rounded-lg space-y-6">
            <h2 className="text-xl text-cyan-400">Create New Challenge Block</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2 uppercase">Target Round</label>
                <select value={targetRound} onChange={(e) => setTargetRound(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white outline-none focus:border-red-500">
                  <option value="Round 1">Round 1</option>
                  <option value="Round 2">Round 2</option>
                  <option value="Round 3">Round 3</option>
                  <option value="Finals">Finals</option>
                  <option value="Bonus">Bonus Round</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 uppercase">Challenge Type</label>
                <select value={uiType} onChange={(e) => setUiType(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white outline-none focus:border-red-500">
                  <option value="mcq">Standard MCQ</option>
                  <option value="terminal_hack">Terminal Hack</option>
                  <option value="photo_recognize">Threat / Photo Recognition</option>
                  <option value="logic_puzzle">Logic Puzzle</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 uppercase">Time Limit (Sec)</label>
                <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white outline-none focus:border-red-500" />
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* DYNAMIC FORM FIELDS BASED ON TYPE */}
            {uiType === 'mcq' && (
              <div className="space-y-4">
                <div><label className="block text-gray-400 text-sm mb-2">Question Text</label><input type="text" value={mcqQuestion} onChange={e => setMcqQuestion(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="What is React?" required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Options (Comma separated)</label><input type="text" value={mcqOptions} onChange={e => setMcqOptions(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="Library, Framework, DB" required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Correct Answer</label><input type="text" value={mcqCorrect} onChange={e => setMcqCorrect(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white border-l-4 border-l-green-500" placeholder="Library" required /></div>
              </div>
            )}

            {uiType === 'terminal_hack' && (
              <div className="space-y-4">
                <div><label className="block text-gray-400 text-sm mb-2">Terminal Console Output</label><textarea value={termLog} onChange={e => setTermLog(e.target.value)} rows="4" className="w-full bg-black border border-gray-700 p-3 rounded text-green-400 font-mono" placeholder="root@server:~# ..." required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Mission Directive</label><input type="text" value={termMission} onChange={e => setTermMission(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Correct Answer</label><input type="text" value={termCorrect} onChange={e => setTermCorrect(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white border-l-4 border-l-green-500" required /></div>
              </div>
            )}

            {uiType === 'photo_recognize' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Image URLs (Comma-separated for side-by-side images)</label>
                  <input type="text" value={photoUrls} onChange={e => setPhotoUrls(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="https://imgur.com/fake.png, https://imgur.com/real.png" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Analysis Prompt</label>
                  <input type="text" value={photoPrompt} onChange={e => setPhotoPrompt(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="Which indicator confirms the left login banner is a phishing clone?" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">4 Multi-Choice Options (Comma-separated)</label>
                  <input type="text" value={photoOptions} onChange={e => setPhotoOptions(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="Mismatched SSL, Subdomain Typo, Missing Footer, Wrong Font" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Correct Answer (Must match one of the options)</label>
                  <input type="text" value={photoCorrect} onChange={e => setPhotoCorrect(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white border-l-4 border-l-green-500" placeholder="Subdomain Typo" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Operative Briefing / Explanation (Why this answer is correct)</label>
                  <textarea value={photoExplanation} onChange={e => setPhotoExplanation(e.target.value)} rows="3" className="w-full bg-black border border-gray-700 p-3 rounded text-cyan-300" placeholder="Explain the security flaw (e.g. The domain uses netflix-support.com instead of netflix.com)" required />
                </div>
              </div>
            )}

            {uiType === 'logic_puzzle' && (
              <div className="space-y-4">
                <div><label className="block text-gray-400 text-sm mb-2">Puzzle / Riddle Text</label><textarea value={puzzlePrompt} onChange={e => setPuzzlePrompt(e.target.value)} rows="4" className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="I speak without a mouth and hear without ears..." required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Correct Answer</label><input type="text" value={puzzleCorrect} onChange={e => setPuzzleCorrect(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white border-l-4 border-l-green-500" placeholder="Echo" required /></div>
              </div>
            )}

            <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded uppercase tracking-wider">Save Challenge to Arsenal</button>
          </form>
        )}

        {/* TAB 2: LIVE CONTROLLER */}
        {activeTab === 'controller' && (
          <div className="space-y-6">
            
            {liveState?.status === 'playing' && (
              <div className="bg-red-950 border-2 border-red-500 p-6 rounded-lg flex justify-between items-center animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                <div>
                  <h2 className="text-red-400 font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    Game is currently LIVE
                  </h2>
                  <p className="text-white text-sm">Students are submitting answers right now.</p>
                </div>
                <button 
                  onClick={handleStopGame}
                  className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-8 py-4 rounded uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                >
                  🛑 Stop & Calculate
                </button>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
              <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-sm text-cyan-400">Stage Display Overrides</h3>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => handleProjectorOverride('leaderboard', 'solo')} disabled={liveState?.status === 'playing'} className="bg-purple-900/50 hover:bg-purple-800 border border-purple-500 text-purple-300 disabled:opacity-50 font-bold py-3 rounded text-sm transition-colors">Force Solo Leaderboard</button>
                <button onClick={() => handleProjectorOverride('leaderboard', 'team')} disabled={liveState?.status === 'playing'} className="bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500 text-cyan-300 disabled:opacity-50 font-bold py-3 rounded text-sm transition-colors">Force Team Leaderboard</button>
                <button onClick={() => handleProjectorOverride('waiting', 'solo')} disabled={liveState?.status === 'playing'} className="bg-gray-800 hover:bg-gray-700 border border-gray-500 text-gray-300 disabled:opacity-50 font-bold py-3 rounded text-sm transition-colors">🔄 Reset to Standby</button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
              <div className="mb-6 p-4 bg-black border border-gray-700 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold mb-1">Set Event Broadcast Mode</h3>
                  <p className="text-gray-500 text-xs">Determines how points are calculated.</p>
                </div>
                <div className="flex bg-gray-900 rounded p-1 border border-gray-700">
                  <button onClick={() => setBroadcastMode('solo')} className={`px-6 py-2 rounded font-bold text-sm transition-colors ${broadcastMode === 'solo' ? 'bg-cyan-600 text-black' : 'text-gray-400 hover:text-white'}`}>SOLO MODE</button>
                  <button onClick={() => setBroadcastMode('team')} className={`px-6 py-2 rounded font-bold text-sm transition-colors ${broadcastMode === 'team' ? 'bg-cyan-600 text-black' : 'text-gray-400 hover:text-white'}`}>TEAM MODE</button>
                </div>
              </div>

              {/* ROUND TABS */}
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
                <h2 className="text-xl text-cyan-400">Content Arsenal</h2>
                <div className="flex gap-2 flex-wrap">
                  {['Round 1', 'Round 2', 'Round 3', 'Finals', 'Bonus'].map((round) => (
                    <button 
                      key={round}
                      onClick={() => setActiveRoundTab(round)}
                      className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${
                        activeRoundTab === round 
                        ? 'bg-red-600 text-white' 
                        : 'bg-black text-gray-400 border border-gray-700 hover:text-white'
                      }`}
                    >
                      {round}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mb-4">
                <button onClick={fetchBlocks} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-white border border-gray-600">🔄 Refresh Arsenal</button>
              </div>
              
              {isFetching ? (
                <p className="text-gray-500 text-center py-8">Accessing database...</p>
              ) : filteredBlocks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No challenges built for {activeRoundTab} yet.</p>
              ) : (
                <div className="space-y-4">
                  {filteredBlocks.map((block) => {
                    const isLive = liveState?.status === 'playing' && liveState?.activeQuestion?.id === block.id;
                    const isUsed = block.isUsed;
                    const textLabel = block.payload.question || block.payload.missionText || block.payload.prompt || block.payload.puzzleText;

                    return (
                      <div key={block.id} className={`p-4 rounded flex justify-between items-center transition-colors duration-300 ${
                        isLive 
                        ? 'bg-red-950/40 border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]' 
                        : isUsed 
                        ? 'bg-black/40 border border-gray-900 opacity-60' 
                        : 'bg-black border border-gray-700 hover:border-cyan-900'
                      }`}>
                        <div className="flex items-center gap-3">
                          {isLive && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>}
                          <span className="text-xs px-2 py-1 rounded uppercase tracking-widest bg-gray-800 text-gray-300">{block.type}</span>
                          <span className={`font-bold ${isLive ? 'text-red-400' : isUsed ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {textLabel}
                          </span>
                        </div>

                        <button 
                          onClick={() => handlePushToGlobal(block)}
                          disabled={liveState?.status === 'playing' || isUsed}
                          className={`font-bold px-5 py-2 rounded uppercase text-xs tracking-wider transition-all ${
                            isLive 
                            ? 'bg-red-600 text-white cursor-not-allowed opacity-90' 
                            : isUsed 
                            ? 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed' 
                            : liveState?.status === 'playing' 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-cyan-600 hover:bg-cyan-500 text-black'
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