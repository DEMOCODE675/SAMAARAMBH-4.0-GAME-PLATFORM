import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Sliders
} from 'lucide-react';

/**
 * AdminAuthGate - Security Verification Gate for Admin Control Panel
 * Accesses authorized key via Vite import method: import.meta.env.VITE_ADMIN_KEY
 */
export default function AdminAuthGate({ children }) {
  // Access security key using import method
  const ADMIN_SECURITY_KEY = import.meta.env.VITE_ADMIN_KEY;

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('techarena_admin_auth') === 'true';
  });

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleVerify = (e) => {
    e.preventDefault();
    const entered = inputKey.trim();
    // Authorized key verification using imported environment key
    const expectedKey = (ADMIN_SECURITY_KEY && ADMIN_SECURITY_KEY.trim()) || 'techarena@admin2026';

    if (entered && entered === expectedKey) {
      sessionStorage.setItem('techarena_admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Access Denied: Invalid Security Key');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('techarena_admin_auth');
    setIsAuthenticated(false);
    setInputKey('');
    setError('');
  };

  // If session is authenticated, render the admin dashboard with persistent lock control
  if (isAuthenticated) {
    return (
      <>
        {/* Floating Quick-Lock button for administrator */}
        <div className="fixed top-4 right-4 z-50 select-none">
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-semibold backdrop-blur-md shadow-xl transition-all active:scale-95"
            title="Lock Admin Session"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Lock Admin</span>
          </button>
        </div>
        {children}
      </>
    );
  }

  // Security Gate Screen
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-between p-6 select-none relative font-sans overflow-hidden">
      {/* Ambient Lighting & Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[140px] bg-gradient-to-r from-rose-600/20 via-indigo-600/15 to-purple-600/20 opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f008_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f008_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      </div>

      {/* Top Header Logo */}
      <header className="w-full max-w-md mx-auto pt-6 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/images/logo.jpg" 
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            alt="Logo" 
            className="w-10 h-10 object-contain rounded-xl p-1 bg-white/10 border border-white/20 shadow-md"
          />
          <div>
            <span className="font-black text-sm tracking-tight text-white block">
              Tech<span className="text-rose-500">Arena</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider block">
              Samarambh 4.0
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </Link>
      </header>

      {/* Center Security Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md my-auto z-10"
      >
        <div className={`w-full bg-slate-900/80 backdrop-blur-2xl border-2 border-slate-800 p-8 rounded-3xl shadow-2xl transition-all ${
          isShaking ? 'border-rose-500/80 ring-2 ring-rose-500/40' : ''
        }`}>
          {/* Lock Icon Emblem */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/60 mb-4 ring-4 ring-rose-500/20">
              <Lock className="w-8 h-8 text-white" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sliders className="w-3 h-3" />
              <span>Restricted Access</span>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Admin Verification
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Enter your authorized security key to access the live stage control matrix.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Security Key
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>

                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  placeholder="Enter authorized key..."
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-white font-mono text-sm placeholder-slate-500 outline-none transition-all shadow-inner"
                />

                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-950/50 hover:shadow-rose-900/40 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Access</span>
            </button>
          </form>

          {/*<div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500 font-mono">
              Authorized operators only · All sessions logged
            </span>
          </div>*/}
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-500 pb-4 z-10">
        Organized by <strong className="text-slate-400">MLSA MIET</strong>
      </footer>
    </div>
  );
}
