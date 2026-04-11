'use client';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="bg-slate-800/95 backdrop-blur border border-slate-700/80 rounded-2xl p-4 shadow-xl min-w-[180px]">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-700">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name === 'cleaning' ? 'Cleaning' : p.name === 'inventory' ? 'Inventory' : 'Instant POS'}
            </span>
            <span className="font-black text-white">AED {Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between">
        <span className="text-xs font-black text-slate-300">Total</span>
        <span className="text-sm font-black text-emerald-400">AED {total.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default function FinancialGraphCard({ bookings }: { bookings: any[] }) {

  const { chartData, totals } = useMemo(() => {
    const map: Record<string, { dateObj: Date; cleaning: number; inventory: number; pos: number }> = {};
    let tC = 0, tI = 0, tP = 0;

    bookings.forEach(b => {
      const dateObj = parseISO(b.cleaning_date);
      const key = format(dateObj, 'yyyy-MM-dd');
      if (!map[key]) map[key] = { dateObj, cleaning: 0, inventory: 0, pos: 0 };
      const c = Number(b.price) || 0;
      const inv = b.booking_extra_inventory?.reduce((acc: number, ex: any) => acc + Number(ex.total_price), 0) || 0;
      map[key].cleaning += c;
      map[key].inventory += inv;
      tC += c; tI += inv;
    });

    const sorted = Object.values(map)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({ date: format(item.dateObj, 'dd MMM'), cleaning: item.cleaning, inventory: item.inventory, pos: item.pos }));

    return { chartData: sorted, totals: { cleaning: tC, inventory: tI, pos: tP, combined: tC + tI + tP } };
  }, [bookings]);

  const summaries = [
    { label: 'Cleaning', value: totals.cleaning, color: '#6366f1', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Inventory', value: totals.inventory, color: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Instant POS', value: totals.pos, color: '#06b6d4', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 h-full flex flex-col border border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <TrendingUp size={16} className="text-indigo-400" />
            </div>
            <h2 className="text-sm font-black text-white tracking-tight">Financial Performance</h2>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Revenue by category</p>
        </div>
        {/* Combined total */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2 text-right">
          <p className="text-[9px] text-emerald-500 uppercase tracking-widest font-bold">Total Revenue</p>
          <p className="text-xl font-black text-emerald-400">AED {totals.combined.toLocaleString()}</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {summaries.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            className={`flex-1 min-w-[100px] rounded-xl p-3 border ${s.bg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-sm font-black" style={{ color: s.color }}>AED {s.value.toLocaleString()}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[160px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="cleaning" stroke="#6366f1" strokeWidth={2.5} fill="url(#gc)" dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="inventory" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gi)" dot={false} activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="pos" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gp)" dot={false} activeDot={{ r: 5, fill: '#06b6d4', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
            <DollarSign size={36} className="mb-2 opacity-40" />
            <span className="text-xs font-bold">No financial data for this range</span>
          </div>
        )}
      </div>
    </div>
  );
}