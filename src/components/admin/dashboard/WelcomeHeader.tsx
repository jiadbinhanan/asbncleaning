'use client';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, UserCircle, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface WelcomeHeaderProps {
  adminProfile: any;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
}

export default function WelcomeHeader({ adminProfile, dateFrom, setDateFrom, dateTo, setDateTo }: WelcomeHeaderProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = adminProfile?.full_name?.split(' ')[0] || 'Admin';
  const avatarUrl = adminProfile?.avatar_url;
  const todayFormatted = format(new Date(), 'EEEE, dd MMMM yyyy');

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden rounded-3xl"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)' }}
    >
      {/* Animated mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-20 right-1/3 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 md:p-8">

        {/* LEFT: Avatar + Greeting */}
        <div className="flex items-center gap-5">
          {/* Avatar ring */}
          <div className="relative shrink-0">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[-3px] rounded-full"
              style={{ background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)', borderRadius: '50%' }}
            />
            <div className="relative w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center z-10">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <UserCircle size={36} className="text-slate-400" />}
            </div>
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 z-20 shadow-lg shadow-emerald-500/50" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-amber-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">{greeting}</span>
            </div>
            <h1 className="text-3xl font-black text-white leading-none tracking-tight">{firstName}</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={11} className="text-slate-500" />
              <span className="text-xs text-slate-500">{todayFormatted}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-widest whitespace-nowrap">
            <Calendar size={14} className="text-indigo-400" />
            <span>Date Range</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-sm w-full sm:w-auto">
            <input
              type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/10 outline-none cursor-pointer transition-colors focus:ring-1 focus:ring-indigo-500"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-slate-600 font-black text-xs">→</span>
            <input
              type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/10 outline-none cursor-pointer transition-colors focus:ring-1 focus:ring-indigo-500"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}