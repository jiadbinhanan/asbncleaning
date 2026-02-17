"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Clock, Home, Users, CheckCircle2, AlertCircle, 
  Loader2, X, MoreVertical, Trash2, Edit2, Filter, FilterX, ClipboardList 
} from "lucide-react";
import { format } from "date-fns";

// --- Types ---
type Booking = {
  id: number;
  unit_id: number;
  cleaning_date: string;
  cleaning_time: string;
  service_type: string;
  status: string;
  price: number;
  assigned_team_id: number | null;
  checklist_template_id: number | null; // Added
  units: {
    unit_number: string;
    building_name: string;
    companies: { name: string }
  };
  teams?: { team_name: string };
  checklist_templates?: { title: string }; // Added to show template name
};

export default function BookingManagement() {
  const supabase = createClient();
  
  // States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]); // New State
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
    checklist_template_id: "", // New Field
    price: ""
  });

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<{id: number, price: string, assigned_team_id: string, checklist_template_id: string} | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchBookings();
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if(activeMenuId !== null) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const fetchInitialData = async () => {
    const { data: compData } = await supabase.from("companies").select("*");
    const { data: teamData } = await supabase.from("teams").select("*").eq("status", "active");
    const { data: listData } = await supabase.from("checklist_templates").select("id, title"); // Fetch Checklists
    
    if (compData) setCompanies(compData);
    if (teamData) setActiveTeams(teamData);
    if (listData) setChecklists(listData);
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        units ( 
          unit_number,
          building_name,
          companies ( name )
        ),
        teams:assigned_team_id ( team_name ),
        checklist_templates ( title )
      `)
      .order("cleaning_date", { ascending: false });

    if (data) setBookings(data as any);
    setLoading(false);
  };

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
  }, [formData.company_id]);

  // 3. Add Booking
  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("bookings").insert([{
      unit_id: formData.unit_id,
      cleaning_date: formData.cleaning_date,
      cleaning_time: formData.cleaning_time,
      service_type: formData.service_type,
      assigned_team_id: formData.assigned_team_id || null,
      checklist_template_id: formData.checklist_template_id || null, // Insert Checklist ID
      price: formData.price ? parseFloat(formData.price) : 0,
      status: 'pending'
    }]).select();

    if (!error) {
      setIsAddOpen(false);
      fetchBookings();
      setFormData({...formData, unit_id: "", assigned_team_id: "", price: "", checklist_template_id: ""}); 
    } else {
      alert("Error: " + error.message);
    }
  };

  // 4. Update Booking
  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;

    const prevBookings = [...bookings];
    
    // Update logic for UI
    setBookings(bookings.map(b => b.id === editData.id ? { 
      ...b, 
      price: parseFloat(editData.price) || 0, 
      assigned_team_id: editData.assigned_team_id ? parseInt(editData.assigned_team_id) : null,
      checklist_template_id: editData.checklist_template_id ? parseInt(editData.checklist_template_id) : null
    } : b));
    
    setIsEditOpen(false);

    const { error } = await supabase.from("bookings").update({
      price: parseFloat(editData.price) || 0,
      assigned_team_id: editData.assigned_team_id || null,
      checklist_template_id: editData.checklist_template_id || null
    }).eq("id", editData.id);

    if (error) {
      alert("Failed to update booking");
      setBookings(prevBookings);
    } else {
      fetchBookings(); // Refresh to get relations properly
    }
  };

  // 5. Delete Booking
  const handleDeleteBooking = async (id: number) => {
    if(!confirm("Are you sure you want to delete this booking?")) return;
    setBookings(bookings.filter(b => b.id !== id));
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      alert("Failed to delete booking");
      fetchBookings();
    }
  };

  // 6. Filters
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

  return (
    <div className="min-h-screen pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" /> Bookings & Schedule
          </h1>
          <p className="text-gray-500 text-sm">Manage daily cleaning operations</p>
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

      {/* Bookings List */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
          <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-500 font-bold">No bookings found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow relative">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${booking.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Home size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Unit {booking.units?.unit_number}</h3>
                  <p className="text-sm text-gray-500">{booking.units?.companies?.name} • {booking.units?.building_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-10">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Date & Time</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <Calendar size={14} className="text-blue-500" /> {booking.cleaning_date}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {booking.cleaning_time}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Service & Checklist</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.service_type}</p>
                  
                  {/* Checklist Badge */}
                  {booking.checklist_templates ? (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <ClipboardList size={10} /> {booking.checklist_templates.title}
                    </p>
                  ) : (
                    <p className="text-[11px] text-orange-500 italic mt-0.5">No checklist assigned</p>
                  )}

                  {/* Price */}
                  {booking.price > 0 ? (
                    <p className="text-xs text-green-600 font-bold bg-green-50 inline-block px-1.5 py-0.5 rounded mt-1">AED {booking.price}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400 font-medium italic mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> Price not set
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Assigned Team</p>
                  {booking.teams ? (
                    <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1 text-gray-800">
                      <Users size={14} /> {booking.teams.team_name}
                    </span>
                  ) : (
                    <span className="text-xs text-orange-500 font-bold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md">
                      <AlertCircle size={14} /> Unassigned
                    </span>
                  )}
                </div>

                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : booking.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {booking.status}
                  </span>
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
                        setEditData({ 
                          id: booking.id, 
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
      )}

      {/* --- ADD BOOKING MODAL --- */}
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
                {/* (Previous Input Fields...) */}
                {/* ... (Client, Unit, Date, Time fields are same as before) ... */}
                
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
                      {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} - {u.building_name}</option>)}
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

                {/* NEW: Checklist Template Selection */}
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
                    <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" onChange={(e) => setFormData({...formData, assigned_team_id: e.target.value})}>
                      <option value="">Unassigned</option>
                      {activeTeams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl mt-4 shadow-xl hover:bg-black transition-all">Confirm Booking</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT BOOKING MODAL --- */}
      <AnimatePresence>
        {isEditOpen && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-sm rounded-3xl shadow-2xl z-50 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Update Booking</h2>
                <button onClick={() => setIsEditOpen(false)}><X className="text-gray-500" size={20}/></button>
              </div>

              <form onSubmit={handleUpdateBooking} className="p-5 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Update Price (AED)</label>
                  <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.price} onChange={(e) => setEditData({...editData, price: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assign / Change Team</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.assigned_team_id} onChange={(e) => setEditData({...editData, assigned_team_id: e.target.value})}>
                    <option value="">Unassigned</option>
                    {activeTeams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                </div>
                
                {/* Edit Checklist */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Checklist Template</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" value={editData.checklist_template_id} onChange={(e) => setEditData({...editData, checklist_template_id: e.target.value})}>
                    <option value="">Select Checklist</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl mt-2 shadow-lg hover:bg-blue-700 transition-all">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
