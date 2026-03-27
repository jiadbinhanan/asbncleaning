"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, PlayCircle, Calendar, CheckCircle, 
  MapPin, AlertCircle, Loader2, ArrowRight, 
  CheckCircle2, Building2, UserCircle, Key, LayoutGrid, HandHeart, LogOut, Users, X
} from "lucide-react";
import { format } from "date-fns";

// --- 🚨 Time Formatter Helper ---
const formatTime = (timeString: string) => {
  if (!timeString) return 'Anytime';
  try {
    const [hour, minute] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10));
    d.setMinutes(parseInt(minute, 10));
    return format(d, "h:mm a");
  } catch(e) { return timeString; }
};

// --- 🚨 Extra Details Component (Door Code & Layout) ---
const ExtraDetails = ({ booking }: { booking: any }) => (
  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 mt-4">
     <div className="flex-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><LayoutGrid size={12}/> Layout</p>
        <p className="text-sm font-bold text-indigo-900 mt-0.5">{booking.units?.layout || 'Standard'}</p>
     </div>
     <div className="w-px h-8 bg-indigo-200"></div>
     <div className="flex-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Key size={12}/> Door Code</p>
        <p className="text-sm font-black text-indigo-900 mt-0.5 tracking-wider">{booking.units?.door_code || 'N/A'}</p>
     </div>
  </div>
);

// --- Avatar Helper (Fixed Sizes) ---
const Avatar = ({ profile, sizeClass = "w-10 h-10" }: { profile: any, sizeClass?: string }) => {
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="DP" className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm bg-gray-100`} />;
  return (
    <div className={`${sizeClass} rounded-full bg-indigo-100 border-2 border-white text-indigo-700 flex items-center justify-center font-black text-xs shadow-sm`}>
      {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
    </div>
  );
};

export default function TeamDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, any>>({});
  const [bookings, setBookings] = useState<any[]>([]);
  
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<any>(null);

  // --- Initial Fetch ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/team/login'); return; }
      const userId = session.user.id;

      // 1. Fetch Agent Profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setAgentProfile(profile);

      // 2. Fetch User's Active Teams
      const { data: teamsData } = await supabase.from('teams')
        .select('*')
        .contains('member_ids', [userId])
        .eq('status', 'active');

      if (teamsData && teamsData.length > 0) {
        setTeams(teamsData);
        
        const allMemberIds = [...new Set(teamsData.flatMap(t => t.member_ids || []))];
        const teamIds = teamsData.map(t => t.id);
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        // 3. PARALLEL FETCH
        const [profilesRes, bookingsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, avatar_url').in('id', allMemberIds),
          supabase.from('bookings')
            .select('*, units(unit_number, layout, door_code, building_name, companies(name)), checklist_templates(title), work_status')
            .eq('cleaning_date', todayStr)
            .in('status', ['active', 'completed'])
            .or(`assigned_team_id.in.(${teamIds.join(',')}),assigned_team_id.is.null`)
        ]);

        if (profilesRes.data) {
          const profileMap: any = {};
          profilesRes.data.forEach(p => profileMap[p.id] = p);
          setTeamMembers(profileMap);
        }
        if (bookingsRes.data) setBookings(bookingsRes.data);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [router, supabase]);

  // --- Handlers ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/team/login');
  };

  const handleAssignToTeam = async (teamId: number) => {
    if (!selectedBookingForAssign) return;
    const bookingId = selectedBookingForAssign.id;
    setAssigningId(bookingId);
    
    const { error } = await supabase.from('bookings').update({ assigned_team_id: teamId }).eq('id', bookingId);
    
    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, assigned_team_id: teamId } : b));
      setSelectedBookingForAssign(null);
    } else {
      alert(error.message);
    }
    setAssigningId(null);
  };

  // --- Filtered Data ---
  const unassignedTasks = bookings.filter(b => !b.assigned_team_id && b.status === 'active');
  const completedTasks = bookings.filter(b => b.status === 'completed');

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      
      {/* --- 1. AGENT HEADER (Old Color Restored) --- */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-20 px-4 shadow-2xl relative overflow-hidden rounded-b-[2.5rem]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-xl mx-auto relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <Avatar profile={agentProfile} sizeClass="w-14 h-14" />
             <div>
                <p className="text-blue-300 font-bold uppercase tracking-widest text-[10px] mb-0.5">Welcome Back</p>
                <h1 className="text-xl font-black tracking-tight">{agentProfile?.full_name || 'Agent'}</h1>
                <span className="inline-block mt-1 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 shadow-sm">
                  Assigned to {teams.length} Team{teams.length > 1 ? 's' : ''}
                </span>
             </div>
          </div>
          <button onClick={handleLogout} className="p-3 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-xl transition-all shadow-sm">
            <LogOut size={20}/>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-10 relative z-20 space-y-8">
        
        {teams.length === 0 ? (
           <div className="bg-white p-8 rounded-3xl text-center shadow-xl border border-gray-100">
             <Users size={48} className="mx-auto text-gray-300 mb-4"/>
             <h2 className="text-lg font-black text-gray-900">No Active Teams</h2>
             <p className="text-sm font-bold text-gray-500 mt-2">You are not assigned to any active teams today. Please contact your supervisor.</p>
           </div>
        ) : (
          <>
            {/* --- SECTION 1: TEAM CARDS & ASSIGNED TASKS --- */}
            {teams.map(team => {
              const teamTasks = bookings.filter(b => b.assigned_team_id === team.id && b.status === 'active');
              
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={team.id} className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
                  
                  {/* 🚨 Highlighted Team Header with Names */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 border-b border-indigo-100 flex flex-col">
                     <div className="flex justify-between items-center">
                       <h2 className="text-lg font-black text-white drop-shadow-sm">{team.team_name}</h2>
                       <span className="bg-black/20 text-white px-3 py-1 rounded-full text-[10px] font-bold border border-white/20 shadow-sm backdrop-blur-sm">
                          <Users size={12} className="inline mr-1"/> {team.member_ids?.length || 0} Members
                       </span>
                     </div>
                     
                     <div className="flex flex-wrap gap-2 mt-4">
                       {team.member_ids?.map((mId: string) => {
                         const member = teamMembers[mId];
                         return (
                           <div key={mId} className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 shadow-sm">
                             <Avatar profile={member} sizeClass="w-6 h-6" />
                             <span className="text-[10px] font-bold text-white tracking-wide pr-1">{member?.full_name?.split(' ')[0] || 'Agent'}</span>
                           </div>
                         );
                       })}
                     </div>
                  </div>

                  {/* Team Tasks */}
                  <div className="p-5 bg-gray-50/50">
                    {teamTasks.length === 0 ? (
                       <p className="text-center text-sm font-bold text-gray-400 py-6">No active tasks for this team.</p>
                    ) : (
                      <div className="space-y-4">
                        {teamTasks.map(booking => (
                          <div key={booking.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{booking.service_type || 'General'}</span>
                                  {/* 🚨 Booking Ref Added */}
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">Ref: {booking.booking_ref || 'N/A'}</span>
                                </div>
                                <h3 className="font-black text-gray-900 text-lg mt-1 leading-tight">{booking.units?.companies?.name}</h3>
                                <p className="text-sm font-bold text-gray-500 mt-0.5 flex items-center gap-1"><Building2 size={14}/> Unit {booking.units?.unit_number}</p>
                              </div>
                              
                              {/* 🚨 Cleaning Time Added */}
                              <div className="bg-blue-50/80 text-blue-700 p-2.5 rounded-xl border border-blue-100 flex flex-col items-center shadow-sm">
                                <Clock size={16}/>
                                <span className="text-[10px] font-black mt-1 whitespace-nowrap">{formatTime(booking.cleaning_time)}</span>
                              </div>
                            </div>
                            
                            <ExtraDetails booking={booking} />

{booking.work_status === 'in_progress' && (
  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <p className="text-xs font-black text-amber-700">Shift started but not submitted</p>
    </div>
    <button
      onClick={async () => {
        const confirmed = window.confirm("Cancel this in-progress shift and reset to Active?");
        if (!confirmed) return;
        const { error } = await supabase
          .from('bookings')
          .update({ work_status: null })
          .eq('id', booking.id);
        if (!error) {
          // localStorage ও clear করো
          localStorage.removeItem(`asbn_duty_${booking.id}`);
          localStorage.removeItem(`asbn_eq_${booking.id}`);
          setBookings(prev =>
            prev.map(b => b.id === booking.id ? { ...b, work_status: null } : b)
          );
        } else {
          alert("Error: " + error.message);
        }
      }}
      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-colors shrink-0"
    >
      Cancel Shift
    </button>
  </div>
)}

{/* Start Duty বাটন — in_progress হলে Resume দেখাবে */}
<div className="mt-5">
  <button
    onClick={() => router.push(`/team/duty/${booking.id}`)}
    className={`w-full py-4 font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
      booking.work_status === 'in_progress'
        ? 'bg-amber-500 hover:bg-amber-600 text-white'
        : 'bg-gray-900 hover:bg-black text-white'
    }`}
  >
    {booking.work_status === 'in_progress'
      ? <><PlayCircle size={20}/> Resume Shift</>
      : <><PlayCircle size={20}/> Start Duty Now</>
    }
  </button>
</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* --- SECTION 2: UNASSIGNED ACTIVE TASKS --- */}
            {unassignedTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 pl-2">
                  <AlertCircle size={18} className="text-orange-500"/> Available to Assign ({unassignedTasks.length})
                </h3>
                <div className="space-y-4">
                  {unassignedTasks.map(booking => (
                    <div key={booking.id} className="bg-white rounded-3xl p-5 border border-orange-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-400"></div>
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">Unassigned</span>
                            {/* 🚨 Booking Ref Added */}
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">Ref: {booking.booking_ref || 'N/A'}</span>
                          </div>
                          <h3 className="font-black text-gray-900 text-lg mt-1 leading-tight">{booking.units?.companies?.name}</h3>
                          <p className="text-sm font-bold text-gray-500 mt-0.5 flex items-center gap-1"><Building2 size={14}/> Unit {booking.units?.unit_number}</p>
                        </div>

                        {/* 🚨 Cleaning Time Added */}
                        <div className="bg-orange-50/80 text-orange-700 p-2.5 rounded-xl border border-orange-100 flex flex-col items-center shadow-sm">
                          <Clock size={16}/>
                          <span className="text-[10px] font-black mt-1 whitespace-nowrap">{formatTime(booking.cleaning_time)}</span>
                        </div>
                      </div>

                      <ExtraDetails booking={booking} />

                      <button 
                        onClick={() => setSelectedBookingForAssign(booking)}
                        disabled={assigningId === booking.id}
                        className="w-full mt-4 py-4 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black rounded-2xl border border-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {assigningId === booking.id ? <Loader2 className="animate-spin" size={18}/> : <HandHeart size={18}/>}
                        {assigningId === booking.id ? "Assigning..." : "Accept Task"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- SECTION 3: COMPLETED TASKS --- */}
            {completedTasks.length > 0 && (
              <div className="opacity-70 mt-8">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 pl-2">
                  <CheckCircle2 size={18}/> Completed Today ({completedTasks.length})
                </h3>
                <div className="space-y-4">
                  {completedTasks.map(booking => (
                    <div key={booking.id} className="bg-gray-100 rounded-3xl p-5 border border-gray-200 flex items-center justify-between grayscale">
                      <div>
                        <h4 className="text-base font-black text-gray-700 line-through decoration-gray-400">{booking.units?.companies?.name}</h4>
                        <p className="text-xs font-bold text-gray-500">Unit {booking.units?.unit_number} • Ref: {booking.booking_ref}</p>
                      </div>
                      <div className="bg-green-100 text-green-700 p-2 rounded-full"><CheckCircle2 size={20}/></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- TEAM SELECTION MODAL --- */}
      <AnimatePresence>
        {selectedBookingForAssign && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="bg-gray-900 p-5 flex justify-between items-center text-white">
                 <h3 className="font-black text-lg">Select Team</h3>
                 <button onClick={() => setSelectedBookingForAssign(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="p-5 space-y-3">
                 <p className="text-sm font-bold text-gray-500 mb-4">Which team will execute the task for <span className="text-gray-900 font-black">Unit {selectedBookingForAssign.units?.unit_number}</span>?</p>
                 {teams.map(team => (
                   <button 
                     key={team.id} 
                     onClick={() => handleAssignToTeam(team.id)}
                     className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-2xl transition-all flex flex-col gap-3 text-left group"
                   >
                     <div className="flex justify-between items-center w-full">
                       <p className="font-black text-gray-900 group-hover:text-blue-700 transition-colors">{team.team_name}</p>
                       <ArrowRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors"/>
                     </div>
                     
                     {/* 🚨 Members Names & DP inside Modal */}
                     <div className="flex flex-wrap gap-2">
                       {team.member_ids?.map((mId: string) => {
                         const member = teamMembers[mId];
                         return (
                           <div key={mId} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm">
                             <Avatar profile={member} sizeClass="w-5 h-5" />
                             <span className="text-[10px] font-bold text-gray-600 pr-1">{member?.full_name?.split(' ')[0] || 'Agent'}</span>
                           </div>
                         );
                       })}
                     </div>
                   </button>
                 ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
