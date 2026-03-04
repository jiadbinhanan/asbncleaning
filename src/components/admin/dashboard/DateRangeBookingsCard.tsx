'use client';
import { useMemo } from 'react';
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CalendarRange, Layers } from 'lucide-react';

export default function DateRangeBookingsCard({ bookings }: { bookings: any[] }) {
  
  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length;
    const finalized = bookings.filter(b => b.status === 'finalized').length;
    return { total, completed, finalized };
  }, [bookings]);

  const data = [
    { name: 'Total Bookings', value: stats.total, fill: '#8B5CF6' },     // 🚨 Vibrant Violet
    { name: 'Completed', value: stats.completed, fill: '#38BDF8' },      
    { name: 'Price Finalized', value: stats.finalized, fill: '#10B981' } 
  ];

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
      
      <div className="mb-2">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <CalendarRange className="text-indigo-500" size={20}/> Range Conversion
        </h2>
        <p className="text-xs font-bold text-gray-400 mt-1">Lifecycle of selected dates</p>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" 
            barSize={14} data={data} startAngle={90} endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, Math.max(stats.total, 1)]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={10} />
            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}/>
          </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <Layers className="text-gray-300" size={24}/>
        </div>
      </div>

      {/* Custom Legend */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
        <div className="text-center">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
          <p className="text-lg font-black text-gray-700">{stats.total}</p>
        </div>
        <div className="text-center border-l border-gray-100">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Completed</p>
          <p className="text-lg font-black text-blue-600">{stats.completed}</p>
        </div>
        <div className="text-center border-l border-gray-100">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Finalized</p>
          <p className="text-lg font-black text-emerald-600">{stats.finalized}</p>
        </div>
      </div>

    </div>
  );
}
