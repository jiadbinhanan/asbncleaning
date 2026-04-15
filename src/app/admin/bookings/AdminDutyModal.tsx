'use client';
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, UploadCloud, CheckCircle2, ShieldCheck,
  AlertTriangle, Loader2, Camera, Trash2, ChevronDown, ChevronUp, Package,
  Eye, Clock, Calendar, Users, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";

// --- JSquash Imports ---
import encodeJpeg from '@jsquash/jpeg/encode';
import resize from '@jsquash/resize';

import { getWorkPhotoUploadSignature } from "@/app/team/duty/[id]/actions"; 
import EquipmentTracker from "@/app/team/duty/[id]/EquipmentTracker";

interface AdminDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSuccess: () => void;
}

// ─── Photo Lightbox ───────────────────────────────────────────────────────────
function PhotoLightbox({ photos, startIndex, onClose }: { photos: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx(i => (i + 1) % photos.length);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition"><X size={20} /></button>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-[11px] font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full select-none">
          {idx + 1} / {photos.length}
        </div>
        {photos.length > 1 && <button onClick={prev} className="absolute left-3 z-10 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition"><ChevronLeft size={22} /></button>}
        <img src={photos[idx]} alt={`Photo ${idx + 1}`} className="max-h-[85vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl select-none" draggable={false} />
        {photos.length > 1 && <button onClick={next} className="absolute right-3 z-10 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition"><ChevronRight size={22} /></button>}
        {photos.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/35"}`} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDutyModal({ isOpen, onClose, bookingId, onSuccess }: AdminDutyModalProps) {
  const supabase = createClient();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState<"completed" | "finalized" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  // Data States
  const [booking, setBooking] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);

  // Form States
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Photo States
  const [beforePhotos, setBeforePhotos] = useState<(File | string)[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<(File | string)[]>([]);
  const [damagedPhotos, setDamagedPhotos] = useState<(File | string)[]>([]);
  const [lostFoundPhotos, setLostFoundPhotos] = useState<(File | string)[]>([]);

  const [damagedRemarks, setDamagedRemarks] = useState("");
  const [lostFoundRemarks, setLostFoundRemarks] = useState("");

  const [isChecklistDone, setIsChecklistDone] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

  const [equipmentData, setEquipmentData] = useState<any[]>([]);

  // --- Fetch Initial Data ---
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [bookingRes, workLogRes] = await Promise.all([
        supabase.from('bookings').select(`*, units ( id, unit_number, building_name, companies(name) )`).eq('id', bookingId).single(),
        supabase.from('work_logs').select('*').eq('booking_id', bookingId).maybeSingle()
      ]);

      if (bookingRes.data) {
        setBooking(bookingRes.data);
        setSelectedDate(bookingRes.data.cleaning_date || "");
        setSelectedTeam(bookingRes.data.assigned_team_id?.toString() || "");
      }

      if (workLogRes.data) {
        setIsEditMode(true);
        const log = workLogRes.data;
        if (log.start_time) setStartTime(format(parseISO(log.start_time), "HH:mm"));
        if (log.end_time) setEndTime(format(parseISO(log.end_time), "HH:mm"));

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
        setIsChecklistDone(true);
      } else {
        setIsEditMode(false);
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
      const [teamsRes, profilesRes] = await Promise.all([
        supabase.from('teams').select('*').eq('shift_date', selectedDate).order('status'),
        supabase.from('profiles').select('id, full_name')
      ]);

      if (teamsRes.data && profilesRes.data) {
        const profileMap = new Map();
        profilesRes.data.forEach(p => profileMap.set(p.id, p.full_name));

        const formattedTeams = teamsRes.data.map(t => {
          const names = (t.member_ids || [])
            .map((id: string) => profileMap.get(id))
            .filter(Boolean)
            .join(', ');
          return { ...t, membersStr: names };
        });
        setTeams(formattedTeams);
      }
    };
    fetchTeamsForDate();
  }, [selectedDate]);

  // --- Auto Calculate End Time (+73 mins) ---
  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (val) {
      const [h, m] = val.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0);
      date.setMinutes(date.getMinutes() + 73); 
      const endH = String(date.getHours()).padStart(2, '0');
      const endM = String(date.getMinutes()).padStart(2, '0');
      setEndTime(`${endH}:${endM}`);
    }
  };

  // --- Exact 120-180KB Compression Logic ---
  const compressImageJSquash = async (file: File): Promise<File> => {
    // 1. If originally < 180kb, do NOT compress.
    if (file.size <= 180 * 1024) {
      return file; 
    }

    try {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // 2. Max dimensions: 1200x1600 (or 1600x1200 based on orientation)
      const MAX_W = 1200, MAX_H = 1600;
      let { width, height } = imageData;

      if (width > height) {
         if (width > MAX_H || height > MAX_W) {
            const ratio = Math.min(MAX_H / width, MAX_W / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
         }
      } else {
         if (width > MAX_W || height > MAX_H) {
            const ratio = Math.min(MAX_W / width, MAX_H / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
         }
      }

      let resizedImageData = imageData;
      if (width !== imageData.width || height !== imageData.height) {
        resizedImageData = await resize(imageData, { width, height });
      }

      // 3. Binary Search Loop: Guarantee strictly <= 180KB, target 120-180KB
      let minQ = 5, maxQ = 90, quality = 70;
      let bestBuffer: ArrayBuffer | null = null;
      let bestSizeKB = 0;

      for (let i = 0; i < 8; i++) {
         let rawBuffer = await encodeJpeg(resizedImageData, { quality });
         let sizeKB = rawBuffer.byteLength / 1024;

         if (sizeKB >= 120 && sizeKB <= 180) {
             bestBuffer = rawBuffer; 
             break;
         }

         if (sizeKB < 180) {
             if (!bestBuffer || sizeKB > bestSizeKB) {
                 bestBuffer = rawBuffer;
                 bestSizeKB = sizeKB;
             }
             minQ = quality + 1; 
         } else {
             maxQ = quality - 1; 
         }

         quality = Math.floor((minQ + maxQ) / 2);
         if (minQ > maxQ) break;
      }

      if (!bestBuffer) {
         bestBuffer = await encodeJpeg(resizedImageData, { quality: 15 });
      }

      const blob = new Blob([bestBuffer], { type: 'image/jpeg' });
      return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
    } catch (e) {
      console.error("Compression failed, uploading original:", e);
      return file; 
    }
  };

  // --- Process and Upload ---
  const handleSubmit = async (statusToSave: "completed" | "finalized") => {
    const noPhotos = beforePhotos.length === 0 && afterPhotos.length === 0;
    if (noPhotos && !isChecklistDone) {
      if (!window.confirm("No photos uploaded and checklist not marked. Submit anyway?")) return;
    }

    setSubmitting(true);
    setSubmitType(statusToSave);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const allFiles = [...beforePhotos, ...afterPhotos, ...damagedPhotos, ...lostFoundPhotos].filter(p => typeof p !== 'string') as File[];
      const totalFiles = allFiles.length;
      let processedCount = 0;

      const sigParams = totalFiles > 0 ? await getWorkPhotoUploadSignature() : null;

      const processAndUpload = async (photos: (File | string)[]) => {
        const urls: string[] = [];
        for (const p of photos) {
          if (typeof p === 'string') {
            urls.push(p);
          } else {
            const finalFileToUpload = await compressImageJSquash(p);

            const formData = new FormData();
            formData.append("file", finalFileToUpload);
            formData.append("api_key", sigParams!.apiKey!);
            formData.append("timestamp", sigParams!.timestamp.toString());
            formData.append("signature", sigParams!.signature);
            formData.append("folder", "work-photos");

            const res = await fetch(`https://api.cloudinary.com/v1_1/${sigParams!.cloudName}/image/upload`, { method: "POST", body: formData });
            const data = await res.json();
            urls.push(data.secure_url);

            processedCount++;
            setUploadProgress(Math.round((processedCount / totalFiles) * 100));
          }
        }
        return urls;
      };

      if (totalFiles === 0) setUploadProgress(100);

      const uploadedBefore = await processAndUpload(beforePhotos);
      const uploadedAfter = await processAndUpload(afterPhotos);
      const uploadedDamaged = await processAndUpload(damagedPhotos);
      const uploadedLostFound = await processAndUpload(lostFoundPhotos);

      const startDT = startTime ? `${selectedDate}T${startTime}:00` : new Date().toISOString();
      const endDT = endTime ? `${selectedDate}T${endTime}:00` : new Date().toISOString();

      // 1. Insert/Update Work Logs
      const logPayload = {
        booking_id: parseInt(bookingId),
        team_id: selectedTeam ? parseInt(selectedTeam) : null,
        start_time: startDT,
        end_time: endDT,
        before_photos: uploadedBefore,
        photo_urls: uploadedAfter,
        damaged_items: (uploadedDamaged.length > 0 || damagedRemarks) ? { photos: uploadedDamaged, remarks: damagedRemarks } : null,
        lost_found_items: (uploadedLostFound.length > 0 || lostFoundRemarks) ? { photos: uploadedLostFound, remarks: lostFoundRemarks } : null,
      };

      if (isEditMode) {
        const { error: editErr } = await supabase.from('work_logs').update({
          ...logPayload, edited_by: user?.id, edited_at: new Date().toISOString()
        }).eq('booking_id', bookingId);
        if (editErr) throw editErr;
      } else {
        const { error: insertErr } = await supabase.from('work_logs').insert({ 
          ...logPayload, submitted_by: user?.id 
        });
        if (insertErr) throw insertErr;
      }

      // 2. Update Bookings Status
      const { error: bookErr } = await supabase.from('bookings').update({
        assigned_team_id: selectedTeam ? parseInt(selectedTeam) : null,
        cleaning_date: selectedDate,
        work_status: 'work_done',
        status: statusToSave
      }).eq('id', bookingId);
      if (bookErr) throw bookErr;

      // 3. Insert Inventory Logs (100% matched with Schema, no remarks)
      if (equipmentData.length > 0) {
        await supabase.from('booking_inventory_logs').delete().eq('booking_id', bookingId);

        const invPayload = equipmentData.map(item => {
          const base = item.base_provide ?? item.standard_qty ?? 0;
          const extra = item.extra_provide ?? 0;
          const finalProv = base + extra;

          // Target is 0 for consumables
          const target = item.item_type !== 'consumable' ? (item.target_collect ?? 0) : 0;
          const coll = item.collected ?? 0;

          return {
            booking_id: parseInt(bookingId),
            unit_id: booking?.units?.id,
            equipment_id: item.equipment_id,
            base_provide_qty: base,
            extra_provided_qty: extra,
            final_provided_qty: finalProv,
            target_collect_qty: target,
            collected_qty: coll,
            shortage_qty: Math.max(0, target - coll),
            qc_status: item.item_type === 'returnable' ? 'pending' : 'completed'
            // 'remarks' has been removed as per strict instructions
          };
        });

        const { error: invErr } = await supabase.from('booking_inventory_logs').insert(invPayload);
        if (invErr) throw invErr;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Submission error:", error);
      alert("Error submitting data: " + error.message);
      setSubmitting(false);
      setSubmitType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {isEditMode ? "Edit Duty Log" : "Manage Duty"}
            </h2>
            <p className="text-sm text-gray-500 font-bold mt-1">
              Unit {booking?.units?.unit_number} • {booking?.units?.companies?.name}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 rounded-full text-gray-600 transition shadow-sm">
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Body (Responsive Grid: 2 cols on lg, 1 col on mobile) */}
        <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-bold text-lg uppercase tracking-widest">Loading details...</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">

              {/* --- LEFT COLUMN: Settings, Checklist, Equipment --- */}
              <div className="flex-1 space-y-6">
                {/* Schedule & Team Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-blue-50/40 p-5 md:p-6 rounded-2xl border border-blue-100 shadow-sm">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest"><Calendar size={14} className="inline mr-1"/> Shift Date</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-blue-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 font-black shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest"><Users size={14} className="inline mr-1"/> Assigned Team</label>
                    <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-blue-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 font-black shadow-sm transition-all cursor-pointer">
                      <option value="" className="text-gray-400">Unassigned</option>
                      {teams.length === 0 && <option disabled>No teams found for this date</option>}
                      {teams.map(t => (
                        <option key={t.id} value={t.id} className="font-bold">
                          {t.team_name} ({t.status})
                        </option>
                      ))}
                    </select>
                    {selectedTeam && (() => {
                      const team = teams.find(t => t.id.toString() === selectedTeam);
                      return team?.membersStr ? (
                        <p className="mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                          👥 {team.membersStr}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest"><Clock size={14} className="inline mr-1"/> Start Time</label>
                    <input type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-blue-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 font-black shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest"><Clock size={14} className="inline mr-1"/> End Time</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-blue-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-gray-900 font-black shadow-sm transition-all" />
                  </div>
                </div>

                {/* Checklist Panel */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowChecklist(!showChecklist)}>
                    <div className="flex items-center gap-2 font-black text-gray-800 text-lg">
                      <CheckCircle2 size={22} className="text-emerald-500" /> Task Checklist
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); setIsChecklistDone(!isChecklistDone); }}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm ${isChecklistDone ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                        {isChecklistDone && <CheckCircle2 size={16}/>} {isChecklistDone ? "All Done" : "Mark All Done"}
                      </button>
                      {showChecklist ? <ChevronUp size={22} className="text-gray-400"/> : <ChevronDown size={22} className="text-gray-400"/>}
                    </div>
                  </div>
                  <motion.div 
                    initial={false} 
                    animate={{ height: showChecklist ? 'auto' : 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="p-5 text-sm font-bold text-gray-500 bg-white border-t border-gray-100">
                      (Admin Mode) Checking the button above marks all tasks as completed for this log. No need to check individually.
                    </div>
                  </motion.div>
                </div>

                {/* Equipment Tracker Panel (ALWAYS MOUNTED FOR DATA PERSISTENCE) */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowEquipment(!showEquipment)}>
                    <div className="flex items-center gap-2 font-black text-gray-800 text-lg">
                      <ShieldCheck size={22} className="text-indigo-500" /> Equipment Tracker
                    </div>
                    {showEquipment ? <ChevronUp size={22} className="text-gray-400"/> : <ChevronDown size={22} className="text-gray-400"/>}
                  </div>

                  <motion.div 
                    initial={false} 
                    animate={{ height: showEquipment ? 'auto' : 0 }} 
                    className="overflow-hidden bg-white"
                  >
                    <div className="p-5 border-t border-gray-100">
                      {booking?.units?.id ? (
                        <EquipmentTracker bookingId={bookingId} unitId={booking.units.id} onDataChange={setEquipmentData} />
                      ) : (
                        <p className="text-sm font-bold text-red-600 py-4 text-center bg-red-50 rounded-xl">Unit information missing.</p>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* --- RIGHT COLUMN: Media & Evidence (Drag & Drop) --- */}
              <div className="flex-1 space-y-6">
                <div className="bg-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                  <h3 className="font-black text-gray-900 flex items-center gap-2 border-b border-gray-200 pb-3 text-lg"><Camera size={22} className="text-blue-500"/> Photo Evidence</h3>
                  <DragDropPhotoSection title="Before Work Photos" photos={beforePhotos} setPhotos={setBeforePhotos} />
                  <div className="h-px bg-gray-200" />
                  <DragDropPhotoSection title="After Work Photos" photos={afterPhotos} setPhotos={setAfterPhotos} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm space-y-4">
                    <h4 className="font-black text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Damaged Items</h4>
                    <textarea placeholder="Enter remarks..." value={damagedRemarks} onChange={e => setDamagedRemarks(e.target.value)} rows={2}
                      className="w-full p-3.5 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 font-black bg-white resize-none shadow-sm" />
                    <DragDropPhotoSection minimal title="" photos={damagedPhotos} setPhotos={setDamagedPhotos} />
                  </div>
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm space-y-4">
                    <h4 className="font-black text-amber-800 flex items-center gap-2"><Package size={18}/> Lost & Found</h4>
                    <textarea placeholder="Enter remarks..." value={lostFoundRemarks} onChange={e => setLostFoundRemarks(e.target.value)} rows={2}
                      className="w-full p-3.5 rounded-xl border border-amber-200 text-sm outline-none focus:border-amber-400 font-black bg-white resize-none shadow-sm" />
                    <DragDropPhotoSection minimal title="" photos={lostFoundPhotos} setPhotos={setLostFoundPhotos} />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer with Progress Bar & Buttons */}
        <div className="p-6 md:px-8 border-t border-gray-100 bg-white shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => handleSubmit("completed")} disabled={loading || submitting}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black rounded-2xl shadow-xl transition-all disabled:opacity-80 flex flex-col items-center justify-center overflow-hidden relative"
            >
              {submitting && submitType === "completed" ? (
                <div className="w-full px-8 relative z-10 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-white" size={24} />
                    <span className="text-lg tracking-wide">Processing... {uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mt-1 shadow-inner">
                    <div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-lg tracking-wide">
                  <CheckCircle2 size={24}/> {isEditMode ? "Save as Completed" : "Submit as Completed"}
                </div>
              )}
            </button>

            <button 
              onClick={() => handleSubmit("finalized")} disabled={loading || submitting}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all disabled:opacity-80 flex flex-col items-center justify-center overflow-hidden relative"
            >
              {submitting && submitType === "finalized" ? (
                <div className="w-full px-8 relative z-10 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-white" size={24} />
                    <span className="text-lg tracking-wide">Processing... {uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mt-1 shadow-inner">
                    <div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-lg tracking-wide">
                  <UploadCloud size={24}/> {isEditMode ? "Save as Finalized" : "Submit as Finalized"}
                </div>
              )}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

// --- Helper Component: Drag & Drop Photo Grid (Shows 4 default) ---
function DragDropPhotoSection({ title, photos, setPhotos, minimal = false }: any) {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const displayPhotos = expanded ? photos : photos.slice(0, 4);
  const hiddenCount = photos.length - 4;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPhotos((prev: any) => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  return (
    <div className={minimal ? "" : "space-y-3"}>
      {!minimal && <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</h4>}

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        className={`flex flex-wrap gap-3 p-4 rounded-2xl border-2 transition-all min-h-[120px] items-center ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-dashed border-gray-200 bg-white'}`}
      >
        {displayPhotos.map((p: any, i: number) => {
          const src = typeof p === 'string' ? p : URL.createObjectURL(p);
          return (
            <div key={i} className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
              <img 
                src={src} 
                alt="Upload" 
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                onClick={() => setLightboxIndex(i)}
              />
              <button onClick={() => setPhotos((prev: any) => prev.filter((_:any, idx:number) => idx !== i))} 
                className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-50">
                <Trash2 size={14}/>
              </button>
            </div>
          );
        })}

        {hiddenCount > 0 && !expanded && (
          <button onClick={() => setExpanded(true)} className="w-20 h-20 md:w-24 md:h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0">
            <span className="font-black text-xl">+{hiddenCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest mt-1">View All</span>
          </button>
        )}

        {expanded && photos.length > 4 && (
          <button onClick={() => setExpanded(false)} className="w-20 h-20 md:w-24 md:h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0">
            <Eye size={20} className="mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Show Less</span>
          </button>
        )}

        <label className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 cursor-pointer hover:bg-blue-50 transition bg-white shadow-sm shrink-0">
          <UploadCloud size={24} className="mb-1" />
          <span className="text-[9px] font-black uppercase tracking-widest">Add Files</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
             if (e.target.files) setPhotos((prev: any) => [...prev, ...Array.from(e.target.files!)]);
          }} />
        </label>

        {photos.length === 0 && !isDragging && (
          <span className="text-xs font-bold text-gray-400 ml-2 hidden md:inline">Drag & Drop images here</span>
        )}
        {isDragging && <span className="text-sm font-black text-blue-500 ml-2">Drop it like it's hot! 🔥</span>}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox 
          photos={photos.map((p: any) => typeof p === 'string' ? p : URL.createObjectURL(p))} 
          startIndex={lightboxIndex} 
          onClose={() => setLightboxIndex(null)} 
        />
      )}
    </div>
  );
}