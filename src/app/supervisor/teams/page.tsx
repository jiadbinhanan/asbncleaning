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

// 🚨 FIXED: Removed strict Booking type and used any[] to solve Vercel Build Error
type Team = {
  id: number;
  team_name: string;
  member_ids: string[];
  status: string;
  shift_date: string;
  bookings?: any[]; 
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

      // 1. Fetch Teams with their Assigned Bookings (1 API Call - Highly Optimized)
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          *,
          bookings (
            id, cleaning_time, service_type, status,
            units ( unit_number, companies ( name ) )
          )
        `)
        .order('shift_date', { ascending: false });

      if (error) {
        console.error("Error fetching teams:", error);
        setLoading(false);
        return;
      }

      const fetchedTeams = (teamsData as any[]) || [];

      // 2. Extract all unique member IDs to fetch profiles
      const allMemberIds = Array.from(new Set(fetchedTeams.flatMap(t => t.member_ids || [])));
      
      if (allMemberIds.length > 0) {
        // 3. Fetch Profiles (2nd API Call - Optimized)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allMemberIds);

        if (profilesData) {
          const pMap: Record<string, Profile> = {};
          profilesData.forEach(p => pMap[p.id] = p);
          setProfilesMap(pMap);
        }
      }

      // 4. Categorize Teams (Today/Active vs Past)
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const today: Team[] = [];
      const past: Record<string, Team[]> = {};

      fetchedTeams.forEach(team => {
        const tDate = team.shift_date;
        
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

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      
      {/* PREMIUM HEADER */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-20 px-6 md:px-12 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10">
           <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1.5"><Sparkles size={12}/> Workforce Control</p>
           <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
             <Users className="text-blue-500" size={32}/> Team Rosters
           </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-10 relative z-20 space-y-12">
        
        {/* --- SECTION 1: TODAY / ACTIVE TEAMS --- */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 pl-2">
            <CheckCircle2 className="text-green-600" size={20}/> Active / Today's Teams
          </h2>
          
          {todayTeams.length === 0 ? (
            <div className="bg-white p-10 rounded-[2rem] border border-gray-100 text-center shadow-sm">
               <ShieldCheck size={48} className="mx-auto text-gray-300 mb-3"/>
               <p className="text-gray-500 font-bold">No active teams for today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {todayTeams.map(team => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={team.id} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border border-blue-50 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-green-400"></div>
                   
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="text-xl font-black text-gray-900">{team.team_name}</h3>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 flex items-center gap-1"><Calendar size={12}/> {format(parseISO(team.shift_date), 'dd MMM yyyy')}</p>
                     </div>
                     <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-200">Active</span>
                   </div>

                   {/* Members */}
                   <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Assigned Members ({team.member_ids?.length || 0})</p>
                     <div className="flex flex-wrap gap-2">
                       {team.member_ids?.map(id => {
                         const p = profilesMap[id];
                         return (
                           <div key={id} className="flex items-center gap-2 bg-white pr-3 p-1 rounded-full border border-gray-200 shadow-sm">
                             <div className="w-6 h-6 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center">
                               {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <UserCircle size={16} className="text-blue-500"/>}
                             </div>
                             <span className="text-xs font-bold text-gray-700">{p?.full_name?.split(' ')[0] || "Unknown"}</span>
                           </div>
                         );
                       })}
                     </div>
                   </div>

                   {/* Bookings Minimal View */}
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Works ({team.bookings?.length || 0})</p>
                     <div className="space-y-2">
                       {team.bookings && team.bookings.length > 0 ? (
                         team.bookings.map(booking => {
                           // 🚨 Safe extraction of company name array handling
                           const companyName = Array.isArray(booking.units?.companies) 
                             ? booking.units.companies[0]?.name 
                             : booking.units?.companies?.name;

                           return (
                             <div key={booking.id} className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                                <span className="text-xs font-bold text-gray-800 truncate pr-2 flex items-center gap-1.5">
                                  <MapPin size={14} className="text-blue-500"/> 
                                  {companyName || "Unknown"} <span className="text-gray-400 font-medium">| U{booking.units?.unit_number}</span>
                                </span>
                                <span className="text-[10px] font-black text-blue-700 bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-sm shrink-0">{booking.cleaning_time}</span>
                             </div>
                           );
                         })
                       ) : (
                         <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">No assigned work yet.</p>
                       )}
                     </div>
                   </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 2: PAST TEAMS --- */}
        {Object.keys(pastTeamsGroups).length > 0 && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 pl-2 border-t border-gray-200 pt-8">
              <Clock className="text-gray-500" size={20}/> Past Rosters
            </h2>
            
            {Object.keys(pastTeamsGroups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(dateStr => (
              <div key={dateStr} className="mb-8 relative pl-6 md:pl-8 border-l-2 border-gray-200">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 ring-4 ring-[#F4F7FA]"></div>
                <h3 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-4">{format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pastTeamsGroups[dateStr].map(team => (
                    <div key={team.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                       <div className="flex justify-between items-center mb-3">
                         <h4 className="font-black text-gray-800">{team.team_name}</h4>
                         <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{team.status}</span>
                       </div>
                       
                       {/* Members Minimal */}
                       <div className="mb-4 flex flex-wrap gap-1">
                         {team.member_ids?.map(id => {
                           const p = profilesMap[id];
                           return (
                             <span key={id} className="text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                               {p?.full_name?.split(' ')[0] || "U"}
                             </span>
                           )
                         })}
                       </div>

                       {/* Bookings Minimal View */}
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Works</p>
                         <div className="space-y-2">
                           {team.bookings && team.bookings.length > 0 ? (
                             team.bookings.map(booking => {
                               const companyName = Array.isArray(booking.units?.companies) 
                                 ? booking.units.companies[0]?.name 
                                 : booking.units?.companies?.name;

                               return (
                                 <div key={booking.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-700 truncate pr-2 flex items-center gap-1">
                                      <MapPin size={10} className="text-gray-400"/>
                                      {companyName} - U{booking.units?.unit_number}
                                    </span>
                                    <span className="text-[9px] font-black text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 shrink-0">{booking.cleaning_time}</span>
                                 </div>
                               );
                             })
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
