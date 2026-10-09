import React from 'react';

/**
 * SamaarambhBackground
 * 3-Band pastel background with decorative clouds, sparkles, and confetti dots
 * Matching the exact event branding mockup.
 */
export function SamaarambhBackground({ isFixed = false }) {
  return (
    <div className={`${isFixed ? 'fixed' : 'absolute'} inset-0 pointer-events-none overflow-hidden z-0 select-none`}>
      {/* 3 Horizontal Color Bands */}
      <div className="absolute inset-x-0 top-0 h-[34%] bg-[#ff8989]" />
      <div className="absolute inset-x-0 top-[34%] h-[32%] bg-[#ffb282]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[#fbe99f]" />

      {/* Top-Left Stylized Cloud */}
      <svg 
        viewBox="0 0 160 100" 
        className="w-24 sm:w-32 md:w-48 lg:w-56 absolute -top-3 -left-3 pointer-events-none opacity-85 z-0" 
        fill="none"
      >
        <path
          d="M30 80 Q10 80 15 60 Q10 35 35 35 Q45 15 75 20 Q105 10 125 35 Q150 40 145 65 Q155 80 130 80 Z"
          fill="#d1d5db"
          fillOpacity="0.85"
          stroke="#334155"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Top-Right Stylized Cloud with yellow star dots */}
      <svg 
        viewBox="0 0 160 100" 
        className="w-24 sm:w-32 md:w-48 lg:w-56 absolute -top-3 -right-3 pointer-events-none opacity-85 z-0" 
        fill="none"
      >
        <path
          d="M30 80 Q10 80 15 60 Q10 35 35 35 Q45 15 75 20 Q105 10 125 35 Q150 40 145 65 Q155 80 130 80 Z"
          fill="#d1d5db"
          fillOpacity="0.85"
          stroke="#334155"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Yellow dots/stars on the cloud */}
        <circle cx="130" cy="22" r="3" fill="#fadf76" />
        <circle cx="142" cy="30" r="2.5" fill="#fadf76" />
        <circle cx="120" cy="16" r="2" fill="#fadf76" />
        <circle cx="112" cy="26" r="1.5" fill="#fadf76" />
      </svg>

      {/* 4-point Orange Sparkle Star on Left Middle Band */}
      <div className="absolute left-2 sm:left-4 md:left-6 top-[48%] -translate-y-1/2 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-[#ff914d] drop-shadow-[0_0_12px_rgba(255,145,77,0.7)] animate-pulse">
          <path d="M12 0 C12 6.627 6.627 12 0 12 C6.627 12 12 17.373 12 24 C12 17.373 17.373 12 24 12 C17.373 12 12 6.627 12 0 Z" />
        </svg>
      </div>

      {/* 4-point Yellow Sparkle Star on Right Middle Band */}
      <div className="absolute right-2 sm:right-4 md:right-6 top-[38%] -translate-y-1/2 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-[#fadf76] drop-shadow-[0_0_12px_rgba(250,223,118,0.7)] animate-pulse">
          <path d="M12 0 C12 6.627 6.627 12 0 12 C6.627 12 12 17.373 12 24 C12 17.373 17.373 12 24 12 C17.373 12 12 6.627 12 0 Z" />
        </svg>
      </div>

      {/* 4-point Yellow Sparkle Star on Top Right */}
      <div className="absolute right-12 sm:right-20 md:right-28 top-4 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 fill-[#fadf76] drop-shadow-[0_0_8px_rgba(250,223,118,0.7)]">
          <path d="M12 0 C12 6.627 6.627 12 0 12 C6.627 12 12 17.373 12 24 C12 17.373 17.373 12 24 12 C17.373 12 12 6.627 12 0 Z" />
        </svg>
      </div>

      {/* Confetti Spray Dots Cluster on Bottom Left */}
      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-4 pointer-events-none opacity-75">
        <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20" fill="none">
          <circle cx="12" cy="70" r="3" fill="#ff5757" />
          <circle cx="24" cy="62" r="2.5" fill="#ff5757" />
          <circle cx="16" cy="52" r="3" fill="#ff5757" />
          <circle cx="32" cy="72" r="2" fill="#ff5757" />
          <circle cx="28" cy="46" r="2.5" fill="#ff5757" />
          <circle cx="42" cy="58" r="3" fill="#ff5757" />
          <circle cx="38" cy="38" r="2" fill="#ff5757" />
          <circle cx="22" cy="34" r="2" fill="#ff5757" />
          <circle cx="10" cy="40" r="2.5" fill="#ff5757" />
          <circle cx="50" cy="68" r="2" fill="#ff5757" />
          <circle cx="52" cy="48" r="2.5" fill="#ff5757" />
        </svg>
      </div>
    </div>
  );
}

/**
 * SamaarambhMascots
 * Overlaps the bottom-left and bottom-right edges of the white card
 */
export function SamaarambhMascots() {
  return (
    <>
      {/* Boy Mascot on Bottom-Left */}
      <img
        src="/images/Theme_Samaarambh 4.O (1).png"
        alt="Student Mascot"
        className="absolute bottom-0 left-0 sm:left-1 md:left-4 lg:left-8 h-[24vh] sm:h-[32vh] md:h-[45vh] lg:h-[50vh] max-h-[160px] sm:max-h-[230px] md:max-h-[430px] lg:max-h-[480px] w-auto object-contain object-bottom pointer-events-none z-20 drop-shadow-xl select-none"
      />

      {/* Girl Mascot on Bottom-Right */}
      <img
        src="/images/Theme_Samaarambh 4.O.png"
        alt="Student Mascot"
        className="absolute bottom-0 right-0 sm:right-1 md:right-4 lg:right-8 h-[24vh] sm:h-[32vh] md:h-[45vh] lg:h-[50vh] max-h-[160px] sm:max-h-[230px] md:max-h-[430px] lg:max-h-[480px] w-auto object-contain object-bottom pointer-events-none z-20 drop-shadow-xl select-none"
      />
    </>
  );
}

/**
 * SamaarambhHeroTitle
 * Render "SAMAARAMBH 4.0" in Boldfat Mighty font with orange & yellow sparkle stars
 */
export function SamaarambhHeroTitle({ className = "text-[clamp(1.75rem,5vw,4.5rem)]" }) {
  return (
    <div className="relative inline-block mx-auto">
      {/* Orange sparkle bottom-left */}
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 fill-[#ff914d] absolute -left-3.5 sm:-left-5 md:-left-8 bottom-0 sm:bottom-1 drop-shadow-[0_0_12px_rgba(255,145,77,0.7)] pointer-events-none animate-pulse"
      >
        <path d="M12 0 C12 6.627 6.627 12 0 12 C6.627 12 12 17.373 12 24 C12 17.373 17.373 12 24 12 C17.373 12 12 6.627 12 0 Z" />
      </svg>

      {/* Yellow sparkle top-right */}
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 fill-[#fadf76] absolute -right-3.5 sm:-right-5 md:-right-8 -top-1.5 sm:-top-3 md:-top-4 drop-shadow-[0_0_12px_rgba(250,223,118,0.7)] pointer-events-none animate-pulse"
      >
        <path d="M12 0 C12 6.627 6.627 12 0 12 C6.627 12 12 17.373 12 24 C12 17.373 17.373 12 24 12 C17.373 12 12 6.627 12 0 Z" />
      </svg>

      <h1 className={`font-bold-fat-mighty whitespace-nowrap leading-none tracking-tight text-black drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${className}`}>
        SAMAARAMBH 4.0
      </h1>
    </div>
  );
}

