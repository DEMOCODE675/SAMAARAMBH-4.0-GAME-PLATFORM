import React, { useMemo } from 'react';

// 16 Curated Crystal Glass Themes for authentic translucent depth & unique player identities
export const AVATAR_THEMES = [
  {
    id: 'emerald',
    name: 'Emerald Glass',
    gradient: 'from-emerald-500/50 via-teal-500/35 to-emerald-700/50',
    border: 'border-emerald-300/50 dark:border-emerald-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(16,185,129,0.28)]',
    accent: '#10b981'
  },
  {
    id: 'teal',
    name: 'Teal Frost',
    gradient: 'from-teal-500/50 via-cyan-500/35 to-teal-800/50',
    border: 'border-teal-300/50 dark:border-teal-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(20,184,166,0.28)]',
    accent: '#14b8a6'
  },
  {
    id: 'cyan',
    name: 'Cyan Glaze',
    gradient: 'from-cyan-500/50 via-sky-500/35 to-blue-700/50',
    border: 'border-cyan-300/50 dark:border-cyan-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(6,182,212,0.28)]',
    accent: '#06b6d4'
  },
  {
    id: 'sapphire',
    name: 'Sapphire Crystal',
    gradient: 'from-blue-500/50 via-indigo-500/35 to-blue-800/50',
    border: 'border-blue-300/50 dark:border-blue-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(59,130,246,0.28)]',
    accent: '#3b82f6'
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    gradient: 'from-indigo-500/50 via-violet-500/35 to-indigo-800/50',
    border: 'border-indigo-300/50 dark:border-indigo-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(99,102,241,0.28)]',
    accent: '#6366f1'
  },
  {
    id: 'violet',
    name: 'Violet Plasma',
    gradient: 'from-violet-500/50 via-purple-500/35 to-violet-800/50',
    border: 'border-violet-300/50 dark:border-violet-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(139,92,246,0.28)]',
    accent: '#8b5cf6'
  },
  {
    id: 'amethyst',
    name: 'Amethyst Shimmer',
    gradient: 'from-purple-500/50 via-fuchsia-500/35 to-purple-800/50',
    border: 'border-purple-300/50 dark:border-purple-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(168,85,247,0.28)]',
    accent: '#a855f7'
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia Prism',
    gradient: 'from-fuchsia-500/50 via-pink-500/35 to-fuchsia-800/50',
    border: 'border-fuchsia-300/50 dark:border-fuchsia-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(217,70,239,0.28)]',
    accent: '#d946ef'
  },
  {
    id: 'rose',
    name: 'Neon Rose',
    gradient: 'from-pink-500/50 via-rose-500/35 to-pink-800/50',
    border: 'border-pink-300/50 dark:border-pink-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(244,63,94,0.28)]',
    accent: '#f43f5e'
  },
  {
    id: 'ruby',
    name: 'Crimson Ruby',
    gradient: 'from-rose-600/50 via-red-500/35 to-rose-900/50',
    border: 'border-rose-400/50 dark:border-rose-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(225,29,72,0.28)]',
    accent: '#e11d48'
  },
  {
    id: 'coral',
    name: 'Coral Flare',
    gradient: 'from-orange-500/50 via-amber-500/35 to-red-700/50',
    border: 'border-orange-300/50 dark:border-orange-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(249,115,22,0.28)]',
    accent: '#f97316'
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    gradient: 'from-amber-500/50 via-yellow-500/35 to-orange-700/50',
    border: 'border-amber-300/50 dark:border-amber-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(245,158,11,0.28)]',
    accent: '#f59e0b'
  },
  {
    id: 'lime',
    name: 'Lime Aurora',
    gradient: 'from-lime-500/50 via-emerald-500/35 to-green-700/50',
    border: 'border-lime-300/50 dark:border-lime-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(132,204,22,0.28)]',
    accent: '#84cc16'
  },
  {
    id: 'mint',
    name: 'Mint Crystal',
    gradient: 'from-emerald-400/50 via-teal-400/35 to-cyan-700/50',
    border: 'border-emerald-300/50 dark:border-emerald-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(52,211,153,0.28)]',
    accent: '#34d399'
  },
  {
    id: 'sky',
    name: 'Sky Azure',
    gradient: 'from-sky-400/50 via-blue-500/35 to-indigo-700/50',
    border: 'border-sky-300/50 dark:border-sky-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(56,189,248,0.28)]',
    accent: '#38bdf8'
  },
  {
    id: 'gold',
    name: 'Golden Solar',
    gradient: 'from-yellow-400/50 via-amber-500/35 to-orange-800/50',
    border: 'border-yellow-300/50 dark:border-yellow-400/40',
    text: 'text-white',
    glow: 'shadow-[0_4px_16px_rgba(234,179,8,0.28)]',
    accent: '#eab308'
  }
];

// Generates 1-2 character initials cleanly
export const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Deterministic unique theme generator per user
export const getAvatarTheme = (name = '', seed = '') => {
  const combined = `${name || ''}_${seed || ''}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_THEMES.length;
  return AVATAR_THEMES[index];
};

/**
 * GlassAvatar Component
 * Authentic liquid frosted glass transparency with deterministic unique aesthetics.
 */
export default function GlassAvatar({
  name = '',
  seed = '',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  shape = 'rounded-2xl',
  className = '',
  showRing = false
}) {
  const initials = useMemo(() => getInitials(name), [name]);
  const theme = useMemo(() => getAvatarTheme(name, seed), [name, seed]);

  // Size mapping with balanced font sizes and paddings
  const sizeMap = {
    xs: {
      box: 'w-6 h-6',
      text: 'text-[9px]',
      shape: shape === 'rounded-2xl' ? 'rounded-lg' : shape
    },
    sm: {
      box: 'w-8 h-8',
      text: 'text-xs',
      shape: shape === 'rounded-2xl' ? 'rounded-xl' : shape
    },
    md: {
      box: 'w-10 h-10',
      text: 'text-sm',
      shape: shape === 'rounded-2xl' ? 'rounded-xl' : shape
    },
    lg: {
      box: 'w-12 h-12 md:w-14 md:h-14',
      text: 'text-base md:text-lg',
      shape: shape
    },
    xl: {
      box: 'w-14 h-14 md:w-16 md:h-16',
      text: 'text-lg md:text-xl',
      shape: shape
    },
    '2xl': {
      box: 'w-16 h-16 md:w-20 md:h-20',
      text: 'text-xl md:text-2xl',
      shape: 'rounded-3xl'
    }
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative overflow-hidden ${selectedSize.box} ${selectedSize.shape} backdrop-blur-xl border ${theme.border} bg-gradient-to-br ${theme.gradient} ${theme.glow} flex items-center justify-center select-none shrink-0 transition-all duration-300 ${
        showRing ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-[#070b14]' : ''
      } ${className}`}
      title={name}
    >
      {/* Specular Gloss Overlay (Top 45% Frosted Sheen) */}
      <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-[inherit]" />

      {/* Subtle Bottom Ambient Reflective Edge */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-white/25 pointer-events-none" />

      {/* Radial Glass Light Flare */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.22),transparent_65%)] pointer-events-none" />

      {/* Initials with high-contrast crisp typography */}
      <span className={`relative z-10 font-black tracking-tight ${theme.text} ${selectedSize.text} drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] font-sans`}>
        {initials}
      </span>
    </div>
  );
}
