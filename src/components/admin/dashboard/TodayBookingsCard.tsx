'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, PlayCircle, CheckCircle2, Users, AlertCircle } from 'lucide-react';

export default function TodayBookingsCard({ bookings }: { bookings: any[] }) {
  
  const stats = useMemo(() => {
    const total = bookings.length;
    // Assuming 'active' or 'in-progress' means supervisors started it
    const active = bookings.filter(b => b.status === 'active' || b.status === 'in_progress').length;
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length;
    
    // 🚨 NEW: Assignment Data
    const assigned = bookings.filter(b => b.assigned_team_id !== null).length;
    const unassigned = total - assigned;

    return { 
      total, 
      active, 
      completed,
      assigned,
      unassigned,
      activePct: total ? (active / total) * 100 : 0,
      completedPct: total ? (completed / total) * 100 : 0,
      assignedPct: total ? (assigned / total) * 100 : 0,
      unassignedPct: total ? (unassigned / total) * 100 : 0,
    };
  }, [bookings]);

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <CalendarDays className="text-blue-500" size={20}/> Today's Target
        </h2>
        <p className="text-xs font-bold text-gray-400 mt-1">Live progress of today's cleaning shifts</p>
      </div>

      {/* 🚨 Split Layout: Horizontal Left, Vertical Right */}
      <div className="flex-1 flex gap-4 md:gap-6 items-center">
        
        {/* --- LEFT SIDE: Horizontal Bars --- */}
        <div className="flex-1 space-y-4 md:space-y-5 flex flex-col justify-center">
          
          {/* Total Bookings */}
          <div>
            <div className="flex justify-between items-end mb-1.5 md:mb-2">
              <span className="text-[11px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Total Bookings</span>
              <span className="text-lg md:text-xl font-black text-gray-900 leading-none">{stats.total}</span>
            </div>
            <div className="h-2.5 md:h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full shadow-sm" />
            </div>
          </div>
          
          {/* Active Bookings */}
          <div>
            <div className="flex justify-between items-end mb-1.5 md:mb-2">
              <span className="text-[11px] md:text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><PlayCircle size={14}/> Active Now</span>
              <span className="text-base md:text-lg font-black text-blue-700 leading-none">{stats.active}</span>
            </div>
            <div className="h-2.5 md:h-3 w-full bg-blue-50 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${stats.activePct}%` }} transition={{ duration: 1, delay: 0.2 }} 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] relative" 
              >
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/50 rounded-full animate-ping"></div>
              </motion.div>
            </div>
          </div>

          {/* Completed Bookings */}
          <div>
            <div className="flex justify-between items-end mb-1.5 md:mb-2">
              <span className="text-[11px] md:text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={14}/> Completed</span>
              <span className="text-base md:text-lg font-black text-emerald-700 leading-none">{stats.completed}</span>
            </div>
            <div className="h-2.5 md:h-3 w-full bg-emerald-50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${stats.completedPct}%` }} transition={{ duration: 1, delay: 0.4 }} 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" 
              />
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDE: Vertical Bars (Assigned & Not Assigned) --- */}
        <div className="w-[90px] md:w-[104px] shrink-0 h-[140px] md:h-[160px] bg-slate-50 border border-slate-100 rounded-2xl p-2 md:p-3 flex justify-between items-end shadow-inner relative">
            <span className="absolute top-2.5 left-0 right-0 text-center text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Team Set</span>
            
            {/* Assigned Bar */}
            <div className="flex flex-col items-center justify-end h-full w-full z-10 pb-1">
               <span className="text-xs font-black text-indigo-700 mb-1.5 leading-none">{stats.assigned}</span>
               <div className="w-2.5 md:w-3 h-[60px] md:h-[75px] bg-indigo-100 rounded-full overflow-hidden mb-2 relative">
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${stats.assignedPct}%` }} transition={{ duration: 1, delay: 0.1 }} 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full" 
                  />
               </div>
               <Users size={14} className="text-indigo-400" />
            </div>

            {/* Unassigned Bar */}
            <div className="flex flex-col items-center justify-end h-full w-full z-10 pb-1">
               <span className="text-xs font-black text-rose-600 mb-1.5 leading-none">{stats.unassigned}</span>
               <div className="w-2.5 md:w-3 h-[60px] md:h-[75px] bg-rose-100 rounded-full overflow-hidden mb-2 relative">
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: `${stats.unassignedPct}%` }} transition={{ duration: 1, delay: 0.3 }} 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-full" 
                  />
               </div>
               <AlertCircle size={14} className="text-rose-400" />
            </div>
        </div>

      </div>
    </div>
  );
}
