"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ListTodo, CheckCircle, DollarSign, Image as ImageIcon, 
  Loader2, Building2, Clock, UserCircle, CalendarCheck, 
  FileCheck, ShieldAlert, XCircle, LayoutGrid, Key, MapPin, 
  Filter, FilterX, Edit3, PackagePlus, ReceiptText, RefreshCcw
} from "lucide-react";
import { format, differenceInMinutes, parseISO } from 'date-fns';

// --- Types ---
type WorkLog = {
  id: number;
  start_time: string;
  end_time: string;
  checklist_data: Record<string, boolean>;
  photo_urls: string[];
  equipment_logs?: any;
  agent?: { full_name: string, avatar_url: string };
};

type Booking = {
  id: number;
  status: string;
  price: number;
  service_type: string;
  cleaning_time: string;
  cleaning_date: string;
  assigned_team_id: number;
  units?: { 
    id: number;
    unit_number: string; 
    building_name: string;
    layout: string;
    door_code: string;
    companies?: { name: string } 
  };
  teams?: { id: number, team_name: string, member_ids: string[] };
  work_logs?: WorkLog[];
};

export default function ReviewsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [equipMaster, setEquipMaster] = useState<any[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [extraInventory, setExtraInventory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. ULTIMATE OPTIMIZED FETCH (Parallel API Calls)
  const fetchReviews = async () => {
    setLoading(true);
    
    const [bRes, pRes, mRes, cRes] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id, status, price, service_type, cleaning_time, cleaning_date, assigned_team_id,
          units ( id, unit_number, building_name, layout, door_code, companies ( name ) ),
          teams ( id, team_name, member_ids ),
          work_logs (
            id, start_time, end_time, checklist_data, photo_urls, equipment_logs,
            agent:profiles!work_logs_submitted_by_fkey ( full_name, avatar_url )
          )
        `)
        .in('status', ['completed', 'finalized'])
        .order('id', { ascending: false }),
      supabase.from('profiles').select('id, full_name, avatar_url'),
      supabase.from('equipment_master').select('id, base_price'),
      supabase.from('unit_equipment_config').select('unit_id, equipment_id, extra_unit_price')
    ]);

    if (bRes.error) console.error("Fetch Error:", bRes.error.message);
    else if (bRes.data) setBookings(bRes.data as any);

    if (pRes.data) setProfiles(pRes.data);
    if (mRes.data) setEquipMaster(mRes.data);
    if (cRes.data) setUnitConfigs(cRes.data);

    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [supabase]);

  // Open Modal & Setup Data
  const handleOpenReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setPriceInput(booking.price ? booking.price.toString() : "");

    // Process Equipment Logs for Auditing
    const eqLogs = booking.work_logs?.[0]?.equipment_logs || {};
    const extProvide = eqLogs.extraProvide || [];
    const othProvide = eqLogs.otherProvide || [];

    // Combine and apply Auto-Pricing
    const combinedExtras = [
      ...extProvide.map((e: any) => ({ ...e, type: 'extra_provide' })),
      ...othProvide.map((e: any) => ({ ...e, type: 'other_provide' }))
    ].map((item: any) => {
      let price = 0;
      if (item.equipment_id && booking.units?.id) {
        // Try to get unit specific extra price first
        const config = unitConfigs.find(c => c.unit_id === booking.units?.id && c.equipment_id == item.equipment_id);
        if (config && config.extra_unit_price > 0) {
          price = config.extra_unit_price;
        } else {
          // Fallback to master base price
          const master = equipMaster.find(m => m.id == item.equipment_id);
          if (master) price = master.base_price;
        }
      }
      return { ...item, unit_price: price.toString(), remarks: '' };
    });

    setExtraInventory(combinedExtras);
  };

  // Submit/Update Final Price & Inventory
  const handleSubmitPrice = async () => {
    if (!selectedBooking || !priceInput) return;
    setIsSubmitting(true);

    try {
      // 1. Update Booking Status and Price
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ price: parseFloat(priceInput), status: 'finalized' })
        .eq('id', selectedBooking.id);

      if (bookingError) throw bookingError;

      // 2. Save Extra Inventory Logs (if any)
      if (extraInventory.length > 0) {
        // Clear previous entries if re-auditing
        await supabase.from('booking_extra_inventory').delete().eq('booking_id', selectedBooking.id);
        
        const inventoryInserts = extraInventory.map(item => ({
             booking_id: selectedBooking.id,
             item_name: item.item_name,
             quantity: item.qty,
             unit_price: parseFloat(item.unit_price) || 0,
             total_price: item.qty * (parseFloat(item.unit_price) || 0),
             type: item.type,
             remarks: item.remarks,
             supervisor_edited: true
        }));

        const { error: invError } = await supabase.from('booking_extra_inventory').insert(inventoryInserts);
        if (invError) throw invError;
      }

      alert("Audit completed and prices finalized! 🎉");
      setSelectedBooking(null);
      fetchReviews();
    } catch (error: any) {
      alert("Failed to finalize: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract unique companies for filter
  const companies = useMemo(() => {
    const comps = new Set<string>();
    bookings.forEach(b => {
      if (b.units?.companies?.name) comps.add(b.units.companies.name);
    });
    return Array.from(comps);
  }, [bookings]);

  // Apply Filters
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      let match = true;
      if (filterDate && b.cleaning_date !== filterDate) match = false;
      if (filterCompany && b.units?.companies?.name !== filterCompany) match = false;
      if (filterStatus && b.status !== filterStatus) match = false;
      return match;
    });
  }, [bookings, filterDate, filterCompany, filterStatus]);

  // Group by Date & Sort
  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    sortedDates.forEach(date => {
      groups[date].sort((a, b) => {
        const timeA = a.work_logs?.[0]?.end_time ? new Date(a.work_logs[0].end_time).getTime() : 0;
        const timeB = b.work_logs?.[0]?.end_time ? new Date(b.work_logs[0].end_time).getTime() : 0;
        return timeB - timeA;
      });
    });

    return { groups, sortedDates };
  }, [filteredBookings]);

  // Helper to parse checklist data into sections
  const getGroupedChecklist = (checklistData: Record<string, boolean> | null) => {
    if (!checklistData) return {};
    const grouped: Record<string, { task: string, isDone: boolean }[]> = {};
    Object.entries(checklistData).forEach(([key, isDone]) => {
      const parts = key.split(' - ');
      const section = parts.length > 1 ? parts[0] : 'General';
      const task = parts.length > 1 ? parts.slice(1).join(' - ') : key;
      
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push({ task, isDone });
    });
    return grouped;
  };

  // Get Team Member Profiles
  const getTeamMembers = (memberIds: string[] | undefined) => {
    if (!memberIds) return [];
    return memberIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-blue-600" size={48}/></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-[#F4F7FA]">
      
      {/* HEADER: Blue Premium Theme */}
      <div className="mb-6 bg-gradient-to-r from-blue-800 to-indigo-900 p-8 rounded-[2rem] shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner"><FileCheck size={28} /></div>
            Audit & Pricing Review
          </h1>
          <p className="text-blue-100 font-medium mt-2">Verify checklist submissions, log extra inventory, and finalize billings.</p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 w-full md:w-auto ${showFilters ? 'bg-white text-blue-800' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}>
            <Filter size={20} /> Filter Data
          </button>
          <div className="hidden md:flex px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-sm font-bold text-white shadow-sm whitespace-nowrap">
            Needs Review: {bookings.filter(b => b.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* FILTERS SECTION */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                <input type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Company</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  <option value="">All Companies</option>
                  {companies.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="completed">Needs Review</option>
                  <option value="finalized">Price Finalized</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => {setFilterDate(""); setFilterCompany(""); setFilterStatus("");}} className="w-full py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold flex justify-center items-center gap-2 transition-all">
                  <FilterX size={18} /> Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOOKINGS LIST */}
      <div className="space-y-10">
        {groupedBookings.sortedDates.length === 0 ? (
           <div className="bg-white p-16 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
             <ListTodo size={64} className="mx-auto mb-4 opacity-20 text-blue-500"/>
             <p className="text-xl font-black text-gray-800 mb-1">No audit records found.</p>
           </div>
        ) : (
          groupedBookings.sortedDates.map(dateStr => (
            <div key={dateStr} className="space-y-5">
              
              <div className="flex items-center gap-3 pl-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><CalendarCheck size={18} strokeWidth={2.5}/></div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">{format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}</h2>
                <div className="h-px bg-gray-200 flex-1 ml-4"></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {groupedBookings.groups[dateStr].map(booking => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={booking.id} 
                    className={`p-6 md:p-8 rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md ${booking.status === 'completed' ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200 opacity-90'}`}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        {booking.status === 'completed' ? (
                          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm animate-pulse flex items-center gap-1.5"><Clock size={12}/> Needs Review</span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1"><CheckCircle size={14}/> Finalized</span>
                        )}
                        <span className="text-sm font-black text-gray-600 flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-gray-100"><Clock size={14} className="text-blue-500"/> {booking.cleaning_time}</span>
                      </div>
                      
                      <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-600"/> {booking.units?.companies?.name || "N/A"} 
                        <span className="text-gray-400 font-medium text-base ml-1">| Unit {booking.units?.unit_number}</span>
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        <p className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">Team: <span className="text-gray-900 font-black">{booking.teams?.team_name || "Unknown"}</span></p>
                        <p className="text-sm text-gray-600 font-bold bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">{booking.service_type}</p>
                        {booking.price > 0 && <p className="text-sm font-black text-green-700 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200 shadow-sm">AED {booking.price}</p>}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenReview(booking)}
                      className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${booking.status === 'completed' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-900 text-white hover:bg-black'}`}
                    >
                      {booking.status === 'completed' ? "Audit & Set Price" : <><Edit3 size={18}/> View & Edit Audit</>}
                    </button>
                  </motion.div>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

      {/* --- SUPER PREMIUM REVIEW MODAL --- */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-gray-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl p-6 md:p-10 relative custom-scrollbar">
              
              <button onClick={() => setSelectedBooking(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 p-2.5 rounded-full transition-colors z-10">✕</button>

              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <FileCheck className="text-blue-600"/> Final Work Audit
              </h2>
              
              {/* Comprehensive Info Grid */}
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div>
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Building2 size={12}/> Company & Building</p>
                     <p className="font-black text-gray-900 text-base">{selectedBooking.units?.companies?.name} <span className="text-gray-400 font-medium">({selectedBooking.units?.building_name})</span></p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={12}/> Unit No</p>
                       <p className="font-black text-blue-600 text-lg">{selectedBooking.units?.unit_number}</p>
                     </div>
                     <div>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><LayoutGrid size={12}/> Layout</p>
                       <p className="font-bold text-gray-800 text-sm mt-1">{selectedBooking.units?.layout || 'N/A'}</p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Team Info & Submitter */}
                 <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                    <div>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Assigned Team</p>
                       <div className="flex items-center gap-2 mb-2">
                         <span className="font-bold text-gray-900 text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg">{selectedBooking.teams?.team_name}</span>
                       </div>
                       {/* Team Members DP */}
                       <div className="flex flex-wrap gap-1.5">
                          {getTeamMembers(selectedBooking.teams?.member_ids).map((m: any) => (
                             <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 pr-2 rounded-full border border-gray-200">
                               <div className="w-6 h-6 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm">
                                 {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : <UserCircle size={16} className="text-gray-400"/>}
                               </div>
                               <span className="text-[10px] font-bold text-gray-600">{m.full_name?.split(' ')[0]}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              {selectedBooking.work_logs && selectedBooking.work_logs.length > 0 ? (
                (() => {
                  const workLog = selectedBooking.work_logs[0];
                  const checklistGroups = getGroupedChecklist(workLog.checklist_data);
                  // 🚨 Extract Exchange Logs
                  const eqLogs = workLog.equipment_logs || {};
                  const stdExchanges = (eqLogs.standardExchange || []).filter((e: any) => e.exchanged_qty > 0);
                  const extExchanges = eqLogs.extraExchange || [];
                  const othExchanges = eqLogs.otherExchange || [];
                  const hasExchanges = stdExchanges.length > 0 || extExchanges.length > 0 || othExchanges.length > 0;


                  return (
                    <div className="space-y-8 mb-10">
                      
                      {/* Time Tracking & Submitter Box */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="flex-1">
                            <p className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={14}/> Shift Started</p>
                            <p className="font-black text-blue-900 text-xl">{format(parseISO(workLog.start_time), 'hh:mm a')}</p>
                          </div>
                          <div className="h-12 w-[2px] bg-blue-200/50 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle size={14}/> Shift Ended</p>
                            <p className="font-black text-indigo-900 text-xl">{format(parseISO(workLog.end_time), 'hh:mm a')}</p>
                          </div>
                        </div>
                        
                        {/* Submitter Agent DP */}
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-white flex items-center gap-3 md:min-w-[200px]">
                           <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                             {workLog.agent?.avatar_url ? <img src={workLog.agent.avatar_url} className="w-full h-full object-cover"/> : <UserCircle size={24} className="text-blue-500"/>}
                           </div>
                           <div>
                             <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Submitted By</p>
                             <p className="font-black text-sm text-gray-900 leading-tight">{workLog.agent?.full_name || "Unknown Agent"}</p>
                           </div>
                        </div>
                      </div>

                      <hr className="border-gray-100 border-2 rounded-full"/>

                      {/* 🚨 Section-wise Checklist Rendering (Fixed) */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2"><ListTodo size={20} className="text-blue-500"/> Tasks Audit Breakdown</h3>
                        
                        {Object.keys(checklistGroups).length > 0 ? (
                          <div className="space-y-6">
                            {Object.entries(checklistGroups).map(([section, tasks]) => (
                              <div key={section} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                                <h4 className="font-black text-gray-500 text-xs mb-4 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg w-fit">{section}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                                  {tasks.map((t, i) => (
                                     <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${t.isDone ? 'bg-teal-50/40 border-teal-100 hover:shadow-sm' : 'bg-red-50/40 border-red-100 hover:shadow-sm'}`}>
                                        <div className={`rounded-lg p-1 shadow-sm mt-0.5 ${t.isDone ? 'bg-teal-500 text-white' : 'bg-red-500 text-white'}`}>
                                           {t.isDone ? <CheckCircle size={14} strokeWidth={3}/> : <XCircle size={14} strokeWidth={3}/>}
                                        </div>
                                        <span className={`font-bold text-sm leading-snug ${t.isDone ? 'text-teal-950' : 'text-red-900 line-through decoration-red-300'}`}>{t.task}</span>
                                     </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                           <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 text-center text-gray-500 italic font-medium">No checklist data found for this session.</div>
                        )}
                      </div>

                      {/* 🚨 NEW: Equipment Exchange Record (Read-Only) */}
                      {hasExchanges && (
                        <div>
                          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2"><RefreshCcw size={20} className="text-amber-500"/> Equipment Exchange Log</h3>
                          <div className="bg-white border border-amber-100 rounded-3xl p-5 shadow-sm space-y-3">
                            
                            {/* Standard Exchanges */}
                            {stdExchanges.length > 0 && stdExchanges.map((item: any, idx: number) => (
                              <div key={`std-${idx}`} className="flex items-center justify-between p-3 bg-amber-50/30 border border-amber-100 rounded-xl">
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{item.item_name}</p>
                                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded w-fit mt-1">Standard Exchange</p>
                                </div>
                                <div className="text-center bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">Exchanged</p>
                                  <p className="font-black text-gray-900">{item.exchanged_qty} <span className="text-xs text-gray-400">/ {item.expected_qty}</span></p>
                                </div>
                              </div>
                            ))}

                            {/* Extra & Custom Exchanges */}
                            {[...extExchanges, ...othExchanges].length > 0 && [...extExchanges, ...othExchanges].map((item: any, idx: number) => (
                              <div key={`ext-${idx}`} className="flex items-center justify-between p-3 bg-amber-50/30 border border-amber-100 rounded-xl">
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{item.item_name}</p>
                                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-100 px-2 py-0.5 rounded w-fit mt-1">Extra / Custom Exchange</p>
                                </div>
                                <div className="text-center bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">Qty</p>
                                  <p className="font-black text-gray-900">{item.qty}</p>
                                </div>
                              </div>
                            ))}

                          </div>
                        </div>
                      )}

                      {/* 🚨 NEW: Equipment Audit Section */}
                      {extraInventory.length > 0 && (
                        <div>
                          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2"><PackagePlus size={20} className="text-indigo-500"/> Extra Equipment Billed</h3>
                          <div className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-sm space-y-4">
                             {extraInventory.map((item, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                                  
                                  <div className="flex-1">
                                    <p className="font-black text-gray-900 text-sm">{item.item_name}</p>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100 px-2 py-0.5 rounded w-fit mt-1">
                                      {item.type === 'extra_provide' ? 'Extra Provide' : 'Custom Provide'}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
                                    <div className="text-center px-2 border-r border-gray-100">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase">Qty</p>
                                      <p className="font-black text-gray-900">{item.qty}</p>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Unit Price</p>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-black text-gray-400">AED</span>
                                        <input 
                                          type="number" value={item.unit_price} 
                                          onChange={(e) => {
                                            const newInv = [...extraInventory];
                                            newInv[idx].unit_price = e.target.value;
                                            setExtraInventory(newInv);
                                          }}
                                          className="w-16 p-1 text-sm font-black text-gray-900 bg-gray-50 border border-gray-200 rounded outline-none text-center focus:border-indigo-500"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="w-full md:w-1/3">
                                    <input 
                                      type="text" placeholder="Remarks (e.g. Included in contract)" 
                                      value={item.remarks}
                                      onChange={(e) => {
                                        const newInv = [...extraInventory];
                                        newInv[idx].remarks = e.target.value;
                                        setExtraInventory(newInv);
                                      }}
                                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none font-medium text-xs text-gray-700 focus:border-indigo-500 placeholder-gray-400"
                                    />
                                  </div>

                                </div>
                             ))}
                             
                             <div className="flex justify-end pt-2 pr-2">
                               <p className="text-xs font-black text-gray-500 flex items-center gap-2">Total Extra Cost: 
                                 <span className="text-lg text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                                   AED {extraInventory.reduce((acc, item) => acc + (item.qty * (parseFloat(item.unit_price) || 0)), 0).toFixed(2)}
                                 </span>
                               </p>
                             </div>
                          </div>
                        </div>
                      )}

                      {/* Photos Evidence */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2"><ImageIcon size={20} className="text-purple-500"/> Photographic Evidence</h3>
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                          {workLog.photo_urls && workLog.photo_urls.length > 0 ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               {workLog.photo_urls.map((url, i) => (
                                 <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-md hover:shadow-xl transition-all group">
                                   <img src={url} alt="Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                      <span className="bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg transform translate-y-2 group-hover:translate-y-0">View Full</span>
                                   </div>
                                 </a>
                               ))}
                             </div>
                          ) : (
                             <p className="text-gray-500 font-bold p-4 text-center border-2 border-dashed border-gray-300 rounded-xl">No photo evidence uploaded by the team.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })()
              ) : (
                <div className="p-8 bg-red-50 text-red-600 rounded-3xl font-bold border border-red-100 flex flex-col items-center justify-center gap-3 text-center my-8 shadow-inner">
                  <ShieldAlert size={48} className="opacity-80"/>
                  <p className="text-xl">Data Missing / Work Log Not Found</p>
                  <p className="text-sm font-medium text-red-500">The team marked this as completed, but no work log exists. They might have bypassed the system.</p>
                </div>
              )}

              {/* Final Pricing Action */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-8 rounded-[2rem] shadow-xl mt-4 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 text-blue-800 opacity-30"><ReceiptText size={150}/></div>
                
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 relative z-10">
                  <div className="p-2 bg-green-400 rounded-lg text-gray-900 shadow-lg"><DollarSign size={20} /></div> 
                  {selectedBooking.status === 'completed' ? 'Finalize Main Booking Price' : 'Edit Booking Price'}
                </h3>
                
                <div className="flex flex-col md:flex-row gap-4 relative z-10"> 
                  <div className="flex-1 relative">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">AED</span>
                     <input 
                       type="number" 
                       value={priceInput} 
                       onChange={(e) => setPriceInput(e.target.value)} 
                       placeholder="0.00" 
                       className="w-full pl-16 pr-6 py-5 bg-white rounded-2xl outline-none focus:ring-4 focus:ring-green-500 font-black text-2xl text-gray-900 shadow-inner transition-all" 
                     />
                  </div>
                  <button 
                    onClick={handleSubmitPrice} 
                    disabled={isSubmitting || !priceInput || (!selectedBooking.work_logs || selectedBooking.work_logs.length === 0)} 
                    className="px-10 py-5 bg-green-500 hover:bg-green-400 text-gray-900 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin"/> : (selectedBooking.status === 'completed' ? <CheckCircle size={24}/> : <Edit3 size={24}/>)} 
                    {selectedBooking.status === 'completed' ? 'Submit Audit & Price' : 'Update Audit'}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}