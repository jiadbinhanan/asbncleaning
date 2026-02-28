"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, DollarSign, AlertCircle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";

export default function OverviewCards({ 
  bookings, revenue, pendingBillingAmount 
}: { 
  bookings: any[], revenue: number, pendingBillingAmount: number 
}) {
  
  // Generate Data for Sparkline Graph (Daily Revenue)
  const sparklineData = useMemo(() => {
    const grouped = bookings.reduce((acc, b) => {
      if (b.status === 'finalized' && b.price) {
        const date = format(parseISO(b.cleaning_date), 'MMM dd');
        acc[date] = (acc[date] || 0) + b.price;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([name, pv]) => ({ name, pv }));
  }, [bookings]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Card 1: Total Bookings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bookings</p>
            <h3 className="text-3xl font-black text-gray-900">{bookings.length}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><BookOpen size={24}/></div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-4 text-sm font-bold text-gray-500 relative z-10">
           <p><span className="text-green-500">{bookings.filter(b => ['completed', 'finalized'].includes(b.status)).length}</span> Done</p>
           <p><span className="text-blue-500">{bookings.filter(b => ['active', 'pending'].includes(b.status)).length}</span> Pending</p>
        </div>
      </motion.div>

      {/* Card 2: Revenue Processed (With Graph) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-900/20 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Revenue Processed</p>
            <h3 className="text-3xl font-black">AED {revenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><DollarSign size={24} className="text-white"/></div>
        </div>
        
        {/* Sparkline Chart */}
        <div className="h-16 mt-4 relative z-10 -mx-2">
          {sparklineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}/>
                <Line type="monotone" dataKey="pv" stroke="#93c5fd" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-medium text-blue-200">Not enough data to map</div>
          )}
        </div>
      </motion.div>

      {/* Card 3: Pending Billing */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden hover:shadow-md transition-all">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Billing</p>
            <h3 className="text-3xl font-black text-gray-900">AED {pendingBillingAmount.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl"><AlertCircle size={24}/></div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 text-sm font-bold text-gray-500 relative z-10">
           <p>Revenue waiting for your approval.</p>
        </div>
      </motion.div>

    </div>
  );
}
