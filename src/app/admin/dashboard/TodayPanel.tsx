'use client';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle2, Clock, Users, UserCircle } from 'lucide-react';

interface TodayPanelProps {
  bookings: any[];
  profilesMap: Record<string, any>;
}

export default function TodayPanel({ bookings, profilesMap }: TodayPanelProps) {
  
  // 1. Process Overall Today Stats
  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length;
    const pending = total - completed;
    
    const revenue = bookings.reduce((sum, b) => {
      const extra = b.booking_extra_inventory?.reduce((acc:any, ex:any) => acc + Number(ex.total_price), 0) || 0;
      return sum + Number(b.price) + extra;
    }, 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, revenue, completionRate };
  }, [bookings]);

  // 2. Process Team-wise Detailed Stats for Recharts
  const teamStats = useMemo(() => {
    const tMap: Record<string, any> = {};
    
    bookings.forEach(b => {
      if (!b.teams) return;
      const tid = b.teams.id;
      if (!tMap[tid]) {
        tMap[tid] = {
          team_name: b.teams.team_name,
          member_ids: b.teams.member_ids || [],
          target: 0,
          completed: 0,
        };
      }
      tMap[tid].target += 1;
      if (b.status === 'completed' || b.status === 'finalized') {
        tMap[tid].completed += 1;
      }
    });

    return Object.values(tMap);
  }, [bookings]);

  const pieData = [
    { name: 'Completed', value: stats.completed, color: '#10B981' },
    { name: 'Pending', value: stats.pending, color: '#F59E0B' }
  ];

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Activity className="text-blue-500"/> Today's Operations
        </h2>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-200">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live
        </span>
      </div>

      {/* --- OVERALL TODAY GLANCE --- */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
        <div className="w-24 h-24 shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={28} outerRadius={40} dataKey="value" stroke="none" cornerRadius={4}>
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xs font-black text-gray-900">{stats.completionRate}%</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
           <div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Revenue</p>
             <p className="text-xl font-black text-gray-900 leading-tight">AED {stats.revenue.toLocaleString()}</p>
           </div>
           <div className="flex gap-4">
             <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500"/> Done</p>
               <p className="text-base font-black text-gray-800">{stats.completed}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Clock size={10} className="text-amber-500"/> Left</p>
               <p className="text-base font-black text-gray-800">{stats.pending}</p>
             </div>
           </div>
        </div>
      </div>

      {/* --- ELABORATE TEAM PROGRESS --- */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pl-2">Active Teams Progress</h3>
        
        {teamStats.length === 0 ? (
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 border-dashed text-center">
            <Users className="mx-auto text-gray-300 mb-2" size={32}/>
            <p className="text-sm font-bold text-gray-500">No teams assigned today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teamStats.map((team: any, idx: number) => {
              const chartData = [
                { name: 'Completed', value: team.completed, fill: '#10B981' },
                { name: 'Pending', value: team.target - team.completed, fill: '#E2E8F0' }
              ];

              return (
                <div key={idx} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:border-blue-100 transition-colors">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">{team.team_name}</h4>
                      
                      {/* Team Member DPs Overlapping */}
                      <div className="flex -space-x-2 mt-2">
                        {team.member_ids.map((id: string) => {
                          const p = profilesMap[id];
                          return (
                            <div key={id} className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm flex items-center justify-center relative group">
                              {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <UserCircle size={14} className="text-gray-400"/>}
                              <div className="absolute opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[9px] px-2 py-0.5 rounded -top-6 whitespace-nowrap transition-opacity z-10">
                                {p?.full_name?.split(' ')[0] || 'Unknown'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks</p>
                      <p className="font-black text-gray-900 text-sm">{team.completed} <span className="text-gray-400">/ {team.target}</span></p>
                    </div>
                  </div>

                  {/* Team Progress Mini Bar Chart */}
                  <div className="h-10 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <XAxis type="category" dataKey="name" hide />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', fontSize: '10px', padding: '4px 8px' }}/>
                        <Bar dataKey="value" radius={4} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
