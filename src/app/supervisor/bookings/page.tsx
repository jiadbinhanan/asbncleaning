"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Clock, Building2, CheckCircle2, 
  Loader2, X, Trash2, Edit2, ClipboardList, MapPin, Sparkles, AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";

// --- Types ---
type Booking = {
  id: number;
  unit_id: number;
  cleaning_date: string;
  cleaning_time: string;
  service_type: string;
  status: string;
  price: number;
  checklist_template_id: number | null;
  units: {
    unit_number: string;
    building_name: string;
    companies: { id: number, name: string }
  };
  teams?: { team_name: string };
  checklist_templates?: { title: string };
};

export default function SupervisorBookings() {
  const supabase = createClient();
  
  // States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State (No Team Assignment Field)
  const [formData, setFormData] = useState({
    id: null as number | null,
    company_id: "",
    unit_id: "",
    cleaning_date: "",
    cleaning_time: "",
    service_type: "Check-out Cleaning",
    price: "",
    checklist_template_id: ""
  });

  // 1. OPTIMIZED FETCH: Load everything in parallel
  const fetchData = async () => {
    setLoading(true);
    
    const [bookingsRes, companiesRes, unitsRes, checklistsRes] = await Promise.all([
      supabase.from('bookings').select(`
        id, unit_id, cleaning_date, cleaning_time, service_type, status, price, checklist_template_id,
        units ( unit_number, building_name, companies ( id, name ) ),
        teams ( team_name ),
        checklist_templates ( title )
      `).order('cleaning_date', { ascending: false }).order('cleaning_time', { ascending: true }),
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('units').select('id, company_id, unit_number, building_name'),
      supabase.from('checklist_templates').select('id, title')
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data as any);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (unitsRes.data) setUnits(unitsRes.data);
    if (checklistsRes.data) setChecklists(checklistsRes.data);
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [supabase]);

  // Handle Input Change
  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Open Modal for New
  const openNewModal = () => {
    setFormData({
      id: null, company_id: "", unit_id: "", cleaning_date: "", cleaning_time: "",
      service_type: "Check-out Cleaning", price: "", checklist_template_id: ""
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
      checklist_template_id: booking.checklist_template_id?.toString() || ""
    });
    setEditMode(true);
    setIsModalOpen(true);
  };

  // Save Booking (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      unit_id: parseInt(formData.unit_id),
      cleaning_date: formData.cleaning_date,
      cleaning_time: formData.cleaning_time,
      service_type: formData.service_type,
      price: formData.price ? parseFloat(formData.price) : 0,
      checklist_template_id: formData.checklist_template_id ? parseInt(formData.checklist_template_id) : null
    };

    if (editMode && formData.id) {
      const { error } = await supabase.from('bookings').update(payload).eq('id', formData.id);
      if (!error) { alert("Updated successfully!"); fetchData(); setIsModalOpen(false); }
      else alert("Error updating: " + error.message);
    } else {
      const { error } = await supabase.from('bookings').insert([payload]);
      if (!error) { alert("Booking recorded!"); fetchData(); setIsModalOpen(false); }
      else alert("Error creating: " + error.message);
    }
    setSaving(false);
  };

  // Delete Booking
  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this booking record?")) {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (!error) fetchData();
      else alert("Error: " + error.message);
    }
  };

  // 2. GROUP BY DATE (Date-wise sorting logic)
  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    return groups;
  }, [bookings]);

  // Sort dates descending (Newest first)
  const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-[#F4F7FA] font-sans pb-24">
      
      {/* HEADER - Premium Blue Gradient */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-8 rounded-[2rem] shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><Calendar size={28} /></div>
            Booking Records
          </h1>
          <p className="text-blue-100 font-medium mt-2">Add and manage client booking requests. (Team assignment restricted)</p>
        </div>
        
        <button onClick={openNewModal} className="relative z-10 px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 hover:shadow-lg rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-sm">
          <Plus size={20} strokeWidth={3}/> Record New Booking
        </button>
      </div>

      {/* BOOKINGS LIST (GROUPED BY DATE) */}
      <div className="space-y-10">
        {sortedDates.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
            <ClipboardList size={56} className="mx-auto mb-4 opacity-30 text-blue-500"/>
            <p className="text-xl font-black text-gray-800 mb-1">No booking records found.</p>
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
                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                        booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        booking.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {booking.status}
                      </span>
                      <span className="text-sm font-black text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 flex items-center gap-1.5"><Clock size={14} className="text-blue-500"/> {booking.cleaning_time}</span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mb-1 truncate">{booking.units?.companies?.name || "Unknown Company"}</h3>
                    <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 mb-4"><MapPin size={14}/> Unit {booking.units?.unit_number} - {booking.units?.building_name}</p>

                    <div className="space-y-2 mb-6">
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-2"><Sparkles size={14} className="text-orange-400"/> {booking.service_type}</p>
                      {booking.checklist_templates?.title && (
                        <p className="text-xs text-gray-600 font-medium flex items-center gap-2"><ClipboardList size={14} className="text-teal-500"/> {booking.checklist_templates.title}</p>
                      )}
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400"/> Team: <span className="font-bold text-gray-900">{booking.teams?.team_name || "Unassigned"}</span></p>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-50">
                      <button onClick={() => openEditModal(booking)} className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5">
                        <Edit2 size={14}/> Edit
                      </button>
                      <button onClick={() => handleDelete(booking.id)} className="flex-1 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5">
                        <Trash2 size={14}/> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

      {/* --- FORM MODAL (No Team Assignment) --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl custom-scrollbar relative">
              
              <div className="sticky top-0 bg-white/90 backdrop-blur-md px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ClipboardList size={20}/></div>
                  {editMode ? "Edit Booking Record" : "New Booking Record"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                
                {/* Information Notice */}
                <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold p-4 rounded-xl flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0"/>
                  <p>As a supervisor, you can record bookings but <span className="underline">team assignment is restricted</span>. It can be done during Morning Activations or by an Admin.</p>
                </div>

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