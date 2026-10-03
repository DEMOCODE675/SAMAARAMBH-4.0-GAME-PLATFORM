import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  increment, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { 
  Layers, 
  Tv, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  StopCircle, 
  FilePlus, 
  Sliders, 
  Sparkles,
  Palette,
  Image as ImageIcon,
  Unlock
} from 'lucide-react';
import SkribblControl from './components/SkribblControl';
import { buildWordHint, hashWord } from '../../utils/skribblEngine';

function AdminPhotoPreviewCard({ url, letter, isSingle, idx }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 p-1 flex flex-col items-center">
      <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-bold text-white border border-white/20">
        {isSingle ? 'Artifact' : `Image ${letter}`}
      </div>
      {hasError ? (
        <div className="w-full h-28 flex flex-col items-center justify-center text-[10px] text-rose-400 bg-rose-950/40 rounded-lg p-2 text-center">
          <AlertCircle className="w-4 h-4 text-rose-400 mb-1" />
          <span>Failed to load preview</span>
        </div>
      ) : (
        <img 
          src={url} 
          alt={`Preview ${idx + 1}`} 
          className="w-full h-28 object-contain rounded-lg"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('builder'); 
  const [statusMsg, setStatusMsg] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

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

  // 🎨 Skribbl Draw & Guess Fields
  const [skribblWord, setSkribblWord] = useState('');
  const [skribblCategory, setSkribblCategory] = useState('');

  // Controller & Arsenal States
  const [savedBlocks, setSavedBlocks] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState('solo'); 
  const [liveState, setLiveState] = useState(null);
  const [activeRoundTab, setActiveRoundTab] = useState('Round 1');

  const fetchBlocks = async (resetUsed = false) => {
    setIsFetching(true);
    try {
      if (resetUsed) {
        setStatusMsg('Unfreezing questions & preparing arena...');
        const questionsSnap = await getDocs(collection(db, 'content', 'samarambh', 'questions'));
        const batch = writeBatch(db);
        let resetCount = 0;
        questionsSnap.forEach((docSnap) => {
          if (docSnap.data().isUsed) {
            batch.update(doc(db, 'content', 'samarambh', 'questions', docSnap.id), { isUsed: false });
            resetCount++;
          }
        });
        if (resetCount > 0) {
          await batch.commit();
        }

        // Also ensure events/samarambh is in clean standby and not stuck
        await setDoc(doc(db, 'events', 'samarambh'), {
          status: 'waiting',
          gameMode: broadcastMode || 'solo',
          activeQuestion: null,
          skribbl: null,
          updatedAt: serverTimestamp()
        }, { merge: true });

        setStatusMsg('✅ All questions unfreezed & ready to push again!');
        setTimeout(() => setStatusMsg(''), 3000);
      }

      const querySnapshot = await getDocs(collection(db, 'content', 'samarambh', 'questions'));
      const blocks = [];
      querySnapshot.forEach((document) => {
        const data = document.data();
        blocks.push({ 
          id: document.id, 
          ...data,
          isUsed: resetUsed ? false : Boolean(data.isUsed)
        });
      });
      setSavedBlocks(blocks);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to load/reset blocks.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchBlocks(false);

    // Listen to real-time status of the event (with auto-recovery if deleted)
    const unsubscribe = onSnapshot(doc(db, 'events', 'samarambh'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveState(data);
        if (data.gameMode) {
          setBroadcastMode(data.gameMode);
        }
      } else {
        // When events/samarambh is deleted or missing, immediately unfreeze to clean standby!
        const standbyState = {
          status: 'waiting',
          gameMode: 'solo',
          activeQuestion: null,
          skribbl: null
        };
        setLiveState(standbyState);
        try {
          await setDoc(doc(db, 'events', 'samarambh'), standbyState);
        } catch (e) {
          console.warn("Could not re-initialize events/samarambh:", e);
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
    } else if (uiType === 'skribbl') {
      const word = skribblWord.trim();
      const hint = buildWordHint(word);
      const wordHash = hashWord(word);
      payload = {
        word,
        wordHash,
        hint: { display: hint.display, reveals: hint.reveals },
        category: skribblCategory.trim() || 'General Tech',
        correctAnswer: word
      };
    }

    try {
      await addDoc(collection(db, 'content', 'samarambh', 'questions'), {
        round: targetRound,
        type: uiType,
        timeLimit: Number(timeLimit) || 75,
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
      setSkribblWord(''); setSkribblCategory('');
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

      // Calculate question sequence within this round
      const roundBlocks = savedBlocks.filter(b => b.round === block.round);
      const sortedRoundBlocks = [...roundBlocks].sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      });
      const qIndex = sortedRoundBlocks.findIndex(b => b.id === block.id);
      const questionNumber = qIndex >= 0 ? qIndex + 1 : 1;
      const totalInRound = sortedRoundBlocks.length || 1;

      // 2. Push to Active Event Controller
      if (block.type === 'skribbl') {
        const word = block.payload?.word || '';
        const wordHash = block.payload?.wordHash || hashWord(word);
        const hint = block.payload?.hint || buildWordHint(word);

        sessionStorage.setItem('techarena_skribbl_word', JSON.stringify({ word, hash: wordHash }));

        await setDoc(doc(db, 'events', 'samarambh'), {
          status: 'playing',
          gameMode: broadcastMode,
          skribbl: {
            roundIndex: questionNumber,
            totalRounds: totalInRound,
            phase: 'drawing',
            wordLocked: true
          },
          activeQuestion: {
            id: block.id,
            round: block.round || 'Round 1',
            questionNumber: questionNumber,
            totalInRound: totalInRound,
            type: 'skribbl',
            roundId: block.id,
            roundIndex: questionNumber,
            timeLimit: Number(block.timeLimit) || 75,
            wordHash,
            hint: { display: hint.display, reveals: hint.reveals },
            hintLevel: 0,
            startTime: serverTimestamp(),
            word: null,
            category: block.payload?.category || 'Tech',
            payload: block.payload
          },
          updatedAt: serverTimestamp()
        });

        setActiveTab('skribbl');
      } else {
        await setDoc(doc(db, 'events', 'samarambh'), {
          status: 'playing',
          gameMode: broadcastMode, 
          activeQuestion: {
            id: block.id,
            round: block.round || 'Round 1',
            questionNumber: questionNumber,
            totalInRound: totalInRound,
            type: block.type,
            timeLimit: block.timeLimit,
            payload: block.payload,
            startTime: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });
      }

      setStatusMsg('🚀 Question broadcast live!');
      fetchBlocks();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to broadcast challenge.');
    }
  };

  const handleStopGame = async () => {
    if (isCalculating) return;
    setIsCalculating(true);
    setStatusMsg('Calculating scores & pushing leaderboard...');
    try {
      if (!liveState || !liveState.activeQuestion) {
        setStatusMsg('❌ No active challenge to score.');
        setIsCalculating(false);
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
      const playerUpdates = [];
      const teamTotals = {};

      answersSnap.forEach((ansDoc) => {
        const data = ansDoc.data();
        const pPin = data.pin || data.playerPin;
        const answerText = (data.submittedAnswer || data.answer || '').toString().trim().toLowerCase();
        const targetCorrect = (correctVal || '').toString().trim().toLowerCase();
        const teamCode = data.teamCode || null;

        if (pPin && !scoredPlayers.has(pPin)) {
          scoredPlayers.add(pPin);
          
          let points = 0;
          let isCorrect = Boolean(data.isCorrect);

          if (!isCorrect && targetCorrect && answerText === targetCorrect) {
            isCorrect = true;
          }

          if (isCorrect) {
            if (data.pointsAwarded && data.pointsAwarded > 0) {
              points = data.pointsAwarded;
            } else {
              const elapsed = data.timeTaken !== undefined ? Number(data.timeTaken) : (data.elapsedSeconds !== undefined ? Number(data.elapsedSeconds) : (activeQ.timeLimit || 20));
              const totalLimit = activeQ.timeLimit || 20;
              const speedBonus = Math.max(0, Math.round(((totalLimit - Math.min(totalLimit, elapsed)) / totalLimit) * 500));
              points = 1000 + speedBonus;
            }
          }

          if (points > 0) {
            // Only update score if client did not already directly award it
            if (!data.clientAwarded) {
              playerUpdates.push({ pin: pPin, points });
              if (teamCode) {
                teamTotals[teamCode] = (teamTotals[teamCode] || 0) + points;
              }
            }
          }
        }
      });

      // 2. Commit updates in atomic batches (staying safely under Firestore's 500 ops limit)
      const MAX_BATCH_SIZE = 400;
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const p of playerUpdates) {
        const playerRef = doc(db, 'players', p.pin);
        currentBatch.update(playerRef, { score: increment(p.points) });
        count++;

        if (count >= MAX_BATCH_SIZE) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          count = 0;
        }
      }

      for (const [tCode, totalPts] of Object.entries(teamTotals)) {
        const teamRef = doc(db, 'events', 'samarambh', 'teams', tCode);
        currentBatch.update(teamRef, { totalScore: increment(totalPts) });
        count++;

        if (count >= MAX_BATCH_SIZE) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await currentBatch.commit();
      }

      // 3. Switch Stage Display to Leaderboard
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'leaderboard',
        gameMode: broadcastMode,
        activeQuestion: null,
        lastCompletedQuestion: {
          id: qId,
          round: activeQ.round || liveState?.activeQuestion?.round || 'Round 1',
          questionNumber: activeQ.questionNumber || null,
          totalInRound: activeQ.totalInRound || null,
          type: activeQ.type,
          questionText: activeQ.payload?.question || activeQ.payload?.missionText || activeQ.payload?.prompt || activeQ.payload?.puzzleText || (activeQ.type === 'skribbl' ? `Skribbl: ${correctVal}` : 'Challenge Concluded'),
          correctAnswer: correctVal
        },
        skribbl: null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      sessionStorage.removeItem('techarena_skribbl_word');

      setStatusMsg(`Scores calculated for ${scoredPlayers.size} entries! Showing Leaderboard.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error("Score calculation error:", err);
      setStatusMsg('❌ Failed to calculate scores.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleProjectorOverride = async (newStatus, overrideMode = 'solo') => {
    setStatusMsg(`Changing projector to ${newStatus}...`);
    try {
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: newStatus, 
        gameMode: overrideMode,
        activeQuestion: null, 
        skribbl: null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setStatusMsg('✅ Projector updated successfully!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch {
      setStatusMsg('❌ Failed to update projector.');
    }
  };

  const filteredBlocks = savedBlocks
    .filter(b => b.round === activeRoundTab)
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

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

          <button 
            onClick={() => setActiveTab('skribbl')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'skribbl' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Skribbl</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 0: SKRIBBL DRAW & GUESS */}
        {/* ========================================================================= */}
        {activeTab === 'skribbl' && <SkribblControl />}

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
                  onChange={(e) => {
                    const val = e.target.value;
                    setUiType(val);
                    if (val === 'skribbl' && (timeLimit === 20 || timeLimit === '20')) {
                      setTimeLimit(75);
                    }
                  }} 
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3 rounded-xl text-slate-200 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                >
                  <option value="mcq">Standard MCQ</option>
                  <option value="terminal_hack">Terminal Hack</option>
                  <option value="photo_recognize">Threat / Photo Recognition</option>
                  <option value="logic_puzzle">Logic Puzzle</option>
                  <option value="skribbl">Skribbl Drawing</option>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <label className="block text-slate-300 text-xs font-semibold uppercase">
                        Image URL(s)
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Paste 1 URL for single image, or comma-separate for 2–4 images
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={photoUrls} 
                      onChange={e => setPhotoUrls(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500 font-mono" 
                      placeholder="Single: https://.../pic.png  OR  Multi: https://.../imgA.png, https://.../imgB.png" 
                      required 
                    />

                    {/* LIVE URL & IMAGE PREVIEW BOX */}
                    {(() => {
                      const parsedUrls = photoUrls.split(',').map(s => s.trim()).filter(Boolean);
                      if (parsedUrls.length === 0) return null;

                      return (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                              {parsedUrls.length === 1 
                                ? 'Single Image Mode (1 Image Verified)' 
                                : `Comparison Mode (${parsedUrls.length} Images side-by-side)`}
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                              {parsedUrls.length === 1 ? '1 Image Ready' : `${parsedUrls.length} Images Ready`}
                            </span>
                          </div>

                          <div className={`grid gap-2 ${parsedUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}>
                            {parsedUrls.map((url, idx) => {
                              const letter = String.fromCharCode(65 + idx);
                              const isSingle = parsedUrls.length === 1;

                              return (
                                <AdminPhotoPreviewCard 
                                  key={`${url}-${idx}`} 
                                  url={url} 
                                  letter={letter} 
                                  isSingle={isSingle} 
                                  idx={idx} 
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
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

              {uiType === 'skribbl' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-indigo-400 text-xs font-bold uppercase mb-1.5 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> Target Word (Secret To Draw & Guess)
                    </label>
                    <input 
                      type="text" 
                      value={skribblWord} 
                      onChange={e => setSkribblWord(e.target.value)} 
                      className="w-full bg-slate-950 border border-indigo-500/40 p-3.5 rounded-xl text-indigo-200 text-sm outline-none focus:border-indigo-500 font-semibold" 
                      placeholder="e.g. Firewall, Bitcoin, Phishing, Quantum" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase mb-1.5">Category / Clue Directive</label>
                    <input 
                      type="text" 
                      value={skribblCategory} 
                      onChange={e => setSkribblCategory(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-slate-100 text-sm outline-none focus:border-rose-500" 
                      placeholder="e.g. Cybersecurity, Networking, Crypto" 
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>When broadcasted live, students receive masked blanks with progressive hints on their phones, while stage displays show live guesses and scores.</span>
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
                  <h2 className="text-rose-400 font-extrabold tracking-widest uppercase text-sm mb-1 flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    <span>Game is currently LIVE</span>
                    {liveState?.activeQuestion?.round && (
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-rose-900/80 border border-rose-500/50 rounded-md text-white">
                        {liveState.activeQuestion.round} • Q{liveState.activeQuestion.questionNumber || 1}
                      </span>
                    )}
                  </h2>
                  <p className="text-slate-200 text-xs">Students are submitting answers right now.</p>
                </div>
                <button 
                  onClick={handleStopGame}
                  disabled={isCalculating}
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-6 py-3.5 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-rose-900/60 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Calculating Scores...</span>
                    </>
                  ) : (
                    <>
                      <StopCircle className="w-4 h-4" />
                      <span>🛑 Stop & Calculate</span>
                    </>
                  )}
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
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition-colors active:scale-95"
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
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-base font-bold text-white">Content Arsenal</h2>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-cyan-400 border border-slate-700/80">
                    {filteredBlocks.length} {filteredBlocks.length === 1 ? 'Challenge' : 'Challenges'}
                  </span>
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
                    onClick={() => fetchBlocks(true)} 
                    title="Refresh and unfreeze all questions to ready state"
                    className="text-xs bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-lg text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors font-medium active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button 
                    onClick={() => fetchBlocks(true)} 
                    title="Unfreeze all questions so they can be pushed again"
                    className="text-xs bg-cyan-600/30 hover:bg-cyan-600/50 px-3.5 py-1.5 rounded-lg text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-colors font-bold shadow-sm active:scale-95"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unfreeze All</span>
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
                  {filteredBlocks.map((block, index) => {
                    const isLive = liveState?.status === 'playing' && liveState?.activeQuestion?.id === block.id;
                    const isUsed = block.isUsed;
                    const textLabel = block.type === 'skribbl'
                      ? `Word: "${block.payload?.word}" (${block.payload?.category || 'Tech'})`
                      : (block.payload?.question || block.payload?.missionText || block.payload?.prompt || block.payload?.puzzleText || 'Challenge Block');

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
                          <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border shrink-0 shadow-sm ${
                            isLive 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                              : isUsed 
                              ? 'bg-slate-900 text-slate-500 border-slate-800' 
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          }`}>
                            Q{index + 1}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 border ${
                            block.type === 'skribbl'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : block.type === 'photo_recognize'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {block.type === 'skribbl' 
                              ? 'Skribbl' 
                              : block.type === 'photo_recognize'
                                ? `Photo (${(() => {
                                    const imgs = Array.isArray(block.payload?.images) && block.payload.images.length > 0 
                                      ? block.payload.images 
                                      : (block.payload?.imageUrl ? [block.payload.imageUrl] : []);
                                    return imgs.length === 1 ? '1 img' : `${imgs.length} imgs`;
                                  })()})`
                                : block.type}
                          </span>
                          <span className={`text-sm font-semibold truncate ${
                            isLive ? 'text-rose-300' : isUsed ? 'text-slate-500 line-through' : 'text-slate-200'
                          }`}>
                            {textLabel}
                          </span>
                        </div>

                        <button 
                          onClick={() => handlePushToGlobal(block)}
                          disabled={liveState?.status === 'playing' && !isLive}
                          className={`font-bold px-5 py-2.5 rounded-xl uppercase text-xs tracking-wider transition-all shrink-0 ${
                            isLive 
                              ? 'bg-rose-600 text-white cursor-not-allowed opacity-90' 
                              : isUsed 
                              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95' 
                              : liveState?.status === 'playing' 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm active:scale-95'
                          }`}
                        >
                          {isLive ? 'Currently Live' : isUsed ? '🔁 Re-Push' : 'Push to Screens'}
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
