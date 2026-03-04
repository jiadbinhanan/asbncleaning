'use client';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export default function TodayAuditCard({ bookings }: { bookings: any[] }) {
  
  const stats = useMemo(() => {
    // অডিটের জন্য শুধু completed (pending audit) এবং finalized (audited) বুকিংগুলো নেব
    const auditable = bookings.filter(b => b.status === 'completed' || b.status === 'finalized');
    const audited = auditable.filter(b => b.status === 'finalized').length;
    const pending = auditable.filter(b => b.status === 'completed').length;
    
    // অডিট হওয়া বুকিংয়ের টোটাল প্রাইস
    const auditedRevenue = auditable.filter(b => b.status === 'finalized').reduce((sum, b) => {
      const extra = b.booking_extra_inventory?.reduce((acc:any, ex:any) => acc + Number(ex.total_price), 0) || 0;
      return sum + Number(b.price) + extra;
    }, 0);

    return { audited, pending, auditedRevenue, total: auditable.length };
  }, [bookings]);

  const data = [
    { name: 'Audited', value: stats.audited, color: '#10B981' }, // Emerald
    { name: 'Pending', value: stats.pending, color: '#F59E0B' }  // Amber
  ];

  return (
    <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 h-full flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
      
      {/* Background Watermark Icon */}
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
        <ShieldCheck size={100} />
      </div>

      <div className="mb-2 relative z-10 text-center">
        <h2 className="text-sm font-black text-gray-900 flex items-center justify-center gap-1.5">
          <ShieldCheck className="text-emerald-500" size={16}/> QC Audit
        </h2>
        <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">Today's Approvals</p>
      </div>

      {/* Half Doughnut Chart */}
      <div className="h-28 w-full relative z-10 -mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              cx="50%" cy="100%" 
              startAngle={180} endAngle={0} 
              innerRadius={35} outerRadius={50} 
              dataKey="value" stroke="none" 
              cornerRadius={4}
              paddingAngle={2}
            >
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', padding: '4px 8px' }} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Percentage */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
           <span className="text-lg font-black text-gray-800">
             {stats.total > 0 ? Math.round((stats.audited / stats.total) * 100) : 0}%
           </span>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="flex justify-between items-center mt-6 mb-4 px-2 relative z-10">
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500"/> Done</p>
          <p className="text-sm font-black text-gray-800">{stats.audited}</p>
        </div>
        <div className="text-center border-l border-gray-100 pl-4">
          <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10} className="text-amber-500"/> Left</p>
          <p className="text-sm font-black text-gray-800">{stats.pending}</p>
        </div>
      </div>

      {/* Total Audited Value */}
      <div className="mt-auto bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl text-center relative z-10">
        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Audited Price</p>
        <p className="text-xl font-black text-emerald-700 leading-none">AED {stats.auditedRevenue.toLocaleString()}</p>
      </div>

    </div>
  );
}
