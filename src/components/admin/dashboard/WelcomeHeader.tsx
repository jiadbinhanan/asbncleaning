'use client';
import { motion } from 'framer-motion';
import { Sparkles, Calendar as CalendarIcon, UserCircle } from 'lucide-react';

interface WelcomeHeaderProps {
  adminProfile: any;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}

export default function WelcomeHeader({ adminProfile, dateFrom, setDateFrom, dateTo, setDateTo }: WelcomeHeaderProps) {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = adminProfile?.full_name?.split(' ')[0] || 'Executive';
  const avatarUrl = adminProfile?.avatar_url;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between p-5 md:p-6 gap-6 md:gap-0 border border-white/20"
    >
      {/* --- LIVE MOVING GRADIENT BACKGROUND --- */}
      <motion.div
        className="absolute inset-0 z-0 opacity-90"
        style={{
          background: 'linear-gradient(-45deg, #4f46e5, #9333ea, #2563eb, #c026d3)',
          backgroundSize: '400% 400%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 15, ease: "linear", repeat: Infinity }}
      />
      
      {/* Premium Glass Overlay */}
      <div className="absolute inset-0 z-0 bg-black/10 backdrop-blur-[2px]"></div>

      {/* --- LEFT SECTION: PROFILE & GREETING --- */}
      <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
        
        {/* Decorated Avatar / DP */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-300 via-fuchsia-400 to-cyan-400 rounded-full blur-[8px] opacity-70 animate-pulse"></div>
          <div className="relative h-14 w-14 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-300 via-fuchsia-400 to-cyan-400 shadow-lg">
            <div className="h-full w-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserCircle size={32} className="text-white/80" />
              )}
            </div>
          </div>
        </div>

        {/* Breathing Greeting Message */}
        <motion.div 
          animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-white/90 text-[11px] font-bold tracking-widest uppercase mb-0.5 flex items-center gap-1.5 drop-shadow-sm">
            {greeting} <Sparkles size={12} className="text-amber-300"/>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
            {firstName}
          </h1>
        </motion.div>
      </div>

      {/* --- RIGHT SECTION: DATE FILTER --- */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 backdrop-blur-md p-2 md:p-2.5 rounded-2xl border border-white/20 shadow-inner w-full md:w-auto">
        
        <div className="flex items-center gap-2 pl-2 pr-3 md:border-r border-white/20">
          <div className="p-1.5 bg-white/20 text-white rounded-lg shadow-sm">
            <CalendarIcon size={16}/>
          </div>
          <span className="font-extrabold text-white text-[11px] tracking-widest uppercase">Filter</span>
        </div>
        
        <div className="flex items-center gap-2 px-1 w-full justify-between sm:justify-start">
          <div className="relative group flex-1 sm:flex-none">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)} 
              className="w-full sm:w-auto px-3 py-2 bg-black/20 hover:bg-black/30 text-white rounded-xl outline-none font-bold text-xs cursor-pointer transition-colors border border-white/10" 
              style={{ colorScheme: 'dark' }} // Makes the calendar icon look good on dark bg
            />
          </div>
          <span className="text-white/60 font-black text-[10px] px-1">TO</span>
          <div className="relative group flex-1 sm:flex-none">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)} 
              className="w-full sm:w-auto px-3 py-2 bg-black/20 hover:bg-black/30 text-white rounded-xl outline-none font-bold text-xs cursor-pointer transition-colors border border-white/10"
              style={{ colorScheme: 'dark' }} 
            />
          </div>
        </div>

      </div>
    </motion.div>
  );
}
