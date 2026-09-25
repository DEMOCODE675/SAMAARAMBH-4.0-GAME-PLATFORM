import React from 'react';

// 🏷️ CLEAN LOGO-ONLY TOP-LEFT BADGE
  const TopLeftLogoBadge = () => (
    <div className="absolute top-6 left-6 z-50 bg-black/40 backdrop-blur-md border border-fuchsia-500/30 p-2 rounded-2xl shadow-[0_0_20px_rgba(217,70,239,0.2)] select-none">
      <img 
        src="/images/logo.jpg" 
        onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
        alt="MLSA MIET Organizer" 
        className="w-12 h-12 md:w-16 md:h-16 object-contain rounded-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
      />
    </div>
  );

export default TopLeftLogoBadge;