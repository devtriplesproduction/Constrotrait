"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { AuthCarousel } from "@/components/auth/AuthCarousel";

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
        className="hidden lg:flex w-1/2 bg-[#C2410C] rounded-[2.5rem] p-8 xl:p-12 flex-col relative overflow-hidden shadow-2xl shadow-orange-900/20"
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden bg-gradient-to-br from-orange-500 to-orange-800">

          {/* Floating glowing orbs */}
          <motion.div
            animate={{
              y: [0, -30, 0],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-[80px] opacity-20"
          />
          <motion.div
            animate={{
              y: [0, 40, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] bg-orange-300 rounded-full mix-blend-overlay filter blur-[100px] opacity-30"
          />
        </div>



        <AuthCarousel />

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
          <div className="text-center flex flex-col items-center">
            <Image 
              src="/Constrotriat%20Logo%20PNG%201.png" 
              alt="ConstroTrait Logo" 
              width={500} 
              height={200} 
              className="w-80 h-auto object-contain mb-4"
              priority
            />
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Welcome Back
            </h1>
            <p className="text-slate-500 text-[15px] font-medium px-4 mt-2">
              Ready, Set, Connect: Login to your account instantly!
            </p>
          </div>

          <div className="w-full">
            <LoginForm />
          </div>


        </motion.div>
      </div>
    </div>
  );
}
