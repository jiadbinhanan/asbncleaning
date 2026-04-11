'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, PlayCircle, CheckCircle2, Users, AlertCircle, Target } from 'lucide-react';

export default function TodayBookingsCard({ bookings }: { bookings: any[] }) {

  const stats = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter(b => b.status === 'active' || b.status === 'in_progress').length;
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const assigned = bookings.filter(b => b.assigned_team_id !== null).length;
    const unassigned = total - assigned;
    return {
      total, active, completed, pending, assigned, unassigned,
      activePct: total ? (active / total) * 100 : 0,
      completedPct: total ? (completed / total) * 100 : 0,
      assignedPct: total ? (assigned / total) * 100 : 0,
    };
  }, [bookings]);

  const bars = [
    { label: 'Active', value: stats.active, pct: stats.activePct, color: 'from-blue-500 to-cyan-400', textColor: 'text-blue-400', bg: 'bg-blue-950/40', icon: <PlayCircle size={13} className="text-blue-400" />, glow: 'shadow-blue-500/40' },
    { label: 'Completed', value: stats.completed, pct: stats.completedPct, color: 'from-emerald-500 to-teal-400', textColor: 'text-emerald-400', bg: 'bg-emerald-950/40', icon: <CheckCircle2 size={13} className="text-emerald-400" />, glow: 'shadow-emerald-500/40' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 h-full flex flex-col border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-slate-600/50">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <CalendarDays size={16} className="text-indigo-400" />
            </div>
            <h2 className="text-sm font-black text-white tracking-tight">Today's Target</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Live shift progress</p>
        </div>
        {/* Big number */}
        <div className="text-right">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="text-4xl font-black text-white leading-none"
          >{stats.total}</motion.span>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Bookings</p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="flex-1 space-y-3 mb-5">
        {bars.map((bar, i) => (
          <div key={bar.label} className={`${bar.bg} rounded-2xl p-3.5 border border-slate-700/50`}>
            <div className="flex justify-between items-center mb-2.5">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${bar.textColor}`}>
                {bar.icon} {bar.label}
              </span>
              <span className="text-lg font-black text-white">{bar.value}</span>
            </div>
            <div className="h-2 w-full bg-slate-700/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bar.pct}%` }}
                transition={{ duration: 1.2, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full rounded-full bg-gradient-to-r ${bar.color} shadow-lg ${bar.glow}`}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-slate-600">{Math.round(bar.pct)}% of total</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom: Assignment split */}
      <div className="border-t border-slate-700/50 pt-4">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Team Assignment</p>
        <div className="flex gap-3">
          {/* Assigned */}
          <div className="flex-1 bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3 text-center">
            <Users size={14} className="text-indigo-400 mx-auto mb-1" />
            <p className="text-xl font-black text-white">{stats.assigned}</p>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">Assigned</p>
            <div className="h-1 w-full bg-indigo-900/50 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${stats.assignedPct}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
          </div>
          {/* Unassigned */}
          <div className="flex-1 bg-rose-950/30 border border-rose-800/20 rounded-xl p-3 text-center">
            <AlertCircle size={14} className="text-rose-400 mx-auto mb-1" />
            <p className="text-xl font-black text-white">{stats.unassigned}</p>
            <p className="text-[9px] text-rose-400 font-bold uppercase tracking-wider mt-0.5">No Team</p>
            <div className="h-1 w-full bg-rose-900/30 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${stats.total ? (stats.unassigned / stats.total) * 100 : 0}%` }}
                transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-rose-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}