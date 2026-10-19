'use client';
import { motion } from 'framer-motion';
import { Calendar, UserCircle, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';

interface WelcomeHeaderProps {
  adminProfile: any;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
}

export default function WelcomeHeader({ adminProfile, dateFrom, setDateFrom, dateTo, setDateTo }: WelcomeHeaderProps) {
  const { isDark } = useTheme();
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
      className="relative w-full overflow-hidden rounded-3xl border border-transparent dark:border-purple-500/20 dark:shadow-[0_12px_40px_rgba(139,92,246,0.15)]"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #05060f 0%, #0e0926 22%, #190e3a 45%, #0d1e3d 70%, #050818 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)'
      }}
    >
      {/* Animated mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20 dark:opacity-30"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-20 right-1/3 w-96 h-96 rounded-full opacity-15 dark:opacity-25"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 dark:opacity-25"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* SVG Multi-color Aurora Waves */}
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 240" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="dash-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.28" />
                <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.20" />
                <stop offset="75%" stopColor="#06B6D4" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="dash-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="dash-wave-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.06" />
              </linearGradient>
              <linearGradient id="dash-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F472B6" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#818CF8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.6" />
              </linearGradient>
              <filter id="dash-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M0,130 C260,60 480,180 720,110 C960,40 1100,160 1200,90 L1200,240 L0,240 Z" fill="url(#dash-wave-1)" />
            <path d="M0,130 C260,60 480,180 720,110 C960,40 1100,160 1200,90" stroke="url(#dash-crest-1)" strokeWidth="2.2" strokeLinecap="round" filter="url(#dash-glow-cyan)" />
            <path d="M0,170 C220,210 420,100 680,160 C940,220 1080,120 1200,150 L1200,240 L0,240 Z" fill="url(#dash-wave-2)" />
            <path d="M0,170 C220,210 420,100 680,160 C940,220 1080,120 1200,150" stroke="url(#dash-crest-2)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
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
            <div className="mb-1.5">
              <span className="text-xs font-bold text-indigo-300 dark:text-cyan-300 uppercase tracking-[0.2em]">{greeting}</span>
            </div>
            <h1 className="text-3xl font-black text-white leading-none tracking-tight">{firstName}</h1>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 dark:bg-slate-900/60 border border-white/15 dark:border-slate-700/60 backdrop-blur-md shadow-sm">
                <Calendar size={12} className="text-indigo-400 dark:text-cyan-300 shrink-0" />
                <span className="text-xs font-bold text-slate-100 dark:text-slate-200 tracking-wide">{todayFormatted}</span>
              </div>
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