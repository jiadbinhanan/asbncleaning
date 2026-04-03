"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, CheckCircle2, Loader2, AlertCircle, X, 
  MapPin, Sparkles, Building2, ImageIcon, FileCheck, Info, 
  ShieldCheck, Camera, Layers, Clock, Filter, Receipt,
  AlertTriangle, LayoutList, CalendarDays, CircleDashed
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────────────────
type Booking = {
  id: number;
  unit_id: number;
  cleaning_date: string;
  cleaning_time: string;
  service_type: string;
  status: string;
  price: number;
  units: {
    id: number;
    unit_number: string;
    building_name: string;
    layout: string;
  };
  work_logs: {
    before_photos: string[];
    photo_urls: string[]; // After photos
    damaged_items: any;
  }[];
  checklist_templates: {
    title: string;
    content: any[];
  } | null;
  booking_inventory_logs: {
    equipment_id: number;
    extra_provided_qty: number;
    supervisor_price: number | null;
    equipment_master: { item_name: string };
  }[];
  booking_extra_added_charges: {
    amount: number;
    charge_type: string;
    item_description: string;
  }[];
};

type Company = {
  id: number;
  name: string;
};

// ─── Main Portal Component ─────────────────────────────────────────────────
export default function ClientPortal() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  // ─── States ───
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [unitFilter, setUnitFilter] = useState<string>("all");

  // View States
  const [viewMode, setViewMode] = useState<"date" | "unit">("date");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // ─── API 1: Validate Token & Fetch Company ───
  useEffect(() => {
    const authenticatePortal = async () => {
      if (!token) { setError(true); setLoading(false); return; }

      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("portal_token", token)
        .single();

      if (error || !data) {
        setError(true);
        setLoading(false);
      } else {
        setCompany(data);
      }
    };
    authenticatePortal();
  }, [token, supabase]);

  // ─── API 2: Fetch Bookings & Configs ───
  useEffect(() => {
    if (!company?.id) return;

    const fetchCompanyData = async () => {
      setLoading(true);

      // Fetch Bookings
      const { data: bookingsData, error: bError } = await supabase
        .from("bookings")
        .select(`
          id, unit_id, cleaning_date, cleaning_time, service_type, status, price,
          units!inner ( id, unit_number, building_name, layout, company_id ),
          work_logs ( before_photos, photo_urls, damaged_items ),
          checklist_templates ( title, content ),
          booking_inventory_logs ( equipment_id, extra_provided_qty, supervisor_price, equipment_master(item_name) ),
          booking_extra_added_charges ( amount, charge_type, item_description )
        `)
        .eq("units.company_id", company.id)
        .gte("cleaning_date", dateFrom)
        .lte("cleaning_date", dateTo)
        .order("cleaning_date", { ascending: false })
        .order("cleaning_time", { ascending: true });

      // Fetch Unique Units for Filter
      const { data: unitsData } = await supabase
        .from("units")
        .select("id, unit_number, building_name")
        .eq("company_id", company.id)
        .order("unit_number", { ascending: true });

      if (unitsData) setAvailableUnits(unitsData);

      // Fetch Unit Equipment Configs for Pricing Fallback
      if (unitsData && unitsData.length > 0) {
        const unitIds = unitsData.map(u => u.id);
        const { data: configsData } = await supabase
          .from("unit_equipment_config")
          .select("unit_id, equipment_id, extra_unit_price")
          .in("unit_id", unitIds);

        if (configsData) setUnitConfigs(configsData);
      }

      if (!bError && bookingsData) {
        setBookings(bookingsData as any);
      }
      setLoading(false);
    };

    fetchCompanyData();
  }, [company?.id, dateFrom, dateTo, supabase]);

  // ─── Pricing Logic Helper ───
  const calculateBookingTotal = (b: Booking) => {
    let total = Number(b.price || 0);

    // Extra Inventory Cost
    const extraInvs = b.booking_inventory_logs?.filter(l => l.extra_provided_qty > 0) || [];
    extraInvs.forEach(inv => {
      let uPrice = inv.supervisor_price;
      if (uPrice === null) {
        const cfg = unitConfigs.find(c => c.unit_id === b.unit_id && c.equipment_id === inv.equipment_id);
        uPrice = cfg ? cfg.extra_unit_price : 0;
      }
      total += (inv.extra_provided_qty * Number(uPrice));
    });

    // Extra Added Charges
    const charges = b.booking_extra_added_charges || [];
    charges.forEach(chg => {
      total += Number(chg.amount || 0);
    });

    return total;
  };

  // ─── Data Transformations ───
  const filteredBookings = useMemo(() => {
    if (unitFilter === "all") return bookings;
    return bookings.filter(b => b.units.id.toString() === unitFilter);
  }, [bookings, unitFilter]);

  const stats = useMemo(() => {
    const completedBookings = filteredBookings.filter(b => ["completed", "finalized"].includes(b.status.toLowerCase()));
    const finalizedBookings = filteredBookings.filter(b => b.status.toLowerCase() === "finalized");

    // Only sum finalized bookings for invoicing
    const totalAmount = finalizedBookings.reduce((sum, b) => sum + calculateBookingTotal(b), 0);

    let issuesCount = 0;
    completedBookings.forEach(b => {
      if (b.work_logs?.[0]?.damaged_items) issuesCount += 1;
    });

    const qualityScore = completedBookings.length > 0 
      ? Math.round(((completedBookings.length - issuesCount) / completedBookings.length) * 100)
      : 100;

    return {
      total: filteredBookings.length,
      completed: completedBookings.length,
      amount: totalAmount,
      quality: qualityScore,
      issues: issuesCount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBookings, unitConfigs]);

  // ─── Grouping Logic ───
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    return groups;
  }, [filteredBookings]);

  const groupedByUnit = useMemo(() => {
    const groups: Record<string, { unit: any, bookings: Booking[] }> = {};
    filteredBookings.forEach(b => {
      const key = b.units.unit_number;
      if (!groups[key]) groups[key] = { unit: b.units, bookings: [] };
      groups[key].bookings.push(b);
    });
    // Sort bookings within unit by date
    Object.keys(groups).forEach(k => {
      groups[k].bookings.sort((a, b) => new Date(b.cleaning_date).getTime() - new Date(a.cleaning_date).getTime());
    });
    return groups;
  }, [filteredBookings]);

  // ─── Reusable Card Component ───
  const BookingCard = ({ booking, hideUnit = false }: { booking: Booking, hideUnit?: boolean }) => {
    const isDone = ["completed", "finalized"].includes(booking.status.toLowerCase());
    const isFinalized = booking.status.toLowerCase() === "finalized";
    const totalCost = isFinalized ? calculateBookingTotal(booking) : 0;

    return (
      <motion.div 
        layoutId={`card-${booking.id}`}
        onClick={() => setSelectedBooking(booking)}
        className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            {isDone ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12}/> {booking.status}
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                <Loader2 size={12}/> Scheduled
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
              <Clock size={12} className="text-blue-500"/> {booking.cleaning_time}
            </span>
          </div>

          {!hideUnit && (
            <div className="mb-4">
              <h4 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-1">
                Unit {booking.units?.unit_number}
              </h4>
              <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
                <MapPin size={14}/> {booking.units?.building_name}
              </p>
            </div>
          )}
          {hideUnit && (
             <div className="mb-4">
               <h4 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                 {format(parseISO(booking.cleaning_date), 'dd MMM yyyy')}
               </h4>
             </div>
          )}

          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold mb-4">
            <Sparkles size={12} className="text-blue-500"/> {booking.service_type}
          </div>
        </div>

        {/* Footer of Card */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-end mt-2">
          {isFinalized ? (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Final Cost</p>
              <p className="text-base font-black text-slate-900">AED {totalCost.toFixed(2)}</p>
            </div>
          ) : (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cost</p>
              <p className="text-sm font-bold text-slate-400">Pending Audit</p>
            </div>
          )}
          <span className="text-[10px] font-bold text-blue-600 group-hover:underline">View Report →</span>
        </div>
      </motion.div>
    );
  };

  // ─── Render: Invalid Token State ───
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 p-10 rounded-[2rem] text-center max-w-md w-full shadow-2xl">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={56} />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Link Expired</h1>
          <p className="text-sm font-bold text-slate-500">This secure portal link is invalid or has been revoked by the administrator.</p>
        </div>
      </div>
    );
  }

  // ─── Render: Loading State ───
  if (loading && !company) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="animate-spin text-blue-600" size={48} />
           <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Verifying Portal Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-slate-800 font-sans pb-24 selection:bg-blue-200 relative">

      {/* ─── SECTION 1: PREMIUM HERO HEADER ─── */}
      <section className="relative pt-20 pb-36 px-6 lg:px-8 bg-[#0B1121] overflow-hidden">
        {/* Abstract Mesh Gradients for Premium Look */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-6 shadow-sm">
               <Sparkles size={14} /> Service Dashboard
             </div>
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
               Welcome back, <br className="hidden md:block"/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">{company?.name}</span>
             </h1>
             <p className="mt-5 text-slate-400 max-w-xl text-sm md:text-base font-medium leading-relaxed">
               Monitor your property operations in real-time. View detailed service reports, track quality scores, and access complete billing breakdowns seamlessly.
             </p>
          </div>
        </div>
      </section>

      {/* ─── FLOATING FILTER BAR ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20 mb-12">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Filter size={18} />
             </div>
             <p className="text-sm font-black text-slate-800">Filter Records</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Unit Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 w-full md:w-auto">
              <Building2 size={16} className="text-slate-400 shrink-0"/>
              <select 
                value={unitFilter} 
                onChange={(e) => setUnitFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-2 w-full md:w-auto"
              >
                <option value="all">All Properties / Units</option>
                {availableUnits.map(u => (
                  <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full md:w-auto">
              <CalendarDays size={16} className="text-slate-400 shrink-0" />
              <input 
                type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input 
                type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              />
            </div>
          </div>

        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8">

        {/* ─── SECTION 2: STATS SUMMARY ─── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10"
        >
          {/* Total Amount Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-900 border border-blue-800 rounded-[2rem] p-8 relative overflow-hidden shadow-xl text-white">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Receipt size={14}/> Total Invoice Amount (Finalized)
            </p>
            <h2 className="text-4xl md:text-5xl font-black flex items-end gap-2 mt-2">
              <span className="text-2xl text-blue-300 mb-1.5">AED</span> {new Intl.NumberFormat('en-AE').format(stats.amount)}
            </h2>
            <p className="text-xs font-medium text-blue-200 mt-3">Calculated from finalized bookings within the selected date range.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Layers size={14} className="text-blue-500"/> Bookings Count
            </p>
            <h2 className="text-4xl font-black text-slate-900 mb-1">{stats.total}</h2>
            <p className="text-xs font-bold text-slate-500"><span className="text-emerald-600">{stats.completed}</span> completed jobs</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500"/> Quality Score
            </p>
            <h2 className="text-4xl font-black text-slate-900 mb-1">{stats.quality}%</h2>
            <p className="text-xs font-bold text-slate-500">{stats.issues > 0 ? <span className="text-rose-500">{stats.issues} issues reported</span> : 'Perfect record'}</p>
          </div>
        </motion.div>

        {/* ─── SECTION 3: VIEW TOGGLE & FEED ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Service Reports</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Select any card to view detailed before/after photos and reports.</p>
          </div>

          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setViewMode("date")} 
              className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === "date" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              <CalendarDays size={14}/> Date View
            </button>
            <button 
              onClick={() => setViewMode("unit")} 
              className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === "unit" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              <LayoutList size={14}/> Unit View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={48}/></div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-[2rem] p-16 text-center shadow-sm">
             <Calendar size={56} className="mx-auto text-slate-300 mb-4"/>
             <p className="text-2xl font-black text-slate-800 mb-2">No Records Found</p>
             <p className="text-base font-medium text-slate-500">There are no cleaning records matching your filters.</p>
          </div>
        ) : (
          <div className="pb-12">
            {/* ── TIMELINE VIEW (Grouped by Date) ── */}
            {viewMode === "date" && (
              <div className="space-y-12">
                {Object.keys(groupedByDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateStr => (
                  <div key={dateStr}>
                    <div className="flex items-center gap-3 mb-6 pl-2">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><CalendarDays size={18}/></div>
                      <h4 className="text-xl font-black text-slate-800">{format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}</h4>
                      <div className="h-px bg-slate-200 flex-1 ml-4 hidden sm:block"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {groupedByDate[dateStr].map(booking => <BookingCard key={booking.id} booking={booking} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── UNIT VIEW (Grouped by Unit Number) ── */}
            {viewMode === "unit" && (
              <div className="space-y-12">
                {Object.keys(groupedByUnit).sort().map(unitNum => {
                  const group = groupedByUnit[unitNum];
                  return (
                    <div key={unitNum} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <Building2 size={24} className="text-blue-500"/> Unit {unitNum}
                          </h4>
                          <p className="text-sm font-bold text-slate-500 mt-1.5">{group.unit.building_name}</p>
                        </div>
                        <span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                          {group.bookings.length} Bookings Recorded
                        </span>
                      </div>
                      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {group.bookings.map(booking => <BookingCard key={booking.id} booking={booking} hideUnit />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── SECTION 4: DETAILS MODAL (Data-Rich Overlay) ─── */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div 
              layoutId={`card-${selectedBooking.id}`}
              className="relative w-full max-w-5xl bg-white md:rounded-[2.5rem] shadow-2xl h-full md:h-[90vh] flex flex-col overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="text-blue-500" size={24}/> Unit {selectedBooking.units?.unit_number}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 mt-1.5 flex items-center gap-1.5">
                    {selectedBooking.units?.building_name} <span className="text-slate-300">•</span> {format(parseISO(selectedBooking.cleaning_date), 'EEEE, dd MMM yyyy')} <span className="text-slate-300">•</span> {selectedBooking.cleaning_time}
                  </p>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-full transition-colors shadow-sm">
                  <X size={20}/>
                </button>
              </div>

              {/* Modal Body (Scrollable Split View) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                  {/* LEFT COLUMN: Photos & Issues */}
                  <div className="space-y-8">

                    {/* Photos */}
                    <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-500"/> Photo Evidence
                      </h4>

                      {(!selectedBooking.work_logs?.[0]?.before_photos?.length && !selectedBooking.work_logs?.[0]?.photo_urls?.length) ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-10 text-center">
                          <Camera size={40} className="mx-auto text-slate-300 mb-3"/>
                          <p className="text-sm font-bold text-slate-500">No photos were uploaded for this task.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {selectedBooking.work_logs?.[0]?.before_photos?.length > 0 && (
                            <div>
                              <p className="text-xs font-black text-slate-500 mb-3 uppercase tracking-wider">Before Condition</p>
                              <div className="flex gap-4 overflow-x-auto snap-x pb-4 custom-scrollbar">
                                {selectedBooking.work_logs[0].before_photos.map((url, i) => (
                                  <img key={i} src={url} alt="Before" className="snap-center shrink-0 w-64 h-48 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedBooking.work_logs?.[0]?.photo_urls?.length > 0 && (
                            <div>
                              <p className="text-xs font-black text-emerald-600 mb-3 uppercase tracking-wider">After Cleaning (Final)</p>
                              <div className="flex gap-4 overflow-x-auto snap-x pb-4 custom-scrollbar">
                                {selectedBooking.work_logs[0].photo_urls.map((url, i) => (
                                  <img key={i} src={url} alt="After" className="snap-center shrink-0 w-64 h-48 object-cover rounded-2xl border-2 border-emerald-100 shadow-md" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Damage Notice */}
                    {selectedBooking.work_logs?.[0]?.damaged_items && (
                      <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-6">
                        <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertTriangle size={16}/> Reported Issues / Damages
                        </h4>
                        <p className="text-sm font-bold text-rose-800 bg-white p-4 rounded-xl border border-rose-100 mb-4">
                          {selectedBooking.work_logs[0].damaged_items.remarks || "An issue was reported by the field team."}
                        </p>
                        {selectedBooking.work_logs[0].damaged_items.photos?.length > 0 && (
                          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                            {selectedBooking.work_logs[0].damaged_items.photos.map((url: string, i: number) => (
                              <img key={i} src={url} alt="Damage" className="w-40 h-32 object-cover rounded-xl border border-rose-200" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Billing & Checklist */}
                  <div className="space-y-8">

                    {/* Billing Breakdown (Only for Finalized) */}
                    {selectedBooking.status.toLowerCase() === "finalized" && (
                      <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Receipt size={14}/> Invoice Breakdown
                        </h4>

                        <div className="space-y-4 mb-8 text-sm font-medium">
                          <div className="flex justify-between items-center pb-4 border-b border-white/10">
                            <span className="text-slate-300">Base Cleaning Fee</span>
                            <span className="font-bold">AED {Number(selectedBooking.price || 0).toFixed(2)}</span>
                          </div>

                          {/* Extra Inventory */}
                          {(selectedBooking.booking_inventory_logs || []).filter(i => i.extra_provided_qty > 0).map((inv, idx) => {
                             let uPrice = inv.supervisor_price;
                             if (uPrice === null) {
                               const cfg = unitConfigs.find(c => c.unit_id === selectedBooking.unit_id && c.equipment_id === inv.equipment_id);
                               uPrice = cfg ? cfg.extra_unit_price : 0;
                             }
                             const lineTotal = inv.extra_provided_qty * Number(uPrice);
                             return (
                               <div key={`inv-${idx}`} className="flex justify-between items-center pb-4 border-b border-white/10 text-blue-200">
                                 <span>Extra: {inv.extra_provided_qty}x {inv.equipment_master?.item_name}</span>
                                 <span className="font-bold">AED {lineTotal.toFixed(2)}</span>
                               </div>
                             );
                          })}

                          {/* Extra Charges */}
                          {(selectedBooking.booking_extra_added_charges || []).map((chg, idx) => (
                            <div key={`chg-${idx}`} className="flex justify-between items-center pb-4 border-b border-white/10 text-orange-200">
                              <span>Charge: {chg.item_description}</span>
                              <span className="font-bold">AED {Number(chg.amount || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-end bg-white/5 p-4 rounded-2xl border border-white/10">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invoice Amount</span>
                           <span className="text-3xl font-black text-emerald-400">AED {calculateBookingTotal(selectedBooking).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* 🚨 GROUPED CHECKLIST DESIGN 🚨 */}
                    <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileCheck size={16} className="text-blue-500"/> Service Checklist
                      </h4>

                      {!selectedBooking.checklist_templates ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                           <p className="text-sm font-bold text-slate-500">Standard protocol was followed.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                          <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
                             <p className="font-black text-slate-800 text-lg">{selectedBooking.checklist_templates.title}</p>

                             {/* Notice for upcoming bookings */}
                             {!["completed", "finalized"].includes(selectedBooking.status.toLowerCase()) && (
                               <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg">
                                 Will be followed
                               </span>
                             )}
                          </div>

                          <div className="p-6">
                            {/* Grid Layout for Checklist Sections */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedBooking.checklist_templates.content?.map((section: any, sIdx: number) => {
                                const isDone = ["completed", "finalized"].includes(selectedBooking.status.toLowerCase());
                                return (
                                 <div key={sIdx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                    <h5 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 pb-3 border-b border-slate-200/60">
                                      {section.title || "General Tasks"}
                                    </h5>
                                    <div className="grid grid-cols-1 gap-3">
                                      {section.tasks?.map((task: any, tIdx: number) => (
                                        <div key={tIdx} className="flex items-start gap-3">
                                          {isDone ? (
                                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/>
                                          ) : (
                                            <CircleDashed size={16} className="text-slate-300 shrink-0 mt-0.5"/>
                                          )}
                                          <span className={`text-sm font-bold ${isDone ? 'text-slate-700' : 'text-slate-500'} leading-snug`}>{task.text || task}</span>
                                        </div>
                                      ))}
                                    </div>
                                 </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}