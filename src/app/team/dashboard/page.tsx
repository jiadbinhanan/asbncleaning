"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, PlayCircle, Calendar, CheckCircle, 
  MapPin, AlertCircle, Loader2, ArrowRight, 
  Sparkles, CheckCircle2, Building2, UserCircle, Key, LayoutGrid, HandHeart, LogOut 
} from "lucide-react";
import { format } from "date-fns";

// --- 🚨 Extra Details Component (Door Code & Layout) ---
const ExtraDetails = ({ booking }: { booking: any }) => (
  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between gap-4 mt-4">
     <div className="flex-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><LayoutGrid size={12}/> Layout</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5">{booking.units?.layout || 'Standard'}</p>
     </div>
     <div className="w-px h-8 bg-blue-200"></div>
     <div className="flex-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Key size={12}/> Door Code</p>
        <p className="text-sm font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded w-fit mt-0.5">{booking.units?.door_code || 'No Code'}</p>
     </div>
  </div>
);

export default function TeamDashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Categorized Bookings
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<any[]>([]);

  const fetchTeamData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/team/login');

    // 1. Fetch Active Team (Only 1 API call to find where user belongs)
    const { data: activeTeams, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .contains('member_ids', [user.id])
      .eq('status', 'active');

    if (teamError) {
      console.error(teamError);
      return setLoading(false);
    }

    if (!activeTeams || activeTeams.length === 0) {
      setLoading(false);
      return;
    }

    const currentTeam = activeTeams[0];
    setTeamInfo(currentTeam);

    // 🚨 FIXED: Timezone Error. Exact Local Date string for DB match
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // 2. Optimized Parallel API Calls (Profiles & Bookings fetched together)
    const [profilesRes, bookingsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', currentTeam.member_ids),
      supabase.from('bookings').select(`
        *,
        units!inner ( id, unit_number, building_name, door_code, layout, companies(name) )
      `)
      .eq('cleaning_date', todayStr)
      .order('cleaning_time', { ascending: true })
    ]);

    if (profilesRes.data) setTeamMembers(profilesRes.data);

    // 3. Categorize Tasks strictly
    if (bookingsRes.data) {
      const teamId = Number(currentTeam.id);

      const assigned = bookingsRes.data.filter((b: any) => 
        Number(b.assigned_team_id) === teamId && 
        ['pending', 'active'].includes(b.status)
      );
      
      const completed = bookingsRes.data.filter((b: any) => 
        Number(b.assigned_team_id) === teamId && 
        ['completed', 'finalized'].includes(b.status)
      );
      
      const unassigned = bookingsRes.data.filter((b: any) => 
        b.assigned_team_id === null && 
        ['pending'].includes(b.status)
      );

      setAssignedTasks(assigned);
      setCompletedTasks(completed);
      setUnassignedTasks(unassigned);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTeamData(); }, [supabase, router]);

  // --- Assign Task to Self ---
  const handleSelfAssign = async (bookingId: number) => {
    if (!teamInfo) return;
    setAssigningId(bookingId);
    
    const { error } = await supabase
      .from('bookings')
      .update({ assigned_team_id: teamInfo.id })
      .eq('id', bookingId);
      
    if (error) alert("Failed to assign task: " + error.message);
    else await fetchTeamData(); // Refresh seamlessly
    
    setAssigningId(null);
  };

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  if (!teamInfo) return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-red-100">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4"/>
        <h2 className="text-xl font-black text-gray-900 mb-2">No Active Team</h2>
        <p className="text-sm text-gray-500 font-bold">You are not assigned to any active cleaning team for today.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative overflow-hidden">
      
      {/* --- PREMIUM HEADER --- */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-16 px-4 md:px-8 shadow-2xl relative rounded-b-[2.5rem]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1.5"><Sparkles size={12}/> Today's Roster</p>
              <h1 className="text-3xl font-black tracking-tight">{format(new Date(), "EEEE, dd MMM")}</h1>
            </div>
            
            {/* 🚨 EXIT / LOGOUT BUTTON 🚨 */}
            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push('/team/login'); }} 
              className="p-2.5 md:px-4 md:py-2.5 bg-white/10 hover:bg-red-500/80 text-gray-300 hover:text-white rounded-xl transition-all border border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-sm"
            >
              <LogOut size={18}/> <span className="hidden md:inline text-xs font-black uppercase tracking-widest">Exit App</span>
            </button>
          </div>
          
          {/* Active Team & Members Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-[2rem]">
             <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                 <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg"><Building2 size={24}/></div>
                 <div>
                    <p className="text-xs text-blue-200 font-bold uppercase tracking-widest">Active Team</p>
                    <h2 className="text-xl font-black">{teamInfo.team_name}</h2>
                 </div>
             </div>
             
             {/* 🚨 TEAM MEMBERS WITH NAMES 🚨 */}
             <div className="flex flex-wrap gap-2.5">
                {teamMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 bg-black/30 pr-3 p-1 rounded-full border border-white/5 hover:bg-black/50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-900 overflow-hidden shadow-sm">
                      {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : m.full_name?.charAt(0) || "U"}
                    </div>
                    <span className="text-xs font-bold text-gray-200">{m.full_name || m.username}</span>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 mt-6 space-y-8 relative z-20">
        
        {/* --- SECTION 1: ASSIGNED TASKS (YOUR TASKS) --- */}
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 pl-2">
            <CheckCircle className="text-blue-600" size={18}/> Your Assigned Tasks ({assignedTasks.length})
          </h3>
          
          {assignedTasks.length === 0 ? (
            <div className="bg-white/50 border border-gray-200 border-dashed rounded-3xl p-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-gray-300 mb-3"/>
              <p className="text-sm font-bold text-gray-500">No pending tasks for your team right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedTasks.map(booking => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={booking.id} className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 border border-blue-100"><Clock size={12}/> {booking.cleaning_time}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-1 rounded-md">{booking.status}</span>
                  </div>
                  
                  <h4 className="text-xl font-black text-gray-900 mb-1 leading-tight">{booking.units?.companies?.name}</h4>
                  <p className="text-sm text-gray-600 font-bold flex items-center gap-1.5 mb-2"><MapPin size={14} className="text-blue-400"/> Unit {booking.units?.unit_number} - {booking.units?.building_name}</p>
                  <p className="text-xs font-black text-indigo-700 bg-indigo-50 w-fit px-2 py-1 rounded-md border border-indigo-100 uppercase">{booking.service_type}</p>

                  <ExtraDetails booking={booking} />

                  <button 
                    onClick={() => router.push(`/team/duty/${booking.id}`)}
                    className="w-full mt-5 py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 shadow-lg"
                  >
                    Enter Shift & Start <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 2: UNASSIGNED TASK POOL --- */}
        {unassignedTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 pl-2">
              <LayoutGrid className="text-amber-500" size={18}/> Open Task Pool ({unassignedTasks.length})
            </h3>
            <div className="space-y-4">
              {unassignedTasks.map(booking => (
                <div key={booking.id} className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100/50 hover:border-amber-200 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-gray-500 flex items-center gap-1"><Clock size={12}/> {booking.cleaning_time}</span>
                    <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100">Unassigned</span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 leading-tight">{booking.units?.companies?.name}</h4>
                  <p className="text-sm text-gray-600 font-bold mb-4">Unit {booking.units?.unit_number} • {booking.service_type}</p>

                  <ExtraDetails booking={booking} />

                  <button 
                    onClick={() => handleSelfAssign(booking.id)}
                    disabled={assigningId === booking.id}
                    className="w-full mt-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/20"
                  >
                    {assigningId === booking.id ? <Loader2 className="animate-spin" size={18}/> : <HandHeart size={18}/>}
                    {assigningId === booking.id ? "Assigning..." : "Accept & Assign to My Team"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTION 3: COMPLETED TASKS --- */}
        {completedTasks.length > 0 && (
          <div className="opacity-70">
            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 pl-2">
              <CheckCircle2 size={18}/> Completed Today ({completedTasks.length})
            </h3>
            <div className="space-y-4">
              {completedTasks.map(booking => (
                <div key={booking.id} className="bg-gray-100 rounded-3xl p-5 border border-gray-200 flex items-center justify-between grayscale">
                  <div>
                    <h4 className="text-base font-black text-gray-700 line-through decoration-gray-400">{booking.units?.companies?.name}</h4>
                    <p className="text-xs font-bold text-gray-500">Unit {booking.units?.unit_number} • {booking.service_type}</p>
                  </div>
                  <div className="bg-green-100 text-green-700 p-2 rounded-full"><CheckCircle2 size={20}/></div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
