'use client';
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Clock, Home, Users, CheckCircle2, AlertCircle, 
  Loader2, X, MoreVertical, Trash2, Edit2, Filter, FilterX, ClipboardList 
} from "lucide-react";
import { format, parseISO } from "date-fns";
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
  assigned_team_id: number | null;
  checklist_template_id: number | null;
  units: {
    id: number;           // 🚨 NEW
    company_id: number;   // 🚨 NEW
    unit_number: string;
    building_name: string;
    companies: { id: number, name: string } // 🚨 NEW
  };
  teams?: { team_name: string };
  checklist_templates?: { title: string };
};


export default function BookingManagement() {
  const supabase = createClient();
  
  // States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form States (Add Booking)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCustomService, setIsCustomService] = useState(false);

  const [formData, setFormData] = useState({
    company_id: "",
    unit_id: "",
    cleaning_date: format(new Date(), "yyyy-MM-dd"),
    cleaning_time: "09:00",
    service_type: "Check-out Cleaning",
    assigned_team_id: "",
    checklist_template_id: "",
    price: ""
  });

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditCustomService, setIsEditCustomService] = useState(false); // 🚨 NEW
  const [editData, setEditData] = useState<{
    id: number,
    company_id: string,
    unit_id: string,
    cleaning_date: string,
    cleaning_time: string,
    service_type: string,
    price: string,
    assigned_team_id: string,
    checklist_template_id: string
  } | null>(null);

  // 🚨 NEW: Load Units when Edit Company is selected
  useEffect(() => {
    if (isEditOpen && editData?.company_id) {
      const fetchUnits = async () => {
        const { data } = await supabase.from("units").select("*").eq("company_id", editData.company_id);
        if (data) setUnits(data);
      };
      fetchUnits();
    }
  }, [editData?.company_id, isEditOpen, supabase]);


  const fetchInitialData = async () => {
    const { data: compData } = await supabase.from("companies").select("*");
    const { data: teamData } = await supabase.from("teams").select("*").eq("status", "active");
    const { data: listData } = await supabase.from("checklist_templates").select("id, title");
    
    if (compData) setCompanies(compData);
    if (teamData) setActiveTeams(teamData);
    if (listData) setChecklists(listData);
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_ref, created_at, unit_id, cleaning_date, cleaning_time, service_type, status, price, assigned_team_id, checklist_template_id,
        units ( 
          id,
          company_id,
          unit_number,
          building_name,
          companies ( id, name )
        ),
        teams:assigned_team_id ( team_name ),
        checklist_templates ( title )
      `)
      .order("cleaning_date", { ascending: false });
    if (data) setBookings(data as any);
    setLoading(false);
  };

  // 🚨 NEW: Function to check if a team is already assigned on a specific date
  const getTeamAssignmentAlert = (teamId: number, date: string, currentBookingId?: number) => {
    const isBusy = bookings.some(b => 
      b.assigned_team_id === teamId && 
      b.cleaning_date === date && 
      b.id !== currentBookingId &&
      ['pending', 'active', 'in_progress'].includes(b.status)
    );
    return isBusy ? " (Assigned with another booking)" : "";
  };


  // 1. Initial Data Fetch
  useEffect(() => {
    fetchBookings();
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if(activeMenuId !== null) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  // 2. Load Units when Company is selected
  useEffect(() => {
    if (formData.company_id) {
      const fetchUnits = async () => {
        const { data } = await supabase
          .from("units")
          .select("*")
          .eq("company_id", formData.company_id);
        if (data) setUnits(data);
      };
      fetchUnits();
    }
  }, [formData.company_id, supabase]);

    // 3. Add Booking (ID generation is now handled by Supabase trigger)
    const handleAddBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('bookings').insert([{
            unit_id: formData.unit_id,
            cleaning_date: formData.cleaning_date,
            cleaning_time: formData.cleaning_time,
            service_type: formData.service_type,
            assigned_team_id: formData.assigned_team_id || null,
            checklist_template_id: formData.checklist_template_id || null,
            price: formData.price ? parseFloat(formData.price) : 0,
            status: 'pending'
        }]);

        if (!error) {
            toast.success("Booking recorded!");
            fetchBookings();
            setIsAddOpen(false);
            setFormData({ ...formData, unit_id: "", assigned_team_id: "", price: "", checklist_template_id: "" });
        } else {
            toast.error("Error creating: " + error.message);
        }
    };

    // 4. Update Booking
    const handleUpdateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editData) return;

        const { error } = await supabase.from('bookings').update({
            unit_id: parseInt(editData.unit_id),
            cleaning_date: editData.cleaning_date,
            cleaning_time: editData.cleaning_time,
            service_type: editData.service_type,
            price: parseFloat(editData.price) || 0,
            assigned_team_id: editData.assigned_team_id ? parseInt(editData.assigned_team_id) : null,
            checklist_template_id: editData.checklist_template_id ? parseInt(editData.checklist_template_id) : null
        }).eq('id', editData.id);

        if (!error) {
            toast.success("Updated successfully!");
            fetchBookings();
            setIsEditOpen(false);
        } else {
            toast.error("Error updating: " + error.message);
        }
    };


  // 5. Delete Booking
  // নতুন:
const handleDeleteBooking = (id: number) => {
  toast((t) => (
    <div className="flex flex-col gap-3">
      <p className="font-bold text-gray-800 text-sm">Are you sure you want to delete this record?</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-black"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            toast.dismiss(t.id);
            const { error } = await supabase.from("bookings").delete().eq("id", id);
            if (!error) {
              setBookings(prev => prev.filter(b => b.id !== id));
              toast.success("Deleted!", { duration: 3000 });
            } else {
              toast.error("Error: " + error.message, { duration: 3000 });
            }
          }}
          className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black"
        >
          Delete
        </button>
      </div>
    </div>
  ), { duration: 8000 });
};

  // 6. Filters & Grouping Logic
  const filteredBookings = bookings.filter(b => {
    let match = true;
    if (filterDate && b.cleaning_date !== filterDate) match = false;
    if (filterCompany && b.units?.companies?.name !== filterCompany) match = false;
    if (filterStatus && b.status !== filterStatus) match = false;
    return match;
  });

  const clearFilters = () => {
    setFilterDate("");
    setFilterCompany("");
    setFilterStatus("");
  };

  // 🚨 Group by Date
  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    // 🚨 এরপর প্রতিটি গ্রুপের ভেতরের বুকিংগুলোকে created_at অনুযায়ী সর্ট করা হচ্ছে (নতুনটা উপরে)
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    return groups;
  }, [filteredBookings]);

  // Sort dates descending (Newest first)
  const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="min-h-screen pb-10">
      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 4000 }} />
      {/* Header (Original Design Preserved) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" /> Bookings & Schedule
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">B T M Cleaning And Technical Services CO.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl font-bold transition-all flex items-center gap-2 ${showFilters ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Filter size={20} /> <span className="hidden md:block">Filter</span>
          </button>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg">
            <Plus size={20} /> New Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                <input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Company</label>
                <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</label>
                <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active (In Progress)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <button onClick={clearFilters} className="w-full py-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg font-bold flex justify-center items-center gap-2 transition-all">
                  <FilterX size={18} /> Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookings List (Grouped by Date) */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
          <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-500 font-bold">No bookings found</h3>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => {
            // Sort by time within the date group
            const dayBookings = groupedBookings[date].sort((a, b) => a.cleaning_time.localeCompare(b.cleaning_time));
            
            return (
              <div key={date} className="space-y-4">
                {/* Date Header using original styling format */}
                <div className="flex items-center gap-3 pl-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={18} /></div>
                  <h2 className="text-lg font-bold text-gray-800">{format(parseISO(date), 'EEEE, dd MMM yyyy')}</h2>
                  <div className="h-px bg-gray-200 flex-1 ml-4"></div>
                </div>

                {dayBookings.map((booking) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow relative"
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${booking.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Home size={24} />
                      </div>
                      <div className="overflow-hidden">
                        {/* 🌟 Recently Added Time (Created At) */}
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            Added: {format(parseISO(booking.created_at), 'hh:mm a')}
                          </span>
                        </div>
                        {/* Booking Ref Badge */}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-bold text-[10px] rounded mb-1 inline-block uppercase tracking-wider">
                          {booking.booking_ref || `ID-${booking.id}`}
                        </span>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight truncate">Unit {booking.units?.unit_number}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{booking.units?.companies?.name} • {booking.units?.building_name}</p>
                      </div>
                    </div>

                    {/* 🚨 FINAL FIX: RIGHT SIDE (Perfectly aligned & responsive) */}
                    <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-4 mt-4 md:mt-0 shrink-0">
                      
                      {/* 1. Time */}
                      <div className="md:w-[80px] shrink-0">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Time</p>
                        <p className="text-xs font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                          <Clock size={12} className="text-blue-500 shrink-0" /> <span className="truncate">{booking.cleaning_time}</span>
                        </p>
                      </div>

                      {/* 2. Service & Checklist */}
                      <div className="md:w-[130px] shrink-0 overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Service</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking.service_type}</p>
                        {booking.checklist_templates ? (
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <ClipboardList size={10} className="shrink-0" /> <span className="truncate">{booking.checklist_templates.title}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-orange-500 italic mt-0.5">No checklist</p>
                        )}
                      </div>

                      {/* 3. Assigned Team */}
                      <div className="md:w-[130px] shrink-0 overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Team</p>
                        {booking.teams ? (
                          <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1 text-gray-800 truncate">
                            <Users size={14} className="shrink-0" /> <span className="truncate">{booking.teams.team_name}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-orange-500 font-bold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md w-fit truncate">
                            <AlertCircle size={14} className="shrink-0" /> Unassigned
                          </span>
                        )}
                      </div>

                      {/* 4. Price & Status Column */}
                      <div className="md:w-[90px] shrink-0 flex flex-col items-start md:items-end gap-2 col-span-2 md:col-span-1">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : booking.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {booking.status}
                        </span>
                        
                        {booking.price > 0 ? (
                          <p className="text-xs text-green-600 font-black tracking-wide truncate">AED {booking.price}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400 font-bold italic flex items-center gap-1 truncate">
                            <AlertCircle size={10} className="shrink-0" /> No Price
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 3 Dot Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === booking.id ? null : booking.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeMenuId === booking.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white border border-gray-100 shadow-xl rounded-xl z-20 overflow-hidden">
                          <button 
                            onClick={() => {
                              const isCustom = !["Check-out Cleaning", "Deep Cleaning", "General Cleaning", "Sofa Bed setup"].includes(booking.service_type);
                              setIsEditCustomService(isCustom);
                              setEditData({ 
                                id: booking.id, 
                                company_id: booking.units?.company_id?.toString() || "",
                                unit_id: booking.unit_id?.toString() || "",
                                cleaning_date: booking.cleaning_date || "",
                                cleaning_time: booking.cleaning_time || "",
                                service_type: booking.service_type || "",
                                price: booking.price?.toString() || "",
                                assigned_team_id: booking.assigned_team_id?.toString() || "",
                                checklist_template_id: booking.checklist_template_id?.toString() || "" 
                              });
                              setIsEditOpen(true);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium border-b border-gray-100">
                            <Edit2 size={16} /> Edit Details
                          </button>

                          <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium">
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD BOOKING MODAL (Original form preserved) --- */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">New Cleaning Request</h2>
                <button onClick={() => setIsAddOpen(false)}><X className="text-gray-500" /></button>
              </div>

              <form onSubmit={handleAddBooking} className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client / Company</label>
                    <select required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" onChange={(e) => setFormData({...formData, company_id: e.target.value})}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Number</label>
                    <select required disabled={!formData.company_id} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 font-medium" onChange={(e) => setFormData({...formData, unit_id: e.target.value})}>
                      <option value="">Select Unit</option>
                      {units.filter(u => u.company_id.toString() === formData.company_id).map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.building_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                    <input type="date" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={formData.cleaning_date} onChange={(e) => setFormData({...formData, cleaning_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time</label>
                    <input type="time" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={formData.cleaning_time} onChange={(e) => setFormData({...formData, cleaning_time: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service Type</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={isCustomService ? "Other" : formData.service_type} onChange={(e) => {
                      if (e.target.value === "Other") { setIsCustomService(true); setFormData({...formData, service_type: ""}); } 
                      else { setIsCustomService(false); setFormData({...formData, service_type: e.target.value}); }
                    }}>
                    <option value="Check-out Cleaning">Check-out Cleaning</option>
                    <option value="Deep Cleaning">Deep Cleaning</option>
                    <option value="General Cleaning">General Cleaning</option>
                    <option value="Sofa Bed setup">Sofa Bed setup</option>
                    <option value="Other">Other (Please specify)</option>
                  </select>
                  {isCustomService && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <input type="text" required={isCustomService} placeholder="Enter service name..." className="w-full p-3.5 bg-white border border-blue-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})} />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assign Checklist</label>
                  <select 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                    onChange={(e) => setFormData({...formData, checklist_template_id: e.target.value})}>
                    <option value="">Select a Checklist (Optional)</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (AED) - Optional</label>
                    <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Assign Team (Later)</label>
                    <select 
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" 
                      onChange={(e) => setFormData({...formData, assigned_team_id: e.target.value})}
                      value={formData.assigned_team_id}
                    >
                      <option value="">Unassigned</option>
                      {activeTeams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.team_name}{getTeamAssignmentAlert(t.id, formData.cleaning_date)}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl mt-4 shadow-xl hover:bg-black transition-all">Confirm Booking</button>
              </form>
            </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* --- EDIT BOOKING MODAL (Full Details Edit) --- */}
      <AnimatePresence>
        {isEditOpen && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Update Booking Details</h2>
                <button onClick={() => setIsEditOpen(false)}><X className="text-gray-500" /></button>
              </div>

              <form onSubmit={handleUpdateBooking} className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client / Company</label>
                    <select required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.company_id} onChange={(e) => setEditData({...editData, company_id: e.target.value, unit_id: ""})}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Number</label>
                    <select required disabled={!editData.company_id} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 font-medium" value={editData.unit_id} onChange={(e) => setEditData({...editData, unit_id: e.target.value})}>
                      <option value="">Select Unit</option>
                      {units.filter(u => u.company_id.toString() === editData.company_id).map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.building_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                    <input type="date" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.cleaning_date} onChange={(e) => setEditData({...editData, cleaning_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time</label>
                    <input type="time" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.cleaning_time} onChange={(e) => setEditData({...editData, cleaning_time: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service Type</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={isEditCustomService ? "Other" : editData.service_type} onChange={(e) => {
                      if (e.target.value === "Other") { setIsEditCustomService(true); setEditData({...editData, service_type: ""}); } 
                      else { setIsEditCustomService(false); setEditData({...editData, service_type: e.target.value}); }
                    }}>
                    <option value="Check-out Cleaning">Check-out Cleaning</option>
                    <option value="Deep Cleaning">Deep Cleaning</option>
                    <option value="General Cleaning">General Cleaning</option>
                    <option value="Sofa Bed setup">Sofa Bed setup</option>
                    <option value="Other">Other (Please specify)</option>
                  </select>
                  {isEditCustomService && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <input type="text" required={isEditCustomService} placeholder="Enter service name..." className="w-full p-3.5 bg-white border border-blue-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.service_type} onChange={(e) => setEditData({...editData, service_type: e.target.value})} />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assign Checklist</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.checklist_template_id} onChange={(e) => setEditData({...editData, checklist_template_id: e.target.value})}>
                    <option value="">Select a Checklist (Optional)</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (AED)</label>
                    <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.price} onChange={(e) => setEditData({...editData, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Assign / Change Team</label>
                    <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.assigned_team_id} onChange={(e) => setEditData({...editData, assigned_team_id: e.target.value})}>
                      <option value="">Unassigned</option>
                      {activeTeams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.team_name}{getTeamAssignmentAlert(t.id, editData.cleaning_date, editData.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl mt-4 shadow-xl hover:bg-blue-700 transition-all">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
