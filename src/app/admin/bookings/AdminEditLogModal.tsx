'use client';
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Clock, Camera, FileCheck, CircleDollarSign, CheckSquare,
  PackagePlus, CheckCircle2, AlertCircle, Building2, Calendar,
  Users, UserCircle, ShieldCheck, Layers, Shirt, Droplets,
  AlertTriangle, Hash, Edit3, Loader2, Search, Trash2, UploadCloud, Save, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";

// আপনার প্রজেক্টের সঠিক পাথ অনুযায়ী ইম্পোর্ট ঠিক করে নেবেন
import { getWorkPhotoUploadSignature } from "@/app/team/duty/[id]/actions"; 
import EquipmentTracker from "@/app/team/duty/[id]/EquipmentTracker";

type Tab = "execution" | "inventory" | "checklist" | "finalize";

interface AdminEditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSuccess: () => void;
}

export default function AdminEditLogModal({ isOpen, onClose, bookingId, onSuccess }: AdminEditLogModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("execution");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Core Data States ---
  const [booking, setBooking] = useState<any>(null);
  const [workLog, setWorkLog] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);

  // --- Editable States: Execution ---
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [beforePhotos, setBeforePhotos] = useState<(File | string)[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<(File | string)[]>([]);
  const [damagedPhotos, setDamagedPhotos] = useState<(File | string)[]>([]);
  const [damagedRemarks, setDamagedRemarks] = useState("");
  const [lostFoundPhotos, setLostFoundPhotos] = useState<(File | string)[]>([]);
  const [lostFoundRemarks, setLostFoundRemarks] = useState("");

  // --- Editable States: Inventory ---
  const [equipmentData, setEquipmentData] = useState<any[]>([]);

  // --- Editable States: Checklist ---
  const [checklistSections, setChecklistSections] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  // --- Editable States: Finalize ---
  const [priceInput, setPriceInput] = useState("");
  const [extraCharges, setExtraCharges] = useState<{id: string; description: string; amount: string; charge_type: 'damage'|'manual'}[]>([]);

  // --- Fetch Initial Data ---
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    fetchData();
  }, [isOpen, bookingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, logRes, extraChargesRes] = await Promise.all([
        supabase.from('bookings').select(`*, units ( id, unit_number, building_name, companies(name) ), checklist_templates(content)`).eq('id', bookingId).single(),
        supabase.from('work_logs').select('*').eq('booking_id', bookingId).maybeSingle(),
        supabase.from('booking_extra_added_charges').select('*').eq('booking_id', bookingId)
      ]);

      if (bookingRes.data) {
        setBooking(bookingRes.data);
        setSelectedDate(bookingRes.data.cleaning_date || "");
        setSelectedTime(bookingRes.data.cleaning_time || "");
        setSelectedTeam(bookingRes.data.assigned_team_id?.toString() || "");
        setPriceInput(bookingRes.data.price?.toString() || "0");

        if (bookingRes.data.checklist_templates?.content) {
          setChecklistSections(bookingRes.data.checklist_templates.content);
        }
      }

      if (logRes.data) {
        setWorkLog(logRes.data);
        if (logRes.data.start_time) setStartTime(format(parseISO(logRes.data.start_time), "HH:mm"));
        if (logRes.data.end_time) setEndTime(format(parseISO(logRes.data.end_time), "HH:mm"));

        setBeforePhotos(logRes.data.before_photos || []);
        setAfterPhotos(logRes.data.photo_urls || []);

        if (logRes.data.damaged_items) {
          setDamagedPhotos(logRes.data.damaged_items.photos || []);
          setDamagedRemarks(logRes.data.damaged_items.remarks || "");
        }
        if (logRes.data.lost_found_items) {
          setLostFoundPhotos(logRes.data.lost_found_items.photos || []);
          setLostFoundRemarks(logRes.data.lost_found_items.remarks || "");
        }
        if (logRes.data.checklist_data?.checkedItems) {
          setCheckedItems(logRes.data.checklist_data.checkedItems);
        } else if (logRes.data.checklist_data?.isDone) {
          // If old format, assume all true (simplified)
          setCheckedItems({ 'all': true });
        }
      }

      if (extraChargesRes.data) {
        setExtraCharges(extraChargesRes.data.map(c => ({
          id: c.id, description: c.item_description, amount: c.amount.toString(), charge_type: c.charge_type
        })));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Teams based on Date ---
  useEffect(() => {
    if (!selectedDate) return;
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, team_name, status').eq('shift_date', selectedDate).order('status');
      if (data) setTeams(data);
    };
    fetchTeams();
  }, [selectedDate]);

  // --- Photo Upload Logic ---
  const uploadPhotos = async (photos: (File | string)[]) => {
    const existingUrls = photos.filter(p => typeof p === 'string') as string[];
    const filesToUpload = photos.filter(p => typeof p !== 'string') as File[];

    if (filesToUpload.length === 0) return existingUrls;

    const sigParams = await getWorkPhotoUploadSignature();
    const uploadPromises = filesToUpload.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigParams.apiKey!);
      formData.append("timestamp", sigParams.timestamp.toString());
      formData.append("signature", sigParams.signature);
      formData.append("folder", "work-photos");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sigParams.cloudName}/image/upload`, {
        method: "POST", body: formData,
      });
      const data = await res.json();
      return data.secure_url;
    });

    const newUrls = await Promise.all(uploadPromises);
    return [...existingUrls, ...newUrls];
  };

  // --- BULK SAVE LOGIC ---
  const handleBulkSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Upload all new photos
      const uploadedBefore = await uploadPhotos(beforePhotos);
      const uploadedAfter = await uploadPhotos(afterPhotos);
      const uploadedDamaged = await uploadPhotos(damagedPhotos);
      const uploadedLostFound = await uploadPhotos(lostFoundPhotos);

      // 2. Format Dates
      const startDateTime = startTime ? `${selectedDate}T${startTime}:00Z` : new Date().toISOString();
      const endDateTime = endTime ? `${selectedDate}T${endTime}:00Z` : new Date().toISOString();

      // 3. Update Bookings
      await supabase.from('bookings').update({
        cleaning_date: selectedDate,
        cleaning_time: selectedTime,
        assigned_team_id: selectedTeam ? parseInt(selectedTeam) : null,
        price: parseFloat(priceInput) || 0
      }).eq('id', bookingId);

      // 4. Update Work Logs
      const logPayload = {
        start_time: startDateTime,
        end_time: endDateTime,
        before_photos: uploadedBefore,
        photo_urls: uploadedAfter,
        damaged_items: (uploadedDamaged.length > 0 || damagedRemarks) ? { photos: uploadedDamaged, remarks: damagedRemarks } : null,
        lost_found_items: (uploadedLostFound.length > 0 || lostFoundRemarks) ? { photos: uploadedLostFound, remarks: lostFoundRemarks } : null,
        checklist_data: { isDone: Object.keys(checkedItems).length > 0, checkedItems, completedAt: new Date().toISOString() },
        edited_by: user?.id,
        edited_at: new Date().toISOString()
      };

      if (workLog) {
        await supabase.from('work_logs').update(logPayload).eq('booking_id', bookingId);
      } else {
        await supabase.from('work_logs').insert({ ...logPayload, booking_id: parseInt(bookingId), submitted_by: user?.id });
      }

      // 5. Update Inventory (No Ledger, just booking logs)
      if (equipmentData.length > 0) {
        await supabase.from('booking_inventory_logs').delete().eq('booking_id', bookingId);
        const invPayload = equipmentData.map(item => ({
          booking_id: parseInt(bookingId),
          unit_id: booking?.units?.id,
          equipment_id: item.equipment_id,
          base_provide_qty: item.base_provide,
          extra_provided_qty: item.extra_provide,
          final_provided_qty: (item.base_provide || 0) + (item.extra_provide || 0),
          target_collect_qty: item.target_collect,
          collected_qty: item.collected,
          shortage_qty: Math.max(0, (item.target_collect || 0) - (item.collected || 0)),
          qc_status: item.item_type === 'returnable' ? 'pending' : 'completed',
          remarks: 'Admin bulk edit'
        }));
        await supabase.from('booking_inventory_logs').insert(invPayload);
      }

      // 6. Update Extra Charges
      await supabase.from('booking_extra_added_charges').delete().eq('booking_id', bookingId);
      const validCharges = extraCharges.filter(c => c.description.trim() && parseFloat(c.amount) > 0);
      if (validCharges.length > 0) {
        await supabase.from('booking_extra_added_charges').insert(
          validCharges.map(c => ({
            booking_id: bookingId,
            charge_type: c.charge_type,
            item_description: c.description,
            amount: parseFloat(c.amount),
            created_by: user?.id
          }))
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Bulk Save Error:", error);
      alert("Error saving data. Please check console.");
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklistTask = (taskId: string) => {
    setCheckedItems(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const companyName = Array.isArray(booking?.units?.companies) ? booking?.units?.companies[0]?.name : booking?.units?.companies?.name;
  const extraChargesTotal = extraCharges.filter(c => parseFloat(c.amount) > 0).reduce((s,c) => s + (parseFloat(c.amount)||0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* --- HEADER --- */}
        <div className="bg-gradient-to-r from-gray-900 via-[#0A192F] to-black text-white px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Edit3 size={12} /> Edit Mode: Bulk Update</p>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Unit {booking?.units?.unit_number} 
              <span className="ml-3 text-sm font-bold text-white/60 bg-white/10 px-2.5 py-1 rounded-full">{companyName}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* --- TABS --- */}
        <div className="flex bg-white border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar px-2">
          {[
            { key: "execution", label: "Execution Info", icon: <FileCheck size={16} />, color: "text-blue-600 border-blue-600 bg-blue-50/50" },
            { key: "inventory", label: "Inventory Tracker", icon: <Layers size={16} />, color: "text-indigo-600 border-indigo-600 bg-indigo-50/50" },
            { key: "checklist", label: "Task Checklist", icon: <CheckSquare size={16} />, color: "text-emerald-600 border-emerald-600 bg-emerald-50/50" },
            { key: "finalize", label: "Finalize & Save", icon: <Save size={16} />, color: "text-purple-600 border-purple-600 bg-purple-50/50" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${activeTab === tab.key ? tab.color : "border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 overflow-y-auto bg-[#F4F7FA] p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-black text-lg">Loading Log Details...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-4xl mx-auto">

                {/* ══ TAB 1: EXECUTION ══ */}
                {activeTab === "execution" && (
                  <>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                      <h3 className="font-black text-gray-900 border-b pb-3 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Booking Schedule & Team</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Shift Date</label>
                          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-gray-900" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Booking Time</label>
                          <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-gray-900" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Assigned Team</label>
                          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-gray-900 cursor-pointer">
                            <option value="">Unassigned</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.team_name} ({t.status})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                      <h3 className="font-black text-gray-900 border-b pb-3 flex items-center gap-2"><Clock size={18} className="text-indigo-500"/> Work Log Timings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Actual Start Time</label>
                          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                            className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500 font-black text-indigo-900" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Actual End Time</label>
                          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                            className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500 font-black text-indigo-900" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                      <h3 className="font-black text-gray-900 border-b pb-3 flex items-center gap-2"><Camera size={18} className="text-emerald-500"/> Media & Evidence</h3>
                      <EditablePhotoGrid title="Before Photos" photos={beforePhotos} setPhotos={setBeforePhotos} />
                      <div className="h-px bg-gray-100" />
                      <EditablePhotoGrid title="After Photos" photos={afterPhotos} setPhotos={setAfterPhotos} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm space-y-4">
                        <h3 className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Damaged Items</h3>
                        <textarea placeholder="Damage details..." value={damagedRemarks} onChange={e => setDamagedRemarks(e.target.value)} rows={2}
                          className="w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:border-red-400 font-black text-gray-900 resize-none" />
                        <EditablePhotoGrid title="" minimal photos={damagedPhotos} setPhotos={setDamagedPhotos} />
                      </div>
                      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm space-y-4">
                        <h3 className="font-black text-amber-800 flex items-center gap-2"><Search size={18}/> Lost & Found</h3>
                        <textarea placeholder="Lost/Found details..." value={lostFoundRemarks} onChange={e => setLostFoundRemarks(e.target.value)} rows={2}
                          className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-400 font-black text-gray-900 resize-none" />
                        <EditablePhotoGrid title="" minimal photos={lostFoundPhotos} setPhotos={setLostFoundPhotos} />
                      </div>
                    </div>
                  </>
                )}

                {/* ══ TAB 2: INVENTORY ══ */}
                {activeTab === "inventory" && (
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    {booking?.unit_id ? (
                      <EquipmentTracker 
                        bookingId={bookingId} 
                        unitId={booking.unit_id} 
                        onDataChange={(data) => setEquipmentData(data)}
                      />
                    ) : (
                      <p className="text-center font-black text-red-500 py-10">Unit information missing for inventory.</p>
                    )}
                  </div>
                )}

                {/* ══ TAB 3: CHECKLIST ══ */}
                {activeTab === "checklist" && (
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-900 border-b pb-3 mb-5 flex items-center gap-2"><CheckSquare size={18} className="text-emerald-500"/> Task Checklist Edit</h3>
                    {checklistSections.length === 0 ? (
                      <p className="text-center font-bold text-gray-400 py-10">No checklist template assigned.</p>
                    ) : (
                      <div className="space-y-6">
                        {checklistSections.map((section: any, sIdx: number) => (
                          <div key={sIdx}>
                            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit border border-emerald-100">{section.title || section.section || "General"}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(section.tasks || []).map((t: any, tIdx: number) => {
                                const taskLabel = typeof t === 'string' ? t : (t.text || t.label);
                                const taskId = `${section.title || 'General'} - ${taskLabel}`;
                                const isChecked = checkedItems[taskId] || checkedItems['all'];

                                return (
                                  <div key={tIdx} onClick={() => toggleChecklistTask(taskId)} 
                                    className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${isChecked ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                                    <div className={`mt-0.5 rounded-full p-0.5 shrink-0 transition-colors ${isChecked ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-transparent'}`}><CheckCircle2 size={18}/></div>
                                    <span className={`text-sm font-bold ${isChecked ? 'text-emerald-900' : 'text-gray-600'}`}>{taskLabel}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ TAB 4: FINALIZE ══ */}
                {activeTab === "finalize" && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="font-black text-gray-900 border-b pb-3 mb-5 flex items-center gap-2"><CircleDollarSign size={18} className="text-blue-500"/> Pricing & Extra Charges</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Base Cleaning Price (AED)</label>
                          <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-500 font-black text-2xl text-gray-900" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 shadow-sm">
                      <h3 className="font-black text-orange-800 border-b border-orange-200 pb-3 mb-5 flex items-center justify-between">
                        <span className="flex items-center gap-2"><AlertTriangle size={18}/> Manual Extra Charges</span>
                        <span className="text-sm font-black bg-orange-200 text-orange-900 px-3 py-1 rounded-xl">Total: AED {extraChargesTotal.toFixed(2)}</span>
                      </h3>
                      <div className="space-y-3">
                        {extraCharges.map((charge, idx) => (
                          <div key={charge.id} className="flex flex-col md:flex-row gap-3 md:items-center p-3 rounded-2xl bg-white border border-orange-200">
                            <input type="text" value={charge.description} onChange={e => setExtraCharges(prev => prev.map((c,i) => i===idx ? {...c, description: e.target.value} : c))}
                              placeholder="Charge description..." className="w-full md:flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-black text-gray-900 focus:border-orange-400" />
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 w-full md:w-32">
                                <span className="text-xs font-black text-gray-400">AED</span>
                                <input type="number" value={charge.amount} onChange={e => setExtraCharges(prev => prev.map((c,i) => i===idx ? {...c, amount: e.target.value} : c))}
                                  placeholder="0.00" className="flex-1 outline-none text-sm font-black text-gray-900 bg-transparent w-full" />
                              </div>
                              <button onClick={() => setExtraCharges(prev => prev.filter((_,i) => i!==idx))} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setExtraCharges(prev => [...prev, { id: crypto.randomUUID(), charge_type: 'manual', description: "", amount: "" }])}
                          className="w-full py-4 border-2 border-dashed border-orange-300 rounded-2xl text-sm font-black text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center gap-2">
                          + Add Extra Charge
                        </button>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <button onClick={handleBulkSave} disabled={saving}
                        className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xl shadow-xl shadow-indigo-500/30 transition-all flex justify-center items-center gap-3 disabled:opacity-70">
                        {saving ? <><Loader2 className="animate-spin" size={26}/> Saving All Edits...</> : <><Save size={26}/> BULK SAVE ALL EDITS</>}
                      </button>
                      <p className="text-center text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest">Saves Execution, Inventory, Checklist, and Finalize Tabs Together</p>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- Helper Component: Editable Photo Grid (1 Displayed, Expandable) ---
function EditablePhotoGrid({ title, photos, setPhotos, minimal = false }: any) {
  const [expanded, setExpanded] = useState(false);
  const displayPhotos = expanded ? photos : photos.slice(0, 1);
  const hiddenCount = photos.length - 1;

  return (
    <div className={minimal ? "" : "space-y-4"}>
      {!minimal && <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</h4>}
      <div className="flex flex-wrap gap-3">
        {displayPhotos.map((p: any, i: number) => {
          const src = typeof p === 'string' ? p : URL.createObjectURL(p);
          return (
            <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group">
              <img src={src} alt="Upload" className="w-full h-full object-cover" />
              <button onClick={() => setPhotos((prev: any) => prev.filter((_:any, idx:number) => idx !== i))}
                className="absolute top-1.5 right-1.5 bg-white/90 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-50">
                <Trash2 size={16}/>
              </button>
            </div>
          );
        })}

        {hiddenCount > 0 && !expanded && (
          <button onClick={() => setExpanded(true)}
            className="w-28 h-28 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm">
            <span className="font-black text-2xl">+{hiddenCount}</span>
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">View All</span>
          </button>
        )}

        {expanded && photos.length > 1 && (
          <button onClick={() => setExpanded(false)}
            className="w-28 h-28 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm">
            <Eye size={24} className="mb-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">Show Less</span>
          </button>
        )}

        <label className="w-28 h-28 rounded-2xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 cursor-pointer hover:bg-blue-50 transition bg-white shadow-sm">
          <UploadCloud size={28} className="mb-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">Add Photo</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
             if (e.target.files) setPhotos((prev: any) => [...prev, ...Array.from(e.target.files!)]);
          }} />
        </label>
      </div>
    </div>
  );
}