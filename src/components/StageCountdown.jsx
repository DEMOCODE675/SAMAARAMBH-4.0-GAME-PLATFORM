import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Clock, Zap, Sparkles } from 'lucide-react';

/**
 * StageCountdown - High impact, modern, cinematic countdown component
 * Supports both mobile contestant controllers and stage auditorium projectors
 */
export default function StageCountdown({
  seconds = 5,
  maxSeconds = 5,
  mode = 'mobile', // 'mobile' | 'projector'
  isDarkMode = true,
  onToggleTheme,
  badgeText = 'Incoming Arena Challenge',
  title = 'Get Ready!',
  subtitle = 'Prepare to choose your answer quickly. Speed and precision yield peak multipliers.',
  timeWindow = 20,
  logoSrc = '/images/logo.jpg',
  brandName = 'Samarambh 4.0'
}) {
  const progressRatio = Math.max(0, Math.min(1, seconds / maxSeconds));

  // PROJECTOR CINEMA VIEW
  if (mode === 'projector') {
    return (
      <motion.div 
        initial={{ scale: 0.94, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full flex flex-col items-center justify-center text-center my-auto py-6"
      >
        {/* Glow Halo and Concentric Rings */}
        <div className="relative inline-flex items-center justify-center mb-8">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute -inset-16 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-indigo-500/20 blur-3xl opacity-70 pointer-events-none" />

          {/* SVG Circular Precision Arc */}
          <svg className="w-56 h-56 md:w-64 md:h-64 -rotate-90 transform drop-shadow-[0_0_35px_rgba(245,158,11,0.45)]">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-white/10 fill-slate-950/70"
              strokeWidth="8"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-amber-400 fill-transparent"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="276"
              animate={{ strokeDashoffset: 276 * (1 - progressRatio) }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </svg>

          {/* Digital Numerical Core with Pulse animation */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={seconds}
                initial={{ scale: 1.4, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.7, opacity: 0, y: 10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500 font-mono tracking-tight drop-shadow-[0_0_40px_rgba(245,158,11,0.6)]"
              >
                {seconds}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs uppercase tracking-[0.3em] text-amber-200/80 font-bold -mt-2">
              SEC REMAINING
            </span>
          </div>
        </div>

        {/* Clean Typographic Meta Hierarchy */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{badgeText}</span>
        </div>

        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-wider uppercase mb-3 drop-shadow-md">
          {title}
        </h2>
        
        <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
          {subtitle}
        </p>

        {/* Tactical status readout */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs md:text-sm font-mono text-slate-400 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300">STAGE SYNC: VERIFIED</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>SPEED WINDOW: <strong className="text-white">{timeWindow}s</strong></span>
          </div>
        </div>
      </motion.div>
    );
  }

  // MOBILE CONTESTANT VIEW
  return (
    <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Mobile Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img 
            src={logoSrc} 
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            alt="Logo" 
            className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          />
          <div>
            <span className="font-extrabold text-sm tracking-tight">
              Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
            </span>
            <p className="text-[10px] text-slate-500">{brandName}</p>
          </div>
        </div>

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Center Countdown Meter */}
      <div className="max-w-md w-full mx-auto text-center py-6">
        <div className="relative inline-flex items-center justify-center mb-6">
          {/* Subtle Outer Ring Glow */}
          <div className="absolute -inset-4 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

          {/* SVG Progress Circle */}
          <svg className="w-36 h-36 -rotate-90 transform">
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              className={`fill-transparent ${isDarkMode ? 'stroke-slate-800/80' : 'stroke-slate-200'}`}
              strokeWidth="6"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="40%"
              className="stroke-indigo-600 dark:stroke-indigo-400 fill-transparent"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="180"
              animate={{ strokeDashoffset: 180 * (1 - progressRatio) }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </svg>

          {/* Digital Big Count Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={seconds}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="text-6xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight"
              >
                {seconds}
              </motion.span>
            </AnimatePresence>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Seconds
            </span>
          </div>
        </div>

        {/* Clean Meta Header (No heavy pill clutter) */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-3 border border-indigo-200 dark:border-indigo-800/60">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{badgeText}</span>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight mb-2">
          {title}
        </h2>
        
        <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {subtitle}
        </p>

        {/* Time Limit Indicator */}
        <div className={`mt-6 p-3.5 rounded-2xl border text-xs max-w-xs mx-auto flex items-center justify-between shadow-sm ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">Active Window:</span>
          </div>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
            {timeWindow}s
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-400 pb-2 font-medium">
        Samarambh 4.0 · High Velocity Stage Engine
      </div>
    </div>
  );
}
