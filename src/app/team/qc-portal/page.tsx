
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, ClipboardCheck, Building2, Calendar, 
  Clock, Package, AlertTriangle, CheckCircle2, ShieldCheck, 
  ArrowRight, Search, X, ArrowLeft, User, History
} from "lucide-react";
import { format } from "date-fns";

function QCPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source'); // 'admin' | 'supervisor' | null
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data States
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState("");
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any>({}); // Store user profiles mapping
  
  // Selection States
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [qcItems, setQcItems] = useState<any[]>([]);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // 1. Fetch Master Data
  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/team/qc-login');
      return;
    }
    setCurrentUser(session.user);

    // Fetch logs (Added work_logs)
    const { data: logsData } = await supabase
      .from('booking_inventory_logs')
      .select(`
        id, equipment_id, collected_qty, qc_status, qc_good_qty, qc_bad_qty, qc_completed_at, qc_completed_by,
        equipment_master ( item_name, current_stock ),
        booking_id,
        bookings!inner ( 
          id, booking_ref, cleaning_date, cleaning_time, service_type, 
          units!inner ( id, unit_number, building_name, companies ( name ) ),
          work_logs ( end_time, submitted_by )
        )
      `)
      .gt('collected_qty', 0)
      .order('created_at', { ascending: false });

    if (logsData) {
      // Fetch user profiles for Tracking & Shift Submitters
      const userIds = new Set();
      logsData.forEach((l: any) => {
        if (l.qc_completed_by) userIds.add(l.qc_completed_by);
        if (l.bookings?.work_logs?.[0]?.submitted_by) userIds.add(l.bookings.work_logs[0].submitted_by);
      });

      if (userIds.size > 0) {
        // 🚨 ADDED: avatar_url
        const { data: profData } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', Array.from(userIds));
        if (profData) {
          // Object হিসেবে সেভ করা হলো যাতে নাম ও DP দুটোই পাওয়া যায়
          const profMap = profData.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
          setProfiles(profMap);
        }
      }

      // Group by Booking ID
      const uniqueBookingsMap = new Map();
      logsData.forEach((log: any) => {
        if (!uniqueBookingsMap.has(log.booking_id)) {
          uniqueBookingsMap.set(log.booking_id, {
            ...log.bookings,
            status: log.qc_status, // Status is based on the logs
            logs: []
          });
        }
        uniqueBookingsMap.get(log.booking_id).logs.push(log);
      });

      setAllBookings(Array.from(uniqueBookingsMap.values()));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Filter & Group Data
  const filteredBookings = allBookings.filter(b => {
    // Tab Filter
    const isTabMatch = activeTab === 'pending' ? b.logs.some((l:any) => l.qc_status === 'pending') : b.logs.every((l:any) => l.qc_status === 'completed');
    if (!isTabMatch) return false;

    // Search Filter
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      b.id.toString().includes(searchLower) ||
      (b.booking_ref && b.booking_ref.toLowerCase().includes(searchLower)) ||
      b.units?.unit_number?.toLowerCase().includes(searchLower) ||
      b.units?.companies?.name?.toLowerCase().includes(searchLower)
    );
  });

  // 2. Filter & Group Data (Date-wise)
  const groupedBookings = filteredBookings.reduce((acc: any, b: any) => {
    const dateStr = b.cleaning_date;
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {});

  // Sort dates (newest first)
  const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());


  // 3. Handlers
  const handleSelectBooking = (booking: any) => {
    setSelectedBooking(booking);
    const preparedItems = booking.logs.map((log: any) => ({
      ...log,
      good: log.qc_status === 'completed' ? log.qc_good_qty : 0,
      bad: log.qc_status === 'completed' ? log.qc_bad_qty : 0,
      error: ""
    }));
    setQcItems(preparedItems);
    setIsMobileModalOpen(true);
  };

  const closeWorkspace = () => {
    setIsMobileModalOpen(false);
    setTimeout(() => setSelectedBooking(null), 200); // delay to allow unmount animation
  };

  const handleInput = (logId: string, field: 'good' | 'bad', value: string) => {
    if (activeTab === 'completed') return; // Protect completed items
    const num = parseInt(value) || 0;
    setQcItems(prev => prev.map(item => {
      if (item.id === logId) {
        const updated = { ...item, [field]: num };
        const total = updated.good + updated.bad;
        updated.error = total > item.collected_qty ? `Exceeds total (${item.collected_qty})` : "";
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    const hasErrors = qcItems.some(i => i.error || (i.good + i.bad !== i.collected_qty));
    if (hasErrors) return alert("Please ensure all quantities exactly match the total collected items.");

    setSubmitting(true);
    try {
      const logsToUpdate = [];
      const laundryRecordsToInsert = [];
      const transactionLogs = [];

      for (const item of qcItems) {
        logsToUpdate.push({
          id: item.id,
          qc_status: 'completed',
          qc_good_qty: item.good,
          qc_bad_qty: item.bad,
          qc_completed_at: new Date().toISOString(),
          qc_completed_by: currentUser.id // Tracking the user
        });

        if (item.bad > 0) {
          laundryRecordsToInsert.push({
            booking_inventory_log_id: item.id,
            unit_id: selectedBooking.units.id,
            equipment_id: item.equipment_id,
            sent_qty: item.bad,
            status: 'pooled_dirty' // 🚨 FIXED: Now goes to Supervisor's Pool
          });
        }

        if (item.good > 0) {
          const newStock = (item.equipment_master?.current_stock || 0) + item.good;
          transactionLogs.push({
            equipment_id: item.equipment_id,
            transaction_type: 'in',
            quantity: item.good,
            reference_type: 'qc_good_return',
            unit_id: selectedBooking.units.id,
            booking_id: selectedBooking.id,
            balance_after: newStock,
            remarks: `Returned from Unit after QC (Unused)`
          });
          await supabase.from('equipment_master').update({ current_stock: newStock }).eq('id', item.equipment_id);
        }
      }

      await Promise.all([
        supabase.from('booking_inventory_logs').upsert(logsToUpdate),
        transactionLogs.length > 0 ? supabase.from('inventory_transaction_logs').insert(transactionLogs) : Promise.resolve(),
        laundryRecordsToInsert.length > 0 ? supabase.from('laundry_records').insert(laundryRecordsToInsert) : Promise.resolve()
      ]);

      alert("QC Processed Successfully!");
      closeWorkspace();
      fetchData(); 

    } catch (error: any) {
      alert("Error processing QC: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigationBack = async () => {
    if (source === 'admin') router.push('/admin/dashboard');
    else if (source === 'supervisor') router.push('/supervisor/dashboard');
    else {
      await supabase.auth.signOut();
      router.push('/');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 size-12"/></div>;

  // Workspace View (Desktop right side or Mobile Modal)
  const WorkspaceView = () => (
    <div className="flex-1 flex flex-col h-full bg-[#F4F7FA] relative">
      <div className="bg-white p-4 md:p-6 shadow-sm border-b border-gray-100 shrink-0 flex items-start md:items-center gap-4">
        
        {/* 🚨 NEW: Prominent Mobile Back Button */}
        <button onClick={closeWorkspace} className="md:hidden mt-1 p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700 shrink-0 transition-colors">
          <ArrowLeft size={20}/>
        </button>

        <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <span className={`font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border mb-2 inline-block ${activeTab === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
              Ref: {selectedBooking.booking_ref || selectedBooking.id} • {activeTab}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">Unit {selectedBooking.units?.unit_number}</h2>
            <p className="text-xs md:text-sm font-bold text-gray-500 mt-1 flex items-center gap-2"><Building2 size={14}/> {selectedBooking.units?.building_name} • {selectedBooking.units?.companies?.name}</p>
          </div>
          <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 w-fit">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">Collected Items</span>
              <span className="text-xl font-black text-orange-600">{qcItems.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          {qcItems.map((item) => (
            <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${activeTab === 'completed' ? 'border-emerald-100 opacity-90' : 'border-gray-100 hover:border-indigo-200'}`}>
              <div className="flex-1">
                <h3 className="font-black text-lg text-gray-800 mb-1">{item.equipment_master?.item_name}</h3>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest bg-gray-100 w-fit px-2 py-1 rounded">Collected: {item.collected_qty}</p>
                
                {/* Audit Trail for Completed Items */}
                {activeTab === 'completed' && item.qc_completed_by && (
                  <p className="text-[10px] font-bold text-gray-400 mt-3 flex items-center gap-1">
                    <User size={12}/> Checked by {profiles[item.qc_completed_by]?.full_name || profiles[item.qc_completed_by]?.username || 'Staff'} • {format(new Date(item.qc_completed_at), 'dd MMM, hh:mm a')}
                  </p>
                )}
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <div className="flex-1 md:w-24">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">Good (Stock)</label>
                  <input 
                    type="number" min="0" max={item.collected_qty} disabled={activeTab === 'completed'}
                    value={item.good === 0 && item.bad === 0 && activeTab === 'pending' ? '' : item.good} 
                    onChange={(e) => handleInput(item.id, 'good', e.target.value)}
                    className="w-full p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-900 text-center disabled:opacity-70 disabled:bg-emerald-100/30"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1 md:w-24">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1.5 block">Bad (Laundry)</label>
                  <input 
                    type="number" min="0" max={item.collected_qty} disabled={activeTab === 'completed'}
                    value={item.good === 0 && item.bad === 0 && activeTab === 'pending' ? '' : item.bad} 
                    onChange={(e) => handleInput(item.id, 'bad', e.target.value)}
                    className="w-full p-2.5 bg-red-50/50 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-black text-red-900 text-center disabled:opacity-70 disabled:bg-red-100/30"
                    placeholder="0"
                  />
                </div>
              </div>

              {activeTab === 'pending' && (
                <div className="w-full md:w-28 flex flex-col justify-center shrink-0">
                  {item.error ? (
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12}/> {item.error}</p>
                  ) : (item.good + item.bad !== item.collected_qty) ? (
                    <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1"><AlertTriangle size={12}/> Match Total</p>
                  ) : (
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 bg-emerald-50 p-1.5 rounded"><CheckCircle2 size={14}/> Ready</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="bg-white p-4 md:p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border-t border-gray-100 shrink-0">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-gray-500 hidden md:flex items-center gap-2">
              <ShieldCheck className="text-indigo-400" size={18}/> Verify carefully. Data is read-only after submission.
            </p>
            <button 
              onClick={handleSubmit} disabled={submitting}
              className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {submitting ? <><Loader2 className="animate-spin" size={20}/> Processing...</> : <>Submit & Lock QC <ArrowRight size={18}/></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-[#F4F7FA] font-sans flex overflow-hidden">
      
      {/* ======================= LEFT SIDEBAR (LIST VIEW) ======================= */}
      <div className={`w-full md:w-[350px] lg:w-[400px] bg-white border-r border-gray-200 flex flex-col h-full shadow-2xl z-20 shrink-0 ${isMobileModalOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header & Navigation */}
        <div className="bg-gray-900 text-white p-5 shadow-md shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-black flex items-center gap-2"><ClipboardCheck className="text-indigo-400"/> QC Portal</h1>
            <button onClick={handleNavigationBack} className="text-xs font-bold text-gray-300 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
              {source ? <><ArrowLeft size={14}/> Back to {source}</> : <><User size={14}/> Logout</>}
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-black/40 p-1 rounded-xl mb-4">
            <button onClick={() => setActiveTab('pending')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'pending' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Pending QC</button>
            <button onClick={() => setActiveTab('completed')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'completed' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>Completed</button>
          </div>

          {/* Search */}
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
             <input 
               type="text" 
               placeholder="Search by ID, Unit, Company..." 
               value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-white/10 border border-white/10 text-white placeholder-gray-500 text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl outline-none focus:border-indigo-500"
             />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-gray-50/50">
          {Object.keys(groupedBookings).length === 0 ? (
            <div className="text-center p-8 mt-10">
              {activeTab === 'pending' ? <CheckCircle2 size={40} className="mx-auto text-gray-300 mb-3"/> : <History size={40} className="mx-auto text-gray-300 mb-3"/>}
              <p className="font-black text-gray-500">{activeTab === 'pending' ? 'All Caught Up!' : 'No Records Found'}</p>
            </div>
          ) : (
            sortedDates.map((dateStr) => (
              <div key={dateStr} className="mb-6">
                <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                  <Calendar size={14}/> {format(new Date(dateStr), 'EEEE, dd MMM yyyy')}
                </h3>
                <div className="space-y-3">
                  {groupedBookings[dateStr].map((b: any) => (
                    <div 
                      key={b.id} onClick={() => handleSelectBooking(b)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedBooking?.id === b.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-indigo-600' : 'bg-white hover:bg-indigo-50 border-gray-200 shadow-sm'}`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className={`font-black text-base leading-none ${selectedBooking?.id === b.id ? 'text-white' : 'text-gray-900'}`}>Unit {b.units?.unit_number}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${selectedBooking?.id === b.id ? 'bg-white/20 text-white' : activeTab === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {b.logs.length} Items
                        </span>
                      </div>
                      <p className={`text-[11px] font-bold flex items-center gap-1.5 ${selectedBooking?.id === b.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                        <Building2 size={12}/> {b.units?.companies?.name}
                      </p>
                      <p className={`text-[10px] font-bold mt-1.5 px-2 py-1 rounded w-fit ${selectedBooking?.id === b.id ? 'bg-white/10 text-indigo-100' : 'bg-gray-100 text-gray-500'}`}>
                        Ref: {b.booking_ref || b.id}
                      </p>

                      {/* 🚨 UPDATED: Shift Submitter & QC Submitter Info */}
                      {(() => {
                        const workLog = b.work_logs?.[0];
                        const shiftSubmitter = workLog?.submitted_by ? profiles[workLog.submitted_by] : null;
                        
                        // QC Submitter (Assuming all items in a booking are QC'd by the same person)
                        const qcSubmitterId = b.logs?.[0]?.qc_completed_by;
                        const qcSubmitter = qcSubmitterId ? profiles[qcSubmitterId] : null;
                        
                        return (
                          <div className={`mt-3 pt-3 border-t flex flex-col gap-2.5 ${selectedBooking?.id === b.id ? 'border-indigo-400/30' : 'border-gray-100'}`}>
                            
                            {/* --- Shift Info --- */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${selectedBooking?.id === b.id ? 'bg-white/10 text-indigo-200' : 'bg-gray-100 text-gray-500'}`}>
                                  Shift
                                </span>
                                {shiftSubmitter ? (
                                  <div className="flex items-center gap-1.5">
                                    {shiftSubmitter.avatar_url ? (
                                      <img src={shiftSubmitter.avatar_url} alt="DP" className="w-4 h-4 rounded-full object-cover border border-white/50 shadow-sm" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-black text-indigo-700 shadow-sm">
                                        {(shiftSubmitter.full_name || shiftSubmitter.username || 'S')[0].toUpperCase()}
                                      </div>
                                    )}
                                    <span className={`text-[10px] font-bold line-clamp-1 max-w-[80px] ${selectedBooking?.id === b.id ? 'text-indigo-100' : 'text-gray-600'}`}>
                                      {shiftSubmitter.full_name || shiftSubmitter.username}
                                    </span>
                                  </div>
                                ) : (
                                  <span className={`text-[10px] font-bold ${selectedBooking?.id === b.id ? 'text-indigo-200/50' : 'text-gray-400'}`}>No Shift Data</span>
                                )}
                              </div>
                              {workLog?.end_time && (
                                <span className={`text-[9px] font-bold flex items-center gap-1 ${selectedBooking?.id === b.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                                  <CheckCircle2 size={10}/> {format(new Date(workLog.end_time), 'hh:mm a')}
                                </span>
                              )}
                            </div>

                            {/* --- QC Info (Shows only in Completed Tab) --- */}
                            {activeTab === 'completed' && qcSubmitter && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${selectedBooking?.id === b.id ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-600'}`}>
                                    QC By
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {qcSubmitter.avatar_url ? (
                                      <img src={qcSubmitter.avatar_url} alt="DP" className="w-4 h-4 rounded-full object-cover border border-white/50 shadow-sm" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[8px] font-black text-emerald-700 shadow-sm">
                                        {(qcSubmitter.full_name || qcSubmitter.username || 'Q')[0].toUpperCase()}
                                      </div>
                                    )}
                                    <span className={`text-[10px] font-bold line-clamp-1 max-w-[80px] ${selectedBooking?.id === b.id ? 'text-indigo-100' : 'text-gray-600'}`}>
                                      {qcSubmitter.full_name || qcSubmitter.username}
                                    </span>
                                  </div>
                                </div>
                                {b.logs?.[0]?.qc_completed_at && (
                                  <span className={`text-[9px] font-bold flex items-center gap-1 ${selectedBooking?.id === b.id ? 'text-emerald-200' : 'text-emerald-500'}`}>
                                    <ShieldCheck size={10}/> {format(new Date(b.logs[0].qc_completed_at), 'hh:mm a')}
                                  </span>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })()}

                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

        </div>
      </div>

      {/* ======================= DESKTOP WORKSPACE ======================= */}
      <div className="hidden md:flex flex-1 relative h-full">
        {!selectedBooking ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative z-10">
            <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center mx-auto mb-6 border-4 border-dashed border-gray-200">
              <Package size={40} className="text-gray-300"/>
            </div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Select a Booking</h2>
            <p className="text-gray-500 text-sm font-bold mt-2 max-w-sm mx-auto">Choose a unit from the list to view or process quality control.</p>
          </div>
        ) : (
          <WorkspaceView />
        )}
      </div>

      {/* ======================= MOBILE SLIDE-OVER MODAL ======================= */}
      <AnimatePresence>
        {isMobileModalOpen && (
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-50 md:hidden bg-white flex flex-col shadow-2xl"
          >
            <WorkspaceView />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Suspense Boundary wrapper for useSearchParams
export default function GlobalQCPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 size-12"/></div>}>
      <QCPortalContent />
    </Suspense>
  );
}
