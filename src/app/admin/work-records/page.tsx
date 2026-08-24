'use client';
import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Filter, Clock, Calendar, 
  MapPin, AlertCircle, Camera, 
  ChevronDown, FileCheck, CheckSquare, Users, PackagePlus, AlertTriangle, Search, Activity, FileSpreadsheet, Wallet, X
} from "lucide-react";
import { format, differenceInMinutes, parseISO, startOfMonth, endOfMonth } from "date-fns";
import WorkAuditModal from "./WorkAuditModal";

export default function WorkRecords() {
  const supabase = createClient();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);

  // --- Filter States ---
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHasExtra, setFilterHasExtra] = useState(false);
  
  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const searchShortcuts = [
    { label: 'Lost and Found', value: 'Lost and Found' },
    { label: 'Extra Price', value: 'Extra Price' },
    { label: 'Extra Inventory', value: 'Extra Inventory' },
    { label: 'Damaged Items', value: 'Damaged Items' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Modal State ---
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // --- Fetch Static Data ---
  useEffect(() => {
    const fetchStaticData = async () => {
      const [cRes, pRes, tRes, ucRes] = await Promise.all([
        supabase.from('companies').select('name').order('name'),
        supabase.from('profiles').select('id, full_name, avatar_url'),
        supabase.from('checklist_templates').select('id, title, content'),
        supabase.from('unit_equipment_config').select('unit_id, equipment_id, standard_qty, extra_unit_price'),
      ]);
      if (cRes.data) setCompanies(cRes.data);
      if (pRes.data) setProfiles(pRes.data);
      if (tRes.data) setChecklistTemplates(tRes.data);
      if (ucRes.data) setUnitConfigs(ucRes.data);
    };
    fetchStaticData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Fetch Bookings ---
  const fetchRecords = async () => {
    setLoading(true);

    let query = supabase
      .from('bookings')
      .select(`
        id, cleaning_date, cleaning_time, service_type, status, price, invoice_no, booking_ref,
        checklist_template_id, unit_id,
        teams ( team_name, member_ids ),
        units ( unit_number, building_name, layout, companies ( name ) ),
        work_logs (
          id, start_time, end_time,
          before_photos, photo_urls, cost,
          damaged_items, lost_found_items,
          agent:profiles!work_logs_submitted_by_fkey ( full_name, avatar_url )
        ),
        booking_inventory_logs (
          id, equipment_id, base_provide_qty, extra_provided_qty, final_provided_qty,
          target_collect_qty, collected_qty, shortage_qty, qc_status,
          supervisor_price, remarks,
          equipment_master ( item_name, item_type )
        ),
        booking_extra_added_charges (
          id, charge_type, item_description, amount
        )
      `)
      .in('status', ['completed', 'finalized'])
      .gte('cleaning_date', dateFrom)
      .lte('cleaning_date', dateTo)
      .order('id', { ascending: false });

    if (filterStatus) query = query.eq('status', filterStatus);

    const { data, error } = await query;
    if (error) {
      console.error("Bookings fetch error:", error.message);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, filterStatus]);

  // --- Helpers ---
  const getExtraInventory = (booking: any) => {
    const logs = booking.booking_inventory_logs || [];
    return logs
      .filter((i: any) => i.extra_provided_qty > 0)
      .map((i: any) => {
        const config = unitConfigs.find(
          (c: any) => c.unit_id === booking.unit_id && c.equipment_id === i.equipment_id
        );
        const unitPrice =
          i.supervisor_price !== null && i.supervisor_price !== undefined
            ? Number(i.supervisor_price)
            : Number(config?.extra_unit_price || 0);
        const totalPrice = i.extra_provided_qty * unitPrice;
        return {
          id: i.id,
          name: i.equipment_master?.item_name || 'Unknown',
          qty: i.extra_provided_qty,
          unitPrice,
          totalPrice,
          priceLabel: unitPrice > 0 ? `AED ${totalPrice.toFixed(2)}` : 'Pending Audit',
          remarks: i.remarks,
        };
      });
  };

  // --- Local Filters ---
  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    
    // Sort globally first: latest date and latest time first
    result.sort((a, b) => {
      const dateA = new Date(a.cleaning_date).getTime();
      const dateB = new Date(b.cleaning_date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      const timeA = a.cleaning_time ? new Date(`1970-01-01T${a.cleaning_time}`).getTime() : 0;
      const timeB = b.cleaning_time ? new Date(`1970-01-01T${b.cleaning_time}`).getTime() : 0;
      return timeB - timeA;
    });

    if (filterCompany) {
      result = result.filter(b => {
        const name = Array.isArray(b.units?.companies)
          ? b.units.companies[0]?.name
          : b.units?.companies?.name;
        return name === filterCompany;
      });
    }

    if (filterHasExtra) {
      result = result.filter(b => getExtraInventory(b).length > 0 || (b.booking_extra_added_charges?.length > 0));
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => {
        const matchesRef = b.booking_ref?.toLowerCase().includes(q) || false;
        
        const hasLostAndFound = b.work_logs?.[0]?.lost_found_items?.photos?.length > 0 || !!b.work_logs?.[0]?.lost_found_items?.remarks;
        const hasExtraPrice = b.booking_extra_added_charges?.length > 0;
        const hasExtraInventory = getExtraInventory(b).length > 0;
        const hasDamagedItems = b.work_logs?.[0]?.damaged_items?.photos?.length > 0 || !!b.work_logs?.[0]?.damaged_items?.remarks;

        if (q.includes('lost') && q.includes('found')) return hasLostAndFound || matchesRef;
        if (q.includes('extra price')) return hasExtraPrice || matchesRef;
        if (q.includes('extra inventory')) return hasExtraInventory || matchesRef;
        if (q.includes('damage')) return hasDamagedItems || matchesRef;

        return matchesRef;
      });
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, filterCompany, filterHasExtra, unitConfigs, searchQuery]);

  // --- Quick Stats ---
  const stats = useMemo(() => {
    let totalExtra = 0;
    let pendingAudits = 0;

    filteredBookings.forEach(b => {
      if (b.status === 'completed') pendingAudits++;
      
      const extras = getExtraInventory(b);
      const extraCharges = b.booking_extra_added_charges || [];
      const extraInvTotal = extras.reduce((sum: number, inv: any) => sum + inv.totalPrice, 0);
      const extraChgTotal = extraCharges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      totalExtra += (extraInvTotal + extraChgTotal);
    });

    return { totalBookings: filteredBookings.length, totalExtra, pendingAudits };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBookings]);

  // --- Pagination & Infinite Scroll ---
  const [visibleCount, setVisibleCount] = useState(15);
  const currentItems = filteredBookings.slice(0, visibleCount);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < filteredBookings.length) {
        setVisibleCount(prev => prev + 15);
      }
    }, { threshold: 0.1 });
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [visibleCount, filteredBookings.length]);

  // --- Group by Date ---
  const groupedBookings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    currentItems.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    const sortedDates = Object.keys(groups).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    sortedDates.forEach(date => {
      groups[date].sort((a, b) => {
        const tA = a.cleaning_time ? new Date(`1970-01-01T${a.cleaning_time}`).getTime() : 0;
        const tB = b.cleaning_time ? new Date(`1970-01-01T${b.cleaning_time}`).getTime() : 0;
        return tB - tA;
      });
    });
    return { groups, sortedDates };
  }, [currentItems]);

  // --- Helpers ---
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

  // --- Export to CSV ---
  const handleExportCSV = () => {
    const headers = ['Date', 'Shift Time', 'Booking ID', 'Company', 'Unit', 'Status', 'Total Charged (AED)'];
    
    const rows = filteredBookings.map(b => {
      const companyName = Array.isArray(b.units?.companies)
        ? b.units.companies[0]?.name
        : b.units?.companies?.name || 'Unknown';
      
      const extras = getExtraInventory(b);
      const extraCharges = b.booking_extra_added_charges || [];
      const extraInvTotal = extras.reduce((sum: number, inv: any) => sum + inv.totalPrice, 0);
      const extraChgTotal = extraCharges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      const grandTotal = Number(b.price || 0) + extraInvTotal + extraChgTotal;

      return [
        b.cleaning_date,
        b.cleaning_time,
        b.booking_ref || '',
        `"${companyName}"`,
        `"${b.units?.unit_number || ''} - ${b.units?.building_name || ''}"`,
        b.status,
        grandTotal.toFixed(2)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `work_records_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='min-h-screen bg-[#F4F7FA] pb-24 font-sans relative overflow-hidden'>

      {/* --- HEADER (z-index 40 fixes dropdown overlap) --- */}
      <div className='bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-16 md:pb-24 px-4 md:px-8 shadow-2xl relative z-40 mb-16'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none'></div>
        <div className='relative z-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <p className='text-blue-300 font-bold uppercase tracking-widest text-xs mb-1'>Quality Control</p>
            <h1 className='text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3'>
              <FileCheck className='text-blue-500' size={32}/> Work Logs & Audits
            </h1>
          </motion.div>
          
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className='flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto relative z-50'>
            {/* Advanced Search */}
            <div className='relative w-full md:w-72' ref={searchRef}>
              <div className='relative flex items-center'>
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder='Search ID or keywords...'
                  className='w-full pl-10 pr-10 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold text-sm text-white placeholder-gray-400 outline-none transition-all backdrop-blur-md'
                />
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors'
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {showSearchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className='absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[100]'
                  >
                    <div className='p-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50'>Quick Filters</div>
                    {searchShortcuts.map((shortcut) => (
                      <button
                        key={shortcut.value}
                        onClick={() => {
                          setSearchQuery(shortcut.value);
                          setShowSearchDropdown(false);
                        }}
                        className='w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors'
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button
              onClick={handleExportCSV}
              className='px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-100 rounded-xl font-black transition-all flex items-center justify-center gap-2 backdrop-blur-md'
            >
              <FileSpreadsheet size={18}/> Export
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className='px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-black transition-all flex items-center justify-center gap-2 backdrop-blur-md'
            >
              <Filter size={18}/> Filters{ ' ' }
              <motion.div animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={18} />
              </motion.div>
            </button>
          </motion.div>
        </div>

        {/* --- STATS DASHBOARD (Pill-shaped, floating half outside) --- */}
        {!loading && (
          <div className='absolute bottom-0 left-4 right-4 md:left-8 md:right-8 translate-y-1/2 z-40 pointer-events-none'>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, staggerChildren: 0.1 }}
              className='grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-auto'
            >
              <motion.div whileHover={{ scale: 1.02 }} className='bg-white/95 backdrop-blur-xl p-4 md:p-5 rounded-full shadow-lg border border-gray-100 flex items-center justify-center gap-4 cursor-default'>
                <div className='p-3 bg-blue-50 text-blue-600 rounded-full'><Activity size={20}/></div>
                <div>
                  <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>Total Records</p>
                  <p className='text-xl md:text-2xl font-black text-gray-900'>{stats.totalBookings}</p>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} className='bg-white/95 backdrop-blur-xl p-4 md:p-5 rounded-full shadow-lg border border-gray-100 flex items-center justify-center gap-4 cursor-default'>
                <div className='p-3 bg-orange-50 text-orange-600 rounded-full'><Wallet size={20}/></div>
                <div>
                  <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>Extra Revenue</p>
                  <p className='text-xl md:text-2xl font-black text-gray-900'>AED {stats.totalExtra.toFixed(2)}</p>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} className='bg-white/95 backdrop-blur-xl p-4 md:p-5 rounded-full shadow-lg border border-gray-100 flex items-center justify-center gap-4 cursor-default'>
                <div className='p-3 bg-rose-50 text-rose-600 rounded-full'><FileCheck size={20}/></div>
                <div>
                  <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>Pending Audits</p>
                  <p className='text-xl md:text-2xl font-black text-gray-900'>{stats.pendingAudits}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>

      <div className='px-4 md:px-8 relative z-20'>

        {/* --- FILTERS PANEL --- */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }} 
              animate={{ opacity: 1, height: 'auto', y: 0 }} 
              exit={{ opacity: 0, height: 0, y: -20 }}
              className='bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 mb-8 overflow-hidden'
            >
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
                <div>
                  <label className='text-[10px] font-bold text-gray-400 uppercase'>From Date</label>
                  <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900'/>
                </div>
                <div>
                  <label className='text-[10px] font-bold text-gray-400 uppercase'>To Date</label>
                  <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900'/>
                </div>
                <div>
                  <label className='text-[10px] font-bold text-gray-400 uppercase'>Company</label>
                  <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900'>
                    <option value=''>All Companies</option>
                    {companies.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className='text-[10px] font-bold text-gray-400 uppercase'>Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900'>
                    <option value=''>All Statuses</option>
                    <option value='completed'>Needs Audit</option>
                    <option value='finalized'>Finalized</option>
                  </select>
                </div>
                <div className='flex items-end'>
                  <label className='flex items-center justify-center gap-2 cursor-pointer p-3 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl w-full h-[46px] transition-colors'>
                    <input type='checkbox' checked={filterHasExtra} onChange={e => setFilterHasExtra(e.target.checked)} className='w-4 h-4 accent-indigo-600'/>
                    <span className='text-xs font-black text-indigo-900'>Has Extra Charges</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- CONTENT --- */}
        {loading ? (
          <div className='space-y-6 mt-4'>
            {[1, 2, 3].map(i => (
              <div key={i} className='bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 animate-pulse ml-8'>
                <div className='flex justify-between mb-6'>
                   <div className='space-y-3 w-1/2'>
                     <div className='h-4 bg-gray-200 rounded w-1/3'></div>
                     <div className='h-6 bg-gray-200 rounded w-3/4'></div>
                     <div className='h-4 bg-gray-200 rounded w-1/2'></div>
                   </div>
                   <div className='h-8 bg-gray-200 rounded w-20'></div>
                </div>
                <div className='h-12 bg-gray-100 rounded-xl mb-4'></div>
                <div className='h-12 bg-gray-200 rounded-xl'></div>
              </div>
            ))}
          </div>
        ) : groupedBookings.sortedDates.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className='bg-white p-12 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm'>
            <CheckSquare size={56} className='mx-auto mb-4 opacity-30 text-blue-500'/>
            <p className='text-xl font-black text-gray-800'>No work records found.</p>
            <p className='text-sm mt-2'>Try changing the search or filters.</p>
          </motion.div>
        ) : (
          <motion.div layout className='space-y-10 mt-4 md:mt-0'>
            {groupedBookings.sortedDates.map(dateStr => (
              <motion.div layout key={dateStr} className='space-y-5'>

                {/* Pill Style Date Header */}
                <motion.div layout className='flex items-center gap-3 pl-2'>
                  <div className='flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100'>
                    <div className='p-1.5 bg-blue-100 text-blue-700 rounded-lg'><Calendar size={16} strokeWidth={2.5}/></div>
                    <h2 className='text-base md:text-lg font-black text-gray-800 tracking-tight'>
                      {format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}
                    </h2>
                  </div>
                  <div className='h-px bg-gray-300 flex-1 ml-2 hidden md:block'></div>
                </motion.div>

                {/* Timeline */}
                <div className='relative border-l-2 border-gray-200 ml-4 md:ml-6 space-y-6 pb-4'>
                  {groupedBookings.groups[dateStr].map((booking) => {
                    const workLog = booking.work_logs?.[0];
                    const members = getTeamMembers(booking.teams?.member_ids);
                    const isFinalized = booking.status === 'finalized';
                    const companyName = Array.isArray(booking.units?.companies)
                      ? booking.units.companies[0]?.name
                      : booking.units?.companies?.name;

                    // Billing Calcs
                    const extras = getExtraInventory(booking);
                    const extraCharges = booking.booking_extra_added_charges || [];
                    const extraInvTotal = extras.reduce((sum: number, inv: any) => sum + inv.totalPrice, 0);
                    const extraChgTotal = extraCharges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
                    const grandTotal = Number(booking.price || 0) + extraInvTotal + extraChgTotal;
                    
                    const hasLostAndFound = workLog?.lost_found_items?.photos?.length > 0 || !!workLog?.lost_found_items?.remarks;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.005 }}
                        transition={{ duration: 0.2 }}
                        key={booking.id}
                        className='relative pl-8 md:pl-10'
                      >
                        {/* Timeline dot */}
                        <div className='absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-[#F4F7FA] shadow-sm'></div>

                        <div className='bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all'>

                          {/* Top row */}
                          <div className='flex flex-col md:flex-row justify-between items-start mb-4 border-b border-gray-50 pb-4 gap-4 md:gap-0'>
                            <div>
                              <div className='flex flex-wrap items-center gap-3 mb-2'>
                                <span className='text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5'>
                                  <Calendar size={14} className='text-blue-400'/> {format(parseISO(booking.cleaning_date), 'dd MMM yyyy')}
                                </span>
                                <span className='text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5'>
                                  <Clock size={14} className='text-blue-400'/> Shift: {booking.cleaning_time}
                                </span>
                                {booking.booking_ref && (
                                  <span className='px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black tracking-wider border border-blue-100'>
                                    ID: {booking.booking_ref}
                                  </span>
                                )}
                              </div>
                              <h3 className='text-xl font-black text-gray-900 flex flex-wrap items-center gap-3 mt-1'>
                                {companyName || 'Unknown Company'}
                                {hasLostAndFound && (
                                  <span className='px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black tracking-widest uppercase border border-rose-100 flex items-center gap-1'>
                                    Lost & Found
                                  </span>
                                )}
                              </h3>
                              <p className='text-sm font-bold text-gray-500 flex items-center gap-1.5 mt-1'>
                                <MapPin size={14}/> Unit {booking.units?.unit_number} - {booking.units?.building_name}
                              </p>
                              <p className='text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md mt-2 inline-block border border-gray-200'>{booking.service_type}</p>
                            </div>
                            <div className='flex flex-col items-start md:items-end gap-1.5'>
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block ${isFinalized ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {booking.status}
                              </span>
                              {isFinalized && grandTotal > 0 && (
                                <span className='text-sm font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200'>
                                  Total: AED {grandTotal.toFixed(2)}
                                </span>
                              )}
                              {booking.invoice_no && (
                                <span className='text-[10px] font-bold text-gray-500 flex items-center gap-1'>
                                  <FileCheck size={12} className='text-green-500'/> {booking.invoice_no}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Extra Inventory Billed */}
                          {extras.length > 0 && (
                            <div className='mb-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl'>
                              <p className='text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1'>
                                <PackagePlus size={12}/> Extra Provide Billed
                              </p>
                              <div className='space-y-1.5'>
                                {extras.map((inv: any) => (
                                  <div key={inv.id} className='flex justify-between items-center text-xs'>
                                    <span className='font-bold text-indigo-900'>{inv.qty}x {inv.name}</span>
                                    <span className={`font-black ${inv.priceLabel === 'Pending Audit' ? 'text-amber-600' : 'text-indigo-700'}`}>
                                      {inv.priceLabel}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extra Manual / Damage Charges */}
                          {extraCharges.length > 0 && (
                            <div className='mb-4 p-3 bg-orange-50/70 border border-orange-100 rounded-xl'>
                              <p className='text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-1'>
                                <AlertTriangle size={12}/> Extra Added Charges
                              </p>
                              <div className='space-y-1.5'>
                                {extraCharges.map((chg: any) => (
                                  <div key={chg.id} className='flex justify-between items-center text-xs'>
                                    <span className='font-bold text-orange-900 flex items-center gap-1.5'>
                                      <span className='text-[8px] bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded uppercase tracking-wider'>{chg.charge_type === 'damage' ? 'DMG' : 'MNL'}</span>
                                      {chg.item_description}
                                    </span>
                                    <span className='font-black text-orange-700'>
                                      AED {Number(chg.amount).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Team & Duration row */}
                          <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-4'>
                            <div>
                              <p className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1'>
                                <Users size={12}/> {booking.teams?.team_name}
                              </p>
                              <div className='flex items-center'>
                                {members.map((m: any, i: number) => (
                                  <div key={m.id} className={`w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shadow-sm ${i !== 0 ? '-ml-3' : ''}`}>
                                    {m.avatar_url ? <img src={m.avatar_url} className='w-full h-full object-cover' alt=''/> : m.full_name?.charAt(0) || 'U'}
                                  </div>
                                ))}
                                {workLog && (
                                  <div className='ml-3 text-xs font-bold text-gray-500'>
                                    Submitted by <span className='text-gray-900'>{workLog.agent?.full_name || 'Supervisor'}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {workLog ? (
                              <div className='flex gap-2 w-full md:w-auto'>
                                <div className='flex-1 md:flex-none px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2'>
                                  <Clock size={16} className='text-blue-500'/>
                                  <div>
                                    <p className='text-[9px] font-bold text-gray-400 uppercase'>Duration</p>
                                    <p className='text-xs font-black text-gray-900'>{getDuration(workLog.start_time, workLog.end_time)}</p>
                                  </div>
                                </div>
                                <div className='flex-1 md:flex-none px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2'>
                                  <Camera size={16} className='text-blue-500'/>
                                  <div>
                                    <p className='text-[9px] font-bold text-gray-400 uppercase'>Photos</p>
                                    <p className='text-xs font-black text-gray-900'>{(workLog.before_photos?.length || 0) + (workLog.photo_urls?.length || 0)}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className='text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1'>
                                <AlertCircle size={14}/> No Work Log Found
                              </span>
                            )}
                          </div>

                          {/* View Report Button */}
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className='w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg'
                          >
                            <FileCheck size={18}/> View Full Report
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Infinite Scroll trigger */}
        {visibleCount < filteredBookings.length && (
          <div ref={loadMoreRef} className='flex justify-center mt-10 pt-6 border-t border-gray-200 pb-10'>
            <Loader2 className='animate-spin text-blue-500' size={32} />
          </div>
        )}

      </div>

      {/* --- MODAL --- */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className='fixed inset-0 bg-black/60 backdrop-blur-sm z-40'
            />
            <WorkAuditModal
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
              checklistTemplates={checklistTemplates}
              unitConfigs={unitConfigs}
            />
          </>
        )}
      </AnimatePresence>

    </div>
  );
}