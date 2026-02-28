"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { Users, Target, CheckCircle2, UserCircle, Activity } from "lucide-react";

export default function TeamRadar({ todayTeams }: { todayTeams: any[] }) {
  const supabase = createClient();
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

  // OPTIMIZED BULK FETCH: Get all member profiles in 1 single API call
  useEffect(() => {
    const fetchMemberProfiles = async () => {
      if (!todayTeams || todayTeams.length === 0) return;

      // Extract unique member IDs from all teams
      const allMemberIds = Array.from(new Set(todayTeams.flatMap(t => t.member_ids || [])));
      
      if (allMemberIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allMemberIds);

        if (data) {
          const pMap = data.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
          setProfilesMap(pMap);
        }
      }
    };

    fetchMemberProfiles();
  }, [supabase, todayTeams]);

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Activity className="text-blue-600"/> Team Radar
        </h2>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-widest rounded-lg border border-blue-100 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Live
        </span>
      </div>

      {todayTeams.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-bold">No teams are active on the field right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {todayTeams.map((team, index) => {
            
            // Calculate Performance / Completion Rate
            const totalAssigned = team.bookings?.length || 0;
            const completed = team.bookings?.filter((b: any) => ['completed', 'finalized'].includes(b.status)).length || 0;
            const progressPercentage = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: index * 0.1 }}
                key={team.id} 
                className="bg-gray-50 hover:bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
              >
                {/* Status Indicator Line */}
                <div className={`absolute top-0 left-0 w-1 h-full ${team.status === 'active' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>

                <div className="flex justify-between items-start mb-4 pl-2">
                  <h3 className="font-black text-lg text-gray-900 truncate">Team {team.team_name}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${team.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                    {team.status}
                  </span>
                </div>

                {/* Team Members Avatars */}
                <div className="mb-6 pl-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={12}/> Agents on Duty</p>
                  <div className="flex -space-x-2 overflow-hidden">
                    {team.member_ids?.length > 0 ? (
                      team.member_ids.map((id: string) => {
                        const profile = profilesMap[id];
                        return profile?.avatar_url ? (
                          <img key={id} src={profile.avatar_url} alt="avatar" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" title={profile.full_name} />
                        ) : (
                          <div key={id} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 ring-2 ring-white text-blue-600 text-xs font-bold" title={profile?.full_name}>
                            {profile?.full_name?.charAt(0) || "A"}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs font-bold text-gray-400">No agents assigned</span>
                    )}
                  </div>
                </div>

                {/* Progress Bar (Completion Rate) */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 pl-2">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Target size={12}/> Completion</p>
                    <p className="text-sm font-black text-gray-900">{completed} <span className="text-xs text-gray-400 font-bold">/ {totalAssigned} Tasks</span></p>
                  </div>
                  
                  {/* Progress Track */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    ></motion.div>
                  </div>
                  
                  {progressPercentage === 100 && totalAssigned > 0 && (
                    <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={12}/> All assigned tasks finished!</p>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
