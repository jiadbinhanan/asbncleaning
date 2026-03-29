'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Archive, Check, User,
  Briefcase, Loader2, X, Edit, Clock, CalendarDays,
  Filter, ArrowLeftRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import AssignmentPanel, { type Booking, type Team } from './AssignmentPanel';

// ── Local-only type ───────────────────────────────────────────
type Agent = {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
};

// ─────────────────────────────────────────────────────────────
export default function AdminTeamManagement() {
  const supabase = createClient();

  // ── Data ────────────────────────────────────────────────────
  const [agents, setAgents]               = useState<Agent[]>([]);
  const [activeTeams, setActiveTeams]     = useState<Team[]>([]);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  const [allBookings, setAllBookings]     = useState<Booking[]>([]);

  // ── Loaders ──────────────────────────────────────────────────
  const [loadingActive, setLoadingActive]     = useState(true);
  const [loadingArchive, setLoadingArchive]   = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [assigningId, setAssigningId]         = useState<number | null>(null);

  // ── Tab & Archive Filter ─────────────────────────────────────
  const [activeTab, setActiveTab]     = useState<'active' | 'archived'>('active');
  const [archiveDate, setArchiveDate] = useState<string>('');

  // ── Assignment Panel ─────────────────────────────────────────
  const [selectedTeamId, setSelectedTeamId]         = useState<number | null>(null);
  const [bookingSearch, setBookingSearch]             = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

  // ── Team Modal ───────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [modalMode, setModalMode]               = useState<'create' | 'edit'>('create');
  const [editingTeamId, setEditingTeamId]       = useState<number | null>(null);
  const [teamName, setTeamName]                 = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // ── Derived ──────────────────────────────────────────────────
  const isPanelOpen  = selectedTeamId !== null;
  const selectedTeam = activeTeams.find(t => t.id === selectedTeamId) ?? null;

  // ── FETCH 1: Agents + today's active teams ───────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingActive(true);

      const { data: agentsData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('role', 'agent');
      if (agentsData) setAgents(agentsData);

      const today = new Date().toISOString().split('T')[0];
      const { data: activeData } = await supabase
        .from('teams')
        .select('*, bookings(id, assigned_team_id, status, created_at, cleaning_date, units(unit_number, companies(name)))')
        .eq('status', 'active')
        .eq('shift_date', today)
        .order('created_at', { ascending: false });

      if (activeData) setActiveTeams(activeData as unknown as Team[]);
      setLoadingActive(false);
    };

    fetchInitialData();
  }, [supabase]);

// ── FETCH 2: All bookings (lazy — opens when panel first opens)
  useEffect(() => {
    if (!isPanelOpen || allBookings.length > 0) return;

    const fetchBookings = async () => {
      setLoadingBookings(true);
      const today = new Date().toISOString().split('T')[0]; // 🚨 আজকের ডেট বের করা

      const { data } = await supabase
        .from('bookings')
        // 🚨 নতুন ফিল্ড এবং রিলেশন (teams, layout) যুক্ত করা হয়েছে
        .select('id, booking_ref, assigned_team_id, status, created_at, cleaning_date, cleaning_time, service_type, units(unit_number, layout, companies(name)), teams(team_name)')
        .eq('cleaning_date', today) // 🚨 শুধুমাত্র আজকের বুকিং
        .order('cleaning_time', { ascending: true }); // সময় অনুযায়ী সাজানো

      if (data) setAllBookings(data as unknown as Booking[]);
      setLoadingBookings(false);
    };

    fetchBookings();
  }, [isPanelOpen, allBookings.length, supabase]);
  // ── FETCH 3: Archive ─────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'archived') return;
    if (!archiveDate && archivedTeams.length > 0) return;

    const fetchArchive = async () => {
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

    fetchArchive();
  }, [activeTab, archiveDate, archivedTeams.length, supabase]);

  // ── Filtered bookings for panel ───────────────────────────────
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      const matchSearch =
        bookingSearch === '' ||
        b.units?.companies?.name?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.units?.unit_number?.toLowerCase().includes(bookingSearch.toLowerCase());
      const matchStatus =
        bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [allBookings, bookingSearch, bookingStatusFilter]);

  // ── Actions ───────────────────────────────────────────────────
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
      .update({ assigned_team_id: newTeamId }) // 🚨 Update the correct column
      .eq('id', booking.id);

    if (!error) {
      setAllBookings(prev =>
        prev.map(b => b.id === booking.id ? { ...b, assigned_team_id: newTeamId } : b)
      );
      setActiveTeams(prev =>
        prev.map(team => {
          if (team.id === selectedTeamId) {
            const existing = team.bookings ?? [];
            if (newTeamId === null) return { ...team, bookings: existing.filter(b => b.id !== booking.id) };
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
    if (!confirm('Are you sure? Archiving this team will mark it as closed.')) return;
    const teamToArchive = activeTeams.find(t => t.id === id);
    setActiveTeams(prev => prev.filter(t => t.id !== id));
    if (teamToArchive) {
      setArchivedTeams(prev => [{ ...teamToArchive, status: 'archived', updated_at: new Date().toISOString() }, ...prev]);
    }
    if (selectedTeamId === id) closeAssignPanel();
    await supabase.from('teams').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id);
  };

  const openCreateModal = () => {
    setModalMode('create'); setEditingTeamId(null);
    setTeamName(''); setSelectedAgentIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setModalMode('edit'); setEditingTeamId(team.id);
    setTeamName(team.team_name); setSelectedAgentIds(team.member_ids ?? []);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!teamName || selectedAgentIds.length === 0) return;
    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];

    if (modalMode === 'create') {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ team_name: teamName, member_ids: selectedAgentIds, status: 'active', shift_date: today, updated_at: timestamp }])
        .select();
      if (!error && data) { setActiveTeams(prev => [data[0] as Team, ...prev]); setIsModalOpen(false); }
    } else if (modalMode === 'edit' && editingTeamId) {
      const { error } = await supabase
        .from('teams')
        .update({ team_name: teamName, member_ids: selectedAgentIds, updated_at: timestamp })
        .eq('id', editingTeamId);
      if (!error) {
        setActiveTeams(prev =>
          prev.map(t => t.id === editingTeamId ? { ...t, team_name: teamName, member_ids: selectedAgentIds, updated_at: timestamp } : t)
        );
        setIsModalOpen(false);
      }
    }
  };

  // ── Helpers ───────────────────────────────────────────────────
  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  const displayTeams = activeTab === 'active' ? activeTeams : archivedTeams;
  const isLoading    = activeTab === 'active' ? loadingActive : loadingArchive;

  const groupedArchivedTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    if (activeTab !== 'archived') return groups;
    displayTeams.forEach(team => {
      if (!groups[team.shift_date]) groups[team.shift_date] = [];
      groups[team.shift_date].push(team);
    });
    return groups;
  }, [displayTeams, activeTab]);

  const sortedArchivedDates = Object.keys(groupedArchivedTeams).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20 font-sans text-gray-800 bg-[#F8FAFC]">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#0A192F] via-[#112240] to-black text-white pt-10 pb-20 px-6 md:px-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Briefcase className="text-blue-500" size={36} /> Team Directory
            </h1>
            <p className="text-blue-300 font-bold mt-2">Manage daily shift squads and agent allocations</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <UserPlus size={16} /> Add New Squad
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20">

        {/* Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('active'); setArchiveDate(''); closeAssignPanel(); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active Today
            </button>
            <button
              onClick={() => { setActiveTab('archived'); closeAssignPanel(); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'archived' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Archived History
            </button>
          </div>

          {activeTab === 'archived' && (
            <div className="flex items-center gap-2 w-full md:w-auto bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
              <Filter size={16} className="text-blue-500" />
              <input
                type="date"
                value={archiveDate}
                onChange={e => setArchiveDate(e.target.value)}
                className="bg-transparent outline-none text-gray-700 font-bold text-sm w-full cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* SPLIT SCREEN */}
        <div className="flex gap-6 items-start">

          {/* LEFT: Teams List */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`w-full ${isPanelOpen ? 'hidden md:block md:w-[38%] lg:w-[35%] shrink-0' : 'w-full'}`}
          >
            {isLoading ? (
              <div className="flex justify-center mt-20">
                <Loader2 className="animate-spin text-blue-500" size={40} />
              </div>

            ) : displayTeams.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-100 shadow-sm">
                <Users size={56} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-700">No {activeTab} squads found</h3>
                <p className="text-gray-400 text-sm mt-2 font-medium">
                  {activeTab === 'active' ? 'Create a new team to assign agents.' : 'No archived records for this date.'}
                </p>
              </div>

            ) : activeTab === 'active' ? (
              /* Active Teams Grid */
              <div className={`grid gap-5 ${isPanelOpen ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                <AnimatePresence>
                  {displayTeams.map((team, idx) => {
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
                        className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group
                          ${isSelected
                            ? 'border-blue-400 ring-2 ring-blue-200 shadow-blue-100'
                            : 'border-gray-100 hover:border-blue-200'
                          }`}
                      >
                        {/* Card Header */}
                        <div className={`p-5 border-b flex justify-between items-start transition-colors ${isSelected ? 'bg-blue-50/60 border-blue-100' : 'bg-blue-50/20 border-gray-50'}`}>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 truncate">{team.team_name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                              <Clock size={11} className="text-blue-400" />
                              Updated: {format(new Date(team.updated_at), 'h:mm a')}
                            </p>
                            <div className="mt-2.5">
                              {team.bookings && team.bookings.length > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                  <Check size={11} /> {team.bookings.length} Assigned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border border-gray-200">
                                  <Users size={11} /> Not Assigned
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Buttons — stop propagation */}
                          <div className="flex gap-2 ml-3 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => openEditModal(team)}
                              className="p-2 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg shadow-sm border border-blue-100 transition-all"
                              title="Edit Team"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleArchiveTeam(team.id)}
                              className="p-2 bg-white text-red-500 hover:bg-red-500 hover:text-white rounded-lg shadow-sm border border-red-100 transition-all"
                              title="Archive Team"
                            >
                              <Archive size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Members */}
                        <div className="p-5 flex-1">
                          <div className="flex justify-between items-center mb-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Members</p>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                              {team.member_ids?.length ?? 0}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {team.member_ids?.map(memberId => {
                              const agent = getAgentDetails(memberId);
                              return (
                                <div key={memberId} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 overflow-hidden shrink-0">
                                    {agent?.avatar_url
                                      ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                      : agent?.username?.slice(0, 2).toUpperCase() ?? <User size={11} />}
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 truncate max-w-[90px]">
                                    {agent?.full_name ?? agent?.username ?? 'Unknown'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Assign CTA */}
                        {!isPanelOpen && (
                          <div className="px-5 pb-4">
                            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                              <ArrowLeftRight size={13} /> Assign Tasks
                            </div>
                          </div>
                        )}

                        {/* Selected bar */}
                        {isSelected && <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

            ) : (
              /* Archived Teams Timeline */
              <div className="space-y-10 mt-6">
                {sortedArchivedDates.map(date => (
                  <div key={date} className="relative">
                    <div className="flex items-center gap-3 mb-6 sticky top-0 z-10 bg-[#F8FAFC] py-2">
                      <div className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                        <CalendarDays size={15} className="text-gray-500" />
                        {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                      </div>
                      <div className="h-px bg-gray-200 flex-1" />
                    </div>

                    <div className="border-l-2 border-gray-200 ml-6 md:ml-8 space-y-6">
                      {groupedArchivedTeams[date].map(team => (
                        <motion.div
                          key={team.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative pl-8 md:pl-10"
                        >
                          <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-[#F8FAFC] bg-blue-400 shadow-sm" />
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-lg text-gray-800">{team.team_name}</h3>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-black uppercase tracking-widest">Closed</span>
                              </div>
                              <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                                <Clock size={11} /> Closed at {format(new Date(team.updated_at), 'h:mm a')}
                              </p>
                              <div className="mt-2">
                                {team.bookings && team.bookings.length > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50/60 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                    {team.bookings.map((b: Booking) => `${b.units?.companies?.name ?? 'Unknown'} (U-${b.units?.unit_number ?? '?'})`).join(', ')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border border-gray-200">
                                    Not Assigned
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 md:max-w-[50%] md:justify-end">
                              {team.member_ids?.map(memberId => {
                                const agent = getAgentDetails(memberId);
                                return (
                                  <div key={memberId} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-gray-50 rounded-full border border-gray-100">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 overflow-hidden shrink-0">
                                      {agent?.avatar_url
                                        ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : agent?.username?.slice(0, 2).toUpperCase() ?? <User size={10} />}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px]">
                                      {agent?.full_name?.split(' ')[0] ?? agent?.username}
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
          </motion.div>

          {/* RIGHT: AssignmentPanel — imported component */}
          <AnimatePresence>
            {isPanelOpen && (
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
            )}
          </AnimatePresence>

        </div>{/* end split screen */}
      </div>{/* end main */}


      {/* TEAM CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl z-[1000] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {modalMode === 'create' ? <UserPlus className="text-blue-600" /> : <Edit className="text-blue-600" />}
                    {modalMode === 'create' ? 'Create Team' : 'Edit Team Members'}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Select agents to add to this team.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white hover:bg-gray-100 text-gray-400 rounded-full border border-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                <div className="mb-8">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Team Name</label>
                  <input
                    placeholder="e.g. Team Alpha"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-gray-900 font-bold transition-all"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">All Active Agents</label>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">{agents.length} Total</span>
                  </div>
                  {agents.length === 0 ? (
                    <div className="p-6 bg-gray-50 text-gray-500 font-bold rounded-2xl text-sm text-center border-2 border-dashed border-gray-200">No agents registered.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {agents.map(agent => {
                        const isSelected = selectedAgentIds.includes(agent.id);
                        return (
                          <div
                            key={agent.id}
                            onClick={() => setSelectedAgentIds(prev =>
                              isSelected ? prev.filter(id => id !== agent.id) : [...prev, agent.id]
                            )}
                            className={`p-3 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all active:scale-95
                              ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-300 bg-white'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden shrink-0 border border-gray-200">
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
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200'}`}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="w-1/3 py-3.5 text-gray-500 hover:bg-gray-200 rounded-xl font-bold transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!teamName || selectedAgentIds.length === 0}
                  className="w-2/3 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg"
                >
                  {modalMode === 'create' ? <><Check size={18} /> Create Squad</> : <><Edit size={18} /> Update Team</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}