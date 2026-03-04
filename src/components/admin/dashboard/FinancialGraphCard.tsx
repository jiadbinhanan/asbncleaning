'use client';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, CircleDollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Custom Tooltip Component for better visual breakdown
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100">
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-6 items-center text-xs">
              <span className="font-bold flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                {p.name === 'cleaning' ? 'Cleaning Service' : 'Extra Inventory'}
              </span>
              <span className="font-black text-gray-900">AED {p.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between gap-6 items-center">
          <span className="text-xs font-black text-gray-800">Total</span>
          <span className="text-sm font-black text-blue-600">
            AED {payload.reduce((sum: number, p: any) => sum + p.value, 0)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function FinancialGraphCard({ bookings }: { bookings: any[] }) {
  
  const { chartData, totals } = useMemo(() => {
    const map: Record<string, { dateObj: Date, cleaning: number, inventory: number }> = {};
    let tCleaning = 0;
    let tInventory = 0;
    
    bookings.forEach(b => {
      const dateObj = parseISO(b.cleaning_date);
      const dateStr = format(dateObj, 'yyyy-MM-dd'); // 🚨 Use proper date string for accurate grouping
      
      if (!map[dateStr]) map[dateStr] = { dateObj, cleaning: 0, inventory: 0 };
      
      const cleanPrice = Number(b.price) || 0;
      const invPrice = b.booking_extra_inventory?.reduce((acc:any, ex:any) => acc + Number(ex.total_price), 0) || 0;
      
      map[dateStr].cleaning += cleanPrice;
      map[dateStr].inventory += invPrice;

      tCleaning += cleanPrice;
      tInventory += invPrice;
    });

    // 🚨 FIXED: Sort by actual date timestamp to fix chronological order, then format for UI
    const sortedChartData = Object.values(map)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({
         date: format(item.dateObj, 'dd MMM'),
         cleaning: item.cleaning,
         inventory: item.inventory
      }));

    return { 
      chartData: sortedChartData, 
      totals: { cleaning: tCleaning, inventory: tInventory, combined: tCleaning + tInventory } 
    };
  }, [bookings]);

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 h-full flex flex-col hover:shadow-md transition-shadow">
      
      {/* Header and Legend */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-blue-500" size={20}/> Financial Activity
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Cleaning revenue vs Extra inventory sales</p>
        </div>
        
        {/* Mini Legend */}
        <div className="flex gap-4 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Cleaning
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div> Inventory
          </div>
        </div>
      </div>

      {/* 🚨 NEW: 3 Summarized Prices Row (Compact Design) */}
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Cleaning</p>
          <p className="text-sm font-black text-blue-600">AED {totals.cleaning.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Inventory</p>
          <p className="text-sm font-black text-amber-500">AED {totals.inventory.toLocaleString()}</p>
        </div>
        <div className="pl-6 border-l border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Combined Price</p>
          <p className="text-base font-black text-emerald-600">AED {totals.combined.toLocaleString()}</p>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="flex-1 w-full min-h-[180px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCleaning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInventory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} dy={10}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} dx={-10}/>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <Area type="monotone" dataKey="cleaning" stackId="2" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorCleaning)" />
              <Area type="monotone" dataKey="inventory" stackId="1" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorInventory)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <CircleDollarSign size={40} className="mb-2 opacity-50"/>
            <span className="font-bold text-sm">No financial data for this range</span>
          </div>
        )}
      </div>

    </div>
  );
}
