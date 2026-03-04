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

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full rounded-[2.5rem] shadow-lg overflow-hidden min-h-[220px] flex flex-col md:flex-row items-center border border-white/60"
    >
      {/* --- LIVE MOVING GRADIENT BACKGROUND --- */}
      {/* We use a custom inline style for background animation to keep it tailwind compatible */}
      <div 
        className="absolute inset-0 z-0 opacity-80"
        style={{
          background: 'linear-gradient(120deg, #F0FDF4, #D1FAE5, #ECFDF5, #F0FDF4)',
          backgroundSize: '300% 300%',
          animation: 'gradientMove 10s ease infinite',
        }}
      >
        <style jsx>{`
          @keyframes gradientMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </div>

      {/* --- RIGHT SIDE BLENDED DP --- */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[45%] pointer-events-none select-none z-10">
        {/* The Masking Blend: Fades from transparent (left) to the image (right) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F0FDF4] via-[#F0FDF4]/60 to-transparent z-20" />
        
        {adminProfile?.avatar_url ? (
          <img 
            src={adminProfile.avatar_url} 
            alt="Admin" 
            className="w-full h-full object-cover object-top opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-end pr-10 opacity-30">
            <UserCircle size={180} strokeWidth={0.5} className="text-emerald-700" />
          </div>
        )}
      </div>

      {/* --- LEFT SIDE CONTENT (Z-30 for interactions) --- */}
      <div className="relative z-30 p-8 md:p-12 w-full md:w-2/3 h-full flex flex-col justify-center">
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 backdrop-blur-md text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm w-fit mb-4">
          <Sparkles size={14} className="text-emerald-500"/> Premium Workspace
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.1]">
          {greeting}, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 drop-shadow-sm">
            {firstName}
          </span>
        </h1>
        
        <p className="text-sm md:text-base font-bold text-gray-600 mt-4 max-w-md leading-relaxed">
          Monitor your daily operations, track financial growth, and analyze team performance all in one place.
        </p>

        {/* --- INLINE DATE FILTER --- */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-2.5 rounded-2xl border border-white/50 shadow-sm w-fit">
          <div className="flex items-center gap-2 pl-2 pr-4 border-r border-gray-200/50">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><CalendarIcon size={16}/></div>
            <span className="font-black text-gray-800 text-sm">Overview Range</span>
          </div>
          
          <div className="flex items-center gap-2 px-2">
            <div className="relative group">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 bg-transparent hover:bg-white/50 rounded-xl outline-none font-black text-xs text-gray-700 cursor-pointer transition-colors" />
            </div>
            <span className="text-gray-400 font-bold text-xs px-2">TO</span>
            <div className="relative group">
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 bg-transparent hover:bg-white/50 rounded-xl outline-none font-black text-xs text-gray-700 cursor-pointer transition-colors" />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
