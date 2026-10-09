import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { submitAnswerRecord } from '../../../utils/offlineSync';
import { 
  Check, 
  Clock, 
  Lock, 
  Sun, 
  Moon, 
  Maximize2, 
  X, 
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import StageCountdown from '../../../components/StageCountdown';

const checkPhotoMatch = (selected, target, options) => {
  if (!selected || !target) return false;
  const s = String(selected).trim().toLowerCase();
  const t = String(target).trim().toLowerCase();
  if (s === t) return true;

  const letterMap = ['a', 'b', 'c', 'd', 'e', 'f'];
  const targetIndex = letterMap.indexOf(t);
  if (targetIndex !== -1 && options && options[targetIndex]) {
    if (String(options[targetIndex]).trim().toLowerCase() === s) return true;
  }

  const selectedIndex = letterMap.indexOf(s);
  if (selectedIndex !== -1 && options && options[selectedIndex]) {
    if (String(options[selectedIndex]).trim().toLowerCase() === t) return true;
  }

  const cleanS = s.replace(/^[a-f0-9][.)\-:\s]+/i, '').trim();
  const cleanT = t.replace(/^[a-f0-9][.)\-:\s]+/i, '').trim();
  if (cleanS && cleanS === cleanT) return true;

  return false;
};

const OPTION_BADGES = [
  { label: 'A', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60' },
  { label: 'B', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60' },
  { label: 'C', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60' },
  { label: 'D', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60' }
];

// Mobile Photo Thumbnail with pure React state error handling
function PhotoQuizThumbnail({ imgUrl, letter, isSingleImage, onZoom }) {
  const [hasError, setHasError] = useState(false);

  return (
    <button 
      type="button"
      onClick={() => onZoom({ 
        url: imgUrl, 
        letter: isSingleImage ? null : letter, 
        label: isSingleImage ? 'Visual Artifact' : `Image ${letter}` 
      })}
      className={`relative group w-full bg-slate-950/20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-zoom-in ${
        isSingleImage ? 'h-48 sm:h-56' : 'h-36 sm:h-40'
      }`}
    >
      {/* Visual Image Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/85 border border-white/20 backdrop-blur-sm shadow-md">
        {isSingleImage ? (
          <span className="text-white text-[10px] font-bold tracking-wider flex items-center gap-1">
            <ImageIcon className="w-2.5 h-2.5 text-indigo-400" />
            Artifact
          </span>
        ) : (
          <span className="text-white text-[10px] font-bold tracking-wider">
            Image {letter}
          </span>
        )}
      </div>

      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
          <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
          <span className="text-[10px]">Image Unavailable</span>
        </div>
      ) : (
        <img 
          src={imgUrl} 
          alt={isSingleImage ? 'Visual Artifact' : `Artifact ${letter}`} 
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={() => setHasError(true)}
        />
      )}

      <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white shadow-sm">
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

export default function PhotoQuizUI({ player, gameState, setHasSubmitted: setParentSubmitted }) {
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedAnswer, setLockedAnswer] = useState(null);
  const [activeImageZoom, setActiveImageZoom] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Eye-friendly theme
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

  const payload = gameState?.activeQuestion?.payload || {};
  const questionId = gameState?.activeQuestion?.id;
  const totalTimeLimit = gameState?.activeQuestion?.timeLimit || 20;

  const rawImages = (Array.isArray(payload.images) && payload.images.length > 0)
    ? payload.images
    : (typeof payload.images === 'string' && payload.images.trim()
        ? payload.images.split(',')
        : (payload.imageUrl ? (typeof payload.imageUrl === 'string' ? payload.imageUrl.split(',') : [payload.imageUrl]) : []));
  const images = rawImages.map(u => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
  const isSingleImage = images.length === 1;
  
  let optionsList = [];
  if (Array.isArray(payload.options)) {
    optionsList = payload.options;
  } else if (typeof payload.options === 'string') {
    optionsList = payload.options.split(',').map(o => o.trim()).filter(Boolean);
  }

  // Restore prior submission check from cache if page was refreshed
  useEffect(() => {
    try {
      const localKey = `submitted_${player.pin}_${questionId}`;
      if (localStorage.getItem(localKey) === 'true') {
        const timer = setTimeout(() => {
          if (setParentSubmitted) setParentSubmitted(true);
          setLockedAnswer('Recorded Earlier');
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.warn("Storage check failed:", err);
    }
  }, [questionId, player.pin, setParentSubmitted]);

  // Synchronized Timers with drift protection
  const [setupCountdown, setSetupCountdown] = useState(5);
  const [questionTimer, setQuestionTimer] = useState(totalTimeLimit);

  useEffect(() => {
    if (!gameState?.updatedAt) return;
    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();

    const updateTimers = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
      const remainingSetup = Math.min(5, Math.max(0, 5 - elapsedSeconds));
      
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(totalTimeLimit);
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = Math.max(0, totalTimeLimit - activeElapsed);
        setQuestionTimer(remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, totalTimeLimit]);

  useEffect(() => {
    if (setupCountdown === 0 && !questionStartTime) {
      const now = Date.now();
      const timer = setTimeout(() => {
        setQuestionStartTime(now);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [setupCountdown, questionStartTime]);

  const handleLockVerdict = async () => {
    if (!selected || isSubmitting || lockedAnswer) return;
    setIsSubmitting(true);

    const targetCorrect = payload?.correctAnswer || payload?.correct || payload?.answer || '';
    const isCorrect = checkPhotoMatch(selected, targetCorrect, optionsList);
    const timeTaken = questionStartTime ? Math.max(0, (Date.now() - questionStartTime) / 1000) : 0;
    const qId = questionId || 'photo_q';

    const totalLimit = totalTimeLimit || 30;
    const speedBonus = isCorrect ? Math.max(0, Math.round(((totalLimit - Math.min(totalLimit, timeTaken)) / totalLimit) * 500)) : 0;
    const pointsAwarded = isCorrect ? (1000 + speedBonus) : 0;

    let clientAwarded = false;

    // Immediately award points in Firestore with safety fallback
    if (pointsAwarded > 0 && player?.pin) {
      try {
        const playerRef = doc(db, 'players', player.pin);
        await updateDoc(playerRef, {
          score: increment(pointsAwarded)
        });
        clientAwarded = true;
      } catch (scoreErr) {
        console.warn("Direct player score increment deferred to admin batch:", scoreErr.message);
      }

      if (player.teamCode) {
        try {
          const teamRef = doc(db, 'events', 'samarambh', 'teams', player.teamCode);
          await updateDoc(teamRef, {
            totalScore: increment(pointsAwarded)
          });
        } catch (teamScoreErr) {
          console.warn("Direct team score increment deferred:", teamScoreErr.message);
        }
      }
    }

    const answerRecord = {
      pin: player.pin,
      playerPin: player.pin,
      name: player.name,
      playerName: player.name,
      teamCode: player.teamCode || null,
      gameMode: gameState?.gameMode || 'solo',
      questionId: qId,
      questionType: gameState?.activeQuestion?.type || 'photo_recognize',
      questionText: payload?.prompt || 'Threat Analysis Challenge',
      submittedAnswer: selected.trim(),
      answer: selected.trim(),
      isCorrect: isCorrect,
      pointsAwarded: pointsAwarded,
      clientAwarded: clientAwarded,
      explanation: payload?.explanation || '',
      timeTaken: Number(timeTaken.toFixed(1)),
      elapsedSeconds: Number(timeTaken.toFixed(1))
    };

    try {
      const localRecord = {
        questionId: qId,
        questionType: 'photo_recognize',
        questionText: payload?.question || 'Phishing / Fraud Detection',
        submittedAnswer: selected.trim(),
        answer: selected.trim(),
        explanation: payload?.explanation || '',
        timeTaken: Number(timeTaken.toFixed(1)),
        isCorrect,
        pointsAwarded,
        createdAt: Date.now(),
        timestamp: Date.now()
      };
      localStorage.setItem(`answer_${player.pin}_${qId}`, JSON.stringify(localRecord));
      localStorage.setItem(`latest_answer_${player.pin}`, JSON.stringify(localRecord));
      localStorage.setItem(`submitted_${player.pin}_${qId}`, 'true');
    } catch (e) {
      console.warn("Local storage write error:", e);
    }

    if (navigator.vibrate) navigator.vibrate(50);
    const lockedInfo = {
      selected: selected.trim(),
      isCorrect,
      pointsAwarded,
      timeTaken: Number(timeTaken.toFixed(1))
    };
    setLockedAnswer(lockedInfo);
    if (setParentSubmitted) setParentSubmitted(true);

    try {
      await submitAnswerRecord(answerRecord);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit chosen verdict when timer hits 0
  useEffect(() => {
    if (setupCountdown === 0 && questionTimer === 0 && selected && !lockedAnswer && !isSubmitting) {
      handleLockVerdict();
    }
  }, [setupCountdown, questionTimer, selected, lockedAnswer, isSubmitting]);

  // 1. COUNTDOWN STATE
  if (setupCountdown > 0) {
    return (
      <StageCountdown
        seconds={setupCountdown}
        maxSeconds={5}
        mode="mobile"
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        badgeText="Visual Loading"
        title="Visual Threat Analysis"
        subtitle="Carefully review the screenshot or image artifacts to determine the verdict."
        timeWindow={totalTimeLimit}
        brandName="Image Analysis"
      />
    );
  }

  // 2. LOCKED STATE
  if (lockedAnswer) {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="max-w-md w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/images/logo.jpg" 
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="MLSAMIET" 
              className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            />
            <span className="font-extrabold text-sm tracking-tight">
              MLSA<span className="text-indigo-600 dark:text-indigo-400">MIET</span>
            </span>
          </div>

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

        {/* Center Lock Card */}
        <div className="max-w-md w-full mx-auto text-center py-8">
          {/* Animated Circular Ring - Hover and Running effect */}
          <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
            {/* Subtle glowing ambient aura */}
            <div className="absolute -inset-3 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-lg" />

            {/* Outer active running spinner ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 dark:border-t-indigo-400 border-r-indigo-500 animate-spin" 
              style={{ animationDuration: '2s' }} 
            />
            {/* Reverse secondary subtle ring */}
            <div 
              className="absolute inset-2 rounded-full border border-dashed border-indigo-400/30 dark:border-indigo-300/25 animate-spin" 
              style={{ animationDuration: '5s', animationDirection: 'reverse' }} 
            />
            {/* Concentric radar pulse ring */}
            <div 
              className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-ping opacity-25" 
              style={{ animationDuration: '2.6s' }} 
            />
            {/* Centered lock badge */}
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/15">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Response Locked
          </h2>
          <p className={`text-xs mb-6 max-w-xs mx-auto leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Your response has been secured. Please wait for the host to conclude the round.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Live · Round in Progress</span>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center text-[11px] text-slate-400 pb-2">
          <span className="font-semibold text-slate-300">MLSA MIET</span> © 2026 All Rights Reserved
        </div>
      </div>
    );
  }

  // 3. ACTIVE INSPECTION
  const timePercentage = Math.max(0, Math.min(100, (questionTimer / totalTimeLimit) * 100));
  const isTimeCritical = questionTimer <= 5;
  const isTimeWarning = questionTimer <= 10 && questionTimer > 5;

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Dynamic Animated Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 overflow-hidden sticky top-0 z-40">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            isTimeCritical 
              ? 'bg-rose-500' 
              : isTimeWarning 
                ? 'bg-amber-500' 
                : 'bg-indigo-600 dark:bg-indigo-400'
          }`}
          style={{ width: `${timePercentage}%` }}
        />
      </div>

      {/* Header */}
      <header className={`px-4 py-3 border-b backdrop-blur-md sticky top-1.5 z-30 transition-colors ${
        isDarkMode ? 'bg-[#0b0f19]/90 border-slate-800' : 'bg-white/90 border-slate-200/80 shadow-sm'
      }`}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img 
              src="/images/logo.jpg" 
              onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
              alt="MLSAMIET" 
              className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight">
                  MLSA<span className="text-indigo-600 dark:text-indigo-400">MIET</span>
                </span>
                {/*<span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                  Inspect
                </span>*/}
              </div>
              {/*<p className="text-[11px] text-slate-500 dark:text-slate-400">
                Visual Challenge
              </p>*/}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
              isTimeCritical 
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse' 
                : isTimeWarning
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{questionTimer}s</span>
            </div>

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
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-md w-full mx-auto px-4 pt-4 pb-28 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Artifact Preview Card */}
          {images.length > 0 && (
            <div className={`rounded-2xl border p-3 transition-colors ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-2 px-1 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  {isSingleImage ? 'Artifact to Inspect' : `Artifacts to Inspect (${images.length})`}
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" /> Tap to expand
                </span>
              </div>

              <div className={`grid ${images.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1'} overflow-hidden rounded-xl`}>
                {images.map((imgUrl, index) => {
                  const letter = String.fromCharCode(65 + index);
                  return (
                    <PhotoQuizThumbnail 
                      key={`${imgUrl}-${index}`} 
                      imgUrl={imgUrl} 
                      letter={letter} 
                      isSingleImage={isSingleImage} 
                      onZoom={setActiveImageZoom} 
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Question / Prompt */}
          <div className={`p-4 md:p-5 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-slate-900/70 border-slate-800' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <span className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md mb-2 inline-block ${
              isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              Analysis Prompt
            </span>

            <h1 className="text-sm md:text-base font-bold leading-relaxed text-slate-900 dark:text-white">
              {payload?.prompt || 'Examine the artifact and select the correct verdict:'}
            </h1>
          </div>

          {/* Options */}
          {optionsList.length > 0 ? (
            <div className="space-y-2.5">
              {optionsList.map((opt, idx) => {
                const isSelected = selected === opt;
                const badge = OPTION_BADGES[idx % OPTION_BADGES.length];

                return (
                  <button 
                    key={idx}
                    onClick={() => setSelected(opt)}
                    disabled={isSubmitting || questionTimer <= 0}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between group active:scale-[0.99] min-h-[52px] ${
                      isSelected 
                        ? (isDarkMode 
                            ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 text-white' 
                            : 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/30 text-indigo-950 shadow-sm')
                        : (isDarkMode 
                            ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900' 
                            : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-slate-50/80 shadow-sm')
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 scale-105' 
                          : badge.bg
                      }`}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-medium leading-snug break-words">
                        {opt}
                      </span>
                    </div>

                    <div className="shrink-0 pl-1">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : (isDarkMode ? 'border-slate-700' : 'border-slate-300')
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-center">
              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                No predefined choices found for this challenge.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* PERSISTENT STICKY BOTTOM SUBMIT BAR */}
      <div className={`sticky bottom-0 z-30 p-3 md:p-4 border-t backdrop-blur-md transition-colors ${
        isDarkMode 
          ? 'bg-[#0b0f19]/95 border-slate-800 shadow-[0_-8px_20px_rgba(0,0,0,0.5)]' 
          : 'bg-white/95 border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]'
      } pb-[max(0.85rem,env(safe-area-inset-bottom))]`}>
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleLockVerdict}
            disabled={!selected || isSubmitting || questionTimer <= 0}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm ${
              selected && questionTimer > 0 && !isSubmitting
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95 cursor-pointer ring-2 ring-indigo-400/40'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Recording Option...</span>
              </>
            ) : selected ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Lock Option</span>
              </>
            ) : (
              <span>Choose Option to Submit</span>
            )}
          </button>
        </div>
      </div>

      {/* FULLSCREEN IMAGE ZOOM MODAL */}
      {activeImageZoom && (() => {
        const zoomUrl = typeof activeImageZoom === 'string' ? activeImageZoom : activeImageZoom?.url;
        const zoomLetter = typeof activeImageZoom === 'object' ? activeImageZoom?.letter : null;
        const zoomLabel = typeof activeImageZoom === 'object' ? activeImageZoom?.label : 'Artifact';

        return (
          <div 
            onClick={() => setActiveImageZoom(null)} 
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          >
            {/* Top Left: Prominent Image Letter Badge (only when multi-image) */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              {zoomLetter && (
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-lg">
                  {zoomLetter}
                </span>
              )}
              <span className="text-white font-bold text-sm bg-slate-900/80 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                {!zoomLetter && <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />}
                {zoomLabel}
              </span>
            </div>

            {/* Top Right: Close Controls */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/20 hidden sm:inline-block">
                Tap anywhere to close
              </span>
              <button
                onClick={() => setActiveImageZoom(null)}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center p-2">
              <img 
                src={zoomUrl} 
                alt={`Enlarged ${zoomLabel}`} 
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10" 
              />
            </div>
          </div>
        );
      })()}

    </div>
  );
}
