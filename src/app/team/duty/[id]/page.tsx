'use client';
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlayCircle, CheckCircle2, Clock, MapPin, 
  Camera, UploadCloud, ArrowLeft, Loader2, Info, Building2, ShieldCheck,
  RefreshCcw, PackagePlus, PlusCircle, Trash2, Box, PenTool, CheckSquare
} from "lucide-react";
import { getWorkPhotoUploadSignature } from "./actions";

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
  
  // Work Execution States
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  const [checklist, setChecklist] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Equipment & Inventory States
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [stdExchanges, setStdExchanges] = useState<any[]>([]);
  const [extExchanges, setExtExchanges] = useState<any[]>([]);
  const [othExchanges, setOthExchanges] = useState<any[]>([]); // 🚨 NEW: Custom Exchange State
  const [extProvides, setExtProvides] = useState<any[]>([]);
  const [othProvides, setOthProvides] = useState<any[]>([]);

  // --- 1. Fetching Logic & LocalStorage Restore ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setAgentId(session.user.id);

      const { data: bData } = await supabase
        .from('bookings')
        .select(`
          *,
          units!inner ( id, unit_number, building_name, companies(name) ),
          checklist_templates ( content )
        `)
        .eq('id', bookingId)
        .single();

      if (bData) {
        setBooking(bData);
        
        // Checklist Data Parse
        let content = null;
        if (bData.checklist_templates) {
          content = Array.isArray(bData.checklist_templates) 
            ? bData.checklist_templates[0]?.content 
            : bData.checklist_templates.content;
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
                    if (taskLabel) {
                      flatList.push({ id: `${secName} - ${taskLabel}`, label: taskLabel, section: secName });
                    }
                  });
                }
              });
            }
            setChecklist(flatList);
          } catch(e) {
            console.error("Checklist parse error:", e);
          }
        }

        // Fetch Equipment Config & Master List (Parallel)
        const [confRes, masterRes] = await Promise.all([
          supabase.from('unit_equipment_config').select('*, equipment_master(item_name)').eq('unit_id', bData.units.id),
          supabase.from('equipment_master').select('*').order('item_name')
        ]);

        if (masterRes.data) setMasterItems(masterRes.data);
        
        // 🚨 RESTORE FROM LOCAL STORAGE IF EXISTS
        const savedStateStr = localStorage.getItem(`asbn_duty_${bookingId}`);
        if (savedStateStr) {
          const savedState = JSON.parse(savedStateStr);
          setIsStarted(savedState.isStarted || false);
          if (savedState.startTime) setStartTime(new Date(savedState.startTime));
          setCheckedItems(savedState.checkedItems || {});
          
          if (savedState.stdExchanges?.length > 0) setStdExchanges(savedState.stdExchanges);
          else if (confRes.data) {
             setStdExchanges(confRes.data.map(c => ({
                id: c.id, equipment_id: c.equipment_id, item_name: c.equipment_master?.item_name,
                expected_qty: c.standard_qty, exchanged_qty: 0
             })));
          }
          
          setExtExchanges(savedState.extExchanges || []);
          setOthExchanges(savedState.othExchanges || []); // Restore custom exchanges
          setExtProvides(savedState.extProvides || []);
          setOthProvides(savedState.othProvides || []);
        } else if (confRes.data) {
          setStdExchanges(confRes.data.map(c => ({
            id: c.id, equipment_id: c.equipment_id, item_name: c.equipment_master?.item_name,
            expected_qty: c.standard_qty, exchanged_qty: 0
          })));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [bookingId, supabase]);

  // --- 2. Auto-Save to LocalStorage ---
  useEffect(() => {
    if (isStarted) {
      const stateToSave = {
        isStarted,
        startTime: startTime?.toISOString(),
        checkedItems,
        stdExchanges,
        extExchanges,
        othExchanges, // Auto-save custom exchanges
        extProvides,
        othProvides
      };
      localStorage.setItem(`asbn_duty_${bookingId}`, JSON.stringify(stateToSave));
    }
  }, [isStarted, startTime, checkedItems, stdExchanges, extExchanges, othExchanges, extProvides, othProvides, bookingId]);

  // --- 3. Prevent Accidental Refresh Warning ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStarted) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStarted]);


  // --- Handlers ---
  const toggleChecklist = (id: string) => setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removePhoto = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

  const startShift = () => { setIsStarted(true); setStartTime(new Date()); };

  const qtyOptions = Array.from({ length: 11 }, (_, i) => i);

  // --- 🚨 Final Submit Logic ---
  const handleCompleteWork = async () => {
    if (!startTime) return alert("Shift hasn't started!");

    // Check 1: Incomplete Checklist
    const hasUnchecked = checklist.some(task => !checkedItems[task.id]);
    if (hasUnchecked) {
      const proceed = window.confirm("⚠️ You have unchecked items in the cleaning tasks. Are you sure you want to submit without completing them?");
      if (!proceed) return;
    }

    // Check 2: No Equipment Logged (Updated with OthExchanges)
    const noEquipment = stdExchanges.every(e => e.exchanged_qty === 0) 
      && extExchanges.length === 0 && othExchanges.length === 0 && extProvides.length === 0 && othProvides.length === 0;
    if (noEquipment) {
      const proceed = window.confirm("⚠️ You haven't logged any equipment exchange or extra items. Are you sure you want to submit?");
      if (!proceed) return;
    }

    // Check 3: No Photos Uploaded
    const noPhotos = photos.length === 0;
    if (noPhotos) {
      const proceed = window.confirm("⚠️ You haven't uploaded any photo proofs. Are you sure you want to submit without photos?");
      if (!proceed) return;
    }

    setSubmitting(true);
    setUploadingPhotos(true);

    try {
      // 1. Upload Photos (🚨 FIXED: Match folder with action.ts "work-photos")
      const uploadedUrls: string[] = [];
      if (photos.length > 0) {
        const { signature, timestamp, apiKey, cloudName } = await getWorkPhotoUploadSignature();
        for (const file of photos) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", apiKey!);
          formData.append("timestamp", timestamp.toString());
          formData.append("signature", signature);
          formData.append("folder", "work-photos"); // 🚨 FIXED CLOUDINARY FOLDER

          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData });
          const data = await res.json();
          if (data.secure_url) uploadedUrls.push(data.secure_url);
        }
      }
      setUploadingPhotos(false);

      // 2. Prepare FULL Ordered Checklist Data
      // 🚨 FIXED: Now saves ALL items (true/false) in template order
      const fullChecklistData: Record<string, boolean> = {};
      checklist.forEach(item => {
        fullChecklistData[item.id] = checkedItems[item.id] || false;
      });

      // 3. Prepare Equipment Data JSON
      const equipmentData = {
        standardExchange: stdExchanges,
        extraExchange: extExchanges,
        otherExchange: othExchanges, // 🚨 NEW Custom Exchange
        extraProvide: extProvides, 
        otherProvide: othProvides  
      };

      // 4. Insert Work Log
      const { error: logError } = await supabase.from('work_logs').insert([{
        booking_id: parseInt(bookingId),
        team_id: booking.assigned_team_id,
        submitted_by: agentId,
        start_time: startTime.toISOString(),
        end_time: new Date().toISOString(),
        checklist_data: fullChecklistData, // 🚨 FIXED: Ordered full list
        photo_urls: uploadedUrls, 
        equipment_logs: equipmentData 
      }]);

      if (logError) throw logError;

      // 5. Update Booking Status
      const { error: statusError } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
      if (statusError) throw statusError;

      // Clear Local Storage after successful submission
      localStorage.removeItem(`asbn_duty_${bookingId}`);

      alert("Shift Completed Successfully!");
      router.push("/team/dashboard");

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
      
      {/* Header */}
      <div className="bg-gray-900 text-white p-6 shadow-md sticky top-0 z-30 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"><ArrowLeft size={20}/></button>
        <div>
           <h1 className="text-xl font-black">Unit {booking.units?.unit_number}</h1>
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{booking.units?.companies?.name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Job Info */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><Building2 className="text-blue-500" size={18}/> {booking.units?.building_name}</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><MapPin className="text-blue-500" size={18}/> Dubai, UAE</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><Clock className="text-blue-500" size={18}/> {booking.cleaning_time}</div>
          <div className="mt-2 text-xs font-black text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg w-fit border border-blue-100 uppercase tracking-widest">{booking.service_type}</div>
        </div>

        {/* Start Shift Button */}
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

        {/* WORK FLOW */}
        <AnimatePresence>
          {isStarted && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* --- SECTION 1: CHECKLIST (GROUPED BY SECTION) --- */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2"><CheckSquare className="text-blue-600"/> Cleaning Tasks</h3>
                
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
                        <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest mb-3 bg-gray-100 px-3 py-1.5 rounded-lg w-fit border border-gray-200">
                          {section}
                        </h4>
                        <div className="space-y-3">
                          {tasks.map((task: any) => (
                            <div key={task.id} onClick={() => toggleChecklist(task.id)} className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${checkedItems[task.id] ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-300'}`}>
                              <div className={`mt-0.5 rounded-full p-0.5 flex-shrink-0 transition-colors ${checkedItems[task.id] ? 'bg-green-500 text-white' : 'bg-gray-200 text-transparent'}`}><CheckCircle2 size={18}/></div>
                              <div className="flex-1">
                                <p className={`text-sm font-bold ${checkedItems[task.id] ? 'text-green-900' : 'text-gray-600'}`}>{task.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-8 text-center">
                    <CheckSquare size={32} className="mx-auto text-gray-300 mb-3"/>
                    <h3 className="text-gray-900 font-black text-lg">No Checklist Found</h3>
                    <p className="text-gray-500 font-bold text-sm mt-1">There is no checklist assigned to this booking.</p>
                  </div>
                )}
              </div>

              {/* --- SECTION 2: EQUIPMENT INVENTORY --- */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                  <Box className="text-blue-600" size={24}/>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">Equipment Tracking</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage Linens & Supplies</p>
                  </div>
                </div>

                {/* A. Standard Exchange */}
                <div className="mb-8">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg w-fit"><RefreshCcw size={14}/> Standard Exchange</h4>
                  {stdExchanges.length === 0 ? (
                    <p className="text-xs font-bold text-gray-400">No standard equipment configured for this unit.</p>
                  ) : (
                    <div className="space-y-3 pl-2">
                      {stdExchanges.map((item, idx) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-gray-900 text-sm">{item.item_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Qty: {item.expected_qty}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-black text-blue-600 uppercase">Qty:</span>
                            <select 
                              value={item.exchanged_qty} 
                              onChange={(e) => {
                                const newStd = [...stdExchanges];
                                newStd[idx].exchanged_qty = parseInt(e.target.value);
                                setStdExchanges(newStd);
                              }}
                              className="font-black text-gray-900 bg-transparent outline-none cursor-pointer"
                            >
                              {qtyOptions.map(q => <option key={q} value={q}>{q}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* B. Extra Exchange */}
                <div className="mb-6 border-t border-gray-100 pt-6">
                  <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2"><RefreshCcw size={14}/> Add Extra Exchange</h4>
                  <p className="text-[10px] font-bold text-gray-400 mb-4 pl-6 leading-tight">Record unlisted dirty/clean swaps (No extra charge applied)</p>
                  
                  <div className="space-y-3 pl-2">
                    {extExchanges.map((ex, idx) => (
                      <div key={ex.id} className="flex items-center gap-3 p-2 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <select 
                          value={ex.equipment_id} 
                          onChange={(e) => {
                            const newExt = [...extExchanges];
                            newExt[idx].equipment_id = e.target.value;
                            newExt[idx].item_name = masterItems.find(m => m.id.toString() === e.target.value)?.item_name || "";
                            setExtExchanges(newExt);
                          }}
                          className="flex-1 p-2 bg-white rounded-lg border border-amber-200 outline-none font-bold text-xs text-gray-800"
                        >
                          <option value="">Select Item...</option>
                          {masterItems.map(m => <option key={m.id} value={m.id}>{m.item_name}</option>)}
                        </select>
                        <select 
                          value={ex.qty} onChange={(e) => { const n = [...extExchanges]; n[idx].qty = parseInt(e.target.value); setExtExchanges(n); }}
                          className="w-16 p-2 bg-white rounded-lg border border-amber-200 outline-none font-black text-center text-sm"
                        >
                          {qtyOptions.slice(1).map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <button onClick={() => setExtExchanges(extExchanges.filter(x => x.id !== ex.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <button onClick={() => setExtExchanges([...extExchanges, { id: Math.random().toString(), equipment_id: "", item_name: "", qty: 1 }])} className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1.5 py-1 px-3 bg-amber-50 rounded-lg transition-colors">
                      <PlusCircle size={14}/> Add Item
                    </button>
                  </div>
                </div>

                {/* 🚨 C. Custom Extra Exchange (NEW) */}
                <div className="mb-8 pl-2">
                  <div className="space-y-3 pl-2 border-l-2 border-amber-200/50">
                    <p className="text-[10px] font-bold text-gray-400 mb-2 pl-2 leading-tight flex items-center gap-1"><PenTool size={10}/> Type manually if item is not in the list</p>
                    {othExchanges.map((oth, idx) => (
                      <div key={oth.id} className="flex items-center gap-3 p-2 bg-amber-50/30 border border-amber-100 rounded-xl ml-2">
                        <input 
                          type="text" placeholder="Custom item name..."
                          value={oth.item_name} 
                          onChange={(e) => { const n = [...othExchanges]; n[idx].item_name = e.target.value; setOthExchanges(n); }}
                          className="flex-1 p-2 bg-white rounded-lg border border-amber-200 outline-none font-bold text-xs text-gray-800"
                        />
                        <select 
                          value={oth.qty} onChange={(e) => { const n = [...othExchanges]; n[idx].qty = parseInt(e.target.value); setOthExchanges(n); }}
                          className="w-16 p-2 bg-white rounded-lg border border-amber-200 outline-none font-black text-center text-sm"
                        >
                          {qtyOptions.slice(1).map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <button onClick={() => setOthExchanges(othExchanges.filter(x => x.id !== oth.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <button onClick={() => setOthExchanges([...othExchanges, { id: Math.random().toString(), item_name: "", qty: 1 }])} className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1.5 py-1 px-3 bg-amber-50/50 rounded-lg transition-colors ml-2">
                      <PlusCircle size={14}/> Add Custom Exchange
                    </button>
                  </div>
                </div>

                {/* D. Extra Provide (Billing Trigger) */}
                <div className="mb-6 border-t border-gray-100 pt-6">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"><PackagePlus size={14}/> Add Extra Provide <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-1">Billable</span></h4>
                  <p className="text-[10px] font-bold text-gray-400 mb-4 pl-6 leading-tight">Record extra clean items provided (e.g. extra bedsheet requested)</p>
                  
                  <div className="space-y-3 pl-2">
                    {extProvides.map((ex, idx) => (
                      <div key={ex.id} className="flex items-center gap-3 p-2 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                        <select 
                          value={ex.equipment_id} 
                          onChange={(e) => {
                            const newExt = [...extProvides];
                            newExt[idx].equipment_id = e.target.value;
                            newExt[idx].item_name = masterItems.find(m => m.id.toString() === e.target.value)?.item_name || "";
                            setExtProvides(newExt);
                          }}
                          className="flex-1 p-2 bg-white rounded-lg border border-indigo-200 outline-none font-bold text-xs text-gray-800"
                        >
                          <option value="">Select Item...</option>
                          {masterItems.map(m => <option key={m.id} value={m.id}>{m.item_name}</option>)}
                        </select>
                        <select 
                          value={ex.qty} onChange={(e) => { const n = [...extProvides]; n[idx].qty = parseInt(e.target.value); setExtProvides(n); }}
                          className="w-16 p-2 bg-white rounded-lg border border-indigo-200 outline-none font-black text-center text-sm"
                        >
                          {qtyOptions.slice(1).map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <button onClick={() => setExtProvides(extProvides.filter(x => x.id !== ex.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <button onClick={() => setExtProvides([...extProvides, { id: Math.random().toString(), equipment_id: "", item_name: "", qty: 1 }])} className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 py-1 px-3 bg-indigo-50 rounded-lg transition-colors">
                      <PlusCircle size={14}/> Add Item
                    </button>
                  </div>
                </div>

                {/* E. Others Extra Provide (Billing Trigger) */}
                <div className="pl-2">
                  <div className="space-y-3 pl-2 border-l-2 border-indigo-200/50">
                    <p className="text-[10px] font-bold text-gray-400 mb-2 pl-2 leading-tight flex items-center gap-1"><PenTool size={10}/> Type manually if item is not in the list</p>
                    {othProvides.map((oth, idx) => (
                      <div key={oth.id} className="flex items-center gap-3 p-2 bg-indigo-50/30 border border-indigo-100 rounded-xl ml-2">
                        <input 
                          type="text" placeholder="Custom item name..."
                          value={oth.item_name} 
                          onChange={(e) => { const n = [...othProvides]; n[idx].item_name = e.target.value; setOthProvides(n); }}
                          className="flex-1 p-2 bg-white rounded-lg border border-indigo-200 outline-none font-bold text-xs text-gray-800"
                        />
                        <select 
                          value={oth.qty} onChange={(e) => { const n = [...othProvides]; n[idx].qty = parseInt(e.target.value); setOthProvides(n); }}
                          className="w-16 p-2 bg-white rounded-lg border border-indigo-200 outline-none font-black text-center text-sm"
                        >
                          {qtyOptions.slice(1).map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <button onClick={() => setOthProvides(othProvides.filter(x => x.id !== oth.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <button onClick={() => setOthProvides([...othProvides, { id: Math.random().toString(), item_name: "", qty: 1 }])} className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 py-1 px-3 bg-indigo-50/50 rounded-lg transition-colors ml-2">
                      <PlusCircle size={14}/> Add Custom Provide
                    </button>
                  </div>
                </div>
              </div>

              {/* --- SECTION 3: PHOTOS --- */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2"><Camera className="text-blue-600"/> Upload Proofs</h3>
                <p className="text-xs text-gray-500 font-bold mb-6">Take pictures of the cleaned unit to verify the work.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all aspect-square group">
                    <UploadCloud className="text-gray-400 group-hover:text-blue-500 mb-2" size={32}/>
                    <span className="text-xs font-black text-gray-500 group-hover:text-blue-600 uppercase tracking-widest text-center">Add Photo</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  
                  {photos.map((file, i) => (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={i} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm group border border-gray-200">
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                         <Trash2 size={16}/>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* --- Final Submit Action --- */}
              <div className="pt-4 pb-10">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCompleteWork}
                  disabled={submitting}
                  className="w-full py-5 bg-gradient-to-r from-gray-900 to-black text-white font-black rounded-2xl text-lg shadow-xl shadow-gray-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <> <Loader2 className="animate-spin" size={24}/> {uploadingPhotos ? "Uploading Media..." : "Finalizing..."} </>
                  ) : (
                    <> <ShieldCheck size={24}/> Complete & Submit Log </>
                  )}
                </motion.button>
                <p className="text-center text-[10px] text-gray-400 mt-4 font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Info size={12}/> Ensure everything is accurate before submission
                </p>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
