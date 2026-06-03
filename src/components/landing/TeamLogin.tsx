"use client";
import { motion } from 'framer-motion';
import { CheckCircle2, PlayCircle, ClipboardCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function TeamLogin() {
  return (
    <section
      id="team-login"
      className="py-24 bg-slate-900 text-white relative overflow-hidden"
    >
      {/* লাক্সারি অ্যাবস্ট্রাক্ট শেইপস (Luxury Abstract Shapes) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10">

        {/* টেক্সট অংশ (Text Content) */}
        <div className="md:w-1/2 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-cyan-300 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
            <ShieldAlert size={16} /> Restricted Area (Staff Only)
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight leading-tight">
            Ready to start your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">Daily Shift?</span>
          </h2>
          <p className="text-slate-300 text-lg font-medium leading-relaxed max-w-lg">
            Welcome to the BTM Internal Operations Portal. Access your schedule, verify units, and maintain our premium standards.
          </p>
          <div className="space-y-4 pt-4">
            <p className="flex items-center gap-3 font-bold text-slate-200">
              <CheckCircle2 className="text-cyan-400 flex-shrink-0" size={22} /> View your daily assigned luxury units
            </p>
            <p className="flex items-center gap-3 font-bold text-slate-200">
              <CheckCircle2 className="text-cyan-400 flex-shrink-0" size={22} /> Access digital checklists & routines
            </p>
            <p className="flex items-center gap-3 font-bold text-slate-200">
              <CheckCircle2 className="text-cyan-400 flex-shrink-0" size={22} /> Upload 'Before-After' photo evidence
            </p>
          </div>
        </div>

        {/* লগইন কার্ড (Login Card) */}
        <motion.div
          whileHover={{ y: -5 }}
          className="md:w-[400px] w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] relative z-10"
        >
          <div className="flex items-center gap-5 mb-10">
            <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl text-white shadow-lg">
              <PlayCircle size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">Agent Portal</h3>
              <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest mt-1">
                Secure Access
              </p>
            </div>
          </div>

          <Link href="/team/login">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-white hover:bg-cyan-50 text-slate-900 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition-colors shadow-xl"
            >
              Login to Dashboard
            </motion.button>
          </Link>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-sm font-medium text-slate-400 mb-4">
              Authorized Quality Control?
            </p>
            <Link href="/team/qc-login">
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                <ClipboardCheck size={20} /> Access QC Portal
              </button>
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}