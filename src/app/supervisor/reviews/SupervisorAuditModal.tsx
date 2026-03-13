"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, Camera, FileCheck, CircleDollarSign, CheckSquare,
  PackagePlus, CheckCircle2, AlertCircle, Building2, Calendar,
  Users, UserCircle, ShieldCheck, Tag, Layers, Shirt, Droplets,
  Sparkles, AlertTriangle, Hash, MapPin, Edit3, Loader2,
  ChevronDown, Image, Receipt, Save
} from "lucide-react";
import { format, differenceInMinutes, parseISO } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeFormat = (dt: string, fmt: string) => {
  try { return format(parseISO(dt), fmt); } catch { return "N/A"; }
};

const getDuration = (start: string, end: string) => {
  if (!start || !end) return "N/A";
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

type Tab = "details" | "inventory" | "checklist" | "finalize";

// ─── Photo Grid ───────────────────────────────────────────────────────────────
function PhotoGrid({ photos, label }: { photos: string[]; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? photos : photos.slice(0, 4);
  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      {photos.length === 0 ? (
        <div className="p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs font-bold text-gray-400 flex flex-col items-center gap-2">
          <Image size={22} className="opacity-30"/> No photos uploaded
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {visible.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="relative group h-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm hover:border-blue-400 transition-all block">
                <img src={url} alt={`${label} ${i+1}`} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black">View</div>
              </a>
            ))}
          </div>
          {photos.length > 4 && (
            <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs font-black text-blue-500 flex items-center gap-1">
              <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`}/>
              {expanded ? "Show less" : `+${photos.length - 4} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Item type icon ────────────────────────────────────────────────────────────
function ItemTypeIcon({ type }: { type: string }) {
  if (type === "returnable") return <Shirt size={13} className="text-orange-500"/>;
  if (type === "refillable") return <Droplets size={13} className="text-blue-500"/>;
  return <Sparkles size={13} className="text-emerald-500"/>;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function SupervisorAuditModal({
  booking, profiles, unitConfigs, checklistTemplates, onClose, onFinalized
}: any) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceInput, setPriceInput] = useState(booking.price ? String(booking.price) : "");

  // Editable state for supervisor_price & remarks per inventory log row
  // Structure: { [log_id]: { supervisor_price: string, remarks: string } }
  const [inventoryEdits, setInventoryEdits] = useState<Record<string, { supervisor_price: string; remarks: string }>>(() => {
    const init: Record<string, { supervisor_price: string; remarks: string }> = {};
    (booking.booking_inventory_logs || []).forEach((i: any) => {
      init[i.id] = {
        supervisor_price: i.supervisor_price !== null && i.supervisor_price !== undefined ? String(i.supervisor_price) : "",
        remarks: i.remarks || "",
      };
    });
    return init;
  });

  const workLog = booking.work_logs?.[0];
  const inventoryLogs: any[] = booking.booking_inventory_logs || [];
  const companyName = Array.isArray(booking.units?.companies)
    ? booking.units.companies[0]?.name
    : booking.units?.companies?.name;

  const teamMembers = useMemo(() =>
    (booking.teams?.member_ids || [])
      .map((id: string) => profiles.find((p: any) => p.id === id))
      .filter(Boolean),
  [booking, profiles]);

  // ── Grouped by type ───────────────────────────────────────────────────────
  const returnables = inventoryLogs.filter(i => i.equipment_master?.item_type === "returnable");
  const refillables = inventoryLogs.filter(i => i.equipment_master?.item_type === "refillable");
  const consumables = inventoryLogs.filter(i => i.equipment_master?.item_type === "consumable");

  // ── Billable items (extra_provided_qty > 0) with editable price ───────────
  const billableItems = useMemo(() => {
    return inventoryLogs
      .filter(i => i.extra_provided_qty > 0)
      .map(i => {
        const edit = inventoryEdits[i.id] || {};
        const supervisorPrice = edit.supervisor_price !== "" && edit.supervisor_price !== undefined ? parseFloat(edit.supervisor_price) : null;
        const config = unitConfigs.find((c: any) => c.unit_id === booking.unit_id && c.equipment_id === i.equipment_id);
        const unitPrice = supervisorPrice !== null ? supervisorPrice : Number(config?.extra_unit_price || 0);
        const total = i.extra_provided_qty * unitPrice;
        return { ...i, unitPrice, total, isPriced: unitPrice > 0, isSupervisorOverride: supervisorPrice !== null };
      });
  }, [inventoryLogs, inventoryEdits, unitConfigs, booking.unit_id]);

  const billableTotal = billableItems.reduce((sum, i) => sum + i.total, 0);

  // ── Checklist from template ────────────────────────────────────────────────
  const checklistGroups = useMemo(() => {
    const template = checklistTemplates.find((t: any) => t.id === booking.checklist_template_id);
    const sections: any[] = template?.content || [];
    if (sections.length === 0) return null;
    const grouped: Record<string, { task: string }[]> = {};
    let totalTasks = 0;
    sections.forEach((section: any) => {
      const sectionTitle = section.title || "General Tasks";
      const tasks = section.tasks || [];
      totalTasks += tasks.length;
      grouped[sectionTitle] = tasks.map((t: any) => ({ task: t.text || String(t) }));
    });
    return { template, grouped, totalTasks };
  }, [checklistTemplates, booking.checklist_template_id]);

  // ── Save supervisor edits (price + remarks) to booking_inventory_logs ─────
  const saveInventoryEdits = async () => {
    const extraItems = inventoryLogs.filter(i => i.extra_provided_qty > 0);
    if (extraItems.length === 0) return true;
    const updates = extraItems.map(i => {
      const edit = inventoryEdits[i.id] || {};
      const sp = edit.supervisor_price !== "" ? parseFloat(edit.supervisor_price) : null;
      return supabase
        .from("booking_inventory_logs")
        .update({ supervisor_price: sp, remarks: edit.remarks || null })
        .eq("id", i.id);
    });
    const results = await Promise.all(updates);
    const err = results.find(r => r.error);
    if (err?.error) { console.error("Inventory save error:", err.error.message); return false; }
    return true;
  };

  // ── Finalize booking (price + status) ─────────────────────────────────────
  const handleFinalize = async () => {
    if (!priceInput) return;
    setIsSubmitting(true);
    try {
      // 1. Save supervisor_price & remarks to inventory logs
      const inventorySaved = await saveInventoryEdits();
      if (!inventorySaved) throw new Error("Failed to save inventory edits.");

      // 2. Update booking price & status
      const { error } = await supabase
        .from("bookings")
        .update({ price: parseFloat(priceInput), status: "finalized" })
        .eq("id", booking.id);
      if (error) throw error;

      onFinalized();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { key: "details",   label: "Execution",  icon: <FileCheck size={14}/>,      activeClass: "border-blue-600 text-blue-700 bg-blue-50/50" },
    { key: "inventory", label: "Inventory",  icon: <Layers size={14}/>,         activeClass: "border-indigo-600 text-indigo-700 bg-indigo-50/50" },
    { key: "checklist", label: "Checklist",  icon: <CheckSquare size={14}/>,    activeClass: "border-emerald-600 text-emerald-700 bg-emerald-50/50" },
    { key: "finalize",  label: "Finalize",   icon: <CircleDollarSign size={14}/>, activeClass: "border-green-600 text-green-700 bg-green-50/50" },
  ];

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="fixed bottom-0 left-0 w-full h-[92vh] z-50 flex flex-col rounded-t-[2.5rem] overflow-hidden shadow-[0_-24px_80px_-10px_rgba(0,0,0,0.4)]"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white shrink-0">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-white/20 rounded-full"/>
        </div>

        <div className="px-6 md:px-10 pt-3 pb-4 flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={11}/> Supervisor Audit
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Unit {booking.units?.unit_number}
              <span className="ml-3 text-sm font-bold text-white/50 bg-white/10 px-2.5 py-0.5 rounded-full align-middle">{companyName}</span>
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {booking.booking_ref && (
                <span className="flex items-center gap-1 text-xs font-black text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-400/20">
                  <Hash size={11}/> {booking.booking_ref}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                <Building2 size={12}/> {booking.units?.building_name}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                <Calendar size={12}/> {safeFormat(booking.cleaning_date, "dd MMM yyyy")}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                <Users size={12}/> {booking.teams?.team_name || "Unassigned"}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X size={18}/>
            </button>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border ${booking.status === "finalized"
                ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                : "bg-amber-400/20 text-amber-300 border-amber-400/30 animate-pulse"
            }`}>
              {booking.status === "finalized" ? "Finalized" : "Needs Review"}
            </span>
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="px-6 md:px-10 pb-4 flex gap-3 overflow-x-auto no-scrollbar">
          {[
            { icon: <Clock size={13} className="text-blue-300"/>, label: "Duration", value: workLog ? getDuration(workLog.start_time, workLog.end_time) : "No Log" },
            { icon: <Camera size={13} className="text-blue-300"/>, label: "Photos", value: `${(workLog?.before_photos?.length||0) + (workLog?.photo_urls?.length||0)} Total` },
            { icon: <Layers size={13} className="text-blue-300"/>, label: "Items", value: `${inventoryLogs.length} tracked` },
            { icon: <PackagePlus size={13} className="text-indigo-300"/>, label: "Extra", value: `${billableItems.length} billable` },
            ...(billableTotal > 0 ? [{ icon: <CircleDollarSign size={13} className="text-emerald-300"/>, label: "Billable", value: `AED ${billableTotal.toFixed(2)}` }] : []),
            ...(booking.price > 0 ? [{ icon: <Receipt size={13} className="text-blue-300"/>, label: "Set Price", value: `AED ${booking.price}` }] : []),
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2.5 shrink-0 border border-white/10">
              {s.icon}
              <div>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{s.label}</p>
                <p className="text-sm font-black text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="flex bg-white border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar px-4">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black transition-all border-b-2 whitespace-nowrap ${activeTab === tab.key ? tab.activeClass : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {tab.icon} {tab.label}
            {tab.key === "finalize" && booking.status === "completed" && (
              <span className="ml-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse"/>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#F4F7FA]">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-6 md:p-8 space-y-6 pb-16"
          >

            {/* ══════ TAB 1 — EXECUTION DETAILS ══════════════════════════════ */}
            {activeTab === "details" && (
              <>
                {/* Booking info grid */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Building2 size={10}/> Property</p>
                    <p className="font-black text-gray-900 text-base">{companyName}</p>
                    <p className="text-sm font-bold text-gray-500 mt-0.5">Unit {booking.units?.unit_number} · {booking.units?.building_name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{booking.units?.layout || "Layout N/A"}</span>
                      {booking.units?.door_code && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">🔑 {booking.units.door_code}</span>}
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">{booking.service_type}</span>
                    </div>
                  </div>
                  <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={10}/> Schedule</p>
                    <p className="font-black text-gray-900">{safeFormat(booking.cleaning_date, "EEEE, dd MMM yyyy")}</p>
                    <p className="text-sm font-bold text-gray-500 mt-0.5 flex items-center gap-1"><Clock size={12}/> {booking.cleaning_time || "N/A"}</p>
                    {booking.booking_ref && (
                      <p className="text-sm font-black text-indigo-600 mt-1 flex items-center gap-1"><Hash size={12}/> {booking.booking_ref}</p>
                    )}
                  </div>
                  <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={10}/> Team</p>
                    <p className="font-black text-gray-900 mb-2">{booking.teams?.team_name || "Unassigned"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {teamMembers.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 pr-2 pl-0.5 py-0.5 rounded-full border border-gray-200">
                          <div className="w-6 h-6 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                            {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt=""/> : <UserCircle size={15} className="text-gray-400"/>}
                          </div>
                          <span className="text-[10px] font-bold text-gray-700">{m.full_name?.split(" ")[0]}</span>
                        </div>
                      ))}
                    </div>
                    {workLog?.agent && (
                      <p className="text-xs font-bold text-gray-400 mt-2">Submitted by <span className="text-gray-700">{workLog.agent.full_name}</span></p>
                    )}
                  </div>
                </div>

                {workLog ? (
                  <>
                    {/* Time tracking */}
                    <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={13}/> Time Tracking</p>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {[
                          { label: "Started", value: safeFormat(workLog.start_time, "hh:mm a") },
                          { label: "Ended",   value: safeFormat(workLog.end_time, "hh:mm a") },
                          { label: "Duration", value: getDuration(workLog.start_time, workLog.end_time) },
                        ].map((s, i) => (
                          <div key={i} className="flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 min-w-[90px]">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                            <p className="text-base font-black text-blue-800">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Camera size={13}/> Work Evidence</p>
                      <PhotoGrid photos={workLog.before_photos || []} label="Before Cleaning"/>
                      <div className="h-px bg-gray-100"/>
                      <PhotoGrid photos={workLog.photo_urls || []} label="After Cleaning"/>
                    </div>
                  </>
                ) : (
                  <div className="p-10 bg-red-50 rounded-3xl border border-red-100 flex flex-col items-center gap-3 text-center">
                    <AlertCircle size={48} className="text-red-400 opacity-80"/>
                    <p className="text-xl font-black text-red-600">Work Log Not Found</p>
                    <p className="text-sm text-red-400">The team marked this booking but no work log was submitted.</p>
                  </div>
                )}
              </>
            )}

            {/* ══════ TAB 2 — INVENTORY ══════════════════════════════════════ */}
            {activeTab === "inventory" && (
              <>
                {inventoryLogs.length === 0 ? (
                  <div className="p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold">
                    No equipment tracked for this booking.
                  </div>
                ) : (
                  <>
                    {/* Returnables */}
                    {returnables.length > 0 && (
                      <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3.5 border-b border-orange-100 flex items-center gap-2">
                          <Shirt size={15} className="text-orange-500"/>
                          <span className="font-black text-orange-800 text-sm">Linens & Towels — Returnable</span>
                          <span className="ml-auto text-[10px] font-black bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">{returnables.length} items</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                {["Item","Target","Collected","Provided","Extra","Shortage","QC"].map(h => (
                                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center first:text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {returnables.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50/60">
                                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-1.5"><ItemTypeIcon type="returnable"/>{item.equipment_master?.item_name}</td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{item.target_collect_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center"><span className={`text-xs font-black px-2 py-1 rounded-lg ${item.collected_qty >= item.target_collect_qty ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{item.collected_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{item.final_provided_qty}<span className="text-[9px] text-indigo-400 ml-1">({item.standard_qty})</span></span></td>
                                  <td className="px-4 py-3.5 text-center">{item.extra_provided_qty > 0 ? <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">+{item.extra_provided_qty}</span> : <span className="text-xs text-gray-300">—</span>}</td>
                                  <td className="px-4 py-3.5 text-center">{item.shortage_qty > 0 ? <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-0.5 justify-center"><AlertTriangle size={10}/>{item.shortage_qty}</span> : <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">OK</span>}</td>
                                  <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-black px-2 py-1 rounded-full ${item.qc_status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{item.qc_status || "pending"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Refillables */}
                    {refillables.length > 0 && (
                      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-3.5 border-b border-blue-100 flex items-center gap-2">
                          <Droplets size={15} className="text-blue-500"/>
                          <span className="font-black text-blue-800 text-sm">Refillables</span>
                          <span className="ml-auto text-[10px] font-black bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">{refillables.length} items</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                {["Item","Standard","Provided","Extra","QC"].map(h => (
                                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center first:text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {refillables.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50/60">
                                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-1.5"><ItemTypeIcon type="refillable"/>{item.equipment_master?.item_name}</td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{item.standard_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{item.final_provided_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center">{item.extra_provided_qty > 0 ? <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">+{item.extra_provided_qty}</span> : <span className="text-xs text-gray-300">—</span>}</td>
                                  <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-black px-2 py-1 rounded-full ${item.qc_status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{item.qc_status || "pending"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Consumables */}
                    {consumables.length > 0 && (
                      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3.5 border-b border-emerald-100 flex items-center gap-2">
                          <Sparkles size={15} className="text-emerald-500"/>
                          <span className="font-black text-emerald-800 text-sm">Amenities — Consumable</span>
                          <span className="ml-auto text-[10px] font-black bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-full">{consumables.length} items</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                {["Item","Standard","Placed"].map(h => (
                                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center first:text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {consumables.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50/60">
                                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-1.5"><ItemTypeIcon type="consumable"/>{item.equipment_master?.item_name}</td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{item.standard_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">+{item.extra_provided_qty} Placed</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ── EDITABLE Billable Summary ── */}
                    {billableItems.length > 0 && (
                      <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center gap-2">
                          <Edit3 size={17} className="text-white"/>
                          <span className="font-black text-white text-sm">Extra Provided — Edit Prices & Remarks</span>
                          {billableTotal > 0 && (
                            <span className="ml-auto text-sm font-black bg-white/20 text-white px-3 py-1 rounded-xl">
                              Total: AED {billableTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="p-5 space-y-4">
                          {billableItems.map((item: any) => {
                            const edit = inventoryEdits[item.id] || {};
                            return (
                              <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <ItemTypeIcon type={item.equipment_master?.item_type || ""}/>
                                  <span className="font-black text-gray-900">{item.equipment_master?.item_name}</span>
                                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 ml-auto">
                                    Qty: +{item.extra_provided_qty}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* Supervisor Price Input */}
                                  <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                                      <ShieldCheck size={9}/> Supervisor Price (AED / unit)
                                    </label>
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 transition-colors">
                                      <span className="text-xs font-black text-gray-400">AED</span>
                                      <input
                                        type="number" min="0" step="0.01"
                                        value={edit.supervisor_price}
                                        onChange={e => setInventoryEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], supervisor_price: e.target.value } }))}
                                        placeholder={`Config: ${item.unitPrice.toFixed(2)}`}
                                        className="flex-1 outline-none text-sm font-black text-gray-900 bg-transparent"
                                      />
                                    </div>
                                  </div>
                                  {/* Remarks */}
                                  <div className="md:col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                                      <Tag size={9}/> Remarks
                                    </label>
                                    <input
                                      type="text"
                                      value={edit.remarks}
                                      onChange={e => setInventoryEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], remarks: e.target.value } }))}
                                      placeholder="e.g. Included in contract, Guest request..."
                                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm font-medium text-gray-700 focus:border-blue-400 transition-colors"
                                    />
                                  </div>
                                </div>
                                {/* Live total */}
                                <div className="mt-2.5 flex justify-end items-center gap-2">
                                  <span className="text-xs text-gray-400 font-bold">
                                    {item.extra_provided_qty} × {edit.supervisor_price !== "" ? parseFloat(edit.supervisor_price || "0").toFixed(2) : item.unitPrice.toFixed(2)} AED =
                                  </span>
                                  <span className="text-base font-black text-emerald-700">
                                    {(item.extra_provided_qty * (edit.supervisor_price !== "" ? parseFloat(edit.supervisor_price || "0") : item.unitPrice)).toFixed(2)} AED
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Grand total */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex justify-between items-center">
                            <span className="font-black text-emerald-700">Grand Total Billable</span>
                            <span className="text-2xl font-black text-emerald-700">{billableTotal.toFixed(2)} <span className="text-sm">AED</span></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══════ TAB 3 — CHECKLIST ══════════════════════════════════════ */}
            {activeTab === "checklist" && (
              <>
                {!checklistGroups ? (
                  <div className="p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold flex flex-col items-center gap-3">
                    <CheckSquare size={40} className="opacity-30"/>
                    No checklist template assigned.
                  </div>
                ) : (
                  <>
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-5 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[9px] font-black text-emerald-100/70 uppercase tracking-widest mb-1">Assigned Template</p>
                        <p className="text-lg font-black text-white">{checklistGroups.template.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">{checklistGroups.totalTasks}</p>
                        <p className="text-[10px] font-bold text-emerald-100/70">Total Tasks</p>
                      </div>
                    </div>

                    {Object.entries(checklistGroups.grouped).map(([section, tasks]: [string, any]) => (
                      <div key={section} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"/>
                            <h4 className="font-black text-gray-700 text-sm">{section}</h4>
                          </div>
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">
                            {tasks.length} tasks
                          </span>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {tasks.map((t: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 size={13} className="text-emerald-600"/>
                              </div>
                              <span className="text-sm font-bold text-gray-700 leading-snug">{t.task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ══════ TAB 4 — FINALIZE ═══════════════════════════════════════ */}
            {activeTab === "finalize" && (
              <>
                {/* Summary before finalizing */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Receipt size={13}/> Audit Summary</p>
                  {[
                    { label: "Booking Ref", value: booking.booking_ref || "N/A" },
                    { label: "Unit", value: `Unit ${booking.units?.unit_number} · ${booking.units?.building_name}` },
                    { label: "Company", value: companyName || "N/A" },
                    { label: "Service", value: booking.service_type || "N/A" },
                    { label: "Date", value: safeFormat(booking.cleaning_date, "dd MMM yyyy") },
                    { label: "Team", value: booking.teams?.team_name || "N/A" },
                    { label: "Work Duration", value: workLog ? getDuration(workLog.start_time, workLog.end_time) : "No log" },
                    { label: "Items Tracked", value: `${inventoryLogs.length}` },
                    { label: "Extra Billable", value: `${billableItems.length} items · AED ${billableTotal.toFixed(2)}` },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{row.label}</span>
                      <span className="text-sm font-black text-gray-800">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Price input & submit */}
                <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 text-blue-800/30"><Receipt size={150}/></div>
                  <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2 relative z-10">
                    <div className="p-2 bg-emerald-400 rounded-xl text-gray-900"><CircleDollarSign size={20}/></div>
                    {booking.status === "completed" ? "Finalize Booking Price" : "Edit Booking Price"}
                  </h3>
                  <div className="relative z-10 mb-6 bg-white/10 rounded-2xl p-4 border border-white/10 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-200 font-bold">Cleaning Price (this field only)</span>
                      <span className="text-white font-black">{priceInput ? `AED ${parseFloat(priceInput).toFixed(2)}` : "—"}</span>
                    </div>
                    {billableTotal > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-300 font-bold">Extra Items (saved separately)</span>
                          <span className="text-emerald-300 font-black">AED {billableTotal.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/20"/>
                        <div className="flex justify-between text-sm">
                          <span className="text-white font-black">Invoice Total</span>
                          <span className="text-white font-black">
                            AED {(parseFloat(priceInput || "0") + billableTotal).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-300 font-bold">
                          ⚠️ Price field এ শুধু cleaning cost দাও। Extra items আলাদাভাবে invoice এ যোগ হবে।
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 relative z-10">
                    <div className="flex-1 relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">AED</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={priceInput} onChange={e => setPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-16 pr-6 py-5 bg-white rounded-2xl outline-none focus:ring-4 focus:ring-emerald-400/50 font-black text-2xl text-gray-900 shadow-inner transition-all"
                      />
                    </div>
                    <button
                      onClick={handleFinalize}
                      disabled={isSubmitting || !priceInput}
                      className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-gray-900 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 shrink-0"
                    >
                      {isSubmitting ? <Loader2 size={22} className="animate-spin"/> : <Save size={22}/>}
                      {isSubmitting ? "Saving..." : booking.status === "completed" ? "Submit Audit" : "Update Audit"}
                    </button>
                  </div>
                </div>
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
