'use client';
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, UploadCloud, CheckCircle2, ShieldCheck,
  AlertTriangle, Loader2, Camera, Trash2, ChevronDown, ChevronUp, Package,
  Eye
} from "lucide-react";
// আপনার প্রজেক্টের সঠিক পাথ অনুযায়ী ইম্পোর্ট ঠিক করে নেবেন
import { getWorkPhotoUploadSignature } from "@/app/team/duty/[id]/actions"; 
import EquipmentTracker from "@/app/team/duty/[id]/EquipmentTracker";

interface AdminDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSuccess: () => void;
}

export default function AdminDutyModal({ isOpen, onClose, bookingId, onSuccess }: AdminDutyModalProps) {
  const supabase = createClient();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data States
  const [booking, setBooking] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);

  // Form States
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  // Photo States
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [damagedPhotos, setDamagedPhotos] = useState<File[]>([]);
  const [lostFoundPhotos, setLostFoundPhotos] = useState<File[]>([]);

  const [damagedRemarks, setDamagedRemarks] = useState("");
  const [lostFoundRemarks, setLostFoundRemarks] = useState("");

  // Toggles & Sections
  const [isChecklistDone, setIsChecklistDone] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

  const [equipmentData, setEquipmentData] = useState<any[]>([]);

  // --- Fetch Initial Data ---
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    fetchInitialData();
  }, [isOpen, bookingId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 🚨 Fix: Correctly joined units and companies matching the team duty page logic
      const { data: bData, error } = await supabase
        .from('bookings')
        .select(`*, units ( id, unit_number, building_name, companies(name) )`)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      if (bData) {
        setBooking(bData);
        setSelectedDate(bData.cleaning_date || "");
        setSelectedTeam(bData.assigned_team_id?.toString() || "");
      }
    } catch (error) {
      console.error("Error fetching admin duty data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Teams & Profiles Based on Selected Date ---
  useEffect(() => {
    if (!selectedDate) return;

    const fetchTeamsForDate = async () => {
      try {
        // Fetch teams and profiles simultaneously
        const [teamsRes, profilesRes] = await Promise.all([
          supabase.from('teams').select('*').eq('shift_date', selectedDate).order('status'),
          supabase.from('profiles').select('id, full_name')
        ]);

        if (teamsRes.data) {
          const profilesMap = new Map();
          if (profilesRes.data) {
            profilesRes.data.forEach(p => profilesMap.set(p.id, p.full_name));
          }

          const formattedTeams = teamsRes.data.map(t => {
            const memberNames = (t.member_ids || [])
              .map((id: string) => profilesMap.get(id) || 'Unknown')
              .join(', ');
            return { ...t, membersStr: memberNames || 'No members' };
          });

          setTeams(formattedTeams);
        }
      } catch (error) {
        console.error("Error fetching teams by date:", error);
      }
    };

    fetchTeamsForDate();
  }, [selectedDate]);

  // --- Photo Upload Logic ---
  const uploadPhotos = async (photos: File[]) => {
    if (photos.length === 0) return [];
    try {
      const sigParams = await getWorkPhotoUploadSignature();
      const uploadPromises = photos.map(async (file) => {
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

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Photo upload failed:", error);
      throw error;
    }
  };

  // --- Final Submit ---
  const handleSubmit = async () => {
    const noPhotos = beforePhotos.length === 0 && afterPhotos.length === 0;
    if (noPhotos && !isChecklistDone) {
      const confirmed = window.confirm("কোনো ছবি আপলোড করা হয়নি এবং চেকলিস্টও সম্পন্ন করা হয়নি। আপনি কি নিশ্চিত সাবমিট করতে চান?");
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const uploadedBefore = await uploadPhotos(beforePhotos);
      const uploadedAfter = await uploadPhotos(afterPhotos);
      const uploadedDamaged = await uploadPhotos(damagedPhotos);
      const uploadedLostFound = await uploadPhotos(lostFoundPhotos);

      // 1. Insert into work_logs
      const logPayload = {
        booking_id: parseInt(bookingId),
        team_id: selectedTeam ? parseInt(selectedTeam) : null,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        before_photos: uploadedBefore,
        photo_urls: uploadedAfter,
        damaged_items: (uploadedDamaged.length > 0 || damagedRemarks) ? { photos: uploadedDamaged, remarks: damagedRemarks } : null,
        lost_found_items: (uploadedLostFound.length > 0 || lostFoundRemarks) ? { photos: uploadedLostFound, remarks: lostFoundRemarks } : null,
        checklist_data: { isDone: isChecklistDone, completedAt: new Date().toISOString() },
        submitted_by: user?.id,
      };

      await supabase.from('work_logs').insert(logPayload);

      // 2. Update bookings table
      await supabase.from('bookings').update({
        assigned_team_id: selectedTeam ? parseInt(selectedTeam) : null,
        cleaning_date: selectedDate,
        work_status: 'work_done',
        status: 'completed'
      }).eq('id', bookingId);

      // 3. Update Equipment Logs
      if (equipmentData.length > 0) {
        await supabase.from('booking_inventory_logs').delete().eq('booking_id', bookingId);

        const invPayload = equipmentData.map(item => ({
          booking_id: parseInt(bookingId),
          unit_id: booking?.units?.id,
          equipment_id: item.equipment_id,
          standard_qty: item.standard_provide,
          extra_provided_qty: item.extra_provide || 0,
          final_provided_qty: (item.base_provide || item.standard_provide) + (item.extra_provide || 0),
          target_collect_qty: item.target_collect || 0,
          collected_qty: item.collected || 0,
          shortage_qty: Math.max(0, (item.target_collect || 0) - (item.collected || 0)),
          qc_status: item.item_type === 'returnable' ? 'pending' : 'completed',
          remarks: 'Admin manual duty submission'
        }));
        await supabase.from('booking_inventory_logs').insert(invPayload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error submitting data. Please check console.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900">Manage Duty</h2>
            <p className="text-sm text-gray-500 font-bold mt-1">
              Unit {booking?.units?.unit_number} • {booking?.units?.companies?.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-bold">Fetching details...</p>
            </div>
          ) : (
            <>
              {/* Settings: Date & Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block tracking-wider">Shift Date</label>
                  <input 
                    type="date" 
                    value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-900 font-black shadow-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block tracking-wider">Assigned Team</label>
                  <select 
                    value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-900 font-black shadow-sm transition-all cursor-pointer"
                  >
                    <option value="" className="text-gray-400">Select Team (Optional)</option>
                    {teams.length === 0 && <option disabled>No teams found for this date</option>}
                    {teams.map(t => (
                      <option key={t.id} value={t.id} className="font-bold text-gray-800">
                        {t.team_name} ({t.status}) {t.membersStr ? ` - [${t.membersStr}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Before Photos */}
              <PhotoSection 
                title="Before Work Photos" icon={<Camera size={18}/>}
                photos={beforePhotos} setPhotos={setBeforePhotos}
              />

              {/* Checklist (Minimal) */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div 
                  className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setShowChecklist(!showChecklist)}
                >
                  <div className="flex items-center gap-2 font-black text-gray-800">
                    <CheckCircle2 size={20} className="text-blue-500" />
                    Work Checklist
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsChecklistDone(!isChecklistDone); }}
                      className={`px-5 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-sm ${isChecklistDone ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                    >
                      {isChecklistDone && <CheckCircle2 size={16}/>}
                      {isChecklistDone ? "All Done" : "Mark All Done"}
                    </button>
                    {showChecklist ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                  </div>
                </div>
                <AnimatePresence>
                  {showChecklist && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-4 text-sm font-bold text-gray-500 bg-white border-t border-gray-100">
                        (Admin Mode) Checking the button above marks all items as completed. You don't need to check items individually unless required.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Damaged / Lost & Found */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-red-50/50 p-5 rounded-xl border border-red-100 shadow-sm">
                  <h4 className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Damaged Items</h4>
                  <textarea 
                    placeholder="Enter remarks..." value={damagedRemarks} onChange={e => setDamagedRemarks(e.target.value)}
                    className="w-full p-3 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white text-gray-900 font-black resize-none transition-all shadow-sm" rows={2}
                  />
                  <PhotoSection minimal title="" photos={damagedPhotos} setPhotos={setDamagedPhotos} />
                </div>
                <div className="space-y-4 bg-purple-50/50 p-5 rounded-xl border border-purple-100 shadow-sm">
                  <h4 className="font-black text-purple-800 flex items-center gap-2"><Package size={18}/> Lost & Found</h4>
                  <textarea 
                    placeholder="Enter remarks..." value={lostFoundRemarks} onChange={e => setLostFoundRemarks(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-200 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-white text-gray-900 font-black resize-none transition-all shadow-sm" rows={2}
                  />
                  <PhotoSection minimal title="" photos={lostFoundPhotos} setPhotos={setLostFoundPhotos} />
                </div>
              </div>

              {/* After Photos */}
              <PhotoSection 
                title="After Work Photos" icon={<Camera size={18}/>}
                photos={afterPhotos} setPhotos={setAfterPhotos}
              />

              {/* Equipment Tracker (Collapsible) */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div 
                  className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setShowEquipment(!showEquipment)}
                >
                  <div className="flex items-center gap-2 font-black text-gray-800">
                    <ShieldCheck size={20} className="text-orange-500" />
                    Equipment & Inventory Tracker
                  </div>
                  {showEquipment ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                </div>
                <AnimatePresence>
                  {showEquipment && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                      <div className="p-4 border-t border-gray-100">
                        {booking?.units?.id ? (
                          <EquipmentTracker 
                            bookingId={bookingId} 
                            unitId={booking.units.id} 
                            onDataChange={(data) => setEquipmentData(data)}
                          />
                        ) : (
                          <div className="text-center py-6 bg-red-50 rounded-xl border border-red-100">
                            <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-red-600">Unit information missing for this booking.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-white">
          <button 
            onClick={handleSubmit} disabled={loading || submitting}
            className="w-full py-4 bg-gray-900 text-white font-black rounded-xl shadow-xl hover:bg-black transition-all flex justify-center items-center gap-2 disabled:opacity-70 text-lg"
          >
            {submitting ? (
              <><Loader2 className="animate-spin" size={24} /> Submitting Log...</>
            ) : (
              <><UploadCloud size={24}/> Submit Duty Log</>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
}

// --- Helper Component for Photo Upload Grid (with Expand/Collapse) ---
function PhotoSection({ title, icon, photos, setPhotos, minimal = false }: any) {
  const [expanded, setExpanded] = useState(false);
  const displayPhotos = expanded ? photos : photos.slice(0, 3);
  const hiddenCount = photos.length - 3;

  return (
    <div className={minimal ? "" : "space-y-4"}>
      {!minimal && <h3 className="font-black text-gray-900 flex items-center gap-2">{icon} {title}</h3>}
      <div className="flex flex-wrap gap-3">
        {displayPhotos.map((p: any, i: number) => {
          const src = typeof p === 'string' ? p : URL.createObjectURL(p);
          return (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
              <img src={src} alt="Upload" className="w-full h-full object-cover" />
              <button 
                onClick={() => setPhotos((prev: any) => prev.filter((_:any, idx:number) => idx !== i))} 
                className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-50"
              >
                <Trash2 size={14}/>
              </button>
            </div>
          );
        })}

        {/* View All Button */}
        {hiddenCount > 0 && !expanded && (
          <button 
            onClick={() => setExpanded(true)}
            className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm"
          >
            <span className="font-black text-lg">+{hiddenCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">View All</span>
          </button>
        )}

        {/* Show Less Button */}
        {expanded && photos.length > 3 && (
          <button 
            onClick={() => setExpanded(false)}
            className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm"
          >
            <Eye size={20} className="mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Show Less</span>
          </button>
        )}

        {/* Add Photo Button */}
        <label className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition bg-white shadow-sm">
          <UploadCloud size={24} className="mb-1" />
          <span className="text-[10px] font-black uppercase tracking-wider">Add</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
             if (e.target.files) {
               const filesArray = Array.from(e.target.files);
               setPhotos((prev: any) => [...prev, ...filesArray]);
             }
          }} />
        </label>
      </div>
    </div>
  );
}