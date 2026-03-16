"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Filter, FilterX, Clock, Calendar, Building2,
  CheckCircle, MapPin, FileCheck, ShieldAlert, Users,
  Search, Receipt, PackagePlus, CalendarCheck, Edit3, Hash
} from "lucide-react";
import { format, parseISO } from "date-fns";
import SupervisorAuditModal from "./SupervisorAuditModal";

export default function SupervisorReviewPage() {
  const supabase = createClient();

  // ── Data States ──────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filter & Search States ───────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Modal State ──────────────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // ── ONE optimized fetch — everything in parallel ─────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    const [bRes, pRes, ucRes, tRes] = await Promise.all([
      supabase
        .from("bookings")
        .select(`
          id, status, price, service_type, cleaning_time, cleaning_date,
          booking_ref, checklist_template_id, unit_id,
          units ( id, unit_number, building_name, layout, door_code, companies ( name ) ),
          teams ( id, team_name, member_ids ),
          work_logs (
            id, start_time, end_time, before_photos, photo_urls, cost,
            agent:profiles!work_logs_submitted_by_fkey ( full_name, avatar_url )
          ),
          booking_inventory_logs (
            id, equipment_id, base_provide_qty, extra_provided_qty, final_provided_qty,
            target_collect_qty, collected_qty, shortage_qty, qc_status,
            supervisor_price, remarks,
            equipment_master ( item_name, item_type )
          )
        `)
        .in("status", ["completed", "finalized"])
        .order("cleaning_date", { ascending: false }),
      supabase.from("profiles").select("id, full_name, avatar_url"),
      supabase.from("unit_equipment_config").select("unit_id, equipment_id, standard_qty, extra_unit_price"),
      supabase.from("checklist_templates").select("id, title, content"),
    ]);

    if (bRes.error) console.error("Bookings error:", bRes.error.message);
    if (bRes.data) setBookings(bRes.data);
    if (pRes.data) setProfiles(pRes.data);
    if (ucRes.data) setUnitConfigs(ucRes.data);
    if (tRes.data) setChecklistTemplates(tRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Unique companies for filter dropdown ─────────────────────────────────────
  const companies = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach(b => { if (b.units?.companies?.name) set.add(b.units.companies.name); });
    return Array.from(set).sort();
  }, [bookings]);

  // ── Filter + Search logic ────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter(b => {
      if (filterDate && b.cleaning_date !== filterDate) return false;
      if (filterCompany && b.units?.companies?.name !== filterCompany) return false;
      if (filterStatus && b.status !== filterStatus) return false;
      if (q) {
        const bookingRef = (b.booking_ref || "").toLowerCase();
        const unitNo = (b.units?.unit_number || "").toLowerCase();
        const company = (b.units?.companies?.name || "").toLowerCase();
        const building = (b.units?.building_name || "").toLowerCase();
        const team = (b.teams?.team_name || "").toLowerCase();
        if (!bookingRef.includes(q) && !unitNo.includes(q) && !company.includes(q) && !building.includes(q) && !team.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, filterDate, filterCompany, filterStatus, searchQuery]);

  // ── Group by date ────────────────────────────────────────────────────────────
  const groupedBookings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return { groups, sortedDates };
  }, [filteredBookings]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    needsReview: bookings.filter(b => b.status === "completed").length,
    finalized: bookings.filter(b => b.status === "finalized").length,
    withExtra: bookings.filter(b => b.booking_inventory_logs?.some((i: any) => i.extra_provided_qty > 0)).length,
    totalBillable: bookings
      .filter(b => b.status === "finalized")
      .reduce((sum, b) => sum + (b.price || 0), 0),
  }), [bookings]);

  const clearFilters = () => { setFilterDate(""); setFilterCompany(""); setFilterStatus(""); setSearchQuery(""); };
  const hasActiveFilters = filterDate || filterCompany || filterStatus || searchQuery;

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]">
      <Loader2 className="animate-spin text-blue-600" size={48}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 text-white pt-10 pb-24 px-4 md:px-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"/>
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"/>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <p className="text-blue-300 font-bold uppercase tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
                <ShieldAlert size={12}/> Supervisor Dashboard
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm"><FileCheck size={28}/></div>
                Audit & Pricing Review
              </h1>
              <p className="text-blue-200/70 font-medium mt-2 text-sm">
                Verify work logs, review inventory, and finalize billing.
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border ${showFilters ? "bg-white text-blue-900 border-white" : "bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-md"}`}
            >
              <Filter size={18}/> {showFilters ? "Hide Filters" : "Filters & Search"}
            </button>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Needs Review", value: stats.needsReview, color: "bg-amber-400/20 border-amber-400/30 text-amber-200", icon: <Clock size={16}/> },
              { label: "Finalized", value: stats.finalized, color: "bg-emerald-400/20 border-emerald-400/30 text-emerald-200", icon: <CheckCircle size={16}/> },
              { label: "Has Extra Items", value: stats.withExtra, color: "bg-indigo-400/20 border-indigo-400/30 text-indigo-200", icon: <PackagePlus size={16}/> },
              { label: "Total Billed", value: `AED ${stats.totalBillable.toFixed(0)}`, color: "bg-blue-400/20 border-blue-400/30 text-blue-200", icon: <Receipt size={16}/> },
            ].map((s, i) => (
              <div key={i} className={`${s.color} border rounded-2xl px-4 py-3.5 backdrop-blur-md`}>
                <div className="flex items-center gap-1.5 mb-1 opacity-70">{s.icon}<p className="text-[10px] font-black uppercase tracking-widest">{s.label}</p></div>
                <p className="text-2xl font-black">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-20">

        {/* ── FILTERS & SEARCH PANEL ──────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by Booking Ref, Unit No, Company, Building, Team..."
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Date</label>
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900 focus:border-blue-400"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Company</label>
                    <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900 focus:border-blue-400">
                      <option value="">All Companies</option>
                      {companies.map((c, i) => <option key={i} value={c}>{c}</option>)}                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-900 focus:border-blue-400">
                      <option value="">All Statuses</option>
                      <option value="completed">Needs Review</option>
                      <option value="finalized">Finalized</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={clearFilters}
                      className="w-full py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold flex justify-center items-center gap-2 transition-all border border-red-100">
                      <FilterX size={16}/> Clear All
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results summary bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center justify-between mb-6">
          <p className="text-sm font-bold text-gray-500">
            Showing <span className="text-gray-900 font-black">{filteredBookings.length}</span> of {bookings.length} records
            {hasActiveFilters && <span className="text-blue-500 ml-2 font-black">— filtered</span>}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs font-black text-red-500 hover:text-red-700 flex items-center gap-1">
              <FilterX size={13}/> Clear
            </button>
          )}
        </div>

        {/* ── BOOKING LIST ─────────────────────────────────────────────────── */}
        {groupedBookings.sortedDates.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
            <FileCheck size={64} className="mx-auto mb-4 opacity-20 text-blue-500"/>
            <p className="text-xl font-black text-gray-700">No audit records found.</p>
            <p className="text-sm mt-1">Try adjusting filters or date range.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedBookings.sortedDates.map(dateStr => (
              <div key={dateStr} className="space-y-4">

                {/* Date header */}
                <div className="flex items-center gap-3 pl-1">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><CalendarCheck size={17} strokeWidth={2.5}/></div>
                  <h2 className="text-lg font-black text-gray-800">{format(parseISO(dateStr), "EEEE, dd MMM yyyy")}</h2>
                  <div className="h-px bg-gray-200 flex-1"/>
                  <span className="text-xs font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {groupedBookings.groups[dateStr].length} bookings
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {groupedBookings.groups[dateStr].map(booking => {
                    const isCompleted = booking.status === "completed";
                    const hasExtra = booking.booking_inventory_logs?.some((i: any) => i.extra_provided_qty > 0);
                    const workLog = booking.work_logs?.[0];
                    const members = (booking.teams?.member_ids || [])
                      .map((id: string) => profiles.find((p: any) => p.id === id))
                      .filter(Boolean);

                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5
                          ${isCompleted ? "border-blue-200 hover:border-blue-300" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        {/* Left info */}
                        <div className="flex-1 min-w-0">
                          {/* Status + Booking Ref row — flex-wrap আগে থেকেই আছে, ঠিক আছে */}
<div className="flex flex-wrap items-center gap-2 mb-3">
  {isCompleted ? (
    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
      <Clock size={11}/> Needs Review
    </span>
  ) : (
    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0">
      <CheckCircle size={11}/> Finalized
    </span>
  )}
  {booking.booking_ref && (
    <span className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0 max-w-full overflow-hidden text-ellipsis">
      <Hash size={10} className="shrink-0"/> 
      <span className="truncate">{booking.booking_ref}</span>
    </span>
  )}
  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg shrink-0">
    {booking.cleaning_time}
  </span>
  {hasExtra && (
    <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 flex items-center gap-1 shrink-0">
      <PackagePlus size={10}/> Extra Items
    </span>
  )}
</div>

{/* Company + Unit */}
<h3 className="text-lg font-black text-gray-900 mb-0.5 flex items-center gap-2 min-w-0 overflow-hidden">
  <Building2 size={17} className="text-blue-500 shrink-0"/>
  <span className="truncate">{booking.units?.companies?.name || "N/A"}</span>
</h3>
<p className="text-sm font-bold text-gray-600 mb-1">
  Unit {booking.units?.unit_number}
</p>
<p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 mb-3 min-w-0 overflow-hidden">
  <MapPin size={13} className="shrink-0"/>
  <span className="truncate">{booking.units?.building_name} · {booking.service_type}</span>
</p>
                          {/* Team + Members */}
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-black text-gray-600 flex items-center gap-1.5">
                              <Users size={13} className="text-indigo-400"/> {booking.teams?.team_name || "Unassigned"}
                            </span>
                            <div className="flex items-center">
                              {members.slice(0, 4).map((m: any, i: number) => (
                                <div key={m.id}
                                  className={`w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600 overflow-hidden shadow-sm ${i !== 0 ? "-ml-2" : ""}`}
                                  title={m.full_name}>
                                  {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt=""/> : m.full_name?.charAt(0)}
                                </div>
                              ))}
                              {members.length > 4 && <span className="text-[10px] font-black text-gray-400 ml-2">+{members.length - 4}</span>}
                            </div>
                            {workLog ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-100">
                                <FileCheck size={10}/> Log Submitted
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-red-100">
                                <ShieldAlert size={10}/> No Log
                              </span>
                            )}
                            {booking.price > 0 && (
                              <span className="text-xs font-black text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100">
                                AED {Number(booking.price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className={`w-full md:w-auto shrink-0 px-7 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm
                            ${isCompleted
                              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                              : "bg-gray-900 hover:bg-black text-white"}`}
                        >
                          {isCompleted ? <><FileCheck size={16}/> Audit & Set Price</> : <><Edit3 size={16}/> View / Edit</>}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <SupervisorAuditModal
              booking={selectedBooking}
              profiles={profiles}
              unitConfigs={unitConfigs}
              checklistTemplates={checklistTemplates}
              onClose={() => setSelectedBooking(null)}
              onFinalized={() => { setSelectedBooking(null); fetchAll(); }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
