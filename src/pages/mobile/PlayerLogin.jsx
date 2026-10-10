import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import { User, KeyRound, ArrowRight } from 'lucide-react';
import { 
  SamaarambhBackground, 
  SamaarambhHeroTitle 
} from '../../components/SamaarambhTheme';

export default function PlayerLogin() {
  const { registerNewPlayer, signInWithPin } = useContext(AuthContext);
  
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isReturningUser) {
        if (!inputValue.trim()) throw new Error("Enter your Login Code");
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
    <div className="min-h-[100dvh] sm:h-[100dvh] sm:max-h-[100dvh] w-full overflow-y-auto sm:overflow-hidden flex flex-col justify-between items-center select-none relative font-sans p-2 sm:p-4 md:p-6 bg-[#fbe99f] text-slate-900">
      {/* 3-Band Background Layer with decorative clouds, sparkles, confetti */}
      <SamaarambhBackground />

      {/* Top Header Navigation (OUTSIDE the white card, on top light-red band) */}
      <header className="relative z-20 w-[94%] sm:w-[88%] md:w-[86%] lg:w-[84%] max-w-5xl lg:max-w-6xl xl:max-w-7xl flex items-center justify-between shrink-0 px-2 pt-1 pb-1 sm:pb-2">
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

      {/* Framed Center Card: Grand & Wide on laptop, margins on phone, smooth content distribution */}
      <div className="relative flex-1 w-[94%] sm:w-[88%] md:w-[86%] lg:w-[84%] max-w-5xl lg:max-w-6xl xl:max-w-7xl rounded-[2rem] sm:rounded-[2.8rem] md:rounded-[3.2rem] border-2 sm:border-[3px] border-slate-900 bg-white text-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col justify-between overflow-hidden z-10 my-1 sm:my-2 px-3 sm:px-6 py-2.5 sm:py-5 md:py-6">
        {/* Top: SAMAARAMBH 4.0 Hero Title with Subtitle Badge */}
        <div className="relative z-20 pt-1 sm:pt-2 md:pt-3 px-2 sm:px-4 text-center shrink-0">
          <SamaarambhHeroTitle className="text-[clamp(1.4rem,4.2vw,3.6rem)]" />
          <div className="mt-1 sm:mt-1.5 flex items-center justify-center">
           
            
          </div>
        </div>

        {/* Center: Main Login Box */}
        <div className="relative z-20 w-full max-w-[310px] sm:max-w-[350px] md:max-w-[390px] mx-auto flex-1 flex flex-col justify-center py-2 sm:py-3">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-3xl border-2 border-indigo-200/90 bg-white p-3.5 sm:p-6 shadow-xl shadow-indigo-100/70"
          >
            {/* Segmented Switch: Join Live / Login Code */}
            <div className="flex rounded-2xl p-1 mb-3.5 sm:mb-5 border border-slate-200 bg-slate-100">
              <button
                type="button"
                onClick={() => { setIsReturningUser(false); setInputValue(''); setError(''); }}
                className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  !isReturningUser 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Join Live</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsReturningUser(true); setInputValue(''); setError(''); }}
                className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  isReturningUser 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Login Code</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isReturningUser ? 'pin' : 'name'}
                    initial={{ opacity: 0, x: isReturningUser ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isReturningUser ? -10 : 10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1 sm:space-y-1.5"
                  >
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {isReturningUser ? 'Enter Login Code' : 'Your Name'}
                    </label>
                    
                    <div className="relative">
                      <input 
                        type="text"
                        inputMode={isReturningUser ? "numeric" : "text"}
                        maxLength={isReturningUser ? 6 : 24}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isReturningUser ? "• • • • • •" : "e.g. Nancy"}
                        autoFocus
                        className={`w-full rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3.5 text-sm sm:text-base font-semibold outline-none border transition-all bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 ${
                          isReturningUser 
                            ? 'text-center font-mono text-xl sm:text-2xl tracking-[0.25em] sm:tracking-[0.3em]' 
                            : 'text-left'
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
                  className="text-rose-500 text-xs text-center font-medium py-0.5"
                >
                  {error}
                </motion.p>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting || !inputValue.trim()} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-600/25 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                <span>{isSubmitting ? 'Connecting...' : (isReturningUser ? 'Login' : 'Submit')}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Bottom: Footer info */}
        <footer className="relative z-20 w-full px-4 pb-2 sm:pb-3 flex items-center justify-center shrink-0 text-[10px] sm:text-xs text-slate-400 font-medium">
          <p className="text-center">
            Organized by <strong className="text-slate-800">MLSA MIET</strong>
          </p>
        </footer>
      </div>

      {/* Different Mascot Assets: Conversation & Team Collaboration stickers */}
      {/* Left: Students chatting with speech bubbles */}
      <img
        src="/images/Theme_Samaarambh 4.O (2).png"
        alt="Students Discussion"
        className="absolute bottom-0 left-0 sm:left-1 md:left-4 lg:left-8 h-[10vh] sm:h-[22vh] md:h-[34vh] lg:h-[40vh] max-h-[70px] sm:max-h-[160px] md:max-h-[300px] lg:max-h-[370px] w-auto object-contain object-bottom pointer-events-none z-20 drop-shadow-xl select-none"
      />

      {/* Right: Team of students collaborating with laptops at table */}
      <img
        src="/images/Theme_Samaarambh 4.O (7).png"
        alt="Team Collaboration"
        className="absolute bottom-0 right-0 sm:right-1 md:right-4 lg:right-8 h-[9vh] sm:h-[20vh] md:h-[30vh] lg:h-[36vh] max-h-[64px] sm:max-h-[150px] md:max-h-[270px] lg:max-h-[340px] w-auto object-contain object-bottom pointer-events-none z-20 drop-shadow-xl select-none"
      />
    </div>
  );
}
