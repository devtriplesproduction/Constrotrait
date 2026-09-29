"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const services = [
  { title: "Air Quality", desc: "Ambient, Indoor & Stack Emission", icon: "💨", color: "from-cyan-400 to-blue-500", orbit: "inner" },
  { title: "Water Testing", desc: "Drinking, Ground & Wastewater", icon: "💧", color: "from-blue-400 to-indigo-500", orbit: "outer" },
  { title: "Soil & Solid Waste", desc: "Contaminant Profiling & Leachate", icon: "🌱", color: "from-emerald-400 to-green-500", orbit: "inner" },
  { title: "EIA & Clearance", desc: "EIA Studies & Govt Liaisoning", icon: "🌍", color: "from-teal-400 to-emerald-500", orbit: "outer" },
  { title: "Consultancy", desc: "CTE/CTO & Sustainability Planning", icon: "📝", color: "from-amber-400 to-orange-500", orbit: "inner" },
  { title: "Noise Monitoring", desc: "Industrial & Ambient Levels", icon: "🔊", color: "from-purple-400 to-pink-500", orbit: "outer" },
  { title: "Waste Management", desc: "Auditing & Minimization", icon: "♻️", color: "from-green-400 to-teal-500", orbit: "inner" },
  { title: "Weather Detection", desc: "Real-time Monitoring Stations", icon: "⛅", color: "from-sky-400 to-blue-500", orbit: "outer" },
  { title: "ETP, STP, WTP", desc: "Quality Monitoring & Testing", icon: "🏭", color: "from-indigo-400 to-purple-500", orbit: "inner" },
  { title: "Ventilation", desc: "Air Flow & Circulation Studies", icon: "🌬️", color: "from-gray-300 to-slate-500", orbit: "outer" },
  { title: "Carbon Footprint", desc: "Emission Inventory & Reporting", icon: "👣", color: "from-rose-400 to-red-500", orbit: "outer" },
  { title: "Safety Training", desc: "Audits & Emergency Response", icon: "⛑️", color: "from-red-400 to-orange-500", orbit: "outer" },
];

export function AuthCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Keep it rotating infinitely without pausing on hover to ensure smooth loops
    const interval = setInterval(() => {
      if (!isHovering) {
        setActiveIndex((prev) => (prev + 1) % services.length);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [isHovering]);

  const innerRadius = 130;
  const outerRadius = 210;
  
  const innerServices = services.filter(s => s.orbit === "inner");
  const outerServices = services.filter(s => s.orbit === "outer");

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center h-full w-full overflow-visible mt-12">
      
      {/* Orbit Container */}
      <div 
        className="relative flex items-center justify-center w-[460px] h-[460px] scale-[0.85] xl:scale-100 transition-transform"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Animated Orbit Rings */}
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute w-[260px] h-[260px] rounded-full border border-white/20 border-dashed"
        />
        <motion.div 
          animate={{ rotate: -360 }} 
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute w-[420px] h-[420px] rounded-full border border-white/10"
        />

        {/* Center Display Node */}
        <div className="absolute w-[180px] h-[180px] rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.2)] z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
              transition={{ duration: 0.4 }}
              className="text-center p-3 flex flex-col items-center w-full"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${services[activeIndex].color} flex items-center justify-center text-2xl mb-2 shadow-lg`}>
                {services[activeIndex].icon}
              </div>
              <h3 className="text-white font-bold text-lg leading-tight mb-1 text-center px-1">
                {services[activeIndex].title}
              </h3>
              <p className="text-white/80 text-[10px] font-medium leading-tight px-3 text-center">
                {services[activeIndex].desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Inner Orbiting Satellites */}
        {innerServices.map((service, idx) => {
          const globalIndex = services.indexOf(service);
          const angle = (idx / innerServices.length) * 360;
          const isActive = globalIndex === activeIndex;
          
          return (
            <motion.div
              key={`inner-${globalIndex}`}
              className="absolute z-30"
              initial={{ rotate: angle }}
              animate={{ rotate: angle + 360 }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              style={{ width: '100%', height: '100%', transformOrigin: 'center' }}
            >
              <div className="absolute top-0 left-1/2 -ml-7" style={{ transform: `translateY(-${innerRadius - 28}px)` }}>
                <motion.button
                  onClick={() => setActiveIndex(globalIndex)}
                  animate={{ 
                    rotate: -(angle + 360),
                    scale: isActive ? 1.2 : 1,
                    opacity: isActive ? 1 : 0.8
                  }}
                  transition={{ 
                    rotate: { duration: 45, repeat: Infinity, ease: "linear" },
                    scale: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  whileHover={{ scale: 1.3, opacity: 1 }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl cursor-pointer transition-all duration-300 ${isActive ? `bg-gradient-to-br ${service.color} shadow-[0_0_20px_rgba(255,255,255,0.7)] border-2 border-white` : 'bg-white/15 backdrop-blur-xl border border-white/30 hover:bg-white/40'}`}
                >
                  <span className="drop-shadow-md">{service.icon}</span>
                </motion.button>
              </div>
            </motion.div>
          );
        })}

        {/* Outer Orbiting Satellites */}
        {outerServices.map((service, idx) => {
          const globalIndex = services.indexOf(service);
          const angle = (idx / outerServices.length) * 360;
          const isActive = globalIndex === activeIndex;
          
          return (
            <motion.div
              key={`outer-${globalIndex}`}
              className="absolute z-30"
              initial={{ rotate: angle }}
              animate={{ rotate: angle - 360 }} // Reverse direction for outer ring
              transition={{ duration: 65, repeat: Infinity, ease: "linear" }}
              style={{ width: '100%', height: '100%', transformOrigin: 'center' }}
            >
              <div className="absolute top-0 left-1/2 -ml-8" style={{ transform: `translateY(-${outerRadius - 32}px)` }}>
                <motion.button
                  onClick={() => setActiveIndex(globalIndex)}
                  animate={{ 
                    rotate: -(angle - 360),
                    scale: isActive ? 1.2 : 1,
                    opacity: isActive ? 1 : 0.8
                  }}
                  transition={{ 
                    rotate: { duration: 65, repeat: Infinity, ease: "linear" },
                    scale: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  whileHover={{ scale: 1.3, opacity: 1 }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl cursor-pointer transition-all duration-300 ${isActive ? `bg-gradient-to-br ${service.color} shadow-[0_0_25px_rgba(255,255,255,0.7)] border-2 border-white` : 'bg-white/15 backdrop-blur-xl border border-white/30 hover:bg-white/40'}`}
                >
                  <span className="drop-shadow-md">{service.icon}</span>
                </motion.button>
              </div>
            </motion.div>
          );
        })}

      </div>
    </div>
  );
}
