'use client';
import { useMemo } from 'react';
import { CalendarRange, TrendingUp, CheckCircle, Clock, Banknote } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

export default function DateRangeBookingsCard({ bookings }: { bookings: any[] }) {

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length;
    const finalized = bookings.filter(b => b.status === 'finalized').length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, finalized, completionRate };
  }, [bookings]);

  const chartData = [
    { name: 'Finalized', value: stats.finalized, fill: '#10b981' },
    { name: 'Completed', value: stats.completed, fill: '#38bdf8' },
    { name: 'Total', value: stats.total, fill: '#6366f1' },
  ];

  const pills = [
    { label: 'Total', value: stats.total, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { label: 'Pending', value: stats.pending, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { label: 'Done', value: stats.completed, color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    { label: 'Finalized', value: stats.finalized, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 h-full flex flex-col border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <CalendarRange size={16} className="text-indigo-400" />
            </div>
            <h2 className="text-sm font-black text-white tracking-tight">Range Analytics</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Selected date lifecycle</p>
        </div>
        {/* Completion Rate Badge */}
        <div className="bg-indigo-500/15 border border-indigo-500/30 rounded-xl px-3 py-1.5 text-center">
          <p className="text-xl font-black text-indigo-300 leading-none">{stats.completionRate}%</p>
          <p className="text-[9px] text-indigo-500 uppercase tracking-widest mt-0.5">Done Rate</p>
        </div>
      </div>

      {/* Radial Chart */}
      <div className="relative flex-1 min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="95%" barSize={12} data={chartData} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, Math.max(stats.total, 1)]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: 'rgba(255,255,255,0.03)' }} dataKey="value" cornerRadius={8} />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <TrendingUp size={18} className="text-slate-600 mb-0.5" />
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Range</span>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-700/50">
        {pills.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl p-2 border text-center ${p.color}`}
          >
            <p className="text-base font-black leading-none">{p.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">{p.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}