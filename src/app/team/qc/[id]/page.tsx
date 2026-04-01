'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight, ClipboardCheck, AlertTriangle, Flame } from "lucide-react";

export default function TeamQCPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [bookingInfo, setBookingInfo] = useState<any>(null);

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const [bookingRes, logsRes] = await Promise.all([
        supabase.from('bookings').select('id, units(id, unit_number)').eq('id', bookingId).single(),
        supabase.from('booking_inventory_logs')
          .select('id, equipment_id, collected_qty, qc_status, equipment_master(item_name, current_stock)')
          .eq('booking_id', bookingId)
          .eq('qc_status', 'pending')
      ]);

      if (bookingRes.data) setBookingInfo(bookingRes.data);

      if (logsRes.data?.length) {
        // Only show items that were actually collected
        setItems(logsRes.data.filter(l => l.collected_qty > 0).map(l => ({
          ...l, good: 0, bad: 0, damage: 0, error: ""
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [bookingId, supabase]);

  // 2. Input Handler (Smart Auto-calculation for the 3rd input)
  const handleInput = (id: string, field: 'good' | 'bad' | 'damage', value: string) => {
    const num = Math.max(0, parseInt(value) || 0);

    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: num };
      const fields: ('good' | 'bad' | 'damage')[] = ['good', 'bad', 'damage'];
      const others = fields.filter(f => f !== field);

      // Auto fill the remaining empty field if the other two are filled
      const autoField = others.find(f => updated[f] === 0 && updated[field] > 0) ?? null;
      if (autoField) {
        const autoVal = item.collected_qty - updated[field] - updated[others.find(f => f !== autoField)!];
        if (autoVal >= 0) updated[autoField] = autoVal;
      }

      // Error validation
      const total = updated.good + updated.bad + updated.damage;
      updated.error = total > item.collected_qty 
        ? `Total (${total}) cannot exceed collected quantity (${item.collected_qty})!` 
        : "";

      return updated;
    }));
  };

  const handleSkip = () => {
    router.push("/team/dashboard");
  };

  // 3. Submit Logic (Bulk Operations with TypeScript fix)
  const handleSubmit = async () => {
    const hasErrors = items.some(i => i.error || (i.good + i.bad + i.damage !== i.collected_qty));
    if (hasErrors) return alert("Please ensure that the sum of Good + Dirty + Damaged exactly matches the total Collected quantity.");

    setSubmitting(true);
    try {
      const logsToUpdate: any[] = [];
      const laundryToInsert: any[] = [];
      const txLogs: any[] = [];

      // Changed to any[] to avoid PostgrestFilterBuilder TypeScript strict promise errors
      const stockUpdates: any[] = []; 

      for (const item of items) {
        // A. Booking Inventory Logs Update
        logsToUpdate.push({
          id: item.id,
          qc_status: 'completed',
          qc_good_qty: item.good,
          qc_bad_qty: item.bad,
          qc_damage_qty: item.damage > 0 ? item.damage : 0,
          qc_completed_at: new Date().toISOString()
        });

        // B. Laundry Records (For Bad/Dirty items)
        if (item.bad > 0) {
          laundryToInsert.push({
            booking_inventory_log_id: item.id,
            unit_id: bookingInfo.units.id,
            equipment_id: item.equipment_id,
            sent_qty: item.bad,
            status: 'pooled_dirty'
          });
        }

        // C & D. Transaction Logs and Stock Updates (For Good/Unused items)
        if (item.good > 0) {
          const newStock = (item.equipment_master?.current_stock || 0) + item.good;

          txLogs.push({
            equipment_id: item.equipment_id, 
            transaction_type: 'in', 
            quantity: item.good,
            reference_type: 'qc_good_return', 
            unit_id: bookingInfo.units.id,
            booking_id: parseInt(bookingId), 
            balance_after: newStock, 
            remarks: 'Returned from Unit after QC (Unused)'
          });

          stockUpdates.push(
            supabase.from('equipment_master').update({ current_stock: newStock }).eq('id', item.equipment_id)
          );
        }
      }

      // Execute APIs safely avoiding TS Promise issues
      const promises: any[] = [
        supabase.from('booking_inventory_logs').upsert(logsToUpdate)
      ];

      if (laundryToInsert.length > 0) {
        promises.push(supabase.from('laundry_records').insert(laundryToInsert));
      }

      if (txLogs.length > 0) {
        promises.push(supabase.from('inventory_transaction_logs').insert(txLogs));
      }

      // Push all individual stock update queries
      promises.push(...stockUpdates);

      await Promise.all(promises);

      alert("Quality Control (QC) completed successfully!");
      router.push("/team/dashboard");

    } catch (e: any) {
      alert("Error submitting QC: " + e.message);
    } finally { 
      setSubmitting(false); 
    }
  };

  // ---------------- UI Rendering ----------------

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  if (!items.length) return (
    <div className="min-h-screen bg-[#F4F7FA] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full">
        <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">No QC Pending!</h2>
        <p className="text-gray-500 text-sm font-bold mb-6">There are no items collected from this unit that require Quality Control.</p>
        <button onClick={handleSkip} className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 transition-colors text-white font-bold rounded-xl shadow-md">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      <div className="bg-indigo-600 text-white p-6 shadow-md sticky top-0 z-30">
        <h1 className="text-xl font-black flex items-center gap-2"><ClipboardCheck /> Quality Control (QC)</h1>
        <p className="text-indigo-200 text-sm font-bold mt-1">Unit {bookingInfo?.units?.unit_number} • Booking #{bookingId}</p>
      </div>

      <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl text-sm font-bold shadow-sm leading-relaxed">
          The sum of <span className="text-emerald-700">Good</span> + <span className="text-red-700">Dirty</span> + <span className="text-orange-700">Damaged</span> must equal the total collected quantity. If you enter two values, the third will be calculated automatically.
        </div>

        {items.map((item) => {
          const total = item.good + item.bad + item.damage;
          const isReady = !item.error && total === item.collected_qty;

          return (
            <motion.div key={item.id} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">

              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-black text-gray-800">{item.equipment_master?.item_name}</h3>
                <div className="flex items-center gap-2">
                  {isReady
                    ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1"><CheckCircle2 size={12}/> Ready</span>
                    : <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Collected: {item.collected_qty}</span>
                  }
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Good */}
                <div>
                  <label className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1.5 block flex items-center gap-1">✅ Good</label>
                  <input type="number" min="0" max={item.collected_qty}
                    value={item.good === 0 && item.bad === 0 && item.damage === 0 ? '' : item.good}
                    onChange={(e) => handleInput(item.id, 'good', e.target.value)}
                    className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-900 text-center transition-all"
                    placeholder="0"/>
                </div>
                {/* Dirty/Bad */}
                <div>
                  <label className="text-xs font-black text-red-600 uppercase tracking-widest mb-1.5 block flex items-center gap-1">🧺 Dirty</label>
                  <input type="number" min="0" max={item.collected_qty}
                    value={item.bad === 0 && item.good === 0 && item.damage === 0 ? '' : item.bad}
                    onChange={(e) => handleInput(item.id, 'bad', e.target.value)}
                    className="w-full p-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-black text-red-900 text-center transition-all"
                    placeholder="0"/>
                </div>
                {/* Damaged */}
                <div>
                  <label className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Flame size={12}/> Damaged</label>
                  <input type="number" min="0" max={item.collected_qty}
                    value={item.damage === 0 && item.good === 0 && item.bad === 0 ? '' : item.damage}
                    onChange={(e) => handleInput(item.id, 'damage', e.target.value)}
                    className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-black text-orange-900 text-center transition-all"
                    placeholder="0"/>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-emerald-400 transition-all duration-300" style={{width: `${(item.good/item.collected_qty)*100}%`}}/>
                <div className="bg-red-400 transition-all duration-300" style={{width: `${(item.bad/item.collected_qty)*100}%`}}/>
                <div className="bg-orange-400 transition-all duration-300" style={{width: `${(item.damage/item.collected_qty)*100}%`}}/>
              </div>

              {/* Warnings / Errors */}
              {item.error && (
                <p className="text-xs text-red-500 font-bold mt-3 flex items-center gap-1 bg-red-50 p-2 rounded-lg"><AlertTriangle size={14}/> {item.error}</p>
              )}
              {!item.error && !isReady && (
                <p className="text-xs text-orange-500 font-bold mt-3 flex items-center gap-1"><AlertTriangle size={12}/> Total must be exactly {item.collected_qty}</p>
              )}
            </motion.div>
          );
        })}

        <div className="pt-6 space-y-3">
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>}
            {submitting ? "Processing..." : "Submit QC"}
          </button>

          <button 
            onClick={handleSkip} 
            disabled={submitting}
            className="w-full py-4 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-gray-200"
          >
            Skip for Now <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    </div>
  );
}