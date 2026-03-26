"use client";
import { Warehouse, ArrowDownToLine, Loader2, CircleCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ReturnItem, TYPE_COLORS } from "./types";

interface UnloadSummaryProps {
  returnSummary: ReturnItem[];
  todayLoad: any;
  onConfirmUnload: () => void;
  unloadConfirming: boolean;
}

const TYPE_ORDER = ["returnable", "refillable", "consumable"] as const;

export default function UnloadSummary({
  returnSummary, todayLoad, onConfirmUnload, unloadConfirming,
}: UnloadSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
        <Warehouse size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-black text-indigo-700">End-of-Day Returns</p>
          <p className="text-[11px] text-indigo-500 font-bold mt-0.5">
            Items collected from completed jobs today
          </p>
        </div>
      </div>

      {returnSummary.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3 shadow-sm">
          <Warehouse size={40} className="text-gray-200"/>
          <div className="text-center">
            <p className="text-sm font-black text-gray-400">No completed jobs yet</p>
            <p className="text-xs font-bold text-gray-300 mt-0.5">
              Summary updates as cleaners submit work
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Return items grouped by type */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ArrowDownToLine size={13}/> Return Summary
              </p>
              <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {returnSummary.reduce((s, i) => s + i.collected, 0)} items
              </span>
            </div>

            {TYPE_ORDER.map(type => {
              const items = returnSummary.filter(r => r.item_type === type);
              if (!items.length) return null;
              const tc = TYPE_COLORS[type];
              const typeLabels = {
                returnable: "Linens — Laundry Bags",
                refillable: "Dispensers — To Stock",
                consumable: "Amenities — To Stock",
              };
              return (
                <div key={type}>
                  <div className={`px-4 py-2.5 ${tc.section} border-b flex items-center gap-2`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${tc.dot}`}/>
                    <p className="text-[10px] font-black uppercase tracking-widest">{typeLabels[type]}</p>
                  </div>
                  {items.map(item => (
                    <div key={item.item_name} className="px-4 py-3.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-black text-gray-900">{item.item_name}</p>
                        <span className="text-base font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                          {item.collected}
                        </span>
                      </div>
                      {/* QC breakdown for returnables */}
                      {type === "returnable" && (item.qc_good > 0 || item.qc_bad > 0) && (
                        <div className="flex gap-3 mt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                            <span className="text-[11px] font-bold text-emerald-600">
                              QC Good: {item.qc_good}
                            </span>
                          </div>
                          {item.qc_bad > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400"/>
                              <span className="text-[11px] font-bold text-red-500">
                                Discard: {item.qc_bad}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {type !== "returnable" && (
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">→ Return to warehouse stock</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Grand total */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Returns</p>
              <p className="text-base font-black text-gray-900">
                {returnSummary.reduce((s, i) => s + i.collected, 0)}
              </p>
            </div>
          </div>

          {/* Unload confirm */}
          {todayLoad && !todayLoad.unload_confirmed_at && (
            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-xs font-bold text-gray-500">
                After returning all items to the warehouse, confirm unload below.
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

          {todayLoad?.unload_confirmed_at && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5 shadow-sm">
              <CircleCheck size={20} className="text-emerald-500 shrink-0"/>
              <div>
                <p className="text-sm font-black text-emerald-700">Unload Confirmed</p>
                <p className="text-xs font-bold text-emerald-500">
                  {format(parseISO(todayLoad.unload_confirmed_at), "h:mm a")} — Shift Complete
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}