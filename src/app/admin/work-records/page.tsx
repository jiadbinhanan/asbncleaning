"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Filter, Search, Clock, Calendar, Building2, 
  MapPin, CheckCircle2, AlertCircle, Camera, UserCircle, X, 
  ChevronDown, FileCheck, CircleDollarSign, CheckSquare, Users, XCircle, LayoutGrid 
} from "lucide-react";
import { format, differenceInMinutes, parseISO, startOfMonth, endOfMonth } from "date-fns";

export default function WorkRecords() {
  const supabase = createClient();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // --- Filter States (Default: Current Month) ---
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); 

  // --- Modal States ---
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // 1. Initial Data Fetching (Profiles & Companies)
  const fetchInitialData = async () => {
    setLoading(true);
    const [compRes, profRes] = await Promise.all([
      supabase.from('companies').select('id, name').order('name', { ascending: true }),
      supabase.from('profiles').select('id, full_name, username, avatar_url')
    ]);

    if (compRes.data) setCompanies(compRes.data);
    if (profRes.data) setProfiles(profRes.data);
    
    await fetchWorkLogs();
  };

  // 2. Fetch Bookings & Nested Work Logs
  const fetchWorkLogs = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, status, price, service_type, cleaning_date, cleaning_time,
        units!inner ( unit_number, building_name, company_id, layout, companies(name) ),
        teams ( id, team_name, member_ids ),
        work_logs (
          id, start_time, end_time, checklist_data, photo_urls, cost,
          submitter:profiles!work_logs_submitted_by_fkey ( full_name, avatar_url )
        )
      `)
      .gte('cleaning_date', dateFrom)
      .lte('cleaning_date', dateTo)
      .in('status', ['completed', 'finalized'])
      .order('cleaning_time', { ascending: false });

    if (error) {
      alert("Error fetching logs: " + error.message);
    } else {
      setBookings((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInitialData(); }, []);

  // 3. Apply Filters locally
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      let match = true;
      if (filterCompany && b.units?.company_id?.toString() !== filterCompany) match = false;
      if (filterStatus && b.status !== filterStatus) match = false;
      return match;
    });
  }, [bookings, filterCompany, filterStatus]);

  // 4. Group by Date & Sort
  const groupedBookings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return { groups, sortedDates };
  }, [filteredBookings]);

  // --- Helper Functions ---
  const getDuration = (start: string, end: string) => {
    if (!start || !end) return "Unknown";
    const mins = differenceInMinutes(parseISO(end), parseISO(start));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getTeamMembers = (memberIds: string[]) => {
    if (!memberIds || memberIds.length === 0) return [];
    return memberIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
  };

  // 🚨 FIXED: Robust Checklist Parser to catch true/false correctly
  const getGroupedChecklist = (data: any) => {
    if (!data) return {};
    let parsed = data;
    if (typeof data === 'string') {
      try { parsed = JSON.parse(data); } catch(e) { return {}; }
    }
    
    const grouped: Record<string, { task: string, isDone: boolean }[]> = {};
    
    if (typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, value]) => {
        // Checking for strict boolean true or string 'true'
        const isDone = value === true || value === 'true';
        const parts = String(key).split(' - ');
        const section = parts.length > 1 ? parts[0] : 'General Tasks';
        const task = parts.length > 1 ? parts.slice(1).join(' - ') : key;
        
        if (!grouped[section]) grouped[section] = [];
        grouped[section].push({ task, isDone });
      });
    }
    return grouped;
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative overflow-hidden">
      
      {/* --- PREMIUM HEADER --- */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-20 px-4 md:px-8 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-1">Quality Control</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                 <FileCheck className="text-blue-500" size={32}/> Work Logs & Audits
              </h1>
           </div>
           
           <button 
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-black transition-all flex items-center gap-2 backdrop-blur-md"
           >
              <Filter size={18}/> Filters {showFilters ? <ChevronDown size={18} className="rotate-180 transition-transform"/> : <ChevronDown size={18} className="transition-transform"/>}
           </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-10 relative z-20">
        
        {/* --- FILTER PANEL --- */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 mb-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">From Date</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">To Date</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Company</label>
                  <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900">
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={fetchWorkLogs} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Search size={18}/> Fetch Data
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- VERTICAL TIMELINE FEED --- */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48}/></div>
        ) : groupedBookings.sortedDates.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
             <CheckSquare size={56} className="mx-auto mb-4 opacity-30 text-blue-500"/>
             <p className="text-xl font-black text-gray-800">No work records found.</p>
             <p className="text-sm mt-2">Try changing the date range or filters.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedBookings.sortedDates.map(dateStr => (
              <div key={dateStr} className="space-y-5">
                
                {/* Date Header */}
                <div className="flex items-center gap-3 pl-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Calendar size={18} strokeWidth={2.5}/></div>
                  <h2 className="text-lg font-black text-gray-800 tracking-tight">{format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}</h2>
                  <div className="h-px bg-gray-300 flex-1 ml-4"></div>
                </div>

                {/* Bookings for the Date */}
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-6 space-y-6 pb-4">
                  {groupedBookings.groups[dateStr].map((booking) => {
                    const workLog = booking.work_logs?.[0]; 
                    const members = getTeamMembers(booking.teams?.member_ids);
                    const isFinalized = booking.status === 'finalized';

                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
                        key={booking.id} 
                        className="relative pl-8 md:pl-10"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-[#F4F7FA] shadow-sm"></div>

                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all">
                          
                          <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                            <div>
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Clock size={14} className="text-blue-500"/> Shift Time: {booking.cleaning_time}
                              </span>
                              <h3 className="text-xl font-black text-gray-900">{booking.units?.companies?.name || "Unknown Company"}</h3>
                              <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <MapPin size={14}/> Unit {booking.units?.unit_number} - {booking.units?.building_name}
                              </p>
                            </div>
                            
                            {/* 🚨 FIXED: Show Price explicitly below Finalized status */}
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block ${isFinalized ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {booking.status}
                              </span>
                              {isFinalized && booking.price > 0 && (
                                <span className="text-sm font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                  AED {booking.price}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            
                            {/* Avatar Group */}
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={12}/> {booking.teams?.team_name}</p>
                              <div className="flex items-center">
                                {members.map((m: any, i: number) => (
                                  <div key={m.id} className={`w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shadow-sm ${i !== 0 ? '-ml-3' : ''}`}>
                                    {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.full_name?.charAt(0) || "U"}
                                  </div>
                                ))}
                                {workLog && (
                                  <div className="ml-3 text-xs font-bold text-gray-500">
                                    Submitted by <span className="text-gray-900">{workLog.submitter?.full_name || "Supervisor"}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Stats Badges */}
                            {workLog ? (
                              <div className="flex gap-2 w-full md:w-auto">
                                <div className="flex-1 md:flex-none px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2">
                                    <Clock size={16} className="text-blue-500"/>
                                    <div><p className="text-[9px] font-bold text-gray-400 uppercase">Duration</p><p className="text-xs font-black text-gray-900">{getDuration(workLog.start_time, workLog.end_time)}</p></div>
                                </div>
                                <div className="flex-1 md:flex-none px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2">
                                    <Camera size={16} className="text-blue-500"/>
                                    <div><p className="text-[9px] font-bold text-gray-400 uppercase">Photos</p><p className="text-xs font-black text-gray-900">{workLog.photo_urls?.length || 0}</p></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><AlertCircle size={14}/> No Work Log Found</span>
                            )}
                          </div>

                          <button 
                            onClick={() => setSelectedBooking(booking)}
                            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                          >
                            <FileCheck size={18}/> View Full Report
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- SLIDE-UP MODAL (BOTTOM SHEET) --- */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full h-[85vh] bg-white rounded-t-[2.5rem] shadow-2xl z-50 flex flex-col"
            >
              <div className="w-full flex justify-center pt-4 pb-2 cursor-pointer" onClick={() => setSelectedBooking(null)}>
                 <div className="w-16 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              <div className="px-6 md:px-12 pb-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black text-gray-900">Work Audit Report</h2>
                    <p className="text-sm font-bold text-gray-500">Comprehensive Job Summary</p>
                 </div>
                 <button onClick={() => setSelectedBooking(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:px-12 space-y-8 custom-scrollbar">
                
                {/* 🚨 NEW: Detailed Booking Overview Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
                  
                  {/* Location Box */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><Building2 size={12}/> Property Details</p>
                    <p className="font-black text-gray-900 text-lg leading-tight">{selectedBooking.units?.companies?.name}</p>
                    <p className="text-sm font-bold text-gray-600">Unit {selectedBooking.units?.unit_number} - {selectedBooking.units?.building_name}</p>
                    <p className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded w-fit">{selectedBooking.units?.layout || 'Layout N/A'}</p>
                  </div>
                  
                  {/* Service & Schedule Box */}
                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> Schedule & Type</p>
                    <p className="text-sm font-black text-gray-800 flex items-center gap-2"><Calendar size={14} className="text-blue-500"/> {format(parseISO(selectedBooking.cleaning_date), 'EEEE, dd MMM yyyy')}</p>
                    <p className="text-sm font-black text-gray-800 flex items-center gap-2"><Clock size={14} className="text-blue-500"/> {selectedBooking.cleaning_time}</p>
                    <p className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded w-fit mt-1">{selectedBooking.service_type}</p>
                  </div>

                  {/* Team & Price Box */}
                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                     <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><CircleDollarSign size={12}/> Financial & Team</p>
                     <p className="text-sm font-black text-gray-900 flex items-center gap-1.5"><Users size={14} className="text-indigo-500"/> {selectedBooking.teams?.team_name}</p>
                     
                     <div className="mt-3">
                       {selectedBooking.status === 'finalized' ? (
                          <div className="bg-green-100 border border-green-200 p-2 rounded-xl text-center">
                            <p className="text-[10px] font-black text-green-700 uppercase">Final Billed Price</p>
                            <p className="text-xl font-black text-green-800">AED {selectedBooking.price}</p>
                          </div>
                       ) : (
                          <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-center">
                            <p className="text-xs font-black text-amber-700 uppercase">Pending Price Setup</p>
                          </div>
                       )}
                     </div>
                  </div>
                </div>

                {/* 🚨 NEW: Team Members Avatars Expanded */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest min-w-fit">Assigned Members:</p>
                   <div className="flex flex-wrap gap-3">
                      {getTeamMembers(selectedBooking.teams?.member_ids).map((m: any) => (
                         <div key={m.id} className="flex items-center gap-2 bg-gray-50 pr-3 rounded-full border border-gray-100 hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden shadow-sm flex items-center justify-center font-bold text-gray-600 text-xs">
                               {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : m.full_name?.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-gray-700">{m.full_name || m.username}</span>
                         </div>
                      ))}
                   </div>
                </div>

                {/* --- Work Log Specific Details --- */}
                {selectedBooking.work_logs && selectedBooking.work_logs.length > 0 ? (
                  (() => {
                    const workLog = selectedBooking.work_logs[0];
                    const checklistGroups = getGroupedChecklist(workLog.checklist_data);

                    return (
                      <>
                        {/* Section A: Timeline & Cost */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={14}/> Live Time Tracking</p>
                              <div className="space-y-2">
                                 <div className="flex justify-between"><span className="text-sm text-gray-600 font-bold">Shift Started:</span><span className="text-sm font-black text-gray-900">{format(parseISO(workLog.start_time), 'hh:mm a')}</span></div>
                                 <div className="flex justify-between"><span className="text-sm text-gray-600 font-bold">Shift Ended:</span><span className="text-sm font-black text-gray-900">{format(parseISO(workLog.end_time), 'hh:mm a')}</span></div>
                                 <div className="w-full h-px bg-blue-200 my-2"></div>
                                 <div className="flex justify-between items-center">
                                   <span className="text-sm text-blue-700 font-bold">Total Duration:</span>
                                   <span className="text-base bg-blue-600 text-white px-3 py-1 rounded-lg font-black shadow-sm">{getDuration(workLog.start_time, workLog.end_time)}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex flex-col justify-center">
                              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2"><CircleDollarSign size={14}/> Extra Material Costs</p>
                              {workLog.cost > 0 ? (
                                <div className="flex items-center gap-3">
                                   <span className="text-3xl font-black text-amber-600">AED {workLog.cost}</span>
                                   <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">Material Purchase</span>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-amber-700/60 mt-2">No extra purchases recorded by the supervisor.</p>
                              )}
                           </div>
                        </div>

                        {/* Section B: Photo Evidence */}
                        <div>
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><Camera size={18} className="text-blue-500"/> Photographic Evidence ({workLog.photo_urls?.length || 0})</h3>
                          {workLog.photo_urls && workLog.photo_urls.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {workLog.photo_urls.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                  <img src={url} alt={`Work proof ${i+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Search size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"/>
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 border-dashed text-center text-gray-400 font-bold">No photos uploaded for this job.</div>
                          )}
                        </div>

                        {/* 🚨 FIXED: Section C: Checklist Verification (Shows Both Selected and Unselected) */}
                        <div className="pb-10">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><CheckSquare size={18} className="text-blue-500"/> Detailed Checklist Verification</h3>
                          {Object.keys(checklistGroups).length > 0 ? (
                             <div className="space-y-6">
                               {Object.entries(checklistGroups).map(([section, tasks]) => (
                                 <div key={section} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                                   <h4 className="font-black text-gray-600 text-xs mb-4 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg w-fit border border-gray-200">{section}</h4>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                                     {tasks.map((t, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${t.isDone ? 'bg-green-50/40 border-green-200' : 'bg-red-50/40 border-red-200'}`}>
                                           <div className={`rounded-lg p-1 shadow-sm mt-0.5 flex-shrink-0 ${t.isDone ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                              {t.isDone ? <CheckCircle2 size={14} strokeWidth={3}/> : <XCircle size={14} strokeWidth={3}/>}
                                           </div>
                                           <span className={`font-bold text-sm leading-snug ${t.isDone ? 'text-green-900' : 'text-red-900 line-through decoration-red-300'}`}>{t.task}</span>
                                        </div>
                                     ))}
                                   </div>
                                 </div>
                               ))}
                             </div>
                          ) : (
                            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 border-dashed text-center text-gray-400 font-bold">No checklist was submitted for this task.</div>
                          )}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div className="p-8 bg-red-50 text-red-600 rounded-3xl font-bold border border-red-100 flex flex-col items-center justify-center gap-3 text-center my-8">
                    <AlertCircle size={48} className="opacity-80"/>
                    <p className="text-xl">Data Missing / Work Log Not Found</p>
                    <p className="text-sm font-medium text-red-500">The team marked this as completed, but no work log exists.</p>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
