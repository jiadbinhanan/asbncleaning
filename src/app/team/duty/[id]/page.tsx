'use client';
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlayCircle, CheckCircle2, Clock, MapPin, 
  Camera, UploadCloud, ArrowLeft, Loader2, Info, Building2, ShieldCheck,
  Trash2, CheckSquare, AlertTriangle, Search, ChevronDown, ChevronUp
} from "lucide-react";
import { getWorkPhotoUploadSignature } from "./actions";
import EquipmentTracker from "./EquipmentTracker";

export default function DutyPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const bookingId = params.id as string;

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [booking, setBooking] = useState<any>(null);
  const [agentId, setAgentId] = useState<string>("");

  // --- Damage & Lost/Found States ---
  const [showDamaged, setShowDamaged] = useState(false);
  const [damagedPhotos, setDamagedPhotos] = useState<File[]>([]);
  const [damagedRemarks, setDamagedRemarks] = useState("");

  const [showLostFound, setShowLostFound] = useState(false);
  const [lostFoundPhotos, setLostFoundPhotos] = useState<File[]>([]);
  const [lostFoundRemarks, setLostFoundRemarks] = useState("");

  // --- Photo Remove Handlers ---
  const removeDamagedPhoto = (index: number) => setDamagedPhotos(prev => prev.filter((_, i) => i !== index));
  const removeLostFoundPhoto = (index: number) => setLostFoundPhotos(prev => prev.filter((_, i) => i !== index));
  
  // Work Execution States
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  const [checklist, setChecklist] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Equipment Logs from Child Component
  const [equipmentLogData, setEquipmentLogData] = useState<any[]>([]);

  const handleEquipmentDataChange = useCallback((data: any[]) => {
    setEquipmentLogData(data);
  }, []); // empty deps — function reference কখনো বদলাবে না


  // --- 1. Fetching Logic & LocalStorage Restore ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setAgentId(session.user.id);

      const { data: bData } = await supabase
        .from('bookings')
        .select(`*, units!inner ( id, unit_number, building_name, companies(name) ), checklist_templates ( content )`)
        .eq('id', bookingId)
        .single();

      if (bData) {
        setBooking(bData);
        
        let content = null;
        if (bData.checklist_templates) {
          content = Array.isArray(bData.checklist_templates) ? bData.checklist_templates[0]?.content : bData.checklist_templates.content;
        }

        if (content) {
          try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;
            const flatList: any[] = [];
            if (Array.isArray(parsed)) {
              parsed.forEach((sectionItem: any) => {
                const secName = sectionItem.title || sectionItem.section || 'General';
                const tasks = sectionItem.tasks || [];
                if (Array.isArray(tasks)) {
                  tasks.forEach((taskItem: any) => {
                    const taskLabel = typeof taskItem === 'string' ? taskItem : (taskItem.text || taskItem.label || '');
                    if (taskLabel) flatList.push({ id: `${secName} - ${taskLabel}`, label: taskLabel, section: secName });
                  });
                }
              });
            }
            setChecklist(flatList);
          } catch(e) { console.error("Checklist parse error:", e); }
        }

        // Restore Local Storage
        const savedStateStr = localStorage.getItem(`asbn_duty_${bookingId}`);
        if (savedStateStr) {
          const savedState = JSON.parse(savedStateStr);
          setIsStarted(savedState.isStarted || false);
          if (savedState.startTime) setStartTime(new Date(savedState.startTime));
          setCheckedItems(savedState.checkedItems || {});
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [bookingId, supabase]);

  // --- 2. Auto-Save to LocalStorage ---
  useEffect(() => {
    if (isStarted) {
      localStorage.setItem(`asbn_duty_${bookingId}`, JSON.stringify({ isStarted, startTime: startTime?.toISOString(), checkedItems }));
    }
  }, [isStarted, startTime, checkedItems, bookingId]);

  // --- 3. Prevent Accidental Refresh Warning ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStarted) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStarted]);

  // --- Handlers ---
  const toggleChecklist = (id: string) => setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  const handleCheckAll = () => {
    const allChecked: { [key: string]: boolean } = {};
    checklist.forEach(item => { allChecked[item.id] = true; });
    setCheckedItems(allChecked);
  };

  const removeBeforePhoto = (index: number) => setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  const removeAfterPhoto = (index: number) => setAfterPhotos(prev => prev.filter((_, i) => i !== index));
  const startShift = () => { setIsStarted(true); setStartTime(new Date()); };

  // --- Final Submit Logic ---
  const handleCompleteWork = async () => {
    if (!startTime) return alert("Shift hasn't started!");

    const hasUnchecked = checklist.some(task => !checkedItems[task.id]);
    if (hasUnchecked) {
      const proceed = window.confirm("⚠️ You have unchecked items in the cleaning tasks. Are you sure you want to submit without completing them?");
      if (!proceed) return;
    }

    const noPhotos = beforePhotos.length === 0 && afterPhotos.length === 0;
    if (noPhotos) {
      const proceed = window.confirm("⚠️ You haven't uploaded any photo proofs. Are you sure you want to submit without photos?");
      if (!proceed) return;
    }

    setSubmitting(true);
    setUploadingPhotos(true);

    try {
      const uploadedBeforeUrls: string[] = [];
      const uploadedAfterUrls: string[] = [];
      const uploadedDamagedUrls: string[] = [];     // 🚨 NEW
      const uploadedLostFoundUrls: string[] = [];   // 🚨 NEW
      
      if (beforePhotos.length > 0 || afterPhotos.length > 0 || damagedPhotos.length > 0 || lostFoundPhotos.length > 0) {
        const { signature, timestamp, apiKey, cloudName } = await getWorkPhotoUploadSignature();
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

        const uploadToCloudinary = async (file: File) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", apiKey!);
          formData.append("timestamp", timestamp.toString());
          formData.append("signature", signature);
          formData.append("folder", "work-photos");
          const res = await fetch(cloudinaryUrl, { method: "POST", body: formData });
          const data = await res.json();
          return data.secure_url;
        };

        for (const file of beforePhotos) {
          const url = await uploadToCloudinary(file);
          if (url) uploadedBeforeUrls.push(url);
        }

        for (const file of afterPhotos) {
          const url = await uploadToCloudinary(file);
          if (url) uploadedAfterUrls.push(url);
        }

      // 🚨 NEW: Upload Damaged Photos
      for (const file of damagedPhotos) {
        const url = await uploadToCloudinary(file);
        if (url) uploadedDamagedUrls.push(url);
      }

      // 🚨 NEW: Upload Lost & Found Photos
      for (const file of lostFoundPhotos) {
        const url = await uploadToCloudinary(file);
        if (url) uploadedLostFoundUrls.push(url);
      }
    }

      setUploadingPhotos(false);

      // 1. PROCESS ALL CALCULATIONS
      const processedEquipment = equipmentLogData.map(item => {
        const standard = item.standard_provide;
        // base_provide = agent selected base qty (default = standard)
        const base     = item.base_provide ?? standard;
        const extra    = item.extra_provide;   // extra above base → billed
        let finalProv  = 0, short = 0, newBal = 0;
        let returnedToStock = 0, keptInRoom = 0;

        if (item.item_type === 'returnable') {
          // Collect dirty → provide fresh (base + extra)
          finalProv       = base + extra;
          short           = Math.max(0, item.target_collect - item.collected);
          newBal          = finalProv;
          returnedToStock = 0;
          keptInRoom      = 0;
        }
        else if (item.item_type === 'refillable') {
          // Collect usable dispensers back to stock, place fresh base + extra
          finalProv       = base + extra;
          short           = Math.max(0, item.target_collect - item.collected);
          newBal          = finalProv;              // fresh bottles only in room
          returnedToStock = item.collected;         // usable ones back to warehouse
          keptInRoom      = 0;
        }
        else if (item.item_type === 'consumable') {
          // No collection — just place base + extra
          finalProv       = base + extra;
          short           = 0;
          newBal          = finalProv;
          returnedToStock = item.collected;  // ← this line is added
          keptInRoom      = 0;
        }

        return {
          ...item,
          calc_standard:        standard,
          calc_base:            base,
          calc_extra:           extra,
          calc_finalProv:       finalProv,
          calc_short:           short,
          calc_newBal:          newBal,
          calc_returnedToStock: returnedToStock,
          calc_keptInRoom:      keptInRoom,
        };
      });

      // 2. Inventory Logs for DB
      const inventoryLogs = processedEquipment.map(item => ({
        booking_id:         parseInt(bookingId),
        unit_id:            booking.units.id,
        equipment_id:       item.equipment_id,
        base_provide_qty:   item.calc_base,        // ← renamed column, actual base placed
        extra_provided_qty: item.calc_extra,
        final_provided_qty: item.calc_finalProv,
        target_collect_qty: item.target_collect,
        collected_qty:      item.collected,
        shortage_qty:       item.calc_short,
        qc_status: item.item_type === 'returnable' ? 'pending' : 'completed',
      }));

      // 3. Unit Balance Updates
      const balanceUpdates = processedEquipment.map(item => ({
        unit_id:            booking.units.id,
        equipment_id:       item.equipment_id,
        current_in_unit_qty: item.calc_newBal,
        last_updated_at:    new Date().toISOString(),
      }));

      // 4. Ledger + Stock (in-memory map to avoid race conditions)
      const itemsProvided = processedEquipment.filter(i => i.calc_finalProv > 0);
      const itemsReturned = processedEquipment.filter(
        i => i.calc_returnedToStock > 0
      );
      const ledgerEntries: any[]      = [];
      const stockUpdatePromises: any[] = [];

      if (itemsProvided.length > 0 || itemsReturned.length > 0) {
        const allIds = [
          ...itemsProvided.map(i => i.equipment_id),
          ...itemsReturned.map(i => i.equipment_id),
        ];
        const { data: masterStockData } = await supabase
          .from('equipment_master')
          .select('id, current_stock')
          .in('id', allIds);

        const stockMap: Record<number, number> = {};
        masterStockData?.forEach((m: any) => { stockMap[m.id] = m.current_stock; });

        // OUT — supplied to unit
        itemsProvided.forEach(item => {
          const newStock = (stockMap[item.equipment_id] || 0) - item.calc_finalProv;
          stockMap[item.equipment_id] = newStock;
          ledgerEntries.push({
            equipment_id:    item.equipment_id,
            transaction_type: 'out',
            quantity:        item.calc_finalProv,
            reference_type:  'supplied_to_unit',
            unit_id:         booking.units.id,
            booking_id:      parseInt(bookingId),
            balance_after:   newStock,
            remarks: `Supplied ${item.calc_finalProv}x ${item.item_name} to Unit ${booking.units.unit_number} - ${booking.units.building_name} (${booking.units.companies?.name?.trim() || 'Unknown'}) | Ref: ${booking.booking_ref}`,
          });
          stockUpdatePromises.push(
            supabase.from('equipment_master').update({ current_stock: newStock }).eq('id', item.equipment_id)
          );
        });

        // IN — refillable usable items returned to stock
        itemsReturned.forEach(item => {
          const newStock = (stockMap[item.equipment_id] || 0) + item.calc_returnedToStock;
          stockMap[item.equipment_id] = newStock;
          ledgerEntries.push({
            equipment_id:    item.equipment_id,
            transaction_type: 'in',
            quantity:        item.calc_returnedToStock,
            reference_type:  'usable_returned_from_unit',
            unit_id:         booking.units.id,
            booking_id:      parseInt(bookingId),
            balance_after:   newStock,
            remarks: `Returned ${item.calc_returnedToStock}x usable ${item.item_name} from Unit ${booking.units.unit_number} (${booking.units.companies?.name?.trim() || 'Unknown'}) | Ref: ${booking.booking_ref}`,
          });
          stockUpdatePromises.push(
            supabase.from('equipment_master').update({ current_stock: newStock }).eq('id', item.equipment_id)
          );
        });
      }

      // ==========================================
      // DATABASE EXECUTION BLOCK
      // ==========================================

        // A. Insert Work log
        const { error: logError } = await supabase.from('work_logs').insert([{
          booking_id: parseInt(bookingId),
          team_id: booking.assigned_team_id,
          start_time: startTime?.toISOString(),
          end_time: new Date().toISOString(),
          photo_urls: uploadedAfterUrls,
          before_photos: uploadedBeforeUrls,
          submitted_by: agentId,
          // 🚨 NEW: Save Damaged and Lost & Found data as JSON
          damaged_items: (uploadedDamagedUrls.length > 0 || damagedRemarks) ? { photos: uploadedDamagedUrls, remarks: damagedRemarks } : null,
          lost_found_items: (uploadedLostFoundUrls.length > 0 || lostFoundRemarks) ? { photos: uploadedLostFoundUrls, remarks: lostFoundRemarks } : null
        }]);
        if (logError) throw logError;

        // B. Insert Inventory Logs
        const { error: invError } = await supabase.from('booking_inventory_logs').insert(inventoryLogs);
        if (invError) throw invError;

        // C. Upsert Unit Balances
        const { error: balError } = await supabase.from('unit_inventory_balances').upsert(balanceUpdates, { onConflict: 'unit_id, equipment_id' });
        if (balError) throw balError;

        // D. Execute Ledger Entries & Master Stock Updates (The new fix)
        if (ledgerEntries.length > 0) {
          const { error: ledgerError } = await supabase.from('inventory_transaction_logs').insert(ledgerEntries);
          if (ledgerError) throw ledgerError;
          await Promise.all(stockUpdatePromises);
        }

      // Update booking status
      const { error: statusError } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
      if (statusError) throw statusError;

      // Clean up Local Storage
      localStorage.removeItem(`asbn_duty_${bookingId}`);
      localStorage.removeItem(`asbn_eq_${bookingId}`);

      alert("Shift Completed Successfully! Redirecting to Quality Control...");
      // ড্যাশবোর্ডের বদলে সরাসরি এই বুকিংয়ের QC পেজে পাঠিয়ে দেব
      router.push(`/team/qc/${bookingId}`);

    } catch (error: any) {
      alert("Error submitting log: " + error.message);
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;
  if (!booking) return <div className="p-8 text-center text-red-500 font-bold">Booking not found!</div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      
      <div className="bg-gray-900 text-white p-6 shadow-md sticky top-0 z-30 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"><ArrowLeft size={20}/></button>
        <div>
           <h1 className="text-xl font-black">Unit {booking.units?.unit_number}</h1>
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{booking.units?.companies?.name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><Building2 className="text-blue-500" size={18}/> {booking.units?.building_name}</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><MapPin className="text-blue-500" size={18}/> Dubai, UAE</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><Clock className="text-blue-500" size={18}/> {booking.cleaning_time}</div>
          <div className="mt-2 text-xs font-black text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg w-fit border border-blue-100 uppercase tracking-widest">{booking.service_type}</div>
        </div>

        {!isStarted ? (
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
            onClick={startShift}
            className="w-full py-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[2rem] shadow-xl flex flex-col items-center justify-center gap-2"
          >
            <PlayCircle size={48}/>
            <span className="text-xl font-black tracking-tight">START SHIFT</span>
            <span className="text-xs font-medium text-blue-200 uppercase tracking-widest">Tap to begin timer & unlock tasks</span>
          </motion.button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between shadow-inner">
             <div className="flex items-center gap-3 text-green-700 font-black"><Clock className="animate-pulse"/> Shift Active</div>
             <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full uppercase tracking-widest">Started at {startTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        )}

        <AnimatePresence>
          {isStarted && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2"><Camera className="text-blue-600"/> Before Cleaning Photos</h3>
                <label className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all aspect-video group">
                  <UploadCloud className="text-gray-400 group-hover:text-blue-500 mb-2" size={32}/>
                  <span className="text-xs font-black text-gray-500 group-hover:text-blue-600 uppercase tracking-widest text-center">Add Before Photo</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) setBeforePhotos(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                </label>
                
                {beforePhotos.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto mt-4 pb-2 custom-scrollbar">
                    {beforePhotos.map((file, i) => (
                      <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                        <img src={URL.createObjectURL(file)} alt="Before" className="w-full h-full object-cover" />
                        <button onClick={() => removeBeforePhoto(i)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 hover:bg-red-50 shadow-sm"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CHECKLIST (Visual Only) */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
                <div className="mb-6">
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><CheckSquare className="text-blue-600"/> Cleaning Tasks</h3>
                </div>
                {checklist.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(
                      checklist.reduce((acc: any, task: any) => {
                        if (!acc[task.section]) acc[task.section] = [];
                        acc[task.section].push(task);
                        return acc;
                      }, {})
                    ).map(([section, tasks]: any) => (
                      <div key={section}>
                        <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest mb-3 bg-gray-100 px-3 py-1.5 rounded-lg w-fit border border-gray-200">{section}</h4>
                        <div className="space-y-3">
                          {tasks.map((task: any) => (
                            <div key={task.id} onClick={() => toggleChecklist(task.id)} className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${checkedItems[task.id] ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-300'}`}>
                              <div className={`mt-0.5 rounded-full p-0.5 shrink-0 transition-colors ${checkedItems[task.id] ? 'bg-green-500 text-white' : 'bg-gray-200 text-transparent'}`}><CheckCircle2 size={18}/></div>
                              <div className="flex-1">
                                <p className={`text-sm font-bold ${checkedItems[task.id] ? 'text-green-900' : 'text-gray-600'}`}>{task.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-5 mt-5 border-t border-gray-100 flex justify-end">
                      <button onClick={handleCheckAll} className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-sm border border-blue-200">
                         <CheckSquare size={18}/> Check All Tasks
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                    <CheckSquare size={32} className="mx-auto text-gray-300 mb-3"/>
                    <h3 className="text-gray-900 font-black text-lg">No Checklist Found</h3>
                  </div>
                )}
              </div>

              {/* 🚨 EQUIPMENT TRACKER (NEW COMPONENT) 🚨 */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden mb-6">
                 <EquipmentTracker 
                    bookingId={bookingId} 
                    unitId={booking.units?.id} 
                    onDataChange={handleEquipmentDataChange} 
                 />
              </div>

            {/* 🚨 REPORTING SECTIONS (Damaged & Lost/Found) 🚨 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                
                {/* Damaged Items Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden">
                  <button onClick={() => setShowDamaged(!showDamaged)} className="w-full flex items-center justify-between p-5 bg-red-50/50 hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-2 text-red-600 font-black">
                      <AlertTriangle size={20}/> Report Damaged Item
                    </div>
                    {showDamaged ? <ChevronUp className="text-red-500" size={20}/> : <ChevronDown className="text-red-500" size={20}/>}
                  </button>
                  
                  <AnimatePresence>
                    {showDamaged && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5">
                        <div className="pt-4 space-y-4 border-t border-red-100">
                          <label className="border-2 border-dashed border-red-200 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all aspect-[3/1] group">
                            <UploadCloud className="text-red-300 group-hover:text-red-500 mb-1" size={28}/>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">Upload Damage Photos</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) setDamagedPhotos(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                          </label>
                          {damagedPhotos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                              {damagedPhotos.map((file, i) => (
                                <div key={i} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                  <img src={URL.createObjectURL(file)} alt="Damage" className="w-full h-full object-cover" />
                                  <button onClick={() => removeDamagedPhoto(i)} className="absolute top-0.5 right-0.5 bg-white/90 p-1 rounded-full text-red-500 shadow-sm"><Trash2 size={10}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Remarks / Details</label>
                            <textarea value={damagedRemarks} onChange={e => setDamagedRemarks(e.target.value)} rows={2} placeholder="Describe the damage..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-400 text-sm font-bold text-gray-700 resize-none"></textarea>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Lost & Found Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
                  <button onClick={() => setShowLostFound(!showLostFound)} className="w-full flex items-center justify-between p-5 bg-amber-50/50 hover:bg-amber-50 transition-colors">
                    <div className="flex items-center gap-2 text-amber-600 font-black">
                      <Search size={20}/> Lost & Found Item
                    </div>
                    {showLostFound ? <ChevronUp className="text-amber-500" size={20}/> : <ChevronDown className="text-amber-500" size={20}/>}
                  </button>
                  
                  <AnimatePresence>
                    {showLostFound && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5">
                        <div className="pt-4 space-y-4 border-t border-amber-100">
                          <label className="border-2 border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all aspect-[3/1] group">
                            <UploadCloud className="text-amber-300 group-hover:text-amber-500 mb-1" size={28}/>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest text-center">Upload Found Item Photos</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) setLostFoundPhotos(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                          </label>
                          {lostFoundPhotos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                              {lostFoundPhotos.map((file, i) => (
                                <div key={i} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                  <img src={URL.createObjectURL(file)} alt="Lost" className="w-full h-full object-cover" />
                                  <button onClick={() => removeLostFoundPhoto(i)} className="absolute top-0.5 right-0.5 bg-white/90 p-1 rounded-full text-red-500 shadow-sm"><Trash2 size={10}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Remarks / Details</label>
                            <textarea value={lostFoundRemarks} onChange={e => setLostFoundRemarks(e.target.value)} rows={2} placeholder="Where was it found? Describe it..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-amber-400 text-sm font-bold text-gray-700 resize-none"></textarea>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>


              {/* AFTER PHOTOS */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
                <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2"><Camera className="text-emerald-600"/> After Cleaning Photos</h3>
                <div>
                  <label className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all aspect-video group">
                    <UploadCloud className="text-gray-400 group-hover:text-emerald-500 mb-2" size={32}/>
                    <span className="text-xs font-black text-gray-500 group-hover:text-emerald-600 uppercase tracking-widest text-center">Add After Photo</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) setAfterPhotos(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                  </label>
                  
                  {afterPhotos.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto mt-4 pb-2 custom-scrollbar">
                      {afterPhotos.map((file, i) => (
                        <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                          <img src={URL.createObjectURL(file)} alt="After" className="w-full h-full object-cover" />
                          <button onClick={() => removeAfterPhoto(i)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 hover:bg-red-50 shadow-sm"><Trash2 size={12}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 pb-10">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCompleteWork}
                  disabled={submitting}
                  className="w-full py-5 bg-gradient-to-r from-gray-900 to-black text-white font-black rounded-2xl text-lg shadow-xl shadow-gray-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <> <Loader2 className="animate-spin" size={24}/> {uploadingPhotos ? "Uploading Media..." : "Finalizing Log & Inventory..."} </>
                  ) : (
                    <> <ShieldCheck size={24}/> Complete & Submit Log </>
                  )}
                </motion.button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
