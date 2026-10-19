'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Archive, Check, User,
  Briefcase, Loader2, X, Edit, Clock, CalendarDays,
  Filter, ArrowLeftRight, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';

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

  // ── Tab & Filters ─────────────────────────────────────
  const [activeTab, setActiveTab]     = useState<'active' | 'archived'>('active');
  const [archiveDate, setArchiveDate] = useState<string>('');

  // 🚨 NEW: Roster Date Filter for Active Teams
  const [activeDateFilter, setActiveDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

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

  // 🚨 NEW: Shift Date for Team Creation
  const [shiftDateInput, setShiftDateInput]     = useState(format(new Date(), 'yyyy-MM-dd'));

  // ── Derived ──────────────────────────────────────────────────
  const isPanelOpen  = selectedTeamId !== null;
  const selectedTeam = activeTeams.find(t => t.id === selectedTeamId) ?? null;

  // ── FETCH 1: Agents + Active Teams (Filtered by activeDateFilter) ──
  useEffect(() => {
    const fetchInitialData = async () => {
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

      // If a specific date is selected, filter by it. Otherwise fetch all active.
      if (activeDateFilter !== 'all') {
        query = query.eq('shift_date', activeDateFilter);
      }

      const { data: activeData } = await query;
      if (activeData) setActiveTeams(activeData as unknown as Team[]);
      setLoadingActive(false);
    };

    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, activeDateFilter]); // Runs when date filter changes

  // ── FETCH 2: Bookings for Assignment Panel (Dynamic Date) ──
  useEffect(() => {
    if (!isPanelOpen || !selectedTeam) return;

    const fetchBookings = async () => {
      setLoadingBookings(true);
      // 🚨 NEW: Fetch bookings based on the Team's shift_date!
      const targetDate = selectedTeam.shift_date; 

      const { data } = await supabase
        .from('bookings')
        .select('id, booking_ref, assigned_team_id, status, created_at, cleaning_date, cleaning_time, service_type, units(unit_number, layout, companies(name)), teams(team_name)')
        .eq('cleaning_date', targetDate) // Filter by team's shift date
        .order('cleaning_time', { ascending: true });

      if (data) setAllBookings(data as unknown as Booking[]);
      setLoadingBookings(false);
    };

    fetchBookings();
  }, [isPanelOpen, selectedTeam?.id, selectedTeam?.shift_date, supabase]);

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
    setShiftDateInput(activeDateFilter === 'all' ? format(new Date(), 'yyyy-MM-dd') : activeDateFilter);
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setModalMode('edit'); setEditingTeamId(team.id);
    setTeamName(team.team_name); setSelectedAgentIds(team.member_ids ?? []);
    setShiftDateInput(team.shift_date || format(new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!teamName || selectedAgentIds.length === 0 || !shiftDateInput) return;
    const timestamp = new Date().toISOString();

    if (modalMode === 'create') {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ team_name: teamName, member_ids: selectedAgentIds, status: 'active', shift_date: shiftDateInput, updated_at: timestamp }])
        .select();
      if (!error && data) { 
        // Only append to UI if we are in 'all' view or the date matches our current filter
        if (activeDateFilter === 'all' || activeDateFilter === shiftDateInput) {
          setActiveTeams(prev => [data[0] as Team, ...prev]); 
        }
        setIsModalOpen(false); 
      }
    } else if (modalMode === 'edit' && editingTeamId) {
      const { error } = await supabase
        .from('teams')
        .update({ team_name: teamName, member_ids: selectedAgentIds, shift_date: shiftDateInput, updated_at: timestamp })
        .eq('id', editingTeamId);
      if (!error) {
        // If date was changed and we are in a specific date view, remove from current view
        if (activeDateFilter !== 'all' && activeDateFilter !== shiftDateInput) {
          setActiveTeams(prev => prev.filter(t => t.id !== editingTeamId));
        } else {
          setActiveTeams(prev =>
            prev.map(t => t.id === editingTeamId ? { ...t, team_name: teamName, member_ids: selectedAgentIds, shift_date: shiftDateInput, updated_at: timestamp } : t)
          );
        }
        setIsModalOpen(false);
      }
    }
  };

  // ── Helpers ───────────────────────────────────────────────────
  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  const displayTeams = activeTab === 'active' ? activeTeams : archivedTeams;
  const isLoading    = activeTab === 'active' ? loadingActive : loadingArchive;

  // Group Archived Teams
  const groupedArchivedTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    if (activeTab !== 'archived') return groups;
    displayTeams.forEach(team => {
      const date = team.shift_date || '1970-01-01';
      if (!groups[date]) groups[date] = [];
      groups[date].push(team);
    });
    return groups;
  }, [displayTeams, activeTab]);

  const sortedArchivedDates = Object.keys(groupedArchivedTeams).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // 🚨 NEW: Group Active Teams
  const groupedActiveTeams = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    if (activeTab !== 'active') return groups;
    displayTeams.forEach(team => {
      const date = team.shift_date || '1970-01-01';
      if (!groups[date]) groups[date] = [];
      groups[date].push(team);
    });
    return groups;
  }, [displayTeams, activeTab]);

  const sortedActiveDates = Object.keys(groupedActiveTeams).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime() // Ascending order for active roster
  );

  const getFormatDateLabel = (dateStr: string) => {
    if (dateStr === 'all') return 'All Dates';
    const d = parseISO(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const dTime = d.getTime();
    if (dTime === today.getTime()) return `Today (${format(d, 'd MMM')})`;
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    if (dTime === yest.getTime()) return `Yesterday (${format(d, 'd MMM')})`;
    const tom = new Date(today); tom.setDate(tom.getDate() + 1);
    if (dTime === tom.getTime()) return `Tomorrow (${format(d, 'd MMM')})`;
    return format(d, 'EEE, d MMM yyyy');
  };

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20 font-sans text-gray-800 dark:text-slate-200 bg-[#F8FAFC] dark:bg-[#070b14]">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#050d1a] via-[#0b192e] to-[#04121d] dark:from-[#030914] dark:via-[#071326] dark:to-[#040e1a] text-white pt-10 pb-24 px-6 md:px-12 shadow-2xl relative overflow-hidden transition-all duration-300">
        {/* Dark mode Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-indigo-600/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/3 w-72 h-72 hidden dark:block bg-teal-500/15 rounded-full blur-[80px] pointer-events-none" />

        {/* Dark mode SVG Oceanic Waves */}
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="teams-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.30" />
                <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="75%" stopColor="#6366F1" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.10" />
              </linearGradient>
              <linearGradient id="teams-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.26" />
                <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.12" />
              </linearGradient>
              <linearGradient id="teams-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="teams-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.90" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.90" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.80" />
              </linearGradient>
              <filter id="teams-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80 L1440,320 L0,320 Z" fill="url(#teams-grad-wave1)" />
            <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80" stroke="url(#teams-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#teams-glow-cyan)" />
            <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140 L1440,320 L0,320 Z" fill="url(#teams-grad-wave2)" />
            <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140" stroke="url(#teams-crest-2)" strokeWidth="2" strokeLinecap="round" />
            <path d="M0,230 C360,270 680,180 1020,240 C1240,280 1380,210 1440,220" stroke="url(#teams-crest-1)" strokeWidth="1.2" strokeDasharray="6 6" strokeOpacity="0.4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Briefcase className="text-cyan-400" size={36} /> Team Directory
            </h1>
            <p className="text-cyan-200/80 font-bold mt-2">Manage daily shift squads and agent allocations</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/40"
          >
            <UserPlus size={16} /> Add New Squad
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="px-4 md:px-8 -mt-10 relative z-20">

        {/* Tabs & Top Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white dark:bg-[#060e1d]/80 dark:backdrop-blur-xl border border-gray-200 dark:border-cyan-500/20 p-1.5 rounded-2xl w-full md:w-auto shadow-sm">
            <button
              onClick={() => { setActiveTab('active'); closeAssignPanel(); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-cyan-50 dark:bg-[#0c1a30] text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Active Roster
            </button>
            <button
              onClick={() => { setActiveTab('archived'); closeAssignPanel(); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'archived' ? 'bg-cyan-50 dark:bg-[#0c1a30] text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Archived History
            </button>
          </div>

          {activeTab === 'archived' && (
            <div className="flex items-center gap-2 w-full md:w-auto bg-white dark:bg-[#060e1d]/80 dark:backdrop-blur-xl px-4 py-2 rounded-2xl border border-gray-200 dark:border-cyan-500/20 shadow-sm">
              <Filter size={16} className="text-cyan-500" />
              <input
                type="date"
                value={archiveDate}
                onChange={e => setArchiveDate(e.target.value)}
                className="bg-transparent outline-none text-gray-700 dark:text-slate-200 font-bold text-sm w-full cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 🚨 NEW: Roster Date Switcher (Only for Active Tab) */}
        {activeTab === 'active' && (
          <div className="flex items-center justify-between bg-white dark:bg-[#0c1427] px-3 py-2 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm mb-6 mt-4 w-full md:w-max">
            <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveDateFilter('all')}
                className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all shrink-0 ${activeDateFilter === 'all' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                All Upcoming
              </button>
              <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 shrink-0 mx-1.5" />

              <button
                onClick={() => {
                  if (activeDateFilter === 'all') setActiveDateFilter(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
                  else setActiveDateFilter(format(subDays(parseISO(activeDateFilter), 1), 'yyyy-MM-dd'));
                }}
                className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 shrink-0 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="relative shrink-0 min-w-[140px]">
                <input
                  type="date"
                  value={activeDateFilter === 'all' ? '' : activeDateFilter}
                  onChange={(e) => {
                    if (e.target.value) setActiveDateFilter(e.target.value);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl font-black text-sm border-2 transition-all ${activeDateFilter !== 'all' ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'border-transparent text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  <CalendarDays size={14} className={activeDateFilter === 'all' ? 'opacity-50' : ''}/>
                  {activeDateFilter === 'all' ? 'Select Date' : getFormatDateLabel(activeDateFilter)}
                </div>
              </div>

              <button
                onClick={() => {
                  if (activeDateFilter === 'all') setActiveDateFilter(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
                  else setActiveDateFilter(format(addDays(parseISO(activeDateFilter), 1), 'yyyy-MM-dd'));
                }}
                className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 shrink-0 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* SPLIT SCREEN */}
        <div className="flex gap-6 items-start mt-6">

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
              <div className="text-center py-20 bg-white dark:bg-[#0c1427] rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 shadow-sm mt-4">
                <Users size={56} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-700 dark:text-slate-200">No squads found</h3>
                <p className="text-gray-400 dark:text-slate-400 text-sm mt-2 font-medium">
                  {activeTab === 'active' ? `No teams planned for ${getFormatDateLabel(activeDateFilter)}.` : 'No archived records for this date.'}
                </p>
                {activeTab === 'active' && (
                  <button onClick={openCreateModal} className="mt-6 px-6 py-2.5 bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all shadow-lg">
                    Create one now
                  </button>
                )}
              </div>

            ) : activeTab === 'active' ? (
              /* 🚨 NEW: Active Teams Grouped By Date 🚨 */
              <div className="space-y-10">
                {sortedActiveDates.map(date => (
                  <div key={date}>
                    {activeDateFilter === 'all' && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-black flex items-center gap-2 shadow-sm border border-blue-200 dark:border-blue-800/60">
                          <CalendarDays size={14} />
                          {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                        </div>
                        <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1" />
                      </div>
                    )}
                    <div className={`grid gap-5 ${isPanelOpen ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
                              className={`bg-white dark:bg-[#0c1427] rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group
                                ${isSelected
                                  ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/50 shadow-blue-100 dark:shadow-none'
                                  : 'border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700'
                                }`}
                            >
                              {/* Card Header */}
                              <div className={`p-5 border-b flex justify-between items-start transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40' : 'bg-blue-50/20 dark:bg-[#090d1a]/50 border-gray-50 dark:border-slate-800'}`}>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{team.team_name}</h3>
                                  <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                    <Clock size={11} className="text-blue-400" />
                                    Updated: {format(new Date(team.updated_at), 'h:mm a')}
                                  </p>
                                  <div className="mt-2.5">
                                    {team.bookings && team.bookings.length > 0 ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                                        <Check size={11} /> {team.bookings.length} Assigned
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-gray-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700">
                                        <Users size={11} /> Not Assigned
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Buttons — stop propagation */}
                                <div className="flex gap-2 ml-3 shrink-0" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => openEditModal(team)}
                                    className="p-2 bg-white dark:bg-[#090d1a] text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-lg shadow-sm border border-blue-100 dark:border-slate-700 transition-all"
                                    title="Edit Team"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleArchiveTeam(team.id)}
                                    className="p-2 bg-white dark:bg-[#090d1a] text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-lg shadow-sm border border-red-100 dark:border-red-900/40 transition-all"
                                    title="Archive Team"
                                  >
                                    <Archive size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Members */}
                              <div className="p-5 flex-1">
                                <div className="flex justify-between items-center mb-3">
                                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Members</p>
                                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-black">
                                    {team.member_ids?.length ?? 0}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {team.member_ids?.map(memberId => {
                                    const agent = getAgentDetails(memberId);
                                    return (
                                      <div key={memberId} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-white dark:bg-[#070b14] rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-slate-300 overflow-hidden shrink-0">
                                          {agent?.avatar_url
                                            ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                            : agent?.username?.slice(0, 2).toUpperCase() ?? <User size={11} />}
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate max-w-[90px]">
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
                                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 dark:bg-[#090d1a] border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
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
                  </div>
                ))}
              </div>

            ) : (
              /* Archived Teams Timeline */
              <div className="space-y-10 mt-6">
                {sortedArchivedDates.map(date => (
                  <div key={date} className="relative">
                    <div className="flex items-center gap-3 mb-6 sticky top-0 z-10 bg-[#F8FAFC] dark:bg-[#070b14] py-2">
                      <div className="px-4 py-1.5 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm border border-transparent dark:border-slate-700">
                        <CalendarDays size={15} className="text-gray-500 dark:text-slate-400" />
                        {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                      </div>
                      <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1" />
                    </div>

                    <div className="border-l-2 border-gray-200 dark:border-slate-800 ml-6 md:ml-8 space-y-6">
                      {groupedArchivedTeams[date].map(team => (
                        <motion.div
                          key={team.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative pl-8 md:pl-10"
                        >
                          <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-[#F8FAFC] dark:border-[#070b14] bg-blue-400 shadow-sm" />
                          <div className="bg-white dark:bg-[#0c1427] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{team.team_name}</h3>
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded text-[10px] font-black uppercase tracking-widest border border-transparent dark:border-slate-700">Closed</span>
                              </div>
                              <p className="text-xs text-gray-400 dark:text-slate-500 font-bold flex items-center gap-1.5">
                                <Clock size={11} /> Closed at {format(new Date(team.updated_at), 'h:mm a')}
                              </p>
                              <div className="mt-2">
                                {team.bookings && team.bookings.length > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                                    {team.bookings.map((b: Booking) => `${b.units?.companies?.name ?? 'Unknown'} (U-${b.units?.unit_number ?? '?'})`).join(', ')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-gray-400 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700">
                                    Not Assigned
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 md:max-w-[50%] md:justify-end">
                              {team.member_ids?.map(memberId => {
                                const agent = getAgentDetails(memberId);
                                return (
                                  <div key={memberId} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-gray-50 dark:bg-[#070b14] rounded-full border border-gray-100 dark:border-slate-800">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-slate-400 overflow-hidden shrink-0">
                                      {agent?.avatar_url
                                        ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : agent?.username?.slice(0, 2).toUpperCase() ?? <User size={10} />}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-300 truncate max-w-[80px]">
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
              className="relative bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 w-full max-w-2xl rounded-[2rem] shadow-2xl z-[1000] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#090d1a]">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {modalMode === 'create' ? <UserPlus className="text-blue-600 dark:text-blue-400" /> : <Edit className="text-blue-600 dark:text-blue-400" />}
                    {modalMode === 'create' ? 'Create Team' : 'Edit Team Details'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">Set squad schedule and select agents.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white dark:bg-[#0c1427] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-400 rounded-full border border-gray-200 dark:border-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                {/* 🚨 NEW: Added Shift Date Input to Modal */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2">Team Name</label>
                    <input
                      placeholder="e.g. Team Alpha"
                      className="w-full p-4 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-gray-900 dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2">Shift Date</label>
                    <input
                      type="date"
                      className="w-full p-4 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-gray-900 dark:text-white font-bold transition-all cursor-pointer"
                      value={shiftDateInput}
                      onChange={e => setShiftDateInput(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">All Active Agents</label>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-md border border-blue-100 dark:border-blue-800/60">{agents.length} Total</span>
                  </div>
                  {agents.length === 0 ? (
                    <div className="p-6 bg-gray-50 dark:bg-[#070b14] text-gray-500 dark:text-slate-400 font-bold rounded-2xl text-sm text-center border-2 border-dashed border-gray-200 dark:border-slate-800">No agents registered.</div>
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
                              ${isSelected ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm' : 'border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-[#090d1a]'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-gray-500 dark:text-slate-400 overflow-hidden shrink-0 border border-gray-200 dark:border-slate-700">
                                {agent.avatar_url
                                  ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                  : agent.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className={`block font-bold text-sm leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                                  {agent.full_name ?? agent.username}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">Agent</span>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 dark:border-slate-700'}`}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-[#090d1a] flex gap-4 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="w-1/3 py-3.5 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!teamName || selectedAgentIds.length === 0 || !shiftDateInput}
                  className="w-2/3 py-3.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-black dark:hover:bg-blue-500 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg"
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