"use client";

import { motion } from "framer-motion";

export function MaterialTestingAnimation() {
  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      {/* Floating Particles (Dust/Soil) */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full bg-orange-300 mix-blend-screen opacity-50"
          style={{
            width: Math.random() * 8 + 4 + "px",
            height: Math.random() * 8 + 4 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 3 + 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Main Illustration Container */}
      <div className="relative z-10 w-full max-w-[320px] aspect-square flex items-center justify-center">
        {/* Background glow behind microscope */}
        <motion.div
          className="absolute inset-0 bg-white/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="microscope-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="liquid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="soil" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <linearGradient id="cement" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Desk/Base */}
          <rect x="20" y="320" width="360" height="15" rx="7.5" fill="#ffffff" opacity="0.9" />
          <rect x="40" y="335" width="320" height="25" fill="#f8fafc" rx="5" opacity="0.8" />

          {/* Soil Sample (Left) */}
          <g transform="translate(50, 240)">
            <motion.path
              d="M0 80 Q 20 20 40 80"
              fill="url(#soil)"
              animate={{ d: ["M0 80 Q 20 30 40 80", "M0 80 Q 20 40 40 80", "M0 80 Q 20 30 40 80"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <path d="M-10 80 L50 80 L45 90 L-5 90 Z" fill="#290e02" />
            {/* Plant/Sprout indicating soil */}
            <motion.path
              d="M20 40 Q 10 20 5 15 M20 40 Q 30 20 35 15 M20 40 L20 10"
              stroke="#4ade80"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              animate={{ rotate: [-3, 3, -3], transformOrigin: "20px 40px" }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>

          {/* Cement Block (Right) */}
          <g transform="translate(290, 260)">
            <rect x="0" y="0" width="60" height="60" rx="6" fill="url(#cement)" filter="url(#shadow)" />
            <polygon points="0,0 15,-15 75,-15 60,0" fill="#f1f5f9" />
            <polygon points="60,0 75,-15 75,45 60,60" fill="#94a3b8" />
            {/* Crack animating in cement */}
            <motion.path
              d="M 10 0 L 20 20 L 15 35 L 30 60"
              stroke="#334155"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: [100, 0, 0, 100] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </g>

          {/* Microscope (Center) */}
          <g transform="translate(130, 80) scale(1.1)">
            {/* Base */}
            <path d="M20 220 L100 220 L110 180 L10 180 Z" fill="#f8fafc" />
            <rect x="40" y="150" width="40" height="30" fill="#cbd5e1" />
            
            {/* Arm */}
            <path d="M80 160 C 130 160 140 50 80 30 L 60 30 C 100 60 100 130 60 160 Z" fill="url(#microscope-body)" filter="url(#shadow)" />
            
            {/* Stage */}
            <rect x="10" y="130" width="70" height="8" rx="4" fill="#64748b" />
            
            {/* Slide / Sample */}
            <rect x="30" y="125" width="30" height="5" fill="#f87171" rx="2" />
            
            {/* Light Source */}
            <motion.circle
              cx="45" cy="170" r="12"
              fill="#fbbf24"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Tube & Eyepiece */}
            <g transform="rotate(-15, 60, 60)">
              <rect x="30" y="20" width="30" height="80" rx="5" fill="url(#microscope-body)" filter="url(#shadow)" />
              <rect x="35" y="5" width="20" height="15" fill="#64748b" />
              <rect x="30" y="0" width="30" height="5" rx="2" fill="#334155" />
              
              {/* Objective Lenses */}
              <path d="M30 100 L60 100 L70 120 L20 120 Z" fill="#cbd5e1" />
              <rect x="35" y="120" width="10" height="15" fill="#e2e8f0" />
              <rect x="45" y="120" width="8" height="20" fill="#f8fafc" />
            </g>
          </g>

          {/* Water Flask (Left Mid) */}
          <g transform="translate(70, 150)">
            <path d="M30 0 L30 40 L50 90 A 25 25 0 0 1 10 90 L30 40 Z" fill="url(#glass)" />
            <path d="M25 0 L35 0 L35 5 L25 5 Z" fill="#334155" />
            
            {/* Liquid */}
            <motion.path
              d="M 12 85 Q 30 75 48 85 A 24 24 0 0 1 12 85 Z"
              fill="url(#liquid)"
              animate={{ d: ["M 12 85 Q 30 75 48 85 A 24 24 0 0 1 12 85 Z", "M 12 85 Q 30 95 48 85 A 24 24 0 0 1 12 85 Z"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
            />
            
            {/* Bubbles */}
            {[...Array(5)].map((_, i) => (
              <motion.circle
                key={`bubble-${i}`}
                cx={20 + Math.random() * 20}
                cy={80}
                r={Math.random() * 3 + 1}
                fill="#ffffff"
                opacity={0.6}
                animate={{ cy: [80, 40], opacity: [0, 0.8, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))}
          </g>

        </svg>
      </div>
    </div>
  );
}
