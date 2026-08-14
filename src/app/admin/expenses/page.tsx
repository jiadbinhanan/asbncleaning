"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit2, Download, Search, Loader2, X, FileText, Image as ImageIcon, 
  CheckCircle2, Lock, Filter, TrendingUp, TrendingDown, CalendarDays, History, Settings, 
  Tag, CreditCard, Layers, ChevronDown, ChevronUp, RotateCcw, DollarSign, PieChart,
  Receipt, ArrowUpRight, ArrowDownRight, SlidersHorizontal, Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addExpenseAction, editExpenseAction, deleteExpenseAction, getExpenseSettingsAction, updateExpenseSettingsAction } from "./actions";
import { 
  format, parseISO, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, 
  formatDistanceToNow, differenceInCalendarDays, subDays
} from "date-fns";

export default function ExpensesPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [prevMonthTotal, setPrevMonthTotal] = useState<number>(0);
  const [settings, setSettings] = useState<any>({ categories: [], payment_methods: [] });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState<'month' | 'custom' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Search & Advanced Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [receiptFilter, setReceiptFilter] = useState(""); // '', 'with', 'without'

  // Expandable row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Custom Category State (No emoji)
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  // Settings State
  const [settingsTab, setSettingsTab] = useState<'categories' | 'payment_methods'>('categories');
  const [newCategory, setNewCategory] = useState({ name: '', type: 'Fixed', default_amount: '' });
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Selected Expense for Edit/Delete
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState({ 
    amount: "", 
    description: "", 
    expense_date: new Date().toISOString().split('T')[0],
    category_name: "",
    expense_type: "",
    payment_method: ""
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Security Verification
  const [actionPassword, setActionPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // ── 1. Dynamic Date Range Fetching (Default: Current Month) ──
  const fetchExpensesAndStats = async () => {
    setLoading(true);
    try {
      let startDateStr: string | null = null;
      let endDateStr: string | null = null;
      let prevStartStr: string | null = null;
      let prevEndStr: string | null = null;

      if (filterType === 'month') {
        const monthDate = parseISO(`${selectedMonth}-01`);
        startDateStr = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        endDateStr = format(endOfMonth(monthDate), 'yyyy-MM-dd');

        const prevMonthDate = subMonths(monthDate, 1);
        prevStartStr = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd');
        prevEndStr = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');
      } else if (filterType === 'custom') {
        if (customStart && customEnd) {
          startDateStr = customStart;
          endDateStr = customEnd;

          const daysDiff = differenceInCalendarDays(parseISO(customEnd), parseISO(customStart)) + 1;
          const prevEnd = subDays(parseISO(customStart), 1);
          const prevStart = subDays(prevEnd, daysDiff - 1);
          prevStartStr = format(prevStart, 'yyyy-MM-dd');
          prevEndStr = format(prevEnd, 'yyyy-MM-dd');
        }
      }

      // Build primary query
      let query = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (startDateStr && endDateStr) {
        query = query.gte("expense_date", startDateStr).lte("expense_date", endDateStr);
      }

      // Build previous period query for comparison stats
      let prevQuery = null;
      if (prevStartStr && prevEndStr) {
        prevQuery = supabase.from("expenses").select("amount").gte("expense_date", prevStartStr).lte("expense_date", prevEndStr);
      }

      const [expensesRes, prevRes, settingsRes] = await Promise.all([
        query,
        prevQuery,
        getExpenseSettingsAction()
      ]);

      if (expensesRes.data) {
        setExpenses(expensesRes.data);
      }

      if (prevRes?.data) {
        const sum = prevRes.data.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
        setPrevMonthTotal(sum);
      } else {
        setPrevMonthTotal(0);
      }

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (err) {
      console.error("Error fetching expense data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndStats();
  }, [filterType, selectedMonth, customStart, customEnd]);

  // ── 2. File Upload with 1MB Limit ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 1024 * 1024) {
        alert("Maximum file size allowed is 1 MB.");
        e.target.value = "";
        setFile(null);
        setFileDataUrl(null);
        return;
      }
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setFile(null);
      setFileDataUrl(null);
    }
  };

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

  // ── 3. Category & Form Handlers ──
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__OTHER__") {
      setIsCustomCategory(true);
      setFormData(prev => ({
        ...prev,
        category_name: customCategoryName,
        expense_type: prev.expense_type || 'Flexible',
      }));
      return;
    }
    
    setIsCustomCategory(false);
    const cat = settings.categories?.find((c: any) => c.name === val);
    if (cat) {
      setFormData(prev => ({
        ...prev,
        category_name: cat.name,
        expense_type: cat.type,
        amount: cat.type === 'Fixed' && Number(cat.default_amount) > 0 ? cat.default_amount.toString() : prev.amount
      }));
    } else {
      setFormData(prev => ({ ...prev, category_name: val, expense_type: 'Flexible' }));
    }
  };

  const handleCustomCategoryInput = (name: string) => {
    setCustomCategoryName(name);
    setFormData(prev => ({ ...prev, category_name: name }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategoryName.trim() : formData.category_name;
    
    if (!formData.amount || !formData.expense_date || !finalCategory || !formData.payment_method) {
      return alert("Please fill all required fields (Date, Category, Amount, Payment Method)");
    }
    setSubmitting(true);
    
    const res = await addExpenseAction(
      Number(formData.amount), 
      formData.description, 
      formData.expense_date, 
      finalCategory,
      formData.expense_type || 'Flexible',
      formData.payment_method,
      fileDataUrl
    );

    if (res.success) {
      fetchExpensesAndStats();
      closeModals();
    } else {
      alert("Error adding expense: " + res.message);
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    const finalCategory = isCustomCategory ? customCategoryName.trim() : formData.category_name;
    
    if (!formData.amount || !formData.expense_date || !finalCategory || !formData.payment_method) {
      return alert("Please fill all required fields");
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
      Number(formData.amount), 
      formData.description, 
      formData.expense_date, 
      finalCategory,
      formData.expense_type || 'Flexible',
      formData.payment_method,
      fileDataUrl
    );

    if (res.success) {
      fetchExpensesAndStats();
      closeModals();
    } else {
      alert("Error editing expense: " + res.message);
    }
    setSubmitting(false);
  };

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
      fetchExpensesAndStats();
      closeModals();
    } else {
      alert("Error deleting expense: " + res.message);
    }
    setSubmitting(false);
  };

  // ── 4. Settings Management (Fixed button placement) ──
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    const updated = [
      ...(settings.categories || []), 
      { 
        id: Date.now().toString(), 
        name: newCategory.name.trim(), 
        type: newCategory.type, 
        default_amount: newCategory.default_amount ? Number(newCategory.default_amount) : 0 
      }
    ];
    setSettings({ ...settings, categories: updated });
    setNewCategory({ name: '', type: 'Fixed', default_amount: '' });
  };

  const handleSaveSettings = async () => {
    setSubmitting(true);
    const res = await updateExpenseSettingsAction(settings.categories, settings.payment_methods);
    if (res.success) {
      setSettings(res.data);
      alert("Settings saved successfully!");
    } else {
      alert("Error saving settings: " + res.message);
    }
    setSubmitting(false);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setSelectedExpense(null);
    setFormData({ amount: "", description: "", expense_date: new Date().toISOString().split('T')[0], category_name: "", expense_type: "", payment_method: "" });
    setFile(null);
    setFileDataUrl(null);
    setActionPassword("");
  };

  // ── 5. Filtering & Supercharged Search ──
  const activeCategoriesList = useMemo(() => {
    const set = new Set<string>();
    settings.categories?.forEach((c: any) => set.add(c.name));
    expenses.forEach((e: any) => { if (e.category_name) set.add(e.category_name); });
    return Array.from(set);
  }, [settings.categories, expenses]);

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter) count++;
    if (typeFilter) count++;
    if (paymentMethodFilter) count++;
    if (minAmountFilter) count++;
    if (maxAmountFilter) count++;
    if (receiptFilter) count++;
    return count;
  }, [categoryFilter, typeFilter, paymentMethodFilter, minAmountFilter, maxAmountFilter, receiptFilter]);

  const resetAdvancedFilters = () => {
    setCategoryFilter("");
    setTypeFilter("");
    setPaymentMethodFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
    setReceiptFilter("");
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Supercharged Search across all fields
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

      // Advanced Filters
      if (categoryFilter && e.category_name !== categoryFilter) return false;
      if (typeFilter && e.expense_type !== typeFilter) return false;
      if (paymentMethodFilter && e.payment_method !== paymentMethodFilter) return false;
      if (minAmountFilter && Number(e.amount) < Number(minAmountFilter)) return false;
      if (maxAmountFilter && Number(e.amount) > Number(maxAmountFilter)) return false;
      if (receiptFilter === 'with' && !e.receipt_url) return false;
      if (receiptFilter === 'without' && e.receipt_url) return false;

      return true;
    });
  }, [expenses, searchTerm, categoryFilter, typeFilter, paymentMethodFilter, minAmountFilter, maxAmountFilter, receiptFilter]);

  // ── 6. KPI Summary Stats ──
  const stats = useMemo(() => {
    const totalSpend = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const count = filteredExpenses.length;
    const avgSpend = count > 0 ? totalSpend / count : 0;

    const fixedSpend = filteredExpenses
      .filter(e => e.expense_type === 'Fixed')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const flexibleSpend = totalSpend - fixedSpend;
    const fixedPercentage = totalSpend > 0 ? Math.round((fixedSpend / totalSpend) * 100) : 0;

    // Top Category
    const categoryTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
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

    // Trend percentage vs previous month
    let percentChange = 0;
    if (prevMonthTotal > 0) {
      percentChange = ((totalSpend - prevMonthTotal) / prevMonthTotal) * 100;
    }

    return {
      totalSpend,
      count,
      avgSpend,
      fixedSpend,
      flexibleSpend,
      fixedPercentage,
      topCatName,
      topCatAmount,
      percentChange
    };
  }, [filteredExpenses, prevMonthTotal]);

  // ── 7. Grouping by Week ──
  const groupedArray = useMemo(() => {
    const groups = filteredExpenses.reduce((acc: any, expense) => {
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
  }, [filteredExpenses]);

  // ── 8. Excel & Top-Notch Decorative PDF Export ──
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredExpenses.map((e, idx) => ({
      "#": idx + 1,
      Date: e.expense_date,
      Category: e.category_name,
      Type: e.expense_type,
      "Description / Notes": e.description || "-",
      "Payment Method": e.payment_method,
      "Amount (AED)": Number(e.amount),
      Receipt: e.receipt_url ? `${window.location.origin}/api/pdf/${e.id}?dl=1` : "No Receipt"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Decorative Header Banner ──
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
    doc.text("OFFICIAL EXPENSE & DISBURSEMENT AUDIT REPORT", 14, 23);

    // Header Right Metadata
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const dateRangeLabel = filterType === 'month' 
      ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
      : filterType === 'custom' && customStart && customEnd
        ? `${customStart} to ${customEnd}`
        : 'All Recorded Data';
    doc.text(`Period: ${dateRangeLabel}`, pageWidth - 14, 16, { align: "right" });
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - 14, 23, { align: "right" });
    doc.text(`Currency: AED (United Arab Emirates Dirham)`, pageWidth - 14, 30, { align: "right" });

    // ── Summary KPI Box ──
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 49, pageWidth - 28, 20, 3, 3, "FD");

    // KPI 1: Total Spend
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL DISBURSEMENT", 20, 56);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`AED ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, 64);

    // KPI 2: Total Records
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TRANSACTIONS", 75, 56);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.count} Entries`, 75, 64);

    // KPI 3: Fixed vs Flexible
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("FIXED / FLEXIBLE", 125, 56);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`AED ${stats.fixedSpend.toLocaleString()} / AED ${stats.flexibleSpend.toLocaleString()}`, 125, 64);

    // KPI 4: Top Category
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOP CATEGORY", 175, 56);
    doc.setFontSize(9.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${stats.topCatName.slice(0, 15)}`, 175, 64);

    // ── Table Data ──
    const tableColumns = ["#", "Date", "Category", "Type", "Notes / Description", "Method", "Amount (AED)"];
    const tableRows = filteredExpenses.map((e, index) => [
      index + 1,
      format(parseISO(e.expense_date), 'dd/MM/yyyy'),
      e.category_name || "-",
      e.expense_type || "-",
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
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 32, fontStyle: "bold" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: "auto" },
        5: { cellWidth: 25 },
        6: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: [220, 38, 38] },
      },
      foot: [
        [
          "",
          "",
          "",
          "",
          "GRAND TOTAL",
          "",
          `AED ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
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
        // Footer on every page
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

    doc.save(`Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative">
      
      {/* ── CONSTANT HEADER ── */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-8 pb-20 px-6 md:px-12 shadow-2xl relative z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"/>

        <div className="w-full relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <TrendingUp className="text-blue-500" size={36}/> Expense Management
            </h1>
            <p className="text-blue-200 font-medium mt-2">Track company expenses, receipts, and historical data.</p>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
              <Filter size={16} className="text-blue-400 ml-2 shrink-0 hidden md:block"/>
              <button 
                onClick={() => setFilterType('month')} 
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
              >
                By Month
              </button>
              <button 
                onClick={() => setFilterType('custom')} 
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
              >
                Custom Date
              </button>
              <button 
                onClick={() => setFilterType('all')} 
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
              >
                All Data
              </button>
            </div>

            {/* Sub-filters based on selection */}
            <AnimatePresence mode="wait">
              {filterType === 'month' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md w-full md:w-auto border border-white/10">
                  <span className="text-xs font-bold text-blue-300 pl-2">Select:</span>
                  <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-black text-white outline-none px-2 py-1 w-full dark-color-scheme" />
                </motion.div>
              )}
              {filterType === 'custom' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md w-full md:w-auto border border-white/10">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-xs font-black text-white outline-none px-2 py-1 dark-color-scheme" />
                  <span className="text-white/50">-</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-xs font-black text-white outline-none px-2 py-1 dark-color-scheme" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20 space-y-6">
        
        {/* Actions & Search Bar */}
        <div className="bg-white p-4 rounded-[1.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Search Input & Advanced Filter Toggle */}
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by description, category, amount..." 
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
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto justify-end">
              <button onClick={exportExcel} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors font-bold text-sm shadow-sm">
                <FileText size={16} /> Excel
              </button>
              <button onClick={exportPDF} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-bold text-sm shadow-sm">
                <FileText size={16} /> PDF Report
              </button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-200 transition-colors font-bold text-sm shadow-sm">
                <Settings size={16} /> Settings
              </button>
              <button onClick={() => setIsAddModalOpen(true)} className="flex shrink-0 items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                <Plus size={18} /> Add Expense
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
                className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
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

                {/* Type Filter */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">Expense Type</label>
                  <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="Fixed">Fixed Expense</option>
                    <option value="Flexible">Flexible Expense</option>
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
                    {settings.payment_methods?.map((m: string, i: number) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Range */}
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

        {/* ── 3. ANIMATED SUMMARY & KPI CARDS SECTION ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Selected Period Spend */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Spent</p>
                <h3 className="text-2xl font-black text-red-600 mt-1">
                  AED {stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                <DollarSign size={24} />
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              {prevMonthTotal > 0 ? (
                <span className={`inline-flex items-center text-xs font-black px-2 py-0.5 rounded-full ${stats.percentChange <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {stats.percentChange <= 0 ? <ArrowDownRight size={14} className="mr-0.5"/> : <ArrowUpRight size={14} className="mr-0.5"/>}
                  {Math.abs(stats.percentChange).toFixed(1)}% vs prior period
                </span>
              ) : (
                <span className="text-xs font-bold text-gray-400">Current selection</span>
              )}
            </div>
          </motion.div>

          {/* Card 2: Previous Month Spend */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Previous Period</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  AED {prevMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <CalendarDays size={24} />
              </div>
            </div>
            
            <p className="text-xs font-bold text-gray-400 mt-3 flex items-center gap-1">
              Historical reference benchmark
            </p>
          </motion.div>

          {/* Card 3: Transactions & Avg */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Transactions</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">
                  {stats.count} <span className="text-sm font-bold text-gray-500">Entries</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Layers size={24} />
              </div>
            </div>
            
            <p className="text-xs font-bold text-gray-500 mt-3">
              Avg. <span className="font-black text-gray-900">AED {stats.avgSpend.toFixed(2)}</span> / entry
            </p>
          </motion.div>

          {/* Card 4: Top Category & Ratio */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="max-w-[70%]">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Top Category</p>
                <h3 className="text-lg font-black text-gray-900 mt-1 truncate" title={stats.topCatName}>
                  {stats.topCatName}
                </h3>
                <p className="text-xs font-bold text-gray-500">AED {stats.topCatAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner shrink-0">
                <PieChart size={24} />
              </div>
            </div>
            
            <div className="mt-2.5">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${stats.fixedPercentage}%` }} className="bg-indigo-600 h-full" title={`Fixed: ${stats.fixedPercentage}%`} />
                <div style={{ width: `${100 - stats.fixedPercentage}%` }} className="bg-orange-500 h-full" title={`Flexible: ${100 - stats.fixedPercentage}%`} />
              </div>
              <div className="flex justify-between text-[10px] font-black text-gray-400 mt-1">
                <span>Fixed {stats.fixedPercentage}%</span>
                <span>Flexible {100 - stats.fixedPercentage}%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── 4. EXPENSES LIST GROUPED BY WEEK (Expandable Rows with Ellipsis) ── */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
            <p className="text-gray-500 font-bold">Loading expenses...</p>
          </div>
        ) : groupedArray.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Search size={32}/></div>
            <h3 className="text-xl font-black text-gray-800">No expenses found</h3>
            <p className="text-gray-500 font-medium mt-2">Adjust your search or filter parameters to view records.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedArray.map((group) => (
              <motion.div 
                key={group.week}
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3 }}
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
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${expense.expense_type === 'Fixed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {expense.expense_type || 'Flexible'}
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
                                    <span>Created on {format(parseISO(expense.expense_date), 'dd MMMM yyyy')}</span>
                                    {expense.updated_at && expense.updated_at !== expense.created_at && (
                                      <span className="text-blue-600 flex items-center gap-1">
                                        <History size={13}/> Last edited {formatDistanceToNow(new Date(expense.updated_at))} ago
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {expense.receipt_url && (
                                      <a 
                                        href={`/api/pdf/${expense.id}?dl=0`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-black transition-colors border border-blue-200"
                                      >
                                        <Eye size={14}/> View Receipt
                                      </a>
                                    )}
                                    
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setSelectedExpense(expense); 
                                        const isExisting = settings.categories?.some((c: any) => c.name === expense.category_name);
                                        if (!isExisting && expense.category_name) {
                                          setIsCustomCategory(true);
                                          setCustomCategoryName(expense.category_name);
                                        } else {
                                          setIsCustomCategory(false);
                                          setCustomCategoryName("");
                                        }
                                        setFormData({ 
                                          amount: expense.amount, 
                                          description: expense.description || "", 
                                          expense_date: expense.expense_date,
                                          category_name: expense.category_name,
                                          expense_type: expense.expense_type,
                                          payment_method: expense.payment_method
                                        }); 
                                        setIsEditModalOpen(true); 
                                      }} 
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
                                    >
                                      <Edit2 size={14}/> Edit
                                    </button>
                                    
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

      {/* ── 9. MODALS ── */}
      <AnimatePresence>
        
        {/* Settings Modal (Fixed Button Overflow) */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><Settings size={24} className="text-blue-500"/> Expense Settings</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              
              <div className="flex border-b border-gray-200 bg-white px-6 pt-4 gap-6 shrink-0">
                <button onClick={() => setSettingsTab('categories')} className={`pb-3 text-sm font-black tracking-wide border-b-2 transition-all ${settingsTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Layers size={16} className="inline mr-1"/> Categories</button>
                <button onClick={() => setSettingsTab('payment_methods')} className={`pb-3 text-sm font-black tracking-wide border-b-2 transition-all ${settingsTab === 'payment_methods' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CreditCard size={16} className="inline mr-1"/> Payment Methods</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
                {settingsTab === 'categories' ? (
                  <div className="space-y-6">
                    {/* Add Category Card with Top-Right Button */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-gray-900">Add New Category</h3>
                        <button 
                          onClick={handleAddCategory} 
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-1.5"
                        >
                          <Plus size={15} /> Add Category
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className={newCategory.type === 'Fixed' ? 'md:col-span-5' : 'md:col-span-8'}>
                          <input 
                            type="text" 
                            placeholder="Category Name" 
                            value={newCategory.name} 
                            onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                            className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                          />
                        </div>
                        <div className={newCategory.type === 'Fixed' ? 'md:col-span-4' : 'md:col-span-4'}>
                          <select 
                            value={newCategory.type} 
                            onChange={e => setNewCategory({...newCategory, type: e.target.value})} 
                            className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                          >
                            <option value="Fixed">Fixed Expense</option>
                            <option value="Flexible">Flexible Expense</option>
                          </select>
                        </div>
                        {newCategory.type === 'Fixed' && (
                          <div className="md:col-span-3">
                            <input 
                              type="number" 
                              placeholder="Default AED" 
                              value={newCategory.default_amount} 
                              onChange={e => setNewCategory({...newCategory, default_amount: e.target.value})} 
                              className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Existing Categories Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Name</th>
                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Type & Amount</th>
                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {settings.categories?.map((cat: any) => (
                            <tr key={cat.id} className="hover:bg-slate-50/50">
                              <td className="p-4 font-black text-gray-900 text-sm">{cat.name}</td>
                              <td className="p-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${cat.type === 'Fixed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                  {cat.type} {cat.type === 'Fixed' && `- AED ${cat.default_amount}`}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button onClick={() => setSettings({ ...settings, categories: settings.categories.filter((c: any) => c.id !== cat.id) })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                      <h3 className="text-sm font-black text-gray-900 mb-4">Add Payment Method</h3>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          placeholder="Method Name (e.g. PayPal, Card)" 
                          value={newPaymentMethod} 
                          onChange={e => setNewPaymentMethod(e.target.value)} 
                          className="flex-1 p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                        />
                        <button onClick={() => {
                          if (!newPaymentMethod.trim()) return;
                          setSettings({ ...settings, payment_methods: [...(settings.payment_methods||[]), newPaymentMethod.trim()] });
                          setNewPaymentMethod('');
                        }} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-colors shrink-0 shadow-md shadow-blue-200">Add</button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <ul className="divide-y divide-gray-100">
                        {settings.payment_methods?.map((method: string, i: number) => (
                          <li key={i} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                            <span className="font-black text-gray-900 text-sm flex items-center gap-2"><CreditCard size={16} className="text-gray-500"/> {method}</span>
                            <button onClick={() => setSettings({ ...settings, payment_methods: settings.payment_methods.filter((m: string) => m !== method) })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                <button onClick={handleSaveSettings} disabled={submitting} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black flex justify-center items-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-70">
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Expense Modal (Clean "Other" Category without emoji) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h2 className="text-xl font-black text-gray-900">Add New Expense</h2>
                <button onClick={closeModals} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Date</label>
                    <input 
                      type="date" 
                      value={formData.expense_date} 
                      onChange={e => setFormData({...formData, expense_date: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Payment Method</label>
                    <select 
                      value={formData.payment_method} 
                      onChange={e => setFormData({...formData, payment_method: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                      required
                    >
                      <option value="">Select Method...</option>
                      {settings.payment_methods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Category</label>
                  <select 
                    value={isCustomCategory ? "__OTHER__" : formData.category_name} 
                    onChange={handleCategoryChange} 
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                    required
                  >
                    <option value="">Select Category...</option>
                    <optgroup label="Fixed Expenses">
                      {settings.categories?.filter((c: any) => c.type === 'Fixed').map((c: any) => <option key={c.id} value={c.name}>{c.name} {c.default_amount > 0 ? `(Auto: AED ${c.default_amount})` : ''}</option>)}
                    </optgroup>
                    <optgroup label="Flexible Expenses">
                      {settings.categories?.filter((c: any) => c.type === 'Flexible').map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Custom Option">
                      <option value="__OTHER__">+ Other (Custom Category)</option>
                    </optgroup>
                  </select>
                </div>

                {isCustomCategory && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
                    <div>
                      <label className="block text-xs font-black text-blue-900 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-600"/> Enter Custom Category Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Office Equipment, Staff Training" 
                        value={customCategoryName} 
                        onChange={e => handleCustomCategoryInput(e.target.value)} 
                        className="w-full p-3 bg-white border border-blue-300 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm" 
                        required 
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-blue-800 uppercase tracking-wider mb-1">Expense Type</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Flexible' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type !== 'Fixed' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-blue-200'}`}
                        >
                          Flexible Expense
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Fixed' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type === 'Fixed' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-blue-200'}`}
                        >
                          Fixed Expense
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Amount (AED)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-black text-red-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm text-lg" 
                    placeholder="0.00" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Additional Notes (Optional)</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[80px] shadow-sm" 
                    placeholder="Specific details or supplier invoice notes..." 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                    <span>Receipt (Optional)</span>
                    <span className="text-[9px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 font-bold">Max size: 1 MB</span>
                  </label>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer shadow-sm" />
                </div>
                
                <div className="pt-2">
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 mt-2">
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Save Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Expense Modal (Clean "Other" Category without emoji) */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h2 className="text-xl font-black text-gray-900">Edit Expense</h2>
                <button onClick={closeModals} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {selectedExpense?.updated_at && (
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-xl flex items-center gap-2 text-xs font-bold border border-blue-100 mb-2">
                    <History size={16}/> Last edited on {format(new Date(selectedExpense.updated_at), 'dd MMM yyyy, hh:mm a')}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Date</label>
                    <input 
                      type="date" 
                      value={formData.expense_date} 
                      onChange={e => setFormData({...formData, expense_date: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Payment Method</label>
                    <select 
                      value={formData.payment_method} 
                      onChange={e => setFormData({...formData, payment_method: e.target.value})} 
                      className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                      required
                    >
                      <option value="">Select Method...</option>
                      {settings.payment_methods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                      {!settings.payment_methods?.includes(formData.payment_method) && formData.payment_method && (
                        <option value={formData.payment_method}>{formData.payment_method} (Saved)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Category</label>
                  <select 
                    value={isCustomCategory ? "__OTHER__" : formData.category_name} 
                    onChange={handleCategoryChange} 
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                    required
                  >
                    <option value="">Select Category...</option>
                    <optgroup label="Fixed Expenses">
                      {settings.categories?.filter((c: any) => c.type === 'Fixed').map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Flexible Expenses">
                      {settings.categories?.filter((c: any) => c.type === 'Flexible').map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Custom Option">
                      <option value="__OTHER__">+ Other (Custom Category)</option>
                    </optgroup>
                  </select>
                </div>

                {isCustomCategory && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
                    <div>
                      <label className="block text-xs font-black text-blue-900 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-600"/> Enter Custom Category Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Office Equipment, Staff Training" 
                        value={customCategoryName} 
                        onChange={e => handleCustomCategoryInput(e.target.value)} 
                        className="w-full p-3 bg-white border border-blue-300 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        required 
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-blue-800 uppercase tracking-wider mb-1">Expense Type</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Flexible' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type !== 'Fixed' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-blue-200'}`}
                        >
                          Flexible Expense
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Fixed' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type === 'Fixed' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-blue-200'}`}
                        >
                          Fixed Expense
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Amount (AED)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-black text-red-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm text-lg" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Additional Notes (Optional)</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-[80px] shadow-sm" 
                  />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2">
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-3 flex justify-between items-center">
                    <span>Receipt File</span>
                    <span className="text-[9px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 font-bold">Max size: 1 MB</span>
                  </label>
                  {selectedExpense?.receipt_url && !fileDataUrl && (
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 mb-3 shadow-sm">
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><ImageIcon size={14}/> Existing Receipt attached</span>
                      <a href={`/api/pdf/${selectedExpense.id}?dl=0`} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">View</a>
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-gray-600 mb-1">{selectedExpense?.receipt_url ? "Upload a new file to replace the existing one:" : "Upload a file:"}</p>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer shadow-sm" />
                </div>

                <div className="pt-4 border-t border-gray-100 mt-4">
                  <label className="block text-xs font-black text-red-600 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Lock size={14}/> Action Password Required</label>
                  <input 
                    type="password" 
                    value={actionPassword} 
                    onChange={e => setActionPassword(e.target.value)} 
                    className="w-full p-3.5 bg-white border border-red-300 rounded-xl font-black text-gray-900 placeholder:text-red-300 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 shadow-sm" 
                    placeholder="Enter action password" 
                    required 
                  />
                </div>
                
                <button type="submit" disabled={submitting || verifying} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 mt-4">
                  {(submitting || verifying) ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative z-10 text-center">
              <div className="p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600"><Trash2 size={32} /></div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Delete Expense?</h2>
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
                    <button type="submit" disabled={submitting || verifying} className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2">{(submitting || verifying) ? <Loader2 className="animate-spin" size={18} /> : 'Delete'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* For dark inputs on the header */
        input.dark-color-scheme::-webkit-calendar-picker-indicator {
            filter: invert(1);
            opacity: 0.6;
            cursor: pointer;
        }
      `}</style>
    </div>
  );
}
