"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Box, RefreshCcw, PackagePlus, Loader2, Coffee, Droplets } from "lucide-react";

interface EquipmentTrackerProps {
  bookingId: string;
  unitId: number;
  onDataChange: (data: any[]) => void;
}

export default function EquipmentTracker({ bookingId, unitId, onDataChange }: EquipmentTrackerProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchInventory = async () => {
      const [configRes, balanceRes] = await Promise.all([
        supabase.from('unit_equipment_config').select('*, equipment_master(item_name, item_type)').eq('unit_id', unitId),
        supabase.from('unit_inventory_balances').select('*').eq('unit_id', unitId)
      ]);

      if (configRes.data) {
        const mergedData = configRes.data.map(cfg => {
          const bal = balanceRes.data?.find(b => b.equipment_id === cfg.equipment_id);
          const target = bal ? bal.current_in_unit_qty : 0;
          const type = cfg.equipment_master?.item_type || 'returnable';
          let standardQty = cfg.standard_qty;
          let targetCollect = target;

          // 🚨 FIXED LOGIC FOR TARGET COLLECT
          if (type === 'returnable') {
            targetCollect = Math.max(standardQty, target);
          } else if (type === 'refillable' || type === 'consumable') {
            // Consumable & Refillable both need to track intact items from previous balance
            targetCollect = target === 0 ? standardQty : target;
          }

          return {
            equipment_id: cfg.equipment_id,
            item_name: cfg.equipment_master?.item_name || "Unknown Item",
            item_type: type,
            standard_provide: standardQty, 
            target_setup: standardQty, 
            extra_provide: 0, 
            target_collect: targetCollect,
            collected: type === 'returnable' ? targetCollect : 0 // Refill/Consumable will manually select intact
          };
        });

        const savedState = localStorage.getItem(`asbn_eq_${bookingId}`);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          const restoredItems = mergedData.map(m => {
            const s = parsed.find((p: any) => p.equipment_id === m.equipment_id);
            if (s) return { ...m, extra_provide: s.extra_provide, collected: s.collected };
            return m;
          });
          setItems(restoredItems);
        } else {
          setItems(mergedData);
        }
      }
      setLoading(false);
    };

    if (unitId) fetchInventory();
  }, [unitId, bookingId]);

  useEffect(() => {
    if (items.length > 0) {
      onDataChange(items);
      localStorage.setItem(`asbn_eq_${bookingId}`, JSON.stringify(items));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, bookingId]);

  const updateItem = (id: number, field: string, value: number) => {
    setItems(prev => prev.map(i => i.equipment_id === id ? { ...i, [field]: value } : i));
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  if (items.length === 0) return <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-6 text-center"><p className="text-gray-500 font-bold text-sm">No equipment configuration found.</p></div>;

  const returnables = items.filter(i => i.item_type === 'returnable');
  const refillables = items.filter(i => i.item_type === 'refillable');
  const consumables = items.filter(i => i.item_type === 'consumable');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-4">
        <Box className="text-blue-600" size={24}/>
        <div>
          <h3 className="text-lg font-black text-gray-900 leading-tight">Equipment Tracking</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Linens, Dispensers & Amenities</p>
        </div>
      </div>

      {/* --- BLOCK 1: LINEN (RETURNABLE) --- */}
      {returnables.length > 0 && (
        <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-orange-800 flex items-center gap-2"><RefreshCcw size={16}/> Linens (Collect & Provide)</h4>
          <div className="space-y-3">
            {returnables.map(item => (
              <div key={item.equipment_id} className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 text-sm">{item.item_name}</p>
                  <span className="text-xs font-black text-orange-700 bg-orange-100 px-2 py-1 rounded">Target: {item.target_collect} (Std: {item.standard_provide})</span>
                </div>
                <div className="flex gap-2 border-t border-orange-50 pt-3">
                  <div className="flex-1 bg-gray-50 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Collected</span>
                    <select value={item.collected} onChange={e => updateItem(item.equipment_id, 'collected', parseInt(e.target.value))} className="p-1 border rounded text-orange-700 font-black outline-none cursor-pointer">
                      {Array.from({length: Math.max(item.target_collect, item.standard_provide) + 11}, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 bg-gray-50 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Provide (Std: {item.standard_provide})</span>
                    <select value={item.extra_provide} onChange={e => updateItem(item.equipment_id, 'extra_provide', parseInt(e.target.value))} className="p-1 border rounded text-indigo-700 font-black outline-none cursor-pointer">
                      {Array.from({length: 11}, (_, i) => i).map(n => <option key={n} value={n}>+{n} Extra</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- BLOCK 2: REFILLABLES (DISPENSERS/JARS) --- */}
      {refillables.length > 0 && (
        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-blue-800 flex items-center gap-2"><Droplets size={16}/> Dispensers (Check & Add Extra)</h4>
          <div className="space-y-3">
            {refillables.map(item => (
              <div key={item.equipment_id} className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 text-sm">{item.item_name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Target: {item.target_collect} (Std: {item.standard_provide})</p>
                </div>
                <div className="flex gap-2 border-t border-blue-50 pt-3">
                  <div className="flex-1 flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-600 uppercase">Found Intact:</span>
                    <select value={item.collected} onChange={e => updateItem(item.equipment_id, 'collected', parseInt(e.target.value))} className="p-1 border rounded text-blue-700 font-black outline-none cursor-pointer">
                      {Array.from({length: item.target_collect + 6}, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-600 uppercase">Place New:</span>
                    <select value={item.extra_provide} onChange={e => updateItem(item.equipment_id, 'extra_provide', parseInt(e.target.value))} className="p-1 border rounded text-indigo-700 font-black outline-none cursor-pointer">
                      {Array.from({length: 11}, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Amenities (Consumables) --- */}
      {consumables.length > 0 && (
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
           <h4 className="text-sm font-black text-emerald-800 flex items-center gap-2"><Coffee size={16}/> Amenities (Consumables)</h4>
          <div className="space-y-3">
             {consumables.map(item => (
               <div key={item.equipment_id} className="flex flex-col md:flex-row justify-between md:items-center bg-white p-4 rounded-xl border border-emerald-200 shadow-sm gap-3">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{item.item_name}</p>
                    {/* 🚨 SHOWING BOTH TARGET AND STANDARD TO AVOID CONFUSION */}
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Target: {item.target_collect} (Std: {item.standard_provide})</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Found Intact:</span>
                      <select value={item.collected} onChange={e => updateItem(item.equipment_id, 'collected', parseInt(e.target.value))} className="p-1.5 border border-gray-200 rounded-md font-black text-gray-700 bg-white outline-none cursor-pointer">
                        {Array.from({length: item.target_collect + 10}, (_, i) => (<option key={i} value={i}>{i}</option>))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Placed New:</span>
                      <select value={item.extra_provide} onChange={e => updateItem(item.equipment_id, 'extra_provide', parseInt(e.target.value))} className="p-1.5 border border-emerald-200 rounded-md font-black text-emerald-700 bg-white outline-none cursor-pointer">
                        {Array.from({length: item.standard_provide + 10}, (_, i) => (<option key={i} value={i}>{i}</option>))}
                      </select>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}
