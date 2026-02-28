"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-b from-blue-50 to-white"></div>
      <div className="absolute top-20 right-0 w-96 h-96 bg-teal-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-40 left-10 w-72 h-72 bg-blue-300 rounded-full blur-3xl opacity-20"></div>

      <div className="max-w-7xl mx-auto text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-bold tracking-wide uppercase border border-blue-200 shadow-sm">
            B T M Cleaning And Technical Services CO.
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight"
        >
          Sparkling Clean, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
            Every Single Time.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg text-gray-600 font-medium leading-relaxed"
        >
          We provide top-notch cleaning solutions for luxury apartments, holiday homes,
          and offices. Experience the premium standard of hygiene and care.
        </motion.p>

        {/* Premium Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
        >
          <Link href="#booking" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
            Book a Service <ArrowRight size={20} />
          </Link>
          <Link href="#teamlogin" className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
            <PlayCircle size={22} className="text-blue-600" /> Agent Shift Login
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
