"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, Camera, FileCheck, CircleDollarSign, CheckSquare,
  RefreshCcw, PackagePlus, CheckCircle2, AlertCircle, Building2,
  Calendar, Users, ChevronDown, Image, Layers, Tag, ShieldCheck,
  Droplets, Shirt, Sparkles, Box, Receipt, AlertTriangle
} from "lucide-react";
import { format, differenceInMinutes, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "details" | "inventory" | "checklist";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDuration = (start: string, end: string) => {
  if (!start || !end) return { label: "N/A", mins: 0 };
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, mins };
};

const safeFormat = (dt: string, fmt: string) => {
  try { return format(parseISO(dt), fmt); } catch { return "N/A"; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color = "blue" }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 border-blue-100 text-blue-700",
    green:  "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber:  "bg-amber-50 border-amber-100 text-amber-700",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    red:    "bg-red-50 border-red-100 text-red-600",
  };
  return (
    <div className={`flex flex-col items-center justify-center px-5 py-3 rounded-2xl border ${colors[color]} min-w-[90px]`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
      <p className="text-base font-black">{value}</p>
    </div>
  );
}

function SectionHeader({ icon, title, color = "gray" }: { icon: React.ReactNode; title: string; color?: string }) {
  const colors: Record<string, string> = {
    gray:   "text-gray-500 border-gray-200",
    blue:   "text-blue-500 border-blue-100",
    indigo: "text-indigo-500 border-indigo-100",
    emerald:"text-emerald-500 border-emerald-100",
    amber:  "text-amber-500 border-amber-100",
  };
  return (
    <div className={`flex items-center gap-2 border-b pb-2 mb-4 ${colors[color]}`}>
      {icon}
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">{title}</h3>
    </div>
  );
}

function PhotoGrid({ photos, label }: { photos: string[]; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? photos : photos.slice(0, 4);
  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      {photos.length === 0 ? (
        <div className="p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs font-bold text-gray-400 flex flex-col items-center gap-2">
          <Image size={24} className="opacity-30"/>
          No photos uploaded
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visible.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="relative group w-full h-28 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm hover:border-blue-400 transition-all block">
                <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black">
                  View
                </div>
              </a>
            ))}
          </div>
          {photos.length > 4 && (
            <button onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1 text-xs font-black text-blue-500 hover:text-blue-700 transition-colors">
              <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`}/>
              {expanded ? "Show less" : `Show ${photos.length - 4} more`}
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
export default function WorkAuditModal({
  booking, onClose, checklistTemplates, unitConfigs,
}: any) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const workLog = booking.work_logs?.[0];
  const duration = workLog ? getDuration(workLog.start_time, workLog.end_time) : { label: "N/A", mins: 0 };
  const companyName = Array.isArray(booking.units?.companies)
    ? booking.units.companies[0]?.name
    : booking.units?.companies?.name;

  // ── Inventory Logic ──────────────────────────────────────────────────────────
  const inventoryLogs: any[] = booking.booking_inventory_logs || [];

  const returnables = inventoryLogs.filter(i => i.equipment_master?.item_type === "returnable");
  const refillables = inventoryLogs.filter(i => i.equipment_master?.item_type === "refillable");
  const consumables = inventoryLogs.filter(i => i.equipment_master?.item_type === "consumable");

  // Billable: extra_provided_qty > 0
  // Price: supervisor_price ?? unit_equipment_config.extra_unit_price
  const billableItems = useMemo(() => {
    return inventoryLogs
      .filter(i => i.extra_provided_qty > 0)
      .map(i => {
        const config = unitConfigs.find(
          (c: any) => c.unit_id === booking.unit_id && c.equipment_id === i.equipment_id
        );
        const unitPrice =
          i.supervisor_price !== null && i.supervisor_price !== undefined
            ? Number(i.supervisor_price)
            : Number(config?.extra_unit_price || 0);
        const total = i.extra_provided_qty * unitPrice;
        return { ...i, unitPrice, total, isPriced: unitPrice > 0 };
      });
  }, [inventoryLogs, unitConfigs, booking.unit_id]);

  const billableTotal = billableItems.reduce((sum, i) => sum + i.total, 0);

  // ── Checklist Logic ──────────────────────────────────────────────────────────
  const checklistGroups = useMemo(() => {
    const template = checklistTemplates.find((t: any) => t.id === booking.checklist_template_id);
    const sections: any[] = template?.content || [];
    if (sections.length === 0) return null;

    // Content format: [{ id, title, tasks: [{ id, text }] }]
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

  // ── Tab config ───────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode; accent: string; activeClass: string }[] = [
    {
      key: "details", label: "Execution", icon: <FileCheck size={15}/>,
      accent: "blue", activeClass: "border-blue-600 text-blue-700 bg-blue-50/50",
    },
    {
      key: "inventory", label: "Inventory", icon: <Layers size={15}/>,
      accent: "indigo", activeClass: "border-indigo-600 text-indigo-700 bg-indigo-50/50",
    },
    {
      key: "checklist", label: "Checklist", icon: <CheckSquare size={15}/>,
      accent: "emerald", activeClass: "border-emerald-600 text-emerald-700 bg-emerald-50/50",
    },
  ];

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="fixed bottom-0 left-0 w-full h-[90vh] z-50 flex flex-col rounded-t-[2.5rem] overflow-hidden shadow-[0_-24px_80px_-10px_rgba(0,0,0,0.35)]"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-gray-900 via-[#0d1f35] to-gray-900 text-white shrink-0">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-white/20 rounded-full"/>
        </div>

        <div className="px-6 md:px-10 pt-3 pb-5 flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={11}/> Work Audit Report
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight truncate">
              Unit {booking.units?.unit_number}
              <span className="ml-3 text-sm font-bold text-white/50 bg-white/10 px-2.5 py-0.5 rounded-full align-middle">
                {companyName}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                <Building2 size={12}/> {booking.units?.building_name || "N/A"}
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
            <button onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X size={18}/>
            </button>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider ${booking.status === "finalized"
                ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
            }`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Stat pills row */}
        <div className="px-6 md:px-10 pb-4 flex gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl px-4 py-2.5 shrink-0 border border-white/10">
            <Clock size={15} className="text-blue-300"/>
            <div>
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Duration</p>
              <p className="text-sm font-black text-white">{duration.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl px-4 py-2.5 shrink-0 border border-white/10">
            <Camera size={15} className="text-blue-300"/>
            <div>
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Photos</p>
              <p className="text-sm font-black text-white">
                {(workLog?.before_photos?.length || 0) + (workLog?.photo_urls?.length || 0)} Total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl px-4 py-2.5 shrink-0 border border-white/10">
            <Box size={15} className="text-blue-300"/>
            <div>
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Items Tracked</p>
              <p className="text-sm font-black text-white">{inventoryLogs.length}</p>
            </div>
          </div>
          {billableTotal > 0 && (
            <div className="flex items-center gap-2.5 bg-emerald-500/20 rounded-2xl px-4 py-2.5 shrink-0 border border-emerald-400/20">
              <CircleDollarSign size={15} className="text-emerald-300"/>
              <div>
                <p className="text-[8px] font-black text-emerald-200/60 uppercase tracking-widest">Billable</p>
                <p className="text-sm font-black text-emerald-300">AED {billableTotal.toFixed(2)}</p>
              </div>
            </div>
          )}
          {booking.status === "finalized" && booking.price > 0 && (
            <div className="flex items-center gap-2.5 bg-blue-500/20 rounded-2xl px-4 py-2.5 shrink-0 border border-blue-400/20">
              <Receipt size={15} className="text-blue-300"/>
              <div>
                <p className="text-[8px] font-black text-blue-200/60 uppercase tracking-widest">Final Price</p>
                <p className="text-sm font-black text-blue-300">AED {booking.price}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="flex bg-white border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar px-4">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black transition-all border-b-2 whitespace-nowrap ${activeTab === tab.key
                ? tab.activeClass
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#F4F7FA]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="p-6 md:p-8 space-y-6 pb-16"
          >

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 1 — EXECUTION DETAILS                                      */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === "details" && (
              <>
                {workLog ? (
                  <>
                    {/* Booking Info Card */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Building2 size={10}/> Property</p>
                        <p className="font-black text-gray-900 text-base">{companyName}</p>
                        <p className="text-sm font-bold text-gray-500 mt-0.5">Unit {booking.units?.unit_number} · {booking.units?.building_name}</p>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block border border-gray-200">
                          {booking.units?.layout || "Layout N/A"}
                        </span>
                      </div>
                      <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={10}/> Schedule</p>
                        <p className="font-black text-gray-900">{safeFormat(booking.cleaning_date, "EEEE, dd MMM yyyy")}</p>
                        <p className="text-sm font-bold text-gray-500 mt-0.5 flex items-center gap-1"><Clock size={12}/> {booking.cleaning_time || "N/A"}</p>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded mt-1 inline-block">
                          {booking.service_type}
                        </span>
                      </div>
                      <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={10}/> Team</p>
                        <p className="font-black text-gray-900">{booking.teams?.team_name || "Unassigned"}</p>
                        {workLog.agent && (
                          <p className="text-sm font-bold text-gray-500 mt-1">
                            Submitted by <span className="text-gray-900">{workLog.agent.full_name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6">
                      <SectionHeader icon={<Clock size={15} className="text-blue-500"/>} title="Time Tracking" color="blue"/>
                      <div className="flex flex-wrap gap-3">
                        <StatPill label="Start" value={safeFormat(workLog.start_time, "hh:mm a")} color="blue"/>
                        <StatPill label="End" value={safeFormat(workLog.end_time, "hh:mm a")} color="blue"/>
                        <StatPill label="Duration" value={duration.label} color="indigo"/>
                        <StatPill label="Minutes" value={`${duration.mins}`} color="indigo"/>
                      </div>
                      {/* Visual duration bar */}
                      {duration.mins > 0 && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((duration.mins / 240) * 100, 100)}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">Based on 4h standard shift</p>
                        </div>
                      )}
                    </div>

                    {/* Photos */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                      <SectionHeader icon={<Camera size={15} className="text-gray-500"/>} title="Work Evidence" color="gray"/>
                      <PhotoGrid photos={workLog.before_photos || []} label="Before Cleaning"/>
                      <div className="h-px bg-gray-100"/>
                      <PhotoGrid photos={workLog.photo_urls || []} label="After Cleaning"/>
                    </div>
                  </>
                ) : (
                  <div className="p-10 bg-red-50 rounded-3xl border border-red-100 flex flex-col items-center gap-3 text-center">
                    <AlertCircle size={48} className="text-red-400 opacity-80"/>
                    <p className="text-xl font-black text-red-600">Work Log Not Found</p>
                    <p className="text-sm font-medium text-red-400">The team marked this booking, but no work log was submitted.</p>
                  </div>
                )}
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 2 — INVENTORY & BILLABLES                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === "inventory" && (
              <>
                {inventoryLogs.length === 0 ? (
                  <div className="p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold">
                    No equipment tracked for this booking.
                  </div>
                ) : (
                  <>
                    {/* ── Returnables (Linens & Towels) ─────────────────── */}
                    {returnables.length > 0 && (
                      <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3.5 border-b border-orange-100 flex items-center gap-2">
                          <Shirt size={16} className="text-orange-500"/>
                          <span className="font-black text-orange-800 text-sm">Linens & Towels — Returnable</span>
                          <span className="ml-auto text-[10px] font-black bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">
                            {returnables.length} items
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Item</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Target Collect</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Collected</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Provided</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Extra</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Shortage</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">QC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {returnables.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                                    <ItemTypeIcon type="returnable"/>
                                    {item.equipment_master?.item_name}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className="text-xs font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{item.target_collect_qty}</span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${item.collected_qty >= item.target_collect_qty ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                      {item.collected_qty}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                      {item.final_provided_qty}
                                      <span className="text-[9px] font-bold text-indigo-400 ml-1">(Std:{item.standard_qty})</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    {item.extra_provided_qty > 0
                                      ? <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">+{item.extra_provided_qty}</span>
                                      : <span className="text-xs text-gray-300 font-bold">—</span>
                                    }
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    {item.shortage_qty > 0
                                      ? <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-0.5 justify-center"><AlertTriangle size={10}/> {item.shortage_qty}</span>
                                      : <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">OK</span>
                                    }
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${item.qc_status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                      {item.qc_status || "pending"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ── Refillables ───────────────────────────────────── */}
                    {refillables.length > 0 && (
                      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-3.5 border-b border-blue-100 flex items-center gap-2">
                          <Droplets size={16} className="text-blue-500"/>
                          <span className="font-black text-blue-800 text-sm">Dispensers — Refillable</span>
                          <span className="ml-auto text-[10px] font-black bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">
                            {refillables.length} items
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Item</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Intact / Target</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Placed New</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Extra</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Shortage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {refillables.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-2"><ItemTypeIcon type="refillable"/>{item.equipment_master?.item_name}</td>
                                  <td className="px-4 py-3.5 text-center">
                                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                                        {item.collected_qty} / {item.target_collect_qty} (Std: {item.standard_qty})
                                      </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{item.final_provided_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center">
                                    {item.extra_provided_qty > 0
                                      ? <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">+{item.extra_provided_qty}</span>
                                      : <span className="text-xs text-gray-300 font-bold">—</span>
                                    }
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    {item.shortage_qty > 0
                                      ? <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-0.5 justify-center"><AlertTriangle size={10}/> {item.shortage_qty}</span>
                                      : <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">OK</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ── Consumables / Amenities ───────────────────────── */}
                    {consumables.length > 0 && (
                      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3.5 border-b border-emerald-100 flex items-center gap-2">
                          <Sparkles size={16} className="text-emerald-500"/>
                          <span className="font-black text-emerald-800 text-sm">Amenities — Consumable</span>
                          <span className="ml-auto text-[10px] font-black bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-full">
                            {consumables.length} items
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Item</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Intact / Target</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Placed New</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Extra</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {consumables.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-2"><ItemTypeIcon type="consumable"/>{item.equipment_master?.item_name}</td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                      {item.collected_qty} / {item.target_collect_qty} (Std: {item.standard_qty})
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center"><span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{item.final_provided_qty}</span></td>
                                  <td className="px-4 py-3.5 text-center">
                                    {item.extra_provided_qty > 0
                                      ? <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+{item.extra_provided_qty}</span>
                                      : <span className="text-xs text-gray-300 font-bold">—</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ── Billable Summary ──────────────────────────────── */}
                    {billableItems.length > 0 && (
                      <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center gap-2">
                          <CircleDollarSign size={18} className="text-white"/>
                          <span className="font-black text-white text-sm">Extra Provided — Billable Summary</span>
                          {billableTotal > 0 && (
                            <span className="ml-auto text-sm font-black bg-white/20 text-white px-3 py-1 rounded-xl">
                              Total: AED {billableTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Item</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Extra Qty</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Unit Price</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {billableItems.map((item: any) => (
                                <tr key={`bill-${item.id}`} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="px-4 py-3.5">
                                    <p className="font-black text-gray-900">{item.equipment_master?.item_name}</p>
                                    {item.remarks && (
                                      <p className="text-[10px] text-gray-400 mt-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 inline-flex items-center gap-1">
                                        <Tag size={9}/> {item.remarks}
                                      </p>
                                    )}
                                    {item.supervisor_price !== null && item.supervisor_price !== undefined && (
                                      <p className="text-[9px] font-black text-purple-500 mt-1 flex items-center gap-1">
                                        <ShieldCheck size={9}/> Supervisor price applied
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">+{item.extra_provided_qty}</span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    {item.isPriced
                                      ? <span className="text-sm font-bold text-gray-600">{item.unitPrice.toFixed(2)} AED</span>
                                      : <span className="text-xs font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">Pending</span>
                                    }
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    {item.isPriced
                                      ? <span className="text-base font-black text-gray-900">{item.total.toFixed(2)} <span className="text-xs text-gray-400">AED</span></span>
                                      : <span className="text-xs font-black text-amber-500">—</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {billableTotal > 0 && (
                              <tfoot>
                                <tr className="bg-emerald-50 border-t-2 border-emerald-100">
                                  <td colSpan={3} className="px-4 py-3.5 text-sm font-black text-emerald-700">Grand Total Billable</td>
                                  <td className="px-4 py-3.5 text-right text-xl font-black text-emerald-700">
                                    {billableTotal.toFixed(2)} <span className="text-sm">AED</span>
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB 3 — CHECKLIST (scope of work from template)               */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === "checklist" && (
              <>
                {!checklistGroups ? (
                  <div className="p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold flex flex-col items-center gap-3">
                    <CheckSquare size={40} className="opacity-30"/>
                    No checklist template assigned to this booking.
                  </div>
                ) : (
                  <>
                    {/* Template header */}
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

                    {/* Grouped sections */}
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
                            <div key={i}
                              className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
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

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
