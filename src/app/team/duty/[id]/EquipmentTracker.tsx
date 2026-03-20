"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Loader2, RefreshCcw, Droplets, Coffee,
  PackagePlus, CheckCircle2, AlertTriangle, Info, ChevronDown,
} from "lucide-react";

interface EquipmentTrackerProps {
  bookingId: string;
  unitId: number;
  onDataChange: (data: any[]) => void;
}

// ─── Reusable dropdown ────────────────────────────────────────────────────────
const Dropdown = ({
  label, value, onChange, max, colorClass, prefix = "",
}: {
  label: string; value: number; onChange: (n: number) => void;
  max: number; colorClass: string; prefix?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    <div className={`relative inline-flex items-center`}>
      <select
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className={`appearance-none pl-3 pr-7 py-2.5 rounded-xl border font-black text-sm outline-none cursor-pointer bg-white w-full transition-all ${colorClass}`}
      >
        {Array.from({ length: max + 1 }, (_, i) => i).map(n => (
          <option key={n} value={n}>{prefix}{n}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2 pointer-events-none opacity-50" />
    </div>
  </div>
);

// ─── Status pill ──────────────────────────────────────────────────────────────
const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
    {ok ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
    {label}
  </span>
);

// ─── Info banner ──────────────────────────────────────────────────────────────
const InfoBanner = ({ color, text }: { color: string; text: string }) => (
  <div className={`flex items-start gap-2 px-4 py-2.5 border-b text-xs font-bold ${color}`}>
    <Info size={13} className="mt-0.5 shrink-0 opacity-60" />
    <span>{text}</span>
  </div>
);

// ─── RETURNABLE card ──────────────────────────────────────────────────────────
// Collect dirty → provide fresh standard + optional extra
const ReturnableCard = ({ item, onUpdate }: {
  item: any; onUpdate: (id: number, field: string, val: number) => void;
}) => {
  const totalProvide = item.base_provide + item.extra_provide;
  const shortage     = Math.max(0, item.target_collect - item.collected);
  const collectOk    = item.collected >= item.target_collect;

  return (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
            <RefreshCcw size={14} className="text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-none">{item.item_name}</p>
            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mt-0.5">Linen · Collect & Replace</p>
          </div>
        </div>
        <span className="text-[10px] font-black text-orange-700 bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg">
          Std: {item.standard_provide}
        </span>
      </div>

      <InfoBanner
        color="bg-blue-50 border-blue-100 text-blue-700"
        text={`Collect all dirty linens from the room (expected: ${item.target_collect}). Standard qty is pre-filled — increase only if confirmed with supervisor. Add extra if guest requests more.`}
      />

      {/* 3-col body */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {/* COLLECTED */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Collected"
            value={item.collected}
            onChange={v => onUpdate(item.equipment_id, "collected", v)}
            max={item.target_collect + 10}
            colorClass="border-orange-200 text-orange-700"
          />
          <p className="text-[10px] text-gray-400 font-bold">Expected: {item.target_collect}</p>
          {shortage > 0 && <Pill ok={false} label={`${shortage} missing`} />}
          {collectOk && <Pill ok={true} label="All collected" />}
        </div>

        {/* BASE PROVIDE */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Base Provide"
            value={item.base_provide}
            onChange={v => onUpdate(item.equipment_id, "base_provide", v)}
            max={item.standard_provide}
            colorClass="border-indigo-200 text-indigo-700"
          />
          <p className="text-[10px] text-gray-400 font-bold">Standard: {item.standard_provide}</p>
        </div>

        {/* EXTRA */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Extra"
            value={item.extra_provide}
            onChange={v => onUpdate(item.equipment_id, "extra_provide", v)}
            max={10}
            colorClass="border-purple-200 text-purple-700"
            prefix="+"
          />
          <p className="text-[10px] text-gray-400 font-bold">Guest request</p>
          {item.extra_provide > 0 && <Pill ok={true} label={`+${item.extra_provide} billed`} />}
        </div>
      </div>

      {/* Footer summary */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5 items-center text-[10px] font-bold text-gray-500">
        <span>Collected: <span className="text-orange-700 font-black">{item.collected}</span> → laundry</span>
        <div className="w-px h-3 bg-gray-200" />
        <span>Providing: <span className="text-indigo-700 font-black">{totalProvide}</span>
          <span className="text-gray-400 font-bold"> (Base {item.base_provide} + Extra {item.extra_provide})</span>
        </span>
        {item.extra_provide > 0 && <><div className="w-px h-3 bg-gray-200" /><Pill ok={true} label={`+${item.extra_provide} extra billed`} /></>}
      </div>
    </div>
  );
};

// ─── REFILLABLE card ──────────────────────────────────────────────────────────
// Collect usable dispensers back to warehouse stock, then place fresh standard + extra
const RefillableCard = ({ item, onUpdate }: {
  item: any; onUpdate: (id: number, field: string, val: number) => void;
}) => {
  const totalProvide = item.base_provide + item.extra_provide;
  const shortage     = Math.max(0, item.target_collect - item.collected);

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
            <Droplets size={14} className="text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-none">{item.item_name}</p>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Dispenser · Collect & Refill</p>
          </div>
        </div>
        <span className="text-[10px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg">
          Std: {item.standard_provide}
        </span>
      </div>

      <InfoBanner
        color="bg-blue-50/60 border-blue-100 text-blue-700"
        text={`Collect usable (good condition) dispensers — they go back to warehouse stock. Then place fresh ones. Standard qty is pre-filled. Add extra only if requested.`}
      />

      {/* 3-col body */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {/* COLLECTED → stock */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Collected"
            value={item.collected}
            onChange={v => onUpdate(item.equipment_id, "collected", v)}
            max={item.target_collect + 5}
            colorClass="border-teal-200 text-teal-700"
          />
          <p className="text-[10px] text-gray-400 font-bold">Was in room: {item.target_collect}</p>
          {shortage > 0 && <Pill ok={false} label={`${shortage} missing`} />}
          {item.collected > 0 && (
            <p className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={10} /> → back to stock
            </p>
          )}
        </div>

        {/* BASE PROVIDE */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Base Provide"
            value={item.base_provide}
            onChange={v => onUpdate(item.equipment_id, "base_provide", v)}
            max={item.standard_provide}
            colorClass="border-indigo-200 text-indigo-700"
          />
          <p className="text-[10px] text-gray-400 font-bold">Standard: {item.standard_provide}</p>
        </div>

        {/* EXTRA */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Extra"
            value={item.extra_provide}
            onChange={v => onUpdate(item.equipment_id, "extra_provide", v)}
            max={10}
            colorClass="border-purple-200 text-purple-700"
            prefix="+"
          />
          <p className="text-[10px] text-gray-400 font-bold">Guest request</p>
          {item.extra_provide > 0 && <Pill ok={true} label={`+${item.extra_provide} billed`} />}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5 items-center text-[10px] font-bold text-gray-500">
        <span>Collected to stock: <span className="text-teal-700 font-black">{item.collected}</span></span>
        <div className="w-px h-3 bg-gray-200" />
        <span>Fresh in room: <span className="text-indigo-700 font-black">{totalProvide}</span>
          <span className="text-gray-400 font-bold"> (Base {item.base_provide} + Extra {item.extra_provide})</span>
        </span>
        {item.extra_provide > 0 && <><div className="w-px h-3 bg-gray-200" /><Pill ok={true} label={`+${item.extra_provide} extra billed`} /></>}
      </div>
    </div>
  );
};

// ─── CONSUMABLE card ──────────────────────────────────────────────────────────
// No collection — just place standard qty + optional extra
const ConsumableCard = ({ item, onUpdate }: {
  item: any; onUpdate: (id: number, field: string, val: number) => void;
}) => {
  const totalProvide = item.base_provide + item.extra_provide;
  const fullyStocked = totalProvide >= item.standard_provide;

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
            <Coffee size={14} className="text-white" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-none">{item.item_name}</p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Amenity · Place & Top-Up</p>
          </div>
        </div>
        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg">
          Std: {item.standard_provide}
        </span>
      </div>

      <InfoBanner
        color="bg-emerald-50/60 border-emerald-100 text-emerald-700"
        text={`Place the standard qty — already pre-filled. Add extra only if the guest requests more. No collection needed for amenities.`}
      />

      {/* 3-col body */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {/* COLLECTED — unused items back to stock */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Collected"
            value={item.collected}
            onChange={v => onUpdate(item.equipment_id, "collected", v)}
            max={item.target_collect + 5}
            colorClass="border-emerald-300 text-emerald-700"
          />
          <p className="text-[10px] text-gray-400 font-bold">Unused in room</p>
          {item.collected > 0 && (
            <p className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={10} /> → back to stock
            </p>
          )}
        </div>
        
        {/* BASE */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Base Qty to Place"
            value={item.base_provide}
            onChange={v => onUpdate(item.equipment_id, "base_provide", v)}
            max={item.standard_provide + 5}
            colorClass="border-emerald-200 text-emerald-700"
          />
          <p className="text-[10px] text-gray-400 font-bold">Standard: {item.standard_provide} — pre-filled</p>
        </div>

        {/* EXTRA */}
        <div className="flex flex-col gap-2">
          <Dropdown
            label="Extra"
            value={item.extra_provide}
            onChange={v => onUpdate(item.equipment_id, "extra_provide", v)}
            max={10}
            colorClass="border-purple-200 text-purple-700"
            prefix="+"
          />
          <p className="text-[10px] text-gray-400 font-bold">Guest request</p>
          {item.extra_provide > 0 && <Pill ok={true} label={`+${item.extra_provide} billed`} />}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5 items-center text-[10px] font-bold text-gray-500">
        {item.collected > 0 && (
          <>
            <span>Collected: <span className="text-teal-700 font-black">{item.collected}</span></span>
            <div className="w-px h-3 bg-gray-200" />
          </>
        )}
        <span>Total placed: <span className="text-emerald-700 font-black">{totalProvide}</span>
          <span className="text-gray-400 font-bold"> (Base {item.base_provide} + Extra {item.extra_provide})</span>
        </span>
        <div className="w-px h-3 bg-gray-200" />
        {fullyStocked
          ? <Pill ok={true} label="Fully stocked" />
          : <Pill ok={false} label={`${item.standard_provide - totalProvide} below standard`} />
        }
        {item.extra_provide > 0 && <><div className="w-px h-3 bg-gray-200" /><Pill ok={true} label={`+${item.extra_provide} extra billed`} /></>}
      </div>
    </div>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle, count, color }: {
  icon: React.ReactNode; title: string; subtitle: string; count: number; color: string;
}) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${color}`}>
    <div className="shrink-0">{icon}</div>
    <div className="flex-1">
      <p className="font-black text-sm leading-none">{title}</p>
      <p className="text-[10px] font-bold opacity-70 mt-0.5 uppercase tracking-widest">{subtitle}</p>
    </div>
    <span className="text-xs font-black opacity-80 bg-white/60 px-2 py-0.5 rounded-md">{count} items</span>
  </div>
);

// ─── Main export ──────────────────────────────────────────────────────────────
export default function EquipmentTracker({ bookingId, unitId, onDataChange }: EquipmentTrackerProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems]     = useState<any[]>([]);

  useEffect(() => {
    const fetchInventory = async () => {
      const [configRes, balanceRes] = await Promise.all([
        supabase.from("unit_equipment_config")
          .select("*, equipment_master(item_name, item_type)")
          .eq("unit_id", unitId),
        supabase.from("unit_inventory_balances")
          .select("*")
          .eq("unit_id", unitId),
      ]);

      if (configRes.data) {
        const merged = configRes.data.map(cfg => {
          const bal       = balanceRes.data?.find(b => b.equipment_id === cfg.equipment_id);
          const prevBal   = bal ? bal.current_in_unit_qty : 0;
          const type      = cfg.equipment_master?.item_type || "returnable";
          const std       = cfg.standard_qty;
          const target    = type === "returnable"
            ? Math.max(std, prevBal)
            : prevBal === 0 ? std : prevBal;

          return {
            equipment_id:    cfg.equipment_id,
            item_name:       cfg.equipment_master?.item_name || "Unknown",
            item_type:       type,
            standard_provide: std,
            base_provide:    std,   // ← default = standard, agent can adjust
            extra_provide:   0,
            target_collect:  target,
            collected:       type === "consumable" ? 0 : target,
          };
        });

        const saved = localStorage.getItem(`btm_eq_${bookingId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setItems(merged.map(m => {
              const s = parsed.find((p: any) => p.equipment_id === m.equipment_id);
              return s
                ? { ...m, base_provide: s.base_provide ?? m.base_provide, extra_provide: s.extra_provide, collected: s.collected }
                : m;
            }));
          } catch { setItems(merged); }
        } else {
          setItems(merged);
        }
      }
      setLoading(false);
    };

    if (unitId) fetchInventory();
  }, [unitId, bookingId]);

  useEffect(() => {
    if (items.length > 0) {
      onDataChange(items);
      localStorage.setItem(`btm_eq_${bookingId}`, JSON.stringify(items));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, bookingId]);

  const updateItem = (id: number, field: string, value: number) =>
    setItems(prev => prev.map(i => i.equipment_id === id ? { ...i, [field]: value } : i));

  if (loading) return (
    <div className="p-10 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (items.length === 0) return (
    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
      <p className="text-gray-500 font-bold text-sm">No equipment configuration found for this unit.</p>
    </div>
  );

  const returnables = items.filter(i => i.item_type === "returnable");
  const refillables = items.filter(i => i.item_type === "refillable");
  const consumables = items.filter(i => i.item_type === "consumable");
  const totalExtra  = items.reduce((sum, i) => sum + (i.extra_provide || 0), 0);

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-lg shrink-0">
          <PackagePlus size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 leading-tight">Equipment Tracking</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {items.length} items · {totalExtra > 0 ? `${totalExtra} extra to bill` : "No extras yet"}
          </p>
        </div>
      </div>

      {returnables.length > 0 && (
        <div className="space-y-3">
          <SectionHeader icon={<RefreshCcw size={18} className="text-orange-600" />} title="Linens & Towels" subtitle="Collect dirty → Give fresh" count={returnables.length} color="bg-orange-50 border-orange-100 text-orange-900" />
          {returnables.map(item => <ReturnableCard key={item.equipment_id} item={item} onUpdate={updateItem} />)}
        </div>
      )}

      {refillables.length > 0 && (
        <div className="space-y-3">
          <SectionHeader icon={<Droplets size={18} className="text-blue-600" />} title="Dispensers & Bottles" subtitle="Collect usable → Place fresh" count={refillables.length} color="bg-blue-50 border-blue-100 text-blue-900" />
          {refillables.map(item => <RefillableCard key={item.equipment_id} item={item} onUpdate={updateItem} />)}
        </div>
      )}

      {consumables.length > 0 && (
        <div className="space-y-3">
          <SectionHeader icon={<Coffee size={18} className="text-emerald-600" />} title="Amenities & Top-Ups" subtitle="Place standard qty + extra if requested" count={consumables.length} color="bg-emerald-50 border-emerald-100 text-emerald-900" />
          {consumables.map(item => <ConsumableCard key={item.equipment_id} item={item} onUpdate={updateItem} />)}
        </div>
      )}

    </div>
  );
}