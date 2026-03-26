"use client";
import { motion } from "framer-motion";
import {
  Clock, Building2, MapPin, Users, Truck,
  PackageCheck, Loader2, CircleCheck, Hash,
} from "lucide-react";
import { BookingRow, formatTime } from "./types";

interface TaskCardProps {
  booking: BookingRow;
  section: "toDrop" | "inProgress" | "readyPickup" | "done";
  onDeliver: (id: number) => void;
  onCollect: (id: number) => void;
  actionLoading: number | null;
}

const SECTION_STYLES = {
  toDrop:      { bar: "bg-red-500",     border: "border-red-200",     bg: "bg-red-50/40" },
  inProgress:  { bar: "bg-amber-400",   border: "border-amber-200",   bg: "bg-amber-50/40" },
  readyPickup: { bar: "bg-emerald-500", border: "border-emerald-200", bg: "bg-emerald-50/30" },
  done:        { bar: "bg-gray-200",    border: "border-gray-100",    bg: "bg-gray-50/60" },
};

export default function TaskCard({ booking, section, onDeliver, onCollect, actionLoading }: TaskCardProps) {
  const isLoading = actionLoading === booking.id;
  const s = SECTION_STYLES[section];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: section === "done" ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className={`relative bg-white rounded-2xl border ${s.border} shadow-sm overflow-hidden`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 h-full w-[3px] ${s.bar}`} />

      <div className="pl-4 pr-4 pt-4 pb-3.5">
        {/* Top info */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                <Clock size={9}/> {formatTime(booking.cleaning_time)}
              </span>
              {booking.booking_ref && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-300">
                  <Hash size={9}/>{booking.booking_ref}
                </span>
              )}
            </div>
            <h3 className="font-black text-gray-900 text-[15px] leading-tight truncate">
              {booking.company_name}
            </h3>
          </div>
          {section === "done" && (
            <CircleCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-3 text-xs font-bold text-gray-400 mb-2.5">
          <span className="flex items-center gap-1">
            <Building2 size={11}/> Unit {booking.unit_number}
          </span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1 truncate">
            <MapPin size={11}/> {booking.building_name}
          </span>
        </div>

        {/* Team */}
        {booking.team_name && (
          <div className="flex items-center gap-1.5 mb-3">
            <Users size={11} className="text-gray-300"/>
            <p className="text-[11px] font-bold text-gray-400">{booking.team_name}</p>
          </div>
        )}

        {/* Action area */}
        {section === "toDrop" && (
          <button
            onClick={() => onDeliver(booking.id)}
            disabled={isLoading}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-red-500/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin"/> : <Truck size={13}/>}
            {isLoading ? "Updating..." : "Mark as Delivered"}
          </button>
        )}

        {section === "inProgress" && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"/>
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
              Cleaning in Progress
            </p>
          </div>
        )}

        {section === "readyPickup" && (
          <button
            onClick={() => onCollect(booking.id)}
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin"/> : <PackageCheck size={13}/>}
            {isLoading ? "Updating..." : "Bags Collected"}
          </button>
        )}

        {section === "done" && (
          <p className="text-xs font-black text-gray-300 text-center uppercase tracking-widest py-1">
            Completed ✓
          </p>
        )}
      </div>
    </motion.div>
  );
}