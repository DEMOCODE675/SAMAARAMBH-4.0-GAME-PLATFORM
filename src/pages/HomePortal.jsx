import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Tv, 
  Sliders, 
  ArrowUpRight, 
  Zap, 
  Sun, 
  Moon, 
  Radio
} from 'lucide-react';

export default function HomePortal() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('techarena_theme') !== 'light';
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('techarena_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const portals = [
    {
      to: '/play',
      badge: 'Contestant Terminal',
      title: 'Player Controller',
      actionLabel: 'Enter Arena',
      icon: Smartphone,
      accent: {
        glow: 'from-indigo-600/20 via-blue-500/10 to-transparent',
        border: 'group-hover:border-indigo-500/60 dark:group-hover:border-indigo-400/60',
        badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
        button: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 group-hover:translate-x-0.5'
      }
    },
    {
      to: '/projector',
      badge: 'Auditorium Display',
      title: 'Stage Projector',
      actionLabel: 'Launch Screen',
      icon: Tv,
      accent: {
        glow: 'from-amber-500/20 via-orange-500/10 to-transparent',
        border: 'group-hover:border-amber-500/60 dark:group-hover:border-amber-400/60',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconBg: 'bg-amber-500 text-slate-950 shadow-amber-500/30',
        button: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/30 group-hover:translate-x-0.5'
      }
    },
    {
      to: '/admin',
      badge: 'Mission Operator',
      title: 'Control Center',
      actionLabel: 'Open Dashboard',
      icon: Sliders,
      accent: {
        glow: 'from-rose-600/20 via-pink-500/10 to-transparent',
        border: 'group-hover:border-rose-500/60 dark:group-hover:border-rose-400/60',
        badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
        button: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 group-hover:translate-x-0.5'
      }
    }
  ];

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      isDarkMode ? 'bg-[#080c16] text-white selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-900 selection:bg-indigo-200'
    }`}>
      {/* Subtle Background Radial Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[120px] opacity-35 transition-colors ${
          isDarkMode ? 'bg-gradient-to-r from-indigo-700 via-rose-600 to-amber-600' : 'bg-gradient-to-r from-indigo-200 via-purple-100 to-amber-100'
        }`} />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/images/logo.jpg" 
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            alt="Logo" 
            className={`h-10 w-10 rounded-2xl object-contain p-1 border shadow-sm ${
              isDarkMode ? 'bg-slate-900 border-slate-800 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight">
                Tech<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
              </span>
              
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          

          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-slate-900/90 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Hero & Portal Grid */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 md:py-12 my-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
            Choose Your Portal
          </h1>
        </div>

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {portals.map((portal, index) => {
            const Icon = portal.icon;

            return (
              <motion.div
                key={portal.to}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.1 }}
                className="group relative"
              >
                <Link
                  to={portal.to}
                  className={`flex flex-col justify-between h-full p-6 sm:p-7 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-lg ${
                    isDarkMode 
                      ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 shadow-black/30' 
                      : 'bg-white border-slate-200/90 hover:bg-slate-50/70 shadow-slate-200/60'
                  } ${portal.accent.border}`}
                >
                  {/* Subtle Card Ambient Glow on Hover */}
                  <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${portal.accent.glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  {/* Top Meta info */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105 ${portal.accent.iconBg}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <span className={`text-[10px] font-bold font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${portal.accent.badgeBg}`}>
                        {portal.badge}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 flex items-center justify-between">
                      <span>{portal.title}</span>
                      <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                    </h2>

                    
                  </div>

                  {/* Card Bottom: Device Pill + Action Button */}
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between ">
                   

                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${portal.accent.button}`}>
                      <span>{portal.actionLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="font-semibold text-slate-300">MLSA miet</span>
          <span>© 2026 All Rights Reserved</span>
        </div>

       
      </footer>
    </div>
  );
}
