"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Clock, Building2, CheckCircle2, 
  Loader2, X, Trash2, Edit2, ClipboardList, MapPin, Sparkles, Users, Zap, RotateCcw,
  Search, Hash, Filter
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
type Booking = {
  id: number;
  booking_ref: string | null;
  created_at: string; 
  unit_id: number;
  cleaning_date: string;
  cleaning_time: string;
  service_type: string;
  status: string;
  price: number;
  checklist_template_id: number | null;
  assigned_team_id: number | null;
  units: {
    unit_number: string;
    building_name: string;
    companies: { id: number, name: string }
  };
  teams?: { id: number, team_name: string };
  checklist_templates?: { title: string };
};

type Team = {
  id: number;
  team_name: string;
  shift_date: string;
};

export default function SupervisorBookings() {
  const supabase = createClient();

  // States for Static Data
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // States for Dynamic Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: null as number | null,
    company_id: "",
    unit_id: "",
    cleaning_date: "",
    cleaning_time: "",
    service_type: "Check-out Cleaning",
    price: "",
    checklist_template_id: "",
    team_id: "" 
  });

  // 1. API OPTIMIZATION: Fetch Static Data ONLY ONCE on mount
  useEffect(() => {
    const fetchStaticData = async () => {
      const [companiesRes, unitsRes, checklistsRes, teamsRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('units').select('id, company_id, unit_number, building_name'),
        supabase.from('checklist_templates').select('id, title'),
        supabase.from('teams').select('id, team_name, shift_date').eq('status', 'active') 
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
      if (checklistsRes.data) setChecklists(checklistsRes.data);
      if (teamsRes.data) setTeams(teamsRes.data as Team[]);
    };
    fetchStaticData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch Bookings based on Date Range
  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bookings').select(`
      id, booking_ref, created_at, unit_id, cleaning_date, cleaning_time, service_type, status, price, checklist_template_id, assigned_team_id,
      units ( unit_number, building_name, companies ( id, name ) ),
      teams:assigned_team_id ( team_name ),
      checklist_templates ( title )
    `)
    .gte('cleaning_date', dateFrom)
    .lte('cleaning_date', dateTo)
    .order('cleaning_date', { ascending: false })
    .order('cleaning_time', { ascending: true });

    if (data) setBookings(data as any);
    if (error) toast.error("Failed to load bookings");
    setLoading(false);
  };

  // Re-fetch bookings when date range changes
  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchBookings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Handle Input Change (Auto reset team if date changes)
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'cleaning_date') updated.team_id = ""; // Reset team
      return updated;
    });
  };

  const getTeamAssignmentAlert = (teamId: number, date: string, currentBookingId?: number | null) => {
    if (!date || !teamId) return "";
    const isBusy = bookings.some(b => 
      String(b.assigned_team_id) === String(teamId) && 
      b.cleaning_date === date && 
      (currentBookingId ? String(b.id) !== String(currentBookingId) : true) &&
      ['pending', 'active', 'in_progress'].includes(String(b.status).toLowerCase().trim())
    );
    return isBusy ? " (Has other assignments)" : "";
  };

  // Open Modal for New
  const openNewModal = () => {
    setFormData({
      id: null, company_id: "", unit_id: "", cleaning_date: "", cleaning_time: "",
      service_type: "Check-out Cleaning", price: "", checklist_template_id: "", team_id: ""
    });
    setEditMode(false);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (booking: Booking) => {
    setFormData({
      id: booking.id,
      company_id: booking.units.companies?.id.toString() || "",
      unit_id: booking.unit_id.toString(),
      cleaning_date: booking.cleaning_date,
      cleaning_time: booking.cleaning_time,
      service_type: booking.service_type,
      price: booking.price.toString(),
      checklist_template_id: booking.checklist_template_id?.toString() || "",
      team_id: booking.assigned_team_id?.toString() || "" 
    });
    setEditMode(true);
    setIsModalOpen(true);
  };

  // Save Booking
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      unit_id: parseInt(formData.unit_id),
      cleaning_date: formData.cleaning_date,
      cleaning_time: formData.cleaning_time,
      service_type: formData.service_type,
      price: formData.price ? parseFloat(formData.price) : 0,
      checklist_template_id: formData.checklist_template_id ? parseInt(formData.checklist_template_id) : null,
      assigned_team_id: formData.team_id ? parseInt(formData.team_id) : null 
    };

    if (editMode && formData.id) {
      const { error } = await supabase.from('bookings').update(payload).eq('id', formData.id);
      if (!error) { 
        toast.success("Updated successfully!");
        fetchBookings(); // Only fetch bookings
        setIsModalOpen(false); 
      } else toast.error("Error updating: " + error.message);
    } else {
      const { error } = await supabase.from('bookings').insert([payload]);
      if (!error) { 
        toast.success("Booking recorded!");
        fetchBookings(); // Only fetch bookings
        setIsModalOpen(false); 
      } else toast.error("Error creating: " + error.message);
    }
    setSaving(false);
  };

  // Delete Booking
  const handleDelete = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-gray-800 text-sm">Are you sure you want to delete this record?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-black">Cancel</button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('bookings').delete().eq('id', id);
              if (!error) { toast.success("Record deleted successfully!"); fetchBookings(); } 
              else toast.error("Error: " + error.message);
            }}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  // Toggle Activation Status (Optimistic UI)
  const handleToggleActivation = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'active' : 'pending';
    setActivatingId(id);

    // Optimistic Update
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);

    if (error) {
      toast.error("Failed to update status. Reverting...");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: currentStatus } : b));
    } else {
      toast.success(`Booking ${newStatus === 'active' ? 'Activated' : 'reverted to Pending'}!`, {
        icon: newStatus === 'active' ? '⚡' : '🔄', duration: 3000
      });
    }
    setActivatingId(null);
  };

  // CLIENT-SIDE FILTER LOGIC
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        b.booking_ref?.toLowerCase().includes(q) ||
        b.units?.companies?.name?.toLowerCase().includes(q) ||
        b.units?.unit_number?.toLowerCase().includes(q) ||
        b.units?.building_name?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  // GROUP BY DATE
  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    return groups;
  }, [filteredBookings]);

  const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Get available teams for the selected form date
  const availableTeamsForDate = useMemo(() => {
    if (!formData.cleaning_date) return [];
    return teams.filter(t => t.shift_date === formData.cleaning_date);
  }, [teams, formData.cleaning_date]);

  if (loading && companies.length === 0) return <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-[#F4F7FA] font-sans pb-24">
      <Toaster position="top-center" reverseOrder={false} />

      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-8 rounded-[2rem] shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><Calendar size={28} /></div>
            Booking Records
          </h1>
          <p className="text-blue-100 font-medium mt-2">Manage requests, assign squads, and activate shift operations.</p>
        </div>

        <button onClick={openNewModal} className="relative z-10 px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 hover:shadow-lg rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-sm">
          <Plus size={20} strokeWidth={3}/> Record New Booking
        </button>
      </div>

      {/* 🚨 ENHANCED FILTER BAR WITH DATE RANGE 🚨 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 mb-8">

        {/* Search */}
        <div className="flex-1 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Search by Ref, Company, Unit or Building..." 
             value={searchQuery} 
             onChange={(e) => setSearchQuery(e.target.value)} 
             className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 transition-all" 
           />
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 w-full lg:w-auto overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
            className="w-full py-3 px-2 bg-transparent outline-none font-bold text-gray-700 text-sm cursor-pointer" 
            title="Start Date"
          />
          <span className="text-gray-400 font-black px-1">-</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
            className="w-full py-3 px-2 bg-transparent outline-none font-bold text-gray-700 text-sm cursor-pointer" 
            title="End Date"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 w-full lg:w-auto focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <Filter size={16} className="text-gray-400 shrink-0"/>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="w-full md:w-40 py-3 bg-transparent outline-none font-bold text-gray-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active (Live)</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>
      </div>

      {/* BOOKINGS LIST */}
      <div className="space-y-10">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40}/></div>
        ) : sortedDates.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
            <ClipboardList size={56} className="mx-auto mb-4 opacity-30 text-blue-500"/>
            <p className="text-xl font-black text-gray-800 mb-1">No booking records found.</p>
            <p className="text-sm font-medium mt-1">Try adjusting your dates or filters.</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="space-y-5">

              {/* Date Header */}
              <div className="flex items-center gap-3 pl-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Calendar size={18} strokeWidth={2.5}/></div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">{format(parseISO(date), 'EEEE, dd MMM yyyy')}</h2>
                <div className="h-px bg-gray-200 flex-1 ml-4"></div>
              </div>

              {/* Date Bookings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {groupedBookings[date].map(booking => (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={booking.id} 
                    className={`bg-white p-6 rounded-[2rem] border transition-all group flex flex-col ${booking.status === 'active' ? 'border-blue-300 shadow-md bg-blue-50/10' : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200'}`}
                  >
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border flex items-center gap-1.5 ${
                        ['completed', 'finalized'].includes(booking.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        booking.status === 'in_progress' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        booking.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {booking.status === 'active' && <Zap size={10} className="fill-blue-600"/>}
                        {booking.status}
                      </span>

                      {/* Booking Ref Badge */}
                      {booking.booking_ref && (
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 flex items-center gap-1 shrink-0">
                          <Hash size={11} className="shrink-0"/> {booking.booking_ref}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                        Added {format(parseISO(booking.created_at), "dd MMM, hh:mm a")}
                      </span>
                      <span className="text-[10px] font-black text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 flex items-center gap-1.5 ml-auto">
                        <Clock size={12} className="text-blue-500"/> {booking.cleaning_time}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mb-1 truncate">{booking.units?.companies?.name || "Unknown Company"}</h3>
                    <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 mb-4"><MapPin size={14}/> Unit {booking.units?.unit_number} - {booking.units?.building_name}</p>

                    <div className="space-y-2 mb-6 flex-1">
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-2"><Sparkles size={14} className="text-orange-400"/> {booking.service_type}</p>
                      {booking.checklist_templates?.title && (
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-2"><ClipboardList size={14} className="text-teal-500"/> {booking.checklist_templates.title}</p>
                      )}
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400"/> Team: <span className="font-bold text-gray-900">{booking.teams?.team_name || "Unassigned"}</span></p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-gray-50">

                      {/* Activate Button */}
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleToggleActivation(booking.id, 'pending')}
                          disabled={activatingId === booking.id}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 shadow-md shadow-blue-500/20 mb-1"
                        >
                          {activatingId === booking.id ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16} className="fill-white"/>}
                          Activate Booking
                        </button>
                      )}

                      {/* Undo Button */}
                      {booking.status === 'active' && (
                        <button
                          onClick={() => handleToggleActivation(booking.id, 'active')}
                          disabled={activatingId === booking.id}
                          className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 mb-1"
                        >
                          {activatingId === booking.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                          Activated <span className="text-blue-500 font-medium ml-1 flex items-center gap-1 text-[10px] uppercase tracking-widest"><RotateCcw size={12}/> Undo</span>
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(booking)} className="flex-1 py-2.5 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 border border-gray-100">
                          <Edit2 size={14}/> Edit
                        </button>
                        <button onClick={() => handleDelete(booking.id)} className="flex-1 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 border border-red-100 hover:border-red-600">
                          <Trash2 size={14}/> Delete
                        </button>
                      </div>
                    </div>

                  </motion.div>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

      {/* --- FORM MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"/>

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              <div className="p-6 md:p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ClipboardList size={20}/></div>
                  {editMode ? "Edit Booking Record" : "New Booking Record"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-full transition-colors shadow-sm"><X size={20}/></button>
              </div>

              <form onSubmit={handleSave} className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Client / Company</label>
                    <select required name="company_id" value={formData.company_id} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 transition-all">
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Unit Details</label>
                    <select required name="unit_id" value={formData.unit_id} onChange={handleChange} disabled={!formData.company_id} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 transition-all disabled:opacity-50">
                      <option value="">Select Unit</option>
                      {units.filter(u => u.company_id.toString() === formData.company_id).map(u => (
                        <option key={u.id} value={u.id}>Unit {u.unit_number} - {u.building_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Cleaning Date</label>
                    <input required type="date" name="cleaning_date" value={formData.cleaning_date} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900" />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Scheduled Time</label>
                    <input required type="time" name="cleaning_time" value={formData.cleaning_time} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900" />
                  </div>

                  {/* Service Type */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Service Type</label>
                    <select required name="service_type" value={formData.service_type} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900">
                      <option value="Check-out Cleaning">Check-out Cleaning</option>
                      <option value="Deep Cleaning">Deep Cleaning</option>
                      <option value="Touch-up Cleaning">Touch-up Cleaning</option>
                      <option value="In-stay Cleaning">In-stay Cleaning</option>
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Estimated Price (AED)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Optional" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900" />
                  </div>
                </div>

                {/* 🚨 Team Assignment (DYNAMIC BY DATE) */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Users size={14}/> Assign Team</label>
                  {formData.cleaning_date ? (
                    availableTeamsForDate.length > 0 ? (
                      <select name="team_id" value={formData.team_id} onChange={handleChange} className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-900 transition-all cursor-pointer">
                        <option value="">Unassigned (Pending)</option>
                        {availableTeamsForDate.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.team_name}{getTeamAssignmentAlert(t.id, formData.cleaning_date, formData.id)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-600 flex items-center gap-2">
                        No active teams found for {format(parseISO(formData.cleaning_date), 'dd MMM yyyy')}.
                      </div>
                    )
                  ) : (
                    <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-400">
                      Please select a Cleaning Date first to view available teams.
                    </div>
                  )}
                </div>

                {/* Checklist Template */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Assign Checklist Template</label>
                  <select name="checklist_template_id" value={formData.checklist_template_id} onChange={handleChange} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900">
                    <option value="">No Template Required</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="pt-6">
                  <button type="submit" disabled={saving} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70">
                    {saving ? <><Loader2 className="animate-spin" size={20}/> Saving Record...</> : <><CheckCircle2 size={20}/> {editMode ? "Update Booking Record" : "Save Booking Record"}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}