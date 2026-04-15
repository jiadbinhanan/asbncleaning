'use client';
/**
 * AdminEditLogModal
 *
 * READ FROM:
 * • bookings                     → booking info, unit, company, assigned team
 * • units                        → unit_number, building_name
 * • companies                    → name
 * • work_logs                    → existing log (photos, times, damaged/lost)
 * • booking_extra_added_charges  → extra charges list
 * • profiles                     → team member names
 * • teams                        → team list for selected date
 * (inventory data read by AdminEditEquipmentTracker child component)
 *
 * WRITES (only on BULK SAVE):
 * • bookings                     → cleaning_date, cleaning_time, assigned_team_id, price, status
 * • work_logs                    → UPDATE existing or INSERT new row
 * • booking_inventory_logs       → UPSERT per item (safe — NOT delete-all-then-insert)
 * • booking_extra_added_charges  → delete + re-insert (charges only, no ledger effect)
 *
 * NOT TOUCHED:
 * • inventory_transaction_logs   (ledger — unaffected by this admin edit)
 * • unit_inventory_balances      (not written here)
 * • checklist_data               (column removed from work_logs — not saved)
 */

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import {
  X, Clock, Camera, FileCheck, CircleDollarSign,
  Calendar, Layers, AlertTriangle, Edit3, Loader2,
  Search, Trash2, UploadCloud, Save, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import encodeJpeg from '@jsquash/jpeg/encode';
import resize from '@jsquash/resize';
import { getWorkPhotoUploadSignature } from "@/app/team/duty/[id]/actions";
import AdminEditEquipmentTracker, { InventoryItem } from "./AdminEditEquipmentTracker";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "execution" | "inventory" | "finalize";

const TABS: { key: Tab; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { key: "execution", label: "Execution Info",  icon: <FileCheck size={14} />,        activeColor: "border-blue-600 text-blue-700 bg-blue-50/60" },
  { key: "inventory", label: "Inventory",        icon: <Layers size={14} />,           activeColor: "border-indigo-600 text-indigo-700 bg-indigo-50/60" },
  { key: "finalize",  label: "Finalize & Save",  icon: <CircleDollarSign size={14} />, activeColor: "border-purple-600 text-purple-700 bg-purple-50/60" },
];

interface AdminEditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSuccess: () => void;
}

// ─── Exact 120-180KB Compression Logic (from AdminDutyModal — verbatim) ─────
const compressImageJSquash = async (file: File): Promise<File> => {
  // 1. If originally <= 180kb, do NOT compress.
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
      const rawBuffer = await encodeJpeg(resizedImageData, { quality });
      const sizeKB = rawBuffer.byteLength / 1024;

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

// ─── Duration helper ──────────────────────────────────────────────────────────
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

// ─── EditablePhotoGrid ──
function EditablePhotoGrid({ title, photos, setPhotos, minimal = false }: any) {
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

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function AdminEditLogModal({ isOpen, onClose, bookingId, onSuccess }: AdminEditLogModalProps) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<Tab>("execution");
  const [tabIndex, setTabIndex]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Core data
  const [booking, setBooking]   = useState<any>(null);
  const [workLog, setWorkLog]   = useState<any>(null);
  const [teams, setTeams]       = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Execution fields
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [startTime, setStartTime]       = useState("");
  const [endTime, setEndTime]           = useState("");

  // Photos
  const [beforePhotos, setBeforePhotos]         = useState<(File | string)[]>([]);
  const [afterPhotos, setAfterPhotos]           = useState<(File | string)[]>([]);
  const [damagedPhotos, setDamagedPhotos]       = useState<(File | string)[]>([]);
  const [damagedRemarks, setDamagedRemarks]     = useState("");
  const [lostFoundPhotos, setLostFoundPhotos]   = useState<(File | string)[]>([]);
  const [lostFoundRemarks, setLostFoundRemarks] = useState("");

  // Inventory (managed by child, state lifted here for save)
  const [equipmentData, setEquipmentData] = useState<InventoryItem[]>([]);

  // Finalize
  const [priceInput, setPriceInput]   = useState("");
  const [extraCharges, setExtraCharges] = useState<{ id: string; description: string; amount: string; charge_type: "damage" | "manual" }[]>([]);

  // Swipe
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) switchTab(diff > 0 ? Math.min(tabIndex + 1, TABS.length - 1) : Math.max(tabIndex - 0, 0));
    touchStartX.current = null;
  };
  const switchTab = (i: number) => { setTabIndex(i); setActiveTab(TABS[i].key); };

  // ─── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    fetchData();
  }, [isOpen, bookingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, logRes, chargesRes, profilesRes] = await Promise.all([
        // READ: bookings + joined tables
        supabase.from("bookings")
          .select("*, units(id, unit_number, building_name, companies(name))")
          .eq("id", bookingId).single(),
        // READ: work_logs
        supabase.from("work_logs").select("*").eq("booking_id", bookingId).maybeSingle(),
        // READ: booking_extra_added_charges
        supabase.from("booking_extra_added_charges").select("*").eq("booking_id", bookingId),
        // READ: profiles (for member names)
        supabase.from("profiles").select("id, full_name"),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);

      if (bookingRes.data) {
        const b = bookingRes.data;
        setBooking(b);
        setSelectedDate(b.cleaning_date || "");
        setSelectedTime(b.cleaning_time || "");
        setSelectedTeam(b.assigned_team_id?.toString() || "");
        setPriceInput(b.price?.toString() || "0");
      }

      if (logRes.data) {
        const log = logRes.data;
        setWorkLog(log);
        if (log.start_time) setStartTime(format(parseISO(log.start_time), "HH:mm"));
        if (log.end_time)   setEndTime(format(parseISO(log.end_time), "HH:mm"));
        setBeforePhotos(log.before_photos || []);
        setAfterPhotos(log.photo_urls || []);
        if (log.damaged_items) { setDamagedPhotos(log.damaged_items.photos || []); setDamagedRemarks(log.damaged_items.remarks || ""); }
        if (log.lost_found_items) { setLostFoundPhotos(log.lost_found_items.photos || []); setLostFoundRemarks(log.lost_found_items.remarks || ""); }
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

  // Fetch teams when date changes
  useEffect(() => {
    if (!selectedDate) return;
    supabase.from("teams").select("id, team_name, status, member_ids").eq("shift_date", selectedDate).order("status")
      .then(({ data }) => { if (data) setTeams(data); });
  }, [selectedDate]);

  // ─── BULK SAVE — SAFE UPSERT (no blind DELETE on inventory) ──────────────
  const handleBulkSave = async (statusToSave: "completed" | "finalized") => {
    setSaving(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Duty modal exact: count new files, fetch sigParams once
      const allFiles = [...beforePhotos, ...afterPhotos, ...damagedPhotos, ...lostFoundPhotos].filter(p => typeof p !== 'string') as File[];
      const totalFiles = allFiles.length;
      let processedCount = 0;

      const sigParams = totalFiles > 0 ? await getWorkPhotoUploadSignature() : null;

      // Duty modal exact: processAndUpload defined inline, uses sigParams! (non-null)
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

      const upBefore = await processAndUpload(beforePhotos);
      const upAfter  = await processAndUpload(afterPhotos);
      const upDmg    = await processAndUpload(damagedPhotos);
      const upLF     = await processAndUpload(lostFoundPhotos);

      // WRITE: bookings (assigned_team_id also updated here)
      await supabase.from("bookings").update({
        cleaning_date:    selectedDate,
        cleaning_time:    selectedTime,
        assigned_team_id: selectedTeam ? parseInt(selectedTeam) : null,
        price:            parseFloat(priceInput) || 0,
        status:           statusToSave,
      }).eq("id", bookingId);

      // WRITE: work_logs — no checklist_data (column removed)
      // team_id also updated so work_logs stays in sync with bookings.assigned_team_id
      const startDT = startTime ? `${selectedDate}T${startTime}:00` : new Date().toISOString();
      const endDT   = endTime   ? `${selectedDate}T${endTime}:00`   : new Date().toISOString();
      const logPayload = {
        start_time:      startDT,
        end_time:        endDT,
        team_id:         selectedTeam ? parseInt(selectedTeam) : null,
        before_photos:   upBefore,
        photo_urls:      upAfter,
        damaged_items:   (upDmg.length || damagedRemarks) ? { photos: upDmg, remarks: damagedRemarks } : null,
        lost_found_items:(upLF.length || lostFoundRemarks) ? { photos: upLF, remarks: lostFoundRemarks } : null,
        edited_by:       user?.id,
        edited_at:       new Date().toISOString(),
      };

      if (workLog) {
        await supabase.from("work_logs").update(logPayload).eq("id", workLog.id);
      } else {
        await supabase.from("work_logs").insert({ ...logPayload, booking_id: parseInt(bookingId), submitted_by: user?.id });
      }

      // WRITE: booking_inventory_logs — SAFE UPSERT (no blind DELETE!)
      // For rows with an existing log_id → UPDATE
      // For new rows (log_id null) → INSERT
      if (equipmentData.length > 0) {
        const toUpdate = equipmentData.filter(item => item.log_id !== null);
        const toInsert = equipmentData.filter(item => item.log_id === null);

        // Update existing rows individually
        await Promise.all(toUpdate.map(item =>
          supabase.from("booking_inventory_logs").update({
            base_provide_qty:   item.base_provide_qty,
            extra_provided_qty: item.extra_provided_qty,
            final_provided_qty: item.base_provide_qty + item.extra_provided_qty,
            collected_qty:      item.collected_qty,
            shortage_qty:       item.shortage_qty,
            target_collect_qty: item.target_collect_qty,
            remarks:            "Admin edit",
          }).eq("id", item.log_id!)
        ));

        // Insert new rows
        if (toInsert.length > 0) {
          await supabase.from("booking_inventory_logs").insert(
            toInsert.map(item => ({
              booking_id:         parseInt(bookingId),
              unit_id:            booking?.units?.id,
              equipment_id:       item.equipment_id,
              base_provide_qty:   item.base_provide_qty,
              extra_provided_qty: item.extra_provided_qty,
              final_provided_qty: item.base_provide_qty + item.extra_provided_qty,
              target_collect_qty: item.target_collect_qty,
              collected_qty:      item.collected_qty,
              shortage_qty:       item.shortage_qty,
              qc_status:          item.item_type === "returnable" ? "pending" : "completed",
              remarks:            "Admin edit",
            }))
          );
        }
      }

      // WRITE: booking_extra_added_charges — delete + re-insert (safe, no ledger link)
      await supabase.from("booking_extra_added_charges").delete().eq("booking_id", bookingId);
      const validCharges = extraCharges.filter(c => c.description.trim() && parseFloat(c.amount) > 0);
      if (validCharges.length) {
        await supabase.from("booking_extra_added_charges").insert(
          validCharges.map(c => ({
            booking_id:       parseInt(bookingId),
            charge_type:      c.charge_type,
            item_description: c.description,
            amount:           parseFloat(c.amount),
            created_by:       user?.id,
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
      setUploadProgress(null);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const profilesMap = new Map(profiles.map(p => [p.id, p.full_name || "—"]));
  const companyName = Array.isArray(booking?.units?.companies)
    ? booking?.units?.companies[0]?.name
    : booking?.units?.companies?.name;
  const extraChargesTotal = extraCharges.filter(c => parseFloat(c.amount) > 0).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const duration = calcDuration(startTime, endTime);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 18 }}
        transition={{ duration: 0.2 }}
        className="w-full bg-white rounded-[1.75rem] shadow-2xl flex flex-col overflow-hidden"
        style={{
          // Responsive: tall on small screens, wide on large
          maxWidth: "min(95vw, 1100px)",
          height: "min(95vh, 900px)",
        }}
      >
        {/* ─── HEADER ─── */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white shrink-0">
          <div className="px-5 md:px-8 pt-4 pb-3 flex justify-between items-center">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                <Edit3 size={11} /> Admin Edit Mode
              </p>
              <h2 className="text-lg md:text-xl font-black tracking-tight leading-tight truncate">
                Unit {booking?.units?.unit_number || "—"}
                {companyName && <span className="ml-2 text-xs font-bold text-white/60 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">{companyName}</span>}
                {booking?.booking_ref && <span className="ml-2 text-xs font-bold text-blue-300/70">#{booking.booking_ref}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Save buttons in header */}
              <div className="hidden sm:flex items-center gap-2 mr-2 pr-2 border-r border-white/20">
                <button onClick={() => handleBulkSave("completed")} disabled={saving || loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500/80 hover:bg-green-500 border border-white/20 rounded-xl text-white font-black text-xs uppercase tracking-wide transition disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Completed
                </button>
                <button onClick={() => handleBulkSave("finalized")} disabled={saving || loading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/80 hover:bg-purple-500 border border-white/20 rounded-xl text-white font-black text-xs uppercase tracking-wide transition disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Finalized
                </button>
              </div>
              <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full text-white/70 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <div className="px-5 md:px-8 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex-1 bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-white h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{uploadProgress}%</span>
              </div>
              <p className="text-[9px] text-blue-200/60 font-bold mt-0.5">Uploading & compressing photos…</p>
            </div>
          )}
        </div>

        {/* ─── TABS ─── */}
        <div className="flex bg-white border-b border-gray-100 shrink-0 overflow-x-auto scrollbar-none">
          {TABS.map((tab, i) => (
            <button key={tab.key} onClick={() => switchTab(i)}
              className={`flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-black transition-all border-b-2 whitespace-nowrap flex-1
                ${activeTab === tab.key ? tab.activeColor : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
              {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── CONTENT ─── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F4F7FA] overscroll-contain"
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Loader2 className="animate-spin" size={34} />
              <p className="font-black text-sm uppercase tracking-widest">Loading…</p>
            </div>
          ) : (
            <div className="p-4 md:p-6">

              {/* ═══ EXECUTION ═══ */}
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
                          return <option key={t.id} value={t.id}>{t.team_name}{names.length ? ` (${names.join(", ")})` : ""}</option>;
                        })}
                      </select>
                      {selectedTeam && (() => {
                        const team = teams.find(t => t.id.toString() === selectedTeam);
                        const names = (team?.member_ids || []).map((uid: string) => profilesMap.get(uid)).filter(Boolean);
                        return names.length ? <p className="mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100">👥 {names.join(" · ")}</p> : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Timings */}
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
                      <div className={`p-3 rounded-xl border text-sm font-black text-center ${duration ? "bg-green-50 border-green-200 text-green-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                        {duration ? `⏱ ${duration}` : "— set times"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-black text-gray-900 border-b border-gray-100 pb-2.5 flex items-center gap-2 text-sm">
                    <Camera size={15} className="text-emerald-500" /> Media & Evidence
                    <span className="ml-auto text-[9px] font-bold text-gray-400 normal-case">Upload only JPG, PNG, JPEG images</span>
                  </h3>
                  <EditablePhotoGrid title="Before Photos" photos={beforePhotos} setPhotos={setBeforePhotos} />
                  <div className="h-px bg-gray-100" />
                  <EditablePhotoGrid title="After Photos" photos={afterPhotos} setPhotos={setAfterPhotos} />
                </div>

                {/* Damage & Lost */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm space-y-3">
                    <h3 className="font-black text-red-800 flex items-center gap-2 text-sm"><AlertTriangle size={15} /> Damaged Items</h3>
                    <textarea placeholder="Damage details…" value={damagedRemarks} onChange={e => setDamagedRemarks(e.target.value)} rows={2}
                      className="w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-bold text-gray-900 text-sm resize-none transition-all" />
                    <EditablePhotoGrid title="" minimal photos={damagedPhotos} setPhotos={setDamagedPhotos} />
                  </div>
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm space-y-3">
                    <h3 className="font-black text-amber-800 flex items-center gap-2 text-sm"><Search size={15} /> Lost & Found</h3>
                    <textarea placeholder="Lost/Found details…" value={lostFoundRemarks} onChange={e => setLostFoundRemarks(e.target.value)} rows={2}
                      className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 font-bold text-gray-900 text-sm resize-none transition-all" />
                    <EditablePhotoGrid title="" minimal photos={lostFoundPhotos} setPhotos={setLostFoundPhotos} />
                  </div>
                </div>
              </div>

              {/* ═══ INVENTORY (always mounted) ═══ */}
              <div className={activeTab === "inventory" ? "block" : "hidden"}>
                <div className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm">
                  {booking?.units?.id ? (
                    <AdminEditEquipmentTracker bookingId={bookingId} unitId={booking.units.id} onDataChange={setEquipmentData} />
                  ) : (
                    <p className="text-center font-black text-red-500 py-10 text-sm">Unit info missing.</p>
                  )}
                </div>
              </div>

              {/* ═══ FINALIZE ═══ */}
              <div className={activeTab === "finalize" ? "block space-y-4" : "hidden"}>

                {/* Pricing */}
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

                {/* Extra Charges */}
                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 shadow-sm">
                  <h3 className="font-black text-orange-800 border-b border-orange-200 pb-2.5 mb-4 flex items-center gap-2 text-sm">
                    <AlertTriangle size={15} /> Manual Extra Charges
                  </h3>
                  <div className="space-y-2.5">
                    {extraCharges.map((charge, idx) => (
                      <div key={charge.id} className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 rounded-2xl bg-white border border-orange-200 shadow-sm">
                        <input type="text" value={charge.description}
                          onChange={e => setExtraCharges(prev => prev.map((c, i) => i === idx ? { ...c, description: e.target.value } : c))}
                          placeholder="Charge description…"
                          className="w-full sm:flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-black text-gray-900 focus:border-orange-400 transition-colors" />
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 w-full sm:w-28 transition-colors">
                            <span className="text-xs font-black text-gray-400">AED</span>
                            <input type="number" value={charge.amount}
                              onChange={e => setExtraCharges(prev => prev.map((c, i) => i === idx ? { ...c, amount: e.target.value } : c))}
                              placeholder="0.00" className="flex-1 outline-none text-sm font-black text-gray-900 bg-transparent" />
                          </div>
                          <button onClick={() => setExtraCharges(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setExtraCharges(prev => [...prev, { id: crypto.randomUUID(), charge_type: "manual", description: "", amount: "" }])}
                      className="w-full py-3.5 border-2 border-dashed border-orange-300 rounded-2xl text-sm font-black text-orange-600 hover:bg-orange-100 hover:border-orange-400 transition-all flex items-center justify-center gap-2">
                      + Add Extra Charge
                    </button>
                  </div>
                </div>

                {/* Save buttons */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => handleBulkSave("completed")} disabled={saving}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-green-500/25 transition-all flex justify-center items-center gap-3 disabled:opacity-70">
                      {saving ? <><Loader2 className="animate-spin" size={22} /> Saving… {uploadProgress !== null ? `${uploadProgress}%` : ""}</> : <><FileCheck size={22} /> SAVE AS COMPLETED</>}
                    </button>
                    <button onClick={() => handleBulkSave("finalized")} disabled={saving}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-indigo-500/25 transition-all flex justify-center items-center gap-3 disabled:opacity-70">
                      {saving ? <><Loader2 className="animate-spin" size={22} /> Saving… {uploadProgress !== null ? `${uploadProgress}%` : ""}</> : <><Save size={22} /> SAVE AS FINALIZED</>}
                    </button>
                  </div>
                  <p className="text-center text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-widest">
                    Saves Execution · Inventory · Pricing together
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}