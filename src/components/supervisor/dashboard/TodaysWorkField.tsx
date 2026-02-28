"use client";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Clock, CalendarCheck, ShieldCheck, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function TodaysWorkField({ todayBookings }: { todayBookings: any[] }) {
  
  // Calculate Stats
  const total = todayBookings.length;
  const completed = todayBookings.filter(b => ['completed', 'finalized'].includes(b.status)).length;
  const activated = todayBookings.filter(b => b.status === 'active').length;
  const pending = todayBookings.filter(b => b.status === 'pending').length;
  
  const finalizedCount = todayBookings.filter(b => b.status === 'finalized').length;
  const todayRevenue = todayBookings.filter(b => b.status === 'finalized').reduce((acc, b) => acc + (b.price || 0), 0);

  // Pie Chart Data
  const pieData = [
    { name: "Done", value: completed, color: "#10B981" },    // Green
    { name: "Active", value: activated, color: "#3B82F6" },  // Blue
    { name: "Queue", value: pending, color: "#F59E0B" },     // Orange
  ];

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <CalendarCheck className="text-blue-600"/> Today's Work Field
        </h2>
        <span className="px-4 py-1.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-xl border border-blue-100">
          {total} Total Tasks
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Operations Stats */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-1">
           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-xl w-fit mb-2"><Zap size={20}/></div>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Activated</p>
             <p className="text-2xl font-black text-gray-900">{activated}</p>
           </div>
           <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-xl w-fit mb-2"><Clock size={20}/></div>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending Start</p>
             <p className="text-2xl font-black text-gray-900">{pending}</p>
           </div>
           <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 col-span-2 flex justify-between items-center">
             <div>
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Successfully Completed</p>
               <p className="text-2xl font-black text-gray-900">{completed}</p>
             </div>
             <div className="p-3 bg-green-100 text-green-600 rounded-xl"><CheckCircle2 size={24}/></div>
           </div>
        </div>

        {/* Center: Pie Chart (Visual Progress) */}
        <div className="flex flex-col items-center justify-center lg:col-span-1 bg-gray-50 rounded-3xl p-4 border border-gray-100">
          <div className="w-full h-40">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">No data today</div>
            )}
          </div>
          <div className="flex gap-4 mt-2">
             {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span> {item.name}
                </div>
             ))}
          </div>
        </div>

        {/* Right: Billing & Finance */}
        <div className="bg-gray-900 rounded-3xl p-6 text-white lg:col-span-1 relative overflow-hidden shadow-xl shadow-gray-900/20">
          <div className="absolute -right-10 -bottom-10 text-gray-800 opacity-30"><DollarSign size={150}/></div>
          <h3 className="font-bold text-blue-300 text-xs uppercase tracking-widest mb-6 flex items-center gap-2"><ShieldCheck size={16}/> Today's Billing</h3>
          
          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Price Submitted</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black">{finalizedCount} <span className="text-lg font-bold text-gray-500">Tasks</span></p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-800">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Approved Revenue</p>
              <p className="text-2xl font-black text-green-400">AED {todayRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
