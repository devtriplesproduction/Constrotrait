"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function MaterialTestingAnimation() {
  return (
    <div className="relative w-full max-h-[500px] flex-1 flex items-center justify-center">
      
      {/* Background ambient glow matching the image */}
      <motion.div
        className="absolute inset-0 bg-white/10 rounded-full blur-[100px]"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main Image Container */}
      <motion.div 
        className="relative z-10 w-full max-w-[450px] aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-white/20"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Image
          src="/lab-testing.jpg"
          alt="Advanced Material Testing Laboratory"
          fill
          className="object-cover"
          priority
        />
        
        {/* Floating Glassmorphism Badges */}
        <motion.div 
          className="absolute top-6 right-6 bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl p-3 flex items-center gap-3 shadow-lg"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Water Analysis</p>
            <p className="text-blue-100 text-[10px]">99.9% Purity</p>
          </div>
        </motion.div>

        <motion.div 
          className="absolute bottom-8 left-6 bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl p-3 flex items-center gap-3 shadow-lg"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="w-8 h-8 rounded-full bg-green-500/80 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          </div>
          <div>
            <p className="text-white text-xs font-semibold leading-tight">Soil Strength</p>
            <p className="text-green-100 text-[10px]">Optimal Grade</p>
          </div>
        </motion.div>

        {/* Overlay subtle gradient to blend the edges if needed */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </motion.div>
    </div>
  );
}
