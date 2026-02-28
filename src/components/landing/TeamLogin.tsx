"use client";
import { motion } from "framer-motion";
import { CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function TeamLogin() {
  return (
    <section id="teamlogin" className="py-20 bg-[#0A192F] text-white relative overflow-hidden">
      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500 rounded-full blur-[100px] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-10">
        
        <div className="md:w-1/2 space-y-6 relative z-10">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-500/30">
            Internal Operations
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Ready to start your shift?</h2>
          <p className="text-blue-100/70 text-lg font-medium leading-relaxed">
            Welcome to the B T M Cleaning Team Portal. Check your assigned schedule, verify unit access codes, complete checklists, and start your shift securely.
          </p>
          <div className="space-y-3 pt-2">
             <p className="flex items-center gap-2 font-bold text-sm"><CheckCircle2 className="text-teal-400" size={18}/> View daily assigned units</p>
             <p className="flex items-center gap-2 font-bold text-sm"><CheckCircle2 className="text-teal-400" size={18}/> Access digital checklists</p>
             <p className="flex items-center gap-2 font-bold text-sm"><CheckCircle2 className="text-teal-400" size={18}/> Upload photo evidence directly</p>
          </div>
        </div>

        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:w-1/3 w-full bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10"
        >
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                    <PlayCircle size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-black tracking-wide">Agent Portal</h3>
                    <p className="text-blue-200/60 text-sm font-bold uppercase tracking-widest mt-0.5">Secure Access</p>
                </div>
            </div>

            <Link href="/team/login">
                <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 active:scale-95 transition-all">
                    <PlayCircle size={20} /> Login & Start Shift
                </button>
            </Link>
        </motion.div>
      </div>
    </section>
  );
}
