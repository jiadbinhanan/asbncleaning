'use client';
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Clock, Camera, FileCheck, CircleDollarSign, CheckSquare,
  CheckCircle2, Calendar, Layers, AlertTriangle, Edit3, Loader2,
  Search, Trash2, UploadCloud, Save, ChevronLeft, ChevronRight,
  ZoomIn, CheckCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import imageCompression from 'browser-image-compression';
import { getWorkPhotoUploadSignature } from "@/app/team/duty/[id]/actions";
import AdminEditEquipmentTracker from "./AdminEditEquipmentTracker";

type Tab = "execution" | "inventory" | "checklist" | "finalize";

const TABS: { key: Tab; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { key: "execution", label: "Execution Info",  icon: <FileCheck size={15} />,        activeColor: "border-blue-600 text-blue-700 bg-blue-50/60" },
  { key: "inventory", label: "Inventory",        icon: <Layers size={15} />,           activeColor: "border-indigo-600 text-indigo-700 bg-indigo-50/60" },
  { key: "checklist", label: "Checklist",        icon: <CheckSquare size={15} />,      activeColor: "border-emerald-600 text-emerald-700 bg-emerald-50/60" },
  { key: "finalize",  label: "Finalize & Save",  icon: <CircleDollarSign size={15} />, activeColor: "border-purple-600 text-purple-700 bg-purple-50/60" },
];

// 🚨 FIXED: Removed 'exifOrientation: true' because it expects a number, not a boolean. 
// The library auto-handles orientation natively now.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.22,
  maxWidthOrHeight: 1600,
  initialQuality: 0.82,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

interface AdminEditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSuccess: () => void;
}

// ─── Duration calculator ──────────────────────────────────────────────────────
function calcDuration(start: string, end: string): string | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

// ─── Photo Lightbox ───────────────────────────────────────────────────────────
function PhotoLightbox({ photos, startIndex, onClose }: { photos: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx(i => (i + 1) % photos.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition">
          <X size={20} />
        </button>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-[11px] font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full select-none">
          {idx + 1} / {photos.length}
        </div>
        {photos.length > 1 && (
          <button onClick={prev} className="absolute left-3 z-10 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition">
            <ChevronLeft size={22} />
          </button>
        )}
        <img
          src={photos[idx]}
          alt={`Photo ${idx + 1}`}
          className="max-h-[85vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl select-none"
          draggable={false}
        />
        {photos.length > 1 && (
          <button onClick={next} className="absolute right-3 z-10 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition">
            <ChevronRight size={22} />
          </button>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/35"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editable Photo Grid ──────────────────────────────────────────────────────
function EditablePhotoGrid({ title, photos, setPhotos, minimal = false }: {
  title: string;
  photos: (File | string)[];
  setPhotos: React.Dispatch<React.SetStateAction<(File | string)[]>>;
  minimal?: boolean;
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [compressing, setCompressing] = useState(false);

  const previews = photos.map(p => typeof p === "string" ? p : URL.createObjectURL(p));
  const uploadedUrls = photos.filter(p => typeof p === "string") as string[];

  const handleAddFiles = async (files: FileList) => {
    setCompressing(true);
    try {
      const compressed = await Promise.all(
        Array.from(files).map(f => imageCompression(f, COMPRESSION_OPTIONS))
      );
      setPhotos(prev => [...prev, ...compressed]);
    } catch {
      setPhotos(prev => [...prev, ...Array.from(files)]);
    } finally {
      setCompressing(false);
    }
  };

  const openLightbox = (i: number) => {
    if (typeof photos[i] === "string") {
      const li = uploadedUrls.indexOf(photos[i] as string);
      if (li >= 0) setLightboxIdx(li);
    }
  };

  return (
    <>
      {lightboxIdx !== null && (
        <PhotoLightbox photos={uploadedUrls} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      <div className={minimal ? "" : "space-y-2.5"}>
        {!minimal && <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{title}</h4>}
        <div className="flex flex-wrap gap-2.5">
          {previews.map((src, i) => {
            const isUploaded = typeof photos[i] === "string";
            return (
              <div key={i} className="relative w-[88px] h-[88px] rounded-xl overflow-hidden border border-gray-200 shadow-sm group flex-shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {isUploaded && (
                  <div onClick={() => openLightbox(i)}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center cursor-zoom-in transition">
                    <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                )}
                <button
                  onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-50 z-10">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          <label className="w-[88px] h-[88px] rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 cursor-pointer hover:bg-blue-50 transition bg-white shadow-sm flex-shrink-0">
            {compressing
              ? <Loader2 size={20} className="animate-spin" />
              : <><UploadCloud size={20} className="mb-1" /><span className="text-[9px] font-black uppercase">Add</span></>}
            <input type="file" multiple accept="image/*" className="hidden"
              onChange={e => e.target.files && handleAddFiles(e.target.files)} />
          </label>
        </div>
      </div>
    </>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function AdminEditLogModal({ isOpen, onClose, bookingId, onSuccess }: AdminEditLogModalProps) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<Tab>("execution");
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [booking, setBooking] = useState<any>(null);
  const [workLog, setWorkLog] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [beforePhotos, setBeforePhotos] = useState<(File | string)[]>([]);
  const [afterPhotos, setAfterPhotos]   = useState<(File | string)[]>([]);
  const [damagedPhotos, setDamagedPhotos]     = useState<(File | string)[]>([]);
  const [damagedRemarks, setDamagedRemarks]   = useState("");
  const [lostFoundPhotos, setLostFoundPhotos] = useState<(File | string)[]>([]);
  const [lostFoundRemarks, setLostFoundRemarks] = useState("");

  const [equipmentData, setEquipmentData] = useState<any[]>([]);

  const [checklistSections, setChecklistSections] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [k: string]: boolean }>({});

  const [priceInput, setPriceInput] = useState("");
  const [extraCharges, setExtraCharges] = useState<{ id: string; description: string; amount: string; charge_type: 'damage' | 'manual' }[]>([]);

  // ─── Swipe support ─────────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      const ni = diff > 0 ? Math.min(tabIndex + 1, TABS.length - 1) : Math.max(tabIndex - 1, 0);
      switchTab(ni);
    }
    touchStartX.current = null;
  };

  const switchTab = (i: number) => { setTabIndex(i); setActiveTab(TABS[i].key); };

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, logRes, chargesRes, profilesRes] = await Promise.all([
        supabase.from('bookings')
          .select(`*, units(id, unit_number, building_name, companies(name)), checklist_templates!checklist_template_id(content)`)
          .eq('id', bookingId).single(),
        supabase.from('work_logs').select('*').eq('booking_id', bookingId).maybeSingle(),
        supabase.from('booking_extra_added_charges').select('*').eq('booking_id', bookingId),
        supabase.from('profiles').select('id, full_name, avatar_url'),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);

      if (bookingRes.data) {
        const b = bookingRes.data;
        setBooking(b);
        setSelectedDate(b.cleaning_date || "");
        setSelectedTime(b.cleaning_time || "");
        setSelectedTeam(b.assigned_team_id?.toString() || "");
        setPriceInput(b.price?.toString() || "0");

        const sections = b.checklist_templates?.content || [];
        setChecklistSections(sections);

        const allChecked: { [k: string]: boolean } = {};
        sections.forEach((sec: any) => {
          (sec.tasks || []).forEach((t: any) => {
            const label = typeof t === "string" ? t : (t.text || t.label);
            allChecked[`${sec.title || "General"} - ${label}`] = true;
          });
        });
        setCheckedItems(allChecked);
      }

      if (logRes.data) {
        const log = logRes.data;
        setWorkLog(log);
        if (log.start_time) setStartTime(format(parseISO(log.start_time), "HH:mm"));
        if (log.end_time)   setEndTime(format(parseISO(log.end_time), "HH:mm"));
        setBeforePhotos(log.before_photos || []);
        setAfterPhotos(log.photo_urls || []);
        if (log.damaged_items) {
          setDamagedPhotos(log.damaged_items.photos || []);
          setDamagedRemarks(log.damaged_items.remarks || "");
        }
        if (log.lost_found_items) {
          setLostFoundPhotos(log.lost_found_items.photos || []);
          setLostFoundRemarks(log.lost_found_items.remarks || "");
        }
        if (log.checklist_data?.checkedItems) {
          setCheckedItems(log.checklist_data.checkedItems);
        }
      }

      if (chargesRes.data) {
        setExtraCharges(chargesRes.data.map((c: any) => ({
          id: c.id, description: c.item_description, amount: c.amount.toString(), charge_type: c.charge_type,
        })));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Teams by date ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDate) return;
    supabase.from('teams').select('id, team_name, status, member_ids').eq('shift_date', selectedDate).order('status')
      .then(({ data }) => { if (data) setTeams(data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // ─── Upload ────────────────────────────────────────────────────────────────
  const uploadPhotos = async (photos: (File | string)[]): Promise<string[]> => {
    const existing = photos.filter(p => typeof p === "string") as string[];
    const files    = photos.filter(p => typeof p !== "string") as File[];
    if (!files.length) return existing;

    const sig = await getWorkPhotoUploadSignature();
    const uploaded = await Promise.all(files.map(async file => {
      try {
        const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("api_key", sig.apiKey!);
        fd.append("timestamp", sig.timestamp.toString());
        fd.append("signature", sig.signature);
        fd.append("folder", "work-photos");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
        return (await res.json()).secure_url as string | null;
      } catch { return null; }
    }));
    return [...existing, ...(uploaded.filter(Boolean) as string[])];
  };

  // ─── Bulk Save ─────────────────────────────────────────────────────────────
  const handleBulkSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [upBefore, upAfter, upDmg, upLF] = await Promise.all([
        uploadPhotos(beforePhotos), uploadPhotos(afterPhotos),
        uploadPhotos(damagedPhotos), uploadPhotos(lostFoundPhotos),
      ]);

      const startDT = startTime ? `${selectedDate}T${startTime}:00` : new Date().toISOString();
      const endDT   = endTime   ? `${selectedDate}T${endTime}:00`   : new Date().toISOString();

      await supabase.from('bookings').update({
        cleaning_date: selectedDate,
        cleaning_time: selectedTime,
        assigned_team_id: selectedTeam ? parseInt(selectedTeam) : null,
        price: parseFloat(priceInput) || 0,
      }).eq('id', bookingId);

      const logPayload = {
        start_time: startDT,
        end_time: endDT,
        before_photos: upBefore,
        photo_urls: upAfter,
        damaged_items: (upDmg.length || damagedRemarks) ? { photos: upDmg, remarks: damagedRemarks } : null,
        lost_found_items: (upLF.length || lostFoundRemarks) ? { photos: upLF, remarks: lostFoundRemarks } : null,
        checklist_data: { isDone: Object.keys(checkedItems).length > 0, checkedItems, completedAt: new Date().toISOString() },
        edited_by: user?.id,
        edited_at: new Date().toISOString(),
      };

      if (workLog) {
        await supabase.from('work_logs').update(logPayload).eq('booking_id', bookingId);
      } else {
        await supabase.from('work_logs').insert({ ...logPayload, booking_id: parseInt(bookingId), submitted_by: user?.id });
      }

      if (equipmentData.length > 0) {
        await supabase.from('booking_inventory_logs').delete().eq('booking_id', bookingId);
        await supabase.from('booking_inventory_logs').insert(
          equipmentData.map(item => {
            const finalProvided = (item.base_provide || 0) + (item.extra_provide || 0);
            const targetCollect = item.item_type !== 'consumable' ? (item.standard_qty ?? 0) : 0;
            return {
              booking_id: parseInt(bookingId),
              unit_id: booking?.units?.id,
              inventory_item_id: item.equipment_id,
              base_provide_qty: item.base_provide ?? 0,
              extra_provided_qty: item.extra_provide ?? 0,
              final_provided_qty: finalProvided,
              target_collect_qty: targetCollect,
              collected_qty: item.collected ?? 0,
              shortage_qty: Math.max(0, targetCollect - (item.collected ?? 0)),
              qc_status: item.item_type === 'returnable' ? 'pending' : 'completed',
              remarks: 'Admin bulk edit log',
            };
          })
        );
      }

      await supabase.from('booking_extra_added_charges').delete().eq('booking_id', bookingId);
      const validCharges = extraCharges.filter(c => c.description.trim() && parseFloat(c.amount) > 0);
      if (validCharges.length) {
        await supabase.from('booking_extra_added_charges').insert(
          validCharges.map(c => ({
            booking_id: parseInt(bookingId),
            charge_type: c.charge_type,
            item_description: c.description,
            amount: parseFloat(c.amount),
            created_by: user?.id,
          }))
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Bulk Save Error:", err);
      alert("Error saving. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const profilesMap = new Map(profiles.map(p => [p.id, p.full_name || "—"]));
  const companyName = Array.isArray(booking?.units?.companies)
    ? booking?.units?.companies[0]?.name
    : booking?.units?.companies?.name;
  const extraChargesTotal = extraCharges
    .filter(c => parseFloat(c.amount) > 0)
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const duration = calcDuration(startTime, endTime);
  const totalTasks   = checklistSections.reduce((n, s) => n + (s.tasks?.length || 0), 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const markAllChecked = () => {
    const all: { [k: string]: boolean } = {};
    checklistSections.forEach((sec: any) => {
      (sec.tasks || []).forEach((t: any) => {
        const label = typeof t === "string" ? t : (t.text || t.label);
        all[`${sec.title || "General"} - ${label}`] = true;
      });
    });
    setCheckedItems(all);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 18 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl bg-white rounded-[1.75rem] shadow-2xl flex flex-col overflow-hidden"
        style={{ height: "min(92vh, 880px)" }}
      >
        {/* ─── HEADER ─── */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white shrink-0">
          <div className="px-5 md:px-8 pt-5 pb-4 flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                <Edit3 size={11} /> Admin Edit Mode
              </p>
              <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight truncate">
                Unit {booking?.units?.unit_number || "—"}
                {companyName && (
                  <span className="ml-2.5 text-xs font-bold text-white/60 bg-white/10 px-2.5 py-1 rounded-full align-middle border border-white/10">
                    {companyName}
                  </span>
                )}
              </h2>
              {booking?.booking_ref && (
                <p className="text-[9px] text-blue-300/60 font-black mt-1 uppercase tracking-widest">
                  {booking.booking_ref}
                </p>
              )}
            </div>
            <button onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-red-500/80 rounded-full text-white/70 hover:text-white transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── TAB BAR ─── */}
        <div className="flex bg-white border-b border-gray-100 shrink-0 overflow-x-auto scrollbar-none">
          {TABS.map((tab, i) => (
            <button key={tab.key} onClick={() => switchTab(i)}
              className={`flex items-center justify-center gap-1.5 px-4 py-3.5 text-xs font-black transition-all border-b-2 whitespace-nowrap flex-1
                ${activeTab === tab.key
                  ? tab.activeColor
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── SCROLLABLE CONTENT ─── */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F4F7FA] overscroll-contain"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Loader2 className="animate-spin" size={34} />
              <p className="font-black text-sm uppercase tracking-widest">Loading...</p>
            </div>
          ) : (
            <div className="p-4 md:p-6">

              {/* ══════════ EXECUTION ══════════ */}
              <div className={activeTab === "execution" ? "block space-y-4" : "hidden"}>
                {/* Schedule & Team */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-black text-gray-900 border-b border-gray-100 pb-2.5 flex items-center gap-2 text-sm">
                    <Calendar size={15} className="text-blue-500" /> Booking Schedule & Team
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Shift Date</label>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-black text-gray-900 text-sm transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Booking Time</label>
                      <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-black text-gray-900 text-sm transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Assigned Team</label>
                      <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-black text-gray-900 text-sm cursor-pointer transition-all">
                        <option value="">Unassigned</option>
                        {teams.map(t => {
                          const names = (t.member_ids || []).map((uid: string) => profilesMap.get(uid)).filter(Boolean);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.team_name}{names.length ? ` (${names.join(", ")})` : ""}
                            </option>
                          );
                        })}
                      </select>
                      {selectedTeam && (() => {
                        const team = teams.find(t => t.id.toString() === selectedTeam);
                        const names = (team?.member_ids || []).map((uid: string) => profilesMap.get(uid)).filter(Boolean);
                        return names.length ? (
                          <p className="mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                            👥 {names.join(" · ")}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Timings + Duration */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-black text-gray-900 border-b border-gray-100 pb-2.5 flex items-center gap-2 text-sm">
                    <Clock size={15} className="text-indigo-500" /> Work Log Timings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Start Time</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                        className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-black text-indigo-900 text-sm transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">End Time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                        className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-black text-indigo-900 text-sm transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Total Duration</label>
                      <div className={`p-3 rounded-xl border text-sm font-black text-center transition-all
                        ${duration ? "bg-green-50 border-green-200 text-green-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                        {duration ? `⏱ ${duration}` : "— set times"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-black text-gray-900 border-b border-gray-100 pb-2.5 flex items-center gap-2 text-sm">
                    <Camera size={15} className="text-emerald-500" /> Media & Evidence
                  </h3>
                  <EditablePhotoGrid title="Before Photos" photos={beforePhotos} setPhotos={setBeforePhotos} />
                  <div className="h-px bg-gray-100" />
                  <EditablePhotoGrid title="After Photos" photos={afterPhotos} setPhotos={setAfterPhotos} />
                </div>

                {/* Damage + Lost & Found */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm space-y-3">
                    <h3 className="font-black text-red-800 flex items-center gap-2 text-sm">
                      <AlertTriangle size={15} /> Damaged Items
                    </h3>
                    <textarea placeholder="Damage details..." value={damagedRemarks} onChange={e => setDamagedRemarks(e.target.value)} rows={2}
                      className="w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-bold text-gray-900 text-sm resize-none transition-all" />
                    <EditablePhotoGrid title="" minimal photos={damagedPhotos} setPhotos={setDamagedPhotos} />
                  </div>
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm space-y-3">
                    <h3 className="font-black text-amber-800 flex items-center gap-2 text-sm">
                      <Search size={15} /> Lost & Found
                    </h3>
                    <textarea placeholder="Lost/Found details..." value={lostFoundRemarks} onChange={e => setLostFoundRemarks(e.target.value)} rows={2}
                      className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 font-bold text-gray-900 text-sm resize-none transition-all" />
                    <EditablePhotoGrid title="" minimal photos={lostFoundPhotos} setPhotos={setLostFoundPhotos} />
                  </div>
                </div>
              </div>

              {/* ══════════ INVENTORY ══════════ */}
              <div className={activeTab === "inventory" ? "block" : "hidden"}>
                <div className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm">
                  {booking?.units?.id ? (
                    <AdminEditEquipmentTracker
                      bookingId={bookingId}
                      unitId={booking.units.id}
                      onDataChange={setEquipmentData}
                    />
                  ) : (
                    <p className="text-center font-black text-red-500 py-10 text-sm">Unit info missing.</p>
                  )}
                </div>
              </div>

              {/* ══════════ CHECKLIST ══════════ */}
              <div className={activeTab === "checklist" ? "block" : "hidden"}>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <h3 className="font-black text-gray-900 flex items-center gap-2 text-sm">
                      <CheckSquare size={15} className="text-emerald-500" /> Task Checklist
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-400">{checkedCount}/{totalTasks}</span>
                      <button onClick={markAllChecked}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-black hover:bg-emerald-100 transition">
                        <CheckCheck size={12} /> Mark All
                      </button>
                    </div>
                  </div>
                  {checklistSections.length === 0 ? (
                    <p className="text-center font-bold text-gray-400 py-10 text-sm">No checklist template assigned.</p>
                  ) : (
                    <div className="space-y-5">
                      {checklistSections.map((section: any, sIdx: number) => (
                        <div key={sIdx}>
                          <h4 className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-3 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit border border-emerald-100">
                            {section.title || section.section || "General"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(section.tasks || []).map((t: any, tIdx: number) => {
                              const label = typeof t === "string" ? t : (t.text || t.label);
                              const taskId = `${section.title || "General"} - ${label}`;
                              const isChecked = !!checkedItems[taskId];
                              return (
                                <div key={tIdx} onClick={() => setCheckedItems(prev => ({ ...prev, [taskId]: !prev[taskId] }))}
                                  className={`flex items-start gap-2.5 p-3 rounded-xl cursor-pointer border transition-all
                                    ${isChecked ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}>
                                  <div className={`mt-0.5 rounded-full p-0.5 shrink-0 transition-colors
                                    ${isChecked ? "bg-emerald-500 text-white" : "bg-gray-200 text-transparent"}`}>
                                    <CheckCircle2 size={15} />
                                  </div>
                                  <span className={`text-xs font-bold leading-snug ${isChecked ? "text-emerald-900" : "text-gray-600"}`}>
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════ FINALIZE ══════════ */}
              <div className={activeTab === "finalize" ? "block" : "hidden"}>
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-900 border-b border-gray-100 pb-2.5 mb-4 flex items-center gap-2 text-sm">
                      <CircleDollarSign size={15} className="text-blue-500" /> Pricing
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Base Cleaning Price (AED)</label>
                        <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-black text-2xl text-gray-900 transition-all" />
                      </div>
                      <div className="flex items-end">
                        <div className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Extra Charges Total</p>
                          <p className="text-2xl font-black text-indigo-900">AED {extraChargesTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 shadow-sm">
                    <h3 className="font-black text-orange-800 border-b border-orange-200 pb-2.5 mb-4 flex items-center gap-2 text-sm">
                      <AlertTriangle size={15} /> Manual Extra Charges
                    </h3>
                    <div className="space-y-2.5">
                      {extraCharges.map((charge, idx) => (
                        <div key={charge.id} className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 rounded-2xl bg-white border border-orange-200 shadow-sm">
                          <input type="text" value={charge.description}
                            onChange={e => setExtraCharges(prev => prev.map((c, i) => i === idx ? { ...c, description: e.target.value } : c))}
                            placeholder="Charge description..."
                            className="w-full sm:flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-black text-gray-900 focus:border-orange-400 transition-colors" />
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 w-full sm:w-28 transition-colors">
                              <span className="text-xs font-black text-gray-400">AED</span>
                              <input type="number" value={charge.amount}
                                onChange={e => setExtraCharges(prev => prev.map((c, i) => i === idx ? { ...c, amount: e.target.value } : c))}
                                placeholder="0.00" className="flex-1 outline-none text-sm font-black text-gray-900 bg-transparent" />
                            </div>
                            <button onClick={() => setExtraCharges(prev => prev.filter((_, i) => i !== idx))}
                              className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setExtraCharges(prev => [...prev, { id: crypto.randomUUID(), charge_type: 'manual', description: "", amount: "" }])}
                        className="w-full py-3.5 border-2 border-dashed border-orange-300 rounded-2xl text-sm font-black text-orange-600 hover:bg-orange-100 hover:border-orange-400 transition-all flex items-center justify-center gap-2">
                        + Add Extra Charge
                      </button>
                    </div>
                  </div>

                  <div>
                    <button onClick={handleBulkSave} disabled={saving}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-indigo-500/25 transition-all flex justify-center items-center gap-3 disabled:opacity-70">
                      {saving
                        ? <><Loader2 className="animate-spin" size={22} /> Saving & Uploading...</>
                        : <><Save size={22} /> BULK SAVE ALL EDITS</>}
                    </button>
                    <p className="text-center text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-widest">
                      Saves Execution · Inventory · Checklist · Pricing together
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}