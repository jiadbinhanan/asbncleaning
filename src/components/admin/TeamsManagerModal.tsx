'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useModalStore } from '@/store/modalStore';
import {
  X, Users, UserPlus, Archive, Check, User, Briefcase,
  Loader2, Edit, Clock, CalendarDays, Filter, ArrowLeftRight,
  ChevronLeft, ChevronRight, Search, Plus,
} from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import AssignmentPanel, { type Booking, type Team } from '@/app/admin/teams/AssignmentPanel';

type Agent = {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
};

// ── Framer variants — use 'as const' on type literals to fix TS error ─────────
const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};

const modalVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.97, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.97, y: 16 },
};

const formVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.96, y: 12 },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function TeamsManagerModal() {
  const supabase = createClient();
  const { isTeamsModalOpen, closeTeamsModal } = useModalStore();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [agents, setAgents]               = useState<Agent[]>([]);
  const [activeTeams, setActiveTeams]     = useState<Team[]>([]);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  const [allBookings, setAllBookings]     = useState<Booking[]>([]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const [loadingActive, setLoadingActive]     = useState(true);
  const [loadingArchive, setLoadingArchive]   = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [assigningId, setAssigningId]         = useState<number | null>(null);
  const [submitting, setSubmitting]           = useState(false);

  // ── Tabs & Filters ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]             = useState<'active' | 'archived'>('active');
  const [archiveDate, setArchiveDate]         = useState<string>('');
  const [activeDateFilter, setActiveDateFilter] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // ── Assignment Panel ──────────────────────────────────────────────────────
  const [selectedTeamId, setSelectedTeamId]           = useState<number | null>(null);
  const [bookingSearch, setBookingSearch]               = useState('');
  const [bookingStatusFilter, setBookingStatusFilter]   = useState<string>('all');

  // ── Form (create / edit) ──────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen]           = useState(false);
  const [formMode, setFormMode]               = useState<'create' | 'edit'>('create');
  const [editingTeamId, setEditingTeamId]     = useState<number | null>(null);
  const [teamName, setTeamName]               = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [shiftDateInput, setShiftDateInput]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [agentSearch, setAgentSearch]         = useState('');

  // ── Derived ───────────────────────────────────────────────────────────────
  const isPanelOpen  = selectedTeamId !== null;
  const selectedTeam = activeTeams.find(t => t.id === selectedTeamId) ?? null;

  const filteredBookings = useMemo(() =>
    allBookings.filter(b => {
      const q = bookingSearch.toLowerCase();
      const matchSearch =
        !q ||
        b.units?.companies?.name?.toLowerCase().includes(q) ||
        b.units?.unit_number?.toLowerCase().includes(q);
      const matchStatus =
        bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
      return matchSearch && matchStatus;
    }),
  [allBookings, bookingSearch, bookingStatusFilter]);

  const filteredAgentsForForm = useMemo(() =>
    agents.filter(a =>
      !agentSearch ||
      (a.full_name ?? a.username).toLowerCase().includes(agentSearch.toLowerCase())
    ),
  [agents, agentSearch]);

  // grouped active
  const groupedActiveTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    if (activeTab !== 'active') return groups;
    activeTeams.forEach(t => {
      const d = t.shift_date || '1970-01-01';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });
    return groups;
  }, [activeTeams, activeTab]);

  const sortedActiveDates = Object.keys(groupedActiveTeams).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // grouped archived
  const groupedArchivedTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    if (activeTab !== 'archived') return groups;
    archivedTeams.forEach(t => {
      const d = t.shift_date || '1970-01-01';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });
    return groups;
  }, [archivedTeams, activeTab]);

  const sortedArchivedDates = Object.keys(groupedArchivedTeams).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // ── FETCH 1: Agents + Active Teams ────────────────────────────────────────
  useEffect(() => {
    if (!isTeamsModalOpen) return;

    const go = async () => {
      setLoadingActive(true);

      if (agents.length === 0) {
        const { data: agentsData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('role', 'agent');
        if (agentsData) setAgents(agentsData);
      }

      let query = supabase
        .from('teams')
        .select('*, bookings(id, assigned_team_id, status, created_at, cleaning_date, units(unit_number, companies(name)))')
        .eq('status', 'active')
        .order('shift_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (activeDateFilter !== 'all') {
        query = query.eq('shift_date', activeDateFilter);
      }

      const { data } = await query;
      if (data) setActiveTeams(data as unknown as Team[]);
      setLoadingActive(false);
    };

    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeamsModalOpen, activeDateFilter]);

  // ── FETCH 2: Bookings for Assignment Panel ────────────────────────────────
  useEffect(() => {
    if (!isPanelOpen || !selectedTeam) return;

    const go = async () => {
      setLoadingBookings(true);
      const targetDate = selectedTeam.shift_date;

      const { data } = await supabase
        .from('bookings')
        .select('id, booking_ref, assigned_team_id, status, created_at, cleaning_date, cleaning_time, service_type, units(unit_number, layout, companies(name)), teams(team_name)')
        .eq('cleaning_date', targetDate)
        .order('cleaning_time', { ascending: true });

      if (data) setAllBookings(data as unknown as Booking[]);
      setLoadingBookings(false);
    };

    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanelOpen, selectedTeam?.id, selectedTeam?.shift_date]);

  // ── FETCH 3: Archived Teams ───────────────────────────────────────────────
  useEffect(() => {
    if (!isTeamsModalOpen || activeTab !== 'archived') return;
    if (!archiveDate && archivedTeams.length > 0) return;

    const go = async () => {
      setLoadingArchive(true);
      let query = supabase
        .from('teams')
        .select('*, bookings(id, assigned_team_id, status, created_at, cleaning_date, units(unit_number, companies(name)))')
        .eq('status', 'archived')
        .order('shift_date', { ascending: false })
        .order('created_at', { ascending: false });

      query = archiveDate ? query.eq('shift_date', archiveDate) : query.limit(30);

      const { data } = await query;
      if (data) setArchivedTeams(data as unknown as Team[]);
      setLoadingArchive(false);
    };

    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeamsModalOpen, activeTab, archiveDate, archivedTeams.length]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openAssignPanel = useCallback((teamId: number) => {
    setSelectedTeamId(prev => (prev === teamId ? null : teamId));
    setBookingSearch('');
    setBookingStatusFilter('all');
  }, []);

  const closeAssignPanel = useCallback(() => setSelectedTeamId(null), []);

  const handleAssignBooking = useCallback(async (booking: Booking) => {
    if (!selectedTeamId) return;
    const newTeamId = booking.assigned_team_id === selectedTeamId ? null : selectedTeamId;
    setAssigningId(booking.id);

    const { error } = await supabase
      .from('bookings')
      .update({ assigned_team_id: newTeamId })
      .eq('id', booking.id);

    if (!error) {
      setAllBookings(prev =>
        prev.map(b => b.id === booking.id ? { ...b, assigned_team_id: newTeamId } : b)
      );
      setActiveTeams(prev =>
        prev.map(team => {
          if (team.id === selectedTeamId) {
            const existing = team.bookings ?? [];
            if (newTeamId === null)
              return { ...team, bookings: existing.filter(b => b.id !== booking.id) };
            return existing.some(b => b.id === booking.id)
              ? team
              : { ...team, bookings: [...existing, { ...booking, assigned_team_id: newTeamId }] };
          }
          if (team.id === booking.assigned_team_id && booking.assigned_team_id !== null) {
            return { ...team, bookings: (team.bookings ?? []).filter(b => b.id !== booking.id) };
          }
          return team;
        })
      );
    }
    setAssigningId(null);
  }, [selectedTeamId, supabase]);

  const handleArchiveTeam = async (id: number) => {
    if (!confirm('Archive this team? It will be marked as closed.')) return;
    const teamToArchive = activeTeams.find(t => t.id === id);
    setActiveTeams(prev => prev.filter(t => t.id !== id));
    if (teamToArchive)
      setArchivedTeams(prev => [{ ...teamToArchive, status: 'archived', updated_at: new Date().toISOString() }, ...prev]);
    if (selectedTeamId === id) closeAssignPanel();
    await supabase.from('teams').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id);
  };

  const openCreateModal = () => {
    setFormMode('create');
    setEditingTeamId(null);
    setTeamName('');
    setSelectedAgentIds([]);
    setAgentSearch('');
    setShiftDateInput(activeDateFilter === 'all' ? format(new Date(), 'yyyy-MM-dd') : activeDateFilter);
    setIsFormOpen(true);
  };

  const openEditModal = (team: Team) => {
    setFormMode('edit');
    setEditingTeamId(team.id);
    setTeamName(team.team_name);
    setSelectedAgentIds(team.member_ids ?? []);
    setShiftDateInput(team.shift_date || format(new Date(), 'yyyy-MM-dd'));
    setAgentSearch('');
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!teamName || selectedAgentIds.length === 0 || !shiftDateInput) return;
    setSubmitting(true);
    const timestamp = new Date().toISOString();

    if (formMode === 'create') {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ team_name: teamName, member_ids: selectedAgentIds, status: 'active', shift_date: shiftDateInput, updated_at: timestamp }])
        .select('*, bookings(id, assigned_team_id, status, created_at, cleaning_date, units(unit_number, companies(name)))');

      if (!error && data) {
        if (activeDateFilter === 'all' || activeDateFilter === shiftDateInput)
          setActiveTeams(prev => [data[0] as unknown as Team, ...prev]);
        setIsFormOpen(false);
      }
    } else if (formMode === 'edit' && editingTeamId) {
      const { error } = await supabase
        .from('teams')
        .update({ team_name: teamName, member_ids: selectedAgentIds, shift_date: shiftDateInput, updated_at: timestamp })
        .eq('id', editingTeamId);

      if (!error) {
        if (activeDateFilter !== 'all' && activeDateFilter !== shiftDateInput) {
          setActiveTeams(prev => prev.filter(t => t.id !== editingTeamId));
        } else {
          setActiveTeams(prev =>
            prev.map(t =>
              t.id === editingTeamId
                ? { ...t, team_name: teamName, member_ids: selectedAgentIds, shift_date: shiftDateInput, updated_at: timestamp }
                : t
            )
          );
        }
        setIsFormOpen(false);
      }
    }
    setSubmitting(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  const isLoading = activeTab === 'active' ? loadingActive : loadingArchive;
  const displayTeams = activeTab === 'active' ? activeTeams : archivedTeams;

  const getFormatDateLabel = (dateStr: string) => {
    if (dateStr === 'all') return 'All Dates';
    const d = parseISO(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dTime = d.getTime();
    if (dTime === today.getTime())            return `Today (${format(d, 'd MMM')})`;
    if (dTime === today.getTime() - 86400000) return `Yesterday (${format(d, 'd MMM')})`;
    if (dTime === today.getTime() + 86400000) return `Tomorrow (${format(d, 'd MMM')})`;
    return format(d, 'EEE, d MMM yyyy');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isTeamsModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">

          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={{ duration: 0.2 }}
            onClick={closeTeamsModal}
            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
          />

          {/* Modal shell */}
          <motion.div
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={{ type: 'spring' as const, stiffness: 320, damping: 28 }}
            className="relative w-full sm:max-w-6xl bg-[#F8FAFC] rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
            style={{ height: '94vh' }}
          >

            {/* ══ HEADER ══════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-br from-[#0A192F] via-[#112240] to-black text-white px-6 pt-7 pb-6 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

              {/* Top row */}
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                    <Briefcase size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Team Directory</h2>
                    <p className="text-blue-300/80 text-xs font-semibold mt-0.5">
                      Manage shift squads and agent allocations
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeTab === 'active' && (
                    <button
                      onClick={openCreateModal}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/30"
                    >
                      <UserPlus size={13} /> Add Squad
                    </button>
                  )}
                  <button
                    onClick={closeTeamsModal}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 flex items-center justify-center transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="relative mt-4 flex items-center gap-1 bg-white/10 p-1 rounded-xl w-fit">
                {(['active', 'archived'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); closeAssignPanel(); }}
                    className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${
                      activeTab === tab
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-blue-200/70 hover:text-white'
                    }`}
                  >
                    {tab === 'active' ? 'Active Roster' : 'Archive History'}
                  </button>
                ))}
              </div>

              {/* Active date navigator */}
              {activeTab === 'active' && (
                <div className="relative mt-4 flex items-center gap-2">
                  {/* All */}
                  <button
                    onClick={() => setActiveDateFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                      activeDateFilter === 'all'
                        ? 'bg-blue-500/30 border-blue-400/40 text-blue-200'
                        : 'bg-white/10 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    All Upcoming
                  </button>
                  <div className="w-px h-5 bg-white/15" />

                  <button
                    onClick={() => {
                      if (activeDateFilter === 'all') setActiveDateFilter(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
                      else setActiveDateFilter(format(subDays(parseISO(activeDateFilter), 1), 'yyyy-MM-dd'));
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 transition-all border border-white/10"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {/* Date display + hidden native picker */}
                  <div className="relative min-w-[150px]">
                    <input
                      type="date"
                      value={activeDateFilter === 'all' ? '' : activeDateFilter}
                      onChange={e => { if (e.target.value) setActiveDateFilter(e.target.value); }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    />
                    <div className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl font-black text-xs border-2 transition-all ${
                      activeDateFilter !== 'all'
                        ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
                        : 'border-white/10 bg-white/10 text-gray-400'
                    }`}>
                      <CalendarDays size={13} />
                      {activeDateFilter === 'all' ? 'Select Date' : getFormatDateLabel(activeDateFilter)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (activeDateFilter === 'all') setActiveDateFilter(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
                      else setActiveDateFilter(format(addDays(parseISO(activeDateFilter), 1), 'yyyy-MM-dd'));
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 transition-all border border-white/10"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Archive date filter */}
              {activeTab === 'archived' && (
                <div className="relative mt-4 flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-4 py-2 w-fit">
                  <Filter size={13} className="text-blue-400" />
                  <input
                    type="date"
                    value={archiveDate}
                    onChange={e => setArchiveDate(e.target.value)}
                    className="bg-transparent outline-none text-xs font-bold text-gray-200 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* ══ BODY ════════════════════════════════════════════════════ */}
            <div className="flex flex-1 overflow-hidden">

              {/* LEFT: Teams list */}
              <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
                isPanelOpen ? 'hidden md:flex md:w-[38%] lg:w-[36%] shrink-0' : 'w-full'
              }`}>
                <div className="flex-1 overflow-y-auto px-4 py-4">

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Loader2 size={22} className="animate-spin text-blue-500" />
                      </div>
                      <p className="text-gray-400 text-sm font-semibold">Loading teams…</p>
                    </div>

                  ) : displayTeams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm mt-2">
                      <Users size={48} className="text-gray-200" />
                      <div className="text-center">
                        <p className="font-black text-gray-600 text-base">No squads found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {activeTab === 'active'
                            ? `No teams for ${getFormatDateLabel(activeDateFilter)}.`
                            : 'No archived records for this date.'}
                        </p>
                      </div>
                      {activeTab === 'active' && (
                        <button
                          onClick={openCreateModal}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-black transition-all"
                        >
                          <Plus size={14} /> Create Squad
                        </button>
                      )}
                    </div>

                  ) : activeTab === 'active' ? (
                    /* Active — grouped by date */
                    <div className="space-y-8">
                      {sortedActiveDates.map(date => (
                        <div key={date}>
                          {activeDateFilter === 'all' && (
                            <div className="flex items-center gap-3 mb-3">
                              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-blue-200">
                                <CalendarDays size={11} />
                                {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                              </div>
                              <div className="h-px bg-gray-200 flex-1" />
                            </div>
                          )}
                          <div className={`grid gap-4 ${isPanelOpen ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                            <AnimatePresence>
                              {groupedActiveTeams[date].map((team, idx) => {
                                const isSelected = selectedTeamId === team.id;
                                return (
                                  <motion.div
                                    key={team.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => openAssignPanel(team.id)}
                                    className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group ${
                                      isSelected
                                        ? 'border-blue-400 ring-2 ring-blue-100 shadow-blue-100'
                                        : 'border-gray-100 hover:border-blue-200'
                                    }`}
                                  >
                                    {/* Card header */}
                                    <div className={`p-4 border-b flex justify-between items-start transition-colors ${
                                      isSelected ? 'bg-blue-50/60 border-blue-100' : 'bg-blue-50/20 border-gray-50'
                                    }`}>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-base text-gray-900 truncate">{team.team_name}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                          <Clock size={10} className="text-blue-400" />
                                          Updated: {format(new Date(team.updated_at), 'h:mm a')}
                                        </p>
                                        <div className="mt-2">
                                          {team.bookings && team.bookings.length > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-100">
                                              <Check size={10} /> {team.bookings.length} Assigned
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-black uppercase border border-gray-200">
                                              <Users size={10} /> Not Assigned
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Buttons — stop propagation */}
                                      <div className="flex gap-1.5 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                          onClick={() => openEditModal(team)}
                                          className="p-1.5 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-100 transition-all shadow-sm"
                                          title="Edit"
                                        >
                                          <Edit size={13} />
                                        </button>
                                        <button
                                          onClick={() => handleArchiveTeam(team.id)}
                                          className="p-1.5 bg-white text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-all shadow-sm"
                                          title="Archive"
                                        >
                                          <Archive size={13} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Members */}
                                    <div className="p-4 flex-1">
                                      <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Members</p>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                                          {team.member_ids?.length ?? 0}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {team.member_ids?.map(memberId => {
                                          const agent = getAgentDetails(memberId);
                                          return (
                                            <div key={memberId} className="flex items-center gap-1 pl-1 pr-2 py-0.5 bg-white rounded-full border border-gray-200 shadow-sm">
                                              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600 overflow-hidden shrink-0">
                                                {agent?.avatar_url
                                                  ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                                  : agent?.username?.slice(0, 2).toUpperCase() ?? <User size={10} />}
                                              </div>
                                              <span className="text-[10px] font-bold text-gray-700 truncate max-w-[80px]">
                                                {agent?.full_name ?? agent?.username ?? 'Unknown'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Assign CTA */}
                                    {!isPanelOpen && (
                                      <div className="px-4 pb-3">
                                        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-wider group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                          <ArrowLeftRight size={11} /> Assign Tasks
                                        </div>
                                      </div>
                                    )}

                                    {isSelected && (
                                      <div className="h-0.5 bg-gradient-to-r from-blue-500 to-blue-400" />
                                    )}
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))}
                    </div>

                  ) : (
                    /* Archived — timeline */
                    <div className="space-y-10 mt-2">
                      {sortedArchivedDates.map(date => (
                        <div key={date} className="relative">
                          <div className="flex items-center gap-3 mb-5 sticky top-0 z-10 bg-[#F8FAFC] py-1.5">
                            <div className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center gap-2">
                              <CalendarDays size={13} className="text-gray-500" />
                              {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                            </div>
                            <div className="h-px bg-gray-200 flex-1" />
                          </div>
                          <div className="border-l-2 border-gray-200 ml-6 space-y-5">
                            {groupedArchivedTeams[date].map(team => (
                              <motion.div
                                key={team.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="relative pl-8"
                              >
                                <div className="absolute -left-[10px] top-4 w-4 h-4 rounded-full border-4 border-[#F8FAFC] bg-blue-400" />
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-black text-sm text-gray-800">{team.team_name}</h3>
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-black uppercase">Closed</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                      <Clock size={10} /> Closed at {format(new Date(team.updated_at), 'h:mm a')}
                                    </p>
                                    <div className="mt-1.5">
                                      {team.bookings && team.bookings.length > 0 ? (
                                        <span className="text-[10px] text-emerald-600 font-black">
                                          {team.bookings.map((b: Booking) =>
                                            `${b.units?.companies?.name ?? 'Unknown'} (U-${b.units?.unit_number ?? '?'})`
                                          ).join(', ')}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-400 font-black">Not Assigned</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 md:max-w-[50%] md:justify-end">
                                    {team.member_ids?.map(memberId => {
                                      const agent = getAgentDetails(memberId);
                                      return (
                                        <div key={memberId} className="flex items-center gap-1 pl-1 pr-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-black text-gray-600 overflow-hidden shrink-0">
                                            {agent?.avatar_url
                                              ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                              : agent?.username?.slice(0, 2).toUpperCase() ?? <User size={10} />}
                                          </div>
                                          <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px]">
                                            {agent?.full_name?.split(' ')[0] ?? agent?.username ?? 'Unknown'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Assignment Panel */}
              <AnimatePresence>
                {isPanelOpen && (
                  <div className="flex-1 overflow-hidden border-l border-gray-100 bg-white">
                    <AssignmentPanel
                      selectedTeam={selectedTeam}
                      activeTeams={activeTeams}
                      allBookings={allBookings}
                      filteredBookings={filteredBookings}
                      loadingBookings={loadingBookings}
                      assigningId={assigningId}
                      bookingSearch={bookingSearch}
                      bookingStatusFilter={bookingStatusFilter}
                      selectedTeamId={selectedTeamId}
                      onCloseAction={closeAssignPanel}
                      onAssignAction={handleAssignBooking}
                      onSearchChangeAction={setBookingSearch}
                      onStatusFilterChangeAction={setBookingStatusFilter}
                    />
                  </div>
                )}
              </AnimatePresence>

            </div>{/* end body */}

            {/* ══ TEAM CREATE / EDIT SUB-MODAL ════════════════════════════ */}
            <AnimatePresence>
              {isFormOpen && (
                <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-6">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setIsFormOpen(false)}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                  />
                  <motion.div
                    variants={formVariants}
                    initial="hidden" animate="visible" exit="exit"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                    className="relative w-full sm:max-w-2xl bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
                    style={{ maxHeight: '88vh' }}
                  >
                    {/* Form header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                          {formMode === 'create'
                            ? <><UserPlus size={18} className="text-blue-600" /> Create New Squad</>
                            : <><Edit size={18} className="text-blue-600" /> Edit Team Details</>}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Set shift schedule and select agents.</p>
                      </div>
                      <button
                        onClick={() => setIsFormOpen(false)}
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Form body */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                      {/* Name + Date */}
                      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Team Name</label>
                          <input
                            placeholder="e.g. Team Alpha"
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-gray-900 font-bold transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Shift Date</label>
                          <input
                            type="date"
                            value={shiftDateInput}
                            onChange={e => setShiftDateInput(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-gray-900 font-bold transition-all cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Agent list */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">All Active Agents</label>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                            {agents.length} Total
                          </span>
                        </div>

                        {/* Agent search */}
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3 focus-within:border-blue-400 transition-all">
                          <Search size={14} className="text-gray-400 shrink-0" />
                          <input
                            placeholder="Search agent…"
                            value={agentSearch}
                            onChange={e => setAgentSearch(e.target.value)}
                            className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full placeholder:text-gray-400 placeholder:font-medium"
                          />
                        </div>

                        {filteredAgentsForForm.length === 0 ? (
                          <div className="p-6 bg-gray-50 text-gray-500 font-bold rounded-2xl text-sm text-center border-2 border-dashed border-gray-200">
                            No agents found.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredAgentsForForm.map(agent => {
                              const isSelected = selectedAgentIds.includes(agent.id);
                              return (
                                <div
                                  key={agent.id}
                                  onClick={() => setSelectedAgentIds(prev =>
                                    isSelected ? prev.filter(id => id !== agent.id) : [...prev, agent.id]
                                  )}
                                  className={`p-3 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all active:scale-95 ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                      : 'border-gray-100 hover:border-gray-300 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 overflow-hidden shrink-0 border border-gray-200">
                                      {agent.avatar_url
                                        ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : agent.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className={`block font-bold text-sm leading-tight ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                                        {agent.full_name ?? agent.username}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Agent</span>
                                    </div>
                                  </div>
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200'
                                  }`}>
                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
                      <button
                        onClick={() => setIsFormOpen(false)}
                        className="w-1/3 py-3.5 text-gray-500 hover:bg-gray-200 rounded-xl font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!teamName || selectedAgentIds.length === 0 || !shiftDateInput || submitting}
                        className="w-2/3 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg"
                      >
                        {submitting
                          ? <Loader2 size={16} className="animate-spin" />
                          : formMode === 'create'
                            ? <><Check size={18} /> Create Squad</>
                            : <><Edit size={18} /> Update Team</>
                        }
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>{/* end modal shell */}
        </div>
      )}
    </AnimatePresence>
  );
}