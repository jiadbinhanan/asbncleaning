"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCircle, Calendar, Clock, CheckCircle2, 
  MapPin, Loader2, LogOut, Briefcase, Settings, 
  X, Camera, Save, Building2, ChevronRight, LayoutGrid, Key
} from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
// Note: You must create this action file similar to supervisor profile
import { getAvatarUploadSignature } from "./actions"; 

export default function AgentDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [profile, setProfile] = useState<any>(null);
  const [todayTeam, setTodayTeam] = useState<any>(null);
  const [pastTeams, setPastTeams] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalTasks: 0, totalHours: 0, totalShifts: 0 });

  // Profile Edit States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", phone: "", username: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // 1. ULTIMATE OPTIMIZED FETCH (1 API Call for Everything)
  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/agent/login');

    const todayStr = new Date().toISOString().split('T')[0];

    const [profileRes, teamsRes] = await Promise.all([
      // Fetch Profile
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      
      // Fetch all teams this agent is part of + Bookings + Work Logs
      supabase.from('teams')
        .select(`
          id, team_name, status, shift_date,
          bookings ( id, cleaning_date, cleaning_time, service_type, status, units ( unit_number, building_name, layout, door_code, companies(name) ) ),
          work_logs ( start_time, end_time )
        `)
        .contains('member_ids', [user.id])
        .order('shift_date', { ascending: false })
        .limit(30)
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setFormData({ 
        full_name: profileRes.data.full_name || "", 
        phone: profileRes.data.phone || "",
        username: profileRes.data.username || ""
      });
      setAvatarPreview(profileRes.data.avatar_url);
    }

    if (teamsRes.data) {
      let currentTeam = null;
      const history: any[] = [];
      let tasksCount = 0;
      let minutesCount = 0;

      teamsRes.data.forEach(team => {
        // Calculate Metrics
        const completedBookings = team.bookings?.filter(b => ['completed', 'finalized'].includes(b.status)).length || 0;
        tasksCount += completedBookings;

        team.work_logs?.forEach(log => {
          if (log.start_time && log.end_time) {
            minutesCount += differenceInMinutes(parseISO(log.end_time), parseISO(log.start_time));
          }
        });

        // Separate Today's Team from History
        if (team.shift_date === todayStr || team.status === 'active') {
          currentTeam = team;
        } else {
          history.push(team);
        }
      });

      setTodayTeam(currentTeam);
      setPastTeams(history);
      setMetrics({
        totalTasks: tasksCount,
        totalHours: Math.round(minutesCount / 60),
        totalShifts: teamsRes.data.length
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, [supabase]);

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/agent/login');
  };

  // Profile Edit Handlers
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      let finalAvatarUrl = profile.avatar_url;

      if (avatarFile) {
        const { signature, timestamp, apiKey, cloudName } = await getAvatarUploadSignature();
        const uploadData = new FormData();
        uploadData.append("file", avatarFile);
        uploadData.append("api_key", apiKey!);
        uploadData.append("timestamp", timestamp.toString());
        uploadData.append("signature", signature);
        uploadData.append("folder", "avatars");

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: uploadData });
        const cloudRes = await uploadRes.json();
        if (cloudRes.secure_url) finalAvatarUrl = cloudRes.secure_url;
      }

      const { error } = await supabase.from('profiles').update({
        full_name: formData.full_name,
        phone: formData.phone,
        username: formData.username,
        avatar_url: finalAvatarUrl
      }).eq('id', profile.id);

      if (error) throw error;
      
      alert("Profile updated successfully!");
      setProfile({ ...profile, ...formData, avatar_url: finalAvatarUrl });
      setIsEditModalOpen(false);
      setAvatarFile(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      
      {/* 1. PREMIUM HEADER & PROFILE */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 text-white pt-10 pb-24 px-4 md:px-8 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-white/10 flex items-center justify-center shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <UserCircle size={48} className="text-indigo-200" />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${todayTeam ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                  {todayTeam ? `On Duty: Team ${todayTeam.team_name}` : 'Off Duty'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{profile?.full_name || "Agent"}</h1>
              <p className="text-indigo-200 text-sm font-medium flex items-center gap-1.5 mt-1">
                <Calendar size={14}/> {format(new Date(), 'EEEE, dd MMM yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <button onClick={() => setIsEditModalOpen(true)} className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 backdrop-blur-sm">
                <Settings size={16}/> Settings
             </button>
             <button onClick={handleLogout} className="px-4 py-2.5 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 backdrop-blur-sm">
                <LogOut size={16}/> Logout
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 space-y-8 relative z-20">

        {/* 2. PERFORMANCE METRICS */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3"><CheckCircle2 size={24}/></div>
            <h3 className="text-2xl font-black text-gray-900">{metrics.totalTasks}</h3>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Tasks Done</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mb-3"><Clock size={24}/></div>
            <h3 className="text-2xl font-black text-gray-900">{metrics.totalHours} <span className="text-sm">hrs</span></h3>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Logged Time</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl mb-3"><Briefcase size={24}/></div>
            <h3 className="text-2xl font-black text-gray-900">{metrics.totalShifts}</h3>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Shifts</p>
          </motion.div>
        </div>

        {/* 3. TODAY'S SCHEDULE */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="text-indigo-600"/> Today's Schedule
          </h2>
          
          {todayTeam ? (
            <div className="space-y-4">
              {todayTeam.bookings?.map((booking: any) => (
                <div key={booking.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : booking.status === 'active' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-200 text-gray-600 border-gray-300'}`}>
                      {booking.status}
                    </span>
                    <span className="text-sm font-black text-gray-700 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500"/> {booking.cleaning_time}</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-1">{booking.units?.companies?.name}</h3>
                  <p className="text-sm text-gray-600 font-bold flex items-center gap-1.5 mb-4"><MapPin size={16} className="text-gray-400"/> Unit {booking.units?.unit_number} • {booking.service_type}</p>
                  
                  {/* Unit Details Box */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-0.5"><Building2 size={12}/> Building</p>
                      <p className="font-bold text-gray-800">{booking.units?.building_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-0.5"><LayoutGrid size={12}/> Layout</p>
                      <p className="font-bold text-gray-800">{booking.units?.layout || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200 text-center">
                      <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1"><Key size={10}/> Door Code</p>
                      <p className="font-mono font-black text-gray-900 tracking-widest">{booking.units?.door_code || 'N/A'}</p>
                    </div>
                  </div>

                </div>
              ))}
              {(!todayTeam.bookings || todayTeam.bookings.length === 0) && (
                <p className="text-center text-gray-500 font-medium py-4">You are assigned to Team {todayTeam.team_name}, but no units are assigned yet.</p>
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
               <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-300"><CheckCircle2 size={32}/></div>
               <h3 className="text-lg font-black text-gray-800">You are off-duty today</h3>
               <p className="text-sm text-gray-500 mt-1">Enjoy your rest or wait for supervisor assignment.</p>
            </div>
          )}
        </div>

        {/* 4. RECENT WORK HISTORY */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
               <Clock className="text-indigo-600"/> Shift History
             </h2>
          </div>

          {pastTeams.length === 0 ? (
            <p className="text-center text-gray-400 font-medium py-6">No past history found.</p>
          ) : (
            <div className="space-y-4">
              {pastTeams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 text-gray-500 rounded-xl"><Briefcase size={20}/></div>
                    <div>
                      <p className="font-bold text-gray-900">Team {team.team_name}</p>
                      <p className="text-xs text-gray-500 font-medium">{format(parseISO(team.shift_date), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-700">{team.bookings?.length || 0} Tasks</p>
                    <span className="text-[10px] font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* --- PROFILE EDIT MODAL --- */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-black text-gray-900">Edit Profile</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
                
                {/* Avatar Change */}
                <div className="flex justify-center">
                  <div className="relative w-24 h-24 group cursor-pointer">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-indigo-50 shadow-sm">
                      {avatarPreview ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-400"><UserCircle size={40}/></div>}
                    </div>
                    <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={20} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input type="text" name="full_name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Username</label>
                    <input type="text" name="username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900" />
                  </div>
                </div>

                <button type="submit" disabled={savingProfile} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingProfile ? <><Loader2 className="animate-spin" size={20}/> Saving...</> : <><Save size={20}/> Save Changes</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
