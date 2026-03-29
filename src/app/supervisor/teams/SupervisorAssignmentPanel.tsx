'use client';
import { motion } from 'framer-motion';
import {
  Check, X, Loader2, Building2, Search,
  Hash, Calendar, Tag, Circle, CheckCircle2, Zap,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────
export type Booking = {
  id: number;
  booking_ref: string | null;
  assigned_team_id: number | null;
  status: string;
  created_at: string;
  cleaning_date: string | null;
  cleaning_time: string | null;
  service_type: string | null;
  units?: {
    unit_number: string | null;
    layout?: string | null;
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
export type AssignmentPanelProps = {
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

// ── Booking Card ──────────────────────────────────────────────
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
          ? 'border-indigo-400 bg-indigo-50/40 shadow-sm shadow-indigo-100'
          : isAssignedElsewhere
          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
          : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm'
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Company + Unit */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm text-slate-900 truncate">
              {booking.units?.companies?.name ?? '—'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              <Hash size={9} /> {booking.units?.unit_number ?? '—'}
            </span>
            {booking.service_type && (
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {booking.service_type}
              </span>
            )}
          </div>

          {/* Status + Date */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>
            {booking.cleaning_date && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                <Calendar size={10} />
                {format(new Date(booking.cleaning_date), compact ? 'dd MMM' : 'dd MMM yyyy')}
                {booking.cleaning_time && !compact && (
                  <span className="ml-1">{booking.cleaning_time.slice(0, 5)}</span>
                )}
              </span>
            )}
          </div>

          {/* Assigned-elsewhere warning */}
          {isAssignedElsewhere && (
            <p className="text-[10px] text-amber-600 font-black mt-1.5 flex items-center gap-1">
              <Tag size={10} /> {compact ? '' : 'Currently: '}{elseTeam?.team_name ?? `Team #${booking.assigned_team_id}`}
            </p>
          )}
        </div>

        {/* Toggle indicator */}
        <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
          ${isAssignedToThis ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-200 text-slate-300'}`}
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

// ── Filter Bar ────────────────────────────────────────────────
function FilterBar({
  bookingSearch,
  bookingStatusFilter,
  onSearchChangeAction,
  onStatusFilterChangeAction,
}: Pick<AssignmentPanelProps, 'bookingSearch' | 'bookingStatusFilter' | 'onSearchChangeAction' | 'onStatusFilterChangeAction'>) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search company or unit…"
          value={bookingSearch}
          onChange={e => onSearchChangeAction(e.target.value)}
          className="bg-transparent outline-none text-sm font-medium text-slate-700 w-full placeholder:text-slate-400"
        />
      </div>
      <select
        value={bookingStatusFilter}
        onChange={e => onStatusFilterChangeAction(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 outline-none cursor-pointer"
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
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  if (filteredBookings.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <Building2 size={40} className="mx-auto mb-3 opacity-40" />
      <p className="font-bold text-sm">No bookings found</p>
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

// ── Main Export ───────────────────────────────────────────────
export default function SupervisorAssignmentPanel({
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
        className="hidden md:flex flex-col flex-1 min-w-0 bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden sticky top-6 max-h-[calc(100vh-6rem)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white flex justify-between items-start shrink-0">
          <div>
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-1">Assigning to</p>
            <h2 className="text-xl font-black text-slate-900">{selectedTeam?.team_name}</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">Click a booking to assign or unassign</p>
          </div>
          <button
            onClick={onCloseAction}
            className="p-2 bg-white hover:bg-slate-100 text-slate-400 rounded-full border border-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-50 shrink-0">
          <FilterBar
            bookingSearch={bookingSearch}
            bookingStatusFilter={bookingStatusFilter}
            onSearchChangeAction={onSearchChangeAction}
            onStatusFilterChangeAction={onStatusFilterChangeAction}
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4">
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
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-xs text-slate-400 font-bold text-center">
            {assignedCount} booking(s) assigned to this squad
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
        className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
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
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Assigning to</p>
            <h2 className="text-lg font-black text-slate-900">{selectedTeam?.team_name}</h2>
          </div>
          <button onClick={onCloseAction} className="p-2 bg-slate-100 rounded-full text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-slate-50 shrink-0">
          <FilterBar
            bookingSearch={bookingSearch}
            bookingStatusFilter={bookingStatusFilter}
            onSearchChangeAction={onSearchChangeAction}
            onStatusFilterChangeAction={onStatusFilterChangeAction}
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4">
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