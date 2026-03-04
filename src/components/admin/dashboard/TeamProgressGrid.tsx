'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, UserCircle } from 'lucide-react';

interface TeamProgressProps {
  bookings: any[];
  profilesMap: Record<string, any>;
}

export default function TeamProgressGrid({ bookings, profilesMap }: TeamProgressProps) {
  
  const teamStats = useMemo(() => {
    const tMap: Record<string, any> = {};
    
    bookings.forEach(b => {
      if (!b.teams) return;
      const tid = b.teams.id;
      if (!tMap[tid]) {
        tMap[tid] = {
          id: tid,
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

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 h-full flex flex-col hover:shadow-md transition-shadow">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Users className="text-blue-500" size={20}/> Team Progress
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Today's active teams and task completion status</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-100">
          {teamStats.length} Active Teams
        </div>
      </div>

      {teamStats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 min-h-[150px]">
          <Users size={40} className="mb-2 opacity-50"/>
          <span className="font-bold text-sm">No teams assigned today</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamStats.map((team: any, idx: number) => {
            const progress = team.target > 0 ? (team.completed / team.target) * 100 : 0;
            const isDone = team.completed === team.target;

            return (
              <div key={team.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100/80 hover:border-blue-200 transition-colors group">
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-gray-800 text-sm flex items-center gap-1.5">
                    {team.team_name}
                    {isDone && <CheckCircle2 size={14} className="text-emerald-500"/>}
                  </h3>
                  
                  {/* Overlapping DPs */}
                  <div className="flex -space-x-2">
                    {team.member_ids.slice(0, 3).map((id: string) => {
                      const p = profilesMap[id];
                      return (
                        <div key={id} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden shadow-sm relative group/dp">
                          {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <UserCircle size={28} className="text-gray-400 -ml-0.5 -mt-0.5"/>}
                          <div className="absolute opacity-0 group-hover/dp:opacity-100 bg-gray-900 text-white text-[9px] px-2 py-0.5 rounded -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity z-10 pointer-events-none">
                            {p?.full_name?.split(' ')[0] || 'Unknown'}
                          </div>
                        </div>
                      );
                    })}
                    {team.member_ids.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-500 z-0">
                        +{team.member_ids.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Sleek Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tasks</span>
                    <span className="text-xs font-black text-gray-900">{team.completed} <span className="text-gray-400">/ {team.target}</span></span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${progress}%` }} 
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
