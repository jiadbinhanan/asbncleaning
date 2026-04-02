'use client';
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, Camera, FileCheck, CircleDollarSign, CheckSquare,
  PackagePlus, CheckCircle2, AlertCircle, Building2, Calendar,
  Users, ShieldCheck, Layers, Shirt, Droplets,
  AlertTriangle, Hash, ChevronDown, Receipt, Coffee,
  ArrowRight, Tag, Search
} from "lucide-react";
import { format, differenceInMinutes, parseISO } from "date-fns";

type Tab = "details" | "inventory" | "checklist";

const safeFormat = (dt: string, fmt: string) => {
  try { return format(parseISO(dt), fmt); } catch { return "N/A"; }
};
const getDuration = (start: string, end: string) => {
  if (!start || !end) return "N/A";
  const mins = differenceInMinutes(parseISO(end), parseISO(start));
  const h = Math.floor(mins / 60); const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Photo Grid ──────────────────────────────────────────────────────────────
function PhotoGrid({ photos, label }: { photos: string[]; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? photos : photos.slice(0, 4);
  return (
    <div>
      <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3'>{label}</p>
      {photos.length === 0 ? (
        <div className='p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs font-bold text-gray-400'>
          No photos uploaded
        </div>
      ) : (
        <>
          <div className='grid grid-cols-3 md:grid-cols-4 gap-2'>
            {visible.map((url, i) => (
              <a key={i} href={url} target='_blank' rel='noreferrer'
                className='relative group h-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm hover:border-blue-400 transition-all block'>
                <img src={url} alt={`${label} ${i + 1}`} className='w-full h-full object-cover' />
                <div className='absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black'>View</div>
              </a>
            ))}
          </div>
          {photos.length > 4 && (
            <button onClick={() => setExpanded(!expanded)} className='mt-2 text-xs font-black text-blue-500 flex items-center gap-1'>
              <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Show less" : `+${photos.length - 4} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Colour-coded stat cell ───────────────────────────────────────────────────
const CELL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  collect:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
  standard: { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-100" },
  extra:    { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-100" },
  provide:  { bg: "bg-slate-100",  text: "text-slate-700",   border: "border-slate-200" },
  ok:       { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  warn:     { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-100" },
  neutral:  { bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-100" },
  teal:     { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-100" },
};

function StatCell({
  label, sublabel, value, variant = "neutral",
}: { label: string; sublabel?: string; value: string | number; variant?: keyof typeof CELL_STYLES }) {
  const s = CELL_STYLES[variant];
  return (
    <div className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border ${s.bg} ${s.border}`}>
      <p className={`text-base font-black ${s.text}`}>{value}</p>
      <p className='text-[9px] font-black text-gray-500 uppercase tracking-wide mt-0.5 text-center'>{label}</p>
      {sublabel && <p className={`text-[8px] font-bold mt-0.5 ${s.text} opacity-70`}>{sublabel}</p>}
    </div>
  );
}

// ─── Legend strip (shown once at top of inventory tab) ───────────────────────
function Legend() {
  const items = [
    { variant: "collect",  label: "Collected / Returned to Stock" },
    { variant: "standard", label: "Standard per Room" },
    { variant: "extra",    label: "Extra (Billed)" },
    { variant: "provide",  label: "Total Provided" },
    { variant: "ok",       label: "OK / No Issues" },
    { variant: "warn",     label: "Shortage / Missing" },
  ] as { variant: keyof typeof CELL_STYLES; label: string }[];
  return (
    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
      <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3'>Colour Guide</p>
      <div className='flex flex-wrap gap-2'>
        {items.map(({ variant, label }) => {
          const s = CELL_STYLES[variant];
          return (
            <span key={variant} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${s.bg} ${s.text} ${s.border}`}>
              <span className={`w-2 h-2 rounded-full ${s.bg.replace("50", "400").replace("100", "400")}`} />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── RETURNABLE Row ───────────────────────────────────────────────────────────
function ReturnableRow({ item, standardQty }: { item: any; standardQty: number }) {
  const shortage  = item.shortage_qty || 0;
  const extra     = item.extra_provided_qty || 0;
  const base      = item.final_provided_qty - extra;
  const collectOk = item.collected_qty >= item.target_collect_qty;

  return (
    <div className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
      {/* Row header */}
      <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100'>
        <div className='flex items-center gap-2'>
          <Shirt size={14} className='text-orange-500 shrink-0' />
          <span className='font-black text-gray-900 text-sm'>{item.equipment_master?.item_name}</span>
        </div>
        <div className='flex items-center gap-1.5 flex-wrap justify-end'>
          {shortage > 0
            ? <span className='text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-red-200'><AlertTriangle size={9} /> {shortage} Shortage</span>
            : <span className='text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-200'><CheckCircle2 size={9} /> No Shortage</span>
          }
          {extra > 0 && <span className='text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200'>+{extra} Extra</span>}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${item.qc_status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            QC: {item.qc_status === "completed" ? "Done ✓" : "Pending"}
          </span>
        </div>
      </div>

      {/* Cells */}
      <div className='grid grid-cols-3 md:grid-cols-6 gap-2 p-3'>
        <StatCell label='Was in Room'   sublabel='Target Collect'  value={item.target_collect_qty}           variant='neutral' />
        <StatCell label='Collected'     sublabel='Dirty Picked Up' value={item.collected_qty}                variant={collectOk ? "collect" : "warn"} />
        <StatCell label='Standard'      sublabel='Per Room'        value={standardQty}                 variant='standard' />
        <StatCell label='Base Provided' sublabel='Fresh Placed'    value={base}                              variant='provide' />
        <StatCell label='Extra'         sublabel='Above Std'       value={extra > 0 ? `+${extra}` : "—"}    variant={extra > 0 ? "extra" : "neutral"} />
        <StatCell label='Shortage'      sublabel='Missing'         value={shortage > 0 ? shortage : "None"} variant={shortage > 0 ? "warn" : "ok"} />
      </div>

      {/* Footer */}
      <div className='px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-500'>
        <span className='bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black'>{item.collected_qty} collected → QC → Laundry</span>
        <ArrowRight size={10} className='text-gray-400' />
        <span className='bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black'>{item.final_provided_qty} fresh provided (Std {base} + Extra {extra})</span>
      </div>
    </div>
  );
}

// ─── REFILLABLE Row ───────────────────────────────────────────────────────────
function RefillableRow({ item, standardQty }: { item: any; standardQty: number }) {
  const collectedToStock = item.collected_qty;
  const extra            = item.extra_provided_qty || 0;
  const base             = item.final_provided_qty - extra;
  const missing          = Math.max(0, item.target_collect_qty - collectedToStock);

  return (
    <div className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
      <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100'>
        <div className='flex items-center gap-2'>
          <Droplets size={14} className='text-blue-500 shrink-0' />
          <span className='font-black text-gray-900 text-sm'>{item.equipment_master?.item_name}</span>
        </div>
        <div className='flex items-center gap-1.5 flex-wrap justify-end'>
          {missing > 0
            ? <span className='text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-red-200'><AlertTriangle size={9} /> {missing} Missing</span>
            : <span className='text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-200'><CheckCircle2 size={9} /> All Collected</span>
          }
          {extra > 0 && <span className='text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200'>+{extra} Extra</span>}
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-5 gap-2 p-3'>
        <StatCell label='Was in Room'       sublabel='Prev Balance'    value={item.target_collect_qty}            variant='neutral' />
        <StatCell label='Collected→Stock'   sublabel='Usable Returned' value={collectedToStock}                  variant={missing === 0 ? "collect" : "warn"} />
        <StatCell label='Standard'          sublabel='Per Room'        value={standardQty}                 variant='standard' />
        <StatCell label='Base Placed Fresh' sublabel='New in Room'     value={base}                              variant='provide' />
        <StatCell label='Extra'             sublabel='Above Std'       value={extra > 0 ? `+${extra}` : "—"}    variant={extra > 0 ? "extra" : "neutral"} />
      </div>

      <div className='px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-500'>
        <span className='bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black'>{collectedToStock} usable → stock</span>
        <span className='mx-1 text-gray-300'>|</span>
        <span className='bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black'>{item.final_provided_qty} fresh in room (Std {base} + Extra {extra})</span>
        {missing > 0 && <span className='ml-auto bg-red-100 text-red-600 px-2 py-0.5 rounded font-black'>⚠ {missing} not recovered</span>}
      </div>
    </div>
  );
}

// ─── CONSUMABLE Row ───────────────────────────────────────────────────────────
function ConsumableRow({ item, standardQty }: { item: any; standardQty: number }) {
  const collectedToStock = item.collected_qty;           // unused → back to warehouse
  const extra            = item.extra_provided_qty || 0;
  const base             = item.final_provided_qty - extra;
  const totalPlaced      = item.final_provided_qty;
  const fullyStocked     = totalPlaced >= standardQty;

  return (
    <div className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
      <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100'>
        <div className='flex items-center gap-2'>
          <Coffee size={14} className='text-emerald-500 shrink-0' />
          <span className='font-black text-gray-900 text-sm'>{item.equipment_master?.item_name}</span>
        </div>
        <div className='flex items-center gap-1.5 flex-wrap justify-end'>
          {fullyStocked
            ? <span className='text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-200'><CheckCircle2 size={9} /> Fully Stocked</span>
            : <span className='text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-amber-200'><AlertTriangle size={9} /> Below Std</span>
          }
          {extra > 0 && <span className='text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200'>+{extra} Extra</span>}
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-5 gap-2 p-3'>
        <StatCell label='Standard'         sublabel='Per Room'         value={standardQty}                         variant='standard' />
        <StatCell label='Collected→Stock'  sublabel='Unused Returned'  value={collectedToStock > 0 ? collectedToStock : "—"} variant={collectedToStock > 0 ? "collect" : "neutral"} />
        <StatCell label='Base Placed'      sublabel='Fresh This Visit' value={base}                                       variant='provide' />
        <StatCell label='Extra'            sublabel='Guest Request'    value={extra > 0 ? `+${extra}` : "—"}             variant={extra > 0 ? "extra" : "neutral"} />
        <StatCell label='Total in Room'    sublabel='Now Placed'       value={totalPlaced}                                variant={fullyStocked ? "ok" : "warn"} />
      </div>

      <div className='px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-500'>
        {collectedToStock > 0
          ? <span className='bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black'>{collectedToStock} unused → stock</span>
          : <span className='bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-black'>None collected</span>
        }
        <span className='mx-1 text-gray-300'>|</span>
        <span className={`px-2 py-0.5 rounded font-black ${fullyStocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {totalPlaced} placed (Std {base} + Extra {extra})
        </span>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ icon, title, subtitle, count, color }: any) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${color}`}>
      <div className='shrink-0'>{icon}</div>
      <div className='flex-1'>
        <p className='font-black text-sm leading-none'>{title}</p>
        <p className='text-[10px] font-bold opacity-60 mt-0.5'>{subtitle}</p>
      </div>
      <span className='text-xs font-black opacity-70 bg-white/70 px-2.5 py-1 rounded-lg'>{count} items</span>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function WorkAuditModal({
  booking, onClose, checklistTemplates, unitConfigs,
}: any) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const workLog      = booking.work_logs?.[0];
  const inventoryLogs: any[] = booking.booking_inventory_logs || [];
  const extraCharges: any[]  = booking.booking_extra_added_charges || [];

  const companyName  = Array.isArray(booking.units?.companies)
    ? booking.units.companies[0]?.name : booking.units?.companies?.name;

  const returnables = inventoryLogs.filter(i => i.equipment_master?.item_type === "returnable");
  const refillables = inventoryLogs.filter(i => i.equipment_master?.item_type === "refillable");
  const consumables = inventoryLogs.filter(i => i.equipment_master?.item_type === "consumable");

  // Calcs for Extra Inventory & Added Charges
  const billableItems = useMemo(() => {
    return inventoryLogs.filter(i => i.extra_provided_qty > 0).map(i => {
      const config = unitConfigs.find(
        (c: any) => c.unit_id === booking.unit_id && c.equipment_id === i.equipment_id
      );
      const unitPrice = i.supervisor_price != null
        ? Number(i.supervisor_price)
        : Number(config?.extra_unit_price || 0);
      return { ...i, unitPrice, total: i.extra_provided_qty * unitPrice, isPriced: unitPrice > 0 };
    });
  }, [inventoryLogs, unitConfigs, booking.unit_id]);

  const billableTotal = billableItems.reduce((sum, i) => sum + i.total, 0);
  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const grandTotal = Number(booking.price || 0) + billableTotal + extraChargesTotal;

  const invSummary = useMemo(() => ({
    shortageItems:    inventoryLogs.filter(i => (i.shortage_qty || 0) > 0).length,
    missingRefill:    refillables.filter(i => i.collected_qty < i.target_collect_qty).length,
    consumableCollected: consumables.reduce((sum, i) => sum + (i.collected_qty || 0), 0),
    totalItems:       inventoryLogs.length,
  }), [inventoryLogs, refillables, consumables]);

  const checklistGroups = useMemo(() => {
    const template = checklistTemplates.find((t: any) => t.id === booking.checklist_template_id);
    const sections: any[] = template?.content || [];
    if (!sections.length) return null;
    const grouped: Record<string, { task: string }[]> = {};
    let totalTasks = 0;
    sections.forEach((s: any) => {
      const title = s.title || "General";
      grouped[title] = (s.tasks || []).map((t: any) => ({ task: t.text || String(t) }));
      totalTasks += grouped[title].length;
    });
    return { template, grouped, totalTasks };
  }, [checklistTemplates, booking.checklist_template_id]);

  const getStdQty = (equipmentId: number): number => {
    const config = unitConfigs.find(
      (c: any) => c.unit_id === booking.unit_id && c.equipment_id === equipmentId
    );
    return Number(config?.standard_qty || 0);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { key: "details",   label: "Execution",  icon: <FileCheck size={14} />,   activeClass: "border-blue-600 text-blue-700 bg-blue-50/50" },
    { key: "inventory", label: "Inventory",  icon: <Layers size={14} />,      activeClass: "border-indigo-600 text-indigo-700 bg-indigo-50/50" },
    { key: "checklist", label: "Checklist",  icon: <CheckSquare size={14} />, activeClass: "border-emerald-600 text-emerald-700 bg-emerald-50/50" },
  ];

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className='fixed bottom-0 left-0 w-full h-[92vh] z-50 flex flex-col rounded-t-[2.5rem] overflow-hidden shadow-[0_-24px_80px_-10px_rgba(0,0,0,0.4)]'
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className='bg-gradient-to-r from-gray-900 via-[#0d1f35] to-gray-900 text-white shrink-0'>
        <div className='flex justify-center pt-3 pb-1'>
          <div className='w-12 h-1 bg-white/20 rounded-full' />
        </div>

        <div className='px-6 md:px-10 pt-3 pb-4 flex justify-between items-start'>
          <div className='flex-1 min-w-0 pr-4'>
            <p className='text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5'>
              <ShieldCheck size={11} /> Admin · Work Audit Report
            </p>
            <h2 className='text-2xl md:text-3xl font-black tracking-tight leading-tight'>
              Unit {booking.units?.unit_number}
              <span className='ml-3 text-sm font-bold text-white/50 bg-white/10 px-2.5 py-0.5 rounded-full align-middle'>{companyName}</span>
            </h2>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 mt-2'>
              {booking.booking_ref && (
                <span className='flex items-center gap-1 text-xs font-black text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-400/20'>
                  <Hash size={11} /> {booking.booking_ref}
                </span>
              )}
              <span className='flex items-center gap-1.5 text-xs font-bold text-white/60'><Building2 size={12} /> {booking.units?.building_name}</span>
              <span className='flex items-center gap-1.5 text-xs font-bold text-white/60'><Calendar size={12} /> {safeFormat(booking.cleaning_date, "dd MMM yyyy")}</span>
              <span className='flex items-center gap-1.5 text-xs font-bold text-white/60'><Users size={12} /> {booking.teams?.team_name || "Unassigned"}</span>
            </div>
          </div>

          <div className='flex flex-col items-end gap-2 shrink-0'>
            <button onClick={onClose} className='p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors'>
              <X size={18} />
            </button>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border ${booking.status === "finalized"
              ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
              : "bg-amber-400/20 text-amber-300 border-amber-400/30"
            }`}>
              {booking.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className='flex bg-white border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar px-4'>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black transition-all border-b-2 whitespace-nowrap ${activeTab === tab.key ? tab.activeClass : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className='flex-1 overflow-y-auto bg-[#F4F7FA]'>
        <AnimatePresence mode='wait'>
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className='p-6 md:p-8 space-y-6 pb-16'>

            {/* ══ TAB 1 — EXECUTION ══ */}
            {activeTab === "details" && (
              <>
                {/* Booking info */}
                <div className='bg-white rounded-3xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <div>
                    <p className='text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1'><Building2 size={10} /> Property</p>
                    <p className='font-black text-gray-900 text-base'>{companyName}</p>
                    <p className='text-sm font-bold text-gray-500 mt-0.5'>Unit {booking.units?.unit_number} · {booking.units?.building_name}</p>
                    <div className='flex flex-wrap gap-1.5 mt-2'>
                      <span className='text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200'>{booking.units?.layout || "N/A"}</span>
                      <span className='text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200'>{booking.service_type}</span>
                    </div>
                  </div>
                  <div className='border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6'>
                    <p className='text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1'><Calendar size={10} /> Schedule</p>
                    <p className='font-black text-gray-900'>{safeFormat(booking.cleaning_date, "EEEE, dd MMM yyyy")}</p>
                    <p className='text-sm font-bold text-gray-500 mt-0.5 flex items-center gap-1'><Clock size={12} /> {booking.cleaning_time || "N/A"}</p>
                    {booking.booking_ref && <p className='text-sm font-black text-indigo-600 mt-1 flex items-center gap-1'><Hash size={12} /> {booking.booking_ref}</p>}
                  </div>
                  <div className='border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between'>
                    <div>
                      <p className='text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1'><Users size={10} /> Team</p>
                      <p className='font-black text-gray-900'>{booking.teams?.team_name || "Unassigned"}</p>
                      {workLog?.agent && (
                        <p className='text-sm font-bold text-gray-500 mt-1'>By <span className='text-gray-900'>{workLog.agent.full_name}</span></p>
                      )}
                    </div>
                  </div>
                </div>

                {workLog ? (
                  <>
                    {/* Time tracking */}
                    <div className='bg-white rounded-3xl border border-blue-100 shadow-sm p-6'>
                      <p className='text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2'><Clock size={13} /> Time Tracking</p>
                      <div className='flex flex-wrap gap-3'>
                        <div className='flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 min-w-[90px]'>
                          <p className='text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5'>Started</p>
                          <p className='text-base font-black text-blue-800'>{safeFormat(workLog.start_time, "hh:mm a")}</p>
                        </div>
                        <div className='flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 min-w-[90px]'>
                          <p className='text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5'>Ended</p>
                          <p className='text-base font-black text-blue-800'>{safeFormat(workLog.end_time, "hh:mm a")}</p>
                        </div>
                        <div className='flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 min-w-[90px]'>
                          <p className='text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5'>Duration</p>
                          <p className='text-base font-black text-indigo-800'>{getDuration(workLog.start_time, workLog.end_time)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className='bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5'>
                      <p className='text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2'><Camera size={13} /> Work Evidence</p>
                      <PhotoGrid photos={workLog.before_photos || []} label='Before Cleaning' />
                      <div className='h-px bg-gray-100' />
                      <PhotoGrid photos={workLog.photo_urls || []} label='After Cleaning' />
                    </div>

                    {/* 🚨 Damaged Items 🚨 */}
                    {workLog.damaged_items && (
                      <div className='bg-red-50 rounded-3xl border border-red-200 shadow-sm p-6 space-y-4'>
                        <p className='text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2'>
                          <AlertTriangle size={14} /> Damaged Item Reported
                        </p>
                        {workLog.damaged_items.remarks && (
                          <p className='text-sm font-bold text-red-800 bg-red-100/60 p-3.5 rounded-xl border border-red-200'>
                            {workLog.damaged_items.remarks}
                          </p>
                        )}
                        {workLog.damaged_items.photos?.length > 0 && (
                          <div className="pt-2">
                            <PhotoGrid photos={workLog.damaged_items.photos} label='Damage Photos' />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 🚨 Lost & Found Items 🚨 */}
                    {workLog.lost_found_items && (
                      <div className='bg-amber-50 rounded-3xl border border-amber-200 shadow-sm p-6 space-y-4'>
                        <p className='text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2'>
                          <Search size={14} /> Lost & Found Item
                        </p>
                        {workLog.lost_found_items.remarks && (
                          <p className='text-sm font-bold text-amber-900 bg-amber-100/60 p-3.5 rounded-xl border border-amber-200'>
                            {workLog.lost_found_items.remarks}
                          </p>
                        )}
                        {workLog.lost_found_items.photos?.length > 0 && (
                          <div className="pt-2">
                            <PhotoGrid photos={workLog.lost_found_items.photos} label='Found Item Photos' />
                          </div>
                        )}
                      </div>
                    )}

                  </>
                ) : (
                  <div className="p-10 bg-red-50 rounded-3xl border border-red-100 flex flex-col items-center gap-3 text-center">
                    <AlertCircle size={48} className="text-red-400 opacity-80" />
                    <p className="text-xl font-black text-red-600">Work Log Not Found</p>
                    <p className="text-sm text-red-400">The team marked this booking but no work log was submitted.</p>
                  </div>
                )}

                {/* 🚨 NEW: Billing & Charges Details (Separated from top section) 🚨 */}
                <div className='bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 mt-6'>
                  <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2'>
                    <Receipt size={14} /> Billing & Charges Details
                  </p>

                  <div className='space-y-3'>
                    {/* Main Booking Price */}
                    <div className='flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-100'>
                      <span className='text-sm font-bold text-gray-600 flex items-center gap-2'>
                        <div className='w-2 h-2 rounded-full bg-blue-400'/> Main Cleaning Price
                      </span>
                      <span className='font-black text-gray-900 text-base'>AED {Number(booking.price || 0).toFixed(2)}</span>
                    </div>

                    {/* Extra Inventory Billed */}
                    {billableTotal > 0 && (
                      <div className='flex justify-between items-center bg-indigo-50 p-3.5 rounded-xl border border-indigo-100'>
                        <span className='text-sm font-bold text-indigo-700 flex items-center gap-2'>
                          <div className='w-2 h-2 rounded-full bg-indigo-400'/> Extra Inventory Provided
                        </span>
                        <span className='font-black text-indigo-900 text-base'>AED {billableTotal.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Damage Charges */}
                    {extraCharges.filter(c => c.charge_type === 'damage').length > 0 && (
                      <div className='flex justify-between items-center bg-red-50 p-3.5 rounded-xl border border-red-100'>
                        <span className='text-sm font-bold text-red-700 flex items-center gap-2'>
                          <div className='w-2 h-2 rounded-full bg-red-400'/> Damaged Items Charges
                        </span>
                        <span className='font-black text-red-900 text-base'>
                          AED {extraCharges.filter(c => c.charge_type === 'damage').reduce((s, c) => s + Number(c.amount), 0).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Manual/Custom Charges */}
                    {extraCharges.filter(c => c.charge_type === 'manual').length > 0 && (
                      <div className='flex justify-between items-center bg-orange-50 p-3.5 rounded-xl border border-orange-100'>
                        <span className='text-sm font-bold text-orange-700 flex items-center gap-2'>
                          <div className='w-2 h-2 rounded-full bg-orange-400'/> Custom / Manual Charges
                        </span>
                        <span className='font-black text-orange-900 text-base'>
                          AED {extraCharges.filter(c => c.charge_type === 'manual').reduce((s, c) => s + Number(c.amount), 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className='h-px bg-gray-100 my-4' />

                  {/* Grand Total */}
                  <div className='flex justify-between items-center bg-gray-900 p-5 rounded-2xl shadow-md'>
                    <span className='text-sm font-black text-white uppercase tracking-widest'>Grand Total Invoice</span>
                    <span className='text-2xl font-black text-emerald-400'>AED {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            {/* ══ TAB 2 — INVENTORY ══ */}
            {activeTab === "inventory" && (
              <>
                {inventoryLogs.length === 0 ? (
                  <div className='p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold'>
                    No equipment tracked for this booking.
                  </div>
                ) : (
                  <>
                    {/* Summary counts */}
                    <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
                      {[
                        { label: "Total",      value: invSummary.totalItems,       color: "bg-gray-100 text-gray-700" },
                        { label: "Returnable", value: returnables.length,          color: "bg-orange-100 text-orange-700" },
                        { label: "Refillable", value: refillables.length,          color: "bg-blue-100 text-blue-700" },
                        { label: "Consumable", value: consumables.length,          color: "bg-emerald-100 text-emerald-700" },
                        { label: "Issues",     value: invSummary.shortageItems + invSummary.missingRefill,
                          color: (invSummary.shortageItems + invSummary.missingRefill) > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400" },
                      ].map((s, i) => (
                        <div key={i} className={`${s.color} rounded-2xl px-4 py-3 text-center`}>
                          <p className='text-2xl font-black'>{s.value}</p>
                          <p className='text-[10px] font-black uppercase tracking-wider opacity-70 mt-0.5'>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Colour legend */}
                    <Legend />

                    {/* Returnables */}
                    {returnables.length > 0 && (
                      <div className='space-y-2'>
                        <SectionLabel icon={<Shirt size={16} className='text-orange-600' />} title='Linens & Towels — Returnable' subtitle='Dirty collected → QC → Laundry → Fresh placed' count={returnables.length} color='bg-orange-50 border-orange-100 text-orange-900' />
                        {returnables.map((item: any) => <ReturnableRow key={item.id} item={item} standardQty={getStdQty(item.equipment_id)} />)}
                      </div>
                    )}

                    {/* Refillables */}
                    {refillables.length > 0 && (
                      <div className='space-y-2'>
                        <SectionLabel icon={<Droplets size={16} className='text-blue-600' />} title='Dispensers & Bottles — Refillable' subtitle='Usable collected to stock → All-fresh placed in room' count={refillables.length} color='bg-blue-50 border-blue-100 text-blue-900' />
                        {refillables.map((item: any) => <RefillableRow key={item.id} item={item} standardQty={getStdQty(item.equipment_id)} />)}
                      </div>
                    )}

                    {/* Consumables */}
                    {consumables.length > 0 && (
                      <div className='space-y-2'>
                        <SectionLabel icon={<Coffee size={16} className='text-emerald-600' />} title='Amenities & Top-Ups — Consumable' subtitle='Unused collected to stock → Fresh standard qty placed each visit' count={consumables.length} color='bg-emerald-50 border-emerald-100 text-emerald-900' />
                        {consumables.map((item: any) => <ConsumableRow key={item.id} item={item} standardQty={getStdQty(item.equipment_id)} />)}
                      </div>
                    )}

                    {/* Billable summary — VIEW ONLY */}
                    {billableItems.length > 0 && (
                      <div className='bg-white rounded-3xl border border-indigo-200 shadow-sm overflow-hidden'>
                        <div className='bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 flex items-center gap-2'>
                          <PackagePlus size={18} className='text-white' />
                          <span className='font-black text-white text-sm'>Extra Provided — Billable Summary</span>
                          {billableTotal > 0 && (
                            <span className='ml-auto text-sm font-black bg-white/20 text-white px-3 py-1 rounded-xl'>
                              Total: AED {billableTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className='overflow-x-auto'>
                          <table className='w-full text-left text-sm'>
                            <thead className='bg-gray-50 border-b border-gray-100'>
                              <tr>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider'>Item</th>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center'>Extra Qty</th>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center'>Unit Price</th>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right'>Total</th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-50'>
                              {billableItems.map((item: any) => (
                                <tr key={`bill-${item.id}`} className='hover:bg-indigo-50/30 transition-colors'>
                                  <td className='px-4 py-3.5'>
                                    <div className='flex items-center gap-2'>
                                      {item.equipment_master?.item_type === "returnable" ? <Shirt size={12} className='text-orange-400' /> : item.equipment_master?.item_type === "refillable" ? <Droplets size={12} className='text-blue-400' /> : <Coffee size={12} className='text-emerald-400' />}
                                      <p className='font-black text-gray-900'>{item.equipment_master?.item_name}</p>
                                    </div>
                                    {item.remarks && (
                                      <p className='text-[10px] text-gray-400 mt-1 bg-gray-50 px-2 py-0.5 rounded inline-flex items-center gap-1'>
                                        <Tag size={9} /> {item.remarks}
                                      </p>
                                    )}
                                    {item.supervisor_price != null && (
                                      <p className='text-[9px] font-black text-indigo-500 mt-0.5 flex items-center gap-1'>
                                        <ShieldCheck size={9} /> Supervisor price applied
                                      </p>
                                    )}
                                  </td>
                                  <td className='px-4 py-3.5 text-center'>
                                    <span className='text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100'>+{item.extra_provided_qty}</span>
                                  </td>
                                  <td className='px-4 py-3.5 text-center'>
                                    {item.isPriced
                                      ? <span className='text-sm font-bold text-gray-700'>{item.unitPrice.toFixed(2)} AED</span>
                                      : <span className='text-xs font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100'>Pending</span>
                                    }
                                  </td>
                                  <td className='px-4 py-3.5 text-right'>
                                    {item.isPriced
                                      ? <span className='text-base font-black text-gray-900'>{item.total.toFixed(2)} <span className='text-xs text-gray-400'>AED</span></span>
                                      : <span className='text-xs font-black text-amber-500'>—</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {billableTotal > 0 && (
                              <tfoot>
                                <tr className='bg-indigo-50 border-t-2 border-indigo-100'>
                                  <td colSpan={3} className='px-4 py-3.5 text-sm font-black text-indigo-700'>Inventory Billable Total</td>
                                  <td className='px-4 py-3.5 text-right text-xl font-black text-indigo-700'>
                                    {billableTotal.toFixed(2)} <span className='text-sm'>AED</span>
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}

                    {/* View Only Extra Added Charges (Manual/Damaged) */}
                    {extraCharges.length > 0 && (
                      <div className='bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden mt-4'>
                        <div className='bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4 flex items-center gap-2'>
                          <AlertTriangle size={18} className='text-white' />
                          <span className='font-black text-white text-sm'>Extra Added Charges (Damage & Manual)</span>
                          <span className='ml-auto text-sm font-black bg-white/20 text-white px-3 py-1 rounded-xl'>
                            Total: AED {extraChargesTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className='overflow-x-auto'>
                          <table className='w-full text-left text-sm'>
                            <thead className='bg-gray-50 border-b border-gray-100'>
                              <tr>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider w-24'>Type</th>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider'>Description</th>
                                <th className='px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right'>Amount</th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-50'>
                              {extraCharges.map((charge: any) => (
                                <tr key={charge.id} className='hover:bg-orange-50/30 transition-colors'>
                                  <td className='px-4 py-3.5'>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${charge.charge_type === 'damage' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                      {charge.charge_type === 'damage' ? '🔥 DMG' : '✏️ Manual'}
                                    </span>
                                  </td>
                                  <td className='px-4 py-3.5 font-bold text-gray-800'>{charge.item_description}</td>
                                  <td className='px-4 py-3.5 text-right font-black text-gray-900'>{Number(charge.amount).toFixed(2)} <span className='text-xs text-gray-400'>AED</span></td>
                                </tr>
                              ))}
                            </tbody>
                            {extraChargesTotal > 0 && (
                              <tfoot>
                                <tr className='bg-orange-50 border-t-2 border-orange-100'>
                                  <td colSpan={2} className='px-4 py-3.5 text-sm font-black text-orange-700'>Charges Total</td>
                                  <td className='px-4 py-3.5 text-right text-xl font-black text-orange-700'>
                                    {extraChargesTotal.toFixed(2)} <span className='text-sm'>AED</span>
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

            {/* ══ TAB 3 — CHECKLIST ══ */}
            {activeTab === "checklist" && (
              !checklistGroups ? (
                <div className='p-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 font-bold flex flex-col items-center gap-3'>
                  <CheckSquare size={40} className='opacity-30' />
                  No checklist template assigned to this booking.
                </div>
              ) : (
                <>
                  <div className='bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-5 flex items-center justify-between shadow-sm'>
                    <div>
                      <p className='text-[9px] font-black text-emerald-100/70 uppercase tracking-widest mb-1'>Assigned Template</p>
                      <p className='text-lg font-black text-white'>{checklistGroups.template.title}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-black text-white'>{checklistGroups.totalTasks}</p>
                      <p className='text-[10px] font-bold text-emerald-100/70'>Total Tasks</p>
                    </div>
                  </div>

                  {Object.entries(checklistGroups.grouped).map(([section, tasks]: [string, any]) => (
                    <div key={section} className='bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden'>
                      <div className='bg-gray-50 border-b border-gray-100 px-5 py-3.5 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className='w-2 h-2 rounded-full bg-emerald-400' />
                          <h4 className='font-black text-gray-700 text-sm'>{section}</h4>
                        </div>
                        <span className='text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100'>{tasks.length} tasks</span>
                      </div>
                      <div className='p-5 grid grid-cols-1 md:grid-cols-2 gap-3'>
                        {tasks.map((t: any, i: number) => (
                          <div key={i} className='flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all'>
                            <div className='mt-0.5 shrink-0 w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center'>
                              <CheckCircle2 size={13} className='text-emerald-600' />
                            </div>
                            <span className='text-sm font-bold text-gray-700 leading-snug'>{t.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}