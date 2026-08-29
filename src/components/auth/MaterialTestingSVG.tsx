"use client";

import { motion } from "framer-motion";

export function MaterialTestingSVG() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg viewBox="0 0 500 400" className="w-full h-full max-w-[400px] drop-shadow-xl" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="flask-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Table */}
        <rect x="50" y="280" width="300" height="15" fill="#f8fafc" />
        <rect x="70" y="295" width="260" height="85" fill="#cbd5e1" opacity="0.3" />
        <line x1="90" y1="295" x2="90" y2="380" stroke="#94a3b8" strokeWidth="4" />
        <line x1="270" y1="295" x2="270" y2="380" stroke="#94a3b8" strokeWidth="4" />
        <rect x="100" y="305" width="60" height="20" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
        <rect x="100" y="330" width="60" height="20" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />

        {/* Flask */}
        <g transform="translate(120, 200)">
          <path d="M20 0 L20 30 L40 70 A 20 20 0 0 1 0 70 L20 30 Z" fill="#e2e8f0" opacity="0.8" />
          <path d="M 5 60 Q 20 50 35 60 A 15 15 0 0 1 5 60 Z" fill="url(#flask-liquid)" />
          <rect x="15" y="-5" width="10" height="8" fill="#94a3b8" />
          {/* Animated bubbles */}
          <motion.circle cx="15" cy="65" r="2" fill="#fff" animate={{ cy: [65, 45], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <motion.circle cx="25" cy="65" r="3" fill="#fff" animate={{ cy: [65, 35], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
        </g>

        {/* Microscope */}
        <g transform="translate(200, 140)">
          <path d="M10 130 L70 130 L70 140 L10 140 Z" fill="#1e293b" />
          <path d="M20 120 L60 120 L60 130 L20 130 Z" fill="#f1f5f9" />
          <path d="M50 120 C 80 120 90 40 50 30 L 40 30 C 70 50 70 110 40 120 Z" fill="#f8fafc" filter="url(#soft-shadow)" />
          <rect x="10" y="90" width="40" height="8" fill="#475569" />
          <rect x="15" y="98" width="30" height="20" fill="#64748b" />
          
          <g transform="rotate(-30, 40, 40)">
            <rect x="25" y="0" width="30" height="60" rx="4" fill="#f8fafc" />
            <rect x="30" y="-15" width="20" height="15" fill="#334155" />
            <path d="M25 60 L55 60 L60 80 L20 80 Z" fill="#64748b" />
            <rect x="25" y="80" width="8" height="15" fill="#475569" />
            <rect x="40" y="80" width="8" height="20" fill="#1e293b" />
          </g>
        </g>

        {/* Character */}
        <g transform="translate(290, 80)">
          {/* Hair Back */}
          <circle cx="60" cy="50" r="35" fill="#4a3b5c" />
          <circle cx="90" cy="40" r="25" fill="#4a3b5c" />
          
          {/* Body / Lab Coat */}
          <path d="M40 110 C 60 110 70 130 70 170 C 80 200 90 250 80 290 L 10 290 C 20 220 10 130 40 110 Z" fill="#f8fafc" filter="url(#soft-shadow)" />
          
          {/* Arm & Hand (Animated) */}
          <motion.g
            animate={{ rotate: [-5, 5, -5], transformOrigin: "30px 120px" }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M40 110 C 50 130 30 180 -10 180 L -15 160 C 20 160 30 120 40 110 Z" fill="#f8fafc" />
            <circle cx="-15" cy="170" r="10" fill="#ffcdb2" />
          </motion.g>

          {/* Legs */}
          <rect x="30" y="290" width="12" height="40" fill="#ffcdb2" />
          <rect x="50" y="290" width="12" height="40" fill="#ffcdb2" />

          {/* Head (Animated) */}
          <motion.g
            animate={{ rotate: [-2, 2, -2], transformOrigin: "40px 90px" }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx="30" cy="50" r="30" fill="#ffcdb2" />
            <path d="M20 75 Q 30 85 45 75 Z" fill="#ffcdb2" />
            <circle cx="60" cy="55" r="8" fill="#ffcdb2" />
            <path d="M0 50 C -10 10 40 -10 60 20 C 70 30 70 50 70 60 C 50 30 20 20 0 50 Z" fill="#4a3b5c" />
            {/* Glasses */}
            <circle cx="10" cy="50" r="14" fill="none" stroke="#1e293b" strokeWidth="4" />
            <line x1="24" y1="50" x2="60" y2="45" stroke="#1e293b" strokeWidth="4" />
            {/* Eye (Blinking) */}
            <motion.circle 
              cx="10" cy="50" r="4" fill="#1d4ed8" 
              animate={{ scaleY: [1, 1, 0, 1, 1] }} 
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }} 
            />
          </motion.g>
        </g>
      </svg>
    </div>
  );
}
