"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Package, Plus, Minus, CheckCircle2,
  Loader2, CheckCheck, ArrowDownToLine, CircleCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { LoadItem, TYPE_COLORS } from "./types";

interface MorningLoadSheetProps {
  loadItems: LoadItem[];
  todayLoad: any;
  activeBookingCount: number;
  onUpdateExtra: (id: number, delta: number) => void;
  onConfirmLoad: () => void;
  onConfirmUnload: () => void;
  loadConfirming: boolean;
  unloadConfirming: boolean;
}

const TYPE_ORDER = ["returnable", "refillable", "consumable"] as const;

export default function MorningLoadSheet({
  loadItems, todayLoad, activeBookingCount,
  onUpdateExtra, onConfirmLoad, onConfirmUnload,
  loadConfirming, unloadConfirming,
}: MorningLoadSheetProps) {

  // ── Confirmed state ────────────────────────────────────────────────────────
  if (todayLoad) {
    const extraItems = (todayLoad.extra_taken as any[]) || [];
    const stdItems   = (todayLoad.standard_load as any[]) || [];

    return (
      <div className="space-y-4">
        {/* Confirmed banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCheck size={18} className="text-emerald-600"/>
          </div>
          <div>
            <p className="text-sm font-black text-emerald-700">Load Confirmed ✓</p>
            <p className="text-[11px] text-emerald-500 font-bold">
              Today at {format(parseISO(todayLoad.confirmed_at), "h:mm a")}
            </p>
          </div>
        </div>

        {/* Standard load list */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Package size={13}/> Standard Load
            </p>
            <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {stdItems.length} items
            </span>
          </div>
          {TYPE_ORDER.map(type => {
            const items = stdItems.filter((i: any) => i.item_type === type);
            if (!items.length) return null;
            const tc = TYPE_COLORS[type];
            return (
              <div key={type}>
                <div className={`px-4 py-2 ${tc.section} border-b flex items-center gap-2`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${tc.dot}`}/>
                  <p className="text-[10px] font-black uppercase tracking-widest">{tc.label}</p>
                </div>
                {items.map((item: any) => (
                  <div key={item.equipment_id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-bold text-gray-800">{item.item_name}</p>
                    <span className="text-base font-black text-gray-900">{item.suggested_qty}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {/* Total */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Standard</p>
            <p className="text-sm font-black text-gray-900">
              {stdItems.reduce((s: number, i: any) => s + (i.suggested_qty || 0), 0)}
            </p>
          </div>
        </div>

        {/* Extra taken */}
        {extraItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-100">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Extra Taken</p>
            </div>
            {extraItems.map((e: any) => (
              <div key={e.equipment_id} className="flex justify-between items-center px-4 py-3 border-b border-amber-100/50 last:border-0">
                <p className="text-sm font-bold text-amber-800">{e.item_name}</p>
                <span className="text-sm font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                  +{e.extra_qty}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Unload section */}
        {todayLoad.unload_confirmed_at ? (
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
            <CircleCheck size={20} className="text-emerald-500 shrink-0"/>
            <div>
              <p className="text-sm font-black text-emerald-600">Unload Confirmed</p>
              <p className="text-xs font-bold text-gray-400">
                {format(parseISO(todayLoad.unload_confirmed_at), "h:mm a")}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-bold text-gray-400">
              End of day — confirm after returning all items to warehouse.
            </p>
            <button
              onClick={onConfirmUnload}
              disabled={unloadConfirming}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {unloadConfirming ? <Loader2 size={16} className="animate-spin"/> : <ArrowDownToLine size={16}/>}
              {unloadConfirming ? "Confirming..." : "Confirm Unload at Warehouse"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Unconfirmed state ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <ClipboardList size={18} className="text-blue-500 shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-black text-blue-700">Suggested Load for Today</p>
          <p className="text-[11px] text-blue-500 font-bold mt-0.5">
            {activeBookingCount} active booking{activeBookingCount !== 1 ? "s" : ""} · Adjust extras if needed
          </p>
        </div>
      </div>

      {loadItems.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3 shadow-sm">
          <Package size={40} className="text-gray-200"/>
          <p className="text-sm font-black text-gray-400">No active bookings with equipment config</p>
        </div>
      ) : (
        <>
          {/* Items by type */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {TYPE_ORDER.map(type => {
              const items = loadItems.filter(i => i.item_type === type);
              if (!items.length) return null;
              const tc = TYPE_COLORS[type];
              return (
                <div key={type}>
                  <div className={`px-4 py-2.5 ${tc.section} border-b flex items-center gap-2`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${tc.dot}`}/>
                    <p className="text-[10px] font-black uppercase tracking-widest">{tc.label}</p>
                  </div>
                  {items.map(item => (
                    <div key={item.equipment_id}
                      className="flex items-center px-4 py-3.5 border-b border-gray-50 last:border-0 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{item.item_name}</p>
                        <p className="text-[11px] font-bold text-gray-400">Standard: {item.suggested_qty}</p>
                      </div>
                      {/* Extra +/- */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-wide mr-1">Extra</span>
                        <button
                          onClick={() => onUpdateExtra(item.equipment_id, -1)}
                          className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90 transition-transform hover:bg-gray-200"
                        >
                          <Minus size={12} className="text-gray-500"/>
                        </button>
                        <span className="w-8 text-center text-sm font-black text-gray-900">
                          {item.extra_qty > 0 ? `+${item.extra_qty}` : "0"}
                        </span>
                        <button
                          onClick={() => onUpdateExtra(item.equipment_id, 1)}
                          className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center active:scale-90 transition-transform hover:bg-blue-200"
                        >
                          <Plus size={12} className="text-blue-600"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {/* Total row */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total to Load</p>
              <p className="text-base font-black text-gray-900">
                {loadItems.reduce((s, i) => s + i.suggested_qty + i.extra_qty, 0)}
              </p>
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={onConfirmLoad}
            disabled={loadConfirming}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-2xl flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {loadConfirming ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
            {loadConfirming ? "Confirming..." : "Confirm Load & Start Day"}
          </button>
        </>
      )}
    </div>
  );
}