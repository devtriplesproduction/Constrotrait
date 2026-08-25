"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
export default function LoginPage() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="h-screen w-full flex bg-white p-3 sm:p-4 overflow-hidden">
      {/* Left Side - Visual/Branding (Blue Card) */}
      <motion.div 
        initial={{ opacity: 0, x: -50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-1/2 bg-[#C2410C] rounded-[2.5rem] p-12 flex-col relative overflow-hidden shadow-2xl shadow-orange-900/20"
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden">
          <Image
            src="/bg-waves.png"
            alt="Abstract blue waves background"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/40 via-orange-900/40 to-orange-900/80 mix-blend-multiply" />
          
          {/* Floating glowing orbs */}
          <motion.div 
            animate={{ 
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3] 
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-96 h-96 bg-orange-400 rounded-full mix-blend-screen filter blur-[100px] opacity-30"
          />
          <motion.div 
            animate={{ 
              y: [0, 40, 0],
              opacity: [0.2, 0.5, 0.2] 
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-400 rounded-full mix-blend-screen filter blur-[100px] opacity-20"
          />
        </div>

        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 flex items-center gap-3 mb-12"
        >
          <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center transform -rotate-6">
            <div className="w-5 h-5 bg-gradient-to-tr from-orange-600 to-pink-600 rounded-lg transform rotate-6" />
          </div>
          <span className="text-white font-bold text-2xl tracking-wide drop-shadow-md">ConstroTrait</span>
        </motion.div>

        {/* Mockup Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-1 flex flex-col justify-center space-y-5 max-w-[480px] mx-auto w-full"
        >
          {[
            { color: "bg-orange-100", icon: "bg-orange-500", title: "Enterprise Planning Discussions", time: "30 mins, One-on-One" },
            { color: "bg-purple-100", icon: "bg-purple-500", title: "Interactive Prototyping Review", time: "45 mins, Team Sync" },
            { color: "bg-green-100", icon: "bg-green-500", title: "Analyzing User Interactions", time: "1 hour, Workshop" }
          ].map((card, idx) => (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] border border-white/20 cursor-pointer"
            >
              <div className="flex gap-4 items-start mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}>
                  <div className={`w-4 h-4 ${card.icon} rounded-md`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-900 font-bold text-[15px] leading-tight">{card.title}</h3>
                    <Button className="text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 p-1.5 rounded-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                    </Button>
                  </div>
                  <p className="text-slate-500 text-sm mt-1 font-medium">{card.time}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Button className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all">
                  View details
                </Button>
                <Button className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-100 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                  Copy
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Text and Pagination */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="relative z-10 mt-12"
        >
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight drop-shadow-sm">
            Effortless Schedule <br/> Management
          </h2>
          <p className="text-orange-100/80 text-[15px] max-w-[85%] leading-relaxed font-medium">
            Experience the future of team coordination. Navigate through your schedule effortlessly with our beautiful, intuitive interface.
          </p>
          <div className="flex gap-2.5 mt-8">
            <div className="w-10 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            <div className="w-2.5 h-1.5 bg-white/30 rounded-full hover:bg-white/50 transition-colors cursor-pointer"></div>
            <div className="w-2.5 h-1.5 bg-white/30 rounded-full hover:bg-white/50 transition-colors cursor-pointer"></div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-24 flex flex-col justify-center bg-[#F8FAFC] relative overflow-hidden rounded-[2.5rem] lg:rounded-none lg:bg-white">
        {/* Background Decorative Elements */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, 20, 0], y: [0, 30, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-orange-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-40 right-20 w-80 h-80 bg-purple-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-32 -left-20 w-80 h-80 bg-pink-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70"
        />
        
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 z-0"></div>
        
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="max-w-[420px] w-full mx-auto space-y-10 relative z-10"
        >
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Welcome Back
            </h1>
            <p className="text-slate-500 text-[15px] font-medium px-4">
              Ready, Set, Connect: Login to your account instantly!
            </p>
          </div>

          <div className="w-full">
            <LoginForm />
          </div>
          
          <p className="text-center text-[15px] text-slate-500 font-medium">
            Don&apos;t have an account?{" "}
            <Link href="#" className="text-orange-600 font-bold hover:text-orange-700 hover:underline underline-offset-4 transition-all">
              Sign up today
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
