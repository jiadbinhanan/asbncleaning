"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Medal, Star } from "lucide-react";

// Static bubble data — pre-generated to avoid SSR/client hydration mismatch
const BUBBLES = [
  { size: 72, left: 8,  duration: 14, delay: 0   },
  { size: 45, left: 18, duration: 17, delay: 2   },
  { size: 88, left: 30, duration: 12, delay: 5   },
  { size: 35, left: 42, duration: 16, delay: 1   },
  { size: 60, left: 55, duration: 13, delay: 7   },
  { size: 50, left: 65, duration: 18, delay: 3   },
  { size: 78, left: 75, duration: 11, delay: 9   },
  { size: 40, left: 82, duration: 15, delay: 4   },
  { size: 65, left: 90, duration: 14, delay: 6   },
  { size: 55, left: 12, duration: 16, delay: 8   },
  { size: 42, left: 48, duration: 12, delay: 0.5 },
  { size: 70, left: 60, duration: 17, delay: 3.5 },
];

// রিয়ালিস্টিক বুদবুদ অ্যানিমেশন (Realistic Soap Bubbles)
const RealisticBubbles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {BUBBLES.map((b, i) => (
        <motion.div
          key={i}
          initial={{ y: "110vh", opacity: 0, scale: 0.5 }}
          animate={{
            y: "-20vh",
            opacity: [0, 1, 1, 0],
            scale: [0.8, 1, 1.2, 0.9],
            x: Math.sin(i * 45) * 150,
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            delay: b.delay,
            ease: "linear",
          }}
          className="absolute rounded-full"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            background: "radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.1) 80%, rgba(255, 255, 255, 0.4) 100%)",
            boxShadow: "inset 0 0 15px rgba(255, 255, 255, 0.4), 0 0 10px rgba(255,255,255,0.1)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            backdropFilter: "blur(1.5px)",
          }}
        />
      ))}
    </div>
  );
};

export default function HeroSection() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Smoke Reveal Animation Variants
  const smokeVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(12px)", scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      scale: 1, 
      transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
    }
  };

  const line1 = "Sparkling Clean,".split(" ");
  const line2 = "Every Single Time.".split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 pt-20">

      {/* রেস্পন্সিভ ব্যাকগ্রাউন্ড ইমেজ */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center bg-[url('/landing/hero-mob.jpg')] md:bg-[url('/landing/hero-deks.jpg')]" />
        {/* লাক্সারি ওভারলে গ্রেডিয়েন্ট (Dark & Elegant) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-cyan-950/70" />
      </div>

      {isMounted && <RealisticBubbles />}

      {/* আল্ট্রা-ওয়াইড সাপোর্ট (w-full max-w-[2560px]) */}
      <div className="w-full max-w-[2560px] mx-auto px-6 md:px-12 2xl:px-24 relative z-20 flex flex-col items-center text-center lg:items-start lg:text-left pt-10">

        {/* Top Premium Badge (Removed AI Sparkles, used elegant Medal) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-50 text-sm md:text-base font-bold tracking-wide mb-8 shadow-[0_0_25px_rgba(6,182,212,0.2)]"
        >
          <Medal size={20} className="text-orange-400" />
          Dubai's Premier Luxury Cleaning Service
        </motion.div>

        {/* Smoke Reveal Headline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <h1 className="text-6xl md:text-8xl lg:text-[7rem] 2xl:text-[9rem] font-extrabold text-white leading-[1.05] tracking-tight flex flex-wrap justify-center lg:justify-start gap-x-4">
            {line1.map((word, index) => (
              <motion.span key={`line1-${index}`} variants={smokeVariants} className="inline-block">
                {word}
              </motion.span>
            ))}
          </h1>
          <h1 className="text-6xl md:text-8xl lg:text-[7rem] 2xl:text-[9rem] font-extrabold leading-[1.05] tracking-tight flex flex-wrap justify-center lg:justify-start gap-x-4 mt-2">
            {line2.map((word, index) => (
              <motion.span 
                key={`line2-${index}`} 
                variants={smokeVariants} 
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-200"
              >
                {word}
              </motion.span>
            ))}
          </h1>
        </motion.div>

        {/* সাব টাইটেল */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: "easeOut" }}
          className="text-lg md:text-2xl 2xl:text-3xl text-slate-300 mb-12 max-w-3xl 2xl:max-w-5xl font-medium leading-relaxed"
        >
          Premium, hassle-free cleaning & technical services for luxury Apartments, Holiday Homes, Villas & Offices in <span className="font-bold text-white">Downtown Dubai</span>.
        </motion.p>

        {/* ট্রাস্ট ব্যাজ (Trust Badges) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="flex flex-wrap justify-center lg:justify-start gap-4 mb-14"
        >
          {[
            "Vetted Professional Team",
            "Same Day Service",
            "24/7 Dedicated Support",
            "5-Star Quality Guarantee",
          ].map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.3 + index * 0.1 }}
              className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-white shadow-xl"
            >
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
              <span className="text-sm md:text-base font-bold tracking-wide">{point}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* কল টু অ্যাকশন এবং রেটিং */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-8"
        >
          <motion.a
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(249, 115, 22, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            href="#booking"
            className="group flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg 2xl:text-xl font-extrabold uppercase tracking-widest rounded-full shadow-2xl transition-all w-full sm:w-auto"
          >
            Book Your Cleaning
            <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </motion.a>

          <div className="flex items-center gap-4 text-white bg-white/5 px-6 py-3 rounded-full backdrop-blur-sm border border-white/10">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <span className="text-sm 2xl:text-base font-bold tracking-wide">Trusted by 500+ Properties</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Fade Gradient for blending */}
      <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-slate-50 to-transparent z-20 pointer-events-none" />
    </section>
  );
}