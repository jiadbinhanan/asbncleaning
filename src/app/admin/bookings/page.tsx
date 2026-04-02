'use client';
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Clock, Home, Users, CheckCircle2, AlertCircle, 
  Loader2, X, MoreVertical, Trash2, Edit2, Filter, FilterX, ClipboardList,
  Search, Zap, RotateCcw, Download, FileSpreadsheet, LayoutDashboard
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
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
    companies: { id: number, name: string }
  };
  teams?: { team_name: string };
  checklist_templates?: { title: string };
};

type Team = {
  id: number;
  team_name: string;
  shift_date: string;
};

export default function BookingManagement() {
  const supabase = createClient();

  // States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  // UPGRADE 4: Activate/Undo loading state
  const [activatingId, setActivatingId] = useState<number | null>(null);
  // UPGRADE 8: Save button loading state
  const [saving, setSaving] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  // UPGRADE 2: Search bar state
  const [searchQuery, setSearchQuery] = useState("");
  // UPGRADE 1: Date range (replaces single filterDate)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form States (Add Booking)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCustomService, setIsCustomService] = useState(false);

  const [formData, setFormData] = useState({
    company_id: "",
    unit_id: "",
    cleaning_date: format(new Date(), "yyyy-MM-dd"),
    cleaning_time: "09:00",
    service_type: "Check-out Cleaning",
    assigned_team_id: "",
    checklist_template_id: "",
    price: ""
  });

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditCustomService, setIsEditCustomService] = useState(false);
  const [editData, setEditData] = useState<{
    id: number,
    company_id: string,
    unit_id: string,
    cleaning_date: string,
    cleaning_time: string,
    service_type: string,
    price: string,
    assigned_team_id: string,
    checklist_template_id: string
  } | null>(null);

  // UPGRADE 3: Fetch ALL static data once on mount
  useEffect(() => {
    const fetchStaticData = async () => {
      const [companiesRes, unitsRes, checklistsRes, teamsRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('units').select('*'),
        supabase.from('checklist_templates').select('id, title'),
        supabase.from('teams').select('id, team_name, shift_date').eq('status', 'active')
      ]);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
      if (checklistsRes.data) setChecklists(checklistsRes.data);
      if (teamsRes.data) setActiveTeams(teamsRes.data as Team[]);
    };
    fetchStaticData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UPGRADE 1: Fetch bookings by date range
  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_ref, created_at, unit_id, cleaning_date, cleaning_time, service_type, status, price, assigned_team_id, checklist_template_id,
        units ( 
          id, company_id, unit_number, building_name,
          companies ( id, name )
        ),
        teams:assigned_team_id ( team_name ),
        checklist_templates ( title )
      `)
      .gte('cleaning_date', dateFrom)
      .lte('cleaning_date', dateTo)
      .order("cleaning_date", { ascending: false })
      .order("cleaning_time", { ascending: true });

    if (data) setBookings(data as any);
    if (error) toast.error("Failed to load bookings");
    setLoading(false);
  };

  // Re-fetch when date range changes
  useEffect(() => {
    if (dateFrom && dateTo) fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if(activeMenuId !== null) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  // UPGRADE 5: Team availability check
  const getTeamAssignmentAlert = (teamId: number, date: string, currentBookingId?: number) => {
    const isBusy = bookings.some(b => 
      b.assigned_team_id === teamId && 
      b.cleaning_date === date && 
      b.id !== currentBookingId &&
      ['pending', 'active', 'in_progress'].includes(b.status)
    );
    return isBusy ? " (Assigned with another booking)" : "";
  };

  // UPGRADE 5: Teams available for selected add-form date
  const availableTeamsForAddDate = useMemo(() => {
    if (!formData.cleaning_date) return [];
    return activeTeams.filter(t => t.shift_date === formData.cleaning_date);
  }, [activeTeams, formData.cleaning_date]);

  // UPGRADE 5: Teams available for selected edit-form date
  const availableTeamsForEditDate = useMemo(() => {
    if (!editData?.cleaning_date) return [];
    return activeTeams.filter(t => t.shift_date === editData.cleaning_date);
  }, [activeTeams, editData?.cleaning_date]);

  // 3. Add Booking
  const handleAddBooking = async (e: React.FormEvent) => {
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
      status: 'pending'
    }]);

    if (!error) {
      toast.success("Booking recorded!");
      fetchBookings();
      setIsAddOpen(false);
      setFormData({ ...formData, unit_id: "", assigned_team_id: "", price: "", checklist_template_id: "" });
    } else {
      toast.error("Error creating: " + error.message);
    }
    setSaving(false);
  };

  // 4. Update Booking
  const handleUpdateBooking = async (e: React.FormEvent) => {
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
      checklist_template_id: editData.checklist_template_id ? parseInt(editData.checklist_template_id) : null
    }).eq('id', editData.id);

    if (!error) {
      toast.success("Updated successfully!");
      fetchBookings();
      setIsEditOpen(false);
    } else {
      toast.error("Error updating: " + error.message);
    }
    setSaving(false);
  };

  // 5. Delete Booking
  const handleDeleteBooking = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-gray-800 text-sm">Are you sure you want to delete this record?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-black">Cancel</button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from("bookings").delete().eq("id", id);
              if (!error) { setBookings(prev => prev.filter(b => b.id !== id)); toast.success("Deleted!", { duration: 3000 }); }
              else toast.error("Error: " + error.message, { duration: 3000 });
            }}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black"
          >Delete</button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  // UPGRADE 4: Toggle Activation with Optimistic UI
  const handleToggleActivation = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'active' : 'pending';
    setActivatingId(id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error("Failed to update status. Reverting...");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: currentStatus } : b));
    } else {
      toast.success(`Booking ${newStatus === 'active' ? 'Activated' : 'reverted to Pending'}!`, {
        icon: newStatus === 'active' ? '⚡' : '🔄', duration: 3000
      });
    }
    setActivatingId(null);
  };

  // 6. Filters — UPGRADE 2 (search) + UPGRADE 6 (extended statuses)
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        b.booking_ref?.toLowerCase().includes(q) ||
        b.units?.companies?.name?.toLowerCase().includes(q) ||
        b.units?.unit_number?.toLowerCase().includes(q) ||
        b.units?.building_name?.toLowerCase().includes(q);

      const matchesCompany = !filterCompany || b.units?.companies?.name === filterCompany;
      const matchesStatus = !filterStatus || b.status === filterStatus;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [bookings, searchQuery, filterCompany, filterStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCompany("");
    setFilterStatus("");
  };

  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.cleaning_date]) groups[b.cleaning_date] = [];
      groups[b.cleaning_date].push(b);
    });
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    return groups;
  }, [filteredBookings]);

  const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Stats Calculation
  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    active: bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length,
  }), [bookings]);

  // Export Functions
  const handleExportExcel = () => {
    if (filteredBookings.length === 0) return toast.error("No data to export!");
    const headers = ["Booking Ref", "Date", "Time", "Company", "Unit", "Service Type", "Status", "Team Assigned", "Price (AED)"];
    const csvContent = [
      headers.join(","),
      ...filteredBookings.map(b => [
        `"${b.booking_ref || ''}"`,
        `"${format(parseISO(b.cleaning_date), 'dd-MMM-yyyy')}"`,
        `"${b.cleaning_time}"`,
        `"${b.units?.companies?.name || ''}"`,
        `"Unit ${b.units?.unit_number}"`,
        `"${b.service_type}"`,
        `"${b.status}"`,
        `"${b.teams?.team_name || 'Unassigned'}"`,
        `"${b.price}"`
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BTM_Bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel (CSV) downloaded successfully!");
  };

  const handleExportPDF = () => {
    if (filteredBookings.length === 0) return toast.error("No data to export!");
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Please allow popups to generate PDF.");
    const tableRows = filteredBookings.map(b => `
      <tr>
        <td>${format(parseISO(b.cleaning_date), 'dd-MMM-yyyy')} <br/> <span style="color:#64748b; font-size:11px; font-weight:bold;">${b.cleaning_time}</span></td>
        <td style="font-weight: 800; color: #3b82f6;">${b.booking_ref || 'N/A'}</td>
        <td style="font-weight: 700;">${b.units?.companies?.name || 'N/A'}</td>
        <td>Unit ${b.units?.unit_number}<br/><span style="color:#64748b; font-size:11px;">${b.units?.building_name}</span></td>
        <td>${b.service_type}</td>
        <td><span class="status ${b.status}">${b.status.toUpperCase()}</span></td>
        <td style="font-weight: 600;">${b.teams?.team_name || '<span style="color:#94a3b8">Unassigned</span>'}</td>
      </tr>
    `).join('');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BTM Cleaning Services - Booking Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 30px; background: #fff; }
          .header { text-align: center; padding: 25px 20px; background: #0f172a; color: white; border-radius: 8px; margin-bottom: 20px; -webkit-print-color-adjust: exact; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #f8fafc; }
          .header p { margin: 6px 0 0; color: #cbd5e1; font-size: 13px; font-weight: 600; letter-spacing: 1px; }
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 12px 20px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #e2e8f0; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 800; border-bottom: 2px solid #cbd5e1; -webkit-print-color-adjust: exact; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: middle; }
          tr:nth-child(even) { background-color: #f8fafc; -webkit-print-color-adjust: exact; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; border: 1px solid #e2e8f0; }
          .status.pending { background: #fef3c7; color: #b45309; border-color: #fde68a; }
          .status.active { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
          .status.completed { background: #d1fae5; color: #047857; border-color: #a7f3d0; }
          .status.finalized { background: #ccfbf1; color: #0f766e; border-color: #99f6e4; }
          .status.in_progress { background: #f3e8ff; color: #6d28d9; border-color: #e9d5ff; }
          @page { size: landscape; margin: 10mm; }
          @media print { body { padding: 0; } .header { border-radius: 0; padding: 15px; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BTM CLEANING SERVICES</h1>
          <p>BOOKING & OPERATIONS REPORT</p>
        </div>
        <div class="meta-info">
          <span>DATE RANGE: ${format(parseISO(dateFrom), 'dd MMM yyyy')} to ${format(parseISO(dateTo), 'dd MMM yyyy')}</span>
          <span>TOTAL BOOKINGS: ${filteredBookings.length}</span>
          <span>GENERATED: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Schedule</th>
              <th>Booking Ref</th>
              <th>Company</th>
              <th>Unit Details</th>
              <th>Service Required</th>
              <th>Status</th>
              <th>Assigned Team</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <script>
          window.onload = function() { setTimeout(() => window.print(), 500); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen pb-10">
      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 4000 }} />

      {/* Header with Gradient & Stats */}
      <div className='bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-8 pb-12 md:pb-16 px-4 md:px-8 shadow-2xl relative z-10 mb-6 rounded-3xl overflow-hidden'>
        <div className='absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none'></div>
        <div className='absolute bottom-0 left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none'></div>

        <div className='max-w-7xl mx-auto relative z-20'>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
              <p className='text-blue-300 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2'>
                <LayoutDashboard size={14}/> Operations Control
              </p>
              <h1 className='text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3'>
                <ClipboardList className='text-blue-500' size={28}/> Booking Management
              </h1>
            </div>

            <div className="flex gap-3 w-full md:w-auto flex-wrap">
              <button onClick={handleExportExcel} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2">
                <FileSpreadsheet size={16}/> Export Excel
              </button>
              <button onClick={handleExportPDF} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2">
                <Download size={16}/> Export PDF
              </button>
              <button onClick={() => setShowFilters(!showFilters)} className={`px-5 py-2 rounded-xl font-black transition-all flex items-center justify-center gap-2 border text-xs w-full md:w-auto ${showFilters ? 'bg-white text-gray-900 border-white' : 'bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-md'}`}>
                <Filter size={18}/> Filters {showFilters && <X size={14}/>}
              </button>
              <button onClick={() => setIsAddOpen(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 border border-blue-500/50 backdrop-blur-md w-full md:w-auto text-xs">
                <Plus size={18} strokeWidth={3}/> New Booking
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Records</p>
              <p className="text-xl font-black text-white">{stats.total}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Pending Assignment</p>
              <p className="text-xl font-black text-amber-50">{stats.pending}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Active (Live)</p>
              <p className="text-xl font-black text-blue-50">{stats.active}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Completed Jobs</p>
              <p className="text-xl font-black text-emerald-50">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* UPGRADE 2: Always-visible Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by Ref, Company, Unit or Building..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 transition-all"
        />
      </div>

      {/* Filters Panel (Original design + UPGRADE 1: Date Range) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* UPGRADE 1: Date From */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date From</label>
                <input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              {/* UPGRADE 1: Date To */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date To</label>
                <input type="date" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Company</label>
                <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {/* UPGRADE 6: Extended status options */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</label>
                <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active (Live)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <button onClick={clearFilters} className="w-full py-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg font-bold flex justify-center items-center gap-2 transition-all">
                  <FilterX size={18} /> Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookings List (Grouped by Date) — Original design preserved */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
          <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-500 font-bold">No bookings found</h3>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your dates or filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => {
            const dayBookings = groupedBookings[date];
            return (
              <div key={date} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center gap-3 pl-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={18} /></div>
                  <h2 className="text-lg font-bold text-gray-800">{format(parseISO(date), 'EEEE, dd MMM yyyy')}</h2>
                  <div className="h-px bg-gray-200 flex-1 ml-4"></div>
                </div>

                {dayBookings.map((booking) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow relative"
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${booking.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Home size={24} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            Added: {format(parseISO(booking.created_at), 'hh:mm a')}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-bold text-[10px] rounded mb-1 inline-block uppercase tracking-wider">
                          {booking.booking_ref || `ID-${booking.id}`}
                        </span>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight truncate">Unit {booking.units?.unit_number}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{booking.units?.companies?.name} • {booking.units?.building_name}</p>
                      </div>
                    </div>

                    {/* Right Side Info */}
                    <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-4 mt-4 md:mt-0 shrink-0">

                      {/* Time */}
                      <div className="md:w-[80px] shrink-0">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Time</p>
                        <p className="text-xs font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                          <Clock size={12} className="text-blue-500 shrink-0" /> <span className="truncate">{booking.cleaning_time}</span>
                        </p>
                      </div>

                      {/* Service & Checklist */}
                      <div className="md:w-[130px] shrink-0 overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Service</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking.service_type}</p>
                        {booking.checklist_templates ? (
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <ClipboardList size={10} className="shrink-0" /> <span className="truncate">{booking.checklist_templates.title}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-orange-500 italic mt-0.5">No checklist</p>
                        )}
                      </div>

                      {/* Team */}
                      <div className="md:w-[130px] shrink-0 overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Team</p>
                        {booking.teams ? (
                          <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1 text-gray-800 truncate">
                            <Users size={14} className="shrink-0" /> <span className="truncate">{booking.teams.team_name}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-orange-500 font-bold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md w-fit">
                            <AlertCircle size={14} className="shrink-0" /> Unassigned
                          </span>
                        )}
                      </div>

                      {/* Price & Status */}
                      <div className="md:w-[90px] shrink-0 flex flex-col items-start md:items-end gap-2 col-span-2 md:col-span-1">
                        {/* UPGRADE 6: Extended status colors */}
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          ['completed', 'finalized'].includes(booking.status) ? 'bg-green-100 text-green-700' :
                          booking.status === 'in_progress' ? 'bg-violet-100 text-violet-700' :
                          booking.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {booking.status}
                        </span>

                        {booking.price > 0 ? (
                          <p className="text-xs text-green-600 font-black tracking-wide truncate">AED {booking.price}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400 font-bold italic flex items-center gap-1">
                            <AlertCircle size={10} className="shrink-0" /> No Price
                          </p>
                        )}
                      </div>
                    </div>

                    {/* UPGRADE 4: Activate/Undo + 3-dot menu */}
                    <div className="flex items-center gap-2 shrink-0">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleToggleActivation(booking.id, 'pending')}
                          disabled={activatingId === booking.id}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-70 active:scale-95"
                        >
                          {activatingId === booking.id ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="fill-white"/>}
                          Activate
                        </button>
                      )}

                      {booking.status === 'active' && (
                        <button
                          onClick={() => handleToggleActivation(booking.id, 'active')}
                          disabled={activatingId === booking.id}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-70 active:scale-95"
                        >
                          {activatingId === booking.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                          Active <RotateCcw size={11} className="ml-0.5 text-blue-400"/>
                        </button>
                      )}

                      {/* 3 Dot Menu */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === booking.id ? null : booking.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                          <MoreVertical size={20} />
                        </button>

                        {activeMenuId === booking.id && (
                          <div className="absolute right-0 top-10 w-48 bg-white border border-gray-100 shadow-xl rounded-xl z-20 overflow-hidden">
                            <button 
                              onClick={() => {
                                const isCustom = !["Check-out Cleaning", "Deep Cleaning", "General Cleaning", "Sofa Bed setup"].includes(booking.service_type);
                                setIsEditCustomService(isCustom);
                                setEditData({ 
                                  id: booking.id, 
                                  company_id: booking.units?.company_id?.toString() || "",
                                  unit_id: booking.unit_id?.toString() || "",
                                  cleaning_date: booking.cleaning_date || "",
                                  cleaning_time: booking.cleaning_time || "",
                                  service_type: booking.service_type || "",
                                  price: booking.price?.toString() || "",
                                  assigned_team_id: booking.assigned_team_id?.toString() || "",
                                  checklist_template_id: booking.checklist_template_id?.toString() || "" 
                                });
                                setIsEditOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium border-b border-gray-100">
                              <Edit2 size={16} /> Edit Details
                            </button>

                            <button 
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium">
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD BOOKING MODAL --- */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">New Cleaning Request</h2>
                <button onClick={() => setIsAddOpen(false)}><X className="text-gray-500" /></button>
              </div>

              <form onSubmit={handleAddBooking} className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client / Company</label>
                    <select required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      onChange={(e) => setFormData({...formData, company_id: e.target.value, unit_id: ""})}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Number</label>
                    <select required disabled={!formData.company_id} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 font-medium"
                      onChange={(e) => setFormData({...formData, unit_id: e.target.value})}>
                      <option value="">Select Unit</option>
                      {units.filter(u => u.company_id.toString() === formData.company_id).map(u => (
                        <option key={u.id} value={u.id}>{u.unit_number} - {u.building_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                    {/* UPGRADE 7: Reset team on date change */}
                    <input type="date" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={formData.cleaning_date}
                      onChange={(e) => setFormData({...formData, cleaning_date: e.target.value, assigned_team_id: ""})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time</label>
                    <input type="time" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={formData.cleaning_time} onChange={(e) => setFormData({...formData, cleaning_time: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service Type</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                    value={isCustomService ? "Other" : formData.service_type}
                    onChange={(e) => {
                      if (e.target.value === "Other") { setIsCustomService(true); setFormData({...formData, service_type: ""}); } 
                      else { setIsCustomService(false); setFormData({...formData, service_type: e.target.value}); }
                    }}>
                    <option value="Check-out Cleaning">Check-out Cleaning</option>
                    <option value="Deep Cleaning">Deep Cleaning</option>
                    <option value="General Cleaning">General Cleaning</option>
                    <option value="Sofa Bed setup">Sofa Bed setup</option>
                    <option value="Other">Other (Please specify)</option>
                  </select>
                  {isCustomService && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <input type="text" required={isCustomService} placeholder="Enter service name..."
                        className="w-full p-3.5 bg-white border border-blue-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                        value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})} />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assign Checklist</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                    onChange={(e) => setFormData({...formData, checklist_template_id: e.target.value})}>
                    <option value="">Select a Checklist (Optional)</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (AED) - Optional</label>
                    <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                  </div>

                  {/* UPGRADE 5: Team filtered by selected date */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Assign Team</label>
                    {formData.cleaning_date ? (
                      availableTeamsForAddDate.length > 0 ? (
                        <select
                          className="w-full p-3.5 bg-blue-50 border border-blue-100 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 font-medium cursor-pointer"
                          value={formData.assigned_team_id}
                          onChange={(e) => setFormData({...formData, assigned_team_id: e.target.value})}>
                          <option value="">Unassigned (Pending)</option>
                          {availableTeamsForAddDate.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.team_name}{getTeamAssignmentAlert(t.id, formData.cleaning_date)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full p-3.5 bg-red-50 border border-red-100 rounded-xl mt-1 text-sm font-bold text-red-600">
                          No active teams for {format(parseISO(formData.cleaning_date), 'dd MMM yyyy')}.
                        </div>
                      )
                    ) : (
                      <div className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-bold text-gray-400">
                        Select a date first.
                      </div>
                    )}
                  </div>
                </div>

                {/* UPGRADE 8: Saving state */}
                <button type="submit" disabled={saving} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl mt-4 shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {saving ? <><Loader2 size={18} className="animate-spin"/> Saving...</> : "Confirm Booking"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT BOOKING MODAL --- */}
      <AnimatePresence>
        {isEditOpen && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Update Booking Details</h2>
                <button onClick={() => setIsEditOpen(false)}><X className="text-gray-500" /></button>
              </div>

              <form onSubmit={handleUpdateBooking} className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client / Company</label>
                    <select required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={editData.company_id}
                      onChange={(e) => setEditData({...editData, company_id: e.target.value, unit_id: ""})}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Number</label>
                    <select required disabled={!editData.company_id} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 font-medium"
                      value={editData.unit_id} onChange={(e) => setEditData({...editData, unit_id: e.target.value})}>
                      <option value="">Select Unit</option>
                      {units.filter(u => u.company_id.toString() === editData.company_id).map(u => (
                        <option key={u.id} value={u.id}>{u.unit_number} - {u.building_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</label>
                    {/* UPGRADE 7: Reset team on date change in edit form */}
                    <input type="date" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={editData.cleaning_date}
                      onChange={(e) => setEditData({...editData, cleaning_date: e.target.value, assigned_team_id: ""})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time</label>
                    <input type="time" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={editData.cleaning_time} onChange={(e) => setEditData({...editData, cleaning_time: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service Type</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                    value={isEditCustomService ? "Other" : editData.service_type}
                    onChange={(e) => {
                      if (e.target.value === "Other") { setIsEditCustomService(true); setEditData({...editData, service_type: ""}); } 
                      else { setIsEditCustomService(false); setEditData({...editData, service_type: e.target.value}); }
                    }}>
                    <option value="Check-out Cleaning">Check-out Cleaning</option>
                    <option value="Deep Cleaning">Deep Cleaning</option>
                    <option value="General Cleaning">General Cleaning</option>
                    <option value="Sofa Bed setup">Sofa Bed setup</option>
                    <option value="Other">Other (Please specify)</option>
                  </select>
                  {isEditCustomService && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <input type="text" required={isEditCustomService} placeholder="Enter service name..."
                        className="w-full p-3.5 bg-white border border-blue-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                        value={editData.service_type} onChange={(e) => setEditData({...editData, service_type: e.target.value})} />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assign Checklist</label>
                  <select className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                    value={editData.checklist_template_id} onChange={(e) => setEditData({...editData, checklist_template_id: e.target.value})}>
                    <option value="">Select a Checklist (Optional)</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (AED)</label>
                    <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      value={editData.price} onChange={(e) => setEditData({...editData, price: e.target.value})} />
                  </div>

                  {/* UPGRADE 5: Team filtered by selected date in edit form */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Assign / Change Team</label>
                    {editData.cleaning_date ? (
                      availableTeamsForEditDate.length > 0 ? (
                        <select
                          className="w-full p-3.5 bg-blue-50 border border-blue-100 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 font-medium cursor-pointer"
                          value={editData.assigned_team_id}
                          onChange={(e) => setEditData({...editData, assigned_team_id: e.target.value})}>
                          <option value="">Unassigned</option>
                          {availableTeamsForEditDate.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.team_name}{getTeamAssignmentAlert(t.id, editData.cleaning_date, editData.id)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full p-3.5 bg-red-50 border border-red-100 rounded-xl mt-1 text-sm font-bold text-red-600">
                          No active teams for {format(parseISO(editData.cleaning_date), 'dd MMM yyyy')}.
                        </div>
                      )
                    ) : (
                      <div className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-bold text-gray-400">
                        Select a date first.
                      </div>
                    )}
                  </div>
                </div>

                {/* UPGRADE 8: Saving state on edit button */}
                <button type="submit" disabled={saving} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl mt-4 shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {saving ? <><Loader2 size={18} className="animate-spin"/> Saving...</> : "Save Changes"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}