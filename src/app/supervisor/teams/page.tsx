"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Building2, Calendar, Loader2, Clock, 
  MapPin, Sparkles, CheckCircle2, ShieldCheck, UserCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";

// --- Types ---
type Profile = {
  id: string;
  full_name: string;
  avatar_url: string;
};

type Booking = {
  id: number;
  cleaning_time: string;
  service_type: string;
  status: string;
  units?: { unit_number: string; companies?: { name: string } };
};

type Team = {
  id: number;
  team_name: string;
  member_ids: string[];
  status: string;
  shift_date: string;
  bookings?: Booking[];
};

export default function SupervisorTeamsPage() {
  const supabase = createClient();
  const [todayTeams, setTodayTeams] = useState<Team[]>([]);
  const [pastTeamsGroups, setPastTeamsGroups] = useState<Record<string, Team[]>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamsData = async () => {
      setLoading(true);

      // 1. Fetch Teams with their Assigned Bookings (1 API Call)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, team_name, member_ids, status, shift_date,
          bookings (
            id, cleaning_time, service_type, status,
            units ( unit_number, companies ( name ) )
          )
        `)
        .order('shift_date', { ascending: false })
        .limit(30); // limiting to recent records for performance

      if (teamsError || !teamsData) {
        console.error("Error fetching teams:", teamsError?.message);
        setLoading(false);
        return;
      }

      // 2. Extract all unique member IDs from all teams
      const allMemberIds = Array.from(new Set(teamsData.flatMap(t => t.member_ids || [])));

      // 3. Fetch Profiles for those members in Bulk (1 API Call)
      if (allMemberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allMemberIds);

        if (profilesData) {
          const pMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, Profile>);
          setProfilesMap(pMap);
        }
      }

      // 4. Group Teams (Today vs Past)
      const todayStr = new Date().toISOString().split('T')[0];
      const today: Team[] = [];
      const past: Record<string, Team[]> = {};

      teamsData.forEach(team => {
        const tDate = team.shift_date || todayStr;
        // active status or today's date goes to Today's section
        if (tDate === todayStr || team.status === 'active') {
          today.push(team);
        } else {
          if (!past[tDate]) past[tDate] = [];
          past[tDate].push(team);
        }
      });

      setTodayTeams(today);
      setPastTeamsGroups(past);
      setLoading(false);
    };

    fetchTeamsData();
  }, [supabase]);

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#F8FAFC]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  // Sorting past dates descending
  const sortedPastDates = Object.keys(pastTeamsGroups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      {/* HEADER: Blue Gradient Theme */}
      <div className="mb-10 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-2xl shadow-inner"><Users size={28} /></div>
            My Teams Overview
          </h1>
          <p className="text-gray-500 font-medium mt-2">Monitor daily active teams, agents on duty, and their assigned locations.</p>
        </div>
        <div className="px-6 py-3 bg-blue-50 rounded-xl border border-blue-100 text-sm font-black text-blue-800 shadow-sm flex items-center gap-2">
          <ShieldCheck size={18}/> {todayTeams.length} Active Teams Today
        </div>
      </div>

      <div className="space-y-12">

        {/* --- SECTION 1: TODAY'S HIGHLIGHTED TEAMS --- */}
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 pl-2">
            <Sparkles className="text-blue-600" size={24}/> Today's Active Teams
          </h2>
          
          {todayTeams.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
              <Users size={56} className="mx-auto mb-4 opacity-30 text-blue-500"/>
              <p className="text-xl font-black text-gray-800 mb-1">No active teams</p>
              <p className="text-sm">No teams have been assigned or activated for today yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {todayTeams.map((team) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={team.id} 
                  className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 shadow-xl shadow-blue-900/20 relative overflow-hidden"
                >
                  {/* Glowing BG Effects */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20 backdrop-blur-sm mb-2 inline-block">Live Status</span>
                      <h3 className="text-3xl font-black text-white tracking-tight">Team {team.team_name}</h3>
                    </div>
                  </div>

                  {/* Agents List (Horizontal Avatar Group) */}
                  <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/10 mb-6">
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">Agents on Duty ({team.member_ids?.length || 0})</p>
                    <div className="flex flex-wrap gap-3">
                      {team.member_ids?.map(id => {
                        const profile = profilesMap[id];
                        return (
                          <div key={id} className="flex items-center gap-2 bg-white/10 pr-3 rounded-full border border-white/5 transition-colors hover:bg-white/20">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-blue-300/50" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center text-white"><UserCircle size={20}/></div>
                            )}
                            <span className="text-sm font-bold text-white">{profile?.full_name || "Agent"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assigned Bookings List */}
                  <div>
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">Assigned Locations</p>
                    <div className="space-y-3">
                      {team.bookings && team.bookings.length > 0 ? (
                        team.bookings.map(booking => (
                          <div key={booking.id} className="bg-white/95 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:scale-[1.01] transition-transform">
                            <div>
                               <p className="text-sm font-black text-gray-900 flex items-center gap-1.5"><Building2 size={14} className="text-blue-500"/> {booking.units?.companies?.name}</p>
                               <p className="text-xs font-bold text-gray-500 ml-5">Unit {booking.units?.unit_number} • {booking.service_type}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                               <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1"><Clock size={12}/> {booking.cleaning_time}</span>
                               {booking.status === 'completed' && <span className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Done</span>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white/10 rounded-xl p-3 text-center border border-white/10 border-dashed">
                          <p className="text-sm text-blue-200 font-medium">No units assigned yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 2: PREVIOUS / ARCHIVED TEAMS --- */}
        {sortedPastDates.length > 0 && (
          <div className="space-y-8 pt-8 border-t-2 border-gray-200 border-dashed">
            <h2 className="text-xl font-black text-gray-500 mb-6 pl-2">Previous Teams History</h2>
            
            {sortedPastDates.map((dateStr) => (
              <div key={dateStr} className="space-y-4">
                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2 bg-gray-200/60 w-fit px-4 py-1.5 rounded-lg border border-gray-300/50">
                  <Calendar size={16}/> {format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pastTeamsGroups[dateStr].map(team => (
                    <div key={team.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                         <h4 className="font-black text-gray-900 text-xl">Team {team.team_name}</h4>
                         <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-md">Archived</span>
                       </div>

                       {/* Members Minimal View */}
                       <div className="mb-4">
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Members ({team.member_ids?.length || 0})</p>
                         <div className="flex -space-x-2 overflow-hidden">
                           {team.member_ids?.map(id => {
                              const profile = profilesMap[id];
                              return profile?.avatar_url ? (
                                <img key={id} src={profile.avatar_url} alt="avatar" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" title={profile.full_name} />
                              ) : (
                                <div key={id} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 ring-2 ring-white text-gray-500 text-xs font-bold" title={profile?.full_name}>
                                  {profile?.full_name?.charAt(0) || "A"}
                                </div>
                              );
                           })}
                         </div>
                       </div>

                       {/* Bookings Minimal View */}
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Works</p>
                         <div className="space-y-2">
                           {team.bookings && team.bookings.length > 0 ? (
                             team.bookings.map(booking => (
                               <div key={booking.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-700 truncate pr-2"><MapPin size={12} className="inline text-gray-400 mr-1"/>{booking.units?.companies?.name} - U{booking.units?.unit_number}</span>
                                  <span className="text-[10px] font-black text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 shrink-0">{booking.cleaning_time}</span>
                               </div>
                             ))
                           ) : (
                             <p className="text-xs text-gray-400 italic">No assigned work.</p>
                           )}
                         </div>
                       </div>

                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}