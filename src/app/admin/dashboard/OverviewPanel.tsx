'use client';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, DollarSign, PackagePlus, Star, Building2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface OverviewProps {
  bookings: any[];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}

export default function OverviewPanel({ bookings, dateFrom, setDateFrom, dateTo, setDateTo }: OverviewProps) {
  
  // 1. Process Filtered Data
  const data = useMemo(() => {
    let totalRev = 0;
    let extraRev = 0;
    const revTrendMap: any = {};
    const serviceMap: any = {};
    const clientMap: any = {};

    bookings.forEach(b => {
      // Financials
      const extras = b.booking_extra_inventory?.reduce((acc:any, ex:any) => acc + Number(ex.total_price), 0) || 0;
      const bTotal = Number(b.price) + extras;
      totalRev += bTotal;
      extraRev += extras;

      // Revenue Trend
      const date = format(parseISO(b.cleaning_date), 'dd MMM');
      revTrendMap[date] = (revTrendMap[date] || 0) + bTotal;

      // Service Distribution
      serviceMap[b.service_type] = (serviceMap[b.service_type] || 0) + 1;

      // Top Clients
      const compName = Array.isArray(b.units?.companies) ? b.units.companies[0]?.name : b.units?.companies?.name;
      if (compName) clientMap[compName] = (clientMap[compName] || 0) + bTotal;
    });

    const trendData = Object.keys(revTrendMap).map(k => ({ date: k, revenue: revTrendMap[k] }));
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];
    const serviceData = Object.keys(serviceMap).map((k, i) => ({ name: k, value: serviceMap[k], color: colors[i % colors.length] }));
    const topClients = Object.keys(clientMap).map(k => ({ name: k, rev: clientMap[k] })).sort((a,b) => b.rev - a.rev).slice(0, 4);

    return { totalRev, extraRev, totalBookings: bookings.length, trendData, serviceData, topClients };
  }, [bookings]);

  return (
    <div className="space-y-6">
      
      {/* --- FILTER CONTROL --- */}
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-2">
          <Calendar className="text-blue-600" size={20}/>
          <span className="font-black text-gray-800">Business Overview</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="p-2 bg-transparent outline-none font-bold text-xs text-gray-700 cursor-pointer"/>
          <span className="text-gray-400 font-bold text-xs">TO</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="p-2 bg-transparent outline-none font-bold text-xs text-gray-700 cursor-pointer"/>
        </div>
      </div>

      {/* --- FINANCIAL METRICS GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3"><DollarSign size={16}/></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <h3 className="text-xl font-black text-gray-900 leading-tight">AED {data.totalRev.toLocaleString()}</h3>
        </div>
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-white text-indigo-600 rounded-lg w-fit mb-3 shadow-sm"><PackagePlus size={16}/></div>
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Upsell Billed</p>
          <h3 className="text-xl font-black text-indigo-900 leading-tight">AED {data.extraRev.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg w-fit mb-3"><Calendar size={16}/></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Shifts</p>
          <h3 className="text-xl font-black text-gray-900 leading-tight">{data.totalBookings}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg w-fit mb-3"><TrendingUp size={16}/></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg. Ticket</p>
          <h3 className="text-xl font-black text-gray-900 leading-tight">AED {data.totalBookings ? Math.round(data.totalRev / data.totalBookings) : 0}</h3>
        </div>
      </div>

      {/* --- REVENUE TREND CHART --- */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2"><TrendingUp className="text-blue-500" size={18}/> Income Trend</h3>
        <div className="h-60 w-full">
          {data.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="colorRevLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dx={-10} width={40}/>
                <Tooltip cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '12px', fontWeight: 'bold' }}/>
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorRevLight)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">No revenue data for this period.</div>
          )}
        </div>
      </div>

      {/* --- LOWER GRID (PIE CHART & TOP CLIENTS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Services Doughnut */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><Star className="text-amber-500" size={18}/> Services Breakdown</h3>
          <div className="flex-1 min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.serviceData} innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                  {data.serviceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clients List */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><Building2 className="text-indigo-500" size={18}/> Top Clients</h3>
          <div className="space-y-3">
            {data.topClients.map((client, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400">0{idx + 1}</span>
                  <p className="font-bold text-gray-800 text-sm truncate max-w-[120px]">{client.name}</p>
                </div>
                <p className="font-black text-blue-700 text-sm">AED {client.rev}</p>
              </div>
            ))}
            {data.topClients.length === 0 && <p className="text-xs text-gray-400 font-bold text-center mt-4">No clients found.</p>}
          </div>
        </div>

      </div>

    </div>
  );
}
