'use client';
import { motion } from 'framer-motion';
import {
  Check, X, Loader2, Building2, Search,
  Hash, Calendar, Tag, Circle, CheckCircle2, Zap, Clock,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────
export type Booking = {
  id: number;
  assigned_team_id: number | null;
  status: string;
  created_at: string;
  cleaning_date?: string;
  cleaning_time?: string; // 🚨 Added
  service_type?: string;  // 🚨 Added
  units?: {
    unit_number: string;
    layout?: string;
    companies?: { name: string } | null;
  } | null;
  teams?: { team_name: string } | null;
};

export type Team = {
  id: number;
  team_name: string;
  member_ids: string[];
  status: string;
  created_at: string;
  updated_at: string;
  shift_date: string;
  bookings?: Booking[];
};

// ── Status Config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  pending:     { label: 'Pending',     color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   icon: <Circle size={11} /> },
  confirmed:   { label: 'Confirmed',   color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: <CheckCircle2 size={11} /> },
  completed:   { label: 'Completed',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: <Check size={11} /> },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: <X size={11} /> },
  in_progress: { label: 'In Progress', color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  icon: <Zap size={11} /> },
};

// ── Props ─────────────────────────────────────────────────────
type AssignmentPanelProps = {
  selectedTeam: Team | null;
  activeTeams: Team[];
  allBookings: Booking[];
  filteredBookings: Booking[];
  loadingBookings: boolean;
  assigningId: number | null;
  bookingSearch: string;
  bookingStatusFilter: string;
  selectedTeamId: number | null;
  onCloseAction: () => void;
  onAssignAction: (booking: Booking) => void;
  onSearchChangeAction: (val: string) => void;
  onStatusFilterChangeAction: (val: string) => void;
};

// ── Shared Booking Card ───────────────────────────────────────
function BookingCard({
  booking,
  selectedTeamId,
  activeTeams,
  assigningId,
  onAssign,
  compact = false,
}: {
  booking: Booking;
  selectedTeamId: number | null;
  activeTeams: Team[];
  assigningId: number | null;
  onAssign: (b: Booking) => void;
  compact?: boolean;
}) {
  const isAssignedToThis    = booking.assigned_team_id === selectedTeamId;
  const isAssignedElsewhere = booking.assigned_team_id !== null && booking.assigned_team_id !== selectedTeamId;
  const elseTeam            = isAssignedElsewhere ? activeTeams.find(t => t.id === booking.assigned_team_id) : null;
  const cfg                 = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG['pending'];
  const isSaving            = assigningId === booking.id;

  return (
    <motion.div
      layout
      onClick={() => !isSaving && onAssign(booking)}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all active:scale-[0.98] select-none
        ${isAssignedToThis
          ? 'border-blue-400 bg-blue-50/40 shadow-sm shadow-blue-100'
          : isAssignedElsewhere
          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
          : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Company + Unit */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm text-gray-900 truncate">
              {booking.units?.companies?.name ?? '—'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
              <Hash size={9} /> {booking.units?.unit_number ?? '—'}
            </span>
          </div>

          {/* 🚨 UPDATED: Status + TIME (instead of Date) + Service Type */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>

            {booking.cleaning_time && (
              <span className="flex items-center gap-1 text-[10px] text-gray-700 font-black bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg">
                <Clock size={10} className="text-gray-500" />
                {booking.cleaning_time.slice(0, 5)} {/* Shows 10:00 instead of 10:00:00 */}
              </span>
            )}

            {booking.service_type && (
               <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg capitalize">
                 {booking.service_type}
               </span>
            )}
          </div>

          {/* Assigned-elsewhere warning */}
          {isAssignedElsewhere && (
            <p className="text-[10px] text-amber-600 font-black mt-2 flex items-center gap-1 bg-amber-100/50 w-fit px-2 py-1 rounded">
              <Tag size={10} /> {compact ? '' : 'Currently: '}{elseTeam?.team_name ?? `Team #${booking.assigned_team_id}`}
            </p>
          )}
        </div>

        {/* Toggle indicator */}
        <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm
          ${isAssignedToThis ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 text-gray-300'}`}
        >
          {isSaving
            ? <Loader2 size={14} className="animate-spin" />
            : <Check size={15} strokeWidth={isAssignedToThis ? 3 : 2} />
          }
        </div>
      </div>
    </motion.div>
  );
}

// ── Shared Filter Bar ─────────────────────────────────────────
function FilterBar({
  bookingSearch,
  bookingStatusFilter,
  onSearchChangeAction,
  onStatusFilterChangeAction,
}: Pick<AssignmentPanelProps, 'bookingSearch' | 'bookingStatusFilter' | 'onSearchChangeAction' | 'onStatusFilterChangeAction'>) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search company or unit…"
          value={bookingSearch}
          onChange={e => onSearchChangeAction(e.target.value)}
          className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full placeholder:text-gray-400 placeholder:font-medium"
        />
      </div>
      <select
        value={bookingStatusFilter}
        onChange={e => onStatusFilterChangeAction(e.target.value)}
        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-600 outline-none cursor-pointer focus:border-blue-400"
      >
        <option value="all">All Status</option>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Booking List ──────────────────────────────────────────────
function BookingList({
  filteredBookings,
  loadingBookings,
  selectedTeamId,
  activeTeams,
  assigningId,
  onAssign,
  compact = false,
}: {
  filteredBookings: Booking[];
  loadingBookings: boolean;
  selectedTeamId: number | null;
  activeTeams: Team[];
  assigningId: number | null;
  onAssign: (b: Booking) => void;
  compact?: boolean;
}) {
  if (loadingBookings) return (
    <div className="flex justify-center py-16">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (filteredBookings.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <Building2 size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-bold text-sm text-gray-500">No bookings found</p>
      <p className="font-medium text-xs mt-1">Try adjusting your search filters.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {filteredBookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          selectedTeamId={selectedTeamId}
          activeTeams={activeTeams}
          assigningId={assigningId}
          onAssign={onAssign}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ── Main Export: AssignmentPanel ──────────────────────────────
export default function AssignmentPanel({
  selectedTeam,
  activeTeams,
  allBookings,
  filteredBookings,
  loadingBookings,
  assigningId,
  bookingSearch,
  bookingStatusFilter,
  selectedTeamId,
  onCloseAction,
  onAssignAction,
  onSearchChangeAction,
  onStatusFilterChangeAction,
}: AssignmentPanelProps) {
  const assignedCount = allBookings.filter(b => b.assigned_team_id === selectedTeamId).length;

  return (
    <>
      {/* ── DESKTOP PANEL ──────────────────────────────────── */}
      <motion.div
        key="assign-panel-desktop"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col flex-1 min-w-0 bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden sticky top-6 max-h-[calc(100vh-6rem)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-start shrink-0">
          <div>
            {/* 🚨 UPDATED: Shift Date Badge added in header */}
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Assigning to</p>
              <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200">
                <Calendar size={10} />
                {selectedTeam?.shift_date ? format(new Date(selectedTeam.shift_date), 'dd MMM yyyy') : 'Date Not Set'}
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900">{selectedTeam?.team_name}</h2>
            <p className="text-xs text-gray-500 font-bold mt-1">Click a booking to assign or unassign</p>
          </div>
          <button
            onClick={onCloseAction}
            className="p-2 bg-white hover:bg-gray-100 text-gray-400 rounded-full border border-gray-200 transition-colors shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-50 shrink-0">
          <FilterBar
            bookingSearch={bookingSearch}
            bookingStatusFilter={bookingStatusFilter}
            onSearchChangeAction={onSearchChangeAction}
            onStatusFilterChangeAction={onStatusFilterChangeAction}
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-5 bg-gray-50/30">
          <BookingList
            filteredBookings={filteredBookings}
            loadingBookings={loadingBookings}
            selectedTeamId={selectedTeamId}
            activeTeams={activeTeams}
            assigningId={assigningId}
            onAssign={onAssignAction}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <p className="text-xs text-gray-500 font-bold text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500"/> {assignedCount} booking(s) assigned to this team
          </p>
        </div>
      </motion.div>

      {/* ── MOBILE BOTTOM SHEET ────────────────────────────── */}
      <motion.div
        key="mobile-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCloseAction}
        className="md:hidden fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm"
      />

      <motion.div
        key="assign-panel-mobile"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-4 pb-2 shrink-0">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start shrink-0">
          <div>
            {/* 🚨 UPDATED: Shift Date Badge added in header */}
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Assigning to</p>
              <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200">
                <Calendar size={10} />
                {selectedTeam?.shift_date ? format(new Date(selectedTeam.shift_date), 'dd MMM yyyy') : ''}
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900">{selectedTeam?.team_name}</h2>
          </div>
          <button onClick={onCloseAction} className="p-2 bg-gray-50 border border-gray-200 rounded-full text-gray-500 mt-1">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-50 shrink-0 bg-white">
          <FilterBar
            bookingSearch={bookingSearch}
            bookingStatusFilter={bookingStatusFilter}
            onSearchChangeAction={onSearchChangeAction}
            onStatusFilterChangeAction={onStatusFilterChangeAction}
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 bg-gray-50/30">
          <BookingList
            filteredBookings={filteredBookings}
            loadingBookings={loadingBookings}
            selectedTeamId={selectedTeamId}
            activeTeams={activeTeams}
            assigningId={assigningId}
            onAssign={onAssignAction}
            compact
          />
        </div>
      </motion.div>
    </>
  );
}