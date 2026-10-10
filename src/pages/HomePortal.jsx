import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  SamaarambhBackground, 
  SamaarambhMascots, 
  SamaarambhHeroTitle 
} from '../components/SamaarambhTheme';

export default function HomePortal() {
  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between items-center select-none relative font-sans p-2 sm:p-4 md:p-6 bg-[#fbe99f] text-slate-900">
      {/* 3-Band Background Layer with decorative clouds, sparkles, confetti */}
      <SamaarambhBackground />

      {/* Top Header Navigation (OUTSIDE the white card, on top light-red band) */}
      <header className="relative z-20 w-[90%] sm:w-[88%] md:w-[86%] lg:w-[84%] max-w-5xl lg:max-w-6xl xl:max-w-7xl flex items-center justify-between shrink-0 px-2 pt-1 pb-1 sm:pb-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <img 
            src="/images/logo.jpg" 
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            alt="Logo" 
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain p-1 bg-white border border-slate-200/60 shadow-md"
          />
          <span className="font-black text-base sm:text-lg tracking-tight text-white drop-shadow-sm">
            MLSA<span className="text-amber-200">MIET</span>
          </span>
        </div>
      </header>

      {/* Framed Center Card: Grand & Wide on laptop, margins on phone, 100% zero scroll */}
      <div className="relative flex-1 w-[90%] sm:w-[88%] md:w-[86%] lg:w-[84%] max-w-5xl lg:max-w-6xl xl:max-w-7xl rounded-[2.2rem] sm:rounded-[2.8rem] md:rounded-[3.2rem] border-2 sm:border-[3px] border-slate-900 bg-white text-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col justify-between overflow-hidden z-10 my-1 sm:my-2 px-4 py-3 sm:py-5 md:py-6">
        {/* Top: SAMAARAMBH 4.0 Hero Title with Sparkles */}
        <div className="relative z-20 pt-1 sm:pt-2 md:pt-4 px-4 text-center shrink-0">
          <SamaarambhHeroTitle className="text-[clamp(1.6rem,4.5vw,3.6rem)]" />
        </div>

        {/* Center: The Single Player Controller Card */}
        <div className="relative z-20 flex-1 flex items-center justify-center px-4 py-1.5 my-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-[270px] sm:max-w-[310px] md:max-w-[360px]"
          >
            <Link
              to="/play"
              className="group flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 relative overflow-hidden shadow-xl hover:shadow-2xl active:scale-[0.99] bg-white border-indigo-200 hover:border-indigo-400 shadow-indigo-100/80"
            >
              {/* Top Row: Icon & Badge */}
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                <span className="text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                  Players Room
                </span>
              </div>

              {/* Title */}
              <div className="text-left mb-2 sm:mb-3">
                <h2 className="text-base sm:text-xl font-black tracking-tight flex items-center justify-between text-slate-900">
                  <span>Player Controller</span>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </h2>
                
              </div>

              {/* Action Button */}
              <div className="pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between">
              
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-indigo-600 group-hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all">
                  <span>Enter To The Game</span>
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Bottom: Footer info (centered between the stickers, no overlap) */}
        <footer className="relative z-20 w-full px-4 pb-1 sm:pb-2 flex items-center justify-center shrink-0 text-[10px] sm:text-xs text-slate-400 font-medium">
          <p className="text-center">
            Organized by <strong className="text-slate-800">MLSA MIET</strong>
          </p>
        </footer>
      </div>

      {/* Mascots Overlapping the bottom-left and bottom-right of the white card */}
      <SamaarambhMascots />
    </div>
  );
}
