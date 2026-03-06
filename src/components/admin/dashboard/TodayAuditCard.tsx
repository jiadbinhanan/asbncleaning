'use client';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export default function TodayAuditCard({ bookings }: { bookings: any[] }) {
  
  const stats = useMemo(() => {
    // 🚨 FIXED: এখন active, in_progress, completed এবং finalized—সবগুলোকেই অডিটেবল ধরা হচ্ছে
    const auditable = bookings.filter(b => ['active', 'in_progress', 'completed', 'finalized'].includes(b.status));
    
    // যেগুলো অডিট হয়ে গেছে
    const audited = auditable.filter(b => b.status === 'finalized').length;
    
    // যেগুলো এখনো অডিট হয়নি (Active + In Progress + Completed)
    const pending = auditable.filter(b => ['active', 'in_progress', 'completed'].includes(b.status)).length;
    
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
      <div className="flex-1 flex flex-col justify-end mt-4 relative z-10">
         <div className="border-t border-gray-100 pt-3 mt-2">
             <div className="flex justify-between items-center text-xs mb-2">
                 <span className="font-bold text-gray-500 flex items-center gap-1.5"><CheckCircle2 className="text-emerald-500" size={14}/> Audited</span>
                 <span className="font-black text-gray-800">{stats.audited}</span>
             </div>
             <div className="flex justify-between items-center text-xs mb-2">
                 <span className="font-bold text-gray-500 flex items-center gap-1.5"><Clock className="text-amber-500" size={14}/> Left</span>
                 <span className="font-black text-gray-800">{stats.pending}</span>
             </div>
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Approved Revenue</p>
                 <p className="text-center font-black text-lg text-emerald-600 mt-1">
                   AED {stats.auditedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </p>
             </div>
         </div>
      </div>
    </div>
  );
}
