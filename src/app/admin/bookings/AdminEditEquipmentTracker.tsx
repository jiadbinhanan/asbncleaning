"use client";
/**
 * AdminEditEquipmentTracker
 *
 * READ FROM:
 *   • unit_equipment_config    → standard_qty, extra_unit_price
 *   • equipment_master         → item_name, item_type
 *   • unit_inventory_balances  → current_in_unit_qty  (= target_collect_qty, read-only)
 *   • booking_inventory_logs   → existing log for this booking (if any)
 *
 * WRITES (via parent handleBulkSave only — safe UPSERT, no blind DELETE):
 *   • booking_inventory_logs   → upserted per row using log_id
 *
 * NOT TOUCHED:
 *   • inventory_transaction_logs  (ledger, unaffected by admin edit)
 *   • unit_inventory_balances     (never written here)
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Loader2, RefreshCcw, Droplets, Coffee,
  PackagePlus, AlertTriangle, ChevronDown, CheckSquare, Info,
} from "lucide-react";

export interface InventoryItem {
  equipment_id:       number;
  log_id:             string | null;  // booking_inventory_logs.id (UUID) or null if new
  name:               string;
  item_type:          string;         // 'returnable' | 'refillable' | 'consumable'
  standard_qty:       number;         // unit_equipment_config — display only
  extra_unit_price:   number;
  target_collect_qty: number;         // unit_inventory_balances.current_in_unit_qty — read-only
  base_provide_qty:   number;         // editable
  extra_provided_qty: number;         // editable
  collected_qty:      number;         // editable, capped at target_collect_qty
  shortage_qty:       number;         // auto: max(0, target - collected)
}

interface Props {
  bookingId: string;
  unitId: number;
  onDataChange: (data: InventoryItem[]) => void;
}

function Dropdown({ label, value, onChange, max, colorClass, prefix = "", disabled = false }: {
  label: string; value: number; onChange: (n: number) => void;
  max: number; colorClass: string; prefix?: string; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[72px]">
      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-center leading-tight">{label}</span>
      <div className="relative inline-flex items-center">
        <select value={value} onChange={e => onChange(parseInt(e.target.value))} disabled={disabled}
          className={`appearance-none pl-2.5 pr-6 py-2 rounded-lg border font-black text-sm outline-none w-full transition-all
            ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500" : `cursor-pointer ${colorClass}`}`}>
          {Array.from({ length: max + 1 }, (_, i) => i).map(n => (
            <option key={n} value={n}>{prefix}{n}</option>
          ))}
        </select>
        {!disabled && <ChevronDown size={12} className="absolute right-1.5 pointer-events-none opacity-50" />}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, count, color }: { icon: React.ReactNode; title: string; count: number; color: string }) {
  return (
    <div className={`px-4 py-3 rounded-xl border flex items-center justify-between shadow-sm ${color}`}>
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-white rounded-lg shadow-sm">{icon}</div>
        <h3 className="font-black text-xs uppercase tracking-widest">{title}</h3>
      </div>
      <span className="font-black bg-white px-2.5 py-0.5 rounded-md shadow-sm text-[11px]">{count} items</span>
    </div>
  );
}

function InventoryEditCard({ item, onUpdate }: { item: InventoryItem; onUpdate: (id: number, field: keyof InventoryItem, value: number) => void }) {
  const isConsumable = item.item_type === "consumable";
  const finalProvide = item.base_provide_qty + item.extra_provided_qty;
  const hasShortage  = item.shortage_qty > 0;

  return (
    <div className={`p-3.5 bg-white border rounded-2xl shadow-sm flex flex-col gap-3 transition-colors
      ${hasShortage ? "border-red-200" : "border-gray-200 hover:border-gray-300"}`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-black text-gray-900 text-sm leading-tight">{item.name}</h4>
          {item.log_id
            ? <span className="shrink-0 text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-md uppercase">Logged</span>
            : <span className="shrink-0 text-[8px] font-black bg-gray-100 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-md uppercase">New</span>
          }
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-[9px] font-black text-gray-500 uppercase">
            Std: {item.standard_qty}
          </span>
          {!isConsumable && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded text-[9px] font-black text-amber-700 uppercase">
              <Info size={8} /> Target: {item.target_collect_qty}
            </span>
          )}
          {item.extra_unit_price > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-100 rounded text-[9px] font-black text-purple-600 uppercase">
              +AED {item.extra_unit_price}/extra
            </span>
          )}
          {hasShortage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[9px] font-black text-red-600 uppercase">
              <AlertTriangle size={8} /> Short: {item.shortage_qty}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <Dropdown label="Base Provided" value={item.base_provide_qty}
          onChange={v => onUpdate(item.equipment_id, "base_provide_qty", v)}
          max={50} colorClass="bg-blue-50/60 text-blue-900 border-blue-200 hover:border-blue-400" />
        <Dropdown label="Extra" value={item.extra_provided_qty}
          onChange={v => onUpdate(item.equipment_id, "extra_provided_qty", v)}
          max={30} prefix="+" colorClass="bg-purple-50/60 text-purple-900 border-purple-200 hover:border-purple-400" />

        {!isConsumable && (
          <Dropdown
            label={`Collected (≤${item.target_collect_qty})`}
            value={item.collected_qty}
            onChange={v => onUpdate(item.equipment_id, "collected_qty", v)}
            max={item.target_collect_qty}
            colorClass="bg-red-50/60 text-red-900 border-red-200 hover:border-red-400"
          />
        )}

        <div className="flex flex-col gap-1 min-w-[52px]">
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Final</span>
          <div className="h-[34px] flex items-center justify-center bg-gray-900 text-white rounded-lg text-sm font-black shadow px-2.5 gap-1">
            <CheckSquare size={11} className="opacity-50" />{finalProvide}
          </div>
        </div>

        {!isConsumable && (
          <div className="flex flex-col gap-1 min-w-[52px]">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Shortage</span>
            <div className={`h-[34px] flex items-center justify-center rounded-lg text-sm font-black px-2.5
              ${hasShortage ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              {item.shortage_qty}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminEditEquipmentTracker({ bookingId, unitId, onDataChange }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<InventoryItem[]>([]);

  const fetchInventoryData = useCallback(async () => {
    if (!bookingId || !unitId) { setError("Missing bookingId or unitId."); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [configRes, masterRes, balancesRes, logsRes] = await Promise.all([
        supabase.from("unit_equipment_config").select("equipment_id, standard_qty, extra_unit_price").eq("unit_id", unitId),
        supabase.from("equipment_master").select("id, item_name, item_type").order("item_type"),
        supabase.from("unit_inventory_balances").select("equipment_id, current_in_unit_qty").eq("unit_id", unitId),
        supabase.from("booking_inventory_logs").select("id, equipment_id, base_provide_qty, extra_provided_qty, target_collect_qty, collected_qty, shortage_qty").eq("booking_id", bookingId),
      ]);
      if (configRes.error)   throw new Error(`unit_equipment_config: ${configRes.error.message}`);
      if (masterRes.error)   throw new Error(`equipment_master: ${masterRes.error.message}`);
      if (balancesRes.error) throw new Error(`unit_inventory_balances: ${balancesRes.error.message}`);
      if (logsRes.error)     throw new Error(`booking_inventory_logs: ${logsRes.error.message}`);

      const masterById  = new Map((masterRes.data ?? []).map(m => [m.id, m]));
      const balanceById = new Map((balancesRes.data ?? []).map(b => [b.equipment_id, b.current_in_unit_qty]));
      const logByEqId   = new Map((logsRes.data ?? []).map(l => [l.equipment_id, l]));

      const merged: InventoryItem[] = (configRes.data ?? []).map(cfg => {
        const master = masterById.get(cfg.equipment_id);
        if (!master) return null;
        const log          = logByEqId.get(cfg.equipment_id);
        const isConsumable = master.item_type === "consumable";
        // target_collect_qty: from saved log first, else current unit balance
        const targetCollect = isConsumable ? 0 : (log?.target_collect_qty ?? balanceById.get(cfg.equipment_id) ?? 0);
        const baseProv  = log?.base_provide_qty   ?? cfg.standard_qty ?? 0;
        const extraProv = log?.extra_provided_qty ?? 0;
        const collected = log?.collected_qty      ?? 0;
        const shortage  = isConsumable ? 0 : Math.max(0, targetCollect - collected);
        return {
          equipment_id: master.id, log_id: log?.id ?? null,
          name: master.item_name, item_type: master.item_type,
          standard_qty: cfg.standard_qty ?? 0, extra_unit_price: cfg.extra_unit_price ?? 0,
          target_collect_qty: targetCollect,
          base_provide_qty: baseProv, extra_provided_qty: extraProv,
          collected_qty: collected, shortage_qty: shortage,
        } as InventoryItem;
      }).filter(Boolean) as InventoryItem[];

      setItems(merged);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [bookingId, unitId]);

  useEffect(() => { fetchInventoryData(); }, [fetchInventoryData]);
  useEffect(() => { onDataChange(items); }, [items]); // eslint-disable-line

  const updateItem = (equipmentId: number, field: keyof InventoryItem, rawValue: number) => {
    setItems(prev => prev.map(item => {
      if (item.equipment_id !== equipmentId) return item;
      const next = { ...item, [field]: rawValue };
      if (field === "collected_qty") {
        const clamped = Math.min(rawValue, item.target_collect_qty);
        next.collected_qty = clamped;
        next.shortage_qty  = item.item_type === "consumable" ? 0 : Math.max(0, item.target_collect_qty - clamped);
      }
      return next;
    }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 text-indigo-500 gap-3">
      <Loader2 className="animate-spin" size={28} /><p className="font-black text-xs uppercase tracking-widest">Loading inventory...</p>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-3">
      <AlertTriangle size={28} /><p className="font-black text-xs text-center max-w-xs">{error}</p>
      <button onClick={fetchInventoryData} className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 font-black text-xs uppercase hover:bg-red-100 transition-colors">Retry</button>
    </div>
  );
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
      <PackagePlus size={32} className="opacity-25" />
      <p className="font-black text-xs uppercase tracking-widest text-center">No equipment configured for this unit.</p>
      <p className="text-[10px] text-gray-300">unit_equipment_config → unit_id: {unitId}</p>
    </div>
  );

  const returnables = items.filter(i => i.item_type === "returnable");
  const refillables = items.filter(i => i.item_type === "refillable");
  const consumables = items.filter(i => i.item_type === "consumable");
  const totalExtra  = items.reduce((s, i) => s + i.extra_provided_qty, 0);
  const totalShort  = items.reduce((s, i) => s + i.shortage_qty, 0);

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl flex items-center justify-between border bg-gray-50 border-gray-200 shadow-sm">
        <div>
          <h3 className="font-black flex items-center gap-2 text-gray-800 text-sm"><PackagePlus size={15} /> Inventory Edit</h3>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
            {items.length} items
            {totalExtra > 0 && <> · <span className="text-purple-600">{totalExtra} extra</span></>}
            {totalShort > 0 && <> · <span className="text-red-500">{totalShort} shortage</span></>}
          </p>
        </div>
        <button onClick={fetchInventoryData} title="Reload" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"><RefreshCcw size={14} /></button>
      </div>

      {returnables.length > 0 && (
        <div className="space-y-2.5">
          <SectionHeader icon={<RefreshCcw size={14} className="text-orange-600" />} title="Linens & Towels" count={returnables.length} color="bg-orange-50 border-orange-100 text-orange-900" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {returnables.map(item => <InventoryEditCard key={item.equipment_id} item={item} onUpdate={updateItem} />)}
          </div>
        </div>
      )}
      {refillables.length > 0 && (
        <div className="space-y-2.5">
          <SectionHeader icon={<Droplets size={14} className="text-blue-600" />} title="Dispensers & Bottles" count={refillables.length} color="bg-blue-50 border-blue-100 text-blue-900" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {refillables.map(item => <InventoryEditCard key={item.equipment_id} item={item} onUpdate={updateItem} />)}
          </div>
        </div>
      )}
      {consumables.length > 0 && (
        <div className="space-y-2.5">
          <SectionHeader icon={<Coffee size={14} className="text-emerald-600" />} title="Amenities & Top-Ups" count={consumables.length} color="bg-emerald-50 border-emerald-100 text-emerald-900" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {consumables.map(item => <InventoryEditCard key={item.equipment_id} item={item} onUpdate={updateItem} />)}
          </div>
        </div>
      )}
    </div>
  );
}