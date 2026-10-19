'use client';
import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Plus, Clock, Home, Users, CheckCircle2, AlertCircle, 
  X, MoreVertical, Trash2, Edit2, Filter, FilterX, ClipboardList,
  Search, Zap, RotateCcw, Download, FileSpreadsheet, LayoutDashboard,
  ShieldCheck, ChevronDown
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import toast, { Toaster } from 'react-hot-toast';

import AdminDutyModal from './AdminDutyModal'; 
import AdminEditLogModal from './AdminEditLogModal'; 
import { TableSkeleton } from "@/components/common/Skeleton";
import DotsLoader from "@/components/common/DotsLoader";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Kbd from "@/components/common/Kbd";

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

// --- Custom Combobox Component (Searchable Dropdown with Keyboard Nav) ---
function CustomCombobox({ options, value, onChange, placeholder, clearText = "Select Option", disabled = false }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options and add a "Clear / Select..." option at the top
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
    // Reset highlight when search changes or opens
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
          className="w-full p-3.5 pr-10 bg-gray-50 dark:bg-[#11192e] border border-gray-200 dark:border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium disabled:opacity-50 transition-all cursor-text placeholder-gray-400 dark:placeholder-slate-500"
          placeholder={placeholder}
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : "")}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm(""); // Allow fresh search
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
          className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50 outline-none"
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
            className="absolute z-50 w-full mt-1 bg-white dark:bg-[#11192e] border border-gray-100 dark:border-slate-700/80 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] max-h-60 overflow-y-auto"
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
                  className={`p-3 cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 dark:border-slate-800 last:border-0 ${
                    index === highlightedIndex
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  } ${opt.id === "" ? 'text-gray-400 dark:text-slate-500 italic bg-gray-50/50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800' : ''}`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-400 dark:text-slate-500 text-center font-medium">No results found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Duty Modal States ---
  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [selectedBookingIdForDuty, setSelectedBookingIdForDuty] = useState<string | null>(null);

  // --- Edit Log Modal States ---
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [selectedBookingIdForEditLog, setSelectedBookingIdForEditLog] = useState<string | null>(null);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form States (Add Booking)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts for Bookings Page
  useKeyboardShortcuts([
    {
      key: 'n',
      altKey: true,
      onKeyDown: () => setIsAddOpen(true),
      description: 'Create New Booking',
      category: 'Actions',
    },
    {
      key: 'r',
      altKey: true,
      onKeyDown: () => {
        fetchBookings();
        toast.success("Bookings refreshed");
      },
      description: 'Refresh Bookings list',
      category: 'Actions',
    },
    {
      key: 'e',
      altKey: true,
      onKeyDown: () => handleExportExcel(),
      description: 'Export Bookings to Excel',
      category: 'Actions',
    },
    {
      key: 'f',
      altKey: true,
      onKeyDown: () => setShowFilters((prev) => !prev),
      description: 'Toggle Filter bar',
      category: 'Actions',
    },
    {
      key: '/',
      onKeyDown: () => {
        searchInputRef.current?.focus();
      },
      description: 'Focus Booking Search',
      category: 'Actions',
    },
  ]);
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

  useEffect(() => {
    if (dateFrom && dateTo) fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if(activeMenuId !== null) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const getTeamAssignmentAlert = (teamId: number, date: string, currentBookingId?: number) => {
    const isBusy = bookings.some(b => 
      b.assigned_team_id === teamId && 
      b.cleaning_date === date && 
      b.id !== currentBookingId &&
      ['pending', 'active', 'in_progress'].includes(b.status)
    );
    return isBusy ? " (Assigned with another booking)" : "";
  };

  const availableTeamsForAddDate = useMemo(() => {
    if (!formData.cleaning_date) return [];
    return activeTeams.filter(t => t.shift_date === formData.cleaning_date);
  }, [activeTeams, formData.cleaning_date]);

  const availableTeamsForEditDate = useMemo(() => {
    if (!editData?.cleaning_date) return [];
    return activeTeams.filter(t => t.shift_date === editData.cleaning_date);
  }, [activeTeams, editData?.cleaning_date]);

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
      setFormData({ ...formData, unit_id: "", company_id: "", assigned_team_id: "", price: "", checklist_template_id: "" });
    } else {
      toast.error("Error creating: " + error.message);
    }
    setSaving(false);
  };

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

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    active: bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => b.status === 'completed' || b.status === 'finalized').length,
  }), [bookings]);

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

  // --- Dynamic Styling Helpers (Soft Aura & Borders - Glow on Hover Only in Dark Mode) ---
  const getCardStyle = (status: string) => {
    switch (status) {
      case 'pending': 
        return 'bg-white dark:bg-[#0c1427] border-amber-200 dark:border-slate-800/90 shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)] dark:shadow-none hover:shadow-[0_0_25px_-5px_rgba(251,191,36,0.4)] dark:hover:border-amber-400/70 dark:hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300';
      case 'active': 
        return 'bg-white dark:bg-[#0c1427] border-blue-200 dark:border-slate-800/90 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] dark:shadow-none hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.4)] dark:hover:border-blue-400/70 dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.28)] transition-all duration-300';
      case 'in_progress': 
        return 'bg-white dark:bg-[#0c1427] border-violet-200 dark:border-slate-800/90 shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] dark:shadow-none hover:shadow-[0_0_25px_-5px_rgba(139,92,246,0.4)] dark:hover:border-violet-400/70 dark:hover:shadow-[0_0_30px_rgba(139,92,246,0.28)] transition-all duration-300';
      case 'completed': 
        return 'bg-white dark:bg-[#0c1427] border-teal-200 dark:border-slate-800/90 shadow-[0_0_20px_-5px_rgba(20,184,166,0.3)] dark:shadow-none hover:shadow-[0_0_25px_-5px_rgba(20,184,166,0.4)] dark:hover:border-emerald-400/70 dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300';
      case 'finalized': 
        return 'bg-white dark:bg-[#0c1427] border-green-200 dark:border-slate-800/90 shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)] dark:shadow-none hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.4)] dark:hover:border-cyan-400/70 dark:hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all duration-300';
      default: 
        return 'bg-white dark:bg-[#0c1427] border-gray-100 dark:border-slate-800/90 hover:border-gray-200 dark:hover:border-slate-700 shadow-sm dark:shadow-none dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.08)] transition-all duration-300';
    }
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30';
      case 'active': return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30';
      case 'in_progress': return 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-500/30';
      case 'completed': return 'bg-teal-100 dark:bg-sky-950/40 text-teal-700 dark:text-sky-300 border border-teal-300 dark:border-sky-500/30';
      case 'finalized': return 'bg-green-100 dark:bg-cyan-950/40 text-green-700 dark:text-cyan-300 border border-emerald-300 dark:border-cyan-500/30';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700';
    }
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30';
      case 'active': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30';
      case 'in_progress': return 'text-violet-500 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30';
      case 'completed': return 'text-teal-500 bg-teal-50 dark:bg-sky-950/40 dark:text-sky-400 border border-teal-200 dark:border-sky-500/30';
      case 'finalized': return 'text-green-600 bg-green-50 dark:bg-cyan-950/40 dark:text-cyan-400 border border-emerald-200 dark:border-cyan-500/30';
      default: return 'text-gray-500 bg-gray-50 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="min-h-screen pb-10 p-2 md:p-4 w-full max-w-full overflow-x-hidden">
      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 4000 }} />

      {/* ── MOBILE APP-OPTIMIZED STICKY HEADER (md:hidden) ── */}
      <div className="md:hidden sticky top-16 z-30 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-cyan-500/20 shadow-sm transition-colors mb-3 -mx-2 px-3 pt-2.5 pb-2">
        {/* Top Row: Title + Action Icons */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <ClipboardList size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">
                Bookings
              </h1>
              <p className="text-[10px] font-bold text-gray-500 dark:text-cyan-300/80">
                {filteredBookings.length} records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Search Toggle */}
            <button
              onClick={() => {
                setShowMobileSearch(prev => !prev);
                if (showFilters) setShowFilters(false);
              }}
              className={`p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
                searchQuery || showMobileSearch ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30' : ''
              }`}
              title="Search"
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Filter Toggle */}
            <button
              onClick={() => {
                setShowFilters(prev => !prev);
                if (showMobileSearch) setShowMobileSearch(false);
              }}
              className={`relative p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
                showFilters || filterCompany || filterStatus ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30' : ''
              }`}
              title="Filters"
              aria-label="Filters"
            >
              <Filter size={16} />
              {(filterCompany || filterStatus) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0c1427]" />
              )}
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              title="Export Excel"
              aria-label="Export Excel"
            >
              <FileSpreadsheet size={16} />
            </button>

            {/* New Booking Button */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-sm active:scale-95"
            >
              <Plus size={14} strokeWidth={3} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Micro 4-Metric Bar */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <div className="bg-gray-50 dark:bg-[#070b14] border border-gray-100 dark:border-slate-800/80 rounded-lg px-2 py-1 text-center">
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Total</p>
            <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{stats.total}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 text-center">
            <p className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Pending</p>
            <p className="text-xs font-black text-amber-600 dark:text-amber-400 leading-tight">{stats.pending}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1 text-center">
            <p className="text-[8px] font-black uppercase text-blue-500 tracking-wider">Active</p>
            <p className="text-xs font-black text-blue-600 dark:text-blue-400 leading-tight">{stats.active}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 text-center">
            <p className="text-[8px] font-black uppercase text-emerald-500 tracking-wider">Done</p>
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-tight">{stats.completed}</p>
          </div>
        </div>

        {/* Collapsible Mobile Search */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pt-2 overflow-hidden"
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search ref, company, unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <Search size={14} className="absolute left-2.5 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DESKTOP HEADER (hidden md:block — 100% untouched) ── */}
      <div className="hidden md:block">
        <div className='bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-6 pb-6 px-4 md:px-8 shadow-2xl relative z-10 mb-4 rounded-3xl overflow-hidden dark:border dark:border-cyan-500/20 dark:shadow-[0_12px_40px_rgba(6,182,212,0.15)]'>
          {/* Light mode gradient */}
          <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

          {/* Dark mode multi-color cosmic gradient */}
          <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #050814 0%, #0d0f28 18%, #1a0b3b 38%, #0b224d 62%, #041226 82%, #020612 100%)' }} />

          {/* Dark mode luminous mesh orbs */}
          <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-violet-600/25 rounded-full blur-[100px] pointer-events-none' />
          <div className='absolute -top-10 right-1/4 w-80 h-80 hidden dark:block bg-cyan-500/20 rounded-full blur-[90px] pointer-events-none' />
          <div className='absolute bottom-0 right-0 w-96 h-96 hidden dark:block bg-pink-500/18 rounded-full blur-[100px] pointer-events-none' />
          <div className='absolute top-1/2 left-1/3 w-64 h-64 hidden dark:block bg-emerald-500/12 rounded-full blur-[80px] pointer-events-none' />

          {/* Dark mode SVG Organic Multi-Layer Fluid Waves */}
          <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="book-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                  <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.10" />
                </linearGradient>
                <linearGradient id="book-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity="0.30" />
                  <stop offset="40%" stopColor="#8B5CF6" stopOpacity="0.24" />
                  <stop offset="75%" stopColor="#06B6D4" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id="book-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C084FC" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#38BDF8" stopOpacity="0.95" />
                  <stop offset="85%" stopColor="#34D399" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="book-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F472B6" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#818CF8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
                </linearGradient>
                <filter id="book-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="book-glow-pink" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path d="M0,100 C320,30 560,170 860,80 C1160,0 1320,140 1440,70 L1440,320 L0,320 Z" fill="url(#book-grad-wave1)" />
              <path d="M0,100 C320,30 560,170 860,80 C1160,0 1320,140 1440,70" stroke="url(#book-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#book-glow-cyan)" />
              <path d="M0,150 C260,190 480,80 780,140 C1080,200 1280,90 1440,130 L1440,320 L0,320 Z" fill="url(#book-grad-wave2)" />
              <path d="M0,150 C260,190 480,80 780,140 C1080,200 1280,90 1440,130" stroke="url(#book-crest-2)" strokeWidth="2" strokeLinecap="round" filter="url(#book-glow-pink)" />
              <path d="M0,220 C360,260 680,170 1020,230 C1240,270 1380,200 1440,210" stroke="url(#book-crest-1)" strokeWidth="1.2" strokeDasharray="6 6" strokeOpacity="0.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Light mode decorative orbs */}
          <div className='absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden' />
          <div className='absolute bottom-0 left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none dark:hidden' />

          <div className='relative z-20'>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
              <div>
                <p className='text-blue-300 dark:text-cyan-300 font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-2'>
                  <LayoutDashboard size={12}/> Operations Control
                </p>
                <h1 className='text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3'>
                  <ClipboardList className='text-blue-500 dark:text-cyan-400' size={28}/> Booking Management
                </h1>
              </div>

              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <button 
                  onClick={handleExportExcel} 
                  title="Export Excel (Alt+E)"
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700/60 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14}/> Export Excel
                  <span className="hidden xl:inline text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-700">⌥E</span>
                </button>
                <button onClick={handleExportPDF} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/60 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <Download size={14}/> Export PDF
                </button>
                <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  title="Toggle Filters (Alt+F)"
                  className={`px-4 py-1.5 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 border text-xs w-full md:w-auto cursor-pointer ${showFilters ? 'bg-white text-gray-900 border-white' : 'bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-md'}`}
                >
                  <Filter size={15}/> Filters {showFilters && <X size={13}/>}
                  <span className="hidden xl:inline text-[9px] font-mono font-bold bg-white/20 px-1 py-0.2 rounded">⌥F</span>
                </button>
                <button 
                  onClick={() => setIsAddOpen(true)} 
                  title="Create New Booking (Alt+N)"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 border border-blue-500/50 w-full md:w-auto text-xs cursor-pointer"
                >
                  <Plus size={15} strokeWidth={3}/> New Booking
                  <span className="hidden xl:inline text-[9px] font-mono font-bold bg-blue-700 px-1 py-0.2 rounded border border-blue-400/30">⌥N</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 backdrop-blur-sm flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Records</p>
                  <p className="text-base font-black text-white leading-tight">{stats.total}</p>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 backdrop-blur-sm flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Pending</p>
                  <p className="text-base font-black text-amber-50 leading-tight">{stats.pending}</p>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 backdrop-blur-sm flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Active (Live)</p>
                  <p className="text-base font-black text-blue-50 leading-tight">{stats.active}</p>
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 backdrop-blur-sm flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Completed</p>
                  <p className="text-base font-black text-emerald-50 leading-tight">{stats.completed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Search Bar (Hidden on Mobile) */}
      <div className="relative mb-4 hidden md:block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search by Ref, Company, Unit or Building... (Press / to focus)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-14 py-3 bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-md outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-all"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <Kbd size="xs" variant="default" keys={['/']} />
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-2xl shadow-sm dark:shadow-md border border-gray-100 dark:border-slate-800 mb-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Date From</label>
                <input type="date" className="w-full p-2.5 bg-gray-50 dark:bg-[#11192e] border border-gray-200 dark:border-slate-700/80 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Date To</label>
                <input type="date" className="w-full p-2.5 bg-gray-50 dark:bg-[#11192e] border border-gray-200 dark:border-slate-700/80 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Company</label>
                <select className="w-full p-2.5 bg-gray-50 dark:bg-[#11192e] border border-gray-200 dark:border-slate-700/80 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.name} className="dark:bg-[#11192e]">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Status</label>
                <select className="w-full p-2.5 bg-gray-50 dark:bg-[#11192e] border border-gray-200 dark:border-slate-700/80 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending" className="dark:bg-[#11192e]">Pending</option>
                  <option value="active" className="dark:bg-[#11192e]">Active (Live)</option>
                  <option value="in_progress" className="dark:bg-[#11192e]">In Progress</option>
                  <option value="completed" className="dark:bg-[#11192e]">Completed</option>
                  <option value="finalized" className="dark:bg-[#11192e]">Finalized</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <button onClick={clearFilters} className="w-full py-2.5 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-bold flex justify-center items-center gap-2 transition-all">
                  <FilterX size={18} /> Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <TableSkeleton rows={7} columns={5} />
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0c1427] rounded-3xl border border-gray-100 dark:border-slate-800 border-dashed">
          <Calendar size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <h3 className="text-gray-500 dark:text-slate-300 font-bold">No bookings found</h3>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Try adjusting your dates or filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => {
            const dayBookings = groupedBookings[date];
            return (
              <div key={date} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center gap-3 pl-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg"><Calendar size={18} /></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{format(parseISO(date), 'EEEE, dd MMM yyyy')}</h2>
                  <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1 ml-4"></div>
                </div>

                {dayBookings.map((booking) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative ${getCardStyle(booking.status)}`}
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/50 dark:border-white/10 shadow-sm ${getIconColor(booking.status)}`}>
                        <Home size={24} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/80 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700/60">
                            Added: {format(parseISO(booking.created_at), 'hh:mm a')}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300 font-bold text-[10px] rounded mb-1 inline-block uppercase tracking-wider border border-gray-100 dark:border-slate-700/60">
                          {booking.booking_ref || `ID-${booking.id}`}
                        </span>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight truncate">Unit {booking.units?.unit_number}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate font-medium">{booking.units?.companies?.name} • {booking.units?.building_name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-4 mt-4 md:mt-0 shrink-0">
                      <div className="md:w-[80px] shrink-0">
                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400 tracking-wider mb-1">Time</p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          <Clock size={12} className="text-blue-500 shrink-0" /> <span className="truncate">{booking.cleaning_time}</span>
                        </p>
                      </div>

                      <div className="md:w-[130px] shrink-0 overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400 tracking-wider mb-1">Service</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-200 truncate">{booking.service_type}</p>
                        {booking.checklist_templates ? (
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <ClipboardList size={10} className="shrink-0" /> <span className="truncate">{booking.checklist_templates.title}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-orange-500 dark:text-orange-400 font-medium italic mt-0.5">No checklist</p>
                        )}
                      </div>

                      <div className="md:w-[130px] shrink-0 overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-400 tracking-wider mb-1">Team</p>
                        {booking.teams ? (
                          <span className="text-sm font-medium bg-gray-50 dark:bg-slate-800/80 px-2 py-1 rounded-md flex items-center gap-1 text-gray-800 dark:text-slate-200 truncate border border-gray-100 dark:border-slate-700/60">
                            <Users size={14} className="shrink-0" /> <span className="truncate">{booking.teams.team_name}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 rounded-md w-fit border border-orange-100 dark:border-orange-900/60">
                            <AlertCircle size={14} className="shrink-0" /> Unassigned
                          </span>
                        )}
                      </div>

                      <div className="md:w-[90px] shrink-0 flex flex-col items-start md:items-end gap-2 col-span-2 md:col-span-1">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-white/50 dark:border-white/10 ${getBadgeStyle(booking.status)}`}>
                          {booking.status.replace('_', ' ')}
                        </span>

                        {booking.price > 0 ? (
                          <p className="text-xs text-green-700 dark:text-cyan-300 font-black tracking-wide truncate">AED {booking.price}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold italic flex items-center gap-1">
                            <AlertCircle size={10} className="shrink-0" /> No Price
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleToggleActivation(booking.id, 'pending')}
                          disabled={activatingId === booking.id}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-70 active:scale-95 cursor-pointer"
                        >
                          {activatingId === booking.id ? <DotsLoader size="xs" variant="white" /> : <Zap size={14} className="fill-white"/>}
                          Activate
                        </button>
                      )}

                      {booking.status === 'active' && (
                        <button
                          onClick={() => handleToggleActivation(booking.id, 'active')}
                          disabled={activatingId === booking.id}
                          className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-70 active:scale-95 shadow-sm cursor-pointer"
                        >
                          {activatingId === booking.id ? <DotsLoader size="xs" variant="primary" /> : <CheckCircle2 size={14}/>}
                          Active <RotateCcw size={11} className="ml-0.5 text-blue-400"/>
                        </button>
                      )}

                      {/* 3 Dot Menu */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === booking.id ? null : booking.id)}
                          className={`p-2 rounded-xl transition-colors ${activeMenuId === booking.id ? 'bg-gray-100 dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-400 dark:text-slate-400'}`}>
                          <MoreVertical size={20} />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === booking.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute left-0 sm:left-auto sm:right-0 top-12 w-60 bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] rounded-2xl z-30 p-2 flex flex-col gap-1"
                            >
                              {/* --- SEPARATE CONDITIONS FOR SUBMIT AND EDIT --- */}
                              {['completed', 'finalized'].includes(booking.status) ? (
                                <button
                                  onClick={() => {
                                    setSelectedBookingIdForEditLog(booking.id.toString());
                                    setIsEditLogModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-3 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl flex items-center gap-3 text-sm font-bold transition-all group"
                                >
                                  <div className="p-1.5 bg-purple-100/50 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-sm">
                                    <Edit2 size={16} />
                                  </div>
                                  Edit Work Log
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedBookingIdForDuty(booking.id.toString());
                                    setIsDutyModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-3 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl flex items-center gap-3 text-sm font-bold transition-all group"
                                >
                                  <div className="p-1.5 bg-indigo-100/50 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                    <ShieldCheck size={16} />
                                  </div>
                                  Manage Duty
                                </button>
                              )}

                              <div className="h-px bg-gray-100 dark:bg-slate-800/80 my-1 mx-2"></div>

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
                                className="w-full text-left px-3 py-2.5 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors group">
                                <div className="p-1.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                                  <Edit2 size={16} />
                                </div>
                                Edit Details
                              </button>

                              <button 
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="w-full text-left px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors group">
                                <div className="p-1.5 text-red-400 group-hover:text-red-600 transition-colors">
                                  <Trash2 size={16} />
                                </div>
                                Delete Booking
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800/80 w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#0f172a]">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Cleaning Request</h2>
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddBooking} className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Client / Company</label>
                    <CustomCombobox
                      clearText="Clear Selection"
                      options={companies.map(c => ({ id: c.id, label: c.name }))}
                      value={formData.company_id}
                      onChange={(val: string) => setFormData({...formData, company_id: val, unit_id: ""})}
                      placeholder="Type to search company..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Unit Number</label>
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
                          setFormData({...formData, unit_id: ""});
                        } else {
                          const selectedUnit = units.find(u => u.id.toString() === selectedUnitId);
                          if (selectedUnit) {
                            setFormData({
                              ...formData, 
                              unit_id: selectedUnitId, 
                              company_id: selectedUnit.company_id.toString() // Auto-fill company
                            });
                          }
                        }
                      }}
                      placeholder="Type to search unit..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Date</label>
                    <input type="date" required className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                      value={formData.cleaning_date}
                      onChange={(e) => setFormData({...formData, cleaning_date: e.target.value, assigned_team_id: ""})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Time</label>
                    <input type="time" className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                      value={formData.cleaning_time} onChange={(e) => setFormData({...formData, cleaning_time: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Service Type</label>
                  <select className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
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
                        className="w-full p-3.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                        value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})} />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Assign Checklist</label>
                  <select className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                    onChange={(e) => setFormData({...formData, checklist_template_id: e.target.value})}>
                    <option value="">Select a Checklist (Optional)</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Price (AED) - Optional</label>
                    <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                      value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Assign Team</label>
                    {formData.cleaning_date ? (
                      availableTeamsForAddDate.length > 0 ? (
                        <select
                          className="w-full p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-200 font-medium cursor-pointer"
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
                        <div className="w-full p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-xl text-sm font-bold text-red-600 dark:text-red-400">
                          No active teams for {format(parseISO(formData.cleaning_date), 'dd MMM yyyy')}.
                        </div>
                      )
                    ) : (
                      <div className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-400 dark:text-slate-500">
                        Select a date first.
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-4 bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white font-bold rounded-xl mt-4 shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer">
                  {saving ? (
                    <DotsLoader size="sm" variant="white" label="Saving Booking..." />
                  ) : (
                    <span className="flex items-center gap-2">
                      Confirm Booking
                      <Kbd size="xs" variant="dark" keys={['Ctrl', '↵']} />
                    </span>
                  )}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800/80 w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#0f172a]">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Update Booking Details</h2>
                <button onClick={() => setIsEditOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateBooking} className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Client / Company</label>
                    <CustomCombobox
                      clearText="Clear Selection"
                      options={companies.map(c => ({ id: c.id, label: c.name }))}
                      value={editData.company_id}
                      onChange={(val: string) => setEditData({...editData, company_id: val, unit_id: ""})}
                      placeholder="Type to search company..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Unit Number</label>
                    <CustomCombobox
                      clearText="Clear Selection"
                      options={units.filter(u => editData.company_id ? u.company_id.toString() === editData.company_id : true).map(u => {
                        const comp = companies.find(c => c.id === u.company_id);
                        return {
                          id: u.id,
                          label: `${u.unit_number} - ${u.building_name} ${!editData.company_id && comp ? `(${comp.name})` : ''}`
                        };
                      })}
                      value={editData.unit_id}
                      onChange={(val: string) => {
                        const selectedUnitId = val;
                        if (!selectedUnitId) {
                          setEditData({...editData, unit_id: ""});
                        } else {
                          const selectedUnit = units.find(u => u.id.toString() === selectedUnitId);
                          if (selectedUnit) {
                            setEditData({
                              ...editData, 
                              unit_id: selectedUnitId, 
                              company_id: selectedUnit.company_id.toString() // Auto-fill company
                            });
                          }
                        }
                      }}
                      placeholder="Type to search unit..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Date</label>
                    <input type="date" required className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                      value={editData.cleaning_date}
                      onChange={(e) => setEditData({...editData, cleaning_date: e.target.value, assigned_team_id: ""})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Time</label>
                    <input type="time" className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                      value={editData.cleaning_time} onChange={(e) => setEditData({...editData, cleaning_time: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Service Type</label>
                  <select className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
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
                        className="w-full p-3.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                        value={editData.service_type} onChange={(e) => setEditData({...editData, service_type: e.target.value})} />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Assign Checklist</label>
                  <select className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                    value={editData.checklist_template_id} onChange={(e) => setEditData({...editData, checklist_template_id: e.target.value})}>
                    <option value="">Select a Checklist (Optional)</option>
                    {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Price (AED)</label>
                    <input type="number" placeholder="0.00" className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium"
                      value={editData.price} onChange={(e) => setEditData({...editData, price: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Assign / Change Team</label>
                    {editData.cleaning_date ? (
                      availableTeamsForEditDate.length > 0 ? (
                        <select
                          className="w-full p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 dark:text-blue-200 font-medium cursor-pointer"
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
                        <div className="w-full p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-xl text-sm font-bold text-red-600 dark:text-red-400">
                          No active teams for {format(parseISO(editData.cleaning_date), 'dd MMM yyyy')}.
                        </div>
                      )
                    ) : (
                      <div className="w-full p-3.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-400 dark:text-slate-500">
                        Select a date first.
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl mt-4 shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer">
                  {saving ? (
                    <DotsLoader size="sm" variant="white" label="Saving Changes..." />
                  ) : (
                    <span className="flex items-center gap-2">
                      Save Changes
                      <Kbd size="xs" variant="dark" keys={['Ctrl', '↵']} />
                    </span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADMIN DUTY MODAL --- */}
      {isDutyModalOpen && selectedBookingIdForDuty && (
        <AdminDutyModal 
          isOpen={isDutyModalOpen} 
          bookingId={selectedBookingIdForDuty}
          onClose={() => {
            setIsDutyModalOpen(false);
            setSelectedBookingIdForDuty(null);
          }}
          onSuccess={() => {
             fetchBookings();
          }}
        />
      )}

      {/* --- ADMIN EDIT LOG MODAL --- */}
      {isEditLogModalOpen && selectedBookingIdForEditLog && (
        <AdminEditLogModal 
          isOpen={isEditLogModalOpen} 
          bookingId={selectedBookingIdForEditLog}
          onClose={() => {
            setIsEditLogModalOpen(false);
            setSelectedBookingIdForEditLog(null);
          }}
          onSuccess={() => {
             fetchBookings();
          }}
        />
      )}

    </div>
  );
}