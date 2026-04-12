"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Loader2, RefreshCcw, Droplets, Coffee,
  PackagePlus, AlertTriangle, ChevronDown, CheckSquare
} from "lucide-react";

interface AdminEditEquipmentTrackerProps {
  bookingId: string;
  unitId: number;
  onDataChange: (data: any[]) => void;
}

// ─── Reusable Dropdown ────────────────────────────────────────────────────────
const Dropdown = ({
  label, value, onChange, max, colorClass, prefix = "",
}: {
  label: string; value: number; onChange: (n: number) => void;
  max: number; colorClass: string; prefix?: string;
}) => (
  <div className="flex flex-col gap-1.5 min-w-[85px]">
    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className={`appearance-none pl-3 pr-7 py-2.5 rounded-xl border font-black text-sm outline-none cursor-pointer w-full transition-all ${colorClass}`}
      >
        {Array.from({ length: max + 1 }, (_, i) => i).map(n => (
          <option key={n} value={n}>{prefix}{n}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 pointer-events-none opacity-50" />
    </div>
  </div>
);

// ─── Section Header ────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, count, color }: any) => (
  <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${color}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
      <h3 className="font-black text-sm uppercase tracking-widest">{title}</h3>
    </div>
    <span className="font-black bg-white px-3 py-1 rounded-lg shadow-sm text-xs">{count} Items</span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────
export default function AdminEditEquipmentTracker({
  bookingId,
  unitId,
  onDataChange,
}: AdminEditEquipmentTrackerProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const fetchInventoryData = useCallback(async () => {
    if (!bookingId || !unitId) {
      setError("bookingId বা unitId নেই।");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /**
       * ✅ VERIFIED SUPABASE SCHEMA:
       *
       * equipment_master        → id, item_name, item_type, base_price, current_stock
       * unit_equipment_config   → unit_id, equipment_id, standard_qty, extra_unit_price
       * unit_inventory_balances → unit_id, equipment_id, current_in_unit_qty
       * booking_inventory_logs  → booking_id, unit_id, equipment_id,
       *                           base_provide_qty, extra_provided_qty, final_provided_qty,
       *                           collected_qty, shortage_qty, qc_status
       *
       * ❌ WRONG (পুরনো কোডের ভুল):
       *   - "inventory_items" → নেই, আসল নাম "equipment_master"
       *   - "inventory_item_id" → নেই, আসল নাম "equipment_id"
       *   - unit_inventory_balances.standard_qty → নেই, এটা unit_equipment_config এ আছে
       *   - equipment_master.name → নেই, আসল নাম "item_name"
       */

      const [logsRes, configRes, masterRes] = await Promise.all([
        // 1. এই বুকিং এর পূর্ববর্তী inventory লগ
        supabase
          .from("booking_inventory_logs")
          .select("equipment_id, base_provide_qty, extra_provided_qty, collected_qty")
          .eq("booking_id", bookingId),

        // 2. এই unit এর equipment config (standard_qty এখানে)
        supabase
          .from("unit_equipment_config")
          .select("equipment_id, standard_qty, extra_unit_price")
          .eq("unit_id", unitId),

        // 3. Equipment master list (item_name, item_type)
        supabase
          .from("equipment_master")
          .select("id, item_name, item_type")
          .order("item_type"),
      ]);

      if (logsRes.error) throw new Error(`booking_inventory_logs: ${logsRes.error.message}`);
      if (configRes.error) throw new Error(`unit_equipment_config: ${configRes.error.message}`);
      if (masterRes.error) throw new Error(`equipment_master: ${masterRes.error.message}`);

      const logs = logsRes.data ?? [];
      const configs = configRes.data ?? [];
      const masterItems = masterRes.data ?? [];

      // O(1) lookup maps
      const masterById = new Map(masterItems.map(m => [m.id, m]));
      const logByEquipId = new Map(logs.map(l => [l.equipment_id, l]));

      // unit_equipment_config এর প্রতিটা row = একটা item
      const merged = configs
        .map(cfg => {
          const master = masterById.get(cfg.equipment_id);
          if (!master) return null; // master থেকে delete → skip

          const log = logByEquipId.get(cfg.equipment_id);

          return {
            equipment_id: master.id,
            name: master.item_name,          // ✅ item_name
            item_type: master.item_type,      // 'returnable' | 'refillable' | 'consumable'
            standard_qty: cfg.standard_qty ?? 0,
            extra_unit_price: cfg.extra_unit_price ?? 0,
            // log থাকলে লগের ডেটা, না থাকলে standard default
            base_provide: log?.base_provide_qty ?? cfg.standard_qty ?? 0,
            extra_provide: log?.extra_provided_qty ?? 0,
            collected: log?.collected_qty ?? 0,
          };
        })
        .filter(Boolean) as any[];

      setItems(merged);
    } catch (err: any) {
      console.error("AdminEditEquipmentTracker fetch error:", err);
      setError(err?.message ?? "Inventory loading problem");
    } finally {
      setLoading(false);
    }
  }, [bookingId, unitId]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  useEffect(() => {
    onDataChange(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const updateItem = (id: number, field: string, value: number) => {
    setItems(prev =>
      prev.map(item => item.equipment_id === id ? { ...item, [field]: value } : item)
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
        <Loader2 className="animate-spin mb-3" size={32} />
        <p className="font-black text-sm uppercase tracking-widest">Inventory loading...</p>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-3">
        <AlertTriangle size={32} />
        <p className="font-black text-sm text-center max-w-sm">{error}</p>
        <button
          onClick={fetchInventoryData}
          className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
        <PackagePlus size={36} className="opacity-30" />
        <p className="font-black text-sm uppercase tracking-widest text-center">
          এই unit এর জন্য কোনো equipment configure করা নেই।
        </p>
        <p className="text-xs text-gray-400">unit_equipment_config → unit_id: {unitId}</p>
      </div>
    );
  }

  const returnables = items.filter(i => i.item_type === "returnable");
  const refillables = items.filter(i => i.item_type === "refillable");
  const consumables = items.filter(i => i.item_type === "consumable");
  const totalExtra  = items.reduce((sum, i) => sum + (i.extra_provide ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* ─── SUMMARY BANNER ─── */}
      <div className="p-4 rounded-2xl flex items-center justify-between border bg-gray-50 border-gray-200 shadow-sm">
        <div>
          <h3 className="font-black flex items-center gap-2 text-gray-800">
            <PackagePlus size={18} /> Inventory Logs Edit
          </h3>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            {items.length} items logged · {totalExtra > 0 ? `${totalExtra} extra billed` : "No extras"}
          </p>
        </div>
        <button
          onClick={fetchInventoryData}
          title="Reload"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      {/* ─── RETURNABLES ─── */}
      {returnables.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            icon={<RefreshCcw size={18} className="text-orange-600" />}
            title="Linens & Towels"
            count={returnables.length}
            color="bg-orange-50 border-orange-100 text-orange-900"
          />
          <div className="grid grid-cols-1 gap-3">
            {returnables.map(item => (
              <InventoryEditCard key={item.equipment_id} item={item} onUpdate={updateItem} showCollect />
            ))}
          </div>
        </div>
      )}

      {/* ─── REFILLABLES ─── */}
      {refillables.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            icon={<Droplets size={18} className="text-blue-600" />}
            title="Dispensers & Bottles"
            count={refillables.length}
            color="bg-blue-50 border-blue-100 text-blue-900"
          />
          <div className="grid grid-cols-1 gap-3">
            {refillables.map(item => (
              <InventoryEditCard key={item.equipment_id} item={item} onUpdate={updateItem} showCollect />
            ))}
          </div>
        </div>
      )}

      {/* ─── CONSUMABLES ─── */}
      {consumables.length > 0 && (
        <div className="space-y-3">
          <SectionHeader
            icon={<Coffee size={18} className="text-emerald-600" />}
            title="Amenities & Top-Ups"
            count={consumables.length}
            color="bg-emerald-50 border-emerald-100 text-emerald-900"
          />
          <div className="grid grid-cols-1 gap-3">
            {consumables.map(item => (
              <InventoryEditCard key={item.equipment_id} item={item} onUpdate={updateItem} showCollect={false} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Individual Item Card ──────────────────────────────────────────────────
function InventoryEditCard({
  item,
  onUpdate,
  showCollect,
}: {
  item: any;
  onUpdate: (id: number, field: string, value: number) => void;
  showCollect: boolean;
}) {
  const finalProvide = (item.base_provide ?? 0) + (item.extra_provide ?? 0);
  const shortfall = showCollect
    ? Math.max(0, (item.standard_qty ?? 0) - (item.collected ?? 0))
    : 0;

  return (
    <div className={`p-4 bg-white border rounded-2xl shadow-sm flex flex-col xl:flex-row gap-5 xl:items-end justify-between transition-colors
      ${shortfall > 0 ? "border-red-200 hover:border-red-300" : "border-gray-200 hover:border-gray-300"}`}>

      <div className="flex-1">
        <h4 className="font-black text-gray-900 text-lg">{item.name}</h4>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{item.item_type}</p>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md text-[10px] font-black text-gray-500 uppercase">
            Standard: <span className="text-gray-800 text-xs ml-1">{item.standard_qty}</span>
          </span>
          {item.extra_unit_price > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-100 rounded-md text-[10px] font-black text-purple-600 uppercase">
              Extra: AED {item.extra_unit_price}
            </span>
          )}
          {shortfall > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-md text-[10px] font-black text-red-600 uppercase">
              <AlertTriangle size={10} /> {shortfall} shortage
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {showCollect && (
          <Dropdown
            label="Collected"
            value={item.collected ?? 0}
            onChange={v => onUpdate(item.equipment_id, "collected", v)}
            max={50}
            colorClass="bg-red-50/50 text-red-900 border-red-200 hover:border-red-400"
          />
        )}

        <Dropdown
          label="Base Provided"
          value={item.base_provide ?? 0}
          onChange={v => onUpdate(item.equipment_id, "base_provide", v)}
          max={50}
          colorClass="bg-blue-50/50 text-blue-900 border-blue-200 hover:border-blue-400"
        />

        <Dropdown
          label="Extra"
          value={item.extra_provide ?? 0}
          onChange={v => onUpdate(item.equipment_id, "extra_provide", v)}
          max={30}
          prefix="+"
          colorClass="bg-purple-50/50 text-purple-900 border-purple-200 hover:border-purple-400"
        />

        <div className="flex flex-col gap-1.5 min-w-[70px]">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Final</span>
          <div className="h-[42px] flex items-center justify-center bg-gray-900 text-white rounded-xl text-sm font-black shadow-md">
            <CheckSquare size={14} className="mr-1.5 opacity-50" /> {finalProvide}
          </div>
        </div>
      </div>
    </div>
  );
}