import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import { User, KeyRound, ArrowRight, Sun, Moon } from 'lucide-react';

export default function PlayerLogin() {
  const { registerNewPlayer, signInWithPin } = useContext(AuthContext);
  
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isReturningUser) {
        if (!inputValue.trim()) throw new Error("Enter your 4-digit PIN");
        await signInWithPin(inputValue.trim());
      } else {
        if (inputValue.trim().length < 2) throw new Error("Name is too short");
        await registerNewPlayer(inputValue.trim());
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between p-6 transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img 
            src="/images/logo.jpg" 
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            alt="TechArena" 
            className={`h-9 w-9 rounded-xl object-contain p-1 border shadow-sm ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          />
          <div>
            <span className="font-extrabold text-sm tracking-tight">
              Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
            </span>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">SAMARAMBH 4.0</p>
          </div>
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

      {/* Main Login Card */}
      <div className="max-w-sm w-full mx-auto my-auto py-4">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`rounded-3xl border p-6 md:p-8 shadow-xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/80 border-slate-800 shadow-black/40 backdrop-blur-md' 
              : 'bg-white border-slate-200/90 shadow-slate-200/50'
          }`}
        >
          {/* Segmented Switch: New / PIN */}
          <div className={`flex rounded-2xl p-1 mb-6 border ${
            isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => { setIsReturningUser(false); setInputValue(''); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                !isReturningUser 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Join Live</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsReturningUser(true); setInputValue(''); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                isReturningUser 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN Code</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={isReturningUser ? 'pin' : 'name'}
                  initial={{ opacity: 0, x: isReturningUser ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isReturningUser ? -10 : 10 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-1.5"
                >
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {isReturningUser ? 'Enter 4-Digit PIN' : 'Your Contestant Name'}
                  </label>
                  
                  <div className="relative">
                    <input 
                      type={isReturningUser ? "text" : "text"}
                      inputMode={isReturningUser ? "numeric" : "text"}
                      maxLength={isReturningUser ? 4 : 24}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={isReturningUser ? "• • • •" : "e.g. Alex"}
                      autoFocus
                      className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold outline-none border transition-all ${
                        isReturningUser 
                          ? 'text-center font-mono text-2xl tracking-[0.3em]' 
                          : 'text-left'
                      } ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10'
                      }`}
                      autoComplete="off"
                      required
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-500 text-xs text-center font-medium py-1"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting || !inputValue.trim()} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-600/25 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
            >
              <span>{isSubmitting ? 'Connecting...' : (isReturningUser ? 'Restore Session' : 'Enter Arena')}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-slate-400 font-medium">
        TechArena · Live Interactive Engine
      </div>
    </div>
  );
}
