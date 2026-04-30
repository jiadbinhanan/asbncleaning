'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useModalStore } from '@/store/modalStore';
import {
  X, Plus, Calendar, Clock, Home, Users, CheckCircle2, AlertCircle,
  Loader2, Trash2, Edit2, Filter, FilterX, ClipboardList, Search,
  Zap, RotateCcw, ChevronDown, Building2, Tag, Hash,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
type Booking = {
  id: number;
  booking_ref: string | null;
  created_at: string;
  unit_id: number;
  cleaning_date: string;
  cleaning_time: string;
  service_type: string;
  status: string;
  price: number;
  assigned_team_id: number | null;
  checklist_template_id: number | null;
  units: {
    id: number;
    company_id: number;
    unit_number: string;
    building_name: string;
    companies: { id: number; name: string };
  };
  teams?: { team_name: string };
  checklist_templates?: { title: string };
};

type Team = { id: number; team_name: string; shift_date: string };

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  active:      { label: 'Active',      dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  completed:   { label: 'Completed',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  finalized:   { label: 'Finalized',   dot: 'bg-teal-500',    badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-red-400',     badge: 'bg-red-50 text-red-700 border-red-200' },
};

// ── Framer variants ───────────────────────────────────────────────────────────
const backdropV: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};
const modalV: Variants = {
  hidden:  { opacity: 0, scale: 0.97, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.97, y: 16 },
};
const formV: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.96, y: 12 },
};

// ── Form field component ──────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium text-sm transition-all";
const selectCls = inputCls + " cursor-pointer";

// ── Custom Combobox (Searchable Dropdown) ────────────────────────────────────
function CustomCombobox({ options, value, onChange, placeholder, clearText = "Select Option", disabled = false }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const filtered = options.filter((opt: any) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
    return [{ id: "", label: `-- ${clearText} --` }, ...filtered];
  }, [options, searchTerm, clearText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].id.toString());
          setIsOpen(false);
          setSearchTerm("");
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const selectedOption = options.find((opt: any) => opt.id.toString() === value.toString());

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          className="w-full p-3.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium disabled:opacity-50 transition-all cursor-text"
          placeholder={placeholder}
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : "")}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }
          }}
          className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 outline-none"
        >
          <ChevronDown
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
            size={18}
          />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] max-h-60 overflow-y-auto"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: any, index: number) => (
                <div
                  key={opt.id === "" ? "clear-opt" : opt.id}
                  onClick={() => {
                    onChange(opt.id.toString());
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`p-3 cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                    index === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  } ${opt.id === "" ? 'text-gray-400 italic bg-gray-50/50 hover:bg-gray-100' : ''}`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-400 text-center font-medium">No results found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BookingsManagerModal() {
  const supabase = createClient();
  const { isBookingsModalOpen, closeBookingsModal } = useModalStore();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [companies, setCompanies]     = useState<any[]>([]);
  const [units, setUnits]             = useState<any[]>([]);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [checklists, setChecklists]   = useState<any[]>([]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [dateFrom, setDateFrom]           = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo]               = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  // ── Add form ──────────────────────────────────────────────────────────────
  const [isAddOpen, setIsAddOpen]             = useState(false);
  const [isCustomService, setIsCustomService] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', unit_id: '',
    cleaning_date: format(new Date(), 'yyyy-MM-dd'),
    cleaning_time: '09:00',
    service_type: 'Check-out Cleaning',
    assigned_team_id: '',
    checklist_template_id: '',
    price: '',
  });

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen]               = useState(false);
  const [isEditCustomService, setIsEditCustomService] = useState(false);
  const [editData, setEditData] = useState<{
    id: number; company_id: string; unit_id: string;
    cleaning_date: string; cleaning_time: string;
    service_type: string; price: string;
    assigned_team_id: string; checklist_template_id: string;
  } | null>(null);

  // ── FETCH: static data once ───────────────────────────────────────────────
  useEffect(() => {
    if (!isBookingsModalOpen) return;
    if (companies.length > 0) return; // already loaded

    const go = async () => {
      const [companiesRes, unitsRes, checklistsRes, teamsRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('units').select('*'),
        supabase.from('checklist_templates').select('id, title'),
        supabase.from('teams').select('id, team_name, shift_date').eq('status', 'active'),
      ]);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (unitsRes.data)     setUnits(unitsRes.data);
      if (checklistsRes.data) setChecklists(checklistsRes.data);
      if (teamsRes.data)     setActiveTeams(teamsRes.data as Team[]);
    };
    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBookingsModalOpen]);

  // ── FETCH: bookings by date range ─────────────────────────────────────────
  const fetchBookings = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, created_at, unit_id, cleaning_date, cleaning_time,
        service_type, status, price, assigned_team_id, checklist_template_id,
        units ( id, company_id, unit_number, building_name, companies ( id, name ) ),
        teams:assigned_team_id ( team_name ),
        checklist_templates ( title )
      `)
      .gte('cleaning_date', dateFrom)
      .lte('cleaning_date', dateTo)
      .order('cleaning_date', { ascending: false })
      .order('cleaning_time', { ascending: true });

    if (data)  setBookings(data as any);
    if (error) toast.error('Failed to load bookings');
    setLoading(false);
  };

  useEffect(() => {
    if (isBookingsModalOpen) fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBookingsModalOpen, dateFrom, dateTo]);

  // ── Close menu on outside click ───────────────────────────────────────────
  useEffect(() => {
    const close = () => setActiveMenuId(null);
    if (activeMenuId !== null) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [activeMenuId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const availableTeamsForAdd = useMemo(() =>
    activeTeams.filter(t => t.shift_date === formData.cleaning_date),
  [activeTeams, formData.cleaning_date]);

  const availableTeamsForEdit = useMemo(() =>
    editData ? activeTeams.filter(t => t.shift_date === editData.cleaning_date) : [],
  [activeTeams, editData?.cleaning_date]);

  const getTeamAlert = (teamId: number, date: string, excludeId?: number) => {
    const busy = bookings.some(b =>
      b.assigned_team_id === teamId &&
      b.cleaning_date === date &&
      b.id !== excludeId &&
      ['pending', 'active', 'in_progress'].includes(b.status)
    );
    return busy ? ' ⚠ (Assigned with another booking)' : '';
  };

  const filteredBookings = useMemo(() => bookings.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      b.booking_ref?.toLowerCase().includes(q) ||
      b.units?.companies?.name?.toLowerCase().includes(q) ||
      b.units?.unit_number?.toLowerCase().includes(q) ||
      b.units?.building_name?.toLowerCase().includes(q);
    return matchSearch &&
      (!filterCompany || b.units?.companies?.name === filterCompany) &&
      (!filterStatus  || b.status === filterStatus);
  }), [bookings, searchQuery, filterCompany, filterStatus]);

  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    return groups;
  }, [filteredBookings]);

  const sortedDates = Object.keys(groupedBookings).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const stats = useMemo(() => ({
    total:     bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    active:    bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => ['completed', 'finalized'].includes(b.status)).length,
  }), [bookings]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('bookings').insert([{
      unit_id: formData.unit_id,
      cleaning_date: formData.cleaning_date,
      cleaning_time: formData.cleaning_time,
      service_type: formData.service_type,
      assigned_team_id: formData.assigned_team_id || null,
      checklist_template_id: formData.checklist_template_id || null,
      price: formData.price ? parseFloat(formData.price) : 0,
      status: 'pending',
    }]);
    if (!error) {
      toast.success('Booking recorded!');
      fetchBookings();
      setIsAddOpen(false);
      setFormData(f => ({ ...f, unit_id: '', assigned_team_id: '', price: '', checklist_template_id: '' }));
    } else {
      toast.error('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from('bookings').update({
      unit_id: parseInt(editData.unit_id),
      cleaning_date: editData.cleaning_date,
      cleaning_time: editData.cleaning_time,
      service_type: editData.service_type,
      price: parseFloat(editData.price) || 0,
      assigned_team_id: editData.assigned_team_id ? parseInt(editData.assigned_team_id) : null,
      checklist_template_id: editData.checklist_template_id ? parseInt(editData.checklist_template_id) : null,
    }).eq('id', editData.id);
    if (!error) {
      toast.success('Updated!');
      fetchBookings();
      setIsEditOpen(false);
    } else {
      toast.error('Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-gray-800 text-sm">Delete this booking?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-black">Cancel</button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('bookings').delete().eq('id', id);
              if (!error) { setBookings(prev => prev.filter(b => b.id !== id)); toast.success('Deleted!'); }
              else toast.error('Error: ' + error.message);
            }}
            className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-black"
          >Delete</button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  const handleToggleActivation = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'active' : 'pending';
    setActivatingId(id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error('Failed to update status.');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: currentStatus } : b));
    } else {
      toast.success(newStatus === 'active' ? '⚡ Booking Activated!' : '🔄 Reverted to Pending');
    }
    setActivatingId(null);
  };

  const openEdit = (booking: Booking) => {
    setEditData({
      id: booking.id,
      company_id: booking.units?.company_id?.toString() ?? '',
      unit_id: booking.unit_id.toString(),
      cleaning_date: booking.cleaning_date,
      cleaning_time: booking.cleaning_time,
      service_type: booking.service_type,
      price: booking.price?.toString() ?? '',
      assigned_team_id: booking.assigned_team_id?.toString() ?? '',
      checklist_template_id: booking.checklist_template_id?.toString() ?? '',
    });
    const knownServices = ['Check-out Cleaning', 'Deep Cleaning', 'General Cleaning', 'Sofa Bed setup'];
    setIsEditCustomService(!knownServices.includes(booking.service_type));
    setIsEditOpen(true);
    setActiveMenuId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <AnimatePresence>
        {isBookingsModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">

            {/* Backdrop */}
            <motion.div
              variants={backdropV}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.2 }}
              onClick={closeBookingsModal}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
            />

            {/* Modal shell */}
            <motion.div
              variants={modalV}
              initial="hidden" animate="visible" exit="exit"
              transition={{ type: 'spring' as const, stiffness: 320, damping: 28 }}
              className="relative w-full sm:max-w-5xl bg-[#F8FAFC] rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
              style={{ height: '94vh' }}
            >

              {/* ══ HEADER ════════════════════════════════════════════════ */}
              <div className="bg-gradient-to-br from-[#0A192F] via-[#112240] to-black text-white px-6 pt-7 pb-5 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Top row */}
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <ClipboardList size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Booking Manager</h2>
                      <p className="text-blue-300/80 text-xs font-semibold mt-0.5">
                        Create, edit and track all cleaning jobs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/30"
                    >
                      <Plus size={13} /> New Booking
                    </button>
                    <button
                      onClick={closeBookingsModal}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 flex items-center justify-center transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="relative mt-5 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total', val: stats.total,     cls: 'bg-white/5 border-white/10 text-white' },
                    { label: 'Pending',   val: stats.pending,   cls: 'bg-amber-500/10 border-amber-500/20 text-amber-200' },
                    { label: 'Active',    val: stats.active,    cls: 'bg-blue-500/10 border-blue-500/20 text-blue-200' },
                    { label: 'Completed', val: stats.completed, cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-xl p-2.5 text-center backdrop-blur-sm ${s.cls}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">{s.label}</p>
                      <p className="text-xl font-black">{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ══ FILTER BAR ════════════════════════════════════════════ */}
              <div className="shrink-0 px-4 pt-3 pb-2 border-b border-gray-100 bg-white space-y-2">
                {/* Search + date range + filter toggle */}
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 transition-all">
                    <Search size={14} className="text-gray-400 shrink-0" />
                    <input
                      placeholder="Search ref, company, unit…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-sm font-medium text-gray-700 w-full placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                      showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <Filter size={13} /> Filters {showFilters && <X size={11} />}
                  </button>
                  <button
                    onClick={fetchBookings}
                    className="w-9 h-9 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                {/* Expandable filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 pb-1">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">From</p>
                          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-400 cursor-pointer" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">To</p>
                          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-400 cursor-pointer" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Company</p>
                          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-400 cursor-pointer">
                            <option value="">All Companies</option>
                            {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-400 cursor-pointer">
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSearchQuery(''); setFilterCompany(''); setFilterStatus(''); }}
                        className="w-full py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FilterX size={13} /> Clear Filters
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ══ BODY — Booking list ════════════════════════════════════ */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Loader2 size={22} className="animate-spin text-blue-500" />
                    </div>
                    <p className="text-gray-400 text-sm font-semibold">Loading bookings…</p>
                  </div>

                ) : filteredBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-dashed border-gray-200 mt-2">
                    <Calendar size={48} className="text-gray-200" />
                    <div className="text-center">
                      <p className="font-black text-gray-600 text-base">No bookings found</p>
                      <p className="text-gray-400 text-sm mt-1">Try adjusting your dates or filters.</p>
                    </div>
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-black transition-all"
                    >
                      <Plus size={14} /> Add Booking
                    </button>
                  </div>

                ) : (
                  <div className="space-y-8">
                    {sortedDates.map(date => (
                      <div key={date}>
                        {/* Date header */}
                        <div className="flex items-center gap-3 mb-3 sticky top-0 z-10 bg-[#F8FAFC] py-1.5">
                          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black border border-blue-200">
                            <Calendar size={11} />
                            {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                          </div>
                          <div className="h-px bg-gray-200 flex-1" />
                          <span className="text-[10px] font-black text-gray-400">
                            {groupedBookings[date].length} booking{groupedBookings[date].length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Booking cards */}
                        <div className="space-y-3">
                          {groupedBookings[date].map((booking, idx) => {
                            const cfg = STATUS_CFG[booking.status] ?? STATUS_CFG['pending'];
                            const isMenuOpen = activeMenuId === booking.id;

                            return (
                              <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                              >
                                {/* Status bar */}
                                <div className={`h-0.5 ${cfg.dot}`} />

                                <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                                  {/* Left: icon + identity */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                      ['completed', 'finalized'].includes(booking.status) ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                      <Home size={20} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                        <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 uppercase tracking-widest">
                                          {booking.booking_ref || `ID-${booking.id}`}
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${cfg.badge} flex items-center gap-1`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                          {cfg.label}
                                        </span>
                                      </div>
                                      <p className="font-black text-gray-900 text-base leading-tight truncate">
                                        Unit {booking.units?.unit_number}
                                      </p>
                                      <p className="text-xs text-gray-500 font-medium truncate">
                                        {booking.units?.companies?.name} · {booking.units?.building_name}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Mid: details */}
                                  <div className="grid grid-cols-3 gap-3 md:flex md:items-center md:gap-4 text-left shrink-0">
                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Time</p>
                                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                        <Clock size={11} className="text-blue-500" />
                                        {booking.cleaning_time?.slice(0, 5)}
                                      </p>
                                    </div>
                                    <div className="col-span-2 md:w-[130px]">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Service</p>
                                      <p className="text-xs font-bold text-gray-800 truncate">{booking.service_type}</p>
                                      {booking.checklist_templates ? (
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                                          <ClipboardList size={9} /> {booking.checklist_templates.title}
                                        </p>
                                      ) : (
                                        <p className="text-[10px] text-orange-400 italic">No checklist</p>
                                      )}
                                    </div>
                                    <div className="col-span-3 md:w-[120px]">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Team</p>
                                      {booking.teams ? (
                                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                          <Users size={11} className="shrink-0" /> {booking.teams.team_name}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-orange-500 font-black flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-md w-fit border border-orange-100">
                                          <AlertCircle size={10} /> Unassigned
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: price + actions */}
                                  <div className="flex items-center gap-2 shrink-0 md:ml-2">
                                    <div className="text-right hidden md:block">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</p>
                                      <p className="font-black text-gray-900 text-base">
                                        {booking.price ? `AED ${booking.price}` : '—'}
                                      </p>
                                    </div>

                                    {/* Activate/Pending toggle */}
                                    {['pending', 'active'].includes(booking.status) && (
                                      <button
                                        onClick={() => handleToggleActivation(booking.id, booking.status)}
                                        disabled={activatingId === booking.id}
                                        title={booking.status === 'pending' ? 'Activate' : 'Revert to Pending'}
                                        className={`p-2 rounded-xl border transition-all ${
                                          booking.status === 'active'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white'
                                            : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-600 hover:text-white'
                                        }`}
                                      >
                                        {activatingId === booking.id
                                          ? <Loader2 size={14} className="animate-spin" />
                                          : booking.status === 'active' ? <RotateCcw size={14} /> : <Zap size={14} />}
                                      </button>
                                    )}

                                    {/* Menu */}
                                    <SmartMenu
                                      isOpen={isMenuOpen}
                                      onToggle={() => setActiveMenuId(isMenuOpen ? null : booking.id)}
                                      onEdit={() => openEdit(booking)}
                                      onDelete={() => { handleDelete(booking.id); setActiveMenuId(null); }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ══ ADD BOOKING SUB-MODAL ════════════════════════════════ */}
              <AnimatePresence>
                {isAddOpen && (
                  <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-6">
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setIsAddOpen(false)}
                      className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                    />
                    <motion.div
                      variants={formV}
                      initial="hidden" animate="visible" exit="exit"
                      transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                      className="relative w-full sm:max-w-2xl bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
                      style={{ maxHeight: '88vh' }}
                    >
                      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
                        <div>
                          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Plus size={18} className="text-blue-600" /> New Cleaning Request
                          </h3>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">Fill in the details below to create a booking.</p>
                        </div>
                        <button onClick={() => setIsAddOpen(false)} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleAdd} className="flex-1 overflow-y-auto p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Client / Company">
                            <CustomCombobox
                              clearText="Clear Selection"
                              options={companies.map(c => ({ id: c.id, label: c.name }))}
                              value={formData.company_id}
                              onChange={(val: string) => setFormData(f => ({ ...f, company_id: val, unit_id: '' }))}
                              placeholder="Type to search company..."
                            />
                          </Field>
                          <Field label="Unit Number">
                            <CustomCombobox
                              clearText="Clear Selection"
                              options={units.filter(u => formData.company_id ? u.company_id.toString() === formData.company_id : true).map(u => {
                                const comp = companies.find(c => c.id === u.company_id);
                                return {
                                  id: u.id,
                                  label: `${u.unit_number} - ${u.building_name} ${!formData.company_id && comp ? `(${comp.name})` : ''}`
                                };
                              })}
                              value={formData.unit_id}
                              onChange={(val: string) => {
                                const selectedUnitId = val;
                                if (!selectedUnitId) {
                                  setFormData(f => ({ ...f, unit_id: '' }));
                                } else {
                                  const selectedUnit = units.find(u => u.id.toString() === selectedUnitId);
                                  if (selectedUnit) {
                                    setFormData(f => ({
                                      ...f,
                                      unit_id: selectedUnitId,
                                      company_id: selectedUnit.company_id.toString()
                                    }));
                                  }
                                }
                              }}
                              placeholder="Type to search unit..."
                            />
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Date">
                            <input type="date" required className={inputCls}
                              value={formData.cleaning_date}
                              onChange={e => setFormData(f => ({ ...f, cleaning_date: e.target.value, assigned_team_id: '' }))} />
                          </Field>
                          <Field label="Time">
                            <input type="time" className={inputCls}
                              value={formData.cleaning_time}
                              onChange={e => setFormData(f => ({ ...f, cleaning_time: e.target.value }))} />
                          </Field>
                        </div>

                        <Field label="Service Type">
                          <select className={selectCls}
                            value={isCustomService ? 'Other' : formData.service_type}
                            onChange={e => {
                              if (e.target.value === 'Other') { setIsCustomService(true); setFormData(f => ({ ...f, service_type: '' })); }
                              else { setIsCustomService(false); setFormData(f => ({ ...f, service_type: e.target.value })); }
                            }}>
                            {['Check-out Cleaning', 'Deep Cleaning', 'General Cleaning', 'Sofa Bed setup'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            <option value="Other">Other (specify)</option>
                          </select>
                          {isCustomService && (
                            <motion.input
                              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                              required type="text" placeholder="Enter service name…"
                              className={inputCls + ' mt-2'}
                              value={formData.service_type}
                              onChange={e => setFormData(f => ({ ...f, service_type: e.target.value }))}
                            />
                          )}
                        </Field>

                        <Field label="Assign Checklist">
                          <select className={selectCls}
                            onChange={e => setFormData(f => ({ ...f, checklist_template_id: e.target.value }))}>
                            <option value="">No Checklist (Optional)</option>
                            {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                        </Field>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                          <Field label="Price (AED) — Optional">
                            <input type="number" placeholder="0.00" className={inputCls}
                              value={formData.price}
                              onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} />
                          </Field>
                          <Field label="Assign Team">
                            {!formData.cleaning_date ? (
                              <div className={inputCls + ' text-gray-400 italic'}>Select a date first</div>
                            ) : availableTeamsForAdd.length > 0 ? (
                              <select className={selectCls + ' bg-blue-50 border-blue-200'}
                                value={formData.assigned_team_id}
                                onChange={e => setFormData(f => ({ ...f, assigned_team_id: e.target.value }))}>
                                <option value="">Unassigned (Pending)</option>
                                {availableTeamsForAdd.map(t => (
                                  <option key={t.id} value={t.id}>{t.team_name}{getTeamAlert(t.id, formData.cleaning_date)}</option>
                                ))}
                              </select>
                            ) : (
                              <div className={inputCls + ' bg-red-50 text-red-600 font-bold text-xs'}>
                                No active teams for {format(parseISO(formData.cleaning_date), 'dd MMM')}
                              </div>
                            )}
                          </Field>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setIsAddOpen(false)}
                            className="w-1/3 py-3.5 text-gray-500 hover:bg-gray-100 rounded-xl font-black text-sm transition-colors">
                            Cancel
                          </button>
                          <button type="submit" disabled={saving}
                            className="w-2/3 py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all">
                            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Plus size={15} /> Confirm Booking</>}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ══ EDIT BOOKING SUB-MODAL ═══════════════════════════════ */}
              <AnimatePresence>
                {isEditOpen && editData && (
                  <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-6">
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setIsEditOpen(false)}
                      className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                    />
                    <motion.div
                      variants={formV}
                      initial="hidden" animate="visible" exit="exit"
                      transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                      className="relative w-full sm:max-w-2xl bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-10 flex flex-col overflow-hidden"
                      style={{ maxHeight: '88vh' }}
                    >
                      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
                        <div>
                          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Edit2 size={18} className="text-blue-600" /> Update Booking
                          </h3>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">Modify booking details below.</p>
                        </div>
                        <button onClick={() => setIsEditOpen(false)} className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Client / Company">
                            <select required className={selectCls}
                              value={editData.company_id}
                              onChange={e => setEditData(d => d ? { ...d, company_id: e.target.value, unit_id: '' } : d)}>
                              <option value="">Select Company</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </Field>
                          <Field label="Unit Number">
                            <select required disabled={!editData.company_id} className={selectCls + ' disabled:opacity-50'}
                              value={editData.unit_id}
                              onChange={e => setEditData(d => d ? { ...d, unit_id: e.target.value } : d)}>
                              <option value="">Select Unit</option>
                              {units.filter(u => u.company_id.toString() === editData.company_id)
                                .map(u => <option key={u.id} value={u.id}>{u.unit_number} – {u.building_name}</option>)}
                            </select>
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Date">
                            <input type="date" required className={inputCls}
                              value={editData.cleaning_date}
                              onChange={e => setEditData(d => d ? { ...d, cleaning_date: e.target.value, assigned_team_id: '' } : d)} />
                          </Field>
                          <Field label="Time">
                            <input type="time" className={inputCls}
                              value={editData.cleaning_time}
                              onChange={e => setEditData(d => d ? { ...d, cleaning_time: e.target.value } : d)} />
                          </Field>
                        </div>

                        <Field label="Service Type">
                          <select className={selectCls}
                            value={isEditCustomService ? 'Other' : editData.service_type}
                            onChange={e => {
                              if (e.target.value === 'Other') { setIsEditCustomService(true); setEditData(d => d ? { ...d, service_type: '' } : d); }
                              else { setIsEditCustomService(false); setEditData(d => d ? { ...d, service_type: e.target.value } : d); }
                            }}>
                            {['Check-out Cleaning', 'Deep Cleaning', 'General Cleaning', 'Sofa Bed setup'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                            <option value="Other">Other (specify)</option>
                          </select>
                          {isEditCustomService && (
                            <motion.input
                              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                              required type="text" placeholder="Enter service name…"
                              className={inputCls + ' mt-2'}
                              value={editData.service_type}
                              onChange={e => setEditData(d => d ? { ...d, service_type: e.target.value } : d)}
                            />
                          )}
                        </Field>

                        <Field label="Assign Checklist">
                          <select className={selectCls}
                            value={editData.checklist_template_id}
                            onChange={e => setEditData(d => d ? { ...d, checklist_template_id: e.target.value } : d)}>
                            <option value="">No Checklist (Optional)</option>
                            {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                        </Field>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                          <Field label="Price (AED)">
                            <input type="number" placeholder="0.00" className={inputCls}
                              value={editData.price}
                              onChange={e => setEditData(d => d ? { ...d, price: e.target.value } : d)} />
                          </Field>
                          <Field label="Assign / Change Team">
                            {!editData.cleaning_date ? (
                              <div className={inputCls + ' text-gray-400 italic'}>Select a date first</div>
                            ) : availableTeamsForEdit.length > 0 ? (
                              <select className={selectCls + ' bg-blue-50 border-blue-200'}
                                value={editData.assigned_team_id}
                                onChange={e => setEditData(d => d ? { ...d, assigned_team_id: e.target.value } : d)}>
                                <option value="">Unassigned</option>
                                {availableTeamsForEdit.map(t => (
                                  <option key={t.id} value={t.id}>{t.team_name}{getTeamAlert(t.id, editData.cleaning_date, editData.id)}</option>
                                ))}
                              </select>
                            ) : (
                              <div className={inputCls + ' bg-red-50 text-red-600 font-bold text-xs'}>
                                No active teams for {format(parseISO(editData.cleaning_date), 'dd MMM')}
                              </div>
                            )}
                          </Field>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setIsEditOpen(false)}
                            className="w-1/3 py-3.5 text-gray-500 hover:bg-gray-100 rounded-xl font-black text-sm transition-colors">
                            Cancel
                          </button>
                          <button type="submit" disabled={saving}
                            className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all">
                            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={15} /> Save Changes</>}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── SmartMenu — fixed-position dropdown that opens toward available space ──────

function SmartMenu({
  isOpen, onToggle, onEdit, onDelete,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  // Calculate position on each render when open
  const getStyle = (): React.CSSProperties => {
    if (!btnRef.current) return {};
    const r = btnRef.current.getBoundingClientRect();
    const menuH = 88; // approx height of 2-item menu
    const menuW = 144;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceRight = window.innerWidth - r.left;

    const top    = spaceBelow >= menuH + 8 ? r.bottom + 8 : r.top - menuH - 8;
    const left   = spaceRight >= menuW     ? r.left        : r.right - menuW;

    return { position: 'fixed', top, left, width: menuW, zIndex: 9999 };
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={onToggle}
        className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all"
      >
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            style={getStyle()}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring' as const, stiffness: 420, damping: 28 }}
            className="bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={onEdit}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={onDelete}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}