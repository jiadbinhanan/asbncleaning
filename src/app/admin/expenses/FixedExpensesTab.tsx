"use client";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit2, CheckCircle2, Lock, FileText, Image as ImageIcon, 
  CalendarDays, Settings, Tag, CreditCard, Layers, X, Loader2, PlayCircle, Clock, Info, 
  ChevronDown, ChevronUp, History, TrendingUp, Search, SlidersHorizontal, RotateCcw, 
  Receipt, Eye, DollarSign, PieChart
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  getFixedSchedulesAction, 
  addFixedScheduleAction, 
  editFixedScheduleAction, 
  deleteFixedScheduleAction, 
  addExpenseAction,
  editExpenseAction,
  deleteExpenseAction 
} from "./actions";
import { 
  format, parseISO, addMonths, addDays, differenceInDays, 
  startOfWeek, endOfWeek, formatDistanceToNow 
} from "date-fns";

export default function FixedExpensesTab({ 
  currentMonthDateStr, 
  paymentMethods, 
  refreshGlobalStats,
  currentMonthExpenses,
  categories = []
}: { 
  currentMonthDateStr: string; 
  paymentMethods: string[];
  refreshGlobalStats: () => void;
  currentMonthExpenses: any[];
  categories?: any[];
}) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Ledger Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [receiptFilter, setReceiptFilter] = useState(""); // '', 'with', 'without'
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit & Delete Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    category_name: "",
    payment_method: "",
    expense_type: "Fixed"
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [editFileDataUrl, setEditFileDataUrl] = useState<string | null>(null);

  // Schedules Form
  const [newSchedule, setNewSchedule] = useState({ 
    category_name: '', 
    default_amount: '', 
    frequency_type: 'months', 
    frequency_interval: 1, 
    schedule_date: 1, 
    base_start_date: format(new Date(), 'yyyy-MM-dd'),
    default_description: '',
    default_payment_method: ''
  });
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  
  // Pay form
  const [payFormData, setPayFormData] = useState({
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: ""
  });
  const [payFileDataUrl, setPayFileDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [schedulesRes, expensesRes] = await Promise.all([
      getFixedSchedulesAction(),
      supabase.schema('expenses').from('expenses').select('*').eq('expense_type', 'Fixed').order('expense_date', { ascending: false })
    ]);
    
    if (schedulesRes.success && schedulesRes.data) {
      setSchedules(schedulesRes.data);
    }
    if (expensesRes.data) {
      setFixedExpenses(expensesRes.data);
    }
    setLoading(false);
  };

  // Password verification
  const verifyPassword = async (password: string) => {
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      setVerifying(false);
      return data.success;
    } catch (e) {
      setVerifying(false);
      return false;
    }
  };

  const handlePayFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 1024 * 1024) {
        alert("Maximum file size allowed is 1 MB.");
        e.target.value = "";
        setPayFileDataUrl(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPayFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setPayFileDataUrl(null);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 1024 * 1024) {
        alert("Maximum file size allowed is 1 MB.");
        e.target.value = "";
        setEditFileDataUrl(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setEditFileDataUrl(null);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.category_name || !newSchedule.default_amount) return;
    
    setSubmitting(true);
    const res = await addFixedScheduleAction(
      newSchedule.category_name,
      Number(newSchedule.default_amount),
      newSchedule.frequency_type,
      Number(newSchedule.frequency_interval),
      Number(newSchedule.schedule_date),
      newSchedule.base_start_date,
      newSchedule.default_description,
      newSchedule.default_payment_method,
      true
    );
    if (res.success) {
      fetchData();
      setNewSchedule({ 
        category_name: '', default_amount: '', frequency_type: 'months', frequency_interval: 1, schedule_date: 1, 
        base_start_date: format(new Date(), 'yyyy-MM-dd'), default_description: '', default_payment_method: ''
      });
      setShowSettings(false);
    } else {
      alert("Error adding schedule: " + res.message);
    }
    setSubmitting(false);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    const res = await deleteFixedScheduleAction(id);
    if (res.success) {
      fetchData();
    } else {
      alert("Error deleting: " + res.message);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !payFormData.amount || !payFormData.payment_method) return;
    
    setSubmitting(true);
    const res = await addExpenseAction(
      Number(payFormData.amount),
      payFormData.description,
      payFormData.expense_date,
      selectedSchedule.category_name,
      'Fixed',
      payFormData.payment_method,
      payFileDataUrl
    );

    if (res.success) {
      refreshGlobalStats(); 
      fetchData();
      setIsPayModalOpen(false);
      setPayFileDataUrl(null);
    } else {
      alert("Error logging expense: " + res.message);
    }
    setSubmitting(false);
  };

  // Edit Expense Submit Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    const finalCategory = isCustomCategory ? customCategoryName.trim() : editFormData.category_name;
    
    if (!editFormData.amount || !editFormData.expense_date || !finalCategory || !editFormData.payment_method) {
      return alert("Please fill all required fields (Date, Category, Amount, Payment Method)");
    }

    setSubmitting(true);

    const isVerified = await verifyPassword(actionPassword);
    if (!isVerified) {
      alert("Incorrect action password");
      setSubmitting(false);
      return;
    }

    const res = await editExpenseAction(
      selectedExpense.id, 
      Number(editFormData.amount), 
      editFormData.description, 
      editFormData.expense_date, 
      finalCategory,
      'Fixed',
      editFormData.payment_method,
      editFileDataUrl
    );

    if (res.success) {
      fetchData();
      refreshGlobalStats();
      closeModals();
    } else {
      alert("Error editing expense: " + res.message);
    }
    setSubmitting(false);
  };

  // Delete Expense Submit Handler
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setSubmitting(true);

    const isVerified = await verifyPassword(actionPassword);
    if (!isVerified) {
      alert("Incorrect action password");
      setSubmitting(false);
      return;
    }

    const res = await deleteExpenseAction(selectedExpense.id);
    if (res.success) {
      fetchData();
      refreshGlobalStats();
      closeModals();
    } else {
      alert("Error deleting expense: " + res.message);
    }
    setSubmitting(false);
  };

  const closeModals = () => {
    setIsPayModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedExpense(null);
    setEditFormData({
      amount: "",
      description: "",
      expense_date: new Date().toISOString().split('T')[0],
      category_name: "",
      payment_method: "",
      expense_type: "Fixed"
    });
    setEditFileDataUrl(null);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setActionPassword("");
  };

  // Logic to calculate next due date
  const calculateNextDueDate = (schedule: any, lastPaidExpense: any) => {
    let baseDate = lastPaidExpense ? parseISO(lastPaidExpense.expense_date) : parseISO(schedule.base_start_date);
    
    if (schedule.frequency_type === 'days') {
      return addDays(baseDate, schedule.frequency_interval);
    } else {
      let nextMonth = addMonths(baseDate, schedule.frequency_interval);
      const year = nextMonth.getFullYear();
      const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
      const day = String(schedule.schedule_date).padStart(2, '0');
      const lastDayOfMonth = new Date(year, nextMonth.getMonth() + 1, 0).getDate();
      const safeDay = Math.min(Number(day), lastDayOfMonth);
      
      return parseISO(`${year}-${month}-${String(safeDay).padStart(2, '0')}`);
    }
  };

  // Derive Checklist Data
  const checklist = useMemo(() => {
    return schedules.map(schedule => {
      const relatedExpenses = fixedExpenses.filter(e => e.category_name === schedule.category_name);
      const lastPaid = relatedExpenses.length > 0 ? relatedExpenses[0] : null;

      const nextDueDate = calculateNextDueDate(schedule, lastPaid);
      const today = new Date();
      const daysUntilDue = differenceInDays(nextDueDate, today);
      const isDue = daysUntilDue <= 15;
      const isOverdue = daysUntilDue < 0;

      return {
        ...schedule,
        lastPaid,
        nextDueDate,
        daysUntilDue,
        isDue,
        isOverdue
      };
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [schedules, fixedExpenses]);

  const stats = useMemo(() => {
    const totalSchedules = checklist.length;
    const dueCount = checklist.filter(c => c.isDue).length;
    const totalSpentThisMonth = fixedExpenses.filter(e => e.expense_date.startsWith(currentMonthDateStr)).reduce((sum, e) => sum + Number(e.amount), 0);
    const targetMonthlySpend = checklist.reduce((sum, c) => {
      if (c.frequency_type === 'months') {
        return sum + (Number(c.default_amount) / c.frequency_interval);
      } else {
        return sum + (Number(c.default_amount) / (c.frequency_interval / 30));
      }
    }, 0);

    return { totalSchedules, dueCount, totalSpentThisMonth, targetMonthlySpend };
  }, [checklist, fixedExpenses, currentMonthDateStr]);

  // ── Categories List for Filters & Edit Form ──
  const activeCategoriesList = useMemo(() => {
    const set = new Set<string>();
    schedules?.forEach((s: any) => { if (s.category_name) set.add(s.category_name); });
    fixedExpenses?.forEach((e: any) => { if (e.category_name) set.add(e.category_name); });
    categories?.forEach((c: any) => { if (c.name) set.add(c.name); });
    return Array.from(set);
  }, [schedules, fixedExpenses, categories]);

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter) count++;
    if (paymentMethodFilter) count++;
    if (minAmountFilter) count++;
    if (maxAmountFilter) count++;
    if (receiptFilter) count++;
    return count;
  }, [categoryFilter, paymentMethodFilter, minAmountFilter, maxAmountFilter, receiptFilter]);

  const resetAdvancedFilters = () => {
    setCategoryFilter("");
    setPaymentMethodFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
    setReceiptFilter("");
  };

  // ── Supercharged Search & Filtered Expenses ──
  const filteredFixedExpenses = useMemo(() => {
    return fixedExpenses.filter(e => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const descMatch = e.description?.toLowerCase().includes(term);
        const catMatch = e.category_name?.toLowerCase().includes(term);
        const methodMatch = e.payment_method?.toLowerCase().includes(term);
        const amountMatch = e.amount?.toString().includes(term);
        const dateMatch = e.expense_date?.includes(term);
        if (!descMatch && !catMatch && !methodMatch && !amountMatch && !dateMatch) {
          return false;
        }
      }

      if (categoryFilter && e.category_name !== categoryFilter) return false;
      if (paymentMethodFilter && e.payment_method !== paymentMethodFilter) return false;
      if (minAmountFilter && Number(e.amount) < Number(minAmountFilter)) return false;
      if (maxAmountFilter && Number(e.amount) > Number(maxAmountFilter)) return false;
      if (receiptFilter === 'with' && !e.receipt_url) return false;
      if (receiptFilter === 'without' && e.receipt_url) return false;

      return true;
    });
  }, [fixedExpenses, searchTerm, categoryFilter, paymentMethodFilter, minAmountFilter, maxAmountFilter, receiptFilter]);

  // ── Group by Week for the Ledger ──
  const groupedArray = useMemo(() => {
    const groups = filteredFixedExpenses.reduce((acc: any, expense) => {
      const eDate = parseISO(expense.expense_date);
      const weekStart = startOfWeek(eDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(eDate, { weekStartsOn: 1 });
      const weekKey = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      
      if (!acc[weekKey]) acc[weekKey] = [];
      acc[weekKey].push(expense);
      return acc;
    }, {});

    return Object.entries(groups).map(([week, items]: any) => ({
      week,
      items: items.sort((a: any, b: any) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()),
      total: items.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
    })).sort((a, b) => new Date(b.items[0].expense_date).getTime() - new Date(a.items[0].expense_date).getTime());
  }, [filteredFixedExpenses]);

  // ── Filtered Summary Stats for Ledger ──
  const filteredStats = useMemo(() => {
    const totalSpend = filteredFixedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const count = filteredFixedExpenses.length;
    const avgSpend = count > 0 ? totalSpend / count : 0;

    const categoryTotals: Record<string, number> = {};
    filteredFixedExpenses.forEach(e => {
      const cat = e.category_name || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    let topCatName = "None";
    let topCatAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatName = cat;
      }
    });

    return { totalSpend, count, avgSpend, topCatName, topCatAmount };
  }, [filteredFixedExpenses]);

  // ── Excel Export ──
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredFixedExpenses.map((e, idx) => ({
      "#": idx + 1,
      Date: e.expense_date,
      Category: e.category_name,
      Type: "Fixed",
      "Description / Notes": e.description || "-",
      "Payment Method": e.payment_method,
      "Amount (AED)": Number(e.amount),
      Receipt: e.receipt_url ? `${window.location.origin}/api/pdf/${e.id}?dl=1` : "No Receipt"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fixed Expenses");
    XLSX.writeFile(wb, `Fixed_Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // ── PDF Export ──
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Decorative Header Banner
    doc.setFillColor(10, 25, 47); // Dark Navy #0A192F
    doc.rect(0, 0, pageWidth, 42, "F");

    // Accent line
    doc.setFillColor(37, 99, 235); // Royal Blue #2563EB
    doc.rect(0, 42, pageWidth, 2, "F");

    // Company Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("BTM CLEANING & TECHNICAL SERVICES CO.", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(191, 219, 254);
    doc.text("OFFICIAL FIXED EXPENSE & DISBURSEMENT AUDIT REPORT", 14, 23);

    // Header Right Metadata
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Scope: Fixed Expenses Ledger`, pageWidth - 14, 16, { align: "right" });
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - 14, 23, { align: "right" });
    doc.text(`Currency: AED (United Arab Emirates Dirham)`, pageWidth - 14, 30, { align: "right" });

    // Summary KPI Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 49, pageWidth - 28, 20, 3, 3, "FD");

    // KPI 1: Total Spend
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL FIXED DISBURSEMENT", 20, 56);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(`AED ${filteredStats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, 64);

    // KPI 2: Total Records
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TRANSACTIONS", 85, 56);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${filteredStats.count} Entries`, 85, 64);

    // KPI 3: Top Category
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOP FIXED CATEGORY", 145, 56);
    doc.setFontSize(9.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${filteredStats.topCatName.slice(0, 20)}`, 145, 64);

    // Table Data
    const tableColumns = ["#", "Date", "Category", "Notes / Description", "Method", "Amount (AED)"];
    const tableRows = filteredFixedExpenses.map((e, index) => [
      index + 1,
      format(parseISO(e.expense_date), 'dd/MM/yyyy'),
      e.category_name || "-",
      e.description || "-",
      e.payment_method || "-",
      Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 74,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: {
        fillColor: [10, 25, 47],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "left",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 22 },
        2: { cellWidth: 35, fontStyle: "bold" },
        3: { cellWidth: "auto" },
        4: { cellWidth: 28 },
        5: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: [220, 38, 38] },
      },
      foot: [
        [
          "",
          "",
          "",
          "GRAND TOTAL",
          "",
          `AED ${filteredStats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ]
      ],
      footStyles: {
        fillColor: [238, 242, 246],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 9,
        halign: "right",
      },
      didDrawPage: (data) => {
        const pageCount = (doc.internal as any).getNumberOfPages();
        const currentPage = (data as any).pageNumber;
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Confidential — For Internal Financial Audit Use Only", 14, pageHeight - 7);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: "right" });
      }
    });

    doc.save(`Fixed_Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CalendarDays size={14} className="text-blue-500"/> Active Schedules</p>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.totalSchedules}</h3>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={14} className="text-orange-500"/> Pending / Due Soon</p>
          <h3 className="text-2xl font-black text-orange-600 tracking-tight">{stats.dueCount}</h3>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between md:col-span-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={14} className="text-green-500"/> Est. Monthly Target vs Spent (This Month)</p>
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">AED {stats.totalSpentThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            <span className="text-xs font-bold text-gray-500">Target: AED {stats.targetMonthlySpend.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${stats.totalSpentThisMonth > stats.targetMonthlySpend ? 'bg-red-500' : 'bg-green-500'}`} 
              style={{ width: `${Math.min((stats.totalSpentThisMonth / (stats.targetMonthlySpend || 1)) * 100, 100)}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Toolbar & Info ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 relative">
          <h2 className="text-lg font-black text-gray-900">Fixed Planner</h2>
          <button 
            onMouseEnter={() => setShowInfo(true)} 
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors cursor-help"
          >
            <Info size={14}/> Add New Duty / Guide
          </button>
          
          <AnimatePresence>
            {showInfo && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-80 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 text-xs font-medium space-y-2"
              >
                <p className="font-bold text-blue-300">How Rotation Works:</p>
                <p><span className="text-white font-bold">Days Mode:</span> Rotates exactly X days after the last payment. Best for generic intervals (e.g., 45 days, 65 days).</p>
                <p><span className="text-white font-bold">Months Mode:</span> Rotates every X months on a strictly specified day (1-31). This prevents calendar drift caused by 28/30/31-day months. Best for rent, salaries.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${showSettings ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
        >
          <Settings size={16} /> {showSettings ? 'Close Setup' : 'Setup Schedules'}
        </button>
      </div>

      {/* ── Inline Expandable Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 space-y-6">
              
              {/* Add Form */}
              <form onSubmit={handleAddSchedule} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600"/> Create New Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Category Name</label>
                    <input type="text" value={newSchedule.category_name} onChange={e => setNewSchedule({...newSchedule, category_name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Default Amount (AED)</label>
                    <input type="number" value={newSchedule.default_amount} onChange={e => setNewSchedule({...newSchedule, default_amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rotation Type</label>
                    <select value={newSchedule.frequency_type} onChange={e => setNewSchedule({...newSchedule, frequency_type: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500">
                      <option value="months">Calendar Months</option>
                      <option value="days">Exact Days</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interval ({newSchedule.frequency_type})</label>
                      <input type="number" min="1" value={newSchedule.frequency_interval} onChange={e => setNewSchedule({...newSchedule, frequency_interval: Number(e.target.value)})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                    </div>
                    {newSchedule.frequency_type === 'months' && (
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Strict Day</label>
                        <input type="number" min="1" max="31" value={newSchedule.schedule_date} onChange={e => setNewSchedule({...newSchedule, schedule_date: Number(e.target.value)})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" title="Day of the month (1-31)" required />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Base Start Date</label>
                    <input type="date" value={newSchedule.base_start_date} onChange={e => setNewSchedule({...newSchedule, base_start_date: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Default Pre-fill Description</label>
                    <input type="text" value={newSchedule.default_description} onChange={e => setNewSchedule({...newSchedule, default_description: e.target.value})} placeholder="Optional default notes..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Default Pay Method</label>
                    <select value={newSchedule.default_payment_method} onChange={e => setNewSchedule({...newSchedule, default_payment_method: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500">
                      <option value="">(None)</option>
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-colors shadow-md flex items-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Save Schedule
                  </button>
                </div>
              </form>

              {/* Schedules Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Logic</th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Defaults</th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedules.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-black text-gray-900 text-sm">{item.category_name}</div>
                          <div className="text-xs font-bold text-green-600">AED {item.default_amount}</div>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-600">
                          {item.frequency_type === 'months' 
                            ? `Every ${item.frequency_interval} month(s) on day ${item.schedule_date}` 
                            : `Every ${item.frequency_interval} days`}
                          <div className="text-[10px] text-gray-400 mt-1">Since {item.base_start_date}</div>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-600 max-w-[200px] truncate" title={item.default_description}>
                          {item.default_payment_method && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded mr-2">{item.default_payment_method}</span>}
                          {item.default_description || '-'}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteSchedule(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Checklist View (Upcoming & Due Grid) ── */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-blue-600"/> Upcoming & Due</h3>
        
        {loading ? (
          <div className="p-12 flex justify-center text-blue-500"><Loader2 className="animate-spin" size={32} /></div>
        ) : checklist.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-bold bg-white rounded-2xl border border-gray-100 shadow-sm">No fixed schedules found. Setup schedules to see them here.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {checklist.map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={item.id} 
                  className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition-colors relative overflow-hidden bg-white hover:shadow-md ${item.isOverdue ? 'border-red-200' : item.isDue ? 'border-orange-200' : 'border-slate-100'}`}
                >
                  {item.isOverdue && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
                  {!item.isOverdue && item.isDue && <div className="absolute top-0 left-0 w-full h-1 bg-orange-400" />}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${item.isOverdue ? 'bg-red-500' : item.isDue ? 'bg-orange-400' : 'bg-slate-300'}`}>
                      <CalendarDays size={20}/>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 leading-tight">{item.category_name}</h3>
                      <div className="text-sm font-bold text-gray-600 mt-0.5">AED {Number(item.default_amount).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-1">
                      <span>Next Due:</span>
                      <span className={item.isOverdue ? 'text-red-600' : item.isDue ? 'text-orange-600' : 'text-gray-900'}>
                        {format(item.nextDueDate, 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 flex justify-between">
                      <span>Last Paid: {item.lastPaid ? format(parseISO(item.lastPaid.expense_date), 'dd MMM yyyy') : 'Never'}</span>
                      <span className="uppercase tracking-widest">{item.frequency_type === 'months' ? `${item.frequency_interval}M/D${item.schedule_date}` : `${item.frequency_interval}D`}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedSchedule(item);
                      setPayFormData({
                        amount: item.default_amount.toString(),
                        description: item.default_description || "",
                        payment_method: item.default_payment_method || "",
                        expense_date: new Date().toISOString().split('T')[0]
                      });
                      setIsPayModalOpen(true);
                    }}
                    className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors ${item.isDue || item.isOverdue ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <PlayCircle size={16}/> Pay & Record
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Fixed Expenses Ledger Section (Supercharged & Fully Editable) ── */}
      <div className="mt-12 space-y-6">
        
        {/* Ledger Header & Search/Export Toolbar */}
        <div className="bg-white p-4 rounded-[1.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Search Input & Advanced Filter Toggle */}
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search fixed expenses by notes, category, amount..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 placeholder:text-gray-400 shadow-inner"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={16}/>
                  </button>
                )}
              </div>

              {/* Advanced Filter Toggle Button */}
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all shrink-0 ${
                  showAdvancedFilters || activeAdvancedFilterCount > 0 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Advanced Filters</span>
                {activeAdvancedFilterCount > 0 && (
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs font-black flex items-center justify-center">
                    {activeAdvancedFilterCount}
                  </span>
                )}
              </button>
            </div>
            
            {/* Action Buttons: Excel & PDF */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto justify-end">
              <button onClick={exportExcel} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors font-bold text-sm shadow-sm">
                <FileText size={16} /> Excel
              </button>
              <button onClick={exportPDF} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-bold text-sm shadow-sm">
                <FileText size={16} /> PDF Report
              </button>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3"
              >
                {/* Category Filter */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={categoryFilter} 
                    onChange={e => setCategoryFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {activeCategoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">Payment Method</label>
                  <select 
                    value={paymentMethodFilter} 
                    onChange={e => setPaymentMethodFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="">All Methods</option>
                    {paymentMethods?.map((m: string, i: number) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Min Amount */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">Min Amount (AED)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={minAmountFilter} 
                    onChange={e => setMinAmountFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Max Amount */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">Max Amount (AED)</label>
                  <input 
                    type="number" 
                    placeholder="Any" 
                    value={maxAmountFilter} 
                    onChange={e => setMaxAmountFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Receipt Filter & Reset */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">Receipt</label>
                    <select 
                      value={receiptFilter} 
                      onChange={e => setReceiptFilter(e.target.value)} 
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="with">With Receipt</option>
                      <option value="without">No Receipt</option>
                    </select>
                  </div>
                  {activeAdvancedFilterCount > 0 && (
                    <button 
                      onClick={resetAdvancedFilters} 
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors"
                      title="Reset filters"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Fixed Expenses Ledger List Grouped by Week (Accordion Style) ── */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <History size={16} className="text-indigo-600"/> Fixed Expenses Ledger
            </h3>
            <span className="text-xs font-bold text-gray-500">
              Showing {filteredFixedExpenses.length} entries • Total: <strong className="text-red-600">AED {filteredStats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
              <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
              <p className="text-gray-500 font-bold">Loading fixed ledger...</p>
            </div>
          ) : groupedArray.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-xl shadow-slate-200/40 border border-slate-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Search size={32}/></div>
              <h3 className="text-xl font-black text-gray-800">No fixed expenses found</h3>
              <p className="text-gray-500 font-medium mt-2">Adjust your search or filter parameters to view records.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedArray.map((group) => (
                <motion.div 
                  key={group.week}
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                      <CalendarDays size={16} className="text-indigo-500"/> Week: {group.week}
                    </h3>
                    <div className="text-sm font-black text-gray-900 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                      Week Total: <span className="text-red-600 font-black">AED {group.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Group Items */}
                  <div className="divide-y divide-gray-100">
                    {group.items.map((expense: any) => {
                      const isExpanded = expandedId === expense.id;

                      return (
                        <div 
                          key={expense.id} 
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          {/* Main Row Header (Click to toggle expand) */}
                          <div 
                            onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                            className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                {/* Date */}
                                <span className="text-xs font-black bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200">
                                  {format(parseISO(expense.expense_date), 'dd MMM yyyy')}
                                </span>
                                
                                {/* Type Badge */}
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200">
                                  Fixed Expense
                                </span>

                                {/* Payment Method */}
                                <span className="text-xs font-bold text-gray-600 flex items-center gap-1 bg-gray-50 px-2.5 py-0.5 rounded-md border border-gray-200">
                                  <CreditCard size={12}/> {expense.payment_method || 'Cash'}
                                </span>

                                {/* Receipt Indicator */}
                                {expense.receipt_url && (
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                    <Receipt size={11}/> Receipt
                                  </span>
                                )}
                              </div>

                              {/* Category & Truncated Description */}
                              <div className="flex items-center gap-3">
                                <h4 className="text-base font-black text-gray-900 shrink-0">{expense.category_name}</h4>
                                {expense.description && (
                                  <p className="text-xs font-medium text-gray-500 truncate max-w-md hidden sm:block">
                                    — {expense.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Side: Amount & Expand Chevron */}
                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                              <span className="text-xl font-black text-red-600">
                                AED {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              
                              <button 
                                type="button" 
                                className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Accordion Body */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }} 
                                className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100"
                              >
                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                  
                                  {/* Full Description */}
                                  <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Full Description / Notes</p>
                                    <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">
                                      {expense.description || "No specific notes provided for this transaction."}
                                    </p>
                                  </div>

                                  {/* Metadata & Action Buttons */}
                                  <div className="flex flex-wrap justify-between items-center gap-4 pt-3 border-t border-gray-100">
                                    <div className="text-xs font-bold text-gray-400 flex flex-wrap items-center gap-3">
                                      <span>Recorded on {format(parseISO(expense.expense_date), 'dd MMMM yyyy')}</span>
                                      {expense.updated_at && (
                                        <span className="text-blue-600 flex items-center gap-1">
                                          <History size={13}/> Last edited {formatDistanceToNow(new Date(expense.updated_at))} ago
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {expense.receipt_url && (
                                        <button 
                                          onClick={() => setLightboxUrl(`/api/pdf/${expense.id}?dl=0`)} 
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-black transition-colors border border-blue-200"
                                        >
                                          <Eye size={14}/> View Receipt
                                        </button>
                                      )}
                                      
                                      {/* Edit Button */}
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          setSelectedExpense(expense); 
                                          const isKnown = activeCategoriesList.some(c => c === expense.category_name);
                                          if (!isKnown && expense.category_name) {
                                            setIsCustomCategory(true);
                                            setCustomCategoryName(expense.category_name);
                                          } else {
                                            setIsCustomCategory(false);
                                            setCustomCategoryName("");
                                          }
                                          setEditFormData({ 
                                            amount: expense.amount?.toString() || "", 
                                            description: expense.description || "", 
                                            expense_date: expense.expense_date,
                                            category_name: expense.category_name,
                                            payment_method: expense.payment_method,
                                            expense_type: "Fixed"
                                          }); 
                                          setIsEditModalOpen(true); 
                                        }} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
                                      >
                                        <Edit2 size={14}/> Edit
                                      </button>
                                      
                                      {/* Delete Button */}
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          setSelectedExpense(expense); 
                                          setIsDeleteModalOpen(true); 
                                        }} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-black transition-colors border border-red-200"
                                      >
                                        <Trash2 size={14}/> Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS (Mounted via React Portal to document.body to prevent sidebar/topbar overlap) ── */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          
          {/* Pay / Record Modal */}
          {isPayModalOpen && selectedSchedule && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPayModalOpen(false)} className="absolute inset-0 bg-black/75" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{selectedSchedule.category_name}</h2>
                    <p className="text-xs font-bold text-gray-500 mt-1">Record fixed payment</p>
                  </div>
                  <button onClick={() => setIsPayModalOpen(false)} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
                </div>
                <form onSubmit={handlePaySubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Date Paid</label>
                      <input type="date" value={payFormData.expense_date} onChange={e => setPayFormData({...payFormData, expense_date: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white" required />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Payment Method</label>
                      <select value={payFormData.payment_method} onChange={e => setPayFormData({...payFormData, payment_method: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white" required>
                        <option value="">Select Method...</option>
                        {paymentMethods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                        {!paymentMethods?.includes(payFormData.payment_method) && payFormData.payment_method && <option value={payFormData.payment_method}>{payFormData.payment_method}</option>}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Final Amount (AED)</label>
                    <input type="number" step="0.01" value={payFormData.amount} onChange={e => setPayFormData({...payFormData, amount: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-red-600 outline-none focus:border-blue-500 focus:bg-white text-lg" required />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Description / Notes</label>
                    <textarea value={payFormData.description} onChange={e => setPayFormData({...payFormData, description: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white min-h-[80px]" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                      <span>Receipt (Optional)</span>
                      <span className="text-[9px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 font-bold">Max size: 1 MB</span>
                    </label>
                    <input type="file" accept="image/*,application/pdf" onChange={handlePayFileChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 cursor-pointer shadow-sm" />
                  </div>
                  
                  <div className="pt-2">
                    <button type="submit" disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 mt-2">
                      {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Complete Entry
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* ── Edit Fixed Expense Modal (Protected with Action Password) ── */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModals} className="absolute inset-0 bg-black/75" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                  <h2 className="text-xl font-black text-gray-900">Edit Fixed Expense</h2>
                  <button onClick={closeModals} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                  
                  {selectedExpense?.updated_at && (
                    <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl flex items-center gap-2 text-xs font-bold border border-indigo-100 mb-2">
                      <History size={16}/> Last edited on {format(new Date(selectedExpense.updated_at), 'dd MMM yyyy, hh:mm a')}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Date</label>
                      <input 
                        type="date" 
                        value={editFormData.expense_date} 
                        onChange={e => setEditFormData({...editFormData, expense_date: e.target.value})} 
                        className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Payment Method</label>
                      <select 
                        value={editFormData.payment_method} 
                        onChange={e => setEditFormData({...editFormData, payment_method: e.target.value})} 
                        className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                        required
                      >
                        <option value="">Select Method...</option>
                        {paymentMethods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                        {!paymentMethods?.includes(editFormData.payment_method) && editFormData.payment_method && (
                          <option value={editFormData.payment_method}>{editFormData.payment_method} (Saved)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Category</label>
                    <select 
                      value={isCustomCategory ? "__OTHER__" : editFormData.category_name} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__OTHER__") {
                          setIsCustomCategory(true);
                        } else {
                          setIsCustomCategory(false);
                          setEditFormData(prev => ({ ...prev, category_name: val }));
                        }
                      }} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                      required
                    >
                      <option value="">Select Category...</option>
                      <optgroup label="Fixed Categories">
                        {activeCategoriesList.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Custom Option">
                        <option value="__OTHER__">+ Other (Custom Category)</option>
                      </optgroup>
                    </select>
                  </div>

                  {isCustomCategory && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
                      <label className="block text-xs font-black text-blue-900 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-600"/> Enter Custom Category Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Office Equipment, Visa Renewal" 
                        value={customCategoryName} 
                        onChange={e => {
                          setCustomCategoryName(e.target.value);
                          setEditFormData(prev => ({ ...prev, category_name: e.target.value }));
                        }} 
                        className="w-full p-3 bg-white border border-blue-300 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        required 
                        autoFocus
                      />
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Amount (AED)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={editFormData.amount} 
                      onChange={e => setEditFormData({...editFormData, amount: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-black text-red-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm text-lg" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Additional Notes (Optional)</label>
                    <textarea 
                      value={editFormData.description} 
                      onChange={e => setEditFormData({...editFormData, description: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[80px] shadow-sm" 
                    />
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2">
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-3 flex justify-between items-center">
                      <span>Receipt File</span>
                      <span className="text-[9px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 font-bold">Max size: 1 MB</span>
                    </label>
                    {selectedExpense?.receipt_url && !editFileDataUrl && (
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 mb-3 shadow-sm">
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><ImageIcon size={14}/> Existing Receipt attached</span>
                        <button onClick={(e) => { e.preventDefault(); setLightboxUrl(`/api/pdf/${selectedExpense.id}?dl=0`); }} className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">View</button>
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-gray-600 mb-1">{selectedExpense?.receipt_url ? "Upload a new file to replace the existing one:" : "Upload a file:"}</p>
                    <input type="file" accept="image/*,application/pdf" onChange={handleEditFileChange} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer shadow-sm" />
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <label className="block text-xs font-black text-red-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Lock size={14}/> Action Password Required
                    </label>
                    <input 
                      type="password" 
                      value={actionPassword} 
                      onChange={e => setActionPassword(e.target.value)} 
                      className="w-full p-3.5 bg-white border border-red-300 rounded-xl font-black text-gray-900 placeholder:text-red-300 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-sm" 
                      placeholder="Enter action password" 
                      required 
                    />
                  </div>
                  
                  <button type="submit" disabled={submitting || verifying} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 mt-4">
                    {(submitting || verifying) ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Save Changes
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {/* ── Delete Confirmation Modal (Protected with Action Password) ── */}
          {isDeleteModalOpen && selectedExpense && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModals} className="absolute inset-0 bg-black/75" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative z-10 text-center">
                <div className="p-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600"><Trash2 size={32} /></div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">Delete Fixed Expense?</h2>
                  <p className="text-gray-500 text-sm font-medium mb-6">This action cannot be undone. Please enter the action password to confirm.</p>
                  <form onSubmit={handleDeleteSubmit} className="space-y-4">
                    <input 
                      type="password" 
                      value={actionPassword} 
                      onChange={e => setActionPassword(e.target.value)} 
                      className="w-full p-4 bg-white border border-gray-300 rounded-xl font-black text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-center tracking-widest shadow-sm" 
                      placeholder="Password" 
                      required 
                      autoFocus 
                    />
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={closeModals} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                      <button type="submit" disabled={submitting || verifying} className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2">
                        {(submitting || verifying) ? <Loader2 className="animate-spin" size={18} /> : 'Delete'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Receipt Lightbox Modal ── */}
          {lightboxUrl && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setLightboxUrl(null)} 
                className="absolute inset-0 bg-black/80 cursor-pointer" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
              >
                <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
                  <span className="font-bold text-sm flex items-center gap-2">
                    <Receipt size={16} className="text-blue-400" /> Receipt Preview
                  </span>
                  <div className="flex items-center gap-2">
                    <a 
                      href={lightboxUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Open in Tab
                    </a>
                    <button 
                      onClick={() => setLightboxUrl(null)} 
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-2 bg-gray-100 flex items-center justify-center overflow-auto min-h-[300px] max-h-[calc(90vh-60px)]">
                  <iframe 
                    src={lightboxUrl} 
                    className="w-full h-full min-h-[500px] rounded-lg border-0 bg-white" 
                    title="Receipt"
                  />
                </div>
              </motion.div>
            </div>
          )}

        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
