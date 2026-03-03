"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Filter, Search, Clock, Calendar, Building2, 
  MapPin, CheckCircle2, AlertCircle, Camera, UserCircle, X, 
  ChevronDown, FileCheck, CircleDollarSign, CheckSquare, Users, XCircle, PackagePlus, RefreshCcw
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
  const [filterHasExtra, setFilterHasExtra] = useState(false); // 🚨 NEW FILTER

  // --- Modal States ---
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // 1. Initial Data Fetching
  useEffect(() => {
    const fetchInitialData = async () => {
      const [compRes, profRes] = await Promise.all([
        supabase.from('companies').select('name'),
        supabase.from('profiles').select('id, full_name, avatar_url')
      ]);
      if (compRes.data) setCompanies(compRes.data);
      if (profRes.data) setProfiles(profRes.data);
    };
    fetchInitialData();
  }, [supabase]);

  // 2. Fetch Records based on Filters (From TSX 5)
  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('bookings')
      .select(`
        id, cleaning_date, cleaning_time, service_type, status, price, invoice_no, booking_ref,
        teams ( team_name, member_ids ),
        units ( unit_number, building_name, layout, companies ( name ) ),
        work_logs (
          id, start_time, end_time, checklist_data, photo_urls, equipment_logs, cost,
          agent:profiles!work_logs_submitted_by_fkey ( full_name, avatar_url )
        ),
        booking_extra_inventory (
          id, item_name, quantity, unit_price, total_price, type, remarks
        )
      `)
      .in('status', ['completed', 'finalized'])
      .gte('cleaning_date', dateFrom)
      .lte('cleaning_date', dateTo);

    if (filterStatus) query = query.eq('status', filterStatus);

    const { data, error } = await query;
    if (error) {
      console.error(error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [dateFrom, dateTo, filterStatus, supabase]);

  // 🚨 SMART EXTRA INVENTORY EXTRACTOR
  const getExtraInventory = (booking: any) => {
    if (booking.booking_extra_inventory && booking.booking_extra_inventory.length > 0) {
      return booking.booking_extra_inventory.map((inv: any) => ({
        id: inv.id,
        name: inv.item_name,
        qty: inv.quantity,
        price: `AED ${inv.total_price}`,
        type: inv.type,
        remarks: inv.remarks
      }));
    }
    
    const eqLogs = booking.work_logs?.[0]?.equipment_logs || {};
    const extProv = eqLogs.extraProvide || [];
    const othProv = eqLogs.otherProvide || [];
    
    const combined = [
      ...extProv.map((e:any)=>({...e, type: 'extra_provide'})), 
      ...othProv.map((e:any)=>({...e, type: 'other_provide'}))
    ];

    return combined.map((inv: any, idx: number) => ({
      id: `pend-${idx}`,
      name: inv.item_name,
      qty: inv.qty || inv.quantity,
      price: 'Pending Audit',
      type: inv.type,
      remarks: ''
    }));
  };

  // 3. Apply Filters locally
  const filteredBookings = useMemo(() => {
    let result = bookings;
    
    if (filterCompany) {
      result = result.filter(b => {
        const compName = Array.isArray(b.units?.companies) ? b.units.companies[0]?.name : b.units?.companies?.name;
        return compName === filterCompany;
      });
    }

    if (filterHasExtra) {
      result = result.filter(b => getExtraInventory(b).length > 0);
    }

    return result;
  }, [bookings, filterCompany, filterHasExtra]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const currentItems = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 4. Group by Date & Sort (TSX 5 logic, TSX 3 layout needs)
  const groupedBookings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    currentItems.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    sortedDates.forEach(date => {
      groups[date].sort((a, b) => {
        const timeA = a.cleaning_time ? new Date(`1970-01-01T${a.cleaning_time}`).getTime() : 0;
        const timeB = b.cleaning_time ? new Date(`1970-01-01T${b.cleaning_time}`).getTime() : 0;
        return timeB - timeA;
      });
    });

    return { groups, sortedDates };
  }, [currentItems]);

  // --- Helper Functions ---
  const getDuration = (start: string, end: string) => {
    if (!start || !end) return "Unknown";
    const mins = differenceInMinutes(parseISO(end), parseISO(start));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getTeamMembers = (memberIds: string[] | undefined) => {
    if (!memberIds || memberIds.length === 0) return [];
    return memberIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
  };

  const getGroupedChecklist = (data: any) => {
    if (!data) return {};
    let parsed = data;
    if (typeof data === 'string') {
      try { parsed = JSON.parse(data); } catch(e) { return {}; }
    }
    
    const grouped: Record<string, { task: string, isDone: boolean }[]> = {};
    if (typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, value]) => {
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
      
      {/* --- PREMIUM HEADER (TSX 3 Style) --- */}
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
        
        {/* --- FILTER PANEL (TSX 3 Style + Extra Checkbox from TSX 5) --- */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 mb-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900">
                    <option value="">All Statuses</option>
                    <option value="completed">Needs Audit</option>
                    <option value="finalized">Finalized</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center justify-center gap-2 cursor-pointer p-3 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl w-full h-[46px] transition-colors">
                    <input type="checkbox" checked={filterHasExtra} onChange={e => setFilterHasExtra(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                    <span className="text-xs font-black text-indigo-900">Has Extra Provide</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- VERTICAL TIMELINE FEED (TSX 3 Style) --- */}
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

                {/* Bookings Timeline */}
                <div className="relative border-l-2 border-gray-200 ml-4 md:ml-6 space-y-6 pb-4">
                  {groupedBookings.groups[dateStr].map((booking) => {
                    const workLog = booking.work_logs?.[0];
                    const members = getTeamMembers(booking.teams?.member_ids);
                    const isFinalized = booking.status === 'finalized';
                    const companyName = Array.isArray(booking.units?.companies) ? booking.units.companies[0]?.name : booking.units?.companies?.name;
                    const extras = getExtraInventory(booking);

                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
                        key={booking.id} 
                        className="relative pl-8 md:pl-10"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-[#F4F7FA] shadow-sm"></div>

                        {/* CARD DESIGN (TSX 3 Style + Extra Provide block) */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all">
                          
                          <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                            <div>
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Clock size={14} className="text-blue-500"/> Shift Time: {booking.cleaning_time}
                              </span>
                              <h3 className="text-xl font-black text-gray-900">{companyName || "Unknown Company"}</h3>
                              <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <MapPin size={14}/> Unit {booking.units?.unit_number} - {booking.units?.building_name}
                              </p>
                              <p className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md mt-2 inline-block border border-gray-200">{booking.service_type}</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block ${isFinalized ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {booking.status}
                              </span>
                              {isFinalized && booking.price > 0 && (
                                <span className="text-sm font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                  AED {booking.price}
                                </span>
                              )}
                              {booking.invoice_no && (
                                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><FileCheck size={12} className="text-green-500"/> {booking.invoice_no}</span>
                              )}
                            </div>
                          </div>

                          {/* 🚨 EXTRA PROVIDE SUB-CARD (From TSX 5) */}
                          {extras.length > 0 && (
                            <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1"><PackagePlus size={12}/> Extra Provide Billed</p>
                              <div className="space-y-1.5">
                                {extras.map((inv: any) => (
                                  <div key={inv.id} className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-indigo-900">{inv.qty}x {inv.name}</span>
                                    <span className={`font-black ${inv.price === 'Pending Audit' ? 'text-amber-600' : 'text-indigo-700'}`}>{inv.price}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

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
                                    Submitted by <span className="text-gray-900">{workLog.agent?.full_name || "Supervisor"}</span>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10 pt-6 border-t border-gray-200 pb-10">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-5 py-2.5 bg-white shadow-sm border border-gray-200 text-gray-700 font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-gray-50">Prev Page</button>
            <span className="text-sm font-black text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2.5 bg-white shadow-sm border border-gray-200 text-gray-700 font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-gray-50">Next Page</button>
          </div>
        )}

      </div>

      {/* --- SLIDE-UP MODAL (BOTTOM SHEET from TSX 3, Content from TSX 5) --- */}
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

              <div className="flex-1 overflow-y-auto p-6 md:px-12 space-y-8 custom-scrollbar pb-20">
                
                {/* Detailed Booking Overview Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><Building2 size={12}/> Property Details</p>
                    <p className="font-black text-gray-900 text-lg leading-tight">{Array.isArray(selectedBooking.units?.companies) ? selectedBooking.units.companies[0]?.name : selectedBooking.units?.companies?.name}</p>
                    <p className="text-sm font-bold text-gray-600">Unit {selectedBooking.units?.unit_number} - {selectedBooking.units?.building_name}</p>
                    <p className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded w-fit">{selectedBooking.units?.layout || 'Layout N/A'}</p>
                  </div>
                  
                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> Schedule & Type</p>
                    <p className="text-sm font-black text-gray-800 flex items-center gap-2"><Calendar size={14} className="text-blue-500"/> {format(parseISO(selectedBooking.cleaning_date), 'EEEE, dd MMM yyyy')}</p>
                    <p className="text-sm font-black text-gray-800 flex items-center gap-2"><Clock size={14} className="text-blue-500"/> {selectedBooking.cleaning_time}</p>
                    <p className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded w-fit mt-1">{selectedBooking.service_type}</p>
                  </div>

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

                {selectedBooking.work_logs && selectedBooking.work_logs.length > 0 ? (
                  (() => {
                    const workLog = selectedBooking.work_logs[0];
                    const checklistGroups = getGroupedChecklist(workLog.checklist_data);
                    
                    const eqLogs = workLog.equipment_logs || {};
                    const stdExchanges = (eqLogs.standardExchange || []).filter((e: any) => e.exchanged_qty > 0);
                    const extExchanges = eqLogs.extraExchange || [];
                    const othExchanges = eqLogs.otherExchange || [];
                    const hasExchanges = stdExchanges.length > 0 || extExchanges.length > 0 || othExchanges.length > 0;
                    const extraInventory = getExtraInventory(selectedBooking);

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
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 border-dashed text-center text-gray-400 font-bold">No photos uploaded for this job.</div>
                          )}
                        </div>

                        {/* EQUIPMENT EXCHANGE */}
                        {hasExchanges && (
                          <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><RefreshCcw size={18} className="text-amber-500"/> Equipment Exchange Log</h3>
                            <div className="bg-white border border-amber-100 rounded-3xl p-5 shadow-sm space-y-3">
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
                              {[...extExchanges, ...othExchanges].map((item: any, idx: number) => (
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

                        {/* EXTRA PROVIDE (BILLED / PENDING) */}
                        {extraInventory.length > 0 && (
                          <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><PackagePlus size={18} className="text-indigo-500"/> Extra Equipment Billed</h3>
                            <div className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-sm space-y-4">
                              {extraInventory.map((item: any) => (
                                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                                  <div>
                                    <p className="font-black text-gray-900 text-sm">{item.name}</p>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100 px-2 py-0.5 rounded w-fit mt-1">
                                      {item.type === 'extra_provide' ? 'Extra Provide' : 'Custom Provide'}
                                    </p>
                                    {item.remarks && <p className="text-xs font-medium text-gray-500 mt-1">Remarks: {item.remarks}</p>}
                                  </div>
                                  <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
                                    <div className="text-center px-4 border-r border-gray-100">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase">Qty</p>
                                      <p className="font-black text-gray-900">{item.qty}</p>
                                    </div>
                                    <div className="text-center px-4">
                                      <p className="text-[9px] font-black text-indigo-400 uppercase">Total Price</p>
                                      <p className={`font-black ${item.price === 'Pending Audit' ? 'text-amber-600 text-xs' : 'text-indigo-700'}`}>{item.price}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section C: Checklist Verification */}
                        <div>
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
