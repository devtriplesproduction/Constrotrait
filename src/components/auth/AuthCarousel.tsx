"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const slides = [
  {
    id: 0,
    title: "Precision Material Testing",
    description: "Ensure uncompromising quality. Leverage advanced analysis for soil, water, and cement breaks with our intuitive platform.",
    image: "/lab-testing.jpg",
    badges: [
      { top: "6", right: "6", color: "bg-blue-500/80", icon: "water", title: "Water Analysis", sub: "99.9% Purity", delay: 0 },
      { bottom: "8", left: "6", color: "bg-green-500/80", icon: "soil", title: "Soil Strength", sub: "Optimal Grade", delay: 1 }
    ]
  },
  {
    id: 1,
    title: "Enterprise Project Planning",
    description: "Streamline your construction projects with advanced Gantt charts, resource allocation, and real-time timeline tracking.",
    image: "/planning-illustration.jpg",
    badges: [
      { top: "8", left: "6", color: "bg-purple-500/80", icon: "chart", title: "Timeline Sync", sub: "On Schedule", delay: 0 },
      { bottom: "6", right: "6", color: "bg-orange-500/80", icon: "hat", title: "Resource Alloc.", sub: "100% Efficiency", delay: 1 }
    ]
  },
  {
    id: 2,
    title: "Seamless Team Collaboration",
    description: "Empower your workforce with integrated HR tools, interactive 3D models, and instant communication channels.",
    image: "/collaboration-illustration.jpg",
    badges: [
      { top: "10", right: "8", color: "bg-pink-500/80", icon: "team", title: "Team Sync", sub: "12 Online", delay: 0 },
      { bottom: "10", left: "8", color: "bg-indigo-500/80", icon: "model", title: "BIM Integration", sub: "Model Updated", delay: 1 }
    ]
  }
];

const icons = {
  water: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  soil: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  chart: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  hat: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  team: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  model: <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2-1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
};

export function AuthCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-center w-full">
      
      {/* Animated Testing Illustration (The Slider Images) */}
      <div className="relative w-full max-h-[400px] min-h-[300px] flex-1 flex items-center justify-center mt-4">
        
        {/* Background ambient glow */}
        <motion.div
          className="absolute inset-0 bg-white/10 rounded-full blur-[100px]"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative w-full max-w-[400px] aspect-square group perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20, rotateX: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, rotateX: -10, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 transform-gpu"
            >
              {/* Image with Ken Burns effect */}
              <motion.div
                className="absolute inset-0 w-full h-full"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Image
                  src={slides[current].image!}
                  alt={slides[current].title}
                  fill
                  className="object-cover"
                  priority
                />
              </motion.div>

              {/* Sci-fi Scanning Line Effect */}
              <motion.div 
                className="absolute inset-x-0 h-1 bg-white/40 blur-[2px] shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10"
                animate={{ top: ["-10%", "110%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Floating Glassmorphism Badges for the current slide */}
              {slides[current].badges.map((badge, idx) => (
                <motion.div 
                  key={`${current}-badge-${idx}`}
                  className="absolute bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl p-3 flex items-center gap-3 shadow-lg z-20"
                  style={{
                    top: badge.top ? `${badge.top}rem` : "auto",
                    bottom: badge.bottom ? `${badge.bottom}rem` : "auto",
                    left: badge.left ? `${badge.left}rem` : "auto",
                    right: badge.right ? `${badge.right}rem` : "auto",
                  }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: [0, idx % 2 === 0 ? -10 : 10, 0] }}
                  transition={{ 
                    opacity: { duration: 0.4, delay: badge.delay * 0.2 + 0.4 },
                    scale: { duration: 0.4, delay: badge.delay * 0.2 + 0.4 },
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: badge.delay } 
                  }}
                >
                  <div className={`w-8 h-8 rounded-full ${badge.color} flex items-center justify-center`}>
                    {icons[badge.icon as keyof typeof icons]}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold leading-tight drop-shadow-md">{badge.title}</p>
                    <p className="text-white/80 text-[10px] font-medium drop-shadow-sm">{badge.sub}</p>
                  </div>
                </motion.div>
              ))}

              {/* Overlay subtle gradient to blend the edges */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-10" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Text and Pagination */}
      <div className="relative z-10 mt-4 xl:mt-8 min-h-[100px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl xl:text-3xl font-extrabold text-white mb-2 leading-tight drop-shadow-sm">
              {slides[current].title}
            </h2>
            <p className="text-orange-100/90 text-xs xl:text-sm max-w-[95%] xl:max-w-[85%] leading-relaxed font-medium">
              {slides[current].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-4 xl:mt-6">
          {slides.map((_, idx) => (
            <motion.div 
              key={idx}
              className={`h-1.5 rounded-full cursor-pointer transition-colors ${current === idx ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-white/30 hover:bg-white/50"}`}
              animate={{ width: current === idx ? 30 : 8 }}
              transition={{ duration: 0.3 }}
              onClick={() => setCurrent(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
