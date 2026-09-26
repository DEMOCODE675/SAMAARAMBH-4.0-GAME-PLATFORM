import React from 'react';

// 🏷️ CLEAN LOGO-ONLY TOP-LEFT BADGE
const TopLeftLogoBadge = () => (
  <div className="absolute top-6 left-6 z-50 w-20 h-20 md:w-28 md:h-28 bg-black/60 backdrop-blur-md border-2 border-fuchsia-500/50 p-2 rounded-3xl shadow-[0_0_30px_rgba(217,70,239,0.3)] select-none flex items-center justify-center overflow-hidden">
    <img 
      src="/images/logo.jpg" 
      onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
      alt="MLSA MIET Organizer" 
      className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] scale-110" 
    />
  </div>
);

export default TopLeftLogoBadge;