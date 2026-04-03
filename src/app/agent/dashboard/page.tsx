"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCircle, Calendar, Clock, CheckCircle2, 
  MapPin, Loader2, LogOut, Briefcase, Settings, 
  X, Camera, Save, Building2, ChevronRight, LayoutGrid, Key, Users,
  CalendarDays, History, User, Zap
} from "lucide-react";
import { format, parseISO, differenceInMinutes, isToday, startOfMonth, endOfMonth, addDays } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import { getAvatarUploadSignature } from "./actions";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  full_name: string;
  phone: string;
  username: string;
  avatar_url: string;
  role: string;
}

interface Team {
  id: number;
  team_name: string;
  member_ids: string[];
  shift_date: string;
  status: string;
}

interface Booking {
  id: number;
  assigned_team_id: number;
  cleaning_date: string;
  cleaning_time: string;
  status: string;
  service_type: string;
  booking_ref: string | null;
  units: {
    unit_number: string;
    building_name: string;
    layout?: string;
    door_code: string | null;
    companies: { name: string } | null;
  } | null;
}

interface WorkLog {
  id: number;
  booking_id: number;
  start_time: string;
  end_time: string | null;
  cost: number;
  bookings: Booking | null;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  // Data States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, any>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [metrics, setMetrics] = useState({ totalTasks: 0, totalHours: 0, totalShifts: 0 });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", phone: "", username: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ─── API: Fetch All Data ────────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) { router.push("/agent/login"); return; }

      const userId = session.user.id;
      const startOfCurrentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endOfCurrentMonth = format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Fetch Profile, Teams, and WorkLogs in parallel
      const [profileRes, teamsRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("teams")
          .select("*")
          .contains("member_ids", [userId])
          .gte("shift_date", startOfCurrentMonth)
          .lte("shift_date", endOfCurrentMonth),
        supabase.from("work_logs").select(`
          id, booking_id, start_time, end_time, cost,
          bookings (
            id, cleaning_date, cleaning_time, service_type, status, assigned_team_id, booking_ref,
            units ( unit_number, building_name, layout, door_code, companies (name) )
          )
        `).eq("submitted_by", userId).order("start_time", { ascending: false })
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setFormData({
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
          username: profileRes.data.username || ""
        });
        setAvatarPreview(profileRes.data.avatar_url || null);
      }

      if (teamsRes.data && teamsRes.data.length > 0) {
        const allTeams = teamsRes.data as Team[];
        setTeams(allTeams);

        const teamIds = allTeams.map(t => t.id);
        const allMemberIds = Array.from(new Set(allTeams.flatMap(t => t.member_ids)));

        // Fetch bookings for these teams & member profiles
        const [bookingsRes, membersRes] = await Promise.all([
          supabase.from("bookings").select(`
            id, assigned_team_id, cleaning_date, cleaning_time, status, service_type, booking_ref,
            units ( unit_number, building_name, layout, door_code, companies (name) )
          `)
            .in("assigned_team_id", teamIds)
            .gte("cleaning_date", startOfCurrentMonth)
            .lte("cleaning_date", endOfCurrentMonth)
            .order("cleaning_time", { ascending: true }),
          supabase.from("profiles").select("id, full_name, avatar_url, username").in("id", allMemberIds)
        ]);

        if (bookingsRes.data) setBookings(bookingsRes.data as unknown as Booking[]);

        if (membersRes.data) {
          const membersMap: Record<string, any> = {};
          membersRes.data.forEach(m => (membersMap[m.id] = m));
          setTeamMembersMap(membersMap);
        }
      }

      if (logsRes.data) {
        const parsedLogs = logsRes.data as unknown as WorkLog[];
        setWorkLogs(parsedLogs);

        let totalMins = 0;
        parsedLogs.forEach(log => {
          if (log.start_time && log.end_time)
            totalMins += differenceInMinutes(parseISO(log.end_time), parseISO(log.start_time));
        });

        setMetrics({
          totalTasks: parsedLogs.length,
          totalHours: Math.round(totalMins / 60),
          totalShifts: new Set(parsedLogs.map(l => l.bookings?.cleaning_date)).size,
        });
      }

      setLoading(false);
    };

    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Data Transformations ────────────────────────────────────────────────
  const { todayTeams, tomorrowTeams, pendingMonthTeams } = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const today: Team[] = [], tomorrow: Team[] = [], pendingMonth: Team[] = [];

    for (const team of teams) {
      if (team.shift_date === todayStr) today.push(team);
      else if (team.shift_date === tomorrowStr) tomorrow.push(team);
      else if (new Date(team.shift_date) > new Date(todayStr)) pendingMonth.push(team);
    }

    pendingMonth.sort((a, b) => new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime());
    return { todayTeams: today, tomorrowTeams: tomorrow, pendingMonthTeams: pendingMonth };
  }, [teams]);

  const getBookingsForTeam = (teamId: number) =>
    bookings.filter(b => b.assigned_team_id === teamId);

  // ─── Handlers ───────────────────────────────────────────────────────────
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
      let finalAvatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const { signature, timestamp, apiKey, cloudName } = await getAvatarUploadSignature();
        const uploadData = new FormData();
        uploadData.append("file", avatarFile);
        uploadData.append("api_key", apiKey!);
        uploadData.append("timestamp", timestamp.toString());
        uploadData.append("signature", signature);
        uploadData.append("folder", "avatars");

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: uploadData }
        );
        const cloudRes = await uploadRes.json();
        if (cloudRes.secure_url) finalAvatarUrl = cloudRes.secure_url;
      }

      const { error } = await supabase.from("profiles").update({
        full_name: formData.full_name,
        phone: formData.phone,
        username: formData.username,
        avatar_url: finalAvatarUrl,
      }).eq("id", profile!.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setProfile(prev => prev ? { ...prev, ...formData, avatar_url: finalAvatarUrl! } : null);
      setIsEditModalOpen(false);
      setAvatarFile(null);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/agent/login");
  };

  // ─── TeamCard Component ──────────────────────────────────────────────────
  const TeamCard = ({ team, isHighlight = false }: { team: Team; isHighlight?: boolean }) => {
    const teamBookings = getBookingsForTeam(team.id);

    return (
      <div className={`bg-white border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${
        isHighlight ? "border-indigo-100 shadow-indigo-50" : "border-indigo-50"
      }`}>
        {/* Team Header */}
        <div className="bg-indigo-50/50 p-4 border-b border-indigo-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-black text-indigo-900">Team {team.team_name}</h3>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  isHighlight
                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                }`}>
                  {isHighlight ? "Upcoming" : "Active Squad"}
                </span>
              </div>
              <p className="text-xs font-bold text-indigo-500 flex items-center gap-1.5">
                <CalendarDays size={12} /> {format(parseISO(team.shift_date), "dd MMM yyyy")} &bull; {teamBookings.length} Assigned Units
              </p>
            </div>
          </div>

          {/* Team Members */}
          <div className="flex flex-wrap items-center gap-2">
            {team.member_ids?.map((mId: string) => {
              const member = teamMembersMap[mId];
              if (!member) return null;
              const isMe = mId === profile?.id;
              return (
                <div
                  key={mId}
                  title={member.full_name}
                  className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border ${
                    isMe ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-indigo-100 shrink-0 flex items-center justify-center">
                    {member.avatar_url
                      ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <UserCircle size={16} className="text-indigo-300" />
                    }
                  </div>
                  <span className={`text-[10px] font-black ${isMe ? "text-indigo-700" : "text-gray-700"}`}>
                    {isMe ? "You" : (member.full_name?.split(" ")[0] || member.username)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bookings */}
        <div className="p-4 space-y-4 bg-gray-50/30">
          {teamBookings.length === 0 ? (
            <div className="text-center bg-white border border-dashed border-gray-200 rounded-xl py-6">
              <p className="text-gray-400 font-bold text-sm">No units assigned to this team yet.</p>
            </div>
          ) : (
            teamBookings.map((booking: Booking) => (
              <div
                key={booking.id}
                className="bg-white border border-gray-200 hover:border-indigo-200 rounded-2xl p-5 transition-colors group shadow-sm"
              >
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${
                      booking.status === "completed" || booking.status === "finalized"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : booking.status === "in_progress"
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : booking.status === "active"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>
                      {booking.status}
                    </span>
                    {booking.booking_ref && (
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                        {booking.booking_ref}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black text-gray-700 flex items-center gap-1.5">
                    <Clock size={14} className="text-indigo-500" /> {booking.cleaning_time}
                  </span>
                </div>

                <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400 shrink-0" />
                  {booking.units?.building_name || "Unknown"}
                </h3>
                <p className="text-sm text-gray-600 font-bold flex items-center gap-1.5 mb-4">
                  <MapPin size={14} className="text-gray-400" /> Unit {booking.units?.unit_number}
                </p>

                {/* Unit Details Box */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-0.5">
                      <LayoutGrid size={12} /> Layout
                    </p>
                    <p className="font-bold text-gray-800">{booking.units?.layout || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mb-0.5">
                      <Zap size={12} /> Service
                    </p>
                    <p className="font-bold text-gray-800">{booking.service_type || "N/A"}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-dashed border-gray-200 text-center shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1">
                      <Key size={10} /> Door Code
                    </p>
                    <p className="font-mono font-black text-gray-900 tracking-widest">
                      {booking.units?.door_code || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Start Task Button (today + active/in_progress only) */}
                {isToday(parseISO(booking.cleaning_date)) &&
                  (booking.status === "active" || booking.status === "in_progress") && (
                  <div className="mt-4">
                    <button
                      onClick={() => router.push(`/agent/work-logs/${booking.id}`)}
                      className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 group-hover:shadow-lg active:scale-95"
                    >
                      Start Task <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      <Toaster position="top-center" reverseOrder={false} />

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER — OLD PREMIUM DESIGN (gradient, blur circles, duty badge, date)
          + NEW FEATURES: History button, stats inside header
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 text-white pt-10 pb-28 px-4 md:px-8 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          {/* Avatar + Name */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-white/10 flex items-center justify-center shrink-0">
              {avatarPreview
                ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                : <UserCircle size={48} className="text-indigo-200" />
              }
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  todayTeams.length > 0
                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                    : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                }`}>
                  {todayTeams.length > 0 ? `On Duty · ${todayTeams.length} Team${todayTeams.length > 1 ? "s" : ""}` : "Off Duty"}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {profile?.full_name || profile?.username || "Agent"}
              </h1>
              <p className="text-indigo-200 text-sm font-medium flex items-center gap-1.5 mt-1">
                <Calendar size={14} /> {format(new Date(), "EEEE, dd MMM yyyy")}
              </p>
            </div>
          </div>

          {/* Action Buttons — Settings, History, Logout */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
              title="Work History"
            >
              <History size={16} /> History
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <Settings size={16} /> Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          METRICS CARDS — floating above content (-mt), old card style
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-14 relative z-20">
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3"><CheckCircle2 size={24} /></div>
            <h3 className="text-2xl font-black text-gray-900">{metrics.totalTasks}</h3>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Tasks Done</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mb-3"><Clock size={24} /></div>
            <h3 className="text-2xl font-black text-gray-900">{metrics.totalHours} <span className="text-sm">hrs</span></h3>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Logged Time</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl mb-3"><Briefcase size={24} /></div>
            <h3 className="text-2xl font-black text-gray-900">{metrics.totalShifts}</h3>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Shifts</p>
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-8 space-y-10">

        {/* 1. TODAY'S SCHEDULE */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <LayoutGrid className="text-indigo-600" /> Today's Schedule
          </h2>

          {todayTeams.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-300">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-gray-800">You are off-duty today</h3>
              <p className="text-sm text-gray-500 mt-1">Enjoy your rest or wait for supervisor assignment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {todayTeams.map(team => <TeamCard key={team.id} team={team} />)}
            </div>
          )}
        </div>

        {/* 2. TOMORROW'S SCHEDULE */}
        {tomorrowTeams.length > 0 && (
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <CalendarDays className="text-indigo-500" /> Tomorrow's Schedule
            </h2>
            <div className="space-y-6">
              {tomorrowTeams.map(team => <TeamCard key={team.id} team={team} isHighlight={true} />)}
            </div>
          </div>
        )}

        {/* 3. UPCOMING THIS MONTH */}
        {pendingMonthTeams.length > 0 && (
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="text-gray-500" /> Upcoming This Month
            </h2>
            <div className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
              {pendingMonthTeams.map(team => <TeamCard key={team.id} team={team} />)}
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HISTORY MODAL — bottom slide-up, work_logs বিস্তারিত
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full max-w-3xl bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-[80vh]"
            >
              <div className="p-6 md:p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><History size={20} /></div>
                  Past Work History
                </h2>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-4 bg-[#F4F7FA]">
                {workLogs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                    <History size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-bold text-gray-600">No work history found.</p>
                    <p className="text-sm text-gray-400 mt-1">Your completed tasks will appear here.</p>
                  </div>
                ) : (
                  workLogs.map(log => (
                    <div key={log.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                            <CalendarDays size={10} />
                            {log.bookings?.cleaning_date
                              ? format(parseISO(log.bookings.cleaning_date), "dd MMM yyyy")
                              : "N/A"}
                          </span>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {log.bookings?.service_type || "Cleaning Task"}
                          </span>
                        </div>
                        <h4 className="font-black text-gray-900 text-base mb-1">
                          {log.bookings?.units?.companies?.name || "Unknown"}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                          <MapPin size={12} /> Unit {log.bookings?.units?.unit_number} - {log.bookings?.units?.building_name}
                        </p>
                      </div>

                      <div className="flex flex-row md:flex-col justify-between items-end gap-2 md:gap-1 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-xl shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Duration</p>
                          <p className="text-sm font-black text-gray-800 flex items-center gap-1">
                            <Clock size={12} className="text-blue-500" />
                            {log.start_time && log.end_time
                              ? differenceInMinutes(parseISO(log.end_time), parseISO(log.start_time)) + " mins"
                              : "In Progress"}
                          </p>
                        </div>
                        {log.cost > 0 && (
                          <div className="text-right">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Cost Logged</p>
                            <p className="text-sm font-black text-emerald-700">AED {log.cost}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          PROFILE EDIT MODAL — Cloudinary avatar upload সহ
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-black text-gray-900">Edit Profile</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="relative w-24 h-24 group cursor-pointer">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-indigo-50 shadow-sm">
                      {avatarPreview
                        ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-400"><UserCircle size={40} /></div>
                      }
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
                    <input
                      type="text" required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Username</label>
                    <input
                      type="text" required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {savingProfile
                    ? <><Loader2 className="animate-spin" size={20} /> Saving...</>
                    : <><Save size={20} /> Save Changes</>
                  }
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}