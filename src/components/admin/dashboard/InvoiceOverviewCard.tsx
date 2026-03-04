'use client';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Building2 } from 'lucide-react';

export default function InvoiceOverviewCard({ invoices }: { invoices: any[] }) {
  
  const data = useMemo(() => {
    let totalGenerated = invoices.length;
    let totalValue = 0;
    const companyMap: Record<string, number> = {};

    invoices.forEach(inv => {
      const val = Number(inv.total_amount) || 0;
      totalValue += val;
      companyMap[inv.company_name] = (companyMap[inv.company_name] || 0) + val;
    });

    const colors = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B', '#F43F5E', '#14B8A6', '#6366F1'];
    
    const chartData = Object.keys(companyMap)
      .map((name, i) => ({ 
        name, 
        value: companyMap[name], 
        color: colors[i % colors.length] 
      }))
      .sort((a, b) => b.value - a.value); // Sort highest value first

    return { totalGenerated, totalValue, chartData };
  }, [invoices]);

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 h-full flex flex-col hover:shadow-md transition-shadow">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-50">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileText className="text-emerald-500" size={20}/> Invoice Generation
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Company-wise revenue from generated invoices in selected range</p>
        </div>
        
        <div className="flex gap-4">
           <div className="text-right">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoices</p>
             <p className="text-xl font-black text-gray-800">{data.totalGenerated}</p>
           </div>
           <div className="w-px bg-gray-200"></div>
           <div className="text-right">
             <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Total Value</p>
             <p className="text-xl font-black text-emerald-600">AED {data.totalValue.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center gap-8 min-h-[200px]">
        
        {data.chartData.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center text-gray-300 h-full">
            <FileText size={40} className="mb-2 opacity-50"/>
            <span className="font-bold text-sm">No invoices generated for this date range</span>
          </div>
        ) : (
          <>
            {/* The Filled Pie Chart */}
            <div className="w-full md:w-1/2 h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={data.chartData} 
                    cx="50%" cy="50%" 
                    outerRadius={90} 
                    innerRadius={40} // Small inner radius for modern filled look
                    paddingAngle={2}
                    dataKey="value" 
                    stroke="none"
                  >
                    {data.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                   formatter={(value: any) => [`AED ${Number(value).toLocaleString()}`, 'Revenue']}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend (Company-wise breakdown) */}
            <div className="w-full md:w-1/2 space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
              {data.chartData.map((comp, idx) => {
                const percentage = data.totalValue > 0 ? ((comp.value / data.totalValue) * 100).toFixed(1) : 0;
                
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3 overflow-hidden pr-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: comp.color }}></div>
                      <p className="font-bold text-gray-800 text-sm truncate group-hover:text-black transition-colors">{comp.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-gray-900 text-sm">AED {comp.value.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-gray-400">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
