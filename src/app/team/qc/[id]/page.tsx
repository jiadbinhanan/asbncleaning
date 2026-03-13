'use client';
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowRight, ClipboardCheck, AlertTriangle } from "lucide-react";

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
      // Fetch Booking Details & Pending QC Items in parallel
      const [bookingRes, logsRes] = await Promise.all([
        supabase.from('bookings').select('id, units(unit_number)').eq('id', bookingId).single(),
        supabase.from('booking_inventory_logs')
                .select('id, equipment_id, collected_qty, qc_status, equipment_master(item_name, current_stock)')
                .eq('booking_id', bookingId)
                .eq('qc_status', 'pending')
      ]);

      if (bookingRes.data) setBookingInfo(bookingRes.data);
      
      if (logsRes.data && logsRes.data.length > 0) {
        // Only show items that were actually collected
        const collectedItems = logsRes.data.filter(log => log.collected_qty > 0).map(log => ({
          ...log,
          good: 0,
          bad: 0,
          error: ""
        }));
        setItems(collectedItems);
      }
      setLoading(false);
    };
    fetchData();
  }, [bookingId, supabase]);

  // 2. Handlers
  const handleInput = (id: string, field: 'good' | 'bad', value: string) => {
    const num = parseInt(value) || 0;
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: num };
        const total = updated.good + updated.bad;
        if (total > item.collected_qty) {
          updated.error = `Total cannot exceed collected quantity (${item.collected_qty})`;
        } else {
          updated.error = "";
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSkip = () => {
    router.push("/team/dashboard");
  };

  // 3. Submit Logic (Optimized Bulk Operations)
  const handleSubmit = async () => {
    // Validation
    const hasErrors = items.some(i => i.error || (i.good + i.bad !== i.collected_qty));
    if (hasErrors) return alert("Please ensure all Good and Bad quantities exactly match the total collected items.");

    setSubmitting(true);
    try {
      const logsToUpdate = [];
      const laundryRecordsToInsert = [];
      const transactionLogs = [];

      for (const item of items) {
        // A. Prepare booking_inventory_logs update
        logsToUpdate.push({
          id: item.id,
          qc_status: 'completed',
          qc_good_qty: item.good,
          qc_bad_qty: item.bad,
          qc_completed_at: new Date().toISOString()
        });

        // B. Prepare Laundry Records for Bad items
        if (item.bad > 0) {
          laundryRecordsToInsert.push({
            booking_inventory_log_id: item.id,
            unit_id: bookingInfo.units.id,
            equipment_id: item.equipment_id,
            sent_qty: item.bad,
            status: 'pooled_dirty' // 🚨 FIXED: Now goes to Supervisor's Pool instead of direct laundry
          });
        }

        // C. Prepare Transaction Log for Good items (Returning to Stock)
        if (item.good > 0) {
          const newStock = (item.equipment_master?.current_stock || 0) + item.good;
          transactionLogs.push({
            equipment_id: item.equipment_id,
            transaction_type: 'in',
            quantity: item.good,
            reference_type: 'qc_good_return',
            unit_id: bookingInfo.units.id,
            booking_id: parseInt(bookingId),
            balance_after: newStock,
            remarks: 'Returned from Unit after QC (Unused)'
          });

          // D. Direct Stock Update (Looping here since it's small, ideally a DB function is better but this works flawlessly for minimal load)
          await supabase.from('equipment_master')
                .update({ current_stock: newStock })
                .eq('id', item.equipment_id);
        }
      }

      // Execute Bulk API Calls
      const promises = [
        supabase.from('booking_inventory_logs').upsert(logsToUpdate),
        transactionLogs.length > 0 ? supabase.from('inventory_transaction_logs').insert(transactionLogs) : Promise.resolve(),
        laundryRecordsToInsert.length > 0 ? supabase.from('laundry_records').insert(laundryRecordsToInsert) : Promise.resolve()
      ];

      await Promise.all(promises);

      alert("Quality Control completed successfully!");
      router.push("/team/dashboard");

    } catch (error: any) {
      alert("Error submitting QC: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] p-6 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">No QC Pending!</h2>
          <p className="text-gray-500 text-sm font-bold mb-6">There are no items collected from this unit that require Quality Control.</p>
          <button onClick={() => router.push("/team/dashboard")} className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-md">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      <div className="bg-indigo-600 text-white p-6 shadow-md sticky top-0 z-30">
        <h1 className="text-xl font-black flex items-center gap-2"><ClipboardCheck /> Quality Control (QC)</h1>
        <p className="text-indigo-200 text-sm font-bold mt-1">Unit {bookingInfo?.units?.unit_number} • Booking #{bookingId}</p>
      </div>

      <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl text-sm font-bold shadow-sm">
          Please verify the items collected from the unit. Separate the unused/fresh items (Good) from the dirty ones (Bad).
        </div>

        {items.map((item) => (
          <motion.div key={item.id} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
              <h3 className="font-black text-gray-800">{item.equipment_master?.item_name}</h3>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black">Collected: {item.collected_qty}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1 block">Good (Unused)</label>
                <input 
                  type="number" min="0" max={item.collected_qty} 
                  value={item.good === 0 && item.bad === 0 ? '' : item.good} 
                  onChange={(e) => handleInput(item.id, 'good', e.target.value)}
                  className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-black text-red-600 uppercase tracking-widest mb-1 block">Bad (Dirty)</label>
                <input 
                  type="number" min="0" max={item.collected_qty}
                  value={item.good === 0 && item.bad === 0 ? '' : item.bad} 
                  onChange={(e) => handleInput(item.id, 'bad', e.target.value)}
                  className="w-full p-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-red-900"
                  placeholder="0"
                />
              </div>
            </div>

            {item.error && (
              <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1"><AlertTriangle size={12}/> {item.error}</p>
            )}
            {!item.error && (item.good + item.bad !== item.collected_qty) && (
              <p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1"><AlertTriangle size={12}/> Total must equal {item.collected_qty}</p>
            )}
          </motion.div>
        ))}

        <div className="pt-6 space-y-3">
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {submitting ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>} 
            {submitting ? "Processing QC..." : "Submit QC"}
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