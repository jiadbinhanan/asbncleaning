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
  assigned_team_id: number | null;
  status: string;
  created_at: string;
  cleaning_date?: string;
  units?: {
    unit_number: string;
    companies?: { name: string } | null;
  } | null;
teams?: { team_name: string } | null; // 🚨 Assigned Team Name এর জন্য
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
// Note: prop names end with "Action" to satisfy Next.js 'use client' serialization rules
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
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
              <Hash size={9} /> {booking.units?.unit_number ?? '—'}
            </span>
          </div>

          {/* Status + Date */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>
            {(booking.cleaning_date ?? booking.created_at) && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                <Calendar size={10} />
                {format(new Date(booking.cleaning_date ?? booking.created_at), compact ? 'dd MMM' : 'dd MMM, h:mm a')}
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
      <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search company or unit…"
          value={bookingSearch}
          onChange={e => onSearchChangeAction(e.target.value)}
          className="bg-transparent outline-none text-sm font-medium text-gray-700 w-full placeholder:text-gray-400"
        />
      </div>
      <select
        value={bookingStatusFilter}
        onChange={e => onStatusFilterChangeAction(e.target.value)}
        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-600 outline-none cursor-pointer"
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
      <Loader2 className="animate-spin text-blue-400" size={32} />
    </div>
  );

  if (filteredBookings.length === 0) return (
    <div className="text-center py-16 text-gray-400">
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
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Assigning to</p>
            <h2 className="text-xl font-black text-gray-900">{selectedTeam?.team_name}</h2>
            <p className="text-xs text-gray-400 font-bold mt-1">Click a booking to assign or unassign</p>
          </div>
          <button
            onClick={onCloseAction}
            className="p-2 bg-white hover:bg-gray-100 text-gray-400 rounded-full border border-gray-200 transition-colors"
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
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <p className="text-xs text-gray-400 font-bold text-center">
            {assignedCount} booking(s) assigned to this team
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
        className="md:hidden fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm"
      />

      <motion.div
        key="assign-panel-mobile"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Assigning to</p>
            <h2 className="text-lg font-black text-gray-900">{selectedTeam?.team_name}</h2>
          </div>
          <button onClick={onCloseAction} className="p-2 bg-gray-100 rounded-full text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-50 shrink-0">
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